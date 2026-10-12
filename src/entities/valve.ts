// A valve wheel: tap to turn it. After a slow turn it sends 'activate' once.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addUse, silhouetteMaterial, zAt } from './visuals';

export const valve: EntityDefinition<'valve'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let turning = -1; // -1 idle, 0..1 turning, 2 done
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const pipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8);
    const riser = new THREE.Mesh(pipeGeo, mat);
    riser.position.y = 0.45;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), mat);
    wheel.position.set(0, 0.85, 0.12);
    const spokes = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), mat);
    wheel.add(spokes);
    g.add(riser, wheel);
    g.position.set(spec.x, y, zAt(ctx, spec.x, -0.35));
    ctx.group.add(g);

    addUse(
      ctx,
      {
        x: () => spec.x,
        y: () => y,
        range: 0.9,
        enabled: () => turning === -1,
        use: () => {
          turning = 0;
          ctx.sound('valve');
        },
      },
      [mat],
    );

    return {
      type: 'valve',
      id: spec.id,
      x: spec.x,
      update(dt) {
        if (turning < 0 || turning >= 2) return;
        turning = Math.min(1, turning + dt / spec.turnTime);
        if (turning >= 1) {
          turning = 2;
          if (spec.target) ctx.signal(spec.target, 'activate', spec.id);
        }
      },
      frame() {
        wheel.rotation.z = -(turning < 0 ? 0 : Math.min(1, turning)) * Math.PI * 3;
      },
      snapshot: () => turning >= 2,
      restore: (s) => {
        if (s) turning = 2;
      },
    };
  },
};
