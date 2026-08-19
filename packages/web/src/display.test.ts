import { describe, expect, it } from 'vitest';

import {
  comparableFactText,
  formatFactSentence,
  formatIngestStatus,
  formatObservedAt,
  formatOperatorLabel,
  formatProvenanceLabel,
  formatSavedStatus,
  formatWorkspaceName,
  humanizeEntityId,
  humanizePredicate,
  modeHeading,
  spaceInitial,
} from './display.js';

describe('display copy', () => {
  it('hides entity id prefixes and camelCase predicates', () => {
    expect(humanizeEntityId('ent_alice')).toBe('Alice');
    expect(humanizePredicate('livesIn')).toBe('lives in');
    expect(
      formatFactSentence({
        subjectId: 'ent_alice',
        predicateId: 'livesIn',
        objectText: 'Tokyo',
        summary: 'ent_alice livesIn Tokyo',
      }),
    ).toBe('Alice lives in Tokyo');
  });

  it('formats times in UTC without a raw ISO dump', () => {
    expect(formatObservedAt('2026-08-18T14:53:33.001Z')).toMatch(/18 Aug 2026/u);
    expect(formatObservedAt('2026-08-18T14:53:33.001Z')).not.toMatch(/T14:/u);
  });

  it('uses operator-facing status strings', () => {
    expect(formatSavedStatus()).toBe('Saved');
    expect(formatIngestStatus('succeeded', 2)).toBe('Ingest succeeded · 2 segments');
    expect(formatIngestStatus('succeeded', 1)).toBe('Ingest succeeded · 1 segment');
    expect(formatOperatorLabel('local')).toBe('This device');
    expect(formatWorkspaceName('PERSONAL')).toBe('Personal');
    expect(modeHeading('capture')).toBe('Capture');
    expect(spaceInitial('default')).toBe('D');
    expect(formatProvenanceLabel('Alice moved to Tokyo in July 2026.')).toBe(
      'From: Alice moved to Tokyo in July 2026.',
    );
    expect(comparableFactText('Carol lives in Paris.')).toBe('carol lives in paris');
  });
});
