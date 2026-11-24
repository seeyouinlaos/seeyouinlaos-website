/* ============================================================================
   HS-059 · GUEST ARRIVALS & TRANSPORTATION (Owners, 24 Nov 2026) — Section F on its own light read.
     · the Worker's half (src/billing/arrivals.js + GET admin/arrivals): the base (guests, room plan, 002, 012, the Owners' records)
       and the facts of at most 12 sent trips per request — admin only, name-free, ONE Google read of 002 + 012, no 006, no seating
     · the console's half (assets/arrivals-model.js): every known guest once; nights only where a source places a guest; the
       train night; "accommodation not recorded" between two dated facts at the same place; 012 against the plan by HOTEL ROOM
       NUMBER and night; every count = the length of its list
   FICTIONAL guests (G9xx) and a synthetic workbook only. Nothing reaches a network.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { register } from 'node:module';

const AUTH_STUB = 'data:text/javascript,' + encodeURIComponent(`
export async function identify() { return globalThis.__arvIdentity || null; }
export async function loadIndex() { return globalThis.__arvIndex || {}; }
export function owns() { return true; }
export async function authIdOf() { return null; }
export function displayName(v) { return String(v || ''); }`);
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (context.parentURL && context.parentURL.endsWith('/src/billing-routes.js') && specifier === './auth.js') return { url: ${JSON.stringify(AUTH_STUB)}, shortCircuit: true };
  return next(specifier, context);
}`));
const { handleBilling, forgetArrivalSources, ARRIVAL_SOURCES_MS } = await import('../src/billing-routes.js');
const { factsOf, planOf, list012Of, arrivalsBase, confirmationNeeded, ARRIVAL_FACTS_MAX } = await import('../src/billing/arrivals.js');
const { Rooms } = await import('../src/rooms.js');
const { doState, page, SUTHEP } = await import('./sandbox.mjs');

/* ------------------------------------------------------------ the fictional world */
const K = { bkk: 'bkk-stay/u-sathorn-superior-garden', pre: 'prewed/heritage', preX: 'prewed/heritage-executive', pres: 'prewed/souphattra-presidential', wed: 'wedstay/heritage', wedX: 'wedstay/heritage-executive', wpres: 'wedstay/souphattra-presidential', gh: 'guesthouse/guest-house' };
const ITEMS = [['A2', K.bkk, '21.02.2027', '24.02.2027', 3], ['B', 'train', '24.02.2027', '25.02.2027', 1], ['C1', K.pre, '25.02.2027', '27.02.2027', 2], ['C2', K.preX, '25.02.2027', '27.02.2027', 2],
  ['C3', K.pres, '25.02.2027', '27.02.2027', 2], ['D1', K.wed, '27.02.2027', '01.03.2027', 2], ['D2', K.wedX, '27.02.2027', '01.03.2027', 2], ['D3', K.wpres, '27.02.2027', '01.03.2027', 2], ['D4', K.gh, '27.02.2027', '01.03.2027', 2],
  ['E2', 'mu9646', '01.03.2027', '01.03.2027', 0]];
function workbook() {
  const L = { Item_ID: (x) => x[0], Billing_Category: () => 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: () => 'ACTIVE', Effective_From: () => '', Effective_To: () => '', Rate_Basis: () => 'PER_PERSON_PER_NIGHT',
    Standard_Rate: () => 99, Quota: () => 4, Quota_Unit: () => 'ROOM', Max_Pax: () => 2, Change_Cutoff: () => '', Cancellation_Cutoff: () => '', Currency: () => 'USD', Site_Product_Key: (x) => x[1],
    'Number of Nights': (x) => x[4], Modifiers: () => '', Category: () => 'Stay', Package: () => 'P', 'Check In Date': (x) => x[2], 'Check Out Date': (x) => x[3], Name: (x) => 'Synthetic ' + x[0], Room: () => 'Room', 'Rooms available': () => 4 };
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...Object.entries(L).map(([label, f]) => [label, ...ITEMS.map(f)])],
    '012_Room Number and Rate List': [['Building', 'Room Type', 'Rm No.', 'Check In Date', 'Check Out Date', 'Guest 01', 'Guest 02'],
      ['C', 'The Heritage', '202', '25.02.2027', '01.03.2027', 'Synthetic Typed-Four', ''],          /* 012 from 25 Feb; the plan from 27 Feb */
      ['C', 'Heritage Executive', '203', '25.02.2027', '01.03.2027', 'Synthetic Typed-Seven', ''],    /* agrees */
      ['F', 'Souphattra Presidential', '210 / 211', '25.02.2027', '01.03.2027', 'Synthetic Bride', 'Synthetic Groom'],
      ['C', 'Heritage Executive', '204', '25.02.2027', '01.03.2027', 'Synthetic A', 'Synthetic B'],
      ['C', 'The Heritage', '102', '', '01.03.2027', '', '']],                                         /* a free room */
    '006_Guestlist': [['ID', 'Firstname', 'Surname']], '009_Special_Rates': [['Holder_ID']],
  };
}
const INDEX = {};
const G = (g, p, extra) => { INDEX['k' + g] = { i: 'INV-' + g, g, p: 'INV-' + p, c: 'C' + g, ...(extra || {}) }; };
G('G048', '001', { h: 1, r: 'B' }); G('G049', '001', { h: 1, r: 'G' });
['G901', 'G902'].forEach((g) => G(g, '901')); G('G903', '903'); G('G904', '904'); ['G905', 'G906'].forEach((g) => G(g, '905')); G('G907', '907');
G('G908', '908'); G('G909', '909'); G('G910', '910'); G('G911', '911'); G('G912', '912');
INDEX.amb1 = { i: 'INV-G913', g: 'G913', p: 'INV-913' }; INDEX.amb2 = { i: 'INV-G999', g: 'G913', p: 'INV-999' };   /* one id on two invitations */
const sent = (g, { scope, legs = [], stays = [], flight, version = 1 } = {}) => ({ submissionId: 'S-' + g, version, lastSentAt: '2026-11-01T10:00:00Z',
  registration: { guestRecord: { scope: scope || { bangkok: true, vientianePreWedding: true, vientianeWedding: true } }, stages: { prewed: 'selected' },
    selections: [...legs.map((id) => ({ id })), ...stays.map((id) => ({ id })), { id: 'spa', interest: true }, { id: '1872', request: true }],
    documents: { guests: [{ documents: [{ kind: 'flight', state: flight ? 'received' : 'none', filename: 'secret-file.pdf' }] }] } } });
const conf = (v) => ({ confirmedAt: '2026-11-02T10:00:00Z', version: v || 1, submissionId: null });
const STORE = {
  'reg:INV-G901': sent('G901', { legs: ['train'], stays: ['bkk-stay', 'prewed', 'wedstay'], flight: true }), 'conf:INV-G901': conf(),
  'reg:INV-G902': sent('G902', { legs: ['train'], stays: ['bkk-stay', 'prewed', 'wedstay'] }), 'conf:INV-G902': conf(),
  'reg:INV-G903': sent('G903', { legs: ['train'], stays: ['guesthouse'] }), 'conf:INV-G903': conf(),                       /* train, room only from 27 Feb */
  'reg:INV-G904': sent('G904', { legs: ['train'], stays: ['wedstay'] }), 'conf:INV-G904': conf(),                          /* the same, 012 says from 25 Feb */
  'reg:INV-G905': sent('G905', { legs: ['train'], stays: ['prewed', 'wedstay'] }),                                         /* awaiting */
  'reg:INV-G906': sent('G906', { legs: ['train'], stays: ['prewed', 'wedstay'] }), 'conf:INV-G906': conf(),                /* confirmed, same room */
  'reg:INV-G907': sent('G907', { scope: { vientiane: true }, stays: ['prewed', 'wedstay'] }), 'conf:INV-G907': conf(),     /* a legacy scope, no train */
  'reg:INV-G909': sent('G909', { scope: { none: true } }), 'conf:INV-G909': conf(),                                       /* declined: conf never read */
  'reg:INV-G910': sent('G910', { scope: { vientianeWedding: true } }), 'conf:INV-G910': conf(),                           /* joining, nothing booked */
  'conf:INV-G908': conf(),                                                                                                   /* never sent: conf never read */
  'obk-index': { G911: ['INV-G048'] },
  'obk:INV-G048': { rev: 2, nextId: 3, entries: [{ id: 1, personId: 'G911', itemId: 'D1' }, { id: 2, personId: 'G911', itemId: 'B' }], confirmed: { rev: 2, by: 'BRIDE', at: 'x' }, log: [] },
};
async function rooms() {
  const r = new Rooms(doState());
  const put = (key, label, g, extra) => r.storage.put('occ:' + key + '|' + label + '|' + g, { invitationId: 'INV-' + g, partyId: 'P', name: 'Synthetic ' + g, at: 'x', ...(extra || {}) });
  await put(K.bkk, 'A', 'G048'); await put(K.bkk, 'A', 'G049'); await put(K.bkk, 'B', 'G901'); await put(K.bkk, 'B', 'G902');
  await put(K.pres, 'A', 'G048'); await put(K.pres, 'A', 'G049'); await put(K.wpres, 'A', 'G048'); await put(K.wpres, 'A', 'G049');
  await put(K.pre, 'A', 'G901'); await put(K.pre, 'A', 'G902'); await put(K.wed, 'A', 'G901'); await put(K.wed, 'A', 'G902');
  await put(K.gh, 'A', 'G903');
  await put(K.wed, 'C', 'G904');
  await put(K.preX, 'G', 'G905'); await put(K.preX, 'G', 'G906'); await put(K.wedX, 'G', 'G905'); await put(K.wedX, 'G', 'G906');
  await put(K.preX, 'F', 'G907'); await put(K.wedX, 'F', 'G907');
  await put(K.wedX, 'H', 'G911'); await put(K.wedX, 'I', 'G912');
  await put(K.wed, 'D', '~INV-950~1', { placeholder: true });   /* a kept place: nobody */
  await r.storage.put('hotelrooms', { version: 1, at: 'x', by: 'GROOM', rooms: { [K.wed + '|C']: ['202'], [K.preX + '|F']: ['203'], [K.wedX + '|F']: ['203'], [K.preX + '|G']: ['204'], [K.wedX + '|G']: ['204'],
    [K.pres + '|A']: ['211', '210'], [K.wpres + '|A']: ['210', '211'], [K.pre + '|C']: ['202'] } });
  return r;
}
function kv(init) { const m = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)])), gets = []; return { m, gets, get: async (k) => { gets.push(k); return m.has(k) ? m.get(k) : null; }, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [], list_complete: true }) }; }
const { privateKey: KEY_PEM } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
async function world() {
  const R = await rooms(), asked = [];
  const env = { SHEETS_ID: 'synthetic-hs059', SHEETS_READ_RETRY_BASE_MS: '0', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'hs059@test.invalid', private_key: KEY_PEM, private_key_id: 'hs059' }),
    REG_KV: kv(STORE), ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (q) => { asked.push(new URL(q.url).pathname); return R.fetch(q); } }) },
    SEATING: { idFromName: () => 's', get: () => ({ fetch: async (q) => { asked.push(new URL(q.url).pathname); return Response.json({ ok: true }); } }) },
    BILLING_LEDGER: { idFromName: () => 'b', get: () => ({ fetch: async (q) => { asked.push(new URL(q.url).pathname); return Response.json({ ok: true }); } }) } };
  return { env, asked, deps: { cohortStale: () => {}, resetLocked: async () => false } };
}
const OWNER = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
async function hit(W, op, opts = {}) {
  globalThis.__arvIdentity = opts.who || OWNER; globalThis.__arvIndex = INDEX;
  const url = new URL('https://stage.invalid/api/billing/' + op), wb = workbook(), sheets = [];
  const was = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const s = String(u && u.url ? u.url : u);
    if (opts.google === false) return new Response('{}', { status: 503 });
    if (s.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(s)) { const ranges = [...new URL(s).searchParams.getAll('ranges')]; sheets.push(ranges); return Response.json({ valueRanges: ranges.map((range) => ({ range, values: wb[range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'")] || [] })) }); }
    throw new Error('the test reached the network: ' + s.slice(0, 60));
  };
  try { const r = await handleBilling(new Request(url), W.env, url, {}, W.deps); return { status: r.status, j: await r.json(), sheets }; } finally { globalThis.fetch = was; }
}
/* the whole read as the console does it: the base, then the facts in parts */
async function readAll(W) {
  const b = await hit(W, 'admin/arrivals'); assert.equal(b.status, 200, JSON.stringify(b.j).slice(0, 300));
  const facts = {}, invs = b.j.guests.map((g) => g.invitationId);
  for (let i = 0; i < invs.length; i += b.j.factsMax) { const f = await hit(W, 'admin/arrivals?facts=' + invs.slice(i, i + b.j.factsMax).join(',')); assert.equal(f.status, 200); Object.assign(facts, f.j.facts); }
  return { base: b.j, facts, sheets: b.sheets };
}
function model(base, facts) { const w = page({ path: 'admin/billing', modules: ['assets/arrivals-model.js'], auth: SUTHEP, fetch: () => Promise.reject(new Error('no network')) }); return JSON.parse(JSON.stringify(w.SIYL_ARRIVALS.assemble(base, facts))); }   /* out of the page's realm */

/* ------------------------------------------------------------ the Worker's half */
test('HS-059 · ADMIN ONLY — a guest gets 403 and no engine, store or Google is asked', async () => {
  forgetArrivalSources();
  const W = await world();
  for (const op of ['admin/arrivals', 'admin/arrivals?facts=INV-G901']) { const r = await hit(W, op, { who: { invitationId: 'INV-G901', guestId: 'G901' } }); assert.equal(r.status, 403, op); assert.equal(r.sheets.length, 0); }
  assert.deepEqual(W.asked, []); assert.deepEqual(W.env.REG_KV.gets, []);
});

test('HS-059 · THE BASE — one Google read of exactly 002 + 012, the Rooms plan only, no trip, no seating, no 006; name-free but for 012\'s typed names', async () => {
  forgetArrivalSources();
  const W = await world();
  const r = await hit(W, 'admin/arrivals');
  assert.equal(r.status, 200);
  assert.deepEqual(r.sheets, [["'002_Accommodation_Details'!A1:AZ", "'012_Room Number and Rate List'!A1:AZ"]], 'one batch: 002 and 012');
  assert.deepEqual(W.asked, ['/api/rooms/plan'], 'the room plan only — no seating ledger, no billing ledger');
  assert.deepEqual(W.env.REG_KV.gets.sort(), ['obk-index', 'obk:INV-G048'], 'no sent trip in the base');
  const text = JSON.stringify(r.j);
  assert.ok(!/Synthetic G9|secret-file/.test(text), 'no occupant name, no file name');
  assert.deepEqual(r.j.list012.map((x) => x.typed.length), [1, 1, 2, 2], 'only 012 typed names, free rooms left out');
  assert.ok(!r.j.plan.units.some((u) => u.occupants.some((o) => !/^G\d{3,}$/.test(o.guestId))), 'a kept place is nobody');
  assert.equal(r.j.plan.units.find((u) => u.key === K.wed && u.label === 'D').kept, 1);
  assert.deepEqual(r.j.ambiguous, ['G913']); assert.ok(!r.j.guests.some((g) => g.guestId === 'G913'));
  assert.deepEqual(r.j.owner.G911.map((x) => x.key + ':' + x.state), [K.wed + ':CONFIRMED', 'train:CONFIRMED'], 'the Owners\' record, keyed by 002');
  assert.equal(r.j.dates.train.checkIn, '2027-02-24'); assert.equal(r.j.dates.train.checkOut, '2027-02-25');
  assert.equal(r.j.factsMax, ARRIVAL_FACTS_MAX);
});

test('HS-059 · THE FACTS — at most 12 invitations of the register; a confirmation read only where it decides; nothing of the trip but its facts', async () => {
  forgetArrivalSources();
  const W = await world();
  assert.equal((await hit(W, 'admin/arrivals?facts=INV-G901,INV-NOBODY')).status, 400, 'only invitations of the register');
  assert.equal((await hit(W, 'admin/arrivals?facts=' + Array.from({ length: 13 }, (_, i) => 'INV-G9' + String(i + 1).padStart(2, '0')).join(','))).status, 400, 'never more than 12');
  W.env.REG_KV.gets.length = 0;
  const r = await hit(W, 'admin/arrivals?facts=INV-G901,INV-G905,INV-G908,INV-G909,INV-G907');
  assert.equal(r.status, 200); assert.equal(r.sheets.length, 0, 'no Google for the facts');
  assert.deepEqual(W.env.REG_KV.gets.filter((k) => k.startsWith('conf:')).sort(), ['conf:INV-G901', 'conf:INV-G905', 'conf:INV-G907'], 'not for a trip never sent or declined');
  const f = r.j.facts;
  assert.deepEqual([f['INV-G901'].booking, f['INV-G905'].booking, f['INV-G908'].booking, f['INV-G909'].booking], ['CONFIRMED', 'SENT', 'NOT_SENT', 'DECLINED']);
  assert.deepEqual(f['INV-G901'].legs, ['train']); assert.equal(f['INV-G901'].flightDoc, 'RECEIVED'); assert.equal(f['INV-G905'].flightDoc, 'NOT_ADDED'); assert.equal(f['INV-G908'].flightDoc, null);
  assert.deepEqual(f['INV-G907'].sent.scope, { bangkok: false, vientianePreWedding: true, vientianeWedding: true, china: false, none: false }, 'a legacy scope read through normalizeScope');
  assert.ok(!/spa|1872|secret-file|interest|request/.test(JSON.stringify(f)), 'an interest or a request is no booking; no file name');
  assert.equal(confirmationNeeded({ submissionId: 'S', registration: { guestRecord: { scope: { none: true } } } }), false);
});

test('HS-059 · 002 / 012 KEPT FIVE MINUTES — a complete read is used again, a read with a gap never; Google out of reach is a named gap, never a failure', async () => {
  forgetArrivalSources();
  const W = await world();
  const now0 = Date.now, t0 = now0(); let now = t0; Date.now = () => now;
  try {
    const a = await hit(W, 'admin/arrivals'); assert.equal(a.sheets.length, 1);
    now += 60000; const b = await hit(W, 'admin/arrivals'); assert.equal(b.sheets.length, 0, 'kept');
    assert.deepEqual({ ...b.j, at: null }, { ...a.j, at: null });
    now += ARRIVAL_SOURCES_MS; const c = await hit(W, 'admin/arrivals'); assert.equal(c.sheets.length, 1, 'expired');
    forgetArrivalSources();
    const d = await hit(W, 'admin/arrivals', { google: false });
    assert.equal(d.status, 200); assert.equal(d.j.dates, null); assert.equal(d.j.list012, null); assert.ok(d.j.gaps.some((g) => /Google could not be read/.test(g)));
    const e = await hit(W, 'admin/arrivals'); assert.equal(e.sheets.length, 1, 'the gap was never kept');
  } finally { Date.now = now0; forgetArrivalSources(); }
});

/* ------------------------------------------------------------ the console's half */
test('HS-059 · EVERY KNOWN GUEST ONCE — the tracks partition the register; ambiguous ids apart; a trip not read is "not read", never "not sent"', async () => {
  forgetArrivalSources();
  const W = await world(); const { base, facts } = await readAll(W); const M = model(base, facts);
  const all = Object.values(M.people.tracks).flat();
  assert.equal(all.length, M.people.total); assert.equal(new Set(all).size, all.length, 'each once'); assert.equal(M.people.total, 14, 'the couple and twelve guests; the ambiguous id apart');
  const T = M.people.tracks;
  assert.deepEqual(T.COUPLE, ['G048', 'G049']); assert.deepEqual(T.DECLINED, ['G909']); assert.deepEqual(T.NOT_SENT, ['G908']); assert.deepEqual(T.JOINING_NO_ARRANGEMENT, ['G910']);
  assert.ok(T.IN_ROOM_PLAN.includes('G911') && T.IN_ROOM_PLAN.includes('G912'));
  assert.deepEqual(M.people.ambiguous, ['G913']);
  const partial = { ...facts }; delete partial['INV-G903'];
  const P = model(base, partial);
  assert.deepEqual(P.people.tracks.NOT_READ, ['G903']); assert.ok(P.gaps.some((g) => /could not be read/.test(g)));
  assert.equal(P.nights.find((n) => n.night === '2027-02-27').places.VIENTIANE.ROOM_NOT_READ.join(), 'G903', 'a room of a trip not read is never "not sent"');
});

test('HS-059 · THE NIGHTS — only where a source places a guest; the couple apart; the train night; 25–26 Feb "not recorded" between the train and the room', async () => {
  forgetArrivalSources();
  const W = await world(); const { base, facts } = await readAll(W); const M = model(base, facts);
  const N = (n) => M.nights.find((x) => x.night === n);
  for (const n of M.nights) { const sum = Object.values(n.places).reduce((k, p) => k + Object.values(p).reduce((a, l) => a + l.length, 0), 0); assert.equal(sum, n.total, n.night + ' total = its lists');
    const ids = Object.values(n.places).flatMap((p) => Object.values(p).flat()); assert.equal(new Set(ids).size, ids.length, n.night + ' each guest once'); }
  assert.deepEqual(N('2027-02-21').places.BANGKOK, { COUPLE: ['G048', 'G049'], ROOM_CONFIRMED: ['G901', 'G902'] }, 'Bangkok: the couple apart, two guests in the plan');
  assert.deepEqual(N('2027-02-24').places.TRAIN.TRAIN, ['G901', 'G902', 'G903', 'G904', 'G905', 'G906', 'G911'], 'everyone holding the train — the Owners\' record too');
  const v25 = N('2027-02-25').places.VIENTIANE;
  assert.deepEqual(v25.NOT_RECORDED, ['G903', 'G904', 'G911'], 'arrived by train (their own trip or the Owners\' record), no room until 27 Feb — counted, said, never invented');
  assert.deepEqual(v25.ROOM_CONFIRMED, ['G901', 'G902', 'G906', 'G907']); assert.deepEqual(v25.ROOM_AWAITING, ['G905']);
  assert.deepEqual(N('2027-02-26').places.VIENTIANE.NOT_RECORDED, ['G903', 'G904', 'G911']);
  assert.ok(!N('2027-02-27').places.VIENTIANE.NOT_RECORDED, 'from 27 Feb they have a room');
  assert.deepEqual(N('2027-02-27').places.VIENTIANE.ROOM_NOT_SENT, ['G912'], 'a room without a trip and without the Owners\' record');
  assert.ok(N('2027-02-27').places.VIENTIANE.ROOM_CONFIRMED.includes('G911'), 'the Owners\' confirmed record makes the room confirmed');
  assert.ok(!M.nights.some((n) => Object.values(n.places).some((p) => Object.values(p).flat().includes('G910'))), 'joining as sent, nothing booked: never a night');
  assert.deepEqual(M.guests.G903.notRecorded.map((x) => x.night), ['2027-02-25', '2027-02-26']);
  assert.equal(M.guests.G903.bangkokArrival, 'NOT_RECORDED'); assert.equal(M.guests.G901.bangkokArrival, null);
  assert.equal(M.guests.G903.parts.vientianePreWedding, 'TRAVEL_NO_ROOM');
  assert.equal(M.guests.G910.parts.vientianeWedding, 'NO_ROOM_IN_PLAN');
});

test('HS-059 · THE DAYS — arriving and leaving a place from the rooms and the booked legs; the train is a leg, never a place', async () => {
  forgetArrivalSources();
  const W = await world(); const { base, facts } = await readAll(W); const M = model(base, facts);
  const D = (d) => M.days.find((x) => x.day === d);
  assert.deepEqual(D('2027-02-24').depart.BANGKOK, ['G048', 'G049', 'G901', 'G902', 'G903', 'G904', 'G905', 'G906', 'G911'], 'leaving Bangkok: the room ends or the train leaves — arrival there not recorded for some');
  assert.deepEqual(D('2027-02-24').legs, ['train']);
  assert.ok(!D('2027-02-24').arrive.TRAIN && !D('2027-02-25').depart.TRAIN);
  assert.deepEqual(D('2027-02-25').arrive.VIENTIANE, ['G048', 'G049', 'G901', 'G902', 'G903', 'G904', 'G905', 'G906', 'G907', 'G911']);
  assert.deepEqual(D('2027-03-01').depart.VIENTIANE.length, 11);
  assert.ok(D('2027-02-25').followUp.includes('G903') && D('2027-02-25').followUp.includes('G904'));
});

test('HS-059 · THE CHECKS — 012 by room number and night (never a name), mixed states in one room, Bangkok not recorded, nothing changed', async () => {
  forgetArrivalSources();
  const W = await world(); const { base, facts } = await readAll(W); const M = model(base, facts);
  const r202 = M.list012.rows.find((r) => r.roomNo === '202');
  assert.equal(r202.status, 'DIFFERENT'); assert.deepEqual(r202.guests, ['G904']);
  assert.match(r202.differences.join(' '), /2027-02-25, 2027-02-26; the room plan holds nobody there/);
  assert.deepEqual(r202.typed, ['Synthetic Typed-Four'], 'the typed name is shown, never matched');
  assert.equal(M.list012.rows.find((r) => r.roomNo === '203').status, 'SAME');
  assert.equal(M.list012.rows.find((r) => r.roomNo === '210 / 211').status, 'SAME', 'a suite compared as a set of numbers');
  assert.equal(M.list012.rows.find((r) => r.roomNo === '204').status, 'SAME');
  assert.ok(M.checks.LIST_012.ids.includes('G904'));
  assert.deepEqual(M.checks.MIXED_STATES.ids, ['G905', 'G906']);
  assert.deepEqual(M.checks.BANGKOK_NOT_RECORDED.ids, ['G903', 'G904', 'G905', 'G906', 'G911']);
  assert.deepEqual(M.checks.GAP.ids, ['G903', 'G904', 'G911']);
  assert.deepEqual(M.checks.ROOM_NOT_SENT.ids, ['G912']); assert.ok(!M.checks.ROOM_NOT_SENT.ids.includes('G911'), 'the Owners\' record is no false alarm');
  assert.deepEqual(M.checks.PART_NO_ROOM.ids, ['G910']);
  assert.deepEqual(M.checks.AMBIGUOUS.ids, ['G913']);
  const st = M.stays.find((s) => s.window === 'bkk-stay');
  assert.deepEqual([st.units, st.occupied, st.persons.length], [6, 2, 4], 'rooms are never people: 2 of 6 rooms, 4 persons');
  assert.ok(!/Synthetic G9|secret-file/.test(JSON.stringify(M)), 'name-free but for 012 as typed');
  assert.deepEqual(M.legs.find((l) => l.key === 'train').ownerRecorded, ['G911']);
  assert.equal(M.arrival.status, 'NOT_RECORDED'); assert.deepEqual(M.arrival.flightDocument.received, ['G901']);
});

test('HS-059 · THE PIECES — planOf / list012Of / factsOf / arrivalsBase on their own', () => {
  assert.equal(planOf(null), null);
  const p = planOf({ units: { [K.wed]: [{ label: 'A', places: 2, occupants: [{ guestId: 'G901', name: 'X' }, { guestId: '~P~1', name: '' }] }], 'sangkhathan': [{ label: 'A', occupants: [{ guestId: 'G901' }] }] }, waitlist: [{ stage: 'wedstay', guestId: 'G902', position: 1, name: 'Y' }] });
  assert.deepEqual(p.units.map((u) => [u.key, u.kept, u.occupants]), [[K.wed, 1, [{ guestId: 'G901' }]]]);
  assert.deepEqual(p.waitlist, [{ stage: 'wedstay', guestId: 'G902', position: 1 }]);
  const l = list012Of([{ row: 2, roomNo: '210/211', checkIn: '25.02.2027', checkOut: 'soon', guests: ['A'] }, { row: 3, roomNo: '101', checkIn: '', checkOut: '', guests: [] }]);
  assert.deepEqual(l, [{ row: 2, building: null, roomType: null, roomNo: '210/211', numbers: ['210', '211'], checkIn: '2027-02-25', checkOut: 'BAD', typed: ['A'] }]);
  assert.equal(factsOf(null, null).booking, 'NOT_SENT');
  const b = arrivalsBase({ entries: INDEX, plan: null, dates: { [K.wed]: { item: 'D1', checkIn: '2027-02-27', checkOut: '2027-03-01', nights: 2 }, sangkhathan: { item: 'T', checkIn: '2027-02-28' } }, list012: null, owner: {}, gaps: [] });
  assert.deepEqual(Object.keys(b.dates), [K.wed], 'only stays and legs'); assert.equal(b.guests.find((g) => g.guestId === 'G048').couple, 'BRIDE');
});
