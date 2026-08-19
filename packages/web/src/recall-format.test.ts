import { describe, expect, it } from 'vitest';

import { formatFactHit, formatRecallFacts } from './recall-format.js';

describe('formatFactHit', () => {
  it('returns the summary when objectText is absent', () => {
    expect(formatFactHit({ summary: 'Alice works at Acme' })).toBe('Alice works at Acme');
  });

  it('turns typed triples into operator-facing sentences', () => {
    expect(
      formatFactHit({
        subjectId: 'ent_alice',
        predicateId: 'livesIn',
        objectText: 'Tokyo',
        summary: 'ent_alice livesIn Tokyo',
      }),
    ).toBe('Alice lives in Tokyo');
  });

  it('humanizes prefixed summaries when ids are omitted', () => {
    expect(formatFactHit({ summary: 'ent_alice worksAt', objectText: 'Acme' })).toBe(
      'Alice works at Acme',
    );
  });

  it('does not duplicate objectText already in a human summary', () => {
    expect(formatFactHit({ summary: 'Alice lives in Tokyo', objectText: 'Tokyo' })).toBe(
      'Alice lives in Tokyo',
    );
  });

  it('ignores blank objectText', () => {
    expect(formatFactHit({ summary: 'Alice works at Acme', objectText: '  ' })).toBe(
      'Alice works at Acme',
    );
  });
});

describe('formatRecallFacts', () => {
  it('joins formatted facts with newlines', () => {
    expect(formatRecallFacts([{ summary: 'one' }, { summary: 'two', objectText: 'obj' }])).toBe(
      'one\ntwo · obj',
    );
  });
});
