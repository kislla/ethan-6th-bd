// Quick screenshots for review: node tests/shot.mjs [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] || path.join(root, 'tests', 'shots');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.ics': 'text/calendar' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'he-IL' });
const page = await ctx.newPage();
// Preview mode: never write screenshot submissions to the real sheet.
await page.route(/\/config\.js(\?|$)/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'config.js'), 'utf8').replace(/scriptUrl: '[^']*'/, "scriptUrl: ''") }));
await page.route(/maps\.google\.com/, r => r.fulfill({ contentType: 'text/html', body: '<body style="margin:0;display:grid;place-items:center;height:100vh;background:#e8eef9;font:16px sans-serif;color:#4a5578">מפה</body>' }));
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(out, 'phone-first-screen.png') });
await page.screenshot({ path: path.join(out, 'phone-full.png'), fullPage: true });
await page.fill('#child-name', 'נועה');
await page.click('.toggle label:has-text("כן")');
await page.fill('#allergy-details', 'בוטנים');
await page.locator('#rsvp').screenshot({ path: path.join(out, 'phone-form-filled.png') });
await page.click('.btn-submit');
await page.waitForSelector('#rsvp-done:not([hidden])');
await page.waitForTimeout(700);
await page.locator('#rsvp').screenshot({ path: path.join(out, 'phone-thanks.png') });
await browser.close();
server.close();
console.log('saved to', out);
