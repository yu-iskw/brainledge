import {
  createApplication,
  createLocalAuthorizer,
  fixedClock,
  parseIsoUtc,
  passthroughUnitOfWork,
  asJobId,
  LOCAL_WORKSPACE_ID,
} from '@brainledge/core';
import {
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
} from '@brainledge/storage';
import { describe, expect, it } from 'vitest';

import { createStandaloneJobHandlers, runStandaloneWorker } from './runtime.js';

describe('standalone job handlers', () => {
  it('ingests URL jobs through an injected fetch', async () => {
    const store = createInMemoryStores();
    const application = createApplication({
      clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
      unitOfWork: passthroughUnitOfWork(),
      authorizer: createLocalAuthorizer(),
      episodes: createInMemoryEpisodeRepository(store),
      evidence: createInMemoryEvidenceRepository(store),
      spaces: createInMemorySpaceRepository(store),
      jobs: createInMemoryJobRepository(store),
    });
    const fetchImpl = (): Promise<Response> =>
      Promise.resolve(new Response('# Hello from the web', { status: 200 }));
    await application.ports.jobs.enqueue({
      workspaceId: LOCAL_WORKSPACE_ID,
      job: {
        id: asJobId('job_ingest_1'),
        workspaceId: LOCAL_WORKSPACE_ID,
        type: 'ingest-url',
        payloadJson: JSON.stringify({ spaceId: 'ks_default', url: 'https://example.com/doc.md' }),
        status: 'queued',
        attempts: 0,
        createdAt: application.ports.clock.now(),
      },
    });
    const processed = await runStandaloneWorker(application, { once: true, fetchImpl });
    expect(processed).toBe(1);
    expect(createStandaloneJobHandlers(application).consolidate).toBeTypeOf('function');
  });
});
