/* 002 · SEATING UX — iPhone WebKit (Safari engine) check: the plan, the
   two-step booking, the confirmation, the downloaded PDF, on a mocked ledger.
     node docs/acceptance/2026-09-14-seating-ux/seating-iphone.mjs <origin> [outdir] */
import { webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateGeometry } from '../../../src/seating.js';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const cfg = validateGeometry(JSON.parse(fs.readFileSync(new URL('../2026-09-13-owner-decisions/seating-geometry.json', import.meta.url), 'utf8'))).config;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
let pdftotext = null; try { pdftotext = execFileSync('which', ['pdftotext']).toString().trim(); } catch (e) {}
const holds = {};
const view = (inv) => { const mine = { ceremony: {}, dinner: {} };
  const dress = (s, ev) => { const h = holds[ev + ':' + s.seatId]; const row = { seatId: s.seatId, family: false, state: h ? (h.inv === inv ? 'yours' : 'taken') : 'available' }; if (row.state === 'yours') { row.guestId = h.guestId; mine[ev][h.guestId] = s.seatId; } return row; };
  return { ok: true, open: true, frozen: false, configured: { ceremony: true, dinner: true }, mine, ceremony: { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => dress(s, 'ceremony')) })), fixed: ['BRIDE', 'GROOM'] }, dinner: { sides: { T: cfg.dinner.sides.T.map((s) => dress(s, 'dinner')), B: cfg.dinner.sides.B.map((s) => dress(s, 'dinner')) }, totalPeople: 50 } }; };
const b = await webkit.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'], acceptDownloads: true }); const p = await ctx.newPage();
await p.route(WORKER + '/api/**', async (route) => { const url = new URL(route.request().url()), json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  if (url.pathname === '/api/status') return json(200, { ok: true, received: false, confirmed: false });
  if (url.pathname.startsWith('/api/inventory')) return json(200, { ok: true, windows: {} });
  if (url.pathname.startsWith('/api/seating')) { const inv = url.searchParams.get('invitation') || '';
    if (url.pathname.endsWith('/select')) { const q = JSON.parse(route.request().postData() || '{}'); const k = q.event + ':' + q.seatId; const cur = holds[k]; if (cur && !(cur.inv === q.invitationId && cur.guestId === q.guestId)) return json(409, { ok: false, error: 'taken', ...view(q.invitationId) }); for (const kk of Object.keys(holds)) if (kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId) delete holds[kk]; holds[k] = { inv: q.invitationId, guestId: q.guestId }; return json(200, { ok: true, ...view(q.invitationId) }); }
    return json(200, view(inv)); }
  return json(404, { ok: false }); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
await p.click('#open'); await p.fill('.siyl-inv input', tok('INV-002')); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth'))); const me = g.guests.find((x) => /peggy/i.test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(400);
await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
const shot = async (n) => { if (OUT) await p.screenshot({ path: path.join(OUT, 'iphone-' + n + '.png') }); };
const room = await p.evaluate(() => ({ chairs: document.querySelectorAll('[data-ev="ceremony"] g.seat').length, dchairs: document.querySelectorAll('[data-ev="dinner"] g.seat').length, wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, raw: /C-[LR]-\d\d|D-[TB]-\d\d/.test(document.getElementById('seatbox').innerText), a1: document.querySelector('[data-ev="ceremony"] g[data-label="A1"]')?.getAttribute('aria-label') }));
note('iphone plan: 50 + 50 chairs, labels, no raw id, no page overflow', room.chairs === 50 && room.dchairs === 50 && !room.wide && !room.raw && room.a1 === 'Ceremony seat A1, available', JSON.stringify(room));
await shot('01-plan');
await p.locator('[data-ev="ceremony"] g[data-seat="C-R-04-02"]').tap(); await p.waitForTimeout(600);
const bar = await p.evaluate(() => { const bar = document.querySelector('.p-seatbar.on'); const r = bar && bar.getBoundingClientRect(); return { on: !!bar, text: bar && bar.innerText.replace(/\s+/g, ' '), bottom: r && Math.round(window.innerHeight - r.bottom), pad: getComputedStyle(bar).paddingBottom }; });
note('iphone tap → summary Seat E4 at the bottom (safe-area padding applied)', bar.on && /Seat E4/i.test(bar.text) && bar.bottom === 0 && !holds['ceremony:C-R-04-02'], JSON.stringify(bar));
await shot('02-summary');
await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').tap(); await p.waitForTimeout(900);
const conf = await txt('[data-seatmap="ceremony"][data-state="confirmed"]');
note('iphone CONFIRM → SEAT CONFIRMED E4 with the reference', holds['ceremony:C-R-04-02']?.guestId === me.guestId && /SEAT CONFIRMED/i.test(conf) && /\bE4\b/.test(conf) && /SYL-TC-E4-/.test(conf), conf.slice(0, 160));
await shot('03-confirmed');
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }).catch(() => null), p.locator('[data-seatmap="ceremony"] [data-seat-pass="ceremony"]').tap()]);
let pt = '';
if (dl && OUT) { const f = path.join(OUT, 'iphone-ceremony-peggy.pdf'); await dl.saveAs(f); pt = fs.readFileSync(f).slice(0, 8).toString('latin1') + (pdftotext ? '\n' + execFileSync(pdftotext, ['-layout', f, '-']).toString() : ''); }
note('iphone download: ' + (dl ? dl.suggestedFilename() : 'none') + ' is a PDF with the fields', !!dl && /^%PDF-1\.4/.test(pt) && (!pdftotext || (/Peggy Berger/.test(pt) && /Temple Ceremony/.test(pt) && /\bE4\b/.test(pt) && /CONFIRMED/.test(pt) && !/C-R-04-02/.test(pt))), pt.replace(/\s+/g, ' ').slice(0, 160));
/* the file rendered by Apple's PDF engine (Quick Look = PDFKit, the engine iOS Safari and Files use) — headless WebKit has no PDF viewer of its own */
if (dl && OUT) { try { execFileSync('qlmanage', ['-t', '-s', '1000', '-o', OUT, path.join(OUT, 'iphone-ceremony-peggy.pdf')], { stdio: 'ignore' }); const png = path.join(OUT, 'iphone-ceremony-peggy.pdf.png'); note('iphone PDF renders under Apple PDFKit (Quick Look thumbnail)', fs.existsSync(png) && fs.statSync(png).size > 20000, png); } catch (e) { note('iphone PDF renders under Apple PDFKit', false, String(e.message)); } }
note('iphone errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
async function txt(sel) { return ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(); }
await b.close();
const pass = R.filter((r) => r.ok).length; console.log(pass + '/' + R.length + ' iPhone WebKit seating checks pass on ' + ORIGIN);
if (OUT) fs.writeFileSync(path.join(OUT, 'seating-iphone-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
process.exit(pass === R.length ? 0 : 1);
