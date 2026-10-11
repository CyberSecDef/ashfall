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
  ],
  triggers: [
    { x: 54, w: 2, action: 'signal', target: 'marchers' },
    { x: 56, w: 1, action: 'lightning' },
    { x: 58, w: 1, action: 'sound', cue: 'distant_boom' },
    { x: 60, w: 5, action: 'tension', amount: 0.6, once: false },
    { x: 66, w: 1, action: 'tension', amount: 0, once: false },
  ],
  checkpoints: [44, 68, 96],
  exit: { x: 112, next: 'L00' },
};
