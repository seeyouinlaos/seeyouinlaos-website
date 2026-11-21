/* ============================================================================
   PAYMENT EVIDENCE · the reconciliation of receipts against 008, the statements and 007 (HS-054 phase A, Owners HS-PROMPT-054/-055)
   SYNTHETIC receipts, statements (HS-2099-…), references and amounts only — no real guest, account or transaction.
     · a receipt alone never records money: no row → New evidence; REPORTED → Matched; VERIFIED → Already recorded
     · a contradiction is "Needs verification" even under the Owners' rule (amount, currency, a collective payment that does not add
       up, a reference that pays another statement, the same transaction in two files)
     · noted only (E42): a reference cut short or swapped in 008, a payment recorded against an earlier revision
     · guest and supplier receipts never cross; the engine is pure and gives the same answer twice; account numbers are masked
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconcile, nextRegistry, statementsIn, maskDigits, STATUS } from '../src/billing/payment-evidence.js';

const row = (s, o) => ({ Payment_ID: 'PAY-' + s + '-' + (o.n || 1), Settlement_ID: s, Revision_Ref: o.rev || 'V1', Record_Status: o.status || 'VERIFIED', Amount_Paid: o.amount, Currency_Paid: o.cur || 'THB', Provider_Reference: o.ref || '' });
const rc = (id, o) => ({ fileId: id, kind: o.kind, title: o.title || 'HS receipt', size: o.size || '1000', modifiedTime: o.mt || '2099-01-01T00:00:00Z', statements: o.st || [], amount: o.amount, currency: o.cur || 'THB',
  date: o.date || '2099-01-02', reference: o.ref || '', method: o.method || 'Bank transfer', payer: o.payer || '', payee: o.payee || '', memo: o.memo || '', internal: !!o.internal, thirdParty: !!o.third, payerIsOwner: !!o.owner, statementTypos: o.typos || [] });
const ST = (rev, total, status, channel) => ({ revision: rev, total, paymentStatus: status || 'PAID', balance: 0, channel: channel || 'PROMPTPAY_THB' });
const statements = { 'HS-2099-0001': ST(1, 100), 'HS-2099-0002': ST(2, 50), 'HS-2099-0003': ST(1, 30), 'HS-2099-0004': ST(1, 20), 'HS-2099-0005': ST(1, 70, 'UNPAID', 'PAYPAL_EUR'),
  'HS-2099-0006': ST(1, 40), 'HS-2099-0007': ST(1, 40), 'HS-2099-0008': ST(1, 10, 'UNPAID') };
const journal = [
  row('HS-2099-0001', { amount: 3400, ref: 'XX REF-AAA-111 YY' }),
  row('HS-2099-0002', { amount: 1700, ref: 'REFBBB22', rev: 'V1' }),
  row('HS-2099-0003', { amount: 1000, ref: 'COLL-99999' }), row('HS-2099-0004', { amount: 700, ref: 'COLL-99999' }),
  row('HS-2099-0005', { amount: 382.7, cur: 'EUR', status: 'REPORTED' }),
  row('HS-2099-0006', { amount: 1360, ref: 'SWAP-BBBB' }), row('HS-2099-0007', { amount: 1360, ref: 'SWAP-AAAA' }),
];
const vendors = [{ vendor: 'Cake Example', payments: [{ cell: 'D25', amount: 15000, currency: 'THB', date: '2099-01-03', method: 'Bank Transfer' }] }];
const receipts = [
  rc('f1', { st: ['HS-2099-0001'], amount: 3400, ref: 'REF-AAA-111', internal: true }),
  rc('f2', { st: ['HS-2099-0002'], amount: 1700, ref: 'REFBBB223' }),
  rc('f3', { st: ['HS-2099-0003', 'HS-2099-0004'], amount: 1700, ref: 'COLL-99999', third: true }),
  rc('f4', { st: ['HS-2099-0005'], amount: 382.7, cur: 'EUR', method: 'PayPal' }),
  rc('f5', { st: ['HS-2099-0006'], amount: 1360, ref: 'SWAP-AAAA' }), rc('f6', { st: ['HS-2099-0007'], amount: 1360, ref: 'SWAP-BBBB' }),
  rc('f7', { st: ['HS-2099-0008'], amount: 340, ref: 'NEW-1' }),
  rc('f8', { title: 'Deposit: cake (BKK)', memo: 'cake deposit', amount: 15000, date: '2099-01-03', owner: true, method: 'PromptPay top-up' }),
  rc('f9', { title: 'Deposit: band', memo: 'deposit band', amount: 15000, date: '2099-01-09', owner: true }),
];
const run = (o) => reconcile(Object.assign({ receipts, journal, statements, vendors, registry: null }, o || {}));
const by = (R, id) => R.receipts.find((x) => x.fileId === id);

test('STATUS · a receipt never records money by itself: VERIFIED → Already recorded, REPORTED → Matched, no row → New evidence', () => {
  const R = run();
  assert.equal(by(R, 'f1').status, STATUS.RECORDED); assert.equal(by(R, 'f4').status, STATUS.MATCHED); assert.equal(by(R, 'f7').status, STATUS.NEW);
  assert.match(by(R, 'f1').notes.join(' '), /internal transfer .* accepted/);
  assert.deepEqual(R.newFiles.length, receipts.length, 'a first run sees every file as new');
});

test('COLLECTIVE · one receipt for several statements is Already recorded only when its rows add up exactly; more is Needs verification', () => {
  assert.equal(by(run(), 'f3').status, STATUS.RECORDED);
  const R = run({ journal: journal.concat([row('HS-2099-0004', { amount: 100, ref: 'COLL-99999', n: 2 })]) });
  assert.equal(by(R, 'f3').status, STATUS.VERIFY); assert.ok(by(R, 'f3').deviations.some((d) => d.code === 'AMOUNT_DIFFERS' && /more than the receipt/.test(d.text)));
});

test('NOTED ONLY (E42) · a reference cut short or swapped in 008, an earlier revision — the receipt stays Already recorded, 008 untouched', () => {
  const R = run();
  const f2 = by(R, 'f2'); assert.equal(f2.status, STATUS.RECORDED); assert.ok(f2.deviations.some((d) => d.code === 'REFERENCE_TRUNCATED' && d.info));
  assert.match(f2.notes.join(' '), /recorded against V1, the current revision is V2 — counted, status PAID/);
  for (const id of ['f5', 'f6']) { const x = by(R, id); assert.equal(x.status, STATUS.RECORDED, id); assert.ok(x.deviations.some((d) => d.code === 'REFERENCE_SWAPPED')); assert.ok(x.deviations.filter((d) => !d.info).length === 0, id + ': nothing but notes'); }
});

test('CONTRADICTIONS · amount, currency, a reference that pays another statement, the same transaction twice — Needs verification under the Owners\' rule too', () => {
  const R1 = run({ receipts: [rc('g1', { st: ['HS-2099-0001'], amount: 3500, ref: 'REF-AAA-111' })] });
  assert.equal(R1.receipts[0].status, STATUS.VERIFY);
  const R2 = run({ receipts: [rc('g2', { st: ['HS-2099-0001'], amount: 3400, cur: 'USD', ref: 'REF-AAA-111' })] });
  assert.ok(R2.receipts[0].deviations.some((d) => d.code === 'CURRENCY_DIFFERS')); assert.equal(R2.receipts[0].status, STATUS.VERIFY);
  const R3 = run({ receipts: [rc('g3', { st: ['HS-2099-0003'], amount: 1000, ref: 'COLL-99999' })] });
  assert.ok(R3.receipts[0].deviations.some((d) => d.code === 'REFERENCE_USED_ELSEWHERE' && !d.info)); assert.equal(R3.receipts[0].status, STATUS.VERIFY);
  const R4 = run({ receipts: [rc('h1', { st: ['HS-2099-0001'], amount: 3400, ref: 'REF-AAA-111' }), rc('h2', { st: ['HS-2099-0001'], amount: 3400, ref: 'ref aaa 111', size: '2000' })] });
  for (const x of R4.receipts) { assert.ok(x.deviations.some((d) => d.code === 'DUPLICATE_FILE'), x.fileId); assert.equal(x.status, STATUS.VERIFY); }
  const R5 = run({ receipts: [rc('u1', { st: ['HS-2099-0001'], amount: null, ref: 'X' })] });
  assert.equal(R5.receipts[0].status, STATUS.VERIFY);
  const R6 = run({ journal: journal.map((x) => (x.Settlement_ID === 'HS-2099-0001' ? { ...x, Record_Status: 'REJECTED' } : x)) });
  assert.equal(by(R6, 'f1').status, STATUS.VERIFY, 'an authorised receipt against a rejected entry is a contradiction (review F4)');
});

test('SUPPLIERS · a deposit matches 007 by amount, currency and date — never a guest row; one missing in 007 is New evidence; a differing method is noted', () => {
  const R = run();
  const f8 = by(R, 'f8'), f9 = by(R, 'f9');
  assert.equal(f8.kind, 'SUPPLIER'); assert.equal(f8.status, STATUS.RECORDED); assert.match(f8.ledger[0].supplier, /Cake Example \(D25\)/);
  assert.ok(f8.deviations.some((d) => d.code === 'METHOD_DIFFERS' && d.info));
  assert.equal(f9.status, STATUS.NEW); assert.equal(f9.ledger[0].supplier, null);
  assert.ok(R.receipts.filter((x) => x.kind === 'GUEST').every((x) => !x.ledger.some((l) => l.supplier)), 'guests never touch 007');
  assert.ok(R.receipts.filter((x) => x.kind === 'SUPPLIER').every((x) => !x.ledger.some((l) => l.rows)), 'suppliers never touch 008');
});

test('FILES · new, changed and removed files across runs; a changed file reopens its result; the registry keeps every file it ever saw', () => {
  const R1 = run(); const reg1 = nextRegistry(null, R1, '2099-02-01T00:00:00Z');
  const R2 = run({ registry: reg1 });
  assert.deepEqual([R2.newFiles, R2.changedFiles, R2.removedFiles], [[], [], []], 'a second run with nothing new');
  const changed = receipts.map((r) => (r.fileId === 'f1' ? { ...r, modifiedTime: '2099-03-01T00:00:00Z' } : r)).filter((r) => r.fileId !== 'f9');
  const R3 = run({ registry: reg1, receipts: changed });
  assert.deepEqual(R3.changedFiles, ['f1']); assert.deepEqual(R3.removedFiles, ['f9']);
  assert.ok(by(R3, 'f1').deviations.some((d) => d.code === 'FILE_CHANGED'));
  const reg3 = nextRegistry(reg1, R3, '2099-03-02T00:00:00Z');
  assert.equal(reg3.files.f9.removed, true); assert.equal(reg3.files.f1.firstSeen, '2099-02-01T00:00:00Z'); assert.equal(reg3.runs.length, 2);
  assert.equal(reg3.files.f1.history.length, 1, 'a changed file keeps its earlier values');
  const R4 = run({ registry: reg3, receipts: changed });
  assert.deepEqual(R4.removedFiles, [], 'a removed file is reported once');
});

test('IDEMPOTENT · the same input gives the same answer, whatever the order of the receipts', () => {
  const a = JSON.stringify(run()), b = JSON.stringify(run({ receipts: receipts.slice().reverse() }));
  assert.equal(a, b);
});

test('READING · statement numbers, also mistyped (HA-, HS_), are read and marked; the statements\' state not read is said, never called unknown', () => {
  assert.deepEqual(statementsIn('memo: HS_2099-0014 and HA-2098-0014, HS-2099-0012'), { ids: ['HS-2098-0014', 'HS-2099-0012', 'HS-2099-0014'], typo: ['HS-2098-0014', 'HS-2099-0014'] });
  const R = run({ statements: null });
  assert.ok(!R.receipts.some((x) => x.deviations.some((d) => d.code === 'STATEMENT_UNKNOWN')));
  assert.match(by(R, 'f1').notes.join(' '), /not read this run/);
});

test('PRIVACY · account numbers are masked to their last four digits; the engine is pure — no network, no file, no write', () => {
  assert.equal(maskDigits('KBank xxx-x-x3615-x to 123-4-56789-0'), 'KBank xxx-x-x3615-x to …7890');
  const R = run({ receipts: [rc('p1', { st: ['HS-2099-0001'], amount: 3400, ref: 'REF-AAA-111', payer: 'account 9876543210' })] });
  assert.equal(R.receipts[0].payer, 'account …3210');
  const src = fs.readFileSync(new URL('../src/billing/payment-evidence.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(src, /\bfetch\(|^\s*import\s|\brequire\(|\bfs\.|Date\.now|new Date\(\)|\.put\(|appendRow|updateRange/m);
});

/* ---------------------------------------------------- the review after the implementation (F1–F15) */
test('F1 · PARTIAL PAYMENTS · two receipts for one statement each keep their own row — no false alarm; a row with another reference is a contradiction', () => {
  const j = [row('HS-2099-0001', { amount: 1000, ref: 'PART-AAAAA1' }), row('HS-2099-0001', { amount: 2400, ref: 'PART-BBBBB2', n: 2 })];
  const R = run({ journal: j, receipts: [rc('a', { st: ['HS-2099-0001'], amount: 1000, ref: 'PART-AAAAA1' }), rc('b', { st: ['HS-2099-0001'], amount: 2400, ref: 'PART-BBBBB2', date: '2099-01-05' })] });
  for (const x of R.receipts) assert.equal(x.status, STATUS.RECORDED, x.fileId);
  const D = run({ journal: [row('HS-2099-0001', { amount: 3400, ref: 'OTHER-REF-999' })], receipts: [rc('c', { st: ['HS-2099-0001'], amount: 3400, ref: 'REF-AAA-111' })] });
  assert.equal(D.receipts[0].status, STATUS.VERIFY); assert.ok(D.receipts[0].deviations.some((d) => d.code === 'ROW_REFERENCE_DIFFERS'));
  /* two receipts without reference, one row: only one of them can have it — the other is never "Already recorded" */
  const N = run({ journal: [row('HS-2099-0001', { amount: 3400 })], receipts: [rc('d', { st: ['HS-2099-0001'], amount: 3400, date: '2099-01-02' }), rc('e', { st: ['HS-2099-0001'], amount: 3400, date: '2099-01-07' })] });
  assert.ok(N.receipts.filter((x) => x.status === STATUS.RECORDED).length <= 1, 'one row pays one receipt');
  assert.ok(N.receipts.some((x) => x.status === STATUS.VERIFY));
});

test('F2 · SWAPS · only a mutual swap is noted; a one-way copy or a third use of a reference is a contradiction', () => {
  const oneWay = run({ journal: [row('HS-2099-0006', { amount: 1360, ref: 'SWAP-BBBB' }), row('HS-2099-0007', { amount: 1360, ref: 'SWAP-BBBB' })],
    receipts: [rc('f5', { st: ['HS-2099-0006'], amount: 1360, ref: 'SWAP-AAAA' }), rc('f6', { st: ['HS-2099-0007'], amount: 1360, ref: 'SWAP-BBBB' })] });
  assert.equal(by(oneWay, 'f5').status, STATUS.VERIFY, 'A\'s transaction is not in 008');
  const third = run({ journal: journal.concat([row('HS-2099-0001', { amount: 1, ref: 'SWAP-BBBB', n: 9 })]), statements });
  assert.ok(['f5', 'f6'].some((id) => by(third, id).status === STATUS.VERIFY), 'a reference used a third time is not hidden');
});

test('F3–F4 · a duplicate without reference is found; a REJECTED ledger against an authorised receipt is a contradiction', () => {
  const D = run({ receipts: [rc('n1', { st: ['HS-2099-0008'], amount: 340, date: '2099-01-02T10:00' }), rc('n2', { st: ['HS-2099-0008'], amount: 340, date: '2099-01-02T10:00', size: '999' })] });
  for (const x of D.receipts) assert.ok(x.deviations.some((d) => d.code === 'DUPLICATE_FILE'), x.fileId);
  const J = run({ journal: journal.map((x) => (x.Settlement_ID === 'HS-2099-0001' ? { ...x, Record_Status: 'REJECTED' } : x)) });
  assert.equal(by(J, 'f1').status, STATUS.VERIFY); assert.ok(by(J, 'f1').deviations.some((d) => d.code === 'REJECTED_IN_LEDGER'));
});

test('F5 · THE STATEMENT SIDE · not issued, wrong currency for its way to pay, a revision mismatch on an unpaid statement, a PAID statement without this receipt\'s row', () => {
  const S = Object.assign({}, statements, { 'HS-2099-0008': { revision: null, total: 10, paymentStatus: null, channel: 'PROMPTPAY_THB' } });
  assert.ok(by(run({ statements: S }), 'f7').deviations.some((d) => d.code === 'STATEMENT_NOT_ISSUED'));
  assert.ok(run({ receipts: [rc('x', { st: ['HS-2099-9999'], amount: 1, ref: 'NOPE-NOPE' })] }).receipts[0].deviations.some((d) => d.code === 'STATEMENT_UNKNOWN'));
  const C = run({ receipts: [rc('y', { st: ['HS-2099-0005'], amount: 382.7, cur: 'USD' })] });
  assert.ok(C.receipts[0].deviations.some((d) => d.code === 'CURRENCY_NOT_THE_STATEMENTS'));
  const V = run({ statements: Object.assign({}, statements, { 'HS-2099-0002': ST(2, 50, 'UNPAID') }) });
  assert.ok(by(V, 'f2').deviations.some((d) => d.code === 'REVISION_DIFFERS')); assert.equal(by(V, 'f2').status, STATUS.VERIFY);
  const P = run({ receipts: [rc('z', { st: ['HS-2099-0001'], amount: 3400, ref: 'ANOTHER-REF-1', date: '2099-02-02' })] });
  assert.ok(P.receipts[0].deviations.some((d) => d.code === 'STATEMENT_ALREADY_PAID' || d.code === 'ROW_REFERENCE_DIFFERS')); assert.equal(P.receipts[0].status, STATUS.VERIFY);
});

test('F6–F7 · a supplier payment off by a day or without currency is checked, never "new"; an internal transfer with "deposit" in the memo is never a supplier payment', () => {
  const V1 = [{ vendor: 'Cake Example', payments: [{ cell: 'D25', amount: 15000, currency: '', date: '2099-01-03', method: 'Bank Transfer' }] }];
  assert.equal(by(run({ vendors: V1 }), 'f8').status, STATUS.VERIFY);
  const V2 = [{ vendor: 'Cake Example', payments: [{ cell: 'D25', amount: 15000, currency: 'THB', date: '2099-01-04', method: 'Bank (Transfer)' }] }];
  const R2 = run({ vendors: V2 }); assert.equal(by(R2, 'f8').status, STATUS.VERIFY); assert.ok(by(R2, 'f8').deviations.some((d) => d.code === 'SUPPLIER_NEAR_MATCH'));
  const V3 = [{ vendor: 'Cake Example', payments: [{ cell: 'D25', amount: 15000, currency: 'THB', date: '2099-01-03', method: 'Bank (Transfer' }] }];
  assert.doesNotThrow(() => run({ vendors: V3 }), 'sheet text is never a regular expression');
  const I = run({ receipts: [rc('i', { title: 'deposit transfer', memo: 'deposit', amount: 15000, date: '2099-01-03', owner: true, internal: true })] });
  assert.notEqual(I.receipts[0].kind, 'SUPPLIER'); assert.equal(I.receipts[0].status, STATUS.VERIFY);
});

test('F9–F13 · no Drive version is said; refund rows are never added; an unknown 008 status is a contradiction; a short reference never matches', () => {
  assert.ok(run({ receipts: [{ ...rc('v', { st: ['HS-2099-0001'], amount: 3400, ref: 'REF-AAA-111' }), size: '', modifiedTime: '' }] }).receipts[0].deviations.some((d) => d.code === 'NO_FILE_VERSION'));
  const F = run({ journal: journal.concat([{ ...row('HS-2099-0001', { amount: 500, ref: 'REF-AAA-111', n: 3 }), Entry_Type: 'REFUND' }]) });
  assert.equal(by(F, 'f1').status, STATUS.RECORDED); assert.match(by(F, 'f1').notes.join(' '), /REFUND row is not a payment/);
  const U = run({ journal: journal.map((x) => (x.Settlement_ID === 'HS-2099-0001' ? { ...x, Record_Status: 'PENDING' } : x)) });
  assert.ok(by(U, 'f1').deviations.some((d) => d.code === 'ROW_STATUS_UNKNOWN')); assert.equal(by(U, 'f1').status, STATUS.VERIFY);
  const S = run({ journal: [row('HS-2099-0001', { amount: 3400, ref: 'XX12345YY' })], receipts: [rc('s', { st: ['HS-2099-0001'], amount: 3400, ref: '12' })] });
  assert.notEqual(S.receipts[0].ledger[0].rows.length && S.receipts[0].ledger[0].rows[0].reference, 'MATCH', 'a two-character reference never matches by containment');
});
