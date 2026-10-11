// The level manager. Owns the persistent pieces (renderer, input, sky, ash,
// overlay, the child) and builds everything level-specific from a level data
// file: terrain, depth layers, entities, triggers and checkpoints. Handles
// fades between levels, respawning at checkpoints, and saving progress.
//
// Nothing in here knows about any particular level.

import * as THREE from 'three';
import { createEntity } from '../entities/registry';
import type { Entity, LevelContext } from '../entities/types';
import { Ash } from '../fx/ash';
import { updateGodRays } from '../fx/godrays';
import { buildWorld, depthForSpeed, swayForeground, type ForegroundItem, type World } from '../fx/layers';
import { Lightning } from '../fx/lightning';
import { Overlay } from '../fx/overlay';
import { Sky } from '../fx/sky';
import { getLevel, nextLevelId } from '../levels';
import type { Level } from '../levels/schema';
import { CameraRig } from './camera';
import { ChildView } from './child';
import type { Input } from './input';
import { Player } from './player';
import { CAMERA, GROUND_BACK_Z, Renderer, buildGround } from './renderer';
import { SaveGame } from './save';
import { Terrain } from './terrain';
import { Triggers } from './triggers';

const DEFAULT_FOREGROUND_SPEED = 1.35;

interface Fade {
  from: number;
  to: number;
  t: number;
  seconds: number;
  then?: () => void;
}

/** Everything that exists only while one level is loaded. */
interface LoadedLevel {
  level: Level;
  terrain: Terrain;
  player: Player;
  rig: CameraRig;
  world: World;
  group: THREE.Group;
  entities: Entity[];
  byId: Map<string, Entity>;
  triggers: Triggers;
  checkpoints: number[];
  checkpoint: number;
  time: number;
  exiting: boolean;
}

export class Game {
  readonly save: SaveGame;
  readonly overlay = new Overlay();
  readonly lightning = new Lightning(0);
  readonly child = new ChildView();
  readonly sky: Sky;
  readonly ash = new Ash(0);
  current!: LoadedLevel;
  /** Last sound cue fired (until M5's audio engine plays them). */
  lastCue = '';
  /** Draw calls for the main scene last frame (excludes the overlay). */
  sceneDraws = 0;

  private fade: Fade | null = null;
  private tension = 0;
  private tensionTarget = 0;
  private readonly focus = new THREE.Vector3();
  private readonly baseHemi: number;
  private time = 0;

  constructor(
    readonly renderer: Renderer,
    readonly input: Input,
    save = new SaveGame(),
  ) {
    this.save = save;
    this.sky = new Sky({ sky: '#000000', fog: '#000000', ground: '#000000' }, renderer.camera);
    renderer.scene.add(this.child.root, this.child.ribbon, this.ash.points);
    this.baseHemi = renderer.hemi.intensity;
  }

  get player(): Player {
    return this.current.player;
  }

  get rig(): CameraRig {
    return this.current.rig;
  }

  get level(): Level {
    return this.current.level;
  }

  get checkpoints(): readonly number[] {
    return this.current.checkpoints;
  }

  /** Start where the save says, or at the first level. */
  continueOrStart(firstLevel: string): void {
    const d = this.save.data;
    let id = firstLevel;
    let cp = -1;
    if (d) {
      try {
        getLevel(d.level);
        id = d.level;
        cp = d.checkpoint;
      } catch {
        // Saved level no longer exists: start over.
      }
    }
    this.load(id, cp);
    this.overlay.fade = 1;
    this.fadeTo(0, 1.6);
  }

  /** Build a level from its data file and place the child at a checkpoint (-1 = spawn). */
  load(levelId: string, checkpoint = -1): void {
    if (this.current) this.unload();
    const level = getLevel(levelId);
    const r = this.renderer;
    r.setPalette(level.palette);
    this.sky.setPalette(level.palette);
    this.ash.setDensity(level.ambience.ash);
    this.lightning.setFrequency(level.ambience.lightning);

    const terrain = new Terrain(level.path);
    const checkpoints = [...level.checkpoints, ...level.entities.filter((e) => e.type === 'checkpoint').map((e) => e.x)].sort((a, b) => a - b);
    const cp = Math.min(checkpoint, checkpoints.length - 1);
    const startX = cp >= 0 ? checkpoints[cp] : level.spawn.x;
    const player = new Player(terrain, startX);
    const rig = new CameraRig(r.camera, player);
    const group = new THREE.Group();
    group.name = `level-${level.id}`;
    const world = buildWorld(level.id, level.layers, level.palette, terrain, CAMERA, GROUND_BACK_Z);
    group.add(buildGround(terrain, level.palette.ground), world.group);
    r.scene.add(group);

    const fgSpeed = level.layers.find((l) => l.kind === 'foreground')?.speed ?? DEFAULT_FOREGROUND_SPEED;
    const byId = new Map<string, Entity>();
    const loaded: LoadedLevel = {
      level,
      terrain,
      player,
      rig,
      world,
      group,
      entities: [],
      byId,
      triggers: null as unknown as Triggers,
      checkpoints,
      checkpoint: cp,
      time: 0,
      exiting: false,
    };
    this.current = loaded;

    const game = this;
    const ctx: LevelContext = {
      level,
      group,
      terrain,
      player,
      rig,
      lightning: this.lightning,
      overlay: this.overlay,
      save: this.save,
      foregroundZ: depthForSpeed(fgSpeed, CAMERA.distance),
      cameraDistance: CAMERA.distance,
      get time() {
        return loaded.time;
      },
      signal: (target, signal, from) => byId.get(target)?.signal?.(signal, from),
      addForeground: (item: ForegroundItem) => world.foreground.push(item),
      sound: (cue) => game.sound(cue),
    };
    for (const spec of level.entities) {
      const e = createEntity(spec, ctx);
      loaded.entities.push(e);
      if (e.id) byId.set(e.id, e);
    }

    loaded.triggers = new Triggers(level.triggers, {
      camera: (t) => rig.hint({ zoom: t.zoom, offsetY: t.offsetY, offsetX: t.offsetX }, t.seconds),
      cameraClear: (s) => rig.clearHint(s),
      signal: (target, signal) => ctx.signal(target, signal),
      lightning: () => this.lightning.strike(),
      sound: (cue) => this.sound(cue),
      tension: (amount) => (this.tensionTarget = amount),
    });
    loaded.triggers.skipBefore(startX);
    // Entities that would have already played behind the start point are fast-forwarded.
    for (const e of loaded.entities) {
      if (e.x < startX) e.signal?.('skip');
    }

    this.tension = this.tensionTarget = 0;
    rig.snap(player, terrain.depthAt(player.x));
    this.child.update(player, 0, level.ambience.wind, terrain.depthAt(player.x));
    this.child.resetScarf();
    if (cp < 0) this.save.enter(level.id);
    else this.save.reach(level.id, cp);
  }

  private unload(): void {
    const { group, entities } = this.current;
    for (const e of entities) e.dispose?.();
    this.renderer.scene.remove(group);
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
  }

  /** Fade to black, run `then`, and fade back in. */
  transition(then: () => void, out = 1.2, back = 1.4): void {
    this.fadeTo(1, out, () => {
      then();
      this.fadeTo(0, back);
    });
  }

  fadeTo(to: number, seconds: number, then?: () => void): void {
    this.fade = { from: this.overlay.fade, to, t: 0, seconds, then };
  }

  /** Back to the last checkpoint (death, debug). */
  respawn(): void {
    const { level, checkpoint } = this.current;
    this.transition(() => this.load(level.id, checkpoint), 0.35, 0.6);
  }

  sound(cue: string): void {
    this.lastCue = cue;
  }

  /** Fixed-rate game logic. */
  step(dt: number): void {
    const c = this.current;
    c.time += dt;
    const frozen = c.exiting;
    if (!frozen) {
      this.input.poll();
      c.player.update(this.input.state, dt);
    }
    for (const e of c.entities) e.update?.(dt);
    c.triggers.update(c.player.x);

    // Passing a checkpoint saves progress.
    while (c.checkpoint + 1 < c.checkpoints.length && c.player.x >= c.checkpoints[c.checkpoint + 1]) {
      c.checkpoint++;
      this.save.reach(c.level.id, c.checkpoint);
    }

    if (!c.exiting && c.player.x >= c.level.exit.x) {
      c.exiting = true;
      const next = nextLevelId(c.level.id);
      this.save.enter(next);
      this.transition(() => this.load(next, -1), 1.6, 1.8);
    }
  }

  /** Per-frame visuals. */
  frame(dt: number): void {
    this.time += dt;
    const c = this.current;
    const wind = c.level.ambience.wind;
    const depth = c.terrain.depthAt(c.player.x);
    const flash = this.lightning.update(dt);

    for (const e of c.entities) e.frame?.(dt);
    this.child.update(c.player, dt, wind, depth);
    c.rig.update(c.player, dt, depth);
    swayForeground(c.world.foreground, this.time, wind);
    updateGodRays(c.world.godRays, this.time, flash);
    this.focus.set(c.player.x, c.player.y, depth);
    const r = this.renderer;
    this.ash.update(this.time, this.focus, wind, r.three.domElement.height, r.camera.fov, flash);
    this.sky.update(r.camera, this.time, flash);
    r.hemi.intensity = this.baseHemi + flash * 1.6;

    this.tension += (this.tensionTarget - this.tension) * (1 - Math.exp(-dt * 1.5));
    this.overlay.intensity = this.tension;
    if (this.fade) {
      const f = this.fade;
      f.t = Math.min(1, f.t + dt / f.seconds);
      this.overlay.fade = f.from + (f.to - f.from) * f.t;
      if (f.t >= 1) {
        this.fade = null;
        f.then?.();
      }
    }
    this.overlay.update(this.time, window.innerWidth, window.innerHeight, flash);
    r.render();
    this.sceneDraws = r.three.info.render.calls;
    this.overlay.render(r.three);
  }
}
