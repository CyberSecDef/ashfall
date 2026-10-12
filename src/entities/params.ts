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

  // ---- terrain and obstacles ----------------------------------------------------

  /** Knee-to-chest high: the child scrambles over it automatically. */
  obstacle_low: z.object({
    w: z.number().positive().default(1),
    h: z.number().positive().max(0.62).default(0.5),
    look: z.enum(['rubble', 'car', 'wall', 'barrel', 'slab']).default('rubble'),
  }),
  /** Too tall to scramble: jump and grab the top. */
  obstacle_high: z.object({
    w: z.number().positive().default(1.2),
    h: z.number().positive().default(1.0),
    look: z.enum(['rubble', 'car', 'wall', 'barrel', 'slab']).default('wall'),
  }),
  /** A fallen trunk lying across the path. */
  log: z.object({ w: z.number().positive().default(2.4), h: z.number().positive().default(0.42) }),
  boulder: z.object({ w: z.number().positive().default(1.1), h: z.number().positive().default(0.8) }),
  /** A fence the child can't climb. With `gap`, there is room to crawl under it. */
  fence: z.object({
    h: z.number().positive().default(1.7),
    gap: z.number().min(0).max(0.6).default(0),
    w: z.number().positive().default(0.25),
  }),
  /** A low space (a fallen tree, a slab, a wreck) the child must crawl through. */
  crawlspace: z.object({
    w: z.number().positive(),
    h: z.number().min(0.46).max(0.9).default(0.55),
    look: z.enum(['tree', 'slab', 'car']).default('tree'),
  }),
  /** A culvert or vent: crawl-only, too narrow for dogs. */
  pipe: z.object({ w: z.number().positive(), h: z.number().min(0.46).max(0.8).default(0.6) }),
  /** Shallow water: slows the child, splashes. */
  water: z.object({ w: z.number().positive(), depth: z.number().positive().max(0.5).default(0.25) }),
  ladder: z.object({ h: z.number().positive() }),
  /** A hanging rope from `top` (default: h above the ground), climbable but no standing at the top. */
  rope: z.object({ length: z.number().positive(), top: z.number().optional() }),

  // ---- movable ---------------------------------------------------------------

  crate: z.object({ w: z.number().positive().default(0.8), h: z.number().positive().default(0.6), mass: z.number().positive().default(1) }),
  /** Rolls a little after a push. */
  cart: z.object({ w: z.number().positive().default(1.3), h: z.number().positive().default(0.6), mass: z.number().positive().default(1.5) }),
  draggable_log: z.object({ w: z.number().positive().default(2.6), h: z.number().positive().default(0.35), mass: z.number().positive().default(1.4) }),
  /** A limp body. Heavy, low; weighs down plates. */
  body: z.object({ w: z.number().positive().default(1.1), h: z.number().positive().default(0.3), mass: z.number().positive().default(1.6) }),

  // ---- mechanisms --------------------------------------------------------------

  /** Tap to flip: sends 'activate' when on, 'deactivate' when off. */
  lever: z.object({ on: z.boolean().default(false), once: z.boolean().default(false) }),
  /** Tap to turn: sends 'activate' once, after a slow turn. */
  valve: z.object({ turnTime: z.number().positive().default(1.2) }),
  /** Held down by any actor or box standing on it: 'activate' on press, 'deactivate' on release. */
  pressure_plate: z.object({ w: z.number().positive().default(1) }),
  /** Opens on 'activate', closes on 'deactivate', flips on 'toggle'. */
  gate: z.object({ w: z.number().positive().default(0.3), h: z.number().positive().default(2.6), open: z.boolean().default(false) }),
  /** A platform that rises `travel` meters on 'activate' and sinks on 'deactivate', carrying riders. */
  lift: z.object({
    w: z.number().positive().default(1.6),
    travel: z.number().positive(),
    speed: z.number().positive().default(0.8),
    up: z.boolean().default(false),
  }),
  /** A belt that carries whatever stands on it while running. */
  conveyor: z.object({ w: z.number().positive(), speed: z.number().default(1.0), on: z.boolean().default(false) }),
  /** Carries a signal along to its target after a short delay (a visible flicker runs along it). */
  power_cable: z.object({ delay: z.number().min(0).default(0.6) }),

  // ---- hazards -----------------------------------------------------------------

  /** Glowing fallout: lingering intensifies grain and the Geiger crackle; collapse after `lethalAfter` seconds. */
  radiation_zone: z.object({ w: z.number().positive(), lethalAfter: z.number().positive().default(3) }),
  /** Rubble that falls on 'activate' (or when the child passes `triggerAt`), killing anything below; it stays as an obstacle. */
  falling_debris: z.object({
    w: z.number().positive().default(1.2),
    h: z.number().positive().default(0.5),
    dropHeight: z.number().positive().default(7),
    delay: z.number().min(0).default(0.5),
    triggerAt: z.number().optional(),
  }),
  /** An ankle-high tripwire. Walking or crawling through it trips it (signals `target`, or kills); jump it. */
  wire_trap: z.object({ h: z.number().positive().default(0.18) }),
  deep_water: z.object({ w: z.number().positive(), drownAfter: z.number().positive().default(1.2) }),
  /** Anything that drops below `killY` inside [x, x + w] dies (bottomless pits). */
  fall_height: z.object({ w: z.number().positive(), killY: z.number() }),

  // ---- threats -------------------------------------------------------------------

  /** Sleeps until the child comes within `range` (or it gets 'activate'), then chases. Can't crawl, can't climb. */
  feral_dog: z.object({
    range: z.number().positive().default(7),
    speed: z.number().positive().default(3.9),
    giveUpAfter: z.number().positive().default(4),
    /** false: sleeps through anything until signalled (walk right past it). */
    wakeOnSight: z.boolean().default(true),
  }),
  /** A tower light sweeping the ground between x - sweep and x + sweep. Lingering in the beam (not hidden) is fatal. */
  searchlight: z.object({
    height: z.number().positive().default(7),
    sweep: z.number().positive().default(6),
    period: z.number().positive().default(7),
    phase: z.number().default(0),
    on: z.boolean().default(true),
  }),
  /** Flies between `from` and `to` with a downward light. */
  patrol_drone: z.object({ from: z.number(), to: z.number(), height: z.number().positive().default(3.2), speed: z.number().positive().default(1.3) }),
  /** Walks between `from` and `to`, looking ahead; spotting the child is fatal. */
  guard: z.object({ from: z.number(), to: z.number(), speed: z.number().positive().default(0.9), sight: z.number().positive().default(7) }),
  /** Somewhere to hide: tall grass (crawl in it), deep shadow (keep still or crawl), or a wreck (always hidden). */
  cover: z.object({ w: z.number().positive(), kind: z.enum(['grass', 'shadow', 'wreck']).default('grass') }),

  // ---- relay ---------------------------------------------------------------------

  /** Picking it up grants the relay: tap a dormant body to control it. */
  relay_transmitter: z.object({}),
  /** An inert pre-war worker drone or hollow survivor that the relay can take over. */
  dormant_body: z.object({ kind: z.enum(['drone', 'survivor']).default('drone') }),
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
  variant('obstacle_low'),
  variant('obstacle_high'),
  variant('log'),
  variant('boulder'),
  variant('fence'),
  variant('crawlspace'),
  variant('pipe'),
  variant('water'),
  variant('ladder'),
  variant('rope'),
  variant('crate'),
  variant('cart'),
  variant('draggable_log'),
  variant('body'),
  variant('lever'),
  variant('valve'),
  variant('pressure_plate'),
  variant('gate'),
  variant('lift'),
  variant('conveyor'),
  variant('power_cable'),
  variant('radiation_zone'),
  variant('falling_debris'),
  variant('wire_trap'),
  variant('deep_water'),
  variant('fall_height'),
  variant('feral_dog'),
  variant('searchlight'),
  variant('patrol_drone'),
  variant('guard'),
  variant('cover'),
  variant('relay_transmitter'),
  variant('dormant_body'),
]);

export type EntitySpecOf<T extends EntityType> = Extract<z.output<typeof entitySpec>, { type: T }>;
