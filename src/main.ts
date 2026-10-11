import { CameraRig } from './engine/camera';
import { ChildView } from './engine/child';
import { Debug } from './engine/debug';
import { Input } from './engine/input';
import { PadHint } from './engine/padhint';
import { Player } from './engine/player';
import { Renderer, buildGround, buildMarkers } from './engine/renderer';
import { Terrain } from './engine/terrain';
import { L00_PATH, L00_SPAWN_X } from './levels/L00-sandbox';

const STEP = 1 / 60;
const MAX_STEPS = 5;

const container = document.getElementById('game')!;
const renderer = new Renderer(container);
const input = new Input(container);
const debug = new Debug(document.getElementById('debug')!, renderer.scene);
const padHint = new PadHint(document.getElementById('pad-hint') as HTMLCanvasElement, input);

const terrain = new Terrain(L00_PATH);
const player = new Player(terrain, L00_SPAWN_X);
const child = new ChildView();
renderer.scene.add(buildGround(terrain), buildMarkers(terrain), child.root);
const rig = new CameraRig(renderer.camera, player);

input.onMultiTouch((n) => {
  if (n === 4) debug.toggle();
});

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < MAX_STEPS) {
    input.poll();
    player.update(input.state, STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;

  child.update(player, dt);
  rig.update(player, dt);
  padHint.update(dt);
  debug.frame(dt, player, input.state, terrain);
  renderer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handle for headless smoke tests and console poking.
(window as unknown as { __ashfall: unknown }).__ashfall = { player, input, debug };
