// A tiny route language for headless playthroughs: walk, run, crawl, jump at
// points, push, tap, wait on conditions. Drives a real LevelRuntime.

import * as THREE from 'three';
import { CameraRig } from '../src/engine/camera';
import { emptyInput, type InputState } from '../src/engine/input';
import { LevelRuntime } from '../src/engine/runtime';
import { SaveGame } from '../src/engine/save';
import { Lightning } from '../src/fx/lightning';
import type { Level } from '../src/levels/schema';

const DT = 1 / 60;

export interface Route {
  rt: LevelRuntime;
  save: SaveGame;
  deaths: string[];
  sounds: string[];
  log: string[];
  actor(): LevelRuntime['controlled'];
  /** Move to x. walk: keep to a walk; crawl: hold down; interact: push/pull; jumps: x positions to jump at. */
  go(x: number, o?: { walk?: boolean; crawl?: boolean; interact?: boolean; jumps?: number[]; timeout?: number }): void;
  hold(seconds: number, input?: Partial<InputState>): void;
  until(fn: () => boolean, input?: Partial<InputState>, timeout?: number, what?: string): void;
  tap(): void;
  /** Debug state of the first entity of a type (or by id). */
  ent(typeOrId: string): Record<string, number | string | boolean>;
}

export function route(level: Level, opts: { checkpoint?: number; save?: SaveGame } = {}): Route {
  const deaths: string[] = [];
  const sounds: string[] = [];
  const log: string[] = [];
  const save = opts.save ?? new SaveGame(null);
  const rt = new LevelRuntime({
    level,
    checkpoint: opts.checkpoint ?? -1,
    save,
    rig: new CameraRig(new THREE.PerspectiveCamera()),
    lightning: new Lightning(0),
    visuals: false,
    hooks: {
      sound: (c) => sounds.push(c),
      checkpoint: () => {},
      exit: () => {},
      childDied: (c) => {
        deaths.push(c);
        log.push(`DIED (${c}) at x=${rt.child.x.toFixed(2)}`);
      },
    },
  });
  let ticks = 0;
  const step = (inp: Partial<InputState>) => {
    ticks++;
    rt.step(DT, { ...emptyInput(), ...inp });
  };
  const r: Route = {
    rt,
    save,
    deaths,
    sounds,
    log,
    actor: () => rt.controlled,
    go(x, o = {}) {
      const a0 = rt.controlled;
      const dir = Math.sign(x - a0.x);
      const done = new Set<number>();
      let jumpTicks = 0;
      const limit = (o.timeout ?? 40) * 60;
      for (let i = 0; i < limit; i++) {
        const a = rt.controlled;
        if (deaths.length || rt.exiting) return;
        if (dir > 0 ? a.x >= x - 0.02 : a.x <= x + 0.02) return;
        for (const j of o.jumps ?? []) {
          if (!done.has(j) && Math.abs(a.x - j) < 0.2) {
            done.add(j);
            jumpTicks = 10;
          }
        }
        const right = dir > 0 && !(o.walk && ticks % 70 === 0);
        const left = dir < 0 && !(o.walk && ticks % 70 === 0);
        step({ right, left, down: !!o.crawl, interact: !!o.interact, up: jumpTicks-- > 0 });
      }
      log.push(`go(${x}) timed out at x=${rt.controlled.x.toFixed(2)}`);
    },
    hold(seconds, input = {}) {
      for (let i = 0; i < seconds * 60 && !deaths.length; i++) step(input);
    },
    until(fn, input = {}, timeout = 60, what = 'condition') {
      for (let i = 0; i < timeout * 60; i++) {
        if (fn() || deaths.length) return;
        step(input);
      }
      log.push(`until(${what}) timed out at x=${rt.controlled.x.toFixed(2)}`);
    },
    tap() {
      step({ interact: true, interactPressed: true });
      step({});
    },
    ent(typeOrId) {
      const e = rt.byId.get(typeOrId) ?? rt.entities.find((x) => x.type === typeOrId);
      return e?.debug?.() ?? {};
    },
  };
  return r;
}
