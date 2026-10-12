// Puzzle and hazard integration tests: real level data, real entities, the
// real runtime, scripted input. No WebGL.

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraRig } from '../src/engine/camera';
import { emptyInput, type InputState } from '../src/engine/input';
import { LevelRuntime } from '../src/engine/runtime';
import { SaveGame } from '../src/engine/save';
import { Lightning } from '../src/fx/lightning';
import { loadLevel, type LevelInput } from '../src/levels/schema';

const DT = 1 / 60;

function level(entities: LevelInput['entities'], extra: Partial<LevelInput> = {}): LevelInput {
  return {
    id: 'L98',
    name: 'test',
    palette: { sky: '#111111', fog: '#444444', ground: '#222222' },
    ambience: { drone: 'x', wind: 0, ash: 0, lightning: 0 },
    layers: [],
    path: [
      { x: -5, y: 0 },
      { x: 60, y: 0 },
    ],
    spawn: { x: 1 },
    exit: { x: 59 },
    entities,
    ...extra,
  };
}

interface Harness {
  rt: LevelRuntime;
  deaths: string[];
  sounds: string[];
  save: SaveGame;
  run(input: Partial<InputState>, seconds: number): void;
  /** Press interact for one step (a tap). */
  tap(): void;
}

function harness(input: LevelInput, opts: { checkpoint?: number; snapshot?: unknown[]; save?: SaveGame } = {}): Harness {
  const deaths: string[] = [];
  const sounds: string[] = [];
  const save = opts.save ?? new SaveGame(null);
  const rt = new LevelRuntime({
    level: loadLevel(input),
    checkpoint: opts.checkpoint ?? -1,
    save,
    rig: new CameraRig(new THREE.PerspectiveCamera()),
    lightning: new Lightning(0),
    visuals: false,
    snapshot: opts.snapshot,
    hooks: { sound: (c) => sounds.push(c), checkpoint: () => {}, exit: () => {}, childDied: (c) => deaths.push(c) },
  });
  return {
    rt,
    deaths,
    sounds,
    save,
    run(inp, seconds) {
      const s = { ...emptyInput(), ...inp };
      for (let i = 0; i < Math.round(seconds / DT); i++) rt.step(DT, s);
    },
    tap() {
      rt.step(DT, { ...emptyInput(), interact: true, interactPressed: true });
      rt.step(DT, emptyInput());
    },
  };
}

describe('mechanisms', () => {
  it('a crate pushed onto a pressure plate opens the gate', () => {
    const h = harness(
      level([
        { type: 'crate', x: 3, w: 0.8, h: 0.6 },
        { type: 'pressure_plate', x: 6, w: 1.2, target: 'g' },
        { type: 'gate', id: 'g', x: 10 },
      ]),
    );
    h.rt.child.place(2.4);
    h.run({ right: true, interact: true }, 3.2); // shove the crate onto the plate
    h.run({ left: true }, 0.3);
    h.run({}, 2); // let the gate rise
    h.run({ right: true }, 8);
    expect(h.rt.child.x).toBeGreaterThan(10.5);
  });

  it('standing on the plate holds the gate; stepping off closes it', () => {
    const h = harness(level([{ type: 'pressure_plate', x: 4, target: 'g' }, { type: 'gate', id: 'g', x: 9 }]));
    h.run({ right: true }, 1.6); // onto the plate (x ~ 3.7-4.4)
    expect(h.rt.child.x).toBeGreaterThan(3.5);
    h.run({}, 2.5);
    const g = h.rt.collision.overlap(8.8, 9.2, 0.1, 1.0);
    expect(g).toBeNull(); // raised above head height
    h.run({ left: true }, 1);
    h.run({}, 2);
    expect(h.rt.collision.overlap(8.8, 9.2, 0.1, 1.0)).not.toBeNull();
  });

  it('a lever signals through a power cable, after its delay', () => {
    const h = harness(
      level([
        { type: 'lever', x: 3, target: 'cable' },
        { type: 'power_cable', id: 'cable', x: 3.2, target: 'g', delay: 1 },
        { type: 'gate', id: 'g', x: 8 },
      ]),
    );
    h.run({ right: true }, 1.1);
    h.tap();
    expect(h.sounds).toContain('lever');
    h.run({}, 0.5);
    expect(h.sounds).not.toContain('gate_open');
    h.run({}, 1);
    expect(h.sounds).toContain('gate_open');
  });

  it('a lift carries the child up', () => {
    const h = harness(level([{ type: 'lift', id: 'l', x: 4, travel: 3 }, { type: 'lever', x: 2, target: 'l' }]));
    h.run({ right: true }, 0.6);
    h.tap();
    h.rt.child.place(4);
    h.run({}, 0.2);
    h.run({}, 5);
    expect(h.rt.child.y).toBeCloseTo(3, 1);
  });

  it('a valve turns slowly, then fires once', () => {
    const h = harness(level([{ type: 'valve', x: 2, target: 'g', turnTime: 1 }, { type: 'gate', id: 'g', x: 8 }]));
    h.run({ right: true }, 0.6);
    h.tap();
    h.run({}, 0.5);
    expect(h.sounds).not.toContain('gate_open');
    h.run({}, 0.7);
    expect(h.sounds).toContain('gate_open');
  });

  it('a conveyor carries whatever stands on it', () => {
    const h = harness(level([{ type: 'conveyor', x: 3, w: 6, speed: 1.5, on: true }]));
    h.rt.child.place(4);
    h.run({}, 2);
    expect(h.rt.child.x).toBeGreaterThan(6);
  });
});

describe('hazards', () => {
  it('lingering in radiation kills; dashing through does not', () => {
    const slow = harness(level([{ type: 'radiation_zone', x: 3, w: 4, lethalAfter: 2 }]));
    slow.rt.child.place(4.5);
    slow.run({}, 2.5);
    expect(slow.deaths).toEqual(['radiation']);
    const fast = harness(level([{ type: 'radiation_zone', x: 3, w: 2.5, lethalAfter: 2.5 }]));
    fast.run({ right: true }, 4);
    expect(fast.deaths).toEqual([]);
    expect(fast.rt.child.x).toBeGreaterThan(5.5);
  });

  it('falling debris crushes the child beneath, then is an obstacle', () => {
    const h = harness(level([{ type: 'falling_debris', x: 4, triggerAt: 3.5, delay: 0.1, dropHeight: 4 }]));
    h.rt.child.place(3);
    h.run({ right: true }, 0.5); // walk under it and stop
    h.run({}, 1.5);
    expect(h.deaths).toEqual(['crushed']);
    expect(h.rt.collision.overlap(3.8, 4.2, 0.1, 0.4)).not.toBeNull();
  });

  it('a tripwire kills a walking child, but can be jumped', () => {
    const walk = harness(level([{ type: 'wire_trap', x: 3 }]));
    walk.run({ right: true }, 2);
    expect(walk.deaths).toEqual(['snare']);
    const jump = harness(level([{ type: 'wire_trap', x: 3 }]));
    jump.rt.child.place(2.3);
    jump.run({ right: true }, 0.2);
    jump.run({ right: true, up: true }, 0.2);
    jump.run({ right: true }, 1);
    expect(jump.deaths).toEqual([]);
    expect(jump.rt.child.x).toBeGreaterThan(3.5);
  });

  it('a tripwire with a target signals it instead of killing', () => {
    const h = harness(level([{ type: 'wire_trap', x: 3, target: 'slab' }, { type: 'falling_debris', id: 'slab', x: 6 }]));
    h.run({ right: true }, 1.5);
    expect(h.deaths).toEqual([]);
    expect(h.sounds).toContain('creak');
  });

  it('deep water drowns', () => {
    const h = harness(
      level([{ type: 'deep_water', x: 4, w: 4 }], {
        path: [{ x: -5, y: 0 }, { x: 4, y: 0, sharp: true }, { x: 4.3, y: -2, sharp: true }, { x: 7.7, y: -2, sharp: true }, { x: 8, y: 0, sharp: true }, { x: 60, y: 0 }],
      }),
    );
    h.run({ right: true }, 6);
    expect(h.deaths).toEqual(['drown']);
  });

  it('a bottomless drop kills', () => {
    const h = harness(
      level([{ type: 'fall_height', x: 4, w: 3, killY: -3 }], {
        path: [{ x: -5, y: 0 }, { x: 4, y: 0, sharp: true }, { x: 4.1, y: -10, sharp: true }, { x: 6.9, y: -10, sharp: true }, { x: 7, y: 0, sharp: true }, { x: 60, y: 0 }],
      }),
    );
    h.run({ right: true }, 4);
    expect(h.deaths[0]).toBe('fall');
  });
});

describe('threats', () => {
  it('a feral dog chases down a child in the open', () => {
    const h = harness(level([{ type: 'feral_dog', x: 9, range: 6 }]));
    h.run({ right: true }, 3);
    h.run({ left: true }, 4);
    expect(h.deaths).toEqual(['dog']);
  });

  it('a pipe too narrow for the dog saves the child', () => {
    const h = harness(level([{ type: 'feral_dog', x: 1, range: 6 }, { type: 'pipe', x: 9, w: 3 }]));
    h.rt.child.place(6);
    h.run({ right: true }, 1.4); // the dog wakes and runs; reach the pipe mouth
    h.run({ right: true, down: true }, 3); // crawl in
    h.run({ down: true }, 3); // wait inside
    expect(h.deaths).toEqual([]);
    expect(h.rt.child.x).toBeGreaterThan(7.6);
  });

  it('a searchlight kills a child standing in the beam; crawling in grass hides', () => {
    const exposed = harness(level([{ type: 'searchlight', x: 5, sweep: 0.5, period: 100 }]));
    exposed.rt.child.place(5);
    exposed.run({}, 1.5);
    expect(exposed.deaths).toEqual(['shot']);
    const hidden = harness(level([{ type: 'searchlight', x: 5, sweep: 0.5, period: 100 }, { type: 'cover', x: 3, w: 4, kind: 'grass' }]));
    hidden.rt.child.place(5);
    hidden.run({ down: true }, 3);
    expect(hidden.deaths).toEqual([]);
  });

  it('a searchlight switched off by a lever is harmless', () => {
    const h = harness(level([{ type: 'lever', x: 2, target: 'light' }, { type: 'searchlight', id: 'light', x: 6, sweep: 0.5, period: 100, on: true }]));
    h.run({ right: true }, 0.6);
    // Flip it to send 'activate' (on), then again for 'deactivate' (off).
    h.tap();
    h.run({}, 0.3);
    h.tap();
    h.rt.child.place(6);
    h.run({}, 2);
    expect(h.deaths).toEqual([]);
  });

  it('a guard spots a child ahead of him, but not one behind cover', () => {
    const seen = harness(level([{ type: 'guard', x: 10, from: 10, to: 4 }]));
    seen.run({ right: true }, 4);
    expect(seen.deaths).toEqual(['shot']);
    const safe = harness(level([{ type: 'guard', x: 10, from: 10, to: 6 }, { type: 'cover', x: 3, w: 2, kind: 'wreck' }]));
    safe.rt.child.place(4);
    safe.run({}, 8);
    expect(safe.deaths).toEqual([]);
  });

  it('a drone light passing over a standing child kills; deep shadow hides a still child', () => {
    const lit = harness(level([{ type: 'patrol_drone', x: 2, from: 2, to: 10 }]));
    lit.rt.child.place(6);
    lit.run({}, 6);
    expect(lit.deaths).toEqual(['shot']);
    const dark = harness(level([{ type: 'patrol_drone', x: 2, from: 2, to: 10 }, { type: 'cover', x: 5, w: 2, kind: 'shadow' }]));
    dark.rt.child.place(6);
    dark.run({}, 8);
    expect(dark.deaths).toEqual([]);
  });
});

describe('relay', () => {
  it('picks up the transmitter, takes over a body, works a plate with it, and returns', () => {
    const save = new SaveGame(null);
    const h = harness(
      level([
        { type: 'relay_transmitter', x: 2 },
        { type: 'dormant_body', id: 'd', x: 5 },
        { type: 'pressure_plate', x: 8, w: 1.4, target: 'g' },
        { type: 'gate', id: 'g', x: 12 },
      ]),
      { save },
    );
    h.run({ right: true }, 1);
    expect(save.hasFlag('relay')).toBe(true);
    h.run({}, 0.3);
    h.tap(); // nothing to use nearby: take over the nearest body
    const body = h.rt.relayBodies[0];
    expect(h.rt.controlled).toBe(body);
    expect(h.rt.child.frozen).toBe(true);
    h.run({ right: true }, 3); // walk the body onto the plate
    h.run({}, 2.5);
    expect(h.sounds).toContain('gate_open');
    h.tap(); // return to the child
    expect(h.rt.controlled).toBe(h.rt.child);
    h.run({ right: true }, 8);
    expect(h.rt.child.x).toBeGreaterThan(12.5);
  });

  it('a controlled body that dies hands control back to the child', () => {
    const save = new SaveGame(null);
    save.setFlag('relay');
    const h = harness(level([{ type: 'dormant_body', x: 3 }, { type: 'radiation_zone', x: 5, w: 3, lethalAfter: 1 }]), { save });
    h.tap();
    expect(h.rt.controlled).not.toBe(h.rt.child);
    h.run({ right: true }, 4);
    h.run({}, 2);
    expect(h.rt.relayBodies[0].dead).toBe(true);
    expect(h.rt.controlled).toBe(h.rt.child);
    expect(h.deaths).toEqual([]);
  });

  it('tapping in the world takes over the body under the tap, and tapping the child returns', () => {
    const save = new SaveGame(null);
    save.setFlag('relay');
    const h = harness(level([{ type: 'dormant_body', x: 4 }, { type: 'dormant_body', x: 7 }]), { save });
    h.rt.tap(7, 0.8);
    expect(h.rt.controlled).toBe(h.rt.relayBodies[1]);
    h.rt.tap(1, 0.5);
    expect(h.rt.controlled).toBe(h.rt.child);
  });
});

describe('checkpoint snapshots', () => {
  it('keep a solved puzzle solved after a death', () => {
    const lv = level([
      { type: 'lever', x: 2, target: 'g' },
      { type: 'gate', id: 'g', x: 5 },
      { type: 'checkpoint', x: 7 },
    ]);
    const h = harness(lv);
    h.run({ right: true }, 0.6);
    h.tap();
    h.run({}, 2);
    h.run({ right: true }, 4);
    const snap = h.rt.snapshot();
    const again = harness(lv, { checkpoint: 0, snapshot: snap });
    expect(again.rt.collision.overlap(4.8, 5.2, 0.1, 1.0)).toBeNull(); // still open
    const fresh = harness(lv, { checkpoint: 0 });
    expect(fresh.rt.collision.overlap(4.8, 5.2, 0.1, 1.0)).not.toBeNull(); // without the snapshot it would be shut
  });
});
