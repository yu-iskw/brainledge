import { authorizeOrThrow } from '../auth/authorize.js';
import { newId, sha256 } from '../domain/hash.js';
import { asEpisodeId, asFactId, asKnowledgeSpaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { extractTypedFacts } from '../ingestion/extract.js';
import { parseMarkdownDocument } from '../ingestion/markdown.js';
import { formatFactObject } from '../memory/fact-hit.js';
import { formatFactSentence } from '../memory/format-fact-sentence.js';

import { findContradictoryPairs } from './contradictions.js';
import { factIdentityKey, subjectPredicateKey } from './fact.js';
import { normalizeAlias } from './resolution.js';
import { supersedeFact } from './supersede.js';

import type { Entity } from './entity.js';
import type { Fact } from './fact.js';
import type { ProvenanceEdge } from './provenance.js';
import type { Authorizer, ExecutionContext } from '../auth/authorizer.js';
import type { EntityId, EpisodeId, KnowledgeSpaceId, WorkspaceId } from '../domain/ids.js';
import type { IsoUtcTimestamp } from '../domain/time.js';
import type { Clock } from '../ports/clock.js';
import type { EntityRepository } from '../ports/entity-repository.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { UnitOfWork } from '../ports/unit-of-work.js';

export interface ProposedFact {
  readonly subjectId: string;
  readonly predicateId: string;
  readonly objectText: string;
  readonly sourceEpisodeId: string;
  readonly closes?: string;
}

export interface KnowledgeService {
  consolidate(
    context: ExecutionContext,
    input: { spaceId: string },
  ): Promise<{ factCount: number }>;
  previewExtract(
    context: ExecutionContext,
    input: { spaceId: string },
  ): Promise<{ factCount: number; proposed: readonly ProposedFact[] }>;
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
const FUNCTIONAL_PREDICATES = new Set(['livesIn']);

async function persistExtractedFact(input: {
  persist: boolean;
  fact: Fact;
  episodeId: EpisodeId;
  workspaceId: WorkspaceId;
  spaceId: KnowledgeSpaceId;
  now: IsoUtcTimestamp;
  entities: EntityRepository;
  facts: FactRepository;
  factsBySpo: Map<string, Fact>;
  functionalBySp: Map<string, Fact>;
}): Promise<{ inserted: boolean; nextFact?: Fact; closes?: Fact }> {
  const named = input.fact.subject.entityId.replace(/^ent_/u, '');
  const displayName = named.charAt(0).toUpperCase() + named.slice(1);
  const existingEntity = await input.entities.findByAlias({
    workspaceId: input.workspaceId,
    knowledgeSpaceId: input.spaceId,
    normalizedValue: normalizeAlias(displayName),
  });
  const entityId = existingEntity?.id ?? input.fact.subject.entityId;
  if (existingEntity === undefined && input.persist) {
    await input.entities.insert({
      workspaceId: input.workspaceId,
      entity: {
        id: entityId,
        workspaceId: input.workspaceId,
        knowledgeSpaceId: input.spaceId,
        canonicalName: displayName,
        typeIds: ['Person'],
        createdAt: input.now,
      },
    });
    await input.entities.addAlias({
      workspaceId: input.workspaceId,
      alias: {
        entityId,
        value: displayName,
        normalizedValue: normalizeAlias(displayName),
      },
    });
  }
  const identity = factIdentityKey(entityId, input.fact.predicate.id, input.fact.object);
  if (input.factsBySpo.has(identity)) {
    return { inserted: false };
  }
  const nextFact: Fact = {
    ...input.fact,
    id: asFactId(newId('fact')),
    subject: { entityId },
    sourceEpisodeId: input.episodeId,
  };
  const previous = FUNCTIONAL_PREDICATES.has(input.fact.predicate.id)
    ? input.functionalBySp.get(subjectPredicateKey(entityId, input.fact.predicate.id))
    : undefined;
  if (FUNCTIONAL_PREDICATES.has(input.fact.predicate.id)) {
    await closePreviousFunctional(input, entityId, nextFact);
    input.functionalBySp.set(subjectPredicateKey(entityId, input.fact.predicate.id), nextFact);
  }
  if (input.persist) {
    await input.facts.insert({ workspaceId: input.workspaceId, fact: nextFact });
  }
  input.factsBySpo.set(identity, nextFact);
  return { inserted: true, nextFact, closes: previous };
}

async function closePreviousFunctional(
  input: {
    persist: boolean;
    workspaceId: WorkspaceId;
    now: IsoUtcTimestamp;
    facts: FactRepository;
    factsBySpo: Map<string, Fact>;
    functionalBySp: Map<string, Fact>;
  },
  entityId: EntityId,
  nextFact: Fact,
): Promise<void> {
  const previous = input.functionalBySp.get(subjectPredicateKey(entityId, nextFact.predicate.id));
  if (previous === undefined) {
    return;
  }
  const worldUntil = nextFact.validFrom ?? input.now;
  const { previous: closed } = supersedeFact(previous, nextFact, worldUntil);
  const stored: Fact = {
    ...closed,
    retractedAt: input.now,
    status: 'retracted',
  };
  if (input.persist) {
    await input.facts.upsert({ workspaceId: input.workspaceId, fact: stored });
  }
  input.factsBySpo.delete(
    factIdentityKey(previous.subject.entityId, previous.predicate.id, previous.object),
  );
}

async function applyExtract(
  deps: {
    authorizer: Authorizer;
    clock: Clock;
    unitOfWork: UnitOfWork;
    episodes: EpisodeRepository;
    facts: FactRepository;
    entities: EntityRepository;
  },
  context: ExecutionContext,
  spaceIdInput: string,
  persist: boolean,
): Promise<{ factCount: number; proposed: ProposedFact[] }> {
  const spaceId = asKnowledgeSpaceId(spaceIdInput);
  const episodes = (
    await deps.episodes.listRecent({
      workspaceId: context.workspaceId,
      knowledgeSpaceId: spaceId,
      limit: 100,
    })
  )
    .slice()
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  const proposed: ProposedFact[] = [];
  const now = deps.clock.now();
  const existingFacts = await deps.facts.query({
    workspaceId: context.workspaceId,
    knowledgeSpaceId: spaceId,
    limit: 200,
  });
  const activeFacts = existingFacts.filter((item) => item.retractedAt === undefined);
  const factsBySpo = new Map(
    activeFacts.map((item) => [
      factIdentityKey(item.subject.entityId, item.predicate.id, item.object),
      item,
    ]),
  );
  const functionalBySp = new Map(
    activeFacts
      .filter((item) => FUNCTIONAL_PREDICATES.has(item.predicate.id))
      .map((item) => [subjectPredicateKey(item.subject.entityId, item.predicate.id), item]),
  );
  const run = async (): Promise<void> => {
    for (const episode of episodes) {
      const extracted = extractTypedFacts(episode.content, context.workspaceId, spaceId, now, {
        principalId: context.principal.id,
      });
      for (const fact of extracted) {
        const result = await persistExtractedFact({
          persist,
          fact,
          episodeId: episode.id,
          workspaceId: context.workspaceId,
          spaceId,
          now,
          entities: deps.entities,
          facts: deps.facts,
          factsBySpo,
          functionalBySp,
        });
        if (result.inserted && result.nextFact !== undefined) {
          proposed.push({
            subjectId: result.nextFact.subject.entityId,
            predicateId: result.nextFact.predicate.id,
            objectText: formatFactObject(result.nextFact.object),
            sourceEpisodeId: episode.id,
            closes:
              result.closes === undefined
                ? undefined
                : formatFactSentence({
                    subjectId: result.closes.subject.entityId,
                    predicateId: result.closes.predicate.id,
                    objectText: formatFactObject(result.closes.object),
                    summary: `${result.closes.subject.entityId} ${result.closes.predicate.id}`,
                  }),
          });
        }
      }
    }
  };
  if (persist) {
    await deps.unitOfWork.run(run);
  } else {
    await run();
  }
  return { factCount: proposed.length, proposed };
}

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
      const result = await applyExtract(deps, context, input.spaceId, true);
      return { factCount: result.factCount };
    },

    async previewExtract(context, input) {
      await authorizeOrThrow(
        deps.authorizer,
        context,
        KNOWLEDGE_READ,
        SPACE_RESOURCE,
        input.spaceId,
      );
      return applyExtract(deps, context, input.spaceId, false);
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
