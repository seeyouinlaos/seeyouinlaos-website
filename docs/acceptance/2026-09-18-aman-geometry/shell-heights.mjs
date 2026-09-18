/* the sticky shell's height at each width, signed out and signed in — for the .hd-space stand-in (assets/recon.css)
     node docs/acceptance/2026-09-18-aman-geometry/shell-heights.mjs <origin> <scratchpad> */
import fs from 'node:fs';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2].replace(/\/$/, ''), N = process.argv[3]; const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const b = await chromium.launch();
for (const W of [320, 390, 480, 600, 768, 834, 1024, 1440]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 900 }, isMobile: W <= 390 }); const p = await ctx.newPage();
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(900);
  const out = await p.evaluate(() => Math.round(document.querySelector('header.hd').getBoundingClientRect().height));
  const stat = await p.goto(O + '/journeys.html', { waitUntil: 'load' }).then(() => p.waitForTimeout(800)).then(() => p.evaluate(() => Math.round(document.querySelector('header.hd').getBoundingClientRect().height)));
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes.T003); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(900);
  const inn = await p.evaluate(() => Math.round(document.querySelector('header.hd').getBoundingClientRect().height));
  console.log(W, 'recon header signed-out', out, '· static header signed-out', stat, '· recon signed-in', inn);
  await ctx.close();
}
await b.close();
