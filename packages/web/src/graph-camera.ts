import type { LaidOutNode } from './graph-layout.js';
import type { KnowledgeGraphEdge } from './graph-model.js';

export interface GraphCamera {
  scale: number;
  tx: number;
  ty: number;
}

export const NODE_RADIUS = 18;
export const MIN_CAMERA_SCALE = 0.25;
export const MAX_CAMERA_SCALE = 8;

export function createCamera(): GraphCamera {
  return { scale: 1, tx: 0, ty: 0 };
}

export function worldToScreen(camera: GraphCamera, x: number, y: number): { x: number; y: number } {
  return { x: x * camera.scale + camera.tx, y: y * camera.scale + camera.ty };
}

export function screenToWorld(camera: GraphCamera, x: number, y: number): { x: number; y: number } {
  return { x: (x - camera.tx) / camera.scale, y: (y - camera.ty) / camera.scale };
}

export function zoomAt(
  camera: GraphCamera,
  screenX: number,
  screenY: number,
  factor: number,
): GraphCamera {
  const next = Math.min(MAX_CAMERA_SCALE, Math.max(MIN_CAMERA_SCALE, camera.scale * factor));
  const world = screenToWorld(camera, screenX, screenY);
  return {
    scale: next,
    tx: screenX - world.x * next,
    ty: screenY - world.y * next,
  };
}

export function panCamera(camera: GraphCamera, dx: number, dy: number): GraphCamera {
  return { scale: camera.scale, tx: camera.tx + dx, ty: camera.ty + dy };
}

export function fitCamera(
  nodes: readonly LaidOutNode[],
  width: number,
  height: number,
  padding = 48,
): GraphCamera {
  if (nodes.length === 0) {
    return createCamera();
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - NODE_RADIUS);
    minY = Math.min(minY, node.y - NODE_RADIUS);
    maxX = Math.max(maxX, node.x + NODE_RADIUS);
    maxY = Math.max(maxY, node.y + NODE_RADIUS);
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min(
    (width - padding * 2) / spanX,
    (height - padding * 2) / spanY,
    MAX_CAMERA_SCALE,
  );
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return {
    scale,
    tx: width / 2 - midX * scale,
    ty: height / 2 - midY * scale,
  };
}

export function hitTestNode(
  nodes: readonly LaidOutNode[],
  camera: GraphCamera,
  screenX: number,
  screenY: number,
): LaidOutNode | undefined {
  const radius = NODE_RADIUS + 8;
  let best: LaidOutNode | undefined;
  let bestDist = radius;
  for (const node of nodes) {
    const screen = worldToScreen(camera, node.x, node.y);
    const dist = Math.hypot(screen.x - screenX, screen.y - screenY);
    if (dist <= bestDist) {
      best = node;
      bestDist = dist;
    }
  }
  return best;
}

const EDGE_HIT_THRESHOLD = 8;

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function hitTestEdge(
  nodes: readonly LaidOutNode[],
  edges: readonly KnowledgeGraphEdge[],
  camera: GraphCamera,
  screenX: number,
  screenY: number,
): KnowledgeGraphEdge | undefined {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let best: KnowledgeGraphEdge | undefined;
  let bestDist = EDGE_HIT_THRESHOLD;
  for (const edge of edges) {
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    if (source === undefined || target === undefined) {
      continue;
    }
    const from = worldToScreen(camera, source.x, source.y);
    const to = worldToScreen(camera, target.x, target.y);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / dist;
    const uy = dy / dist;
    const startX = from.x + ux * NODE_RADIUS;
    const startY = from.y + uy * NODE_RADIUS;
    const endX = to.x - ux * NODE_RADIUS;
    const endY = to.y - uy * NODE_RADIUS;
    const toSegment = distanceToSegment(
      { x: screenX, y: screenY },
      { x: startX, y: startY },
      { x: endX, y: endY },
    );
    if (toSegment <= bestDist) {
      best = edge;
      bestDist = toSegment;
    }
  }
  return best;
}

export function neighborIds(
  selectedId: string | undefined,
  edges: readonly { readonly sourceId: string; readonly targetId: string }[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  if (selectedId === undefined) {
    return ids;
  }
  ids.add(selectedId);
  for (const edge of edges) {
    if (edge.sourceId === selectedId) {
      ids.add(edge.targetId);
    }
    if (edge.targetId === selectedId) {
      ids.add(edge.sourceId);
    }
  }
  return ids;
}
