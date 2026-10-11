// The child's movement controller. Pure logic on the x/y gameplay plane: no
// rendering, no DOM, so it runs in tests.

import type { InputState } from './input';
import type { Terrain } from './terrain';

export type PlayerMode = 'idle' | 'walk' | 'run' | 'crawl' | 'air' | 'climb';

export const PLAYER = {
  height: 1.1,
  crawlHeight: 0.45,
  halfWidth: 0.18,
  walkSpeed: 1.7,
  runSpeed: 3.4,
  crawlSpeed: 0.75,
  /** Seconds of holding a direction before walking turns into a run. */
  runAfter: 1.4,
  accel: 9,
  airAccel: 7,
  gravity: 22,
  jumpSpeed: 5.6,
  /** Steepest walkable slope (rise over run). About 50 degrees. */
  maxSlope: 1.2,
  /** Uphill slows the child down; 1.0 slope costs this fraction of speed. */
  uphillDrag: 0.35,
  /** Stay glued to the ground when it drops by less than this per update. */
  snapDown: 0.3,
  /** Grace period to still jump just after walking off an edge. */
  coyoteTime: 0.08,
  /** Auto-scramble onto ledges up to about chest height when pushing into them. */
  scrambleMax: 0.62,
  /** Mid-air, the child can grab an edge up to this far above its feet. */
  airGrabMax: 0.62,
  /** Seconds a scramble takes. */
  scrambleTime: 0.42,
};

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  mode: PlayerMode = 'idle';
  /** Highest y since leaving the ground, for fall-height checks (deaths come in M4). */
  airPeakY = 0;
  /** Drop of the last landing, in meters. */
  lastFall = 0;

  private holdTime = 0;
  /** Active scramble: from, to, and progress 0..1. */
  private climb: { x0: number; y0: number; x1: number; y1: number; t: number } | null = null;
  private sinceGrounded = 0;
  private jumpLatch = false;

  constructor(
    private readonly terrain: Terrain,
    spawnX: number,
  ) {
    this.x = spawnX;
    this.y = this.floorAt(spawnX);
  }

  get crawling(): boolean {
    return this.mode === 'crawl';
  }

  get height(): number {
    return this.crawling ? PLAYER.crawlHeight : PLAYER.height;
  }

  /** Climb progress 0..1 while scrambling, for animation. */
  get climbProgress(): number {
    return this.climb?.t ?? 0;
  }

  update(input: InputState, dt: number): void {
    const t = this.terrain;
    if (this.climb) {
      this.updateClimb(dt);
      return;
    }
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Run after holding a direction long enough on the ground.
    this.holdTime = dir !== 0 && this.grounded ? this.holdTime + dt : dir !== 0 ? this.holdTime : 0;
    const wantsCrawl = input.down && this.grounded;

    let target: number;
    if (wantsCrawl) target = PLAYER.crawlSpeed;
    else if (this.holdTime > PLAYER.runAfter) target = PLAYER.runSpeed;
    else target = PLAYER.walkSpeed;

    if (this.grounded && dir !== 0) {
      const uphill = t.slopeAt(this.x + dir * 0.1) * dir;
      if (uphill > 0) target *= Math.max(0.35, 1 - uphill * PLAYER.uphillDrag);
    }

    const accel = this.grounded ? PLAYER.accel : PLAYER.airAccel;
    this.vx = approach(this.vx, dir * target, accel * dt);

    // Jump: edge-triggered, from the ground or just after leaving it. Not while crawling.
    if (!input.up) this.jumpLatch = false;
    if (input.up && !this.jumpLatch && !wantsCrawl && this.sinceGrounded <= PLAYER.coyoteTime) {
      this.vy = PLAYER.jumpSpeed;
      this.grounded = false;
      this.sinceGrounded = PLAYER.coyoteTime + 1;
      this.jumpLatch = true;
      this.airPeakY = this.y;
    }

    // Horizontal move, blocked by walls (terrain steeper than maxSlope above our feet).
    const nx = clamp(this.x + this.vx * dt, t.minX + PLAYER.halfWidth, t.maxX - PLAYER.halfWidth);
    const lead = nx + Math.sign(this.vx) * PLAYER.halfWidth;
    const ground = t.heightAt(lead);
    const rise = ground - this.y;
    const dx = Math.abs(nx - this.x);
    const blocked = this.grounded ? rise > PLAYER.maxSlope * Math.max(dx, 0.02) + 0.02 : rise > 0.02;
    if (blocked) {
      this.vx = 0;
      // Pushing into a ledge that is low enough (or within reach mid-air): scramble up.
      if (dir !== 0 && !wantsCrawl && this.tryScramble(dir)) return;
    } else {
      this.x = nx;
    }

    // Vertical. The floor is the highest ground under the child's footprint, so
    // a foot over a ledge's edge is enough to stand on it.
    const floor = this.floorAt(this.x);
    if (this.grounded) {
      if (this.y - floor > PLAYER.snapDown) {
        this.leaveGround();
      } else {
        this.y = floor;
        this.vy = 0;
      }
    }
    if (!this.grounded) {
      this.vy -= PLAYER.gravity * dt;
      this.y += this.vy * dt;
      this.airPeakY = Math.max(this.airPeakY, this.y);
      this.sinceGrounded += dt;
      if (this.y <= floor) {
        this.y = floor;
        this.vy = 0;
        this.grounded = true;
        this.lastFall = this.airPeakY - floor;
      }
    }
    if (this.grounded) this.sinceGrounded = 0;

    // Mode for animation and debug.
    if (!this.grounded) this.mode = 'air';
    else if (wantsCrawl) this.mode = 'crawl';
    else if (Math.abs(this.vx) < 0.05) this.mode = 'idle';
    else if (Math.abs(this.vx) > (PLAYER.walkSpeed + PLAYER.runSpeed) / 2) this.mode = 'run';
    else this.mode = 'walk';
  }

  /** Find the top of the wall in direction `dir` and start a scramble if it is in reach. */
  private tryScramble(dir: 1 | -1 | number): boolean {
    const t = this.terrain;
    const reach = this.grounded ? PLAYER.scrambleMax : PLAYER.airGrabMax;
    // Walk forward from the wall face until the ground levels out.
    let x = this.x + dir * PLAYER.halfWidth;
    let found = false;
    for (let i = 0; i < 12; i++) {
      const next = x + dir * 0.05;
      if (Math.abs(t.heightAt(next) - t.heightAt(x)) < 0.05 * PLAYER.maxSlope) {
        found = true;
        break;
      }
      x = next;
    }
    if (!found) return false;
    const topX = x + dir * (PLAYER.halfWidth + 0.05);
    const topY = this.floorAt(topX);
    const rise = topY - this.y;
    if (rise < 0.03 || rise > reach) return false;
    this.climb = { x0: this.x, y0: this.y, x1: topX, y1: topY, t: 0 };
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.mode = 'climb';
    return true;
  }

  private updateClimb(dt: number): void {
    const c = this.climb!;
    c.t = Math.min(1, c.t + dt / PLAYER.scrambleTime);
    // Up first, then over the edge.
    const up = Math.min(1, c.t / 0.65);
    const over = Math.max(0, (c.t - 0.45) / 0.55);
    const ease = (v: number) => v * v * (3 - 2 * v);
    this.y = c.y0 + (c.y1 - c.y0) * ease(up);
    this.x = c.x0 + (c.x1 - c.x0) * ease(over);
    this.mode = 'climb';
    if (c.t >= 1) {
      this.climb = null;
      this.grounded = true;
      this.sinceGrounded = 0;
      this.airPeakY = this.y;
      this.lastFall = 0;
      this.mode = 'idle';
    }
  }

  floorAt(x: number): number {
    const t = this.terrain;
    const hw = PLAYER.halfWidth * 0.8;
    return Math.max(t.heightAt(x - hw), t.heightAt(x), t.heightAt(x + hw));
  }

  private leaveGround(): void {
    this.grounded = false;
    this.airPeakY = this.y;
  }
}

function approach(v: number, target: number, delta: number): number {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
