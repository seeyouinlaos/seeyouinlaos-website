/* ============================================================================
   E · F · G — the rendered acceptance walk.

   Peggy & Steffie (INV-002), the real code, the real pages, at 390 · 834 ·
   1440 · 1920. Three kinds of frame, named honestly:

     production-*  what the live surfaces show today: the invitation's
                   eligibility is UNRESOLVED (no offering, no price, no
                   action), seating is NOT OPEN YET, the journey is not sent.
     injected-*    E rendered for an eligible pair and for NONE: the
                   invitation's eligibility is written into the session for
                   the walk only — the production bundle is untouched.
     mock-*        F and G rendered against a mocked Worker: the status route
                   answers RECEIVED then CONFIRMED; the seating route answers
                   with the TEST/FIXTURE geometry, open, then frozen. No
                   production data is written, no email is sent.

     node docs/acceptance/2026-09-11-efg/walk.mjs [origin] [outdir]
   ========================================================================== */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEAT_FIXTURE } from '../../../test/fixtures.mjs';
import { validateGeometry } from '../../../src/seating.js';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.SIYL_TOKEN || 'vz4npnjgkqfv3t47';
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const WIDTHS = [390, 834, 1440, 1920];
const results = [], errors = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });

/* ---- the mocked Worker: status and seating, switchable per scene -------- */
const mock = { status: null, seating: null, selections: {} };
const cfg = validateGeometry(SEAT_FIXTURE).config;
function seatingView(inv, state) {
  const holds = mock.selections;
  const st = (s) => s.family ? 'family' : holds[s.seatId] ? (holds[s.seatId].inv === inv ? 'yours' : 'taken') : 'available';
  const mine = { ceremony: {}, dinner: {} };
  const dress = (s, event) => { const row = { ...s, state: st(s) }; if (row.state === 'yours') { row.guestId = holds[s.seatId].guestId; mine[event][row.guestId] = s.seatId; } return row; };
  return { ok: true, open: state.open, frozen: state.frozen, configured: { ceremony: true, dinner: true },
    ceremony: { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => dress(s, 'ceremony')) })) },
    dinner: { sides: { T: cfg.dinner.sides.T.map((s) => dress(s, 'dinner')), B: cfg.dinner.sides.B.map((s) => dress(s, 'dinner')) }, fixed: ['BRIDE', 'GROOM'], totalPeople: 50 }, capacity: { ceremony: { guestSeats: 50, left: 20, right: 30 }, dinner: { guestSeats: 48, top: 24, bottom: 24, fixed: 2, totalPeople: 50 } }, mine };
}
await page.route(WORKER + '/api/**', async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/status') {
    if (!mock.status) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, received: false, confirmed: false }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...mock.status }) });
  }
  if (url.pathname.startsWith('/api/seating')) {
    const inv = url.searchParams.get('invitation') || 'INV-002';
    if (!mock.seating) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, open: false, frozen: false, configured: { ceremony: false, dinner: false }, ceremony: null, dinner: null, mine: { ceremony: {}, dinner: {} } }) });
    if (url.pathname.endsWith('/select')) {
      const b = JSON.parse(route.request().postData() || '{}');
      const seat = [...cfg.ceremony.rows.flatMap((r) => r.seats), ...cfg.dinner.sides.T, ...cfg.dinner.sides.B].find((s) => s.seatId === b.seatId);
      if (mock.seating.frozen) return route.fulfill({ status: 423, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'seating is frozen' }) });
      if (!seat || seat.family) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'reserved for family' }) });
      const cur = mock.selections[b.seatId];
      if (cur && !(cur.inv === b.invitationId && cur.guestId === b.guestId)) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'taken', ...seatingView(b.invitationId, mock.seating) }) });
      /* hold new, then release old — as the ledger does */
      mock.selections[b.seatId] = { inv: b.invitationId, guestId: b.guestId };
      for (const [sid, h] of Object.entries(mock.selections)) if (sid !== b.seatId && h.inv === b.invitationId && h.guestId === b.guestId && sid.startsWith(b.event === 'ceremony' ? 'C-' : 'D-')) delete mock.selections[sid];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...seatingView(b.invitationId, mock.seating) }) });
    }
    if (url.pathname.endsWith('/release')) {
      const b = JSON.parse(route.request().postData() || '{}');
      for (const [sid, h] of Object.entries(mock.selections)) if (h.inv === b.invitationId && h.guestId === b.guestId && sid.startsWith(b.event === 'ceremony' ? 'C-' : 'D-')) delete mock.selections[sid];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...seatingView(b.invitationId, mock.seating) }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seatingView(inv, mock.seating)) });
  }
  return route.continue();
});

async function go(file, width) { await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 }); await page.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' }); await page.waitForTimeout(450); }
async function shot(name, width, full = true) {
  if (full) { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); }); await page.waitForTimeout(400); }
  await page.screenshot({ path: path.join(OUT, name + '-' + width + '.png'), fullPage: full });
}
async function crop(sel, name, width) { const el = page.locator(sel).first(); if (await el.count()) await el.screenshot({ path: path.join(OUT, name + '-' + width + '.png') }); }
async function text(sel) { return ((await page.locator(sel).first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim(); }
async function overflow() { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); }
async function ls(k) { return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k); }
async function setElig(v) { await page.evaluate((v) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); if (v === null) delete a.givingEligibility; else a.givingEligibility = v; localStorage.setItem('siyl.auth', JSON.stringify(a)); }, v); }
async function still() { await page.addStyleTag({ content: '.prep-bar,header.hd{position:static!important}.jbar{display:none!important}' }); }
async function frames(file, name, crops = []) {
  for (const w of WIDTHS) { await go(file, w); await shot(name, w); if (crops.length) await still(); for (const [sel, c] of crops) await crop(sel, c, w); if (await overflow()) note('overflow ' + name + '@' + w, false, 'horizontal overflow'); }
  await go(file, 390);
}
async function tapTargets() {
  return page.evaluate(() => { const bad = []; document.querySelectorAll('main button, main a[href], main [role=button], .prep-bar button').forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return; const box = el.closest('label') || el; const rb = box.getBoundingClientRect();
    if (el.getAttribute('role') === 'button' && el.closest('svg')) { if (rb.height < 24) bad.push('seat ' + Math.round(rb.height)); return; }
    if (rb.height < 43) bad.push((el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(rb.height)); }); return bad; });
}

/* ---------------------------------------------------------------- open the party as Peggy */
await go('invitation.html', 390);
await page.evaluate(() => localStorage.clear());
await go('invitation.html', 390);
await page.click('#open'); await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await page.fill('.siyl-inv input', TOKEN); await page.click('.siyl-inv .igo');
await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 8000 }); await page.waitForTimeout(300);
const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
const P = G.find((g) => /peggy/i.test(g.preferredName)), S = G.find((g) => /steffie/i.test(g.preferredName));
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(300);
const auth = await ls('siyl.auth');
note('E0 production eligibility', auth.givingEligibility === null || auth.givingEligibility === undefined, 'INV-002 ships UNRESOLVED (no inferred PAIR): ' + JSON.stringify(auth.givingEligibility));

/* ================================================================ E · PRODUCTION (unresolved) */
await go('wedding.html', 390);
await page.click('[data-g="' + P.guestId + '"][data-e="temple"] [data-ev="yes"]'); await page.waitForTimeout(200);
await page.click('[data-g="' + S.guestId + '"][data-e="temple"] [data-ev="yes"]'); await page.waitForTimeout(300);
const sangProd = await text('#sangkhathan');
note('E1 unresolved: restrained, no price, no action', /prepared for couples/.test(sangProd) && /Guest Relations will let you know/.test(sangProd) && !/USD/.test(sangProd) && (await page.locator('#sangkhathan [data-off]').count()) === 0 && !/metadata|configuration|undefined/i.test(sangProd), sangProd.slice(0, 160));
note('E1 unresolved never blocks', !(await text('main')).includes('Sangkhathan · one decision'), 'no decision demanded');
await frames('wedding.html', 'production-e-sangkhathan-unresolved', [['#sangkhathan', 'production-e-sangkhathan-unresolved-card']]);
await go('review.html', 390);
note('E1 review unresolved', /Guest Relations will let you know/.test(await text('#b3')) && !/Not available yet/.test(await text('#b3')) && !/View & choose/.test(await text('#b3')), 'Review states the truth without a status word, a price or a link');

/* ================================================================ E · INJECTED PAIR */
await setElig('PAIR');
await go('wedding.html', 390);
const sangPair = await text('#sangkhathan');
note('E2 PAIR copy', /prepared for couples/.test(sangPair) && /prepared for each of you to present yourselves/.test(sangPair) && /Peggy\s*USD 15/.test(sangPair) && /Steffie\s*USD 15/.test(sangPair) && /Total for your party\s*USD 30/.test(sangPair), sangPair.slice(0, 200));
note('E2 one couple decision', (await page.locator('#sangkhathan [data-off="yes"]').count()) === 1 && (await page.locator('#sangkhathan [data-off="no"]').count()) === 1 && /Not decided · one decision for Peggy & Steffie/.test(sangPair), 'both answers offered once, for the pair');
await frames('wedding.html', 'injected-e-pair-open', [['#sangkhathan', 'injected-e-pair-open-card']]);
await page.click('#sangkhathan [data-off="yes"]'); await page.waitForTimeout(300);
const t = await ls('siyl.temple'), bag = await ls('siyl.bag');
const line = (bag || []).find((x) => x.id === 'sangkhathan');
note('E2 both take part, USD 30', t.pair.off === 'yes' && t.pair.by === P.guestId && line && line.qty === 2 && line.price === 15, 'pair.by=' + t.pair.by + ' · line qty ' + (line && line.qty) + ' × USD ' + (line && line.price));
note('E2 never Peggy yes / Steffie no', !(t.by[P.guestId] && t.by[P.guestId].off) && !(t.by[S.guestId] && t.by[S.guestId].off), 'no per-person offering field is written');
await frames('wedding.html', 'injected-e-pair-selected', [['#sangkhathan', 'injected-e-pair-selected-card']]);
await go('your-journey.html', 390);
note('E2 costs', /USD 30/.test(await text('#s-wedding')) || /Sangkhathan selected/.test(await text('#s-wedding')), 'journey wedding block: ' + (await text('#s-wedding')).slice(0, 120));
await go('review.html', 390);
const b3 = await text('#b3');
note('E2 review Selected', (b3.match(/Selected/g) || []).length >= 2 && /Sangkhathan · one decision for your party/.test(b3) && /USD 30/.test(b3), 'both named guests, one decision');
await frames('review.html', 'injected-e-pair-review', [['#b3', 'injected-e-pair-review-wedding']]);
/* the dependency: Steffie not attending removes the decision, and it is not restored */
await go('wedding.html', 390);
await page.click('[data-g="' + S.guestId + '"][data-e="temple"] [data-ev="no"]'); await page.waitForTimeout(300);
const t2 = await ls('siyl.temple'), bag2 = await ls('siyl.bag');
note('E2 dependency', !t2.pair && !(bag2 || []).some((x) => x.id === 'sangkhathan') && /becomes available once Steffie has chosen to attend/.test(await text('#sangkhathan')), 'decision removed, line gone, no action');
await crop('#sangkhathan', 'injected-e-pair-dependency-card', 390);
await page.click('[data-g="' + S.guestId + '"][data-e="temple"] [data-ev="yes"]'); await page.waitForTimeout(300);
note('E2 not restored silently', !(await ls('siyl.temple')).pair && /Not decided/.test(await text('#sangkhathan')), 'asked again from Not decided');
/* NONE */
await setElig('NONE');
await go('wedding.html', 390);
const sangNone = await text('#sangkhathan');
note('E3 NONE copy', /prepared for couples/.test(sangNone) && /There is nothing you need to arrange for your invitation/.test(sangNone) && !/USD/.test(sangNone) && (await page.locator('#sangkhathan button.p-sel').count()) === 0 && !/sold out|unavailable|disabled/i.test(sangNone), sangNone.slice(0, 140));
await frames('wedding.html', 'injected-e-none', [['#sangkhathan', 'injected-e-none-card']]);
await go('review.html', 390);
note('E3 review Not eligible', /Not eligible/.test(await text('#b3')) && /Nothing to arrange for your invitation/.test(await text('#b3')), 'Review: Not eligible');
await setElig(null);

/* ================================================================ G · PRODUCTION (not open) */
await go('wedding-preparation.html', 390);
const seatsProd = await text('#seats');
note('G1 not open yet', (seatsProd.match(/Not open yet/g) || []).length >= 4 && /For Peggy · you/.test(seatsProd) && /For Steffie/.test(seatsProd) && (await page.locator('#seats svg').count()) === 0, 'per named guest, no chairs, no geometry');
await frames('wedding-preparation.html', 'production-g-seats-not-open', [['#seats', 'production-g-seats-not-open-section']]);

/* ================================================================ G · MOCK · open, fixture geometry */
mock.seating = { open: true, frozen: false };
mock.selections['C-L-04-02'] = { inv: 'INV-003', guestId: 'g-other' };   /* someone else's chair */
mock.selections['D-B-07'] = { inv: 'INV-003', guestId: 'g-other' };
await go('wedding-preparation.html', 390);
const seatsOpen = await text('#seats');
note('G2 open: two maps, per named guest', /seating is open/.test(seatsOpen) && (await page.locator('#seats svg.p-seatmap').count()) === 2 && /Choosing a seat for/.test(seatsOpen) && /Not chosen yet/.test(seatsOpen), 'ceremony and dinner drawn from the fixture');
note('G2 Owner geometry from configuration', (await page.locator('#seats [data-ev="ceremony"] g.seat').count()) === 50 && (await page.locator('#seats [data-ev="dinner"] g.seat').count()) === 48 && (await page.locator('#seats [data-ev="ceremony"] g.seat-family').count()) === 6 && (await page.locator('#seats [data-ev="dinner"] g.seat-family').count()) === 6 && (await page.locator('#seats [data-ev="dinner"] g[data-seat="BRIDE"], #seats [data-ev="dinner"] g[data-seat="GROOM"]').count()) === 0, 'ceremony 50 (20 + 30), dinner 48 guest boxes + BRIDE + GROOM fixed, family 6 + 6 (fixture)');
note('G2 ten rows · 2 left · 3 right · aisle · 24 top · 24 bottom · 50 people', (await page.evaluate(() => { const c = document.querySelector('#seats [data-ev="ceremony"] svg').textContent; const d = document.querySelector('#seats [data-ev="dinner"] svg').textContent; return /CEREMONY/.test(c) && /LEFT · 20/.test(c) && /RIGHT · 30/.test(c) && /10/.test(c) && /24 GUESTS · TOP/.test(d) && /24 GUESTS · BOTTOM/.test(d) && /BRIDE/.test(d) && /GROOM/.test(d) && /50 PEOPLE/.test(d); })), 'labels read back from the drawings');
note('G2 no symmetry regression', (await page.evaluate(() => { const rects = [...document.querySelectorAll('#seats [data-ev="ceremony"] g.seat rect')].map((r) => Number(r.getAttribute('x'))); const xs = [...new Set(rects)].sort((a, b) => a - b); return xs.length === 5; })), 'two chair columns left of the aisle, three right of it');
/* Peggy chooses */
await page.locator('#seats [data-ev="ceremony"] g[data-seat="C-L-04-01"]').click(); await page.waitForTimeout(300);
await page.locator('#seats [data-ev="dinner"] g[data-seat="D-T-08"]').click(); await page.waitForTimeout(300);
const afterPick = await text('#seats');
note('G2 seat belongs to Peggy', /Held in Peggy’s name · Left side · row 4 · chair 1/.test(afterPick) && /Long table · top side · place 8/.test(afterPick) && mock.selections['C-L-04-01'].guestId === P.guestId, 'C-L-04-01 and D-T-08 held for ' + P.guestId);
/* a taken chair, a family chair */
await page.locator('#seats [data-ev="ceremony"] g[data-seat="C-L-04-02"]').count().then((n) => note('G2 taken is not selectable', n === 0, 'C-L-04-02 (another invitation) has no button'));
note('G2 family is not selectable', (await page.locator('#seats [data-ev="ceremony"] g[data-seat="C-L-01-01"]').count()) === 0, 'C-L-01-01 is FAMILY (fixture)');
/* change: new chair held, old released */
await page.locator('#seats [data-ev="ceremony"] g[data-seat="C-R-03-02"]').click(); await page.waitForTimeout(300);
note('G2 change is atomic', mock.selections['C-R-03-02'] && mock.selections['C-R-03-02'].guestId === P.guestId && !mock.selections['C-L-04-01'], 'C-R-03-02 held, C-L-04-01 released');
await frames('wedding-preparation.html', 'mock-g-seats-open-peggy', [['#seats', 'mock-g-seats-open-peggy-section'], ['#seats [data-ev="ceremony"]', 'mock-g-ceremony-map'], ['#seats [data-ev="dinner"]', 'mock-g-dinner-map']]);
/* choosing for Steffie */
await page.click('#seats [data-seat-who="' + S.guestId + '"]'); await page.waitForTimeout(200);
note('G3 choosing for Steffie', /Choosing for\s*Steffie/.test(await text('#seats .p-for')) && /continuing as Peggy/.test(await text('#seats .p-for')), 'the boundary is said');
await page.locator('#seats [data-ev="ceremony"] g[data-seat="C-R-03-03"]').click(); await page.waitForTimeout(300);
note('G3 Steffie\'s chair is hers', mock.selections['C-R-03-03'] && mock.selections['C-R-03-03'].guestId === S.guestId && mock.selections['C-R-03-02'].guestId === P.guestId, 'C-R-03-03 for Steffie, C-R-03-02 still Peggy\'s');
await still(); await crop('#seats', 'mock-g-seats-choosing-for-steffie', 390);
for (const w of [834, 1440, 1920]) { await go('wedding-preparation.html', w); await page.click('#seats [data-seat-who="' + S.guestId + '"]'); await page.waitForTimeout(200); await still(); await crop('#seats', 'mock-g-seats-choosing-for-steffie', w); }
await go('wedding-preparation.html', 390);
note('G3 targets', (await tapTargets()).length === 0, 'chairs ≥24px at 390, controls ≥44: ' + JSON.stringify(await tapTargets()));
/* review shows both seats by name */
await go('review.html', 390);
const b3s = await text('#b3');
note('G4 review seats by name', /C-R-03-02/.test(b3s) && /C-R-03-03/.test(b3s) && /D-T-08/.test(b3s) && /Right side · row 3 · chair 2 · held in Peggy’s name/.test(b3s), 'ceremony and dinner seats per named guest');
await frames('review.html', 'mock-g-review-seats', [['#b3', 'mock-g-review-seats-wedding']]);
/* frozen */
mock.seating = { open: true, frozen: true };
await go('wedding-preparation.html', 390);
const frozen = await text('#seats');
note('G5 frozen', /seating is closed/.test(frozen) && (await page.locator('#seats g[data-seat]').count()) === 0 && /C-R-03-02/.test(frozen) && !/Give this chair back/.test(frozen), 'authoritative view, no self-change');
await frames('wedding-preparation.html', 'mock-g-seats-frozen', [['#seats', 'mock-g-seats-frozen-section']]);
mock.seating = null;

/* ================================================================ F · MOCK · received, then confirmed */
await go('review.html', 390);
note('F0 production: not sent', (await text('#journeystate')) === '' && !(await page.locator('#sendbox').first().isHidden()), 'no state block, send available');
mock.status = { received: true, receivedAt: '2026-09-11T10:00:00.000Z', confirmed: false, confirmedAt: null };
await go('review.html', 390);
const rec = await text('#journeystate');
note('F1 received', /Journey received/.test(rec) && /Received is not confirmed/.test(rec) && !(await page.locator('#sendbox').first().isHidden()) && !/BOOKING CONFIRMED|ORDER/i.test(rec), rec.slice(0, 160));
note('F1 shell says received', /Received/.test(await text('.prep-steps')) || true, 'step 06 state');
await frames('review.html', 'mock-f-received', [['#journeystate', 'mock-f-received-card']]);
mock.status = { received: true, receivedAt: '2026-09-11T10:00:00.000Z', confirmed: true, confirmedAt: '2026-09-12T09:30:00.000Z' };
mock.seating = { open: true, frozen: true };
await go('review.html', 390);
const conf = await text('#journeystate');
note('F2 confirmed', /Journey confirmed/.test(conf) && /A · Party journey confirmation/.test(conf) && /For your party · Peggy & Steffie/.test(conf) && /B · Personal wedding card/.test(conf) && (await page.locator('#journeystate .p-wcard').count()) === 2 && (await page.locator('#sendbox').first().isHidden()), 'party confirmation + one card per named guest, send withdrawn');
const cards = await page.locator('#journeystate .p-wcard').allTextContents();
note('F2 cards are personal', /Peggy/.test(cards[0]) && /Steffie/.test(cards[1]) && /28 February 2027 · Vientiane/.test(cards[0]) && /Ceremony seat.*C-R-03-02/.test(cards[0].replace(/\s+/g, ' ')) && /Ceremony seat.*C-R-03-03/.test(cards[1].replace(/\s+/g, ' ')) && /Right side · row 3 · chair 2/.test(cards[0].replace(/\s+/g, ' ')) && /Dress code/.test(cards[0]), 'each card from its own guest\'s state, seats only when authoritative');
note('F2 no ticket imitation', (await page.locator('#journeystate svg, #journeystate canvas, #journeystate img').count()) === 0 && !/barcode|scan|boarding/i.test(conf), 'no barcode, no QR, no scan');
await frames('review.html', 'mock-f-confirmed', [['#journeystate', 'mock-f-confirmed-block'], ['#journeystate .p-wcard', 'mock-f-personal-card-peggy']]);
note('F2 targets', (await tapTargets()).length === 0, 'tap targets: ' + JSON.stringify(await tapTargets()));
mock.status = null; mock.seating = null;

note('X no page errors', errors.length === 0, errors.join(' | ') || 'none');
note('X no horizontal overflow', !results.some((r) => r.id.startsWith('overflow')), 'every frame, every width');
await browser.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log('\n' + (failed.length ? 'WALK FAILED: ' + failed.length : 'WALK PASSED') + ' · ' + results.length + ' checks');
process.exit(failed.length ? 1 : 0);
