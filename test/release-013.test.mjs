/* RELEASE 013 (Owner, 19 Sep 2026) — FINAL CONSOLIDATED REPAIR + CLEAN-STATE TEST RUN.
   · THE CLEAN RESET: one Guest-Relations-protected operation — dry run by default, execution only with the exact words —
     clears every guest-generated occupancy (never the FIXED allocation), every seat hold (never the geometry), every draft
     actor and every guest KV record, returns the backup, stamps the epoch; the draft read carries the epoch; a write that
     does not carry it is refused; a device honours it once, keeping only an edit made while the copy was being read.
   · QUESTION 5 ("Anything you would rather avoid?") is gone from every surface; the flavour stays as shipped.
   · THE BANGKOK CLIP: the destination card declares the local H.264 derivative, gate V1 reads the streams by name. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, doState, PEGGY } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { FIXED } from '../src/inventory-seed.js';
import { SEAT_FIXTURE } from './fixtures.mjs';
import { composeGuestMail } from '../src/mail-templates.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const GR = 'secret-token-of-guest-relations';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); const enc = (v) => (v instanceof ArrayBuffer ? v : new TextEncoder().encode(String(v)).buffer); return { m, failGet: false,
  get: async (k, o) => { if (m.failGet) throw new Error('kv down'); if (!m.has(k)) return null; const v = m.get(k).v; return o && o.type === 'arrayBuffer' ? enc(v) : (v instanceof ArrayBuffer ? new TextDecoder().decode(v) : v); },
  getWithMetadata: async (k, o) => { if (!m.has(k)) return { value: null, metadata: null }; const v = m.get(k).v; return { value: o && o.type === 'arrayBuffer' ? enc(v) : v, metadata: m.get(k).meta || null }; },
  put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };

/* the Worker with every store in memory: a host (the FIXED penthouse), Peggy and Sam with holds, seats, drafts, contacts and a submission */
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const host = await bearerOf('demo-host-g048'), peggy = await bearerOf('demo-peggy-g001'), sam = await bearerOf('demo-sam-g777');
  const entries = {};
  entries[await authIdOf(host)] = { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1 };
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002' };
  entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const rooms = new Rooms(doState()); const roomsStub = { fetch: (r) => rooms.fetch(r) };
  const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() }); const seatStub = { fetch: (r) => seating.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), GR_TOKEN: GR, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com',
    ROOMS: { idFromName: () => 'rooms', get: () => roomsStub }, SEATING: { idFromName: () => 'seating', get: () => seatStub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r), a }; } return actors[n]; } };
  return { w, env, host, peggy, sam, rooms, seating, actors };
}
const call = (h, path, bearer, body, method) => h.w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), h.env).then(async (r) => ({ status: r.status, d: await r.json() }));
const gr = (h, path, body) => h.w.fetch(req(path, { 'x-gr-token': GR }, body || {}, 'POST'), h.env).then(async (r) => ({ status: r.status, d: await r.json() }));

async function populate(h) {
  /* rooms: Peggy holds Souphattra prewed A and the Riverside; Sam holds a Kunming room; the host chose U Sathorn beside the fixed penthouse */
  for (const [b, key] of [[h.peggy, 'prewed/heritage'], [h.peggy, 'riverside/superior-window'], [h.sam, 'kmg/smart-family'], [h.host, 'bkk-stay/u-sathorn-superior-garden']]) {
    const who = { INV: null }; const r = await call(h, '/api/rooms/join', b, { invitationId: b === h.peggy ? 'INV-G001' : b === h.sam ? 'INV-G777' : 'INV-G048', guestId: b === h.peggy ? 'G001' : b === h.sam ? 'G777' : 'G048', key, label: 'A', name: 'x' });
    assert.equal(r.status, 200, key + ' held');
  }
  /* seating: the geometry (configuration) and two guest seats */
  assert.equal((await gr(h, '/api/seating/config', { ...SEAT_FIXTURE, actor: 'test' })).d.ok, true);
  assert.equal((await gr(h, '/api/seating/state', { open: true, actor: 'test' })).d.ok, true);
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'ceremony').filter((s) => !s.family).map((s) => s.seatId);
  assert.equal((await call(h, '/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'ceremony', seatId: free[0], name: 'Peggy' })).d.ok, true);
  assert.equal((await call(h, '/api/seating/select', h.sam, { invitationId: 'INV-G777', guestId: 'G777', event: 'ceremony', seatId: free[1], name: 'Sam' })).d.ok, true);
  /* drafts (the actor and the KV mirror), contacts, a submission with history, a photo */
  for (const [b, inv] of [[h.peggy, 'INV-G001'], [h.sam, 'INV-G777'], [h.host, 'INV-G048']]) {
    const r = await call(h, '/api/draft', b, { invitationId: inv, keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]), 'siyl.guest': JSON.stringify({ contact: { email: 'x@example.org', phone: '+66 81 000 0000' }, scope: { all: true } }) } }, 'PUT');
    assert.equal(r.status, 200, inv + ' draft');
  }
  await h.env.REG_KV.put('reg:INV-G001', JSON.stringify({ invitationId: 'INV-G001', submissionId: 'SYL-G001-TEST', registration: {} }), { metadata: {} });
  await h.env.REG_KV.put('reg:INV-G001:prev:2026-09-16T15:52:46.758Z', JSON.stringify({ old: true }), { metadata: {} });
  await h.env.REG_KV.put('avatar:INV-G777', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255, 1, 2]).buffer, { metadata: { type: 'image/png' } });
}
const counts = async (h) => {
  const plan = (await gr(h, '/api/rooms/plan', {})).d; let occ = 0, fixed = 0;
  for (const units of Object.values(plan.units)) for (const u of units) for (const o of (u.occupants || [])) { if (u.reservedFor && /Bride/.test(u.reservedFor) && FIXED.some((f) => f.guestId === o.guestId)) fixed++; else occ++; }
  const seats = (await gr(h, '/api/seating/plan', {})).d; let held = 0; const walk = (o) => { if (Array.isArray(o)) { o.forEach(walk); return; } if (o && typeof o === 'object') { if (o.guestId && o.seatId) held++; Object.values(o).forEach((v) => { if (v && typeof v === 'object') walk(v); }); } }; walk(seats.events || {});
  const keys = [...h.env.REG_KV.m.keys()].filter((k) => /^(draft|contact|avatar|reg):/.test(k));
  return { occ, fixed, held, keys: keys.length, open: seats.open, frozen: seats.frozen };
};

test('THE CLEAN RESET · the dry run names everything and writes nothing; the snapshot carries every value (binary as base64 with its metadata) and a digest; the execution needs the words AND the digest, takes the epoch into every actor first, clears every guest-generated occupancy, seat, draft and record, keeps the FIXED allocation and the seating geometry; a write in flight without the epoch is refused even with KV down; a second run finds nothing', async () => {
  const h = await harness(); await populate(h);
  const before = await counts(h);
  assert.deepEqual(before, { occ: 4, fixed: 2, held: 2, keys: 9, open: true, frozen: false }, 'the populated state: four guest holds beside the two fixed places, two seats, nine guest records (drafts, contacts, a submission and its history, a photo)');
  /* nobody but Guest Relations */
  assert.equal((await call(h, '/api/gr/reset', h.host, { dryRun: true })).status, 401, 'a host bearer is not the GR token');
  assert.equal((await h.w.fetch(req('/api/gr/reset', {}, { dryRun: true }), h.env)).status, 401);
  /* 1 · the dry run */
  const dry = await gr(h, '/api/gr/reset', { dryRun: true });
  assert.equal(dry.status, 200); assert.equal(dry.d.mode, 'dry-run'); assert.equal(dry.d.dryRun, true);
  assert.equal(dry.d.rooms.occupancies, 4); assert.equal(dry.d.rooms.fixed, 2); assert.equal(dry.d.seating.holds, 2); assert.equal(dry.d.drafts.had, 3); assert.equal(dry.d.kv.keys.length, 9); assert.match(dry.d.digest, /^[a-f0-9]{64}$/); assert.equal(dry.d.backup, undefined);
  assert.deepEqual(await counts(h), before, 'the dry run wrote nothing');
  /* 2 · the snapshot: every value, lossless */
  const snap = await gr(h, '/api/gr/reset', { dryRun: true, snapshot: true });
  assert.equal(snap.d.mode, 'snapshot'); assert.equal(snap.d.digest, dry.d.digest, 'the same state, the same digest');
  assert.deepEqual(Object.keys(snap.d.backup).sort(), ['avatar:INV-G777', 'contact:INV-G001', 'contact:INV-G048', 'contact:INV-G777', 'do:draft:INV-G001', 'do:draft:INV-G048', 'do:draft:INV-G777', 'draft:INV-G001', 'draft:INV-G048', 'draft:INV-G777', 'hold:ceremony:' + snap.d.seating.rows[0].seatId, 'hold:ceremony:' + snap.d.seating.rows[1].seatId, 'occ:bkk-stay/u-sathorn-superior-garden|A|G048', 'occ:kmg/smart-family|A|G777', 'occ:prewed/heritage|A|G001', 'occ:riverside/superior-window|A|G001', 'reg:INV-G001', 'reg:INV-G001:prev:2026-09-16T15:52:46.758Z'].sort(), 'every value that would go is in the snapshot');
  const av = snap.d.backup['avatar:INV-G777']; assert.equal(av.bytes, 8); assert.deepEqual([...Buffer.from(av.base64, 'base64')], [0x89, 0x50, 0x4e, 0x47, 0, 255, 1, 2], 'the photo bytes, exactly'); assert.deepEqual(av.metadata, { type: 'image/png' });
  assert.equal(JSON.parse(Buffer.from(snap.d.backup['reg:INV-G001'].base64, 'base64').toString()).submissionId, 'SYL-G001-TEST');
  assert.ok(snap.d.backup['occ:prewed/heritage|A|G001'].at && snap.d.backup['occ:prewed/heritage|A|G001'].invitationId === 'INV-G001', 'the engine record with its timestamp and names');
  assert.ok(snap.d.backup['do:draft:INV-G777'].keys['siyl.bag'], 'the actor\'s draft');
  assert.deepEqual(await counts(h), before, 'the snapshot wrote nothing');
  /* 3 · the words and the digest are both mandatory; a changed state is refused */
  assert.equal((await gr(h, '/api/gr/reset', { dryRun: false })).status, 400);
  assert.equal((await gr(h, '/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE' })).status, 400, 'no digest, no execution');
  assert.equal((await gr(h, '/api/gr/reset', { dryRun: false, confirm: 'reset all guest state', digest: snap.d.digest })).status, 400);
  await h.env.REG_KV.put('contact:INV-G777', JSON.stringify({ email: 'changed@example.org' }), { metadata: {} });
  await call(h, '/api/rooms/join', h.sam, { invitationId: 'INV-G777', guestId: 'G777', key: 'ljg/viewing-270', label: 'A', name: 'x' });
  const stale = await gr(h, '/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: snap.d.digest });
  assert.equal(stale.status, 409, 'the state changed since the snapshot (a new hold): snapshot again'); assert.notEqual(stale.d.digest, snap.d.digest);
  assert.equal((await counts(h)).occ, 5, 'a refused execution wrote nothing');
  /* 4 · the execution, bound to a fresh snapshot */
  const snap2 = await gr(h, '/api/gr/reset', { dryRun: true, snapshot: true });
  const run = await gr(h, '/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: snap2.d.digest, actor: 'test' });
  assert.equal(run.status, 200); assert.equal(run.d.mode, 'execute'); assert.equal(run.d.dryRun, false); assert.ok(run.d.epoch);
  assert.equal(run.d.rooms.cleared, 5); assert.equal(run.d.rooms.remaining, 0); assert.equal(run.d.seating.cleared, 2); assert.equal(run.d.seating.remaining, 0);
  assert.equal(run.d.drafts.cleared, 3); assert.equal(run.d.kv.deleted, 9); assert.deepEqual(run.d.remaining, { occupancies: 0, holds: 0, kvKeys: 0 });
  assert.equal(run.d.backup, undefined, 'the execution returns no values — the backup exists before it');
  const after = await counts(h);
  assert.deepEqual(after, { occ: 0, fixed: 2, held: 0, keys: 0, open: true, frozen: false }, 'ZERO guest-generated state; the fixed places and the seating configuration stand');
  assert.equal(h.env.REG_KV.m.get('reset:epoch').v, run.d.epoch, 'the epoch is stored');
  /* the hosts' view: the fixed arrangement, nothing of their own */
  const hv = (await call(h, '/api/rooms/mine', h.host, {})).d; assert.deepEqual(JSON.parse(JSON.stringify(hv.mine)), {}); assert.equal(hv.fixed['bkk-stay'].key, 'bkk-stay/penthouse');
  /* a second run: nothing left */
  const again = await gr(h, '/api/gr/reset', { dryRun: true }); assert.equal(again.d.rooms.occupancies, 0); assert.equal(again.d.seating.holds, 0); assert.equal(again.d.drafts.had, 0); assert.equal(again.d.kv.keys.length, 0);
  /* the actors never re-seed from a mirror; the read carries the actor's epoch */
  const g = await call(h, '/api/draft', h.peggy); assert.equal(g.status, 200); assert.equal(g.d.draft, null); assert.equal(g.d.resetAt, run.d.epoch, 'the read carries the epoch'); assert.equal(g.d.submission.submissionStatus, 'draft');
  /* a write that does not carry the epoch is refused — by the Worker, and by the actor itself when KV cannot be read (fail closed: 503, never a write) */
  const stale2 = await call(h, '/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, baseUpdatedAt: null }, 'PUT');
  assert.equal(stale2.status, 409); assert.equal(stale2.d.error, 'reset'); assert.equal(stale2.d.resetAt, run.d.epoch);
  h.env.REG_KV.m.failGet = true;
  const down = await call(h, '/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) } }, 'PUT');
  assert.equal(down.status, 503, 'KV down: the write is not accepted on a guess'); assert.equal(down.d.retry, true);
  h.env.REG_KV.m.failGet = false;
  /* the actor's own fence: a write reaching the actor without the epoch is refused inside it */
  const direct = await h.actors['INV-G001'].a.fetch(new Request('https://drafts/put', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-G001', keys: { 'siyl.bag': '[{"id":"train"}]' } }) }));
  assert.equal(direct.status, 409); assert.equal((await direct.json()).error, 'reset');
  assert.equal((await call(h, '/api/draft', h.peggy)).d.draft, null, 'the old trip did not come back');
  const fresh = await call(h, '/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.skip': '[]' }, seenReset: run.d.epoch }, 'PUT'); assert.equal(fresh.status, 200);
  const bc = await h.w.fetch(req('/api/draft?beacon=1', {}, { invitationId: 'INV-G001', keys: { 'siyl.skip': '[]' }, baseUpdatedAt: fresh.d.updatedAt, bearer: h.peggy }), h.env); assert.equal(bc.status, 409, 'the beacon needs the epoch too');
  /* the CLI: three steps, the backup verified before the words may be given */
  assert.match(src('src/gr.cjs'), /case 'reset': \{/); assert.match(src('src/gr.cjs'), /if \(confirm !== 'RESET ALL GUEST STATE'\)/); assert.match(src('src/gr.cjs'), /a verified backup is required: run `reset --snapshot` first/); assert.match(src('src/gr.cjs'), /reset-backup-' \+ stamp \+ '\.private\.json/); assert.match(src('src/gr.cjs'), /digest: b\.digest/);
  assert.match(src('.gitignore'), /src\/\*\.private\.json/, 'the backup is never committed');
});

test('THE CLEAN RESET · a write racing the sweep: the actor takes the epoch before anything else goes, so a device that saves in that instant is refused, not stored', async () => {
  const h = await harness(); await populate(h);
  const snap = await gr(h, '/api/gr/reset', { dryRun: true, snapshot: true });
  /* the race: the rooms actor is slow; a PUT of the old trip arrives while the Worker is still sweeping */
  const roomsStub = h.env.ROOMS.get(); const orig = roomsStub.fetch;
  let putDuringSweep = null;
  roomsStub.fetch = async (r) => { const body = await r.clone().json().catch(() => ({})); if (/\/reset$/.test(new URL(r.url).pathname) && body.dryRun === false && !putDuringSweep) { putDuringSweep = await call(h, '/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, seenReset: null }, 'PUT'); } return orig(r); };
  const run = await gr(h, '/api/gr/reset', { dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: snap.d.digest });
  assert.equal(run.status, 200);
  assert.ok(putDuringSweep, 'the racing write happened during the sweep'); assert.equal(putDuringSweep.status, 409); assert.equal(putDuringSweep.d.error, 'reset');
  assert.equal((await call(h, '/api/draft', h.peggy)).d.draft, null, 'nothing of it was stored');
  assert.deepEqual(await counts(h), { occ: 0, fixed: 2, held: 0, keys: 0, open: true, frozen: false });
});

test('THE CLEAN RESET · a device that synchronised before the epoch drops its whole cached journey (a key touched while the copy was being read included); every later write names the epoch; a refused write clears and reads again; a device that never synchronised keeps what it typed', async () => {
  const fetches = [];
  const server = { resetAt: '2026-09-19T12:00:00.000Z', draft: null, puts: [] };
  const fetchImpl = async (url, init) => {
    fetches.push((init && init.method) || 'GET');
    if (!init || !init.method || init.method === 'GET') return { json: async () => ({ ok: true, draft: server.draft, submission: { submissionStatus: 'draft' }, resetAt: server.resetAt }) };
    const body = JSON.parse(init.body); server.puts.push(body);
    if (server.resetAt && body.seenReset !== server.resetAt) return { status: 409, json: async () => ({ ok: false, error: 'reset', resetAt: server.resetAt }) };
    const now = '2026-09-19T12:30:00.000Z'; server.draft = { keys: Object.assign({}, server.draft && server.draft.keys, body.keys), updatedAt: now, savedAt: now };
    return { status: 200, json: async () => ({ ok: true, savedAt: now, updatedAt: now, submission: { submissionStatus: 'draft' } }) };
  };
  const MODS = ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/guest.js', 'assets/draft.js'];
  /* device 1: cached an old trip and a meta that predates the reset — a pull first; a key touched during the read goes too */
  const w = page({ auth: PEGGY, fetch: async (u, i) => { if (!i || !i.method || i.method === 'GET') { w.localStorage.setItem('siyl.skip', '["kmg","ljg"]'); } return fetchImpl(u, i); }, modules: MODS,
    seed: { 'siyl.bag': [{ id: 'train', price: 100, qty: 1 }], 'siyl.skip': ['kmg'], 'siyl.guest': { contact: { email: 'old@example.org' } }, 'siyl.draft.meta': { invitationId: PEGGY.invitationId, serverUpdatedAt: '2026-09-18T10:00:00.000Z', dirty: false }, 'siyl.draft.base': { 'siyl.bag': '[{"id":"train","price":100,"qty":1}]' } } });
  const D = w.SIYL_DRAFT; await D.pull();
  for (const k of ['siyl.bag', 'siyl.skip', 'siyl.guest', 'siyl.draft.base', 'siyl.draft.meta']) assert.equal(w.localStorage.getItem(k), null, k + ' is gone');
  assert.equal(w.localStorage.getItem('siyl.draft.reset'), server.resetAt, 'the epoch is remembered'); assert.equal(server.puts.length, 0, 'nothing was pushed back');
  /* a later save names the epoch and is accepted; the same epoch on the next pull clears nothing */
  w.SIYL_BAG.put({ id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 });
  const r = await D.push('save'); assert.equal(r.ok, true); assert.equal(server.puts[server.puts.length - 1].seenReset, server.resetAt);
  await D.pull(); assert.ok(w.localStorage.getItem('siyl.bag'), 'a trip made after the reset stays');
  /* device 2: unsent changes with a known revision — it pushes first, is refused with the epoch, clears and reads again */
  server.draft = null; server.puts = [];
  const w2 = page({ auth: PEGGY, fetch: fetchImpl, modules: MODS, seed: { 'siyl.bag': [{ id: 'mu9646', price: 155, qty: 1 }], 'siyl.draft.meta': { invitationId: PEGGY.invitationId, serverUpdatedAt: '2026-09-18T10:00:00.000Z', dirty: true }, 'siyl.draft.base': { 'siyl.bag': '[]' } } });
  await w2.SIYL_DRAFT.pull();
  assert.equal(server.puts.length, 1); assert.equal(server.puts[0].seenReset, null, 'the old device pushed without the epoch'); assert.equal(server.draft, null, 'and was refused: the old trip is not on the server');
  assert.equal(w2.localStorage.getItem('siyl.bag'), null, 'the refused device cleared its cache'); assert.equal(w2.localStorage.getItem('siyl.draft.reset'), server.resetAt);
  /* device 3: never synchronised (no base, no revision) — what it typed before its first read is post-reset and stays */
  server.draft = null; server.puts = [];
  const w3 = page({ auth: PEGGY, fetch: fetchImpl, modules: MODS, seed: { 'siyl.skip': ['ljg'] } });
  await w3.SIYL_DRAFT.pull();
  assert.equal(w3.localStorage.getItem('siyl.skip'), '["ljg"]', 'a fresh device keeps its answer'); assert.equal(w3.localStorage.getItem('siyl.draft.reset'), server.resetAt);
  assert.ok(server.puts.length >= 1, 'and its draft becomes the server\'s'); assert.ok(server.puts.every((x) => x.seenReset === server.resetAt)); assert.equal(server.draft.keys['siyl.skip'], '["ljg"]');
  assert.match(src('assets/draft.js'), /seenReset: seenReset\(\), bearer: a\.bearer/, 'the beacon carries the epoch');
});

test('QUESTION 5 REMOVED · "Anything you would rather avoid?" is on no surface: the model, About You, Review, the emails; an old answer under `avoid` is tolerated and never required; the flavour question is intact', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST;
  assert.deepEqual(JSON.parse(JSON.stringify(G.PROFILE.map((q) => q.key))), ['coffeetea', 'flavor', 'drink', 'film', 'music']);
  assert.deepEqual(JSON.parse(JSON.stringify(G.PROFILE.map((q) => q.n))), ['02', '03', '04', '05', '06'], 'the numbering closes the gap');
  assert.ok(!G.PROFILE.some((q) => /avoid/i.test(q.q)));
  const fl = G.PROFILE.find((q) => q.key === 'flavor'); assert.deepEqual(JSON.parse(JSON.stringify(fl.choices)), ['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk']); assert.equal(fl.type, 'choice');
  /* an old draft with the retired answer: nothing crashes, nothing is required of it, the step completes without it */
  const id = G.me().guestId;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); G.setAllergy('no'); G.setPhotoAck(true);
  const old = JSON.parse(w.localStorage.getItem('siyl.guest')); old.guests[id].profile = Object.assign({}, old.guests[id].profile, { avoid: 'Cilantro' }); w.localStorage.setItem('siyl.guest', JSON.stringify(old));
  G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered'));
  assert.deepEqual(JSON.parse(JSON.stringify(G.missingFor('about'))), [], 'About You is complete without the retired question');
  for (const f of ['assets/guest.js', 'about-you.html', 'review.html', 'profile.html']) assert.doesNotMatch(src(f).replace(/QUESTION 5 REMOVED[^\n]*\n[^\n]*\n/g, '').replace(/Question 5, "rather avoid", retired[^\n]*/g, ''), /rather avoid\?/, f + ' does not ask it');
  assert.doesNotMatch(src('src/mail-templates.js'), /'avoid', 'Rather avoid'/, 'the emails do not list it');
  const rec = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', firstSentAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z', recipient: { email: 'sam@example.org', phone: '+66' },
    registration: { channel: 'journey-shop', guestId: 'G777', totalUsd: 0, contact: { email: 'sam@example.org', phone: '+66' }, selections: [], guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: { coffeetea: 'Oolong', flavor: 'Pandan', avoid: 'Cilantro', film: 'Film' } }] } } };
  const m = composeGuestMail(rec); assert.ok(!/Cilantro|Rather avoid/.test(m.text), 'an old answer is never rendered'); assert.ok(/Pandan/.test(m.text));
});

test('THE BANGKOK CLIP · the destination card declares the local H.264 derivative of the Owner\'s file (no hotlink), the module keeps the photograph as the poster and falls back to it, gate V1 verifies the streams by name', () => {
  const idx = src('index.html');
  assert.match(idx, /<a class="am" href="destination\.html#bangkok" data-video="assets\/video\/bangkok-card\.mp4" style="background-image:url\(assets\/images\/city\/001-bangkok-chao-phraya-skyline\.jpg\)"/, 'the card: the photograph stays the poster');
  assert.ok(existsSync('assets/video/bangkok-card.mp4')); const size = statSync('assets/video/bangkok-card.mp4').size; assert.ok(size > 500000 && size <= 4.5 * 1024 * 1024, 'small: ' + size);
  const head = readFileSync('assets/video/bangkok-card.mp4').subarray(0, 4096).toString('latin1'); assert.ok(head.indexOf('ftyp') >= 0 && head.indexOf('moov') >= 0, 'faststart');
  assert.doesNotMatch(idx, /drive\.google\.com|googleusercontent/, 'never a Drive hotlink');
  const am = src('assets/aman.js');
  for (const re of [/v\.muted = true; v\.defaultMuted = true; v\.loop = true; v\.autoplay = true;/, /setAttribute\('playsinline', ''\)/, /if \(calmMotion\(\)\) \{ frame\.setAttribute\('data-video-state', 'still'\); return null; \}/, /s\.addEventListener\('error', fail\);/, /p\.then\(null, function \(\) \{ if \(v\.isConnected\) fail\(\); \}\)/, /v\.addEventListener\('playing', function \(\) \{ frame\.classList\.add\('am-playing'\)/]) assert.match(am, re);
  assert.match(src('assets/aman.css'), /\.am \.am-clip \{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;[^}]*opacity: 0;/, 'the clip is under the poster until it plays, at the card\'s own geometry');
  assert.match(src('src/release-check.cjs'), /'-of', 'json', file\]/, 'gate V1 parses the streams by field name');
});
