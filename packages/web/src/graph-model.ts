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

export interface KnowledgeGraph {
  readonly nodes: readonly KnowledgeGraphNode[];
  readonly edges: readonly KnowledgeGraphEdge[];
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
    id: `lit_${fact.predicate.id}_${value}`,
    label: value,
    kind: 'literal',
  };
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
