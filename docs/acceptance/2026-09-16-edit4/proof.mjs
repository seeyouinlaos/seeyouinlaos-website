/* EDIT 4 + MOBILE LIVE FIX — the live proof (Owner, 16 Sep 2026). Fetches the served bytes of the changed files from
   an origin and compares them with the tree, then renders fresh screenshots: the homepage venue section on a phone
   (390, from the heading through the next section) with the measured gaps, the desktop venue section, the Cafés rail
   with Harudot, the stays overview with the self-pay copy. Prints counts; writes proof.json.
     node docs/acceptance/2026-09-16-edit4/proof.mjs <origin> <outdir> */
import { chromium, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
const R = {}; const note = (k, ok, d) => { R[k] = { ok: !!ok, d }; console.log((ok ? 'PASS ' : 'FAIL ') + k + ' — ' + d); };
/* 1 · the served bytes */
const FILES = ['index.html', 'accommodation.html', 'journeys.html', 'experiences.html', 'assets/venue.css', 'assets/venue.js', 'assets/venue-data.js', 'assets/aman.css'];
let same = 0; for (const f of FILES) { const live = Buffer.from(await (await fetch(O + '/' + f + '?p=' + Date.now(), { cache: 'no-store' })).arrayBuffer()); const local = fs.readFileSync(path.join(ROOT, f)); if (sha(live) === sha(local)) same++; else console.log('  differs: ' + f); }
note('served bytes', same === FILES.length, same + '/' + FILES.length + ' changed files byte-identical to the tree');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const liveHtml = await (await fetch(O + '/index.html?p=' + Date.now(), { cache: 'no-store' })).text();
const refs = liveHtml.match(/(?:href|src)="assets\/[^"?]+\?v=[0-9a-f]{8}"/g) || [];
note('live HTML references fingerprinted assets', refs.length >= 8 && refs.every((r) => html.includes(r)), refs.length + ' fingerprinted references, all current');
/* 2 · the phone: the homepage venue section */
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const p = await c.newPage();
await p.goto(O + '/index.html?p=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(400);
const top = await p.evaluate(() => document.querySelector('.venue').getBoundingClientRect().top + scrollY);
for (let y = 0; y < top + 200; y += 320) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(80); }
await p.evaluate((t) => scrollTo(0, t - 40), top); await p.waitForTimeout(4200);
const m = await p.evaluate(() => {
  const v = document.querySelector('.venue'), prev = v.previousElementSibling, next = v.nextElementSibling, head = v.querySelector('.venue-head'), h2 = v.querySelector('h2'), img = v.querySelector('.venue-img'), legend = v.querySelector('.venue-legend'), detail = v.querySelector('.venue-detail');
  const b = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
  const labels = [...v.querySelectorAll('.venue-label')].map((l) => ({ zone: l.dataset.zone, op: Number(getComputedStyle(l).opacity), r: l.getBoundingClientRect() }));
  const overlap = labels.some((a, i) => labels.some((c, j) => j > i && a.r.x < c.r.x + c.r.width && c.r.x < a.r.x + a.r.width && a.r.y < c.r.y + c.r.height && c.r.y < a.r.y + a.r.height));
  const nextEyebrow = next.querySelector('.a-eyebrow');
  return { prevLink: (prev.querySelector('.a-link') || {}).textContent, prevBottom: b(prev).bottom, headTop: b(head).top, h2: h2.textContent, h2Bottom: b(h2).bottom, headBottom: b(head).bottom, img: b(img), imgOp: Number(getComputedStyle(img).opacity), src: (img.currentSrc || '').split('/').pop(), legend: b(legend), detail: b(detail), venueBottom: b(v).bottom, nextTop: b(next).top, nextEyebrow: nextEyebrow ? nextEyebrow.textContent : '', nextEyebrowTop: nextEyebrow ? b(nextEyebrow).top : 0, labels: labels.map((l) => l.zone), labelsVisible: labels.filter((l) => l.op >= 0.6).length, overlap, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, legendItems: v.querySelectorAll('.venue-item').length, vh: innerHeight };
});
const gapHeadingAerial = m.img.top - m.headBottom, gapEndNext = m.nextEyebrowTop - m.venueBottom, gapBefore = m.headTop - m.prevBottom;
note('phone · the aerial visible right after the venue heading (' + m.src + ')', m.imgOp === 1 && /souphattra-aerial/.test(m.src) && gapHeadingAerial >= 24 && gapHeadingAerial <= 48, 'heading → aerial ' + gapHeadingAerial + ' px (target 24–48) · aerial ' + m.img.w + '×' + m.img.h);
note('phone · seven Owner mappings on the aerial, visible, none colliding', m.labels.length === 7 && m.labelsVisible === 7 && !m.overlap && m.legendItems === 7, m.labels.join(',') + ' · visible ' + m.labelsVisible + ' · legend ' + m.legendItems);
note('phone · giant top gap 0', gapBefore < m.vh / 2 && gapHeadingAerial < m.vh / 2, 'previous section → venue heading ' + gapBefore + ' px · heading → aerial ' + gapHeadingAerial + ' px (half a viewport = ' + Math.round(m.vh / 2) + ')');
note('phone · giant bottom gap 0 · venue end → next section eyebrow "' + m.nextEyebrow + '"', gapEndNext >= 40 && gapEndNext <= 80, gapEndNext + ' px (target 40–80)');
note('phone · horizontal overflow 0', !m.overflow, String(m.overflow));
/* the screenshot: from the heading through the next section, as one tall capture */
const from = m.headTop - 24, to = m.nextEyebrowTop + 140;
await p.evaluate((y) => scrollTo(0, y), from); await p.waitForTimeout(600);
await p.screenshot({ path: path.join(OUT, 'mobile-390-venue.png'), fullPage: true, clip: { x: 0, y: from, width: 390, height: to - from } });
await p.evaluate((y) => scrollTo(0, y), m.img.top - 120); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, 'mobile-390-aerial-viewport.png') });
await c.close();
/* 3 · desktop venue */
const d = await b.newContext({ viewport: { width: 1280, height: 900 } }); const dp = await d.newPage();
await dp.goto(O + '/index.html?p=' + Date.now(), { waitUntil: 'load' }); const dtop = await dp.evaluate(() => document.querySelector('.venue').getBoundingClientRect().top + scrollY);
for (let y = 0; y < dtop + 200; y += 400) { await dp.evaluate((y) => scrollTo(0, y), y); await dp.waitForTimeout(60); } await dp.evaluate((t) => scrollTo(0, t - 30), dtop); await dp.waitForTimeout(4000);
const dm = await dp.evaluate(() => ({ labels: document.querySelectorAll('.venue-label').length, vis: [...document.querySelectorAll('.venue-label')].filter((l) => Number(getComputedStyle(l).opacity) >= 0.6).length }));
note('desktop · seven labels on the stage', dm.labels === 7 && dm.vis === 7, dm.labels + '/' + dm.vis);
await dp.screenshot({ path: path.join(OUT, 'desktop-1280-venue.png') });
/* 4 · Cafés with Harudot */
await dp.goto(O + '/experiences.html?p=' + Date.now(), { waitUntil: 'load' }); await dp.waitForTimeout(500);
const cafes = await dp.evaluate(() => { const rails = [...document.querySelectorAll('.x-rail')]; const bkk = rails.find((r) => r.getAttribute('data-rail') === 'bkk:cafe'); const names = bkk ? [...bkk.querySelectorAll('h3:not(.a-eyebrow)')].map((h) => h.textContent) : []; const harudotRails = rails.filter((r) => /Harudot/.test(r.textContent)).map((r) => r.getAttribute('data-rail') + ' · ' + r.querySelector('.a-eyebrow').textContent); return { heading: bkk ? bkk.querySelector('.a-eyebrow').textContent : '', names, harudotRails, card: (() => { const h = [...document.querySelectorAll('h3')].find((x) => x.textContent === 'Harudot'); return h ? h.previousElementSibling.textContent : ''; })() }; });
note('Cafés · Harudot in the existing Bangkok Cafés rail, once, as Bangkok · Café', cafes.heading === 'Cafés · 5' && cafes.names.includes('Harudot') && cafes.harudotRails.length === 1 && cafes.card === 'Bangkok · Café', cafes.heading + ' [' + cafes.names.join(', ') + '] · rails with Harudot: ' + cafes.harudotRails.join(' | ') + ' · card ' + cafes.card);
await dp.evaluate(() => document.querySelector('[data-rail="bkk:cafe"]').scrollIntoView({ block: 'start' })); await dp.waitForTimeout(700);
await dp.evaluate(() => { const t = document.querySelector('[data-rail="bkk:cafe"] .atrk'); t.scrollLeft = t.scrollWidth; }); await dp.waitForTimeout(600);
await dp.screenshot({ path: path.join(OUT, 'experiences-cafes-harudot.png') });
/* 5 · stays: self-pay */
await dp.goto(O + '/accommodation.html?p=' + Date.now(), { waitUntil: 'load' }); await dp.waitForTimeout(500);
const stays = await dp.evaluate(() => [...document.querySelectorAll('.sc')].map((e) => e.textContent).filter((t) => /Lijiang · 2|Bangkok · 2/.test(t)));
note('Stays · Luye Baisha and Siam Kempinski say self-pay', stays.length === 2 && stays.every((t) => /breakfast included · self-pay$/.test(t)), stays.join(' | '));
await dp.evaluate(() => { const e = [...document.querySelectorAll('.sn')].find((x) => x.textContent === 'Luye Baisha'); e.scrollIntoView({ block: 'center' }); }); await dp.waitForTimeout(600);
await dp.screenshot({ path: path.join(OUT, 'stays-self-pay.png') });
await d.close(); await b.close();
/* 6 · WebKit phone: the same venue measure */
const wb = await webkit.launch(); const wc = await wb.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const wp = await wc.newPage();
await wp.goto(O + '/index.html?p=' + Date.now(), { waitUntil: 'load' }); const wtop = await wp.evaluate(() => document.querySelector('.venue').getBoundingClientRect().top + scrollY);
for (let y = 0; y < wtop + 200; y += 320) { await wp.evaluate((y) => scrollTo(0, y), y); await wp.waitForTimeout(80); } await wp.evaluate((t) => scrollTo(0, t - 40), wtop); await wp.waitForTimeout(4200);
const wm = await wp.evaluate(() => { const v = document.querySelector('.venue'); const labels = [...v.querySelectorAll('.venue-label')].filter((l) => Number(getComputedStyle(l).opacity) >= 0.6).length; const img = v.querySelector('.venue-img'); return { labels, imgOp: Number(getComputedStyle(img).opacity), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
note('WebKit phone · seven labels visible, the aerial visible, no overflow', wm.labels === 7 && wm.imgOp === 1 && !wm.overflow, JSON.stringify(wm));
await wp.evaluate((y) => scrollTo(0, y), from); await wp.waitForTimeout(500); await wp.screenshot({ path: path.join(OUT, 'webkit-390-venue.png') });
await wb.close();
fs.writeFileSync(path.join(OUT, 'proof.json'), JSON.stringify({ origin: O, at: new Date().toISOString(), measures: m, results: R }, null, 2));
const ok = Object.values(R).every((r) => r.ok); console.log(ok ? 'LIVE PROOF: PASS' : 'LIVE PROOF: FAIL'); process.exit(ok ? 0 : 1);
