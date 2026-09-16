/* SUBMISSION + UPDATE + REMOVE (Owner, 16 Sep 2026 · FINAL QUICKFIX) — after the cross-device walk left a controlled
   guest with a complete journey. Review & Send → SENT (three facts, reference, both emails accepted); change one
   selection → CHANGES SAVED · NOT YET SENT; Send Updated Journey → the same reference, version 2, both emails accepted,
   hasUnsentChanges false. REMOVE FROM YOUR JOURNEY on the U Sathorn stay: the place is released, availability rises,
   never FULLY BOOKED; select / remove three times returns the exact baseline. No code is printed.
     node docs/acceptance/2026-09-16-final-quickfix-submit.mjs <origin> <outDir> */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ROOT = '/Users/thongantang/peoject.claude.skill.canva/seeyouinlaos-website';
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const GUEST = process.env.GUEST || 'G002';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code'); return r[5]; };
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const settle = () => p.waitForTimeout(1800);
await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', tok(GUEST)); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
await p.waitForTimeout(2500);
const api = (path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const base = (location.hostname.includes('workers.dev') || /^(localhost|127)/.test(location.hostname) ? '' : 'https://seeyouinlaos-website.suthep-hrg.workers.dev'); const r = await fetch(base + path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); return r.json(); }, [path, init]);
/* complete About You */
await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]');
for (const [k, v] of [['coffeetea', 'Oolong'], ['treat', 'Mango sticky rice'], ['drink', 'Fresh lime soda'], ['avoid', 'Nothing'], ['film', 'Lost in Translation'], ['music', 'Sigur Rós']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } }
const pa = await p.$('[data-photo-ack]'); if (pa) { const checked = await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'); if (!checked) await pa.click(); }
await settle();
/* Review & Send */
await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForSelector('#send', { timeout: 20000 }); await p.waitForTimeout(2500);
const st0 = await p.$eval('#srvstate', (e) => e.textContent); note('state-draft', /saved as draft/i.test(st0), st0);
await p.click('#send'); await p.waitForSelector('#mailbox[data-mail]:not([data-mail=""])', { timeout: 40000 }); await p.waitForTimeout(1500);
const m1 = await p.evaluate(() => ({ l: document.getElementById('mail-l').textContent, m: document.getElementById('mail-msg').innerText, state: document.getElementById('srvstate').textContent, btn: document.getElementById('send').textContent, done: document.getElementById('donemsg').textContent }));
note('sent-facts', /✓ Journey saved/.test(m1.m) && /✓ Sent to Guest Relations/.test(m1.m) && /✓ Confirmation email sent to /.test(m1.m) && /Reference: SYL-/.test(m1.m) && /Sent: /.test(m1.m), m1.m.replace(/\n/g, ' | '));
note('state-sent', /Sent to Guest Relations · reference SYL-/.test(m1.state) && m1.btn === 'Sent to Guest Relations', m1.state + ' · ' + m1.btn);
await p.screenshot({ path: path.join(OUT, 'sent.png') });
const d1 = await api('/api/draft'); note('server-sent', d1.submission.submissionStatus === 'sent' && !d1.submission.hasUnsentChanges && d1.submission.version === 1, JSON.stringify(d1.submission));
const ref = d1.submission.submissionId;
/* change one selection: the room → Room C */
await p.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' }); await p.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|C"]', { timeout: 20000 }); await p.click('[data-rooms-box="bkk-stay"] [data-join$="|C"]');
await p.waitForFunction(() => /Your place is held · Room C/.test((document.querySelector('[data-av="bkk-stay"]') || {}).textContent || ''), null, { timeout: 20000 }); await settle();
const d2 = await api('/api/draft'); note('changes-not-sent', d2.submission.submissionStatus === 'changes-not-sent' && d2.submission.hasUnsentChanges && d2.submission.submissionId === ref, JSON.stringify(d2.submission));
await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('.prep-state', { timeout: 20000 }); await p.waitForTimeout(2500);
const w2 = await p.evaluate(() => ({ state: document.querySelector('.prep-state').textContent, cta: (document.querySelector('.prep-send-upd') || {}).textContent || '' }));
note('shell-words-changed', /CHANGES SAVED · NOT YET SENT TO GUEST RELATIONS/.test(w2.state) && /Send updated journey/i.test(w2.cta), w2.state + ' · ' + w2.cta);
await p.screenshot({ path: path.join(OUT, 'changes-not-sent.png') });
/* Send Updated Journey */
await p.click('.prep-send-upd'); await p.waitForSelector('#send', { timeout: 20000 }); await p.waitForTimeout(2500);
const b2 = await p.$eval('#send', (e) => e.textContent); note('btn-send-updated', b2 === 'Send updated journey', b2);
await p.click('#send'); await p.waitForSelector('#mailbox[data-mail]:not([data-mail=""])', { timeout: 40000 }); await p.waitForTimeout(1500);
const m2 = await p.evaluate(() => ({ m: document.getElementById('mail-msg').innerText, state: document.getElementById('srvstate').textContent }));
note('updated-facts', /✓ Changes saved/.test(m2.m) && /✓ Updated journey sent to Guest Relations/.test(m2.m) && /✓ Confirmation email sent to /.test(m2.m) && m2.m.includes('Reference: ' + ref), m2.m.replace(/\n/g, ' | '));
const d3 = await api('/api/draft'); note('server-updated', d3.submission.submissionStatus === 'sent' && !d3.submission.hasUnsentChanges && d3.submission.version === 2 && d3.submission.submissionId === ref && d3.submission.mail && d3.submission.mail.guestMailStatus === 'accepted' && d3.submission.mail.ownerMailStatus === 'accepted', JSON.stringify(d3.submission));
note('state-updated-words', /version 2/.test(m2.state), m2.state);
await p.screenshot({ path: path.join(OUT, 'updated.png') });

/* REMOVE FROM YOUR JOURNEY: the U Sathorn stay — release, availability up, never FULLY BOOKED; ×3 back to baseline */
const avail = async () => { const v = await api('/api/rooms/read'); const s = v.summary['bkk-stay/u-sathorn-superior-garden']; return { rooms: s.remainingRooms, places: s.remainingPlaces, soldOut: s.soldOut, mine: v.mine['bkk-stay'] || null }; };
const a0 = await avail(); note('before-remove', a0.mine && a0.mine.label === 'C' && a0.places === 11 && !a0.soldOut, JSON.stringify(a0));
for (let i = 1; i <= 3; i++) {
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForSelector('[data-rm="bkk-stay"]', { timeout: 20000 }); await p.click('[data-rm="bkk-stay"]'); await settle();
  const a1 = await avail(); note('removed-' + i, !a1.mine && a1.places === 12 && a1.rooms === 6 && a1.soldOut === false, JSON.stringify(a1));
  const words = await p.evaluate(() => [...document.querySelectorAll('.p-stay')].map((c) => (c.querySelector('h3') || {}).textContent + ': ' + [...c.querySelectorAll('.t-l1')].map((e) => e.textContent).join(' / ') + ' / ' + (c.querySelector('.p-act') || {}).textContent));
  note('words-after-remove-' + i, words.some((w) => /U Sathorn/.test(w) && /6 rooms · 12 places available/.test(w) && /Select this stay/.test(w)) && !words.some((w) => /Fully booked/.test(w)), JSON.stringify(words));
  await p.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' }); await p.waitForSelector('[data-rooms-box="bkk-stay"] [data-join$="|C"]', { timeout: 20000 }); await p.click('[data-rooms-box="bkk-stay"] [data-join$="|C"]');
  await p.waitForFunction(() => /Your place is held · Room C/.test((document.querySelector('[data-av="bkk-stay"]') || {}).textContent || ''), null, { timeout: 20000 }); await settle();
  const a2 = await avail(); note('reselected-' + i, a2.mine && a2.mine.label === 'C' && a2.places === 11, JSON.stringify(a2));
}
const d4 = await api('/api/draft'); note('after-changes-state', d4.submission.hasUnsentChanges === false && d4.submission.version === 2, 'the same room again → no change to send: ' + JSON.stringify(d4.submission).slice(0, 120));
await browser.close();
fs.writeFileSync(path.join(OUT, 'submit-update-remove.json'), JSON.stringify({ at: new Date().toISOString(), origin: O, guest: GUEST, reference: ref, results: R }, null, 1));
console.log(R.every((x) => x.ok) ? 'SUBMIT · UPDATE · REMOVE: PASS' : 'SUBMIT · UPDATE · REMOVE: FAIL');
process.exit(R.every((x) => x.ok) ? 0 : 1);
