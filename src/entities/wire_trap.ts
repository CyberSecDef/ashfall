// An ankle-high tripwire between two stakes. Walking or crawling through it
// trips it: it signals its target (a falling slab, a flare) or, with no
// target, it is a snare that kills. Jump over it.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { silhouetteMaterial, zAt } from './visuals';

export const wire_trap: EntityDefinition<'wire_trap'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let tripped = false;
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    for (const z of [-0.9, 0.5]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, spec.h + 0.15, 4), mat);
      stake.position.set(0, (spec.h + 0.15) / 2 - 0.05, z);
      g.add(stake);
    }
    const wireGeo = new THREE.CylinderGeometry(0.004, 0.004, 1.4, 3);
    wireGeo.rotateX(Math.PI / 2);
    const wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({ color: 0x3d413d }));
    wire.position.set(0, spec.h, -0.2);
    g.add(wire);
    g.position.set(spec.x, y, zAt(ctx, spec.x));
    ctx.group.add(g);
    const prevX = new Map<object, number>();

    return {
      type: 'wire_trap',
      id: spec.id,
      x: spec.x,
      update() {
        if (tripped) return;
        for (const a of ctx.actors) {
          const px = prevX.get(a) ?? a.x;
          prevX.set(a, a.x);
          if (a.dead) continue;
          // Only real movement trips it; a teleport (debug jump, respawn) doesn't.
          const crossed = (px - spec.x) * (a.x - spec.x) <= 0 && px !== a.x && Math.abs(a.x - px) < 0.5;
          if (!crossed || a.y > y + spec.h) continue;
          tripped = true;
          ctx.sound('wire_snap', spec.x);
          if (spec.target) ctx.signal(spec.target, 'activate', spec.id);
          else ctx.kill(a, 'snare');
          return;
        }
      },
      frame() {
        wire.position.y = tripped ? 0.02 : spec.h;
        wire.rotation.z = tripped ? 0.2 : 0;
      },
      snapshot: () => tripped,
      restore: (s) => {
        tripped = s as boolean;
      },
    };
  },
};
