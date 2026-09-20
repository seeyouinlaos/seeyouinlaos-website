/* RELEASE 014 · THE CANONICAL BOOKING MODEL — E2E on the isolated stage worker (Owner, 19 Sep 2026).
   Synthetic guests only (T001 Ada · T002 Ben · T003 Cleo · G048/G049 the synthetic host pair of the stage register);
   codes read from the scratchpad, never printed.
     node docs/acceptance/2026-09-19-release-014/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: no fixed arrangement (the hosts start at zero) · party capacity on the room page · the Guest House
   complimentary (six shared places, occupants named to signed-in guests, complimentary line, one selection per stage) ·
   the Complete trip (preview with a named fallback and a waiting-list stage, confirm, summary, Profile and Review carry the
   waiting list, a freed room lets the guest choose, leaving the line) · the Essential trip (the Owner's definition of 20 Sep 2026: A–L) · the return flight MU5922 + MU741 · confirmation parity (record ·
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
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
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
    const st = await p.evaluate(() => ({ text: document.body.innerText, bag: SIYL_BAG.get().length, total: SIYL_BAG.total(), mine: Object.keys((SIYL_UNITS.view() || {}).mine || {}), fixed: (SIYL_UNITS.view() || {}).fixed, arranged: typeof window.SIYL_ARRANGED, packs: document.querySelectorAll('.p-pack').length, counts: (document.querySelector('[data-counts]') || {}).innerText || '' }));
    await shot(p, '390-host-my-trip-zero');
    note('host-starts-at-zero', st.bag === 0 && st.total === 0 && st.mine.length === 0 && st.fixed === undefined && st.arranged === 'undefined' && !/Arranged for you|Fixed arrangement/.test(st.text) && st.packs === 2 && /10 still open/.test(st.counts), JSON.stringify({ bag: st.bag, mine: st.mine, packs: st.packs, counts: st.counts }) + ' (one package card: the Complete trip; the Essential trip is not offered until the Owner defines it)');
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
    note('guest-house-six-places-complimentary', gh.price === 'Complimentary' && /six shared places/.test(gh.per) && gh.dots === 6 && gh.btn && /6 places available/.test(gh.av) && !/Private Residence|up to 4/i.test(gh.text), JSON.stringify({ price: gh.price, per: gh.per, dots: gh.dots, av: gh.av }));
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
    /* one selection per stage: the Riverside replaces the guest house — the place is released */
    await p.goto(O + '/room.html?stay=riverside&room=superior-window', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await p.click('.cta[data-avwin="riverside"]'); await p.waitForTimeout(2600);
    const m2 = await mine(p); const bag2 = await p.evaluate(() => SIYL_BAG.get().map((x) => x.id));
    note('one-selection-per-stage-riverside-replaces-guest-house', m2.mine && m2.mine.wedstay && m2.mine.wedstay.key === 'riverside/superior-window' && bag2.join() === 'riverside', JSON.stringify({ mine: m2.mine, bag: bag2 }));
    await p.context().close();
    await resetGuest('T003');
  }

  /* ===== 4 · THE COMPLETE TRIP (T002, a party of one): the Penthouse is full → U Sathorn is the named replacement; every Kunming option is full → the waiting list; the preview says it all, the confirm applies it, Profile and Review carry the line, a freed room opens the choice ===== */
  {
    const okFill = (await fillCategory('bkk-stay/penthouse', ['A', 'B', 'C', 'D', 'E', 'F'], 2)) && (await Promise.all(['left-bank', 'penang', 'family-suite', 'seine', 'smart-family', 'solarium', 'standard-single', 'junting', 'mid-century', 'milano', 'italian', 'light-french'].map((s) => fillCategory('kmg/' + s, ['A'], s === 'standard-single' ? 1 : 2)))).every(Boolean);
    note('complete-trip-fixture', okFill, 'Guest Relations filled the Penthouse and every Kunming category with synthetic occupants');
    const p = await fresh(390); await signIn(p, 'T002'); await contact(p, 'ben.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    const plan = await p.evaluate(() => { const pl = SIYL_JOURNEY.packagePlan('complete'); return { rows: pl.rows.map((r) => r.seg.key + ':' + r.why + ':' + (r.key || '')), total: pl.total, need: pl.need, waitlist: pl.waitlist, bag: SIYL_BAG.get().length, sig: SIYL_JOURNEY.planSignature(pl) }; });
    note('complete-trip-plan-pure', plan.rows.length === 10 && plan.bag === 0 && plan.rows.includes('bkk-stay:fallback:bkk-stay/u-sathorn-superior-garden') && plan.rows.includes('kmg:waitlist:') && plan.rows.includes('c86:default:c86') && plan.waitlist.join() === 'kmg' && plan.total === 1962, JSON.stringify(plan.rows) + ' total ' + plan.total + ' (64×3 + 100 + 340 + 170 + 275 + 0 + 105 + 200 + 200 + 380)');
    await p.click('[data-package-preview="complete"]'); await p.waitForTimeout(1500);
    const preview = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.fxl .fxr')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), fb: document.querySelectorAll('.fxl .fxr-fb').length, wl: document.querySelectorAll('.fxl .fxr-open').length, total: (document.querySelector('[data-fx-total]') || {}).innerText || '', held: SIYL_BAG.get().length }));
    await shot(p, '390-complete-trip-preview');
    note('complete-trip-preview-names-fallback-and-waiting-list', preview.rows.length === 10 && preview.fb === 1 && preview.wl === 1 && preview.rows.some((r) => /cannot take your party — this is the next option that can/.test(r)) && preview.rows.some((r) => /Waiting list/.test(r) && /waiting list — no cost until it is resolved/.test(r)) && /USD 1,962 per person/.test(preview.total) && /1 replacement/.test(preview.total) && /1 on the waiting list/.test(preview.total) && preview.held === 0, JSON.stringify({ fb: preview.fb, wl: preview.wl, total: preview.total, held: preview.held }));
    /* the engine changes while the drawer is open: nothing is applied, the change is said */
    await clearCategory('kmg/light-french');
    await p.click('#fxg'); await p.waitForTimeout(2500);
    const changed = await p.evaluate(() => ({ note: !!document.querySelector('[data-fx-changed]'), wl: document.querySelectorAll('.fxl .fxr-open').length, held: SIYL_BAG.get().length }));
    note('complete-trip-confirm-bound-to-preview', changed.note && changed.wl === 0 && changed.held === 0, JSON.stringify(changed) + ' (a Kunming room freed meanwhile: the preview is drawn again, nothing applied)');
    await fillCategory('kmg/light-french', ['A'], 2);
    await p.click('#fxg'); await p.waitForTimeout(2500);
    const changed2 = await p.evaluate(() => ({ note: !!document.querySelector('[data-fx-changed]'), wl: document.querySelectorAll('.fxl .fxr-open').length }));
    note('complete-trip-preview-back-to-waiting-list', changed2.note && changed2.wl === 1, JSON.stringify(changed2));
    await p.click('#fxg'); await p.waitForTimeout(12000);
    const after = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + (x.room ? ':' + x.room : '')).sort(), total: SIYL_BAG.total(), need: SIYL_GUEST.readiness().need.map((x) => x.key), summary: (document.querySelector('[data-fx-summary]') || {}).innerText || '', open: SIYL_JOURNEY.open().length, counts: SIYL_JOURNEY.counts(), card: !!document.querySelector('[data-waitlisted="kmg"]'), cardWords: (document.querySelector('[data-waitlisted="kmg"]') || {}).innerText || '' }));
    const m = await mine(p);
    await shot(p, '390-complete-trip-done');
    note('complete-trip-fills-nine-stages-and-waits-for-one', after.bag.length === 9 && after.open === 0 && !after.need.some((k) => /^(room|release|stage):/.test(k)) && Object.keys(m.mine).length === 5 && m.mine['bkk-stay'].key === 'bkk-stay/u-sathorn-superior-garden' && m.waitlist && m.waitlist.kmg && m.waitlist.kmg.position === 1 && /Complete trip selected 9 stages for you/.test(after.summary) && /Replaced because the suggested room could not take your party: 21 – 24 FEB · Bangkok/.test(after.summary) && /On the waiting list: 01 – 04 MAR · Kunming/.test(after.summary) && after.card && /number 1/i.test(after.cardWords) && after.counts.confirmed === 9 && after.counts.waitlisted === 1 && after.counts.bagTotal === after.total && after.total === 1962, JSON.stringify({ bag: after.bag.length, open: after.open, need: after.need, mine: Object.keys(m.mine), wait: m.waitlist, summary: after.summary.slice(0, 200), counts: after.counts }));
    /* determinism: the plan computed again keeps everything (same) and still waits for Kunming */
    const again = await p.evaluate(() => { const pl = SIYL_JOURNEY.packagePlan('complete'); return pl.rows.map((r) => r.seg.key + ':' + r.why); });
    note('complete-trip-idempotent', again.filter((r) => /:same$/.test(r)).length === 9 && again.includes('kmg:waitlist'), again.join(' '));
    /* Profile and Review carry the waiting list; readiness is complete for the journey step */
    await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const prof = await p.evaluate(() => ({ card: (document.querySelector('[data-profile-item="waitlist:kmg"]') || {}).innerText || '', text: document.body.innerText }));
    await shot(p, '390-profile-waiting-list');
    note('profile-shows-the-waiting-list-position', /waiting list/i.test(prof.card) && /number 1/.test(prof.card) && !/Arranged for you/.test(prof.text), prof.card.replace(/\s+/g, ' ').slice(0, 160));
    /* every other step answered: Review shows the waiting list and lets the trip be sent as it stands */
    await wedding(p, 'yes', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-07-02'], ['dinner', 'D-T-07']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', event: ev, seatId, name: 'Ben' }) }); if (sr.status !== 200) note('seat-' + ev, false, JSON.stringify(sr.body)); }
    await about(p, 'Matcha Green Tea');
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const rev = await p.evaluate(() => ({ arranged: (document.querySelector('#arranged') || {}).innerText || '', text: document.querySelector('main').innerText.replace(/\s+/g, ' ') }));
    await shot(p, '390-review-waiting-list');
    note('review-shows-the-waiting-list', /Waiting list/i.test(rev.arranged) && /Kunming/.test(rev.arranged) && /number 1/i.test(rev.arranged) && !/Arranged for you|Fixed arrangement/.test(rev.text) && /U Sathorn/.test(rev.text), rev.arranged.replace(/\s+/g, ' ').slice(0, 160) + ' · send open: ' + (await p.evaluate(() => !!document.querySelector('#send:not([disabled])'))));
    /* a Kunming room frees: the guest chooses it from the waiting-list card, and the line resolves with the hold */
    await clearCategory('kmg/italian');
    await trip(p);
    const card = await p.evaluate(() => ({ card: !!document.querySelector('[data-waitlisted="kmg"]'), choose: !!document.querySelector('[data-waitlisted="kmg"] a[href*="journeys.html#j-kmg"]'), unwait: !!document.querySelector('[data-waitlisted="kmg"] [data-unwait="kmg"]') }));
    note('waiting-list-card-offers-the-choice', card.card && card.choose && card.unwait, JSON.stringify(card));
    await p.goto(O + '/room.html?stay=kunming&room=italian', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    const canChoose = await p.evaluate(() => ({ btn: !!document.querySelector('[data-join="kmg|italian|A"]'), cta: (document.querySelector('.cta[data-avwin="kmg"]') || {}).disabled }));
    await p.click('.cta[data-avwin="kmg"]'); await p.waitForTimeout(2600);
    const m2 = await mine(p);
    note('a-freed-room-resolves-the-waiting-list', canChoose.btn && canChoose.cta === false && m2.mine.kmg && m2.mine.kmg.key === 'kmg/italian' && !(m2.waitlist && m2.waitlist.kmg), JSON.stringify({ canChoose, kmg: m2.mine.kmg, wait: m2.waitlist }));
    await trip(p);
    const done = await p.evaluate(() => ({ counts: SIYL_JOURNEY.counts(), card: !!document.querySelector('[data-waitlisted="kmg"]'), bag: SIYL_BAG.get().length, total: SIYL_BAG.total() }));
    note('trip-complete-after-the-waiting-list', done.counts.confirmed === 10 && done.counts.waitlisted === 0 && done.counts.open === 0 && !done.card && done.bag === 10 && done.total === 2112, JSON.stringify(done));
    /* Review & Send with the whole trip: the record and both emails carry it; no arranged section; not a host */
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const sent = await p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn || btn.disabled) return { clicked: false, need: SIYL_GUEST.readiness().need.map((x) => x.key) }; btn.click(); await new Promise((r) => setTimeout(r, 7000)); return { clicked: true }; });
    const rec = await gr('/api/gr/record?invitation=INV-T002');
    const gm = rec.body && rec.body.guestMail ? rec.body.guestMail.text : '', om = rec.body && rec.body.ownerMail ? rec.body.ownerMail.text : '';
    const sel = rec.body && rec.body.record ? (rec.body.record.registration.selections || []).map((x) => x.id).sort() : [];
    const stageNames = ['Special Express No. 25', 'Pre-Wedding', 'Wedding Stay', 'MU9646', 'Wanxiang', 'C86', 'Luye Baisha', 'MU5922', 'Kempinski', 'U Sathorn'];
    const missGuest = stageNames.filter((n) => !gm.includes(n)), missOwner = stageNames.filter((n) => !om.includes(n));
    note('parity-record-emails-complete-trip', sent.clicked && rec.status === 200 && rec.body.record && rec.body.record.hosts === false && sel.length === 10 && missGuest.length === 0 && missOwner.length === 0 && /USD 105/.test(gm) && /MU5922 \+ MU741/.test(gm) && /MU5922 \+ MU741/.test(om) && !/MU5920|MU5924/.test(gm + om) && !/ARRANGED FOR YOU|Arranged for you|WAITING LIST/.test(gm + om) && !/Private Residence/.test(gm + om), JSON.stringify({ sent, status: rec.status, hosts: rec.body && rec.body.record && rec.body.record.hosts, sel: sel.length, missGuest, missOwner }));
    fs.writeFileSync(path.join(OUT, 'parity-guest-mail.txt'), gm); fs.writeFileSync(path.join(OUT, 'parity-owner-mail.txt'), om);
    await p.context().close(); await resetGuest('T002');
  }

  /* ===== 5 · A WAITING-LIST STAGE IN THE RECORD AND THE EMAILS (T003, Vientiane + China): Lijiang full for everyone → the Complete trip waits; Review & Send goes out with the line named ===== */
  {
    const filled = (await Promise.all(['starry-sky', 'boundless', 'private-soup-view', 'manor-suite', 'view-suite-270', 'soup-pool-270', 'private-courtyard-270', 'viewing-270', 'snow-mountain-viewing'].map((s) => fillCategory('ljg/' + s, ['A', 'B', 'C', 'D', 'E', 'F'], 2)))).every(Boolean);
    note('waiting-list-fixture', filled, 'every Lijiang room holds synthetic occupants (6 rooms per category — the current master)');
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope({ vientiane: true, china: true }); }); await trip(p);
    await p.click('[data-package-preview="complete"]'); await p.waitForTimeout(1500);
    const pv = await p.evaluate(() => ({ rows: document.querySelectorAll('.fxl .fxr').length, wl: [...document.querySelectorAll('.fxl .fxr-open')].map((e) => e.innerText.replace(/\s+/g, ' ')) }));
    await p.click('#fxg'); await p.waitForTimeout(12000);
    const m = await mine(p);
    const st = await p.evaluate(() => ({ counts: SIYL_JOURNEY.counts(), need: SIYL_GUEST.readiness().need.map((x) => x.key) }));
    note('complete-trip-vientiane-china-waits-for-lijiang', pv.rows === 7 && pv.wl.length === 1 && /04 – 06 MAR · Lijiang/i.test(pv.wl[0]) && m.waitlist && m.waitlist.ljg && m.waitlist.ljg.position === 1 && st.counts.relevant === 7 && st.counts.confirmed === 6 && st.counts.waitlisted === 1 && st.counts.excluded === 3 && !st.need.some((k) => /ljg/.test(k)), JSON.stringify({ rows: pv.rows, wl: pv.wl, wait: m.waitlist, counts: st.counts }));
    await wedding(p, 'no', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-07-03'], ['dinner', 'D-T-08']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) }); if (sr.status !== 200) note('seat-t003-' + ev, false, JSON.stringify(sr.body)); }
    await about(p, 'Pandan');
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const sent = await p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn || btn.disabled) return { clicked: false, need: SIYL_GUEST.readiness().need.map((x) => x.key) }; btn.click(); await new Promise((r) => setTimeout(r, 7000)); return { clicked: true }; });
    const rec = await gr('/api/gr/record?invitation=INV-T003');
    const gm = rec.body && rec.body.guestMail ? rec.body.guestMail.text : '', gh = rec.body && rec.body.guestMail ? rec.body.guestMail.html : '', om = rec.body && rec.body.ownerMail ? rec.body.ownerMail.text : '';
    const rooms = rec.body && rec.body.record ? rec.body.record.rooms : null;
    await shot(p, '390-review-sent-waiting-list');
    note('parity-waiting-list-in-record-and-emails', sent.clicked && rec.status === 200 && rooms && rooms.ljg && rooms.ljg.waitlisted === true && rooms.ljg.position === 1 && /WAITING LIST/.test(gm) && /Lijiang/.test(gm) && /number 1/.test(gm) && /Waiting list/.test(gh) && /WAITING LIST/.test(om) && !/USD 0/.test(gm.split('WAITING LIST')[1] || '') && !/ARRANGED/.test(gm + om), JSON.stringify({ sent, rooms: rooms && rooms.ljg, guest: /WAITING LIST/.test(gm), owner: /WAITING LIST/.test(om) }));
    fs.writeFileSync(path.join(OUT, 'parity-guest-mail-waitlist.txt'), gm); fs.writeFileSync(path.join(OUT, 'parity-owner-mail-waitlist.txt'), om);
    /* leaving the line from My Trip */
    await trip(p); await p.click('[data-waitlisted="ljg"] [data-unwait="ljg"]'); await p.waitForTimeout(2500);
    const m2 = await mine(p); const st2 = await p.evaluate(() => ({ state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'ljg')), counts: SIYL_JOURNEY.counts() }));
    note('leaving-the-waiting-list', !(m2.waitlist && m2.waitlist.ljg) && st2.state === 'open' && st2.counts.waitlisted === 0 && st2.counts.open === 1, JSON.stringify(st2));
    await p.context().close();
    for (const s of ['starry-sky', 'boundless', 'private-soup-view', 'manor-suite', 'view-suite-270', 'soup-pool-270', 'private-courtyard-270', 'viewing-270', 'snow-mountain-viewing']) await clearCategory('ljg/' + s);
  }

  /* ===== 6 · THE ESSENTIAL TRIP (the Owner's definition of 20 Sep 2026 — Package C + D1 at the Souphattra Heritage, the Heritage Executive first; T001, Vientiane only):
     A the card at zero state · B available → the Heritage Executive, previewed then held · I/J/K the switches Essential → Individual → Complete → Essential ·
     C/D sold out → the next category of the house at its actual price (more affordable, then dearer) · G the engine changes between preview and confirm → recomputed, nothing applied ·
     F no Souphattra category can take the party → the WAITING LIST (position on My Trip · Profile · Review) · H the Complete trip unchanged · E the party rule (G048 + G049) ===== */
  {
    const SOUPHATTRA = ['heritage-executive', 'heritage', 'heritage-grand-premier', 'noble-courtyard', 'grand-majestic', 'souphattra-majestic', 'souphattra-presidential'];
    const labelsOf = async (key) => { const plan = await gr('/api/rooms/plan'); return (plan.body && plan.body.units && plan.body.units[key] || []).map((u) => u.label); };
    const essential = (p) => p.evaluate(() => { const pl = SIYL_JOURNEY.packagePlan('essential'); return { ready: pl.ready, need: pl.need, rows: pl.rows.map((r) => r.seg.key + ':' + r.why + ':' + (r.key || '') + ':' + (r.unit || '') + ':' + r.amount), tried: pl.rows.map((r) => r.tried || []), total: pl.total, waitlist: pl.waitlist, bag: SIYL_BAG.get().length, replaced: pl.counts.replaced }; });
    const previewRows = (p) => p.evaluate(() => ({ rows: [...document.querySelectorAll('.fxl .fxr')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), fb: document.querySelectorAll('.fxl .fxr-fb').length, wl: document.querySelectorAll('.fxl .fxr-open').length, total: (document.querySelector('[data-fx-total]') || {}).innerText || '', changed: !!document.querySelector('[data-fx-changed]'), held: SIYL_BAG.get().length }));
    await resetGuest('T002'); await resetGuest('T003'); await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-014' }, 'POST');   /* the earlier sections' guests leave first: the house starts empty */
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope({ vientiane: true }); }); await trip(p);
    /* A · the zero-state guest sees the Essential card beside the Complete card — the same presentation, one preview action each */
    const cards = await p.evaluate(() => ({ cards: [...document.querySelectorAll('.p-pack')].map((e) => ({ kind: e.getAttribute('data-package'), btn: !!e.querySelector('[data-package-preview]'), text: e.innerText.replace(/\s+/g, ' ') })), order: SIYL_JOURNEY.packageOrder(), def: { approved: SIYL_PACKAGES.essential.approved, stages: Object.keys(SIYL_PACKAGES.essential.stages), wed: SIYL_PACKAGES.essential.stages.wedstay, pre: SIYL_PACKAGES.essential.stages.prewed } }));
    const ess = cards.cards.find((c) => c.kind === 'essential');
    note('A-essential-card-offered-at-zero-state', cards.cards.length === 2 && cards.cards[0].kind === 'complete' && ess && ess.btn && cards.order.join() === 'complete,essential' && cards.def.approved === true && cards.def.stages.join() === 'prewed,wedstay' && cards.def.wed.join() === SOUPHATTRA.map((s) => 'wedstay/' + s).join() && cards.def.pre.join() === SOUPHATTRA.map((s) => 'prewed/' + s).join() && /Essential trip/i.test(ess.text) && /Souphattra Heritage/i.test(ess.text) && /2 stages of your trip · Vientiane/.test(ess.text) && /USD 465 per person/i.test(ess.text) && /Preview essential trip/i.test(ess.text), JSON.stringify({ cards: cards.cards.map((c) => c.kind + ':' + c.btn), def: cards.def.stages, text: ess && ess.text.slice(0, 160) }));
    await shot(p, '390-package-cards');
    const zero = await essential(p);
    note('B-available-plan-is-the-heritage-executive', zero.ready && zero.rows.length === 2 && /^prewed:default:prewed\/heritage-executive:[A-Z]+:310$/.test(zero.rows[0]) && /^wedstay:default:wedstay\/heritage-executive:[A-Z]+:155$/.test(zero.rows[1]) && zero.total === 465 && zero.waitlist.length === 0 && zero.bag === 0, JSON.stringify(zero.rows) + ' need ' + zero.need);
    /* B · the preview names the hotel, the category, the dates and the cost of each stage; the confirm holds exactly that */
    await p.click('[data-package-preview="essential"]'); await p.waitForTimeout(1500);
    const pv = await previewRows(p);
    await shot(p, '390-essential-preview');
    note('B-preview-hotel-category-dates-cost', pv.rows.length === 2 && /25 – 27 FEB · Vientiane/i.test(pv.rows[0]) && /Heritage Executive · Pre-Wedding Stay · Souphattra Heritage/i.test(pv.rows[0]) && /USD 310 per person/.test(pv.rows[0]) && /27 FEB – 01 MAR · Vientiane/i.test(pv.rows[1]) && /Heritage Executive · Wedding Stay · Souphattra Heritage/i.test(pv.rows[1]) && /USD 155 per person/.test(pv.rows[1]) && /USD 465 per person/.test(pv.total) && /2 stages/.test(pv.total) && pv.fb === 0 && pv.wl === 0 && pv.held === 0 && !/Riverside|Guest House/i.test(pv.rows.join(' ')), JSON.stringify(pv));
    await p.click('#fxg'); await p.waitForTimeout(6000);
    let m = await mine(p); let st = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total(), counts: SIYL_JOURNEY.counts(), summary: (document.querySelector('[data-fx-summary]') || {}).innerText || '' }));
    await shot(p, '390-essential-done');
    note('B-confirm-holds-the-heritage-executive-twice', m.mine && m.mine.prewed && m.mine.prewed.key === 'prewed/heritage-executive' && m.mine.wedstay && m.mine.wedstay.key === 'wedstay/heritage-executive' && Object.keys(m.mine).length === 2 && !(m.waitlist && Object.keys(m.waitlist).length) && st.bag.join() === 'prewed:heritage-executive,wedstay:heritage-executive' && st.total === 465 && st.counts.confirmed === 2 && st.counts.open === 0 && /Essential trip selected 2 stages for you/.test(st.summary), JSON.stringify({ mine: m.mine, ...st }));
    /* K · Essential → Individual: the guest changes the wedding stay by hand on the room page; one hold per stage, the package's line gives way */
    await p.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await p.click('.cta[data-avwin="wedstay"]'); await p.waitForTimeout(2600);
    m = await mine(p); st = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total() }));
    note('K-essential-to-individual-one-hold-per-stage', m.mine.wedstay && m.mine.wedstay.key === 'wedstay/heritage' && m.mine.prewed.key === 'prewed/heritage-executive' && Object.keys(m.mine).length === 2 && st.bag.join() === 'prewed:heritage-executive,wedstay:heritage' && st.total === 455, JSON.stringify({ mine: m.mine, ...st }));
    /* I · Essential → Complete: the Complete trip's Vientiane defaults replace both stays — named as replacements, previewed, held; nothing is held twice */
    await trip(p); await p.click('[data-package-preview="complete"]'); await p.waitForTimeout(1500);
    const pvc = await previewRows(p);
    await p.click('#fxg'); await p.waitForTimeout(6000);
    m = await mine(p); st = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total(), counts: SIYL_JOURNEY.counts() }));
    note('I-essential-to-complete-clean-switch', pvc.rows.length === 2 && pvc.rows.every((r) => /Heritage Grand Premier/i.test(r) && /Replaces your current/.test(r)) && /replaces 2 of your current selections/.test(pvc.total) && m.mine.prewed.key === 'prewed/heritage-grand-premier' && m.mine.wedstay.key === 'wedstay/heritage-grand-premier' && Object.keys(m.mine).length === 2 && st.bag.join() === 'prewed:heritage-grand-premier,wedstay:heritage-grand-premier' && st.total === 510 && st.counts.confirmed === 2, JSON.stringify({ pv: pvc.total, mine: m.mine, ...st }));
    /* J · Complete → Essential: back to the Heritage Executive, both stays replaced, one hold per stage */
    await p.click('[data-package-preview="essential"]'); await p.waitForTimeout(1500);
    const pve = await previewRows(p);
    await p.click('#fxg'); await p.waitForTimeout(6000);
    m = await mine(p); st = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total(), again: SIYL_JOURNEY.packagePlan('essential').rows.map((r) => r.why) }));
    note('J-complete-to-essential-clean-switch', pve.rows.length === 2 && pve.rows.every((r) => /Heritage Executive/i.test(r) && /Replaces your current/.test(r)) && m.mine.prewed.key === 'prewed/heritage-executive' && m.mine.wedstay.key === 'wedstay/heritage-executive' && Object.keys(m.mine).length === 2 && st.bag.join() === 'prewed:heritage-executive,wedstay:heritage-executive' && st.total === 465 && st.again.join() === 'same,same', JSON.stringify({ mine: m.mine, ...st }));
    await p.context().close(); await resetGuest('T001');
    /* C · the Heritage Executive sold out for the wedding window → the next category of the SAME house, The Heritage (USD 145 — more affordable, at its actual price; price never decided) */
    const EXEC = await labelsOf('wedstay/heritage-executive'), HER = await labelsOf('wedstay/heritage'), GP = await labelsOf('wedstay/heritage-grand-premier');
    note('C-fixture-executive-sold-out', EXEC.length === 13 && HER.length === 5 && GP.length === 3 && (await fillCategory('wedstay/heritage-executive', EXEC, 2)), 'Guest Relations filled the thirteen Heritage Executive rooms of the wedding window with synthetic occupants');
    const p2 = await fresh(390); await signIn(p2, 'T001'); await contact(p2, 'ada.test@example.org');
    await trip(p2); await p2.evaluate(() => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope({ vientiane: true }); }); await trip(p2);
    const c1 = await essential(p2);
    note('C-sold-out-falls-to-the-heritage', c1.ready && /^prewed:default:prewed\/heritage-executive:/.test(c1.rows[0]) && /^wedstay:fallback:wedstay\/heritage:[A-Z]+:145$/.test(c1.rows[1]) && c1.tried[1].join() === 'wedstay/heritage-executive,wedstay/heritage' && c1.total === 455 && c1.waitlist.length === 0, JSON.stringify(c1.rows) + ' tried ' + JSON.stringify(c1.tried[1]));
    await p2.click('[data-package-preview="essential"]'); await p2.waitForTimeout(1500);
    const pv1 = await previewRows(p2);
    await shot(p2, '390-essential-fallback-heritage');
    note('C-preview-says-the-replacement', pv1.fb === 1 && /The Heritage · Wedding Stay · Souphattra Heritage/i.test(pv1.rows[1]) && /USD 145 per person/.test(pv1.rows[1]) && /cannot take your party — this is the next option that can/.test(pv1.rows[1]) && /USD 455 per person/.test(pv1.total) && /1 replacement/.test(pv1.total) && !/Riverside|Guest House/i.test(pv1.rows.join(' ')), JSON.stringify(pv1));
    /* G · the engine changes between the preview and the confirm (an Executive room frees): nothing is applied, the preview is drawn again with the default */
    await gr('/api/rooms/unassign', { key: 'wedstay/heritage-executive', guestId: 'Zwedstayheritageexecutive' + EXEC[0] + '0', actor: 'e2e-014' });
    await gr('/api/rooms/unassign', { key: 'wedstay/heritage-executive', guestId: 'Zwedstayheritageexecutive' + EXEC[0] + '1', actor: 'e2e-014' });
    await p2.click('#fxg'); await p2.waitForTimeout(2500);
    const g1 = await previewRows(p2); const gm1 = await mine(p2);
    note('G-inventory-change-recomputes-nothing-applied', g1.changed && g1.fb === 0 && g1.held === 0 && /Heritage Executive · Wedding Stay/i.test(g1.rows[1]) && /USD 465 per person/.test(g1.total) && Object.keys(gm1.mine || {}).length === 0, JSON.stringify({ changed: g1.changed, fb: g1.fb, total: g1.total, held: g1.held }));
    await fillCategory('wedstay/heritage-executive', [EXEC[0]], 2);
    await p2.click('#fxg'); await p2.waitForTimeout(2500);
    const g2 = await previewRows(p2);
    note('G-preview-back-to-the-fallback', g2.changed && g2.fb === 1 && /USD 455 per person/.test(g2.total), JSON.stringify({ changed: g2.changed, fb: g2.fb, total: g2.total }));
    await p2.click('#fxg'); await p2.waitForTimeout(6000);
    m = await mine(p2); st = await p2.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total(), summary: (document.querySelector('[data-fx-summary]') || {}).innerText || '' }));
    note('C-confirm-holds-the-heritage-at-its-actual-price', m.mine.wedstay && m.mine.wedstay.key === 'wedstay/heritage' && m.mine.prewed.key === 'prewed/heritage-executive' && st.bag.join() === 'prewed:heritage-executive,wedstay:heritage' && st.total === 455 && /Replaced because the suggested room could not take your party: 27 FEB – 01 MAR · Vientiane/.test(st.summary), JSON.stringify({ mine: m.mine, ...st }));
    await p2.context().close(); await resetGuest('T001');
    /* D · The Heritage sold out too → the Heritage Grand Premier (USD 170 — dearer than the default, at its actual price) — the chain continues in the hotel's order */
    note('D-fixture-heritage-sold-out', await fillCategory('wedstay/heritage', HER, 2), 'Guest Relations filled the five Heritage rooms of the wedding window');
    const p3 = await fresh(390); await signIn(p3, 'T001'); await contact(p3, 'ada.test@example.org');
    await trip(p3); await p3.evaluate(() => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope({ vientiane: true }); }); await trip(p3);
    const d1 = await essential(p3);
    note('D-chain-continues-to-the-grand-premier-dearer', d1.ready && /^wedstay:fallback:wedstay\/heritage-grand-premier:[A-Z]+:170$/.test(d1.rows[1]) && d1.tried[1].join() === 'wedstay/heritage-executive,wedstay/heritage,wedstay/heritage-grand-premier' && d1.total === 480, JSON.stringify(d1.rows) + ' tried ' + JSON.stringify(d1.tried[1]));
    /* F · every category of the Souphattra full for the wedding window → the WAITING LIST: never the Riverside, never the Guest House; USD 0 for the stage; the position visible on My Trip, Profile and Review */
    let filledRest = true; for (const s of ['heritage-grand-premier', 'noble-courtyard', 'grand-majestic', 'souphattra-majestic', 'souphattra-presidential']) { const ls = await labelsOf('wedstay/' + s); if (!ls.length || !(await fillCategory('wedstay/' + s, ls, 2))) filledRest = false; }
    note('F-fixture-souphattra-full', filledRest, 'Guest Relations filled every remaining Souphattra category of the wedding window');
    await trip(p3);
    const f1 = await essential(p3);
    note('F-no-souphattra-room-plans-the-waiting-list', f1.ready && /^prewed:default:prewed\/heritage-executive:/.test(f1.rows[0]) && f1.rows[1] === 'wedstay:waitlist:::0' && f1.tried[1].join() === SOUPHATTRA.map((s) => 'wedstay/' + s).join() && !f1.tried[1].some((k) => /riverside|guesthouse/.test(k)) && f1.waitlist.join() === 'wedstay' && f1.total === 310, JSON.stringify(f1.rows) + ' tried ' + f1.tried[1].length);
    await p3.click('[data-package-preview="essential"]'); await p3.waitForTimeout(1500);
    const pvf = await previewRows(p3);
    await shot(p3, '390-essential-waiting-list-preview');
    note('F-preview-names-the-waiting-list', pvf.wl === 1 && /Waiting list/.test(pvf.rows[1]) && /waiting list — no cost until it is resolved/.test(pvf.rows[1]) && /USD 310 per person/.test(pvf.total) && /1 on the waiting list/.test(pvf.total) && !/Riverside|Guest House/i.test(pvf.rows.join(' ')), JSON.stringify(pvf));
    await p3.click('#fxg'); await p3.waitForTimeout(6000);
    m = await mine(p3); st = await p3.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room).sort(), total: SIYL_BAG.total(), counts: SIYL_JOURNEY.counts(), summary: (document.querySelector('[data-fx-summary]') || {}).innerText || '', card: (document.querySelector('[data-waitlisted="wedstay"]') || {}).innerText || '', unwait: !!document.querySelector('[data-waitlisted="wedstay"] [data-unwait="wedstay"]') }));
    await shot(p3, '390-essential-waiting-list-my-trip');
    note('F-confirm-waits-with-a-visible-position', m.mine.prewed && m.mine.prewed.key === 'prewed/heritage-executive' && !m.mine.wedstay && m.waitlist && m.waitlist.wedstay && m.waitlist.wedstay.position === 1 && st.bag.join() === 'prewed:heritage-executive' && st.total === 310 && st.counts.waitlisted === 1 && st.counts.confirmed === 1 && st.counts.open === 0 && /On the waiting list: 27 FEB – 01 MAR · Vientiane/.test(st.summary) && /number 1/i.test(st.card) && st.unwait, JSON.stringify({ mine: m.mine, wait: m.waitlist, card: st.card.replace(/\s+/g, ' ').slice(0, 120) }));
    await p3.goto(O + '/profile.html', { waitUntil: 'load' }); await p3.waitForTimeout(2200);
    const prof = await p3.evaluate(() => ({ card: (document.querySelector('[data-profile-item="waitlist:wedstay"]') || {}).innerText || '' }));
    await wedding(p3, 'yes', 'yes'); await prep(p3);
    for (const [ev, seatId] of [['ceremony', 'C-R-06-01'], ['dinner', 'D-T-09']]) { const sr = await api(p3, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', event: ev, seatId, name: 'Ada' }) }); if (sr.status !== 200) note('seat-' + ev + '-t001', false, JSON.stringify(sr.body)); }
    await about(p3, 'Pandan');
    await p3.goto(O + '/review.html', { waitUntil: 'load' }); await p3.waitForTimeout(2500);
    const rev = await p3.evaluate(() => ({ arranged: (document.querySelector('#arranged') || {}).innerText || '', text: (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ') }));
    await shot(p3, '390-essential-waiting-list-review');
    note('F-profile-and-review-carry-the-position', /waiting list/i.test(prof.card) && /number 1/i.test(prof.card) && /Waiting list/i.test(rev.arranged) && /Vientiane/.test(rev.arranged) && /number 1/i.test(rev.arranged) && /Heritage Executive/i.test(rev.text) && !/Riverside|Guest House/i.test(rev.arranged), JSON.stringify({ prof: prof.card.replace(/\s+/g, ' ').slice(0, 120), rev: rev.arranged.replace(/\s+/g, ' ').slice(0, 120) }));
    /* H · the Complete trip is unchanged by the Essential definition: its Vientiane chain still ends with the Riverside and the Guest House, and with the Souphattra full it falls to the Riverside */
    const h1 = await p3.evaluate(() => { const pl = SIYL_JOURNEY.packagePlan('complete'); const c = SIYL_PACKAGES.complete.stages.wedstay; return { row: pl.rows.filter((r) => r.seg.key === 'wedstay').map((r) => r.why + ':' + (r.key || ''))[0], tail: c.slice(-2), len: c.length, first: c[0] }; });
    note('H-complete-trip-unchanged', h1.first === 'wedstay/heritage-grand-premier' && h1.len === 9 && h1.tail.join() === 'riverside/superior-window,guesthouse/guest-house' && h1.row === 'fallback:riverside/superior-window', JSON.stringify(h1));
    await p3.context().close(); await resetGuest('T001');
    for (const s of SOUPHATTRA) await clearCategory('wedstay/' + s);
    /* E · the party rule (G048 + G049, one party of two): one stranger in every Executive room — the party fits none of them; the chain continues to The Heritage; the confirm keeps the partner's place */
    note('E-fixture-one-place-per-executive-room', await fillCategory('wedstay/heritage-executive', EXEC, 1), 'one synthetic occupant in each of the thirteen Executive rooms');
    const p4 = await fresh(390); await signIn(p4, 'G048'); await contact(p4, 'host.test@example.org');
    await trip(p4); await p4.evaluate(() => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope({ vientiane: true }); }); await trip(p4);
    const e1 = await essential(p4);
    note('E-party-does-not-fit-continues-the-chain', e1.need === 2 && /^wedstay:fallback:wedstay\/heritage:[A-Z]+:145$/.test(e1.rows[1]) && e1.tried[1].join() === 'wedstay/heritage-executive,wedstay/heritage' && /^prewed:default:prewed\/heritage-executive:/.test(e1.rows[0]), JSON.stringify(e1.rows) + ' need ' + e1.need);
    await p4.click('[data-package-preview="essential"]'); await p4.waitForTimeout(1500); await p4.click('#fxg'); await p4.waitForTimeout(6000);
    m = await mine(p4);
    const occ = await p4.evaluate(() => { const v = SIYL_UNITS.view(); const u = SIYL_UNITS.units('wedstay', 'heritage').find((x) => x.label === (v.mine.wedstay || {}).label); return u ? u.occupants.map((o) => o.name + (o.placeholder ? '*' : '')) : []; });
    note('E-confirm-holds-the-whole-party', m.mine.wedstay && m.mine.wedstay.key === 'wedstay/heritage' && occ.length === 2 && occ.some((n) => /\*$/.test(n)), JSON.stringify({ wedstay: m.mine.wedstay, occ }));
    await p4.context().close(); await resetGuest('G048'); await resetGuest('G049');
    await clearCategory('wedstay/heritage-executive');
    await resetGuest('T002'); await resetGuest('T003');
    await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-014' }, 'POST');
  }

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
}

/* ===== 7 · THE DATED VENUES (public): Sühring a dinner on 21 February; the tea on 24 February; Baan Phraya, Cannubi, Petits Plats, Harudot in their rails ===== */
{
  const p = await fresh(390);
  await p.goto(O + '/experience.html?id=bkk-suhring', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const su = await p.evaluate(() => ({ head: (document.querySelector('.x-head .a-eyebrow') || {}).innerText || '', ctx: (document.querySelector('.x-ctx') || {}).innerText || '', sel: (document.querySelector('#sel h2') || {}).innerText || '', when: document.body.innerText.includes('Dinner · Sunday, 21 February 2027') }));
  await shot(p, '390-suhring-dinner');
  note('suhring-is-the-dinner-of-21-february', /Dinner/i.test(su.head) && /21 FEB 2027/.test(su.head) && /Day 01 · 21\.02\.2027/i.test(su.ctx) && /Dinner at Sühring/.test(su.sel) && su.when, JSON.stringify(su));
  await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const rails = await p.evaluate(() => { const ids = (sel) => [...document.querySelectorAll(sel + ' [data-exp-id]')].map((e) => e.getAttribute('data-exp-id')); return { bkkRest: ids('[data-rails="bkk"] [data-rail="bkk:breakfast"]'), bkkCafe: ids('[data-rails="bkk"] [data-rail="bkk:cafe"]'), bkkExp: ids('[data-rails="bkk"] [data-rail="bkk:experience"]'), retRest: ids('[data-rails="bkk-return"] [data-rail="bkk-return:breakfast"]'), retExp: ids('[data-rails="bkk-return"] [data-rail="bkk-return:experience"]'), retCafe: ids('[data-rails="bkk-return"] [data-rail="bkk-return:cafe"]'), noimg: [...document.querySelectorAll('.x-noimg')].map((e) => e.innerText.trim()), tea: document.body.innerText.includes('the afternoon of 24 February') }; });
  await shot(p, '390-experiences-rails');
  note('venues-in-their-rails', rails.bkkRest.includes('bkk-suhring') && rails.bkkRest.includes('bkk-baanphraya') && !rails.bkkRest.includes('bkk-commons') && rails.bkkCafe.includes('bkk-harudot') && !rails.bkkExp.includes('bkk-harudot') && rails.retRest.includes('bkk-cannubi') && rails.retRest.includes('bkk-petitsplats') && rails.retExp.includes('bkk-harudot') && rails.retCafe.length === 0 && rails.noimg.includes('Petits Plats Bangkok') && rails.tea, JSON.stringify(rails));
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
  note('the-houses-guest-house-and-riverside', houses.gh && !houses.pr && houses.rv, JSON.stringify(houses));
  await p.context().close();
}

/* ===== 8 · widths, iPhone Safari and the console ===== */
for (const w of [320, 834, 1440]) { const p = await fresh(w); const over = []; for (const f of ['your-journey.html', 'room.html?stay=guesthouse&room=guest-house', 'experiences.html', 'journeys.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (ov > 1) over.push(f + ':' + ov); if (w === 320 || w === 1440) await shot(p, w + '-' + f.replace(/[^a-z]+/g, '-')); } note('no-horizontal-overflow-' + w, over.length === 0, over.join(' ') || 'no overflow'); await p.context().close(); }
if (!LIVE) {
  const wk = await webkit.launch(); const ctx = await wk.newContext(devices['iPhone 13']); const ip = await ctx.newPage(); ip.on('pageerror', (e) => errors.set('iphone ' + e.message, 1));
  await ip.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await ip.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await ip.fill('.siyl-inv input', codes['T001']); await ip.click('.siyl-inv .igo'); await ip.waitForTimeout(3000);
  await ip.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ip.waitForTimeout(2000); await ip.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await ip.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ip.waitForTimeout(2000);
  const tap = await ip.evaluate(() => [...document.querySelectorAll('[data-package-preview], [data-skip], .p-act')].slice(0, 12).map((e) => e.getBoundingClientRect().height).filter((h) => h > 0));
  await ip.click('[data-package-preview="complete"]'); await ip.waitForTimeout(1800);
  const drawer = await ip.evaluate(() => ({ rows: document.querySelectorAll('.fxl .fxr').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, go: !!document.querySelector('#fxg') }));
  await ip.screenshot({ path: path.join(OUT, 'iphone-complete-trip-drawer.png') });
  note('iphone-safari-package-drawer', drawer.rows === 10 && drawer.ov <= 1 && drawer.go && tap.every((h) => h >= 40), JSON.stringify({ ...drawer, minTap: Math.min(...tap) }));
  await ip.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.skip', 'siyl.skip.by'].forEach((k) => localStorage.removeItem(k)); }); await wk.close();
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
