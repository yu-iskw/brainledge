import { factObjectKey } from './fact.js';

import type { Fact } from './fact.js';
import type { IsoUtcTimestamp } from '../domain/time.js';

export function supersedeFact(
  previous: Fact,
  next: Fact,
  until: IsoUtcTimestamp,
): { previous: Fact; next: Fact } {
  if (previous.subject.entityId !== next.subject.entityId) {
    throw new Error('supersession requires the same subject');
  }
  if (previous.predicate.id !== next.predicate.id) {
    throw new Error('supersession requires the same predicate');
  }
  if (factObjectKey(previous.object) === factObjectKey(next.object)) {
    return { previous, next };
  }
  return {
    previous: {
      ...previous,
      validUntil: until,
      retractedAt: until,
      status: 'retracted',
    },
    next,
  };
}
