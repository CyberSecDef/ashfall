// A culvert or vent: crawl-only, and too narrow for dogs. Only the back half
// of the tube is drawn, plus the rims, so the child stays visible inside.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

export const pipe: EntityDefinition<'pipe'> = {
  create(spec, ctx) {
    const y = Math.max(entityY(spec, ctx), ctx.terrain.heightAt(spec.x - spec.w / 2), ctx.terrain.heightAt(spec.x + spec.w / 2));
    const r = spec.h / 2 + 0.08;
    addSolid(ctx, { minX: spec.x - spec.w / 2, maxX: spec.x + spec.w / 2, minY: y + spec.h, maxY: y + spec.h + 0.5, climbable: true, tag: 'pipe' });
    const mat = silhouetteMaterial(0x101110);
    mat.side = THREE.DoubleSide;
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r, r, spec.w, 16, 1, true, Math.PI, Math.PI), mat);
    back.rotation.z = Math.PI / 2;
    const rimGeo = new THREE.TorusGeometry(r, 0.06, 6, 18);
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(rimGeo, silhouetteMaterial());
      rim.rotation.y = Math.PI / 2;
      rim.position.x = (side * spec.w) / 2;
      g.add(rim);
    }
    // Earth heaped over the top.
    const mound = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.6, 0.45, 1.6), silhouetteMaterial());
    mound.position.set(0, r + 0.15, -0.5);
    g.add(back, mound);
    g.position.set(spec.x, y + r - 0.08, zAt(ctx, spec.x));
    ctx.group.add(g);
    return { type: 'pipe', id: spec.id, x: spec.x };
  },
};
