import { describe, expect, it } from 'vitest';

import { adjacentInspectRailPane, isInspectRailPane } from './inspect-rail.js';

describe('inspect rail', () => {
  it('accepts only dossier, extract, facts, and episodes', () => {
    expect(isInspectRailPane('dossier')).toBe(true);
    expect(isInspectRailPane('extract')).toBe(true);
    expect(isInspectRailPane('graph')).toBe(false);
  });

  it('moves left and right around the rail without skipping a pane', () => {
    expect(adjacentInspectRailPane('dossier', 1)).toBe('extract');
    expect(adjacentInspectRailPane('extract', 1)).toBe('facts');
    expect(adjacentInspectRailPane('facts', 1)).toBe('episodes');
    expect(adjacentInspectRailPane('episodes', 1)).toBe('dossier');
    expect(adjacentInspectRailPane('dossier', -1)).toBe('episodes');
  });
});
