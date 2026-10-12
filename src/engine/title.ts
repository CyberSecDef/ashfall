// The title card: "ASHFALL" fading in over black and out again. The only text
// in the game. Shown on boot and after the ending. A tap or key hurries it.

export class Title {
  private readonly el: HTMLElement | null;
  private timers: number[] = [];
  private skip: (() => void) | null = null;
  active = false;

  constructor() {
    this.el = typeof document === 'undefined' ? null : document.getElementById('title');
    if (typeof window !== 'undefined') {
      const hurry = () => this.skip?.();
      window.addEventListener('keydown', hurry);
      window.addEventListener('touchend', hurry);
    }
  }

  /**
   * Fade the title in, hold, then call `reveal` (the game starts fading in
   * underneath) and fade the title out. `hold` is how long it stays up.
   */
  show(reveal: () => void, hold = 1.6): void {
    const el = this.el;
    this.clear();
    this.active = true;
    if (!el) {
      reveal();
      this.active = false;
      return;
    }
    let revealed = false;
    const doReveal = () => {
      if (revealed) return;
      revealed = true;
      this.skip = null;
      reveal();
      el.classList.remove('shown');
      this.timers.push(window.setTimeout(() => (this.active = false), 2000));
    };
    // Let the element take its starting opacity before transitioning.
    this.timers.push(window.setTimeout(() => el.classList.add('shown'), 60));
    this.timers.push(window.setTimeout(doReveal, 2000 + hold * 1000));
    // Hurrying is allowed once the title has fully appeared.
    this.timers.push(window.setTimeout(() => (this.skip = doReveal), 1200));
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.skip = null;
  }
}
