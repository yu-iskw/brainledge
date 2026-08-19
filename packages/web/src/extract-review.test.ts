import { describe, expect, it } from 'vitest';

import { proposedFactKey } from './extract-review.js';

describe('proposedFactKey', () => {
  it('identifies a proposed fact by subject, predicate, object, and source', () => {
    expect(
      proposedFactKey({
        subjectId: 'ent_alice',
        predicateId: 'livesIn',
        objectText: 'Tokyo',
        sourceEpisodeId: 'ep_1',
      }),
    ).toBe('ent_alice|livesIn|Tokyo|ep_1');
  });

  it('does not treat a different object as the same fact', () => {
    const tokyo = proposedFactKey({
      subjectId: 'ent_alice',
      predicateId: 'livesIn',
      objectText: 'Tokyo',
      sourceEpisodeId: 'ep_1',
    });
    const paris = proposedFactKey({
      subjectId: 'ent_alice',
      predicateId: 'livesIn',
      objectText: 'Paris',
      sourceEpisodeId: 'ep_1',
    });
    expect(tokyo).not.toBe(paris);
  });
});
