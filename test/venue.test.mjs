/* 003 · THE VENUE EXPERIENCE — pinned. Real photographs only (each mapped in the Drive manifest), the base
   as built from the Owner's aerial (its bytes pinned — a replacement fails here), a marker only where the
   Owner-marked layout places it, every zone in the legend with its story, the geometry of the two art
   directions, the motion tokens, reduced motion, and the public menu / footer unchanged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { src, ROOT } from './sandbox.mjs';

const plain = (v) => JSON.parse(JSON.stringify(v));
const load = (files) => { const sb = { console }; sb.window = sb; sb.globalThis = sb; vm.createContext(sb); for (const f of files) vm.runInContext(src(f), sb, { filename: f }); return sb; };
const DATA = plain(load(['assets/venue-data.js']).SIYL_VENUE_DATA);
const manifest = JSON.parse(src('docs/venue/asset-manifest.json'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
/* JPEG intrinsic size from the SOF marker — no decoder needed */
function jpegSize(p) { const b = fs.readFileSync(path.join(ROOT, p)); let i = 2; while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + b.readUInt16BE(i + 2); } return null; }
const sha = (p) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');

test('DATA · seven places in the Owner\'s order; the Owner\'s final mapping of 16 Sep 2026 (seven labels on the aerial: lobby, rooms × 3, ceremony, dinner, coffee & cake); every zone has its story, its time and real photographs', () => {
  assert.deepEqual(DATA.zones.map((z) => z.id), ['lobby', 'rooms', 'coffee', 'ceremony', 'dinner', 'pool', 'garden']);
  assert.deepEqual(DATA.zones.map((z) => z.label), ['Lobby', 'Rooms', 'Coffee & Cake · Breakfast', 'Wedding Ceremony', 'Wedding Dinner · Poolside', 'Swimming pool', 'Courtyard garden']);
  const marked = DATA.zones.filter((z) => z.marks && z.marks.length).map((z) => z.id + '×' + z.marks.length);
  assert.deepEqual(marked, ['lobby×1', 'rooms×3', 'coffee×1', 'ceremony×1', 'dinner×1'], 'the Owner\'s seven labels: top left → Lobby, top right / lower right / lower centre → Rooms, left centre → Wedding Ceremony, centre pool → Dinner, lower left → Coffee & Cake · Breakfast');
  assert.equal(DATA.zones.reduce((n, z) => n + (z.marks ? z.marks.length : 0), 0), 7, 'seven labels on the photograph');
  for (const z of DATA.zones) {
    assert.ok(z.n && z.title && z.when && z.story && z.photos.length >= 2, z.id + ' is complete');
    for (const m of (z.marks || [])) {
      assert.ok(m.x >= 0 && m.y >= 0 && m.x + m.w <= 100 && m.y + m.h <= 100, z.id + ' inside the frame');
      assert.ok(m.anchor.x >= m.x && m.anchor.x <= m.x + m.w && m.anchor.y >= m.y && m.anchor.y <= m.y + m.h, z.id + ' label on its own area');
      if (m.tall) assert.ok(m.tall.x >= Math.max(m.x, 26) && m.tall.x <= Math.min(m.x + m.w, 71) && m.tall.y >= m.y && m.tall.y <= m.y + m.h, z.id + ' phone label on the visible part of its own area');
    }
    if (!z.marks) assert.equal(z.anchor, undefined, z.id + ' has no anchor without a mark');
  }
  /* the Owner's positions on the frame: left column x 12.5 – 33.5 (three rows), right column x 62 – 81, the pool in the centre, the lower centre house under the pool */
  const M = (id) => DATA.zones.find((z) => z.id === id).marks;
  assert.deepEqual(M('lobby')[0], { x: 12.5, y: 0, w: 21, h: 31, anchor: { x: 23, y: 15 }, tall: { x: 28.5, y: 15, align: 'left' } });
  assert.deepEqual(M('ceremony')[0], { x: 12.5, y: 33, w: 21, h: 26, anchor: { x: 22, y: 56 }, tall: { x: 28.5, y: 40, align: 'left' } });
  assert.deepEqual(M('coffee')[0], { x: 12.5, y: 60, w: 21, h: 40, anchor: { x: 23, y: 80 }, tall: { x: 28.5, y: 72, align: 'left' } });
  assert.deepEqual(M('rooms').map((m) => [m.x, m.y, m.w, m.h]), [[62, 0, 18, 40], [62, 50, 19, 40], [37.5, 71, 21, 29]]);
  assert.deepEqual(M('dinner')[0], { x: 39.5, y: 37, w: 20.5, h: 32, anchor: { x: 49.7, y: 43.5 }, tall: { x: 48.5, y: 57 } });
  assert.equal(DATA.first, 'dinner');
  assert.match(DATA.zones.find((z) => z.id === 'dinner').story, /run A poolside, run B opposite the pool/);
  assert.doesNotMatch(JSON.stringify(DATA), /\b(north|south|east|west)\b/i, 'no compass direction is invented');

  assert.match(DATA.zones.find((z) => z.id === 'ceremony').when, /15:30/); assert.match(DATA.zones.find((z) => z.id === 'dinner').when, /19:30/);
  assert.doesNotMatch(JSON.stringify(DATA), /Temple|Wat Ong Teu|08:00|16:30/, 'the venue is Souphattra Heritage: no temple, no retired time');
});

test('ASSETS · the base is the Owner\'s aerial as built (bytes pinned, 2560 × 1440 and the 4:5 crop of the same frame); every photograph exists at every declared width and format; each maps to the Drive manifest', () => {
  const V = 'assets/images/venue/';
  assert.equal(sha(V + 'souphattra-aerial-2560.jpg'), '48b825ec0b26ced9fd8ca96448612c7781be8993ff71c46a9a18500d74d21e7b', 'the served base is the file built from Heritage_0631 — any substitute fails here');
  assert.equal(sha(V + 'souphattra-aerial-tall-1152.jpg'), '908371d25d1baf62ccde614cd3c327a1726d5fd52f369fc3d4645f6ab26526b3');
  assert.deepEqual(jpegSize(V + 'souphattra-aerial-2560.jpg'), { w: 2560, h: 1440 }); assert.deepEqual(jpegSize(V + 'souphattra-aerial-tall-1152.jpg'), { w: 1152, h: 1440 });
  assert.equal(DATA.base.drive, '1VIz9oIZDOUlktJD7pase7e4UilhvsO9j');
  const base = manifest.entries.find((e) => e.driveId === DATA.base.drive);
  assert.ok(base && base.selected && /THE BASE/.test(base.visualRole), 'the base is in the manifest as the base');
  for (const q of [DATA.base.full, DATA.base.tall]) for (const w of q.widths) for (const ext of ['avif', 'webp', 'jpg']) assert.ok(exists(V + q.name + '-' + w + '.' + ext), q.name + '-' + w + '.' + ext);
  for (const w of DATA.base.full.widths) { const s = jpegSize(V + DATA.base.full.name + '-' + w + '.jpg'); assert.equal(s.w, w); assert.equal(Math.round(s.w / s.h * 100), Math.round(2560 / 1440 * 100)); }
  for (const z of DATA.zones) for (const p of z.photos) {
    if (p.pic) { for (const w of p.pic.widths) for (const ext of ['avif', 'webp', 'jpg']) assert.ok(exists(V + p.pic.name + '-' + w + '.' + ext), z.id + ' ' + p.pic.name + '-' + w + '.' + ext); const s = jpegSize(V + p.pic.name + '-' + p.pic.widths[p.pic.widths.length - 1] + '.jpg'); assert.equal(s.w, p.pic.w, z.id + ' ' + p.pic.name + ' intrinsic width'); assert.equal(s.h, p.pic.h); }
    else { assert.ok(exists(p.single.src), z.id + ' ' + p.single.src); const s = jpegSize(p.single.src); assert.equal(s.w, p.single.w, p.single.src + ' intrinsic width'); assert.equal(s.h, p.single.h, p.single.src + ' intrinsic height'); }
    assert.ok(p.drive || (p.single && /^assets\/images\/(souphattra|event)\//.test(p.single.src)), z.id + ' photograph has a Drive id or is repository photography already mapped in assets/images/ASSET-MAP.md');
    const tb = (p.pic ? p.pic.name : p.single.src.split('/').pop().replace(/\.[a-z]+$/, ''));
    assert.ok(exists(V + 'thumbs/' + tb + '-320.jpg'), z.id + ' thumbnail ' + tb); assert.equal(jpegSize(V + 'thumbs/' + tb + '-320.jpg').w, 320);
    if (p.drive) { const m = manifest.entries.find((e) => e.driveId === p.drive); assert.ok(m && m.selected, z.id + ' ' + p.drive + ' is a selected manifest entry'); }
    assert.equal(p.source, undefined, 'no provenance strings in the guest-loaded file');
  }
  /* nothing generated: no AI / synthetic wording anywhere in the venue files, and the manifest says so */
  assert.match(manifest.rule, /Real photographs only/);
  const code = (src('assets/venue-data.js') + src('assets/venue.js')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /synthetic|ai-generated|midjourney|dall-e/i, 'no generated imagery is referenced');
  assert.doesNotMatch(code, /assets\/images\/(?!venue\/|event\/|souphattra\/)/, 'every image comes from the venue, event or Souphattra sets');
});

test('GEOMETRY · the two art directions map the same coordinates: a box on the full frame lands on the same place of the tall crop; labels outside the crop are not drawn', () => {
  const sb = load(['assets/venue-data.js']);
  /* a minimal DOM stub so the component module registers */
  sb.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, createElement: () => ({}), dispatchEvent() {} }; sb.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.runInContext(src('assets/venue.js'), sb, { filename: 'assets/venue.js' });
  const G = sb.SIYL_VENUE.geometry;
  const full = plain(G.frameOf(DATA));
  assert.deepEqual(full, { x: 0, w: 100, ratio: 2560 / 1440 });
  const tall = { x: 26, w: 45, ratio: 1152 / 1440 };
  const pool = DATA.zones.find((z) => z.id === 'dinner').marks[0];
  const onTall = G.map(tall, pool);
  assert.ok(Math.abs(onTall.x - (pool.x - 26) / 45 * 100) < 1e-9 && onTall.y === pool.y && Math.abs(onTall.w - pool.w / 45 * 100) < 1e-9, 'x rescales into the crop, y is unchanged');
  assert.ok(onTall.x > 0 && onTall.x + onTall.w < 100, 'the poolside area is inside the tall crop');
  for (const z of DATA.zones) for (const m of (z.marks || [])) { assert.equal(G.visible(tall, m.tall || m.anchor), true, z.id + ' label visible on a phone'); assert.equal(G.visible(full, m.anchor), true, z.id + ' label visible on the full frame'); }
  assert.equal(G.visible(tall, DATA.zones.find((z) => z.id === 'lobby').marks[0].anchor), false, 'the desktop anchor of the lobby lies outside the phone crop — the phone anchor takes over');
  assert.equal(G.visible(tall, { x: 5, y: 50 }), false, 'a point outside the crop is not drawn');
  /* the tall crop of the build matches the data: 26 % → 71 % of 2560 = x 665 … 1817 */
  assert.match(src('docs/venue/build-images.py'), /x0 = 665; tall = base\.crop\(\(x0, 0, x0 \+ 1152, 1440\)\)/);
  assert.equal(Math.round(0.26 * 2560), 666); assert.equal(Math.round(0.45 * 2560), 1152);
});

test('MARKUP · every label and legend item is a button with a name and a pressed state; the detail is a labelled region; the announcement is one sentence; no hover-only behaviour; the pictures carry intrinsic sizes', () => {
  const sb = load(['assets/venue-data.js']);
  sb.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, createElement: () => ({}), dispatchEvent() {} }; sb.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.runInContext(src('assets/venue.js'), sb, { filename: 'assets/venue.js' });
  const H = sb.SIYL_VENUE.html, G = sb.SIYL_VENUE.geometry, fr = G.frameOf(DATA);
  const labels = H.labels(DATA, fr);
  assert.equal((labels.match(/<button type="button" class="venue-label"/g) || []).length, 7, 'the Owner\'s seven labels');
  assert.equal((labels.match(/data-zone="rooms"/g) || []).length, 3, 'Rooms three times, one per house');
  assert.match(labels, /aria-pressed="false" aria-controls="venue-detail"/); assert.match(labels, /<span class="venue-t">Wedding Dinner · Poolside<\/span>/); assert.match(labels, /<span class="venue-t">Coffee &amp; Cake · Breakfast<\/span>/);
  assert.doesNotMatch(labels, /data-align=/, 'on the full frame every label is centred on its anchor');
  /* on a phone (the tall crop, 26 – 71 % of the frame) the seven labels stay, each on the visible part of its own house: three hang from the crop's left edge, two from its right */
  const ph = load(['assets/venue-data.js']);
  ph.document = sb.document; ph.matchMedia = () => ({ matches: true, addEventListener() {} });
  vm.runInContext(src('assets/venue.js'), ph, { filename: 'assets/venue.js' });
  const phone = ph.SIYL_VENUE.html.labels(DATA, ph.SIYL_VENUE.geometry.frameOf(DATA));
  assert.equal((phone.match(/<button type="button" class="venue-label"/g) || []).length, 7, 'seven labels on a phone too');
  assert.equal((phone.match(/data-align="left"/g) || []).length, 3); assert.equal((phone.match(/data-align="right"/g) || []).length, 2);
  assert.match(src('assets/venue.css'), /\.venue-label\[data-align="left"\] \{ transform: translate\(-13px, -50%\); \}/); assert.match(src('assets/venue.css'), /\.venue-label\[data-align="right"\] \{ transform: translate\(calc\(-100% \+ 13px\), -50%\); flex-direction: row-reverse;/);
  const trace = H.trace(DATA, fr);
  assert.match(trace, /<svg class="venue-trace" viewBox="0 0 100 56\.250" preserveAspectRatio="none" aria-hidden="true"/); assert.equal((trace.match(/class="venue-outline"/g) || []).length, 7); assert.equal((trace.match(/class="venue-tick"/g) || []).length, 28);
  for (const z of DATA.zones) {
    const d = H.detail(z, 0);
    assert.match(d, /<h3 id="venue-detail-h" class="venue-title">/); assert.match(d, /<p class="venue-story">/);
    assert.match(d, /loading="lazy" decoding="async"/); assert.match(d, /width="\d+" height="\d+"/, 'intrinsic size: no layout shift');
    if (z.photos.length > 1) { assert.match(d, /role="group" aria-label="Photographs of /); assert.match(d, /<button type="button" class="venue-thumb" data-photo="0" aria-pressed="true" aria-label="/); }
  }
  const base = H.base(DATA.base);
  assert.match(base, /<source type="image\/avif" media="\(max-width: 767px\)"/); assert.match(base, /sizes="\(min-width: 1200px\) 1180px, 100vw"/); assert.match(base, /width="2560" height="1440" alt="Souphattra Heritage Vientiane from above/);
  const js = src('assets/venue.js'), css = src('assets/venue.css');
  assert.doesNotMatch(js, /mouseenter|mouseover|onmouseover/, 'no hover-only behaviour');
  assert.match(js, /live\.textContent = z\.title \+ '\. ' \+ z\.when \+ '\.'/, 'one sentence, announced once');
  assert.match(js, /ArrowDown|ArrowUp/, 'the legend is keyboard-navigable');
  assert.match(css, /\.venue-label:focus-visible \{ outline: 2px solid/); assert.match(css, /\.venue-item:focus-visible \{ outline: 2px solid/);
  assert.match(css, /min-height: 44px/, '44 px targets');
  assert.doesNotMatch(css, /autoplay|scroll-snap-stop|scroll-behavior: smooth/);
});

test('MOTION · one system, three timings, physical easing; reduced motion keeps every state; the story sections reveal on intersection, never on a scroll listener', () => {
  const m = src('assets/motion.js'), c = src('assets/motion.css'), v = src('assets/venue.css');
  assert.match(c, /--m-fast: 220ms; --m-reveal: 480ms; --m-photo: 800ms/); assert.match(c, /--m-ease: cubic-bezier/);
  assert.match(m, /IntersectionObserver/); assert.doesNotMatch(m + src('assets/venue.js'), /addEventListener\('scroll'/, 'no per-frame scroll listener');
  assert.match(m, /prefers-reduced-motion: reduce/); assert.match(m, /classList\.toggle\('m-reduced'/);
  assert.match(c, /\.m-reduced \[data-motion\], \.m-reduced \[data-motion\] \* \{ transition: none !important; animation: none !important; \}/);
  assert.match(v, /\.m-reduced \.venue-label \{ opacity: 1; \}/); assert.match(v, /\.m-reduced \.venue-outline \{ stroke-dashoffset: 0; \}/);
  assert.doesNotMatch(v + c, /bounce|spin|rotate\(|confetti|perspective\(/i, 'no bouncing, spinning, 3D or confetti');
  const vy = src('voyage.html');
  assert.equal((vy.match(/data-motion="reveal"/g) || []).length, 10, 'the story sections and duos of the wedding page reveal');
  for (const f of ['index.html', 'voyage.html', 'accommodation.html']) { const s = src(f); assert.match(s, /<section class="a-sec venue" id="venue" aria-labelledby="venue-h" data-venue><\/section>/, f); assert.match(s, /assets\/venue-data\.js(?:\?v=[0-9a-f]{8})?"><\/script>\s*<script src="assets\/venue\.js(?:\?v=[0-9a-f]{8})?"/, f); assert.match(s, /assets\/motion\.css/); }
  assert.doesNotMatch(vy, /heritage-courtyard-wide\.jpg\)" role="img" aria-label="Poolside at Souphattra Heritage Vientiane, the heritage houses/, 'the wide band gave way to the stage');
  /* the homepage (Owner, 16 Sep 2026 — the mobile venue fix): the wordless 300 px band of the aerial gave way to the stage with the seven labels, the legend and the detail; on a phone the section flows in document order */
  assert.doesNotMatch(src('index.html'), /class="a-band" style="background-image:url\(assets\/images\/souphattra\/heritage-courtyard-aerial\.jpg\)/, 'the band is gone');
  assert.match(v, /@media \(max-width: 767px\) \{\s*\.venue-head \{ margin-bottom: 32px; \}\s*\.venue-grid \{ gap: 24px; \}\s*\.venue-cap \{ padding-top: 8px; \}\s*\.a-sec\.venue \{ margin: 56px 0; \}\s*\.a-sec\.venue \+ \.a-sec \{ margin-top: 56px; \}\s*\.a-sec:has\(\+ \.a-sec\.venue\) \{ margin-bottom: 56px; \}\s*\}/, 'the phone rhythm');
  assert.doesNotMatch(v, /\d+vh|position: sticky|min-height: (?:[2-9]\d{2}|\d{4,})px/, 'no viewport-height spacer, no sticky reservoir, no reservoir of 200 px or more in the venue styles (the detail keeps 120 px while a photograph cross-fades)');
});

test('NAVIGATION · the public menu and both footers are unchanged by the venue work: Sühring · Lunch and 1872 stay, the two footer lists stay equal', () => {
  const recon = src('assets/recon.js'), shop = src('assets/shop-menu.js');
  const links = (s) => [...s.slice(s.indexOf('sfoot-in'), s.indexOf('sf-legal')).matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => m[1] + '|' + m[2]);
  assert.deepEqual(links(recon), links(shop)); assert.ok(links(recon).some((l) => /Sühring · Lunch/.test(l)) && links(recon).some((l) => /1872/.test(l)));
  assert.match(src('assets/aman.js'), /Sühring · Lunch in Bangkok/);
});
