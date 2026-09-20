import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = 'http://127.0.0.1:8788/destination.html';
const state = (p) => p.evaluate(() => { const f = document.querySelector('[data-clip]'); const v = f.querySelector('video'); return { st: f.getAttribute('data-clip-state'), snd: f.getAttribute('data-clip-audio'), paused: v.paused, muted: v.muted, t: +v.currentTime.toFixed(2), src: (v.currentSrc || '').split('/').pop(), loop: v.loop, inline: v.playsInline, poster: (v.poster || '').split('/').pop(), ready: v.readyState, w: v.videoWidth }; });
const out = {};
async function run(name, launch, ctxOpts, pageSetup) {
  const b = await launch(); const ctx = await b.newContext(ctxOpts || { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  if (pageSetup) await pageSetup(p);
  await p.goto(O, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const r = {}; r.beforeView = await state(p);
  await p.evaluate(() => document.getElementById('lijiang').scrollIntoView({ block: 'start' })); await p.waitForTimeout(3000); r.inView = await state(p);
  const t1 = r.inView.t; await p.waitForTimeout(1500); r.later = await state(p);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200); r.out = await state(p);
  await p.evaluate(() => document.getElementById('lijiang').scrollIntoView({ block: 'start' })); await p.waitForTimeout(1500); r.back = await state(p);
  await p.click('button[data-clip-play]'); await p.waitForTimeout(600); r.pausedByGuest = await state(p);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('lijiang').scrollIntoView({ block: 'start' })); await p.waitForTimeout(1500); r.afterScrollWhilePaused = await state(p);
  await p.click('button[data-clip-play]'); await p.waitForTimeout(1200); r.resumed = await state(p);
  await p.click('button[data-clip-sound]'); await p.waitForTimeout(500); r.soundToggled = await state(p);
  await p.click('button[data-clip-sound]'); await p.waitForTimeout(500); r.soundToggledBack = await state(p);
  r.labels = await p.evaluate(() => [...document.querySelectorAll('.a-clip-btn')].map((b) => b.getAttribute('aria-label') + '|' + b.innerText.trim()));
  r.errors = errs.slice(0, 3); r.t1 = t1; out[name] = r; await b.close();
}
await run('chromium-mobile-default-policy', () => chromium.launch(), null);
await run('chromium-audible-allowed', () => chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), null);
await run('webkit-iphone', () => webkit.launch(), { ...devices['iPhone 14'] });
await run('chromium-audible-refused', () => chromium.launch(), null, (p) => p.addInitScript(() => { const orig = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!this.muted && !window.__gesture) return Promise.reject(new DOMException('NotAllowedError', 'NotAllowedError')); return orig.call(this); }; document.addEventListener('click', () => { window.__gesture = true; }, true); }));
await run('chromium-reduced-motion', () => chromium.launch(), null, (p) => p.emulateMedia({ reducedMotion: 'reduce' }));
console.log(JSON.stringify(out, null, 1));
