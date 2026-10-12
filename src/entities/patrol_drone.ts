// A patrol drone flying between `from` and `to` at `height` above the ground,
// shining a light straight down. Caught in it (not hidden) = fatal.

import * as THREE from 'three';
import { canSeeChild, spotTimer } from './sight';
import type { EntityDefinition } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const patrol_drone: EntityDefinition<'patrol_drone'> = {
  create(spec, ctx) {
    let x = spec.x;
    let dir = spec.to >= spec.from ? 1 : -1;
    let pause = 0;
    const lo = Math.min(spec.from, spec.to);
    const hi = Math.max(spec.from, spec.to);
    const spotted = spotTimer(0.35);
    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat);
    hull.scale.set(1.4, 0.6, 1);
    const rotors: THREE.Mesh[] = [];
    for (const dx of [-0.45, 0.45]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.05), mat);
      arm.position.set(dx * 0.6, 0.05, 0);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.04), mat);
      rotor.position.set(dx, 0.1, 0);
      rotors.push(rotor);
      g.add(arm, rotor);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), glowMaterial(PALE, 0.9));
    lamp.position.y = -0.15;
    g.add(hull, lamp);
    const coneGeo = new THREE.ConeGeometry(0.9, 1, 16, 1, true);
    coneGeo.translate(0, -0.5, 0);
    const cone = new THREE.Mesh(coneGeo, glowMaterial(PALE, 0.07));
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), glowMaterial(PALE, 0.15));
    pool.rotation.x = -Math.PI / 2;
    ctx.group.add(g, cone, pool);

    return {
      type: 'patrol_drone',
      id: spec.id,
      x: spec.x,
      debug: () => ({ x, dir, pause }),
      update(dt) {
        if (pause > 0) pause -= dt;
        else {
          x += dir * spec.speed * dt;
          if (x > hi || x < lo) {
            x = Math.min(hi, Math.max(lo, x));
            dir = -dir as 1 | -1;
            pause = 1.2;
          }
        }
        const c = ctx.player;
        const gy = ctx.terrain.heightAt(x);
        const inLight = Math.abs(c.x - x) < 0.85;
        if (spotted(inLight && canSeeChild(ctx, x, gy + spec.height), dt)) ctx.kill(c, 'shot');
      },
      frame() {
        const gy = ctx.terrain.heightAt(x);
        const y = gy + spec.height + Math.sin(ctx.time * 2.1) * 0.06;
        const z = zAt(ctx, x, 0.1);
        g.position.set(x, y, z);
        g.rotation.z = -dir * (pause > 0 ? 0 : 0.12);
        for (const r of rotors) r.rotation.y += 0.9;
        cone.position.set(x, y - 0.15, z);
        cone.scale.set(1, y - 0.15 - gy, 1);
        pool.position.set(x, gy + 0.02, zAt(ctx, x));
      },
    };
  },
};
