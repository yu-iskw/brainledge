import { describe, expect, it } from 'vitest';

import { parseIsoUtc } from '../domain/time.js';
import { localPrincipal } from '../identity/local.js';

import { extractTypedFacts } from './extract.js';

describe('extractTypedFacts', () => {
  it('extracts a livesIn triple from an episode sentence', () => {
    const facts = extractTypedFacts(
      'Alice moved to Tokyo in July 2026.',
      'ws_personal',
      'ks_default',
      parseIsoUtc('2026-08-18T00:00:00.000Z'),
      { principalId: localPrincipal().id },
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]?.predicate.id).toBe('livesIn');
    expect(facts[0]?.object).toEqual({ kind: 'text', value: 'Tokyo' });
  });
});
