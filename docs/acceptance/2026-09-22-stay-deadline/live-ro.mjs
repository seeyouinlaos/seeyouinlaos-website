/* ============================================================================
   THE ACCOMMODATION PASS ON PRODUCTION — READ ONLY (Owner, 22 Sep 2026).
   Public pages and public reads only: no code is entered, no guest is signed
   in, nothing is booked, nothing is written. The authenticated flow is proved
   on the stage with synthetic guests (e2e.mjs); production is only asked what
   it serves and what it refuses.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = process.argv[2], O = (process.argv[3] || 'https://seeyouinlaos-website.suthep-hrg.workers.dev').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 700) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 220 : 700)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const page = async (w, h) => { const ctx = await (w <= 430 ? wk : b).newContext(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: h } }) : { viewport: { width: w, height: h } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(e.message, 1)); return p; };

for (const [w, h, name] of [[390, 844, '390'], [834, 1194, '834x1194'], [1194, 834, '1194x834'], [1440, 900, '1440']]) {
  const p = await page(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1800);
  const bar = await p.evaluate(() => { const el = document.querySelector('[data-stay-bar]'); if (!el) return null; const a = el.querySelector('[data-stay-cta]');
    return { phase: el.getAttribute('data-stay-phase'), days: +el.getAttribute('data-stay-days'), text: el.innerText.replace(/\s+/g, ' ').trim(), cta: a && a.getAttribute('href'), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  const days = Math.round((Date.UTC(2026, 10, 30) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  note('live-bar-' + name, !!bar && bar.days === Math.max(0, days) && bar.phase === (days > 0 ? 'open' : days === 0 ? 'last-day' : 'closed') &&
    /30 November 2026/.test(bar.text) && /of 6 places remaining/.test(bar.text) && bar.cta === 'invitation.html' && bar.ov <= 1 &&
    !/hurry|book now|almost gone|last chance/i.test(bar.text), JSON.stringify(bar));
  await p.evaluate(() => document.querySelector('[data-stay-bar]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, name + '-deadline-bar.jpg'), type: 'jpeg', quality: 72 });
  await p.context().close();
}
{
  const p = await page(1194, 834);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const engine = await p.evaluate(async () => { const r = await fetch('/api/rooms', { cache: 'no-store' }); return { status: r.status, d: await r.json() }; });
  const c = engine.d.complimentary || {};
  note('live-complimentary-is-the-engine', engine.status === 200 && c.key === 'guesthouse/guest-house' && c.max === 6 &&
    typeof c.remaining === 'number' && c.remaining >= 0 && c.remaining <= 6 && c.phase === 'open' && engine.d.summary['stayext/riverside-superior'],
    JSON.stringify({ max: c.max, remaining: c.remaining, taken: c.taken, phase: c.phase, days: c.days, extensionStock: engine.d.summary['stayext/riverside-superior'] && engine.d.summary['stayext/riverside-superior'].sourcePlaces }));
  /* a write without a bearer is refused — nothing is booked by this suite */
  const refused = await p.evaluate(async () => {
    const out = {};
    for (const op of ['extend', 'unextend']) { const r = await fetch('/api/rooms/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-X', guestId: 'X', nights: 2 }) }); out[op] = r.status; }
    return out; });
  note('live-extension-writes-need-a-bearer', refused.extend === 401 && refused.unextend === 401, JSON.stringify(refused));
  await p.context().close();
}
note('live-console-errors', errors.size === 0, errors.size ? [...errors.keys()].slice(0, 3).join(' | ') : 'no script error');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'live-ro.json'), JSON.stringify(R, null, 2));
const bad = R.filter((r) => !r.ok);
console.log(bad.length ? 'FAILED: ' + bad.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed');
process.exit(bad.length ? 1 : 0);
