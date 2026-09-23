/* ============================================================================
   THE EXTENDED STAY ACROSS THE FOUR SURFACES (Owner, 23 Sep 2026) — the served
   proof, on the stage, with one synthetic guest and nothing else.

   The guest chooses their whole trip (the Guest House complimentary for the
   wedding stay), answers every step so Review & Send opens, and then adds ONE
   paid night. My Bag, Review & Send, My Profile and the one total are read;
   the nights are changed to three and read again; the line is removed from My
   Bag and read once more. Every hold the guest takes is given back at the end.
   ========================================================================== */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const S = process.argv[2], OUT = process.argv[3], O = 'http://127.0.0.1:8788';
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(S + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 260 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const fresh = async (w, h) => {
  const ctx = await (w <= 430 ? wk : b).newContext(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: h } }) : { viewport: { width: w, height: h } });
  return ctx.newPage();
};
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 74, fullPage: false }); };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1800);
};
const api = (p, url, init) => p.evaluate(async ([u, i]) => {
  const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null');
  const h = { 'content-type': 'application/json' }; if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
  const r = await fetch(u, Object.assign({ headers: h, cache: 'no-store' }, i || {}));
  return { status: r.status, body: await r.json().catch(() => null) };
}, [url, init]);
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); const fin = await p.$('#finale [data-finale="pool"]'); if (fin) { await fin.click(); await p.waitForTimeout(300); } await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); { const gb = await p.$('[data-multi="genres"] [data-pick="Pop"]'); if (gb && (await gb.getAttribute('aria-pressed')) !== 'true') { await gb.click(); await p.waitForTimeout(200); } } for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500); };
const trip = async (p) => { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); };

/* ---- the fixture: one synthetic guest with a whole trip, every step answered ---- */
const p = await fresh(1194, 834); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
const ID = { invitationId: 'INV-T001', guestId: 'T001' };
await api(p, '/api/rooms/unextend', { method: 'POST', body: JSON.stringify(ID) });
for (const stage of ['wedstay', 'stayext']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ ...ID, stage }) });
/* the guest joins the whole journey, so every stage is theirs to choose */
await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
const chosen = await p.evaluate(async () => { const ST = SIYL_STAY, P = SIYL_PRICE, B = SIYL_BAG, out = [];
  /* the wedding stay is the Guest House complimentary — the line the extended stay must follow */
  for (const [win, slug] of [['bkk-stay', 'penthouse'], ['prewed', 'heritage-grand-premier'], ['kmg', 'italian'], ['ljg', 'viewing-270'], ['kempinski', 'deluxe-balcony-king']]) { const r = await ST.select(win, slug); out.push(win + ':' + (r && r.ok ? r.unit : 'x')); }
  for (const id of ['train', 'mu9646', 'c86', 'return']) P.items(id).forEach((it) => B.put(it));
  return { out, bag: B.get().map((x) => x.id), total: B.total(), open: SIYL_JOURNEY.counts().open, need: SIYL_GUEST.readiness().need.map((x) => x.key) }; });
/* THE WEDDING STAY IS THE GUEST HOUSE COMPLIMENTARY — taken the way a guest takes it, on its own page */
await p.goto(O + '/room.html?stay=guesthouse&room=guest-house', { waitUntil: 'load' }); await p.waitForTimeout(2400);
await p.click('.cta[data-avwin="guesthouse"]'); await p.waitForTimeout(2600);
await trip(p);
const house = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id), need: SIYL_GUEST.readiness().need.map((x) => x.key) }));
await trip(p);
await wedding(p, 'yes', 'yes'); await prep(p);
/* the seats the wedding day asks for, as the release suites take them */
for (const [ev, seatId] of [['ceremony', 'C-R-09-02'], ['dinner', 'D-T-09']]) {
  const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ ...ID, event: ev, seatId, name: 'Ada' }) });
  if (sr.status !== 200) console.log('SEAT', ev, sr.status, JSON.stringify(sr.body));
}
await about(p, 'Pandan');
note('the-fixture-is-a-whole-trip-with-the-guest-house', house.bag.indexOf('guesthouse') >= 0 && house.bag.length === 10 &&
  house.need.indexOf('room:wedstay') < 0, JSON.stringify({ chosen: chosen.out, lines: house.bag, need: house.need.length }));

/* ---- how each surface is read ---- */
const amountsOf = () => [...document.querySelectorAll('.cart-line .p-line-amt')].map((a) => { const m = /USD ([\d,]+)/.exec(a.textContent); return m ? +m[1].replace(/,/g, '') : 0; }).reduce((t, n) => t + n, 0);
const readBag = async () => { await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2600);
  return p.evaluate(() => {
    const amounts = [...document.querySelectorAll('.cart-line .p-line-amt')].map((a) => { const m = /USD ([\d,]+)/.exec(a.textContent); return m ? +m[1].replace(/,/g, '') : 0; });
    return { groups: [...document.querySelectorAll('.cart-group')].map((g) => ({ title: g.querySelector('.t-l1').textContent.trim(),
        lines: [...g.querySelectorAll('.cart-line')].map((l) => ({ id: l.getAttribute('data-line'),
          when: l.querySelector('.p-line-body .t-l1').textContent.trim(),
          name: l.querySelector('h3').textContent.trim(),
          meta: l.querySelector('.p-line-body .t-b2') ? l.querySelector('.p-line-body .t-b2').textContent.trim() : '',
          amount: l.querySelector('.p-line-amt').textContent.trim(),
          actions: [...l.querySelectorAll('.p-actions a, .p-actions button')].map((a) => a.textContent.trim()),
          change: l.querySelector('[data-change]') ? l.querySelector('[data-change]').getAttribute('href') : null,
          details: [...l.querySelectorAll('.p-actions a')].map((a) => a.getAttribute('href')).pop() })) })),
      total: document.getElementById('cart-total').textContent.trim(),
      bar: (document.querySelector('.jb-t') || {}).textContent,
      shownSum: amounts.reduce((t, n) => t + n, 0), engineTotal: SIYL_BAG.total() }; }); };
const readReview = async () => { await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  try { await p.waitForSelector('#items .p-line', { timeout: 15000 }); } catch (e) { /* the check itself reports it */ }
  await p.waitForTimeout(900);
  return p.evaluate(() => ({ where: location.pathname,
    items: [...document.querySelectorAll('#items .p-line')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
    total: (document.getElementById('tt') || {}).textContent })); };
const readProfile = async () => { await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2800);
  return p.evaluate(() => { const s = document.querySelector('#your-stay'), card = s && s.querySelector('[data-stay="extension"]');
    return { ext: card ? card.innerText.replace(/\s+/g, ' ').trim() : '',
      cards: s ? [...s.querySelectorAll('.pf-stay')].map((c) => ({ data: c.getAttribute('data-stay'),
        name: (c.querySelector('h3') || {}).textContent || '', text: c.innerText.replace(/\s+/g, ' ').trim() })) : [],
      /* NO PHOTOGRAPHY IN YOUR STAY (Owner, 23 Sep 2026): a record, not a rail */
      images: s ? s.querySelectorAll('img, [style*="background-image"], .pf-img').length : -1,
      actions: s ? [...s.querySelectorAll('[data-ext-actions] a, [data-ext-actions] button')].map((a) => a.textContent.trim()) : [],
      details: s && s.querySelector('[data-ext-actions] a') ? s.querySelector('[data-ext-actions] a').getAttribute('href') : null,
      rail: [...document.querySelectorAll('#stays .pf-card h3')].map((c) => c.textContent.trim()) }; }); };

/* ---- 1 · ONE NIGHT ---- */
const bagBefore = await readBag();
await api(p, '/api/rooms/extend', { method: 'POST', body: JSON.stringify({ ...ID, nights: 1, expect: 30, name: 'Ada' }) });
const bag1 = await readBag();
const acc = bag1.groups.find((g) => /Accommodation/i.test(g.title)) || { lines: [] };
const ids = acc.lines.map((l) => l.id);
const ext = acc.lines.find((l) => l.id === 'stayext');
await p.evaluate(() => { const l = document.querySelector('[data-line="stayext"]'); if (l) l.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500);
await shot(p, '1194x834-bag-extended-stay');
note('bag-extended-stay-under-accommodation-after-the-guest-house', !!ext && ids.indexOf('stayext') === ids.indexOf('guesthouse') + 1,
  JSON.stringify({ group: acc.title, order: ids }));
note('bag-extended-stay-reads-the-engine', !!ext && ext.name === 'Riverside Hotel Vientiane' &&
  /01 March – 02 March 2027/.test(ext.meta) && /1 additional night/.test(ext.meta) && /Breakfast included/.test(ext.meta) &&
  ext.amount === 'USD 30' && ext.when === '01 – 02 MAR', JSON.stringify(ext));
note('bag-extended-stay-has-the-three-actions', !!ext && ext.actions.join(' · ') === 'Change · Remove · View details' &&
  ext.change === 'profile.html#your-stay' && /room\.html\?stay=riverside&room=superior-window/.test(ext.details || ''),
  JSON.stringify({ actions: ext && ext.actions, change: ext && ext.change, details: ext && ext.details }));
note('bag-total-counts-it-once', bag1.shownSum === bag1.engineTotal && bag1.shownSum === bagBefore.shownSum + 30 &&
  bag1.total === 'USD ' + bag1.shownSum.toLocaleString('en-US') && bag1.bar === bag1.total,
  JSON.stringify({ without: bagBefore.shownSum, with: bag1.shownSum, shown: bag1.total, bar: bag1.bar, engine: bag1.engineTotal }));

{ const ph = await fresh(390, 844); await signIn(ph, 'T001'); await ph.goto(O + '/cart.html', { waitUntil: 'load' }); await ph.waitForTimeout(2600);
  await ph.evaluate(() => { const l = document.querySelector('[data-line="stayext"]'); if (l) l.scrollIntoView({ block: 'center' }); }); await ph.waitForTimeout(500);
  await shot(ph, '390-bag-extended-stay'); await ph.context().close(); }
const rev1 = await readReview();
await p.evaluate(() => { const l = [...document.querySelectorAll('#items .p-line')].find((x) => /Riverside/.test(x.innerText)); if (l) l.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500);
await shot(p, '1194x834-review-extended-stay');
note('review-shows-the-same-line-and-the-same-amount', /review/.test(rev1.where) &&
  rev1.items.filter((t) => /Riverside Hotel Vientiane/.test(t)).length === 1 &&
  rev1.items.some((t) => /Riverside Hotel Vientiane/.test(t) && /1 additional night/.test(t) && /Breakfast included/.test(t) && /USD 30/.test(t)) &&
  rev1.total === bag1.total,
  JSON.stringify({ where: rev1.where, total: rev1.total, bag: bag1.total, line: rev1.items.find((t) => /Riverside/.test(t)) }));

const pr1 = await readProfile();
await p.evaluate(() => { const l = document.querySelector('[data-stay="extension"]'); if (l) l.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500);
await shot(p, '1194x834-profile-extended-stay');
note('profile-your-stay-is-every-confirmed-stay-in-the-order-they-happen', pr1.cards.length >= 3 &&
  pr1.cards.map((c) => c.name).join(' → ') === 'Sathorn Penthouse Bangkok → Pre-Wedding Stay · Souphattra Heritage → Guest House complimentary · Vientiane → Wanxiang Yueju · Kunming → Luye Baisha · Lijiang → Siam Kempinski Bangkok → Riverside Hotel Vientiane' &&
  pr1.cards[pr1.cards.length - 1].data === 'extension',
  JSON.stringify(pr1.cards.map((c) => c.data + ':' + c.name)));
note('profile-your-stay-carries-no-photography', pr1.images === 0, 'image elements inside Your stay: ' + pr1.images);
note('profile-says-the-same-words-and-offers-the-same-actions', /Riverside Hotel Vientiane/.test(pr1.ext) &&
  /01 March – 02 March 2027/.test(pr1.ext) && /1 additional night/.test(pr1.ext) && /Breakfast included/.test(pr1.ext) && /USD 30/.test(pr1.ext) &&
  pr1.actions.join(' · ') === 'Change · Remove · View details' && /room\.html\?stay=riverside/.test(pr1.details || '') &&
  pr1.rail.filter((n) => /Riverside/.test(n)).length === 0,
  JSON.stringify({ ext: pr1.ext, actions: pr1.actions, rail: pr1.rail }));

/* ---- 2 · CHANGED TO THREE NIGHTS ---- */
await api(p, '/api/rooms/extend', { method: 'POST', body: JSON.stringify({ ...ID, nights: 3, expect: 90, name: 'Ada' }) });
const bag3 = await readBag(), acc3 = bag3.groups.find((g) => /Accommodation/i.test(g.title)) || { lines: [] };
const ext3 = acc3.lines.filter((l) => l.id === 'stayext');
const rev3 = await readReview(), pr3 = await readProfile();
note('a-change-updates-every-surface-at-once-and-never-duplicates', ext3.length === 1 &&
  /3 additional nights/.test(ext3[0].meta) && /01 March – 04 March 2027/.test(ext3[0].meta) && ext3[0].amount === 'USD 90' &&
  bag3.shownSum === bagBefore.shownSum + 90 && bag3.shownSum === bag3.engineTotal &&
  rev3.total === bag3.total && rev3.items.filter((t) => /Riverside/.test(t)).length === 1 && /USD 90/.test(pr3.ext),
  JSON.stringify({ lines: ext3.length, meta: ext3[0] && ext3[0].meta, base: bagBefore.shownSum, now: bag3.shownSum, bag: bag3.total, review: rev3.total, profile: /USD 90/.test(pr3.ext) }));

/* ---- 3 · REMOVED IN MY BAG ---- */
await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2600);
await p.waitForSelector('[data-line="stayext"] [data-remove]', { timeout: 15000 });
await p.click('[data-line="stayext"] [data-remove]');
try { await p.waitForSelector('[data-line="stayext"]', { state: 'detached', timeout: 15000 }); } catch (e) { /* the check reports it */ }
await p.waitForTimeout(1400);
const bag0 = await p.evaluate(() => { const amounts = [...document.querySelectorAll('.cart-line .p-line-amt')].map((a) => { const m = /USD ([\d,]+)/.exec(a.textContent); return m ? +m[1].replace(/,/g, '') : 0; });
  return { ids: [...document.querySelectorAll('.cart-line')].map((l) => l.getAttribute('data-line')), total: document.getElementById('cart-total').textContent.trim(),
    shownSum: amounts.reduce((t, n) => t + n, 0), engineTotal: SIYL_BAG.total() }; });
const rev0 = await readReview(), pr0 = await readProfile();
const mine = await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' });
note('removing-in-the-bag-releases-the-nights-and-leaves-the-stay-underneath', bag0.ids.indexOf('stayext') < 0 &&
  bag0.shownSum === bagBefore.shownSum && bag0.shownSum === bag0.engineTotal && rev0.total === bag0.total &&
  !rev0.items.some((t) => /Riverside/.test(t)) && !/Extended stay/.test(pr0.ext) &&
  !!(mine.body && mine.body.mine && mine.body.mine.wedstay) && !(mine.body && mine.body.extension),
  JSON.stringify({ bagIds: bag0.ids.length, shown: bag0.shownSum, base: bagBefore.shownSum, review: rev0.total, wedstay: mine.body && mine.body.mine && mine.body.mine.wedstay, extension: mine.body && mine.body.extension }));

/* the stage is left as it was found */
await api(p, '/api/rooms/unextend', { method: 'POST', body: JSON.stringify(ID) });
await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ ...ID, stage: 'wedstay' }) });
await trip(p);
const leave = await p.evaluate(async () => { const ST = SIYL_STAY; const out = []; for (const w of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) { const r = await ST.remove(w); out.push(w + ':' + (r && r.ok !== false ? 'ok' : 'x')); } SIYL_BAG.set([]); return out; });
const end = await api(p, '/api/rooms/read');
note('stage-left-clean', end.body.extension === null && Object.keys(end.body.mine || {}).length === 0, JSON.stringify({ released: leave, extension: end.body.extension, mine: end.body.mine }));

fs.writeFileSync(path.join(OUT, 'ext-proof.json'), JSON.stringify(R, null, 1));
console.log(R.filter((r) => r.ok).length + '/' + R.length + ' checks passed');
await p.context().close(); await b.close(); await wk.close();
process.exit(R.every((r) => r.ok) ? 0 : 1);
