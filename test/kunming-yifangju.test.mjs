/* THE KUNMING HOUSE IS REPLACED (Owner, 27 Sep 2026 · Package F, Days 09 – 11, 1 – 4 March 2027): the former hotel is no longer
   bookable. The Yifangju Designer Courtyard, Jinma Biji Archway, Kunming Old Street — exactly the three rooms of the current
   Accommodation_Details, one room each, their own photographs from Owner Drive 800 (one folder per room). A place or a Bag line of
   the former hotel belongs to a retired key: it is nobody's, it leaves the Bag, and nothing is chosen for the guest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { page, src, ROOT, plain, roomsFetch, doState, PEGGY } from './sandbox.mjs';
import { Rooms, unitsOf, stageOf } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';

const ident = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, firstName: String(s.preferredName || '').split(/\s+/)[0] });
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const ROOMS = [
  /* the live 002 (28 Sep 2026): N 39.12 · O 36.33 (two rooms, O24) · P 42.89 per person per night */
  { key: 'kmg/elegant-residence', slug: 'elegant-residence', name: '001 · Elegant Residence Double Bed Room', places: 1, rooms: 1, rate: 39.12, roomRate: 39.12, pp3: 117.36, room3: 117.36 },
  { key: 'kmg/jinri-terrace-double', slug: 'jinri-terrace-double', name: '002 · Jinri Building Scenic Terrace Tub Double', places: 2, rooms: 2, rate: 36.33333333, roomRate: 72.66666667, pp3: 109, room3: 218 },
  { key: 'kmg/jinri-family-suite', slug: 'jinri-family-suite', name: '003 · Jinri Terrace Tub Family Suite', places: 2, rooms: 1, rate: 42.89, roomRate: 85.78, pp3: 128.67, room3: 257.34 }
];

test('THE INVENTORY · Package F is exactly three room types — one, two (the live 002, 28 Sep 2026) and one rooms — sleeping 1 · 2 · 2; no key of the former hotel is left', () => {
  assert.deepEqual(Object.keys(SEED).filter((k) => stageOf(k) === 'kmg'), ROOMS.map((r) => r.key));
  for (const r of ROOMS) {
    assert.equal(SEED[r.key].capacity, r.rooms, r.key + ': ' + r.rooms + ' room(s)'); assert.equal(SEED[r.key].name, r.name);
    const u = unitsOf(r.key); assert.equal(u.length, r.rooms); assert.equal(u[0].places, r.places, r.key + ' sleeps ' + r.places);
  }
  for (const old of ['left-bank', 'penang', 'family-suite', 'seine', 'smart-family', 'solarium', 'standard-single', 'junting', 'mid-century', 'milano', 'italian', 'light-french']) assert.equal(SEED['kmg/' + old], undefined, old + ' is retired');
});

test('THE PRICES · the sheet\'s per-person rate per night, three nights, to the cent: 117.36 · 109 · 128.67 per person, the room 117.36 · 218 · 257.34; USD 36.33 is written, never 36.333', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, K = w.SIYL_ROOMS.kunming;
  assert.equal(K.name, 'Yifangju Designer Courtyard · Kunming'); assert.equal(K.place, 'Jinma Biji Archway · Kunming Old Street'); assert.equal(K.breakfast, 'Breakfast included');
  assert.deepEqual(plain(K.windows.map((x) => [x.id, x.dates, x.n])), [['kmg', '1 – 4 March 2027', 3]]);
  assert.deepEqual(plain(K.rooms.map((r) => r.slug)), ROOMS.map((r) => r.slug), 'the Owner\'s numbered order');
  for (const r of ROOMS) {
    const room = K.rooms.find((x) => x.slug === r.slug);
    assert.equal(room.name, r.name); assert.equal(room.rate, r.rate); assert.equal(room.roomRate, r.roomRate);
    const q = P.quote('kmg', r.slug);
    assert.equal(q.nights, 3); assert.equal(q.pay, 3); assert.equal(q.total, r.pp3, r.slug + ' per person for three nights');
    assert.equal(Math.round(q.total * r.places * 100) / 100, r.room3, r.slug + ' the room for three nights');
    assert.equal(room.facts.find((f) => f[0] === 'Occupancy')[1], r.places === 1 ? '1 adult' : '2 adults');
  }
  assert.equal(P.money(36.33333333), 'USD 36.33'); assert.equal(P.money(72.66666667), 'USD 72.67'); assert.equal(P.money(109), 'USD 109');
  assert.match(P.quote('kmg', 'jinri-terrace-double').basis, /^USD 109 per person · 3 nights: .+ · USD 36\.33 per person per night$/);
});

test('THE PHOTOGRAPHS · seven per room, each room only its own folder, the Owner\'s WebP on disk bit for bit, nothing of the former hotel', () => {
  const w = page({ auth: PEGGY }); const K = w.SIYL_ROOMS.kunming, ART = w.SIYL_STAY_ART;
  const all = [];
  for (const r of ROOMS) {
    const g = K.rooms.find((x) => x.slug === r.slug).gallery.map((x) => x[0]);
    assert.equal(g.length, 7, r.slug + ': seven photographs');
    for (const f of g) { assert.match(f, new RegExp('^assets/images/yifangju/' + r.slug + '-[1-7]\\.webp$')); assert.ok(fs.existsSync(path.join(ROOT, f)), f); assert.ok(ART.ok('kunming', f), f + ' approved for the house'); }
    all.push(...g);
  }
  assert.equal(new Set(all).size, 21, 'no photograph shared between rooms');
  const M = JSON.parse(src('src/media/manifest.json')), c = M.collections['800'];
  assert.equal(c.items.length, 21); assert.ok(c.items.every((it) => it.mimeType === 'image/webp' && fs.statSync(path.join(ROOT, it.asset)).size === it.size), 'the Owner\'s bytes, unchanged');
  for (const r of ROOMS) assert.equal(c.items.filter((it) => it.asset.includes('/' + r.slug + '-')).length, 7);
  assert.equal(M.collections['026'].level, 'property', 'the Drive folder 026 now holds the Yifangju property'); assert.equal(M.collections['044'].status, 'retired');
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets/images/kunming')) || fs.readdirSync(path.join(ROOT, 'assets/images/kunming')).length === 0, 'the former hotel\'s photographs are gone');
  assert.deepEqual(plain(ART.FOLDERS.kunming), ['assets/images/yifangju/']);
});

test('NO FORMER HOTEL ON ANY GUEST SURFACE · pages, modules, the house gallery, the menu, the journey label, the flight\'s arrival line, the Thai dictionary', () => {
  const served = fs.readdirSync(ROOT).filter((f) => /\.html$/.test(f)).concat(fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => 'assets/' + f), ['assets/i18n/th.js', 'src/i18n-th.json', 'src/stay-media.json']);
  for (const f of served) assert.doesNotMatch(src(f), /Wanxiang|Railway Station MixC/i, f);
  assert.match(src('journeys.html'), /data-stay-gal="yifangju"[^>]*><\/div><p class="pw"><b>1 – 4 Mar<\/b> · Accommodation · Kunming<\/p><p class="pn">Yifangju Designer Courtyard · Kunming<\/p>/);
  assert.match(src('accommodation.html'), /<h3>Yifangju Designer Courtyard<\/h3>/);
  assert.match(src('assets/aman.js'), /\['Yifangju Designer Courtyard Kunming', 'journeys\.html#j-kmg'\]/);
  assert.match(src('assets/journey.js'), /key: 'kmg', when: '1 – 4 Mar'[\s\S]*?label: 'Yifangju Designer Courtyard'/);
  /* Day 12 stays the train: C86 Kunming → Lijiang, 4 March */
  assert.match(src('assets/journey.js'), /key: 'c86', when: '4 Mar', cat: 'Transportation', place: 'Kunming → Lijiang'/);
  const th = JSON.parse(src('src/i18n-th.json')).exact;
  assert.equal(th['Extra beds and cribs are not available'], 'ไม่สามารถเพิ่มเตียงเสริมหรือเตียงเด็กอ่อนได้');
  assert.match(th["A courtyard house on Kunming's Old Street, by the Jinma Biji Archway — three rooms to choose from, breakfast included."], /Jinma Biji/);
});

test('A PLACE OF THE FORMER HOTEL · a stored hold on a retired key is nobody\'s: not the guest\'s, not counted, not moved; the new rooms take the guest by capacity', async () => {
  const state = doState(), rooms = new Rooms(state), PEG = ident(PEGGY);
  await state.storage.put('occ:kmg/italian|A|' + PEG.guestId, { invitationId: PEG.invitationId, partyId: PEG.partyId, name: 'Peggy', at: '2026-09-20T10:00:00.000Z' });
  const v = await rooms.view(PEG);
  assert.equal(v.mine.kmg, undefined, 'no Kunming place is the guest\'s any more'); assert.equal(v.summary['kmg/italian'], undefined);
  assert.deepEqual(Object.keys(v.summary).filter((k) => /^kmg\//.test(k)), ROOMS.map((r) => r.key), 'nothing was put in its place');
  assert.ok(ROOMS.every((r) => v.summary[r.key].guestOccupiedPlaces === 0));
  assert.equal((await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'kmg/elegant-residence', label: 'A', need: 2 }, PEG)).d.error, 'full for your party', 'a room for one guest never takes a party of two');
  assert.equal((await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'kmg/jinri-family-suite', label: 'A', need: 3 }, PEG)).d.error, 'full for your party', 'three never fit a room for two');
  const ok = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'kmg/jinri-terrace-double', label: 'A', need: 2 }, PEG);
  assert.equal(ok.status, 200); assert.deepEqual(plain(ok.d.mine.kmg), { key: 'kmg/jinri-terrace-double', label: 'A' });
  assert.ok(await state.storage.get('occ:kmg/italian|A|' + PEG.guestId), 'the history is kept, never deleted');
});

test('A BAG LINE OF THE FORMER HOTEL · it leaves the Bag and the total, with or without an engine hold; no Yifangju room is chosen for the guest; every other line stays', async () => {
  for (const hold of [false, true]) {
    const saved = [{ id: 'kmg', name: 'Wanxiang Yueju · Kunming', meta: '1 – 4 March 2027 · Italian Style Suite', price: 150, qty: 1, stay: 'kunming', room: 'italian', unit: 'A' }, { id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 }];
    const w = page({ auth: PEGGY, seed: { 'siyl.guest': JSON.stringify({ scope: { bangkok: true, vientiane: true, china: true, none: false, at: '2026-09-27T10:00:00.000Z', by: 'g-peggy' }, guests: {} }), 'siyl.bag': JSON.stringify(saved) } });
    const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG;
    const v = await new Rooms(doState()).view(ident(PEGGY));
    if (hold) v.mine = { ...v.mine, kmg: { key: 'kmg/italian', label: 'A' } };
    U._set(v); ST.sync();
    const lines = plain(B.get()), why = hold ? ' (engine hold on the retired key)' : ' (no engine hold)';
    assert.deepEqual(lines.map((x) => x.id), ['train'], 'the Kunming line is gone, the train stays' + why);
    assert.ok(!lines.some((x) => /elegant-residence|jinri/.test(x.room || '')), 'no Yifangju room is chosen for the guest' + why);
    assert.equal(B.total(), 100, 'the total excludes the former line' + why);
    assert.equal(w.SIYL_JOURNEY.state(w.SIYL_JOURNEY.SEGMENTS.filter((s) => s.key === 'kmg')[0]), 'open', 'the Kunming stage asks for a choice' + why);
  }
});

test('THE BOOKING (the shipped client on the shipped engine) · the Yifangju rooms, a Bag line at the corrected amount, the room page\'s words', async () => {
  const rooms = new Rooms(doState()), PEG = ident(PEGGY);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, PEG) }); const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG;
  w.SIYL_GUEST.setScope({ all: true }); await U.load(); B.set([]);
  assert.deepEqual(plain(U.units('kmg', 'elegant-residence').map((u) => u.places)), [1]);
  const r = await ST.select('kmg', 'jinri-terrace-double', null, 1);
  assert.equal(r.ok, true);
  const line = plain(B.get()).find((x) => x.id === 'kmg');
  assert.equal(line.room, 'jinri-terrace-double'); assert.equal(line.price, 109); assert.equal(line.name, 'Yifangju Designer Courtyard · Kunming');
  assert.match(line.meta, /1 – 4 March 2027 · 002 · Jinri Building Scenic Terrace Tub Double/);
  assert.equal(B.total(), 109);
});

/* PROPERTY MEDIA ≠ ROOM MEDIA (Owner, 28 Sep 2026): the six property photographs (Owner Drive 026) stand for the HOUSE — the house
   gallery on The Journey, the Stays card, the stay's Bag frame — and never inside a room; each room shows its own seven (Drive 800,
   one folder per room) and nothing of the house or of another room. The media contract says which is which. */
test('PROPERTY ≠ ROOM · the house surfaces show only the six property frames; every room only its own seven; the contract records the level of every source', () => {
  const w = page({ auth: PEGGY }); const K = w.SIYL_ROOMS.kunming, SM = JSON.parse(src('src/stay-media.json')).yifangju, ART = w.SIYL_STAY_ART;
  const HOUSE = [1, 2, 3, 4, 5, 6].map((n) => 'assets/images/yifangju/house-' + n + '.webp');
  assert.deepEqual(plain(SM.images.map((i) => i.src)), HOUSE, 'the house gallery: the six property frames, the façade first');
  assert.equal(SM.images[0].kind, 'exterior');
  assert.equal(K.windows[0].bagImg, HOUSE[0]); assert.equal(ART.house('kunming', 'kmg'), HOUSE[0], 'the stay\'s own frame is the house');
  assert.match(src('accommodation.html'), /background-image:url\(assets\/images\/yifangju\/house-1\.webp\)/);
  assert.doesNotMatch(src('accommodation.html') + JSON.stringify(plain(SM)) + K.windows[0].bagImg, /elegant-residence|jinri-/, 'no room frame on a house surface');
  for (const r of K.rooms) {
    const g = r.gallery.map((x) => x[0]);
    assert.equal(g.length, 7); assert.ok(g.every((f) => f.startsWith('assets/images/yifangju/' + r.slug + '-')), r.slug + ': its own seven only');
    assert.ok(!g.some((f) => /house-/.test(f)), r.slug + ': no property frame in a room');
  }
  for (const f of HOUSE) assert.ok(fs.existsSync(path.join(ROOT, f)));
  const M = JSON.parse(src('src/media/manifest.json'));
  const p = M.collections['026'], r = M.collections['800'];
  assert.equal(p.level, 'property'); assert.equal(r.level, 'room');
  const pm = p.items.filter((i) => i.status === 'synced');
  assert.equal(pm.length, 6); assert.ok(pm.every((i) => i.level === 'property' && /\/house-[1-6]\.webp$/.test(i.asset) && i.slots.every((s) => s.role !== 'room-gallery') && fs.statSync(path.join(ROOT, i.asset)).size === i.size));
  assert.equal(r.items.length, 21); assert.ok(r.items.every((i) => i.level === 'room' && i.asset.includes('/' + i.room + '-') && i.slots.every((s) => s.role === 'room-gallery')));
});
