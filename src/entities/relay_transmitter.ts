// The relay transmitter: a small pre-war device blinking faintly in the dirt.
// Walking into it gives the child the relay (saved): tap a dormant body to
// take control of it.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const relay_transmitter: EntityDefinition<'relay_transmitter'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let taken = ctx.hasRelay;
    const g = new THREE.Group();
    const mat = silhouetteMaterial();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), mat);
    box.position.y = 0.06;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.35, 3), mat);
    antenna.position.set(0.06, 0.28, 0);
    antenna.rotation.z = -0.2;
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), glowMaterial(PALE, 1));
    blink.position.set(0.09, 0.45, 0);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), glowMaterial(PALE, 0.15));
    halo.position.set(0.09, 0.45, -0.01);
    g.add(box, antenna, blink, halo);
    g.position.set(spec.x, y, zAt(ctx, spec.x, 0.1));
    g.visible = !taken;
    ctx.group.add(g);
    return {
      type: 'relay_transmitter',
      id: spec.id,
      x: spec.x,
      update() {
        if (taken) return;
        const c = ctx.player;
        if (Math.abs(c.x - spec.x) < 0.4 && Math.abs(c.y - y) < 0.8) {
          taken = true;
          ctx.grantRelay();
          ctx.sound('relay_found');
        }
      },
      frame() {
        g.visible = !taken;
        const on = Math.sin(ctx.time * 5) > 0.4;
        blink.visible = halo.visible = on;
      },
    };
  },
};
