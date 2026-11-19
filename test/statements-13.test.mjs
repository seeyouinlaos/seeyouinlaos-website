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

test('LAYOUT 1.2 · GOLDEN: the frozen writer renders a fixed statement byte for byte as main\'s writer did (19 Nov 2026) — its imports cannot drift it', async () => {
  const { renderSettlementPdf: render12 } = await import('../src/billing/pdf-layout-12.js');
  const L = (o) => ({ Booking_ID: 'B', Bill_To_Holder_ID: 'INV-T1', Room_Unit_ID: null, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rateSource: 'STANDARD_RATE', modifiers: [], block: 'A', Currency: 'USD', ...o });
  const snap = { Settlement_ID: 'S-T-0001', Revision: 1, Holder_ID: 'INV-T1', Issue_Date: '2026-10-11', Due_Date: '2026-11-01', Currency: 'USD', FX_USD_THB: 33.68, FX_USD_EUR: 0.89,
    Engine_Version: 'billing-engine/2.5.0', Source_Hash: 'abc123', Total_Payable_Cents: 17000, Block_A_Total_Cents: 17000, Block_B_Informational: [], Payment_Preference: 'PAYPAL_EUR',
    lines: [L({ Person_ID: 'GT1', Item_ID: 'T-WED', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 15500, nights: 2, payableNights: 1, amountCents: 15500, modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] }),
      L({ Person_ID: 'GT2', Item_ID: 'T-OFF', Rate_Basis: 'PER_PERSON', rateCents: 1500, quantity: 1, amountCents: 1500 })] };
  const payment = { method: 'PAYPAL_EUR', recipient: 'Payee', reference: 'S-T-0001', amount: { currency: 'EUR', amount: 151.3 }, totalUsd: 170, dueDate: '2026-11-01' };
  assert.equal(crypto.createHash('sha256').update(render12(snap, { payment })).digest('hex'), 'f2ffcf6e6ebe35a7b5f3782bf1405ff661b6395d57a7ed1228ed68b91eb779e5');
});

test('ISSUE DATE · no corrected statement before 21 Nov 2026 (the ledger refuses it before anything is written); a first statement is not held back', async () => {
  const { ISSUE_RULES } = await import('../src/billing/pdf-layouts.js');
  const was = { ...ISSUE_RULES };
  try {
    Object.assign(ISSUE_RULES, { floor: '2026-11-21' });
    const draft = { lines: [{ Person_ID: 'GT1', Item_ID: 'T-A' }] };
    const body = { pdfLayout: CURRENT_LAYOUT, recipient: { Holder_ID: 'INV-T1', Person_ID: 'GT1', name: 'Alex Example' }, personNames: { GT1: 'Alex Example' }, itemWords: { 'T-A': { name: 'Stay A' } },
      correction: { replaces: 'V1', replacesIssued: '2026-10-11', reason: 'recipient and product names added' } };
    assert.equal(BillingLedger.frozenIssueFields(body, draft, '2026-11-20', 'INV-T1').reason, 'ISSUE_DATE_TOO_EARLY');
    const { correction, ...first } = body;
    assert.equal(BillingLedger.frozenIssueFields(first, draft, '2026-11-20', 'INV-T1').error, undefined, 'a first statement keeps the day it is issued');
    assert.equal(BillingLedger.frozenIssueFields(body, draft, '2026-11-21', 'INV-T1').error, undefined);
    assert.equal(BillingLedger.frozenIssueFields(body, draft, '2026-11-21', 'INV-T9').reason, 'RECIPIENT_INCOMPLETE', 'the recipient is the holder of this statement');
    assert.equal(BillingLedger.frozenIssueFields({ ...body, paymentOptions: ['PROMPTPAY_THB'], expectedPaymentPreference: 'PAYPAL_EUR' }, draft, '2026-11-21', 'INV-T1').reason, 'PAYMENT_OPTIONS_MISMATCH');
  } finally { Object.assign(ISSUE_RULES, was); }
});

test('CORRECTION NOTE · only a version of the earlier layout gets "names added"; a later correction says what changed', () => {
  const issued = { Revision: 4, Issue_Date: '2026-11-21', Total_Payable_Cents: 17000, lines: [{ Person_ID: 'GT1', Item_ID: 'T-B', block: 'A', amountCents: 17000 }] };
  assert.equal(correctionOf(issued, { Total_Payable_Cents: 20000, lines: [{ Person_ID: 'GT1', Item_ID: 'T-B', block: 'A', amountCents: 20000 }] }, {}, { legacy: false }).reason, 'amount changed from USD 170.00 to USD 200.00');
  assert.equal(correctionOf(issued, { Total_Payable_Cents: 17000, lines: [{ Person_ID: 'GT2', Item_ID: 'T-B', block: 'A', amountCents: 17000 }] }, {}, { legacy: false }).reason, 'booked items updated');
  assert.equal(correctionOf(issued, { Total_Payable_Cents: 17000, lines: issued.lines }, {}, { legacy: false }).reason, 'statement updated');
  assert.equal(correctionOf(issued, { Total_Payable_Cents: 17000, lines: issued.lines }, {}).reason, 'recipient and product names added');
  assert.equal(isGermanNationality('Deutsche'), true);
});

test('PDF 1.3 · the couple\'s names never break across lines; a long recipient name is printed in full; "nothing payable" is said once; the PayPal label never runs into its value', () => {
  const L = (o) => ({ Booking_ID: 'B', Bill_To_Holder_ID: 'INV-T1', Room_Unit_ID: null, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rateSource: 'STANDARD_RATE', modifiers: [], block: 'A', Currency: 'USD', ...o });
  const base = { Settlement_ID: 'S-T-0002', Revision: 2, Holder_ID: 'INV-T1', Issue_Date: '2026-11-21', Due_Date: '2026-11-30', Currency: 'USD', FX_USD_THB: 33.68, FX_USD_EUR: 0.89,
    Engine_Version: 'e', Source_Hash: 'h', Block_B_Informational: [], Payment_Preference: 'PAYPAL_EUR' };
  const long = 'Maximiliana Konstantina Wilhelmina-Friederike von Hohenzollern-Sigmaringen';
  for (const w of [180, 260, 330, 420]) {   /* the second-night words fall at a different place for every name width */
    const snap = { ...base, Total_Payable_Cents: 15500, Block_A_Total_Cents: 15500,
      lines: [L({ Person_ID: 'GT1', Item_ID: 'T-WED', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 15500, nights: 2, payableNights: 1, amountCents: 15500, modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] })] };
    const t = text(renderSettlementPdf(snap, { recipient: { Person_ID: 'GT1', name: long }, persons: { GT1: long }, items: { 'T-WED': { name: 'Hotel · ' + 'Room '.repeat(w / 30), detail: 'Wedding Stay' } } }));
    assert.ok(!/Haruthai &\n|\nSuthep/.test(t), 'never "Haruthai &" / "Suthep" on two lines');
    assert.ok(t.replace(/\n/g, ' ').includes(long), 'the full name, never shortened'); assert.ok(!t.includes('…'));
  }
  const zero = text(renderSettlementPdf({ ...base, Total_Payable_Cents: 0, Block_A_Total_Cents: 0, lines: [] }, { payment: { nothingDue: true }, recipient: { Person_ID: 'GT1', name: 'Alex Example' }, persons: {}, items: {} }));
  assert.equal(zero.split('Nothing is payable on this statement.').length - 1, 1);
  const qr = { width: 3, height: 2, colorSpace: 'DeviceRGB', filter: 'RunLengthDecode', data: new Uint8Array([17, ...new Array(18).fill(0), 128]) };
  const snap = { ...base, Total_Payable_Cents: 17000, Block_A_Total_Cents: 17000, lines: [L({ Person_ID: 'GT1', Item_ID: 'T-OFF', Rate_Basis: 'PER_PERSON', rateCents: 17000, quantity: 1, amountCents: 17000 })] };
  const options = [optionView('SEPA_EUR', 17000, snap, { recipient: 'Account Holder', iban: 'XX00TEST0000000000000001' }, null), optionView('PAYPAL_EUR', 17000, snap, { recipient: 'Payee' }, qr)];
  const raw = Buffer.from(renderSettlementPdf(snap, { payment: { options, totalUsd: 170, dueDate: '2026-11-30', reference: 'S-T-0002' }, recipient: { Person_ID: 'GT1', name: 'Alex Example' }, persons: { GT1: 'Alex Example' }, items: { 'T-OFF': { name: 'Offering', detail: '' } } })).toString('latin1');
  const at = (s) => { const k = raw.indexOf('(' + s.replace(/[()\\]/g, (c) => '\\' + c) + ') Tj'); if (k < 0) return null;
    const m = /1 0 0 1 ([\d.]+) ([\d.]+) Tm $/.exec(raw.slice(Math.max(0, k - 40), k)); return m ? [+m[1], +m[2]] : null; };
  const label = at('Reference (note)'), value = [...raw.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm \(S-T-0002\) Tj/g)].map((m) => [+m[1], +m[2]]).find((v) => label && Math.abs(v[1] - label[1]) < 0.5);
  assert.ok(label && value && value[0] - label[0] >= 60 + 5, 'the value starts after the label (' + (label && value ? value[0] - label[0] : '?') + 'pt)');
  const img = /\/Im3 Do Q/.test(raw) ? /q ([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm \/Im3 Do Q/.exec(raw) : null;
  assert.ok(img && +img[1] <= 92 && +img[2] <= 92, 'a wide code stays inside its 92 × 92 box');
});

test('ISSUE RULES · the shipped values: no corrected statement before 21 Nov 2026, today is the real UTC day', async () => {
  const { ISSUE_RULES: R } = await import('../src/billing/pdf-layouts.js?shipped');
  assert.equal(R.floor, '2026-11-21');
  assert.equal(R.today(), new Date().toISOString().slice(0, 10));
});

test('LEDGER · a new version of an issued statement must name the version it replaces — the ledger\'s own state decides, never only the body', () => {
  const draft = { lines: [{ Person_ID: 'GT1', Item_ID: 'T-A' }] };
  const body = { pdfLayout: CURRENT_LAYOUT, recipient: { Holder_ID: 'INV-T1', Person_ID: 'GT1', name: 'Alex Example' }, personNames: { GT1: 'Alex Example' }, itemWords: { 'T-A': { name: 'Stay A' } } };
  assert.equal(BillingLedger.frozenIssueFields(body, draft, '2026-11-25', 'INV-T1', 3).reason, 'CORRECTION_NOT_STATED');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, correction: { replaces: 'V2', reason: 'x' } }, draft, '2026-11-25', 'INV-T1', 3).reason, 'CORRECTION_NOT_STATED');
  assert.equal(BillingLedger.frozenIssueFields({ ...body, correction: { replaces: 'V3', reason: 'x' } }, draft, '2026-11-25', 'INV-T1', 3).error, undefined);
  assert.equal(BillingLedger.frozenIssueFields(body, draft, '2026-11-19', 'INV-T1', null).error, undefined, 'a first statement: no correction, no floor');
  assert.ok(correctionOf({ Revision: 1, Issue_Date: '2026-10-11', Total_Payable_Cents: 1, lines: [] }, { Total_Payable_Cents: 2, lines: [] }, {}).reason.length <= 200);
});

test('PDF 1.3 · a named 009 rate shows "your agreed rate" — the 009 row\'s own working note is never printed', () => {
  const L = (o) => ({ Booking_ID: 'B', Bill_To_Holder_ID: 'INV-T1', Room_Unit_ID: null, Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', modifiers: [], block: 'A', Currency: 'USD', ...o });
  const snap = { Settlement_ID: 'S-T-0003', Revision: 2, Holder_ID: 'INV-T1', Issue_Date: '2026-11-21', Due_Date: '2026-11-30', Currency: 'USD', FX_USD_THB: 33.68, FX_USD_EUR: 0.89,
    Engine_Version: 'e', Source_Hash: 'h', Total_Payable_Cents: 0, Block_A_Total_Cents: 0, Block_B_Informational: [], Payment_Preference: 'PAYPAL_EUR',
    lines: [L({ Person_ID: 'GT1', Item_ID: 'T-WED', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 0, nights: 2, payableNights: 2, amountCents: 0, rateSource: 'SPECIAL_RATE', specialRateRef: 'Tess · internal working note · overrides a rule' })] };
  const t = text(renderSettlementPdf(snap, { recipient: { Person_ID: 'GT1', name: 'Tess Example' }, persons: { GT1: 'Tess Example' }, items: { 'T-WED': { name: 'Hotel · Room', detail: 'Wedding Stay' } } }));
  assert.ok(t.includes('your agreed rate')); assert.ok(!t.includes('internal working note') && !t.includes('overrides'));
});
