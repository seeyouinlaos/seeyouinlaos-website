/* ============================================================================
   EDIT 7 · GUEST HOUSE COMPLIMENTARY = ONE BEDROOM · FOUR GUESTS · FOUR SHARED PLACES (Owner, 24 Sep 2026)

     node e2e.mjs <scratchpad-with-synth-codes.json> <out-dir> [origin]

   The engine counts 4 → 3 → 2 → 1 → 0, refuses a fifth guest, gives a place back on
   release, and the count survives a reload / second device; the room page reads the
   new copy and "4 of 4 places remaining" / "4 places available" at 390 · 834 · 1440.
   Synthetic guests on the stage only; everything taken is released at the end.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 700) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 260)); };
const b = await chromium.launch(), wk = await webkit.launch();
const fresh = async (w, h) => { const width = w || 1440, height = h || 900; const ctx = await (width <= 430 ? wk : b).newContext(width <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width, height } }) : { viewport: { width, height } }); return ctx.newPage(); };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(800);
};
const api = (p, u, init) => p.evaluate(async ([u, i]) => { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); const h = { 'content-type': 'application/json' }; if (a && a.bearer) h['x-siyl-auth'] = a.bearer; const r = await fetch(u, Object.assign({ headers: h, cache: 'no-store' }, i || {})); return { status: r.status, body: await r.json().catch(() => null) }; }, [u, init]);
const KEY = 'guesthouse/guest-house';
const sum = async (p) => (await api(p, '/api/rooms')).body.summary[KEY];
const pages = {};
for (const g of ['T001', 'T002', 'T003', 'G048', 'G049']) { pages[g] = await fresh(); await signIn(pages[g], g); await api(pages[g], '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, stage: 'wedstay' }) }); }
const join = (g) => api(pages[g], '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, key: KEY, label: 'A', name: g, need: 1 }) });
let s = await sum(pages.T001);
note('G1 empty Guest House = 4 of 4 (one unit, four places)', s.places === 4 && s.remainingPlaces === 4 && s.units === 1, JSON.stringify({ places: s.places, remaining: s.remainingPlaces, units: s.units }));
const seq = [];
for (const g of ['T001', 'T003', 'G049', 'T002']) { const r = await join(g); s = await sum(pages[g]); seq.push(g + ':' + (r.body && r.body.ok ? 'ok' : r.status) + '→' + s.remainingPlaces); }
note('G2 guests one to four: 3 · 2 · 1 · 0 remaining, then Full', seq.map((x) => x.split('→')[1]).join(',') === '3,2,1,0' && s.soldOut === true, seq.join(' | '));
const fifth = await join('G048');
note('G3 a fifth guest cannot exceed capacity (the engine refuses)', !(fifth.body && fifth.body.ok), JSON.stringify({ status: fifth.status, error: fifth.body && fifth.body.error }));
const unit = (await api(pages.T003, '/api/rooms')).body.units[KEY][0];
note('G4 every guest sees who is in the house (four names, Full)', unit.full && unit.occupants.filter((o) => !o.placeholder).length === 4, JSON.stringify(unit.occupants.map((o) => o.name || '?')));
await api(pages.T003, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', stage: 'wedstay' }) });
s = await sum(pages.T001);
note('G5 a release gives exactly one place back', s.remainingPlaces === 1 && !s.soldOut, JSON.stringify({ remaining: s.remainingPlaces }));
const p2 = await fresh(); await signIn(p2, 'T001'); await p2.reload({ waitUntil: 'load' }); const s2 = await sum(p2);
note('G6 the count survives a reload and a second device (the engine is the one truth)', s2.remainingPlaces === 1 && s2.places === 4, JSON.stringify({ remaining: s2.remainingPlaces }));
for (const g of ['T001', 'T002', 'G049']) await api(pages[g], '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, stage: 'wedstay' }) });
s = await sum(pages.T001);
note('G7 all released: back to 4 of 4', s.remainingPlaces === 4, JSON.stringify({ remaining: s.remainingPlaces }));
/* the room page at three widths */
for (const [w, h] of [[390, 844], [834, 1194], [1440, 900]]) {
  const p = await fresh(w, h); await signIn(p, 'T003');
  await p.goto(O + '/room.html?stay=guesthouse&room=guest-house', { waitUntil: 'load' }); await p.waitForTimeout(1800);
  const t = await p.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' '), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
  const want = [/four shared places/i, /4 of 4 places remaining/i, /4 places available/i, /one-bedroom guest house in central Vientiane/i, /shared by up to four guests/i, /as four shared places/i, /One bedroom/, /Four shared places/];
  const miss = want.filter((r) => !r.test(t.text)).map(String);
  const stale = /six shared|two-bedroom|Two bedrooms|up to six|6 of 6|6 places available/i.test(t.text);
  note('G8-' + w + ' room page: one bedroom · four guests · four shared places · 4 of 4 · 4 places available; no six-place words; no overflow', !miss.length && !stale && !t.overflow, JSON.stringify({ miss, stale, overflow: t.overflow }));
  await p.screenshot({ path: path.join(OUT, 'guesthouse-book-' + w + '.png') });
  await p.evaluate(() => { const d = document.getElementById('details'); if (d) d.scrollIntoView(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'guesthouse-details-' + w + '.png') });
  await p.context().close();
}
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fl = R.filter((r) => !r.ok).length; console.log('\n' + (R.length - fl) + '/' + R.length + ' pass'); process.exit(fl ? 1 : 0);
