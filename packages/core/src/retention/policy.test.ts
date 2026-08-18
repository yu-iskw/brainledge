import { describe, expect, it } from 'vitest';

import { isExpired } from './policy.js';

describe('isExpired', () => {
  it('is true when the age exceeds the retention window', () => {
    expect(isExpired('2020-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 30)).toBe(true);
  });

  it('is false while still inside the retention window', () => {
    expect(isExpired('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 30)).toBe(false);
  });

  it('is false exactly at the window boundary', () => {
    expect(isExpired('2026-01-01T00:00:00.000Z', '2026-01-31T00:00:00.000Z', 30)).toBe(false);
  });

  it('treats a zero-day window as immediately expired after now', () => {
    expect(isExpired('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.001Z', 0)).toBe(true);
    expect(isExpired('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 0)).toBe(false);
  });
});
