import { describe, expect, it } from 'vitest';

import { formatRecall } from './format-recall.js';

describe('formatRecall', () => {
  it('leads with humanized facts then notes', () => {
    expect(
      formatRecall({
        memories: [{ content: 'Alice moved to Tokyo in July 2026.' }],
        facts: [
          {
            summary: 'ent_alice livesIn Tokyo',
            subjectId: 'ent_alice',
            predicateId: 'livesIn',
            objectText: 'Tokyo',
          },
        ],
      }),
    ).toBe('Alice lives in Tokyo\n\nNotes:\nAlice moved to Tokyo in July 2026.');
  });

  it('returns notes only when facts are empty', () => {
    expect(
      formatRecall({
        memories: [{ content: 'Alice moved to Tokyo in July 2026.' }],
        facts: [],
      }),
    ).toBe('Alice moved to Tokyo in July 2026.');
  });
});
