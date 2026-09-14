/* 002 · SEATING UX UPGRADE — the browser walk (14 Sep 2026).
   Local or production origin with the real encrypted bundle (INV-002 and
   INV-001 codes from the private register; never printed). The Worker's
   seating route is MOCKED on the accepted geometry: two-step booking, the
   sticky summary, the confirmation, the change of seat, the refused race,
   SWITCH isolation, frozen, the hosts, the downloaded PDF (read back with
   pdftotext when present), keyboard, reduced motion — at 320 / 375 / 390 /
   393 / 430 / 834 / 1440. Nothing is written to production.
     node docs/acceptance/2026-09-14-seating-ux/seating-ux-walk.mjs <origin> [outdir] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateGeometry } from '../../../src/seating.js';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const T2 = tok('INV-002'), T1 = tok('INV-001');
const cfg = validateGeometry(JSON.parse(fs.readFileSync(new URL('../2026-09-13-owner-decisions/seating-geometry.json', import.meta.url), 'utf8'))).config;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await chromium.launch();
let pdftotext = null; try { pdftotext = execFileSync('which', ['pdftotext']).toString().trim(); } catch (e) {}

/* the mocked ledger */
let holds = {}, frozen = false, slow = 0;
const view = (inv) => { const mine = { ceremony: {}, dinner: {} };
  const dress = (s, ev) => { const h = holds[ev + ':' + s.seatId]; const row = { seatId: s.seatId, family: false, state: h ? (h.inv === inv ? 'yours' : 'taken') : 'available' }; if (row.state === 'yours') { row.guestId = h.guestId; row.allocated = h.state === 'allocated'; mine[ev][h.guestId] = s.seatId; } return row; };
  return { ok: true, open: true, frozen, configured: { ceremony: true, dinner: true }, mine,
    ceremony: { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => dress(s, 'ceremony')) })), fixed: ['BRIDE', 'GROOM'] },
    dinner: { sides: { T: cfg.dinner.sides.T.map((s) => dress(s, 'dinner')), B: cfg.dinner.sides.B.map((s) => dress(s, 'dinner')) }, totalPeople: 50 } }; };
async function wire(page) {
  await page.route(WORKER + '/api/**', async (route) => {
    const url = new URL(route.request().url()), json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/api/status') return json(200, { ok: true, received: false, confirmed: false });
    if (url.pathname.startsWith('/api/inventory')) return json(200, { ok: true, windows: {} });
    if (url.pathname.startsWith('/api/seating')) { const inv = url.searchParams.get('invitation') || '';
      if (url.pathname.endsWith('/select')) { const q = JSON.parse(route.request().postData() || '{}'); if (slow) await new Promise((r) => setTimeout(r, slow)); if (frozen) return json(423, { ok: false, error: 'seating is frozen' }); const prev = Object.keys(holds).find((kk) => kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId); if (prev && holds[prev].state === 'allocated') return json(423, { ok: false, error: 'allocated by Guest Relations' }); const k = q.event + ':' + q.seatId; const cur = holds[k]; if (cur && !(cur.inv === q.invitationId && cur.guestId === q.guestId)) return json(409, { ok: false, error: 'taken', ...view(q.invitationId) }); for (const kk of Object.keys(holds)) if (kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId) delete holds[kk]; holds[k] = { inv: q.invitationId, guestId: q.guestId }; return json(200, { ok: true, ...view(q.invitationId) }); }
      if (url.pathname.endsWith('/release')) { const q = JSON.parse(route.request().postData() || '{}'); const prev = Object.keys(holds).find((kk) => kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId); if (prev && holds[prev].state === 'allocated') return json(423, { ok: false, error: 'allocated by Guest Relations' }); for (const kk of Object.keys(holds)) if (kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId) delete holds[kk]; return json(200, { ok: true, ...view(q.invitationId) }); }
      return json(200, view(inv)); }
    return json(404, { ok: false }); });
}
const signIn = async (p, token, who) => {
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear());
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
  await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
  const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
  const me = g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(400); return g;
};
const txt = async (p, sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const shot = async (p, name) => { if (OUT) await p.screenshot({ path: path.join(OUT, name + '.png') }); };
const pdfText = async (dl, name) => { if (!OUT) return ''; const f = path.join(OUT, name); await dl.saveAs(f); const head = fs.readFileSync(f).slice(0, 8).toString('latin1'); if (!pdftotext) return head; return head + '\n' + execFileSync(pdftotext, ['-layout', f, '-']).toString(); };

const WIDTHS = [320, 375, 390, 393, 430, 834, 1440];
for (const W of WIDTHS) {
  holds = {}; frozen = false;
  const mobile = W < 700;
  const ctx = await b.newContext({ viewport: { width: W, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true });
  const p = await ctx.newPage(); await wire(p);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Access to fetch|ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 120)); });
  const G = await signIn(p, T2, 'Peggy'); const PEG = G.guests.find((x) => /peggy/i.test(x.preferredName)), STE = G.guests.find((x) => /steffie/i.test(x.preferredName));
  await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);

  /* 1 · the room: physical plan, labels, legend, states in words, no raw ids, no horizontal page scroll */
  const room = await p.evaluate(() => {
    const c = document.querySelector('[data-ev="ceremony"]'), d = document.querySelector('[data-ev="dinner"]');
    const arias = [...c.querySelectorAll('g.seat')].map((g) => g.getAttribute('aria-label'));
    return { chairs: c.querySelectorAll('g.seat').length, dchairs: d.querySelectorAll('g.seat').length, buttons: c.querySelectorAll('g.seat[role="button"]').length,
      front: /CEREMONY · FRONT/.test(c.textContent), bride: !!c.querySelector('g.fixed'), aisle: /AISLE/.test(c.textContent), cols: ['A', 'B', 'D', 'E', 'F'].every((l) => c.textContent.includes('>' + l + '<') || true),
      labels: [...c.querySelectorAll('g.seat')].map((g) => g.dataset.label), aria: arias.slice(0, 3), c4: arias.some((a) => /\bC\d/.test(a)), raw: /C-[LR]-\d\d|D-[TB]-\d\d/.test(document.getElementById('seatbox').innerText),
      legend: [...c.closest('.p-seatbox').querySelectorAll('.p-seatlegend li')].map((l) => l.textContent.trim()), table: /ONE LONG TABLE · 50 PLACES/.test(d.textContent), runs: /RUN A · 25 PLACES/.test(d.textContent) && /RUN B · 25 PLACES/.test(d.textContent),
      wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, progress: [...document.querySelectorAll('[data-seat-progress]')].map((r) => r.dataset.seatProgress) };
  });
  const labelsOk = new Set(room.labels).size === 50 && room.labels.every((l) => /^[ABDEF](10|[1-9])$/.test(l));
  note('1 room@' + W + ' ceremony 50 chairs A/B|aisle|D/E/F × 1–10, front + BRIDE/GROOM, dinner 25+25, legend in words, no raw id, no page overflow',
    room.chairs === 50 && room.dchairs === 50 && room.buttons === 50 && room.front && room.bride && room.aisle && labelsOk && !room.c4 && !room.raw && room.table && room.runs && !room.wide && room.progress.join('|') === '0/2|0/2' && room.legend.join('|') === 'Available|Selected by you|Your seat|Steffie’s seat|Unavailable' && room.aria[0] === 'Ceremony seat A1, available', JSON.stringify({ ...room, labels: undefined }));
  await shot(p, W + '-01-plan');

  /* 2 · tap → summary (nothing held) → CONFIRM → confirmation; the bar sits at the bottom, clears the safe area, and the chair is not left under it */
  await p.locator('[data-ev="ceremony"] g[data-seat="C-R-04-02"]').click(); await p.waitForTimeout(500);
  const bar = await p.evaluate(() => { const bar = document.querySelector('.p-seatbar.on'), r = bar && bar.getBoundingClientRect(), sel = document.querySelector('[data-ev="ceremony"] g.seat-selected'), sr = sel && sel.getBoundingClientRect();
    return { on: !!bar, text: bar && bar.innerText.replace(/\s+/g, ' '), bottom: r && Math.round(window.innerHeight - r.bottom), top: r && r.top, live: bar && bar.getAttribute('aria-live'), region: bar && bar.getAttribute('role'), pad: parseFloat(getComputedStyle(document.body).paddingBottom), jbar: !!document.querySelector('.jbar.on') && getComputedStyle(document.querySelector('.jbar')).display !== 'none', chairClear: sr && sr.bottom <= r.top + 1, selAria: sel && sel.getAttribute('aria-label') }; });
  note('2 summary@' + W + ' tap = SELECTED BY YOU, nothing held; the summary names guest · event · Seat E4 with CONFIRM; fixed to the bottom, the journey bar steps aside, the chair stays clear of it',
    bar.on && /Booking summary/i.test(bar.text) && /Peggy/.test(bar.text) && /Temple Ceremony/.test(bar.text) && /Seat E4/i.test(bar.text) && /Confirm seat/i.test(bar.text) && /Cancel/i.test(bar.text) && bar.bottom === 0 && bar.live === 'polite' && bar.region === 'region' && bar.pad >= 100 && !bar.jbar && bar.chairClear && bar.selAria === 'Ceremony seat E4, selected' && !holds['ceremony:C-R-04-02'], JSON.stringify(bar));
  await shot(p, W + '-02-summary');
  await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(800);
  const conf = await p.evaluate(() => { const c = document.querySelector('[data-seatmap="ceremony"][data-state="confirmed"]'); return { text: c && c.innerText.replace(/\s+/g, ' '), focused: document.activeElement === c, bar: !!document.querySelector('.p-seatbar.on'), pad: parseFloat(getComputedStyle(document.body).paddingBottom) }; });
  note('3 confirmed@' + W + ' SEAT CONFIRMED · guest · event · date · venue · Seat E4 · reference · CONTINUE + DOWNLOAD; the summary is gone; focus on the confirmation',
    holds['ceremony:C-R-04-02'] && holds['ceremony:C-R-04-02'].guestId === PEG.guestId && /SEAT CONFIRMED/i.test(conf.text) && /Peggy Berger/.test(conf.text) && /Peggy & Steffie/.test(conf.text) && /Temple Ceremony/.test(conf.text) && /Sunday, 28 February 2027/.test(conf.text) && /Wat Ong Teu, Vientiane/.test(conf.text) && /\bE4\b/.test(conf.text) && /SYL-TC-E4-[23456789BCDFGHJKMNPQRSTVWXZ]{4}/.test(conf.text) && /Confirmed/.test(conf.text) && /Continue/i.test(conf.text) && /Download seat confirmation/i.test(conf.text) && !conf.bar && conf.focused, (conf.text || '').slice(0, 220));
  await shot(p, W + '-03-confirmed');

  /* 4 · the download: a real PDF from a fresh read of the ledger */
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.locator('[data-seatmap="ceremony"] [data-seat-pass="ceremony"]').click()]);
  const pt = dl ? await pdfText(dl, W + '-ceremony-peggy.pdf') : '';
  note('4 pdf@' + W + ' a PDF file downloads: ' + (dl ? dl.suggestedFilename() : 'none') + (pdftotext ? ' · text read back' : ' · (no pdftotext: header only)'),
    !!dl && dl.suggestedFilename() === 'see-you-in-laos-tc-seat-peggy.pdf' && /^%PDF-1\.4/.test(pt) && (!pdftotext || (/SEAT CONFIRMATION/.test(pt) && /Peggy Berger/.test(pt) && /Peggy & Steffie/.test(pt) && /INV-002/.test(pt) && /Temple Ceremony/.test(pt) && /Sunday, 28 February 2027/.test(pt) && /Wat Ong Teu, Vientiane/.test(pt) && /\bE4\b/.test(pt) && /SYL-TC-E4-/.test(pt) && /CONFIRMED/.test(pt) && !/C-R-04-02|QR|barcode|USD/.test(pt))), pt.replace(/\s+/g, ' ').slice(0, 200));

  /* 5 · CONTINUE moves on to the dinner; the ceremony card is the booked state with CHANGE SEAT and the plan showing YOUR SEAT */
  await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(700);
  const after = await p.evaluate(() => { const c = document.querySelector('[data-seatmap="ceremony"]'), d = document.querySelector('[data-seatmap="dinner"]'); const r = d.getBoundingClientRect();
    return { state: c.dataset.state, label: c.querySelector('.p-seatlabel').dataset.seatLabel, yours: c.querySelector('[data-ev="ceremony"] g.seat-yours')?.getAttribute('aria-label'), buttons: c.querySelectorAll('g.seat[role="button"]').length, change: !!c.querySelector('[data-seat-change="ceremony"]'), give: !!c.querySelector('[data-seat-give="ceremony"]'), dinnerNear: r.top >= -40 && r.top < window.innerHeight * 0.6, progress: [...document.querySelectorAll('[data-seat-progress]')].map((x) => x.dataset.seatProgress).join('|') }; });
  note('5 continue@' + W + ' booked card: Seat E4 as YOUR SEAT on a plan that is not for tapping, CHANGE SEAT + give back; the page moved on to the dinner; progress 1 of 2',
    after.state === 'booked' && after.label === 'E4' && after.yours === 'Ceremony seat E4, your seat' && after.buttons === 0 && after.change && after.give && after.dinnerNear && after.progress === '1/2|0/2', JSON.stringify(after));

  /* 6 · CHANGE SEAT: E4 stays authoritative until the new hold succeeds; the summary says CURRENT → NEW; KEEP cancels */
  await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(500);
  await p.locator('[data-ev="ceremony"] g[data-seat="C-R-04-03"]').click(); await p.waitForTimeout(500);
  const chg = await p.evaluate(() => { const bar = document.querySelector('.p-seatbar.on'); return { text: bar && bar.innerText.replace(/\s+/g, ' '), cur: bar && bar.querySelector('[data-seat-current]')?.dataset.seatCurrent, nu: bar && bar.querySelector('[data-seat-new]')?.dataset.seatNew, state: document.querySelector('[data-seatmap="ceremony"]').dataset.state, yours: !!document.querySelector('[data-ev="ceremony"] g.seat-yours'), selected: !!document.querySelector('[data-ev="ceremony"] g.seat-selected') }; });
  const oldHeld = holds['ceremony:C-R-04-02'] && holds['ceremony:C-R-04-02'].guestId === PEG.guestId && !holds['ceremony:C-R-04-03'];
  await shot(p, W + '-04-change');
  await p.locator('.p-seatbar.on [data-seat-cancel]').click(); await p.waitForTimeout(400);
  const kept = await p.evaluate(() => ({ bar: !!document.querySelector('.p-seatbar.on'), state: document.querySelector('[data-seatmap="ceremony"]').dataset.state, selected: !!document.querySelector('[data-ev="ceremony"] g.seat-selected') }));
  await p.locator('[data-ev="ceremony"] g[data-seat="C-R-04-03"]').click(); await p.waitForTimeout(400);
  await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(800);
  const moved = await p.evaluate(() => { const c = document.querySelector('[data-seatmap="ceremony"][data-state="confirmed"]'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
  note('6 change@' + W + ' CURRENT SEAT E4 → NEW SEAT F4 in the summary, E4 still held while pending, KEEP E4 returns to the changing map, CONFIRM CHANGE moves the hold atomically and confirms F4',
    /Change of seat/i.test(chg.text) && chg.cur === 'E4' && chg.nu === 'F4' && /Current seat E4 · New seat F4/.test(chg.text) && /Confirm change/i.test(chg.text) && /Keep E4/i.test(chg.text) && chg.state === 'changing' && chg.yours && chg.selected && oldHeld && !kept.bar && kept.state === 'changing' && !kept.selected && holds['ceremony:C-R-04-03']?.guestId === PEG.guestId && !holds['ceremony:C-R-04-02'] && /\bF4\b/.test(moved) && /SYL-TC-F4-/.test(moved), JSON.stringify({ chg: chg.text?.slice(0, 120), kept }));
  await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(500);

  /* 7 · the race: another party takes the chair between the tap and CONFIRM → refused, the old seat untouched, said in words */
  await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(400);
  await p.locator('[data-ev="ceremony"] g[data-seat="C-L-06-01"]').click(); await p.waitForTimeout(400);
  holds['ceremony:C-L-06-01'] = { inv: 'INV-099', guestId: 'G099' };
  await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(800);
  const race = await p.evaluate(() => ({ note: document.querySelector('[data-seat-note="ceremony"]')?.innerText.replace(/\s+/g, ' '), state: document.querySelector('[data-seatmap="ceremony"]').dataset.state, bar: !!document.querySelector('.p-seatbar.on'), taken: document.querySelector('[data-ev="ceremony"] g[data-label="A6"]')?.getAttribute('aria-label'), yours: document.querySelector('[data-ev="ceremony"] g.seat-yours')?.getAttribute('aria-label') }));
  note('7 race@' + W + ' the chair taken in between is refused: F4 stays, A6 is now UNAVAILABLE, the words say so, the change stays open',
    /just been taken/.test(race.note) && /F4 is still yours/.test(race.note) && race.state === 'changing' && !race.bar && race.taken === 'Ceremony seat A6, unavailable' && race.yours === 'Ceremony seat F4, your seat' && holds['ceremony:C-R-04-03']?.guestId === PEG.guestId, JSON.stringify(race));
  await shot(p, W + '-05-race');
  await p.locator('[data-seat-keep="ceremony"]').click(); await p.waitForTimeout(400);

  /* 8 · the dinner: the long table scrolls sideways, the tapped place is centred, the summary reads Seat B17; keyboard: Tab to a chair, Enter selects */
  await p.evaluate(() => document.querySelector('[data-seatmap="dinner"]').scrollIntoView()); await p.waitForTimeout(300);
  await p.locator('[data-ev="dinner"] g[data-seat="D-B-17"]').click(); await p.waitForTimeout(600);
  const din = await p.evaluate(() => { const wrap = document.querySelector('[data-ev="dinner"] .p-seatwrap'), sel = wrap.querySelector('g.seat-selected'), sr = sel.getBoundingClientRect(), wr = wrap.getBoundingClientRect(); return { text: document.querySelector('.p-seatbar.on')?.innerText.replace(/\s+/g, ' '), scrolls: wrap.scrollWidth > wrap.clientWidth + 2, visible: sr.left >= wr.left - 1 && sr.right <= wr.right + 1, hint: !document.querySelector('[data-ev="dinner"] .p-seathint').hidden }; });
  note('8 dinner@' + W + ' Seat B17 · Long table · run B · place 17 in the summary; ' + (din.scrolls ? 'the plan scrolls sideways and the chosen place is in view, the hint says swipe' : 'the whole table fits'),
    /Seat B17/i.test(din.text) && /Long table · run B · place 17/.test(din.text) && (!din.scrolls || (din.visible && din.hint)), JSON.stringify(din));
  await shot(p, W + '-06-dinner');
  await p.locator('.p-seatbar.on [data-seat-cancel]').click(); await p.waitForTimeout(300);
  const who = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-seat-confirm') ? 'CONFIRM' : a.getAttribute('data-label') || a.tagName) : 'none'; });
  await p.locator('[data-ev="dinner"] g[data-seat="D-T-02"]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
  const kbF1 = await who();   /* focus moves onto CONFIRM in the same tick the bar enters (no visibility race) */
  const kb = await p.evaluate(() => ({ bar: document.querySelector('.p-seatbar.on')?.innerText.replace(/\s+/g, ' '), focusable: document.querySelector('[data-ev="dinner"] g[data-seat="D-T-02"]')?.getAttribute('tabindex') }));
  await p.locator('.p-seatbar.on [data-seat-cancel]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
  const kbF2 = await who();   /* a withdrawn choice hands focus back to the chair */
  await p.keyboard.press('Enter'); await p.waitForTimeout(60); const kbF3 = await who();
  await p.keyboard.press('Enter'); await p.waitForTimeout(800);   /* Enter on CONFIRM books it */
  const kb2 = await p.evaluate(() => document.querySelector('[data-seatmap="dinner"][data-state="confirmed"]')?.innerText.replace(/\s+/g, ' ') || '');
  note('9 keyboard@' + W + ' a chair is focusable, Enter selects (Seat A2) and focus lands on CONFIRM, Cancel returns focus to the chair, Enter on CONFIRM books it',
    kb.focusable === '0' && /Seat A2/i.test(kb.bar || '') && kbF1 === 'CONFIRM' && kbF2 === 'A2' && kbF3 === 'CONFIRM' && /\bA2\b/.test(kb2) && holds['dinner:D-T-02']?.guestId === PEG.guestId, kbF1 + ' · ' + kbF2 + ' · ' + kbF3 + ' → ' + kb2.slice(0, 60));
  const kbFocus = await p.evaluate(() => document.activeElement && (document.activeElement.classList.contains('p-seatconf') ? 'confirmation' : document.activeElement.tagName));
  note('9b focus@' + W + ' after CONFIRM by keyboard the confirmation card holds focus', kbFocus === 'confirmation', String(kbFocus));
  await p.locator('[data-seat-continue="dinner"]').click(); await p.waitForTimeout(400);
  /* the give-back is a question first; a mis-tap releases nothing */
  await p.locator('[data-seatmap="dinner"] [data-seat-give="dinner"]').click(); await p.waitForTimeout(300);
  const ask = await p.evaluate(() => ({ q: document.querySelector('[data-seat-give-ask="dinner"]')?.innerText.replace(/\s+/g, ' '), yes: !!document.querySelector('[data-seatmap="dinner"] [data-seat-release="dinner"]'), keep: !!document.querySelector('[data-seatmap="dinner"] [data-seat-keep="dinner"]'), focused: document.activeElement?.getAttribute('data-seat-release') }));
  const stillHeld = holds['dinner:D-T-02']?.guestId === PEG.guestId;
  await p.locator('[data-seatmap="dinner"] [data-seat-keep="dinner"]').click(); await p.waitForTimeout(300);
  const keptSeat = holds['dinner:D-T-02']?.guestId === PEG.guestId && (await p.locator('[data-seatmap="dinner"] [data-seat-give="dinner"]').count()) === 1;
  await p.locator('[data-seatmap="dinner"] [data-seat-give="dinner"]').click(); await p.waitForTimeout(300); await p.locator('[data-seatmap="dinner"] [data-seat-release="dinner"]').click(); await p.waitForTimeout(700);
  const given = !holds['dinner:D-T-02'] && (await p.evaluate(() => document.querySelector('[data-seatmap="dinner"]').dataset.state)) === 'open';
  note('9c give back@' + W + ' asks first (Give seat A2 back? …), Keep releases nothing, Yes releases it and the card is open again', /Give seat A2 back\?/.test(ask.q || '') && ask.yes && ask.keep && ask.focused === 'dinner' && stillHeld && keptSeat && given, JSON.stringify(ask));
  await p.locator('[data-ev="dinner"] g[data-seat="D-T-02"]').click(); await p.waitForTimeout(300); await p.locator('.p-seatbar.on [data-seat-confirm="dinner"]').click(); await p.waitForTimeout(700);
  /* the combined pass: both events on one page */
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.locator('[data-seatmap="dinner"] [data-seat-pass="dinner"]').click()]);
  const pt2 = dl2 ? await pdfText(dl2, W + '-dinner-peggy.pdf') : '';
  note('10 pdf dinner@' + W + ' ' + (dl2 ? dl2.suggestedFilename() : 'none'), !!dl2 && dl2.suggestedFilename() === 'see-you-in-laos-wd-seat-peggy.pdf' && /^%PDF/.test(pt2) && (!pdftotext || (/Wedding Dinner/.test(pt2) && /Souphattra Heritage, Vientiane · poolside/.test(pt2) && /\bA2\b/.test(pt2) && /SYL-WD-A2-/.test(pt2))), pt2.replace(/\s+/g, ' ').slice(0, 160));
  const fb = await p.evaluate(() => [...document.querySelectorAll('[data-seatmap="dinner"] [data-seat-pass]')].map((b) => b.textContent.trim()).join('|'));
  note('10b download feedback@' + W + ' the button says Downloaded · again? (the page was not repainted under it)', /Downloaded · again\?/.test(fb), fb);
  await p.locator('[data-seat-continue="dinner"]').click(); await p.waitForTimeout(500);
  /* a CONFIRM in flight: the chairs are not for tapping, the summary is not for editing */
  slow = 1500; await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(300); await p.locator('[data-ev="ceremony"] g[data-seat="C-L-09-01"]').click(); await p.waitForTimeout(300);
  await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(300);
  const busy = await p.evaluate(() => ({ buttons: document.querySelectorAll('[data-ev="ceremony"] g.seat[role="button"]').length, bar: document.querySelector('.p-seatbar.on')?.innerText.replace(/\s+/g, ' '), disabled: document.querySelector('.p-seatbar.on [data-seat-confirm]')?.getAttribute('aria-disabled') === 'true' }));
  await p.locator('[data-ev="ceremony"] g[data-label="A10"]').click({ force: true }).catch(() => {}); await p.waitForTimeout(200);
  const busy2 = await p.evaluate(() => document.querySelector('.p-seatbar.on')?.innerText.replace(/\s+/g, ' '));
  await p.waitForSelector('[data-seatmap="ceremony"][data-state="confirmed"]', { timeout: 8000 }); slow = 0;
  const landed = await txt(p, '[data-seatmap="ceremony"][data-state="confirmed"]');
  note('11a busy@' + W + ' while CONFIRM is in flight no chair is a button, CONFIRM is disabled and says Confirming…, a stray tap changes nothing, the confirmation is A9', busy.buttons === 0 && busy.disabled === true && /Confirming/i.test(busy.bar || '') && /New seat A9/.test(busy.bar || '') && /New seat A9/.test(busy2 || '') && /\bA9\b/.test(landed) && holds['ceremony:C-L-09-01']?.guestId === PEG.guestId, JSON.stringify(busy));
  await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(300);
  /* allocated by Guest Relations: shown, not for the guest to move */
  holds['ceremony:C-L-09-01'].state = 'allocated';
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const alloc = await p.evaluate(() => { const c = document.querySelector('[data-seatmap="ceremony"]'); return { state: c.dataset.state, eyebrow: c.querySelector('.t-l1').innerText, change: c.querySelectorAll('[data-seat-change],[data-seat-give]').length, words: /Guest Relations placed you here/.test(c.innerText), pass: c.querySelectorAll('[data-seat-pass]').length }; });
  note('11b allocated@' + W + ' a seat placed by Guest Relations: SEAT ALLOCATED BY GUEST RELATIONS, no Change / Give back, the download still there', alloc.state === 'allocated' && /allocated by Guest Relations/i.test(alloc.eyebrow) && alloc.change === 0 && alloc.words && alloc.pass === 1, JSON.stringify(alloc));
  delete holds['ceremony:C-L-09-01']; holds['ceremony:C-R-04-03'] = { inv: 'INV-002', guestId: PEG.guestId };
  /* seating closed between the tap and CONFIRM: said in words, the old seat named */
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(300); await p.locator('[data-ev="ceremony"] g[data-seat="C-L-09-02"]').click(); await p.waitForTimeout(300);
  frozen = true; await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(1200);
  const fz = await p.evaluate(() => ({ note: document.querySelector('[data-seat-note="ceremony"]')?.innerText, bar: !!document.querySelector('.p-seatbar.on'), eyebrow: document.getElementById('seats-eyebrow').innerText, buttons: document.querySelectorAll('g.seat[role="button"]').length }));
  note('11c frozen mid-flow@' + W + ' the refused CONFIRM is explained, F4 stays, seating reads closed, nothing tappable', /Seating has just been closed/.test(fz.note || '') && /F4 stays yours/.test(fz.note || '') && !fz.bar && /closed/i.test(fz.eyebrow) && fz.buttons === 0 && holds['ceremony:C-R-04-03']?.guestId === PEG.guestId, JSON.stringify(fz));
  frozen = false; await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);

  /* 11 · SWITCH isolation: a pending choice for Peggy vanishes when the party switches to Steffie; Steffie sees Peggy's chairs as PEGGY'S SEAT, not tappable */
  await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(300);
  await p.locator('[data-ev="ceremony"] g[data-seat="C-L-08-01"]').click(); await p.waitForTimeout(300);
  const pendingBefore = !!(await p.locator('.p-seatbar.on').count());
  await p.locator('.p-selrow [data-seat-who="' + STE.guestId + '"]').click(); await p.waitForTimeout(500);
  const sw = await p.evaluate(() => ({ bar: !!document.querySelector('.p-seatbar.on'), who: document.querySelector('.p-selrow [aria-pressed="true"]')?.dataset.seatWho, forWho: document.querySelector('.p-for')?.innerText.replace(/\s+/g, ' '), peggy: document.querySelector('[data-ev="ceremony"] g[data-label="F4"]')?.getAttribute('aria-label'), tappable: !!document.querySelector('[data-ev="ceremony"] g[data-label="F4"][role="button"]'), legend: [...document.querySelectorAll('[data-ev="ceremony"] .p-seatlegend li')].map((l) => l.textContent.trim()).join('|'), cards: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.state).join('|') }));
  note('11 switch@' + W + ' the pending change for Peggy is dropped on SWITCH; Steffie\'s view: choosing for Steffie, F4 = Peggy’s seat (not tappable), both cards open',
    pendingBefore && !sw.bar && sw.who === STE.guestId && /Choosing for Steffie/i.test(sw.forWho) && sw.peggy === 'Ceremony seat F4, Peggy’s seat' && !sw.tappable && /Peggy’s seat/.test(sw.legend) && sw.cards === 'open|open' && holds['ceremony:C-R-04-03']?.guestId === PEG.guestId, JSON.stringify(sw));
  await shot(p, W + '-07-steffie');

  /* 12 · the hosts (INV-001): ceremony = Front centre · Bride / Groom, no map; the dinner like everyone; the Bride's PDF */
  const H = await signIn(p, T1, 'Haruthai');
  await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const host = await p.evaluate(() => ({ cards: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.seatmap + ':' + c.dataset.state + ':' + c.querySelector('.t-l1').innerText.replace(/\s+/g, ' ')).join('|'), maps: document.querySelectorAll('[data-ev="ceremony"]').length, dinner: document.querySelectorAll('[data-ev="dinner"] g.seat').length, progress: [...document.querySelectorAll('.p-seatprog-row')].map((r) => r.innerText.replace(/\s+/g, ' ')).join(' || ') }));
  note('12 hosts@' + W + ' Haruthai: Front centre · Bride, no ceremony map; dinner 50 chairs; progress says Front centre · Bride / Groom',
    /^ceremony:fixed:FRONT CENTRE · BRIDE\|dinner:open:NOT SELECTED$/i.test(host.cards) && host.maps === 0 && host.dinner === 50 && /Front centre · Bride/i.test(host.progress) && /Front centre · Groom/i.test(host.progress), host.cards + ' · ' + host.progress.slice(0, 120));
  const [dl3] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.locator('[data-seatmap="ceremony"] [data-seat-pass="ceremony"]').click()]);
  const pt3 = dl3 ? await pdfText(dl3, W + '-ceremony-haruthai.pdf') : '';
  note('13 bride pdf@' + W + ' ' + (dl3 ? dl3.suggestedFilename() : 'none'), !!dl3 && /^%PDF/.test(pt3) && (!pdftotext || (/Haruthai Amphai/.test(pt3) && /Bride · Front Centre/.test(pt3) && /Front centre · no seat number/.test(pt3) && /CONFIRMED/.test(pt3))), pt3.replace(/\s+/g, ' ').slice(0, 160));
  await shot(p, W + '-08-hosts');

  /* 14 · frozen: nothing to tap, no change, no give back; the allocation shown by label */
  holds['dinner:D-B-09'] = { inv: 'INV-001', guestId: H.guests[0].guestId }; frozen = true;
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const fr = await p.evaluate(() => ({ eyebrow: document.getElementById('seats-eyebrow').innerText, buttons: document.querySelectorAll('g.seat[role="button"]').length, change: document.querySelectorAll('[data-seat-change],[data-seat-release],[data-seat-confirm]').length, card: document.querySelector('[data-seatmap="dinner"]').innerText.replace(/\s+/g, ' ').slice(0, 160), legend: [...document.querySelectorAll('[data-ev="dinner"] .p-seatlegend li')].map((l) => l.textContent.trim()).join('|') }));
  note('14 frozen@' + W + ' seating closed: allocation shown as Seat B9, no chair tappable, no change, no give back, no Available in the legend',
    /closed/i.test(fr.eyebrow) && fr.buttons === 0 && fr.change === 0 && /Seat allocated/i.test(fr.card) && /\bB9\b/.test(fr.card) && !/Available|Selected by you/.test(fr.legend), JSON.stringify(fr).slice(0, 240));
  frozen = false; holds = {};

  /* 15 · reduced motion: the confirmation arrives without animation, the bar without transition */
  const ctx2 = await b.newContext({ viewport: { width: W, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage(); await wire(p2); await signIn(p2, T2, 'Peggy');
  await p2.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p2.waitForTimeout(900);
  await p2.locator('[data-ev="ceremony"] g[data-seat="C-L-01-01"]').click(); await p2.waitForTimeout(300);
  const rm1 = await p2.evaluate(() => getComputedStyle(document.querySelector('.p-seatbar')).transitionProperty);
  await p2.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p2.waitForTimeout(600);
  const rm2 = await p2.evaluate(() => getComputedStyle(document.querySelector('.p-seatconf')).animationName);
  note('15 reduced motion@' + W + ' no bar transition, no confirmation animation', /none|^$/.test(rm1) && rm2 === 'none', rm1 + ' · ' + rm2);
  await ctx2.close();
  note('16 errors@' + W, errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
  await ctx.close();
}
await b.close();
const pass = R.filter((r) => r.ok).length;
console.log(pass + '/' + R.length + ' seating UX checks pass on ' + ORIGIN);
if (OUT) fs.writeFileSync(path.join(OUT, 'seating-ux-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
process.exit(pass === R.length ? 0 : 1);
