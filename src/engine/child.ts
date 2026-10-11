// Placeholder child figure: a dark silhouette with a gas-mask snout and a
// stub of blue scarf. Procedural poses for idle, walk, run, crawl and air.
// M2 replaces the scarf with a simulated, trailing one.

import * as THREE from 'three';
import type { Player } from './player';
import { PALETTE } from './renderer';

export class ChildView {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legL: THREE.Mesh;
  private readonly legR: THREE.Mesh;
  private phase = 0;

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
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.04), scarfMat);
    tail.position.set(-0.24, 0.8, 0);
    tail.rotation.z = -0.25;

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.3, 4, 8);
    legGeo.translate(0, -0.21, 0); // pivot at the hip
    this.legL = new THREE.Mesh(legGeo, dark);
    this.legR = new THREE.Mesh(legGeo, dark);
    this.legL.position.set(0, 0.42, 0.06);
    this.legR.position.set(0, 0.42, -0.06);

    this.body.add(torso, head, snout, scarf, tail, this.legL, this.legR);
    this.root.add(this.body);
  }

  update(p: Player, dt: number): void {
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
  }
}
