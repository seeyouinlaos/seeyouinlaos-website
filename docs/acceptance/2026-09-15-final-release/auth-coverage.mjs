/* SECTION E · read-only authentication coverage of every active guest on production.
   Per guest: the bearer derived from the code is accepted by the rooms engine (names + own places),
   by the seating ledger (own seat), the status route answers, and a browser sign-in on the Worker
   origin shows the guest's own name/party with an empty own cart — then Sign Out. No write request
   is allowed (asserted by a request listener). Prints counts only — never a code, bearer or hash. */
import fs from 'node:fs';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';   /* the working checkout's Playwright */
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { bearerOf } = await import(path.join(ROOT, 'register/crypto.mjs'));

const ORIGIN = process.argv[2] || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/guestlist.private.json'), 'utf8'));
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], partyId: c[2], token: c[5], status: c[7] }; });
const guestOf = (id) => { for (const p of list) for (const g of p.guests) if (g.guestId === id) return { p, g }; return null; };
const active = rows.filter((r) => r.status === 'ACTIVE');
const fails = [], counts = { guests: 0, apiAccepted: 0, roomsPlacesSeen: 0, seatsSeen: 0, statusReceived: 0, statusConfirmed: 0, browserSignedIn: 0, browserSignedOut: 0, rejectedBadBearer: 0, writesObserved: 0, emptyCart: 0, partyShown: 0 };
const j = async (u, h) => { const r = await fetch(ORIGIN + u, { headers: h || {} }); return { status: r.status, body: await r.json().catch(() => null) }; };
/* one write-refusal proof (a bad bearer is refused before any engine is reached) */
const bad = await j('/api/rooms/mine', { 'x-siyl-auth': 'f'.repeat(64) });
const badJoin = await fetch(ORIGIN + '/api/rooms/join', { method: 'POST', headers: { 'x-siyl-auth': 'f'.repeat(64), 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-G001', guestId: 'G001', key: 'wedstay/heritage', label: 'A', name: 'x' }) });
if (!(bad.status === 200 && Object.keys(bad.body.mine || {}).length === 0 && badJoin.status === 401)) fails.push('bad bearer not refused: ' + bad.status + '/' + badJoin.status); else counts.rejectedBadBearer = 1;

const b = await chromium.launch();
for (const r of active) {
  counts.guests++;
  const { p, g } = guestOf(r.guestId) || {};
  if (!g) { fails.push(r.guestId + ': not in the guest list'); continue; }
  const bearer = await bearerOf(r.token), H = { 'x-siyl-auth': bearer };
  /* rooms: accepted identity = names visible + own places marked mine with this guestId */
  const mine = await j('/api/rooms/mine', H), view = await j('/api/rooms', H);
  if (mine.status !== 200 || !mine.body || mine.body.ok !== true) { fails.push(r.guestId + ': rooms/mine ' + mine.status); continue; }
  const units = Object.values(view.body.units || {}).flat();
  const mineOcc = units.flatMap((u) => u.occupants.filter((o) => o.mine));
  const anyName = units.some((u) => u.occupants.some((o) => 'name' in o));
  const occupiedAtAll = units.some((u) => u.taken > 0);
  if (occupiedAtAll && !anyName) { fails.push(r.guestId + ': identity not accepted by rooms (no names)'); continue; }
  if (mineOcc.some((o) => o.guestId !== r.guestId)) fails.push(r.guestId + ': a mine occupant carries another guestId');
  if (mineOcc.length !== Object.keys(mine.body.mine).length) fails.push(r.guestId + ': mine count differs between /mine and /read');
  counts.roomsPlacesSeen += mineOcc.length;
  /* seating: own seat (if any) is "yours" with this guestId */
  const sm = await j('/api/seating/mine', H), sv = await j('/api/seating', H);
  if (sm.status !== 200 || sm.body.ok !== true) { fails.push(r.guestId + ': seating/mine ' + sm.status); continue; }
  for (const ev of ['ceremony', 'dinner']) {
    const own = (sm.body.mine[ev] || {})[r.guestId];
    const foreign = Object.keys(sm.body.mine[ev] || {}).filter((k) => k !== r.guestId);
    if (foreign.length) fails.push(r.guestId + ': seating/mine names another guest for ' + ev);
    if (own) { counts.seatsSeen++; const seat = ((sv.body.seats && sv.body.seats[ev]) || sv.body[ev] || []).find ? null : null; }
  }
  const yours = JSON.stringify(sv.body).match(/"state":"yours"/g) || [];
  const yoursIds = [...JSON.stringify(sv.body).matchAll(/"state":"yours"[^}]*"guestId":"([^"]+)"/g)].map((m) => m[1]);
  if (yoursIds.some((x) => x !== r.guestId)) fails.push(r.guestId + ': a seat marked yours belongs to another guest');
  /* status */
  const st = await j('/api/status?invitation=' + r.invitationId);
  if (st.status !== 200 || st.body.ok !== true) fails.push(r.guestId + ': status ' + st.status); else { if (st.body.received) counts.statusReceived++; if (st.body.confirmed) counts.statusConfirmed++; }
  counts.apiAccepted++;
  /* browser sign-in on the Worker origin: own name, party label, empty own cart, no write request, sign out */
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const writes = [], errs = [];
  page.on('request', (q) => { if (/\/api\//.test(q.url()) && !['GET', 'OPTIONS', 'HEAD'].includes(q.method())) writes.push(q.method() + ' ' + new URL(q.url()).pathname); });
  page.on('pageerror', (e) => errs.push(e.message));
  try {
    await page.goto(ORIGIN + '/invitation.html?open=1', { waitUntil: 'networkidle' });
    await page.waitForSelector('.siyl-inv input', { timeout: 10000 });
    await page.fill('.siyl-inv input', r.token); await page.click('.siyl-inv .igo');
    await page.waitForFunction((gid) => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId === gid && a.bearer && a.invitationId === 'INV-' + gid); } catch (e) { return false; } }, r.guestId, { timeout: 15000 });
    await page.waitForTimeout(700);
    const who = ((await page.locator('.prep-who').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (!who.includes(g.preferredName)) fails.push(r.guestId + ': the bar does not show the guest');
    const others = p.guests.filter((x) => x.guestId !== g.guestId && (x.status || 'ACTIVE') === 'ACTIVE');
    if (others.length) { if (/Your party/.test(who)) counts.partyShown++; else fails.push(r.guestId + ': party label missing'); }
    const bag = await page.evaluate(() => { try { const v = JSON.parse(localStorage.getItem('siyl.bag') || '[]'); return Array.isArray(v) ? v.length : Object.keys(v || {}).length; } catch (e) { return -1; } });
    if (bag === 0) counts.emptyCart++; else fails.push(r.guestId + ': own cart not empty in a fresh browser (' + bag + ')');
    counts.browserSignedIn++;
    await page.evaluate(() => { const b = document.querySelector('[data-leave="out"]'); if (b) b.click(); else window.SIYL_PREP.leave('out'); }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(600);
    await page.waitForFunction(() => !localStorage.getItem('siyl.auth'), null, { timeout: 15000 });
    if (!/\/invitation(\.html)?(\?|#|$)/.test(page.url())) fails.push(r.guestId + ': sign out did not return to the invitation page');
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^siyl\./.test(k) && !/^siyl\.party\./.test(k)));
    if (keys.length) fails.push(r.guestId + ': keys left after sign out: ' + keys.join(' '));
    counts.browserSignedOut++;
  } catch (e) { fails.push(r.guestId + ': browser ' + String(e.message).slice(0, 120)); }
  if (writes.length) { counts.writesObserved += writes.length; fails.push(r.guestId + ': write requests during sign-in: ' + writes.join(', ')); }
  if (errs.length) fails.push(r.guestId + ': page errors: ' + errs.join(' | ').slice(0, 160));
  await ctx.close();
  process.stdout.write('.');
}
await b.close();
console.log('\nORIGIN ' + ORIGIN);
for (const [k, v] of Object.entries(counts)) console.log(k.padEnd(20) + v);
console.log('FAILURES ' + fails.length); for (const f of fails) console.log('- ' + f);
fs.writeFileSync(process.argv[3] || '/dev/null', JSON.stringify({ at: new Date().toISOString(), origin: ORIGIN, counts, fails }, null, 2));
process.exit(fails.length ? 1 : 0);
