/* THE RECOVERY SNAPSHOT (Owner, 25 Sep 2026 · a data-recovery defect): Guest Relations' "New trip received" email is also the
   human-readable copy from which a guest's submitted record can be rebuilt after a reset. It carried no date of birth: the page
   sends the personal details inside the guest record (guestRecord.contact) while the email read them from registration.contact,
   which holds only the email and the mobile number — and the earlier test put the date of birth where the page never does.

   These tests submit through the Worker with the payload the REAL page builds (SIYL_GUEST.operational() in the sandbox), then
   compare field by field: every recovery field of the submitted state must be in the email, attributed to the right person —
   never a code, a bearer or a secret. A field inventory, not an HTML snapshot. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, session, doState } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating } from '../src/seating.js';
import { composeOwnerMail, composeGuestMail } from '../src/mail-templates.js';
import { complete } from './complete.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dob = (iso) => { const [y, m, d] = iso.split('-'); return parseInt(d, 10) + ' ' + MONTHS[parseInt(m, 10) - 1] + ' ' + y + ' (' + iso + ')'; };
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };

/* three synthetic people: a couple (A, B — one invitation party, two people, two records) and a single guest (C) */
const PEOPLE = {
  A: { code: 'recovery-a-g601', inv: 'INV-G601', g: 'G601', p: 'INV-601', c: 'CON601', k: 'COUPL601', fullName: 'Anna Beispiel', preferredName: 'Anna', partyName: 'Anna & Bo',
    personal: { firstName: 'Annabelle', lastName: 'Beispiel-Moor', birthdate: '1984-09-04', nationality: 'German, Thai', email: 'anna.recovery@example.org', phone: '+49 170 6010601', address1: 'Lindenallee 12', address2: 'Hinterhaus', postal: '20259', city: 'Hamburg', region: 'Hamburg', country: 'Germany' } },
  B: { code: 'recovery-b-g602', inv: 'INV-G602', g: 'G602', p: 'INV-601', c: 'CON602', k: 'COUPL601', fullName: 'Bo Beispiel', preferredName: 'Bo', partyName: 'Anna & Bo',
    personal: { firstName: 'Bo', lastName: 'Beispiel', birthdate: '1979-12-01', nationality: 'Swedish', email: 'bo.recovery@example.org', phone: '+46 70 6020602', address1: 'Storgatan 3', address2: '', postal: '11455', city: 'Stockholm', region: '', country: 'Sweden' } },
  C: { code: 'recovery-c-g603', inv: 'INV-G603', g: 'G603', p: 'INV-603', c: 'CON603', k: 'SIGL', fullName: 'Chai Somsri', preferredName: 'Chai', partyName: 'Chai',
    personal: { firstName: 'Chai', lastName: 'Somsri', birthdate: '1992-02-29', nationality: 'Thai', email: 'chai.recovery@example.org', phone: '+66 81 6030603', address1: '99/1 Sukhumvit Soi 11', address2: 'Unit 4B', postal: '10110', city: 'Bangkok', region: 'Khlong Toei', country: 'Thailand' } },
};
const ALL_BEARERS = [];
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const entries = {};
  for (const x of Object.values(PEOPLE)) { x.b = await bearerOf(x.code); ALL_BEARERS.push(x.b, x.code); entries[await authIdOf(x.b)] = { i: x.inv, g: x.g, p: x.p, c: x.c, k: x.k }; }
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) },
    REG_KV: kv(), GR_TOKEN: 'secret-token-of-guest-relations', MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const h = { w, env };
  h.call = (x, path, body, method) => w.fetch(req(path, { 'x-siyl-auth': x.b }, body, method), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  return h;
}
/* the person's details as step 01 stores them on the Worker */
async function storePersonal(h, x) {
  const epoch = (await h.call(x, '/api/contact')).d.resetAt || null;
  const r = await h.call(x, '/api/contact', { invitationId: x.inv, seenReset: epoch, ...x.personal }, 'PUT');
  assert.equal(r.status, 200, x.g + ' personal details stored');
}
/* the payload the real page builds (assets/guest.js · operational), for this person and this scope */
function pagePayload(x, scope, extra = {}) {
  const w = page({ auth: session({ guestId: x.g, partyId: x.p, partyName: x.partyName, fullName: x.fullName, preferredName: x.preferredName,
    members: x.p === 'INV-601' ? [{ guestId: 'G601', preferredName: 'Anna' }, { guestId: 'G602', preferredName: 'Bo' }] : [{ guestId: x.g, preferredName: x.preferredName }] }) });
  w.localStorage.setItem('siyl.guest', JSON.stringify({ contact: { ...x.personal } }));
  w.SIYL_GUEST.setScope(scope);
  w.SIYL_GUEST.setAllergy('yes', 'Peanuts and shellfish');   /* About You, answered on the page */
  const gr = JSON.parse(JSON.stringify(w.SIYL_GUEST.operational()));
  return complete({ channel: 'journey-shop', lang: extra.lang || 'en', guestId: x.g, partyId: x.p, selections: extra.selections || [], totalUsd: (extra.selections || []).reduce((t, l) => t + l.price * (l.qty || 1), 0),
    contact: { email: x.personal.email, phone: x.personal.phone }, guestRecord: gr, stages: extra.stages }, { scope });
}
async function send(h, x, reg) {
  const r = await h.call(x, '/api/register', { invitationId: x.inv, registration: reg, text: 'SEE YOU IN LAOS — test' });
  assert.ok(r.status === 200 || r.status === 202, x.g + ' sent: ' + JSON.stringify(r.d).slice(0, 240));
  return JSON.parse(h.env.REG_KV.m.get('reg:' + x.inv).v);
}
/* THE FIELD INVENTORY: every recovery field of one person, as the email must print it */
function inventory(x, rec) {
  const P = x.personal;
  const f = [['Person ID', x.g], ['Contact ID', x.c], ['Couple', x.k], ['Party ID', x.p], ['Invitation', x.inv], ['Guest (invitation)', x.fullName],
    ['First name', P.firstName], ['Last name', P.lastName], ['Date of birth', dob(P.birthdate)], ['Nationality', P.nationality],
    ['Email', P.email], ['Mobile', P.phone], ['Street and house number', P.address1], ['Postcode', P.postal], ['City', P.city], ['Country', P.country],
    ['Reference', rec.submissionId], ['Version', String(rec.version)]];
  if (P.address2) f.push(['Address line 2', P.address2]);
  if (P.region) f.push(['State, province or region', P.region]);
  return f;
}
const has = (text, k, v) => text.includes('· ' + k + ': ' + v);
function assertInventory(mail, x, rec, tag) {
  const snap = mail.text.slice(mail.text.indexOf('RECOVERY SNAPSHOT'));
  assert.ok(snap.length > 40, tag + ': the snapshot section exists');
  for (const [k, v] of inventory(x, rec)) assert.ok(has(snap, k, v), tag + ': ' + k + ' = ' + v + '\n' + snap);
  /* the date of birth is in the email twice — the head of the email and the snapshot — and it is THIS person's */
  assert.match(mail.text, new RegExp('Date of birth: ' + dob(x.personal.birthdate).replace(/[()]/g, '\\$&')));
  for (const o of Object.values(PEOPLE)) if (o !== x) assert.ok(!mail.text.includes(o.personal.birthdate) && !mail.html.includes(o.personal.birthdate), tag + ': no other person\'s date of birth (' + o.g + ')');
  /* never a code, a bearer or a secret */
  for (const s of ALL_BEARERS) assert.ok(!mail.text.includes(s) && !mail.html.includes(s), tag + ': no invitation code or bearer in the email');
  assert.doesNotMatch(mail.text + mail.html, /x-siyl-auth|bearer|secret-token|GR_TOKEN|password/i, tag + ': no credential');
}

test('A · A SINGLE GUEST, first submission: every recovery field of the payload the page builds is in Guest Relations\' email — the date of birth unambiguous, the stage answers, the selections with their codes, About You', async () => {
  const h = await harness(); const C = PEOPLE.C;
  await storePersonal(h, C);
  const sel = [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1, cat: 'Transportation' }];
  const reg = pagePayload(C, { bangkok: true, vientianePreWedding: true, vientianeWedding: false, china: false, none: false }, { selections: sel, lang: 'th', stages: { 'bkk-stay': 'declined', train: 'selected', prewed: 'declined', kempinski: 'declined' } });
  const rec = await send(h, C, reg);
  const om = composeOwnerMail(rec);
  assertInventory(om, C, rec, 'single');
  const snap = om.text.slice(om.text.indexOf('RECOVERY SNAPSHOT'));
  for (const [k, v] of [['Language', 'Thai'], ['Status', 'Initial submission'], ['Not joining this trip', 'No'], ['Bangkok', 'Yes'], ['Vientiane · Before the Wedding', 'Yes'], ['Vientiane · The Wedding', 'No'], ['China', 'No'],
    ['Special Express No. 25', 'Chosen'], ['Bangkok · Before the Wedding (stay)', 'Not needed (the guest said so)'], ['Vientiane · Pre-Wedding Stay', 'Not needed (the guest said so)'],
    ['Vientiane · Wedding Stay', 'Not part of the trip'], ['Kunming (stay)', 'Not part of the trip']]) assert.ok(has(snap, k, v), 'single: ' + k + ' = ' + v);
  assert.match(snap, /· Special Express No\. 25: code train · quantity 1 · USD 100 each/, 'the selection with its product code and quantity');
  /* About You as submitted (the questionnaire's answers, the allergy, the acknowledgements) */
  for (const re of [/Food allergies: Yes · Peanuts and shellfish/, /· My favourite flavour: Pandan/, /· Favourite film: In the Mood for Love/, /· Your music: Pop/]) assert.match(snap, re, 'About You as submitted: ' + re);
  /* every questionnaire answer the record carries is in the snapshot — even the wedding ones of a guest not at the wedding */
  const prof = rec.registration.guestRecord.guests[0].profile;
  for (const [k, v] of Object.entries(prof)) assert.ok(snap.includes(Array.isArray(v) ? v.join(', ') : v), 'profile answer ' + k + ' = ' + v);
  /* the guest's own email carries none of it */
  const gm = composeGuestMail(rec);
  for (const s of [C.personal.birthdate, '29 February 1992', C.personal.address1, C.c, 'RECOVERY SNAPSHOT']) assert.ok(!gm.text.includes(s) && !gm.html.includes(s), 'the guest email stays the guest\'s: ' + s);
});

test('B · A COUPLE, BOTH JOINING: two people, two records — each email names its own person, its own date of birth and ids, and the partner\'s participation', async () => {
  const h = await harness(); const { A, B } = PEOPLE;
  await storePersonal(h, A); await storePersonal(h, B);
  const scope = { bangkok: true, vientianePreWedding: false, vientianeWedding: false, china: false, none: false };
  /* Bo's own answer is on the Worker (his draft) before Anna sends */
  const bd = (await h.call(B, '/api/draft')).d;
  await h.call(B, '/api/draft', { invitationId: B.inv, baseUpdatedAt: bd.draft ? bd.draft.updatedAt : undefined, keys: { 'siyl.guest': JSON.stringify({ scope }), 'siyl.bag': '[]' } }, 'PUT');
  const ra = await send(h, A, pagePayload(A, scope));
  const rb = await send(h, B, pagePayload(B, scope));
  const ma = composeOwnerMail(ra), mb = composeOwnerMail(rb);
  assertInventory(ma, A, ra, 'couple A'); assertInventory(mb, B, rb, 'couple B');
  assert.match(ma.text, /· Party member Bo \(G602\): Joining/, 'Bo\'s own answer (his draft) when Anna sent'); assert.match(mb.text, /· Party member Annabelle \(G601\): Joining/, 'Anna\'s sent answer when Bo sent — her first name as she wrote it');
  assert.match(ma.text, /· Name as the guest wrote it: Annabelle Beispiel-Moor/, 'the name the guest corrected, beside the invitation\'s');
});

test('C · MIXED ATTENDANCE: Anna joining, Bo NOT joining, still one couple — Bo\'s reply is recoverable as his own (his date of birth, "not joining"), Anna\'s email names Bo not joining', async () => {
  const h = await harness(); const { A, B } = PEOPLE;
  await storePersonal(h, A); await storePersonal(h, B);
  const rb = await send(h, B, pagePayload(B, { none: true }));
  const ra = await send(h, A, pagePayload(A, { bangkok: true, vientianePreWedding: false, vientianeWedding: false, china: false, none: false }));
  const ma = composeOwnerMail(ra), mb = composeOwnerMail(rb);
  assertInventory(mb, B, rb, 'reply B'); assertInventory(ma, A, ra, 'mixed A');
  assert.match(mb.text, /· Status: Reply · not joining/); assert.match(mb.text, /· Not joining this trip: Yes/);
  assert.match(ma.text, /· Party member Bo \(G602\): Not joining/, 'the partner who is not coming, by his own answer');
  assert.match(mb.text, /· Party member Annabelle \(G601\): Not answered yet/, 'when Bo sent, Anna had not answered — the email records that moment');
  assert.ok(Array.isArray(rb.registration.guestRecord.party.people), 'the page names each party member by the invitation\'s first name (the fallback when a partner has written nothing yet)');
});

test('D · A RETURNING GUEST SENDS AN UPDATE: the update email is the COMPLETE current state (version 2), never only the change — a changed nationality and a new selection included, the date of birth still there', async () => {
  const h = await harness(); const C = PEOPLE.C;
  await storePersonal(h, C);
  const scope = { bangkok: true, vientianePreWedding: true, vientianeWedding: false, china: false, none: false };
  const r1 = await send(h, C, pagePayload(C, scope));
  assert.equal(r1.version, 1);
  const epoch = (await h.call(C, '/api/contact')).d.resetAt || null;
  C.personal = { ...C.personal, nationality: 'Thai, Lao' };
  assert.equal((await h.call(C, '/api/contact', { invitationId: C.inv, seenReset: epoch, nationality: 'Thai, Lao' }, 'PUT')).status, 200);
  const sel = [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1, cat: 'Transportation' }];
  const r2 = await send(h, C, pagePayload(C, scope, { selections: sel, stages: { train: 'selected' } }));
  assert.equal(r2.version, 2); assert.equal(r2.kind, 'update');
  const om = composeOwnerMail(r2);
  assertInventory(om, C, r2, 'update');
  assert.match(om.text, /^SEE YOU IN LAOS — GUEST RELATIONS\n\nTrip updated/);
  assert.match(om.text, /· Status: Updated trip/); assert.match(om.text, /· Nationality: Thai, Lao/); assert.match(om.text, /code train · quantity 1/);
  assert.match(om.text, /· First sent: /);
});

test('E · THE SNAPSHOT NEVER LOSES THE DATE OF BIRTH AGAIN: a record whose page copy lacks it takes the Worker\'s stored value; a record with no value anywhere says so ("—"), never omits the line', async () => {
  const h = await harness(); const C = PEOPLE.C;
  await storePersonal(h, C);
  const reg = pagePayload(C, { bangkok: true, vientianePreWedding: false, vientianeWedding: false, china: false, none: false });
  delete reg.guestRecord.contact.birthdate;   /* an older page that did not carry it */
  const rec = await send(h, C, reg);
  assert.equal(rec.registration.personal.birthdate, C.personal.birthdate, 'stamped from the stored details');
  assert.match(composeOwnerMail(rec).text, new RegExp('· Date of birth: ' + dob(C.personal.birthdate).replace(/[()]/g, '\\$&')));
  const bare = composeOwnerMail({ submissionId: 'SYL-X', guestId: 'GX', registration: { guestRecord: { guests: [{ guestId: 'GX', source: { fullName: 'X' } }] } } });
  assert.match(bare.text, /Date of birth: —/, 'the line is always there');
});
