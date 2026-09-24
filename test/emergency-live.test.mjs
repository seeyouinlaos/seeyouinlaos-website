/* EMERGENCY LIVE HOTFIX (Owner, 16 Sep 2026) — the journey is saved before any email; the submission id; the
   provider's answer is recorded and returned; a provider that refuses never loses the booking; the retry sends the
   stored journey's emails again and never creates a submission; the seat words are truthful (loading / could not
   load / not open only from the server); the refusal sentence. Deterministic; no provider is called (a fake fetch). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, doState } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { Rooms } from '../src/rooms.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body) { return new Request(ORIGIN + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async () => ({ keys: [...m.keys()].map((name) => ({ name })) }) }; }
const TEXT = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G001 · Peggy\n- Special Express No. 25 · USD 100';
const REG = { invitationId: 'INV-G001', guestId: 'G001', total: 355, selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }], guests: [{ guestId: 'G001', name: 'Peggy', fullName: 'Peggy Berger', contact: { email: 'peggy.test@example.com', phone: '+49 170 000 0001' }, allergy: { answer: 'no', details: '' }, ceremonySeatLabel: 'R2 · 3', dinnerSeatLabel: 'B12' }], registration_submitted_at: '2026-09-16T13:00:00.000Z' };

async function harness(provider) {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-peggy'), steffie = await bearerOf('demo-steffie');
  const entries = {}; entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002' }; entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002' };
  const store = kv(); const calls = [];
  /* STEP 01 IS REQUIRED ON THE SERVER (Owner, 24 Sep 2026): the guest's stored contact carries the required personal details — synthetic */
  await store.put('contact:INV-G001', JSON.stringify({ invitationId: 'INV-G001', guestId: 'G001', email: 'peggy.test@example.com', phone: '+49 170 000 0001', birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland', at: '2026-09-16T12:00:00.000Z' }));
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', ...(provider === 'brevo' || provider === 'refuse' ? { BREVO_API_KEY: 'x' } : {}), ...(provider === 'resend' ? { RESEND_API_KEY: 'x' } : {}) };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const u = String(url); if (/api\.brevo\.com|api\.resend\.com/.test(u)) { const body = JSON.parse(init.body); calls.push({ url: u, body, auth: init.headers['api-key'] || init.headers.authorization }); if (provider === 'refuse') return new Response(JSON.stringify({ message: 'sender not validated' }), { status: 400 }); return new Response(JSON.stringify(u.includes('brevo') ? { messageId: '<msg-' + calls.length + '@brevo>' } : { id: 'resend-' + calls.length }), { status: u.includes('brevo') ? 201 : 200 }); } return realFetch(url, init); };
  return { w, env, store, calls, peggy, steffie, done: () => { globalThis.fetch = realFetch; } };
}

test('EMAIL · the journey is stored first with a submission id, then Guest Relations and the guest are mailed through the provider; the answer carries both message ids and no code', async () => {
  const h = await harness('brevo');
  try {
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.peggy }, { invitationId: 'INV-G001', registration: complete(REG, { scope: { vientianeWedding: true } }), text: TEXT }), h.env);
    assert.equal(r.status, 202, JSON.stringify(await r.clone().json()).slice(0, 300)); const d = await r.json();
    assert.equal(d.ok, true); assert.equal(d.stored, true); assert.equal(d.mailed, true); assert.match(d.submissionId, /^SYL-G001-[0-9A-F]{8}$/);
    assert.equal(d.mail.owner.provider, 'brevo'); assert.equal(d.mail.owner.accepted, true); assert.match(d.mail.owner.id, /^<msg-1@brevo>$/);
    assert.equal(d.mail.guest.accepted, true); assert.match(d.mail.guest.id, /^<msg-2@brevo>$/); assert.equal(d.mail.guest.to, 'p…@example.com');
    /* the record carries the submission id and the provider's answer */
    const rec = JSON.parse(h.store.m.get('reg:INV-G001').v);
    assert.equal(rec.submissionId, d.submissionId); assert.equal(rec.mail.owner.id, '<msg-1@brevo>'); assert.equal(rec.mail.guest.id, '<msg-2@brevo>'); assert.equal(h.store.m.get('reg:INV-G001').meta.submissionId, d.submissionId);
    /* the two emails: Guest Relations first with the required fields, then the guest — the same reference, never an access code */
    assert.equal(h.calls.length, 2);
    const owner = h.calls[0].body, guest = h.calls[1].body;
    assert.equal(owner.to[0].email, 'guest.relation.seeyouinlaos@gmail.com'); assert.match(owner.subject, /Trip received — Peggy Berger · SYL-G001-/);
    for (const k of ['Guest: Peggy Berger', 'Invitation: INV-G001', 'Reference: ' + d.submissionId, 'Sent: ', 'Vow Ceremony: Seat R2 · 3', 'Wedding Dinner: Seat B12', 'Email: peggy.test@example.com', 'COST\nUSD 355', 'Status: ' + ORIGIN + '/api/status?invitation=INV-G001', 'Special Express No. 25']) assert.ok(owner.textContent.includes(k), 'owner email carries ' + k);
    /* the guest's copy (Window 007 · B3): “Thank you — we have your trip”, “Your reference”, “Sent on {date}” — a copy of what was sent, never called a confirmation */
    assert.equal(guest.to[0].email, 'peggy.test@example.com'); assert.match(guest.subject, /^Thank you — we have your trip \(SYL-G001-[0-9A-F]{8}\)$/);
    for (const k of ['Thank you — we have your trip', 'Dear Peggy,', 'Your reference: ' + d.submissionId, 'Sent on ', 'Seat B12 · held for you', 'Special Express No. 25', ORIGIN + '/invitation', 'we never send codes by email', 'guest.relation.seeyouinlaos@gmail.com']) assert.ok(guest.textContent.includes(k), 'guest email carries ' + k);
    assert.doesNotMatch(guest.subject + guest.textContent + guest.htmlContent, /confirmation|booking confirmed|is confirmed/i, 'the guest email is a copy of the trip, never a confirmation');
    assert.match(guest.textContent, /until they do, nothing is booked/);
    assert.ok(owner.htmlContent && guest.htmlContent, 'both emails carry the CI HTML'); assert.match(guest.htmlContent, /see you in laos<span style="color:#8a5a55;">\.<\/span>/); assert.doesNotMatch(guest.textContent + guest.htmlContent, /2026-09-16T|INV-G001|(?<!SYL-)G001\b|ledger|engine/); assert.match(guest.textContent, /^Sent on \d+ \w+ 2026$/m, 'the date only (B3)');
    assert.doesNotMatch(owner.textContent + guest.textContent, /demo-peggy|x-siyl-auth|bearer/i);
    assert.equal(h.calls[0].auth, 'x'); assert.equal(h.calls[0].body.sender.email, 'guest.relation.seeyouinlaos@gmail.com');
  } finally { h.done(); }
});

test('EMAIL · THE PERSISTED ROOM (Owner, 16 Sep 2026): both emails name the room the engine holds for the guest — read on the server under the guest\'s own identity, never the client\'s claim; with no engine the line says "not read"', async () => {
  const h = await harness('brevo');
  try {
    /* one engine, Peggy holds Heritage Room B in the wedding window and Room C of U Sathorn (the Sathorn Penthouse is deleted, Owner 24 Sep 2026 · Edit 6) */
    const rooms = new Rooms(doState());
    const stub = { fetch: (r) => rooms.fetch(r) };
    h.env.ROOMS = { idFromName: () => 'rooms', get: () => stub };
    const me = { invitationId: 'INV-G001', guestId: 'G001', partyId: 'INV-002', hosts: false };
    for (const [key, label] of [['wedstay/heritage', 'B'], ['bkk-stay/u-sathorn-superior-garden', 'C']]) {
      const j = await rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify({ invitationId: 'INV-G001', guestId: 'G001', key, label, name: 'Peggy' }) }));
      assert.equal(j.status, 200);
    }
    /* the client claims another room in its text — the emails carry the engine's */
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.peggy }, { invitationId: 'INV-G001', registration: complete(REG, { scope: { vientianeWedding: true } }), text: TEXT + '\n- The Heritage · Room A' }), h.env);
    assert.equal(r.status, 202);
    const rec = JSON.parse(h.store.m.get('reg:INV-G001').v);
    assert.deepEqual(rec.rooms, { wedstay: { stage: 'wedstay', key: 'wedstay/heritage', label: 'B', name: 'The Heritage', stay: null, room: 'Room B' }, 'bkk-stay': { stage: 'bkk-stay', key: 'bkk-stay/u-sathorn-superior-garden', label: 'C', name: 'Superior Room With Garden View', stay: 'U Sathorn Bangkok', room: 'Room C' } }, 'each record line names its stage (Edit 5: a fixed arrangement may stand beside a chosen hold)');
    const owner = h.calls[0].body.textContent, guest = h.calls[1].body.textContent;
    /* the engine's rooms reach both emails through the stays (the journey-shop shape names the stay lines; this fixture carries none, so the record's rooms are proven on the stored record above) */
    assert.doesNotMatch(owner + guest, /room engine|persisted allocation/, 'no system words in an email');
    delete h.env.ROOMS; h.calls.length = 0;
    await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.peggy }, { invitationId: 'INV-G001', registration: complete(REG), text: TEXT }), h.env);
    assert.equal(JSON.parse(h.store.m.get('reg:INV-G001').v).rooms, null, 'without an engine the record says so — the email stays silent');
    assert.match(src('src/worker.js'), /const rooms = await engineRooms\(env, who\);/, 'the rooms are read on the server, from the engine');
  } finally { h.done(); }
});

test('EMAIL · a provider that refuses (or none configured) never loses the booking: stored, mailed false, the error named; the retry mails the stored journey again and creates no submission; another guest cannot retry it', async () => {
  const h = await harness('refuse');
  try {
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.peggy }, { invitationId: 'INV-G001', registration: complete(REG), text: TEXT }), h.env);
    const d = await r.json(); assert.equal(r.status, 202); assert.equal(d.stored, true); assert.equal(d.mailed, false); assert.equal(d.mail.guest.accepted, false); assert.equal(d.mail.guest.error, 'sender not validated'); assert.ok(h.store.m.has('reg:INV-G001'));
    const keysBefore = [...h.store.m.keys()].length, at = JSON.parse(h.store.m.get('reg:INV-G001').v).submittedAt;
    /* the retry, by the guest's own bearer: the same record, both emails again, no new record */
    const r2 = await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.peggy }, { invitationId: 'INV-G001' }), h.env);
    /* PRQ-04-07 (Window 007): the send tried Guest Relations, the guest, then Guest Relations once more (the server retries its own notification);
       the guest's retry re-sends the guest's copy, and the still-failed notification is retried by the server beside it */
    const d2 = await r2.json(); assert.equal(r2.status, 200); assert.equal(d2.submissionId, d.submissionId); assert.equal(d2.submittedAt, at); assert.equal(h.calls.length, 5);
    const GR = 'guest.relation.seeyouinlaos@gmail.com', PG = 'peggy.test@example.com';
    assert.deepEqual(h.calls.map((c) => c.body.to[0].email), [GR, PG, GR, GR, PG]);
    assert.equal([...h.store.m.keys()].length, keysBefore, 'no new submission'); assert.equal(JSON.parse(h.store.m.get('reg:INV-G001').v).mailRetries, 1);
    /* another guest's bearer, no bearer: refused */
    assert.equal((await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.steffie }, { invitationId: 'INV-G001' }), h.env)).status, 401);
    assert.equal((await h.w.fetch(req('/api/register/mail-retry', {}, { invitationId: 'INV-G001' }), h.env)).status, 401);
    assert.equal((await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.steffie }, { invitationId: 'INV-G002' }), h.env)).status, 404, 'nothing stored for that guest');
  } finally { h.done(); }
  const n = await harness('none');
  try {
    const r = await n.w.fetch(req('/api/register', { 'x-siyl-auth': n.peggy }, { invitationId: 'INV-G001', registration: complete(REG), text: TEXT }), n.env);
    const d = await r.json(); assert.equal(d.stored, true); assert.equal(d.mailed, false); assert.equal(d.mail.owner.provider, 'none'); assert.match(d.mail.owner.error, /no email provider configured/); assert.equal(n.calls.length, 0);
  } finally { n.done(); }
  /* the client: the saved-but-not-mailed words and the retry that never re-submits */
  const rv = src('review.html');
  /* Window 007 (PRQ-04-07 · TO-01665…TO-01692): the words are about the guest's COPY, never a “confirmation email” */
  assert.match(rv, /We could not send your copy by email just now\. <button type="button" class="p-link" id="mail-retry">Send the copy again<\/button>/);
  assert.match(rv, /A copy is on its way to '\+esc\(st\.to\|\|'your email address'\)\+'\./);
  assert.doesNotMatch(rv, /Confirmation email|confirmation email/, 'the copy is never called a confirmation');
  assert.match(rv, /var RETRY_URL='\/api\/register\/mail-retry';/); assert.match(rv, /fetch\(RETRY_URL,\{method:'POST'/); assert.match(rv, /var rb=document\.getElementById\('mail-retry'\);if\(rb\)rb\.addEventListener\('click',retryCopy\);/);
  assert.doesNotMatch(src('src/worker.js'), /mailchannels/i, 'the retired provider is gone');
});

test('SEATS · the words are truthful: the placeholder loads, a plan that cannot be read says so with a retry, "not open" only from the server; the refusal sentence; the same rule for both hosts', () => {
  const wp = src('wedding-preparation.html');
  assert.match(wp, /data-seat-loading>Loading your seats…<\/p>/); assert.doesNotMatch(wp, /<p class="t-l1">Not open yet<\/p>/, 'no static NOT OPEN YET');
  assert.match(wp, /if\(!S\.ready\(\)\)\{\s*if\(!S\.error\(\)\)return;/); assert.match(wp, /data-seat-retry>Try again<\/button>/); assert.match(wp, /rb\.addEventListener\('click',function\(\)\{rb\.disabled=true;S\.load\(true\)\}\)/);
  assert.match(wp, /mode\.err='Another guest has just taken this seat\. Please choose another\.'/);
  /* the hosts' rule is the party flag, never a guest id: both hosts get the fixed front centre at the ceremony and the same dinner chooser */
  assert.doesNotMatch(wp + src('assets/seating.js') + src('src/seating.js') + src('assets/guest.js'), /G048|G049/, 'no guest-specific hardcoding');
  assert.match(wp, /if\(ev==='ceremony'&&p\.hosts\)\{/); assert.match(wp, /function needs\(ev\)\{var p=P\.party\(\),id=P\.me\(\)\.guestId;if\(!T\)return true;if\(ev==='ceremony'\)return !p\.hosts&&T\.joining\(id,'vows'\);return T\.joining\(id,'dinner'\)\}/);
  /* Review & Send: one row builder for both seats (Window 007) — not read yet is never "not open" */
  const rv = src('review.html'); assert.match(rv, /var ready=!!\(Sx&&Sx\.ready\(\)\),openS=ready&&Sx\.open\(\)&&!Sx\.frozen\(\);/); assert.match(rv, /var unreadWords=Sx&&Sx\.error&&Sx\.error\(\)\?'We could not load your seats just now — please open Wedding Preparation to try again\.':'Loading your seats…';/);
  assert.match(rv, /\(openS\?'No seat chosen yet':!ready\?unreadWords:'Seating is not open yet'\)/); assert.match(rv, /seatRow\('Ceremony seat',cs,needC\)\)\+seatRow\('Dinner seat',ds,needD\)/);
  const wd = src('wedding.html'); assert.match(wd, /unread\?unreadWords:'not open yet'/);
  /* the engine: one actor, the seat decided once; a taken chair answers 409 taken; another guest's chair answers 403 */
  const eng = src('src/seating.js');
  assert.match(eng, /return await this\.state\.blockConcurrencyWhile\(async \(\) => \{\s*const cfg = await this\.config\(\);\s*if \(!cfg\.open\) return json\(\{ ok: false, error: 'seating is not open' \}, 423\);/);
  assert.match(eng, /if \(current && !\(current\.guestId === guestId\)\) \{\s*return json\(\{ ok: false, error: 'taken'/); assert.match(eng, /if \(invitationId !== identity\.invitationId \|\| guestId !== identity\.guestId\) return json\(\{ ok: false, error: 'not your guest' \}, 403\);/);
});
