// Placeholder child figure: a dark silhouette with a gas-mask snout and the
// blue scarf. Procedural poses for idle, walk, run, crawl and air. The scarf's
// trailing end is a verlet ribbon in world space (see scarf.ts).

import * as THREE from 'three';
import type { Player } from './player';
import { PALETTE } from './renderer';
import { Scarf, type Vec3 } from './scarf';

/** Neck position in the body's local space, where the scarf is pinned. */
const NECK = { x: -0.14, y: 0.83 };
const RIBBON_WIDTH = 0.085;

export class ChildView {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legL: THREE.Mesh;
  private readonly legR: THREE.Mesh;
  private phase = 0;
  private readonly scarf: Scarf;
  readonly ribbon: THREE.Mesh;
  private readonly ribbonPos: Float32Array;

  constructor() {
    const dark = new THREE.MeshStandardMaterial({ color: PALETTE.silhouette, roughness: 0.9 });
    const scarfMat = new THREE.MeshBasicMaterial({ color: PALETTE.scarf, fog: false });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.32, 4, 10), dark);
    torso.position.y = 0.62;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), dark);
    head.position.y = 0.98;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.12, 10), dark);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(0.17, 0.93, 0);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.3), scarfMat);
    scarf.position.y = 0.82;

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.3, 4, 8);
    legGeo.translate(0, -0.21, 0); // pivot at the hip
    this.legL = new THREE.Mesh(legGeo, dark);
    this.legR = new THREE.Mesh(legGeo, dark);
    this.legL.position.set(0, 0.42, 0.06);
    this.legR.position.set(0, 0.42, -0.06);

    this.body.add(torso, head, snout, scarf, this.legL, this.legR);
    this.root.add(this.body);

    // Ribbon: two vertices per scarf point, rebuilt every frame.
    this.scarf = new Scarf({ x: 0, y: NECK.y, z: 0 });
    const n = this.scarf.points.length;
    this.ribbonPos = new Float32Array(n * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.ribbonPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    this.ribbon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PALETTE.scarf, side: THREE.DoubleSide, fog: false }));
    this.ribbon.frustumCulled = false;
  }

  /** World position of the neck, following the current pose. */
  neck(): Vec3 {
    const a = this.body.rotation.z;
    const lx = NECK.x * Math.cos(a) - NECK.y * Math.sin(a);
    const ly = NECK.x * Math.sin(a) + NECK.y * Math.cos(a) + this.body.position.y;
    return { x: this.root.position.x + lx * this.root.scale.x, y: this.root.position.y + ly, z: 0.06 };
  }

  /** Snap the scarf to the child (spawn, respawn, debug jumps). */
  resetScarf(): void {
    this.scarf.reset(this.neck());
  }

  private updateRibbon(dt: number, wind: number): void {
    // Sub-step the cloth so it stays stable at low frame rates.
    const steps = Math.min(4, Math.max(1, Math.ceil(dt / (1 / 120))));
    const neck = this.neck();
    for (let i = 0; i < steps; i++) this.scarf.update(neck, dt / steps, wind);
    const pts = this.scarf.points;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      // Width is perpendicular in the screen plane so the band always reads; it tapers and frays at the tip.
      const w = RIBBON_WIDTH * (1 - (i / (n - 1)) * 0.45) * 0.5;
      const o = i * 6;
      this.ribbonPos[o] = p.x - dy * w;
      this.ribbonPos[o + 1] = p.y + dx * w;
      this.ribbonPos[o + 2] = p.z;
      this.ribbonPos[o + 3] = p.x + dy * w;
      this.ribbonPos[o + 4] = p.y - dx * w;
      this.ribbonPos[o + 5] = p.z;
    }
    this.ribbon.geometry.attributes.position.needsUpdate = true;
  }

  update(p: Player, dt: number, wind = 0.3): void {
    this.root.position.set(p.x, p.y, 0);
    this.root.scale.x = p.facing;

    const speed = Math.abs(p.vx);
    this.phase += dt * (2 + speed * 4.2);
    const swing = Math.min(1, speed / 1.7);

    let bodyTilt = 0;
    let bodyY = 0;
    let legA = Math.sin(this.phase) * 0.7 * swing;

    switch (p.mode) {
      case 'idle':
        bodyY = Math.sin(this.phase * 0.6) * 0.008; // breathing
        legA = 0;
        break;
      case 'walk':
        bodyY = Math.abs(Math.sin(this.phase)) * 0.025;
        break;
      case 'run':
        bodyTilt = -0.22;
        bodyY = Math.abs(Math.sin(this.phase)) * 0.05;
        legA *= 1.3;
        break;
      case 'crawl':
        bodyTilt = -1.2;
        bodyY = -0.38;
        legA *= 0.5;
        break;
      case 'air':
        bodyTilt = -0.1;
        legA = p.vy > 0 ? 0.6 : 0.25;
        break;
    }

    const k = 1 - Math.exp(-dt * 14);
    this.body.rotation.z += (bodyTilt - this.body.rotation.z) * k;
    this.body.position.y += (bodyY - this.body.position.y) * k;
    this.legL.rotation.z = legA;
    this.legR.rotation.z = p.mode === 'air' ? -legA * 0.4 : -legA;
    this.updateRibbon(dt, wind);
  }
}
