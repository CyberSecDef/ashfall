// Water: shallow water slows the child; deep water drowns anything that stays
// under. The surface fills the dip between the banks at x and x + w (or sits
// `depth` above flat ground).

import * as THREE from 'three';
import type { Player } from '../engine/player';
import type { EntityDefinition, LevelContext, WaterZone } from './types';
import { zAt } from './visuals';

export function waterSurface(ctx: LevelContext, x0: number, x1: number, depth: number): { surface: number; bottom: number } {
  const t = ctx.terrain;
  let bottom = Infinity;
  for (let x = x0; x <= x1; x += 0.1) bottom = Math.min(bottom, t.heightAt(x));
  const banks = Math.min(t.heightAt(x0), t.heightAt(x1));
  const surface = banks - bottom < 0.05 ? bottom + depth : banks - 0.05;
  return { surface, bottom };
}

export function waterMesh(ctx: LevelContext, x0: number, x1: number, surface: number, bottom: number, dark: boolean): THREE.Group {
  const g = new THREE.Group();
  const h = Math.max(0.05, surface - bottom + 0.3);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0, h, 2.4),
    new THREE.MeshStandardMaterial({ color: dark ? 0x080908 : 0x1a1d1b, roughness: 0.15, metalness: 0.4, transparent: true, opacity: dark ? 0.94 : 0.8 }),
  );
  body.position.set((x0 + x1) / 2, surface - h / 2, zAt(ctx, (x0 + x1) / 2, -0.4));
  // A faint lighter line where the surface catches the sky.
  const line = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.025), new THREE.MeshBasicMaterial({ color: 0x5c615c, transparent: true, opacity: 0.55, fog: false }));
  line.position.set((x0 + x1) / 2, surface, zAt(ctx, (x0 + x1) / 2, 0.81));
  g.add(body, line);
  return g;
}

export const water: EntityDefinition<'water'> = {
  create(spec, ctx) {
    const x0 = spec.x;
    const x1 = spec.x + spec.w;
    const { surface, bottom } = waterSurface(ctx, x0, x1, spec.depth);
    const zone: WaterZone = { minX: x0, maxX: x1, y: surface, deep: false };
    ctx.addWater(zone);
    ctx.group.add(waterMesh(ctx, x0, x1, surface, bottom, false));
    const wet = new Set<Player>();
    return {
      type: 'water',
      id: spec.id,
      x: spec.x,
      update() {
        for (const a of ctx.actors) {
          const inside = a.x >= x0 && a.x <= x1 && a.y < surface;
          if (inside && !wet.has(a)) {
            wet.add(a);
            ctx.sound('splash', a.x);
          } else if (!inside) wet.delete(a);
        }
      },
    };
  },
};
