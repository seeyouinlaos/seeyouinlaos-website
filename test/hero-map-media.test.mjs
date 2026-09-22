/* ============================================================================
   HERO CONTROLS · THE IPAD MAP · VIENTIANE FROM DRIVE · THE AFTER-WEDDING
   GALLERY (Owner, 22 Sep 2026).

   · The map of Laos carries the map's own proportions, so it fills the width
     it is given at every class instead of floating in an empty block; on a
     tablet held upright the duo stacks and the map has the whole column.
   · Vientiane's media is the Owner's Drive folder as it stands today: the two
     Sacred Heart cathedral frames he removed there are gone here too — files
     and references — the aerial at dusk and Patuxai from above arrive, and the
     card's film is the folder's own "night of Vientiane" (silent, local).
   · "After the Wedding" is one card gallery of the whole Lijiang 02 folder:
     nine photographs, chevrons, swipe, the arrow keys, "1 / 9", wrapping, and
     no autoplay anywhere near it.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, src } from './sandbox.mjs';

const VTE = ['002-vientiane-10-aerial-dusk.jpg', '002-vientiane-03-street.jpg', '002-vientiane-04-reclining-buddha.jpg',
  '002-vientiane-05-patuxai.jpg', '002-vientiane-11-patuxai-from-above.jpg', '002-vientiane-06-temple-dusk.jpg',
  '002-vientiane-07-pha-that-luang-dusk.jpg', '002-vientiane-08-pha-that-luang-gate.jpg', '002-vientiane-09-storm-sky.jpg'];
const GONE = ['002-vientiane-01-cathedral-nave.jpg', '002-vientiane-02-sacred-heart.jpg'];

test('THE MAP OF LAOS · read, not decorated: the frame carries the map\'s own 838 × 980, contained, never cropped or stretched; a tablet held upright gives it the whole column; the photograph beside it takes the same height; no width overflows', () => {
  const css = src('assets/aman.css'), h = src('index.html');
  assert.match(h, /<div class="am a-map" style="background-image:url\(assets\/images\/city\/laos-map\.jpg\)" role="img" aria-label="The map of Laos — Vientiane on the Mekong"><\/div>/, 'the map is named and carries no inline sizing of its own');
  assert.match(css, /\.a-duo \.am\.a-map \{ aspect-ratio: 838 \/ 980; background-size: contain; background-color: #E7E3DB; \}/);
  assert.match(css, /\.a-duo \.am\.a-map \+ \.am \{ aspect-ratio: auto; height: 100%;/, 'the photograph beside the map matches its height');
  const tp = css.slice(css.indexOf('@media (min-width: 768px) and (max-width: 1199px) and (orientation: portrait) {'));
  assert.ok(tp.length > 0, 'the tablet-upright rule exists');
  assert.match(tp.slice(0, 500), /\.a-duo \{ grid-template-columns: minmax\(0, 1fr\);/, 'upright: one column, the map at full width');
  assert.match(tp.slice(0, 500), /width: min\(100%, calc\(62vh \* 838 \/ 980\)\)/, 'and capped by the height of the screen, never by a device name');
  assert.match(css, /@media \(min-width: 768px\) and \(orientation: landscape\) \{\s*\.a-duo \.am\.a-map \{ justify-self: center; width: min\(100%, calc\(76vh \* 838 \/ 980\)\); \}/);
  assert.doesNotMatch(css.slice(css.indexOf('.a-duo .am.a-map')), /background-size: cover|object-fit: fill|transform: scale/, 'never cropped, never stretched');
  /* the file the rules are built on */
  const map = join(ROOT, 'assets/images/city/laos-map.jpg');
  assert.ok(existsSync(map));
  const dim = execFileSync('magick', ['identify', '-format', '%wx%h', map], { encoding: 'utf8' });
  assert.equal(dim, '838x980', 'the ratio in the stylesheet is the file\'s own');
});

test('VIENTIANE · the Drive folder 002 - City - Vientiane as it stands today: nine photographs, the two Sacred Heart cathedral frames gone from the page and from the disk, the aerial and Patuxai from above in place, every frame on disk and clean', () => {
  const d = src('destination.html');
  const gal = d.slice(d.indexOf('<div class="dgal" aria-label="Vientiane">'), d.indexOf('<p class="a-galcap">Vientiane</p>'));
  const frames = [...gal.matchAll(/<img src="assets\/images\/city\/([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(frames, VTE, 'the current folder, in the chapter\'s reading order');
  for (const f of frames) { const p = join(ROOT, 'assets/images/city/' + f); assert.ok(existsSync(p), f); assert.ok(statSync(p).size < 900000, f + ' is web-sized'); }
  for (const g of GONE) {
    assert.ok(!existsSync(join(ROOT, 'assets/images/city/' + g)), g + ' is deleted, not merely unlinked');
    for (const page of ['index.html', 'destination.html', 'journeys.html', 'voyage.html']) assert.doesNotMatch(src(page), new RegExp(g.replace(/\./g, '\\.')), g + ' is not referenced by ' + page);
  }
  assert.doesNotMatch(gal, /cathedral|Sacred Heart/i, 'no church remains among the photographs of the chapter');
  /* the two new frames are the Owner's, and recorded as such */
  const map = src('assets/images/ASSET-MAP.md');
  assert.match(map, /002-vientiane-10-aerial-dusk\.jpg[^\n]*1wfsga36ChOFV4bXoItW3pWm-HXIAhFVr[^\n]*IMG_2778\.JPG/);
  assert.match(map, /002-vientiane-11-patuxai-from-above\.jpg[^\n]*1CWnns9YFS1CHPIDzcRPvs6IzlFaHsLEJ/);
  assert.match(map, /17Yvh83Qs-SVs5JiCE9nDsgH0toFcBncr/, 'the folder itself is traceable');
  /* no camera metadata is published with a private photograph */
  for (const f of ['002-vientiane-10-aerial-dusk.jpg', '002-vientiane-11-patuxai-from-above.jpg']) {
    const b = readFileSync(join(ROOT, 'assets/images/city/' + f));
    assert.equal(b.indexOf(Buffer.from('Exif')), -1, f + ' carries no EXIF');
  }
});

test('THE VIENTIANE FILM · the Owner\'s "night of Vientiane" replaces the Buddha-statue clip everywhere, silent, local, small, with its own poster; no page still names the cloister', () => {
  const v = join(ROOT, 'assets/video/vientiane-card.mp4');
  assert.ok(existsSync(v)); assert.ok(statSync(v).size < 4.5 * 1024 * 1024, 'within the card-clip budget');
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt', '-of', 'csv=p=0', v], { encoding: 'utf8' }).trim().split('\n');
  assert.equal(probe.length, 1, 'one stream only — the film is silent (a card clip never speaks)');
  assert.match(probe[0], /^h264,video,720,1280,yuv420p$/, 'the source geometry, untouched');
  for (const page of ['index.html', 'destination.html']) {
    const s = src(page);
    assert.match(s, /data-video="assets\/video\/vientiane-card\.mp4" style="background-image:url\(assets\/images\/city\/002-vientiane-card-poster\.jpg\)" role="img" aria-label="A night of Vientiane — the train at the platform, the neon streets of the evening"/, page);
    assert.doesNotMatch(s, /Wat Si Saket, Vientiane — the Buddhas in their niches/, page + ' no longer describes the retired clip');
  }
  assert.match(src('assets/images/ASSET-MAP.md'), /video\/vientiane-card\.mp4[^\n]*1UQn3L-tj4zpwB5n-MOZyxfRUfQ6LWAYI/, 'the Drive file is recorded');
  assert.ok(existsSync(join(ROOT, 'assets/images/city/002-vientiane-card-poster.jpg')));
});

test('AFTER THE WEDDING · the whole Lijiang 02 folder in one card gallery: nine frames in the Owner\'s order, every frame on disk, chevrons · swipe · the arrow keys · "1 / 9" · wrapping, no autoplay, and the card keeps its title, its dates, its words and Discover more', () => {
  const h = src('index.html'), js = src('assets/cardgal.js'), css = src('assets/aman.css');
  const card = h.slice(h.indexOf('<div class="cg am" data-cardgal'), h.indexOf('<div class="ac">', h.indexOf('<div class="cg am" data-cardgal')));
  const frames = [...card.matchAll(/(?:src|data-src)="assets\/images\/city\/(004-lijiang-aw-\d\d\.jpg)"/g)].map((m) => m[1]);
  assert.deepEqual(frames, Array.from({ length: 9 }, (_, i) => '004-lijiang-aw-' + String(i + 1).padStart(2, '0') + '.jpg'), 'nine, in a deterministic order');
  for (const f of frames) { const p = join(ROOT, 'assets/images/city/' + f); assert.ok(existsSync(p), f); assert.ok(statSync(p).size < 520000, f + ' is web-sized'); }
  assert.equal((card.match(/href="journeys\.html#j-mu9646"/g) || []).length, 9, 'every frame is the same journey link the card always was');
  assert.equal((card.match(/loading="lazy"/g) || []).length, 8, 'only the first photograph is asked for at once');
  assert.match(h, /<h3>After the Wedding<\/h3>/); assert.match(h, /<p class="an">1 – 8 March 2027<\/p>/);
  assert.match(h, /Kunming, the train through the gorges to Lijiang, and two closing nights back in Bangkok\./);
  assert.match(h, /<a class="a-more" href="journeys\.html#j-mu9646">Discover more<\/a>/, 'Discover more is untouched');
  assert.match(h, /<script src="assets\/cardgal\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  /* the behaviour */
  assert.match(js, /function go\(k\) \{ i = \(k \+ n\) % n; paint\(\); \}/, 'the last frame wraps to the first and back');
  assert.match(js, /prev\.setAttribute\('aria-label', 'The previous photograph'\); next\.setAttribute\('aria-label', 'The next photograph'\);/);
  assert.match(js, /count\.textContent = \(i \+ 1\) \+ ' \/ ' \+ n;/, 'the quiet "1 / 9"');
  assert.match(js, /if \(e\.key !== 'ArrowLeft' && e\.key !== 'ArrowRight'\) return;/);
  assert.match(js, /addEventListener\('touchend'[\s\S]*go\(i \+ \(dx < 0 \? 1 : -1\)\)/, 'a swipe turns the photograph');
  assert.match(js, /if \(moved\) \{ e\.preventDefault\(\);/, 'a swipe is never a tap on the link');
  assert.doesNotMatch(js, /setInterval|setTimeout\([^)]*\d{3,}/, 'no autoplay, no timer — the guest turns the page');
  /* the treatment: fine lines, no glossy button, quiet until asked for */
  assert.match(css, /\.cg-nav i \{[\s\S]{0,140}border-top: 1px solid #FFFFFF; border-right: 1px solid #FFFFFF;/);
  assert.match(css, /\.cg-nav \{[\s\S]{0,260}opacity: \.62;/);
  assert.match(css, /\.cg \.cg-count \{[\s\S]{0,200}font-size: 10px;/);
  assert.doesNotMatch(css.slice(css.indexOf('.cg-nav {')), /border-radius: 50%|box-shadow: 0 2px 8px/, 'no heavy circles, no glossy buttons');
  assert.match(css, /\.cg \{ position: relative; overflow: hidden; touch-action: pan-y; \}/, 'a horizontal gesture belongs to the gallery, a vertical one to the page');
});
