// Debug mode: backtick, or a four-finger tap on a phone. Shows FPS, player
// state, level/checkpoint/save info and hitboxes, plus a menu to jump to any
// level or checkpoint and reset the save. Debug text is developer-only; the
// game itself never shows words.

import * as THREE from 'three';
import type { Game } from './game';

export interface DebugMenuItem {
  label: string;
  action: () => void;
}

export class Debug {
  enabled = false;
  private frames = 0;
  private fpsTime = 0;
  private fps = 0;
  private readonly hitbox: THREE.LineSegments;
  private readonly text: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  private menuKey = '';
  private readonly markers = new THREE.Group();
  private markersFor = '';

  constructor(
    private readonly el: HTMLElement,
    scene: THREE.Scene,
    private readonly menuItems: () => DebugMenuItem[][],
  ) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.01));
    this.hitbox = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6ff9a, fog: false }));
    this.hitbox.visible = false;
    this.markers.visible = false;
    scene.add(this.hitbox, this.markers);

    this.text = document.createElement('div');
    this.menu = document.createElement('div');
    this.menu.className = 'debug-menu';
    el.append(this.text, this.menu);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') this.toggle();
    });
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.el.hidden = !this.enabled;
    this.hitbox.visible = this.enabled;
    this.markers.visible = this.enabled;
    this.menuKey = '';
  }

  private buildMenu(): void {
    const groups = this.menuItems();
    const key = groups.map((g) => g.map((i) => i.label).join('|')).join('/');
    if (key === this.menuKey) return;
    this.menuKey = key;
    this.menu.replaceChildren(
      ...groups.map((items) => {
        const row = document.createElement('div');
        for (const item of items) {
          const b = document.createElement('button');
          b.textContent = item.label;
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action();
            this.menuKey = '';
          });
          row.append(b);
        }
        return row;
      }),
    );
  }

  /** Vertical lines at checkpoints (green), triggers (amber) and the exit (white). */
  private buildMarkers(game: Game): void {
    const key = `${game.level.id}:${game.checkpoints.join(',')}`;
    if (key === this.markersFor) return;
    this.markersFor = key;
    this.markers.children.forEach((m) => (m as THREE.Line).geometry.dispose());
    this.markers.clear();
    const t = game.current.terrain;
    const line = (x: number, color: number, w = 0) => {
      const y = t.heightAt(x);
      const pts = w > 0 ? [x, y + 0.05, 0, x + w, y + 0.05, 0] : [x, y, 0, x, y + 2.2, 0];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.markers.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color, fog: false })));
    };
    for (const x of game.checkpoints) line(x, 0x7dff8a);
    for (const tr of game.level.triggers) {
      line(tr.x, 0xffc86b);
      line(tr.x, 0xffc86b, tr.w);
    }
    line(game.level.exit.x, 0xffffff);
  }

  frame(dt: number, game: Game): void {
    this.frames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsTime);
      this.frames = 0;
      this.fpsTime = 0;
    }
    if (!this.enabled) return;
    this.buildMenu();
    this.buildMarkers(game);

    const p = game.player;
    const input = game.input.state;
    const t = game.current.terrain;
    const w = 0.36;
    this.hitbox.scale.set(w, p.height, 1);
    this.hitbox.position.set(p.x, p.y + p.height / 2, t.depthAt(p.x));

    const on = (b: boolean, c: string) => (b ? c : '·');
    const save = game.save.data;
    this.text.textContent = [
      `fps  ${this.fps}   dpr ${Math.min(window.devicePixelRatio, 2).toFixed(2)}   ${window.innerWidth}x${window.innerHeight}   draws ${game.sceneDraws}`,
      `${game.level.id} ${game.level.name}   checkpoint ${game.current.checkpoint}/${game.checkpoints.length - 1}   exit x ${game.level.exit.x}`,
      `x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}  vx ${p.vx.toFixed(2)}  vy ${p.vy.toFixed(2)}  depth ${t.depthAt(p.x).toFixed(2)}`,
      `mode ${p.mode}  grounded ${p.grounded}  surface ${t.surfaceAt(p.x)}  slope ${t.slopeAt(p.x).toFixed(2)}  last fall ${p.lastFall.toFixed(2)} m`,
      `input ${on(input.left, 'L')}${on(input.right, 'R')}${on(input.up, 'U')}${on(input.down, 'D')}${on(input.interact, 'I')}   cue ${game.lastCue || '-'}`,
      `save ${save ? `${save.level} cp ${save.checkpoint}  memories [${save.memories.join(', ')}]` : 'none'}`,
      `keys: 1 pull-out  2 push-in  0 reset camera  L lightning  R respawn`,
    ].join('\n');
  }
}
