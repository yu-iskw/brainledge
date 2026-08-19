import { humanizeEntityId, humanizePredicate } from './display.js';

import type { Fact } from './types.js';

export interface KnowledgeGraphNode {
  readonly id: string;
  readonly label: string;
  readonly kind: 'entity' | 'literal';
}

export interface KnowledgeGraphEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  readonly factId: string;
  readonly sourceEpisodeId?: string;
}

interface KnowledgeGraph {
  readonly nodes: readonly KnowledgeGraphNode[];
  readonly edges: readonly KnowledgeGraphEdge[];
}

function literalNodeId(predicateId: string, objectText: string): string {
  return `lit_${predicateId}_${objectText}`;
}

function objectNode(fact: Fact, names: ReadonlyMap<string, string>): KnowledgeGraphNode {
  if ('entity' in fact.object) {
    const id = fact.object.entity.entityId;
    return {
      id,
      label: names.get(id) ?? humanizeEntityId(id),
      kind: 'entity',
    };
  }
  const value = String(fact.object.value);
  return {
    id: literalNodeId(fact.predicate.id, value),
    label: value,
    kind: 'literal',
  };
}

export function highlightIdsFromFactHits(
  hits: readonly {
    readonly factId?: string;
    readonly subjectId?: string;
    readonly predicateId?: string;
    readonly objectText?: string;
  }[],
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  for (const hit of hits) {
    if (
      hit.factId === undefined ||
      hit.subjectId === undefined ||
      hit.predicateId === undefined ||
      hit.objectText === undefined
    ) {
      continue;
    }
    edgeIds.add(hit.factId);
    nodeIds.add(hit.subjectId);
    nodeIds.add(literalNodeId(hit.predicateId, hit.objectText));
  }
  return { nodeIds, edgeIds };
}

export function buildKnowledgeGraph(
  facts: readonly Fact[],
  names: ReadonlyMap<string, string>,
): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeGraphNode>();
  const edges: KnowledgeGraphEdge[] = [];
  for (const fact of facts) {
    const subjectId = fact.subject.entityId;
    if (!nodes.has(subjectId)) {
      nodes.set(subjectId, {
        id: subjectId,
        label: names.get(subjectId) ?? humanizeEntityId(subjectId),
        kind: 'entity',
      });
    }
    const target = objectNode(fact, names);
    if (!nodes.has(target.id)) {
      nodes.set(target.id, target);
    }
    edges.push({
      id: fact.id,
      sourceId: subjectId,
      targetId: target.id,
      label: humanizePredicate(fact.predicate.id),
      factId: fact.id,
      sourceEpisodeId: fact.sourceEpisodeId,
    });
  }
  return { nodes: [...nodes.values()], edges };
}
