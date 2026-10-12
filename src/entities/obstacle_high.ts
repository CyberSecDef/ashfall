// An obstacle too tall to scramble: jump at it and the child grabs the top.

import { staticObstacle } from './obstacle_low';
import { obstacleShape } from './obstacle_shapes';
import type { EntityDefinition } from './types';
import { entityY } from './types';
import { extrude } from './visuals';

export const obstacle_high: EntityDefinition<'obstacle_high'> = {
  create(spec, ctx) {
    const y = entityY(spec, ctx);
    staticObstacle(ctx, spec.x, y, spec.w, spec.h, extrude(obstacleShape(spec.look, spec.w, spec.h + 0.05, spec.x)));
    return { type: 'obstacle_high', id: spec.id, x: spec.x };
  },
};
