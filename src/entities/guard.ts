// A guard walking a beat between `from` and `to`, pausing at each end. Looks
// ahead up to `sight` meters; spotting the child (not hidden, not behind
// cover) for a moment is fatal.

import * as THREE from 'three';
import { canSeeChild, spotTimer } from './sight';
import type { EntityDefinition } from './types';
import { silhouetteMaterial, zAt } from './visuals';

export const guard: EntityDefinition<'guard'> = {
  create(spec, ctx) {
    let x = spec.x;
    let dir: 1 | -1 = spec.to >= spec.x ? 1 : -1;
    let pause = 0;
    let phase = 0;
    const lo = Math.min(spec.from, spec.to);
    const hi = Math.max(spec.from, spec.to);
    const spotted = spotTimer(0.4);
    let alerted = 0;

    const mat = silhouetteMaterial();
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 8), mat);
    torso.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat);
    head.position.y = 1.72;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    helmet.position.y = 1.74;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), mat);
    visor.position.set(0.12, 1.7, 0);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.05), mat);
    rifle.position.set(0.25, 1.15, 0.2);
    rifle.rotation.z = -0.35;
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.6, 3, 6);
    legGeo.translate(0, -0.38, 0);
    const legs = [0.08, -0.08].map((z) => {
      const l = new THREE.Mesh(legGeo, mat);
      l.position.set(0, 0.8, z);
      g.add(l);
      return l;
    });
    g.add(torso, head, helmet, visor, rifle);
    ctx.group.add(g);

    return {
      type: 'guard',
      id: spec.id,
      x: spec.x,
      debug: () => ({ x, dir, pause }),
      update(dt) {
        const c = ctx.player;
        if (alerted > 0) {
          alerted += dt;
          return;
        }
        if (pause > 0) {
          pause -= dt;
          if (pause <= 0) dir = -dir as 1 | -1;
        } else {
          x += dir * spec.speed * dt;
          if ((dir > 0 && x >= hi) || (dir < 0 && x <= lo)) {
            x = Math.min(hi, Math.max(lo, x));
            pause = 1.8;
          }
        }
        const gy = ctx.terrain.heightAt(x);
        const ahead = (c.x - x) * dir;
        const inView = ahead > -0.3 && ahead < spec.sight && Math.abs(c.y - gy) < 2.2;
        if (spotted(inView && canSeeChild(ctx, x, gy + 1.65), dt)) {
          alerted = 0.001;
          ctx.sound('guard_shout');
          ctx.kill(c, 'shot');
        }
      },
      frame(dt) {
        const gy = ctx.terrain.heightAt(x);
        const walking = pause <= 0 && alerted === 0;
        phase += dt * (walking ? 6 : 0);
        g.position.set(x, gy, zAt(ctx, x, 0.05));
        g.scale.x = dir;
        legs[0].rotation.z = Math.sin(phase) * 0.4 * (walking ? 1 : 0);
        legs[1].rotation.z = -Math.sin(phase) * 0.4 * (walking ? 1 : 0);
        rifle.rotation.z = alerted > 0 ? 0 : -0.35;
      },
    };
  },
};
