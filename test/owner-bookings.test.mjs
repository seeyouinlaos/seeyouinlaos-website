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
const { Rooms } = await import('../src/rooms.js');
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
const memKv = (o) => { const m = new Map(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])); const gets = [];
  return { gets, get: async (k) => { gets.push(k); return m.has(k) ? m.get(k) : null; }, put: async (k, v) => { m.set(k, String(v)); }, _m: m,
    list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: name.startsWith('conf:') ? { confirmedAt: '2026-11-15T09:00:00Z' } : undefined })), list_complete: true }) }; };

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
/* synthetic named rates (never the real 009 figures): a room rate and an extra-bed rate */
const RATE = 131, BED_RATE = 47;
const FAMILY_RATES = [R009(P.payer, RATE, 1), R009(P.sib, RATE, 1), R009(P.bed, BED_RATE, 1), R009(P.mum, RATE, 2), R009(P.dad, RATE, 2)];

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
    /* the real Rooms engine on its own in-memory storage: the reservation is the engine's, not a stub's */
    ROOMS: (() => { const rooms = new Rooms(doState()); return { idFromName: () => 'rooms', get: () => ({ fetch: (req) => rooms.fetch(req) }), _rooms: rooms }; })() };
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
  assert.equal(roomA, 2 * RATE * 2); assert.equal(roomB, 2 * RATE + BED_RATE); assert.equal(res.totalPayableCents / 100, roomA + roomB);
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
  const row = (o) => ({ Holder_ID: PAYER, Person_ID: P.bed, Item_ID: 'T-EXEC', Rate_Per_Person_Night: BED_RATE, Nights_Rule: '1', Rate_Status: 'ACTIVE', Approved_By: 'Synthetic Owner order', ...o });
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

/* the Rooms engine as a guest would ask it: join a unit in their own name */
const join = (env, guestId, label) => env.ROOMS.get().fetch(new Request('https://rooms/api/rooms/join', { method: 'POST',
  headers: { 'x-siyl-identity': JSON.stringify({ invitationId: 'INV-' + guestId, guestId, firstName: 'Synth' }), 'content-type': 'application/json' },
  body: JSON.stringify({ invitationId: 'INV-' + guestId, guestId, key: 'wedstay/heritage-executive', label, need: 1 }) })).then((r) => r.json());
const unitOcc = async (env, label) => (await env.ROOMS.get().fetch(new Request('https://rooms/api/rooms/plan', { headers: { 'x-gr-verified': 'yes' } })).then((r) => r.json()))
  .units['wedstay/heritage-executive'].find((u) => u.label === label).occupants.map((o) => o.guestId).sort();

test('ROOMS · confirming the Owners\' bookings RESERVES the real units: the room\'s own places, the extra bed beyond them, nothing left for anyone else', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    /* the payer already holds a place in unit I from her own draft (as live) — it is hers, not a stranger's */
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    for (const [personId, room, extraBed] of [[P.mum, 'A'], [P.dad, 'A'], [P.payer, 'I'], [P.sib, 'I'], [P.bed, 'I', true]]) {
      const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } }); rev = r.j.rev;
    }
    const g = await hit(env, GROOM, 'admin/owner-bookings?holder=' + PAYER);
    const unitsNow = g.j.units['wedstay/heritage-executive'];
    assert.equal(unitsNow.find((u) => u.label === 'I').free, 1, 'before the confirmation: one place of I is still free'); assert.equal(unitsNow.find((u) => u.label === 'A').free, 2);
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    assert.deepEqual(await unitOcc(env, 'I'), [P.sib, P.bed, P.payer].sort(), 'unit I: the three, the extra bed beyond its two places');
    assert.deepEqual(await unitOcc(env, 'A'), [P.mum, P.dad].sort());
    const stranger = await join(env, P.other, 'I');
    assert.equal(stranger.ok, false); assert.equal(stranger.error, 'full', 'no place of unit I is offered to another guest');
    assert.equal((await join(env, P.other, 'A')).error, 'full');
    const after = (await hit(env, GROOM, 'admin/owner-bookings?holder=' + PAYER)).j;
    assert.equal(after.units['wedstay/heritage-executive'].find((u) => u.label === 'I').free, 0);
    assert.ok(after.entries.every((e) => e.held || !e.room), 'every room entry carries the place it holds');
    /* removing a held entry gives that place back */
    const rm = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: after.rev, action: 'remove', entryId: after.entries.find((e) => e.personId === P.dad).id });
    assert.equal(rm.status, 200); assert.deepEqual(await unitOcc(env, 'A'), [P.mum]);
  });
});

test('ROOMS · a unit another guest already holds is refused at confirmation — nothing confirmed, nothing held', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    assert.equal((await join(env, P.other, 'B')).ok, true);
    let rev = 0;
    for (const p of [P.mum, P.dad]) rev = (await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId: p, itemId: 'T-EXEC', room: 'B' } })).j.rev;
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 409); assert.match(c.j.reasons[0], /^ROOM_TAKEN: wedstay\/heritage-executive · B/);
    assert.deepEqual(await unitOcc(env, 'B'), [P.other]);
    assert.equal((await hit(env, GROOM, 'admin/owner-bookings?holder=' + PAYER)).j.state, 'RECORDED');
    const z = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId: P.sib, itemId: 'T-EXEC', room: 'Z' } });
    assert.equal(z.status, 200);
    const c2 = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: z.j.rev, action: 'confirm' });
    assert.equal(c2.status, 409);
  });
});

test('ROOMS · the payer keeps her own place in the room and the Owners record the others into it: her place is this booking\'s, not another guest\'s (17 Nov 2026)', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    /* as live: the payer holds a place in unit I through her own selection and is NOT recorded by the Owners */
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    for (const [personId, room, extraBed] of [[P.mum, 'A'], [P.dad, 'A'], [P.sib, 'I'], [P.bed, 'I', true]]) {
      const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } });
      assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev;
    }
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 200, JSON.stringify(c.j)); assert.equal(c.j.state, 'CONFIRMED');
    assert.deepEqual(await unitOcc(env, 'I'), [P.sib, P.bed, P.payer].sort(), 'unit I: the payer\'s own place, the second place, the extra bed');
    assert.deepEqual(await unitOcc(env, 'A'), [P.mum, P.dad].sort());
    assert.equal((await join(env, P.other, 'I')).error, 'full', 'nothing of unit I is left for anyone else');
  });
});

test('ROOMS · the payer\'s own place counts in the room: two more persons in its own places are refused — nothing confirmed, nothing held', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    for (const p of [P.sib, P.mum]) {
      const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId: p, itemId: 'T-EXEC', room: 'I' } });
      assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev;
    }
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 409); assert.match(c.j.reasons[0], /^ROOM_OVER_CAPACITY: wedstay\/heritage-executive · I/);
    assert.deepEqual(await unitOcc(env, 'I'), [P.payer], 'nothing was held');
    assert.equal((await hit(env, GROOM, 'admin/owner-bookings?holder=' + PAYER)).j.state, 'RECORDED');
    /* a stranger's place is still another guest's, payer or not */
    const env2 = routeEnv();
    assert.equal((await join(env2, P.other, 'I')).ok, true);
    let r2 = 0;
    r2 = (await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: r2, action: 'add', entry: { personId: P.sib, itemId: 'T-EXEC', room: 'I' } })).j.rev;
    const c2 = await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: r2, action: 'confirm' });
    assert.equal(c2.status, 409); assert.match(c2.j.reasons[0], /^ROOM_TAKEN: wedstay\/heritage-executive · I/);
    assert.deepEqual(await unitOcc(env2, 'I'), [P.other], 'the stranger keeps the place, nobody was added');
  });
});

test('ROOMS · the payer\'s own place counts per unit — an entry of hers in another room never hides it; removing others never releases it (review, 17 Nov 2026)', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    /* the payer recorded into ANOTHER room (A); two persons in I's own places and the extra bed: her place in I still counts */
    for (const [personId, room, extraBed] of [[P.payer, 'A'], [P.sib, 'I'], [P.mum, 'I'], [P.bed, 'I', true]]) {
      const r = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } });
      assert.equal(r.status, 200, JSON.stringify(r.j)); rev = r.j.rev;
    }
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 409, 'refused before anything is held'); assert.match(c.j.reasons[0], /^ROOM_OVER_CAPACITY: wedstay\/heritage-executive · I/);
    assert.deepEqual(await unitOcc(env, 'I'), [P.payer]); assert.deepEqual(await unitOcc(env, 'A'), [], 'nothing held anywhere');
    /* the family as the payer keeps her own place: confirmed; then removing the sibling gives back only the sibling's place */
    const env2 = routeEnv();
    assert.equal((await join(env2, P.payer, 'I')).ok, true);
    let r2 = 0;
    for (const [personId, room, extraBed] of [[P.sib, 'I'], [P.bed, 'I', true]]) {
      const r = await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: r2, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } });
      assert.equal(r.status, 200, JSON.stringify(r.j)); r2 = r.j.rev;
    }
    const ok = await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: r2, action: 'confirm' });
    assert.equal(ok.status, 200, JSON.stringify(ok.j));
    const now = (await hit(env2, GROOM, 'admin/owner-bookings?holder=' + PAYER)).j;
    const rm = await hit(env2, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: now.rev, action: 'remove', entryId: now.entries.find((e) => e.personId === P.sib).id });
    assert.equal(rm.status, 200);
    assert.deepEqual(await unitOcc(env2, 'I'), [P.bed, P.payer].sort(), 'the payer\'s own place stays — only the sibling\'s was given back');
  });
});

test('ISSUE · an extra bed a guest booked themselves is priced only by their own 009 row: beyond a room\'s own places, a person without one is named and Issue waits (pricing guard C2)', async () => {
  /* three sent and confirmed trips in Room I of the wedding stay (the seed gives that room an extra bed); two of them have their own 009 row */
  const kv = {};
  for (const g of [P.payer, P.sib, P.bed]) {
    kv['reg:INV-' + g] = { submissionId: 's-' + g, version: 1, registration: { guestId: g, selections: [{ id: 'wedstay', room: 'heritage-executive', qty: 1 }] } };
    kv['conf:INV-' + g] = { confirmedAt: '2026-11-15T09:00:00Z', version: 1, submissionId: 's-' + g };
  }
  const env = routeEnv(kv);
  await withSheets(workbook([R009(P.payer, RATE, 1), R009(P.sib, RATE, 1)]), async () => {
    const assign = (occupants) => env.ROOMS.get().fetch(new Request('https://rooms/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants, force: true }) })).then((r) => r.json());
    assert.equal((await assign([P.payer, P.sib, P.bed].map((g) => ({ key: 'wedstay/heritage-executive', label: 'I', guestId: g, invitationId: 'INV-' + g })))).ok, true);
    const third = await hit(env, GROOM, 'admin/holder?holder=INV-' + P.bed);
    assert.equal(third.status, 200, JSON.stringify(third.j));
    assert.ok(third.j.preview.reasons.some((r) => /^EXTRA_BED_UNPRICED: GT21 is in room I of T-EXEC, which holds 3 for its 2 places — no approved 009 row of their own is in effect$/.test(r)), JSON.stringify(third.j.preview.reasons));
    assert.equal(third.j.preview.issuable, false);
    /* a person of the same room WITH their own row is not named; nothing about who is "on the bed" is decided */
    const first = await hit(env, GROOM, 'admin/holder?holder=INV-' + P.payer);
    assert.ok(!first.j.preview.reasons.some((r) => /^EXTRA_BED_/.test(r)), JSON.stringify(first.j.preview.reasons));
    /* two in the room: no extra bed in use, nobody named */
    await env.ROOMS.get().fetch(new Request('https://rooms/api/rooms/unassign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ guestId: P.sib, key: 'wedstay/heritage-executive' }) }));
    const again = await hit(env, GROOM, 'admin/holder?holder=INV-' + P.bed);
    assert.ok(!again.j.preview.reasons.some((r) => /^EXTRA_BED_/.test(r)), JSON.stringify(again.j.preview.reasons));
  });
});

test('ISSUE · the extra-bed check holds up only who may be on the bed: a guest the seed does not name, on a regular place beside two it names, is never named; an unreadable room list is named, never passed (review, 17 Nov 2026)', async () => {
  const KEY = 'wedstay/heritage-executive';
  const kv = { ['reg:INV-' + P.other]: { submissionId: 's-o', version: 1, registration: { guestId: P.other, selections: [{ id: 'wedstay', room: 'heritage-executive', unit: 'I', qty: 1 }] } },
    ['conf:INV-' + P.other]: { confirmedAt: '2026-11-15T09:00:00Z', version: 1, submissionId: 's-o' } };
  const env = routeEnv(kv);
  await withSheets(workbook([]), async () => {
    /* he takes a regular place first; two of the guest ids the seed names follow — the second of them on the bed (no force) */
    const assign = (occupants) => env.ROOMS.get().fetch(new Request('https://rooms/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants }) })).then((r) => r.json());
    const a = await assign([P.other, 'G032', 'G120'].map((g) => ({ key: KEY, label: 'I', guestId: g, invitationId: 'INV-' + g })));
    assert.equal(a.ok, true, JSON.stringify(a));
    const s = await hit(env, GROOM, 'admin/holder?holder=INV-' + P.other);
    assert.equal(s.status, 200, JSON.stringify(s.j));
    assert.ok(!s.j.preview.reasons.some((r) => /^EXTRA_BED_/.test(r)), 'a regular place is never held up by a bed that is not his: ' + JSON.stringify(s.j.preview.reasons));
    /* the room list without this room: named, never passed */
    const real = env.ROOMS.get;
    env.ROOMS.get = () => ({ fetch: (req) => (new URL(req.url).pathname.endsWith('/plan') ? new Response(JSON.stringify({ ok: true, units: {} }), { headers: { 'content-type': 'application/json' } }) : real().fetch(req)) });
    try {
      const u = await hit(env, GROOM, 'admin/holder?holder=INV-' + P.other);
      assert.ok(u.j.preview.reasons.some((r) => /^EXTRA_BED_UNCHECKED: room I of T-EXEC is not in the room list just now/.test(r)), JSON.stringify(u.j.preview.reasons));
      assert.equal(u.j.preview.issuable, false);
    } finally { env.ROOMS.get = real; }
  });
});

test('OWNER BOOKINGS · the temple offering is one product per person: a guest\'s own sent offering and the Owners\' entry are a double booking', () => {
  assert.equal(OB.keyStage('sangkhathan'), 'sangkhathan'); assert.equal(OB.keyStage('wedstay/heritage-executive'), 'wedstay');
  const items = { ...ITEMS, 'T-TEMPLE': { Item_ID: 'T-TEMPLE', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 15, Site_Product_Key: 'sangkhathan' } };
  let rec = OB.emptyRecord(); rec = OB.applyAction(rec, 'add', { entry: { personId: P.payer, itemId: 'T-TEMPLE' }, items, persons }).record;
  assert.deepEqual(OB.holdPlan(rec, items), [], 'a product without a unit holds no room');
  assert.match(OB.problemsOf({ holderId: PAYER, rec, items, specialRates: [], elsewhere: [{ personId: P.payer, stage: 'sangkhathan', by: 'x' }], asOf: '2026-11-15' })[0], /^DOUBLE_BOOKING: GT32 already has the sangkhathan stay/);
});

test('ROOMS · after a change the Owners confirm again: the places already held stay, only what is missing is asked (review, 15 Nov 2026)', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    for (const [personId, room, extraBed] of [[P.payer, 'I'], [P.sib, 'I'], [P.bed, 'I', true]]) rev = (await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } })).j.rev;
    const c1 = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c1.status, 200, JSON.stringify(c1.j));
    /* a later addition (the parents) and a second confirmation */
    rev = c1.j.rev;
    for (const p of [P.mum, P.dad]) rev = (await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId: p, itemId: 'T-EXEC', room: 'A' } })).j.rev;
    const c2 = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c2.status, 200, JSON.stringify(c2.j)); assert.equal(c2.j.state, 'CONFIRMED');
    assert.deepEqual(await unitOcc(env, 'I'), [P.sib, P.bed, P.payer].sort(), 'unit I unchanged'); assert.deepEqual(await unitOcc(env, 'A'), [P.mum, P.dad].sort());
    /* confirming the same revision twice changes nothing */
    assert.equal((await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: c2.j.rev, action: 'confirm' })).status, 200);
  });
});


test('REVENUE · the Owners\' confirmed rooms join the Revenue overview: booked by room and category, the extra bed, nothing invoiced yet; an unconfirmed record does not count', async () => {
  const env = routeEnv();
  await withSheets(workbook(FAMILY_RATES), async () => {
    assert.equal((await join(env, P.payer, 'I')).ok, true);
    let rev = 0;
    for (const [personId, room, extraBed] of [[P.mum, 'E'], [P.dad, 'E'], [P.payer, 'I'], [P.sib, 'I'], [P.bed, 'I', true]]) rev = (await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'add', entry: { personId, itemId: 'T-EXEC', room, extraBed: !!extraBed } })).j.rev;
    /* recorded, not confirmed: in the population, nothing booked */
    let r = await hit(env, GROOM, 'revenue');
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    assert.equal(r.j.population.withOwnerBookings, 1); assert.equal(r.j.bookedRevenue.cents, 0, 'an unconfirmed record books nothing');
    const c = await hit(env, GROOM, 'admin/owner-bookings', { holderId: PAYER, expectedRev: rev, action: 'confirm' });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    env.REG_KV.gets.length = 0;
    r = await hit(env, GROOM, 'revenue');
    const exp = FAMILY_RATES.reduce((t, x) => t + x[3] * Number(x[4]), 0) * 100;
    assert.equal(r.j.bookedRevenue.cents, exp); assert.equal(r.j.bookedRevenue.complete, true); assert.equal(r.j.notYetInvoiced.cents, exp);
    assert.equal(r.j.issuedRevenue.cents, 0); assert.equal(r.j.outstanding.cents, 0, 'nothing invoiced, nothing receivable');
    const unit = (u) => r.j.breakdown.roomsByUnit.find((x) => x.Room_Unit_ID === 'RU·T-EXEC·' + u);
    assert.equal(unit('E').cents, 2 * RATE * 2 * 100); assert.equal(unit('E').places, 2);
    assert.equal(unit('I').cents, (2 * RATE + BED_RATE) * 100); assert.equal(unit('I').places, 3); assert.equal(unit('I').extraBeds, 1);
    assert.equal(r.j.breakdown.reconciled, true); assert.equal(r.j.breakdown.roomsTotal.cents, exp);
    assert.deepEqual(r.j.holders.find((h) => h.Holder_ID === PAYER).bookedFrom, ['recorded by the Owners']);
    /* the KV budget: each key read once in the request */
    assert.equal(new Set(env.REG_KV.gets).size, env.REG_KV.gets.length, 'every key read once: ' + env.REG_KV.gets.join(','));
  });
});
