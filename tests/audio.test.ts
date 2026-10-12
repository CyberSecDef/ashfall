import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio/audio';
import { CUES, cueFor } from '../src/audio/cues';
import { levels } from '../src/levels';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? sources(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : []));
}

describe('audio cues', () => {
  it('every cue named in the code or the level data has a synth', () => {
    const names = new Set<string>();
    for (const file of sources('src')) {
      const text = readFileSync(file, 'utf8');
      // sound('x'...), play('x'...), and the ternary pairs in plate/gate.
      for (const m of text.matchAll(/(?:sound|play)\(\s*'([a-z_]+)'/g)) names.add(m[1]);
      for (const m of text.matchAll(/\?\s*'([a-z_]+)'\s*:\s*'([a-z_]+)'\s*,\s*spec\.x\)/g)) {
        names.add(m[1]);
        names.add(m[2]);
      }
    }
    for (const level of levels().values()) for (const t of level.triggers) if (t.action === 'sound') names.add(t.cue);
    for (const cause of ['fall', 'drown', 'radiation', 'crushed', 'snare', 'dog', 'shot', 'caught']) names.add(`death_${cause}`);
    for (const s of ['dirt', 'grass', 'gravel', 'concrete', 'metal', 'wood', 'water']) names.add(`step_${s}`);
    const missing = [...names].filter((n) => !cueFor(n));
    expect(missing).toEqual([]);
    expect(names.size).toBeGreaterThan(40);
  });

  it('has explicit synths for the common families', () => {
    for (const n of ['step_dirt', 'step_metal', 'land', 'jump', 'crawl', 'thunder', 'memory', 'death']) expect(CUES[n]).toBeTypeOf('function');
  });

  it('is silent and harmless without Web Audio (tests, old browsers)', () => {
    const a = new AudioEngine();
    expect(() => {
      a.unlock();
      a.setAmbience({ drone: 'rail_yard', wind: 0.5, ash: 0.5, lightning: 0.5 });
      a.play('crash', 10);
      a.update(1 / 60, 0, 0.5);
    }).not.toThrow();
    expect(a.played).toContain('crash');
  });
});
