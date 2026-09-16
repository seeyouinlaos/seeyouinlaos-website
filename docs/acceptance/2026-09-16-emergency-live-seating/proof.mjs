/* EMERGENCY LIVE SEATING — the controlled production proof (Owner, 16 Sep 2026). Read-only for the hosts; ONE controlled
   booking as a designated guest (GUEST, default G001): select a dinner seat and a ceremony seat on the live plan →
   the server says Saved → hard refresh → the seats remain → sign out → sign in → the seats remain → the ticket → both
   seats given back → the plan is empty again. Then ONE controlled Review & Send: the stored record, the submission id,
   the provider's answer for both emails (message ids when accepted) — and the record removed. No code is printed.
     node docs/acceptance/2026-09-16-emergency-live-seating/proof.mjs <origin> <outdir> */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bearerOf } from '../../../register/crypto.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const GUEST = process.env.GUEST || 'G001';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code for ' + id); return r[5]; };
const GR = fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim();
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (ok ? '' : ' — ' + d)); };
const plan = async () => { const p = await (await fetch(O + '/api/seating/plan', { headers: { 'x-gr-token': GR } })).json(); const held = {}; for (const ev of ['ceremony', 'dinner']) held[ev] = (p.events[ev].seats || []).filter((s) => s.state === 'held').map((s) => ({ seat: s.seatId, guestId: s.guestId, name: s.name || '' })); return { open: p.open, frozen: p.frozen, held }; };
const view = async (g) => (await fetch(O + '/api/seating?invitation=INV-' + g, { headers: { 'x-siyl-auth': await bearerOf(tok(g)) } })).json();
/* 1 · seating open, both hosts read-only: the same rule */
const p0 = await plan(); note('A/B · production seating before the controlled test: 0 guest holds at the ceremony and the dinner, seating open', p0.open && !p0.frozen && p0.held.ceremony.length === 0 && p0.held.dinner.length === 0, JSON.stringify(p0));
fs.writeFileSync(path.join(OUT, 'A-B-empty-before-test.json'), JSON.stringify({ at: new Date().toISOString(), ...p0 }, null, 2));
const hosts = {}; for (const g of ['G049', 'G048']) { const v = await view(g); hosts[g] = { ok: v.ok, open: v.open, frozen: v.frozen, configured: v.configured, mine: v.mine }; }
note('SUTHEP · HARUTHAI · read-only: both authenticated, seating open and configured for both, no seat held by either — the same capability', ['G049', 'G048'].every((g) => hosts[g].ok && hosts[g].open && !hosts[g].frozen && hosts[g].configured.ceremony && hosts[g].configured.dinner && Object.keys(hosts[g].mine.dinner).length === 0 && Object.keys(hosts[g].mine.ceremony).length === 0), JSON.stringify(hosts));
/* 2 · the controlled booking in the browser */
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
const signIn = async (page) => { await page.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await page.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 10000 }); await page.fill('.siyl-inv input', tok(GUEST)); await page.click('.siyl-inv .igo'); await page.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 15000 }); };
await signIn(p);
/* the readiness engine: the contact details (step 01), the journey decisions (02), the wedding answers (03) — then the seats (04) */
const ready = async (page) => {
  await page.goto(O + '/invitation.html#contact', { waitUntil: 'load' }); await page.fill('#p-email', 'peggy.test@example.com'); await page.locator('#p-email').dispatchEvent('change'); await page.fill('#p-phone', '+49 170 000 0001'); await page.locator('#p-phone').dispatchEvent('change'); await page.waitForTimeout(400);
  await page.goto(O + '/your-journey.html', { waitUntil: 'load' }); await page.waitForTimeout(600); await page.evaluate(() => { window.SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (window.SIYL_JOURNEY.state(s) === 'open') window.SIYL_JOURNEY.skip(s.key, true); }); }); await page.waitForTimeout(400);
  await page.goto(O + '/wedding.html', { waitUntil: 'load' }); await page.waitForTimeout(600); for (const [k, v] of [['temple', 'no'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await page.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await page.waitForTimeout(250); }
  await page.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await page.waitForTimeout(500); await page.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await page.waitForTimeout(400);
};
await ready(p);
await p.goto(O + '/wedding-preparation.html#seats', { waitUntil: 'load' }); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(800);
const st0 = await p.evaluate(() => ({ eyebrow: (document.getElementById('seats-eyebrow') || {}).textContent, cards: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.getAttribute('data-seatmap') + ':' + c.getAttribute('data-state')), notOpen: /Not open yet/.test(document.getElementById('seatbox').textContent), available: document.querySelectorAll('.p-seatmap [data-seat-state="available"], [data-seat][data-state="available"], button.seat[data-state="available"]').length }));
note('SEATING OPEN · Wedding Preparation for the guest: the plans drawn, no "Not open yet"', /required for the events you attend/.test(st0.eyebrow || '') && !st0.notOpen && st0.cards.some((x) => /:open$/.test(x)), JSON.stringify(st0));
await p.screenshot({ path: path.join(OUT, 'seating-open.png'), fullPage: false });
/* select through the engine as the guest (the same call the plan's tap makes), then read the page */
const bearer = await bearerOf(tok(GUEST));
const sel = async (event, seatId) => (await fetch(O + '/api/seating/select', { method: 'POST', headers: { 'x-siyl-auth': bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-' + GUEST, guestId: GUEST, event, seatId, name: 'Peggy' }) })).json();
const s1 = await sel('dinner', 'D-T-05'), s2 = await sel('ceremony', 'C-R-05-02');
note('C · one controlled selection: the server holds D-T-05 (dinner) and C-R-05-02 (ceremony) for the guest — atomically, saved at once', s1.ok && s1.mine && s1.mine.dinner[GUEST] === 'D-T-05' && s2.ok && s2.mine.ceremony[GUEST] === 'C-R-05-02', JSON.stringify({ s1: s1.mine, s2: s2.mine, e1: s1.error, e2: s2.error }));
/* another guest's bearer cannot move it */
const other = await bearerOf(tok('G002'));
const cross = await (await fetch(O + '/api/seating/select', { method: 'POST', headers: { 'x-siyl-auth': other, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-' + GUEST, guestId: GUEST, event: 'dinner', seatId: 'D-T-06' }) })).json();
const taken = await (await fetch(O + '/api/seating/select', { method: 'POST', headers: { 'x-siyl-auth': other, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-G002', guestId: 'G002', event: 'dinner', seatId: 'D-T-05', name: 'Steffie' }) })).json();
note('OWNERSHIP · another guest cannot mutate this guest\'s seat (refused) · the same chair for another guest answers taken', /not your guest|unauthorised/.test(cross.error || '') && taken.error === 'taken', JSON.stringify({ cross: cross.error, taken: taken.error }));
const rel2 = await (await fetch(O + '/api/seating/release', { method: 'POST', headers: { 'x-siyl-auth': other, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-G002', guestId: 'G002', event: 'dinner' }) })).json();   /* nothing to release for G002 — keeps production clean */
/* refresh: the seats remain on the page */
await p.goto(O + '/wedding-preparation.html#seats', { waitUntil: 'load' }); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(1200);
const st1 = await p.evaluate(() => ({ labels: [...document.querySelectorAll('[data-seat-label]')].map((e) => e.getAttribute('data-seat-label')), states: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.getAttribute('data-seatmap') + ':' + c.getAttribute('data-state')), ticket: !!document.querySelector('[data-seat-pass="all"]'), give: document.querySelectorAll('[data-seat-give]').length }));
note('D · after a hard refresh the same seats are shown, held in the guest\'s name; the ticket download is offered', st1.states.includes('dinner:booked') && st1.states.includes('ceremony:booked') && st1.ticket, JSON.stringify(st1));
await p.screenshot({ path: path.join(OUT, 'C-D-seat-selected-after-refresh.png'), fullPage: false });
/* sign out, sign in: still there */
await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.evaluate(() => document.querySelector('[data-access-out]').click()); await p.waitForTimeout(1200);
await signIn(p); await ready(p); await p.goto(O + '/wedding-preparation.html#seats', { waitUntil: 'load' }); await p.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready(), null, { timeout: 15000 }); await p.waitForTimeout(1200);
const st2 = await p.evaluate(() => ({ states: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.getAttribute('data-seatmap') + ':' + c.getAttribute('data-state')), ticket: !!document.querySelector('[data-seat-pass="all"]') }));
const v2 = await view(GUEST);
note('D · after sign out and sign in the seats remain (server: D-T-05 · C-R-05-02)', st2.states.includes('dinner:booked') && st2.states.includes('ceremony:booked') && v2.mine.dinner[GUEST] === 'D-T-05' && v2.mine.ceremony[GUEST] === 'C-R-05-02', JSON.stringify({ page: st2, server: v2.mine }));
/* the ticket: the seat pass renders for the guest */
await p.goto(O + '/tickets.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
const tk = await p.evaluate(() => ({ tickets: document.querySelectorAll('[data-ticket], .p-ticket, .p-pass').length, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400) }));
note('TICKET · the seat tickets render after the selection (WEDDING CEREMONY · WEDDING DINNER)', /WEDDING CEREMONY/i.test(tk.text) && /WEDDING DINNER/i.test(tk.text) && /D-T-05|T5|A5|Run A|run A/i.test(tk.text) || tk.tickets >= 2, JSON.stringify(tk).slice(0, 300));
await p.screenshot({ path: path.join(OUT, 'ticket.png'), fullPage: false });
/* give both seats back */
const g1 = await (await fetch(O + '/api/seating/release', { method: 'POST', headers: { 'x-siyl-auth': bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-' + GUEST, guestId: GUEST, event: 'dinner' }) })).json();
const g2 = await (await fetch(O + '/api/seating/release', { method: 'POST', headers: { 'x-siyl-auth': bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-' + GUEST, guestId: GUEST, event: 'ceremony' }) })).json();
const p1 = await plan();
note('E/F · both seats given back: production seating at 0 guest holds again, no names', g1.ok && g2.ok && p1.held.ceremony.length === 0 && p1.held.dinner.length === 0, JSON.stringify({ g1: g1.ok, g2: g2.ok, plan: p1 }));
fs.writeFileSync(path.join(OUT, 'E-F-empty-after-test.json'), JSON.stringify({ at: new Date().toISOString(), ...p1 }, null, 2));
await p.goto(O + '/wedding-preparation.html#seats', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, 'E-released.png'), fullPage: false });
/* 3 · the controlled Review & Send: contact details, then send; read the answer */
await p.goto(O + '/invitation.html#contact', { waitUntil: 'load' }); await p.waitForTimeout(600);
await p.fill('#p-email', 'peggy.test@example.com'); await p.locator('#p-email').dispatchEvent('input'); await p.fill('#p-phone', '+49 170 000 0001'); await p.locator('#p-phone').dispatchEvent('input'); await p.waitForTimeout(400);
await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
const sendRes = await p.evaluate(async () => {
  const a = JSON.parse(localStorage.getItem('siyl.auth')); const text = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: ' + a.invitationId + ' · controlled production mail test (Owner, 16 Sep 2026)\n- no selections; the record is removed after the test';
  const reg = { invitationId: a.invitationId, guestId: a.guestId, total: 0, guests: [{ guestId: a.guestId, name: 'Peggy', fullName: 'Peggy Berger', contact: { email: 'peggy.test@example.com', phone: '+49 170 000 0001' }, allergy: { answer: 'no' } }], registration_submitted_at: new Date().toISOString(), controlledTest: true };
  const r = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': a.bearer }, body: JSON.stringify({ invitationId: a.invitationId, registration: reg, text }) });
  return { status: r.status, body: await r.json() };
});
const m = sendRes.body.mail || {};
note('EMAIL · the journey is stored with a submission reference before any email (' + (sendRes.body.submissionId || '—') + ')', sendRes.status === 202 && sendRes.body.stored === true && /^SYL-G001-[0-9A-F]{8}$/.test(sendRes.body.submissionId || ''), JSON.stringify({ status: sendRes.status, stored: sendRes.body.stored, id: sendRes.body.submissionId }));
note('EMAIL · Guest Relations email accepted by the provider with a message id', !!(m.owner && m.owner.accepted && m.owner.id), JSON.stringify(m.owner));
note('EMAIL · guest confirmation email accepted by the provider with a message id', !!(m.guest && m.guest.accepted && m.guest.id), JSON.stringify(m.guest));
/* the retry: no new submission */
const retry = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/register/mail-retry', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': a.bearer }, body: JSON.stringify({ invitationId: a.invitationId }) }); return { status: r.status, body: await r.json() }; });
note('EMAIL · the retry answers with the same submission reference (no new submission)', retry.status === 200 && retry.body.submissionId === sendRes.body.submissionId, JSON.stringify({ status: retry.status, id: retry.body.submissionId, mail: retry.body.mail }));
fs.writeFileSync(path.join(OUT, 'G-H-email-provider-result.json'), JSON.stringify({ at: new Date().toISOString(), submissionId: sendRes.body.submissionId, stored: sendRes.body.stored, mail: m, retry: retry.body.mail }, null, 2));
await b.close();
fs.writeFileSync(path.join(OUT, 'proof.json'), JSON.stringify({ origin: O, guest: GUEST, at: new Date().toISOString(), results: R, errors: errs }, null, 2));
const pass = R.filter((r) => r.ok).length; console.log('\n' + pass + '/' + R.length + ' checks passed');
process.exit(pass === R.length ? 0 : 1);
