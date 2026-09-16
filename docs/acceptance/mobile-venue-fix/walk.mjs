/* FINAL MOBILE VENUE FIX (Owner, 16 Sep 2026) — the homepage's venue aerial on a phone.
   Before: a wordless 300 px band of the aerial (a desktop crop, no labels) between "The Wedding" and
   "One invitation · one journey", 76 / 96 px of margin around it. After: the venue stage — the real
   aerial, the Owner's seven labels, the legend, the detail — flowing in document order.
   Checks at 320 · 375 · 390 · 393 · 430 (Chromium), 375 · 390 · 430 (WebKit) and 1280 (desktop):
   seven labels, no overlap, no horizontal overflow, heading → aerial 28–40 px, aerial → legend
   20–28 px, section → next section 48–72 px, the image right after the heading, label and legend
   taps open the same detail (Rooms: three markers, one place), no page jump, reduced motion complete.
     node docs/acceptance/mobile-venue-fix/walk.mjs <origin> [outdir] */
import { chromium, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (ok ? '' : ' — ' + d)); };
const MEASURE = () => {
  const v = document.querySelector('.venue'), head = v.querySelector('.venue-head'), stage = v.querySelector('.venue-stage'), img = v.querySelector('.venue-img'), legend = v.querySelector('.venue-legend'), next = v.nextElementSibling, prev = v.previousElementSibling;
  const b = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, w: r.width, h: r.height, x: r.x }; };
  const labels = [...v.querySelectorAll('.venue-label')].map((l) => { const r = l.getBoundingClientRect(); return { zone: l.dataset.zone, text: l.textContent.trim(), x: r.x, y: r.y + scrollY, w: r.width, h: r.height, op: Number(getComputedStyle(l).opacity) }; });
  const overlap = []; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], c = labels[j]; if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) overlap.push(a.zone + '×' + c.zone); }
  const s = b(stage), inside = labels.every((l) => l.x >= s.x - 1 && l.x + l.w <= s.x + s.w + 1 && l.y >= s.top - 1 && l.y + l.h <= s.bottom + 1);
  return { head: b(head), stage: b(stage), img: b(img), legend: b(legend), venue: b(v), next: next ? { text: next.textContent.trim().slice(0, 40), ...b(next) } : null, prev: prev ? b(prev) : null, labels, overlap, inside, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, src: (img.currentSrc || '').split('/').pop(), natural: img.naturalWidth + 'x' + img.naturalHeight, legendItems: v.querySelectorAll('.venue-item').length, imgOp: Number(getComputedStyle(img).opacity) };
};
async function run(engine, w, tag, shot) {
  const b = await engine.launch(); const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: w < 700 ? 2 : 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(ORIGIN + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(400);
  const top = await p.evaluate(() => document.querySelector('.venue').getBoundingClientRect().top + scrollY);
  for (let y = 0; y < top + 200; y += 320) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(90); }
  await p.evaluate((t) => scrollTo(0, t - 60), top); await p.waitForTimeout(4200);
  const m = await p.evaluate(MEASURE);
  const gapHeadAerial = Math.round(m.stage.top - m.head.bottom), gapAerialLegend = Math.round(m.legend.top - m.stage.bottom), gapNext = m.next ? Math.round(m.next.top - m.venue.bottom) : -1, gapPrev = m.prev ? Math.round(m.venue.top - m.prev.bottom) : -1;
  note(tag + ' the real aerial (' + m.src + ' ' + m.natural + ') full width, visible, no horizontal overflow', /souphattra-aerial/.test(m.src) && m.natural !== '0x0' && Math.abs(m.img.w - m.stage.w) < 2 && m.imgOp === 1 && !m.overflow, JSON.stringify({ img: m.img.w, stage: m.stage.w, op: m.imgOp, overflow: m.overflow }));
  note(tag + ' the Owner\'s seven labels on the photograph — Lobby · Rooms ×3 · Wedding Ceremony · Wedding Dinner · Poolside · Coffee & Cake · Breakfast — none colliding, none outside, every one visible', m.labels.length === 7 && m.labels.filter((l) => l.zone === 'rooms').length === 3 && m.overlap.length === 0 && m.inside && m.labels.every((l) => l.op >= 0.6), m.labels.map((l) => l.text).join(' | ') + (m.overlap.length ? ' OVERLAP ' + m.overlap : '') + ' inside=' + m.inside);
  if (w < 700) {
    note(tag + ' heading → aerial ' + gapHeadAerial + ' px (28–40)', gapHeadAerial >= 28 && gapHeadAerial <= 40, gapHeadAerial);
    note(tag + ' aerial → legend ' + gapAerialLegend + ' px (20–28; the caption sits between)', gapAerialLegend >= 20 && gapAerialLegend <= 28, gapAerialLegend);
    note(tag + ' venue section → next section ' + gapNext + ' px (48–72) · previous section → venue ' + gapPrev + ' px', gapNext >= 48 && gapNext <= 72 && gapPrev >= 48 && gapPrev <= 72, gapNext + '/' + gapPrev);
    note(tag + ' no spacer: the stage is exactly the photograph\'s height (' + Math.round(m.stage.h) + ' px for ' + Math.round(m.stage.w) + ' px wide, 4:5 + caption)', Math.abs(m.img.h - m.stage.w * 1440 / 1152) < 3 && m.stage.h - m.img.h < 60, JSON.stringify({ imgH: m.img.h, stageH: m.stage.h }));
  }
  note(tag + ' the seven-item legend directly below the aerial', m.legendItems === 7 && m.legend.top > m.stage.bottom, m.legendItems);
  /* interaction: label tap and legend tap open the same detail; Rooms is one place in three houses; no page jump */
  const y0 = await p.evaluate(() => scrollY);
  await p.evaluate(() => document.querySelector('.venue-label[data-zone="rooms"]').click()); await p.waitForTimeout(700);
  const t1 = await p.evaluate(() => ({ active: document.querySelector('.venue-stage').getAttribute('data-active'), title: document.querySelector('.venue-title').textContent, pressed: [...document.querySelectorAll('.venue-label[data-zone="rooms"]')].map((l) => l.getAttribute('aria-pressed')).join(), item: document.querySelector('.venue-item[data-zone="rooms"]').getAttribute('aria-pressed'), y: scrollY }));
  note(tag + ' tap a Rooms marker → the Rooms detail, all three markers pressed, the legend item pressed, no page jump', t1.active === 'rooms' && /rooms/i.test(t1.title) && t1.pressed === 'true,true,true' && t1.item === 'true' && Math.abs(t1.y - y0) < 2, JSON.stringify(t1));
  await p.evaluate(() => document.querySelector('.venue-item[data-zone="coffee"]').click()); await p.waitForTimeout(700);
  const t2 = await p.evaluate(() => ({ active: document.querySelector('.venue-stage').getAttribute('data-active'), title: document.querySelector('.venue-title').textContent, lbl: document.querySelector('.venue-label[data-zone="coffee"]').getAttribute('aria-pressed'), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  note(tag + ' tap the legend item Coffee & Cake → the same detail as its marker, the marker pressed, no horizontal scroll', t2.active === 'coffee' && /Coffee & Cake/.test(t2.title) && t2.lbl === 'true' && !t2.overflow, JSON.stringify(t2));
  await p.evaluate(() => document.querySelector('.venue-item[data-zone="pool"]').click()); await p.waitForTimeout(500);
  const t3 = await p.evaluate(() => ({ title: document.querySelector('.venue-title').textContent, pressed: document.querySelectorAll('.venue-label[aria-pressed="true"]').length }));
  note(tag + ' a legend place without a marker (the swimming pool) opens its detail from the legend', /swimming pool/i.test(t3.title) && t3.pressed === 0, JSON.stringify(t3));
  note(tag + ' no page errors', errs.length === 0, errs.join(' | '));
  if (shot && OUT) { await p.evaluate((t) => scrollTo(0, t - 24), top); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, shot), fullPage: false }); }
  await b.close();
  /* reduced motion: everything simply there */
  const rb = await engine.launch(); const rc = await rb.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, reducedMotion: 'reduce', isMobile: w < 700 }); const rp = await rc.newPage();
  await rp.goto(ORIGIN + '/index.html', { waitUntil: 'load' }); await rp.evaluate(() => document.getElementById('venue').scrollIntoView({ block: 'start' })); await rp.waitForTimeout(400);
  const rm = await rp.evaluate(() => ({ cls: document.documentElement.classList.contains('m-reduced'), stageIn: document.querySelector('.venue-stage').classList.contains('is-in'), labels: [...document.querySelectorAll('.venue-label')].map((l) => Number(getComputedStyle(l).opacity)), img: getComputedStyle(document.querySelector('.venue-img')).opacity, title: (document.querySelector('.venue-title') || {}).textContent || '' }));
  note(tag + ' reduced motion · the stage, the seven labels, the detail — all simply there', rm.cls && rm.stageIn && rm.labels.length === 7 && rm.labels.every((o) => o >= 0.6) && rm.img === '1' && /Wedding Dinner/.test(rm.title), JSON.stringify(rm));
  await rb.close();
}
for (const w of [320, 375, 390, 393, 430]) await run(chromium, w, 'C' + w, [320, 375, 390, 430].includes(w) ? w + '.png' : null);
for (const w of [375, 390, 430]) await run(webkit, w, 'W' + w, w === 390 ? 'webkit-390.png' : null);
await run(chromium, 1280, 'D1280', 'desktop-1280.png');
const pass = R.filter((r) => r.ok).length; console.log('\n' + pass + '/' + R.length + ' checks passed');
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 2));
process.exit(pass === R.length ? 0 : 1);
