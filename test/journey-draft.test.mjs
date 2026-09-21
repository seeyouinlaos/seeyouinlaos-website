/* THE JOURNEY DRAFT + ONE LOGICAL JOURNEY (Owner, 16 Sep 2026 · FINAL QUICKFIX): one server-side draft per authenticated
   guest (the complete journey keys), read back on another device; the submission keeps its reference across updates;
   "changes not yet sent" is a server comparison of what was sent with what is saved; Guest Relations reads the canonical
   data. Sandbox identities only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, doState } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const TEXT = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G777 · Sam';
const REG = (email, extra) => ({ channel: 'journey-shop', guestId: 'G777', partyId: 'INV-777', selections: [{ id: 'train', name: 'Special Express No. 25', price: 100 }], totalUsd: 100, contact: { email, phone: '+66 81 000 0000' },
  guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }], contact: { email, phone: '+66 81 000 0000' } }, seats: null, rooms: null, registration_submitted_at: '2026-09-16T10:00:00.000Z', ...(extra || {}) });
const GUEST = (answers) => JSON.stringify({ contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, guests: { G777: { submitted: {}, profile: answers, history: [{ at: 'x' }] } }, history: [{ at: 'y' }] });

async function harness() {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-sam'), other = await bearerOf('demo-other');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' }; entries[await authIdOf(other)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' };
  const store = kv(); const calls = [];
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const u = String(url); if (/api\.brevo\.com/.test(u)) { const body = JSON.parse(init.body); calls.push({ body }); return new Response(JSON.stringify({ messageId: '<msg-' + calls.length + '@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  return { w, env, store, calls, sam, other, rooms, done: () => { globalThis.fetch = realFetch; } };
}

test('DRAFT · one server-side draft per guest: PUT stores the complete keys under the guest\'s invitation (the contact inside becomes the server contact), GET on another device returns them; another guest cannot read or write it; nothing without a bearer', async () => {
  const h = await harness();
  try {
    const keys = { 'siyl.guest': GUEST({ coffeetea: 'Oolong' }), 'siyl.bag': JSON.stringify([{ id: 'train', price: 100 }]), 'siyl.temple': JSON.stringify({ events: { temple: 'yes' } }), 'siyl.docs': JSON.stringify({ docs: {} }), 'siyl.skip': '[]' };
    const put = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', keys, clientUpdatedAt: '2026-09-16T10:00:00.000Z', reason: 'save' }, 'PUT'), h.env);
    assert.equal(put.status, 200); const d = await put.json(); assert.equal(d.ok, true); assert.ok(d.savedAt); assert.equal(d.submission.submissionStatus, 'draft'); assert.equal(d.submission.hasUnsentChanges, false);
    const stored = JSON.parse(h.store.m.get('draft:INV-G777').v); assert.equal(stored.guestId, 'G777'); assert.deepEqual(stored.keys, keys);
    assert.equal(JSON.parse(h.store.m.get('contact:INV-G777').v).email, 'sam.example@example.org', 'the contact in the draft is the server contact');
    /* device B */
    const get = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }), h.env); const g = await get.json();
    assert.equal(g.ok, true); assert.deepEqual(g.draft.keys, keys); assert.equal(g.draft.updatedAt, d.updatedAt); assert.equal(g.submission.submissionStatus, 'draft');
    /* another guest, nobody */
    assert.equal((await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.other }, { invitationId: 'INV-G777', keys }, 'PUT'), h.env)).status, 403);
    const o = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.other }), h.env)).json(); assert.equal(o.draft, null, 'another guest reads their own (empty) draft, never this one');
    assert.equal((await h.w.fetch(req('/api/draft', {}, { keys }, 'PUT'), h.env)).status, 401);
    assert.equal((await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }, { keys: { 'siyl.auth': 'x' } }, 'PUT'), h.env)).status, 400, 'only the journey keys are accepted');
    /* the page-hide beacon: the bearer in the body */
    const bc = await h.w.fetch(req('/api/draft?beacon=1', { 'content-type': 'application/json' }, { invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: d.updatedAt, bearer: h.sam }), h.env);
    assert.equal(bc.status, 200); assert.equal(JSON.parse(h.store.m.get('draft:INV-G777').v).keys['siyl.bag'], '[]');
  } finally { h.done(); }
});

test('ONE LOGICAL JOURNEY · the first send sets the reference; a change afterwards reads CHANGES NOT YET SENT (a server comparison, rooms and seats included); Send Updated Journey keeps the reference, version 2, "Journey updated" to both, the previous version kept; hasUnsentChanges false again; a retry never makes a submission', async () => {
  const h = await harness();
  try {
    /* every PUT names the revision it read (the client does the same) */
    const put = async (keys) => { const cur = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }), h.env)).json(); return (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'), h.env)).json(); };
    const state = async () => (await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }), h.env)).json()).submission;
    await put({ 'siyl.guest': GUEST({ coffeetea: 'Oolong' }), 'siyl.bag': JSON.stringify([{ id: 'train' }]) });
    const r1 = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REG('sam.example@example.org')), text: TEXT }), h.env);
    assert.equal(r1.status, 202); const d1 = await r1.json();
    assert.equal(d1.kind, 'initial'); assert.equal(d1.version, 1); assert.match(d1.submissionId, /^SYL-G777-[0-9A-F]{8}$/); assert.equal(d1.submission.submissionStatus, 'sent'); assert.equal(d1.submission.hasUnsentChanges, false);
    assert.match(h.calls[0].body.subject, /^Trip received — Sam Example/); assert.match(h.calls[1].body.subject, /^Your trip has been received — /);
    let s = await state(); assert.equal(s.submissionStatus, 'sent'); assert.equal(s.submissionId, d1.submissionId);
    /* the same draft saved again (history stamps differ) is not a change */
    await put({ 'siyl.guest': GUEST({ coffeetea: 'Oolong' }).replace('"at":"x"', '"at":"z"'), 'siyl.bag': JSON.stringify([{ id: 'train' }]) });
    s = await state(); assert.equal(s.hasUnsentChanges, false, 'a stamp is not a change');
    /* an answer changes → CHANGES NOT YET SENT */
    const p2 = await put({ 'siyl.guest': GUEST({ coffeetea: 'Espresso' }), 'siyl.bag': JSON.stringify([{ id: 'train' }]) });
    assert.equal(p2.submission.submissionStatus, 'changes-not-sent'); assert.equal(p2.submission.hasUnsentChanges, true); assert.equal(p2.submission.submissionId, d1.submissionId);
    /* Send Updated Journey */
    const r2 = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REG('sam.example@example.org', { registration_submitted_at: '2026-09-16T10:30:00.000Z' })), text: TEXT + '\n- Espresso' }), h.env);
    const d2 = await r2.json();
    assert.equal(d2.kind, 'update'); assert.equal(d2.version, 2); assert.equal(d2.submissionId, d1.submissionId, 'the same logical journey'); assert.equal(d2.submission.hasUnsentChanges, false); assert.equal(d2.submission.submissionStatus, 'sent');
    assert.match(h.calls[2].body.subject, /^Trip updated — Sam Example · SYL-G777-/); assert.match(h.calls[3].body.subject, /^Your trip has been updated — SYL-G777-/);
    assert.match(h.calls[2].body.textContent, /Trip updated\n\nLatest version received .* \(replaces the version first sent 16 September 2026 · 12:00\)/); assert.match(h.calls[3].body.textContent, /replaces the previous version for review/); assert.doesNotMatch(h.calls[3].body.textContent, /version 2|2026-09-16T/, 'versioning stays internal for the guest');
    assert.equal(d2.mailSummary.guestMessageId, '<msg-4@brevo>');
    const rec = JSON.parse(h.store.m.get('reg:INV-G777').v); assert.equal(rec.version, 2); assert.equal(rec.firstSentAt, '2026-09-16T10:00:00.000Z'); assert.ok(rec.lastSentAt > rec.firstSentAt);
    assert.equal([...h.store.m.keys()].filter((k) => k.startsWith('reg:INV-G777:prev:')).length, 1, 'the previous version is kept');
    s = await state(); assert.equal(s.hasUnsentChanges, false); assert.equal(s.version, 2);
    /* a room change on the engine is a change too */
    const me = { invitationId: 'INV-G777', guestId: 'G777', partyId: 'INV-777', hosts: false };
    await h.rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', key: 'wedstay/heritage', label: 'B', name: 'Sam' }) }));
    s = await state(); assert.equal(s.hasUnsentChanges, true, 'a new room is a change not yet sent');
    /* the retry mails the stored (version 2) journey and makes no submission */
    const rt = await (await h.w.fetch(req('/api/register/mail-retry', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777' }), h.env)).json();
    assert.equal(rt.submissionId, d1.submissionId); assert.equal(JSON.parse(h.store.m.get('reg:INV-G777').v).version, 2); assert.equal(h.calls.length, 6);
    /* Guest Relations sees the canonical data */
    const gr = await (await h.w.fetch(req('/api/gr/journeys', { 'x-gr-token': 'gr-secret' }), h.env)).json();
    assert.equal(gr.ok, true); const j = gr.journeys.find((x) => x.invitationId === 'INV-G777');
    assert.equal(j.guestId, 'G777'); assert.equal(j.submissionId, d1.submissionId); assert.equal(j.version, 2); assert.equal(j.status, 'changes-not-sent'); assert.equal(j.hasUnsentChanges, true);
    assert.equal(j.contact.email, 'sam.example@example.org'); assert.deepEqual(j.bag, [{ id: 'train' }]); assert.equal(j.aboutYou[0].profile.coffeetea, 'Espresso'); assert.equal(j.rooms.wedstay.room, 'Room B'); assert.equal(j.mail.guestMessageId, '<msg-6@brevo>');
    assert.equal((await h.w.fetch(req('/api/gr/journeys', { 'x-siyl-auth': h.sam }), h.env)).status, 401, 'a guest bearer is not Guest Relations');
  } finally { h.done(); }
});

test('CLIENT · the draft module: autosave on every change, pull on sign-in, Save My Progress reads back before SAVED, Continue flushes, the shell mounts the control on every step, every private page loads it, Review & Send flushes before the send', () => {
  const d = src('assets/draft.js'), sh = src('assets/prep-shell.js'), rv = src('review.html');
  assert.match(d, /var KEYS = \['siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\];/);
  assert.match(d, /\['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'\]\.forEach\(function \(ev\) \{ document\.addEventListener\(ev, function \(\) \{ D\.touch\(\); \}\); \}\);/, 'autosave');
  assert.match(d, /document\.addEventListener\('siyl:auth', pullOnce\)/); assert.match(d, /if \(reason === 'save'\) \{/); assert.match(d, /the saved copy differs/);
  assert.match(d, /closest\('\[data-continue\]'\)/); assert.match(d, /Save My Progress</); assert.match(d, /'Saving…'/); assert.match(d, /'Not saved · try again'/); assert.match(d, /'Saved · ' \+ t/);
  assert.match(d, /Changes saved · not yet sent to Guest Relations/); assert.match(d, /'Send Updated Trip'/); assert.match(d, /'Sent to Guest Relations · Reference ' \+ s\.submissionId/); assert.match(d, /saved as draft/);
  assert.match(sh, /SIYL_DRAFT\.mount\(bar\.querySelector\('\[data-prep-save\]'\)\)/);
  for (const f of ['about-you.html', 'cart.html', 'invitation.html', 'review.html', 'tickets.html', 'transport.html', 'wedding-preparation.html', 'wedding.html', 'your-journey.html', 'room.html', 'journeys.html']) assert.match(src(f), /assets\/draft\.js/, f + ' loads the draft module');
  assert.match(rv, /var fl=await SIYL_DRAFT\.flush\('send'\);/); assert.match(rv, /id="srvstate"/);
});
