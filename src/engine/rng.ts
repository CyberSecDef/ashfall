// Small seeded PRNG (mulberry32) so procedural scenery is identical on every
// load and in tests.

export type Rng = () => number;

export function makeRng(seed: number | string): Rng {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const range = (r: Rng, lo: number, hi: number): number => lo + (hi - lo) * r();
export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length)];

/** Smooth 1D value noise in [-1, 1], for hill profiles. */
export function noise1(seed: number): (x: number) => number {
  const r = makeRng(seed);
  const table = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}
