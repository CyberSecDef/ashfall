// Entity registry: every type in params.ts maps to its behavior. The mapped
// type makes a missing behavior a compile error.

import { background_event } from './background_event';
import { camera_hint } from './camera_hint';
import { checkpoint } from './checkpoint';
import { foreground_prop } from './foreground_prop';
import { memory_collectible } from './memory_collectible';
import type { EntityType } from './params';
import type { Entity, EntityDefinition, LevelContext } from './types';
import type { EntitySpec } from '../levels/schema';

export const registry: { [K in EntityType]: EntityDefinition<K> } = {
  checkpoint,
  camera_hint,
  background_event,
  foreground_prop,
  memory_collectible,
};

export function createEntity(spec: EntitySpec, ctx: LevelContext): Entity {
  const def = registry[spec.type] as EntityDefinition<typeof spec.type>;
  return def.create(spec as never, ctx);
}
