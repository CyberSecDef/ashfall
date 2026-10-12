// A chain-link fence the child can't climb. With a gap at the bottom, there
// is just room to crawl under it.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const fence: EntityDefinition<'fence'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    const bottom = y + spec.gap;
    addSolid(ctx, {
      minX: spec.x - spec.w / 2,
      maxX: spec.x + spec.w / 2,
      minY: spec.gap > 0 ? bottom : y - 0.05,
      maxY: y + spec.h,
      climbable: false,
      tag: 'fence',
      blocksSight: false,
    });
    const g = new THREE.Group();
    const mat = silhouetteMaterial();
    // The fence runs into the screen, so draw it as a panel receding in depth.
    const post = new THREE.BoxGeometry(0.07, spec.h, 0.07);
    for (const z of [-1.2, 0.35]) {
      const p = new THREE.Mesh(post, mat);
      p.position.set(0, y + spec.h / 2, z);
      g.add(p);
    }
    const pts: number[] = [];
    const z0 = -1.2;
    const z1 = 0.35;
    const cell = 0.16;
    for (let z = z0 - (spec.h - spec.gap); z < z1; z += cell) {
      // Diamond mesh: two diagonal families, clipped to the panel.
      for (const sgn of [1, -1]) {
        const a = { z, y: sgn > 0 ? bottom : y + spec.h };
        const b = { z: z + (spec.h - spec.gap), y: sgn > 0 ? y + spec.h : bottom };
        const clip = (p: { z: number; y: number }, q: { z: number; y: number }) => {
          const t0 = Math.max(0, (z0 - p.z) / (q.z - p.z));
          const t1 = Math.min(1, (z1 - p.z) / (q.z - p.z));
          if (t1 <= t0) return;
          pts.push(0, p.y + (q.y - p.y) * t0, p.z + (q.z - p.z) * t0, 0, p.y + (q.y - p.y) * t1, p.z + (q.z - p.z) * t1);
        };
        clip(a, b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x151615 })));
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, z1 - z0), mat);
    rail.position.set(0, y + spec.h, (z0 + z1) / 2);
    g.add(rail);
    g.position.set(spec.x, 0, zAt(ctx, spec.x));
    ctx.group.add(g);
    return { type: 'fence', id: spec.id, x: spec.x };
  },
};
