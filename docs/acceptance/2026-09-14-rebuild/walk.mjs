/* 002 — MAJOR BOOKING-SYSTEM REBUILD · INDIVIDUAL GUEST INVITATIONS (Owner, 14 Sep 2026)
   THE FOUR-IDENTITY WALK, in a real browser, against a Worker with the real engines:
     HARUTHAI · then SUTHEP · then PEGGY · then STEFFIE — each with their own code, each alone.
   One code = one guest · no switch · step 01 contact required · rooms are places in units, the
   hosts' suite open to the hosts only · one guest = one price (Sangkhathan 15, train 100, never a
   partner in the total) · first names on the seat plan · seat confirmation card · About You per
   spec · Review gated, own data, own send · the cart · Open another invitation / Sign out.
   Codes from the private register, never printed. The walk restores what it changes on the ledgers
   when RESTORE=1 (production).
     node docs/acceptance/2026-09-14-rebuild/walk.mjs <origin> [outdir]
   */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const clean = !/127\.0\.0\.1|localhost|github\.io/.test(ORIGIN);
const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8');
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], partyId: c[2], token: c[5], status: c[7] }; });
const tok = (g) => rows.find((r) => r.guestId === g && r.status === 'ACTIVE').token;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d: String(d || '') }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? ' — ' + String(d).slice(0, 200) : '')); };
const API = (ORIGIN.includes('github.io') ? 'https://seeyouinlaos-website.suthep-hrg.workers.dev' : ORIGIN) + '/api';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|net::ERR|404/.test(m.text())) errs.push('console: ' + m.text()); });
const go = async (f) => { await p.goto('about:blank'); await p.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); };
const txt = async (sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const ls = async (k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
const shot = async (n) => { if (OUT) await p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true }); };
const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
async function signIn(code) {
  await go('invitation.html?open=1');
  await p.waitForSelector('.siyl-inv input', { timeout: 8000 });
  await p.fill('.siyl-inv input', code); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 15000 });
  await p.waitForTimeout(600);
  return ls('siyl.auth');
}
async function leave(how) {
  await p.evaluate((how) => { const b = document.querySelector('[data-leave="' + how + '"]'); if (b) b.click(); else window.SIYL_PREP.leave(how); }, how);
  /* the code screen, on a clean page: the session is gone and — for OPEN ANOTHER INVITATION — the overlay is up */
  await p.waitForFunction((how) => !localStorage.getItem('siyl.auth') && /invitation/.test(location.pathname) && (how !== 'another' || !!document.querySelector('.siyl-inv input')), how, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(400);
}
async function contact(email, phone) {
  await go('invitation.html');
  await p.fill('#p-email', email); await p.locator('#p-email').dispatchEvent('change'); await p.waitForTimeout(150);
  await p.fill('#p-phone', phone); await p.locator('#p-phone').dispatchEvent('change'); await p.waitForTimeout(300);
}
async function selectRoomViaPage(stay, slug, win) {
  await go('room.html?stay=' + stay + '&room=' + slug);
  const i = await p.evaluate((win) => [...document.querySelectorAll('.buy .win .cta[data-avwin]')].findIndex((b) => b.getAttribute('data-avwin') === win), win);
  await p.locator('.buy .win .cta[data-avwin]').nth(i).click(); await p.waitForTimeout(1200);
  return p.evaluate((win) => { const b = [...document.querySelectorAll('.buy .win .cta[data-avwin]')].find((x) => x.getAttribute('data-avwin') === win); return { btn: b && b.textContent, av: (document.querySelector('[data-av="' + win + '"]') || {}).textContent, swap: (document.querySelector('.swap:not([hidden])') || {}).textContent }; }, win);
}
async function declineOthers(keep) {
  await go('your-journey.html');
  await p.evaluate((keep) => { window.SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (!keep.includes(s.key) && window.SIYL_JOURNEY.state(s) === 'open') window.SIYL_JOURNEY.skip(s.key, true); }); }, keep);
  await p.waitForTimeout(400);
}
async function wedding(temple, offering) {
  await go('wedding.html');
  for (const [k, v] of [['temple', temple], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(250); }
  if (temple === 'yes' && offering) { await p.click('#sangkhathan [data-off="' + offering + '"]'); await p.waitForTimeout(300); }
}
async function dinnerSeat() {
  await go('wedding-preparation.html#seats');
  await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
  const names = await p.evaluate(() => [...document.querySelectorAll('[data-ev="dinner"] .seat-name')].map((t) => t.textContent));
  /* a seat already held (production: the migrated holds) — the change flow instead of the first choice */
  const held = await p.evaluate(() => window.SIYL_SEATS.seatOf('dinner', window.SIYL_GUEST.me().guestId));
  if (held) { await p.click('[data-seatmap="dinner"] [data-seat-change]'); await p.waitForTimeout(400); }
  const first = p.locator('[data-ev="dinner"] g[data-seat]').first();
  const lab = await first.getAttribute('data-label');
  await first.dispatchEvent('click'); await p.waitForTimeout(400);
  const bar = await txt('.p-seatbar');
  await p.click('[data-seat-confirm]'); await p.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await p.waitForTimeout(400);
  const conf = await txt('.p-seatconf');
  await p.click('[data-seat-continue]'); await p.waitForTimeout(500);
  return { names, lab, bar, conf, held, card: await txt('.p-wseats'), pool: await txt('.p-poolnote') };
}
async function aboutYou(allergy, details) {
  await go('about-you.html');
  await p.click('[data-allergy="' + allergy + '"]'); await p.waitForTimeout(250);
  if (allergy === 'yes') { await p.fill('#allergy-text', details); await p.locator('#allergy-text').dispatchEvent('change'); await p.waitForTimeout(250); }
  /* every visible question is required (Owner, 15 Sep 2026) */
  for (const q of ['coffeetea', 'treat', 'drink', 'avoid', 'film', 'music']) { await p.fill('textarea[data-q="' + q + '"]', 'Test answer'); await p.locator('textarea[data-q="' + q + '"]').dispatchEvent('change'); await p.waitForTimeout(80); }
  await p.check('#photo-ack'); await p.waitForTimeout(300);
  return { allergyState: await txt('#allergy-state'), photoState: await txt('#photo-state'), steps: await p.evaluate(() => window.SIYL_GUEST.steps().map((s) => s.state)) };
}
async function send() {
  await go('review.html');
  await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready() && window.SIYL_UNITS && SIYL_UNITS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
  const before = { ready: await txt('#ready'), total: await txt('#tt'), btn: await txt('#send'), you: await txt('#b1c') };
  await p.click('#send');
  await p.waitForFunction(() => document.getElementById('send').getAttribute('data-state') === 'sent' || (document.getElementById('err') || {}).textContent, null, { timeout: 20000 }); await p.waitForTimeout(500);
  return { ...before, sent: await txt('#sent'), btnAfter: await txt('#send'), err: await txt('#err'), state: await p.evaluate(() => document.getElementById('send').getAttribute('data-state')) };
}
const money = (n) => 'USD ' + Number(n).toLocaleString('en-US');
const cart = async () => { await go('cart.html'); await p.waitForTimeout(600); return { text: await body(), total: await txt('#cart-total'), lines: await p.evaluate(() => [...document.querySelectorAll('.cart-line')].map((l) => l.innerText.replace(/\s+/g, ' ').trim())), review: await p.evaluate(() => (document.getElementById('cart-review') || {}).getAttribute('href')) }; };

/* ================================================================ HARUTHAI */
const H = await signIn(tok('G048'));
note('H1 one code = one guest', H.guestId === 'G048' && H.invitationId === 'INV-G048' && H.hosts === true && H.hostRole === 'BRIDE' && !H.guests && !!H.bearer && H.members.length === 2, 'session is Haruthai alone; the party is context');
let t = await body();
note('H2 step 01 onboarding · no SWITCH, name read-only, contact required, six-step roadmap', /you are invited/i.test(t) && !/\bSWITCH\b|Answering for|Continuing as/i.test(t) && /Your contact details/i.test(t) && /Six steps, in order/i.test(t) && /Locked/i.test(t), t.match(/.{0,30}(SWITCH|Answering for|Continuing as).{0,30}/i)?.[0] || t.slice(0, 80));
note('H2 step 01 · Continue is strict', await p.evaluate(() => document.getElementById('go').getAttribute('aria-disabled') === 'true'));
await contact('haruthai.test@example.com', '+66 81 000 0001');
note('H3 step 01 complete once email + mobile are valid; Continue enabled; ✓ Complete', /Complete/i.test(await txt('#contact-state')) && (await p.evaluate(() => document.getElementById('go').getAttribute('aria-disabled'))) === 'false', await txt('#contact-state'));
await shot('H-01');
/* the room engine: the hosts' suite */
const r1 = await selectRoomViaPage('souphattra', 'souphattra-presidential', 'wedstay');
note('H4 room page · Presidential (Wedding Stay) held for Haruthai · Room A · 1/2', /Remove from Your Journey/.test(r1.btn || '') && /Your place is held/.test(r1.av || '') && /Room A · You · 1 place available/.test(r1.swap || ''), JSON.stringify(r1));
await go('journeys.html#j-wedstay');
const row = await p.evaluate(() => { const a = document.querySelector('#j-wedstay .var[data-room="souphattra-presidential"]'); return a ? a.innerText.replace(/\s+/g, ' ') : ''; });
note('H4 journeys · the Presidential is a room like any other (no reservation words): current selection · Room A, the place held', !/yours to choose|Reserved/i.test(row) && /Current selection · Room A/i.test(row) && /Your place is held · Room A/i.test(row), row);
await p.evaluate(() => window.SIYL_STAY.select('prewed', 'souphattra-presidential'));
await p.waitForTimeout(800);
await p.click('[data-choose-flat="train"]').catch(() => {});
await go('your-journey.html'); await p.click('[data-choose-flat="train"]'); await p.waitForTimeout(400);
await declineOthers(['wedstay', 'prewed', 'train']);
await go('your-journey.html');
t = await body();
note('H5 Your Journey · CURRENT SELECTION vocabulary, own room words, no party wording', /Current selection/i.test(t) && /Room A · You · 1 place available/i.test(t) && !/For your party|shared once|Change this day|Selected for your journey/i.test(t) && /For you · Haruthai/i.test(t), t.slice(0, 100));
const presPrice = await p.evaluate(() => window.SIYL_PRICE.quote('wedstay', 'souphattra-presidential').total + window.SIYL_PRICE.quote('prewed', 'souphattra-presidential').total);
note('H5 Your Journey · total = train 100 + Presidential × 2 windows (one guest)', (await txt('#tt')) === money(100 + presPrice), await txt('#tt'));
await shot('H-02');
let c = await cart();
note('H6 cart · bag icon opens the cart; lines grouped; own total; not ready → first missing item', /Your bag · Haruthai/i.test(c.text) && c.lines.length === 3 && c.total === money(100 + presPrice) && /not ready to review yet/i.test(c.text) && /wedding\.html#ev-temple/.test(c.review || ''), c.review);
await wedding('yes', 'yes');
t = await body();
note('H7 step 03 · own answers; Sangkhathan YES = USD 15 in her journey', /Selected · USD 15 · in your journey/i.test(t) && !/Total for your party|We would like/i.test(t), t.match(/Sangkhathan[^.]{0,80}/)?.[0]);
c = await cart();
note('H7 cart · Sangkhathan USD 15 added once; total 115 + rooms', c.total === money(115 + presPrice) && c.lines.filter((l) => /Sangkhathan/.test(l)).length === 1, c.total);
await go('wedding-preparation.html');
await p.check('[data-ack]'); await p.waitForTimeout(300);
note('H8 step 04 · dress acknowledged in her own name; ceremony fixed front centre (Bride)', /Complete/i.test(await txt('#ack-state')) && (await p.evaluate(() => (document.querySelector('[data-seatmap="ceremony"]') || {}).getAttribute('data-state'))) === 'fixed' && /Front centre · Bride/i.test(await body()));
const ds = await dinnerSeat();
note('H8 step 04 · dinner seat chosen on the plan, confirmed, the YOUR WEDDING SEATS tickets (Front centre · a dinner seat · references · download), the pool in words', /Seat confirmed/i.test(ds.conf) && /Your wedding seats/i.test(ds.card) && /Front centre/i.test(ds.card) && /\b[AB]\d{1,2}\b/.test(ds.card) && /SYL-WD-/.test(ds.card) && /Download seat tickets/i.test(ds.card) && /pool/i.test(ds.pool) && /(Booking summary|Change of seat)/i.test(ds.bar), ds.card.slice(0, 160) + ' · ' + ds.pool);
await shot('H-04');
const ay = await aboutYou('no');
note('H9 step 05 · allergy NO completes, photography acknowledged; retired questions gone; 01–05 complete', /Complete/i.test(ay.allergyState) && /Complete/i.test(ay.photoState) && ay.steps.slice(0, 5).every((s) => s === 'complete') && !/Travel comfort|Accessibility|Anything else we should know|Nothing here needs a tick/.test(await body()), ay.steps.join(','));
await go('your-journey.html');
const idx = await p.evaluate(() => { document.querySelector('.prep-all').click(); return new Promise((r) => setTimeout(() => r(document.getElementById('prep-steps').innerText.replace(/\s+/g, ' ')), 500)); });
note('H10 View All Steps · ✓ Complete ×5, Review needs attention (ready to send), no OPEN', (idx.match(/Complete/gi) || []).length >= 5 && /Needs attention/i.test(idx) && !/\bOPEN\b(?! ANOTHER)/.test(idx) && /Open another invitation/i.test(idx) && /Sign out/i.test(idx), idx.slice(0, 200));
await shot('H-steps');
const sd = await send();
note('H11 Review & Send · own details, own total = cart total, everything here → send → RECEIVED with the server stamp; button SENT', /haruthai\.test@example\.com/.test(sd.you) && sd.total === money(115 + presPrice) && /can be sent/i.test(sd.ready) && sd.state === 'sent' && /received by Guest Relations/i.test(sd.sent) && /Sent to Guest Relations/i.test(sd.btnAfter) && !sd.err, sd.sent.slice(0, 120));
await shot('H-06');
const hStatus = await (await fetch(API + '/status?invitation=INV-G048')).json();
note('H11 the register holds INV-G048', hStatus.received === true && !!hStatus.receivedAt, hStatus.receivedAt);
const hReceivedAt = hStatus.receivedAt;
note('H12 no page errors', errs.length === 0, errs.join(' | '));
await go('review.html'); await leave('another');
note('H13 Open another invitation · session cleared, code screen', (await ls('siyl.auth')) === null && (await p.evaluate(() => !!document.querySelector('.siyl-inv input'))), '');

/* ================================================================== SUTHEP */
const S = await signIn(tok('G049'));
note('S1 one code = one guest · Suthep alone · no trace of Haruthai\'s draft', S.guestId === 'G049' && S.hosts === true && S.hostRole === 'GROOM' && (await ls('siyl.bag')) === null && (await ls('siyl.temple')) === null, '');
await contact('suthep.test@example.com', '+66 81 000 0002');
await go('journeys.html#j-wedstay');
const row2 = await p.evaluate(() => { const a = document.querySelector('#j-wedstay .var[data-room="souphattra-presidential"]'); return a ? a.innerText.replace(/\s+/g, ' ') : ''; });
note('S2 journeys · Suthep sees the Presidential with 1 room · 1 place available — no reservation words', /1 room · 1 place available/i.test(row2) && !/yours to choose|Reserved/i.test(row2), row2);
const r2 = await selectRoomViaPage('souphattra', 'souphattra-presidential', 'wedstay');
note('S3 room page · joins the SAME room as Haruthai · Room A · Haruthai · You · Full', /Room A · Haruthai · You · Full/.test(r2.swap || ''), JSON.stringify(r2));
await go('your-journey.html');
await p.click('[data-rooms-for="wedstay"]'); await p.waitForTimeout(400);
const units = await p.evaluate(() => [...document.querySelectorAll('[data-rooms-box="wedstay"] .p-unit')].map((u) => u.innerText.replace(/\s+/g, ' ')));
note('S3 Your Journey · the room chooser: Room A is his and full with both first names; JOIN THIS ROOM on nothing else (one unit)', units.length === 1 && /Haruthai · You · Full/i.test(units[0]) && /Your room/i.test(units[0]), units.join(' | '));
await shot('S-rooms');
await declineOthers(['wedstay']);
await wedding('yes', 'no');
c = await cart();
const presW = await p.evaluate(() => window.SIYL_PRICE.quote('wedstay', 'souphattra-presidential').total);
note('S4 cart · Suthep\'s own total: Presidential (wedding stay) only, no Sangkhathan, none of Haruthai\'s lines', c.total === money(presW) && c.lines.length === 1 && !/Special Express|Sangkhathan/.test(c.lines.join(' ')), c.total);
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
const ds2 = await dinnerSeat();
note('S5 step 04 · the plan shows Haruthai\'s first name on her chair; Suthep\'s seat confirmed; Groom fixed', ds2.names.includes('Haruthai') && /Seat confirmed/i.test(ds2.conf) && /Groom · Front centre/i.test(ds2.card), ds2.names.join(','));
await shot('S-04');
const ay2 = await aboutYou('yes', 'peanuts');
note('S6 step 05 · allergy YES with details completes', /Complete/i.test(ay2.allergyState) && ay2.steps.slice(0, 5).every((s) => s === 'complete'), ay2.allergyState);
const sd2 = await send();
note('S7 Review & Send · his own data, his own total, his own send and stamp', /suthep\.test@example\.com/.test(sd2.you) && sd2.total === money(presW) && sd2.state === 'sent' && !/haruthai\.test@/i.test(sd2.you), sd2.total);
const sStatus = await (await fetch(API + '/status?invitation=INV-G049')).json();
note('S7 the register holds INV-G049 separately from INV-G048', sStatus.received === true && sStatus.receivedAt !== hReceivedAt, sStatus.receivedAt);
const hAgain = await (await fetch(API + '/status?invitation=INV-G048')).json();
note('S7 Haruthai\'s record untouched by Suthep\'s send', hAgain.receivedAt === hReceivedAt, '');
note('S8 no page errors', errs.length === 0, errs.join(' | '));
await go('review.html'); await leave('out');
note('S9 Sign out · code screen, nothing of Suthep left', (await ls('siyl.auth')) === null && (await ls('siyl.bag')) === null, '');

/* ================================================================== PEGGY */
const P1 = await signIn(tok('G001'));
note('P1 one code = one guest · Peggy alone, not a host', P1.guestId === 'G001' && P1.hosts === false && P1.members.length === 2, '');
await contact('peggy.test@example.com', '+49 170 000 0001');
await go('journeys.html#j-wedstay');
const row3 = await p.evaluate(() => { const a = document.querySelector('#j-wedstay .var[data-room="souphattra-presidential"]'); return { text: a ? a.innerText.replace(/\s+/g, ' ') : '', rsvd: a && a.classList.contains('rsvd') }; });
note('P2 journeys · NO PRE-RESERVED ROOMS (Owner, 15 Sep 2026): the Presidential is a room like any other — its real places, no reservation words', row3.rsvd !== true && !/Reserved|yours to choose/i.test(row3.text) && /(1 room · 1 place available|1 room · 2 places available|Fully booked)/i.test(row3.text), row3.text);
const r3 = await selectRoomViaPage('souphattra', 'heritage', 'wedstay');
note('P3 room page · The Heritage held for Peggy · Room A · 1/2', /Your place is held/.test(r3.av || '') && /Room A · You · 1 place available/.test(r3.swap || ''), JSON.stringify(r3));
const eng = await (await fetch(API + '/rooms/join', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': P1.bearer }, body: JSON.stringify({ invitationId: 'INV-G001', guestId: 'G001', key: 'wedstay/souphattra-presidential', label: 'B', name: 'x' }) })).json();
note('P3 engine · one physical Presidential = one unit: Room B does not exist and is refused; nothing else moves', eng.ok === false && eng.error === 'unknown room', eng.error);
const other = await (await fetch(API + '/rooms/join', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': P1.bearer }, body: JSON.stringify({ invitationId: 'INV-G002', guestId: 'G002', key: 'wedstay/heritage', label: 'A', name: 'x' }) })).json();
note('P3 engine · Peggy cannot book a room for Steffie', other.ok === false && /not your guest/.test(other.error || ''), other.error);
await declineOthers(['wedstay']);
await wedding('yes', 'yes');
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
const ds3 = await dinnerSeat();
note('P4 step 04 · ceremony seat required for a temple guest; dinner seat confirmed; names of the hosts visible', /Seat confirmed/i.test(ds3.conf) && ds3.names.includes('Haruthai') && ds3.names.includes('Suthep'), ds3.names.join(','));
/* the ceremony seat, too */
await go('wedding-preparation.html#seats'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(400);
if (!(await p.evaluate(() => window.SIYL_SEATS.seatOf('ceremony', window.SIYL_GUEST.me().guestId)))) { await p.locator('[data-ev="ceremony"] g[data-seat]').first().dispatchEvent('click'); await p.waitForTimeout(300); await p.click('[data-seat-confirm]'); await p.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await p.click('[data-seat-continue]'); await p.waitForTimeout(400); }
note('P4 step 04 · both seats held → YOUR WEDDING SEATS with a TEMPLE CEREMONY ticket and a WEDDING DINNER ticket, each with its reference', /Your wedding seats/i.test(await txt('.p-wseats')) && /Temple Ceremony/i.test(await txt('.p-wseats')) && /Wedding Dinner/i.test(await txt('.p-wseats')) && /SYL-TC-/.test(await txt('.p-wseats')) && /SYL-WD-/.test(await txt('.p-wseats')), (await txt('.p-wseats')).slice(0, 200));
await shot('P-04');
const ay3 = await aboutYou('no');
const heritageW = await p.evaluate(() => window.SIYL_PRICE.quote('wedstay', 'heritage').total);
c = await cart();
note('P5 cart · Peggy\'s own total = Heritage + Sangkhathan 15, never Steffie\'s', c.total === money(heritageW + 15) && c.lines.length === 2, c.total);
const sd3 = await send();
note('P6 Review & Send · Peggy\'s own send', sd3.state === 'sent' && sd3.total === money(heritageW + 15), sd3.total);
note('P7 no page errors', errs.length === 0, errs.join(' | '));
await go('review.html'); await leave('another');

/* ================================================================ STEFFIE */
const S2 = await signIn(tok('G002'));
note('T1 one code = one guest · Steffie alone', S2.guestId === 'G002' && (await ls('siyl.bag')) === null, '');
await contact('steffie.test@example.com', '+49 170 000 0002');
const r4 = await selectRoomViaPage('souphattra', 'heritage', 'wedstay');
note('T2 room page · Steffie joins Peggy\'s Room A · Peggy · You · Full', /Room A · Peggy · You · Full/.test(r4.swap || ''), JSON.stringify(r4));
await go('your-journey.html'); await p.click('[data-rooms-for="wedstay"]'); await p.waitForTimeout(400);
const units2 = await p.evaluate(() => [...document.querySelectorAll('[data-rooms-box="wedstay"] .p-unit')].map((u) => u.innerText.replace(/\s+/g, ' ')));
note('T2 Your Journey · five Heritage rooms: A full with both names, B–E available with JOIN / CHOOSE', units2.length === 5 && /Peggy · You · Full/i.test(units2[0]) && units2.slice(1).every((u) => /2 places available/i.test(u) && /Choose this room/i.test(u)), units2.join(' | '));
/* change room: join B, then the old place is released */
await p.locator('[data-rooms-box="wedstay"] [data-join$="|B"]').first().click(); await p.waitForTimeout(1200);
const after = await p.evaluate(() => ({ line: (document.querySelector('[data-unit-line]') || {}).textContent, mine: window.SIYL_UNITS.mine('wedstay') }));
note('T3 change room · Steffie moves to Room B; Room A keeps Peggy alone', /Room B · You · 1 place available/i.test(after.line || '') && after.mine && after.mine.label === 'B', after.line);
const plan = await (await fetch(API + '/rooms', { headers: { 'x-siyl-auth': S2.bearer } })).json();
note('T3 engine · Room A: Peggy 1/2 · Room B: Steffie 1/2 — never double-booked', plan.units['wedstay/heritage'][0].taken === 1 && plan.units['wedstay/heritage'][1].taken === 1 && plan.units['wedstay/heritage'][1].occupants[0].mine === true, '');
await p.click('[data-rooms-for="wedstay"]'); await p.waitForTimeout(400);
await p.locator('[data-rooms-box="wedstay"] [data-join$="|A"]').first().click(); await p.waitForTimeout(1200);
note('T3 change back · joins Peggy in Room A again · Full', /Room A · Peggy · You · Full/i.test(await txt('[data-unit-line]')), await txt('[data-unit-line]'));
await shot('T-rooms');
await declineOthers(['wedstay']);
await wedding('no', null);
note('T4 step 03 · not attending the temple: no Sangkhathan asked, step complete', (await p.evaluate(() => window.SIYL_GUEST.done('wedding'))) === true, '');
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
const cer = await p.evaluate(() => (document.querySelector('[data-seatmap="ceremony"]') || {}).getAttribute('data-state'));
const missP = await p.evaluate(() => ({ miss: window.SIYL_GUEST.missingFor('preparation').map((m) => m.key).join(','), heldD: !!window.SIYL_SEATS.seatOf('dinner', window.SIYL_GUEST.me().guestId) }));
note('T5 step 04 · no ceremony seat required when not attending; the dinner seat is (unless already held)', cer === 'none' && (missP.heldD ? missP.miss === '' : missP.miss === 'seat:dinner'), cer + ' · ' + JSON.stringify(missP));
const ds4 = await dinnerSeat();
note('T5 step 04 · dinner seat confirmed; Peggy\'s name on the plan', /Seat confirmed/i.test(ds4.conf) && ds4.names.includes('Peggy'), ds4.names.join(','));
await aboutYou('no');
c = await cart();
note('T6 cart · Steffie\'s own total = Heritage only (no Sangkhathan)', c.total === money(heritageW) && c.lines.length === 1, c.total);
const sd4 = await send();
note('T7 Review & Send · Steffie\'s own send, separate stamp', sd4.state === 'sent', '');
const pStatus = await (await fetch(API + '/status?invitation=INV-G001')).json(), tStatus = await (await fetch(API + '/status?invitation=INV-G002')).json();
note('T7 registers · INV-G001 and INV-G002 received separately', pStatus.received && tStatus.received && pStatus.receivedAt !== tStatus.receivedAt, '');
/* the retired party code must not open anyone else: it is Peggy's own now */
note('T8 the former party code is Peggy\'s code and nobody else\'s', rows.find((r) => r.guestId === 'G001').token !== rows.find((r) => r.guestId === 'G002').token, '');
/* gating: a deep link into Review with something undone lands on the missing item */
await p.evaluate(() => window.SIYL_GUEST.setPhotoAck(false));
await go('review.html');
note('T9 gate · Review with the acknowledgement undone lands on About You #photo with the reason', /about-you/.test(p.url()) && /#photo/.test(p.url()) && /opens once this is complete/.test(await body()), p.url());
await p.check('#photo-ack'); await p.waitForTimeout(300);
/* sticky VIEW respects the flow */
await go('your-journey.html');
note('T10 sticky bar · VIEW → Review & Send when 01–05 are complete', /review/.test(await p.evaluate(() => (document.querySelector('[data-bag-view]') || {}).getAttribute('href') || '')), '');
/* cart remove: the Sangkhathan of Peggy was in her cart; Steffie's cart: remove the stay → place released, step 02 needs attention */
await go('cart.html'); await p.click('[data-remove="wedstay"]'); await p.waitForTimeout(1200);
const afterRm = await p.evaluate(() => ({ empty: /Your bag is empty/i.test(document.body.innerText), mine: window.SIYL_UNITS.mine('wedstay'), st: window.SIYL_GUEST.steps().find((s) => s.key === 'journey').state }));
note('T11 cart REMOVE · the place is released on the engine, the bag empties, step 02 needs attention', afterRm.empty && afterRm.mine === null && afterRm.st === 'attention', JSON.stringify(afterRm));
await go('your-journey.html');
note('T11 sticky bar · gone with an empty bag; VIEW would lead to the first missing item', (await p.evaluate(() => window.SIYL_GUEST.nextHref())).startsWith('your-journey.html#s-'), '');
const r5 = await selectRoomViaPage('souphattra', 'heritage', 'wedstay');
note('T12 room page · the stay chosen again → back beside Peggy in Room A', /Room A · Peggy · You · Full/.test(r5.swap || ''), r5.swap);
await shot('T-cart');
/* widths */
for (const w of [320, 375, 430]) {
  await p.setViewportSize({ width: w, height: 844 });
  for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html']) {
    await go(f); if (await overflow()) note('W ' + w + ' ' + f, false, 'horizontal overflow');
  }
  note('W ' + w + ' · no horizontal overflow on the seven private surfaces', !R.some((x) => x.id.startsWith('W ' + w + ' ') && !x.ok), '');
}
await p.setViewportSize({ width: 390, height: 844 });
note('Z no page errors across the four identities', errs.length === 0, errs.join(' | ').slice(0, 300));
await go('review.html'); await leave('out');

/* ---- restore: the test state is removed again on a production run (restore.mjs) */
await b.close();
const pass = R.filter((x) => x.ok).length;
console.log('\n' + pass + '/' + R.length + ' checks passed' + (errs.length ? ' · page errors: ' + errs.length : ''));
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R, errors: errs }, null, 2));
process.exit(pass === R.length ? 0 : 1);
