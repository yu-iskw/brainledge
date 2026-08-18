import {
  createApplication,
  createLocalAuthorizer,
  fixedClock,
  localContext,
  parseIsoUtc,
  passthroughUnitOfWork,
  type Application,
} from '@brainledge/core';
import {
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
} from '@brainledge/storage';
import { describe, expect, it } from 'vitest';

import { createHttpApp, openApiDocument, REQUIRED_OPENAPI_PATHS } from './app.js';

function createTestApplication(): Application {
  const store = createInMemoryStores();
  return createApplication({
    clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
    unitOfWork: passthroughUnitOfWork(),
    authorizer: createLocalAuthorizer(),
    episodes: createInMemoryEpisodeRepository(store),
    evidence: createInMemoryEvidenceRepository(store),
    spaces: createInMemorySpaceRepository(store),
    jobs: createInMemoryJobRepository(store),
  });
}

describe('http app', () => {
  it('serves health and remember/recall', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application);
    const health = await app.request('/health');
    expect(health.status).toBe(200);
    const remember = await app.request('/api/v1/spaces/ks_default/memories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Alice moved to Tokyo in July 2026.' }),
    });
    expect(remember.status).toBe(200);
    const recall = await app.request('/api/v1/spaces/ks_default/recall', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Alice' }),
    });
    const payload = (await recall.json()) as { memories: { content: string }[] };
    expect(payload.memories[0]?.content).toMatch(/Tokyo/u);
    const spec = await app.request('/api/v1/openapi.json');
    expect(spec.status).toBe(200);
    const mcp = await app.request('/mcp');
    expect(mcp.status).toBe(200);
    const bad = await app.request('/api/v1/spaces/ks_default/memories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(bad.status).toBe(400);
    expect((await app.request('/api/v1/me')).status).toBe(200);
    expect((await app.request('/api/v1/spaces')).status).toBe(200);
    expect((await app.request('/api/v1/spaces/ks_default/entities')).status).toBe(200);
    expect((await app.request('/api/v1/spaces/ks_default/facts')).status).toBe(200);
    expect((await app.request('/api/v1/spaces/ks_default/timeline')).status).toBe(200);
    expect((await app.request('/api/v1/spaces/ks_default/provenance')).status).toBe(200);
    expect((await app.request('/api/v1/spaces/ks_default/decisions')).status).toBe(501);
    expect((await app.request('/api/v1/spaces/ks_default/export')).status).toBe(200);
    expect((await app.request('/api/v1/ingestions/run_1')).status).toBe(501);
    expect(
      (
        await app.request('/api/v1/spaces/ks_default/ingestions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ markdown: '# Hi' }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await app.request('/api/v1/spaces/ks_default/consolidate', { method: 'POST' })).status,
    ).toBe(200);
    const remembered = await app.request('/api/v1/spaces/ks_default/memories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'temporary note' }),
    });
    const rememberedBody = (await remembered.json()) as { episodeId: string };
    const forgotten = await app.request(
      `/api/v1/spaces/ks_default/memories/${rememberedBody.episodeId}`,
      { method: 'DELETE' },
    );
    expect(forgotten.status).toBe(200);
  });

  it('requires API token on /api/v1 when configured', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application, { apiToken: 'test-secret-token' });
    const unauthorized = await app.request('/api/v1/me');
    expect(unauthorized.status).toBe(401);
    const body = (await unauthorized.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.requestId.length).toBeGreaterThan(0);

    const health = await app.request('/health');
    expect(health.status).toBe(200);

    const authorized = await app.request('/api/v1/me', {
      headers: { authorization: 'Bearer test-secret-token' },
    });
    expect(authorized.status).toBe(200);
  });

  it('queues URL ingestions after SSRF check without fetching', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application);
    const queued = await app.request('/api/v1/spaces/ks_default/ingestions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/doc.md' }),
    });
    expect(queued.status).toBe(200);
    const payload = (await queued.json()) as { status: string; url: string };
    expect(payload.status).toBe('queued');
    expect(payload.url).toBe('https://example.com/doc.md');

    const blocked = await app.request('/api/v1/spaces/ks_default/ingestions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1/secret' }),
    });
    expect(blocked.status).toBe(400);
    const error = (await blocked.json()) as { error: { code: string } };
    expect(error.error.code).toBe('INGEST_URL_SSRF');
  });

  it('handles MCP JSON-RPC over POST /mcp', async () => {
    const application = createTestApplication();
    await application.memory.remember(localContext(), {
      spaceId: 'ks_default',
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const app = createHttpApp(application);
    const response = await app.request('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'memory.recall', arguments: { query: 'Alice' } },
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/Tokyo/u);
  });

  it('includes required OpenAPI path keys', () => {
    for (const path of REQUIRED_OPENAPI_PATHS) {
      expect(openApiDocument.paths[path]).toBeDefined();
    }
  });

  it('serves bundled UI html when provided', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application, { uiHtml: '<html><body>Custom UI</body></html>' });
    const response = await app.request('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Custom UI');
  });

  it('returns the default remember/recall UI when uiHtml is omitted', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application);
    const response = await app.request('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/Remember/u);
  });

  it('maps oversized payloads to 413 and internal errors to 500', async () => {
    const application = createTestApplication();
    const app = createHttpApp(application);
    const tooLarge = await app.request('/api/v1/spaces/ks_default/memories', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2000000',
      },
      body: JSON.stringify({ content: 'x' }),
    });
    expect(tooLarge.status).toBe(413);
    const largeBody = (await tooLarge.json()) as { error: { code: string } };
    expect(largeBody.error.code).toBe('PAYLOAD_TOO_LARGE');

    const throwingApplication: Application = {
      ...application,
      memory: {
        ...application.memory,
        remember: () => Promise.reject(new Error('boom')),
      },
    };
    const throwingApp = createHttpApp(throwingApplication);
    const internal = await throwingApp.request('/api/v1/spaces/ks_default/memories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'fail' }),
    });
    expect(internal.status).toBe(500);
    const internalBody = (await internal.json()) as { error: { code: string } };
    expect(internalBody.error.code).toBe('INTERNAL');
  });
});
