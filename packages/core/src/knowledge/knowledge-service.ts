import { authorizeOrThrow } from '../auth/authorize.js';
import { newId, sha256 } from '../domain/hash.js';
import { asEpisodeId, asFactId, asKnowledgeSpaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { extractTypedFacts } from '../ingestion/extract.js';
import { parseMarkdownDocument } from '../ingestion/markdown.js';

import { findContradictoryPairs } from './contradictions.js';
import { normalizeAlias } from './resolution.js';
import { supersedeFact } from './supersede.js';

import type { Entity } from './entity.js';
import type { Fact } from './fact.js';
import type { ProvenanceEdge } from './provenance.js';
import type { Authorizer, ExecutionContext } from '../auth/authorizer.js';
import type { Clock } from '../ports/clock.js';
import type { EntityRepository } from '../ports/entity-repository.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { UnitOfWork } from '../ports/unit-of-work.js';

export interface KnowledgeService {
  consolidate(
    context: ExecutionContext,
    input: { spaceId: string },
  ): Promise<{ factCount: number }>;
  queryFacts(
    context: ExecutionContext,
    input: { spaceId: string; asOf?: string; limit?: number },
  ): Promise<readonly Fact[]>;
  queryEntities(context: ExecutionContext, input: { spaceId: string }): Promise<readonly Entity[]>;
  findContradictions(
    context: ExecutionContext,
    input: { spaceId: string },
  ): Promise<readonly [Fact, Fact][]>;
  ingestMarkdown(
    context: ExecutionContext,
    input: { spaceId: string; markdown: string },
  ): Promise<{ segments: number }>;
  traceProvenance(edges: readonly ProvenanceEdge[], startId: string): readonly ProvenanceEdge[];
}

const SPACE_RESOURCE = 'space' as const;
const KNOWLEDGE_READ = 'knowledge.read' as const;

export function createKnowledgeService(deps: {
  authorizer: Authorizer;
  clock: Clock;
  unitOfWork: UnitOfWork;
  episodes: EpisodeRepository;
  facts: FactRepository;
  entities: EntityRepository;
}): KnowledgeService {
  return {
    async consolidate(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        'knowledge.write',
        SPACE_RESOURCE,
        input.spaceId,
      );
      const spaceId = asKnowledgeSpaceId(input.spaceId);
      const episodes = await deps.episodes.listRecent({
        workspaceId: context.workspaceId,
        knowledgeSpaceId: spaceId,
        limit: 100,
      });
      let factCount = 0;
      const now = deps.clock.now();
      const existingFacts = await deps.facts.query({
        workspaceId: context.workspaceId,
        knowledgeSpaceId: spaceId,
        limit: 200,
      });
      const factsByKey = new Map(
        existingFacts
          .filter((item) => item.retractedAt === undefined)
          .map((item) => [`${item.subject.entityId}:${item.predicate.id}`, item]),
      );
      await deps.unitOfWork.run(async () => {
        for (const episode of episodes) {
          const extracted = extractTypedFacts(episode.content, context.workspaceId, spaceId, now, {
            principalId: context.principal.id,
          });
          for (const fact of extracted) {
            const named = fact.subject.entityId.replace(/^ent_/u, '');
            const displayName = named.charAt(0).toUpperCase() + named.slice(1);
            const existingEntity = await deps.entities.findByAlias({
              workspaceId: context.workspaceId,
              knowledgeSpaceId: spaceId,
              normalizedValue: normalizeAlias(displayName),
            });
            const entityId = existingEntity?.id ?? fact.subject.entityId;
            if (existingEntity === undefined) {
              await deps.entities.insert({
                workspaceId: context.workspaceId,
                entity: {
                  id: entityId,
                  workspaceId: context.workspaceId,
                  knowledgeSpaceId: spaceId,
                  canonicalName: displayName,
                  typeIds: ['Person'],
                  createdAt: now,
                },
              });
              await deps.entities.addAlias({
                workspaceId: context.workspaceId,
                alias: {
                  entityId,
                  value: displayName,
                  normalizedValue: normalizeAlias(displayName),
                },
              });
            }
            const previous = factsByKey.get(`${entityId}:${fact.predicate.id}`);
            const nextFact: Fact = {
              ...fact,
              id: asFactId(newId('fact')),
              subject: { entityId },
            };
            if (previous !== undefined) {
              const { previous: closed } = supersedeFact(previous, nextFact, now);
              await deps.facts.upsert({ workspaceId: context.workspaceId, fact: closed });
            }
            await deps.facts.insert({ workspaceId: context.workspaceId, fact: nextFact });
            factsByKey.set(`${entityId}:${fact.predicate.id}`, nextFact);
            factCount += 1;
          }
        }
      });
      return { factCount };
    },

    async queryFacts(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        KNOWLEDGE_READ,
        SPACE_RESOURCE,
        input.spaceId,
      );
      return deps.facts.query({
        workspaceId: context.workspaceId,
        knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
        asOf: input.asOf === undefined ? undefined : parseIsoUtc(input.asOf),
        limit: input.limit ?? 50,
      });
    },

    async queryEntities(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        KNOWLEDGE_READ,
        SPACE_RESOURCE,
        input.spaceId,
      );
      return deps.entities.list({
        workspaceId: context.workspaceId,
        knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
      });
    },

    async findContradictions(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        KNOWLEDGE_READ,
        SPACE_RESOURCE,
        input.spaceId,
      );
      const facts = await deps.facts.query({
        workspaceId: context.workspaceId,
        knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
        limit: 500,
      });
      return findContradictoryPairs(facts);
    },

    async ingestMarkdown(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        'memory.remember',
        SPACE_RESOURCE,
        input.spaceId,
      );
      const parsed = parseMarkdownDocument(input.markdown);
      const now = deps.clock.now();
      await deps.unitOfWork.run(async () => {
        for (const segment of parsed.segments) {
          await deps.episodes.insert({
            workspaceId: context.workspaceId,
            episode: {
              id: asEpisodeId(newId('ep')),
              workspaceId: context.workspaceId,
              knowledgeSpaceId: asKnowledgeSpaceId(input.spaceId),
              principalId: context.principal.id,
              kind: 'document',
              observedAt: now,
              contentHash: sha256(segment),
              content: segment,
              hidden: false,
              metadata: { title: parsed.title },
            },
          });
        }
      });
      return { segments: parsed.segments.length };
    },

    traceProvenance(edges, startId) {
      return edges.filter((edge) => edge.from.id === startId || edge.to.id === startId);
    },
  };
}
