// L00 — sandbox. Not part of the story: a test level that holds one of every
// entity type and every background prop kind, plus terrain features to try
// movement on (hills, a ditch, a ledge to grab, a steep bank, a drop, and a
// stretch where the path bends toward and away from the camera).
// Reach it from the debug menu.

import type { LevelInput } from './schema';

const path: LevelInput['path'] = [
  { x: -6, y: 0 },
  { x: 0, y: 0 },
  { x: 6, y: 0.6 },
  { x: 11, y: 1.4, surface: 'grass' },
  { x: 16, y: 0.8, surface: 'grass' },
  { x: 20, y: 0.2 },
  // Ditch: jump across it, or drop in and scramble out (0.55 m deep).
  { x: 22, y: 0.1, sharp: true },
  { x: 22.1, y: -0.45, sharp: true },
  { x: 23.9, y: -0.45, sharp: true },
  { x: 24, y: 0.1, sharp: true },
  { x: 28, y: 0.3, surface: 'concrete' },
  // Ledge: about 1 m high, too tall to scramble; jump and grab the edge.
  { x: 31, y: 0.3, surface: 'concrete', sharp: true },
  { x: 31.05, y: 1.3, surface: 'concrete', sharp: true },
  { x: 36, y: 1.3, surface: 'concrete' },
  // Long descent into a hollow, then a climb out.
  { x: 42, y: -0.6, surface: 'gravel' },
  { x: 47, y: -1.0, surface: 'dirt' },
  { x: 52, y: 0.4, surface: 'grass' },
  // Bank too steep to walk up, with a step to jump.
  { x: 55, y: 0.5, sharp: true },
  { x: 55.6, y: 1.3, sharp: true },
  { x: 60, y: 1.6, surface: 'grass' },
  // Drop off a rubble edge.
  { x: 64, y: 1.6, surface: 'concrete', sharp: true },
  { x: 64.05, y: 0, surface: 'dirt', sharp: true },
  // The path bends away from the camera, then toward it (visual only).
  { x: 72, y: 0.3 },
  { x: 80, y: -0.2, depth: -2.5 },
  { x: 90, y: 0.2, depth: -2.5 },
  { x: 98, y: 0, depth: 1.2 },
  { x: 106, y: 0.3, depth: 0 },
  { x: 114, y: 0 },
  // ---- M4 gallery: one station per entity family, a checkpoint at each ----
  // Obstacles (116-140) on flat ground.
  { x: 140, y: 0 },
  // Water (141-146): a shallow dip.
  { x: 141.5, y: 0 },
  { x: 142.5, y: -0.25 },
  { x: 145, y: -0.25 },
  { x: 146, y: 0 },
  // Climbing and mechanisms (146-205) flat.
  { x: 205, y: 0 },
  // Hazards (206-243): a deep pool and a narrow pit.
  { x: 230, y: 0, sharp: true },
  { x: 230.15, y: -2.2, sharp: true },
  { x: 231.35, y: -2.2, sharp: true },
  { x: 231.5, y: 0, sharp: true },
  { x: 237, y: 0, sharp: true },
  { x: 237.1, y: -3.5, sharp: true },
  { x: 237.9, y: -3.5, sharp: true },
  { x: 238, y: 0, sharp: true },
  // Threats and relay (243-350).
  { x: 349.9, y: 0, sharp: true },
  // Story set pieces (350-400): a cellar under a hatch, then a rail line.
  { x: 350, y: -1.2, sharp: true },
  { x: 355.9, y: -1.2, sharp: true },
  { x: 356, y: 0, sharp: true, surface: 'gravel' },
  { x: 400, y: 0, surface: 'gravel' },
];

export const L00: LevelInput = {
  id: 'L00',
  name: 'Sandbox',
  palette: {
    sky: '#1d201f',
    fog: '#4a4f4a',
    ground: '#171816',
  },
  ambience: { drone: 'low_wind', wind: 0.45, ash: 0.6, lightning: 0.4 },
  layers: [
    { kind: 'far', speed: 0.12, density: 1.2, props: ['mountains'], hills: 3 },
    { kind: 'far', speed: 0.25, density: 1.6, props: ['skyline', 'smokestacks'], hills: 2 },
    { kind: 'mid', speed: 0.5, density: 0.9, props: ['dead_trees', 'pylons', 'wrecked_buildings'], hills: 1.5 },
    { kind: 'mid', speed: 0.7, density: 0.8, props: ['dead_trees'], hills: 1 },
    { kind: 'near', speed: 0.88, density: 1.4, props: ['rocks', 'fence', 'trunks'], hills: 0.4 },
    { kind: 'foreground', speed: 1.35, density: 0.6, props: ['branches', 'grass', 'chainlink', 'wires', 'rubble'] },
  ],
  path,
  spawn: { x: 1 },
  entities: [
    // A convoy crawls along the far ridge once the child crests the first hill; its lights cut out together.
    { type: 'background_event', id: 'convoy', x: 30, kind: 'convoy', speed: 0.2, span: 70, duration: 16, autoplayAt: 9 },
    // Marchers play when a trigger signals them.
    { type: 'background_event', id: 'marchers', x: 62, kind: 'marchers', speed: 0.55, span: 30, duration: 22 },
    { type: 'background_event', id: 'airship', x: 100, kind: 'airship', speed: 0.18, span: 140, duration: 40, autoplayAt: 76 },
    // Slow pull-out over the hollow.
    { type: 'camera_hint', x: 40, w: 10, zoom: 1.45, offsetY: 0.8, seconds: 4, exitSeconds: 3 },
    // Push-in at the drop.
    { type: 'camera_hint', x: 60, w: 5, zoom: 0.8, seconds: 1.5, exitSeconds: 2 },
    { type: 'foreground_prop', x: 47, kind: 'branches', variant: 1 },
    { type: 'checkpoint', x: 26 },
    // Off the path, just past the ditch: a toy rabbit in the grass.
    { type: 'memory_collectible', id: 'rabbit', x: 18.5, kind: 'toy_rabbit' },

    // ---- obstacles ----
    { type: 'obstacle_low', x: 118, look: 'rubble' },
    { type: 'obstacle_high', x: 122, look: 'car', w: 2 },
    { type: 'log', x: 126 },
    { type: 'boulder', x: 129.5, h: 0.6 },
    { type: 'crawlspace', x: 133, w: 2.6, look: 'tree' },
    { type: 'fence', x: 137.5, gap: 0.55 },

    // ---- water, ladder, rope ----
    { type: 'water', x: 141.5, w: 4.5 },
    { type: 'ladder', x: 149.7, h: 2.5 },
    { type: 'obstacle_high', x: 152, w: 4, h: 2.5, look: 'wall' },
    { type: 'rope', x: 157, length: 2.4 },

    // ---- movables and mechanisms ----
    // Shove the crate onto the plate to raise the gate.
    { type: 'crate', x: 164 },
    { type: 'pressure_plate', x: 168, w: 1.2, target: 'gate1' },
    { type: 'gate', id: 'gate1', x: 172 },
    { type: 'cart', x: 176 },
    // Stand on the lift and throw the lever beside it; the cable carries power and up it goes.
    { type: 'lever', x: 182.7, target: 'cable1' },
    { type: 'power_cable', id: 'cable1', x: 182.9, target: 'lift1', delay: 0.8 },
    { type: 'lift', id: 'lift1', x: 184, travel: 2.2 },
    { type: 'obstacle_high', x: 186.3, w: 3, h: 2.2, look: 'slab' },
    { type: 'draggable_log', x: 192 },
    { type: 'body', x: 195.5 },
    { type: 'valve', x: 198, target: 'belt' },
    { type: 'conveyor', id: 'belt', x: 199.5, w: 4.5, speed: 1.2 },

    // ---- hazards ----
    { type: 'radiation_zone', x: 208, w: 3 },
    // Keep walking under the creaking slab; stopping is fatal.
    { type: 'falling_debris', x: 216, triggerAt: 215.3, delay: 0.5, dropHeight: 6 },
    { type: 'wire_trap', x: 221 },
    { type: 'deep_water', x: 230, w: 1.5 },
    { type: 'fall_height', x: 237, w: 1, killY: -2 },
    // This wire drops a slab ahead of you: it blocks the way, then you climb it.
    { type: 'wire_trap', x: 239.5, target: 'slab2' },
    { type: 'falling_debris', id: 'slab2', x: 242.3, delay: 0.2 },

    // ---- threats ----
    // Walk quietly past the sleeping dog... it wakes behind you. Run for the pipe (too narrow for it).
    { type: 'feral_dog', id: 'dog1', x: 239, speed: 2.9, wakeOnSight: false },
    { type: 'pipe', x: 256, w: 3 },
    // Crawl through the grass while the searchlight sweeps.
    { type: 'cover', x: 266, w: 8, kind: 'grass' },
    { type: 'searchlight', x: 270, sweep: 3, period: 7 },
    // Wait in the shadow while the drone passes.
    { type: 'cover', x: 282.5, w: 2.5, kind: 'shadow' },
    { type: 'patrol_drone', x: 279, from: 279, to: 288 },
    // Hide in the shadow while the guard walks past, then slip away behind him.
    { type: 'cover', x: 302, w: 2, kind: 'shadow' },
    { type: 'guard', x: 305, from: 299, to: 306 },
    { type: 'cover', x: 296, w: 1.6, kind: 'wreck' },

    // ---- relay ----
    // The plate only holds the gate while weighed down: send the drone to stand on it.
    { type: 'relay_transmitter', x: 318 },
    { type: 'dormant_body', id: 'drone1', x: 322, kind: 'drone' },
    { type: 'pressure_plate', x: 327, w: 1.4, target: 'gate2' },
    { type: 'gate', id: 'gate2', x: 333 },
    { type: 'dormant_body', x: 338, kind: 'survivor' },

    // ---- story set pieces ----
    // Drop into the cellar; the hatch over its far end must be pushed open to climb out.
    { type: 'hatch', x: 355.2, y: 0, w: 1.6 },
    // The freight car starts rolling as you approach: run, jump on, ride it out.
    { type: 'freight_car', id: 'train0', x: 364, startAt: 359 },
    { type: 'beacon', x: 389, h: 9 },
    // A car door to drag over a glowing pool, and a heavy lever only a relay body can throw.
    { type: 'dormant_body', x: 345, kind: 'drone' },
    { type: 'lever', x: 347, heavy: true, target: 'shutter' },
    { type: 'gate', id: 'shutter', x: 348.6, look: 'shutter', openTo: 0.22 },
  ],
  triggers: [
    { x: 54, w: 2, action: 'signal', target: 'marchers' },
    { x: 56, w: 1, action: 'lightning' },
    { x: 58, w: 1, action: 'sound', cue: 'distant_boom' },
    { x: 60, w: 5, action: 'tension', amount: 0.6, once: false },
    { x: 66, w: 1, action: 'tension', amount: 0, once: false },
    { x: 244, w: 1, action: 'tension', amount: 0.5, once: false },
    { x: 246, w: 1, action: 'signal', target: 'dog1' },
    { x: 312, w: 1, action: 'tension', amount: 0, once: false },
  ],
  checkpoints: [44, 68, 96, 116, 140, 162, 206, 243, 263, 278, 291, 314, 341],
  exit: { x: 392, next: 'L00' },
};
