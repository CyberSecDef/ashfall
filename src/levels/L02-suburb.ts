// L02 — The Dead Suburb.
// Grey dawn. Rows of burned houses on rolling streets, overgrown gardens.
// Puzzle 1: a glowing radiation pool fills a crater in the road; drag a torn-off
// car door across it. Puzzle 2: a gate held shut; reach the lever on a high
// porch by pushing a crate along a flowerbed onto a garden bench and climbing.
// Tension: watchtower searchlights sweep the street; move between tall grass,
// a wreck and deep shadow. Background: a silent line of masked people marched
// east by guards on the hill behind the houses. Memory: a crayon drawing in a
// basement nook, reached by crawling in through a broken window.

import type { LevelInput } from './schema';

export const L02: LevelInput = {
  id: 'L02',
  name: 'The Dead Suburb',
  palette: { sky: '#3b3f3e', fog: '#6e736e', ground: '#1b1d1b', tint: '#6b6f6a' },
  ambience: { drone: 'dead_suburb', wind: 0.35, ash: 0.45, lightning: 0.1 },
  layers: [
    { kind: 'far', speed: 0.12, density: 1, props: ['mountains'], hills: 2.5 },
    { kind: 'far', speed: 0.22, density: 1.4, props: ['skyline', 'wrecked_buildings'], hills: 1.5 },
    { kind: 'mid', speed: 0.5, density: 1.7, props: ['wrecked_buildings', 'wrecked_buildings', 'dead_trees'], hills: 1.2 },
    { kind: 'mid', speed: 0.72, density: 1.3, props: ['dead_trees', 'wrecked_buildings'], hills: 0.8 },
    { kind: 'near', speed: 0.88, density: 2.2, props: ['fence', 'rocks', 'fence'], hills: 0.3 },
    { kind: 'foreground', speed: 1.35, density: 0.7, props: ['grass', 'chainlink', 'wires'] },
  ],
  path: [
    { x: -6, y: 0.2, surface: 'concrete' },
    { x: 4, y: 0, surface: 'concrete' },
    { x: 10, y: 0.4, surface: 'concrete' },
    { x: 15, y: 0.1, surface: 'concrete' },
    // The crater, full of glowing water.
    { x: 17.9, y: 0, sharp: true, surface: 'concrete' },
    { x: 18, y: -0.75, sharp: true, surface: 'gravel' },
    { x: 21.4, y: -0.75, sharp: true, surface: 'gravel' },
    { x: 21.5, y: 0, sharp: true, surface: 'concrete' },
    { x: 28, y: 0.3, surface: 'concrete' },
    // The garden (flowerbed, bench, porch, gate) on flat ground.
    { x: 31, y: 0, surface: 'grass' },
    { x: 48, y: 0, surface: 'concrete' },
    // The street under the watchtowers.
    { x: 56, y: 0.2, surface: 'concrete' },
    { x: 66, y: -0.1, surface: 'grass' },
    { x: 76, y: 0.2, surface: 'concrete' },
    // Ruins.
    { x: 92, y: 0, surface: 'concrete' },
    { x: 100, y: 0.5, surface: 'grass', depth: -1 },
    { x: 112, y: 0.3, surface: 'concrete', depth: 0 },
  ],
  spawn: { x: 1 },
  entities: [
    // Drag the car door across the pool.
    { type: 'draggable_log', x: 14.0, look: 'door', w: 3.9, h: 0.12, mass: 1.2 },
    { type: 'radiation_zone', x: 18, w: 3.5, pool: true, lethalAfter: 2.5 },

    // Push the crate along the flowerbed onto the bench; climb bench, crate, porch.
    { type: 'obstacle_low', x: 34.5, w: 3, h: 0.5, look: 'wall' },
    { type: 'crate', x: 34.2 },
    { type: 'obstacle_low', x: 36.7, w: 1.4, h: 0.5, look: 'slab' },
    { type: 'obstacle_high', x: 38.9, w: 3, h: 2.0, look: 'wall' },
    { type: 'lever', x: 39.9, y: 2.0, target: 'gate' },
    { type: 'gate', id: 'gate', x: 44.5 },
    { type: 'foreground_prop', x: 42, kind: 'chainlink' },

    // Watchtower A: grass, then the wreck, then the shadow.
    { type: 'cover', x: 51, w: 4.4, kind: 'grass' },
    { type: 'searchlight', id: 'lightA', x: 58, sweep: 3, period: 6.5 },
    { type: 'cover', x: 56.6, w: 1.6, kind: 'wreck' },
    { type: 'cover', x: 59.4, w: 1.8, kind: 'shadow' },
    // Watchtower B: a long stretch of tall grass to crawl through.
    { type: 'searchlight', id: 'lightB', x: 68, sweep: 3.5, period: 5.5, phase: 1.5 },
    { type: 'cover', x: 63.2, w: 10.4, kind: 'grass' },
    { type: 'camera_hint', x: 49, w: 26, zoom: 1.2, offsetY: 0.6, seconds: 3, exitSeconds: 3 },

    { type: 'background_event', id: 'marchers', x: 84, kind: 'marchers', speed: 0.55, span: 34, duration: 26 },

    // The ruin: climb over it, or crawl in through the broken window to a dead-end basement nook.
    { type: 'crawlspace', x: 84, w: 3, look: 'slab' },
    { type: 'obstacle_high', x: 85.4, w: 0.3, h: 0.55, look: 'wall' },
    { type: 'memory_collectible', id: 'drawing', x: 84.9, kind: 'drawing' },
    { type: 'foreground_prop', x: 96, kind: 'branches' },
  ],
  triggers: [
    { x: 49, w: 1, action: 'tension', amount: 0.5 },
    { x: 75, w: 1, action: 'tension', amount: 0 },
    { x: 77, w: 1, action: 'signal', target: 'marchers' },
    { x: 104, w: 1, action: 'sound', cue: 'distant_boom' },
  ],
  checkpoints: [10, 23, 31, 46, 62.2, 76, 92],
  exit: { x: 110, next: 'L03' },
};
