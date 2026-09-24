/* EMAIL FIRST (Owner, 16 Sep 2026): the real journey-shop payload — the email at registration.contact, the guest under
   registration.guestRecord.guests[0], the seats under registration.seats — reaches the guest: the recipient is the contact
   persisted on the server under the authenticated guest's invitation (the identity chain), a journey without an email is
   refused with the words for the email field, the contact route persists it for every device, the retry resolves it
   again. The fixture identity here is a sandbox guest of the harness — no code, no real address. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src } from './sandbox.mjs';
import { complete } from './complete.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async () => ({ keys: [...m.keys()].map((name) => ({ name })) }) }; }
/* step 01's required personal details (Owner, 24 Sep 2026) — obviously synthetic */
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
const TEXT = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G777 · Sam\n- Special Express No. 25 · USD 100';
/* the shape review.html sends (journey-shop) */
const REAL = (email) => ({ channel: 'journey-shop', guestId: 'G777', partyId: 'INV-777', selections: [{ id: 'train', name: 'Special Express No. 25', price: 100 }], totalUsd: 100,
  contact: { email, phone: '+66 81 000 0000' }, templeCeremony: null,
  guestRecord: { invitationId: 'INV-G777', guestId: 'G777', contact: { email, phone: '+66 81 000 0000' }, allergy: { answer: 'no', details: '' }, guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }] },
  documents: null, seats: { ceremony: { G777: 'C-R-05-02' }, dinner: { G777: 'D-12-03' } }, rooms: null, inventory: 'UNKNOWN', registration_submitted_at: '2026-09-16T16:00:00.000Z' });

async function harness() {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-sam'), other = await bearerOf('demo-other');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' }; entries[await authIdOf(other)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' };
  const store = kv(); const calls = [];
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const u = String(url); if (/api\.brevo\.com/.test(u)) { const body = JSON.parse(init.body); calls.push({ url: u, body }); return new Response(JSON.stringify({ messageId: '<msg-' + calls.length + '@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  return { w, env, store, calls, sam, other, done: () => { globalThis.fetch = realFetch; } };
}

test('REAL PATH · the journey-shop payload: the guest email at registration.contact reaches the guest, the name and the seats are read from the real shape, the record carries the recipient and the flat mail summary', async () => {
  const h = await harness();
  try {
    /* STEP 01 IS REQUIRED ON THE SERVER (Owner, 24 Sep 2026): the guest's personal details are stored — the email is not yet */
    assert.equal((await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', ...STEP01 }, 'PUT'), h.env)).status, 200);
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REAL('sam.example@example.org'), { scope: { vientianeWedding: true } }), text: TEXT }), h.env);
    assert.equal(r.status, 202); const d = await r.json();
    assert.equal(d.mail.guest.accepted, true); assert.equal(d.mail.guest.to, 's…@example.org'); assert.equal(d.mail.owner.accepted, true);
    assert.deepEqual(d.mailSummary, { ownerMailStatus: 'accepted', ownerMessageId: '<msg-1@brevo>', guestMailStatus: 'accepted', guestMessageId: '<msg-2@brevo>', guestTo: 's…@example.org', mailLastError: null, at: d.mailSummary.at });
    assert.equal(h.calls[1].body.to[0].email, 'sam.example@example.org'); assert.equal(h.calls[1].body.to[0].name, 'Sam Example');
    assert.match(h.calls[0].body.subject, /Trip received — Sam Example · SYL-G777-/);
    assert.match(h.calls[0].body.textContent, /Guest: Sam Example\n/); assert.match(h.calls[0].body.textContent, /Vow Ceremony: Seat E5\n· Wedding Dinner: Seat D-12-03/); assert.match(h.calls[0].body.textContent, /Email: sam.example@example.org\nMobile: \+66 81 000 0000/);
    assert.match(h.calls[0].body.textContent, /Ceremony seat record: C-R-05-02/, 'the internal id sits in the internal reference only');
    assert.match(h.calls[1].body.textContent, /Dear Sam,/); assert.doesNotMatch(h.calls[1].body.textContent, /C-R-05-02|(?<!SYL-)G777|INV-G777/, 'no internal id reaches the guest');
    const rec = JSON.parse(h.store.m.get('reg:INV-G777').v);
    assert.equal(rec.guestId, 'G777'); assert.deepEqual(rec.recipient, { email: 'sam.example@example.org', phone: '+66 81 000 0000', source: 'journey contact' });
    assert.equal(rec.mailSummary.guestMessageId, '<msg-2@brevo>'); assert.equal(rec.mailSummary.guestMailStatus, 'accepted');
    /* the email carried by the journey is persisted as the server contact — the next device reads it */
    const c = await (await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }), h.env)).json();
    assert.equal(c.ok, true); assert.equal(c.contact.email, 'sam.example@example.org'); assert.equal(c.contact.phone, '+66 81 000 0000');
    /* the journey's email is added to the stored contact — the personal details the guest stored before are kept (Owner, 24 Sep 2026) */
    const kept = JSON.parse(h.store.m.get('contact:INV-G777').v); for (const [k, v] of Object.entries(STEP01)) assert.equal(kept[k], v, k + ' survives the journey\'s email');
    /* nothing of the fixtures in the real path */
    assert.doesNotMatch(src('src/worker.js'), /Peggy|INV-G001|controlled production mail test/);
  } finally { h.done(); }
});

test('REAL PATH · a journey without an email is refused (422, the words for the email field, nothing stored, nothing mailed); the contact route persists the email under the guest\'s own invitation; the journey is then accepted with the server contact as the recipient; another guest cannot write it', async () => {
  const h = await harness();
  try {
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REAL('')), text: TEXT }), h.env);
    assert.equal(r.status, 422); const d = await r.json();
    assert.equal(d.error, 'email required'); assert.equal(d.message, 'Please add your email address, so we can send you a copy of your trip.');   /* TO-01691: a copy, never a confirmation */ assert.equal(d.field, 'email');
    assert.equal(h.store.m.has('reg:INV-G777'), false); assert.equal(h.calls.length, 0);
    /* another guest's bearer cannot set this guest's contact */
    const bad = await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.other }, { invitationId: 'INV-G777', email: 'x@example.org' }, 'PUT'), h.env);
    assert.equal(bad.status, 403);
    assert.equal((await h.w.fetch(req('/api/contact', {}, { email: 'x@example.org' }, 'PUT'), h.env)).status, 401);
    assert.equal((await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }, { email: 'not-an-email' }, 'PUT'), h.env)).status, 422);
    /* the guest adds the email — persisted server-side */
    const put = await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', email: 'sam.example@example.org', phone: '+66 81 000 0000' }, 'PUT'), h.env);
    assert.equal(put.status, 200); assert.equal(JSON.parse(h.store.m.get('contact:INV-G777').v).guestId, 'G777');
    /* STEP 01 IS REQUIRED ON THE SERVER (Owner, 24 Sep 2026): a valid email and phone alone are not a complete step 01 — the
       journey is refused with every missing required personal item named (address2 · region are optional), nothing stored */
    const rp = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REAL('')), text: TEXT }), h.env);
    assert.equal(rp.status, 422); const dp = await rp.json(); assert.equal(dp.error, 'incomplete');
    assert.deepEqual(dp.missing.filter((m) => m.step === 'you').map((m) => m.key), ['birthdate', 'nationality', 'address1', 'postal', 'city', 'country']);
    assert.equal(h.store.m.has('reg:INV-G777'), false); assert.equal(h.calls.length, 0);
    assert.equal((await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', ...STEP01 }, 'PUT'), h.env)).status, 200);
    /* the same journey (still without an email in it) is accepted — the recipient is the server contact */
    const r2 = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REAL('')), text: TEXT }), h.env);
    assert.equal(r2.status, 202); const d2 = await r2.json();
    assert.equal(d2.mail.guest.accepted, true); assert.equal(h.calls[1].body.to[0].email, 'sam.example@example.org');
    assert.deepEqual(JSON.parse(h.store.m.get('reg:INV-G777').v).recipient, { email: 'sam.example@example.org', phone: '+66 81 000 0000', source: 'server contact' });
    /* the server contact wins over a different email typed on this device — one canonical recipient */
    h.calls.length = 0;
    await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REAL('other.device@example.org')), text: TEXT }), h.env);
    assert.equal(h.calls[1].body.to[0].email, 'sam.example@example.org');
  } finally { h.done(); }
});

test('RETRY · a stored journey whose guest email failed for want of an address: the retry after the contact is added resolves the server contact and mails the guest — the same submission id, no new record', async () => {
  const h = await harness();
  try {
    /* a stored record of the old shape (before the fix): no recipient, guest mail failed */
    const old = { invitationId: 'INV-G777', submittedAt: '2026-09-16T15:32:17.398Z', submissionId: 'SYL-G777-E64ABD3E', registration: REAL(''), text: TEXT, mail: { owner: { accepted: true, id: '<o@brevo>' }, guest: { provider: 'none', accepted: false, id: null, error: 'no valid guest email address in the journey' } } };
    await h.env.REG_KV.put('reg:INV-G777', JSON.stringify(old), { metadata: { invitationId: 'INV-G777', submittedAt: old.submittedAt, submissionId: old.submissionId } });
    const no = await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777' }), h.env);
    assert.equal(no.status, 422); assert.equal((await no.json()).error, 'email required'); assert.equal(h.calls.length, 0);
    await h.w.fetch(req('/api/contact', { 'x-siyl-auth': h.sam }, { email: 'sam.example@example.org' }, 'PUT'), h.env);
    const yes = await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777' }), h.env);
    assert.equal(yes.status, 200); const d = await yes.json();
    /* PRQ-04-07 (Window 007): the retry re-sends the guest's copy only — Guest Relations already had theirs (accepted), so it is not sent twice */
    assert.equal(d.submissionId, 'SYL-G777-E64ABD3E'); assert.equal(d.mail.guest.accepted, true); assert.equal(d.mailSummary.guestMessageId, '<msg-1@brevo>');
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0].body.to[0].email, 'sam.example@example.org');
    const rec = JSON.parse(h.store.m.get('reg:INV-G777').v);
    assert.equal(rec.submissionId, 'SYL-G777-E64ABD3E'); assert.equal(rec.mailRetries, 1); assert.equal(rec.recipient.source, 'server contact');
    assert.equal([...h.store.m.keys()].filter((k) => k.startsWith('reg:INV-G777')).length, 1, 'no new record');
  } finally { h.done(); }
});

test('CLIENT · the guest store pushes the contact to the server and pulls it on sign-in; Review & Send shows one card with the email line about the guest\'s copy and sends a 422 back to the email field', () => {
  const g = src('assets/guest.js'), rv = src('review.html');
  assert.match(g, /pushContact: function \(\)/); assert.match(g, /pullContact: function \(\)/); assert.match(g, /this\.pushContact\(\);/, 'setContact pushes');
  assert.match(g, /fetch\(CONTACT_API, \{ method: 'PUT', headers: \{ 'content-type': 'application\/json', 'x-siyl-auth': a\.bearer \}/);
  assert.match(g, /document\.addEventListener\('siyl:auth', pullOnce\)/);
  /* Window 007: the send goes through SIYL_DRAFT.send; its 422 “email required” comes back to the email field (TO-01691) */
  const dj = src('assets/draft.js');
  assert.match(dj, /if \(r\.status === 422 && d\.error === 'email required'\) return \{ ok: false, status: 422, error: 'email required'/);
  assert.match(rv, /if\(e==='email required'\)\{err\.innerHTML=esc\(r\.message\|\|'Please add your email address, so we can send you a copy of your trip\.'\)\+' <a class="p-link" href="invitation\.html#p-email"[^>]*>Add your email address<\/a>'/);
  /* ONE card instead of three ticks: what we have, the one email line about the guest's COPY, and the way back */
  assert.match(rv, /<h2 class="t-h1">Thank you — we have your trip<\/h2>/); assert.match(rv, /<h2 class="t-h1">Thank you — we have your update<\/h2>/);
  assert.match(rv, /data-mail="sent">A copy is on its way to '\+esc\(st\.to\|\|'your email address'\)/); assert.match(rv, /data-mail="failed">We could not send your copy by email just now\. <button type="button" class="p-link" id="mail-retry">Send the copy again<\/button>/);
  assert.doesNotMatch(rv, /Confirmation email|confirmation email|Retry confirmation/, 'the guest\'s copy is never called a confirmation');
  /* the button: “Send my trip” before the first send, “Send the update” after a real change — and none while nothing changed (an unchanged trip cannot be sent again) */
  assert.match(rv, /if\(w\.key==='changed'\)return nj&&!w\.declined\?'Send my reply':'Send the update';\s*return nj\?'Send my reply':'Send my trip'\}/);
  assert.match(rv, /function hasSomethingToSend\(\)\{var k=tripWords\(\)\.key;return k!=='sent'&&k!=='confirmed'\}/); assert.match(rv, /var show=!\(G&&G\.party\(\)\)\|\|hasSomethingToSend\(\);\s*btn\.hidden=!show;/);
  /* a confirmation lapses with a change: the card says Guest Relations will confirm it again */
  assert.match(rv, /You changed your trip after Guest Relations confirmed it\. Send the update, and Guest Relations will confirm it with you again\./);
});
