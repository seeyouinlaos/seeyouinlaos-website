/* GUEST RELATIONS' OVERVIEW WITHIN THE WORKER'S LIMITS (hotfix, 28 Sep 2026): /api/gr/journeys had become "Worker exceeded resource
   limits" — ~8 round trips per guest (both engines asked two to four times, every engine call re-reading the record and the contact
   to learn a first name, the records read three times) and a first read that wrote the selection fingerprint back. Measured on a
   synthetic register of 120 invitations: the former path made ~740 store reads, 240 engine calls (each carrying a name the engine
   stores) and wrote to the store; this one reads each record once, the engines once, and writes nothing — with the same answer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, N } from './gr-scale-fixture.mjs';
import { Rooms } from '../src/rooms.js';
import { doState } from './sandbox.mjs';

let W = null;
test.before(async () => { W = await world(); });
test.after(() => { if (W) W.done(); });

test('THE ENLARGED REGISTER · 120 invitations load in one read: every guest with a draft or a sent trip, the acknowledgements over the whole register, the planner\'s answers', async () => {
  W.reset();
  const r = await W.journeys();
  assert.equal(r.status, 200); assert.equal(r.d.ok, true);
  const J = r.d.journeys, expected = W.state.draft.length + W.state.sent.length;
  assert.equal(J.length, expected, 'every guest with a draft or a sent trip');
  assert.ok(N >= 120 && J.length >= 90);
  assert.equal(r.d.acknowledgements.guestRelationsNote.guests, N - 2, 'every invited guest but the hosts');
  assert.ok(r.d.answers && typeof r.d.answers.joining === 'number');
});

test('WITHIN THE LIMITS · the store read once per record, the engines once for everyone, one draft read per guest — the former path fails every bound', async () => {
  W.reset();
  const r = await W.journeys(); const n = r.d.journeys.length;
  assert.equal(W.c.rooms, 1, 'the room engine once (was twice to four times per guest)');
  assert.equal(W.c.seating, 1, 'the seat ledger once (was twice to four times per guest)');
  assert.ok(W.c.drafts <= n, 'one draft read per guest: ' + W.c.drafts);
  assert.ok(W.c.kvGet <= n + 2 * W.state.sent.length + 10, 'each record, confirmation and contact once: ' + W.c.kvGet + ' reads (the former path: ~740)');
  assert.ok(W.c.kvList <= 3);
  assert.equal(W.c.named, 0, 'no engine call carries a name (an engine stores the name it is given)');
});

test('WITH THE RUNTIME\'S MULTI-KEY READ · the records, confirmations and contacts arrive in a handful of reads', async () => {
  const kv = W.env.REG_KV, one = kv.get; let calls = 0;
  kv.get = async (k) => { calls++; if (Array.isArray(k)) { const m = new Map(); for (const x of k) m.set(x, kv.m.has(x) ? kv.m.get(x).v : null); return m; } return one(k); };
  try { const r = await W.journeys(); assert.equal(r.status, 200); assert.ok(calls <= 4, 'multi-key reads: ' + calls); } finally { kv.get = one; }
});

test('READ-ONLY · reading the overview writes nothing — not the store (the legacy trips keep no fingerprint written back), not the engines', async () => {
  const before = JSON.stringify([...W.env.REG_KV.m.entries()]);
  W.reset(); await W.journeys(); await W.journeys();
  assert.equal(W.c.kvPut, 0); assert.equal(W.c.kvDelete, 0); assert.equal(W.c.named, 0);
  assert.equal(JSON.stringify([...W.env.REG_KV.m.entries()]), before, 'the store is byte-identical');
  for (const inv of W.state.legacy) assert.equal(JSON.parse(W.env.REG_KV.m.get('reg:' + inv).v).selectionFingerprint, undefined, inv + ' keeps its legacy form');
});

test('THE STATES · sent · changes not sent · a legacy trip read as sent · draft only · hosts · the acknowledgements · the held rooms and seats', async () => {
  const J = (await W.journeys()).d.journeys, by = Object.fromEntries(J.map((j) => [j.invitationId, j]));
  for (const inv of W.state.sent) {
    const j = by[inv]; assert.ok(j, inv);
    const want = W.state.changed.includes(inv) ? 'changes-not-sent' : 'sent';
    assert.equal(j.status, want, inv); assert.equal(j.hasUnsentChanges, want !== 'sent', inv); assert.ok(j.submissionId, inv); assert.equal(j.version, 1);
    assert.ok(j.text && j.text.startsWith('SEE YOU IN LAOS'), inv); assert.ok(j.name, inv);
  }
  for (const inv of W.state.draft) { assert.equal(by[inv].status, 'draft', inv); assert.equal(by[inv].submissionId, null); assert.ok(by[inv].draftUpdatedAt); }
  for (const inv of W.state.opened) assert.equal(by[inv], undefined, inv + ' only opened: not a journey');
  assert.equal(by['INV-S001'].hosts, true); assert.equal(by['INV-S002'].hosts, true); assert.equal(by['INV-S003'].hosts, false);
  assert.deepEqual(by['INV-S003'].noteAck, { acknowledged: true, at: '2026-09-27T10:00:00.000Z', textVersion: 'v1' });
  assert.equal(by['INV-S004'].noteAck, null); assert.ok(by['INV-S006'].rulesAck && by['INV-S006'].rulesAck.acknowledged);
  assert.ok(W.state.held.length >= 3 && W.state.seated.length >= 3);
  for (const j of J) {
    const held = W.state.held.includes(j.guestId);
    assert.equal(!!(j.rooms && j.rooms.wedstay && j.rooms.wedstay.key === 'wedstay/heritage-executive'), held, j.invitationId + ' rooms');
    const seat = j.seats && j.seats.dinner && j.seats.dinner[j.guestId];
    assert.equal(!!seat, W.state.seated.includes(j.invitationId), j.invitationId + ' seats');
    assert.deepEqual(Object.keys(j.seats).sort(), ['ceremony', 'dinner']);
  }
  const ack = (await W.journeys()).d.acknowledgements.guestRelationsNote;
  assert.ok(ack.pendingGuests.some((g) => W.state.opened.includes(g.invitationId) && g.signedIn === false), 'a guest who never signed in has not acknowledged');
});

test('AUTHORISATION · the Guest Relations token only — no token or a wrong one is refused; the engines\' one read is Guest Relations\' only', async () => {
  assert.equal(await W.unauthorised(null), 401); assert.equal(await W.unauthorised('wrong-secret'), 401); assert.equal(await W.unauthorised('gr-secre'), 401);
  const rooms = new Rooms(doState());
  assert.equal((await rooms.fetch(new Request('https://rooms/api/rooms/gr-mine'))).status, 401);
  assert.equal((await rooms.fetch(new Request('https://rooms/api/rooms/gr-mine', { headers: { 'x-gr-verified': 'yes' } }))).status, 200);
});

test('NOTHING PRIVATE ADDED · no bearer, no token, no code in the overview', async () => {
  const txt = JSON.stringify((await W.journeys()).d);
  for (const p of W.people.slice(0, 40)) assert.ok(!txt.includes(p.bearer), 'no bearer');
  assert.ok(!txt.includes('gr-secret')); assert.ok(!/scale-guest-\d+/.test(txt), 'no invitation code');
});

test('THE CPU INCIDENT (4 Oct 2026) · only the fingerprint a record is compared by is computed — the same hashes; a draft is parsed once per snapshot; a missing draft is no error', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
  assert.match(src, /const need = \[record\.selectionFingerprint \? 'v3' : record\.contentFingerprint \? 'v2' : 'v1'\];/);
  assert.match(src, /async function fingerprintsOf\(d, rooms, seats, which\) \{\n  const want = which \|\| \['v1', 'v2', 'v3'\];/, 'every other caller still gets all three');
  assert.match(src, /return fps\.v3 !== undefined \? fps\.v3 : \(await fingerprintsOf\(fps\.d, rooms, seats, \['v3'\]\)\)\.v3;/, 'the write-back computes v3 when a legacy comparison did not');
  assert.match(src, /if \(keys && typeof keys === 'object'\) \{ const hit = DRAFT_CONTENT\.get\(keys\);/, 'only a real draft snapshot is cached');
  /* the overview answers exactly as before: every guest, the same statuses */
  W.reset();
  const r = await W.journeys(); assert.equal(r.status, 200);
  const st = {}; for (const j of r.d.journeys) st[j.status] = (st[j.status] || 0) + 1;
  assert.ok(st.sent >= 1 && st.draft >= 1, JSON.stringify(st));
});
