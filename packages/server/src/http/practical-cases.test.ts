import {
  createApplication,
  createLocalAuthorizer,
  fixedClock,
  LOCAL_PRINCIPAL_ID,
  LOCAL_SPACE_ID,
  LOCAL_WORKSPACE_ID,
  parseIsoUtc,
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

import { createHttpApp } from './app.js';

import type { Application } from '@brainledge/core';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;
const MEMORIES_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/memories`;
const RECALL_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/recall`;
const INGESTIONS_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/ingestions`;
const DECISIONS_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/decisions`;

const LONG_PARAGRAPH = `${'Survey notes cover habitat weather and sample trays. '.repeat(18)}Rare mineral pterodactylite was logged in tray seven.`;

const REMEMBER_RECALL_CORPUS: readonly { content: string; token: string }[] = [
  { content: 'Zephyra joined the lab yesterday.', token: 'Zephyra' },
  { content: 'Quinlan filed the weekly report.', token: 'Quinlan' },
  { content: 'Maevistra prefers oat milk in the kitchen.', token: 'Maevistra' },
  { content: 'Coriolanus signed the charter at noon.', token: 'Coriolanus' },
  { content: 'Beatrixia painted the mural in the atrium.', token: 'Beatrixia' },
  { content: 'Natsuki shipped the package before lunch.', token: 'Natsuki' },
  { content: 'Oluwaseun led the standup without notes.', token: 'Oluwaseun' },
  { content: 'Guinevere archived the stale tickets.', token: 'Guinevere' },
  { content: 'The conference is in Reykjavik this year.', token: 'Reykjavik' },
  { content: 'Supply chain review mentioned Ouagadougou.', token: 'Ouagadougou' },
  { content: 'The embassy moved to Ulaanbaatar.', token: 'Ulaanbaatar' },
  { content: 'We ported in Valparaiso at dawn.', token: 'Valparaiso' },
  { content: 'The workshop ran in Christchurch all week.', token: 'Christchurch' },
  { content: 'Headquarters sits in Luxembourg city.', token: 'Luxembourg' },
  { content: 'The depot is just outside Casablanca.', token: 'Casablanca' },
  { content: 'Field office opened in Antananarivo.', token: 'Antananarivo' },
  { content: 'Naomi visited 東京都 last spring.', token: '東京都' },
  { content: 'The team hiked 北海道 in June.', token: '北海道' },
  { content: 'The pastry case held a naïve tart.', token: 'naïve' },
  { content: 'The river cruise passed Москва at night.', token: 'Москва' },
  { content: 'They photographed Αθήνα from the hill.', token: 'Αθήνα' },
  { content: 'The catalog listed SãoPaulo warehouses.', token: 'SãoPaulo' },
  { content: 'The passphrase is Wobblefinch!', token: 'Wobblefinch' },
  { content: 'The codeword is Quetzalcoatl.', token: 'Quetzalcoatl' },
  { content: 'Release notes shout Supercalifrag!!!', token: 'Supercalifrag' },
  { content: 'Secret label: Zzyzxium.', token: 'Zzyzxium' },
  { content: 'Ticket 7391842 was refunded in full.', token: '7391842' },
  { content: 'Purchase order 91827364 closed yesterday.', token: '91827364' },
  { content: 'Constant 314159265 appears in the log.', token: '314159265' },
  { content: 'Serial 880055512 is obsolete stock.', token: '880055512' },
  { content: 'Build number 40499 failed the gate.', token: '40499' },
  { content: 'Ceremony dated 20260818Zulu on the plaque.', token: '20260818Zulu' },
  { content: 'Harvest on 18 Quintilis 2026.', token: 'Quintilis' },
  { content: 'Archive stamp 19991231Epoch on the box.', token: '19991231Epoch' },
  { content: 'Picnic planned for Midsummer2026.', token: 'Midsummer2026' },
  { content: 'Marker 1776JulyFourth on the bronze plaque.', token: '1776JulyFourth' },
  { content: LONG_PARAGRAPH, token: 'pterodactylite' },
  { content: 'The vendor is AcmeWidgetry for fasteners.', token: 'AcmeWidgetry' },
  { content: 'Pilot name is Harmattan on the roster.', token: 'Harmattan' },
  { content: 'Dessert notes mention cloudberry jam.', token: 'cloudberry' },
  { content: 'Street address mentions Knutsford lane.', token: 'Knutsford' },
  { content: 'The algorithm is QuickselectX in the spec.', token: 'QuickselectX' },
  { content: 'Notes mention Würzburg in the itinerary.', token: 'Würzburg' },
  { content: 'The caravan stopped at Timbuktu overnight.', token: 'Timbuktu' },
  { content: 'Routing code Addisababa was printed twice.', token: 'Addisababa' },
];

const GET_OK_CASES: readonly { path: string }[] = [
  { path: '/health' },
  { path: '/api/v1/me' },
  { path: '/api/v1/spaces' },
  { path: '/api/v1/workspaces' },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}` },
  { path: MEMORIES_PATH },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}/entities` },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}/facts` },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}/timeline` },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}/provenance` },
  { path: DECISIONS_PATH },
  { path: `/api/v1/spaces/${LOCAL_SPACE_ID}/export` },
];

const INVALID_CASES: readonly {
  name: string;
  path: string;
  method: string;
  body?: unknown;
  status: number;
}[] = [
  {
    name: 'POST memories empty object',
    path: MEMORIES_PATH,
    method: 'POST',
    body: {},
    status: 400,
  },
  { name: 'POST recall missing query', path: RECALL_PATH, method: 'POST', body: {}, status: 400 },
  {
    name: 'GET unknown ingestion',
    path: '/api/v1/ingestions/ing_missing',
    method: 'GET',
    status: 404,
  },
  {
    name: 'POST spaces empty name',
    path: '/api/v1/spaces',
    method: 'POST',
    body: { name: '' },
    status: 400,
  },
];

function createTestApplication(): Application {
  const store = createInMemoryStores();
  store.spaces.push({
    id: LOCAL_SPACE_ID,
    workspaceId: LOCAL_WORKSPACE_ID,
    ownerPrincipalId: LOCAL_PRINCIPAL_ID,
    name: 'default',
    visibility: 'private',
  });
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

function createTestApp(options?: { readonly apiToken?: string }): ReturnType<typeof createHttpApp> {
  return createHttpApp(createTestApplication(), options);
}

function postJson(
  app: ReturnType<typeof createHttpApp>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  });
}

function patchJson(
  app: ReturnType<typeof createHttpApp>,
  path: string,
  body: unknown,
): Promise<Response> {
  return app.request(path, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

function memoriesInclude(memories: readonly { content: string }[], needle: string): boolean {
  for (const memory of memories) {
    if (memory.content.includes(needle)) {
      return true;
    }
  }
  return false;
}

function itemsIncludeId(items: readonly { id: string }[], id: string): boolean {
  for (const item of items) {
    if (item.id === id) {
      return true;
    }
  }
  return false;
}

function factsIncludeObject(facts: readonly { objectText: string }[], objectText: string): boolean {
  for (const fact of facts) {
    if (fact.objectText === objectText) {
      return true;
    }
  }
  return false;
}

function itemsIncludeAction(items: readonly { action: string }[], action: string): boolean {
  for (const item of items) {
    if (item.action === action) {
      return true;
    }
  }
  return false;
}

describe('practical HTTP cases', () => {
  it('corpus is large enough for the dogfood battery', () => {
    expect(REMEMBER_RECALL_CORPUS.length).toBeGreaterThanOrEqual(40);
    expect(LONG_PARAGRAPH.length).toBeGreaterThan(500);
    expect(LONG_PARAGRAPH.length).toBeLessThan(2048);
  });

  describe('health, me, and spaces', () => {
    it.each(GET_OK_CASES)('GET $path returns 200', async ({ path }) => {
      const response = await createTestApp().request(path);
      expect(response.status).toBe(200);
    });

    it('health payload is ok and me is the local principal', async () => {
      const app = createTestApp();
      const health = (await (await app.request('/health')).json()) as { status: string };
      expect(health.status).toBe('ok');
      const me = (await (await app.request('/api/v1/me')).json()) as {
        id: string;
        type: string;
      };
      expect(me.id).toBe(LOCAL_PRINCIPAL_ID);
      expect(me.type).toBe('local');
    });

    it('lists ks_default, creates a space, gets it, patches name, rejects empty name', async () => {
      const app = createTestApp();
      const listed = (await (await app.request('/api/v1/spaces')).json()) as {
        items: { id: string }[];
      };
      expect(itemsIncludeId(listed.items, LOCAL_SPACE_ID)).toBe(true);

      const created = await postJson(app, '/api/v1/spaces', { name: 'notes' });
      expect(created.status).toBe(200);
      const space = (await created.json()) as { id: string; name: string };
      expect(space.name).toBe('notes');

      const fetched = await app.request(`/api/v1/spaces/${space.id}`);
      expect(fetched.status).toBe(200);

      const patched = await patchJson(app, `/api/v1/spaces/${space.id}`, { name: 'renamed' });
      expect(patched.status).toBe(200);
      expect(((await patched.json()) as { name: string }).name).toBe('renamed');

      const emptyCreate = await postJson(app, '/api/v1/spaces', { name: '' });
      expect(emptyCreate.status).toBe(400);
      const emptyPatch = await patchJson(app, `/api/v1/spaces/${space.id}`, { name: '' });
      expect(emptyPatch.status).toBe(400);
    });
  });

  describe('remember/recall corpus', () => {
    it.each(REMEMBER_RECALL_CORPUS)(
      'recalls distinctive token $token',
      async ({ content, token }) => {
        const app = createTestApp();
        const remembered = await postJson(app, MEMORIES_PATH, { content });
        expect(remembered.status).toBe(200);
        const recalled = await postJson(app, RECALL_PATH, { query: token });
        expect(recalled.status).toBe(200);
        const payload = (await recalled.json()) as { memories: { content: string }[] };
        expect(memoriesInclude(payload.memories, token)).toBe(true);
      },
    );
  });

  describe('space isolation', () => {
    it('does not recall Alice from space B after remembering Alice only in space A', async () => {
      const app = createTestApp();
      const spaceA = (await (await postJson(app, '/api/v1/spaces', { name: 'alpha' })).json()) as {
        id: string;
      };
      const spaceB = (await (await postJson(app, '/api/v1/spaces', { name: 'beta' })).json()) as {
        id: string;
      };
      expect(
        (await postJson(app, `/api/v1/spaces/${spaceA.id}/memories`, { content: 'Alice in alpha' }))
          .status,
      ).toBe(200);
      expect(
        (await postJson(app, `/api/v1/spaces/${spaceB.id}/memories`, { content: 'Bob in beta' }))
          .status,
      ).toBe(200);

      const inB = (await (
        await postJson(app, `/api/v1/spaces/${spaceB.id}/recall`, { query: 'Alice' })
      ).json()) as { memories: { content: string }[] };
      expect(memoriesInclude(inB.memories, 'Alice')).toBe(false);
      expect(memoriesInclude(inB.memories, 'Bob')).toBe(false);

      const inA = (await (
        await postJson(app, `/api/v1/spaces/${spaceA.id}/recall`, { query: 'Alice' })
      ).json()) as { memories: { content: string }[] };
      expect(memoriesInclude(inA.memories, 'Alice')).toBe(true);
    });
  });

  describe('forget hide', () => {
    it('hides a remembered episode from GET /memories', async () => {
      const app = createTestApp();
      const remembered = await postJson(app, MEMORIES_PATH, {
        content: 'HideableNote about Zephyrbank',
      });
      expect(remembered.status).toBe(200);
      const { episodeId } = (await remembered.json()) as { episodeId: string };

      const before = (await (await app.request(MEMORIES_PATH)).json()) as {
        items: { id: string; content: string }[];
      };
      expect(memoriesInclude(before.items, 'Zephyrbank')).toBe(true);

      const hidden = await app.request(`${MEMORIES_PATH}/${episodeId}`, { method: 'DELETE' });
      expect(hidden.status).toBe(200);

      const after = (await (await app.request(MEMORIES_PATH)).json()) as {
        items: { content: string }[];
      };
      expect(memoriesInclude(after.items, 'Zephyrbank')).toBe(false);
    });
  });

  describe('empty and invalid', () => {
    it.each(INVALID_CASES)('$name → $status', async ({ path, method, body, status }) => {
      const app = createTestApp();
      const response =
        body === undefined
          ? await app.request(path, { method })
          : await app.request(path, {
              method,
              headers: JSON_HEADERS,
              body: JSON.stringify(body),
            });
      expect(response.status).toBe(status);
    });

    it('rejects SSRF ingest URLs and succeeds markdown ingest', async () => {
      const app = createTestApp();
      const blocked = await postJson(app, INGESTIONS_PATH, { url: 'http://127.0.0.1/secret' });
      expect(blocked.status).toBe(400);
      expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe(
        'INGEST_URL_SSRF',
      );

      const markdown = await postJson(app, INGESTIONS_PATH, { markdown: '# Title\n\nHello' });
      expect(markdown.status).toBe(200);
      expect(((await markdown.json()) as { status: string }).status).toBe('succeeded');
    });
  });

  describe('idempotent ingest', () => {
    it('returns the same runId for a repeated idempotencyKey', async () => {
      const app = createTestApp();
      const first = await postJson(app, INGESTIONS_PATH, {
        markdown: '# Hi',
        idempotencyKey: 'ing-battery-1',
      });
      expect(first.status).toBe(200);
      const firstBody = (await first.json()) as { runId: string };
      const second = await postJson(app, INGESTIONS_PATH, {
        markdown: '# Hi again',
        idempotencyKey: 'ing-battery-1',
      });
      expect(second.status).toBe(200);
      expect(((await second.json()) as { runId: string }).runId).toBe(firstBody.runId);
    });
  });

  describe('openapi', () => {
    it('documents GET and POST on spaces memories', async () => {
      const response = await createTestApp().request('/api/v1/openapi.json');
      expect(response.status).toBe(200);
      const spec = (await response.json()) as {
        paths: Record<string, { get?: unknown; post?: unknown }>;
      };
      const memories = spec.paths['/api/v1/spaces/{spaceId}/memories'];
      expect(memories.get).toBeDefined();
      expect(memories.post).toBeDefined();
    });
  });

  describe('consolidate Alice/Carol', () => {
    it('recalls Tokyo for Where does Alice live? and omits Paris', async () => {
      const app = createTestApp();
      expect(
        (
          await postJson(app, MEMORIES_PATH, {
            content: 'Alice moved to Tokyo in July 2026.',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await postJson(app, MEMORIES_PATH, {
            content: 'Carol moved to Paris in June 2026.',
          })
        ).status,
      ).toBe(200);

      const consolidated = await app.request(`/api/v1/spaces/${LOCAL_SPACE_ID}/consolidate`, {
        method: 'POST',
      });
      expect(consolidated.status).toBe(200);
      expect(((await consolidated.json()) as { factCount: number }).factCount).toBe(2);

      const recalled = await postJson(app, RECALL_PATH, { query: 'Where does Alice live?' });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as { facts: { objectText: string }[] };
      expect(factsIncludeObject(payload.facts, 'Tokyo')).toBe(true);
      expect(factsIncludeObject(payload.facts, 'Paris')).toBe(false);
    });
  });

  describe('decisions', () => {
    it('lists a posted decision', async () => {
      const app = createTestApp();
      const posted = await postJson(app, DECISIONS_PATH, {
        action: 'keep',
        rationale: 'ok',
      });
      expect(posted.status).toBe(200);
      const listed = (await (await app.request(DECISIONS_PATH)).json()) as {
        items: { action: string }[];
      };
      expect(itemsIncludeAction(listed.items, 'keep')).toBe(true);
    });
  });

  describe('workspaces', () => {
    it('returns 200 for GET /workspaces', async () => {
      const response = await createTestApp().request('/api/v1/workspaces');
      expect(response.status).toBe(200);
      const body = (await response.json()) as { items: { id: string }[] };
      expect(itemsIncludeId(body.items, LOCAL_WORKSPACE_ID)).toBe(true);
    });
  });

  describe('mcp', () => {
    it('recalls through POST /mcp tools/call after remember', async () => {
      const app = createTestApp();
      expect(
        (
          await postJson(app, MEMORIES_PATH, {
            content: 'Alice moved to Tokyo in July 2026.',
          })
        ).status,
      ).toBe(200);
      const response = await postJson(app, '/mcp', {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'memory.recall', arguments: { query: 'Alice' } },
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toMatch(/Tokyo/u);
    });
  });

  describe('auth', () => {
    it('requires bearer on /api/v1/me but leaves /health open', async () => {
      const app = createTestApp({ apiToken: 'test-secret-token' });
      expect((await app.request('/api/v1/me')).status).toBe(401);
      expect((await app.request('/health')).status).toBe(200);
      const authorized = await app.request('/api/v1/me', {
        headers: { authorization: 'Bearer test-secret-token' },
      });
      expect(authorized.status).toBe(200);
    });
  });
});
