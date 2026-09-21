import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2] || 'http://127.0.0.1:8788';
const grab = (p) => p.evaluate(() => { const f = document.querySelector('[data-clip]'); const v = f.querySelector('video'); const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); let sig = null; try { x.drawImage(v, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] + d[i + 2]) >>> 0; sig = h; } catch (e) { sig = 'err:' + e.message; } const cs = getComputedStyle(v); return { t: +v.currentTime.toFixed(2), paused: v.paused, ready: v.readyState, net: v.networkState, vw: v.videoWidth, vh: v.videoHeight, src: (v.currentSrc || '').split('/').pop(), sig, opacity: cs.opacity, display: cs.display, vis: cs.visibility, z: cs.zIndex, state: f.getAttribute('data-clip-state'), audio: f.getAttribute('data-clip-audio'), label: f.querySelector('button[data-clip-play]').innerText.trim(), playingClass: f.classList.contains('is-playing') }; });
for (const [name, launch, ctxo] of [['chromium', () => chromium.launch(), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-iphone', () => webkit.launch(), { ...devices['iPhone 14'] }]]) {
  const b = await launch(); const ctx = await b.newContext(ctxo); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(O + '/destination.html', { waitUntil: 'load' }); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('lijiang').scrollIntoView()); await p.waitForTimeout(3000);
  const a = await grab(p); await p.waitForTimeout(2500); const c = await grab(p);
  await p.click('button[data-clip-play]'); await p.waitForTimeout(800); const paused = await grab(p); await p.waitForTimeout(1500); const paused2 = await grab(p);
  await p.click('button[data-clip-play]'); await p.waitForTimeout(1500); const resumed = await grab(p);
  console.log(name, JSON.stringify({ a, c, framesDiffer: a.sig !== c.sig && a.t !== c.t, paused: { t: paused.t, t2: paused2.t, label: paused.label, state: paused.state, same: paused.sig === paused2.sig }, resumed: { t: resumed.t, label: resumed.label, state: resumed.state }, errors: errs }));
  await b.close();
}
