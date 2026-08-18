import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { findContradictoryPairs } from './contradictions.js';

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

describe('findContradictoryPairs', () => {
  it('pairs overlapping livesIn Tokyo vs Paris', () => {
    const tokyo = asFact({ id: asFactId('fact_tokyo') });
    const paris = asFact({
      id: asFactId('fact_paris'),
      object: { kind: 'text', value: 'Paris' },
    });
    const pairs = findContradictoryPairs([tokyo, paris]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual([tokyo, paris]);
  });

  it('skips retracted facts', () => {
    const tokyo = asFact({
      id: asFactId('fact_tokyo'),
      status: 'retracted',
      retractedAt: parseIsoUtc('2026-08-18T12:00:00.000Z'),
    });
    const paris = asFact({
      id: asFactId('fact_paris'),
      object: { kind: 'text', value: 'Paris' },
    });
    expect(findContradictoryPairs([tokyo, paris])).toEqual([]);
  });

  it('ignores non-overlapping validity windows', () => {
    const tokyo = asFact({
      id: asFactId('fact_tokyo'),
      validFrom: parseIsoUtc('2026-01-01T00:00:00.000Z'),
      validUntil: parseIsoUtc('2026-06-01T00:00:00.000Z'),
    });
    const paris = asFact({
      id: asFactId('fact_paris'),
      object: { kind: 'text', value: 'Paris' },
      validFrom: parseIsoUtc('2026-06-01T00:00:00.000Z'),
    });
    expect(findContradictoryPairs([tokyo, paris])).toEqual([]);
  });

  it('does not pair identical objects or different subjects', () => {
    const tokyoAgain = asFact({ id: asFactId('fact_tokyo_2') });
    const bobParis = asFact({
      id: asFactId('fact_bob'),
      subject: { entityId: asEntityId('ent_bob') },
      object: { kind: 'text', value: 'Paris' },
    });
    expect(findContradictoryPairs([asFact(), tokyoAgain, bobParis])).toEqual([]);
  });
});
