import { describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, SaveGame, type KeyValueStore } from '../src/engine/save';
import { Triggers, type TriggerActions } from '../src/engine/triggers';
import { Terrain } from '../src/engine/terrain';
import { levelSchema } from '../src/levels/schema';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('SaveGame', () => {
  it('starts empty and persists progress', () => {
    const store = memoryStore();
    const s = new SaveGame(store);
    expect(s.data).toBeNull();
    s.reach('L01', 0);
    s.collect('L01:rabbit', 'L01');
    const again = new SaveGame(store);
    expect(again.data).toEqual({ version: 1, level: 'L01', checkpoint: 0, memories: ['L01:rabbit'] });
  });

  it('never moves backwards within a level, but resets the checkpoint on a new level', () => {
    const s = new SaveGame(memoryStore());
    s.reach('L01', 2);
    s.reach('L01', 1);
    expect(s.data?.checkpoint).toBe(2);
    s.reach('L02', -1);
    expect(s.data).toMatchObject({ level: 'L02', checkpoint: -1 });
  });

  it('entering a level resets its checkpoint, even re-entering the same level', () => {
    const s = new SaveGame(memoryStore());
    s.reach('L00', 3);
    s.collect('L00:rabbit', 'L00');
    s.enter('L00');
    expect(s.data).toMatchObject({ level: 'L00', checkpoint: -1, memories: ['L00:rabbit'] });
  });

  it('keeps memories across levels and does not duplicate them', () => {
    const s = new SaveGame(memoryStore());
    s.collect('L01:rabbit', 'L01');
    s.collect('L01:rabbit', 'L01');
    s.reach('L02', -1);
    expect(s.memories).toEqual(['L01:rabbit']);
  });

  it('ignores corrupt or foreign data', () => {
    const store = memoryStore();
    store.map.set(SAVE_KEY, '{nope');
    expect(new SaveGame(store).data).toBeNull();
    store.map.set(SAVE_KEY, JSON.stringify({ version: 7, level: 'L01' }));
    expect(new SaveGame(store).data).toBeNull();
  });

  it('survives storage that throws (private browsing, blocked storage)', () => {
    const angry: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    };
    const s = new SaveGame(angry);
    expect(s.data).toBeNull();
    expect(() => s.reach('L01', 0)).not.toThrow();
    expect(s.data?.level).toBe('L01'); // still tracked in memory for this session
    expect(() => s.reset()).not.toThrow();
    expect(new SaveGame(null).data).toBeNull();
  });

  it('reset clears everything', () => {
    const store = memoryStore();
    const s = new SaveGame(store);
    s.reach('L02', 1);
    s.reset();
    expect(s.data).toBeNull();
    expect(store.map.has(SAVE_KEY)).toBe(false);
  });
});

describe('Triggers', () => {
  const actions = (): TriggerActions & Record<string, ReturnType<typeof vi.fn>> => ({
    camera: vi.fn(),
    cameraClear: vi.fn(),
    signal: vi.fn(),
    lightning: vi.fn(),
    sound: vi.fn(),
    tension: vi.fn(),
  });
  const specs = levelSchema.shape.triggers.parse([
    { x: 10, w: 2, action: 'signal', target: 'convoy' },
    { x: 20, w: 1, action: 'lightning', once: false },
    { x: 30, w: 1, action: 'camera', zoom: 1.5 },
  ]);

  it('fires on entering a zone, once by default', () => {
    const a = actions();
    const t = new Triggers(specs, a);
    for (const x of [5, 10.5, 11, 13, 10.5, 9, 10.5]) t.update(x);
    expect(a.signal).toHaveBeenCalledTimes(1);
    expect(a.signal).toHaveBeenCalledWith('convoy', 'activate');
  });

  it('repeats on every entry when once is false', () => {
    const a = actions();
    const t = new Triggers(specs, a);
    for (const x of [19, 20.5, 22, 20.5, 22, 20.2]) t.update(x);
    expect(a.lightning).toHaveBeenCalledTimes(3);
  });

  it('skips one-shot triggers behind a respawn point', () => {
    const a = actions();
    const t = new Triggers(specs, a);
    t.skipBefore(25);
    for (const x of [26, 30.5, 10.5, 20.5]) t.update(x);
    expect(a.signal).not.toHaveBeenCalled();
    expect(a.lightning).toHaveBeenCalledTimes(1); // repeating triggers still work
    expect(a.camera).toHaveBeenCalledWith(expect.objectContaining({ zoom: 1.5, seconds: 3 }));
  });
});

describe('Terrain depth', () => {
  it('eases the visual depth between path points and defaults to 0', () => {
    const t = new Terrain([
      { x: 0, y: 0 },
      { x: 10, y: 0, depth: -2 },
      { x: 20, y: 0 },
    ]);
    expect(t.depthAt(0)).toBeCloseTo(0);
    expect(t.depthAt(10)).toBeCloseTo(-2);
    expect(t.depthAt(5)).toBeCloseTo(-1, 1);
    expect(t.depthAt(20)).toBeCloseTo(0);
  });
});
