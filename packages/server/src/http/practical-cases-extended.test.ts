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

const PEOPLE = [
  'Thales',
  'Hypatia',
  'Avicenna',
  'Averroes',
  'Ptolemy',
  'Eratosthenes',
  'Anaximander',
  'Empedocles',
  'Diophantus',
  'Brahmagupta',
  'Aryabhata',
  'Alhazen',
  'Fibonacci',
  'Ramanujan',
  'Noether',
  'Lovelace',
  'Babbage',
  'Mandelbrot',
  'Sierpinski',
  'AlKindi',
  'Sosigenes',
  'Callippus',
  'Hipparchus',
  'Aristarchus',
  'Theano',
] as const;

const PLACES = [
  'Córdoba',
  '大阪',
  '福岡',
  '鎌倉',
  '青森',
  '金沢',
  '長崎',
  'Samarkand',
  'Palmyra',
  'Carthage',
  'Nineveh',
  'Cusco',
  'Tikal',
  'Angkor',
  'Dubrovnik',
  'Ljubljana',
  'Tallinn',
  'Bergen',
  'Bruges',
  'Mostar',
] as const;

const EMOJI_ADJACENT_ASCII = [
  'rocketship',
  'sparkles',
  'fireworks',
  'sunflower',
  'penguin',
  'cactus',
  'umbrella',
  'tornado',
  'volcano',
  'honeycomb',
  'starfish',
  'jellyfish',
  'ladybug',
  'dragonfly',
  'snowman',
  'rainbow',
  'satellite',
  'telescope',
  'mushroom',
  'firecracker',
] as const;

const HYPHENATED_CODES = [
  'THL-8842',
  'HYP-1103',
  'CRD-77A',
  'OSK-2026',
  'NBL-4419',
  'QRX-9001',
  'ZED-4400',
  'KAN-3311',
  'FUK-2208',
  'PET-5566',
  'TIK-7788',
  'SAM-9900',
  'BRG-1122',
  'MST-3344',
  'NNV-6677',
  'CUS-8899',
  'GLYPH-42X',
  'ORRERY-9',
] as const;

const REMEMBER_RECALL_CORPUS: readonly { content: string; token: string }[] = [
  ...PEOPLE.map((token) => ({ content: `${token} annotated the celestial ledger.`, token })),
  ...PLACES.map((token) => ({ content: `Survey camp reported from ${token} at dusk.`, token })),
  ...EMOJI_ADJACENT_ASCII.map((token) => ({
    content: `Stencil label rocket-adjacent token ${token} on the crate.`,
    token,
  })),
  ...HYPHENATED_CODES.map((token) => ({
    content: `Routing slip printed hyphenated code ${token} twice.`,
    token,
  })),
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

function createTestApp(): ReturnType<typeof createHttpApp> {
  return createHttpApp(createTestApplication());
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

function memoriesInclude(memories: readonly { content: string }[], needle: string): boolean {
  for (const memory of memories) {
    if (memory.content.includes(needle)) {
      return true;
    }
  }
  return false;
}

describe('practical HTTP cases (extended)', () => {
  it('adds at least 80 distinctive remember/recall rows', () => {
    expect(REMEMBER_RECALL_CORPUS.length).toBeGreaterThanOrEqual(80);
    const tokens = REMEMBER_RECALL_CORPUS.map((row) => row.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).toEqual(
      expect.arrayContaining(['Thales', 'Hypatia', 'Córdoba', '大阪', 'rocketship']),
    );
    expect(tokens.some((token) => token.includes('-'))).toBe(true);
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

  describe('empty-query recall', () => {
    it('returns all three memories after three remembers', async () => {
      const app = createTestApp();
      const contents = [
        'Thales taught geometry beside MiletusHarbor.',
        'Hypatia edited the AlmagestNotes overnight.',
        'Córdoba kept the AstrolabeVault inventory.',
      ] as const;
      for (const content of contents) {
        expect((await postJson(app, MEMORIES_PATH, { content })).status).toBe(200);
      }

      const recalled = await postJson(app, RECALL_PATH, { query: '' });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as { memories: { content: string }[] };
      expect(payload.memories).toHaveLength(3);
      for (const content of contents) {
        expect(memoriesInclude(payload.memories, content)).toBe(true);
      }
    });
  });

  describe('forget hide then empty recall', () => {
    it('omits a hidden episode from empty-query recall', async () => {
      const app = createTestApp();
      const remembered = await postJson(app, MEMORIES_PATH, {
        content: 'HideableNexus about CordobanVault',
      });
      expect(remembered.status).toBe(200);
      const { episodeId } = (await remembered.json()) as { episodeId: string };

      const hidden = await app.request(`${MEMORIES_PATH}/${episodeId}`, { method: 'DELETE' });
      expect(hidden.status).toBe(200);

      const recalled = await postJson(app, RECALL_PATH, { query: '' });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as { memories: { content: string }[] };
      expect(payload.memories).toHaveLength(0);
      expect(memoriesInclude(payload.memories, 'CordobanVault')).toBe(false);
    });
  });

  describe('space isolation with unicode names', () => {
    it('does not recall across spaces named アレクサンドリア and バグダード', async () => {
      const app = createTestApp();
      const spaceA = (await (
        await postJson(app, '/api/v1/spaces', { name: 'アレクサンドリア' })
      ).json()) as { id: string };
      const spaceB = (await (
        await postJson(app, '/api/v1/spaces', { name: 'バグダード' })
      ).json()) as { id: string };

      expect(
        (
          await postJson(app, `/api/v1/spaces/${spaceA.id}/memories`, {
            content: 'Thales lectured beside the PharosBeacon',
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await postJson(app, `/api/v1/spaces/${spaceB.id}/memories`, {
            content: 'Hypatia catalogued the HouseOfWisdom',
          })
        ).status,
      ).toBe(200);

      const inB = (await (
        await postJson(app, `/api/v1/spaces/${spaceB.id}/recall`, { query: 'PharosBeacon' })
      ).json()) as { memories: { content: string }[] };
      expect(memoriesInclude(inB.memories, 'PharosBeacon')).toBe(false);
      expect(memoriesInclude(inB.memories, 'HouseOfWisdom')).toBe(false);

      const inA = (await (
        await postJson(app, `/api/v1/spaces/${spaceA.id}/recall`, { query: 'PharosBeacon' })
      ).json()) as { memories: { content: string }[] };
      expect(memoriesInclude(inA.memories, 'PharosBeacon')).toBe(true);
      expect(memoriesInclude(inA.memories, 'HouseOfWisdom')).toBe(false);
    });
  });

  describe('markdown ingest', () => {
    it('stores UniqueZircon from the body token after ingest', async () => {
      const app = createTestApp();
      const markdown = await postJson(app, INGESTIONS_PATH, {
        markdown: '# Title\n\nBody token UniqueZircon',
      });
      expect(markdown.status).toBe(200);
      expect(((await markdown.json()) as { status: string }).status).toBe('succeeded');

      const listed = (await (await app.request(MEMORIES_PATH)).json()) as {
        items: { content: string }[];
      };
      expect(memoriesInclude(listed.items, 'UniqueZircon')).toBe(true);
      expect(memoriesInclude(listed.items, 'Body token')).toBe(true);
      expect(listed.items.length === 1 && listed.items[0]?.content === '# Title').toBe(false);
    });
  });
});
