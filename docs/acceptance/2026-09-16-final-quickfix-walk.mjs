/* CROSS-DEVICE WALK (Owner, 16 Sep 2026 · FINAL QUICKFIX). Device A: sign in, contact, About You answers, travel, a
   room, wedding attendance, SAVE MY PROGRESS → SAVED; hard refresh → all remains. Device B (a fresh browser context):
   the same code → the same contact, answers, travel, stay, room, bag, steps. Change one answer on B, save; A reloads
   → the change appears. No code is printed. Requires a controlled guest (GUEST env) and a running origin.
     node docs/acceptance/2026-09-16-final-quickfix-walk.mjs <origin> <outDir> */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ROOT = '/Users/thongantang/peoject.claude.skill.canva/seeyouinlaos-website';
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const GUEST = process.env.GUEST || 'G002', EMAIL = process.env.EMAIL || 'sam.sandbox@example.org', PHONE = process.env.PHONE || '+66 81 000 0000';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code'); return r[5]; };
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const browser = await chromium.launch();
const fresh = async () => { const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); if (process.env.DEBUG) p.on('request', (r) => { if (/api\/draft/.test(r.url()) && r.method() !== 'GET') { let k = ''; try { const j = JSON.parse(r.postData()); k = Object.entries(j.keys || {}).map(([a, v]) => a + ':' + v.length).join(',') + ' reason=' + j.reason; } catch (e) {} console.log('  REQ', r.method(), k, 'page=' + p.url().replace(O, '')); } }); return p; };
const signIn = async (p) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', tok(GUEST)); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); };
const saved = async (p) => { await p.waitForFunction(() => { const s = document.querySelector('.prep-save-state'); return !!(s && /^Saved · /.test(s.textContent)); }, null, { timeout: 20000 }); return (await p.$eval('.prep-save-state', (e) => e.textContent)); };
const settle = (p) => p.waitForTimeout(1800);
const readAll = async (p) => p.evaluate(() => { const j = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }; const g = j('siyl.guest') || {}, me = g.guests ? Object.values(g.guests)[0] : null; return { contact: g.contact || null, allergy: (me && me.allergy && me.allergy.answer) || null, profile: me && me.profile || null, bag: (j('siyl.bag') || []).map((x) => x.id + (x.room ? ':' + x.room + (x.unit ? '/' + x.unit : '') : '')), temple: j('siyl.temple'), dress: !!(me && me.submitted && me.submitted.dressAck) }; });

/* ---- DEVICE A ---- */
const A = await fresh(); await signIn(A);
await A.goto(O + '/invitation.html', { waitUntil: 'load' }); await A.waitForSelector('input[data-c="email"]', { timeout: 20000 });
await A.fill('input[data-c="email"]', EMAIL); await A.dispatchEvent('input[data-c="email"]', 'change'); await A.fill('input[data-c="phone"]', PHONE); await A.dispatchEvent('input[data-c="phone"]', 'change'); await settle(A);
/* travel: the train; then every open stage decided (the steps open in order) */
await A.goto(O + '/your-journey.html', { waitUntil: 'load' }); await A.waitForSelector('[data-choose-flat="train"], [data-rm="train"]', { timeout: 20000 });
if (await A.$('[data-choose-flat="train"]')) { await A.click('[data-choose-flat="train"]'); await settle(A); }
/* a room: U Sathorn Room B */
await A.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' });
await A.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|B"]', { timeout: 20000 }); await A.click('[data-rooms-box="bkk-stay"] [data-join$="|B"]');
await A.waitForFunction(() => /Your place is held · Room B/.test((document.querySelector('[data-av="bkk-stay"]') || {}).textContent || ''), null, { timeout: 20000 }); await settle(A);
await A.goto(O + '/your-journey.html', { waitUntil: 'load' }); await A.waitForTimeout(800); await A.evaluate(() => { window.SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (window.SIYL_JOURNEY.state(s) === 'open') window.SIYL_JOURNEY.skip(s.key, true); }); }); await settle(A);
/* the wedding answers, the dress acknowledgement */
await A.goto(O + '/wedding.html', { waitUntil: 'load' }); await A.waitForTimeout(800); for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await A.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await A.waitForTimeout(250); }
if (await A.$('#sangkhathan [data-off="no"]')) await A.click('#sangkhathan [data-off="no"]'); await settle(A);
await A.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await A.waitForTimeout(600); await A.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await settle(A);
/* the seats (the seating engine — server-side already) */
const SEATS = process.env.SEATS ? JSON.parse(process.env.SEATS) : { ceremony: 'C-R-05-02', dinner: 'D-T-05' };
const seatRes = await A.evaluate(async (S) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const base = (location.hostname.includes('workers.dev') || /^(localhost|127)/.test(location.hostname) ? '' : 'https://seeyouinlaos-website.suthep-hrg.workers.dev'); const out = {}; for (const ev of ['ceremony', 'dinner']) { const r = await fetch(base + '/api/seating/select', { method: 'POST', headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, event: ev, seatId: S[ev], name: 'Guest' }) }); out[ev] = (await r.json()).ok; } return out; }, SEATS);
console.log('seats', JSON.stringify(seatRes));
console.log('steps before About You:', JSON.stringify(await A.evaluate(() => SIYL_GUEST.steps().map((s) => s.key + ':' + s.state + (s.missing && s.missing.length ? '(' + s.missing.map((m) => m.key).join(',') + ')' : '')))));
/* About You */
await A.goto(O + '/about-you.html', { waitUntil: 'load' }); await A.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await A.click('[data-allergy="no"]');
for (const [k, v] of [['coffeetea', 'Oolong, no milk'], ['treat', 'Mango sticky rice'], ['drink', 'Coconut water'], ['avoid', 'Nothing']]) { const el = await A.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } }
await settle(A);
/* SAVE MY PROGRESS */
await A.click('[data-save-progress]'); const sA = await saved(A); note('A-saved', /^Saved · \d\d:\d\d$/.test(sA), sA);
const before = await readAll(A);
await A.reload({ waitUntil: 'load' }); await A.waitForTimeout(2500);
const afterReload = await readAll(A); note('A-refresh-keeps', JSON.stringify(before) === JSON.stringify(afterReload), 'after a hard refresh: ' + JSON.stringify(afterReload).slice(0, 160));
await A.screenshot({ path: path.join(OUT, 'device-a-saved.png') });

/* ---- DEVICE B: a fresh browser ---- */
const B = await fresh(); await signIn(B); await B.goto(O + '/about-you.html', { waitUntil: 'load' }); await B.waitForTimeout(3000);
const onB = await readAll(B);
note('B-contact', onB.contact && onB.contact.email === EMAIL && onB.contact.phone === PHONE, JSON.stringify(onB.contact));
note('B-answers', onB.profile && onB.profile.coffeetea === 'Oolong, no milk' && onB.profile.treat === 'Mango sticky rice' && onB.allergy === 'no', JSON.stringify({ allergy: onB.allergy, profile: onB.profile }));
note('B-bag', JSON.stringify(onB.bag) === JSON.stringify(before.bag) && onB.bag.some((x) => /^train/.test(x)) && onB.bag.some((x) => /u-sathorn-superior-garden\/B$/.test(x)), JSON.stringify(onB.bag));
note('B-wedding', JSON.stringify(onB.temple) === JSON.stringify(before.temple), JSON.stringify(onB.temple).slice(0, 120));
const stepsB = await B.evaluate(() => (window.SIYL_GUEST && SIYL_GUEST.steps ? SIYL_GUEST.steps().map((s) => s.key + ':' + s.state) : null));
const stepsA = await A.evaluate(() => (window.SIYL_GUEST && SIYL_GUEST.steps ? SIYL_GUEST.steps().map((s) => s.key + ':' + s.state) : null));
note('B-steps', JSON.stringify(stepsA) === JSON.stringify(stepsB), JSON.stringify(stepsB));
const roomB = await B.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch((location.hostname.includes('workers.dev') || /^(localhost|127)/.test(location.hostname) ? '' : 'https://seeyouinlaos-website.suthep-hrg.workers.dev') + '/api/rooms/mine', { headers: { 'x-siyl-auth': a.bearer } }); return (await r.json()).mine; });
note('B-room-engine', roomB && roomB['bkk-stay'] && roomB['bkk-stay'].key === 'bkk-stay/u-sathorn-superior-garden' && roomB['bkk-stay'].label === 'B', JSON.stringify(roomB));
const seatsB = await B.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const base = (location.hostname.includes('workers.dev') || /^(localhost|127)/.test(location.hostname) ? '' : 'https://seeyouinlaos-website.suthep-hrg.workers.dev'); const r = await fetch(base + '/api/seating/mine?invitation=' + a.invitationId, { headers: { 'x-siyl-auth': a.bearer } }); const m = (await r.json()).mine; return { ceremony: m.ceremony[a.guestId] || null, dinner: m.dinner[a.guestId] || null }; });
note('B-seats-engine', seatsB.ceremony === SEATS.ceremony && seatsB.dinner === SEATS.dinner, JSON.stringify(seatsB));
await B.screenshot({ path: path.join(OUT, 'device-b-synced.png') });
/* change one answer on B, save */
await B.goto(O + '/about-you.html', { waitUntil: 'load' }); await B.waitForSelector('textarea[data-q="drink"]', { timeout: 20000 });
const ta = await B.$('textarea[data-q="drink"]'); await ta.fill('Fresh lime soda'); await ta.dispatchEvent('change'); await settle(B);
await B.click('[data-save-progress]'); const sB = await saved(B); note('B-saved', /^Saved · /.test(sB), sB);
/* A reloads → the change appears */
await A.goto(O + '/about-you.html', { waitUntil: 'load' }); await A.waitForTimeout(3000);
const backA = await readAll(A); note('A-sees-B-change', backA.profile && backA.profile.drink === 'Fresh lime soda', JSON.stringify(backA.profile));
const stateWords = await A.$eval('.prep-state', (e) => e.textContent); note('A-state-words', /saved as draft/i.test(stateWords), stateWords);
await browser.close();
fs.writeFileSync(path.join(OUT, 'cross-device.json'), JSON.stringify({ at: new Date().toISOString(), origin: O, guest: GUEST, results: R }, null, 1));
console.log(R.every((x) => x.ok) ? 'CROSS-DEVICE: PASS' : 'CROSS-DEVICE: FAIL');
process.exit(R.every((x) => x.ok) ? 0 : 1);
