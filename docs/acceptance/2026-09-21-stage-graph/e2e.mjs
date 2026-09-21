/* THE GLOBAL MY TRIP REBUILD — E2E on the isolated stage worker (Owner, 21 Sep 2026). Synthetic guests only (T001 Ada · T002 Ben,
   one party · T003 Cleo); codes read from the scratchpad, never printed.   node docs/acceptance/2026-09-21-stage-graph/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the four participation sheets on the page (every combination of the Owner's matrix, the sheets' headings, the mandatory
   train) · the decline path (We'll miss you → Send my response → NOT JOINING → I'd like to reconsider; a partner unaffected) ·
   the release preview before a scope leaves · the seat gate (attending + no seat blocks; the seat enables) · the Worker's own
   refusal of an incomplete trip (422) · the migration of a legacy answer (former Essential · former Complete) · the waiting list
   in the record and the emails · the wedding stay's order and words · four widths (320 · 390 · 834 · 1440) · the console. */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 1200) }); console.log((ok ? "PASS " : "FAIL ") + id + " — " + String(d).slice(0, ok ? 220 : 1200)); };
const b = await chromium.launch();
const errors = new Map();
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1)); p.on('console', (m) => { if (m.type() === 'error' && !/404|409|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); }); return p; };
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

/* ---- the rebuild's own helpers ---- */
const VTE = ['vientianePreWedding', 'vientianeWedding'];
const toggle = async (p, key, ms) => { await p.click('[data-scope="' + key + '"]'); await p.waitForTimeout(700); const pv = await p.$('[data-release-confirm]'); if (pv) await p.click('[data-release-confirm]'); await p.waitForTimeout(ms || 1200); return !!pv; };
const sheets = (p) => p.evaluate(() => ({ on: [...document.querySelectorAll('[data-scope][aria-pressed="true"]')].map((e) => e.getAttribute('data-scope')), cards: document.querySelectorAll('[data-scope]').length, stages: [...document.querySelectorAll('#chrono .p-stage[id^="s-"]')].map((e) => e.id.slice(2)).filter((k) => k !== 'wedding' && k !== 'excluded'), heads: [...document.querySelectorAll('.p-sheet-h .t-l1')].map((e) => e.innerText.trim()), wedding: !!document.querySelector('#s-wedding'), words: SIYL_GUEST.scopeWords(), counts: (document.querySelector('[data-counts]') || {}).innerText || '', packs: document.querySelectorAll('.p-pack, [data-package]').length, current: /Your current trip|Every stage has an answer/i.test((document.querySelector('#dec') || {}).innerText || '') }));
const answerAll = (p) => p.evaluate(async () => { for (const s of SIYL_JOURNEY.relevantSegments()) { if (SIYL_JOURNEY.state(s) !== 'open') continue; if (s.key === 'c86') SIYL_PRICE.items('c86').forEach((it) => SIYL_BAG.put(it)); else await SIYL_JOURNEY.decline(s); } });
const send = async (p) => { await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); const before = await p.evaluate(() => ({ btn: (document.querySelector('#send') || {}).innerText || '', off: !!document.querySelector('#send.off'), ready: /Your trip can be sent/i.test(document.body.innerText) })); const r = await p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn) return { clicked: false }; btn.click(); await new Promise((r) => setTimeout(r, 6000)); return { clicked: true, after: btn.innerText, err: (document.querySelector('#err') || {}).innerText || '', main: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400) }; }); return { before, ...r }; };
const postRegister = (p, registration) => p.evaluate(async (registration) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/register', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: a.invitationId, registration: Object.assign({ channel: 'journey-shop', guestId: a.guestId, partyId: a.partyId || null }, registration), text: 'SEE YOU IN LAOS — JOURNEY SELECTION' }) }); let body = null; try { body = await r.json(); } catch (e) {} return { status: r.status, body }; }, registration);

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003']) await resetGuest(id);
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-graph' }, 'POST');

  /* ===== 1 · THE FOUR SHEETS (T001 Ada): every combination of the matrix on the page; the sheets' headings; unselected scopes' stages hidden; all / none ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p);
    const s0 = await sheets(p); await shot(p, '390-where-will-you-join-us');
    note('four-sheets-before-the-answer', s0.cards === 4 && s0.on.length === 0 && s0.stages.length === 0 && s0.packs === 0 && !s0.current, JSON.stringify(s0));
    const M = [
      ['bangkok', ['bangkok'], ['bkk-stay', 'kempinski'], ['Bangkok', 'Back to Bangkok']],
      ['prewedding', ['vientianePreWedding'], ['prewed'], ['Vientiane · Before the Wedding']],
      ['wedding', ['vientianeWedding'], ['wedstay'], ['Vientiane · The Wedding']],
      ['china', ['china'], ['kmg', 'c86', 'ljg'], ['China']],
      ['bangkok+prewedding', ['bangkok', 'vientianePreWedding'], ['bkk-stay', 'train', 'prewed', 'kempinski'], ['Bangkok', 'Vientiane · Before the Wedding', 'Back to Bangkok']],
      ['bangkok+wedding', ['bangkok', 'vientianeWedding'], ['bkk-stay', 'wedstay', 'kempinski'], ['Bangkok', 'Vientiane · The Wedding', 'Back to Bangkok']],
      ['wedding+china', ['vientianeWedding', 'china'], ['wedstay', 'mu9646', 'kmg', 'c86', 'ljg'], ['Vientiane · The Wedding', 'China']],
      ['china+bangkok', ['bangkok', 'china'], ['bkk-stay', 'kmg', 'c86', 'ljg', 'return', 'kempinski'], ['Bangkok', 'China', 'Back to Bangkok']],
    ];
    for (const [name, keys, stages, heads] of M) {
      await p.evaluate(() => SIYL_GUEST.clearScope()); await trip(p);
      for (const k of keys) await toggle(p, k, 900);
      const st = await sheets(p);
      const ok = JSON.stringify(st.on) === JSON.stringify(keys) && JSON.stringify(st.stages) === JSON.stringify(stages) && JSON.stringify(st.heads.map((h) => h.toLowerCase())) === JSON.stringify(heads.map((h) => h.toLowerCase())) && st.wedding === keys.includes('vientianeWedding') && st.packs === 0 && st.current;
      note('sheet-' + name, ok, JSON.stringify({ on: st.on, stages: st.stages, heads: st.heads, wedding: st.wedding, words: st.words }));
      if (name === 'china+bangkok') await shot(p, '390-sheets-china-bangkok');
    }
    await p.evaluate(() => SIYL_GUEST.clearScope()); await trip(p); await p.click('[data-scope-all]'); await p.waitForTimeout(1500);
    const all = await sheets(p); await shot(p, '390-join-all');
    note('join-all-selects-every-sheet', all.on.length === 4 && all.stages.length === 10 && all.heads.length === 5 && all.words === 'Bangkok · Vientiane · China' && /10 still open/.test(all.counts), JSON.stringify({ on: all.on, heads: all.heads, counts: all.counts }));
    /* the mandatory train: no "Not joining this stage"; a declined train (a legacy skip) asks to be chosen */
    const g = await p.evaluate(() => ({ skipBtn: !!document.querySelector('#s-c86 [data-skip="c86"]'), otherSkip: !!document.querySelector('#s-return [data-skip="return"]'), choose: !!document.querySelector('#s-c86 [data-choose-flat="c86"]') }));
    await p.evaluate(() => SIYL_JOURNEY.skip('c86', true, 'manual')); await trip(p);
    const g2 = await p.evaluate(() => ({ card: (document.querySelector('#s-c86') || {}).innerText || '', need: SIYL_GUEST.readiness().need.map((x) => x.key), done: SIYL_GUEST.done('journey') }));
    await shot(p, '390-mandatory-train');
    note('mandatory-train-cannot-be-skipped', !g.skipBtn && g.otherSkip && g.choose && /Part of China/i.test(g2.card) && /Select this travel/i.test(g2.card) && g2.need.includes('stage:c86') && !g2.done, JSON.stringify({ g, need: g2.need.filter((k) => /c86/.test(k)) }));
    await p.click('#s-c86 [data-choose-flat="c86"]'); await p.waitForTimeout(1200);
    const g3 = await p.evaluate(() => ({ state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'c86')), bag: SIYL_BAG.get().map((x) => x.id), total: SIYL_BAG.total() }));
    note('mandatory-train-chosen', g3.state === 'selected' && g3.bag.includes('c86') && g3.total === 105, JSON.stringify(g3));
    /* every stage answered → the current trip says so; Review & Send opens */
    await answerAll(p); await trip(p);
    const d = await p.evaluate(() => ({ dec: (document.querySelector('#dec') || {}).innerText.replace(/\s+/g, ' '), ok: SIYL_GUEST.done('journey'), counts: SIYL_JOURNEY.counts() }));
    await shot(p, '390-every-stage-answered');
    note('every-stage-answered-no-package', /Every stage has an answer/i.test(d.dec) && d.ok && d.counts.open === 0 && d.counts.declined === 9 && d.counts.confirmed === 1 && !/Complete trip|Essential trip|package/i.test(d.dec), JSON.stringify({ ok: d.ok, counts: d.counts, dec: d.dec.slice(0, 160) }));
    await p.context().close();
  }

  /* ===== 2 · THE RELEASE PREVIEW (T003 Cleo): a scope that holds a room, a seat, a line leaves only after confirmation — named, the guest's own; Keep everything cancels ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p);
    await p.click('[data-scope-all]'); await p.waitForTimeout(1200);
    const sel = await p.evaluate(async () => { const r1 = await SIYL_STAY.select('prewed', 'heritage'); const r2 = await SIYL_STAY.select('wedstay', 'heritage'); SIYL_PRICE.items('mu9646').forEach((it) => SIYL_BAG.put(it)); return { r1: r1 && r1.ok, r2: r2 && r2.ok }; });
    await wedding(p, 'no', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-06-02'], ['dinner', 'D-T-06']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) }); if (sr.status !== 200) note('seat-fixture-' + ev, false, JSON.stringify(sr.body)); }
    await trip(p); await p.evaluate(() => SIYL_STAY.sync()); await p.waitForTimeout(600);
    await p.click('[data-scope="vientianeWedding"]'); await p.waitForTimeout(900);
    const pv = await p.evaluate(() => { const c = document.querySelector('[data-release-preview]'); return { shown: !!c, text: c ? c.innerText.replace(/\s+/g, ' ') : '', items: c ? [...c.querySelectorAll('li')].map((e) => e.innerText.trim()) : [], stillOn: document.querySelector('[data-scope="vientianeWedding"]').getAttribute('aria-pressed') === 'true' }; });
    await shot(p, '390-release-preview');
    const beforeMine = (await mine(p)).mine;
    note('release-preview-names-own-resources', sel.r1 && sel.r2 && pv.shown && pv.stillOn && /Before this changes/i.test(pv.text) && /yours alone/i.test(pv.text) && pv.items.some((t) => /Wedding Stay|Souphattra|Room A/i.test(t)) && pv.items.some((t) => /dinner seat/i.test(t)) && pv.items.some((t) => /ceremony seat/i.test(t)) && pv.items.some((t) => /MU9646/i.test(t)) && !pv.items.some((t) => /Pre-Wedding/i.test(t)) && beforeMine.wedstay, JSON.stringify({ items: pv.items, mine: Object.keys(beforeMine) }));
    await p.click('[data-release-cancel]'); await p.waitForTimeout(800);
    const kept = { mine: (await mine(p)).mine, bag: await p.evaluate(() => SIYL_BAG.get().map((x) => x.id)), on: (await sheets(p)).on, preview: !!(await p.$('[data-release-preview]')) };
    note('keep-everything-cancels', kept.mine.wedstay && kept.mine.prewed && kept.bag.includes('mu9646') && kept.on.includes('vientianeWedding') && !kept.preview, JSON.stringify({ mine: Object.keys(kept.mine), bag: kept.bag }));
    /* the partner's resources: Ben (T002, Cleo is not his party) holds Heritage B — untouched throughout */
    const B2 = await fresh(); await signIn(B2, 'T002'); const jb = await api(B2, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', key: 'wedstay/heritage', label: 'B', name: 'Ben' }) });
    await p.click('[data-scope="vientianeWedding"]'); await p.waitForTimeout(900); await p.click('[data-release-confirm]'); await p.waitForTimeout(3500);
    const after = { mine: (await mine(p)).mine, seats: (await api(p, '/api/seating', { method: 'GET' })).body, bag: await p.evaluate(() => SIYL_BAG.get().map((x) => x.id)), st: await sheets(p), failed: !!(await p.$('[data-scope-failed]')) };
    const mySeats = (v) => { const out = []; for (const ev of ['ceremony', 'dinner']) { const m = v && v.mine && v.mine[ev]; if (m && m.T003) out.push(ev); } return out; };
    const benAfter = (await mine(B2)).mine;
    await shot(p, '390-release-confirmed');
    note('confirm-releases-only-the-wedding', !after.mine.wedstay && after.mine.prewed && mySeats(after.seats).length === 0 && !after.bag.includes('mu9646') && !after.st.on.includes('vientianeWedding') && after.st.on.includes('vientianePreWedding') && !after.st.wedding && !after.failed && jb.status === 200 && benAfter && benAfter.wedstay && benAfter.wedstay.label === 'B', JSON.stringify({ mine: Object.keys(after.mine), seats: mySeats(after.seats), bag: after.bag, on: after.st.on, ben: benAfter }));
    await B2.context().close(); await p.context().close();
  }

  /* ===== 3 · THE DECLINE PATH (T001 Ada, a party with Ben T002): We'll miss you → Send my response → NOT JOINING → I'd like to reconsider; Ben unaffected ===== */
  {
    const ben = await fresh(390); await signIn(ben, 'T002'); await contact(ben, 'ben.test@example.org'); await trip(ben); await toggle(ben, 'vientianeWedding', 900);
    const benSel = await ben.evaluate(async () => { const r = await SIYL_STAY.select('wedstay', 'heritage-executive'); return r && r.ok; });
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p); await p.evaluate(() => { SIYL_GUEST.clearScope(); localStorage.setItem('siyl.skip', '[]'); SIYL_BAG.set([]); }); await trip(p);
    await toggle(p, 'vientianeWedding', 900); const adaSel = await p.evaluate(async () => { const r = await SIYL_STAY.select('wedstay', 'heritage'); return r && r.ok; }); await trip(p);
    await p.click('[data-scope-none]'); await p.waitForTimeout(900);
    const pv = await p.evaluate(() => { const c = document.querySelector('[data-release-preview]'); return { shown: !!c, text: c ? c.innerText.replace(/\s+/g, ' ') : '' }; });
    note('decline-previews-own-resources', pv.shown && /not joining the trip/i.test(pv.text) && /Yes, I won’t be joining/i.test(pv.text) && /Wedding Stay|Souphattra/i.test(pv.text), pv.text.slice(0, 200));
    await p.click('[data-release-confirm]'); await p.waitForTimeout(3000);
    const d0 = await p.evaluate(() => ({ card: (document.querySelector('[data-not-joining]') || {}).innerText ? document.querySelector('[data-not-joining]').innerText.replace(/\s+/g, ' ') : '', stages: document.querySelectorAll('#chrono .p-stage').length, words: SIYL_GUEST.scopeWords(), ready: SIYL_GUEST.readiness().ok, steps: SIYL_GUEST.steps().map((s) => s.key + ':' + s.state), total: SIYL_BAG.total(), send: (document.querySelector('[data-decline-send]') || {}).innerText || '' }));
    await shot(p, '390-we-will-miss-you');
    note('we-will-miss-you', adaSel && /We’ll miss you\./.test(d0.card) && /We’re sorry you won’t be able to join us\./.test(d0.card) && /Haruthai & Suthep would be very happy to celebrate with you\. If your plans change, you’re always welcome to reconsider\./.test(d0.card) && /If anything changes, please contact Guest Relations\./.test(d0.card) && /Send my response/i.test(d0.send) && /I’d like to reconsider/i.test(d0.card) && d0.stages === 0 && d0.words === 'Not joining this trip' && d0.ready && d0.total === 0 && d0.steps.join() === 'you:complete,journey:complete,wedding:na,preparation:na,about:na,review:attention', JSON.stringify({ steps: d0.steps, send: d0.send, card: d0.card.slice(0, 120) }));
    const adaMine = (await mine(p)).mine, benMine = (await mine(ben)).mine, benScope = await ben.evaluate(() => (SIYL_GUEST.scope() || {}).vientianeWedding);
    note('partner-unaffected-by-a-decline', !adaMine.wedstay && benSel && benMine.wedstay && benMine.wedstay.key === 'wedstay/heritage-executive' && benScope === true, JSON.stringify({ ada: Object.keys(adaMine), ben: benMine, benScope }));
    const s = await send(p); await shot(p, '390-send-my-response');
    const st = (await api(p, '/api/status?invitation=INV-T001', { method: 'GET' })).body;
    note('send-my-response', /Send my response/i.test(s.before.btn) && !s.before.off && s.clicked && /Not joining/i.test(s.after) && st && st.received === true, JSON.stringify({ before: s.before, after: s.after, err: s.err }));
    await trip(p); const d1 = await p.evaluate(() => ({ card: (document.querySelector('[data-not-joining]') || {}).innerText.replace(/\s+/g, ' '), sentBtn: !!document.querySelector('[data-not-joining] .is-current') }));
    await shot(p, '390-not-joining-sent');
    note('not-joining-after-the-send', /Not joining · your response was sent/i.test(d1.card) && d1.sentBtn && /I’d like to reconsider/i.test(d1.card), d1.card.slice(0, 160));
    await p.click('[data-scope-reconsider]'); await p.waitForTimeout(1200);
    const r = await sheets(p); const rs = await p.evaluate(() => ({ scope: SIYL_GUEST.scope(), q: /Where will you join us\?/i.test((document.querySelector('#scope') || {}).innerText || '') }));
    await shot(p, '390-reconsider');
    note('reconsider-asks-the-question-again', rs.scope === null && rs.q && r.on.length === 0 && r.cards === 4, JSON.stringify({ scope: rs.scope, on: r.on }));
    /* the CON / COUPL ids and the codes are untouched: the same sign-in, the same party */
    const who = await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); return { guestId: a.guestId, partyId: a.partyId, invitationId: a.invitationId }; });
    note('ids-untouched', who.guestId === 'T001' && who.invitationId === 'INV-T001' && who.partyId === 'INV-T01', JSON.stringify(who));
    await ben.context().close(); await p.context().close();
  }

  /* ===== 4 · THE SEAT GATE (T003 Cleo, the wedding): attending the dinner with no seat blocks Review & Send; the seat confirmed enables it; a declined event needs none ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p);
    await p.evaluate(() => SIYL_GUEST.clearScope()); await trip(p); await toggle(p, 'vientianeWedding', 900);
    await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); });
    await wedding(p, 'no', 'yes'); await prep(p); await about(p, 'Pandan');
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const g0 = await need(p);
    /* the shell's gate: Review & Send is not entered while a required seat is missing — the guest lands on the seats */
    const r0 = { url: p.url(), text: await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')) };
    await shot(p, '390-seat-gate-blocks');
    note('seat-missing-blocks-send', !g0.ok && g0.keys.includes('seat:dinner') && g0.keys.includes('seat:ceremony') && g0.first === 'wedding-preparation.html#seats' && /wedding-preparation(\.html)?\?from=review#seats/.test(r0.url) && !/review\.html/.test(r0.url), JSON.stringify({ g0, url: r0.url }));
    const srv0 = await postRegister(p, { selections: [{ id: 'guesthouse', price: 0, qty: 1, stay: 'guesthouse', room: 'guest-house', unit: 'A', complimentary: true }], totalUsd: 0, contact: { email: 'cleo.test@example.org', phone: '+66 81 000 0000' }, stages: { wedstay: 'selected' }, templeCeremony: { guests: [{ guestId: 'T003', events: { temple: 'Not joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, sangkhathanState: 'Not applicable', sangkhathan: false }] }, guestRecord: { scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false, at: '2026-09-21T10:00:00.000Z' }, dress: { all: true }, allergy: { answer: 'no' }, photo: { at: 'x' }, guests: [{ guestId: 'T003', name: 'Cleo' }] } });
    note('worker-refuses-without-the-seat', srv0.status === 422 && srv0.body && srv0.body.error === 'incomplete' && srv0.body.missing.some((m) => m.key === 'seat:dinner'), JSON.stringify(srv0.body).slice(0, 240));
    for (const [ev, seatId] of [['ceremony', 'C-R-06-02'], ['dinner', 'D-T-06']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) }); if (sr.status !== 200) note('seat-' + ev, false, JSON.stringify(sr.body)); }
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const g1 = await need(p); const r1 = await p.evaluate(() => ({ off: !!document.querySelector('#send.off'), ready: /Your trip can be sent/i.test(document.body.innerText) }));
    await shot(p, '390-seat-gate-open');
    note('seat-confirmed-enables-send', g1.ok && !r1.off && r1.ready, JSON.stringify(g1));
    /* the wedding-stay total: the Guest House USD 0 — the Souphattra Heritage USD 145 for both nights, the Riverside USD 60 */
    const totals = await p.evaluate(async () => { const out = {}; out.gh = SIYL_BAG.total(); await SIYL_STAY.select('wedstay', 'heritage'); out.her = SIYL_BAG.total(); await SIYL_STAY.select('riverside', 'superior-window'); out.rv = SIYL_BAG.total(); await SIYL_STAY.select('guesthouse', 'guest-house'); out.back = SIYL_BAG.total(); return out; });
    note('wedding-stay-totals', totals.gh === 0 && totals.her === 145 && totals.rv === 60 && totals.back === 0, JSON.stringify(totals));
    await p.context().close();
  }

  /* ===== 5 · THE WORKER REFUSES AN INCOMPLETE TRIP (T002 Ben): an unresolved stage · a declined mandatory train · a claimed but unheld stay; a complete one is accepted ===== */
  {
    const p = await fresh(390); await signIn(p, 'T002'); await contact(p, 'ben.test@example.org');
    await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', stage: 'wedstay' }) });   /* Ben's wedding room of section 3 goes: a hold outside the trip would block first */
    const base = { contact: { email: 'ben.test@example.org', phone: '+66 81 000 0000' }, guestRecord: { scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: true, none: false, at: '2026-09-21T10:00:00.000Z' }, allergy: { answer: 'no' }, photo: { at: 'x' }, guests: [{ guestId: 'T002', name: 'Ben' }] } };
    const a = await postRegister(p, { ...base, selections: [], totalUsd: 0, stages: { kmg: 'declined', c86: 'declined', ljg: 'declined' } });
    note('worker-422-declined-mandatory-train', a.status === 422 && a.body.error === 'incomplete' && a.body.unresolved.length === 1 && a.body.unresolved[0].key === 'c86' && a.body.unresolved[0].why === 'mandatory', JSON.stringify(a.body).slice(0, 200));
    const b2 = await postRegister(p, { ...base, selections: [{ id: 'c86', price: 105, qty: 1 }], totalUsd: 105, stages: { kmg: 'selected', ljg: 'declined' } });
    note('worker-422-claimed-stay-not-held', b2.status === 422 && b2.body.unresolved.map((u) => u.key).join() === 'kmg', JSON.stringify(b2.body).slice(0, 200));
    const c = await postRegister(p, { ...base, selections: [{ id: 'c86', price: 105, qty: 1 }], totalUsd: 105, stages: { kmg: 'declined', ljg: 'declined' } });
    const st = (await api(p, '/api/status?invitation=INV-T002', { method: 'GET' })).body;
    note('worker-accepts-a-complete-china-trip', c.status === 202 && c.body.ok && st && st.received === true, JSON.stringify({ status: c.status, kind: c.body && c.body.kind, received: st && st.received }));
    await p.context().close();
  }

  /* ===== 6 · THE MIGRATION (T001 Ada): a legacy answer in the draft — a former Essential (D1 held, C declined) reads as the wedding alone with D1 as booked; a former Complete keeps every line; nothing is written back ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org'); await trip(p);
    await p.evaluate(() => SIYL_GUEST.clearScope());
    const j = await api(p, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', key: 'wedstay/heritage-executive', label: 'C', name: 'Ada' }) });
    await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('siyl.guest') || '{}'); st.scope = { bangkok: false, vientiane: true, china: false, none: false, at: '2026-09-19T10:00:00.000Z', by: 'T001' }; localStorage.setItem('siyl.guest', JSON.stringify(st)); localStorage.setItem('siyl.skip', JSON.stringify(['prewed'])); localStorage.setItem('siyl.bag', JSON.stringify([{ id: 'wedstay', name: 'Wedding Stay · Souphattra Heritage', price: 155, qty: 1, stay: 'souphattra', room: 'heritage-executive', unit: 'C', unitName: 'Room C' }])); });
    await trip(p);
    const e = await p.evaluate(() => ({ scope: SIYL_GUEST.scope(), stages: [...document.querySelectorAll('#chrono .p-stage[id^="s-"]')].map((x) => x.id.slice(2)).filter((k) => k !== 'wedding' && k !== 'excluded'), on: [...document.querySelectorAll('[data-scope][aria-pressed="true"]')].map((x) => x.getAttribute('data-scope')), state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'wedstay')), bag: SIYL_BAG.get().map((x) => x.id + ':' + x.room + ':' + x.unit + ':' + x.price), stored: JSON.parse(localStorage.getItem('siyl.guest')).scope, words: SIYL_GUEST.scopeWords() }));
    const m = (await mine(p)).mine;
    await shot(p, '390-migrated-essential');
    note('former-essential-is-the-wedding-with-d1', j.status === 200 && e.scope && e.scope.vientianeWedding === true && e.scope.vientianePreWedding === false && e.scope.migrated === true && JSON.stringify(e.stages) === JSON.stringify(['wedstay']) && JSON.stringify(e.on) === JSON.stringify(['vientianeWedding']) && e.state === 'selected' && e.bag.join() === 'wedstay:heritage-executive:C:155' && e.stored.vientiane === true && e.stored.vientianeWedding === undefined && m.wedstay && m.wedstay.label === 'C' && e.words === 'Vientiane · The Wedding', JSON.stringify({ scope: e.scope, stages: e.stages, bag: e.bag, mine: m }));
    /* former Complete: the legacy answer joins everywhere; every line as it was */
    await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('siyl.guest') || '{}'); st.scope = { bangkok: true, vientiane: true, china: true, none: false, at: '2026-09-19T10:00:00.000Z', by: 'T001' }; localStorage.setItem('siyl.guest', JSON.stringify(st)); localStorage.setItem('siyl.skip', '[]'); localStorage.setItem('siyl.bag', JSON.stringify([{ id: 'wedstay', name: 'Wedding Stay', price: 155, qty: 1, stay: 'souphattra', room: 'heritage-executive', unit: 'C' }, { id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 }, { id: 'c86', name: 'C86', price: 105, qty: 1 }])); localStorage.setItem('siyl.package', JSON.stringify({ kind: 'complete' })); });
    await trip(p);
    const c = await p.evaluate(() => ({ scope: SIYL_GUEST.scope(), all: SIYL_GUEST.joinsAll(), stages: document.querySelectorAll('#chrono .p-stage[id^="s-"]:not(#s-wedding):not(#s-excluded)').length, bag: SIYL_BAG.get().map((x) => x.id).sort(), total: SIYL_BAG.total(), counts: SIYL_JOURNEY.counts(), packs: document.querySelectorAll('.p-pack, [data-package]').length }));
    note('former-complete-keeps-every-line', c.all && c.stages === 10 && c.bag.join() === 'c86,train,wedstay' && c.total === 360 && c.counts.confirmed === 3 && c.counts.open === 7 && c.packs === 0, JSON.stringify({ bag: c.bag, total: c.total, counts: c.counts }));
    await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage: 'wedstay' }) });
    await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.skip', 'siyl.package'].forEach((k) => localStorage.removeItem(k)); });
    await p.context().close();
  }

  /* ===== 7 · THE WAITING LIST IN THE RECORD (T003 Cleo, Wedding + China): Lijiang full for everyone → the waiting list answers H at USD 0; the record and both emails carry the position ===== */
  {
    const plan = await gr('/api/rooms/plan'); const LJG = Object.keys((plan.body && plan.body.units) || {}).filter((k) => /^ljg\//.test(k));
    let filled = 0; for (const key of LJG) { const occ = []; for (const u of plan.body.units[key]) for (let i = (u.taken || 0); i < (u.places || 2); i++) occ.push({ key, label: u.label, guestId: 'Z' + key.replace(/\W/g, '') + u.label + i, invitationId: 'INV-Z' + u.label + i, partyId: 'INV-Z' + u.label + i, name: 'Z' }); if (!occ.length) continue; const r = await gr('/api/rooms/migrate', { occupants: occ, actor: 'e2e-graph' }); if (r.status === 200 && r.body && r.body.ok) filled += occ.length; }
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org'); await trip(p);
    await p.evaluate(() => SIYL_GUEST.clearScope()); await trip(p); await toggle(p, 'vientianeWedding', 900); await toggle(p, 'china', 900);
    const sold = await p.evaluate(() => ({ soldOut: SIYL_UNITS.soldOut('ljg', 'viewing-270'), ljgAll: SIYL_ROOMS.lijiang.rooms.every((r) => SIYL_UNITS.soldOut('ljg', r.slug)) }));
    const w = await p.evaluate(async () => { const r = await SIYL_UNITS.wait('ljg', SIYL_JOURNEY.partySize(), SIYL_ROOMS.lijiang.rooms.map((r) => 'ljg/' + r.slug)); await SIYL_STAY.select('guesthouse', 'guest-house'); await SIYL_STAY.select('kmg', 'italian'); SIYL_PRICE.items('c86').forEach((it) => SIYL_BAG.put(it)); SIYL_PRICE.items('mu9646').forEach((it) => SIYL_BAG.put(it)); return { ok: r && r.ok, state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'ljg')), counts: SIYL_JOURNEY.counts(), total: SIYL_BAG.total() }; });
    await trip(p); await shot(p, '390-waiting-list-stage');
    note('waiting-list-answers-the-stage-at-usd-0', filled > 0 && sold.ljgAll && w.ok && w.state === 'waitlisted' && w.counts.open === 0 && w.counts.waitlisted === 1 && w.total === 150 + 105 + 275, JSON.stringify({ filled, sold, w }));
    await wedding(p, 'no', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-06-03'], ['dinner', 'D-T-08']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) }); if (sr.status !== 200) note('seat-' + ev, false, JSON.stringify(sr.body)); }
    await about(p, 'Pandan');
    const s = await send(p);
    const rec = await gr('/api/gr/record?invitation=INV-T003');
    const rooms = rec.body && rec.body.record ? rec.body.record.rooms : null, gm = rec.body && rec.body.guestMail ? rec.body.guestMail.text : '', om = rec.body && rec.body.ownerMail ? rec.body.ownerMail.text : '';
    await shot(p, '390-waiting-list-sent');
    note('waiting-list-in-record-and-emails', s.clicked && /Sent to Guest Relations/i.test(s.after) && rooms && rooms.ljg && rooms.ljg.waitlisted === true && rooms.ljg.position === 1 && /WAITING LIST/.test(gm) && /Lijiang/.test(gm) && /number 1/.test(gm) && /WAITING LIST/.test(om) && /Lijiang/.test(om) && !/Complete trip|Essential trip|package/i.test(gm + om), JSON.stringify({ after: s.after, err: s.err, ljg: rooms && rooms.ljg }));
    await p.context().close();
  }

  /* ===== 8 · THE JOURNEYS PAGE: the wedding stay's order and words ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
    const j = await p.evaluate(() => { const ids = [...document.querySelectorAll('.p[id^="j-"]')].map((e) => e.id); const t = (id) => (document.getElementById(id) || {}).innerText || ''; return { order: ids.filter((i) => /j-(wedstay|riverside|guesthouse)/.test(i)), wed: t('j-wedstay').replace(/\s+/g, ' '), rv: t('j-riverside').replace(/\s+/g, ' '), gh: t('j-guesthouse').replace(/\s+/g, ' ') }; });
    await p.evaluate(() => document.getElementById('j-wedstay').scrollIntoView()); await shot(p, '390-journeys-wedding-stays');
    note('journeys-wedding-stay-order-and-words', j.order.join() === 'j-wedstay,j-riverside,j-guesthouse' && /From USD 145 total per person/.test(j.wed) && /from USD 145 per person \/ night/.test(j.wed) && /Second night complimentary · You pay for the first night only/.test(j.wed) && /USD 60 total per person · SELF-PAY/.test(j.rv) && /USD 30 per person \/ night/.test(j.rv) && /USD 0 · Complimentary/.test(j.gh) && /Both nights hosted/.test(j.gh), JSON.stringify(j).slice(0, 400));
    await p.context().close();
  }
}

/* ===== 9 · FOUR WIDTHS: no horizontal overflow on My Trip with every sheet open; the breathing room between the ready card and the question ===== */
for (const w of [320, 390, 834, 1440]) {
  const p = await fresh(w); if (!LIVE) { await signIn(p, 'T001'); await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p); await answerAll(p); await trip(p); }
  else { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); }
  const m = await p.evaluate(() => { const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth; const q = document.querySelector('#scope [data-scope-card]'), d = document.querySelector('#dec .p-card'); const gap = q && d ? Math.round(d.getBoundingClientRect().top - q.getBoundingClientRect().bottom) : null; const cards = [...document.querySelectorAll('[data-scope]')].map((e) => e.getBoundingClientRect()); const gaps = []; for (let i = 1; i < cards.length; i++) { const a = cards[i - 1], b = cards[i]; gaps.push(b.top >= a.bottom ? Math.round(b.top - a.bottom) : Math.round(b.left - a.right)); } return { ov, gap, gaps, cards: cards.length, w: innerWidth }; });
  await shot(p, w + '-my-trip');
  note('width-' + w, m.ov <= 1 && (LIVE || (m.gap !== null && m.gap >= 40 && m.cards === 4 && m.gaps.every((g) => g >= 12))), JSON.stringify(m));
  await p.context().close();
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');

fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
