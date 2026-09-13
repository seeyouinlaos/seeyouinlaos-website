/* EXPERIENCE CONTENT COMPLETENESS · 13 Sep 2026 — the browser walk.
   Discovery rails per city and role, the photograph galleries (swipe, arrows,
   keys, position, lazy loading, no autoplay), the Sühring record and its
   Journey request (gated, current state, no duplicate, reload, Your Journey,
   Review & Send), a second multi-image place to prove the gallery is one
   component — at 320 / 375 / 390 / 430 / 834 / 1440. The Worker's status
   route is mocked; nothing is written to production. The INV-002 code is read
   from the private register and never printed.
     node docs/acceptance/2026-09-13-owner-decisions/experience-walk.mjs <origin> [out.json] */
import { chromium, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null;
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const T2 = csv.split(/\r?\n/).find((l) => l.startsWith('INV-002,')).match(/[a-z0-9]{16}/)[0];
const INV = JSON.parse(fs.readFileSync(new URL('../../../src/experience-inventory.json', import.meta.url), 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await chromium.launch();
async function wire(page) {
  await page.route(WORKER + '/api/**', async (route) => {
    const url = new URL(route.request().url()), json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/api/status') return json(200, { ok: true, received: false, confirmed: false });
    if (url.pathname.startsWith('/api/inventory')) return json(200, { ok: true, windows: {} });
    if (url.pathname.startsWith('/api/seating')) return json(200, { ok: true, open: false });
    return json(404, { ok: false });
  });
}
const txt = async (p, sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const errsOf = (p, errs) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Access to fetch|ERR_FAILED|Failed to load resource|CORS/.test(m.text())) errs.push(m.text()); }); };

/* ================================================================ 1 · DISCOVERY (390, touch) */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await wire(p); const errs = []; errsOf(p, errs);
  await p.goto(ORIGIN + '/experiences.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const rails = await p.evaluate(() => [...document.querySelectorAll('[data-rail]')].map((r) => ({ key: r.dataset.rail, n: r.querySelectorAll('.aslide').length, title: r.getAttribute('aria-label') })));
  const has = (k) => rails.find((r) => r.key === k);
  note('1 Bangkok · restaurant, café, experience, shopping, bar rails', ['bkk:breakfast', 'bkk:cafe', 'bkk:experience', 'bkk:place', 'bkk:bar'].every((k) => has(k) && has(k).n >= 2), JSON.stringify(rails.filter((r) => r.key.startsWith('bkk:'))));
  note('1 Bangkok return · one rail for the Kempinski days', has('bkk-return:breakfast') && has('bkk-return:place'), JSON.stringify(rails.filter((r) => r.key.startsWith('bkk-return'))));
  note('1 Vientiane · restaurants, cafés, bars, shopping and places, sights', ['laos:breakfast', 'laos:cafe', 'laos:bar', 'laos:place', 'laos:experience'].every((k) => has(k) && has(k).n >= 2), JSON.stringify(rails.filter((r) => r.key.startsWith('laos:'))));
  const suh = await p.evaluate(() => { const c = document.querySelector('[data-exp-id="bkk-suhring"]'); return c ? { rail: c.closest('[data-rail]').dataset.rail, more: c.querySelector('.a-more').textContent.trim(), href: c.querySelector('a.am').getAttribute('href') } : null; });
  note('1 Sühring appears in Bangkok restaurant discovery with its photograph count', suh && suh.rail === 'bkk:breakfast' && /9 photographs/.test(suh.more) && /experience\.html\?id=bkk-suhring/.test(suh.href), JSON.stringify(suh));
  const counts = await p.evaluate(() => [...document.querySelectorAll('[data-exp-id] .a-more')].map((a) => a.textContent.trim()));
  note('1 every card with several photographs says so', counts.filter((c) => /\d+ photographs/.test(c)).length >= 28, counts.filter((c) => /\d+ photographs/.test(c)).length + ' cards announce a gallery');
  note('1 no horizontal page scroll at 390', await noHScroll(p), 'scrollWidth ≤ clientWidth');
  note('1 no page errors on the discovery page', errs.length === 0, errs.join(' | ') || 'clean');
  await p.close();
}

/* ================================================================ 2 · GALLERY BEHAVIOUR (390 touch · 1440 pointer) */
for (const [id, name] of [['bkk-suhring', 'Sühring'], ['bkk-dib', 'Dib Bangkok'], ['bkk-lvvisionary', 'Louis Vuitton Visionary Journeys'], ['vte-laoderm', 'Lao Derm']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await wire(p); const errs = []; errsOf(p, errs);
  await p.goto(ORIGIN + '/experience.html?id=' + id, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const inv = INV.find((e) => e.id === id);
  const g = await p.evaluate(() => { const el = document.querySelector('[data-xgal]'); const imgs = [...el.querySelectorAll('img')]; return {
    n: imgs.length, first: { eager: !imgs[0].loading || imgs[0].loading === 'eager', w: imgs[0].getAttribute('width'), h: imgs[0].getAttribute('height'), alt: imgs[0].alt, complete: imgs[0].complete },
    lazy: imgs.slice(1).every((i) => i.loading === 'lazy'), alts: imgs.every((i) => i.alt && i.alt.length > 8), sized: imgs.every((i) => i.getAttribute('width') && i.getAttribute('height')),
    frame: getComputedStyle(el.querySelector('.aslide .am')).aspectRatio, role: el.querySelector('.atrk').getAttribute('role'), label: el.querySelector('.atrk').getAttribute('aria-label'),
    prev: el.querySelector('[data-a="prev"]')?.getAttribute('aria-label'), next: el.querySelector('[data-a="next"]')?.getAttribute('aria-label'), count: el.querySelector('.xg-count')?.textContent.replace(/\s+/g, ' ').trim(),
    stretched: imgs.some((i) => { const r = i.getBoundingClientRect(); if (!r.width) return false; const nat = i.naturalWidth / i.naturalHeight; const fit = getComputedStyle(i).objectFit; return !(fit === 'cover' || fit === 'contain'); }) }; });
  note('2 ' + name + ' · gallery count equals the inventory', g.n === inv.used && g.n >= 5, g.n + ' frames, inventory ' + inv.used);
  note('2 ' + name + ' · first frame eager with intrinsic size, the rest lazy, every frame with alt text', g.first.w && g.first.h && g.lazy && g.alts && g.sized, JSON.stringify(g.first));
  note('2 ' + name + ' · region and controls named, position shown, no stretching', g.role === 'region' && /Photographs of/.test(g.label) && g.prev === 'Previous photograph' && g.next === 'Next photograph' && /^1 \/ \d+$/.test(g.count) && !g.stretched, g.label + ' · ' + g.count);
  /* finger swipe: a horizontal drag on the track moves to the next frame; the page does not scroll sideways */
  const trk = p.locator('[data-xgal] .atrk').first(); const bb = await trk.boundingBox();
  await p.evaluate(() => { const t = document.querySelector('[data-xgal] .atrk'); t.scrollTo({ left: t.clientWidth, behavior: 'auto' }); }); await p.waitForTimeout(500);
  const after = await p.evaluate(() => ({ i: [...document.querySelectorAll('[data-xgal] .aslide')].findIndex((s) => s.classList.contains('on')), count: document.querySelector('.xg-count').textContent.replace(/\s+/g, ' ').trim() }));
  note('2 ' + name + ' · moving the track one frame updates the active frame and the position', after.i === 1 && /^2 \//.test(after.count), JSON.stringify(after));
  const t0 = await p.evaluate(() => document.querySelector('[data-xgal] .atrk').scrollLeft); await p.waitForTimeout(1500);
  const t1 = await p.evaluate(() => document.querySelector('[data-xgal] .atrk').scrollLeft);
  note('2 ' + name + ' · no autoplay: the frame stays where it was put', t0 === t1, t0 + ' → ' + t1);
  note('2 ' + name + ' · the page itself never scrolls sideways', await noHScroll(p), 'scrollWidth ≤ clientWidth');
  note('2 ' + name + ' · no page errors', errs.length === 0, errs.join(' | ') || 'clean');
  await p.close();
  /* keyboard and arrows on a pointer device */
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p2 = await ctx2.newPage(); await wire(p2);
  await p2.goto(ORIGIN + '/experience.html?id=' + id, { waitUntil: 'networkidle' }); await p2.waitForTimeout(400);
  const arrows = await p2.evaluate(() => getComputedStyle(document.querySelector('[data-xgal] .anav')).display);
  await p2.locator('[data-xgal] .atrk').focus(); await p2.keyboard.press('ArrowRight'); await p2.waitForTimeout(700); await p2.keyboard.press('ArrowRight'); await p2.waitForTimeout(700);
  const k = await p2.evaluate(() => document.querySelector('.xg-count').textContent.replace(/\s+/g, ' ').trim());
  await p2.locator('[data-xgal] [data-a="prev"]').click(); await p2.waitForTimeout(700);
  const k2 = await p2.evaluate(() => document.querySelector('.xg-count').textContent.replace(/\s+/g, ' ').trim());
  const fits = await p2.evaluate(() => [...document.querySelectorAll('[data-xgal] img')].every((i) => { const r = i.getBoundingClientRect(); return r.height <= 700; }));
  note('2 ' + name + ' · desktop: arrows shown, arrow keys move, previous returns, frame height bounded', arrows === 'flex' && /^3 \//.test(k) && /^2 \//.test(k2) && fits, arrows + ' · ' + k + ' → ' + k2);
  await p2.close();
}

/* ================================================================ 3 · SÜHRING · RECORD + JOURNEY REQUEST (390) */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await wire(p); const errs = []; errsOf(p, errs);
  await p.goto(ORIGIN + '/experience.html?id=bkk-suhring', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const rec = await p.evaluate(() => ({ h1: document.querySelector('h1').textContent, eyebrow: document.querySelector('.x-head .a-eyebrow').textContent, lede: document.querySelector('.x-lede').textContent,
    sections: [...document.querySelectorAll('[data-acc] .k')].map((k) => k.textContent), open: [...document.querySelectorAll('[data-acc]')].map((b) => b.getAttribute('aria-expanded')),
    kv: [...document.querySelectorAll('.x-kv > div')].map((d) => d.innerText.replace(/\s+/g, ' ').trim()), links: [...document.querySelectorAll('.x-kv a')].map((a) => a.href),
    sel: document.querySelector('#sel')?.textContent.replace(/\s+/g, ' ').trim(), btn: document.querySelector('#sel-add')?.textContent.trim() }));
  note('3 Sühring · name, Bangkok, lunch, German fine dining intro', rec.h1 === 'Sühring' && /Bangkok · Lunch/.test(rec.eyebrow) && /home of stories told through food/.test(rec.lede), rec.eyebrow);
  note('3 Sühring · the five About sections of the source, first open', rec.sections.join('|') === 'The philosophy|The founders|The foundation|The first mentor|Contemporary heritage' && rec.open[0] === 'true' && rec.open[1] === 'false', rec.sections.join(' · '));
  await p.locator('[data-acc="3"]').click(); await p.waitForTimeout(200);
  const mentor = await txt(p, '#xs3');
  note('3 Sühring · The first mentor opens on tap and carries grandmother Christa', /grandmother Christa/.test(mentor) && await p.evaluate(() => document.getElementById('xs3').classList.contains('on')), mentor.slice(0, 60));
  note('3 Sühring · price USD 180 as recorded, without an invented unit', rec.kv.some((k) => /^PRICE USD 180/.test(k) && !/per guest|per person|per menu/.test(k.split('The amount')[0]) && /does not state/.test(k)), rec.kv.find((k) => /^PRICE/.test(k)));
  note('3 Sühring · opening hours verbatim', rec.kv.some((k) => /OPENING HOURS Lunch Thursday to Sunday 12:30 pm to 13:00 pm \(last seating\) Closed on Monday and Tuesday/.test(k)), rec.kv.find((k) => /^OPENING/.test(k)));
  note('3 Sühring · map and website from the source', rec.links.some((l) => /maps\.app\.goo\.gl\/2b4whggW3YCnxN6u5/.test(l)) && rec.links.some((l) => /restaurantsuhring\.com\/menu\.html/.test(l)), rec.links.join(' '));
  note('3 Sühring · the Journey action explains request, not reservation, and the untotalled amount', /It is a request, not a reservation/.test(rec.sel) && /not added to your journey total/.test(rec.sel) && rec.btn === 'Add to your journey', rec.btn);
  /* the action is gated by the invitation: the code screen opens */
  await p.locator('#sel-add').click(); await p.waitForTimeout(400);
  const gate = await p.evaluate(() => document.body.classList.contains('siyl-inv-open'));
  note('3 Sühring · adding without a session opens the invitation gate, nothing is added', gate && (await p.evaluate(() => (localStorage.getItem('siyl.bag') || '[]'))) === '[]', 'gate ' + gate);
  await p.fill('.siyl-inv input', T2); await p.click('.siyl-inv .igo'); await p.waitForTimeout(1500);
  const bag1 = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.bag') || '[]'));
  const st1 = await p.evaluate(() => ({ cur: document.querySelector('[data-sel-state="current"]')?.textContent.trim(), add: !!document.querySelector('#sel-add'), rm: !!document.querySelector('#sel-rm') }));
  note('3 Sühring · after the code the request is in the bag as a REQUEST line without a price', bag1.length === 1 && bag1[0].id === 'suhring' && bag1[0].request === true && bag1[0].price == null && bag1[0].priceNote === 'USD 180' && bag1[0].exp === 'bkk-suhring', JSON.stringify(bag1));
  note('3 Sühring · the page shows IN YOUR JOURNEY, the Add action is gone, Remove offered', st1.cur === 'In your journey' && !st1.add && st1.rm, JSON.stringify(st1));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const st2 = await p.evaluate(() => ({ cur: document.querySelector('[data-sel-state="current"]')?.textContent.trim(), add: !!document.querySelector('#sel-add') }));
  note('3 Sühring · reload keeps the current state', st2.cur === 'In your journey' && !st2.add, JSON.stringify(st2));
  /* no duplicate: a second attempt through the page cannot add twice */
  await p.evaluate(() => { document.querySelectorAll('#sel-add').forEach((b) => b.click()); }); await p.waitForTimeout(300);
  const bag2 = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.bag') || '[]'));
  note('3 Sühring · duplicate selection impossible', bag2.length === 1 && bag2[0].qty === 1, bag2.length + ' line, qty ' + bag2[0].qty);
  /* Your Journey */
  await p.goto(ORIGIN + '/your-journey.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  const yj = await p.evaluate(() => { const ex = document.getElementById('extras'); const line = ex && ex.querySelector('.p-line'); return { hidden: ex ? ex.hidden : true, text: line ? line.textContent.replace(/\s+/g, ' ').trim() : '', href: line ? line.querySelector('h3 a')?.getAttribute('href') : '', total: document.getElementById('tt')?.textContent.trim() }; });
  note('3 Your Journey · Sühring listed as a request, opens its page, total untouched', !yj.hidden && /Sühring/.test(yj.text) && /Request · USD 180/.test(yj.text) && /BANGKOK DAYS · Restaurant/.test(yj.text) && /experience\.html\?id=bkk-suhring/.test(yj.href) && yj.total === 'USD 0', yj.total + ' · ' + yj.text.slice(0, 120));
  /* Review & Send */
  await p.goto(ORIGIN + '/review.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const rv = await p.evaluate(() => { const it = document.getElementById('items'); return { text: it ? it.textContent.replace(/\s+/g, ' ').trim() : '', total: document.getElementById('tt')?.textContent.trim() }; });
  note('3 Review & Send · the request line is shown by name, USD 180 as recorded, not in the total', /Sühring/.test(rv.text) && /Request · USD 180/.test(rv.text) && /not a confirmed reservation/.test(rv.text) && rv.total === 'USD 0', rv.total + ' · ' + rv.text.slice(0, 140));
  /* remove follows the bag rule */
  await p.goto(ORIGIN + '/experience.html?id=bkk-suhring', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.locator('#sel-rm').click(); await p.waitForTimeout(300);
  const bag3 = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.bag') || '[]'));
  note('3 Sühring · Remove empties the line and returns the Add action', bag3.length === 0 && (await p.evaluate(() => !!document.querySelector('#sel-add'))), 'bag ' + bag3.length);
  note('3 no page errors across the Sühring flow', errs.length === 0, errs.join(' | ') || 'clean');
  await p.close();
}

/* ================================================================ 4 · WIDTHS 320 · 375 · 430 · 834 */
for (const w of [320, 375, 430, 834]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800 }); const p = await ctx.newPage(); await wire(p); const errs = []; errsOf(p, errs);
  for (const path of ['/experiences.html', '/experience.html?id=bkk-suhring', '/experience.html?id=bkk-dib']) {
    await p.goto(ORIGIN + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    const ok = await noHScroll(p);
    const gal = await p.evaluate(() => { const el = document.querySelector('[data-xgal] .aslide.on .am'); if (!el) return { none: true }; const r = el.getBoundingClientRect(); const img = el.querySelector('img'); const ir = img.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inside: ir.width <= r.width + 1 && ir.height <= r.height + 1 }; });
    note('4 ' + w + ' ' + path + ' · no sideways scroll, frame inside the viewport, photograph inside the frame', ok && (gal.none || (gal.w <= w && gal.inside)), JSON.stringify(gal));
  }
  note('4 ' + w + ' · no page errors', errs.length === 0, errs.join(' | ') || 'clean');
  await p.close();
}

/* ================================================================ 5 · REDUCED MOTION */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await wire(p);
  await p.goto(ORIGIN + '/experience.html?id=bkk-suhring', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  const sb = await p.evaluate(() => getComputedStyle(document.querySelector('[data-xgal] .atrk')).scrollBehavior);
  note('5 reduced motion · the track moves without smooth scrolling', sb === 'auto', 'scroll-behavior ' + sb);
  await p.close();
}

const total = R.length, pass = R.filter((r) => r.ok).length;
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results: R }, null, 2));
console.log(pass + '/' + total + ' experience checks pass on ' + ORIGIN);
await b.close();
process.exit(pass === total ? 0 : 1);
