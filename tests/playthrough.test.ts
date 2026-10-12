// Every story level, played start to finish headlessly along a scripted
// route: no deaths, exit reached, hidden memory found. If a level edit breaks
// a puzzle or makes a threat unfair, this fails.

import { describe, expect, it } from 'vitest';
import { getLevel, storyMemories } from '../src/levels';
import { SaveGame } from '../src/engine/save';
import { type Route, route } from './route';

function finish(r: Route): void {
  expect(r.log).toEqual([]);
  expect(r.deaths).toEqual([]);
  expect(r.rt.exiting).toBe(true);
}

describe('playthroughs', () => {
  it('L01 The Shelter: hatch, the rabbit, the log bridge, the cart, the dog, the culvert', () => {
    const r = route(getLevel('L01'));
    r.hold(0.5);
    r.tap(); // heave the hatch open
    r.hold(1.2);
    // The memory: back past the hatch, under the burned-out car.
    r.go(0.25, { jumps: [0.45] });
    r.go(-4.2, { walk: true });
    r.go(-5.4, { crawl: true });
    expect(r.save.hasMemory('L01:rabbit')).toBe(true);
    r.go(-4.0, { crawl: true });
    r.go(1.4, { walk: true }); // drops back into the shaft
    r.go(2.5, { walk: true, jumps: [1.65] });
    // Up through the woods, over the logs, down to the ditch.
    r.go(32.6, { walk: true });
    r.go(40.1, { walk: true, jumps: [32.75] });
    r.go(42.9, { crawl: true }); // under the fallen tree
    r.go(43.88, { walk: true });
    // Push the log across the stream.
    r.go(48.8, { interact: true });
    r.hold(0.2);
    r.go(52.5, { walk: true });
    // Push the cart to the embankment, climb it, jump for the top.
    r.go(56.63, { walk: true });
    r.until(() => (r.rt.boxes.find((b) => b.solid.tag === 'cart')?.solid.maxX ?? 0) > 63.8, { right: true, interact: true }, 15, 'cart at the embankment');
    r.hold(0.3, { left: true });
    r.hold(0.4);
    r.go(66, { jumps: [63.55] });
    expect(r.rt.child.y).toBeGreaterThan(1.7);
    // The highway: barriers, the overturned truck, the broken slab.
    r.go(81.1, { walk: true });
    r.go(83.9, { crawl: true });
    r.go(94.5, { walk: true, jumps: [86.6] });
    // Past the sleeping dog... it wakes. Run for the culvert.
    r.go(110.75);
    r.go(114.6, { crawl: true });
    r.go(129, { walk: true });
    finish(r);
  });

  it('L02 The Dead Suburb: the door over the pool, the crate and porch, the searchlights, the drawing', () => {
    const r = route(getLevel('L02'));
    r.go(11.87, { walk: true });
    r.go(17.8, { interact: true }); // drag the car door over the pool
    r.hold(0.2);
    r.go(23, { walk: true });
    // The garden: up on the flowerbed, push the crate onto the bench.
    r.go(33.6, { walk: true });
    r.until(() => (r.rt.boxes[1]?.solid.maxX ?? 0) > 37.35, { right: true, interact: true }, 15, 'crate against the porch');
    r.hold(0.3, { left: true });
    r.hold(0.3);
    r.go(39.6, { jumps: [37.1] }); // crate, then the porch
    expect(r.rt.child.y).toBeCloseTo(2.0, 1);
    r.tap(); // the lever: the gate opens
    r.hold(2);
    r.go(48, { walk: true });
    // Watchtower A: grass, the wreck, the shadow.
    r.go(51.2, { walk: true });
    r.go(55.2, { crawl: true });
    let prev = 0;
    const lightA = () => r.ent('lightA').spotX as number;
    r.until(() => {
      const s = lightA();
      const ok = s > 60 && s > prev;
      prev = s;
      return ok;
    }, { down: true }, 20, 'light A swings away');
    r.go(57.4, { walk: true }); // into the wreck
    r.until(() => {
      const s = lightA();
      const ok = s < 56.5 && s < prev;
      prev = s;
      return ok;
    }, {}, 20, 'light A swings back left');
    r.go(60.1, { walk: true }); // into the shadow, then keep still
    r.until(() => {
      const s = lightA();
      const ok = s < 57 && s < prev;
      prev = s;
      return ok;
    }, {}, 20, 'light A passes');
    r.go(62.4, { walk: true });
    // Watchtower B: a long crawl through tall grass.
    r.until(() => (r.ent('lightB').spotX as number) > 66.5, {}, 20, 'light B away');
    r.go(63.4, { walk: true });
    r.go(73.9, { crawl: true });
    // The ruin: crawl in for the drawing, back out, climb over.
    r.go(82.2, { walk: true });
    r.go(84.9, { crawl: true });
    expect(r.save.hasMemory('L02:drawing')).toBe(true);
    r.go(82.1, { crawl: true });
    r.hold(0.3);
    r.go(86.5, { walk: true, jumps: [82.3] });
    r.go(111, { walk: true });
    finish(r);
  });

  it('L03 The Relay Yard: the mitten, the relay, the heavy lever, the plate, the run for the train', () => {
    const r = route(getLevel('L03'));
    // The mitten, behind the first shed.
    r.go(-6.9, { walk: true, jumps: [-0.35] });
    expect(r.save.hasMemory('L03:mitten')).toBe(true);
    r.go(1, { walk: true, jumps: [-2.85] });
    // The transmitter, then the drone in the second shed.
    r.go(13.0, { walk: true });
    expect(r.save.hasFlag('relay')).toBe(true);
    r.tap();
    expect(r.rt.controlled).not.toBe(r.rt.child);
    r.go(21.2, { walk: true }); // the drone walks to the heavy lever
    r.tap(); // and throws it
    r.hold(1.5);
    r.go(19.6, { walk: true }); // step away so the next tap isn't the lever
    r.tap(); // back to the child
    expect(r.rt.controlled).toBe(r.rt.child);
    r.go(23.6, { walk: true });
    r.go(25.6, { crawl: true }); // under the shutter
    r.hold(0.3);
    r.tap(); // take over the drone in the third shed
    expect(r.rt.controlled).not.toBe(r.rt.child);
    r.go(32.3, { walk: true }); // onto the plate
    r.hold(2.2);
    r.tap(); // back to the child
    r.go(37.6, { walk: true });
    // The alarm: run, up over the parked wagon, onto the moving train.
    r.go(48.5, { jumps: [41.1, 46.35] });
    r.until(() => r.rt.child.grounded && r.rt.child.standingOn?.tag === 'freight_car' && r.rt.child.x > 47, { right: true }, 8, 'aboard the train');
    r.until(() => r.rt.exiting, {}, 40, 'the train carries the child out');
    finish(r);
  });

  it('L04 The Signal: walk up to the mast', () => {
    const r = route(getLevel('L04'));
    r.go(47, { walk: true });
    finish(r);
  });

  it('the story holds exactly one memory per level, three in all', () => {
    expect(storyMemories()).toEqual(['L01:rabbit', 'L02:drawing', 'L03:mitten']);
  });

  it('a save with every memory is what unlocks the epilogue', () => {
    const s = new SaveGame(null);
    for (const m of storyMemories()) s.collect(m, 'L03');
    expect(storyMemories().every((m) => s.hasMemory(m))).toBe(true);
    s.newGame('L01');
    expect(s.data).toMatchObject({ level: 'L01', checkpoint: -1 });
    expect(s.hasFlag('complete')).toBe(true);
    expect(s.memories.length).toBe(3);
  });
});
