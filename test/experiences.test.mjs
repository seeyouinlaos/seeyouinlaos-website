/* EXPERIENCE CONTENT COMPLETENESS · 13 Sep 2026
   Deterministic coverage for the Experience places: every place on the website
   is one row of the canonical inventory (src/experience-inventory.json), in
   the right city and role, with its lead photograph on disk, its curated
   gallery of the recorded size, no photograph shared between two places, the
   source-backed detail where the source carries one, and the selectable
   status the Owner decided — Sühring alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
const load = () => {
  const window = {};
  new Function('window', src('assets/experiences.js'))(window);
  new Function('window', src('assets/experience-galleries.js'))(window);
  return window;
};
const W = load();
const EXP = W.SIYL_EXP, GAL = W.SIYL_EXP_GALLERY;
const INV = JSON.parse(src('src/experience-inventory.json'));
const GJSON = JSON.parse(src('src/experience-galleries.json'));
const byId = Object.fromEntries(INV.map((e) => [e.id, e]));
const ROLES = ['breakfast', 'lunch', 'dinner', 'cafe', 'experience', 'place', 'bar', 'club'];   /* club: BARON, the wedding night (22 Sep 2026) */

test('every place on the website is in the canonical inventory, and every inventory row is on the website', () => {
  const ids = EXP.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'ids unique');
  assert.deepEqual(ids.sort(), INV.map((e) => e.id).sort());
});

test('city and role of every place match the inventory; roles are the Operations Master columns', () => {
  for (const x of EXP) {
    const e = byId[x.id];
    assert.equal(x.where, e.city, x.id + ' city');
    assert.deepEqual(x.roles, e.roles, x.id + ' roles');
    assert.ok(x.roles.length >= 1 && x.roles.every((r) => ROLES.includes(r)), x.id + ' role vocabulary');
    assert.ok(typeof x.row === 'string' && x.row.length, x.id + ' overview row');
  }
});

test('the lead photograph exists on disk and is the first frame of the curated gallery', () => {
  for (const x of EXP) {
    const e = byId[x.id];
    if (e.used === 0) { assert.ok(!x.img, x.id + ' has no photograph by record'); continue; }
    assert.ok(x.img && existsSync(join(ROOT, x.img)), x.id + ' lead on disk: ' + x.img);
    assert.equal(x.img, e.primary, x.id + ' primary');
    if (GAL[x.id]) assert.equal(GAL[x.id].images[0].src, x.img, x.id + ' gallery leads with the lead');
  }
});

test('gallery sizes equal the inventory; every frame exists, carries intrinsic size and alt text', () => {
  for (const x of EXP) {
    const e = byId[x.id], g = GAL[x.id];
    if (e.used <= 1) { assert.ok(!g || g.images.length === e.used, x.id + ' single'); continue; }
    assert.ok(g, x.id + ' has a gallery');
    assert.equal(g.images.length, e.used, x.id + ' gallery count');
    assert.deepEqual(g.images.map((i) => i.src), e.gallery, x.id + ' gallery order');
    assert.ok(['4/5', '3/2', '1/1'].includes(g.frame), x.id + ' frame ratio');
    for (const im of g.images) {
      assert.ok(existsSync(join(ROOT, im.src)), im.src + ' exists');
      assert.ok(im.w > 0 && im.h > 0 && Math.max(im.w, im.h) <= 2000, im.src + ' intrinsic size within the production standard');
      assert.ok(im.alt && im.alt.length > 8, im.src + ' alt text');
    }
  }
});

test('no photograph path is used twice, and no photograph belongs to another place', () => {
  const seen = new Map();
  for (const id of Object.keys(GAL)) {
    const slug = GJSON[id].slug;
    for (const im of GAL[id].images) {
      assert.ok(!seen.has(im.src), im.src + ' used once (also in ' + seen.get(im.src) + ')');
      seen.set(im.src, id);
      assert.ok(im.src.startsWith('assets/images/experiences/' + slug + '-'), im.src + ' carries the slug of ' + id);
    }
  }
});

test('the generated gallery module is exactly what the source record produces', () => {
  const out = execFileSync('node', ['-e', `
    const fs=require('fs');const src=JSON.parse(fs.readFileSync('src/experience-galleries.json','utf8'));const out={};
    for (const id of Object.keys(src)) { if (id.startsWith('_')) continue; const g=src[id]; out[id]={frame:g.frame,images:g.images.map(im=>{const o={src:im.src,w:im.w,h:im.h,alt:im.alt,kind:im.kind};if(im.pos)o.pos=im.pos;return o;})}; }
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT }).toString();
  assert.deepEqual(GAL, JSON.parse(out));
  for (const id of Object.keys(GJSON)) { if (id.startsWith('_')) continue; for (const im of GJSON[id].images) assert.ok(im.drive && im.file && im.kind, id + ' source traceability and kind'); }
});

test('detail content exists where the source carries it; discovery places carry no invented practical fields', () => {
  for (const x of EXP) {
    const e = byId[x.id];
    if (e.sheet === 'FULL') {
      assert.ok(x.intro && x.sections && x.sections.length >= 5, x.id + ' full record structured');
      assert.ok(x.practical && x.practical.price && (x.practical.hours || x.practical.sourceHours), x.id + ' practical fields');
    } else if (e.sheet === 'DETAIL') {
      /* Edit 5 (Owner, 18 Sep 2026): the Operations Master carries a description and the practical facts, not the full structured record */
      assert.ok(x.teaser && Array.isArray(x.detail) && x.detail.length >= 1 && x.detail.every((p) => p.length > 40), x.id + ' description from the source');
      assert.ok(x.practical && Array.isArray(x.practical.hours) && x.practical.hours.length, x.id + ' hours from the source');
      assert.equal(!!x.practical.price, !!e.price, x.id + ' a price only where the source carries one');
      assert.ok(!x.sections && !x.intro, x.id + ' no invented structured record');
    } else if (e.sheet === 'OWNER') {
      /* BARON (Owner, 22 Sep 2026): the Owner's own words and address — a detail and the practical facts the Owner gave (when · dress · address), no invented hours or price */
      assert.ok(x.teaser && Array.isArray(x.detail) && x.detail.length >= 1, x.id + ' the Owner\'s description');
      assert.ok(x.practical && x.practical.when && x.practical.address && !x.practical.hours && !x.practical.price, x.id + ' only the practical facts the Owner gave');
    } else {
      assert.ok(!x.sections && !x.practical, x.id + ' no invented detail record');
      assert.ok(x.teaser, x.id + ' teaser');
    }
  }
});

test('selectable status matches the inventory: the three Highlight tables — Sühring, Baan Phraya, Cannubi (Owner, 20 Sep 2026)', () => {
  for (const x of EXP) assert.equal(!!x.select, byId[x.id].selectable, x.id + ' selectable');
  assert.deepEqual(EXP.filter((x) => x.select).map((x) => x.id), ['bkk-suhring', 'bkk-baanphraya', 'bkk-cannubi']);
  for (const x of EXP.filter((x) => x.select)) assert.ok(x.highlight && x.highlight.distinction && x.highlight.menu.length >= 8, x.id + ' is a Highlight with its menu');
});

test('SÜHRING — canonical entity, Bangkok, restaurant, source category, Drive folder, multiple photographs', () => {
  const s = EXP.find((x) => x.id === 'bkk-suhring'), e = byId['bkk-suhring'];
  assert.ok(s && e);
  assert.equal(s.where, 'Bangkok');
  assert.deepEqual(s.roles, ['dinner'], 'the current Operations Master (19 Sep 2026): Day 01 · 21.02.2027 · Dinner');
  assert.equal(s.row, 'Day 01 · 21.02.2027'); assert.equal(s.day, '21 FEB 2027');
  assert.match(s.cats, /German fine dining/);
  assert.equal(e.drive, '090 - Restaurant - Suhring');
  assert.deepEqual(e.driveIds, ['12BzWDhI4pN5reUWdsgbgMiD4tCWp5I4N']);
  assert.equal(e.sourceImages, 13);
  assert.ok(GAL['bkk-suhring'].images.length >= 3, 'multiple authorised photographs — the dining rooms and the founders; the five dish close-ups left in the release 012 media audit');
  assert.equal(GAL['bkk-suhring'].images.length, e.used);
});

test('SÜHRING — the full source record is rendered, the price per person by Owner decision, the hours verbatim, the dinner dated 21 February', () => {
  const s = EXP.find((x) => x.id === 'bkk-suhring');
  assert.equal(s.sheet, 'FULL');
  assert.deepEqual(s.sections.map((k) => k.k), ['The philosophy', 'The founders', 'The foundation', 'The first mentor', 'Contemporary heritage']);
  assert.match(s.sections[3].p.join(' '), /grandmother Christa/);
  assert.equal(s.practical.price, 'USD 294 · USD 234 per person', 'the house\'s two menu prices, the Owner\'s rounded website amounts (20 Sep 2026)');
  assert.equal(s.practical.when, 'Dinner · Sunday, 21 February 2027 · the first evening in Bangkok');
  assert.equal(s.practical.hours, undefined, 'no meal-hours copy beside the dated dinner (Owner, 19 Sep 2026)');
  assert.deepEqual(s.practical.sourceHours, ['Lunch', 'Thursday to Sunday', '12:30 pm to 13:00 pm (last seating)', 'Closed on Monday and Tuesday'], 'the sheet record stays as the source, verbatim');
  assert.equal(s.maps, 'https://maps.app.goo.gl/2b4whggW3YCnxN6u5?g_st=ic');
  assert.equal(s.link, 'https://www.restaurantsuhring.com/menu.html');
  assert.deepEqual(s.select, { id: 'suhring', unit: 'per person' }, 'the price lives in the one calculation source (its menus)');
  assert.equal(s.highlight.distinction, 'Three MICHELIN Stars'); assert.equal(s.highlight.line, 'Modern German cuisine by Thomas and Mathias Sühring');
  assert.ok(GAL['bkk-suhring'].images.length >= 3 && GAL['bkk-suhring'].images.length === byId['bkk-suhring'].used, 'the authorised gallery stays (its rooms, never its dishes)');
});

/* the shop sandbox: the same modules the pages load, an in-memory localStorage */
const shop = () => {
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const document = { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [], getElementById: () => null, querySelector: () => null, createElement: () => ({ style: {}, classList: { add() {}, toggle() {} }, querySelector: () => ({}) }), head: { appendChild() {} }, body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } } };
  const window = { document, localStorage, addEventListener() {}, CustomEvent: class {} };
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/bag.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', 'CustomEvent', 'SIYL_BAG', 'SIYL_PRICE', 'SIYL_ROOMS', 'SIYL_STOCK', src(f))(window, document, localStorage, class {}, window.SIYL_BAG, window.SIYL_PRICE, window.SIYL_ROOMS, undefined);
  }
  window.SIYL_BAG.badge = () => {};
  return { W: window, store };
};
const addSuhring = (W, n) => { const it = W.SIYL_PRICE.items('suhring')[0]; it.qty = n; it.request = true; it.exp = 'bkk-suhring'; W.SIYL_BAG.put(it); return it; };

test('SÜHRING — the Erlebnis menu is priced PER PERSON by the one calculation source: USD 294 (THB 9,800) or USD 234 (THB 7,800), the chosen menu on the line (Owner, 20 Sep 2026)', () => {
  const { W } = shop(); const P = W.SIYL_PRICE;
  assert.equal(P.FLAT.suhring.price, 294);
  assert.equal(P.FLAT.suhring.cat, 'Restaurant');
  assert.match(P.FLAT.suhring.basis, /USD 294 per person/); assert.match(P.FLAT.suhring.basis, /beverages not included/);
  assert.deepEqual(P.menusOf('suhring').map((m) => [m.slug, m.price, m.thb]), [['erlebnis', 294, 'THB 9,800'], ['erlebnis-short', 234, 'THB 7,800']]);
  assert.equal(P.quote('suhring').unit, 'guest');
  const line = P.items('suhring')[0];
  assert.equal(line.price, 294); assert.equal(line.name, 'Sühring'); assert.equal(line.menu, 'erlebnis'); assert.match(line.meta, /Erlebnis · the complete menu$/);
  const short = P.items('suhring', 'erlebnis-short')[0]; assert.equal(short.price, 234); assert.equal(short.menu, 'erlebnis-short');
  assert.equal(W.SIYL_JOURNEY.meta({ ...line, qty: 2, request: true }).cat, 'Restaurant');
  assert.match(W.SIYL_JOURNEY.meta({ ...short, qty: 1, request: true }).basis, /USD 234 per person/, 'the basis of the menu the guest chose');
  assert.equal(W.SIYL_JOURNEY.quantityLine({ ...line, qty: 1 }), 'USD 294 per person · your cost');
});

test('SÜHRING — one guest, one price: USD 294 for this guest; removal reverses it', () => {
  const { W } = shop(); const B = W.SIYL_BAG;
  addSuhring(W, 1); assert.equal(B.total(), 294);
  B.remove('suhring'); assert.equal(B.total(), 0); assert.ok(!B.has('suhring'));
});

test('SÜHRING — no duplicate addition, reload preserves the selection', () => {
  const { W, store } = shop(); const B = W.SIYL_BAG;
  addSuhring(W, 1); addSuhring(W, 1);
  /* the page guards with has(), and put() replaces in place — never a second line */
  assert.ok(B.has('suhring')); assert.equal(B.get().length, 1);
  assert.match(src('assets/highlight.js'), /window\.SIYL_BAG\.put\(line\)/, 'the Highlight confirm puts — one line per house, a menu change replaces');
  assert.match(src('assets/highlight.js'), /it\.qty = 1; it\.request = true; it\.exp = x\.id;/);
  /* reload = the same storage read by a fresh engine */
  const again = shop(); for (const [k, v] of store) again.store.set(k, v);
  assert.ok(again.W.SIYL_BAG.has('suhring')); assert.equal(again.W.SIYL_BAG.get()[0].qty, 1); assert.equal(again.W.SIYL_BAG.total(), 294);
});

test('SÜHRING — Your Journey and Review & Send carry the request with its calculated amount', () => {
  const yj = src('your-journey.html'), rv = src('review.html'), page = src('experience.html');
  assert.doesNotMatch(yj, /Participating guests|data-q=/, 'no participant stepper: one guest, one request');
  assert.match(yj, /if\(x\.exp\)return 'experience\.html\?id='/);
  assert.match(rv, /RESTAURANT REQUEST \(USD '\+\(x\.price\|\|0\)\+' per person; to be arranged through Guest Relations; not a reservation\)/, 'the line\'s own amount, never a hard-coded one');
  assert.doesNotMatch(rv, /not in the journey total/);
  assert.match(src('assets/highlight.js'), /data-sel-state="current" aria-current="true">Current selection · /);
  assert.match(page, /SIYL_HIGHLIGHT\.html\(x\)/); assert.match(page, /SIYL_HIGHLIGHT\.paint\(x\)/);
});

test('SÜHRING — never described as a confirmed reservation, a confirmed table or guaranteed availability', () => {
  for (const f of ['experience.html', 'assets/pricing.js', 'assets/experiences.js', 'review.html', 'your-journey.html', 'experiences.html']) {
    const t = src(f);
    assert.doesNotMatch(t, /reservation confirmed|table confirmed|availability (is )?guaranteed|confirmed table|guaranteed availability/i, f);
  }
  assert.match(src('experience.html'), /not a reservation — availability is not guaranteed by this page/);
  assert.match(src('assets/pricing.js'), /a request, not a reservation/);
});

/* ONE FOOTER, TWO BUILDERS (15 Sep 2026): the public pages build their footer in assets/recon.js, the
   private pages in assets/shop-menu.js — the two lists must be the same list, and both must feature
   Sühring beside 1872 and the way to the tickets. */
test('FOOTER · recon.js and shop-menu.js list exactly the same links; Sühring · Dinner and Your tickets are in both', () => {
  const links = (f) => { const seg = src(f); const foot = seg.slice(seg.indexOf('sfoot-in'), seg.indexOf('sf-legal')); return [...foot.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => m[1] + ' · ' + m[2]); };
  const a = links('assets/recon.js'), b = links('assets/shop-menu.js');
  assert.deepEqual(a, b, 'the two footers diverged');
  assert.ok(a.includes('experience.html?id=bkk-suhring · Sühring · Dinner'), 'Sühring is featured');
  assert.ok(a.includes('tickets.html · Your tickets'), 'the tickets are in the footer');
  assert.ok(a.indexOf('1872.html · 1872 · Afternoon Tea') + 1 === a.indexOf('experience.html?id=bkk-suhring · Sühring · Dinner'), 'Sühring stands directly beside 1872');
  /* every page that builds a footer builds it from one of the two */
  for (const f of ['index.html', 'destination.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html']) assert.match(src(f), /assets\/recon\.js/, f);
  for (const f of ['cart.html', 'tickets.html', 'journeys.html', 'transport.html', 'room.html', '1872.html', 'tea.html', 'marsilea.html', 'invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) assert.match(src(f), /assets\/shop-menu\.js/, f);
});
