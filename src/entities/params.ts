// Parameter schemas for every entity type. Pure Zod with no Three.js, so
// level validation runs anywhere (tests, build). The registry (registry.ts)
// pairs each type here with its behavior; a test checks the two stay in sync.
//
// Adding a mechanic = add its params here + a behavior file + register it.

import { z } from 'zod';

/** Fields every entity has. `x` is along the path; `y` defaults to the ground there. */
export const entityBase = z.object({
  id: z.string().min(1).optional(),
  x: z.number(),
  y: z.number().optional(),
  /** Id of another entity this one sends signals to (a lever opening a gate, a trigger playing an event). */
  target: z.string().min(1).optional(),
});

const cameraFraming = {
  zoom: z.number().min(0.4).max(3).optional(),
  offsetY: z.number().min(-5).max(8).optional(),
  offsetX: z.number().min(-10).max(10).optional(),
};

export const entityParams = {
  /** Invisible respawn point. Passing it saves progress. */
  checkpoint: z.object({}),

  /** A zone that eases the camera to a framing while the child is inside it. */
  camera_hint: z.object({
    w: z.number().positive(),
    ...cameraFraming,
    /** Seconds to ease in and out. */
    seconds: z.number().positive().default(3),
    exitSeconds: z.number().positive().default(3),
  }),

  /** A wordless story moment in the background: plays when signalled, or when the child reaches `autoplayAt`. */
  background_event: z.object({
    kind: z.enum(['convoy', 'marchers', 'airship']),
    /** Scroll speed of the layer it plays in (same meaning as LayerSpec.speed). */
    speed: z.number().min(0.05).max(0.95).default(0.3),
    /** Width of the event's travel, in its own layer's meters. */
    span: z.number().positive().default(40),
    duration: z.number().positive().default(14),
    /** Play automatically once the child passes this x (instead of waiting for a signal). */
    autoplayAt: z.number().optional(),
  }),

  /** A hand-placed foreground silhouette (on top of the layer's random ones). */
  foreground_prop: z.object({
    kind: z.enum(['branches', 'grass', 'chainlink', 'wires', 'rubble']),
    variant: z.number().int().min(0).max(2).default(0),
    flip: z.boolean().default(false),
  }),

  /** The level's one hidden memory: a child's drawing, a toy. Walk into it to keep it. */
  memory_collectible: z.object({
    kind: z.enum(['toy_rabbit', 'drawing', 'mitten', 'music_box', 'photo']),
  }),
} as const;

export type EntityType = keyof typeof entityParams;
export const ENTITY_TYPES = Object.keys(entityParams) as EntityType[];

const variant = <T extends EntityType>(type: T) =>
  entityBase.extend({ type: z.literal(type) }).extend(entityParams[type].shape as (typeof entityParams)[T]['shape']);

/** A level's entity entry: base fields plus the params of its type. Add new types here too. */
export const entitySpec = z.discriminatedUnion('type', [
  variant('checkpoint'),
  variant('camera_hint'),
  variant('background_event'),
  variant('foreground_prop'),
  variant('memory_collectible'),
]);

export type EntitySpecOf<T extends EntityType> = Extract<z.output<typeof entitySpec>, { type: T }>;
