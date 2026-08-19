import { describe, expect, it } from 'vitest';

import { lexicalTokens } from './lexical.js';

describe('lexicalTokens', () => {
  it('lowercases and splits on non-word characters', () => {
    expect(lexicalTokens('Where does Alice live?')).toEqual(['where', 'does', 'alice', 'live']);
  });

  it('drops tokens shorter than three characters', () => {
    expect(lexicalTokens('I am in Tokyo')).toEqual(['tokyo']);
  });

  it('returns an empty list for punctuation or blank queries', () => {
    expect(lexicalTokens('')).toEqual([]);
    expect(lexicalTokens('  ---  ')).toEqual([]);
    expect(lexicalTokens('a to of')).toEqual([]);
  });
});
