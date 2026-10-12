// Quality tiers and the controller that picks one from measured frame times.
// Starts high; steps down when frames run long, and cautiously back up when
// there is plenty of headroom. A manual choice (debug menu) overrides it and
// is remembered on this device.

export type Tier = 'high' | 'medium' | 'low';
export type QualityMode = 'auto' | Tier;

export interface TierSettings {
  /** Cap on the renderer's pixel ratio (fill rate is the main cost on phones). */
  pixelRatio: number;
  /** Fraction of the level's ash particles drawn. */
  ash: number;
  godRays: boolean;
  /** Sky render-target divisor. */
  skyDownscale: number;
  /** Grain strength multiplier. */
  grain: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { pixelRatio: 2, ash: 1, godRays: true, skyDownscale: 3, grain: 1 },
  medium: { pixelRatio: 1.5, ash: 0.6, godRays: true, skyDownscale: 4, grain: 1 },
  low: { pixelRatio: 1, ash: 0.35, godRays: false, skyDownscale: 6, grain: 0.85 },
};

const ORDER: Tier[] = ['high', 'medium', 'low'];
const STORE_KEY = 'ashfall.quality';

export const QUALITY = {
  /** Smoothed frame time above this (ms) for `downAfter` seconds steps down. */
  slowMs: 19.5,
  downAfter: 2,
  /** Below this for `upAfter` seconds steps back up (never sooner than `upCooldown` after a step down). */
  fastMs: 12.5,
  upAfter: 12,
  upCooldown: 30,
  /** Ignore frames right after a change (shader compiles, resize). */
  settle: 1.5,
};

export class QualityController {
  tier: Tier = 'high';
  mode: QualityMode = 'auto';
  /** Smoothed frame time, ms. */
  ema = 16.7;
  private slowFor = 0;
  private fastFor = 0;
  private settle = QUALITY.settle;
  private sinceDown = Infinity;

  constructor(load = true) {
    if (load) {
      try {
        const m = localStorage.getItem(STORE_KEY) as QualityMode | null;
        if (m === 'auto' || m === 'high' || m === 'medium' || m === 'low') this.mode = m;
      } catch {
        // No storage: auto.
      }
    }
    if (this.mode !== 'auto') this.tier = this.mode;
  }

  get settings(): TierSettings {
    return TIERS[this.tier];
  }

  setMode(mode: QualityMode): void {
    this.mode = mode;
    if (mode !== 'auto') this.tier = mode;
    this.settle = QUALITY.settle;
    this.slowFor = this.fastFor = 0;
    try {
      localStorage.setItem(STORE_KEY, mode);
    } catch {
      // ignore
    }
  }

  /** Feed one frame's duration (seconds). Returns true when the tier changed. */
  feed(dt: number): boolean {
    if (dt <= 0 || dt > 0.25) return false; // tab switches and hitches are not signal
    const ms = dt * 1000;
    this.ema += (ms - this.ema) * 0.05;
    this.sinceDown += dt;
    if (this.mode !== 'auto') return false;
    if (this.settle > 0) {
      this.settle -= dt;
      return false;
    }
    const i = ORDER.indexOf(this.tier);
    this.slowFor = this.ema > QUALITY.slowMs ? this.slowFor + dt : 0;
    this.fastFor = this.ema < QUALITY.fastMs ? this.fastFor + dt : 0;
    if (this.slowFor > QUALITY.downAfter && i < ORDER.length - 1) {
      this.tier = ORDER[i + 1];
      this.sinceDown = 0;
      return this.changed();
    }
    if (this.fastFor > QUALITY.upAfter && i > 0 && this.sinceDown > QUALITY.upCooldown) {
      this.tier = ORDER[i - 1];
      return this.changed();
    }
    return false;
  }

  private changed(): true {
    this.settle = QUALITY.settle;
    this.slowFor = this.fastFor = 0;
    this.ema = 16.7;
    return true;
  }
}
