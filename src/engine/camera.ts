// Cinematic follow camera: lagged and eased, with a gentle look-ahead in the
// walking direction and a slight handheld drift. Level triggers (M3) call
// hint() for slow pull-outs on big reveals and push-ins during tension.

import type * as THREE from 'three';
import type { Player } from './player';
import { CAMERA } from './renderer';

export interface CameraHint {
  /** Distance multiplier: > 1 pulls out, < 1 pushes in. */
  zoom?: number;
  /** Extra height of the focus point, in meters. */
  offsetY?: number;
  /** Extra horizontal offset of the focus point, in meters. */
  offsetX?: number;
}

const DEFAULT_HINT: Required<CameraHint> = { zoom: 1, offsetY: 0, offsetX: 0 };

export class CameraRig {
  private x: number;
  private y: number;
  private lead = 0;
  private time = 0;
  /** Smoothed visual depth of the path under the child (path bending toward or away from the camera). */
  private depth = 0;

  private current = { ...DEFAULT_HINT };
  private from = { ...DEFAULT_HINT };
  private to = { ...DEFAULT_HINT };
  private blend = 1;
  private blendTime = 1;

  /** Handheld drift amount, 0 to 1. */
  drift = 1;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    p?: Player,
  ) {
    this.x = p?.x ?? 0;
    this.y = (p?.y ?? 0) + CAMERA.height;
    this.apply();
  }

  /** Back to the default framing immediately (level loads). */
  resetHint(): void {
    this.current = { ...DEFAULT_HINT };
    this.from = { ...DEFAULT_HINT };
    this.to = { ...DEFAULT_HINT };
    this.blend = 1;
  }

  get distance(): number {
    return CAMERA.distance * this.current.zoom;
  }

  /** Ease toward a framing over `seconds`. Omitted fields return to default. */
  hint(h: CameraHint, seconds = 3): void {
    this.from = { ...this.current };
    // Fields left undefined (or non-finite) fall back to the default framing.
    // A plain spread would copy `undefined` over the defaults and NaN the camera.
    const pick = (v: number | undefined, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
    this.to = {
      zoom: pick(h.zoom, DEFAULT_HINT.zoom),
      offsetY: pick(h.offsetY, DEFAULT_HINT.offsetY),
      offsetX: pick(h.offsetX, DEFAULT_HINT.offsetX),
    };
    this.blend = 0;
    this.blendTime = Math.max(0.01, seconds);
  }

  clearHint(seconds = 3): void {
    this.hint({}, seconds);
  }

  /** Jump straight to the player (spawn, respawn, debug teleports). */
  snap(p: Player, pathDepth = 0): void {
    this.depth = pathDepth;
    this.lead = p.facing * 1.1;
    this.x = p.x + this.lead;
    this.y = p.y + CAMERA.height;
    this.apply();
  }

  /** `pathDepth` is the path's visual depth at the child; the camera follows half of it, so bends read as scale changes. */
  update(p: Player, dt: number, pathDepth = 0): void {
    this.time += dt;
    this.depth += (pathDepth - this.depth) * (1 - Math.exp(-dt * 1.5));
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendTime);
      const t = this.blend * this.blend * (3 - 2 * this.blend); // smoothstep
      for (const k of ['zoom', 'offsetY', 'offsetX'] as const) {
        this.current[k] = this.from[k] + (this.to[k] - this.from[k]) * t;
      }
    }

    const targetLead = p.facing * (1.1 + Math.min(Math.abs(p.vx), 3.4) * 0.35);
    this.lead += (targetLead - this.lead) * (1 - Math.exp(-dt * 1.1));
    this.x += (p.x + this.lead - this.x) * (1 - Math.exp(-dt * 2.6));
    // Vertical follow is lazier, so jumps don't jolt the frame.
    const ty = p.y + CAMERA.height;
    this.y += (ty - this.y) * (1 - Math.exp(-dt * (p.grounded ? 2 : 0.9)));
    this.apply();
  }

  private apply(): void {
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || !Number.isFinite(this.depth)) {
      this.x = this.y = this.depth = 0;
    }
    for (const k of ['zoom', 'offsetY', 'offsetX'] as const) {
      if (!Number.isFinite(this.current[k])) this.current[k] = DEFAULT_HINT[k];
    }
    const t = this.time;
    const d = this.drift;
    const hx = (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.73 + 1.1) * 0.4) * 0.05 * d;
    const hy = (Math.sin(t * 0.27 + 2.0) * 0.6 + Math.sin(t * 0.61) * 0.4) * 0.035 * d;
    const fx = this.x + this.current.offsetX;
    const fy = this.y + this.current.offsetY;
    const dist = this.distance;
    this.camera.position.set(fx + hx, fy + 0.6 * this.current.zoom + hy, dist + this.depth * 0.5);
    this.camera.lookAt(fx + hx * 0.5, fy + hy * 0.5, this.depth);
    this.camera.rotation.z += Math.sin(t * 0.23) * 0.002 * d;
  }
}
