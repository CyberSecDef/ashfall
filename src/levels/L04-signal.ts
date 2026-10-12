// L04 — The Signal (epilogue).
// Reached only if every hidden memory was found. A paler dawn: the child walks
// up out of the valley to the radio mast whose signal it has been following.
// No puzzles, no threats; the camera draws back, and the game fades to its title.

import type { LevelInput } from './schema';

export const L04: LevelInput = {
  id: 'L04',
  name: 'The Signal',
  palette: { sky: '#5a5f5c', fog: '#8a8f89', ground: '#262926' },
  ambience: { drone: 'signal', wind: 0.25, ash: 0.18, lightning: 0 },
  layers: [
    { kind: 'far', speed: 0.1, density: 1.2, props: ['mountains'], hills: 5 },
    { kind: 'mid', speed: 0.5, density: 0.6, props: ['dead_trees', 'pylons'], hills: 1 },
    { kind: 'near', speed: 0.88, density: 1.2, props: ['rocks', 'trunks'], hills: 0.3 },
    { kind: 'foreground', speed: 1.35, density: 0.5, props: ['grass'] },
  ],
  path: [
    { x: -6, y: 0, surface: 'grass' },
    { x: 10, y: 0.8, surface: 'grass' },
    { x: 24, y: 2.8, surface: 'grass' },
    { x: 36, y: 4.6, surface: 'grass' },
    { x: 44, y: 5.0, surface: 'grass' },
    { x: 56, y: 5.1, surface: 'grass' },
  ],
  spawn: { x: 1 },
  entities: [
    { type: 'beacon', x: 48, h: 11 },
    { type: 'camera_hint', x: 26, w: 30, zoom: 1.9, offsetY: 2.4, seconds: 8, exitSeconds: 4 },
  ],
  triggers: [{ x: 40, w: 1, action: 'sound', cue: 'relay_found' }],
  checkpoints: [],
  exit: { x: 46 },
};
