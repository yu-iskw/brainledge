import { describe, expect, it } from 'vitest';

import { parseIsoUtc, toIsoUtc } from './time.js';

describe('parseIsoUtc', () => {
  it('accepts ISO-8601 UTC with optional fractional seconds', () => {
    expect(parseIsoUtc('2026-08-18T00:00:00Z')).toBe('2026-08-18T00:00:00Z');
    expect(parseIsoUtc('2026-08-18T00:00:00.000Z')).toBe('2026-08-18T00:00:00.000Z');
    expect(parseIsoUtc('2026-08-18T00:00:00.123456789Z')).toBe('2026-08-18T00:00:00.123456789Z');
  });

  it('rejects non-UTC and malformed timestamps', () => {
    expect(() => parseIsoUtc('2026-07-01')).toThrow(/Invalid UTC timestamp/u);
    expect(() => parseIsoUtc('not-a-date')).toThrow(/Invalid UTC timestamp/u);
    expect(() => parseIsoUtc('2026-08-18T00:00:00+00:00')).toThrow(/Invalid UTC timestamp/u);
    expect(() => parseIsoUtc('')).toThrow(/Invalid UTC timestamp/u);
  });
});

describe('toIsoUtc', () => {
  it('formats a Date as branded ISO UTC', () => {
    expect(toIsoUtc(new Date('2026-08-18T00:00:00.000Z'))).toBe('2026-08-18T00:00:00.000Z');
  });
});
