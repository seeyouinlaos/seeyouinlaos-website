/* THE WEDDING DINNER · ONE record, one detail (Owner, 21 Sep 2026 · the consolidation). The dinner existed three times: the pair
   section on The Wedding, a second static gallery block beside it, and the venue map's own photo-and-thumbnail treatment with a
   diverging image list. Now: assets/wedding-dinner.js holds the facts and every approved photograph; The Wedding shows the one
   detail (#dinner) with the one carousel; the venue map keeps an index entry that points to it; nothing else presents the dinner. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT, src, plain } from './sandbox.mjs';

const load = () => { const w = {}; const sb = { window: w, document: undefined, globalThis: null }; vm.createContext(sb); for (const f of ['assets/wedding-dinner.js', 'assets/venue-data.js', 'assets/stay-media.js', 'assets/rooms-data.js']) vm.runInContext(src(f), sb, { filename: f }); return w; };
const W = load(), WD = W.SIYL_WEDDING_DINNER;

test('THE RECORD · the facts once (Sunday 28 Feb 2027 · 19:30 · Poolside · Souphattra Heritage · Black Tie · the Chinese sharing menu); thirteen approved photographs, each on disk, none twice, the candlelit table and the dim sum among them', () => {
  assert.equal(WD.date, 'Sunday, 28 February 2027'); assert.equal(WD.time, '19:30'); assert.equal(WD.place, 'poolside'); assert.equal(WD.venue, 'Souphattra Heritage Vientiane'); assert.equal(WD.dress, 'Black Tie');
  assert.match(WD.copy, /Chinese sharing menu/); assert.equal(WD.seating, 'The long table beside the water — side A along the pool, side B facing it.', 'TO-02011'); assert.doesNotMatch(WD.copy + WD.seating, /cocktail|second dinner|two dinners/i);
  assert.equal(WD.href, 'voyage.html#dinner'); assert.equal(WD.dressHref, 'wedding-preparation.html#dress-code');
  const srcs = WD.media.map((m) => m.src);
  assert.equal(srcs.length, 13); assert.equal(new Set(srcs).size, 13, 'no photograph twice');
  for (const m of WD.media) { assert.ok(existsSync(join(ROOT, m.src)), m.src + ' is on disk'); assert.ok(m.alt && m.source, m.src + ' carries its words and its Drive source'); }
  const set056 = srcs.filter((s) => /056-wedding-dinner-/.test(s)); assert.equal(set056.length, 11, 'every frame of Drive 056');
  assert.ok(srcs.includes('assets/images/event/056-wedding-dinner-08-long-table-candlelight.jpg'), 'the dark candlelit table');
  assert.ok(srcs.includes('assets/images/event/056-wedding-dinner-11-sharing-menu.jpg') && srcs.includes('assets/images/event/053-wedding-dinner-sharing-menu.jpg'), 'the dessert / dim sum frames of both treatments');
  assert.ok(srcs.includes('assets/images/venue/pool-terrace-oblique-1600.jpg'), 'the pool terrace from the upper floor (the venue map\'s unique frame)');
  assert.ok(srcs.includes('assets/images/event/056-wedding-dinner-07-pool-aerial.jpg') && srcs.includes('assets/images/event/056-wedding-dinner-03-poolside-loungers.jpg'), 'the pool from above and the pool with the houses — the same photographs the venue map once listed under 053');
  assert.equal(WD.lead, 'assets/images/event/056-wedding-dinner-01-poolside-from-above.jpg');
  assert.equal((WD.galleryHtml().match(/<img /g) || []).length, 13); assert.doesNotMatch(WD.galleryHtml(), /<h2|<h3|caption/, 'frames only — no second title');
});

test('ONE DETAIL under The Wedding: #dinner with the eyebrow, the title, the copy, the dress and the one gallery drawn from the record; the second static block is gone; the venue map\'s dinner is an index entry pointing to #dinner; no duplicate anchor', () => {
  const vy = src('voyage.html');
  assert.equal((vy.match(/id="dinner"/g) || []).length, 1, 'one anchor'); assert.equal((vy.match(/<h2>Wedding Dinner<\/h2>/g) || []).length, 1, 'one title');
  const sec = vy.slice(vy.indexOf('<section class="a-sec a-pair rev" id="dinner"'), vy.indexOf('<!-- THE VENUE'));
  assert.match(sec, /<p class="a-eyebrow">19:30 · Souphattra Heritage · poolside<\/p>/); assert.match(sec, /An evening poolside, bringing the wedding day to its final and longest chapter — a Chinese sharing menu at the table, and the night to follow\./);
  assert.match(sec, /<p class="a-eyebrow"[^>]*>Dress: Black Tie<\/p>/); assert.match(sec, /href="wedding-preparation\.html#dress-code">View dress code</);
  assert.match(sec, /<section class="a-sec a-dest a-wdgal" aria-label="The wedding dinner in photographs" data-wedding-dinner-media>\s*<div class="dgal" aria-label="The wedding dinner in photographs" data-wedding-dinner-gallery><\/div>/, 'the gallery is the record\'s, right under the detail');
  assert.doesNotMatch(sec, /<img /, 'no image list written into the page'); assert.doesNotMatch(sec, /data-motion="reveal"[^>]*data-wedding-dinner-media|a-wdgal" data-motion/, 'the gallery never waits hidden');
  assert.equal((vy.match(/wedding-dinner-\d\d-/g) || []).length, 1, 'the page names one dinner frame: the lead of the pair');
  assert.ok(vy.indexOf('<script src="assets/wedding-dinner.js') < vy.indexOf('<script src="assets/refgal.js'), 'the record fills the gallery before the carousel upgrades it');
  const dz = W.SIYL_VENUE_DATA.zones.find((z) => z.id === 'dinner');
  assert.equal(dz.index, true); assert.deepEqual(plain(dz.photos), []); assert.equal(dz.href, '#dinner'); assert.equal(dz.cta, 'The Wedding Dinner'); assert.equal(dz.story, 'The long table beside the water — side A along the pool, side B facing it.', 'TO-01990: the pointer “under 04” is gone, the index entry’s call is the way'); assert.doesNotMatch(dz.story, /under 04/);
  assert.equal(W.SIYL_VENUE_DATA.zones.filter((z) => /dinner/i.test(z.label)).length, 1, 'one dinner on the map');
  assert.match(src('assets/venue.js'), /\(photo \? '<div class="venue-photo/, 'the map renders an index entry without a photograph'); assert.match(src('assets/venue.js'), /if \(!z\.photos \|\| !z\.photos\[k\]\) return;/);
});

test('EVERY OTHER SURFACE is a teaser or a link — never a second presentation; the facts and the frame come from the record; event media stays apart from accommodation media', () => {
  const ix = src('index.html');
  assert.doesNotMatch(ix, /Wedding Dinner<\/h[123]>|056-wedding-dinner|053-wedding-dinner|data-wedding-dinner/, 'the home page tells the day and links to The Wedding — no dinner detail, no dinner gallery');
  assert.match(ix, /<a class="a-link" href="voyage\.html">Discover The Wedding<\/a>/);
  assert.match(src('profile.html'), /dinner:\(window\.SIYL_WEDDING_DINNER\?SIYL_WEDDING_DINNER\.lead:/); assert.match(src('profile.html'), /<script src="assets\/wedding-dinner\.js/);
  for (const f of ['index.html', 'wedding.html', 'wedding-preparation.html', 'profile.html', 'review.html', 'journeys.html', 'your-journey.html', 'tickets.html']) assert.doesNotMatch(src(f), /class="dgal"[^>]*dinner|data-wedding-dinner-gallery/, f + ' has no dinner gallery of its own');
  for (const f of ['assets/aman.js', 'assets/journey.js']) for (const m of src(f).matchAll(/voyage\.html#([a-z]+)/g)) if (/dinner/.test(m[0])) assert.equal(m[1], 'dinner');
  /* no play / pause on a manual gallery */
  assert.doesNotMatch(src('assets/refgal.js') + src('assets/venue.js') + src('assets/wedding-dinner.js'), /data-clip|pause|autoplay|setInterval/i, 'a manual carousel: swipe, previous, next, a count — no video semantics');
  /* the two media domains */
  const stay = new Set(Object.keys(W.SIYL_STAY_MEDIA).filter((k) => k !== '_taxonomy').flatMap((k) => W.SIYL_STAY_MEDIA[k].images.map((i) => i.src)));
  for (const m of WD.media) { assert.ok(!stay.has(m.src), m.src + ' is not a hotel frame'); assert.ok(W.SIYL_STAY_ART.approved('souphattra').indexOf(m.src) < 0, m.src + ' is never a Souphattra accommodation frame'); }
  for (const p of W.SIYL_STAY_ART.approved('souphattra')) assert.doesNotMatch(p, /wedding-dinner|\/venue\//, 'the hotel never draws the dinner\'s photographs');
});

test('THE WAY FROM THE VENUE (Owner\'s iPad, 21 Sep 2026): the index entry\'s call is a native same-page link to the one #dinner — no preventDefault, no second route; the page carries a scroll padding for the sticky header so the anchor lands below it, never beneath; the target is revealed at once on the tap; the guard only ever brings the same target into view; one #dinner id on the page', () => {
  const v = src('assets/venue.js'), css = src('assets/aman.css'), html = src('voyage.html');
  assert.match(v, /<a class="a-link"' \+ \(z\.swap \? ' data-cta-swap' : ''\) \+ ' href="' \+ esc\(z\.href\) \+ '">/, 'a real anchor with the real href');
  const guard = v.slice(v.indexOf("frag.querySelectorAll('a.a-link[href^=\"#\"]')"), v.indexOf('if (announce && changed)'));
  assert.ok(guard.length > 100, 'the guard stands beside the link'); assert.doesNotMatch(guard, /preventDefault|location\.assign|location\.replace|reload|open\(/, 'native navigation is never replaced');
  assert.match(guard, /t\.classList\.add\('is-in'\)/, 'the target is revealed at once'); assert.match(guard, /scrollIntoView\(\{ block: 'start' \}\)/, 'the fallback brings the same target into view'); assert.match(guard, /root\.location\.hash = '#' \+ id/, 'the fallback sets the same fragment');
  assert.match(css, /html \{ scroll-padding-top: calc\(92px \+ env\(safe-area-inset-top, 0px\)\); \}/, 'the header band (~56 px) + the 14 px reveal travel + a quiet gap');
  assert.equal((html.match(/id="dinner"/g) || []).length, 1, 'one #dinner'); assert.equal((html.match(/data-wedding-dinner(?![-\w])/g) || []).length, 1, 'one full detail');
  assert.doesNotMatch(src('assets/venue.css'), /\.venue-detail-in \{[^}]*pointer-events: none/, 'the living detail never blocks the tap'); assert.match(src('assets/venue.css'), /\.venue-detail-in\.is-leaving \{[^}]*pointer-events: none/, 'only the leaving one is out of the way');
});
