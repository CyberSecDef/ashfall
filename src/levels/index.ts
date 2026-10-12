// All levels, in play order. Each level file is plain data; it is parsed and
// validated here (and in tests, and before every build).
//
// Adding a level: create src/levels/LNN-name.ts exporting a LevelInput, add it
// to LEVEL_FILES and PLAY_ORDER, and point the previous level's exit.next at it.

import { L00 } from './L00-sandbox';
import { L01 } from './L01-shelter';
import { L02 } from './L02-suburb';
import { L03 } from './L03-relay-yard';
import { L04 } from './L04-signal';
import { loadLevel, type Level, type LevelInput } from './schema';

export const LEVEL_FILES: LevelInput[] = [L00, L01, L02, L03, L04];

/** Story order. L00 (sandbox) and L04 (epilogue) sit outside it. */
export const PLAY_ORDER: string[] = ['L01', 'L02', 'L03'];

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

/** The epilogue, reached only with every memory from the story levels. */
export const EPILOGUE_ID = 'L04';

/** Every memory in the story ("L01:rabbit"), for the alternate ending. */
export function storyMemories(): string[] {
  return PLAY_ORDER.flatMap((id) => getLevel(id).entities.filter((e) => e.type === 'memory_collectible' && e.id).map((e) => `${id}:${e.id}`));
}

/** The level after `id`: its exit.next, else the next in play order, else the first. (The game handles the story's end.) */
export function nextLevelId(id: string): string {
  const next = getLevel(id).exit.next;
  if (next) return next;
  const i = PLAY_ORDER.indexOf(id);
  return PLAY_ORDER[(i + 1) % PLAY_ORDER.length] ?? PLAY_ORDER[0];
}
