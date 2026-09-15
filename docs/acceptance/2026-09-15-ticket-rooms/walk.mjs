/* OWNER CORRECTIONS (15 Sep 2026): TICKET / SEAT CONFIRMATION REDESIGN · ROOM INVENTORY + STEP 05.
   THE WALK, in a real browser against a Worker with the real engines:
     TICKETS — the seat ticket and the travel pass read as tickets on screen and on paper; nothing clipped at
       the top, on a phone or on a desktop; the code and the reference live on the ticket; the cart carries
       none; Review carries none; the seat ticket matches the seating ledger.
     ROOMS — no pre-reserved rooms: the Presidential is Room A with two places; a host takes one, the second
       host joins the same room, a third guest is refused; the six-bedroom Penthouse is Room A – F, twelve
       places; the room page shows the physical rooms; the category words are derived from them.
     STEP 05 — every visible question is required: Continue is blocked, View All Steps names the exact
       question, answering it completes the step at once, Step 06 stays locked until then.
   Identities from env (HOST=G049 by default here — a second host proves the "join the same room" case
   against the first host's real place; GUEST=G001; THIRD=G002). Codes from the private register, never
   printed. Every place this walk holds is released again (RESTORE=1 on production).
     HOST=G049 GUEST=G001 THIRD=G002 node docs/acceptance/2026-09-15-ticket-rooms/walk.mjs <origin> [outdir]
   */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8');
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], token: c[5], status: c[7] }; });
const tok = (g) => rows.find((r) => r.guestId === g && r.status === 'ACTIVE').token;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d: String(d || '') }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? ' — ' + String(d).slice(0, 220) : '')); };
const API = (ORIGIN.includes('github.io') ? 'https://seeyouinlaos-website.suthep-hrg.workers.dev' : ORIGIN) + '/api';
const HOST = process.env.HOST || 'G049', GUEST = process.env.GUEST || 'G001', THIRD = process.env.THIRD || 'G002';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|net::ERR|404/.test(m.text())) errs.push('console: ' + m.text()); });
const go = async (f) => { await p.goto('about:blank'); await p.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); };
const txt = async (sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const shot = async (n) => { if (OUT) await p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true }); };
const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const money = (n) => 'USD ' + Number(n).toLocaleString('en-US');
async function signIn(code) {
  await go('invitation.html?open=1');
  await p.waitForSelector('.siyl-inv input', { timeout: 8000 });
  await p.fill('.siyl-inv input', code); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 15000 });
  await p.waitForTimeout(600);
  return p.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')));
}
async function leave() {
  await go('review.html');
  await p.evaluate(() => { const b = document.querySelector('[data-leave="out"]'); if (b) b.click(); else window.SIYL_PREP.leave('out'); });
  await p.waitForFunction(() => !localStorage.getItem('siyl.auth') && /invitation/.test(location.pathname), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(400);
}
async function contact(email, phone) {
  await go('invitation.html#contact');
  await p.fill('#p-email', email); await p.locator('#p-email').dispatchEvent('change');
  await p.fill('#p-phone', phone); await p.locator('#p-phone').dispatchEvent('change'); await p.waitForTimeout(400);
}
async function declineOthers(keep) {
  await go('your-journey.html');
  await p.evaluate((keep) => { window.SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (!keep.includes(s.key) && window.SIYL_JOURNEY.state(s) === 'open') window.SIYL_JOURNEY.skip(s.key, true); }); }, keep);
  await p.waitForTimeout(400);
}
/* every ticket on the page: its frame fully inside the viewport width and, once scrolled to, with its top on screen */
async function ticketsFit() {
  return p.evaluate(async () => {
    const out = [];
    for (const t of document.querySelectorAll('.p-ticket')) {
      t.scrollIntoView({ block: 'start' }); await new Promise((r) => setTimeout(r, 120));
      const r = t.getBoundingClientRect(), head = t.querySelector('.p-ticket-head'), hr = head ? head.getBoundingClientRect() : r;
      /* every element inside the frame stays inside the frame (the tear's notches are drawn on the frame by design and are not elements) */
      let inner = 0, innerL = 0;
      for (const el of t.querySelectorAll('*')) { const er = el.getBoundingClientRect(); if (er.width === 0) continue; inner = Math.max(inner, Math.round(er.right - r.right)); innerL = Math.max(innerL, Math.round(r.left - er.left)); }
      out.push({ id: t.getAttribute('data-ticket'), left: r.left, right: r.right, top: r.top, headTop: hr.top, vw: document.documentElement.clientWidth, spill: inner, spillL: innerL });
    }
    return out;
  });
}
const fitsOk = (list) => list.length > 0 && list.every((t) => t.left >= 0 && t.right <= t.vw + 1 && t.top >= -1 && t.headTop >= -1 && t.spill <= 0 && t.spillL <= 0);
const fitWords = (list) => JSON.stringify(list.map((t) => [t.id, Math.round(t.left), Math.round(t.right), t.vw, Math.round(t.headTop), 'spill ' + t.spill + '/' + t.spillL]));
const unitsOf = async (win, slug) => p.evaluate(([w, s]) => (window.SIYL_UNITS.units(w, s) || []).map((u) => ({ label: u.label, free: u.free, full: u.full, names: u.occupants.map((o) => o.mine ? 'You' : o.name) })), [win, slug]);
const joinAs = async (session, key, label) => (await fetch(API + '/rooms/join', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': session.bearer }, body: JSON.stringify({ invitationId: session.invitationId, guestId: session.guestId, key, label, name: session.preferredName }) })).json();
const leaveAs = async (session, key) => (await fetch(API + '/rooms/leave', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': session.bearer }, body: JSON.stringify({ invitationId: session.invitationId, guestId: session.guestId, key }) })).json();
const readAs = async (session) => (await fetch(API + '/rooms', { headers: { 'x-siyl-auth': session.bearer } })).json();
const held = [];   /* what this walk holds on the engine, to be released */

/* ================================================================ THE HOST */
const H = await signIn(tok(HOST));
const HN = H.preferredName;
note('R0 one code = one guest', H.guestId === HOST && !!H.bearer && !!HN, HN);
await contact(HN.toLowerCase() + '.test@example.com', '+66 81 000 0009');

/* ---- ROOMS: the Presidential, Room A, two places, no reservation ---- */
const PRES = 'wedstay/souphattra-presidential', PENT = 'bkk-stay/penthouse';
const before = await readAs(H);
const presBefore = before.units[PRES][0];
note('R1 engine · the Presidential is ONE physical room → exactly Room A with two places, no reservation, open to this guest', before.units[PRES].length === 1 && presBefore.label === 'A' && presBefore.places === 2 && presBefore.reservedFor === null && presBefore.eligible === true, JSON.stringify({ taken: presBefore.taken, free: presBefore.free, occupants: presBefore.occupants.map((o) => o.name) }));
note('R1 engine · the six-bedroom Penthouse is exactly Room A – F, twelve places, never a Room G', before.units[PENT].length === 6 && before.units[PENT].map((u) => u.label).join('') === 'ABCDEF' && before.summary[PENT].places === 12 && !before.units[PENT].some((u) => u.label === 'G'), JSON.stringify(before.summary[PENT]));
note('R1 engine · the category summary is derived from its rooms (free = sum of unused places; rooms = rooms with a place left)', Object.keys(before.units).every((k) => before.summary[k].free === before.units[k].reduce((n, u) => n + u.free, 0) && before.summary[k].rooms === before.units[k].filter((u) => u.free > 0).length && before.summary[k].reservedFor === null), '');
/* the room page: the physical rooms as the primary picture */
await go('room.html?stay=souphattra&room=souphattra-presidential');
await p.waitForFunction(() => window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const roomPage = await p.evaluate(() => ({ units: [...document.querySelectorAll('[data-rooms-box="wedstay"] .p-unit')].map((u) => u.innerText.replace(/\s+/g, ' ')), av: (document.querySelector('[data-av="wedstay"]') || {}).textContent || '', text: document.body.innerText.replace(/\s+/g, ' ') }));
note('R2 room page · the Presidential shows ROOM A with its places (' + (presBefore.free === 2 ? '2 places available' : presBefore.free === 1 ? presBefore.occupants[0].name + ' · 1 place available' : 'Full') + '); the category words are the rooms\' own; no RESERVED, no "held for you"', roomPage.units.length === 1 && /Room A/.test(roomPage.units[0]) && (presBefore.free === 2 ? /2 places available/i.test(roomPage.units[0]) : presBefore.free === 1 ? /1 place available/i.test(roomPage.units[0]) : /Full/i.test(roomPage.units[0])) && !/Reserved|yours to choose|held for you/i.test(roomPage.text) && /(1 room · [12] places? available|Fully booked|Your place is held)/i.test(roomPage.av), roomPage.units[0] + ' · ' + roomPage.av);
await shot('R-room-presidential');
/* this host takes one place (or is already there — the Owner's live booking is never disturbed) */
let mineBefore = before.mine.wedstay || null;
if (!mineBefore || mineBefore.key !== PRES) { const j = await joinAs(H, PRES, 'A'); note('R3 host · takes a place in Room A', j.ok === true, JSON.stringify(j.error || j.joined)); held.push([H, PRES]); }
else note('R3 host · already holds a place in Room A (a live booking, left as it is)', true, '');
const afterHost = await readAs(H);
const presH = afterHost.units[PRES][0];
note('R3 engine · Room A: the host and ' + (presH.free === 1 ? '1 place available' : 'FULL'), presH.occupants.some((o) => o.mine) && presH.taken <= 2, presH.occupants.map((o) => o.name + (o.mine ? ' (you)' : '')).join(' · ') + ' · free ' + presH.free);
/* Your Journey shows the room chooser with the physical rooms */
await go('your-journey.html'); await p.waitForFunction(() => window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const jl = await p.evaluate(() => (document.querySelector('[data-unit-line]') || {}).textContent || document.body.innerText.replace(/\s+/g, ' ').slice(0, 0));
note('R3 Your Journey · the stay says Room A · You · ' + (presH.free === 1 ? '1 place available' : 'Full'), new RegExp('Room A · .*You').test(jl) && (presH.free === 1 ? /1 place available/.test(jl) : /Full/.test(jl)), jl);
await leave();

/* ================================================================ THE GUEST joins the same room */
const G1 = await signIn(tok(GUEST));
const GN = G1.preferredName;
await contact(GN.toLowerCase() + '.test@example.com', '+49 170 000 0001');
const seen = await readAs(G1);
const presG = seen.units[PRES][0];
note('R4 guest · sees the host\'s first name in Room A and ' + (presG.free === 1 ? '1 place available' : 'Full') + ' — no reservation in the way', presG.reservedFor === null && presG.eligible === true && presG.occupants.some((o) => o.name === HN) && presG.taken === presH.taken, presG.occupants.map((o) => o.name).join(' · '));
let guestJoined = false;
if (presG.free >= 1) {
  await go('journeys.html#j-wedstay'); await p.waitForFunction(() => window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
  const row = await p.evaluate(() => { const a = document.querySelector('#j-wedstay .var[data-room="souphattra-presidential"]'); return a ? a.innerText.replace(/\s+/g, ' ') : ''; });
  note('R4 journeys · the Presidential row reads from its rooms (1 room · 1 place available), never RESERVED', /1 room · 1 place available/i.test(row) && !/Reserved|yours to choose/i.test(row), row);
  const j = await joinAs(G1, PRES, 'A'); guestJoined = j.ok === true; if (guestJoined) held.push([G1, PRES]);
  note('R5 guest · joins the SAME Room A beside the host → Room A is FULL', guestJoined && j.units[PRES][0].full === true && j.units[PRES][0].occupants.map((o) => o.name).sort().join(',') === [HN, GN].sort().join(','), JSON.stringify(j.units[PRES][0].occupants.map((o) => o.name)));
} else note('R5 Room A is already full on this ledger (a live booking): the join step is the third-guest refusal below', true, presG.occupants.map((o) => o.name).join(' · '));
await leave();

/* ================================================================ A THIRD GUEST is refused */
const T3 = await signIn(tok(THIRD));
const full = await readAs(T3);
const presT = full.units[PRES][0];
const refuse = await joinAs(T3, PRES, 'A');
const again = await readAs(T3);
note('R6 third guest · Room A is FULL: refused with "full", Room A unchanged, nothing else moves', presT.full === true && refuse.ok === false && refuse.error === 'full' && JSON.stringify(again.units[PRES][0].occupants.map((o) => o.name)) === JSON.stringify(presT.occupants.map((o) => o.name)) && !again.mine.wedstay, refuse.error);
const ghost = await joinAs(T3, PRES, 'B');
note('R6 third guest · there is no Room B for one physical room', ghost.ok === false && ghost.error === 'unknown room', ghost.error);
await go('journeys.html#j-wedstay'); await p.waitForFunction(() => window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
const rowFull = await p.evaluate(() => { const a = document.querySelector('#j-wedstay .var[data-room="souphattra-presidential"]'); return { text: a ? a.innerText.replace(/\s+/g, ' ') : '', gone: a && a.classList.contains('gone') }; });
note('R6 journeys · the full Presidential reads Fully booked, from its rooms', /Fully booked/i.test(rowFull.text) && !/Reserved/i.test(rowFull.text), rowFull.text);
await shot('R-journeys-full');
/* the penthouse on the room page: six rooms, twelve places */
await go('room.html?stay=sathorn&room=penthouse'); await p.waitForFunction(() => window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const pent = await p.evaluate(() => ({ units: [...document.querySelectorAll('[data-rooms-box="bkk-stay"] .p-unit .p-unit-name')].map((u) => u.textContent), av: (document.querySelector('[data-av="bkk-stay"]') || {}).textContent || '' }));
note('R7 room page · the Penthouse lists Room A – F and nothing more; the words say 6 rooms · 12 places available (less what is booked)', pent.units.join('') === 'Room ARoom BRoom CRoom DRoom ERoom F' && /(\d) rooms? · (\d+) places? available/.test(pent.av) && +(pent.av.match(/(\d+) places?/) || [0, 99])[1] <= 12, pent.av);
await shot('R-room-penthouse');

/* ---- STEP 05: every visible question is required ---- */
await contact(T3.preferredName.toLowerCase() + '.test@example.com', '+49 170 000 0002');
await declineOthers([]);
await go('wedding.html');
for (const [k, v] of [['temple', 'no'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(250); }
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
await go('about-you.html'); await p.click('[data-allergy="no"]'); await p.waitForTimeout(250); await p.check('#photo-ack'); await p.waitForTimeout(300);
let t = await body();
const optionalLeft = (t.replace(/Optional · can be added later|Optional · not added|Optional · not answered|Optional\.|separate, optional choice/gi, '').match(/optional/gi) || []).length;
const qStates = await p.evaluate(() => [...document.querySelectorAll('[data-q-state]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
note('A1 About You · no OPTIONAL on the six questions; each says Required; the step is not complete with them unanswered', optionalLeft === 0 && qStates.length === 6 && qStates.every((q) => /Required/.test(q)) && (await p.evaluate(() => window.SIYL_GUEST.done('about'))) === false, qStates.join(' | ') + ' · optional words left: ' + optionalLeft);
const missing = await p.evaluate(() => window.SIYL_GUEST.missingFor('about').map((m) => m.label + '→' + m.href));
note('A1 readiness · names every unanswered question exactly, with the way to its box', missing.length === 6 && missing[0] === '02 · Coffee or tea→about-you.html#q-coffeetea' && missing[5] === '07 · Favourite music→about-you.html#q-music', missing.join(' | '));
/* Continue is blocked and focuses the first unanswered question */
await p.evaluate(() => document.querySelector('#foot .p-act, #foot [data-continue]') && document.querySelector('#foot .p-act, #foot [data-continue]').click()); await p.waitForTimeout(700);
const focusId = await p.evaluate(() => (document.activeElement && (document.activeElement.getAttribute('data-q') || document.activeElement.id)) || '');
note('A2 Continue · blocked (still on About You) and the first unanswered question has the focus', /about-you/.test(p.url()) && focusId === 'coffeetea', p.url().replace(ORIGIN, '') + ' · focus ' + focusId);
/* View All Steps names the question */
const idx = await p.evaluate(() => { document.querySelector('.prep-all').click(); return new Promise((r) => setTimeout(() => r(document.getElementById('prep-steps').innerText.replace(/\s+/g, ' ')), 500)); });
note('A3 View All Steps · 05 is the current step with "6 items to complete", the exact question "02 · Coffee or tea" named; 06 is locked', /(Current|Needs attention)/i.test(idx) && /6 items to complete/.test(idx) && /02 · Coffee or tea/.test(idx) && /Locked/i.test(idx), idx.slice(idx.indexOf('05'), idx.indexOf('05') + 200));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await shot('A-about-required');
/* a blank is not an answer; a real one completes at once */
await p.fill('textarea[data-q="coffeetea"]', '   '); await p.locator('textarea[data-q="coffeetea"]').dispatchEvent('change'); await p.waitForTimeout(200);
note('A4 a blank answer never counts', (await p.evaluate(() => window.SIYL_GUEST.missingFor('about')[0].key)) === 'profile:coffeetea', '');
for (const q of ['coffeetea', 'treat', 'drink', 'avoid', 'film', 'music']) { await p.fill('textarea[data-q="' + q + '"]', 'Test answer ' + q); await p.locator('textarea[data-q="' + q + '"]').dispatchEvent('change'); await p.waitForTimeout(120); }
const st = await p.evaluate(() => ({ done: window.SIYL_GUEST.done('about'), fav: (document.getElementById('fav-state') || {}).textContent, may: window.SIYL_GUEST.mayEnter('review'), steps: window.SIYL_GUEST.steps().map((s) => s.key + ':' + s.state).join(' ') }));
note('A5 answering each question updates the readiness at once: 05 complete, 06 may open', st.done === true && /Complete/i.test(st.fav || '') && st.may === true, st.steps);
await leave();

/* ================================================================ TICKETS — the guest with seats and a journey */
const G2 = await signIn(tok(GUEST));
await contact(GN.toLowerCase() + '.test@example.com', '+49 170 000 0001');
await go('your-journey.html');
for (const leg of ['train', 'c86']) { await p.click('[data-choose-flat="' + leg + '"]'); await p.waitForTimeout(500); }
await declineOthers(['train', 'c86']);
await go('your-journey.html');
const fitJ = await ticketsFit();
note('T1 Your Journey (390 px) · every ticket fits the phone: frame inside the viewport, header on screen, nothing cut off at the top', fitsOk(fitJ) && fitJ.length >= 2 && !(await overflow()), fitWords(fitJ));
await shot('T-journey-390');
/* the wedding and the seats, so the seat tickets exist */
await go('wedding.html');
for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(250); }
await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(300);
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
await go('wedding-preparation.html#seats'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
for (const ev of ['ceremony', 'dinner']) {
  const has = await p.evaluate((ev) => !!window.SIYL_SEATS.seatOf(ev, window.SIYL_GUEST.me().guestId), ev);
  if (has) continue;
  await p.locator('[data-ev="' + ev + '"] g[data-seat]').first().dispatchEvent('click'); await p.waitForTimeout(400);
  await p.click('[data-seat-confirm]'); await p.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await p.waitForTimeout(400);
  await p.click('[data-seat-continue]'); await p.waitForTimeout(600);
}
const ledger = await p.evaluate(() => { const id = window.SIYL_GUEST.me().guestId, L = window.SIYL_SEATLABELS, inv = window.SIYL_GUEST.party().invitationId; return { c: window.SIYL_SEATS.seatOf('ceremony', id), d: window.SIYL_SEATS.seatOf('dinner', id), refC: L.ref(inv, id, 'ceremony', window.SIYL_SEATS.seatOf('ceremony', id)), refD: L.ref(inv, id, 'dinner', window.SIYL_SEATS.seatOf('dinner', id)) }; });
const seatCards = await p.evaluate(() => [...document.querySelectorAll('.p-wseats .p-ticket')].map((t) => ({ id: t.getAttribute('data-ticket'), ref: t.getAttribute('data-ticket-ref'), qr: !!t.querySelector('svg.p-qr'), words: t.innerText.replace(/\s+/g, ' ') })));
note('T2 seat tickets · one per event, a ticket each: event, seat, guest, status, held for, the ticket reference and its code — the reference is the ledger\'s own', seatCards.length === 2 && seatCards[0].id === 'seat:ceremony' && seatCards[0].ref === ledger.refC && seatCards[1].ref === ledger.refD && seatCards.every((c) => c.qr && /Confirmed/i.test(c.words) && /Held for/i.test(c.words) && /Guest/i.test(c.words)) && /\b[A-F]\d{1,2}\b/.test(seatCards[0].words), seatCards.map((c) => c.id + ':' + c.ref + ':' + c.qr).join(' '));
const fitS = await ticketsFit();
note('T2 seat tickets (390 px) · nothing clipped, the header on screen', fitsOk(fitS) && !(await overflow()), fitWords(fitS));
await shot('T-seats-390');
/* the seat ticket PDF: a real, framed ticket with the reference and the code, the top well inside the page */
const [dlS] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('.p-wseats [data-seat-pass="all"]')]);
const pdfS = fs.readFileSync(await dlS.path(), 'latin1');
note('T3 seat ticket PDF · framed tickets (rounded frame, perforation), both events, the references, the codes, SEAT TICKET, the download stamp; no invitation id', /^%PDF-1\.4/.test(pdfS) && / c h B/.test(pdfS) && /\[3 3\] 0 d /.test(pdfS) && pdfS.includes(ledger.refC) && pdfS.includes(ledger.refD) && /SEAT TICKET/.test(pdfS) && /DOWNLOADED 20/.test(pdfS) && (pdfS.match(/ re f/g) || []).length > 600 && !/INV-G0/.test(pdfS), dlS.suggestedFilename());
if (OUT) fs.copyFileSync(await dlS.path(), path.join(OUT, 'seat-tickets-sample.pdf'));
/* the tickets page */
await go('tickets.html'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(800);
const tk = await p.evaluate(() => [...document.querySelectorAll('[data-ticket]')].map((t) => ({ id: t.getAttribute('data-ticket'), ref: (t.querySelector('.ref') || {}).textContent || '', qr: !!t.querySelector('svg.p-qr') })));
note('T4 tickets page · TICKET = TICKET: the two seat tickets and the two travel passes together, each with its reference and code', tk.length === 4 && tk.filter((t) => /^seat:/.test(t.id)).length === 2 && tk.some((t) => t.id === 'train') && tk.some((t) => t.id === 'c86') && tk.every((t) => t.qr && /^SYL-/.test(t.ref)) && tk.find((t) => t.id === 'seat:dinner').ref === ledger.refD, tk.map((t) => t.id + ':' + t.ref).join(' '));
const fitT = await ticketsFit();
note('T4 tickets page (390 px) · nothing clipped', fitsOk(fitT) && !(await overflow()), fitWords(fitT));
await shot('T-tickets-390');
const [dlP] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('[data-ticket="train"] [data-travel-pass]')]);
const pdfP = fs.readFileSync(await dlP.path(), 'latin1');
note('T5 travel pass PDF · a framed pass with the perforation, the reference, the code, TRAVEL PASS, the state, the download stamp', /^%PDF-1\.4/.test(pdfP) && / c h B/.test(pdfP) && /\[3 3\] 0 d /.test(pdfP) && pdfP.includes(tk.find((t) => t.id === 'train').ref) && /TRAVEL PASS/.test(pdfP) && /\(SELECTED\)/.test(pdfP) && /DOWNLOADED 20/.test(pdfP), dlP.suggestedFilename());
if (OUT) fs.copyFileSync(await dlP.path(), path.join(OUT, 'travel-pass-sample.pdf'));
/* CART = CART · REVIEW = REVIEW — and ONE PRICE SOURCE: a line saved at C86 85 (the Owner's screenshot) shows 105 and counts 105 */
await p.evaluate(() => { const b = JSON.parse(localStorage.getItem('siyl.bag') || '[]'); const c = b.find((x) => x.id === 'c86'); if (c) c.price = 85; localStorage.setItem('siyl.bag', JSON.stringify(b)); });
await go('cart.html'); await p.waitForTimeout(600);
const cartT = await body();
const c86line = await p.evaluate(() => { const l = document.querySelector('.cart-line[data-line="c86"]'); return l ? { amt: (l.querySelector('.p-line-amt') || {}).textContent, text: l.innerText.replace(/\s+/g, ' ') } : null; });
const totals = await p.evaluate(() => ({ cart: document.getElementById('cart-total').textContent, sum: window.SIYL_BAG.get().reduce((n, x) => n + (x.price || 0) * (x.qty || 1), 0), engine: window.SIYL_BAG.total(), c86: window.SIYL_BAG.get().find((x) => x.id === 'c86').price }));
note('T6 the cart · C86 saved at 85 reads USD 105 on the line and USD 105 per person beneath it; the total is the sum of authoritative amounts', c86line && c86line.amt === 'USD 105' && /USD 105 per person/.test(c86line.text) && !/USD 85/.test(cartT) && totals.c86 === 105 && totals.cart === money(totals.engine) && totals.engine === totals.sum, JSON.stringify(totals));
note('T6 the cart · lines, CHANGE / REMOVE / VIEW DETAILS, the total — no code, no reference, no QR', (await p.evaluate(() => document.querySelectorAll('svg.p-qr, .p-pass, [data-travel-pass]').length)) === 0 && !/SYL-/.test(cartT) && /Change/i.test(cartT) && /Remove/i.test(cartT) && /View details/i.test(cartT) && /Your total/i.test(cartT), '');
await shot('T-cart-390');
await go('about-you.html'); await p.click('[data-allergy="no"]'); await p.waitForTimeout(250);
for (const q of ['coffeetea', 'treat', 'drink', 'avoid', 'film', 'music']) { await p.fill('textarea[data-q="' + q + '"]', 'Test answer'); await p.locator('textarea[data-q="' + q + '"]').dispatchEvent('change'); await p.waitForTimeout(80); }
await p.check('#photo-ack'); await p.waitForTimeout(300);
await go('review.html'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const rvT = await body();
note('T6 Review & Send · the review, with the way to the tickets — no code, no QR', (await p.evaluate(() => document.querySelectorAll('svg.p-qr, .p-pass').length)) === 0 && !/SYL-/.test(rvT) && /Your tickets/i.test(rvT), '');
/* desktop */
await p.setViewportSize({ width: 1280, height: 900 });
for (const [f, n] of [['tickets.html', 'T-tickets-1280'], ['your-journey.html', 'T-journey-1280'], ['wedding-preparation.html#seats', 'T-seats-1280']]) {
  await go(f); await p.waitForFunction(() => !window.SIYL_SEATS || SIYL_SEATS.ready(), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(600);
  const fit = await ticketsFit();
  note('T7 ' + f + ' (1280 px) · every ticket fits, nothing clipped', fitsOk(fit) && !(await overflow()), fitWords(fit));
  await shot(n);
}
await p.setViewportSize({ width: 320, height: 700 });
await go('tickets.html'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const fit320 = await ticketsFit();
note('T7 tickets page (320 px) · every ticket fits the narrowest phone', fitsOk(fit320) && !(await overflow()), fitWords(fit320));
await p.setViewportSize({ width: 390, height: 844 });
note('Z no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
await leave();

/* ---- release what this walk held on the engine (the seats and registrations are restored by the caller) ---- */
for (const [s, key] of held) { const r = await leaveAs(s, key); console.log('released ' + s.guestId + ' ' + key + ' ' + (r.ok ? 'ok' : r.error)); }
await b.close();
const pass = R.filter((x) => x.ok).length;
console.log('\n' + pass + '/' + R.length + ' checks passed' + (errs.length ? ' · page errors: ' + errs.length : ''));
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R, errors: errs }, null, 2));
process.exit(pass === R.length ? 0 : 1);
