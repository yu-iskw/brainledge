import type { KnowledgeGraphEdge, KnowledgeGraphNode } from './graph-model.js';

export interface LaidOutNode extends KnowledgeGraphNode {
  x: number;
  y: number;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

interface SimNode {
  id: string;
  label: string;
  kind: 'entity' | 'literal';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function applyRepulsion(laid: SimNode[]): void {
  for (let i = 0; i < laid.length; i += 1) {
    for (let j = i + 1; j < laid.length; j += 1) {
      const a = laid[i];
      const b = laid[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.max(24, Math.hypot(dx, dy));
      const force = 1400 / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }
}

function applySprings(
  laidById: ReadonlyMap<string, SimNode>,
  edges: readonly KnowledgeGraphEdge[],
): void {
  const rest = 118;
  for (const edge of edges) {
    const source = laidById.get(edge.sourceId);
    const target = laidById.get(edge.targetId);
    if (source === undefined || target === undefined) {
      continue;
    }
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const stretch = (dist - rest) * 0.018;
    source.vx += (dx / dist) * stretch;
    source.vy += (dy / dist) * stretch;
    target.vx -= (dx / dist) * stretch;
    target.vy -= (dy / dist) * stretch;
  }
}

function containInViewport(laid: SimNode[], width: number, height: number): void {
  if (laid.length === 0) {
    return;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of laid) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const padding = 64;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  for (const node of laid) {
    node.x = width / 2 + (node.x - midX) * scale;
    node.y = height / 2 + (node.y - midY) * scale;
  }
}

export function layoutKnowledgeGraph(
  nodes: readonly KnowledgeGraphNode[],
  edges: readonly KnowledgeGraphEdge[],
  width: number,
  height: number,
  iterations = 80,
): LaidOutNode[] {
  if (nodes.length === 0) {
    return [];
  }
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;
  const laid: SimNode[] = nodes.map((node, index) => {
    const angle = (hashString(node.id) / 0xffffffff) * Math.PI * 2 + index * 0.17;
    return {
      ...node,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });
  const byId = new Map(laid.map((node) => [node.id, node]));
  for (let step = 0; step < iterations; step += 1) {
    applyRepulsion(laid);
    applySprings(byId, edges);
    for (const node of laid) {
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x += node.vx;
      node.y += node.vy;
    }
  }
  containInViewport(laid, width, height);
  return laid.map((node) => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    x: node.x,
    y: node.y,
  }));
}
