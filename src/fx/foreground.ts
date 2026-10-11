// Foreground props: dark, blurred silhouettes between the camera and the
// child. Drawn once to canvases (blur via the shadow trick, which works in
// every browser including older Safari) and shown as textured planes.

import * as THREE from 'three';
import type { PropKind } from '../levels/types';
import { type Rng, makeRng, range } from '../engine/rng';

export type ForegroundKind = Extract<PropKind, 'branches' | 'grass' | 'chainlink' | 'wires' | 'rubble'>;

export const FOREGROUND_KINDS: readonly ForegroundKind[] = ['branches', 'grass', 'chainlink', 'wires', 'rubble'];

/** Where each kind lives in the frame: hanging from the top or rising from the bottom. */
export const FOREGROUND_EDGE: Record<ForegroundKind, 'top' | 'bottom'> = {
  branches: 'top',
  wires: 'top',
  grass: 'bottom',
  chainlink: 'bottom',
  rubble: 'bottom',
};

/** World size of each kind's plane, in meters (width, height). */
export const FOREGROUND_SIZE: Record<ForegroundKind, [number, number]> = {
  branches: [3.2, 2.2],
  wires: [6, 1.6],
  grass: [1.8, 1.0],
  chainlink: [2.6, 1.3],
  rubble: [2.2, 0.8],
};

const PX_PER_M = 110;
const BLUR = 9;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, r: Rng) => void;

const drawers: Record<ForegroundKind, Draw> = {
  branches(ctx, w, h, r) {
    const limb = (x: number, y: number, a: number, len: number, width: number, depth: number) => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.3, (y + y2) / 2 + (r() - 0.5) * len * 0.3, x2, y2);
      ctx.stroke();
      if (depth > 0) {
        const kids = 2 + Math.floor(r() * 2);
        for (let k = 0; k < kids; k++) limb(x2, y2, a + (r() - 0.5) * 1.4, len * range(r, 0.45, 0.7), width * 0.55, depth - 1);
      }
    };
    ctx.lineCap = 'round';
    limb(r() < 0.5 ? -10 : w + 10, h * 0.05, Math.PI / 2 + (r() - 0.5) * 1.6, h * 0.55, h * 0.06, 3);
  },
  wires(ctx, w, h, r) {
    ctx.lineWidth = 4;
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      const y0 = h * range(r, 0.05, 0.3);
      const y1 = h * range(r, 0.05, 0.3);
      ctx.beginPath();
      ctx.moveTo(-10, y0);
      ctx.quadraticCurveTo(w / 2, h * range(r, 0.6, 0.95), w + 10, y1);
      ctx.stroke();
    }
    if (r() < 0.6) {
      // A snapped cable hanging down.
      const x = w * range(r, 0.3, 0.7);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.4);
      ctx.bezierCurveTo(x + 20, h * 0.6, x - 20, h * 0.8, x + 8, h * 0.98);
      ctx.stroke();
    }
  },
  grass(ctx, w, h, r) {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.1 + 0.8 * r());
      const bh = h * range(r, 0.35, 1);
      const lean = (r() - 0.5) * w * 0.25;
      ctx.beginPath();
      ctx.moveTo(x - 5, h);
      ctx.quadraticCurveTo(x + lean * 0.3, h - bh * 0.6, x + lean, h - bh);
      ctx.quadraticCurveTo(x + lean * 0.3 + 3, h - bh * 0.6, x + 5, h);
      ctx.fill();
    }
  },
  chainlink(ctx, w, h, r) {
    const cell = 22;
    ctx.lineWidth = 2.5;
    const torn = w * range(r, 0.55, 0.85);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.15);
    ctx.lineTo(torn, h * 0.3);
    ctx.lineTo(torn * 0.85, h);
    ctx.clip();
    for (let x = -h; x < w; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(8, h);
    ctx.lineTo(10, h * 0.1);
    ctx.stroke();
  },
  rubble(ctx, w, h, r) {
    for (let i = 0; i < 9; i++) {
      const cx = w * r();
      const s = h * range(r, 0.2, 0.6);
      ctx.beginPath();
      const n = 6;
      for (let k = 0; k <= n; k++) {
        const a = Math.PI + (Math.PI * k) / n;
        const rad = s * range(r, 0.6, 1.1);
        const px = cx + Math.cos(a) * rad * 1.4;
        const py = h + Math.sin(a) * rad;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    // A bent rebar.
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.6, h);
    ctx.quadraticCurveTo(w * 0.65, h * 0.2, w * 0.8, h * 0.05);
    ctx.stroke();
  },
};

const cache = new Map<string, THREE.Texture>();

/** Blurred silhouette texture for a kind and variant. */
export function foregroundTexture(kind: ForegroundKind, variant: number): THREE.Texture {
  const key = `${kind}:${variant}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [wm, hm] = FOREGROUND_SIZE[kind];
  const w = Math.round(wm * PX_PER_M);
  const h = Math.round(hm * PX_PER_M);
  const pad = BLUR * 3;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  // Shadow trick: draw far off-canvas and let only the blurred shadow land on it.
  const off = canvas.width + 1000;
  ctx.translate(pad - off, pad);
  ctx.shadowColor = '#000';
  ctx.shadowBlur = BLUR;
  ctx.shadowOffsetX = off;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  drawers[kind](ctx, w, h, makeRng(`${key}`));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Plane size including the blur padding, so the art keeps its intended scale. */
export function foregroundPlaneSize(kind: ForegroundKind): [number, number] {
  const [w, h] = FOREGROUND_SIZE[kind];
  const padM = (BLUR * 3) / PX_PER_M;
  return [w + padM * 2, h + padM * 2];
}
