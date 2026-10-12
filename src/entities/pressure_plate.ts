// A pressure plate: held down by any actor or box resting on it. Sends
// 'activate' when pressed and 'deactivate' when released.

import * as THREE from 'three';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { addSolid, silhouetteMaterial, zAt } from './visuals';

const PLATE_H = 0.06;

export const pressure_plate: EntityDefinition<'pressure_plate'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    const top = y + PLATE_H;
    const minX = spec.x - spec.w / 2;
    const maxX = spec.x + spec.w / 2;
    addSolid(ctx, { minX, maxX, minY: y - 0.1, maxY: top, climbable: true, tag: 'plate', blocksSight: false });
    const mat = silhouetteMaterial(0x161816);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(spec.w, PLATE_H, 0.9), mat);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.12, 0.03, 1.0), silhouetteMaterial());
    plate.position.set(spec.x, y + PLATE_H / 2, zAt(ctx, spec.x, -0.2));
    frame.position.set(spec.x, y + 0.015, zAt(ctx, spec.x, -0.2));
    ctx.group.add(plate, frame);
    let pressed = false;
    let sink = 0;

    const weighed = () => {
      for (const a of ctx.actors) {
        if (a.grounded && Math.abs(a.y - top) < 0.07 && a.x + a.params.halfWidth > minX && a.x - a.params.halfWidth < maxX) return true;
      }
      for (const s of ctx.collision.solids) {
        if (!s.enabled || s.tag === 'plate' || s.tag === 'obstacle') continue;
        if (Math.abs(s.minY - top) < 0.07 && s.maxX > minX + 0.05 && s.minX < maxX - 0.05) return true;
      }
      return false;
    };

    return {
      type: 'pressure_plate',
      id: spec.id,
      x: spec.x,
      update() {
        const now = weighed();
        if (now !== pressed) {
          pressed = now;
          ctx.sound(pressed ? 'plate_down' : 'plate_up', spec.x);
          if (spec.target) ctx.signal(spec.target, pressed ? 'activate' : 'deactivate', spec.id);
        }
      },
      frame(dt) {
        sink += ((pressed ? 1 : 0) - sink) * (1 - Math.exp(-dt * 14));
        plate.position.y = y + PLATE_H / 2 - sink * 0.04;
      },
    };
  },
};
