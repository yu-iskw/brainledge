import { describe, expect, it } from 'vitest';

import { buildContext } from './context-builder.js';

import type { RecallResult } from '../memory/types.js';

function recall(overrides: Partial<RecallResult> = {}): RecallResult {
  return {
    memories: [],
    facts: [],
    entities: [],
    priorDecisions: [],
    policies: [],
    provenanceSummary: [],
    ...overrides,
  };
}

describe('buildContext', () => {
  it('joins memory contents and ignores unused RecallResult lanes', () => {
    const result = recall({
      memories: [
        {
          episodeId: 'ep_1',
          content: 'hello world',
          score: 1,
          observedAt: '2026-08-18T00:00:00.000Z',
        },
        {
          episodeId: 'ep_2',
          content: 'second note',
          score: 0.5,
          observedAt: '2026-08-18T00:00:00.000Z',
        },
      ],
      facts: [
        {
          factId: 'fact_1',
          summary: 'Alice lives in Tokyo',
          subjectId: 'ent_alice',
          predicateId: 'livesIn',
          objectText: 'Tokyo',
        },
      ],
      entities: [{ entityId: 'ent_alice', canonicalName: 'Alice' }],
      priorDecisions: [{ decisionId: 'dec_1', action: 'keep' }],
      policies: [{ id: 'pol_1', description: 'retain 30 days' }],
      provenanceSummary: [{ episodeId: 'ep_1', relation: 'asserted' }],
    });
    expect(buildContext(result, 100)).toEqual({
      text: 'hello world\n---\nsecond note',
      omitted: 0,
    });
  });

  it('omits memories that exceed the token budget', () => {
    const result = recall({
      memories: [
        { episodeId: 'ep_1', content: 'abcd', score: 1, observedAt: '2026-08-18T00:00:00.000Z' },
        {
          episodeId: 'ep_2',
          content: 'efghijkl',
          score: 0.9,
          observedAt: '2026-08-18T00:00:00.000Z',
        },
      ],
    });
    expect(buildContext(result, 2)).toEqual({ text: 'abcd', omitted: 1 });
  });

  it('returns empty text when there are no memories', () => {
    expect(buildContext(recall(), 10)).toEqual({ text: '', omitted: 0 });
  });
});
