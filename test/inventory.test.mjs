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
    assert.ok(!SEED[key].heldFor, key + ' is reserved inventory and cannot be a Full Experience default');
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
  /* FULL EXPERIENCE — a bordered block, not a text link */
  assert.match(yj, /class="fxcta" id="fxb"/, 'Full Experience must be the primary block');
  assert.match(yj, /\.fxcta\{[^}]*border:1px solid #313131/, 'the primary action must be a bordered block');
  assert.match(yj, /\.fxcta\{[^}]*min-height:66px/, 'the primary action must be a real block target');
  assert.match(yj, /The complete journey/, 'the primary action must say what it does');
  /* COST SAVING — the quiet alternative */
  assert.match(yj, /class="fxalt" id="csb"/, 'Cost Saving must be the quiet alternative');
  assert.match(yj, /\.fxalt\{[^}]*min-height:44px/, 'the alternative must still be a 44 px target');
  assert.ok(!/\.fxalt\{[^}]*border:1px solid/.test(yj), 'the alternative must not compete with the primary');
  /* REVIEW & SEND — the solid dark submission, a third thing again */
  assert.match(yj, /\.cta\{[^}]*background:#313131/, 'Review & Send stays the solid dark action');
  /* nothing bright, nothing rounded */
  assert.ok(!/\.fxcta\{[^}]*border-radius/.test(yj));
  assert.ok(!/\.fxcta\{[^}]*gradient\(to/.test(yj));
  /* the CTA's own classes must not collide with the confirmation overlay:
     .fxs is the fixed scrim and .fxo is the dialogue */
  assert.match(yj, /class="fxsub"/, 'the CTA sub-line must not reuse the scrim class');
  assert.ok(!/\.fxcta \.fxs\{/.test(yj), '.fxs is the overlay scrim, not a CTA part');
  assert.ok(!/class="fxs"[^>]*>The complete/.test(yj));
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
  /* reserved inventory is still never chosen, however empty the house gets */
  assert.equal(P.approved('prewed', (s) => s === 'grand-majestic'), null);
  assert.equal(P.approved('prewed', () => false), null, 'a stage with nothing left returns nothing');
  /* Full Experience must record that stage rather than skip it silently */
  const j = readFileSync(join(ROOT, 'assets/journey.js'), 'utf8');
  assert.match(j, /soldOutStages/);
});
