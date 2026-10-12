// Level data validation. `npm run build` runs this file first, so bad level
// data fails the build.

import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES, entityParams } from '../src/entities/params';
import { LEVEL_FILES, PLAY_ORDER, SANDBOX_ID, getLevel, levels, nextLevelId } from '../src/levels';
import { levelSchema, loadLevel, validateLevel, type LevelInput } from '../src/levels/schema';
import { Terrain } from '../src/engine/terrain';

describe('every level file', () => {
  for (const file of LEVEL_FILES) {
    it(`${file.id} parses and validates`, () => {
      expect(() => loadLevel(file, LEVEL_FILES.map((l) => l.id))).not.toThrow();
    });
    it(`${file.id} builds valid terrain`, () => {
      expect(() => new Terrain(getLevel(file.id).path)).not.toThrow();
    });
  }

  it('play order only names real levels', () => {
    for (const id of PLAY_ORDER) expect(levels().has(id)).toBe(true);
  });

  it('the sandbox holds one of every entity type', () => {
    const types = new Set(getLevel(SANDBOX_ID).entities.map((e) => e.type));
    for (const t of ENTITY_TYPES) expect(types, `L00 is missing a ${t}`).toContain(t);
  });

  it('every level chains to a next level', () => {
    for (const id of levels().keys()) expect(levels().has(nextLevelId(id))).toBe(true);
  });
});

describe('checkpoints', () => {
  it('are all safe to stand still at for 30 seconds (no respawn into a death loop)', async () => {
    const THREE = await import('three');
    const { CameraRig } = await import('../src/engine/camera');
    const { emptyInput } = await import('../src/engine/input');
    const { LevelRuntime } = await import('../src/engine/runtime');
    const { SaveGame } = await import('../src/engine/save');
    const { Lightning } = await import('../src/fx/lightning');
    const unsafe: string[] = [];
    for (const level of levels().values()) {
      const count = level.checkpoints.length + level.entities.filter((e) => e.type === 'checkpoint').length;
      for (let cp = -1; cp < count; cp++) {
        const rt = new LevelRuntime({
          level,
          checkpoint: cp,
          save: new SaveGame(null),
          rig: new CameraRig(new THREE.PerspectiveCamera()),
          lightning: new Lightning(0),
          visuals: false,
          hooks: { sound() {}, checkpoint() {}, exit() {}, childDied() {} },
        });
        for (let i = 0; i < 30 * 60 && !rt.child.dead; i++) rt.step(1 / 60, emptyInput());
        if (rt.child.dead) unsafe.push(`${level.id} checkpoint ${cp} (x ${rt.checkpoints[cp] ?? level.spawn.x}): ${rt.deathCause}`);
      }
    }
    expect(unsafe).toEqual([]);
  });
});

describe('entity registry', () => {
  it('has a behavior for every entity type in the schema', async () => {
    // Importing the registry pulls in Three.js; that is fine in Node.
    const { registry } = await import('../src/entities/registry');
    expect(Object.keys(registry).sort()).toEqual(Object.keys(entityParams).sort());
  });
});

const base = (): LevelInput => ({
  id: 'L99',
  name: 'test',
  palette: { sky: '#111111', fog: '#444444', ground: '#222222' },
  ambience: { drone: 'x', wind: 0.2, ash: 0.2, lightning: 0 },
  layers: [],
  path: [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
  ],
  spawn: { x: 1 },
  exit: { x: 49 },
});

describe('level schema catches bad data', () => {
  const problems = (l: LevelInput) => {
    const parsed = levelSchema.safeParse(l);
    return parsed.success ? validateLevel(parsed.data) : ['schema: ' + parsed.error.message];
  };

  it('accepts a minimal level and fills defaults', () => {
    const l = loadLevel(base());
    expect(l.entities).toEqual([]);
    expect(l.triggers).toEqual([]);
    expect(l.checkpoints).toEqual([]);
  });

  it('rejects a bad level id and bad colors', () => {
    expect(problems({ ...base(), id: 'level1' })[0]).toMatch(/schema/);
    expect(problems({ ...base(), palette: { sky: 'grey', fog: '#444444', ground: '#222222' } })[0]).toMatch(/schema/);
  });

  it('rejects an unknown entity type', () => {
    const l = { ...base(), entities: [{ type: 'teleporter', x: 5 }] } as unknown as LevelInput;
    expect(problems(l)[0]).toMatch(/schema/);
  });

  it('rejects missing entity params', () => {
    const l = { ...base(), entities: [{ type: 'camera_hint', x: 5 }] } as unknown as LevelInput;
    expect(problems(l)[0]).toMatch(/schema/);
  });

  it('rejects non-increasing path x', () => {
    expect(problems({ ...base(), path: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 50, y: 0 }] }).join()).toMatch(/strictly increase/);
  });

  it('rejects things outside the path', () => {
    expect(problems({ ...base(), spawn: { x: -5 } }).join()).toMatch(/spawn/);
    expect(problems({ ...base(), checkpoints: [60] }).join()).toMatch(/checkpoint/);
    expect(problems({ ...base(), entities: [{ type: 'checkpoint', x: 99 }] }).join()).toMatch(/outside/);
  });

  it('rejects duplicate ids and dangling targets', () => {
    const dup = { ...base(), entities: [{ type: 'checkpoint', id: 'a', x: 5 }, { type: 'checkpoint', id: 'a', x: 6 }] } as LevelInput;
    expect(problems(dup).join()).toMatch(/duplicate/);
    const dangling = { ...base(), triggers: [{ x: 5, action: 'signal', target: 'nobody' }] } as LevelInput;
    expect(problems(dangling).join()).toMatch(/unknown id/);
  });

  it('allows at most one memory per level, and it needs an id', () => {
    const two = {
      ...base(),
      entities: [
        { type: 'memory_collectible', id: 'a', x: 5, kind: 'drawing' },
        { type: 'memory_collectible', id: 'b', x: 6, kind: 'mitten' },
      ],
    } as LevelInput;
    expect(problems(two).join()).toMatch(/at most one/);
    const noId = { ...base(), entities: [{ type: 'memory_collectible', x: 5, kind: 'drawing' }] } as LevelInput;
    expect(problems(noId).join()).toMatch(/needs an id/);
  });

  it('rejects an exit pointing at an unknown level', () => {
    const l = levelSchema.parse({ ...base(), exit: { x: 49, next: 'L42' } });
    expect(validateLevel(l, ['L99']).join()).toMatch(/not a known level/);
  });
});
