// Record the sandbox showcase video: frame-exact capture of a scripted
// playthrough, encoded with ffmpeg. Uses the GPU through ANGLE if available.
// Usage: npm run build && node scripts/record.mjs [out.mp4] [width] [height]

import { createServer } from 'node:http';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const out = resolve(process.argv[2] ?? 'ashfall-sandbox.mp4');
const width = Number(process.argv[3] ?? 1920);
const height = Number(process.argv[4] ?? 1080);
const FPS = 30;
const framesDir = resolve('smoke-out/frames');

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const p = join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  try {
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.__ashfall);
await page.evaluate(() => {
  window.__ashfallManual = true;
  localStorage.clear();
});
await page.addScriptTag({ content: await readFile(resolve('scripts/video/director.js'), 'utf8') });

let frame = 0;
const t0 = Date.now();
for (;;) {
  const s = await page.evaluate(() => {
    const g = window.__ashfall.game;
    const d = window.__director;
    for (let k = 0; k < 2; k++) {
      d.tick(1 / 60);
      g.step(1 / 60);
    }
    g.frame(1 / 30);
    const p = g.current.controlled;
    const warn = window.__dirWarn.splice(0);
    return { done: d.done, step: d.step, x: p.x, deaths: g.deaths, warn };
  });
  await page.screenshot({ path: join(framesDir, `${String(frame).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 92 });
  frame++;
  for (const w of s.warn) console.log(`WARN at ${(frame / FPS).toFixed(1)}s: ${w}`);
  if (frame % 150 === 0) console.log(`${(frame / FPS).toFixed(0)}s  step ${s.step}  x ${s.x.toFixed(1)}  deaths ${s.deaths}  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  if (s.done || frame > FPS * 420) break;
}
const deaths = await page.evaluate(() => window.__ashfall.game.deaths);
await browser.close();
server.close();
console.log(`captured ${frame} frames (${(frame / FPS).toFixed(1)} s), deaths ${deaths}; encoding...`);

await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(framesDir, '%06d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  ff.on('exit', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));
});
console.log(`wrote ${out}`);
