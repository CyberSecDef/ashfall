// Box collision on the gameplay plane, layered over the terrain heightfield.
// Solids are axis-aligned boxes: obstacles, crates, gates, lifts, the slab
// over a crawlspace. Actors and movable boxes query this for floors (what am
// I standing on), walls (what stops me) and ceilings (what forces a crawl).

import type { Terrain } from './terrain';

export interface Solid {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Disabled solids (an open gate) are ignored by every query. */
  enabled: boolean;
  /** The child may auto-scramble or grab onto its top. */
  climbable: boolean;
  /** Can be stood on but passed through from below and the sides (a lift deck, a ledge lip). */
  oneWay?: boolean;
  /** Movement since last step, so things standing on it ride along (lifts, carts). */
  dx?: number;
  dy?: number;
  /** Free-form owner tag for debugging and line-of-sight rules. */
  tag?: string;
  /** Blocks searchlights and guards' line of sight. Default true. */
  blocksSight?: boolean;
}

export const EPS = 0.001;

export class Collision {
  readonly solids = new Set<Solid>();

  constructor(readonly terrain: Terrain) {}

  add(s: Solid): Solid {
    this.solids.add(s);
    return s;
  }

  remove(s: Solid): void {
    this.solids.delete(s);
  }

  /** Highest terrain point under [x0, x1]. */
  terrainFloor(x0: number, x1: number): number {
    const t = this.terrain;
    return Math.max(t.heightAt(x0), t.heightAt((x0 + x1) / 2), t.heightAt(x1));
  }

  /**
   * The floor under a footprint [x0, x1] for something whose feet are at y:
   * the highest terrain or solid top that is at most `stepUp` above y.
   * Returns the height and the solid (if any) providing it.
   */
  floor(x0: number, x1: number, y: number, stepUp: number, exclude?: Solid): { y: number; solid: Solid | null } {
    let best = this.terrainFloor(x0, x1);
    let solid: Solid | null = null;
    for (const s of this.solids) {
      if (!s.enabled || s === exclude) continue;
      if (s.maxX <= x0 + EPS || s.minX >= x1 - EPS) continue;
      if (s.maxY > y + stepUp) continue;
      if (s.maxY > best) {
        best = s.maxY;
        solid = s;
      }
    }
    return { y: best, solid };
  }

  /**
   * Top of whatever is stacked on the ground at [x0, x1]: start at the terrain
   * and climb through solids resting on the current floor. Used for spawning,
   * so a spawn under a crawlspace slab stays under it.
   */
  restingTop(x0: number, x1: number, exclude?: Solid): number {
    let y = this.terrainFloor(x0, x1);
    for (let guard = 0; guard < 32; guard++) {
      let next = y;
      for (const s of this.solids) {
        if (!s.enabled || s === exclude) continue;
        if (s.maxX <= x0 + EPS || s.minX >= x1 - EPS) continue;
        if (s.minY <= y + 0.05 && s.maxY > next) next = s.maxY;
      }
      if (next === y) return y;
      y = next;
    }
    return y;
  }

  /** First solid overlapping the box [x0,x1] x [y0,y1], ignoring one-way solids. */
  overlap(x0: number, x1: number, y0: number, y1: number, exclude?: Solid): Solid | null {
    for (const s of this.solids) {
      if (!s.enabled || s === exclude || s.oneWay) continue;
      if (s.maxX <= x0 + EPS || s.minX >= x1 - EPS) continue;
      if (s.maxY <= y0 + EPS || s.minY >= y1 - EPS) continue;
      return s;
    }
    return null;
  }

  /** Lowest solid bottom above y over [x0, x1] (Infinity if open sky). */
  ceiling(x0: number, x1: number, y: number, exclude?: Solid): number {
    let best = Infinity;
    for (const s of this.solids) {
      if (!s.enabled || s === exclude || s.oneWay) continue;
      if (s.maxX <= x0 + EPS || s.minX >= x1 - EPS) continue;
      if (s.minY < y - EPS) continue;
      best = Math.min(best, s.minY);
    }
    return best;
  }

  /** Does a straight line cross any sight-blocking solid? (Searchlights, guards.) */
  sightBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    for (const s of this.solids) {
      if (!s.enabled || s.blocksSight === false) continue;
      if (segmentHitsBox(ax, ay, bx, by, s)) return true;
    }
    return false;
  }
}

/** Liang-Barsky segment vs box. */
export function segmentHitsBox(ax: number, ay: number, bx: number, by: number, s: Solid): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return (
    clip(-dx, ax - s.minX) &&
    clip(dx, s.maxX - ax) &&
    clip(-dy, ay - s.minY) &&
    clip(dy, s.maxY - ay) &&
    t0 < t1
  );
}
