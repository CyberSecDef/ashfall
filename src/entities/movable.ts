// Shared behavior for movable boxes: a DynBox with a mesh that follows it,
// a highlight when the child is next to it, and its position kept in
// checkpoint snapshots.

import * as THREE from 'three';
import { DynBox, type BoxOptions } from '../engine/bodies';
import type { EntityType } from './params';
import type { Entity, LevelContext } from './types';
import { addUse, zAt } from './visuals';

export function movable(
  ctx: LevelContext,
  type: EntityType,
  spec: { id?: string; x: number; y?: number },
  w: number,
  h: number,
  opts: BoxOptions,
  mesh: THREE.Object3D,
  mats: THREE.MeshStandardMaterial[],
  /** Extra per-frame visual (wheels turning). */
  frame?: (box: DynBox, dt: number) => void,
): Entity {
  const bottom = spec.y ?? ctx.collision.restingTop(spec.x - w / 2, spec.x + w / 2);
  const box = new DynBox(ctx.collision, spec.x, bottom, w, h, opts);
  ctx.addBox(box);
  ctx.group.add(mesh);
  addUse(ctx, { x: () => box.cx, y: () => box.bottom, range: w / 2 + 0.45 }, mats);
  const sync = () => mesh.position.set(box.cx, box.bottom, zAt(ctx, box.cx));
  sync();
  return {
    type,
    id: spec.id,
    x: spec.x,
    frame(dt) {
      sync();
      frame?.(box, dt);
    },
    snapshot: () => ({ x: box.cx, y: box.bottom }),
    restore(s) {
      const st = s as { x: number; y: number };
      box.setPosition(st.x, st.y);
      sync();
    },
  };
}
