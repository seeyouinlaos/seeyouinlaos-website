/* ONE CURRENCY ON THE PAGE — the browser lifecycle, in WebKit (Safari's engine) and Chromium (Owner, 25 Sep 2026).
   Signed out, no guest data: switch in the menu, act, navigate, reload, go back, change the choice in another tab and come
   back. At every step the pressed currency button and every rendered amount must agree.
     node docs/acceptance/2026-09-25-integrated/currency-lifecycle.e2e.mjs [base URL]      (default: the local stage) */
import { chromium, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';   /* the working checkout's Playwright, as every acceptance script here */
const O = process.argv[2] || 'http://127.0.0.1:8788';
const check = (p) => p.evaluate(() => {
  const cur = document.documentElement.getAttribute('data-cur'), pressed = [...new Set([...document.querySelectorAll('[data-cur-btn][aria-pressed="true"]')].map((b) => b.textContent))];
  const left = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (/USD\s?[1-9]/.test(n.data) && n.parentElement && n.parentElement.offsetParent !== null) left.push(n.data.trim().slice(0, 60));
  return { cur, pressed, left };
});
let fails = 0;
const expect = (tag, r, cur) => { const ok = r.cur === cur && r.pressed.length === 1 && r.pressed[0] === cur && (cur === 'USD' || !r.left.length); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', tag, JSON.stringify(r)); };
for (const [name, eng] of [['webkit', webkit], ['chromium', chromium]]) {
  const b = await eng.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(O + '/journeys.html', { waitUntil: 'networkidle' }); expect(name + ' USD first load', await check(p), 'USD');
  await p.evaluate(() => document.querySelector('.hb').click()); await p.waitForTimeout(500);
  await Promise.all([p.waitForNavigation(), p.evaluate(() => document.querySelector('.a-menu [data-cur-btn="THB"]').click())]); await p.waitForTimeout(1500);
  expect(name + ' USD → THB (menu)', await check(p), 'THB');
  for (const pg of ['experiences.html', 'experience.html?id=bkk-suhring', 'transport.html?id=train', 'destination.html']) { await p.goto(O + '/' + pg, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); expect(name + ' navigation ' + pg, await check(p), 'THB'); }
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800); expect(name + ' reload', await check(p), 'THB');
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await Promise.all([p.waitForNavigation(), p.evaluate(() => document.querySelector('.sfoot [data-cur-btn="EUR"]').click())]); await p.waitForTimeout(1500);
  expect(name + ' THB → EUR (footer)', await check(p), 'EUR');
  await p.goBack({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500); expect(name + ' back', await check(p), 'EUR');
  const p2 = await ctx.newPage(); await p2.goto(O + '/index.html'); await p2.evaluate(() => localStorage.setItem('siyl.cur', 'USD'));
  await p.bringToFront(); await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(2000);
  expect(name + ' another tab chose USD → this page follows', await check(p), 'USD');
  await b.close();
}
console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
