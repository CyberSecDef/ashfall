import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const server = createServer(async (req, res) => { const p = join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]); try { res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(p)] ?? 'application/octet-stream' }); res.end(await readFile(p)); } catch { res.writeHead(404).end(); } });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 });
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.__ashfall);
await page.evaluate(() => { const g = window.__ashfall.game; g.load('L02', -1); g.overlay.fade = 0; document.getElementById('title').style.display = 'none'; window.__ashfall.player.place(57); window.__ashfall.rig.snap(window.__ashfall.player); });
const variants = [
  ['baseline', () => {}],
  ['no overlay', () => { const g = window.__ashfall.game; g.__ov = g.overlay.render; g.overlay.render = () => {}; }],
  ['no sky', () => { window.__ashfall.game.sky.mesh.visible = false; }],
  ['no ash', () => { window.__ashfall.game.ash.points.visible = false; }],
  ['dpr 1.5', () => { const r = window.__ashfall.renderer; r.three.setPixelRatio(1.5); r.resize(); }],
  ['dpr 1', () => { const r = window.__ashfall.renderer; r.three.setPixelRatio(1); r.resize(); }],
];
for (const [name, fn] of variants) {
  await page.evaluate(`(${fn})()`);
  await page.waitForTimeout(800);
  const avg = await page.evaluate(() => new Promise((done) => { const ts = []; let last = performance.now(); const tick = (t) => { ts.push(t - last); last = t; if (ts.length < 120) requestAnimationFrame(tick); else done(ts.reduce((s, v) => s + v, 0) / ts.length); }; requestAnimationFrame(tick); }));
  console.log(name.padEnd(12), avg.toFixed(1), 'ms');
}
await b.close(); server.close();
