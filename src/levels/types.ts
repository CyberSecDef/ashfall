// Level data types. M3 replaces these with a Zod schema (src/levels/schema.ts)
// that infers the same shapes and validates every level at build time.

import type { PathPoint } from '../engine/terrain';

export interface Palette {
  /** Sky at the zenith. */
  sky: string;
  /** Fog and sky near the horizon. */
  fog: string;
  /** Play-layer ground. */
  ground: string;
  /** Optional slight tint for silhouettes (colder metro, greener forest). Keep it desaturated. */
  tint?: string;
}

export interface Ambience {
  /** Named drone for M5's procedural audio. */
  drone: string;
  /** Wind strength, 0 to 1. Drives the scarf, ash drift and foreground sway. */
  wind: number;
  /** Ash density, 0 to 1. */
  ash: number;
  /** Distant lightning or flash frequency, 0 (never) to 1 (often). */
  lightning: number;
}

export type LayerKind = 'far' | 'mid' | 'near' | 'foreground';

export type PropKind =
  // far
  | 'skyline'
  | 'mountains'
  | 'smokestacks'
  // mid
  | 'dead_trees'
  | 'pylons'
  | 'wrecked_buildings'
  // near
  | 'rocks'
  | 'fence'
  | 'trunks'
  // foreground
  | 'branches'
  | 'grass'
  | 'chainlink'
  | 'wires'
  | 'rubble';

export interface LayerSpec {
  kind: LayerKind;
  /** Scroll speed relative to the play layer (spec table). Sets the real depth. */
  speed: number;
  /** Props per 10 m for background layers; per screen width for the foreground. */
  density: number;
  props: PropKind[];
  /** How much the layer's ground undulates, in meters. */
  hills?: number;
}

export interface LevelLook {
  id: string;
  palette: Palette;
  ambience: Ambience;
  layers: LayerSpec[];
  path: PathPoint[];
  spawn: { x: number };
}
