/* UPLOAD DURABILITY (Owner, 21 Sep 2026): a successful upload — the profile photo, a passport, a flight document — is
   permanent. It disappears only through the guest's own explicit removal or an explicit replacement that has been stored;
   never through a reload, a sign-out, a name or contact correction, a party or trip change, a room, a seat, Save my progress,
   Send updated trip, a version increment, a deploy. Omitted photo data in an unrelated request means UNCHANGED, never DELETE.
   A failed replacement keeps the earlier file. Uploads are keyed by the immutable invitation, never by a name, a booking, a
   version or a session. The Worker never cleans up an upload on its own. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { doState, src } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';
import { complete } from './complete.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); const s = { m, failNext: false, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { if (s.failNext) { s.failNext = false; throw new Error('kv down'); } m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; return s; }
function r2() { const m = new Map(); const s = { m, failNext: false, put: async (k, bytes, o) => { if (s.failNext) { s.failNext = false; throw new Error('r2 down'); } m.set(k, { key: k, bytes: new Uint8Array(bytes), size: bytes.byteLength, ...o }); }, get: async (k) => (m.has(k) ? { ...m.get(k), body: new Blob([m.get(k).bytes]).stream(), arrayBuffer: async () => m.get(k).bytes.buffer } : null), head: async (k) => (m.has(k) ? m.get(k) : null), list: async ({ prefix }) => ({ objects: [...m.values()].filter((o) => o.key.startsWith(prefix || '')).map((o) => ({ key: o.key, size: o.size, uploaded: new Date('2026-09-21T00:00:00Z'), httpMetadata: o.httpMetadata, customMetadata: o.customMetadata })), truncated: false }) }; return s; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('dur-peggy-g001'), steffie = await bearerOf('dur-steffie-g002');
  const entries = {};
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' };
  entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }, REG_KV: kv(), DOCS: r2(), GR_TOKEN: 'gr-secret',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r), a }; } return actors[n]; } };
  const call = (path, bearer, body, method) => w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  const gr = (path, body) => w.fetch(req(path, { 'x-gr-token': 'gr-secret' }, body || {}, 'POST'), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  const photo = (bearer, bytes, type, method) => w.fetch(new Request(ORIGIN + '/api/profile/photo', { method: method || 'PUT', headers: { ...(bearer ? { 'x-siyl-auth': bearer } : {}), ...(type ? { 'content-type': type } : {}) }, body: bytes }), env);
  const doc = (bearer, bytes, headers = {}) => w.fetch(new Request(ORIGIN + '/api/document', { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-invitation': 'INV-G001', 'x-guest': 'G001', 'x-kind': 'passport', 'x-filename': 'passport.jpg', ...(bearer ? { 'x-siyl-auth': bearer } : {}), ...headers }, body: bytes }), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  return { w, env, peggy, steffie, call, gr, photo, doc };
}
const A = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 1, 1, 1, 1, 1, 1, 1]);
const B = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 2, 2, 2, 2, 2, 2, 0xff, 0xd9]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, ...Array(300).fill(7), 0xff, 0xd9]);
const same = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
const regOf = (v) => ({ channel: 'journey-shop', guestId: 'G001', totalUsd: 0, contact: { email: 'peggy@example.org', phone: '+49 170 1' }, selections: [], guestRecord: { guests: [{ guestId: 'G001', name: v === 1 ? 'Peggy' : 'Margaret', source: { fullName: 'Peggy Berger', preferredName: 'Peggy' }, submitted: v === 1 ? {} : { preferredName: 'Margaret', fullName: 'Margaret Acker' }, profile: {} }] } });

test('THE PHOTO STANDS through every unrelated write: a name and contact correction, a partial contact write, Save my progress (the draft), a room hold and its release, a seat and its change, the trip sent, the trip sent again (version 2, the earlier version kept), a reset dry-run, the partner\'s own writes — the same bytes under the same immutable key every time; nothing else in the request can name or omit it', async () => {
  const h = await harness();
  const epoch = (await h.call('/api/contact', h.peggy)).d.resetAt || null;
  assert.equal((await h.photo(h.peggy, A, 'image/png')).status, 200);
  const key = 'avatar:INV-G001'; const meta0 = JSON.stringify(h.env.REG_KV.m.get(key).meta);
  const check = async (what) => {
    const got = h.env.REG_KV.m.get(key); assert.ok(got, 'the photo key stands after ' + what); assert.ok(same(got.v, A), 'the same bytes after ' + what); assert.equal(JSON.stringify(got.meta), meta0, 'the same metadata after ' + what);
    const r = await h.photo(h.peggy, undefined, undefined, 'GET'); assert.equal(r.status, 200, 'readable after ' + what); assert.ok(same(new Uint8Array(await r.arrayBuffer()), A), 'the read returns it after ' + what);
    assert.ok([...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('avatar:')).includes(key) && ![...h.env.REG_KV.m.keys()].some((k) => k.startsWith('avatar:INV-G001:') || /^avatar:.*(v\d|session|Margaret|Acker)/.test(k)), 'this one key, never a versioned or named copy, after ' + what);
  };
  const put = (bearer, body) => h.call('/api/contact', bearer, { seenReset: epoch, ...body }, 'PUT');
  assert.equal((await put(h.peggy, { invitationId: 'INV-G001', email: 'peggy@example.org', phone: '+49 170 1', firstName: 'Margaret', lastName: 'Acker', birthdate: '1990-05-17', nationality: 'Testland', address1: '1 Test Street', postal: '10000', country: 'Testland' })).status, 200); await check('the name and contact correction');
  assert.equal((await put(h.peggy, { invitationId: 'INV-G001', city: 'Hamburg' })).status, 200); await check('a partial contact write');
  assert.equal((await put(h.peggy, { invitationId: 'INV-G001', photo: null, avatar: '', profilePhoto: false })).status, 200); await check('a body that names a photo field as empty (ignored)');
  const dr = await h.call('/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.bag': '[]', 'siyl.guest': '{"contact":{"email":"peggy@example.org"}}', 'siyl.avatar': '' }, seenReset: epoch }, 'PUT'); assert.equal(dr.status, 200, JSON.stringify(dr.d).slice(0, 120)); await check('Save my progress');
  assert.equal((await h.call('/api/rooms/join', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', key: 'wedstay/heritage-executive', label: 'A', name: 'Margaret' })).status, 200); await check('a room hold');
  assert.equal((await h.call('/api/rooms/leave', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', key: 'wedstay/heritage-executive' })).status, 200); await check('the room released');
  assert.equal((await h.gr('/api/seating/config', { ...SEAT_FIXTURE, actor: 'test' })).d.ok, true); assert.equal((await h.gr('/api/seating/state', { open: true, actor: 'test' })).d.ok, true);
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'dinner').filter((s) => !s.family).map((s) => s.seatId);
  assert.equal((await h.call('/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: free[0], name: 'Margaret' })).d.ok, true); await check('a seat');
  assert.equal((await h.call('/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: free[1], name: 'Margaret' })).d.ok, true); await check('a seat change');
  /* STEP 01 IS REQUIRED ON THE SERVER (Owner, 24 Sep 2026): the partial write's city completed the stored contact — every required field stands */
  { const sc = JSON.parse(h.env.REG_KV.m.get('contact:INV-G001').v); for (const k of ['email', 'phone', 'birthdate', 'nationality', 'address1', 'postal', 'city', 'country']) assert.ok(sc[k], k + ' is stored'); }
  const s1 = await h.call('/api/register', h.peggy, { invitationId: 'INV-G001', registration: complete(regOf(1)), text: 'SEE YOU IN LAOS — test' }); assert.ok(s1.status === 200 || s1.status === 202, JSON.stringify(s1.d).slice(0, 200)); await check('the trip sent');
  const s2 = await h.call('/api/register', h.peggy, { invitationId: 'INV-G001', registration: complete(regOf(2)), text: 'SEE YOU IN LAOS — test 2' }); assert.ok(s2.status === 200 || s2.status === 202); await check('the trip sent again');
  const rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G001').v); assert.equal(rec.version, 2, 'version 2'); assert.equal([...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('reg:INV-G001:prev:')).length, 1, 'the earlier version kept — never a cleanup');
  assert.ok(!JSON.stringify(rec).includes('avatar'), 'the record never carries the photo');
  const dry = await h.gr('/api/gr/reset', {}); assert.equal(dry.d.mode, 'dry-run'); assert.equal(dry.d.kv.deleted, 0); await check('a reset dry-run (read-only)');
  assert.equal((await put(h.steffie, { invitationId: 'INV-G002', email: 'steffie@example.org', firstName: 'Steffie' })).status, 200); await check('the partner\'s contact write');
  assert.equal((await h.photo(h.steffie, B, 'image/jpeg')).status, 200); await check('the partner\'s own photo (her key, not this one)');
  assert.equal((await h.photo(h.steffie, undefined, undefined, 'DELETE')).status, 200); await check('the partner removing her own photo');
  assert.equal(h.env.REG_KV.m.has('avatar:INV-G002'), false, 'hers is gone, by her explicit removal');
});

test('A FAILED REPLACEMENT KEEPS THE PHOTO: an unsupported type, an empty body, a file over the limit, a store that fails mid-write — the earlier bytes stand and read back; a successful replacement is the only way the bytes change; an explicit DELETE is the only way they go', async () => {
  const h = await harness();
  assert.equal((await h.photo(h.peggy, A, 'image/png')).status, 200);
  const key = 'avatar:INV-G001';
  const still = async (what) => { assert.ok(same(h.env.REG_KV.m.get(key).v, A), 'A stands after ' + what); const r = await h.photo(h.peggy, undefined, undefined, 'GET'); assert.equal(r.status, 200); assert.ok(same(new Uint8Array(await r.arrayBuffer()), A), 'A reads back after ' + what); };
  assert.equal((await h.photo(h.peggy, B, 'text/plain')).status, 415); await still('an unsupported type');
  assert.equal((await h.photo(h.peggy, B, 'image/heic')).status, 415); await still('a type the photo does not accept');
  assert.equal((await h.photo(h.peggy, new Uint8Array(0), 'image/jpeg')).status, 400); await still('an empty body');
  assert.equal((await h.photo(h.peggy, new Uint8Array(1024 * 1024 + 1), 'image/jpeg')).status, 413); await still('a file over the limit');
  h.env.REG_KV.failNext = true; const down = await h.photo(h.peggy, B, 'image/jpeg'); assert.equal(down.status, 503); assert.equal((await down.json()).ok, false); await still('a store that failed mid-write');
  assert.equal((await h.photo(null, B, 'image/jpeg')).status, 401); await still('an unauthenticated write');
  assert.equal((await h.photo(h.steffie, undefined, undefined, 'DELETE')).status, 200, 'the partner\'s DELETE is her own key'); await still('the partner\'s DELETE');
  assert.equal((await h.photo(h.peggy, B, 'image/jpeg')).status, 200); assert.ok(same(h.env.REG_KV.m.get(key).v, B), 'the successful replacement is the only change');
  assert.equal((await h.photo(h.peggy, undefined, undefined, 'DELETE')).status, 200); assert.equal(h.env.REG_KV.m.has(key), false, 'gone only by the guest\'s explicit removal');
});

test('A DOCUMENT IS ITS OWN OBJECT: the passport stored once stands through a failed replacement (type, size, empty, a store that fails) and through a successful one (the new object beside it, the old never overwritten or removed); the Worker has no delete for documents; nothing under a name, a version or a session', async () => {
  const h = await harness();
  const a = await h.doc(h.peggy, JPEG); assert.equal(a.status, 201); assert.equal(a.d.status, 'RECEIVED'); const keyA = a.d.key;
  assert.match(keyA, /^doc\/INV-G001\/G001\/passport\//, 'keyed by the immutable invitation and guest id');
  const stillA = (what) => { const o = h.env.DOCS.m.get(keyA); assert.ok(o, 'A stands after ' + what); assert.ok(same(o.bytes, JPEG), 'A\'s bytes after ' + what); };
  assert.equal((await h.doc(h.peggy, JPEG, { 'content-type': 'text/plain' })).status, 415); stillA('an unsupported type');
  assert.equal((await h.doc(h.peggy, new Uint8Array(0))).status, 400); stillA('an empty body');
  assert.equal((await h.doc(h.peggy, new Uint8Array(12 * 1024 * 1024 + 1))).status, 413); stillA('a file over the limit');
  h.env.DOCS.failNext = true; const down = await h.doc(h.peggy, B); assert.equal(down.status, 503); assert.equal(down.d.status, undefined, 'never RECEIVED when nothing was stored'); stillA('a store that failed mid-write');
  assert.equal(h.env.DOCS.m.size, 1, 'no half object');
  const b = await h.doc(h.peggy, B, { 'x-filename': 'passport-2.jpg' }); assert.equal(b.status, 201); assert.notEqual(b.d.key, keyA); stillA('a successful replacement'); assert.ok(same(h.env.DOCS.m.get(b.d.key).bytes, B));
  assert.equal(h.env.DOCS.m.size, 2, 'both objects stand — the Owner\'s retention decision, never the Worker\'s');
  assert.equal((await h.doc(h.steffie, B)).status, 401, 'the partner cannot replace it'); stillA('the partner\'s attempt');
  const worker = src('src/worker.js');
  assert.equal((worker.match(/DOCS\.delete\(/g) || []).length, 1, 'ONE document delete in the Worker: the retention purge'); assert.match(worker, /if \(out\.due && !out\.dryRun\) \{ await env\.DOCS\.delete\(obj\.key\); out\.deleted\+\+; \}/, 'and only when the approved date has come — see test/retention.test.mjs');
  const ttls = worker.match(/expirationTtl[^\n]*/g) || []; assert.equal(ttls.length, 1, 'one expiry in the Worker'); assert.match(worker.slice(worker.indexOf('expirationTtl') - 400, worker.indexOf('expirationTtl')), /:prev:/, 'and it is the registration history mirror, never an upload');
  assert.doesNotMatch(worker.slice(worker.indexOf('async function handleProfilePhoto'), worker.indexOf('async function handleProfilePhoto') + 4000), /expirationTtl|expiration/, 'the photo never expires');
  assert.doesNotMatch(worker.slice(worker.indexOf('async function handleDocument'), worker.indexOf('async function handleDocument') + 4000), /expirationTtl|expiration/, 'a document never expires');
  assert.match(worker.slice(worker.indexOf('async scheduled('), worker.indexOf('async scheduled(') + 400), /purgeDocuments\(env, at, \{ dryRun: false, actor: 'cron' \}\)/, 'the one scheduled handler runs the document purge and nothing else'); assert.doesNotMatch(worker.slice(worker.indexOf('async function purgeDocuments'), worker.indexOf('async function handleGrRetention')), /REG_KV\.delete|avatar|contact:|draft:|reg:|ROOMS|SEATING|DRAFTS/, 'the purge never names a photo, a contact, a draft, a registration, a room, a seat');
  const deletes = worker.match(/REG_KV\.delete\([^)]*\)/g) || [];
  assert.deepEqual(deletes.sort(), ['REG_KV.delete(\'reset:lock\')', 'REG_KV.delete(k)', 'REG_KV.delete(key)'].sort(), 'the only KV deletes: the guest\'s own photo removal, the explicit Guest Relations clean reset and its lock');
  assert.match(worker, /const photoKey = \(invitationId\) => 'avatar:' \+ invitationId;/, 'the photo key is the invitation — never a name, a booking, a version, a session');
  assert.match(worker, /const key = `doc\/\$\{invitationId\}\/\$\{guestId\}\/\$\{kind\}\/\$\{receivedAt\}-/, 'the document key is the invitation and the guest id — a new object each time'); assert.match(worker, /owns\(await identify\(request, env\), invitationId, guestId\)/, 'both verified against the bearer');
});
