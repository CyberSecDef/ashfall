// A low gap the child must crawl through: under a fallen tree, a tipped slab,
// or an overturned car. The thing overhead is a ceiling solid at height h.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, extrude, jagged, silhouetteMaterial, zAt } from './visuals';

export const crawlspace: EntityDefinition<'crawlspace'> = {
  create(spec, ctx) {
    const y = Math.max(entityY(spec, ctx), ctx.terrain.heightAt(spec.x - spec.w / 2), ctx.terrain.heightAt(spec.x + spec.w / 2));
    const thick = spec.look === 'tree' ? 0.55 : 0.7;
    const bottom = y + spec.h;
    addSolid(ctx, { minX: spec.x - spec.w / 2, maxX: spec.x + spec.w / 2, minY: bottom, maxY: bottom + thick, climbable: true, tag: 'crawlspace' });
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    if (spec.look === 'tree') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.45, thick * 0.55, spec.w + 1.6, 10), mat);
      trunk.rotation.z = Math.PI / 2 + 0.04;
      trunk.position.set(0, thick / 2, -0.15);
      // Roots on one end, a broken crown on the other, both propping it up.
      const root = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), mat);
      root.scale.set(0.8, 1.4, 1);
      root.position.set(-spec.w / 2 - 0.9, -spec.h * 0.2, -0.2);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 5), mat);
      crown.rotation.z = -1.2;
      crown.position.set(spec.w / 2 + 0.9, -spec.h * 0.4, -0.3);
      g.add(trunk, root, crown);
    } else {
      const slab = new THREE.Mesh(extrude(jagged(spec.w + 0.6, thick, spec.x, 5), 1.2), mat);
      slab.position.set(-spec.w / 2 - 0.3, 0, 0);
      g.add(slab);
      for (const side of [-1, 1]) {
        const prop = new THREE.Mesh(new THREE.BoxGeometry(0.35, spec.h + 0.1, 0.8), mat);
        prop.position.set(side * (spec.w / 2 + 0.15), -spec.h / 2, -0.6);
        prop.rotation.z = side * 0.08;
        g.add(prop);
      }
    }
    g.position.set(spec.x, bottom, zAt(ctx, spec.x));
    ctx.group.add(g);
    return { type: 'crawlspace', id: spec.id, x: spec.x };
  },
};
