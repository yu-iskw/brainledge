import {
  createApplication,
  createLocalAuthorizer,
  fixedClock,
  parseIsoUtc,
  passthroughUnitOfWork,
  asJobId,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  type Application,
} from '@brainledge/core';
import {
  createInMemoryEntityRepository,
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryFactRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
} from '@brainledge/storage';
import { describe, expect, it } from 'vitest';

import { createStandaloneJobHandlers, runStandaloneWorker } from './runtime.js';

function createWorkerApplication(withKnowledge: boolean): Application {
  const store = createInMemoryStores();
  return createApplication({
    clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
    unitOfWork: passthroughUnitOfWork(),
    authorizer: createLocalAuthorizer(),
    episodes: createInMemoryEpisodeRepository(store),
    evidence: createInMemoryEvidenceRepository(store),
    spaces: createInMemorySpaceRepository(store),
    jobs: createInMemoryJobRepository(store),
    ...(withKnowledge
      ? {
          facts: createInMemoryFactRepository(),
          entities: createInMemoryEntityRepository(),
        }
      : {}),
  });
}

async function enqueueIngestUrl(
  application: Application,
  jobId: string,
  url: string,
): Promise<void> {
  await application.ports.jobs.enqueue({
    workspaceId: LOCAL_WORKSPACE_ID,
    job: {
      id: asJobId(jobId),
      workspaceId: LOCAL_WORKSPACE_ID,
      type: 'ingest-url',
      payloadJson: JSON.stringify({ spaceId: LOCAL_SPACE_ID, url }),
      status: 'queued',
      attempts: 0,
      createdAt: application.ports.clock.now(),
    },
  });
}

async function recentContent(application: Application): Promise<string> {
  const episodes = await application.ports.episodes.listRecent({
    workspaceId: LOCAL_WORKSPACE_ID,
    knowledgeSpaceId: LOCAL_SPACE_ID,
    limit: 50,
  });
  return episodes.map((episode) => episode.content).join('\n');
}

describe('standalone job handlers', () => {
  it('ingests HTML URL jobs as readable text', async () => {
    const application = createWorkerApplication(true);
    const fetchImpl = (): Promise<Response> =>
      Promise.resolve(
        new Response(
          '<html><head><title>Example</title></head><body><p>Hello from the web</p></body></html>',
          { status: 200, headers: { 'content-type': 'text/html' } },
        ),
      );
    await enqueueIngestUrl(application, 'job_ingest_html', 'https://example.com/page');
    const processed = await runStandaloneWorker(application, { once: true, fetchImpl });
    expect(processed).toBe(1);
    const content = await recentContent(application);
    expect(content).toContain('Hello from the web');
    expect(content).not.toContain('<html');
    expect(content).not.toContain('<p>');
    expect(createStandaloneJobHandlers(application).consolidate).toBeTypeOf('function');
  });

  it('ingests markdown URL jobs without rewriting the body', async () => {
    const application = createWorkerApplication(true);
    const fetchImpl = (): Promise<Response> =>
      Promise.resolve(new Response('# Hello', { status: 200 }));
    await enqueueIngestUrl(application, 'job_ingest_md', 'https://example.com/doc.md');
    const processed = await runStandaloneWorker(application, { once: true, fetchImpl });
    expect(processed).toBe(1);
    expect(await recentContent(application)).toContain('# Hello');
  });

  it('rejects oversized ingest-url bodies before markdown parse', async () => {
    const application = createWorkerApplication(true);
    const fetchImpl = (): Promise<Response> =>
      Promise.resolve(new Response('x'.repeat(1_000_001), { status: 200 }));
    await enqueueIngestUrl(application, 'job_ingest_huge', 'https://example.com/huge');
    const processed = await runStandaloneWorker(application, { once: true, fetchImpl });
    expect(processed).toBe(1);
    expect(await recentContent(application)).toBe('');
  });

  it('exits the poll loop when aborted', async () => {
    const application = createWorkerApplication(false);
    const controller = new AbortController();
    const running = runStandaloneWorker(application, {
      signal: controller.signal,
      pollMs: 30_000,
    });
    controller.abort();
    await expect(running).resolves.toBe(0);
  });
});
