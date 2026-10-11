import { webkit, chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const root = '/home/rweber/Git/ashfall/dist';
const server = createServer(async (req, res) => { const f = join(root, req.url === '/' ? 'index.html' : req.url); try { res.writeHead(200, {'content-type': {'.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(f)]}); res.end(await readFile(f)); } catch { res.writeHead(404).end(); } });
await new Promise(r => server.listen(5199, r));
for (const bt of [chromium, webkit]) {
  const b = await bt.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log(bt.name(), 'PAGEERROR', e.message, e.stack?.split('\n').slice(0,3).join(' | ')));
  p.on('console', m => m.type() === 'error' || m.type()==='warning' ? console.log(bt.name(), m.type(), m.text().slice(0,300)) : 0);
  await p.goto('http://localhost:5199/'); await p.waitForTimeout(2000); await b.close();
}
server.close();
