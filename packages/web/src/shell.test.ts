import { describe, expect, it } from 'vitest';

import { adjacentMode, isWorkbenchMode } from './shell.js';

describe('workbench shell', () => {
  it('accepts only Capture, Recall, and Inspect', () => {
    expect(isWorkbenchMode('capture')).toBe(true);
    expect(isWorkbenchMode('graph')).toBe(false);
  });

  it('moves focus order left and right without wrapping past the list ends incorrectly', () => {
    expect(adjacentMode('capture', 1)).toBe('recall');
    expect(adjacentMode('inspect', 1)).toBe('capture');
    expect(adjacentMode('capture', -1)).toBe('inspect');
  });
});
