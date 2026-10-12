// Movable boxes: crates, carts, logs, limp bodies. Each owns a Solid so the
// child and other boxes collide with it, stand on it and scramble onto it.
// They fall under gravity, rest on terrain or other solids (stacking), and
// move sideways only when pushed or pulled (or, for carts, while rolling).

import { type Collision, EPS, type Solid } from './collision';

export interface BoxOptions {
  /** Heavier boxes push slower. 1 = a crate the child can just shift. */
  mass?: number;
  /** Carts keep rolling briefly after a push. */
  rolls?: boolean;
  climbable?: boolean;
  tag?: string;
}

const GRAVITY = 22;
/** Highest terrain step a box can be shoved up. */
const BOX_STEP = 0.12;

export class DynBox {
  readonly solid: Solid;
  readonly mass: number;
  readonly rolls: boolean;
  vx = 0;
  vy = 0;
  grounded = false;
  /** Set by the level when something is pushing it this step. */
  pushed = false;

  constructor(
    private readonly coll: Collision,
    cx: number,
    bottom: number,
    readonly w: number,
    readonly h: number,
    opts: BoxOptions = {},
  ) {
    this.mass = opts.mass ?? 1;
    this.rolls = opts.rolls ?? false;
    this.solid = coll.add({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minY: bottom,
      maxY: bottom + h,
      enabled: true,
      climbable: opts.climbable ?? true,
      tag: opts.tag ?? 'box',
      dx: 0,
      dy: 0,
    });
  }

  get cx(): number {
    return (this.solid.minX + this.solid.maxX) / 2;
  }

  get bottom(): number {
    return this.solid.minY;
  }

  get top(): number {
    return this.solid.maxY;
  }

  setPosition(cx: number, bottom: number): void {
    const s = this.solid;
    s.minX = cx - this.w / 2;
    s.maxX = cx + this.w / 2;
    s.minY = bottom;
    s.maxY = bottom + this.h;
  }

  /** Try to slide sideways by dx. Returns how far it actually moved. */
  tryMove(dx: number): number {
    if (Math.abs(dx) < 1e-6) return 0;
    const s = this.solid;
    const dir = Math.sign(dx);
    // Sub-step so a fast shove can't tunnel through a thin wall.
    const steps = Math.ceil(Math.abs(dx) / 0.05);
    const step = dx / steps;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      const lead = dir > 0 ? s.maxX + step : s.minX + step;
      const groundAhead = this.coll.terrain.heightAt(lead);
      if (groundAhead > s.minY + BOX_STEP) break; // terrain wall
      // Solids taller than a small step block; lower ones (a plate, a curb) get climbed.
      if (this.coll.overlap(s.minX + step, s.maxX + step, s.minY + BOX_STEP, s.maxY - EPS, s)) break;
      s.minX += step;
      s.maxX += step;
      moved += step;
      // Shoved up a small step (terrain or solid): lift onto it.
      if (this.grounded) {
        const f = this.coll.floor(s.minX, s.maxX, s.minY, BOX_STEP, s);
        if (f.y > s.minY) {
          const lift = f.y - s.minY;
          s.minY += lift;
          s.maxY += lift;
        }
      }
    }
    return moved;
  }

  update(dt: number): void {
    const s = this.solid;
    const x0 = s.minX;
    const y0 = s.minY;

    // Ride whatever we're resting on (a lift, a cart).
    const under = this.coll.floor(s.minX, s.maxX, s.minY, 0.05, s);
    if (this.grounded && under.solid && (under.solid.dx || under.solid.dy)) {
      this.tryMove(under.solid.dx ?? 0);
      s.minY += under.solid.dy ?? 0;
      s.maxY += under.solid.dy ?? 0;
    }

    if (this.rolls && !this.pushed && Math.abs(this.vx) > 0.01) {
      const moved = this.tryMove(this.vx * dt);
      if (Math.abs(moved) < Math.abs(this.vx * dt) * 0.5) this.vx = 0;
      this.vx *= Math.exp(-dt * 1.6);
    } else if (!this.rolls) {
      this.vx = 0;
    }
    this.pushed = false;

    this.vy -= GRAVITY * dt;
    const drop = this.vy * dt;
    const floor = this.coll.floor(s.minX, s.maxX, s.minY, Math.max(0.05, -drop + 0.02), s);
    if (s.minY + drop <= floor.y) {
      const delta = floor.y - s.minY;
      s.minY += delta;
      s.maxY += delta;
      this.vy = 0;
      this.grounded = true;
    } else {
      s.minY += drop;
      s.maxY += drop;
      this.grounded = false;
    }
    s.dx = s.minX - x0;
    s.dy = s.minY - y0;
  }
}
