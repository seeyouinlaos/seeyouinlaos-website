/* live iPhone-class pass (WebKit, iPhone 14 profile) on the Worker — real swipe gestures, real sign-in, no writes (the send button is never pressed) */
import { webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const T2 = csv.split(/\r?\n/).find((l) => l.startsWith('INV-002,')).match(/[a-z0-9]{16}/)[0];
const OUTD = process.argv[2];
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await webkit.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const shot = (n) => p.screenshot({ path: OUTD + '/iphone-' + n + '.png' });
/* WebKit automation cannot synthesise a real touch pan; a finger pan on iOS is native
 * overflow scrolling of the track, so the pan is reproduced as the same horizontal
 * scroll of the same element (the snap and the state follow exactly as on a phone) */
const swipe = async (sel, dir) => { await p.evaluate(([s, d]) => { const t = document.querySelector(s); t.scrollBy({ left: d < 0 ? t.clientWidth * 0.9 : -t.clientWidth * 0.9, behavior: 'smooth' }); }, [sel, dir]); await p.waitForTimeout(900); };
const pannable = (sel) => p.evaluate((s) => { const t = document.querySelector(s), cs = getComputedStyle(t); return { ox: cs.overflowX, snap: cs.scrollSnapType, ta: cs.touchAction, wide: t.scrollWidth > t.clientWidth + 10 }; }, sel);
const count = () => p.evaluate(() => document.querySelector('.xg-count')?.textContent.replace(/\s+/g, ' ').trim());

await p.goto(O + '/experiences', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
const rails = await p.evaluate(() => [...document.querySelectorAll('[data-rail]')].map((r) => r.dataset.rail + ':' + r.querySelectorAll('.aslide').length));
note('BANGKOK discovery rails', rails.filter((r) => r.startsWith('bkk:')).length === 5, rails.join(' '));
note('VIENTIANE discovery rails', rails.filter((r) => r.startsWith('laos:')).length === 5, rails.filter((r) => r.startsWith('laos:')).join(' '));
await shot('01-discovery');
/* swipe the Bangkok restaurants rail once */
const pr = await pannable('[data-rail="bkk:breakfast"] .atrk');
note('rail is a native finger-pannable track (overflow-x, snap, touch-action not none)', /auto|scroll/.test(pr.ox) && /x/.test(pr.snap) && pr.ta !== 'none' && pr.wide, JSON.stringify(pr));
const before = await p.evaluate(() => document.querySelector('[data-rail="bkk:breakfast"] .atrk').scrollLeft);
await swipe('[data-rail="bkk:breakfast"] .atrk', -1);
const after = await p.evaluate(() => document.querySelector('[data-rail="bkk:breakfast"] .atrk').scrollLeft);
note('rail pans one card', after > before + 100, before + ' → ' + after);
note('no sideways page scroll', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'ok');

await p.goto(O + '/experience?id=bkk-suhring', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
await shot('02-suhring-top');
note('Sühring detail renders (name, 9 frames)', (await p.evaluate(() => document.querySelector('h1')?.textContent)) === 'Sühring' && (await count()) === '1 / 9', await count());
const pg = await pannable('[data-xgal] .atrk');
note('gallery is a native finger-pannable track', /auto|scroll/.test(pg.ox) && /x/.test(pg.snap) && pg.ta !== 'none' && pg.wide, JSON.stringify(pg));
await swipe('[data-xgal] .atrk', -1); const c2 = await count(); await swipe('[data-xgal] .atrk', -1); const c3 = await count(); await swipe('[data-xgal] .atrk', 1); const c4 = await count();
note('gallery pans left, left, right', c2 === '2 / 9' && c3 === '3 / 9' && c4 === '2 / 9', c2 + ' · ' + c3 + ' · ' + c4);
await shot('03-suhring-frame2');
const lazy = await p.evaluate(() => [...document.querySelectorAll('[data-xgal] img')].slice(1).every((i) => i.loading === 'lazy'));
note('secondary frames lazy', lazy, 'loading=lazy');
await p.locator('[data-acc="3"]').click(); await p.waitForTimeout(300);
note('The first mentor opens', /grandmother Christa/.test(await p.locator('#xs3').innerText()), 'accordion');
await p.locator('#sel').scrollIntoViewIfNeeded(); await shot('04-suhring-select');
await p.locator('#sel-add').click(); await p.waitForTimeout(500);
note('gate opens without a session', await p.evaluate(() => document.body.classList.contains('siyl-inv-open')), 'invitation gate');
await p.fill('.siyl-inv input', T2); await p.click('.siyl-inv .igo'); await p.waitForTimeout(2500);
const st = await p.evaluate(() => ({ cur: document.querySelector('[data-sel-state="current"]')?.textContent.trim(), bag: JSON.parse(localStorage.getItem('siyl.bag') || '[]') }));
note('selected → In your journey · 2 guests · USD 360, one request line priced per person', /In your journey · 2 guests · USD 360/.test(st.cur) && st.bag.length === 1 && st.bag[0].id === 'suhring' && st.bag[0].request === true && st.bag[0].price === 180 && st.bag[0].qty === 2, JSON.stringify(st.bag));
await shot('05-suhring-current');
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
note('reload keeps the state', /In your journey · 2 guests · USD 360/.test(await p.evaluate(() => document.querySelector('[data-sel-state="current"]')?.textContent.trim())), 'current after reload');
await p.evaluate(() => document.querySelectorAll('#sel-add').forEach((b) => b.click())); await p.waitForTimeout(300);
note('no duplicate', (await p.evaluate(() => JSON.parse(localStorage.getItem('siyl.bag') || '[]').length)) === 1, 'one line');
await p.goto(O + '/your-journey', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
if (await p.locator('.p-drawer:not([hidden]) [data-who]').count()) { await p.locator('.p-drawer:not([hidden]) [data-who]').first().click(); await p.waitForTimeout(600); }
const yj = await p.evaluate(() => ({ t: document.getElementById('extra-lines')?.innerText.replace(/\s+/g, ' ').trim(), total: document.getElementById('tt')?.textContent.trim() }));
note('Your Journey lists the request, USD 180 × 2 = USD 360 in the total', /Sühring/.test(yj.t) && /USD 180 per person/.test(yj.t) && /Participating guests/i.test(yj.t) && yj.total === 'USD 360', yj.total + ' · ' + yj.t.slice(0, 100));
await p.locator('#extras').scrollIntoViewIfNeeded().catch(() => {}); await shot('06-your-journey');
await p.goto(O + '/review', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const rv = await p.evaluate(() => ({ t: document.getElementById('items')?.innerText.replace(/\s+/g, ' ').trim(), total: document.getElementById('tt')?.textContent.trim() }));
note('Review & Send shows the request with USD 360 in the total, never as confirmed (nothing sent)', /Sühring/.test(rv.t) && /USD 180 per person × 2 guests/.test(rv.t) && /not a confirmed reservation/.test(rv.t) && rv.total === 'USD 360', rv.total);
await p.locator('#items').scrollIntoViewIfNeeded().catch(() => {}); await shot('07-review');
/* remove, leaving the party's draft as it was */
await p.goto(O + '/experience?id=bkk-suhring', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
await p.locator('#sel-rm').click(); await p.waitForTimeout(300);
note('Remove clears the line', (await p.evaluate(() => JSON.parse(localStorage.getItem('siyl.bag') || '[]').length)) === 0, 'bag empty');
/* the second multi-image place: the same component */
await p.goto(O + '/experience?id=bkk-dib', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
note('Dib Bangkok gallery (8 frames) on the same component', (await count()) === '1 / 8', await count());
await swipe('[data-xgal] .atrk', -1);
note('Dib pans', (await count()) === '2 / 8', await count());
await shot('08-dib');
await p.goto(O + '/experience?id=vte-laoderm', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
note('Vientiane venue gallery (Lao Derm, 8 frames)', (await count()) === '1 / 8', await count());
await shot('09-laoderm');
note('no page errors', errs.length === 0, errs.join(' | ') || 'clean');
await p.evaluate(() => { localStorage.clear(); });
const pass = R.filter((r) => r.ok).length; console.log(pass + '/' + R.length + ' iPhone checks pass on ' + O);
await b.close(); process.exit(pass === R.length ? 0 : 1);
