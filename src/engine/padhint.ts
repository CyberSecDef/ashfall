// Faint ring under the thumb on the hidden pad, only for the first few
// seconds of play. After that the pad is fully invisible.

import type { Input } from './input';

const SHOW_FOR = 6; // seconds of play after the first touch

export class PadHint {
  private readonly ctx: CanvasRenderingContext2D;
  private elapsed = -1;
  private done = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly input: Input,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update(dt: number): void {
    if (this.done) return;
    const pad = this.input.padTouch;
    if (pad && this.elapsed < 0) this.elapsed = 0;
    if (this.elapsed >= 0) this.elapsed += dt;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (this.elapsed > SHOW_FOR) {
      this.done = true;
      this.canvas.remove();
      return;
    }
    if (!pad) return;
    const fade = Math.min(1, (SHOW_FOR - this.elapsed) / 1.5);
    ctx.strokeStyle = `rgba(200, 205, 198, ${0.18 * fade})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pad.cx, pad.cy, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(200, 205, 198, ${0.12 * fade})`;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}
