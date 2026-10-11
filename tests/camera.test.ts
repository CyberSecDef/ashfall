import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraRig } from '../src/engine/camera';
import { Player } from '../src/engine/player';
import { Terrain } from '../src/engine/terrain';

const finite = (v: THREE.Vector3) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

describe('CameraRig', () => {
  const setup = () => {
    const cam = new THREE.PerspectiveCamera(32, 2, 0.1, 400);
    const p = new Player(new Terrain([{ x: 0, y: 0 }, { x: 50, y: 0 }]), 5);
    return { cam, p, rig: new CameraRig(cam, p) };
  };

  it('treats undefined hint fields as defaults (regression: camera went NaN, screen blank)', () => {
    const { cam, p, rig } = setup();
    rig.hint({ zoom: 1.45, offsetY: 0.8, offsetX: undefined }, 1);
    for (let i = 0; i < 120; i++) rig.update(p, 1 / 60);
    expect(finite(cam.position)).toBe(true);
    expect(rig.distance).toBeCloseTo(11 * 1.45, 1);
  });

  it('eases back to the default framing on clearHint', () => {
    const { p, rig } = setup();
    rig.hint({ zoom: 0.8 }, 0.5);
    for (let i = 0; i < 60; i++) rig.update(p, 1 / 60);
    rig.clearHint(0.5);
    for (let i = 0; i < 60; i++) rig.update(p, 1 / 60);
    expect(rig.distance).toBeCloseTo(11, 3);
  });

  it('recovers from a non-finite value instead of blanking the view', () => {
    const { cam, p, rig } = setup();
    rig.hint({ zoom: Number.NaN }, 0.1);
    for (let i = 0; i < 30; i++) rig.update(p, 1 / 60);
    expect(finite(cam.position)).toBe(true);
  });
});
