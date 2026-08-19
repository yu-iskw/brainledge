import { describe, expect, it } from 'vitest';

import { parseForgetMode } from './memory.js';

describe('parseForgetMode', () => {
  it('defaults undefined to hide and accepts each valid mode', () => {
    expect(parseForgetMode(undefined)).toBe('hide');
    expect(parseForgetMode('hide')).toBe('hide');
    expect(parseForgetMode('delete')).toBe('delete');
    expect(parseForgetMode('retract')).toBe('retract');
    expect(parseForgetMode('purge')).toBe('purge');
  });

  it('throws for an invalid mode', () => {
    expect(() => {
      parseForgetMode('wipe');
    }).toThrow(/forget --mode must be hide, delete, retract, or purge/u);
  });
});
