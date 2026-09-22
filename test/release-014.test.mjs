/* RELEASE 014 (Owner, 19 Sep 2026) — FINAL DATA RECONCILIATION · PACKAGE MODEL · GUEST REGISTER · CLEAN RESET.
   · THE FIXED ARRANGEMENT CONCEPT IS GONE: nothing is held for anyone in advance, the hosts start at zero, no page, no
     email, no engine view carries "Arranged for you".
   · PARTY CAPACITY: a unit takes the whole party or none of it; the party members already in a unit count for it.
   · THE WAITING LIST: the engine's own line per stage, positions by time, renumbered as the line moves, cleared by a hold,
     by a leave of the line, by an assignment and by the clean reset; USD 0 until resolved; an answered stage for readiness.
   · THE PACKAGES: Complete trip (all ten stages) and Essential trip (the wedding stay) are CONFIGURATION with a defined
     fallback chain per stage — capacity decides, never price; a package replaces a conflicting manual selection on
     confirmation and puts a stage on the waiting list when no option of its chain can take the party.
   · CANONICAL COUNTS: relevant = confirmed + waitlisted + declined + open; bagItems = the actual lines; bagTotal = the
     chargeable confirmed lines only.
   · D2 = GUEST HOUSE COMPLIMENTARY: one shared house of six places; never "Private Residence"; occupants visible.
   · THE CURRENT MASTER WINS: C86 USD 105; Lijiang and Kempinski six rooms per category; the dated restaurant moves. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { page, src, doState, roomsFetch, plain, CORE, PEGGY, STEFFIE, LIN, HARUTHAI } from './sandbox.mjs';
const WITH_MEDIA = [...CORE, 'assets/stay-media.js'];
import { Rooms, unitsOf, mayJoin, STAGES, stageOf } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { journeyModel, composeGuestMail, composeOwnerMail } from '../src/mail-templates.js';

const ID = (g) => ({ invitationId: g.invitationId, guestId: g.guestId, partyId: g.partyId, hosts: !!g.hosts });
function req(op, body, identity, gr) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET',
    headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : k === 'x-gr-verified' ? (gr ? 'yes' : null) : null) },
    json: async () => body || {} };
}
async function call(rooms, op, body, identity, gr) { const r = await rooms.fetch(req(op, body, identity, gr)); return { status: r.status, d: JSON.parse(await r.text()) }; }
const join = (rooms, who, key, label, need, name) => call(rooms, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: name || who.guestId, need }, who);
const wait = (rooms, who, stage, size, wanted) => call(rooms, 'wait', { invitationId: who.invitationId, guestId: who.guestId, stage, size, wanted, name: who.guestId }, who);
const unwait = (rooms, who, stage) => call(rooms, 'unwait', { invitationId: who.invitationId, guestId: who.guestId, stage }, who);
const unit = (d, key, label) => d.units[key].find((u) => u.label === label);
/* synthetic strangers to fill units with (never a real guest) */
const stranger = (n) => ({ invitationId: 'INV-Z' + n, guestId: 'Z' + n, partyId: 'INV-Z' + n, hosts: false });
async function fill(rooms, key, places) {
  /* every place of every unit of the category, by synthetic strangers of separate parties */
  let n = 0;
  for (const u of unitsOf(key)) for (let i = 0; i < (places == null ? u.places : places); i++) { n++; const r = await join(rooms, stranger(key.replace(/\W/g, '') + n), key, u.label, 1, 'Z'); assert.equal(r.status, 200, key + ' ' + u.label + ' filled'); }
}
const PEG = ID(PEGGY), STE = ID(STEFFIE), LINI = ID(LIN), HAR = ID(HARUTHAI);
const guestPage = async (rooms, who, auth, opts) => page({ auth, fetch: await roomsFetch(rooms, who), ...(opts || {}) });

/* ────────────────────────────── 1 · NO FIXED ARRANGEMENT ────────────────────────────── */
test('NO FIXED ARRANGEMENT · the seed holds nothing for anyone; no unit is reserved; a host is refused nothing and given nothing; the hosts start at zero', async () => {
  assert.deepEqual(FIXED, []);
  for (const [k, s] of Object.entries(SEED)) { assert.equal(s.held || 0, 0, k + ' held'); assert.equal(s.heldFor, undefined, k + ' heldFor'); }
  for (const k of Object.keys(SEED)) for (const u of unitsOf(k)) { assert.equal(u.reservedFor, null, k + ' ' + u.label); assert.equal(mayJoin(u, PEG).ok, true); assert.equal(mayJoin(u, HAR).ok, true); }
  assert.equal(mayJoin(unitsOf('bkk-stay/penthouse')[0], null).ok, false, 'no identity, no place');
  const rooms = new Rooms(doState());
  const v = (await call(rooms, 'read', null, HAR)).d;
  assert.equal(v.fixed, undefined, 'no fixed map in the view'); assert.deepEqual(v.mine, {}); assert.deepEqual(v.waitlist, {});
  assert.equal(unit(v, 'bkk-stay/penthouse', 'A').taken, 0, 'Room A of the Penthouse is nobody\'s before a booking');
  assert.equal(v.summary['bkk-stay/penthouse'].remainingPlaces, 12, 'six bedrooms, twelve places, all bookable');
});

test('NO FIXED ARRANGEMENT · no served page, module or email carries the concept', () => {
  assert.ok(!existsSync('assets/arranged.js'), 'arranged.js is gone');
  for (const f of ['your-journey.html', 'cart.html', 'review.html', 'profile.html', 'journeys.html', 'room.html', 'assets/journey.js', 'assets/stay.js', 'assets/rooms.js', 'assets/guest.js', 'src/worker.js', 'src/mail-templates.js', 'src/drafts.js', 'src/rooms.js']) {
    const s = src(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(s, /SIYL_ARRANGED|arranged\.js|Arranged for you|Fixed arrangement|fixedStagesOf|withoutFixed|reserved · bride|Bride & Groom/, f + ' carries the deleted concept');
  }
  assert.doesNotMatch(src('src/mail-templates.js'), /import \{ FIXED \}/, 'the composer does not read FIXED');
  assert.match(src('src/worker.js'), /hosts: !!who\.hosts, registration, text, rooms, recipient/, 'the record carries the authenticated host flag');
});

/* ────────────────────────────── 2 · PARTY CAPACITY ────────────────────────────── */
test('PARTY CAPACITY · a two-place room with one stranger cannot take a party of two; an empty room can; a party member already in the room counts; one guest still fits', async () => {
  const rooms = new Rooms(doState()), key = 'wedstay/heritage';
  assert.equal((await join(rooms, LINI, key, 'A', 1, 'Lin')).status, 200);
  const r = await join(rooms, PEG, key, 'A', 2, 'Peggy');
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party'); assert.equal(r.d.need, 2); assert.equal(r.d.free, 1);
  assert.deepEqual(r.d.mine, {}, 'nothing partially booked');
  assert.equal((await join(rooms, PEG, key, 'B', 2, 'Peggy')).status, 200, 'an empty room takes the party');
  const s = await join(rooms, STE, key, 'B', 2, 'Steffie');
  assert.equal(s.status, 200, 'the partner joins the same room: her party member is already there, so need 2 is met');
  assert.deepEqual(plain(unit(s.d, key, 'B').occupants.map((o) => o.name)), ['Peggy', 'Steffie']);
  assert.equal((await join(rooms, stranger(9), key, 'A', 1)).status, 200, 'a single guest still takes the last place of A');
  assert.equal((await join(rooms, stranger(10), key, 'A', 1)).status, 409, 'and the room is full');
  /* PARTY PLACES: Peggy alone (need 2) keeps the second place of C for Steffie — a stranger cannot take it, Steffie can; when the
     last party member leaves, the kept place goes; a member who says "not joining" with nothing held gives one back */
  assert.equal((await call(rooms, 'leave', { invitationId: STE.invitationId, guestId: STE.guestId, stage: 'wedstay' }, STE)).status, 200, 'Steffie steps out of B first');
  assert.equal((await join(rooms, PEG, key, 'C', 2, 'Peggy')).status, 200);
  let c = unit((await call(rooms, 'read', null, PEG)).d, key, 'C');
  assert.equal(c.taken, 2); assert.equal(c.free, 0); assert.deepEqual(plain(c.occupants.map((o) => o.name)), ['Peggy', 'Your party']);
  assert.equal((await join(rooms, stranger(11), key, 'C', 1)).status, 409, 'the kept place is the party\'s');
  assert.equal((await join(rooms, STE, key, 'C', 2, 'Steffie')).status, 200, 'the partner takes the kept place');
  c = unit((await call(rooms, 'read', null, PEG)).d, key, 'C'); assert.deepEqual(plain(c.occupants.map((o) => o.name)), ['Peggy', 'Steffie']); assert.equal(c.free, 0);
  assert.equal((await call(rooms, 'leave', { invitationId: STE.invitationId, guestId: STE.guestId, stage: 'wedstay' }, STE)).status, 200);
  assert.equal((await call(rooms, 'leave', { invitationId: PEG.invitationId, guestId: PEG.guestId, stage: 'wedstay' }, PEG)).status, 200);
  c = unit((await call(rooms, 'read', null, PEG)).d, key, 'C'); assert.equal(c.taken, 0, 'nothing is kept once the party has left');
  assert.equal((await join(rooms, PEG, key, 'D', 2, 'Peggy')).status, 200);
  assert.equal((await call(rooms, 'leave', { invitationId: STE.invitationId, guestId: STE.guestId, stage: 'wedstay' }, STE)).status, 200, 'Steffie is not joining the wedding stay');
  c = unit((await call(rooms, 'read', null, PEG)).d, key, 'D'); assert.equal(c.taken, 1, 'her kept place is given back'); assert.equal(c.free, 1);
});

test('PARTY CAPACITY · the client offers only units that take the whole party, and asks the engine for that many places', async () => {
  const rooms = new Rooms(doState());
  assert.equal((await join(rooms, LINI, 'wedstay/heritage', 'A', 1, 'Lin')).status, 200);
  const w = await guestPage(rooms, PEG, PEGGY);
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, J = w.SIYL_JOURNEY;
  await U.load(true);
  assert.equal(J.partySize(), 2, 'Peggy & Steffie');
  assert.equal(U.fitsParty('wedstay', 'heritage', U.units('wedstay', 'heritage')[0], 2), false, 'A has one stranger');
  assert.equal(U.unitForParty('wedstay', 'heritage', 2).label, 'B');
  assert.equal(U.canTake('wedstay', 'heritage'), true);
  const html = ST.unitsHtml('wedstay', 'heritage');
  assert.match(html, /data-need="2"/); assert.match(html, /1 place available · not enough for your party of 2/);
  assert.doesNotMatch(html, /data-join="wedstay\|heritage\|A"/, 'no button on the unit that cannot take the party');
  assert.match(html, /data-join="wedstay\|heritage\|B"/);
  const r = await ST.select('wedstay', 'heritage', null, 2);
  assert.deepEqual(plain(r), { ok: true, unit: 'B' });
  await U.load(true);
  assert.deepEqual(plain(U.view().mine), { wedstay: { key: 'wedstay/heritage', label: 'B' } });
  /* a category with no unit for the party: the words say so, the CTA is not "Sold out" */
  await fill(rooms, 'wedstay/noble-courtyard', 1);
  await U.load(true);
  assert.equal(U.canTake('wedstay', 'noble-courtyard'), false); assert.equal(U.soldOut('wedstay', 'noble-courtyard'), false);
  assert.equal(U.ctaWords('wedstay', 'noble-courtyard'), 'Not enough places for your party of 2');
});

/* ────────────────────────────── 3 · THE WAITING LIST ────────────────────────────── */
test('WAITING LIST · positions by time; leaving renumbers; a hold resolves the line; a guest with a place cannot wait; the reset clears the line; Guest Relations see it', async () => {
  const rooms = new Rooms(doState());
  await fill(rooms, 'kmg/italian');
  const a = await wait(rooms, LINI, 'kmg', 1, ['kmg/italian']);
  assert.equal(a.status, 200); assert.equal(a.d.waited, 'kmg'); assert.equal(a.d.waitlist.kmg.position, 1); assert.equal(a.d.waiting.kmg, 1);
  await new Promise((r) => setTimeout(r, 3));
  const b = await wait(rooms, PEG, 'kmg', 2, ['kmg/italian', 'kmg/light-french']);
  assert.equal(b.d.waitlist.kmg.position, 2); assert.equal(b.d.waitlist.kmg.size, 2); assert.equal(b.d.waiting.kmg, 2);
  assert.equal((await wait(rooms, PEG, 'kmg', 2)).d.waitlist.kmg.position, 2, 'waiting twice is one entry');
  assert.equal((await wait(rooms, PEG, 'bogus', 1)).status, 400, 'only a real stage');
  const other = (await call(rooms, 'read', null, STE)).d;
  assert.deepEqual(other.waitlist, {}, 'another guest sees no entry of her own'); assert.equal(other.waiting.kmg, 2, 'but the length of the line');
  const anon = (await call(rooms, 'read', null, null)).d;
  assert.deepEqual(plain(anon.waitlist) || {}, {}, 'the public sees no entry of anyone');
  /* Lin leaves the line: Peggy is renumbered to 1 */
  assert.equal((await unwait(rooms, LINI, 'kmg')).d.waitlist.kmg, undefined);
  assert.equal((await call(rooms, 'read', null, PEG)).d.waitlist.kmg.position, 1);
  /* a place held resolves the entry */
  assert.equal((await join(rooms, PEG, 'kmg/light-french', 'A', 1, 'Peggy')).status, 200);
  const after = (await call(rooms, 'read', null, PEG)).d;
  assert.equal(after.waitlist.kmg, undefined); assert.equal(after.waiting.kmg, undefined);
  assert.equal((await wait(rooms, PEG, 'kmg', 1)).status, 409, 'a guest with a place in the stage does not wait for it');
  /* Guest Relations: the plan lists the line; the reset clears it */
  assert.equal((await wait(rooms, LINI, 'ljg', 1, ['ljg/viewing-270'])).status, 200);
  const plan = (await call(rooms, 'plan', {}, null, true)).d;
  assert.equal(plan.ok, true); assert.ok(Array.isArray(plan.waitlist)); assert.equal(plan.waitlist.length, 1); assert.equal(plan.waitlist[0].stage, 'ljg'); assert.equal(plan.waitlist[0].position, 1);
  const dry = (await call(rooms, 'reset', { dryRun: true }, null, true)).d;
  assert.equal(dry.waitlisted, 1); assert.equal(dry.fixed, 0);
  const done = (await call(rooms, 'reset', { dryRun: false }, null, true)).d;
  assert.equal(done.waitlistCleared, 1); assert.equal(done.waitlistRemaining, 0); assert.equal(done.remaining, 0);
  assert.deepEqual((await call(rooms, 'read', null, LINI)).d.waitlist, {});
});

test('WAITING LIST · on the client it is an answered stage at USD 0: readiness never asks for it, counts carry it, the Bag does not; Not joining leaves the line', async () => {
  const rooms = new Rooms(doState());
  await fill(rooms, 'ljg/viewing-270');
  const w = await guestPage(rooms, LINI, LIN);
  const U = w.SIYL_UNITS, J = w.SIYL_JOURNEY, G = w.SIYL_GUEST, B = w.SIYL_BAG;
  G.setScope({ china: true });
  await U.load(true);
  const ljg = J.SEGMENTS.find((s) => s.key === 'ljg');
  assert.equal(J.state(ljg), 'open');
  assert.equal((await U.wait('ljg', 1, ['ljg/viewing-270'])).ok, true);
  await U.load(true);
  assert.equal(J.state(ljg), 'waitlisted'); assert.equal(J.waitPosition(ljg), 1);
  const c = J.counts();
  assert.equal(c.waitlisted, 1); assert.equal(c.bagItems, 0); assert.equal(c.bagTotal, 0); assert.equal(B.total(), 0);
  assert.ok(!G.missingFor('journey').some((m) => /ljg/.test(m.key)), 'readiness does not ask for a waitlisted stage');
  assert.match(J.countsWords(), /1 on the waiting list/);
  J.decline(ljg);
  await new Promise((r) => setTimeout(r, 5)); await U.load(true);
  assert.equal(J.state(ljg), 'declined'); assert.equal(U.waitlisted('ljg'), null, 'Not joining leaves the line');
});

/* ────────────────────────────── 4 · THE PACKAGES ────────────────────────────── */
test('COUNTS · relevant = confirmed + waitlisted + declined + open; excluded are the stages outside the scope; bagItems are the lines; bagTotal the chargeable confirmed lines', async () => {
  const rooms = new Rooms(doState());
  await fill(rooms, 'ljg/viewing-270');
  const w = await guestPage(rooms, PEG, PEGGY);
  const U = w.SIYL_UNITS, J = w.SIYL_JOURNEY, G = w.SIYL_GUEST, ST = w.SIYL_STAY, B = w.SIYL_BAG;
  const check = (c) => { assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open, 'the invariant'); assert.equal(c.resolved, c.confirmed + c.waitlisted + c.declined); assert.equal(c.relevant + c.excluded, 10); };
  G.setScope({ vientiane: true, china: true });
  await U.load(true);
  let c = J.counts(); check(c); assert.equal(c.excluded, 4, 'Bangkok stay, train, the return flight, closing Kempinski (the graph, 21 Sep 2026)'); assert.equal(c.open, 6); assert.equal(c.bagItems, 0);
  assert.equal((await ST.select('guesthouse', 'guest-house', null, 2)).ok, true, 'the guest house — complimentary');
  B.put({ id: 'mu9646', name: 'MU9646', price: 275, qty: 1 });
  J.decline(J.SEGMENTS.find((s) => s.key === 'prewed'));
  assert.equal((await U.wait('ljg', 2, ['ljg/viewing-270'])).ok, true);
  await U.load(true);
  c = J.counts(); check(c);
  assert.equal(c.confirmed, 2); assert.equal(c.waitlisted, 1); assert.equal(c.declined, 1); assert.equal(c.open, 2);
  assert.equal(c.bagItems, 2, 'the guest house line and the flight'); assert.equal(c.bagTotal, 275, 'the complimentary line and the waiting list are USD 0');
  assert.equal(B.total(), c.bagTotal);
  const words = J.countsWords();
  assert.match(words, /2 stages chosen/); assert.match(words, /1 on the waiting list/); assert.match(words, /1 not joining/); assert.match(words, /2 still open/);
});

/* ────────────────────────────── 6 · D2 · THE GUEST HOUSE ────────────────────────────── */
test('GUEST HOUSE COMPLIMENTARY · one shared unit of six places, complimentary, the wedding stage; occupants named to signed-in guests; never "Private Residence" or "up to 4"', async () => {
  assert.deepEqual(SEED['guesthouse/guest-house'], { unit: 'guest', capacity: 6, held: 0, name: 'Guest House complimentary', stay: 'Guest House complimentary · Vientiane' });
  assert.equal(SEED['airbnb-2br/private-residence'], undefined);
  const u = unitsOf('guesthouse/guest-house'); assert.equal(u.length, 1); assert.equal(u[0].kind, 'property'); assert.equal(u[0].places, 6);
  assert.equal(stageOf('guesthouse/guest-house'), 'wedstay'); assert.ok(STAGES.includes('wedstay'));
  const rooms = new Rooms(doState());
  assert.equal((await join(rooms, LINI, 'guesthouse/guest-house', 'A', 1, 'Lin')).status, 200);
  const r = await join(rooms, PEG, 'guesthouse/guest-house', 'A', 2, 'Peggy');
  assert.equal(r.status, 200); assert.deepEqual(plain(unit(r.d, 'guesthouse/guest-house', 'A').occupants.map((o) => o.name)), ['Lin', 'Peggy', 'Your party'], 'who shares the house, by first name — and the place kept for her party');
  assert.equal(unit(r.d, 'guesthouse/guest-house', 'A').free, 3);
  const asLin = unit((await call(rooms, 'read', null, LINI)).d, 'guesthouse/guest-house', 'A');
  assert.deepEqual(plain(asLin.occupants.map((o) => o.name)), ['Lin', 'Peggy', 'Reserved'], 'a stranger sees the kept place as reserved, never a name');
  const st = await join(rooms, STE, 'guesthouse/guest-house', 'A', 2, 'Steffie');
  assert.equal(st.status, 200); assert.deepEqual(plain(unit(st.d, 'guesthouse/guest-house', 'A').occupants.map((o) => o.name)), ['Lin', 'Peggy', 'Steffie'], 'the partner takes the kept place'); assert.equal(unit(st.d, 'guesthouse/guest-house', 'A').free, 3);
  assert.equal(unit((await call(rooms, 'read', null, null)).d, 'guesthouse/guest-house', 'A').occupants[0].name, undefined, 'never to the public');
  /* the data and the pages */
  const w = page({ auth: PEGGY, modules: WITH_MEDIA });
  const R = w.SIYL_ROOMS.guesthouse, P = w.SIYL_PRICE;
  assert.equal(R.name, 'Guest House complimentary'); assert.equal(R.windows[0].id, 'guesthouse'); assert.equal(R.rooms[0].slug, 'guest-house'); assert.equal(R.rooms[0].complimentary, true);
  assert.deepEqual(plain(w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'wedstay').ids), ['wedstay', 'riverside', 'guesthouse']);
  const line = P.items('guesthouse', 'guest-house')[0];
  assert.equal(line.price, 0); assert.equal(line.complimentary, true); assert.equal(line.name, 'Guest House complimentary · Vientiane');
  for (const f of ['assets/rooms-data.js', 'journeys.html', 'accommodation.html', 'room.html', 'your-journey.html', 'review.html', 'cart.html', 'profile.html', 'assets/journey.js', 'assets/pricing.js', 'assets/aman.js', 'assets/stay-media.js', 'src/inventory-seed.js', 'src/mail-templates.js', 'src/worker.js']) {
    const s = src(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(s, /Private Residence|private-residence|airbnb-2br|privateResidence|up to 4 guests|up to four guests/i, f + ' still says the old words');
  }
  assert.match(src('journeys.html'), /id="j-guesthouse"[^>]*><div class="pgal stay" data-stay-gal="guestHouse"/);
  assert.match(src('accommodation.html'), /<h3>Guest House complimentary<\/h3>/);
  assert.match(src('room.html'), /if \(room\.complimentary\) \{/, 'the room page renders the house with its live places');
  for (let i = 1; i <= 6; i++) assert.ok(existsSync('assets/images/guesthouse/guesthouse-0' + i + '.jpg'));
  assert.equal(w.SIYL_STAY_MEDIA.guestHouse.images.length, 4); assert.equal(w.SIYL_STAY_MEDIA.privateResidence, undefined);
});

/* ────────────────────────────── 7 · THE MAIL ────────────────────────────── */
test('MAIL · the waiting list is a section of both emails without an amount; the hosts are the record\'s authenticated flag alone; no arranged section', () => {
  const base = { invitationId: 'INV-G001', guestId: 'G001', submittedAt: '2026-09-19T12:00:00.000Z', lastSentAt: '2026-09-19T12:00:00.000Z', version: 1,
    registration: { guestId: 'G001', guestRecord: { partyName: 'Peggy & Steffie', guests: [{ guestId: 'G001', name: 'Peggy', source: { fullName: 'Peggy Demo', preferredName: 'Peggy' } }], contact: { email: 'p@example.com' }, scope: { vientiane: true, china: true } },
      selections: [{ id: 'wedstay', name: 'Wedding Stay · Souphattra Heritage', meta: '27 February – 01 March 2027 · The Heritage', price: 145, qty: 1, stay: 'souphattra', room: 'heritage', unit: 'B' }], totalUsd: 145 },
    rooms: { wedstay: { stage: 'wedstay', key: 'wedstay/heritage', label: 'B', name: 'The Heritage', room: 'Room B' }, kmg: { stage: 'kmg', waitlisted: true, position: 2, since: '2026-09-19T11:00:00.000Z', size: 2 } },
    recipient: { email: 'p@example.com' } };
  const m = journeyModel(base);
  assert.deepEqual(m.arranged, []); assert.equal(m.hosts, false);
  assert.equal(m.waitlisted.length, 1); assert.match(m.waitlisted[0].words || JSON.stringify(m.waitlisted[0]), /Kunming|kmg/); assert.equal(m.waitlisted[0].position, 2);
  assert.equal(m.total, 145, 'the waiting list carries no amount');
  const g = composeGuestMail(base), o = composeOwnerMail(base, 'https://x/api/status?invitation=INV-G001');
  assert.match(g.html, /Waiting list/); assert.match(g.text, /WAITING LIST/); assert.match(g.text, /number 2/); assert.match(o.text, /WAITING LIST/);
  assert.doesNotMatch(g.html + g.text + o.text, /Arranged for you|ARRANGED FOR YOU|Fixed arrangement/);
  assert.equal(journeyModel({ ...base, hosts: true }).hosts, true);
  assert.equal(journeyModel({ ...base, registration: { ...base.registration, guestRecord: { ...base.registration.guestRecord, hosts: true } } }).hosts, false, 'a submission cannot claim to be the hosts');
});

/* ────────────────────────────── 8 · THE CURRENT MASTER WINS ────────────────────────────── */
test('THE CURRENT MASTER · C86 USD 105 at the one price source; Lijiang and Kempinski six rooms per category; Riverside photographed', () => {
  const w = page({ auth: PEGGY, modules: WITH_MEDIA });
  assert.equal(w.SIYL_PRICE.FLAT.c86.price, 105); assert.match(w.SIYL_PRICE.FLAT.c86.basis, /^USD 105 per person/);
  for (const [k, s] of Object.entries(SEED)) { if (k.startsWith('ljg/')) assert.equal(s.capacity, 6, k); if (k.startsWith('kempinski/')) assert.equal(s.capacity, 6, k); }
  assert.equal(SEED['prewed/souphattra-presidential'].capacity, 1); assert.equal(unitsOf('prewed/souphattra-presidential')[0].places, 2, 'one room of two places — the Owner\'s rule');
  const rv = w.SIYL_STAY_MEDIA.riverside;
  assert.equal(rv.images.length, 7); assert.equal(rv.images[0].kind, 'exterior'); for (const im of rv.images) assert.ok(existsSync(im.src), im.src);
  assert.equal(w.SIYL_ROOMS.riverside.rooms[0].gallery.length, 7); assert.equal(w.SIYL_ROOMS.riverside.windows[0].bagImg, 'assets/images/riverside/facade.jpg');
  assert.doesNotMatch(src('accommodation.html'), /Photography to follow/);
});

test('THE CURRENT MASTER · the dated venues: 21.02 Sühring dinner; the Aman tea on 24.02; 23.02 Baan Phraya (The Commons the mall); 07.03 Cannubi and Harudot (a café, its second day); 08.03 Petits Plats with its own photographs; Thong Smith dated by the schedule (24.02); no duplicates', () => {
  const w = {}; new Function('window', src('assets/experiences.js'))(w); new Function('window', src('assets/experience-galleries.js'))(w);
  const by = Object.fromEntries(w.SIYL_EXP.map((x) => [x.id, x]));
  assert.deepEqual(by['bkk-suhring'].roles, ['dinner']); assert.equal(by['bkk-suhring'].row, 'Day 01 · 21.02.2027'); assert.equal(by['bkk-suhring'].day, '21 FEB 2027');
  assert.deepEqual(by['bkk-baanphraya'].roles, ['dinner']); assert.equal(by['bkk-baanphraya'].row, 'Day 03 · 23.02.2027'); assert.match(by['bkk-baanphraya'].detail.join(' '), /Phraya Mahai Savan/);
  assert.deepEqual(by['bkk-commons'].roles, ['place'], 'The Commons is no longer a dinner');
  assert.deepEqual(by['bkk-harudot'].roles, ['cafe'], 'a café only (Owner, 22 Sep 2026)'); assert.equal(by['bkk-harudot'].category, 'cafe'); assert.match(by['bkk-harudot'].row, /23\.02\.2027/); assert.match(by['bkk-harudot'].row, /07\.03\.2027/); assert.deepEqual(by['bkk-harudot'].visits.map((v) => v.date), ['2027-02-23', '2027-03-07'], 'one card, two days');
  assert.deepEqual(by['bkk-cannubi'].roles, ['dinner']); assert.equal(by['bkk-cannubi'].row, 'Day 15 · 07.03.2027'); assert.equal(by['bkk-cannubi'].leg, 'return'); assert.match(by['bkk-cannubi'].detail.join(' '), /One MICHELIN Star/);
  assert.deepEqual(by['bkk-petitsplats'].roles, ['dinner']); assert.equal(by['bkk-petitsplats'].row, 'Day 16 · 08.03.2027'); assert.equal(by['bkk-petitsplats'].img, 'assets/images/experiences/bkk-petitsplats-01.jpg', 'the Owner\'s own photographs (22 Sep 2026)'); assert.equal(w.SIYL_EXP_GALLERY['bkk-petitsplats'].images.length, 5);
  assert.equal(by['bkk-thongsmith'].row, 'Day 04 · 24.02.2027', 'the 13:00 lunch of the Day 04 schedule (the tea holds the overview cell)');
  const ids = w.SIYL_EXP.map((x) => x.id); assert.equal(new Set(ids).size, ids.length, 'no duplicate place');
  assert.equal(w.SIYL_EXP.filter((x) => /suhring|sühring/i.test(x.id + x.name)).length, 1);
  for (const id of ['bkk-baanphraya', 'bkk-cannubi']) { const g = w.SIYL_EXP_GALLERY[id]; assert.ok(g && g.images.length >= 4, id + ' gallery'); for (const im of g.images) { assert.ok(existsSync(im.src), im.src); assert.ok(!/food|drink/.test(im.kind), im.src + ' is never a dish'); } assert.equal(g.images[0].src, by[id].img); }
  assert.match(src('assets/journey.js'), /AT_WHEN = \{ '1872': '24 FEB', tea1872: '24 FEB', 'sangkhathan': '28 FEB', 'suhring': '21 FEB', baanphraya: '23 FEB', cannubi: '07 MAR' \}/);
  assert.match(src('tea.html'), /on the afternoon of 24 February/);
  assert.match(src('assets/pricing.js'), /meta: 'Dinner · 21 February 2027 · Three MICHELIN Stars · Bangkok'/);
});

/* ────────────────────────────── 9 · THE REGISTER ────────────────────────────── */
test('THE REGISTER · the builder skips a relationship placeholder and a "." surname; the served register carries no name and no code', () => {
  const s = src('src/guestlist-from-contacts.cjs');
  assert.match(s, /girlfriend\|boyfriend\|wife\|husband/); assert.match(s, /a placeholder surname/);
  const enc = JSON.parse(readFileSync('register/invitations.enc.json', 'utf8')), idx = JSON.parse(readFileSync('register/auth-index.json', 'utf8'));
  const flat = JSON.stringify(enc) + JSON.stringify(idx);
  assert.doesNotMatch(flat, /girlfriend|Aob|@|\+\d{6,}/, 'no placeholder, no contact detail in the served files');
  assert.equal(Object.keys(idx.entries || idx).length >= 80, true, 'the whole register is served, encrypted');
});

test('PARTY CAPACITY · a party larger than a room: the family fills one room and keeps the rest of its places in the next rooms of the category — or is refused as a whole; the kept places go with the party', async () => {
  const rooms = new Rooms(doState()), key = 'ljg/viewing-270';
  const FAM = { invitationId: 'INV-F001', guestId: 'F001', partyId: 'INV-FAM', hosts: false }, FAM2 = { invitationId: 'INV-F002', guestId: 'F002', partyId: 'INV-FAM', hosts: false };
  const r = await join(rooms, FAM, key, 'A', 3, 'Mira');
  assert.equal(r.status, 200);
  const A = unit(r.d, key, 'A'), B = unit(r.d, key, 'B');
  assert.deepEqual(plain(A.occupants.map((o) => o.name)), ['Mira', 'Your party'], 'Room A: her place and one kept');
  assert.deepEqual(plain(B.occupants.map((o) => o.name)), ['Your party'], 'Room B: the third place kept'); assert.equal(B.free, 1);
  assert.equal(r.d.summary[key].remainingPlaces, 6 * 2 - 3);
  assert.equal((await join(rooms, stranger('f1'), key, 'A', 1)).status, 409, 'the kept place in A is the family\'s');
  const r2 = await join(rooms, FAM2, key, 'B', 3, 'Nok');
  assert.equal(r2.status, 200, 'a family member takes the kept place in B'); assert.deepEqual(plain(unit(r2.d, key, 'B').occupants.map((o) => o.name)), ['Nok']); assert.equal(unit(r2.d, key, 'B').free, 1);
  /* a party of seven cannot be taken by a category of six rooms with six places left */
  for (const u of unitsOf(key)) if (u.label !== 'A' && u.label !== 'B') { assert.equal((await join(rooms, stranger('g' + u.label), key, u.label, 1)).status, 200); }
  const big = await join(rooms, { invitationId: 'INV-B1', guestId: 'B1', partyId: 'INV-BIG', hosts: false }, key, 'C', 6, 'Big');
  assert.equal(big.status, 409); assert.equal(big.d.error, 'full for your party'); assert.equal(big.d.need, 6);
  /* the client agrees: a party of three fits the category when a room has a place for the guest and the category the rest */
  const w = await guestPage(rooms, FAM, { ...LIN, invitationId: 'INV-F001', guestId: 'F001', partyId: 'INV-FAM', members: [{ guestId: 'F001' }, { guestId: 'F002' }, { guestId: 'F003' }] });
  const U = w.SIYL_UNITS; await U.load(true);
  assert.equal(w.SIYL_JOURNEY.partySize(), 3);
  assert.equal(U.canTake('ljg', 'viewing-270'), true, 'she already holds a place here');
  assert.equal(U.canTake('ljg', 'starry-sky'), true, 'an empty category of six rooms takes a party of three');
  /* the family leaves: every kept place goes with its last member */
  assert.equal((await call(rooms, 'leave', { invitationId: FAM2.invitationId, guestId: FAM2.guestId, stage: 'ljg' }, FAM2)).status, 200);
  assert.equal((await call(rooms, 'leave', { invitationId: FAM.invitationId, guestId: FAM.guestId, stage: 'ljg' }, FAM)).status, 200);
  const v = (await call(rooms, 'read', null, FAM)).d;
  assert.equal(unit(v, key, 'A').taken, 0); assert.equal(unit(v, key, 'B').taken, 0);
});
