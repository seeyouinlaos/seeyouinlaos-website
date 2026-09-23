/* ============================================================================
   THE ACCOMMODATION DEADLINE · THE LIMITED COMPLIMENTARY STAY · THE EXTENSION
   (Owner, 22 Sep 2026) — the served proof.

   1 · the front page: TWO DECISION SIGNALS, never merged (Owner, 23 Sep 2026) —
       the bar counts the days from today and names the date, and nothing else;
       the availability object beneath it draws the places the engine has left in
       the one Cherry accent, opens the property quietly, and carries the single
       call, which follows the guest. 1b proves the entrance, reduced motion and
       the signed-in path.
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

/* ===== 1 · THE TWO DECISION SIGNALS ON THE FRONT PAGE, at every class =====
   The Owner's rule (23 Sep 2026): the accommodation-planning date and the live
   availability object are two distinct signals, never merged, in this order —
   planning → closing date → the object → the property → the invitation. The bar
   carries the DATE alone; the object carries the COUNT, the property link and
   the one action. ===== */
for (const [w, h, name] of [[390, 844, '390'], [834, 1194, '834x1194'], [1194, 834, '1194x834'], [1440, 900, '1440']]) {
  const p = await fresh(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  await p.evaluate(() => { const el = document.querySelector('[data-availability]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(2200);
  const two = await p.evaluate(() => {
    const bar = document.querySelector('[data-stay-bar]'), av = document.querySelector('[data-availability]');
    if (!bar || !av) return null;
    const br = bar.getBoundingClientRect(), ar = av.getBoundingClientRect();
    const cta = av.querySelector('[data-av-cta]'), ex = av.querySelector('[data-av-explore]');
    const cs = (el) => el ? getComputedStyle(el) : null, c1 = cs(cta), c2 = cs(ex);
    const arc = av.querySelector('.av-arc'), run = av.querySelector('.av-run'), dot = av.querySelector('.av-dot');
    return {
      barPhase: bar.getAttribute('data-stay-phase'), barDays: +bar.getAttribute('data-stay-days'),
      barText: bar.innerText.replace(/\s+/g, ' ').trim(), barCta: bar.querySelectorAll('a').length,
      order: br.bottom <= ar.top + 2 && (bar.compareDocumentPosition(av) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
      avState: av.getAttribute('data-av-state'), remaining: +av.getAttribute('data-av-remaining'), max: +av.getAttribute('data-av-max'),
      avElapsed: +av.getAttribute('data-av-elapsed'), barElapsed: +bar.getAttribute('data-stay-elapsed'), barRail: !!bar.querySelector('[data-stay-rail]'),
      avText: av.innerText.replace(/\s+/g, ' ').trim(),
      /* THE COMPACT COMPOSITION: the ring beside its status, the whole object a small part of the screen */
      avShare: +((av.getBoundingClientRect().height / window.innerHeight) * 100).toFixed(1),
      ring: Math.round(av.querySelector('.av-ring').getBoundingClientRect().width),
      sideBySide: (function () { const r = av.querySelector('.av-ring').getBoundingClientRect(), w = av.querySelector('.av-words').getBoundingClientRect();
        return w.left > r.right - 1 && Math.abs((w.top + w.height / 2) - (r.top + r.height / 2)) < r.height; })(),
      /* 5 / 6 ON ONE LINE: three boxes beside one another, never three stacked */
      oneLine: (function () { const k = [...av.querySelector('.av-num').children].map((e) => e.getBoundingClientRect());
        return k.every((b, i) => i === 0 || (b.left >= k[i - 1].right - 1 && b.top < k[i - 1].bottom && b.bottom > k[i - 1].top)); })(),
      count: av.querySelector('.av-num').innerText.replace(/\s+/g, ' ').trim(),
      aligned: Math.abs(av.querySelector('.av-eyebrow').getBoundingClientRect().left - bar.querySelector('.sbar-eyebrow').getBoundingClientRect().left) <= 1,
      arc: arc ? getComputedStyle(arc).stroke : '', run: run ? getComputedStyle(run).backgroundColor : '', dot: dot ? getComputedStyle(dot, '::before').backgroundColor : '',
      ctaHref: cta ? cta.getAttribute('href') : null, ctaWords: cta ? cta.innerText.replace(/\s+/g, ' ').trim() : '',
      exHref: ex ? ex.getAttribute('href') : null, exWords: ex ? ex.innerText.replace(/\s+/g, ' ').trim() : '',
      ctaSize: c1 ? parseFloat(c1.fontSize) : 0, exSize: c2 ? parseFloat(c2.fontSize) : 0,
      ctaColor: c1 ? c1.color : '', ctaRule: c1 ? c1.borderBottomColor : '',
      exBorder: c2 ? (c2.borderBottomColor + '|' + c2.backgroundColor) : '', exColor: c2 ? c2.color : '',
      links: av.querySelectorAll('a').length,
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  const daysNow = Math.round((Date.UTC(2026, 10, 30) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  const cherry = 'rgb(116, 7, 14)';
  /* the first signal: the date alone — no count, no action */
  note('bar-date-only-' + name, !!two && two.barPhase === (daysNow > 0 ? 'open' : daysNow === 0 ? 'last-day' : 'closed') && two.barDays === Math.max(0, daysNow) &&
    /Accommodation planning/i.test(two.barText) && /30 November 2026/.test(two.barText) && /days remaining|Last day|closed/i.test(two.barText) &&
    !/places remaining/i.test(two.barText) && two.barCta === 0 && two.barRail &&
    !/hurry|book now|almost gone|last chance/i.test(two.barText), JSON.stringify({ phase: two && two.barPhase, days: two && two.barDays, text: two && two.barText, links: two && two.barCta }));
  /* the second signal: the engine's own count, the one accent, the one action, the quiet property link */
  note('availability-object-' + name, !!two && two.order && two.aligned && two.max === 6 && two.remaining >= 0 && two.remaining <= 6 &&
    /Wedding Stay · Limited availability/i.test(two.avText) && two.count === two.remaining + ' / ' + two.max && two.oneLine &&
    /REMAINING/i.test(two.avText) && two.sideBySide && two.ring <= 82 &&
    /Complimentary Wedding Stay/.test(two.avText) && /while places remain\./.test(two.avText) &&
    !/Private Residence/i.test(two.avText) && !/Vientiane/.test(two.avText) &&
    /Now/.test(two.avText) && /30 Nov/.test(two.avText) &&
    /Your invitation shows what is still available for you\./.test(two.avText) && /availability may close earlier/.test(two.avText) &&
    two.arc === cherry && two.run === cherry && two.dot === cherry &&
    two.ctaHref === 'invitation.html' && /OPEN YOUR INVITATION/i.test(two.ctaWords) &&
    two.exHref === 'accommodation.html#residence' && /See the Guest House/i.test(two.exWords) &&
    two.exSize <= two.ctaSize && /rgba\(0, 0, 0, 0\)|transparent/.test(two.exBorder.split('|')[0]) &&
    /rgba\(0, 0, 0, 0\)|transparent/.test(two.exBorder.split('|')[1]) && two.exColor !== two.ctaColor &&
    !/rgba\(0, 0, 0, 0\)|transparent/.test(two.ctaRule) &&
    two.links === 2 && two.ov <= 1 && two.avState === 'settled' &&
    !/hurry|book now|almost gone|last chance|only \d+ left/i.test(two.avText), JSON.stringify(two));
  /* THE COMPACT TEST (Owner, 23 Sep 2026): the object is a part of the page, never most of the screen */
  note('availability-stays-compact-' + name, !!two && two.avShare <= 42, 'the object takes ' + (two && two.avShare) + ' % of the ' + h + ' px screen · ring ' + (two && two.ring) + ' px');
  /* THE LINE IS CALENDAR TIME (Owner, 23 Sep 2026): the elapsed share of real days between 23 September 2026 and the END of
     30 November 2026 — computed here from today's date, never read back from the page, and never the allocation. */
  const t0 = Date.UTC(2026, 8, 23), t1 = Date.UTC(2026, 10, 30) + 86400000;
  const now = new Date(); const tNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = +(Math.min(1, Math.max(0, (tNow - t0) / (t1 - t0)))).toFixed(4);
  note('timeline-is-the-calendar-' + name, !!two && two.avElapsed === elapsed && two.barElapsed === elapsed,
    JSON.stringify({ expected: elapsed, object: two && two.avElapsed, bar: two && two.barElapsed, occupancy: two && +(((two.max - two.remaining) / two.max).toFixed(4)) }));
  await shot(p, name + '-two-signals');
  await p.context().close();
}

/* ===== 1b · THE MOTION AND THE AUTHENTICATED PATH ===== */
{
  /* reduced motion: the object arrives settled, with no entrance at all */
  const ctx = await b.newContext({ viewport: { width: 1194, height: 834 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  const calm = await p.evaluate(() => {
    const av = document.querySelector('[data-availability]'); if (!av) return null;
    const arc = av.querySelector('.av-arc'), dot = av.querySelector('.av-dot');
    return { state: av.getAttribute('data-av-state'), arcAnim: getComputedStyle(arc).animationName, dotAnim: getComputedStyle(dot).animationName,
      inAnim: getComputedStyle(av.querySelector('.av-in')).animationName };
  });
  note('availability-respects-reduced-motion', !!calm && calm.state === 'settled' && calm.arcAnim === 'none' && calm.dotAnim === 'none' && calm.inAnim === 'none', JSON.stringify(calm));
  await ctx.close();

  /* the entrance plays once, on the first sight of the object, and never again */
  const p2 = await fresh(1194, 834);
  await p2.goto(O + '/index.html', { waitUntil: 'load' }); await p2.waitForTimeout(1400);
  const before = await p2.evaluate(() => (document.querySelector('[data-availability]') || {}).getAttribute('data-av-state'));
  await p2.evaluate(() => document.querySelector('[data-availability]').scrollIntoView({ block: 'center' }));
  await p2.waitForTimeout(300);
  const during = await p2.evaluate(() => document.querySelector('[data-availability]').getAttribute('data-av-state'));
  await p2.waitForTimeout(1800);
  const settled = await p2.evaluate(() => document.querySelector('[data-availability]').getAttribute('data-av-state'));
  await p2.evaluate(() => { window.scrollTo(0, 0); });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => document.querySelector('[data-availability]').scrollIntoView({ block: 'center' }));
  await p2.waitForTimeout(400);
  const again = await p2.evaluate(() => document.querySelector('[data-availability]').getAttribute('data-av-state'));
  note('availability-entrance-plays-once', before === 'ready' && during === 'in' && settled === 'settled' && again === 'settled', JSON.stringify({ before, during, settled, again }));
  await p2.context().close();

  /* THE LINE MOVES WITH THE CLOCK, NOT WITH THE COUNT (Owner, 23 Sep 2026): the same page, opened on a day in the middle of
     the planning window, draws the dot at the calendar share of that day — while the engine's count is whatever it is. */
  {
    const ctx2 = await b.newContext({ viewport: { width: 1194, height: 834 } });
    await ctx2.addInitScript(() => {
      const fixed = new Date('2026-10-12T12:00:00');
      const Real = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends Real { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
    });
    const pc = await ctx2.newPage();
    await pc.goto(O + '/index.html', { waitUntil: 'load' }); await pc.waitForTimeout(2400);
    const travelled = await pc.evaluate(() => {
      const av = document.querySelector('[data-availability]'), bar = document.querySelector('[data-stay-bar]');
      return { elapsed: +av.getAttribute('data-av-elapsed'), bar: +bar.getAttribute('data-stay-elapsed'),
        remaining: +av.getAttribute('data-av-remaining'), max: +av.getAttribute('data-av-max'),
        run: getComputedStyle(av.querySelector('.av-run')).width, rail: getComputedStyle(av.querySelector('.av-rail')).width,
        days: bar.getAttribute('data-stay-days') };
    });
    const expect = +(19 / 69).toFixed(4);   /* 23 Sep → 12 Oct, of a window that ends with 30 November */
    const drawn = parseFloat(travelled.run) / parseFloat(travelled.rail);
    note('timeline-follows-the-clock-not-the-count', travelled.elapsed === expect && travelled.bar === expect &&
      Math.abs(drawn - expect) < 0.01 && travelled.elapsed !== (travelled.max - travelled.remaining) / travelled.max &&
      +travelled.days === 49, JSON.stringify(Object.assign({ expect, drawn: +drawn.toFixed(4) }, travelled)));
    await ctx2.close();
  }

  /* a guest already inside their journey is never sent back through the invitation */
  const p3 = await fresh(1194, 834); await signIn(p3, 'T002'); await clear(p3, 'T002');
  await p3.goto(O + '/index.html', { waitUntil: 'load' }); await p3.waitForTimeout(2400);
  const inside = await p3.evaluate(() => {
    const a = document.querySelector('[data-av-cta]');
    return { href: a ? a.getAttribute('href') : null, words: a ? a.innerText.replace(/\s+/g, ' ').trim() : '' };
  });
  note('availability-cta-follows-the-signed-in-guest', !!inside.href && inside.href !== 'invitation.html' && /your-journey\.html#stays|profile\.html#your-stay/.test(inside.href), JSON.stringify(inside));
  await clear(p3, 'T002');
  await p3.context().close();
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
    /27 February – 01 March 2027/.test(base.text) && /Your cost Complimentary/.test(base.text) && /Extend your stay/i.test(base.text) &&
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
  await p.evaluate(() => document.querySelector('[data-availability]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2000);
  const cta = await p.evaluate(() => { const a = document.querySelector('[data-av-cta]'); return { href: a && a.getAttribute('href'), words: a ? a.innerText.trim() : '', bar: document.querySelectorAll('[data-stay-bar] a').length }; });
  note('availability-cta-follows-the-guest-with-a-stay', cta.href === 'profile.html#your-stay' && /your stay/i.test(cta.words) && cta.bar === 0, JSON.stringify(cta));
  await shot(p, '390-two-signals-signed-in');
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
