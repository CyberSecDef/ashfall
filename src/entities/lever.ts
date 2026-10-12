// A lever: tap to flip. Sends 'activate' to its target when thrown on and
// 'deactivate' when thrown back (unless `once`).

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addUse, silhouetteMaterial, zAt } from './visuals';

export const lever: EntityDefinition<'lever'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let on = spec.on;
    let angle = on ? 0.7 : -0.7;
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), mat);
    base.position.y = 0.12;
    const arm = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 6), mat);
    stick.position.y = 0.3;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat);
    knob.position.y = 0.6;
    arm.add(stick, knob);
    arm.position.y = 0.22;
    g.add(base, arm);
    g.position.set(spec.x, y, zAt(ctx, spec.x, -0.3));
    ctx.group.add(g);

    addUse(
      ctx,
      {
        x: () => spec.x,
        y: () => y,
        range: 0.9,
        enabled: () => !(spec.once && on !== spec.on),
        use: () => {
          on = !on;
          ctx.sound('lever');
          if (spec.target) ctx.signal(spec.target, on ? 'activate' : 'deactivate', spec.id);
        },
      },
      [mat],
    );

    return {
      type: 'lever',
      id: spec.id,
      x: spec.x,
      frame(dt) {
        angle += ((on ? 0.7 : -0.7) - angle) * (1 - Math.exp(-dt * 12));
        arm.rotation.z = -angle;
      },
      snapshot: () => on,
      restore: (s) => {
        on = s as boolean;
        angle = on ? 0.7 : -0.7;
      },
    };
  },
};
