import { describe, expect, it } from 'vitest';

import { formatFactSentence, humanizeEntityId, humanizePredicate } from './format-fact-sentence.js';

describe('formatFactSentence', () => {
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
});
