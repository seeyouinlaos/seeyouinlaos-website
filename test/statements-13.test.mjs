/* ============================================================================
   HS-004 · the corrected statements: the frozen 1.2 writer, the layout of every revision, the recipient gate, the payment options and the
   correction note, the 1.3 page. Synthetic persons, products and accounts only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { layoutOfRevision, KNOWN_LAYOUTS, ISSUE_LAYOUTS, LEGACY_LAYOUT, CURRENT_LAYOUT } from '../src/billing/pdf-layouts.js';
import { pdfOptionsFor, renderIssuedPdf } from '../src/billing/pdf-writers.js';
import { recipientOfIssue } from '../src/billing/recipient.js';
import { isGermanNationality, paymentOptionsFor, optionView, correctionOf, wordsForIssue } from '../src/billing/statement-inputs.js';
import { renderSettlementPdf, isPrintable } from '../src/billing/pdf.js';
import { BillingLedger } from '../src/billing-ledger.js';

const text = (bytes) => { const s = Buffer.from(bytes).toString('latin1'); const out = [];
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) for (const t of m[1].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)) out.push(t[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (x, o) => String.fromCharCode(parseInt(o, 8))));
  return out.join('\n'); };

test('LAYOUTS · the 1.2 writer is the byte copy of the one that produced every original until 19 Nov 2026; every revision keeps its layout; a new issue only a name-printing one', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/billing/pdf-layout-12.js', import.meta.url))).digest('hex');
  assert.equal(sha, '9463116383defd1eb610700dd29e25e351e4329044ed24ccba9616cae8d0c01b', 'e9dfcbe:src/billing/pdf.js, byte for byte');
  assert.equal(layoutOfRevision({}), LEGACY_LAYOUT); assert.equal(layoutOfRevision({ Pdf_Layout: CURRENT_LAYOUT }), CURRENT_LAYOUT);
  assert.equal(layoutOfRevision({ Pdf_Layout: 'guest-settlement-pdf/9.9' }), null, 'never the newest instead');
  assert.deepEqual(KNOWN_LAYOUTS, ['guest-settlement-pdf/1.2', 'guest-settlement-pdf/1.3']); assert.deepEqual(ISSUE_LAYOUTS, ['guest-settlement-pdf/1.3']);
  assert.deepEqual(pdfOptionsFor(LEGACY_LAYOUT, { Recipient: { name: 'X Y' } }, { method: 'PAYPAL_EUR' }), { payment: { method: 'PAYPAL_EUR' } }, '1.2 exactly as before: the payment section only');
  assert.throws(() => renderIssuedPdf('guest-settlement-pdf/0.1', {}, {}), /no writer/);
});

test('GATE · the recipient and every person by full name, from one index entry and one 006 row; anything else blocks, named', () => {
  const register = { C1: { first: 'Alex', last: 'Example' }, C2: { first: 'Sam', last: '' }, C3: { ambiguous: true }, C4: { first: 'Şeyma', last: 'Ödün' }, C5: { first: 'Toni', last: 'Sample' } };
  const entries = { a: { i: 'INV-T1', g: 'GT1', c: 'C1' }, b: { i: 'INV-T2', g: 'GT2', c: 'C2' }, c: { i: 'INV-T3', g: 'GT3', c: 'C3' }, d: { i: 'INV-T4', g: 'GT4', c: 'C4' },
    e: { i: 'INV-T5', g: 'GT5', c: 'C5' }, f: { i: 'INV-T6', g: 'GT5', c: 'C1' } };
  const run = (holderId, persons) => recipientOfIssue({ entries, register, holderId, lines: persons.map((p) => ({ Person_ID: p })), printable: isPrintable });
  const ok = run('INV-T1', ['GT1']);
  assert.equal(ok.ok, true); assert.deepEqual(ok.recipient, { Holder_ID: 'INV-T1', Person_ID: 'GT1', name: 'Alex Example' }); assert.deepEqual(ok.personNames, { GT1: 'Alex Example' });
  assert.match(run('INV-T2', ['GT2']).reasons[0], /^RECIPIENT_NAME_INCOMPLETE/);
  assert.match(run('INV-T3', ['GT3']).reasons[0], /^RECIPIENT_AMBIGUOUS/);
  assert.match(run('INV-T4', ['GT4']).reasons[0], /^NAME_NOT_PRINTABLE:GT4/, 'a name the PDF would print with "?" is never printed');
  assert.ok(run('INV-T1', ['GT1', 'GT5']).reasons.some((x) => /^PERSON_AMBIGUOUS:GT5/.test(x)), 'two 006 ids behind one guest id');
  assert.ok(run('INV-T1', ['GT1', 'GT9']).reasons.some((x) => /^PERSON_NAME_MISSING:GT9/.test(x)));
  assert.match(run('INV-X', ['GT1']).reasons[0], /^RECIPIENT_NOT_RESOLVED/);
  assert.match(recipientOfIssue({ entries: {}, register, holderId: 'INV-T1', lines: [] }).reasons[0], /^NAMES_UNREADABLE/);
});

test('LEDGER · a new issue freezes the layout, the recipient, the names, the words and the ways to pay — or is refused before anything is written', () => {
  const draft = { lines: [{ Person_ID: 'GT1', Item_ID: 'T-A' }, { Person_ID: 'GT2', Item_ID: 'T-B' }] };
  const body = { pdfLayout: CURRENT_LAYOUT, recipient: { Holder_ID: 'INV-T1', Person_ID: 'GT1', name: 'Alex Example' }, personNames: { GT1: 'Alex Example', GT2: 'Toni Sample' },
    itemWords: { 'T-A': { name: 'Stay A', detail: 'dates' }, 'T-B': { name: 'Stay B', detail: '' } }, paymentOptions: ['SEPA_EUR', 'PAYPAL_EUR', 'NOT_A_METHOD'],
    correction: { replaces: 'V1', replacesIssued: '2026-10-11', reason: 'recipient and product names added' } };
  const f = BillingLedger.frozenIssueFields(body, draft);
  assert.equal(f.error, undefined);
  assert.equal(f.fields.Pdf_Layout, CURRENT_LAYOUT); assert.deepEqual(f.fields.Payment_Options, ['SEPA_EUR', 'PAYPAL_EUR']); assert.equal(f.fields.Correction.replaces, 'V1');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, pdfLayout: undefined }, draft).reason, 'PDF_LAYOUT_NOT_STATED');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, pdfLayout: LEGACY_LAYOUT }, draft).reason, 'PDF_LAYOUT_NOT_STATED', '1.2 prints no names: never for a new issue');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, recipient: { Person_ID: 'GT1', name: 'Alex' } }, draft).reason, 'RECIPIENT_INCOMPLETE');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, personNames: { GT1: 'Alex Example' } }, draft).reason, 'PERSON_NAME_MISSING');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, itemWords: { 'T-A': { name: 'Stay A' } } }, draft).reason, 'ITEM_NAME_MISSING');
  const sum = BillingLedger.revisionSummary({ Settlement_ID: 'S', Revision: 2, Revision_State: 'ISSUED', ...f.fields });
  assert.equal(sum.Pdf_Layout, CURRENT_LAYOUT); assert.equal(sum.recipientName, 'Alex Example');
});

test('PAYMENT OPTIONS · a German guest on the EUR route: SEPA first, PayPal as the alternative; everyone else the frozen method; a locked method stays alone', () => {
  assert.equal(isGermanNationality('German'), true); assert.equal(isGermanNationality('germany'), true);
  assert.equal(isGermanNationality('Thai, German'), false, 'mixed with Thai: the frozen method'); assert.equal(isGermanNationality('India'), false); assert.equal(isGermanNationality(''), false);
  assert.deepEqual(paymentOptionsFor({ channel: 'PAYPAL_EUR', german: true }), ['SEPA_EUR', 'PAYPAL_EUR']);
  assert.deepEqual(paymentOptionsFor({ channel: 'PAYPAL_EUR', german: false }), ['PAYPAL_EUR']);
  assert.deepEqual(paymentOptionsFor({ channel: 'PROMPTPAY_THB', german: true }), ['PROMPTPAY_THB'], 'PromptPay is never switched');
  assert.deepEqual(paymentOptionsFor({ channel: 'PAYPAL_EUR', german: true, locked: true }), ['PAYPAL_EUR']);
  const v = optionView('SEPA_EUR', 17000, { FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, { recipient: 'Account Holder', iban: 'XX00TEST0000000000000001' }, null);
  assert.deepEqual([v.amount.currency, v.amount.amount, v.amount.rate, v.recipient, v.iban], ['EUR', 151.3, '1 USD = 0.89 EUR', 'Account Holder', 'XX00TEST0000000000000001']);
});

test('CORRECTION NOTE · the version replaced, its issue date and what changed — in words, never a product key', () => {
  const issued = { Revision: 3, Issue_Date: '2026-11-19', lines: [{ Item_ID: 'A2-X', block: 'A' }, { Item_ID: 'T-B', block: 'A' }] };
  const proposal = { lines: [{ Item_ID: 'A2-X', block: 'B' }, { Item_ID: 'T-B', block: 'A' }] };
  const c = correctionOf(issued, proposal, { 'A2-X': { name: 'Hotel Name Bangkok · Room', detail: '' } });
  assert.deepEqual(c, { replaces: 'V3', replacesIssued: '2026-11-19', reason: 'recipient and product names added; Hotel Name Bangkok now under Your own arrangements' });
  assert.equal(correctionOf(null, proposal, {}), null);
  assert.deepEqual(wordsForIssue([{ Item_ID: 'Z' }], { Z: { Site_Product_Key: 'sangkhathan' } }).words.Z.name, 'Sangkhathan Temple Offering');
  assert.deepEqual(wordsForIssue([{ Item_ID: 'Q' }], { Q: { Site_Product_Key: 'nowhere' } }).missing, ['Q']);
});

test('PDF 1.3 · the recipient apart from the hosts, names with ids, products by name, the due date in words without "21 days", the second night in the website\'s words, two ways to pay, no engine or hash on the page', () => {
  const L = (o) => ({ Booking_ID: 'B', Bill_To_Holder_ID: 'INV-T1', Room_Unit_ID: null, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rateSource: 'STANDARD_RATE', modifiers: [], block: 'A', Currency: 'USD', ...o });
  const snap = { Settlement_ID: 'S-T-0001', Revision: 2, Holder_ID: 'INV-T1', Issue_Date: '2026-11-21', Due_Date: '2026-11-30', Currency: 'USD', FX_USD_THB: 33.68, FX_USD_EUR: 0.89,
    Engine_Version: 'billing-engine/2.5.0', Source_Hash: 'abc123', Total_Payable_Cents: 17000, Block_A_Total_Cents: 17000, Block_B_Informational: [], Payment_Preference: 'PAYPAL_EUR',
    lines: [L({ Person_ID: 'GT1', Item_ID: 'T-WED', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 15500, nights: 2, payableNights: 1, amountCents: 15500, modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] }),
      L({ Person_ID: 'GT2', Item_ID: 'T-OFF', Rate_Basis: 'PER_PERSON', rateCents: 1500, quantity: 1, amountCents: 1500 })] };
  const qr = { width: 2, height: 2, colorSpace: 'DeviceRGB', filter: 'RunLengthDecode', data: new Uint8Array([11, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 128]) };
  const options = [optionView('SEPA_EUR', 17000, snap, { recipient: 'Account Holder', iban: 'XX00TEST0000000000000001' }, null), optionView('PAYPAL_EUR', 17000, snap, { recipient: 'Payee' }, qr)];
  const bytes = renderSettlementPdf(snap, { payment: { options, totalUsd: 170, dueDate: '2026-11-30', reference: 'S-T-0001' }, recipient: { Person_ID: 'GT1', name: 'Alex Example' },
    persons: { GT1: 'Alex Example', GT2: 'Toni Sample' }, items: { 'T-WED': { name: 'Hotel · Room', detail: 'Wedding Stay · 27 February - 1 March 2027' }, 'T-OFF': { name: 'Offering', detail: 'temple' } },
    correction: { replaces: 'V1', replacesIssued: '2026-10-11', reason: 'recipient and product names added' } });
  const t = text(bytes), raw = Buffer.from(bytes).toString('latin1');
  for (const s of ['STATEMENT FOR', 'Alex Example', 'Guest ID GT1', 'FROM', 'Hosts of the wedding · payee', 'Also on this statement: Toni Sample (GT2)', 'Toni Sample', 'GT2',
    'Corrected version · replaces V1 issued 11 October 2026 · recipient and product names added', '21 November 2026', '30 November 2026',
    'Please settle this statement by the due date above (30 November 2026).', 'Hotel · Room', 'first night your cost · second night', '2 nights',
    'Option 1 · Bank transfer (SEPA)', 'Option 2 · PayPal (alternative)', 'XX00 TEST 0000 0000 0000 0001', 'EUR 151.30', 'S-T-0001', 'USD 170.00 · EUR 151.30 (1 USD = 0.89 EUR)']) assert.ok(t.includes(s), s);
  assert.ok(t.indexOf('Option 1') < t.indexOf('Option 2'));
  for (const s of ['T-WED', 'T-OFF', '21 days', 'Engine ', 'Source hash', '1 of 2 nights']) assert.ok(!t.includes(s), 'never on the page: ' + s);
  assert.match(raw, /\/Keywords \(engine billing-engine\/2\.5\.0 \\267 source hash abc123\)/);
  /* the second-night words only where the line is exactly that */
  const plain = text(renderSettlementPdf({ ...snap, lines: [L({ Person_ID: 'GT1', Item_ID: 'T-WED', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 15500, nights: 2, payableNights: 2, amountCents: 31000, modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] })] }, { items: { 'T-WED': { name: 'Hotel · Room', detail: '' } } }));
  assert.ok(!plain.includes('second night complimentary'));
});
