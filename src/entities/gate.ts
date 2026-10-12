// A barred gate. Opens (rises) on 'activate', closes on 'deactivate', flips on
// 'toggle'. Closing on something leaves it propped.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const gate: EntityDefinition<'gate'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    let open = spec.open;
    const openLift = spec.h * spec.openTo;
    let lift = open ? openLift : 0;
    const solid = addSolid(ctx, {
      minX: spec.x - spec.w / 2,
      maxX: spec.x + spec.w / 2,
      minY: y - 0.05 + lift,
      maxY: y + spec.h + lift,
      climbable: false,
      tag: 'gate',
      blocksSight: spec.look === 'shutter',
      dx: 0,
      dy: 0,
    });
    const mat = silhouetteMaterial();
    const bars = new THREE.Group();
    if (spec.look === 'shutter') {
      // A corrugated steel shutter: solid, ribbed.
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.08, spec.h, 1.6), mat);
      sheet.position.set(0, spec.h / 2, -0.4);
      bars.add(sheet);
      for (let yy = 0.2; yy < spec.h; yy += 0.25) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.62), mat);
        rib.position.set(0, yy, -0.4);
        bars.add(rib);
      }
    } else {
      for (let z = -1.1; z <= 0.3; z += 0.16) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, spec.h, 0.05), mat);
        bar.position.set(0, spec.h / 2, z);
        bars.add(bar);
      }
    }
    for (const yy of [0.15, spec.h - 0.15]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.5), mat);
      rail.position.set(0, yy, -0.4);
      bars.add(rail);
    }
    // Housing above the opening, that the gate slides up into.
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.8), silhouetteMaterial());
    housing.position.set(spec.x, y + spec.h * 1.95, zAt(ctx, spec.x, -0.4));
    const g = new THREE.Group();
    g.add(bars);
    g.position.set(spec.x, y, zAt(ctx, spec.x));
    ctx.group.add(g, housing);

    const set = (v: boolean) => {
      if (v !== open) ctx.sound(v ? 'gate_open' : 'gate_close', spec.x);
      open = v;
    };

    return {
      type: 'gate',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') set(true);
        else if (name === 'deactivate') set(false);
        else if (name === 'toggle') set(!open);
      },
      update(dt) {
        const target = open ? openLift : 0;
        const prev = lift;
        lift += Math.sign(target - lift) * Math.min(Math.abs(target - lift), dt * (open ? 1.6 : 2.4));
        // Don't crush: stop closing on anything underneath.
        if (lift < prev) {
          const below = ctx.collision.overlap(solid.minX, solid.maxX, y + lift - 0.02, y + prev, solid);
          const actorBelow = ctx.actors.some((a) => !a.dead && Math.abs(a.x - spec.x) < spec.w / 2 + a.params.halfWidth && a.y + a.height > y + lift);
          if (below || actorBelow) lift = prev;
        }
        solid.minY = y - 0.05 + lift;
        solid.maxY = y + spec.h + lift;
      },
      frame() {
        bars.position.y = lift;
      },
      snapshot: () => open,
      restore: (s) => {
        open = s as boolean;
        lift = open ? openLift : 0;
        solid.minY = y - 0.05 + lift;
        solid.maxY = y + spec.h + lift;
      },
    };
  },
};
