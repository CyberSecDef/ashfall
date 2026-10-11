// Procedural silhouette props. Each generator returns flat geometry in world
// x/y (z = 0) that layers.ts merges per layer and pushes to the layer's depth.
// Shapes are deliberately simple: readability comes from outline, not detail.

import * as THREE from 'three';
import type { PropKind } from '../levels/types';
import { type Rng, range } from '../engine/rng';

export type V2 = [number, number];

/** A polyline drawn as a ribbon of the given width (tapering optional). */
export function thickLine(points: V2[], width: number, endWidth = width): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = points[i];
    const [ax, ay] = points[Math.max(0, i - 1)];
    const [bx, by] = points[Math.min(n - 1, i + 1)];
    let dx = bx - ax;
    let dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (width + (endWidth - width) * (i / (n - 1))) / 2;
    pos.push(x - dy * w, y + dx * w, 0, x + dy * w, y - dx * w, 0);
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function poly(points: V2[]): THREE.BufferGeometry {
  return new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))));
}

/** Catenary-ish sag between two points. */
export function sag(a: V2, b: V2, droop: number, segments = 12): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - droop * 4 * t * (1 - t)]);
  }
  return pts;
}

// ---- far -------------------------------------------------------------------

function mountains(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const w = range(r, 25, 60);
  const h = range(r, 8, 22);
  const pts: V2[] = [[x - w / 2, y - 30]];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ridge = Math.sin(t * Math.PI) ** 1.4;
    pts.push([x - w / 2 + w * t, y + ridge * h + (r() - 0.5) * h * 0.18]);
  }
  pts.push([x + w / 2, y - 30]);
  return [poly(pts)];
}

function skyline(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  let cx = x - range(r, 4, 8);
  const end = x + range(r, 4, 10);
  while (cx < end) {
    const w = range(r, 1.8, 5);
    const h = range(r, 2.5, 9);
    // Broken top: a jagged outline instead of a flat roof.
    const pts: V2[] = [[cx, y - 20], [cx, y + h]];
    const notches = 2 + Math.floor(r() * 4);
    for (let i = 1; i <= notches; i++) pts.push([cx + (w * i) / (notches + 1), y + h - r() * h * 0.25]);
    pts.push([cx + w, y + h * range(r, 0.7, 1)], [cx + w, y - 20]);
    out.push(poly(pts));
    if (r() < 0.25) out.push(thickLine([[cx + w * 0.5, y + h], [cx + w * 0.5 + range(r, -0.6, 0.6), y + h + range(r, 1.5, 4)]], 0.12));
    cx += w + range(r, -0.6, 1.2);
  }
  return out;
}

function smokestacks(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const count = 1 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    const sx = x + i * range(r, 2, 3.5);
    const h = range(r, 8, 15);
    const wb = range(r, 1.0, 1.5);
    const wt = wb * 0.7;
    const top = r() < 0.4 ? h * range(r, 0.6, 0.85) : h; // some are snapped off
    out.push(poly([[sx - wb / 2, y - 20], [sx - wt / 2, y + top], [sx + wt / 2, y + top - (top < h ? 0.8 : 0)], [sx + wb / 2, y - 20]]));
  }
  return out;
}

// ---- mid -------------------------------------------------------------------

function branch(r: Rng, out: THREE.BufferGeometry[], x: number, y: number, angle: number, len: number, width: number, depth: number): void {
  const pts: V2[] = [[x, y]];
  let px = x;
  let py = y;
  let a = angle;
  const segs = 4;
  for (let i = 0; i < segs; i++) {
    a += (r() - 0.5) * 0.5;
    px += Math.cos(a) * (len / segs);
    py += Math.sin(a) * (len / segs);
    pts.push([px, py]);
  }
  out.push(thickLine(pts, width, width * 0.35));
  if (depth <= 0) return;
  const kids = 1 + Math.floor(r() * 3);
  for (let k = 0; k < kids; k++) {
    const t = range(r, 0.35, 0.95);
    const [bx, by] = pts[Math.min(segs, Math.round(t * segs))];
    branch(r, out, bx, by, a + (r() < 0.5 ? -1 : 1) * range(r, 0.4, 1.1), len * range(r, 0.4, 0.7), width * 0.5, depth - 1);
  }
}

function deadTree(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const h = range(r, 3.5, 8);
  const w = h * range(r, 0.05, 0.08);
  branch(r, out, x, y - 0.5, Math.PI / 2 + (r() - 0.5) * 0.2, h, w, 3);
  return out;
}

function pylon(r: Rng, x: number, y: number, anchors?: V2[]): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const h = range(r, 9, 13);
  const base = h * 0.32;
  const top = h * 0.08;
  const lean = r() < 0.2 ? range(r, -0.8, 0.8) : 0; // a few lean after the blast
  const L = (t: number): V2 => [x - base / 2 + (base / 2 - top / 2) * t + lean * t, y + h * t];
  const R = (t: number): V2 => [x + base / 2 - (base / 2 - top / 2) * t + lean * t, y + h * t];
  out.push(thickLine([L(0), L(1)], 0.12), thickLine([R(0), R(1)], 0.12));
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    out.push(thickLine([L(t0), R(t1)], 0.05), thickLine([R(t0), L(t1)], 0.05));
  }
  for (const t of [0.72, 0.9]) {
    const [lx, ly] = L(t);
    const [rx] = R(t);
    const arm = h * 0.22;
    out.push(thickLine([[lx - arm, ly], [rx + arm, ly]], 0.1));
    if (t === 0.72) anchors?.push([lx - arm * 0.8, ly], [rx + arm * 0.8, ly]);
  }
  return out;
}

function wreckedBuilding(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const w = range(r, 4, 9);
  const h = range(r, 3.5, 9);
  const shape = new THREE.Shape();
  shape.moveTo(x, y - 2);
  shape.lineTo(x, y + h * range(r, 0.6, 1));
  const steps = 5;
  for (let i = 1; i < steps; i++) shape.lineTo(x + (w * i) / steps, y + h * range(r, 0.45, 1));
  shape.lineTo(x + w, y + h * range(r, 0.3, 0.9));
  shape.lineTo(x + w, y - 2);
  shape.closePath();
  // Window holes, some missing.
  const cols = Math.floor(w / 1.4);
  const rows = Math.floor(h / 1.6);
  for (let c = 0; c < cols; c++) {
    for (let rr = 0; rr < rows - 1; rr++) {
      if (r() < 0.35) continue;
      const wx = x + 0.5 + c * 1.4;
      const wy = y + 0.7 + rr * 1.6;
      const hole = new THREE.Path();
      hole.moveTo(wx, wy);
      hole.lineTo(wx + 0.6, wy);
      hole.lineTo(wx + 0.6, wy + 0.8);
      hole.lineTo(wx, wy + 0.8);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const out: THREE.BufferGeometry[] = [new THREE.ShapeGeometry(shape)];
  if (r() < 0.6) {
    const bx = x + w * range(r, 0.2, 0.8);
    out.push(thickLine([[bx, y + h * 0.5], [bx + range(r, 1, 3), y + h * range(r, 0.9, 1.3)]], 0.15));
  }
  return out;
}

// ---- near ------------------------------------------------------------------

function rocks(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const count = 1 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    const rx = x + i * range(r, 0.4, 1);
    const s = range(r, 0.25, 0.9);
    const pts: V2[] = [];
    const n = 7;
    for (let k = 0; k <= n; k++) {
      const a = Math.PI * (k / n);
      const rad = s * range(r, 0.7, 1.1);
      pts.push([rx + Math.cos(Math.PI - a) * rad * 1.3, y - 0.2 + Math.sin(a) * rad * 0.8]);
    }
    out.push(poly(pts));
  }
  return out;
}

function fence(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const posts = 3 + Math.floor(r() * 4);
  const gap = range(r, 1.3, 1.8);
  let prevTop: V2 | null = null;
  for (let i = 0; i < posts; i++) {
    const px = x + i * gap;
    const h = range(r, 0.9, 1.3);
    const lean = (r() - 0.5) * 0.3;
    const top: V2 = [px + lean, y + h];
    out.push(thickLine([[px, y - 0.3], top], 0.09));
    if (prevTop && r() > 0.2) {
      out.push(thickLine(sag(prevTop, top, 0.12, 6), 0.025));
      out.push(thickLine(sag([prevTop[0], prevTop[1] - 0.45], [top[0], top[1] - 0.45], 0.1, 6), 0.025));
    }
    prevTop = top;
  }
  return out;
}

function trunks(r: Rng, x: number, y: number): THREE.BufferGeometry[] {
  const w = range(r, 0.25, 0.5);
  const h = range(r, 6, 12); // usually runs off the top of the frame
  const out = [poly([[x - w / 2, y - 0.4], [x - w * 0.35, y + h], [x + w * 0.35, y + h], [x + w / 2, y - 0.4]])];
  if (r() < 0.7) branch(r, out, x, y + h * range(r, 0.4, 0.7), Math.PI / 2 + (r() < 0.5 ? -1 : 1) * range(r, 0.5, 1), range(r, 1, 2.5), w * 0.35, 1);
  return out;
}

/** Generators may push wire anchor points (pylon arm tips) so layers can string cables between them. */
export type PropGenerator = (r: Rng, x: number, y: number, anchors?: V2[]) => THREE.BufferGeometry[];

export const PROP_GENERATORS: Partial<Record<PropKind, PropGenerator>> = {
  mountains,
  skyline,
  smokestacks,
  dead_trees: deadTree,
  pylons: pylon,
  wrecked_buildings: wreckedBuilding,
  rocks,
  fence,
  trunks,
};
