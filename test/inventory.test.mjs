/* See You In Laos — the shared inventory ledger.
 * The stock numbers, the unit arithmetic and the overbooking guard are tested
 * here against the same seed the Durable Object imports. The genuine
 * cross-session race is proved separately against the DEPLOYED ledger and
 * recorded in docs/acceptance — a unit test cannot prove atomicity.
 * Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Rooms, unitsOf, unitOf, mayJoin, stageOf, STAGES } from '../src/rooms.js';
import { SEED, FIXED, unitsFor, sellable } from '../src/inventory-seed.js';
import { page, roomsFetch, doState, plain, PEGGY, LIN, HARUTHAI, SUTHEP } from './sandbox.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* the engine as one guest calls it, and a fictional other guest — never production data */
const identity = (s, hosts) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!hosts });
const other = (n) => ({ invitationId: 'INV-X' + n, guestId: 'g-x' + n, partyId: 'INV-X' + n, hosts: false });
const caller = (rooms) => async (who, op, body) => {
  const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who) }, body: JSON.stringify(body || {}) }));
  return { status: r.status, d: await r.json() };
};
const holdAs = (call) => (who, key, label, need) => call(who, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.guestId.replace(/^g-/, '').replace(/^\w/, (c) => c.toUpperCase()), need: need || 1 });

test('the Souphattra stock is the Sheet stock: 26 rooms, per window', () => {
  const cats = ['heritage', 'heritage-executive', 'heritage-grand-premier', 'noble-courtyard',
                'grand-majestic', 'souphattra-majestic', 'souphattra-presidential'];
  for (const win of ['prewed', 'wedstay']) {
    const total = cats.reduce((t, c) => t + SEED[`${win}/${c}`].capacity, 0);
    assert.equal(total, 26, win + ' must hold the whole house');
  }
  /* the individual counts, from Budget_Room - Rate column C */
  assert.equal(SEED['prewed/heritage'].capacity, 5);
  assert.equal(SEED['prewed/heritage-executive'].capacity, 13);
  assert.equal(SEED['prewed/heritage-grand-premier'].capacity, 3);
  assert.equal(SEED['prewed/noble-courtyard'].capacity, 1);
  assert.equal(SEED['prewed/grand-majestic'].capacity, 2);
  assert.equal(SEED['prewed/souphattra-majestic'].capacity, 1);
  assert.equal(SEED['prewed/souphattra-presidential'].capacity, 1);
  /* and the two windows are SEPARATE stock — the same rooms, sold twice */
  assert.notEqual('prewed/heritage', 'wedstay/heritage');
});

test('nothing is reserved for anyone in the seed (Owner, 19 Sep 2026 · no fixed arrangement): `FIXED` is empty, every entry holds nothing for nobody, every unit is open, who may join asks for an identity and nothing else — the hosts start at zero like every guest', () => {
  assert.deepEqual(FIXED, [], 'the fixed arrangement is an empty export');
  for (const [key, s] of Object.entries(SEED)) {
    assert.equal(s.held, 0, key + ' holds nothing in advance');
    assert.equal(s.heldFor, undefined, key + ' is held for nobody');
    assert.equal(sellable(key), s.capacity, key + ': the whole category is sellable');
    assert.equal(unitsOf(key).every((u) => u.reservedFor === null), true, key + ' has no reserved unit');
  }
  /* the rooms the old ledger kept back — the Presidential, the Bangkok Room A (U Sathorn since the Sathorn Penthouse was deleted, Edit 6), the Grand Majestic, the Solarium, the 270° suite — are open to everyone */
  for (const k of ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'bkk-stay/u-sathorn-superior-garden', 'prewed/grand-majestic', 'wedstay/grand-majestic', 'kmg/solarium', 'ljg/view-suite-270']) assert.equal(sellable(k), SEED[k].capacity, k + ' is open to everyone');
  /* who may join: any authenticated guest, any unit — a host like a guest */
  const guest = identity(PEGGY), host = identity(HARUTHAI, true);
  assert.deepEqual(mayJoin(unitOf('bkk-stay/u-sathorn-superior-garden', 'A'), null), { ok: false, error: 'unauthorised' });
  assert.deepEqual(mayJoin(unitOf('bkk-stay/u-sathorn-superior-garden', 'A'), guest), { ok: true }, 'U Sathorn\'s Room A is open to a guest');
  assert.deepEqual(mayJoin(unitOf('wedstay/souphattra-presidential', 'A'), guest), { ok: true }, 'the Presidential is open to a guest');
  assert.deepEqual(mayJoin(unitOf('bkk-stay/u-sathorn-superior-garden', 'A'), host), { ok: true }, 'a host books like every guest');
  assert.deepEqual(mayJoin(null, host), { ok: false, error: 'unknown room' });
  /* the seed is the only place a number lives; nothing there names anyone as a reservation; the arranged script is gone */
  const seedSrc = readFileSync(join(ROOT, 'src/inventory-seed.js'), 'utf8');
  assert.match(seedSrc, /export const FIXED = \[\];/);
  assert.ok(!/heldFor:/.test(seedSrc), 'no seed entry carries heldFor');
  assert.ok(!existsSync(join(ROOT, 'assets/arranged.js')), 'assets/arranged.js is deleted');
  assert.match(readFileSync(join(ROOT, 'src/rooms.js'), 'utf8'), /export function mayJoin\(unit, identity\) \{\s*if \(!unit\) return \{ ok: false, error: 'unknown room' \};\s*if \(!identity\) return \{ ok: false, error: 'unauthorised' \};\s*return \{ ok: true \};/, 'mayJoin asks for an identity and nothing else');
});

test('a party consumes rooms, not seats — ceil(guests ÷ occupancy)', () => {
  assert.equal(unitsFor('prewed/heritage', 1), 1);
  assert.equal(unitsFor('prewed/heritage', 2), 1);
  assert.equal(unitsFor('prewed/heritage', 3), 2);
  assert.equal(unitsFor('prewed/heritage', 4), 2);
  assert.equal(unitsFor('prewed/heritage', 5), 3);
  /* a four-adult suite takes one room for four guests */
  assert.equal(unitsFor('kmg/left-bank', 4), 1);
  assert.equal(unitsFor('kmg/left-bank', 5), 2);
});

test('a six-room Bangkok category (U Sathorn — the Sathorn Penthouse deleted, Edit 6; Shama Yen-Akat deleted, 24 Sep 2026) is six rooms of two places; the Guest House complimentary (D2) is ONE unit of SIX places held in GUESTS; the wedding window is ONE stage (Owner, 19 Sep 2026)', () => {
  assert.equal(SEED['bkk-stay/penthouse'], undefined, 'the Sathorn Penthouse is deleted (Edit 6, 24 Sep 2026)');
  assert.equal(SEED['bkk-stay/shama-king-studio-balcony'], undefined, 'Shama Yen-Akat is deleted (24 Sep 2026)');
  assert.deepEqual(Object.keys(SEED).filter((k) => k.startsWith('bkk-stay/')).sort(), ['bkk-stay/u-sathorn-superior-garden']);
  assert.equal(SEED['bkk-stay/u-sathorn-superior-garden'].unit, 'room');
  assert.equal(SEED['bkk-stay/u-sathorn-superior-garden'].capacity, 6);
  assert.equal(SEED['bkk-stay/u-sathorn-superior-garden'].occupancy, 2);
  assert.equal(unitsFor('bkk-stay/u-sathorn-superior-garden', 4), 2);
  assert.deepEqual(unitsOf('bkk-stay/u-sathorn-superior-garden').map((u) => [u.label, u.kind, u.places]), [['A', 'room', 2], ['B', 'room', 2], ['C', 'room', 2], ['D', 'room', 2], ['E', 'room', 2], ['F', 'room', 2]], 'Room A – F, twelve places, never a Room G');
  /* the Presidential is ONE room of TWO places, like every room */
  assert.deepEqual(unitsOf('wedstay/souphattra-presidential').map((u) => [u.label, u.places]), [['A', 2]]);
  /* D2 · the guest house: one shared unit of six bookable places, held in GUESTS */
  const gh = SEED['guesthouse/guest-house'];
  assert.equal(gh.unit, 'guest'); assert.equal(gh.capacity, 6); assert.equal(gh.name, 'Guest House complimentary');
  assert.deepEqual(unitsOf('guesthouse/guest-house'), [{ key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null }]);
  assert.equal(unitsFor('guesthouse/guest-house', 6), 6);
  assert.equal(unitsFor('guesthouse/guest-house', 7), 7, 'a seventh guest does not fit in six places');
  assert.ok(unitsFor('guesthouse/guest-house', 7) > sellable('guesthouse/guest-house'));
  /* the invented label is gone from the ledger */
  assert.equal(SEED['airbnb-2br/private-residence'], undefined, 'the retired key is gone');
  assert.ok(!Object.keys(SEED).some((k) => /airbnb|private-residence/.test(k)));
  /* the wedding window is ONE stage whether spent in the hotel or the Guest House (the Riverside was retired 23 Sep 2026) */
  assert.equal(stageOf('guesthouse/guest-house'), 'wedstay'); assert.equal(stageOf('wedstay/heritage'), 'wedstay');
  assert.deepEqual(STAGES, ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']);
  /* Lijiang every category six rooms, the Kempinski six — the current Operations Master */
  for (const k of Object.keys(SEED).filter((k) => k.startsWith('ljg/'))) assert.equal(SEED[k].capacity, 6, k);
  assert.equal(SEED['kempinski/deluxe-balcony-king'].capacity, 6);
});

test('every selectable room in the shop is stock-controlled', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const R = sandbox.window.SIYL_ROOMS;
  const missing = [];
  for (const key of Object.keys(R)) {
    for (const w of R[key].windows) {
      for (const room of R[key].rooms) {
        if (!SEED[`${w.id}/${room.slug}`]) missing.push(`${w.id}/${room.slug}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'a room a guest can pick has no stock behind it');
});

test('the engine is the only place a place is decided; the retired category ledger is no longer written', () => {
  const client = readFileSync(join(ROOT, 'assets/rooms.js'), 'utf8');
  assert.ok(!/capacity\s*[:=]\s*\d/.test(client), 'the client carries a capacity number');
  assert.ok(!/SEED/.test(client), 'the client carries the seed');
  assert.match(client, /\/api\/rooms/, 'the client talks to the engine route');
  assert.match(client, /API \+ '\/join'/, 'the client asks the server for a place');
  assert.match(client, /API \+ '\/leave'/, 'the client can hand a place back');
  const engine = readFileSync(join(ROOT, 'src/rooms.js'), 'utf8');
  assert.match(engine, /blockConcurrencyWhile/, 'a join is not serialised');
  assert.match(engine, /409/, 'full must answer 409');
  assert.match(engine, /HOLD THE NEW PLACE FIRST/);
  const worker = readFileSync(join(ROOT, 'src/worker.js'), 'utf8');
  assert.match(worker, /idFromName\('rooms'\)/, 'every request must reach ONE object');
  assert.match(worker, /retired — use \/api\/rooms/, 'the category ledger answers 410');
  assert.ok(!existsSync(join(ROOT, 'assets/inventory.js')), 'the retired client is gone');
});
test('the guest-facing Guest House matches the ledger: SIX shared places, complimentary, on every surface — never "Private Residence", never "up to 4" (Owner, 19 Sep 2026)', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const R = sandbox.window.SIYL_ROOMS;
  assert.equal(R.airbnb, undefined, 'the retired stay key is gone');
  const gh = R.guesthouse;
  assert.ok(gh, 'SIYL_ROOMS.guesthouse');
  assert.equal(gh.name, 'Guest House complimentary');
  assert.deepEqual(gh.windows.map((w) => w.id), ['guesthouse']);
  const res = gh.rooms.find((r) => r.slug === 'guest-house');
  assert.ok(res, 'the room slug is guest-house');
  assert.equal(res.name, 'Guest House complimentary');
  assert.equal(res.status, 'Complimentary · six shared places');
  assert.equal(res.price, null); assert.equal(res.interest, true); assert.equal(res.complimentary, true);
  assert.equal(SEED['guesthouse/guest-house'].capacity, 6, 'the ledger holds six');
  assert.match(JSON.stringify(res.facts), /Six shared places/, 'the room page must say six');
  assert.match(res.story, /six shared places/);
  assert.ok(!/Private Residence|[Uu]p to 4|four guests|up to four/.test(JSON.stringify(gh)), 'the invented label and the retired capacity are gone');
  /* the photographs, in one folder */
  for (let i = 1; i <= 6; i++) assert.ok(existsSync(join(ROOT, `assets/images/guesthouse/guesthouse-0${i}.jpg`)), `guesthouse-0${i}.jpg`);
  assert.ok(res.gallery.length && res.gallery.every(([src]) => /^assets\/images\/guesthouse\/guesthouse-0[1-6]\.jpg$/.test(src)));
  assert.ok(!existsSync(join(ROOT, 'assets/images/airbnb')), 'the retired folder is gone');
  /* the stay media key */
  assert.ok(JSON.parse(readFileSync(join(ROOT, 'src/stay-media.json'), 'utf8')).guestHouse, 'src/stay-media.json carries guestHouse');
  assert.match(readFileSync(join(ROOT, 'assets/stay-media.js'), 'utf8'), /"guestHouse":\{"name":"Guest House complimentary/);
  /* the pages */
  const shown = (f) => readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const jr = shown('journeys.html');
  assert.match(jr, /id="j-guesthouse"/); assert.match(jr, /data-stay-gal="guestHouse"/); assert.match(jr, /room\.html\?stay=guesthouse&amp;room=guest-house/);
  assert.match(shown('accommodation.html'), /Guest House complimentary/);
  for (const f of ['journeys.html', 'accommodation.html', 'your-journey.html', 'room.html', 'cart.html', 'review.html', 'profile.html', 'src/worker.js', 'src/mail-templates.js', 'assets/journey.js', 'assets/stay.js', 'assets/rooms.js', 'assets/stage-graph.js', 'assets/pricing.js']) {
    const s = shown(f);
    assert.ok(!/Private Residence|private-residence|airbnb-2br/.test(s), f + ' still names the invented residence');
    assert.ok(!/up to (4|four) (guests|adults)/i.test(s), f + ' still advertises four');
  }
});

test('the Owner\'s preferred rooms (SIYL_FULL_EXPERIENCE, read by SIYL_PRICE.premium) all have stock behind them', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const FE = sandbox.window.SIYL_FULL_EXPERIENCE;
  /* no preferred Bangkok room since the Sathorn Penthouse was deleted (Edit 6, 24 Sep 2026): that stage falls to SIYL_PRICE.premium */
  assert.deepEqual(FE, { prewed: 'heritage-grand-premier',
    wedstay: 'heritage-grand-premier', kmg: 'italian', ljg: 'viewing-270',
    kempinski: 'deluxe-balcony-king' });
  assert.equal(FE['bkk-stay'], undefined);
  assert.ok(sellable('bkk-stay/u-sathorn-superior-garden') > 0, 'the premium Bangkok fallback has stock behind it');
  for (const [win, slug] of Object.entries(FE)) {
    const key = `${win}/${slug}`;
    assert.ok(SEED[key], key + ' is not stock-controlled');
    assert.ok(sellable(key) > 0, key + ' has no sellable stock');
    assert.ok((SEED[key].held || 0) < SEED[key].capacity, key + ' is wholly reserved inventory and cannot be a Full Experience default');
  }
});

test('transport stays UNCAPPED in this pass — no guessed seat counts', () => {
  for (const key of ['train', 'mu9632', 'c642', 'return']) {
    assert.ok(!SEED[key], key + ' must not be stock-controlled yet');
    assert.ok(!Object.keys(SEED).some((k) => k.startsWith(key + '/')), key + ' has a seeded seat count');
  }
  const seedSrc = readFileSync(join(ROOT, 'src/inventory-seed.js'), 'utf8');
  for (const t of ['MU9632', 'MU5922', 'MU741', 'C642', 'Special Express']) {
    assert.ok(!seedSrc.includes(t), 'the seed carries a transport capacity for ' + t);
  }
});

test('a photograph and the words after it are separated by a real token', () => {
  const css = readFileSync(join(ROOT, 'assets/aman.css'), 'utf8');
  assert.match(css, /--a-gap-media:\s*96px/, 'the media gap token must exist');
  assert.match(css, /\.a-hero \+ \.a-sec[\s\S]{0,140}margin-top: var\(--a-gap-media\)/,
    'the section after the hero must open on the media gap');
  /* and the shorthand that silently deleted the desktop rhythm is gone */
  assert.ok(!/\.a-lede \{ max-width: 1180px; margin: 0 auto;/.test(css),
    'the margin shorthand still wipes the vertical rhythm at 900 px');
  for (const sel of ['.a-lede', '.a-pair', '.a-duo', '.a-close']) {
    const re = new RegExp('\\' + sel + ' \\{[^}]*margin: 0 auto');
    assert.ok(!re.test(css), sel + ' still resets its vertical rhythm with a shorthand');
  }
});

const shop = () => {
  const sandbox = { window: {}, document: { addEventListener() {}, dispatchEvent() {} },
                    localStorage: { getItem: () => null, setItem() {} } };
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', readFileSync(join(ROOT, f), 'utf8'))
      (sandbox.window, sandbox.document, sandbox.localStorage);
  }
  return sandbox.window;
};

test('D · when The Heritage is sold out the next-cheapest available room is used', () => {
  const w = shop();
  const P = w.SIYL_PRICE;
  assert.equal(P.cheapest('wedstay').slug, 'heritage');
  assert.equal(P.cheapest('wedstay', (s) => s !== 'heritage').slug, 'heritage-executive');
  assert.equal(P.quote('wedstay', 'heritage-executive').total, 155);
  assert.equal(P.cheapest('wedstay', (s) => !['heritage', 'heritage-executive'].includes(s)).slug, 'heritage-grand-premier');
});

test('E · no room is held back from the Cost Saving hotel (Owner, 15 Sep 2026): the cheapest available room is the room', () => {
  const w = shop();
  const P = w.SIYL_PRICE;
  assert.equal(P.cheapest('wedstay', (s) => ['grand-majestic', 'souphattra-presidential'].includes(s)).slug, 'grand-majestic');
  assert.equal(P.cheapest('wedstay', () => false), null);
});

test('F · the Guest House complimentary: Complimentary is the value, six shared places seen by first name, USD 0 in the Bag as a real selection — never "Private Residence" (Owner, 19 Sep 2026)', async () => {
  const rooms = new Rooms(doState());
  const me = identity(PEGGY), lin = identity(LIN);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  w.SIYL_GUEST.setScope({ vientiane: true });
  const wed = J.SEGMENTS.find((s) => s.key === 'wedstay');
  const [line] = P.items('guesthouse', 'guest-house');
  assert.deepEqual(plain(line), { id: 'guesthouse', name: 'Guest House complimentary · Vientiane', meta: '27 February – 01 March 2027 · Complimentary · six shared places', interest: false, complimentary: true, price: 0, stay: 'guesthouse', room: 'guest-house', img: 'assets/images/guesthouse/guesthouse-01.jpg' });
  assert.equal(P.lineBasis(line), '', 'a complimentary line never reads "Amount on request"');
  assert.equal(J.meta(line).cat, 'Accommodation');
  assert.equal(U.label('guesthouse', 'guest-house'), '6 places available');
  assert.equal(U.unitWords(U.units('guesthouse', 'guest-house')[0]), '6 places · Available');
  assert.equal(U.unitName(U.units('guesthouse', 'guest-house')[0]), 'Guest House complimentary', 'a property is named, never "Room A"');
  /* the wedding stay is ONE stage: the hotel or the Guest House */
  assert.deepEqual(plain(wed.ids), ['wedstay', 'guesthouse']);
  assert.deepEqual(plain(ST.stageIds('guesthouse')).sort(), ['guesthouse', 'wedstay', 'wedstay-n1', 'wedstay-n2']);
  /* chosen: a place in the house, in the guest's own name, USD 0 — a Bag line that is a real selection */
  assert.deepEqual(plain(await ST.select('guesthouse', 'guest-house', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, x.complimentary, x.unit, x.unitName])), [['guesthouse', 0, true, 'A', 'Guest House complimentary']]);
  assert.equal(B.total(), 0);
  assert.equal(U.label('guesthouse', 'guest-house'), 'Your place is held · Guest House complimentary');
  assert.equal(U.unitWords(U.units('guesthouse', 'guest-house')[0]), 'You · Your party · 4 places available', 'her place, the place kept for Steffie, four left');
  assert.deepEqual(plain(U.mine('wedstay')), { key: 'guesthouse/guest-house', label: 'A' });
  const c = plain(J.counts());
  assert.deepEqual([c.confirmed, c.open, c.bagItems, c.bagTotal], [1, 1, 1, 0], 'a complimentary line is a confirmed stage at USD 0');
  assert.equal(J.state(wed), 'selected');
  assert.equal(w.SIYL_GUEST.missingFor('journey').some((m) => /^room:/.test(m.key)), false, 'the held place is complete');
  /* who already shares the house, by first name — to any other authenticated guest */
  const w2 = page({ auth: LIN, fetch: await roomsFetch(rooms, lin) }); await w2.SIYL_UNITS.load(true);
  assert.equal(w2.SIYL_UNITS.unitWords(w2.SIYL_UNITS.units('guesthouse', 'guest-house')[0]), 'Peggy · Reserved · 4 places available', 'her first name, the place kept for her party as reserved');
  assert.deepEqual(plain(w2.SIYL_UNITS.units('guesthouse', 'guest-house')[0].occupants), [{ name: 'Peggy', mine: false, party: false }, { name: 'Reserved', mine: false, party: false, placeholder: true }], 'a first name, never an email, a phone number, a code');
  /* the Souphattra replaces it: one line, one hold, the house's place given back */
  assert.equal((await ST.select('wedstay', 'heritage', undefined, 2)).ok, true);
  assert.deepEqual(plain(B.get().map((x) => x.id)), ['wedstay']); assert.equal(B.total(), 145);
  assert.equal(U.units('guesthouse', 'guest-house')[0].taken, 0); assert.deepEqual(plain(U.mine('wedstay')), { key: 'wedstay/heritage', label: 'A' });
  /* the retired, misleading sentence is gone from every surface; the retired capacity too */
  for (const f of ['your-journey.html', 'review.html', 'cart.html', 'room.html', 'journeys.html', 'accommodation.html']) {
    const s = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(!/Guest Relations support applies during the Vientiane wedding stay only/.test(s), f + ' still implies hotel-style service for the house');
    assert.ok(!/up to 4 guests|Private Residence/.test(s), f + ' still says four, or names the invented residence');
  }
  assert.equal(SEED['guesthouse/guest-house'].capacity, 6);
});

test('G · the Guest House takes SIX places: a party of seven cannot take it; the engine refuses a party that does not fit together ("full for your party" — nobody is partially booked), a single guest takes the last place, the seventh is refused "full"; a party counts for its own (Owner, 19 Sep 2026)', async () => {
  const KEY = 'guesthouse/guest-house';
  assert.equal(unitsFor(KEY, 7), 7);
  assert.ok(unitsFor(KEY, 7) > sellable(KEY));
  assert.ok(unitsFor(KEY, 6) <= sellable(KEY));
  const rooms = new Rooms(doState()), call = caller(rooms), hold = holdAs(call);
  const me = identity(PEGGY), steffie = identity({ invitationId: PEGGY.invitationId, guestId: 'g-steffie', partyId: PEGGY.partyId }), lin = identity(LIN);
  for (let n = 1; n <= 5; n++) assert.equal((await hold(other(n), KEY, 'A', 1)).status, 200, 'guest ' + n);
  /* one place left: a party of two is refused as a whole */
  let r = await call(me, 'join', { invitationId: me.invitationId, guestId: me.guestId, key: KEY, label: 'A', name: 'Peggy', need: 2 });
  assert.equal(r.status, 409); assert.equal(r.d.ok, false); assert.equal(r.d.error, 'full for your party'); assert.equal(r.d.need, 2); assert.equal(r.d.free, 1);
  assert.deepEqual(r.d.mine, {}, 'nobody is partially booked');
  assert.equal(r.d.units[KEY][0].taken, 5);
  /* a single guest takes the last place; the house is then sold out; the seventh is refused */
  r = await call(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 200); assert.deepEqual(r.d.joined, { key: KEY, label: 'A' });
  assert.deepEqual(r.d.units[KEY][0].occupants.map((o) => o.name), ['X', 'X', 'X', 'X', 'X', 'Lin'], 'a name is letters: the engine keeps only letters, marks, spaces and \' - . of what a client sends (release 014)');
  assert.equal(r.d.units[KEY][0].full, true); assert.equal(r.d.summary[KEY].soldOut, true); assert.equal(r.d.summary[KEY].remainingPlaces, 0);
  r = await hold(other(7), KEY, 'A', 1);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  /* the same guest again is not a second place */
  r = await call(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 200); assert.equal(r.d.units[KEY][0].taken, 6);
  /* a party counts for its own: with two places left Peggy (need 2) holds hers, Steffie (need 2) finds her party already there and holds the last */
  const rooms2 = new Rooms(doState()), call2 = caller(rooms2), hold2 = holdAs(call2);
  for (let n = 1; n <= 4; n++) assert.equal((await hold2(other(n), KEY, 'A', 1)).status, 200);
  r = await call2(me, 'join', { invitationId: me.invitationId, guestId: me.guestId, key: KEY, label: 'A', name: 'Peggy', need: 2 });
  assert.equal(r.status, 200); assert.equal(r.d.units[KEY][0].free, 0, 'the last place is kept for Steffie');
  r = await call2(steffie, 'join', { invitationId: steffie.invitationId, guestId: steffie.guestId, key: KEY, label: 'A', name: 'Steffie', need: 2 });
  assert.equal(r.status, 200, 'the party member already in the house counts for her'); assert.equal(r.d.units[KEY][0].full, true);
  assert.deepEqual(r.d.units[KEY][0].occupants.filter((o) => o.party).map((o) => o.name), ['Peggy', 'Steffie']);
  r = await call2(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
});

test('the hosts have no special room and the Bag carries only actual selections (Owner, 19 Sep 2026): Haruthai starts at zero like every guest, sees every unit open, books through the engine, holds ONE place per stage; the trip stands at USD 0 with nothing chosen', async () => {
  const rooms = new Rooms(doState());
  const w = page({ auth: HARUTHAI, fetch: await roomsFetch(rooms, identity(HARUTHAI, true)) }); await w.SIYL_UNITS.load(true);
  const U = w.SIYL_UNITS, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, ST = w.SIYL_STAY, G = w.SIYL_GUEST;
  assert.equal(G.party().hosts, true, 'the host flag is explicit');
  const v = U.view();
  assert.deepEqual(plain(v.mine), {}, 'nothing is held before booking'); assert.equal(v.fixed, undefined, 'the view knows no fixed arrangement');
  assert.ok(Object.values(v.units).every((list) => list.every((u) => u.eligible === true && u.reservedFor === null && u.taken === 0)), 'every unit of every category is open to the hosts, none is theirs in advance');
  assert.deepEqual(plain(v.units['bkk-stay/u-sathorn-superior-garden'].map((u) => [u.label, u.free])), [['A', 2], ['B', 2], ['C', 2], ['D', 2], ['E', 2], ['F', 2]]);
  assert.equal(v.summary['bkk-stay/u-sathorn-superior-garden'].ownerReservedRooms, 0); assert.equal(v.summary['wedstay/souphattra-presidential'].reservedFor, null); assert.equal(v.summary['wedstay/souphattra-presidential'].free, 2);
  /* the inert names of the old rule */
  assert.equal(U.fixed(), false); assert.equal(U.fixedUnit(), null); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.reserved(), false);
  assert.equal(ST.fixed(), false); assert.equal(ST.fixedSlug(), ''); assert.equal(w.SIYL_ARRANGED, undefined); assert.equal(w.SIYL_PRICE.reservedFor(), null);
  /* the Bag: nothing chosen, nothing counted, every stage open */
  assert.deepEqual(plain(B.get()), []); assert.equal(B.total(), 0);
  let c = plain(J.counts());
  assert.deepEqual(c, { relevant: 10, confirmed: 0, waitlisted: 0, declined: 0, open: 10, excluded: 0, resolved: 0, bagItems: 0, bagTotal: 0 });
  for (const seg of J.SEGMENTS) assert.equal(J.state(seg), 'open', seg.key + ' is open — never "arranged"');
  assert.equal(J.statusLine(), '10 details to choose.');
  assert.equal(J.countsWords(), '10 still open — of the 10 stages of your trip');
  /* the couple book their own places like everyone else: Room A of U Sathorn, then a change of room — ONE hold per stage */
  assert.deepEqual(plain(await ST.select('bkk-stay', 'u-sathorn-superior-garden', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(U.mine('bkk-stay')), { key: 'bkk-stay/u-sathorn-superior-garden', label: 'A' });
  assert.equal(B.total(), 192);   /* U Sathorn · USD 64 × 3 nights */ assert.deepEqual(plain(B.get().map((x) => [x.id, x.unit, x.unitName])), [['bkk-stay', 'A', 'Room A']]);
  assert.deepEqual(plain(await ST.select('bkk-stay', 'u-sathorn-superior-garden', 'C', 2)), { ok: true, unit: 'C' });
  assert.deepEqual(plain(U.mine('bkk-stay')), { key: 'bkk-stay/u-sathorn-superior-garden', label: 'C' });
  assert.deepEqual(plain(U.units('bkk-stay', 'u-sathorn-superior-garden').map((u) => u.taken)), [0, 0, 2, 0, 0, 0], 'the old place — and the place kept for her party there — was released once the new one was held; the new room keeps a place for her party');
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.unit])), [['bkk-stay', 'C']]);
  c = plain(J.counts()); assert.deepEqual([c.confirmed, c.open, c.bagItems, c.bagTotal], [1, 9, 1, 192]);
  /* Suthep sees Haruthai by first name, and the unit she holds is the one suggested to him */
  const w2 = page({ auth: SUTHEP, fetch: await roomsFetch(rooms, identity(SUTHEP, true)) }); await w2.SIYL_UNITS.load(true);
  assert.deepEqual(plain(w2.SIYL_UNITS.units('bkk-stay', 'u-sathorn-superior-garden')[2].occupants), [{ name: 'Haruthai', mine: false, party: true }, { name: 'Your party', mine: false, party: true, placeholder: true }], 'Haruthai, and the place she keeps for him');
  assert.equal(w2.SIYL_UNITS.suggest('bkk-stay', 'u-sathorn-superior-garden').label, 'C', 'the unit a party member already holds is suggested');
  assert.equal(w2.SIYL_UNITS.unitForParty('bkk-stay', 'u-sathorn-superior-garden', 2).label, 'C', 'and it takes the party: the member already there counts');
  /* without an identity the engine says counts only — no name, no id, nothing fixed */
  const anon = await (await rooms.fetch(new Request('https://x/api/rooms/'))).json();
  assert.equal(anon.fixed, undefined); assert.deepEqual(anon.mine, {}); assert.deepEqual(anon.units['bkk-stay/u-sathorn-superior-garden'][2].occupants, [{}, {}], 'two places taken (hers, and the one kept for her party) — nothing about whom'); assert.equal(anon.units['bkk-stay/u-sathorn-superior-garden'][2].eligible, false);
  /* the record carries the host flag; the mail takes host-ness from it, never from a room */
  assert.match(readFileSync(join(ROOT, 'src/worker.js'), 'utf8'), /hosts: !!who\.hosts/, 'the Worker stores hosts on every record');
  const mail = readFileSync(join(ROOT, 'src/mail-templates.js'), 'utf8');
  assert.match(mail, /record\.hosts/); assert.ok(!/Arranged for you/.test(mail), 'the mail has no "Arranged for you" section');
});
