// All levels, in play order. Each level file is plain data; it is parsed and
// validated here (and in tests, and before every build).
//
// Adding a level: create src/levels/LNN-name.ts exporting a LevelInput, add it
// to LEVEL_FILES and PLAY_ORDER, and point the previous level's exit.next at it.

import { L00 } from './L00-sandbox';
import { loadLevel, type Level, type LevelInput } from './schema';

export const LEVEL_FILES: LevelInput[] = [L00];

/** Story order. L00 is the sandbox and stands in until L01-L03 exist (M5). */
export const PLAY_ORDER: string[] = ['L00'];

export const SANDBOX_ID = 'L00';

let cache: Map<string, Level> | null = null;

export function levels(): Map<string, Level> {
  if (cache) return cache;
  const ids = LEVEL_FILES.map((l) => l.id);
  cache = new Map(LEVEL_FILES.map((l) => [l.id, loadLevel(l, ids)]));
  return cache;
}

export function getLevel(id: string): Level {
  const l = levels().get(id);
  if (!l) throw new Error(`Unknown level ${id}`);
  return l;
}

/** The level after `id`: its exit.next, else the next in play order, else the first. */
export function nextLevelId(id: string): string {
  const next = getLevel(id).exit.next;
  if (next) return next;
  const i = PLAY_ORDER.indexOf(id);
  return PLAY_ORDER[(i + 1) % PLAY_ORDER.length] ?? PLAY_ORDER[0];
}
