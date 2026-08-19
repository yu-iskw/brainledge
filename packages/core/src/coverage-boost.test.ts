import { describe, expect, it } from 'vitest';

import { createApplication } from './app/create-application.js';
import { createLocalAuthorizer } from './auth/local-authorizer.js';
import {
  LOCAL_SPACE_ID,
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from './domain/ids.js';
import { parseIsoUtc } from './domain/time.js';
import { localContext } from './identity/local.js';
import { runQueuedJobs } from './jobs/runner.js';
import { resolveEntityByAlias } from './knowledge/resolution.js';
import {
  createAllowAllPolicyEngine,
  createReplicationHook,
  createSignedWebhookPort,
} from './plugins/p2-ports.js';
import { fixedClock } from './ports/clock.js';
import { passthroughUnitOfWork } from './ports/unit-of-work.js';
import { retrieve } from './search/retrieval.js';

import type { Episode } from './knowledge/episode.js';
import type { Evidence } from './knowledge/evidence.js';
import type { Fact } from './knowledge/fact.js';
import type { EpisodeRepository } from './ports/episode-repository.js';
import type { EvidenceRepository } from './ports/evidence-repository.js';
import type { JobRepository } from './ports/job-repository.js';
import type { SpaceRepository } from './ports/space-repository.js';

function emptyJobs(): JobRepository {
  return {
    enqueue: () => Promise.resolve(),
    claim: () => Promise.resolve(undefined),
    succeed: () => Promise.resolve(),
    fail: () => Promise.resolve(),
    requeueStaleRunning: () => Promise.resolve(0),
  };
}

describe('coverage boost', () => {
  it('forgets, retrieves strategies, and optional p2 adapters', async () => {
    const episodes: Episode[] = [];
    const evidenceItems: Evidence[] = [];
    const episodeRepo: EpisodeRepository = {
      insert: ({ episode }) => {
        episodes.push(episode);
        return Promise.resolve();
      },
      findById: ({ episodeId }) => Promise.resolve(episodes.find((item) => item.id === episodeId)),
      searchLexical: ({ limit }) => Promise.resolve(episodes.slice(0, limit)),
      listRecent: ({ limit }) => Promise.resolve(episodes.slice(0, limit)),
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
    };
    const evidenceRepo: EvidenceRepository = {
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
    };
    const spaces: SpaceRepository = {
      get: () => Promise.resolve(undefined),
      list: () => Promise.resolve([]),
      insert: () => Promise.resolve(),
      update: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    };
    const app = createApplication({
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      authorizer: createLocalAuthorizer(),
      episodes: episodeRepo,
      evidence: evidenceRepo,
      spaces,
      jobs: emptyJobs(),
    });
    const first = await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'note one',
    });
    await app.memory.forget(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      memoryId: first.episodeId,
      mode: 'hide',
    });
    const second = await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'note two',
    });
    await app.memory.forget(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      memoryId: second.episodeId,
      mode: 'delete',
    });
    const third = await app.memory.remember(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      content: 'note three',
      sessionId: 's1',
    });
    await app.memory.forget(localContext(), {
      spaceId: LOCAL_SPACE_ID,
      memoryId: third.episodeId,
      mode: 'purge',
    });
    await app.memory.consolidate(localContext(), { spaceId: LOCAL_SPACE_ID });
    const facts: Fact[] = [];
    expect(retrieve({ query: 'related to Alice', episodes, facts }).strategy).toBe('lexical');
    expect(retrieve({ query: 'who is Alice', episodes, facts }).strategy).toBe('entity');
    expect(
      retrieve({
        query: 'x',
        episodes,
        facts,
        strategy: 'vector',
        queryVector: [1, 0],
        vectors: [{ targetId: 'n', vector: [1, 0] }],
      }).strategy,
    ).toBe('vector');
    expect(
      await createAllowAllPolicyEngine().evaluate({ principalId: 'p', action: 'a', resource: 'r' }),
    ).toBe(true);
    await createReplicationHook().onCommit('ws', '{}');
    const webhook = createSignedWebhookPort('secret', () =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    expect((await webhook.deliver('https://example.com', '{}')).status).toBe(204);
    expect(asEntityId('ent_x')).toBe('ent_x');
    expect(asFactId('fact_x')).toBe('fact_x');
    expect(asKnowledgeSpaceId('ks_x')).toBe('ks_x');
    expect(asPrincipalId('principal_x')).toBe('principal_x');
    expect(asWorkspaceId('ws_x')).toBe('ws_x');
    expect(retrieve({ query: 'Alice lives', episodes, facts }).strategy).toBe('lexical');
    expect(retrieve({ query: '', episodes, facts }).strategy).toBe('recent');
    expect(retrieve({ query: 'x', episodes, facts, strategy: 'prior-decision' }).strategy).toBe(
      'prior-decision',
    );
    expect(
      resolveEntityByAlias(
        [
          {
            id: asEntityId('ent_alice'),
            workspaceId: asWorkspaceId('ws_personal'),
            knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
            canonicalName: 'Alice',
            typeIds: [],
            createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
          },
        ],
        [{ entityId: asEntityId('ent_alice'), value: 'Alice', normalizedValue: 'alice' }],
        'Alice',
      )?.canonicalName,
    ).toBe('Alice');
    expect(
      resolveEntityByAlias(
        [
          {
            id: asEntityId('ent_bob'),
            workspaceId: asWorkspaceId('ws_personal'),
            knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
            canonicalName: 'Bob',
            typeIds: [],
            createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
          },
        ],
        [],
        'Bob',
      )?.canonicalName,
    ).toBe('Bob');
    const queued = {
      id: 'job_1' as never,
      workspaceId: asWorkspaceId('ws_personal'),
      type: 'unknown',
      payloadJson: '{}',
      status: 'queued' as const,
      attempts: 0,
      createdAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
    };
    const jobsQueue = [queued];
    const jobRepo = {
      enqueue: () => Promise.resolve(),
      claim: () => Promise.resolve(jobsQueue.shift()),
      succeed: () => Promise.resolve(),
      fail: () => Promise.resolve(),
      requeueStaleRunning: () => Promise.resolve(0),
    };
    expect(await runQueuedJobs(jobRepo, {})).toBe(1);
    const exploding = {
      ...queued,
      id: 'job_2' as never,
      type: 'boom',
    };
    expect(
      await runQueuedJobs(
        {
          enqueue: () => Promise.resolve(),
          claim: (() => {
            let first = true;
            return () => {
              if (!first) {
                return Promise.resolve(undefined);
              }
              first = false;
              return Promise.resolve(exploding);
            };
          })(),
          succeed: () => Promise.resolve(),
          fail: () => Promise.resolve(),
          requeueStaleRunning: () => Promise.resolve(0),
        },
        {
          boom: () => {
            throw new Error('nope');
          },
        },
      ),
    ).toBe(1);
  });
});
