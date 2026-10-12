// L03 — The Relay Yard.
// An industrial rail yard in a valley; rows of dormant worker drones under
// sheet-metal sheds. Puzzle 1: find the relay transmitter, take over a drone,
// and have it throw a lever too heavy for the child, raising a shutter just
// enough to crawl under. Puzzle 2: send a second drone to stand on a pressure
// plate holding a gate open, switch back, and go through. Tension: a guard
// raises the alarm; a desperate run across the yard ends with a jump onto a
// moving freight car as the level fades out. Background: a huge silent airship
// drifts over the valley. Memory: a child's knitted mitten caught on the fence
// behind the first shed (back past the start).

import type { LevelInput } from './schema';

export const L03: LevelInput = {
  id: 'L03',
  name: 'The Relay Yard',
  palette: { sky: '#1e2221', fog: '#4c524e', ground: '#141615', tint: '#5d635c' },
  ambience: { drone: 'rail_yard', wind: 0.4, ash: 0.5, lightning: 0.3 },
  layers: [
    { kind: 'far', speed: 0.1, density: 1.4, props: ['mountains'], hills: 7 },
    { kind: 'far', speed: 0.22, density: 1.5, props: ['smokestacks', 'skyline', 'smokestacks'], hills: 1.5 },
    { kind: 'mid', speed: 0.5, density: 1.6, props: ['pylons', 'wrecked_buildings', 'pylons'], hills: 1 },
    { kind: 'mid', speed: 0.72, density: 0.7, props: ['dead_trees', 'wrecked_buildings'], hills: 0.6 },
    { kind: 'near', speed: 0.88, density: 2, props: ['fence', 'rocks'], hills: 0.3 },
    { kind: 'foreground', speed: 1.35, density: 0.75, props: ['chainlink', 'wires', 'rubble'] },
  ],
  path: [
    { x: -10, y: 0.1, surface: 'gravel' },
    { x: 4, y: 0, surface: 'gravel' },
    { x: 20, y: 0, surface: 'concrete' },
    { x: 34, y: 0, surface: 'metal' },
    { x: 46, y: 0, surface: 'gravel' },
    // The rail line out of the valley.
    { x: 120, y: 0, surface: 'gravel' },
  ],
  spawn: { x: 2 },
  entities: [
    // Behind the first shed: a mitten on the fence.
    { type: 'obstacle_high', x: -1.6, w: 2, h: 1.0, look: 'wall' },
    { type: 'fence', x: -7.5, h: 2.2 },
    { type: 'memory_collectible', id: 'mitten', x: -7.0, y: 0.6, kind: 'mitten' },

    // The drone sheds.
    { type: 'cover', x: 4.5, w: 4, kind: 'shadow' },
    { type: 'dormant_body', x: 6.5, kind: 'drone' },
    { type: 'relay_transmitter', x: 9.6 },
    { type: 'cover', x: 12.5, w: 4, kind: 'shadow' },
    { type: 'dormant_body', id: 'drone1', x: 14.5, kind: 'drone' },
    // Puzzle 1: the heavy lever and the shutter.
    { type: 'lever', x: 21.5, heavy: true, target: 'shutter' },
    { type: 'gate', id: 'shutter', x: 24, look: 'shutter', h: 2.8, openTo: 0.2 },
    // Puzzle 2: a drone on the plate holds the gate.
    { type: 'cover', x: 27.5, w: 3.5, kind: 'shadow' },
    { type: 'dormant_body', id: 'drone2', x: 29.2, kind: 'drone' },
    { type: 'pressure_plate', x: 32.3, w: 1.4, target: 'gate' },
    { type: 'gate', id: 'gate', x: 37 },

    // The guard in the hut by the gate: once the alarm goes, run for the train.
    { type: 'cover', x: 33.4, w: 2, kind: 'shadow' },
    { type: 'guard', id: 'guard', x: 34.3, from: 34.3, to: 34.3, sight: 0.2, runSpeed: 2.7 },
    { type: 'freight_car', id: 'train', x: 50, w: 5, speed: 2.4, startAt: 44.5 },
    { type: 'freight_car', x: 44.2, w: 5, speed: 0.1 },
    { type: 'camera_hint', x: 39, w: 22, zoom: 1.25, offsetX: 1.5, seconds: 1.5, exitSeconds: 2 },
    { type: 'camera_hint', x: 61, w: 60, zoom: 1.6, offsetY: 1.2, seconds: 5, exitSeconds: 3 },

    { type: 'background_event', id: 'airship', x: 60, kind: 'airship', speed: 0.15, span: 170, duration: 55, autoplayAt: 12 },
    { type: 'foreground_prop', x: 18, kind: 'wires', variant: 2 },
  ],
  triggers: [
    { x: 39, w: 1, action: 'signal', target: 'guard', signal: 'alarm' },
    { x: 39, w: 1, action: 'tension', amount: 0.9 },
    { x: 39.5, w: 1, action: 'lightning' },
    { x: 70, w: 2, action: 'tension', amount: 0 },
  ],
  checkpoints: [3, 19, 26, 37.8],
  exit: { x: 96 },
};
