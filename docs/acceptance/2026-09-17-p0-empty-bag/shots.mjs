/* P0 · VISUAL QA SCREENSHOTS on the isolated stage worker at 320 / 390 / 834 / 1440 (PROJECT_MASTER_BRIEF §17–§19).
   Synthetic guests only. Screens: signed-out state, My Trip, My Bag empty, My Bag filled, Arranged for you (fixed host),
   room selection, Review & Send, My Profile, account navigation while scrolled, return-to-top, a failure state (remove offline).
     node docs/acceptance/2026-09-17-p0-empty-bag/shots.mjs <scratchpad> <outDir> */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = 'http://127.0.0.1:8788', N = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const VP = { 320: { width: 320, height: 660 }, 390: { width: 390, height: 844 }, 834: { width: 834, height: 1112 }, 1440: { width: 1440, height: 900 } };
const b = await chromium.launch(); const R = [];
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const shot = async (p, name, w, opts) => { const ov = await overflow(p); await p.screenshot({ path: path.join(OUT, name + '-' + w + '.png'), fullPage: !!(opts && opts.full) }); R.push({ name, w, overflow: ov }); if (ov) console.log('OVERFLOW ' + name + ' @' + w); };
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1600); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); return { status: r.status, body: await r.json() }; }, [path, init]);
for (const w of [390, 320, 834, 1440]) {
  const ctx = await b.newContext({ viewport: VP[w], deviceScaleFactor: w <= 390 ? 2 : 1, isMobile: w <= 390, hasTouch: w <= 390 }); const p = await ctx.newPage();
  /* signed out */
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await shot(p, 'signed-out-my-bag', w);
  await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await shot(p, 'signed-out-the-journey', w);
  /* the guest */
  await signIn(p, 'T001'); await contact(p, 'ada.test@example.org');
  /* start from an empty bag: release any hold and save the empty state */
  for (const stage of ['bkk-stay', 'prewed']) await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage }) });
  await p.evaluate(async () => { SIYL_BAG.set([]); await SIYL_DRAFT.flush('save'); }); await p.waitForTimeout(800);
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); await shot(p, 'my-trip', w);
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await shot(p, 'my-bag-empty', w);
  await p.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' }); await p.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|B"]', { timeout: 20000 }); await (await p.$('[data-av="bkk-stay"]')).scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await shot(p, 'room-selection', w);
  await p.click('[data-rooms-box="bkk-stay"] [data-join$="|B"]'); await p.waitForFunction(() => /Your place is held · Room B/.test((document.querySelector('[data-av="bkk-stay"]') || {}).textContent || ''), null, { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await shot(p, 'my-bag-filled', w);
  /* account navigation while scrolled down + return to top */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6)); await p.waitForTimeout(700); await shot(p, 'account-nav-scrolled', w);
  const top = await p.evaluate(() => { const t = document.querySelector('.jb-top'); return t ? getComputedStyle(t).visibility : 'missing'; }); if (top !== 'visible') console.log('TOP CONTROL not visible @' + w + ' (' + top + ')');
  await p.click('.jb-top'); await p.waitForFunction(() => window.scrollY < 40, null, { timeout: 4000 }).catch(() => {}); const y = await p.evaluate(() => window.scrollY); if (y > 40) console.log('TOP CONTROL did not return to top @' + w + ' (y=' + y + ')');
  /* failure state: remove while offline */
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await ctx.setOffline(true); await p.click('[data-remove="bkk-stay"]'); await p.waitForTimeout(2500); await shot(p, 'remove-failure-offline', w); await ctx.setOffline(false);
  /* review */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(800); await p.evaluate(() => { SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (SIYL_JOURNEY.state(s) === 'open') SIYL_JOURNEY.skip(s.key, true); }); }); await p.waitForTimeout(1200);
  await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(150); } if (await p.$('#sangkhathan [data-off="no"]')) await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(1200);
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(900);
  await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', event: 'ceremony', seatId: 'C-L-03-01', name: 'Ada' }) }); await api(p, '/api/seating/select', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', event: 'dinner', seatId: 'D-T-08', name: 'Ada' }) });
  await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['treat', 'Mango sticky rice'], ['drink', 'Fresh lime soda'], ['avoid', 'Nothing'], ['film', 'Lost in Translation'], ['music', 'Sigur Rós']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1400);
  await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); await shot(p, 'my-profile', w);
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500); await shot(p, 'review-and-send', w);
  await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage: 'bkk-stay' }) });
  await ctx.close();
  /* the fixed host */
  const hc = await b.newContext({ viewport: VP[w], deviceScaleFactor: w <= 390 ? 2 : 1, isMobile: w <= 390, hasTouch: w <= 390 }); const h = await hc.newPage();
  await signIn(h, 'G049'); await contact(h, 'groom.test@example.org');
  await h.goto(O + '/your-journey.html', { waitUntil: 'load' }); await h.waitForTimeout(2500); await shot(h, 'arranged-for-you-my-trip', w);
  await h.goto(O + '/cart.html', { waitUntil: 'load' }); await h.waitForTimeout(2200); await shot(h, 'arranged-for-you-my-bag', w);
  await hc.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(R, null, 1));
console.log('shots:', R.length, '· overflow:', R.filter((r) => r.overflow).length);
