import { describe, expect, it } from 'vitest';

import {
  asEntityId,
  asEpisodeId,
  asFactId,
  asKnowledgeSpaceId,
  asPrincipalId,
  asWorkspaceId,
} from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { formatFactObject, toFactHit } from './fact-hit.js';

import type { Fact } from '../knowledge/fact.js';

function sampleFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: asFactId('fact_1'),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    subject: { entityId: asEntityId('ent_alice') },
    predicate: { id: 'livesIn' },
    object: { kind: 'text', value: 'Tokyo' },
    assertedAt: parseIsoUtc('2026-07-02T00:00:00.000Z'),
    validFrom: parseIsoUtc('2026-07-01T00:00:00.000Z'),
    validUntil: parseIsoUtc('2026-12-31T00:00:00.000Z'),
    status: 'active',
    createdBy: { principalId: asPrincipalId('principal_local-user') },
    sourceEpisodeId: asEpisodeId('ep_1'),
    ...overrides,
  };
}

describe('formatFactObject', () => {
  it('renders each fact object kind as human text', () => {
    expect(
      formatFactObject({ kind: 'entity', entity: { entityId: asEntityId('ent_tokyo') } }),
    ).toBe('ent_tokyo');
    expect(formatFactObject({ kind: 'text', value: 'Tokyo' })).toBe('Tokyo');
    expect(formatFactObject({ kind: 'number', value: 42 })).toBe('42');
    expect(formatFactObject({ kind: 'boolean', value: true })).toBe('true');
    expect(
      formatFactObject({ kind: 'timestamp', value: parseIsoUtc('2026-07-02T00:00:00.000Z') }),
    ).toBe('2026-07-02T00:00:00.000Z');
  });
});

describe('toFactHit', () => {
  it('includes the object in the summary and copies optional validity fields', () => {
    expect(toFactHit(sampleFact())).toEqual({
      factId: 'fact_1',
      summary: 'ent_alice livesIn Tokyo',
      subjectId: 'ent_alice',
      predicateId: 'livesIn',
      objectText: 'Tokyo',
      validFrom: '2026-07-01T00:00:00.000Z',
      validUntil: '2026-12-31T00:00:00.000Z',
      sourceEpisodeId: 'ep_1',
    });
  });
});
