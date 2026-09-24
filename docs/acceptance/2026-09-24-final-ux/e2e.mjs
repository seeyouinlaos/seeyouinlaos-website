/* ============================================================================
   FINAL UX / SYSTEM CORRECTION PASS (Owner, 24 Sep 2026) — the stage proof.

     node e2e.mjs <scratchpad-with-synth-codes.json> <out-dir> [origin]

   A · Step 01's required fields are required (the page, the gate, the draft)
   B · "Which parts of the journey are you joining?" — four independent parts,
       one exclusive decline, no "I'll join all", no host cascade, reload-true
   C · the component at 390 (WebKit iPhone) and 1440 (Chromium): legible
       states, no orphan dots, no overflow
   D · Shama Yen-Akat Bangkok deleted: no card, no API product, no room page,
       a stale Bag line leaves instead of becoming another hotel

   Synthetic guests on the stage only (T003 · G049 of the stage register).
   Never run against production with codes.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 240 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const fresh = async (w, h) => {
  const width = w || 1440, height = h || 900;
  const ctx = await (width <= 430 ? wk : b).newContext(width <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width, height } }) : { viewport: { width, height } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|409|401|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); });
  return p;
};
const shot = async (p, name, el) => { if (el) { const h = await p.$(el); if (h) { await h.screenshot({ path: path.join(OUT, name + '.png') }); return; } } await p.screenshot({ path: path.join(OUT, name + '.png') }); };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
};
const setField = async (p, key, v) => { const s = '#p-' + key; await p.fill(s, v); await p.dispatchEvent(s, 'change'); await p.waitForTimeout(120); };

/* ===== A · REQUIRED MEANS REQUIRED ===== */
{
  const p = await fresh(1440, 900); await signIn(p, 'T003');
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('#go');
  for (const k of ['birthdate', 'nationality', 'address1', 'address2', 'postal', 'city', 'region', 'country']) { await p.fill('#p-' + k, ''); await p.dispatchEvent('#p-' + k, 'change'); }
  await setField(p, 'email', 'cleo.test@example.org'); await setField(p, 'phone', '+49 170 1234567');
  await p.click('#go', { force: true }); await p.waitForTimeout(700);
  const a1 = await p.evaluate(() => ({ url: location.pathname, needed: [...document.querySelectorAll('.p-field.is-needed input')].map((i) => i.id), invalid: [...document.querySelectorAll('input[aria-invalid="true"]')].map((i) => i.id), note: (document.querySelector('.prep-foot-note') || {}).textContent || '', focus: document.activeElement && document.activeElement.id, done: window.SIYL_GUEST.done('you') }));
  note('A1 incomplete required fields → Continue stays on step 01, each missing field marked, the first focused', /invitation/.test(a1.url) && !a1.done && a1.needed.length === 6 && a1.needed.includes('p-country') && !a1.needed.includes('p-address2') && !a1.needed.includes('p-region') && a1.focus === a1.needed[0] && /required details are still missing/.test(a1.note), JSON.stringify(a1));
  await shot(p, 'A1-step01-missing-1440', '#personal');
  /* a direct navigation to step 02 is gated back to the first missing field */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  note('A2 direct navigation to My Trip while step 01 is incomplete → sent back to step 01', /invitation/.test(new URL(p.url()).pathname), p.url());
  /* the incomplete draft survives a reload */
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('#go');
  const a3 = await p.evaluate(() => ({ email: document.querySelector('#p-email').value, phone: document.querySelector('#p-phone').value, done: window.SIYL_GUEST.done('you') }));
  note('A3 an incomplete draft is saved and restored after reload, still not complete', a3.email === 'cleo.test@example.org' && a3.phone === '+49 170 1234567' && !a3.done, JSON.stringify(a3));
  /* invalid date → still blocked */
  for (const [k, v] of [['nationality', 'Testland'], ['address1', '1 Test Street'], ['postal', '10000'], ['city', 'Testcity'], ['country', 'Testland']]) await setField(p, k, v);
  const a4 = await p.evaluate(() => window.SIYL_GUEST.missingFor('you').map((m) => m.key));
  note('A4 with everything but the date of birth, step 01 still names the date of birth', a4.length === 1 && a4[0] === 'birthdate', JSON.stringify(a4));
  await setField(p, 'birthdate', '1990-01-01');
  const a5 = await p.evaluate(() => ({ miss: window.SIYL_GUEST.missingFor('you').map((m) => m.key), a2: document.querySelector('#p-address2').value, rg: document.querySelector('#p-region').value }));
  note('A5 optional Address line 2 and Region empty → step 01 complete', a5.miss.length === 0 && a5.a2 === '' && a5.rg === '', JSON.stringify(a5));
  await p.click('#go', { force: true }); await p.waitForURL(/your-journey/, { timeout: 8000 }).catch(() => {});
  note('A6 Continue now opens My Trip', /your-journey/.test(p.url()), p.url());
  /* the server keeps the same rule: the stored contact carries every required field */
  const srv = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/contact', { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' }); return (await r.json()).contact; });
  note('A7 the server contact holds the required fields the page validated', srv && srv.email && srv.phone && srv.birthdate === '1990-01-01' && srv.country === 'Testland' && srv.city === 'Testcity', JSON.stringify(srv && { email: !!srv.email, phone: !!srv.phone, birthdate: srv.birthdate, country: srv.country }));
  await p.context().close();
}

/* ===== B · FOUR INDEPENDENT PARTS + ONE EXCLUSIVE DECLINE ===== */
const KEYS = ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china'];
const state = (p) => p.evaluate((K) => {
  const ui = {}; K.forEach((k) => { const b = document.querySelector('[data-scope="' + k + '"]'); ui[k] = b ? b.getAttribute('aria-checked') === 'true' : null; });
  const nb = document.querySelector('[data-scope-none]'); ui.none = nb ? nb.getAttribute('aria-checked') === 'true' : null;
  const s = window.SIYL_GUEST.scope(); const st = s ? Object.fromEntries(K.map((k) => [k, !!s[k] && !s.none]).concat([['none', !!s.none]])) : Object.fromEntries(K.map((k) => [k, false]).concat([['none', false]]));
  return { ui, st, all: !!document.querySelector('[data-scope-all]'), status: (document.querySelector('[data-scope-status]') || {}).textContent || '' };
}, KEYS);
const tap = async (p, sel) => { await p.click(sel); await p.waitForTimeout(450); const pv = await p.$('[data-release-confirm]'); if (pv) { await pv.click(); await p.waitForTimeout(700); } };
const want = (on, none) => Object.fromEntries(KEYS.map((k) => [k, on.includes(k)]).concat([['none', !!none]]));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
{
  const p = await fresh(1440, 900); await signIn(p, 'T003');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]');
  /* start from nothing */
  let s = await state(p);
  for (const k of KEYS) if (s.ui[k]) await tap(p, '[data-scope="' + k + '"]');
  if ((await state(p)).ui.none) await tap(p, '[data-scope-none]');
  s = await state(p);
  note('B0 no "I\'ll join all" control; nothing selected reads "Nothing selected yet"', !s.all && same(s.ui, want([])) && /Nothing selected yet/.test(s.status), JSON.stringify(s));
  const steps = [
    ['B1 Bangkok only', ['bangkok'], ['bangkok']],
    ['B2 Vientiane · Before only', ['bangkok', 'vientianePreWedding'], ['vientianePreWedding']],
    ['B3 Vientiane · The Wedding only', ['vientianePreWedding', 'vientianeWedding'], ['vientianeWedding']],
    ['B4 China only', ['vientianeWedding', 'china'], ['china']],
    ['B5 Bangkok + China', ['bangkok'], ['bangkok', 'china']],
    ['B6 both Vientiane parts (after clearing Bangkok + China)', ['bangkok', 'china', 'vientianePreWedding', 'vientianeWedding'], ['vientianePreWedding', 'vientianeWedding']],
    ['B7 all four', ['bangkok', 'china'], ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china']],
    ['B8 deselect one part (Vientiane · Before) — the other three untouched', ['vientianePreWedding'], ['bangkok', 'vientianeWedding', 'china']]
  ];
  for (const [id, taps, expect] of steps) {
    for (const k of taps) await tap(p, '[data-scope="' + k + '"]');
    const x = await state(p);
    note(id + ' → UI and stored state agree, no other part moved', same(x.ui, want(expect)) && same(x.st, want(expect)), JSON.stringify(x));
  }
  await shot(p, 'B8-three-selected-1440', '[data-scope-card]');
  await tap(p, '[data-scope-none]');
  let x = await state(p);
  note('B9 parts selected → decline clears all four', same(x.ui, want([], true)) && same(x.st, want([], true)) && !!(await p.$('[data-not-joining]')), JSON.stringify(x));
  await shot(p, 'B9-declined-1440', '[data-scope-card]');
  await tap(p, '[data-scope="china"]');
  x = await state(p);
  note('B10 declined → selecting a part clears the decline', same(x.ui, want(['china'])) && same(x.st, want(['china'])) && !(await p.$('[data-not-joining]')), JSON.stringify(x));
  await tap(p, '[data-scope-none]'); await tap(p, '[data-scope-none]');
  x = await state(p);
  note('B11 unticking the decline leaves the question unanswered (nothing selected, nothing declined)', same(x.ui, want([])) && same(x.st, want([])) && /Nothing selected yet/.test(x.status), JSON.stringify(x));
  for (const k of ['bangkok', 'vientianeWedding']) await tap(p, '[data-scope="' + k + '"]');
  await p.waitForTimeout(1500);
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(1200);
  x = await state(p);
  note('B12 save/reload restores exactly the same state (Bangkok + Vientiane · The Wedding)', same(x.ui, want(['bangkok', 'vientianeWedding'])) && same(x.st, want(['bangkok', 'vientianeWedding'])), JSON.stringify(x));
  /* the server draft carries it too: a fresh device of the same guest reads the same answer */
  const p2 = await fresh(1440, 900); await signIn(p2, 'T003'); await p2.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p2.waitForSelector('[data-scope-card]'); await p2.waitForTimeout(1500);
  const x2 = await state(p2);
  note('B13 another device of the same guest restores the same state from the server draft', same(x2.st, want(['bangkok', 'vientianeWedding'])) && same(x2.ui, x2.st), JSON.stringify(x2));
  /* leave nothing behind */
  for (const k of ['bangkok', 'vientianeWedding']) await tap(p2, '[data-scope="' + k + '"]');
  await p2.context().close(); await p.context().close();
}
/* the host: the first-view default never comes back once the host has answered */
{
  const p = await fresh(1440, 900); await signIn(p, 'G049');
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('#go');
  for (const [k, v] of [['email', 'groom.test@example.org'], ['phone', '+66 81 234 5678'], ['birthdate', '1985-05-05'], ['nationality', 'Testland'], ['address1', '1 Test Street'], ['postal', '10000'], ['city', 'Testcity'], ['country', 'Testland']]) await setField(p, k, v);
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(800);
  let x = await state(p);
  const start = JSON.stringify(x.ui);
  const seq = [];
  for (const k of KEYS) { if ((await state(p)).ui[k]) await tap(p, '[data-scope="' + k + '"]'); seq.push(JSON.stringify((await state(p)).ui)); }
  x = await state(p);
  note('B14 HOST · deselecting the four parts one by one never re-selects them (the cascade is gone)', same(x.ui, want([])) && same(x.st, want([])), 'start ' + start + ' · steps ' + seq.join(' | '));
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(1200);
  x = await state(p);
  note('B15 HOST · after reload the host still has nothing selected (the default does not return)', same(x.ui, want([])), JSON.stringify(x));
  await p.context().close();
}

/* ===== C · LEGIBLE AT A GLANCE, PHONE AND DESKTOP ===== */
for (const [w, h, tag] of [[390, 844, '390'], [1440, 900, '1440']]) {
  const p = await fresh(w, h); await signIn(p, 'T003');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]');
  /* from nothing selected (a device closed mid-sync may leave the last answer on the server) */
  for (const k of KEYS) if ((await state(p)).ui[k]) await tap(p, '[data-scope="' + k + '"]');
  if ((await state(p)).ui.none) await tap(p, '[data-scope-none]');
  await tap(p, '[data-scope="bangkok"]'); await tap(p, '[data-scope="china"]');
  const c = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.p-opt')];
    const r0 = rows.map((r) => r.getBoundingClientRect());
    const after = rows.map((r) => getComputedStyle(r, '::after').content);
    const states = rows.map((r) => r.querySelector('.p-opt-state').textContent);
    const boxes = rows.map((r) => { const cs = getComputedStyle(r.querySelector('.p-opt-box'), '::after'); return cs.content !== 'none' && cs.content !== ''; });
    const widths = [...new Set(r0.map((r) => Math.round(r.width)))];
    const lefts = [...new Set(r0.map((r) => Math.round(r.left)))];
    const dots = [...document.querySelectorAll('[data-scope-card] *')].filter((e) => { const s = getComputedStyle(e, '::after'); const s2 = getComputedStyle(e, '::before'); return [s, s2].some((q) => q.content !== 'none' && q.content !== '""' && q.width === '4px' && q.height === '4px'); }).length;
    return { n: rows.length, states, boxes, widths, lefts, after, dots, overflow: document.documentElement.scrollWidth > innerWidth + 1, minH: Math.min(...r0.map((r) => r.height)), linkOn: document.querySelectorAll('[data-scope-card] .p-link.on').length };
  });
  note('C-' + tag + ' five rows, one width, one left edge; selected rows show a check and "Selected", the rest "Not selected"; no 4px dot anywhere in the component; no overflow; tap targets ≥ 44 px',
    c.n === 5 && c.widths.length === 1 && c.lefts.length === 1 && c.states.join('|') === 'Selected|Not selected|Not selected|Selected|Not selected' && c.boxes.join('|') === 'true|false|false|true|false' && c.dots === 0 && c.linkOn === 0 && !c.overflow && c.minH >= 44, JSON.stringify(c));
  await shot(p, 'C-scope-' + tag, '[data-scope-card]');
  await tap(p, '[data-scope-none]'); await shot(p, 'C-declined-' + tag, '[data-scope-card]');
  await tap(p, '[data-scope-none]');
  await p.context().close();
}

/* ===== D · SHAMA YEN-AKAT BANGKOK DELETED ===== */
{
  const p = await fresh(1440, 900);
  await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(600);
  /* what the page shows and links (text, links, images) — an HTML comment recording the deletion is not a product */
  const acc = await p.evaluate(() => { const shown = document.body.innerText + ' ' + [...document.querySelectorAll('[href],[style],[src],[aria-label],[data-stay-gal]')].map((e) => [e.getAttribute('href'), e.getAttribute('style'), e.getAttribute('src'), e.getAttribute('aria-label'), e.getAttribute('data-stay-gal')].join(' ')).join(' ');
    return { shama: /shama|yen.?akat/i.test(shown), pent: /penthouse/i.test(shown), river: /Riverside Hotel/.test(shown), six: /Six places/.test(document.body.innerText) }; });
  note('D1 Stays page: no Shama, no Penthouse, no Riverside; the count reads six', !acc.shama && !acc.pent && !acc.river && acc.six, JSON.stringify(acc));
  const api = await p.evaluate(async () => Object.keys((await (await fetch('/api/rooms', { cache: 'no-store' })).json()).summary || {}).filter((k) => k.startsWith('bkk-stay/')));
  note('D2 the room engine offers exactly one Bangkok product (U Sathorn)', JSON.stringify(api) === '["bkk-stay/u-sathorn-superior-garden"]', JSON.stringify(api));
  await p.goto(O + '/room.html?stay=sathorn&room=shama-king-studio-balcony', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const rm = await p.evaluate(() => /Shama|King Studio/.test(document.body.innerText));
  note('D3 the old Shama room page no longer shows the room', !rm, 'shown=' + rm);
  await signIn(p, 'T003');
  await p.evaluate(() => { const b = JSON.parse(localStorage.getItem('siyl.bag') || '[]').filter((x) => x.id !== 'bkk-stay'); b.push({ id: 'bkk-stay', name: 'Shama Yen-Akat Bangkok', meta: '21 – 24 February 2027 · King Studio With Balcony', price: 120, stay: 'sathorn', room: 'shama-king-studio-balcony', rate: 40, qty: 1 }); localStorage.setItem('siyl.bag', JSON.stringify(b)); });
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const bag = await p.evaluate(() => ({ lines: (window.SIYL_BAG.get() || []).filter((x) => x.id === 'bkk-stay').map((x) => x.room), text: /Shama|U Sathorn/.test(document.body.innerText) }));
  note('D4 a stale Shama Bag line leaves the Bag and is NOT turned into U Sathorn', bag.lines.length === 0 && !bag.text, JSON.stringify(bag));
  await p.context().close();
}

note('E0 no page error on any page of the run', errors.size === 0, [...errors.keys()].slice(0, 6).join(' | ') || 'none');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const f = R.filter((r) => !r.ok).length; console.log('\n' + (R.length - f) + '/' + R.length + ' pass'); process.exit(f ? 1 : 0);
