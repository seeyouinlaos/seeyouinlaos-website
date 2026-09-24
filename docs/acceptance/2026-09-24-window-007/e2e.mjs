/* ============================================================================
   WINDOW 007 · LANGUAGE IMPLEMENTATION — the stage proof (24 Sep 2026).

     node e2e.mjs [synth-codes.json] [stage .dev.vars] [out-dir] [origin]

   LOCAL STAGE ONLY (wrangler dev, synthetic register). Never production.
   Synthetic guests: T001 Ada + T002 Ben (one party) · T003 Cleo · G048/G049
   (synthetic hosts). The Guest Relations token is read from the stage's
   .dev.vars and never printed or written.

   Every journey asserts the approved copy of the final language package
   (rewrite/final2/package.json · glossary + Owner resolutions OQ-03/10/45)
   and the behaviour behind it, not only that a page loads.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';

const T = '/private/tmp/claude-501/-Users-thongantang--codex--chatgpt-projects-g-p-69d7e35621808191994b683d453244bf-seeyouinlaos-website/d5f48d27-a903-48b0-a354-134d90b6eb57/scratchpad';
const CODES = process.argv[2] || T + '/synth-codes.json';
const DEVVARS = process.argv[3] || T + '/stage/.dev.vars';
const OUT = process.argv[4] || path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
const O = (process.argv[5] || 'http://127.0.0.1:8788').replace(/\/$/, '');
if (/workers\.dev|seeyouinlaos\.com/.test(O)) { console.error('REFUSED: this script runs on the local stage only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(CODES, 'utf8'));
const GR = (fs.readFileSync(DEVVARS, 'utf8').match(/^GR_TOKEN\s*=\s*"?([^"\n]+)"?/m) || [])[1] || '';

const R = [];
const J = {};                      /* journey → [check ids] */
let CUR = 'setup';
const note = (id, ok, d) => { R.push({ journey: CUR, id, ok: !!ok, d: String(d).slice(0, 1200) }); (J[CUR] = J[CUR] || []).push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + '[' + CUR + '] ' + id + ' — ' + String(d).slice(0, ok ? 220 : 1200)); };
const OBS = [];                    /* observations that are not pass/fail */
const obs = (id, d) => { OBS.push({ journey: CUR, id, d: String(d).slice(0, 1500) }); console.log('NOTE [' + CUR + '] ' + id + ' — ' + String(d).slice(0, 400)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const ctxs = [];
const fresh = async (w, h, opts) => {
  const width = w || 1440, height = h || 900, mobile = width <= 430;
  const ctx = await (mobile ? wk : b).newContext(Object.assign(mobile ? Object.assign({}, devices['iPhone 13'], { viewport: { width, height } }) : { viewport: { width, height } }, { acceptDownloads: true }, opts || {}));
  ctxs.push(ctx);
  /* __T: the words an element shows, from its text nodes (never the CSS capitals of a label), without scripts or [hidden] */
  await ctx.addInitScript(() => { window.__T = (el) => { if (!el || !el.nodeType) return ''; const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; return p && p.closest('script,style,template,noscript,[hidden]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }); let n; while ((n = w.nextNode())) out.push(n.nodeValue); return out.join(' ').replace(/\s+/g, ' ').replace(/ ([.,;:?!’”)])/g, '$1').replace(/([“(]) /g, '$1').trim(); }; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|409|401|403|422|423|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); });
  return p;
};
const shot = async (p, name, el) => { try { if (el) { const h = await p.$(el); if (h) { await h.screenshot({ path: path.join(OUT, name + '.png') }); return name + '.png'; } } await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); return name + '.png'; } catch (e) { return 'screenshot failed: ' + e.message; } };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
};
const api = (p, u, init) => p.evaluate(async ([u, i]) => {
  const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); const h = { 'content-type': 'application/json' }; if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
  const r = await fetch(u, Object.assign({ headers: h, cache: 'no-store' }, i || {})); return { status: r.status, body: await r.json().catch(() => null) };
}, [u, init]);
const gr = async (u, body) => { const r = await fetch(O + u, body ? { method: 'POST', headers: { 'x-gr-token': GR, 'content-type': 'application/json' }, body: JSON.stringify(body) } : { headers: { 'x-gr-token': GR } }); return { status: r.status, body: await r.json().catch(() => null) }; };
const words = (p) => p.evaluate(() => { const D = window.SIYL_DRAFT; return D && D.words ? D.words() : null; });
const hdr = (p) => p.evaluate(() => ({ state: ((document.querySelector('.prep-state') || {}).textContent || '').trim(), cta: ((document.querySelector('.prep-send-upd') || {}).textContent || '').trim() }));
const waitKey = async (p, key, ms) => { try { await p.waitForFunction((k) => { const D = window.SIYL_DRAFT; return D && D.words && D.words().key === k; }, key, { timeout: ms || 15000 }); return true; } catch (e) { return false; } };
const settle = async (p) => { await p.evaluate(() => window.SIYL_DRAFT && SIYL_DRAFT.flush ? SIYL_DRAFT.flush('save') : null).catch(() => {}); await p.waitForTimeout(600); await p.evaluate(() => window.SIYL_DRAFT && SIYL_DRAFT.refresh ? SIYL_DRAFT.refresh() : null).catch(() => {}); await p.waitForTimeout(500); };
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? __T(e).trim() : null; }, sel);
const today = (() => { const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; const d = new Date(); return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(); })();
const journey = async (name, fn) => {
  CUR = name; console.log('\n=== ' + name);
  try { await fn(); } catch (e) { note('EXCEPTION', false, (e && e.stack || String(e)).slice(0, 900)); }
};
/* the strings of a PDF drawn by assets/seatpass.js (literal Tj strings, Flate streams inflated) */
import zlib from 'node:zlib';
const pdfText = (buf) => { const out = []; const raw = buf.toString('latin1'); const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g; let m; while ((m = re.exec(raw))) { let s = Buffer.from(m[1], 'latin1'); try { s = zlib.inflateSync(s); } catch (e) {} const t = s.toString('latin1'); const tj = /\(((?:\\.|[^\\)])*)\)\s*Tj/g; let q; while ((q = tj.exec(t))) out.push(q[1].replace(/\\267/g, '·').replace(/\\227/g, '—').replace(/\\([()\\])/g, '$1')); } return out; };
const need = (p) => p.evaluate(() => window.SIYL_GUEST.readiness().need.map((n) => n.key));
const cleanup = [];                /* what the run took and gave back */

/* ---------------------------------------------------------------- START STATE */
const START = {};
{
  CUR = 'setup';
  for (const id of ['T001', 'T002', 'T003', 'G048', 'G049']) {
    const p = await fresh(); await signIn(p, id);
    START[id] = await p.evaluate(async () => {
      const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer };
      const rooms = await (await fetch('/api/rooms/mine', { headers: h })).json().catch(() => null);
      const seats = await (await fetch('/api/seating', { headers: h })).json().catch(() => null);
      const D = window.SIYL_DRAFT, G = window.SIYL_GUEST;
      return { words: D.words(), scope: G.scope(), bag: SIYL_BAG.get().map((x) => x.id + (x.unit ? ':' + x.unit : '')), rooms: rooms && rooms.mine, wait: rooms && rooms.waitlist, seats: seats && seats.mine, fullName: G.value(a.guestId, 'fullName') };
    });
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'start-state.json'), JSON.stringify(START, null, 1));
  console.log('start state recorded');
}
const surname = (id) => { const f = String(START[id].fullName || '').trim().split(/\s+/); return f.length > 1 ? f[f.length - 1] : ''; };

/* ================================================================ J19 · 404 */
await journey('J19 404 page', async () => {
  for (const [w, h, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
    const p = await fresh(w, h);
    const r = await p.goto(O + '/no-such-page-w007', { waitUntil: 'load' });
    const t = await p.evaluate(() => ({ title: document.title, h1: (document.querySelector('h1') || {}).textContent || '', body: __T(document.body), links: [...document.querySelectorAll('.nf-links a')].map((a) => a.textContent.trim() + '→' + a.getAttribute('href')), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    note('404-' + tag + ' status 404, “This page is not part of the journey.”, a way back, no overflow', r.status() === 404 && /This page is not part of the journey\./.test(t.body) && /The link may be old or mistyped/.test(t.body) && t.links.length >= 1 && !t.overflow, JSON.stringify({ status: r.status(), ...t, body: t.body.slice(0, 200) }));
    await shot(p, 'J19-404-' + tag);
    const deep = await p.goto(O + '/a/b/c/nothing', { waitUntil: 'load' });
    const css = await p.evaluate(() => [...document.styleSheets].length);
    note('404-' + tag + ' deep address still styled (root-relative assets)', deep.status() === 404 && css > 0, 'status ' + deep.status() + ' · stylesheets ' + css);
    await p.context().close();
  }
});

/* ======================================================== J01 · FIRST-TIME GUEST · STEP 01 */
await journey('J01 first-time guest · step 01', async () => {
  for (const [w, h, tag] of [[390, 844, '390'], [1440, 900, '1440']]) {
    const p = await fresh(w, h); await signIn(p, 'G048');
    await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('#go'); await p.waitForTimeout(800);
    if (tag === '1440') obs('G048 header before any answer', JSON.stringify(await hdr(p)) + ' · words ' + JSON.stringify((await words(p)).key));
    /* the first-time state: clear what an earlier run may have left, so every required field is empty */
    for (const k of ['email', 'phone', 'birthdate', 'nationality', 'address1', 'address2', 'postal', 'city', 'region', 'country']) { if (await p.$('#p-' + k)) { await p.fill('#p-' + k, ''); await p.dispatchEvent('#p-' + k, 'change'); } }
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => [...document.querySelectorAll('label.p-lab')].map((l) => [l.getAttribute('for'), ((l.querySelector('.p-mark') || {}).textContent || '')]));
    const opt = m.filter((x) => x[1] === 'Optional').map((x) => x[0]).sort(), req = m.filter((x) => x[1] === 'Required').map((x) => x[0]);
    note('01.1-' + tag + ' one quiet marker per field: “Required” on every required field, “Optional” only on Address line 2 and Region', JSON.stringify(opt) === JSON.stringify(['p-address2', 'p-region']) && req.length === m.length - 2 && req.includes('p-email') && req.includes('p-country'), JSON.stringify(m));
    if (tag === '1440') await p.click('#go', { force: true }); else await p.tap('#go', { force: true });
    await p.waitForTimeout(700);
    const v = await p.evaluate(() => ({ url: location.pathname, needed: [...document.querySelectorAll('.p-field.is-needed input')].map((i) => i.id), invalid: [...document.querySelectorAll('input[aria-invalid="true"]')].map((i) => i.id), msg: { email: (document.querySelector('#e-email') || {}).textContent || '', city: ((document.querySelector('#p-city') || {}).closest ? __T(document.querySelector('#p-city').closest('.p-field')) : '') }, note: (document.querySelector('.prep-foot-note') || {}).textContent || '', focus: document.activeElement && document.activeElement.id }));
    note('01.2-' + tag + ' Continue with empty fields stays on step 01, marks each missing field, focuses the first', /invitation/.test(v.url) && v.needed.length === 8 && v.invalid.includes('p-email') && v.focus === 'p-email', JSON.stringify({ url: v.url, needed: v.needed, focus: v.focus }));
    note('01.3-' + tag + ' validation NAMES the field: “Please add your email address.”, “Please add your city.”; the foot names them all', /Please add your email address\./.test(v.msg.email) && /Please add your city\./.test(v.msg.city) && /8 details are still needed before you continue: Email address, Mobile number, Date of birth, Nationality, Street and house number, Postcode or ZIP code, City and Country\./.test(v.note), JSON.stringify({ email: v.msg.email, city: v.msg.city.slice(0, 80), note: v.note }));
    await shot(p, 'J01-step01-validation-' + tag, tag === '1440' ? '#personal' : null);
    if (tag === '1440') {
      /* one field left: the foot says exactly which */
      for (const [k, val] of [['email', 'bride.test@example.org'], ['phone', '+66 81 111 2222'], ['birthdate', '1990-02-02'], ['nationality', 'Testland'], ['address1', '2 Test Street'], ['postal', '10000'], ['city', 'Testcity']]) { await p.fill('#p-' + k, val); await p.dispatchEvent('#p-' + k, 'change'); await p.waitForTimeout(80); }
      await p.click('#go', { force: true }); await p.waitForTimeout(600);
      const one = await txt(p, '.prep-foot-note');
      note('01.4 one detail left → “One detail is still needed before you continue: Country.”', /One detail is still needed before you continue: Country\./.test(one || ''), one);
      await p.fill('#p-country', 'Testland'); await p.dispatchEvent('#p-country', 'change'); await p.waitForTimeout(300);
      await p.click('#go', { force: true }); await p.waitForURL(/your-journey/, { timeout: 10000 }).catch(() => {});
      note('01.5 complete → Continue opens My Trip', /your-journey/.test(p.url()), p.url());
      await settle(p);
    }
    await p.context().close();
  }
});

/* ======================================================== J02 · RETURNING UNSENT GUEST */
await journey('J02 returning unsent guest', async () => {
  const p = await fresh(1440, 900); await signIn(p, 'G048');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(1500);
  const h = await hdr(p), w = await words(p);
  note('02.1 the step header reads “My Trip · not sent yet”, no send link', h.state === 'My Trip · not sent yet' && !h.cta && w.key === 'draft', JSON.stringify({ h, key: w.key }));
  await shot(p, 'J02-returning-unsent-header-1440', '.prep-bar-in, #prep-bar, header');
  const g = await p.goto(O + '/review.html', { waitUntil: 'load' }).then(() => p.waitForTimeout(2500)).then(() => p.url());
  note('02.2 Review before the trip is complete leads to the first missing answer (the gate), not to a send button', !/review/.test(new URL(g).pathname), g);
  await p.context().close();
});

/* ======================================================== G048 · COMPLETE THE TRIP (scope · wedding · seats · About You) */
let SEAT1 = null, SEAT2 = null;
await journey('J11 wedding seat hold / change', async () => {
  const p = await fresh(1440, 900); await signIn(p, 'G048');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(1200);
  for (const k of ['bangkok', 'vientianePreWedding', 'china']) { if ((await p.getAttribute('[data-scope="' + k + '"]', 'aria-checked')) === 'true') { await p.click('[data-scope="' + k + '"]'); await p.waitForTimeout(450); const pv = await p.$('[data-release-confirm]'); if (pv) { await pv.click(); await p.waitForTimeout(600); } } }
  if ((await p.getAttribute('[data-scope="vientianeWedding"]', 'aria-checked')) !== 'true') { await p.click('[data-scope="vientianeWedding"]'); await p.waitForTimeout(500); }
  await p.waitForTimeout(800);
  if (await p.$('[data-skip="wedstay"]')) { await p.click('[data-skip="wedstay"]'); await p.waitForTimeout(1200); }
  const nd = await need(p); obs('G048 needs after scope (setup)', nd.join(', '));
  /* The Wedding: attending every part; the finale */
  await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) { const btn = await p.$('[data-e] [data-ev="yes"][aria-pressed="false"]'); if (!btn) break; await btn.click(); await p.waitForTimeout(400); }
  const fin = await p.$('[data-finale="baron"]'); if (fin && (await fin.getAttribute('aria-pressed')) !== 'true') { await fin.click(); await p.waitForTimeout(400); }
  const off = await p.$('[data-off="no"]'); if (off && (await off.getAttribute('aria-pressed')) !== 'true') { await off.click(); await p.waitForTimeout(300); }
  /* Wedding Preparation: the dress code, then the dinner seat */
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  if (await p.$('[data-ack]:not(:checked)')) { await p.click('[data-ack]'); await p.waitForTimeout(800); }
  await p.waitForSelector('[data-seatmap="dinner"]', { timeout: 15000 });
  const plan = await p.evaluate(() => {
    const box = document.querySelector('[data-ev="dinner"]'); if (!box) return null;
    const seats = [...box.querySelectorAll('g.seat')].map((g) => g.getAttribute('data-label'));
    return { n: seats.length, labels: seats, has13: seats.filter((l) => /^[AB]13$/.test(l)), a12a: seats.filter((l) => /12[AB]$/.test(l)), table: [...box.querySelectorAll('text')].map((t) => t.textContent).filter((t) => /long table/i.test(t)), sides: __T(box).match(/Side [AB][^·]*·[^·]*·[^A-Z]*/g), state: document.querySelector('[data-seatmap="dinner"]').getAttribute('data-state'), card: __T(document.querySelector('[data-seatmap="dinner"]')).slice(0, 300) };
  });
  const sideWords = await p.evaluate(() => document.querySelector('[data-ev="dinner"]').textContent.replace(/\s+/g, ' '));
  note('11.1 dinner plan: 48 chairs, no A13 / B13, no A12A / B12B, “One long table · 48 seats”', plan && plan.n === 48 && !plan.has13.length && !plan.a12a.length && plan.table.some((t) => t === 'One long table · 48 seats'), JSON.stringify({ n: plan && plan.n, has13: plan && plan.has13, table: plan && plan.table, first: plan && plan.labels.slice(10, 16) }));
  note('11.2 the two sides read “Side A · 24 seats · poolside” and “Side B · 24 seats · facing the pool”', /Side A · 24 seats · poolside/.test(sideWords) && /Side B · 24 seats · facing the pool/.test(sideWords), sideWords.match(/Side [AB][^]{0,40}/g));
  await shot(p, 'J11-dinner-plan-1440', '[data-seatmap="dinner"]');
  /* choose a free chair far from the hosts' end */
  const free = await p.evaluate(() => [...document.querySelectorAll('[data-ev="dinner"] g.seat-available[data-seat]')].map((g) => g.getAttribute('data-label')));
  SEAT1 = free.find((l) => /^A(5|6|7|8)$/.test(l)) || free[3]; SEAT2 = free.find((l) => l !== SEAT1 && /^A(9|10|11)$/.test(l)) || free[6];
  const alreadyHeld = plan && /Held for you|Placed for you/.test(plan.card);
  obs('dinner card before choosing', JSON.stringify({ state: plan && plan.state, card: plan && plan.card.slice(0, 160), alreadyHeld }));
  note('11.3 before a choice the card asks “Choose your dinner seat” with “Tap an available seat on the plan, then “Hold this seat”.”', plan && /Choose your dinner seat/.test(plan.card) && /Tap an available seat on the plan, then “Hold this seat”\./.test(plan.card), plan && plan.card);
  await p.click('[data-ev="dinner"] g[data-seat][data-label="' + SEAT1 + '"]', { force: true }); await p.waitForTimeout(600);
  const bar1 = await txt(p, '.p-seatbar');
  note('11.4 a tapped chair: the bar names the seat, “not held yet”, and the action “Hold this seat” (Cancel beside it)', /Seat /.test(bar1 || '') && /not held yet/.test(bar1 || '') && /Hold this seat/.test(bar1 || '') && /Cancel/.test(bar1 || ''), bar1);
  await shot(p, 'J11-seatbar-hold-1440', '.p-seatbar');
  const seq = [];
  await p.evaluate(() => { window.__seq = []; const bar = document.querySelector('.p-seatbar'); const mo = new MutationObserver(() => { const b = document.querySelector('[data-seat-confirm]'); if (b) window.__seq.push(b.textContent); }); mo.observe(bar, { subtree: true, childList: true, characterData: true }); });
  await p.click('[data-seat-confirm]'); await p.waitForTimeout(2500);
  seq.push(...(await p.evaluate(() => window.__seq || [])));
  const held = await txt(p, '[data-seatmap="dinner"]');
  note('11.5 “Hold this seat” → “Holding…” → the card “Held for you · Your dinner seat · ' + SEAT1 + '”', /Held for you/.test(held || '') && new RegExp('\\b' + SEAT1 + '\\b').test(held || '') && !/Confirmed/.test(held || ''), JSON.stringify({ seq: [...new Set(seq)], card: (held || '').slice(0, 220) }));
  obs('seat button sequence', JSON.stringify([...new Set(seq)]));
  cleanup.push({ what: 'G048 dinner seat', taken: SEAT1 });
  await shot(p, 'J11-seat-held-1440', '[data-seatmap="dinner"]');
  /* change: Change seat → another chair → “Move to this seat” */
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
  const ch = await p.$('[data-seatmap="dinner"] [data-seat-change]');
  if (!ch) { note('11.6 a held seat offers a change', false, await txt(p, '[data-seatmap="dinner"]')); }
  else {
    await ch.click(); await p.waitForTimeout(700);
    const changing = await txt(p, '[data-seatmap="dinner"]');
    note('11.6 changing: “Seat ' + SEAT1 + ' stays yours until you move.” and “Keep seat ' + SEAT1 + '”', new RegExp('Seat ' + SEAT1 + ' stays yours until you move').test(changing || '') && new RegExp('Keep seat ' + SEAT1).test(changing || ''), (changing || '').slice(0, 300));
    await p.click('[data-ev="dinner"] g[data-seat][data-label="' + SEAT2 + '"]', { force: true }); await p.waitForTimeout(600);
    const bar2 = await txt(p, '.p-seatbar');
    note('11.7 the bar reads “Change of seat”, ' + SEAT1 + ' → ' + SEAT2 + ', the action “Move to this seat”', /Change of seat/.test(bar2 || '') && /Move to this seat/.test(bar2 || '') && new RegExp('Keep seat ' + SEAT1).test(bar2 || ''), bar2);
    await shot(p, 'J11-seatbar-move-1440', '.p-seatbar');
    await p.click('[data-seat-confirm]'); await p.waitForTimeout(2500);
    const moved = await txt(p, '[data-seatmap="dinner"]');
    const mine = await api(p, '/api/seating');
    const dinnerMine = mine.body && mine.body.mine && mine.body.mine.dinner;
    note('11.8 moved: the card holds ' + SEAT2 + ' (“Held for you”), the ledger holds exactly one dinner chair for G048', /Held for you/.test(moved || '') && new RegExp('\\b' + SEAT2 + '\\b').test(moved || '') && dinnerMine && Object.keys(dinnerMine).length === 1, JSON.stringify({ card: (moved || '').slice(0, 200), mine: dinnerMine }));
  }
  await settle(p);
  await p.context().close();
});

/* ======================================================== J12 · ABOUT YOU */
await journey('J12 About You', async () => {
  const p = await fresh(1440, 900); await signIn(p, 'G048');
  await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const q = await p.evaluate(() => { const f = (k) => { const e = document.getElementById('q-' + k); return e ? { state: (e.querySelector('[data-q-state]') || {}).textContent, h: (e.querySelector('h3') || {}).textContent, hint: (e.querySelector('.t-b2') || {}).textContent } : null; }; return { flavor: f('flavor'), genres: f('genres'), music: f('music'), choices: [...document.querySelectorAll('[data-choice="flavor"] [data-pick]')].map((b) => b.textContent), genreChoices: [...document.querySelectorAll('[data-multi="genres"] [data-pick]')].map((b) => b.textContent) }; });
  note('12.1 Q06 heading “What makes you dance?” with the hint “The wedding playlist is built from your answers — choose every genre you would dance to.”, marker “06 · Required”', q.genres && q.genres.h === 'What makes you dance?' && q.genres.hint === 'The wedding playlist is built from your answers — choose every genre you would dance to.' && q.genres.state === '06 · Required', JSON.stringify(q.genres));
  note('12.2 Q03 “My favourite flavour”, the choice reads “Matcha green tea” (display form), “Thai & Lao favourites” is a genre', q.flavor && q.flavor.h === 'My favourite flavour' && q.choices.includes('Matcha green tea') && !q.choices.includes('Matcha Green Tea') && q.genreChoices.some((g) => /Thai & Lao favourites/.test(g)), JSON.stringify({ flavor: q.flavor, choices: q.choices, thai: q.genreChoices.filter((g) => /Thai/.test(g)) }));
  note('12.3 question 07 is the only “Optional” question marker', q.music && /07 · Optional/.test(q.music.state), JSON.stringify(q.music));
  /* answer everything */
  const al = await p.$('[data-allergy="no"]'); if (al && (await al.getAttribute('aria-pressed')) !== 'true') { await al.click(); await p.waitForTimeout(400); }
  for (const [k, v] of [['coffeetea', 'Tea, no sugar'], ['drink', 'Lemonade'], ['film', 'In the Mood for Love']]) { const t = await p.$('textarea[data-q="' + k + '"]'); if (t) { await t.fill(v); await t.dispatchEvent('change'); await p.waitForTimeout(150); } }
  await p.click('[data-choice="flavor"] [data-pick="Matcha Green Tea"]'); await p.waitForTimeout(300);
  const gb = await p.$$('[data-multi="genres"] [data-pick]'); for (const g of gb.slice(0, 2)) { if ((await g.getAttribute('aria-checked')) !== 'true') { await g.click(); await p.waitForTimeout(250); } }
  const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.isChecked())) { await pa.check(); await p.waitForTimeout(400); }
  const cnt = await txt(p, '[data-multi-count="genres"]');
  note('12.4 two genres pressed → “2 genres chosen”', cnt === '2 genres chosen', cnt);
  await shot(p, 'J12-about-you-q06-1440', '#q-genres');
  await shot(p, 'J12-about-you-flavour-1440', '#q-flavor');
  await settle(p);
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const nd = await need(p);
  note('12.5 G048 is ready to send: Review opens (no gate) and nothing is still needed', nd.length === 0 && /review/.test(p.url()), JSON.stringify({ nd, url: p.url() }));
  await p.context().close();
});

/* ======================================================== J08 / J09 · ROOMS: HOLD · KEPT PLACE · CHANGE · RELEASE */
const WIN = 'prewed', SLUG = 'heritage', KEY = WIN + '/' + SLUG;
const unitsOf = async (p) => (await api(p, '/api/rooms')).body.units[KEY];
await journey('J08 room hold / change / release', async () => {
  const ada = await fresh(1440, 900); await signIn(ada, 'T001');
  const cleo = await fresh(1440, 900); await signIn(cleo, 'T003');
  /* the counting words before anything is taken */
  await cleo.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await cleo.waitForTimeout(2500);
  const av0 = await cleo.evaluate((s) => { const r = document.querySelector('#j-prewed .var.vroom[data-room="' + s + '"]'); return r ? ((r.querySelector('.vav') || {}).textContent || '') : null; }, SLUG);
  const allAv = await cleo.evaluate(() => [...document.querySelectorAll('#j-prewed .var.vroom')].map((r) => r.getAttribute('data-room') + ': ' + ((r.querySelector('.vav') || {}).textContent || '')));
  note('08.1 The Journey · counting words “5 of 5 rooms left” (never “available”)', av0 === '5 of 5 rooms left' && !allAv.some((a) => /available/i.test(a)), JSON.stringify(allAv));
  /* Ada holds Room A from The Journey */
  await ada.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await ada.waitForTimeout(2500);
  const row = '#j-prewed .var.vroom[data-room="' + SLUG + '"]';
  await ada.click(row + ' [data-row-select]'); await ada.waitForSelector('#j-prewed .vunits .p-unit', { timeout: 8000 });
  const ch0 = await ada.evaluate(() => ({ head: (document.querySelector('#j-prewed .vuh') || {}).textContent, rows: [...document.querySelectorAll('#j-prewed .vunits .p-unit')].map((u) => __T(u)) }));
  note('08.2 the chooser: “Who is already in each room”, each room “empty · 2 places” with “Choose this room”', ch0.head === 'Who is already in each room' && ch0.rows.length === 5 && ch0.rows.every((r) => /empty · 2 places/.test(r) && /Choose this room/.test(r)), JSON.stringify(ch0));
  await ada.click('#j-prewed .vunits .p-unit[data-unit="A"] [data-join]'); await ada.waitForTimeout(2500);
  const u1 = await unitsOf(ada);
  cleanup.push({ what: 'T001 room prewed/heritage', taken: 'A (+1 kept for Ben)' });
  const sel = await ada.evaluate(() => ({ sel: ((document.querySelector('#j-prewed .vsel') || {}).textContent || ''), stsel: (__T((document.querySelector('[data-stayact="prewed"] .stsel') || {})) || '').replace(/\s+/g, ' '), av: [...document.querySelectorAll('#j-prewed .var.vroom .vav')].map((x) => x.textContent) }));
  note('08.3 Ada holds Room A for her party: the engine holds Ada + one kept place; The Journey says “Held for you · Room A”', u1.find((u) => u.label === 'A').taken === 2 && /Held for you/.test(sel.stsel + sel.sel) && sel.av.some((a) => a === 'Held for you · Room A'), JSON.stringify(sel));
  await shot(ada, 'J08-ada-held-journey-1440', '#j-prewed');
  const stWord = (sel.stsel.match(/^(Held for you|Selected · not sent yet|Selected|Sent to us|Changes not sent yet)/) || [])[1] || sel.stsel.slice(0, 40);
  note('08.3b The Journey’s stay line names the held room with the same state word as its row and My Trip (“Held for you”)', stWord === 'Held for you', JSON.stringify({ journeyStayLine: stWord, row: sel.sel, draftLineState: await ada.evaluate(() => SIYL_DRAFT.lineState(SIYL_BAG.get().find((x) => x.id === 'prewed')).label) }));
  await cleo.reload({ waitUntil: 'load' }); await cleo.waitForTimeout(2500);
  const av1 = await cleo.evaluate((s) => ((document.querySelector('#j-prewed .var.vroom[data-room="' + s + '"] .vav') || {}).textContent || ''), SLUG);
  note('08.4 another guest now reads “4 of 5 rooms left”', av1 === '4 of 5 rooms left', av1);
  await cleo.click(row + ' [data-row-select]').catch(() => {}); await cleo.waitForSelector('#j-prewed .vunits .p-unit', { timeout: 8000 }).catch(() => {});
  const cRows = await cleo.evaluate(() => [...document.querySelectorAll('#j-prewed .vunits .p-unit')].map((u) => __T(u)));
  const sA = surname('T001'), sB = surname('T002');
  note('08.5 Cleo’s chooser: Room A shows “Ada” by first name only (never a surname), and is Full to her', /Ada/.test(cRows[0] || '') && /Full/.test(cRows[0] || '') && (!sA || !cRows.join(' ').includes(sA)) && (!sB || !cRows.join(' ').includes(sB)), JSON.stringify({ rowA: cRows[0], surnames: [sA, sB] }));
  await shot(cleo, 'J08-cleo-chooser-1440', '#j-prewed');
  /* My Trip: the stay card */
  await ada.goto(O + '/your-journey.html', { waitUntil: 'load' }); await ada.waitForTimeout(3000);
  const card = await txt(ada, '#stay-prewed');
  note('08.6 My Trip: “Held for you”, “Your room · Room A”, the occupancy sentence with the kept place for Ben (first name)', /Held for you/.test(card || '') && /Your room · Room A/.test(card || '') && /Room A has two sleeping places\. You hold one; one is kept for Ben\./.test(card || '') && (!sB || !(card || '').includes(sB)), (card || '').slice(0, 500));
  await shot(ada, 'J08-ada-mytrip-held-1440', '#stay-prewed');
  /* change the room from My Trip */
  await ada.click('[data-rooms-for="prewed"]'); await ada.waitForTimeout(1500);
  const box = await txt(ada, '[data-rooms-box="prewed"]');
  note('08.7 My Trip · Change room opens “Move to another room” with the rooms and who is in them', /Move to another room/.test(box || '') && /Room B/.test(box || ''), (box || '').slice(0, 300));
  const jb = await ada.$('[data-rooms-box="prewed"] .p-unit[data-unit="B"] [data-join]');
  if (jb) { await jb.click(); await ada.waitForTimeout(3000); }
  const u2 = await unitsOf(ada);
  const card2 = await txt(ada, '#stay-prewed');
  note('08.8 moved to Room B: the engine holds B (with the kept place), A is empty again; My Trip says “Your room · Room B”', u2.find((u) => u.label === 'B').taken === 2 && u2.find((u) => u.label === 'A').taken === 0 && /Your room · Room B/.test(card2 || ''), JSON.stringify({ A: u2.find((u) => u.label === 'A').taken, B: u2.find((u) => u.label === 'B').taken, card: (card2 || '').slice(0, 200) }));
  /* the give-back confirmation on My Trip — kept (Keep it) */
  await ada.click('[data-rm="prewed"]'); await ada.waitForTimeout(700);
  const ask1 = await txt(ada, '[data-ask]');
  note('08.9 My Trip · Remove asks first: “Give back your place in Room B at … ? Someone else may take it, and it may not be free again if you change your mind.” · “Give it back” / “Keep it”', /^Give back your place in Room B at .+\? Someone else may take it, and it may not be free again if you change your mind\./.test(ask1 || '') && /Give it back/.test(ask1 || '') && /Keep it/.test(ask1 || ''), ask1);
  await shot(ada, 'J08-giveback-ask-mytrip-1440', '[data-ask]');
  await ada.click('[data-ask] [data-no]'); await ada.waitForTimeout(800);
  const u3 = await unitsOf(ada);
  note('08.10 “Keep it” keeps the room', u3.find((u) => u.label === 'B').taken === 2, JSON.stringify(u3.map((u) => u.label + ':' + u.taken)));
  /* release on The Journey, after its own confirmation */
  await ada.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await ada.waitForTimeout(2500);
  await ada.click('[data-stay-remove="prewed"]'); await ada.waitForTimeout(600);
  const ask2 = await txt(ada, '#j-prewed .jask, .jask');
  note('08.11 The Journey · Remove asks the same question, “Give it back”', /Give back your place in Room B at .+\? Someone else may take it/.test(ask2 || '') && /Give it back/.test(ask2 || ''), ask2);
  await ada.click('.jask [data-yes]'); await ada.waitForTimeout(3000);
  const u4 = await unitsOf(ada);
  note('08.12 given back: Room B empty, no kept place left for the party', u4.every((u) => u.taken === 0), JSON.stringify(u4.map((u) => u.label + ':' + u.taken)));
  if (u4.every((u) => u.taken === 0)) cleanup.push({ what: 'T001 room prewed/heritage', released: true });
  await ada.context().close(); await cleo.context().close();
});

await journey('J09 party kept place (Ada / Ben)', async () => {
  const ada = await fresh(1440, 900); await signIn(ada, 'T001');
  await ada.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await ada.waitForTimeout(2500);
  const row = '#j-prewed .var.vroom[data-room="' + SLUG + '"]';
  await ada.click(row + ' [data-row-select]'); await ada.waitForSelector('#j-prewed .vunits .p-unit', { timeout: 8000 });
  await ada.click('#j-prewed .vunits .p-unit[data-unit="A"] [data-join]'); await ada.waitForTimeout(2500);
  cleanup.push({ what: 'T001 room prewed/heritage (J09)', taken: 'A' });
  const ben = await fresh(390, 844); await signIn(ben, 'T002');
  await ben.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await ben.waitForTimeout(3000);
  const av = await ben.evaluate((s) => { const r = document.querySelector('#j-prewed .var.vroom[data-room="' + s + '"]'); return r ? { av: (r.querySelector('.vav') || {}).textContent || '', btn: (r.querySelector('[data-row-select]') || {}).textContent || '', gone: r.classList.contains('gone') } : null; }, SLUG);
  note('09.1 Ben (Ada’s party) reads “A place is kept for you · Room A” on the row — never “Sold out”', av && av.av === 'A place is kept for you · Room A' && !/Sold out/.test(av.av + av.btn) && !av.gone, JSON.stringify(av));
  const selB = await ben.$(row + ' [data-row-select]');
  if (selB) { await selB.tap().catch(async () => { await selB.click(); }); await ben.waitForSelector('#j-prewed .vunits .p-unit', { timeout: 8000 }).catch(() => {}); }
  const u = await ben.evaluate(() => { const x = document.querySelector('#j-prewed .vunits .p-unit[data-unit="A"]'); return x ? { who: __T(x.querySelector('.p-unit-who')), btn: (x.querySelector('[data-join]') || {}).textContent || '', full: x.classList.contains('full') } : null; });
  const sA = surname('T001');
  note('09.2 Ben’s chooser: Room A “Ada · 1 place kept for you” with “Join this room” (first name only)', u && /Ada/.test(u.who) && /1 place kept for you/.test(u.who) && u.btn === 'Join this room' && !u.full && (!sA || !u.who.includes(sA)), JSON.stringify(u));
  await shot(ben, 'J09-ben-kept-place-390', '#j-prewed');
  obs('Ben’s own trip state is untouched (declined, reply sent): ', JSON.stringify(await words(ben)));
  /* give back (cleanup) — through the guest's own Remove + confirmation */
  await ada.reload({ waitUntil: 'load' }); await ada.waitForTimeout(2500);
  await ada.click('[data-stay-remove="prewed"]'); await ada.waitForTimeout(600); await ada.click('.jask [data-yes]'); await ada.waitForTimeout(3000);
  const u5 = await unitsOf(ada);
  note('09.3 cleanup: Ada gives Room A back → the category is empty again', u5.every((x) => x.taken === 0), JSON.stringify(u5.map((x) => x.label + ':' + x.taken)));
  if (u5.every((x) => x.taken === 0)) cleanup.push({ what: 'T001 room prewed/heritage (J09)', released: true });
  await ada.context().close(); await ben.context().close();
});

/* ======================================================== J10 · SOLD OUT / WAITING LIST */
await journey('J10 sold out / waiting list', async () => {
  /* five synthetic guests cannot fill any stay (the smallest stage, Bangkok, has 12 places) — the full state is rendered from
     the engine's own view with every unit marked full (client-side, this browser only); the waiting-list line itself is the
     real engine's */
  const p = await fresh(1440, 900); await signIn(p, 'T001');
  const fill = () => p.evaluate(() => { const U = window.SIYL_UNITS, v = JSON.parse(JSON.stringify(U.view())); Object.keys(v.units).forEach((k) => { if (!/^prewed\//.test(k)) return; v.units[k].forEach((u) => { u.occupants = Array.from({ length: u.places }, (_, i) => ({ name: 'Guest' + i, mine: false })); u.taken = u.places; u.free = 0; u.full = true; }); const s = v.summary[k]; if (s) { s.remainingPlaces = 0; s.remainingRooms = 0; s.emptyRooms = 0; s.sharedFree = 0; s.soldOut = true; s.free = 0; } }); U._set(v); document.dispatchEvent(new CustomEvent('siyl:units')); });
  await p.goto(O + '/journeys.html#j-prewed', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await fill(); await p.waitForTimeout(800);
  const j = await p.evaluate(() => ({ av: [...document.querySelectorAll('#j-prewed .var.vroom')].map((r) => (r.querySelector('.vav') || {}).textContent + ' / ' + (r.querySelector('[data-row-select]') || {}).textContent), ask: (__T((document.querySelector('[data-stayact="prewed"] .jask') || {})) || '').replace(/\s+/g, ' ') }));
  note('10.1 The Journey · every room taken: rows read “Sold out”; “Every room here is taken. Join the waiting list and we will tell you as soon as a place frees up.” + “Join the waiting list” / “I won’t need this stay” (simulated full view)', j.av.every((x) => /Sold out/.test(x)) && /Every room here is taken\. Join the waiting list and we will tell you as soon as a place frees up\./.test(j.ask) && /Join the waiting list/.test(j.ask) && /I won’t need this stay/.test(j.ask), JSON.stringify(j));
  await shot(p, 'J10-journey-soldout-simulated-1440', '#j-prewed');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await fill(); await p.waitForTimeout(800);
  const m = await p.evaluate(() => { const b = document.querySelector('[data-wait="prewed"]'); const c = b && b.closest('.p-card'); return c ? __T(c) : null; });
  note('10.2 My Trip · the same words and “Join the waiting list” (simulated full view)', m && /Every room here is taken\. Join the waiting list and we will tell you as soon as a place frees up\./.test(m) && /Join the waiting list/.test(m), m);
  await shot(p, 'J10-mytrip-soldout-simulated-1440', '#s-prewed');
  /* the real engine: join the line, read the words, leave the line */
  const wb = await p.$('[data-wait="prewed"]');
  if (wb) { await wb.click(); await p.waitForTimeout(3000); }
  const mine = await api(p, '/api/rooms/mine');
  const wl = mine.body && mine.body.waitlist && mine.body.waitlist.prewed;
  note('10.3 the engine takes Ada (party of two) onto the waiting list for the stay (position known)', !!wl && wl.position >= 1, JSON.stringify(wl));
  if (wl) cleanup.push({ what: 'T001 waiting list prewed', taken: true });
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
  const w2 = await txt(p, '[data-waitlisted="prewed"]');
  note('10.4 My Trip: “On the waiting list — number ' + (wl && wl.position) + '” and “Leave the waiting list”', w2 && new RegExp('On the waiting list — number ' + (wl && wl.position)).test(w2) && /Leave the waiting list/.test(w2), w2);
  await shot(p, 'J10-mytrip-waitlisted-1440', '[data-waitlisted="prewed"]');
  const ub = await p.$('[data-unwait="prewed"]'); if (ub) { await ub.click(); await p.waitForTimeout(2500); }
  const mine2 = await api(p, '/api/rooms/mine');
  note('10.5 “Leave the waiting list” leaves the engine’s line', !(mine2.body && mine2.body.waitlist && mine2.body.waitlist.prewed), JSON.stringify(mine2.body && mine2.body.waitlist));
  if (!(mine2.body && mine2.body.waitlist && mine2.body.waitlist.prewed)) cleanup.push({ what: 'T001 waiting list prewed', released: true });
  await p.context().close();
});

/* ======================================================== J18 · THE 1872 TEA FOR ADA + BEN */
await journey('J18 1872 tea for Ada + Ben', async () => {
  const ada = await fresh(1440, 900); await signIn(ada, 'T001');
  await ada.goto(O + '/tea.html', { waitUntil: 'load' }); await ada.waitForTimeout(3000);
  const before = await txt(ada, '#selbox');
  const pv = await ada.$('#hl-preview');
  if (!pv) { note('18.1 Ada can add the 1872 tea', false, before); }
  else {
    await pv.click(); await ada.waitForTimeout(800);
    const prev = await ada.evaluate(() => { const c = document.getElementById('hl-confirm'); const d = c && c.closest('[role="dialog"], .hl-dlg, dialog, .x-sheet') || (c && c.parentElement); return d ? __T(d) : null; });
    note('18.1 Ada · “See what will be added” → preview “Before it goes into My Bag”, “Add to My Bag” / “Cancel”', /Before it goes into My Bag/.test(prev || '') && /Add to My Bag/.test(prev || '') && /Cancel/.test(prev || ''), (prev || '').slice(0, 400));
    await ada.click('#hl-confirm'); await ada.waitForTimeout(1500);
    cleanup.push({ what: 'T001 1872 tea line', taken: true });
    const st = await txt(ada, '#selbox');
    note('18.2 Ada · the line reads “In My Bag”', /In My Bag/.test(st || ''), st);
    await settle(ada); await ada.waitForTimeout(1500);
    const ben = await fresh(390, 844); await signIn(ben, 'T002');
    await ben.goto(O + '/tea.html', { waitUntil: 'load' }); await ben.waitForTimeout(3500);
    const bs = await ben.evaluate(() => ({ party: ((document.querySelector('[data-sel-state="party"]') || {}).textContent || ''), box: (__T((document.getElementById('selbox') || {})) || '').replace(/\s+/g, ' '), preview: !!document.getElementById('hl-preview') }));
    note('18.3 Ben · “Already in Ada’s trip — one table for the two of you.” and no second “See what will be added”', bs.party === 'Already in Ada’s trip — one table for the two of you.' && !bs.preview, JSON.stringify(bs));
    await shot(ben, 'J18-ben-tea-party-390', '#sel');
    await ben.context().close();
    /* cleanup */
    await ada.reload({ waitUntil: 'load' }); await ada.waitForTimeout(2500);
    const rm = await ada.$('#hl-remove'); if (rm) { await rm.click(); await ada.waitForTimeout(1000); }
    await settle(ada);
    const gone = await ada.evaluate(() => !SIYL_BAG.get().some((x) => x.id === '1872'));
    note('18.4 cleanup: Ada removes the tea — the Bag has no 1872 line', gone, 'gone=' + gone);
    if (gone) cleanup.push({ what: 'T001 1872 tea line', released: true });
  }
  await ada.context().close();
});

/* ======================================================== J15 · TRAVEL PASS (T003, before the decline) */
await journey('J15 travel pass', async () => {
  const p = await fresh(1440, 900); await signIn(p, 'T003');
  await p.goto(O + '/tickets.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  let passes = await p.evaluate(() => [...document.querySelectorAll('.p-tickets .p-ticket')].filter((c) => /Travel pass/.test(__T(c))).map((c) => __T(c)));
  let added = null;
  if (!passes.length) {
    /* no leg in the trip: select the overnight train on My Trip (removed again afterwards) */
    await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const tb = await p.$('[data-choose-flat="train"]'); if (tb) { await tb.click(); await p.waitForTimeout(1200); added = 'train'; cleanup.push({ what: 'T003 train line', taken: true }); }
    await settle(p);
    await p.goto(O + '/tickets.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
    passes = await p.evaluate(() => [...document.querySelectorAll('.p-tickets .p-ticket')].filter((c) => /Travel pass/.test(__T(c))).map((c) => __T(c)));
  }
  const truth = await p.evaluate(() => { const TP = window.SIYL_TRAVELPASS; return TP.ORDER.filter((l) => SIYL_BAG.get().some((x) => x.id === l)).map((l) => { const s = TP.lineStateOf ? TP.lineStateOf(l) : null; return { l, s: s && (s.words || s.label || s) , ls: SIYL_DRAFT.lineState(l).label }; }); });
  note('15.1 every travel pass says “Not a ticket — Guest Relations sends you the carrier’s ticket.”', passes.length > 0 && passes.every((c) => c.includes('Not a ticket — Guest Relations sends you the carrier’s ticket.')), JSON.stringify(passes.map((c) => c.slice(0, 260))));
  note('15.2 the state words are not ahead of reality: no pass says “Confirmed” (T003’s trip is not confirmed); each pass shows its line’s own state', passes.length > 0 && passes.every((c) => !/Confirmed/.test(c)) && passes.every((c) => /(Sent to us|Selected|not sent yet|Changes not sent yet)/.test(c)), JSON.stringify({ truth, states: passes.map((c) => (c.match(/(Sent to us[^A-Z]{0,22}|Selected · not sent yet|Changes not sent yet|Selected)/) || [])[0]) }));
  await shot(p, 'J15-travel-pass-1440', '.p-tickets:last-of-type');
  if (added) {
    await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const rm = await p.$('[data-rm="train"]'); if (rm) { await rm.click(); await p.waitForTimeout(800); const y = await p.$('[data-ask] [data-yes]'); if (y) { await y.click(); await p.waitForTimeout(800); } }
    await settle(p);
    const left = await p.evaluate(() => SIYL_BAG.get().some((x) => x.id === 'train'));
    note('15.3 cleanup: the train line added for this check is removed', !left, 'left=' + left);
    if (!left) cleanup.push({ what: 'T003 train line', released: true });
  }
  await p.context().close();
});

/* ======================================================== J13 · REVIEW & SEND · J03 SEND · J04 SENT UNCHANGED · J17 SECOND DEVICE */
let pA = null, pB = null, SENT_REF = '';
await journey('J13 Review & Send (before sending)', async () => {
  pA = await fresh(1440, 900); await signIn(pA, 'G048');
  pB = await fresh(1440, 900); await signIn(pB, 'G048');     /* the guest's other device, opened before the send */
  await pB.goto(O + '/review.html', { waitUntil: 'load' }); await pB.waitForTimeout(1500);
  await pA.goto(O + '/review.html', { waitUntil: 'load' }); await pA.waitForTimeout(2500);
  const r = await pA.evaluate(() => ({ about: __T((document.getElementById('b6c') || {})) || '', ready: __T((document.getElementById('ready') || {})) || '', btn: document.getElementById('send').textContent, off: document.getElementById('send').classList.contains('off'), clar: (document.getElementById('send-clar') || {}).textContent || '', total: __T((document.getElementById('b5') || {})) || '' }));
  note('13.1 Review · About You shows “Your music” and “My favourite flavour” → “Matcha green tea”', /Your music/.test(r.about) && /My favourite flavour/.test(r.about) && /Matcha green tea/.test(r.about) && !/Thai favourite/.test(r.about), r.about.replace(/\s+/g, ' ').slice(0, 400));
  note('13.2 ready: “Ready to send · Everything we need is here”, the button “Send my trip” enabled, the clarification says sending is not a payment', /Ready to send/.test(r.ready) && /Everything we need is here/.test(r.ready) && r.btn === 'Send my trip' && !r.off && /Sending is not a payment/.test(r.clar), JSON.stringify({ ready: r.ready.replace(/\s+/g, ' '), btn: r.btn, off: r.off }));
  note('13.3 Your total: “Nothing is paid on this website.”', /Nothing is paid on this website\./.test(r.total), r.total.replace(/\s+/g, ' ').slice(0, 200));
  await shot(pA, 'J13-review-about-1440', '#b6');
  await shot(pA, 'J13-review-sendbox-1440', '#sendbox');
});
if (process.env.STOP === "send") {
  CUR = "dry-run stop";
  const p = pA; await p.goto(O + "/wedding-preparation.html", { waitUntil: "load" }); await p.waitForTimeout(2500);
  const give = await p.$("[data-seatmap=\"dinner\"] [data-seat-give]"); if (give) { await give.click(); await p.waitForTimeout(600); const y = await p.$("[data-seat-release=\"dinner\"]"); if (y) { await y.click(); await p.waitForTimeout(2500); } }
  for (const c of ctxs) await c.close().catch(() => {}); await b.close(); await wk.close();
  fs.writeFileSync(path.join(OUT, "results-dry.json"), JSON.stringify({ results: R, observations: OBS, cleanup }, null, 1));
  const f = R.filter((r) => !r.ok).length; console.log("\nDRY " + (R.length - f) + "/" + R.length + " pass"); process.exit(0);
}
await journey('J03 send', async () => {
  const p = pA;
  await p.evaluate(() => { window.__seq = []; const b = document.getElementById('send'); const rec = () => window.__seq.push(b.hidden ? '(hidden)' : b.textContent); new MutationObserver(rec).observe(b, { childList: true, characterData: true, subtree: true, attributes: true }); });
  await p.click('#send');
  await p.waitForFunction(() => /Thank you/.test(__T((document.getElementById('journeystate') || {})) || ''), null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const seq = await p.evaluate(() => window.__seq);
  const st = await p.evaluate(() => { const box = document.getElementById('journeystate'); return { cards: box.querySelectorAll('.p-card').length, h2: [...box.querySelectorAll('h2')].map((h) => h.textContent), text: __T(box), mail: (box.querySelector('[data-mail]') || {}).getAttribute ? box.querySelector('[data-mail]').getAttribute('data-mail') : null, send: document.getElementById('send').hidden, err: document.getElementById('err').textContent, statusLike: [...document.querySelectorAll('#sendbox .t-l1, #sendbox h2, #sendbox h3')].map((e) => e.textContent.trim()).filter(Boolean) }; });
  note('03.1 “Send my trip” → “Sending…” between the tap and the answer', seq.includes('Sending…'), JSON.stringify([...new Set(seq)]));
  note('03.2 ONE card: “Thank you — we have your trip”, one heading, no second status, the button gone', st.cards === 1 && st.h2.length === 1 && st.h2[0] === 'Thank you — we have your trip' && st.send && !st.err, JSON.stringify(st).slice(0, 700));
  note('03.3 the card says nothing is booked until Guest Relations confirms, and offers “Back to My Trip”', /until they do, nothing is booked/.test(st.text) && /Back to My Trip/.test(st.text), st.text.slice(0, 400));
  const ref = (st.text.match(/SYL-G048-[0-9A-F]{8}/) || [])[0] || ''; SENT_REF = ref;
  note('03.4 small print “Sent on ' + today + ' · your reference SYL-G048-…”', new RegExp('Sent on ' + today + ' · your reference SYL-G048-[0-9A-F]{8}').test(st.text), st.text.match(/Sent on[^.]*/));
  /* the email line — the stage has no mail provider, so the real answer is the failed-copy line; the success line is checked
     by answering the retry with a provider acceptance (simulated in this browser only, clearly not a real delivery) */
  note('03.5 email line (stage: no provider configured) → “We could not send your copy by email just now.” + “Send the copy again”, never a confirmation', st.mail === 'failed' && /We could not send your copy by email just now\./.test(st.text) && /Send the copy again/.test(st.text) && !/confirmation/i.test(st.text), JSON.stringify({ mail: st.mail, line: (st.text.match(/We could not[^.]*\.|A copy is on its way[^.]*\./) || [])[0] }));
  await shot(p, 'J03-sent-card-real-1440', '#sendbox');
  await p.route('**/api/register/mail-retry', async (route) => { const r = await route.fetch(); let j = {}; try { j = await r.json(); } catch (e) {} j.ok = true; j.mail = Object.assign({}, j.mail || {}, { guest: { provider: 'simulated', accepted: true, to: 'b…@example.org' } }); await route.fulfill({ response: r, json: j }); });
  const rb = await p.$('#mail-retry'); if (rb) { await rb.click(); await p.waitForTimeout(2000); }
  const sim = await p.evaluate(() => { const box = document.getElementById('journeystate'); return { cards: box.querySelectorAll('.p-card').length, line: (box.querySelector('[data-mail]') || {}).textContent || '' }; });
  note('03.6 with a provider that accepts the copy: “A copy is on its way to b…@example.org.” — still one card', sim.line === 'A copy is on its way to b…@example.org.' && sim.cards === 1, JSON.stringify(sim));
  await shot(p, 'J03-sent-card-copy-on-its-way-1440', '#sendbox');
  await p.unroute('**/api/register/mail-retry');
  const h = await hdr(p);
  note('03.7 the header says “Sent to us · ' + today + '” — one state line, no send link', h.state === 'Sent to us · ' + today && !h.cta, JSON.stringify(h));
  const rec = await gr('/api/gr/record?invitation=INV-G048');
  note('03.8 the server holds the submission (version 1, not declined)', rec.body && rec.body.record && rec.body.record.submissionId === ref && !rec.body.record.declined, JSON.stringify(rec.body && rec.body.record && { sid: rec.body.record.submissionId, v: rec.body.record.version }));
  cleanup.push({ what: 'G048 trip submission', note: 'sent (v1) — a submission cannot be withdrawn by guest flows' });
  /* WebKit phone: the same card */
  const m = await fresh(390, 844); await signIn(m, 'G048'); await m.goto(O + '/review.html', { waitUntil: 'load' }); await m.waitForTimeout(2500);
  await shot(m, 'J03-sent-card-390', '#sendbox');
  const mo = await m.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent) }));
  note('03.9 390 WebKit: the one card, no overflow', mo.h2.length === 1 && !mo.overflow, JSON.stringify(mo));
  await m.context().close();
});
await journey('J04 sent unchanged guest', async () => {
  const p = pA;
  for (let i = 0; i < 2; i++) {
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ send: document.getElementById('send').hidden, btn: document.getElementById('send').textContent, h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent), cards: document.querySelectorAll('#journeystate .p-card').length }));
    const h = await hdr(p);
    note('04.' + (i + 1) + ' reload ' + (i + 1) + ': no send button, the card “Thank you — we have your trip” stays, header “Sent to us · ' + today + '”', r.send && r.h2.length === 1 && r.h2[0] === 'Thank you — we have your trip' && h.state === 'Sent to us · ' + today && !h.cta, JSON.stringify({ r, h }));
  }
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const h = await hdr(p);
  note('04.3 My Trip header: “Sent to us · ' + today + '”, no “Send the update”', h.state === 'Sent to us · ' + today && !h.cta, JSON.stringify(h));
  await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const prof = (await p.evaluate(() => __T(document.body))).match(/(Sent to us[^.]{0,80}|Not sent yet[^.]{0,60}|Changes not sent yet[^.]{0,60})/g);
  note('04.4 My Profile trip card: “Sent to us · ' + today + '”', !!prof && prof.some((x) => x.includes('Sent to us · ' + today)), JSON.stringify(prof));
  await shot(p, 'J04-profile-sent-1440');
});
await journey('J17 second device / stale', async () => {
  await pA.goto(O + '/review.html', { waitUntil: 'load' }); await pA.waitForTimeout(2000);
  await pB.reload({ waitUntil: 'load' }); await pB.waitForTimeout(2500);
  const a = await pA.evaluate(() => /Sent from your other device/.test(__T(document.body)));
  const bb = await pB.evaluate(() => ({ other: /Sent from your other device/.test(__T(document.body)), text: (__T((document.getElementById('journeystate') || {})) || '').replace(/\s+/g, ' ') }));
  note('17.1 the sending device does NOT say “Sent from your other device”', !a, 'device A shows it: ' + a);
  note('17.2 the other device (opened before the send) says “Sent from your other device” — true: the send came from device A', bb.other && /you sent an update from another device/.test(bb.text), bb.text.slice(0, 500));
  await shot(pB, 'J17-other-device-1440', '#sendbox');
  /* a fresh device that never sent anything: the words are true there too (the latest version came from elsewhere) */
  const pC = await fresh(1440, 900); await signIn(pC, 'G048'); await pC.goto(O + '/review.html', { waitUntil: 'load' }); await pC.waitForTimeout(2500);
  obs('fresh third device (never sent)', 'shows “Sent from your other device”: ' + (await pC.evaluate(() => /Sent from your other device/.test(__T(document.body)))));
  await pC.context().close();
});

/* ======================================================== J14 · EMAIL OUTPUT */
await journey('J14 email output', async () => {
  const g = await gr('/api/gr/record?invitation=INV-G048');
  const gm = g.body && g.body.guestMail;
  fs.writeFileSync(path.join(OUT, 'J14-mail-G048.txt'), gm ? 'SUBJECT: ' + gm.subject + '\n\n' + gm.text : 'no mail');
  if (gm) fs.writeFileSync(path.join(OUT, 'J14-mail-G048.html'), gm.html);
  note('14.1 host record: subject names the reference, never “confirmation”; the email lists “Your music” and “My favourite flavour: Matcha green tea”', gm && new RegExp('\\(' + SENT_REF + '\\)$').test(gm.subject) && !/confirm/i.test(gm.subject) && /· Your music: /.test(gm.text) && /· My favourite flavour: Matcha green tea/.test(gm.text) && !/Thai favourite/.test(gm.text), JSON.stringify({ subject: gm && gm.subject, lines: gm && gm.text.split('\n').filter((l) => /music|flavour|Karaoke|karaoke/i.test(l)) }));
  obs('host subject', gm && gm.subject);
  const t = await gr('/api/gr/record?invitation=INV-T001');
  const tm = t.body && t.body.guestMail;
  fs.writeFileSync(path.join(OUT, 'J14-mail-T001.txt'), tm ? 'SUBJECT: ' + tm.subject + '\n\n' + tm.text : 'no mail');
  note('14.2 a guest’s first trip (T001 Ada, version 1): subject “Thank you — we have your trip (SYL-…)”, never “confirmation”', tm && /^Thank you — we have your trip \(SYL-T001-[0-9A-F]{8}\)$/.test(tm.subject) && !/confirm/i.test(tm.text.split('\n').slice(0, 6).join(' ')), JSON.stringify({ subject: tm && tm.subject, head: tm && tm.text.split('\n').slice(0, 5) }));
  const c = await gr('/api/gr/record?invitation=INV-T003'); const cm = c.body && c.body.guestMail;
  note('14.3 an updated trip (T003 v' + (c.body && c.body.record && c.body.record.version) + '): “Thank you — we have your update (SYL-…)”', cm && /^Thank you — we have your update \(SYL-T003-[0-9A-F]{8}\)$/.test(cm.subject), cm && cm.subject);
  const n = await gr('/api/gr/record?invitation=INV-T002'); const nm = n.body && n.body.guestMail;
  note('14.4 a declined reply (T002 Ben): “Thank you for letting us know”', nm && nm.subject === 'Thank you for letting us know', nm && nm.subject);
  const all = [gm, tm, cm, nm].filter(Boolean).map((m) => m.text).join('\n');
  note('14.5 no email calls itself a confirmation (“Confirmation” / “confirmed” as the state of the copy)', !/\bconfirmation\b/i.test(all.replace(/Guest Relations (will )?confirm[^.\n]*/gi, '')), (all.match(/.{0,40}confirmation.{0,40}/gi) || []).slice(0, 4));
  if (gm) { const p = await fresh(1440, 900); await p.setContent(gm.html); await p.waitForTimeout(400); await shot(p, 'J14-mail-G048-render'); await p.context().close(); }
});

/* ======================================================== J05 · SENT THEN CHANGED */
const setDrink = async (p, v) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); const t = await p.$('textarea[data-q="drink"]'); await t.fill(v); await t.dispatchEvent('change'); await p.waitForTimeout(300); await settle(p); };
await journey('J05 sent then changed', async () => {
  const p = pA;
  await setDrink(p, 'Iced lemon tea');
  const ok = await waitKey(p, 'changed', 12000);
  const h = await hdr(p);
  note('05.1 a real change after sending → header “Changes not sent yet” + “Send the update”', ok && h.state === 'Changes not sent yet' && h.cta === 'Send the update', JSON.stringify(h));
  await shot(p, 'J05-changed-header-1440', '[data-prep-save]');
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({ btn: document.getElementById('send').textContent, hidden: document.getElementById('send').hidden, h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent), text: (__T(document.getElementById('journeystate')) || '').replace(/\s+/g, ' ') }));
  note('05.2 Review: the one card “You have changed your trip” (it replaces what you sent) and the one button “Send the update”', r.h2.length === 1 && r.h2[0] === 'You have changed your trip' && !r.hidden && r.btn === 'Send the update' && /Send the update when you are ready — it replaces what you sent before\./.test(r.text), JSON.stringify(r));
  await shot(p, 'J05-changed-review-1440', '#sendbox');
  await setDrink(p, 'Lemonade');
  const back = await waitKey(p, 'sent', 12000);
  const h2 = await hdr(p);
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => ({ hidden: document.getElementById('send').hidden, h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent) }));
  note('05.3 undoing the change removes it again: header “Sent to us · ' + today + '”, no “Send the update”, no button, the sent card back', back && h2.state === 'Sent to us · ' + today && !h2.cta && r2.hidden && r2.h2[0] === 'Thank you — we have your trip', JSON.stringify({ h2, r2 }));
});

/* ======================================================== J06 · CONFIRMED BY GUEST RELATIONS → LAPSES */
await journey('J06 Guest Relations confirmed guest', async () => {
  const p = pA;
  const c = await gr('/api/confirm', { invitationId: 'INV-G048', actor: 'w007-e2e (synthetic)' });
  note('06.0 Guest Relations confirms the sent version (stage token, synthetic guest)', c.body && c.body.ok && c.body.confirmedAt, JSON.stringify(c.body && { ok: c.body.ok, version: c.body.version }));
  cleanup.push({ what: 'G048 confirmation', undo: 'unconfirm' });
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const h = await hdr(p);
  const r = await p.evaluate(() => ({ h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent), text: (__T(document.getElementById('journeystate')) || '').replace(/\s+/g, ' '), send: document.getElementById('send').hidden }));
  note('06.1 header “Confirmed by Guest Relations · ' + today + '”', h.state === 'Confirmed by Guest Relations · ' + today && !h.cta, JSON.stringify(h));
  note('06.2 Review: “Your trip is confirmed” (on ' + today + '), no send button', r.h2[0] === 'Your trip is confirmed' && new RegExp('confirmed your arrangements on ' + today).test(r.text) && r.send, JSON.stringify(r).slice(0, 500));
  await shot(p, 'J06-confirmed-1440', '#sendbox');
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const seatCard = await txt(p, '[data-seatmap="dinner"]');
  obs('seat card while the trip is confirmed', (seatCard || '').slice(0, 200));
  /* change → the confirmation lapses */
  await setDrink(p, 'Iced lemon tea');
  const ok = await waitKey(p, 'changed', 12000);
  const h2 = await hdr(p);
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => ({ h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent), text: (__T(document.getElementById('journeystate')) || '').replace(/\s+/g, ' '), btn: document.getElementById('send').textContent, conf: /Confirmed by Guest Relations/.test(__T(document.body)) }));
  note('06.3 a change lapses the confirmation: header “Changes not sent yet” + “Send the update”; nothing on the page still says “Confirmed by Guest Relations”', ok && h2.state === 'Changes not sent yet' && h2.cta === 'Send the update' && !r2.conf, JSON.stringify({ h2, conf: r2.conf }));
  note('06.4 Review: “You changed your trip after Guest Relations confirmed it. Send the update, and Guest Relations will confirm it with you again.”', r2.h2[0] === 'You have changed your trip' && /You changed your trip after Guest Relations confirmed it\. Send the update, and Guest Relations will confirm it with you again\./.test(r2.text) && r2.btn === 'Send the update', JSON.stringify(r2).slice(0, 500));
  await shot(p, 'J06-lapsed-1440', '#sendbox');
  await setDrink(p, 'Lemonade');
  await p.waitForTimeout(1500);
  obs('after undoing the change', 'trip state key = ' + ((await words(p)) || {}).key + ' · header ' + JSON.stringify(await hdr(p)) + ' (the confirmed version is the same content again)');
});

/* ======================================================== J16 · SEAT TICKET */
await journey('J16 seat ticket card / PDF', async () => {
  const p = pA;
  await p.goto(O + '/tickets.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const t = await p.evaluate(() => ({ cards: [...document.querySelectorAll('.p-ticket')].map((c) => __T(c).slice(0, 300)), foot: __T(document.body).includes('A seat ticket shows the seat held for you today. Nothing is paid on this website.') }));
  const dinner = t.cards.find((c) => new RegExp('\\b' + SEAT2 + '\\b').test(c));
  note('16.1 the dinner seat ticket card: “Held for you” (never “Confirmed”), seat ' + SEAT2, !!dinner && /Held for you/.test(dinner) && !/Confirmed/.test(dinner) && t.foot, JSON.stringify(t).slice(0, 700));
  await shot(p, 'J16-ticket-cards-1440', '.p-tickets');
  const btn = await p.$('[data-seat-pass="dinner"]');
  if (btn) {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), btn.click()]);
    const f = path.join(OUT, 'J16-' + dl.suggestedFilename()); await dl.saveAs(f);
    const pdfStrings = pdfText(fs.readFileSync(f));
    note('16.2 the PDF ticket: STATUS “HELD” (TO-01509), “This ticket shows the seat held for you when you downloaded it.” (TO-01528), seat ' + SEAT2 + '; no “HELD FOR” (removed), no “Confirmed”', pdfStrings.includes('HELD') && pdfStrings.includes('This ticket shows the seat held for you when you downloaded it.') && pdfStrings.includes(SEAT2) && !pdfStrings.some((x) => /^HELD FOR$/.test(x) || /confirmed/i.test(x)), JSON.stringify({ file: path.basename(f), strings: pdfStrings.filter((x) => /HELD|held|STATUS|Confirmed|^[AB]\d+$/.test(x)) }));
  } else note('16.2 a download control exists', false, 'no [data-seat-pass="dinner"]');
});

/* ======================================================== J07 · DECLINE (T003) */
await journey('J07 decline', async () => {
  const p = await fresh(390, 844); await signIn(p, 'T003');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(2000);
  const wasScope = await p.evaluate(() => window.SIYL_GUEST.scope());
  await p.tap('[data-scope-none]'); await p.waitForTimeout(600);
  const pv = await p.$('[data-release-confirm]'); if (pv) { obs('release preview before the decline', await txt(p, '[data-release-confirm]')); await pv.tap(); await p.waitForTimeout(1500); }
  await p.waitForSelector('[data-not-joining]', { timeout: 8000 }).catch(() => {});
  const d = await p.evaluate(() => { const c = document.querySelector('[data-not-joining]'); return c ? { text: __T(c), btn: (c.querySelector('[data-decline-send]') || {}).textContent || null, status: (document.querySelector('[data-scope-status]') || {}).textContent } : null; });
  note('07.1 the decline card: “We will miss you.”, status “Not joining this trip”', d && /We will miss you\./.test(d.text) && d.status === 'Not joining this trip', JSON.stringify(d));
  note('07.2 the card’s one action reads “Send my reply”', d && d.btn === 'Send my reply', JSON.stringify({ btn: d && d.btn, priorSubmission: 'T003 had sent a trip (v' + ((START.T003.words || {}).key) + ')' }));
  await shot(p, 'J07-decline-card-390', '[data-scope-card]');
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const rv = await p.evaluate(() => ({ btn: document.getElementById('send').textContent, hidden: document.getElementById('send').hidden, blocks: ['b2', 'b3', 'b6', 'b4', 'b5'].map((i) => (document.getElementById(i) || {}).hidden) }));
  obs('Review for the same state', JSON.stringify(rv));
  note('07.3 My Trip and Review name the same action for the same state', d && rv.btn === d.btn, JSON.stringify({ myTrip: d && d.btn, review: rv.btn }));
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-not-joining]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__seq = []; const c = document.querySelector('[data-scope-card]').parentNode; new MutationObserver(() => { const b = document.querySelector('[data-decline-send]'); if (b) window.__seq.push(b.textContent); const r = document.querySelector('[data-reply-state]'); if (r) window.__seq.push('STATE:' + r.textContent); }).observe(c, { subtree: true, childList: true, characterData: true }); });
  const before = await gr('/api/gr/record?invitation=INV-T003');
  await p.tap('[data-decline-send]');
  await p.waitForSelector('[data-reply-state]', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const seq = await p.evaluate(() => [...new Set(window.__seq)]);
  const after = await p.evaluate(() => ({ state: ((document.querySelector('[data-reply-state]') || {}).textContent || ''), note: ((document.querySelector('[data-reply-note]') || {}).textContent || ''), btn: !!document.querySelector('[data-decline-send]') }));
  const rec = await gr('/api/gr/record?invitation=INV-T003');
  const subDeclined = ((await api(p, '/api/draft')).body || {}).submission ? (await api(p, '/api/draft')).body.submission.declined : null;
  note('07.4 the button really sends: “Sending…” then “Reply sent · ' + today + '”; the server record is now a decline (new version)', seq.includes('Sending…') && after.state === 'Reply sent · ' + today && !after.btn && subDeclined === true && rec.body.record.version > before.body.record.version, JSON.stringify({ seq, after, v: [before.body.record.version, rec.body.record.version], submissionDeclined: subDeclined }));
  cleanup.push({ what: 'T003 submission', note: 'a decline reply was sent (v' + rec.body.record.version + ') — cannot be withdrawn by guest flows' });
  await shot(p, 'J07-reply-sent-390', '[data-scope-card]');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
  const kept = await txt(p, '[data-reply-state]');
  note('07.5 after reload the card still reads “Reply sent · ' + today + '”', kept === 'Reply sent · ' + today, kept);
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const rv2 = await p.evaluate(() => ({ h2: [...document.querySelectorAll('#journeystate h2')].map((x) => x.textContent), send: document.getElementById('send').hidden }));
  note('07.6 Review: the one card “Reply sent · ' + today + '”, no send button', rv2.h2.length === 1 && rv2.h2[0] === 'Reply sent · ' + today && rv2.send, JSON.stringify(rv2));
  const nm = rec.body.guestMail;
  note('07.7 the reply email: “Thank you for letting us know”', nm && nm.subject === 'Thank you for letting us know', nm && nm.subject);
  /* restore the draft as far as the guest can: tick the four parts again (the stored reply stays) */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-scope-card]'); await p.waitForTimeout(1500);
  for (const k of ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china']) { if (wasScope && wasScope[k] && (await p.getAttribute('[data-scope="' + k + '"]', 'aria-checked')) !== 'true') { await p.tap('[data-scope="' + k + '"]'); await p.waitForTimeout(600); } }
  await settle(p);
  const sc = await p.evaluate(() => window.SIYL_GUEST.scope());
  const w = await words(p);
  obs('T003 restored draft scope', JSON.stringify({ scope: sc, state: w.key, line: w.line }));
  cleanup.push({ what: 'T003 draft scope', restored: ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china'].every((k) => !!sc[k] === !!wasScope[k]) && !sc.none });
  await p.context().close();
});

/* ======================================================== CLEANUP */
await journey('cleanup', async () => {
  /* G048: the confirmation is withdrawn; the dinner seat is given back through the guest's own control */
  const u = await gr('/api/confirm', { invitationId: 'INV-G048', action: 'unconfirm', actor: 'w007-e2e (synthetic)' });
  note('C.1 G048 confirmation withdrawn (Guest Relations unconfirm)', u.body && u.body.ok && u.body.confirmedAt === null, JSON.stringify(u.body && { ok: u.body.ok, confirmedAt: u.body.confirmedAt }));
  const p = pA;
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const give = await p.$('[data-seatmap="dinner"] [data-seat-give]');
  if (give) { await give.click(); await p.waitForTimeout(600); const ask = await txt(p, '[data-seat-give-ask="dinner"]'); obs('seat give-back question', ask); const y = await p.$('[data-seat-release="dinner"]'); if (y) { await y.click(); await p.waitForTimeout(2500); } }
  const s = await api(p, '/api/seating');
  const gone = !(s.body && s.body.mine && s.body.mine.dinner && Object.keys(s.body.mine.dinner).length);
  note('C.2 G048 dinner seat given back (“Give seat … back” → “Yes, give it back”)', gone, JSON.stringify(s.body && s.body.mine));
  /* the engine: no synthetic guest holds a room or a waiting-list place this run took */
  const r = await api(p, '/api/rooms');
  const occ = Object.entries(r.body.units).flatMap(([k, us]) => us.filter((x) => x.taken > 0).map((x) => k + ':' + x.label + ':' + x.taken));
  note('C.3 the room engine is as it was (no occupancy anywhere)', occ.length === 0, JSON.stringify(occ));
  const END = {};
  for (const id of ['T001', 'T002', 'T003', 'G048', 'G049']) {
    const q = await fresh(); await signIn(q, id);
    END[id] = await q.evaluate(async () => {
      const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer };
      const rooms = await (await fetch('/api/rooms/mine', { headers: h })).json().catch(() => null);
      const seats = await (await fetch('/api/seating', { headers: h })).json().catch(() => null);
      return { words: SIYL_DRAFT.words(), scope: SIYL_GUEST.scope(), bag: SIYL_BAG.get().map((x) => x.id + (x.unit ? ':' + x.unit : '')), rooms: rooms && rooms.mine, wait: rooms && rooms.waitlist, seats: seats && seats.mine };
    });
    await q.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'end-state.json'), JSON.stringify(END, null, 1));
  for (const id of ['T001', 'T002', 'G049']) {
    const a = START[id], e = END[id];
    const same = JSON.stringify(a.bag) === JSON.stringify(e.bag) && JSON.stringify(a.rooms) === JSON.stringify(e.rooms) && JSON.stringify(a.seats) === JSON.stringify(e.seats) && a.words.key === e.words.key && JSON.stringify(Object.assign({}, a.scope, { at: 0 })) === JSON.stringify(Object.assign({}, e.scope, { at: 0 }));
    note('C.4 ' + id + ' ends as it started (bag, rooms, seats, trip state, scope)', same, JSON.stringify({ start: { k: a.words.key, bag: a.bag, rooms: a.rooms, seats: a.seats }, end: { k: e.words.key, bag: e.bag, rooms: e.rooms, seats: e.seats } }));
  }
});

note('E0 no page error on any page of the run', errors.size === 0, [...errors.keys()].slice(0, 8).join(' | ') || 'none');
for (const c of ctxs) await c.close().catch(() => {});
await b.close(); await wk.close();
const summary = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, { pass: v.filter(Boolean).length, fail: v.filter((x) => !x).length }]));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ origin: O, at: new Date().toISOString(), summary, results: R, observations: OBS, cleanup }, null, 1));
const f = R.filter((r) => !r.ok).length; console.log('\n' + (R.length - f) + '/' + R.length + ' pass'); console.log(JSON.stringify(summary, null, 1));
process.exit(f ? 1 : 0);
