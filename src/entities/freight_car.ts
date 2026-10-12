// A rail freight car. Sits still until 'activate' (or the child passes
// `startAt`), then rolls east at `speed` to the end of the line. Its roof is a
// moving solid: jump on and it carries you.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const freight_car: EntityDefinition<'freight_car'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let x = spec.x;
    let rolling = false;
    let v = 0;
    const body = addSolid(ctx, {
      minX: x - spec.w / 2,
      maxX: x + spec.w / 2,
      minY: y + 0.15,
      maxY: y + spec.h,
      climbable: true,
      tag: 'freight_car',
      dx: 0,
      dy: 0,
    });
    const mat = silhouetteMaterial(0x101110);
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h - 0.35, 1.8), mat);
    box.position.y = 0.35 + (spec.h - 0.35) / 2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.1, 0.06, 1.9), mat);
    roof.position.y = spec.h;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, spec.h - 0.5, 0.02), silhouetteMaterial(0x161816));
    door.position.set(0, 0.35 + (spec.h - 0.35) / 2, 0.91);
    g.add(box, roof, door);
    const wheels: THREE.Mesh[] = [];
    for (const dx of [-0.38, -0.25, 0.25, 0.38]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), mat);
      w.rotation.x = Math.PI / 2;
      w.position.set(dx * spec.w, 0.17, 0.85);
      wheels.push(w);
      g.add(w);
    }
    ctx.group.add(g);
    const end = ctx.terrain.maxX - spec.w / 2 - 0.5;

    const start = () => {
      if (!rolling) {
        rolling = true;
        ctx.sound('train_start', x);
      }
    };
    return {
      type: 'freight_car',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') start();
      },
      update(dt) {
        if (!rolling && spec.startAt !== undefined && ctx.player.x >= spec.startAt) start();
        const prev = x;
        if (rolling) {
          v = Math.min(spec.speed, v + dt * 0.9);
          x = Math.min(end, x + v * dt);
        }
        body.dx = x - prev;
        body.minX = x - spec.w / 2;
        body.maxX = x + spec.w / 2;
      },
      frame() {
        g.position.set(x, y, zAt(ctx, x, -0.1));
        for (const w of wheels) w.rotation.y -= (body.dx ?? 0) / 0.17;
      },
      debug: () => ({ x, rolling }),
    };
  },
};
