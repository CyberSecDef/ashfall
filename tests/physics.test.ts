import { describe, expect, it } from 'vitest';
import { DynBox } from '../src/engine/bodies';
import { Collision, segmentHitsBox, type Solid } from '../src/engine/collision';
import { emptyInput, type InputState } from '../src/engine/input';
import { CHILD, Player, type ActorWorld, type Ladder } from '../src/engine/player';
import { Terrain } from '../src/engine/terrain';

const DT = 1 / 60;
const flat = () => new Terrain([{ x: -50, y: 0 }, { x: 50, y: 0 }]);

function setup(extra: (c: Collision) => Partial<ActorWorld> = () => ({})) {
  const t = flat();
  const collision = new Collision(t);
  const world: ActorWorld = { collision, ...extra(collision) };
  return { t, collision, world, player: (x: number) => new Player(t, x, CHILD, world) };
}

function run(p: Player, input: Partial<InputState>, seconds: number, boxes: DynBox[] = []): void {
  const s = { ...emptyInput(), ...input };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    for (const b of boxes) b.update(DT);
    p.update(s, DT);
  }
}

const box = (minX: number, maxX: number, minY: number, maxY: number, more: Partial<Solid> = {}): Solid => ({
  minX, maxX, minY, maxY, enabled: true, climbable: true, ...more,
});

describe('Collision', () => {
  it('finds floors, walls and ceilings', () => {
    const c = new Collision(flat());
    c.add(box(2, 3, 0, 0.5));
    c.add(box(5, 6, 0.6, 1.0));
    expect(c.floor(2.2, 2.6, 0.5, 0.1).y).toBeCloseTo(0.5);
    expect(c.floor(2.2, 2.6, 0.2, 0.1).y).toBeCloseTo(0); // too high to step onto
    expect(c.overlap(1.8, 2.1, 0.1, 1.1)).not.toBeNull();
    expect(c.ceiling(5.2, 5.4, 0)).toBeCloseTo(0.6);
    expect(c.ceiling(0, 1, 0)).toBe(Infinity);
  });

  it('ignores disabled solids (an open gate)', () => {
    const c = new Collision(flat());
    const g = c.add(box(2, 2.3, 0, 2));
    g.enabled = false;
    expect(c.overlap(1.9, 2.4, 0.1, 1)).toBeNull();
  });

  it('tests line of sight against solids', () => {
    expect(segmentHitsBox(0, 1, 10, 1, box(4, 5, 0, 2))).toBe(true);
    expect(segmentHitsBox(0, 3, 10, 3, box(4, 5, 0, 2))).toBe(false);
  });
});

describe('Player with solids', () => {
  it('is stopped by a tall solid it cannot climb', () => {
    const { collision, player } = setup();
    collision.add(box(3, 3.2, 0, 2.5, { climbable: false }));
    const p = player(1);
    run(p, { right: true }, 3);
    expect(p.x).toBeLessThan(3);
  });

  it('auto-scrambles onto a waist-high obstacle and walks off the far side', () => {
    const { collision, player } = setup();
    collision.add(box(3, 3.8, 0, 0.5));
    const p = player(1);
    run(p, { right: true }, 1.6);
    expect(p.y).toBeCloseTo(0.5, 2);
    run(p, { right: true }, 2);
    expect(p.x).toBeGreaterThan(4);
    expect(p.y).toBeCloseTo(0, 2);
  });

  it('steps up small curbs without scrambling', () => {
    const { collision, player } = setup();
    collision.add(box(3, 6, 0, 0.12));
    const p = player(1);
    run(p, { right: true }, 1.5);
    expect(p.mode).not.toBe('climb');
    expect(p.y).toBeCloseTo(0.12, 2);
  });

  it('jumps and grabs onto a high obstacle', () => {
    const { collision, player } = setup();
    collision.add(box(3, 7, 0, 1.0));
    const p = player(1);
    run(p, { right: true }, 2);
    expect(p.x).toBeLessThan(3);
    run(p, { right: true, up: true }, 0.25);
    run(p, { right: true }, 1);
    expect(p.y).toBeCloseTo(1.0, 2);
  });

  it('must crawl under a low ceiling, and is forced to stay low beneath it', () => {
    const { collision, player } = setup();
    collision.add(box(3, 6, 0.55, 1.2, { climbable: false }));
    const p = player(1);
    run(p, { right: true }, 3);
    expect(p.x).toBeLessThan(3); // standing: blocked
    run(p, { right: true, down: true }, 2);
    expect(p.x).toBeGreaterThan(3);
    expect(p.crawling).toBe(true);
    run(p, { right: true }, 0.5); // released down, but the ceiling keeps us low
    expect(p.crawling).toBe(true);
    expect(p.height).toBeLessThan(0.55);
    run(p, { right: true }, 6);
    expect(p.x).toBeGreaterThan(6);
    expect(p.crawling).toBe(false);
  });

  it('bumps its head instead of jumping through a ceiling', () => {
    const { collision, player } = setup();
    collision.add(box(0, 4, 1.5, 2, { climbable: false }));
    const p = player(2);
    run(p, { up: true }, 0.2);
    run(p, {}, 1);
    expect(p.y).toBeCloseTo(0, 2);
  });

  it('dies from a long fall but not a short one', () => {
    const { collision, player } = setup();
    collision.add(box(0, 3, 0, 5));
    collision.add(box(10, 13, 0, 2));
    const p = player(1.5);
    expect(p.y).toBeCloseTo(5);
    run(p, { right: true }, 2);
    expect(p.fatalFall).toBe(true);
    const q = player(11);
    run(q, { right: true }, 2);
    expect(q.fatalFall).toBe(false);
  });
});

describe('Ladders', () => {
  it('climbs a ladder and steps off the top onto the ledge', () => {
    const ladders: Ladder[] = [{ x: 3, bottom: 0, top: 2.5 }];
    const { collision, player } = setup(() => ({ ladders }));
    collision.add(box(3.1, 8, 0, 2.5, { climbable: false }));
    const p = player(2.8);
    run(p, { up: true }, 3);
    expect(p.y).toBeCloseTo(2.5, 2);
    expect(p.ladder).toBeNull();
    run(p, { right: true }, 1);
    expect(p.x).toBeGreaterThan(3.5);
    expect(p.y).toBeCloseTo(2.5, 2);
  });

  it('climbs down from the top', () => {
    const ladders: Ladder[] = [{ x: 3, bottom: 0, top: 2.5 }];
    const { collision, player } = setup(() => ({ ladders }));
    collision.add(box(3.1, 8, 0, 2.5, { climbable: false }));
    const p = player(3.4);
    expect(p.y).toBeCloseTo(2.5);
    run(p, { left: true }, 0.25);
    run(p, { down: true }, 3);
    expect(p.y).toBeCloseTo(0, 2);
  });
});

describe('Movable boxes', () => {
  it('falls and rests on the ground, and stacks on another box', () => {
    const c = new Collision(flat());
    const a = new DynBox(c, 0, 2, 0.8, 0.8);
    const b = new DynBox(c, 0.1, 4, 0.8, 0.8);
    for (let i = 0; i < 120; i++) {
      a.update(DT);
      b.update(DT);
    }
    expect(a.bottom).toBeCloseTo(0, 2);
    expect(b.bottom).toBeCloseTo(0.8, 2);
  });

  it('is pushed while interact is held, and pulled back', () => {
    const boxes: DynBox[] = [];
    const { collision, player } = setup(() => ({ boxes }));
    const crate = new DynBox(collision, 2.6, 0, 0.8, 0.8);
    boxes.push(crate);
    const p = player(1);
    run(p, { right: true }, 1, boxes); // walk up to it (scrambling is fine too; release by walking back)
    const p2 = player(1.95);
    run(p2, { right: true, interact: true }, 2, boxes);
    expect(crate.cx).toBeGreaterThan(3.5);
    expect(p2.mode === 'push' || p2.mode === 'pull').toBe(true);
    const before = crate.cx;
    run(p2, { left: true, interact: true }, 1, boxes);
    expect(crate.cx).toBeLessThan(before - 0.5);
  });

  it('does not push without holding interact (blocked or climbs instead)', () => {
    const boxes: DynBox[] = [];
    const { collision, player } = setup(() => ({ boxes }));
    const crate = new DynBox(collision, 2.6, 0, 0.8, 1.2); // too tall to scramble
    boxes.push(crate);
    const p = player(1.5);
    run(p, { right: true }, 2, boxes);
    expect(crate.cx).toBeCloseTo(2.6, 3);
  });

  it('stops against a wall', () => {
    const boxes: DynBox[] = [];
    const { collision, player } = setup(() => ({ boxes }));
    collision.add(box(4, 4.2, 0, 3, { climbable: false }));
    const crate = new DynBox(collision, 2.6, 0, 0.8, 0.8);
    boxes.push(crate);
    const p = player(1.95);
    run(p, { right: true, interact: true }, 4, boxes);
    expect(crate.solid.maxX).toBeLessThanOrEqual(4.001);
  });

  it('lets the child climb onto a pushed crate to reach a higher ledge', () => {
    const boxes: DynBox[] = [];
    const { collision, player } = setup(() => ({ boxes }));
    collision.add(box(6, 10, 0, 1.2, { climbable: true }));
    const crate = new DynBox(collision, 2.6, 0, 0.8, 0.6);
    boxes.push(crate);
    const p = player(1.95);
    run(p, { right: true, interact: true }, 4, boxes); // shove it against the ledge
    run(p, { left: true }, 0.4, boxes); // step back
    run(p, { right: true }, 2.5, boxes); // scramble onto the crate, then onto the ledge
    expect(p.y).toBeCloseTo(1.2, 1);
    expect(p.x).toBeGreaterThan(6);
  });

  it('carries a child standing on a moving solid', () => {
    const { collision, player } = setup();
    const lift = collision.add(box(1, 3, 0, 0.3, { dx: 0, dy: 0 }));
    const p = player(2);
    p.update(emptyInput(), DT);
    expect(p.y).toBeCloseTo(0.3, 2);
    for (let i = 0; i < 60; i++) {
      lift.minY += 0.02;
      lift.maxY += 0.02;
      lift.dy = 0.02;
      p.update(emptyInput(), DT);
    }
    expect(p.y).toBeCloseTo(0.3 + 1.2, 1);
  });
});
