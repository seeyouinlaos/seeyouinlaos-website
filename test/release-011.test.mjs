/* RELEASE 011 (Owner, 18 Sep 2026 · FINAL INTEGRATED GUEST RELEASE) — the presentation contracts:
   · VIEW ALL STEPS on a phone: the panel scrolls on its own, the page behind it does not, the page comes back exactly
   · THE AMAN HEADER: menu · wordmark · bag, nothing beneath; the account lives in the drawer
   · EDIT 5: IGNIV is gone, Le Du Kaan and the three Vientiane museums are in, every frame on disk is a frame of the record
   · THE CARD CLIP: poster first, silent, local, motion-safe, the photograph whenever the clip cannot play
   · THE RETIRED GITHUB PAGES ARTIFACTS never return. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readdirSync, existsSync } from 'node:fs';
import { src } from './sandbox.mjs';

test('VIEW ALL STEPS · the overlay is a fixed panel below the shell that scrolls on its own; the page is locked behind it and restored on close (320 / 390 / 834 alike — one rule set)', () => {
  const css = src('assets/prep.css'), js = src('assets/prep-shell.js');
  assert.match(css, /body\.prep-steps-open \{ overflow: hidden; \}/, 'the page behind the panel does not scroll');
  assert.match(css, /\.prep-steps \{ position: fixed; top: calc\(var\(--hd-h, 0px\) \+ var\(--prep-bar-h, 0px\)\);[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;[^}]*touch-action: pan-y;/, 'the panel is the scroll container, under the shell, and never hands its scroll to the page');
  assert.match(css, /\.prep-steps \{[^}]*max-height: calc\(100vh - var\(--hd-h, 0px\) - var\(--prep-bar-h, 0px\)\);[^}]*max-height: calc\(100dvh - var\(--hd-h, 0px\) - var\(--prep-bar-h, 0px\)\);/, 'the panel height follows the real viewport (dvh) with the vh fallback');
  assert.match(css, /\.prep-steps-in \{[^}]*env\(safe-area-inset-bottom, 0px\)/, 'the last step clears the home indicator');
  assert.match(js, /heldY = window\.scrollY \|\| window\.pageYOffset \|\| 0;/, 'the scroll position is remembered when the panel opens');
  assert.match(js, /layer\.scrollTop = 0;/, 'the panel opens at its top');
  assert.match(js, /window\.scrollTo\(0, heldY\)/, 'closing restores the page exactly');
  assert.match(js, /touchmove/, 'a touch on the scrim never moves the page');
  for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html']) assert.match(src(f), /assets\/prep-shell\.js|assets\/bag\.js/, f + ' carries the shell or the bag');
});

test('AMAN HEADER · one clean band on every page: the menu left, the wordmark centre, the bag right; nothing beneath; the drawer carries the account', () => {
  const css = src('assets/aman.css');
  assert.match(css, /header\.hd \{[\s\S]{0,600}?padding: calc\(6px \+ env\(safe-area-inset-top, 0px\)\) var\(--a-gut\) 6px;/, 'the band');
  assert.doesNotMatch(css, /\.hd-access/); assert.match(css, /\.a-macct-nav a, \.a-macct-nav button \{[^}]*min-height: 44px;/, 'the drawer account links are tap targets');
  assert.match(css, /\.a-hero \{ padding: 24px var\(--a-gut\) 0/, 'breathing room below the header');
  assert.match(src('assets/aman.js'), /<div class="a-macct" data-account data-state="out">/, 'the drawer opens with the account block');
  for (const f of readdirSync('.').filter((f) => f.endsWith('.html'))) { const h = src(f); assert.doesNotMatch(h, /class="hd-access"|MY TRIP · MY PROFILE|data-access-nav="bag"/, f); }
});

test('EDIT 5 · IGNIV is gone everywhere; Le Du Kaan, the Lao National Museum, the Traditional Lao Silk Residence and the Lao Art Museum are in with their photographs; every photograph on disk is a frame of the record and every frame is on disk', () => {
  const exp = src('assets/experiences.js'), gal = src('assets/experience-galleries.js'), inv = src('src/experience-inventory.json'), map = src('assets/images/ASSET-MAP.md');
  for (const [f, s] of [['experiences.js', exp], ['experience-galleries.js', gal], ['inventory', inv.replace(/replaces IGNIV/g, '')], ['ASSET-MAP', map]]) assert.doesNotMatch(s, /igniv|IGNIV/, f + ' has no IGNIV');
  const files = readdirSync('assets/images/experiences').filter((f) => /\.jpe?g$/i.test(f));
  assert.ok(!files.some((f) => /igniv/.test(f)), 'no IGNIV photograph on disk');
  const record = JSON.parse(src('src/experience-galleries.json'));
  const frames = new Set(Object.entries(record).filter(([k]) => !k.startsWith('_')).flatMap(([, g]) => g.images.map((im) => im.src.replace('assets/images/experiences/', ''))));
  const leads = new Set([...exp.matchAll(/img: 'assets\/images\/experiences\/([^']+)'/g)].map((m) => m[1]));
  for (const f of files) assert.ok(frames.has(f) || leads.has(f) || f === 'vte-oathhouse.jpg', f + ' is a frame of the record or a lead photograph (no orphan photograph; vte-oathhouse.jpg is a historical asset, pre-Edit 5)');
  for (const f of frames) assert.ok(existsSync('assets/images/experiences/' + f), f + ' on disk');
  const want = { 'bkk-ledukaan': ['Le Du Kaan', 4], 'vte-laonationalmuseum': ['Lao National Museum', 6], 'vte-silkresidence': ['Traditional Lao Silk Residence', 5], 'vte-laoartmuseum': ['Lao Art Museum', 6] };   /* Le Du Kaan: the four dish and chef-collage frames left in the release 012 media audit */
  for (const [id, [name, n]] of Object.entries(want)) {
    assert.match(exp, new RegExp("id: '" + id + "'[^\\n]*name: '" + name + "'"), name + ' on the website');
    assert.equal(record[id].images.length, n, name + ' gallery size'); assert.equal(record[id].images[0].src, 'assets/images/experiences/' + id + '-01.jpg');
    for (const im of record[id].images) assert.ok(im.drive && im.file && im.w > 0 && im.h > 0 && im.alt, id + ' frame traceable to the Owner\'s Drive');
    assert.match(map, new RegExp('experiences/' + id + '-01\\.jpg'), name + ' in the asset map');
  }
  /* the replaced frames (the watermarked ones) now come from the Owner's originals: every frame of these places names its Drive file */
  for (const id of ['bkk-mooyoo', 'bkk-lvvisionary', 'bkk-letsrelax', 'vte-rivermoon', 'vte-laoderm', 'bkk-dusit', 'vte-kaogee', 'bkk-barus']) for (const im of record[id].images) assert.ok(/^[A-Za-z0-9_-]{20,}$/.test(im.drive), id + ' · ' + im.src + ' names its Drive original');
  assert.equal(record['bkk-dusit'].images.length, 4); assert.equal(record['vte-kaogee'].images.length, 4); assert.equal(record['bkk-barus'].images.length, 2, 'Bar Us: the bar room and the counter — no cocktail (release 012)');
});

/* a small DOM for the card clip: one frame, the elements the module creates, a fake observer */
function frameDom({ calm = false, saveData = false, play = 'ok' } = {}) {
  const observers = [];
  const mkEl = (tag) => {
    const el = { tag, attrs: {}, children: [], listeners: {}, isConnected: false, parent: null, played: 0, paused: 0,
      setAttribute(k, v) { el.attrs[k] = String(v); }, getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; }, removeAttribute(k) { delete el.attrs[k]; },
      addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); }, fire(t) { (el.listeners[t] || []).forEach((fn) => fn({ type: t })); },
      appendChild(c) { el.children.push(c); c.parent = el; c.isConnected = el.isConnected; return c; },
      remove() { if (el.parent) el.parent.children = el.parent.children.filter((c) => c !== el); el.isConnected = false; },
      play() { el.played++; return play === 'ok' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError')); }, pause() { el.paused++; } };
    return el;
  };
  const frame = { attrs: { 'data-video': 'assets/video/bangkok-card.mp4' }, style: { backgroundImage: 'url("assets/images/city/001-bangkok-chao-phraya-skyline.jpg")' }, children: [], isConnected: true, classes: new Set(),
    classList: { add(c) { frame.classes.add(c); }, remove(c) { frame.classes.delete(c); }, contains(c) { return frame.classes.has(c); } },
    setAttribute(k, v) { frame.attrs[k] = String(v); }, getAttribute(k) { return k in frame.attrs ? frame.attrs[k] : null; }, removeAttribute(k) { delete frame.attrs[k]; },
    querySelector(sel) { return sel === 'video.am-clip' ? (frame.children.find((c) => c.tag === 'video') || null) : null; },
    get firstChild() { return frame.children[0] || null; },
    insertBefore(el, ref) { const i = ref ? frame.children.indexOf(ref) : -1; if (i < 0) frame.children.push(el); else frame.children.splice(i, 0, el); el.parent = frame; el.isConnected = true; el.children.forEach((c) => { c.isConnected = true; }); return el; } };
  const sb = {
    console, navigator: saveData ? { connection: { saveData: true } } : {},
    document: { readyState: 'complete', querySelector: (s) => (s === '.a-menu' ? {} : null), querySelectorAll: () => [], createElement: mkEl, addEventListener() {}, body: { classList: { add() {}, remove() {}, contains() { return false; } }, appendChild() {} } },
    location: { pathname: '/index.html', hash: '', search: '' },
    matchMedia: () => ({ matches: calm, addEventListener() {} }),
    IntersectionObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() { this.gone = true; } },
    setTimeout: (fn) => fn(), requestAnimationFrame: (fn) => fn(),
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(src('assets/aman.js'), sb, { filename: 'assets/aman.js' });
  return { sb, frame, observers, root: { querySelectorAll: (s) => (s === '.am[data-video]' ? [frame] : []) } };
}

test('CARD CLIP · poster first: the photograph stays the card; the clip is inserted silent, inline, looping, and fades in only once it plays; it pauses off screen', () => {
  const { sb, frame, observers, root } = frameDom();
  const [f] = sb.SIYL_AMAN.video.wire(root); assert.equal(f, frame);
  const v = frame.querySelector('video.am-clip'); assert.ok(v, 'the clip is in the frame');
  assert.equal(frame.children[0], v, 'under everything else in the frame (the veil paints above it)');
  assert.equal(v.attrs.muted, ''); assert.equal(v.attrs.playsinline, ''); assert.equal(v.attrs.loop, ''); assert.equal(v.attrs.autoplay, ''); assert.equal(v.attrs.preload, 'metadata'); assert.equal(v.attrs['aria-hidden'], 'true');
  assert.equal(v.attrs.poster, 'assets/images/city/001-bangkok-chao-phraya-skyline.jpg', 'the poster is the photograph the card already frames');
  assert.equal(v.children[0].tag, 'source'); assert.equal(v.children[0].src, 'media/bangkok-card.mp4', 'through the Worker\'s byte-range route (Safari needs 206) — the Media Asset Agent, 26 Sep 2026'); assert.equal(v.children[0].type, 'video/mp4');
  assert.equal(frame.getAttribute('data-video-state'), 'loading'); assert.equal(frame.classes.has('am-playing'), false, 'nothing fades in before the clip plays');
  assert.equal(v.played, 0, 'no play before the card is on screen');
  observers[0].cb([{ isIntersecting: true }]); assert.equal(v.played, 1);
  v.fire('playing'); assert.equal(frame.classes.has('am-playing'), true); assert.equal(frame.getAttribute('data-video-state'), 'playing');
  observers[0].cb([{ isIntersecting: false }]); assert.equal(v.paused, 1, 'off screen the clip pauses');
  sb.SIYL_AMAN.video.unmount(frame); assert.equal(frame.querySelector('video.am-clip'), null); assert.equal(frame.classes.has('am-playing'), false);
  sb.SIYL_AMAN.video.unmount(frame);
});

test('CARD CLIP · the photograph is the answer for reduced motion, Save-Data, a source that fails, and an autoplay the browser refuses', async () => {
  let d = frameDom({ calm: true }); d.sb.SIYL_AMAN.video.wire(d.root);
  assert.equal(d.frame.querySelector('video.am-clip'), null, 'reduced motion: no clip at all'); assert.equal(d.frame.getAttribute('data-video-state'), 'still');
  d = frameDom({ saveData: true }); d.sb.SIYL_AMAN.video.wire(d.root);
  assert.equal(d.frame.querySelector('video.am-clip'), null, 'Save-Data: no clip'); assert.equal(d.frame.getAttribute('data-video-state'), 'still');
  d = frameDom(); d.sb.SIYL_AMAN.video.wire(d.root); let v = d.frame.querySelector('video.am-clip');
  v.children[0].fire('error'); assert.equal(d.frame.querySelector('video.am-clip'), null, 'a source that fails leaves the card as its photograph'); assert.equal(d.frame.getAttribute('data-video-state'), 'still'); assert.equal(d.frame.classes.has('am-playing'), false);
  d = frameDom({ play: 'refused' }); d.sb.SIYL_AMAN.video.wire(d.root); v = d.frame.querySelector('video.am-clip');
  d.observers[0].cb([{ isIntersecting: true }]); await Promise.resolve(); await Promise.resolve();
  assert.equal(d.frame.querySelector('video.am-clip'), null, 'Low Power Mode: the refused autoplay removes the clip'); assert.equal(d.frame.getAttribute('data-video-state'), 'still');
  d = frameDom(); delete d.frame.attrs['data-video']; assert.equal(d.sb.SIYL_AMAN.video.mount(d.frame), null, 'a card without a clip is untouched'); assert.equal(d.frame.getAttribute('data-video-state'), null);
  const css = src('assets/aman.css');
  assert.match(css, /\.am \.am-clip \{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;[^}]*opacity: 0;[^}]*pointer-events: none;/, 'the clip fills the 5:4 frame like the photograph and never takes the tap');
  assert.match(css, /\.am\.am-playing \.am-clip \{ opacity: 1; \}/); assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.am \.am-clip \{ display: none; \} \}/);
  /* every clip a page declares is local, under assets/video, MP4 — and the release check proves the file facts (gate V1) */
  for (const f of readdirSync('.').filter((x) => x.endsWith('.html'))) for (const m of src(f).matchAll(/data-video="([^"]*)"/g)) { assert.match(m[1], /^assets\/video\/[a-z0-9-]+\.mp4$/, f + ' declares a local clip'); assert.ok(existsSync(m[1]), f + ': ' + m[1] + ' exists'); }
  assert.match(src('src/release-check.cjs'), /gate\('V1', 'Card clips local, H\.264, faststart, always muted, poster-first'/);
  /* the clip is muted by the module before it plays — the file keeps the Owner's source sound (never downgraded, 26 Sep 2026) */
  d = frameDom(); d.sb.SIYL_AMAN.video.wire(d.root); v = d.frame.querySelector('video.am-clip');
  assert.equal(v.muted, true, 'a card clip never speaks'); assert.equal(v.defaultMuted, true); assert.ok('muted' in v.attrs, 'muted as an attribute too (iOS autoplay)');
});

test('RETIRED GITHUB PAGES · no build config, no redirect stub, no CNAME, no .nojekyll, no Pages workflow; no guest surface names github.io or a mirror', () => {
  for (const f of ['_config.yml', 'register-landing.html', 'CNAME', '.nojekyll', '.github/workflows', '.github/CNAME']) assert.ok(!existsSync(f), f + ' is gone');
  const surfaces = readdirSync('.').filter((f) => f.endsWith('.html')).map((f) => src(f)).join('\n') + readdirSync('assets').filter((f) => /\.(js|mjs|css)$/.test(f)).map((f) => src('assets/' + f)).join('\n') + src('src/worker.js') + src('register/data.mjs');
  assert.doesNotMatch(surfaces.replace(/the GitHub Pages mirror is retired/g, ''), /github\.io|Pages mirror|GitHub Pages/, 'one website only');
  assert.match(src('src/release-check.cjs'), /const pagesArtifacts = \['_config\.yml', 'register-landing\.html', 'CNAME', '\.nojekyll', '\.github\/workflows'\]/, 'the gate keeps them out');
});
