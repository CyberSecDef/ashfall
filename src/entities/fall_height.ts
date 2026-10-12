// A bottomless drop: anything that falls below `killY` inside [x, x + w] dies.

import type { EntityDefinition } from './types';

export const fall_height: EntityDefinition<'fall_height'> = {
  create(spec, ctx) {
    return {
      type: 'fall_height',
      id: spec.id,
      x: spec.x,
      update() {
        for (const a of ctx.actors) {
          if (!a.dead && a.x >= spec.x && a.x <= spec.x + spec.w && a.y < spec.killY) ctx.kill(a, 'fall');
        }
      },
    };
  },
};
