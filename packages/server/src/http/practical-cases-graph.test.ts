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
const ENTITIES_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/entities`;
const CONSOLIDATE_PATH = `/api/v1/spaces/${LOCAL_SPACE_ID}/consolidate`;

const GRAPH_PEOPLE = [
  'Natsume',
  'Yosano',
  'Dazai',
  'Akutagawa',
  'Tanizaki',
  'Kawabata',
  'Mishima',
  'Ogai',
  'Ichiyo',
  'Shiki',
  'Basho',
  'Buson',
  'Issa',
  'Kunikida',
  'Fukuzawa',
  'Nitobe',
] as const;

const GRAPH_PLACES = [
  'Kyoto',
  'Sendai',
  'Nagoya',
  'Sapporo',
  'Yokohama',
  'Kobe',
  'Hiroshima',
  'Okayama',
  'Takamatsu',
  'Matsuyama',
  'Niigata',
  'Toyama',
  'Shizuoka',
  'Kagoshima',
  'Naha',
  'Himeji',
] as const;

const MAP_CODES = [
  'MAP-2201',
  'MAP-3302',
  'MAP-4410',
  'MAP-5521',
  'MAP-6633',
  'MAP-7744',
  'MAP-8855',
  'MAP-9966',
  'NODE-1011',
  'NODE-2022',
  'EDGE-3033',
  'EDGE-4044',
  'REL-5055',
  'REL-6066',
  'TRIP-7077',
  'TRIP-8088',
] as const;

const GRAPH_TERMS = [
  'hyperedgelet',
  'bipartitionX',
  'meronymSet',
  'holonymSet',
  'hyponymTree',
  'reifyNode',
  'bitemporalSlot',
  'walktrapRun',
  'pagerankSeed',
  'betweennessHub',
  'eigenCentrality',
  'modularityQ',
  'cliqueCover',
  'starSpoke',
  'pathCoverK',
  'cycleBasis',
] as const;

const FILE_PATHS = [
  '/opt/kg/natsume-index.ttl',
  '/opt/kg/yosano-atlas.json',
  '/opt/kg/kyoto-gazetteer.ttl',
  '/var/graph/map-2201.json',
  '/var/graph/node-index.ndjson',
  '/etc/kg/ontology-lite.owl',
  '/etc/kg/shapes.shex',
  '/home/cartographer/field-notes.md',
  '/home/cartographer/kyoto-walk.md',
  '/tmp/kg/dump-sendai.nq',
  '/tmp/kg/dump-himeji.trig',
  '/usr/local/kg/bin/materialize.sh',
  '/usr/local/kg/bin/walk-graph.sh',
  '/opt/atlas/layers/rail.geojson',
  '/opt/atlas/layers/temples.geojson',
  '/run/kg/lock-natsume.pid',
] as const;

const TICKET_IDS = [
  'KG-2201',
  'KG-3390',
  'ATLAS-4412',
  'ATLAS-5501',
  'GAZ-6623',
  'GAZ-7734',
  'WALK-88021',
  'WALK-99032',
  'MOTIF-9910',
  'MOTIF-2208',
  'CUT-00077',
  'HUB-3321',
  'SEED-77890',
  'LAYER-6621',
  'GAZETTEER-14',
  'MATERIALIZE-3',
] as const;

const REMEMBER_RECALL_CORPUS: readonly { content: string; token: string }[] = [
  ...GRAPH_PEOPLE.map((token) => ({
    content: `${token} catalogued the gazetteer sheet after dusk.`,
    token,
  })),
  ...GRAPH_PLACES.map((token) => ({
    content: `Field walk recorded landmarks around ${token} at dusk.`,
    token,
  })),
  ...MAP_CODES.map((token) => ({
    content: `Cartographer opened ${token} after the survey closed.`,
    token,
  })),
  ...GRAPH_TERMS.map((token) => ({
    content: `Notebook margin marked ${token} beside the motif.`,
    token,
  })),
  ...FILE_PATHS.map((token) => ({
    content: `Synced atlas fragment from ${token} after dusk.`,
    token,
  })),
  ...TICKET_IDS.map((token) => ({
    content: `Ticket ${token} tracked the gazetteer merge.`,
    token,
  })),
];

const CONSOLIDATE_NOTES = [
  'Natsume moved to Kyoto in July 2026.',
  'Yosano moved to Sendai in June 2026.',
  'Dazai catalogued MAP-2201 on the walk.',
  'Akutagawa indexed /opt/kg/natsume-index.ttl.',
  'Tanizaki noted meronymSet on the sheet.',
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

function factsIncludeObjectText(
  facts: readonly { objectText?: string }[],
  objectText: string,
): boolean {
  for (const fact of facts) {
    if (fact.objectText === objectText) {
      return true;
    }
  }
  return false;
}

function factsHaveSubjectPredicateObject(
  items: readonly { subject?: unknown; predicate?: unknown; object?: unknown }[],
): boolean {
  for (const item of items) {
    if (item.subject === undefined || item.predicate === undefined || item.object === undefined) {
      return false;
    }
  }
  return items.length > 0;
}

function tokensHavePrefix(tokens: readonly string[], prefix: string): boolean {
  for (const token of tokens) {
    if (token.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

describe('practical HTTP cases (graph)', () => {
  it('adds at least 90 distinctive remember/recall rows', () => {
    expect(REMEMBER_RECALL_CORPUS.length).toBeGreaterThanOrEqual(90);
    const tokens = REMEMBER_RECALL_CORPUS.map((row) => row.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).toEqual(expect.arrayContaining(['Natsume', 'Yosano', 'Kyoto', 'MAP-2201']));
    expect(tokensHavePrefix(tokens, 'MAP-')).toBe(true);
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

  describe('consolidate graph', () => {
    it('exposes facts and entities then recalls MAP-2201 honestly', async () => {
      const app = createTestApp();
      for (const content of CONSOLIDATE_NOTES) {
        expect((await postJson(app, MEMORIES_PATH, { content })).status).toBe(200);
      }

      const consolidated = await app.request(CONSOLIDATE_PATH, { method: 'POST' });
      expect(consolidated.status).toBe(200);
      expect(((await consolidated.json()) as { factCount: number }).factCount).toBeGreaterThan(0);

      const factsResponse = await app.request(FACTS_PATH);
      expect(factsResponse.status).toBe(200);
      const factsBody = (await factsResponse.json()) as {
        items: { subject?: unknown; predicate?: unknown; object?: unknown }[];
      };
      expect(factsHaveSubjectPredicateObject(factsBody.items)).toBe(true);

      const entitiesResponse = await app.request(ENTITIES_PATH);
      expect(entitiesResponse.status).toBe(200);
      const entitiesBody = (await entitiesResponse.json()) as { items: unknown[] };
      expect(entitiesBody.items.length).toBeGreaterThan(0);

      const recalled = await postJson(app, RECALL_PATH, { query: 'MAP-2201' });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as {
        memories: { content: string }[];
        facts: { objectText?: string }[];
      };
      expect(memoriesInclude(payload.memories, 'MAP-2201')).toBe(true);
      expect(factsIncludeObjectText(payload.facts, 'Sendai')).toBe(false);

      const where = await postJson(app, RECALL_PATH, { query: 'Where does Natsume live?' });
      expect(where.status).toBe(200);
      const wherePayload = (await where.json()) as { facts: { objectText?: string }[] };
      expect(factsIncludeObjectText(wherePayload.facts, 'Kyoto')).toBe(true);
      expect(factsIncludeObjectText(wherePayload.facts, 'Sendai')).toBe(false);
    });
  });
});
