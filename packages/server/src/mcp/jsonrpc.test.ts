import {
  createApplication,
  createLocalAuthorizer,
  localContext,
  parseIsoUtc,
  fixedClock,
  passthroughUnitOfWork,
} from '@brainledge/core';
import {
  createInMemoryEpisodeRepository,
  createInMemoryEvidenceRepository,
  createInMemoryJobRepository,
  createInMemorySpaceRepository,
  createInMemoryStores,
} from '@brainledge/storage';
import { describe, expect, it } from 'vitest';

import { handleMcpJsonRpc } from './jsonrpc.js';

describe('mcp jsonrpc', () => {
  it('recalls through a tools/call payload', async () => {
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
    await application.memory.remember(localContext(), {
      spaceId: 'ks_default',
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const raw = await handleMcpJsonRpc(
      application,
      ['memory-read', 'memory-write'],
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'memory.recall', arguments: { query: 'Alice' } },
      }),
    );
    expect(raw).toMatch(/Tokyo/u);
    const remembered = await handleMcpJsonRpc(
      application,
      ['memory-read', 'memory-write'],
      JSON.stringify({
        method: 'tools/call',
        params: { name: 'memory.remember', arguments: { content: 'Bob lives in Kyoto' } },
      }),
    );
    expect(remembered).toMatch(/episodeId|ep_/u);
    const listed = await handleMcpJsonRpc(
      application,
      ['memory-read'],
      JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }),
    );
    expect(listed).toMatch(/memory.recall/u);
  });
});
