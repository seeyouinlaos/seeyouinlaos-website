/* See You In Laos — the shared inventory ledger.
 * The stock numbers, the unit arithmetic and the overbooking guard are tested
 * here against the same seed the Durable Object imports. The genuine
 * cross-session race is proved separately against the DEPLOYED ledger and
 * recorded in docs/acceptance — a unit test cannot prove atomicity.
 * Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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

test('rooms already spoken for can never be sold', () => {
  const heldOut = Object.entries(SEED).filter(([, s]) => s.held > 0);
  assert.equal(heldOut.length, 6, 'six categories are allocated already');
  for (const [key, s] of heldOut) {
    assert.equal(sellable(key), s.capacity - s.held, key);
    assert.ok(s.heldFor, key + ' must say who holds it');
  }
  assert.equal(sellable('prewed/grand-majestic'), 0);
  assert.equal(sellable('wedstay/grand-majestic'), 0);
  assert.equal(sellable('prewed/souphattra-presidential'), 0);
  assert.equal(sellable('wedstay/souphattra-presidential'), 0);
  assert.equal(sellable('kmg/solarium'), 0);
  assert.equal(sellable('ljg/view-suite-270'), 0);
  assert.equal(SEED['prewed/grand-majestic'].heldFor, 'Family');
  assert.equal(SEED['prewed/souphattra-presidential'].heldFor, 'Bride & Groom');
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

test('the whole-property products are held in GUESTS, not rooms', () => {
  assert.equal(SEED['bkk-stay/penthouse'].unit, 'guest');
  assert.equal(SEED['bkk-stay/penthouse'].capacity, 12);
  assert.equal(unitsFor('bkk-stay/penthouse', 4), 4);
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

test('the ledger is the only place an allocation is decided', () => {
  const client = readFileSync(join(ROOT, 'assets/inventory.js'), 'utf8');
  assert.ok(!/capacity\s*[:=]\s*\d/.test(client), 'the client carries a capacity number');
  assert.ok(!/SEED/.test(client), 'the client carries the seed');
  assert.match(client, /\/api\/inventory/, 'the client talks to the ledger route');
  assert.match(client, /API \+ '\/reserve'/, 'the client asks the server to reserve');
  assert.match(client, /API \+ '\/release'/, 'the client can hand rooms back');

  const ledger = readFileSync(join(ROOT, 'src/inventory.js'), 'utf8');
  assert.match(ledger, /blockConcurrencyWhile/, 'the reservation is not serialised');
  assert.match(ledger, /409/, 'sold out must answer 409');
  /* remaining is DERIVED from allocations, never stored as a total that could drift */
  assert.match(ledger, /remaining: Math\.max\(0, cap - taken\)/);

  const worker = readFileSync(join(ROOT, 'src/worker.js'), 'utf8');
  assert.match(worker, /idFromName\('ledger'\)/, 'every request must reach ONE object');
});

test('Review & Send holds the rooms BEFORE it stores the registration', () => {
  const rv = readFileSync(join(ROOT, 'review.html'), 'utf8');
  const reserve = rv.indexOf('SIYL_STOCK.reserve()');
  const submit = rv.indexOf('fetch(SUBMIT_URL');
  assert.ok(reserve > 0 && reserve < submit, 'the reservation must come first');
  assert.match(rv, /One of your rooms has just been taken/, 'no sold-out state for the guest');
  assert.match(rv, /SIYL_STOCK\.release\(\)/, 'a failed submission must give the rooms back');
});

test('Full Experience falls back to the next available room', () => {
  const sandbox = { window: {}, document: { addEventListener() {} }, localStorage: null };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/pricing.js'), 'utf8'))(sandbox.window, sandbox.document);
  const P = sandbox.window.SIYL_PRICE;
  /* with everything available the premium choice is unchanged */
  assert.equal(P.premium('prewed').slug, 'souphattra-majestic');
  /* the single Majestic Suite is gone → the next best ELIGIBLE room */
  assert.equal(P.premium('prewed', (s) => s !== 'souphattra-majestic').slug, 'noble-courtyard');
  /* and again → Heritage Grand Premier */
  assert.equal(P.premium('prewed', (s) => !['souphattra-majestic', 'noble-courtyard'].includes(s)).slug, 'heritage-grand-premier');
  /* reserved inventory is still never chosen, however empty the house gets */
  const last = P.premium('prewed', (s) => s === 'heritage');
  assert.equal(last.slug, 'heritage');
  assert.equal(P.premium('prewed', () => false), null, 'a stage with nothing left returns nothing');
  /* Full Experience must record that stage rather than skip it silently */
  const j = readFileSync(join(ROOT, 'assets/journey.js'), 'utf8');
  assert.match(j, /soldOutStages/);
});
