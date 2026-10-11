// Three.js scene setup. Gameplay lives on the z = 0 plane; the camera looks
// down -z from in front. Vertical field of view is fixed, so every screen sees
// the same vertical framing and wider phones simply see more horizontally.

import * as THREE from 'three';
import type { Terrain } from './terrain';

export const PALETTE = {
  sky: 0x2a2d2b,
  fog: 0x3a3e3a,
  ground: 0x1a1b1a,
  groundTop: 0x2b2d29,
  silhouette: 0x0d0e0d,
  /** The only saturated color in the game. */
  scarf: 0x1e90ff,
};

export const CAMERA = {
  fov: 32,
  distance: 11,
  height: 1.4,
};

export class Renderer {
  readonly three: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  constructor(container: HTMLElement) {
    this.three = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.three.setClearColor(PALETTE.sky);
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.three.domElement);

    this.scene.fog = new THREE.Fog(PALETTE.fog, 12, 55);
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 400);

    const hemi = new THREE.HemisphereLight(0x8a9088, 0x141514, 0.9);
    const moon = new THREE.DirectionalLight(0xc8d0cc, 1.4);
    moon.position.set(-6, 10, -8); // behind and above: rim light on silhouettes
    this.scene.add(hemi, moon);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  get canvas(): HTMLCanvasElement {
    return this.three.domElement;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.three.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.three.render(this.scene, this.camera);
  }
}

/**
 * Ground mesh from the terrain profile: a top surface running in depth from
 * behind the path to just in front of it, and a front face dropping away.
 */
export function buildGround(terrain: Terrain, zBack = -6, zFront = 2.5, bottom = -14): THREE.Mesh {
  const s = terrain.samples;
  const pos: number[] = [];
  const idx: number[] = [];
  // Top: two vertices per sample (back, front).
  for (const p of s) pos.push(p.x, p.y, zBack, p.x, p.y, zFront);
  for (let i = 0; i < s.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  // Front face: top edge at zFront down to `bottom`.
  const base = pos.length / 3;
  for (const p of s) pos.push(p.x, p.y, zFront, p.x, bottom, zFront);
  for (let i = 0; i < s.length - 1; i++) {
    const a = base + i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.groundTop, roughness: 1, metalness: 0 });
  return new THREE.Mesh(geo, mat);
}

/** Temporary depth markers until M2's layers: posts at a few depths. */
export function buildMarkers(terrain: Terrain): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.silhouette, roughness: 1 });
  const geo = new THREE.BoxGeometry(0.12, 1, 0.12);
  for (let x = terrain.minX; x < terrain.maxX; x += 4) {
    for (const [z, h] of [
      [-4.5, 2.2],
      [-2.5, 1.2],
    ] as const) {
      const post = new THREE.Mesh(geo, mat);
      post.scale.y = h;
      post.position.set(x + (z === -2.5 ? 2 : 0), terrain.heightAt(x) + h / 2 - 0.1, z);
      g.add(post);
    }
  }
  return g;
}
