// Terrain is a ground profile: a polyline of points sorted by x. Level data
// gives sparse control points; the engine smooths them with a Catmull-Rom
// spline and resamples to a fine polyline that physics and rendering share.

export type Surface = 'dirt' | 'grass' | 'concrete' | 'water' | 'gravel' | 'metal';

export interface PathPoint {
  x: number;
  y: number;
  surface?: Surface;
  /** Keep this corner sharp instead of smoothing through it (ledges, curbs). */
  sharp?: boolean;
}

export interface GroundSample {
  x: number;
  y: number;
  surface: Surface;
}

export class Terrain {
  readonly samples: GroundSample[];
  readonly minX: number;
  readonly maxX: number;

  constructor(points: PathPoint[], step = 0.2) {
    if (points.length < 2) throw new Error('Terrain needs at least two path points');
    for (let i = 1; i < points.length; i++) {
      if (!(points[i].x > points[i - 1].x)) {
        throw new Error(`Path x must strictly increase (point ${i}: ${points[i].x} <= ${points[i - 1].x})`);
      }
    }
    this.samples = resample(points, step);
    this.minX = points[0].x;
    this.maxX = points[points.length - 1].x;
  }

  private indexAt(x: number): number {
    const s = this.samples;
    let lo = 0;
    let hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid].x <= x) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Ground height at x. Clamped to the end heights outside the path. */
  heightAt(x: number): number {
    const s = this.samples;
    if (x <= s[0].x) return s[0].y;
    if (x >= s[s.length - 1].x) return s[s.length - 1].y;
    const i = this.indexAt(x);
    const a = s[i];
    const b = s[i + 1];
    const t = (x - a.x) / (b.x - a.x);
    return a.y + (b.y - a.y) * t;
  }

  /** Slope (dy/dx) of the segment under x. */
  slopeAt(x: number): number {
    const s = this.samples;
    const i = Math.min(this.indexAt(x), s.length - 2);
    const a = s[i];
    const b = s[i + 1];
    return (b.y - a.y) / (b.x - a.x);
  }

  surfaceAt(x: number): Surface {
    return this.samples[this.indexAt(x)].surface;
  }
}

function resample(points: PathPoint[], step: number): GroundSample[] {
  const out: GroundSample[] = [];
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    // A sharp corner on either end makes the segment straight, so ledges stay crisp.
    const straight = p1.sharp || p2.sharp;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const steps = Math.max(1, Math.ceil((p2.x - p1.x) / step));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = straight ? p1.y + (p2.y - p1.y) * t : catmullRom(p0.y, p1.y, p2.y, p3.y, t);
      out.push({ x, y, surface: p1.surface ?? 'dirt' });
    }
  }
  const last = points[n - 1];
  out.push({ x: last.x, y: last.y, surface: last.surface ?? points[n - 2].surface ?? 'dirt' });
  return out;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
