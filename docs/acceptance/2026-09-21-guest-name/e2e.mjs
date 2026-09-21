/* THE GUEST'S OWN NAME — E2E on the isolated stage worker (Owner, 21 Sep 2026). Synthetic guests only (T001 Ada · T002 Ben, one party).
   Derived from the final-pass suite's helpers.
   THE FINAL BOOKING-UX PASS — E2E on the isolated stage worker (Owner, 20 Sep 2026). Synthetic guests only (T001 Ada · T002 Ben · T003 Cleo);
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
const readyForWedding = async (p, email) => { await contact(p, email); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ vientiane: true }); }); await p.waitForTimeout(800); await p.evaluate(async () => { for (const s of SIYL_JOURNEY.open()) { if (s.key === 'c86') SIYL_PRICE.items('c86').forEach((it) => SIYL_BAG.put(it)); else await SIYL_JOURNEY.decline(s); } });   /* the mandatory train is chosen, never declined (21 Sep 2026) */ await p.waitForTimeout(800); await wedding(p, 'yes', 'yes'); };
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


{
  for (const id of ['T001', 'T002']) await resetGuest(id);
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-name' }, 'POST');
  /* Ada: a hold, a seat, a draft — the state that must stand */
  const a = await fresh(390); await signIn(a, 'T001'); await readyForWedding(a, 'ada.test@example.org');
  await a.goto(O + '/room.html?stay=souphattra&room=heritage-executive', { waitUntil: 'load' }); await a.waitForTimeout(2500); await a.click('.cta[data-avwin="wedstay"]'); await a.waitForTimeout(3000);
  await a.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await a.waitForTimeout(2500); await a.evaluate(() => { const c = document.querySelector('[data-ack]'); if (c && !c.checked) c.click(); }); await a.waitForTimeout(1000);
  const seat = await a.evaluate(() => { const g = [...document.querySelectorAll('[data-seatmap="dinner"] g[data-seat]')].find((x) => /available/i.test(x.getAttribute('aria-label') || '')); return g ? { id: g.getAttribute('data-seat'), label: g.getAttribute('data-label') } : null; });
  await a.click('[data-seatmap="dinner"] g[data-seat="' + seat.id + '"]', { force: true }); await a.waitForTimeout(700); await a.click('.p-seatbar.on [data-seat-confirm]'); await a.waitForTimeout(2500);
  const cer = await a.evaluate(() => { const g = document.querySelector('[data-seatmap="ceremony"] g[data-seat]'); return g ? g.getAttribute('data-seat') : null; });
  if (cer) { await a.click('[data-seatmap="ceremony"] g[data-seat="' + cer + '"]', { force: true }); await a.waitForTimeout(700); await a.click('.p-seatbar.on [data-seat-confirm]'); await a.waitForTimeout(2000); }
  await about(a, 'Pandan'); await a.evaluate(() => SIYL_DRAFT.flush('e2e')); await a.waitForTimeout(2000);
  const auth0 = await a.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')));
  const before = { auth: { bearer: auth0.bearer, invitationId: auth0.invitationId, guestId: auth0.guestId, partyId: auth0.partyId, contactId: auth0.contactId, couple: auth0.couple, fullName: auth0.fullName, preferredName: auth0.preferredName }, bag: await bagOf(a), mine: await mineOf(a), seat: (await api(a, '/api/seating/mine', { method: 'POST', body: '{}' })).body.mine, temple: await a.evaluate(() => localStorage.getItem('siyl.temple')), contact: (await api(a, '/api/contact')).body.contact };
  /* 1 · My Profile: the two editable fields, prefilled from the invitation */
  await a.goto(O + '/profile.html', { waitUntil: 'load' }); await a.waitForTimeout(2500);
  const f0 = await a.evaluate(() => ({ first: (document.querySelector('#pf-firstName') || {}).value, last: (document.querySelector('#pf-lastName') || {}).value, editable: !!document.querySelector('#pf-firstName:not([readonly]):not([disabled])') && !!document.querySelector('#pf-lastName:not([readonly]):not([disabled])'), head: (document.querySelector('.pf-id-row, main') || {}).innerText.slice(0, 80) }));
  note('profile-name-fields-editable-prefilled', f0.editable && f0.first === before.auth.preferredName && f0.last && (before.auth.preferredName + ' ' + f0.last) === before.auth.fullName, JSON.stringify(f0));
  await shot(a, '390-profile-name-fields');
  /* 2 · the surname changed, saved (change) */
  await a.fill('#pf-lastName', 'Acker'); await a.dispatchEvent('#pf-lastName', 'change'); await a.waitForTimeout(2500);
  const f1 = await a.evaluate(() => ({ last: (document.querySelector('#pf-lastName') || {}).value, corrected: /Corrected by you/.test((document.querySelector('[data-profile-personal]') || {}).innerText || ''), full: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName'), first: SIYL_GUEST.nameOf(), ident: (document.querySelector('.pf-id-row, .pf-head') || {}).innerText || '' }));
  note('profile-surname-saved', f1.last === 'Acker' && f1.corrected && f1.full === before.auth.preferredName + ' Acker' && f1.first === before.auth.preferredName, JSON.stringify(f1));
  /* 3 · reload: it persists; the server copy carries it */
  await a.reload({ waitUntil: 'load' }); await a.waitForTimeout(2500);
  const f2 = await a.evaluate(() => ({ last: (document.querySelector('#pf-lastName') || {}).value, full: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName') }));
  const srv = (await api(a, '/api/contact')).body.contact;
  note('name-persists-after-reload-and-on-the-server', f2.last === 'Acker' && f2.full === before.auth.preferredName + ' Acker' && srv && srv.lastName === 'Acker' && srv.firstName === '' && srv.email === before.contact.email && srv.phone === before.contact.phone, JSON.stringify({ f2, srv: { ln: srv && srv.lastName, fn: srv && srv.firstName, email: !!(srv && srv.email) } }));
  /* 4 · the identity and every other state: unchanged */
  const auth1 = await a.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')));
  const after = { auth: { bearer: auth1.bearer, invitationId: auth1.invitationId, guestId: auth1.guestId, partyId: auth1.partyId, contactId: auth1.contactId, couple: auth1.couple, fullName: auth1.fullName, preferredName: auth1.preferredName }, bag: await bagOf(a), mine: await mineOf(a), seat: (await api(a, '/api/seating/mine', { method: 'POST', body: '{}' })).body.mine, temple: await a.evaluate(() => localStorage.getItem('siyl.temple')) };
  note('identity-and-state-unchanged', JSON.stringify(before.auth) === JSON.stringify(after.auth) && JSON.stringify(before.bag) === JSON.stringify(after.bag) && JSON.stringify(before.mine) === JSON.stringify(after.mine) && JSON.stringify(before.seat) === JSON.stringify(after.seat) && before.temple === after.temple && !!after.auth.bearer && after.auth.invitationId === 'INV-T001', JSON.stringify({ same: { auth: JSON.stringify(before.auth) === JSON.stringify(after.auth), bag: JSON.stringify(before.bag) === JSON.stringify(after.bag), holds: JSON.stringify(before.mine) === JSON.stringify(after.mine), seat: JSON.stringify(before.seat) === JSON.stringify(after.seat), temple: before.temple === after.temple }, bag: after.bag.lines, holds: after.mine.holds, seat: after.seat }));
  /* 5 · a fresh device of Ada's reads the corrected name (the server copy) */
  const a2 = await fresh(390); await signIn(a2, 'T001'); await a2.goto(O + '/profile.html', { waitUntil: 'load' }); await a2.waitForTimeout(3500);
  const dev2 = await a2.evaluate(() => ({ last: (document.querySelector('#pf-lastName') || {}).value, full: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName') }));
  note('fresh-device-reads-the-correction', dev2.last === 'Acker' && dev2.full === before.auth.preferredName + ' Acker', JSON.stringify(dev2)); await a2.context().close();
  /* 6 · the surfaces: the shell, the account block, My Trip, Review & Send, the seat card, the roll call, the seat ticket words */
  await a.goto(O + '/your-journey.html', { waitUntil: 'load' }); await a.waitForTimeout(2000);
  const trip = await a.evaluate(() => ({ who: (document.querySelector('.prep-who') || document.querySelector('.prep-bar') || {}).innerText || '' }));
  await a.click('#menu-open, .hb').catch(() => {}); await a.waitForTimeout(700); const acct = await a.evaluate(() => (document.querySelector('.a-macct-who') || {}).innerText || ''); await a.keyboard.press('Escape').catch(() => {});
  await a.goto(O + '/review.html', { waitUntil: 'load' }); await a.waitForTimeout(2500);
  const rev = await a.evaluate(() => { const t = document.body.innerText; return { url: location.pathname, name: /Ada Acker/.test(t), corrected: /corrected by you/i.test(t), old: /Ada Test/.test(t), need: (SIYL_GUEST.readiness().need || []).map((n) => n.key).slice(0, 4) }; });
  await a.goto(O + '/tickets.html', { waitUntil: 'load' }); await a.waitForTimeout(2500);
  const tix = await a.evaluate(() => { const t = document.body.innerText; return { name: /Ada Acker/.test(t), old: /Ada Test/.test(t) }; });
  await a.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await a.waitForTimeout(3000);
  const prep = await a.evaluate(() => ({ card: ((document.querySelector('[data-seatmap="dinner"]') || {}).innerText || '').replace(/\s+/g, ' '), rail: [...document.querySelectorAll('[data-seatrail="dinner"] li')].map((x) => x.querySelector('.n').textContent.trim() + '@' + x.querySelector('.s').textContent.trim()) }));
  note('surfaces-read-the-corrected-name', new RegExp(before.auth.preferredName, 'i').test(trip.who) && new RegExp(before.auth.preferredName, 'i').test(acct) && /review/.test(rev.url) && rev.name && rev.corrected && !rev.old && tix.name && !tix.old && /Seat held/i.test(prep.card) && prep.rail.join() === 'You@' + seat.label, JSON.stringify({ trip: trip.who.slice(0, 40), acct, rev, tix, card: prep.card.slice(0, 60), rail: prep.rail }));
  /* 7 · the partner (Ben, the same party) sees Ada by her first name on the roll call, his own record untouched; his own correction never reaches Ada */
  const b = await fresh(390); await signIn(b, 'T002'); await readyForWedding(b, 'ben.test@example.org'); await b.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await b.waitForTimeout(3000);
  const benSees = await b.evaluate((seatLabel) => { const li = [...document.querySelectorAll('[data-seatrail="dinner"] li')].find((x) => x.querySelector('.s').textContent.trim() === seatLabel); return { row: li ? li.querySelector('.n').textContent.trim() : null, own: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName'), ownFirst: SIYL_GUEST.nameOf(), ada: SIYL_GUEST.nameOf('T001') }; }, seat.label);
  await b.goto(O + '/profile.html', { waitUntil: 'load' }); await b.waitForTimeout(2500); await b.fill('#pf-lastName', 'Zimmer'); await b.dispatchEvent('#pf-lastName', 'change'); await b.waitForTimeout(2500);
  const benAfter = await b.evaluate(() => ({ own: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName'), ada: SIYL_GUEST.nameOf('T001') }));
  const adaSrv = (await api(a, '/api/contact')).body.contact; const benSrv = (await api(b, '/api/contact')).body.contact;
  note('couple-isolation', benSees.row === before.auth.preferredName && benSees.ada === before.auth.preferredName && !/Acker/.test(benSees.own) && /Zimmer$/.test(benAfter.own) && adaSrv.lastName === 'Acker' && benSrv.lastName === 'Zimmer' && benSrv.email === 'ben.test@example.org', JSON.stringify({ benSees, benAfter, ada: adaSrv.lastName, ben: benSrv.lastName }));
  /* 8 · the body can never move the identity */
  const forged = await api(a, '/api/contact', { method: 'PUT', body: JSON.stringify({ invitationId: 'INV-T001', firstName: 'Ada', lastName: 'Acker', contactId: 'CON999', couple: 'COUPL999', guestId: 'T009', seenReset: await a.evaluate(() => localStorage.getItem('siyl.draft.reset')) }) });
  const other = await api(a, '/api/contact', { method: 'PUT', body: JSON.stringify({ invitationId: 'INV-T002', lastName: 'X', seenReset: await a.evaluate(() => localStorage.getItem('siyl.draft.reset')) }) });
  note('identity-never-from-the-body', forged.status === 200 && forged.body.invitationId === 'INV-T001' && forged.body.contact.contactId === undefined && forged.body.contact.guestId === undefined && other.status === 403, JSON.stringify({ forged: forged.status, inv: forged.body.invitationId, other: other.status }));
  await a.context().close(); await b.context().close();
  for (const id of ['T001', 'T002']) await resetGuest(id);
  for (const id of ['T001', 'T002']) { const q = await fresh(); await signIn(q, id); const ep = await q.evaluate(() => localStorage.getItem('siyl.draft.reset')); await api(q, '/api/contact', { method: 'PUT', body: JSON.stringify({ invitationId: 'INV-' + id, firstName: '', lastName: '', seenReset: ep }) }); await q.context().close(); }
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-name' }, 'POST');
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
