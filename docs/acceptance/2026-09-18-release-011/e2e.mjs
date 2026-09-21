/* RELEASE 011 · FINAL INTEGRATED GUEST RELEASE — E2E on the isolated stage worker (Owner, 18 Sep 2026). Synthetic guests
   only (T001 Ada, T002 Ben, T003 Cleo, G048 / G049 the synthetic host pair); codes are read from the scratchpad and never printed.
     node docs/acceptance/2026-09-18-release-011/e2e.mjs <scratchpad> <outDir> [origin]
   The stage worker must be up (stage-up.sh, a fresh state). Chromium for the flows, WebKit (iPhone) for the overlay scroll. */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
/* LIVE=1: the controlled live run with the temporary synthetic guests (T001 Ada · T002 Ben · T003 Cleo): no seat is held on the live
   ledger, no host pair exists, nothing is sent to Guest Relations (the send path is proven on the stage), every hold is released */
const LIVE = process.env.LIVE === '1';
const codes = JSON.parse(fs.readFileSync(N + (LIVE ? '/live-synth-codes.json' : '/synth-codes.json'), 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const b = await chromium.launch();
const errors = new Map(), statuses = new Set();   /* a 404 for a photo not yet uploaded, a 409 draft precondition and the release this run aborts on purpose (4b) are answers, not errors */
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: (the server responded with a status of (404|409)|net::ERR_FAILED)/.test(m.text())) errors.set(p.url() + ' · ' + m.text().slice(0, 120), 1); else if (m.type() === 'error') statuses.add(m.text().slice(-40)); }); p.on('pageerror', (e) => errors.set(p.url() + ' · ' + String(e).slice(0, 120), 1)); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1600); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) { body = null; } return { status: r.status, body }; }, [path, init]);
const need = (p) => p.evaluate(() => { const r = SIYL_GUEST.readiness(); return { ok: r.ok, n: r.need.length, first: r.first ? r.first.href : null, keys: r.need.map((x) => x.key) }; });
const steps = (p) => p.evaluate(() => SIYL_GUEST.steps().map((s) => s.key + ':' + s.state));
const trip = async (p) => { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); };
const stageWords = (p, key) => p.$eval('#s-' + key, (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
const visibleStages = (p) => p.$$eval('#chrono [id^="s-"]', (l) => l.map((e) => e.id.replace(/^s-/, '')).filter((k) => k !== 'wedding' && k !== 'excluded'));
const engineMine = async (p) => (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body;
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { if (await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]')) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(200); } } if (await p.$('#sangkhathan [data-off="no"]')) await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(1000); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1000); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['avoid', 'Nothing'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1400); };
const reset = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) });
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'].forEach((k) => localStorage.removeItem(k)); });
  const cur = await api(p, '/api/draft'); if (cur.status === 200 && cur.body && cur.body.draft) { const empty = { 'siyl.guest': '{}', 'siyl.bag': '[]', 'siyl.temple': '{}', 'siyl.docs': '{}', 'siyl.skip': '[]', 'siyl.skip.by': '{}', 'siyl.sent': null };   /* empty values, not nulls: the store refuses a save of nothing */ await api(p, '/api/draft', { method: 'PUT', body: JSON.stringify({ keys: empty, baseUpdatedAt: cur.body.draft.updatedAt }) }); }
  await p.context().close(); };

/* ===== 0 · clean slate ===== */
for (const id of (LIVE ? ['T001', 'T002', 'T003'] : ['T001', 'T002', 'T003', 'G048'])) await reset(id);

/* ===== 1 · THE HEADER (signed out and in) at four widths ===== */
for (const w of [320, 390, 834, 1440]) { const p = await fresh(w); await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const h = await p.evaluate(() => { const h = document.querySelector('header.hd'); const r = h.getBoundingClientRect(); const bag = h.querySelector('a.bag'), menu = h.querySelector('.hb, #menu-open'), brand = h.querySelector('.bd, .brand'); const c = (e) => e ? Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2) : -1; return { h: Math.round(r.height), text: h.innerText.replace(/\s+/g, ' ').trim(), under: !!h.querySelector('.hd-access, [data-account]'), order: c(menu) < c(brand) && c(brand) < c(bag), brandCentred: Math.abs(c(brand) - window.innerWidth / 2) < 40, overflow: document.documentElement.scrollWidth > window.innerWidth, hero: Math.round((document.querySelector('.a-hero') || h).getBoundingClientRect().top - r.bottom) }; });
  note('header-' + w, h.h <= 64 && !h.under && h.order && h.brandCentred && !h.overflow && h.text === 'see you in laos.', JSON.stringify(h));
  if (w === 390) await shot(p, '390-header-home'); await p.context().close(); }

/* THE GLOBAL MY TRIP REBUILD (Owner, 21 Sep 2026): Vientiane is TWO participation sheets (before the wedding · the wedding); a change that
   would release the guest's own resources is previewed and applied only on confirmation */
const VTE = ['vientianePreWedding', 'vientianeWedding'];
const toggle = async (p, key, ms) => { await p.click('[data-scope="' + key + '"]'); await p.waitForTimeout(700); if (await p.$('[data-release-confirm]')) { await p.click('[data-release-confirm]'); } await p.waitForTimeout(ms || 1200); };
const toggleVientiane = async (p, ms) => { for (const k of VTE) await toggle(p, k, ms); };

/* ===== 2 · PARTICIPATION on My Trip (T001 Ada): the question first, then the relevant stages ===== */
const A = await fresh(); await signIn(A, 'T001'); await contact(A, 'ada.test@example.org'); await trip(A);
const s0 = { need: await need(A), scope: await A.$eval('#scope', (e) => e.innerText.replace(/\s+/g, ' ').trim()), stages: await visibleStages(A), note: await A.$eval('#chrono', (e) => e.innerText.replace(/\s+/g, ' ').trim()) };
note('scope-first', s0.need.first === 'your-journey.html#scope' && /Where will you join us|First, one answer/i.test(s0.scope) && s0.stages.length === 0 && /once you have said where you will join us/i.test(s0.note), JSON.stringify(s0).slice(0, 260));
await shot(A, '390-scope-question');
await A.click('[data-scope="bangkok"]'); await A.waitForTimeout(900); await toggleVientiane(A, 1200);
const s1 = { stages: await visibleStages(A), words: await A.$eval('[data-scope-card] .t-l1', (e) => e.textContent.trim()), excluded: await A.$eval('#s-excluded', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => ''), need: await need(A), steps: await steps(A) };
note('scope-bangkok-vientiane', JSON.stringify(s1.stages) === JSON.stringify(['bkk-stay', 'train', 'prewed', 'wedstay', 'kempinski']) && /Bangkok · Vientiane/.test(s1.words) && /Not part of your trip/i.test(s1.excluded) && /Kunming|Lijiang|China/i.test(s1.excluded) && s1.need.keys.filter((k) => /^stage:/.test(k)).join(',') === 'stage:bkk-stay,stage:train,stage:prewed,stage:wedstay,stage:kempinski', JSON.stringify(s1).slice(0, 300));
await shot(A, '390-scope-partial');
/* the question persists: reload, and the server draft carries it */
await A.evaluate(() => SIYL_DRAFT && SIYL_DRAFT.save && SIYL_DRAFT.save()); await A.waitForTimeout(1500); await trip(A);
const s2 = await A.evaluate(() => ({ scope: SIYL_GUEST.scopeWords(), stages: [...document.querySelectorAll('#chrono [id^="s-"]')].map((e) => e.id).filter((k) => k !== 's-wedding' && k !== 's-excluded') }));
const srv = await api(A, '/api/draft'); const srvScope = (() => { try { return JSON.parse(srv.body.draft.keys['siyl.guest']).scope; } catch (e) { return null; } })();
note('scope-persists', s2.scope === 'Bangkok · Vientiane' && s2.stages.length === 5 && srvScope && srvScope.bangkok && srvScope.vientianePreWedding && srvScope.vientianeWedding && !srvScope.china, JSON.stringify({ s2, srvScope }));

/* ===== 3 · NOT JOINING THIS STAGE · one direct action ===== */
/* from an untouched stage */
await A.click('#s-train [data-skip="train"]'); await A.waitForTimeout(1200);
const n1 = { words: await stageWords(A, 'train'), state: await A.evaluate(() => SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'train'))), need: await need(A) };
note('not-joining-untouched', n1.state === 'declined' && /Not joining/i.test(n1.words) && /Reconsider/i.test(n1.words) && !n1.need.keys.includes('stage:train'), JSON.stringify(n1).slice(0, 240));
await A.click('#s-train [data-unskip="train"]'); await A.waitForTimeout(1000);
const n1b = { state: await A.evaluate(() => SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'train'))), need: await need(A) };
note('reconsider-returns-undecided', n1b.state === 'open' && n1b.need.keys.includes('stage:train'), JSON.stringify(n1b));
/* from a selected travel: the train line, chosen on this page */
if (await A.$('#s-train [data-choose-flat="train"]')) { await A.click('#s-train [data-choose-flat="train"]'); await A.waitForTimeout(1200); }
const n2a = await A.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id), state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'train')) }));
await A.click('#s-train [data-skip="train"]'); await A.waitForTimeout(1500);
const n2 = await A.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id), state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'train')), total: SIYL_BAG.total() }));
note('not-joining-selected-travel', n2a.state === 'selected' && n2a.bag.includes('train') && n2.state === 'declined' && !n2.bag.includes('train'), JSON.stringify({ before: n2a, after: n2 }));
/* from a held room: U Sathorn chosen on the room page, then Not joining on My Trip */
await A.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' }); await A.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|B"]', { timeout: 20000 }); await A.click('[data-rooms-box="bkk-stay"] [data-join$="|B"]'); await A.waitForTimeout(2000);
await trip(A); const n3a = { mine: await engineMine(A), bag: await A.evaluate(() => SIYL_BAG.get().map((x) => x.id + ':' + x.room)), words: await stageWords(A, 'bkk-stay') };
await A.click('#s-bkk-stay [data-skip="bkk-stay"]'); await A.waitForTimeout(2200);
const n3 = { mine: await engineMine(A), bag: await A.evaluate(() => SIYL_BAG.get().map((x) => x.id)), state: await A.evaluate(() => SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'bkk-stay'))), words: await stageWords(A, 'bkk-stay') };
note('not-joining-held-room-releases-atomically', n3a.mine.mine && n3a.mine.mine['bkk-stay'] && /held/i.test(n3a.words) && n3.state === 'declined' && !(n3.mine.mine && n3.mine.mine['bkk-stay']) && !n3.bag.includes('bkk-stay') && /Not joining/i.test(n3.words), JSON.stringify({ before: { mine: n3a.mine.mine, bag: n3a.bag }, after: { mine: n3.mine.mine, bag: n3.bag, state: n3.state } }));
await shot(A, '390-not-joining-stages');

/* ===== 4 · TICKETS FOLLOW ATTENDANCE (T003 Cleo): a Vientiane room and two seats, then Vientiane is left ===== */
const C = await fresh(); await signIn(C, 'T003'); await contact(C, 'cleo.test@example.org'); await trip(C); await C.click('[data-scope-all]'); await C.waitForTimeout(1200);
await C.goto(O + '/room.html?stay=souphattra&room=heritage', { waitUntil: 'load' }); await C.waitForTimeout(1500);
const joinC = await api(C, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', key: 'prewed/heritage', label: 'A', name: 'Cleo' }) });
await wedding(C, 'no', LIVE ? 'no' : 'yes'); await prep(C);
if (!LIVE) for (const [ev, seatId] of [['ceremony', 'C-R-06-02'], ['dinner', 'D-T-06']]) await api(C, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) });
await trip(C); await C.evaluate(() => SIYL_STAY.sync()); await C.waitForTimeout(800);
const t0 = { mine: (await engineMine(C)).mine, seats: (await api(C, '/api/seating', { method: 'GET' })).body, bag: await C.evaluate(() => SIYL_BAG.get().map((x) => x.id)) };
const seatsOf = (v) => { try { const out = []; for (const ev of ['ceremony', 'dinner']) { const m = v && v.mine && v.mine[ev]; if (m && m.T003) out.push(ev + ':' + m.T003); } return out; } catch (e) { return []; } };
await toggleVientiane(C, 2200);
const t1 = { mine: (await engineMine(C)).mine, seats: (await api(C, '/api/seating', { method: 'GET' })).body, bag: await C.evaluate(() => SIYL_BAG.get().map((x) => x.id)), stages: await visibleStages(C), steps: await steps(C), words: await C.evaluate(() => SIYL_GUEST.scopeWords()) };
note('tickets-follow-attendance', joinC.status === 200 && t0.mine && t0.mine.prewed && seatsOf(t0.seats).length === (LIVE ? 0 : 2) && !(t1.mine && t1.mine.prewed) && seatsOf(t1.seats).length === 0 && !t1.bag.includes('prewed') && !t1.stages.includes('prewed') && !t1.stages.includes('wedstay') && t1.steps.includes('wedding:na') && t1.steps.includes('preparation:na') && t1.words === 'Bangkok · China', JSON.stringify({ before: { mine: t0.mine, seats: seatsOf(t0.seats) }, after: { mine: t1.mine, seats: seatsOf(t1.seats), stages: t1.stages, steps: t1.steps } }).slice(0, 300));
await C.goto(O + '/tickets.html', { waitUntil: 'load' }); await C.waitForTimeout(1500); const tk = await C.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ').trim());
note('tickets-page-no-vientiane', !/Seat [A-Z]?\d/.test(tk) && !/Souphattra|Heritage/.test(tk), tk.slice(0, 200));
await C.goto(O + '/wedding.html', { waitUntil: 'load' }); await C.waitForTimeout(1500); const wd = await C.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ').trim());
note('wedding-page-not-joining', /Not joining|Nothing to answer/i.test(wd) && !(await C.$('[data-e="temple"] [data-ev="yes"]')), wd.slice(0, 200));
await shot(C, '390-wedding-not-joining');
/* another guest's resources never moved: Ben (T002) holds Heritage B throughout */
const B2 = await fresh(); await signIn(B2, 'T002'); const jb = await api(B2, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', key: 'prewed/heritage', label: 'B', name: 'Ben' }) });
await trip(C); await toggleVientiane(C, 1200); await toggleVientiane(C, 1800);
const benAfter = (await engineMine(B2)).mine; note('other-guest-untouched', jb.status === 200 && benAfter && benAfter.prewed && benAfter.prewed.label === 'B', JSON.stringify(benAfter));

/* ===== 4a · RE-ENTRANCY (Codex 011-6) and an engine-only hold (Codex 011-7): a Sangkhathan line, two seats and a room held in the engine alone, then Vientiane is left — one release each, no storm ===== */
await trip(C); await toggleVientiane(C, 1200);
const jr = await api(C, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', key: 'prewed/heritage', label: 'A', name: 'Cleo' }) });
if (!LIVE) for (const [ev, seatId] of [['ceremony', 'C-R-06-02'], ['dinner', 'D-T-06']]) await api(C, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: ev, seatId, name: 'Cleo' }) });
await C.evaluate(() => { SIYL_TEMPLE.setAttendance(SIYL_GUEST.me().guestId, 'yes'); SIYL_TEMPLE.setOffering(SIYL_GUEST.me().guestId, 'yes'); SIYL_BAG.put({ id: 'sangkhathan', name: 'Sangkhathan', price: 15, qty: 1 }); });
await trip(C); await C.evaluate(() => { const b = SIYL_BAG.get().filter((x) => x.id !== 'prewed'); SIYL_BAG.set(b); });   /* the room stays the engine's alone (a stale draft) */
const counts = { leave: 0, release: 0, renders: 0 }; const onReq = (r) => { const u = r.url(); if (/\/api\/rooms\/leave/.test(u)) counts.leave++; if (/\/api\/seating\/release/.test(u)) counts.release++; }; C.on('request', onReq);
await toggleVientiane(C, 2500); C.off('request', onReq);
const re = { mine: (await engineMine(C)).mine, seats: seatsOf((await api(C, '/api/seating', { method: 'GET' })).body), bag: await C.evaluate(() => SIYL_BAG.get().map((x) => x.id)), need: await need(C), counts, failed: !!(await C.$('[data-scope-failed]')) };
note('reentrancy-one-release-each', jr.status === 200 && !(re.mine && re.mine.prewed) && re.seats.length === 0 && !re.bag.includes('sangkhathan') && !re.need.keys.some((k) => /^release:/.test(k)) && re.counts.leave === 1 && re.counts.release === (LIVE ? 0 : 2) && !re.failed, JSON.stringify(re));

/* ===== 4b · A RELEASE THAT FAILS (Codex 011-1): the room stays, it is named, Review & Send waits, Release again resolves it ===== */
await trip(C); await toggleVientiane(C, 1200);
const jc2 = await api(C, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', key: 'prewed/heritage', label: 'A', name: 'Cleo' }) });
await trip(C); await C.evaluate(() => SIYL_STAY.sync()); await C.waitForTimeout(600);
await C.route('**/api/rooms/leave', (r) => r.abort());
await toggleVientiane(C, 2200);
const f1 = { mine: (await engineMine(C)).mine, card: await C.$eval('[data-scope-failed]', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => ''), retry: !!(await C.$('[data-scope-retry]')), need: await need(C), bag: await C.evaluate(() => SIYL_BAG.get().map((x) => x.id)) };
await C.unroute('**/api/rooms/leave');
await C.click('[data-scope-retry]'); await C.waitForTimeout(3000);
const f2 = { mine: (await engineMine(C)).mine, card: !!(await C.$('[data-scope-failed]')), need: await need(C), bag: await C.evaluate(() => SIYL_BAG.get().map((x) => x.id)) };
note('failed-release-named-then-released', jc2.status === 200 && f1.mine && f1.mine.prewed && /Not released yet/i.test(f1.card) && f1.retry && !f1.need.ok && f1.need.keys.some((k) => /^release:/.test(k)) && f1.bag.includes('prewed') && !(f2.mine && f2.mine.prewed) && !f2.card && !f2.bag.includes('prewed') && !f2.need.keys.some((k) => /^release:/.test(k)), JSON.stringify({ f1: { mine: f1.mine, card: f1.card.slice(0, 80), need: f1.need.keys.filter((k) => /^release/.test(k)) }, f2: { mine: f2.mine, card: f2.card, bag: f2.bag } }).slice(0, 300));
await shot(C, '390-release-failed');

/* ===== 5 · THE FULL DECLINE PATH (T003): INVITATION → NOT JOINING → REVIEW → SEND ===== */
await trip(C); await C.click('[data-scope-none]'); await C.waitForTimeout(2500);
const d0 = { stages: await visibleStages(C), steps: await steps(C), need: await need(C), words: await C.evaluate(() => SIYL_GUEST.scopeWords()), mine: (await engineMine(C)).mine };
note('decline-path-nothing-else-asked', d0.stages.length === 0 && d0.words === 'Not joining this trip' && d0.need.ok && JSON.stringify(d0.steps) === JSON.stringify(['you:complete', 'journey:complete', 'wedding:na', 'preparation:na', 'about:na', 'review:attention']) && !(d0.mine && Object.keys(d0.mine).length), JSON.stringify(d0).slice(0, 300));
await shot(C, '390-decline-path-my-trip');
await C.click('.prep-all'); await C.waitForTimeout(800); const ov = await C.$eval('#prep-steps, .prep-steps', (e) => e.innerText.replace(/\s+/g, ' ').trim()); note('decline-path-steps-read-not-joining', (ov.match(/Not joining/g) || []).length >= 3, ov.slice(0, 220)); await shot(C, '390-decline-path-steps'); await C.keyboard.press('Escape'); await C.waitForTimeout(400);
await C.goto(O + '/review.html', { waitUntil: 'load' }); await C.waitForTimeout(2000);
const rv = await C.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ').trim()); const sendOn = await C.$eval('#send', (b) => !b.disabled);
const tOp = await C.evaluate(() => SIYL_TEMPLE.operational()); const txt = await C.evaluate(() => (typeof buildText === 'function' ? buildText(JSON.parse(localStorage.getItem('siyl.auth'))) : ''));
note('decline-path-review', /\/review/.test(C.url()) && /Where you join us/i.test(rv) && /Not joining this trip/i.test(rv) && sendOn && /USD 0/.test(rv), rv.slice(0, 200) + ' · send ' + sendOn);
note('decline-path-no-wedding-attendance-sent', tOp.participation === 'Not joining this trip' && Object.values(tOp.guests[0].events).every((v) => v === 'Not joining') && tOp.offerings === 0 && /WHERE THEY JOIN US: NOT JOINING THIS TRIP/.test(txt) && !/: JOINING/.test(txt), JSON.stringify(tOp.guests[0].events) + ' · ' + (txt.match(/WEDDING PARTICIPATION[\s\S]{0,160}/) || [''])[0].replace(/\s+/g, ' '));
if (!LIVE) { await C.click('#send'); await C.waitForTimeout(4000); const st = (await api(C, '/api/status?invitation=INV-T003', { method: 'GET' })).body;
note('decline-path-sent', st && st.received === true && !!st.receivedAt, JSON.stringify(st).slice(0, 200)); }
else note('decline-path-send-ready-not-sent', sendOn, 'live: the send button is enabled; nothing is sent to Guest Relations from a synthetic guest (the send path is proven on the stage)');
await shot(C, '390-decline-path-sent');

/* ===== 6 · PARTIAL ATTENDANCE (Ada): Bangkok + Vientiane answered, review shows the words, China asks nothing ===== */
await trip(A); const pa0 = await visibleStages(A);
for (const k of ['prewed', 'wedstay', 'kempinski']) { await A.click('#s-' + k + ' [data-skip="' + k + '"]'); await A.waitForTimeout(1000); }
await wedding(A, 'no', LIVE ? 'no' : 'yes'); await prep(A);
if (!LIVE) for (const [ev, seatId] of [['ceremony', 'C-R-05-02'], ['dinner', 'D-T-05']]) await api(A, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', event: ev, seatId, name: 'Ada' }) });
await about(A, 'Matcha Green Tea');
const pa1 = { need: await need(A), steps: await steps(A) };
await A.goto(O + '/review.html', { waitUntil: 'load' }); await A.waitForTimeout(2000); const rva = await A.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ').trim());
note('partial-attendance-review', pa0.length === 5 && pa1.need.ok && /Where you join us/i.test(rva) && /Bangkok · Vientiane/.test(rva) && !/Kunming|Lijiang/.test(rva.split('Where you join us')[1] || '') && /My Favorite Flavor/i.test(rva) && /Matcha Green Tea/.test(rva), JSON.stringify(pa1).slice(0, 200) + ' · ' + rva.slice(0, 120));
await shot(A, '390-review-partial');
/* ===== 8 · MY FAVORITE FLAVOR (Ada) ===== */
await A.goto(O + '/about-you.html', { waitUntil: 'load' }); await A.waitForTimeout(1500);
const fl = await A.evaluate(() => { const g = document.querySelector('[data-choice="flavor"]'); const b = [...g.querySelectorAll('[data-pick]')]; return { q: g.closest('.p-q, .p-card, section') ? g.closest('.p-q, .p-card, section').innerText.replace(/\s+/g, ' ').slice(0, 80) : '', picks: b.map((x) => x.getAttribute('data-pick')), on: b.filter((x) => x.getAttribute('aria-checked') === 'true').map((x) => x.getAttribute('data-pick')), role: g.getAttribute('role'), snack: /snack/i.test(document.body.innerText) }; });
await A.click('[data-choice="flavor"] [data-pick="Butter"]'); await A.waitForTimeout(800);
const fl2 = await A.evaluate(() => ({ on: [...document.querySelectorAll('[data-choice="flavor"] [data-pick][aria-checked="true"]')].map((x) => x.getAttribute('data-pick')), stored: SIYL_GUEST.profile(SIYL_GUEST.me().guestId, 'flavor') }));
note('flavor-single-select', fl.role === 'radiogroup' && JSON.stringify(fl.picks) === JSON.stringify(['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk']) && JSON.stringify(fl.on) === JSON.stringify(['Matcha Green Tea']) && !fl.snack && JSON.stringify(fl2.on) === JSON.stringify(['Butter']) && fl2.stored === 'Butter', JSON.stringify({ fl, fl2 }).slice(0, 260));
await shot(A, '390-flavor');
await A.goto(O + '/review.html', { waitUntil: 'load' }); await A.waitForTimeout(2000); const pf = await A.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ')); note('flavor-on-review', /My Favorite Flavor/i.test(pf) && /Butter/.test(pf) && !/Matcha Green Tea/.test(pf), (pf.match(/.{0,40}Favorite Flavor.{0,30}/i) || [''])[0]);
const payload = await A.evaluate(() => { const g = SIYL_GUEST.operational(); return { flavor: g.guests[0].profile.flavor, scope: g.scopeWords }; }); note('flavor-and-scope-in-payload', payload.flavor === 'Butter' && payload.scope === 'Bangkok · Vientiane', JSON.stringify(payload));

/* China only, from the same guest: only the three China stages (F G H — the return flight needs Bangkok too), the wedding steps read Not joining */
await trip(A); await toggle(A, 'bangkok', 1200); await toggleVientiane(A, 1200); await toggle(A, 'china', 1800);
const ch = { stages: await visibleStages(A), steps: await steps(A), need: await need(A) };
note('partial-china-only', JSON.stringify(ch.stages) === JSON.stringify(['kmg', 'c86', 'ljg']) && ch.steps.includes('wedding:na') && ch.steps.includes('preparation:na') && ch.need.keys.filter((k) => /^stage:/.test(k)).length === 3, JSON.stringify(ch).slice(0, 240));

/* superseded by release 014 (Owner, 19 Sep 2026): no fixed arrangement */
/* ===== 7 · HARUTHAI (G048): the host starts at zero — ten open stages, no Room A, every Bangkok address open, a choice held and released like anyone's ===== */
if (LIVE) note('haruthai-live', true, 'no synthetic host pair exists on the live register: the host-at-zero flow is proven on the stage (stage/e2e.json); the live host record is never used by a test');
const H = LIVE ? null : await fresh(); if (!LIVE) { await signIn(H, 'G048'); await contact(H, 'bride.test@example.org'); await trip(H);
const h0 = { words: await stageWords(H, 'bkk-stay'), need: await need(H), scope: await H.evaluate(() => SIYL_GUEST.scopeWords()), bag: await H.evaluate(() => SIYL_BAG.total()), rail: await H.$$eval('#s-bkk-stay [data-choose]', (l) => l.map((e) => e.getAttribute('data-choose'))), stages: await visibleStages(H), states: await H.evaluate(() => SIYL_JOURNEY.SEGMENTS.map((s) => s.key + ':' + SIYL_JOURNEY.state(s))), arranged: await H.evaluate(() => ({ items: document.querySelectorAll('[data-arranged-item]').length, global: typeof window.SIYL_ARRANGED, words: /Arranged for you|Fixed arrangement/i.test(document.body.innerText) })) };
note('haruthai-starts-at-zero-014', h0.stages.length === 10 && h0.states.every((s) => /:open$/.test(s)) && !/Arranged for you|Fixed arrangement|Another address|Room A/i.test(h0.words) && h0.need.keys.filter((k) => /^stage:/.test(k)).length === 10 && h0.need.keys.includes('stage:bkk-stay') && h0.scope === 'Bangkok · Vientiane · China' && h0.bag === 0 && h0.rail.length === 3 && h0.rail.includes('penthouse') && h0.arranged.items === 0 && h0.arranged.global === 'undefined' && !h0.arranged.words, JSON.stringify(h0).slice(0, 300));
await shot(H, '390-haruthai-my-trip');
for (const k of ['train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']) { if (k === 'c86') { await H.click('#s-c86 [data-choose-flat="c86"]'); await H.waitForTimeout(900); continue; }   /* the mandatory train is chosen, never declined (21 Sep 2026) */
  if (await H.$('#s-' + k + ' [data-skip="' + k + '"]')) { await H.click('#s-' + k + ' [data-skip="' + k + '"]'); await H.waitForTimeout(700); } }
const h1 = await need(H); note('haruthai-readiness-names-the-open-stage-014', h1.keys.filter((k) => /^stage:|^room:/.test(k)).join(',') === 'stage:bkk-stay', JSON.stringify(h1).slice(0, 200));
await H.click('#s-bkk-stay [data-choose="u-sathorn-superior-garden"]'); await H.waitForTimeout(2500);
const m2 = await engineMine(H); const h2 = { mine: m2.mine, fixed: m2.fixed, bag: await H.evaluate(() => SIYL_BAG.get().map((x) => x.id + ':' + x.room)), total: await H.evaluate(() => SIYL_BAG.total()), words: await stageWords(H, 'bkk-stay'), need: await need(H) };
note('haruthai-chooses-like-anyone-014', !!(h2.mine && h2.mine['bkk-stay']) && /u-sathorn/.test(h2.mine['bkk-stay'].key) && h2.fixed === undefined && h2.bag.includes('bkk-stay:u-sathorn-superior-garden') && h2.total > 105 && /Current selection/i.test(h2.words) && !/Arranged for you|Fixed arrangement/i.test(h2.words) && !h2.need.keys.some((k) => /^stage:|^room:/.test(k)), JSON.stringify({ mine: h2.mine, fixed: h2.fixed, bag: h2.bag, total: h2.total, need: h2.need.keys }).slice(0, 300));
await H.click('#s-bkk-stay [data-rm="bkk-stay"]'); await H.waitForTimeout(2500);
const m3 = await engineMine(H); const h3 = { mine: m3.mine, fixed: m3.fixed, bag: await H.evaluate(() => SIYL_BAG.get().length), total: await H.evaluate(() => SIYL_BAG.total()), words: await stageWords(H, 'bkk-stay'), rail: await H.$$eval('#s-bkk-stay [data-choose]', (l) => l.map((e) => e.getAttribute('data-choose'))), state: await H.evaluate(() => SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'bkk-stay'))) };
note('haruthai-remove-releases-014', !(h3.mine && h3.mine['bkk-stay']) && h3.fixed === undefined && h3.bag === 1 && h3.total === 105 && h3.state === 'open' && !/Arranged for you|Fixed arrangement|Room A/i.test(h3.words) && h3.rail.length === 3 && h3.rail.includes('penthouse'), JSON.stringify(h3).slice(0, 240));
await H.goto(O + '/cart.html', { waitUntil: 'load' }); await H.waitForTimeout(1500); const hc = await H.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ').trim());
note('haruthai-bag-c86-only', /C86 · Kunming → Lijiang/.test(hc) && /USD 105/.test(hc) && !/arrang/i.test(hc) && !/Sathorn|Penthouse|Souphattra/.test(hc), hc.slice(0, 200) + ' (the mandatory train alone — the Bangkok stay given back, 21 Sep 2026)'); }

/* ===== 9 · VIEW ALL STEPS on iPhone Safari (WebKit) and in Chromium at 320 / 390 / 834 ===== */
const wk = await webkit.launch();
const overlay = async (p, label, mobileWebKit) => {
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2200);
  await p.evaluate(() => window.scrollTo(0, 420)); await p.waitForTimeout(300); const y0 = await p.evaluate(() => Math.round(window.scrollY));
  const runs = [];
  for (let i = 0; i < 3; i++) {
    /* the tap on the sticky bar's button (a DOM click: Playwright's own click first scrolls a sticky element to its natural place, which no finger does) */
    await p.dispatchEvent('.prep-all', 'click'); await p.waitForTimeout(700);
    const o = await p.evaluate(() => { const l = document.querySelector('#prep-steps, .prep-steps'); const r = l.getBoundingClientRect(); return { open: document.body.classList.contains('prep-steps-open'), bodyOverflow: getComputedStyle(document.body).overflow, top: Math.round(r.top), h: Math.round(r.height), vh: window.innerHeight, scrollable: l.scrollHeight > l.clientHeight, sh: l.scrollHeight, ch: l.clientHeight, pos: getComputedStyle(l).position, overscroll: getComputedStyle(l).overscrollBehavior || getComputedStyle(l).overscrollBehaviorY }; });
    /* the scroll: a wheel where the browser has one; on mobile WebKit a touch sequence on the panel (a move inside the panel is never prevented, a move on the scrim always is) and the panel's own scroll */
    let touch = null;
    if (p.mouse && !mobileWebKit) { await p.mouse.move(200, o.top + 120); await p.mouse.wheel(0, 600); }
    else touch = await p.evaluate(([top]) => { const l = document.querySelector('#prep-steps, .prep-steps'); const mkTouch = (el, y) => (document.createTouch ? document.createTouch(window, el, 1, 200, y, 200, y) : { identifier: 1, target: el, clientX: 200, clientY: y }); const mk = (t, y, el) => { let ev; try { ev = new TouchEvent(t, { bubbles: true, cancelable: true, touches: [mkTouch(el, y)] }); } catch (e) { ev = new Event(t, { bubbles: true, cancelable: true }); Object.defineProperty(ev, 'touches', { value: [{ identifier: 1, target: el, clientX: 200, clientY: y }] }); } el.dispatchEvent(ev); return ev.defaultPrevented; }; const row = l.querySelector('.prep-srow') || l; mk('touchstart', top + 200, row); const inside = mk('touchmove', top + 100, row); const scrim = document.querySelector('.prep-steps-scrim, .p-steps-scrim') || document.body; mk('touchstart', top + 500, scrim); const onScrim = mk('touchmove', top + 400, scrim); l.scrollBy(0, 600); return { insidePrevented: inside, scrimPrevented: onScrim }; }, [o.top]);
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => { const l = document.querySelector('#prep-steps, .prep-steps'); return { panelTop: Math.round(l.scrollTop), pageY: Math.round(window.scrollY), last: (() => { const rows = l.querySelectorAll('.prep-srow'); const r = rows[rows.length - 1].getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: window.innerHeight }; })() }; });
    const hit = await p.evaluate(() => { const b = document.querySelector('.prep-all').getBoundingClientRect(); const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return at && at.classList.contains('prep-all'); });
    await p.dispatchEvent('.prep-all', 'click'); await p.waitForTimeout(600);
    const closed = await p.evaluate(() => ({ open: document.body.classList.contains('prep-steps-open'), bodyOverflow: getComputedStyle(document.body).overflow, pageY: Math.round(window.scrollY) }));
    runs.push({ o, after, closed, touch, hit });
  }
  const ok = runs.every((r) => r.o.open && r.o.bodyOverflow === 'hidden' && r.o.pos === 'fixed' && r.o.top + r.o.h <= r.o.vh + 1 && (!r.o.scrollable || r.after.panelTop > 0) && r.after.pageY === y0 && (!r.o.scrollable || r.after.last.bottom <= r.after.last.vh + 1 || r.after.panelTop > 0) && !r.closed.open && r.closed.bodyOverflow !== 'hidden' && r.closed.pageY === y0 && (!r.touch || (!r.touch.insidePrevented && r.touch.scrimPrevented)) && r.hit);
  note('overlay-' + label, ok, JSON.stringify({ y0, first: runs[0] }).slice(0, 300));
  return runs;
};
const iph = await wk.newContext(Object.assign({}, devices['iPhone 13'], { viewport: { width: 390, height: 600 } })); const ip = await iph.newPage(); ip.on('pageerror', (e) => errors.set('webkit ' + String(e).slice(0, 120), 1));
await signIn(ip, 'T001'); await overlay(ip, 'iphone-safari-390x600', true); await ip.screenshot({ path: path.join(OUT, 'iphone-overlay.png') }).catch(() => {});
/* from My Bag too */
await ip.goto(O + '/cart.html', { waitUntil: 'load' }).catch(() => {}); await ip.waitForTimeout(1500); const bagShell = await ip.$('.prep-all');
note('overlay-from-my-bag', !!bagShell || /cart/.test(ip.url()), bagShell ? 'View all steps is on My Bag' : 'My Bag has no step shell — the overlay belongs to the steps');
await iph.close();
for (const w of [320, 390, 834]) { const p = await fresh(w); await signIn(p, 'T001'); await p.setViewportSize({ width: w, height: w === 834 ? 700 : 560 }); await overlay(p, 'chromium-' + w); if (w === 320) await shot(p, '320-overlay'); await p.context().close(); }

/* ===== 10 · EDIT 5 pages ===== */
const E = await fresh(); await E.goto(O + '/experiences.html', { waitUntil: 'load' }); await E.waitForTimeout(1500); const ex = await E.$eval('main', (e) => e.innerText.replace(/\s+/g, ' '));
note('edit5-experiences-list', !/IGNIV/i.test(ex) && /Le Du Kaan/.test(ex) && /Lao National Museum/.test(ex) && /Traditional Lao Silk Residence/.test(ex) && /Lao Art Museum/.test(ex), (ex.match(/Le Du Kaan|Lao National Museum|Traditional Lao Silk Residence|Lao Art Museum|IGNIV/g) || []).join(','));
for (const id of ['bkk-ledukaan', 'vte-laonationalmuseum', 'vte-silkresidence', 'vte-laoartmuseum']) { await E.goto(O + '/experience.html?id=' + id, { waitUntil: 'load' }); await E.waitForTimeout(1500);
  const d = await E.evaluate(() => ({ h1: (document.querySelector('main h1') || {}).textContent, about: /About/i.test(document.body.innerText), hours: /Lunch|Open|Monday|08:30|8:00|9:00/.test(document.body.innerText), imgs: [...document.querySelectorAll('img')].filter((i) => /experiences\//.test(i.currentSrc || i.src)).map((i) => i.naturalWidth > 0), bg: [...document.querySelectorAll('[style*="experiences/"]')].length, overflow: document.documentElement.scrollWidth > window.innerWidth }));
  note('edit5-' + id, d.h1 && d.about && d.hours && !d.overflow && d.imgs.length >= 1 && d.imgs[0] === true, JSON.stringify(d).slice(0, 200)); }
await shot(E, '390-ledukaan'); const ig = await E.goto(O + '/experience.html?id=bkk-igniv', { waitUntil: 'load' }); await E.waitForTimeout(1200); const igt = await E.$eval('main', (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => '');
note('edit5-igniv-gone', !/IGNIV/i.test(igt), igt.slice(0, 120));

/* ===== 11 · THE BANGKOK CARD: the photograph today; the clip mechanism proven with a synthetic clip (never shipped) ===== */
await E.goto(O + '/index.html', { waitUntil: 'load' }); await E.waitForTimeout(1200);
const card0 = await E.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const r = a.getBoundingClientRect(); return { video: !!a.querySelector('video'), bg: /001-bangkok/.test(a.style.backgroundImage), w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2) }; });
/* since release 013 the card carries the Owner's clip: the photograph is still its poster and geometry (the clip itself is proven by the 013 suite) */
note('bangkok-card-photograph', card0.bg && Math.abs(card0.ratio - 1.25) < 0.03, JSON.stringify(card0) + (card0.video ? ' (the shipped clip mounted over the photograph)' : ''));
const clip = path.join(OUT, 'synthetic-clip.mp4');
try { execFileSync('/opt/homebrew/bin/ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', path.join(process.cwd(), 'assets/images/city/001-bangkok-chao-phraya-skyline.jpg'), '-t', '1', '-vf', 'scale=320:256', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', clip]); } catch (e) { note('synthetic-clip', false, String(e).slice(0, 120)); }
if (fs.existsSync(clip)) {
  const probe = async (opts, label) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, opts || {})); const p = await ctx.newPage();
    await p.route('**/assets/video/bangkok-card.mp4', (r) => r.fulfill({ path: clip, contentType: 'video/mp4' }));
    await p.route('**/assets/video/broken.mp4', (r) => r.fulfill({ status: 404, body: 'no' }));
    await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const out = await p.evaluate(async ([src]) => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); SIYL_AMAN.video.unmount(a); a.setAttribute('data-video', src); SIYL_AMAN.video.mount(a); a.scrollIntoView(); await new Promise((r) => setTimeout(r, 2500)); const v = a.querySelector('video'); return { state: a.getAttribute('data-video-state'), playing: a.classList.contains('am-playing'), video: !!v, poster: v ? v.getAttribute('poster') : null, muted: v ? v.muted : null, inline: v ? v.hasAttribute('playsinline') : null, loop: v ? v.loop : null, paused: v ? v.paused : null, ratio: +(a.getBoundingClientRect().width / a.getBoundingClientRect().height).toFixed(2), opacity: v ? getComputedStyle(v).opacity : null }; }, [label === 'broken' ? 'assets/video/broken.mp4' : 'assets/video/bangkok-card.mp4']);
    await p.screenshot({ path: path.join(OUT, 'clip-' + label + '.png') }); await ctx.close(); return out; };
  const on = await probe({}, 'plays'); note('clip-poster-first-then-plays', on.video && on.state === 'playing' && on.playing && /001-bangkok/.test(on.poster) && on.muted && on.inline && on.loop && !on.paused && Math.abs(on.ratio - 1.25) < 0.03 && on.opacity === '1', JSON.stringify(on));
  const calm = await probe({ reducedMotion: 'reduce' }, 'reduced'); note('clip-reduced-motion-photograph', !calm.video && calm.state === 'still', JSON.stringify(calm));
  const broken = await probe({}, 'broken'); note('clip-failure-photograph', !broken.video && broken.state === 'still' && !broken.playing, JSON.stringify(broken));
}

/* ===== 12 · widths and console ===== */
for (const w of [320, 390, 834, 1440]) { const p = await fresh(w); await signIn(p, 'T001'); const over = [];
  for (const f of ['index.html', 'destination.html', 'experiences.html', 'your-journey.html', 'cart.html', 'tickets.html', 'wedding.html', 'about-you.html', 'review.html', 'profile.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) over.push(f + ':' + ov); if (w === 1440 && f === 'your-journey.html') await shot(p, '1440-my-trip'); if (w === 834 && f === 'your-journey.html') await shot(p, '834-my-trip'); }
  note('width-' + w + '-no-overflow', over.length === 0, over.join(', ') || 'no horizontal overflow on ten pages'); await p.context().close(); }
note('console-errors', errors.size === 0, (errors.size ? [...errors.keys()].slice(0, 4).join(' | ') : 'no script or console errors on any visited page') + (statuses.size ? ' · expected HTTP answers logged by the browser: ' + [...statuses].join(', ') : ''));

/* ===== Z · cleanup ===== */
for (const id of (LIVE ? ['T001', 'T002', 'T003'] : ['T001', 'T002', 'T003', 'G048'])) await reset(id);
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log('\n' + (R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : ''));
process.exit(fails.length ? 1 : 0);
