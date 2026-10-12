// One loaded level's simulation: terrain, collision, the child and relay
// bodies, movable boxes, entities, triggers, checkpoints, interaction, hiding,
// death and relay control. No renderer, so it runs headless in tests; the
// Game (game.ts) wraps it with rendering, fades and saving.

import * as THREE from 'three';
import { createEntity } from '../entities/registry';
import type { Cover, Effects, Entity, Interactable, LevelContext, WaterZone } from '../entities/types';
import { buildWorld, depthForSpeed, type ForegroundItem, type World } from '../fx/layers';
import type { Lightning } from '../fx/lightning';
import type { Level } from '../levels/schema';
import type { DynBox } from './bodies';
import type { CameraRig } from './camera';
import { Collision } from './collision';
import { emptyInput, type InputState } from './input';
import { CHILD, Player, type ActorParams, type Ladder } from './player';
import { CAMERA, GROUND_BACK_Z, buildGround } from './renderer';
import type { SaveGame } from './save';
import { Terrain } from './terrain';
import { Triggers } from './triggers';

const DEFAULT_FOREGROUND_SPEED = 1.35;
/** How far a relay transmitter reaches to take over a dormant body. */
export const RELAY_RANGE = 9;
export const RELAY_FLAG = 'relay';

export interface RuntimeHooks {
  sound(cue: string, x?: number): void;
  /** The child reached a checkpoint (index into `checkpoints`). */
  checkpoint(index: number): void;
  /** The child walked past the exit. */
  exit(): void;
  /** The child died. */
  childDied(cause: string): void;
}

export interface RuntimeOptions {
  level: Level;
  checkpoint: number;
  save: SaveGame;
  rig: CameraRig;
  lightning: Lightning;
  hooks: RuntimeHooks;
  /** Build the visual layers (false in headless tests). */
  visuals?: boolean;
  /** Entity states captured at the checkpoint (keeps solved puzzles solved after a death). */
  snapshot?: unknown[];
}

export class LevelRuntime {
  readonly level: Level;
  readonly terrain: Terrain;
  readonly collision: Collision;
  readonly group = new THREE.Group();
  readonly child: Player;
  readonly actors: Player[] = [];
  readonly relayBodies: Player[] = [];
  readonly boxes: DynBox[] = [];
  readonly ladders: Ladder[] = [];
  readonly covers: Cover[] = [];
  readonly water: WaterZone[] = [];
  readonly interactables: Interactable[] = [];
  readonly entities: Entity[] = [];
  readonly byId = new Map<string, Entity>();
  readonly checkpoints: number[];
  readonly world: World | null;
  readonly foreground: ForegroundItem[] = [];
  readonly effects: Effects = { tension: 0, radiation: 0 };
  readonly ctx: LevelContext;
  checkpoint: number;
  controlled: Player;
  time = 0;
  exiting = false;
  /** Seconds since the child died (-1 = alive). */
  deadFor = -1;
  deathCause = '';
  focus: Interactable | null = null;
  /** Debug: the child ignores death. */
  invulnerable = false;

  private readonly triggers: Triggers;
  private readonly hooks: RuntimeHooks;
  private stillTime = 0;

  constructor(opts: RuntimeOptions) {
    const { level, save, rig, lightning, hooks } = opts;
    this.level = level;
    this.hooks = hooks;
    const visuals = opts.visuals ?? true;
    this.group.name = `level-${level.id}`;
    this.terrain = new Terrain(level.path);
    this.collision = new Collision(this.terrain);

    this.checkpoints = [...level.checkpoints, ...level.entities.filter((e) => e.type === 'checkpoint').map((e) => e.x)].sort((a, b) => a - b);
    this.checkpoint = Math.min(opts.checkpoint, this.checkpoints.length - 1);
    const startX = this.checkpoint >= 0 ? this.checkpoints[this.checkpoint] : level.spawn.x;

    const actorWorld = {
      collision: this.collision,
      ladders: this.ladders,
      boxes: this.boxes,
      waterSlow: (x: number) => this.waterSlow(x),
    };
    this.child = new Player(this.terrain, startX, CHILD, actorWorld);
    this.actors.push(this.child);
    this.controlled = this.child;

    if (visuals) {
      this.world = buildWorld(level.id, level.layers, level.palette, this.terrain, CAMERA, GROUND_BACK_Z);
      this.group.add(buildGround(this.terrain, level.palette.ground), this.world.group);
      this.foreground.push(...this.world.foreground);
    } else {
      this.world = null;
    }

    const rt = this;
    const fgSpeed = level.layers.find((l) => l.kind === 'foreground')?.speed ?? DEFAULT_FOREGROUND_SPEED;
    this.ctx = {
      level,
      group: this.group,
      terrain: this.terrain,
      collision: this.collision,
      player: this.child,
      get controlled() {
        return rt.controlled;
      },
      actors: this.actors,
      rig,
      lightning,
      save,
      effects: this.effects,
      foregroundZ: depthForSpeed(fgSpeed, CAMERA.distance),
      cameraDistance: CAMERA.distance,
      get time() {
        return rt.time;
      },
      visuals,
      signal: (target, signal, from) => this.byId.get(target)?.signal?.(signal, from),
      addForeground: (item) => this.foreground.push(item),
      addBox: (b) => this.boxes.push(b),
      addLadder: (l) => this.ladders.push(l),
      addCover: (c) => this.covers.push(c),
      addWater: (w) => this.water.push(w),
      addInteractable: (i) => this.interactables.push(i),
      addRelayBody: (x: number, params: ActorParams) => {
        const body = new Player(this.terrain, x, params, actorWorld);
        body.frozen = true;
        this.relayBodies.push(body);
        this.actors.push(body);
        return body;
      },
      kill: (actor, cause) => this.kill(actor, cause),
      isHidden: (actor) => this.isHidden(actor),
      grantRelay: () => {
        if (!save.hasFlag(RELAY_FLAG)) save.setFlag(RELAY_FLAG);
      },
      get hasRelay() {
        return save.hasFlag(RELAY_FLAG);
      },
      sound: (cue, x) => hooks.sound(cue, x),
    };

    for (const spec of level.entities) {
      const e = createEntity(spec, this.ctx);
      this.entities.push(e);
      if (e.id) this.byId.set(e.id, e);
    }
    if (opts.snapshot) this.restore(opts.snapshot);
    // Settle boxes onto whatever they rest on before the first frame.
    for (let i = 0; i < 30; i++) for (const b of this.boxes) b.update(1 / 60);
    this.child.place(startX);

    this.triggers = new Triggers(level.triggers, {
      camera: (t) => rig.hint({ zoom: t.zoom, offsetY: t.offsetY, offsetX: t.offsetX }, t.seconds),
      cameraClear: (s) => rig.clearHint(s),
      signal: (target, signal) => this.ctx.signal(target, signal),
      lightning: () => lightning.strike(),
      sound: (cue) => hooks.sound(cue),
      tension: (amount) => (this.effects.tension = amount),
    });
    this.triggers.skipBefore(startX);
    // Story events that would already have played behind the start point are skipped.
    for (const e of this.entities) if (e.x < startX && e.type === 'background_event') e.signal?.('skip');
  }

  /** Entity states for a checkpoint snapshot. */
  snapshot(): unknown[] {
    return this.entities.map((e) => e.snapshot?.());
  }

  private restore(states: unknown[]): void {
    this.entities.forEach((e, i) => {
      if (states[i] !== undefined) e.restore?.(states[i]);
    });
  }

  waterSlow(x: number): number {
    for (const w of this.water) if (x >= w.minX && x <= w.maxX && !w.deep) return 0.6;
    return 1;
  }

  isHidden(actor: Player): boolean {
    for (const c of this.covers) {
      if (actor.x < c.minX || actor.x > c.maxX) continue;
      if (c.requires === 'any') return true;
      if (c.requires === 'crawl' && actor.crawling) return true;
      if (c.requires === 'still_or_crawl' && (actor.crawling || (actor === this.child && this.stillTime > 0.3))) return true;
    }
    return false;
  }

  kill(actor: Player, cause: string): void {
    if (actor.dead) return;
    if (actor === this.child && this.invulnerable) {
      actor.fatalFall = false;
      return;
    }
    actor.die();
    this.hooks.sound(`death_${cause}`, actor.x);
    if (actor === this.child) {
      this.deadFor = 0;
      this.deathCause = cause;
      if (this.controlled !== this.child) this.releaseBody();
      this.hooks.childDied(cause);
    } else if (actor === this.controlled) {
      this.releaseBody();
    }
  }

  // ---- relay control -----------------------------------------------------------

  takeControl(body: Player): void {
    if (body.dead || !this.ctx.hasRelay) return;
    this.child.frozen = true;
    body.frozen = false;
    this.controlled = body;
    this.hooks.sound('relay_link');
  }

  releaseBody(): void {
    if (this.controlled === this.child) return;
    this.controlled.frozen = true;
    this.child.frozen = false;
    this.controlled = this.child;
    this.hooks.sound('relay_release');
  }

  /** Nearest controllable body within relay range of the child, optionally near a tapped point. */
  relayTarget(near?: { x: number; y: number }): Player | null {
    let best: Player | null = null;
    let bestD = Infinity;
    for (const b of this.relayBodies) {
      if (b.dead || Math.abs(b.x - this.child.x) > RELAY_RANGE) continue;
      const d = near ? Math.hypot(b.x - near.x, b.y + b.params.height / 2 - near.y) : Math.abs(b.x - this.child.x);
      if (near && d > 1.1) continue;
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  /** A screen tap mapped onto the gameplay plane. */
  tap(x: number, y: number): void {
    if (this.child.dead || this.exiting) return;
    if (this.controlled !== this.child) {
      if (Math.hypot(this.child.x - x, this.child.y + 0.55 - y) < 1.1) this.releaseBody();
      return;
    }
    if (!this.ctx.hasRelay) return;
    const body = this.relayTarget({ x, y });
    if (body) this.takeControl(body);
  }

  // ---- update ------------------------------------------------------------------

  step(dt: number, input: InputState): void {
    this.time += dt;
    const c = this.child;
    const actor = this.controlled;
    const active = this.deadFor < 0 && !this.exiting;

    for (const b of this.boxes) b.update(dt);
    for (const a of this.actors) a.update(a === actor && active ? input : emptyInput(), dt);
    if (Math.abs(c.vx) < 0.05 && c.grounded) this.stillTime += dt;
    else this.stillTime = 0;

    // Interaction: the nearest usable thing gets the highlight; a tap uses it.
    const focus = active ? this.findFocus(actor) : null;
    if (focus !== this.focus) {
      this.focus?.highlight(false);
      focus?.highlight(true);
      this.focus = focus;
    }
    if (active && input.interactPressed) {
      if (focus?.use) focus.use(actor);
      else if (!focus) {
        // Nothing to use: the tap switches relay control instead.
        if (actor !== c) this.releaseBody();
        else if (this.ctx.hasRelay) {
          const body = this.relayTarget();
          if (body) this.takeControl(body);
        }
      }
    }

    this.effects.radiation = 0;
    for (const e of this.entities) e.update?.(dt);

    // Falls and deep water hurt every actor.
    for (const a of this.actors) {
      if (a.dead) continue;
      if (a.fatalFall) this.kill(a, 'fall');
    }

    if (this.deadFor >= 0) {
      this.deadFor += dt;
      return;
    }
    this.triggers.update(c.x);

    // Passing a checkpoint saves progress.
    while (this.checkpoint + 1 < this.checkpoints.length && c.x >= this.checkpoints[this.checkpoint + 1]) {
      this.checkpoint++;
      this.hooks.checkpoint(this.checkpoint);
    }

    if (!this.exiting && c.x >= this.level.exit.x) {
      this.exiting = true;
      this.hooks.exit();
    }
  }

  private findFocus(actor: Player): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const i of this.interactables) {
      if (!i.enabled()) continue;
      const dx = Math.abs(i.x() - actor.x);
      const dy = i.y() - actor.y;
      if (dx > i.range || dy < -1 || dy > 1.6) continue;
      if (dx < bestD) {
        best = i;
        bestD = dx;
      }
    }
    return best;
  }

  /** Per-frame visuals for entities. */
  frame(dt: number): void {
    for (const e of this.entities) e.frame?.(dt);
  }

  dispose(): void {
    for (const e of this.entities) e.dispose?.();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
  }
}
