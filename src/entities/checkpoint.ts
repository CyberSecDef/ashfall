// Checkpoint: an invisible respawn point. The level manager gathers these
// (plus the level's `checkpoints` list) and saves progress when the child
// passes one, so the entity itself has no behavior.

import type { EntityDefinition } from './types';

export const checkpoint: EntityDefinition<'checkpoint'> = {
  create: (spec) => ({ type: 'checkpoint', id: spec.id, x: spec.x }),
};
