/* ============================================================================
   HARUTHAI CONTENT / IMAGE CORRECTION PASS — the rendered acceptance walk.

   Every corrected surface, rendered as Peggy (INV-002) at 390 · 834 · 1440 ·
   1920; every check is read back from the page, never from the source.

     node docs/acceptance/2026-09-11-haruthai/walk.mjs [origin] [outdir]
   ========================================================================== */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.SIYL_TOKEN || 'vz4npnjgkqfv3t47';
const WIDTHS = [390, 834, 1440, 1920];
const results = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
async function go(file, width) { await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 }); await page.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' }); await page.waitForTimeout(400); }
async function scrollAll() { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); }); await page.waitForTimeout(300); }
async function shot(name, width) { await scrollAll(); await page.screenshot({ path: path.join(OUT, name + '-' + width + '.png'), fullPage: true }); }
async function crop(sel, name, width) { const el = page.locator(sel).first(); if (await el.count()) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await el.screenshot({ path: path.join(OUT, name + '-' + width + '.png') }); } }
async function text(sel) { return ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(); }
async function overflow() { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); }
const still = '.prep-bar,header.hd,.jbar{position:static!important}';
async function allWidths(file, name, crops = [], before = null) {
  for (const w of WIDTHS) {
    await go(file, w); if (before) await before();
    await shot(name, w);
    if (crops.length) await page.addStyleTag({ content: still });
    for (const [sel, cname] of crops) await crop(sel, cname, w);
    if (await overflow()) note('overflow ' + name + '@' + w, false, 'horizontal overflow');
  }
}

/* ------------------------------------------------ 1 + 2 · the public wedding page */
await allWidths('voyage.html', 'H1-voyage', [['#dinner', 'H1-dinner'], ['#the-stay-room', 'H1-stay-room'], ['#takbat', 'H1-takbat']]);
const vy = await text('main, body');
note('H1 dinner placeholder, no lounge chairs', (await page.locator('#dinner .am-placeholder').count()) === 1 && !/garden-terrace|sharing-menu/.test(await page.content()), 'placeholder present · retired images absent');
note('H1 stay shown as a room', /souphattra\/heritage-room\.jpg/.test(await page.content()) && (await page.locator('a[href="#dinner-table"]').count()) === 0, 'heritage-room band · "See the table" gone');
const tb = await text('#takbat'), sk = await text('#sangkhathan-about');
note('H1 Tak Bat self-pay, no amount', /self-pay/i.test(tb) && !/no charge|nothing to pay|no separate charge/i.test(vy) && !/USD/i.test(tb) && /Sangkhathan · Optional · USD 15 per guest/i.test(sk), 'Tak Bat section: self-pay, no amount · the USD 15 carries the Sangkhathan name');
const ph = await page.evaluate(() => { const e = document.querySelector('#dinner .am-placeholder'); const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
note('H1 placeholder has a real box', ph.w > 200 && ph.h > 120, JSON.stringify(ph));

/* ------------------------------------------------ open the party as Peggy */
await go('invitation.html', 390);
await page.evaluate(() => localStorage.clear());
await go('invitation.html', 390);
await page.click('#open');
await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await page.fill('.siyl-inv input', TOKEN);
await page.click('.siyl-inv .igo');
await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 8000 });
await page.waitForTimeout(300);
const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
const P = G.find((g) => /peggy/i.test(g.preferredName));
await page.click('.p-drawer [data-who="' + P.guestId + '"]');
await page.waitForTimeout(400);

/* ------------------------------------------------ 3 · Tak Bat inside the private journey */
await allWidths('wedding.html', 'H3-wedding', [['#takbat, [data-more="takbat"]', 'H3-takbat-button']], async () => {});
for (const w of WIDTHS) {
  await go('wedding.html', w);
  await page.locator('[data-more="takbat"]').first().click(); await page.waitForTimeout(400);
  await page.addStyleTag({ content: still });
  await crop('.p-drawer', 'H3-takbat-drawer', w);
  const d = await text('.p-drawer');
  if (w === 390) note('H3 Tak Bat drawer self-pay', /self-pay/.test(d) && !/no separate charge|nothing is paid|no charge/i.test(d) && !/USD/.test(d.split('Sangkhathan')[0] || d), 'drawer: ' + d.slice(0, 160));
}
const wtxt = await text('main');
note('H3 wedding page no retired phrase', !/no charge|nothing to pay|no separate charge/i.test(wtxt) && /self-pay/i.test(wtxt), 'wedding.html body');
await allWidths('review.html', 'H3-review');
const rv = await text('main');
note('H3 review self-pay', /self-pay/i.test(rv) && !/no separate charge|no charge/i.test(rv), 'review.html body');
await allWidths('your-journey.html', 'H3-your-journey');
const yj = await text('main');
note('H3 your-journey self-pay', /self-pay/i.test(yj) && !/no separate charge|no charge/i.test(yj), 'your-journey.html body');

/* ------------------------------------------------ 4 + 5 · resort wear rails */
await allWidths('wedding-preparation.html', 'H4-preparation', [['.p-rail[aria-label="Resort wear references"]', 'H4-resort-rail'], ['.p-rail[aria-label="Lao traditional dress references"]', 'H4-tradition-rail'], ['.p-rail[aria-label="Black tie references"]', 'H4-blacktie-rail']]);
for (const w of WIDTHS) {
  await go('wedding-preparation.html', w); await scrollAll();
  const m = await page.evaluate(() => [...document.querySelectorAll('.p-rail img')].map((i) => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); return { src: i.getAttribute('src').split('/').pop(), w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3), fit: cs.objectFit, pos: cs.objectPosition, nat: i.naturalWidth + 'x' + i.naturalHeight, loaded: i.complete && i.naturalWidth > 0 }; }));
  const ok = m.length === 17 && m.every((x) => x.fit === 'cover' && Math.abs(x.ratio - 0.75) < 0.02 && x.loaded && x.w >= 200) && !m.some((x) => x.src === 'resort-01.jpg');
  note('H4 rails @' + w, ok, m.length + ' images · ratios ' + [...new Set(m.map((x) => x.ratio))].join('/') + ' · fit ' + [...new Set(m.map((x) => x.fit))].join('/') + ' · widths ' + [...new Set(m.map((x) => x.w))].join('/') + (m.some((x) => !x.loaded) ? ' · UNLOADED' : ''));
}
await allWidths('dress.html', 'H5-dress');
note('H5 dress.html 17 references, none retired', (await page.locator('.dgal img').count()) === 17 && (await page.locator('img[src*="resort-01"]').count()) === 0, 'public dress page');

/* ------------------------------------------------ 6 + 7 · transport truth */
await allWidths('transport.html?id=c86', 'H6-c86');
const c86 = await text('main, body');
note('H6 C86 13:44', /13:44/.test(c86) && !/21:0[68]/.test(c86) && !/C642/.test(c86) && /10:15/.test(c86) && /85/.test(c86), 'c86 page reads 10:15 → 13:44, USD 85, no C642');
await allWidths('transport.html?id=train', 'H7-train');
const tr = await text('main, body');
note('H7 train truth', /Bangkok \(Krung Thep Aphiwat\) → Nong Khai/.test(tr) && /In-suite washbasin in every cabin/.test(tr) && /Blankets/.test(tr) && !/Towels|some cabins|Shared washbasin/.test(tr), 'route · every cabin · blankets');

/* ------------------------------------------------ 8 + 9 + 10 · Bangkok addresses */
const stays = [['penthouse', /Breakfast is NOT included/, /keybox/], ['u-sathorn-superior-garden', /Breakfast included\./, /Check-in at the lobby\./], ['shama-king-studio-balcony', /Breakfast included\./, /Check-in at the lobby\./]];
for (const [slug, a, b] of stays) {
  await allWidths('room.html?stay=sathorn&room=' + slug, 'H8-' + slug, [['.inc', 'H8-' + slug + '-includes']]);
  const inc = await text('.inc');
  const body = await text('main, body');
  const clean = slug === 'penthouse' ? true : !/keybox|private entrance|private elevator|whole party|NOT included|groceries|Meals cooked|parking/i.test(inc);
  note('H8 ' + slug + ' inclusions', a.test(inc) && b.test(inc) && clean && (slug === 'penthouse' || /per couple/i.test(inc)), inc.slice(0, 220));
  if (slug !== 'penthouse') {
    const sq = slug.startsWith('u-') ? /32 sq\.m\./i : /36 sq\.m\./i;
    const amt = await text('.occard, .amount, .pricebox, main');
    note('H8 ' + slug + ' room facts', sq.test(body) && /2 adults/i.test(body) && /Breakfast is included|Breakfast included/i.test(body) && !/keybox|private elevator|whole party|groceries/i.test(body.split(/other rooms/i)[0]), 'sq.m · 2 adults · breakfast included · no penthouse copy in the room\'s own section');
    const [n0, t0] = slug.startsWith('u-') ? ['64', '192'] : ['40', '120'];
    const own = body.split('Other rooms')[0] + (body.split('Add to Your Journey')[0].split('Other rooms').pop() || '');
    note('H8 ' + slug + ' room amounts', new RegExp('USD ' + n0 + ' per person / night','i').test(body) && new RegExp('USD ' + t0 + ' total per person','i').test(body) && !/(Breakfast not included|NOT included)[^|]{0,40}Add to Your Journey/i.test(body), 'USD ' + n0 + ' pp/night · USD ' + t0 + ' pp total · the amount block says Breakfast included');
    /* the per-person amounts live in the Guest Area stage, never on the room page (P1) */
    await go('your-journey.html', 390);
    await page.locator('#bkksel [data-choose="' + slug + '"]').click(); await page.waitForTimeout(400);
    const card = await text('#s-bkk-stay [data-slug="' + slug + '"]');
    const [n, t] = slug.startsWith('u-') ? ['64', '192'] : ['40', '120'];
    note('H8 ' + slug + ' stage card', /Selected for your journey/i.test(card) && new RegExp('USD ' + t + ' ?total per person','i').test(card) && /Breakfast included/i.test(card) && !/not included/i.test(card), card.slice(0, 200));
    for (const w2 of WIDTHS) { await go('your-journey.html', w2); await page.addStyleTag({ content: still }); await crop('#s-bkk-stay', 'H8-' + slug + '-stage', w2); }
  }
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results, errors }, null, 2));
console.log('\n' + results.filter((r) => r.ok).length + '/' + results.length + ' checks pass · page errors: ' + errors.length);
await browser.close();
