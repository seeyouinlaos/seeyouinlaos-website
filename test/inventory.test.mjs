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
import { unitsOf } from '../src/rooms.js';
import { SEED, unitsFor, sellable } from '../src/inventory-seed.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

test('the Master\'s reservations live in the seed and shape the units (Owner, 16 Sep 2026): the first `held` rooms of a category are reserved for `heldFor`', () => {
  const noted = Object.entries(SEED).filter(([, s]) => s.held > 0);
  assert.equal(noted.length, 7, 'the six categories the Master marks + the Penthouse\'s Room A (the Owner\'s allocation)');
  assert.equal(SEED['prewed/grand-majestic'].heldFor, 'Family'); assert.equal(SEED['wedstay/grand-majestic'].held, 2);
  assert.equal(SEED['prewed/souphattra-presidential'].heldFor, 'Bride & Groom'); assert.equal(SEED['wedstay/souphattra-presidential'].heldFor, 'Bride & Groom');
  assert.equal(SEED['bkk-stay/penthouse'].held, 1); assert.equal(SEED['bkk-stay/penthouse'].heldFor, 'Bride & Groom');
  assert.equal(SEED['kmg/solarium'].heldFor, 'Bride & Groom'); assert.equal(SEED['ljg/view-suite-270'].held, 4);
  for (const [key, sd] of noted) { const units = unitsOf(key); assert.equal(units.filter((u) => u.reservedFor === sd.heldFor).length, sd.held, key + ': exactly `held` reserved rooms'); assert.equal(units.slice(sd.held).every((u) => u.reservedFor === null), true, key + ': the rest open'); }
  for (const [key] of Object.entries(SEED).filter(([, s]) => !s.held)) assert.equal(unitsOf(key).every((u) => u.reservedFor === null), true, key + ' has no reserved unit');
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

test('the six-bedroom Penthouse is six rooms of two places; the residence is held in GUESTS', () => {
  assert.equal(SEED['bkk-stay/penthouse'].unit, 'room');
  assert.equal(SEED['bkk-stay/penthouse'].capacity, 6);
  assert.equal(SEED['bkk-stay/penthouse'].occupancy, 2);
  assert.equal(unitsFor('bkk-stay/penthouse', 4), 2);
  /* the hosted residence: the Owner's capacity is SIX guests */
  assert.equal(SEED['airbnb-2br/private-residence'].unit, 'guest');
  assert.equal(SEED['airbnb-2br/private-residence'].capacity, 6);
  assert.equal(unitsFor('airbnb-2br/private-residence', 6), 6);
  assert.equal(unitsFor('airbnb-2br/private-residence', 7), 7, 'a seventh guest does not fit in six places');
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
test('the guest-facing residence capacity matches the ledger: SIX guests', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const res = sandbox.window.SIYL_ROOMS.airbnb.rooms.find((r) => r.slug === 'private-residence');
  assert.equal(SEED['airbnb-2br/private-residence'].capacity, 6, 'the ledger holds six');
  assert.match(JSON.stringify(res.facts), /Up to 6 guests/, 'the room page must say six');
  assert.match(res.story, /six guests/);
  assert.match(res.status, /up to 6 guests/);
  assert.ok(!/[Uu]p to 4/.test(JSON.stringify(res)), 'the retired capacity of four is still shown');
  for (const f of ['journeys.html', 'accommodation.html']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const block = src.slice(Math.max(0, src.indexOf('Private Residence') - 400), src.indexOf('Private Residence') + 600);
    assert.ok(!/up to (4|four) adults/i.test(block), f + ' still advertises four');
  }
});

test('the Owner-approved Full Experience rooms all have stock behind them', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const FE = sandbox.window.SIYL_FULL_EXPERIENCE;
  assert.deepEqual(FE, { 'bkk-stay': 'penthouse', prewed: 'heritage-grand-premier',
    wedstay: 'heritage-grand-premier', kmg: 'italian', ljg: 'viewing-270',
    kempinski: 'deluxe-balcony-king' });
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
  for (const t of ['MU9632', 'MU5924', 'C642', 'Special Express']) {
    assert.ok(!seedSrc.includes(t), 'the seed carries a transport capacity for ' + t);
  }
});

test('the mode actions are three different weights, and all are 44 px targets', () => {
  const yj = readFileSync(join(ROOT, 'your-journey.html'), 'utf8');
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  /* FULL EXPERIENCE — the bordered block (the system's quiet primary action) */
  assert.match(yj, /class="p-act quiet" id="fxb"/, 'Full Experience must be the primary block');
  assert.match(yj, /The complete journey/, 'the primary action must say what it does');
  const quiet = sys.slice(sys.indexOf('.p-act.quiet {'), sys.indexOf('}', sys.indexOf('.p-act.quiet {')));
  assert.match(quiet, /background: none; color: var\(--p-ink\)/, 'the quiet primary is a bordered block');
  assert.match(sys, /--p-act-h: 52px/, 'every primary action is a real block target');
  /* COST SAVING — the quiet alternative: an underlined secondary action */
  assert.match(yj, /class="p-link" id="csb"/, 'Cost Saving must be the quiet alternative');
  const link = sys.slice(sys.indexOf('.p-link {'), sys.indexOf('.p-link:hover'));
  assert.match(link, /min-height: var\(--p-tap\)/, 'the alternative must still be a 44 px target');
  assert.match(sys, /--p-tap:\s+44px/);
  assert.ok(!/border: 1px solid/.test(link.replace(/border-bottom: 1px solid[^;]*;/, '')), 'the alternative must not compete with the primary');
  /* the continuation — the solid primary action, a third thing again */
  const act = sys.slice(sys.indexOf('.p-act {'), sys.indexOf('.p-act:hover'));
  assert.match(act, /background: var\(--p-ink\)/, 'the primary continuation stays the solid dark action');
  /* nothing bright, nothing rounded */
  assert.ok(!/border-radius/.test(act) && !/gradient\(/.test(act));
  /* the confirmation lives in the shell's one detail layer, never a second overlay */
  assert.match(yj, /SH\.drawer\(h,/, 'the mode confirmation must use the shell drawer');
  assert.ok(!/class="fxo"/.test(yj) && !/class="fxs"/.test(yj), 'no page-local overlay survives');
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

test('Full Experience falls back to the next available room', () => {
  const sandbox = { window: {}, document: { addEventListener() {} }, localStorage: null };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/pricing.js'), 'utf8'))(sandbox.window, sandbox.document);
  const P = sandbox.window.SIYL_PRICE;
  /* with everything available the premium choice is unchanged */
  assert.equal(P.approved('prewed').slug, 'heritage-grand-premier');
  /* the approved room is gone → the nearest ELIGIBLE and AVAILABLE one */
  assert.equal(P.approved('prewed', (s) => s !== 'heritage-grand-premier').slug, 'heritage-executive');
  /* and again → The Heritage, still the nearest rate rather than the dearest */
  assert.equal(P.approved('prewed', (s) => !['heritage-grand-premier', 'heritage-executive'].includes(s)).slug, 'heritage');
  /* no room is held back any more (Owner, 15 Sep 2026): with only the Grand Majestic left, it is the room */
  assert.equal(P.approved('prewed', (s) => s === 'grand-majestic').slug, 'grand-majestic');
  assert.equal(P.approved('prewed', () => false), null, 'a stage with nothing left returns nothing');
  /* Full Experience must record that stage rather than skip it silently */
  const j = readFileSync(join(ROOT, 'assets/journey.js'), 'utf8');
  assert.match(j, /soldOutStages/);
});


/* ==========================================================================
   COST SAVING IS A MODE WITH TWO STAYS — a decision object, not two buttons.
   ========================================================================== */
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

test('A · Cost Saving exposes exactly TWO choices', () => {
  const w = shop();
  const opts = w.SIYL_JOURNEY.costSavingOptions(2);
  assert.equal(opts.length, 2);
  assert.deepEqual(opts.map((o) => o.key), ['hotel', 'residence']);
  for (const o of opts) {
    assert.ok(o.name && o.amount && o.amountNote, o.key + ' is incomplete');
    assert.ok(Array.isArray(o.service) && o.service.length >= 3, o.key + ' has no service model');
  }
});

test('B/C · the hotel choice is the lowest-priced eligible room — The Heritage, USD 145', () => {
  const w = shop();
  const [hotel] = w.SIYL_JOURNEY.costSavingOptions(2);
  assert.equal(hotel.room.slug, 'heritage');
  assert.equal(hotel.amount, 'USD 145');
  assert.equal(hotel.items.length, 1);
  assert.equal(hotel.items[0].id, 'wedstay');
  assert.equal(hotel.items[0].price, 145);
  /* it is the WEDDING STAY window: one payable night, the second hosted */
  assert.equal(hotel.items[0].pay, 1);
  assert.equal(hotel.items[0].nights, 2);
  assert.match(hotel.service.join(' '), /second night: hosted by Haruthai & Suthep/i);
  assert.match(hotel.service.join(' '), /Guest Relations support during the Vientiane Wedding Stay/);
});

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

test('F · the complimentary residence: USD 0, six guests, no individual support', () => {
  const w = shop();
  const [, res] = w.SIYL_JOURNEY.costSavingOptions(2);
  assert.equal(res.amount, 'Complimentary', 'COMPLIMENTARY is the dominant value, not USD 0');
  assert.match(res.amountNote, /Complimentary/);
  assert.match(res.amountNote, /up to 6 guests/);
  assert.equal(res.items[0].price, 0);
  assert.equal(res.items[0].complimentary, true);
  const svc = res.service.join(' ');
  assert.match(svc, /No individual Guest Relations travel or accommodation support/);
  assert.match(svc, /Arrival, departure and transfers arranged by you/);
  assert.match(svc, /Wedding programme participation included/);
  /* the retired, misleading sentence is gone from every surface */
  for (const f of ['your-journey.html', 'review.html']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(!/Guest Relations support applies during the Vientiane wedding stay only/.test(src),
      f + ' still implies hotel-style service for the complimentary residence');
  }
  assert.equal(SEED['airbnb-2br/private-residence'].capacity, 6);
});

test('G · a party of seven cannot take the residence', () => {
  assert.equal(unitsFor('airbnb-2br/private-residence', 7), 7);
  assert.ok(unitsFor('airbnb-2br/private-residence', 7) > sellable('airbnb-2br/private-residence'));
  assert.ok(unitsFor('airbnb-2br/private-residence', 6) <= sellable('airbnb-2br/private-residence'));
});

test('M/N · Cost Saving → Full removes whichever stay was taken, and 2,155 stands', () => {
  const w = shop();
  const P = w.SIYL_PRICE;
  const plan = w.SIYL_JOURNEY.fullExperience();
  /* both Cost Saving answers to the wedding stage are cleared by the mode */
  assert.ok(plan.remove.includes('wedstay'), 'the hotel stay must be cleared');
  assert.ok(plan.remove.includes('airbnb-2br'), 'the residence must be cleared');
  const wed = plan.add.find((x) => x.id === 'wedstay');
  assert.equal(wed.room, 'heritage-grand-premier');
  assert.equal(wed.price, 170);
  assert.ok(!plan.add.some((x) => x.id === 'airbnb-2br'));
  assert.equal(plan.add.reduce((t, x) => t + (x.price || 0), 0), 2155);
});
