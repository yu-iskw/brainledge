import { authorizeOrThrow } from '../auth/authorize.js';
import { sha256, newId } from '../domain/hash.js';
import { asEpisodeId, asEvidenceId, asKnowledgeSpaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { AppError } from '../errors/app-error.js';
import { retrieve } from '../search/retrieval.js';
import { sessionEpisodes } from '../session/session-memory.js';

import { toFactHit } from './fact-hit.js';

import type { ForgetInput, RecallInput, RecallResult, RememberInput } from './types.js';
import type { Authorizer, ExecutionContext } from '../auth/authorizer.js';
import type { EpisodeKind } from '../knowledge/episode.js';
import type { Fact } from '../knowledge/fact.js';
import type { KnowledgeService } from '../knowledge/knowledge-service.js';
import type { EmbeddingProvider } from '../models/providers.js';
import type { Clock } from '../ports/clock.js';
import type { EmbeddingStore } from '../ports/embedding-store.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { UnitOfWork } from '../ports/unit-of-work.js';

export interface MemoryService {
  remember(context: ExecutionContext, input: RememberInput): Promise<{ episodeId: string }>;
  recall(context: ExecutionContext, input: RecallInput): Promise<RecallResult>;
  forget(context: ExecutionContext, input: ForgetInput): Promise<void>;
  consolidate(
    context: ExecutionContext,
    input: { spaceId: string },
  ): Promise<{ factCount: number }>;
}

export function createMemoryService(deps: {
  authorizer: Authorizer;
  clock: Clock;
  unitOfWork: UnitOfWork;
  episodes: EpisodeRepository;
  evidence: EvidenceRepository;
  facts?: FactRepository;
  knowledge?: KnowledgeService;
  embeddings?: EmbeddingStore;
  embeddingProvider?: EmbeddingProvider;
}): MemoryService {
  return {
    async remember(context, input) {
      await authorizeOrThrow(deps.authorizer, context, 'memory.remember', 'space', input.spaceId);
      const now = deps.clock.now();
      const episodeId = asEpisodeId(newId('ep'));
      const evidenceId = asEvidenceId(newId('ev'));
      const kind: EpisodeKind = input.kind ?? 'note';
      const hash = sha256(input.content);
      const episode = {
        id: episodeId,
        workspaceId: context.workspaceId,
        knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
        principalId: context.principal.id,
        kind,
        referenceTime:
          input.referenceTime === undefined ? undefined : parseIsoUtc(input.referenceTime),
        observedAt: now,
        contentHash: hash,
        content: input.content,
        hidden: false,
        metadata: input.sessionId === undefined ? {} : { sessionId: input.sessionId },
      };
      const evidence = {
        id: evidenceId,
        workspaceId: context.workspaceId,
        sourceType: 'episode' as const,
        sourceId: episodeId,
        contentHash: hash,
        observedAt: now,
      };
      await deps.unitOfWork.run(async () => {
        await deps.episodes.insert({ workspaceId: context.workspaceId, episode });
        await deps.evidence.insert({ workspaceId: context.workspaceId, evidence });
      });
      if (deps.embeddingProvider !== undefined && deps.embeddings !== undefined) {
        const embedded = await deps.embeddingProvider.embed({ texts: [input.content] });
        for (const vector of embedded.vectors.slice(0, 1)) {
          await deps.embeddings.upsert({
            workspaceId: context.workspaceId,
            embedding: {
              id: `emb_${episodeId}`,
              workspaceId: context.workspaceId,
              targetType: 'episode',
              targetId: episodeId,
              model: embedded.model,
              vector,
            },
          });
        }
      }
      return { episodeId };
    },

    async recall(context, input) {
      await authorizeOrThrow(deps.authorizer, context, 'memory.recall', 'space', input.spaceId);
      const limit = input.limit ?? 20;
      const spaceId = asKnowledgeSpaceId(input.spaceId);
      const query = input.query.trim();
      const episodesRaw =
        query === ''
          ? await deps.episodes.listRecent({
              workspaceId: context.workspaceId,
              knowledgeSpaceId: spaceId,
              limit,
            })
          : await deps.episodes.searchLexical({
              workspaceId: context.workspaceId,
              knowledgeSpaceId: spaceId,
              query,
              limit,
            });
      const episodes =
        input.sessionId === undefined ? episodesRaw : sessionEpisodes(episodesRaw, input.sessionId);
      const facts =
        deps.facts === undefined
          ? []
          : await deps.facts.query({
              workspaceId: context.workspaceId,
              knowledgeSpaceId: spaceId,
              limit,
            });
      const retrieved = retrieve({
        query,
        episodes,
        facts,
      });
      const ordered =
        retrieved.episodeIds.length === 0
          ? episodes
          : retrieved.episodeIds
              .map((id) => episodes.find((episode) => episode.id === id))
              .filter((episode): episode is (typeof episodes)[number] => episode !== undefined);
      const factsById = new Map<string, Fact>(facts.map((fact) => [fact.id, fact]));
      const recalledFacts = retrieved.factIds
        .map((factId) => factsById.get(factId))
        .filter((fact): fact is Fact => fact !== undefined);
      return {
        memories: ordered.map((episode, index) => ({
          episodeId: episode.id,
          content: episode.content,
          score: 1 / (index + 1),
          observedAt: episode.observedAt,
        })),
        facts: recalledFacts.map(toFactHit),
        entities: [],
        priorDecisions: [],
        policies: [],
        provenanceSummary: ordered.map((episode) => ({
          episodeId: episode.id,
          relation: 'derived-from',
        })),
      };
    },

    async forget(context, input) {
      await authorizeOrThrow(deps.authorizer, context, 'memory.forget', 'space', input.spaceId);
      const episodeId = asEpisodeId(input.memoryId);
      const retractLinkedFacts = async (): Promise<void> => {
        if (deps.facts === undefined) {
          return;
        }
        const facts = await deps.facts.query({
          workspaceId: context.workspaceId,
          knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
          limit: 500,
        });
        const now = deps.clock.now();
        for (const fact of facts) {
          if (fact.sourceEpisodeId === episodeId && fact.retractedAt === undefined) {
            await deps.facts.upsert({
              workspaceId: context.workspaceId,
              fact: { ...fact, retractedAt: now, status: 'retracted' },
            });
          }
        }
      };
      switch (input.mode) {
        case 'hide': {
          await deps.episodes.hide({ workspaceId: context.workspaceId, episodeId });
          await retractLinkedFacts();
          return;
        }
        case 'delete': {
          await deps.episodes.delete({ workspaceId: context.workspaceId, episodeId });
          await retractLinkedFacts();
          return;
        }
        case 'purge': {
          await deps.facts?.purgeBySourceEpisode({
            workspaceId: context.workspaceId,
            sourceEpisodeId: episodeId,
          });
          await deps.evidence.purgeBySource({
            workspaceId: context.workspaceId,
            sourceId: episodeId,
          });
          await deps.episodes.purge({ workspaceId: context.workspaceId, episodeId });
          await deps.embeddings?.deleteByTarget({
            workspaceId: context.workspaceId,
            targetType: 'episode',
            targetId: episodeId,
          });
          return;
        }
        case 'retract': {
          await deps.episodes.hide({ workspaceId: context.workspaceId, episodeId });
          await retractLinkedFacts();
          return;
        }
        default: {
          const exhaustive: never = input.mode;
          throw new AppError(
            'INVALID_FORGET_MODE',
            `Unsupported forget mode: ${String(exhaustive)}`,
          );
        }
      }
    },

    async consolidate(context, input) {
      if (deps.knowledge === undefined) {
        return { factCount: 0 };
      }
      return deps.knowledge.consolidate(context, input);
    },
  };
}
