// L01 — The Shelter.
// Night, falling ash. The child heaves open a buried fallout-shelter hatch on a
// wooded hillside and comes down through a dead forest toward a collapsed
// highway. Teaches, without words: walking, scrambling over logs, jumping a
// ditch, crawling under a fallen tree, and dragging a log to bridge a stream.
// Puzzle: drag a rusted cart to the foot of the highway embankment to climb it.
// Tension: a feral dog on the highway; flee downhill into a culvert too narrow
// for it. Background: a convoy's headlights along the far ridge, all cutting
// out at once. Memory: a melted toy rabbit in a burned-out car just off the
// path (back beyond the hatch).

import type { LevelInput } from './schema';

export const L01: LevelInput = {
  id: 'L01',
  name: 'The Shelter',
  palette: { sky: '#121516', fog: '#353c3a', ground: '#121413' },
  ambience: { drone: 'shelter_night', wind: 0.5, ash: 0.75, lightning: 0.25 },
  layers: [
    { kind: 'far', speed: 0.1, density: 1.2, props: ['mountains'], hills: 4 },
    { kind: 'far', speed: 0.2, density: 0.5, props: ['smokestacks', 'skyline'], hills: 2 },
    { kind: 'mid', speed: 0.45, density: 2.2, props: ['dead_trees', 'dead_trees', 'pylons'], hills: 2 },
    { kind: 'mid', speed: 0.68, density: 2.6, props: ['dead_trees'], hills: 1.2 },
    { kind: 'near', speed: 0.88, density: 2.2, props: ['trunks', 'rocks'], hills: 0.4 },
    { kind: 'foreground', speed: 1.35, density: 0.75, props: ['branches', 'grass', 'branches'] },
  ],
  path: [
    // Back beyond the hatch: a burned-out car in a hollow.
    { x: -14, y: 0.4, surface: 'dirt' },
    { x: -9, y: 0.1 },
    { x: -7, y: 0 },
    { x: -4, y: 0 },
    { x: 0, y: 0, sharp: true },
    // The shelter shaft, under the hatch.
    { x: 0.1, y: -1.0, sharp: true, surface: 'concrete' },
    { x: 1.9, y: -1.0, sharp: true, surface: 'concrete' },
    { x: 2.0, y: 0, sharp: true, surface: 'dirt' },
    // Up the wooded hillside.
    { x: 8, y: 0.9, surface: 'grass' },
    { x: 14, y: 1.7, surface: 'grass' },
    { x: 20, y: 2.2, surface: 'dirt' },
    // Down through the dead forest.
    { x: 26, y: 1.4 },
    { x: 30, y: 0.6 },
    // A ditch to jump.
    { x: 33, y: 0.5, sharp: true },
    { x: 33.1, y: -0.1, sharp: true },
    { x: 34.3, y: -0.1, sharp: true },
    { x: 34.4, y: 0.5, sharp: true },
    { x: 38, y: 0.4 },
    { x: 46, y: 0.15 },
    // A stream too wide to jump.
    { x: 49, y: 0.1, sharp: true },
    { x: 49.1, y: -1.1, sharp: true, surface: 'gravel' },
    { x: 50.9, y: -1.1, sharp: true, surface: 'gravel' },
    { x: 51, y: 0.1, sharp: true },
    { x: 56, y: 0.2, surface: 'gravel' },
    // The highway embankment: too high to climb without help.
    { x: 63.9, y: 0.2, sharp: true, surface: 'gravel' },
    { x: 64, y: 1.8, sharp: true, surface: 'concrete' },
    { x: 75, y: 1.85, surface: 'concrete' },
    // A broken slab dipped in the road.
    { x: 86.9, y: 1.8, sharp: true, surface: 'concrete' },
    { x: 87, y: 1.2, sharp: true, surface: 'concrete' },
    { x: 88.4, y: 1.2, sharp: true, surface: 'concrete' },
    { x: 88.5, y: 1.8, sharp: true, surface: 'concrete' },
    { x: 98, y: 1.8, surface: 'concrete' },
    // The road collapses into a slope; a culvert at the bottom.
    { x: 106, y: 0, surface: 'dirt' },
    { x: 110, y: -0.6 },
    { x: 115, y: -0.6 },
    { x: 120, y: 0.1, surface: 'grass', depth: -1 },
    { x: 130, y: 0.4, depth: -1.5 },
  ],
  spawn: { x: 1.0 },
  entities: [
    { type: 'hatch', x: 1.0, y: 0, w: 2.0 },
    // Off the path: back past the hatch, under a burned-out car.
    { type: 'crawlspace', x: -5.5, w: 2.2, look: 'car' },
    { type: 'memory_collectible', id: 'rabbit', x: -5.3, kind: 'toy_rabbit' },
    { type: 'foreground_prop', x: -8, kind: 'branches', variant: 2 },

    { type: 'log', x: 10.5 },
    { type: 'log', x: 16.5, w: 2.8 },
    { type: 'background_event', id: 'convoy', x: 46, kind: 'convoy', speed: 0.15, span: 90, duration: 18, autoplayAt: 20 },
    { type: 'camera_hint', x: 19, w: 8, zoom: 1.4, offsetY: 1.2, seconds: 4, exitSeconds: 3 },
    { type: 'boulder', x: 28.5, h: 0.5 },
    { type: 'crawlspace', x: 41.5, w: 2.4, look: 'tree' },
    // Drag the log to bridge the stream.
    { type: 'draggable_log', x: 45.4, w: 2.6 },
    { type: 'deep_water', x: 49, w: 2 },
    // Drag the cart to the embankment, climb it, jump for the top.
    { type: 'cart', x: 57.5 },
    { type: 'foreground_prop', x: 61, kind: 'wires', variant: 1 },
    // The highway.
    { type: 'obstacle_low', x: 70, look: 'slab', h: 0.45, w: 1.4 },
    { type: 'obstacle_low', x: 76.5, look: 'car', h: 0.58, w: 2.2 },
    { type: 'crawlspace', x: 82.5, w: 2.4, look: 'car' },
    // The dog sleeps by the road; it wakes behind you.
    { type: 'feral_dog', id: 'dog', x: 91.5, speed: 3.0, wakeOnSight: false, giveUpAfter: 5 },
    { type: 'camera_hint', x: 95, w: 16, zoom: 0.85, seconds: 1.5, exitSeconds: 2.5 },
    { type: 'pipe', x: 112.5, w: 3 },
    { type: 'camera_hint', x: 118, w: 12, zoom: 1.35, offsetY: 0.8, seconds: 5, exitSeconds: 3 },
    { type: 'foreground_prop', x: 123, kind: 'grass', variant: 1 },
  ],
  triggers: [
    { x: 22, w: 1, action: 'lightning' },
    { x: 30, w: 1, action: 'sound', cue: 'distant_boom' },
    { x: 95, w: 1, action: 'signal', target: 'dog' },
    { x: 95, w: 1, action: 'tension', amount: 0.7 },
    { x: 115.5, w: 1, action: 'tension', amount: 0 },
  ],
  checkpoints: [8, 26, 37, 44, 52.5, 65.5, 89.5, 117],
  exit: { x: 128, next: 'L02' },
};
