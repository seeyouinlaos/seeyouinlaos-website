/* THE FIRST PAGE AS ONE SYSTEM (Owner, 25 Sep 2026 · screenshots of the hero and the vertical rhythm): the hero closes on
   the page's content wall (no second inset), frames the portrait photographs at 4 : 3 on landscape screens instead of 3 : 2,
   and the page's own rhythm keeps related sections together — bounded at both ends so a tall monitor never grows the gaps.
   The rendered geometry is proven by docs/acceptance/2026-09-25-home/home-layout.e2e.mjs; these pins keep the rules.
   PROMOTED (the site-wide layout QA agent, 25 Sep 2026): the first page's rhythm and hero frame are now the whole site's
   system — stated on :root and on .a-hero, never scoped to main.a-home — so the first page reads exactly as before and
   every other editorial page reads the same way. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { src } from './sandbox.mjs';

const css = src('assets/aman.css');
const home = css.slice(css.indexOf('THE FIRST PAGE AS ONE SYSTEM'));
const hero = css.slice(css.indexOf('THE HERO ON THE WALL'), css.indexOf('THE HERO CONTROLS · THE MAP'));

test('HOME → SITE · the rhythm is the one scale on :root — every section of every editorial page reads it; no per-headline patch, no negative margin, no viewport-sized value', () => {
  assert.match(src('index.html'), /<main class="a-home">/);
  assert.equal((src('index.html').match(/<main[ >]/g) || []).length, 1);
  assert.match(home, /:root \{ --a-rhythm: 56px; --a-gap-media: 64px; \}/);
  assert.match(home, /@media \(min-width: 900px\) \{ :root \{ --a-rhythm: clamp\(80px, 6vw, 104px\); --a-gap-media: clamp\(88px, 6\.5vw, 112px\); \} \}/, 'bounded: a tall or wide monitor never grows the gaps past 104 / 112 px');
  assert.doesNotMatch(css, /main\.a-home\s*[{.,]/, 'nothing is scoped to the first page any more: one system');
  /* the promoted scale is stated after every earlier token, so it is the one that holds */
  assert.ok(css.lastIndexOf('--a-rhythm: 150px') < css.indexOf('THE FIRST PAGE AS ONE SYSTEM'));
  assert.doesNotMatch(home, /margin[^;]*-\d|100vh|min-height:\s*\d+vh|\bvh\b(?![^;]*svh)/, 'no negative margin, no viewport-height spacing');
  for (const v of home.match(/--a-(rhythm|gap-media): [^;]+/g)) { const px = Math.max(...(v.match(/\d+px/g) || []).map((x) => parseInt(x, 10))); assert.ok(px <= 112, v + ' stays a calm, bounded gap'); }
  /* the shared consumers are the ones the whole page already reads */
  assert.match(css, /\.a-sec \{ margin: var\(--a-rhythm\) 0; \}/); assert.match(css, /\.a-hero \+ \.a-sec,/);
});

test('HOME → SITE · every hero closes on the content wall from 768 px (no 720 / 880 / 1000 px cap inside it), frames 4 : 3 on landscape screens, bounded by the screen height, never stretched', () => {
  assert.match(hero, /\.a-hero \.am, \.a-hero \.ah \{ max-width: none; margin-left: 0; margin-right: 0; \}/);
  assert.match(hero, /\.a-hero \.am \{ max-height: max\(480px, calc\(\(min\(100vw, var\(--a-frame\)\) - 2 \* var\(--a-gut\)\) \* 2 \/ 3\), calc\(100svh - 160px\)\); \}/, 'never shallower than 3 : 2, up to 4 : 3');
  assert.match(hero, /@media \(min-width: 768px\) and \(orientation: landscape\) \{\s*\.a-hero \.am \{ aspect-ratio: 4 \/ 3; \}/);
  assert.match(hero, /@media \(min-width: 1200px\) \{\s*\.a-hero \.am \{ aspect-ratio: 4 \/ 3; \}/);
  assert.match(hero, /@media \(min-width: 768px\) and \(orientation: portrait\) \{\s*\.a-hero \.am \{ aspect-ratio: 4 \/ 5; \}/, 'upright tablets keep 4 : 5');
  assert.doesNotMatch(css, /\.a-hero \.a[mh] \{[^}]*max-width: (720|880|1000)px/, 'no hero cap survives anywhere');
  assert.doesNotMatch(hero, /width:\s*100vw|margin-left:\s*calc\(50%|background-size:\s*(100%|contain|auto)|margin[^;]*:\s*-\d/, 'never full-bleed, never a stretched or letter-boxed photograph, no negative margin');
  assert.match(css, /\.a-hero \.am \{ width: 100%; height: auto; aspect-ratio: 1 \/ 1; background: #E7E3DB center\/cover no-repeat; \}/, 'the photograph is covered, never distorted; the phone keeps its square');
  /* the frame itself is the page frame: the same padding the header's inner edges use */
  assert.match(css, /\.a-hero, \.a-lede, \.a-pair, \.a-duo, \.a-close, \.a-sec\.tight,[\s\S]{0,120}max-width: var\(--a-frame\);[\s\S]{0,80}padding-left: var\(--a-gut\); padding-right: var\(--a-gut\);/);
});
