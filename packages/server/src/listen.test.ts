import { describe, expect, it } from 'vitest';

import { defaultListenHost, defaultListenPort, prepareListen } from './listen.js';

function withEnv(overrides: Record<string, string | undefined>, run: () => void): void {
  const keys = Object.keys(overrides);
  const previous: Record<string, string | undefined> = {};
  for (const key of keys) {
    previous[key] = process.env[key];
  }
  try {
    for (const key of keys) {
      const value = overrides[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('listen', () => {
  it('defaults host and port when env is unset', () => {
    withEnv({ BRAINLEDGE_HOST: undefined, BRAINLEDGE_PORT: undefined }, () => {
      expect(defaultListenHost()).toBe('127.0.0.1');
      expect(defaultListenPort()).toBe(8787);
    });
  });

  it('uses BRAINLEDGE_HOST and BRAINLEDGE_PORT overrides', () => {
    withEnv({ BRAINLEDGE_HOST: '10.0.0.8', BRAINLEDGE_PORT: '9999' }, () => {
      expect(defaultListenHost()).toBe('10.0.0.8');
      expect(defaultListenPort()).toBe(9999);
    });
  });

  it('does not throw prepareListen on 127.0.0.1', () => {
    withEnv(
      {
        BRAINLEDGE_HOST: '127.0.0.1',
        BRAINLEDGE_PORT: '8787',
        BRAINLEDGE_UNSAFE_BIND: undefined,
      },
      () => {
        let threw = false;
        try {
          prepareListen();
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
      },
    );
  });
});
