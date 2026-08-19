import { describe, expect, it } from 'vitest';

import { buildKnowledgeGraph, highlightIdsFromFactHits } from './graph-model.js';

import type { Fact } from './types.js';

function textFact(id: string, subject: string, predicate: string, value: string): Fact {
  return {
    id,
    subject: { entityId: subject },
    predicate: { id: predicate },
    object: { kind: 'text', value },
  };
}

describe('buildKnowledgeGraph', () => {
  it('turns typed facts into labeled nodes and predicate edges', () => {
    const graph = buildKnowledgeGraph(
      [textFact('fact_1', 'ent_alice', 'livesIn', 'Tokyo')],
      new Map([['ent_alice', 'Alice']]),
    );
    expect(graph.nodes.map((node) => node.label).sort()).toEqual(['Alice', 'Tokyo']);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        sourceId: 'ent_alice',
        targetId: 'lit_livesIn_Tokyo',
        label: 'lives in',
      }),
    ]);
  });

  it('reuses entity nodes across facts', () => {
    const graph = buildKnowledgeGraph(
      [
        textFact('fact_1', 'ent_alice', 'livesIn', 'Tokyo'),
        textFact('fact_2', 'ent_alice', 'worksAt', 'Acme'),
      ],
      new Map([['ent_alice', 'Alice']]),
    );
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });

  it('maps recall fact hits onto node and edge highlight ids', () => {
    const highlights = highlightIdsFromFactHits([
      {
        factId: 'fact_1',
        subjectId: 'ent_alice',
        predicateId: 'livesIn',
        objectText: 'Tokyo',
      },
    ]);
    expect([...highlights.edgeIds]).toEqual(['fact_1']);
    expect(highlights.nodeIds.has('ent_alice')).toBe(true);
    expect(highlights.nodeIds.has('lit_livesIn_Tokyo')).toBe(true);
  });
});
