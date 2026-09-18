/* LIVE VERIFICATION of the Worker release (Owner, 18 Sep 2026). Fresh browser contexts against the live origin.
   Read-only signed-out checks on every public page (the sticky shell, the wording, no github.io, the new asset stamps,
   no console errors), then — only when synthetic codes are given — the controlled signed-in flow with a synthetic guest:
   contact → room hold → My Bag total → remove → USD 0 → Save → reload → sign out / in → Review readiness → a second
   device's stale copy refused → cleanup (the room released). Writes <out>/live-verify.json. Exits 1 on any failure.
     node docs/acceptance/2026-09-18-aman-geometry/live-verify.mjs <origin> <outDir> [codes.json] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3], CODES = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null; fs.mkdirSync(OUT, { recursive: true });
const R = []; let fails = 0; const ok = (id, cond, d) => { R.push({ id, ok: !!cond, d: String(d).slice(0, 220) }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 160)); if (!cond) fails++; };
const b = await chromium.launch();
const fresh = async (w = 390) => { const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 1000 }, deviceScaleFactor: w <= 390 ? 2 : 1, isMobile: w <= 390, hasTouch: w <= 390 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120))); return { ctx, p, errs }; };
/* ---- signed out, read-only ---- */
{
  const { ctx, p, errs } = await fresh(390);
  for (const [name, url, expectText] of [['home', 'index.html', 'One invitation'], ['destinations', 'destination.html', 'Thailand, Laos'], ['stays', 'accommodation.html', 'Six places'], ['the-journey', 'journeys.html', 'The Journey'], ['wedding', 'voyage.html', 'The Wedding'], ['experiences', 'experiences.html', 'Experiences'], ['invitation', 'invitation.html?open=1', 'Enter your private invitation code']]) {
    const r = await p.goto(O + '/' + url, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    const html = await p.content();
    ok('live-' + name + '-200', r && r.status() === 200, r && r.status());
    ok('live-' + name + '-text', html.includes(expectText), expectText);
    ok('live-' + name + '-no-github', !/seeyouinlaos\.github\.io/.test(html), 'no github.io in the served page');
    ok('live-' + name + '-no-retired-label', !/Your Journey|Journey Bag|Fully booked|Continue Your Journey/.test(html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'no retired label');
    /* release 011 (Aman header): one band — menu · wordmark · bag, nothing beneath; the way in lives in the menu drawer */
    const shell = await p.evaluate(() => { const h = document.querySelector('header.hd'); return { sticky: h && getComputedStyle(h).position, under: !!(h && h.querySelector('.hd-access, [data-account]')), h: h && Math.round(h.getBoundingClientRect().height), words: h && h.innerText.replace(/\s+/g, ' ').trim() }; });
    ok('live-' + name + '-shell', shell.sticky === 'sticky' && !shell.under && shell.h <= 64 && shell.words === 'see you in laos.', JSON.stringify(shell));
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6)); await p.waitForTimeout(400);
    const after = await p.evaluate(() => { const a = document.querySelector('header.hd a.bag'); const r = a && a.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null; });
    ok('live-' + name + '-shell-scrolled', after && after.top >= 0 && after.bottom <= 844, JSON.stringify(after));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300); await p.dispatchEvent('header.hd .hb, header.hd #menu-open', 'click').catch(() => {}); await p.waitForSelector('body.a-open [data-account]', { state: 'visible', timeout: 5000 }).catch(() => {});
    const drawer = await p.evaluate(() => ((document.querySelector('body.a-open [data-account]') || {}).innerText || '').replace(/\s+/g, ' ').trim());
    ok('live-' + name + '-drawer-way-in', /Open your invitation/i.test(drawer), drawer); await p.keyboard.press('Escape');
    if (name === 'home') { const stamps = [...html.matchAll(/assets\/(aman|prep)\.css\?v=([0-9a-f]{8})/g)].map((m) => m[1] + '=' + m[2]); ok('live-asset-stamps', stamps.length >= 1, stamps.join(' ')); }
    await p.screenshot({ path: path.join(OUT, 'live-' + name + '-390.png') });
  }
  ok('live-signed-out-no-page-errors', errs.length === 0, errs.join(' | ') || 'none');
  await ctx.close();
}
/* ---- the API surface, read-only ---- */
{
  const r = await fetch(O + '/api/rooms/availability', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
  ok('live-api-reachable', r && r.status < 500, r && r.status);
  const priv = await fetch(O + '/api/draft').catch(() => null); ok('live-api-draft-private', priv && priv.status === 401, priv && priv.status);
  const reg = await fetch(O + '/register/auth-index.json').catch(() => null); const j = reg && reg.ok ? await reg.json() : null; ok('live-auth-index-served', j && j.v === 2 && j.entries && !JSON.stringify(j).match(/[A-Za-z]{2,} [A-Za-z]{2,}/), 'one-way ids only · ' + (j ? Object.keys(j.entries).length : 0) + ' entries');
}
/* ---- signed in with a synthetic guest (controlled) ---- */
if (CODES) {
  const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', CODES[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
  const api = (p, path, body) => p.evaluate(async ([path, body]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, body]);
  const bag = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('siyl.bag') || '[]'));
  const A = await fresh(390); const p = A.p;
  await signIn(p, 'T001');
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', 'ada.live@example.org'); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0001'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1800);
  await p.click('header.hd .hb, header.hd #menu-open'); await p.waitForTimeout(500); const hdr = await p.evaluate(() => ((document.querySelector('body.a-open [data-account]') || {}).innerText || '').replace(/\s+/g, ' ').trim()); ok('live-signed-in-drawer', /My Trip.*My Profile.*Sign out/i.test(hdr) && !/My Bag/i.test(hdr), hdr); await p.keyboard.press('Escape');
  const j = await api(p, '/api/rooms/join', { invitationId: 'INV-T001', guestId: 'T001', key: 'bkk-stay/u-sathorn-superior-garden', label: 'F', name: 'Ada' }); ok('live-room-hold', j.status === 200, j.status + ' ' + JSON.stringify(j.body).slice(0, 80));
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const total1 = await p.evaluate(() => (document.querySelector('.jb-t') || {}).textContent); ok('live-bag-total', /USD 192/.test(total1 || ''), total1);
  await p.screenshot({ path: path.join(OUT, 'live-my-bag-390.png') });
  await p.click('[data-remove="bkk-stay"]'); await p.waitForFunction(() => JSON.parse(localStorage.getItem('siyl.bag') || '[]').length === 0, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  const total0 = await p.evaluate(() => (document.querySelector('.jb-t') || {}).textContent); ok('live-bag-empty', /USD 0/.test(total0 || '') && (await bag(p)).length === 0, total0);
  await p.screenshot({ path: path.join(OUT, 'live-my-bag-empty-390.png') });
  const saved = await p.evaluate(async () => { const r = await SIYL_DRAFT.flush('save'); return { ok: r && r.ok, phase: SIYL_DRAFT.state().phase }; }); ok('live-save', saved.ok && saved.phase === 'saved', JSON.stringify(saved));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500); ok('live-reload-empty', (await bag(p)).length === 0, 'bag after reload');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, 'live-my-trip-390.png') });
  const arr = await p.evaluate(() => !!document.querySelector('[data-arranged]')); ok('live-my-trip-no-arranged-for-a-normal-guest', !arr, 'no Arranged for you card for a normal guest');
  /* a second device with a stale copy cannot restore the removed room */
  const B = await fresh(390); await signIn(B.p, 'T001'); await B.p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await B.p.waitForTimeout(2500);
  const stale = await B.p.evaluate(async () => { const m = JSON.parse(localStorage.getItem('siyl.draft.meta')); const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/draft', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: a.invitationId, keys: { 'siyl.bag': JSON.stringify([{ id: 'bkk-stay', price: 192, qty: 1 }]) }, baseUpdatedAt: '2000-01-01T00:00:00.000Z' }) }); return { status: r.status, cur: m && m.serverUpdatedAt }; }); ok('live-stale-device-refused', stale.status === 409, JSON.stringify(stale));
  await B.ctx.close();
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(OUT, 'live-review-390.png') });
  const rv = await p.evaluate(() => ({ h: (document.querySelector('#send') || {}).textContent, total: (document.querySelector('.jb-t') || {}).textContent })); ok('live-review-total', /USD 0/.test(rv.total || ''), JSON.stringify(rv));
  /* cleanup: the room was already released by the remove; nothing else is held */
  const av = await api(p, '/api/rooms/leave', { invitationId: 'INV-T001', guestId: 'T001', stage: 'bkk-stay' }); ok('live-cleanup-room', av.status === 200 || av.status === 404, av.status);
  await p.evaluate(() => { try { SIYL_INVITE.leave(); } catch (e) {} });
  await A.ctx.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'live-verify.json'), JSON.stringify({ origin: O, at: new Date().toISOString(), results: R }, null, 1));
console.log(`LIVE VERIFY: ${R.length} checks · ${fails} failures`);
process.exit(fails ? 1 : 0);
