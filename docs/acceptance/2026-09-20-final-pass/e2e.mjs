/* THE FINAL BOOKING-UX PASS — E2E on the isolated stage worker (Owner, 20 Sep 2026). Synthetic guests only (T001 Ada · T002 Ben · T003 Cleo);
   codes read from the scratchpad, never printed.   node docs/acceptance/2026-09-20-final-pass/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the manual booking flow inside 02 / 06 (every excursion returns by itself) · browser history (Room A → B, one hold) ·
   the wedding (CONFIRM SEAT first) · Photography & Film copy · Review & Send · My Profile (Coffee & Cake, the photo action, the roll call) ·
   Save My Progress in the menu · WHO SITS WHERE (name · photo · seat · a move · initials · privacy) · the dress-code galleries at four
   widths · the Highlight dress codes · the global Journey unchanged · the train ticket's breathing room · console. */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 1200) }); console.log((ok ? "PASS " : "FAIL ") + id + " — " + String(d).slice(0, ok ? 220 : 1200)); };
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
/* a guest with nothing to choose: the Vientiane scope, every stage answered as not joining (the journey step complete), the wedding attended — the gate to 04 opens */
const readyForWedding = async (p, email) => { await contact(p, email); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ vientiane: true }); }); await p.waitForTimeout(800); await p.evaluate(async () => { for (const s of SIYL_JOURNEY.open()) await SIYL_JOURNEY.decline(s); }); await p.waitForTimeout(800); await wedding(p, 'yes', 'yes'); };
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

/* ---- the final pass' own helpers ---- */
const mineOf = async (p) => { const m = await mine(p); return { holds: Object.keys((m && m.mine) || {}).sort(), detail: (m && m.mine) || {} }; };
const bagOf = (p) => p.evaluate(() => ({ lines: SIYL_BAG.get().map((x) => x.id + ':' + (x.room || x.cls || '') + (x.unit ? ':' + x.unit : '')).sort(), n: SIYL_BAG.get().length, total: SIYL_BAG.total() }));
const shellStep = (p) => p.evaluate(() => ({ step: (document.querySelector('.prep-bar .prep-step, .prep-bar') || {}).innerText || '', url: location.pathname + location.search + location.hash, back: [...document.querySelectorAll('.backrow a, .x-back a')].map((a) => a.textContent.trim() + ' → ' + a.getAttribute('href')) }));
const landed = (p) => p.evaluate(() => ({ url: location.pathname + location.search + location.hash, note: (document.querySelector('.p-wizard-note') || {}).innerText || '', landed: !!document.querySelector('.p-stage.p-wizard-landed'), step: /02 \/ 06/.test((document.querySelector('.prep-bar') || {}).innerText || ''), open: SIYL_JOURNEY.open().map((s) => s.key) }));
const waitLanded = async (p) => { for (let i = 0; i < 40; i++) { if (/your-journey/.test(p.url()) && await p.evaluate(() => !!document.querySelector('.p-wizard-note'))) break; await p.waitForTimeout(250); } await p.waitForTimeout(600); return landed(p); };
const tripCardLink = async (p, stage, rx) => { const href = await p.evaluate(([stage, rx]) => { const c = document.getElementById('s-' + stage); if (!c) return null; const a = [...c.querySelectorAll('a')].find((x) => new RegExp(rx, 'i').test(x.textContent)); return a ? a.getAttribute('href') : null; }, [stage, rx]); if (!href) return null; await p.click('#s-' + stage + ' a:has-text("' + rx.split('|')[0] + '")').catch(async () => { await p.evaluate(([stage, rx]) => { const c = document.getElementById('s-' + stage); const a = [...c.querySelectorAll('a')].find((x) => new RegExp(rx, 'i').test(x.textContent)); a.click(); }, [stage, rx]); }); await p.waitForTimeout(2500); return href; };
const png = () => { /* a 2×2 PNG, bytes as an array — no canvas needed */ return [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,2,0,0,0,2,8,2,0,0,0,253,212,154,115,0,0,0,22,73,68,65,84,120,156,99,248,207,192,240,31,8,254,255,103,96,0,0,31,15,5,254,203,152,238,140,0,0,0,0,73,69,78,68,174,66,96,130]; };
const uploadPhoto = (p) => p.evaluate(async (bytes) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'image/png' }, body: new Uint8Array(bytes) }); return r.status; }, png());

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003']) await resetGuest(id);
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-final' }, 'POST');

  /* ===== 1 · THE MANUAL BOOKING FLOW INSIDE 02 / 06 (T003, Join All): every excursion returns by itself, the context and the Bag survive, one hold per stage ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    const st0 = await p.evaluate(() => ({ open: SIYL_JOURNEY.open().length, packs: document.querySelectorAll('.p-pack').length, step: /02 \/ 06/.test((document.querySelector('.prep-bar') || {}).innerText || '') }));
    note('flow-start-my-trip', st0.open === 10 && st0.packs === 2 && st0.step, JSON.stringify(st0));
    /* Bangkok stay → View details (the room page) as a sub-view of 02 / 06 → add → back by itself */
    /* the rail's neighbour comes into position on the first tap (the carousel's rule); the active card's link opens on the second (a phone: taps) */
    const dbg = [];
    for (let i = 0; i < 3 && !/room/.test(p.url()); i++) { await p.tap('#s-bkk-stay [data-slug="u-sathorn-superior-garden"] a[href*="room.html"]', { force: true }).catch((e) => dbg.push('tap error ' + e.message.slice(0, 60))); await p.waitForTimeout(1200); dbg.push(p.url()); }
    await p.waitForTimeout(2000);
    const sv1 = await shellStep(p);
    note('flow-bangkok-subview', /room/.test(sv1.url) && /ctx=trip/.test(sv1.url) && /stage=bkk-stay/.test(sv1.url) && /02 \/ 06/.test(sv1.step) && /My Trip/i.test(sv1.step) && sv1.back.some((x) => /Return to My Trip → your-journey\.html#s-bkk-stay/.test(x)), JSON.stringify({ url: sv1.url, step: sv1.step.replace(/\s+/g, ' ').slice(0, 60), back: sv1.back, dbg }));
    await p.click('.cta[data-avwin="bkk-stay"]'); const l1 = await waitLanded(p); const b1 = await bagOf(p); const m1 = await mineOf(p);
    note('flow-bangkok-returns-to-02', /your-journey/.test(l1.url) && /done=bkk-stay/.test(l1.url) && l1.step && l1.landed && /Selected/i.test(l1.note) && /Next: /i.test(l1.note) && b1.lines.join() === 'bkk-stay:u-sathorn-superior-garden:A' && m1.holds.join() === 'bkk-stay' && !l1.open.includes('bkk-stay'), JSON.stringify({ url: l1.url, note: l1.note, bag: b1.lines, holds: m1.holds }));
    /* the night train, on My Trip itself */
    await p.click('[data-choose-flat="train"]'); await p.waitForTimeout(1200); const b2 = await bagOf(p);
    note('flow-train-stays-in-02', b2.lines.includes('train:') && /your-journey/.test(p.url()), JSON.stringify(b2.lines));
    /* Vientiane: the room page as a sub-view (View details → the room), the Heritage Executive held for the wedding stay; then the pre-wedding stay */
    await p.goto(O + '/room.html?stay=souphattra&room=heritage-executive&ctx=trip&stage=wedstay', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const sv3 = await shellStep(p);
    await p.click('.cta[data-avwin="wedstay"]'); const l3 = await waitLanded(p); const m3 = await mineOf(p);
    note('flow-vientiane-room-subview-returns', /02 \/ 06/.test(sv3.step) && sv3.back.some((b) => /Return to My Trip → your-journey\.html#s-wedstay/.test(b)) && /done=wedstay/.test(l3.url) && l3.landed && m3.holds.join() === 'bkk-stay,wedstay' && m3.detail.wedstay.key === 'wedstay/heritage-executive', JSON.stringify({ back: sv3.back, url: l3.url, holds: m3.holds }));
    await p.goto(O + '/journeys.html?ctx=trip&stage=prewed#j-prewed', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.click('[data-stay-add="prewed"]'); await p.waitForTimeout(800); const picking = await p.evaluate(() => document.querySelectorAll('#j-prewed [data-pick]').length);
    await p.click('#j-prewed [data-pick][data-room="heritage-executive"]'); const l4 = await waitLanded(p); const m4 = await mineOf(p);
    note('flow-prewed-pick-returns', /done=prewed/.test(l4.url) && m4.holds.join() === 'bkk-stay,prewed,wedstay', JSON.stringify({ url: l4.url, holds: m4.holds, picking }));
    /* the flight: the fare on My Trip */
    await p.click('#s-mu9646 [data-cls="business"]'); await p.waitForTimeout(1200); const b5 = await bagOf(p);
    note('flow-flight-stays-in-02', b5.lines.includes('mu9646:business') && /your-journey/.test(p.url()), JSON.stringify(b5.lines));
    /* Kunming · the train · Lijiang · the flight home · the Kempinski */
    for (const [stay, room, stage] of [['kunming', 'italian', 'kmg'], ['lijiang', 'viewing-270', 'ljg'], ['kempinski', 'deluxe-balcony-king', 'kempinski']]) {
      await p.goto(O + '/room.html?stay=' + stay + '&room=' + room + '&ctx=trip&stage=' + stage, { waitUntil: 'load' }); await p.waitForTimeout(2500);
      await p.click('.cta[data-avwin="' + stage + '"]'); const l = await waitLanded(p);
      note('flow-' + stage + '-room-returns', new RegExp('done=' + stage).test(l.url) && l.landed && l.step, JSON.stringify({ url: l.url, note: l.note }));
      if (stage === 'kmg') { await p.click('[data-choose-flat="c86"]'); await p.waitForTimeout(1000); }
      if (stage === 'ljg') { await p.click('[data-choose-flat="return"]'); await p.waitForTimeout(1000); }
    }
    const done = await p.evaluate(() => ({ open: SIYL_JOURNEY.open().map((s) => s.key), counts: SIYL_JOURNEY.counts(), cont: (document.querySelector('.prep-foot [data-continue]') || {}).innerText || '' }));
    const bf = await bagOf(p); const mf = await mineOf(p);
    await shot(p, '390-my-trip-manual-complete');
    note('flow-all-ten-resolved-continue-to-wedding', done.open.length === 0 && done.counts.confirmed === 10 && bf.n === 10 && mf.holds.join() === 'bkk-stay,kempinski,kmg,ljg,prewed,wedstay' && /Continue to The Wedding/i.test(done.cont), JSON.stringify({ open: done.open, n: bf.n, total: bf.total, holds: mf.holds, cont: done.cont }));
    /* ===== 2 · BROWSER HISTORY: Room A → back → change to Room B → back / forward — one hold, one line, never Room A again ===== */
    await p.goto(O + '/room.html?stay=souphattra&room=heritage&ctx=trip&stage=wedstay', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.click('[data-join="wedstay|heritage|A"]'); await waitLanded(p); const mA = await mineOf(p); const bA = await bagOf(p);
    await p.goBack({ waitUntil: 'load' }); await p.waitForTimeout(2500);
    const backA = await p.evaluate(() => ({ url: location.pathname + location.search, cur: (document.querySelector('[data-avwin="wedstay"] + [data-swap]') || {}).innerText || '', bag: SIYL_BAG.get().filter((x) => x.id === 'wedstay').map((x) => x.room + ':' + x.unit) }));
    await p.click('[data-join="wedstay|heritage|B"]'); await waitLanded(p); const mB = await mineOf(p); const bB = await bagOf(p);
    await p.goBack({ waitUntil: 'load' }); await p.waitForTimeout(2500);
    const backB = await p.evaluate(() => ({ cur: (document.querySelector('[data-avwin="wedstay"] + [data-swap]') || {}).innerText || '', bag: SIYL_BAG.get().filter((x) => x.id === 'wedstay').map((x) => x.room + ':' + x.unit) }));
    const mBack = await mineOf(p);
    await p.goForward({ waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2500);
    const fwd = await p.evaluate(() => ({ url: location.pathname + location.search, step: /02 \/ 06/.test((document.querySelector('.prep-bar') || {}).innerText || ''), bag: SIYL_BAG.get().filter((x) => x.id === 'wedstay').map((x) => x.room + ':' + x.unit) }));
    note('history-room-a-then-b-one-hold', mA.detail.wedstay.label === 'A' && bA.lines.includes('wedstay:heritage:A') && /room/.test(backA.url) && backA.bag.join() === 'heritage:A' && mB.detail.wedstay.label === 'B' && bB.lines.filter((l) => /^wedstay:/.test(l)).join() === 'wedstay:heritage:B' && bB.n === 10 && backB.bag.join() === 'heritage:B' && /Room B/.test(backB.cur) && mBack.detail.wedstay.label === 'B' && mBack.holds.length === 6 && fwd.bag.join() === 'heritage:B' && fwd.step, JSON.stringify({ A: mA.detail.wedstay, backA, B: mB.detail.wedstay, backB, mBack: mBack.detail.wedstay, fwd }));
    /* ===== 3 · CONTINUE TO THE WEDDING → attendance → the dinner seat (CONFIRM SEAT first) → About You → Review & Send → My Profile ===== */
    await trip(p); await p.click('.prep-foot [data-continue]'); await p.waitForTimeout(2500);
    note('flow-continue-to-wedding', /wedding/.test(p.url()) && !/preparation/.test(p.url()), p.url());
    await wedding(p, 'yes', 'yes'); await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200);
    const seat = await p.evaluate(() => { const g = document.querySelector('[data-seatmap="dinner"] g[data-seat]'); return g ? { id: g.getAttribute('data-seat'), label: g.getAttribute('data-label') } : null; });
    await p.click('[data-seatmap="dinner"] g[data-seat="' + seat.id + '"]'); await p.waitForTimeout(900);
    const pend = await p.evaluate(() => ({ bar: !!document.querySelector('.p-seatbar.on [data-seat-confirm]'), contOpacity: getComputedStyle(document.querySelector('.prep-foot [data-continue]')).opacity, contPE: getComputedStyle(document.querySelector('.prep-foot [data-continue]')).pointerEvents, confirmText: (document.querySelector('.p-seatbar.on [data-seat-confirm]') || {}).innerText || '' }));
    await shot(p, '390-seat-pending-confirm-primary');
    await p.click('.p-seatbar.on [data-seat-confirm]'); await p.waitForTimeout(2500);
    const conf = await p.evaluate(() => ({ card: (document.querySelector('[data-seatmap="dinner"][data-state="confirmed"]') || {}).innerText || '', contOpacity: getComputedStyle(document.querySelector('.prep-foot [data-continue]')).opacity, cont: !!document.querySelector('[data-seat-continue="dinner"]') }));
    note('seat-confirm-is-the-primary-action', pend.bar && /Confirm seat/i.test(pend.confirmText) && Number(pend.contOpacity) < 0.5 && pend.contPE === 'none' && /Seat held/i.test(conf.card) && conf.cont && Number(conf.contOpacity) === 1, JSON.stringify({ seat, pend, confirmed: conf.card.replace(/\s+/g, ' ').slice(0, 60), contOpacity: conf.contOpacity }));
    const cer = await p.evaluate(() => { const g = document.querySelector('[data-seatmap="ceremony"] g[data-seat]'); return g ? g.getAttribute('data-seat') : null; });
    if (cer) { await p.click('[data-seatmap="ceremony"] g[data-seat="' + cer + '"]'); await p.waitForTimeout(700); await p.click('.p-seatbar.on [data-seat-confirm]'); await p.waitForTimeout(2000); }
    await about(p, 'Pandan');
    const photoCopy = await p.evaluate(() => ({ text: (document.querySelector('#photo') || {}).innerText || '' }));
    note('photography-and-film-copy', /Photography and filming take place during the wedding day, and selected photographs and films may be published on our wedding website and social media\./.test(photoCopy.text) && /I understand and acknowledge this\./.test(photoCopy.text), photoCopy.text.replace(/\s+/g, ' ').slice(0, 200));
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const rev = await p.evaluate(() => ({ url: location.pathname, send: !!document.querySelector('#send:not([disabled])'), total: SIYL_BAG.total(), n: SIYL_BAG.get().length }));
    note('flow-review-sendable', /review/.test(rev.url) && rev.send && rev.n === 10 && rev.total > 0, JSON.stringify(rev));
    await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const prof = await p.evaluate(() => ({ coffee: (document.querySelector('[data-profile-item="wedding:coffee"]') || {}).innerText || '', photoCta: (document.querySelector('.pf-photo-cta') || {}).innerText || '', avatarBtn: (document.querySelector('button.pf-avatar[data-photo-add]') || {}).tagName || '', rail: !!document.querySelector('[data-seatrail="dinner"]'), stays: document.querySelectorAll('#stays .pf-card').length, travel: document.querySelectorAll('#travel .pf-card').length }));
    await shot(p, '390-profile-final');
    note('profile-coffee-cake-photo-cta-rail', /Coffee & Cake/i.test(prof.coffee) && /Complimentary/i.test(prof.coffee) && /from 12:00/i.test(prof.coffee) && /Add profile photo/i.test(prof.photoCta) && prof.avatarBtn === 'BUTTON' && prof.rail && prof.stays === 6 && prof.travel === 4, JSON.stringify(prof));
    /* the Save My Progress control in the account block of the menu */
    await p.click('#menu-open, .hb').catch(() => {}); await p.waitForTimeout(600);
    const save = await p.evaluate(() => ({ btn: !!document.querySelector('.a-menu [data-access-save]'), text: (document.querySelector('.a-menu [data-access-save]') || {}).innerText || '' }));
    if (save.btn) { await p.click('.a-menu [data-access-save]'); await p.waitForTimeout(2000); }
    const saved = await p.evaluate(() => (document.querySelector('.a-menu [data-access-saved]') || {}).innerText || '');
    note('save-my-progress-in-the-menu', save.btn && /Save my progress/i.test(save.text) && /Saved · \d\d:\d\d/.test(saved), JSON.stringify({ save, saved }));
    await p.context().close();
  }
  /* ===== 4 · WHO SITS WHERE (T001 = A with a photo · T003 = B): B sees A's name, seat and portrait; A moves; B reloads; signed out nothing ===== */
  {
    await resetGuest('T001');
    const a = await fresh(390); await signIn(a, 'T001'); await readyForWedding(a, 'ada.test@example.org');
    const up = await uploadPhoto(a); const mine1 = await api(a, '/api/profile/photo');
    await a.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await a.waitForTimeout(2500);
    await a.evaluate(() => { const c = document.querySelector('[data-ack]'); if (c && !c.checked) c.click(); }); await a.waitForTimeout(1000);
    const seats = await a.evaluate(() => [...document.querySelectorAll('[data-seatmap="dinner"] g[data-seat]')].slice(0, 2).map((g) => ({ id: g.getAttribute('data-seat'), label: g.getAttribute('data-label') })));
    await a.click('[data-seatmap="dinner"] g[data-seat="' + seats[0].id + '"]'); await a.waitForTimeout(700); await a.click('.p-seatbar.on [data-seat-confirm]'); await a.waitForTimeout(2500);
    const b = await fresh(390); await signIn(b, 'T003'); await b.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await b.waitForTimeout(3500);
    const seen = await b.evaluate((label) => { const li = [...document.querySelectorAll('[data-seatrail="dinner"] li')].find((x) => x.querySelector('.s').textContent.trim() === label); return li ? { name: li.querySelector('.n').textContent.trim(), seat: li.querySelector('.s').textContent.trim(), photo: !!li.querySelector('.p-seatava img'), initials: (li.querySelector('.p-seatava i') || {}).innerText || '', of: li.getAttribute('data-seat-of') } : null; }, seats[0].label);
    const map = await b.evaluate((id) => { const g = document.querySelector('[data-seatmap="dinner"] g[data-label]'); const s = [...document.querySelectorAll('[data-seatmap="dinner"] g')].find((x) => x.getAttribute('aria-label') && x.getAttribute('aria-label').includes(id)); return s ? s.getAttribute('aria-label') : ''; }, seats[0].label);
    await b.screenshot({ path: path.join(OUT, '390-who-sits-where.png') });
    note('who-sits-where-name-photo-seat', up === 200 && mine1.status === 200 && seen && /Ada/.test(seen.name) && seen.seat === seats[0].label && seen.photo && /taken/i.test(map) && /Ada/.test(map), JSON.stringify({ up, seen, map }));
    /* A moves to the next chair; B reloads: the old chair free, the new one Ada's, the rail follows */
    await a.reload({ waitUntil: 'load' }); await a.waitForTimeout(2500); /* the confirmation view (Continue · the ticket) becomes the booked card, with CHANGE SEAT */
    await a.evaluate(() => { const b = document.querySelector('[data-seat-change="dinner"]'); if (b) b.click(); }); await a.waitForTimeout(900);
    const next = await a.evaluate((cur) => { const g = [...document.querySelectorAll('[data-seatmap="dinner"] g[data-seat]')].find((x) => /available/i.test(x.getAttribute('aria-label') || '') && x.getAttribute('data-label') !== cur); return g ? { id: g.getAttribute('data-seat'), label: g.getAttribute('data-label') } : null; }, seats[0].label);
    if (!next) { const dbgA = await a.evaluate(() => ({ url: location.pathname + location.search, state: (document.querySelector('[data-seatmap="dinner"]') || {}).getAttribute('data-state'), btns: [...document.querySelectorAll('.p-seatcard-actions button')].map((b) => b.textContent.trim()), card: ((document.querySelector('[data-seatmap="dinner"]') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 200) })); note('who-sits-where-move-debug', false, JSON.stringify(dbgA)); }
    seats[1] = next || seats[1];
    await a.click('[data-seatmap="dinner"] g[data-seat="' + seats[1].id + '"]', { force: true }); await a.waitForTimeout(700); await a.click('.p-seatbar.on [data-seat-confirm]'); await a.waitForTimeout(2500);
    const moved = await api(a, '/api/seating/mine', { method: 'POST', body: '{}' }).catch(() => null);
    await b.reload({ waitUntil: 'load' }); await b.waitForTimeout(3500);
    const seen2 = await b.evaluate(([l0, l1]) => { const rows = [...document.querySelectorAll('[data-seatrail="dinner"] li')].map((x) => x.querySelector('.n').textContent.trim() + '@' + x.querySelector('.s').textContent.trim()); const free0 = [...document.querySelectorAll('[data-seatmap="dinner"] g')].find((x) => x.getAttribute('data-label') === l0); return { rows, old: free0 ? free0.getAttribute('aria-label') : '', hasNew: rows.some((r) => r === 'Ada@' + l1), hasOld: rows.some((r) => r.endsWith('@' + l0)) }; }, [seats[0].label, seats[1].label]);
    note('who-sits-where-follows-a-move', seen2.hasNew && !seen2.hasOld && /available/i.test(seen2.old), JSON.stringify(seen2));
    /* the partner without a photo shows initials; signed out, the seating view names nobody */
    const c = await fresh(390); await signIn(c, 'T002'); await readyForWedding(c, 'ben.test@example.org'); await c.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await c.waitForTimeout(3000);
    const ini = await c.evaluate((l1) => { const li = [...document.querySelectorAll('[data-seatrail="dinner"] li')].find((x) => x.querySelector('.s').textContent.trim() === l1); return li ? { photo: !!li.querySelector('.p-seatava img'), name: li.querySelector('.n').textContent.trim() } : null; }, seats[1].label);
    const pub = await fetch(O + '/api/seating', { headers: { 'content-type': 'application/json' } }).then((r) => r.json()).catch(() => null);
    const pubText = JSON.stringify(pub || {});
    const anon = await fetch(O + '/api/profile/photo?of=T001', { headers: { 'content-type': 'application/json' } });
    note('who-sits-where-privacy', ini && ini.photo && /Ada/.test(ini.name) && pub && pub.named === false && !/"name"|"holder"|Ada/.test(pubText) && anon.status === 401, JSON.stringify({ ini, named: pub && pub.named, anon: anon.status, leaks: /"name"|"holder"|Ada/.test(pubText) }));
    await a.context().close(); await b.context().close(); await c.context().close();
    for (const id of ['T001', 'T002', 'T003']) await resetGuest(id);
    for (const id of ['T001']) { const q = await fresh(); await signIn(q, id); await api(q, '/api/profile/photo', { method: 'DELETE' }); await q.context().close(); }
  }
  /* ===== 5 · THE DRESS-CODE GALLERIES at four widths: every reference reachable, arrows, count, no overflow; the Highlight dress codes ===== */
  for (const w of [320, 390, 834, 1440]) {
    const p = await fresh(w);
    for (const f of ['dress.html', 'wedding-preparation.html']) {
      if (f === 'wedding-preparation.html') { await signIn(p, 'T003'); await readyForWedding(p, 'cleo.test@example.org'); }
      await p.goto(O + '/' + f + '#dress-code', { waitUntil: 'load' }); await p.waitForTimeout(2000);
      const g = await p.evaluate(() => [...document.querySelectorAll('.refgal')].map((c) => ({ slides: c.querySelectorAll('.aslide').length, imgs: c.querySelectorAll('.aslide img').length, next: !!c.querySelector('[data-a="next"]'), count: (c.querySelector('.refgal-count') || {}).innerText || '' })));
      let last = null;
      if (g.length) { for (let i = 0; i < 8; i++) { await p.click('.refgal:first-of-type [data-a="next"]').catch(() => {}); await p.waitForTimeout(350); } last = await p.evaluate(() => { const c = document.querySelector('.refgal'); const on = c.querySelector('.aslide.on'); const all = [...c.querySelectorAll('.aslide')]; const r = on.getBoundingClientRect(); const rl = all[all.length - 1].getBoundingClientRect(); return { idx: all.indexOf(on), n: all.length, count: c.querySelector('.refgal-count').innerText, visible: r.right <= innerWidth + 1 && r.left >= -1, lastVisible: rl.right <= innerWidth + 1 && rl.left >= -1 && rl.width > 40, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }); }
      if (w === 390 || w === 1440) await shot(p, w + '-' + f.replace('.html', '') + '-galleries');
      note('dress-galleries-' + w + '-' + f.replace('.html', ''), g.length === 3 && g.every((x) => x.slides >= 5 && x.imgs === x.slides && x.next) && last && last.visible && last.lastVisible && /\d \/ 6/.test(last.count) && last.ov <= 1, JSON.stringify({ g: g.map((x) => x.slides + '/' + x.imgs), last }));
    }
    await p.context().close();
  }
  {
    const p = await fresh(390);
    const dc = {}; for (const id of ['bkk-baanphraya', 'bkk-cannubi', 'bkk-suhring']) { await p.goto(O + '/experience.html?id=' + id, { waitUntil: 'load' }); await p.waitForTimeout(1500); dc[id] = await p.evaluate(() => ({ block: (document.querySelector('[data-dress]') || {}).innerText || '' })); }
    note('highlight-dress-codes', /Elegant attire/i.test(dc['bkk-baanphraya'].block) && /closed shoes/i.test(dc['bkk-baanphraya'].block) && /Smart casual/i.test(dc['bkk-cannubi'].block) && /sandals/i.test(dc['bkk-cannubi'].block) && dc['bkk-suhring'].block === '', JSON.stringify({ bp: dc['bkk-baanphraya'].block.slice(0, 60), ca: dc['bkk-cannubi'].block.slice(0, 60), su: dc['bkk-suhring'].block.length }));
    await p.context().close();
  }
  /* ===== 6 · THE GLOBAL JOURNEY STILL WORKS AS THE JOURNEY: opened from the menu, no shell, "Back to The Journey" ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003');
    await p.goto(O + '/room.html?stay=souphattra&room=heritage-executive', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const g = await p.evaluate(() => ({ bar: !!document.querySelector('.prep-bar'), back: (document.querySelector('.backrow a') || {}).innerText || '', href: (document.querySelector('.backrow a') || {}).getAttribute ? document.querySelector('.backrow a').getAttribute('href') : '' }));
    await p.click('.cta[data-avwin="wedstay"]'); await p.waitForTimeout(2500);
    const stay = await p.evaluate(() => ({ url: location.pathname, cta: (document.querySelector('.cta[data-avwin="wedstay"]') || {}).innerText || '' }));
    note('global-journey-unchanged', !g.bar && /Back to The Journey/i.test(g.back) && /journeys\.html#j-/.test(g.href) && /room/.test(stay.url) && /Remove from My Bag/i.test(stay.cta), JSON.stringify({ g, stay }));
    await p.context().close(); await resetGuest('T003');
  }
  /* ===== 7 · THE TRAIN TICKET BREATHES: the ticket panel below the photograph and the summary at four widths ===== */
  for (const w of [320, 390, 834, 1440]) {
    const p = await fresh(w); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    const m = await p.evaluate(() => { const sum = document.querySelector('#s-train .p-sum'); const img = sum.querySelector('.p-sum-img').getBoundingClientRect(), tk = sum.querySelector('.p-sum-ticket .p-ticket, .p-sum-ticket > *').getBoundingClientRect(), body = sum.querySelector('.p-sum-body').getBoundingClientRect(); return { gapImg: Math.round(tk.top - img.bottom), gapBody: Math.round(tk.top - body.bottom), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    if (w === 1440 || w === 390) { const el = await p.$('#s-train .p-sum'); if (el) await el.screenshot({ path: path.join(OUT, w + '-train-card.png') }); }
    note('train-ticket-spacing-' + w, m.gapImg >= 16 && m.gapBody >= 0 && m.ov <= 1, JSON.stringify(m));
    await p.context().close();
  }
  await resetGuest('T003'); await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-final' }, 'POST');
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
