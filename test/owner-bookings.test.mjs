/* ============================================================================
   THE OWNERS' OWN BOOKINGS (Owner, 15 Nov 2026) — src/billing/owner-bookings.js and the admin routes
   admin/owner-bookings, through the shipped engine, ledger and billing routes. Google is replaced at the fetch boundary by an
   in-memory workbook of SYNTHETIC data; every person, invitation and rate here is invented. The amounts asserted are derived
   from the synthetic 002 nights and the 009 Nights_Rule, never typed as totals.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { register } from 'node:module';

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
const { calculate } = await import('../src/billing/engine.js');
const { nightsOf } = await import('../src/billing/bookings.js');
const { PAYMENT_JOURNAL_COLUMNS } = await import('../src/billing/source.js');
const OB = await import('../src/billing/owner-bookings.js');

/* ------------------------------------------------------------ the doubles */
function doState() {
  const map = new Map(); let turn = Promise.resolve(), inside = false;
  return { storage: { get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined), put: async (k, v) => { map.set(k, structuredClone(v)); },
    delete: async (k) => map.delete(k), list: async ({ prefix = '' } = {}) => new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])) },
  blockConcurrencyWhile: (fn) => { if (inside) return Promise.resolve().then(fn); const next = turn.then(() => { inside = true; return fn(); }).finally(() => { inside = false; }); turn = next.then(() => undefined, () => undefined); return next; } };
}
/* a KV that writes, as REG_KV does */
const memKv = (o) => { const m = new Map(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, String(v)); }, _m: m }; };

/* --- the synthetic products: a wedding-stay room like the real one (two places, two nights, the second complimentary) --- */
const ITEMS = {
  'T-EXEC': { Item_ID: 'T-EXEC', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 155, Quota: 13, Quota_Unit: 'ROOM', Max_Pax: 2,
    Currency: 'USD', Site_Product_Key: 'wedstay/heritage-executive', 'Number of Nights': 2, Modifiers: 'SECOND_NIGHT_COMPLIMENTARY' },
  'T-PRE': { Item_ID: 'T-PRE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 112.5, Quota: 5, Quota_Unit: 'ROOM', Max_Pax: 2,
    Currency: 'USD', Site_Product_Key: 'prewed/heritage', 'Number of Nights': 2, Modifiers: '' },
  'T-OLD': { Item_ID: 'T-OLD', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'RETIRED', Rate_Basis: 'PER_PERSON', Standard_Rate: 10, Currency: 'USD', Site_Product_Key: 'old', 'Number of Nights': 1 },
};
/* the payer and four family members (two parents in room A; the payer, a sibling and an extra bed in room B) */
const P = { payer: 'GT32', sib: 'GT20', bed: 'GT21', mum: 'GT96', dad: 'GT97', other: 'GT50' };
const PAYER = 'INV-' + P.payer;
const INDEX = Object.fromEntries(Object.values(P).map((g, i) => ['k' + i, { i: 'INV-' + g, g, c: 'CON-' + g }]));
const R009 = (person, rate, rule) => [PAYER, person, 'T-EXEC', rate, String(rule), 'ACTIVE', '', '', 'Synthetic Owner order', 'synthetic'];
const FAMILY_RATES = [R009(P.payer, 145, 1), R009(P.sib, 145, 1), R009(P.bed, 75, 1), R009(P.mum, 145, 2), R009(P.dad, 145, 2)];

function workbook(rates) {
  const labels = ['Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To', 'Rate_Basis', 'Standard_Rate', 'Quota', 'Quota_Unit', 'Max_Pax', 'Change_Cutoff', 'Cancellation_Cutoff', 'Currency', 'Site_Product_Key', 'Number of Nights', 'Modifiers'];
  const cols = Object.values(ITEMS);
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...labels.map((l) => [l, ...cols.map((it) => (it[l] == null ? '' : it[l]))])],
    '008_Payment_Journal': [[...PAYMENT_JOURNAL_COLUMNS]],
    '009_Special_Rates': [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note'], ...(rates || [])],
    '010_Booking_Evidence_Index': [['Booking_ID', 'Settlement_ID', 'Holder_ID', 'Evidence_Status']],
    '011_Billing_Config': [['Config_Key', 'Value', 'Effective_From', 'Effective_To', 'Status', 'Approved_By', 'Approved_At', 'Note']],
    '006_Guestlist': [['ID', 'Firstname', 'Surname', 'Nationality'], ...Object.values(P).map((g) => ['CON-' + g, 'Synth' + g, 'Example', 'Thai'])],
  };
}
function sheetsFetch(wb) {
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return async (url) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return res(200, { access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(u)) {
      const ranges = [...new URL(u).searchParams.getAll('ranges')];
      return res(200, { valueRanges: ranges.map((range) => ({ range, values: wb[range.split('!')[0].replace(/^'|'$/g, '')] || [] })) });
    }
    const m = u.match(/\/values\/([^?]+)\?/); const tab = m ? decodeURIComponent(m[1]).split('!')[0].replace(/^'|'$/g, '') : '';
    return wb[tab] ? res(200, { values: wb[tab] }) : res(400, { error: { message: 'Unable to parse range' } });
  };
}
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
function routeEnv(kvInit) {
  const led = new BillingLedger(doState());
  return { SHEETS_ID: 'sheet-ob', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'owner-bookings@test.invalid', private_key: privateKey, private_key_id: 'ob' }),
    BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (req) => led.fetch(req) }) }, REG_KV: memKv(kvInit),
    ROOMS: { idFromName: () => 'r', get: () => ({ fetch: async () => new Response(JSON.stringify({ ok: true, mine: {} })) }) } };
}
const GROOM = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
async function hit(env, identity, path, body) {
  globalThis.__billingIdentity = identity;
  globalThis.__billingIndex = { ...INDEX, h1: { i: 'INV-G049', g: 'G049', c: 'CON-H1', h: 1 } };
  const url = new URL('https://stage.invalid/api/billing/' + path);
  const r = await handleBilling(new Request(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}), env, url, {});
  return { status: r.status, j: await r.json().catch(() => null) };
}
async function withSheets(wb, fn) { const was = globalThis.fetch; globalThis.fetch = sheetsFetch(wb); try { return await fn(); } finally { globalThis.fetch = was; } }
const persons = new Map(Object.values(P).map((g) => [g, g]));
const add = (rec, personId, itemId, room, extraBed) => OB.applyAction(rec, 'add', { entry: { personId, itemId, room, extraBed }, by: 'GROOM', at: '2026-11-15T00:00:00Z', items: ITEMS, persons });

/* ======================================================= the record, pure */

test('OWNER BOOKINGS · the record: an entry is checked, never edited; ids never reused; a change after a confirmation needs confirming again', () => {
  let rec = OB.emptyRecord();
  assert.equal(OB.stateOf(rec), OB.OWNER_BOOKING_STATE.NONE);
  assert.match(add(rec, 'GT404', 'T-EXEC').error, /^PERSON/, 'only an active guest of the register');
  assert.match(add(rec, P.mum, 'T-OLD').error, /retired/, 'never a retired product');
  assert.match(add(rec, P.mum, 'NOPE').error, /^ITEM/);
  assert.match(OB.applyAction(rec, 'add', { entry: { personId: P.mum, itemId: 'T-EXEC', room: 'A;drop' }, items: ITEMS, persons }).error, /^ROOM/);
  rec = add(rec, P.mum, 'T-EXEC', 'A').record; rec = add(rec, P.dad, 'T-EXEC', 'A').record;
  assert.equal(rec.rev, 2); assert.equal(OB.stateOf(rec), OB.OWNER_BOOKING_STATE.RECORDED);
  assert.match(add(rec, P.mum, 'T-EXEC', 'B').error, /^DOUBLE_BOOKING/, 'one person, one room per stay');
  const c = OB.applyAction(rec, 'confirm', { by: 'BRIDE', at: '2026-11-15T01:00:00Z', items: ITEMS, persons });
  assert.equal(OB.stateOf(c.record), OB.OWNER_BOOKING_STATE.CONFIRMED); assert.equal(c.record.confirmed.by, 'BRIDE');
  assert.equal(OB.applyAction(c.record, 'confirm', { items: ITEMS, persons }).unchanged, true, 'confirming the same revision again changes nothing');
  const removed = OB.applyAction(c.record, 'remove', { entryId: 'e2', by: 'GROOM', items: ITEMS, persons }).record;
  assert.equal(OB.stateOf(removed), OB.OWNER_BOOKING_STATE.RECORDED, 'a change after the confirmation is not confirmed');
  const again = add(removed, P.dad, 'T-EXEC', 'A').record;
  assert.deepEqual(again.entries.map((e) => e.id), ['e1', 'e3'], 'an entry id is never reused');
  assert.equal(OB.applyAction(OB.emptyRecord(), 'confirm', { items: ITEMS, persons }).ok, false, 'nothing to confirm');
  assert.deepEqual(again.log.map((l) => l.what.split(' ')[0]), ['add', 'add', 'confirm', 'remove', 'add']);
});

test('OWNER BOOKINGS · one confirmation for a statement: the guest\'s sent trip and the Owners\' record must both stand', () => {
  const C = OB.OWNER_BOOKING_STATE;
  assert.deepEqual(OB.combinedConfirmation({ state: 'CONFIRMED', version: 2 }, { state: C.NONE }), { state: 'CONFIRMED', version: 2 });
  assert.equal(OB.combinedConfirmation({ state: 'UNCONFIRMED', version: 1 }, { state: C.CONFIRMED, rev: 3 }).state, 'UNCONFIRMED', 'a sent trip awaiting confirmation blocks');
  assert.equal(OB.combinedConfirmation({ state: 'LAPSED', version: 2 }, { state: C.CONFIRMED, rev: 3 }).state, 'LAPSED');
  const rec = OB.combinedConfirmation({ state: 'CONFIRMED', version: 2 }, { state: C.RECORDED, rev: 4 });
  assert.equal(rec.state, 'UNCONFIRMED'); assert.equal(rec.ownerRecorded.state, C.RECORDED);
  const none = OB.combinedConfirmation({ state: 'NONE' }, { state: C.CONFIRMED, rev: 5, confirmedBy: 'GROOM' });
  assert.equal(none.state, 'CONFIRMED'); assert.equal(none.ownerRecorded.rev, 5, 'nothing sent, the Owners\' record confirmed: billable');
});

test('OWNER BOOKINGS · a family\'s two rooms through the engine: each person on the payer, named rates and nights from Google, occupancy and the extra bed', () => {
  let rec = OB.emptyRecord();
  for (const [p, room, bed] of [[P.mum, 'A'], [P.dad, 'A'], [P.payer, 'B'], [P.sib, 'B'], [P.bed, 'B', true]]) rec = add(rec, p, 'T-EXEC', room, bed).record;
  const rows = OB.toBookings(PAYER, rec, ITEMS, nightsOf);
  assert.ok(rows.every((b) => b.Holder_ID === PAYER && b.Bill_To_Holder_ID === PAYER && b.source === 'OWNER_RECORDED'));
  assert.ok(rows.every((b) => /^RU·T-EXEC·[AB]$/.test(b.Room_Unit_ID)), 'the room is the website\'s own unit: the same physical room the Rooms engine holds');
  assert.equal(new Set(rows.map((b) => b.Booking_ID)).size, 5);
  const special = FAMILY_RATES.map((r) => ({ Holder_ID: r[0], Person_ID: r[1], Item_ID: r[2], Rate_Per_Person_Night: r[3], Nights_Rule: r[4], Rate_Status: r[5], Approved_By: r[8] }));
  const res = calculate(rows, { items: ITEMS, specialRates: special, asOf: '2026-11-15' });
  assert.equal(res.manualReview.length, 0);
  const amountOf = (p) => res.lines.find((l) => l.Person_ID === p).amountCents / 100;
  /* expected from the synthetic data: 009 rate × the row's Nights_Rule */
  const exp = Object.fromEntries(special.map((s) => [s.Person_ID, s.Rate_Per_Person_Night * Number(s.Nights_Rule)]));
  for (const p of Object.values(P).filter((x) => x !== P.other)) { assert.equal(amountOf(p), exp[p], p); assert.equal(res.lines.find((l) => l.Person_ID === p).rateSource, 'SPECIAL_RATE'); }
  const roomA = amountOf(P.mum) + amountOf(P.dad), roomB = amountOf(P.payer) + amountOf(P.sib) + amountOf(P.bed);
  assert.equal(roomA, 2 * 145 * 2); assert.equal(roomB, 2 * 145 + 75); assert.equal(res.totalPayableCents / 100, roomA + roomB);
  const occ = OB.occupancy(rec, ITEMS);
  assert.deepEqual(occ.map((r) => [r.room, r.occupants, r.extraBeds, r.overCapacity]), [['A', 2, 0, false], ['B', 3, 1, false]]);
  /* the extra bed is priced only by its own 009 row; three in a room for two without an extra bed is over capacity */
  assert.deepEqual(OB.problemsOf({ holderId: PAYER, rec, items: ITEMS, specialRates: special, elsewhere: [] }), []);
  assert.match(OB.problemsOf({ holderId: PAYER, rec, items: ITEMS, specialRates: special.filter((s) => s.Person_ID !== P.bed), elsewhere: [] })[0], /^EXTRA_BED_UNPRICED: GT21/);
  let noBed = OB.emptyRecord(); for (const p of [P.payer, P.sib, P.bed]) noBed = add(noBed, p, 'T-EXEC', 'B').record;
  assert.match(OB.problemsOf({ holderId: PAYER, rec: noBed, items: ITEMS, specialRates: special, elsewhere: [] })[0], /^ROOM_OVER_CAPACITY: room B/);
  assert.match(OB.problemsOf({ holderId: PAYER, rec, items: ITEMS, specialRates: special, elsewhere: [{ personId: P.sib, stage: 'wedstay', by: 'x' }] })[0], /^DOUBLE_BOOKING: GT20/);
});

/* ======================================================= the routes */

const familyEntries = [[P.mum, 'A'], [P.dad, 'A'], [P.payer, 'B'], [P.sib, 'B'], [P.bed, 'B', true]];
async function recordFamily(env) {
  let rev = 0;
  for (const [personId, room, extraBed] of familyEntries) {
    const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed, note: 'synthetic' } });
    assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev;
  }
  return rev;
}

test('ROUTE admin/owner-bookings · the Owners record a family\'s rooms; the screen shows each person\'s named rate, nights, amount, the rooms and the total', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    const rev = await recordFamily(env);
    const stale = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev - 1, action: 'add', entry: { personId: P.other, itemId: 'T-PRE' } });
    assert.equal(stale.status, 409); assert.deepEqual(stale.j.reasons, ['STALE']);
    const g = await hit(env, GROOM, 'admin/owner-bookings?holder=' + PAYER);
    assert.equal(g.status, 200, JSON.stringify(g.j)); assert.equal(g.j.state, 'RECORDED'); assert.deepEqual(g.j.problems, []);
    const by = Object.fromEntries(g.j.entries.map((e) => [e.personId, e]));
    for (const [p, , bed] of familyEntries) {
      const rate = FAMILY_RATES.find((r) => r[1] === p);
      assert.equal(by[p].line.rateSource, 'SPECIAL_RATE', p); assert.equal(by[p].line.rate, rate[3]); assert.equal(by[p].line.payableNights, Number(rate[4]));
      assert.equal(by[p].line.amount, rate[3] * Number(rate[4])); assert.equal(by[p].extraBed, !!bed);
      assert.ok(by[p].person.startsWith('Synth'), 'the name from 006, by person');
    }
    assert.equal(g.j.total, FAMILY_RATES.reduce((t, r) => t + r[3] * Number(r[4]), 0));
    assert.deepEqual(g.j.rooms.map((r) => [r.room, r.occupants, r.extraBeds]), [['A', 2, 0], ['B', 3, 1]]);
    assert.ok(g.j.choices.persons.length >= 6 && g.j.choices.items.every((i) => i.itemId !== 'T-OLD'));
    assert.ok(!JSON.stringify(g.j.entries.map((e) => e.line)).includes('synthetic'), 'the note never reaches a booking line');
    /* not confirmed: no statement */
    const before = await hit(env, GROOM, 'issue', { holderId: PAYER, asOf: '2026-11-15' });
    assert.equal(before.status, 409); assert.match(before.j.reasons[0], /^BOOKING_NOT_CONFIRMED: UNCONFIRMED — the bookings Haruthai & Suthep recorded/);
    /* confirmed by the Owners: the holder view prices the lines; Issue is no longer stopped by the confirmation (the gate still stands) */
    const conf = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(conf.status, 200, JSON.stringify(conf.j)); assert.equal(conf.j.state, 'CONFIRMED');
    const st = await hit(env, GROOM, 'admin/status?ids=' + PAYER);
    assert.equal(st.j.rows[0].confirmation.state, 'CONFIRMED'); assert.equal(st.j.rows[0].confirmation.ownerRecorded.state, 'CONFIRMED');
    assert.equal(st.j.rows[0].draft.total, g.j.total, 'the statement draft is the Owners\' bookings');
    const after = await hit(env, GROOM, 'issue', { holderId: PAYER, asOf: '2026-11-15' });
    assert.equal(after.status, 409); assert.ok(!after.j.reasons.some((x) => /BOOKING_NOT_CONFIRMED|OWNER_BOOKING/.test(x)), JSON.stringify(after.j.reasons));
    /* the payer's own profile does not show the Owners' lines before a statement is issued */
    const mine = await hit(env, { invitationId: PAYER, guestId: P.payer }, 'mine');
    assert.equal(mine.status, 200, JSON.stringify(mine.j)); assert.equal(mine.j.bookingConfirmation.state, 'NONE');
  });
});

test('ROUTE admin/owner-bookings · confirm is refused while an extra bed has no 009 row of its own, or a person\'s stay is booked elsewhere', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES.filter((r) => r[1] !== P.bed)), async () => {
    const rev = await recordFamily(env);
    const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(r.status, 409); assert.match(r.j.reasons[0], /^EXTRA_BED_UNPRICED: GT21/);
  });
  /* the sibling sent their own trip with the same stay: a double booking, named on the payer's record */
  const env2 = routeEnv({ ['reg:INV-' + P.sib]: { submissionId: 's1', version: 1, registration: { guestId: P.sib, selections: [{ id: 'wedstay', room: 'heritage-executive', qty: 1 }] } } });
  await withSheets(workbook(FAMILY_RATES), async () => {
    const rev = await recordFamily(env2);
    const r = await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(r.status, 409); assert.match(r.j.reasons.join(' '), /DOUBLE_BOOKING: GT20 already has the wedstay stay in INV-GT20's own sent trip/);
  });
  /* another payer records the same person for the same stay: both records name it */
  const env3 = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    await recordFamily(env3);
    const o = await hit(env3, GROOM, 'admin/owner-bookings', { holderId: 'INV-' + P.other, expectedRev: 0, action: 'add', entry: { personId: P.mum, itemId: 'T-EXEC', room: 'C' } });
    assert.equal(o.status, 200);
    const g = await hit(env3, GROOM, 'admin/owner-bookings?holder=' + PAYER);
    assert.match(g.j.problems.join(' '), /DOUBLE_BOOKING: GT96 already has the wedstay stay in the record of INV-GT50/);
    const g2 = await hit(env3, GROOM, 'admin/owner-bookings?holder=INV-' + P.other);
    assert.match(g2.j.problems.join(' '), /DOUBLE_BOOKING: GT96 already has the wedstay stay in the record of INV-GT32/);
  });
});

test('ROUTE admin/owner-bookings · only a Billing Admin records; a guest cannot read or write the Owners\' bookings', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    const guest = { invitationId: 'INV-' + P.sib, guestId: P.sib };
    assert.equal((await hit(env, guest, 'admin/owner-bookings?holder=' + PAYER)).status, 403);
    assert.equal((await hit(env, guest, 'admin/owner-bookings', { holderId: PAYER, expectedRev: 0, action: 'add', entry: { personId: P.sib, itemId: 'T-EXEC' } })).status, 403);
    assert.equal(env.REG_KV._m.has('obk:' + PAYER), false);
  });
});

test('OWNER BOOKINGS · review fixes: the extra bed needs the row the engine applies; a person no longer active and an unreadable record block', () => {
  let rec = OB.emptyRecord(); for (const [p, bed] of [[P.payer], [P.sib], [P.bed, true]]) rec = add(rec, p, 'T-EXEC', 'I', bed).record;
  const row = (o) => ({ Holder_ID: PAYER, Person_ID: P.bed, Item_ID: 'T-EXEC', Rate_Per_Person_Night: 75, Nights_Rule: '1', Rate_Status: 'ACTIVE', Approved_By: 'Synthetic Owner order', ...o });
  const base = { holderId: PAYER, rec, items: ITEMS, elsewhere: [], asOf: '2026-11-15' };
  assert.deepEqual(OB.problemsOf({ ...base, specialRates: [row()] }), []);
  assert.match(OB.problemsOf({ ...base, specialRates: [row({ Approved_By: '' })] })[0], /^EXTRA_BED_UNPRICED/, 'an unapproved row is one the engine skips');
  assert.match(OB.problemsOf({ ...base, specialRates: [row({ Effective_From: '2026-12-01' })] })[0], /^EXTRA_BED_UNPRICED/, 'a row not yet in effect');
  assert.match(OB.problemsOf({ ...base, specialRates: [row()], active: new Set([P.payer, P.sib]) }).join(' '), /PERSON_NOT_ACTIVE: GT21/);
  assert.match(OB.problemsOf({ ...base, specialRates: [row()], unreadable: ['the index of recorded persons'] })[0], /^OWNER_RECORD_UNREADABLE/);
});

test('ROUTE · the other way round: a guest whose own sent trip books a stay another payer recorded is stopped on their own statement too', async () => {
  const env = routeEnv({ ['reg:INV-' + P.sib]: { submissionId: 's1', version: 1, registration: { guestId: P.sib, selections: [{ id: 'wedstay', room: 'heritage-executive', qty: 1 }] } },
    ['conf:INV-' + P.sib]: { confirmedAt: '2026-11-15T09:00:00Z', version: 1, submissionId: 's1' } });
  await withSheets(workbook(FAMILY_RATES), async () => {
    await recordFamily(env);
    const r = await hit(env, GROOM, 'issue', { holderId: 'INV-' + P.sib, asOf: '2026-11-15' });
    assert.equal(r.status, 409); assert.match(r.j.reasons.join(' '), /OWNER_BOOKING · DOUBLE_BOOKING: GT20 has the wedstay stay in their own trip and in the record of INV-GT32/);
  });
});

test('ROUTE admin/owner-bookings · an unreadable index of recorded persons fails closed: confirm is refused', async () => {
  const env = routeEnv({ 'obk-index': '{not json' });
  await withSheets(workbook(FAMILY_RATES), async () => {
    const refused = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: 0, action: 'add', entry: { personId: P.mum, itemId: 'T-EXEC', room: 'A' } });
    assert.equal(refused.status, 503, 'an unreadable index is never overwritten'); assert.equal(env.REG_KV._m.has('obk:' + PAYER), false, 'nothing written');
    await env.REG_KV.put('obk-index', '{}');
    const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: 0, action: 'add', entry: { personId: P.mum, itemId: 'T-EXEC', room: 'A' } });
    assert.equal(r.status, 200);
    await env.REG_KV.put('obk-index', '{not json');
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: r.j.rev, action: 'confirm' });
    assert.equal(c.status, 409); assert.match(c.j.reasons[0], /^OWNER_RECORD_UNREADABLE/);
  });
});
