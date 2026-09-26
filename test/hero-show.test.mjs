/* THE FIRST-PAGE HERO (Owner, 21 Sep 2026; the pace and the dots 22 Sep 2026; the Drive sync and the films 26 Sep 2026): the
   Hero's slides are the Drive collection "000 - Hero Image", recorded by file id in src/hero-media.json and written into
   index.html by src/build-hero.cjs — the first item is the frame itself (its poster or photograph on screen at once), the
   others layers of the same frame, in the record's canonical order (the Drive titles; since 26 Sep 2026 the main video last). A photograph holds 3 s; a film plays over its poster, always starting
   muted, and the show moves on when it ends; Play / Pause on a film, Sound on / Mute only on a film with an audio track. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT, src } from './sandbox.mjs';

const REC = JSON.parse(src('src/hero-media.json'));

test('HERO SYNC · the record is the Drive collection by file id, in its canonical order (the main video last); index.html is exactly its Hero; every asset exists; no Drive id or URL reaches the page; nothing obsolete remains', () => {
  assert.equal(REC.collection, '000 - Hero Image'); assert.match(REC.folderId, /^[\w-]{20,}$/);
  const ids = REC.items.map((x) => x.driveId); assert.equal(new Set(ids).size, ids.length, 'one file, one slide');
  /* THE CANONICAL ORDER (Owner, 26 Sep 2026 · Haruthai): the main video plays LAST; the others in Drive title order */
  assert.equal(REC.order, 'explicit'); assert.match(REC.orderNote, /main video .* LAST/);
  assert.deepEqual(REC.items.map((x) => x.title), ['000_Hero', '001_Hero', '002_Hero', '003_Hero', '004_Hero', '000 - Hero_Main_Video']);
  assert.equal(REC.items[5].driveId, '1TcVUGDzOHp7qdsO-5ekMXEYV38SCL1B6', 'the main video, by its Drive id, is the sixth and last slide');
  assert.deepEqual(REC.items.map((x) => x.kind), ['video', 'image', 'image', 'image', 'image', 'video']);
  assert.equal(spawnSync('node', [join(ROOT, 'src/build-hero.cjs'), '--check'], { encoding: 'utf8' }).status, 0, 'index.html is the record\'s Hero');
  const h = src('index.html');
  for (const x of REC.items) { assert.ok(existsSync(join(ROOT, x.asset)), x.asset); if (x.poster) assert.ok(existsSync(join(ROOT, x.poster)), x.poster); }
  for (const x of REC.items) assert.ok(!h.includes(x.driveId), 'no Drive id on the page');
  assert.doesNotMatch(h, /drive\.google\.com|docs\.google\.com/, 'no Drive URL on the page');
  const [first, ...rest] = REC.items;
  assert.match(h, new RegExp('<div class="am" style="background-image:url\\(' + first.poster.replace(/[.]/g, '\\.') + '\\);--fp-p:' + first.focal.p + ';[^"]*" role="img" aria-label="' + first.alt + '" data-hero-show data-hero-video="media/' + first.asset.split('/').pop().replace(/[.]/g, '\\.') + '" data-audio="0">'), 'the first slide is the frame itself: the terrace film over its poster (no audio track), served by the byte-range route');
  const layers = [...h.matchAll(/<span class="a-hero-slide" data-src="([^"]+)"( data-hero-video="([^"]+)" data-audio="([01])")? style="(--fp-p:[^"]+)" aria-hidden="true"><\/span>/g)];
  assert.deepEqual(layers.map((m) => m[3] || m[1]), rest.map((x) => (x.kind === 'video' ? 'media/' + x.asset.split('/').pop() : x.asset)), 'the layers in order');
  assert.equal(layers.length, 5); assert.equal(layers[4][4], '1', 'the last slide is the main video, with its audio track');
  for (const m of layers) assert.match(m[5], /^--fp-p:\d+% \d+%;--fp-tp:\d+% \d+%;--fp-tl:\d+% \d+%;--fp-d:\d+% \d+%$/, 'a focal point per viewport class');
  for (const x of REC.items.filter((y) => y.kind === 'image')) { assert.ok(statSync(join(ROOT, x.asset)).size < 260000, x.asset + ' is web-sized'); assert.equal(readFileSync(join(ROOT, x.asset)).indexOf(Buffer.from('Exif')), -1, x.asset + ' carries no EXIF'); }
  for (const old of ['home-hero-02', 'home-hero-03', 'home-hero-04', 'home-hero-05', 'home-hero-courtyard']) { assert.ok(!existsSync(join(ROOT, 'assets/images/hero/' + old + '.jpg')), old + ' is retired'); assert.ok(!h.includes(old), old + ' is referenced nowhere'); }
  const hero = h.slice(h.indexOf('<section class="a-hero">'), h.indexOf('</section>', h.indexOf('<section class="a-hero">'))).replace(/<!--[\s\S]*?-->/g, '');
  assert.match(hero, /<div class="a-hero-frame">\s*<div class="am"/, 'the picture sits in a frame of its own width');
  assert.match(hero, /<div class="a-hero-ctl" data-hero-ctl hidden><button type="button" class="a-clip-btn" data-hero-play aria-label="Play the film">[\s\S]*data-hero-sound aria-label="Sound on" hidden>/, 'the site\'s clip controls, hidden until a film is on screen');
  assert.doesNotMatch(hero, /data-video=|<video|autoplay/, 'no card-clip wiring and no autoplay written into the page');
  assert.match(h, /<p class="a-eyebrow">Sunday, 28 February 2027 · Vientiane, Laos<\/p>\s*<h1>Our wedding,<br>and the journey around it\.<\/h1>/, 'the words as approved (TO-03436 / TO-03437)');
  assert.match(h, /<script src="assets\/hero-show\.js(\?v=[0-9a-f]{8})?"><\/script>/);
});

test('HERO FILMS · the files are the Drive originals remuxed losslessly (index first); the audio track is exactly what the record says (ffprobe)', () => {
  let ffprobe = null; for (const c of ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', 'ffprobe']) { if (spawnSync(c, ['-version']).status === 0) { ffprobe = c; break; } }
  for (const x of REC.items.filter((y) => y.kind === 'video')) {
    const f = join(ROOT, x.asset), head = readFileSync(f).subarray(0, 4096).toString('latin1');
    assert.ok(head.indexOf('moov') >= 0, x.asset + ': the index is first (streams at once)');
    assert.ok(Math.abs(statSync(f).size - x.size) < 4096, x.asset + ': the Drive original, not a re-encode');
    if (!ffprobe) continue;
    const s = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt', '-of', 'json', f], { encoding: 'utf8' })).streams;
    assert.ok(s.some((y) => y.codec_type === 'video' && y.codec_name === 'h264' && y.pix_fmt === 'yuv420p' && y.width === x.width && y.height === x.height), x.asset + ': H.264, its own size');
    assert.equal(s.some((y) => y.codec_type === 'audio'), x.audio, x.asset + ': audio track as recorded');
  }
});

test('HERO BEHAVIOUR · a photograph holds 3 s, a film runs to its end; a film always starts muted; Play / Pause on a film, Sound on only with an audio track; reduced motion never autoplays; off screen or a hidden tab rests the film; the next picture fetched only before its turn', () => {
  const js = src('assets/hero-show.js'), css = src('assets/aman.css');
  assert.match(js, /var HOLD = 3000, FADE = 1000;/);
  assert.match(js, /function begin\(\) \{\s*if \(calm \|\| document\.hidden\) return;\s*if \(isFilm\(i\) && inView\) run\(false\); else schedule\(\);/, 'a photograph holds, a film plays');
  assert.match(js, /v\.addEventListener\('ended', function \(\) \{ if \(i === n && !held && !calm\) step\(\);/, 'the show moves on when the film ends');
  assert.match(js, /if \(!byGuest\) v\.muted = true;/, 'the show never starts a film with sound');
  assert.match(js, /v\.muted = true; v\.defaultMuted = true; v\.setAttribute\('muted', ''\);/); assert.match(js, /v\.setAttribute\('playsinline', ''\)/);
  assert.doesNotMatch(js, /autoplay|v\.muted = false/, 'no autoplay attribute, sound only by the guest');
  assert.match(js, /soundBtn\.hidden = !hasSound\(i\);/, 'no sound control on a film without an audio track');
  assert.match(js, /ctl\.hidden = !on;/, 'no film controls on a photograph');
  assert.match(js, /else if \(v\.paused && !v\.ended && !held && !calm && v\.muted && !document\.hidden\) run\(false\);/, 'back on screen: continues only while muted');
  assert.match(js, /p\.catch\(function \(\) \{ paint\(\); if \(!byGuest && i === n && !held && !calm\) schedule\(\); \}\);/, 'a refused autoplay: the poster stands, the show goes on');
  assert.match(js, /if \(calm\) \{ frame\.setAttribute\('data-hero-state', 'still'\); return; \}/, 'reduced motion: nothing moves by itself');
  assert.match(js, /var im = new Image\(\);[\s\S]*im\.src = src\(n\);/, 'a picture is fetched on demand');
  assert.match(js, /var next = \(i \+ 1\) % count;/, 'the loop');
  assert.match(css, /\.a-hero-video \{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: var\(--fp-p, center\);/, 'a film is covered and positioned like a photograph — never stretched');
  for (const q of ['--fp-tp', '--fp-tl', '--fp-d']) assert.match(css, new RegExp('\\.a-hero-video \\{ object-position: var\\(' + q));
  assert.match(css, /\.a-hero-slide \{ position: absolute; inset: 0; background: center\/cover no-repeat; opacity: 0; transition: opacity 1000ms ease-in-out;/);
  assert.match(css, /\.a-hero \.am \{ position: relative; overflow: hidden; \}/, 'the frame clips its layers');
  assert.doesNotMatch(css.slice(css.indexOf('.a-hero-slide'), css.indexOf('.a-hero-slide') + 600), /transform|scale\(|translate/, 'no zoom, no Ken Burns');
  const th = JSON.parse(src('src/i18n-th.json'));
  for (const k of ['Play', 'Pause', 'Sound on', 'Mute', 'Play the film', 'Pause the film', 'Bangkok at night, a short film']) assert.ok(th.exact[k], 'Thai: ' + k);
  assert.ok(th.templates.some((t) => t.en === 'Film {x} of {x}'), 'Thai: the film dot');
});

test('THE FRAME PER VIEWPORT CLASS (Owner, 21 Sep 2026): the phone keeps its square; a tablet upright frames 4:5, a tablet on its side and the desktop 3:2, bounded and centred; the 16:9 banner that cut the couple is overridden; each class reads its own focal point; nothing is stretched, extended or blurred', () => {
  const css = src('assets/aman.css');
  assert.match(css, /\.a-hero \.am \{ width: 100%; height: auto; aspect-ratio: 1 \/ 1;/, 'the phone square, untouched');
  assert.match(css, /\.a-hero \.am, \.a-hero-slide \{ background-position: var\(--fp-p, center\); \}/);
  const at = (q) => { const i = css.indexOf(q); assert.ok(i > 0, q); return css.slice(i, css.indexOf('\n}', i)); };
  const tp = at('@media (min-width: 768px) and (orientation: portrait) {'), tl = at('@media (min-width: 768px) and (orientation: landscape) {'), d = at('@media (min-width: 1200px) {');
  /* SUPERSEDED IN PART (Owner, 25 Sep 2026 · the first page as one system, promoted site-wide by the layout QA agent): the
     frame closes on the content wall — no 720 / 880 / 1000 px cap — and landscape screens frame 4 : 3 (never shallower
     than 3 : 2, the max-height floor). The per-class focal points and "positioned only" stand. */
  assert.match(tp, /\.a-hero \.am \{ aspect-ratio: 4 \/ 5; \}/); assert.match(tp, /background-position: var\(--fp-tp, var\(--fp-p, center\)\)/);
  assert.match(tl, /\.a-hero \.am \{ aspect-ratio: 4 \/ 3; \}/); assert.match(tl, /background-position: var\(--fp-tl, var\(--fp-p, center\)\)/);
  assert.match(d, /\.a-hero \.am \{ aspect-ratio: 4 \/ 3; \}/); assert.match(d, /background-position: var\(--fp-d, var\(--fp-p, center\)\)/);
  assert.match(css, /\.a-hero \.am, \.a-hero \.ah \{ max-width: none; margin-left: 0; margin-right: 0; \}/, 'the words begin at the frame\'s edge, which is the wall\'s');
  for (const blk of [tp, tl, d]) assert.doesNotMatch(blk, /transform|scale\(|filter|blur|object-fit: fill|background-size/, 'positioned only');
  const last16 = css.lastIndexOf('.a-hero .am { width: 100%; aspect-ratio: 16 / 9; }'), first16 = css.indexOf('.a-hero .am { aspect-ratio: 16 / 9; }');
  assert.ok(css.indexOf('@media (min-width: 768px) and (orientation: portrait) {') > Math.max(last16, first16), 'the per-class frames stand after every 16:9 rule — the cascade decides');
});

test('THE DOTS (Owner, 22 Sep 2026): one small dot per slide, centred at the foot of the photograph, the active one filled; a dot jumps straight to its photograph and the clock starts again; real buttons with names, the arrow keys, a swipe; no dot ever moves the page', () => {
  const js = src('assets/hero-show.js'), css = src('assets/aman.css'), h = src('index.html');
  /* built from the slides themselves — the count cannot drift from the photographs */
  assert.match(js, /for \(var k = 0; k < count; k\+\+\)/); assert.match(js, /b\.setAttribute\('aria-label', \(isFilm\(k\) \? 'Film ' : 'Photograph '\) \+ \(k \+ 1\) \+ ' of ' \+ count\);/);
  assert.match(js, /b\.type = 'button'; b\.className = 'a-hero-dot';/, 'real buttons — reachable by Tab, pressed by Enter and Space');
  assert.match(js, /box\.setAttribute\('role', 'group'\)/); assert.match(js, /dots\[k\]\.setAttribute\('aria-current', 'true'\)/);
  assert.match(js, /if \(e\.key !== 'ArrowLeft' && e\.key !== 'ArrowRight'\) return;/, 'the arrow keys move through the photographs');
  /* a chosen photograph restarts the clock — the show never advances the instant a guest has chosen */
  assert.match(js, /function go\(n\) \{[\s\S]*if \(timer\) \{ clearTimeout\(timer\); timer = null; \}[\s\S]*show\(n\); begin\(\);/);
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

test('HERO FILMS · the Worker answers byte ranges for a film (Safari needs 206): whole file, a range, a suffix, an impossible range; nothing outside assets/video/', async () => {
  const w = (await import('../src/worker.js')).default;
  const bytes = new Uint8Array(1000).map((_, k) => k % 251);
  const env = { ASSETS: { fetch: async (req) => (new URL(req.url).pathname === '/assets/video/hero-000.mp4' ? new Response(bytes, { status: 200 }) : new Response('nope', { status: 404 })) } };
  const get = (p, range, method) => w.fetch(new Request('https://example.test' + p, { method: method || 'GET', headers: range ? { Range: range } : {} }), env);
  let r = await get('/media/hero-000.mp4'); assert.equal(r.status, 200); assert.equal(r.headers.get('accept-ranges'), 'bytes'); assert.equal(r.headers.get('content-type'), 'video/mp4'); assert.equal((await r.arrayBuffer()).byteLength, 1000);
  r = await get('/media/hero-000.mp4', 'bytes=100-199'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 100-199/1000'); const b = new Uint8Array(await r.arrayBuffer()); assert.equal(b.length, 100); assert.equal(b[0], 100);
  r = await get('/media/hero-000.mp4', 'bytes=0-'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 0-999/1000');
  r = await get('/media/hero-000.mp4', 'bytes=-10'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 990-999/1000');
  r = await get('/media/hero-000.mp4', 'bytes=5000-'); assert.equal(r.status, 416); assert.equal(r.headers.get('content-range'), 'bytes */1000');
  r = await get('/media/hero-000.mp4', 'bytes=0-1', 'HEAD'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-length'), '2');
  assert.equal((await get('/media/missing.mp4')).status, 404);
  assert.notEqual((await get('/media/..%2Fsecret.mp4')).status, 206, 'only a plain file name inside assets/video/');
});
