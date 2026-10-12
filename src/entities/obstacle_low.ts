// A knee-to-chest high obstacle (rubble, a wreck, a broken wall): the child
// scrambles over it automatically when pushing into it.

import * as THREE from 'three';
import { obstacleShape } from './obstacle_shapes';
import type { EntityDefinition, LevelContext } from './types';
import { entityY } from './types';
import { addSolid, extrude, silhouetteMaterial, zAt } from './visuals';

export function staticObstacle(ctx: LevelContext, x: number, y: number, w: number, h: number, geo: THREE.BufferGeometry, climbable = true): void {
  addSolid(ctx, { minX: x - w / 2, maxX: x + w / 2, minY: y - 0.05, maxY: y + h, climbable, tag: 'obstacle' });
  const mesh = new THREE.Mesh(geo, silhouetteMaterial());
  mesh.position.set(x - w / 2, y - 0.05, zAt(ctx, x));
  ctx.group.add(mesh);
}

export const obstacle_low: EntityDefinition<'obstacle_low'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    staticObstacle(ctx, spec.x, y, spec.w, spec.h, extrude(obstacleShape(spec.look, spec.w, spec.h + 0.05, spec.x)));
    return { type: 'obstacle_low', id: spec.id, x: spec.x };
  },
};
