/* THE PERSONAL DETAILS AND THE PERMANENT PERSON ID (Owner, 20 Sep 2026 · the guest-list go-live).
   Date of Birth · Nationality (one or several) · Phone Number · Email Address · Private Mailing Address — the signed-in
   person's own, prefilled once from the guest list (the encrypted invitation, opened with the guest's own code), reviewed and
   corrected on the invitation page, stored on the Worker under the guest's own invitation, shown on the profile, carried to
   Guest Relations. CONxxx and COUPLxxx are the register's: stamped from the auth index, never taken from a client body, never a
   field a guest can edit. A couple's two members are two people with two records. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, session, src, plain, PEGGY, STEFFIE } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating } from '../src/seating.js';
import { composeOwnerMail, composeGuestMail } from '../src/mail-templates.js';
import { doState } from './sandbox.mjs';
import { complete } from './complete.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-peggy-g001'), steffie = await bearerOf('demo-steffie-g002');
  const entries = {};
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' };
  entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), GR_TOKEN: 'secret-token-of-guest-relations', MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r), a }; } return actors[n]; } };
  return { w, env, peggy, steffie };
}
const call = (h, path, bearer, body, method) => h.w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), h.env).then(async (r) => ({ status: r.status, d: await r.json() }));

const PROFILE = { birthdate: '1990-05-17', nationality: 'Thai, German', phone: '+49 170 0000000', email: 'peggy.list@example.org', address: { line1: 'Musterstraße 1' } };
const withProfile = (s, profile, ids) => ({ ...s, ...(profile ? { profile } : {}), ...(ids || {}) });

test('THE MODEL · five personal fields of the signed-in person; the sheet\'s record is prefilled once into empty fields only, never over the guest\'s own words; asked for, never a lock on the journey; CON/COUPL are context, not fields', () => {
  const w = page({ auth: withProfile(PEGGY, PROFILE, { contactId: 'CON003', couple: 'COUPL002' }) }); const G = w.SIYL_GUEST;
  assert.deepEqual(plain(G.PERSONAL.map((f) => f.key)), ['firstName', 'lastName', 'birthdate', 'nationality', 'phone', 'email', 'address1', 'address2', 'postal', 'city', 'region', 'country']);
  assert.ok(G.PERSONAL.filter((f) => f.name).every((f) => !f.optional) && G.personalMissing().every((m) => !/Name/.test(m.key)), 'the name fields are never "still needed" — the invitation\'s words stand until corrected');
  assert.deepEqual(plain(G.PERSONAL.filter((f) => !f.optional && !f.name).map((f) => f.label)), ['Date of birth', 'Nationality', 'Mobile number', 'Email address', 'Street and house number', 'Postcode or ZIP code', 'City', 'Country'] /* TO-00307 / TO-00309 / TO-00308 / TO-00238 */);
  assert.equal(G.ADDRESS_WORDS, 'The address where post reliably reaches you. We may use it for wedding letters, invitations and the occasional post about your trip — also once it is over.'); /* TO-00142 */ assert.doesNotMatch(G.ADDRESS_WORDS, /gift|surprise/i, 'the purpose is correspondence — no gift is promised');
  assert.equal(G.me().contactId, 'CON003'); assert.equal(G.me().couple, 'COUPL002');
  assert.ok(!G.PERSONAL.some((f) => /contact|couple|con|guest/i.test(f.key)), 'the person id and the couple id are never editable fields');
  /* the guest wrote her own email first: the list's copy never replaces it */
  G.setContact('email', 'peggy.own@example.org');
  assert.equal(G.prefillFromInvitation(), true);
  assert.equal(G.contact('email'), 'peggy.own@example.org', 'the guest\'s own word stands'); assert.equal(G.contact('phone'), '+49 170 0000000'); assert.equal(G.contact('birthdate'), '1990-05-17'); assert.equal(G.contact('nationality'), 'Thai, German', 'dual nationality stays as written'); assert.equal(G.contact('address1'), 'Musterstraße 1');
  assert.equal(G.prefillFromInvitation(), false, 'once — nothing to fill twice');
  const hist = JSON.parse(w.localStorage.getItem('siyl.guest')).history.filter((h) => h.by === 'guest-list').map((h) => h.field);
  assert.deepEqual(hist.sort(), ['contact.address1', 'contact.birthdate', 'contact.nationality', 'contact.phone'], 'the history says what came from the list');
  /* the words and the completeness — asked for, never blocking Review */
  assert.equal(G.birthdateWords(), '17 May 1990'); assert.equal(G.addressComplete(), false); assert.deepEqual(plain(G.personalMissing().map((m) => m.key)), ['postal', 'city', 'country']);
  ['postal', 'city', 'country'].forEach((k, i) => G.setContact(k, ['10115', 'Berlin', 'Germany'][i]));
  assert.equal(G.addressComplete(), true); assert.equal(G.addressWords(), 'Musterstraße 1, 10115 Berlin, Germany'); assert.deepEqual(plain(G.personalMissing()), []);
  assert.ok(!G.missingFor('you').some((m) => /birthdate|nationality|address|postal|city|country/.test(m.key)), 'the readiness of the journey asks for email and mobile only');
  assert.equal(G.validBirthdate('1990-02-30'), false); assert.equal(G.validBirthdate('2999-01-01'), false); assert.equal(G.validBirthdate('1984-09-04'), true);
  const op = G.operational();
  assert.equal(op.contact.birthdate, '1990-05-17'); assert.equal(op.contact.nationality, 'Thai, German'); assert.equal(op.contact.address.words, 'Musterstraße 1, 10115 Berlin, Germany'); assert.equal(op.contactId, 'CON003'); assert.equal(op.couple, 'COUPL002');
});

test('A COUPLE IS TWO PEOPLE · Steffie\'s session never carries Peggy\'s list data and never writes her record: the prefill is bound to the signed-in guest, the browser record is per invitation', () => {
  const w = page({ auth: withProfile(STEFFIE, { birthdate: '1988-01-02', nationality: 'German' }, { contactId: 'CON004', couple: 'COUPL002' }) }); const G = w.SIYL_GUEST;
  assert.equal(G.prefillFromInvitation(), true); assert.equal(G.contact('birthdate'), '1988-01-02'); assert.equal(G.contact('email'), '');
  /* a session whose profile names another guest (a forged localStorage) fills nothing */
  const w2 = page({ auth: { ...withProfile(PEGGY, PROFILE), guestId: 'g-peggy', profile: PROFILE } }); const G2 = w2.SIYL_GUEST;
  w2.localStorage.setItem('siyl.auth', JSON.stringify({ ...JSON.parse(w2.localStorage.getItem('siyl.auth')), guestId: 'g-someone', invitationId: 'INV-g-someone' }));
  assert.equal(G2.me() && G2.me().guestId, 'g-someone'); assert.equal(G2.prefillFromInvitation(), true, 'the list data belongs to the session that decrypted it');
  const w3 = page({ auth: withProfile(PEGGY, PROFILE) }); w3.localStorage.setItem('siyl.auth', JSON.stringify({ ...JSON.parse(w3.localStorage.getItem('siyl.auth')), profile: undefined }));
  assert.equal(w3.SIYL_GUEST.prefillFromInvitation(), false, 'no list data, nothing filled');
  /* the invitation page and the profile page render the fields for the signed-in person only */
  const inv = src('invitation.html'), prof = src('profile.html');
  assert.match(inv, /id="p-birthdate"/); for (const key of ['nationality', 'address1', 'address2', 'postal', 'city', 'region', 'country']) assert.match(inv, new RegExp("fld\\('" + key + "'"), key);
  assert.match(inv, /type="date"/); assert.match(inv, /Private postal address/); assert.match(inv, /' You are invited together with '\+esc\(withO\)\+', and each of you answers on your own invitation\./); assert.doesNotMatch(inv, /review their own on their own invitation|Private Mailing Address/); /* TO-00230 · TO-00229 · TO-00232 removed */
  assert.match(prof, /data-profile-personal/); assert.match(prof, /row\('Date of birth',bd,'birthdate'\)/); assert.match(prof, /row\('Private postal address',addr,'address'\)/); assert.match(prof, /invitation\.html#personal/);
  assert.ok(!/data-c="contactId"|data-c="couple"/.test(inv), 'no input for the person id or the couple id');
});

test('THE WORKER · the personal details are stored with the contact under the guest\'s own invitation, validated, returned to that guest only; the person id and the couple id come from the auth index, never from the body', async () => {
  const h = await harness();
  const epoch = (await call(h, '/api/contact', h.peggy)).d.resetAt || null;
  const put = (bearer, body) => call(h, '/api/contact', bearer, { seenReset: epoch, ...body }, 'PUT');
  let r = await put(h.peggy, { invitationId: 'INV-G001', email: 'peggy@example.org', phone: '+49 170 1', birthdate: '1990-05-17', nationality: 'Thai, German', address1: 'Musterstraße 1', address2: '', postal: '10115', city: 'Berlin', region: 'Berlin', country: 'Germany', contactId: 'CON999', couple: 'COUPL999', guestId: 'G002' });
  assert.equal(r.status, 200); assert.equal(r.d.contact.birthdate, '1990-05-17'); assert.equal(r.d.contact.nationality, 'Thai, German'); assert.equal(r.d.contact.country, 'Germany');
  assert.equal(r.d.contact.contactId, undefined, 'the body\'s ids are ignored'); assert.equal(r.d.contact.guestId, undefined);
  const stored = JSON.parse(h.env.REG_KV.m.get('contact:INV-G001').v); assert.equal(stored.guestId, 'G001'); assert.equal(stored.contactId, undefined);
  r = await put(h.peggy, { invitationId: 'INV-G001', birthdate: '1990-02-30' }); assert.equal(r.status, 422); assert.equal(r.d.field, 'birthdate');
  r = await put(h.peggy, { invitationId: 'INV-G001', email: 'not-an-email' }); assert.equal(r.status, 422); assert.equal(r.d.field, 'email');
  r = await put(h.peggy, { invitationId: 'INV-G001', city: 'Hamburg' }); assert.equal(r.status, 200); assert.equal(r.d.contact.city, 'Hamburg'); assert.equal(r.d.contact.birthdate, '1990-05-17', 'a partial write keeps the rest');
  /* the partner reads her own, empty record — never Peggy's */
  const s = await call(h, '/api/contact', h.steffie); assert.equal(s.status, 200); assert.equal(s.d.invitationId, 'INV-G002'); assert.equal(s.d.contact, null);
  r = await put(h.steffie, { invitationId: 'INV-G001', birthdate: '1988-01-02' }); assert.equal(r.status, 403, 'a write for another invitation is refused');
  const p2 = await call(h, '/api/contact', h.peggy); assert.equal(p2.d.contact.birthdate, '1990-05-17'); assert.equal(p2.d.contact.city, 'Hamburg');
  /* the record: CON/COUPL stamped from the index, the body's forgery overwritten; the Guest Relations email carries the details, the guest's email does not */
  const reg = { channel: 'journey-shop', guestId: 'G001', totalUsd: 0, contactId: 'CON999', couple: 'COUPL999', contact: { email: 'peggy@example.org', phone: '+49 170 1', birthdate: '1990-05-17', nationality: 'Thai, German', address: { words: 'Musterstraße 1, 10115 Hamburg, Germany' } }, selections: [], guestRecord: { guests: [{ guestId: 'G001', name: 'Peggy', source: { fullName: 'Peggy Berger', preferredName: 'Peggy' }, profile: {} }] } };
  const sent = await call(h, '/api/register', h.peggy, { invitationId: 'INV-G001', registration: complete(reg), text: 'SEE YOU IN LAOS — test' });
  assert.ok(sent.status === 200 || sent.status === 202, JSON.stringify(sent.d).slice(0, 200));   /* 202: stored, no mail provider in the harness */
  const rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G001').v);
  assert.equal(rec.registration.contactId, 'CON003', 'the index\'s person id'); assert.equal(rec.registration.couple, 'COUPL002');
  const om = composeOwnerMail(rec), gm = composeGuestMail(rec);
  assert.match(om.text, /Person: CON003 · COUPL002/); assert.match(om.text, /Date of birth: 17 May 1990 \(1990-05-17\)/, 'unambiguous: the month in words, the stored value beside it'); assert.match(om.text, /Nationality: Thai, German/); assert.match(om.text, /Mailing address: Musterstraße 1, 10115 Hamburg, Berlin, Germany/, 'the address as the server stores it for this person (the recovery snapshot, 25 Sep 2026)');
  assert.ok(!/1990-05-17|Musterstraße|CON003|COUPL002/.test(gm.text + gm.html), 'the guest\'s own email carries no personal details and no register id');
  const gj = await h.w.fetch(req('/api/gr/journeys', { 'x-gr-token': 'secret-token-of-guest-relations' }, {}, 'POST'), h.env).then((x) => x.json());
  const mine = gj.journeys.find((j) => j.invitationId === 'INV-G001'); assert.equal(mine.contactId, 'CON003'); assert.equal(mine.couple, 'COUPL002'); assert.equal(mine.contact.nationality, 'Thai, German');
});

test('THE REGISTER MODEL · the builder carries the person id, the couple id and the sheet profile only inside the encrypted record; the served index has ids, never a name, a code or a profile', () => {
  const b = readFileSync('src/build-invitations.cjs', 'utf8'), a = readFileSync('src/auth.js', 'utf8'), idx = JSON.parse(readFileSync('register/auth-index.json', 'utf8'));
  assert.match(b, /contactId: g\.contactId/); assert.match(b, /profile: g\.profile/); assert.match(b, /c: g\.contactId/); assert.match(b, /k: g\.couple/);
  assert.doesNotMatch(a, /contactId|couple/, 'the frozen auth authority is untouched — the Worker reads the person id beside it');
  assert.match(readFileSync('src/worker.js', 'utf8'), /async function personOf\(env, origin, who\)/);
  const entries = Object.values(idx.entries);
  assert.ok(entries.length >= 100, 'the deployed index carries every active guest');
  assert.ok(entries.every((e) => /^CON\d{3}$/.test(e.c) && /^(COUPL\d{3}|SIGL)$/.test(e.k)), 'every entry names a permanent person id and a couple state');
  assert.ok(entries.every((e) => Object.keys(e).every((k) => ['i', 'g', 'p', 'h', 'c', 'k', 'r'].includes(k))), 'nothing else in the index (r = the couple\'s role, 21 Sep 2026)'); assert.equal(entries.filter((e) => e.r).length, 2, 'two roles: the Bride and the Groom'); assert.ok(entries.filter((e) => e.r).every((e) => e.h === 1), 'a role only on a host');
  assert.equal(new Set(entries.map((e) => e.c)).size, entries.length, 'one person id per code'); assert.equal(new Set(entries.map((e) => e.g)).size, entries.length, 'one guest id per code');
  const hosts = entries.filter((e) => e.h === 1).map((e) => e.g).sort(); assert.deepEqual(hosts, ['G048', 'G049']);
  const couples = {}; for (const e of entries) if (e.k !== 'SIGL') (couples[e.k] = couples[e.k] || []).push(e.g);
  assert.ok(Object.values(couples).every((m) => m.length <= 2), 'a couple is at most two people');
  assert.ok(Object.entries(couples).every(([k, m]) => new Set(entries.filter((e) => m.includes(e.g)).map((e) => e.p)).size === 1), 'a couple shares one party');
});
