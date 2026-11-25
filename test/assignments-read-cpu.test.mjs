/* ============================================================================
   HS-032 · THE OWNERS' READ OF SEATING & ROOM ASSIGNMENTS, LIGHTER (Owners, 24 Nov 2026 — "SEPARATE PRIORITY — HS-032").
   GET admin/assignments answered 503 "Worker exceeded resource limits" on the Free plan. The smallest correction keeps every
   answer and every rule as it was:
     · the read never wakes the ICU collator (~5 ms CPU on a cold isolate): the roster comes in guest-id order, the console
       orders it by name with the collation the Worker used; the hotel's three-digit room numbers compare plainly;
     · a confirmation is read only where it decides the state (a trip sent and not declined) — the same states, fewer KV reads;
     · a complete read of 006 / 002 is used again for five minutes by the READ route only; a read with a gap is never kept.
   Fictional guests (G9xx) and a synthetic workbook only; nothing reaches a network.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { register } from 'node:module';

const AUTH_STUB = 'data:text/javascript,' + encodeURIComponent(`
export async function identify() { return globalThis.__cpuIdentity || null; }
export async function loadIndex() { return globalThis.__cpuIndex || {}; }
export function owns() { return true; }
export async function authIdOf() { return null; }
export function displayName(v) { return String(v || ''); }`);
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (context.parentURL && context.parentURL.endsWith('/src/billing-routes.js') && specifier === './auth.js') return { url: ${JSON.stringify(AUTH_STUB)}, shortCircuit: true };
  return next(specifier, context);
}`));
const { handleBilling, forgetAssignmentSources, ASSIGNMENT_SOURCES_MS } = await import('../src/billing-routes.js');
const { rosterOf, bookingStateOf, confirmationDecides, byGuestId } = await import('../src/billing/assignments.js');
const { hotelRoomOf } = await import('../src/hotel-rooms.js');
const { Seating } = await import('../src/seating.js');
const { Rooms } = await import('../src/rooms.js');
const { doState, page, SUTHEP } = await import('./sandbox.mjs');

const two = (n) => String(n).padStart(2, '0');
const GRID = { ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) GRID.ceremony.rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1) })) });
for (const k of ['T', 'B']) for (let n = 1; n <= 26; n++) if (n !== 13) GRID.dinner.sides[k].push({ seatId: 'D-' + k + '-' + two(n) });
/* five fictional guests and the couple: Zoë (sent, confirmed), Ödön (sent, awaiting), Ada (not sent), Ben (declined), Émile (sent, confirmed) */
const INDEX = { a: { i: 'INV-G905', g: 'G905', p: 'INV-900', c: 'C905' }, b: { i: 'INV-G901', g: 'G901', p: 'INV-900', c: 'C901' }, c: { i: 'INV-G902', g: 'G902', p: 'INV-901', c: 'C902' },
  d: { i: 'INV-G903', g: 'G903', p: 'INV-902', c: 'C903' }, e: { i: 'INV-G904', g: 'G904', p: 'INV-903', c: 'C904' },
  f: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B', c: 'C048' }, h: { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G', c: 'C049' } };
const NAMES = { C905: ['Zoë', 'Example'], C901: ['Ödön', 'Ábel'], C902: ['Ada', 'Sample'], C903: ['Ben', 'sample'], C904: ['Émile', 'Être'], C048: ['Bride', 'Demo'], C049: ['Groom', 'Demo'] };
const GROOM = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
const sent = (g, scope) => ({ submissionId: 'S-' + g, version: 1, lastSentAt: '2026-11-01T10:00:00Z', registration: { guestRecord: { scope }, templeCeremony: { guests: [{ guestId: g, events: { vows: 'Joining', dinner: 'Joining' } }] } } });
const STORE = {
  'reg:INV-G905': sent('G905', { vientianeWedding: true }), 'conf:INV-G905': { confirmedAt: '2026-11-02T10:00:00Z', version: 1 },
  'reg:INV-G901': sent('G901', { vientianeWedding: true }),
  'conf:INV-G902': { confirmedAt: '2026-11-02T10:00:00Z' },                 /* a confirmation without a sent trip — never decides */
  'reg:INV-G903': sent('G903', { none: true }), 'conf:INV-G903': { confirmedAt: '2026-11-02T10:00:00Z', version: 1 },
  'reg:INV-G904': sent('G904', { vientianeWedding: true }), 'conf:INV-G904': { confirmedAt: '2026-11-02T10:00:00Z', version: 1 },
};
const KEYS = ['prewed/heritage', 'wedstay/heritage-executive', 'wedstay/souphattra-presidential'];
function workbook() {
  const items = [['PRE', 'prewed/heritage', '25.02.2027', '27.02.2027'], ['WED', 'wedstay/heritage-executive', '27.02.2027', '01.03.2027'], ['PRES', 'wedstay/souphattra-presidential', '27.02.2027', '01.03.2027']];
  const L = { Item_ID: (x) => x[0], Billing_Category: () => 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: () => 'ACTIVE', Effective_From: () => '', Effective_To: () => '', Rate_Basis: () => 'PER_PERSON_PER_NIGHT', Change_Cutoff: () => '', Cancellation_Cutoff: () => '', Standard_Rate: () => 99, Quota: () => 4, Quota_Unit: () => 'ROOM',
    Max_Pax: () => 2, Currency: () => 'USD', Site_Product_Key: (x) => x[1], 'Number of Nights': () => 2, Modifiers: () => '', Category: () => 'Stay', Package: () => 'P', 'Check In Date': (x) => x[2], 'Check Out Date': (x) => x[3],
    Name: (x) => 'Synthetic ' + x[0], Room: () => 'Room', 'Rooms available': () => 4 };
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...Object.entries(L).map(([label, f]) => [label, ...items.map(f)])],
    '006_Guestlist': [['ID', 'Firstname', 'Surname', 'Nickname', 'Nationality'], ...Object.entries(NAMES).map(([id, [f, l]]) => [id, f, l, '', 'Synthetica'])],
  };
}
const { privateKey: KEY_PEM } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
function kv(init) {
  const m = new Map(Object.entries(init || {}).map(([k, v]) => [k, JSON.stringify(v)])), gets = [];
  return { m, gets, get: async (k) => { gets.push(k); return m.has(k) ? m.get(k) : null; }, put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [], list_complete: true }) };
}
async function world() {
  const seats = new Seating(doState()), rooms = new Rooms(doState());
  await seats.fetch(new Request('https://seating/api/seating/config', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify(GRID) }));
  await rooms.storage.put('occ:' + KEYS[1] + '|A|G905', { invitationId: 'INV-G905', partyId: 'INV-900', name: 'Zoë', at: 'x' });
  await rooms.storage.put('occ:' + KEYS[1] + '|A|G901', { invitationId: 'INV-G901', partyId: 'INV-900', name: 'Ödön', at: 'x' });
  await rooms.storage.put('occ:' + KEYS[0] + '|A|G904', { invitationId: 'INV-G904', partyId: 'INV-903', name: 'Émile', at: 'x' });
  await rooms.storage.put('hotelrooms', { version: 1, at: '2026-11-19T00:00:00Z', by: 'GROOM', rooms: { [KEYS[2] + '|A']: ['211', '210'], [KEYS[1] + '|A']: ['203'] } });
  const env = { SHEETS_ID: 'synthetic-hs032', SHEETS_READ_RETRY_BASE_MS: '0', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'hs032@test.invalid', private_key: KEY_PEM, private_key_id: 'hs032' }),
    BILLING_LEDGER: { idFromName: () => 'x', get: () => ({ fetch: async () => Response.json({ ok: true }) }) }, REG_KV: kv(STORE),
    SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seats.fetch(r) }) },
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) } };
  return { env, deps: { cohortStale: () => {}, resetLocked: async () => false } };
}
/* Google as a synthetic workbook; `google: false` = out of reach */
async function hit(W, op, opts = {}) {
  globalThis.__cpuIdentity = GROOM; globalThis.__cpuIndex = INDEX;
  const url = new URL('https://stage.invalid/api/billing/' + op);
  const wb = workbook(), asked = [];
  const was = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const s = String(u && u.url ? u.url : u); asked.push(s);
    if (opts.google === false) return new Response('{}', { status: 503 });
    if (s.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(s)) return Response.json({ valueRanges: [...new URL(s).searchParams.getAll('ranges')].map((range) => ({ range, values: wb[range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'")] || [] })) });
    throw new Error('the test reached the network: ' + s.slice(0, 60));
  };
  try {
    const r = await handleBilling(new Request(url), W.env, url, {}, W.deps);
    return { status: r.status, j: await r.json(), sheets: asked.filter((x) => /values:batchGet/.test(x)).length };
  } finally { globalThis.fetch = was; }
}
const withoutAt = (j) => JSON.stringify({ ...j, at: null });

test('HS-032 · NO ICU ON THE READ: admin/assignments (and ?overview=1) never call localeCompare or an Intl collator', async () => {
  forgetAssignmentSources();
  const W = await world();
  const lc = String.prototype.localeCompare, Coll = Intl.Collator;
  let calls = 0;
  String.prototype.localeCompare = function () { calls += 1; return lc.apply(this, arguments); };
  Intl.Collator = function () { calls += 1; return new Coll(...arguments); };
  try {
    const a = await hit(W, 'admin/assignments'), b = await hit(W, 'admin/assignments?overview=1');
    assert.equal(a.status, 200, JSON.stringify(a.j).slice(0, 300)); assert.equal(b.status, 200);
    assert.deepEqual(a.j.gaps, [], 'Google read in full');
    assert.equal(calls, 0, 'no collator on the read path');
  } finally { String.prototype.localeCompare = lc; Intl.Collator = Coll; }
});

test('HS-032 · THE ROSTER comes in guest-id order — the same guests and fields as before; a suite reads "210 + 211" as before', async () => {
  forgetAssignmentSources();
  const W = await world();
  const r = await hit(W, 'admin/assignments');
  assert.deepEqual(r.j.roster.map((g) => g.guestId), ['G048', 'G049', 'G901', 'G902', 'G903', 'G904', 'G905']);
  assert.deepEqual(['G1000', 'G099', 'G100', 'G001'].sort(byGuestId), ['G001', 'G099', 'G100', 'G1000']);
  const zoe = r.j.roster.find((g) => g.guestId === 'G905');
  assert.deepEqual([zoe.first, zoe.last, zoe.booking, zoe.rooms[0].hotelRoom.display], ['Zoë', 'Example', 'CONFIRMED', '203']);
  assert.equal(hotelRoomOf(KEYS[2], 'A', { [KEYS[2] + '|A']: ['211', '210'] }).display, '210 + 211', 'the suite in number order');
});

test('HS-032 · A CONFIRMATION IS READ ONLY WHERE IT DECIDES — not for a trip never sent, not for a declined one; every state as before', async () => {
  forgetAssignmentSources();
  const W = await world();
  const r = await hit(W, 'admin/assignments');
  const confReads = W.env.REG_KV.gets.filter((k) => k.startsWith('conf:')).sort();
  assert.deepEqual(confReads, ['conf:INV-G901', 'conf:INV-G904', 'conf:INV-G905'], 'only the sent, not-declined trips');
  assert.equal(W.env.REG_KV.gets.filter((k) => k.startsWith('reg:')).length, 7, 'every trip read once');
  /* the states as the full read gives them (every confirmation read) */
  const recs = {}, confs = {};
  for (const e of Object.values(INDEX)) { recs[e.i] = STORE['reg:' + e.i] || null; confs[e.i] = STORE['conf:' + e.i] || null; }
  const full = Object.fromEntries(Object.values(INDEX).map((e) => [e.g, bookingStateOf(recs[e.i], confs[e.i])]));
  assert.deepEqual(Object.fromEntries(r.j.roster.map((g) => [g.guestId, g.booking])), full);
  assert.deepEqual([confirmationDecides(null), confirmationDecides({ submissionId: 'S' }), confirmationDecides({ submissionId: 'S', registration: { guestRecord: { scope: { none: true } } } })], [false, true, false]);
});

test('HS-032 · THE SOURCES KEPT FIVE MINUTES — the re-read after a change skips Google, answers the same, expires, never keeps a gap', async () => {
  forgetAssignmentSources();
  const W = await world();
  const realNow = Date.now; let now = realNow();
  Date.now = () => now;
  try {
    const first = await hit(W, 'admin/assignments');
    assert.equal(first.sheets, 1); assert.deepEqual(first.j.gaps, []);
    now += 60 * 1000;
    const again = await hit(W, 'admin/assignments');
    assert.equal(again.sheets, 0, 'kept: Google not asked again');
    assert.equal(withoutAt(again.j), withoutAt(first.j), 'the same answer');
    now += ASSIGNMENT_SOURCES_MS;
    const later = await hit(W, 'admin/assignments');
    assert.equal(later.sheets, 1, 'after five minutes Google is asked again');
    forgetAssignmentSources();
    const down = await hit(W, 'admin/assignments', { google: false });
    assert.equal(down.status, 200); assert.ok(down.j.gaps.length >= 1, 'Google out of reach is said');
    const back = await hit(W, 'admin/assignments');
    assert.equal(back.sheets, 1, 'a read with a gap was never kept');
    assert.equal(withoutAt(back.j), withoutAt(first.j));
  } finally { Date.now = realNow; forgetAssignmentSources(); }
});

test('HS-032 · THE CONSOLE ORDERS BY NAME — the roster the Worker sends in guest-id order shows as before (last, first, guest id; en collation), the hotel checks follow their guests', async () => {
  const roster = rosterOf({ entries: INDEX, register: Object.fromEntries(Object.entries(NAMES).map(([id, [f, l]]) => [id, { first: f, last: l, nick: '' }])), records: {}, confs: {}, seating: {}, rooms: {}, couple: null });
  const before = roster.slice().sort((a, b) => ((a.last || '') + ' ' + (a.first || '')).localeCompare((b.last || '') + ' ' + (b.first || '')) || a.guestId.localeCompare(b.guestId));
  const checks = [{ kind: 'NO_NUMBER', guestId: 'G905', key: KEYS[1], label: 'A' }, { kind: 'NO_NUMBER', guestId: 'G901', key: KEYS[1], label: 'A' }, { kind: 'ROOM_CHANGES', guestId: 'G901', from: '101', to: '203' }];
  const w = page({ path: 'admin/billing', modules: ['assets/admin-assign.js'], auth: SUTHEP, fetch: () => Promise.resolve({ ok: true, status: 200, json: async () => ({}) }) });
  const ext = w.SIYL_ADMIN_EXT;
  assert.ok(ext && typeof ext.init === 'function', 'the Seating & Rooms extension is there');
  let done; const drawn = new Promise((r) => { done = r; });
  ext.init({ api: () => Promise.resolve({ ok: true, status: 200, j: { ok: true, roster: roster.slice(), rooms: { hotelChecks: checks.slice() } } }), draw: () => { if (ext.state().phase === 'ready') done(); },
    when: (x) => x, revenue: () => null, revenuePhase: () => 'ready', loadRevenue: () => {} });
  ext.enter('seating');
  await drawn;
  const shown = ext.state().data;
  assert.deepEqual(shown.roster.map((g) => g.guestId), before.map((g) => g.guestId), 'the order the Worker gave before');
  assert.deepEqual(shown.rooms.hotelChecks.map((c) => c.guestId + ':' + c.kind), ['G901:NO_NUMBER', 'G901:ROOM_CHANGES', 'G905:NO_NUMBER'], 'checks in their guests\' order, each guest\'s own order kept');
});
