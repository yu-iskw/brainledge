import { validateFactsAgainstOntology, type OntologyType } from './validate.js';

import type { KnowledgeSpaceId } from '../domain/ids.js';
import type { Fact } from '../knowledge/fact.js';

export interface OntologyPort {
  getEntityType(spaceId: KnowledgeSpaceId, typeId: string): OntologyType | undefined;
  getPredicate(spaceId: KnowledgeSpaceId, predicateId: string): string | undefined;
  validateFacts(
    spaceId: KnowledgeSpaceId,
    facts: readonly Fact[],
  ): {
    readonly valid: boolean;
    readonly violations: readonly string[];
  };
  register(spaceId: KnowledgeSpaceId, types: readonly OntologyType[]): void;
}

export function createInMemoryOntologyRegistry(
  seed: readonly OntologyType[] = [{ id: 'Person', allowedPredicates: ['livesIn', 'knows'] }],
): OntologyPort {
  const bySpace = new Map<string, OntologyType[]>([['*', [...seed]]]);
  return {
    register(spaceId, types) {
      bySpace.set(spaceId, [...types]);
    },
    getEntityType(spaceId, typeId) {
      const types = bySpace.get(spaceId) ?? bySpace.get('*') ?? [];
      return types.find((item) => item.id === typeId);
    },
    getPredicate(spaceId, predicateId) {
      const types = bySpace.get(spaceId) ?? bySpace.get('*') ?? [];
      return types.some((item) => item.allowedPredicates.includes(predicateId))
        ? predicateId
        : undefined;
    },
    validateFacts(spaceId, facts) {
      const types = bySpace.get(spaceId) ?? bySpace.get('*') ?? [];
      return validateFactsAgainstOntology(facts, types);
    },
  };
}
