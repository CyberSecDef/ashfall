// Shared detection: can a watcher at (x, y) see the child right now?

import type { LevelContext } from './types';

export function canSeeChild(ctx: LevelContext, x: number, y: number): boolean {
  const c = ctx.player;
  if (c.dead || ctx.isHidden(c)) return false;
  const cy = c.y + c.height * 0.6;
  return !ctx.collision.sightBlocked(x, y, c.x, cy);
}

/** Accumulates time spotted; returns true when it passes `limit` (decays when unseen). */
export function spotTimer(limit: number): (seen: boolean, dt: number) => boolean {
  let t = 0;
  return (seen, dt) => {
    t = seen ? t + dt : Math.max(0, t - dt * 2);
    return t >= limit;
  };
}
