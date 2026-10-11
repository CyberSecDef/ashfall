import { Debug, type DebugMenuItem } from './engine/debug';
import { Game } from './engine/game';
import { Input } from './engine/input';
import { PadHint } from './engine/padhint';
import { Renderer } from './engine/renderer';
import { PLAY_ORDER, levels } from './levels';

const STEP = 1 / 60;
const MAX_STEPS = 5;

const container = document.getElementById('game')!;
const renderer = new Renderer(container);
const input = new Input(container);
const game = new Game(renderer, input);
const padHint = new PadHint(document.getElementById('pad-hint') as HTMLCanvasElement, input);

const menu = (): DebugMenuItem[][] => [
  [...levels().keys()].map((id) => ({ label: id, action: () => game.transition(() => game.load(id, -1), 0.3, 0.5) })),
  [
    { label: 'spawn', action: () => game.load(game.level.id, -1) },
    ...game.checkpoints.map((_, i) => ({ label: `cp ${i}`, action: () => game.load(game.level.id, i) })),
  ],
  [
    { label: 'respawn', action: () => game.respawn() },
    { label: 'reset save', action: () => game.save.reset() },
  ],
];
const debug = new Debug(document.getElementById('debug')!, renderer.scene, menu);

input.onMultiTouch((n) => {
  if (n === 4) debug.toggle();
});

// Debug-only keys for tuning camera framing, flashes and respawn.
window.addEventListener('keydown', (e) => {
  if (!debug.enabled) return;
  if (e.code === 'Digit1') game.rig.hint({ zoom: 1.6, offsetY: 1 }, 4);
  if (e.code === 'Digit2') game.rig.hint({ zoom: 0.75, offsetY: -0.2 }, 2);
  if (e.code === 'Digit0') game.rig.clearHint(3);
  if (e.code === 'KeyL') game.lightning.strike();
  if (e.code === 'KeyR') game.respawn();
});

game.continueOrStart(PLAY_ORDER[0]);

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < MAX_STEPS) {
    game.step(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;

  game.frame(dt);
  padHint.update(dt);
  debug.frame(dt, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handle for headless smoke tests and console poking.
(window as unknown as { __ashfall: unknown }).__ashfall = {
  game,
  debug,
  input,
  renderer,
  get player() {
    return game.player;
  },
  get rig() {
    return game.rig;
  },
  get terrain() {
    return game.current.terrain;
  },
  get child() {
    return game.child;
  },
  get world() {
    return game.current.world;
  },
  get lightning() {
    return game.lightning;
  },
};
