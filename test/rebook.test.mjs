/* ============================================================================
   HS-060 · THE OWNERS' REBOOKING (Owners, 27 Nov 2026) — a stay moved to ANOTHER room category of the same stay, by the Owners:
     · the room engine moves every guest of a request in one all-or-nothing step (src/rooms.js · admin-rebook)
     · each trip, its draft and its fingerprints follow, exactly as a send would leave them — never an e-mail (src/worker.js)
     · the route prices the new room for that very person from Google and refuses one without an amount (src/billing-routes.js)
     · a room the stay does not offer is the Owners' placement only: no guest takes, is given or is kept a place in it
     · the next statement version keeps the replaced version's due date and carries the Owners' note
   The real Worker over in-memory engines and stores; Google is replaced at the fetch boundary by a SYNTHETIC workbook; every
   guest here is invented (G9xx) — no real guest, no real booking.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { doState, page, PEGGY, src } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating } from '../src/seating.js';
import { complete } from './complete.mjs';
import { PAYMENT_JOURNAL_COLUMNS } from '../src/billing/source.js';
import { calculate } from '../src/billing/engine.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const HDR = { 'x-gr-verified': 'yes', 'x-siyl-admin': 'GROOM', 'content-type': 'application/json' };

/* ---------------------------------------------------------------- the doubles */
function kv() {
  const m = new Map();
  return { m,
    get: async (k) => (m.has(k) ? m.get(k).v : null),
    getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }),
    put: async (k, v, o) => { m.set(k, { v: String(v), meta: (o && o.metadata) || null, ttl: (o && o.expirationTtl) || null }); },
    delete: async (k) => { m.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: m.get(name).meta })), list_complete: true }) };
}
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); },
  async list({ prefix } = {}) { const out = new Map(); for (const [k, v] of m) if (!prefix || k.startsWith(prefix)) out.set(k, v); return out; } }; };

/* ---- the synthetic workbook: the four Souphattra categories of the change, as the live ones are shaped (never live figures of a guest) */
const ITEMS = {
  'C-HGP-T': { Item_ID: 'C-HGP-T', Site_Product_Key: 'prewed/heritage-grand-premier', Rate_Status: 'ACTIVE', Standard_Rate: 162.5, Quota: 3, Modifiers: '' },
  'D1-HGP-T': { Item_ID: 'D1-HGP-T', Site_Product_Key: 'wedstay/heritage-grand-premier', Rate_Status: 'ACTIVE', Standard_Rate: 170, Quota: 3, Modifiers: 'SECOND_NIGHT_COMPLIMENTARY' },
  'D1-NC-T': { Item_ID: 'D1-NC-T', Site_Product_Key: 'wedstay/noble-courtyard', Rate_Status: 'ACTIVE', Standard_Rate: 195, Quota: 1, Modifiers: 'SECOND_NIGHT_COMPLIMENTARY' },
  /* the pre-wedding Noble Courtyard as the Owners' order adds it: DRAFT, no list rate — priced by the persons' own 009 rows alone */
  'C-NC-T': { Item_ID: 'C-NC-T', Site_Product_Key: 'prewed/noble-courtyard', Rate_Status: 'DRAFT', Standard_Rate: '', Quota: 1, Modifiers: '' },
};
for (const it of Object.values(ITEMS)) Object.assign(it, { Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Basis: 'PER_PERSON_PER_NIGHT', Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', 'Number of Nights': 2 });
/* the upgrade pair keeps its own charge in the new rooms: 162.50 × 2 before the wedding, 170 × 1 for the wedding stay (second night hosted) */
const R009 = (inv, person, item, rate, rule) => [inv, person, item, rate, String(rule), 'ACTIVE', '', '', 'Synthetic Owner order', 'synthetic'];
const RATES = [R009('INV-G901', 'G901', 'C-NC-T', 162.5, 2), R009('INV-G902', 'G902', 'C-NC-T', 162.5, 2), R009('INV-G901', 'G901', 'D1-NC-T', 170, 1), R009('INV-G902', 'G902', 'D1-NC-T', 170, 1)];
function workbook() {
  const labels = ['Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To', 'Rate_Basis', 'Standard_Rate', 'Quota', 'Quota_Unit', 'Max_Pax', 'Change_Cutoff', 'Cancellation_Cutoff', 'Currency', 'Site_Product_Key', 'Number of Nights', 'Modifiers'];
  const cols = Object.values(ITEMS);
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...labels.map((l) => [l, ...cols.map((it) => (it[l] == null ? '' : it[l]))])],
    '008_Payment_Journal': [[...PAYMENT_JOURNAL_COLUMNS]],
    '009_Special_Rates': [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note'], ...RATES],
    '010_Booking_Evidence_Index': [['Booking_ID', 'Settlement_ID', 'Holder_ID', 'Evidence_Status']],
    '011_Billing_Config': [['Config_Key', 'Value', 'Effective_From', 'Effective_To', 'Status', 'Approved_By', 'Approved_At', 'Note']],
    '006_Guestlist': [['ID', 'Firstname', 'Surname', 'Nationality'], ...['901', '902', '903', '904', '905'].map((n) => ['CON-T' + n, 'Synth' + n, 'Example', 'Thai'])],
  };
}
const mails = [];
function fetchDouble(wb) {
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return async (url, init) => {
    const u = String(url && url.url ? url.url : url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return res(200, { access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(u)) return res(200, { valueRanges: [...new URL(u).searchParams.getAll('ranges')].map((range) => ({ range, values: wb[range.split('!')[0].replace(/^'|'$/g, '')] || [] })) });
    if (u.startsWith('https://api.brevo.com/')) { mails.push(JSON.parse(String(init && init.body || '{}'))); return res(201, { messageId: 'synthetic-' + mails.length }); }
    const m = u.match(/\/values\/([^?]+)\?/); const tab = m ? decodeURIComponent(m[1]).split('!')[0].replace(/^'|'$/g, '') : '';
    return wb[tab] ? res(200, { values: wb[tab] }) : res(404, { error: { message: 'not found' } });
  };
}
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });

/* ---------------------------------------------------------------- the world */
const GUESTS = { G901: 'Ann', G902: 'Bo', G903: 'Cy', G904: 'Di', G905: 'Ed' };
async function world() {
  const w = (await import('../src/worker.js')).default;
  const bearer = {}, entries = {};
  for (const g of Object.keys(GUESTS)) { bearer[g] = await bearerOf('rebook-' + g); entries[await authIdOf(bearer[g])] = { i: 'INV-' + g, g, p: 'INV-P' + g.slice(1), c: 'CON-T' + g.slice(1) }; }
  bearer.GROOM = await bearerOf('rebook-groom'); entries[await authIdOf(bearer.GROOM)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' };
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const { BillingLedger } = await import('../src/billing-ledger.js'); const led = new BillingLedger(doState());
  const env = { ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 })) },
    REG_KV: kv(), SHEETS_ID: 'sheet-rebook', BREVO_API_KEY: 'synthetic', MAIL_FROM: 'test@example.invalid',
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'rebook@test.invalid', private_key: privateKey, private_key_id: 'rb' }),
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) },
    BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (r) => led.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r), a }; } return actors[n]; } };
  const call = (path, who, body, method) => w.fetch(new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(who ? { 'x-siyl-auth': bearer[who] } : {}) }, body: body ? JSON.stringify(body) : undefined }), env)
    .then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  return { w, env, rooms, actors, call, bearer };
}
const LINE = {
  prewed: (room, name, rate, unit) => ({ id: 'prewed', name: 'Souphattra Heritage Vientiane', meta: '25 – 27 February 2027 · ' + name, price: rate * 2, stay: 'souphattra', room, rate, nights: 2, pay: 2, qty: 1, unit, unitName: 'Room ' + unit }),
  wedstay: (room, name, rate, unit) => ({ id: 'wedstay', name: 'Souphattra Heritage Vientiane', meta: '27 February – 1 March 2027 · ' + name, price: rate, stay: 'souphattra', room, rate, nights: 2, pay: 1, note: 'the second night is hosted', qty: 1, unit, unitName: 'Room ' + unit }),
};
const reg = (h, g) => JSON.parse(h.env.REG_KV.m.get('reg:INV-' + g).v);
const bagOf = async (h, g) => JSON.parse((await h.actors['INV-' + g].a.storage.get('draft')).keys['siyl.bag']);
const occ = async (h) => [...(await h.rooms.storage.list({ prefix: 'occ:' })).keys()].map((k) => k.slice(4)).sort();
/* a guest holds the rooms, saves the Bag and sends the trip — the guest's own flow, nothing of the Owners' */
async function booked(h, g, lines, scope) {
  for (const l of lines) assert.equal((await h.call('/api/rooms/join', g, { invitationId: 'INV-' + g, guestId: g, key: l.id + '/' + l.room, label: l.unit, name: GUESTS[g] })).status, 200, g + ' holds ' + l.id);
  const epoch = (await h.call('/api/draft', g)).d.resetAt || null;
  /* About You as the server requires it (step 01) — synthetic */
  const c = await h.call('/api/contact', g, { invitationId: 'INV-' + g, seenReset: epoch, email: g.toLowerCase() + '@example.org', phone: '+66 81 000 0' + g.slice(1), firstName: GUESTS[g], lastName: 'Example',
    birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Test City', country: 'Testland' }, 'PUT');
  assert.equal(c.status, 200, JSON.stringify(c.d).slice(0, 160));
  const put = await h.call('/api/draft', g, { invitationId: 'INV-' + g, keys: { 'siyl.bag': JSON.stringify(lines), 'siyl.guest': JSON.stringify({ contact: { email: g.toLowerCase() + '@example.org' } }) }, seenReset: epoch }, 'PUT');
  assert.equal(put.status, 200, JSON.stringify(put.d).slice(0, 160));
  const r = complete({ guestId: g, contact: { email: g.toLowerCase() + '@example.org', phone: '+66 1' }, selections: lines,
    guestRecord: { guests: [{ guestId: g, name: GUESTS[g] }], scope: { bangkok: false, vientianePreWedding: !!scope.pre, vientianeWedding: true, china: false, none: false } },
    stages: { prewed: scope.pre ? 'selected' : 'declined', wedstay: 'selected' } });
  const s = await h.call('/api/register', g, { invitationId: 'INV-' + g, registration: r, text: 'SEE YOU IN LAOS — synthetic ' + g });
  assert.ok(s.status === 200 || s.status === 202, g + ' sent: ' + JSON.stringify(s.d).slice(0, 200));
  return epoch;
}
const NC = 'assets/images/rooms/noble-courtyard-1.jpg', HGP = 'assets/images/rooms/heritage-grand-premier-1.jpg';
const CHANGES = [
  { invitationId: 'INV-G901', guestId: 'G901', stage: 'prewed', from: { room: 'heritage-grand-premier' }, to: { room: 'noble-courtyard', unit: 'A' }, img: NC },
  { invitationId: 'INV-G901', guestId: 'G901', stage: 'wedstay', from: { room: 'heritage-grand-premier' }, to: { room: 'noble-courtyard', unit: 'A' }, img: NC },
  { invitationId: 'INV-G902', guestId: 'G902', stage: 'prewed', from: { room: 'heritage-grand-premier' }, to: { room: 'noble-courtyard', unit: 'A' }, img: NC },
  { invitationId: 'INV-G902', guestId: 'G902', stage: 'wedstay', from: { room: 'heritage-grand-premier' }, to: { room: 'noble-courtyard', unit: 'A' }, img: NC },
  { invitationId: 'INV-G903', guestId: 'G903', stage: 'wedstay', from: { room: 'noble-courtyard' }, to: { room: 'heritage-grand-premier', unit: 'C' }, img: HGP },
  { invitationId: 'INV-G904', guestId: 'G904', stage: 'wedstay', from: { room: 'noble-courtyard' }, to: { room: 'heritage-grand-premier', unit: 'C' }, img: HGP },
];
const NOTES = { 'INV-G901': 'upgrade note', 'INV-G902': 'upgrade note', 'INV-G903': 'category note', 'INV-G904': 'category note' };
async function withGoogle(fn) { const was = globalThis.fetch; globalThis.fetch = fetchDouble(workbook()); try { return await fn(); } finally { globalThis.fetch = was; } }

test('HS-060 · THE SWAP ACROSS CATEGORIES, end to end: dry run first, the guest\'s own unsent edit refused, then engine, drafts and trips together — no e-mail; a re-run changes nothing', async () => withGoogle(async () => {
  const h = await world();
  /* the upgrade pair: Heritage Grand Premier Room C before AND during the wedding; the category pair: the Noble Courtyard for the wedding */
  for (const g of ['G901', 'G902']) await booked(h, g, [LINE.prewed('heritage-grand-premier', 'Heritage Grand Premier', 162.5, 'C'), LINE.wedstay('heritage-grand-premier', 'Heritage Grand Premier', 170, 'C')], { pre: true });
  for (const g of ['G903', 'G904']) await booked(h, g, [LINE.wedstay('noble-courtyard', 'Noble Courtyard Suite', 195, 'A')], { pre: false });
  /* the Owners had confirmed G901's version 1 */
  const r901 = reg(h, 'G901'); assert.equal(r901.version, 1);
  await h.env.REG_KV.put('conf:INV-G901', JSON.stringify({ invitationId: 'INV-G901', confirmedAt: '2026-11-20T00:00:00.000Z', version: 1, sentAt: r901.lastSentAt, submissionId: r901.submissionId, actor: 'GROOM', role: 'BILLING_ADMIN', source: 'test' }));
  const before = await occ(h);
  assert.deepEqual(before, ['prewed/heritage-grand-premier|C|G901', 'prewed/heritage-grand-premier|C|G902', 'wedstay/heritage-grand-premier|C|G901', 'wedstay/heritage-grand-premier|C|G902', 'wedstay/noble-courtyard|A|G903', 'wedstay/noble-courtyard|A|G904']);
  const mailsBefore = mails.length; assert.ok(mailsBefore >= 4, 'the guests\' own sends were mailed (the double counts them)');

  /* a guest reaches none of it */
  assert.equal((await h.call('/api/billing/admin/rebook', 'G901', { order: 'HS-060', changes: CHANGES, apply: true })).status, 403);
  /* the order is named, or nothing happens */
  assert.equal((await h.call('/api/billing/admin/rebook', 'GROOM', { changes: CHANGES })).status, 400);

  /* every change names the new room's picture; a note the statement cannot print is refused */
  assert.equal((await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES.map(({ img, ...c }) => c) })).status, 400);
  assert.equal((await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', notes: { 'INV-G901': 'ห้อง 101' }, changes: CHANGES })).status, 400);

  /* an unsent change ANYWHERE in a guest's trip (not only the stay) is theirs: the trip reads "changes not sent" — refused (review P1) */
  const d904 = await h.actors['INV-G904'].a.storage.get('draft');
  assert.equal((await h.call('/api/draft', 'G904', { invitationId: 'INV-G904', keys: { 'siyl.temple': JSON.stringify({ G904: { offering: 'yes' } }) }, baseUpdatedAt: d904.updatedAt }, 'PUT')).status, 200);
  assert.equal((await h.call('/api/draft', 'G904')).d.submission.hasUnsentChanges, true, 'the guest has an unsent change');
  const elsewhere = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES });
  assert.equal(elsewhere.status, 409); assert.ok(elsewhere.d.problems.some((p) => p.invitationId === 'INV-G904' && p.reason === 'UNSENT_CHANGES'), JSON.stringify(elsewhere.d));
  const d904b = await h.actors['INV-G904'].a.storage.get('draft');
  assert.equal((await h.call('/api/draft', 'G904', { invitationId: 'INV-G904', keys: { 'siyl.temple': d904.keys['siyl.temple'] || '' }, baseUpdatedAt: d904b.updatedAt }, 'PUT')).status, 200, 'the guest undoes it');
  assert.equal((await h.call('/api/draft', 'G904')).d.submission.hasUnsentChanges, false);

  /* a confirmation that names no version would outlive the change (it stands on its date): refused */
  const r902 = reg(h, 'G902');
  await h.env.REG_KV.put('conf:INV-G902', JSON.stringify({ invitationId: 'INV-G902', confirmedAt: '2026-11-21T00:00:00.000Z', submissionId: r902.submissionId, actor: 'GROOM' }));
  const nover = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES });
  assert.ok(nover.d.problems.some((p) => p.invitationId === 'INV-G902' && p.reason === 'CONFIRMATION_WITHOUT_VERSION'), JSON.stringify(nover.d));
  await h.env.REG_KV.delete('conf:INV-G902');

  /* the guest's own unsent edit of the stay is theirs: refused, nothing written */
  const d903 = (await h.actors['INV-G903'].a.storage.get('draft'));
  const edited = JSON.parse(d903.keys['siyl.bag']).map((l) => ({ ...l, qty: 2 }));
  assert.equal((await h.call('/api/draft', 'G903', { invitationId: 'INV-G903', keys: { 'siyl.bag': JSON.stringify(edited) }, baseUpdatedAt: d903.updatedAt }, 'PUT')).status, 200);
  const refused = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES, apply: true });
  assert.equal(refused.status, 409, JSON.stringify(refused.d).slice(0, 300)); assert.ok(refused.d.problems.some((p) => p.invitationId === 'INV-G903' && p.reason === 'UNSENT_EDITS'));
  assert.deepEqual(await occ(h), before, 'the engine untouched'); assert.equal(reg(h, 'G901').version, 1, 'no trip written');
  const d903b = (await h.actors['INV-G903'].a.storage.get('draft'));
  assert.equal((await h.call('/api/draft', 'G903', { invitationId: 'INV-G903', keys: { 'siyl.bag': d903.keys['siyl.bag'] }, baseUpdatedAt: d903b.updatedAt }, 'PUT')).status, 200, 'the guest undoes the edit');

  /* the dry run: the plan and the server's own prices — nothing written */
  const dry = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', note: 'synthetic note', changes: CHANGES });
  assert.equal(dry.status, 200, JSON.stringify(dry.d).slice(0, 300)); assert.equal(dry.d.dryRun, true);
  const q = (g, stage) => dry.d.quotes.find((x) => x.guestId === g && x.stage === stage);
  assert.deepEqual([q('G901', 'prewed').itemId, q('G901', 'prewed').total, q('G901', 'prewed').rateSource], ['C-NC-T', 325, 'SPECIAL_RATE'], 'the upgrade keeps 162.50 × 2');
  assert.deepEqual([q('G901', 'wedstay').itemId, q('G901', 'wedstay').total, q('G901', 'wedstay').payableNights, q('G901', 'wedstay').nights], ['D1-NC-T', 170, 1, 2], 'the upgrade keeps 170, the second night hosted');
  assert.deepEqual([q('G903', 'wedstay').itemId, q('G903', 'wedstay').total, q('G903', 'wedstay').rateSource], ['D1-HGP-T', 170, 'STANDARD_RATE'], 'the category pair pays the new category\'s own rate');
  assert.deepEqual(await occ(h), before); assert.equal(reg(h, 'G903').version, 1);

  /* APPLY */
  const ok = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', notes: NOTES, changes: CHANGES, apply: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.d).slice(0, 400)); assert.equal(ok.d.engine, 'moved');
  assert.deepEqual(await occ(h), ['prewed/noble-courtyard|A|G901', 'prewed/noble-courtyard|A|G902', 'wedstay/heritage-grand-premier|C|G903', 'wedstay/heritage-grand-premier|C|G904', 'wedstay/noble-courtyard|A|G901', 'wedstay/noble-courtyard|A|G902'], 'one step: the pair swapped, the pre-wedding Room C free');
  assert.equal(mails.length, mailsBefore, 'NO e-mail of any kind');
  for (const g of ['G901', 'G902']) {
    const rec = reg(h, g), bag = await bagOf(h, g), pre = rec.registration.selections.find((l) => l.id === 'prewed'), wed = rec.registration.selections.find((l) => l.id === 'wedstay');
    assert.equal(rec.version, 2); assert.equal(rec.kind, 'owner-rebook'); assert.equal(rec.mail, null); assert.equal(rec.mailSummary, undefined, 'no "copy on its way" line');
    assert.equal(rec.rebook.order, 'HS-060'); assert.equal(rec.rebook.previousVersion, 1); assert.match(rec.text, /OWNERS' ROOM CHANGE/);
    assert.deepEqual([pre.room, pre.unit, pre.unitName, pre.price, pre.rate, pre.pay, pre.personal, pre.owners], ['noble-courtyard', 'A', 'Room A', 325, 162.5, 2, 'special', true], g + ' pre-wedding: the Owners\' placement, its own charge');
    assert.deepEqual([wed.room, wed.unit, wed.price, wed.rate, wed.pay, wed.nights, wed.personal, wed.owners], ['noble-courtyard', 'A', 170, 195, 1, 2, 'special', undefined], g + ' wedding stay: offered there — no mark, the list rate beside the own charge');
    assert.equal(pre.meta, '25 – 27 February 2027 · Noble Courtyard Suite'); assert.equal(wed.note, 'the second night is hosted', 'the window\'s own words kept');
    assert.deepEqual(bag.map((l) => [l.id, l.room, l.unit, l.price, !!l.owners]), rec.registration.selections.map((l) => [l.id, l.room, l.unit, l.price, !!l.owners]), 'the draft is the sent trip');
    assert.equal([...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('reg:INV-' + g + ':prev:')).length, 1, 'the version before kept');
  }
  for (const g of ['G903', 'G904']) {
    const rec = reg(h, g), wed = rec.registration.selections.find((l) => l.id === 'wedstay');
    assert.equal(rec.version, 2); assert.deepEqual([wed.room, wed.unit, wed.price, wed.rate, wed.personal, wed.owners], ['heritage-grand-premier', 'C', 170, 170, undefined, undefined]);
    assert.equal(wed.meta, '27 February – 1 March 2027 · Heritage Grand Premier');
  }
  /* the guests' own pages: the trip reads as SENT (the fingerprints follow), the confirmation waits for the Owners */
  const s901 = (await h.call('/api/draft', 'G901')).d.submission, s903 = (await h.call('/api/draft', 'G903')).d.submission;
  assert.deepEqual([s901.submissionStatus, s901.hasUnsentChanges, s901.version, s901.confirmed, s901.lapsed, s901.byOwners, s901.ownersFrom], ['sent', false, 2, false, true, true, 1]);
  assert.deepEqual([s903.submissionStatus, s903.hasUnsentChanges, s903.confirmed, s903.byOwners], ['sent', false, false, true]);
  assert.ok(ok.d.applied.every((a) => a.ok && a.version === 2) && ok.d.applied.length === 4);
  assert.deepEqual(ok.d.intents.map((i) => [i.holderId, i.skipped]).sort(), ['G901', 'G902', 'G903', 'G904'].map((g) => ['INV-' + g, 'no statement issued yet']), 'no statement issued here — said, not guessed');
  for (const g of ['G901', 'G902']) assert.deepEqual((await bagOf(h, g)).map((l) => l.img), [NC, NC], g + ' the new room\'s own picture');

  /* a re-run: everything is already where the Owners put it — nothing moves, no version is added */
  const again = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES, apply: true });
  assert.equal(again.status, 200, JSON.stringify(again.d).slice(0, 300)); assert.equal(again.d.engine, 'already');
  for (const g of ['G901', 'G902', 'G903', 'G904']) assert.equal(reg(h, g).version, 2, g + ' still version 2');
  assert.deepEqual(again.d.intents, [], 'a re-run writes no trip — and arms no statement');

  /* a page of an earlier release dropped the Owners' line from G901's draft: the re-run brings the sent line back, the trip reads sent again */
  const d901 = await h.actors['INV-G901'].a.storage.get('draft');
  const pruned = JSON.parse(d901.keys['siyl.bag']).filter((l) => l.id !== 'prewed');
  assert.equal((await h.call('/api/draft', 'G901', { invitationId: 'INV-G901', keys: { 'siyl.bag': JSON.stringify(pruned) }, baseUpdatedAt: d901.updatedAt }, 'PUT')).status, 200);
  assert.equal((await h.call('/api/draft', 'G901')).d.submission.hasUnsentChanges, true, 'the dropped line reads as an unsent change');
  const healed = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: CHANGES, apply: true });
  assert.equal(healed.status, 200, JSON.stringify(healed.d).slice(0, 300));
  assert.deepEqual((await bagOf(h, 'G901')).map((l) => [l.id, l.room, l.owners === true]).sort(), [['prewed', 'noble-courtyard', true], ['wedstay', 'noble-courtyard', false]]);
  assert.equal((await h.call('/api/draft', 'G901')).d.submission.hasUnsentChanges, false); assert.equal(reg(h, 'G901').version, 2, 'no new version for a restored draft line');

  /* the Owners' booking form never records anyone into the Owners' placement */
  const obk = await h.call('/api/billing/admin/owner-bookings', 'GROOM', { holderId: 'INV-G905', action: 'add', expectedRev: 0, entry: { personId: 'G905', itemId: 'C-NC-T', room: 'A' } });
  assert.equal(obk.status, 409); assert.ok(obk.d.reasons.includes('OWNERS_ONLY: prewed/noble-courtyard'), JSON.stringify(obk.d));

  /* THE OWNERS' PLACEMENT ONLY: another guest can neither take nor see a free place in it; its holder keeps it */
  const other = await h.call('/api/rooms/join', 'G905', { invitationId: 'INV-G905', guestId: 'G905', key: 'prewed/noble-courtyard', label: 'A', name: 'Ed' });
  assert.equal(other.status, 403); assert.equal(other.d.error, 'not offered');
  const mine = await h.call('/api/rooms/join', 'G901', { invitationId: 'INV-G901', guestId: 'G901', key: 'prewed/noble-courtyard', label: 'A', name: 'Ann' });
  assert.equal(mine.status, 200); assert.equal(mine.d.unchanged, true);
  const seen = (await h.call('/api/rooms', 'G905')).d.units['prewed/noble-courtyard'][0];
  assert.deepEqual([seen.ownersOnly, seen.eligible, seen.free, seen.full], [true, false, 0, true]);
  /* the Owners' booking form and Guest Relations' assignment never place anyone there either */
  const gr = await h.rooms.fetch(new Request('https://rooms/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants: [{ key: 'prewed/noble-courtyard', label: 'A', guestId: 'G905', invitationId: 'INV-G905' }], force: true }) }));
  const grj = await gr.json(); assert.equal(grj.ok, false); assert.equal(grj.refused[0].error, 'not offered');
}));

test('HS-060 · THE ENGINE\'S REBOOKING refuses every unsafe move as a whole — nothing is written', async () => {
  const rooms = new Rooms(doState());
  const put = (k, g, extra) => rooms.storage.put('occ:' + k + '|' + g, { invitationId: 'INV-' + g, partyId: null, name: g, at: 'x', ...(extra || {}) });
  await put('wedstay/heritage-grand-premier|A', 'G911'); await put('wedstay/heritage-grand-premier|A', 'G912'); await put('wedstay/noble-courtyard|A', 'G913');
  await put('prewed/heritage|A', 'G914'); await put('wedstay/heritage|D', 'G915');
  const op = async (body) => { const r = await rooms.fetch(new Request('https://rooms/api/rooms/admin-rebook', { method: 'POST', headers: HDR, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
  const keys = async () => [...(await rooms.storage.list({ prefix: 'occ:' })).keys()].sort();
  const was = await keys();
  const mv = (g, fk, fl, tk, tl) => ({ guestId: g, from: { key: fk, label: fl }, to: { key: tk, label: tl } });
  const cases = [
    [[mv('G911', 'wedstay/heritage-grand-premier', 'A', 'wedstay/noble-courtyard', 'A'), mv('G912', 'wedstay/heritage-grand-premier', 'A', 'wedstay/noble-courtyard', 'A')], 'BEYOND_PLACES'],
    [[mv('G913', 'wedstay/noble-courtyard', 'B', 'wedstay/heritage-grand-premier', 'B')], 'UNKNOWN_ROOM'],
    [[mv('G913', 'wedstay/heritage-grand-premier', 'B', 'wedstay/grand-majestic', 'A')], 'CHANGED'],
    [[mv('G914', 'prewed/heritage', 'A', 'wedstay/heritage', 'A')], 'STAGE_CHANGE'],
    [[mv('G911', 'wedstay/heritage-grand-premier', 'A', 'wedstay/heritage-grand-premier', 'B')], 'SAME_CATEGORY'],
    [[mv('G913', 'wedstay/noble-courtyard', 'A', 'wedstay/souphattra-presidential', 'A')], 'COUPLE_ONLY'],
    [[mv('G913', 'wedstay/noble-courtyard', 'A', 'wedstay/heritage', 'D')], 'EXTRA_BED'],
  ];
  for (const [moves, reason] of cases) {
    const r = await op({ moves });
    assert.equal(r.status, reason === 'UNKNOWN_ROOM' ? 409 : 409, reason); assert.equal(r.j.ok, false);
    assert.ok(r.j.problems.some((p) => p.reason === reason), reason + ' — got ' + JSON.stringify(r.j.problems));
    assert.deepEqual(await keys(), was, reason + ': nothing written');
  }
  /* a place kept for a party in a touched room: never re-arranged */
  await rooms.storage.put('occ:wedstay/heritage-grand-premier|B|~P1~1', { invitationId: 'INV-P', partyId: 'P1', name: '', at: 'x' });
  const kept = await op({ moves: [mv('G913', 'wedstay/noble-courtyard', 'A', 'wedstay/heritage-grand-premier', 'B')] });
  assert.ok(kept.j.problems.some((p) => p.reason === 'KEPT_PLACES'), JSON.stringify(kept.j));
  /* without the Owners' header, nobody reaches it */
  const anon = await rooms.fetch(new Request('https://rooms/api/rooms/admin-rebook', { method: 'POST', body: JSON.stringify({ moves: [] }) }));
  assert.equal(anon.status, 404);
  /* a clean move: written as REBOOK in the room log, the Owners named, where it came from kept */
  const good = await op({ moves: [mv('G913', 'wedstay/noble-courtyard', 'A', 'wedstay/heritage-grand-premier', 'C')], order: 'HS-060' });
  assert.equal(good.status, 200, JSON.stringify(good.j)); assert.equal(good.j.ok, true);
  const row = await rooms.storage.get('occ:wedstay/heritage-grand-premier|C|G913');
  assert.deepEqual([row.by, row.rebookedFrom, row.invitationId, row.placedFrom], ['owners:GROOM', { key: 'wedstay/noble-courtyard', label: 'A' }, 'INV-G913', undefined]);
  const log = [...(await rooms.storage.list({ prefix: 'log:' })).values()];
  assert.ok(log.some((e) => e.type === 'REBOOK' && e.status === 'APPLIED' && e.guestId === 'G913' && e.order === 'HS-060' && e.from === 'noble-courtyard · Room A' && e.to === 'heritage-grand-premier · Room C'));
});

test('HS-060 · THE PRICES of the change, through the engine: the upgrade keeps 325 and 170 (the second night still hosted), the category pair pays 170, nobody else is billed for the pre-wedding suite', () => {
  /* the source loader reads Modifiers as a list (src/billing/source.js); the engine is given that form here */
  const items = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, { ...v, Modifiers: v.Modifiers ? [v.Modifiers] : [] }]));
  const specialRates = RATES.map((r) => ({ Holder_ID: r[0], Person_ID: r[1], Item_ID: r[2], Rate_Per_Person_Night: r[3], Nights_Rule: r[4], Rate_Status: r[5], Effective_From: r[6], Effective_To: r[7], Approved_By: r[8], Note: r[9] }));
  const line = (inv, person, item) => calculate([{ Booking_ID: 'b', Holder_ID: inv, Person_ID: person, Item_ID: item, Bill_To_Holder_ID: inv, State: 'CONFIRMED', Nights: 2, Quantity: 1, Selected: true }], { items, specialRates, asOf: '2026-11-27' }).lines[0];
  const pre = line('INV-G901', 'G901', 'C-NC-T'), wed = line('INV-G901', 'G901', 'D1-NC-T'), cat = line('INV-G903', 'G903', 'D1-HGP-T'), stranger = line('INV-G905', 'G905', 'C-NC-T'), list = line('INV-G905', 'G905', 'D1-NC-T');
  assert.deepEqual([pre.amountCents, pre.rateSource, pre.payableNights], [32500, 'SPECIAL_RATE', 2]);
  assert.deepEqual([wed.amountCents, wed.rateSource, wed.payableNights, wed.nights, wed.hosted], [17000, 'SPECIAL_RATE', 1, 2, false]);
  assert.ok(wed.modifiers.includes('SECOND_NIGHT_COMPLIMENTARY'), 'the hosted second night is still named on the line (the PDF says it: pdf.js · secondNightHosted)');
  assert.deepEqual([cat.amountCents, cat.rateSource, cat.payableNights], [17000, 'STANDARD_RATE', 1]);
  assert.ok(stranger.review, 'the pre-wedding suite has no amount for anyone the Owners did not place');
  assert.deepEqual([list.amountCents, list.rateSource], [19500, 'STANDARD_RATE'], 'everyone else keeps the list rate of the wedding-stay suite');
});

test('HS-060 · THE NEXT STATEMENT keeps the replaced version\'s due date and carries the Owners\' note — that one version only, never a date before the issue day, never past 200 characters', async () => {
  const { rebookIntentOf, withNote, REBOOK_INTENT } = await import('../src/billing-routes.js');
  const store = kv();
  await store.put(REBOOK_INTENT + 'INV-G901', JSON.stringify({ order: 'HS-060', replacesRevision: 2, dueDate: '2026-11-30', note: 'synthetic note for the next version' }));
  const env = { REG_KV: store };
  assert.deepEqual(await rebookIntentOf(env, 'INV-G901', { Revision: 2 }, '2026-11-27'), { order: 'HS-060', dueDate: '2026-11-30', keptDueDate: '2026-11-30', note: 'synthetic note for the next version' });
  assert.equal(await rebookIntentOf(env, 'INV-G901', { Revision: 3 }, '2026-11-27'), null, 'a later version ends it');
  assert.equal(await rebookIntentOf(env, 'INV-G901', null, '2026-11-27'), null, 'nothing issued, nothing kept');
  assert.equal((await rebookIntentOf(env, 'INV-G901', { Revision: 2 }, '2026-12-01')).dueDate, '', 'never a due date before the issue day');
  assert.equal(await rebookIntentOf(env, 'INV-G902', { Revision: 2 }, '2026-11-27'), null, 'another holder has none');
  assert.equal(withNote('booked items updated', 'synthetic note'), 'booked items updated; synthetic note');
  const long = withNote('recipient and product names added; amount changed from USD 160.00 to USD 185.00', 'x'.repeat(140));
  assert.ok(long.length <= 200 && long.endsWith('…'), long.length);
  /* the issue freezes the due date the preview showed: the intent's, else the request's own — one value through assessIssue */
  const routes = src('src/billing-routes.js');
  assert.match(routes, /const dueDateOverride = clean\(o\.dueDateOverride\) \|\| \(intent && intent\.dueDate\) \|\| '';/);
  assert.match(routes, /ledgerCall\(env, 'revision-issue', \{[\s\S]{0,400}?dueDateOverride: a\.dueDateOverride \|\| ''/);
  assert.ok(!/dueDateOverride: clean\(body\.dueDateOverride\)/.test(routes), 'no path issues with a due date the preview did not show');
});

test('HS-060 · THE GUEST\'S OWN PAGES: the Owners\' placed line stays in the Bag where the stay does not offer the room, with its own charge and no listed rate beside it; nobody else is offered the room', () => {
  const quotes = { 'prewed/noble-courtyard': { Item_ID: 'C-NC-T', total: 325, rateSource: 'SPECIAL_RATE', ratePerNight: 162.5, nights: 2, payableNights: 2, block: 'A', hosted: false, listRate: null } };
  const w = page({ auth: PEGGY, quotes }); const P = w.SIYL_PRICE;
  const placed = { id: 'prewed', room: 'noble-courtyard', stay: 'souphattra', unit: 'A', price: 325, owners: true };
  assert.equal(P.known(placed), true, 'the Owners\' placement is the guest\'s own line');
  assert.equal(P.known({ ...placed, owners: undefined }), false, 'without the mark it is a room this stay does not offer');
  assert.equal(P.items('prewed', 'noble-courtyard').length, 0, 'and it is never offered');
  const q = P.quote('prewed', 'noble-courtyard');
  assert.equal(q.total, 325); assert.equal(q.personal, 'special'); assert.equal(q.nightly, ''); assert.ok(!/listed rate/.test(q.contribution), q.contribution);
  assert.ok(!/247/.test(q.basis + ' ' + q.contribution), 'a figure Google does not state is never shown');
  /* the review page: the Owners' rebooking of the version this device sent is no "other device" */
  assert.match(src('assets/draft.js'), /if \(s\.byOwners && s\.ownersFrom != null && Number\(mine\.version \|\| 0\) === Number\(s\.ownersFrom\)\) return false;/);
});

test('HS-060 · A GUEST\'S SAVE DURING THE APPLY is theirs: the trip is not written over it (TRIPS_PENDING), and the re-run refuses it as unsent', async () => withGoogle(async () => {
  const h = await world();
  await booked(h, 'G903', [LINE.wedstay('noble-courtyard', 'Noble Courtyard Suite', 195, 'A')], { pre: false });
  const one = [CHANGES.find((c) => c.guestId === 'G903')];
  /* the guest saves a change of their own in the very moment the room engine moves */
  const engine = h.env.ROOMS.get();
  h.env.ROOMS.get = () => ({ fetch: async (r) => {
    if (new URL(r.url).pathname.endsWith('/admin-rebook')) {
      const d = await h.actors['INV-G903'].a.storage.get('draft');
      await h.call('/api/draft', 'G903', { invitationId: 'INV-G903', keys: { 'siyl.temple': JSON.stringify({ G903: { offering: 'yes' } }) }, baseUpdatedAt: d.updatedAt }, 'PUT');
    }
    return engine.fetch(r);
  } });
  const r = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: one, apply: true });
  assert.equal(r.status, 409, JSON.stringify(r.d).slice(0, 300)); assert.equal(r.d.reason, 'TRIPS_PENDING');
  assert.equal(reg(h, 'G903').version, 1, 'the trip is not written over the guest\'s save');
  assert.equal((await h.call('/api/draft', 'G903')).d.submission.hasUnsentChanges, true, 'the guest\'s change still reads as theirs, unsent');
  h.env.ROOMS.get = () => engine;
  const again = await h.call('/api/billing/admin/rebook', 'GROOM', { order: 'HS-060', changes: one });
  assert.equal(again.status, 409); assert.ok(again.d.problems.some((p) => p.reason === 'UNSENT_CHANGES'), JSON.stringify(again.d).slice(0, 300));
}));
