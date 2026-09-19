/* RELEASE 012 · E2E on the isolated stage worker (Owner, 19 Sep 2026): The Journey galleries (every accommodation card, the
   multi-hotel windows, arrows · swipe · keyboard · first/last · counter · lazy frames · stable geometry, the transport galleries
   intact), the Riverside Hotel from The Journey to My Trip and back, the restaurant media audit on the served pages, the cafés,
   four widths and iPhone Safari. Synthetic guests only (T001). With LIVE=1 the same read-only public checks run against the live
   Worker (no sign-in, nothing written).
     node docs/acceptance/2026-09-19-release-012/e2e.mjs <scratchpad> <outDir> [origin] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const b = await chromium.launch(); const errors = [];
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(p.url() + ' ' + String(e).slice(0, 100))); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (404|401|409)/.test(m.text())) errors.push(p.url() + ' ' + m.text().slice(0, 100)); }); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) {} return { status: r.status, body }; }, [path, init]);
const galState = (p, id) => p.evaluate((id) => { const box = document.querySelector('#' + id + ' .pgal'); if (!box) return null; const trk = box.querySelector('.trk'), r = box.getBoundingClientRect(); const phs = [...box.querySelectorAll('.ph')]; return { frames: +box.getAttribute('data-frames'), index: +box.getAttribute('data-index'), label: (box.querySelector('.gl') || {}).textContent || '', counter: (box.querySelector('.gc') || {}).textContent || '', w: Math.round(r.width), h: Math.round(r.height), phRatio: phs[0] ? +(phs[0].getBoundingClientRect().width / phs[0].getBoundingClientRect().height).toFixed(2) : null, loaded: phs.filter((x) => x.style.backgroundImage).length, pending: phs.filter((x) => x.hasAttribute('data-bg')).length, arrows: !!box.querySelector('.gp') && !!box.querySelector('.gx'), tabbable: trk && trk.getAttribute('tabindex') === '0' && trk.getAttribute('role') === 'group', pend: !!box.querySelector('.ph.pend') }; }, id);

/* ===== 1 · THE JOURNEY galleries at four widths ===== */
/* superseded by release 014 (Owner, 19 Sep 2026): the Guest House complimentary card (#j-guesthouse) replaces the residence; the Riverside Hotel has photographs — no card is pending */
const STAGES = ['j-bkk-stay', 'j-prewed', 'j-wedstay', 'j-guesthouse', 'j-riverside', 'j-kmg', 'j-ljg', 'j-kempinski'];
const TRANSPORT = ['j-train', 'j-mu9646', 'j-c86', 'j-return'];
for (const w of [320, 390, 834, 1440]) {
  const p = await fresh(w); await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const states = {}; for (const id of [...STAGES, ...TRANSPORT]) states[id] = await galState(p, id);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const okStages = STAGES.every((id) => states[id] && !states[id].pend && states[id].frames >= 2 && states[id].arrows && states[id].tabbable && states[id].index === 0 && /1 \/ \d+/.test(states[id].counter));
  const okTransport = TRANSPORT.every((id) => states[id] && states[id].frames >= 3 && states[id].arrows);
  const ratios = STAGES.map((id) => states[id].phRatio);
  const wantRatio = w >= 768 ? 1.5 : 1.25;   /* the desktop media column is 3:2 (as the photograph was), the phone card 5:4 */
  note('journey-galleries-' + w, okStages && okTransport && over <= 1 && ratios.every((r) => Math.abs(r - wantRatio) < 0.04), JSON.stringify({ over, ratios: [...new Set(ratios)], bkk: states['j-bkk-stay'], train: states['j-train'] && states['j-train'].frames, riverside: states['j-riverside'] && { frames: states['j-riverside'].frames, pend: states['j-riverside'].pend }, guesthouse: states['j-guesthouse'] && states['j-guesthouse'].frames }).slice(0, 260));
  if (w === 390 || w === 1440) await shot(p, w + '-journey-top');
  await p.context().close();
}

/* ===== 2 · the grammar on one card (390 and 1440): arrows, keyboard, first/last wrap, the counter and the hotel names, lazy frames, no layout shift ===== */
for (const w of [390, 1440]) {
  const p = await fresh(w); await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('#j-bkk-stay').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  const s0 = await galState(p, 'j-bkk-stay');
  const settle = (k) => p.waitForFunction((k) => document.querySelector('#j-bkk-stay .pgal').getAttribute('data-index') === String(k), k, { timeout: 4000 }).then(() => p.waitForTimeout(150)).catch(() => {});
  await p.click('#j-bkk-stay .gx'); await settle(1); const s1 = await galState(p, 'j-bkk-stay');
  await p.click('#j-bkk-stay .gp'); await settle(0); const s2 = await galState(p, 'j-bkk-stay');
  await p.click('#j-bkk-stay .gp'); await settle(s0.frames - 1); const s3 = await galState(p, 'j-bkk-stay');   /* previous on the first frame → the last */
  await p.focus('#j-bkk-stay .trk'); await p.keyboard.press('Home'); await settle(0); const s4 = await galState(p, 'j-bkk-stay');
  await p.keyboard.press('ArrowRight'); await settle(1); const s5 = await galState(p, 'j-bkk-stay');
  await p.keyboard.press('End'); await settle(s0.frames - 1); const s6 = await galState(p, 'j-bkk-stay');
  const names = await p.evaluate(() => { const b = document.querySelector('#j-bkk-stay .pgal'); return [...b.querySelectorAll('.ph')].map((x) => x.getAttribute('aria-label').split(' · ')[0]); });
  const hotels = [...new Set(names)];
  const stable = [s0, s1, s2, s3, s4, s5, s6].every((s) => s.w === s0.w && s.h === s0.h);
  note('gallery-grammar-' + w, s0.index === 0 && s1.index === 1 && /2 \/ \d+/.test(s1.counter) && s2.index === 0 && s3.index === s0.frames - 1 && s4.index === 0 && s5.index === 1 && s6.index === s0.frames - 1 && stable && s0.pending === s0.frames - 2 && s6.pending === 0 && hotels.length === 3 && /Sathorn Penthouse Bangkok/.test(s0.label) && JSON.stringify(hotels) === JSON.stringify(['Sathorn Penthouse Bangkok', 'U Sathorn Bangkok', 'Shama Yen-Akat Bangkok']), JSON.stringify({ s0: { i: s0.index, f: s0.frames, p: s0.pending, l: s0.label }, s1: { i: s1.index, c: s1.counter, l: s1.label }, s3: s3.index, s5: s5.index, s6: { i: s6.index, p: s6.pending }, stable, hotels }).slice(0, 300));
  if (w === 390) await shot(p, '390-journey-bkk-gallery');
  await p.context().close();
}

/* ===== 3 · touch: a swipe moves the frame, nothing navigates (Chromium touch + iPhone Safari) ===== */
const swipe = async (p, label) => {
  await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('#j-prewed').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  const url0 = p.url(); const s0 = await galState(p, 'j-prewed');
  /* the swipe as the browser sees it: the track scrolls by one frame (scroll-snap), the state follows the scroll */
  await p.evaluate(() => { const t = document.querySelector('#j-prewed .trk'); t.scrollBy({ left: t.clientWidth, behavior: 'smooth' }); }); await p.waitForTimeout(900);
  const s1 = await galState(p, 'j-prewed');
  const m = await p.evaluate(() => { const b = document.querySelector('#j-prewed .pgal'); const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), over: document.documentElement.scrollWidth - window.innerWidth }; });
  note('swipe-' + label, s1.index === 1 && s0.index === 0 && p.url() === url0 && m.w === s0.w && m.h === s0.h && m.over <= 1 && s1.loaded >= 3, JSON.stringify({ before: s0.index, after: s1.index, url: p.url() === url0, geometry: [s0.w, s0.h, m.w, m.h], over: m.over }));
};
{ const p = await fresh(390); await swipe(p, 'chromium-390'); await p.context().close(); }
const wk = await webkit.launch(); const ip = await (await wk.newContext(devices['iPhone 13'])).newPage(); ip.on('pageerror', (e) => errors.push('webkit ' + String(e).slice(0, 100)));
await swipe(ip, 'iphone-safari'); await ip.screenshot({ path: path.join(OUT, 'iphone-journey.png') });
{ await ip.goto(O + '/experience.html?id=bkk-ledukaan', { waitUntil: 'load' }); await ip.waitForTimeout(1200); const ov = await ip.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); note('iphone-experience-page', ov <= 1, 'Le Du Kaan on iPhone Safari: overflow ' + ov); }
await wk.close();

/* ===== 4 · no broken image: every frame of both records answers 200 ===== */
{ const p = await fresh(1440); const bad = await p.evaluate(async (O) => { const out = []; const srcs = [...new Set([].concat(...Object.values(window.SIYL_STAY_MEDIA || {}).map((h) => h.images.map((i) => i.src))))]; for (const s of srcs) { const r = await fetch(O + '/' + s, { method: 'HEAD' }); if (r.status !== 200) out.push(s + ':' + r.status); } return { n: srcs.length, bad: out }; }, O).catch(() => null);
  await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const res = await p.evaluate(async () => { const out = []; const srcs = [...new Set([].concat(...Object.values(window.SIYL_STAY_MEDIA).map((h) => h.images.map((i) => i.src))))]; for (const s of srcs) { const r = await fetch(s, { method: 'HEAD' }); if (r.status !== 200) out.push(s + ':' + r.status); } return { n: srcs.length, bad: out }; });
  await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const res2 = await p.evaluate(async () => { const out = []; const srcs = [...new Set([].concat(...Object.values(window.SIYL_EXP_GALLERY).map((g) => g.images.map((i) => i.src))))]; for (const s of srcs) { const r = await fetch(s, { method: 'HEAD' }); if (r.status !== 200) out.push(s + ':' + r.status); } return { n: srcs.length, bad: out }; });
  /* superseded by release 014 (Owner, 19 Sep 2026): the stay record is 50 frames (the residence's 4 leave, the Guest House complimentary's 4 and the Riverside Hotel's 7 arrive); the experience record is 167 (Baan Phraya 4 and Cannubi 5 arrive) */
  note('no-broken-image', res.bad.length === 0 && res2.bad.length === 0 && res.n === 50 && res2.n === 167, JSON.stringify({ stay: res, exp: res2 }).slice(0, 200)); await p.context().close(); }

/* ===== 5 · the restaurant media audit on the served pages ===== */
{ const p = await fresh(390); const FOOD = /dish|bowl|noodle|plate|dessert|cake|cocktail|martini|pastry|brunch|tartlet|sorbet|canap|salad|pork|beef/i;
  const pages = {}; for (const id of ['bkk-thongsmith', 'bkk-tangjaiyang', 'bkk-ledukaan', 'bkk-barus', 'bkk-suhring', 'vte-laoderm', 'vte-3merchants', 'bkk-alati']) { await p.goto(O + '/experience.html?id=' + id, { waitUntil: 'load' }); await p.waitForTimeout(1000);
    pages[id] = await p.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent, alts: [...document.querySelectorAll('[role="img"][aria-label], img[alt]')].map((e) => e.getAttribute('aria-label') || e.getAttribute('alt')).filter(Boolean), imgs: [...document.querySelectorAll('img')].filter((i) => /experiences\//.test(i.currentSrc || i.src)).map((i) => (i.currentSrc || i.src).split('/').pop()), bgs: [...document.querySelectorAll('[style*="experiences/"]')].map((e) => (e.getAttribute('style').match(/experiences\/([^)"']+)/) || [])[1]) })); }
  const bad = Object.entries(pages).filter(([id, v]) => v.alts.some((a) => FOOD.test(a)) || [...v.imgs, ...v.bgs].some((f) => /barus-0[1-5]\.jpg|thongsmith-0[125]|tjy-0[134]|ledukaan-0[5-8]/.test(f || '')));
  note('restaurant-pages-no-food', bad.length === 0 && Object.keys(pages).length === 8 && pages['bkk-tangjaiyang'].h1 && pages['bkk-barus'].h1, bad.length ? JSON.stringify(bad).slice(0, 250) : Object.entries(pages).map(([k, v]) => k + ':' + (v.imgs.length + v.bgs.length)).join(' '));
  await p.goto(O + '/experience.html?id=bkk-barus', { waitUntil: 'load' }); await p.waitForTimeout(1000); await shot(p, '390-barus');
  await p.goto(O + '/experience.html?id=bkk-thongsmith', { waitUntil: 'load' }); await p.waitForTimeout(1000); await shot(p, '390-thongsmith');
  await p.goto(O + '/experience.html?id=bkk-tangjaiyang', { waitUntil: 'load' }); await p.waitForTimeout(1000); await shot(p, '390-tangjaiyang');
  await p.goto(O + '/experience.html?id=bkk-ledukaan', { waitUntil: 'load' }); await p.waitForTimeout(1000); await shot(p, '390-ledukaan');
  /* the served set: the rejected Bar Us frames are gone; the cafés rail carries the source cafés */
  const gone = []; for (const f of ['bkk-barus-01.jpg', 'bkk-barus-02.jpg', 'bkk-barus-03.jpg', 'bkk-barus-04.jpg', 'bkk-barus-05.jpg', 'bkk-thongsmith-01.jpg', 'bkk-tjy-01.jpg', 'bkk-ledukaan-05.jpg']) { const r = await fetch(O + '/assets/images/experiences/' + f); if (r.status !== 404) gone.push(f + ':' + r.status); }
  note('rejected-frames-not-served', gone.length === 0, gone.join(', ') || 'the tray martini, the cocktails, the bowls and the dish collages answer 404');
  await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const cafes = await p.evaluate(() => [...document.querySelectorAll('section[data-rail$=":cafe"] .aslide h3')].map((e) => e.textContent.trim()));
  note('cafes-rail', /Moo Yoo/.test(cafes.join('|')) && /Kaogee/.test(cafes.join('|')) && /Dior|Harudot|Madeleine|Whispering|Lacuna|Sona|Time Space/.test(cafes.join('|')), cafes.slice(0, 12).join(' | '));
  await shot(p, '390-experiences-cafes'); await p.context().close(); }

/* ===== 6 · the Riverside Hotel, signed in (stage only): The Journey → the room page → My Trip → My Bag → the engine → a Souphattra choice replaces it ===== */
if (!LIVE) {
  const p = await fresh(390); await signIn(p, 'T001');
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', 'ada.test@example.org'); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500);
  for (const stage of ['wedstay', 'prewed', 'bkk-stay']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage }) });
  await p.evaluate(() => { ['siyl.bag', 'siyl.skip', 'siyl.skip.by'].forEach((k) => localStorage.removeItem(k)); });
  /* superseded by release 014 (Owner, 19 Sep 2026): the Riverside Hotel has photographs — the card's gallery and the room page carry them, "Photography to follow" is gone */
  await p.goto(O + '/journeys.html#j-riverside', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const card = await p.$eval('#j-riverside', (e) => e.innerText.replace(/\s+/g, ' ')); const cardGal = await galState(p, 'j-riverside');
  note('riverside-journey-card', /Riverside Hotel Vientiane/.test(card) && !/Photography to follow/i.test(card) && !!cardGal && !cardGal.pend && cardGal.frames >= 1 && cardGal.loaded >= 1 && /USD 60 total per person/.test(card) && /USD 30 per person \/ night/.test(card), card.slice(0, 160) + ' · gallery ' + JSON.stringify({ frames: cardGal && cardGal.frames, loaded: cardGal && cardGal.loaded, pend: cardGal && cardGal.pend }));
  await p.click('#j-riverside a[href*="stay=riverside"]'); await p.waitForLoadState('load'); await p.waitForTimeout(1800);
  const room = await p.evaluate(() => ({ url: location.href, h1: (document.querySelector('main h1') || {}).textContent, pend: /Photography to follow/i.test(document.body.innerText), gallery: document.querySelectorAll('#gal .ph[style*="background-image"]').length, counter: (document.getElementById('gc') || {}).textContent || '', size: /22 sq\.m\./.test(document.body.innerText), join: [...document.querySelectorAll('[data-join]')].length, price: (document.body.innerText.match(/USD \d+[^\n]{0,40}/) || [''])[0] }));
  note('riverside-room-page', /stay=riverside/.test(room.url) && /Superior Room With Window/.test(room.h1 || '') && !room.pend && room.gallery >= 1 && /^1 \/ \d+$/.test(room.counter) && room.size && room.join >= 1, JSON.stringify(room).slice(0, 220));
  await shot(p, '390-riverside-room');
  await p.click('[data-rooms-box="riverside"] [data-join$="|A"], [data-join$="|A"]'); await p.waitForTimeout(2200);
  const held = await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' });
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); await p.evaluate(() => SIYL_GUEST.setScope({ all: true })); await p.waitForTimeout(800);
  const trip = await p.evaluate(() => ({ stage: (document.querySelector('#s-wedstay') || {}).innerText ? document.querySelector('#s-wedstay').innerText.replace(/\s+/g, ' ') : '', bag: SIYL_BAG.get().map((x) => x.id + ':' + x.name + ':' + x.price), total: SIYL_BAG.total(), state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'wedstay')) }));
  note('riverside-my-trip-and-bag', held.body && held.body.mine && held.body.mine.wedstay && /riverside/.test(held.body.mine.wedstay.key) && trip.state === 'selected' && trip.bag.some((x) => /^riverside:Riverside Hotel Vientiane:60$/.test(x)) && trip.total === 60 && /Riverside Hotel Vientiane/.test(trip.stage), JSON.stringify({ held: held.body && held.body.mine, bag: trip.bag, total: trip.total }).slice(0, 220));
  await shot(p, '390-my-trip-riverside');
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); const cart = await p.$eval('main', (e) => e.innerText.replace(/\s+/g, ' '));
  note('riverside-my-bag', /Riverside Hotel Vientiane/.test(cart) && /USD 60/.test(cart) && /Room A/i.test(cart), cart.slice(0, 200));
  /* CODEX 012-1 · switching hotels through the pages: the Souphattra card on The Journey and the Souphattra room page say what
     they replace, the choice leaves ONE Bag line (USD 145, never 205), the engine holds Souphattra alone, readiness names no
     stale room; and back again through the Riverside room page */
  await p.goto(O + '/journeys.html#j-wedstay', { waitUntil: 'load' }); await p.waitForTimeout(1800);
  const jn = await p.$eval('[data-stayact="wedstay"]', (e) => e.innerText.replace(/\s+/g, ' '));
  note('switch-journey-card-names-the-riverside', /Your trip currently holds Superior Room With Window at Riverside Hotel Vientiane for this stay — choosing a room here replaces it\./.test(jn), jn.slice(0, 200));
  await p.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const swapNote = await p.evaluate(() => [...document.querySelectorAll('[data-swap]')].filter((e) => !e.hidden).map((e) => e.textContent).join(' | '));
  note('switch-room-page-names-the-riverside', /Your trip currently holds Superior Room With Window at Riverside Hotel Vientiane for this stay — adding this room replaces it\./.test(swapNote), swapNote.slice(0, 200));
  await p.click('[data-join="wedstay|heritage|A"]'); await p.waitForTimeout(2400);
  const j = await api(p, '/api/rooms?invitation=INV-T001', { method: 'GET' });
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const sw = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.price), total: SIYL_BAG.total(), missing: SIYL_GUEST.missingFor('journey').map((m) => m.key).filter((k) => /^room:/.test(k)), stale: SIYL_GUEST.staleFor().length }));
  note('switch-one-line-one-hold', sw.bag.length === 1 && sw.bag[0] === 'wedstay:145' && sw.total === 145 && sw.missing.length === 0 && sw.stale === 0 && j.body.mine.wedstay.key === 'wedstay/heritage' && j.body.units['riverside/superior-window'][0].taken === 0 && j.body.units['wedstay/heritage'][0].taken >= 1 && j.body.units['wedstay/heritage'][0].occupants.filter((o) => !o.placeholder).length === 1,   /* release 014: her place, and a place kept for her party member */ JSON.stringify({ sw, mine: j.body.mine }).slice(0, 240));
  await p.goto(O + '/room.html?stay=riverside&room=superior-window', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const swapBack = await p.evaluate(() => [...document.querySelectorAll('[data-swap]')].filter((e) => !e.hidden).map((e) => e.textContent).join(' | '));
  note('switch-back-names-souphattra', /Your trip currently holds The Heritage at Souphattra Heritage Vientiane for this stay — adding this room replaces it\./.test(swapBack), swapBack.slice(0, 200));
  await p.click('[data-join="riverside|superior-window|A"]'); await p.waitForTimeout(2400);
  const back = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.price), total: SIYL_BAG.total() }));
  const j2 = await api(p, '/api/rooms?invitation=INV-T001', { method: 'GET' });
  note('switch-back-one-line', back.bag.length === 1 && back.bag[0] === 'riverside:60' && back.total === 60 && j2.body.mine.wedstay.key === 'riverside/superior-window' && j2.body.units['wedstay/heritage'][0].taken === 0, JSON.stringify({ back, mine: j2.body.mine }).slice(0, 200));
  for (const stage of ['wedstay']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage }) });
  await p.evaluate(() => { ['siyl.bag', 'siyl.skip', 'siyl.skip.by', 'siyl.guest'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close();
}

/* ===== 7 · THE HOUSES and widths ===== */
for (const w of [320, 834]) { const p = await fresh(w); const over = [];
  for (const f of ['journeys.html', 'accommodation.html', 'experiences.html', 'experience.html?id=bkk-thongsmith', 'experience.html?id=vte-laoderm', 'room.html?stay=riverside&room=superior-window']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) over.push(f + ':' + ov); }
  /* superseded by release 014 (Owner, 19 Sep 2026): THE HOUSES carries the Riverside photograph and the Guest House complimentary — no pending card, no "Private Residence" */
  const houses = await p.goto(O + '/accommodation.html', { waitUntil: 'load' }).then(() => p.waitForTimeout(900)).then(() => p.evaluate(() => ({ riverside: /Riverside Hotel/.test(document.body.innerText), seven: /Seven places/.test(document.body.innerText), pend: !!document.querySelector('.am.am-pend') || /Photography to follow/i.test(document.body.innerText), riversideImg: [...document.querySelectorAll('.am')].some((e) => /stay=riverside/.test(decodeURIComponent(e.getAttribute('href') || '')) && /images\/riverside\//.test(e.style.backgroundImage)), guesthouse: /Guest House complimentary/.test(document.body.innerText), residence: /Private Residence/i.test(document.body.innerText) })));
  note('width-' + w, over.length === 0 && houses.riverside && houses.seven && !houses.pend && houses.riversideImg && houses.guesthouse && !houses.residence, (over.join(', ') || 'no overflow') + ' · ' + JSON.stringify(houses)); if (w === 834) await shot(p, '834-houses'); await p.context().close(); }
note('console-errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'no script or console error on any visited page');
await b.close(); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
