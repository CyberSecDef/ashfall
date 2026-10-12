// Entity registry: every type in params.ts maps to its behavior. The mapped
// type makes a missing behavior a compile error.

import type { EntitySpec } from '../levels/schema';
import { background_event } from './background_event';
import { body } from './body';
import { boulder } from './boulder';
import { camera_hint } from './camera_hint';
import { cart } from './cart';
import { checkpoint } from './checkpoint';
import { conveyor } from './conveyor';
import { cover } from './cover';
import { crate } from './crate';
import { crawlspace } from './crawlspace';
import { deep_water } from './deep_water';
import { dormant_body } from './dormant_body';
import { draggable_log } from './draggable_log';
import { fall_height } from './fall_height';
import { falling_debris } from './falling_debris';
import { fence } from './fence';
import { feral_dog } from './feral_dog';
import { foreground_prop } from './foreground_prop';
import { gate } from './gate';
import { guard } from './guard';
import { ladder } from './ladder';
import { lever } from './lever';
import { lift } from './lift';
import { log } from './log';
import { memory_collectible } from './memory_collectible';
import { obstacle_high } from './obstacle_high';
import { obstacle_low } from './obstacle_low';
import type { EntityType } from './params';
import { patrol_drone } from './patrol_drone';
import { pipe } from './pipe';
import { power_cable } from './power_cable';
import { pressure_plate } from './pressure_plate';
import { radiation_zone } from './radiation_zone';
import { relay_transmitter } from './relay_transmitter';
import { rope } from './rope';
import { searchlight } from './searchlight';
import type { Entity, EntityDefinition, LevelContext } from './types';
import { valve } from './valve';
import { water } from './water';
import { wire_trap } from './wire_trap';

export const registry: { [K in EntityType]: EntityDefinition<K> } = {
  checkpoint,
  camera_hint,
  background_event,
  foreground_prop,
  memory_collectible,
  obstacle_low,
  obstacle_high,
  log,
  boulder,
  fence,
  crawlspace,
  pipe,
  water,
  ladder,
  rope,
  crate,
  cart,
  draggable_log,
  body,
  lever,
  valve,
  pressure_plate,
  gate,
  lift,
  conveyor,
  power_cable,
  radiation_zone,
  falling_debris,
  wire_trap,
  deep_water,
  fall_height,
  feral_dog,
  searchlight,
  patrol_drone,
  guard,
  cover,
  relay_transmitter,
  dormant_body,
};

export function createEntity(spec: EntitySpec, ctx: LevelContext): Entity {
  const def = registry[spec.type] as EntityDefinition<typeof spec.type>;
  return def.create(spec as never, ctx);
}
