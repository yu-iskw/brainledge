import { describe, expect, it } from 'vitest';

import {
  createCamera,
  fitCamera,
  hitTestNode,
  MAX_CAMERA_SCALE,
  MIN_CAMERA_SCALE,
  neighborIds,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './graph-camera.js';

import type { LaidOutNode } from './graph-layout.js';

const alice: LaidOutNode = { id: 'ent_alice', label: 'Alice', kind: 'entity', x: 40, y: 50 };

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
