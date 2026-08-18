import { describe, expect, it } from 'vitest';

import { asDecisionId, asKnowledgeSpaceId, asWorkspaceId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';

import { createDecision } from './decision.js';

import type { DecisionRecord } from './decision.js';

function sample(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  const workspaceId = asWorkspaceId('ws_personal');
  const knowledgeSpaceId = asKnowledgeSpaceId('ks_default');
  const capturedAt = parseIsoUtc('2026-08-18T00:00:00.000Z');
  return {
    id: asDecisionId('dec_1'),
    workspaceId,
    knowledgeSpaceId,
    action: 'keep',
    rationale: 'still true',
    snapshot: {
      workspaceId,
      knowledgeSpaceId,
      episodeIds: ['ep_1'],
      factIds: ['fact_1'],
      capturedAt,
    },
    createdAt: capturedAt,
    status: 'proposed',
    ...overrides,
  };
}

describe('createDecision', () => {
  it('returns the decision record when action is present', () => {
    const input = sample({ status: 'approved' });
    expect(createDecision(input)).toBe(input);
    expect(createDecision(input).action).toBe('keep');
  });

  it('rejects an empty action', () => {
    expect(() => createDecision(sample({ action: '' }))).toThrow(/decision action required/u);
  });

  it('rejects a whitespace-only action', () => {
    expect(() => createDecision(sample({ action: '   ' }))).toThrow(/decision action required/u);
  });
});
