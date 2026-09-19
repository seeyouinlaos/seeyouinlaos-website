/* RELEASE 013 · FINAL CONSOLIDATED REPAIR + CLEAN-STATE TEST RUN — E2E on the isolated stage worker (Owner, 19 Sep 2026).
   Synthetic guests only (T001 Ada · T002 Ben · T003 Cleo · G048 the host); codes read from the scratchpad, never printed.
     node docs/acceptance/2026-09-19-release-013/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the shipped Bangkok clip (Chromium + iPhone Safari) · the eight participation scopes · the complete trip (the
   preview, a named fallback, the confirm, the summary, determinism) · confirmation parity (Review = guest email = Guest
   Relations email = the stored record) · THE CLEAN RESET on the stage (populated → dry run → execute → zero → a device honours
   the epoch) · widths and console. LIVE=1 runs the read-only public sections only (the clip, widths, console). */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
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
const visibleStages = (p) => p.$$eval('#chrono [id^="s-"]', (l) => l.map((e) => e.id.replace(/^s-/, '')).filter((k) => k !== 'wedding' && k !== 'excluded'));
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const resetGuest = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) });
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by', 'siyl.draft.meta', 'siyl.draft.base'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close(); };

/* ===== 1 · THE BANGKOK CLIP, shipped: poster first, then playing, at the card's geometry; reduced motion and a blocked source keep the photograph; iPhone Safari ===== */
{
  const probe = async (opts, label, block) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, opts || {})); const p = await ctx.newPage();
    if (block) await p.route('**/assets/video/bangkok-card.mp4', (r) => r.fulfill({ status: 404, body: 'no' }));
    await p.goto(O + '/index.html', { waitUntil: 'load' });
    const early = await p.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const r = a.getBoundingClientRect(); return { state: a.getAttribute('data-video-state'), bg: /001-bangkok-chao-phraya/.test(a.style.backgroundImage), src: a.getAttribute('data-video'), w: Math.round(r.width), h: Math.round(r.height), video: !!a.querySelector('video.am-clip') }; });
    await p.evaluate(() => document.querySelector('.aslide .am[href*="bangkok"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(3500);
    const late = await p.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const r = a.getBoundingClientRect(); const v = a.querySelector('video.am-clip'); return { state: a.getAttribute('data-video-state'), bg: /001-bangkok-chao-phraya/.test(a.style.backgroundImage), w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2), video: !!v, playing: !!(v && !v.paused && v.currentTime > 0.2), t: v ? +v.currentTime.toFixed(2) : null, muted: !!(v && v.muted), inline: !!(v && v.hasAttribute('playsinline')), loop: !!(v && v.loop), controls: !!(v && v.controls), opacity: v ? getComputedStyle(v).opacity : null, poster: v ? v.getAttribute('poster') : null, srcOk: !!(v && v.querySelector('source') && /assets\/video\/bangkok-card\.mp4$/.test(v.querySelector('source').src)) }; });
    await p.screenshot({ path: path.join(OUT, 'clip-' + label + '.png') }); await ctx.close(); return { early, late }; };
  const on = await probe({}, 'plays');
  note('clip-poster-first', on.early.bg && on.early.src === 'assets/video/bangkok-card.mp4' && on.early.state !== 'playing', JSON.stringify(on.early) + ' (the photograph is on screen before the clip)');
  note('clip-plays-at-the-cards-geometry', on.late.video && on.late.state === 'playing' && on.late.playing && on.late.muted && on.late.inline && on.late.loop && !on.late.controls && on.late.opacity === '1' && on.late.srcOk && /001-bangkok/.test(on.late.poster || '') && on.late.w === on.early.w && on.late.h === on.early.h && Math.abs(on.late.ratio - 1.25) < 0.03, JSON.stringify(on.late));
  const calm = await probe({ reducedMotion: 'reduce' }, 'reduced'); note('clip-reduced-motion-photograph', !calm.late.video && calm.late.state === 'still' && calm.late.bg, JSON.stringify(calm.late));
  const broken = await probe({}, 'blocked', true); note('clip-blocked-source-photograph', !broken.late.video && broken.late.state === 'still' && broken.late.bg && broken.late.w === broken.early.w, JSON.stringify(broken.late));
  const wk = await webkit.launch(); const ip = await (await wk.newContext(devices['iPhone 13'])).newPage(); await ip.goto(O + '/index.html', { waitUntil: 'load' }); await ip.evaluate(() => document.querySelector('.aslide .am[href*="bangkok"]').scrollIntoView({ block: 'center' })); await ip.waitForTimeout(4000);
  const wkv = await ip.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const v = a.querySelector('video.am-clip'); const r = a.getBoundingClientRect(); return { state: a.getAttribute('data-video-state'), bg: /001-bangkok/.test(a.style.backgroundImage), video: !!v, playing: !!(v && !v.paused && v.currentTime > 0.2), inline: !!(v && v.hasAttribute('playsinline')), muted: !!(v && v.muted), ratio: +(r.width / r.height).toFixed(2), ov: document.documentElement.scrollWidth - window.innerWidth }; });
  await ip.screenshot({ path: path.join(OUT, 'clip-iphone.png') }); await wk.close();
  note('clip-iphone-safari', wkv.bg && wkv.ov === 0 && Math.abs(wkv.ratio - 1.25) < 0.03 && (wkv.state === 'playing' ? (wkv.playing && wkv.inline && wkv.muted) : wkv.state === 'still' || wkv.state === 'loading'), JSON.stringify(wkv) + ' (plays inline and muted, or the photograph stays — never black)');
}

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003', 'G048']) await resetGuest(id);

  /* ===== 2 · THE EIGHT PARTICIPATION SCOPES (T001 Ada): the stages that exist, the ones that are not part of the trip, readiness, the Bag, the wedding ===== */
  {
    const p = await fresh(390); await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
    const SC = [['none', { none: true }, []], ['bangkok', { bangkok: true }, ['bkk-stay']], ['vientiane', { vientiane: true }, ['prewed', 'wedstay']], ['china', { china: true }, ['kmg', 'c86', 'ljg', 'return']], ['bangkok+vientiane', { bangkok: true, vientiane: true }, ['bkk-stay', 'train', 'prewed', 'wedstay']], ['bangkok+china', { bangkok: true, china: true }, ['bkk-stay', 'kmg', 'c86', 'ljg', 'return', 'kempinski']], ['vientiane+china', { vientiane: true, china: true }, ['prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return']], ['all', { all: true }, ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']]];
    for (const [name, patch, expect] of SC) {
      await trip(p); await p.evaluate((patch) => { SIYL_GUEST.setScope({ none: true }); SIYL_GUEST.setScope(patch); }, patch); await p.waitForTimeout(600); await trip(p);
      const st = await p.evaluate(() => { const J = SIYL_JOURNEY, G = SIYL_GUEST; return { rel: J.relevantSegments().map((s) => s.key), excl: J.excludedSegments().map((s) => s.key), joins: ['bangkok', 'vientiane', 'china'].filter((d) => G.joins(d)), none: G.notJoining(), wedding: !!(G.applicable && G.applicable('wedding')), seats: !!(G.applicable && G.applicable('preparation')), need: G.readiness().need.map((x) => x.key), words: G.scopeWords(), bag: SIYL_BAG.get().length }; });
      const vis = await visibleStages(p);
      const roomNeeds = st.need.filter((k) => /^(room|release):/.test(k));
      const ok = JSON.stringify(st.rel) === JSON.stringify(expect) && st.excl.length === 10 - expect.length && JSON.stringify(vis.filter((k) => expect.includes(k))) === JSON.stringify(expect) && !vis.some((k) => st.excl.includes(k)) && roomNeeds.length === 0 && st.bag === 0 && (name === 'none' ? st.none : !st.none) && (name.includes('vientiane') || name === 'all' ? st.wedding && st.seats : !st.wedding);
      note('scope-' + name, ok, JSON.stringify({ rel: st.rel, excluded: st.excl.length, visible: vis.length, wedding: st.wedding, words: st.words, need: st.need.length }));
      if (name === 'bangkok+china') await shot(p, '390-scope-bangkok-china');
    }
    await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await p.context().close();
  }

  /* ===== 3 · THE COMPLETE TRIP (T002 Ben): the preview says what it selects; a full suggested room is a named replacement; the confirm fills every open stage; the panel says what it did; the plan is deterministic ===== */
  {
    const p = await fresh(390); await signIn(p, 'T002'); await contact(p, 'ben.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ all: true }); }); await trip(p);
    /* the suggested Kunming room (SIYL_FULL_EXPERIENCE.kmg) is filled by two other guests → Ben's preview names the fallback */
    const wish = await p.evaluate(() => SIYL_FULL_EXPERIENCE.kmg);
    const p1 = await fresh(); await signIn(p1, 'T001'); const j1 = await api(p1, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', key: 'kmg/' + wish, label: 'A', name: 'Ada' }) }); await p1.context().close();
    const p3 = await fresh(); await signIn(p3, 'T003'); const j3 = await api(p3, '/api/rooms/join', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', key: 'kmg/' + wish, label: 'A', name: 'Cleo' }) }); await p3.context().close();
    note('complete-trip-fixture', j1.status === 200 && j3.status === 200, 'the suggested Kunming room ' + wish + ' A holds two other guests');
    await trip(p);
    const plan = await p.evaluate(() => { const pl = SIYL_JOURNEY.fullExperience(); return { rows: pl.plan.map((x) => x.seg.key + ':' + x.why + (x.room ? ':' + x.room.slug : '') + (x.wanted ? '←' + x.wanted.slug : '')), unskip: pl.unskip, add: pl.add.map((it) => it.id), skippedAfter: SIYL_JOURNEY.SEGMENTS.filter((s) => SIYL_JOURNEY.isSkipped(s.key)).length, bagAfter: SIYL_BAG.get().length }; });
    note('complete-trip-plan-pure', plan.rows.length === 10 && plan.bagAfter === 0 && plan.skippedAfter === 0 && plan.rows.some((r) => /^kmg:fallback:/.test(r)) && plan.rows.filter((r) => /:suggested/.test(r)).length === 9, JSON.stringify(plan.rows));
    await p.click('#fxb'); await p.waitForTimeout(1200);
    const preview = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.fxl .fxr')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), fb: [...document.querySelectorAll('.fxl .fxr-fb')].length, held: SIYL_BAG.get().length }));
    await shot(p, '390-complete-trip-preview');
    note('complete-trip-preview-lists-every-stage', preview.rows.length === 10 && preview.fb === 1 && preview.rows.some((r) => /is full — this is the nearest room with a place/.test(r)) && preview.rows.some((r) => /Special Express No\. 25/.test(r)) && preview.rows.some((r) => /MU9646|Vientiane → Kunming/i.test(r)) && preview.held === 0, preview.rows.join(' | ').slice(0, 260) + ' (nothing held by looking)');
    /* the engine changes while the drawer is open (a room fills): the confirm applies nothing and shows the change */
    const p4 = await fresh(); await signIn(p4, 'T003'); await api(p4, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', stage: 'kmg' }) }); await p4.context().close();
    await p.click('#fxg'); await p.waitForTimeout(2500);
    const changed = await p.evaluate(() => ({ note: !!document.querySelector('[data-fx-changed]'), rows: document.querySelectorAll('.fxl .fxr').length, fb: document.querySelectorAll('.fxl .fxr-fb').length, held: SIYL_BAG.get().length }));
    note('complete-trip-confirm-bound-to-preview', changed.note && changed.rows === 10 && changed.fb === 0 && changed.held === 0, JSON.stringify(changed) + ' (a room freed meanwhile: the preview is drawn again with the change said, nothing was applied)');
    await shot(p, '390-complete-trip-changed');
    await p.click('#fxg'); await p.waitForTimeout(9000);
    const after = await p.evaluate(() => ({ bag: SIYL_BAG.get().map((x) => x.id + (x.room ? ':' + x.room : '')).sort(), total: SIYL_BAG.total(), need: SIYL_GUEST.readiness().need.map((x) => x.key), summary: (document.querySelector('[data-fx-summary]') || {}).innerText || '', open: SIYL_JOURNEY.open().length }));
    const mine = (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body.mine;
    await shot(p, '390-complete-trip-done');
    note('complete-trip-fills-every-open-stage', after.bag.length === 10 && after.open === 0 && !after.need.some((k) => /^(room|release):/.test(k)) && Object.keys(mine).length === 6 && mine.kmg && mine.kmg.key === 'kmg/' + wish && /The complete trip filled 10 stages for you/.test(after.summary) && !/Replaced because/.test(after.summary), JSON.stringify({ bag: after.bag, total: after.total, holds: Object.keys(mine).length, kmg: mine.kmg && mine.kmg.key, summary: after.summary.slice(0, 120) }) + ' (the suggested room, free again, is what the second look showed and what was applied)');
    /* determinism: the same plan computed again names the same products (the rooms now held are "kept as chosen") */
    const again = await p.evaluate(() => { const pl = SIYL_JOURNEY.fullExperience(); return { rows: pl.plan.map((x) => x.seg.key + ':' + x.why + ':' + (x.how || (x.items && x.items[0] ? x.items[0].id : ''))), add: pl.add.map((it) => it.id).sort() }; });
    note('complete-trip-idempotent', again.rows.length === 10 && again.rows.filter((r) => /:kept:chosen$/.test(r)).length === 6 && again.rows.filter((r) => /:suggested:/.test(r)).length === 4 && JSON.stringify(again.add) === JSON.stringify(['c86', 'mu9646', 'return', 'train']), again.rows.join(' ') + ' (the six rooms stay as chosen; the four legs are the same suggestion again — nothing else would change)');
    /* the parity fixture: every step answered, then Review & Send */
    await wedding(p, 'yes', 'yes'); await prep(p);
    for (const [ev, seatId] of [['ceremony', 'C-R-07-02'], ['dinner', 'D-T-07']]) { const sr = await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T002', guestId: 'T002', event: ev, seatId, name: 'Ben' }) }); if (sr.status !== 200) note('seat-' + ev, false, JSON.stringify(sr.body)); }
    await about(p, 'Matcha Green Tea');
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const review = await p.evaluate(() => ({ text: document.querySelector('main').innerText.replace(/\s+/g, ' '), send: !!document.querySelector('#send:not([disabled])') }));
    await shot(p, '390-review-complete-trip');
    const stageNames = ['Special Express No. 25', 'Pre-Wedding', 'Wedding Stay', 'MU9646', 'Wanxiang', 'C86', 'Luye Baisha', 'MU5924', 'Kempinski', 'Sathorn Penthouse'];
    const missingOnReview = stageNames.filter((n) => !review.text.includes(n));
    note('review-shows-the-whole-trip', missingOnReview.length === 0 && /Matcha Green Tea/.test(review.text) && !/rather avoid/i.test(review.text), missingOnReview.length ? 'missing on Review: ' + missingOnReview.join(', ') : 'all ten stages incl. Vientiane → Kunming (MU9646) and the Sathorn Penthouse; the flavour; no Question 5');
    const sent = await p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn || btn.disabled) return { clicked: false }; btn.click(); await new Promise((r) => setTimeout(r, 7000)); return { clicked: true, words: (document.querySelector('main') || {}).innerText.replace(/\s+/g, ' ').slice(0, 200) }; });
    const rec = await gr('/api/gr/record?invitation=INV-T002');
    const gm = rec.body && rec.body.guestMail ? rec.body.guestMail.text : '', om = rec.body && rec.body.ownerMail ? rec.body.ownerMail.text : '';
    const sel = rec.body && rec.body.record ? (rec.body.record.registration.selections || []).map((x) => x.id).sort() : [];
    const missGuest = stageNames.filter((n) => !gm.includes(n)), missOwner = stageNames.filter((n) => !om.includes(n));
    note('parity-review-record-emails', sent.clicked && rec.status === 200 && rec.body.record && JSON.stringify(sel) === JSON.stringify(after.bag.map((x) => x.split(':')[0]).sort()) && missGuest.length === 0 && missOwner.length === 0 && /Matcha Green Tea/.test(gm) && /Matcha Green Tea/.test(om) && !/rather avoid|Cilantro/i.test(gm + om), JSON.stringify({ sel: sel.length, missGuest, missOwner }));
    fs.writeFileSync(path.join(OUT, 'parity-guest-mail.txt'), gm); fs.writeFileSync(path.join(OUT, 'parity-owner-mail.txt'), om);
    await p.context().close();
  }

  /* ===== 4 · HARUTHAI (G048): the fixed Sathorn arrangement never asks, never prices, never blocks; Review shows it as arranged; the emails say so ===== */
  {
    const p = await fresh(390); await signIn(p, 'G048'); await contact(p, 'bride.test@example.org');
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ bangkok: true }); }); await trip(p);
    const h = await p.evaluate(() => { const s = document.querySelector('#s-bkk-stay'); return { words: s ? s.innerText.replace(/\s+/g, ' ') : '', bag: SIYL_BAG.get().length, total: SIYL_BAG.total(), need: SIYL_GUEST.readiness().need.map((x) => x.key), state: SIYL_JOURNEY.state(SIYL_JOURNEY.SEGMENTS[0]) }; });
    await shot(p, '390-haruthai-arranged');
    note('haruthai-arranged-not-bag', /Arranged for you/i.test(h.words) && !/Add to My Bag/i.test(h.words) && h.bag === 0 && h.total === 0 && h.state === 'arranged' && !h.need.some((k) => /bkk-stay|room:/.test(k)), JSON.stringify({ state: h.state, bag: h.bag, total: h.total, need: h.need }));
    await p.context().close();
  }

  /* ===== 5 · THE CLEAN RESET on the stage: populated state → dry run (nothing changes) → execute → zero → the host's fixed place stands → a device that cached the old trip honours the epoch ===== */
  {
    const before = await gr('/api/gr/reset', { dryRun: true });
    const plan0 = await gr('/api/rooms/plan'); let occ0 = 0; for (const units of Object.values(plan0.body.units)) for (const u of units) for (const o of (u.occupants || [])) if (!(u.reservedFor && /Bride/.test(u.reservedFor))) occ0++;
    note('reset-dry-run', before.status === 200 && before.body.dryRun === true && before.body.rooms.occupancies >= 7 && before.body.seating.holds >= 1 && before.body.drafts.had >= 2 && before.body.kv.keys.length >= 5 && occ0 === before.body.rooms.occupancies, JSON.stringify({ rooms: before.body.rooms.occupancies, seats: before.body.seating.holds, drafts: before.body.drafts.had, kv: before.body.kv.keys.length }));
    const still = await gr('/api/rooms/plan'); let occ1 = 0; for (const units of Object.values(still.body.units)) for (const u of units) for (const o of (u.occupants || [])) if (!(u.reservedFor && /Bride/.test(u.reservedFor))) occ1++;
    note('reset-dry-run-wrote-nothing', occ1 === occ0, occ1 + ' guest holds after the dry run');
    /* a device that holds Ben's old trip in its cache, signed in, before the reset */
    const dev = await fresh(390); await signIn(dev, 'T002'); await trip(dev); const cached = await dev.evaluate(() => SIYL_BAG.get().length);
    const refused = await gr('/api/gr/reset', { dryRun: false, confirm: 'reset all guest state' }); note('reset-needs-the-exact-words', refused.status === 400, refused.status + ' ' + (refused.body && refused.body.error));
    const noDigest = await gr('/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE' }); note('reset-needs-the-snapshot-digest', noDigest.status === 400, noDigest.status + ' ' + (noDigest.body && noDigest.body.error));
    /* the snapshot: every value, kept by the caller before anything goes (the digest covers the values: the same state twice gives the same digest) */
    const quiet = await gr('/api/gr/reset', { dryRun: true });
    const snap = await gr('/api/gr/reset', { dryRun: true, snapshot: true });
    fs.writeFileSync(path.join(OUT, 'reset-snapshot.json'), JSON.stringify({ digest: snap.body.digest, keys: Object.keys(snap.body.backup).length, counts: { rooms: snap.body.rooms.occupancies, seats: snap.body.seating.holds, drafts: snap.body.drafts.had, kv: snap.body.kv.keys.length } }));
    note('reset-snapshot-carries-every-value', snap.status === 200 && snap.body.mode === 'snapshot' && /^[a-f0-9]{64}$/.test(snap.body.digest) && Object.keys(snap.body.backup).length === snap.body.rooms.occupancies + snap.body.seating.holds + snap.body.drafts.had + snap.body.kv.keys.length && snap.body.digest === quiet.body.digest, JSON.stringify({ values: Object.keys(snap.body.backup).length, digest: snap.body.digest.slice(0, 12), sameAsTheDryRunBefore: snap.body.digest === quiet.body.digest }));
    /* a stale digest (the state changed) is refused */
    const stale = await gr('/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: 'a'.repeat(64) }); note('reset-refuses-a-stale-snapshot', stale.status === 409, stale.status + ' ' + (stale.body && stale.body.error));
    const run = await gr('/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: snap.body.digest, actor: 'e2e' });
    const plan2 = await gr('/api/rooms/plan'); let occ2 = 0, fixed2 = 0; for (const units of Object.values(plan2.body.units)) for (const u of units) for (const o of (u.occupants || [])) { if (u.reservedFor && /Bride/.test(u.reservedFor) && /^G04[89]$/.test(o.guestId)) fixed2++; else occ2++; }
    const seats2 = await gr('/api/seating/plan'); let held2 = 0; const walk = (o) => { if (Array.isArray(o)) { o.forEach(walk); return; } if (o && typeof o === 'object') { if (o.guestId && o.seatId) held2++; Object.values(o).forEach((v) => { if (v && typeof v === 'object') walk(v); }); } }; walk(seats2.body.events || {});
    const dry2 = await gr('/api/gr/reset', { dryRun: true });
    note('reset-executed-zero', run.status === 200 && run.body.dryRun === false && run.body.epoch && run.body.remaining && run.body.remaining.occupancies === 0 && run.body.remaining.holds === 0 && run.body.remaining.kvKeys === 0 && occ2 === 0 && fixed2 === 2 && held2 === 0 && seats2.body.open === true && dry2.body.rooms.occupancies === 0 && dry2.body.seating.holds === 0 && dry2.body.drafts.had === 0 && dry2.body.kv.keys.length === 0, JSON.stringify({ cleared: run.body.rooms.cleared, seats: run.body.seating.cleared, drafts: run.body.drafts.cleared, kv: run.body.kv.deleted, occ: occ2, fixed: fixed2, held: held2, open: seats2.body.open }));
    /* the cached device: its next visit clears the old trip instead of pushing it back */
    await trip(dev); await dev.waitForTimeout(2500);
    const devAfter = await dev.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/draft', { headers: { 'x-siyl-auth': a.bearer } }); const g = await r.json(); const k = (g.draft && g.draft.keys) || {}; const c = await (await fetch('/api/contact', { headers: { 'x-siyl-auth': a.bearer } })).json(); return { contactLocal: !!SIYL_GUEST.contact('email'), contactServer: !!(c.contact && c.contact.email), guestKey: localStorage.getItem('siyl.guest'), bag: SIYL_BAG.get().length, skips: SIYL_JOURNEY.SEGMENTS.filter((s2) => SIYL_JOURNEY.isSkipped(s2.key)).length, epoch: localStorage.getItem('siyl.draft.reset'), serverBag: k['siyl.bag'] || null, serverSkip: k['siyl.skip'] || null, resetAt: g.resetAt, submission: g.submission && g.submission.submissionStatus, holds: Object.keys((await (await fetch('/api/rooms/mine', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: '{}' })).json()).mine || {}).length }; });
    await shot(dev, '390-after-reset-my-trip');
    note('reset-device-honours-the-epoch', cached === 10 && devAfter.bag === 0 && devAfter.skips === 0 && devAfter.holds === 0 && !devAfter.contactLocal && !devAfter.contactServer && !devAfter.guestKey && devAfter.epoch === run.body.epoch && (!devAfter.serverBag || devAfter.serverBag === '[]') && (!devAfter.serverSkip || devAfter.serverSkip === '[]') && devAfter.resetAt === run.body.epoch && devAfter.submission === 'draft', JSON.stringify({ cached, after: devAfter }) + ' (the old trip never came back — not on the device, not on the server, not in the engine; the contact neither)');
    const st = await gr('/api/status?invitation=INV-T002'); note('reset-no-submission-remains', st.status === 200 && st.body.received === false, JSON.stringify(st.body));
    await dev.context().close();
  }
}

/* ===== 6 · widths and console ===== */
for (const w of [320, 834, 1440]) { const p = await fresh(w); const over = []; for (const f of ['index.html', 'journeys.html', 'your-journey.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) over.push(f + ':' + ov); } note('width-' + w, over.length === 0, over.join(', ') || 'no horizontal overflow'); await p.context().close(); }
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
