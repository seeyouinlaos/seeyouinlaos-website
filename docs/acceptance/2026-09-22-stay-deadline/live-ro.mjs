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
  await p.evaluate(() => { const el = document.querySelector('[data-availability]'); if (el) el.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(2400);
  const two = await p.evaluate(() => {
    const el = document.querySelector('[data-stay-bar]'), av = document.querySelector('[data-availability]');
    if (!el || !av) return null;
    const cta = av.querySelector('[data-av-cta]'), ex = av.querySelector('[data-av-explore]'), arc = av.querySelector('.av-arc');
    return { phase: el.getAttribute('data-stay-phase'), days: +el.getAttribute('data-stay-days'), text: el.innerText.replace(/\s+/g, ' ').trim(),
      barLinks: el.querySelectorAll('a').length, order: el.getBoundingClientRect().bottom <= av.getBoundingClientRect().top + 2,
      remaining: +av.getAttribute('data-av-remaining'), max: +av.getAttribute('data-av-max'), state: av.getAttribute('data-av-state'),
      avElapsed: +av.getAttribute('data-av-elapsed'), barElapsed: +el.getAttribute('data-stay-elapsed'), barRail: !!el.querySelector('[data-stay-rail]'),
      avShare: +((av.getBoundingClientRect().height / window.innerHeight) * 100).toFixed(1),
      ring: Math.round(av.querySelector('.av-ring').getBoundingClientRect().width),
      count: av.querySelector('.av-num').innerText.replace(/\s+/g, ' ').trim(),
      oneLine: (function () { const k = [...av.querySelector('.av-num').children].map((e) => e.getBoundingClientRect());
        return k.every((b, i) => i === 0 || (b.left >= k[i - 1].right - 1 && b.top < k[i - 1].bottom && b.bottom > k[i - 1].top)); })(),
      sideBySide: (function () { const r = av.querySelector('.av-ring').getBoundingClientRect(), w = av.querySelector('.av-words').getBoundingClientRect();
        return w.left > r.right - 1 && Math.abs((w.top + w.height / 2) - (r.top + r.height / 2)) < r.height; })(),
      avText: av.innerText.replace(/\s+/g, ' ').trim(), arc: arc ? getComputedStyle(arc).stroke : '',
      cta: cta && cta.getAttribute('href'), explore: ex && ex.getAttribute('href'), avLinks: av.querySelectorAll('a').length,
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  const days = Math.round((Date.UTC(2026, 10, 30) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
  /* the first signal: the date alone */
  note('live-bar-' + name, !!two && two.days === Math.max(0, days) && two.phase === (days > 0 ? 'open' : days === 0 ? 'last-day' : 'closed') &&
    /30 November 2026/.test(two.text) && !/places remaining/i.test(two.text) && two.barLinks === 0 && two.barRail && two.ov <= 1 &&
    !/hurry|book now|almost gone|last chance/i.test(two.text), JSON.stringify({ phase: two && two.phase, days: two && two.days, text: two && two.text, links: two && two.barLinks }));
  /* the second signal: the engine's count, the one accent, one action, the quiet property link */
  const t0 = Date.UTC(2026, 8, 23), t1 = Date.UTC(2026, 10, 30) + 86400000, nd = new Date();
  const elapsed = +(Math.min(1, Math.max(0, (Date.UTC(nd.getFullYear(), nd.getMonth(), nd.getDate()) - t0) / (t1 - t0)))).toFixed(4);
  note('live-availability-' + name, !!two && two.order && two.max === 6 && two.remaining >= 0 && two.remaining <= 6 &&
    two.count === two.remaining + ' / ' + two.max && two.oneLine && two.sideBySide && two.ring <= 82 && two.avShare <= 42 &&
    /Wedding Stay · Limited availability/i.test(two.avText) && /Complimentary Wedding Stay/.test(two.avText) &&
    /while places remain\./.test(two.avText) && !/Private Residence/i.test(two.avText) &&
    /availability may close earlier/.test(two.avText) &&
    two.avElapsed === elapsed && two.barElapsed === elapsed &&
    two.arc === 'rgb(116, 7, 14)' && two.cta === 'invitation.html' && two.explore === 'accommodation.html#residence' &&
    two.avLinks === 2 && two.state === 'settled' && !/hurry|book now|almost gone|last chance/i.test(two.avText), JSON.stringify(two));
  await p.screenshot({ path: path.join(OUT, name + '-two-signals.jpg'), type: 'jpeg', quality: 72 });
  await p.context().close();
}
{
  const p = await page(1194, 834);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const engine = await p.evaluate(async () => { const r = await fetch('/api/rooms', { cache: 'no-store' }); return { status: r.status, d: await r.json() }; });
  const c = engine.d.complimentary || {};
  note('live-complimentary-is-the-engine', engine.status === 200 && c.key === 'guesthouse/guest-house' && c.max === 6 &&
    typeof c.remaining === 'number' && c.remaining >= 0 && c.remaining <= 6 && c.phase === 'open' && !engine.d.summary['stayext/riverside-superior'] && !engine.d.summary['riverside/superior-window'],
    JSON.stringify({ max: c.max, remaining: c.remaining, taken: c.taken, phase: c.phase, days: c.days, extensionStock: engine.d.summary['stayext/riverside-superior'] ? 'STILL THERE' : 'withdrawn',
      riversideStock: engine.d.summary['riverside/superior-window'] ? 'STILL THERE' : 'retired' }));
  /* a write without a bearer is refused — nothing is booked by this suite */
  const refused = await p.evaluate(async () => {
    const out = {};
    /* THE SELF-SERVICE EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): production must not answer these at all */
    for (const op of ['extend', 'unextend']) { const r = await fetch('/api/rooms/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-X', guestId: 'X', nights: 2 }) }); out[op] = r.status; }
    return out; });
  note('live-has-no-extension-operation', refused.extend === 404 && refused.unextend === 404, JSON.stringify(refused));
  await p.context().close();
}
note('live-console-errors', errors.size === 0, errors.size ? [...errors.keys()].slice(0, 3).join(' | ') : 'no script error');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'live-ro.json'), JSON.stringify(R, null, 2));
const bad = R.filter((r) => !r.ok);
console.log(bad.length ? 'FAILED: ' + bad.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed');
process.exit(bad.length ? 1 : 0);
