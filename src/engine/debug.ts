// Debug mode: backtick, or a four-finger tap on a phone. Shows FPS, player
// state, input and a hitbox. Level and checkpoint jumping arrive with M3.

import * as THREE from 'three';
import type { InputState } from './input';
import type { Player } from './player';
import type { Terrain } from './terrain';

export class Debug {
  enabled = false;
  private frames = 0;
  private fpsTime = 0;
  private fps = 0;
  private readonly hitbox: THREE.LineSegments;

  constructor(
    private readonly el: HTMLElement,
    scene: THREE.Scene,
  ) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.01));
    this.hitbox = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6ff9a, fog: false }));
    this.hitbox.visible = false;
    scene.add(this.hitbox);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') this.toggle();
    });
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.el.hidden = !this.enabled;
    this.hitbox.visible = this.enabled;
  }

  frame(dt: number, p: Player, input: InputState, terrain: Terrain): void {
    this.frames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsTime);
      this.frames = 0;
      this.fpsTime = 0;
    }
    if (!this.enabled) return;

    const w = 0.36;
    this.hitbox.scale.set(w, p.height, 1);
    this.hitbox.position.set(p.x, p.y + p.height / 2, 0);

    const on = (b: boolean, c: string) => (b ? c : '·');
    this.el.textContent = [
      `fps  ${this.fps}   dpr ${Math.min(window.devicePixelRatio, 2).toFixed(2)}   ${window.innerWidth}x${window.innerHeight}`,
      `x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}  vx ${p.vx.toFixed(2)}  vy ${p.vy.toFixed(2)}`,
      `mode ${p.mode}  grounded ${p.grounded}  surface ${terrain.surfaceAt(p.x)}  slope ${terrain.slopeAt(p.x).toFixed(2)}`,
      `last fall ${p.lastFall.toFixed(2)} m`,
      `input ${on(input.left, 'L')}${on(input.right, 'R')}${on(input.up, 'U')}${on(input.down, 'D')}${on(input.interact, 'I')}`,
    ].join('\n');
  }
}
