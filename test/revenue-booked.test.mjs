/* ============================================================================
   BOOKED REVENUE (billing-revenue/2.3.0 · Owner, 15 Nov 2026) — src/billing/revenue.js through the shipped engine.
   Every figure here comes from engine.calculate() or a frozen snapshot built from it; nothing is typed as a total, and
   every person, invitation and rate is invented.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRevenueOverview } from '../src/billing/revenue.js';
import { calculate } from '../src/billing/engine.js';

const ITEMS = {
  'T-EXEC': { Item_ID: 'T-EXEC', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 155,
    Quota: 13, Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', Site_Product_Key: 'wedstay/heritage-executive', 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] },
  'T-HOUSE': { Item_ID: 'T-HOUSE', Billing_Category: 'HOSTED_NO_GUEST_CHARGE', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 0,
    Quota: 4, Quota_Unit: 'PERSON', Currency: 'USD', Site_Product_Key: 'guesthouse/guest-house', 'Number of Nights': 2 },
  'T-TEMPLE': { Item_ID: 'T-TEMPLE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 15, Currency: 'USD', Site_Product_Key: 'sangkhathan' },
  'T-TRAIN': { Item_ID: 'T-TRAIN', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 100, Currency: 'USD', Site_Product_Key: 'train' },
};
const PAYER = 'INV-GP1';
const R009 = (person, rate, rule) => ({ Holder_ID: PAYER, Person_ID: person, Item_ID: 'T-EXEC', Rate_Per_Person_Night: rate, Nights_Rule: String(rule), Rate_Status: 'ACTIVE', Approved_By: 'Synthetic order' });
const SPECIAL = [R009('GP1', 145, 1), R009('GP2', 145, 1), R009('GP3', 75, 1), R009('GM1', 145, 2), R009('GM2', 145, 2)];
const bk = (holder, person, item, unit) => ({ Booking_ID: ['BK', holder, person, item, 'g1'].join('·'), Holder_ID: holder, Person_ID: person, Item_ID: item, Bill_To_Holder_ID: holder,
  Room_Unit_ID: unit ? 'RU·' + item + '·' + unit : null, State: 'CONFIRMED', Nights: ITEMS[item]['Number of Nights'] || null, Quantity: 1, Selected: true });
const ob = (holder, person, item, unit, n, bed) => ({ ...bk(holder, person, item, unit), Booking_ID: ['OB', holder, person, item, 'e' + n].join('·'), extraBed: !!bed });
const ASOF = '2026-11-15';
/* an issued revision, frozen from the engine's own result for these bookings (as the ledger freezes it) */
function issuedFor(settlementId, bookings, specialRates, extra) {
  const r = calculate(bookings, { items: ITEMS, specialRates: specialRates || [], asOf: ASOF });
  return { Settlement_ID: settlementId, Revision: 1, Revision_State: 'ISSUED', Total_Payable_Cents: r.totalPayableCents, Issue_Date: '2026-10-11', Due_Date: '2026-11-01',
    Payment_Preference: 'PROMPTPAY_THB', Currency: 'USD', lines: r.lines.map((l) => ({ Booking_ID: l.Booking_ID, Item_ID: l.Item_ID, Person_ID: l.Person_ID, Bill_To_Holder_ID: l.Bill_To_Holder_ID,
      Room_Unit_ID: l.Room_Unit_ID, rateSource: l.rateSource, amountCents: l.amountCents, block: l.block, quantity: l.quantity })), ...(extra || {}) };
}
const H = (o) => ({ drifts: [], regState: 'NONE', ownerState: 'NONE', ownerProblems: [], extraBeds: [], ...o });
const overview = (holders, issued, journal, specialRates) => buildRevenueOverview({ holders, items: ITEMS, specialRates: specialRates || SPECIAL, journalRows: journal || [], issuedRevisions: issued || [], asOf: ASOF });

test('BOOKED · a confirmed trip is booked; with its statement issued nothing is "not yet invoiced"; without one all of it is', () => {
  const a = [bk('INV-GA', 'GA', 'T-EXEC', 'A'), bk('INV-GA', 'GA', 'T-TRAIN')];
  const b = [bk('INV-GB', 'GB', 'T-EXEC', 'B'), bk('INV-GB', 'GB', 'T-TEMPLE')];
  const iss = issuedFor('S-A', a);
  const r = overview([H({ Holder_ID: 'INV-GA', Settlement_ID: 'S-A', bookings: a, regState: 'CONFIRMED' }), H({ Holder_ID: 'INV-GB', bookings: b, regState: 'CONFIRMED', noSettlementRecord: true })], [iss]);
  const engineTotal = calculate([...a, ...b], { items: ITEMS, specialRates: SPECIAL, asOf: ASOF }).totalPayableCents;
  assert.equal(r.bookedRevenue.cents, engineTotal); assert.equal(r.bookedRevenue.complete, true);
  assert.equal(r.notYetInvoiced.cents, engineTotal - iss.Total_Payable_Cents, 'the holder without a statement'); assert.equal(r.changedSinceIssue.cents, 0); assert.equal(r.invoicedNotBooked.cents, 0);
  assert.equal(r.breakdown.reconciled, true); assert.equal(r.breakdown.roomsTotal.cents + r.breakdown.extrasTotal.cents, r.bookedRevenue.cents);
  assert.deepEqual(r.breakdown.extras.map((e) => [e.Item_ID, e.cents]), [['T-TEMPLE', 1500], ['T-TRAIN', 10000]]);
});

test('BOOKED · a confirmation that lapsed (a newer version sent): the trip stands as issued — never zero, never the unconfirmed version', () => {
  const v1 = [bk('INV-GL', 'GL', 'T-EXEC', 'C'), bk('INV-GL', 'GL', 'T-TEMPLE')];
  const iss = issuedFor('S-L', v1);
  const r = overview([H({ Holder_ID: 'INV-GL', Settlement_ID: 'S-L', bookings: [], regState: 'LAPSED' })], [iss]);
  assert.equal(r.confirmedRevenue.cents, 0, 'the engine sees no confirmed booking (unchanged)');
  assert.equal(r.bookedRevenue.cents, iss.Total_Payable_Cents, 'booked: as issued'); assert.equal(r.issuedRevenue.cents, iss.Total_Payable_Cents);
  assert.equal(r.notYetInvoiced.cents, 0); assert.equal(r.invoicedNotBooked.cents, 0);
  assert.deepEqual(r.holders[0].bookedFrom, ['trip as issued (newer version not confirmed)']); assert.deepEqual(r.lapsedConfirmations, ['INV-GL']);
});

test('BOOKED · the Owners\' confirmed rooms: per person from the named 009 rates, one room of three with its extra bed, the parents\' room — by category and by room', () => {
  const own = [ob(PAYER, 'GM1', 'T-EXEC', 'E', 1), ob(PAYER, 'GM2', 'T-EXEC', 'E', 2), ob(PAYER, 'GP1', 'T-EXEC', 'I', 3), ob(PAYER, 'GP2', 'T-EXEC', 'I', 4), ob(PAYER, 'GP3', 'T-EXEC', 'I', 5, true), ob(PAYER, 'GP1', 'T-TEMPLE', null, 6)];
  const r = overview([H({ Holder_ID: PAYER, bookings: own, ownerState: 'CONFIRMED', noSettlementRecord: true, extraBeds: [own[4].Booking_ID] })]);
  const eng = calculate(own, { items: ITEMS, specialRates: SPECIAL, asOf: ASOF });
  const amt = (p, item) => eng.lines.find((l) => l.Person_ID === p && l.Item_ID === item).amountCents;
  const roomE = amt('GM1', 'T-EXEC') + amt('GM2', 'T-EXEC'), roomI = amt('GP1', 'T-EXEC') + amt('GP2', 'T-EXEC') + amt('GP3', 'T-EXEC');
  assert.equal(roomE, 2 * 145 * 2 * 100); assert.equal(roomI, (2 * 145 + 75) * 100, 'the approved terms, from the engine');
  assert.equal(r.bookedRevenue.cents, eng.totalPayableCents); assert.equal(r.bookedRevenue.cents, roomE + roomI + 1500);
  const unit = (u) => r.breakdown.roomsByUnit.find((x) => x.Room_Unit_ID === 'RU·T-EXEC·' + u);
  assert.equal(unit('E').cents, roomE); assert.equal(unit('E').places, 2); assert.equal(unit('E').extraBeds, 0);
  assert.equal(unit('I').cents, roomI); assert.equal(unit('I').places, 3, 'three guests, counted once each'); assert.equal(unit('I').extraBeds, 1); assert.equal(unit('I').payers, 1);
  const cat = r.breakdown.roomsByCategory.find((c) => c.Item_ID === 'T-EXEC');
  assert.equal(cat.cents, roomE + roomI); assert.equal(cat.rooms, 2); assert.equal(cat.extraBeds, 1); assert.equal(cat.extraBedAmount.cents, 7500);
  assert.equal(r.breakdown.extras[0].cents, 1500); assert.equal(r.breakdown.reconciled, true);
  assert.equal(r.notYetInvoiced.cents, r.bookedRevenue.cents, 'nothing of it invoiced yet');
});

test('BOOKED · each source on its own: the Owners\' record waiting for confirmation never takes the guest\'s confirmed trip out of the figure', () => {
  const trip = [bk('INV-GQ', 'GQ', 'T-TRAIN')];
  /* the engine only ever sees confirmed bookings: the recorded (unconfirmed) Owners' lines are not in `bookings` */
  const r = overview([H({ Holder_ID: 'INV-GQ', bookings: trip, regState: 'CONFIRMED', ownerState: 'RECORDED', noSettlementRecord: true })]);
  assert.equal(r.bookedRevenue.cents, 10000, 'the confirmed trip stays booked'); assert.equal(r.bookedRevenue.complete, true);
});

test('BOOKED · a cancelled holder books nothing: its statement stays issued and receivable, and shows as invoiced but no longer booked', () => {
  const v = [bk('INV-GX', 'GX', 'T-EXEC', 'D')];
  const iss = issuedFor('S-X', v);
  const r = overview([H({ Holder_ID: 'INV-GX', Settlement_ID: 'S-X', bookings: [], cancelled: true, regState: 'CANCELLED' })], [iss]);
  assert.equal(r.bookedRevenue.cents, 0); assert.equal(r.issuedRevenue.cents, iss.Total_Payable_Cents); assert.equal(r.outstanding.cents, iss.Total_Payable_Cents);
  assert.equal(r.invoicedNotBooked.cents, iss.Total_Payable_Cents, 'a revision or a decision is due');
  assert.deepEqual(r.cancelledHolders.map((c) => c.Holder_ID), ['INV-GX']);
});

test('BOOKED · a DOUBLE BOOKING is never settled here: both holders a named gap of the booked and the confirmed figure, both lines listed', () => {
  const own = [bk('INV-GP2', 'GP2', 'T-EXEC', 'F')];                 /* the guest's own confirmed trip */
  const rec = [ob(PAYER, 'GP2', 'T-EXEC', 'I', 1)];                  /* and the Owners' record of another payer, same stay */
  const other = [bk('INV-GZ', 'GZ', 'T-TRAIN')];
  const r = overview([H({ Holder_ID: 'INV-GP2', bookings: own, regState: 'CONFIRMED', noSettlementRecord: true }),
    H({ Holder_ID: PAYER, bookings: rec, ownerState: 'CONFIRMED', noSettlementRecord: true }), H({ Holder_ID: 'INV-GZ', bookings: other, regState: 'CONFIRMED', noSettlementRecord: true })]);
  assert.equal(r.doubleBookings.length, 1); assert.equal(r.doubleBookings[0].Person_ID, 'GP2'); assert.equal(r.doubleBookings[0].stage, 'wedstay');
  assert.deepEqual(r.doubleBookings[0].sides.map((x) => x.Holder_ID).sort(), ['INV-GP1', 'INV-GP2']);
  assert.equal(r.bookedRevenue.complete, false); assert.equal(r.bookedRevenue.partial.cents, 10000, 'the computable rest: the other holder only');
  assert.equal(r.confirmedRevenue.complete, false, 'never counted twice in the confirmed figure either');
  assert.equal(r.confirmedRevenue.partial.cents, 10000, 'its partial is the other holders only — the double-booked stay is in neither side');
  assert.equal(r.confirmedRevenue.attributed.cents, 10000);
  for (const id of ['INV-GP1', 'INV-GP2']) assert.equal(r.holders.find((h) => h.Holder_ID === id).confirmed.cents, null, id + ': no amount on its row');
  for (const id of ['INV-GP1', 'INV-GP2']) assert.match(JSON.stringify(r.bookedRevenue.gaps), new RegExp(id));
  /* the same holder: its own trip and the Owners' record of it */
  const same = [bk(PAYER, 'GP1', 'T-EXEC', 'I'), ob(PAYER, 'GP1', 'T-EXEC', 'I', 2)];
  const r2 = overview([H({ Holder_ID: PAYER, bookings: same, regState: 'CONFIRMED', ownerState: 'CONFIRMED', noSettlementRecord: true })]);
  assert.equal(r2.doubleBookings.length, 1); assert.equal(r2.bookedRevenue.complete, false);
});

test('BOOKED · the Owners\' bookings with a problem the Issue gate refuses are a named gap, never revenue', () => {
  const own = [ob(PAYER, 'GP3', 'T-EXEC', 'I', 1, true)];
  const r = overview([H({ Holder_ID: PAYER, bookings: own, ownerState: 'CONFIRMED', noSettlementRecord: true, ownerProblems: ['EXTRA_BED_UNPRICED: GP3 (T-EXEC)'] })], [], [], []);
  assert.equal(r.bookedRevenue.complete, false); assert.match(JSON.stringify(r.bookedRevenue.gaps), /EXTRA_BED_UNPRICED/);
  assert.equal(r.confirmedRevenue.complete, false);
  assert.equal(r.confirmedRevenue.partial.cents, 0, 'the unpriced extra bed is never valued at the 002 rate, not even as a partial');
  assert.equal(r.bookedRevenue.partial.cents, 0);
});

test('BOOKED · a rate changed since the statement was issued is "changed since issue", never "not yet invoiced"', () => {
  const v = [bk('INV-GC', 'GC', 'T-EXEC', 'G')];
  const iss = issuedFor('S-C', v);                                   /* issued at the standard rate */
  const named = [{ Holder_ID: 'INV-GC', Person_ID: 'GC', Item_ID: 'T-EXEC', Rate_Per_Person_Night: 150, Nights_Rule: '1', Rate_Status: 'ACTIVE', Approved_By: 'Synthetic order' }];
  const r = overview([H({ Holder_ID: 'INV-GC', Settlement_ID: 'S-C', bookings: v, regState: 'CONFIRMED' })], [iss], [], named);
  assert.equal(r.notYetInvoiced.cents, 0); assert.equal(r.changedSinceIssue.cents, 15000 - 15500); assert.equal(r.invoicedNotBooked.cents, 0);
  assert.equal(r.bookedRevenue.cents - r.issuedRevenue.cents, r.notYetInvoiced.cents + r.changedSinceIssue.cents - r.invoicedNotBooked.cents, 'booked − invoiced, explained to the cent');
});

test('PAYMENTS · reported payments are valued but never received; a duplicate suspect stands apart; verified by method through the journal', () => {
  const v = [bk('INV-GA', 'GA', 'T-TRAIN')]; const iss = issuedFor('S-A', v);
  const row = (id, status, usd, dup, method) => ({ Payment_ID: id, Settlement_ID: 'S-A', Holder_ID: 'INV-GA', Entry_Type: 'PAYMENT', Method: method || 'PROMPTPAY_THB', Amount_USD: usd, Record_Status: status, Duplicate_Suspect: dup ? 'TRUE' : 'FALSE' });
  const journal = [row('P1', 'REPORTED', 60), row('P2', 'REPORTED', 60, true), row('P3', 'VERIFIED', 30, false, 'PAYPAL_EUR')];
  const r = overview([H({ Holder_ID: 'INV-GA', Settlement_ID: 'S-A', bookings: v, regState: 'CONFIRMED' })], [iss], journal);
  assert.equal(r.paymentsReported.cents, 6000); assert.equal(r.paymentsReported.rows, 1); assert.equal(r.paymentsReported.duplicateSuspects, 1); assert.equal(r.paymentsReported.duplicateSuspectAmount.cents, 6000);
  assert.equal(r.cashCollected.cents, 3000, 'only verified money is received'); assert.equal(r.outstanding.cents, iss.Total_Payable_Cents - 3000);
  assert.deepEqual(r.payments.byMethod.map((m) => [m.method, m.verified.cents, m.reported.cents]), [['PAYPAL_EUR', 3000, 0], ['PROMPTPAY_THB', 0, 6000]]);
  assert.deepEqual(r.payments.invoicesByMethod.map((m) => [m.method, m.statements, m.invoiced.cents, m.outstanding.cents]), [['PROMPTPAY_THB', 1, iss.Total_Payable_Cents, iss.Total_Payable_Cents - 3000]]);
});

test('BOOKED · the Guest House and a wedding-stay hotel for one person: billing reads two stays (no gap) — the Rooms engine\'s other reading is listed', () => {
  const a = [bk('INV-GH', 'GH', 'T-HOUSE'), bk('INV-GH', 'GH', 'T-TRAIN')];
  const b = [ob(PAYER, 'GH', 'T-EXEC', 'H', 1)];
  const r = overview([H({ Holder_ID: 'INV-GH', bookings: a, regState: 'CONFIRMED', noSettlementRecord: true }), H({ Holder_ID: PAYER, bookings: b, ownerState: 'CONFIRMED', noSettlementRecord: true })],
    [], [], [{ Holder_ID: PAYER, Person_ID: 'GH', Item_ID: 'T-EXEC', Rate_Per_Person_Night: 145, Nights_Rule: '1', Rate_Status: 'ACTIVE', Approved_By: 'x' }]);
  assert.equal(r.doubleBookings.length, 0); assert.equal(r.bookedRevenue.complete, true);
  assert.equal(r.stayReadingDiffers.length, 1); assert.deepEqual(r.stayReadingDiffers[0].stays, ['guesthouse', 'wedstay']);
  const house = r.breakdown.roomsByCategory.find((c) => c.Item_ID === 'T-HOUSE'); assert.equal(house.hostedLines, 1); assert.equal(house.cents, 0);
});

test('BOOKED · review rules: the breakdown says partial with the figure; an unconfirmed Owners\' record with a problem stops nothing; a statement whose lines miss its total is a gap; "booked as issued" only with a statement', () => {
  /* a double booking: the breakdown is partial too */
  const own = [bk('INV-GP2', 'GP2', 'T-EXEC', 'F')], rec = [ob(PAYER, 'GP2', 'T-EXEC', 'I', 1)];
  const r1 = overview([H({ Holder_ID: 'INV-GP2', bookings: own, regState: 'CONFIRMED', noSettlementRecord: true }), H({ Holder_ID: PAYER, bookings: rec, ownerState: 'CONFIRMED', noSettlementRecord: true })]);
  assert.equal(r1.breakdown.complete, false);
  /* a problem on a record the Owners have NOT confirmed: nothing of it is billed — the guest's confirmed trip stays counted */
  const trip = [bk(PAYER, 'GP1', 'T-TRAIN')];
  const r2 = overview([H({ Holder_ID: PAYER, bookings: trip, regState: 'CONFIRMED', ownerState: 'RECORDED', ownerProblems: ['EXTRA_BED_UNPRICED: GP3'], noSettlementRecord: true })]);
  assert.equal(r2.bookedRevenue.complete, true); assert.equal(r2.bookedRevenue.cents, 10000); assert.deepEqual(r2.ownerRecordsWaiting, [{ Holder_ID: PAYER, asIssued: false }]);
  /* a statement whose frozen lines do not add up to its frozen total: never read line by line */
  const v = [bk('INV-GS', 'GS', 'T-TRAIN')];
  const bad = issuedFor('S-S', v, [], { Total_Payable_Cents: 99999 });
  const r3 = overview([H({ Holder_ID: 'INV-GS', Settlement_ID: 'S-S', bookings: v, regState: 'CONFIRMED' })], [bad]);
  assert.equal(r3.bookedRevenue.complete, false); assert.match(JSON.stringify(r3.bookedRevenue.gaps), /do not add up to its total/);
  /* a lapsed confirmation with no statement is booked at nothing — and is not listed as "booked as invoiced" */
  const r4 = overview([H({ Holder_ID: 'INV-GN', bookings: [], regState: 'LAPSED', noSettlementRecord: true })]);
  assert.equal(r4.bookedRevenue.cents, 0); assert.deepEqual(r4.lapsedConfirmations, []);
  /* a product without a site key still meets the double-booking check by its own Item_ID */
  const items2 = { ...ITEMS, 'T-NOKEY': { Item_ID: 'T-NOKEY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 20, Currency: 'USD' } };
  const nk = (h, n) => ({ Booking_ID: ['BK', h, 'GK', 'T-NOKEY', 'g' + n].join('·'), Holder_ID: h, Person_ID: 'GK', Item_ID: 'T-NOKEY', Bill_To_Holder_ID: h, Room_Unit_ID: null, State: 'CONFIRMED', Nights: null, Quantity: 1, Selected: true });
  const r5 = buildRevenueOverview({ holders: [H({ Holder_ID: 'INV-K1', bookings: [nk('INV-K1', 1)], regState: 'CONFIRMED', noSettlementRecord: true }), H({ Holder_ID: 'INV-K2', bookings: [nk('INV-K2', 1)], regState: 'CONFIRMED', noSettlementRecord: true })], items: items2, specialRates: [], journalRows: [], issuedRevisions: [], asOf: ASOF });
  assert.equal(r5.doubleBookings.length, 1); assert.equal(r5.doubleBookings[0].stage, 'T-NOKEY');
});
