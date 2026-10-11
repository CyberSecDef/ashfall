// Level data types, inferred from the Zod schema so the two can't drift.

import type { z } from 'zod';
import type { ambienceSchema, layerSpecSchema, paletteSchema, propKind } from './schema';

export type Palette = z.output<typeof paletteSchema>;
export type Ambience = z.output<typeof ambienceSchema>;
export type LayerSpec = z.output<typeof layerSpecSchema>;
export type LayerKind = LayerSpec['kind'];
export type PropKind = z.output<typeof propKind>;
export type { Level, LevelInput, TriggerSpec, EntitySpec } from './schema';
