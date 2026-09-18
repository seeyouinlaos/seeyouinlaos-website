/* AMAN GEOMETRY · screenshots of the release surfaces at a width (default 390) against an origin (the stage, or the live
   Worker for BEFORE). Public: home, destinations, stays, The Journey, room detail, wedding. Private (synthetic guest on the
   stage only): My Trip, My Bag, Review & Send, plus the sticky shell after a deep scroll signed out and signed in.
     node docs/acceptance/2026-09-18-aman-geometry/shots.mjs <origin> <outDir> <tag> [width] [scratchpad-with-synth-codes] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const [O, OUT, TAG] = [process.argv[2].replace(/\/$/, ''), process.argv[3], process.argv[4]]; const W = parseInt(process.argv[5] || '390', 10); const N = process.argv[6]; fs.mkdirSync(OUT, { recursive: true });
const VP = { 320: { width: 320, height: 660 }, 390: { width: 390, height: 844 }, 834: { width: 834, height: 1112 }, 1440: { width: 1440, height: 900 } }[W] || { width: W, height: 844 };
const b = await chromium.launch(); const R = [];
const shot = async (p, name, opts) => { const ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); await p.screenshot({ path: path.join(OUT, `${name}-${TAG}-${W}.png`), fullPage: !!(opts && opts.full) }); R.push({ name, w: W, overflow: ov }); if (ov) console.log('OVERFLOW ' + name); };
const shell = async (p, name) => { /* the sticky shell after a deep scroll: header + access controls must be inside the viewport, content not covered */
  await p.evaluate(() => window.scrollTo(0, Math.max(0, document.body.scrollHeight * 0.55))); await p.waitForTimeout(500);
  const m = await p.evaluate(() => { const h = document.querySelector('header.hd'), a = document.querySelector('.hd-access'); const hb = h && h.getBoundingClientRect(), ab = a && a.getBoundingClientRect(); const links = [...document.querySelectorAll('.hd-access a, .hd-access button')].map((e) => ({ t: e.textContent.trim(), r: e.getBoundingClientRect() })).map((x) => ({ t: x.t, top: Math.round(x.r.top), bottom: Math.round(x.r.bottom), visible: x.r.top >= 0 && x.r.bottom <= innerHeight && x.r.width > 0 })); const under = document.elementFromPoint(innerWidth / 2, (hb ? hb.bottom : 0) + 2); return { scrollY: Math.round(scrollY), header: hb && { top: Math.round(hb.top), bottom: Math.round(hb.bottom), h: Math.round(hb.height) }, access: ab && { top: Math.round(ab.top), bottom: Math.round(ab.bottom) }, links, underShell: under ? under.tagName + '.' + under.className : null }; });
  R.push({ name: name + '-shell', w: W, shell: m }); console.log('SHELL ' + name + ' ' + JSON.stringify(m)); await shot(p, name + '-scrolled'); };
const ctx = await b.newContext({ viewport: VP, deviceScaleFactor: W <= 390 ? 2 : 1, isMobile: W <= 390, hasTouch: W <= 390 }); const p = await ctx.newPage();
for (const [name, url] of [['home', 'index.html'], ['destinations', 'destination.html'], ['stays', 'accommodation.html'], ['the-journey', 'journeys.html'], ['wedding', 'voyage.html'], ['room-detail', 'room.html?stay=souphattra&room=heritage']]) {
  await p.goto(O + '/' + url, { waitUntil: 'load' }); await p.waitForTimeout(1600); await shot(p, name); await shot(p, name + '-full', { full: true });
  if (name === 'home') await shell(p, 'signed-out');
  if (name === 'the-journey') { await p.evaluate(() => { const el = document.querySelector('.acar, .aslide, .pimg, h2'); if (el) el.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await shot(p, name + '-cards'); }
  if (name === 'stays') { await p.evaluate(() => { const el = document.querySelector('.acar'); if (el) el.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await shot(p, name + '-rail'); }
  if (name === 'home') { await p.evaluate(() => { const el = document.querySelector('.acar'); if (el) el.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await shot(p, name + '-rail'); await p.evaluate(() => { const el = document.querySelector('.a-pair'); if (el) el.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await shot(p, name + '-pair'); }
  if (name === 'room-detail') { await p.evaluate(() => { const el = document.querySelector('.others'); if (el) el.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await shot(p, name + '-others'); }
}
if (N) {
  const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes.T001); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2000);
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', 'ada.test@example.org'); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }; await fetch('/api/rooms/join', { method: 'POST', headers: h, body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', key: 'bkk-stay/u-sathorn-superior-garden', label: 'B', name: 'Ada' }) }); });
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await shot(p, 'my-trip'); await shot(p, 'my-trip-full', { full: true }); await shell(p, 'signed-in');
  await p.goto(O + '/room.html?stay=sathorn&room=u-sathorn-superior-garden', { waitUntil: 'load' }); await p.waitForTimeout(1800); await shot(p, 'room-detail-signed-in'); await shell(p, 'signed-in-room');
  await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); await shot(p, 'my-bag');
  await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2200); await shot(p, 'review'); await shell(p, 'signed-in-review');
  await p.goto(O + '/journeys.html', { waitUntil: 'load' }); await p.waitForTimeout(1600); await shell(p, 'signed-in-journey');
  await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }; await fetch('/api/rooms/leave', { method: 'POST', headers: h, body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage: 'bkk-stay' }) }); });
}
await b.close();
fs.writeFileSync(path.join(OUT, `shots-${TAG}-${W}.json`), JSON.stringify(R, null, 1));
console.log('shots:', R.filter((r) => !r.shell).length, '· overflow:', R.filter((r) => r.overflow).length);
