// A boulder: scramble over it, or jump if it's tall.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const boulder: EntityDefinition<'boulder'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    addSolid(ctx, { minX: spec.x - spec.w / 2, maxX: spec.x + spec.w / 2, minY: y - 0.05, maxY: y + spec.h, climbable: true, tag: 'boulder' });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), silhouetteMaterial());
    rock.scale.set(spec.w, spec.h * 1.15, 1.1);
    rock.rotation.set(0.3, spec.x, 0.2);
    rock.position.set(spec.x, y + spec.h * 0.45, zAt(ctx, spec.x, -0.2));
    ctx.group.add(rock);
    return { type: 'boulder', id: spec.id, x: spec.x };
  },
};
