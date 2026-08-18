import { NODE_RADIUS, worldToScreen } from './graph-camera.js';

import type { GraphCamera } from './graph-camera.js';
import type { LaidOutNode } from './graph-layout.js';
import type { KnowledgeGraphEdge } from './graph-model.js';

export interface GraphPalette {
  readonly ink: string;
  readonly muted: string;
  readonly surface: string;
  readonly accent: string;
  readonly brass: string;
  readonly paper: string;
  readonly border: string;
}

export interface GraphDrawState {
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly KnowledgeGraphEdge[];
  readonly camera: GraphCamera;
  readonly selectedId?: string;
  readonly hoveredId?: string;
  readonly focusIds: ReadonlySet<string>;
}

function isActive(id: string, state: GraphDrawState): boolean {
  return state.focusIds.size === 0 || state.focusIds.has(id);
}

function shouldShowEdgeLabel(state: GraphDrawState, sourceId: string, targetId: string): boolean {
  if (state.camera.scale <= 0.85) {
    return false;
  }
  return (
    state.selectedId === sourceId ||
    state.selectedId === targetId ||
    state.hoveredId === sourceId ||
    state.hoveredId === targetId
  );
}

function drawEdgeLabel(
  ctx: CanvasRenderingContext2D,
  palette: GraphPalette,
  camera: GraphCamera,
  ends: { source: LaidOutNode; target: LaidOutNode; text: string },
): void {
  const from = worldToScreen(camera, ends.source.x, ends.source.y);
  const to = worldToScreen(camera, ends.target.x, ends.target.y);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const flip = angle > Math.PI / 2 || angle < -Math.PI / 2;
  ctx.save();
  ctx.translate((from.x + to.x) / 2, (from.y + to.y) / 2);
  ctx.rotate(flip ? angle + Math.PI : angle);
  ctx.font = '600 11px "Avenir Next", "Segoe UI", sans-serif';
  const metrics = ctx.measureText(ends.text);
  ctx.fillStyle = palette.surface;
  ctx.fillRect(-metrics.width / 2 - 4, -8, metrics.width + 8, 16);
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ends.text, 0, 0);
  ctx.restore();
}

function edgeEnds(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { start: { x: number; y: number }; end: { x: number; y: number }; angle: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    start: { x: from.x + ux * NODE_RADIUS, y: from.y + uy * NODE_RADIUS },
    end: { x: to.x - ux * NODE_RADIUS, y: to.y - uy * NODE_RADIUS },
    angle: Math.atan2(dy, dx),
  };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  palette: GraphPalette,
  tip: { x: number; y: number },
  angle: number,
): void {
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(angle - 0.4), tip.y - size * Math.sin(angle - 0.4));
  ctx.lineTo(tip.x - size * Math.cos(angle + 0.4), tip.y - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = palette.border;
  ctx.fill();
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  palette: GraphPalette,
  state: GraphDrawState,
  byId: ReadonlyMap<string, LaidOutNode>,
): void {
  ctx.lineCap = 'round';
  for (const edge of state.edges) {
    const source = byId.get(edge.sourceId);
    const target = byId.get(edge.targetId);
    if (source === undefined || target === undefined) {
      continue;
    }
    const from = worldToScreen(state.camera, source.x, source.y);
    const to = worldToScreen(state.camera, target.x, target.y);
    const { start, end, angle } = edgeEnds(from, to);
    const active = isActive(source.id, state) && isActive(target.id, state);
    ctx.globalAlpha = active ? 1 : 0.18;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = active ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    drawArrowHead(ctx, palette, end, angle);
    if (shouldShowEdgeLabel(state, source.id, target.id)) {
      drawEdgeLabel(ctx, palette, state.camera, {
        source,
        target,
        text: edge.label,
      });
    }
  }
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  palette: GraphPalette,
  node: { x: number; y: number; label: string; selected: boolean },
  width: number,
  height: number,
): void {
  ctx.font = `${node.selected ? '700' : '600'} 12px "Avenir Next", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(node.label);
  const boxWidth = metrics.width + 8;
  const x = Math.min(Math.max(node.x, boxWidth / 2 + 4), width - boxWidth / 2 - 4);
  const ly = Math.min(node.y + NODE_RADIUS + 6, height - 18);
  ctx.fillStyle = palette.surface;
  ctx.fillRect(x - metrics.width / 2 - 4, ly - 2, boxWidth, 16);
  ctx.fillStyle = palette.ink;
  ctx.fillText(node.label, x, ly);
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  palette: GraphPalette,
  state: GraphDrawState,
  width: number,
  height: number,
): void {
  const showAllLabels = state.camera.scale > 0.7 || state.nodes.length <= 16;
  for (const node of state.nodes) {
    const screen = worldToScreen(state.camera, node.x, node.y);
    ctx.globalAlpha = isActive(node.id, state) ? 1 : 0.2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = node.kind === 'entity' ? palette.accent : palette.brass;
    ctx.fill();
    const selected = node.id === state.selectedId;
    const hovered = node.id === state.hoveredId;
    if (selected || hovered) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.ink;
      ctx.stroke();
    }
    const showLabel = showAllLabels || selected || hovered || state.focusIds.has(node.id);
    if (showLabel) {
      drawNodeLabel(
        ctx,
        palette,
        {
          x: screen.x,
          y: screen.y,
          label: node.label,
          selected,
        },
        width,
        height,
      );
    }
  }
}

export function drawKnowledgeGraph(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: GraphPalette,
  state: GraphDrawState,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  const byId = new Map(state.nodes.map((node) => [node.id, node]));
  drawEdges(ctx, palette, state, byId);
  drawNodes(ctx, palette, state, width, height);
  ctx.globalAlpha = 1;
}
