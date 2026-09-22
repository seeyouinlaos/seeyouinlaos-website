/* WEDDING-FIRST COUNTDOWN — E2E on the isolated stage worker (Owner, 22 Sep 2026). WebKit at 320 / 390 / 834×1194 / 1194×834,
   Chromium at 1440; a synthetic guest (T003). The hierarchy (the wedding primary, the journey secondary), the values from the
   clock, the choreography (once, staggered, no layout shift), reduced motion (final at once), the four states rendered in place.
   node docs/acceptance/2026-09-22-countdown/e2e.mjs <scratchpad> <outDir> [origin] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 1200) }); console.log((ok ? "PASS " : "FAIL ") + id + " — " + String(d).slice(0, ok ? 220 : 1200)); };
const b = await chromium.launch(); const wk = await webkit.launch();
const errors = new Map();
const fresh = async (w, opts) => { const ctx = await ((w || 390) <= 430 ? wk : b).newContext(Object.assign((w || 390) <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w || 390, height: 844 } }) : { viewport: { width: w, height: 900 } }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1)); p.on('console', (m) => { if (m.type() === 'error' && !/404|409|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); }); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) {} return { status: r.status, body }; }, [path, init]);
const gr = async (route, body, method) => { const r = await fetch(O + route, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-gr-token': GR }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const need = (p) => p.evaluate(() => { const r = SIYL_GUEST.readiness(); return { ok: r.ok, n: r.need.length, first: r.first ? r.first.href : null, keys: r.need.map((x) => x.key) }; });
const trip = async (p) => { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); };
const mine = async (p) => (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body;
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); const fin = await p.$('#finale [data-finale="pool"]'); if (fin) { await fin.click(); await p.waitForTimeout(300); } await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
/* a guest with nothing to choose: the Vientiane scope, every stage answered as not joining (the journey step complete), the wedding attended — the gate to 04 opens */
const readyForWedding = async (p, email) => { await contact(p, email); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ vientiane: true }); }); await p.waitForTimeout(800); await p.evaluate(async () => { for (const s of SIYL_JOURNEY.open()) { if (s.key === 'c86') SIYL_PRICE.items('c86').forEach((it) => SIYL_BAG.put(it)); else await SIYL_JOURNEY.decline(s); } }); await p.waitForTimeout(800); await wedding(p, 'yes', 'yes'); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); { const gb = await p.$('[data-multi="genres"] [data-pick="Pop"]'); if (gb && (await gb.getAttribute('aria-pressed')) !== 'true') { await gb.click(); await p.waitForTimeout(200); } } for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const resetGuest = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) { await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); await api(p, '/api/rooms/unwait', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); }
  /* the server-side draft too: an empty Bag and no declines pushed as the guest's own save, so the next sign-in restores nothing */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { localStorage.setItem('siyl.bag', '[]'); localStorage.setItem('siyl.skip', '[]'); localStorage.setItem('siyl.skip.by', '{}'); try { await window.SIYL_DRAFT.flush('reset'); } catch (e) {} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by', 'siyl.wait', 'siyl.draft.meta', 'siyl.draft.base'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close(); };




const png = () => { /* a 2×2 PNG, bytes as an array — no canvas needed */ return [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,2,0,0,0,2,8,2,0,0,0,253,212,154,115,0,0,0,22,73,68,65,84,120,156,99,248,207,192,240,31,8,254,255,103,96,0,0,31,15,5,254,203,152,238,140,0,0,0,0,73,69,78,68,174,66,96,130]; };
const uploadPhoto = (p) => p.evaluate(async (bytes) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'image/png' }, body: new Uint8Array(bytes) }); return r.status; }, png());
const VTE = ['vientianePreWedding', 'vientianeWedding'];
const toggle = async (p, key, ms) => { await p.click('[data-scope="' + key + '"]'); await p.waitForTimeout(700); const pv = await p.$('[data-release-confirm]'); if (pv) await p.click('[data-release-confirm]'); await p.waitForTimeout(ms || 1200); return !!pv; };
const clean = (p) => p.evaluate(async () => { SIYL_GUEST.clearScope(); localStorage.setItem('siyl.skip', '[]'); SIYL_BAG.set([]); });

const S = process.argv[2];
const profile = async (p) => { await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForFunction(() => { const c = document.querySelector('#community'); return c && c.getAttribute('data-community') !== 'loading'; }, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(400); };
const measure = (p) => p.evaluate(() => { const c = document.querySelector('#countdown'); const r = c.getBoundingClientRect(); const w = c.querySelector('[data-cd="wedding"]'), j = c.querySelector('[data-cd="journey"]'); /* the layout box (offset*), never the painted one: a transform in flight is not a layout shift */ const box = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), el.offsetWidth, el.offsetHeight]; }; return { sec: box(c), w: box(w), j: box(j), wNum: box(w.querySelector('.pf-num-v')), jNum: box(j.querySelector('.pf-num-v')), wText: (w.querySelector('.pf-num-live') || w.querySelector('.pf-num-v')).innerText, jText: (j.querySelector('.pf-num-live') || j.querySelector('.pf-num-v')).innerText, wSize: parseFloat(getComputedStyle(w.querySelector('.pf-num-v')).fontSize), jSize: parseFloat(getComputedStyle(j.querySelector('.pf-num-v')).fontSize), inClass: c.classList.contains('is-in'), eyebrowOpacity: getComputedStyle(w.querySelector('.pf-cd-eyebrow')).opacity, jNumOpacity: getComputedStyle(j.querySelector('.pf-num')).opacity, wTo: w.querySelector('[data-count-to]') && w.querySelector('[data-count-to]').getAttribute('data-count-to'), jTo: j.querySelector('[data-count-to]') && j.querySelector('[data-count-to]').getAttribute('data-count-to'), ov: document.documentElement.scrollWidth - innerWidth, order: w.compareDocumentPosition(j) & Node.DOCUMENT_POSITION_FOLLOWING ? 'wedding-first' : 'journey-first', grid: getComputedStyle(c).display }; });
const expect = (() => { const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()); const d = (y, m, dd) => Math.round((new Date(y, m, dd) - today) / 86400000); return { w: d(2027, 1, 28), j: d(2027, 1, 21) }; })();

/* ===== 1 · the five viewports: hierarchy, values, choreography, no layout shift ===== */
for (const [w, h, eng, label] of [[320, 568, 'wk', 'iphone-320'], [390, 844, 'wk', 'iphone-390'], [834, 1194, 'wk', 'ipad-portrait'], [1194, 834, 'wk', 'ipad-landscape'], [1440, 900, 'cr', 'desktop']]) {
  const ctx = await (eng === 'wk' ? wk : b).newContext(Object.assign({ viewport: { width: w, height: h } }, eng === 'wk' ? { hasTouch: true, isMobile: w < 500 } : {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(label + ':' + e.message, 1));
  await signIn(p, 'T003'); await profile(p);
  /* the section below the account card: its box before the reveal, then during, then after — the same box every time */
  const m0 = await measure(p);
  await p.evaluate(() => document.querySelector('#countdown').scrollIntoView({ block: 'center' })); await p.waitForTimeout(120); const m1 = await measure(p);
  await p.waitForTimeout(500); const m2 = await measure(p); await shot(p, label + '-countdown-mid');
  await p.waitForTimeout(1700); const m3 = await measure(p); await shot(p, label + '-countdown');
  const stable = [m1, m2, m3].every((m) => m.sec[2] === m0.sec[2] && m.sec[3] === m0.sec[3] && m.w[2] === m0.w[2] && m.w[3] === m0.w[3] && m.j[3] === m0.j[3] && m.wNum[2] === m0.wNum[2] && m.jNum[2] === m0.jNum[2]);
  note('countdown-' + label, m3.order === 'wedding-first' && m3.wSize > m3.jSize * 1.6 && Number(m3.wTo) === expect.w && Number(m3.jTo) === expect.j && Number(m3.wText) === expect.w && Number(m3.jText) === expect.j && m3.inClass && m3.eyebrowOpacity === '1' && m3.jNumOpacity === '1' && stable && m3.ov <= 1 && (w >= 768 ? m3.grid === 'grid' && m3.j[0] > m3.w[0] : m3.j[1] > m3.w[1]), JSON.stringify({ expect, m0: { sec: m0.sec, wNum: m0.wNum, wText: m0.wText, inClass: m0.inClass }, m2: { wText: m2.wText, jText: m2.jText, jNumOpacity: m2.jNumOpacity }, m3: { sec: m3.sec, w: m3.w, j: m3.j, wNum: m3.wNum, jNum: m3.jNum, wText: m3.wText, jText: m3.jText, wSize: m3.wSize, jSize: m3.jSize, grid: m3.grid, ov: m3.ov }, stable }));
  /* the choreography runs once: a community re-render keeps the counts and the reveal */
  await p.evaluate(() => document.dispatchEvent(new CustomEvent('siyl:community'))); await p.waitForTimeout(400); const m4 = await measure(p);
  note('countdown-once-' + label, m4.inClass && Number(m4.wText) === expect.w && Number(m4.jText) === expect.j && m4.sec[3] === m3.sec[3], JSON.stringify({ wText: m4.wText, jText: m4.jText, inClass: m4.inClass }));
  await ctx.close();
}

/* ===== 2 · reduced motion: the final state at once, no movement, the same box ===== */
{
  const ctx = await wk.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set('calm:' + e.message, 1));
  await signIn(p, 'T003'); await profile(p); const c0 = await measure(p);
  await p.evaluate(() => document.querySelector('#countdown').scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); const c1 = await measure(p); await shot(p, 'iphone-390-countdown-reduced-motion');
  note('countdown-reduced-motion', c0.inClass && Number(c0.wText) === expect.w && Number(c0.jText) === expect.j && c0.eyebrowOpacity === '1' && c0.jNumOpacity === '1' && c1.sec[3] === c0.sec[3] && c1.wNum[2] === c0.wNum[2], JSON.stringify({ c0: { inClass: c0.inClass, wText: c0.wText, jText: c0.jText, eyebrowOpacity: c0.eyebrowOpacity }, sameBox: c1.sec[3] === c0.sec[3] }));
  await ctx.close();
}

/* ===== 3 · the four states, rendered in place from a given day (the page's own renderer) ===== */
{
  const p = await fresh(390); await signIn(p, 'T003'); await profile(p);
  const states = {};
  for (const [name, y, m, d] of [['journey-start', 2027, 2, 21], ['journey-day', 2027, 2, 24], ['wedding-day', 2027, 2, 28], ['after-wedding', 2027, 3, 3], ['after-journey', 2027, 4, 1]]) {
    await p.evaluate(([y, m, d]) => { const CM = window.SIYL_COMMUNITY; const old = document.querySelector('#countdown'); old.outerHTML = CM.countdownHtml(new Date(y, m - 1, d)); const c = document.querySelector('#countdown'); c.classList.add('is-in'); CM.wire(c); c.scrollIntoView({ block: 'center' }); }, [y, m, d]);
    await p.waitForTimeout(1800); await shot(p, 'iphone-390-state-' + name);
    states[name] = await p.evaluate(() => { const c = document.querySelector('#countdown'); const w = c.querySelector('[data-cd="wedding"]'), j = c.querySelector('[data-cd="journey"]'); const text = (el) => [...el.querySelectorAll('.pf-cd-eyebrow, .pf-num-live, .pf-num-word .pf-num-v, .pf-num-u, .pf-cd-tail')].map((e) => e.innerText).join(' ').replace(/\s+/g, ' ').trim(); return { wedding: w.getAttribute('data-cd-state'), journey: j.getAttribute('data-cd-state'), w: text(w), j: text(j), zero: /(^|\s)0(\s|$)/.test(text(w)) || /(^|\s)0(\s|$)/.test(text(j)), negative: /-\d/.test(c.innerText) }; });
  }
  note('countdown-states', states['journey-start'].journey === 'today' && /Today/.test(states['journey-start'].j) && states['journey-start'].wedding === 'before' && /7 days/i.test(states['journey-start'].w)
    && states['journey-day'].journey === 'journey' && /day 4 of 16 days/i.test(states['journey-day'].j.replace(/\s+/g, ' ')) && /4 days/i.test(states['journey-day'].w)
    && states['wedding-day'].wedding === 'today' && /Today/.test(states['wedding-day'].w) && states['wedding-day'].journey === 'journey'
    && states['after-wedding'].wedding === 'after' && /Married/.test(states['after-wedding'].w) && /11 of 16 days/i.test(states['after-wedding'].j)
    && states['after-journey'].journey === 'after' && /16 days/i.test(states['after-journey'].j) && /Married/.test(states['after-journey'].w)
    && Object.values(states).every((s) => !s.zero && !s.negative), JSON.stringify(states));
  /* the rest of My Profile is untouched: the community after the countdown, the numbers after the community, the Bag bar below */
  await profile(p); const order = await p.evaluate(() => ({ order: [...document.querySelectorAll('main section, main .prep-sec')].map((s) => s.id).filter(Boolean), bag: !!document.querySelector('.jbar, [data-bag-bar]'), community: (document.querySelector('#community h2') || {}).innerText || '' }));
  note('profile-order-preserved', order.order.indexOf('identity') < order.order.indexOf('countdown') && order.order.indexOf('countdown') < order.order.indexOf('community') && order.order.indexOf('community') < order.order.indexOf('numbers') && order.bag && /of us are joining|guests? ha/i.test(order.community), JSON.stringify(order));
  await p.context().close();
}

note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close(); await wk.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
