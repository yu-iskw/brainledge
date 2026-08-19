import {
  createApplication,
  createLocalAuthorizer,
  localContext,
  parseIsoUtc,
  fixedClock,
  passthroughUnitOfWork,
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

import { handleMcpJsonRpc } from './jsonrpc.js';

import type { McpProfile } from './profiles.js';
import type { Application } from '@brainledge/core';

const ALL_PROFILES: readonly McpProfile[] = ['memory-read', 'memory-write', 'knowledge-admin'];

function testApplication(): Application {
  const store = createInMemoryStores();
  return createApplication({
    clock: fixedClock(parseIsoUtc('2026-08-18T00:00:00.000Z')),
    unitOfWork: passthroughUnitOfWork(),
    authorizer: createLocalAuthorizer(),
    episodes: createInMemoryEpisodeRepository(store),
    evidence: createInMemoryEvidenceRepository(store),
    spaces: createInMemorySpaceRepository(store),
    jobs: createInMemoryJobRepository(store),
    facts: createInMemoryFactRepository(),
    entities: createInMemoryEntityRepository(),
  });
}

async function callTool(
  application: Application,
  name: string,
  args: Record<string, unknown>,
  profiles: readonly McpProfile[] = ALL_PROFILES,
): Promise<{ raw: string; payload: Record<string, unknown> }> {
  const raw = await handleMcpJsonRpc(
    application,
    profiles,
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  );
  const envelope = JSON.parse(raw) as { result?: { content?: { text?: string }[] } };
  const text = envelope.result?.content?.[0]?.text ?? '{}';
  return { raw, payload: JSON.parse(text) as Record<string, unknown> };
}

describe('mcp jsonrpc', () => {
  it('recalls through a tools/call payload', async () => {
    const application = testApplication();
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
    expect(listed).not.toMatch(/knowledge.consolidate/u);
  });

  it('returns fact-first recall after consolidate', async () => {
    const application = testApplication();
    await application.memory.remember(localContext(), {
      spaceId: 'ks_default',
      content: 'Alice moved to Tokyo in July 2026.',
    });
    const preview = await callTool(application, 'knowledge.consolidate', { dryRun: true });
    const trustedPreview = preview.payload.trusted as {
      status: string;
      factCount: number;
      proposed: { objectText: string }[];
    };
    expect(trustedPreview.status).toBe('preview');
    expect(trustedPreview.factCount).toBeGreaterThan(0);
    expect(trustedPreview.proposed[0]?.objectText).toBe('Tokyo');
    const before = await application.knowledge?.queryFacts(localContext(), {
      spaceId: 'ks_default',
    });
    expect(before ?? []).toHaveLength(0);
    const accepted = await callTool(application, 'knowledge.consolidate', { dryRun: false });
    expect((accepted.payload.trusted as { status: string }).status).toBe('completed');
    const recalled = await callTool(application, 'memory.recall', {
      query: 'Where does Alice live?',
    });
    const trusted = recalled.payload.trusted as {
      answer: string;
      receipts: string[];
      facts: { objectText: string }[];
    };
    expect(trusted.answer).toMatch(/Alice lives in Tokyo/u);
    expect(trusted.receipts).toContain('Alice lives in Tokyo');
    expect(trusted.facts[0]?.objectText).toBe('Tokyo');
    expect((recalled.payload.untrusted as { content: string }).content).toMatch(/Tokyo/u);
  });

  it('forgets a memory so later recall misses it', async () => {
    const application = testApplication();
    const remembered = await application.memory.remember(localContext(), {
      spaceId: 'ks_default',
      content: 'Alice moved to Tokyo in July 2026.',
    });
    await callTool(application, 'knowledge.consolidate', {});
    await callTool(application, 'memory.forget', {
      memoryId: remembered.episodeId,
      mode: 'hide',
    });
    const recalled = await callTool(application, 'memory.recall', { query: 'Alice' });
    const trusted = recalled.payload.trusted as { answer: string; facts: unknown[] };
    expect(trusted.facts).toHaveLength(0);
    expect(trusted.answer).not.toMatch(/Tokyo/u);
  });

  it('lists consolidate only when knowledge-admin is enabled', async () => {
    const application = testApplication();
    const listed = await handleMcpJsonRpc(
      application,
      ALL_PROFILES,
      JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} }),
    );
    expect(listed).toMatch(/knowledge.consolidate/u);
    expect(listed).toMatch(/memory.forget/u);
  });
});
