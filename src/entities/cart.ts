// A rusted cart: rolls on after a push.

import * as THREE from 'three';
import { movable } from './movable';
import type { EntityDefinition } from './types';
import { silhouetteMaterial } from './visuals';

export const cart: EntityDefinition<'cart'> = {
  create(spec, ctx) {
    const mat = silhouetteMaterial(0x111211);
    const g = new THREE.Group();
    const wheelR = 0.16;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h - wheelR, 0.9), mat);
    bed.position.y = wheelR + (spec.h - wheelR) / 2;
    const wheels: THREE.Mesh[] = [];
    for (const dx of [-0.35, 0.35]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.06, 10), mat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(dx * spec.w, wheelR, 0.47);
      wheels.push(wh);
      g.add(wh);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), mat);
    handle.position.set(-spec.w / 2 - 0.2, spec.h * 0.9, 0);
    handle.rotation.z = 0.5;
    g.add(bed, handle);
    let lastX = spec.x;
    return movable(ctx, 'cart', spec, spec.w, spec.h, { mass: spec.mass, rolls: true, tag: 'cart' }, g, [mat], (box) => {
      for (const wh of wheels) wh.rotation.y += (box.cx - lastX) / wheelR;
      lastX = box.cx;
    });
  },
};
