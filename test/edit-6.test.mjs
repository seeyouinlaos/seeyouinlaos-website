/* ============================================================================
   EDIT 6 (Owner, 24 September 2026).

   · SATHORN PENTHOUSE BANGKOK IS DELETED: no stock, no room record, no media,
     no card, no menu link, no preferred-room entry — nothing replaces it. A
     record sent before the deletion is recomputed without its line; the
     submission itself is never rewritten.
   · RIVERSIDE HOTEL VIENTIANE stays absent (deleted 23 Sep 2026).
   · WAT ONG TEU shows the Owner's replacement pictures (Drive folder 195).
   · LAO TRADITIONAL DRESS RENTAL is a Vientiane experience in the Master's words.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { SEED } from '../src/inventory-seed.js';
import { journeyModel } from '../src/mail-templates.js';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
const exists = (f) => fs.existsSync(new URL('../' + f, import.meta.url));
function browser(...files) {
  const ctx = { window: {}, console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(read(f), ctx);
  return ctx.window;
}

test('SATHORN PENTHOUSE · no stock, no room, no media, no card, no link, no preferred room — nothing replaces it', () => {
  assert.equal(SEED['bkk-stay/penthouse'], undefined);
  /* Bangkok is U Sathorn alone: Shama Yen-Akat was deleted too (Owner, 24 Sep 2026) — nothing replaces either */
  assert.deepEqual(Object.keys(SEED).filter((k) => k.startsWith('bkk-stay/')).sort(), ['bkk-stay/u-sathorn-superior-garden']);
  assert.equal(SEED['bkk-stay/shama-king-studio-balcony'], undefined, 'Shama Yen-Akat is deleted');
  const w = browser('assets/rooms-data.js');
  assert.deepEqual([...w.SIYL_ROOMS.sathorn.rooms.map((r) => r.slug)], ['u-sathorn-superior-garden']);
  assert.equal(w.SIYL_STAY_IMAGES.shamaYenAkat, undefined, 'no Shama image map');
  assert.equal(JSON.parse(read('src/stay-media.json')).shamaYenAkat, undefined, 'no Shama media record');
  for (const f of ['accommodation.html', 'journeys.html', 'room.html', 'your-journey.html', 'assets/rooms-data.js', 'assets/stay-media.js', 'src/inventory-seed.js', 'src/stay-media.json']) {
    assert.ok(!/shama/i.test(code(f)), f + ' still names Shama Yen-Akat');
  }
  assert.equal(w.SIYL_STAY_IMAGES.sathornPenthouse, undefined);
  assert.equal(w.SIYL_FULL_EXPERIENCE['bkk-stay'], undefined);
  assert.equal(JSON.parse(read('src/stay-media.json')).sathornPenthouse, undefined);
  for (const f of ['index.html', 'accommodation.html', 'journeys.html', 'room.html', 'cart.html', 'review.html', 'profile.html', 'your-journey.html',
    'assets/rooms-data.js', 'assets/stay-media.js', 'assets/aman.js', 'assets/journey.js', 'src/inventory-seed.js', 'src/stay-media.json']) {
    assert.ok(!/penthouse/i.test(code(f)), f + ' still names the Sathorn Penthouse');
  }
});

test('SATHORN PENTHOUSE · a record sent before the deletion is recomputed without the line; the rest stands', () => {
  const pent = { id: 'bkk-stay', name: 'Sathorn Penthouse Bangkok', meta: '21 – 24 February 2027 · Sathorn Penthouse', price: 255, stay: 'sathorn', room: 'penthouse', qty: 1 };
  const train = { id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 };
  const rec = { guestId: 'G900', registration: { guestId: 'G900', selections: [pent, train], totalUsd: 355 } };
  const M = journeyModel(rec);
  assert.equal(M.total, 100);
  assert.ok(!M.stays.some((s) => /Penthouse/.test(s.name)));
  assert.equal(rec.registration.totalUsd, 355, 'the submission is never rewritten');
  const kept = journeyModel({ guestId: 'G901', registration: { guestId: 'G901', selections: [train], totalUsd: 100 } });
  assert.equal(kept.total, 100);
});

test('RIVERSIDE HOTEL VIENTIANE stays absent', () => {
  assert.ok(!Object.keys(SEED).some((k) => k.startsWith('riverside/') || k.startsWith('stayext/')));
  for (const f of ['accommodation.html', 'journeys.html', 'assets/rooms-data.js', 'assets/stay-media.js', 'src/stay-media.json']) {
    assert.ok(!/Riverside Hotel/.test(code(f)), f + ' names the Riverside Hotel');
  }
});

test('WAT ONG TEU · the replacement pictures of Drive folder 195, the façade first; the text and the date unchanged', () => {
  const g = JSON.parse(read('src/experience-galleries.json'))['vte-ongteu'];
  assert.equal(g.folderId, '1NJGHVmgIvwoOawNM3gwH_m1Fh25tBpQn');
  assert.deepEqual(g.images.map((i) => i.file), ['IMG_4316.jpeg', 'IMG_4315.jpeg', 'IMG_3659.jpeg', 'IMG_3658.jpeg']);
  for (const i of g.images) assert.ok(exists(i.src), i.src);
  const x = browser('assets/experiences.js').SIYL_EXPERIENCES || null;
  const src = read('assets/experiences.js');
  assert.match(src, /id: 'vte-ongteu'[^\n]*visits: \[\{ day: 8, date: '2027-02-28', seq: 900, what: 'Temple Ceremony' \}\]/); /* TO-02979: the date unchanged, the approved name */
  assert.match(src, /id: 'vte-ongteu'[^\n]*img: 'assets\/images\/experiences\/vte-ongteu-01\.jpg'/);
  void x;
});

test('LAO TRADITIONAL DRESS RENTAL · a Vientiane experience in the Operations Master\'s own words, price and hours', () => {
  const src = read('assets/experiences.js');
  assert.match(src, /\{ id: 'vte-laodress', category: 'experience', roles: \['experience'\], visits: \[\], row: 'city', chapter: 'laos'[^\n]*name: 'Lao Traditional Dress Rental', where: 'Vientiane'/);
  assert.match(src, /practical: \{ price: 'USD 15', hours: \['Every day 09:00 – 18:00'\] \}/); /* TO-02994 · TO-02993 */
  assert.ok(src.includes('Please bring your own footwear: the rental provides the traditional shirt, the sinh or trousers, and the accessories only.'), 'TO-02992');
  const g = JSON.parse(read('src/experience-galleries.json'))['vte-laodress'];
  assert.equal(g.folderId, '1YzeS_UGJJeTNMXS2mgRhqC9ZToc5xtxZ');
  assert.equal(g.images.length, 6);
  for (const i of g.images) { assert.ok(exists(i.src), i.src); assert.equal(i.kind, 'venue'); }
  const inv = JSON.parse(read('src/experience-inventory.json'));
  const list = Array.isArray(inv) ? inv : Object.values(inv).find(Array.isArray);
  const r = list.find((x) => x.id === 'vte-laodress');
  assert.equal(r.city, 'Vientiane'); assert.equal(r.price, 'USD 15.00'); assert.equal(r.hours, 'Everyday 09:00 – 18:00');
  assert.ok(/vte-laodress/.test(read('assets/experience-galleries.js')), 'the generated galleries carry it');
});
