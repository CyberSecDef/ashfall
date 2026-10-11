import { describe, expect, it } from 'vitest';
import { depthForSpeed, layerColor } from '../src/fx/layers';
import { Lightning } from '../src/fx/lightning';
import { SCARF, Scarf } from '../src/engine/scarf';
import { makeRng } from '../src/engine/rng';
import { L00 } from '../src/levels/L00-sandbox';

describe('depthForSpeed', () => {
  const D = 11;
  it('puts the play layer at z = 0', () => {
    expect(depthForSpeed(1, D)).toBeCloseTo(0);
  });
  it('puts slower layers behind and faster ones in front', () => {
    expect(depthForSpeed(0.5, D)).toBeCloseTo(-11);
    expect(depthForSpeed(0.25, D)).toBeCloseTo(-33);
    expect(depthForSpeed(1.35, D)).toBeGreaterThan(0);
    expect(depthForSpeed(1.35, D)).toBeLessThan(D);
  });
  it('produces the requested apparent scroll speed', () => {
    for (const speed of [0.12, 0.25, 0.5, 0.88, 1.2, 1.6]) {
      const z = depthForSpeed(speed, D);
      expect(D / (D - z)).toBeCloseTo(speed);
    }
  });
});

describe('layerColor', () => {
  it('fades distant layers toward the haze but keeps them darker than the fog', () => {
    const near = layerColor(L00.palette, -2, 11);
    const far = layerColor(L00.palette, -80, 11);
    expect(far.r).toBeGreaterThan(near.r);
    const fog = layerColor(L00.palette, -10000, 11);
    expect(fog.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.35);
  });
});

describe('Scarf', () => {
  const step = (s: Scarf, anchor: { x: number; y: number; z: number }, seconds: number, wind: number) => {
    for (let i = 0; i < Math.round(seconds * 120); i++) s.update(anchor, 1 / 120, wind);
  };

  it('keeps its length', () => {
    const s = new Scarf({ x: 0, y: 1, z: 0 });
    step(s, { x: 0, y: 1, z: 0 }, 3, 0.8);
    const pts = s.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y, pts[i + 1].z - pts[i].z);
      expect(d).toBeCloseTo(SCARF.segmentLength, 2);
    }
  });

  it('hangs down with no wind', () => {
    const s = new Scarf({ x: 0, y: 1, z: 0 });
    step(s, { x: 0, y: 1, z: 0 }, 4, 0);
    const tip = s.points[s.points.length - 1];
    expect(tip.y).toBeLessThan(1 - SCARF.segments * SCARF.segmentLength * 0.8);
  });

  it('trails behind when the child moves east', () => {
    const s = new Scarf({ x: 0, y: 1, z: 0 });
    const a = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < 240; i++) {
      a.x += 2.5 / 120;
      s.update(a, 1 / 120, 0);
    }
    const tip = s.points[s.points.length - 1];
    expect(tip.x).toBeLessThan(a.x - 0.2);
  });

  it('streams west in the wind', () => {
    const s = new Scarf({ x: 0, y: 1, z: 0 });
    step(s, { x: 0, y: 1, z: 0 }, 4, 1);
    expect(s.points[s.points.length - 1].x).toBeLessThan(-0.2);
  });
});

describe('Lightning', () => {
  it('never flashes at frequency 0', () => {
    const l = new Lightning(0, makeRng(1));
    let max = 0;
    for (let i = 0; i < 60 * 120; i++) max = Math.max(max, l.update(1 / 60));
    expect(max).toBe(0);
  });

  it('flashes occasionally and settles back to 0', () => {
    const l = new Lightning(1, makeRng(2));
    let flashes = 0;
    let prev = 0;
    for (let i = 0; i < 60 * 120; i++) {
      const v = l.update(1 / 60);
      if (v > 0.5 && prev <= 0.5) flashes++;
      prev = v;
    }
    expect(flashes).toBeGreaterThan(4);
    expect(flashes).toBeLessThan(60);
  });
});

describe('L00 look', () => {
  it('declares every depth layer kind, including a sparse foreground', () => {
    const kinds = new Set(L00.layers.map((l) => l.kind));
    expect([...kinds].sort()).toEqual(['far', 'foreground', 'mid', 'near']);
    const fg = L00.layers.find((l) => l.kind === 'foreground')!;
    expect(fg.speed).toBeGreaterThanOrEqual(1.2);
    expect(fg.speed).toBeLessThanOrEqual(1.6);
    // One foreground prop every 1-3 screen widths.
    expect(fg.density).toBeGreaterThanOrEqual(1 / 3);
    expect(fg.density).toBeLessThanOrEqual(1);
  });
});
