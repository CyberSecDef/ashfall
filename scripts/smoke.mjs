// Headless smoke test: serves dist/, opens it as a landscape iPhone in WebKit
// and as desktop Chromium, drives the child with keyboard and synthetic
// touches, and saves screenshots. Usage: npm run build && npm run smoke

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const root = resolve('dist');
const outDir = resolve(process.argv[2] ?? 'smoke-out');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    const file = path.endsWith('/') ? join(path, 'index.html') : path;
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const state = (page) => page.evaluate(() => {
  const p = window.__ashfall.player;
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), mode: p.mode, grounded: p.grounded };
});

// WebKit forbids constructing Touch/TouchEvent, so build plain events that
// carry touch lists. The game only reads identifier/clientX/clientY.
async function fireTouches(page, type, changed, active) {
  await page.evaluate(({ type, changed, active }) => {
    const target = document.querySelector('#game');
    const e = new Event(type, { bubbles: true, cancelable: true });
    const mk = (t) => ({ identifier: t.id, clientX: t.x, clientY: t.y, target });
    Object.defineProperty(e, 'changedTouches', { value: changed.map(mk) });
    Object.defineProperty(e, 'touches', { value: active.map(mk) });
    target.dispatchEvent(e);
  }, { type, changed, active });
}

async function touch(page, type, id, x, y) {
  const t = { id, x, y };
  await fireTouches(page, type, [t], type === 'touchend' ? [] : [t]);
}

let failed = false;
const check = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed = true;
};

// iPhone, landscape, WebKit.
{
  const browser = await webkit.launch();
  const iphone = devices['iPhone 15 Pro landscape'] ?? devices['iPhone 13 landscape'];
  const ctx = await browser.newContext({ ...iphone });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ashfall);
  await page.waitForTimeout(500);
  const s0 = await state(page);

  // Hidden pad: touch the left half, slide right, hold.
  const vp = page.viewportSize();
  const cx = vp.width * 0.2;
  const cy = vp.height * 0.65;
  await touch(page, 'touchstart', 1, cx, cy);
  await touch(page, 'touchmove', 1, cx + 60, cy);
  await page.waitForTimeout(1500);
  const s1 = await state(page);
  check(s1.x > s0.x + 1, `iPhone: pad slide right walks the child (${s0.x} -> ${s1.x})`);
  await page.screenshot({ path: join(outDir, 'iphone-walk.png') });

  // Swipe up on the pad: jump.
  await touch(page, 'touchmove', 1, cx + 30, cy - 60);
  await page.waitForTimeout(120);
  const s2 = await state(page);
  check(!s2.grounded, `iPhone: pad up jumps (mode ${s2.mode})`);
  await page.screenshot({ path: join(outDir, 'iphone-jump.png') });

  // Down on the pad: crawl.
  await touch(page, 'touchmove', 1, cx + 30, cy);
  await page.waitForTimeout(600);
  await touch(page, 'touchmove', 1, cx + 25, cy + 60);
  await page.waitForTimeout(400);
  const s3 = await state(page);
  check(s3.mode === 'crawl', `iPhone: pad down crawls (mode ${s3.mode})`);
  await page.screenshot({ path: join(outDir, 'iphone-crawl.png') });
  await touch(page, 'touchend', 1, cx + 25, cy + 60);

  // Four-finger tap toggles debug.
  const fingers = [0, 1, 2, 3].map((i) => ({ id: 10 + i, x: 300 + i * 40, y: 200 }));
  await fireTouches(page, 'touchstart', fingers, fingers);
  await fireTouches(page, 'touchend', fingers, []);
  await page.waitForTimeout(200);
  check(await page.evaluate(() => !document.getElementById('debug').hidden), 'iPhone: four-finger tap shows debug');
  await page.screenshot({ path: join(outDir, 'iphone-debug.png') });

  check(errors.length === 0, `iPhone: no page errors ${errors.join(' | ')}`);

  // Portrait shows the rotate graphic.
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await page.waitForTimeout(200);
  check(await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display === 'flex'), 'iPhone portrait: rotate graphic shown');
  await page.screenshot({ path: join(outDir, 'iphone-portrait.png') });
  await browser.close();
}

// Desktop Chromium, keyboard.
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ashfall);
  const s0 = await state(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2500);
  const s1 = await state(page);
  check(s1.x > s0.x + 2, `desktop: D walks/runs right (${s0.x} -> ${s1.x}, ${s1.mode})`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  check(!(await state(page)).grounded, 'desktop: Space jumps');
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Backquote');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, 'desktop-debug.png') });
  // Debug camera hint: pull-out eases the camera back.
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(4500);
  const dist = await page.evaluate(() => window.__ashfall.rig.distance);
  check(dist > 16, `desktop: camera pull-out hint eases out (distance ${dist.toFixed(1)})`);
  await page.screenshot({ path: join(outDir, 'desktop-pullout.png') });
  const calls = await page.evaluate(() => { const r = window.__ashfall.renderer; r.render(); return r.three.info.render.calls; });
  check(calls < 60, `desktop: draw calls per frame stay low (${calls})`);
  // Full playthrough, fast-forwarded in the page: hold right, keep hopping, and
  // check the camera and child stay finite through every hint zone, trigger and event.
  const run = await page.evaluate(() => {
    const a = window.__ashfall;
    const g = a.game;
    g.load('L00', -1);
    const realPoll = g.input.poll.bind(g.input);
    let i = 0;
    g.input.poll = () => {
      const s = g.input.state;
      s.left = s.down = s.interact = s.interactPressed = false;
      s.right = true;
      s.up = i % 50 < 25;
    };
    const bad = [];
    let maxX = 0;
    for (; i < 60 * 90 && !g.current.exiting; i++) {
      g.step(1 / 60);
      g.frame(1 / 60);
      const c = a.renderer.camera.position;
      const p = g.player;
      maxX = Math.max(maxX, p.x);
      if (![c.x, c.y, c.z, p.x, p.y].every(Number.isFinite)) { bad.push({ i, x: p.x, cam: [c.x, c.y, c.z] }); break; }
    }
    g.input.poll = realPoll;
    return { bad, maxX: +maxX.toFixed(1), exiting: g.current.exiting, frames: i };
  });
  check(run.bad.length === 0, `playthrough: camera and child stay finite (${JSON.stringify(run.bad[0] ?? {})})`);
  check(run.exiting, `playthrough: reaches the exit (max x ${run.maxX} in ${run.frames} frames)`);
  // Wait for the exit transition to finish (software rendering in CI is slow).
  for (let k = 0; k < 60; k++) {
    const done = await page.evaluate(() => { const g = window.__ashfall.game; return !g.current.exiting && g.overlay.fade < 0.05; });
    if (done) break;
    await page.waitForTimeout(500);
  }

  // Save and continue: pass a checkpoint, collect the memory, reload, and resume there.
  await page.keyboard.press('Backquote'); // debug off
  const teleport = (x) => page.evaluate((x) => { const a = window.__ashfall; a.player.x = x; a.player.y = a.terrain.heightAt(x); a.rig.snap(a.player); }, x);
  await teleport(18.0);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  await teleport(27);
  await page.waitForTimeout(300);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ashfall.save.v1')));
  check(saved?.level === 'L00' && saved.checkpoint === 0, `save: checkpoint recorded (${JSON.stringify(saved)})`);
  check(saved?.memories?.includes('L00:rabbit'), 'save: memory collected and saved');
  await page.reload();
  await page.waitForFunction(() => window.__ashfall);
  await page.waitForTimeout(300);
  const resumed = await state(page);
  check(Math.abs(resumed.x - 26) < 0.5, `continue: reload resumes at the checkpoint (x ${resumed.x})`);

  // Exit: walking past the exit fades out and loads the next level (L00 loops to itself for now).
  await teleport(111.5);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyD');
  const fading = await page.evaluate(() => window.__ashfall.game.overlay.fade);
  check(fading > 0.2, `exit: fade to black starts (${fading.toFixed(2)})`);
  await page.waitForTimeout(3500);
  const next = await state(page);
  check(next.x < 5, `exit: next level loads at its spawn (x ${next.x})`);
  await page.screenshot({ path: join(outDir, 'desktop-after-exit.png') });

  check(errors.length === 0, `desktop: no page errors ${errors.join(' | ')}`);
  await browser.close();
}

server.close();
process.exit(failed ? 1 : 0);
