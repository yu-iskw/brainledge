import { describe, expect, it } from 'vitest';

import { asPrincipalId } from '../domain/ids.js';
import { parseIsoUtc } from '../domain/time.js';
import { createNoopTracer } from '../observability/tracer.js';
import { isExpired } from '../retention/policy.js';

import { isDelegationActive } from './delegation.js';

describe('enterprise extras', () => {
  it('enforces delegation expiry, retention, and noop traces', () => {
    const now = parseIsoUtc('2026-08-18T00:00:00.000Z');
    expect(
      isDelegationActive(
        {
          from: asPrincipalId('principal_local-user'),
          to: asPrincipalId('principal_agent'),
          actions: ['memory.recall'],
          expiresAt: parseIsoUtc('2026-08-19T00:00:00.000Z'),
        },
        now,
        'memory.recall',
      ),
    ).toBe(true);
    expect(isExpired('2020-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 30)).toBe(true);
    const span = createNoopTracer().startSpan('recall');
    span.end();
    expect(span.name).toBe('recall');
  });
});
