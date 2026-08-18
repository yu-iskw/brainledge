import { describe, expect, it } from 'vitest';

import { createLocalAuthorizer } from '../auth/local-authorizer.js';
import { LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { localContext } from '../identity/local.js';
import { createFakeEmbeddingProvider } from '../models/providers.js';
import { fixedClock } from '../ports/clock.js';
import { passthroughUnitOfWork } from '../ports/unit-of-work.js';

import { createApplication } from './create-application.js';

import type { Entity, EntityAlias } from '../knowledge/entity.js';
import type { Episode } from '../knowledge/episode.js';
import type { Evidence } from '../knowledge/evidence.js';
import type { Fact } from '../knowledge/fact.js';
import type { EntityRepository } from '../ports/entity-repository.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';
import type { FactRepository } from '../ports/fact-repository.js';
import type { JobRepository } from '../ports/job-repository.js';
import type { SpaceRepository } from '../ports/space-repository.js';

function emptyJobs(): JobRepository {
  return {
    enqueue: () => Promise.resolve(),
    claim: () => Promise.resolve(undefined),
    succeed: () => Promise.resolve(),
    fail: () => Promise.resolve(),
    requeueStaleRunning: () => Promise.resolve(0),
  };
}

function emptySpaces(): SpaceRepository {
  return {
    get: () => Promise.resolve(undefined),
    list: () => Promise.resolve([]),
    insert: () => Promise.resolve(),
    update: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  };
}

function memoryRepos(): { episodes: EpisodeRepository; evidence: EvidenceRepository } {
  const episodes: Episode[] = [];
  const evidenceItems: Evidence[] = [];
  return {
    episodes: {
      insert: ({ episode }) => {
        episodes.push(episode);
        return Promise.resolve();
      },
      findById: ({ episodeId }) => Promise.resolve(episodes.find((item) => item.id === episodeId)),
      searchLexical: ({ query, limit }) => {
        const tokens = query
          .toLowerCase()
          .split(/\W+/u)
          .filter((token) => token.length > 2);
        return Promise.resolve(
          episodes
            .filter((item) => !item.hidden && item.deletedAt === undefined)
            .filter(
              (item) =>
                tokens.length === 0 ||
                tokens.some((token) => item.content.toLowerCase().includes(token)),
            )
            .slice(0, limit),
        );
      },
      listRecent: ({ limit }) =>
        Promise.resolve(
          episodes.filter((item) => !item.hidden && item.deletedAt === undefined).slice(0, limit),
        ),
      hide: ({ episodeId }) => {
        const found = episodes.find((item) => item.id === episodeId);
        if (found) {
          (found as { hidden: boolean }).hidden = true;
        }
        return Promise.resolve();
      },
      delete: ({ episodeId }) => {
        const index = episodes.findIndex((item) => item.id === episodeId);
        if (index >= 0) {
          episodes.splice(index, 1);
        }
        return Promise.resolve();
      },
      purge: ({ episodeId }) => {
        const index = episodes.findIndex((item) => item.id === episodeId);
        if (index >= 0) {
          episodes.splice(index, 1);
        }
        return Promise.resolve();
      },
    },
    evidence: {
      insert: ({ evidence }) => {
        evidenceItems.push(evidence);
        return Promise.resolve();
      },
      findById: ({ evidenceId }) =>
        Promise.resolve(evidenceItems.find((item) => item.id === evidenceId)),
      purgeBySource: ({ sourceId }) => {
        for (let index = evidenceItems.length - 1; index >= 0; index -= 1) {
          if (evidenceItems[index]?.sourceId === sourceId) {
            evidenceItems.splice(index, 1);
          }
        }
        return Promise.resolve();
      },
    },
  };
}

function knowledgeRepos(): {
  episodes: EpisodeRepository;
  evidence: EvidenceRepository;
  facts: FactRepository;
  entities: EntityRepository;
} {
  const base = memoryRepos();
  const storedFacts: Fact[] = [];
  const entities: Entity[] = [];
  const aliases: EntityAlias[] = [];
  return {
    ...base,
    facts: {
      insert: ({ fact }) => {
        storedFacts.push(fact);
        return Promise.resolve();
      },
      upsert: ({ fact }) => {
        const index = storedFacts.findIndex((item) => item.id === fact.id);
        if (index >= 0) {
          storedFacts[index] = fact;
        } else {
          storedFacts.push(fact);
        }
        return Promise.resolve();
      },
      findById: ({ factId }) => Promise.resolve(storedFacts.find((item) => item.id === factId)),
      query: ({ limit }) =>
        Promise.resolve(
          storedFacts.filter((item) => item.retractedAt === undefined).slice(0, limit),
        ),
      findContradictions: () => Promise.resolve([]),
      purgeBySourceEpisode: ({ sourceEpisodeId }) => {
        for (let index = storedFacts.length - 1; index >= 0; index -= 1) {
          if (storedFacts[index]?.sourceEpisodeId === sourceEpisodeId) {
            storedFacts.splice(index, 1);
          }
        }
        return Promise.resolve();
      },
    },
    entities: {
      insert: ({ entity }) => {
        entities.push(entity);
        return Promise.resolve();
      },
      findById: ({ entityId }) => Promise.resolve(entities.find((item) => item.id === entityId)),
      findByAlias: ({ normalizedValue }) =>
        Promise.resolve(
          entities.find((item) => item.canonicalName.toLowerCase() === normalizedValue),
        ),
      addAlias: ({ alias }) => {
        aliases.push(alias);
        return Promise.resolve();
      },
      list: () => Promise.resolve(entities),
    },
  };
}

describe('createApplication', () => {
  it('rejects incompatible plugin API versions', () => {
    const repos = memoryRepos();
    expect(() =>
      createApplication({
        clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
        unitOfWork: passthroughUnitOfWork(),
        authorizer: createLocalAuthorizer(),
        episodes: repos.episodes,
        evidence: repos.evidence,
        spaces: emptySpaces(),
        jobs: emptyJobs(),
        plugins: [{ id: 'x', version: '1', apiVersion: '0', capabilities: [] }],
      }),
    ).toThrow(/Incompatible plugin API/u);
  });

  it('remember and recall without a model provider', async () => {
    const repos = memoryRepos();
    const app = createApplication({
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      authorizer: createLocalAuthorizer(),
      episodes: repos.episodes,
      evidence: repos.evidence,
      spaces: emptySpaces(),
      jobs: emptyJobs(),
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const result = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Where does Alice live?',
    });
    expect(result.memories[0]?.content).toMatch(/Tokyo/u);
    expect(LOCAL_WORKSPACE_ID).toBe('ws_personal');
  });

  it('recall maps retrieved factIds, includes the object, and limits provenance', async () => {
    const repos = knowledgeRepos();
    const app = createApplication({
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      authorizer: createLocalAuthorizer(),
      episodes: repos.episodes,
      evidence: repos.evidence,
      spaces: emptySpaces(),
      jobs: emptyJobs(),
      facts: repos.facts,
      entities: repos.entities,
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Carol moved to Paris in June 2026.',
    });
    const consolidated = await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    expect(consolidated.factCount).toBe(2);

    const tokyo = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Tokyo',
    });
    expect(tokyo.facts).toHaveLength(1);
    expect(tokyo.facts[0]).toMatchObject({
      subjectId: 'ent_alice',
      predicateId: 'livesIn',
      objectText: 'Tokyo',
      summary: 'ent_alice livesIn Tokyo',
    });
    expect(tokyo.facts.some((fact) => fact.objectText === 'Paris')).toBe(false);
    expect(tokyo.provenanceSummary.map((item) => item.episodeId)).toEqual(
      tokyo.memories.map((memory) => memory.episodeId),
    );
    expect(tokyo.memories.every((memory) => memory.content.includes('Tokyo'))).toBe(true);

    const alice = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Alice',
    });
    expect(alice.facts.map((fact) => fact.objectText)).toEqual(['Tokyo']);
    expect(alice.facts.some((fact) => fact.objectText === 'Paris')).toBe(false);

    const where = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Where does Alice live?',
    });
    expect(where.facts).toHaveLength(1);
    expect(where.facts[0]?.summary).toBe('ent_alice livesIn Tokyo');
    expect(where.facts[0]?.subjectId).toBe('ent_alice');
    expect(where.facts.some((fact) => fact.objectText === 'Paris')).toBe(false);

    const recent = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: '',
    });
    expect([...recent.facts.map((fact) => fact.objectText)].sort()).toEqual(['Paris', 'Tokyo']);
    expect(recent.provenanceSummary).toHaveLength(recent.memories.length);

    const unrelated = await app.memory.recall(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      query: 'Zebra',
    });
    expect(unrelated.facts).toEqual([]);
  });

  it('stores embeddings when a provider is configured', async () => {
    const repos = memoryRepos();
    const stored: { targetId: string; vector: readonly number[] }[] = [];
    const app = createApplication({
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      authorizer: createLocalAuthorizer(),
      episodes: repos.episodes,
      evidence: repos.evidence,
      spaces: emptySpaces(),
      jobs: emptyJobs(),
      embeddingProvider: createFakeEmbeddingProvider(4),
      embeddings: {
        upsert: ({ embedding }) => {
          stored.push({ targetId: embedding.targetId, vector: embedding.vector });
          return Promise.resolve();
        },
        list: () => Promise.resolve([]),
        deleteByTarget: () => Promise.resolve(),
      },
    });
    const remembered = await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'Alice moved to Tokyo in July 2026.',
    });
    expect(stored[0]?.targetId).toBe(remembered.episodeId);
    expect(stored[0]?.vector).toHaveLength(4);
  });
});
