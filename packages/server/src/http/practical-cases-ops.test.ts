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

const INCIDENT_CODES = [
  'INC-1042',
  'INC-2187',
  'INC-3309',
  'INC-4511',
  'INC-5620',
  'INC-6734',
  'INC-7845',
  'INC-8901',
  'CHG-2044',
  'CHG-3390',
  'CHG-5588',
  'CHG-6701',
  'SIR-9012',
  'SIR-1120',
  'PIR-3344',
  'RCA-7781',
] as const;

const SERVICE_NAMES = [
  'payments-api',
  'billing-worker',
  'checkout-gateway',
  'ledger-sync',
  'fraud-scorer',
  'authz-sidecar',
  'kafka-bridge',
  'redis-sentinel',
  'vault-unsealer',
  'otel-collector',
  'grafana-alloy',
  'tempo-query',
  'loki-ingester',
  'nomad-alloc',
  'consul-connect',
  'envoy-mesh',
] as const;

const OPS_CITIES = [
  'Reykjavík',
  'Tromsø',
  'Ålesund',
  'Nuuk',
  'Tórshavn',
  'Kiruna',
  'Rovaniemi',
  'Svalbard',
  'Akureyri',
  'Ísafjörður',
  'Longyearbyen',
  'Qaqortoq',
  'Ilulissat',
  'Bodø',
  'Narvik',
  'Hammerfest',
] as const;

const OPS_PEOPLE = [
  'Nansen',
  'Amundsen',
  'Shackleton',
  'Mawson',
  'Rasmussen',
  'Barentsz',
  'Bellingshausen',
  'Nordenskiold',
  'Heyerdahl',
  'Parry',
  'Weddell',
  'Scoresby',
  'Charcot',
  'Nobile',
  'Andrée',
  'Sverdrup',
] as const;

const FILE_PATHS = [
  '/opt/runbooks/payments-failover.md',
  '/opt/runbooks/ledger-drain.md',
  '/etc/ops/pagerduty.yaml',
  '/etc/ops/oncall-rotation.yaml',
  '/var/log/checkout-gateway/error.log',
  '/var/log/vault-unsealer/audit.log',
  '/usr/local/ops/bin/page-ack.sh',
  '/usr/local/ops/bin/freeze-deploys.sh',
  '/home/oncall/warroom-notes.md',
  '/home/oncall/postmortem-draft.md',
  '/run/nomad/alloc/failover.json',
  '/run/consul/checks/payments.hcl',
  '/tmp/ops/heapdump-ledger.hprof',
  '/tmp/ops/tcpdump-mesh.pcap',
  '/opt/grafana/dashboards/slo-burn.json',
  '/opt/prometheus/rules/pager-sev1.yml',
] as const;

const TICKET_IDS = [
  'OPS-4412',
  'OPS-5501',
  'OPS-6623',
  'OPS-7734',
  'PD-88021',
  'PD-99032',
  'JSM-9910',
  'JSM-2208',
  'SNOW-INC00077',
  'HELP-3321',
  'TKT-77890',
  'ALRT-6621',
  'ONCALL-140',
  'WARROOM-31',
  'POSTMORTEM-9',
  'SLO-BURN-4',
] as const;

const REMEMBER_RECALL_CORPUS: readonly { content: string; token: string }[] = [
  ...INCIDENT_CODES.map((token) => ({
    content: `Oncall runbook opened for ${token} after the pager fired.`,
    token,
  })),
  ...SERVICE_NAMES.map((token) => ({
    content: `SLO burn started on ${token} after the canary rolled forward.`,
    token,
  })),
  ...OPS_CITIES.map((token) => ({
    content: `Failover traffic shifted toward the ${token} edge POP.`,
    token,
  })),
  ...OPS_PEOPLE.map((token) => ({
    content: `${token} acknowledged the sev1 page and staffed the war room.`,
    token,
  })),
  ...FILE_PATHS.map((token) => ({
    content: `Synced playbook from ${token} after the page.`,
    token,
  })),
  ...TICKET_IDS.map((token) => ({
    content: `Ticket ${token} tracked the drain and rollback.`,
    token,
  })),
];

const CONCURRENT_NOTES = [
  'Nansen ack page-ack for INC-1042 on payments-api.',
  'Amundsen drained checkout-gateway before CHG-2044.',
  'Shackleton copied /opt/runbooks/payments-failover.md.',
  'Mawson triaged OPS-4412 in the Tromsø war room.',
  'Rasmussen froze deploys via freeze-deploys.sh.',
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

describe('practical HTTP cases (ops)', () => {
  it('adds at least 80 distinctive remember/recall rows', () => {
    expect(REMEMBER_RECALL_CORPUS.length).toBeGreaterThanOrEqual(80);
    const tokens = REMEMBER_RECALL_CORPUS.map((row) => row.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).toEqual(
      expect.arrayContaining(['INC-1042', 'payments-api', 'Reykjavík', 'Nansen']),
    );
    expect(tokens.some((token) => token.startsWith('/'))).toBe(true);
    expect(tokens.some((token) => token.startsWith('OPS-'))).toBe(true);
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

  describe('concurrent remember', () => {
    it('recalls one token after five concurrent remembers', async () => {
      const app = createTestApp();
      const tasks: Promise<Response>[] = [];
      for (const content of CONCURRENT_NOTES) {
        tasks.push(postJson(app, MEMORIES_PATH, { content }));
      }
      const responses = await Promise.all(tasks);
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      const recalled = await postJson(app, RECALL_PATH, { query: 'INC-1042' });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as { memories: { content: string }[] };
      expect(memoriesInclude(payload.memories, 'INC-1042')).toBe(true);
      expect(memoriesInclude(payload.memories, 'CHG-2044')).toBe(false);
    });
  });

  describe('recall limit', () => {
    it('returns one memory when limit is 1', async () => {
      const app = createTestApp();
      const contents = [
        'Nansen staffed warroom-bridge for payments-api.',
        'Amundsen closed warroom-bridge after CHG-2044.',
        'Shackleton logged warroom-bridge timeline.',
      ] as const;
      for (const content of contents) {
        expect((await postJson(app, MEMORIES_PATH, { content })).status).toBe(200);
      }

      const recalled = await postJson(app, RECALL_PATH, { query: 'warroom-bridge', limit: 1 });
      expect(recalled.status).toBe(200);
      const payload = (await recalled.json()) as { memories: { content: string }[] };
      expect(payload.memories).toHaveLength(1);
      expect(payload.memories[0]?.content.includes('warroom-bridge')).toBe(true);
    });
  });

  describe('unknown space', () => {
    it('returns 404 for a missing space id', async () => {
      const response = await createTestApp().request('/api/v1/spaces/ks_missing');
      expect(response.status).toBe(404);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
    });
  });

  describe('empty markdown ingest', () => {
    it('rejects empty markdown with a 4xx instead of 5xx', async () => {
      const app = createTestApp();
      const empty = await postJson(app, INGESTIONS_PATH, { markdown: '' });
      expect(empty.status).toBeGreaterThanOrEqual(400);
      expect(empty.status).toBeLessThan(500);
    });
  });
});
