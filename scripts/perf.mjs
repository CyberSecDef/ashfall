// Frame-time measurement: GPU Chromium at iPhone resolution, and SwiftShader
// (software rendering) as a slow-device proxy. Prints per-scene averages.
// Usage: npm run build && node scripts/perf.mjs [gpu|cpu|both]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const mode = process.argv[2] ?? 'both';
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
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
const url = `http://localhost:${server.address().port}/`;

const scenes = [
  ['L01', 1, 'shelter'],
  ['L01', 22, 'woods crest'],
  ['L02', 57, 'searchlight street'],
  ['L03', 12, 'drone sheds'],
];

async function measure(label, args) {
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ashfall);
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const e = gl?.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`\n${label}: ${renderer}`);
  for (const [level, x, name] of scenes) {
    const r = await page.evaluate(async ({ level, x }) => {
      const a = window.__ashfall;
      const g = a.game;
      g.load(level, -1);
      g.overlay.fade = 0;
      document.getElementById('title').style.display = 'none';
      a.player.place(x);
      a.rig.snap(a.player);
      await new Promise((r) => setTimeout(r, 7000)); // long enough for the quality tier to settle
      const times = [];
      let last = performance.now();
      await new Promise((done) => {
        const tick = (t) => {
          times.push(t - last);
          last = t;
          if (times.length < 240) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
      times.sort((p, q) => p - q);
      const avg = times.reduce((s, v) => s + v, 0) / times.length;
      return { avg, p95: times[Math.floor(times.length * 0.95)], dpr: a.renderer.three.getPixelRatio(), tier: g.quality?.tier ?? '-', draws: g.sceneDraws };
    }, { level, x });
    console.log(`  ${name.padEnd(20)} avg ${r.avg.toFixed(1)} ms (${(1000 / r.avg).toFixed(0)} fps)  p95 ${r.p95.toFixed(1)} ms  dpr ${r.dpr}  tier ${r.tier}  draws ${r.draws}`);
  }
  await browser.close();
}

if (mode !== 'cpu') await measure('GPU (iPhone 15 resolution)', ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu']);
if (mode !== 'gpu') await measure('Software renderer (slow-device proxy)', []);
server.close();
