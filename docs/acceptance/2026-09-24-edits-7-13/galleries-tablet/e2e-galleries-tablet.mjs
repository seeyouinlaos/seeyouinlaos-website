/* ============================================================================
   ITEMS 12 + 13 (24 Sep 2026) · the three Featured Journey galleries and the
   front page's closing "Your Invitation" section on tablets.

   Re-runnable, read-only against any origin that serves the front page:

     node docs/acceptance/2026-09-24-edits-7-13/galleries-tablet/e2e-galleries-tablet.mjs \
          [origin=http://127.0.0.1:8795] [label=after] [outDir=<this folder>]

   Per viewport it checks:
     · no horizontal overflow (scrollWidth <= innerWidth);
     · each of the three journey cards: a [data-cardgal] gallery, the counter
       "1 / n", next by a click, previous by a (synthetic) touch swipe, a walk
       through every frame back to "1 / n" (wrap), every image HTTP 200 and
       naturalWidth > 0;
     · the closing section (.a-close) and the duo/caption above it: the left /
       right edges and centre of the rule, eyebrow, heading and CTA, measured
       against the frame the Featured Journeys head uses.
   Screenshots: <label>-<viewport>-journey-<1..3>.png, <label>-<viewport>-close.png.
   The results are merged into results.json under their label; when both a
   "before" and an "after" run exist, the phone and desktop geometry of the
   close section is compared (it must be identical).
   Only the public front page is visited; no guest data exists there.
   ========================================================================== */
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8795').replace(/\/$/, '');
const LABEL = process.argv[3] || 'after';
const OUT = process.argv[4] || HERE;
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { id: 'iphone-390x844', engine: 'webkit', device: 'iPhone 13' },
  { id: 'iphone-430x932', engine: 'webkit', device: 'iPhone 14 Pro Max' },
  { id: 'ipad-834x1194', engine: 'webkit', w: 834, h: 1194, touch: true },
  { id: 'ipad-820x1180', engine: 'webkit', w: 820, h: 1180, touch: true },
  { id: 'ipad-768x1024', engine: 'webkit', w: 768, h: 1024, touch: true },
  { id: 'ipad-1194x834', engine: 'webkit', w: 1194, h: 834, touch: true },
  { id: 'ipad-1180x820', engine: 'webkit', w: 1180, h: 820, touch: true },
  { id: 'ipad-1024x768', engine: 'webkit', w: 1024, h: 768, touch: true },
  /* the same iPads as Safari really lays them out on its side: the tab and address bars take ~74-80 px of height */
  { id: 'ipad-1180x740-safari', engine: 'webkit', w: 1180, h: 740, touch: true },
  { id: 'ipad-1194x760-safari', engine: 'webkit', w: 1194, h: 760, touch: true },
  { id: 'desktop-1440x900', engine: 'chromium', w: 1440, h: 900 },
];
const CARDS = ['Before the Wedding', 'The Wedding', 'After the Wedding'];

async function run(vp, browsers) {
  const ctxOpts = vp.device
    ? { ...devices[vp.device] }
    : { viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch, isMobile: false, deviceScaleFactor: 1 };
  const ctx = await browsers[vp.engine].newContext({ ...ctxOpts, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const images = new Map();
  page.on('response', (r) => { const u = r.url(); if (/\/assets\/images\//.test(u)) images.set(u.replace(ORIGIN, ''), r.status()); });
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const out = { viewport: vp.id, engine: vp.engine, overflow: null, cards: [], close: null, errors: [] };
  out.overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth, ok: document.documentElement.scrollWidth <= innerWidth }));

  /* ---------------------------------------------------------- the three journey cards */
  const slideCount = await page.locator('.acar[aria-label="Featured journeys"] .aslide').count();
  for (let k = 0; k < slideCount; k++) {
    const slide = page.locator('.acar[aria-label="Featured journeys"] .aslide').nth(k);
    const title = (await slide.locator('h3').textContent()).trim();
    /* bring the slide to the active position exactly as the rail does */
    await page.evaluate((k) => {
      const car = document.querySelector('.acar[aria-label="Featured journeys"]'), trk = car.querySelector('.atrk'), s = trk.querySelectorAll('.aslide')[k];
      s.scrollIntoView({ block: 'center', inline: 'nearest' });
      const cs = getComputedStyle(s), left = s.offsetLeft - trk.offsetLeft;
      trk.scrollLeft = cs.scrollSnapAlign === 'center' ? left - (trk.clientWidth - s.offsetWidth) / 2 : left - (parseFloat(getComputedStyle(trk).scrollPaddingLeft) || 0);
    }, k);
    await page.waitForTimeout(500);
    const card = { title, gallery: false, count: 0, counter: null, next: null, swipe: null, wrap: null, frames: [], badImages: [], active: false };
    const box = slide.locator('[data-cardgal]');
    card.active = await slide.evaluate((s) => s.classList.contains('on'));
    if (await box.count()) {
      card.gallery = true;
      card.count = Number(await box.getAttribute('data-cardgal-count'));
      card.counter = (await box.locator('.cg-count').textContent()).trim();
      /* next, by a click on the chevron */
      await box.hover().catch(() => {});
      await box.locator('.cg-next').click();
      card.next = (await box.locator('.cg-count').textContent()).trim();
      /* previous, by a touch swipe to the right (the module reads changedTouches[0]) */
      await box.evaluate((el) => {
        const r = el.getBoundingClientRect(), y = r.top + r.height / 2;
        const fire = (type, x) => { const e = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'changedTouches', { value: [{ clientX: x, clientY: y }] }); el.dispatchEvent(e); };
        fire('touchstart', r.left + 40); fire('touchmove', r.left + 120); fire('touchend', r.left + 200);
        /* a real finger's next tap begins with its own touchstart, which clears the "a swipe is not a tap" guard */
        fire('touchstart', r.left + 40); fire('touchend', r.left + 40);
      });
      card.swipe = (await box.locator('.cg-count').textContent()).trim();
      /* a walk through every frame: each one decoded, then the wrap back to the first */
      for (let f = 0; f < card.count; f++) {
        await page.waitForFunction((el) => { const im = el.querySelector('.cg-frame.is-on img'); return im && im.complete; }, await box.elementHandle(), { timeout: 15000 }).catch(() => {});
        const fr = await box.evaluate((el) => { const im = el.querySelector('.cg-frame.is-on img'); return { src: im.getAttribute('src'), naturalWidth: im.naturalWidth, counter: el.querySelector('.cg-count').textContent.trim() }; });
        card.frames.push(fr);
        if (!(fr.naturalWidth > 0)) card.badImages.push(fr.src);
        if (f === 0) await page.screenshot({ path: join(OUT, `${LABEL}-${vp.id}-journey-${k + 1}.png`), clip: await clipOf(page, slide) });
        await box.locator('.cg-next').click();
      }
      card.wrap = (await box.locator('.cg-count').textContent()).trim();
    } else {
      const bg = await slide.locator('.am').first().evaluate((el) => getComputedStyle(el).backgroundImage);
      card.frames.push({ src: bg, naturalWidth: null, counter: null });
      await page.screenshot({ path: join(OUT, `${LABEL}-${vp.id}-journey-${k + 1}.png`), clip: await clipOf(page, slide) });
    }
    out.cards.push(card);
  }

  /* ---------------------------------------------------------- the closing invitation section */
  await page.locator('.a-close').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  out.close = await page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, centre: Math.round((r.left + r.width / 2) * 10) / 10 }; };
    const content = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { left: Math.round((r.left + parseFloat(cs.paddingLeft)) * 10) / 10, right: Math.round((r.right - parseFloat(cs.paddingRight)) * 10) / 10 }; };
    const sec = document.querySelector('.a-close'), duo = document.querySelector('.a-duo');
    const head = document.querySelector('.acar[aria-label="Featured journeys"] .a-head');
    const text = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 }; };
    return {
      innerWidth,
      frame: head ? content(head) : null,
      duo: { box: content(duo), map: R(duo.querySelector('.a-map')), photo: R(duo.querySelector('.am:not(.a-map)')), caption: R(duo.querySelector('.cap')) },
      close: { box: content(sec), hr: R(sec.querySelector('hr')), eyebrow: R(sec.querySelector('.a-eyebrow')), eyebrowText: text(sec.querySelector('.a-eyebrow')), h2: R(sec.querySelector('h2')), h2Text: text(sec.querySelector('h2')), cta: R(sec.querySelector('.a-cta')) },
    };
  });
  const c = out.close, fr = c.frame;
  const near = (a, b) => Math.abs(a - b) <= 1;
  out.close.checks = {
    closeOnFrame: !!fr && near(c.close.box.left, fr.left) && near(c.close.box.right, fr.right),
    duoOnFrame: !!fr && near(c.duo.box.left, fr.left) && near(c.duo.box.right, fr.right),
    hrOnFrame: !!fr && near(c.close.hr.left, fr.left) && near(c.close.hr.right, fr.right),
    ctaStartsOnFrame: !!fr && near(c.close.cta.left, fr.left),
    eyebrowStartsOnFrame: !!fr && near(c.close.eyebrowText.left, fr.left),
    h2StartsOnFrame: !!fr && near(c.close.h2Text.left, fr.left),
    captionStartsOnFrame: !!fr && near(c.duo.caption.left, fr.left),
    /* the two photographs: stacked (portrait) they are centred on the frame's axis; side by side (landscape) each
       column is bounded by the frame's edges and both share one height */
    imagesOnAxis: !!fr && (c.duo.map.left > c.duo.photo.right - 1 || c.duo.photo.left > c.duo.map.right - 1
      ? near(c.duo.map.left, fr.left) && near(c.duo.photo.right, fr.right) && near(c.duo.map.height, c.duo.photo.height)
      : near(c.duo.map.centre, (fr.left + fr.right) / 2) && near(c.duo.photo.centre, (fr.left + fr.right) / 2)),
  };
  /* the sticky header would sit across a full-page clip: made invisible (its place in the flow kept) for the photograph only */
  await page.addStyleTag({ content: '[data-e2e-hide]{visibility:hidden!important}' });
  await page.evaluate(() => document.querySelectorAll('body *').forEach((el) => { if (/^(fixed|sticky)$/.test(getComputedStyle(el).position)) el.setAttribute('data-e2e-hide', ''); }));
  const top = await page.locator('.a-duo').boundingBox(), bot = await page.locator('.a-close').boundingBox();
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: join(OUT, `${LABEL}-${vp.id}-close.png`), fullPage: true, clip: { x: 0, y: Math.max(0, top.y + sy - 24), width: await page.evaluate(() => innerWidth), height: Math.round(bot.y + bot.height - top.y + 72) } });

  out.images = [...images.entries()].filter(([u]) => /\/(city|event|temple|experiences|souphattra|transport)\//.test(u)).map(([u, s]) => ({ url: u, status: s }));
  out.imageFailures = out.images.filter((x) => x.status !== 200 && x.status !== 304);
  await ctx.close();
  return out;
}
async function clipOf(page, loc) {
  const b = await loc.boundingBox(), vw = await page.evaluate(() => innerWidth);
  const x = Math.max(0, b.x), w = Math.min(vw - x, b.width);
  return { x, y: Math.max(0, b.y), width: Math.max(1, w), height: Math.max(1, b.height) };
}

/* ImageMagick's absolute-error count (0 = pixel-identical); null when magick is not installed */
function pixelDiff(a, b) {
  if (!existsSync(a) || !existsSync(b)) return null;
  const r = spawnSync('magick', ['compare', '-metric', 'AE', a, b, 'null:'], { encoding: 'utf8' });
  if (r.error) return null;
  const m = /^([\d.e+]+)/.exec((r.stderr || '').trim()); return m ? Number(m[1]) : null;
}

const browsers = { chromium: await chromium.launch(), webkit: await webkit.launch() };
const runs = [];
for (const vp of VIEWPORTS) {
  try { runs.push(await run(vp, browsers)); } catch (e) { runs.push({ viewport: vp.id, fatal: String(e && e.stack || e) }); }
}
await browsers.chromium.close(); await browsers.webkit.close();

/* verdicts */
const verdict = { overflow: true, galleries: true, close: true };
for (const r of runs) {
  if (r.fatal) { verdict.overflow = verdict.galleries = verdict.close = false; continue; }
  if (!r.overflow.ok) verdict.overflow = false;
  for (const c of r.cards) {
    const n = c.count, ok = c.gallery && n > 1 && c.counter === `1 / ${n}` && c.next === `2 / ${n}` && c.swipe === `1 / ${n}` && c.wrap === `1 / ${n}` && c.badImages.length === 0 && c.frames.length === n;
    c.ok = ok; if (!ok) verdict.galleries = false;
  }
  if (r.imageFailures.length) verdict.galleries = false;
  if (!Object.values(r.close.checks).every(Boolean)) verdict.close = false;
}
const resultsPath = join(OUT, 'results.json');
const all = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : {};
all[LABEL] = { origin: ORIGIN, at: new Date().toISOString(), verdict, runs };
/* phone + desktop: the close section's geometry must be identical before and after */
if (all.before && all.after) {
  const same = {};
  for (const id of ['iphone-390x844', 'iphone-430x932', 'desktop-1440x900']) {
    const b = all.before.runs.find((r) => r.viewport === id), a = all.after.runs.find((r) => r.viewport === id);
    const strip = (r) => r && JSON.stringify({ duo: r.close.duo, close: r.close.close });
    same[id] = { geometry: !!b && !!a && strip(b) === strip(a), pixelsDifferent: pixelDiff(join(OUT, `before-${id}-close.png`), join(OUT, `after-${id}-close.png`)) };
  }
  all.unchangedPhoneDesktop = same;
}
writeFileSync(resultsPath, JSON.stringify(all, null, 1));
console.log(JSON.stringify({ label: LABEL, verdict, unchanged: all.unchangedPhoneDesktop || null,
  summary: runs.map((r) => r.fatal ? { vp: r.viewport, fatal: r.fatal.split('\n')[0] } : { vp: r.viewport, overflow: r.overflow.ok, cards: r.cards.map((c) => `${c.title}:${c.gallery ? c.count + (c.ok ? ' ok' : ' FAIL') : 'single'}`).join(' | '), close: Object.entries(r.close.checks).filter(([, v]) => !v).map(([k]) => k).join(',') || 'ok' }) }, null, 1));
process.exit(verdict.overflow && verdict.galleries && verdict.close ? 0 : 1);
