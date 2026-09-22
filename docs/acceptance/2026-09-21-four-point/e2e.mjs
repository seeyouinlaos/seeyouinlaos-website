/* THE FOUR-POINT CLOSE-OUT — E2E on the isolated stage worker (Owner, 21 Sep 2026). WebKit at phone and iPad sizes, Chromium
   at desktop. Synthetic guests only (T001 Ada · T002 Ben, one party · T003 Cleo); codes read from the scratchpad, never printed.
   node docs/acceptance/2026-09-21-four-point/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: 1 · the couple in WHO'S JOINING US (always, by the register's role, count and wording, RECENTLY JOINED genuine only)
   · 2 · upload durability through the real flows (the portrait through a name edit, a contact edit, Save my progress, a trip sent,
   a trip updated, sign-out and sign-in, a second device; a failed replacement keeps it; only Remove removes it) · 3 · the hero at
   the iPhone, tablet portrait, tablet landscape and desktop sizes (the frame per class, every slide stable, the five in order)
   · 4 · the passport: ADD PASSPORT → the picker → RECEIVED only after the store, the receipt after reload / sign-out / a name
   edit / a trip update, the partner and an unrelated guest refused, Guest Relations retrieval, no guest read, no public URL. */
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
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, ...Array(900).fill(9), 0xff, 0xd9]);
const PDF = Buffer.from('%PDF-1.4\n' + 'x'.repeat(1200) + '\n%%EOF');
const sendTripAt = async (p) => { await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); return p.evaluate(async () => { const btn = document.querySelector('#send'); if (!btn) return { clicked: false, after: 'no #send' }; btn.click(); await new Promise((r) => setTimeout(r, 6000)); return { clicked: true, after: btn.innerText }; }); };
const community = (p) => p.evaluate(() => { const c = document.querySelector('#community'); return { state: c ? c.getAttribute('data-community') : null, h2: c && c.querySelector('h2') ? c.querySelector('h2').innerText : '', people: [...document.querySelectorAll('.pf-person')].map((e) => ({ id: e.getAttribute('data-person'), name: e.querySelector('.pf-person-n').innerText, photo: !!e.querySelector('img'), role: (e.querySelector('.pf-person-r') || {}).innerText || '' })), recent: /Recently joined/i.test(c.innerText) ? (c.innerText.split(/Recently joined/i)[1] || '').trim().split('\n')[0] : '', text: c.innerText }; });
const profile = async (p) => { await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForFunction(() => { const c = document.querySelector('#community'); return c && c.getAttribute('data-community') !== 'loading'; }, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200); };
const photoBytes = (p, of) => p.evaluate(async (of) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo' + (of ? '?of=' + of : ''), { headers: { 'x-siyl-auth': a.bearer } }); if (!r.ok) return { status: r.status }; const b = new Uint8Array(await r.arrayBuffer()); return { status: r.status, len: b.length, head: [...b.slice(0, 8)].join(','), at: r.headers.get('x-photo-at') }; }, of || '');
const sendTo = async (p, opts) => sendTripAt(p, opts);

/* a complete Vientiane trip for a synthetic guest (the same recipe as the profile-return suite) */
const completeTrip = async (p, id, email, flavor) => { await contact(p, email); await trip(p); await clean(p); await trip(p); await toggle(p, 'vientianeWedding', 1000); await p.evaluate(async () => { await SIYL_STAY.select('guesthouse', 'guest-house'); }); await wedding(p, 'no', 'yes'); await prep(p); for (const [ev, seatId] of [['ceremony', 'C-R-0' + (id === 'T003' ? '6' : '5') + '-02'], ['dinner', 'D-T-0' + (id === 'T003' ? '6' : '5')]]) await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev, seatId, name: id }) }); await about(p, flavor || 'Pandan'); };

/* ===== 1 · THE COUPLE in WHO'S JOINING US ===== */
{
  const ben = await fresh(390); await signIn(ben, 'T002'); await contact(ben, 'ben.test@example.org'); await profile(ben);
  const c0 = await community(ben); await shot(ben, '390-community-couple-only');
  note('couple-always-present-before-anyone', c0.state === '2' && /2 of us are joining so far/i.test(c0.h2) && c0.people.length === 2 && c0.people[0].id === 'G049' && /^suthep$/i.test(c0.people[0].name) && /^groom$/i.test(c0.people[0].role) && c0.people[1].id === 'G048' && /^haruthai$/i.test(c0.people[1].name) && /^bride$/i.test(c0.people[1].role) && c0.recent === '' && !/You are among them/.test(c0.text), JSON.stringify(c0).slice(0, 400));
  const srv0 = (await api(ben, '/api/community', { method: 'GET' })).body;
  note('couple-api-by-role-no-fake-record', srv0 && srv0.ok && srv0.count === 2 && srv0.couple === 2 && srv0.guests.every((g) => g.role && g.joinedAt === null) && !JSON.stringify(srv0).includes('INV-'), JSON.stringify(srv0));
  const regs = await gr('/api/gr/journeys'); const hostRecords = regs.body && regs.body.journeys ? regs.body.journeys.filter((j) => /^INV-G04[89]$/.test(j.invitationId) && j.submission) : [];
  note('couple-no-synthetic-registration', regs.status === 200 && hostRecords.length === 0, JSON.stringify({ status: regs.status, hostRecords: hostRecords.length }) + ' (no registration, no firstSentAt was written for the couple)');
  /* Cleo sends: 3 of us, she joins RECENTLY JOINED; the couple still first and never in RECENTLY JOINED */
  const cleo = await fresh(390); await signIn(cleo, 'T003'); await uploadPhoto(cleo); await completeTrip(cleo, 'T003', 'cleo.test@example.org'); const s = await sendTripAt(cleo);
  await profile(cleo); const c1 = await community(cleo); await shot(cleo, '390-community-couple-and-cleo');
  note('couple-then-guest-inclusive-wording', s.clicked && /Sent to Guest Relations/i.test(s.after) && c1.state === '3' && /3 of us are joining so far/i.test(c1.h2) && /You are among them/.test(c1.text) && c1.people.map((x) => x.id).join() === 'G049,G048,T003' && c1.people[2].photo === true && /^Cleo$/i.test(c1.recent), JSON.stringify({ s, c1: { state: c1.state, h2: c1.h2, people: c1.people, recent: c1.recent } }));
  await ben.context().close(); await cleo.context().close();
}

/* ===== 2 · UPLOAD DURABILITY through the real flows ===== */
{
  const ada = await fresh(390); await signIn(ada, 'T001'); await contact(ada, 'ada.test@example.org');
  const up = await uploadPhoto(ada); const p0 = await photoBytes(ada);
  const same = async (p, what) => { const x = await photoBytes(p); const ok = x.status === 200 && x.len === p0.len && x.head === p0.head && x.at === p0.at; note('photo-stands-' + what, ok, JSON.stringify(x)); return ok; };
  note('photo-uploaded', up === 200 && p0.status === 200 && p0.len === 76, JSON.stringify(p0));
  /* a name edit in the profile */
  await profile(ada); await ada.fill('input[data-c="firstName"]', 'Adaline'); await ada.dispatchEvent('input[data-c="firstName"]', 'change'); await ada.waitForTimeout(1500); await ada.fill('input[data-c="lastName"]', 'Tester'); await ada.dispatchEvent('input[data-c="lastName"]', 'change'); await ada.waitForTimeout(1500);
  await same(ada, 'after-name-edit');
  await contact(ada, 'ada.again@example.org'); await same(ada, 'after-contact-edit');
  await completeTrip(ada, 'T001', 'ada.again@example.org'); await ada.evaluate(async () => { try { await window.SIYL_DRAFT.flush('test'); } catch (e) {} }); await ada.waitForTimeout(800); await same(ada, 'after-save-my-progress');
  const s1 = await sendTripAt(ada); note('trip-sent-v1', s1.clicked && /Sent to Guest Relations/i.test(s1.after), JSON.stringify(s1)); await same(ada, 'after-trip-sent');
  await about(ada, 'Matcha Green Tea'); const s2 = await sendTripAt(ada); note('trip-sent-v2', s2.clicked && /Sent to Guest Relations|Updated/i.test(s2.after), JSON.stringify(s2)); await same(ada, 'after-trip-updated');
  const rec = await gr('/api/gr/record?invitation=INV-T001'); note('version-incremented-photo-not-in-record', rec.body && rec.body.record && rec.body.record.version >= 2 && !JSON.stringify(rec.body.record).includes('avatar'), JSON.stringify({ version: rec.body && rec.body.record && rec.body.record.version }));
  /* sign out, sign in again; a second device */
  await ada.goto(O + '/profile.html', { waitUntil: 'load' }); await ada.waitForTimeout(800); await ada.click('[data-signout]'); await ada.waitForTimeout(1200);
  await signIn(ada, 'T001'); await same(ada, 'after-sign-out-and-in');
  const ada2 = await fresh(1440); await signIn(ada2, 'T001'); await same(ada2, 'on-a-second-device');
  await profile(ada2); const card = await ada2.evaluate(() => { const el = document.querySelector('[data-avatar]'); return el ? el.classList.contains('has') && /blob:|url\(/.test(el.style.backgroundImage) : false; });
  note('photo-visible-in-account-card', card === true, JSON.stringify({ card }));
  /* a failed replacement keeps it: an unsupported type; then a partner's DELETE is her own key */
  const bad = await ada2.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'text/plain' }, body: 'not an image' }); return r.status; });
  note('failed-replacement-keeps-photo', bad === 415 && await same(ada2, 'after-failed-replacement'), JSON.stringify({ bad }));
  const ben = await fresh(390); await signIn(ben, 'T002'); const benDel = await api(ben, '/api/profile/photo', { method: 'DELETE' }); note('partner-delete-is-her-own-key', benDel.status === 200 && await same(ada, 'after-partner-delete'), JSON.stringify(benDel.body));
  const seen = await photoBytes(ben, 'T001'); note('partner-reads-portrait-by-id', seen.status === 200 && seen.len === p0.len, JSON.stringify(seen));
  /* only Remove removes it */
  await profile(ada2); const removed = await ada2.evaluate(async () => { const b = document.querySelector('[data-photo-remove]'); if (!b) return 'no remove button'; b.click(); await new Promise((r) => setTimeout(r, 2500)); return (document.querySelector('[data-profile-identity]') || {}).innerText || ''; });
  const gone = await photoBytes(ada2); note('only-remove-removes', /Photo removed/i.test(removed) && gone.status === 404, JSON.stringify({ removed: String(removed).slice(0, 80), gone }));
  await ada.context().close(); await ada2.context().close(); await ben.context().close();
}

/* ===== 3 · THE HERO FRAME per viewport class (WebKit at the iPad sizes, Chromium at desktop) ===== */
{
  const CLASSES = [[320, 568, 1, 'phone'], [375, 667, 1, 'phone'], [390, 844, 1, 'phone'], [430, 932, 1, 'phone'], [768, 1024, 0.8, 'tablet-portrait'], [810, 1080, 0.8, 'tablet-portrait'], [820, 1180, 0.8, 'tablet-portrait'], [834, 1194, 0.8, 'tablet-portrait'], [1024, 768, 1.5, 'tablet-landscape'], [1080, 810, 1.5, 'tablet-landscape'], [1180, 820, 1.5, 'tablet-landscape'], [1194, 834, 1.5, 'tablet-landscape'], [1440, 900, 1.5, 'desktop']];
  const SHOT = new Set(['390x844', '834x1194', '1194x834', '1440x900']);
  for (const [w, h, ratio, cls] of CLASSES) {
    const ctx = await (w < 1200 ? wk : b).newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set('hero ' + w + ':' + e.message, 1));
    await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(500);
    const g0 = await p.evaluate(() => { const am = document.querySelector('.a-hero .am'); const r = am.getBoundingClientRect(); const ah = document.querySelector('.a-hero .ah').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), ahX: Math.round(ah.x), ahTop: Math.round(ah.top), ratio: +(r.width / r.height).toFixed(2), state: am.getAttribute('data-hero-state'), slides: am.getAttribute('data-hero-slides'), ov: document.documentElement.scrollWidth - innerWidth }; });
    const frames = [];
    for (const n of [1, 2, 3, 4, 5]) {
      const f = await p.evaluate((n) => { const L = document.querySelectorAll('.a-hero-slide'); L.forEach((l) => { l.classList.remove('is-on'); l.style.transition = 'none'; }); if (n > 1) { const l = L[n - 2]; l.style.backgroundImage = 'url(' + l.getAttribute('data-src') + ')'; l.classList.add('is-on'); } const el = n > 1 ? L[n - 2] : document.querySelector('.a-hero .am'); const cs = getComputedStyle(el); const r = document.querySelector('.a-hero .am').getBoundingClientRect(); return { pos: cs.backgroundPosition, size: cs.backgroundSize, transform: cs.transform, filter: cs.filter, w: Math.round(r.width), h: Math.round(r.height) }; }, n);
      frames.push(f); await p.waitForTimeout(250); if (SHOT.has(w + 'x' + h)) await p.screenshot({ path: path.join(OUT, `hero-${w}x${h}-slide-${n}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(h, g0.ahTop + 120) } });
    }
    const stable = frames.every((f) => f.w === g0.w && f.h === g0.h), clean = frames.every((f) => f.transform === 'none' && f.filter === 'none' && f.size === 'cover');
    const pos = frames.map((f) => f.pos); const focal = cls === 'phone' ? ['50% 50%', '50% 55%', '50% 30%', '50% 36%', '50% 38%'] : cls === 'tablet-portrait' ? ['50% 50%', '50% 50%', '50% 30%', '50% 34%', '50% 36%'] : ['50% 50%', '50% 50%', '50% 24%', '50% 30%', '50% 34%'];
    note('hero-' + cls + '-' + w + 'x' + h, g0.slides === '5' && g0.state === 'playing' && g0.ratio === ratio && g0.ov <= 1 && stable && clean && pos.join('|') === focal.join('|') && (cls === 'phone' || g0.ahX === g0.x), JSON.stringify({ g0, pos, stable, clean }));
    await ctx.close();
  }
  /* the loop still runs at 834 (WebKit): 0 → 1 → 2 at the Owner's 3 s pace (22 Sep 2026), the frame the same box throughout */
  const p = await (await wk.newContext({ viewport: { width: 834, height: 1194 } })).newPage(); await p.goto(O + '/index.html', { waitUntil: 'load' }); const seq = [], boxes = [];
  for (let i = 0; i < 3; i++) { seq.push(await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'))); boxes.push(await p.evaluate(() => { const r = document.querySelector('.a-hero .am').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })); await p.waitForTimeout(3300); }
  note('hero-ipad-loop-no-shift', seq.join('') === '012' && new Set(boxes).size === 1 && boxes[0] === '720x900', JSON.stringify({ seq, boxes }));
  await p.context().close();
}

/* ===== 4 · THE PASSPORT (iPhone WebKit) ===== */
{
  const cleo = await fresh(390); await signIn(cleo, 'T003'); await contact(cleo, 'cleo.test@example.org');
  await cleo.goto(O + '/about-you.html', { waitUntil: 'load' }); await cleo.waitForSelector('[data-doc][data-k="passport"]', { timeout: 20000 });
  const before = await cleo.evaluate(() => ({ state: document.querySelector('[data-doc][data-k="passport"] .t-l1').innerText, add: document.querySelector('[data-doc][data-k="passport"] [data-add]').innerText, accept: document.querySelector('[data-doc][data-k="passport"] input[type=file]').getAttribute('accept') }));
  note('passport-add-control', /not added/i.test(before.state) && /add passport/i.test(before.add) && before.accept === 'image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf', JSON.stringify(before));
  await shot(cleo, '390-passport-before');
  /* the picker: a JPEG chosen on the iPhone */
  const [chooser] = await Promise.all([cleo.waitForEvent('filechooser'), cleo.click('[data-doc][data-k="passport"] [data-add]')]);
  await chooser.setFiles({ name: 'IMG_0001.jpeg', mimeType: 'image/jpeg', buffer: JPEG }); await cleo.waitForTimeout(2500);
  const after = await cleo.evaluate(() => ({ state: document.querySelector('[data-doc][data-k="passport"] .t-l1').innerText, add: document.querySelector('[data-doc][data-k="passport"] [data-add]').innerText, receipt: JSON.parse(localStorage.getItem('siyl.docs') || '{}') }));
  const r1 = after.receipt.guests && after.receipt.guests.T003 && after.receipt.guests.T003.passport;
  note('passport-received-after-store', /received/i.test(after.state) && /replace/i.test(after.add) && r1 && /^doc\/INV-T003\/T003\/passport\//.test(r1.key) && r1.bytes === JPEG.length && r1.filename === 'IMG_0001.jpeg' && !JSON.stringify(after.receipt).includes('base64'), JSON.stringify({ state: after.state, add: after.add, key: r1 && r1.key, bytes: r1 && r1.bytes }));
  await shot(cleo, '390-passport-received');
  const stored = await gr('/api/gr/documents?invitation=INV-T003');
  note('passport-in-the-store', stored.status === 200 && stored.body.count === 1 && stored.body.documents[0].key === r1.key && stored.body.documents[0].type === 'image/jpeg' && stored.body.documents[0].bytes === JPEG.length && stored.body.documents[0].sha256 === r1.sha256, JSON.stringify(stored.body));
  /* a PDF chosen: a new object; the JPEG stays */
  const [ch2] = await Promise.all([cleo.waitForEvent('filechooser'), cleo.click('[data-doc][data-k="passport"] [data-add]')]);
  await ch2.setFiles({ name: 'passport.pdf', mimeType: 'application/pdf', buffer: PDF }); await cleo.waitForTimeout(2500);
  const r2 = await cleo.evaluate(() => JSON.parse(localStorage.getItem('siyl.docs')).guests.T003.passport); const stored2 = await gr('/api/gr/documents?invitation=INV-T003');
  note('passport-pdf-replacement-keeps-earlier-object', r2.key !== r1.key && r2.replaced === true && stored2.body.count === 2 && stored2.body.documents.map((d) => d.key).includes(r1.key) && stored2.body.documents[0].key === r2.key && stored2.body.documents[0].type === 'application/pdf', JSON.stringify(stored2.body.documents.map((d) => [d.kind, d.type, d.bytes])));
  /* a refused type and an oversize file: nothing stored, the receipt unchanged, the truth on the page */
  const [ch3] = await Promise.all([cleo.waitForEvent('filechooser'), cleo.click('[data-doc][data-k="passport"] [data-add]')]);
  await ch3.setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }); await cleo.waitForTimeout(2000);
  const err1 = await cleo.evaluate(() => document.querySelector('[data-doc][data-k="passport"] [data-err]').innerText);
  const [ch4] = await Promise.all([cleo.waitForEvent('filechooser'), cleo.click('[data-doc][data-k="passport"] [data-add]')]);
  await ch4.setFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(12 * 1024 * 1024 + 1, 1) }); await cleo.waitForTimeout(2000);
  const err2 = await cleo.evaluate(() => document.querySelector('[data-doc][data-k="passport"] [data-err]').innerText);
  const r3 = await cleo.evaluate(() => JSON.parse(localStorage.getItem('siyl.docs')).guests.T003.passport); const stored3 = await gr('/api/gr/documents?invitation=INV-T003');
  note('passport-refusals-keep-the-receipt', /JPEG, PNG, HEIC, WebP or PDF/.test(err1) && /larger than 12 MB/.test(err2) && r3.key === r2.key && stored3.body.count === 2, JSON.stringify({ err1, err2, count: stored3.body.count }));
  /* persistence: reload · sign out and in · a name edit · a trip update · a second device */
  await cleo.reload({ waitUntil: 'load' }); await cleo.waitForTimeout(1200); const st1 = await cleo.evaluate(() => document.querySelector('[data-doc][data-k="passport"] .t-l1').innerText);
  await profile(cleo); await cleo.fill('input[data-c="firstName"]', 'Cleopatra'); await cleo.dispatchEvent('input[data-c="firstName"]', 'change'); await cleo.waitForTimeout(1500);
  await completeTrip(cleo, 'T003', 'cleo.test@example.org'); const s = await sendTripAt(cleo); await about(cleo, 'Matcha Green Tea'); const s2 = await sendTripAt(cleo);
  await cleo.goto(O + '/profile.html', { waitUntil: 'load' }); await cleo.waitForTimeout(800); await cleo.click('[data-signout]'); await cleo.waitForTimeout(1200);
  await signIn(cleo, 'T003'); await cleo.goto(O + '/about-you.html', { waitUntil: 'load' }); await cleo.waitForTimeout(1500); const st2 = await cleo.evaluate(() => ({ state: document.querySelector('[data-doc][data-k="passport"] .t-l1').innerText, key: (JSON.parse(localStorage.getItem('siyl.docs') || '{}').guests || { T003: {} }).T003.passport }));
  const other = await fresh(390); await signIn(other, 'T003'); await other.goto(O + '/about-you.html', { waitUntil: 'load' }); await other.waitForTimeout(1500); const st3 = await other.evaluate(() => document.querySelector('[data-doc][data-k="passport"] .t-l1').innerText);
  const stored4 = await gr('/api/gr/documents?invitation=INV-T003'); const rec = await gr('/api/gr/record?invitation=INV-T003');
  note('passport-persists-through-everything', /received/i.test(st1) && s.clicked && s2.clicked && /received/i.test(st2.state) && st2.key && st2.key.key === r2.key && /received/i.test(st3) && stored4.body.count === 2 && rec.body.record && rec.body.record.version >= 2 && !JSON.stringify(rec.body.record).includes('%PDF'), JSON.stringify({ st1, st2: st2.state, st3, count: stored4.body.count, version: rec.body.record && rec.body.record.version }));
  const profDocs = await (async () => { await profile(cleo); return cleo.evaluate(() => (document.querySelector('[data-profile-documents]') || {}).innerText || ''); })();
  note('passport-on-my-profile', /Passport/i.test(profDocs) && /Replaced · passport\.pdf/i.test(profDocs) && !/Reviewed/i.test(profDocs), profDocs.replace(/\s+/g, ' ').slice(0, 160));
  /* ownership: the partner of the same party (Ben for Ada) and an unrelated guest cannot send for Cleo; a guest cannot read */
  const ben = await fresh(390); await signIn(ben, 'T002');
  const forge = (p, inv, gid) => p.evaluate(async ([inv, gid]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/document', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'image/jpeg', 'x-invitation': inv, 'x-guest': gid, 'x-kind': 'passport', 'x-filename': 'x.jpg' }, body: new Uint8Array([1, 2, 3, 4]) }); return r.status; }, [inv, gid]);
  const f1 = await forge(ben, 'INV-T001', 'T001'), f2 = await forge(ben, 'INV-T003', 'T003'), f3 = await forge(ben, 'INV-T002', 'T003');
  const guestRead = await ben.evaluate(async (key) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const out = {}; for (const p of ['/api/gr/document?key=' + encodeURIComponent(key), '/api/gr/documents?invitation=INV-T003', '/' + key, '/api/document']) { const r = await fetch(p, { headers: { 'x-siyl-auth': a.bearer } }); out[p.slice(0, 22)] = r.status + ' ' + (r.headers.get('content-type') || '').slice(0, 16); } return out; }, r2.key);
  note('passport-ownership-and-no-guest-read', f1 === 401 && f2 === 401 && f3 === 401 && Object.values(guestRead).every((v) => !/^200 (image|application\/pdf)/.test(v)) && Object.values(guestRead).filter((v) => /^401/.test(v)).length >= 2, JSON.stringify({ f1, f2, f3, guestRead }) + ' (the partner of the same party, an unrelated guest, a mismatched pair: all refused; no guest read route)');
  const stillTwo = await gr('/api/gr/documents?invitation=INV-T003'); note('passport-nothing-forged', stillTwo.body.count === 2 && (await gr('/api/gr/documents?invitation=INV-T001')).body.count === 0, JSON.stringify({ t003: stillTwo.body.count }));
  /* Guest Relations retrieval: the exact bytes through the Worker; no public URL */
  const dl = await fetch(O + '/api/gr/document?key=' + encodeURIComponent(r2.key), { headers: { 'x-gr-token': GR } }); const body = Buffer.from(await dl.arrayBuffer());
  const dl1 = await fetch(O + '/api/gr/document?key=' + encodeURIComponent(r1.key), { headers: { 'x-gr-token': GR } }); const body1 = Buffer.from(await dl1.arrayBuffer());
  note('gr-retrieval-streams-exact-bytes', dl.status === 200 && dl.headers.get('content-type') === 'application/pdf' && Buffer.compare(body, PDF) === 0 && dl.headers.get('cache-control') === 'private, no-store' && /attachment; filename="passport\.pdf"/.test(dl.headers.get('content-disposition')) && dl1.status === 200 && dl1.headers.get('content-type') === 'image/jpeg' && Buffer.compare(body1, JPEG) === 0, JSON.stringify({ status: dl.status, type: dl.headers.get('content-type'), bytes: body.length, disposition: dl.headers.get('content-disposition') }));
  const noToken = await fetch(O + '/api/gr/document?key=' + encodeURIComponent(r2.key)); const wrong = await fetch(O + '/api/gr/document?key=' + encodeURIComponent(r2.key), { headers: { 'x-gr-token': 'x' } }); const pub = await fetch(O + '/' + r2.key);
  note('gr-retrieval-token-only-no-public-url', noToken.status === 401 && wrong.status === 401 && !(pub.status === 200 && /pdf/.test(pub.headers.get('content-type') || '')), JSON.stringify({ noToken: noToken.status, wrong: wrong.status, pub: pub.status + ' ' + (pub.headers.get('content-type') || '') }));
  await cleo.context().close(); await other.context().close(); await ben.context().close();
}

note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 1));
await b.close(); await wk.close();
const failed = R.filter((r) => !r.ok); console.log((failed.length ? 'FAILED: ' + failed.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed'));
process.exit(failed.length ? 1 : 0);
