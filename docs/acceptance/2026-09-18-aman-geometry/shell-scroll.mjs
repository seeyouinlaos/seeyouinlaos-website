/* STICKY SHELL REGRESSION (Owner, 18 Sep 2026): on every long guest-facing page, after a deep scroll, the header row
   (Menu · wordmark · Bag) AND the account-access row (signed out: Open your invitation · signed in: My Trip · My Bag ·
   My Profile · Sign out) are inside the viewport, and nothing scrolls underneath them. Exits 1 on any failure.
     node docs/acceptance/2026-09-18-aman-geometry/shell-scroll.mjs <origin> <scratchpad-with-synth-codes> [widths…] */
import fs from 'node:fs';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2].replace(/\/$/, ''), N = process.argv[3]; const WIDTHS = (process.argv.slice(4).length ? process.argv.slice(4) : ['320', '390', '834', '1440']).map(Number);
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const PUBLIC = ['index.html', 'destination.html', 'accommodation.html', 'journeys.html', 'voyage.html', 'experiences.html'];
const PRIVATE = ['your-journey.html', 'cart.html', 'review.html', 'about-you.html', 'wedding.html', 'wedding-preparation.html', 'room.html?stay=souphattra&room=heritage', 'transport.html?id=c86', 'tickets.html'];
const b = await chromium.launch(); let fails = 0, checks = 0;
const check = async (p, page, expect) => {
  for (const frac of [0.35, 0.7, 1]) {
    await p.evaluate((f) => window.scrollTo(0, Math.max(0, (document.body.scrollHeight - innerHeight) * f)), frac); await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const h = document.querySelector('header.hd'); if (!h) return { missing: 'header' };
      const hb = h.getBoundingClientRect();
      const row = [...h.querySelectorAll('button, a, .bd, .brand')].map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 24), r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0);
      const inView = row.map((x) => ({ t: x.t, ok: x.r.top >= -0.5 && x.r.bottom <= innerHeight + 0.5 }));
      const under = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(hb.bottom) + 3);
      const covered = under ? (h.contains(under) ? 'shell' : under.tagName) : 'none';
      return { top: Math.round(hb.top), h: Math.round(hb.height), items: inView, covered, scrollY: Math.round(scrollY), vh: innerHeight };
    });
    checks++;
    const labels = m.items ? m.items.map((i) => i.t) : [];
    const missing = expect.filter((e) => !labels.some((l) => l.toLowerCase().includes(e.toLowerCase())));
    const hidden = (m.items || []).filter((i) => !i.ok).map((i) => i.t);
    const bad = m.missing || m.top !== 0 || missing.length || hidden.length || m.covered === 'shell';
    if (bad) { fails++; console.log('FAIL', page, 'at', Math.round(frac * 100) + '%', JSON.stringify({ top: m.top, h: m.h, missing, hidden, covered: m.covered, scrollY: m.scrollY })); }
  }
};
for (const W of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 1000 }, deviceScaleFactor: 1, isMobile: W <= 390, hasTouch: W <= 390 }); const p = await ctx.newPage();
  for (const page of PUBLIC) { await p.goto(O + '/' + page, { waitUntil: 'load' }); await p.waitForTimeout(1200); await check(p, W + ' signed-out ' + page, ['Menu', 'see you in laos', 'My Bag', 'Open your invitation']); }
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes.T002); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', 'ben.test@example.org'); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0002'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1200);
  for (const page of [...PUBLIC, ...PRIVATE]) { await p.goto(O + '/' + page, { waitUntil: 'load' }); await p.waitForTimeout(1400); await check(p, W + ' signed-in ' + page, ['Menu', 'see you in laos', 'My Bag', 'My Trip', 'My Profile', 'Sign out']); }
  await ctx.close();
}
await b.close();
console.log(`STICKY SHELL: ${checks} checks · ${fails} failures`);
process.exit(fails ? 1 : 0);
