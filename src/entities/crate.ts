// A wooden crate: hold interact and move to push or pull it; climb onto it to reach higher.

import * as THREE from 'three';
import { movable } from './movable';
import type { EntityDefinition } from './types';
import { silhouetteMaterial } from './visuals';

export const crate: EntityDefinition<'crate'> = {
  create(spec, ctx) {
    const mat = silhouetteMaterial(0x121311);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 0.8), mat);
    body.position.y = spec.h / 2;
    // A diagonal brace, catching the rim light.
    const brace = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(spec.w, spec.h) * 0.9, 0.05, 0.02), mat);
    brace.rotation.z = Math.atan2(spec.h, spec.w);
    brace.position.set(0, spec.h / 2, 0.41);
    g.add(body, brace);
    return movable(ctx, 'crate', spec, spec.w, spec.h, { mass: spec.mass, tag: 'crate' }, g, [mat]);
  },
};
