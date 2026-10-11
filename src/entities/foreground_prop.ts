// A hand-placed foreground silhouette, for framing a specific moment.

import { makeForegroundItem } from '../fx/layers';
import type { EntityDefinition } from './types';

export const foreground_prop: EntityDefinition<'foreground_prop'> = {
  create(spec, ctx) {
    const item = makeForegroundItem(spec.kind, spec.variant, spec.x, ctx.terrain.heightAt(spec.x), ctx.foregroundZ, spec.flip, spec.x * 7.31);
    if (spec.y !== undefined) item.mesh.position.y = spec.y;
    ctx.group.add(item.mesh);
    ctx.addForeground(item);
    return { type: 'foreground_prop', id: spec.id, x: spec.x };
  },
};
