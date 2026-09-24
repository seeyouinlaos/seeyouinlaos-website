/* ============================================================================
   EDITS 7 · 8 · 9 (Owner, 24 Sep 2026) — the stage proof.

     node booking-e2e.mjs <scratchpad-with-synth-codes.json> <out-dir> [origin]

   7 · BOOKING FIRST: every room row carries Select without opening Details; the
       room page puts "Book this room" directly under its photographs.
   8 · THE FARE CARDS: Business and Economy flexible read as whole cards at
       360 · 390 · 768 · 1024 · 1440 — no word-by-word column, no overflow.
   9 · WHO IS IN THE ROOM: a party of two takes a two-place room (Ada, a place kept
       for Ben); Ben sees Ada and takes his place; the room is Full; Cleo is
       refused (UI and engine); removal gives the places back; the state
       survives a reload and a second device.

   Synthetic guests on the stage only (T001 Ada · T002 Ben · T003 Cleo).
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 260 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const fresh = async (w, h) => {
  const width = w || 1440, height = h || 900;
  const ctx = await (width <= 430 ? wk : b).newContext(width <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width, height } }) : { viewport: { width, height } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|409|401|423|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); });
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
const api = (p, u, init) => p.evaluate(async ([u, i]) => {
  const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); const h = { 'content-type': 'application/json' }; if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
  const r = await fetch(u, Object.assign({ headers: h, cache: 'no-store' }, i || {})); return { status: r.status, body: await r.json().catch(() => null) };
}, [u, init]);
const WIN = 'prewed', SLUG = 'heritage', KEY = WIN + '/' + SLUG;
const unitA = async (p) => (await api(p, '/api/rooms')).body.units[KEY].find((u) => u.label === 'A');
const openRow = async (p) => {
  await p.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const row = '#j-prewed .var.vroom[data-room="' + SLUG + '"]';
  await p.waitForSelector(row + ' [data-row-select]');
  if (!(await p.$('#j-prewed .vunits'))) { await p.click(row + ' [data-row-select]'); await p.waitForSelector('#j-prewed .vunits .p-unit', { timeout: 8000 }); }
  return row;
};
/* start clean: nobody of the three holds anything in the pre-wedding stage */
for (const g of ['T001', 'T002', 'T003']) { const p = await fresh(); await signIn(p, g); await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, stage: 'prewed' }) }); await p.context().close(); }

/* ===== 7 · BOOKING FIRST ===== */
{
  const p = await fresh(390, 844); await signIn(p, 'T003');
  await p.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const r7 = await p.evaluate(() => { const rows = [...document.querySelectorAll('#j-prewed .var.vroom')]; return rows.map((r) => ({ slug: r.getAttribute('data-room'), select: !!r.querySelector('[data-row-select]'), selectText: (r.querySelector('[data-row-select]') || {}).textContent, details: (r.querySelector('.vdet') || {}).getAttribute && r.querySelector('.vdet').getAttribute('href'), price: (r.querySelector('.vp') || {}).textContent || '', visible: (() => { const b = r.querySelector('[data-row-select]'); if (!b) return false; const q = b.getBoundingClientRect(); return q.width > 40 && q.height >= 40; })() })); });
  note('7.1 every Souphattra room row shows its amount, a Select and a Details link — no Details needed to book', r7.length >= 5 && r7.every((x) => x.select && /room\.html/.test(x.details || '') && x.visible && (/USD/.test(x.price) || x.price === '')), JSON.stringify(r7.slice(0, 3)));
  await shot(p, '7-rows-390', '#j-prewed .vars');
  await p.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const r7b = await p.evaluate(() => { const buy = document.querySelector('.buy'), det = document.querySelector('#details'), story = document.querySelector('.intro:not(.intro-head)'), cta = document.querySelector('.buy .cta'); return { buyTop: buy && buy.getBoundingClientRect().top + scrollY, detTop: det && det.getBoundingClientRect().top + scrollY, storyTop: story && story.getBoundingClientRect().top + scrollY, cta: !!cta, facts: !!document.querySelector('.facts'), amen: !!document.querySelector('.plane') }; });
  note('7.2 the room page: "Book this room" (amount + action) comes before the details; the details are all still there', r7b.cta && r7b.buyTop < r7b.detTop && r7b.detTop < r7b.storyTop && r7b.facts && r7b.amen, JSON.stringify(r7b));
  await shot(p, '7-room-page-390');
  await p.context().close();
}

/* ===== 9 · WHO IS IN THE ROOM ===== */
{
  const ada = await fresh(1440, 900); await signIn(ada, 'T001');
  const row = await openRow(ada);
  const before = await ada.evaluate(() => [...document.querySelectorAll('#j-prewed .vunits .p-unit')].map((u) => ({ unit: u.getAttribute('data-unit'), who: u.querySelector('.p-unit-who').textContent, btn: (u.querySelector('[data-join]') || {}).textContent || '' })));
  note('9.1 Select opens the rooms of the category: each room with its places and its free places before anything is taken', before.length >= 1 && before.every((u) => /place/.test(u.who)), JSON.stringify(before.slice(0, 3)));
  await shot(ada, '9-chooser-open-1440', '#j-prewed .vars');
  await ada.click('#j-prewed .vunits .p-unit[data-unit="A"] [data-join]'); await ada.waitForTimeout(1800);
  const a1 = await unitA(ada);
  note('9.2 Ada (party of two) takes Room A: one person and one place kept for her party — not "full" for others by a person yet', a1.occupants.length === 2 && a1.taken === 2, JSON.stringify({ taken: a1.taken, free: a1.free, places: a1.places }));
  const ben = await fresh(390, 844); await signIn(ben, 'T002');
  await openRow(ben);
  const b1 = await ben.evaluate(() => { const u = document.querySelector('#j-prewed .vunits .p-unit[data-unit="A"]'); return { who: u.querySelector('.p-unit-who').textContent, btn: (u.querySelector('[data-join]') || {}).textContent || '' }; });
  note('9.3 Ben sees Ada in Room A and the place kept for him, with a Join action', /Ada/.test(b1.who) && /kept for you|place/.test(b1.who) && /Join/.test(b1.btn), JSON.stringify(b1));
  await shot(ben, '9-ben-sees-ada-390', '#j-prewed .vars');
  await ben.click('#j-prewed .vunits .p-unit[data-unit="A"] [data-join]'); await ben.waitForTimeout(1800);
  const a2 = await unitA(ben);
  note('9.4 Ben joins: Room A holds Ada and Ben and is Full', a2.full === true && a2.occupants.filter((o) => !o.placeholder).length === 2, JSON.stringify({ full: a2.full, free: a2.free }));
  /* My Trip says it in plain words (Ben completes step 01 and says he joins Vientiane before the wedding) */
  await ben.goto(O + '/invitation.html', { waitUntil: 'load' }); await ben.waitForSelector('#go');
  for (const [k, v] of [['email', 'ben.test@example.org'], ['phone', '+49 170 7654321'], ['birthdate', '1988-08-08'], ['nationality', 'Testland'], ['address1', '1 Test Street'], ['postal', '10000'], ['city', 'Testcity'], ['country', 'Testland']]) { await ben.fill('#p-' + k, v); await ben.dispatchEvent('#p-' + k, 'change'); await ben.waitForTimeout(80); }
  await ben.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ben.waitForSelector('[data-scope-card]'); await ben.waitForTimeout(800);
  if ((await ben.getAttribute('[data-scope="vientianePreWedding"]', 'aria-checked')) !== 'true') { await ben.click('[data-scope="vientianePreWedding"]'); await ben.waitForTimeout(1500); }
  const occ = await ben.evaluate(() => { const o = document.querySelector('#stay-prewed .p-occ') || document.querySelector('.p-occ'); return o ? o.innerText.replace(/\s+/g, ' ') : ''; });
  note('9.5 My Trip names the room, its sleeping places, who holds them and that it is Full', /Room A/i.test(occ) && /2 sleeping places/i.test(occ) && /Ada/.test(occ) && /You/.test(occ) && /Full/i.test(occ), occ);
  await shot(ben, '9-my-trip-occupancy-390', '#stay-prewed');
  const cleo = await fresh(1440, 900); await signIn(cleo, 'T003');
  await openRow(cleo);
  const c1 = await cleo.evaluate(() => { const u = document.querySelector('#j-prewed .vunits .p-unit[data-unit="A"]'); return { who: u.querySelector('.p-unit-who').textContent, join: !!u.querySelector('[data-join]'), full: u.classList.contains('full') }; });
  note('9.6 Cleo sees Room A as Full with Ada and Ben in it, and no Join', c1.full && !c1.join && /Ada/.test(c1.who) && /Ben/.test(c1.who) && /Full/.test(c1.who), JSON.stringify(c1));
  const force = await api(cleo, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', key: KEY, label: 'A', name: 'Cleo', need: 1 }) });
  note('9.7 the engine refuses a place beyond capacity even when asked directly (no overbooking)', !(force.body && force.body.ok) , JSON.stringify({ status: force.status, error: force.body && force.body.error }));
  /* reload + second device keep the state */
  await ben.reload({ waitUntil: 'load' }); await ben.waitForTimeout(1500);
  const ben2 = await fresh(1440, 900); await signIn(ben2, 'T002'); const a3 = await unitA(ben2);
  note('9.8 after a reload and on a second device, Room A still holds Ada and Ben (the engine is the one truth)', a3.full && a3.occupants.some((o) => o.name === 'Ben') && a3.occupants.some((o) => o.name === 'Ada'), JSON.stringify(a3.occupants.map((o) => o.name)));
  /* release restores */
  await api(ben, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', stage: 'prewed' }) });
  const a4 = await unitA(cleo);
  note('9.9 Ben leaves: one place is available again in Room A', !a4.full && a4.free >= 1, JSON.stringify({ free: a4.free, occupants: a4.occupants.map((o) => o.name || (o.placeholder ? 'kept' : '?')) }));
  await api(ada, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage: 'prewed' }) });
  const a5 = await unitA(cleo);
  note('9.10 Ada leaves too: Room A is back to its full capacity', a5.occupants.length === 0 && a5.free === a5.places, JSON.stringify({ free: a5.free, places: a5.places }));
  for (const p of [ada, ben, ben2, cleo]) await p.context().close();
}

/* ===== 8 · THE FARE CARDS ===== */
for (const [w, h] of [[360, 780], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
  const p = await fresh(w, h); await signIn(p, 'T003');
  await p.goto(O + '/journeys.html#j-mu9646', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const f = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#j-mu9646 .vcls')];
    return { n: cards.length, overflow: document.documentElement.scrollWidth > innerWidth + 1, cards: cards.map((c) => { const r = c.getBoundingClientRect(), t = c.querySelector('.vtx').getBoundingClientRect(), n = c.querySelector('.vcn'), a = c.querySelector('.vact'); const lines = Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)); return { w: Math.round(r.width), textW: Math.round(t.width), nameLines: lines, action: !!a && a.getBoundingClientRect().height > 30, right: r.right <= innerWidth + 0.5 }; }) };
  });
  const ok = f.n === 2 && !f.overflow && f.cards.every((c) => c.textW >= Math.min(260, c.w * 0.5) && c.nameLines <= 2 && c.action && c.right) && Math.abs(f.cards[0].w - f.cards[1].w) <= 1;
  note('8.' + w + ' fare cards: two equal cards, the text column wide (no word-by-word), a clear action, no overflow', ok, JSON.stringify(f));
  await shot(p, '8-fares-' + w, '#j-mu9646 .vars');
  await p.context().close();
}

note('E0 no page error on any page of the run', errors.size === 0, [...errors.keys()].slice(0, 6).join(' | ') || 'none');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fl = R.filter((r) => !r.ok).length; console.log('\n' + (R.length - fl) + '/' + R.length + ' pass'); process.exit(fl ? 1 : 0);
