/* ============================================================================
   THE OWNERS' SEATING & ROOM ASSIGNMENTS · the BILLING_ADMIN routes (src/billing-routes.js) over the real engines.
     · a guest reaches none of them (403, no engine asked)
     · every guest a write names is resolved from the served index — never from what the console sent
     · a room booked without a room label, or fixed by a booking the Owners recorded, is never moved
     · no write while the clean reset sweeps; the public engine routes never forward an Owner header
   Fictional guests (G9xx) only; Google is not reachable here — names fall back to first names, dates are a named gap.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

const AUTH_STUB = 'data:text/javascript,' + encodeURIComponent(`
export async function identify() { return globalThis.__assignIdentity || null; }
export async function loadIndex() { return globalThis.__assignIndex || {}; }
export function owns() { return true; }
export async function authIdOf() { return null; }
export function displayName(v) { return String(v || ''); }`);
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (context.parentURL && context.parentURL.endsWith('/src/billing-routes.js') && specifier === './auth.js') return { url: ${JSON.stringify(AUTH_STUB)}, shortCircuit: true };
  return next(specifier, context);
}`));
const { handleBilling } = await import('../src/billing-routes.js');
const { Seating } = await import('../src/seating.js');
const { Rooms } = await import('../src/rooms.js');
const { doState } = await import('./sandbox.mjs');

const two = (n) => String(n).padStart(2, '0');
const GRID = { ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) GRID.ceremony.rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1) })) });
for (const k of ['T', 'B']) for (let n = 1; n <= 26; n++) if (n !== 13) GRID.dinner.sides[k].push({ seatId: 'D-' + k + '-' + two(n) });
const INDEX = { a: { i: 'INV-G901', g: 'G901', p: 'INV-900', c: 'C901' }, b: { i: 'INV-G902', g: 'G902', p: 'INV-900', c: 'C902' }, d: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B' }, e: { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' } };
const GROOM = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
const GUEST = { invitationId: 'INV-G901', guestId: 'G901' };
const KEY = 'wedstay/heritage-executive';
function kv(init) { const m = new Map(Object.entries(init || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [], list_complete: true }) }; }
async function world(store) {
  const seats = new Seating(doState()), rooms = new Rooms(doState()), asked = [];
  await seats.fetch(new Request('https://seating/api/seating/config', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify(GRID) }));
  await rooms.storage.put('occ:' + KEY + '|A|G901', { invitationId: 'INV-G901', partyId: 'INV-900', name: 'Ada', at: 'x' });
  await rooms.storage.put('occ:' + KEY + '|C|G902', { invitationId: 'INV-G902', partyId: 'INV-900', name: 'Ben', at: 'x' });
  const env = { SHEETS_ID: 'synthetic', BILLING_LEDGER: { idFromName: () => 'x', get: () => ({ fetch: async () => Response.json({ ok: true }) }) }, REG_KV: kv(store),
    SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => { asked.push(new URL(r.url).pathname); return seats.fetch(r); } }) },
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => { asked.push(new URL(r.url).pathname); return rooms.fetch(r); } }) } };
  const stale = [];
  const deps = { cohortStale: () => stale.push(1), resetLocked: async () => !!deps.locked };
  return { seats, rooms, env, deps, asked, stale };
}
async function hit(W, identity, op, body) {
  globalThis.__assignIdentity = identity; globalThis.__assignIndex = INDEX;
  const url = new URL('https://stage.invalid/api/billing/' + op);
  const was = globalThis.fetch; globalThis.fetch = async () => new Response('{}', { status: 503 });   /* Google is not reachable */
  try {
    const r = await handleBilling(new Request(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}), W.env, url, {}, W.deps);
    return { status: r.status, j: await r.json() };
  } finally { globalThis.fetch = was; }
}

test('ROUTES · a guest reaches none of them — 403, no engine asked', async () => {
  const W = await world();
  for (const [op, body] of [['admin/assignments'], ['admin/seating/apply', {}], ['admin/seating/final', {}], ['admin/seating/state', { frozen: true }], ['admin/rooms/apply', {}], ['admin/rooms/final', {}]]) {
    const r = await hit(W, GUEST, op, body); assert.equal(r.status, 403, op);
  }
  assert.deepEqual(W.asked, []);
});

test('ROUTES · the Owners read everything in one answer: both plans (52 + the couple · 54), every guest, every room; Google out of reach is a named gap, never a failure', async () => {
  const W = await world({ 'reg:INV-G901': { submissionId: 'S1', version: 1, registration: { guestRecord: { scope: { vientianeWedding: true } }, templeCeremony: { guests: [{ guestId: 'G901', events: { vows: 'Joining', dinner: 'Joining' } }] } } } });
  const r = await hit(W, GROOM, 'admin/assignments');
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.people, 54);
  assert.equal(r.j.seating.events.ceremony.seats.length, 52); assert.equal(r.j.seating.events.dinner.seats.length, 54);
  assert.deepEqual(r.j.seating.events.ceremony.couple.map((c) => c.guestId), ['G048', 'G049'], 'the couple from the register\'s roles');
  const ada = r.j.roster.find((g) => g.guestId === 'G901');
  assert.deepEqual([ada.booking, ada.attendance.ceremony, ada.rooms[0].label], ['SENT', 'yes', 'A']);
  assert.ok(r.j.rooms.stays.some((s) => s.window === 'wedstay'));
  assert.ok(r.j.gaps.length >= 1, 'Google out of reach is said');
  assert.equal(r.j.audience, 'GROOM');
});

test('ROUTES · a seat write: every guest resolved from the index (an invitation the console sends is ignored), the Owner\'s label as the actor, the Wedding Circle read again; an unknown guest refused; no write while the reset sweeps', async () => {
  const W = await world();
  const bad = await hit(W, GROOM, 'admin/seating/apply', { event: 'dinner', target: { 'D-T-27': 'G999' }, expect: { 'D-T-27': null } });
  assert.equal(bad.status, 400); assert.equal(bad.j.reason, 'UNKNOWN_GUEST');
  const ok = await hit(W, GROOM, 'admin/seating/apply', { event: 'dinner', target: { 'D-T-27': 'G901' }, expect: { 'D-T-27': null }, guests: { G901: { invitationId: 'INV-FORGED' } } });
  assert.equal(ok.status, 200, JSON.stringify(ok.j));
  const hold = await W.seats.storage.get('hold:dinner:D-T-27');
  assert.equal(hold.invitationId, 'INV-G901', 'from the index, never from the body'); assert.equal(hold.by, 'owners:GROOM');
  assert.equal(W.stale.length, 1, 'the Wedding Circle reads the seats again');
  W.deps.locked = true;
  const locked = await hit(W, GROOM, 'admin/seating/apply', { event: 'dinner', target: { 'D-T-28': 'G902' }, expect: { 'D-T-28': null } });
  assert.equal(locked.status, 503); assert.equal(locked.j.reason, 'RESET');
  assert.equal(await W.seats.storage.get('hold:dinner:D-T-28'), undefined);
  assert.equal((await hit(W, GROOM, 'admin/seating/state', { frozen: true })).status, 503, 'the self-service switch waits for the reset too');
  assert.equal((await hit(W, GROOM, 'admin/seating/final', { event: 'dinner', action: 'withdraw' })).status, 503);
  assert.equal((await hit(W, GROOM, 'admin/rooms/final', { action: 'withdraw' })).status, 503);
  W.deps.locked = false;
  const st = await hit(W, GROOM, 'admin/seating/state', { frozen: true });
  assert.equal(st.status, 200); assert.equal(st.j.frozen, true);
});

test('ROUTES · a room write: a sent booking without a room label, or a room the Owners fixed in a recorded booking, is never moved; otherwise the engine re-arranges, the Owner named', async () => {
  const W = await world({
    'reg:INV-G901': { submissionId: 'S1', registration: { selections: [{ id: 'wedstay', room: 'heritage-executive', qty: 1 }] } },
    'obk-index': { G902: ['INV-G777'] } });
  const move = (g, from, to) => ({ target: { [KEY + '|' + from]: [], [KEY + '|' + to]: [g] }, expect: { [KEY + '|' + from]: [g], [KEY + '|' + to]: [] } });
  const a = await hit(W, GROOM, 'admin/rooms/apply', move('G901', 'A', 'B'));
  assert.equal(a.status, 409); assert.equal(a.j.problems[0].reason, 'NO_BILLED_ROOM');
  const b = await hit(W, GROOM, 'admin/rooms/apply', move('G902', 'C', 'D'));
  assert.equal(b.status, 409); assert.equal(b.j.problems[0].reason, 'OWNER_RECORDED');
  assert.ok(await W.rooms.storage.get('occ:' + KEY + '|A|G901') && await W.rooms.storage.get('occ:' + KEY + '|C|G902'), 'nothing moved');
  W.env.REG_KV.m.set('reg:INV-G901', JSON.stringify({ submissionId: 'S1', registration: { selections: [{ id: 'wedstay', room: 'heritage-executive', unit: 'A', qty: 1 }] } }));
  const c = await hit(W, GROOM, 'admin/rooms/apply', move('G901', 'A', 'B'));
  assert.equal(c.status, 200, JSON.stringify(c.j)); assert.equal((await W.rooms.storage.get('occ:' + KEY + '|B|G901')).by, 'owners:GROOM');
});

test('THE PUBLIC ROUTES · /api/seating and /api/rooms never forward an Owner header: the GR token alone, or a forged header, reaches no admin operation', async () => {
  const w = (await import('../src/worker.js')).default;
  const seen = [];
  const env = { GR_TOKEN: 'gr-secret', ASSETS: { fetch: async () => new Response(JSON.stringify({ v: 2, entries: INDEX })) },
    SEATING: { idFromName: () => 's', get: () => ({ fetch: async (r) => { seen.push(['seating', new URL(r.url).pathname, r.headers.get('x-siyl-admin'), r.headers.get('x-gr-verified')]); return Response.json({ ok: false }, { status: 404 }); } }) },
    ROOMS: { idFromName: () => 'r', get: () => ({ fetch: async (r) => { seen.push(['rooms', new URL(r.url).pathname, r.headers.get('x-siyl-admin'), r.headers.get('x-gr-verified')]); return Response.json({ ok: false }, { status: 404 }); } }) } };
  for (const p of ['/api/seating/admin-apply', '/api/rooms/admin-apply', '/api/seating/admin-read']) {
    await w.fetch(new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev' + p, { method: 'POST', headers: { 'x-gr-token': 'gr-secret', 'x-siyl-admin': 'BRIDE', 'x-gr-verified': 'yes' }, body: '{}' }), env);
  }
  assert.ok(seen.length >= 2, 'the requests reached the engines as plain requests: ' + JSON.stringify(seen));
  assert.ok(seen.every((x) => x[2] === null), 'the Owner header never passes'); assert.ok(seen.every((x) => x[3] === null), 'an admin operation is not a GR operation');
});
