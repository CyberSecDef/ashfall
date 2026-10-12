// A lattice radio mast with a slow, pale beacon pulsing at the top: the
// distant signal the child has been walking toward. Decorative.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const beacon: EntityDefinition<'beacon'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const base = 1.4;
    const legs = [-1, 1].map((s) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, spec.h, 0.08), mat);
      leg.position.set((s * base) / 4, spec.h / 2, 0);
      leg.rotation.z = (-s * base) / 2 / spec.h;
      return leg;
    });
    g.add(...legs);
    for (let t = 0.08; t < 1; t += 0.11) {
      const w = base * (1 - t) * 0.9;
      const brace = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(w, spec.h * 0.11), 0.03, 0.03), mat);
      brace.position.set(0, spec.h * (t + 0.055), 0);
      brace.rotation.z = Math.atan2(spec.h * 0.11, w) * (Math.round(t * 9) % 2 ? 1 : -1);
      g.add(brace);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glowMaterial(PALE, 1));
    lamp.position.y = spec.h + 0.15;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), glowMaterial(PALE, 0.25));
    halo.position.set(0, spec.h + 0.15, -0.05);
    g.add(lamp, halo);
    g.position.set(spec.x, y, zAt(ctx, spec.x, -3));
    ctx.group.add(g);
    return {
      type: 'beacon',
      id: spec.id,
      x: spec.x,
      frame() {
        // A slow heartbeat of light.
        const p = Math.pow(Math.max(0, Math.sin(ctx.time * 1.4)), 6);
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + p * 0.5;
        halo.scale.setScalar(0.8 + p * 0.6);
      },
    };
  },
};
