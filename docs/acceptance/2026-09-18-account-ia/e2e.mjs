/* ACCOUNT IA · E2E on the isolated stage worker (Owner correction, 18 Sep 2026). Synthetic guests only (T001 Ada, T003 Cleo,
   G048 the fixed host pair). The nine checks the Owner named, the profile photo round trip, the calm step header.
     node docs/acceptance/2026-09-18-account-ia/e2e.mjs <scratchpad> <outDir> [origin]
   The stage worker must be up (stage-up.sh). Codes are read from the scratchpad's synth-codes.json and never printed. */
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const b = await chromium.launch();
const fresh = async (w) => (await b.newContext({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 })).newPage();
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1600); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) { body = null; } return { status: r.status, body, type: r.headers.get('content-type') }; }, [path, init]);
const selectRoom = async (p, slug, label) => { await p.goto(O + '/room.html?stay=sathorn&room=' + slug, { waitUntil: 'load' }); await p.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|' + label + '"]', { timeout: 20000 }); await p.click('[data-rooms-box="bkk-stay"] [data-join$="|' + label + '"]'); await p.waitForFunction((l) => new RegExp('Your place is held · Room ' + l).test((document.querySelector('[data-av="bkk-stay"]') || {}).textContent || ''), label, { timeout: 20000 }); await p.waitForTimeout(1600); };
const need = (p) => p.evaluate(() => { const r = SIYL_GUEST.readiness(); return { ok: r.ok, n: r.need.length, first: r.first ? r.first.href : null }; });
const openProfile = async (p) => { await p.waitForSelector('header.hd [data-access-nav="profile"]', { timeout: 20000 }); await p.click('header.hd [data-access-nav="profile"]'); await p.waitForLoadState('load'); await p.waitForTimeout(2200); return { url: p.url(), h1: await p.$eval('main h1', (e) => e.textContent).catch(() => ''), gate: !!(await p.$('.prep-gate-note')), identity: !!(await p.$('[data-profile-identity]')) }; };
const completeSteps = async (p, id, name, seats) => {
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(800); await p.evaluate(() => { SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (SIYL_JOURNEY.state(s) === 'open') SIYL_JOURNEY.skip(s.key, true); }); }); await p.waitForTimeout(1500);
  await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(200); } if (await p.$('#sangkhathan [data-off="no"]')) await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(1200);
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200);
  for (const [ev, seatId] of Object.entries(seats)) await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev, seatId, name }) });
  await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['treat', 'Mango'], ['drink', 'Lime'], ['avoid', 'Nothing'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600);
};
/* a real PNG (64 × 64, solid) for the photo round trip — generated here, never a private picture */
function png(size) { const raw = Buffer.alloc((size * 3 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; for (let x = 0; x < size; x++) { const o = y * (size * 3 + 1) + 1 + x * 3; raw[o] = 0x8A; raw[o + 1] = 0x5A; raw[o + 2] = 0x55; } }
  const crc = (buf) => { let c = ~0; for (const v of buf) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return (~c) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }

/* ===== 0 · a clean slate for the synthetic guests (the stage keeps state between runs) ===== */
for (const id of ['T001', 'T003']) { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) });
  await api(p, '/api/profile/photo', { method: 'DELETE' });
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'].forEach((k) => localStorage.removeItem(k)); });
  await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); await fetch('/api/contact', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify({ email: '', phone: '' }) }); });
  await p.context().close(); }

/* ===== A · T001 (Ada), nothing complete ===== */
const A = await fresh(); await signIn(A, 'T001');
await A.goto(O + '/your-journey.html', { waitUntil: 'load' }); await A.waitForTimeout(1500);
const row = await A.$eval('header.hd .hd-access', (e) => e.textContent.replace(/\s+/g, ' ').trim()); const rowLinks = await A.$$eval('header.hd .hd-access [data-access-nav]', (l) => l.map((a) => a.getAttribute('data-access-nav') + '=' + a.getAttribute('href')));
note('4-sticky-row', /My Trip/.test(row) && /My Profile/.test(row) && /Sign out/.test(row) && /^trip=your-journey(\.html)?,profile=profile(\.html)?$/.test(rowLinks.join(',')), row + ' · ' + rowLinks.join(','));
note('5-no-textual-my-bag', !/My Bag/.test(row) && !rowLinks.some((x) => /^bag=/.test(x)) && !(await A.$('.jbar [data-nav="bag"]')), row);
const bagIcon = await A.$eval('header.hd a.bag', (a) => a.getAttribute('href') + '|' + a.getAttribute('aria-label')); note('3-bag-icon-is-my-bag', bagIcon === 'cart.html|My Bag', bagIcon);
const header0 = await A.$eval('.prep-bar', (e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), eyebrow: !!e.querySelector('.prep-eyebrow'), order: [...e.querySelectorAll('.prep-step, .prep-who, .prep-state, .prep-save-btn, .prep-all')].map((x) => x.className.split(' ')[0]).join('>'), h: e.offsetHeight }));
note('calm-step-header', !header0.eyebrow && !/Private/.test(header0.text) && header0.order === 'prep-step>prep-who>prep-state>prep-save-btn>prep-all' && header0.h <= 176, JSON.stringify(header0));
await shot(A, '390-my-trip-header');
const r0 = await need(A); const p0 = await openProfile(A);
note('1-profile-no-redirect-nothing-complete', /\/profile(\.html)?(\?|#|$)/.test(p0.url) && p0.h1 === 'My Profile' && !p0.gate && p0.identity, JSON.stringify(p0) + ' · need ' + r0.n + ' first ' + r0.first);
const r0b = await need(A); note('7-readiness-untouched-by-profile', r0.n === r0b.n && r0.first === r0b.first && r0.ok === r0b.ok, r0.n + ' → ' + r0b.n);
const st0 = await A.$eval('[data-profile-status]', (e) => e.innerText.replace(/\s+/g, ' ')); note('2-state-nothing-complete', /Saved as draft/i.test(st0) && /still needed/i.test(st0), st0.slice(0, 160));
await shot(A, '390-profile-empty');
/* the step deep link with nothing complete still redirects (the gate is alive for the steps) */
await A.goto(O + '/about-you.html', { waitUntil: 'load' }); await A.waitForTimeout(2000); const g6 = { url: A.url(), gate: await A.$eval('.prep-gate-note', (e) => e.textContent).catch(() => '') };
note('6a-about-you-still-gated', !/about-you/.test(g6.url) && /opens once this is complete/.test(g6.gate), JSON.stringify(g6));
/* the bag icon opens My Bag from the profile */
await A.goto(O + '/profile.html', { waitUntil: 'load' }); await A.waitForTimeout(1200); await A.click('header.hd a.bag'); await A.waitForLoadState('load'); note('3-bag-icon-opens-cart', /\/cart(\.html)?/.test(A.url()), A.url());

/* ===== B · partly complete, then a held room, then complete ===== */
await contact(A, 'ada.test@example.org');
const p1 = await openProfile(A); const st1 = await A.$eval('[data-profile-contact]', (e) => e.innerText.replace(/\s+/g, ' '));
note('2-state-partly-complete', /\/profile/.test(p1.url) && !p1.gate && /ada\.test@example\.org/.test(st1) && /\+66 81 000 0000/.test(st1), st1.slice(0, 120));
await selectRoom(A, 'u-sathorn-superior-garden', 'B');
await A.goto(O + '/profile.html', { waitUntil: 'load' }); await A.waitForTimeout(2600);
const line = await A.$eval('[data-profile-item="line:bkk-stay"]', (e) => ({ text: e.innerText.replace(/\s+/g, ' '), img: getComputedStyle(e.querySelector('.pf-img')).backgroundImage })).catch(() => null);
const badge = await A.$eval('[data-bag-badge]', (e) => e.textContent).catch(() => '');
note('8-held-room-on-profile', !!line && /Your place is held · Room B/i.test(line.text) && /url\(/.test(line.img) && /USD 192 · your cost/.test(line.text) && badge === '1', line ? line.text.slice(0, 200) + ' · badge ' + badge : 'no card');
const noTotal = await A.evaluate(() => !document.querySelector('#profile .p-total') && !/Your total/.test(document.querySelector('#profile').innerText)); note('8-no-second-total', noTotal, 'the profile carries no total of its own');
await completeSteps(A, 'T001', 'Ada', { ceremony: 'C-R-05-02', dinner: 'D-T-05' });
const r2 = await need(A); const p2 = await openProfile(A);
const st2 = await A.$eval('[data-profile-status]', (e) => e.innerText.replace(/\s+/g, ' ')); const about2 = await A.$eval('[data-profile-about]', (e) => e.innerText.replace(/\s+/g, ' '));
note('2-state-complete', r2.ok && /\/profile/.test(p2.url) && !p2.gate && /Everything needed is complete/i.test(st2) && /Complete/i.test(about2) && /Edit About You/i.test(about2), st2.slice(0, 120) + ' · ' + about2.slice(0, 80));
const seats = await A.$$eval('[data-profile-ticket]', (l) => l.map((e) => e.getAttribute('data-profile-ticket') + ':' + e.innerText.replace(/\s+/g, ' ').slice(0, 60)));
const wed = await A.$eval('[data-profile-item="wedding:ceremony"]', (e) => e.innerText.replace(/\s+/g, ' '));
note('8-seats-and-tickets', seats.some((s) => /^seat:ceremony/.test(s) && /Held in your name/i.test(s)) && seats.some((s) => /^seat:dinner/.test(s)) && /Seat .* · Held in your name/i.test(wed), seats.join(' | ') + ' · ' + wed.slice(0, 120));
await shot(A, '390-profile-complete'); await A.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45)); await A.waitForTimeout(500); await shot(A, '390-profile-scrolled');
/* about-you: step 05 · About You, reachable now, the bar names it */
await A.goto(O + '/about-you.html', { waitUntil: 'load' }); await A.waitForTimeout(1800); const bar5 = await A.$eval('.prep-bar', (e) => e.innerText.replace(/\s+/g, ' ')); const h15 = await A.$eval('main h1', (e) => e.textContent);
note('6b-about-you-is-step-05', /05 \/ 06 ?About You/.test(bar5) && h15 === 'About You' && !/Private/.test(bar5), bar5.slice(0, 100) + ' · h1 ' + h15);
await shot(A, '390-about-you');
/* review opens now (About You complete) — and would not without it */
await A.goto(O + '/review.html', { waitUntil: 'load' }); await A.waitForTimeout(1800); note('6c-review-opens-when-about-complete', /\/review/.test(A.url()), A.url());
await A.evaluate(() => SIYL_GUEST.setPhotoAck(false)); await A.goto(O + '/review.html', { waitUntil: 'load' }); await A.waitForTimeout(2000); note('6d-review-locked-when-about-incomplete', /about-you/.test(A.url()) && /from=review/.test(A.url()), A.url());
const p3 = await openProfile(A); note('1-profile-no-redirect-with-missing-step', /\/profile/.test(p3.url) && !p3.gate && p3.identity, p3.url);
await A.evaluate(() => SIYL_GUEST.setPhotoAck(true));

/* ===== C · the profile photo round trip ===== */
await A.goto(O + '/profile.html', { waitUntil: 'load' }); await A.waitForTimeout(2000);
const g0 = await api(A, '/api/profile/photo'); note('photo-none-yet', g0.status === 404, 'GET ' + g0.status);
await A.setInputFiles('[data-photo-input]', { name: 'portrait.png', mimeType: 'image/png', buffer: png(64) });
await A.waitForFunction(() => /Photo saved/.test((document.querySelector('[data-photo-note]') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
const noteText = await A.$eval('[data-photo-note]', (e) => e.textContent); const av = await A.$eval('[data-avatar]', (e) => getComputedStyle(e).backgroundImage);
note('photo-upload', /Photo saved/.test(noteText) && /blob:/.test(av), noteText + ' · ' + av.slice(0, 40));
const g1 = await api(A, '/api/profile/photo'); note('photo-stored-jpeg-private', g1.status === 200 && /image\/jpeg/.test(g1.type || ''), 'GET ' + g1.status + ' ' + g1.type);
await A.reload({ waitUntil: 'load' }); await A.waitForTimeout(2500); const av2 = await A.$eval('[data-avatar]', (e) => getComputedStyle(e).backgroundImage); const acts = await A.$eval('[data-photo-actions]', (e) => e.innerText.replace(/\s+/g, ' '));
note('photo-survives-reload', /blob:/.test(av2) && /Change photo/i.test(acts) && /Remove photo/i.test(acts), acts + ' · bg ' + av2.slice(0, 50));
await shot(A, '390-profile-photo');
const C3 = await fresh(); await signIn(C3, 'T003'); const gx = await api(C3, '/api/profile/photo'); note('photo-not-visible-to-another-guest', gx.status === 404, 'T003 GET ' + gx.status); await C3.context().close();
await A.click('[data-photo-remove]'); await A.waitForFunction(() => /Photo removed/.test((document.querySelector('[data-photo-note]') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
const g2 = await api(A, '/api/profile/photo'); const av3 = await A.$eval('[data-avatar]', (e) => getComputedStyle(e).backgroundImage); note('photo-removed', g2.status === 404 && !/blob:/.test(av3), 'GET ' + g2.status);
const bad = await A.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'image/gif' }, body: new Uint8Array([1, 2, 3]) }); const big = await fetch('/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'image/jpeg' }, body: new Uint8Array(1024 * 1024 + 1) }); const anon = await fetch('/api/profile/photo'); return [r.status, big.status, anon.status]; });
note('photo-limits', bad.join(',') === '415,413,401', bad.join(','));

/* ===== D · sign out from the profile header ===== */
await A.goto(O + '/profile.html', { waitUntil: 'load' }); await A.waitForTimeout(1500); await A.click('header.hd [data-access-out]'); await A.waitForTimeout(1500);
const auth = await A.evaluate(() => localStorage.getItem('siyl.auth')); note('9-sign-out', /invitation/.test(A.url()) && !auth, A.url() + ' · auth ' + auth);
await A.goto(O + '/profile.html', { waitUntil: 'load' }); await A.waitForTimeout(1800); note('profile-private-when-signed-out', /invitation/.test(A.url()) && /next=profile/.test(A.url()), A.url());

/* ===== E · the fixed host pair: the arrangement on the profile, never in the bag ===== */
const H = await fresh(); await signIn(H, 'G048'); await H.goto(O + '/profile.html', { waitUntil: 'load' }); await H.waitForTimeout(3000);
const fixed = await H.$eval('[data-profile-item="fixed:bkk-stay"]', (e) => ({ text: e.innerText.replace(/\s+/g, ' '), img: getComputedStyle(e.querySelector('.pf-img')).backgroundImage })).catch(() => null);
const hb = await H.evaluate(() => ({ bag: JSON.parse(localStorage.getItem('siyl.bag') || '[]').length, total: SIYL_BAG.total(), badge: (document.querySelector('[data-bag-badge]') || {}).textContent }));
note('8-fixed-arrangement-not-in-bag', !!fixed && /Arranged for you/i.test(fixed.text) && /Fixed arrangement · not part of your bag/i.test(fixed.text) && !/USD/.test(fixed.text) && /url\(/.test(fixed.img) && hb.bag === 0 && hb.total === 0 && hb.badge === '', (fixed ? fixed.text.slice(0, 160) : 'no card') + ' · ' + JSON.stringify(hb));
await shot(H, '390-profile-host');

/* ===== F · the widths: the profile and the step header at 320 · 834 · 1440 ===== */
for (const w of [320, 834, 1440]) { const p = await fresh(w); await signIn(p, 'T001'); await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2600); const ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); await shot(p, w + '-profile'); await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1600); const ov2 = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); await shot(p, w + '-my-trip-header'); note('width-' + w, !ov && !ov2, 'no horizontal overflow: profile ' + !ov + ' · my trip ' + !ov2); await p.context().close(); }

fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
const fails = R.filter((x) => !x.ok).length; console.log('\n' + (fails ? 'E2E FAILED · ' + fails + ' of ' + R.length : 'E2E PASSED · ' + R.length + ' checks')); await b.close(); process.exit(fails ? 1 : 0);
