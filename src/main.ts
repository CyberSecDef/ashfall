import * as THREE from 'three';
import { CameraRig } from './engine/camera';
import { ChildView } from './engine/child';
import { Debug } from './engine/debug';
import { Input } from './engine/input';
import { PadHint } from './engine/padhint';
import { Player } from './engine/player';
import { CAMERA, GROUND_BACK_Z, Renderer, buildGround } from './engine/renderer';
import { Terrain } from './engine/terrain';
import { Ash } from './fx/ash';
import { updateGodRays } from './fx/godrays';
import { buildWorld, swayForeground } from './fx/layers';
import { Lightning } from './fx/lightning';
import { Overlay } from './fx/overlay';
import { Sky } from './fx/sky';
import { L00 } from './levels/L00-sandbox';

const STEP = 1 / 60;
const MAX_STEPS = 5;
const level = L00;

const container = document.getElementById('game')!;
const renderer = new Renderer(container);
renderer.setPalette(level.palette);
const input = new Input(container);
const debug = new Debug(document.getElementById('debug')!, renderer.scene);
const padHint = new PadHint(document.getElementById('pad-hint') as HTMLCanvasElement, input);

const terrain = new Terrain(level.path);
const player = new Player(terrain, level.spawn.x);
const child = new ChildView();
const world = buildWorld(level.id, level.layers, level.palette, terrain, CAMERA, GROUND_BACK_Z);
renderer.scene.add(buildGround(terrain, level.palette.ground), world.group, child.root, child.ribbon);

const sky = new Sky(level.palette, renderer.camera);
const ash = new Ash(level.ambience.ash);
renderer.scene.add(ash.points);
const overlay = new Overlay();
const lightning = new Lightning(level.ambience.lightning);
const rig = new CameraRig(renderer.camera, player);
child.update(player, 0, level.ambience.wind);
child.resetScarf();

input.onMultiTouch((n) => {
  if (n === 4) debug.toggle();
});

// Debug-only camera and flash keys, for tuning M2's look before triggers exist (M3).
window.addEventListener('keydown', (e) => {
  if (!debug.enabled) return;
  if (e.code === 'Digit1') rig.hint({ zoom: 1.6, offsetY: 1 }, 4);
  if (e.code === 'Digit2') rig.hint({ zoom: 0.75, offsetY: -0.2 }, 2);
  if (e.code === 'Digit0') rig.clearHint(3);
  if (e.code === 'KeyL') lightning.strike();
});

const baseHemi = renderer.hemi.intensity;
const focus = new THREE.Vector3();
let time = 0;
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  time += dt;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < MAX_STEPS) {
    input.poll();
    player.update(input.state, STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;

  const wind = level.ambience.wind;
  const flash = lightning.update(dt);
  child.update(player, dt, wind);
  rig.update(player, dt);
  swayForeground(world.foreground, time, wind);
  updateGodRays(world.godRays, time, flash);
  focus.set(player.x, player.y, 0);
  ash.update(time, focus, wind, renderer.three.domElement.height, renderer.camera.fov, flash);
  sky.update(renderer.camera, time, flash);
  renderer.hemi.intensity = baseHemi + flash * 1.6;
  overlay.update(time, window.innerWidth, window.innerHeight, flash);

  padHint.update(dt);
  debug.frame(dt, player, input.state, terrain);
  renderer.render();
  overlay.render(renderer.three);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handle for headless smoke tests and console poking.
(window as unknown as { __ashfall: unknown }).__ashfall = { player, input, debug, rig, lightning, renderer, terrain, child, world };
