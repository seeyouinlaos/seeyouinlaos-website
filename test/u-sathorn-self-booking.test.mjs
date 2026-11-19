/* ============================================================================
   A NAMED PERSON'S OWN ARRANGEMENT (Owners, 19 Nov 2026 · engine 2.5.0 · HS-031.2): on an item settled through H&S, a 009 row with
   Billing_Category GUEST_SELF_BOOKING makes that one person's line Block B at USD 0 — "you book and pay this yourself" — never a gift,
   never "paid by H&S", never revenue. Synthetic persons, holders and rows only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, ENGINE_VERSION, COUPLE_PERSONS } from '../src/billing/engine.js';
import { buildSnapshot } from '../src/billing/settlement.js';
import { renderSettlementPdf } from '../src/billing/pdf.js';
import { quoteOfItem } from '../src/billing-routes.js';
import { GIFTS } from '../src/gifts.js';
import { journeyModel } from '../src/mail-templates.js';
import { page, PEGGY } from './sandbox.mjs';

const ITEM = { Item_ID: 'T-HOTEL', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 67.805,
  Quota: 6, Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', 'Number of Nights': 3, Site_Product_Key: 'bkk-stay/u-sathorn-superior-garden' };
const items = (o) => ({ 'T-HOTEL': { ...ITEM, ...o } });
const row = (p, o) => ({ Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'T-HOTEL', Rate_Per_Person_Night: 0, Nights_Rule: '3', Rate_Status: 'ACTIVE',
  Approved_By: 'Owners (synthetic)', Note: 'Guest books and pays directly to the hotel', Billing_Category: 'GUEST_SELF_BOOKING', ...o });
const bk = (p) => ({ Booking_ID: 'B-' + p, Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'T-HOTEL', Bill_To_Holder_ID: 'INV-' + p, State: 'CONFIRMED', Nights: 3, Quantity: 1, Room_Unit_ID: 'U1' });
const one = (rows, p, it) => calculate([bk(p)], { items: it || items(), specialRates: rows, asOf: '2026-11-19' });

test('ENGINE 2.5.0 · the named row: Block B, USD 0, "you book and pay this yourself" — no gift, no override, no special-rate note; the room mate keeps 002', () => {
  assert.equal(ENGINE_VERSION, 'billing-engine/2.5.0');
  const r = one([row('GT1')], 'GT1'), l = r.lines[0];
  assert.deepEqual([l.block, l.amountCents, l.rateSource, l.note, l.Billing_Category], ['B', 0, 'GUEST_SELF_BOOKING', 'you book and pay this yourself', 'GUEST_SELF_BOOKING']);
  assert.equal(l.categoryOverride, undefined, 'never "paid by H&S"'); assert.ok(!l.hosted); assert.ok(!l.specialRateRef, 'the row\'s Note is not printed as a rate');
  assert.equal(r.totalPayableCents, 0); assert.equal(r.blockB.length, 1);
  const mate = one([row('GT1')], 'GT7').lines[0];
  assert.deepEqual([mate.block, mate.amountCents, mate.rateSource], ['A', 20342, 'STANDARD_RATE'], 'a person the row does not name keeps 67.805 × 3');
  /* a USD 0 named rate WITHOUT the category keeps its own meaning (the other guests' rows): unchanged */
  const z = one([row('GT1', { Billing_Category: '' })], 'GT1').lines[0];
  assert.deepEqual([z.block, z.amountCents, z.rateSource], ['A', 0, 'SPECIAL_RATE']);
});

test('ENGINE 2.5.0 · what the rule does not cover goes to review, never guessed', () => {
  const why = (rows, p, it) => one(rows, p, it).lines[0].reviewReason || '';
  assert.match(why([row('GT1', { Rate_Per_Person_Night: 50 })], 'GT1'), /carries no price/);
  assert.match(why([row('GT1', { Rate_Per_Person_Night: '' })], 'GT1'), /carries no price/);
  assert.match(why([row('GT1', { Person_ID: '' })], 'GT1'), /must name the person/);
  assert.match(why([row('GT1', { Rate_Status: 'DRAFT' })], 'GT1'), /the guest's own arrangement but is not ACTIVE/);
  assert.match(why([row('GT1')], 'GT1', items({ Billing_Category: 'GUEST_SELF_PAYMENT' })), /not one the engine applies/);
  assert.match(why([row('GT1')], 'GT1', items({ Rate_Basis: 'PER_ROOM', Standard_Rate: 300 })), /only a per-person item/);
  assert.match(why([row('GT1')], 'GT1', items({ Rate_Status: 'DRAFT' })), /not ACTIVE/);
  const couple = COUPLE_PERSONS[0];
  const c = calculate([{ ...bk('GX'), Person_ID: couple }], { items: items(), specialRates: [{ ...row('GX'), Person_ID: couple }], asOf: '2026-11-19' }).lines[0];
  assert.match(c.reviewReason || '', /couple/);
});

test('THE CHAIN · the server\'s answer, the frozen statement and its PDF: Block B, no "paid by H&S", no "complimentary"', () => {
  const src = { items: items(), specialRates: [row('GT1')] };
  const q = quoteOfItem('T-HOTEL', src.items['T-HOTEL'], src, 'INV-GT1', 'GT1', '2026-11-19');
  assert.deepEqual([q.block, q.total, q.rateSource, q.paidByHS, q.hosted], ['B', 0, 'GUEST_SELF_BOOKING', null, false]);
  const result = one([row('GT1')], 'GT1');
  const snap = buildSnapshot({ settlementId: 'S-T-0001', revision: 2, holderId: 'INV-GT1', result, items: src.items, specialRates: src.specialRates,
    fx: { FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, issueDate: '2026-11-19', evidenceStatus: 'PRESENT', sourceHash: 'synthetic', paymentPreference: 'PAYPAL_EUR' });
  assert.equal(snap.lines[0].Category_Override_From, undefined); assert.deepEqual(snap.Block_B_Informational, ['T-HOTEL']); assert.equal(snap.Total_Payable_Cents, 0);
  const text = Buffer.from(renderSettlementPdf(snap, {})).toString('latin1');
  const streams = [...text.matchAll(/stream\r?\n([\s\S]*?)endstream/g)].map((m) => m[1]).join('\n');
  assert.match(streams, /you book and pay this yourself/); assert.doesNotMatch(streams, /complimentary|Bride and Groom|paid by H&S/i);
});

test('THE WEBSITE AND THE TRIP E-MAIL · the stay is the guest\'s own: the hotel link and "Guest will book by themselves" — no gift, no "already paid"', () => {
  assert.ok(!GIFTS.some((g) => g.kind === 'gift' && ((g.window || g.stage) === 'bkk-stay' || g.room === 'u-sathorn-superior-garden')), 'no U Sathorn gift entry');
  const quotes = { 'bkk-stay/u-sathorn-superior-garden': { total: 0, block: 'B', rateSource: 'GUEST_SELF_BOOKING', hosted: false, paidByHS: null, listRate: 67.805 } };
  const P = page({ auth: PEGGY, quotes }).SIYL_PRICE;
  const q = P.quote('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal(q.priceState, 'self'); assert.equal(q.gift, undefined); assert.notEqual(q.personal, 'prepaid');
  assert.equal(q.booking, 'self'); assert.match(q.bookingUrl, /^https:\/\/www\.trip\.com\//); assert.equal(q.bookingWords, 'Guest will book by themselves.');
  assert.doesNotMatch(JSON.stringify(q), /Complimentary|Bride & Groom|already paid/i);
  const b = P.bookingOf('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal(b.method, 'self'); assert.match(b.url, /trip\.com/);
  const m = journeyModel({ guestId: 'GT1', registration: { guestId: 'GT1', selections: [{ id: 'bkk-stay', name: 'U Sathorn Bangkok', meta: '21 – 24 February 2027 · Superior Garden', price: 203.42, stay: 'usathorn', room: 'u-sathorn-superior-garden', qty: 1 }], totalUsd: 203.42 } });
  const s = (m.stays || []).find((x) => x.id === 'bkk-stay');
  assert.ok(s, 'the stay is in the trip e-mail'); assert.equal(s.booking, 'self'); assert.equal(s.gift, '');
});

test('HS-031.8 · G007 (CON010) only: her U Sathorn stay is settled through her statement — no hotel link, no "book by themselves", the server\'s USD 203.42 unchanged; nobody else changes', async () => {
  const { giftsFor, statementLines, verifiedLines } = await import('../src/gifts.js');
  const own = giftsFor('CON010');
  assert.ok(own.some((g) => g.window === 'bkk-stay' && g.room === 'u-sathorn-superior-garden' && g.kind === 'statement' && g.charge === null));
  assert.ok(!giftsFor('CON003').some((g) => g.kind === 'statement') && !giftsFor('CON005').some((g) => g.kind === 'statement'), 'only her');
  const payable = { 'bkk-stay/u-sathorn-superior-garden': { total: 203.42, block: 'A', rateSource: 'STANDARD_RATE', hosted: false, paidByHS: null, listRate: 67.805 } };
  const P = page({ auth: { ...PEGGY, guestId: 'G007' }, quotes: payable, seed: { 'siyl.gifts': { guestId: 'G007', gifts: own, at: Date.now() } } }).SIYL_PRICE;
  const q = P.quote('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal(q.total, 203.42, 'the server\'s amount, unchanged'); assert.equal(q.priceState, 'amount');
  assert.deepEqual([q.booking, q.bookingUrl, q.bookingWords], ['statement', '', 'Settled through your statement to Haruthai & Suthep — please do not pay the hotel directly.']);
  assert.equal(q.personal, undefined, 'no personal rate'); assert.equal(q.gift, undefined, 'no gift');
  assert.equal(JSON.stringify(P.bookingOf('bkk-stay', 'u-sathorn-superior-garden')), JSON.stringify({ method: 'statement', url: '', words: 'Settled through your statement to Haruthai & Suthep — please do not pay the hotel directly.' }));
  /* the same entry while the server says she books it herself (Block B) changes nothing: the words follow the server's amount */
  const selfQ = page({ auth: { ...PEGGY, guestId: 'G007' }, quotes: { 'bkk-stay/u-sathorn-superior-garden': { total: 0, block: 'B', rateSource: 'GUEST_SELF_BOOKING', listRate: 67.805 } }, seed: { 'siyl.gifts': { guestId: 'G007', gifts: own, at: Date.now() } } }).SIYL_PRICE.quote('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal(selfQ.booking, 'self');
  /* another guest with the same payable answer and no entry: unchanged */
  const other = page({ auth: { ...PEGGY, guestId: 'G777' }, quotes: payable }).SIYL_PRICE.quote('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal(other.booking, 'self'); assert.match(other.bookingUrl, /trip\.com/);
  /* the sent trip: the Worker stamps viaStatement from the sender's own entry only; the e-mail says it */
  const line = { id: 'bkk-stay', room: 'u-sathorn-superior-garden', stay: 'usathorn', name: 'U Sathorn Bangkok', price: 203.42, qty: 1 };
  assert.equal(statementLines(verifiedLines([line], own), own)[0].viaStatement, true);
  assert.equal(statementLines([{ ...line, viaStatement: true }], giftsFor('CON003'))[0].viaStatement, undefined, 'a claim without the entry is dropped');
  const m = journeyModel({ guestId: 'G007', registration: { guestId: 'G007', selections: [{ ...line, viaStatement: true, meta: '21 – 24 February 2027 · Superior Garden' }], totalUsd: 203.42 } });
  const s = (m.stays || []).find((x) => x.id === 'bkk-stay');
  assert.equal(s.booking, 'statement'); assert.equal(s.price, 203.42, 'her amount unchanged');
});
