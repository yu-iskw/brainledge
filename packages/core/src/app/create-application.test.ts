import { describe, expect, it } from 'vitest';

import { createLocalAuthorizer } from '../auth/local-authorizer.js';
import { LOCAL_SPACE_ID, LOCAL_WORKSPACE_ID } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { localContext } from '../identity/local.js';
import { createFakeEmbeddingProvider } from '../models/providers.js';
import { fixedClock } from '../ports/clock.js';
import { passthroughUnitOfWork } from '../ports/unit-of-work.js';

import { createApplication } from './create-application.js';

import type { Episode } from '../knowledge/episode.js';
import type { Evidence } from '../knowledge/evidence.js';
import type { EpisodeRepository } from '../ports/episode-repository.js';
import type { EvidenceRepository } from '../ports/evidence-repository.js';
import type { JobRepository } from '../ports/job-repository.js';
import type { SpaceRepository } from '../ports/space-repository.js';

function emptyJobs(): JobRepository {
  return {
    enqueue: () => Promise.resolve(),
    claim: () => Promise.resolve(undefined),
    succeed: () => Promise.resolve(),
    fail: () => Promise.resolve(),
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
    },
    evidence: {
      insert: ({ evidence }) => {
        evidenceItems.push(evidence);
        return Promise.resolve();
      },
      findById: ({ evidenceId }) =>
        Promise.resolve(evidenceItems.find((item) => item.id === evidenceId)),
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
