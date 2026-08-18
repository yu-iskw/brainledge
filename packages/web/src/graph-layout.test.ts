import { describe, expect, it } from 'vitest';

import {
  fitCamera,
  hitTestNode,
  neighborIds,
  panCamera,
  worldToScreen,
  zoomAt,
} from './graph-camera.js';
import { layoutKnowledgeGraph } from './graph-layout.js';
import { buildKnowledgeGraph } from './graph-model.js';

import type { Fact } from './types.js';

describe('layoutKnowledgeGraph', () => {
  it('places connected nodes inside the viewport', () => {
    const facts: Fact[] = [
      {
        id: 'fact_1',
        subject: { entityId: 'ent_alice' },
        predicate: { id: 'livesIn' },
        object: { kind: 'text', value: 'Tokyo' },
      },
      {
        id: 'fact_2',
        subject: { entityId: 'ent_carol' },
        predicate: { id: 'livesIn' },
        object: { kind: 'text', value: 'Paris' },
      },
    ];
    const graph = buildKnowledgeGraph(facts, new Map());
    const laid = layoutKnowledgeGraph(graph.nodes, graph.edges, 640, 400, 40);
    expect(laid).toHaveLength(4);
    for (const node of laid) {
      expect(node.x).toBeGreaterThan(40);
      expect(node.x).toBeLessThan(600);
      expect(node.y).toBeGreaterThan(40);
      expect(node.y).toBeLessThan(360);
    }
  });
});

describe('graph camera', () => {
  it('fits a compact cluster so it occupies most of the frame', () => {
    const nodes = [
      { id: 'a', label: 'Alice', kind: 'entity' as const, x: 12, y: 18 },
      { id: 'b', label: 'Tokyo', kind: 'literal' as const, x: 88, y: 64 },
    ];
    const camera = fitCamera(nodes, 800, 448);
    const screens = nodes.map((node) => worldToScreen(camera, node.x, node.y));
    const spanX =
      Math.max(...screens.map((point) => point.x)) - Math.min(...screens.map((point) => point.x));
    const spanY =
      Math.max(...screens.map((point) => point.y)) - Math.min(...screens.map((point) => point.y));
    expect(spanX).toBeGreaterThan(800 * 0.45);
    expect(spanY).toBeGreaterThan(448 * 0.35);
  });

  it('fits nodes and hits the selected world position', () => {
    const alice = { id: 'a', label: 'Alice', kind: 'entity' as const, x: 100, y: 100 };
    const tokyo = { id: 'b', label: 'Tokyo', kind: 'literal' as const, x: 200, y: 120 };
    const nodes = [alice, tokyo];
    const camera = fitCamera(nodes, 400, 300);
    const screen = worldToScreen(camera, alice.x, alice.y);
    expect(hitTestNode(nodes, camera, screen.x, screen.y)?.id).toBe('a');
    const panned = panCamera(camera, 12, 0);
    expect(panned.tx).toBe(camera.tx + 12);
    const zoomed = zoomAt(camera, 200, 150, 1.2);
    expect(zoomed.scale).toBeGreaterThan(camera.scale);
  });

  it('collects one-hop neighbors for focus dimming', () => {
    expect(
      [
        ...neighborIds('a', [
          { sourceId: 'a', targetId: 'b' },
          { sourceId: 'c', targetId: 'd' },
        ]),
      ].sort(),
    ).toEqual(['a', 'b']);
  });
});
