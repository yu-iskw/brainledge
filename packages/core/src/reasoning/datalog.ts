export interface DatalogTuple {
  readonly predicate: string;
  readonly terms: readonly string[];
}

export interface DatalogRule {
  readonly head: DatalogTuple;
  readonly body: readonly DatalogTuple[];
}

const MAX_INFERENCES = 1000;

export function evaluateDatalog(
  facts: readonly DatalogTuple[],
  rules: readonly DatalogRule[],
): { readonly derived: readonly DatalogTuple[]; readonly steps: readonly string[] } {
  const known = new Set(facts.map(tupleKey));
  const derived: DatalogTuple[] = [];
  const steps: string[] = [];
  let changed = true;
  let iterations = 0;
  while (changed && iterations < MAX_INFERENCES) {
    changed = false;
    iterations += 1;
    for (const rule of rules) {
      if (rule.body.every((clause) => known.has(tupleKey(clause)))) {
        const key = tupleKey(rule.head);
        if (!known.has(key)) {
          known.add(key);
          derived.push(rule.head);
          steps.push(`rule ${rule.head.predicate}`);
          changed = true;
        }
      }
    }
  }
  return { derived, steps };
}

function tupleKey(tuple: DatalogTuple): string {
  return `${tuple.predicate}(${tuple.terms.join(',')})`;
}
