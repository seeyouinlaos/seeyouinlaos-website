/* OWNER DECISIONS 13 SEP 2026 · the real booking flow, tested with the couple's
   own party (INV-001) on a live origin. Holds chairs through the real UI and
   the real API, proves the duplicate-seat protection inside the party and
   against another party (INV-002, read-only for that party), changes a chair
   atomically, then GIVES EVERY CHAIR BACK so the ledger is clean for the
   couple to book their real chairs. Codes come from the gitignored register
   and are never printed. */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = process.argv[2] || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const API = 'https://seeyouinlaos-website.suthep-hrg.workers.dev/api/seating';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const T1 = tok('INV-001'), T2 = tok('INV-002');
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const api = async (op, body) => { const r = await fetch(API + '/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json()) }; };
const plan = async (inv) => { const v = await (await fetch(API + '?invitation=' + inv, { cache: 'no-store' })).json(); const all = [...v.ceremony.rows.flatMap((r) => r.seats), ...v.dinner.sides.T, ...v.dinner.sides.B]; return { v, all, held: all.filter((s) => s.state !== 'available').map((s) => s.seatId + ':' + s.state + (s.guestId ? ':' + s.guestId : '')) }; };

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const signIn = async (token, who) => {
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
  await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
  const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
  await p.click('.p-drawer [data-who="' + g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)).guestId + '"]'); await p.waitForTimeout(300); return g;
};
const seats = async () => { await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); return (await p.locator('#seats').innerText()).replace(/\s+/g, ' '); };

/* 0 · clean start */
const p0 = await plan('INV-001');
note('0 ledger clean before', p0.held.length === 0 && p0.all.length === 100, p0.all.length + ' chairs, held ' + p0.held.length);

/* 1 · the couple sign in — one code, two people */
const g1 = await signIn(T1, 'Haruthai');
note('1 INV-001 is one party of two', g1.invitationId === 'INV-001' && g1.guests.length === 2 && g1.partyLead === g1.guests[0].guestId, g1.partyName + ' · ' + g1.guests.map((x) => x.guestId).join(' + ') + ' · lead ' + g1.partyLead);
const H = g1.guests[0].guestId, S = g1.guests[1].guestId;
let t = await seats();
note('1 seating open for the couple', /seating is open/i.test(t) && (await p.locator('#seats svg.p-seatmap').count()) === 2 && (await p.locator('#seats g.seat').count()) === 100 && (await p.locator('#seats g.fixed').count()) === 0 && !/BRIDE|GROOM/.test(await p.locator('#seats').evaluate((e) => e.textContent)), '2 plans · 100 chairs · nothing fixed · ' + t.slice(0, 50));

/* 2 · Haruthai holds a ceremony chair and a dinner chair through the UI */
await p.locator('#seats [data-ev="ceremony"] g[data-seat="C-L-01-01"]').click(); await p.waitForTimeout(900);
await p.locator('#seats [data-ev="dinner"] g[data-seat="D-T-01"]').click(); await p.waitForTimeout(900);
t = await seats();
let m = (await plan('INV-001')).v.mine;
note('2 Haruthai holds two chairs (UI → ledger)', m.ceremony[H] === 'C-L-01-01' && m.dinner[H] === 'D-T-01' && /Held in Haruthai/i.test(t), JSON.stringify(m));

/* 3 · duplicate protection inside the party: Suthep cannot take Haruthai's chair */
await p.locator('#seats [data-seat-who="' + S + '"]').click(); await p.waitForTimeout(500);
const hChair = p.locator('#seats [data-ev="dinner"] g[aria-label*="D-T-01"], #seats [data-ev="dinner"] g[aria-label*="place 1"]').first();
const disabled = (await hChair.getAttribute('aria-disabled')) === 'true' && !(await hChair.getAttribute('data-seat'));
const r3 = await api('select', { invitationId: 'INV-001', guestId: S, event: 'dinner', seatId: 'D-T-01' });
note('3 same party · duplicate refused', disabled && r3.status === 409 && r3.error === 'taken', 'UI: partner\'s chair not selectable · API: ' + r3.status + ' ' + r3.error);

/* 4 · duplicate protection against another party: INV-002 cannot take it, and sees no name */
const r4 = await api('select', { invitationId: 'INV-002', guestId: 'G001', event: 'dinner', seatId: 'D-T-01' });
const v2 = (await plan('INV-002')).all.find((s) => s.seatId === 'D-T-01');
note('4 other party · duplicate refused, no name shown', r4.status === 409 && r4.error === 'taken' && v2.state === 'taken' && !v2.guestId, 'API ' + r4.status + ' ' + r4.error + ' · INV-002 sees ' + v2.state + ' without a name');

/* 5 · Suthep holds his own two chairs (UI) */
await p.locator('#seats [data-ev="ceremony"] g[data-seat="C-L-01-02"]').click(); await p.waitForTimeout(900);
await p.locator('#seats [data-ev="dinner"] g[data-seat="D-T-02"]').click(); await p.waitForTimeout(900);
m = (await plan('INV-001')).v.mine;
note('5 both of the couple hold their own chairs', m.ceremony[H] === 'C-L-01-01' && m.dinner[H] === 'D-T-01' && m.ceremony[S] === 'C-L-01-02' && m.dinner[S] === 'D-T-02', JSON.stringify(m));

/* 6 · a change is atomic: the new chair is held first, then the old one released */
const r6 = await api('select', { invitationId: 'INV-001', guestId: H, event: 'dinner', seatId: 'D-B-25' });
const p6 = await plan('INV-001');
note('6 change of chair · hold new, release old', r6.ok && p6.v.mine.dinner[H] === 'D-B-25' && p6.all.find((s) => s.seatId === 'D-T-01').state === 'available' && p6.held.length === 4, p6.held.join(' '));

/* 7 · every chair given back through the UI, then the ledger is clean */
for (const who of [H, S]) { await p.locator('#seats [data-seat-who="' + who + '"]').click(); await p.waitForTimeout(400); for (const ev of ['ceremony', 'dinner']) { const btn = p.locator('#seats [data-seat-release="' + ev + '"]'); if (await btn.count()) { await btn.click(); await p.waitForTimeout(900); } } }
let p7 = await plan('INV-001');
if (p7.held.length) { for (const who of [H, S]) for (const ev of ['ceremony', 'dinner']) await api('release', { invitationId: 'INV-001', guestId: who, event: ev }); p7 = await plan('INV-001'); }
note('7 all chairs given back · ledger clean', p7.held.length === 0, '100 available · held ' + p7.held.length);
note('8 no page errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'clean');
const out = { origin: ORIGIN, at: new Date().toISOString(), results: R };
fs.writeFileSync(new URL('./booking-test-results.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(R.filter((r) => r.ok).length + '/' + R.length + ' booking checks pass on ' + ORIGIN);
await b.close();
