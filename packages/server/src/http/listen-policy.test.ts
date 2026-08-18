import { describe, expect, it } from 'vitest';

import { assertListenPolicy } from './listen-policy.js';

describe('listen policy', () => {
  it('allows loopback', () => {
    expect(() =>
      assertListenPolicy({ host: '127.0.0.1', port: 8787, allowNonLoopbackWithoutAuth: false }),
    ).not.toThrow();
  });

  it('refuses non-loopback without override', () => {
    expect(() =>
      assertListenPolicy({ host: '0.0.0.0', port: 8787, allowNonLoopbackWithoutAuth: false }),
    ).toThrow(/Refusing to bind/u);
  });
});
