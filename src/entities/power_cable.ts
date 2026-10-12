// A power cable lying across the ground from x to its target. Any signal it
// receives runs along it as a pale flicker and arrives at the target after
// `delay` seconds: it makes cause and effect visible.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { PALE, glowMaterial, silhouetteMaterial, zAt } from './visuals';

export const power_cable: EntityDefinition<'power_cable'> = {
  create(spec, ctx) {
    const targetSpec = ctx.level.entities.find((e) => e.id === spec.target);
    const x0 = spec.x;
    const x1 = targetSpec?.x ?? spec.x + 4;
    const pts: THREE.Vector3[] = [];
    const n = Math.max(4, Math.ceil(Math.abs(x1 - x0) / 0.4));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = (i === 0 ? entityY(spec, ctx) : ctx.terrain.heightAt(x)) + 0.03 + Math.sin(i * 1.7) * 0.015;
      pts.push(new THREE.Vector3(x, y, zAt(ctx, x, -0.45)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, n * 2, 0.02, 4), silhouetteMaterial());
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glowMaterial(PALE, 0.9));
    spark.visible = false;
    ctx.group.add(cable, spark);

    const pending: Array<{ signal: string; t: number }> = [];
    return {
      type: 'power_cable',
      id: spec.id,
      x: spec.x,
      signal(name) {
        pending.push({ signal: name, t: 0 });
        ctx.sound('hum', spec.x);
      },
      update(dt) {
        for (let i = pending.length - 1; i >= 0; i--) {
          const p = pending[i];
          p.t += dt;
          if (p.t >= spec.delay) {
            pending.splice(i, 1);
            if (spec.target) ctx.signal(spec.target, p.signal, spec.id);
          }
        }
      },
      frame() {
        const p = pending[0];
        spark.visible = !!p && spec.delay > 0;
        if (p) spark.position.copy(curve.getPointAt(Math.min(1, p.t / Math.max(spec.delay, 0.01))));
        spark.scale.setScalar(0.7 + Math.random() * 0.6);
      },
    };
  },
};
