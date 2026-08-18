import { describe, expect, it } from 'vitest';

import { evaluateDatalog } from './datalog.js';

describe('datalog', () => {
  it('derives heads when body facts exist', () => {
    const result = evaluateDatalog(
      [{ predicate: 'human', terms: ['alice'] }],
      [
        {
          head: { predicate: 'mortal', terms: ['alice'] },
          body: [{ predicate: 'human', terms: ['alice'] }],
        },
      ],
    );
    expect(result.derived).toEqual([{ predicate: 'mortal', terms: ['alice'] }]);
    expect(result.steps.length).toBe(1);
  });

  it('does not loop forever on already-known facts', () => {
    const result = evaluateDatalog(
      [{ predicate: 'a', terms: ['x'] }],
      [{ head: { predicate: 'a', terms: ['x'] }, body: [{ predicate: 'a', terms: ['x'] }] }],
    );
    expect(result.derived).toEqual([]);
  });
});
