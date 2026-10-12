// A lift platform: rises `travel` meters on 'activate', sinks on 'deactivate',
// flips on 'toggle'. Whatever stands on it rides along.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

const DECK = 0.18;

export const lift: EntityDefinition<'lift'> = {
  create(spec, ctx) {
    const base = entityY(spec, ctx);
    let up = spec.up;
    let pos = up ? spec.travel : 0;
    const solid = addSolid(ctx, {
      minX: spec.x - spec.w / 2,
      maxX: spec.x + spec.w / 2,
      minY: base + pos - DECK,
      maxY: base + pos,
      climbable: true,
      tag: 'lift',
      blocksSight: false,
      dx: 0,
      dy: 0,
    });
    const mat = silhouetteMaterial();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(spec.w, DECK, 1.1), mat);
    const top = base + spec.travel + 2.2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.6, 0.2, 0.3), silhouetteMaterial());
    beam.position.set(spec.x, top, zAt(ctx, spec.x, -0.6));
    const cableGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4);
    cableGeo.translate(0, 0.5, 0);
    const cables = [-1, 1].map((s) => {
      const c = new THREE.Mesh(cableGeo, mat);
      c.position.set(spec.x + (s * spec.w) / 2.4, 0, zAt(ctx, spec.x, -0.5));
      return c;
    });
    ctx.group.add(deck, beam, ...cables);

    const set = (v: boolean) => {
      if (v !== up) ctx.sound('lift_motor', spec.x);
      up = v;
    };

    return {
      type: 'lift',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') set(true);
        else if (name === 'deactivate') set(false);
        else if (name === 'toggle') set(!up);
      },
      update(dt) {
        const target = up ? spec.travel : 0;
        const prev = pos;
        pos += Math.sign(target - pos) * Math.min(Math.abs(target - pos), spec.speed * dt);
        solid.dy = pos - prev;
        solid.minY = base + pos - DECK;
        solid.maxY = base + pos;
      },
      frame() {
        deck.position.set(spec.x, base + pos - DECK / 2, zAt(ctx, spec.x, -0.2));
        for (const c of cables) {
          c.position.y = base + pos;
          c.scale.y = Math.max(0.01, top - (base + pos));
        }
      },
      snapshot: () => ({ up, pos }),
      restore: (s) => {
        const st = s as { up: boolean; pos: number };
        up = st.up;
        pos = st.pos;
        solid.minY = base + pos - DECK;
        solid.maxY = base + pos;
      },
    };
  },
};
