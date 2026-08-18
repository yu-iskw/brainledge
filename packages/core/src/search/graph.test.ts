import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { documentedCosineLimits, exactVectorSearch, graphNeighbors, graphPath } from './graph.js';

import type { Fact } from '../knowledge/fact.js';

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

describe('graphNeighbors', () => {
  it('returns outgoing edges and skips retracted facts', () => {
    const facts: Fact[] = [
      asFact(),
      asFact({
        id: asFactId('fact_entity'),
        predicate: { id: 'knows' },
        object: { kind: 'entity', entity: { entityId: asEntityId('ent_carol') } },
      }),
      asFact({
        id: asFactId('fact_old'),
        object: { kind: 'text', value: 'Paris' },
        status: 'retracted',
        retractedAt: parseIsoUtc('2026-08-19T00:00:00.000Z'),
      }),
    ];
    expect(graphNeighbors(facts, 'ent_alice')).toEqual([
      { from: 'ent_alice', predicate: 'livesIn', to: 'Tokyo' },
      { from: 'ent_alice', predicate: 'knows', to: 'ent_carol' },
    ]);
    expect(graphNeighbors(facts, 'ent_missing')).toEqual([]);
  });
});

describe('graphPath', () => {
  it('walks a multi-hop path and reports missing targets', () => {
    const facts: Fact[] = [
      asFact(),
      asFact({
        id: asFactId('fact_capital'),
        subject: { entityId: asEntityId('Tokyo') },
        predicate: { id: 'capitalOf' },
        object: { kind: 'text', value: 'Japan' },
      }),
    ];
    expect(graphPath(facts, 'ent_alice', 'Japan')).toEqual(['ent_alice', 'Tokyo', 'Japan']);
    expect(graphPath(facts, 'ent_alice', 'Paris')).toBeUndefined();
    expect(graphPath(facts, 'ent_alice', 'Japan', 1)).toBeUndefined();
  });
});

describe('exactVectorSearch', () => {
  it('ranks by cosine similarity and respects limit', () => {
    const hits = exactVectorSearch(
      [1, 0],
      [
        { id: 'b', vector: [0, 1] },
        { id: 'a', vector: [1, 0] },
        { id: 'c', vector: [0.6, 0.8] },
      ],
      2,
    );
    expect(hits.map((hit) => hit.id)).toEqual(['a', 'c']);
    expect(hits[0]?.score).toBe(1);
  });
});

describe('documentedCosineLimits', () => {
  it('returns the documented soft and hard scale limits', () => {
    expect(documentedCosineLimits()).toEqual({ soft: 10_000, hard: 100_000 });
  });
});
