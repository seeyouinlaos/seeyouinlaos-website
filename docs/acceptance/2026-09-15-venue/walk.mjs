/* 003 · THE VENUE EXPERIENCE — rendered proof (Owner, 15 Sep 2026, PART 26).
     node docs/acceptance/2026-09-15-venue/walk.mjs <origin> [outdir]
   Renders voyage.html and accommodation.html at every target width in Chromium (and the phone widths in
   WebKit — mobile Safari's engine): the real aerial is served, the labels sit on it and never collide,
   nothing overflows, every image loads, no video, the labels and the legend are keyboard-operable with a
   visible focus, the selection is announced once, reduced motion keeps everything, and the page's LCP, CLS,
   long tasks and image transfer are measured. Public menu and footer are read as rendered. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d: String(d || '') }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? ' — ' + String(d).slice(0, 220) : '')); };
const WIDTHS = [320, 375, 390, 393, 430, 768, 834, 1024, 1280, 1440];
const PERF = `(() => { window.__perf = { lcp: 0, cls: 0, longTasks: 0, longest: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.renderTime || e.loadTime || e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.longTasks++; window.__perf.longest = Math.max(window.__perf.longest, e.duration); } }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })()`;

async function stageInfo(p) {
  return p.evaluate(() => {
    const s = document.querySelector('.venue-stage'), img = document.querySelector('.venue-img');
    const box = img.getBoundingClientRect();
    const labels = [...document.querySelectorAll('.venue-label')].map((l) => { const r = l.getBoundingClientRect(); return { zone: l.getAttribute('data-zone'), text: l.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && getComputedStyle(l).opacity !== '0', font: getComputedStyle(l).fontSize }; });
    const overlap = []; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap.push(a.zone + '×' + b.zone); }
    const inside = labels.every((l) => l.x >= box.x - 1 && l.x + l.w <= box.x + box.width + 1 && l.y >= box.y - 1 && l.y + l.h <= box.y + box.height + 1);
    return { active: s.getAttribute('data-active'), src: (img.currentSrc || '').split('/').pop(), natural: img.naturalWidth + 'x' + img.naturalHeight, rendered: Math.round(box.width) + 'x' + Math.round(box.height), labels, overlap, inside, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, video: document.querySelectorAll('video').length, legend: document.querySelectorAll('.venue-item').length, title: (document.querySelector('.venue-title') || {}).textContent || '' };
  });
}
async function render(engine, w, h, file, shot) {
  const b = await engine.launch(); const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(PERF);
  await p.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.getElementById('venue').scrollIntoView({ block: 'start' }));
  await p.waitForFunction(() => document.querySelector('.venue-title'), null, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(2400);
  const info = await stageInfo(p);
  const perf = await p.evaluate(() => ({ ...window.__perf, images: performance.getEntriesByType('resource').filter((r) => /images\/venue\//.test(r.name)).map((r) => ({ n: r.name.split('/').pop(), kb: Math.round(r.transferSize / 1024) })) }));
  if (shot && OUT) await p.screenshot({ path: path.join(OUT, shot), fullPage: false });
  return { p, b, ctx, info, perf, errs };
}

/* ---- 1 · every width, both pages, Chromium ---- */
for (const file of ['voyage.html', 'accommodation.html']) {
  for (const w of WIDTHS) {
    const { b, info, perf, errs } = await render(chromium, w, Math.round(w * 1.8), file, (w === 390 || w === 1280) ? file.replace('.html', '') + '-' + w + '.png' : null);
    const shortest = file === 'voyage.html' ? 'V' : 'A';
    note(shortest + w + ' stage · the real aerial served (' + info.src + ' ' + info.natural + ') at ' + w + ' px, no overflow, no video', /souphattra-aerial/.test(info.src) && info.natural !== '0x0' && !info.overflow && info.video === 0 && info.legend === 7, info.rendered + ' · overflow ' + info.overflow);
    note(shortest + w + ' labels · three labels, on the photograph, none colliding, none hidden', info.labels.length === 3 && info.labels.every((l) => l.visible) && info.overlap.length === 0 && info.inside, info.labels.map((l) => l.text + ' ' + l.font).join(' | ') + (info.overlap.length ? ' OVERLAP ' + info.overlap.join(',') : ''));
    if (w === 390 || w === 1280) note(shortest + w + ' performance · LCP ' + Math.round(perf.lcp) + ' ms · CLS ' + perf.cls.toFixed(3) + ' · long tasks ' + perf.longTasks + ' (longest ' + Math.round(perf.longest) + ' ms) · venue images ' + perf.images.reduce((n, i) => n + i.kb, 0) + ' KB', perf.cls < 0.1 && perf.longest < 200, perf.images.map((i) => i.n + ' ' + i.kb + 'KB').join(', '));
    if (errs.length) note(shortest + w + ' errors', false, errs.join(' | '));
    await b.close();
  }
}

/* ---- 2 · interaction, keyboard, announcement, photographs, reduced motion (Chromium, 390 and 1280) ---- */
for (const w of [390, 1280]) {
  const { p, b, info } = await render(chromium, w, w === 390 ? 844 : 900, 'voyage.html', null);
  note('I' + w + ' the first place opens by itself: Wedding Dinner · Poolside, its area lit', info.active === 'dinner' && /Wedding Dinner/.test(info.title), info.title);
  await p.click('.venue-label[data-zone="pool"]'); await p.waitForTimeout(600);
  const s1 = await p.evaluate(() => ({ active: document.querySelector('.venue-stage').getAttribute('data-active'), lbl: document.querySelector('.venue-label[data-zone="pool"]').getAttribute('aria-pressed'), item: document.querySelector('.venue-item[data-zone="pool"]').getAttribute('aria-pressed'), other: document.querySelector('.venue-item[data-zone="dinner"]').getAttribute('aria-pressed'), title: document.querySelector('.venue-title').textContent, live: document.querySelector('.venue-live').textContent, veil: getComputedStyle(document.querySelector('.venue-veil')).opacity, hole: getComputedStyle(document.querySelector('.venue-hole[data-zone="pool"]')).opacity }));
  note('I' + w + ' tap a label on the photograph → that place opens: label and legend pressed, the rest released, the area lit, one-sentence announcement', s1.active === 'pool' && s1.lbl === 'true' && s1.item === 'true' && s1.other === 'false' && /swimming pool/i.test(s1.title) && s1.live === 'The swimming pool. Every day of the stay.' && Number(s1.veil) > 0.2 && s1.hole === '1', JSON.stringify(s1));
  await p.click('.venue-item[data-zone="lobby"]'); await p.waitForTimeout(600);
  const s2 = await p.evaluate(() => ({ active: document.querySelector('.venue-stage').getAttribute('data-active'), title: document.querySelector('.venue-title').textContent, live: document.querySelector('.venue-live').textContent, img: (() => { const i = document.querySelector('.venue-photo img'); return i ? i.naturalWidth > 0 : false; })(), thumbs: document.querySelectorAll('.venue-thumb').length, pressedLabels: document.querySelectorAll('.venue-label[aria-pressed="true"]').length, veil: getComputedStyle(document.querySelector('.venue-veil')).opacity }));
  note('I' + w + ' a place without a marker (the lobby) opens from the legend: its photograph and story, the whole photograph kept, no label pressed', /lobby/i.test(s2.title) && s2.img && s2.thumbs === 3 && s2.pressedLabels === 0 && s2.active === '' && Number(s2.veil) < 0.05 && s2.live === 'The lobby. Arrival · 27 February.', JSON.stringify(s2));
  await p.click('.venue-thumb[data-photo="1"]'); await p.waitForTimeout(1100);
  const s3 = await p.evaluate(() => ({ n: document.querySelector('.venue-photo').getAttribute('data-photo'), imgs: document.querySelectorAll('.venue-photo img').length, pressed: document.querySelector('.venue-thumb[data-photo="1"]').getAttribute('aria-pressed'), loaded: [...document.querySelectorAll('.venue-photo img')].every((i) => i.naturalWidth > 0), src: (document.querySelector('.venue-photo img') || {}).currentSrc }));
  note('I' + w + ' the gallery: the second photograph replaces the first (cross-fade done, the old one gone), the thumbnail pressed, the file loaded', s3.n === '1' && s3.imgs === 1 && s3.pressed === 'true' && s3.loaded && /lobby-clock/.test(s3.src), JSON.stringify(s3));
  /* keyboard: the legend, then a label on the photograph */
  await p.focus('.venue-item[data-zone="lobby"]');
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowDown');
  const k1 = await p.evaluate(() => document.activeElement.getAttribute('data-zone')); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const k2 = await p.evaluate(() => ({ title: document.querySelector('.venue-title').textContent, outline: getComputedStyle(document.activeElement).outlineStyle, zone: document.activeElement.getAttribute('data-zone') }));
  note('I' + w + ' keyboard · arrow keys walk the legend (lobby → ceremony), Enter opens it, the focus ring is visible', k1 === 'ceremony' && /Wedding Ceremony/.test(k2.title) && k2.outline !== 'none', JSON.stringify({ k1, k2 }));
  await p.focus('.venue-label[data-zone="garden"]'); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  const k3 = await p.evaluate(() => ({ title: document.querySelector('.venue-title').textContent, outline: getComputedStyle(document.activeElement).outlineStyle, active: document.querySelector('.venue-stage').getAttribute('data-active') }));
  note('I' + w + ' keyboard · a label on the photograph takes focus (visible ring) and Space opens its place', /garden/i.test(k3.title) && k3.outline !== 'none' && k3.active === 'garden', JSON.stringify(k3));
  const a11y = await p.evaluate(() => ({ figureDesc: document.getElementById('venue-stage-desc').textContent, region: document.getElementById('venue-detail').getAttribute('role'), labelled: document.getElementById('venue-detail').getAttribute('aria-labelledby'), listLabel: document.querySelector('.venue-legend').getAttribute('aria-label'), h2: document.getElementById('venue-h').textContent, alts: [...document.querySelectorAll('#venue img')].filter((i) => !i.closest('.venue-thumb')).every((i) => i.getAttribute('alt')) }));
  note('I' + w + ' screen reader · the map is described in text, the legend is a labelled list, the detail a labelled region, every photograph has alt text', /On the photograph: Wedding Dinner · Poolside, Swimming pool, Courtyard garden/.test(a11y.figureDesc) && a11y.region === 'region' && a11y.labelled === 'venue-detail-h' && a11y.listLabel === 'Venue map' && a11y.h2 === 'Souphattra Heritage Vientiane' && a11y.alts, JSON.stringify(a11y));
  await b.close();
  /* reduced motion */
  const rb = await chromium.launch(); const rctx = await rb.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, reducedMotion: 'reduce', isMobile: w < 700 }); const rp = await rctx.newPage();
  await rp.goto(ORIGIN + '/voyage.html', { waitUntil: 'networkidle' }); await rp.evaluate(() => document.getElementById('venue').scrollIntoView({ block: 'start' })); await rp.waitForTimeout(400);
  const rm = await rp.evaluate(() => ({ cls: document.documentElement.classList.contains('m-reduced'), stageIn: document.querySelector('.venue-stage').classList.contains('is-in'), labels: [...document.querySelectorAll('.venue-label')].map((l) => getComputedStyle(l).opacity), img: getComputedStyle(document.querySelector('.venue-img')).opacity, title: (document.querySelector('.venue-title') || {}).textContent || '', dash: getComputedStyle(document.querySelector('.venue-outline')).strokeDashoffset, sections: [...document.querySelectorAll('[data-motion="reveal"]')].map((s) => getComputedStyle(s).opacity) }));
  note('I' + w + ' reduced motion · everything is simply there: the stage, the labels, the outlines, the detail, every story section — nothing moves, nothing is missing', rm.cls && rm.stageIn && rm.labels.length === 3 && rm.labels.every((o) => Number(o) >= 0.6) && rm.img === '1' && /Wedding Dinner/.test(rm.title) && /^0(px)?$/.test(rm.dash) && rm.sections.every((o) => o === '1'), JSON.stringify(rm));
  await rb.close();
}

/* ---- 3 · WebKit (mobile Safari's engine) at the phone widths ---- */
for (const w of [375, 390, 430]) {
  const { b, info, errs } = await render(webkit, w, 800, 'voyage.html', null);
  note('S' + w + ' WebKit · the aerial (' + info.src + ') with three labels, no overflow, the detail rendered', /souphattra-aerial/.test(info.src) && info.labels.length === 3 && info.overlap.length === 0 && !info.overflow && /Wedding Dinner/.test(info.title) && errs.length === 0, info.rendered + (errs.length ? ' ' + errs.join('|') : ''));
  await b.close();
}

/* ---- 4 · the public menu and the rendered footer, unchanged ---- */
{
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  for (const file of ['voyage.html', 'accommodation.html']) {
    await p.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' });
    const f = await p.evaluate(() => [...document.querySelectorAll('footer a')].map((a) => a.textContent.trim()));
    note('F ' + file + ' · the rendered footer carries Sühring · Lunch, 1872 · Afternoon Tea and Your tickets', f.includes('Sühring · Lunch') && f.some((t) => /1872/.test(t)) && f.includes('Your tickets'), f.filter((t) => /Sühring|1872|tickets/.test(t)).join(' | '));
  }
  await p.goto(ORIGIN + '/voyage.html', { waitUntil: 'networkidle' }); await p.click('#menu-open, .hb'); await p.waitForTimeout(500);
  const m = await p.evaluate(() => document.querySelector('.a-menu').textContent.replace(/\s+/g, ' '));
  note('F the public menu still lists Sühring · Lunch in Bangkok and 1872', /Sühring · Lunch in Bangkok/.test(m) && /1872/.test(m), '');
  await b.close();
}
const pass = R.filter((r) => r.ok).length;
console.log('\n' + pass + '/' + R.length + ' checks passed');
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 2));
process.exit(pass === R.length ? 0 : 1);
