// Level triggers: x-range zones that fire an action when the child enters
// them. `once` triggers fire a single time per level load; others fire on
// every entry.

import type { TriggerSpec } from '../levels/schema';

export interface TriggerActions {
  camera(t: Extract<TriggerSpec, { action: 'camera' }>): void;
  cameraClear(seconds: number): void;
  signal(target: string, signal: string): void;
  lightning(): void;
  sound(cue: string): void;
  tension(amount: number): void;
}

export class Triggers {
  private readonly inside: boolean[];
  private readonly fired: boolean[];

  constructor(
    private readonly specs: TriggerSpec[],
    private readonly actions: TriggerActions,
  ) {
    this.inside = specs.map(() => false);
    this.fired = specs.map(() => false);
  }

  /** Mark triggers behind a respawn point as already fired (no replaying reveals). */
  skipBefore(x: number): void {
    this.specs.forEach((t, i) => {
      if (t.once && t.x + t.w <= x) this.fired[i] = true;
    });
  }

  update(px: number): void {
    this.specs.forEach((t, i) => {
      const now = px >= t.x && px <= t.x + t.w;
      if (now && !this.inside[i] && !(t.once && this.fired[i])) {
        this.fired[i] = true;
        this.fire(t);
      }
      this.inside[i] = now;
    });
  }

  private fire(t: TriggerSpec): void {
    const a = this.actions;
    switch (t.action) {
      case 'camera':
        return a.camera(t);
      case 'camera_clear':
        return a.cameraClear(t.seconds);
      case 'signal':
        return a.signal(t.target, t.signal);
      case 'lightning':
        return a.lightning();
      case 'sound':
        return a.sound(t.cue);
      case 'tension':
        return a.tension(t.amount);
    }
  }
}
