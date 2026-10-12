// Foley derived from what actors are doing: footsteps by surface (terrain, or
// whatever solid is underfoot), crawl rustle, jumps, landings, scrambles,
// ladder rungs, and the scrape of something being pushed.

import type { Player } from '../engine/player';
import type { LevelRuntime } from '../engine/runtime';

const SOLID_SURFACE: Record<string, string> = {
  crate: 'wood',
  log: 'wood',
  crawlspace: 'wood',
  cart: 'metal',
  freight_car: 'metal',
  lift: 'metal',
  conveyor: 'metal',
  plate: 'metal',
  gate: 'metal',
  hatch: 'metal',
  pipe: 'metal',
  obstacle: 'concrete',
  debris: 'concrete',
  boulder: 'gravel',
  body: 'dirt',
};

interface Track {
  dist: number;
  grounded: boolean;
  mode: string;
  y: number;
  x: number;
  vy: number;
}

export class Foley {
  private readonly tracks = new Map<Player, Track>();

  constructor(private readonly play: (cue: string, x: number) => void) {}

  reset(): void {
    this.tracks.clear();
  }

  update(rt: LevelRuntime): void {
    for (const a of rt.actors) {
      if (a.frozen && a !== rt.child) continue; // dormant bodies are silent
      let tr = this.tracks.get(a);
      if (!tr) {
        tr = { dist: 0, grounded: a.grounded, mode: a.mode, y: a.y, x: a.x, vy: a.vy };
        this.tracks.set(a, tr);
      }
      const heavy = a !== rt.child;
      const moved = Math.abs(a.x - tr.x);

      if (a.mode === 'climb' && tr.mode !== 'climb') this.play('scramble', a.x);
      if (!a.grounded && tr.grounded && a.vy > 3) this.play('jump', a.x);
      if (a.grounded && !tr.grounded && a.mode !== 'climb' && a.lastFall > 0.3) this.play(heavy ? 'step_heavy' : 'land', a.x);

      if (a.mode === 'ladder') {
        tr.dist += Math.abs(a.y - tr.y);
        if (tr.dist > 0.32) {
          tr.dist = 0;
          this.play('ladder', a.x);
        }
      } else if (a.grounded && moved > 0) {
        tr.dist += moved;
        const crawling = a.mode === 'crawl';
        const pushing = a.mode === 'push' || a.mode === 'pull';
        const stride = crawling ? 0.35 : pushing ? 0.5 : heavy ? 0.7 : a.mode === 'run' ? 0.85 : 0.55;
        if (tr.dist >= stride) {
          tr.dist = 0;
          if (crawling) this.play('crawl', a.x);
          else if (heavy) this.play('step_heavy', a.x);
          else this.play(`step_${surfaceUnder(rt, a)}`, a.x);
          if (pushing) this.play('scrape', a.x);
        }
      }
      tr.grounded = a.grounded;
      tr.mode = a.mode;
      tr.y = a.y;
      tr.x = a.x;
      tr.vy = a.vy;
    }
  }
}

function surfaceUnder(rt: LevelRuntime, a: Player): string {
  for (const w of rt.water) if (a.x >= w.minX && a.x <= w.maxX && a.y < w.y) return 'water';
  const s = a.standingOn;
  if (s?.tag && SOLID_SURFACE[s.tag]) return SOLID_SURFACE[s.tag];
  return rt.terrain.surfaceAt(a.x);
}
