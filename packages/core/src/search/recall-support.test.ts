import { describe, expect, it } from 'vitest';

import { cosineSimilarity, tokenBudgetTrim } from './recall-support.js';

describe('recall support', () => {
  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [1])).toBe(0);
  });

  it('trims to a token budget and reports omissions', () => {
    const result = tokenBudgetTrim(['abcd', 'efghijkl'], 2);
    expect(result.kept).toEqual(['abcd']);
    expect(result.omitted).toBe(1);
  });
});
