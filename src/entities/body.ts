// A limp body lying on the ground. Heavy and low; it weighs down pressure plates.

import * as THREE from 'three';
import { movable } from './movable';
import type { EntityDefinition } from './types';
import { silhouetteMaterial } from './visuals';

export const body: EntityDefinition<'body'> = {
  create(spec, ctx) {
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(spec.h * 0.45, spec.w * 0.55, 4, 8), mat);
    torso.rotation.z = Math.PI / 2;
    torso.position.y = spec.h * 0.45;
    const head = new THREE.Mesh(new THREE.SphereGeometry(spec.h * 0.42, 10, 8), mat);
    head.position.set(spec.w * 0.45, spec.h * 0.42, 0.05);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 3, 6), mat);
    arm.rotation.z = 1.2;
    arm.position.set(spec.w * 0.1, spec.h * 0.25, 0.25);
    g.add(torso, head, arm);
    return movable(ctx, 'body', spec, spec.w, spec.h, { mass: spec.mass, tag: 'body' }, g, [mat]);
  },
};
