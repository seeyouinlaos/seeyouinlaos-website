/* THE FINAL CONSOLIDATED CLOSE-OUT PASS — E2E on the isolated stage worker (Owner, 21 Sep 2026). REAL WebKit / iPhone 13 for every
   phone-width page (the desktop widths in Chromium). Synthetic guests only (T001 Ada · T002 Ben, one party · T003 Cleo); codes read from
   the scratchpad, never printed.   node docs/acceptance/2026-09-21-close-out/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the hero slideshow (five slides, the courtyard first, ~5 s, crossfade, the same frame at 320 · 390 · 834 · 1440, reduced
   motion, a hidden tab) · the accommodation media (every recommendation's frame is its property's own; Luye Baisha = its room) · the
   mobile booking smoke test A – E (Guest House · Souphattra · China only · Join all · Decline, with a partner) · the server-side
   completion gate (422) · the passport picker and the honest answer of the live configuration · first / last name editing and its
   propagation · the Lijiang film and the destination galleries preserved · the console. */
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
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
/* a guest with nothing to choose: the Vientiane scope, every stage answered as not joining (the journey step complete), the wedding attended — the gate to 04 opens */
const readyForWedding = async (p, email) => { await contact(p, email); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ vientiane: true }); }); await p.waitForTimeout(800); await p.evaluate(async () => { for (const s of SIYL_JOURNEY.open()) { if (s.key === 'c86') SIYL_PRICE.items('c86').forEach((it) => SIYL_BAG.put(it)); else await SIYL_JOURNEY.decline(s); } }); await p.waitForTimeout(800); await wedding(p, 'yes', 'yes'); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const resetGuest = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) { await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); await api(p, '/api/rooms/unwait', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); }
  /* the server-side draft too: an empty Bag and no declines pushed as the guest's own save, so the next sign-in restores nothing */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { localStorage.setItem('siyl.bag', '[]'); localStorage.setItem('siyl.skip', '[]'); localStorage.setItem('siyl.skip.by', '{}'); try { await window.SIYL_DRAFT.flush('reset'); } catch (e) {} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by', 'siyl.wait', 'siyl.draft.meta', 'siyl.draft.base'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close(); };



const VTE = ['vientianePreWedding', 'vientianeWedding'];
const toggle = async (p, key, ms) => { await p.click('[data-scope="' + key + '"]'); await p.waitForTimeout(700); const pv = await p.$('[data-release-confirm]'); if (pv) await p.click('[data-release-confirm]'); await p.waitForTimeout(ms || 1200); return !!pv; };
const sheets = (p) => p.evaluate(() => ({ on: [...document.querySelectorAll('[data-scope][aria-pressed="true"]')].map((e) => e.getAttribute('data-scope')), stages: [...document.querySelectorAll('#chrono .p-stage[id^="s-"]')].map((e) => e.id.slice(2)).filter((k) => k !== 'wedding' && k !== 'excluded'), wedding: !!document.querySelector('#s-wedding'), words: SIYL_GUEST.scopeWords(), packs: document.querySelectorAll('.p-pack, [data-package], [data-package-preview]').length, counts: SIYL_JOURNEY.counts(), bag: SIYL_BAG.get().map((x) => x.id + ':' + (x.room || '') + ':' + x.price), total: SIYL_BAG.total(), done: SIYL_GUEST.done('journey'), need: SIYL_GUEST.readiness().need.map((x) => x.key), steps: SIYL_GUEST.steps().map((s) => s.key + ':' + s.state), text: [...document.querySelectorAll('#chrono .p-stage[id^="s-"]:not(#s-excluded)')].map((e) => e.innerText).join('\n'), dec: (document.querySelector('[data-counts]') || {}).innerText || '' }));
const clean = (p) => p.evaluate(async () => { SIYL_GUEST.clearScope(); localStorage.setItem('siyl.skip', '[]'); SIYL_BAG.set([]); });
const postRegister = (p, registration) => p.evaluate(async (registration) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/register', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: a.invitationId, registration: Object.assign({ channel: 'journey-shop', guestId: a.guestId, partyId: a.partyId || null }, registration), text: 'SEE YOU IN LAOS — JOURNEY SELECTION' }) }); let body = null; try { body = await r.json(); } catch (e) {} return { status: r.status, body }; }, registration);
const send = async (p) => { await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); const before = await p.evaluate(() => ({ url: location.pathname, btn: (document.querySelector('#send') || {}).innerText || '', off: !!document.querySelector('#send.off') })); const r = await p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn) return { clicked: false }; btn.click(); await new Promise((r) => setTimeout(r, 6000)); return { clicked: true, after: btn.innerText, err: (document.querySelector('#err') || {}).innerText || '' }; }); return { before, ...r }; };
const steps = (p) => p.evaluate(() => ({ trip: SIYL_JOURNEY.counts(), steps: SIYL_GUEST.steps().map((s) => s.key + ':' + s.state), ready: SIYL_GUEST.readiness().ok }));

/* ===== 1 · THE HERO SLIDESHOW (public, no sign-in) ===== */
for (const w of [320, 390, 834, 1440]) {
  const p = await fresh(w); await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const g0 = await p.evaluate(() => { const am = document.querySelector('.a-hero .am'), ah = document.querySelector('.a-hero .ah'); const r = am.getBoundingClientRect(); return { slides: am.getAttribute('data-hero-slides'), idx: am.getAttribute('data-hero-index'), state: am.getAttribute('data-hero-state'), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), ahTop: Math.round(ah.getBoundingClientRect().top), bg: /home-hero-courtyard/.test(am.style.backgroundImage), layers: document.querySelectorAll('.a-hero-slide').length, on: document.querySelectorAll('.a-hero-slide.is-on').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, h1: (document.querySelector('.a-hero h1') || {}).innerText || '' }; });
  await shot(p, w + '-hero-1'); await p.waitForTimeout(6200);
  const g1 = await p.evaluate(() => { const am = document.querySelector('.a-hero .am'), ah = document.querySelector('.a-hero .ah'); const r = am.getBoundingClientRect(); const on = document.querySelector('.a-hero-slide.is-on'); return { idx: am.getAttribute('data-hero-index'), state: am.getAttribute('data-hero-state'), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), ahTop: Math.round(ah.getBoundingClientRect().top), on: document.querySelectorAll('.a-hero-slide.is-on').length, onSrc: on ? on.style.backgroundImage : '', opacity: on ? getComputedStyle(on).opacity : '', transition: on ? getComputedStyle(on).transitionDuration : '', bgSize: on ? getComputedStyle(on).backgroundSize : '', pos: on ? getComputedStyle(on).backgroundPosition : '', ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  await shot(p, w + '-hero-2');
  note('hero-' + w, g0.slides === '5' && g0.idx === '0' && g0.state === 'playing' && g0.bg && g0.layers === 4 && g0.on === 0 && g0.ov <= 1 && /One invitation/.test(g0.h1) && g1.idx === '1' && g1.on === 1 && /home-hero-02/.test(g1.onSrc) && g1.opacity === '1' && g1.transition === '1s' && g1.bgSize === 'cover' && g1.w === g0.w && g1.h === g0.h && g1.top === g0.top && g1.ahTop === g0.ahTop && g1.ov <= 1, JSON.stringify({ g0: { slides: g0.slides, w: g0.w, h: g0.h, ahTop: g0.ahTop }, g1: { idx: g1.idx, src: g1.onSrc.slice(-24), opacity: g1.opacity, transition: g1.transition, w: g1.w, h: g1.h, ahTop: g1.ahTop, pos: g1.pos } }) + ' (the same frame, the words unmoved, slide 2 after ~5 s)');
  await p.context().close();
}
{
  /* the full loop at 390 (WebKit): 0 → 1 → 2 → 3 → 4 → 0, the same picture never twice in a row; reduced motion; a hidden tab */
  const p = await fresh(390); await p.goto(O + '/index.html', { waitUntil: 'load' }); const seq = []; for (let i = 0; i < 6; i++) { seq.push(await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'))); await p.waitForTimeout(5200); }
  const srcs = await p.evaluate(() => [...document.querySelectorAll('.a-hero-slide')].map((e) => e.getAttribute('data-src').split('/').pop()));
  note('hero-loop-five-slides', seq.join('') === '012340' && srcs.join() === 'home-hero-02.jpg,home-hero-03.jpg,home-hero-04.jpg,home-hero-05.jpg', JSON.stringify({ seq, srcs }) + ' (the courtyard · IMG_2584 · 2585 · 2586 · 2587 · the courtyard)');
  /* a hidden tab: the clock stops; on return at most the one frame that was due, then the normal cadence — never a jump */
  const before = await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'));
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(16000);
  const hidden = await p.evaluate(() => ({ state: document.querySelector('.a-hero .am').getAttribute('data-hero-state'), idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index') }));
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(600);
  const back = await p.evaluate(() => ({ state: document.querySelector('.a-hero .am').getAttribute('data-hero-state'), idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index') }));
  const step = (a, b) => (Number(b) - Number(a) + 5) % 5;
  note('hero-hidden-tab-pauses-no-catch-up', hidden.state === 'paused' && step(before, hidden.idx) <= 1 && back.state === 'playing' && step(before, back.idx) <= 1, JSON.stringify({ before, hidden, back }) + ' (16 s hidden = three slides due; at most one shown)');
  await p.context().close();
  const q = await fresh(390, { reducedMotion: 'reduce' }); await q.goto(O + '/index.html', { waitUntil: 'load' }); await q.waitForTimeout(6500);
  const calm = await q.evaluate(() => ({ state: document.querySelector('.a-hero .am').getAttribute('data-hero-state'), idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'), on: document.querySelectorAll('.a-hero-slide.is-on').length }));
  note('hero-reduced-motion-still', calm.state === 'still' && calm.idx === '0' && calm.on === 0, JSON.stringify(calm)); await q.context().close();
}

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003']) await resetGuest(id);
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-close-out' }, 'POST');

  /* ===== 2 · ACCOMMODATION MEDIA on the rendered pages: every recommendation frame is its property's own; Luye Baisha shows its room ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p); await p.click('[data-scope-all]'); await p.waitForTimeout(1500);
    const own = await p.evaluate(() => { const A = SIYL_STAY_ART, out = []; const bg = (el) => (el.style.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1] || ''; document.querySelectorAll('#s-bkk-stay .p-stay-img').forEach((el) => out.push(['bkk-stay', bg(el), A.ok('sathorn', bg(el))])); return out; });
    await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const jn = await p.evaluate(() => { const A = SIYL_STAY_ART, R = SIYL_ROOMS, M = SIYL_STAY_MEDIA, out = { rows: [], gal: [] }; const bg = (el) => (el.style.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1] || ''; const STAY = { 'bkk-stay': 'sathorn', prewed: 'souphattra', wedstay: 'souphattra', guesthouse: 'guesthouse', riverside: 'riverside', kmg: 'kunming', ljg: 'lijiang', kempinski: 'kempinski' };
      document.querySelectorAll('[data-rooms]').forEach((box) => { const sk = box.getAttribute('data-rooms'); if (!R[sk]) return; box.querySelectorAll('[style*="background-image"]').forEach((el) => out.rows.push([sk, bg(el).split('/').slice(-2).join('/'), A.ok(sk, bg(el))])); });
      document.querySelectorAll('[data-stay-gal]').forEach((g) => { const keys = g.getAttribute('data-stay-gal').split(','); const stays = keys.map((key) => Object.keys(A.MEDIA_KEYS).find((s) => A.MEDIA_KEYS[s].includes(key))); g.querySelectorAll('img, [style*="background-image"]').forEach((el) => { const s = el.getAttribute('src') || bg(el); if (s) out.gal.push([keys.join('+'), s.split('/').slice(-2).join('/'), stays.some((st) => A.ok(st, s))]); }); });
      return out; });
    const ljgCard = await p.evaluate(() => { const c = document.getElementById('j-ljg'); const el = c && c.querySelector('img, [style*="background-image"]'); return el ? (el.getAttribute('src') || (el.style.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1]) : ''; });
    await p.evaluate(() => document.getElementById('j-ljg').scrollIntoView()); await p.waitForTimeout(600); await shot(p, '390-journeys-luye-baisha');
    const bad = [...own, ...jn.rows, ...jn.gal].filter((x) => !x[2]);
    note('accommodation-media-own-frames-only', own.length >= 3 && jn.rows.length >= 20 && jn.gal.length >= 10 && bad.length === 0 && /lijiang\/view270-1\.jpg/.test(ljgCard), JSON.stringify({ rails: own.length, rows: jn.rows.length, galleryFrames: jn.gal.length, bad: bad.slice(0, 5), ljg: ljgCard.split('/').slice(-2).join('/') }));
    await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const houses = await p.evaluate(() => [...document.querySelectorAll('a.am[href^="journeys.html#j-"]')].map((a) => [a.getAttribute('href').split('#')[1], ((a.style.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1] || '').split('/').slice(-2).join('/')]));
    note('the-houses-luye-baisha-room', houses.some((h) => h[0] === 'j-ljg' && h[1] === 'lijiang/view270-1.jpg') && !houses.some((h) => /snow-mountain-viewing-1|city\//.test(h[1])), JSON.stringify(houses));
    await p.context().close();
  }

  /* ===== 3 · THE MOBILE BOOKING SMOKE TEST (WebKit / iPhone 13) ===== */
  /* A · Wedding only + the Guest House */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p); await clean(p); await trip(p);
    await toggle(p, 'vientianeWedding', 1000);
    const s0 = await sheets(p);
    await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); }); await trip(p);
    const s1 = await sheets(p); await shot(p, 'A-390-wedding-guest-house');
    const line = await p.evaluate(() => { const x = SIYL_BAG.get()[0]; const q = SIYL_PRICE.quote('guesthouse', 'guest-house'); const card = (document.querySelector('#s-wedstay') || {}).innerText.replace(/\s+/g, ' '); return { id: x && x.id, price: x && x.price, complimentary: x && x.complimentary, nights: q.nights, rate: q.rate || 0, total: q.total || 0, card, cost: (document.getElementById('tt') || {}).textContent }; });
    note('A-wedding-guest-house', s0.stages.join() === 'wedstay' && s0.wedding && s1.stages.join() === 'wedstay' && !/Pre-Wedding Stay|Sathorn|Kunming|Lijiang|MU9646|Special Express|Kempinski/.test(s1.text) && line.id === 'guesthouse' && line.price === 0 && line.complimentary === true && line.nights === 2 && line.rate === 0 && line.total === 0 && /Complimentary/i.test(line.card) && /USD 0/.test(line.cost) && s1.total === 0 && s1.done && s1.counts.confirmed === 1 && s1.counts.relevant === 1 && s1.steps.includes('journey:complete') && s1.packs === 0, JSON.stringify({ s0: s0.stages, s1: { stages: s1.stages, bag: s1.bag, total: s1.total, done: s1.done, counts: s1.counts }, line }));
    /* B · Wedding only + the Souphattra: The Heritage — USD 145 p.p. / night, two nights, the second complimentary, USD 145 total; the category switches */
    const B = await p.evaluate(async () => { const out = {}; const r = await SIYL_STAY.select('wedstay', 'heritage'); out.sel = r && r.ok; const q = SIYL_PRICE.quote('wedstay', 'heritage'); out.q = { rate: q.rate, nights: q.nights, pay: q.pay, hosted: q.hosted, total: q.total, contribution: q.contribution }; out.bag = SIYL_BAG.get().map((x) => x.id + ':' + x.room + ':' + x.price); out.total = SIYL_BAG.total(); const r2 = await SIYL_STAY.select('wedstay', 'heritage-grand-premier'); out.sw = r2 && r2.ok; out.bag2 = SIYL_BAG.get().map((x) => x.id + ':' + x.room + ':' + x.price); out.total2 = SIYL_BAG.total(); const r3 = await SIYL_STAY.select('wedstay', 'heritage'); out.back = r3 && r3.ok; out.total3 = SIYL_BAG.total(); return out; });
    await trip(p); const bs = await sheets(p); await shot(p, 'B-390-wedding-souphattra-heritage');
    const words = await p.evaluate(() => (document.querySelector('#s-wedstay') || {}).innerText.replace(/\s+/g, ' '));
    note('B-wedding-souphattra-heritage-145', B.sel && B.q.rate === 145 && B.q.nights === 2 && B.q.pay === 1 && B.q.hosted === 1 && B.q.total === 145 && /second night hosted/i.test(B.q.contribution) && B.bag.join() === 'wedstay:heritage:145' && B.total === 145 && B.sw && B.bag2.join() === 'wedstay:heritage-grand-premier:170' && B.total2 === 170 && B.back && B.total3 === 145 && bs.stages.join() === 'wedstay' && bs.done && /USD 145/.test(words) && !/USD 290/.test(words), JSON.stringify({ q: B.q, bag: B.bag, bag2: B.bag2, total3: B.total3 }));
    const mine = (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body.mine; note('B-one-hold-for-stage-D', mine && Object.keys(mine).join() === 'wedstay' && /wedstay\/heritage$/.test(mine.wedstay.key), JSON.stringify(mine));
    await p.context().close();
  }
  /* C · China only: F + G + H, the train mandatory */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p); await clean(p); await trip(p);
    await toggle(p, 'china', 1000); const c0 = await sheets(p);
    await p.evaluate(async () => { await SIYL_STAY.select('kmg', 'italian'); await SIYL_STAY.select('ljg', 'viewing-270'); }); await trip(p);
    const c1 = await sheets(p); await shot(p, 'C-390-china-only-train-open');
    const skip = await p.evaluate(() => ({ skipBtn: !!document.querySelector('#s-c86 [data-skip="c86"]'), choose: !!document.querySelector('#s-c86 [data-choose-flat="c86"]') }));
    await p.click('#s-c86 [data-choose-flat="c86"]'); await p.waitForTimeout(1200); const c2 = await sheets(p); await shot(p, 'C-390-china-only-complete');
    note('C-china-only-f-g-h', c0.stages.join() === 'kmg,c86,ljg' && !c0.wedding && !/MU9646|MU5922|Sathorn|Kempinski|Souphattra|Special Express/.test(c0.text) && c1.stages.join() === 'kmg,c86,ljg' && !c1.done && c1.need.includes('stage:c86') && c1.counts.open === 1 && !skip.skipBtn && skip.choose && c2.done && c2.counts.open === 0 && c2.bag.some((x) => /^c86:/.test(x)) && c2.total === 150 + 200 + 105, JSON.stringify({ c0: c0.stages, need1: c1.need, c2: { bag: c2.bag, total: c2.total, done: c2.done } }));
    await p.context().close();
  }
  /* D · I'll join all: A – J; My Trip, View All Steps and Review agree; no package UI */
  {
    const p = await fresh(390); await signIn(p, 'T002'); await contact(p, 'ben.test@example.org'); await trip(p); await clean(p); await trip(p);
    await p.click('[data-scope-all]'); await p.waitForTimeout(1500); const d0 = await sheets(p); await shot(p, 'D-390-join-all');
    await p.click('.prep-all'); await p.waitForTimeout(900); const ov = await p.evaluate(() => (document.querySelector('#prep-steps, .prep-steps') || {}).innerText.replace(/\s+/g, ' ') || ''); await shot(p, 'D-390-view-all-steps'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); const rv = await p.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' '), off: !!document.querySelector('#send.off'), url: location.pathname }));
    note('D-join-all-a-to-j', d0.stages.length === 10 && d0.stages.join() === 'bkk-stay,train,prewed,wedstay,mu9646,kmg,c86,ljg,return,kempinski' && d0.packs === 0 && d0.words === 'Bangkok · Vientiane · China' && d0.counts.open === 10 && /10 still open/i.test(d0.dec) && /10 items to complete/i.test(ov) && !/Complete trip|Essential trip/i.test(d0.text + ov + rv.text) && (/wedding-preparation|your-journey|review/.test(rv.url)), JSON.stringify({ stages: d0.stages, packs: d0.packs, words: d0.words, ov: ov.slice(0, 120), rv: rv.url }));
    await p.context().close();
  }
  /* E · I won't be joining this trip (Ada, a party with Ben): everything cleared, We'll miss you, Send my response, Not joining, reconsider; Ben unaffected */
  {
    const ben = await fresh(390); await signIn(ben, 'T002'); await trip(ben); const benSel = await ben.evaluate(async () => { const r = await SIYL_STAY.select('wedstay', 'heritage-executive'); return r && r.ok; });
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p);
    await p.click('[data-scope-none]'); await p.waitForTimeout(900); const pv = !!(await p.$('[data-release-confirm]')); if (pv) { await p.click('[data-release-confirm]'); await p.waitForTimeout(3000); }
    const e0 = await sheets(p); const card = await p.evaluate(() => ((document.querySelector('[data-not-joining]') || {}).innerText || '').replace(/\s+/g, ' ')); const mine = (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body; const seats = (await api(p, '/api/seating', { method: 'GET' })).body;
    await shot(p, 'E-390-we-will-miss-you');
    const mySeat = seats && seats.mine && ((seats.mine.ceremony || {}).T001 || (seats.mine.dinner || {}).T001);
    note('E-not-joining-clears-everything', e0.stages.length === 0 && e0.words === 'Not joining this trip' && e0.total === 0 && e0.bag.length === 0 && Object.keys((mine && mine.mine) || {}).length === 0 && !mySeat && e0.steps.join() === 'you:complete,journey:complete,wedding:na,preparation:na,about:na,review:attention' && /We’ll miss you\./.test(card) && /Send my response/i.test(card) && /I’d like to reconsider/i.test(card), JSON.stringify({ stages: e0.stages, bag: e0.bag, mine: mine && mine.mine, steps: e0.steps }));
    const s = await send(p); const st = (await api(p, '/api/status?invitation=INV-T001', { method: 'GET' })).body; await trip(p); const after = await p.evaluate(() => ((document.querySelector('[data-not-joining]') || {}).innerText || '').replace(/\s+/g, ' ')); await shot(p, 'E-390-not-joining-sent');
    note('E-send-my-response-then-not-joining', /Send my response/i.test(s.before.btn) && !s.before.off && s.clicked && /Not joining/i.test(s.after) && st && st.received === true && /your response was sent/i.test(after), JSON.stringify({ before: s.before, after: s.after }));
    await p.click('[data-scope-reconsider]'); await p.waitForTimeout(1200); const re = await p.evaluate(() => ({ scope: SIYL_GUEST.scope(), q: /Where will you join us\?/i.test((document.querySelector('#scope') || {}).innerText || '') }));
    const benMine = (await api(ben, '/api/rooms/mine', { method: 'POST', body: '{}' })).body.mine; const benScope = await ben.evaluate(() => SIYL_GUEST.scope() && SIYL_GUEST.scope().none);
    note('E-reconsider-and-partner-untouched', re.scope === null && re.q && benSel && benMine && benMine.wedstay && /heritage-executive/.test(benMine.wedstay.key) && benScope === false, JSON.stringify({ re, benMine, benScope }));
    await ben.context().close(); await p.context().close();
  }

  /* ===== 4 · THE SERVER-SIDE COMPLETION GATE — the Worker's own answer, no UI involved ===== */
  {
    const p = await fresh(390); await signIn(p, 'T002'); await contact(p, 'ben.test@example.org');
    await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', stage: 'wedstay' }) });
    const gr0 = { allergy: { answer: 'no' }, photo: { at: 'x' }, guests: [{ guestId: 'T002', name: 'Ben' }] };
    const c1 = await postRegister(p, { selections: [], totalUsd: 0, contact: { email: 'ben.test@example.org', phone: '+66 81 000 0000' }, stages: { kmg: 'declined', ljg: 'declined' }, guestRecord: { ...gr0, scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: true, none: false, at: 'x' } } });
    note('server-422-china-without-the-train', c1.status === 422 && c1.body.error === 'incomplete' && c1.body.unresolved.map((u) => u.key).join() === 'c86', JSON.stringify(c1.body).slice(0, 220));
    const c2 = await postRegister(p, { selections: [{ id: 'c86', price: 105, qty: 1 }], totalUsd: 105, contact: { email: 'ben.test@example.org', phone: '+66 81 000 0000' }, stages: { kmg: 'declined', ljg: 'declined' }, guestRecord: { ...gr0, scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: true, none: false, at: 'x' } } });
    note('server-202-china-with-the-train', c2.status === 202 && c2.body.ok === true, JSON.stringify({ status: c2.status, kind: c2.body && c2.body.kind }));
    const w1 = await postRegister(p, { selections: [{ id: 'guesthouse', price: 0, qty: 1, stay: 'guesthouse', room: 'guest-house', unit: 'A', complimentary: true }], totalUsd: 0, contact: { email: 'ben.test@example.org', phone: '+66 81 000 0000' }, stages: { wedstay: 'selected' }, templeCeremony: { guests: [{ guestId: 'T002', events: { temple: 'Not joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, sangkhathanState: 'Not applicable', sangkhathan: false }] }, guestRecord: { ...gr0, dress: { all: true }, scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false, at: 'x' } } });
    note('server-422-wedding-seat-missing', w1.status === 422 && w1.body.missing.some((m) => m.key === 'seat:dinner'), JSON.stringify(w1.body).slice(0, 220));
    const jn = await api(p, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', key: 'guesthouse/guest-house', label: 'A', name: 'Ben' }) });
    for (const [ev, seatId] of [['ceremony', 'C-R-07-02'], ['dinner', 'D-T-07']]) await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', event: ev, seatId, name: 'Ben' }) });
    const w2 = await postRegister(p, { selections: [{ id: 'guesthouse', price: 0, qty: 1, stay: 'guesthouse', room: 'guest-house', unit: 'A', complimentary: true }], totalUsd: 0, contact: { email: 'ben.test@example.org', phone: '+66 81 000 0000' }, stages: { wedstay: 'selected' }, templeCeremony: { guests: [{ guestId: 'T002', events: { temple: 'Not joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, sangkhathanState: 'Not applicable', sangkhathan: false }] }, guestRecord: { ...gr0, dress: { all: true }, scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false, at: 'x' } } });
    note('server-202-wedding-with-the-seats', jn.status === 200 && w2.status === 202 && w2.body.kind === 'update', JSON.stringify({ join: jn.status, status: w2.status, kind: w2.body && w2.body.kind }));
    await p.context().close();
  }

  /* ===== 5 · THE PASSPORT PICKER (WebKit): the file input with the accepted types; a photograph chosen; since the four-point close-out (21 Sep 2026) the store is bound (DOCS) → RECEIVED only after the object is stored, the trip still sendable; no guest read route ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p); await clean(p); await trip(p); await toggle(p, 'vientianeWedding', 1000); await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); }); await wedding(p, 'no', 'yes'); await prep(p);
    await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-doc][data-k="passport"] input[type=file]', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(800);
    const pk = await p.evaluate(() => { const row = document.querySelector('[data-doc][data-k="passport"]'); const inp = row && row.querySelector('input[type=file]'); return { row: !!row, accept: inp ? inp.getAttribute('accept') : '', add: row ? (row.querySelector('[data-add]') || {}).innerText : '', state: row ? row.innerText.replace(/\s+/g, ' ') : '' }; });
    const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 22, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 8, 254, 255, 103, 96, 0, 0, 31, 15, 5, 254, 203, 152, 238, 140, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
    const reqs = []; p.on('request', (r) => { if (/\/api\/document/.test(r.url())) reqs.push(r.method()); });
    await p.setInputFiles('[data-doc][data-k="passport"] input[type=file]', { name: 'passport-page.png', mimeType: 'image/png', buffer: Buffer.from(png) }); await p.waitForTimeout(3000);
    const after = await p.evaluate(() => { const row = document.querySelector('[data-doc][data-k="passport"]'); return { err: (row.querySelector('[data-err]') || {}).innerText || '', state: row.innerText.replace(/\s+/g, ' '), stored: JSON.stringify(localStorage.getItem('siyl.docs') || '').includes('passport-page'), ready: SIYL_GUEST.readiness().need.filter((x) => /doc|passport/.test(x.key)).length }; });
    await shot(p, '390-passport-picker-honest');
    const direct = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/document', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'x-invitation': a.invitationId, 'x-guest': a.guestId, 'x-kind': 'passport', 'content-type': 'image/png' }, body: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) }); return { status: r.status, body: await r.json().catch(() => null) }; });
    const noRead = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/document', { headers: { 'x-siyl-auth': a.bearer } }); return r.status; });
    note('passport-picker-received-with-store', pk.row && pk.accept === 'image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf' && /Add passport/i.test(pk.add) && /Optional/i.test(pk.state) && reqs.includes('POST') && after.err === '' && after.stored && /Received/i.test(after.state) && after.ready === 0 && direct.status === 201 && direct.body && direct.body.status === 'RECEIVED' && noRead === 405, JSON.stringify({ accept: pk.accept, add: pk.add, err: after.err.slice(0, 120), stored: after.stored, state: after.state.slice(0, 80), direct: direct.status, noRead }));
    await p.context().close();
  }

  /* ===== 6 · FIRST / LAST NAME EDITING (Ada, a party with Ben): the same CON / code / party; the new name on My Trip, Review, Who Sits Where, the seat holder and the Guest Relations record; Ben untouched ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p); await clean(p); await trip(p); await toggle(p, 'vientianeWedding', 1000);
    await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); }); await wedding(p, 'no', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-05-02'], ['dinner', 'D-T-05']]) await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', event: ev, seatId, name: 'Ada' }) });
    await about(p, 'Pandan');
    const before = await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); return { guestId: a.guestId, invitationId: a.invitationId, partyId: a.partyId, contactId: a.contactId || null, couple: a.couple || null, name: SIYL_GUEST.nameOf() }; });
    await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    await p.fill('input[data-c="firstName"]', 'Adelheid'); await p.dispatchEvent('input[data-c="firstName"]', 'change'); await p.waitForTimeout(1200);   /* the page re-renders on a change: the next field is filled on the fresh input */
    await p.fill('input[data-c="lastName"]', 'Acker'); await p.dispatchEvent('input[data-c="lastName"]', 'change'); await p.waitForTimeout(2500);
    const prof = await p.evaluate(() => ({ full: SIYL_GUEST.value(SIYL_GUEST.me().guestId, 'fullName'), name: SIYL_GUEST.nameOf(), text: document.body.innerText.replace(/\s+/g, ' ') }));
    const after = await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); return { guestId: a.guestId, invitationId: a.invitationId, partyId: a.partyId, contactId: a.contactId || null, couple: a.couple || null }; });
    await trip(p); const tripLabel = await p.evaluate(() => (document.querySelector('[data-party-label]') || {}).innerText || '');
    await p.goto(O + '/wedding-preparation.html#seats', { waitUntil: 'load' }); await p.waitForTimeout(2500); const holder = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const seatPlan = (await gr('/api/seating/plan')).body; const holderName = (() => { try { const rows = []; const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.guestId === 'T001' && typeof o.name === 'string' && o.seatId) rows.push(o.name); Object.values(o).forEach(walk); } }; walk(seatPlan); return rows; } catch (e) { return []; } })();
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); const rv = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const s = await send(p); const rec = await gr('/api/gr/record?invitation=INV-T001'); const recName = rec.body && rec.body.record ? JSON.stringify(rec.body.record.registration.guestRecord.guests[0]) : '';
    const ben = await fresh(390); await signIn(ben, 'T002'); await ben.goto(O + '/profile.html', { waitUntil: 'load' }); await ben.waitForTimeout(1200); const benName = await ben.evaluate(() => ({ first: document.querySelector('input[data-c="firstName"]').value, name: SIYL_GUEST.nameOf(), party: SIYL_GUEST.partyNames ? SIYL_GUEST.partyNames() : '' }));
    await shot(p, '390-name-review');
    note('name-editing-propagates-identity-kept', prof.full === 'Adelheid Acker' && prof.name === 'Adelheid' && JSON.stringify(before.guestId + before.invitationId + before.partyId + before.contactId + before.couple) === JSON.stringify(after.guestId + after.invitationId + after.partyId + after.contactId + after.couple) && /Adelheid/i.test(tripLabel) && /Adelheid/i.test(holder) && holderName.length >= 1 && holderName.every((h) => /Adelheid/.test(h)) && /Adelheid/.test(rv) && s.clicked && rec.status === 200 && /Adelheid/.test(recName) && /Acker/.test(recName) && benName.first === 'Ben' && !/Adelheid|Acker/.test(benName.first + benName.name), JSON.stringify({ prof: { full: prof.full, name: prof.name }, ids: before, tripLabel, holderName, holderPage: /Adelheid/.test(holder), review: /Adelheid/.test(rv), sent: s.clicked, send: s.before, recStatus: rec.status, ben: benName, rec: recName.slice(0, 160) }));
    await ben.context().close(); await p.context().close();
  }
}

/* ===== 7 · PRESERVED: the Lijiang film and the destination galleries at 390 (WebKit) ===== */
{
  const p = await fresh(390); await p.goto(O + '/destination.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const film = await p.evaluate(async () => { const f = document.querySelector('[data-clip]'); if (!f) return { none: true }; f.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 4000)); const v = f.querySelector('video'); return { state: f.getAttribute('data-clip-state'), play: !!f.querySelector('[data-clip-play]'), sound: !!f.querySelector('[data-clip-sound]'), inline: v.playsInline, loop: v.loop, t: v.currentTime, paused: v.paused, opacity: getComputedStyle(v).opacity, src: (v.currentSrc || v.src || '').split('/').pop(), ready: v.readyState }; });
  const gal = await p.evaluate(() => { const gut = (document.querySelector('.a-dest .a-eyebrow, .a-dest h2, .a-dest p') || document.querySelector('main h2')); const left = gut ? Math.round(gut.getBoundingClientRect().left) : null; return { content: left, rails: [...document.querySelectorAll('.refgal, .acar')].slice(0, 6).map((c) => { const first = c.querySelector('.aslide'); return first ? Math.round(first.getBoundingClientRect().left) : null; }), arrows: document.querySelectorAll('[data-a="next"]').length, counters: document.querySelectorAll('.refgal-count').length, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  await shot(p, '390-destination-preserved');
  note('lijiang-film-preserved', !film.none && film.play && film.sound && film.inline && film.loop && /\.mp4$/.test(film.src) && film.opacity === '1' && (film.state === 'playing' ? film.t > 0 : true), JSON.stringify(film));
  note('destination-galleries-aligned', gal.content === 24 && gal.rails.length >= 4 && gal.rails.every((l) => l === 24) && gal.arrows >= 4 && gal.counters >= 4 && gal.ov <= 1, JSON.stringify(gal));
  await p.context().close();
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');

fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close(); await wk.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
