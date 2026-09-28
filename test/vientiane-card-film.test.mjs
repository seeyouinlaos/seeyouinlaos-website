/* THE VIENTIANE CARD FILM (Owner, 28 Sep 2026 · Drive 002 "02 - Laos - Vientiane.mp4"): the source is HEVC and larger than an
   H.264 equal to it on every frame could be served (a static asset stops at 25 MiB), so the card offers the source itself first —
   by its exact codec — and an H.264 of it for browsers without HEVC. Ambient: muted, no controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { src } from './sandbox.mjs';

const idx = src('index.html'), am = src('assets/aman.js');
const M = JSON.parse(src('src/media/manifest.json'));
const item = (no, id) => (M.collections[no].items || M.collections[no].sources).find((x) => x.driveId === id);

test('THE CARD · the Vientiane card on the first page plays 002 "02 - Laos - Vientiane" — the source first, the H.264 second; the chapter keeps its own film', () => {
  assert.match(idx, /<a class="am" href="destination\.html#vientiane" data-video="assets\/video\/vientiane-journey-card\.mp4" data-video-hevc="assets\/video\/vientiane-journey-card-hevc\.mp4" style="background-image:url\(assets\/images\/city\/002-vientiane-journey-card-poster\.jpg\)"/);
  assert.match(src('destination.html'), /data-video="assets\/video\/vientiane-card\.mp4"/, 'destination.html · Vientiane chapter film unchanged');
  for (const f of ['assets/video/vientiane-journey-card.mp4', 'assets/video/vientiane-journey-card-hevc.mp4', 'assets/images/city/002-vientiane-journey-card-poster.jpg']) assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), f);
  for (const f of ['assets/video/vientiane-journey-card.mp4', 'assets/video/vientiane-journey-card-hevc.mp4']) assert.ok(fs.statSync(new URL('../' + f, import.meta.url)).size < 25 * 1024 * 1024, f + ' fits a static asset');
});

test('THE MODULE · the HEVC source is offered first by its codec, through the byte-range route; a decode failure falls to the H.264 once; always muted', () => {
  const at = am.indexOf("var hevc = frame.getAttribute('data-video-hevc');"), h264 = am.indexOf("var s = document.createElement('source'); s.src = src.replace(");
  assert.ok(at > 0 && h264 > at, 'the source before the H.264');
  assert.match(am, /h\.type = 'video\/mp4; codecs="hvc1\.1\.6\.L150\.90"'/);
  assert.match(am, /h\.src = hevc\.replace\(\/\^\(\?:\\\.\\\/\)\?assets\\\/video\\\/\(\[a-z0-9-\]\+\\\.mp4\)\$\/, 'media\/\$1'\)/);
  assert.match(am, /if \(h && h\.parentNode && v\.currentSrc === h\.src\) \{ h\.parentNode\.removeChild\(h\); try \{ v\.load\(\);/);
  assert.match(am, /v\.muted = true; v\.defaultMuted = true;/);
});

test('THE CONTRACT · 002 Vientiane synced: the source\'s own facts, the source asset and the H.264 proof; 013 keeps only its chapter slot', () => {
  const v = item('002', '1M28a7NbWmexKdbMpQKNc-FJnhHfb0PH3');
  assert.equal(v.status, 'synced'); assert.equal(v.size, 18901028); assert.equal(v.codec, 'hevc'); assert.equal(v.videoFrames, 857);
  assert.equal(v.asset, 'assets/video/vientiane-journey-card.mp4'); assert.equal(v.assetSource, 'assets/video/vientiane-journey-card-hevc.mp4');
  assert.ok(v.quality.bitrate > v.bitrate, 'the H.264 above the source bitrate');
  const c = (M.collections['013'].items || M.collections['013'].sources).find((x) => x.asset === 'assets/video/vientiane-card.mp4');
  assert.deepEqual(c.slots.map((s) => s.route), ['/destination.html']);
});

test('THE BYTE-RANGE ROUTE · a large film that comes without a content-length is never read whole: its size is the build-time list\'s, its slice streamed', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', [new URL('../src/build-media-sizes.cjs', import.meta.url).pathname, '--check']);   /* the list is current */
  const { MEDIA_SIZES } = await import('../src/media-sizes.js');
  assert.equal(MEDIA_SIZES['vientiane-journey-card.mp4'], fs.statSync(new URL('../assets/video/vientiane-journey-card.mp4', import.meta.url)).size);
  const w = (await import('../src/worker.js')).default;
  const name = 'chapter-wedding.mp4', size = MEDIA_SIZES[name];
  let whole = 0;
  const env = { ASSETS: { fetch: async (req) => {
    if (new URL(req.url).pathname !== '/assets/video/' + name) return new Response('nope', { status: 404 });
    let sent = 0; const stream = new ReadableStream({ pull(c) { if (sent >= size) { c.close(); return; } const n = Math.min(65536, size - sent); c.enqueue(new Uint8Array(n).map((_, k) => (sent + k) % 251)); sent += n; } });
    const r = new Response(stream, { status: 200 }); r.arrayBuffer = async () => { whole++; throw new Error('read whole'); }; return r; } } };
  const get = (range, method) => w.fetch(new Request('https://example.test/media/' + name, { method: method || 'GET', headers: range ? { Range: range } : {} }), env);
  let r = await get('bytes=0-1'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 0-1/' + size); assert.equal((await r.arrayBuffer()).byteLength, 2);
  r = await get('bytes=500000-500099'); assert.equal(r.status, 206); const b = new Uint8Array(await r.arrayBuffer()); assert.equal(b.length, 100); assert.equal(b[0], 500000 % 251);
  r = await get('bytes=0-1', 'HEAD'); assert.equal(r.status, 206); assert.equal(r.headers.get('content-length'), '2');
  assert.equal(whole, 0, 'never read whole');
});
