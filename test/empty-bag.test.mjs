/* P0 — EMPTY BAG IS REAL · THE BAG = ACTUAL SELECTIONS ONLY (Owner, 17 Sep 2026 · PROJECT_MASTER_BRIEF §10, §20;
   the canonical booking model of release 014, Owner instruction of 19 Sep 2026).
   The state contract proven against the engine and the client modules the browser runs: nothing is held for anyone in
   advance — no fixed arrangement, no arranged renderer on any page, no special room for the hosts, who start at zero like
   every guest; a place the engine holds is a Bag line with its amount, one per stage; the Guest House complimentary is a
   Bag line at USD 0; zero selections is a canonical state (USD 0) on every surface; Remove gives the place back and is
   idempotent; a full room is refused; a package plan is pure and a stage no defined option can take goes on the waiting
   list at USD 0; the draft revision precondition keeps a stale device from resurrecting a removed item; the Worker stores
   a draft and a submission exactly as sent (no strip) and the emails list the held room under STAYS with its amount. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, ROOT, plain, roomsFetch, doState, HARUTHAI, SUTHEP, PEGGY, STEFFIE, LIN } from './sandbox.mjs';
import { Rooms, unitsOf, unitOf, allUnits, mayJoin, STAGES } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { Drafts } from '../src/drafts.js';
import { composeGuestMail, composeOwnerMail, journeyModel } from '../src/mail-templates.js';
import { complete } from './complete.mjs';

const HOST = { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', hosts: true, preferredName: 'Suthep', fullName: 'Suthep Test', bearer: 'x' };
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
/* the engine identity of a sandbox session (what the Worker derives from the bearer) */
const ident = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });
const segOf = (w, key) => w.SIYL_JOURNEY.SEGMENTS.filter((s) => s.key === key)[0];
/* Guest Relations fills every place of every unit of the given engine keys with synthetic guests (one `assign`) */
async function fillAll(rooms, keys) {
  const occupants = []; let n = 0;
  for (const key of keys) for (const u of unitsOf(key)) for (let i = 0; i < u.places; i++) { n += 1; occupants.push({ key, label: u.label, guestId: 'G-FILL-' + n, invitationId: 'INV-FILL-' + n, partyId: null, name: 'Guest ' + n }); }
  const r = await rooms.fetch(new Request('https://x/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants, actor: 'test' }) }));
  const d = await r.json(); assert.equal(d.refused.length, 0, 'every synthetic place was taken'); return occupants.length;
}

test('ENGINE · nothing is held for anyone in advance (Owner, 19 Sep 2026): a host reads an empty `mine`, no `fixed` map, every unit open with `reservedFor` null; a hold is one place per stage in `mine`; the hosts book like every guest, a full room refuses the next one, the Guest House is one unit of six places', async () => {
  /* the seed: no allocation in advance, for nobody */
  assert.deepEqual(FIXED, []);
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.equal(s.heldFor, undefined, key + ' is held for nobody'); }
  assert.ok(allUnits().every((u) => u.reservedFor === null), 'no unit is reserved'); assert.equal(SEED['airbnb-2br/private-residence'], undefined, 'the invented Private Residence is gone');
  assert.deepEqual(unitsOf('guesthouse/guest-house'), [{ key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null }]);
  assert.deepEqual(STAGES, ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']);
  const rooms = new Rooms(doState());
  const h = await call(rooms, 'read', null, HOST);
  assert.equal(h.status, 200); assert.equal(h.d.fixed, undefined, 'no fixed map for the hosts'); assert.deepEqual(h.d.mine, {}); assert.deepEqual(h.d.waitlist, {}); assert.deepEqual(h.d.waiting, {});
  for (const list of Object.values(h.d.units)) for (const u of list) { assert.equal(u.reservedFor, null); assert.equal(u.eligible, true); assert.equal(u.taken, 0); assert.equal(u.full, false); assert.equal(u.free, u.places); }
  const pent = h.d.units['bkk-stay/penthouse']; assert.equal(pent.length, 6); assert.ok(pent.every((u) => u.places === 2)); assert.equal(h.d.summary['bkk-stay/penthouse'].remainingPlaces, 12); assert.equal(h.d.summary['bkk-stay/penthouse'].ownerReservedRooms, 0);
  assert.equal(h.d.summary['guesthouse/guest-house'].places, 6); assert.equal(h.d.summary['guesthouse/guest-house'].kind, 'property');
  /* the host books Room A of the Penthouse — a hold like any guest's, no marker */
  const j = await call(rooms, 'join', { invitationId: HOST.invitationId, guestId: HOST.guestId, key: 'bkk-stay/penthouse', label: 'A', name: 'Suthep' }, HOST);
  assert.equal(j.status, 200); assert.deepEqual(j.d.mine, { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A' } }); assert.equal(j.d.fixed, undefined); assert.equal(j.d.mine['bkk-stay'].fixed, undefined);
  assert.equal(j.d.summary['bkk-stay/penthouse'].remainingPlaces, 11);
  assert.deepEqual(j.d.units['bkk-stay/penthouse'][0].occupants, [{ name: 'Suthep', mine: true, party: true, guestId: 'G049' }]);
  /* no room is the hosts': a guest joins the host's Room A, and the room is then full */
  const j2 = await call(rooms, 'join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'bkk-stay/penthouse', label: 'A', name: 'Peggy' }, ident(PEGGY));
  assert.equal(j2.status, 200); assert.deepEqual(j2.d.mine['bkk-stay'], { key: 'bkk-stay/penthouse', label: 'A' });
  assert.deepEqual(j2.d.units['bkk-stay/penthouse'][0].occupants.map((o) => o.name).sort(), ['Peggy', 'Suthep']); assert.equal(j2.d.units['bkk-stay/penthouse'][0].full, true);
  assert.equal(j2.d.units['bkk-stay/penthouse'][0].reservedFor, null, 'the couple\'s presence reserves nothing');
  /* the last place was filled: the next guest is refused and holds nothing */
  const j3 = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'bkk-stay/penthouse', label: 'A', name: 'Lin' }, ident(LIN));
  assert.equal(j3.status, 409); assert.equal(j3.d.error, 'full'); assert.deepEqual(j3.d.mine, {});
  /* ONE hold per stage: the host's second choice in the same stage releases the first */
  const j4 = await call(rooms, 'join', { invitationId: HOST.invitationId, guestId: HOST.guestId, key: 'bkk-stay/u-sathorn-superior-garden', label: 'B', name: 'Suthep' }, HOST);
  assert.equal(j4.status, 200); assert.deepEqual(j4.d.mine, { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'B' } });
  assert.deepEqual(j4.d.units['bkk-stay/penthouse'][0].occupants.map((o) => o.name), ['Peggy']); assert.equal(j4.d.summary['bkk-stay/penthouse'].remainingPlaces, 11);
  /* eligibility asks only for an identity */
  assert.equal(mayJoin(unitOf('bkk-stay/penthouse', 'A'), ident(LIN)).ok, true); assert.equal(mayJoin(unitOf('bkk-stay/penthouse', 'A'), null).ok, false);
  const anon = await call(rooms, 'read', null, null); assert.deepEqual(anon.d.mine, {}); assert.ok(anon.d.units['bkk-stay/penthouse'][0].occupants.every((o) => o.name === undefined), 'no name without a session');
});

test('CLIENT · THE BAG = actual selections only: nothing chosen is USD 0 with no line, on a host\'s device exactly as on a guest\'s; the fixed API is inert and no arranged renderer exists; a place the engine holds becomes a Bag line with its amount through the sync, once; a line whose place is not held keeps no unit', async () => {
  const rooms = new Rooms(doState()); const lines = {};
  for (const who of [SUTHEP, PEGGY]) {
    const w = page({ auth: who }); const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG, J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, G = w.SIYL_GUEST;
    G.setScope({ all: true });
    assert.equal(w.SIYL_ARRANGED, undefined, 'no arranged renderer on the page');
    B.set([]);
    U._set(await rooms.view(ident(who)));
    ST.sync(); assert.deepEqual(plain(B.get()), []); assert.equal(B.total(), 0);
    assert.equal(U.fixed('bkk-stay'), false); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.fixedUnit('bkk-stay'), null); assert.equal(U.reserved('bkk-stay', 'penthouse'), false);
    assert.equal(ST.fixed('bkk-stay'), false); assert.equal(ST.fixedSlug('bkk-stay'), '');
    assert.equal(J.state(segOf(w, 'bkk-stay')), 'open', 'nothing is arranged: the stage is open');
    const c0 = J.counts(); assert.equal(c0.bagItems, 0); assert.equal(c0.bagTotal, 0); assert.equal(c0.confirmed, 0); assert.equal(c0.relevant, c0.confirmed + c0.waitlisted + c0.declined + c0.open);
    assert.ok(G.missingFor('journey').some((m) => m.key === 'stage:bkk-stay'), 'the Bangkok stay is asked of the hosts as of everyone');
    /* the engine holds Room A of the Penthouse for this guest (another device, a migration): the line comes back from the one pricing source, with its amount */
    const j = await call(rooms, 'join', { invitationId: who.invitationId, guestId: who.guestId, key: 'bkk-stay/penthouse', label: 'A', name: who.preferredName }, ident(who)); assert.equal(j.status, 200);
    U._set(await rooms.view(ident(who)));
    ST.sync();
    const bag = B.get(); assert.equal(bag.length, 1); const x = bag[0];
    assert.equal(x.id, 'bkk-stay'); assert.equal(x.room, 'penthouse'); assert.equal(x.unit, 'A'); assert.equal(x.unitName, 'Room A'); assert.equal(x.price, P.quote('bkk-stay', 'penthouse').total); assert.ok(x.price > 0, 'a hold has its amount');
    assert.equal(B.total(), x.price); assert.equal(J.state(segOf(w, 'bkk-stay')), 'selected'); assert.equal(ST.held(x), true); assert.equal(ST.unitWords(x), 'Room A · You · 1 place available');
    const c1 = J.counts(); assert.equal(c1.bagItems, 1); assert.equal(c1.bagTotal, x.price); assert.equal(c1.confirmed, 1);
    ST.sync(); assert.equal(B.get().length, 1, 'the sync is idempotent'); assert.equal(B.total(), x.price);
    lines[who.guestId] = JSON.stringify(x);
    /* the place is released elsewhere: the line stays the guest's own but carries no unit and asks for a room — nothing is invented */
    await call(rooms, 'leave', { invitationId: who.invitationId, guestId: who.guestId, key: 'bkk-stay/penthouse' }, ident(who));
    U._set(await rooms.view(ident(who))); ST.sync();
    assert.equal(B.get().length, 1); assert.equal(B.get()[0].unit, null); assert.equal(ST.held(B.get()[0]), false); assert.ok(G.missingFor('journey').some((m) => m.key === 'room:bkk-stay'), 'the room is to choose');
  }
  assert.equal(lines[SUTHEP.guestId], lines[PEGGY.guestId], 'the host\'s line is a guest\'s line — same product, same amount, same room');
});

test('CLIENT · a hold is a Bag line with its amount and the guest\'s to give back: Select holds the place first and writes the line; ONE selection per stage; the Guest House complimentary is a line at USD 0 whose occupancy others see; Remove releases through the engine and is idempotent (USD 0); a full room and a room too small for the party are refused with words that name no arrangement', async () => {
  const rooms = new Rooms(doState());
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, ident(PEGGY)) }); const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG, J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, G = w.SIYL_GUEST;
  G.setScope({ all: true }); await U.load(); assert.equal(U.ready(), true);
  B.set([]); assert.equal(B.total(), 0);
  /* SELECT: the place, then the line */
  const s = await ST.select('bkk-stay', 'penthouse'); assert.deepEqual(plain(s), { ok: true, unit: 'A' });
  assert.deepEqual((await rooms.view(ident(PEGGY))).mine, { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A' } });
  assert.equal(B.get().length, 1); assert.equal(B.get()[0].unit, 'A'); assert.equal(B.get()[0].price, P.quote('bkk-stay', 'penthouse').total); assert.equal(B.total(), B.get()[0].price);
  /* ONE selection per stage: another address of the same stage replaces the line and the hold */
  const s2 = await ST.select('bkk-stay', 'u-sathorn-superior-garden'); assert.equal(s2.ok, true);
  assert.deepEqual((await rooms.view(ident(PEGGY))).mine, { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'A' } });
  assert.equal(B.get().length, 1); assert.equal(B.get()[0].room, 'u-sathorn-superior-garden'); assert.equal(B.total(), P.quote('bkk-stay', 'u-sathorn-superior-garden').total);
  /* THE GUEST HOUSE COMPLIMENTARY: a Bag line at USD 0, one of six shared places, in the wedding stage */
  const g = await ST.select('guesthouse', 'guest-house', null, 2); assert.deepEqual(plain(g), { ok: true, unit: 'A' });
  const gh = B.get().filter((x) => x.id === 'guesthouse')[0]; assert.ok(gh, 'the Guest House is a Bag line');
  assert.equal(gh.price, 0); assert.equal(gh.complimentary, true); assert.equal(gh.interest, false); assert.equal(gh.unit, 'A'); assert.equal(gh.unitName, 'Guest House complimentary'); assert.equal(gh.name, 'Guest House complimentary · Vientiane'); assert.doesNotMatch(gh.meta + gh.name, /Private Residence|up to 4/);
  assert.equal(B.get().length, 2); assert.equal(B.total(), P.quote('bkk-stay', 'u-sathorn-superior-garden').total, 'a complimentary line adds nothing');
  assert.equal(J.state(segOf(w, 'wedstay')), 'selected'); const c = J.counts(); assert.equal(c.bagItems, 2); assert.equal(c.confirmed, 2); assert.equal(c.bagTotal, B.total());
  assert.deepEqual((await rooms.view(ident(PEGGY))).mine.wedstay, { key: 'guesthouse/guest-house', label: 'A' });
  const lin = await rooms.view(ident(LIN)); assert.deepEqual(lin.units['guesthouse/guest-house'][0].occupants.map((o) => o.name), ['Peggy', 'Reserved'], 'who shares the house is visible by first name — and the place kept for her party as reserved'); assert.equal(lin.units['guesthouse/guest-house'][0].free, 4);
  /* a Souphattra room in the same stage replaces the Guest House (one selection per stage) */
  const s3 = await ST.select('wedstay', 'heritage'); assert.equal(s3.ok, true);
  assert.equal(B.get().filter((x) => x.id === 'guesthouse').length, 0); assert.equal(B.get().filter((x) => x.id === 'wedstay').length, 1);
  assert.deepEqual((await rooms.view(ident(PEGGY))).mine.wedstay, { key: 'wedstay/heritage', label: 'A' }); assert.equal((await rooms.view(ident(LIN))).units['guesthouse/guest-house'][0].taken, 0);
  /* REMOVE: the place is given back first, then the line goes; a second Remove finds nothing and stays ok */
  const r1 = await ST.remove('bkk-stay'); assert.deepEqual(plain(r1), { ok: true }); assert.equal(B.get().filter((x) => x.id === 'bkk-stay').length, 0); assert.equal((await rooms.view(ident(PEGGY))).mine['bkk-stay'], undefined);
  const r2 = await ST.remove('bkk-stay'); assert.deepEqual(plain(r2), { ok: true });
  const r3 = await ST.remove('wedstay'); assert.deepEqual(plain(r3), { ok: true }); assert.deepEqual(plain(B.get()), []); assert.equal(B.total(), 0); assert.deepEqual((await rooms.view(ident(PEGGY))).mine, {});
  /* A FULL ROOM IS REFUSED: two guests — a host among them, who is just a guest — fill the Noble Courtyard's one room */
  assert.equal((await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'prewed/noble-courtyard', label: 'A', name: 'Lin' }, ident(LIN))).status, 200);
  assert.equal((await call(rooms, 'join', { invitationId: HARUTHAI.invitationId, guestId: HARUTHAI.guestId, key: 'prewed/noble-courtyard', label: 'A', name: 'Haruthai' }, ident(HARUTHAI))).status, 200);
  await U.load(true); assert.equal(U.soldOut('prewed', 'noble-courtyard'), true); assert.equal(U.label('prewed', 'noble-courtyard'), 'Sold out');
  const f1 = await ST.select('prewed', 'noble-courtyard', 'A'); assert.deepEqual(plain(f1), { ok: false, error: 'full' });
  const f2 = await ST.select('prewed', 'noble-courtyard'); assert.deepEqual(plain(f2), { ok: false, error: 'full' });
  assert.equal(ST.refusal(f1), 'This room was just filled. Please choose another room.'); assert.deepEqual(plain(B.get()), [], 'a refusal writes nothing');
  /* A ROOM TOO SMALL FOR THE PARTY: one place left, a party of two — refused, nothing partial */
  assert.equal((await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/souphattra-majestic', label: 'A', name: 'Lin' }, ident(LIN))).status, 200);
  await U.load(true); assert.equal(U.fitsParty('wedstay', 'souphattra-majestic', U.units('wedstay', 'souphattra-majestic')[0], 2), false); assert.equal(U.unitForParty('wedstay', 'souphattra-majestic', 2), null);
  const p1 = await ST.select('wedstay', 'souphattra-majestic', 'A', 2); assert.deepEqual(plain(p1), { ok: false, error: 'full for your party' });
  const p2 = await ST.select('wedstay', 'souphattra-majestic', null, 2); assert.deepEqual(plain(p2), { ok: false, error: 'full for your party' });
  assert.equal(ST.refusal(p1), 'This room cannot take your whole party. Please choose another room.'); assert.deepEqual(plain(B.get()), []); assert.deepEqual((await rooms.view(ident(PEGGY))).mine, {});
  assert.equal(ST.refusal({ ok: false, error: 'unreachable' }), 'Nothing was changed — we could not reach Guest Relations just now. Please try again.');
  for (const e of ['full', 'full for your party', 'unreachable', 'not signed in', 'fixed', 'reserved']) assert.doesNotMatch(ST.refusal({ ok: false, error: e }), /arranged|Arranged|fixed|Fixed/, 'no refusal names an arrangement');
});

test('SURFACES · the sticky bar says My Bag and stands at USD 0 for a signed-in guest; the account links are on it; NO arranged renderer on My Trip, the cart, Review or My Profile (assets/arranged.js is gone); Review\'s #arranged paints the WAITING LIST; the drawer names My Trip · My Profile · Sign out (the bag icon is My Bag)', () => {
  const b = src('assets/bag.js'), c = src('cart.html'), yj = src('your-journey.html'), rv = src('review.html'), pf = src('profile.html'), inv = src('assets/invite.mjs');
  assert.match(b, /<span class="jb-l">My Bag<\/span>/); assert.match(b, /data-bag-view>Open My Bag</); assert.match(b, /var on=B\.authed\(\);/, 'the bar stands whenever a guest is signed in — an empty bag is a real state');
  assert.match(b, /data-nav="top"/); assert.doesNotMatch(b, /data-nav="trip"/, 'the account surfaces moved into the sticky header shell (Owner, 18 Sep 2026)');
  assert.match(c, /No selections yet · USD 0/); assert.match(c, /if\(bt\.disabled\)return;/, 'double remove is idempotent'); assert.match(c, /never an endless "Removing…"/);
  assert.match(yj, /<h1 class="t-d1">My Trip<\/h1>/); assert.match(yj, /data-scope="'\+d\.key\+'"/, 'the participation sheets (no package card, 21 Sep 2026)'); assert.match(yj, /data-counts/, 'the counts of the trip'); assert.match(yj, /data-waitlisted="'\+seg\.key\+'"/, 'the waiting-list card'); assert.match(yj, /data-unwait=/);
  assert.match(yj, /Not joining this stage/); assert.doesNotMatch(yj, /Every stage you have already chosen stays exactly as you chose it|Cost Saving|self-arranged|#fxb|#csb|id="fxb"|id="csb"/, 'the old planner is gone');
  assert.match(rv, /function paintArranged\(\)/); assert.match(rv, /<div id="arranged"><\/div>/); assert.match(rv, /Waiting list/, 'the kept id paints the waiting list, never a fixed arrangement');
  assert.match(pf, /data:'waitlist:'\+seg\.key/, 'My Profile carries the waiting-list card with the position');
  assert.match(inv, /data-access-nav="trip">My Trip<\/a>/); assert.doesNotMatch(inv, /data-access-nav="bag"/); assert.match(inv, /data-access-nav="profile">My Profile<\/a>' \+ \(window\.SIYL_DRAFT \? '<button type="button" class="a-macct-save" data-access-save>Save my progress<\/button>' : ''\) \+ '<button type="button" class="a-macct-out" data-access-out>Sign out<\/button>/); assert.match(inv, /let el = inMenu \|\| document\.querySelector\('\[data-account\]'\);/, 'the account block lives in the menu drawer (Aman header, 18 Sep 2026)');
  /* THE ABSENCE: no page loads an arranged renderer, no page knows the words */
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/arranged.js')), false, 'assets/arranged.js is deleted');
  for (const f of ['your-journey.html', 'cart.html', 'review.html', 'profile.html', 'about-you.html', 'journeys.html', 'accommodation.html', 'room.html']) assert.doesNotMatch(src(f), /assets\/arranged\.js|SIYL_ARRANGED|Arranged for you|Fixed arrangement|not part of your bag|Private Residence|up to 4 guests/, f + ' carries nothing of the fixed arrangement');
  for (const f of ['assets/journey.js', 'assets/stay.js', 'assets/rooms.js', 'assets/guest.js', 'assets/bag.js', 'assets/stage-graph.js']) assert.doesNotMatch(src(f), /SIYL_ARRANGED|fullExperience|costSavingOptions|costSavingPlan|selfArranged|soldOutStages|Arranged for you/, f + ' knows no fixed arrangement and no old planner');
  for (const f of ['src/worker.js', 'src/drafts.js', 'src/mail-templates.js', 'src/rooms.js']) assert.doesNotMatch(src(f), /fixedStagesOf|withoutFixed|Arranged for you|ARRANGED FOR YOU|heldFor/, f + ' strips nothing and arranges nothing');
  assert.match(src('assets/rooms-data.js'), /guesthouse: \{\s*name: 'Guest House complimentary'/); assert.match(src('journeys.html'), /id="j-guesthouse"[^>]*>[\s\S]*?data-stay-gal="guestHouse"/);
});

/* ---- the Worker: the revision precondition; a draft and a submission are stored as sent ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const host = await bearerOf('demo-host-g049'), guest = await bearerOf('demo-sam');
  const entries = {}; entries[await authIdOf(host)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1 }; entries[await authIdOf(guest)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  return { w, env, host, guest, rooms };
}

test('WORKER · a stale device cannot resurrect a removed item: a PUT that names an older revision is refused with the current draft (409 stale); the matching revision writes; the beacon path obeys the same rule', async () => {
  const h = await harness();
  const put = async (b, body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': b }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  /* device A saves a bag with the train; device B reads it */
  const a1 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) } });
  assert.equal(a1.status, 200); const revA = a1.d.updatedAt;
  /* device A removes the train and saves (base = revA) */
  const a2 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: revA });
  assert.equal(a2.status, 200); assert.notEqual(a2.d.updatedAt, revA);
  /* device B, still on revA, pushes its old bag → refused, given the current draft */
  const b1 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, baseUpdatedAt: revA });
  assert.equal(b1.status, 409); assert.equal(b1.d.error, 'stale'); assert.equal(b1.d.draft.keys['siyl.bag'], '[]'); assert.equal(b1.d.draft.updatedAt, a2.d.updatedAt);
  const cur = JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v); assert.equal(cur.keys['siyl.bag'], '[]', 'the removed item did not come back');
  /* no base at all against a stored draft → refused too (a never-synced cache must read first) */
  const b2 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train' }]) } }); assert.equal(b2.status, 409);
  /* the beacon path */
  const bc = await h.w.fetch(req('/api/draft?beacon=1', { 'content-type': 'application/json' }, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train' }]) }, baseUpdatedAt: revA, bearer: h.guest }), h.env);
  assert.equal(bc.status, 409);
  const bc2 = await h.w.fetch(req('/api/draft?beacon=1', { 'content-type': 'application/json' }, { invitationId: 'INV-G777', keys: { 'siyl.skip': '[]' }, baseUpdatedAt: a2.d.updatedAt, bearer: h.guest }), h.env);
  assert.equal(bc2.status, 200); assert.equal(JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v).keys['siyl.bag'], '[]', 'a matching beacon merges its key and keeps the empty bag');
});

test('WORKER · a host\'s draft is stored exactly as sent — nothing is stripped, no line of any stage is the Worker\'s to remove; the guest\'s email lists the room the engine holds under STAYS with its amount and has no Arranged section; host-ness comes from the record\'s `hosts`, never from a room', async () => {
  const h = await harness();
  const bag = [{ id: 'bkk-stay', name: 'Sathorn Penthouse Bangkok', meta: '21 – 24 February 2027 · Sathorn Penthouse', price: 255, qty: 1, stay: 'sathorn', room: 'penthouse', unit: 'A', unitName: 'Room A' }, { id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 }];
  const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.host }, { invitationId: 'INV-G049', keys: { 'siyl.bag': JSON.stringify(bag) } }, 'PUT'), h.env);
  assert.equal(r.status, 200);
  const stored = JSON.parse(JSON.parse(h.env.REG_KV.m.get('draft:INV-G049').v).keys['siyl.bag']);
  assert.deepEqual(stored, bag, 'the host\'s Bag is stored as sent — the Bangkok stay is a selection like any other');
  assert.equal(stored.reduce((t, x) => t + x.price * x.qty, 0), 355);
  const back = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.host }), h.env)).json(); assert.deepEqual(JSON.parse(back.draft.keys['siyl.bag']).map((x) => x.id), ['bkk-stay', 'train']);
  /* the email model: the held room is a stay with its amount; no Arranged section; the hosts' only distinction is the ceremony's front centre, read from `hosts` */
  const rec = { invitationId: 'INV-G049', guestId: 'G049', hosts: true, submissionId: 'SYL-G049-TEST0001', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z',
    registration: { channel: 'journey-shop', guestId: 'G049', totalUsd: 355, contact: { email: 'groom.test@example.org', phone: '+66' }, selections: bag, guestRecord: { guests: [{ guestId: 'G049', name: 'Suthep', source: { fullName: 'Suthep Test', preferredName: 'Suthep' } }] } },
    rooms: { 'bkk-stay': { stage: 'bkk-stay', key: 'bkk-stay/penthouse', label: 'A', name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok', room: 'Room A' } }, recipient: { email: 'groom.test@example.org', phone: '+66' } };
  const M = journeyModel(rec); assert.deepEqual(M.arranged, []); assert.equal(M.hosts, true); assert.equal(M.total, 355); assert.deepEqual(M.waitlisted, []);
  assert.deepEqual(M.stays.map((s) => [s.name, s.room, s.price]), [['Sathorn Penthouse Bangkok', 'Room A', 255]]); assert.deepEqual(M.travel.map((t) => [t.name, t.price]), [['Special Express No. 25', 100]]); assert.deepEqual(M.experiences, []);
  assert.equal(M.seats.ceremony.label, 'Front centre', 'a host without a seat: front centre, from record.hosts'); assert.equal(journeyModel({ ...rec, hosts: false }).seats.ceremony.label, '', 'a guest without a seat: no label — the room says nothing about who the hosts are');
  const g = composeGuestMail(rec), o = composeOwnerMail(rec, 'https://x/s');
  for (const t of [g.text, g.html, o.text, o.html]) { assert.doesNotMatch(t, /Arranged for you|ARRANGED FOR YOU|fixed arrangement|Fixed arrangement|not part of your bag|Waiting list|WAITING LIST/); assert.match(t, /Sathorn Penthouse Bangkok/); assert.match(t, /Room A/); assert.match(t, /USD 255/); assert.match(t, /USD 355/); }
  assert.match(g.text, /STAYS\n· Sathorn Penthouse Bangkok — 21 – 24 February 2027 — Sathorn Penthouse — Room A — USD 255/);
  assert.match(g.text, /YOUR COST\nUSD 355/); assert.match(o.text, /COST\nUSD 355/);
  assert.match(g.text, /· Wedding Ceremony · Souphattra Heritage · 15:30: Front centre/); assert.doesNotMatch(composeGuestMail({ ...rec, hosts: false }).text, /Front centre/);
});

test('SIGNED OUT · the private surfaces render no private state and hand over to the invitation', () => {
  for (const f of ['cart.html', 'your-journey.html', 'review.html', 'about-you.html']) {
    const w = page({ auth: null, file: f }).window || page({ auth: null });
    assert.equal(w.SIYL_BAG.authed(), false); assert.equal(w.SIYL_BAG.get().length ? w.SIYL_BAG.total() : 0, 0);
    assert.ok(w.SIYL_GUEST.me() === null || w.SIYL_GUEST.me() === undefined, f + ': no guest without a session');
  }
  assert.match(src('assets/invite-early.js'), /data-session/);
});

/* ---- the Codex findings of 18 Sep 2026 (deferred plan + implementation review): P1-1 and P1-2 pinned; P1-3 (the fixed-line strip at the registration boundary) is replaced by the submission-as-sent proof below (Owner, 19 Sep 2026) ---- */
test('CODEX P1-1 · the draft write is serialised per invitation: two devices naming the same base revision cannot both write — one 200, one 409 with the current draft; a removal cannot be undone by the loser', async () => {
  const h = await harness();
  const put = async (body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  const a1 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) } }); const rev = a1.d.updatedAt;
  /* the two writes leave at the same moment: device A removes, device B re-sends its old bag — both on `rev` */
  const [ra, rb] = await Promise.all([put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: rev }), put({ invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, baseUpdatedAt: rev })]);
  const codes = [ra.status, rb.status].sort(); assert.deepEqual(codes, [200, 409], 'exactly one of the two writes lands');
  const cur = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env)).json();
  const winner = ra.status === 200 ? ra : rb; assert.equal(cur.draft.updatedAt, winner.d.updatedAt); assert.equal(cur.draft.keys['siyl.bag'], winner === ra ? '[]' : JSON.stringify([{ id: 'train', price: 100, qty: 1 }]));
  const loser = ra.status === 409 ? ra : rb; assert.equal(loser.d.draft.updatedAt, cur.draft.updatedAt, 'the loser is handed the draft that won');
  assert.notEqual(cur.draft.updatedAt, rev);
});

test('CODEX P1-2 · the three-way merge on the device: a removal elsewhere stands, an independent answer typed here is kept, a double-sided change takes the server\'s and is named', () => {
  const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'] }); const merge = w.SIYL_DRAFT._merge;
  const base = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{}}', 'siyl.temple': '{}' };
  /* the server removed the train; this device answered a profile question meanwhile */
  const local = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"Lime"}}}}', 'siyl.temple': '{}' };
  const server = { 'siyl.bag': '[]', 'siyl.guest': base['siyl.guest'], 'siyl.temple': '{}' };
  const m = merge(local, base, server);
  assert.equal(m.keys['siyl.bag'], '[]', 'the removal stands'); assert.equal(m.keys['siyl.guest'], local['siyl.guest'], 'the independent answer is kept'); assert.deepEqual(JSON.parse(JSON.stringify(m.keep)), ['siyl.guest']); assert.deepEqual(JSON.parse(JSON.stringify(m.lost)), []);
  /* both changed the bag: the server's wins and the guest is told */
  const m2 = merge({ 'siyl.bag': '[{"id":"c86"}]' }, base, { 'siyl.bag': '[]' });
  assert.equal(m2.keys['siyl.bag'], '[]'); assert.deepEqual(JSON.parse(JSON.stringify(m2.lost)), ['siyl.bag']);
  /* a key this device never held follows the server */
  const m3 = merge({}, {}, { 'siyl.skip': '["kmg"]' }); assert.equal(m3.keys['siyl.skip'], '["kmg"]');
  const d = src('assets/draft.js');
  assert.match(d, /if \(inflight\) \{ if \(!queued\) \{ var qs = session\(\); var again = function \(\) \{ queued = null; return same\(qs\) \? D\.push\(reason\)/, 'pushes are serialised, a queued push runs only for the session that queued it'); assert.match(d, /\} finally \{ state\.applying = false; \}/, 'no autosave while a server copy is applied'); assert.match(d, /state\.notice = 'stale'; state\.phase = 'stale';/, 'a lost edit is named until the guest\'s next own change');
});

test('WORKER · a submission is stored as sent (Owner, 19 Sep 2026): a host\'s Bag lines reach the record unchanged with the guest\'s own total, the record carries `hosts` and the engine\'s holds without any `fixed` flag, a waitlisted stage is recorded with its position and adds nothing; both emails list the held room under STAYS with its amount, the waiting list with its position, and no Arranged section', async () => {
  const h = await harness();
  /* the engine, before the send: the host holds Room A of the Penthouse like any guest, and waits for Kunming with a party of two */
  const me = { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', hosts: true };
  assert.equal((await call(h.rooms, 'join', { invitationId: 'INV-G049', guestId: 'G049', key: 'bkk-stay/penthouse', label: 'A', name: 'Suthep' }, me)).status, 200);
  assert.equal((await call(h.rooms, 'wait', { invitationId: 'INV-G049', guestId: 'G049', stage: 'kmg', size: 2, wanted: ['kmg/italian', 'kmg/light-french'], name: 'Suthep' }, me)).status, 200);
  /* the one validator: the hosts join Bangkok and China here — the Penthouse held, Kunming on the waiting list, Lijiang not joined, the mandatory C86 a line (Owner, 21 Sep 2026) */
  const sent = complete({ channel: 'journey-shop', guestId: 'G049', totalUsd: 460, contact: { email: 'groom.test@example.org', phone: '+66' },
    selections: [{ id: 'bkk-stay', name: 'Sathorn Penthouse Bangkok', meta: '21 – 24 February 2027 · Sathorn Penthouse', price: 255, qty: 1, stay: 'sathorn', room: 'penthouse', unit: 'A', unitName: 'Room A' }, { id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 }, { id: 'c86', name: 'C86', meta: '04 March 2027 · Business', price: 105, qty: 1 }],
    guestRecord: { guests: [{ guestId: 'G049', name: 'Suthep', source: { fullName: 'Suthep Test', preferredName: 'Suthep' } }] } }, { scope: { bangkok: true, china: true } });
  const calls = []; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (/api\.brevo\.com/.test(String(url))) { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  try {
    h.env.BREVO_API_KEY = 'x';
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.host }, { invitationId: 'INV-G049', registration: sent, text: 'SEE YOU IN LAOS — JOURNEY SELECTION\n- Sathorn Penthouse · Room A · USD 255\n- Special Express No. 25 · USD 100\n- C86 · USD 105' }), h.env);
    assert.equal(r.status, 202, JSON.stringify(await r.clone().json()).slice(0, 300));
    const rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G049').v);
    assert.deepEqual(rec.registration.selections, sent.selections, 'the lines reach the record exactly as sent'); assert.equal(rec.registration.totalUsd, 460); assert.equal(rec.registration.normalised, undefined, 'nothing is recomputed, nothing stripped');
    assert.equal(rec.hosts, true, 'the record carries host-ness from the identity');
    assert.deepEqual(rec.rooms['bkk-stay'], { stage: 'bkk-stay', key: 'bkk-stay/penthouse', label: 'A', name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok', room: 'Room A' }); assert.equal(rec.rooms['bkk-stay'].fixed, undefined);
    assert.equal(rec.rooms.kmg.waitlisted, true); assert.equal(rec.rooms.kmg.position, 1); assert.equal(rec.rooms.kmg.size, 2); assert.equal(rec.rooms.kmg.key, undefined, 'a waiting-list stage names no room');
    assert.equal(Object.keys(rec.rooms).length, 2, 'only what the engine holds or lists — no arranged stage');
    assert.equal(calls.length, 2, 'Guest Relations and the guest');
    for (const c of calls) {
      assert.match(c.textContent, /USD 255/); assert.match(c.textContent, /USD 460/); assert.match(c.textContent, /Sathorn Penthouse Bangkok/); assert.match(c.textContent, /Room A/);
      assert.match(c.textContent, /WAITING LIST\n· Kunming — /); assert.match(c.textContent, /number 1/); assert.match(c.textContent, /for 2 places/);
      assert.doesNotMatch(c.textContent + c.htmlContent, /ARRANGED FOR YOU|Arranged for you|fixed arrangement|Fixed arrangement|not part of your bag/);
      assert.match(c.htmlContent, /Waiting list/); assert.match(c.htmlContent, /Stays/);
    }
    /* the guest's email, composed again from the stored record: the same facts */
    const g = composeGuestMail(rec); assert.match(g.text, /STAYS\n· Sathorn Penthouse Bangkok — 21 – 24 February 2027 — Sathorn Penthouse — Room A — USD 255/); assert.match(g.text, /WAITING LIST\n· Kunming — no room could be confirmed yet · number 1 on the waiting list for 2 places/); assert.match(g.text, /YOUR COST\nUSD 460/);
    const o = composeOwnerMail(rec, 'https://x/s'); assert.match(o.text, /WAITING LIST\n· Kunming — number 1 for 2 places — to resolve/); assert.match(o.text, /COST\nUSD 460/);
    /* the draft read after the send says sent, and the stored draft is untouched by the send */
    const d = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.host }), h.env)).json(); assert.equal(d.submission.submissionStatus, 'sent'); assert.equal(d.submission.version, 1);
  } finally { globalThis.fetch = realFetch; }
});

/* ---- the Codex FINAL review of 18 Sep 2026 (branch p0-empty-bag vs main), each pinned ---- */
test('CODEX FINAL-1 · an answer typed while a save is in flight survives that save\'s 409: the merge reads the keys of this moment, the answer is kept and sent again on the new revision, nothing is named as lost', async () => {
  const baseKeys = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{}}' };
  const bodies = []; let resolveFirst; const first = new Promise((res) => { resolveFirst = res; });
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });   /* the guest module's own contact sync */
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); if (bodies.length === 1) return first; return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R3', savedAt: 'R3', submission: null }) }); }
    return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
  };
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await Promise.resolve();
  const p1 = D.push('auto');                                                                   /* leaves on R1, its answer delayed */
  const typed = '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"Oolong"}}}}';
  w.localStorage.setItem('siyl.guest', typed);                                                /* typed while the save is in flight */
  const p2 = D.push('auto');                                                                   /* queued behind it */
  resolveFirst({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: { keys: { 'siyl.bag': '[]', 'siyl.guest': baseKeys['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' }, submission: null }) });   /* the train was removed elsewhere */
  await p1; await p2;
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };   /* the guest module stamps contactSyncedAt on the event; the answer is what counts */
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'Oolong', 'the answer typed during the save is kept');
  assert.equal(w.localStorage.getItem('siyl.bag'), '[]', 'the removal elsewhere stands');
  const sent = bodies.slice(1); assert.ok(sent.length >= 1, 'the kept answer is sent again');
  assert.equal(sent[0].baseUpdatedAt, 'R2'); sent.forEach((b) => { assert.equal(drink(b.keys['siyl.guest']), 'Oolong'); assert.equal(b.keys['siyl.bag'], '[]'); });
  assert.equal(D.state().notice, null, 'nothing was lost, so nothing is named'); assert.equal(D.state().phase, 'saved');
});

test('CODEX FINAL-2 · a draft actor whose KV seed read fails refuses reads and writes (503 · retry) instead of treating a legacy draft as absent; once the mirror answers, the legacy draft seeds the actor and the precondition holds', async () => {
  const h = await harness();
  const legacy = { invitationId: 'INV-G777', guestId: 'G777', keys: { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"sam@example.org"}}' }, updatedAt: '2026-09-10T10:00:00.000Z', savedAt: '2026-09-10T10:00:00.000Z' };
  await h.env.REG_KV.put('draft:INV-G777', JSON.stringify(legacy));
  const realGet = h.env.REG_KV.get; let down = true;
  h.env.REG_KV.get = async (k) => { if (down && String(k).startsWith('draft:')) throw new Error('kv unavailable'); return realGet(k); };
  const put = async (body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  const g1 = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env); assert.equal(g1.status, 503, 'a read is not answered with an empty draft');
  const w1 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' } }); assert.equal(w1.status, 503); assert.equal(w1.d.retry, true);
  const w1b = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt }); assert.equal(w1b.status, 503, 'even a correct base cannot write before the seed is known');
  assert.equal(JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v).keys['siyl.guest'], legacy.keys['siyl.guest'], 'the mirror is untouched');
  down = false;
  const g2 = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env)).json(); assert.equal(g2.draft.updatedAt, legacy.updatedAt, 'the legacy draft seeds the actor');
  const w2 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' } }); assert.equal(w2.status, 409, 'no base against the legacy draft is stale');
  const w3 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt }); assert.equal(w3.status, 200);
  const cur = JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v); assert.equal(cur.keys['siyl.bag'], '[]'); assert.equal(cur.keys['siyl.guest'], legacy.keys['siyl.guest'], 'the profile survives the write');
});

test('CODEX FINAL-3 · an acknowledged Save whose read-back fails still records its revision and base: an answer typed meanwhile is pushed against the acknowledged revision (no 409, no self-conflict), and dirty stays true until it lands', async () => {
  const baseKeys = { 'siyl.bag': '[]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"A"}}}}' };
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };
  const bodies = []; let gets = 0, rejectReadback, readbackAsked; const readback = new Promise((_, rej) => { rejectReadback = rej; }); const asked = new Promise((res) => { readbackAsked = res; });
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R' + (bodies.length + 1), savedAt: 'R' + (bodies.length + 1), submission: null }) }); }
    gets += 1; if (gets === 1) return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
    readbackAsked(); return readback;                                                           /* the Save's verification never answers */
  };
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await Promise.resolve();
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"B"'));       /* answer B, then SAVE MY PROGRESS */
  const p1 = D.push('save');
  await asked;                                                                                 /* the PUT stored R2; the read-back is in flight */
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.meta')).serverUpdatedAt, 'R2', 'the acknowledged revision is recorded before the read-back');
  assert.equal(drink(JSON.parse(w.localStorage.getItem('siyl.draft.base'))['siyl.guest']), 'B', 'and the stored keys are the base');
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"C"'));       /* answer C typed meanwhile */
  const p2 = D.push('auto');
  rejectReadback(new Error('offline'));
  const r1 = await p1; assert.equal(r1.ok, false, 'the Save reports its failed verification'); await p2;
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'C', 'the newest answer stays on the device');
  assert.equal(bodies.length, 2); assert.equal(bodies[1].baseUpdatedAt, 'R2', 'the queued push names the acknowledged revision'); assert.equal(drink(bodies[1].keys['siyl.guest']), 'C');
  assert.equal(D.state().notice, null); assert.equal(D.state().phase, 'saved'); assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.meta')).dirty, false);
  /* dirty survives a request that a later edit outran */
  let hold; const held = new Promise((res) => { hold = res; }); const w2fetch = (url, init) => { if (init && init.method === 'PUT') return held; return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) }); };
  const w2 = page({ auth: PEGGY, fetch: w2fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  await Promise.resolve(); const q = w2.SIYL_DRAFT.push('auto'); w2.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"D"')); w2.SIYL_DRAFT.touch();
  hold({ status: 200, json: async () => ({ ok: true, updatedAt: 'R2', savedAt: 'R2', submission: null }) }); await q;
  assert.equal(JSON.parse(w2.localStorage.getItem('siyl.draft.meta')).dirty, true, 'the edit typed during the request is still unsaved');
});

test('CODEX RELEASE-1 · a delayed seed read never overwrites a save that landed meanwhile: GET starts on an unseeded actor, its KV read is held, a PUT seeds and saves an empty bag, the held read resolves — the saved revision stands', async () => {
  const { doState } = await import('./sandbox.mjs');
  const legacy = { invitationId: 'INV-G777', guestId: 'G777', keys: { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"sam@example.org"}}' }, updatedAt: '2026-09-10T10:00:00.000Z', savedAt: '2026-09-10T10:00:00.000Z' };
  const m = new Map([['draft:INV-G777', JSON.stringify(legacy)]]);
  let holdFirst = null; let reads = 0;
  const kv = { get: (k) => { reads += 1; if (reads === 1) return new Promise((res) => { holdFirst = () => res(m.get(k) || null); }); return Promise.resolve(m.get(k) || null); }, put: async (k, v) => { m.set(k, v); } };
  const state = doState();
  /* a real actor serialises: a get in flight blocks the put. The stub state below runs blockConcurrencyWhile as a plain call, so this test proves the storage recheck on its own */
  const a = new Drafts(state, { REG_KV: kv });
  const call = (op, body) => a.fetch(new Request('https://drafts/' + op, { method: 'POST', body: JSON.stringify({ invitationId: 'INV-G777', ...body }) })).then(async (r) => ({ status: r.status, d: await r.json() }));
  const g = call('get', {});                                                                   /* the seed read is held */
  await new Promise((r) => setTimeout(r, 5));
  const w = await call('put', { keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt });   /* seeds (a second, fresh KV read) and saves the empty bag */
  assert.equal(w.status, 200); const saved = w.d.draft.updatedAt;
  holdFirst(); const got = await g;
  assert.equal(got.status, 200);
  const cur = await call('get', {});
  assert.equal(cur.d.draft.updatedAt, saved, 'the held seed read did not roll the revision back'); assert.equal(cur.d.draft.keys['siyl.bag'], '[]', 'the removed train did not come back');
});

test('CODEX RELEASE-2 · a browser upgraded from an older release (a revision, no merge base) takes the server copy of that revision as its base on the first read, so a later 409 keeps its independent edit', async () => {
  const baseKeys = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"A"}}}}' };
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };
  const bodies = [];
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); const b = bodies[bodies.length - 1]; if (b.baseUpdatedAt === 'R1') return Promise.resolve({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: { keys: { 'siyl.bag': '[]', 'siyl.guest': baseKeys['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' }, submission: null }) }); return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R3', savedAt: 'R3', submission: null }) }); }
    return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
  };
  /* the legacy meta: the revision is known, no siyl.draft.base exists */
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await new Promise((r) => setTimeout(r, 30));   /* the first read settles */
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.base') || 'null') && drink(JSON.parse(w.localStorage.getItem('siyl.draft.base'))['siyl.guest']), 'A', 'the first read installed the base');
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"B"'));        /* an independent profile edit here */
  const r = await D.push('auto');                                                            /* another device removed the train meanwhile (409 on R1) */
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'B', 'the independent edit is kept'); assert.equal(w.localStorage.getItem('siyl.bag'), '[]', 'the removal elsewhere stands');
  assert.equal(D.state().notice, null, 'nothing was lost'); assert.ok(bodies.length >= 2 && drink(bodies[bodies.length - 1].keys['siyl.guest']) === 'B', 'the kept edit was sent again');
});

test('CODEX RELEASE-3 · an upgraded browser with UNSENT edits and no merge base: the server is read first; if it still holds the known revision that copy becomes the base, and if it has moved on the Bag follows the server while the typed answer is kept and sent again', async () => {
  const baseKeys = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"A"}}}}' };
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };
  const run = async (serverRev) => {
    const bodies = [], gets = [];
    const server = serverRev === 'R1' ? { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' } : { keys: { 'siyl.bag': '[]', 'siyl.guest': baseKeys['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' };
    const fetch = (url, init) => {
      if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
      if (init && init.method === 'PUT') { const b = JSON.parse(init.body); bodies.push(b); if (b.baseUpdatedAt !== server.updatedAt) return Promise.resolve({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: server, submission: null }) }); server.updatedAt = 'R3'; server.savedAt = 'R3'; Object.assign(server.keys, b.keys); return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R3', savedAt: 'R3', submission: null }) }); }
      gets.push(1); return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: server, submission: null }) });
    };
    const local = { ...baseKeys, 'siyl.guest': baseKeys['siyl.guest'].replace('"A"', '"B"') };            /* the unsent answer B, typed before the upgrade */
    const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...local, 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: true }) } });
    await new Promise((r) => setTimeout(r, 60));
    return { w, bodies, gets, drinkLocal: drink(w.localStorage.getItem('siyl.guest')), bag: w.localStorage.getItem('siyl.bag'), notice: w.SIYL_DRAFT.state().notice, base: w.localStorage.getItem('siyl.draft.base') };
  };
  const same = await run('R1');
  assert.ok(same.gets.length >= 1, 'the server is read before the push'); assert.equal(same.bodies[0] && same.bodies[0].baseUpdatedAt, 'R1', 'the push names the known revision'); assert.equal(drink(JSON.parse(same.base)['siyl.guest']), 'B', 'after the accepted push the base is what was sent'); assert.equal(same.drinkLocal, 'B', 'the unsent answer stands'); assert.ok(same.bodies.length >= 1 && drink(same.bodies[0].keys['siyl.guest']) === 'B', 'and was sent');
  const moved = await run('R2');
  assert.equal(moved.bag, '[]', 'the removal elsewhere stands'); assert.equal(moved.drinkLocal, 'B', 'the typed answer is kept'); assert.ok(moved.bodies.some((b) => b.baseUpdatedAt === 'R2' && drink(b.keys['siyl.guest']) === 'B'), 'and sent again on the new revision');
});

test('CODEX CONFIRM-1 · a save\'s late 409 after an account switch on the same browser is dropped whole: nothing of the first guest is merged into the second guest\'s device, nothing is retried under the second bearer, and a push queued behind it does not run', async () => {
  const A_KEYS = { 'siyl.bag': '[{"id":"train","price":100}]', 'siyl.guest': '{"contact":{"email":"peggy@example.org"},"guests":{}}' };
  const B_KEYS = { 'siyl.bag': '[]', 'siyl.guest': '{"contact":{"email":"steffie@example.org"},"guests":{}}' };
  const puts = []; let resolveFirst; const first = new Promise((res) => { resolveFirst = res; });
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
    if (init && init.method === 'PUT') { puts.push({ bearer: init.headers['x-siyl-auth'], body: JSON.parse(init.body) }); if (puts.length === 1) return first; return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R9', savedAt: 'R9', submission: null }) }); }
    return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: null, submission: null }) });
  };
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...A_KEYS, 'siyl.draft.base': JSON.stringify(A_KEYS), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: true }) } });
  const D = w.SIYL_DRAFT; await Promise.resolve();
  const p1 = D.push('auto');                                                                     /* Peggy's save leaves, its answer delayed */
  const p2 = D.push('auto');                                                                     /* and another queued behind it */
  /* another tab: Peggy signs out, Steffie signs in — the shared device now holds Steffie's session and Steffie's draft */
  w.document.dispatchEvent(new w.CustomEvent('siyl:signout'));
  ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'].forEach((k) => w.localStorage.removeItem(k));
  w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE)); Object.entries(B_KEYS).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.localStorage.setItem('siyl.draft.base', JSON.stringify(B_KEYS)); w.localStorage.setItem('siyl.draft.meta', JSON.stringify({ invitationId: STEFFIE.invitationId, serverUpdatedAt: 'S1', dirty: false }));
  /* Peggy's server copy answers late: stale, with Peggy's own private draft */
  resolveFirst({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: { keys: { 'siyl.bag': '[{"id":"train","price":100},{"id":"mu9646","price":275}]', 'siyl.guest': A_KEYS['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' }, submission: null }) });
  const r1 = await p1, r2 = await p2;
  assert.equal(r1.error, 'session changed'); assert.equal(r2.error, 'session changed');
  const gB = JSON.parse(w.localStorage.getItem('siyl.guest')); assert.equal(gB.contact.email, 'steffie@example.org', 'Steffie\'s device keeps Steffie\'s answers'); assert.ok(!JSON.stringify(gB).includes('peggy@example.org'), 'nothing of Peggy\'s reaches Steffie\'s device');
  assert.equal(w.localStorage.getItem('siyl.bag'), B_KEYS['siyl.bag'], 'nothing of Peggy\'s bag reaches Steffie\'s device');
  assert.equal(w.localStorage.getItem('siyl.draft.base'), JSON.stringify(B_KEYS), 'Steffie\'s merge base is untouched');
  assert.deepEqual(JSON.parse(w.localStorage.getItem('siyl.draft.meta')), { invitationId: STEFFIE.invitationId, serverUpdatedAt: 'S1', dirty: false }, 'no revision of Peggy\'s is recorded for Steffie');
  assert.equal(puts.length, 1, 'no retry, no queued push under the second bearer'); assert.equal(puts[0].bearer, PEGGY.bearer);
  assert.equal(D.state().phase, 'idle', 'the late answer paints no state for the guest who is here now');
  /* the same for a late read: a pull that started for Peggy never applies to Steffie's device */
  let resolveGet; const w2 = page({ auth: PEGGY, fetch: (url, init) => (/\/api\/draft/.test(String(url)) && !(init && init.method) ? new Promise((res) => { resolveGet = res; }) : Promise.resolve({ status: 200, json: async () => ({ ok: true }) })), modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'] });
  await Promise.resolve(); const pull = w2.SIYL_DRAFT.pull();
  w2.document.dispatchEvent(new w2.CustomEvent('siyl:signout')); w2.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE)); w2.localStorage.setItem('siyl.guest', B_KEYS['siyl.guest']);
  resolveGet({ status: 200, json: async () => ({ ok: true, draft: { keys: A_KEYS, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
  assert.equal(await pull, null); assert.equal(JSON.parse(w2.localStorage.getItem('siyl.guest')).contact.email, 'steffie@example.org'); assert.equal(w2.localStorage.getItem('siyl.bag'), null, 'Peggy\'s late copy is dropped');
  assert.match(src('assets/draft.js'), /if \(!same\(s\)\) return \{ ok: false, error: 'session changed' \};/); assert.match(src('assets/draft.js'), /window\.addEventListener\('storage', function \(e\) \{ if \(e && e\.key === 'siyl\.auth'\) \{ sessionChanged\(\);/, 'another tab\'s change of session ends this tab\'s in-flight work');
});
