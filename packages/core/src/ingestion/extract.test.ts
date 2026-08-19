import { describe, expect, it } from 'vitest';

import { parseIsoUtc } from '../domain/time.js';
import { localPrincipal } from '../identity/local.js';

import { extractTypedFacts, parseLlmFactTuples } from './extract.js';

const NOW = parseIsoUtc('2026-08-18T00:00:00.000Z');
const AUTHOR = { principalId: localPrincipal().id };

describe('extractTypedFacts', () => {
  it('extracts a livesIn triple from an episode sentence', () => {
    const facts = extractTypedFacts(
      'Alice moved to Tokyo in July 2026.',
      'ws_personal',
      'ks_default',
      NOW,
      AUTHOR,
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]?.predicate.id).toBe('livesIn');
    expect(facts[0]?.object).toEqual({ kind: 'text', value: 'Tokyo' });
    expect(facts[0]?.validFrom).toBe('2026-07-01T00:00:00.000Z');
  });

  it('extracts worksAt from a workplace sentence', () => {
    const facts = extractTypedFacts(
      'Dana works at the cafe.',
      'ws_personal',
      'ks_default',
      NOW,
      AUTHOR,
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]?.predicate.id).toBe('worksAt');
    expect(facts[0]?.object).toEqual({ kind: 'text', value: 'Cafe' });
  });

  it('extracts taught topic and place', () => {
    const facts = extractTypedFacts(
      'Thales taught geometry in Miletus.',
      'ws_personal',
      'ks_default',
      NOW,
      AUTHOR,
    );
    expect(facts.map((item) => item.predicate.id).sort()).toEqual(['taught', 'taughtIn']);
    expect(facts.find((item) => item.predicate.id === 'taught')?.object).toEqual({
      kind: 'text',
      value: 'Geometry',
    });
    expect(facts.find((item) => item.predicate.id === 'taughtIn')?.object).toEqual({
      kind: 'text',
      value: 'Miletus',
    });
  });

  it('extracts several triples from one document', () => {
    const facts = extractTypedFacts(
      'Carol lives in Paris. Yosano works at the hospital.',
      'ws_personal',
      'ks_default',
      NOW,
      AUTHOR,
    );
    expect(facts).toHaveLength(2);
  });

  it('parses structured LLM facts and ignores unknown predicates', () => {
    expect(
      parseLlmFactTuples(
        JSON.stringify({
          facts: [
            { subject: 'Alice', predicate: 'knows', object: 'Carol' },
            { subject: 'Bob', predicate: 'likes', object: 'pie' },
          ],
        }),
      ),
    ).toEqual([{ subject: 'Alice', predicate: 'knows', object: 'Carol' }]);
    expect(parseLlmFactTuples('not-json')).toEqual([]);
  });
});
