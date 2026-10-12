import { describe, expect, it } from 'vitest';
import { QUALITY, QualityController } from '../src/engine/quality';

const run = (q: QualityController, ms: number, seconds: number) => {
  let changes = 0;
  for (let t = 0; t < seconds; t += ms / 1000) if (q.feed(ms / 1000)) changes++;
  return changes;
};

describe('QualityController', () => {
  it('stays high at a steady 60 fps', () => {
    const q = new QualityController(false);
    run(q, 16.7, 30);
    expect(q.tier).toBe('high');
  });

  it('steps down when frames run long, one tier at a time', () => {
    const q = new QualityController(false);
    run(q, 30, QUALITY.settle + QUALITY.downAfter + 2);
    expect(q.tier).toBe('medium');
    run(q, 30, QUALITY.settle + QUALITY.downAfter + 2);
    expect(q.tier).toBe('low');
    run(q, 30, 20);
    expect(q.tier).toBe('low');
  });

  it('ignores a brief hitch', () => {
    const q = new QualityController(false);
    run(q, 16.7, 3);
    run(q, 40, 0.5);
    run(q, 16.7, 5);
    expect(q.tier).toBe('high');
  });

  it('climbs back up only after sustained headroom and a cooldown', () => {
    const q = new QualityController(false);
    run(q, 30, 6);
    expect(q.tier).toBe('medium');
    run(q, 8, QUALITY.upAfter + 3); // fast, but inside the cooldown
    expect(q.tier).toBe('medium');
    run(q, 8, QUALITY.upCooldown + QUALITY.upAfter);
    expect(q.tier).toBe('high');
  });

  it('a manual choice holds regardless of frame times', () => {
    const q = new QualityController(false);
    q.setMode('low');
    run(q, 8, 60);
    expect(q.tier).toBe('low');
    q.setMode('high');
    run(q, 40, 20);
    expect(q.tier).toBe('high');
  });
});
