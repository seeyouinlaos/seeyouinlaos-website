/* 003 · THE VENUE EXPERIENCE — pinned. Since 22 Nov 2026 (Owners, HS-058) the venue is shown as an architectural
   SITE PLAN drawn from the hotel's official plan (assets/images/venue/souphattra-site-plan.svg): building and area
   names only — never a room number, an allocation or a person — and no place of the wedding drawn on it until its
   position is confirmed (the aerial and its markers are gone). Real photographs only for every place (each mapped in
   the Drive manifest), every zone in the legend with its story, the plan readable on a phone (a reading size that
   scrolls across, and the enlarged view), the motion tokens, reduced motion, and the public menu / footer unchanged. */
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

test('DATA · seven places in the Owner\'s order, every one a legend place (no marker anywhere since 22 Nov 2026); every zone has its story, its time and real photographs; the plan record', () => {
  assert.deepEqual(DATA.zones.map((z) => z.id), ['lobby', 'rooms', 'coffee', 'ceremony', 'dinner', 'pool', 'garden']);
  assert.deepEqual(DATA.zones.map((z) => z.label), ['Lobby', 'Rooms', 'Coffee & Cake · Breakfast', 'Vow Ceremony', 'Wedding Dinner · poolside', 'Swimming pool', 'Courtyard garden']);   /* TO-01984 · TO-01942 (Window 007) */
  assert.ok(DATA.zones.every((z) => z.marks === undefined && z.anchor === undefined), 'no zone is placed on the plan: Coffee & Cake, the vows and the dinner wait for a confirmed position (Owners, 22 Nov 2026)');
  for (const z of DATA.zones) assert.ok(z.n && z.title && z.when && z.story && (z.index ? z.photos.length === 0 && z.href === '#dinner' : z.photos.length >= 2), z.id + ' is complete' + (z.index ? ' (an index entry: no photograph of its own, the way to the one detail)' : ''));
  assert.equal(DATA.base, undefined, 'the aerial base is gone');
  assert.deepEqual([DATA.plan.src.split('?')[0], DATA.plan.w, DATA.plan.h], ['assets/images/venue/souphattra-site-plan.svg', 900, 884]);
  assert.equal(DATA.plan.src.split('?v=')[1], createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/images/venue/souphattra-site-plan.svg'))).digest('hex').slice(0, 8), 'the drawing\'s ?v= is current: a corrected plan reaches every returning visitor');
  assert.ok(DATA.plan.alt && DATA.plan.desc && DATA.plan.caption && DATA.plan.enlarge && DATA.plan.close, 'the plan is named, described and its controls worded');
  assert.equal(DATA.first, 'dinner');
  assert.equal(DATA.zones.find((z) => z.id === 'dinner').story, 'The long table beside the water — side A along the pool, side B facing it.', 'TO-01990');
  assert.doesNotMatch(JSON.stringify(DATA), /\b(north|south|east|west)\b/i, 'no compass direction is invented');
  assert.match(DATA.zones.find((z) => z.id === 'ceremony').when, /15:30/); assert.match(DATA.zones.find((z) => z.id === 'dinner').when, /19:30/);
  assert.doesNotMatch(JSON.stringify(DATA), /Temple|Wat Ong Teu|08:00|16:30/, 'the venue is Souphattra Heritage: no temple, no retired time');
});

test('ASSETS · the site plan is the corrected architectural drawing (vector, the official plan\'s names only, nothing private, nothing active); every photograph exists at every declared width and format; each maps to the Drive manifest', () => {
  const V = 'assets/images/venue/';
  const svg = src(V + 'souphattra-site-plan.svg');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="sp" viewBox="95 186 900 884"/, 'an SVG drawing with its viewBox — never a raster copy');
  assert.match(svg, /<title id="sp-title">Souphattra Heritage Vientiane · site plan<\/title>/);
  assert.deepEqual([...svg.matchAll(/<rect class="sp-bldg" data-building="([A-F])"/g)].map((m) => m[1]), ['A', 'F', 'B', 'C', 'D', 'E'], 'the six buildings carry their letter (the hook for a guest\'s own building, drawn only in My Profile)'); assert.match(svg, /<desc id="sp-desc">/);
  assert.doesNotMatch(svg, /<image|data:image|<script|\son[a-z]+=|<foreignObject|href="http/i, 'no embedded raster, no script, no external reference');
  /* the visible words: exactly the names the official plan confirms (HS-058 reconciliation, 22 Nov 2026) */
  const words = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.deepEqual(words, ['BUILDING A', 'Lobby', 'Peacock', 'Bistro', 'BUILDING F', 'Peacock', 'Court', 'Pool', 'BUILDING B', 'BUILDING C', 'BUILDING D', 'BUILDING E']);
  assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]*>/g, ' '), /\d/, 'no number anywhere in the drawing\'s text (titles and descriptions included): no room number on the public plan');
  assert.doesNotMatch(svg, /<!--|<tspan/, 'no comment, no hidden text run');
  assert.doesNotMatch(svg, /ROOM REGISTER|GUEST ROOMS|Garden|COURTYARD|Coffee|Ceremony|Vow|Dinner|Suite|Presidential|Haruthai|Suthep/i, 'no register, no invented area, no event position, no allocation, no name');
  assert.equal(DATA.plan.drive, undefined, 'no Drive id in the guest-loaded file');
  assert.match(manifest.plan.what, /official plan/); assert.equal(manifest.plan.file, V + 'souphattra-site-plan.svg');
  /* provenance by the production file (the Media Asset Agent, 26 Sep 2026): the guest-loaded record carries no Drive id at all */
  const entryOf = (p) => manifest.entries.find((e) => e.selected && (p.pic ? String(e.productionFilename).startsWith('assets/images/venue/' + p.pic.name + '-{') : e.productionFilename === p.single.src));
  for (const z of DATA.zones) for (const p of z.photos) {
    if (p.pic) { for (const w of p.pic.widths) for (const ext of ['avif', 'webp', 'jpg']) assert.ok(exists(V + p.pic.name + '-' + w + '.' + ext), z.id + ' ' + p.pic.name + '-' + w + '.' + ext); const s = jpegSize(V + p.pic.name + '-' + p.pic.widths[p.pic.widths.length - 1] + '.jpg'); assert.equal(s.w, p.pic.w, z.id + ' ' + p.pic.name + ' intrinsic width'); assert.equal(s.h, p.pic.h); }
    else { assert.ok(exists(p.single.src), z.id + ' ' + p.single.src); const s = jpegSize(p.single.src); assert.equal(s.w, p.single.w, p.single.src + ' intrinsic width'); assert.equal(s.h, p.single.h, p.single.src + ' intrinsic height'); }
    assert.equal(p.drive, undefined, z.id + ': no Drive id in the guest-loaded file');
    assert.ok(entryOf(p) || (p.single && /^assets\/images\/(souphattra|event)\//.test(p.single.src)), z.id + ' photograph maps to the Drive manifest or is repository photography already mapped in assets/images/ASSET-MAP.md');
    const tb = (p.pic ? p.pic.name : p.single.src.split('/').pop().replace(/\.[a-z]+$/, ''));
    assert.ok(exists(V + 'thumbs/' + tb + '-320.jpg'), z.id + ' thumbnail ' + tb); assert.equal(jpegSize(V + 'thumbs/' + tb + '-320.jpg').w, 320);
    if (p.pic) assert.ok(entryOf(p) && /^[\w-]{20,}$/.test(entryOf(p).driveId), z.id + ' ' + p.pic.name + ' is a selected manifest entry with its Drive id');
    assert.equal(p.source, undefined, 'no provenance strings in the guest-loaded file');
  }
  /* nothing generated: no AI / synthetic wording anywhere in the venue files, and the manifest says so */
  assert.match(manifest.rule, /Real photographs only/);
  const code = (src('assets/venue-data.js') + src('assets/venue.js')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /synthetic|ai-generated|midjourney|dall-e/i, 'no generated imagery is referenced');
  assert.doesNotMatch(code, /assets\/images\/(?!venue\/|event\/|souphattra\/)/, 'every image comes from the venue, event or Souphattra sets');
});

test('MARKUP · every label and legend item is a button with a name and a pressed state; the detail is a labelled region; the announcement is one sentence; no hover-only behaviour; the pictures carry intrinsic sizes', () => {
  const sb = load(['assets/venue-data.js']);
  sb.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, createElement: () => ({}), dispatchEvent() {} }; sb.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.runInContext(src('assets/venue.js'), sb, { filename: 'assets/venue.js' });
  const H = sb.SIYL_VENUE.html;
  assert.equal(sb.SIYL_VENUE.geometry, undefined, 'no aerial geometry left');
  const planBox = H.plan(DATA.plan);
  assert.match(planBox, /<div class="venue-plan-frame" data-plan-frame data-scrolls role="group" aria-label="Site plan of Souphattra Heritage Vientiane/);
  assert.match(src('assets/venue.js'), /s\.setAttribute\('aria-hidden', 'true'\); s\.removeAttribute\('aria-labelledby'\); s\.setAttribute\('data-i18n-skip', ''\);/, 'the inline copy: read once (the frame names it), no repeated ids, the hotel\'s names untranslated');
  assert.match(src('assets/venue.js'), /<li><button type="button" class="venue-item" data-zone="' \+ z\.id \+ '" aria-pressed="false" aria-controls="venue-detail">/, 'every legend item is a button with a pressed state');
  assert.match(planBox, /<img class="venue-plan-img" src="assets\/images\/venue\/souphattra-site-plan\.svg\?v=[0-9a-f]{8}" width="900" height="884" alt="Site plan of /, 'the drawing itself, intrinsic size, named');
  for (const z of DATA.zones) {
    const d = H.detail(z, 0);
    assert.match(d, /<h3 id="venue-detail-h" class="venue-title">/); assert.match(d, /<p class="venue-story">/);
    if (z.index) { assert.doesNotMatch(d, /venue-photo|venue-thumb/, z.id + ': an index entry carries no photograph'); assert.match(d, /class="venue-detail-in venue-index"/); assert.match(d, /href="(?:voyage\.html)?#dinner">The Wedding Dinner<\/a>/); continue; }
    assert.match(d, /loading="lazy" decoding="async"/); assert.match(d, /width="\d+" height="\d+"/, 'intrinsic size: no layout shift');
    if (z.photos.length > 1) { assert.match(d, /role="group" aria-label="Photographs of /); assert.match(d, /<button type="button" class="venue-thumb" data-photo="0" aria-pressed="true" aria-label="/); }
  }
  const js = src('assets/venue.js'), css = src('assets/venue.css');
  assert.doesNotMatch(js, /mouseenter|mouseover|onmouseover/, 'no hover-only behaviour');
  assert.match(js, /live\.textContent = z\.title \+ '\. ' \+ z\.when \+ '\.'/, 'one sentence, announced once');
  assert.match(js, /ArrowDown|ArrowUp/, 'the legend is keyboard-navigable');
  assert.match(css, /\.venue-zoom-open:focus-visible \{ outline: 2px solid/); assert.match(css, /\.venue-item:focus-visible \{ outline: 2px solid/);
  /* THE PLAN ENLARGED: a real dialog, Escape and Close, focus kept inside and returned; − / + change the width; native pan and pinch */
  assert.match(js, /zoom\.setAttribute\('role', 'dialog'\); zoom\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(js, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); closeZoom\(\); return; \}/); assert.match(js, /var back = zoomFrom && zoomFrom !== doc\.body && doc\.contains\(zoomFrom\) \? zoomFrom : scope\.querySelector\('\[data-zoom-open\]'\);/, 'the focus returns to the button that opened the plan');
  assert.match(js, /data-zoom-in/); assert.match(js, /data-zoom-out/); assert.doesNotMatch(js, /\.disabled = /, 'a limit never disables the focused button (aria-disabled)'); assert.match(js, /doc\.addEventListener\('keydown', onZoomKey\)/, 'Escape works wherever the focus is'); assert.match(css, /\.venue-zoom \{ position: fixed; inset: 0;/); assert.match(css, /touch-action: pan-x pan-y pinch-zoom/);
  /* a phone: the drawing at a reading size inside a frame that scrolls across — never shrunk unreadably, never wider than the page */
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.venue-swipe \{ display: inline; \}\s*\.venue-plan-frame \.venue-plan-img, \.venue-plan-frame \.venue-plan-svg \{ width: 720px; max-width: none; \}/);
  assert.match(css, /\.venue-plan-frame \{ display: block; background: #F7F3EC; border: 1px solid #E4DED3; overflow-x: auto;/); assert.match(css, /\.venue-grid > \* \{ min-width: 0; \}/);
  /* the inline drawing is our own file and nothing active may enter with it */
  assert.match(js, /<script\|\[\\s\\\/"'\]on\[a-z\]\+\\s\*=\|<foreignObject\|<a\[\\s>\]\|<animate\|<set\[\\s>\]\|href\\s\*=\|url\\\(\|@import\|javascript:/i);
  assert.match(css, /min-height: 44px/, '44 px targets');
  assert.doesNotMatch(css, /autoplay|scroll-snap-stop|scroll-behavior: smooth/);
});

test('MOTION · one system, three timings, physical easing; reduced motion keeps every state; the story sections reveal on intersection, never on a scroll listener', () => {
  const m = src('assets/motion.js'), c = src('assets/motion.css'), v = src('assets/venue.css');
  assert.match(c, /--m-fast: 220ms; --m-reveal: 480ms; --m-photo: 800ms/); assert.match(c, /--m-ease: cubic-bezier/);
  assert.match(m, /IntersectionObserver/); assert.doesNotMatch(m + src('assets/venue.js'), /addEventListener\('scroll'/, 'no per-frame scroll listener');
  assert.match(m, /prefers-reduced-motion: reduce/); assert.match(m, /classList\.toggle\('m-reduced'/);
  assert.match(c, /\.m-reduced \[data-motion\], \.m-reduced \[data-motion\] \* \{ transition: none !important; animation: none !important; \}/);
  assert.match(v, /\.m-reduced \.venue-plan-frame \{ opacity: 1; \}/, 'reduced motion: the plan is simply there');
  assert.doesNotMatch(v + c, /bounce|spin|rotate\(|confetti|perspective\(/i, 'no bouncing, spinning, 3D or confetti');
  const vy = src('voyage.html');
  assert.equal((vy.match(/data-motion="reveal"/g) || []).length, 8, 'the story sections and the duos of the wedding page reveal (21 Sep 2026: the one dinner gallery stands without a reveal — never a hidden, paused-looking state)');
  for (const f of ['index.html', 'voyage.html', 'accommodation.html']) { const s = src(f); assert.match(s, /<section class="a-sec venue" id="venue" aria-labelledby="venue-h" data-venue><\/section>/, f); assert.match(s, /assets\/venue-data\.js(?:\?v=[0-9a-f]{8})?"><\/script>\s*<script src="assets\/venue\.js(?:\?v=[0-9a-f]{8})?"/, f); assert.match(s, /assets\/motion\.css/); }
  assert.doesNotMatch(vy, /heritage-courtyard-wide\.jpg\)" role="img" aria-label="Poolside at Souphattra Heritage Vientiane, the heritage houses/, 'the wide band gave way to the stage');
  /* the homepage (Owner, 16 Sep 2026 — the mobile venue fix): the wordless 300 px band of the aerial gave way to the venue stage (since 22 Nov 2026 the site plan), the legend and the detail; on a phone the section flows in document order */
  assert.doesNotMatch(src('index.html'), /class="a-band" style="background-image:url\(assets\/images\/souphattra\/heritage-courtyard-aerial\.jpg\)/, 'the band is gone');
  assert.match(v, /@media \(max-width: 767px\) \{\s*\.venue-head \{ margin-bottom: 32px; \}\s*\.venue-grid \{ gap: 24px; \}\s*\.venue-cap \{ padding-top: 8px; \}\s*\.a-sec\.venue \{ margin: 56px 0; \}\s*\.a-sec\.venue \+ \.a-sec \{ margin-top: 56px; \}\s*\.a-sec:has\(\+ \.a-sec\.venue\) \{ margin-bottom: 56px; \}\s*\}/, 'the phone rhythm');
  assert.doesNotMatch(v, /\d+vh|position: sticky|min-height: (?:[2-9]\d{2}|\d{4,})px/, 'no viewport-height spacer, no sticky reservoir, no reservoir of 200 px or more in the venue styles (the detail keeps 120 px while a photograph cross-fades)');
});

test('NAVIGATION · the public menu and both footers are unchanged by the venue work: Sühring · Dinner and 1872 stay, the two footer lists stay equal', () => {
  const recon = src('assets/recon.js'), shop = src('assets/shop-menu.js');
  const links = (s) => [...s.slice(s.indexOf('sfoot-in'), s.indexOf('sf-legal')).matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => m[1] + '|' + m[2]);
  assert.deepEqual(links(recon), links(shop)); /* TO-00021 · TO-00026 (Window 007): the footer's Highlights column names them “Dinner at Sühring” and “Champagne Afternoon Tea at 1872” */
  assert.ok(links(recon).includes('experience.html?id=bkk-suhring|Dinner at Sühring') && links(recon).includes('1872.html|Champagne Afternoon Tea at 1872'));
  assert.match(src('assets/aman.js'), /Sühring · Dinner in Bangkok/);
});
