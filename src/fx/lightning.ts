// Occasional distant lightning or flash: a short, uneven double flicker at
// random intervals. Pure timing logic; renderers read `value` (0 to 1).

import { type Rng, makeRng } from '../engine/rng';

export class Lightning {
  value = 0;
  private wait: number;
  private t = -1;
  private pulses: Array<[number, number, number]> = []; // start, length, peak

  constructor(
    private frequency: number,
    private readonly rng: Rng = makeRng(Date.now()),
  ) {
    this.wait = this.nextWait();
  }

  setFrequency(frequency: number): void {
    this.frequency = frequency;
    this.wait = this.nextWait();
  }

  private nextWait(): number {
    if (this.frequency <= 0) return Infinity;
    // frequency 1 -> every ~6-14 s; 0.2 -> every ~30-70 s.
    return (6 + this.rng() * 8) / this.frequency;
  }

  /** Force a flash now (triggers and debug). */
  strike(): void {
    const r = this.rng;
    this.t = 0;
    this.pulses = [[0, 0.08, 0.7 + r() * 0.3]];
    const extra = Math.floor(r() * 3);
    let at = 0.1;
    for (let i = 0; i < extra; i++) {
      at += 0.06 + r() * 0.12;
      this.pulses.push([at, 0.05 + r() * 0.08, 0.3 + r() * 0.6]);
    }
  }

  update(dt: number): number {
    this.wait -= dt;
    if (this.wait <= 0) {
      this.strike();
      this.wait = this.nextWait();
    }
    this.value = 0;
    if (this.t >= 0) {
      this.t += dt;
      let done = true;
      for (const [start, len, peak] of this.pulses) {
        const local = this.t - start;
        if (local < len + 0.4) done = false;
        if (local >= 0 && local < len) this.value = Math.max(this.value, peak);
        else if (local >= len && local < len + 0.4) this.value = Math.max(this.value, peak * Math.exp(-(local - len) * 9));
      }
      if (done) this.t = -1;
    }
    return this.value;
  }
}
