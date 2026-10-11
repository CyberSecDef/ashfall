// Character controller for the child, and (with different params) for relay
// bodies. Pure logic on the x/y gameplay plane: no rendering, no DOM, so it
// runs in tests.
//
// Collides with the terrain heightfield and, when given an ActorWorld, with
// solid boxes: step-ups, auto-scramble onto ledges and boxes, crawling under
// ceilings, ladders and ropes, push/pull of movable boxes, water slowdown, and
// fatal falls.

import type { DynBox } from './bodies';
import type { Collision, Solid } from './collision';
import type { InputState } from './input';
import type { Terrain } from './terrain';

export type PlayerMode = 'idle' | 'walk' | 'run' | 'crawl' | 'air' | 'climb' | 'ladder' | 'push' | 'pull' | 'dead' | 'frozen';

export interface ActorParams {
  height: number;
  crawlHeight: number;
  halfWidth: number;
  walkSpeed: number;
  runSpeed: number;
  crawlSpeed: number;
  /** Seconds of holding a direction before walking turns into a run. */
  runAfter: number;
  accel: number;
  airAccel: number;
  gravity: number;
  jumpSpeed: number;
  /** Steepest walkable slope (rise over run). */
  maxSlope: number;
  /** Uphill slows down; a 1.0 slope costs this fraction of speed. */
  uphillDrag: number;
  /** Stay glued to the ground when it drops by less than this per update. */
  snapDown: number;
  /** Small steps (curbs, plates, low boxes) are walked up without scrambling. */
  stepUp: number;
  /** Grace period to still jump just after walking off an edge. */
  coyoteTime: number;
  /** Auto-scramble onto ledges up to about chest height when pushing into them. */
  scrambleMax: number;
  /** Mid-air, edges up to this far above the feet can be grabbed. */
  airGrabMax: number;
  scrambleTime: number;
  canCrawl: boolean;
  canJump: boolean;
  canRun: boolean;
  /** Push/pull speed with a mass-1 box. */
  pushSpeed: number;
  climbSpeed: number;
  /** Landing from higher than this is fatal. */
  safeFall: number;
}

export const CHILD: ActorParams = {
  height: 1.1,
  crawlHeight: 0.45,
  halfWidth: 0.18,
  walkSpeed: 1.7,
  runSpeed: 3.4,
  crawlSpeed: 0.75,
  runAfter: 1.4,
  accel: 9,
  airAccel: 7,
  gravity: 22,
  jumpSpeed: 5.6,
  maxSlope: 1.2,
  uphillDrag: 0.35,
  snapDown: 0.3,
  stepUp: 0.16,
  coyoteTime: 0.08,
  scrambleMax: 0.62,
  airGrabMax: 0.62,
  scrambleTime: 0.42,
  canCrawl: true,
  canJump: true,
  canRun: true,
  pushSpeed: 1.0,
  climbSpeed: 1.3,
  safeFall: 3.4,
};

/** Kept for existing callers and tests. */
export const PLAYER = CHILD;

export interface Ladder {
  x: number;
  bottom: number;
  top: number;
  /** Ropes sway and can't be stood at the top of. */
  rope?: boolean;
}

/** What the controller can see of the level. All optional, so bare terrain still works. */
export interface ActorWorld {
  collision?: Collision;
  ladders?: Ladder[];
  boxes?: DynBox[];
  /** Speed multiplier for shallow water at x (1 = dry). */
  waterSlow?: (x: number) => number;
}

const ZERO_INPUT: InputState = { left: false, right: false, up: false, down: false, interact: false, interactPressed: false };

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  mode: PlayerMode = 'idle';
  /** Highest y since leaving the ground, for fall-height checks. */
  airPeakY = 0;
  /** Drop of the last landing, in meters. */
  lastFall = 0;
  /** Set when a landing exceeded safeFall; the level kills the actor. */
  fatalFall = false;
  dead = false;
  /** Not taking input (the child while a relay body is controlled). */
  frozen = false;
  standingOn: Solid | null = null;
  grab: { box: DynBox; side: 1 | -1 } | null = null;
  ladder: Ladder | null = null;

  private holdTime = 0;
  private sinceGrounded = 0;
  private jumpLatch = false;
  private climb: { x0: number; y0: number; x1: number; y1: number; t: number } | null = null;
  private crouched = false;

  constructor(
    private readonly terrain: Terrain,
    spawnX: number,
    readonly params: ActorParams = CHILD,
    private readonly world: ActorWorld = {},
  ) {
    this.x = spawnX;
    this.y = this.floorAt(spawnX);
  }

  get crawling(): boolean {
    return this.crouched;
  }

  get height(): number {
    return this.crouched ? this.params.crawlHeight : this.params.height;
  }

  /** Climb progress 0..1 while scrambling, for animation. */
  get climbProgress(): number {
    return this.climb?.t ?? 0;
  }

  /** Kill this actor (the level decides what happens next). */
  die(): void {
    this.dead = true;
    this.grab = null;
    this.ladder = null;
    this.climb = null;
    this.mode = 'dead';
  }

  /** Teleport (respawn, debug). */
  place(x: number, y = this.floorAt(x)): void {
    this.x = x;
    this.y = y;
    this.vx = this.vy = 0;
    this.grounded = true;
    this.climb = null;
    this.ladder = null;
    this.grab = null;
  }

  update(rawInput: InputState, dt: number): void {
    const input = this.dead || this.frozen ? ZERO_INPUT : rawInput;
    if (this.dead) {
      this.fall(dt);
      this.mode = 'dead';
      return;
    }
    this.ride();
    if (this.climb) {
      this.updateClimb(dt);
      return;
    }
    if (this.updateLadder(input, dt)) return;

    const P = this.params;
    const t = this.terrain;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    // Grab and push/pull a box while interact is held.
    this.updateGrab(input);
    if (dir !== 0 && !this.grab) this.facing = dir as 1 | -1;

    // Crawl: held down, or forced under a low ceiling.
    const forced = P.canCrawl && this.grounded && this.headroom() < P.height - 0.02;
    this.crouched = P.canCrawl && this.grounded && !this.grab && (input.down || forced);

    this.holdTime = this.grab ? 0 : dir !== 0 && this.grounded ? this.holdTime + dt : dir !== 0 ? this.holdTime : 0;

    let target: number;
    if (this.grab) target = P.pushSpeed / Math.sqrt(this.grab.box.mass);
    else if (this.crouched) target = P.crawlSpeed;
    else if (P.canRun && this.holdTime > P.runAfter) target = P.runSpeed;
    else target = P.walkSpeed;

    if (this.grounded && dir !== 0) {
      const uphill = t.slopeAt(this.x + dir * 0.1) * dir;
      if (uphill > 0) target *= Math.max(0.35, 1 - uphill * P.uphillDrag);
    }
    target *= this.world.waterSlow?.(this.x) ?? 1;

    const accel = this.grounded ? P.accel : P.airAccel;
    this.vx = approach(this.vx, dir * target, accel * dt);

    // Jump: edge-triggered, from the ground or just after leaving it.
    if (!input.up) this.jumpLatch = false;
    if (
      input.up &&
      !this.jumpLatch &&
      P.canJump &&
      !this.crouched &&
      !this.grab &&
      this.sinceGrounded <= P.coyoteTime &&
      this.headroom() > P.height + 0.3
    ) {
      this.vy = P.jumpSpeed;
      this.grounded = false;
      this.standingOn = null;
      this.sinceGrounded = P.coyoteTime + 1;
      this.jumpLatch = true;
      this.airPeakY = this.y;
    }

    if (this.grab) {
      this.moveWithGrab(this.vx * dt);
    } else if (this.moveHorizontal(this.vx * dt, dir)) {
      return; // started a scramble
    }

    this.vertical(dt);

    // Mode for animation and debug.
    if (!this.grounded) this.mode = 'air';
    else if (this.grab) this.mode = Math.abs(this.vx) < 0.05 || Math.sign(this.vx) === this.grab.side ? 'push' : 'pull';
    else if (this.crouched) this.mode = 'crawl';
    else if (this.frozen) this.mode = 'frozen';
    else if (Math.abs(this.vx) < 0.05) this.mode = 'idle';
    else if (Math.abs(this.vx) > (P.walkSpeed + P.runSpeed) / 2) this.mode = 'run';
    else this.mode = 'walk';
  }

  // ---- queries ---------------------------------------------------------------

  /** Highest ground (terrain or solid top) under the footprint, near the feet. */
  floorAt(x: number, y = Infinity, stepUp = 0): number {
    const hw = this.params.halfWidth * 0.8;
    const coll = this.world.collision;
    if (!coll) {
      const t = this.terrain;
      return Math.max(t.heightAt(x - hw), t.heightAt(x), t.heightAt(x + hw));
    }
    if (y === Infinity) return Math.max(coll.restingTop(x - hw, x + hw), this.terrainFootprint(x));
    return coll.floor(x - hw, x + hw, y, stepUp).y;
  }

  private terrainFootprint(x: number): number {
    const hw = this.params.halfWidth * 0.8;
    const t = this.terrain;
    return Math.max(t.heightAt(x - hw), t.heightAt(x), t.heightAt(x + hw));
  }

  private headroom(): number {
    const coll = this.world.collision;
    if (!coll) return Infinity;
    const hw = this.params.halfWidth;
    return coll.ceiling(this.x - hw, this.x + hw, this.y + 0.05) - this.y;
  }

  // ---- movement --------------------------------------------------------------

  private ride(): void {
    const s = this.standingOn;
    if (!this.grounded || !s || !s.enabled) return;
    if (s.dx) this.moveHorizontal(s.dx, 0, true);
    if (s.dy) this.y += s.dy;
  }

  /** Is the footprint at nx blocked by terrain or solids? */
  private blockedAt(nx: number, dir: number, exclude?: Solid): { blocked: boolean; solid: Solid | null } {
    const P = this.params;
    const t = this.terrain;
    const hw = P.halfWidth;
    // Terrain wall: ground ahead rises steeper than walkable.
    const lead = nx + dir * hw;
    const rise = t.heightAt(lead) - this.y;
    const dx = Math.abs(nx - this.x);
    const terrainBlocked = this.grounded ? rise > P.maxSlope * Math.max(dx, 0.02) + 0.02 : rise > 0.02;
    if (terrainBlocked) return { blocked: true, solid: null };
    const coll = this.world.collision;
    if (coll) {
      const y0 = this.y + (this.grounded ? P.stepUp : 0.02);
      const s = coll.overlap(nx - hw, nx + hw, y0, this.y + this.height, exclude);
      if (s) return { blocked: true, solid: s };
    }
    return { blocked: false, solid: null };
  }

  /** Returns true if a scramble started. */
  private moveHorizontal(dx: number, dir: number, riding = false): boolean {
    const t = this.terrain;
    const P = this.params;
    if (Math.abs(dx) < 1e-7) return false;
    const steps = Math.ceil(Math.abs(dx) / 0.05);
    const step = dx / steps;
    for (let i = 0; i < steps; i++) {
      const nx = clamp(this.x + step, t.minX + P.halfWidth, t.maxX - P.halfWidth);
      const hit = this.blockedAt(nx, Math.sign(step));
      if (hit.blocked) {
        if (!riding) this.vx = 0;
        // Pushing into something low enough (or within reach mid-air): scramble up.
        if (!riding && dir !== 0 && !this.crouched && this.tryScramble(dir, hit.solid)) return true;
        return false;
      }
      this.x = nx;
    }
    return false;
  }

  private vertical(dt: number): void {
    const P = this.params;
    const coll = this.world.collision;
    const hw = P.halfWidth * 0.8;
    if (this.grounded) {
      const f = this.floorWithSolid(this.y, P.stepUp);
      if (this.y - f.y > P.snapDown) {
        this.grounded = false;
        this.standingOn = null;
        this.airPeakY = this.y;
      } else {
        this.y = f.y;
        this.vy = 0;
        this.standingOn = f.solid;
      }
    }
    if (!this.grounded) {
      this.vy -= P.gravity * dt;
      let ny = this.y + this.vy * dt;
      // Head bump.
      if (coll && this.vy > 0) {
        const ceil = coll.ceiling(this.x - hw, this.x + hw, this.y + this.height - 0.02);
        if (ny + this.height > ceil) {
          ny = ceil - this.height;
          this.vy = 0;
        }
      }
      const f = this.floorWithSolid(this.y, Math.max(0.05, this.y - ny + 0.02));
      this.airPeakY = Math.max(this.airPeakY, ny);
      this.sinceGrounded += dt;
      if (ny <= f.y) {
        this.y = f.y;
        this.vy = 0;
        this.grounded = true;
        this.standingOn = f.solid;
        this.lastFall = this.airPeakY - f.y;
        if (this.lastFall > P.safeFall) this.fatalFall = true;
      } else {
        this.y = ny;
      }
    }
    if (this.grounded) this.sinceGrounded = 0;
  }

  private floorWithSolid(y: number, stepUp: number): { y: number; solid: Solid | null } {
    const hw = this.params.halfWidth * 0.8;
    const coll = this.world.collision;
    if (coll) return coll.floor(this.x - hw, this.x + hw, y, stepUp);
    return { y: this.floorAt(this.x), solid: null };
  }

  private fall(dt: number): void {
    if (this.grounded) {
      const f = this.floorWithSolid(this.y, this.params.stepUp);
      if (this.y - f.y > this.params.snapDown) this.grounded = false;
      else this.y = f.y;
    }
    if (!this.grounded) {
      this.vy -= this.params.gravity * dt;
      const ny = this.y + this.vy * dt;
      const f = this.floorWithSolid(this.y, Math.max(0.05, this.y - ny + 0.02));
      if (ny <= f.y) {
        this.y = f.y;
        this.vy = 0;
        this.grounded = true;
      } else this.y = ny;
    }
    this.vx = 0;
  }

  // ---- scramble ----------------------------------------------------------------

  /** Find the top of whatever blocks us and start a scramble if it is in reach. */
  private tryScramble(dir: number, solid: Solid | null): boolean {
    const P = this.params;
    const reach = this.grounded ? P.scrambleMax : P.airGrabMax;
    let topX: number;
    let topY: number;
    if (solid) {
      if (!solid.climbable) return false;
      topY = solid.maxY;
      topX = dir > 0 ? solid.minX + P.halfWidth + 0.04 : solid.maxX - P.halfWidth - 0.04;
      // Narrow tops: stand centered on them.
      if (solid.maxX - solid.minX < P.halfWidth * 2 + 0.08) topX = (solid.minX + solid.maxX) / 2;
    } else {
      // Terrain ledge: walk forward from the wall face until the ground levels out.
      const t = this.terrain;
      let x = this.x + dir * P.halfWidth;
      let found = false;
      for (let i = 0; i < 12; i++) {
        const next = x + dir * 0.05;
        if (Math.abs(t.heightAt(next) - t.heightAt(x)) < 0.05 * P.maxSlope) {
          found = true;
          break;
        }
        x = next;
      }
      if (!found) return false;
      topX = x + dir * (P.halfWidth + 0.05);
      topY = this.floorAt(topX);
    }
    const rise = topY - this.y;
    if (rise < 0.03 || rise > reach) return false;
    // Room to stand up there?
    const coll = this.world.collision;
    if (coll) {
      const hw = P.halfWidth;
      if (coll.ceiling(topX - hw, topX + hw, topY + 0.02) - topY < P.height) return false;
      if (coll.overlap(topX - hw, topX + hw, topY + 0.02, topY + P.height)) return false;
    }
    this.climb = { x0: this.x, y0: this.y, x1: topX, y1: topY, t: 0 };
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.mode = 'climb';
    return true;
  }

  private updateClimb(dt: number): void {
    const c = this.climb!;
    c.t = Math.min(1, c.t + dt / this.params.scrambleTime);
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
      this.standingOn = this.floorWithSolid(this.y, 0.05).solid;
    }
  }

  // ---- ladders and ropes ---------------------------------------------------------

  /** Returns true while on a ladder (the ladder owns movement). */
  private updateLadder(input: InputState, dt: number): boolean {
    const P = this.params;
    const ladders = this.world.ladders;
    if (!ladders || !P.canJump) return false;

    if (!this.ladder) {
      if (this.grab || this.crouched) return false;
      for (const l of ladders) {
        if (Math.abs(this.x - l.x) > 0.35) continue;
        const atBottom = this.y >= l.bottom - 0.2 && this.y < l.top - 0.3;
        const atTop = !l.rope && Math.abs(this.y - l.top) < 0.15;
        const rising = !this.grounded && this.vy > 0;
        if ((input.up && !rising && atBottom) || (input.down && atTop && this.grounded)) {
          this.ladder = l;
          this.vx = this.vy = 0;
          this.grounded = false;
          this.standingOn = null;
          break;
        }
      }
      if (!this.ladder) return false;
    }

    const l = this.ladder;
    this.mode = 'ladder';
    this.x += (l.x - this.x) * Math.min(1, dt * 12);
    const v = ((input.up ? 1 : 0) - (input.down ? 1 : 0)) * P.climbSpeed;
    this.y += v * dt;
    this.airPeakY = this.y;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.y >= l.top - 0.02) {
      if (l.rope) {
        this.y = l.top - 0.02;
      } else {
        // Step off the top onto the ledge in the pressed (or facing) direction.
        this.y = l.top;
        this.ladder = null;
        this.grounded = true;
        this.jumpLatch = true;
        const off = (dir || this.facing) * (P.halfWidth + 0.2);
        if (this.floorAt(this.x + off, l.top + 0.05, 0.2) >= l.top - 0.05) this.x += off;
        return true;
      }
    }
    const floor = this.floorAt(this.x, this.y + 0.05, 0.1);
    // The ledge the ladder leans on doesn't count as floor while climbing down past it.
    if (this.y <= floor && v < 0 && (l.rope || floor < l.top - 0.2)) {
      this.y = floor;
      this.ladder = null;
      this.grounded = true;
      return true;
    }
    // Let go sideways (drops from ropes too).
    if (dir !== 0 && v === 0) {
      this.facing = dir as 1 | -1;
      this.ladder = null;
      this.grounded = false;
      this.vx = dir * P.walkSpeed * 0.6;
      this.vy = 0.5;
      this.airPeakY = this.y;
      this.jumpLatch = true;
    }
    return true;
  }

  // ---- push and pull ---------------------------------------------------------------

  private updateGrab(input: InputState): void {
    const boxes = this.world.boxes;
    if (!input.interact || !this.grounded || !boxes) {
      this.grab = null;
      return;
    }
    const hw = this.params.halfWidth;
    if (this.grab) {
      const b = this.grab.box;
      const gap = this.grab.side > 0 ? b.solid.minX - (this.x + hw) : this.x - hw - b.solid.maxX;
      if (gap > 0.2 || !b.grounded || Math.abs(b.bottom - this.y) > 0.35) this.grab = null;
      return;
    }
    for (const b of boxes) {
      if (!b.solid.enabled || !Number.isFinite(b.mass)) continue;
      if (Math.abs(b.bottom - this.y) > 0.3) continue;
      const right = b.solid.minX - (this.x + hw);
      const left = this.x - hw - b.solid.maxX;
      if (right > -0.05 && right < 0.16) this.grab = { box: b, side: 1 };
      else if (left > -0.05 && left < 0.16) this.grab = { box: b, side: -1 };
      if (this.grab) {
        this.facing = this.grab.side;
        return;
      }
    }
  }

  private moveWithGrab(dx: number): void {
    const g = this.grab!;
    if (Math.abs(dx) < 1e-7) return;
    const toward = Math.sign(dx) === g.side;
    g.box.pushed = true;
    if (toward) {
      // Push: the box moves first; we follow as far as it went.
      const moved = g.box.tryMove(dx);
      this.moveHorizontal(moved, 0);
      if (Math.abs(moved) < Math.abs(dx) * 0.5) this.vx = 0;
    } else {
      // Pull: we step back (ignoring the box), then drag it after us.
      const x0 = this.x;
      const hit = this.blockedAt(this.x + dx, Math.sign(dx), g.box.solid);
      if (!hit.blocked) this.x += dx;
      else this.vx = 0;
      const moved = g.box.tryMove(this.x - x0);
      if (Math.abs(moved - (this.x - x0)) > 1e-4) this.x = x0 + moved;
    }
    if (g.box.rolls) g.box.vx = this.vx;
  }
}

function approach(v: number, target: number, delta: number): number {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
