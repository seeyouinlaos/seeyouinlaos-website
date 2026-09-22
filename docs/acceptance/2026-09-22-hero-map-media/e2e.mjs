/* ============================================================================
   HERO CONTROLS · THE IPAD MAP · VIENTIANE · AFTER THE WEDDING (Owner, 22 Sep 2026)
   The served proof, on the stage and on production (read-only — this suite opens
   public pages only; it never signs in, never writes and never touches a guest).

   1 · the hero: the photograph changes every 3 s; five dots; the active one
       follows; every dot selects its own photograph; a chosen photograph does
       not jump away a moment later; reduced motion stays still and the dots
       still work.
   2 · the map of Laos at 390 · 834 × 1194 · 1194 × 834 · 1440: inside the
       viewport, a wide share of the content column, the map's own ratio, the
       whole drawing (nothing clipped), no sideways scroll.
   3 · Vientiane: nine photographs, the two church frames gone (404 on disk and
       absent from the page), the new film playing, the old one gone.
   4 · After the Wedding: nine frames, the chevrons, the keyboard, the wrap, the
       count, no autoplay, and the links and words unchanged.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = process.argv[2], O = (process.argv[3] || 'http://127.0.0.1:8788').replace(/\/$/, '');
fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 200 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const errors = new Map();
const page = async (w, h, opts) => {
  const ctx = await (w <= 430 ? wk : b).newContext(Object.assign(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: h } }) : { viewport: { width: w, height: h } }, opts || {}));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1));
  p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); });
  return p;
};
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 72 }); };
const VIEWS = [[390, 844, '390'], [834, 1194, '834x1194'], [1194, 834, '1194x834'], [1440, 900, '1440']];

/* ===== 1 · THE HERO: the pace, the dots, the choice ===== */
{
  const p = await page(1440, 900);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(600);
  const d0 = await p.evaluate(() => ({
    dots: document.querySelectorAll('.a-hero-dot').length,
    slides: document.querySelector('.a-hero .am').getAttribute('data-hero-slides'),
    idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'),
    on: (document.querySelector('.a-hero-dot.is-on') || {}).getAttribute && document.querySelector('.a-hero-dot.is-on').getAttribute('data-hero-dot'),
    labels: [...document.querySelectorAll('.a-hero-dot')].map((x) => x.getAttribute('aria-label')),
    current: [...document.querySelectorAll('.a-hero-dot')].map((x) => x.getAttribute('aria-current') || ''),
    role: (document.querySelector('.a-hero-dots') || {}).getAttribute && document.querySelector('.a-hero-dots').getAttribute('role'),
    tag: (document.querySelector('.a-hero-dot') || {}).tagName
  }));
  note('hero-dots-one-per-slide', d0.dots === 5 && d0.slides === '5' && d0.on === '0' && d0.tag === 'BUTTON' && d0.role === 'group' &&
    d0.labels.join('|') === 'Photograph 1 of 5|Photograph 2 of 5|Photograph 3 of 5|Photograph 4 of 5|Photograph 5 of 5' &&
    d0.current.filter(Boolean).length === 1, JSON.stringify(d0));
  await shot(p, '1440-hero-dots');

  /* the pace: the module's own hold, and the measured interval between two turns it makes by itself */
  const hold = await p.evaluate(() => window.SIYL_HERO && window.SIYL_HERO.HOLD);
  await p.waitForFunction(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index') === '1', null, { timeout: 8000 });
  const t0 = Date.now();
  await p.waitForFunction(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index') === '2', null, { timeout: 8000 });
  const dt = Date.now() - t0;
  const afterAuto = await p.evaluate(() => ({ idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'), dot: document.querySelector('.a-hero-dot.is-on').getAttribute('data-hero-dot') }));
  note('hero-advances-every-3s', hold === 3000 && dt >= 2600 && dt <= 3800 && afterAuto.dot === '2', JSON.stringify({ hold, msBetweenTurns: dt, afterAuto }) + ' (the hold is 3000 ms)');

  /* every dot selects its own photograph */
  const picks = [];
  for (const k of [3, 0, 4, 2]) {
    await p.click('[data-hero-dot="' + k + '"]'); await p.waitForTimeout(220);
    picks.push(await p.evaluate(() => ({ idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'), dot: document.querySelector('.a-hero-dot.is-on').getAttribute('data-hero-dot') })));
  }
  note('hero-dot-selects-its-own-photograph', picks.map((x) => x.idx).join() === '3,0,4,2' && picks.every((x) => x.idx === x.dot), JSON.stringify(picks));

  /* a chosen photograph is not swept away a moment later: the clock starts again from the choice */
  await p.click('[data-hero-dot="2"]'); await p.waitForTimeout(2200);
  const held = await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'));
  await p.waitForTimeout(1600);
  const moved = await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'));
  note('hero-manual-choice-restarts-the-clock', held === '2' && moved === '3', JSON.stringify({ at2200: held, at3800: moved }));

  /* the keyboard — read against the photograph on screen at the moment the key is pressed (the show goes on) */
  const kb = await p.evaluate(() => { const am = document.querySelector('.a-hero .am'); const i = Number(am.getAttribute('data-hero-index')); document.querySelector('[data-hero-dot="' + i + '"]').focus(); return i; });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  const k1 = await p.evaluate(() => Number(document.querySelector('.a-hero .am').getAttribute('data-hero-index')));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150);
  const k2 = await p.evaluate(() => Number(document.querySelector('.a-hero .am').getAttribute('data-hero-index')));
  note('hero-dots-keyboard', k1 === (kb + 1) % 5 && k2 === kb, JSON.stringify({ from: kb, right: k1, left: k2 }));

  /* the dots never move the words, and the frame keeps its geometry */
  const geo = await p.evaluate(() => { const am = document.querySelector('.a-hero .am').getBoundingClientRect(), ah = document.querySelector('.a-hero .ah').getBoundingClientRect(), dots = document.querySelector('.a-hero-dots').getBoundingClientRect();
    return { amW: Math.round(am.width), amH: Math.round(am.height), ahTop: Math.round(ah.top), dotsBottom: Math.round(dots.bottom), amBottom: Math.round(am.bottom), overlap: Math.round(am.bottom - dots.bottom), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  note('hero-dots-over-the-photograph-never-the-words', geo.amW === 1000 && geo.amH === 667 && geo.dotsBottom < geo.amBottom && geo.dotsBottom < geo.ahTop && geo.ov <= 1, JSON.stringify(geo));
  await p.context().close();
}
/* reduced motion: nothing moves on its own, and the dots still answer */
{
  const p = await page(390, 844, { reducedMotion: 'reduce' });
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(4200);
  const calm = await p.evaluate(() => ({ state: document.querySelector('.a-hero .am').getAttribute('data-hero-state'), idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'), on: document.querySelectorAll('.a-hero-slide.is-on').length, dots: document.querySelectorAll('.a-hero-dot').length }));
  await p.click('[data-hero-dot="2"]'); await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ idx: document.querySelector('.a-hero .am').getAttribute('data-hero-index'), on: document.querySelectorAll('.a-hero-slide.is-on').length }));
  await p.waitForTimeout(3600);
  const still = await p.evaluate(() => document.querySelector('.a-hero .am').getAttribute('data-hero-index'));
  note('hero-reduced-motion-still-but-answerable', calm.state === 'still' && calm.idx === '0' && calm.on === 0 && calm.dots === 5 && after.idx === '2' && still === '2', JSON.stringify({ calm, after, still }));
  await shot(p, '390-hero-reduced-motion'); await p.context().close();
}

/* ===== 2 · THE MAP OF LAOS at every class ===== */
for (const [w, h, name] of VIEWS) {
  const p = await page(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('.a-duo').scrollIntoView({ block: 'center' })); await p.waitForTimeout(700);
  const m = await p.evaluate(() => {
    const el = document.querySelector('.a-duo .a-map'), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const duo = document.querySelector('.a-duo').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3), size: cs.backgroundSize, duoW: Math.round(duo.width),
      share: +(r.width / duo.width).toFixed(2), inView: r.left >= -1 && r.right <= document.documentElement.clientWidth + 1,
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  /* the drawing itself: 'contain' inside a frame of the map's own ratio means the picture meets all four edges */
  const fits = Math.abs(m.ratio - 838 / 980) < 0.02;
  note('map-' + name, m.size === 'contain' && fits && m.inView && m.ov <= 1 && m.share >= (w >= 768 && h > w ? 0.7 : 0.4) && m.w >= (w >= 768 ? 380 : 120), JSON.stringify(m));
  await shot(p, name + '-map');
  await p.context().close();
}

/* ===== 3 · VIENTIANE: the current folder, the new film ===== */
{
  const p = await page(1194, 834);
  await p.goto(O + '/destination.html#vientiane', { waitUntil: 'load' }); await p.waitForTimeout(2600);
  const v = await p.evaluate(async () => {
    const sec = document.querySelector('#vientiane');
    const imgs = [...sec.querySelectorAll('img')].map((i) => (i.currentSrc || i.src).split('/').pop());
    const bad = []; for (const s of [...new Set(imgs)]) { const r = await fetch('assets/images/city/' + s, { method: 'HEAD' }); if (r.status !== 200) bad.push(s + ':' + r.status); }
    const am = sec.querySelector('.am[data-video]');
    const vr = await fetch(am.getAttribute('data-video'), { method: 'HEAD' });
    const church = await Promise.all(['002-vientiane-01-cathedral-nave.jpg', '002-vientiane-02-sacred-heart.jpg'].map((f) => fetch('assets/images/city/' + f, { method: 'HEAD' }).then((r) => f + ':' + r.status)));
    const vid = am.querySelector('video');
    return { n: imgs.length, imgs, bad, church, video: am.getAttribute('data-video'), videoStatus: vr.status, state: am.getAttribute('data-video-state'),
      muted: vid ? vid.muted : null, playing: vid ? vid.currentTime > 0 : null, label: am.getAttribute('aria-label'), count: (sec.querySelector('.refgal-count') || {}).textContent, html: sec.innerHTML.length };
  });
  const gone = v.church.every((x) => /:404$/.test(x));
  note('vientiane-current-drive-media', v.n === 9 && v.bad.length === 0 && gone && v.imgs[0] === '002-vientiane-10-aerial-dusk.jpg' && v.imgs.includes('002-vientiane-11-patuxai-from-above.jpg') &&
    !v.imgs.some((s) => /cathedral|sacred-heart/.test(s)) && v.count === '1 / 9', JSON.stringify({ n: v.n, first: v.imgs[0], church: v.church, count: v.count, bad: v.bad }));
  note('vientiane-new-film-plays', v.videoStatus === 200 && v.state === 'playing' && v.muted === true && v.playing === true && /A night of Vientiane/.test(v.label), JSON.stringify({ status: v.videoStatus, state: v.state, muted: v.muted, playing: v.playing, label: v.label }));
  await shot(p, '1194x834-vientiane');
  await p.context().close();
}

/* ===== 4 · AFTER THE WEDDING: the card gallery ===== */
for (const [w, h, name] of VIEWS) {
  const p = await page(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('[data-cardgal]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(700);
  const g0 = await p.evaluate(() => {
    const box = document.querySelector('[data-cardgal]');
    return { n: +box.getAttribute('data-cardgal-count'), i: box.getAttribute('data-cardgal-index'), count: (box.querySelector('.cg-count') || {}).textContent,
      navs: box.querySelectorAll('.cg-nav').length, shown: [...box.querySelectorAll('.cg-frame.is-on img')].map((i) => (i.currentSrc || i.src).split('/').pop()),
      title: (box.closest('.aslide').querySelector('h3') || {}).innerText, dates: (box.closest('.aslide').querySelector('.an') || {}).innerText,
      more: (box.closest('.aslide').querySelector('.a-more') || {}).getAttribute('href'), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  await shot(p, name + '-after-wedding');
  /* the arrows, and the wrap in both directions */
  await p.click('[data-cardgal] .cg-next'); await p.waitForTimeout(260);
  const g1 = await p.evaluate(() => ({ i: document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'), count: document.querySelector('.cg-count').textContent }));
  await p.click('[data-cardgal] .cg-prev'); await p.click('[data-cardgal] .cg-prev'); await p.waitForTimeout(260);
  const g2 = await p.evaluate(() => ({ i: document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'), count: document.querySelector('.cg-count').textContent,
    src: (document.querySelector('.cg-frame.is-on img').currentSrc || '').split('/').pop() }));
  await p.click('[data-cardgal] .cg-next'); await p.waitForTimeout(260);
  const g3 = await p.evaluate(() => document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'));
  note('after-wedding-' + name, g0.n === 9 && g0.i === '0' && g0.count === '1 / 9' && g0.navs === 2 && g0.shown.length === 1 && /004-lijiang-aw-01/.test(g0.shown[0]) &&
    g1.i === '1' && g1.count === '2 / 9' && g2.i === '8' && g2.count === '9 / 9' && /004-lijiang-aw-09/.test(g2.src) && g3 === '0' &&
    /After the Wedding/i.test(g0.title) && /1 – 8 MARCH 2027/i.test(g0.dates) && g0.more === 'journeys.html#j-mu9646' && g0.ov <= 1,
    JSON.stringify({ g0: { n: g0.n, count: g0.count, navs: g0.navs, shown: g0.shown, title: g0.title, dates: g0.dates, more: g0.more, ov: g0.ov }, g1, g2, g3 }));
  await p.context().close();
}
/* the keyboard, the swipe, and the nine files themselves */
{
  const p = await page(1440, 900);
  await p.goto(O + '/index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('[data-cardgal]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
  await p.focus('[data-cardgal]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(260);
  const k = await p.evaluate(() => document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(220);
  const k2 = await p.evaluate(() => document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'));
  const files = await p.evaluate(async () => {
    const out = []; for (let i = 1; i <= 9; i++) { const f = 'assets/images/city/004-lijiang-aw-' + String(i).padStart(2, '0') + '.jpg'; const r = await fetch(f, { method: 'HEAD' }); out.push(f.split('/').pop() + ':' + r.status); } return out;
  });
  /* nothing turns by itself */
  const before = await p.evaluate(() => document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'));
  await p.waitForTimeout(5200);
  const after = await p.evaluate(() => document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'));
  note('after-wedding-keyboard-files-and-no-autoplay', k === '2' && k2 === '1' && files.every((f) => f.endsWith(':200')) && before === after, JSON.stringify({ k, k2, files: files.length, autoplay: before + '→' + after }));
  await p.context().close();
}
{
  const p = await page(390, 844);
  await p.goto(O + '/index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('[data-cardgal]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(600);
  const box = await p.evaluate(() => { const r = document.querySelector('[data-cardgal]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  /* a swipe of the finger, as WebKit reports it */
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('[data-cardgal]');
    const mk = (type, cx) => { const t = { identifier: 1, target: el, clientX: cx, clientY: y, pageX: cx, pageY: y }; const ev = document.createEvent('Event'); ev.initEvent(type, true, true); ev.changedTouches = [t]; ev.touches = type === 'touchend' ? [] : [t]; el.dispatchEvent(ev); };
    mk('touchstart', x + 80); mk('touchmove', x); mk('touchend', x - 80);
  }, box);
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => ({ i: document.querySelector('[data-cardgal]').getAttribute('data-cardgal-index'), url: location.pathname }));
  note('after-wedding-swipe-turns-and-never-follows-the-link', sw.i === '1' && !/journeys/.test(sw.url), JSON.stringify(sw));
  await shot(p, '390-after-wedding-swiped');
  await p.context().close();
}

note('console-errors', errors.size === 0, errors.size ? [...errors.keys()].slice(0, 4).join(' | ') : 'no script or console error');
await b.close(); await wk.close();
fs.writeFileSync(path.join(OUT, 'e2e.json'), JSON.stringify(R, null, 2));
const bad = R.filter((r) => !r.ok);
console.log(bad.length ? 'FAILED: ' + bad.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed');
process.exit(bad.length ? 1 : 0);
