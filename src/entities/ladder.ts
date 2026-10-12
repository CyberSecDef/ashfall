// A ladder from the ground up `h` meters. Up climbs, down descends, stepping
// off at the top onto the ledge it leans on.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { silhouetteMaterial, zAt } from './visuals';

export const ladder: EntityDefinition<'ladder'> = {
  create(spec, ctx) {
    const bottom = entityY(spec, ctx);
    ctx.addLadder({ x: spec.x, bottom, top: bottom + spec.h });
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const rail = new THREE.BoxGeometry(0.05, spec.h + 0.4, 0.05);
    for (const dx of [-0.2, 0.2]) {
      const r = new THREE.Mesh(rail, mat);
      r.position.set(dx, (spec.h + 0.4) / 2, 0);
      g.add(r);
    }
    const rung = new THREE.BoxGeometry(0.44, 0.04, 0.04);
    for (let y = 0.25; y < spec.h + 0.2; y += 0.3) {
      const r = new THREE.Mesh(rung, mat);
      r.position.set(0, y, 0);
      if (Math.sin(y * 13 + spec.x) > 0.85) r.rotation.z = 0.25; // a few bent rungs
      g.add(r);
    }
    g.position.set(spec.x, bottom, zAt(ctx, spec.x, -0.25));
    ctx.group.add(g);
    return { type: 'ladder', id: spec.id, x: spec.x };
  },
};
