/* THE FIRST-PAGE HERO SLIDESHOW (Owner, 21 Sep 2026): the existing hero stays slide 1 (the .am background, no script needed);
   the four proposal frames IMG_2584–2587 follow in order as layers of the same frame; exactly five slides; ~5 s each; a
   1000 ms crossfade; loop; reduced motion keeps the courtyard; a hidden tab pauses and never catches up. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, src } from './sandbox.mjs';

test('the markup: the courtyard first, then IMG_2584–2587 as home-hero-02..05, five slides, the same frame, no controls', () => {
  const h = src('index.html');
  assert.match(h, /<div class="am" style="background-image:url\(assets\/images\/hero\/home-hero-courtyard\.jpg\)" role="img" aria-label="The courtyard at Souphattra Heritage, Vientiane, at dusk" data-hero-show>/, 'the existing hero, in place, is slide 1');
  const layers = [...h.matchAll(/<span class="a-hero-slide" data-src="([^"]+)" data-pos="([^"]+)" aria-hidden="true"><\/span>/g)];
  assert.deepEqual(layers.map((m) => m[1]), ['assets/images/hero/home-hero-02.jpg', 'assets/images/hero/home-hero-03.jpg', 'assets/images/hero/home-hero-04.jpg', 'assets/images/hero/home-hero-05.jpg'], 'the four frames in order (2584 · 2585 · 2586 · 2587)');
  for (const [, p, pos] of layers) { assert.ok(existsSync(join(ROOT, p)), p); assert.ok(statSync(join(ROOT, p)).size < 260000, p + ' is a web-sized frame'); assert.match(pos, /^\d+% \d+%$/, 'a per-image focal point'); }
  assert.doesNotMatch(h.slice(h.indexOf('<section class="a-hero">'), h.indexOf('</section>', h.indexOf('<section class="a-hero">'))).replace(/<!--[\s\S]*?-->/g, ''), /<button|data-a=|class="[^"]*(dots|caption|nav|arrow)/, 'no controls, no dots, no captions');
  assert.match(h, /<p class="a-eyebrow">Sunday, 28 February 2027 · Vientiane, Laos<\/p>\s*<h1>One invitation\.<br>Three countries\. One journey\.<\/h1>/, 'the words are untouched');
  assert.match(h, /<script src="assets\/hero-show\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  /* the frames carry no camera metadata (a private photograph published clean) */
  for (const p of layers.map((m) => m[1])) { const b = readFileSync(join(ROOT, p)); assert.equal(b.indexOf(Buffer.from('Exif')), -1, p + ' carries no EXIF'); }
});

test('the behaviour: ~5 s hold, 1000 ms opacity crossfade, no transform, reduced motion still, hidden tab pauses without catch-up, the next frame fetched only just before its turn', () => {
  const js = src('assets/hero-show.js'), css = src('assets/aman.css');
  assert.match(js, /var HOLD = 5000, FADE = 1000;/); assert.match(js, /prefers-reduced-motion: reduce/); assert.match(js, /if \(!layers\.length \|\| calm\) \{ frame\.setAttribute\('data-hero-state', calm \? 'still' : 'single'\); return; \}/, 'reduced motion: the courtyard stays');
  assert.match(js, /document\.addEventListener\('visibilitychange'/); assert.match(js, /if \(document\.hidden\) \{ if \(timer\) \{ clearTimeout\(timer\); timer = null; \}/, 'hidden: the clock stops'); assert.match(js, /if \(pending !== null\) \{ var n = pending; pending = null; show\(n\); \}/, 'back: at most the one frame that was due, then the normal cadence');
  assert.match(js, /var im = new Image\(\);[\s\S]*im\.src = src\(n\);/, 'a frame is fetched on demand'); assert.doesNotMatch(js, /layers\.forEach\(function \(l\) \{[^}]*new Image/, 'never every frame at once');
  assert.match(js, /var next = \(i \+ 1\) % \(layers\.length \+ 1\);/, 'the loop: courtyard → 4 frames → courtyard');
  assert.match(css, /\.a-hero-slide \{ position: absolute; inset: 0; background: center\/cover no-repeat; opacity: 0; transition: opacity 1000ms ease-in-out;/); assert.match(css, /\.a-hero-slide\.is-on \{ opacity: 1; \}/);
  assert.match(css, /\.a-hero \.am \{ position: relative; overflow: hidden; \}/, 'the frame clips its layers — the geometry is the hero\'s own');
  assert.doesNotMatch(css.slice(css.indexOf('.a-hero-slide'), css.indexOf('.a-hero-slide') + 600), /transform|scale\(|translate/, 'no zoom, no slide, no Ken Burns');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.a-hero-slide \{ transition: none; \} \}/);
});
