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
  check(errors.length === 0, `desktop: no page errors ${errors.join(' | ')}`);
  await browser.close();
}

server.close();
process.exit(failed ? 1 : 0);
