// Deep water: anything that stays under for `drownAfter` seconds drowns.

import type { Player } from '../engine/player';
import type { EntityDefinition, WaterZone } from './types';
import { waterMesh, waterSurface } from './water';

export const deep_water: EntityDefinition<'deep_water'> = {
  create(spec, ctx) {
    const x0 = spec.x;
    const x1 = spec.x + spec.w;
    const { surface, bottom } = waterSurface(ctx, x0, x1, 1.5);
    const zone: WaterZone = { minX: x0, maxX: x1, y: surface, deep: true };
    ctx.addWater(zone);
    ctx.group.add(waterMesh(ctx, x0, x1, surface, bottom, true));
    const under = new Map<Player, number>();
    return {
      type: 'deep_water',
      id: spec.id,
      x: spec.x,
      update(dt) {
        for (const a of ctx.actors) {
          if (a.dead) continue;
          const submerged = a.x >= x0 && a.x <= x1 && a.y + a.height * 0.7 < surface;
          if (!submerged) {
            under.delete(a);
            continue;
          }
          if (!under.has(a)) ctx.sound('splash_deep');
          const t = (under.get(a) ?? 0) + dt;
          under.set(a, t);
          if (t > spec.drownAfter) ctx.kill(a, 'drown');
        }
      },
    };
  },
};
