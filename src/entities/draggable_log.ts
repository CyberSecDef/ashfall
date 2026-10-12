// A log that can be dragged, e.g. to bridge a stream or a gap.

import * as THREE from 'three';
import { movable } from './movable';
import type { EntityDefinition } from './types';
import { silhouetteMaterial } from './visuals';

export const draggable_log: EntityDefinition<'draggable_log'> = {
  create(spec, ctx) {
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    if (spec.look === 'log') {
      const r = spec.h / 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, spec.w, 9), mat);
      trunk.rotation.z = Math.PI / 2;
      trunk.position.y = r;
      g.add(trunk);
    } else {
      // A torn-off car door (with its window hole) or a plain plank, lying flat.
      const panel = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 1.1), mat);
      panel.position.y = spec.h / 2;
      g.add(panel);
      if (spec.look === 'door') {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.45, 0.03, 0.04), silhouetteMaterial(0x1b1e1b));
        sill.position.set(spec.w * 0.15, spec.h + 0.015, 0.4);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.05), silhouetteMaterial(0x1b1e1b));
        handle.position.set(-spec.w * 0.3, spec.h + 0.015, 0.45);
        g.add(sill, handle);
      }
    }
    return movable(ctx, 'draggable_log', spec, spec.w, spec.h, { mass: spec.mass, tag: 'log' }, g, [mat]);
  },
};
