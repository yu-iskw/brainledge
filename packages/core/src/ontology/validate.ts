import type { Fact } from '../knowledge/fact.js';

export interface OntologyType {
  readonly id: string;
  readonly allowedPredicates: readonly string[];
}

export function validateFactsAgainstOntology(
  facts: readonly Fact[],
  types: readonly OntologyType[],
): { readonly valid: boolean; readonly violations: readonly string[] } {
  const byId = new Map(types.map((type) => [type.id, type]));
  const violations: string[] = [];
  for (const fact of facts) {
    const type = byId.get(fact.predicate.id);
    if (type && !type.allowedPredicates.includes(fact.predicate.id)) {
      violations.push(`predicate not allowed: ${fact.predicate.id}`);
    }
    if (types.length > 0 && ![...byId.keys()].includes(fact.predicate.id) && !type) {
      const known = types.some((item) => item.allowedPredicates.includes(fact.predicate.id));
      if (!known) {
        violations.push(`unknown predicate: ${fact.predicate.id}`);
      }
    }
  }
  return { valid: violations.length === 0, violations };
}
