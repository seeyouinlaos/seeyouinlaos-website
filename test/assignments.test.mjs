/* ============================================================================
   THE OWNERS' SEATING & ROOM ASSIGNMENTS (Owners, 18 Nov 2026 · EMERGENCY P1) — the engines' admin operations, the guest's trip
   that stays "sent" after a placement by the Owners, and the BILLING_ADMIN routes. Fictional guests (G9xx) only.
     · only the admin console's route reaches an engine's admin operation (x-gr-verified AND the Owner named) — never the GR token
       alone, never a guest
     · a confirmed change is declarative (target + what was seen there), all or nothing, logged with the Owner's label
     · a conflict, a second seat, the couple's fixed places, an unknown guest, a category change, an extra bed, a booking change are
       refused and nothing is written
     · a placement by the Owners is the Owners', not the guest's: the guest's sent (and confirmed) trip stays sent
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { doState } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { rosterOf, attendanceOf, bookingStateOf, seatChangeOf, roomChangeOf, roomMovesOf, staysOf, guestsOfIndex } from '../src/billing/assignments.js';

const two = (n) => String(n).padStart(2, '0');
const GRID = { ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) GRID.ceremony.rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1) })) });
for (const k of ['T', 'B']) for (let n = 1; n <= 26; n++) if (n !== 13) GRID.dinner.sides[k].push({ seatId: 'D-' + k + '-' + two(n) });
const COUPLE = { BRIDE: { g: 'G048', p: 'INV-001', n: 'Haruthai' }, GROOM: { g: 'G049', p: 'INV-001', n: 'Suthep' } };
const G = (n) => ({ invitationId: 'INV-G9' + two(n), partyId: 'INV-9' + two(n), name: 'Guest' + n });

async function seating() {
  const l = new Seating(doState());
  const r = await sCall(l, 'config', GRID, { gr: true }); assert.equal(r.ok, true);
  return l;
}
function sCall(l, op, body, o = {}) {
  const headers = { ...(o.gr ? { 'x-gr-verified': 'yes' } : {}), ...(o.admin ? { 'x-siyl-admin': o.admin } : {}), ...(o.as ? { 'x-siyl-identity': JSON.stringify(o.as) } : {}), ...(o.couple === false ? {} : { 'x-siyl-couple': JSON.stringify(COUPLE) }) };
  return l.fetch(new Request('https://seating/api/seating/' + op + (o.q || ''), { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined })).then(async (x) => ({ status: x.status, ...(await x.json()) }));
}
function rCall(r, op, body, o = {}) {
  const headers = { ...(o.gr ? { 'x-gr-verified': 'yes' } : {}), ...(o.admin ? { 'x-siyl-admin': o.admin } : {}), ...(o.as ? { 'x-siyl-identity': JSON.stringify(o.as) } : {}) };
  return r.fetch(new Request('https://rooms/api/rooms/' + op, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined })).then(async (x) => ({ status: x.status, ...(await x.json()) }));
}
const hold = (l, event, seatId, n, state) => l.storage.put('hold:' + event + ':' + seatId, { invitationId: G(n).invitationId, guestId: 'G9' + two(n), partyId: G(n).partyId, name: 'Guest' + n, at: '2026-10-01T10:00:00.000Z', state: state || 'held' });
const admin = { gr: true, admin: 'BRIDE' };

/* ================================================================ the seating ledger */
test('SEATING · the admin operations answer the admin console\'s route only: never a guest, never the Guest Relations token alone', async () => {
  const l = await seating();
  for (const op of ['admin-read', 'admin-apply', 'admin-final', 'admin-state']) {
    assert.equal((await sCall(l, op, op === 'admin-read' ? null : {}, { gr: true })).status, 404, op + ' with the GR token alone');
    assert.equal((await sCall(l, op, op === 'admin-read' ? null : {}, { admin: 'BRIDE' })).status, 404, op + ' without the verified flag');
    assert.equal((await sCall(l, op, op === 'admin-read' ? null : {}, { gr: true, admin: 'SOMEONE' })).status, 404, op + ' for anyone but the Bride or the Groom');
  }
  const v = await sCall(l, 'admin-read', null, admin);
  assert.equal(v.ok, true); assert.equal(v.people, 54);
  assert.equal(v.events.ceremony.seats.length, 52); assert.equal(v.events.dinner.seats.length, 54);
  assert.deepEqual(v.events.ceremony.couple.map((c) => [c.position, c.guestId]), [['BRIDE', 'G048'], ['GROOM', 'G049']]);
  assert.ok(v.events.ceremony.rows.some((r) => r.side === 'L' && r.row === 11), 'the left block\'s row 11');
  assert.match(v.events.ceremony.digest, /^[0-9a-f]{64}$/); assert.equal(v.events.ceremony.final, null);
});

test('SEATING · move, assign, release and swap as ONE confirmed change: all or nothing, the Owners\' allocation, the guest\'s own date kept, the history of where they sat, the log', async () => {
  const l = await seating();
  await hold(l, 'ceremony', 'C-L-01-01', 1); await hold(l, 'ceremony', 'C-R-02-02', 2); await hold(l, 'ceremony', 'C-R-03-01', 3);
  const r = await sCall(l, 'admin-apply', { event: 'ceremony', guests: { G901: G(1), G902: G(2), G904: G(4) },
    target: { 'C-L-01-01': 'G902', 'C-R-02-02': 'G901', 'C-L-11-01': 'G904', 'C-R-03-01': null },
    expect: { 'C-L-01-01': 'G901', 'C-R-02-02': 'G902', 'C-L-11-01': null, 'C-R-03-01': 'G903' } }, admin);
  assert.equal(r.ok, true, JSON.stringify(r));
  const types = Object.fromEntries(r.changes.map((c) => [c.guestId, c.type]));
  assert.deepEqual(types, { G901: 'SWAP', G902: 'SWAP', G904: 'ASSIGN', G903: 'RELEASE' });
  const h1 = await l.storage.get('hold:ceremony:C-R-02-02');
  assert.equal(h1.guestId, 'G901'); assert.equal(h1.state, 'allocated'); assert.equal(h1.by, 'owners:BRIDE'); assert.deepEqual(h1.placedFrom, ['C-L-01-01']);
  assert.equal(h1.at, '2026-10-01T10:00:00.000Z', 'the guest\'s own time of joining stays theirs');
  assert.equal((await l.storage.get('hold:ceremony:C-L-11-01')).guestId, 'G904'); assert.deepEqual((await l.storage.get('hold:ceremony:C-L-11-01')).placedFrom, [null]);
  assert.equal(await l.storage.get('hold:ceremony:C-R-03-01'), undefined, 'released');
  assert.deepEqual((await l.storage.get('placed:ceremony:G903')).placedFrom, ['C-R-03-01'], 'what the release leaves: where the guest sat');
  const v = await sCall(l, 'admin-read', null, admin);
  assert.equal(v.log.length, 4); assert.ok(v.log.every((e) => e.by === 'BRIDE' && e.status === 'CONFIRMED' && e.event === 'ceremony'));
  assert.deepEqual(v.log.find((e) => e.guestId === 'G903'), { ...v.log.find((e) => e.guestId === 'G903'), type: 'RELEASE', from: 'C-R-03-01', to: null });
  /* the guest sees the Owners' seat, cannot change it, and a release tombstone ends with the guest's own choice */
  const me = { invitationId: G(1).invitationId, guestId: 'G901', partyId: G(1).partyId, firstName: 'Ada' };
  await sCall(l, 'state', { open: true }, { gr: true });
  const sel = await sCall(l, 'select', { invitationId: me.invitationId, guestId: 'G901', event: 'ceremony', seatId: 'C-R-05-01' }, { as: me });
  assert.equal(sel.status, 423, 'placed by the Owners: the guest writes to Guest Relations to change it');
  const mine = await sCall(l, 'mine', null, { as: me, q: '?invitation=' + me.invitationId });
  assert.deepEqual(mine.mine.ceremony, { G901: 'C-R-02-02' }); assert.deepEqual(mine.placed, { ceremony: { G901: ['C-L-01-01'] } });
  const g3 = { invitationId: G(3).invitationId, guestId: 'G903', partyId: G(3).partyId, firstName: 'Cy' };
  assert.deepEqual((await sCall(l, 'mine', null, { as: g3, q: '?invitation=' + g3.invitationId })).placed, { ceremony: { G903: ['C-R-03-01'] } });
  assert.equal((await sCall(l, 'select', { invitationId: g3.invitationId, guestId: 'G903', event: 'ceremony', seatId: 'C-R-05-02' }, { as: g3 })).ok, true);
  assert.equal(await l.storage.get('placed:ceremony:G903'), undefined, 'the guest\'s own choice ends the Owners\' release');
  /* the plan (Guest Relations' and the Wedding Circle's read) carries the history, nothing more */
  const plan = await sCall(l, 'plan', null, { gr: true });
  assert.deepEqual(plan.events.ceremony.seats.find((s) => s.seatId === 'C-R-02-02').placedFrom, ['C-L-01-01']);
  assert.ok(!('log' in plan) && !('final' in plan.events.ceremony), 'the plan stays lean');
});

test('SEATING · refused, and NOTHING written: a seat that changed since it was read, a guest in two seats, the couple on an ordinary chair, an unknown guest, seats not named on both sides, no couple to name', async () => {
  const l = await seating();
  await hold(l, 'dinner', 'D-T-01', 1); await hold(l, 'dinner', 'D-T-02', 2);
  const before = JSON.stringify([...(await l.storage.list({ prefix: 'hold:' }))]);
  const conflict = await sCall(l, 'admin-apply', { event: 'dinner', guests: { G903: G(3) }, target: { 'D-T-01': 'G903' }, expect: { 'D-T-01': null } }, admin);
  assert.equal(conflict.status, 409); assert.equal(conflict.reason, 'CONFLICT'); assert.equal(conflict.problems[0].now, 'G901');
  const twice = await sCall(l, 'admin-apply', { event: 'dinner', guests: { G901: G(1) }, target: { 'D-T-28': 'G901' }, expect: { 'D-T-28': null } }, admin);
  assert.equal(twice.status, 409); assert.equal(twice.reason, 'TWO_SEATS'); assert.deepEqual(twice.problems[0].seats, ['D-T-01', 'D-T-28']); assert.equal(twice.problems[0].reason, 'TWO_SEATS');
  const couple = await sCall(l, 'admin-apply', { event: 'ceremony', guests: { G049: { invitationId: 'INV-G049' } }, target: { 'C-L-02-01': 'G049' }, expect: { 'C-L-02-01': null } }, admin);
  assert.equal(couple.status, 409); assert.equal(couple.problems[0].reason, 'COUPLE_FIXED');
  const unknown = await sCall(l, 'admin-apply', { event: 'dinner', guests: {}, target: { 'D-T-05': 'G905' }, expect: { 'D-T-05': null } }, admin);
  assert.equal(unknown.problems[0].reason, 'UNKNOWN_GUEST');
  assert.equal((await sCall(l, 'admin-apply', { event: 'dinner', guests: { G903: G(3) }, target: { 'D-T-05': 'G903' }, expect: {} }, admin)).status, 400, 'nothing is written blind');
  assert.equal((await sCall(l, 'admin-apply', { event: 'ceremony', guests: { G903: G(3) }, target: { 'C-L-02-01': 'G903' }, expect: { 'C-L-02-01': null } }, { ...admin, couple: false })).status, 503, 'the couple\'s places cannot be named');
  assert.equal((await sCall(l, 'admin-apply', { event: 'dinner', guests: { G903: G(3) }, target: { 'D-T-13': 'G903' }, expect: { 'D-T-13': null } }, admin)).problems[0].reason, 'NOT_ON_PLAN', 'never a 13');
  const dry = await sCall(l, 'admin-apply', { event: 'dinner', dryRun: true, guests: { G903: G(3) }, target: { 'D-B-28': 'G903' }, expect: { 'D-B-28': null } }, admin);
  assert.equal(dry.ok, true); assert.equal(dry.dryRun, true); assert.deepEqual(dry.changes, [{ guestId: 'G903', from: null, to: 'D-B-28', type: 'ASSIGN' }]);
  assert.equal(JSON.stringify([...(await l.storage.list({ prefix: 'hold:' }))]), before, 'nothing was written');
  assert.equal((await l.storage.list({ prefix: 'log:' })).size, 0);
});

test('SEATING · the final plan: released with the digest the Owners saw, version and map kept, "changed since" when the plan moves on, withdrawn by the Owners; guests\' self-service by the Owners, logged', async () => {
  const l = await seating();
  await hold(l, 'dinner', 'D-T-01', 1);
  let v = await sCall(l, 'admin-read', null, admin);
  assert.equal((await sCall(l, 'admin-final', { event: 'dinner', action: 'release', expectDigest: 'stale' }, admin)).reason, 'CONFLICT');
  const f = await sCall(l, 'admin-final', { event: 'dinner', action: 'release', expectDigest: v.events.dinner.digest }, { gr: true, admin: 'GROOM' });
  assert.equal(f.ok, true); assert.equal(f.final.version, 1); assert.equal(f.final.by, 'GROOM');
  v = await sCall(l, 'admin-read', null, admin);
  assert.equal(v.events.dinner.final.current, true); assert.equal(v.events.dinner.final.map['D-T-01'], 'G901');
  await hold(l, 'dinner', 'D-T-02', 2);
  v = await sCall(l, 'admin-read', null, admin);
  assert.equal(v.events.dinner.final.current, false, 'changed since the release');
  const w = await sCall(l, 'admin-final', { event: 'dinner', action: 'withdraw' }, admin);
  assert.equal(w.ok, true); assert.equal(w.final.active, false);
  const st = await sCall(l, 'admin-state', { open: true, frozen: true }, admin);
  assert.equal(st.ok, true); assert.equal(st.frozen, true);
  v = await sCall(l, 'admin-read', null, admin);
  assert.deepEqual(v.log.map((e) => e.type).sort(), ['FINAL_RELEASED', 'FINAL_WITHDRAWN', 'SELF_SERVICE']);
});

/* ================================================================ the room engine */
const KEY = 'wedstay/heritage-executive';
async function roomsWith(rows) {
  const r = new Rooms(doState());
  for (const [label, n, extra] of rows) await r.storage.put('occ:' + KEY + '|' + label + '|G9' + two(n), { invitationId: G(n).invitationId, partyId: G(n).partyId, name: 'Guest' + n, at: '2026-10-0' + (n % 9 || 1) + 'T10:00:00.000Z', ...(extra || {}) });
  return r;
}
test('ROOMS · the admin operations answer the admin console\'s route only; the read lists every unit with who is there', async () => {
  const r = await roomsWith([['A', 1], ['A', 2]]);
  for (const op of ['admin-read', 'admin-apply', 'admin-final']) assert.equal((await rCall(r, op, op === 'admin-read' ? null : {}, { gr: true })).status, 404, op);
  const v = await rCall(r, 'admin-read', null, admin);
  assert.equal(v.ok, true); assert.deepEqual(v.units[KEY].find((u) => u.label === 'A').occupants.map((o) => o.guestId), ['G901', 'G902']);
  assert.match(v.digest, /^[0-9a-f]{64}$/);
});

test('ROOMS · a move into a free place and a swap inside one category: the booking time kept, the Owners\' label, where the guest slept before; the guest\'s own view names it beside `mine`, never inside', async () => {
  const r = await roomsWith([['A', 1], ['A', 2], ['C', 3]]);
  const out = await rCall(r, 'admin-apply', { target: { [KEY + '|A']: ['G901', 'G903'], [KEY + '|C']: ['G902'] }, expect: { [KEY + '|A']: ['G901', 'G902'], [KEY + '|C']: ['G903'] } }, admin);
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepEqual(out.changes.map((c) => [c.guestId, c.from, c.to, c.type]).sort(), [['G902', 'A', 'C', 'SWAP'], ['G903', 'C', 'A', 'SWAP']]);
  const row = await r.storage.get('occ:' + KEY + '|C|G902');
  assert.equal(row.by, 'owners:BRIDE'); assert.deepEqual(row.placedFrom, ['A']); assert.equal(row.at, '2026-10-02T10:00:00.000Z'); assert.equal(row.invitationId, G(2).invitationId);
  assert.equal(await r.storage.get('occ:' + KEY + '|A|G902'), undefined);
  const me = { invitationId: G(2).invitationId, guestId: 'G902', partyId: G(2).partyId, firstName: 'Bo' };
  const mine = await rCall(r, 'mine', null, { as: me });
  assert.deepEqual(mine.mine, { wedstay: { key: KEY, label: 'C' } }); assert.deepEqual(mine.placed, { wedstay: [{ key: KEY, label: 'A' }] });
  /* the guest joining the same room again keeps the Owners' placement */
  await rCall(r, 'join', { invitationId: me.invitationId, guestId: 'G902', key: KEY, label: 'C' }, { as: me });
  assert.deepEqual((await r.storage.get('occ:' + KEY + '|C|G902')).placedFrom, ['A'], 'a join of the same place keeps who placed it');
  const gm = await rCall(r, 'gr-mine', null, { gr: true });
  assert.deepEqual(gm.byGuest.G902.placed, { wedstay: [{ key: KEY, label: 'A' }] });
  const v = await rCall(r, 'admin-read', null, admin);
  assert.equal(v.log.length, 2); assert.ok(v.log.every((e) => e.by === 'BRIDE' && e.status === 'CONFIRMED' && e.key === KEY));
});

test('ROOMS · an assignment is never a booking: another category, a guest added or removed, an extra bed, a room beyond its places, a dedicated room, a party\'s kept place, a room that changed — refused, nothing written; a change of how many rooms are occupied needs the Owners\' approval', async () => {
  const r = await roomsWith([['A', 1], ['A', 2], ['C', 3]]);
  const snap = async () => JSON.stringify([...(await r.storage.list({ prefix: 'occ:' }))]);
  const before = await snap();
  const cat = await rCall(r, 'admin-apply', { target: { [KEY + '|A']: ['G901'], 'wedstay/heritage|A': ['G902'] }, expect: { [KEY + '|A']: ['G901', 'G902'], 'wedstay/heritage|A': [] } }, admin);
  assert.equal(cat.status, 409); assert.equal(cat.reason, 'BOOKING_CHANGE');
  const add = await rCall(r, 'admin-apply', { target: { [KEY + '|B']: ['G905'] }, expect: { [KEY + '|B']: [] } }, admin);
  assert.equal(add.reason, 'BOOKING_CHANGE', 'nobody joins a stay by an assignment');
  const drop = await rCall(r, 'admin-apply', { target: { [KEY + '|C']: [] }, expect: { [KEY + '|C']: ['G903'] } }, admin);
  assert.equal(drop.reason, 'BOOKING_CHANGE', 'nobody leaves a stay by an assignment');
  const beyond = await rCall(r, 'admin-apply', { target: { [KEY + '|A']: ['G901', 'G902', 'G903'], [KEY + '|C']: [] }, expect: { [KEY + '|A']: ['G901', 'G902'], [KEY + '|C']: ['G903'] } }, admin);
  assert.ok(beyond.problems.some((p) => p.reason === 'BEYOND_PLACES'), 'never beyond a room\'s own places (no extra-bed use)');
  const bed = await rCall(r, 'admin-apply', { target: { [KEY + '|I']: ['G903'], [KEY + '|C']: [] }, expect: { [KEY + '|I']: [], [KEY + '|C']: ['G903'] } }, admin);
  assert.ok(bed.problems.some((p) => p.reason === 'EXTRA_BED'), 'a room with an extra bed is never re-arranged here');
  const changed = await rCall(r, 'admin-apply', { target: { [KEY + '|C']: ['G903'], [KEY + '|B']: [] }, expect: { [KEY + '|C']: [], [KEY + '|B']: ['G903'] } }, admin);
  assert.equal(changed.reason, 'CONFLICT');
  await r.storage.put('occ:' + KEY + '|E|~INV-950~0', { invitationId: null, partyId: 'INV-950', name: '', at: 'x' });
  const kept = await rCall(r, 'admin-apply', { target: { [KEY + '|E']: ['G903'], [KEY + '|C']: [] }, expect: { [KEY + '|E']: [], [KEY + '|C']: ['G903'] } }, admin);
  assert.ok(kept.problems.some((p) => p.reason === 'KEPT_PLACES'));
  await r.storage.delete('occ:' + KEY + '|E|~INV-950~0');
  assert.equal(await snap(), before, 'nothing was written');
  /* G903 alone in C moves into an empty room: the number of occupied rooms stays; G902 out of A into an empty room: one more room */
  const one = await rCall(r, 'admin-apply', { dryRun: true, target: { [KEY + '|A']: ['G901'], [KEY + '|F']: ['G902'] }, expect: { [KEY + '|A']: ['G901', 'G902'], [KEY + '|F']: [] } }, admin);
  assert.equal(one.ok, true); assert.equal(one.impacts[0].kind, 'ROOM_COUNT'); assert.deepEqual([one.impacts[0].before, one.impacts[0].after], [1, 2]);
  const ask = await rCall(r, 'admin-apply', { target: { [KEY + '|A']: ['G901'], [KEY + '|F']: ['G902'] }, expect: { [KEY + '|A']: ['G901', 'G902'], [KEY + '|F']: [] } }, admin);
  assert.equal(ask.status, 409); assert.equal(ask.reason, 'APPROVAL_REQUIRED');
  const yes = await rCall(r, 'admin-apply', { approveRoomCount: true, target: { [KEY + '|A']: ['G901'], [KEY + '|F']: ['G902'] }, expect: { [KEY + '|A']: ['G901', 'G902'], [KEY + '|F']: [] } }, admin);
  assert.equal(yes.ok, true); assert.equal((await rCall(r, 'admin-read', null, admin)).log[0].roomCountApproved, true);
});

test('ROOMS · a row still under the replaced Kempinski key is moved, never doubled: the old row goes, the place is written under the canonical key', async () => {
  const r = new Rooms(doState());
  await r.storage.put('occ:kempinski/deluxe-balcony-king|A|G901', { invitationId: G(1).invitationId, partyId: G(1).partyId, name: 'Guest1', at: '2026-10-01T10:00:00.000Z' });
  const v = await rCall(r, 'admin-read', null, admin);
  const k = 'kempinski/jatu-room';
  assert.ok(v.units[k].find((u) => u.label === 'A').occupants.some((o) => o.guestId === 'G901'), 'the legacy row reads as the Jatu Room');
  const out = await rCall(r, 'admin-apply', { target: { [k + '|A']: [], [k + '|B']: ['G901'] }, expect: { [k + '|A']: ['G901'], [k + '|B']: [] } }, admin);
  assert.equal(out.ok, true, JSON.stringify(out));
  const keys = [...(await r.storage.list({ prefix: 'occ:' })).keys()];
  assert.deepEqual(keys, ['occ:' + k + '|B|G901'], 'one row, canonical');
});

/* ================================================================ the guest's trip stays "sent" */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(p, headers = {}, body, method) { return new Request(ORIGIN + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
const BKK = 'bkk-stay/u-sathorn-superior-garden';
test('THE OWNERS\' PLACEMENT IS THEIRS, NOT THE GUEST\'S · a sent trip stays sent after the Owners move the guest\'s seat and room (the Bag\'s label brought in line included); the sent line reads the room now; Guest Relations\' overview agrees; the guest\'s own later change is a change', async () => {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-assign-sam');
  const entries = { [await authIdOf(sam)]: { i: 'INV-G977', g: 'G977', p: 'INV-977' }, ['a'.repeat(64)]: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B' }, ['b'.repeat(64)]: { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' } };
  const index = JSON.stringify({ v: 2, entries });
  const store = kv();
  const rooms = new Rooms(doState()), seats = new Seating(doState());
  await sCall(seats, 'config', GRID, { gr: true });
  const env = { ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index) : new Response('no', { status: 404 })) }, REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seats.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (/api\.brevo\.com/.test(String(url)) ? new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201 }) : realFetch(url, init));
  try {
    await store.put('contact:INV-G977', JSON.stringify({ invitationId: 'INV-G977', guestId: 'G977', email: 'sam.example@example.org', phone: '+66 81 000 0000', ...STEP01, at: '2026-09-16T09:00:00.000Z' }));
    assert.equal((await (await w.fetch(req('/api/rooms/join', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', guestId: 'G977', key: BKK, label: 'A' }), env)).json()).ok, true);
    await seats.storage.put('hold:dinner:D-T-05', { invitationId: 'INV-G977', guestId: 'G977', partyId: 'INV-977', name: 'Sam', at: '2026-10-01T10:00:00.000Z', state: 'held' });
    const line = (unit) => ({ id: 'bkk-stay', room: 'u-sathorn-superior-garden', stay: 'sathorn', unit, unitName: 'Room ' + unit, price: 200 });
    const GUEST = JSON.stringify({ contact: { email: 'sam.example@example.org' }, guests: { G977: { submitted: {}, profile: { coffeetea: 'Tea' } } } });
    const put = async (keys) => { const cur = await (await w.fetch(req('/api/draft', { 'x-siyl-auth': sam }), env)).json(); return (await w.fetch(req('/api/draft', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'), env)).json(); };
    const state = async () => (await (await w.fetch(req('/api/draft', { 'x-siyl-auth': sam }), env)).json()).submission;
    await put({ 'siyl.guest': GUEST, 'siyl.bag': JSON.stringify([line('A')]) });
    const reg = complete({ channel: 'journey-shop', guestId: 'G977', partyId: 'INV-977', selections: [line('A')], totalUsd: 200, contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' },
      guestRecord: { guests: [{ guestId: 'G977', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }], contact: { email: 'sam.example@example.org' } }, registration_submitted_at: '2026-09-16T10:00:00.000Z' }, { stages: { 'bkk-stay': 'selected' } });
    const sent = await w.fetch(req('/api/register', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', registration: reg, text: 'SEE YOU IN LAOS' }), env);
    assert.equal(sent.status, 202, await sent.clone().text());
    assert.equal((await state()).submissionStatus, 'sent');
    /* THE OWNERS move the dinner seat (to the new A27) and the room (A → B, the same category) */
    assert.equal((await sCall(seats, 'admin-apply', { event: 'dinner', guests: { G977: { invitationId: 'INV-G977', partyId: 'INV-977', name: 'Sam' } }, target: { 'D-T-05': null, 'D-T-27': 'G977' }, expect: { 'D-T-05': 'G977', 'D-T-27': null } }, admin)).ok, true);
    assert.equal((await rCall(rooms, 'admin-apply', { target: { [BKK + '|A']: [], [BKK + '|B']: ['G977'] }, expect: { [BKK + '|A']: ['G977'], [BKK + '|B']: [] } }, admin)).ok, true);
    let s = await state();
    assert.equal(s.submissionStatus, 'sent', 'the Owners\' placement is not the guest\'s change'); assert.equal(s.hasUnsentChanges, false);
    assert.equal(s.sentSelections.find((l) => l.id === 'bkk-stay').unit, 'B', 'the sent line reads the room the Owners placed the guest in');
    /* the guest's page brings the Bag's label in line with the engine (assets/stay.js) — still the same trip */
    await put({ 'siyl.guest': GUEST, 'siyl.bag': JSON.stringify([line('B')]) });
    s = await state(); assert.equal(s.submissionStatus, 'sent', 'the Bag\'s own label follows the placement');
    /* the Owners RELEASE the seat: what the release leaves keeps the trip as it was sent */
    assert.equal((await sCall(seats, 'admin-apply', { event: 'dinner', guests: {}, target: { 'D-T-27': null }, expect: { 'D-T-27': 'G977' } }, admin)).ok, true);
    s = await state(); assert.equal(s.submissionStatus, 'sent', 'a release by the Owners is the Owners\'');
    /* a plain read by invitation never carries the history; the guest's own read does */
    assert.equal((await sCall(seats, 'mine', null, { q: '?invitation=INV-G977' })).placed, undefined);
    /* Guest Relations' overview (the pre-read path) agrees */
    const gr = await (await w.fetch(req('/api/gr/journeys', { 'x-gr-token': 'gr-secret' }), env)).json();
    assert.equal(gr.journeys.find((j) => j.invitationId === 'INV-G977').status, 'sent');
    /* the guest's OWN seat choice afterwards is a change of theirs (and ends what the release left) */
    await sCall(seats, 'state', { open: true }, { gr: true });
    assert.equal((await (await w.fetch(req('/api/seating/select', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', guestId: 'G977', event: 'dinner', seatId: 'D-B-28' }), env)).json()).ok, true);
    s = await state(); assert.equal(s.submissionStatus, 'changes-not-sent', 'the guest\'s own seat is never hidden');
    assert.equal(await seats.storage.get('placed:dinner:G977'), undefined);
    await w.fetch(req('/api/seating/release', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', guestId: 'G977', event: 'dinner' }), env);
    /* the guest's OWN change afterwards — another room — is a change of theirs */
    await w.fetch(req('/api/rooms/join', { 'x-siyl-auth': sam }, { invitationId: 'INV-G977', guestId: 'G977', key: BKK, label: 'C' }), env);
    await put({ 'siyl.guest': GUEST, 'siyl.bag': JSON.stringify([line('C')]) });
    s = await state(); assert.equal(s.submissionStatus, 'changes-not-sent', 'a choice the guest makes is never hidden');
  } finally { globalThis.fetch = realFetch; }
});

/* ================================================================ the pure parts */
test('ROSTER · every guest once, with first and last name apart, the booking state, the answers for both events from the sent trip, the seats and the rooms; the couple at their places', () => {
  const entries = { a: { i: 'INV-G901', g: 'G901', p: 'INV-900', c: 'CON901' }, b: { i: 'INV-G902', g: 'G902', p: 'INV-900', c: 'CON902' }, c: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B', c: 'CON002' } };
  const register = { CON901: { first: 'Ada', last: 'Example' }, CON902: { first: 'Ben', last: 'Sample', nick: 'Benny' }, CON002: { first: 'Haruthai', last: 'Demo' } };
  const records = { 'INV-G901': { submissionId: 'S1', version: 1, registration: { guestRecord: { scope: { vientianeWedding: true } }, templeCeremony: { guests: [{ guestId: 'G901', events: { vows: 'Joining', dinner: 'Not joining' } }] } } } };
  const confs = { 'INV-G901': { confirmedAt: '2026-11-01T10:00:00Z', version: 1 } };
  const seating = { events: { ceremony: { seats: [{ seatId: 'C-L-11-01', guestId: 'G901', state: 'allocated', by: 'owners:BRIDE' }] }, dinner: { seats: [{ seatId: 'D-B-27', guestId: 'G902', state: 'held' }] } } };
  const rooms = { units: { [KEY]: [{ label: 'C', occupants: [{ guestId: 'G901', by: 'owners:GROOM' }, { guestId: 'G902' }] }] } };
  const out = rosterOf({ entries, register, records, confs, seating, rooms, couple: { BRIDE: { g: 'G048' } } });
  const ada = out.find((x) => x.guestId === 'G901'), ben = out.find((x) => x.guestId === 'G902'), bride = out.find((x) => x.guestId === 'G048');
  assert.deepEqual([ada.first, ada.last, ada.booking, ada.attendance.ceremony, ada.attendance.dinner, ada.seats.ceremony, ada.placed.ceremony], ['Ada', 'Example', 'CONFIRMED', 'yes', 'no', 'C-L-11-01', true]);
  assert.deepEqual([ben.booking, ben.attendance.ceremony, ben.seats.dinner, ben.group.with], ['NOT_SENT', 'not-sent', 'D-B-27', ['Ada']]);
  assert.deepEqual([bride.couple, bride.seats.ceremony, bride.attendance.ceremony], ['BRIDE', 'BRIDE', 'yes']);
  assert.equal(ada.rooms[0].label, 'C'); assert.equal(ada.rooms[0].placed, true);
  assert.equal(JSON.stringify(out).includes('@'), false, 'no email'); assert.ok(!/bearer|token|code/i.test(Object.keys(ada).join(' ')));
  assert.equal(bookingStateOf({ submissionId: 'S', registration: { guestRecord: { scope: { none: true } } } }, null), 'DECLINED');
  assert.deepEqual(attendanceOf({ submissionId: 'S', registration: { guestRecord: { scope: { vientianeWedding: false } } } }, 'G1', false).ceremony, 'no');
  assert.equal(guestsOfIndex({ x: { i: 'INV-G1', g: 'G901' }, y: { i: 'INV-G2', g: 'G901' } }).G901.ambiguous, true, 'one guest id on two invitations names nobody');
});
test('INPUTS · a seat or room change is bounded and shaped before any engine is asked', () => {
  assert.ok(seatChangeOf({ event: 'brunch', target: {}, expect: {} }).error);
  assert.ok(seatChangeOf({ event: 'dinner', target: { 'D-T-01': 'G901' }, expect: {} }).error);
  assert.ok(seatChangeOf({ event: 'dinner', target: { 'X-1': 'G901' }, expect: { 'X-1': null } }).error);
  assert.ok(seatChangeOf({ event: 'dinner', target: { 'D-T-01': 'Ada' }, expect: { 'D-T-01': null } }).error, 'a guest is named by id');
  assert.deepEqual(seatChangeOf({ event: 'dinner', target: { 'D-T-27': 'G901' }, expect: { 'D-T-27': null } }).target, { 'D-T-27': 'G901' });
  const rc = roomChangeOf({ target: { [KEY + '|A']: ['G902'], [KEY + '|C']: ['G901'] }, expect: { [KEY + '|A']: ['G901'], [KEY + '|C']: ['G902'] } });
  assert.deepEqual(roomMovesOf(rc).map((m) => m.guestId).sort(), ['G901', 'G902']);
  assert.ok(roomChangeOf({ target: { 'nope': [] }, expect: { 'nope': [] } }).error);
  const st = staysOf({ rooms: { units: { [KEY]: [{ label: 'A', places: 2, occupants: [{ guestId: 'G901' }] }] } }, seedNames: { [KEY]: 'Heritage Executive' }, datesOf: { [KEY]: { checkIn: '2027-02-27', checkOut: '2027-03-01', nights: 2 } } });
  assert.deepEqual([st[0].window, st[0].hotel, st[0].checkIn, st[0].categories[0].name, st[0].guests], ['wedstay', 'Souphattra Heritage Vientiane', '2027-02-27', 'Heritage Executive', 1]);
});
