import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { assertFactInvariant, deriveFactStatus, factObjectKey } from './fact.js';

import type { Fact } from './fact.js';

function sample(overrides: Partial<Fact> = {}): Fact {
  return {
    id: asFactId('fact_1'),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    subject: { entityId: asEntityId('ent_alice') },
    predicate: { id: 'livesIn' },
    object: { kind: 'text', value: 'Tokyo' },
    assertedAt: parseIsoUtc('2026-07-02T00:00:00.000Z'),
    status: 'active',
    createdBy: { principalId: asPrincipalId('principal_local-user') },
    ...overrides,
  };
}

describe('fact invariants', () => {
  it('derives retracted from retractedAt', () => {
    const fact = sample({
      retractedAt: parseIsoUtc('2026-08-01T00:00:00.000Z'),
      status: 'retracted',
    });
    expect(deriveFactStatus(fact)).toBe('retracted');
    expect(() => assertFactInvariant(fact)).not.toThrow();
  });

  it('rejects retractedAt without retracted status', () => {
    const fact = sample({
      retractedAt: parseIsoUtc('2026-08-01T00:00:00.000Z'),
      status: 'active',
    });
    expect(() => assertFactInvariant(fact)).toThrow(/retractedAt requires status retracted/u);
  });

  it('allows disputed without retraction', () => {
    const fact = sample({ status: 'disputed' });
    expect(deriveFactStatus(fact)).toBe('disputed');
    expect(() => assertFactInvariant(fact)).not.toThrow();
  });

  it('rejects retracted status without retractedAt and keys objects', () => {
    expect(() => assertFactInvariant(sample({ status: 'retracted' }))).toThrow(
      /requires retractedAt/u,
    );
    expect(deriveFactStatus(sample({ status: 'inferred' }))).toBe('inferred');
    expect(factObjectKey({ kind: 'entity', entity: { entityId: asEntityId('ent_x') } })).toBe(
      'entity:ent_x',
    );
    expect(
      factObjectKey({ kind: 'timestamp', value: parseIsoUtc('2026-08-01T00:00:00.000Z') }),
    ).toMatch(/^timestamp:/u);
    expect(factObjectKey({ kind: 'boolean', value: true })).toBe('boolean:true');
    expect(factObjectKey({ kind: 'number', value: 3 })).toBe('number:3');
    expect(factObjectKey({ kind: 'text', value: 'Tokyo' })).toBe('text:Tokyo');
  });
});
