import { describe, expect, it } from 'vitest';

import { parseIsoUtc } from '../domain/time.js';

import { fixedClock, systemClock } from './clock.js';

describe('fixedClock', () => {
  it('always returns the same instant', () => {
    const at = parseIsoUtc('2026-08-18T00:00:00.000Z');
    const clock = fixedClock(at);
    expect(clock.now()).toBe(at);
    expect(clock.now()).toBe(clock.now());
  });
});

describe('systemClock', () => {
  it('returns a now() that parses as ISO UTC', () => {
    const now = systemClock().now();
    expect(parseIsoUtc(now)).toBe(now);
  });
});
