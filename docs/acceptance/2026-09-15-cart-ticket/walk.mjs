/* 002 — FOLLOW-UP CORRECTION PACK · CART + TICKET SYSTEM + SOURCE-TRUTH UPDATE (Owner, 15 Sep 2026)
   THE WALK, in a real browser against a Worker with the real engines — the Owner's list J:
     bag icon → the cart · own items only · cart total = sticky total = Review total · REMOVE and CHANGE
     update the authoritative state · deep links land on the exact selector · gating holds · the transport
     UI is a ticket with a code that scans · C86 = USD 105 everywhere · run A = poolside on the plan ·
     the travel pass downloads as a real PDF · mobile and desktop.
   A HOST walks the whole thing (HOST=G048 Haruthai by default; HOST=G049 Suthep when Haruthai's invitation
   is in live use); a GUEST who is not a host (GUEST=G001 Peggy) proves their own bag and their own pass.
   Codes from the private register, never printed. Production is restored afterwards.
     HOST=G049 GUEST=G001 node docs/acceptance/2026-09-15-cart-ticket/walk.mjs <origin> [outdir] [jsqr-path]
   */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const JSQR = process.argv[4] || null;   /* an independent decoder, when one is at hand: proves the code scans */
const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8');
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], token: c[5], status: c[7] }; });
const tok = (g) => rows.find((r) => r.guestId === g && r.status === 'ACTIVE').token;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d: String(d || '') }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? ' — ' + String(d).slice(0, 220) : '')); };
const API = (ORIGIN.includes('github.io') ? 'https://seeyouinlaos-website.suthep-hrg.workers.dev' : ORIGIN) + '/api';

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
const cart = async () => { await go('cart.html'); await p.waitForTimeout(700); return { text: await body(), total: await txt('#cart-total'), lines: await p.evaluate(() => [...document.querySelectorAll('.cart-line')].map((l) => ({ id: l.getAttribute('data-line'), text: l.innerText.replace(/\s+/g, ' ').trim(), pass: !!l.querySelector('.p-pass'), qr: !!l.querySelector('.p-pass svg.p-qr'), ref: (l.querySelector('.p-pass .ref') || {}).textContent || '', change: (l.querySelector('[data-change]') || {}).getAttribute('href') }))), review: await p.evaluate(() => (document.getElementById('cart-review') || {}).getAttribute('href')), foot: await p.evaluate(() => (document.getElementById('cart-foot') || {}).hidden === false) }; };
/* the sticky Journey bar lives on the planner: its amount and where VIEW leads */
const sticky = async () => { await go('your-journey.html'); return { total: await p.evaluate(() => (document.querySelector('.jbar .jb-t') || {}).textContent || ''), view: await p.evaluate(() => { const a = document.querySelector('[data-bag-view]'); return a ? a.getAttribute('href') : ''; }) }; };
const ticket = async (leg) => p.evaluate((leg) => { const t = document.querySelector('[data-ticket="' + leg + '"]'); if (!t) return null; return { on: t.classList.contains('on'), text: t.innerText.replace(/\s+/g, ' ').trim(), codes: [...t.querySelectorAll('.p-ticket-code')].map((x) => x.textContent), times: [...t.querySelectorAll('.p-ticket-time')].map((x) => x.textContent), qr: !!t.querySelector('svg.p-qr'), ref: (t.querySelector('.ref') || {}).textContent || '', dl: !!t.querySelector('[data-travel-pass]'), state: (t.querySelector('[data-ticket-state]') || {}).textContent || '' }; }, leg);
/* the code scans: the SVG on the page, rasterised, read by an independent decoder */
async function scans(sel) {
  if (!JSQR) return 'skipped';
  await p.addScriptTag({ path: JSQR });
  return p.evaluate(async (sel) => {
    const svg = document.querySelector(sel); if (!svg) return 'no svg';
    const xml = new XMLSerializer().serializeToString(svg), img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    await new Promise((r, j) => { img.onload = r; img.onerror = j; });
    const S = 320, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.drawImage(img, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S), r = window.jsQR(d.data, S, S); return r ? r.data : 'no decode';
  }, sel);
}

/* ================================================================ HARUTHAI */
const HOST = process.env.HOST || 'G048', GUEST = process.env.GUEST || 'G001';
const H = await signIn(tok(HOST));
const HN = H.preferredName;   /* the host's first name, from the session — never typed here */
note('H1 one code = one guest', H.guestId === HOST && H.hosts === true && !!H.bearer && !!HN, HN);
await contact(HN.toLowerCase() + '.test@example.com', '+66 81 000 0001');
/* the four legs, from Your Journey (the planner) */
await go('your-journey.html');
for (const leg of ['train', 'c86', 'return']) { await p.click('[data-choose-flat="' + leg + '"]'); await p.waitForTimeout(500); }
await p.click('#flysel [data-cls="business"]'); await p.waitForTimeout(600);
await declineOthers(['train', 'mu9646', 'c86', 'return']);
await go('your-journey.html');
let t = await body();
const T1 = await ticket('train'), T2 = await ticket('mu9646'), T3 = await ticket('c86'), T4 = await ticket('return');
note('H2 Your Journey · every transport leg is a ticket: both ends, times, class, the guest, the pass reference, the code, the download', [T1, T2, T3, T4].every((x) => x && x.on && x.qr && /^SYL-/.test(x.ref) && x.dl && /Current selection/i.test(x.state)) && T1.codes.join('>') === 'BKK>NKI' && T1.times.join('>') === '20:25>06:25' && T2.codes.join('>') === 'VTE>KMG' && T2.times.join('>') === '15:50>18:25' && T3.codes.join('>') === 'KMG>LJG' && T3.times.join('>') === '10:15>13:44' && T4.codes.join('>') === 'LJG>BKK' && T4.times.join('>') === '10:35>14:55', JSON.stringify([T1.ref, T2.ref, T3.ref, T4.ref]));
note('H2 Your Journey · the ticket names the guest and the class; the flight ticket follows the chosen fare', new RegExp('Guest ' + HN, 'i').test(T2.text) && /Class Business Class/i.test(T2.text) && /Class First Class Sleeper/i.test(T1.text) && /Class Economy flexible/i.test(T4.text), T2.text.slice(0, 160));
note('H3 C86 = USD 105 on Your Journey (ticket + card); total = 100 + 275 + 105 + 200', /USD 105/.test(T3.text) && (await txt('#tt')) === money(680), await txt('#tt'));
const scan = await scans('[data-ticket="c86"] svg.p-qr');
note('H3 the C86 code SCANS (independent decoder) and carries the pass, the guest, the leg, the date, the class, the state', scan === 'skipped' || (/TRAVEL PASS SYL-C86-/.test(scan) && scan.includes(HN) && /C86 Kunming → Lijiang/.test(scan) && /04 March 2027/.test(scan) && /Business Class/.test(scan) && /SELECTED/.test(scan)), String(scan).replace(/\n/g, ' | '));
await shot('H-journey-tickets');
/* the download: a real PDF with the reference */
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('[data-ticket="c86"] [data-travel-pass]')]);
const pdfPath = await dl.path(); const pdf = fs.readFileSync(pdfPath, 'latin1');
note('H4 Download travel pass · a real PDF, named for the leg and the guest, carrying the reference, the route, the class, the code and honest words', /^%PDF-1\.4/.test(pdf) && dl.suggestedFilename() === 'see-you-in-laos-travel-pass-c86-' + HN.toLowerCase() + '.pdf' && pdf.includes(T3.ref) && /\(KMG\)/.test(pdf) && /\(LJG\)/.test(pdf) && /Business Class/.test(pdf) && (pdf.match(/ re f/g) || []).length > 300 && /Nothing is paid on this website/.test(pdf) && !pdf.includes('INV-' + HOST), dl.suggestedFilename() + ' · ' + pdf.length + ' bytes');
if (OUT) fs.copyFileSync(pdfPath, path.join(OUT, 'travel-pass-c86-sample.pdf'));
/* the bag */
let c = await cart(); await shot('H-cart');
note('H5 bag icon → the cart · own lines, grouped under Transport, each transport line carrying its pass strip with the code and the reference', (await p.evaluate(() => (document.querySelector('a.bag') || {}).getAttribute('href'))) === 'cart.html' && new RegExp('Your bag · ' + HN, 'i').test(c.text) && c.lines.length === 4 && c.lines.every((l) => l.pass && l.qr && /^SYL-/.test(l.ref)) && /Transport/i.test(c.text) && c.foot === true, c.lines.map((l) => l.id + ':' + l.ref).join(' '));
let sb = await sticky();
note('H5 cart · C86 line says USD 105; cart total = sticky total = 680', c.lines.find((l) => l.id === 'c86').text.includes('USD 105') && c.total === money(680) && sb.total === money(680), c.total + ' / ' + sb.total);
note('H5 cart · no checkout language, no quantity controls, the words are YOUR BAG · YOUR TOTAL · REVIEW YOUR JOURNEY', !/checkout|delivery|payment|card details/i.test(c.text) && !(await p.evaluate(() => !!document.querySelector('[data-qty], .qty, .stepper'))) && /Your total/i.test(c.text) && /Review your journey|Complete this first/i.test(c.text), '');
note('H5 cart · not ready → REVIEW YOUR JOURNEY leads to the first missing item (step 03)', /wedding\.html/.test(c.review || ''), c.review);
/* CHANGE from the cart: the exact selector of that leg */
note('H6 cart · CHANGE on the flight → the flight stage on Your Journey (the fare selector)', c.lines.find((l) => l.id === 'mu9646').change === 'your-journey.html#s-mu9646', c.lines.find((l) => l.id === 'mu9646').change);
await go('cart.html'); await p.waitForTimeout(600);
await p.click('.cart-line[data-line="mu9646"] [data-change]'); await p.waitForTimeout(800);
note('H6 change · lands on Your Journey at the flight stage', /your-journey(\.html)?#s-mu9646/.test(p.url()) && !!(await p.$('#s-mu9646')), p.url());
await p.click('#flysel [data-cls="economy-flexible"]'); await p.waitForTimeout(700);
const T2b = await ticket('mu9646');
note('H6 change · Economy Flexible is the current selection: the ticket says the new class and carries a NEW pass reference; the journey total follows (560)', /Class Economy Flexible/i.test(T2b.text) && T2b.ref !== T2.ref && /^SYL-MU9646-/.test(T2b.ref) && (await txt('#tt')) === money(560), T2.ref + ' → ' + T2b.ref);
c = await cart();
sb = await sticky();
note('H6 cart · the flight line says Economy Flexible with the new reference; total 560 = sticky', /Economy Flexible/i.test(c.lines.find((l) => l.id === 'mu9646').text) && c.lines.find((l) => l.id === 'mu9646').ref === T2b.ref && c.total === money(560) && sb.total === money(560), c.total + ' / ' + sb.total);
/* REMOVE from the cart: the authoritative state, the badge, the sticky, the journey */
await go('cart.html'); await p.waitForTimeout(600);
await p.click('.cart-line[data-line="c86"] [data-remove]'); await p.waitForTimeout(900);
c = await cart();
const badge = await p.evaluate(() => (document.querySelector('[data-bag-badge]') || {}).textContent);
sb = await sticky();
note('H7 cart REMOVE · C86 leaves the bag: three lines, total 455 = sticky, badge 3', c.lines.length === 3 && !c.lines.some((l) => l.id === 'c86') && c.total === money(455) && sb.total === money(455) && badge === '3', c.total + ' / ' + sb.total + ' · badge ' + badge);
await go('your-journey.html');
const T3b = await ticket('c86');
note('H7 Your Journey after REMOVE · the C86 stage is open again (Select this travel), its ticket quiet without a pass; step 02 needs attention', T3b && !T3b.on && !T3b.qr && /Select this travel/i.test(await txt('#s-c86')) && (await p.evaluate(() => window.SIYL_GUEST.steps().find((s) => s.key === 'journey').state)) === 'attention', T3b.state);
await p.click('[data-choose-flat="c86"]'); await p.waitForTimeout(600);
note('H7 select again · C86 back at USD 105; total 455 + 105 = 560', (await ticket('c86')).on && (await txt('#tt')) === money(560), await txt('#tt'));
/* the transport page: the ticket beside the one decision */
await go('transport.html?id=c86');
const tp = await ticket('c86');
t = await body();
note('H8 transport page · the C86 ticket with its pass, USD 105 per person, Download travel pass; the ADD/REMOVE decision beside it', tp && tp.on && tp.qr && tp.dl && /USD 105 per person/i.test(t) && /Remove from Your Journey/i.test(await txt('#add')) && !/checkout|payment method|card details/i.test(t), tp.ref + ' · ' + (t.match(/USD 105[^.]{0,30}/) || [''])[0] + ' · ' + await txt('#add'));
await shot('H-transport-c86');
await go('transport.html?id=mu9646');
note('H8 transport page · the flight ticket says Economy Flexible (the chosen fare)', /Class Economy Flexible/i.test((await ticket('mu9646')).text), '');
/* the wedding, the seats, the pool */
await go('wedding.html');
for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(250); }
await p.click('#sangkhathan [data-off="yes"]'); await p.waitForTimeout(300);
await go('wedding-preparation.html'); await p.check('[data-ack]'); await p.waitForTimeout(300);
await go('wedding-preparation.html#seats'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
const plan = await p.evaluate(() => { const s = document.querySelector('[data-ev="dinner"] svg'); return { svg: s ? s.outerHTML : '', names: [...document.querySelectorAll('[data-ev="dinner"] .seat-name')].map((t) => t.textContent), pool: (document.querySelector('.p-poolnote') || {}).textContent || '', side: window.SIYL_SEATS.view().dinner.poolSide }; });
note('H9 the plan · RUN A = POOLSIDE from the server (default T); the pool drawn as water along run A, named; run B named opposite the pool; WEDDING DINNER · POOLSIDE', plan.side === 'T' && /SWIMMING POOL/.test(plan.svg) && /RUN A · 25 PLACES · POOLSIDE/.test(plan.svg) && /RUN B · 25 PLACES · OPPOSITE THE POOL/.test(plan.svg) && /WEDDING DINNER · POOLSIDE/.test(plan.svg) && /siyl-water/.test(plan.svg) && /Run A sits beside the swimming pool/.test(plan.pool) && !/to be confirmed/i.test(plan.pool), plan.pool);
const held = await p.evaluate(() => window.SIYL_SEATS.seatOf('dinner', window.SIYL_GUEST.me().guestId));
if (held) { await p.click('[data-seatmap="dinner"] [data-seat-change]'); await p.waitForTimeout(400); }
const runA = p.locator('[data-ev="dinner"] g[data-seat^="D-T-"]').first();
await runA.dispatchEvent('click'); await p.waitForTimeout(400);
const bar = await txt('.p-seatbar');
await p.click('[data-seat-confirm]'); await p.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await p.waitForTimeout(400);
const conf = await txt('.p-seatconf');
await p.click('[data-seat-continue]'); await p.waitForTimeout(500);
note('H9 a run-A seat · the words say Poolside on the bar, the confirmation and the card', /run A · Poolside/i.test(bar) && /run A · Poolside/i.test(conf) && /run A · Poolside/i.test(await txt('.p-wseats')), conf.slice(0, 140));
const names = await p.evaluate(() => [...document.querySelectorAll('[data-ev="dinner"] .seat-name')].map((t) => t.textContent));
note('H9 the plan · the held chair is named (her own says You; other guests see her first name — P4)', names.includes('You'), names.join(','));
await shot('H-seats-pool');
await go('about-you.html'); await p.click('[data-allergy="no"]'); await p.waitForTimeout(250); await p.check('#photo-ack'); await p.waitForTimeout(300);
/* gating and Review */
c = await cart(); sb = await sticky();
note('H10 cart · 01–05 complete → REVIEW YOUR JOURNEY leads to Review & Send; sticky VIEW the same', c.review === 'review.html' && sb.view === 'review.html', c.review + ' / ' + sb.view);
await go('review.html'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(600);
const rv = await p.evaluate(() => ({ total: document.getElementById('tt').textContent, passes: [...document.querySelectorAll('#items .p-pass')].map((x) => ({ leg: x.getAttribute('data-pass'), ref: (x.querySelector('.ref') || {}).textContent, qr: !!x.querySelector('svg.p-qr'), words: x.innerText.replace(/\s+/g, ' ') })), c86: [...document.querySelectorAll('#items .p-line')].map((l) => l.innerText.replace(/\s+/g, ' ')).find((s) => /C86/.test(s)) || '' }));
/* 100 + 155 (Economy Flexible) + 105 + 200 + 15 Sangkhathan = 575 */
note('H11 Review & Send · the four passes with their codes and references; C86 at USD 105; Review total = cart total = sticky (575)', rv.passes.length === 4 && rv.passes.every((x) => x.qr && /^SYL-/.test(x.ref) && /Selected · in your journey/i.test(x.words)) && /USD 105/.test(rv.c86) && rv.total === money(575) && c.total === money(575) && sb.total === money(575), rv.total + ' / ' + c.total + ' / ' + sb.total);
await p.click('#send'); await p.waitForFunction(() => document.getElementById('send').getAttribute('data-state') === 'sent' || (document.getElementById('err') || {}).textContent, null, { timeout: 20000 }); await p.waitForTimeout(700);
const after = await p.evaluate(() => ({ state: document.getElementById('send').getAttribute('data-state'), passes: [...document.querySelectorAll('#items .p-pass')].map((x) => x.innerText.replace(/\s+/g, ' ')) }));
note('H12 sent · every pass now says Sent to Guest Relations (the same references)', after.state === 'sent' && after.passes.length === 4 && after.passes.every((w) => /Sent to Guest Relations/i.test(w)) && after.passes.every((w, i) => w.includes(rv.passes[i].ref)), after.passes[0]);
await shot('H-review-sent');
const status = await (await fetch(API + '/status?invitation=INV-' + HOST)).json();
note('H12 the register holds the host\'s invitation', status.received === true, status.receivedAt);
await go('cart.html'); await p.waitForTimeout(800);
const bagWords = await p.evaluate(() => [...document.querySelectorAll('.p-pass')].map((x) => x.innerText));
note('H12 the bag says Sent too', bagWords.length === 4 && bagWords.every((w) => /Sent to Guest Relations/i.test(w)), bagWords.length);
/* desktop */
await p.setViewportSize({ width: 1280, height: 900 });
await go('your-journey.html'); note('D1 desktop · Your Journey tickets, no overflow', !(await overflow()) && (await ticket('c86')).qr, ''); await shot('D-journey');
await go('cart.html'); await p.waitForTimeout(600); note('D2 desktop · the cart, no overflow', !(await overflow()), ''); await shot('D-cart');
await go('wedding-preparation.html#seats'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500); await shot('D-seats-pool');
await go('transport.html?id=train'); note('D3 desktop · the transport page ticket, no overflow', !(await overflow()) && (await ticket('train')).qr, ''); await shot('D-transport-train');
await p.setViewportSize({ width: 390, height: 844 });
note('H13 no page errors', errs.length === 0, errs.join(' | '));
await leave();

/* ================================================================== PEGGY */
const P1 = await signIn(tok(GUEST));
const GN = P1.preferredName;
note('P1 one code = one guest · the guest alone · an empty bag, none of the host\'s passes', P1.guestId === GUEST && P1.hosts === false && (await p.evaluate(() => JSON.parse(localStorage.getItem('siyl.bag') || '[]').length)) === 0, GN);
await contact(GN.toLowerCase() + '.test@example.com', '+49 170 000 0001');
await go('your-journey.html'); await p.click('[data-choose-flat="c86"]'); await p.waitForTimeout(600);
const pT = await ticket('c86');
note('P2 the guest\'s C86 ticket · their own name, their own reference (not the host\'s), USD 105', new RegExp('Guest ' + GN, 'i').test(pT.text) && pT.ref !== T3.ref && /^SYL-C86-/.test(pT.ref) && /USD 105/.test(pT.text), pT.ref);
c = await cart();
sb = await sticky();
note('P3 the guest\'s bag · one line, their pass, USD 105 = sticky', c.lines.length === 1 && c.lines[0].id === 'c86' && c.lines[0].ref === pT.ref && c.total === money(105) && sb.total === money(105), c.total + ' / ' + sb.total);
await declineOthers(['c86']);
await go('wedding.html');
for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(250); }
await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(300);
await go('wedding-preparation.html#seats'); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(500);
const pv = await p.evaluate(() => ({ svg: (document.querySelector('[data-ev="dinner"] svg') || {}).outerHTML || '', names: [...document.querySelectorAll('[data-ev="dinner"] .seat-name')].map((t) => t.textContent) }));
note('P4 the plan for a guest · the pool along run A, the host\'s first name on their run-A chair', /RUN A · 25 PLACES · POOLSIDE/.test(pv.svg) && pv.names.includes(HN), pv.names.join(','));
await go('cart.html'); await p.click('.cart-line[data-line="c86"] [data-remove]'); await p.waitForTimeout(900);
note('P5 REMOVE · the bag empties', /Your bag is empty/i.test(await body()), '');
for (const w of [320, 375, 430]) {
  await p.setViewportSize({ width: w, height: 844 });
  await p.evaluate(() => { window.SIYL_BAG.put(window.SIYL_PRICE.items('train')[0]); window.SIYL_BAG.put(window.SIYL_PRICE.items('mu9646', 'business')[0]); });
  for (const f of ['your-journey.html', 'cart.html', 'transport.html?id=mu9646', 'review.html']) { await go(f); if (await overflow()) note('W ' + w + ' ' + f, false, 'horizontal overflow'); }
  note('W ' + w + ' · no horizontal overflow with tickets on the four surfaces', !R.some((x) => x.id.startsWith('W ' + w + ' ') && !x.ok), '');
}
await p.setViewportSize({ width: 390, height: 844 });
await p.evaluate(() => window.SIYL_BAG.set([]));
note('Z no page errors across both identities', errs.length === 0, errs.join(' | ').slice(0, 300));
await leave();
await b.close();
const pass = R.filter((x) => x.ok).length;
console.log('\n' + pass + '/' + R.length + ' checks passed' + (errs.length ? ' · page errors: ' + errs.length : ''));
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R, errors: errs }, null, 2));
process.exit(pass === R.length ? 0 : 1);
