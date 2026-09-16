/* 003 · Edit 3 (Owner, 16 Sep 2026) — ACCESS, rendered.
     node docs/acceptance/2026-09-16-access/walk.mjs <origin> [outdir] [GUEST=G001]
   Signed out: every private surface hands over to the invitation page and comes back after the code;
   every page says NOT SIGNED IN · OPEN YOUR INVITATION; the menu's Journeys / Your Journey and the
   footer's Your Journey / Your tickets lead to the invitation page; the close CTA reads Open your
   invitation; an ADD on a public detail page hands over too; the fares of the catalogue cannot be
   reached. Signed in (a read-only session on production — nothing is written): the header names the
   guest; the same links open; Sign out from the header returns to the invitation page. Harudot sits
   under Cafés. Codes are read from the private register, never printed. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const GUEST = process.env.GUEST || 'G001';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = rows.find((c) => c[0] === GUEST && c[7] === 'ACTIVE')[5];
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d: String(d || '') }); console.log((ok ? 'PASS ' : 'FAIL ') + id + (d ? ' — ' + String(d).slice(0, 220) : '')); };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
const errs = [], writes = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (q) => { if (/\/api\//.test(q.url()) && !['GET', 'OPTIONS', 'HEAD'].includes(q.method())) writes.push(q.method() + ' ' + new URL(q.url()).pathname); });
const rel = () => p.url().replace(ORIGIN + '/', '');
const go = async (f) => { await p.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
const status = async () => (await p.evaluate(() => (document.querySelector('[data-access]') || {}).textContent || '')).replace(/\s+/g, ' ').trim();
const shot = async (n) => { if (OUT) await p.screenshot({ path: path.join(OUT, n + '.png') }); };

/* ---- signed out ---- */
for (const f of ['journeys.html', 'cart.html', 'tickets.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) {
  await go(f); note('OUT ' + f + ' → the invitation page with the way back', /^invitation(\.html)?\?open=1&next=/.test(rel()) && rel().includes(f.replace('.html', '')), rel());
}
for (const f of ['index.html', 'destination.html', 'accommodation.html', 'experiences.html', 'voyage.html', 'experience.html?id=bkk-suhring', 'room.html?stay=souphattra&room=heritage', 'transport.html?id=mu9646', 'marsilea.html', '1872.html', 'dress.html', 'invitation.html']) {
  await go(f); const s = await status();
  note('OUT ' + f + ' · the header says NOT SIGNED IN · OPEN YOUR INVITATION (' + rel() + ')', /Not signed in/.test(s) && /Open your invitation/.test(s) && !/open=1&next=/.test(rel()), s);
}
await go('destination.html'); await shot('out-destination');
const cta = await p.evaluate(() => { const a = document.querySelector('.a-cta'); return a ? a.textContent.trim() + ' → ' + a.getAttribute('href') : ''; });
note('OUT the close CTA reads Open your invitation and leads to the invitation page', cta === 'Open your invitation → invitation.html', cta);
const gl = await p.evaluate(() => [...document.querySelectorAll('a[data-private-href]')].map((a) => a.getAttribute('data-private-href') + '→' + a.getAttribute('href')));
note('OUT every link to a private surface on the page carries the invitation page as its target (' + gl.length + ' links)', gl.length >= 3 && gl.every((x) => /→invitation(\.html)?\?open=1&next=/.test(x)), gl.slice(0, 3).join(' | '));
await p.click('#menu-open, .hb'); await p.waitForTimeout(500); await p.click('.a-menu a:has-text("Journeys")'); await p.waitForTimeout(900);
note('OUT the menu\'s Journeys leads to the invitation page (with journeys as the way back)', /^invitation(\.html)?\?open=1&next=journeys/.test(rel()), rel());
await go('index.html'); await p.click('#menu-open, .hb'); await p.waitForTimeout(500); await p.click('.a-menu a:has-text("Your Journey")'); await p.waitForTimeout(900);
note('OUT the menu\'s Your Journey leads to the invitation page', /^invitation(\.html)?\?open=1&next=your-journey/.test(rel()), rel());
await go('voyage.html'); await p.evaluate(() => document.querySelector('footer a[href*="tickets"], footer a[data-private-href*="tickets"]').click()); await p.waitForTimeout(900);
note('OUT the footer\'s Your tickets leads to the invitation page', /^invitation(\.html)?\?open=1&next=tickets/.test(rel()), rel());
await go('index.html'); await p.evaluate(() => document.querySelector('header a.bag, header .hd-right a').click()); await p.waitForTimeout(900);
note('OUT the bag icon leads to the invitation page', /^invitation(\.html)?\?open=1&next=/.test(rel()), rel());
await go('transport.html?id=c86'); await p.click('#add'); await p.waitForTimeout(900);
note('OUT ADD on a public detail page hands over to the invitation page and remembers the page', /^invitation(\.html)?\?open=1&next=transport/.test(rel()), rel());
await go('experiences.html'); const cafes = await p.evaluate(() => { const secs = [...document.querySelectorAll('section, .a-sec')]; const out = {}; for (const s of secs) { const h = (s.querySelector('.a-eyebrow, h2, .eyebrow') || {}).textContent || ''; if (/Harudot/.test(s.textContent)) out[h.trim()] = true; } return Object.keys(out); });
const hcat = await p.evaluate(() => { const c = [...document.querySelectorAll('*')].find((e) => /^Harudot$/.test((e.textContent || '').trim()) && /^H[1-4]$/.test(e.tagName)); const card = c && c.closest('article, .a-card, .xcard, li, div'); return card ? card.textContent.replace(/\s+/g, ' ').slice(0, 160) : ''; });
note('OUT Harudot is listed as a café, not under Shopping & Places', /Caf/i.test(hcat) && !/Shopping & Places/i.test(hcat), hcat);
await shot('out-experiences');

/* ---- the way back: the code on the invitation page returns the guest to the page they wanted ---- */
await go('journeys.html'); await p.waitForSelector('.siyl-inv input', { timeout: 10000 }); await p.fill('.siyl-inv input', tok); await p.click('.siyl-inv .igo');
await p.waitForFunction(() => /journeys/.test(location.pathname), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200);
note('IN after the code, the guest is back on the journeys catalogue', /^journeys/.test(rel()), rel());
const sIn = await status(); await shot('in-journeys');
note('IN the header names the guest: SIGNED IN · <name> · YOUR JOURNEY · SIGN OUT', /Signed in ·/.test(sIn) && /Your Journey/.test(sIn) && /Sign out/.test(sIn), sIn);
for (const f of ['destination.html', 'voyage.html', 'cart.html']) { await go(f); const s = await status(); note('IN ' + f + ' · the header still names the guest', /Signed in ·/.test(s) && !/^invitation/.test(rel()), s + ' · ' + rel()); }
await go('index.html'); await p.evaluate(() => document.querySelector('header a.bag, header .hd-right a').click()); await p.waitForTimeout(900);
note('IN the bag icon opens the private journey (the bag, or the step the readiness engine asks for first) — never the code gate', /^(cart|your-journey|invitation\?from=)/.test(rel()) && !/open=1&next=/.test(rel()), rel());
await go('index.html'); await p.evaluate(() => document.querySelector('[data-access-out]').click()); await p.waitForTimeout(1200);
note('IN Sign out from the header returns to the invitation page and clears the session', /^invitation/.test(rel()) && (await p.evaluate(() => !localStorage.getItem('siyl.auth'))), rel());
await go('cart.html'); note('OUT again: the bag hands over once more', /^invitation(\.html)?\?open=1&next=cart/.test(rel()), rel());
note('Z no page errors · no write request', errs.length === 0 && writes.length === 0, errs.concat(writes).join(' | '));
await b.close();
const pass = R.filter((r) => r.ok).length;
console.log('\n' + pass + '/' + R.length + ' checks passed');
if (OUT) fs.writeFileSync(path.join(OUT, 'walk-results.json'), JSON.stringify({ origin: ORIGIN, guest: GUEST, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 2));
process.exit(pass === R.length ? 0 : 1);
