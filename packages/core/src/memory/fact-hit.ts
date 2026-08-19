import type { FactHit } from './types.js';
import type { Fact, FactObject } from '../knowledge/fact.js';

export function formatFactObject(object: FactObject): string {
  switch (object.kind) {
    case 'entity': {
      return object.entity.entityId;
    }
    case 'text': {
      return object.value;
    }
    case 'number': {
      return String(object.value);
    }
    case 'boolean': {
      return String(object.value);
    }
    case 'timestamp': {
      return object.value;
    }
    default: {
      const exhaustive: never = object;
      throw new Error(`Unsupported fact object kind: ${String(exhaustive)}`);
    }
  }
}

export function toFactHit(fact: Fact): FactHit {
  const objectText = formatFactObject(fact.object);
  return {
    factId: fact.id,
    summary: `${fact.subject.entityId} ${fact.predicate.id} ${objectText}`,
    subjectId: fact.subject.entityId,
    predicateId: fact.predicate.id,
    objectText,
    validFrom: fact.validFrom,
    validUntil: fact.validUntil,
    sourceEpisodeId: fact.sourceEpisodeId,
  };
}
