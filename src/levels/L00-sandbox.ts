// L00 — sandbox. In M1 this is only a test path: rolling hills, a ditch to
// jump, a ledge to jump onto, a too-steep bank, and a drop. M3 turns it into
// a full level file validated against the schema, holding one of every entity.

import type { PathPoint } from '../engine/terrain';

export const L00_PATH: PathPoint[] = [
  { x: -6, y: 0 },
  { x: 0, y: 0 },
  { x: 6, y: 0.6 },
  { x: 11, y: 1.4, surface: 'grass' },
  { x: 16, y: 0.8, surface: 'grass' },
  { x: 20, y: 0.2 },
  // Ditch: jump it.
  { x: 22, y: 0.1, sharp: true },
  { x: 22.4, y: -1.2, sharp: true },
  { x: 23.6, y: -1.2, sharp: true },
  { x: 24, y: 0.1, sharp: true },
  { x: 28, y: 0.3, surface: 'concrete' },
  // Ledge: about 0.55 m high, needs a jump.
  { x: 31, y: 0.3, surface: 'concrete', sharp: true },
  { x: 31.05, y: 0.85, surface: 'concrete', sharp: true },
  { x: 36, y: 0.9, surface: 'concrete' },
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
  { x: 72, y: 0.3 },
  { x: 80, y: -0.2 },
  { x: 86, y: 0 },
];

export const L00_SPAWN_X = 1;
