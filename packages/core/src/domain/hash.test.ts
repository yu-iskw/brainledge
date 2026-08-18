import { describe, expect, it } from 'vitest';

import { newId, sha256 } from './hash.js';

describe('sha256', () => {
  it('is deterministic for the same content', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('differs for different content', () => {
    expect(sha256('hello')).not.toBe(sha256('world'));
  });
});

describe('newId', () => {
  it('prefixes a UUID', () => {
    expect(newId('ep')).toMatch(
      /^ep_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
    );
  });

  it('returns a distinct value on each call', () => {
    expect(newId('fact')).not.toBe(newId('fact'));
  });
});
