import { describe, expect, it } from 'vitest';

import { createCamera } from './graph-camera.js';
import { drawKnowledgeGraph } from './graph-draw.js';

import type { GraphDrawState, GraphPalette } from './graph-draw.js';
import type { LaidOutNode } from './graph-layout.js';
import type { KnowledgeGraphEdge } from './graph-model.js';

const palette: GraphPalette = {
  ink: 'ink',
  muted: 'muted',
  surface: 'surface',
  accent: 'accent',
  brass: 'brass',
  paper: 'paper',
  border: 'border',
};

const alice: LaidOutNode = { id: 'ent_alice', label: 'Alice', kind: 'entity', x: 40, y: 50 };
const tokyo: LaidOutNode = { id: 'lit_tokyo', label: 'Tokyo', kind: 'literal', x: 180, y: 90 };

const livesIn: KnowledgeGraphEdge = {
  id: 'fact_1',
  sourceId: alice.id,
  targetId: tokyo.id,
  label: 'lives in',
  factId: 'fact_1',
};

function recordingContext(): {
  ctx: CanvasRenderingContext2D;
  calls: string[];
  fillRectStyles: string[];
  fillTexts: string[];
  strokeStyles: string[];
  strokeWidths: number[];
} {
  const calls: string[] = [];
  const fillRectStyles: string[] = [];
  const fillTexts: string[] = [];
  const strokeStyles: string[] = [];
  const strokeWidths: number[] = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    clearRect() {
      calls.push('clearRect');
    },
    fillRect() {
      calls.push('fillRect');
      fillRectStyles.push(String(ctx.fillStyle));
    },
    beginPath() {
      calls.push('beginPath');
    },
    arc() {
      calls.push('arc');
    },
    fill() {
      calls.push('fill');
    },
    stroke() {
      calls.push('stroke');
      strokeStyles.push(String(ctx.strokeStyle));
      strokeWidths.push(ctx.lineWidth);
    },
    moveTo() {
      calls.push('moveTo');
    },
    lineTo() {
      calls.push('lineTo');
    },
    fillText(text: string) {
      calls.push('fillText');
      fillTexts.push(text);
    },
    measureText(text: string) {
      calls.push('measureText');
      return { width: text.length * 6 };
    },
    save() {
      calls.push('save');
    },
    restore() {
      calls.push('restore');
    },
    translate() {
      calls.push('translate');
    },
    rotate() {
      calls.push('rotate');
    },
    closePath() {
      calls.push('closePath');
    },
  };
  return {
    ctx: ctx as CanvasRenderingContext2D,
    calls,
    fillRectStyles,
    fillTexts,
    strokeStyles,
    strokeWidths,
  };
}

function drawState(overrides: Partial<GraphDrawState> = {}): GraphDrawState {
  return {
    nodes: [],
    edges: [],
    camera: createCamera(),
    focusIds: new Set(),
    ...overrides,
  };
}

describe('drawKnowledgeGraph', () => {
  it('clears the frame and fills it with paper', () => {
    const { ctx, calls, fillRectStyles } = recordingContext();
    drawKnowledgeGraph(ctx, 640, 400, palette, drawState());
    expect(calls).toContain('clearRect');
    expect(calls).toContain('fillRect');
    expect(fillRectStyles[0]).toBe(palette.paper);
  });

  it('strokes edges and paints node labels', () => {
    const { ctx, calls, fillTexts } = recordingContext();
    drawKnowledgeGraph(
      ctx,
      640,
      400,
      palette,
      drawState({ nodes: [alice, tokyo], edges: [livesIn] }),
    );
    expect(calls.includes('lineTo') || calls.includes('moveTo')).toBe(true);
    expect(calls).toContain('closePath');
    expect(fillTexts).toEqual(expect.arrayContaining([alice.label, tokyo.label, livesIn.label]));
  });

  it('strokes the selected node', () => {
    const { ctx, calls } = recordingContext();
    drawKnowledgeGraph(ctx, 640, 400, palette, drawState({ nodes: [alice], selectedId: alice.id }));
    expect(calls).toContain('stroke');
  });

  it('strokes the selected edge with accent and keeps the label', () => {
    const { ctx, fillTexts, strokeStyles, strokeWidths } = recordingContext();
    drawKnowledgeGraph(
      ctx,
      640,
      400,
      palette,
      drawState({ nodes: [alice, tokyo], edges: [livesIn], selectedEdgeId: livesIn.id }),
    );
    expect(strokeStyles).toContain(palette.accent);
    expect(strokeWidths).toContain(2.4);
    expect(fillTexts).toContain(livesIn.label);
  });

  it('skips edges whose endpoints are missing', () => {
    const { ctx } = recordingContext();
    expect(() => {
      drawKnowledgeGraph(
        ctx,
        640,
        400,
        palette,
        drawState({
          nodes: [alice],
          edges: [
            {
              id: 'orphan',
              sourceId: alice.id,
              targetId: 'missing',
              label: 'points at',
              factId: 'fact_missing',
            },
          ],
        }),
      );
    }).not.toThrow();
  });
});
