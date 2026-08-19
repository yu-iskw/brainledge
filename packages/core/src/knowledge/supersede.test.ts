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
import { supersedeFact } from './supersede.js';

import type { Fact } from './fact.js';

function fact(object: string, extra?: Partial<Fact>): Fact {
  return {
    id: asFactId(`fact_${object}`),
    workspaceId: asWorkspaceId('ws_personal'),
    knowledgeSpaceId: asKnowledgeSpaceId('ks_default'),
    subject: { entityId: asEntityId('ent_alice') },
    predicate: { id: 'livesIn' },
    object: { kind: 'text', value: object },
    assertedAt: parseIsoUtc('2026-07-01T00:00:00.000Z'),
    status: 'active',
    createdBy: { principalId: asPrincipalId('principal_local-user') },
    ...extra,
  };
}

describe('temporal facts', () => {
  it('supersedes without deleting history', () => {
    const closed = supersedeFact(
      fact('Tokyo'),
      fact('Osaka', { id: asFactId('fact_osaka') }),
      parseIsoUtc('2026-08-01T00:00:00.000Z'),
    );
    expect(closed.previous.status).toBe('retracted');
    expect(closed.previous.retractedAt).toBeDefined();
    expect(closed.next.object).toEqual({ kind: 'text', value: 'Osaka' });
    expect(
      supersedeFact(
        fact('Tokyo'),
        fact('Tokyo', { id: asFactId('fact_dup') }),
        parseIsoUtc('2026-08-01T00:00:00.000Z'),
      ).previous.status,
    ).toBe('active');
    expect(() =>
      supersedeFact(
        fact('Tokyo'),
        { ...fact('Osaka'), subject: { entityId: asEntityId('ent_bob') } },
        parseIsoUtc('2026-08-01T00:00:00.000Z'),
      ),
    ).toThrow(/same subject/u);
    expect(() =>
      supersedeFact(
        fact('Tokyo'),
        { ...fact('Osaka'), predicate: { id: 'worksAt' } },
        parseIsoUtc('2026-08-01T00:00:00.000Z'),
      ),
    ).toThrow(/same predicate/u);
  });

  it('detects overlapping contradictory claims', () => {
    const pairs = findContradictoryPairs([
      fact('Tokyo'),
      fact('Osaka', { id: asFactId('fact_osaka') }),
    ]);
    expect(pairs).toHaveLength(1);
  });
});
