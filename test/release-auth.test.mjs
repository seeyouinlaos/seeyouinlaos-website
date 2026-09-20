/* FINAL RELEASE · AUTHENTICATION PROOF (Owner, 15 Sep 2026). Deterministic, against the shipped
   register and the engines: each code authenticates exactly one guest; one guest cannot edit
   another; the party gives no permission; Open Another Invitation returns to the code entry;
   Sign Out clears the guest; the retired SWITCH / Continuing as / Answering for paths do not exist;
   a stale party-era session cannot restore cross-guest access. No access code appears here; the
   private register is read only when present and never printed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupByToken, bearerOf, authIdOf } from '../register/crypto.mjs';
import { Rooms } from '../src/rooms.js';
import { page, src, PEGGY, STEFFIE, HARUTHAI, doState } from './sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(src('register/auth-index.json')), records = JSON.parse(src('register/invitations.enc.json'));
const PRIVATE = path.join(ROOT, 'src/invitation-tokens.private.csv');

/* GUEST LIST 007 (Owner, 20 Sep 2026 · the go-live read of the sheet): 104 active guests in 81 parties (CON001 – CON107 populated, two
   duplicate rows and one unnamed partner reported, not invited), 6 cancelled ids kept, never reused */
const ACTIVE = 104, CANCELLED = 6;
test('REGISTER · the shipped index and bundle: one entry per active guest, every invitation INV-<guestId>, no guest twice, no id of a cancelled guest', () => {
  const entries = Object.values(index.entries);
  assert.equal(index.v, 2); assert.equal(entries.length, ACTIVE); assert.equal(records.length, ACTIVE);
  const guests = entries.map((e) => e.g); assert.equal(new Set(guests).size, ACTIVE, 'no guest is reachable by two entries');
  for (const e of entries) { assert.equal(e.i, 'INV-' + e.g); assert.match(e.p, /^INV-\d{3}$/); }
  assert.equal(entries.filter((e) => e.h === 1).length, 2, 'exactly the two hosts carry the hosts flag');
  for (const k of Object.keys(index.entries)) assert.match(k, /^[a-f0-9]{64}$/, 'the index keys are one-way digests');
  for (const r of records) { assert.match(r.id, /^[a-f0-9]{24,64}$/, 'a one-way token id'); assert.ok(r.salt && r.iv && r.ct); assert.equal(r.guestId, undefined, 'no guest id beside a record'); assert.equal(r.name, undefined); }
  assert.doesNotMatch(src('register/auth-index.json') + src('register/invitations.enc.json'), /\b[a-z0-9]{16}\b(?![a-f0-9])/, 'nothing code-shaped in the shipped files');
});

test('REGISTER · (private register present) every active code opens exactly its guest and its bearer maps to that guest; the cancelled guests have nothing', { skip: !fs.existsSync(PRIVATE) }, async () => {
  const rows = fs.readFileSync(PRIVATE, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
  const active = rows.filter((r) => r[7] === 'ACTIVE'), cancelled = rows.filter((r) => r[7] !== 'ACTIVE');
  assert.equal(active.length, ACTIVE); assert.equal(cancelled.length, CANCELLED);
  assert.equal(new Set(active.map((r) => r[5])).size, ACTIVE, 'unique codes');
  for (const r of cancelled) assert.equal(r[5], '', 'a cancelled guest holds no code');
  let checked = 0;
  for (const r of active) {
    const inv = await lookupByToken(r[5], records);
    assert.ok(inv, r[0] + ' opens'); assert.equal(inv.guestId, r[0]); assert.equal(inv.invitationId, 'INV-' + r[0]); assert.equal(inv.partyId, r[2]);
    const e = index.entries[await authIdOf(await bearerOf(r[5]))];
    assert.ok(e, r[0] + ' bearer indexed'); assert.equal(e.g, r[0]); assert.equal(e.i, 'INV-' + r[0]); assert.equal(e.p, r[2]);
    checked++;
  }
  assert.equal(checked, ACTIVE);
  /* a code of one guest opens no other guest's record */
  const a = await lookupByToken(active[0][5], records), b = await lookupByToken(active[1][5], records);
  assert.notEqual(a.guestId, b.guestId);
});

test('ENGINE · one guest cannot edit another; the party gives no permission; a claimed identity in the request body is ignored', async () => {
  const rooms = new Rooms(doState());
  const call = async (op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body) })); return { status: r.status, ...(await r.json()) }; };
  const peggy = { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false };
  const steffie = { invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, partyId: STEFFIE.partyId, hosts: false };
  /* Peggy and Steffie share a party: Peggy still cannot book, move or release for Steffie */
  assert.equal((await call('join', { invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, peggy)).status, 403);
  assert.equal((await call('leave', { invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, stage: 'wedstay' }, peggy)).status, 403);
  assert.equal((await call('join', { invitationId: PEGGY.invitationId, guestId: STEFFIE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, peggy)).status, 403, 'a mixed claim is refused');
  assert.equal((await call('join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, null)).status, 401, 'no bearer, no write');
  /* each guest edits only themself */
  assert.equal((await call('join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }, peggy)).status, 200);
  assert.equal((await call('join', { invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, key: 'wedstay/heritage', label: 'A', name: 'Steffie' }, steffie)).status, 200);
  const v = await call('read', {}, steffie);
  assert.deepEqual(v.units['wedstay/heritage'][0].occupants.map((o) => [o.name, o.mine]), [['Peggy', false], ['Steffie', true]]);
  /* the Worker strips a client-sent identity header before it reaches an engine (the source says so) */
  assert.match(src('src/worker.js'), /x-siyl-identity/); assert.match(src('src/worker.js'), /x-gr-verified/);
  assert.match(src('src/auth.js'), /export function owns\(identity, invitationId, guestId\)/);
});

test('SESSION · a session is one guest; the retired party paths are gone; Sign Out clears the guest; Open Another Invitation returns to the code entry; a stale party-era session cannot restore cross-guest access', () => {
  const inv = src('assets/invite.mjs'), shell = src('assets/prep-shell.js');
  assert.match(inv, /return !!\(v && v\.guestId && v\.bearer && v\.invitationId === 'INV-' \+ v\.guestId\);/, 'valid = one guest, its own invitation, a bearer');
  assert.match(inv, /stale\(\) \{ return !!AUTH\.get\(\) && !AUTH\.valid\(\); \}/, 'a party-era session is stale, never valid');
  /* leaving sets the guest's own draft aside under the invitation id, clears the session and every guest key */
  assert.match(inv, /localStorage\.setItem\('siyl\.party\.' \+ a\.invitationId, JSON\.stringify\(draft\)\)/);
  assert.match(inv, /GUEST_KEYS\.concat\(RETIRED_KEYS\)\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);/);
  assert.match(shell, /data-leave="another"/); assert.match(shell, /data-leave="out"/);
  assert.match(shell, /open=1/, 'Open another invitation arrives at the code prompt (prep-shell leave("another") → invitation.html?open=1)');
  assert.match(src('invitation.html'), /open=1/);
  /* the retired paths do not exist on any active surface */
  const FILES = ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html', 'journeys.html', 'room.html', 'transport.html', 'experience.html', 'assets/prep-shell.js', 'assets/guest.js', 'assets/invite.mjs', 'assets/temple.js', 'assets/docs.js', 'assets/bag.js'];
  for (const f of FILES) {
    const s = src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(s, /\bSWITCH\b|Continuing as|Answering for|chooseIdentity|data-who=|data-switch|answeringFor\s*\(|\bWHO ARE YOU\b/, f + ' carries a retired path');
  }
  /* the guest record answers for the guest alone */
  const w = page({ auth: PEGGY });
  assert.equal(w.SIYL_GUEST.isParty(), false); assert.equal(w.SIYL_GUEST.answeringFor(), false); assert.deepEqual(JSON.parse(JSON.stringify(w.SIYL_GUEST.who())), { guestId: 'g-peggy', activeGuestId: 'g-peggy', subjectGuestId: 'g-peggy' });
  assert.equal(w.SIYL_GUEST.mayAcknowledge('g-steffie'), false, 'the party member cannot be acknowledged for');
  /* a stale party-era session (no guestId) opens nothing */
  const s2 = page({ auth: { invitationId: 'INV-002', partyId: 'INV-002', bearer: 'x', guests: [{ guestId: 'G001' }] } });
  assert.equal(s2.SIYL_GUEST.me(), null); assert.equal(s2.SIYL_GUEST.stale(), true);
  /* the hosts' role is an explicit flag, never a name */
  assert.equal(page({ auth: HARUTHAI }).SIYL_PRICE.hosts(), true);
  assert.equal(page({ auth: { ...PEGGY, preferredName: 'Haruthai', fullName: 'Haruthai Amphai' } }).SIYL_PRICE.hosts(), false);
});
