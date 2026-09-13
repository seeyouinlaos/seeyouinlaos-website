/* VIEW ALL STEPS · deterministic navigation regression (Owner, 13 Sep 2026).
   Every row of the step index maps to exactly one destination, opens at the
   top of that step, the header names it, nothing scrolls astray, the index
   opens and closes without moving the page, the current row is inert, the
   browser's back works, switching identity changes nothing about navigation,
   and a hash deep link lands clear of the sticky bar — at every phone width
   and one desktop width, with zero page and console errors.
     node docs/acceptance/2026-09-11-final-run/steps-nav.mjs <origin> [out.json] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null;
const TOKEN = process.env.SIYL_TOKEN || (() => { const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8'); const row = csv.split(/\r?\n/).find((l) => /INV-002/.test(l)); return row.match(/[a-z0-9]{16}/)[0]; })();
const STEPS = [['01', 'invitation', 'Your Invitation'], ['02', 'your-journey', 'Your Journey'], ['03', 'wedding', 'The Wedding'], ['04', 'wedding-preparation', 'Wedding Preparation'], ['05', 'about-you', 'About You'], ['06', 'review', 'Review & Send']];
const WIDTHS = [320, 375, 390, 430, 1280];
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await chromium.launch();
const base = (u) => (new URL(u).pathname.split('/').pop() || '').replace(/\.html$/, '');
for (const W of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 900 }, isMobile: W < 800, hasTouch: W < 800 });
  const p = await ctx.newPage();
  /* on a local origin the production API refuses CORS — a local artefact that cannot occur on either live origin */
  const local = /127\.0\.0\.1|localhost/.test(ORIGIN);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !(local && /Access to fetch|ERR_FAILED|Failed to load resource/.test(m.text()))) errs.push(m.text().slice(0, 120)); });
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
  await p.click('#open'); await p.fill('.siyl-inv input', TOKEN); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
  const G = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth'))).guests; const P = G.find((g) => /peggy/i.test(g.preferredName)), S = G.find((g) => /steffie/i.test(g.preferredName));
  await p.click('.p-drawer [data-who="' + P.guestId + '"]'); await p.waitForTimeout(500);
  /* innerText drops the space after the bold counter; normalise "02 / 06Your Journey" */
  const header = async () => (await p.locator('.prep-bar .prep-step').innerText()).replace(/\s+/g, ' ').replace(/\/ 06(?=\S)/, '/ 06 ').trim();
  const barH = async () => p.evaluate(() => document.querySelector('.prep-bar').getBoundingClientRect().height);
  /* taps on the sticky bar and the index are at their on-screen position — force skips Playwright's own scroll-into-view, which would drag the page to the bar's static position (a harness artefact, not a guest's tap) */
  const tap = async (sel) => { const bb = await p.locator(sel).first().boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  const tapRow = async (loc) => { const bb = await loc.boundingBox(); await p.mouse.click(bb.x + Math.min(120, bb.width / 2), bb.y + bb.height / 2); };
  const open = async () => { await tap('.prep-bar .prep-all'); await p.waitForTimeout(350); };

  /* 1 · from every step, to every other step, via the index */
  let ok = true; const detail = [];
  for (const [fromN, fromFile] of STEPS) {
    await p.goto(ORIGIN + '/' + fromFile + '.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
    for (const [n, file, label] of STEPS) {
      if (file === fromFile) continue;
      await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(100);
      await open();
      const panel = await p.evaluate(() => { const l = document.querySelector('.prep-steps'); const r = l.getBoundingClientRect(); const bar = document.querySelector('.prep-bar').getBoundingClientRect(); return { visible: getComputedStyle(l).visibility === 'visible' && +getComputedStyle(l).opacity > .95, underBar: Math.abs(r.top - bar.bottom) < 2, expanded: document.querySelector('.prep-all').getAttribute('aria-expanded') }; });
      const row = p.locator('.prep-steps .prep-srow[data-step]', { hasText: label }).first();
      const [nav] = await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => null), tapRow(row)]);
      await p.waitForTimeout(350);
      const landed = base(p.url()) === file, y = await p.evaluate(() => Math.round(window.scrollY)), hd = await header(), inView = await p.evaluate(() => { const b = document.body.classList; return b.contains('p-in') && !b.contains('p-leave') && +getComputedStyle(document.querySelector('main.prep-page')).opacity > .95; });
      const good = panel.visible && panel.underBar && panel.expanded === 'true' && !!nav && landed && y === 0 && hd.startsWith(n + ' / 06 ' + label) && inView && !(await p.evaluate(() => document.body.classList.contains('prep-steps-open')));
      if (!good) { ok = false; detail.push(fromN + '→' + n + ':' + JSON.stringify({ panel, landed, y, hd, inView })); }
      await p.goto(ORIGIN + '/' + fromFile + '.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
    }
  }
  note('nav@' + W + ' every row → its own step, at the top, named in the bar', ok, ok ? '30 transitions · panel under the bar · scrollY 0 · index closed · page entered' : detail.slice(0, 3).join(' | '));

  /* 2 · open and close without navigating: the page does not move */
  await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(150);
  const y0 = await p.evaluate(() => Math.round(window.scrollY));
  await open(); const yOpen = await p.evaluate(() => Math.round(window.scrollY)); const openState = await p.evaluate(() => document.body.classList.contains('prep-steps-open') && getComputedStyle(document.querySelector('.prep-steps')).visibility === 'visible');
  await tap('.prep-bar .prep-all'); await p.waitForTimeout(350);
  const yClosed = await p.evaluate(() => Math.round(window.scrollY)); const closedState = await p.evaluate(() => !document.body.classList.contains('prep-steps-open') && getComputedStyle(document.querySelector('.prep-steps')).visibility === 'hidden' && document.querySelector('.prep-all').getAttribute('aria-expanded') === 'false');
  note('open/close@' + W + ' keeps the page where it was', y0 === 600 && yOpen === 600 && yClosed === 600 && openState && closedState, 'scrollY ' + y0 + ' → ' + yOpen + ' → ' + yClosed);
  /* the scrim closes it too */
  await open(); await p.mouse.click(W / 2, (W < 800 ? 844 : 900) - 20); await p.waitForTimeout(350);
  note('scrim@' + W + ' closes the index', await p.evaluate(() => !document.body.classList.contains('prep-steps-open')) && base(p.url()) === 'wedding', 'tap outside → closed, still on 03');

  /* 3 · the current row is inert: no navigation, index closes */
  await open(); const urlBefore = p.url();
  await tap('.prep-steps .prep-srow[aria-current="step"]'); await p.waitForTimeout(400);
  note('current@' + W + ' row closes the index without navigating', p.url() === urlBefore && await p.evaluate(() => !document.body.classList.contains('prep-steps-open') && Math.round(window.scrollY) === 600), 'same url · scrollY kept · closed');

  /* 4 · browser back returns to the step the guest came from */
  await open(); await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), tapRow(p.locator('.prep-steps .prep-srow[data-step="about"]'))]); await p.waitForTimeout(300);
  await p.goBack({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  note('back@' + W + ' returns to the previous step, whole', base(p.url()) === 'wedding' && await p.evaluate(() => document.body.classList.contains('p-in') && !document.body.classList.contains('p-leave') && +getComputedStyle(document.querySelector('main.prep-page')).opacity > .95 && !document.body.classList.contains('prep-steps-open')), 'back → 03, page visible, index closed');

  /* 5 · switching identity changes nothing about navigation */
  await tap('.prep-bar [data-switch]'); await p.waitForSelector('.p-drawer:not([hidden])'); await p.click('.p-drawer [data-who="' + S.guestId + '"]'); await p.waitForTimeout(500);
  await open(); await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), tapRow(p.locator('.prep-steps .prep-srow[data-step="review"]'))]); await p.waitForTimeout(350);
  note('switch@' + W + ' Steffie navigates the same way', base(p.url()) === 'review' && (await header()).startsWith('06 / 06 Review & Send') && /Continuing as Steffie/i.test(await p.locator('.prep-bar').innerText()) && (await p.evaluate(() => Math.round(window.scrollY))) === 0, (await header()) + ' · Steffie');

  /* 6 · a deep link lands clear of the sticky bar */
  await p.goto(ORIGIN + '/about-you.html#documents', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  const clear = await p.evaluate(() => { const t = document.getElementById('documents'); if (!t) return { missing: true }; const r = t.getBoundingClientRect(); const bar = document.querySelector('.prep-bar').getBoundingClientRect(); return { top: Math.round(r.top), barBottom: Math.round(bar.bottom), clear: r.top >= bar.bottom - 1 && r.top < bar.bottom + 80 }; });
  note('deeplink@' + W + ' #documents sits below the sticky bar', !!clear.clear, JSON.stringify(clear));

  /* 7 · drawer: opens, locks the page, closes back to the same position, focus returns */
  await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(150);
  await p.locator('[data-more="takbat"]').first().click(); await p.waitForTimeout(450);
  const dr = await p.evaluate(() => ({ open: document.body.classList.contains('p-drawer-open'), lock: document.body.classList.contains('p-scroll-lock'), label: document.querySelector('.p-drawer').getAttribute('aria-label'), focusIn: document.querySelector('.p-drawer').contains(document.activeElement) }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(450);
  const after = await p.evaluate(() => ({ open: document.body.classList.contains('p-drawer-open'), lock: document.body.classList.contains('p-scroll-lock'), y: Math.round(window.scrollY), focusBack: document.activeElement && document.activeElement.getAttribute('data-more') === 'takbat' }));
  note('drawer@' + W + ' locks, labels, focuses, restores', dr.open && dr.lock && /Tak Bat/.test(dr.label) && dr.focusIn && !after.open && !after.lock && after.y === 500 && after.focusBack, JSON.stringify({ dr, after }));

  /* 8 · reduced motion: everything immediate, nothing moves, still navigable */
  await p.emulateMedia({ reducedMotion: 'reduce' }); await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
  const calm = await p.evaluate(() => ({ calm: document.body.classList.contains('p-calm'), mainT: getComputedStyle(document.querySelector('main.prep-page')).transform, op: getComputedStyle(document.querySelector('main.prep-page')).opacity }));
  await open(); const panelT = await p.evaluate(() => getComputedStyle(document.querySelector('.prep-steps')).transform);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), tapRow(p.locator('.prep-steps .prep-srow[data-step="journey"]'))]);
  note('reduced-motion@' + W + ' immediate, no travel, navigates', calm.calm && calm.mainT === 'none' && calm.op === '1' && panelT === 'none' && base(p.url()) === 'your-journey', JSON.stringify({ calm, panelT }));
  await p.emulateMedia({ reducedMotion: 'no-preference' });

  note('errors@' + W, errs.length === 0, errs.slice(0, 3).join(' | ') || 'no page or console errors');
  await ctx.close();
}
const total = R.length, pass = R.filter((r) => r.ok).length;
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results: R }, null, 2));
console.log(pass + '/' + total + ' steps-nav checks pass on ' + ORIGIN);
await b.close();
process.exit(pass === total ? 0 : 1);
