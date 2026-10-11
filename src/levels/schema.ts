// The level schema. Every level file is parsed with `levelSchema` and then
// cross-checked by `validateLevel` (ids, targets, positions). Tests and the
// build run both over every level, so bad level data fails the build.

import { z } from 'zod';
import { entitySpec } from '../entities/params';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');

export const surfaceSchema = z.enum(['dirt', 'grass', 'concrete', 'water', 'gravel', 'metal']);

export const pathPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  surface: surfaceSchema.optional(),
  sharp: z.boolean().optional(),
  /** Visual only: shift the path toward (+) or away from (-) the camera, in meters. Gameplay stays on one plane. */
  depth: z.number().min(-4).max(2).optional(),
});

export const paletteSchema = z.object({
  sky: color,
  fog: color,
  ground: color,
  tint: color.optional(),
});

export const ambienceSchema = z.object({
  drone: z.string(),
  wind: z.number().min(0).max(1),
  ash: z.number().min(0).max(1),
  lightning: z.number().min(0).max(1),
});

export const propKind = z.enum([
  'skyline', 'mountains', 'smokestacks',
  'dead_trees', 'pylons', 'wrecked_buildings',
  'rocks', 'fence', 'trunks',
  'branches', 'grass', 'chainlink', 'wires', 'rubble',
]);

export const layerSpecSchema = z.object({
  kind: z.enum(['far', 'mid', 'near', 'foreground']),
  speed: z.number().positive().max(2),
  density: z.number().min(0),
  props: z.array(propKind).min(1),
  hills: z.number().min(0).optional(),
});

const cameraAction = z.object({
  action: z.literal('camera'),
  zoom: z.number().min(0.4).max(3).optional(),
  offsetY: z.number().optional(),
  offsetX: z.number().optional(),
  seconds: z.number().positive().default(3),
});

export const triggerSpecSchema = z.intersection(
  z.object({
    x: z.number(),
    w: z.number().positive().default(1),
    once: z.boolean().default(true),
  }),
  z.discriminatedUnion('action', [
    cameraAction,
    z.object({ action: z.literal('camera_clear'), seconds: z.number().positive().default(3) }),
    /** Send a signal to an entity by id (play a background event, open a gate). */
    z.object({ action: z.literal('signal'), target: z.string().min(1), signal: z.string().default('activate') }),
    z.object({ action: z.literal('lightning') }),
    /** Named sound cue; M5's audio engine plays it. */
    z.object({ action: z.literal('sound'), cue: z.string().min(1) }),
    /** Intensify grain and vignette (tension), 0 to 1. */
    z.object({ action: z.literal('tension'), amount: z.number().min(0).max(1) }),
  ]),
);

export const levelSchema = z.object({
  id: z.string().regex(/^L\d\d$/, 'level ids look like L01'),
  /** Internal only, never shown. */
  name: z.string(),
  palette: paletteSchema,
  ambience: ambienceSchema,
  layers: z.array(layerSpecSchema),
  path: z.array(pathPointSchema).min(2),
  spawn: z.object({ x: z.number() }),
  entities: z.array(entitySpec).default([]),
  triggers: z.array(triggerSpecSchema).default([]),
  checkpoints: z.array(z.number()).default([]),
  exit: z.object({ x: z.number(), next: z.string().optional() }),
});

/** What level files are written as (defaults optional). */
export type LevelInput = z.input<typeof levelSchema>;
/** A parsed level, with defaults filled in. */
export type Level = z.output<typeof levelSchema>;
export type TriggerSpec = z.output<typeof triggerSpecSchema>;
export type EntitySpec = Level['entities'][number];

/** Cross-field checks Zod can't express cleanly. Returns human-readable problems. */
export function validateLevel(level: Level, knownLevelIds: string[] = []): string[] {
  const errors: string[] = [];
  const where = (what: string) => `${level.id}: ${what}`;
  const xs = level.path.map((p) => p.x);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];

  for (let i = 1; i < xs.length; i++) {
    if (!(xs[i] > xs[i - 1])) errors.push(where(`path x must strictly increase (point ${i}: ${xs[i]} after ${xs[i - 1]})`));
  }
  const inside = (x: number, what: string) => {
    if (x < minX || x > maxX) errors.push(where(`${what} at x=${x} is outside the path (${minX}..${maxX})`));
  };
  inside(level.spawn.x, 'spawn');
  inside(level.exit.x, 'exit');
  if (level.exit.x <= level.spawn.x) errors.push(where('exit must be east of spawn'));
  level.checkpoints.forEach((x, i) => inside(x, `checkpoint ${i}`));

  const ids = new Set<string>();
  for (const e of level.entities) {
    inside(e.x, `${e.type}${e.id ? ` "${e.id}"` : ''}`);
    if (e.id) {
      if (ids.has(e.id)) errors.push(where(`duplicate entity id "${e.id}"`));
      ids.add(e.id);
    }
  }
  for (const e of level.entities) {
    if (e.target && !ids.has(e.target)) errors.push(where(`${e.type} targets unknown id "${e.target}"`));
  }
  for (const t of level.triggers) {
    inside(t.x, `trigger (${t.action})`);
    if (t.action === 'signal' && !ids.has(t.target)) errors.push(where(`trigger targets unknown id "${t.target}"`));
  }
  const memories = level.entities.filter((e) => e.type === 'memory_collectible');
  if (memories.length > 1) errors.push(where('a level has at most one hidden memory'));
  for (const m of memories) if (!m.id) errors.push(where('memory_collectible needs an id (it is saved by id)'));
  if (level.exit.next && knownLevelIds.length && !knownLevelIds.includes(level.exit.next)) {
    errors.push(where(`exit.next "${level.exit.next}" is not a known level`));
  }
  return errors;
}

/** Parse + validate, throwing one readable error listing every problem. */
export function loadLevel(input: unknown, knownLevelIds: string[] = []): Level {
  const parsed = levelSchema.safeParse(input);
  if (!parsed.success) {
    const id = (input as { id?: string })?.id ?? '?';
    throw new Error(`${id}: invalid level data\n${z.prettifyError(parsed.error)}`);
  }
  const errors = validateLevel(parsed.data, knownLevelIds);
  if (errors.length) throw new Error(errors.join('\n'));
  return parsed.data;
}
