// The level's one hidden memory: a small silhouette object off the main path
// (a toy, a drawing) with a faint pale glint so a curious player notices it.
// Walking into it keeps it: the glint brightens and fades, and the save
// records it. Already-collected memories stay in the world, dull and quiet.

import * as THREE from 'three';
import { PALETTE } from '../engine/renderer';
import type { EntityDefinition } from './types';
import { entityY } from './types';

const PICKUP_RANGE = 0.45;

function silhouette(kind: string): THREE.BufferGeometry {
  switch (kind) {
    case 'toy_rabbit': {
      const s = new THREE.Shape();
      s.absellipse(0, 0.09, 0.09, 0.08, 0, Math.PI * 2, false, 0);
      const head = new THREE.Path();
      head.absellipse(0.08, 0.2, 0.06, 0.055, 0, Math.PI * 2, false, 0);
      const g: THREE.BufferGeometry[] = [new THREE.ShapeGeometry(s), new THREE.ShapeGeometry(new THREE.Shape(head.getPoints()))];
      const ear = new THREE.PlaneGeometry(0.025, 0.1);
      ear.rotateZ(-0.3);
      ear.translate(0.09, 0.29, 0);
      g.push(ear);
      return mergeFlat(g);
    }
    case 'drawing': {
      const g = new THREE.PlaneGeometry(0.28, 0.2);
      g.rotateZ(0.12);
      g.translate(0, 0.12, 0);
      return g;
    }
    case 'mitten': {
      const s = new THREE.Shape();
      s.moveTo(-0.05, 0);
      s.lineTo(-0.06, 0.13);
      s.quadraticCurveTo(-0.02, 0.2, 0.04, 0.15);
      s.lineTo(0.05, 0);
      s.closePath();
      return new THREE.ShapeGeometry(s);
    }
    default: {
      const g = new THREE.BoxGeometry(0.18, 0.12, 0.05);
      g.translate(0, 0.06, 0);
      return g;
    }
  }
}

function mergeFlat(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const g of geos) {
    const ni = g.index ? g.toNonIndexed() : g;
    pos.push(...(ni.getAttribute('position').array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}

let glintTexture: THREE.Texture | null = null;
function glint(): THREE.Texture {
  if (glintTexture) return glintTexture;
  // Headless (tests): no canvas, so an empty texture stands in.
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glintTexture = new THREE.CanvasTexture(c);
  return glintTexture;
}

export const memory_collectible: EntityDefinition<'memory_collectible'> = {
  create(spec, ctx) {
    const key = `${ctx.level.id}:${spec.id}`;
    let collected = ctx.save.hasMemory(key);
    let flare = 0;
    const y = entityY(spec, ctx);

    const obj = new THREE.Mesh(silhouette(spec.kind), new THREE.MeshBasicMaterial({ color: PALETTE.silhouette, side: THREE.DoubleSide }));
    obj.position.set(spec.x, y, ctx.terrain.depthAt(spec.x) - 0.3);
    const spark = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glint(), color: 0xdfe3dc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    spark.scale.setScalar(0.5);
    spark.position.set(spec.x + 0.04, y + 0.16, obj.position.z + 0.05);
    spark.visible = !collected;
    ctx.group.add(obj, spark);

    return {
      type: 'memory_collectible',
      id: spec.id,
      x: spec.x,
      update() {
        if (collected) return;
        const p = ctx.player;
        if (Math.abs(p.x - spec.x) < PICKUP_RANGE && Math.abs(p.y - y) < 0.8) {
          collected = true;
          flare = 1;
          ctx.save.collect(key, ctx.level.id);
          ctx.sound('memory');
        }
      },
      frame(dt) {
        const m = spark.material as THREE.SpriteMaterial;
        if (flare > 0) {
          flare = Math.max(0, flare - dt * 0.8);
          spark.scale.setScalar(0.5 + (1 - flare) * 1.1);
          m.opacity = flare;
          spark.visible = flare > 0;
          return;
        }
        if (!collected) {
          // A slow, faint pulse: noticeable only to someone looking.
          m.opacity = 0.45 + 0.25 * Math.sin(ctx.time * 1.7);
        }
      },
    };
  },
};
