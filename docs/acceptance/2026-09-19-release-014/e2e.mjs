/* RELEASE 014 · THE CANONICAL BOOKING MODEL — E2E on the isolated stage worker (Owner, 19 Sep 2026).
   Synthetic guests only (T001 Ada · T002 Ben · T003 Cleo · G048/G049 the synthetic host pair of the stage register);
   codes read from the scratchpad, never printed.
     node docs/acceptance/2026-09-19-release-014/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: no fixed arrangement (the hosts start at zero) · party capacity on the room page · the Guest House
   complimentary (six shared places, occupants named to signed-in guests, complimentary line, one selection per stage) ·
   the Complete trip (preview with a named fallback and a waiting-list stage, confirm, summary, Profile and Review carry the
   waiting list, a freed room lets the guest choose, leaving the line) · the Essential trip (the Owner's booking model of 20 Sep 2026: stage D alone, D1 preselected, D2 / D3 the guest's — A–O) · the return flight MU5922 + MU741 · confirmation parity (record ·
   guest email · Guest Relations email: the waiting list, no arranged section, the hosts' flag) · the dated venues · widths,
   iPhone Safari and the console. LIVE=1 runs the read-only public sections only (venues, widths, console). */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const b = await chromium.launch();
const errors = new Map();
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1)); p.on('console', (m) => { if (m.type() === 'error' && !/404|409|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); }); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) {} return { status: r.status, body }; }, [path, init]);
const gr = async (route, body, method) => { const r = await fetch(O + route, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-gr-token': GR }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const need = (p) => p.evaluate(() => { const r = SIYL_GUEST.readiness(); return { ok: r.ok, n: r.need.length, first: r.first ? r.first.href : null, keys: r.need.map((x) => x.key) }; });
const trip = async (p) => { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); };
const mine = async (p) => (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body;
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); const fin = await p.$('#finale [data-finale="pool"]'); if (fin) { await fin.click(); await p.waitForTimeout(300); } await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); { const gb = await p.$('[data-multi="genres"] [data-pick="Pop"]'); if (gb && (await gb.getAttribute('aria-pressed')) !== 'true') { await gb.click(); await p.waitForTimeout(200); } } for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const resetGuest = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) { await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); await api(p, '/api/rooms/unwait', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); }
  /* the server-side draft too: an empty Bag and no declines pushed as the guest's own save, so the next sign-in restores nothing */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { localStorage.setItem('siyl.bag', '[]'); localStorage.setItem('siyl.skip', '[]'); localStorage.setItem('siyl.skip.by', '{}'); try { await window.SIYL_DRAFT.flush('reset'); } catch (e) {} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by', 'siyl.wait', 'siyl.draft.meta', 'siyl.draft.base'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close(); };
/* Guest Relations fill a category with synthetic occupants (never a real guest) */
const fillCategory = async (key, units, places) => { const occ = []; for (const label of units) for (let i = 0; i < places; i++) occ.push({ key, label, guestId: 'Z' + key.replace(/\W/g, '') + label + i, invitationId: 'INV-Z' + label + i, partyId: 'INV-Z' + label + i, name: 'Z' }); const r = await gr('/api/rooms/migrate', { occupants: occ, actor: 'e2e-014' }); return r.status === 200 && r.body && r.body.ok; };
const clearCategory = async (key) => { const plan = await gr('/api/rooms/plan'); const units = plan.body && plan.body.units && plan.body.units[key] || []; let n = 0; for (const u of units) for (const o of (u.occupants || [])) if (/^Z/.test(o.guestId || '')) { await gr('/api/rooms/unassign', { key, guestId: o.guestId, actor: 'e2e-014' }); n++; } return n; };

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003', 'G048', 'G049']) await resetGuest(id);
  const cleaned = await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-014' }, 'POST');
  note('stage-clean', cleaned.status === 200 && cleaned.body && cleaned.body.ok && cleaned.body.remaining === 0, JSON.stringify(cleaned.body).slice(0, 160));

  /* ===== 1 · NO FIXED ARRANGEMENT (G048, a host of the stage register): nothing is arranged, the hosts start at zero, Room A is theirs only by choosing it ===== */
  {
    const p = await fresh(390); await signIn(p, 'G048'); await contact(p, 'host.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    const st = await p.evaluate(() => ({ text: document.body.innerText, bag: SIYL_BAG.get().length, total: SIYL_BAG.total(), mine: Object.keys((SIYL_UNITS.view() || {}).mine || {}), fixed: (SIYL_UNITS.view() || {}).fixed, arranged: typeof window.SIYL_ARRANGED, packs: document.querySelectorAll('.p-pack, [data-package]').length, sheets: document.querySelectorAll('[data-scope]').length, counts: (document.querySelector('[data-counts]') || {}).innerText || '' }));
    await shot(p, '390-host-my-trip-zero');
    note('host-starts-at-zero', st.bag === 0 && st.total === 0 && st.mine.length === 0 && st.fixed === undefined && st.arranged === 'undefined' && !/Arranged for you|Fixed arrangement/.test(st.text) && st.packs === 0 && st.sheets === 4 && /10 still open/.test(st.counts), JSON.stringify({ bag: st.bag, mine: st.mine, packs: st.packs, sheets: st.sheets, counts: st.counts }) + ' (no package card; the four participation sheets — 21 Sep 2026)');
    await p.goto(O + '/room.html?stay=sathorn&room=penthouse', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const pent = await p.evaluate(() => ({ a: !!document.querySelector('[data-join="bkk-stay|penthouse|A"]'), units: document.querySelectorAll('[data-units="bkk-stay|penthouse"] .p-unit').length, av: (document.querySelector('[data-av="bkk-stay"]') || {}).textContent || '', reserved: document.querySelectorAll('.p-unit.reserved').length }));
    note('penthouse-room-a-open-to-everyone', pent.a && pent.units === 6 && /6 rooms · 12 places available/.test(pent.av) && pent.reserved === 0, JSON.stringify(pent));
    await p.click('[data-join="bkk-stay|penthouse|A"]'); await p.waitForTimeout(2500);
    const m = await mine(p);
    note('host-chooses-room-a-like-any-guest', m && m.mine && m.mine['bkk-stay'] && m.mine['bkk-stay'].key === 'bkk-stay/penthouse' && m.mine['bkk-stay'].label === 'A', JSON.stringify(m && m.mine));
    await p.context().close();
  }

  /* ===== 2 · PARTY CAPACITY (the synthetic host pair G048 + G049, one party): a room with one stranger cannot take the party; the partner joins the room her party member holds ===== */
  {
    const p1 = await fresh(); await signIn(p1, 'T001'); const j1 = await api(p1, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', key: 'wedstay/heritage', label: 'A', name: 'Ada', need: 1 }) }); await p1.context().close();
    note('party-fixture', j1.status === 200, 'Ada holds The Heritage A (wedding stay)');
    const p = await fresh(390); await signIn(p, 'G048');
    const party = await p.evaluate(() => (SIYL_GUEST.party() || { members: [] }).members.length);
    await p.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const box = await p.evaluate(() => { const u = document.querySelector('[data-units="wedstay|heritage"]'); const a = u && u.querySelector('[data-unit="A"]'), bb = u && u.querySelector('[data-unit="B"]'); return { need: u && u.getAttribute('data-need'), aBtn: !!(a && a.querySelector('[data-join]')), aWords: a ? a.innerText.replace(/\s+/g, ' ') : '', bBtn: !!(bb && bb.querySelector('[data-join="wedstay|heritage|B"]')) }; });
    await shot(p, '390-party-room-page');
    note('party-of-two-sees-only-units-that-fit', party === 2 && box.need === '2' && !box.aBtn && /1 place available · not enough for your party of 2/.test(box.aWords) && box.bBtn, JSON.stringify({ party, ...box }));
    await p.click('.cta[data-avwin="wedstay"]'); await p.waitForTimeout(2600);
    const m = await mine(p);
    note('party-hold-goes-to-a-unit-that-fits', m.mine && m.mine.wedstay && m.mine.wedstay.key === 'wedstay/heritage' && m.mine.wedstay.label !== 'A', JSON.stringify(m.mine));
    const held = m.mine && m.mine.wedstay ? m.mine.wedstay.label : 'B';
    const p2 = await fresh(390); await signIn(p2, 'G049'); await p2.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p2.waitForTimeout(2200);
    const partner = await p2.evaluate((held) => { const u = document.querySelector('[data-units="wedstay|heritage"] [data-unit="' + held + '"]'); return { words: u ? u.innerText.replace(/\s+/g, ' ') : '', btn: !!(u && u.querySelector('[data-join]')) }; }, held);
    note('partner-may-join-the-room-her-party-holds', partner.btn && /1 place kept for you/.test(partner.words) && !/not enough/.test(partner.words), JSON.stringify(partner));
    await p2.click('[data-join="wedstay|heritage|' + held + '"]'); await p2.waitForTimeout(2600);
    const both = await p2.evaluate((held) => { const u = document.querySelector('[data-units="wedstay|heritage"] [data-unit="' + held + '"]'); return u ? u.innerText.replace(/\s+/g, ' ') : ''; }, held);
    await shot(p2, '390-party-both-in-one-room');
    note('party-shares-one-room', /You/.test(both) && /Full/i.test(both) && /Your room/i.test(both), both);
    await p2.context().close(); await p.context().close();
    for (const id of ['G048', 'G049', 'T001']) await resetGuest(id);
  }

  /* ===== 3 · THE GUEST HOUSE COMPLIMENTARY (T003): six shared places, complimentary, occupants named to signed-in guests, never to the public; one selection per stage ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org');
    await p.goto(O + '/room.html?stay=guesthouse&room=guest-house', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const gh = await p.evaluate(() => ({ price: (document.querySelector('.buy .price') || {}).textContent || '', per: (document.querySelector('.buy .per') || {}).textContent || '', dots: document.querySelectorAll('[data-units="guesthouse|guest-house"] .p-places i').length, btn: !!document.querySelector('[data-join="guesthouse|guest-house|A"]'), av: (document.querySelector('[data-av="guesthouse"]') || {}).textContent || '', text: document.body.innerText }));
    await shot(p, '390-guest-house-room-page');
    note('guest-house-six-places-complimentary', gh.price === 'Complimentary' && /six shared places/.test(gh.per) && gh.dots === 6 && gh.btn && /6 of 6 places remaining/.test(gh.av) && !/Private Residence|up to 4/i.test(gh.text), JSON.stringify({ price: gh.price, per: gh.per, dots: gh.dots, av: gh.av }));
    await p.click('.cta[data-avwin="guesthouse"]'); await p.waitForTimeout(2600);
    const m = await mine(p);
    const bag = await p.evaluate(() => ({ lines: SIYL_BAG.get().map((x) => x.id + ':' + x.price + ':' + (x.complimentary ? 'c' : '')), total: SIYL_BAG.total(), bar: (document.querySelector('[data-bag-total]') || document.querySelector('.bagbar') || {}).innerText || '' }));
    note('guest-house-place-held-usd-0', m.mine && m.mine.wedstay && m.mine.wedstay.key === 'guesthouse/guest-house' && bag.lines.join() === 'guesthouse:0:c' && bag.total === 0, JSON.stringify({ mine: m.mine, bag }));
    /* another signed-in guest sees Cleo's first name; the public sees nobody */
    const q = await fresh(390); await signIn(q, 'T001'); await q.goto(O + '/room.html?stay=guesthouse&room=guest-house', { waitUntil: 'load' }); await q.waitForTimeout(2200);
    const seen = await q.evaluate(() => (document.querySelector('[data-units="guesthouse|guest-house"] [data-unit="A"]') || {}).innerText || '');
    await shot(q, '390-guest-house-occupant-named');
    note('guest-house-occupants-named-to-guests', /Cleo/.test(seen) && /5 places available/.test(seen), seen.replace(/\s+/g, ' '));
    await q.context().close();
    const anon = await fresh(390); await anon.goto(O + '/room.html?stay=guesthouse&room=guest-house', { waitUntil: 'load' }); await anon.waitForTimeout(1800);
    const pub = await anon.evaluate(() => ({ names: /Cleo/.test(document.body.innerText), units: document.querySelectorAll('[data-units] .p-unit').length }));
    note('guest-house-public-sees-no-name', !pub.names, JSON.stringify(pub));
    await anon.context().close();
    /* one selection per stage: the Souphattra Heritage replaces the guest house — the place is released (the Riverside was deleted on 23 Sep 2026) */
    await p.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await p.click('[data-join="wedstay|heritage|A"]'); await p.waitForTimeout(2600);
    const m2 = await mine(p); const bag2 = await p.evaluate(() => SIYL_BAG.get().map((x) => x.id));
    note('one-selection-per-stage-souphattra-replaces-guest-house', m2.mine && m2.mine.wedstay && m2.mine.wedstay.key === 'wedstay/heritage' && bag2.join() === 'wedstay', JSON.stringify({ mine: m2.mine, bag: bag2 }));
    await p.context().close();
    await resetGuest('T003');
  }

  /* ===== 4 · 5 · 6 — THE PACKAGES ARE GONE (Owner, 21 Sep 2026): the Complete / Essential trips no longer exist; what those sections proved of the
     engine (party capacity, the waiting list in the record and the emails, stage D's alternatives) is proven by docs/acceptance/2026-09-21-stage-graph/e2e.mjs ===== */

  /* ===== 6b · THE RETURN FLIGHT (the Owner's correction of 20 Sep 2026): MU5922 + MU741 · Lijiang → Kunming → Bangkok · 06 March 2027 · 10:00 → 14:55 on every surface; no earlier flight number anywhere the guest reads ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    const stale = /MU5920|MU5924/;
    const yj = await p.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' '), seg: (SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'return') || {}).label, leg: (window.SIYL_TRAVELPASS && SIYL_TRAVELPASS.LEGS && SIYL_TRAVELPASS.LEGS['return']) || null }));
    note('flight-my-trip-mu5922-mu741', yj.seg === 'MU5922 + MU741' && /MU5922 \+ MU741/.test(yj.text) && /10:00/.test(yj.text) && /14:55/.test(yj.text) && !stale.test(yj.text), JSON.stringify({ seg: yj.seg, stale: stale.test(yj.text) }));
    await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const jr = await p.evaluate(() => ({ card: (document.querySelector('#j-return') || {}).innerText || '', text: document.body.innerText.replace(/\s+/g, ' ') }));
    await shot(p, '390-journeys-return-flight');
    note('flight-journeys-card', /MU5922 \+ MU741 · Lijiang → Bangkok/.test(jr.card) && /06 March · 10:00 → 14:55 · via Kunming/.test(jr.card) && !stale.test(jr.text), jr.card.replace(/\s+/g, ' ').slice(0, 160));
    await p.goto(O + '/transport.html?id=return', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const vo = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    note('flight-transport-page-legs', /MU5922/.test(vo) && /MU741/.test(vo) && /10:00 → 11:00/.test(vo) && /13:20 → 14:55/.test(vo) && /2 h 20 m/.test(vo) && /Boeing 737/.test(vo) && /Boeing 738/.test(vo) && !stale.test(vo), 'MU5922 10:00 → 11:00 · Kunming 2 h 20 m · MU741 13:20 → 14:55');
    const pages = ['your-journey.html', 'journeys.html', 'transport.html?id=return', 'review.html', 'profile.html', 'cart.html', 'tickets.html'];
    const staleHits = [];
    for (const f of pages) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(1200); const t = await p.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[title],[alt]')].map((e) => (e.getAttribute('title') || '') + ' ' + (e.getAttribute('alt') || '')).join(' ')); if (stale.test(t)) staleHits.push(f); }
    note('flight-no-stale-number-on-any-surface', staleHits.length === 0, staleHits.join(' ') || 'MU5920 / MU5924 absent from My Trip · The Journey · the transport page · Review · Profile · My Bag · the Travel Pass');
    await p.context().close(); await resetGuest('T001');
  }
  /* ===== 6c · THE PERSONAL DETAILS (the Owner's go-live instruction, 20 Sep 2026): Date of Birth · Nationality · Phone Number · Email Address · Private Mailing Address on the invitation page,
     persisted on the Worker under the guest's own invitation, shown on the profile, carried to Guest Relations; a couple's two members are two records (T001 Ada · T002 Ben, one party) ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
    await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const form = await p.evaluate(() => ({ ids: ['p-birthdate', 'p-nationality', 'p-phone', 'p-email', 'p-address1', 'p-address2', 'p-postal', 'p-city', 'p-region', 'p-country'].map((id) => !!document.getElementById(id)), date: (document.getElementById('p-birthdate') || {}).type, words: (document.querySelector('#personal') || {}).innerText || '', ids2: document.querySelectorAll('input[data-c="contactId"], input[data-c="couple"]').length }));
    note('personal-fields-on-the-invitation-page', form.ids.every(Boolean) && form.date === 'date' && /Date of Birth/i.test(form.words) && /Nationality/i.test(form.words) && /Private Mailing Address/i.test(form.words) && /Please share the address where you can reliably receive personal mail/i.test(form.words) && !/gift/i.test(form.words) && form.ids2 === 0, JSON.stringify({ ids: form.ids, date: form.date, noIdInputs: form.ids2 === 0 }));
    for (const [id, v] of [['p-birthdate', '1990-05-17'], ['p-nationality', 'Thai, German'], ['p-address1', 'Musterstraße 1'], ['p-postal', '10115'], ['p-city', 'Berlin'], ['p-region', 'Berlin'], ['p-country', 'Germany']]) { await p.fill('#' + id, v); await p.dispatchEvent('#' + id, 'change'); await p.waitForTimeout(250); }
    await p.waitForTimeout(1500);
    const srv = await api(p, '/api/contact');
    const local = await p.evaluate(() => ({ bd: SIYL_GUEST.contact('birthdate'), nat: SIYL_GUEST.contact('nationality'), addr: SIYL_GUEST.addressWords(), missing: SIYL_GUEST.personalMissing().length, ready: SIYL_GUEST.missingFor('you').length }));
    note('personal-details-saved-locally-and-on-the-worker', local.bd === '1990-05-17' && local.nat === 'Thai, German' && local.addr === 'Musterstraße 1, 10115 Berlin, Berlin, Germany' && local.missing === 0 && local.ready === 0 && srv.status === 200 && srv.body.contact && srv.body.contact.birthdate === '1990-05-17' && srv.body.contact.nationality === 'Thai, German' && srv.body.contact.country === 'Germany' && srv.body.contact.email === 'ada.test@example.org', JSON.stringify({ local, server: srv.body && srv.body.contact }));
    await shot(p, '390-invitation-personal-details');
    await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
    const prof = await p.evaluate(() => ({ card: (document.querySelector('[data-profile-personal]') || {}).innerText || '' }));
    await shot(p, '390-profile-personal-details');
    note('profile-shows-the-personal-details', /17 May 1990/.test(prof.card) && /Thai, German/.test(prof.card) && /Musterstraße 1, 10115 Berlin, Berlin, Germany/.test(prof.card) && /ada\.test@example\.org/.test(prof.card) && !/Still needed/.test(prof.card), prof.card.replace(/\s+/g, ' ').slice(0, 200));
    /* a fresh device of the same guest reads the server copy; the partner's device reads nothing of it */
    const p2 = await fresh(390); await signIn(p2, 'T001'); await p2.goto(O + '/profile.html', { waitUntil: 'load' }); await p2.waitForTimeout(2500);
    const again = await p2.evaluate(() => ({ bd: SIYL_GUEST.contact('birthdate'), city: SIYL_GUEST.contact('city') }));
    const p3 = await fresh(390); await signIn(p3, 'T002'); await p3.goto(O + '/profile.html', { waitUntil: 'load' }); await p3.waitForTimeout(2500);
    const partner = await p3.evaluate(() => ({ bd: SIYL_GUEST.contact('birthdate'), city: SIYL_GUEST.contact('city'), nat: SIYL_GUEST.contact('nationality'), card: (document.querySelector('[data-profile-personal]') || {}).innerText || '' }));
    const ben = await api(p3, '/api/contact');
    note('couple-members-are-two-records', again.bd === '1990-05-17' && again.city === 'Berlin' && partner.bd === '' && partner.city === '' && partner.nat === '' && /Still needed/.test(partner.card) && ben.status === 200 && (!ben.body.contact || !ben.body.contact.birthdate), JSON.stringify({ again, partner: { bd: partner.bd, city: partner.city }, ben: ben.body && ben.body.contact }));
    /* a write under the partner's invitation is refused */
    const forged = await api(p3, '/api/contact', { method: 'PUT', body: JSON.stringify({ invitationId: 'INV-T001', birthdate: '1980-01-01', seenReset: (ben.body && ben.body.resetAt) || null }) });
    const still = await api(p2, '/api/contact');
    note('no-cross-guest-write', forged.status === 403 && still.body.contact.birthdate === '1990-05-17', JSON.stringify({ forged: forged.status, ada: still.body.contact.birthdate }));
    for (const w of [320, 834]) { const q = await fresh(w); await signIn(q, 'T001'); await q.goto(O + '/invitation.html', { waitUntil: 'load' }); await q.waitForTimeout(1200); const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); note('invitation-personal-no-overflow-' + w, ov <= 1, 'overflow ' + ov); await q.context().close(); }
    await p.context().close(); await p2.context().close(); await p3.context().close(); await resetGuest('T001'); await resetGuest('T002');
  }

}

/* ===== 7 · THE DATED VENUES (public): Sühring a dinner on 21 February; the tea on 24 February; Baan Phraya, Cannubi, Petits Plats, Harudot in their rails ===== */
{
  const p = await fresh(390);
  await p.goto(O + '/experience.html?id=bkk-suhring', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const su = await p.evaluate(() => ({ head: (document.querySelector('.x-head .a-eyebrow') || {}).innerText || '', date: (document.querySelector('.x-head .x-when') || {}).innerText || '', ctx: (document.querySelector('.x-ctx') || {}).innerText || '', sel: (document.querySelector('#sel h2') || {}).innerText || '', when: document.body.innerText.includes('Dinner · Sunday, 21 February 2027') }));
  await shot(p, '390-suhring-dinner');
  note('suhring-is-the-dinner-of-21-february', /Restaurant/i.test(su.head) && /Sunday, 21 February 2027/i.test(su.date) && /Day 01 · 21\.02\.2027/i.test(su.ctx) && /Dinner at Sühring/.test(su.sel) && su.when, JSON.stringify(su));
  await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const rails = await p.evaluate(() => { const ids = (sel) => [...document.querySelectorAll(sel + ' [data-exp-id]')].map((e) => e.getAttribute('data-exp-id')); return { bkkRest: ids('[data-rails="bkk"] [data-rail="bkk:restaurant"]'), bkkCafe: ids('[data-rails="bkk"] [data-rail="bkk:cafe"]'), bkkExp: ids('[data-rails="bkk"] [data-rail="bkk:experience"]'), returnRail: !!document.querySelector('[data-rails="bkk-return"]'), noimg: [...document.querySelectorAll('.x-noimg')].map((e) => e.innerText.trim()), petitsImg: !!document.querySelector('[data-exp-id="bkk-petitsplats"] .am:not(.x-noimg)'), tea: document.body.innerText.includes('the afternoon of 24 February') }; });
  await shot(p, '390-experiences-rails');
  /* the taxonomy (22 Sep 2026): Bangkok is one chapter in the order of the days — the return venues sit at the end of each rail; Harudot a café once; Petits Plats with its photographs */
  note('venues-in-their-rails', rails.bkkRest.includes('bkk-suhring') && rails.bkkRest.includes('bkk-baanphraya') && !rails.bkkRest.includes('bkk-commons') && rails.bkkCafe.includes('bkk-harudot') && !rails.bkkExp.includes('bkk-harudot') && rails.bkkRest.includes('bkk-cannubi') && rails.bkkRest.includes('bkk-petitsplats') && rails.bkkRest.indexOf('bkk-cannubi') > rails.bkkRest.indexOf('bkk-suhring') && !rails.returnRail && !rails.noimg.includes('Petits Plats Bangkok') && rails.petitsImg && rails.tea, JSON.stringify(rails));
  await p.goto(O + '/experience.html?id=bkk-cannubi', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const ca = await p.evaluate(() => ({ imgs: [...document.querySelectorAll('.x-gal img')].map((i) => i.currentSrc || i.src).filter(Boolean).length, text: document.body.innerText, dress: /dress code/i.test(document.body.innerText) }));
  await shot(p, '390-cannubi');
  note('cannubi-page', ca.imgs >= 1 && /One MICHELIN Star/.test(ca.text) && /Day 15 · 07\.03\.2027/i.test(ca.text) && ca.dress, JSON.stringify({ imgs: ca.imgs, dress: ca.dress }));
  await p.goto(O + '/experience.html?id=bkk-baanphraya', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const bp = await p.evaluate(() => ({ imgs: [...document.querySelectorAll('.x-gal img')].length, text: document.body.innerText }));
  await shot(p, '390-baanphraya');
  note('baan-phraya-page', bp.imgs >= 1 && /Phraya Mahai Savan/.test(bp.text) && /Day 03 · 23\.02\.2027/i.test(bp.text), JSON.stringify({ imgs: bp.imgs }));
  await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const houses = await p.evaluate(() => ({ gh: document.body.innerText.includes('Guest House complimentary'), pr: /Private Residence|Photography to follow/.test(document.body.innerText), rv: !!document.querySelector('a.am[style*="riverside/facade.jpg"]'), rvHref: [...document.querySelectorAll('a.am')].map((a) => a.getAttribute('href')).filter((h) => /riverside/.test(h || '')) }));
  note('the-houses-guest-house-and-no-riverside', houses.gh && !houses.pr && !houses.rv && houses.rvHref.length === 0, JSON.stringify(houses));   /* the Riverside was deleted on 23 Sep 2026 */
  await p.context().close();
}

/* ===== 8 · widths, iPhone Safari and the console ===== */
for (const w of [320, 834, 1440]) { const p = await fresh(w); const over = []; for (const f of ['your-journey.html', 'room.html?stay=guesthouse&room=guest-house', 'experiences.html', 'journeys.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (ov > 1) over.push(f + ':' + ov); if (w === 320 || w === 1440) await shot(p, w + '-' + f.replace(/[^a-z]+/g, '-')); } note('no-horizontal-overflow-' + w, over.length === 0, over.join(' ') || 'no overflow'); await p.context().close(); }
if (!LIVE) {
  const wk = await webkit.launch(); const ctx = await wk.newContext(devices['iPhone 13']); const ip = await ctx.newPage(); ip.on('pageerror', (e) => errors.set('iphone ' + e.message, 1));
  await ip.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await ip.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await ip.fill('.siyl-inv input', codes['T001']); await ip.click('.siyl-inv .igo'); await ip.waitForTimeout(3000);
  await ip.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ip.waitForTimeout(2000); await ip.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await ip.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ip.waitForTimeout(2000);
  const tap = await ip.evaluate(() => [...document.querySelectorAll('[data-scope], [data-skip], .p-act')].slice(0, 12).map((e) => e.getBoundingClientRect().height).filter((h) => h > 0));
  const sheets = await ip.evaluate(() => ({ cards: document.querySelectorAll('[data-scope]').length, on: document.querySelectorAll('[data-scope][aria-pressed="true"]').length, stages: document.querySelectorAll('.p-stage[id^="s-"]:not(#s-wedding):not(#s-excluded)').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, drawer: !!document.querySelector('[data-package-preview], .p-pack') }));
  await ip.screenshot({ path: path.join(OUT, 'iphone-participation-sheets.png') });
  note('iphone-safari-participation-sheets', sheets.cards === 4 && sheets.on === 4 && sheets.stages === 10 && sheets.ov <= 1 && !sheets.drawer && tap.every((h) => h >= 40), JSON.stringify({ ...sheets, minTap: Math.min(...tap) }));
  await ip.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.skip', 'siyl.skip.by'].forEach((k) => localStorage.removeItem(k)); }); await wk.close();
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
