// The game shell around a LevelRuntime: owns the persistent pieces
// (renderer, input, camera rig, sky, ash, overlay, the child's figure), loads
// levels, fades between them, turns deaths into quick respawns at the last
// checkpoint (with puzzle state restored), saves progress, and maps screen
// taps onto the gameplay plane for relay control.
//
// Nothing in here knows about any particular level.

import * as THREE from 'three';
import { Ash } from '../fx/ash';
import { updateGodRays } from '../fx/godrays';
import { swayForeground } from '../fx/layers';
import { Lightning } from '../fx/lightning';
import { Overlay } from '../fx/overlay';
import { Sky } from '../fx/sky';
import { getLevel, nextLevelId } from '../levels';
import type { Level } from '../levels/schema';
import { CameraRig } from './camera';
import { ChildView } from './child';
import type { Input } from './input';
import type { Player } from './player';
import type { Renderer } from './renderer';
import { LevelRuntime } from './runtime';
import { SaveGame } from './save';

/** Seconds the child lies still before the fade starts. */
const DEATH_PAUSE = 0.7;

interface Fade {
  from: number;
  to: number;
  t: number;
  seconds: number;
  then?: () => void;
}

export class Game {
  readonly save: SaveGame;
  readonly overlay = new Overlay();
  readonly lightning = new Lightning(0);
  readonly child = new ChildView();
  readonly sky: Sky;
  readonly ash = new Ash(0);
  readonly rig: CameraRig;
  current!: LevelRuntime;
  /** Last sound cue fired (until M5's audio engine plays them). */
  lastCue = '';
  /** Draw calls for the main scene last frame (excludes the overlay). */
  sceneDraws = 0;
  deaths = 0;

  private fade: Fade | null = null;
  private tension = 0;
  private readonly focus = new THREE.Vector3();
  private readonly baseHemi: number;
  private time = 0;
  private respawning = false;
  /** Entity states captured when each checkpoint was reached, by "level:checkpoint". */
  private readonly snapshots = new Map<string, unknown[]>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  constructor(
    readonly renderer: Renderer,
    readonly input: Input,
    save = new SaveGame(),
  ) {
    this.save = save;
    this.sky = new Sky({ sky: '#000000', fog: '#000000', ground: '#000000' }, renderer.camera);
    this.rig = new CameraRig(renderer.camera);
    renderer.scene.add(this.child.root, this.child.ribbon, this.ash.points);
    this.baseHemi = renderer.hemi.intensity;
  }

  get player(): Player {
    return this.current.child;
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
    if (d?.level) {
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
    if (this.current) {
      this.renderer.scene.remove(this.current.group);
      this.current.dispose();
    }
    const level = getLevel(levelId);
    const r = this.renderer;
    r.setPalette(level.palette);
    this.sky.setPalette(level.palette);
    this.ash.setDensity(level.ambience.ash);
    this.lightning.setFrequency(level.ambience.lightning);
    this.rig.resetHint();
    this.respawning = false;

    const rt: LevelRuntime = new LevelRuntime({
      level,
      checkpoint,
      save: this.save,
      rig: this.rig,
      lightning: this.lightning,
      snapshot: this.snapshots.get(`${level.id}:${checkpoint}`),
      hooks: {
        sound: (cue) => this.sound(cue),
        checkpoint: (i) => {
          this.save.reach(level.id, i);
          this.snapshots.set(`${level.id}:${i}`, rt.snapshot());
        },
        exit: () => {
          const next = nextLevelId(level.id);
          this.save.enter(next);
          this.snapshots.clear();
          this.transition(() => this.load(next, -1), 1.6, 1.8);
        },
        childDied: () => {
          this.deaths++;
        },
      },
    });
    this.current = rt;
    r.scene.add(rt.group);

    this.tension = 0;
    const p = rt.child;
    const depth = rt.terrain.depthAt(p.x);
    this.rig.snap(p, depth);
    this.child.update(p, 0, level.ambience.wind, depth);
    this.child.resetScarf();
    if (rt.checkpoint < 0) {
      this.save.enter(level.id);
      this.snapshots.clear();
    } else {
      this.save.reach(level.id, rt.checkpoint);
      const key = `${level.id}:${rt.checkpoint}`;
      if (!this.snapshots.has(key)) this.snapshots.set(key, rt.snapshot());
    }
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
    if (this.respawning) return;
    this.respawning = true;
    const { level, checkpoint } = this.current;
    this.transition(() => this.load(level.id, checkpoint), 0.3, 0.5);
  }

  sound(cue: string): void {
    this.lastCue = cue;
  }

  /** Fixed-rate game logic. */
  step(dt: number): void {
    const rt = this.current;
    this.input.poll();
    rt.step(dt, this.input.state);
    if (rt.deadFor >= DEATH_PAUSE) this.respawn();
  }

  /** Map short screen taps onto the gameplay plane (at the path's depth there). */
  private handleTaps(): void {
    const taps = this.input.takeTaps();
    if (!taps.length) return;
    const cam = this.renderer.camera;
    const hit = new THREE.Vector3();
    for (const t of taps) {
      const ndc = new THREE.Vector2((t.x / window.innerWidth) * 2 - 1, -(t.y / window.innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(ndc, cam);
      this.plane.constant = -this.current.terrain.depthAt(this.current.controlled.x);
      if (this.raycaster.ray.intersectPlane(this.plane, hit)) this.current.tap(hit.x, hit.y);
    }
  }

  /** Per-frame visuals. */
  frame(dt: number): void {
    this.time += dt;
    const rt = this.current;
    this.handleTaps();
    const wind = rt.level.ambience.wind;
    const actor = rt.controlled;
    const depth = rt.terrain.depthAt(actor.x);
    const flash = this.lightning.update(dt);

    rt.frame(dt);
    this.child.update(rt.child, dt, wind, rt.terrain.depthAt(rt.child.x));
    this.rig.update(actor, dt, depth);
    swayForeground(rt.foreground, this.time, wind);
    if (rt.world) updateGodRays(rt.world.godRays, this.time, flash);
    this.focus.set(actor.x, actor.y, depth);
    const r = this.renderer;
    this.ash.update(this.time, this.focus, wind, r.three.domElement.height, r.camera.fov, flash);
    this.sky.update(r.camera, this.time, flash);
    r.hemi.intensity = this.baseHemi + flash * 1.6;

    this.tension += (rt.effects.tension - this.tension) * (1 - Math.exp(-dt * 1.5));
    this.overlay.intensity = Math.min(1.5, this.tension + rt.effects.radiation * 1.2);
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
