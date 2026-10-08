/* ============================================================================
   AS SENT, AND TODAY (Owner, 8 Oct 2026) — src/billing/price-difference.js. Synthetic guests and figures; the shapes are the real
   ones (a sent record's selection lines; the engine's calculate() result for exactly those lines).
     · display only: the sent amounts never enter a calculation (the engine's result is an input, never an output)
     · one mapping: the engine's own filter (selectionLinesOf), paired by position
     · only what H&S charges is compared; a stay the guest pays the provider is not a difference
     · no amount is "not stated", never zero; cents, not floats; a payer change is material even at equal amounts
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceDifference, OUTCOME } from '../src/billing/price-difference.js';
import { calculate } from '../src/billing/engine.js';
import { bookingsOfSelections, selectionLinesOf } from '../src/billing/bookings.js';

const PAYABLE = 'GUEST_SETTLEMENT_REQUIRED';
const ITEMS = {
  'F-JINRI-TERRACE-DOUBLE': { Item_ID: 'F-JINRI-TERRACE-DOUBLE', Site_Product_Key: 'kmg/jinri-terrace-double', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 18.16666667, Currency: 'USD', 'Number of Nights': 3 },
  'F-ELEGANT-RESIDENCE': { Item_ID: 'F-ELEGANT-RESIDENCE', Site_Product_Key: 'kmg/elegant-residence', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 39.12, Currency: 'USD', 'Number of Nights': 3 },
  'G-TRAIN': { Item_ID: 'G-TRAIN', Site_Product_Key: 'c86', Billing_Category: PAYABLE, Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 105, Currency: 'USD', 'Number of Nights': 1 },
  'D1-STAY': { Item_ID: 'D1-STAY', Site_Product_Key: 'wedstay/heritage-executive', Billing_Category: PAYABLE, Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 155, Currency: 'USD', 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] },
};
const ROW = (o) => ({ Holder_ID: 'INV-GA', Person_ID: 'GA', Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep', ...o });
const engineFor = async (selections, specialRates) => calculate(await bookingsOfSelections({ holderId: 'INV-GA', personId: 'GA', selections, items: ITEMS }), { items: ITEMS, specialRates: specialRates || [], asOf: '2026-10-08' });

test('AS SENT · the sent half-room amount against today\'s per-person amount: DIFFERENT and material — in cents, never changed', async () => {
  const sent = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 54.5, paidByHS: true }, { id: 'c86', qty: 1, price: 105 }];
  const rows = [ROW({ Item_ID: 'F-JINRI-TERRACE-DOUBLE', Rate_Per_Person_Night: '36.33333333', Nights_Rule: '3', Billing_Category: PAYABLE })];
  const result = await engineFor(sent, rows);
  const before = JSON.stringify(result);
  const d = await priceDifference({ selections: sent, result });
  assert.equal(d.material, true);
  assert.deepEqual(d.lines.map((l) => [l.key, l.outcome, l.stated, l.engine]), [['kmg/jinri-terrace-double', OUTCOME.DIFFERENT, 5450, 10900], ['c86', OUTCOME.MATCH, 10500, 10500]]);
  assert.deepEqual([d.statedCents, d.engineCents], [15950, 21400]);
  assert.equal(JSON.stringify(result), before, 'display only: the engine\'s result is never altered');
  assert.match(d.digest, /^[0-9a-f]{64}$/);
  /* the same comparison, the same digest; another comparison, another digest */
  assert.equal((await priceDifference({ selections: sent, result })).digest, d.digest);
  const sentRight = [{ ...sent[0], price: 109 }, sent[1]];
  const same = await priceDifference({ selections: sentRight, result: await engineFor(sentRight, rows) });
  assert.equal(same.material, false); assert.notEqual(same.digest, d.digest);
});

test('AS SENT · a stay the guest pays the hotel is not compared; no amount is "not stated" (never zero); a payer change is material', async () => {
  /* the hotel's informational price on a stay the guest pays: no H&S amount, no line */
  const own = [{ id: 'kmg', stay: 'kunming', room: 'elegant-residence', qty: 1, price: 117.36 }];
  const d1 = await priceDifference({ selections: own, result: await engineFor(own) });
  assert.deepEqual([d1.material, d1.lines.length], [false, 0]);
  /* "Price to follow" on the sent side: NOT_COMPARABLE, not material, not 0 */
  const follow = [{ id: 'c86', qty: 1, price: null }];
  const d2 = await priceDifference({ selections: follow, result: await engineFor(follow) });
  assert.deepEqual(d2.lines.map((l) => [l.outcome, l.stated, l.engine]), [[OUTCOME.NOT_COMPARABLE, null, 10500]]); assert.equal(d2.material, false);
  /* a line the engine sends to review (no 009 price yet): NOT_COMPARABLE on the engine side */
  const asked = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 109, paidByHS: true }];
  const d3 = await priceDifference({ selections: asked, result: await engineFor(asked, [ROW({ Item_ID: 'F-JINRI-TERRACE-DOUBLE', Nights_Rule: '3', Billing_Category: PAYABLE })]) });
  assert.deepEqual(d3.lines.map((l) => [l.outcome, l.engine]), [[OUTCOME.NOT_COMPARABLE, null]]);
  /* sent as the guest's own, now paid by H&S — and the reverse: material even where an amount matches */
  const wasOwn = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 109 }];
  const d4 = await priceDifference({ selections: wasOwn, result: await engineFor(wasOwn, [ROW({ Item_ID: 'F-JINRI-TERRACE-DOUBLE', Rate_Per_Person_Night: '36.33333333', Nights_Rule: '3', Billing_Category: PAYABLE })]) });
  assert.deepEqual([d4.lines[0].outcome, d4.material], [OUTCOME.PAYER_CHANGED, true]);
  const wasPaid = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 109, paidByHS: true }];
  const d5 = await priceDifference({ selections: wasPaid, result: await engineFor(wasPaid) });
  assert.deepEqual([d5.lines[0].outcome, d5.lines[0].engineBlock, d5.material], [OUTCOME.PAYER_CHANGED, 'B', true]);
});

test('AS SENT · one mapping with the engine (interest lines and keyless lines skipped alike), quantity in cents, the wedding stay\'s one payable night', async () => {
  const sent = [{ id: 'spa', interest: true, price: 50 }, { note: 'no key' }, { id: 'c86', qty: 2, price: 105 }, { id: 'wedstay', stay: 'souphattra', room: 'heritage-executive', qty: 1, price: 155 }];
  assert.equal(selectionLinesOf(sent).length, 2);
  const result = await engineFor(sent, [ROW({ Item_ID: 'D1-STAY', Rate_Per_Person_Night: 150, Nights_Rule: '1' })]);
  const d = await priceDifference({ selections: sent, result });
  assert.deepEqual(d.lines.map((l) => [l.key, l.outcome, l.stated, l.engine]), [['c86', OUTCOME.MATCH, 21000, 21000], ['wedstay/heritage-executive', OUTCOME.DIFFERENT, 15500, 15000]]);
  /* the engine priced another number of lines than were sent: material, said so */
  const broken = await priceDifference({ selections: sent, result: { lines: result.lines.slice(0, 1) } });
  assert.deepEqual([broken.material, broken.lines[0].outcome], [true, OUTCOME.NOT_COMPARABLE]);
});

test('AS SENT · an unverified "paid" line was told neither and is not comparable; the totals add only priced lines; the digest names the guest and version', async () => {
  const sent = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: null, prepaidUnverified: true }, { id: 'c86', qty: 1, price: 100 }];
  const rows = [ROW({ Item_ID: 'F-JINRI-TERRACE-DOUBLE', Rate_Per_Person_Night: '36.33333333', Nights_Rule: '3', Billing_Category: PAYABLE })];
  const result = await engineFor(sent, rows);
  const d = await priceDifference({ selections: sent, result, context: { holderId: 'INV-GA', version: 1 } });
  assert.deepEqual(d.lines.map((l) => [l.key, l.outcome]), [['kmg/jinri-terrace-double', OUTCOME.NOT_COMPARABLE], ['c86', OUTCOME.DIFFERENT]]);
  assert.deepEqual([d.statedCents, d.engineCents], [10000, 10500], 'only the lines both sides price');
  /* a payer change never mixes a provider's informational figure into the totals */
  const own = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 54.5 }];
  const p = await priceDifference({ selections: own, result: await engineFor(own, rows) });
  assert.deepEqual([p.lines[0].outcome, p.statedCents, p.engineCents], [OUTCOME.PAYER_CHANGED, 0, 0]);
  /* the same lines for another guest, or another version, is another acknowledgement */
  const other = await priceDifference({ selections: sent, result, context: { holderId: 'INV-GB', version: 1 } });
  const later = await priceDifference({ selections: sent, result, context: { holderId: 'INV-GA', version: 2 } });
  assert.notEqual(d.digest, other.digest); assert.notEqual(d.digest, later.digest);
});
