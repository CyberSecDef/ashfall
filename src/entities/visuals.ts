// Shared helpers for entity visuals: dark silhouette materials that catch the
// moonlit rim, the subtle interaction highlight, extruded silhouette shapes,
// and placement at the path's visual depth.

import * as THREE from 'three';
import type { Solid } from '../engine/collision';
import type { Interactable, LevelContext } from './types';

export const SILHOUETTE = 0x0d0e0d;
/** Pale, desaturated light: lamps, glints, beams. Never the scarf blue. */
export const PALE = 0xd9dcd4;

export function silhouetteMaterial(color = SILHOUETTE): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, emissive: 0x000000 });
}

/** Unlit additive glow (beams, sparks, radiation). */
export function glowMaterial(color = PALE, opacity = 0.2): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
}

/** Visual z for something at x on the path (follows the path's depth bends). */
export function zAt(ctx: LevelContext, x: number, offset = 0): number {
  return ctx.terrain.depthAt(x) + offset;
}

/** A silhouette shape extruded into a slab centered on z = 0 (so it catches rim light). */
export function extrude(shape: THREE.Shape, depth = 0.9): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -depth * 0.75); // mostly behind the gameplay plane, so the child stays visible in front
  return g;
}

export function shape(points: Array<[number, number]>): THREE.Shape {
  return new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
}

/** Jagged polygon roughly filling w x h, bottom-left at the origin. */
export function jagged(w: number, h: number, seed: number, notches = 5): THREE.Shape {
  const r = (i: number) => {
    const v = Math.sin(seed * 91.3 + i * 12.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const pts: Array<[number, number]> = [[0, 0], [0, h * (0.7 + r(0) * 0.3)]];
  for (let i = 1; i < notches; i++) pts.push([(w * i) / notches, h * (0.6 + r(i) * 0.4)]);
  pts.push([w, h * (0.65 + r(99) * 0.35)], [w, 0]);
  return shape(pts);
}

/** Highlight: a faint lift of the silhouette, like a rim of light catching it. */
export function highlighter(mats: THREE.MeshStandardMaterial[]): (on: boolean) => void {
  return (on) => {
    for (const m of mats) m.emissive.setHex(on ? 0x2b302b : 0x000000);
  };
}

export function addSolid(ctx: LevelContext, s: Omit<Solid, 'enabled'> & { enabled?: boolean }): Solid {
  return ctx.collision.add({ enabled: true, ...s });
}

/** Register a tap target near (x, y) that highlights the given materials. */
export function addUse(
  ctx: LevelContext,
  opts: { x: () => number; y: () => number; range?: number; enabled?: () => boolean; use?: Interactable['use'] },
  mats: THREE.MeshStandardMaterial[],
): Interactable {
  const i: Interactable = {
    x: opts.x,
    y: opts.y,
    range: opts.range ?? 0.7,
    enabled: opts.enabled ?? (() => true),
    highlight: highlighter(mats),
    use: opts.use,
  };
  ctx.addInteractable(i);
  return i;
}

/** Is an actor's footprint inside [minX, maxX]? */
export function actorIn(a: { x: number }, minX: number, maxX: number): boolean {
  return a.x >= minX && a.x <= maxX;
}
