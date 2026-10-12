// A log that can be dragged, e.g. to bridge a stream or a gap.

import * as THREE from 'three';
import { movable } from './movable';
import type { EntityDefinition } from './types';
import { silhouetteMaterial } from './visuals';

export const draggable_log: EntityDefinition<'draggable_log'> = {
  create(spec, ctx) {
    const mat = silhouetteMaterial();
    const r = spec.h / 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, spec.w, 9), mat);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = r;
    const g = new THREE.Group();
    g.add(trunk);
    return movable(ctx, 'draggable_log', spec, spec.w, spec.h, { mass: spec.mass, tag: 'log' }, g, [mat]);
  },
};
