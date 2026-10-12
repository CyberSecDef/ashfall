// A glowing fallout zone. Lingering raises grain and the Geiger crackle with
// no meter; after `lethalAfter` seconds the child collapses. Exposure fades
// once out of it. The glow is a pale, sickly grey-green: never saturated.

import * as THREE from 'three';
import type { Player } from '../engine/player';
import type { EntityDefinition } from './types';
import { glowMaterial, zAt } from './visuals';
import { waterSurface } from './water';

const GLOW = 0xa9b39c;

export const radiation_zone: EntityDefinition<'radiation_zone'> = {
  create(spec, ctx) {
    const x0 = spec.x;
    const x1 = spec.x + spec.w;
    const cx = (x0 + x1) / 2;
    // A pool fills the dip between the banks; otherwise the glow lies on the ground.
    const surface = spec.pool ? waterSurface(ctx, x0, x1, 0.3).surface : ctx.terrain.heightAt(cx);
    const ground = spec.pool ? surface : ctx.terrain.heightAt(cx);
    const glowMat = glowMaterial(GLOW, spec.pool ? 0.22 : 0.12);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, 2.4), glowMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, ground + 0.03, zAt(ctx, cx, -0.4));
    if (spec.pool) {
      const body = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, 1.2), glowMaterial(GLOW, 0.1));
      body.position.set(cx, surface - 0.6, zAt(ctx, cx, 0.8));
      ctx.group.add(body);
    }
    const hazeMat = glowMaterial(GLOW, 0.05);
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, 1.6), hazeMat);
    haze.position.set(cx, ground + 0.8, zAt(ctx, cx, -0.2));
    // Floating motes.
    const motes = new THREE.Group();
    const moteGeo = new THREE.SphereGeometry(0.02, 4, 3);
    const moteMat = glowMaterial(GLOW, 0.6);
    for (let i = 0; i < Math.ceil(spec.w * 5); i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      m.position.set(x0 + Math.random() * spec.w, ground + Math.random() * 1.4, zAt(ctx, cx, (Math.random() - 0.5) * 1.5));
      m.userData.phase = Math.random() * 10;
      motes.add(m);
    }
    ctx.group.add(pool, haze, motes);

    const exposure = new Map<Player, number>();
    let geiger = 0;
    return {
      type: 'radiation_zone',
      id: spec.id,
      x: spec.x,
      update(dt) {
        for (const a of ctx.actors) {
          if (a.dead) continue;
          // A pool only harms what's down in it.
          const inside = a.x >= x0 && a.x <= x1 && (!spec.pool || a.y < surface);
          const e = Math.max(0, (exposure.get(a) ?? 0) + (inside ? dt : -dt * 1.5));
          exposure.set(a, e);
          if (a === ctx.player) {
            ctx.effects.radiation = Math.max(ctx.effects.radiation, Math.min(1, e / spec.lethalAfter));
            if (inside) {
              geiger -= dt;
              if (geiger <= 0) {
                ctx.sound('geiger', a.x);
                geiger = 0.5 - 0.4 * Math.min(1, e / spec.lethalAfter);
              }
            }
          }
          if (e > spec.lethalAfter) ctx.kill(a, 'radiation');
        }
      },
      frame() {
        const t = ctx.time;
        glowMat.opacity = 0.1 + 0.04 * Math.sin(t * 1.3);
        for (const m of motes.children) {
          const p = m.userData.phase as number;
          m.position.y = ground + ((t * 0.15 + p) % 1.5);
        }
      },
    };
  },
};
