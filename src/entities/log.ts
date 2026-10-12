// A fallen trunk lying across the path, with a couple of snapped branch stubs.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const log: EntityDefinition<'log'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    const r = spec.h / 2;
    addSolid(ctx, { minX: spec.x - spec.w / 2, maxX: spec.x + spec.w / 2, minY: y - 0.05, maxY: y + spec.h, climbable: true, tag: 'log' });
    const mat = silhouetteMaterial();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, spec.w, 10), mat);
    trunk.rotation.z = Math.PI / 2;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.5, 5), mat);
    stub.position.set(spec.w * 0.2, r + 0.15, 0);
    stub.rotation.z = -0.6;
    const g = new THREE.Group();
    g.add(trunk, stub);
    g.position.set(spec.x, y + r, zAt(ctx, spec.x, -0.1));
    ctx.group.add(g);
    return { type: 'log', id: spec.id, x: spec.x };
  },
};
