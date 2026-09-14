/* ============================================================================
   AUTH — ONE CODE = ONE GUEST (Owner decision, 14 Sep 2026).

   One code authenticates exactly one guest · the party is context, never
   authority · there is no switch and nobody to answer for · a session from
   the retired party model is stale · leaving keeps the guest's draft aside
   and hands nothing to the next guest · the retired party draft becomes the
   guest's own initial state only where the mapping is unambiguous.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { page, json, plain, src, PEGGY, STEFFIE, HARUTHAI, LIN } from './sandbox.mjs';

const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);

test('AUTH · the session IS the guest: one guest, own invitation id, party as context', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, p = G.party();
  assert.equal(p.invitationId, 'INV-g-peggy');
  assert.equal(p.guestId, 'g-peggy');
  deq(p.guests.map((g) => g.guestId), ['g-peggy'], 'exactly one guest in the session');
  assert.equal(G.me().preferredName, 'Peggy');
  assert.equal(G.nameOf(), 'Peggy');
  assert.equal(G.nameOf('g-steffie'), 'Steffie', 'a party member by first name — context');
  assert.equal(G.partyNames(), 'Peggy & Steffie');
  assert.equal(G.partyLabel(), 'Your party · Peggy & Steffie');
  deq(G.others().map((g) => g.guestId), ['g-steffie']);
  assert.equal(G.isParty(), false);
  assert.equal(G.answeringFor(), false);
  assert.equal(G.active().guestId, 'g-peggy');
  assert.equal(G.subject().guestId, 'g-peggy');
});

test('AUTH · party membership is not authorisation: nothing can be written in another guest\'s name', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, D = w.SIYL_DOCS;
  assert.equal(T.setAttendance('g-steffie', 'yes'), false);
  assert.equal(T.attendanceOf('g-steffie'), null);
  assert.equal(T.setEvent('g-steffie', 'dinner', 'yes'), false);
  assert.equal(T.setOffering('g-steffie', 'yes'), false);
  assert.equal(G.setDressAck('g-steffie', true), false);
  assert.equal(G.dressAck('g-steffie'), null);
  G.setProfile('g-steffie', 'drink', 'x');
  assert.equal(G.profile('g-steffie', 'drink'), '', 'no profile is written for another guest');
  G.set('g-steffie', 'preferredName', 'X');
  assert.equal(G.value('g-steffie', 'preferredName'), '', 'no name is corrected for another guest');
  assert.equal(D.mayConsent('g-steffie'), false);
  assert.equal(D.setConsent('g-steffie', true), false);
  assert.equal(G.mayAcknowledge('g-steffie'), false);
  assert.equal(G.mayAcknowledge('g-peggy'), true);
  /* the retired switch and answering-for are gone from the model and the shell */
  assert.equal(typeof G.setActive, 'undefined');
  assert.equal(typeof G.setSubject, 'undefined');
  const sh = src('assets/prep-shell.js');
  assert.doesNotMatch(sh, /data-switch|chooseIdentity|Answering for|Switch identity/);
  assert.match(sh, /data-leave="another"/); assert.match(sh, /data-leave="out"/);
  for (const f of ['wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'your-journey.html', 'invitation.html']) {
    assert.doesNotMatch(src(f), /data-switch|setSubject|answeringFor\(\)|\?for=/, f + ' has no cross-guest path');
  }
});

test('AUTH · every record is keyed by the guest\'s own id and signed by the guest', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE;
  T.setAttendance('g-peggy', 'yes'); T.setEvent('g-peggy', 'dinner', 'no');
  assert.equal(json(w, 'siyl.temple').by['g-peggy'].by, 'g-peggy');
  G.setDressAck(true);
  assert.equal(G.dressAck().by, 'g-peggy');
  G.setProfile('g-peggy', 'drink', 'Matcha');
  const rec = G.rec('g-peggy');
  assert.equal(rec.profile.drink, 'Matcha');
  assert.ok(rec.history.every((h) => h.by === 'g-peggy'));
  G.setContact('email', 'peggy@example.com');
  assert.equal(json(w, 'siyl.guest').contact.email, 'peggy@example.com');
  assert.equal(json(w, 'siyl.guest').history[0].by, 'g-peggy');
});

test('AUTH · a session from the retired party model is stale: no guest, no party, the code is asked again', () => {
  const legacy = { invitationId: 'INV-002', partyName: 'Peggy & Steffie', partyLead: 'g-peggy', guests: [{ guestId: 'g-peggy', fullName: 'Peggy Demo', preferredName: 'Peggy' }, { guestId: 'g-steffie', fullName: 'Steffie Demo', preferredName: 'Steffie' }], givingEligibility: 'PAIR', at: '2026-09-11T00:00:00.000Z' };
  const w = page({ auth: legacy });
  const G = w.SIYL_GUEST;
  assert.equal(G.party(), null);
  assert.equal(G.me(), null);
  assert.equal(G.stale(), true);
  /* a guest-scoped session without a bearer is not valid either */
  const w2 = page({ auth: { ...PEGGY, bearer: undefined } });
  assert.equal(w2.SIYL_GUEST.me(), null);
  const w3 = page({ auth: { ...PEGGY, invitationId: 'INV-g-steffie' } });
  assert.equal(w3.SIYL_GUEST.me(), null, 'the invitation id must be the guest\'s own');
  const w4 = page({ auth: null });
  assert.equal(w4.SIYL_GUEST.party(), null); assert.equal(w4.SIYL_GUEST.stale(), false);
});

/* the invite module is an ES module: its session and leave/restore logic is
 * exercised through a small harness that imports it with a fake DOM */
async function inviteHarness(store) {
  const listeners = {};
  const sb = {
    console, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }, dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; }, createElement: () => ({ style: {}, appendChild() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }), head: { appendChild() {} }, body: { append() {}, classList: { add() {}, remove() {}, contains: () => false } }, querySelector: () => null },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(), fetch: () => Promise.reject(new Error('no network')),
    TextEncoder, TextDecoder, crypto: globalThis.crypto,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  const code = src('assets/invite.mjs').replace("import { lookupByToken, bearerOf } from '../register/crypto.mjs';", '');
  const crypto = await import('../register/crypto.mjs');
  sb.lookupByToken = crypto.lookupByToken; sb.bearerOf = crypto.bearerOf;
  const mod = new vm.SourceTextModule(code, { context: sb });
  await mod.link(() => { throw new Error('no imports expected'); });
  await mod.evaluate();
  return sb;
}
const hasSTM = typeof vm.SourceTextModule === 'function';

test('AUTH · leaving keeps this guest\'s draft aside and hands nothing to the next guest; the same guest gets it back', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const store = new Map();
  const w = await inviteHarness(store);
  await w.SIYL_AUTH.set({ ...PEGGY, token: 'demo-peggy-code' });
  const a = w.SIYL_AUTH.get();
  assert.equal(a.guestId, 'g-peggy'); assert.match(a.bearer, /^[0-9a-f]{64}$/); assert.equal(a.members.length, 2);
  assert.equal(JSON.stringify(a).includes('demo-peggy-code'), false, 'the code is never stored');
  assert.equal(w.SIYL_AUTH.valid(), true);
  store.set('siyl.bag', JSON.stringify([{ id: 'train', qty: 1, price: 100 }]));
  store.set('siyl.guest', JSON.stringify({ contact: { email: 'p@example.com' } }));
  w.SIYL_INVITE.leave();
  assert.equal(w.SIYL_AUTH.get(), null);
  assert.equal(store.has('siyl.bag'), false); assert.equal(store.has('siyl.guest'), false);
  assert.ok(store.has('siyl.party.INV-g-peggy'), 'the draft is set aside under the guest\'s own id');
  /* Steffie opens hers on the same device: nothing of Peggy's */
  await w.SIYL_AUTH.set({ ...STEFFIE, token: 'demo-steffie-code' });
  assert.equal(store.has('siyl.bag'), false, 'Steffie inherits no bag');
  assert.equal(w.SIYL_AUTH.get().guestId, 'g-steffie');
  store.set('siyl.bag', JSON.stringify([{ id: 'c86', qty: 1, price: 85 }]));
  w.SIYL_INVITE.leave();
  /* Peggy again: her own bag, not Steffie's */
  await w.SIYL_AUTH.set({ ...PEGGY, token: 'demo-peggy-code' });
  assert.deepEqual(JSON.parse(store.get('siyl.bag')).map((x) => x.id), ['train']);
  assert.equal(JSON.parse(store.get('siyl.guest')).contact.email, 'p@example.com');
  assert.equal(store.has('siyl.who'), false, 'no identity switch state exists');
});

test('AUTH · the retired party draft becomes the guest\'s own initial state only where unambiguous, and is noted privately', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const store = new Map();
  /* the device holds the retired party draft, open under the party id */
  store.set('siyl.draft.owner', 'INV-DEMO-002');
  store.set('siyl.who', JSON.stringify({ partyId: 'INV-DEMO-002', guestId: 'g-peggy' }));
  store.set('siyl.guest', JSON.stringify({ party: { email: 'both@example.com', phone: '+49 170 1234567' }, guests: {
    'g-peggy': { submitted: { preferredName: 'Peg' }, profile: { drink: 'Matcha', comfort: 'aisle seat', access: 'None' }, history: [{ field: 'profile.drink', by: 'g-peggy' }], dress: { acknowledged: true, at: 'x', by: 'g-peggy' } },
    'g-steffie': { submitted: {}, profile: { drink: 'Tea' }, history: [{ field: 'profile.drink', by: 'g-peggy' }], dress: { acknowledged: true, at: 'x', by: 'g-peggy' } } } }));
  store.set('siyl.temple', JSON.stringify({ by: { 'g-peggy': { attend: 'yes', events: { dinner: 'yes' }, by: 'g-peggy' }, 'g-steffie': { attend: 'yes', events: {}, by: 'g-peggy' } }, pair: { off: 'yes', by: 'g-peggy' } }));
  store.set('siyl.bag', JSON.stringify([{ id: 'train', qty: 2, price: 100, by: 'full' }, { id: 'sangkhathan', qty: 2, price: 15 }, { id: 'wedstay', qty: 2, price: 170, room: 'heritage', stay: 'souphattra' }]));
  store.set('siyl.skip', JSON.stringify(['kmg']));
  store.set('siyl.sent', JSON.stringify({ invitationId: 'INV-DEMO-002', at: 'x' }));
  const w = await inviteHarness(store);
  await w.SIYL_AUTH.set({ ...STEFFIE, token: 'demo-steffie-code' });
  const g = JSON.parse(store.get('siyl.guest'));
  assert.equal(g.guests['g-peggy'], undefined, 'nothing of Peggy\'s');
  assert.equal(g.guests['g-steffie'].dress, null, 'a dress acknowledgement Peggy ticked for Steffie counts for nobody');
  assert.deepEqual(g.guests['g-steffie'].profile, {}, 'a profile Peggy wrote for Steffie is not carried');
  assert.equal(g.contact.email, 'both@example.com', 'the party contact is an initial value, to confirm in step 01');
  const t = JSON.parse(store.get('siyl.temple'));
  assert.equal(t.by['g-steffie'].attend, 'yes');
  assert.equal(t.by['g-steffie'].off, 'yes', 'the explicit pair decision becomes her own');
  assert.equal(t.pair, undefined); assert.equal(t.by['g-peggy'], undefined);
  const b = JSON.parse(store.get('siyl.bag'));
  assert.deepEqual(b.map((x) => [x.id, x.qty]), [['train', 1], ['sangkhathan', 1], ['wedstay', 1]], 'every line is one guest\'s');
  assert.ok(b.every((x) => !x.by));
  assert.equal(b[2].unit, undefined, 'no room place is invented — the guest chooses it');
  assert.equal(store.has('siyl.sent'), false, 'a party send is not this guest\'s send');
  assert.equal(store.has('siyl.who'), false);
  const note = JSON.parse(store.get('siyl.migrated'));
  assert.equal(note.from, 'INV-DEMO-002'); assert.equal(note.guestId, 'g-steffie');
  assert.ok(note.moved.includes('profile:skipped-written-by-another'));
  /* Peggy's own device-state, in her own name, comes to her */
  const store2 = new Map();
  store2.set('siyl.draft.owner', 'INV-DEMO-002');
  store2.set('siyl.guest', JSON.stringify({ guests: { 'g-peggy': { submitted: {}, profile: { drink: 'Matcha', comfort: 'x' }, history: [{ field: 'profile.drink', by: 'g-peggy' }], dress: { acknowledged: true, at: 'x', by: 'g-peggy' } } } }));
  const w2 = await inviteHarness(store2);
  await w2.SIYL_AUTH.set({ ...PEGGY, token: 'demo-peggy-code' });
  const g2 = JSON.parse(store2.get('siyl.guest'));
  assert.equal(g2.guests['g-peggy'].profile.drink, 'Matcha');
  assert.equal(g2.guests['g-peggy'].profile.comfort, undefined, 'the retired question is not carried');
  assert.ok(g2.guests['g-peggy'].dress);
});

test('AUTH · the hosts are the guests the register marks, never a name; the Sangkhathan eligibility is explicit', () => {
  const w = page({ auth: HARUTHAI });
  assert.equal(w.SIYL_PRICE.hosts(), true);
  assert.equal(w.SIYL_GUEST.party().hosts, true);
  assert.equal(w.SIYL_GUEST.me().hostRole, 'BRIDE');
  assert.equal(page({ auth: PEGGY }).SIYL_PRICE.hosts(), false);
  assert.equal(page({ auth: { ...PEGGY, preferredName: 'Haruthai', fullName: 'Haruthai X' } }).SIYL_PRICE.hosts(), false, 'a name proves nothing');
  assert.equal(page({ auth: { ...LIN, sangkhathan: 'NONE' } }).SIYL_TEMPLE.eligibility(), 'NONE');
  assert.equal(page({ auth: { ...LIN, sangkhathan: 'PAIR' } }).SIYL_TEMPLE.eligibility(), null, 'the retired value is unresolved');
  assert.equal(page({ auth: LIN }).SIYL_TEMPLE.eligibility(), 'ELIGIBLE');
});

test('AUTH · the builder issues one invitation per active guest, keeps the lead\'s code, ships no name and no code in the index', () => {
  const b = src('src/build-invitations.cjs');
  assert.match(b, /invitationIdOf = \(guestId\) => 'INV-' \+ guestId/);
  assert.match(b, /function codeKeeper\(p\)/);
  assert.match(b, /if \(!active\) continue;/);
  assert.match(b, /authIdOf\(await bearerOf\(token\)\)/);
  assert.match(b, /PLAINTEXT LEAK/);
  assert.match(b, /guestId,invitationId,partyId,partyName,name,token,link,status/);
  const c = src('register/crypto.mjs');
  assert.match(c, /export async function bearerOf/); assert.match(c, /export async function authIdOf/);
  const inv = src('assets/invite.mjs');
  assert.doesNotMatch(inv, /token: inv\.token|token: String/, 'the code never enters the session');
  assert.match(inv, /bearer,/);
  assert.match(inv, /GUEST_KEYS = \['siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\]/);
});
