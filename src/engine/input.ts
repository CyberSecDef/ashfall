// One input layer for touch, keyboard and gamepad. Everything downstream sees
// only InputState: four directions plus interact.

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** True while interact is held (tap-and-hold, E, or the West button). */
  interact: boolean;
  /** True for exactly one update after interact goes down. */
  interactPressed: boolean;
}

export const emptyInput = (): InputState => ({
  left: false,
  right: false,
  up: false,
  down: false,
  interact: false,
  interactPressed: false,
});

/** Hidden-pad tuning, in CSS pixels. */
export const PAD = {
  deadZone: 14,
  /** Vertical travel needed before up/down register. */
  verticalThreshold: 30,
};

/**
 * Map a thumb offset from the pad center to directions. Pure, so it is unit
 * tested. Up and down only fire once the thumb travels clearly vertically,
 * so sliding sideways to walk never jumps or crawls by accident.
 */
export function padDirections(dx: number, dy: number): Pick<InputState, 'left' | 'right' | 'up' | 'down'> {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const vertical = ay > PAD.verticalThreshold && ay > ax * 0.6;
  return {
    left: dx < -PAD.deadZone,
    right: dx > PAD.deadZone,
    up: vertical && dy < 0,
    down: vertical && dy > 0,
  };
}

interface PadTouch {
  id: number;
  cx: number;
  cy: number;
  x: number;
  y: number;
}

export class Input {
  readonly state: InputState = emptyInput();

  private keys = new Set<string>();
  /** Keys pressed since the last poll, so a tap shorter than one update still counts. */
  private tapped = new Set<string>();
  private pad: PadTouch | null = null;
  private interactTouches = new Set<number>();
  private prevInteract = false;
  private listeners: Array<(touchCount: number) => void> = [];

  constructor(surface: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.tapped.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const opts = { passive: false } as const;
    surface.addEventListener('touchstart', (e) => this.onTouchStart(e), opts);
    surface.addEventListener('touchmove', (e) => this.onTouchMove(e), opts);
    surface.addEventListener('touchend', (e) => this.onTouchEnd(e), opts);
    surface.addEventListener('touchcancel', (e) => this.onTouchEnd(e), opts);
    // Block iOS pinch-zoom, double-tap zoom and the long-press menu.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Called with the number of simultaneous touches on each touchstart. */
  onMultiTouch(fn: (touchCount: number) => void): void {
    this.listeners.push(fn);
  }

  /** The active pad center and thumb, for the faint first-seconds hint ring. */
  get padTouch(): Readonly<PadTouch> | null {
    return this.pad;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const fn of this.listeners) fn(e.touches.length);
    const half = window.innerWidth / 2;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < half && !this.pad) {
        this.pad = { id: t.identifier, cx: t.clientX, cy: t.clientY, x: t.clientX, y: t.clientY };
      } else if (t.clientX >= half) {
        this.interactTouches.add(t.identifier);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.pad) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.pad.id) {
        this.pad.x = t.clientX;
        this.pad.y = t.clientY;
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (this.pad && t.identifier === this.pad.id) this.pad = null;
      this.interactTouches.delete(t.identifier);
    }
  }

  /** Sample every source into `state`. Call once per fixed update. */
  poll(): void {
    const k = new Set([...this.keys, ...this.tapped]);
    this.tapped.clear();
    let left = k.has('KeyA') || k.has('ArrowLeft');
    let right = k.has('KeyD') || k.has('ArrowRight');
    let up = k.has('KeyW') || k.has('ArrowUp') || k.has('Space');
    let down = k.has('KeyS') || k.has('ArrowDown');
    let interact = k.has('KeyE') || this.interactTouches.size > 0;

    if (this.pad) {
      const d = padDirections(this.pad.x - this.pad.cx, this.pad.y - this.pad.cy);
      left ||= d.left;
      right ||= d.right;
      up ||= d.up;
      down ||= d.down;
    }

    for (const gp of navigator.getGamepads?.() ?? []) {
      if (!gp) continue;
      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      const b = (i: number) => gp.buttons[i]?.pressed ?? false;
      left ||= ax < -0.4 || b(14);
      right ||= ax > 0.4 || b(15);
      up ||= b(0) || b(12);
      down ||= ay > 0.6 || b(13);
      interact ||= b(2);
    }

    const s = this.state;
    s.left = left && !right;
    s.right = right && !left;
    s.up = up;
    s.down = down;
    s.interactPressed = interact && !this.prevInteract;
    s.interact = interact;
    this.prevInteract = interact;
  }
}
