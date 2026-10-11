// Camera follow: lagged and eased, with a gentle look-ahead in the walking
// direction. Pull-outs, push-ins and trigger hints arrive in M2/M3.

import type * as THREE from 'three';
import type { Player } from './player';
import { CAMERA } from './renderer';

export class CameraRig {
  private x: number;
  private y: number;
  private lead = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    p: Player,
  ) {
    this.x = p.x;
    this.y = p.y + CAMERA.height;
    this.apply();
  }

  update(p: Player, dt: number): void {
    const targetLead = p.facing * (1.1 + Math.min(Math.abs(p.vx), 3.4) * 0.35);
    this.lead += (targetLead - this.lead) * (1 - Math.exp(-dt * 1.2));
    this.x += (p.x + this.lead - this.x) * (1 - Math.exp(-dt * 3));
    this.y += (p.y + CAMERA.height - this.y) * (1 - Math.exp(-dt * 2.2));
    this.apply();
  }

  private apply(): void {
    this.camera.position.set(this.x, this.y + 0.6, CAMERA.distance);
    this.camera.lookAt(this.x, this.y, 0);
  }
}
