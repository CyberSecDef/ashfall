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
    let strain = 0;
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(spec.heavy ? 0.5 : 0.3, spec.heavy ? 0.45 : 0.25, 0.4), mat);
    base.position.y = spec.heavy ? 0.22 : 0.12;
    const arm = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(spec.heavy ? 0.045 : 0.025, spec.heavy ? 0.05 : 0.03, spec.heavy ? 1.0 : 0.6, 6), mat);
    stick.position.y = spec.heavy ? 0.5 : 0.3;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat);
    knob.position.y = spec.heavy ? 1.0 : 0.6;
    arm.add(stick, knob);
    arm.position.y = spec.heavy ? 0.42 : 0.22;
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
        use: (actor) => {
          if (spec.heavy && actor === ctx.player) {
            // The child strains at it; it won't budge.
            strain = 0.5;
            ctx.sound('strain', spec.x);
            return;
          }
          on = !on;
          ctx.sound(spec.heavy ? 'lever_heavy' : 'lever', spec.x);
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
        strain = Math.max(0, strain - dt);
        arm.rotation.z = -angle + Math.sin(strain * 60) * 0.04 * strain;
      },
      snapshot: () => on,
      restore: (s) => {
        on = s as boolean;
        angle = on ? 0.7 : -0.7;
      },
    };
  },
};
