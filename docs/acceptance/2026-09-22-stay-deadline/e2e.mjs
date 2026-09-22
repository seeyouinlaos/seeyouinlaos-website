/* ============================================================================
   THE ACCOMMODATION DEADLINE · THE LIMITED COMPLIMENTARY STAY · THE EXTENSION
   (Owner, 22 Sep 2026) — the served proof.

   1 · the front page: the bar counts the days from today, names the date, shows
       the places the engine has left, and its call follows the guest.
   2 · the complimentary allocation: the engine's own count, the last place, the
       refusal of a seventh guest — and the words the guest reads.
   3 · My Profile: the confirmed stay first, one bar with one dropdown of
       exactly 1 · 2 · 3 · 4 nights, the review, the confirmation, the change
       (never a second booking) and the discreet removal that leaves the
       complimentary stay exactly as it was.
   4 · the amounts: 30 · 60 · 90 · 120 USD, breakfast included, the designated
       hotel, the dates derived — the server's answer, not the page's.

   Synthetic guests on the stage only (T001 · T002 · T003); every hold they take
   is released again at the end. Never run against production with codes.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 220 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const fresh = async (w, h) => {
  const width = w || 1194, height = h || 834;
  const ctx = await (width <= 430 ? wk : b).newContext(width <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width, height } }) : { viewport: { width, height } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|409|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); });
  return p;
};
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 72 }); };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1800);
};
const api = (p, path, init) => p.evaluate(async ([u, i]) => {
  const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null');
  const h = { 'content-type': 'application/json' }; if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
  const r = await fetch(u, Object.assign({ headers: h, cache: 'no-store' }, i || {}));
  return { status: r.status, body: await r.json().catch(() => null) };
}, [path, init]);
const rooms = (p, op, body) => api(p, '/api/rooms/' + op, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
const ID = (g) => ({ invitationId: 'INV-' + g, guestId: g });

/* every synthetic guest starts and ends with nothing held */
const clear = async (p, g) => {
  for (const stage of ['wedstay', 'stayext']) await rooms(p, 'leave', Object.assign({ stage }, ID(g)));
  await rooms(p, 'unextend', ID(g));
};

/* ===== 1 · THE FRONT PAGE BAR, at every class ===== */
for (const [w, h, name] of [[390, 844, '390'], [834, 1194, '834x1194'], [1194, 834, '1194x834'], [1440, 900, '1440']]) {
  const p = await fresh(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1600);
  const bar = await p.evaluate(() => {
    const el = document.querySelector('[data-stay-bar]'); if (!el) return null;
    const r = el.getBoundingClientRect(), cta = el.querySelector('[data-stay-cta]');
    return { phase: el.getAttribute('data-stay-phase'), days: +el.getAttribute('data-stay-days'),
      text: el.innerText.replace(/\s+/g, ' ').trim(), cta: cta ? cta.getAttribute('href') : null, ctaWords: cta ? cta.innerText.trim() : '',
      h: Math.round(r.height), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const daysNow = Math.round((Date.UTC(2026, 10, 30) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  note('bar-' + name, !!bar && bar.phase === (daysNow > 0 ? 'open' : daysNow === 0 ? 'last-day' : 'closed') && bar.days === Math.max(0, daysNow) &&
    /Accommodation planning/i.test(bar.text) && /30 November 2026/.test(bar.text) && /of 6 places remaining/i.test(bar.text) &&
    /days remaining/i.test(bar.text) && bar.cta === 'invitation.html' && bar.ov <= 1 && bar.h > 40 && bar.h < 220 &&
    !/hurry|book now|almost gone|last chance/i.test(bar.text), JSON.stringify(bar));
  await p.evaluate(() => document.querySelector('[data-stay-bar]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await shot(p, name + '-deadline-bar');
  await p.context().close();
}

/* ===== 2 · THE COMPLIMENTARY ALLOCATION, as the engine counts it ===== */
{
  const p = await fresh(1194, 834); await signIn(p, 'T001'); await clear(p, 'T001');
  const before = await rooms(p, 'read');
  const max = before.body.complimentary.max, free0 = before.body.complimentary.remaining;
  const joined = await rooms(p, 'join', Object.assign({ key: 'guesthouse/guest-house', label: 'A', name: 'Ada', need: 1 }, ID('T001')));
  const after = joined.body.complimentary;
  note('complimentary-count-is-the-engine', max === 6 && joined.status === 200 && after.remaining === free0 - 1 && after.max === 6 && after.mine === true,
    JSON.stringify({ max, free0, after: { remaining: after.remaining, taken: after.taken, mine: after.mine, phase: after.phase } }));
  /* the words the guest reads about the category, in the booking flow */
  await p.goto(O + '/your-journey.html#stays', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const words = await p.evaluate(() => {
    const U = window.SIYL_UNITS, P = window.SIYL_STAY_PLAN;
    const s = U.summary('guesthouse', 'guest-house');
    return { label: U.label('guesthouse', 'guest-house'), free: s.remainingPlaces, max: s.sourcePlaces,
      available: P.complimentaryWords(4, 6, new Date()).headline, one: P.complimentaryWords(1, 6, new Date()).headline,
      full: P.complimentaryWords(0, 6, new Date()).headline, closed: P.complimentaryWords(3, 6, new Date('2026-12-05T12:00:00')).headline,
      detail: P.complimentaryWords(4, 6, new Date()).detail };
  });
  note('complimentary-states', /Your place is held/.test(words.label) && words.available === '4 of 6 places remaining' && words.one === '1 of 6 places remaining' &&
    words.full === 'Complimentary stay fully allocated' && words.closed === 'Complimentary accommodation planning closed' &&
    /Available until 30 November 2026 or until fully allocated\./.test(words.detail), JSON.stringify(words));
  await p.context().close();
}

/* ===== 3 · MY PROFILE: the stay, the bar, the review, the change, the removal ===== */
{
  const p = await fresh(1194, 834); await signIn(p, 'T001');
  await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2400);
  const base = await p.evaluate(() => {
    const sec = document.querySelector('#your-stay'); if (!sec) return null;
    const sel = sec.querySelector('[data-ext-select]');
    return { text: sec.innerText.replace(/\s+/g, ' ').trim(),
      options: sel ? [...sel.options].map((o) => o.text) : null, value: sel ? sel.value : null,
      hasReview: !!sec.querySelector('[data-ext-review]'), hasRemove: !!sec.querySelector('[data-ext-remove]') };
  });
  note('profile-stay-and-bar', !!base && /Complimentary stay/i.test(base.text) && /Guest House complimentary/i.test(base.text) &&
    /27 February – 01 March 2027/.test(base.text) && /USD 0/.test(base.text) && /Extend your stay/i.test(base.text) &&
    JSON.stringify(base.options) === JSON.stringify(['Select additional nights', '1 night', '2 nights', '3 nights', '4 nights']) &&
    base.value === '' && !base.hasReview && !base.hasRemove, JSON.stringify(base));
  await p.evaluate(() => document.querySelector('#your-stay').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await shot(p, '1194x834-profile-stay');

  /* the review, before anything is booked */
  await p.selectOption('[data-ext-select]', '2'); await p.waitForTimeout(500);
  const review = await p.evaluate(() => {
    const r = document.querySelector('[data-ext-review]');
    return r ? { text: r.innerText.replace(/\s+/g, ' ').trim(), confirm: !!r.querySelector('[data-ext-confirm]') } : null;
  });
  const held0 = await rooms(p, 'read');
  note('extension-review-does-not-book', !!review && /2 additional nights/.test(review.text) && /01 March – 03 March 2027/.test(review.text) &&
    /Riverside Hotel Vientiane/.test(review.text) && /USD 60 total/.test(review.text) && /Breakfast included/.test(review.text) && review.confirm &&
    held0.body.extension === null && held0.body.summary['stayext/riverside-superior'].guestOccupiedPlaces === 0,
    JSON.stringify({ review, heldPlaces: held0.body.summary['stayext/riverside-superior'].guestOccupiedPlaces }));
  await shot(p, '1194x834-extension-review');

  /* the confirmation */
  await p.click('[data-ext-confirm]'); await p.waitForTimeout(2200);
  const done = await p.evaluate(() => {
    const sec = document.querySelector('#your-stay');
    const sel = sec.querySelector('[data-ext-select]');
    return { text: sec.innerText.replace(/\s+/g, ' ').trim(), value: sel ? sel.value : null, hasRemove: !!sec.querySelector('[data-ext-remove]') };
  });
  const server = await rooms(p, 'read');
  note('extension-confirmed', /Extended stay/i.test(done.text) && /Riverside Hotel Vientiane/.test(done.text) && /2 additional nights/.test(done.text) &&
    /USD 60/.test(done.text) && /Breakfast included/.test(done.text) && done.value === '2' && done.hasRemove &&
    server.body.extension && server.body.extension.nights === 2 && server.body.extension.total === 60 &&
    server.body.mine.wedstay && server.body.mine.wedstay.key === 'guesthouse/guest-house',
    JSON.stringify({ value: done.value, ext: server.body.extension && { n: server.body.extension.nights, total: server.body.extension.total, hotel: server.body.extension.hotel, dates: server.body.extension.dates }, base: server.body.mine.wedstay }));
  await shot(p, '1194x834-extension-confirmed');

  /* every amount, and a change that updates the one booking */
  const amounts = [];
  for (const n of [1, 3, 4]) {
    await p.selectOption('[data-ext-select]', String(n)); await p.waitForTimeout(400);
    await p.click('[data-ext-confirm]'); await p.waitForTimeout(1800);
    const v = await rooms(p, 'read');
    amounts.push({ n, total: v.body.extension && v.body.extension.total, places: v.body.summary['stayext/riverside-superior'].guestOccupiedPlaces });
  }
  note('extension-amounts-and-single-booking', JSON.stringify(amounts) === JSON.stringify([{ n: 1, total: 30, places: 1 }, { n: 3, total: 90, places: 1 }, { n: 4, total: 120, places: 1 }]),
    JSON.stringify(amounts) + ' (1 → 30 · 3 → 90 · 4 → 120 · always ONE room held)');

  /* the removal, and the base stay after it */
  await p.click('[data-ext-remove]'); await p.waitForTimeout(500);
  const ask = await p.evaluate(() => (document.querySelector('#your-stay').innerText || '').replace(/\s+/g, ' ').trim());
  await shot(p, '1194x834-extension-remove');
  await p.click('[data-ext-remove-yes]'); await p.waitForTimeout(2200);
  const gone = await rooms(p, 'read');
  const sec = await p.evaluate(() => (document.querySelector('#your-stay').innerText || '').replace(/\s+/g, ' ').trim());
  note('extension-removed-base-intact', /Remove your extension\?/i.test(ask) && gone.body.extension === null &&
    gone.body.mine.wedstay.key === 'guesthouse/guest-house' && gone.body.complimentary.mine === true &&
    /Complimentary stay/i.test(sec) && !/Extended stay/i.test(sec), JSON.stringify({ asked: /Remove your extension\?/i.test(ask), ext: gone.body.extension, base: gone.body.mine.wedstay }));
  await p.context().close();
}

/* ===== 4 · THE SERVER IS AUTHORITATIVE ===== */
{
  const p = await fresh(1194, 834); await signIn(p, 'T002'); await clear(p, 'T002');
  const bad = [];
  for (const n of [0, 5, -1, 'two']) { const r = await rooms(p, 'extend', Object.assign({ nights: n }, ID('T002'))); bad.push(r.status + ':' + (r.body && r.body.error)); }
  const stale = await rooms(p, 'extend', Object.assign({ nights: 2, expect: 45 }, ID('T002')));
  const ok = await rooms(p, 'extend', Object.assign({ nights: 2, expect: 60 }, ID('T002')));
  const read = await rooms(p, 'read');
  note('server-authoritative', bad.every((x) => /^400:invalid nights$/.test(x)) && stale.status === 409 && stale.body.error === 'price changed' &&
    stale.body.quote.total === 60 && ok.status === 200 && ok.body.extension.total === 60 && read.body.extension.hotel === 'Riverside Hotel Vientiane' &&
    read.body.extension.from === '2027-03-01' && read.body.extension.to === '2027-03-03' && read.body.extension.breakfast === 'Breakfast included',
    JSON.stringify({ bad, stale: stale.body.error, quote: stale.body.quote && stale.body.quote.total, ok: ok.body.extension.total, dates: read.body.extension.dates }));
  /* a guest with no complimentary place may still extend — the paid hotel is independent */
  note('paid-extension-independent', read.body.mine.wedstay === undefined && read.body.extension.nights === 2,
    JSON.stringify({ wedstay: read.body.mine.wedstay || null, ext: read.body.extension.nights }));
  await clear(p, 'T002');
  await p.context().close();
}

/* ===== 5 · the phone, and the bar's call for a guest who has a stay ===== */
{
  const p = await fresh(390, 844); await signIn(p, 'T001');
  await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2400);
  await p.evaluate(() => document.querySelector('#your-stay').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await shot(p, '390-profile-stay');
  const stack = await p.evaluate(() => {
    const bar = document.querySelector('.pf-extbar'), sel = document.querySelector('[data-ext-select]');
    const rb = bar.getBoundingClientRect(), rs = sel.getBoundingClientRect();
    return { stacked: rs.top > rb.top + 8, selW: Math.round(rs.width), tap: Math.round(rs.height), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  note('phone-extension-bar', stack.stacked && stack.tap >= 40 && stack.ov <= 1, JSON.stringify(stack) + ' (the bar stacks, the selector stays a finger-sized target)');
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1800);
  const cta = await p.evaluate(() => { const a = document.querySelector('[data-stay-cta]'); return { href: a.getAttribute('href'), words: a.innerText.trim() }; });
  note('bar-cta-follows-the-guest', cta.href === 'profile.html#your-stay' && /your stay/i.test(cta.words), JSON.stringify(cta));
  await shot(p, '390-deadline-bar-signed-in');
  /* the stage is left as it was found */
  await clear(p, 'T001');
  const end = await rooms(p, 'read');
  note('stage-left-clean', end.body.extension === null && !end.body.mine.wedstay && end.body.complimentary.remaining === end.body.complimentary.max,
    JSON.stringify({ ext: end.body.extension, wedstay: end.body.mine.wedstay || null, remaining: end.body.complimentary.remaining }));
  await p.context().close();
}

note('console-errors', errors.size === 0, errors.size ? [...errors.keys()].slice(0, 4).join(' | ') : 'no script or console error');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 2));
const bad = R.filter((r) => !r.ok);
console.log(bad.length ? 'FAILED: ' + bad.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed');
process.exit(bad.length ? 1 : 0);
