import { factObjectKey } from './fact.js';

import type { Fact } from './fact.js';

export function exportFactsJsonLd(facts: readonly Fact[]): Record<string, unknown> {
  return {
    '@context': {
      schemaVersion: '1',
      subject: 'https://brainledge.dev/subject',
      predicate: 'https://brainledge.dev/predicate',
      object: 'https://brainledge.dev/object',
    },
    '@graph': facts.map((fact) => ({
      '@id': fact.id,
      subject: fact.subject.entityId,
      predicate: fact.predicate.id,
      object: factObjectKey(fact.object),
      assertedAt: fact.assertedAt,
      retractedAt: fact.retractedAt ?? null,
    })),
  };
}
