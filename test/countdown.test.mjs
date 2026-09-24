/* WEDDING FIRST (Owner, 22 Sep 2026): two countdowns on My Profile, one hierarchy — THE WEDDING (Sunday, 28 February 2027,
   Vientiane) primary, THE JOURNEY BEGINS (Sunday, 21 February 2027, Bangkok) secondary. Both computed from the local-day clock,
   never negative, never a clock; each with its own states; the numerals keep their width from the first paint; the choreography
   runs once and yields to reduced motion. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, plain, src, PEGGY } from './sandbox.mjs';

const MODS = ['assets/community.js'];
const at = (y, mo, d, h) => new Date(y, mo - 1, d, h == null ? 12 : h);

test('THE MODEL · wedding first: the two targets, the values from the clock (never written), the states before · today · journey · after, never negative, a day is a day whatever the hour', () => {
  const w = page({ auth: PEGGY, modules: MODS }); const C = w.SIYL_COMMUNITY;
  assert.deepEqual(plain(C.JOURNEY), { start: [2027, 2, 21], wedding: [2027, 2, 28], end: [2027, 3, 8] });
  const c0 = plain(C.countdowns(at(2026, 9, 22)));
  assert.deepEqual(c0.wedding, { state: 'before', n: 159, unit: 'days', eyebrow: 'The wedding is in', word: null, tail: 'Sunday, 28 February 2027 · Vientiane, Laos' });
  assert.deepEqual(c0.journey, { state: 'before', n: 152, unit: 'days', eyebrow: 'The journey begins in', word: null, tail: 'Sunday, 21 February 2027 · Bangkok, Thailand' });
  assert.equal(c0.phase, 'before');
  assert.equal(C.countdowns(at(2026, 9, 22, 23)).wedding.n, 159, 'whatever the hour'); assert.equal(C.countdowns(at(2026, 9, 23, 0)).wedding.n, 158);
  assert.equal(C.countdowns(at(2027, 2, 27)).wedding.unit, 'day'); assert.equal(C.countdowns(at(2027, 2, 20)).journey.unit, 'day');
  /* the journey begins */
  const c1 = plain(C.countdowns(at(2027, 2, 21)));
  assert.deepEqual(c1.journey, { state: 'today', n: 0, unit: '', eyebrow: 'The journey begins', word: 'Today', tail: 'Sunday, 21 February 2027 · Bangkok, Thailand' });
  assert.deepEqual(c1.wedding, { state: 'before', n: 7, unit: 'days', eyebrow: 'The wedding is in', word: null, tail: 'Sunday, 28 February 2027 · Vientiane, Laos' });
  /* under way, before the wedding */
  const c2 = plain(C.countdowns(at(2027, 2, 24)));
  assert.deepEqual(c2.journey, { state: 'journey', n: 4, unit: 'of 16', eyebrow: 'Journey day', word: null, tail: '21 February – 8 March 2027 · Thailand · Laos · China' });
  assert.equal(c2.wedding.n, 4); assert.equal(c2.wedding.state, 'before');
  /* the wedding day */
  const c3 = plain(C.countdowns(at(2027, 2, 28)));
  assert.deepEqual(c3.wedding, { state: 'today', n: 0, unit: '', eyebrow: 'The wedding', word: 'Today', tail: 'Sunday, 28 February 2027 · Vientiane, Laos' });
  assert.equal(c3.journey.state, 'journey'); assert.equal(c3.journey.n, 8);
  /* after the wedding, the journey still under way */
  const c4 = plain(C.countdowns(at(2027, 3, 3)));
  assert.deepEqual(c4.wedding, { state: 'after', n: 0, unit: '', eyebrow: 'The wedding', word: 'Married', tail: 'Sunday, 28 February 2027 · Vientiane, Laos' });
  assert.equal(c4.journey.n, 11); assert.equal(c4.journey.unit, 'of 16'); /* TO-00081 / TO-00082: “JOURNEY DAY · 3 OF 16” */
  assert.equal(C.countdowns(at(2027, 3, 8)).journey.n, 16, 'the last day');
  /* after the journey */
  const c5 = plain(C.countdowns(at(2027, 4, 1)));
  assert.deepEqual(c5.journey, { state: 'after', n: 16, unit: 'days', eyebrow: 'The journey', word: null, tail: '21 February – 8 March 2027 · Thailand · Laos · China' }); assert.equal(c5.wedding.word, 'Married');
  /* never negative, on every day of two years */
  for (let d = new Date(2026, 0, 1); d < new Date(2028, 0, 1); d = new Date(d.getTime() + 86400000)) { const c = C.countdowns(d); assert.ok(c.wedding.n >= 0 && c.journey.n >= 0, d.toDateString()); }
  /* the old single reading stands for the section's phase */
  assert.equal(C.countdown(at(2026, 9, 22)).n, 152); assert.equal(C.countdown(at(2027, 2, 28)).phase, 'wedding');
  const js = src('assets/community.js'); assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ''), /\b15[0-9]\b\s*(days|,)|\b16[0-9]\b\s*days/, 'no written count (in the code — a comment may quote an example sentence of TO-00087)');
});

test('THE PAGE · the wedding block first and primary, the journey second and secondary; the numerals keep their final width (the invisible final value beneath the live digits); the word states carry no zero; the section reveals once — a re-render never replays; reduced motion is the final state at once', () => {
  const w = page({ auth: PEGGY, modules: MODS }); const C = w.SIYL_COMMUNITY;
  const h = C.countdownHtml(at(2026, 9, 22));
  assert.match(h, /^<section class="prep-sec pf-count" id="countdown" data-countdown="before" data-wedding="before" data-journey="before" data-cd-reveal aria-label="The wedding is in 159 days\. The journey begins in 152 days\.">/); /* TO-00087 */
  assert.ok(h.indexOf('data-cd="wedding"') < h.indexOf('data-cd="journey"'), 'the wedding first');
  assert.match(h, /<div class="pf-cd pf-cd-primary" data-cd="wedding" data-cd-state="before"><p class="t-l1 pf-cd-eyebrow">The wedding is in<\/p><p class="pf-num" data-count-to="159" data-key="cd-wedding"><span class="pf-num-v pf-num-fixed"><span class="pf-num-size" aria-hidden="true">159<\/span><span class="pf-num-live">159<\/span><\/span><span class="pf-num-u">days<\/span><\/p><p class="t-l1 mute pf-cd-tail">Sunday, 28 February 2027 · Vientiane, Laos<\/p><\/div>/);
  assert.match(h, /<div class="pf-cd pf-cd-secondary" data-cd="journey" data-cd-state="before"><p class="t-l1 pf-cd-eyebrow">The journey begins in<\/p><p class="pf-num" data-count-to="152" data-key="cd-journey"><span class="pf-num-v pf-num-fixed"><span class="pf-num-size" aria-hidden="true">152<\/span><span class="pf-num-live">152<\/span>/); /* PRQ-01-09a: the real value from the first paint, never 0 */
  const day = C.countdownHtml(at(2027, 2, 28)); assert.match(day, /data-wedding="today" data-journey="journey"/); assert.match(day, /<p class="pf-num pf-num-word" data-key="cd-wedding"><span class="pf-num-v">Today<\/span><\/p>/); assert.doesNotMatch(day, /data-cd="wedding"[^]*?data-count-to="0"/, 'no zero on the wedding day');
  assert.match(day, /data-count-to="8" data-key="cd-journey"[^>]*><span class="pf-num-v pf-num-fixed"><span class="pf-num-size" aria-hidden="true">8<\/span>/);
  const after = C.countdownHtml(at(2027, 3, 5)); assert.match(after, /data-wedding="after"/); assert.match(after, /<span class="pf-num-v">Married<\/span>/); assert.match(day, /aria-label="The wedding is today\. Journey day 8 of 16\."/); assert.match(after, /aria-label="Married on Sunday, 28 February 2027\. Journey day 13 of 16\."/, 'PRQ-01-09d: the after-state is named correctly');
  /* the styles: the hierarchy and the choreography, reduced motion final at once */
  const css = src('profile.html');
  assert.match(css, /\.pf-cd-secondary \.pf-num-v\{font-size:44px/); assert.match(css, /\.pf-num-size\{visibility:hidden\}\.pf-num-live\{position:absolute;left:0;top:0/); assert.match(css, /\.pf-num-v\{font-size:96px/); assert.match(css, /@media\(min-width:768px\)\{\.pf-count\{display:grid;grid-template-columns:minmax\(0,7fr\) minmax\(0,5fr\)/); assert.match(css, /\.pf-cd-primary \.pf-num-v\{font-size:128px\}/); assert.match(css, /\.pf-cd-primary \.pf-num-v\{font-size:152px\}/);
  assert.match(css, /\.pf-count \.pf-num\{transform:translate3d\(0,16px,0\) scale\(\.985\)/); assert.match(css, /\.pf-count\.is-in \.pf-cd-secondary \.pf-num\{transition-delay:\.57s\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.pf-count \.pf-cd-eyebrow,\.pf-count \.pf-num,\.pf-count \.pf-cd-tail\{opacity:1;transform:none;transition:none/);
  assert.doesNotMatch(css, /pf-count[^}]*animation:|pf-cd[^}]*infinite/, 'no loop');
  /* the wire: the section joins the observer; without one (or under reduced motion) it is in at once; the numbers are final from the first paint (PRQ-01-09a) */
  const js = src('assets/community.js'); assert.match(js, /cd = root\.querySelector\('\[data-cd-reveal\]'\)/); assert.match(js, /if \(cd\) \{ cd\.classList\.add\('is-in'\); shown\.cd = true; \}/); /* PRQ-01-09a: no count-up any more — the number is written at its value and stays; the section's reveal is the only movement */ assert.doesNotMatch(js, /delay = key === 'cd-journey'/); assert.match(js, /if \(v && v\.textContent !== String\(to\)\) v\.textContent = String\(to\);/);
  /* reduced motion in the sandbox: the numerals are final in the markup itself */
  const calm = page({ auth: PEGGY, modules: MODS, reducedMotion: true }); const hc = calm.SIYL_COMMUNITY.countdownHtml(at(2026, 9, 22));
  assert.match(hc, /class="prep-sec pf-count is-in"/); assert.match(hc, /<span class="pf-num-live">159<\/span>/);
  assert.match(src('profile.html'), /CM\.countdownHtml\(\)\+CM\.communityHtml\(CM\.data\(\),me\)\+CM\.numbersHtml\(\)/, 'still before WHO’S JOINING US');
});
