/* ============================================================================
   THE CLOSEOUT (Owner, 7 October 2026) — Google → Billing Engine → website.
   Synthetic guests and quotes only.

   · the server tells the website 002's own rate for every product it prices
     (listRate, at 002's precision) — a hotel the guest pays directly included —
     and the website lists that rate, never a figure of its own, once the
     server has answered; before that, its catalogue (synced to the live 002)
   · rooms keep the order they always had: ranked by what the ROOM costs a
     night, so a single room is never "dearer" than a double merely by one
     person's share
   · the Presidential keeps its own (closed) handling: no listRate, nothing new
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, PEGGY, src } from './sandbox.mjs';
import { calculate } from '../src/billing/engine.js';

test('RATES · once the server answers, a stay lists 002\'s own rate — the room rate follows at the catalogue\'s occupancy; before, the catalogue', () => {
  /* a synthetic server that states a rate the catalogue does not (65 against its 130): the server's wins */
  const w = page({ auth: PEGGY, quotes: { 'prewed/heritage-executive': { total: 130, block: 'A', rateSource: 'STANDARD_RATE', ratePerNight: 65, listRate: 65 } } });
  const P = w.SIYL_PRICE, at = P.locate('prewed'), room = at.stay.rooms.find((r) => r.slug === 'heritage-executive');
  assert.equal(P.rateOf('prewed', room), 65, 'the server\'s 002 rate, not the catalogue\'s 130');
  const q = P.quote('prewed', 'heritage-executive');
  assert.deepEqual([q.rate, q.roomRate, q.total], [65, 130, 130]);
  assert.equal(q.nightly, 'USD 65 per person per night'); assert.equal(q.roomNightly, 'USD 130 per room per night');
  /* nothing answered yet: the catalogue's own figure */
  const pending = page({ auth: PEGGY, billing: 'pending' }).SIYL_PRICE;
  assert.equal(pending.rateOf('prewed', pending.locate('prewed').stay.rooms.find((r) => r.slug === 'heritage-executive')), 130);
  /* a hotel the guest pays directly (Block B): its listed amount is the server's rate × the nights */
  const b = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': { total: 0, block: 'B', rateSource: 'GUEST_SELF_PAYMENT', ratePerNight: null, listRate: 18.16666667 } } }).SIYL_PRICE;
  const kq = b.quote('kmg', 'jinri-terrace-double');
  assert.deepEqual([kq.rate, kq.total, kq.priceState], [18.16666667, 54.5, 'self']);
});

test('RATES · the catalogue\'s own figures are the live 002 of 7 Oct 2026 (Kunming, Lijiang, Hotel Muse: per person, half the room)', () => {
  const P = page({ auth: PEGGY, billing: 'failed' }).SIYL_PRICE;
  const rate = (win, slug) => P.rateOf(win, P.locate(win).stay.rooms.find((r) => r.slug === slug));
  assert.deepEqual([rate('kmg', 'elegant-residence'), rate('kmg', 'jinri-terrace-double'), rate('kmg', 'jinri-family-suite')], [39.12, 18.16666667, 21.445]);
  assert.deepEqual([rate('ljg', 'snow-mountain-viewing'), rate('ljg', 'private-soup-view'), rate('ljg', 'view-suite-270')], [134.14, 58.155, 54.2175]);
  assert.equal(rate('kempinski', 'jatu-room'), 40.8525);
  assert.match(src('src/legacy-keys.js'), /meta: '6 – 8 March 2027 · Jatu Room', rate: 40\.8525, pay: 2,/, 'a former Kempinski line becomes the Jatu Room at today\'s rate');
});

test('RATES · rooms keep their order — ranked by the room\'s own price a night: the dearest, the cheapest and the nearest are the rooms they always were', () => {
  const P = page({ auth: PEGGY, billing: 'failed' }).SIYL_PRICE;
  assert.equal(P.premium('kmg').slug, 'jinri-family-suite', 'the family suite (USD 42.89 the room), never the single room (USD 39.12)');
  assert.equal(P.cheapest('kmg').slug, 'jinri-terrace-double');
  assert.equal(P.premium('ljg').slug, 'snow-mountain-viewing');
  assert.equal(P.approved('ljg').slug, 'private-soup-view');
});

test('RATES · the Presidential keeps its closed handling: no listRate from the server, its catalogue figure, nobody\'s amount', () => {
  const w = page({ auth: PEGGY, quotes: { 'prewed/souphattra-presidential': { total: null, block: null, rateSource: null, manualReview: 'no approved special rate names this person', listRate: null } } });
  const P = w.SIYL_PRICE, room = P.locate('prewed').stay.rooms.find((r) => r.slug === 'souphattra-presidential');
  assert.equal(P.rateOf('prewed', room), 1095, 'exactly as before');
  const q = P.quote('prewed', 'souphattra-presidential');
  assert.equal(q.total, null); assert.equal(q.personal, undefined);
});

test('RATES · a Bag line takes the server\'s rate when it changes; an old sent trip is matched to its former rate within 0.000001', () => {
  assert.match(src('assets/pricing.js'), /x\.price === fresh\.price && x\.rate === fresh\.rate && x\.pay === fresh\.pay/);
  assert.match(src('src/worker.js'), /r28\.findIndex\(\(v\) => Math\.abs\(v - Number\(l\.rate\)\) < 1e-6\)/);
});

test('RATES · the server sends listRate only from 002\'s Standard_Rate (positive, full precision); the Presidential carries none and keeps its closed handling', () => {
  const routes = src('src/billing-routes.js');
  assert.match(routes, /listRate: listRateOf\(item\),/);
  assert.match(routes, /function listRateOf\(item\) \{[\s\S]{0,200}clean\(item\.Rate_Basis\) !== 'PER_PERSON_PER_NIGHT' \|\| clean\(item\.Rate_Status\) !== 'ACTIVE'\) return null;/);
  /* a catalogue that prices by asking this module back is never a loop (the page answers from its catalogue) */
  const w = page({ auth: PEGGY });
  assert.doesNotThrow(() => w.SIYL_PRICE.quote('kmg', 'jinri-terrace-double'));
});

/* C-HERITAGE-EXECUTIVE — THE FINAL RATE CORRECTION (Owner, 8 Oct 2026): the general rate of the pre-wedding Heritage Executive is
   USD 130 per person per night (002 Standard_Rate); only the guests a named 009 row names keep USD 65. Synthetic guests. */
test('HERITAGE EXECUTIVE · 002 says 130 for everyone; a named 009 rate of 65 prices only the two guests it names', () => {
  const items = { 'C-HERITAGE-EXECUTIVE': { Item_ID: 'C-HERITAGE-EXECUTIVE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 130, Currency: 'USD', Site_Product_Key: 'prewed/heritage-executive', 'Number of Nights': 2 } };
  const stay = (p) => ({ Booking_ID: 'B-' + p, Holder_ID: 'INV-HX', Person_ID: p, Item_ID: 'C-HERITAGE-EXECUTIVE', State: 'CONFIRMED', Quantity: 1, Nights: 2 });
  const rows = ['HX1', 'HX2'].map((p) => ({ Holder_ID: 'INV-HX', Person_ID: p, Item_ID: 'C-HERITAGE-EXECUTIVE', Rate_Per_Person_Night: 65, Nights_Rule: '2',
    Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep', Note: 'Package C · USD 130 per person' }));
  for (const p of ['HX1', 'HX2']) {
    const l = calculate([stay(p)], { items, specialRates: rows, asOf: '2026-10-08' }).lines[0];
    assert.deepEqual([l.rateCents, l.payableNights, l.amountCents, l.block, l.rateSource], [6500, 2, 13000, 'A', 'SPECIAL_RATE'], p);
  }
  const other = calculate([stay('HX3')], { items, specialRates: rows, asOf: '2026-10-08' }).lines[0];
  assert.deepEqual([other.rateCents, other.payableNights, other.amountCents, other.rateSource], [13000, 2, 26000, 'STANDARD_RATE'], 'a guest the rows do not name: USD 130');
});

test('HERITAGE EXECUTIVE · the website lists 130; a named guest sees the special USD 130 for both nights against it, everyone else USD 260', () => {
  const special = page({ auth: PEGGY, quotes: { 'prewed/heritage-executive': { total: 130, block: 'A', rateSource: 'SPECIAL_RATE', ratePerNight: 65, listRate: 130 } } }).SIYL_PRICE;
  const room = (P) => P.locate('prewed').stay.rooms.find((r) => r.slug === 'heritage-executive');
  assert.equal(special.rateOf('prewed', room(special)), 130);
  const q = special.quote('prewed', 'heritage-executive');
  assert.deepEqual([q.personal, q.total, q.amount, q.per], ['special', 130, 'USD 130', 'per person']);
  assert.match(q.contribution, /^Your special rate · 2 nights · the listed rate: USD 130 per person per night$/);
  const normal = page({ auth: PEGGY, quotes: { 'prewed/heritage-executive': { total: 260, block: 'A', rateSource: 'STANDARD_RATE', ratePerNight: 130, listRate: 130 } } }).SIYL_PRICE;
  const n = normal.quote('prewed', 'heritage-executive');
  assert.deepEqual([n.personal || null, n.total, n.nightly], [null, 260, 'USD 130 per person per night']);
});
