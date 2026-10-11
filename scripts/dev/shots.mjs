// Dev helper: screenshots of dist/ at several x positions, iPhone landscape (WebKit).
// Usage: node scripts/dev/shots.mjs [outDir] [x1,x2,...]
import { webkit, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
const root = resolve('dist');
const out = resolve(process.argv[2] ?? 'smoke-out');
const xs = (process.argv[3] ?? '5,20,35,50,64').split(',').map(Number);
const server = createServer(async (req, res) => { const f = join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]); try { res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(f)] }); res.end(await readFile(f)); } catch { res.writeHead(404).end(); } });
await new Promise((r) => server.listen(0, r));
const b = await webkit.launch();
const p = await (await b.newContext({ ...devices['iPhone 15 Pro landscape'] })).newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(`http://localhost:${server.address().port}/`);
await p.waitForFunction(() => window.__ashfall);
for (const x of xs) {
  await p.evaluate((x) => { const a = window.__ashfall; a.player.x = x; a.player.y = a.terrain.heightAt(x); a.player.grounded = true; a.rig.snap(a.player); a.child.resetScarf(); }, x);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: join(out, `x${x}.png`) });
}
await b.close();
server.close();
console.log('shots:', xs.join(','));
