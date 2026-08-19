import { describe, expect, it } from 'vitest';

import { assertListenPolicy } from './listen-policy.js';

describe('listen policy', () => {
  it('allows loopback', () => {
    expect(() =>
      assertListenPolicy({
        host: '127.0.0.1',
        port: 8787,
        unsafeBind: false,
        authenticationConfigured: false,
      }),
    ).not.toThrow();
  });

  it('refuses non-loopback without override', () => {
    expect(() =>
      assertListenPolicy({
        host: '0.0.0.0',
        port: 8787,
        unsafeBind: false,
        authenticationConfigured: true,
      }),
    ).toThrow(/UNSAFE_BIND/u);
  });

  it('refuses non-loopback without authentication', () => {
    expect(() =>
      assertListenPolicy({
        host: '0.0.0.0',
        port: 8787,
        unsafeBind: true,
        authenticationConfigured: false,
      }),
    ).toThrow(/without authentication/u);
  });

  it('allows non-loopback with unsafe bind and auth', () => {
    expect(() =>
      assertListenPolicy({
        host: '0.0.0.0',
        port: 8787,
        unsafeBind: true,
        authenticationConfigured: true,
      }),
    ).not.toThrow();
  });
});
