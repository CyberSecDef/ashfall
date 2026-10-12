// A conveyor belt: while running, carries whatever stands on it.
// Starts on 'activate', stops on 'deactivate', flips on 'toggle'.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

const H = 0.25;

export const conveyor: EntityDefinition<'conveyor'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let on = spec.on;
    let offset = 0;
    const solid = addSolid(ctx, {
      minX: spec.x,
      maxX: spec.x + spec.w,
      minY: y - 0.05,
      maxY: y + H,
      climbable: true,
      tag: 'conveyor',
      dx: 0,
      dy: 0,
    });
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(spec.w, H * 0.7, 1), mat);
    frame.position.set(spec.w / 2, H * 0.35, 0);
    g.add(frame);
    // Ridges on the belt that slide along while it runs.
    const ridges: THREE.Mesh[] = [];
    const ridgeGeo = new THREE.BoxGeometry(0.05, 0.04, 1.02);
    const gap = 0.35;
    for (let x = 0; x < spec.w; x += gap) {
      const r = new THREE.Mesh(ridgeGeo, mat);
      r.position.set(x, H - 0.02, 0);
      ridges.push(r);
      g.add(r);
    }
    g.position.set(spec.x, y, zAt(ctx, spec.x + spec.w / 2, -0.2));
    ctx.group.add(g);

    return {
      type: 'conveyor',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') on = true;
        else if (name === 'deactivate') on = false;
        else if (name === 'toggle') on = !on;
      },
      update(dt) {
        solid.dx = on ? spec.speed * dt : 0;
        if (on) offset = (offset + spec.speed * dt) % gap;
      },
      frame() {
        ridges.forEach((r, i) => {
          const x = (i * gap + offset + spec.w) % spec.w;
          r.position.x = x;
        });
      },
      snapshot: () => on,
      restore: (s) => {
        on = s as boolean;
      },
    };
  },
};
