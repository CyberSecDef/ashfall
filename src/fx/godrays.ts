// Faint god rays: soft additive light shafts slanting down from the moon's
// side, placed among the mid-layer trees. Each pulses slowly as the haze
// shifts.

import * as THREE from 'three';
import { type Rng, range } from '../engine/rng';

let texture: THREE.Texture | null = null;

function shaftTexture(): THREE.Texture {
  if (texture) return texture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const u = x / (c.width - 1);
      const v = y / (c.height - 1);
      const across = Math.pow(Math.sin(u * Math.PI), 2.5);
      const along = Math.pow(1 - v, 0.6) * Math.min(1, v * 6); // bright at the top, soft at both ends
      const a = across * along;
      const i = (y * c.width + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  texture = new THREE.CanvasTexture(c);
  return texture;
}

export interface GodRay {
  mesh: THREE.Mesh;
  base: number;
  phase: number;
}

/** Build shafts along [x0, x1] at depth z, standing on groundY. */
export function buildGodRays(r: Rng, x0: number, x1: number, z: number, groundY: (x: number) => number, spacing = 28): GodRay[] {
  const rays: GodRay[] = [];
  for (let x = x0 + r() * spacing; x < x1; x += spacing * range(r, 0.6, 1.5)) {
    const w = range(r, 1.2, 3);
    const h = range(r, 12, 18);
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, -h / 2, 0); // hang from the top
    const base = range(r, 0.08, 0.16);
    const mat = new THREE.MeshBasicMaterial({
      map: shaftTexture(),
      color: 0xc9d0cc,
      transparent: true,
      opacity: base,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Moon is up and to the right, so shafts lean down-left.
    mesh.rotation.z = -range(r, 0.25, 0.45);
    mesh.position.set(x + h * 0.25, groundY(x) + h * 0.85, z + 0.1);
    mesh.renderOrder = 4;
    rays.push({ mesh, base, phase: r() * Math.PI * 2 });
  }
  return rays;
}

export function updateGodRays(rays: GodRay[], time: number, flash: number): void {
  for (const g of rays) {
    const m = g.mesh.material as THREE.MeshBasicMaterial;
    m.opacity = g.base * (0.65 + 0.35 * Math.sin(time * 0.25 + g.phase)) + flash * 0.08;
  }
}
