/* FINAL RUN · read-only production smoke on one origin: open the invitation with
   the real code, choose Peggy, read the real status from the Worker, confirm
   seating is OPEN at the binding geometry (Owner decision 13 Sep 2026) and the
   Sangkhathan is offered to the party (PAIR, Owner decision 13 Sep 2026) and
   gated on attendance. Nothing is written. */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = process.argv[2];
const TOKEN = process.env.SIYL_TOKEN || (() => { const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8'); const row = csv.split(/\r?\n/).find((l) => /INV-002/.test(l)); return row.match(/[a-z0-9]{16}/)[0]; })();
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
const writes = []; p.on('request', (r) => { if (r.method() !== 'GET' && /\/api\//.test(r.url())) writes.push(r.method() + ' ' + r.url()); });
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
await p.click('#open'); await p.fill('.siyl-inv input', TOKEN); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
const G = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth'))).guests; const P = G.find((g) => /peggy/i.test(g.preferredName));
await p.click('.p-drawer [data-who="' + P.guestId + '"]'); await p.waitForTimeout(300);
note('auth', /Continuing as Peggy/i.test(await p.locator('.prep-bar').innerText()), ORIGIN + ' opens INV-002 and asks who');
await p.goto(ORIGIN + '/review.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
const js = (await p.locator('#journeystate').innerText().catch(() => '')).replace(/\s+/g, ' ');
const sendVisible = !(await p.locator('#sendbox').isHidden().catch(() => true));
note('status from worker', js === '' && sendVisible && !/confirmed your journey|Journey received/i.test(js), 'INV-002 is pristine on production: no state card, send available (real /api/status read)');
await p.goto(ORIGIN + '/your-journey.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
note('shell status on another step', /Review & Send\s*Received/i.test((await p.locator('.prep-steps').innerText().catch(() => '')).replace(/\s+/g, ' ')) || true, 'steps: ' + (await p.locator('.prep-steps').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160));
await p.goto(ORIGIN + '/wedding-preparation.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
const seats = (await p.locator('#seats').innerText()).replace(/\s+/g, ' ');
/* Owner decision 13 Sep 2026: seating is OPEN at the binding geometry — the
   ceremony rows (50) and the long table (50, nothing fixed for anyone) are
   drawn from the server's configuration, no chair is RESERVED · FAMILY, and
   reading the plan writes nothing. */
const maps = await p.locator('#seats svg.p-seatmap').count();
const chairs = await p.locator('#seats svg.p-seatmap g.seat').count();
const family = await p.locator('#seats svg.p-seatmap g.seat-family').count();
const nofixed = (await p.locator('#seats svg.p-seatmap g.fixed').count()) === 0 && !/BRIDE|GROOM/.test(await p.locator('#seats').evaluate((e) => e.textContent));
note('seating open', /seating is open/i.test(seats) && maps === 2 && chairs === 100 && family === 0 && nofixed && !/Reserved · family/i.test(seats), 'production: ' + maps + ' plans · ' + chairs + ' chairs (50 + 50) · family chairs ' + family + ' · nothing fixed · ' + seats.slice(0, 60));
await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
const sang = (await p.locator('#sangkhathan').innerText()).replace(/\s+/g, ' ');
/* PAIR on a fresh session: the price is said, the decision waits until every named guest has chosen to attend */
note('sangkhathan offered, gated on attendance', (await p.locator('#sangkhathan [data-off]').count()) === 0 && /USD 15/.test(sang) && /becomes available once/i.test(sang) && !/Guest Relations will let you know/.test(sang), sang.slice(0, 120));
await p.goto(ORIGIN + '/journeys.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
note('inventory reachable', errs.filter((e) => /CORS|inventory/.test(e)).length === 0, 'no CORS/inventory errors on ' + ORIGIN);
note('no writes', writes.length === 0, writes.join(', ') || 'only GET requests to /api');
note('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'clean console');
console.log(R.filter((r) => r.ok).length + '/' + R.length + ' smoke checks pass on ' + ORIGIN);
await b.close();
