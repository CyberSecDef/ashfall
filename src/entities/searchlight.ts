// A watchtower searchlight sweeping the ground between x - sweep and x + sweep.
// Standing in the pool of light (not hidden, not behind cover) for half a
// second is fatal. 'deactivate' switches it off; 'activate' back on.

import * as THREE from 'three';
import { canSeeChild, spotTimer } from './sight';
import type { EntityDefinition } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const searchlight: EntityDefinition<'searchlight'> = {
  create(spec, ctx) {
    const base = ctx.terrain.heightAt(spec.x);
    const lampY = base + spec.height;
    let on = spec.on;
    let spotX = spec.x;
    const spotted = spotTimer(0.5);

    const mat = silhouetteMaterial();
    const tower = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.08, spec.height, 0.08);
    for (const dx of [-0.5, 0.5]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(dx, spec.height / 2, 0);
      leg.rotation.z = -dx * 0.1;
      tower.add(leg);
    }
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.2), mat);
    cabin.position.y = spec.height + 0.3;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.5, 4), mat);
    roof.position.y = spec.height + 1.0;
    roof.rotation.y = Math.PI / 4;
    tower.add(cabin, roof);
    tower.position.set(spec.x, base, zAt(ctx, spec.x, -2.5));

    // Beam: a long soft quad from the lamp to the ground spot.
    const beamGeo = new THREE.PlaneGeometry(1, 1);
    beamGeo.translate(0, -0.5, 0);
    const beamMat = glowMaterial(PALE, 0.12);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), glowMaterial(PALE, 0.18));
    pool.rotation.x = -Math.PI / 2;
    ctx.group.add(tower, beam, pool);

    return {
      type: 'searchlight',
      id: spec.id,
      x: spec.x,
      signal(name) {
        if (name === 'activate') on = true;
        if (name === 'deactivate') on = false;
        if (name === 'toggle') on = !on;
      },
      update(dt) {
        spotX = spec.x + spec.sweep * Math.sin((ctx.time / spec.period) * Math.PI * 2 + spec.phase);
        const c = ctx.player;
        const inPool = on && Math.abs(c.x - spotX) < 1.1;
        if (spotted(inPool && canSeeChild(ctx, spec.x, lampY), dt)) ctx.kill(c, 'shot');
      },
      frame() {
        beam.visible = pool.visible = on;
        if (!on) return;
        const gy = ctx.terrain.heightAt(spotX);
        const z = zAt(ctx, spotX);
        const dx = spotX - spec.x;
        const dy = gy - lampY;
        const len = Math.hypot(dx, dy);
        beam.position.set(spec.x, lampY, zAt(ctx, spec.x, -2.4) * 0.5 + z * 0.5);
        beam.scale.set(1.6, len, 1);
        beam.rotation.z = Math.atan2(dx, -dy);
        pool.position.set(spotX, gy + 0.02, z);
      },
    };
  },
};
