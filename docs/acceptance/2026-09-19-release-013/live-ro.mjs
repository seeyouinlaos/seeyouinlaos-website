/* RELEASE 013 · read-only live acceptance on the canonical Worker (nothing written; the real register only).
     node docs/acceptance/2026-09-19-release-013/live-ro.mjs <origin> <outDir>
   The Guest Relations verification of the reset result reads through the GR token in src/gr-token.private.txt (never printed). */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const ROOT = new URL('../../../', import.meta.url).pathname;
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const st = async (p) => (await fetch(O + p, { cache: 'no-store' })).status;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/* the register as served = the repository's (85 active invitations, the hosts flagged) */
const reg = await (await fetch(O + '/register/auth-index.json', { cache: 'no-store' })).json(); const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'register/auth-index.json'), 'utf8'));
note('register-live-is-the-repository', JSON.stringify(reg) === JSON.stringify(local) && Object.keys(reg.entries).length === 85 && Object.values(reg.entries).filter((e) => e.h === 1).length === 2, Object.keys(reg.entries).length + ' entries, 2 hosts, byte-equal to the repository');
const enc = Buffer.from(await (await fetch(O + '/register/invitations.enc.json', { cache: 'no-store' })).arrayBuffer());
note('bundle-live-is-the-repository', sha(enc) === sha(fs.readFileSync(path.join(ROOT, 'register/invitations.enc.json'))) && JSON.parse(enc.toString()).length === 85, JSON.parse(enc.toString()).length + ' encrypted invitations');
/* the clip as served */
const clip = Buffer.from(await (await fetch(O + '/assets/video/bangkok-card.mp4', { cache: 'no-store' })).arrayBuffer());
note('clip-live-is-the-repository', sha(clip) === sha(fs.readFileSync(path.join(ROOT, 'assets/video/bangkok-card.mp4'))) && clip.length === 2529071 && clip.subarray(0, 4096).toString('latin1').includes('moov'), clip.length + ' bytes, faststart');
/* the API is private; the retired surfaces stay retired; the reset route is Guest Relations' alone */
note('api-private', (await fetch(O + '/api/draft', { headers: { 'x-siyl-auth': 'synthetic-bearer-that-does-not-exist' } })).status === 401, '/api/draft with a made-up bearer → 401');
note('reset-route-guest-relations-only', (await fetch(O + '/api/gr/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"dryRun":true}' })).status === 401 && (await fetch(O + '/api/gr/record?invitation=INV-G001')).status === 401, 'no token → 401 on /api/gr/reset and /api/gr/record');
note('github-pages-404', (await fetch('https://seeyouinlaos.github.io/seeyouinlaos-website/', { cache: 'no-store' }).then((r) => r.status).catch(() => 'unreachable')) === 404 && (await st('/_config.yml')) === 404 && (await st('/CNAME')) === 404, 'github.io 404 · _config.yml 404 · CNAME 404');
/* the browser: the clip on the destination card, the header, the gated private pages, widths, iPhone Safari */
const b = await chromium.launch(); const errors = [];
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: w <= 390, hasTouch: w <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(w + ' ' + p.url() + ' ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(w + ' ' + p.url() + ' ' + m.text()); }); return p; };
{
  const p = await fresh(390); await p.goto(O + '/index.html', { waitUntil: 'load' });
  const early = await p.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const r = a.getBoundingClientRect(); return { bg: /001-bangkok-chao-phraya/.test(a.style.backgroundImage), src: a.getAttribute('data-video'), w: Math.round(r.width), h: Math.round(r.height) }; });
  await p.evaluate(() => document.querySelector('.aslide .am[href*="bangkok"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(4000);
  const late = await p.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const r = a.getBoundingClientRect(); const v = a.querySelector('video.am-clip'); return { state: a.getAttribute('data-video-state'), playing: !!(v && !v.paused && v.currentTime > 0.2), muted: !!(v && v.muted), inline: !!(v && v.hasAttribute('playsinline')), loop: !!(v && v.loop), controls: !!(v && v.controls), opacity: v ? getComputedStyle(v).opacity : null, w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2), src: v && v.querySelector('source') ? v.querySelector('source').src : null }; });
  await p.screenshot({ path: path.join(OUT, '390-bangkok-clip.png') });
  note('clip-plays-live', early.bg && early.src === 'assets/video/bangkok-card.mp4' && late.state === 'playing' && late.playing && late.muted && late.inline && late.loop && !late.controls && late.opacity === '1' && late.w === early.w && late.h === early.h && Math.abs(late.ratio - 1.25) < 0.03 && /\/assets\/video\/bangkok-card\.mp4$/.test(late.src || ''), JSON.stringify(late));
  const calm = await fresh(390, { reducedMotion: 'reduce' }); await calm.goto(O + '/index.html', { waitUntil: 'load' }); await calm.waitForTimeout(1500);
  const cs = await calm.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); return { state: a.getAttribute('data-video-state'), video: !!a.querySelector('video'), bg: /001-bangkok/.test(a.style.backgroundImage) }; }); await calm.context().close();
  note('clip-reduced-motion-live', cs.state === 'still' && !cs.video && cs.bg, JSON.stringify(cs));
  const hd = await p.evaluate(() => { const h = document.querySelector('header.hd'); const r = h.getBoundingClientRect(); const bag = h.querySelector('a.bag'), menu = h.querySelector('.hb, #menu-open'), brand = h.querySelector('.bd, .brand'); const c = (e) => e ? Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2) : -1; return { h: Math.round(r.height), text: h.innerText.replace(/\s+/g, ' ').trim(), under: !!h.querySelector('.hd-access, [data-account]'), order: c(menu) < c(brand) && c(brand) < c(bag), brandCentred: Math.abs(c(brand) - window.innerWidth / 2) < 40 }; });
  note('aman-header-live', hd.h <= 64 && !hd.under && hd.order && hd.brandCentred && hd.text === 'see you in laos.', JSON.stringify(hd) + ' (menu · wordmark · bag, no account row)');
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(2000); note('private-gated-live', /invitation/.test(p.url()) && /next=your-journey/.test(p.url()), p.url());
  await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); note('about-you-gated-live', /invitation/.test(p.url()), p.url());
  await p.context().close();
}
for (const w of [320, 834, 1440]) { const p = await fresh(w); const over = []; for (const f of ['index.html', 'destination.html', 'journeys.html', 'experiences.html', 'accommodation.html', 'invitation.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) over.push(f + ':' + ov); } note('width-' + w, over.length === 0, over.join(' | ') || 'six public pages: no horizontal overflow'); await p.context().close(); }
const wk = await webkit.launch(); const ip = await (await wk.newContext(devices['iPhone 13'])).newPage(); await ip.goto(O + '/index.html', { waitUntil: 'load' }); await ip.evaluate(() => document.querySelector('.aslide .am[href*="bangkok"]').scrollIntoView({ block: 'center' })); await ip.waitForTimeout(4000);
const wkv = await ip.evaluate(() => { const a = document.querySelector('.aslide .am[href*="bangkok"]'); const v = a.querySelector('video.am-clip'); return { state: a.getAttribute('data-video-state'), bg: /001-bangkok/.test(a.style.backgroundImage), playing: !!(v && !v.paused && v.currentTime > 0.2), inline: !!(v && v.hasAttribute('playsinline')), muted: !!(v && v.muted), ov: document.documentElement.scrollWidth - window.innerWidth }; });
await ip.screenshot({ path: path.join(OUT, 'iphone-bangkok-clip.png') }); await wk.close();
note('clip-iphone-safari-live', wkv.bg && wkv.ov === 0 && (wkv.state === 'playing' ? (wkv.playing && wkv.inline && wkv.muted) : wkv.state === 'still' || wkv.state === 'loading'), JSON.stringify(wkv) + ' (plays inline and muted, or the photograph stays — never black)');
note('console-errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'no script or console error on any visited live page');
await b.close();
/* Guest Relations, read only: zero guest-generated state after the reset; the fixed arrangement and the seating configuration intact */
const tokenFile = path.join(ROOT, 'src/gr-token.private.txt');
if (fs.existsSync(tokenFile)) {
  const gr = async (route, body) => { const r = await fetch(O + route, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-gr-token': fs.readFileSync(tokenFile, 'utf8').trim() }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const dry = await gr('/api/gr/reset', { dryRun: true });
  const plan = await gr('/api/rooms/plan'); let occ = 0, fixed = 0; for (const units of Object.values(plan.body.units || {})) for (const u of units) for (const o of (u.occupants || [])) { if (u.reservedFor && /Bride/.test(u.reservedFor) && /^G04[89]$/.test(o.guestId)) fixed++; else occ++; }
  const seats = await gr('/api/seating/plan'); let held = 0; const walk = (o) => { if (Array.isArray(o)) { o.forEach(walk); return; } if (o && typeof o === 'object') { if (o.guestId && o.seatId) held++; Object.values(o).forEach((v) => { if (v && typeof v === 'object') walk(v); }); } }; walk(seats.body.events || {});
  const journeys = await gr('/api/gr/journeys');
  note('reset-verified-zero-live', dry.status === 200 && dry.body.rooms.occupancies === 0 && dry.body.seating.holds === 0 && dry.body.drafts.had === 0 && dry.body.kv.keys.length === 0 && occ === 0 && fixed === 2 && held === 0 && seats.body.open === true && journeys.status === 200 && journeys.body.journeys.length === 0, JSON.stringify({ dryRun: { rooms: dry.body.rooms.occupancies, seats: dry.body.seating.holds, drafts: dry.body.drafts.had, kv: dry.body.kv.keys.length, actors: dry.body.drafts.actors }, plan: { guestHolds: occ, fixedPlaces: fixed }, seatHolds: held, seatingOpen: seats.body.open, journeysWithState: journeys.body.journeys.length }));
  fs.writeFileSync(path.join(OUT, 'reset-verification.json'), JSON.stringify({ at: new Date().toISOString(), dryRun: { mode: dry.body.mode, rooms: dry.body.rooms, seating: dry.body.seating, drafts: { actors: dry.body.drafts.actors, had: dry.body.drafts.had }, kvKeys: dry.body.kv.keys }, guestHolds: occ, fixedPlaces: fixed, seatHolds: held, seatingOpen: seats.body.open, seatingFrozen: seats.body.frozen, journeysWithState: journeys.body.journeys.length }, null, 1));
}
fs.writeFileSync(path.join(OUT, 'live-ro.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
