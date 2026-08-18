import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { exportFactsJsonLd } from './rdf-export.js';

import type { Fact } from './fact.js';

function asFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: asFactId('fact_1'),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    subject: { entityId: asEntityId('ent_alice') },
    predicate: { id: 'livesIn' },
    object: { kind: 'text', value: 'Tokyo' },
    assertedAt: parseIsoUtc('2026-08-18T00:00:00.000Z'),
    status: 'active',
    createdBy: { principalId: asPrincipalId('principal_local-user') },
    ...overrides,
  };
}

describe('exportFactsJsonLd', () => {
  it('wraps facts in a versioned JSON-LD graph', () => {
    const document = exportFactsJsonLd([asFact()]);
    expect(document['@context']).toEqual({
      schemaVersion: '1',
      subject: 'https://brainledge.dev/subject',
      predicate: 'https://brainledge.dev/predicate',
      object: 'https://brainledge.dev/object',
    });
    expect(document['@graph']).toEqual([
      {
        '@id': 'fact_1',
        subject: 'ent_alice',
        predicate: 'livesIn',
        object: 'text:Tokyo',
        assertedAt: '2026-08-18T00:00:00.000Z',
        retractedAt: null,
      },
    ]);
  });

  it('exports retractedAt when set and keys entity objects', () => {
    const retracted = asFact({
      id: asFactId('fact_retracted'),
      object: { kind: 'entity', entity: { entityId: asEntityId('ent_tokyo') } },
      status: 'retracted',
      retractedAt: parseIsoUtc('2026-08-19T00:00:00.000Z'),
    });
    const graph = exportFactsJsonLd([retracted])['@graph'] as readonly Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      '@id': 'fact_retracted',
      object: 'entity:ent_tokyo',
      retractedAt: '2026-08-19T00:00:00.000Z',
    });
  });

  it('exports an empty graph for no facts', () => {
    expect(exportFactsJsonLd([])['@graph']).toEqual([]);
  });
});
