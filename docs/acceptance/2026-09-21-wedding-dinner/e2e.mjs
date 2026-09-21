/* THE WEDDING DINNER · ONE DETAIL — E2E on the stage (Owner, 21 Sep 2026), real WebKit / iPhone 13 at phone widths, Chromium above.
   Public page (The Wedding = voyage.html): no sign-in, no guest state. node docs/acceptance/2026-09-21-wedding-dinner/e2e.mjs <scratchpad> <outDir> [origin] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 1200) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 220 : 1200)); };
const b = await chromium.launch(); const wk = await webkit.launch(); const errors = new Map();
const fresh = async (w) => { const ctx = await (w <= 430 ? wk : b).newContext(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: 844 } }) : { viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(w + ' ' + e.message, 1)); p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.set(w + ' ' + m.text(), 1); }); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });

for (const w of [320, 390, 834, 1440]) {
  const p = await fresh(w); await p.goto(O + '/voyage.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const s = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('#dinner')]; const titles = [...document.querySelectorAll('h2')].filter((h) => /^Wedding Dinner$/.test(h.innerText.trim()));
    const gal = document.querySelector('[data-wedding-dinner-gallery]'); const row = gal ? gal.closest('.refgal') || gal.parentElement.querySelector('.refgal') || gal : null;
    const car = document.querySelector('[data-wedding-dinner-media] .refgal, [data-wedding-dinner-media] .acar, [data-wedding-dinner-media]');
    const slides = document.querySelectorAll('[data-wedding-dinner-media] .aslide');
    const eyebrow = (document.querySelector('#dinner .a-eyebrow') || {}).innerText || '';
    const dress = document.querySelector('#dinner a[href*="dress-code"]');
    const count = (document.querySelector('[data-wedding-dinner-media] .refgal-count') || {}).innerText || '';
    const arrows = document.querySelectorAll('[data-wedding-dinner-media] [data-a="prev"], [data-wedding-dinner-media] [data-a="next"]').length;
    const rail = document.querySelector('[data-wedding-dinner-media] .arail');
    const first = document.querySelector('[data-wedding-dinner-media] .aslide');
    const text = document.querySelector('#dinner').parentElement.innerText;
    const dinnerTitles = (text.match(/Wedding Dinner/g) || []).length;
    const playPause = document.querySelectorAll('[data-wedding-dinner-media] [data-clip-play], [data-wedding-dinner-media] button[aria-label*="ause"], [data-wedding-dinner-media] button[aria-label*="lay"]').length;
    const left = document.querySelector('#dinner .ac').getBoundingClientRect().left;
    return { anchors: secs.length, titles: titles.length, eyebrow, dress: !!dress, slides: slides.length, count, arrows, rail: !!rail, firstLeft: first ? Math.round(first.getBoundingClientRect().left) : null, contentLeft: Math.round(left), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, playPause, srcs: [...document.querySelectorAll('[data-wedding-dinner-media] img')].map((i) => i.getAttribute('src').split('/').pop()) };
  });
  await p.evaluate(() => document.querySelector('[data-wedding-dinner-media]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(600); await shot(p, w + '-dinner-gallery');
  note('one-detail-' + w, s.anchors === 1 && s.titles === 1 && /Sunday, 28 February 2027 · 19:30 · Poolside/i.test(s.eyebrow) && s.dress && s.slides === 13 && /1 \/ 13/.test(s.count) && s.arrows === 2 && s.rail && s.playPause === 0 && s.ov <= 1 && s.srcs.includes('056-wedding-dinner-08-long-table-candlelight.jpg') && s.srcs.includes('053-wedding-dinner-sharing-menu.jpg') && s.srcs.includes('pool-terrace-oblique-1600.jpg') && (w > 430 || s.firstLeft === s.contentLeft), JSON.stringify({ anchors: s.anchors, titles: s.titles, eyebrow: s.eyebrow, dress: s.dress, slides: s.slides, count: s.count, arrows: s.arrows, rail: s.rail, playPause: s.playPause, firstLeft: s.firstLeft, contentLeft: s.contentLeft, ov: s.ov, has: [s.srcs.includes('056-wedding-dinner-08-long-table-candlelight.jpg'), s.srcs.includes('053-wedding-dinner-sharing-menu.jpg'), s.srcs.includes('pool-terrace-oblique-1600.jpg')] }));
  /* the controls: next, then to the end, then swipe back on the phone */
  await p.click('[data-wedding-dinner-media] [data-a="next"]'); await p.waitForTimeout(450); const c1 = await p.evaluate(() => (document.querySelector('[data-wedding-dinner-media] .refgal-count') || {}).innerText);
  for (let i = 0; i < 12; i++) { await p.click('[data-wedding-dinner-media] [data-a="next"]').catch(() => {}); await p.waitForTimeout(220); }
  const end = await p.evaluate(() => { const c = document.querySelector('[data-wedding-dinner-media]'); const on = c.querySelector('.aslide.on'); const all = [...c.querySelectorAll('.aslide')]; const r = on.getBoundingClientRect(), rl = all[all.length - 1].getBoundingClientRect(); return { count: c.querySelector('.refgal-count').innerText, lastOn: on === all[all.length - 1], lastVisible: rl.left >= -2 && rl.right <= innerWidth + 2, visible: r.left >= -2 && r.right <= innerWidth + 2, src: on.querySelector('img').getAttribute('src').split('/').pop(), lastSrc: all[all.length - 1].querySelector('img').getAttribute('src').split('/').pop(), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  await shot(p, w + '-dinner-last');
  /* the swipe is the carousel's own horizontal scroll with snap points (a finger on the phone): one slide back by scroll → the count follows */
  let swipe = null;
  if (w <= 430) swipe = await p.evaluate(async () => { const trk = document.querySelector('[data-wedding-dinner-media] .atrk'); const sl = trk.querySelector('.aslide'); trk.scrollBy({ left: -(sl.getBoundingClientRect().width + 12), behavior: 'auto' }); await new Promise((r) => setTimeout(r, 700)); return { count: document.querySelector('[data-wedding-dinner-media] .refgal-count').innerText, snap: getComputedStyle(trk).scrollSnapType, overflow: getComputedStyle(trk).overflowX }; });
  note('controls-' + w, /2 \/ 13/.test(c1) && end.lastVisible && end.lastSrc === '053-wedding-dinner-sharing-menu.jpg' && (w >= 1200 || (/13 \/ 13/.test(end.count) && end.lastOn)) && end.visible && end.ov <= 1 && (w > 430 || (/12 \/ 13/.test(swipe.count) && /x/.test(swipe.snap) && /auto|scroll/.test(swipe.overflow))), JSON.stringify({ afterNext: c1, end, swipe }));
  /* the venue map's dinner: an index entry without a photograph, its way to #dinner on the same page */
  const vz = await p.evaluate(async () => { const btn = [...document.querySelectorAll('.venue-item')].find((b) => /Wedding Dinner/.test(b.innerText)); if (!btn) return { none: true }; btn.click(); await new Promise((r) => setTimeout(r, 700)); const d = document.querySelector('#venue-detail') || document.querySelector('.venue-detail-in'); const det = d ? d.innerText.replace(/\s+/g, ' ') : ''; return { photo: !!(d && d.querySelector('.venue-photo, .venue-thumb')), text: det.slice(0, 200), cta: d ? (d.querySelector('a.a-link') || {}).getAttribute('href') : null, index: !!(d && d.querySelector('.venue-index')) }; });
  if (!vz.none) { await p.click('#venue-detail a.a-link, .venue-detail-in a.a-link').catch(() => {}); await p.waitForTimeout(900); }
  const after = await p.evaluate(() => ({ hash: location.hash, top: Math.round(document.querySelector('#dinner').getBoundingClientRect().top) }));
  note('venue-index-entry-' + w, !vz.none && !vz.photo && vz.index && /Wedding Dinner · Poolside/.test(vz.text) && /run A poolside, run B opposite the pool/.test(vz.text) && vz.cta === '#dinner' && after.hash === '#dinner' && Math.abs(after.top) < 160, JSON.stringify({ vz, after }));
  await p.context().close();
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close(); await wk.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
