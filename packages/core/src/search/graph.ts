import { cosineSimilarity } from '../search/recall-support.js';

import type { Fact } from '../knowledge/fact.js';

interface GraphNeighbor {
  readonly from: string;
  readonly predicate: string;
  readonly to: string;
}

export function graphNeighbors(facts: readonly Fact[], entityId: string): GraphNeighbor[] {
  return facts
    .filter((fact) => fact.retractedAt === undefined && fact.subject.entityId === entityId)
    .map((fact) => ({
      from: fact.subject.entityId,
      predicate: fact.predicate.id,
      to: fact.object.kind === 'entity' ? fact.object.entity.entityId : String(fact.object.value),
    }));
}

export function graphPath(
  facts: readonly Fact[],
  from: string,
  to: string,
  maxDepth = 4,
): readonly string[] | undefined {
  const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];
  const seen = new Set<string>([from]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    if (current.node === to) {
      return current.path;
    }
    if (current.path.length > maxDepth) {
      continue;
    }
    for (const edge of graphNeighbors(facts, current.node)) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push({ node: edge.to, path: [...current.path, edge.to] });
      }
    }
  }
  return undefined;
}

export function exactVectorSearch(
  query: readonly number[],
  corpus: readonly { readonly id: string; readonly vector: readonly number[] }[],
  limit: number,
): readonly { readonly id: string; readonly score: number }[] {
  return corpus
    .map((item) => ({ id: item.id, score: cosineSimilarity(query, item.vector) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

/** Documented scale limit for exact SQL cosine (P1-006). */
export const EXACT_COSINE_SOFT_LIMIT = 10_000;
const EXACT_COSINE_HARD_NOTE = 100_000;

export function documentedCosineLimits(): { soft: number; hard: number } {
  return { soft: EXACT_COSINE_SOFT_LIMIT, hard: EXACT_COSINE_HARD_NOTE };
}
