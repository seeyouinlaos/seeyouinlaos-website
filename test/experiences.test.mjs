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
const ROLES = ['breakfast', 'lunch', 'dinner', 'cafe', 'experience', 'place', 'bar'];

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
    for (const id of Object.keys(src)) { const g=src[id]; out[id]={frame:g.frame,images:g.images.map(im=>{const o={src:im.src,w:im.w,h:im.h,alt:im.alt};if(im.pos)o.pos=im.pos;return o;})}; }
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT }).toString();
  assert.deepEqual(GAL, JSON.parse(out));
  for (const id of Object.keys(GJSON)) for (const im of GJSON[id].images) assert.ok(im.drive && im.file, id + ' source traceability');
});

test('detail content exists where the source carries it; discovery places carry no invented practical fields', () => {
  for (const x of EXP) {
    const e = byId[x.id];
    if (e.sheet === 'FULL') {
      assert.ok(x.intro && x.sections && x.sections.length >= 5, x.id + ' full record structured');
      assert.ok(x.practical && x.practical.price && x.practical.hours, x.id + ' practical fields');
    } else {
      assert.ok(!x.sections && !x.practical, x.id + ' no invented detail record');
      assert.ok(x.teaser, x.id + ' teaser');
    }
  }
});

test('selectable status matches the inventory: Sühring alone, by Owner decision', () => {
  for (const x of EXP) assert.equal(!!x.select, byId[x.id].selectable, x.id + ' selectable');
  assert.deepEqual(EXP.filter((x) => x.select).map((x) => x.id), ['bkk-suhring']);
});

test('SÜHRING — canonical entity, Bangkok, restaurant, source category, Drive folder, multiple photographs', () => {
  const s = EXP.find((x) => x.id === 'bkk-suhring'), e = byId['bkk-suhring'];
  assert.ok(s && e);
  assert.equal(s.where, 'Bangkok');
  assert.deepEqual(s.roles, ['lunch']);
  assert.match(s.cats, /German fine dining/);
  assert.equal(e.drive, '090 - Restaurant - Suhring');
  assert.deepEqual(e.driveIds, ['12BzWDhI4pN5reUWdsgbgMiD4tCWp5I4N']);
  assert.equal(e.sourceImages, 13);
  assert.ok(GAL['bkk-suhring'].images.length >= 5, 'multiple authorised photographs');
  assert.equal(GAL['bkk-suhring'].images.length, e.used);
});

test('SÜHRING — the full source record is rendered, the price without an invented unit, the hours verbatim', () => {
  const s = EXP.find((x) => x.id === 'bkk-suhring');
  assert.equal(s.sheet, 'FULL');
  assert.deepEqual(s.sections.map((k) => k.k), ['The philosophy', 'The founders', 'The foundation', 'The first mentor', 'Contemporary heritage']);
  assert.match(s.sections[3].p.join(' '), /grandmother Christa/);
  assert.equal(s.practical.price, 'USD 180');
  assert.doesNotMatch(s.practical.price, /per/);
  assert.match(s.practical.priceNote, /does not state/);
  assert.deepEqual(s.practical.hours, ['Lunch', 'Thursday to Sunday', '12:30 pm to 13:00 pm (last seating)', 'Closed on Monday and Tuesday']);
  assert.equal(s.maps, 'https://maps.app.goo.gl/2b4whggW3YCnxN6u5?g_st=ic');
  assert.equal(s.link, 'https://www.restaurantsuhring.com/menu.html');
  assert.deepEqual(s.select, { id: 'suhring', name: 'Sühring', meta: 'Lunch · German fine dining · Bangkok', price: 'USD 180' });
  const page = src('experience.html');
  assert.match(page, /request: true, priceNote: s\.price, exp: x\.id/);
  assert.match(page, /if \(SIYL_BAG\.has\(s\.id\)\) \{ paintSel\(\); return; \}/, 'duplicate selection impossible');
  assert.match(page, /data-sel-state="current" aria-current="true">In your journey/);
  assert.match(page, /It is a request, not a reservation/);
});

test('SÜHRING — the request line is named in Your Journey and Review & Send and never enters the total', () => {
  const journey = src('assets/journey.js'), yj = src('your-journey.html'), rv = src('review.html');
  assert.match(journey, /if \(x\.request\) return \{ cat: 'Restaurant'/);
  assert.match(journey, /'suhring': 'BANGKOK DAYS'/);
  assert.match(journey, /if \(x\.interest \|\| x\.request\) return '';/);
  assert.match(yj, /x\.request\?'<p class="p-line-amt"><span class="t-l1">Request · '/);
  assert.match(yj, /if\(x\.exp\)return 'experience\.html\?id='/);
  assert.match(rv, /x\.request\?'<p class="p-line-amt"><span class="t-l1">Request · '/);
  assert.match(rv, /TABLE REQUEST \('\+\(x\.priceNote\|\|''\)\+' as recorded by the hosts, unit not stated in the source; not a confirmed reservation; not in the journey total\)/);
  /* the bag total is price × qty — a request line carries no price */
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const document = { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [], getElementById: () => null, querySelector: () => null, createElement: () => ({ style: {}, classList: { add() {}, toggle() {} }, querySelector: () => ({}) }), head: { appendChild() {} }, body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } } };
  const window = { document, localStorage, addEventListener() {}, CustomEvent: class {} };
  new Function('window', 'document', 'localStorage', 'CustomEvent', src('assets/bag.js'))(window, document, localStorage, class {});
  const B = window.SIYL_BAG; B.badge = () => {};
  B.add({ id: 'suhring', name: 'Sühring', meta: 'Lunch · German fine dining · Bangkok', request: true, priceNote: 'USD 180', exp: 'bkk-suhring', qty: 1 });
  assert.equal(B.total(), 0);
  assert.ok(B.has('suhring'));
  /* reload = a fresh read of the same storage */
  assert.equal(JSON.parse(localStorage.getItem('siyl.bag'))[0].request, true);
});
