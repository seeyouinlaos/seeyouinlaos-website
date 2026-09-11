/* FINAL RUN · link / asset crawl of every guest-facing page.
   node docs/acceptance/2026-09-11-final-run/crawl.mjs [origin] [out.json]
   Follows same-origin links from index.html; every page is rendered in a real
   browser so lazily requested assets, fonts and console errors are seen. */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || 'crawl.json';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const failures = [];   // {page, url, status}
const consoleErrors = [];
const seen = new Set(); const queue = ['index.html'];
const anchorsMissing = [];
const requested = new Set();
page.on('response', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN)) return; requested.add(u); if (r.status() >= 400) failures.push({ page: page.url(), url: u, status: r.status() }); });
page.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(ORIGIN)) failures.push({ page: page.url(), url: u, status: 'FAILED ' + (r.failure() || {}).errorText }); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ page: page.url(), text: m.text().slice(0, 200) }); });
page.on('pageerror', (e) => consoleErrors.push({ page: page.url(), text: 'PAGEERROR ' + e.message.slice(0, 200) }));
const pages = [];
while (queue.length) {
  const rel = queue.shift(); if (seen.has(rel)) continue; seen.add(rel);
  const url = ORIGIN + '/' + rel;
  const resp = await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => ({ status: () => 'ERR ' + e.message }));
  const status = resp.status();
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
    const missing = links.filter((h) => h.startsWith('#') && h.length > 1 && !ids.has(h.slice(1)));
    const title = document.title;
    const imgs = [...document.images].filter((i) => i.getAttribute('src') && (!i.complete || i.naturalWidth === 0)).map((i) => i.getAttribute('src'));
    return { links, missing, title, brokenImgs: imgs, h1: (document.querySelector('h1') || {}).textContent };
  });
  pages.push({ page: rel, status, title: info.title, brokenImgs: info.brokenImgs, missingAnchors: info.missing });
  for (const h of info.links) {
    if (!h || h.startsWith('#') || /^(mailto|tel|javascript|https?):/.test(h)) continue;
    const clean = h.split('#')[0].split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (/\.html$/.test(clean) || clean === '' || /\/$/.test(clean)) { const target = clean === '' ? 'index.html' : (clean.endsWith('/') ? clean + 'index.html' : clean); if (!seen.has(target)) queue.push(target); }
  }
  /* cross-page anchors: page.html#id */
  for (const h of info.links) { const m = h.match(/^([\w-]+\.html)#([\w-]+)$/); if (m) anchorsMissing.push({ from: rel, to: m[1], id: m[2] }); }
}
/* verify cross-page anchors */
const crossMissing = [];
for (const a of anchorsMissing) { await page.goto(ORIGIN + '/' + a.to, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(500); const ok = await page.evaluate((id) => !!document.getElementById(id), a.id); if (!ok) crossMissing.push(a); }
const external = [...requested].filter(() => false);
const result = { origin: ORIGIN, pages, failures, consoleErrors, crossMissing, requestedCount: requested.size, resort01Requested: [...requested].some((u) => /resort-01\.jpg/.test(u)) };
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('pages crawled: ' + pages.length + ' · http failures: ' + failures.length + ' · console errors: ' + consoleErrors.length + ' · missing anchors: ' + pages.reduce((n, p) => n + p.missingAnchors.length, 0) + ' · cross-page anchors missing: ' + crossMissing.length + ' · broken imgs: ' + pages.reduce((n, p) => n + p.brokenImgs.length, 0) + ' · resort-01 requested: ' + result.resort01Requested);
for (const p of pages) if (p.status !== 200 || p.missingAnchors.length || p.brokenImgs.length) console.log('  ' + p.page + ' → ' + p.status + (p.missingAnchors.length ? ' missing anchors ' + p.missingAnchors.join(',') : '') + (p.brokenImgs.length ? ' broken imgs ' + p.brokenImgs.join(',') : ''));
for (const f of failures) console.log('  FAIL ' + f.status + ' ' + f.url + ' (on ' + f.page.replace(ORIGIN, '') + ')');
for (const c of consoleErrors) console.log('  CONSOLE ' + c.page.replace(ORIGIN, '') + ': ' + c.text);
for (const c of crossMissing) console.log('  CROSS-ANCHOR ' + c.from + ' → ' + c.to + '#' + c.id);
console.log('pages: ' + pages.map((p) => p.page).join(' '));
await browser.close();
