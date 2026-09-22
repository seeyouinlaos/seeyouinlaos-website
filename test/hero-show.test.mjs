/* THE FIRST-PAGE HERO SLIDESHOW (Owner, 21 Sep 2026; the pace and the dots 22 Sep 2026): the existing hero stays slide 1
   (the .am background, no script needed); the four proposal frames IMG_2584–2587 follow in order as layers of the same
   frame; exactly five slides; 3 s each; a 1000 ms crossfade; loop; reduced motion keeps the courtyard; a hidden tab pauses
   and never catches up. The only control is the row of dots the module builds — one per slide, the active one filled, a
   chosen photograph shown at once with the clock started again from that moment; a swipe over the photograph does the same. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, src } from './sandbox.mjs';

test('the markup: the courtyard first, then IMG_2584–2587 as home-hero-02..05, five slides, the same frame, the dots built by the module', () => {
  const h = src('index.html');
  assert.match(h, /<div class="am" style="background-image:url\(assets\/images\/hero\/home-hero-courtyard\.jpg\);--fp-p:50% 50%;--fp-tp:50% 50%;--fp-tl:50% 50%;--fp-d:50% 50%" role="img" aria-label="The courtyard at Souphattra Heritage, Vientiane, at dusk" data-hero-show>/, 'the existing hero, in place, is slide 1');
  const layers = [...h.matchAll(/<span class="a-hero-slide" data-src="([^"]+)" style="(--fp-p:[^"]+)" aria-hidden="true"><\/span>/g)];
  assert.deepEqual(layers.map((m) => m[1]), ['assets/images/hero/home-hero-02.jpg', 'assets/images/hero/home-hero-03.jpg', 'assets/images/hero/home-hero-04.jpg', 'assets/images/hero/home-hero-05.jpg'], 'the four frames in order (2584 · 2585 · 2586 · 2587)');
  for (const [, p, pos] of layers) { assert.ok(existsSync(join(ROOT, p)), p); assert.ok(statSync(join(ROOT, p)).size < 260000, p + ' is a web-sized frame'); assert.match(pos, /^--fp-p:\d+% \d+%;--fp-tp:\d+% \d+%;--fp-tl:\d+% \d+%;--fp-d:\d+% \d+%$/, 'a focal point per viewport class: phone · tablet portrait · tablet landscape · desktop'); }
  const hero = h.slice(h.indexOf('<section class="a-hero">'), h.indexOf('</section>', h.indexOf('<section class="a-hero">'))).replace(/<!--[\s\S]*?-->/g, '');
  assert.match(hero, /<div class="a-hero-frame">\s*<div class="am"/, 'the photograph sits in a frame of its own width — the dots are laid against its foot, never over the words');
  assert.doesNotMatch(hero, /<button|data-a=|caption/, 'no control is written into the page: the dots are the module\'s, so their number can never disagree with the slides');
  assert.match(h, /<p class="a-eyebrow">Sunday, 28 February 2027 · Vientiane, Laos<\/p>\s*<h1>One invitation\.<br>Three countries\. One journey\.<\/h1>/, 'the words are untouched');
  assert.match(h, /<script src="assets\/hero-show\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  /* the frames carry no camera metadata (a private photograph published clean) */
  for (const p of layers.map((m) => m[1])) { const b = readFileSync(join(ROOT, p)); assert.equal(b.indexOf(Buffer.from('Exif')), -1, p + ' carries no EXIF'); }
});

test('the behaviour: a 3 s hold, 1000 ms opacity crossfade, no transform, reduced motion still, hidden tab pauses without catch-up, the next frame fetched only just before its turn', () => {
  const js = src('assets/hero-show.js'), css = src('assets/aman.css');
  assert.match(js, /var HOLD = 3000, FADE = 1000;/, 'the Owner\'s pace: the next photograph begins every 3 s'); assert.match(js, /prefers-reduced-motion: reduce/); assert.match(js, /if \(!layers\.length \|\| calm\) \{ frame\.setAttribute\('data-hero-state', calm \? 'still' : 'single'\); return; \}/, 'reduced motion: the courtyard stays');
  assert.match(js, /document\.addEventListener\('visibilitychange'/); assert.match(js, /if \(document\.hidden\) \{ if \(timer\) \{ clearTimeout\(timer\); timer = null; \}/, 'hidden: the clock stops'); assert.match(js, /if \(pending !== null\) \{ var n = pending; pending = null; show\(n\); \}/, 'back: at most the one frame that was due, then the normal cadence');
  assert.match(js, /var im = new Image\(\);[\s\S]*im\.src = src\(n\);/, 'a frame is fetched on demand'); assert.doesNotMatch(js, /layers\.forEach\(function \(l\) \{[^}]*new Image/, 'never every frame at once');
  assert.match(js, /var count = layers\.length \+ 1;/); assert.match(js, /var next = \(i \+ 1\) % count;/, 'the loop: courtyard → 4 frames → courtyard');
  assert.match(css, /\.a-hero-slide \{ position: absolute; inset: 0; background: center\/cover no-repeat; opacity: 0; transition: opacity 1000ms ease-in-out;/); assert.match(css, /\.a-hero-slide\.is-on \{ opacity: 1; \}/);
  assert.match(css, /\.a-hero \.am \{ position: relative; overflow: hidden; \}/, 'the frame clips its layers — the geometry is the hero\'s own');
  assert.doesNotMatch(css.slice(css.indexOf('.a-hero-slide'), css.indexOf('.a-hero-slide') + 600), /transform|scale\(|translate/, 'no zoom, no slide, no Ken Burns');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.a-hero-slide \{ transition: none; \} \}/);
  assert.doesNotMatch(js, /backgroundPosition|data-pos/, 'the focal point is the stylesheet\'s, never the script\'s');
});

test('THE FRAME PER VIEWPORT CLASS (Owner, 21 Sep 2026): the phone keeps its square; a tablet upright frames 4:5, a tablet on its side and the desktop 3:2, bounded and centred; the 16:9 banner that cut the couple is overridden; each class reads its own focal point; nothing is stretched, extended or blurred', () => {
  const css = src('assets/aman.css');
  assert.match(css, /\.a-hero \.am \{ width: 100%; height: auto; aspect-ratio: 1 \/ 1;/, 'the phone square, untouched');
  assert.match(css, /\.a-hero \.am, \.a-hero-slide \{ background-position: var\(--fp-p, center\); \}/);
  const at = (q) => { const i = css.indexOf(q); assert.ok(i > 0, q); return css.slice(i, css.indexOf('\n}', i)); };
  const tp = at('@media (min-width: 768px) and (orientation: portrait) {'), tl = at('@media (min-width: 768px) and (orientation: landscape) {'), d = at('@media (min-width: 1200px) {');
  assert.match(tp, /\.a-hero \.am \{ aspect-ratio: 4 \/ 5; max-width: 720px; margin-left: auto; margin-right: auto; \}/); assert.match(tp, /background-position: var\(--fp-tp, var\(--fp-p, center\)\)/);
  assert.match(tl, /\.a-hero \.am \{ aspect-ratio: 3 \/ 2; max-width: 880px; margin-left: auto; margin-right: auto; \}/); assert.match(tl, /background-position: var\(--fp-tl, var\(--fp-p, center\)\)/);
  assert.match(d, /\.a-hero \.am \{ aspect-ratio: 3 \/ 2; max-width: 1000px; margin-left: auto; margin-right: auto; \}/); assert.match(d, /background-position: var\(--fp-d, var\(--fp-p, center\)\)/);
  for (const blk of [tp, tl, d]) { assert.match(blk, /\.a-hero \.ah \{ max-width: \d+px; margin-left: auto; margin-right: auto; \}/, 'the words begin at the frame\'s edge'); assert.doesNotMatch(blk, /transform|scale\(|filter|blur|object-fit: fill|background-size/, 'positioned only'); }
  const last16 = css.lastIndexOf('.a-hero .am { width: 100%; aspect-ratio: 16 / 9; }'), first16 = css.indexOf('.a-hero .am { aspect-ratio: 16 / 9; }');
  assert.ok(css.indexOf('@media (min-width: 768px) and (orientation: portrait) {') > Math.max(last16, first16), 'the per-class frames stand after every 16:9 rule — the cascade decides');
});

test('THE DOTS (Owner, 22 Sep 2026): one small dot per slide, centred at the foot of the photograph, the active one filled; a dot jumps straight to its photograph and the clock starts again; real buttons with names, the arrow keys, a swipe; no dot ever moves the page', () => {
  const js = src('assets/hero-show.js'), css = src('assets/aman.css'), h = src('index.html');
  /* built from the slides themselves — the count cannot drift from the photographs */
  assert.match(js, /for \(var k = 0; k < count; k\+\+\)/); assert.match(js, /b\.setAttribute\('aria-label', 'Photograph ' \+ \(k \+ 1\) \+ ' of ' \+ count\);/);
  assert.match(js, /b\.type = 'button'; b\.className = 'a-hero-dot';/, 'real buttons — reachable by Tab, pressed by Enter and Space');
  assert.match(js, /box\.setAttribute\('role', 'group'\)/); assert.match(js, /dots\[k\]\.setAttribute\('aria-current', 'true'\)/);
  assert.match(js, /if \(e\.key !== 'ArrowLeft' && e\.key !== 'ArrowRight'\) return;/, 'the arrow keys move through the photographs');
  /* a chosen photograph restarts the clock — the show never advances the instant a guest has chosen */
  assert.match(js, /function go\(n\) \{[\s\S]*if \(timer\) \{ clearTimeout\(timer\); timer = null; \}[\s\S]*schedule\(\);/);
  assert.match(js, /addEventListener\('touchend'[\s\S]*Math\.abs\(dx\) < Math\.abs\(dy\) \* 1\.4/, 'a horizontal swipe turns the page; a vertical one stays the page\'s scroll');
  assert.match(js, /\{ passive: true \}/, 'the touch listeners never block scrolling');
  /* the row is laid over the photograph and takes no space of its own */
  assert.match(css, /\.a-hero-frame \{ position: relative; width: 100%; \}/);
  assert.match(css, /\.a-hero-dots \{\s*position: absolute;[^}]*bottom: 10px;[^}]*\}/);
  assert.match(css, /\.a-hero-dot \{[^}]*width: 30px; height: 30px;/, 'a small dot, a finger-sized target');
  assert.match(css, /\.a-hero-dot i \{[^}]*width: 6px; height: 6px;/);
  assert.match(css, /\.a-hero-dot\.is-on i \{ background: #FFFFFF;/);
  assert.match(css, /\.a-hero-dot:focus-visible i \{ box-shadow:/, 'the keyboard can see where it is');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.a-hero-dot i \{ transition: none; \} \}/);
  assert.doesNotMatch(css.slice(css.indexOf('.a-hero-dots'), css.indexOf('.a-hero-dots') + 900), /arrow|chevron/, 'the hero asks for dots, not arrows over the photograph');
  assert.match(h, /<div class="a-hero-frame">/);
});
