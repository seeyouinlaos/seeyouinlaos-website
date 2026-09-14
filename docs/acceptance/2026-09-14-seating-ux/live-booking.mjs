/* 002 · SEATING UX — the REAL booking flow on a live origin, after deployment.
   INV-002 (Peggy) changes her ceremony seat through the new two-step UI
   against the production engine, downloads the PDF, and changes back;
   INV-001 (Haruthai, the Bride) sees the fixed front centre and moves her
   dinner place and back. The ledger is read before and after and must be
   IDENTICAL at the end — the Owner's existing test holds are restored.
   Codes come from the gitignored register and are never printed.
     node docs/acceptance/2026-09-14-seating-ux/live-booking.mjs <origin> [outdir] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const ORIGIN = (process.argv[2] || 'https://seeyouinlaos-website.suthep-hrg.workers.dev').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const API = 'https://seeyouinlaos-website.suthep-hrg.workers.dev/api/seating';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
let pdftotext = null; try { pdftotext = execFileSync('which', ['pdftotext']).toString().trim(); } catch (e) {}
const ledger = async (inv) => { const v = await (await fetch(API + '?invitation=' + inv, { cache: 'no-store' })).json(); const all = [...v.ceremony.rows.flatMap((r) => r.seats), ...v.dinner.sides.T, ...v.dinner.sides.B]; return { open: v.open, frozen: v.frozen, mine: v.mine, held: all.filter((s) => s.state !== 'available').map((s) => s.seatId + ':' + s.state + (s.guestId ? ':' + s.guestId : '')).sort(), free: all.filter((s) => s.state === 'available').map((s) => s.seatId) }; };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const signIn = async (token, who) => {
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
  await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 15000 }); await p.waitForTimeout(300);
  const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
  const me = g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(300); return { g, me };
};
const txt = async (sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const shot = async (n) => { if (OUT) await p.screenshot({ path: path.join(OUT, 'live-' + n + '.png') }); };
const L = (await import('../../../assets/seatlabels.js')).default || (await import('module')).createRequire(import.meta.url)('../../../assets/seatlabels.js');
const change = async (ev, toId) => {
  await p.locator('[data-seat-change="' + ev + '"]').click(); await p.waitForTimeout(500);
  await p.locator('[data-ev="' + ev + '"] g[data-seat="' + toId + '"]').click(); await p.waitForTimeout(500);
  const bar = await txt('.p-seatbar.on');
  await p.locator('.p-seatbar.on [data-seat-confirm="' + ev + '"]').click(); await p.waitForSelector('[data-seatmap="' + ev + '"][data-state="confirmed"]', { timeout: 20000 }); await p.waitForTimeout(400);
  const conf = await txt('[data-seatmap="' + ev + '"][data-state="confirmed"]');
  return { bar, conf };
};

/* 0 · the ledger as the Owner left it */
const before2 = await ledger('INV-002'), before1 = await ledger('INV-001');
note('0 production seating OPEN, ledger read', before2.open && !before2.frozen, 'held ' + before2.held.length + ' · INV-002 ' + JSON.stringify(before2.mine) + ' · INV-001 ' + JSON.stringify(before1.mine));

/* 1 · INV-002 · Peggy: the booked state by label, change to a free chair, the confirmation, the PDF, change back */
const { g: g2, me: peg } = await signIn(tok('INV-002'), 'Peggy');
await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const cur = before2.mine.ceremony[peg.guestId]; const curLab = L.label(cur);
const st = await p.evaluate(() => ({ cards: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.seatmap + ':' + c.dataset.state + ':' + (c.querySelector('.p-seatlabel')?.dataset.seatLabel || '')).join('|'), raw: /C-[LR]-\d\d|D-[TB]-\d\d/.test(document.getElementById('seatbox').innerText), chairs: document.querySelectorAll('g.seat').length }));
note('1 live INV-002 Peggy: both seats booked by label (' + curLab + ' / ' + L.label(before2.mine.dinner[peg.guestId]) + '), 100 chairs drawn, no raw id', st.cards === 'ceremony:booked:' + curLab + '|dinner:booked:' + L.label(before2.mine.dinner[peg.guestId]) && !st.raw && st.chairs === 100, st.cards);
await shot('01-peggy-booked');
const target = before2.free.find((id) => /^C-R-0[4-9]-0[1-3]$/.test(id)) || before2.free.find((id) => /^C-/.test(id));
const c1 = await change('ceremony', target);
const mid = await ledger('INV-002');
note('2 live change ' + curLab + ' → ' + L.label(target) + ': the summary names CURRENT and NEW, the engine moved the hold atomically, the confirmation shows ' + L.label(target) + ' with its reference',
  new RegExp('Current seat ' + curLab + ' · New seat ' + L.label(target)).test(c1.bar) && mid.mine.ceremony[peg.guestId] === target && !mid.held.some((h) => h.startsWith(cur + ':')) && new RegExp('\\b' + L.label(target) + '\\b').test(c1.conf) && new RegExp('SYL-TC-' + L.label(target) + '-').test(c1.conf) && /SEAT CONFIRMED/i.test(c1.conf), c1.conf.slice(0, 160));
await shot('02-peggy-confirmed');
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.locator('[data-seatmap="ceremony"] [data-seat-pass="ceremony"]').click()]);
let pt = '';
if (dl && OUT) { const f = path.join(OUT, 'live-ceremony-peggy.pdf'); await dl.saveAs(f); pt = fs.readFileSync(f).slice(0, 8).toString('latin1') + (pdftotext ? '\n' + execFileSync(pdftotext, ['-layout', f, '-']).toString() : ''); }
note('3 live PDF ' + (dl ? dl.suggestedFilename() : 'none') + ' · the live seat ' + L.label(target) + ' · the reference · CONFIRMED · no ledger id', !!dl && /^%PDF-1\.4/.test(pt) && (!pdftotext || (/Peggy/.test(pt) && /Temple Ceremony/.test(pt) && new RegExp('\\b' + L.label(target) + '\\b').test(pt) && new RegExp('SYL-TC-' + L.label(target) + '-').test(pt) && /CONFIRMED/.test(pt) && !/C-R-\d\d/.test(pt))), pt.replace(/\s+/g, ' ').slice(0, 160));
await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(500);
const c2 = await change('ceremony', cur);
const back2 = await ledger('INV-002');
note('4 live change back ' + L.label(target) + ' → ' + curLab + ': INV-002 exactly as before', back2.mine.ceremony[peg.guestId] === cur && JSON.stringify(back2.held) === JSON.stringify(before2.held), c2.conf.slice(0, 80));
await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(300);
/* The Wedding and Review speak in the same labels */
await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const wed = await txt('#seats-route');
await p.goto(ORIGIN + '/review.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const rev = await txt('main');
note('5 live The Wedding + Review & Send: Seat ' + curLab + ' by label, downloads offered, no raw id', new RegExp('Seat ' + curLab, 'i').test(wed) && /Download seat confirmation/i.test(wed) && new RegExp('Seat ' + curLab, 'i').test(rev) && new RegExp('SYL-TC-' + curLab + '-').test(rev) && !/C-[LR]-\d\d|D-[TB]-\d\d/.test(wed + rev), wed.slice(0, 120));

/* 6 · INV-001 · Haruthai: the Bride's front centre, the dinner place moved and back */
const { g: g1, me: har } = await signIn(tok('INV-001'), 'Haruthai');
await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const hostCard = await txt('[data-seatmap="ceremony"]'); const dcur = before1.mine.dinner[har.guestId];
note('6 live INV-001 Haruthai: ceremony = Front centre · Bride (hostRole live in the bundle), no ceremony map, dinner ' + L.label(dcur) + ' booked', /Front centre · Bride/i.test(hostCard) && (await p.locator('[data-ev="ceremony"]').count()) === 0 && (await p.evaluate(() => document.querySelector('[data-seatmap="dinner"]')?.dataset.state)) === 'booked' && g1.guests.find((x) => x.guestId === har.guestId).hostRole === 'BRIDE', hostCard.slice(0, 100));
await shot('03-bride');
const dtarget = before1.free.find((id) => /^D-T-2[0-5]$/.test(id)) || before1.free.find((id) => /^D-/.test(id));
const d1 = await change('dinner', dtarget);
const mid1 = await ledger('INV-001');
note('7 live dinner change ' + L.label(dcur) + ' → ' + L.label(dtarget) + ' for the Bride, confirmed', mid1.mine.dinner[har.guestId] === dtarget && new RegExp('\\b' + L.label(dtarget) + '\\b').test(d1.conf), d1.bar.slice(0, 100));
const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.locator('[data-seatmap="dinner"] [data-seat-pass="dinner"]').click()]);
let pt2 = ''; if (dl2 && OUT) { const f = path.join(OUT, 'live-dinner-haruthai.pdf'); await dl2.saveAs(f); pt2 = fs.readFileSync(f).slice(0, 8).toString('latin1') + (pdftotext ? '\n' + execFileSync(pdftotext, ['-layout', f, '-']).toString() : ''); }
note('8 live PDF for the Bride: ' + (dl2 ? dl2.suggestedFilename() : 'none'), !!dl2 && /^%PDF/.test(pt2) && (!pdftotext || (/Haruthai Amphai/.test(pt2) && /Wedding Dinner/.test(pt2) && new RegExp('\\b' + L.label(dtarget) + '\\b').test(pt2))), pt2.replace(/\s+/g, ' ').slice(0, 120));
await p.locator('[data-seat-continue="dinner"]').click(); await p.waitForTimeout(400);
await change('dinner', dcur);
const back1 = await ledger('INV-001'), back2b = await ledger('INV-002');
note('9 live ledger restored exactly: INV-001 and INV-002 as the Owner left them', JSON.stringify(back1.held) === JSON.stringify(before1.held) && JSON.stringify(back2b.held) === JSON.stringify(before2.held) && JSON.stringify(back1.mine) === JSON.stringify(before1.mine) && JSON.stringify(back2b.mine) === JSON.stringify(before2.mine), 'held ' + back1.held.length + ' · INV-001 ' + JSON.stringify(back1.mine) + ' · INV-002 ' + JSON.stringify(back2b.mine));
note('10 live errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
await b.close();
const pass = R.filter((r) => r.ok).length; console.log(pass + '/' + R.length + ' live booking checks pass on ' + ORIGIN);
if (OUT) fs.writeFileSync(path.join(OUT, 'live-booking-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
process.exit(pass === R.length ? 0 : 1);
