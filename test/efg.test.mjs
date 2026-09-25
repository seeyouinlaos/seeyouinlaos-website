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
import { Seating, validateGeometry, seatsOf, RULES, CAPACITY } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';
import { page as sandboxPage, json, src, PEGGY as PEGGY_S, STEFFIE as STEFFIE_S, LIN as LIN_S } from './sandbox.mjs';
import { authIdOf } from '../register/crypto.mjs';
import { complete } from './complete.mjs';

const PEGGY = 'g-peggy', STEFFIE = 'g-steffie';
/* step 01's required personal details (Owner, 24 Sep 2026) — obviously synthetic */
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
/* PRQ-GAP-02 (Window 007): the name on a seat is the first name the Worker puts on the verified identity — never the request body */
const ID_PEGGY = { invitationId: 'INV-g-peggy', guestId: PEGGY, partyId: 'INV-DEMO-002', hosts: false, firstName: 'Peggy' };
const ID_STEFFIE = { invitationId: 'INV-g-steffie', guestId: STEFFIE, partyId: 'INV-DEMO-002', hosts: false, firstName: 'Steffie' };
const ID_SERAY = { invitationId: 'INV-g-seray', guestId: 'g-seray', partyId: 'INV-DEMO-009', hosts: false, firstName: 'Seray' };
/* a page: the browser modules in a sandbox, one guest session */
function page(auth, seed) { return sandboxPage({ auth: auth === undefined ? PEGGY_S : auth, seed }); }

/* ======================================================================== E */

test('E · eligibility is explicit invitation metadata: ELIGIBLE, NONE, or unresolved — never inferred', () => {
  assert.equal(page({ ...PEGGY_S, sangkhathan: 'ELIGIBLE' }).SIYL_TEMPLE.eligibility(), 'ELIGIBLE');
  assert.equal(page({ ...PEGGY_S, sangkhathan: 'NONE' }).SIYL_TEMPLE.eligibility(), 'NONE');
  assert.equal(page({ ...PEGGY_S, sangkhathan: 'PAIR' }).SIYL_TEMPLE.eligibility(), null, 'the retired couple value is unresolved');
  assert.equal(page({ ...PEGGY_S, sangkhathan: undefined }).SIYL_TEMPLE.eligibility(), null);
  const t = src('assets/temple.js');
  assert.doesNotMatch(t, /length === 2|length == 2/, 'no party-size inference');
  assert.doesNotMatch(t, /pairCan|pairDecision/, 'no couple decision remains');
  assert.match(src('assets/invite.mjs'), /sangkhathan: inv\.sangkhathan === 'ELIGIBLE' \|\| inv\.sangkhathan === 'NONE' \? inv\.sangkhathan : 'UNRESOLVED'/);
  assert.match(src('src/build-invitations.cjs'), /p\.givingEligibility === 'PAIR' \? 'ELIGIBLE' : 'UNRESOLVED'/);
});

test('E · ELIGIBLE: the guest\'s own YES / NO, USD 15 for this guest, available while attending the temple, never restored silently', () => {
  const w = page();
  const T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
  assert.equal(T.canOffer(PEGGY), false, 'not until she attends');
  assert.equal(T.setOffering(PEGGY, 'yes'), false);
  T.setAttendance(PEGGY, 'yes');
  assert.equal(T.canOffer(PEGGY), true);
  assert.ok([...T.openFor(PEGGY)].includes('Sangkhathan'), 'the decision is open');
  assert.equal(T.setOffering(PEGGY, 'yes'), true);
  assert.equal(T.offeringOf(PEGGY), true);
  assert.equal(T.offerings(), 1);
  assert.equal(json(w, 'siyl.temple').by[PEGGY].by, PEGGY, 'signed by the guest');
  const line = B.get().find((x) => x.id === 'sangkhathan');
  assert.equal(line.qty, 1); assert.equal(line.price, 15);
  assert.equal(B.total(), 15, 'USD 15 — this guest only');
  const op = T.operational();
  assert.equal(op.sangkhathanEligibility, 'ELIGIBLE'); assert.equal(op.sangkhathanPair, undefined);
  assert.deepEqual([...op.guests.map((g) => g.sangkhathanState)], ['Selected']);
  assert.equal(op.offeringsUsd, 15);
  T.setOffering(PEGGY, 'no');
  assert.equal(T.offerings(), 0); assert.equal(B.has('sangkhathan'), false);
  assert.deepEqual([...T.operational().guests.map((g) => g.sangkhathanState)], ['Not selected']);
  T.setOffering(PEGGY, 'yes');
  T.setAttendance(PEGGY, 'no');
  assert.equal(T.offeringOf_(PEGGY), null); assert.equal(B.has('sangkhathan'), false, 'not attending: the offering goes');
  assert.equal(T.operational().guests[0].sangkhathanState, 'Not applicable');
  T.setAttendance(PEGGY, 'yes');
  assert.equal(T.offeringOf_(PEGGY), null, 'asked again, from not decided');
  assert.equal(T.operational().guests[0].sangkhathanState, 'Decision required');
});

test('E · NONE and unresolved: nothing is offered, nothing blocks, nothing is priced', () => {
  for (const [auth, elig, state] of [[{ ...PEGGY_S, sangkhathan: 'NONE' }, 'NONE', 'Not eligible'], [{ ...PEGGY_S, sangkhathan: undefined }, 'UNRESOLVED', 'Not available yet']]) {
    const w = page(auth);
    const T = w.SIYL_TEMPLE, B = w.SIYL_BAG;
    T.setAttendance(PEGGY, 'yes');
    assert.equal(T.canOffer(PEGGY), false);
    assert.equal(T.setOffering(PEGGY, 'yes'), false);
    assert.ok(![...T.openFor(PEGGY)].includes('Sangkhathan'), 'the Sangkhathan never blocks a journey it is not offered to');
    assert.equal(B.has('sangkhathan'), false);
    const op = T.operational();
    assert.equal(op.sangkhathanEligibility, elig);
    assert.deepEqual([...op.guests.map((g) => g.sangkhathanState)], [state]);
    assert.equal(op.offeringsUsd, 0);
  }
  const wd = src('wedding.html');
  assert.match(wd, /The Sangkhathan is not part of your invitation, so there is nothing to arrange\./, 'TO-02263');
  assert.match(wd, /Guest Relations will let you know whether a Sangkhathan is part of your invitation\./, 'TO-02264');
  assert.doesNotMatch(wd, /metadata|configuration incomplete|givingEligibility undefined/i, 'no technical wording on the surface');
  assert.match(wd, /data-off="yes">Yes, please prepare one for me/);
  assert.match(wd, /data-off="no">No, thank you/);
  assert.doesNotMatch(wd, /Total for your party|We would like to take part/);
});

test('E · the production bundle ships no inferred eligibility: every invitation is explicit or unresolved', () => {
  const list = JSON.parse(src('src/guestlist.private.json'));
  const explicit = list.filter((i) => i.givingEligibility === 'PAIR' || i.givingEligibility === 'NONE');
  const bad = list.filter((i) => i.givingEligibility && !['PAIR', 'NONE'].includes(i.givingEligibility));
  assert.equal(bad.length, 0, 'only PAIR or NONE may be written');
  assert.ok(explicit.length <= list.length);
  /* Owner decision 13 Sep 2026: the offering is available, voluntarily, to every
   * ACTIVE invited party — PAIR on each of them, no whitelist, no NONE, none unset */
  const active = list.filter((i) => (i.status || 'ACTIVE') === 'ACTIVE');
  assert.ok(active.length > 0);
  assert.ok(active.every((i) => i.givingEligibility === 'PAIR'), 'every active invitation is PAIR: ' + active.filter((i) => i.givingEligibility !== 'PAIR').map((i) => i.invitationId).join(','));
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
/* the deployed auth index, as the Worker reads it through ASSETS */
async function assets() {
  const entries = {};
  entries[await authIdOf(PEGGY_S.bearer)] = { i: 'INV-g-peggy', g: 'g-peggy', p: 'INV-DEMO-002' };
  entries[await authIdOf(STEFFIE_S.bearer)] = { i: 'INV-g-steffie', g: 'g-steffie', p: 'INV-DEMO-002' };
  const body = JSON.stringify({ v: 2, entries });
  return { fetch: (r) => new Response(new URL(r.url).pathname === '/register/auth-index.json' ? body : 'asset', { status: 200 }) };
}

test('F · status: none → received (after a stored registration) → confirmed (only by Guest Relations)', async () => {
  const w = await worker();
  const env = { REG_KV: kv(), GR_TOKEN: 'secret-token-of-guest-relations', ASSETS: await assets() };
  let r = await (await w.fetch(req('/api/status?invitation=INV-002'), env)).json();
  assert.deepEqual([r.received, r.confirmed], [false, false]);
  /* a registration lands (the register route stores it; the mail call fails harmlessly here) */
  globalThis.fetch = async () => new Response('', { status: 500 });
  const body = JSON.stringify({ invitationId: 'INV-002', text: 'SEE YOU IN LAOS — JOURNEY SELECTION', registration: complete({ guestId: 'g-peggy', registration_submitted_at: '2026-09-11T10:00:00.000Z' }) });
  assert.equal((await w.fetch(req('/api/register', { method: 'POST', body }), env)).status, 401, 'no bearer, no send');
  assert.equal((await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': STEFFIE_S.bearer }, body }), env)).status, 401, 'another guest cannot send this journey');
  assert.equal((await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': PEGGY_S.bearer }, body }), env)).status, 401, 'the invitation must be the guest\'s own');
  const own = JSON.stringify({ invitationId: 'INV-g-peggy', text: 'SEE YOU IN LAOS — JOURNEY SELECTION', registration: complete({ guestId: 'g-peggy', registration_submitted_at: '2026-09-11T10:00:00.000Z' }) });
  assert.equal((await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': STEFFIE_S.bearer }, body: own }), env)).status, 401, 'a party member cannot send it either');
  /* EMAIL FIRST (Owner, 16 Sep 2026): a journey without an email address is refused — back to the email field. The rest of
     step 01 is on the server already (Owner, 24 Sep 2026: step 01 is required there too), so the refusal is for the email alone. */
  const put = (fields) => w.fetch(req('/api/contact', { method: 'PUT', headers: { 'x-siyl-auth': PEGGY_S.bearer }, body: JSON.stringify(fields) }), env);
  assert.equal((await put({ phone: '+41 79 000 00 00', ...STEP01 })).status, 200);
  const noMail = await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': PEGGY_S.bearer }, body: own }), env);
  assert.equal(noMail.status, 422, 'no email, no journey');
  assert.equal((await noMail.json()).field, 'email', 'refused for the email');
  /* STEP 01 REQUIRED (Owner, 24 Sep 2026): a valid email and phone are not enough — a required personal field missing on the
     server refuses the journey with the step-01 item named; the optional address2 · region are never asked */
  assert.equal((await put({ email: 'p.sandbox@example.org', nationality: '', address2: '', region: '' })).status, 200);
  const partial = await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': PEGGY_S.bearer }, body: own }), env);
  assert.equal(partial.status, 422, 'a required personal field missing, no journey');
  const pj = await partial.json();
  assert.equal(pj.error, 'incomplete');
  assert.deepEqual(pj.missing.filter((m) => m.step === 'you').map((m) => m.key), ['nationality'], 'the missing step-01 item is named, nothing optional');
  assert.equal((await put({ nationality: STEP01.nationality })).status, 200);
  const withMail = JSON.stringify({ invitationId: 'INV-g-peggy', text: 'SEE YOU IN LAOS — JOURNEY SELECTION', registration: complete({ guestId: 'g-peggy', contact: { email: 'p.sandbox@example.org', phone: '' }, registration_submitted_at: '2026-09-11T10:00:00.000Z' }) });
  r = await (await w.fetch(req('/api/register', { method: 'POST', headers: { 'x-siyl-auth': PEGGY_S.bearer }, body: withMail }), env)).json();
  assert.equal(r.ok, true);
  assert.equal(r.status, 'UNDER_REVIEW', 'sending never confirms');
  r = await (await w.fetch(req('/api/status?invitation=INV-g-peggy'), env)).json();
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
  /* a confirmation lapses with a change (OQ-27 · PRQ-04-04): 'confirmed' only while nothing is unsent */
  assert.match(c, /if \(status\.confirmed && !unsent\(\)\) return 'confirmed';/); assert.match(c, /lapsed: function \(\) \{ return !!\(status && \(\(status\.confirmed && unsent\(\)\) \|\| status\.lapsed\)\); \}/);
  assert.match(c, /noteReceived/);
  assert.doesNotMatch(c, /confirmed: true/, 'the client never writes the confirmed state');
  const rv = src('review.html');
  assert.match(rv, /Thank you — we have your trip/); assert.match(rv, /Your trip is confirmed/);
  assert.match(rv, /Your confirmed trip/); assert.match(rv, /Your wedding day/, 'TO-01792');
  assert.doesNotMatch(rv, /Party journey confirmation|one decision for your party|For your party/);
  assert.doesNotMatch(rv, /BOOKING CONFIRMED|RESERVATION CONFIRMED|PAYMENT COMPLETE|ORDER CONFIRMED|boarding|barcode|<svg[^>]*qr/i);
  /* WINDOW 007 (OQ-27 · PRQ-04-04 / 04-06): the confirmation stands only while nothing changed since, so the confirmed card IS the
   * trip as it stands — shown only in the confirmed state, and never when the latest version was sent from another device */
  assert.match(rv, /\}else if\(w\.key==='confirmed'\)\{/); assert.match(rv, /if\(!elsewhere\)h\+=confirmedTrip\(\);/);
  assert.match(rv, /You changed your trip after Guest Relations confirmed it\. Send the update, and Guest Relations will confirm it with you again\./, 'a change lapses the confirmation');
  /* a second device is named only when another device really sent the latest version: the version this device sent differs from
   * the stored one, or nothing was sent from here */
  assert.match(rv, /elsewhere=!!\(d&&d\.sentElsewhere&&d\.sentElsewhere\(\)\)/);
  const dj = src('assets/draft.js');
  assert.match(dj, /var mine = deviceSent\(\); if \(!mine \|\| mine\.invitationId !== a\.invitationId\) return true;\s*return Number\(mine\.version \|\| 0\) !== Number\(s\.version \|\| 0\);/, 'another device only on another version');
  assert.match(rv, /Your confirmed trip was sent from another device, so it is not shown here\./);
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
test('historical firewall: /register/ lands in the accepted product, the bundle stays reachable', async () => {
  const w = await worker();
  const seen = [];
  const env = { REG_KV: kv(), GR_TOKEN: 'secret-token-of-guest-relations', ASSETS: { fetch: (r) => { seen.push(new URL(r.url).pathname); return new Response('asset'); } } };
  for (const p of ['/register/?invite=abc', '/register', '/register/index.html', '/register/app.mjs', '/register/data.mjs']) {
    const r = await w.fetch(new Request('https://x' + p), env);
    assert.equal(r.status, 302, p); assert.equal(new URL(r.headers.get('location')).pathname, '/invitation.html', p);
  }
  for (const p of ['/register/crypto.mjs', '/register/invitations.enc.json', '/invitation.html']) {
    const r = await w.fetch(new Request('https://x' + p), env);
    assert.equal(r.status, 200, p);
  }
  assert.deepEqual(seen, ['/register/crypto.mjs', '/register/invitations.enc.json', '/invitation.html']);
  const ai = fs.readFileSync(new URL('../.assetsignore', import.meta.url), 'utf8');
  for (const f of ['register/index.html', 'register/app.mjs', 'register/data.mjs', 'register/logic.mjs']) assert.match(ai, new RegExp('^' + f.replace('.', '\\.') + '$', 'm'));
  assert.doesNotMatch(ai, /^register\/crypto\.mjs$|^register\/invitations\.enc\.json$|^register$/m);
  /* the retired GitHub Pages build config and its redirect stub never return (one runtime, 18 Sep 2026) */
  for (const f of ['_config.yml', 'register-landing.html', 'CNAME', '.nojekyll', '.github/workflows']) assert.ok(!fs.existsSync(new URL('../' + f, import.meta.url)), f + ' is a retired Pages artifact');
});

test('F · every preparation step reads the journey status, so the shell says Received / Confirmed everywhere', () => {
  for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) {
    const h = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.ok(h.indexOf('assets/confirm.js') > -1 && h.indexOf('assets/confirm.js') < h.indexOf('assets/prep-shell.js'), f + ' loads confirm.js before the shell');
  }
  const shell = fs.readFileSync(new URL('../assets/prep-shell.js', import.meta.url), 'utf8');
  assert.match(shell, /SIYL_CONFIRM && party\(\)\) SIYL_CONFIRM\.load\(\)/, 'the shell reads the status once the party is known');
});

/* `as` is the identity the Worker would have verified from the bearer */
const call = (l, op, body, opts = {}) => l.fetch(new Request('https://x/api/seating/' + op + (opts.q || ''), {
  method: body ? 'POST' : 'GET', headers: { ...(opts.gr ? { 'x-gr-verified': 'yes' } : {}), ...(opts.as ? { 'x-siyl-identity': JSON.stringify(opts.as) } : {}) }, body: body ? JSON.stringify(body) : undefined,
})).then(async (r) => ({ status: r.status, ...(await r.json()) }));

test('G · the geometry contract enforces the Owner geometry and refuses the retired truth', () => {
  const ok = validateGeometry(SEAT_FIXTURE);
  assert.equal(ok.ok, true, ok.errors.join(' · '));
  const c = seatsOf(ok.config, 'ceremony');
  assert.equal(c.length, 50, 'ceremony capacity 50');
  assert.equal(c.filter((s) => s.side === 'L').length, 20, 'left 20');
  assert.equal(c.filter((s) => s.side === 'R').length, 30, 'right 30');
  assert.equal(new Set(c.filter((s) => s.side === 'L').map((s) => s.row)).size, 10, '10 rows left');
  assert.equal(new Set(c.filter((s) => s.side === 'R').map((s) => s.row)).size, 10, '10 rows right');
  for (let r = 1; r <= 10; r++) {
    assert.equal(c.filter((s) => s.side === 'L' && s.row === r).length, 2, 'left row ' + r + ' has 2 chairs');
    assert.equal(c.filter((s) => s.side === 'R' && s.row === r).length, 3, 'right row ' + r + ' has 3 chairs');
  }
  assert.equal(new Set(c.map((s) => s.seatId)).size, 50, 'unique ids');
  assert.ok(c.every((s) => RULES.ceremony.id.test(s.seatId)), 'C-L-[ROW]-[SEAT] / C-R-[ROW]-[SEAT], rows 01–10');
  const d = seatsOf(ok.config, 'dinner');
  /* Owner override 25 Sep 2026 (superseding the 48 of OQ-03): fifty bookable dinner chairs — A1–A12, A14–A26 · B1–B12, B14–B26,
   * never a 13, nothing renumbered, nothing fixed for anyone; the couple hold two of the fifty like every other guest. An upload
   * of the earlier geometry still validates: the plan is the code's fifty */
  assert.equal(d.length, 50, 'guest inventory 50');
  assert.equal(d.filter((s) => s.side === 'T').length, 25, 'side A 25');
  assert.equal(d.filter((s) => s.side === 'B').length, 25, 'side B 25');
  assert.ok(d.some((s) => s.seatId === 'D-T-26') && d.some((s) => s.seatId === 'D-B-26'), 'A26 and B26 are on the plan');
  assert.equal(new Set(d.map((s) => s.seatId)).size, 50, 'no duplicate seat id');
  assert.ok(!d.some((s) => s.seatId === 'D-T-13' || s.seatId === 'D-B-13'), 'no A13, no B13');
  assert.ok(d.some((s) => s.seatId === 'D-B-12') && d.some((s) => s.seatId === 'D-T-14'), 'nothing renumbered: B12 and A14 keep their ids');
  assert.equal(ok.config.dinner.fixed, undefined, 'no fixed dinner position for anyone');
  /* Owner 13 Sep 2026 (§14): the ceremony carries BRIDE and GROOM at the front
   * centre — positions, not chairs: no seat id, never inventory, never selectable */
  assert.deepEqual(ok.config.ceremony.fixed, ['BRIDE', 'GROOM'], 'the ceremony front-centre positions');
  assert.equal(c.length, 50, 'the two positions are not counted as guest chairs');
  assert.equal(ok.config.dinner.totalPeople, 50, 'represented total = 50 people');
  assert.ok(d.every((s) => RULES.dinner.id.test(s.seatId)), 'D-T-01…26 / D-B-01…26');
  assert.equal(CAPACITY.ceremony.guestSeats, 50); assert.equal(CAPACITY.dinner.guestSeats, 50); assert.equal(CAPACITY.dinner.totalPeople, 50);
  assert.ok(!('fixed' in CAPACITY.dinner), 'the capacity contract knows no fixed chair');
  /* FAMILY ids are optional configuration — a plan without any is valid */
  const noFam = JSON.parse(JSON.stringify(SEAT_FIXTURE));
  noFam.ceremony.rows.forEach((r) => r.seats.forEach((s) => { s.family = false; }));
  noFam.dinner.sides.T.forEach((s) => { s.family = false; }); noFam.dinner.sides.B.forEach((s) => { s.family = false; });
  assert.equal(validateGeometry(noFam).ok, true, 'family placement is never required');
  /* the retired geometries are rejected */
  const two = (n) => String(n).padStart(2, '0');
  const old2020 = { ceremony: { rows: [...['L', 'R'].flatMap((side) => Array.from({ length: 5 }, (_, r) => ({ side, row: r + 1, seats: Array.from({ length: 4 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r + 1) + '-' + two(i + 1) })) })))] } };
  assert.equal(validateGeometry(old2020).ok, false, 'a symmetrical 20/20 ceremony is rejected');
  assert.match(validateGeometry(old2020).errors.join(' '), /left row 1 must hold 2 chairs|exceeds the chairs of its row|left must have 10 rows/);
  const forty = JSON.parse(JSON.stringify(SEAT_FIXTURE)); forty.ceremony.rows = forty.ceremony.rows.filter((r) => !(r.side === 'R' && r.row > 7)).map((r) => (r.side === 'R' ? { ...r, seats: r.seats.slice(0, 3) } : r));
  assert.equal(validateGeometry(forty).ok, false, 'a 40-seat ceremony is rejected');
  const oldDinner = { dinner: { sides: { L: Array.from({ length: 20 }, (_, i) => ({ seatId: 'D-L-' + (i + 1) })), R: Array.from({ length: 20 }, (_, i) => ({ seatId: 'D-R-' + (i + 1) })) } } };
  assert.equal(validateGeometry(oldDinner).ok, false, 'the retired 20/20 L/R dinner is rejected');
  assert.match(validateGeometry(oldDinner).errors.join(' '), /retired L\/R model/);
  /* THE PLAN IS THE CODE'S FIFTY (Owner, 25 Sep 2026): an upload that names fewer chairs (the earlier 48, one short) is read as the fifty — nothing is lost, nothing invented beyond them */
  const short = JSON.parse(JSON.stringify(SEAT_FIXTURE)); short.dinner.sides.T.pop();
  const sv = validateGeometry(short); assert.equal(sv.ok, true, sv.errors.join(' ')); assert.equal(sv.config.dinner.sides.T.length, 25);
  const dup = JSON.parse(JSON.stringify(SEAT_FIXTURE)); dup.dinner.sides.B[1].seatId = dup.dinner.sides.B[0].seatId;
  assert.match(validateGeometry(dup).errors.join(' '), /duplicate/);
  const bad = JSON.parse(JSON.stringify(SEAT_FIXTURE)); bad.dinner.sides.T[0].seatId = 'D-T-1';
  assert.match(validateGeometry(bad).errors.join(' '), /D-T-\[01–26\]/);
  const extra = JSON.parse(JSON.stringify(SEAT_FIXTURE)); extra.dinner.sides.T.push({ seatId: 'D-T-27' });
  assert.equal(validateGeometry(extra).ok, false, 'no seat beyond 26 — fifty, and only fifty');
  /* dropping the 25s instead of the 13s (a renumbered 1–24 table) is refused: the 13s are gone, nothing is renumbered */
  /* NOTHING IS EVER RENUMBERED: whatever an upload names, the plan is the numbered fifty — 25 and 26 stay 25 and 26, 13 is never there */
  const renum = JSON.parse(JSON.stringify(SEAT_FIXTURE)); renum.dinner.sides.T.pop(); renum.dinner.sides.B.pop();
  const rv = validateGeometry(renum).config.dinner.sides; assert.deepEqual([rv.T.length, rv.B.length], [25, 25]); assert.ok(rv.T.some((x) => x.seatId === 'D-T-25') && rv.T.some((x) => x.seatId === 'D-T-26') && !rv.T.some((x) => x.seatId === 'D-T-13'));
  /* the 25 + 25 plan without the 13s is the plan */
  const no13 = JSON.parse(JSON.stringify(SEAT_FIXTURE)); for (const k of ['T', 'B']) no13.dinner.sides[k] = no13.dinner.sides[k].filter((x) => !/-13$/.test(x.seatId));
  assert.equal(validateGeometry(no13).ok, true, validateGeometry(no13).errors.join(' · ')); assert.equal(seatsOf(validateGeometry(no13).config, 'dinner').length, 50);
});

test('G · production ships no geometry: unconfigured, not open, NOT OPEN YET', async () => {
  const l = ledger();
  const v = await call(l, 'read', null, { q: '?invitation=INV-002' });
  assert.deepEqual([v.open, v.frozen, v.configured.ceremony, v.configured.dinner, v.ceremony, v.dinner], [false, false, false, false, null, null]);
  const s = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: 'C-L-01-01' }, { as: ID_PEGGY });
  assert.equal(s.status, 423);
  assert.equal((await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: 'C-L-01-01' })).status, 401, 'no identity, no hold');
  assert.deepEqual(JSON.parse(JSON.stringify(v.capacity)), { ceremony: { guestSeats: 50, left: 20, right: 30, fixed: 2 }, dinner: { guestSeats: 50, top: 25, bottom: 25, totalPeople: 50 } }, 'the capacity contract is the Owner geometry even before configuration (dinner 50 · Owner 25 Sep 2026)');
  for (const f of ['assets/seating.js', 'src/seating.js', 'wedding-preparation.html', 'src/worker.js']) {
    assert.doesNotMatch(src(f), /seatId:\s*'[CD]-[LRTB]-\d|'C-[LR]-\d+-\d+'|'D-[LRTB]-\d+'/, f + ' carries a floor plan of its own');
    assert.doesNotMatch(src(f), /40 guest|20 \+ 20|34 selectable|perSide: 20/, f + ' still carries the retired 40-seat truth');
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
  let r = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: free[0], name: 'Peggy' }, { as: ID_PEGGY });
  assert.equal(r.ok, true);
  assert.equal(r.mine.ceremony[PEGGY], free[0]);
  /* another guest cannot take Peggy's chair */
  r = await call(l, 'select', { invitationId: 'INV-g-seray', guestId: 'g-seray', event: 'ceremony', seatId: free[0] }, { as: ID_SERAY });
  assert.equal(r.status, 409); assert.equal(r.error, 'taken');
  /* Steffie, same party, cannot take it either — the chair is Peggy's, by name */
  r = await call(l, 'select', { invitationId: 'INV-g-steffie', guestId: STEFFIE, event: 'ceremony', seatId: free[0] }, { as: ID_STEFFIE });
  assert.equal(r.status, 409);
  /* and nobody books a chair in another guest's name: the body must be the identity's */
  r = await call(l, 'select', { invitationId: 'INV-g-steffie', guestId: STEFFIE, event: 'ceremony', seatId: free[5] }, { as: ID_PEGGY });
  assert.equal(r.status, 403);
  r = await call(l, 'release', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony' }, { as: ID_STEFFIE });
  assert.equal(r.status, 403, 'nor releases one');
  /* Peggy changes: the new chair is held, then the old is released */
  r = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: free[1], name: 'Mallory Impostor' }, { as: ID_PEGGY });   /* the body's name is never the seat's name */
  assert.equal(r.ok, true);
  assert.equal(r.mine.ceremony[PEGGY], free[1]);
  const view = await call(l, 'read', null, { q: '?invitation=INV-g-seray' });
  const flat = view.ceremony.rows.flatMap((x) => x.seats);
  assert.equal(flat.find((s) => s.seatId === free[0]).state, 'available', 'the old chair was released');
  assert.equal(flat.find((s) => s.seatId === free[1]).state, 'taken', 'and shown as taken to a plain read, without a name');
  assert.equal(flat.find((s) => s.seatId === free[1]).guestId, undefined);
  assert.equal(flat.find((s) => s.seatId === free[1]).name, undefined);
  /* an authenticated guest sees the first name, and a party member's chair as their party's */
  const named = await call(l, 'read', null, { as: ID_STEFFIE });
  const nf = named.ceremony.rows.flatMap((x) => x.seats).find((s) => s.seatId === free[1]);
  assert.equal(nf.state, 'party'); assert.equal(nf.name, 'Peggy'); assert.equal(named.named, true);
  const other = await call(l, 'read', null, { as: ID_SERAY });
  const of = other.ceremony.rows.flatMap((x) => x.seats).find((s) => s.seatId === free[1]);
  assert.equal(of.state, 'taken'); assert.equal(of.name, 'Peggy');
  /* family chairs are never selectable */
  r = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: fam }, { as: ID_PEGGY });
  assert.equal(r.status, 409);
  /* the two inventories are independent */
  r = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'dinner', seatId: 'D-T-04' }, { as: ID_PEGGY });
  assert.equal(r.ok, true);
  const mine = await call(l, 'mine', null, { q: '?invitation=INV-g-peggy' });
  assert.deepEqual(JSON.parse(JSON.stringify(mine.mine)), { ceremony: { [PEGGY]: free[1] }, dinner: { [PEGGY]: 'D-T-04' } });
  /* there is no Bride/Groom chair id at the dinner — the couple book ordinary chairs; ids outside the fifty do not exist (the 13s neither) */
  for (const id of ['BRIDE', 'GROOM', 'D-BRIDE', 'D-T-27', 'D-B-00', 'D-T-13', 'D-B-13']) {
    const rr = await call(l, 'select', { invitationId: 'INV-g-steffie', guestId: STEFFIE, event: 'dinner', seatId: id }, { as: ID_STEFFIE });
    assert.equal(rr.status, 404, id + ' is not a guest seat');
  }
  /* and the ceremony's BRIDE / GROOM positions can never be selected by anyone */
  for (const id of ['BRIDE', 'GROOM', 'C-BRIDE']) {
    const rr = await call(l, 'select', { invitationId: 'INV-g-steffie', guestId: STEFFIE, event: 'ceremony', seatId: id }, { as: ID_STEFFIE });
    assert.equal(rr.status, 404, id + ' is a position, not a chair');
  }
  const cv = await call(l, 'read', null, { q: '?invitation=INV-g-peggy' });
  assert.deepEqual(cv.ceremony.fixed, ['BRIDE', 'GROOM']); assert.equal(cv.ceremony.rows.flatMap((r) => r.seats).length, 50);
  /* the pool side: RUN A ('T') is the source of truth (Owner, 15 Sep 2026); Guest Relations may record B; null returns to run A */
  assert.equal(cv.dinner.poolSide, 'T');
  await call(l, 'state', { poolSide: 'X' }, { gr: true });
  assert.equal((await call(l, 'read', null, {})).dinner.poolSide, 'T', 'an invalid side is ignored');
  await call(l, 'state', { poolSide: 'B' }, { gr: true });
  assert.equal((await call(l, 'read', null, {})).dinner.poolSide, 'B');
  await call(l, 'state', { poolSide: null }, { gr: true });
  assert.equal((await call(l, 'read', null, {})).dinner.poolSide, 'T', 'null is the default, run A');
  /* REKEY: a hold under the retired party id is relabelled for the guest's own invitation, name and party; nothing else moves */
  await l.storage.put('hold:dinner:D-B-13', { invitationId: 'INV-002', guestId: 'g-old', at: 'x', state: 'held' });
  r = await call(l, 'rekey', { holds: [{ event: 'dinner', seatId: 'D-B-13', fromInvitationId: 'INV-002', guestId: 'g-old', invitationId: 'INV-g-old', partyId: 'INV-002', name: 'Old' }, { event: 'dinner', seatId: 'D-B-14', invitationId: 'x' }] }, { gr: true });
  assert.equal(r.done.length, 1); assert.equal(r.refused[0].error, 'no hold');
  assert.deepEqual((await l.storage.get('hold:dinner:D-B-13')).invitationId, 'INV-g-old');
  assert.equal((await call(l, 'rekey', { holds: [] })).status, 404, 'a client cannot rekey');
  /* frozen: the guest sees, cannot change; Guest Relations still can */
  await call(l, 'state', { frozen: true }, { gr: true });
  r = await call(l, 'select', { invitationId: 'INV-g-peggy', guestId: PEGGY, event: 'ceremony', seatId: free[2] }, { as: ID_PEGGY });
  assert.equal(r.status, 423);
  r = await call(l, 'assign', { invitationId: 'INV-g-steffie', guestId: STEFFIE, event: 'ceremony', seatId: free[3], actor: 'GR' }, { gr: true });
  assert.equal(r.ok, true); assert.equal(r.state, 'allocated');
  const plan = await call(l, 'plan', null, { gr: true });
  assert.equal(plan.events.ceremony.guestSeats, 50);
  assert.equal(plan.events.ceremony.capacity.left, 20); assert.equal(plan.events.ceremony.capacity.right, 30);
  assert.equal(plan.events.ceremony.family, 6);
  assert.equal(plan.events.ceremony.held, 1);
  assert.equal(plan.events.ceremony.allocated, 1);
  assert.equal(plan.events.ceremony.available, 42);
  assert.equal(plan.events.ceremony.seats.find((s) => s.seatId === free[1]).name, 'Peggy', 'the plan carries the first name');
  assert.equal(plan.events.ceremony.seats.find((s) => s.seatId === free[3]).guestId, STEFFIE);
  /* operations output: GUEST SEATS · 50 = TOTAL PEOPLE · 50, no separate fixed positions */
  assert.equal(plan.events.dinner.guestSeats, 50);
  assert.equal(plan.events.dinner.seats.length, 50);
  assert.deepEqual(JSON.parse(JSON.stringify(plan.events.dinner.capacity)), { guestSeats: 50, top: 25, bottom: 25, totalPeople: 50 });
  assert.ok(!plan.events.dinner.seats.some((s) => /BRIDE|GROOM/.test(s.seatId)));
});

test('G · the renderer draws only what it is given: rows facing the ceremony, one long table, states in marks', () => {
  const w = page();
  const S = w.SIYL_SEATS;
  const cfg = validateGeometry(SEAT_FIXTURE).config;
  const view = { ceremony: { rows: cfg.ceremony.rows.map((r) => ({ ...r, seats: r.seats.map((s, i) => ({ ...s, state: s.family ? 'family' : (i === 0 && r.row === 3 && r.side === 'L' ? 'yours' : 'available'), guestId: PEGGY })) })), fixed: ['BRIDE', 'GROOM'] },
                 dinner: { sides: { T: cfg.dinner.sides.T.map((s, i) => ({ ...s, state: s.family ? 'family' : (i === 5 ? 'taken' : 'available') })), B: cfg.dinner.sides.B.map((s) => ({ ...s, state: s.family ? 'family' : 'available' })) }, fixed: ['BRIDE', 'GROOM'], totalPeople: 50 } };
  const c = S.svg('ceremony', view, { guestId: PEGGY, selectable: true });
  assert.equal((c.match(/<g class="seat/g) || []).length, 50, 'visual total 50');
  assert.equal((c.match(/seat-family/g) || []).length, 6);
  assert.equal((c.match(/seat-yours/g) || []).length, 1);
  assert.equal((c.match(/role="button"/g) || []).length, 43, 'the available chairs are selectable; the own chair is changed through CHANGE SEAT, family never');
  /* Window 007: the plan speaks in sentence case with the counts computed from the plan (TO-01935 / TO-01938) */
  assert.match(c, />Ceremony · front</); assert.match(c, />Left block · 20 seats</); assert.match(c, />Right block · 30 seats</); assert.match(c, />Aisle</);
  /* the guest-facing labels: columns A B | aisle | D E F, never C; the words carry the label, never the ledger id */
  assert.match(c, /aria-label="Ceremony seat E4, available"/); assert.match(c, /aria-label="Ceremony seat A3, your seat"/);
  assert.doesNotMatch(c, /aria-label="[^"]*C-[LR]-\d\d/, 'no ledger id in the words');
  assert.equal((c.match(/data-label="C\d+"/g) || []).length, 0, 'no column C');
  /* a pending choice is drawn as SELECTED BY YOU, still a button, and said so */
  const pend = S.svg('ceremony', view, { guestId: PEGGY, selectable: true, pending: 'C-R-04-02' });
  assert.match(pend, /class="seat seat-selected" role="button" tabindex="0" data-seat="C-R-04-02" data-label="E4" aria-label="Ceremony seat E4, selected"/);
  /* not choosing (a held seat, not being changed): nothing is a button, everything is still described */
  const still = S.svg('ceremony', view, { guestId: PEGGY, selectable: true, choosing: false });
  assert.equal((still.match(/role="button"/g) || []).length, 0); assert.match(still, /aria-label="Ceremony seat A3, your seat"/);
  /* the front-centre positions are drawn, named, and are not chairs */
  assert.match(c, /class="fixed" aria-label="The Bride and the Groom, at the front centre"/, 'TO-01933');
  assert.match(c, />BRIDE</); assert.match(c, />GROOM</);
  assert.ok(!/data-seat="(BRIDE|GROOM)"/.test(c), 'never selectable');
  /* ten rows, numbered, the asymmetry kept: the right block is wider than the left */
  for (let r = 1; r <= 10; r++) assert.match(c, new RegExp('>' + r + '</text>'));
  const d = S.svg('dinner', view, { guestId: STEFFIE, selectable: true });
  assert.equal((d.match(/<g class="seat/g) || []).length, 50, 'exactly 50 guest seat boxes (Owner, 25 Sep 2026)');
  assert.doesNotMatch(d, /data-label="[AB]13"|>[AB]13</, 'no A13, no B13 drawn'); assert.match(d, /data-label="B12"/); assert.match(d, /data-label="A14"/); assert.match(d, /data-label="A26"/); assert.match(d, /data-label="B26"/);
  assert.equal((d.match(/seat-taken/g) || []).length, 1);
  assert.doesNotMatch(d, /BRIDE|GROOM|fixed/, 'no fixed position is drawn for anyone');
  /* the Owner's copy (25 Sep 2026): “Side A · 25 seats · poolside” · “Side B · 25 seats · facing the pool” · “One long table · 50 seats” */
  assert.match(d, />Side A · 25 seats · poolside</); assert.match(d, />Side B · 25 seats · facing the pool</); assert.match(d, />One long table · 50 seats</);
  assert.doesNotMatch(d, /48 seats|24 seats|50 GUEST SEATS|50 PLACES|25 PLACES/i);
  const bookable = [...view.dinner.sides.T, ...view.dinner.sides.B].filter((x) => x.state === 'available' && !/-13$/.test(x.seatId)).length;
  assert.equal((d.match(/role="button"/g) || []).length, bookable, 'every available chair of the 50 — and only those — is selectable');
  assert.match(d, /aria-label="Dinner seat A6, unavailable"/); assert.match(d, /aria-label="Dinner seat B25, available"/); assert.match(d, /aria-label="Dinner seat A26, available"/); assert.match(d, /aria-label="Dinner seat B26, available"/);
  /* nothing drawn without configuration */
  assert.equal((S.svg('ceremony', { ceremony: null }, {}).match(/<g class="seat/g) || []).length, 0);
  /* states are said in words, never colour alone */
  assert.match(S.legend(), /Available/); assert.match(S.legend(), /Selected by you/); assert.match(S.legend(), /Your seat/); assert.match(S.legend(), /Taken/);
  /* TO-01925: the seats of the same invitation read “Travelling with you” — “{Name}’s seat” / “Your party” are retired */
  assert.match(S.legend({ partyName: 'Steffie' }), />Travelling with you</); assert.doesNotMatch(S.legend({ partyName: 'Steffie' }), /’s seat|Your party/); assert.doesNotMatch(S.legend(), /Travelling with you/);
  assert.doesNotMatch(S.legend({ frozen: true }), /Available|Selected by you/, 'frozen: nothing is offered');
  /* RESERVED · FAMILY is a state only where the plan carries such a chair: the
   * fixture does, production does not (Owner decision 13 Sep 2026 — no
   * preassigned family-seat mechanism), and the legend never lists a state no
   * chair on the plan can have */
  assert.match(S.legend({ view }), /Reserved for family/, 'the fixture plan marks family chairs, so the legend names the state (TO-01922)');
  assert.doesNotMatch(S.legend(), /Reserved for family/, 'with no plan, or a plan without family chairs, the state is not offered');
  const bare = { ceremony: { rows: view.ceremony.rows.map((r) => ({ ...r, seats: r.seats.map((x) => ({ ...x, state: x.state === 'family' ? 'available' : x.state })) })) }, dinner: view.dinner };
  bare.dinner = { sides: { T: view.dinner.sides.T.map((x) => ({ ...x, state: x.state === 'family' ? 'available' : x.state })), B: view.dinner.sides.B.map((x) => ({ ...x, state: x.state === 'family' ? 'available' : x.state })) }, fixed: view.dinner.fixed, totalPeople: view.dinner.totalPeople };
  assert.doesNotMatch(S.legend({ view: bare }), /Reserved for family/, 'a plan with every chair bookable lists no family state');
  assert.equal(S.hasFamily(bare), false); assert.equal(S.hasFamily(view), true);
  assert.doesNotMatch(src('assets/seating.js'), /#(ff0000|00ff00|e53935|43a047|2196f3)/i, 'no airline colours');
  /* FIRST NAMES (Owner, 14 Sep 2026): an authenticated view carries names, drawn under the chairs; a plain view carries none */
  const namedView = JSON.parse(JSON.stringify(view)); namedView.named = true;
  namedView.dinner.sides.T[5].name = 'Haruthai'; namedView.dinner.sides.T[6].state = 'party'; namedView.dinner.sides.T[6].name = 'Steffie';
  const dn = S.svg('dinner', namedView, { guestId: PEGGY, selectable: true });
  assert.match(dn, /class="seat-name"[^>]*>Haruthai</); assert.match(dn, /aria-label="Dinner seat A6, taken by Haruthai"/);
  assert.match(dn, /aria-label="Dinner seat A7, Steffie, travelling with you"/, 'TO-01927');
  assert.doesNotMatch(d, /seat-name/, 'no names on a plain view');
  /* THE POOL (Owner, 15 Sep 2026): side A is poolside — the water is drawn as a landmark along side A, the other side is named as facing the pool */
  assert.match(dn, />Swimming pool</, 'the pool is drawn'); assert.match(dn, />Side A · 25 seats · poolside</); assert.match(dn, />Side B · 25 seats · facing the pool</);
  assert.match(dn, /with side A of 25 seats along the pool and side B of 25 seats facing it/); assert.match(dn, />Wedding Dinner · poolside</);
  assert.match(dn, /aria-label="The swimming pool, along side A"/); assert.match(dn, /siyl-water/);
  assert.doesNotMatch(dn, /to be confirmed/, 'nothing about the pool is left open');
  assert.doesNotMatch(dn, /#(1e90ff|2196f3|00bfff|0000ff)/i, 'no bright blue water');
  const poolView = JSON.parse(JSON.stringify(view)); poolView.dinner.poolSide = 'B';
  const dp = S.svg('dinner', poolView, { guestId: PEGGY, selectable: true });
  assert.match(dp, />Swimming pool</); assert.match(dp, />Side B · 25 seats · poolside</); assert.doesNotMatch(dp, /Side A · 25 seats · poolside/);
  assert.match(dp, /with side B of 25 seats along the pool and side A of 25 seats facing it/); assert.match(dp, /aria-label="The swimming pool, along side B"/);
});
