import { describe, expect, it } from 'vitest';

import { createIdentityReranker } from './rerank.js';

describe('createIdentityReranker', () => {
  it('returns ids in the original order', () => {
    expect(createIdentityReranker().rerank(['b', 'a', 'c'], 'ignored query')).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('returns the same list instance, including empty', () => {
    const ids = ['a', 'b'] as const;
    const reranker = createIdentityReranker();
    expect(reranker.rerank(ids, 'q')).toBe(ids);
    expect(reranker.rerank([], 'q')).toEqual([]);
  });
});
