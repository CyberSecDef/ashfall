import { describe, expect, it } from 'vitest';
import { emptyInput, padDirections, type InputState } from '../src/engine/input';
import { PLAYER, Player } from '../src/engine/player';
import { Terrain } from '../src/engine/terrain';
import { L00 } from '../src/levels/L00-sandbox';

const DT = 1 / 60;

function run(p: Player, input: Partial<InputState>, seconds: number): void {
  const s = { ...emptyInput(), ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) p.update(s, DT);
}

describe('Terrain', () => {
  it('interpolates heights and passes through control points', () => {
    const t = new Terrain([
      { x: 0, y: 0 },
      { x: 10, y: 2 },
      { x: 20, y: 0 },
    ]);
    expect(t.heightAt(0)).toBeCloseTo(0);
    expect(t.heightAt(10)).toBeCloseTo(2);
    expect(t.heightAt(20)).toBeCloseTo(0);
    expect(t.heightAt(-5)).toBeCloseTo(0);
    expect(t.heightAt(5)).toBeGreaterThan(0.5);
  });

  it('keeps sharp corners straight', () => {
    const t = new Terrain([
      { x: 0, y: 0, sharp: true },
      { x: 1, y: 1, sharp: true },
      { x: 2, y: 1 },
    ]);
    expect(t.heightAt(0.5)).toBeCloseTo(0.5);
  });

  it('rejects non-increasing x', () => {
    expect(
      () =>
        new Terrain([
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ]),
    ).toThrow();
  });

  it('accepts the sandbox path', () => {
    expect(() => new Terrain(L00.path)).not.toThrow();
  });
});

describe('padDirections', () => {
  it('ignores the dead zone', () => {
    expect(padDirections(5, 5)).toEqual({ left: false, right: false, up: false, down: false });
  });
  it('slides sideways without jumping', () => {
    expect(padDirections(60, -20)).toMatchObject({ right: true, up: false });
  });
  it('registers up for a clear upward swipe, combined with a direction', () => {
    expect(padDirections(25, -50)).toMatchObject({ right: true, up: true });
  });
  it('registers down', () => {
    expect(padDirections(0, 45)).toMatchObject({ down: true, up: false });
  });
});

describe('Player', () => {
  const flat = () =>
    new Terrain([
      { x: -50, y: 0 },
      { x: 50, y: 0 },
    ]);

  it('walks, then runs after holding a direction', () => {
    const p = new Player(flat(), 0);
    run(p, { right: true }, 0.8);
    expect(p.mode).toBe('walk');
    expect(p.vx).toBeCloseTo(PLAYER.walkSpeed);
    run(p, { right: true }, 1.2);
    expect(p.mode).toBe('run');
  });

  it('jumps and lands', () => {
    const p = new Player(flat(), 0);
    run(p, { up: true }, 0.15);
    expect(p.grounded).toBe(false);
    expect(p.y).toBeGreaterThan(0.3);
    run(p, {}, 1);
    expect(p.grounded).toBe(true);
    expect(p.y).toBeCloseTo(0);
  });

  it('does not bunny-hop while up is held', () => {
    const p = new Player(flat(), 0);
    run(p, { up: true }, 1.5);
    expect(p.grounded).toBe(true);
  });

  it('crawls low and slow, and cannot jump while crawling', () => {
    const p = new Player(flat(), 0);
    run(p, { down: true, right: true }, 1);
    expect(p.mode).toBe('crawl');
    expect(p.height).toBe(PLAYER.crawlHeight);
    expect(p.vx).toBeCloseTo(PLAYER.crawlSpeed);
    run(p, { down: true, up: true }, 0.1);
    expect(p.grounded).toBe(true);
  });

  it('follows slopes', () => {
    const t = new Terrain([
      { x: 0, y: 0, sharp: true },
      { x: 10, y: 3, sharp: true },
    ]);
    const p = new Player(t, 1);
    run(p, { right: true }, 2);
    expect(p.grounded).toBe(true);
    expect(p.y).toBeCloseTo(t.heightAt(p.x), 3);
  });

  it('is stopped by a ledge, and can jump onto it', () => {
    const t = new Terrain([
      { x: 0, y: 0, sharp: true },
      { x: 5, y: 0, sharp: true },
      { x: 5.05, y: 0.55, sharp: true },
      { x: 10, y: 0.55, sharp: true },
    ]);
    const p = new Player(t, 3);
    run(p, { right: true }, 3);
    expect(p.x).toBeLessThan(5);
    run(p, { right: true, up: true }, 0.6);
    run(p, { right: true }, 0.6);
    expect(p.x).toBeGreaterThan(5.05);
    expect(p.y).toBeCloseTo(0.55, 2);
  });

  it('falls off an edge and records the drop', () => {
    const t = new Terrain([
      { x: 0, y: 2, sharp: true },
      { x: 5, y: 2, sharp: true },
      { x: 5.05, y: 0, sharp: true },
      { x: 10, y: 0, sharp: true },
    ]);
    const p = new Player(t, 4);
    run(p, { right: true }, 2);
    expect(p.grounded).toBe(true);
    expect(p.y).toBeCloseTo(0);
    expect(p.lastFall).toBeGreaterThan(1.8);
  });

  it('can traverse the whole sandbox using only right and jump', () => {
    const p = new Player(new Terrain(L00.path), L00.spawn.x);
    // Hold right and keep tapping jump.
    for (let i = 0; i < 60 * 60 && p.x < 84; i++) {
      p.update({ ...emptyInput(), right: true, up: i % 40 < 20 }, DT);
    }
    expect(p.x).toBeGreaterThan(84);
  });
});
