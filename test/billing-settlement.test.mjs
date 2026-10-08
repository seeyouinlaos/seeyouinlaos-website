/* ============================================================================
   THE GUEST SETTLEMENT — the final Codex review's findings, held (5 Oct 2026).

   Every case runs the shipped modules: the engine, the BillingLedger actor, the
   Confirmed-Booking adapter and the authenticated billing routes. Google is
   replaced at the fetch boundary by an in-memory workbook of SYNTHETIC data
   (no real guest, rate or account), and the service-account key is generated
   here for the run — nothing secret is part of this file.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { register } from 'node:module';

/* the routes' auth module, replaced for this file only: the identity is the test's */
const STUB = 'data:text/javascript,' + encodeURIComponent(`
export async function identify() { return globalThis.__billingIdentity || null; }
export async function loadIndex() { return globalThis.__billingIndex || {}; }
export function owns() { return true; }
export async function authIdOf() { return null; }
export function displayName(v) { return String(v || ''); }`);
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier === './auth.js' && context.parentURL && context.parentURL.endsWith('/src/billing-routes.js')) {
    return { url: ${JSON.stringify(STUB)}, shortCircuit: true };
  }
  return next(specifier, context);
}`));

const { handleBilling } = await import('../src/billing-routes.js');
const { BillingLedger } = await import('../src/billing-ledger.js');
const { calculate, computeLine, ENGINE_VERSION } = await import('../src/billing/engine.js');
const { paymentPosition, journalPosition, paymentStatus, buildSnapshot } = await import('../src/billing/settlement.js');
const { detectDrift } = await import('../src/billing/reconciliation.js');
const { loadConfirmedBookings, CONFIRMATION } = await import('../src/billing/bookings.js');
const { REFERENCE_CASES } = await import('../src/billing/activation-gate.js');
const { PAYMENT_JOURNAL_COLUMNS } = await import('../src/billing/source.js');

/* ------------------------------------------------------------ the doubles */

function doState() {
  const map = new Map();
  let turn = Promise.resolve(), inside = false;
  return {
    storage: {
      get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined),
      put: async (k, v) => { map.set(k, structuredClone(v)); },
      delete: async (k) => map.delete(k),
      list: async ({ prefix = '' } = {}) => new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])),
    },
    blockConcurrencyWhile: (fn) => {
      if (inside) return Promise.resolve().then(fn);
      const next = turn.then(() => { inside = true; return fn(); }).finally(() => { inside = false; });
      turn = next.then(() => undefined, () => undefined);
      return next;
    },
    _map: map,
  };
}
const ledgerOf = () => { const st = doState(); return { st, led: new BillingLedger(st) }; };
const call = async (led, op, body) => {
  const r = await led.fetch(new Request('https://billing/api/billing-ledger/' + op, { method: 'POST', body: JSON.stringify(body || {}) }));
  return { status: r.status, j: await r.json() };
};
const kv = (o) => ({ get: async (k) => (o[k] === undefined ? null : (typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k]))) });

/* --- synthetic items and rates --- */
const ITEMS = {
  'T-STAY': { Item_ID: 'T-STAY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: 145, Currency: 'USD', Site_Product_Key: 'wedstay/heritage', 'Number of Nights': 2 },
  'T-TRAIN': { Item_ID: 'T-TRAIN', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON',
    Standard_Rate: 100, Currency: 'USD', Site_Product_Key: 'train', 'Number of Nights': 1 },
  'T-SUITE': { Item_ID: 'T-SUITE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'DRAFT', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Currency: 'USD', Site_Product_Key: 'wedstay/suite', 'Number of Nights': 2 },
};
const booking = (o) => ({ Booking_ID: 'B-' + o.Item_ID + '-' + o.Person_ID, Holder_ID: 'INV-T1', Person_ID: 'GT1', State: 'CONFIRMED', Quantity: 1, Nights: 2, ...o });

/* ================================================================ engine */

test('ENGINE · a named rate counts only when APPROVED; a Holder-only rate never opens a DRAFT item; a person-scoped approved rate does', () => {
  const ctx = (specialRates) => ({ items: ITEMS, specialRates, asOf: '2026-10-05' });
  const suite = booking({ Item_ID: 'T-SUITE' });
  const unapproved = [{ Item_ID: 'T-SUITE', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 75 }];
  assert.equal(computeLine(suite, ctx(unapproved)).amountCents, null, 'an unapproved row is not engine input');
  const holderOnly = [{ Item_ID: 'T-SUITE', Holder_ID: 'INV-T1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 75, Approved_By: 'Suthep' }];
  const h = computeLine(suite, ctx(holderOnly));
  assert.equal(h.amountCents, null); assert.match(h.reviewReason, /no approved special rate names this person/);
  const named = [{ Item_ID: 'T-SUITE', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 75, Approved_By: 'Suthep' }];
  assert.equal(computeLine(suite, ctx(named)).amountCents, 15000);
  /* and the named person's party mate still gets nothing */
  assert.equal(computeLine(booking({ Item_ID: 'T-SUITE', Person_ID: 'GT2' }), ctx(named)).amountCents, null);
});

test('ENGINE · two equally specific approved rates are AMBIGUOUS — review, never the first by order', () => {
  const two = [
    { Item_ID: 'T-STAY', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 100, Approved_By: 'Suthep' },
    { Item_ID: 'T-STAY', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 90, Approved_By: 'Haruthai' },
  ];
  const l = computeLine(booking({ Item_ID: 'T-STAY' }), { items: ITEMS, specialRates: two, asOf: '2026-10-05' });
  assert.equal(l.amountCents, null); assert.match(l.reviewReason, /two approved special rates/);
});

test('ENGINE · a charge is rounded once: 109 / 3 per night × 3 nights = USD 109.00, never 108.99', () => {
  const items = { 'T-K': { Item_ID: 'T-K', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: '36.33333333', Currency: 'USD' } };
  const l = computeLine(booking({ Item_ID: 'T-K', Nights: 3 }), { items, specialRates: [], asOf: '2026-10-05' });
  assert.equal(l.amountCents, 10900);
});

/* ===================================== a booking H&S paid for the guest (Owner, 7 Oct 2026) */
const PROVIDER_ITEMS = {
  ...ITEMS,
  /* a stay the guest normally pays the hotel for, and a flight the guest books — both settled with the provider */
  'T-HOTEL': { Item_ID: 'T-HOTEL', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: '18.16666667', Currency: 'USD' },
  'T-LODGE': { Item_ID: 'T-LODGE', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: '58.155', Currency: 'USD' },
  'T-FLIGHT': { Item_ID: 'T-FLIGHT', Billing_Category: 'GUEST_SELF_BOOKING', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 200, Currency: 'USD' },
  'T-DINNER': { Item_ID: 'T-DINNER', Billing_Category: 'HOSTED_NO_GUEST_CHARGE', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 60, Currency: 'USD' },
  'T-OUT': { Item_ID: 'T-OUT', Billing_Category: 'EXCLUDE_FROM_GUEST_SETTLEMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 10, Currency: 'USD' },
};
const paidByHS = (o) => ({ Person_ID: 'GT1', Holder_ID: 'INV-T1', Rate_Status: 'ACTIVE', Nights_Rule: 'ALL', Approved_By: 'Haruthai & Suthep',
  Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Note: 'Booked and paid by Haruthai · reimbursed to Haruthai & Suthep', ...o });
const pctx = (specialRates) => ({ items: PROVIDER_ITEMS, specialRates, asOf: '2026-10-07' });

test('ENGINE 2.3 · a stay H&S booked and paid for the guest is PAYABLE — Block A, at the price paid, in the total; the party mate and every other line unchanged', () => {
  /* the Owner's figures per person (8 Oct 2026): USD 109.00 for three nights, USD 232.62 for two — never half */
  const rows = [paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: '36.33333333' }), paidByHS({ Item_ID: 'T-LODGE', Rate_Per_Person_Night: '116.31' })];
  const hotel = computeLine(booking({ Item_ID: 'T-HOTEL', Nights: 3 }), pctx(rows));
  assert.equal(hotel.block, 'A'); assert.equal(hotel.Billing_Category, 'GUEST_SETTLEMENT_REQUIRED');
  assert.deepEqual(hotel.categoryOverride, { from: 'GUEST_SELF_PAYMENT' });
  assert.equal(hotel.rateSource, 'SPECIAL_RATE'); assert.equal(hotel.payableNights, 3);
  assert.equal(hotel.amountCents, 10900, '36.33333333 × 3 nights = USD 109.00, rounded once');
  assert.equal(hotel.specialRateRef, 'Booked and paid by Haruthai · reimbursed to Haruthai & Suthep', 'the PDF says why');
  assert.equal(hotel.review, null);

  const r = calculate([booking({ Item_ID: 'T-TRAIN' }), booking({ Item_ID: 'T-HOTEL', Nights: 3 }), booking({ Item_ID: 'T-LODGE', Nights: 2 }),
    booking({ Item_ID: 'T-FLIGHT' })], pctx(rows));
  assert.equal(r.totalPayableCents, 10000 + 10900 + 23262, 'the train, the Kunming stay, the Lijiang stay — the flight stays the guest\'s own');
  assert.deepEqual(r.blockA.map((l) => l.Item_ID), ['T-TRAIN', 'T-HOTEL', 'T-LODGE']);
  assert.deepEqual(r.blockB.map((l) => l.Item_ID), ['T-FLIGHT']);

  /* the same hotel for the party mate, whom no row names: still the guest's own, USD 0 */
  const mate = computeLine(booking({ Item_ID: 'T-HOTEL', Person_ID: 'GT2', Nights: 3 }), pctx(rows));
  assert.equal(mate.block, 'B'); assert.equal(mate.amountCents, 0); assert.equal(mate.Billing_Category, 'GUEST_SELF_PAYMENT');
  /* the same person and another self-payment line no row names: unchanged */
  assert.equal(computeLine(booking({ Item_ID: 'T-FLIGHT' }), pctx(rows)).block, 'B');
  assert.equal(ENGINE_VERSION, 'billing-engine/2.3.0');
});

test('ENGINE 2.3 · without the price paid the line asks for it: PRICE REQUIRED, MANUAL REVIEW, no total — never the catalogue figure', () => {
  const rows = [paidByHS({ Item_ID: 'T-HOTEL' }), paidByHS({ Item_ID: 'T-LODGE', Rate_Per_Person_Night: '58.155' })];
  const hotel = computeLine(booking({ Item_ID: 'T-HOTEL', Nights: 3 }), pctx(rows));
  assert.equal(hotel.amountCents, null, 'the 002 rate (18.17) is never used in its place');
  assert.equal(hotel.review, 'MANUAL_REVIEW_REQUIRED');
  assert.match(hotel.reviewReason, /^PRICE REQUIRED — the price H&S paid for this booking is not in 009/);
  const r = calculate([booking({ Item_ID: 'T-HOTEL', Nights: 3 }), booking({ Item_ID: 'T-LODGE', Nights: 2 })], pctx(rows));
  assert.equal(r.totalPayableCents, null, 'a statement with a price missing states no total');
  assert.equal(r.manualReview.length, 1);
  assert.equal(r.blockA.map((l) => l.Item_ID).join(), 'T-LODGE');
});

test('ENGINE 2.3 · only an approved row naming the person may do it; another value, a Holder-only row, a hosted or excluded item go to review; a row without the column stays informational', () => {
  const hotel = booking({ Item_ID: 'T-HOTEL', Nights: 3 });
  /* the informational self-payment rows that already exist (Package J): no Billing_Category, nothing payable */
  const informational = computeLine(hotel, pctx([{ Item_ID: 'T-HOTEL', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 92.1, Nights_Rule: 2, Approved_By: 'Haruthai & Suthep' }]));
  assert.equal(informational.block, 'B'); assert.equal(informational.amountCents, 0);
  /* a row that says "paid by H&S" but does not count yet never lets the hotel fall back to the guest's own: review */
  for (const o of [{ Approved_By: '' }, { Rate_Status: 'DRAFT' }, { Effective_To: '2026-09-30' }]) {
    const l = computeLine(hotel, pctx([paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: 20, ...o })]));
    assert.equal(l.amountCents, null, JSON.stringify(o)); assert.match(l.reviewReason, /not ACTIVE, approved and in date/);
  }
  assert.equal(computeLine(hotel, pctx([paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: 20, Rate_Status: 'RETIRED' })])).block, 'B', 'a RETIRED row is a withdrawal');
  const holderOnly = computeLine(hotel, pctx([paidByHS({ Item_ID: 'T-HOTEL', Person_ID: '', Rate_Per_Person_Night: 20 })]));
  assert.equal(holderOnly.amountCents, null); assert.match(holderOnly.reviewReason, /must name the person/);
  const other = computeLine(hotel, pctx([paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: 20, Billing_Category: 'GUEST_SELF_BOOKING' })]));
  assert.equal(other.amountCents, null); assert.match(other.reviewReason, /not one the engine applies/);
  const hosted = computeLine(booking({ Item_ID: 'T-DINNER' }), pctx([paidByHS({ Item_ID: 'T-DINNER', Rate_Per_Person_Night: 60 })]));
  assert.equal(hosted.amountCents, null); assert.match(hosted.reviewReason, /HOSTED_NO_GUEST_CHARGE item payable/);
  const excluded = computeLine(booking({ Item_ID: 'T-OUT' }), pctx([paidByHS({ Item_ID: 'T-OUT', Rate_Per_Person_Night: 10 })]));
  assert.equal(excluded.amountCents, null); assert.match(excluded.reviewReason, /EXCLUDE_FROM_GUEST_SETTLEMENT item payable/);
  /* a self-booked flight H&S paid is payable the same way */
  const flight = computeLine(booking({ Item_ID: 'T-FLIGHT', Nights: 1 }), pctx([paidByHS({ Item_ID: 'T-FLIGHT', Rate_Per_Person_Night: 210, Nights_Rule: '1' })]));
  assert.equal(flight.block, 'A'); assert.equal(flight.amountCents, 21000); assert.deepEqual(flight.categoryOverride, { from: 'GUEST_SELF_BOOKING' });
});

test('ENGINE 2.3 · the row prices one person in USD: a whole-room basis, another currency and a price of USD 0 or less go to review', () => {
  const items = { ...PROVIDER_ITEMS,
    'T-ROOM': { ...PROVIDER_ITEMS['T-HOTEL'], Item_ID: 'T-ROOM', Rate_Basis: 'PER_ROOM' },
    'T-BAHT': { ...PROVIDER_ITEMS['T-HOTEL'], Item_ID: 'T-BAHT', Currency: 'THB' } };
  const at = (itemId, rate) => computeLine(booking({ Item_ID: itemId, Nights: 3 }), { items, specialRates: [paidByHS({ Item_ID: itemId, Rate_Per_Person_Night: rate })], asOf: '2026-10-07' });
  assert.match(at('T-ROOM', 50).reviewReason, /PER_ROOM item payable/);
  assert.match(at('T-BAHT', 3500).reviewReason, /THB item payable/);
  for (const rate of ['0', '-100']) { const l = at('T-HOTEL', rate); assert.equal(l.amountCents, null); assert.match(l.reviewReason, /^PRICE REQUIRED — a price H&S paid must be above USD 0/); }
  /* the Owner's figures: USD 109.00 for three nights, USD 232.62 for two — per person */
  assert.equal(at('T-HOTEL', '36.33333333').amountCents, 10900);
  assert.equal(computeLine(booking({ Item_ID: 'T-LODGE', Nights: 2 }), pctx([paidByHS({ Item_ID: 'T-LODGE', Rate_Per_Person_Night: '116.31' })])).amountCents, 23262);
});

test('SNAPSHOT 2.3 · an issued line keeps why it is payable (Category_Override_From); other lines carry nothing new', () => {
  const rows = [paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: '36.33333333' })];
  const result = calculate([booking({ Item_ID: 'T-TRAIN' }), booking({ Item_ID: 'T-HOTEL', Nights: 3 })], pctx(rows));
  const snap = buildSnapshot({ settlementId: 'S-1', revision: 1, holderId: 'INV-T1', result, items: PROVIDER_ITEMS, specialRates: rows,
    fx: { FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, issueDate: '2026-10-07', sourceHash: 'x' });
  const hotel = snap.lines.find((l) => l.Item_ID === 'T-HOTEL'), train = snap.lines.find((l) => l.Item_ID === 'T-TRAIN');
  assert.equal(hotel.Category_Override_From, 'GUEST_SELF_PAYMENT'); assert.equal(hotel.Billing_Category, 'GUEST_SETTLEMENT_REQUIRED');
  assert.equal('Category_Override_From' in train, false);
  assert.equal(snap.Special_Rate_Reference[0].Billing_Category, 'GUEST_SETTLEMENT_REQUIRED');
  assert.equal(snap.Total_Payable_Cents, 10000 + 10900);
});

test('DRIFT (review, 7 Oct 2026) · another guest\'s 009 row moving never flags this statement; its own row still does', () => {
  const mine = { Holder_ID: 'INV-T1', Person_ID: 'GT1', Item_ID: 'T-STAY', Rate_Per_Person_Night: 75, Nights_Rule: 'ALL', Rate_Status: 'ACTIVE', Approved_By: 'Suthep' };
  const theirs = { Holder_ID: 'INV-T9', Person_ID: 'GT9', Item_ID: 'T-HOTEL', Rate_Per_Person_Night: 92.1, Nights_Rule: '2', Rate_Status: 'ACTIVE', Approved_By: 'Suthep' };
  const snapshot = { Settlement_ID: 'S-1', Holder_ID: 'INV-T1', Person_IDs: ['GT1'], Item_IDs: ['T-STAY'], Standard_Rate_Reference: {},
    Special_Rate_Reference: [mine, theirs], lines: [], Total_Payable_Cents: 15000, Block_A_Total_Cents: 15000 };
  const special = (rates) => detectDrift({ snapshot, items: PROVIDER_ITEMS, specialRates: rates, asOf: '2026-10-07' }).filter((d) => d.code === 'SPECIAL_RATE_MISMATCH');
  assert.equal(special([mine, theirs]).length, 0);
  assert.equal(special([mine, { ...theirs, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Per_Person_Night: 100 }]).length, 0, 'their row gained a category and a price');
  assert.equal(special([mine]).length, 0, 'their row was deleted');
  assert.equal(special([{ ...mine, Rate_Per_Person_Night: 80 }, theirs]).length, 1, 'my own row moved');
  assert.equal(special([theirs]).length, 1, 'my own row is gone');
});

test('DRIFT 2.3 · the snapshot keeps the row\'s Billing_Category; a change after issue is a SPECIAL_RATE_MISMATCH; a row without it is read as before', () => {
  const row = paidByHS({ Item_ID: 'T-HOTEL', Rate_Per_Person_Night: '18.16666667' });
  const snap = (rows) => ({ Settlement_ID: 'S-1', Holder_ID: 'INV-T1', Person_IDs: ['GT1'], Item_IDs: ['T-HOTEL'], Standard_Rate_Reference: {},
    Special_Rate_Reference: rows, lines: [], Total_Payable_Cents: 5450, Block_A_Total_Cents: 5450 });
  const special = (ds) => ds.filter((d) => d.code === 'SPECIAL_RATE_MISMATCH');
  const ref = { Holder_ID: 'INV-T1', Person_ID: 'GT1', Item_ID: 'T-HOTEL', Rate_Per_Person_Night: '18.16666667', Nights_Rule: 'ALL', Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED' };
  assert.equal(special(detectDrift({ snapshot: snap([ref]), items: PROVIDER_ITEMS, specialRates: [row], asOf: '2026-10-07' })).length, 0, 'unchanged');
  const dropped = { ...row }; delete dropped.Billing_Category;
  const moved = special(detectDrift({ snapshot: snap([ref]), items: PROVIDER_ITEMS, specialRates: [dropped], asOf: '2026-10-07' }));
  assert.equal(moved.length, 1); assert.match(moved[0].detail || moved[0].message || JSON.stringify(moved[0]), /Billing_Category moved from GUEST_SETTLEMENT_REQUIRED to \(none\)/);
  /* a snapshot issued before 2.3 carries no Billing_Category, and its rows carry none now: no drift */
  const { Billing_Category: _x, ...old } = ref;
  assert.equal(special(detectDrift({ snapshot: snap([old]), items: PROVIDER_ITEMS, specialRates: [dropped], asOf: '2026-10-07' })).length, 0);
});

/* ============================================================ settlement */

test('PAYMENT POSITION · no Settlement_ID, no position — another guest\'s rows are never counted; the whole journal is an explicit admin total', () => {
  const rows = [
    { Settlement_ID: 'S-A', Record_Status: 'VERIFIED', Entry_Type: 'PAYMENT', Amount_USD: 100 },
    { Settlement_ID: 'S-B', Record_Status: 'REPORTED', Entry_Type: 'PAYMENT', Amount_USD: 50 },
  ];
  assert.deepEqual(paymentPosition(rows, null), { verifiedCents: 0, pendingCount: 0, rejectedCount: 0 });
  assert.deepEqual(paymentPosition(rows, ''), { verifiedCents: 0, pendingCount: 0, rejectedCount: 0 });
  assert.equal(paymentPosition(rows, 'S-A').verifiedCents, 10000);
  assert.equal(journalPosition(rows).verifiedCents, 10000); assert.equal(journalPosition(rows).pendingCount, 1);
  const st = paymentStatus({ sollCents: null, journalRows: rows, settlementId: null });
  assert.equal(st.istCents, 0); assert.equal(st.pendingCount, 0);
});

/* ======================================================= reconciliation */

test('DRIFT · only the items the statement used are compared; an unchanged DRAFT item is no drift; a used item that changed is', () => {
  const snapshot = { Settlement_ID: 'S-1', Holder_ID: 'INV-T1', Item_IDs: ['T-STAY'],
    Standard_Rate_Reference: {
      'T-STAY': { Standard_Rate: 145, Rate_Basis: 'PER_PERSON_PER_NIGHT', Rate_Status: 'ACTIVE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED' },
      'T-SUITE': { Standard_Rate: null, Rate_Basis: 'PER_PERSON_PER_NIGHT', Rate_Status: 'DRAFT', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED' },
      'T-OLD': { Standard_Rate: 10, Rate_Basis: 'PER_PERSON', Rate_Status: 'RETIRED', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED' },
    }, Special_Rate_Reference: [], lines: [], Total_Payable_Cents: 0, Block_A_Total_Cents: 0 };
  const items = { ...ITEMS, 'T-OLD': { Item_ID: 'T-OLD', Rate_Status: 'RETIRED', Rate_Basis: 'PER_PERSON', Standard_Rate: 10, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Currency: 'USD' } };
  const rate = (ds) => ds.filter((d) => d.code === 'RATE_DRIFT');
  assert.equal(rate(detectDrift({ snapshot, items, specialRates: [], asOf: '2026-10-05' })).length, 0, 'unchanged source: no rate drift');
  const moved = { ...items, 'T-STAY': { ...items['T-STAY'], Standard_Rate: 150 } };
  assert.equal(rate(detectDrift({ snapshot, items: moved, specialRates: [], asOf: '2026-10-05' })).length, 1);
  const unusedMoved = { ...items, 'T-OLD': { ...items['T-OLD'], Standard_Rate: 99 } };
  assert.equal(rate(detectDrift({ snapshot, items: unusedMoved, specialRates: [], asOf: '2026-10-05' })).length, 0, 'an item no line used');
});

test('DRIFT · a 010 row counts for its own settlement or Holder only', () => {
  const evidenceRows = [
    { Settlement_ID: 'S-OTHER', Holder_ID: 'INV-T9', Evidence_Status: 'MISMATCH', Booking_ID: 'X' },
    { Holder_ID: 'INV-T1', Evidence_Status: 'MISMATCH', Booking_ID: 'Y' },
  ];
  const ds = detectDrift({ snapshot: null, items: ITEMS, evidenceRows, holderId: 'INV-T1', settlementId: 'S-1', asOf: '2026-10-05' });
  assert.equal(ds.filter((d) => d.code === 'EVIDENCE_MISMATCH').length, 1);
});

/* ================================================================ ledger */

test('LEDGER · one decision per payment: the first claim wins, a VERIFIED claim locks the method before Google, a second claim and a method change are refused', async () => {
  const { led } = ledgerOf();
  await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: 'PAYPAL_EUR', source: 'HOLDER', by: 'INV-T1' });
  const [a, b] = await Promise.all([
    call(led, 'payment-decision', { paymentId: 'PAY-1', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, by: 'GROOM' }),
    call(led, 'payment-decision', { paymentId: 'PAY-1', action: 'claim', decision: 'REJECTED', by: 'BRIDE' }),
  ]);
  assert.equal(a.j.ok, true); assert.equal(b.status, 409); assert.equal(b.j.inProgress, true);
  assert.ok(a.j.preference.lockedAt); assert.equal(a.j.preference.lockedBy, 'PAY-1');
  const change = await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: 'SEPA_EUR', source: 'HOLDER', by: 'INV-T1' });
  assert.equal(change.status, 409); assert.equal(change.j.locked, true);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'PAY-1', action: 'complete', by: 'GROOM' })).status, 409, 'complete needs the claim\'s own token');
  assert.equal((await call(led, 'payment-decision', { paymentId: 'PAY-1', action: 'complete', token: a.j.claim.token, by: 'GROOM' })).j.ok, true);
  const again = await call(led, 'payment-decision', { paymentId: 'PAY-1', action: 'claim', decision: 'REJECTED', by: 'BRIDE' });
  assert.equal(again.status, 409); assert.equal(again.j.decided, true);
});

test('LEDGER · a claim Google did not take is given back and its lock undone — unless the row is VERIFIED already', async () => {
  const { led } = ledgerOf();
  const c2 = await call(led, 'payment-decision', { paymentId: 'PAY-2', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T2', lockPreference: true, channel: 'PROMPTPAY_THB', by: 'GROOM' });
  const r = await call(led, 'payment-decision', { paymentId: 'PAY-2', action: 'release', token: c2.j.claim.token, by: 'GROOM' });
  assert.equal(r.j.released, true); assert.equal(r.j.unlocked, true);
  const pref = (await call(led, 'payment-preference', { holderId: 'INV-T2', action: 'read' })).j.preference;
  assert.equal(pref.lockedAt, null);
  assert.equal((await call(led, 'payment-preference', { holderId: 'INV-T2', action: 'set', channel: 'PROMPTPAY_THB', source: 'HOLDER', by: 'INV-T2' })).j.ok, true);
  const c3 = await call(led, 'payment-decision', { paymentId: 'PAY-3', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T3', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' });
  const kept = await call(led, 'payment-decision', { paymentId: 'PAY-3', action: 'release', token: c3.j.claim.token, alreadyVerified: true, by: 'GROOM' });
  assert.equal(kept.j.unlocked, false);
  assert.equal((await call(led, 'payment-preference', { holderId: 'INV-T3', action: 'read' })).j.preference.lockPending, false, 'a known VERIFIED payment makes the lock final');
  assert.ok((await call(led, 'payment-preference', { holderId: 'INV-T3', action: 'read' })).j.preference.lockedAt);
});

/* an issuable revision in a fresh ledger, gate approved by a human */
async function issuable({ preference = 'PAYPAL_EUR' } = {}) {
  const { st, led } = ledgerOf();
  const result = calculate([booking({ Item_ID: 'T-STAY' })], { items: ITEMS, specialRates: [], asOf: '2026-10-05' });
  assert.equal(result.engineVersion, ENGINE_VERSION);
  assert.equal((await call(led, 'settlement', { holderId: 'INV-T1', create: true, by: 'test' })).j.ok, true);
  assert.equal((await call(led, 'revision-create', { holderId: 'INV-T1', result, by: 'test' })).j.ok, true);
  assert.equal((await call(led, 'revision-state', { holderId: 'INV-T1', revision: 1, action: 'READY', by: 'test' })).j.ok, true);
  await st.storage.put('gate', { approved: true, issueAndPublishEnabled: true, approval: { approvedBy: 'suthep', approvedAt: '2026-10-05T10:00:00Z' } });
  if (preference) await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: preference, source: 'HOLDER', by: 'INV-T1' });
  return { st, led };
}
const SPECIAL = [{ Item_ID: 'T-SUITE', Person_ID: 'GT1', Rate_Status: 'ACTIVE', Rate_Per_Person_Night: 75, Approved_By: 'Suthep' }];
const issueBody = (over) => ({
  holderId: 'INV-T1', revision: 1, by: 'GROOM', fx: { FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, sourceGaps: [],
  items: ITEMS, specialRates: SPECIAL, sourceHash: 'h', issueDate: '2026-10-05',
  paymentPreference: 'PAYPAL_EUR', expectedPaymentPreference: 'PAYPAL_EUR',
  gateCheck: { caseResults: REFERENCE_CASES.map((c) => ({ id: c.id, matches: true })), siteKeyDuplicates: [], nightsGaps: [] },
  currentDrifts: [], ...(over || {}),
});

test('LEDGER · ISSUE freezes exactly the method whose destination was validated — a method changed in between is refused', async () => {
  const { led } = await issuable({ preference: 'SEPA_EUR' });
  const changed = await call(led, 'revision-issue', issueBody({ expectedPaymentPreference: 'PAYPAL_EUR' }));
  assert.equal(changed.status, 409); assert.deepEqual(changed.j.reasons, ['PAYMENT_PREFERENCE_CHANGED']);
  const unnamed = await call(led, 'revision-issue', issueBody({ expectedPaymentPreference: undefined }));
  assert.equal(unnamed.status, 400);
  const ok = await call(led, 'revision-issue', issueBody({ expectedPaymentPreference: 'SEPA_EUR' }));
  assert.equal(ok.j.ok, true); assert.equal(ok.j.snapshot.Payment_Preference, 'SEPA_EUR'); assert.equal(ok.j.snapshot.Payment_Currency, 'EUR');
});

test('LEDGER · ISSUE re-judges the gate on the current inputs and counts the drift detected now', async () => {
  {
    const { led } = await issuable();
    const cases = REFERENCE_CASES.map((c, i) => ({ id: c.id, matches: i !== 0 }));
    const r = await call(led, 'revision-issue', issueBody({ gateCheck: { caseResults: cases, siteKeyDuplicates: [], nightsGaps: [] } }));
    assert.equal(r.status, 403); assert.ok(r.j.reasons.some((x) => /^GATE_NOW: 1\./.test(x)), JSON.stringify(r.j.reasons));
  }
  {
    const { led } = await issuable();
    const r = await call(led, 'revision-issue', issueBody({ gateCheck: undefined }));
    assert.equal(r.status, 403); assert.ok(r.j.reasons.includes('GATE_RECHECK_NOT_SUPPLIED'));
  }
  {
    const { led } = await issuable();
    const r = await call(led, 'revision-issue', issueBody({ currentDrifts: [{ code: 'EVIDENCE_MISMATCH', detail: '010 says so' }] }));
    assert.equal(r.status, 403); assert.ok(r.j.reasons.includes('EVIDENCE_MISMATCH'));
  }
  {
    const { led } = await issuable();
    assert.equal((await call(led, 'revision-issue', issueBody({ currentDrifts: undefined }))).status, 400);
  }
  {
    const { led } = await issuable();
    assert.equal((await call(led, 'revision-issue', issueBody())).j.ok, true);
  }
});

test('LEDGER · a stored comparison against an OLDER snapshot does not block the revision that resolves it, and is resolved by it; other stored drift still blocks', async () => {
  {
    const { led } = await issuable();
    await call(led, 'drift-set', { holderId: 'INV-T1', drifts: [{ code: 'RATE_DRIFT', detail: 'old snapshot' }] });
    const r = await call(led, 'revision-issue', issueBody());
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const d = (await call(led, 'drift-read', { holderId: 'INV-T1' })).j.drift;
    assert.equal(d.drifts[0].resolved, true); assert.deepEqual(d.blocking, []);
  }
  {
    const { led } = await issuable();
    await call(led, 'drift-set', { holderId: 'INV-T1', drifts: [{ code: 'QUOTA_DRIFT', detail: 'over quota' }] });
    const r = await call(led, 'revision-issue', issueBody());
    assert.equal(r.status, 403); assert.ok(r.j.reasons.includes('QUOTA_DRIFT'));
  }
});

/* ============================================== the Confirmed Booking */

const sent = (version, selections, extra) => ({ submissionId: 'SYL-T1-1', version, lastSentAt: '2026-10-01T10:00:00Z',
  registration: { guestId: 'GT1', selections, ...(extra || {}) } });
const SELECTIONS = [
  { id: 'wedstay', room: 'heritage', unit: 'A', qty: 1, price: 145 },
  { id: 'train', qty: 1, price: 100 },
  { id: 'spa', interest: true },
];

test('CONFIRMED BOOKING · nothing sent or nothing confirmed is nothing billed; a confirmed send is billed line by line, rooms and everything else', async () => {
  const env0 = { REG_KV: kv({}) };
  const none = await loadConfirmedBookings({ env: env0, identity: { guestId: 'GT1' }, holderId: 'INV-T1', items: ITEMS });
  assert.equal(none.length, 0); assert.equal(none.confirmation.state, CONFIRMATION.NONE);

  const unconfirmed = await loadConfirmedBookings({ env: { REG_KV: kv({ 'reg:INV-T1': sent(1, SELECTIONS) }) }, identity: { guestId: 'GT1' }, holderId: 'INV-T1', items: ITEMS });
  assert.equal(unconfirmed.length, 0); assert.equal(unconfirmed.confirmation.state, CONFIRMATION.UNCONFIRMED);

  const rooms = { get: () => ({ fetch: async () => { throw new Error('the Rooms engine is not consulted when the line carries its unit'); } }), idFromName: () => 'x' };
  const env = { REG_KV: kv({ 'reg:INV-T1': sent(1, SELECTIONS), 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 } }), ROOMS: rooms };
  const b = await loadConfirmedBookings({ env, identity: { guestId: 'GT1' }, holderId: 'INV-T1', items: ITEMS });
  assert.equal(b.confirmation.state, CONFIRMATION.CONFIRMED);
  assert.deepEqual(b.map((x) => [x.Site_Product_Key, x.Item_ID, x.Person_ID, x.Room_Unit_ID != null]), [
    ['wedstay/heritage', 'T-STAY', 'GT1', true], ['train', 'T-TRAIN', 'GT1', false]]);
  assert.ok(!b.some((x) => x.Site_Product_Key === 'spa'), 'an interest is not a booking');
  const result = calculate(b, { items: ITEMS, specialRates: [], asOf: '2026-10-05' });
  assert.equal(result.totalPayableCents, 29000 + 10000, 'the non-room booking is billed too');
});

test('CONFIRMED BOOKING · a later send not yet confirmed LAPSES the confirmation — an unsent or unconfirmed change is never billed', async () => {
  const env = { REG_KV: kv({ 'reg:INV-T1': sent(2, SELECTIONS), 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 } }) };
  const b = await loadConfirmedBookings({ env, identity: { guestId: 'GT1' }, holderId: 'INV-T1', items: ITEMS });
  assert.equal(b.length, 0); assert.equal(b.confirmation.state, CONFIRMATION.LAPSED);
});

/* ======================================================= the routes */

const SHEET = '1testsheetid';
function book(items) {
  const labels = ['Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To', 'Rate_Basis', 'Standard_Rate', 'Quota',
    'Quota_Unit', 'Max_Pax', 'Change_Cutoff', 'Cancellation_Cutoff', 'Currency', 'Site_Product_Key', 'Number of Nights', 'Modifiers'];
  const cols = Object.values(items || ITEMS);
  const g002 = [['002 · synthetic'], ...labels.map((l) => [l, ...cols.map((it) => (it[l] == null ? '' : it[l]))])];
  return {
    '002_Accommodation_Details': g002,
    '008_Payment_Journal': [[...PAYMENT_JOURNAL_COLUMNS],
      ['PAY-OTHER-1', 'S-OTHER', 'INV-T9', 'V1', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T9', '2026-10-03T10:00:00Z', '', '', 'BRIDE', '2026-10-03T12:00:00Z', 'VERIFIED', '', 'FALSE'],
      ['PAY-OTHER-2', 'S-OTHER', 'INV-T9', 'V1', 'PAYMENT', 'PAYPAL_EUR', 44.5, 'EUR', 50, 'INV-T9', '2026-10-04T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']],
    '009_Special_Rates': [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note'],
      ['', 'GT1', 'T-SUITE', 75, 'ALL', 'ACTIVE', '', '', 'Suthep', 'synthetic']],
    '010_Booking_Evidence_Index': [['Booking_ID', 'Settlement_ID', 'Holder_ID', 'Evidence_Status']],
    '011_Billing_Config': [['Config_Key', 'Value', 'Effective_From', 'Effective_To', 'Status', 'Approved_By', 'Approved_At', 'Note'],
      ['FX_USD_THB', '', '', '', 'DRAFT', '', '', ''], ['FX_USD_EUR', '', '', '', 'DRAFT', '', '', '']],
    '006_Guestlist': [['ID', 'Firstname', 'Nationality'], ['CON-T1', 'Synthetic', 'German']],
  };
}
function sheetsFetch(workbook, log) {
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return res(200, { access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    /* values:batchGet — several ranges, ONE read request */
    if (/\/values:batchGet\?/.test(u)) {
      const ranges = [...new URL(u).searchParams.getAll('ranges')];
      log.push(['batchGet', ranges.length]);
      await new Promise((r) => setTimeout(r, 5));
      const valueRanges = ranges.map((range) => {
        const tab = range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'");
        return { range, values: workbook[tab] || [] };
      });
      if (ranges.some((range) => !workbook[range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'")])) return res(400, { error: { message: 'Unable to parse range' } });
      return res(200, { valueRanges });
    }
    const m = u.match(/\/values\/([^?]+)\?/);
    if (!m) return res(404, { error: { message: 'unknown' } });
    let range = decodeURIComponent(m[1]);
    const append = range.endsWith(':append'); if (append) range = range.slice(0, -':append'.length);
    const [tabPart, cells] = range.split('!');
    const tab = tabPart.replace(/^'|'$/g, '').replace(/''/g, "'");
    if (!workbook[tab]) return res(400, { error: { message: 'Unable to parse range: ' + range } });
    await new Promise((r) => setTimeout(r, 5));
    if (append) { const row = JSON.parse(init.body).values[0]; workbook[tab].push(row); log.push(['append', tab, row[0]]); return res(200, { updates: {} }); }
    if ((init.method || 'GET') === 'PUT') {
      const [, c1, r1] = cells.match(/^([A-Z]+)(\d+)/);
      const col = [...c1].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const values = JSON.parse(init.body).values[0];
      const row = workbook[tab][Number(r1) - 1];
      values.forEach((v, i) => { row[col + i] = v; });
      log.push(['update', tab, row[0]]);
      return res(200, {});
    }
    log.push(['get', tab]);
    return res(200, { values: workbook[tab] });
  };
}
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
function routeEnv(extra) {
  const { led } = ledgerOf();
  return { led, env: {
    SHEETS_ID: SHEET,
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'synthetic@test.invalid', private_key: privateKey, private_key_id: 'synthetic' }),
    BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (req) => led.fetch(req) }) },
    REG_KV: kv({}),
    ...(extra || {}),
  } };
}
const GUEST = { invitationId: 'INV-T1', guestId: 'GT1' };
const GROOM = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
const BRIDE = { invitationId: 'INV-G048', guestId: 'G048', hosts: true };
async function hit(env, identity, path, body) {
  globalThis.__billingIdentity = identity;
  globalThis.__billingIndex = { a: { i: 'INV-T1', g: 'GT1', c: 'CON-T1' }, b: { i: 'INV-T9', g: 'GT9', c: 'CON-T9' } };
  const url = new URL('https://stage.invalid/api/billing/' + path);
  const req = new Request(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {});
  const r = await handleBilling(req, env, url, {});
  return { status: r.status, j: await r.json().catch(() => null) };
}
async function withSheets(workbook, fn) {
  const log = [], was = globalThis.fetch;
  globalThis.fetch = sheetsFetch(workbook, log);
  try { return await fn(log); } finally { globalThis.fetch = was; }
}

test('ROUTE /mine · a guest without a settlement sees no payment position — never another guest\'s journal rows', async () => {
  const { env } = routeEnv();
  await withSheets(book(), async () => {
    const r = await hit(env, GUEST, 'mine');
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.payment.istCents, 0); assert.equal(r.j.payment.pendingCount, 0); assert.equal(r.j.payment.verifiedCents, 0);
    assert.equal(r.j.bookingConfirmation.state, 'NONE');
  });
});

test('ROUTE /mine?view=statement · before a statement is issued the ledger alone answers: no Google read, no draft figure', async () => {
  const { env, led } = routeEnv();
  await call(led, 'settlement', { holderId: 'INV-T1', create: true, by: 'test' });
  await withSheets(book(), async (log) => {
    const r = await hit(env, GUEST, 'mine?view=statement');
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.deepEqual(r.j, { ok: true, issued: false, Settlement_ID: null, revision: null });
    assert.equal(log.length, 0, 'the Google quota is not spent on a statement that does not exist');
  });
});

test('ROUTE /mine?view=statement · an issued statement: its own number, issue and due date, total and frozen FX', async () => {
  const { led } = await issuable();
  const { env } = routeEnv({ BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (req) => led.fetch(req) }) } });
  assert.equal((await call(led, 'revision-issue', issueBody())).j.ok, true);
  await withSheets(book(), async () => {
    const r = await hit(env, GUEST, 'mine?view=statement');
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.issued, true); assert.equal(r.j.revision, 1); assert.ok(r.j.Settlement_ID);
    assert.equal(r.j.issueDate, '2026-10-05'); assert.ok(r.j.dueDate);
    assert.equal(typeof r.j.issuedTotal, 'number');
    assert.equal(r.j.fx.source, 'ISSUED_REVISION'); assert.equal(r.j.fx.FX_USD_EUR, 0.89);
    assert.equal(r.j.pdf, '/api/billing/pdf?rev=1');
    assert.equal(r.j.paymentPreference.destination.method, 'PAYPAL_EUR');
  });
});

test('ROUTE payment/report · without an approved rate nothing is appended — the immutable row would carry no accounting amount', async () => {
  const { env, led } = routeEnv();
  await call(led, 'settlement', { holderId: 'INV-T1', create: true, by: 'test' });
  await withSheets(book(), async (log) => {
    const r = await hit(env, GUEST, 'payment/report', { Method: 'PAYPAL_EUR', Amount_Paid: 100 });
    assert.equal(r.status, 409); assert.match(r.j.reasons[0], /^FX_UNAVAILABLE/);
    assert.equal(log.filter((x) => x[0] === 'append').length, 0);
  });
});

test('ROUTE payment/verify · two administrators at once: exactly one decision reaches Google, the other is refused; the method is locked', async () => {
  const { env } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T1', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  await withSheets(wb, async (log) => {
    const [a, b] = await Promise.all([
      hit(env, GROOM, 'payment/verify', { Payment_ID: 'PAY-T1' }),
      hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T1', Reject_Reason: 'not found on statement' }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [200, 409], JSON.stringify([a.j, b.j]));
    assert.equal(log.filter((x) => x[0] === 'update').length, 1, 'Google written once');
    const won = a.status === 200 ? a : b;
    if (won === a) {
      assert.equal(won.j.preferenceLock.locked, true);
      const change = await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' });
      assert.equal(change.status, 409); assert.equal(change.j.locked, true);
    }
  });
});

test('ROUTE issue · a trip nobody confirmed is never issued; a confirmed one still meets the gate', async () => {
  const { env } = routeEnv();
  await withSheets(book(), async () => {
    const r = await hit(env, GROOM, 'issue', { holderId: 'INV-T1', asOf: '2026-10-05' });
    assert.equal(r.status, 409); assert.match(r.j.reasons[0], /^BOOKING_NOT_CONFIRMED: NONE/);
  });
  const confirmed = routeEnv({ REG_KV: kv({ 'reg:INV-T1': sent(1, SELECTIONS), 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 } }),
    ROOMS: { idFromName: () => 'r', get: () => ({ fetch: async () => new Response(JSON.stringify({ ok: true, mine: {} })) }) } });
  await withSheets(book(), async () => {
    /* past the confirmation, the issue meets the gate: not approved, and 011 holds no approved FX */
    const r = await hit(confirmed.env, GROOM, 'issue', { holderId: 'INV-T1', asOf: '2026-10-05' });
    assert.equal(r.status, 409);
    assert.ok(r.j.reasons.some((x) => /ACTIVATION_GATE_NOT_APPROVED|FX:/.test(x)), JSON.stringify(r.j.reasons));
  });
});

test('ROUTE gate · an unreadable source is a 503, never the stored verdict served as an answer', async () => {
  const { env } = routeEnv();
  const was = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const r = await hit(env, GROOM, 'gate');
    assert.equal(r.status, 503); assert.equal(r.j.ok, false);
  } finally { globalThis.fetch = was; }
});

test('ROUTE payment/verify · the verification takes the method lock in the same turn: the Holder\'s change afterwards is refused', async () => {
  const { env } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T2', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  await withSheets(wb, async (log) => {
    const v = await hit(env, GROOM, 'payment/verify', { Payment_ID: 'PAY-T2' });
    assert.equal(v.status, 200, JSON.stringify(v.j));
    assert.equal(v.j.preferenceLock.locked, true); assert.equal(v.j.preferenceLock.lockedBy, 'PAY-T2');
    assert.equal(log.filter((x) => x[0] === 'update').length, 1);
    const change = await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' });
    assert.equal(change.status, 409); assert.equal(change.j.locked, true);
    const twice = await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T2', Reject_Reason: 'x' });
    assert.equal(twice.status, 409);
    assert.equal(log.filter((x) => x[0] === 'update').length, 1, 'a decided payment is never written again');
  });
});

test('LEDGER (Codex round 2) · one failed verification never lifts the lock another VERIFIED payment of the same Holder stands on', async () => {
  const { led } = ledgerOf();
  const read = async () => (await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'read' })).j.preference;
  const k1 = (await call(led, 'payment-decision', { paymentId: 'P-1', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' })).j.claim.token;
  const k2 = (await call(led, 'payment-decision', { paymentId: 'P-2', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'BRIDE' })).j.claim.token;
  /* P-1 fails while P-2 is still pending: the lock stays */
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-1', action: 'release', token: k1, by: 'GROOM' })).j.unlocked, false);
  assert.ok((await read()).lockedAt);
  assert.equal((await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: 'SEPA_EUR', source: 'HOLDER', by: 'INV-T1' })).status, 409);
  /* P-2 reaches Google: the lock is final */
  await call(led, 'payment-decision', { paymentId: 'P-2', action: 'complete', token: k2, by: 'BRIDE' });
  const p = await read(); assert.ok(p.lockedAt); assert.equal(p.lockPending, false);
  /* a later failure of another claim cannot lift a final lock */
  const k3 = (await call(led, 'payment-decision', { paymentId: 'P-3', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, by: 'GROOM' })).j.claim.token;
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-3', action: 'release', token: k3, by: 'GROOM' })).j.unlocked, false);
  assert.ok((await read()).lockedAt);
});

test('LEDGER (Codex round 2/4) · a claim is never taken over or released — once its lease ran out a BILLING_ADMIN resumes it, with its own fixed payload', async () => {
  const { st, led } = ledgerOf();
  const c = (await call(led, 'payment-decision', { paymentId: 'P-9', action: 'claim', decision: 'REJECTED', rejectReason: 'not on the statement', by: 'BRIDE' })).j.claim;
  assert.deepEqual(c.payload, { Record_Status: 'REJECTED', Verified_By: 'BRIDE', Verified_At: c.claimedAt, Reject_Reason: 'not on the statement' });
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-9b', action: 'claim', decision: 'REJECTED', by: 'BRIDE' })).status, 400, 'a rejection carries its reason');
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-9', action: 'resume', by: 'GROOM' })).status, 409, 'too recent');
  const old = await st.storage.get('paydec:P-9');
  await st.storage.put('paydec:P-9', { ...old, claimedAt: '2026-10-05T00:00:00.000Z' });
  const late = await call(led, 'payment-decision', { paymentId: 'P-9', action: 'claim', decision: 'VERIFIED', by: 'GROOM' });
  assert.equal(late.status, 409); assert.equal(late.j.inProgress, true); assert.equal(late.j.stale, true); assert.equal(late.j.decision, 'REJECTED');
  const r = await call(led, 'payment-decision', { paymentId: 'P-9', action: 'resume', by: 'GROOM' });
  assert.equal(r.j.ok, true); assert.equal(r.j.claim.token, c.token); assert.deepEqual(r.j.claim.payload, c.payload, 'the same payload, never another decision');
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-9', action: 'complete', token: c.token, by: 'GROOM' })).j.ok, true);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-9', action: 'claim', decision: 'VERIFIED', by: 'GROOM' })).j.decided, true);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'P-9', action: 'resolve', by: 'GROOM' })).status, 400, 'there is no release path');
});

test('ROUTE payment/decision-resolve (Codex round 2/4) · a stuck claim blocks every other decision; once its lease ran out a BILLING_ADMIN resumes it — the same decision, written once; a guest may not', async () => {
  const { env, led } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T3', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  await withSheets(wb, async (log) => {
    /* a claim whose Worker never came back */
    const c = (await call(led, 'payment-decision', { paymentId: 'PAY-T3', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' })).j.claim;
    const blocked = await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T3', Reject_Reason: 'x' });
    assert.equal(blocked.status, 409); assert.equal(blocked.j.inProgress, true);
    assert.equal(log.filter((x) => x[0] === 'update').length, 0, 'nothing written while the claim stands');
    assert.equal((await hit(env, GUEST, 'payment/decision-resolve', { Payment_ID: 'PAY-T3' })).status, 403, 'administration only');
    assert.equal((await hit(env, GROOM, 'payment/decision-resolve', { Payment_ID: 'PAY-T3' })).status, 409, 'too recent to resume');
    const r = await aged(() => hit(env, BRIDE, 'payment/decision-resolve', { Payment_ID: 'PAY-T3' }));
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.decision, 'VERIFIED');
    const row = wb['008_Payment_Journal'].find((x) => x[0] === 'PAY-T3');
    assert.equal(row[15], 'VERIFIED'); assert.equal(row[13], 'GROOM', 'the claim\'s own Verified_By'); assert.equal(row[14], c.claimedAt, 'the claim\'s own Verified_At');
    assert.equal((await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T3', Reject_Reason: 'x' })).status, 409, 'decided once');
    assert.equal(log.filter((x) => x[0] === 'update').length, 1);
    assert.equal((await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' })).status, 409, 'and the method is locked for good');
  });
});

test('LEDGER (Codex round 3) · a payment known VERIFIED locks for good — the failure of another pending claim can never lift it', async () => {
  const { led } = ledgerOf();
  const read = async () => (await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'read' })).j.preference;
  const a = (await call(led, 'payment-decision', { paymentId: 'Q-1', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' })).j.claim.token;
  const b = (await call(led, 'payment-decision', { paymentId: 'Q-2', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, by: 'BRIDE' })).j.claim.token;
  /* Q-1: 008 already holds it VERIFIED (released with that knowledge) */
  await call(led, 'payment-decision', { paymentId: 'Q-1', action: 'release', token: a, alreadyVerified: true, by: 'GROOM' });
  /* Q-2 fails */
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-2', action: 'release', token: b, by: 'BRIDE' })).j.unlocked, false);
  const p = await read(); assert.ok(p.lockedAt); assert.equal(p.lockPending, false); assert.equal(p.lockClaims['Q-1'], 'DONE');
  assert.equal((await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: 'SEPA_EUR', source: 'HOLDER', by: 'INV-T1' })).status, 409);
});

test('LEDGER (Codex round 3) · the fence: only the claim\'s own token may write, and only inside its window; a stranger cannot complete it', async () => {
  const { st, led } = ledgerOf();
  const c = (await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'claim', decision: 'REJECTED', rejectReason: 'duplicate', by: 'BRIDE' })).j.claim;
  const ok = await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'check', token: c.token, by: 'BRIDE' });
  assert.equal(ok.j.ok, true); assert.ok(ok.j.notAfter > Date.now()); assert.ok(ok.j.notAfter <= Date.parse(c.claimedAt) + 7 * 60 * 1000 + 1);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'check', token: 'not-mine', by: 'X' })).status, 409);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'complete', token: 'not-mine', by: 'X' })).status, 409);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'release', token: 'not-mine', by: 'X' })).status, 409);
  const stored = await st.storage.get('paydec:Q-5');
  await st.storage.put('paydec:Q-5', { ...stored, writeNotAfter: new Date(Date.now() - 1000).toISOString() });
  const closed = await call(led, 'payment-decision', { paymentId: 'Q-5', action: 'check', token: c.token, by: 'BRIDE' });
  assert.equal(closed.status, 409); assert.equal(closed.j.expired, true);
});

test('TRANSPORT (Codex round 3) · a write past its deadline is never sent — and says so', async () => {
  const { updateRange, GoogleSheetsUnavailable } = await import('../src/google-sheets.js');
  const was = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (u) => { calls++; return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 }); };
  try {
    const env = { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'synthetic@test.invalid', private_key: privateKey, private_key_id: 'deadline' }) };
    await assert.rejects(updateRange(env, 'sheet', "'008_Payment_Journal'!N2:Q2", ['a', 'b', 'c', 'd'], { notAfter: Date.now() - 1 }),
      (e) => e instanceof GoogleSheetsUnavailable && e.notSent === true);
    assert.ok(!calls || calls === 1, 'at most the token was minted; no write was sent');
  } finally { globalThis.fetch = was; }
});

function failingPut(workbook, log, { apply }) {
  const base = sheetsFetch(workbook, log);
  let failed = false;
  return async (url, init = {}) => {
    if ((init.method || 'GET') === 'PUT' && !failed) {
      failed = true;
      if (apply) await base(url, init);          /* Google took it … */
      throw new TypeError('network connection lost');   /* … and the answer never came back */
    }
    return base(url, init);
  };
}
async function aged(fn) {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [RealDate.now() + 11 * 60 * 1000])); } static now() { return RealDate.now() + 11 * 60 * 1000; } };
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}

test('ROUTE payment/verify (Codex round 3) · Google took the decision but its answer was lost: the claim and the lock stand; the resolution reads VERIFIED and makes the lock final', async () => {
  const { env } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T4', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  const log = [], was = globalThis.fetch;
  globalThis.fetch = failingPut(wb, log, { apply: true });
  try {
    const v = await hit(env, GROOM, 'payment/verify', { Payment_ID: 'PAY-T4' });
    assert.equal(v.status, 503); assert.equal(v.j.outcomeUncertain, true);
    const change = await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' });
    assert.equal(change.status, 409); assert.equal(change.j.locked, true, 'a lost answer never unlocks');
    assert.equal((await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T4', Reject_Reason: 'x' })).status, 409, 'still claimed');
    const r = await aged(() => hit(env, GROOM, 'payment/decision-resolve', { Payment_ID: 'PAY-T4' }));
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.decision, 'VERIFIED');
    assert.equal(log.filter((x) => x[0] === 'update').length, 1, 'written once, by the first writer');
    assert.equal((await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' })).status, 409);
  } finally { globalThis.fetch = was; }
});

test('ROUTE payment/verify (Codex round 3/4) · the answer was lost and the write never landed: still claimed; resuming sends the SAME decision — a late landing of the first request could only write the identical row', async () => {
  const { env } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T5', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  const log = [], was = globalThis.fetch;
  globalThis.fetch = failingPut(wb, log, { apply: false });
  try {
    const first = await hit(env, GROOM, 'payment/verify', { Payment_ID: 'PAY-T5' });
    assert.equal(first.status, 503);
    assert.equal((await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T5', Reject_Reason: 'x' })).status, 409, 'no other decision while claimed');
    const r = await aged(() => hit(env, BRIDE, 'payment/decision-resolve', { Payment_ID: 'PAY-T5' }));
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.decision, 'VERIFIED');
    const row = [...wb['008_Payment_Journal'].find((x) => x[0] === 'PAY-T5')];
    assert.equal(row[15], 'VERIFIED'); assert.equal(row[13], 'GROOM');
    /* the first request lands now after all: it can only write the very same four values */
    const late = await sheetsFetch(wb, log)("https://sheets.googleapis.com/v4/spreadsheets/x/values/'008_Payment_Journal'!N" + (wb['008_Payment_Journal'].findIndex((x) => x[0] === 'PAY-T5') + 1) + ':Q?x', { method: 'PUT', body: JSON.stringify({ values: [[row[13], row[14], row[15], row[16]]] }) });
    assert.equal(late.status, 200);
    assert.deepEqual(wb['008_Payment_Journal'].find((x) => x[0] === 'PAY-T5'), row, 'identical — never a second decision');
    assert.equal((await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' })).status, 409);
  } finally { globalThis.fetch = was; }
});

test('LEDGER (Codex round 4) · two resumptions of one claim may both close it — the same token, the same decision', async () => {
  const { st, led } = ledgerOf();
  const c = (await call(led, 'payment-decision', { paymentId: 'Q-7', action: 'claim', decision: 'REJECTED', rejectReason: 'duplicate', by: 'BRIDE' })).j.claim;
  const o = await st.storage.get('paydec:Q-7'); await st.storage.put('paydec:Q-7', { ...o, claimedAt: '2026-10-05T00:00:00.000Z' });
  const [a, b] = await Promise.all([call(led, 'payment-decision', { paymentId: 'Q-7', action: 'resume', by: 'GROOM' }), call(led, 'payment-decision', { paymentId: 'Q-7', action: 'resume', by: 'BRIDE' })]);
  assert.equal(a.j.claim.token, c.token); assert.equal(b.j.claim.token, c.token);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-7', action: 'complete', token: c.token, by: 'GROOM' })).j.ok, true);
  const again = await call(led, 'payment-decision', { paymentId: 'Q-7', action: 'complete', token: c.token, by: 'BRIDE' });
  assert.equal(again.j.ok, true); assert.equal(again.j.already, true);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'Q-7', action: 'complete', token: 'other', by: 'X' })).status, 409);
});

/* ======================================================= round 5 */

test('LEDGER (Codex round 5) · release and resume never meet: once a claim is past its lease — resumed or not — the first writer can no longer give it back', async () => {
  const { st, led } = ledgerOf();
  const read = async () => (await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'read' })).j.preference;
  const c = (await call(led, 'payment-decision', { paymentId: 'R-1', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' })).j.claim;
  const o = await st.storage.get('paydec:R-1'); await st.storage.put('paydec:R-1', { ...o, claimedAt: '2026-10-05T00:00:00.000Z' });
  /* past the lease, not yet resumed: no release */
  const early = await call(led, 'payment-decision', { paymentId: 'R-1', action: 'release', token: c.token, by: 'GROOM' });
  assert.equal(early.status, 409); assert.ok((await read()).lockedAt);
  /* the interleaving: another writer resumes, then the first writer's "nothing sent" cleanup arrives */
  assert.equal((await call(led, 'payment-decision', { paymentId: 'R-1', action: 'resume', by: 'BRIDE' })).j.ok, true);
  const late = await call(led, 'payment-decision', { paymentId: 'R-1', action: 'release', token: c.token, by: 'GROOM' });
  assert.equal(late.status, 409); assert.equal(late.j.resumed, true);
  assert.equal((await st.storage.get('paydec:R-1')).state, 'PENDING'); assert.ok((await read()).lockedAt, 'the lock stands');
  assert.equal((await call(led, 'payment-preference', { holderId: 'INV-T1', action: 'set', channel: 'SEPA_EUR', source: 'HOLDER', by: 'INV-T1' })).status, 409);
  assert.equal((await call(led, 'payment-decision', { paymentId: 'R-1', action: 'claim', decision: 'REJECTED', rejectReason: 'x', by: 'BRIDE' })).status, 409, 'no competing decision');
  assert.equal((await call(led, 'payment-decision', { paymentId: 'R-1', action: 'complete', token: c.token, by: 'BRIDE' })).j.ok, true);
  assert.equal((await read()).lockPending, false);
  /* inside the lease, never resumed: the first writer's own definite "nothing sent" still gives it back */
  const d = (await call(led, 'payment-decision', { paymentId: 'R-2', action: 'claim', decision: 'REJECTED', rejectReason: 'x', by: 'BRIDE' })).j.claim;
  assert.equal((await call(led, 'payment-decision', { paymentId: 'R-2', action: 'release', token: d.token, by: 'BRIDE' })).j.released, true);
});

test('ROUTE payment/decision-resolve (Codex round 5) · 008 decided but not with the claim\'s own four values: a conflict — nothing overwritten, the claim and its lock stand', async () => {
  const { env, led } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T6', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', 'SOMEONE', '2026-10-05T11:00:00.000Z', 'VERIFIED', '', 'FALSE']);
  await withSheets(wb, async (log) => {
    await call(led, 'payment-decision', { paymentId: 'PAY-T6', action: 'claim', decision: 'VERIFIED', holderId: 'INV-T1', lockPreference: true, channel: 'PAYPAL_EUR', by: 'GROOM' });
    const r = await aged(() => hit(env, GROOM, 'payment/decision-resolve', { Payment_ID: 'PAY-T6' }));
    assert.equal(r.status, 409); assert.equal(r.j.conflict, true);
    assert.equal(log.filter((x) => x[0] === 'update').length, 0, 'nothing overwritten');
    assert.equal((await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T6', Reject_Reason: 'x' })).status, 409, 'the claim stands');
    assert.equal((await hit(env, GUEST, 'preference', { Payment_Preference: 'SEPA_EUR' })).status, 409, 'and its lock');
  });
});

/* ======================================================= the Sheets read quota (Owner, 6 Oct 2026) */

const { pricingSource, clearCatalogueCache, CATALOGUE_TTL_MS, STALE_MAX_MS } = await import('../src/billing/catalogue-cache.js');
const { GoogleSheetsUnavailable, batchReadRanges, updateRange } = await import('../src/google-sheets.js');
const { SourceDataError } = await import('../src/billing/source.js');

test('QUOTA · the catalogue reads its five tabs through ONE batch request, and a second guest within the minute reads none', async () => {
  clearCatalogueCache();
  const { env } = routeEnv();
  await withSheets(book(), async (log) => {
    const a = await hit(env, GUEST, 'catalogue');
    assert.equal(a.status, 200, JSON.stringify(a.j));
    assert.deepEqual(log.filter((x) => x[0] !== 'append' && x[0] !== 'update'), [['batchGet', 5]], 'five ranges, one request, no single reads');
    assert.equal(a.j.source.cached, false);
    const b = await hit(env, { invitationId: 'INV-T9', guestId: 'GT9' }, 'catalogue');
    assert.equal(b.status, 200); assert.equal(b.j.source.cached, true);
    assert.equal(log.filter((x) => x[0] === 'batchGet').length, 1, 'held for the minute');
  });
});

test('QUOTA · the held pricing source: miss, hit, expiry, one load for concurrent callers, fresh bypass, pricing data only and frozen', async () => {
  clearCatalogueCache();
  let t = 1_000_000, loads = 0;
  const now = () => t;
  const load = async () => { loads++; return { items: ITEMS, specialRates: SPECIAL, journalRows: [{ Payment_ID: 'X' }], evidenceRows: [{ Holder_ID: 'INV-T1' }] }; };
  const a = await pricingSource('k', load, { now });
  assert.equal(loads, 1); assert.equal(a.cached, false);
  assert.deepEqual(Object.keys(a).sort(), ['at', 'cached', 'items', 'specialRates', 'stale'], 'pricing data only — no journal, no evidence');
  assert.ok(Object.isFrozen(a.items) && Object.isFrozen(a.items['T-STAY']) && Object.isFrozen(a.specialRates[0]));
  assert.throws(() => { a.items['T-STAY'].Standard_Rate = 1; });
  t += CATALOGUE_TTL_MS - 1;
  assert.equal((await pricingSource('k', load, { now })).cached, true); assert.equal(loads, 1, 'a hit within the minute');
  assert.equal((await pricingSource('k', load, { now, fresh: true })).cached, false); assert.equal(loads, 2, 'fresh reads Google');
  t += CATALOGUE_TTL_MS;
  await pricingSource('k', load, { now }); assert.equal(loads, 3, 'expired: read again');
  t += CATALOGUE_TTL_MS;
  let release; const slow = () => new Promise((r) => { release = () => { loads++; r({ items: ITEMS, specialRates: SPECIAL }); }; });
  const both = Promise.all([pricingSource('k', slow, { now }), pricingSource('k', slow, { now })]);
  await new Promise((r) => setImmediate(r)); release();
  await both; assert.equal(loads, 4, 'one load for both');
});

test('QUOTA · a transient Google failure serves the last source as stale (display only) up to its bound; a data error, a fresh read or an old entry never does', async () => {
  clearCatalogueCache();
  let t = 5_000_000;
  const now = () => t;
  await pricingSource('s', async () => ({ items: ITEMS, specialRates: SPECIAL }), { now });
  t += CATALOGUE_TTL_MS + 1;
  const quota = async () => { throw new GoogleSheetsUnavailable('Google Sheets refused the request', { status: 429 }); };
  const st = await pricingSource('s', quota, { now });
  assert.equal(st.stale, true); assert.equal(st.items['T-STAY'].Standard_Rate, 145);
  await assert.rejects(pricingSource('s', quota, { now, fresh: true }), GoogleSheetsUnavailable, 'a fresh read is never stale');
  await assert.rejects(pricingSource('s', async () => { throw new SourceDataError('SOURCE_NO_HEADER', 'x'); }, { now }), SourceDataError, 'a data error is never hidden');
  t += STALE_MAX_MS;
  await assert.rejects(pricingSource('s', quota, { now }), GoogleSheetsUnavailable, 'too old to stand in');
});

test('QUOTA · no guest\'s amounts reach another: both priced from the one held source, each for themselves', async () => {
  clearCatalogueCache();
  const { env } = routeEnv();
  await withSheets(book(), async (log) => {
    const named = await hit(env, GUEST, 'catalogue');                                  /* GT1: 009 names GT1 for T-SUITE */
    const other = await hit(env, { invitationId: 'INV-T9', guestId: 'GT9' }, 'catalogue');
    assert.equal(named.j.quotes['wedstay/suite'].total, 150); assert.equal(named.j.quotes['wedstay/suite'].rateSource, 'SPECIAL_RATE');
    assert.equal(other.j.quotes['wedstay/suite'].total, null, 'the named rate is GT1\'s alone');
    assert.match(other.j.quotes['wedstay/suite'].manualReview, /no approved special rate names this person/);
    assert.equal(other.j.quotes['wedstay/suite'].listRate, null, 'a DRAFT item without a public rate lists none (the Presidential\'s closed handling)');
    assert.equal(other.j.quotes['wedstay/heritage'].listRate, 145, 'an ACTIVE per-person-per-night item lists 002\'s rate');
    assert.equal(other.j.quotes.train.listRate, null, 'a per-person item is no nightly rate');
    assert.equal(other.j.source.cached, true); assert.equal(log.filter((x) => x[0] === 'batchGet').length, 1);
    /* and back again: GT1 still gets GT1's own */
    assert.equal((await hit(env, GUEST, 'catalogue')).j.quotes['wedstay/suite'].total, 150);
  });
});

test('QUOTA · a read that meets 429 is asked again with backoff and succeeds; exhausted retries fail visibly; a write is never retried', async () => {
  const env = { SHEETS_READ_RETRY_BASE_MS: '1', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'synthetic@test.invalid', private_key: privateKey, private_key_id: 'quota' }) };
  const was = globalThis.fetch;
  let n = 0, mode = 2;
  globalThis.fetch = async (u, init) => {
    if (String(u).startsWith('https://oauth2')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
    n++;
    if ((init && init.method) === 'PUT') return new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 });
    if (n <= mode) return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429, headers: { 'retry-after': '0' } });
    return new Response(JSON.stringify({ valueRanges: [{ values: [['a']] }, { values: [['b']] }] }), { status: 200 });
  };
  try {
    const grids = await batchReadRanges(env, 'sheet', ["'002'!A1:AZ", "'009'!A1:AZ"]);
    assert.deepEqual(grids, [[['a']], [['b']]]); assert.equal(n, 3, 'two 429s, then the answer');
    n = 0; mode = 99;
    await assert.rejects(batchReadRanges(env, 'sheet', ["'002'!A1:AZ"]), (e) => e instanceof GoogleSheetsUnavailable && e.status === 429);
    assert.equal(n, 4, 'one try and three retries — bounded');
    n = 0;
    await assert.rejects(updateRange(env, 'sheet', "'008'!N2:Q2", ['a', 'b', 'c', 'd']), (e) => e instanceof GoogleSheetsUnavailable && e.status === 429);
    assert.equal(n, 1, 'a write is not retried here');
  } finally { globalThis.fetch = was; }
});

test('QUOTA · the catalogue keeps answering through a moment of quota pressure (stale, display only); with nothing held it is a retryable 503', async () => {
  clearCatalogueCache();
  const { env } = routeEnv({ SHEETS_READ_RETRY_BASE_MS: '1' });
  const wb = book();
  await withSheets(wb, async () => { assert.equal((await hit(env, GUEST, 'catalogue')).status, 200); });
  const was = globalThis.fetch;
  globalThis.fetch = async (u) => (String(u).startsWith('https://oauth2')
    ? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
    : new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 }));
  const RealDate = globalThis.Date;
  try {
    globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [RealDate.now() + 2 * 60 * 1000])); } static now() { return RealDate.now() + 2 * 60 * 1000; } };
    const r = await hit(env, GUEST, 'catalogue');
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.source.stale, true); assert.equal(r.j.quotes.train.total, 100);
    /* the pre-send check is never answered from a held source */
    const v = await hit(env, GUEST, 'validate', { selections: [{ id: 'train', price: 100, qty: 1 }] });
    assert.equal(v.status, 503); assert.equal(v.j.retry, true);
    clearCatalogueCache();
    const none = await hit(env, GUEST, 'catalogue');
    assert.equal(none.status, 503); assert.equal(none.j.retry, true);
  } finally { globalThis.Date = RealDate; globalThis.fetch = was; }
});

test('VALIDATE · the lines about to be sent are priced again from a FRESH read for this guest: agreement, a difference, a named rate, lines the server does not price', async () => {
  clearCatalogueCache();
  const { env } = routeEnv();
  await withSheets(book(), async (log) => {
    await hit(env, GUEST, 'catalogue');                                    /* a held source exists … */
    const before = log.filter((x) => x[0] === 'batchGet').length;
    const ok = await hit(env, GUEST, 'validate', { selections: [{ id: 'train', price: 100, qty: 1 }, { id: 'wedstay', room: 'suite', price: 150, qty: 1 }, { id: 'spa', interest: true }, { id: 'tea1872', price: 30 }] });
    assert.equal(ok.status, 200); assert.equal(ok.j.valid, true); assert.equal(ok.j.checked, 2);
    assert.equal(log.filter((x) => x[0] === 'batchGet').length, before + 1, '… and the check still reads Google fresh');
    const off = await hit(env, GUEST, 'validate', { selections: [{ id: 'train', price: 90, qty: 1 }] });
    assert.equal(off.j.valid, false); assert.deepEqual(off.j.mismatches, [{ key: 'train', sent: 90, server: 100 }]); assert.equal(off.j.quotes.train.total, 100);
    /* GT9 has no named rate: the same 150 for the suite is a difference for GT9 */
    const other = await hit(env, { invitationId: 'INV-T9', guestId: 'GT9' }, 'validate', { selections: [{ id: 'wedstay', room: 'suite', price: 150, qty: 1 }] });
    assert.equal(other.j.valid, false); assert.equal(other.j.mismatches[0].server, null);
    assert.equal((await hit(env, GUEST, 'validate', { nope: 1 })).status, 400);
  });
});

test('QUOTA · a fresh read never joins an earlier load; the held entries are bounded', async () => {
  clearCatalogueCache();
  const { MAX_ENTRIES } = await import('../src/billing/catalogue-cache.js');
  let loads = 0, release;
  const slow = () => new Promise((r) => { release = () => r({ items: ITEMS, specialRates: SPECIAL }); });
  const ordinary = pricingSource('f', () => { loads++; return slow(); });
  await new Promise((r) => setImmediate(r));
  const fresh = await pricingSource('f', async () => { loads++; return { items: ITEMS, specialRates: SPECIAL }; }, { fresh: true });
  assert.equal(fresh.cached, false); assert.equal(loads, 2, 'its own read');
  release(); await ordinary;
  let n = 0; const quick = async () => { n++; return { items: ITEMS, specialRates: [] }; };
  for (let i = 0; i < MAX_ENTRIES + 5; i++) await pricingSource('day-' + i, quick);
  assert.equal((await pricingSource('day-0', quick)).cached, false, 'the oldest entry was dropped');
  assert.equal((await pricingSource('day-' + (MAX_ENTRIES + 4), quick)).cached, true, 'recent ones are held');
});

/* ======================================================= round 7 */

test('ROUND 7 · a payment decision is checked on 008 as it stands NOW — never on the grid the calculation prefetched', async () => {
  clearCatalogueCache();
  const { env } = routeEnv();
  const wb = book();
  wb['008_Payment_Journal'].push(['PAY-T7', 'S-T1', 'INV-T1', '', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T1', '2026-10-05T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  const log = [], base = sheetsFetch(wb, log), was = globalThis.fetch;
  let decidedElsewhere = false;
  globalThis.fetch = async (url, init) => {
    const r = await base(url, init);
    /* right after the calculation's batch read, somebody records VERIFIED in the sheet */
    if (!decidedElsewhere && /values:batchGet/.test(String(url))) {
      decidedElsewhere = true;
      const row = wb['008_Payment_Journal'].find((x) => x[0] === 'PAY-T7');
      row[13] = 'GROOM'; row[14] = '2026-10-06T08:00:00.000Z'; row[15] = 'VERIFIED';
    }
    return r;
  };
  try {
    const r = await hit(env, BRIDE, 'payment/reject', { Payment_ID: 'PAY-T7', Reject_Reason: 'not on the statement' });
    assert.equal(r.status, 409, JSON.stringify(r.j)); assert.equal(r.j.code, 'SOURCE_ALREADY_DECIDED');
    assert.equal(log.filter((x) => x[0] === 'update').length, 0, 'the VERIFIED row is never overwritten');
    assert.equal(wb['008_Payment_Journal'].find((x) => x[0] === 'PAY-T7')[15], 'VERIFIED');
    const i = log.findIndex((x) => x[0] === 'batchGet');
    assert.ok(log.slice(i + 1).some((x) => x[0] === 'get' && x[1] === '008_Payment_Journal'), '008 was read again before the decision');
  } finally { globalThis.fetch = was; }
});

test('ROUND 7 · a product key two 002 items claim is never priced by either and never waved through: catalogue "no amount", validate refuses', async () => {
  clearCatalogueCache();
  const { env } = routeEnv();
  const items = { ...ITEMS, 'T-TRAIN-B': { ...ITEMS['T-TRAIN'], Item_ID: 'T-TRAIN-B', Standard_Rate: 80 } };
  await withSheets(book(items), async () => {
    const c = await hit(env, GUEST, 'catalogue');
    assert.equal(c.status, 200); assert.equal(c.j.quotes.train.total, null); assert.equal(c.j.quotes.train.manualReview, 'AMBIGUOUS_SITE_PRODUCT_KEY');
    assert.equal(c.j.quotes['wedstay/heritage'].total, 290, 'other products are unaffected');
    for (const price of [100, 80, null]) {
      const v = await hit(env, GUEST, 'validate', { selections: [{ id: 'train', price, qty: 1 }] });
      assert.equal(v.status, 409); assert.deepEqual(v.j.ambiguous, ['train']);
    }
    const unrelated = await hit(env, GUEST, 'validate', { selections: [{ id: 'wedstay', room: 'heritage', price: 290, qty: 1 }] });
    assert.equal(unrelated.status, 200); assert.equal(unrelated.j.valid, true);
  });
});
