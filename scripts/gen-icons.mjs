// Render the app icons (PWA, apple-touch-icon, favicon) from scripts/assets/icon.svg.
// Usage: node scripts/gen-icons.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const svg = await readFile(resolve('scripts/assets/icon.svg'), 'utf8');
const b = await chromium.launch();
const page = await b.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0], ['favicon-32.png', 32, 0]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#0d0f0e;display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: resolve('public/icons', name), omitBackground: false });
  console.log('wrote', name);
}
await b.close();
