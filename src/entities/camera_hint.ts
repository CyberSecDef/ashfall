// Camera hint zone: eases the camera to a framing while the child is inside
// [x, x + w], and back out on leaving. Slow pull-outs for reveals, push-ins
// for tension.

import type { EntityDefinition } from './types';

export const camera_hint: EntityDefinition<'camera_hint'> = {
  create(spec, ctx) {
    let inside = false;
    return {
      type: 'camera_hint',
      id: spec.id,
      x: spec.x,
      update() {
        const px = ctx.player.x;
        const now = px >= spec.x && px <= spec.x + spec.w;
        if (now && !inside) ctx.rig.hint({ zoom: spec.zoom, offsetY: spec.offsetY, offsetX: spec.offsetX }, spec.seconds);
        if (!now && inside) ctx.rig.clearHint(spec.exitSeconds);
        inside = now;
      },
    };
  },
};
