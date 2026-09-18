/* 008 — COPY AUDIT · the screens the P0 pass does not cover: the seat flow (Your seat → Seat held), Your tickets, the public
   wedding page's private pointer, the product page add state, the invitation entry, and both emails rendered at phone and
   desktop width. Isolated stage worker + synthetic guests (as docs/acceptance/2026-09-17-p0-empty-bag/shots.mjs).
     node docs/review/008-copy-audit/shots-extra.mjs <scratchpad> <outDir> */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import { composeGuestMail, composeOwnerMail } from '../../../src/mail-templates.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = 'http://127.0.0.1:8788', N = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const VP = { 320: { width: 320, height: 660 }, 390: { width: 390, height: 844 }, 834: { width: 834, height: 1112 }, 1440: { width: 1440, height: 900 } };
const b = await chromium.launch(); const R = [];
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const shot = async (p, name, w) => { const ov = await overflow(p); await p.screenshot({ path: path.join(OUT, name + '-' + w + '.png') }); R.push({ name, w, overflow: ov }); if (ov) console.log('OVERFLOW ' + name + ' @' + w); };
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1600); };
/* the emails, rendered as the guest's mail client would */
const REG = { channel: 'journey-shop', guestId: 'G777', totalUsd: 292, contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' },
  selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }, { id: 'bkk-stay', name: 'U Sathorn Bangkok', meta: '21 – 24 February 2027 · Superior Room With Garden View', price: 192, stay: 'sathorn', room: 'u-sathorn-superior-garden', breakfast: 'Breakfast included', unit: 'B', unitName: 'Room B' }, { id: 'sangkhathan', name: 'Sangkhathan Temple Offering', meta: 'Sunday, 28 February 2027 · Temple Ceremony', price: 15 }],
  templeCeremony: { guests: [{ guestId: 'G777', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Not joining' } }] },
  guestRecord: { partyName: 'Sam & Alex', dress: { all: true }, photo: { acknowledged: true }, guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, allergy: { answer: 'yes', details: 'Peanuts' }, profile: { coffeetea: 'Oolong', drink: 'Fresh lime soda' }, dress: { acknowledged: true, at: '2026-09-16T17:52:35.999Z', textVersion: '2026-09-09' } }] },
  documents: { guests: [{ guestId: 'G777', documents: [{ kind: 'passport', label: 'Passport', state: 'Not provided' }], publication: 'Given' }] }, seats: { ceremony: { G777: 'C-R-05-02' }, dinner: { G777: 'D-T-05' } } };
const rec = (extra) => ({ invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', registration: REG, recipient: { email: 'sam.example@example.org' }, rooms: { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'C', room: 'Room C', name: 'Superior Room With Garden View' } }, kind: 'initial', version: 1, submittedAt: '2026-09-16T17:52:41.404Z', lastSentAt: '2026-09-16T17:52:41.696Z', firstSentAt: '2026-09-16T17:52:41.404Z', ...(extra || {}) });
const mails = { 'email-guest-received': composeGuestMail(rec()).html, 'email-guest-updated': composeGuestMail(rec({ kind: 'update', version: 2, lastSentAt: '2026-09-16T18:10:03.000Z' })).html, 'email-guest-relations': composeOwnerMail(rec(), 'https://seeyouinlaos-website.suthep-hrg.workers.dev/register-landing.html').html };
for (const w of [390, 834]) { const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: w <= 390 ? 2 : 1 }); const p = await ctx.newPage(); for (const [name, html] of Object.entries(mails)) { await p.setContent(html, { waitUntil: 'load' }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name + '-' + w + '.png'), fullPage: true }); R.push({ name, w, overflow: false }); } await ctx.close(); }
for (const w of [390, 320, 834, 1440]) {
  const ctx = await b.newContext({ viewport: VP[w], deviceScaleFactor: w <= 390 ? 2 : 1, isMobile: w <= 390, hasTouch: w <= 390 }); const p = await ctx.newPage();
  await p.goto(O + '/voyage.html', { waitUntil: 'load' }); await p.evaluate(() => { const el = document.querySelector('.a-eyebrow'); const t = [...document.querySelectorAll('.a-eyebrow')].find((e) => /My Trip/.test(e.textContent)); if (t) t.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(600); await shot(p, 'public-wedding-private-pointer', w);
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForTimeout(1200); await shot(p, 'invitation-entry', w);
  await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org');
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await shot(p, 'invitation-signed-in', w);
  await p.goto(O + '/transport.html?id=c86', { waitUntil: 'load' }); await p.waitForSelector('#add', { timeout: 20000 }); await (await p.$('#add')).scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await shot(p, 'product-add', w);
  await p.click('#add'); await p.waitForTimeout(1200); await shot(p, 'product-added', w);
  await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.evaluate(() => { const b = document.querySelector('[data-stay-add], .add, .vw'); if (b) b.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500); await shot(p, 'the-journey-signed-in', w);
  /* the wedding answers, then the seats: tap a chair → Your seat → Confirm seat → Seat held */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.evaluate(() => { SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (SIYL_JOURNEY.state(s) === 'open') SIYL_JOURNEY.skip(s.key, true); }); }); await p.waitForTimeout(1500);
  await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', 'yes'], ['coffee', 'yes'], ['vows', 'yes'], ['dinner', 'yes']]) { await p.click('[data-e="' + k + '"] [data-ev="' + v + '"]'); await p.waitForTimeout(150); } if (await p.$('#sangkhathan [data-off="no"]')) await p.click('#sangkhathan [data-off="no"]'); await p.waitForTimeout(1200);
  await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(900);
  await p.waitForSelector('[aria-label="Ceremony seat F7, available"]', { timeout: 20000 }).catch(() => {});
  const chair = await p.$('[aria-label="Ceremony seat F7, available"]'); if (chair) { await chair.scrollIntoViewIfNeeded(); await chair.click(); await p.waitForTimeout(900); await shot(p, 'seat-your-seat', w); const cf = await p.$('.p-seatbar button, .p-seatbar .p-act'); if (cf) { await cf.click(); await p.waitForTimeout(1800); await p.evaluate(() => { const c = document.querySelector('[data-seatmap="ceremony"][data-state="confirmed"], .p-seatconf'); if (c) c.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500); await shot(p, 'seat-held', w); } }
  await p.goto(O + '/tickets.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); await shot(p, 'your-tickets', w);
  await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }; await fetch('/api/seating/release', { method: 'POST', headers: h, body: JSON.stringify({ invitationId: 'INV-T003', guestId: 'T003', event: 'ceremony' }) }).catch(() => {}); });
  await ctx.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'shots-extra.json'), JSON.stringify(R, null, 1));
console.log('extra shots:', R.length, '· overflow:', R.filter((r) => r.overflow).length);
