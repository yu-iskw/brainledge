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
const FACTS_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/facts`;
const CONSOLIDATE_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/consolidate`;

const LIVES_NAMES = [
  'Selma',
  'Ingrid',
  'Freya',
  'Astrid',
  'Sigrid',
  'Helga',
  'Runar',
  'Leif',
  'Maja',
  'Linnea',
  'Tove',
  'Karin',
  'Stig',
  'Olaf',
  'Edith',
  'Greta',
  'Vilma',
  'Anja',
  'Soren',
  'Bjorn',
] as const;

const LIVES_CITIES = [
  'Lisbon',
  'Prague',
  'Vienna',
  'Munich',
  'Zurich',
  'Geneva',
  'Seville',
  'Naples',
  'Turin',
  'Gdansk',
  'Krakow',
  'Vilnius',
  'Riga',
  'Minsk',
  'Lviv',
  'Odessa',
  'Tbilisi',
  'Yerevan',
  'Baku',
  'Sofia',
] as const;

const CITY_ROW_NAMES = [
  'Hanna',
  'Petra',
  'Klara',
  'Nora',
  'Frida',
  'Elsa',
  'Alma',
  'Vera',
  'Ida',
  'Svea',
  'Ebba',
  'Thea',
  'Saga',
  'Tuva',
  'Moa',
  'Ella',
  'Agnes',
  'Rut',
  'Siv',
  'Liv',
] as const;

const WORKS_NAMES = [
  'Marlow',
  'Elowen',
  'Isolde',
  'Percival',
  'Rowena',
  'Tristan',
  'Cedric',
  'Imogen',
  'Lysander',
  'Ophelia',
  'Horatio',
  'Portia',
  'Benedick',
  'Rosalind',
  'Orlando',
  'Viola',
  'Cesario',
  'Malvolio',
  'Olivia',
  'Bassanio',
] as const;

const WORKS_PLACES = [
  'cafe',
  'hospital',
  'library',
  'bakery',
  'museum',
  'theater',
  'studio',
  'atelier',
  'foundry',
  'mill',
  'observatory',
  'archive',
  'gallery',
  'distillery',
  'vineyard',
  'orchard',
  'shipyard',
  'boatyard',
  'greenhouse',
  'workshop',
] as const;

const TAUGHT_NAMES = [
  'Euclid',
  'Gauss',
  'Euler',
  'Cauchy',
  'Fourier',
  'Laplace',
  'Poisson',
  'Dirichlet',
  'Riemann',
  'Hilbert',
  'Banach',
  'Cantor',
  'Dedekind',
  'Kolmogorov',
  'Markov',
  'Chebyshev',
  'Lyapunov',
  'Poincare',
  'Cartan',
  'Hadamard',
] as const;

const TAUGHT_TOPICS = [
  'algebra',
  'optics',
  'rhetoric',
  'logic',
  'ethics',
  'poetics',
  'harmony',
  'anatomy',
  'botany',
  'geology',
  'astronomy',
  'chemistry',
  'physics',
  'history',
  'law',
  'medicine',
  'music',
  'sculpture',
  'painting',
  'cartography',
] as const;

const TAUGHT_CITIES = [
  'Rhodes',
  'Delphi',
  'Thebes',
  'Sparta',
  'Corinth',
  'Ephesus',
  'Pergamon',
  'Syracuse',
  'Croton',
  'Elea',
  'Abdera',
  'Cnidus',
  'Samos',
  'Chios',
  'Lesbos',
  'Delos',
  'Naxos',
  'Paros',
  'Aegina',
  'Knidos',
] as const;

const C8_CODES = [
  'C8-77011',
  'C8-77022',
  'C8-77033',
  'C8-77044',
  'C8-77055',
  'C8-77066',
  'C8-77077',
  'C8-77088',
  'C8-77099',
  'C8-77110',
] as const;

const CYCLE8_TICKETS = [
  'CYCLE8-44101',
  'CYCLE8-44112',
  'CYCLE8-55203',
  'CYCLE8-55214',
  'CYCLE8-66305',
  'CYCLE8-66316',
  'CYCLE8-77407',
  'CYCLE8-77418',
  'CYCLE8-88509',
  'CYCLE8-88520',
] as const;

const FILE_PATHS = [
  '/opt/c8/selma-ledger.ttl',
  '/opt/c8/cycle8-atlas.json',
  '/var/cycle8/dump-lisbon.nq',
  '/etc/c8/ontology-cycle8.owl',
  '/home/cycle8/field-notes.md',
  '/tmp/c8/dump-prague.trig',
  '/usr/local/c8/bin/materialize.sh',
  '/opt/cycle8/layers/harbor.geojson',
  '/run/c8/lock-cycle8.pid',
  '/opt/c8/shapes-cycle8.shex',
] as const;

const UNICODE_MARKS = [
  '函館',
  '旭川',
  '釧路',
  '弘前',
  '酒田',
  '敦賀',
  '尾道',
  '別府',
  '石垣',
  '種子島',
] as const;

const REMEMBER_RECALL_CORPUS: readonly { content: string; token: string }[] = [
  ...LIVES_NAMES.map((token, index) => ({
    content: `${token} lives in ${LIVES_CITIES[index]}.`,
    token,
  })),
  ...LIVES_CITIES.map((token, index) => ({
    content: `${CITY_ROW_NAMES[index]} lives in ${token}.`,
    token,
  })),
  ...WORKS_NAMES.map((token, index) => ({
    content: `${token} works at the ${WORKS_PLACES[index]}.`,
    token,
  })),
  ...TAUGHT_NAMES.map((token, index) => ({
    content: `${token} taught ${TAUGHT_TOPICS[index]} in ${TAUGHT_CITIES[index]}.`,
    token,
  })),
  ...C8_CODES.map((token) => ({
    content: `Cycle8 cartographer opened ${token} after the survey closed.`,
    token,
  })),
  ...CYCLE8_TICKETS.map((token) => ({
    content: `Ticket ${token} tracked the cycle8 gazetteer merge.`,
    token,
  })),
  ...FILE_PATHS.map((token) => ({
    content: `Synced cycle8 fragment from ${token} after dusk.`,
    token,
  })),
  ...UNICODE_MARKS.map((token) => ({
    content: `Cycle8 survey camp reported from ${token} after dusk.`,
    token,
  })),
];

const CONSOLIDATE_NOTES = [
  'Dana works at the cafe.',
  'Yosano works at the hospital.',
  'Thales taught geometry in Miletus.',
  'Hypatia taught philosophy in Alexandria.',
  'Alice moved to Tokyo in July 2026.',
] as const;

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

function tokensHavePrefix(tokens: readonly string[], prefix: string): boolean {
  for (const token of tokens) {
    if (token.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

describe('practical HTTP cases (cycle 8)', () => {
  it('adds at least 120 distinctive remember/recall rows', () => {
    expect(REMEMBER_RECALL_CORPUS.length).toBeGreaterThanOrEqual(120);
    const tokens = REMEMBER_RECALL_CORPUS.map((row) => row.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).toEqual(
      expect.arrayContaining(['Selma', 'Lisbon', 'Marlow', 'Euclid', 'C8-77011', '函館']),
    );
    expect(tokensHavePrefix(tokens, 'C8-')).toBe(true);
    expect(tokensHavePrefix(tokens, 'CYCLE8-')).toBe(true);
    expect(tokensHavePrefix(tokens, '/')).toBe(true);
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

  describe('consolidate cycle 8', () => {
    it('extracts at least five facts then recalls Dana and Miletus notes', async () => {
      const app = createTestApp();
      for (const content of CONSOLIDATE_NOTES) {
        expect((await postJson(app, MEMORIES_PATH, { content })).status).toBe(200);
      }

      const consolidated = await app.request(CONSOLIDATE_PATH, { method: 'POST' });
      expect(consolidated.status).toBe(200);
      expect(
        ((await consolidated.json()) as { factCount: number }).factCount,
      ).toBeGreaterThanOrEqual(5);

      const factsResponse = await app.request(FACTS_PATH);
      expect(factsResponse.status).toBe(200);
      const factsBody = (await factsResponse.json()) as { items: unknown[] };
      expect(factsBody.items.length).toBeGreaterThanOrEqual(5);

      const where = await postJson(app, RECALL_PATH, { query: 'Where does Dana work?' });
      expect(where.status).toBe(200);
      const wherePayload = (await where.json()) as { memories: { content: string }[] };
      expect(memoriesInclude(wherePayload.memories, 'Dana')).toBe(true);

      const miletus = await postJson(app, RECALL_PATH, { query: 'Miletus' });
      expect(miletus.status).toBe(200);
      const miletusPayload = (await miletus.json()) as { memories: { content: string }[] };
      expect(memoriesInclude(miletusPayload.memories, 'Thales')).toBe(true);
    });
  });
});
