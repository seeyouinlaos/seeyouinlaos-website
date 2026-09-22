/* MY PROFILE · THE RETURN PAGE — E2E on the isolated stage worker (Owner, 21 Sep 2026), real WebKit / iPhone 13 at phone widths.
   Synthetic guests only (T001 Ada · T002 Ben, one party · T003 Cleo); codes read from the scratchpad, never printed.
   node docs/acceptance/2026-09-21-profile-return/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the community from the real stage state (empty → one guest sent → the partner sees her, portrait and initials, a decline
   is not a joining guest) · the countdown · the journey in numbers · the strikethrough on Your Invitation at 320 / 390 (and 834 / 1440) ·
   the profile at four widths (no overflow, nothing behind the Bag) · the existing profile functions · the console. */
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
const profile = async (p) => { await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForFunction(() => { const c = document.querySelector('#community'); return c && c.getAttribute('data-community') !== 'loading'; }, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200); };
const community = (p) => p.evaluate(() => { const c = document.querySelector('#community'); return { state: c ? c.getAttribute('data-community') : null, h2: c && c.querySelector('h2') ? c.querySelector('h2').innerText : '', people: [...document.querySelectorAll('.pf-person')].map((e) => ({ id: e.getAttribute('data-person'), name: e.querySelector('.pf-person-n').innerText, photo: !!e.querySelector('img'), initials: (e.querySelector('.pf-ava i') || {}).innerText || '', role: (e.querySelector('.pf-person-r') || {}).innerText || '' })), recent: (document.querySelector('#community .t-b1') || {}).innerText || '', text: c ? c.innerText : '' }; });
const sendTrip = async (p, id, email) => { await contact(p, email); await trip(p); await clean(p); await trip(p); await toggle(p, 'vientianeWedding', 1000); await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); }); await wedding(p, 'no', 'yes'); await prep(p); for (const [ev, seatId] of [['ceremony', 'C-R-0' + (id === 'T003' ? '6' : '5') + '-02'], ['dinner', 'D-T-0' + (id === 'T003' ? '6' : '5')]]) await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev, seatId, name: id }) }); await about(p, 'Pandan'); await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); return p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn) return { clicked: false }; btn.click(); await new Promise((r) => setTimeout(r, 6000)); return { clicked: true, after: btn.innerText }; }); };

if (!LIVE) {
  for (const id of ['T001', 'T002', 'T003']) await resetGuest(id);
  await gr('/api/rooms/reset', { dryRun: false, actor: 'e2e-profile' }, 'POST');

  /* ===== 1 · THE COMMUNITY from the real stage state ===== */
  {
    const ben = await fresh(390); await signIn(ben, 'T002'); await contact(ben, 'ben.test@example.org'); await profile(ben);
    const c0 = await community(ben); await shot(ben, '390-community-empty');
    /* the couple stands there before anyone has sent a trip (21 Sep 2026): by the register's role, no day, so not in RECENTLY JOINED */
    note('community-couple-always-present', c0.state === '2' && /2 of us are joining so far/i.test(c0.h2) && c0.people.length === 2 && c0.people[0].id === 'G049' && /^suthep$/i.test(c0.people[0].name) && /^groom$/i.test(c0.people[0].role) && c0.people[1].id === 'G048' && /^haruthai$/i.test(c0.people[1].name) && /^bride$/i.test(c0.people[1].role) && !/Recently joined/i.test(c0.text), JSON.stringify({ state: c0.state, h2: c0.h2, people: c0.people, recent: c0.recent }));
    /* Cleo sends her trip — with a portrait; the fresh stage's first joining guest */
    const cleo = await fresh(390); await signIn(cleo, 'T003');
    const up = await uploadPhoto(cleo);
    const s = await sendTrip(cleo, 'T003', 'cleo.test@example.org');
    await profile(cleo); const c1 = await community(cleo); await shot(cleo, '390-community-one');
    note('community-first-guest-with-portrait', up === 200 && s.clicked && /Sent to Guest Relations/i.test(s.after) && c1.state === '3' && /3 of us are joining so far/i.test(c1.h2) && /You are among them/.test(c1.text) && c1.people.length === 3 && c1.people[2].id === 'T003' && /^cleo$/i.test(c1.people[2].name) && c1.people[2].photo === true && /^Cleo$/i.test(c1.recent.trim()), JSON.stringify({ up, s, c1: { state: c1.state, h2: c1.h2, people: c1.people, recent: c1.recent } }));
    /* Ben returns: Cleo has joined since his last visit — her portrait through the authenticated read; Ada declines → not a joining guest */
    const ada = await fresh(390); await signIn(ada, 'T001'); await contact(ada, 'ada.test@example.org'); await trip(ada); await clean(ada); await trip(ada); await ada.click('[data-scope-none]'); await ada.waitForTimeout(900); if (await ada.$('[data-release-confirm]')) { await ada.click('[data-release-confirm]'); await ada.waitForTimeout(2500); }
    await ada.goto(O + '/review.html', { waitUntil: 'load' }); await ada.waitForTimeout(2500); const adaSent = await ada.evaluate(async () => { const btn = document.querySelector('#send'); btn.click(); await new Promise((r) => setTimeout(r, 6000)); return btn.innerText; });
    await profile(ben); const c2 = await community(ben); await shot(ben, '390-community-returning');
    note('community-returning-guest-sees-who-joined', /Not joining/i.test(adaSent) && c2.state === '3' && c2.people.length === 3 && c2.people[2].id === 'T003' && c2.people[2].photo === true && !/You are among them/.test(c2.text) && !c2.people.some((x) => x.id === 'T001'), JSON.stringify({ adaSent, c2: { state: c2.state, people: c2.people } }) + ' (a decline is a response, not a joining guest)');
    /* Ben sends too: two guests, Ben without a photo → his initials; Cleo's tile keeps her portrait; no private field on the page */
    const sb = await sendTrip(ben, 'T002', 'ben.test@example.org'); await profile(ben); const c3 = await community(ben); await shot(ben, '390-community-two');
    const priv = await ben.evaluate(() => /@example\.org|\+66|INV-T|passport-page/.test(document.querySelector('#community').innerHTML));
    note('community-two-guests-initials-and-portrait', sb.clicked && c3.state === '4' && /4 of us are joining so far/i.test(c3.h2) && c3.people.length === 4 && c3.people[2].id === 'T002' && c3.people[2].photo === false && c3.people[2].initials === 'B' && c3.people[3].id === 'T003' && c3.people[3].photo === true && /^Ben · Cleo$/i.test(c3.recent.trim()) && !priv, JSON.stringify({ state: c3.state, people: c3.people, priv }));
    const srv = (await api(ben, '/api/community', { method: 'GET' })).body; const keys = srv && srv.guests && srv.guests[2] ? Object.keys(srv.guests[2]).sort().join() : '', ckeys = srv && srv.guests && srv.guests[0] ? Object.keys(srv.guests[0]).sort().join() : '';
    note('community-api-identity-only', srv && srv.ok && srv.count === 4 && srv.couple === 2 && keys === 'guestId,joinedAt,name,photo' && ckeys === 'guestId,joinedAt,name,photo,role' && srv.guests[0].joinedAt === null && srv.guests[1].joinedAt === null && srv.guests.every((g) => /^T\d{3}$|^G04[89]$/.test(g.guestId)), JSON.stringify({ count: srv && srv.count, keys, ckeys }));
    /* the existing profile functions still stand for Ben: photo actions, name fields, contact, documents, publication, Bag */
    const fx = await ben.evaluate(() => ({ photo: !!document.querySelector('[data-profile-identity]'), changePhoto: /Change photo|Add profile photo/i.test(document.querySelector('[data-profile-identity]').innerText), first: !!document.querySelector('input[data-c="firstName"]'), last: !!document.querySelector('input[data-c="lastName"]'), email: /@/.test((document.querySelector('[data-profile-contact]') || {}).innerText || ''), docs: /Passport/i.test((document.querySelector('[data-profile-documents]') || {}).innerText || '') && /Not provided/i.test((document.querySelector('[data-profile-documents]') || {}).innerText || ''), pub: /Publication choice/i.test((document.querySelector('[data-profile-documents]') || {}).innerText || ''), bag: (document.querySelector('.jbar .jb-t, [data-bag-total]') || {}).innerText || document.body.innerText.match(/USD [\d,]+/)[0], order: [...document.querySelectorAll('main section, main .prep-sec')].map((s) => s.id).filter(Boolean) }));
    note('profile-functions-preserved', fx.photo && fx.changePhoto && fx.first && fx.last && fx.email && fx.docs && fx.pub && /USD 0/.test(fx.bag) && fx.order.indexOf('identity') < fx.order.indexOf('countdown') && fx.order.indexOf('countdown') < fx.order.indexOf('community') && fx.order.indexOf('community') < fx.order.indexOf('numbers') && fx.order.indexOf('numbers') < fx.order.indexOf('documents'), JSON.stringify(fx));
    await ada.context().close(); await cleo.context().close(); await ben.context().close();
  }

  /* ===== 2 · THE COUNTDOWN and THE JOURNEY IN NUMBERS on the page ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await profile(p);
    await p.evaluate(() => document.querySelector('#countdown').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const cd = await p.evaluate(() => { const c = document.querySelector('#countdown'); const expect = Math.round((new Date(2027, 1, 21) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000); return { phase: c.getAttribute('data-countdown'), to: Number(c.querySelector('[data-count-to]').getAttribute('data-count-to')), shown: c.querySelector('.pf-num-v').innerText, expect, lead: c.querySelector('.t-l1').innerText, tail: c.querySelector('.t-l1.mute').innerText }; });
    await p.waitForTimeout(1500); const cd2 = await p.evaluate(() => document.querySelector('#countdown .pf-num-v').innerText);
    note('countdown-days-from-the-clock', cd.phase === 'before' && cd.to === cd.expect && cd.to > 0 && Number(cd2) === cd.expect && /The journey begins in/i.test(cd.lead) && /21 February 2027 · Bangkok/i.test(cd.tail), JSON.stringify({ ...cd, after: cd2 }));
    const nums = await p.evaluate(async () => { const s = document.querySelector('#numbers'); for (const e of s.querySelectorAll('.pf-stat')) { e.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 250)); } await new Promise((r) => setTimeout(r, 1200)); return [...s.querySelectorAll('.pf-stat')].map((e) => ({ key: e.getAttribute('data-stat'), to: e.querySelector('[data-count-to]').getAttribute('data-count-to'), shown: e.querySelector('.pf-num-v').innerText, label: e.querySelector('.t-l1').innerText })); });
    await shot(p, '390-numbers');
    const expectN = { countries: 3, cities: 4, stays: 9, nights: 15, days: 16, trains: 2, flights: 3 };
    note('journey-in-numbers-counted', nums.length === 12 && nums.every((n) => Number(n.shown) === Number(n.to)) && Object.keys(expectN).every((k) => nums.some((n) => n.key === k && Number(n.to) === expectN[k])) && ['restaurants', 'cafes', 'bars', 'museums', 'temples'].every((k) => nums.some((n) => n.key === k && Number(n.to) > 0)) && !nums.some((n) => n.key === 'michelin'), JSON.stringify(nums.map((n) => n.key + ':' + n.to)));
    const calm = await fresh(390, { reducedMotion: 'reduce' }); await signIn(calm, 'T003'); await profile(calm);
    const cm = await calm.evaluate(() => ({ shown: document.querySelector('#countdown .pf-num-v').innerText, to: document.querySelector('#countdown [data-count-to]').getAttribute('data-count-to'), people: getComputedStyle(document.querySelector('.pf-person')).opacity, stat: document.querySelector('#numbers .pf-num-v').innerText }));
    note('countdown-numbers-reduced-motion', cm.shown === cm.to && cm.people === '1' && cm.stat !== '00', JSON.stringify(cm)); await calm.context().close(); await p.context().close();
  }

  /* ===== 3 · THE STRIKETHROUGH on Your Invitation: the in-prose link is inline, its box no taller than its line, no border through the next line ===== */
  for (const w of [320, 390, 834, 1440]) {
    const p = await fresh(w); await signIn(p, 'T001'); await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => { const a = document.querySelector('a.p-link[href="#p-firstName"]'); if (!a) return { none: true }; const par = a.closest('p'); const cs = getComputedStyle(a); const r = a.getBoundingClientRect(), pr = par.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(par).lineHeight); const lines = Math.round(pr.height / lh); return { display: cs.display, h: Math.round(r.height), lh: Math.round(lh), lines, border: cs.borderBottomWidth, paraH: Math.round(pr.height), text: par.innerText.replace(/\s+/g, ' ').slice(0, 90) }; });
    await p.evaluate(() => document.querySelector('a.p-link[href="#p-firstName"]').scrollIntoView({ block: 'center' })); await shot(p, w + '-invitation-name-copy');
    note('name-copy-no-strikethrough-' + w, !m.none && m.display === 'inline' && m.h <= m.lh * (m.h > m.lh + 2 ? 2 : 1) + 2 && m.border === '1px' && /correct your name/i.test(m.text), JSON.stringify(m) + ' (an inline word — one line box, or two where the words wrap at 320; its underline stays with its own words)');
    await p.context().close();
  }

  /* ===== 4 · THE PROFILE at four widths: no overflow, nothing behind the Bag, the people rail scrolls by itself, the numbers readable ===== */
  for (const w of [320, 390, 834, 1440]) {
    const p = await fresh(w); await signIn(p, 'T002'); await profile(p);
    const g = await p.evaluate(() => { const doc = document.documentElement; const bag = document.querySelector('.jbar, [data-bag-bar]'); const bagH = bag ? bag.getBoundingClientRect().height : 0; const last = [...document.querySelectorAll('main section')].pop(); const body = getComputedStyle(document.body); const rail = document.querySelector('.pf-people'); const stat = document.querySelector('.pf-stat .pf-num-v'); return { ov: doc.scrollWidth - doc.clientWidth, railScrolls: rail ? rail.scrollWidth > rail.clientWidth : null, railW: rail ? rail.clientWidth : 0, bagH: Math.round(bagH), padB: parseFloat(body.paddingBottom) || 0, lastBottom: last ? Math.round(last.getBoundingClientRect().bottom + scrollY) : 0, docH: doc.scrollHeight, statFont: stat ? getComputedStyle(stat).fontSize : '', statW: stat ? Math.round(stat.getBoundingClientRect().width) : 0, cellW: document.querySelector('.pf-stat') ? Math.round(document.querySelector('.pf-stat').getBoundingClientRect().width) : 0 }; });
    await p.evaluate(() => document.querySelector('#numbers').scrollIntoView()); await p.waitForTimeout(1200); await shot(p, w + '-profile-numbers'); await p.evaluate(() => document.querySelector('#community').scrollIntoView()); await p.waitForTimeout(400); await shot(p, w + '-profile-community');
    note('profile-width-' + w, g.ov <= 1 && g.docH - g.lastBottom >= g.bagH && g.statW <= g.cellW && parseFloat(g.statFont) >= 48, JSON.stringify(g));
    await p.context().close();
  }
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');

fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close(); await wk.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
