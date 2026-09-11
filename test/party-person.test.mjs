/* ============================================================================
   C · PARTY / PERSON STATE SEPARATION — state-transition and regression tests.

   The browser modules (assets/guest.js, temple.js, docs.js, bag.js) are plain
   IIFEs on window. They are loaded here into a sandbox with a Map-backed
   localStorage and a minimal document, exactly as a page would load them, so
   what is tested is the shipped code and not a re-implementation of it.

   The walk under test is the 002 acceptance walk for Peggy & Steffie:
     the code opens the INVITATION (party) · WHO ARE YOU establishes the
     active person · SWITCH IDENTITY changes who is continuing and never
     touches anyone's data · ANSWERING FOR keeps the active person and
     deliberately completes a permitted personal item for the other · party
     state is shared · personal state belongs to one named guest · a session
     from another invitation, or from before the names existed, recovers.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---- the invitation, exactly as invite.mjs stores it after a real code ---- */
const PARTY = {
  invitationId: 'INV-002', partyName: 'Peggy & Steffie', partyLead: 'g-peggy',
  guests: [
    { guestId: 'g-peggy', fullName: 'Peggy Berger', preferredName: 'Peggy' },
    { guestId: 'g-steffie', fullName: 'Steffie Miedel', preferredName: 'Steffie' },
  ],
  at: '2026-09-11T00:00:00.000Z',
};
const PEGGY = 'g-peggy', STEFFIE = 'g-steffie';

/* ---- a page: window + localStorage + the least document that the modules touch */
function page(opts = {}) {
  const store = new Map();
  const listeners = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      _store: store,
    },
    document: {
      readyState: 'complete',
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }),
      body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {} },
      head: { appendChild() {} },
    },
    location: { pathname: '/' + (opts.path || 'about-you.html'), hostname: 'localhost', search: opts.search || '' },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(),
    fetch: () => Promise.reject(new Error('no network in tests')),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  if (opts.auth !== null) sandbox.localStorage.setItem('siyl.auth', JSON.stringify(opts.auth === undefined ? PARTY : opts.auth));
  if (opts.seed) Object.entries(opts.seed).forEach(([k, v]) => sandbox.localStorage.setItem(k, JSON.stringify(v)));
  for (const f of ['assets/bag.js', 'assets/guest.js', 'assets/temple.js', 'assets/docs.js']) {
    vm.runInContext(src(f), sandbox, { filename: f });
  }
  sandbox.events = listeners;
  return sandbox;
}
const json = (w, k) => JSON.parse(w.localStorage.getItem(k) || 'null');
/* values cross the vm realm: compare by structure, not by prototype */
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));
const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);

/* ======================================================================== */
/* B · AUTHENTICATION BOUNDARY — the code opens the PARTY, not a person       */
/* ======================================================================== */

test('before any invitation: no party, no who, no active, not stale', () => {
  const w = page({ auth: null });
  const G = w.SIYL_GUEST;
  assert.equal(G.party(), null);
  assert.equal(G.who(), null);
  assert.equal(G.active(), null);
  assert.equal(G.subject(), null);
  assert.equal(G.stale(), false);
});

test('the code authenticates the invitation: party is open, but nobody is continuing yet', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  const p = G.party();
  assert.equal(p.invitationId, 'INV-002');
  deq(p.guests.map((g) => g.preferredName), ['Peggy', 'Steffie']);
  assert.equal(G.active(), null, 'WHO ARE YOU has not been answered');
  deq(G.who(), { partyId: 'INV-002', activeGuestId: null, subjectGuestId: null });
  assert.equal(G.partyNames(), 'Peggy & Steffie');
  assert.equal(G.partyLabel(), 'For your party · Peggy & Steffie');
});

test('WHO ARE YOU → Peggy: activeGuestId = Peggy, subject defaults to Peggy, stored against the invitation', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  let fired = 0;
  w.document.addEventListener('siyl:who', () => fired++);
  assert.equal(G.setActive(PEGGY), true);
  assert.equal(G.active().guestId, PEGGY);
  assert.equal(G.activeName(), 'Peggy');
  assert.equal(G.subject().guestId, PEGGY);
  assert.equal(G.answeringFor(), false);
  deq(G.who(), { partyId: 'INV-002', activeGuestId: PEGGY, subjectGuestId: PEGGY });
  assert.equal(json(w, 'siyl.who').partyId, 'INV-002');
  assert.equal(json(w, 'siyl.who').guestId, PEGGY);
  assert.equal(fired, 1);
});

test('an identity that is not on the invitation is refused', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  assert.equal(G.setActive('g-intruder'), false);
  assert.equal(G.active(), null);
  assert.equal(json(w, 'siyl.who'), null);
});

/* ======================================================================== */
/* STALE-SESSION RECOVERY                                                    */
/* ======================================================================== */

test('an identity chosen on another invitation does not carry over: WHO ARE YOU is asked again', () => {
  const w = page({ seed: { 'siyl.who': { partyId: 'INV-003', guestId: 'g-seray', at: 'x' } } });
  const G = w.SIYL_GUEST;
  assert.equal(G.active(), null);
  assert.equal(G.who().activeGuestId, null);
  assert.equal(G.setActive(STEFFIE), true);
  assert.equal(G.active().guestId, STEFFIE);
});

test('a session from before the names existed is stale: no party, no identity, nothing invented', () => {
  const w = page({ auth: { invitationId: 'INV-002', partyName: 'Peggy & Steffie', at: 'x' },
                   seed: { 'siyl.who': { partyId: 'INV-002', guestId: PEGGY, at: 'x' } } });
  const G = w.SIYL_GUEST;
  assert.equal(G.stale(), true);
  assert.equal(G.party(), null);
  assert.equal(G.active(), null);
  assert.equal(G.setActive(PEGGY), false, 'no names, no identity');
});

test('recovery keeps the journey: the party bag and the personal records survive a stale session', () => {
  const bag = [{ id: 'bkk-shama', name: 'Shama Yen-Akat', price: 300, qty: 1 }];
  const guests = { [PEGGY]: { submitted: {}, profile: { drink: 'Riesling' }, history: [] } };
  const w = page({ auth: { invitationId: 'INV-002', at: 'x' }, seed: { 'siyl.bag': bag, 'siyl.guest': { guests } } });
  deq(json(w, 'siyl.bag'), bag);
  /* the names come back with the code */
  w.localStorage.setItem('siyl.auth', JSON.stringify(PARTY));
  const G = w.SIYL_GUEST;
  assert.equal(G.stale(), false);
  assert.equal(G.profile(PEGGY, 'drink'), 'Riesling');
  assert.equal(w.SIYL_BAG.get().length, 1);
});

/* ======================================================================== */
/* C · TWO DIFFERENT PERSON ACTIONS — SWITCH IDENTITY vs ANSWERING FOR       */
/* ======================================================================== */

test('SWITCH IDENTITY changes who is continuing and touches nobody\'s data', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  G.setProfile(PEGGY, 'drink', 'Riesling');
  G.set(PEGGY, 'preferredName', 'Peg');
  /* Peggy → Steffie */
  assert.equal(G.setActive(STEFFIE), true);
  assert.equal(G.active().guestId, STEFFIE);
  assert.equal(G.subject().guestId, STEFFIE, 'switching resets the subject to the new person');
  assert.equal(G.answeringFor(), false);
  /* Peggy's record is exactly as she left it */
  assert.equal(G.profile(PEGGY, 'drink'), 'Riesling');
  assert.equal(G.value(PEGGY, 'preferredName'), 'Peg');
  /* Steffie's record is untouched and empty */
  assert.equal(G.profile(STEFFIE, 'drink'), '');
  assert.equal(G.value(STEFFIE, 'preferredName'), 'Steffie');
  assert.equal(G.profileAnswered(STEFFIE), 0);
});

test('ANSWERING FOR: Peggy stays active, the subject is Steffie, and the record written is Steffie\'s, signed by Peggy', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  let fired = 0;
  w.document.addEventListener('siyl:subject', () => fired++);
  assert.equal(G.setSubject(STEFFIE), true);
  assert.equal(fired, 1);
  assert.equal(G.active().guestId, PEGGY, 'still authenticated as Peggy');
  assert.equal(G.subject().guestId, STEFFIE);
  assert.equal(G.answeringFor(), true);
  assert.equal(G.subjectName(), 'Steffie');

  G.setProfile(G.subject().guestId, 'dietary', 'No shellfish');
  assert.equal(G.profile(STEFFIE, 'dietary'), 'No shellfish');
  assert.equal(G.profile(PEGGY, 'dietary'), '', 'Peggy\'s own record is untouched');
  const h = G.rec(STEFFIE).history;
  assert.equal(h.length, 1);
  assert.equal(h[0].field, 'profile.dietary');
  assert.equal(h[0].to, 'No shellfish');
  assert.equal(h[0].by, PEGGY, 'provenance: who actually wrote it');
  assert.equal(G.rec(PEGGY).history.length, 0);
});

test('the subject is never persisted: a new page starts answering for the active person again', () => {
  const w = page();
  w.SIYL_GUEST.setActive(PEGGY);
  w.SIYL_GUEST.setSubject(STEFFIE);
  assert.equal(json(w, 'siyl.who').guestId, PEGGY);
  assert.equal(json(w, 'siyl.who').subjectGuestId, undefined);
  const w2 = page({ seed: { 'siyl.who': json(w, 'siyl.who') } });
  assert.equal(w2.SIYL_GUEST.active().guestId, PEGGY);
  assert.equal(w2.SIYL_GUEST.subject().guestId, PEGGY);
  assert.equal(w2.SIYL_GUEST.answeringFor(), false);
});

test('an explicit deep link may set the subject, an unknown one may not', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  assert.equal(G.setSubject('g-nobody'), false);
  assert.equal(G.subject().guestId, PEGGY);
  assert.equal(G.answeringFor(), false);
  assert.equal(G.setSubject(null), true, 'back to yourself');
  assert.equal(G.subject().guestId, PEGGY);
});

test('nobody can answer for anyone before WHO ARE YOU: there is no subject without an active person', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  assert.equal(G.setSubject(STEFFIE), false);
  assert.equal(G.subject(), null);
});

test('switching identity while answering for someone ends the answering-for', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  G.setSubject(STEFFIE);
  G.setActive(STEFFIE);
  assert.equal(G.answeringFor(), false);
  assert.equal(G.subject().guestId, STEFFIE);
});

/* ======================================================================== */
/* D · PARTY STATE VS PERSONAL STATE                                          */
/* ======================================================================== */

test('every piece of state is classified — party or personal — and the classification is the spec\'s', () => {
  const G = page().SIYL_GUEST;
  for (const k of ['identity', 'contact', 'journey', 'costs']) assert.equal(G.scopeOf(k), 'party', k);
  for (const k of ['names', 'profile', 'access', 'temple', 'events', 'sangkhathan', 'dress', 'documents', 'consent', 'ceremonySeat', 'dinnerSeat'])
    assert.equal(G.scopeOf(k), 'personal', k);
  assert.equal(G.scopeOf('something-new'), null, 'unknown state has no scope, and no home');
  const all = G.SCOPE.party.concat(G.SCOPE.personal);
  assert.equal(new Set(all).size, all.length, 'no key lives in both');
});

test('PARTY STATE is shared: what Peggy chooses, Steffie sees', () => {
  const w = page();
  const G = w.SIYL_GUEST, B = w.SIYL_BAG;
  G.setActive(PEGGY);
  B.put({ id: 'bkk-u-sathorn', name: 'U Sathorn Bangkok', price: 300, qty: 1 });
  B.put({ id: 'bkk-u-sathorn', name: 'Shama Yen-Akat', price: 300, qty: 1 });   /* Peggy changes U Sathorn to Shama */
  G.setPartyField('email', 'peggy@example.com');
  G.setIdentityReviewed(true);
  G.setActive(STEFFIE);
  assert.equal(B.get()[0].name, 'Shama Yen-Akat', 'Steffie later sees Shama');
  assert.equal(G.partyField('email'), 'peggy@example.com');
  assert.ok(G.identityReviewed());
  const h = json(w, 'siyl.guest').history;
  assert.equal(h[0].field, 'party.email');
  assert.equal(h[0].by, PEGGY);
});

test('PERSONAL STATE belongs to one named guest and is never silently overwritten by the other', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  G.setProfile(PEGGY, 'drink', 'Riesling');
  G.setActive(STEFFIE);
  G.setProfile(STEFFIE, 'drink', 'Water');
  assert.equal(G.profile(PEGGY, 'drink'), 'Riesling');
  assert.equal(G.profile(STEFFIE, 'drink'), 'Water');
  assert.equal(G.labelFor(PEGGY), 'For Peggy');
  assert.equal(G.labelFor(STEFFIE), 'For Steffie');
});

/* ---- the dress-code acknowledgement is personal, and first person only ---- */

test('DRESS CODE: one acknowledgement per guest — Peggy\'s tick is not Steffie\'s', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  assert.equal(G.mayAcknowledge(PEGGY), true);
  assert.equal(G.mayAcknowledge(STEFFIE), false, 'an acknowledgement is not a permitted answering-for item');
  assert.equal(G.setDressAck(PEGGY, true), true);
  assert.ok(G.dressAck(PEGGY));
  assert.equal(G.dressAck(PEGGY).by, PEGGY);
  assert.equal(G.dressAck(PEGGY).textVersion, G.DRESS_VERSION);
  assert.equal(G.dressAck(STEFFIE), null);
  assert.equal(G.dressAckAll(), false);
  /* Peggy cannot tick for Steffie — not even while answering for her */
  G.setSubject(STEFFIE);
  assert.equal(G.setDressAck(STEFFIE, true), false);
  assert.equal(G.dressAck(STEFFIE), null);
  /* Steffie switches in and acknowledges for herself */
  G.setActive(STEFFIE);
  assert.equal(G.setDressAck(STEFFIE, true), true);
  assert.equal(G.dressAckAll(), true);
  /* and withdrawing is hers too */
  G.setDressAck(STEFFIE, false);
  assert.equal(G.dressAck(STEFFIE), null);
  assert.equal(G.dressAckAll(), false);
});

test('a party-wide acknowledgement from before C is kept as history and counts for nobody', () => {
  const w = page({ seed: { 'siyl.guest': { dress: { acknowledged: true, at: '2026-09-09T10:00:00Z', textVersion: '2026-09-09' } } } });
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  assert.equal(G.dressAck(PEGGY), null);
  assert.equal(G.dressAck(STEFFIE), null);
  assert.equal(G.dressAckAll(), false);
  const st = json(w, 'siyl.guest');
  assert.equal(st.dress, undefined, 'the party-level field is gone');
  assert.equal(st.dressLegacy.at, '2026-09-09T10:00:00Z', 'and nothing was destroyed');
});

test('dressAck() without a name means the active person — the legacy dress page keeps working', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  assert.equal(G.dressAck(), null);
  G.setActive(STEFFIE);
  G.setDressAck(STEFFIE, true);
  assert.ok(G.dressAck());
  assert.equal(G.dressAck().by, STEFFIE);
});

/* ---- the wedding decisions carry the name of the person who answered ---- */

test('TEMPLE: Peggy may answer for Steffie, and the answer says Peggy wrote it', () => {
  const w = page();
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE;
  G.setActive(PEGGY);
  T.setAttendance(PEGGY, 'yes');
  T.setAttendance(STEFFIE, 'no');
  assert.equal(T.attendanceOf(PEGGY), 'yes');
  assert.equal(T.attendanceOf(STEFFIE), 'no');
  const st = json(w, 'siyl.temple');
  assert.equal(st.by[PEGGY].by, PEGGY);
  assert.equal(st.by[STEFFIE].by, PEGGY, 'answered for Steffie by Peggy');
  /* Steffie switches in and changes her own mind: her record, her signature */
  G.setActive(STEFFIE);
  T.setAttendance(STEFFIE, 'yes');
  T.setOffering(STEFFIE, 'yes');
  assert.equal(json(w, 'siyl.temple').by[STEFFIE].by, STEFFIE);
  assert.equal(T.attendanceOf(PEGGY), 'yes', 'Peggy\'s answer is untouched');
  assert.equal(T.offeringOf(PEGGY), false);
  assert.equal(T.offerings(), 1);
});

/* ---- publication consent is personal and first person only ---- */

test('CONSENT: only the person may give or decline it', () => {
  const w = page();
  const G = w.SIYL_GUEST, D = w.SIYL_DOCS;
  G.setActive(PEGGY);
  assert.equal(D.mayConsent(PEGGY), true);
  assert.equal(D.mayConsent(STEFFIE), false);
  assert.equal(D.setConsent(PEGGY, true), true);
  assert.equal(D.setConsent(STEFFIE, true), false);
  assert.ok(D.consent(PEGGY));
  assert.equal(D.consent(PEGGY).by, PEGGY);
  assert.equal(D.consentDecided(STEFFIE), false);
  G.setActive(STEFFIE);
  assert.equal(D.setConsent(STEFFIE, false), true);
  assert.equal(D.consentDecided(STEFFIE), true);
  assert.equal(D.consent(STEFFIE), null, 'declined');
});

/* ======================================================================== */
/* THE STEPS AND THE RECORD                                                   */
/* ======================================================================== */

function decideAll(T, id) { T.EVENTS.forEach((e) => T.setEvent(id, e.key, 'no')); }

test('step 03 is not complete until every named guest has acknowledged the dress code', () => {
  const w = page();
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE;
  G.setActive(PEGGY);
  decideAll(T, PEGGY); decideAll(T, STEFFIE);
  assert.equal(T.decidedAll(), true);
  assert.equal(G.stepState('wedding'), 'In progress');
  G.setDressAck(PEGGY, true);
  assert.equal(G.stepState('wedding'), 'In progress', 'one of two');
  const s = G.steps().filter((x) => x.key === 'wedding')[0];
  assert.match(s.note, /Steffie/);
  G.setActive(STEFFIE);
  G.setDressAck(STEFFIE, true);
  assert.equal(G.stepState('wedding'), 'Completed');
});

test('readiness: the party cannot send while one personal acknowledgement is missing', () => {
  const w = page();
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
  G.setActive(PEGGY);
  G.setPartyField('phone', '+49 170 0000000');
  B.put({ id: 'bkk-shama', name: 'Shama Yen-Akat', price: 300, qty: 1 });
  decideAll(T, PEGGY); decideAll(T, STEFFIE);
  G.setDressAck(PEGGY, true);
  assert.equal(G.readiness().ok, false);
  deq(G.readiness().need.map((n) => n.key), ['wedding']);
  G.setActive(STEFFIE);
  G.setDressAck(STEFFIE, true);
  assert.equal(G.readiness().ok, true);
});

test('what Guest Relations receives says who sent it, and carries every personal state by name', () => {
  const w = page();
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE;
  G.setActive(PEGGY);
  G.setDressAck(PEGGY, true);
  G.setSubject(STEFFIE);
  G.setProfile(STEFFIE, 'drink', 'Water');
  T.setAttendance(STEFFIE, 'yes');
  const op = G.operational();
  assert.equal(op.invitationId, 'INV-002');
  assert.equal(op.submittedBy, PEGGY);
  assert.equal(op.party.label, 'For your party · Peggy & Steffie');
  deq(op.dress, { all: false, acknowledged: [PEGGY], missing: [STEFFIE] });
  const st = op.guests.filter((g) => g.guestId === STEFFIE)[0];
  assert.equal(st.dress, null);
  assert.equal(st.profile.drink, 'Water');
  assert.equal(st.temple, 'yes');
  assert.equal(st.history[0].by, PEGGY);
  const pg = op.guests.filter((g) => g.guestId === PEGGY)[0];
  assert.equal(pg.dress.by, PEGGY);
  deq(pg.source, { fullName: 'Peggy Berger', preferredName: 'Peggy' });
});

/* ======================================================================== */
/* REGRESSION — nothing C touched may move the product                       */
/* ======================================================================== */

test('the three layers are still three: source is never written, submitted and history keep the correction', () => {
  const w = page();
  const G = w.SIYL_GUEST;
  G.setActive(PEGGY);
  G.set(PEGGY, 'fullName', 'Peggy Berger-Miedel');
  assert.equal(G.source(PEGGY, 'fullName'), 'Peggy Berger');
  assert.equal(G.value(PEGGY, 'fullName'), 'Peggy Berger-Miedel');
  assert.equal(G.edited(PEGGY, 'fullName'), true);
  const h = G.rec(PEGGY).history[0];
  deq([h.field, h.from, h.to, h.by], ['fullName', 'Peggy Berger', 'Peggy Berger-Miedel', PEGGY]);
});

test('the Sangkhathan is still USD 15 per named participating guest, and nothing asks for eligibility', () => {
  const w = page();
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE;
  G.setActive(PEGGY);
  T.setAttendance(PEGGY, 'yes'); T.setOffering(PEGGY, 'yes');
  T.setAttendance(STEFFIE, 'yes'); T.setOffering(STEFFIE, 'yes');
  const op = T.operational();
  assert.equal(op.offerings, 2);
  assert.equal(op.offeringsUsd, 30);
  assert.equal(G.party().givingEligibility, undefined, 'E is not started');
});

test('the six steps are unchanged in number and order', () => {
  const G = page().SIYL_GUEST;
  deq(G.STEP_DEFS.map((s) => s.n), ['01', '02', '03', '04', '05', '06']);
});

test('the retired products still migrate in the bag, and the bag is party state', () => {
  const w = page({ seed: { 'siyl.bag': [{ id: 'mu9632', name: 'old', price: 275, qty: 1 }, { id: 'c642', name: 'old', price: 85, qty: 1 }] } });
  const b = w.SIYL_BAG.get();
  deq(b.map((x) => x.id), ['mu9646', 'c86']);
  deq(b.map((x) => x.price), [275, 85]);
});
