// Rubble hanging high above the path. On 'activate' (or when the child passes
// `triggerAt`) it shudders for `delay` seconds, then falls, killing anything
// beneath. Once down it stays as an obstacle to climb over.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, extrude, jagged, silhouetteMaterial, zAt } from './visuals';

export const falling_debris: EntityDefinition<'falling_debris'> = {
  create(spec, ctx) {
    const ground = entityY(spec, ctx);
    const top = ground + spec.dropHeight;
    let state: 'hanging' | 'shaking' | 'falling' | 'down' = 'hanging';
    let t = 0;
    let y = top;
    let vy = 0;
    const solid = addSolid(ctx, {
      minX: spec.x - spec.w / 2,
      maxX: spec.x + spec.w / 2,
      minY: ground - 0.05,
      maxY: ground + spec.h,
      climbable: true,
      tag: 'debris',
      enabled: false,
    });
    const mesh = new THREE.Mesh(extrude(jagged(spec.w, spec.h, spec.x + 3, 5), 1), silhouetteMaterial());
    // A broken beam it hangs from.
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.3), silhouetteMaterial());
    beam.position.set(spec.x + 0.6, top + spec.h + 0.15, zAt(ctx, spec.x, -0.3));
    beam.rotation.z = -0.15;
    ctx.group.add(mesh, beam);

    const start = () => {
      if (state === 'hanging') {
        state = 'shaking';
        t = 0;
        ctx.sound('creak');
      }
    };
    const land = () => {
      state = 'down';
      y = ground;
      solid.enabled = true;
      ctx.sound('crash');
      for (const a of ctx.actors) {
        if (!a.dead && Math.abs(a.x - spec.x) < spec.w / 2 + a.params.halfWidth * 0.6 && a.y < ground + spec.h + 0.3) ctx.kill(a, 'crushed');
      }
      // Lift anything standing in the footprint on top of the rubble instead of inside it.
    };

    return {
      type: 'falling_debris',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') start();
      },
      update(dt) {
        if (state === 'hanging' && spec.triggerAt !== undefined && ctx.player.x >= spec.triggerAt) start();
        if (state === 'shaking') {
          t += dt;
          if (t >= spec.delay) state = 'falling';
        } else if (state === 'falling') {
          vy -= 22 * dt;
          y += vy * dt;
          // Hits anyone it passes through on the way down.
          for (const a of ctx.actors) {
            if (!a.dead && Math.abs(a.x - spec.x) < spec.w / 2 + a.params.halfWidth * 0.6 && y < a.y + a.height && y + spec.h > a.y) ctx.kill(a, 'crushed');
          }
          if (y <= ground) land();
        }
      },
      frame() {
        const shake = state === 'shaking' ? Math.sin(ctx.time * 60) * 0.03 : 0;
        mesh.position.set(spec.x - spec.w / 2 + shake, y, zAt(ctx, spec.x));
      },
      snapshot: () => state === 'down',
      restore: (s) => {
        if (s) {
          state = 'down';
          y = ground;
          solid.enabled = true;
        }
      },
    };
  },
};
