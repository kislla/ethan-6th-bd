// Browser checks for the invitation page: node tests/check.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.ics': 'text/calendar' };

const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const SCRIPT = 'https://script.google.com/macros/s/TEST/exec';

const browser = await chromium.launch();
let failures = 0;

async function check(name, fn) {
  try { await fn(); console.log('  ok  ', name); }
  catch (e) { failures++; console.log('  FAIL', name, '\n       ', e.message.split('\n')[0]); }
}

async function open({ width = 390, height = 844, scriptUrl = '', onScript } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.route(/maps\.google\.com/, r => r.fulfill({ contentType: 'text/html', body: '<p>map</p>' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (scriptUrl) {
    await page.route('**/config.js', async r => {
      const src = fs.readFileSync(path.join(root, 'config.js'), 'utf8').replace("scriptUrl: ''", `scriptUrl: '${scriptUrl}'`);
      await r.fulfill({ contentType: 'text/javascript', body: src });
    });
  }
  if (onScript) await page.route(/script\.google\.com/, onScript);
  await page.goto(base);
  return { ctx, page };
}

console.log('Layout');
for (const [w, h] of [[360, 740], [390, 844], [1280, 900]]) {
  await check(`no horizontal scroll at ${w}px`, async () => {
    const { ctx, page } = await open({ width: w, height: h });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= w, `scrollWidth ${sw} > ${w}`);
    await ctx.close();
  });
}

await check('all sections, RTL and countdown present', async () => {
  const { ctx, page } = await open();
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  for (const id of ['details', 'fun', 'rsvp', 'gift', 'map']) assert.ok(await page.isVisible('#' + id), id);
  await page.waitForTimeout(1100);
  const days = await page.textContent('[data-unit="d"]');
  assert.match(days, /^\d+$/);
  assert.ok(await page.isVisible('text=יום שלישי'));
  await ctx.close();
});

await check('PayBox link falls back to the built-in link', async () => {
  const { ctx, page } = await open();
  assert.equal(await page.getAttribute('#paybox-link', 'href'), 'https://links.payboxapp.com/uVBBWkJYQ7b');
  await ctx.close();
});

console.log('Form (preview mode)');
await check('empty submit shows both errors and sends nothing', async () => {
  const { ctx, page } = await open();
  await page.click('.btn-submit');
  assert.ok(await page.isVisible('#name-error'));
  assert.ok(await page.isVisible('#allergies-error'));
  assert.ok(await page.isVisible('#rsvp-form'));
  await page.fill('#child-name', 'נועה');
  assert.ok(await page.isHidden('#name-error'));
  await ctx.close();
});

await check('allergy details show only for "כן"', async () => {
  const { ctx, page } = await open();
  assert.ok(await page.isHidden('#details-field'));
  await page.click('.toggle label:has-text("כן")');
  assert.ok(await page.isVisible('#details-field'));
  await page.fill('#allergy-details', 'בוטנים');
  await page.click('.toggle label:has-text("לא")');
  assert.ok(await page.isHidden('#details-field'));
  assert.equal(await page.inputValue('#allergy-details'), '');
  await ctx.close();
});

await check('preview submit shows thank-you with name and preview note, then resets', async () => {
  const { ctx, page } = await open();
  await page.fill('#child-name', 'יואב');
  await page.click('.toggle label:has-text("לא")');
  await page.click('.btn-submit');
  await page.waitForSelector('#rsvp-done:not([hidden])');
  assert.equal(await page.textContent('#done-name'), 'יואב');
  assert.ok(await page.isVisible('#preview-note'));
  await page.click('#rsvp-again');
  assert.ok(await page.isVisible('#rsvp-form'));
  assert.equal(await page.inputValue('#child-name'), '');
  await ctx.close();
});

console.log('Form (connected to the script)');
await check('submit posts name/allergies/details and reads PayBox from the sheet', async () => {
  const posts = [];
  const { ctx, page } = await open({
    scriptUrl: SCRIPT,
    onScript: async r => {
      const req = r.request();
      if (req.method() === 'GET') {
        return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ paybox: 'https://links.payboxapp.com/NEWLINK' }) });
      }
      posts.push(req.postData());
      return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
    },
  });
  await page.waitForFunction(() => document.getElementById('paybox-link').href.includes('NEWLINK'));
  await page.fill('#child-name', 'מאיה כהן');
  await page.click('.toggle label:has-text("כן")');
  await page.fill('#allergy-details', 'אגוזים');
  await page.click('.btn-submit');
  await page.waitForSelector('#rsvp-done:not([hidden])');
  assert.ok(await page.isHidden('#preview-note'));
  assert.equal(posts.length, 1);
  const body = new URLSearchParams(posts[0]);
  assert.equal(body.get('name'), 'מאיה כהן');
  assert.equal(body.get('allergies'), 'yes');
  assert.equal(body.get('details'), 'אגוזים');
  await ctx.close();
});

await check('network failure shows an error and keeps what was typed', async () => {
  const { ctx, page } = await open({
    scriptUrl: SCRIPT,
    onScript: r => r.request().method() === 'GET'
      ? r.fulfill({ contentType: 'application/json', body: '{}' })
      : r.abort('internetdisconnected'),
  });
  await page.fill('#child-name', 'דניאל');
  await page.click('.toggle label:has-text("לא")');
  await page.click('.btn-submit');
  await page.waitForSelector('#form-error:not([hidden])');
  assert.equal(await page.inputValue('#child-name'), 'דניאל');
  assert.ok(await page.isEnabled('.btn-submit'));
  await ctx.close();
});

await browser.close();
server.close();
console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
