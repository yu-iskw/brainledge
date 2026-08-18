import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cmdExport,
  cmdImport,
  assertMigrateConsent,
  cmdServe,
  cmdMcp,
  cmdMigrateHelp,
  cmdMigrate,
  describeServeMode,
} from '../../src/commands/io.js';
import {
  cmdConsolidate,
  cmdForget,
  cmdInit,
  cmdRemember,
  cmdRecall,
} from '../../src/commands/memory.js';

describe('import export migrate', () => {
  it('round-trips memories and requires migrate consent', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-io-'));
    cmdInit(dataDir);
    await cmdRemember('Alice moved to Tokyo in July 2026.', dataDir);
    const archive = path.join(dataDir, 'export.json');
    await cmdExport(archive, dataDir);
    const dest = mkdtempSync(path.join(os.tmpdir(), 'brainledge-io-dest-'));
    cmdInit(dest);
    const count = await cmdImport(archive, dest);
    expect(count).toBeGreaterThan(0);
    const parsed = JSON.parse(readFileSync(archive, 'utf8')) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
    expect(() => assertMigrateConsent([])).toThrow(/i-understand/u);
    expect(describeServeMode(dataDir, 'http://127.0.0.1:8787')).toMatch(/^remote:/u);
    expect(describeServeMode(dataDir)).toMatch(/^local:/u);
    expect(() => cmdServe(dataDir, 'http://127.0.0.1:8787')).toThrow(/local HTTP listener/u);
    expect(cmdMigrateHelp()).toMatch(/migrate/u);
    const migratedDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-mig-'));
    expect(await cmdMigrate(dataDir, migratedDir, ['--i-understand'])).toMatch(/migrated/u);
    assertMigrateConsent(['--i-understand']);
    writeFileSync(path.join(dataDir, 'bad.json'), '{"schemaVersion":0}');
    await expect(cmdImport(path.join(dataDir, 'bad.json'), dest)).rejects.toThrow(/SCHEMA/u);
  });

  it('remembers and recalls through MCP JSON-RPC', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'brainledge-mcp-'));
    cmdInit(dataDir);
    const remembered = await cmdMcp(
      dataDir,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'memory.remember',
          arguments: { content: 'Alice moved to Tokyo in July 2026.' },
        },
      }),
    );
    expect(remembered).toMatch(/episodeId|ep_/u);
    const recalled = await cmdMcp(
      dataDir,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'memory.recall', arguments: { query: 'Alice' } },
      }),
    );
    expect(recalled).toMatch(/Tokyo/u);
  });

  it('remembers and recalls via remote server URL with injected fetch', async () => {
    const calls: { url: string; body: string }[] = [];
    const fetchImpl = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, body: init?.body as string });
      if (urlStr.endsWith('/memories')) {
        return Promise.resolve(
          new Response(JSON.stringify({ episodeId: 'ep_remote_1' }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            memories: [{ content: 'Alice moved to Tokyo in July 2026.' }],
            facts: [],
          }),
          { status: 200 },
        ),
      );
    };
    const serverUrl = 'http://127.0.0.1:8787';
    const episodeId = await cmdRemember(
      'Alice moved to Tokyo in July 2026.',
      undefined,
      serverUrl,
      fetchImpl,
    );
    expect(episodeId).toBe('ep_remote_1');
    expect(calls[0].url).toBe(`${serverUrl}/api/v1/spaces/ks_default/memories`);
    const recalled = await cmdRecall('Alice', undefined, serverUrl, fetchImpl);
    expect(recalled).toMatch(/Tokyo/u);
    expect(calls[1].url).toBe(`${serverUrl}/api/v1/spaces/ks_default/recall`);
  });

  it('forgets and consolidates via remote server URL with injected fetch', async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchImpl = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, method: init?.method ?? 'GET' });
      if (urlStr.includes('/memories/ep_remote_1')) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ factCount: 3 }), { status: 200 }));
    };
    const serverUrl = 'http://127.0.0.1:8787';
    expect(await cmdForget('ep_remote_1', { mode: 'hide', serverUrl, fetchImpl })).toMatch(
      /forgot ep_remote_1/u,
    );
    expect(calls[0]).toEqual({
      url: `${serverUrl}/api/v1/spaces/ks_default/memories/ep_remote_1?mode=hide`,
      method: 'DELETE',
    });
    expect(await cmdConsolidate(undefined, serverUrl, fetchImpl)).toMatch(/consolidated 3 facts/u);
    expect(calls[1]).toEqual({
      url: `${serverUrl}/api/v1/spaces/ks_default/consolidate`,
      method: 'POST',
    });
  });

  it('sends Bearer token for remote remember/recall', async () => {
    const headersSeen: string[] = [];
    const fetchImpl = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const headerBag = new Headers(init?.headers);
      headersSeen.push(headerBag.get('authorization') ?? '');
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.endsWith('/memories')) {
        return Promise.resolve(
          new Response(JSON.stringify({ episodeId: 'ep_remote_1' }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ memories: [], facts: [] }), { status: 200 }),
      );
    };
    await cmdRemember('note', undefined, 'http://127.0.0.1:8787', fetchImpl, 'secret-token');
    expect(headersSeen[0]).toBe('Bearer secret-token');
    await cmdRecall('note', undefined, 'http://127.0.0.1:8787', fetchImpl, 'secret-token');
    expect(headersSeen[1]).toBe('Bearer secret-token');
  });
});
