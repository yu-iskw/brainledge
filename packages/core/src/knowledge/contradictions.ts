import { factObjectKey, subjectPredicateKey } from './fact.js';

import type { Fact } from './fact.js';

function overlaps(left: Fact, right: Fact): boolean {
  const leftFrom = left.validFrom ?? left.assertedAt;
  const rightFrom = right.validFrom ?? right.assertedAt;
  const leftUntil = left.validUntil ?? '9999-12-31T23:59:59.000Z';
  const rightUntil = right.validUntil ?? '9999-12-31T23:59:59.000Z';
  return leftFrom < rightUntil && rightFrom < leftUntil;
}

export function findContradictoryPairs(facts: readonly Fact[]): readonly [Fact, Fact][] {
  const pairs: [Fact, Fact][] = [];
  for (const [index, left] of facts.entries()) {
    if (left.retractedAt !== undefined) {
      continue;
    }
    for (const right of facts.slice(index + 1)) {
      if (right.retractedAt !== undefined) {
        continue;
      }
      if (
        subjectPredicateKey(left.subject.entityId, left.predicate.id) ===
          subjectPredicateKey(right.subject.entityId, right.predicate.id) &&
        factObjectKey(left.object) !== factObjectKey(right.object) &&
        overlaps(left, right)
      ) {
        pairs.push([left, right]);
      }
    }
  }
  return pairs;
}
