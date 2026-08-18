import { describe, expect, it } from 'vitest';

import {
  createCamera,
  fitCamera,
  hitTestEdge,
  hitTestNode,
  MAX_CAMERA_SCALE,
  MIN_CAMERA_SCALE,
  neighborIds,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './graph-camera.js';

import type { LaidOutNode } from './graph-layout.js';
import type { KnowledgeGraphEdge } from './graph-model.js';

const alice: LaidOutNode = { id: 'ent_alice', label: 'Alice', kind: 'entity', x: 40, y: 50 };
const tokyo: LaidOutNode = { id: 'ent_tokyo', label: 'Tokyo', kind: 'entity', x: 180, y: 90 };
const livesIn: KnowledgeGraphEdge = {
  id: 'fact_lives_in',
  sourceId: alice.id,
  targetId: tokyo.id,
  label: 'lives in',
  factId: 'fact_lives_in',
};

describe('createCamera', () => {
  it('starts at identity scale and origin translation', () => {
    expect(createCamera()).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});

describe('screenToWorld', () => {
  it('inverts worldToScreen for a translated scaled camera', () => {
    const camera = { scale: 2.5, tx: 30, ty: -12 };
    const world = { x: 14, y: 9 };
    const screen = worldToScreen(camera, world.x, world.y);
    expect(screenToWorld(camera, screen.x, screen.y)).toEqual(world);
  });
});

describe('zoomAt', () => {
  it('clamps scale at MIN_CAMERA_SCALE and MAX_CAMERA_SCALE', () => {
    const camera = createCamera();
    expect(zoomAt(camera, 100, 80, 0.01).scale).toBe(MIN_CAMERA_SCALE);
    expect(zoomAt(camera, 100, 80, 100).scale).toBe(MAX_CAMERA_SCALE);
    expect(zoomAt({ scale: MIN_CAMERA_SCALE, tx: 4, ty: 6 }, 10, 10, 0.5).scale).toBe(
      MIN_CAMERA_SCALE,
    );
    expect(zoomAt({ scale: MAX_CAMERA_SCALE, tx: 4, ty: 6 }, 10, 10, 2).scale).toBe(
      MAX_CAMERA_SCALE,
    );
  });
});

describe('fitCamera', () => {
  it('returns createCamera when there are no nodes', () => {
    expect(fitCamera([], 800, 448)).toEqual(createCamera());
  });
});

describe('hitTestNode', () => {
  it('misses when the pointer is outside every node radius', () => {
    expect(hitTestNode([alice], createCamera(), 800, 800)).toBeUndefined();
  });
});

describe('neighborIds', () => {
  it('returns an empty set when nothing is selected', () => {
    expect(neighborIds(undefined, [{ sourceId: 'a', targetId: 'b' }])).toEqual(new Set());
  });
});

describe('hitTestEdge', () => {
  it('hits the Alice→Tokyo edge near the midpoint', () => {
    expect(hitTestEdge([alice, tokyo], [livesIn], createCamera(), 110, 70)).toEqual(livesIn);
  });

  it('misses when the pointer is far from every edge', () => {
    expect(hitTestEdge([alice, tokyo], [livesIn], createCamera(), 800, 800)).toBeUndefined();
  });
});
