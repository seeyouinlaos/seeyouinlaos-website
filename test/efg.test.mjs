/* ============================================================================
   E · F · G — regression and state tests.

   E  the Sangkhathan is one couple decision for an explicitly eligible pair,
      never inferred, never restored silently, USD 15 per participating guest.
   F  a journey is RECEIVED when sent and CONFIRMED only by Guest Relations,
      through a protected, idempotent, server-side act.
   G  two independent chair inventories; a seat belongs to a named guest; the
      new chair is held before the old one is released; family chairs are
      never selectable; frozen means no self-change; NO GEOMETRY IS INVENTED —
      the plan is validated configuration, and the fixture below is
      TEST/FIXTURE ONLY, never production geometry.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Seating, validateGeometry, seatsOf, RULES } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PARTY = {
  invitationId: 'INV-002', partyName: 'Peggy & Steffie', partyLead: 'g-peggy',
  guests: [{ guestId: 'g-peggy', fullName: 'Peggy Berger', preferredName: 'Peggy' },
           { guestId: 'g-steffie', fullName: 'Steffie Miedel', preferredName: 'Steffie' }],
};
const PEGGY = 'g-peggy', STEFFIE = 'g-steffie';

/* a page: the browser modules in a sandbox, as in the C tests */
function page(auth, seed) {
  const store = new Map(), listeners = {};
  const sb = {
    console,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { readyState: 'complete', addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }, dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
      querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {} }, head: { appendChild() {} } },
    location: { pathname: '/wedding.html', hostname: 'localhost', search: '' },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(), fetch: () => Promise.reject(new Error('no network')),
  };
  sb.window = sb; vm.createContext(sb);
  if (auth) sb.localStorage.setItem('siyl.auth', JSON.stringify(auth));
  if (seed) Object.entries(seed).forEach(([k, v]) => sb.localStorage.setItem(k, JSON.stringify(v)));
  for (const f of ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/guest.js', 'assets/temple.js', 'assets/docs.js', 'assets/seating.js', 'assets/confirm.js']) vm.runInContext(src(f), sb, { filename: f });
  return sb;
}
const json = (w, k) => JSON.parse(w.localStorage.getItem(k) || 'null');

/* ======================================================================== E */

test('E · eligibility is explicit invitation metadata: PAIR, NONE, or unresolved — never inferred', () => {
  assert.equal(page({ ...PARTY, givingEligibility: 'PAIR' }).SIYL_TEMPLE.eligibility(), 'PAIR');
  assert.equal(page({ ...PARTY, givingEligibility: 'NONE' }).SIYL_TEMPLE.eligibility(), 'NONE');
  assert.equal(page(PARTY).SIYL_TEMPLE.eligibility(), null, 'two names are not a pair');
  assert.equal(page({ ...PARTY, givingEligibility: 'COUPLE' }).SIYL_TEMPLE.eligibility(), null, 'unknown values are unresolved');
  const t = src('assets/temple.js');
  assert.doesNotMatch(t, /length === 2|length == 2/, 'no party-size inference');
  const inv = src('assets/invite.mjs');
  assert.match(inv, /givingEligibility: inv\.givingEligibility === 'PAIR' \|\| inv\.givingEligibility === 'NONE' \? inv\.givingEligibility : null/);
  const b = src('src/build-invitations.cjs');
  assert.match(b, /inv\.givingEligibility === 'PAIR' \|\| inv\.givingEligibility === 'NONE'/);
});

test('E · PAIR: one couple decision, both take part or neither, USD 30 for the party', () => {
  const w = page({ ...PARTY, givingEligibility: 'PAIR' });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
  G.setActive(PEGGY);
  assert.equal(T.pairCan(), false, 'not until both attend');
  assert.equal(T.setOffering(PEGGY, 'yes'), false);
  T.setAttendance(PEGGY, 'yes');
  assert.equal(T.pairCan(), false);
  T.setAttendance(STEFFIE, 'yes');
  assert.equal(T.pairCan(), true);
  assert.ok([...T.openFor(PEGGY)].includes('Sangkhathan'), 'the couple decision is open');
  assert.equal(T.setOffering(PEGGY, 'yes'), true);
  assert.equal(T.offeringOf(PEGGY), true);
  assert.equal(T.offeringOf(STEFFIE), true, 'never Peggy yes / Steffie no');
  assert.equal(T.offerings(), 2);
  assert.equal(json(w, 'siyl.temple').pair.by, PEGGY, 'the decision is signed');
  const line = B.get().find((x) => x.id === 'sangkhathan');
  assert.equal(line.qty, 2);
  assert.equal(line.price, 15);
  assert.equal(B.total(), 30, 'USD 15 per participating named guest, USD 30 for the party');
  const op = T.operational();
  assert.equal(op.sangkhathanEligibility, 'PAIR');
  assert.equal(op.sangkhathanPair, 'yes');
  assert.deepEqual([...op.guests.map((g) => g.sangkhathanState)], ['Selected', 'Selected']);
  assert.equal(op.offeringsUsd, 30);
  /* the other answer */
  T.setOffering(STEFFIE, 'no');
  assert.equal(T.offerings(), 0);
  assert.equal(B.has('sangkhathan'), false);
  assert.deepEqual([...T.operational().guests.map((g) => g.sangkhathanState)], ['Not selected', 'Not selected']);
});

test('E · the couple decision depends on every named guest attending, and is never restored silently', () => {
  const w = page({ ...PARTY, givingEligibility: 'PAIR' });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
  G.setActive(PEGGY);
  T.setAttendance(PEGGY, 'yes'); T.setAttendance(STEFFIE, 'yes'); T.setOffering(PEGGY, 'yes');
  assert.equal(B.total(), 30);
  T.setAttendance(STEFFIE, 'no');
  assert.equal(T.pairCan(), false);
  assert.equal(T.pairDecision(), null);
  assert.equal(json(w, 'siyl.temple').pair, undefined, 'the decision is removed, not hidden');
  assert.equal(B.has('sangkhathan'), false, 'and the line is gone from the journey');
  assert.equal(T.operational().guests[1].sangkhathanState, 'Not applicable');
  T.setAttendance(STEFFIE, 'yes');
  assert.equal(T.pairDecision(), null, 'asked again, from not decided');
  assert.ok([...T.openFor(STEFFIE)].includes('Sangkhathan'));
  assert.equal(T.operational().sangkhathanPair, 'Decision required');
});

test('E · NONE and unresolved: nothing is offered, nothing blocks, nothing is priced', () => {
  for (const [auth, elig, state] of [[{ ...PARTY, givingEligibility: 'NONE' }, 'NONE', 'Not eligible'], [PARTY, 'UNRESOLVED', 'Not available yet']]) {
    const w = page(auth);
    const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
    G.setActive(PEGGY);
    T.setAttendance(PEGGY, 'yes'); T.setAttendance(STEFFIE, 'yes');
    assert.equal(T.pairCan(), false);
    assert.equal(T.setOffering(PEGGY, 'yes'), false);
    assert.ok(![...T.openFor(PEGGY)].includes('Sangkhathan'), 'the Sangkhathan never blocks a journey it is not offered to');
    assert.equal(B.has('sangkhathan'), false);
    const op = T.operational();
    assert.equal(op.sangkhathanEligibility, elig);
    assert.deepEqual([...op.guests.map((g) => g.sangkhathanState)], [state, state]);
    assert.equal(op.offeringsUsd, 0);
  }
  const wd = src('wedding.html');
  assert.match(wd, /There is nothing you need to arrange for your invitation\./);
  assert.match(wd, /Guest Relations will let you know if there is anything to arrange for your invitation\./);
  assert.doesNotMatch(wd, /metadata|configuration incomplete|givingEligibility undefined/i, 'no technical wording on the surface');
  assert.match(wd, /data-off="yes">We would like to take part/);
  assert.match(wd, /data-off="no">Continue without Sangkhathan/);
  assert.match(wd, /Total for your party/);
});

test('E · the production bundle ships no inferred eligibility: every invitation is explicit or unresolved', () => {
  const list = JSON.parse(src('src/guestlist.private.json'));
  const explicit = list.filter((i) => i.givingEligibility === 'PAIR' || i.givingEligibility === 'NONE');
  const bad = list.filter((i) => i.givingEligibility && !['PAIR', 'NONE'].includes(i.givingEligibility));
  assert.equal(bad.length, 0, 'only PAIR or NONE may be written');
  assert.ok(explicit.length <= list.length);
});

/* ======================================================================== F */

/* the Worker's handlers against an in-memory KV */
async function worker() {
  const mod = await import('../src/worker.js');
  return mod.default;
}
function kv() {
  const m = new Map(), meta = new Map();
  return {
    async get(k, type) { const v = m.get(k); if (v == null) return null; return type === 'json' ? JSON.parse(v) : v; },
    async getWithMetadata(k) { return { value: m.has(k) ? m.get(k) : null, metadata: meta.get(k) || null }; },
    async put(k, v, o) { m.set(k, v); meta.set(k, (o && o.metadata) || null); },
    _m: m,
  };
}
const req = (path, init) => new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev' + path, init);

test('F · status: none → received (after a stored registration) → confirmed (only by Guest Relations)', async () => {
  const w = await worker();
  const env = { REG_KV: kv(), GR_TOKEN: 'secret-token-of-guest-relations', ASSETS: { fetch: () => new Response('') } };
  let r = await (await w.fetch(req('/api/status?invitation=INV-002'), env)).json();
  assert.deepEqual([r.received, r.confirmed], [false, false]);
  /* a registration lands (the register route stores it; the mail call fails harmlessly here) */
  globalThis.fetch = async () => new Response('', { status: 500 });
  r = await (await w.fetch(req('/api/register', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-002', text: 'SEE YOU IN LAOS — JOURNEY SELECTION', registration: { registration_submitted_at: '2026-09-11T10:00:00.000Z' } }) }), env)).json();
  assert.equal(r.ok, true);
  assert.equal(r.status, 'UNDER_REVIEW', 'sending never confirms');
  r = await (await w.fetch(req('/api/status?invitation=INV-002'), env)).json();
  assert.deepEqual([r.received, r.receivedAt, r.confirmed], [true, '2026-09-11T10:00:00.000Z', false]);
  /* the guest cannot confirm: no token, wrong token */
  assert.equal((await w.fetch(req('/api/confirm', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-002' }) }), env)).status, 401);
  assert.equal((await w.fetch(req('/api/confirm', { method: 'POST', headers: { 'x-gr-token': 'secret-token-of-guest-relationX' }, body: JSON.stringify({ invitationId: 'INV-002' }) }), env)).status, 401);
  /* Guest Relations confirms; twice is once */
  r = await (await w.fetch(req('/api/confirm', { method: 'POST', headers: { 'x-gr-token': env.GR_TOKEN }, body: JSON.stringify({ invitationId: 'INV-002', actor: 'GR' }) }), env)).json();
  assert.equal(r.ok, true); assert.ok(r.confirmedAt);
  const again = await (await w.fetch(req('/api/confirm', { method: 'POST', headers: { 'x-gr-token': env.GR_TOKEN }, body: JSON.stringify({ invitationId: 'INV-002', actor: 'GR' }) }), env)).json();
  assert.equal(again.unchanged, true); assert.equal(again.confirmedAt, r.confirmedAt);
  r = await (await w.fetch(req('/api/status?invitation=INV-002'), env)).json();
  assert.equal(r.confirmed, true);
  const rec = JSON.parse(env.REG_KV._m.get('conf:INV-002'));
  assert.equal(rec.actor, 'GR'); assert.equal(rec.source, 'gr-endpoint'); assert.equal(rec.history.length, 1);
  /* without the secret the whole operation is disabled, never open */
  assert.equal((await w.fetch(req('/api/confirm', { method: 'POST', body: '{}' }), { REG_KV: kv() })).status, 503);
});

test('F · the token never reaches the client, and the surface never confirms itself', () => {
  for (const f of ['assets/confirm.js', 'assets/seating.js', 'review.html', 'wedding-preparation.html', 'assets/prep-shell.js']) {
    assert.doesNotMatch(src(f), /x-gr-token|GR_TOKEN|api\/confirm/, f + ' touches the Guest Relations gate');
  }
  const c = src('assets/confirm.js');
  assert.match(c, /if \(status\.confirmed\) return 'confirmed';/);
  assert.match(c, /noteReceived/);
  assert.doesNotMatch(c, /confirmed: true/, 'the client never writes the confirmed state');
  const rv = src('review.html');
  assert.match(rv, /Journey received/); assert.match(rv, /Journey confirmed/);
  assert.match(rv, /A · Party journey confirmation/); assert.match(rv, /B · Personal wedding card/);
  assert.doesNotMatch(rv, /BOOKING CONFIRMED|RESERVATION CONFIRMED|PAYMENT COMPLETE|ORDER CONFIRMED|boarding|barcode|<svg[^>]*qr/i);
  assert.match(rv, /p\.guests\.forEach\(function\(g\)\{\s*var id=g\.guestId,row=op/, 'one card per named guest, from that guest\'s own state');
});

/* ======================================================================== G */

const storageStub = () => {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? m.get(k) : undefined; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; },
  };
};
function ledger() {
  const storage = storageStub();
  return new Seating({ storage, blockConcurrencyWhile: (fn) => fn() });
}
const call = (l, op, body, opts = {}) => l.fetch(new Request('https://x/api/seating/' + op + (opts.q || ''), {
  method: body ? 'POST' : 'GET', headers: opts.gr ? { 'x-gr-verified': 'yes' } : {}, body: body ? JSON.stringify(body) : undefined,
})).then(async (r) => ({ status: r.status, ...(await r.json()) }));

test('G · the geometry contract enforces the frozen truth and refuses anything else', () => {
  const ok = validateGeometry(SEAT_FIXTURE);
  assert.equal(ok.ok, true, ok.errors.join(' · '));
  assert.equal(seatsOf(ok.config, 'ceremony').length, 40);
  assert.equal(seatsOf(ok.config, 'ceremony').filter((s) => s.side === 'L').length, 20);
  assert.equal(seatsOf(ok.config, 'ceremony').filter((s) => s.family && s.side === 'L').length, RULES.ceremony.family.L);
  assert.equal(seatsOf(ok.config, 'ceremony').filter((s) => s.family && s.side === 'R').length, RULES.ceremony.family.R);
  assert.equal(seatsOf(ok.config, 'dinner').length, 40);
  assert.equal(seatsOf(ok.config, 'dinner').filter((s) => s.family).length, 6);
  /* 39 seats, a third family chair on the right, a wrong id grammar, a duplicate */
  const c = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  c.ceremony.rows[0].seats.pop();
  assert.match(validateGeometry(c).errors.join(' '), /left must hold 20/);
  const d = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  d.ceremony.rows.find((r) => r.side === 'R').seats[2].family = true;
  assert.match(validateGeometry(d).errors.join(' '), /right must reserve 2/);
  const e = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  e.dinner.sides.L[0].seatId = 'DL1';
  assert.match(validateGeometry(e).errors.join(' '), /D-L-\[POSITION\]/);
  const f = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  f.dinner.sides.R[1].seatId = f.dinner.sides.R[0].seatId;
  assert.match(validateGeometry(f).errors.join(' '), /duplicate/);
  /* 42 or 46 sellable seats can never be configured */
  const g = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  g.dinner.sides.L.push({ seatId: 'D-L-21' }); g.dinner.sides.R.push({ seatId: 'D-R-21' });
  assert.equal(validateGeometry(g).ok, false);
});

test('G · production ships no geometry: unconfigured, not open, NOT OPEN YET', async () => {
  const l = ledger();
  const v = await call(l, 'read', null, { q: '?invitation=INV-002' });
  assert.deepEqual([v.open, v.frozen, v.configured.ceremony, v.configured.dinner, v.ceremony, v.dinner], [false, false, false, false, null, null]);
  const s = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'ceremony', seatId: 'C-L-1-1' });
  assert.equal(s.status, 423);
  for (const f of ['assets/seating.js', 'src/seating.js', 'wedding-preparation.html', 'src/worker.js']) {
    assert.doesNotMatch(src(f), /seatId:\s*'[CD]-[LR]-\d|'C-[LR]-\d+-\d+'|'D-[LR]-\d+'/, f + ' carries a floor plan of its own');
  }
  assert.match(src('wedding-preparation.html'), /Not open yet/);
  const fx = src('test/fixtures.mjs');
  assert.match(fx, /TEST\/FIXTURE ONLY/);
});

test('G · a seat belongs to a named guest; the new chair is held before the old is released; taken is taken', async () => {
  const l = ledger();
  assert.equal((await call(l, 'config', SEAT_FIXTURE, { gr: true })).ok, true);
  assert.equal((await call(l, 'config', SEAT_FIXTURE)).status, 404, 'no gate, no configuration');
  await call(l, 'state', { open: true }, { gr: true });
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'ceremony').filter((s) => !s.family).map((s) => s.seatId);
  const fam = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'ceremony').filter((s) => s.family)[0].seatId;
  let r = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'ceremony', seatId: free[0] });
  assert.equal(r.ok, true);
  assert.equal(r.mine.ceremony[PEGGY], free[0]);
  /* another invitation cannot take Peggy's chair */
  r = await call(l, 'select', { invitationId: 'INV-003', guestId: 'g-seray', event: 'ceremony', seatId: free[0] });
  assert.equal(r.status, 409); assert.equal(r.error, 'taken');
  /* Steffie, same invitation, cannot take it either — the chair is Peggy's, by name */
  r = await call(l, 'select', { invitationId: 'INV-002', guestId: STEFFIE, event: 'ceremony', seatId: free[0] });
  assert.equal(r.status, 409);
  /* Peggy changes: the new chair is held, then the old is released */
  r = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'ceremony', seatId: free[1] });
  assert.equal(r.ok, true);
  assert.equal(r.mine.ceremony[PEGGY], free[1]);
  const view = await call(l, 'read', null, { q: '?invitation=INV-003' });
  const flat = view.ceremony.rows.flatMap((x) => x.seats);
  assert.equal(flat.find((s) => s.seatId === free[0]).state, 'available', 'the old chair was released');
  assert.equal(flat.find((s) => s.seatId === free[1]).state, 'taken', 'and shown as taken to everyone else, without a name');
  assert.equal(flat.find((s) => s.seatId === free[1]).guestId, undefined);
  /* family chairs are never selectable */
  r = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'ceremony', seatId: fam });
  assert.equal(r.status, 409);
  /* the two inventories are independent */
  r = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'dinner', seatId: 'D-L-4' });
  assert.equal(r.ok, true);
  const mine = await call(l, 'mine', null, { q: '?invitation=INV-002' });
  assert.deepEqual(JSON.parse(JSON.stringify(mine.mine)), { ceremony: { [PEGGY]: free[1] }, dinner: { [PEGGY]: 'D-L-4' } });
  /* frozen: the guest sees, cannot change; Guest Relations still can */
  await call(l, 'state', { frozen: true }, { gr: true });
  r = await call(l, 'select', { invitationId: 'INV-002', guestId: PEGGY, event: 'ceremony', seatId: free[2] });
  assert.equal(r.status, 423);
  r = await call(l, 'assign', { invitationId: 'INV-002', guestId: STEFFIE, event: 'ceremony', seatId: free[3], actor: 'GR' }, { gr: true });
  assert.equal(r.ok, true); assert.equal(r.state, 'allocated');
  const plan = await call(l, 'plan', null, { gr: true });
  assert.equal(plan.events.ceremony.total, 40);
  assert.equal(plan.events.ceremony.family, 6);
  assert.equal(plan.events.ceremony.held, 1);
  assert.equal(plan.events.ceremony.allocated, 1);
  assert.equal(plan.events.ceremony.available, 32);
  assert.equal(plan.events.ceremony.seats.find((s) => s.seatId === free[3]).guestId, STEFFIE);
});

test('G · the renderer draws only what it is given: rows facing the ceremony, one long table, states in marks', () => {
  const w = page({ ...PARTY, givingEligibility: 'PAIR' });
  const S = w.SIYL_SEATS;
  const cfg = validateGeometry(SEAT_FIXTURE).config;
  const view = { ceremony: { rows: cfg.ceremony.rows.map((r) => ({ ...r, seats: r.seats.map((s, i) => ({ ...s, state: s.family ? 'family' : (i === 0 && r.row === 2 && r.side === 'L' ? 'yours' : 'available'), guestId: PEGGY })) })) },
                 dinner: { sides: { L: cfg.dinner.sides.L.map((s, i) => ({ ...s, state: s.family ? 'family' : (i === 5 ? 'taken' : 'available') })), R: cfg.dinner.sides.R.map((s) => ({ ...s, state: s.family ? 'family' : 'available' })) } } };
  const c = S.svg('ceremony', view, { guestId: PEGGY, selectable: true });
  assert.equal((c.match(/<g class="seat/g) || []).length, 40);
  assert.equal((c.match(/seat-family/g) || []).length, 6);
  assert.equal((c.match(/seat-yours/g) || []).length, 1);
  assert.equal((c.match(/role="button"/g) || []).length, 34, 'available and your own chair are selectable, family is not');
  assert.match(c, />CEREMONY</); assert.match(c, />LEFT</); assert.match(c, />RIGHT</);
  const d = S.svg('dinner', view, { guestId: STEFFIE, selectable: true });
  assert.equal((d.match(/<g class="seat/g) || []).length, 40);
  assert.equal((d.match(/seat-taken/g) || []).length, 1);
  assert.match(d, />BRIDE</); assert.match(d, />GROOM</);
  assert.equal((d.match(/role="button"/g) || []).length, 33);
  /* nothing drawn without configuration */
  assert.equal((S.svg('ceremony', { ceremony: null }, {}).match(/<g class="seat/g) || []).length, 0);
  /* states are said in words, never colour alone */
  assert.match(S.legend(), /Selected by you/); assert.match(S.legend(), /Reserved · family/); assert.match(S.legend(), /Taken/);
  assert.doesNotMatch(src('assets/seating.js'), /#(ff0000|00ff00|e53935|43a047|2196f3)/i, 'no airline colours');
});
