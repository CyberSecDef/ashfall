// A hanging rope: climbable up and down, let go by pressing sideways. It sways.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { silhouetteMaterial, zAt } from './visuals';

export const rope: EntityDefinition<'rope'> = {
  create(spec, ctx) {
    const top = spec.top ?? ctx.terrain.heightAt(spec.x) + spec.length + 0.3;
    const bottom = top - spec.length;
    ctx.addLadder({ x: spec.x, bottom: Math.min(bottom, ctx.terrain.heightAt(spec.x)), top, rope: true });
    const geo = new THREE.CylinderGeometry(0.025, 0.03, spec.length, 5);
    geo.translate(0, -spec.length / 2, 0);
    const mesh = new THREE.Mesh(geo, silhouetteMaterial());
    mesh.position.set(spec.x, top, zAt(ctx, spec.x, -0.1));
    ctx.group.add(mesh);
    return {
      type: 'rope',
      id: spec.id,
      x: spec.x,
      frame() {
        const climbing = ctx.actors.some((a) => a.ladder && a.ladder.x === spec.x);
        mesh.rotation.z = climbing ? 0 : Math.sin(ctx.time * 0.8 + spec.x) * 0.03;
      },
    };
  },
};
