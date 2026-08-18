import { describe, expect, it } from 'vitest';

import { asPrincipalId } from './ids.js';
import { parseIsoUtc } from './time.js';

describe('ids', () => {
  it('rejects empty identifiers', () => {
    expect(() => asPrincipalId('')).toThrow(/empty/u);
    expect(() => asPrincipalId('   ')).toThrow(/empty/u);
  });

  it('brands non-empty identifiers', () => {
    expect(asPrincipalId('p1')).toBe('p1');
  });
});

describe('time', () => {
  it('accepts ISO UTC', () => {
    expect(parseIsoUtc('2026-07-01T00:00:00.000Z')).toBe('2026-07-01T00:00:00.000Z');
  });

  it('rejects non-UTC strings', () => {
    expect(() => parseIsoUtc('2026-07-01')).toThrow(/Invalid UTC timestamp/u);
    expect(() => parseIsoUtc('not-a-date')).toThrow(/Invalid UTC timestamp/u);
  });
});
