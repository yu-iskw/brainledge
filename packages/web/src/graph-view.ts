import {
  createCamera,
  fitCamera,
  hitTestEdge,
  hitTestNode,
  neighborIds,
  panCamera,
  worldToScreen,
  zoomAt,
} from './graph-camera.js';
import { drawKnowledgeGraph } from './graph-draw.js';
import { layoutKnowledgeGraph } from './graph-layout.js';

import type { GraphCamera } from './graph-camera.js';
import type { GraphPalette } from './graph-draw.js';
import type { LaidOutNode } from './graph-layout.js';
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from './graph-model.js';

export interface GraphViewHandle {
  setGraph: (nodes: readonly KnowledgeGraphNode[], edges: readonly KnowledgeGraphEdge[]) => void;
  setCamera: (camera: GraphCamera) => void;
  selectNode: (id: string | undefined) => void;
  focusNode: (id: string | undefined) => void;
  nodeIds: () => readonly string[];
  positions: () => readonly { id: string; x: number; y: number }[];
  camera: () => GraphCamera;
  zoomBy: (factor: number) => void;
  fit: () => void;
  screenPositions: () => readonly { id: string; label: string; x: number; y: number }[];
  redraw: () => void;
  destroy: () => void;
}

export function bindKnowledgeGraph(
  canvas: HTMLCanvasElement,
  palette: GraphPalette,
  onSelect: (node: LaidOutNode | undefined, edge: KnowledgeGraphEdge | undefined) => void,
): GraphViewHandle {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('GRAPH_CANVAS');
  }
  let nodes: LaidOutNode[] = [];
  let edges: readonly KnowledgeGraphEdge[] = [];
  let camera = createCamera();
  let selectedId: string | undefined;
  let selectedEdgeId: string | undefined;
  let hoveredId: string | undefined;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;

  let lastNodes: readonly KnowledgeGraphNode[] = [];
  let lastEdges: readonly KnowledgeGraphEdge[] = [];
  let layoutWidth = 0;
  let layoutHeight = 0;
  let laidOutWidth = 0;
  let laidOutHeight = 0;
  let deviceRatio = 0;

  const size = (): { width: number; height: number } => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(280, Math.floor(rect.height));
    const ratio = window.devicePixelRatio || 1;
    if (width !== laidOutWidth || height !== laidOutHeight || ratio !== deviceRatio) {
      laidOutWidth = width;
      laidOutHeight = height;
      deviceRatio = ratio;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return { width, height };
  };

  const focusIds = (): ReadonlySet<string> => {
    if (selectedEdgeId !== undefined) {
      const edge = edges.find((item) => item.id === selectedEdgeId);
      if (edge !== undefined) {
        return new Set([edge.sourceId, edge.targetId]);
      }
    }
    return neighborIds(selectedId, edges);
  };

  const incidentEdge = (nodeId: string | undefined): KnowledgeGraphEdge | undefined => {
    if (nodeId === undefined) {
      return undefined;
    }
    const outgoing = edges.find((item) => item.sourceId === nodeId);
    return outgoing ?? edges.find((item) => item.targetId === nodeId);
  };

  const redraw = (): void => {
    const { width, height } = size();
    drawKnowledgeGraph(ctx, width, height, palette, {
      nodes,
      edges,
      camera,
      selectedId,
      selectedEdgeId,
      hoveredId,
      focusIds: focusIds(),
    });
  };

  const applyLayout = (width: number, height: number): void => {
    layoutWidth = width;
    layoutHeight = height;
    if (lastNodes.length === 0) {
      nodes = [];
      return;
    }
    nodes = layoutKnowledgeGraph(lastNodes, lastEdges, width, height);
    camera = fitCamera(nodes, width, height);
  };

  const relayoutIfNeeded = (): void => {
    const { width, height } = size();
    if (width === layoutWidth && height === layoutHeight) {
      redraw();
      return;
    }
    applyLayout(width, height);
    redraw();
  };

  const localPoint = (event: MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerCancel = (): void => {
    dragging = false;
  };

  const onPointerDown = (event: PointerEvent): void => {
    canvas.setPointerCapture(event.pointerId);
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const point = localPoint(event);
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      moved += Math.hypot(dx, dy);
      camera = panCamera(camera, dx, dy);
      lastX = event.clientX;
      lastY = event.clientY;
      redraw();
      return;
    }
    const hitNode = hitTestNode(nodes, camera, point.x, point.y);
    const hitEdge =
      hitNode === undefined ? hitTestEdge(nodes, edges, camera, point.x, point.y) : undefined;
    const next = hitNode?.id;
    canvas.style.cursor = hitNode === undefined && hitEdge === undefined ? 'grab' : 'pointer';
    if (next !== hoveredId) {
      hoveredId = next;
      redraw();
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    dragging = false;
    if (moved > 5) {
      return;
    }
    const point = localPoint(event);
    const hitNode = hitTestNode(nodes, camera, point.x, point.y);
    const hitEdge =
      hitNode === undefined ? hitTestEdge(nodes, edges, camera, point.x, point.y) : undefined;
    selectedId = hitNode?.id;
    selectedEdgeId = hitEdge?.id;
    onSelect(hitNode, hitEdge);
    redraw();
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const point = localPoint(event);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    camera = zoomAt(camera, point.x, point.y, factor);
    redraw();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const resizeObserver = new ResizeObserver(() => {
    relayoutIfNeeded();
  });
  resizeObserver.observe(canvas);

  return {
    setGraph(nextNodes, nextEdges) {
      lastNodes = nextNodes;
      lastEdges = nextEdges;
      edges = nextEdges;
      selectedId = undefined;
      selectedEdgeId = undefined;
      hoveredId = undefined;
      const { width, height } = size();
      applyLayout(width, height);
      redraw();
    },
    setCamera(next) {
      camera = next;
      redraw();
    },
    selectNode(id) {
      selectedId = id;
      selectedEdgeId = undefined;
      const node = id === undefined ? undefined : nodes.find((item) => item.id === id);
      onSelect(node, undefined);
      redraw();
    },
    focusNode(id) {
      selectedId = id;
      selectedEdgeId = undefined;
      if (id === undefined) {
        onSelect(undefined, undefined);
        redraw();
        return;
      }
      const node = nodes.find((item) => item.id === id);
      if (node === undefined) {
        onSelect(undefined, undefined);
        redraw();
        return;
      }
      const { width, height } = size();
      const screen = worldToScreen(camera, node.x, node.y);
      camera = panCamera(camera, width / 2 - screen.x, height / 2 - screen.y);
      onSelect(node, incidentEdge(id));
      redraw();
    },
    nodeIds() {
      return nodes.map((node) => node.id);
    },
    positions() {
      return nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }));
    },
    camera() {
      return camera;
    },
    zoomBy(factor) {
      const { width, height } = size();
      camera = zoomAt(camera, width / 2, height / 2, factor);
      redraw();
    },
    fit() {
      const { width, height } = size();
      camera = fitCamera(nodes, width, height);
      redraw();
    },
    screenPositions() {
      return nodes.map((node) => {
        const screen = worldToScreen(camera, node.x, node.y);
        return { id: node.id, label: node.label, x: screen.x, y: screen.y };
      });
    },
    redraw,
    destroy() {
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}
