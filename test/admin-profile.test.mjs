/* ============================================================================
   HS-035 P1 · THE ADMIN GUEST PROFILE (Owners, 21 Nov 2026 · E31–E37) — GET /api/billing/admin/profile and its view.
     · for the BILLING_ADMINs only (a guest: 403); one invitation of the register, said when it is not (400 / 404)
     · READ ONLY: no write to the store or the engines, no guest identity sent to the engines, the sent record untouched
       (the comparison never keeps a fingerprint), one read per engine, no listing of the store
     · an allowlist: no amount, no mail data or text, no fingerprint, no document file name or key, no bearer
     · a failed read is said ("could not be checked"), never shown as a fact
     · the view: every guest value escaped, the profile button never opens the financial view, the resource-limit refusal
       is said and never retried by itself, the console stands without the profile script
   Synthetic invitations only (INV-S###, G9xx); nothing here is a real guest.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world } from './gr-scale-fixture.mjs';
import { page, src, SUTHEP } from './sandbox.mjs';
import { profileModel } from '../src/admin-profile.js';
import { Drafts } from '../src/drafts.js';
import { doState } from './sandbox.mjs';

const W = await world(undefined, { admin: true });
W.env.SHEETS_ID = 'synthetic';
W.env.BILLING_LEDGER = { idFromName: () => 'billing', get: () => ({ fetch: async () => Response.json({ ok: true }) }) };
const SENT = W.state.sent.filter((i) => !W.state.changed.includes(i) && !W.state.legacy.includes(i));
const DOC_INV = SENT[0];
const DOC_GID = DOC_INV.replace(/^INV-/, '');
let docsFail = false;
const DOCS = [
  { key: 'doc/' + DOC_INV + '/' + DOC_GID + '/passport/2026-10-01T10:00:00.000Z-aaaaaaaaaaaa', size: 1000, customMetadata: { guestId: DOC_GID, kind: 'passport', filename: 'old-passport-scan.jpg', receivedAt: '2026-10-01T10:00:00.000Z' }, httpMetadata: { contentType: 'image/jpeg' } },
  { key: 'doc/' + DOC_INV + '/' + DOC_GID + '/passport/2026-10-03T10:00:00.000Z-bbbbbbbbbbbb', size: 1200, customMetadata: { guestId: DOC_GID, kind: 'passport', filename: 'my-passport-scan.jpg', receivedAt: '2026-10-03T10:00:00.000Z' }, httpMetadata: { contentType: 'image/jpeg' } },
];
W.env.DOCS = { list: async ({ prefix }) => { if (docsFail) throw new Error('r2 down'); return { objects: DOCS.filter((o) => o.key.startsWith(prefix)), truncated: false }; } };

/* every engine request watched: an identity header would teach the engines a name (and could trim a party) */
let identityCalls = 0;
for (const b of ['ROOMS', 'SEATING']) {
  const ns = W.env[b], get0 = ns.get;
  ns.get = (id) => { const stub = get0(id); return { fetch: (r) => { if (r.headers.get('x-siyl-identity')) identityCalls++; return stub.fetch(r); } }; };
}
/* every engine write counted */
let engineWrites = 0;
for (const e of [W.rooms, W.seating]) { const s = e.storage, put0 = s.put.bind(s), del0 = s.delete.bind(s); s.put = (...a) => { engineWrites++; return put0(...a); }; s.delete = (...a) => { engineWrites++; return del0(...a); }; }

const profile = (inv, bearer) => W.call('/api/billing/admin/profile?holder=' + encodeURIComponent(inv), bearer === undefined ? W.admin.bearer : bearer);
const snapshot = () => JSON.stringify([...W.env.REG_KV.m.entries()]);

test('ACCESS · a guest gets 403; a wrong invitation 400; an invitation outside the register 404', async () => {
  const guest = W.people.find((p) => p.inv === SENT[0]);
  assert.equal((await profile(SENT[0], guest.bearer)).status, 403, 'a guest never reads a profile — not even their own here');
  assert.equal((await profile(SENT[0], null)).status, 401);
  assert.equal((await profile('nobody')).status, 400);
  assert.equal((await profile('INV-S999')).status, 404);
});

test('READ ONLY · a sent, unchanged trip: as sent beside now, no unsent changes — nothing written, no identity to the engines, one read per engine, no listing', async () => {
  const inv = SENT[1], before = snapshot();
  W.reset(); identityCalls = 0; engineWrites = 0;
  const r = await profile(inv);
  assert.equal(r.status, 200, JSON.stringify(r.d).slice(0, 300));
  const P = r.d.profile;
  assert.equal(P.identity.invitationId, inv);
  assert.equal(P.status.sent, true); assert.equal(P.status.unsent, false, 'the trip reads as sent');
  assert.ok(P.sent && P.sent.version >= 1 && P.sent.travel.length, 'the trip as sent, read as the e-mail reads it');
  assert.equal(P.draft, null, 'no draft block when nothing differs');
  assert.equal(P.now.roomsReadable, true); assert.equal(P.now.seatsReadable, true);
  assert.ok(P.contactNow && /@example\.org$/.test(P.contactNow.email));
  assert.equal(W.c.kvPut, 0, 'no KV write'); assert.equal(W.c.kvDelete, 0); assert.equal(W.c.kvList, 0, 'no listing of the store');
  assert.ok(W.c.kvGet <= 4, 'reads by key for this invitation only (' + W.c.kvGet + ')');
  assert.equal(W.c.rooms, 1, 'one read of the room engine'); assert.equal(W.c.seating, 1, 'one read of the seating plan');
  assert.equal(identityCalls, 0, 'never a guest identity to the engines'); assert.equal(engineWrites, 0, 'no engine write');
  assert.equal(snapshot(), before, 'the store is exactly as it was');
});

test('READ ONLY · a record sent before the selection fingerprint keeps no fingerprint after a profile read (the comparison runs with `pre`)', async () => {
  const inv = W.state.legacy[0];
  assert.ok(inv, 'the fixture has a legacy record');
  const raw = W.env.REG_KV.m.get('reg:' + inv).v;
  const r = await profile(inv);
  assert.equal(r.status, 200);
  assert.equal(W.env.REG_KV.m.get('reg:' + inv).v, raw, 'the stored record is byte for byte the same');
  assert.doesNotMatch(raw, /selectionFingerprint/);
});

test('UNSENT · a trip changed after sending says so and shows the draft answers beside the sent ones', async () => {
  const r = await profile(W.state.changed[0]);
  assert.equal(r.status, 200);
  assert.equal(r.d.profile.status.unsent, true);
  assert.ok(r.d.profile.draft && Array.isArray(r.d.profile.draft.answers), 'the draft · not sent block');
});

test('NOT SENT · a guest with a draft only: not sent, the draft answers, no comparison', async () => {
  const r = await profile(W.state.draft.find((i) => i !== 'INV-S001' && i !== 'INV-S002'));
  assert.equal(r.status, 200);
  const P = r.d.profile;
  assert.equal(P.status.sent, false); assert.equal(P.sent, null); assert.equal(P.status.unsent, null);
  assert.ok(P.draft && P.draft.answers.some((a) => a.value), 'the draft answers are shown, marked as not sent');
  assert.ok(P.acknowledgements && typeof P.acknowledgements.note.acknowledged === 'boolean');
});

test('ALLOWLIST · no amount, no mail data or e-mail text, no fingerprint, no document file name or key, no bearer', async () => {
  const r = await profile(DOC_INV);
  const s = JSON.stringify(r.d);
  for (const bad of ['JOURNEY SELECTION', 'messageId', '"mail"', '"text"', 'recipient', 'ingerprint', '"price"', '"total', '"rate"', 'filename', 'scan.jpg', 'doc/INV', '"bytes"', 'image/jpeg', W.admin.bearer])
    assert.ok(!s.includes(bad), 'the answer must not carry ' + bad);
  for (const p of W.people) assert.ok(!s.includes(p.bearer), 'no guest bearer');
  const docs = r.d.profile.documents;
  assert.deepEqual(docs.map((d) => d.kind), ['passport'], 'the current copy only');
  assert.equal(docs[0].receivedAt, '2026-10-03T10:00:00.000Z', 'the newest copy is the guest\'s document');
  assert.deepEqual(Object.keys(docs[0]).sort(), ['guestId', 'kind', 'receivedAt']);
});

test('FAILURES · a store that cannot be read is said, never shown as a fact', async () => {
  docsFail = true;
  try { assert.equal((await profile(DOC_INV)).d.profile.documents, null, 'documents: could not be checked'); } finally { docsFail = false; }
  const drafts = W.env.DRAFTS, seating = W.env.SEATING;
  W.env.DRAFTS = { idFromName: (n) => n, get: () => ({ fetch: async () => Response.json({ ok: false, error: 'busy' }, { status: 503 }) }) };
  try {
    const P = (await profile(SENT[1])).d.profile;
    assert.equal(P.status.draftReadable, false); assert.equal(P.status.unsent, null, 'unsent changes: could not be checked'); assert.equal(P.acknowledgements, null);
  } finally { W.env.DRAFTS = drafts; }
  W.env.SEATING = { idFromName: () => 'seating', get: () => ({ fetch: async () => Response.json({ ok: false }, { status: 503 }) }) };
  try {
    const P = (await profile(SENT[1])).d.profile;
    assert.equal(P.now.seatsReadable, false); assert.equal(P.status.unsent, null);
  } finally { W.env.SEATING = seating; }
});

test('READ ONLY · a drafts actor that was never read stores nothing after a profile read (peek, never the seed write); a KV-only draft is read, never copied in', async () => {
  const inv = W.state.opened[0], gid = inv.replace(/^INV-/, '');
  const fresh = doState(), drafts0 = W.env.DRAFTS;
  W.env.DRAFTS = { idFromName: (n) => n, get: (n) => (n === inv ? new Drafts(fresh, W.env) : drafts0.get(n)) };
  try {
    W.reset();
    let P = (await profile(inv)).d.profile;
    assert.equal(P.status.draftReadable, true); assert.equal(P.status.draftUpdatedAt, null);
    assert.equal(fresh._map.size, 0, 'the actor keeps nothing — no "seeded", no draft');
    assert.equal(W.c.kvPut, 0);
    /* a draft that exists only in the KV mirror (it predates the actor): shown, never copied into the actor */
    W.env.REG_KV.m.set('draft:' + inv, { v: JSON.stringify({ invitationId: inv, guestId: gid, updatedAt: '2026-11-01T09:00:00.000Z', keys: { 'siyl.guest': JSON.stringify({ guests: { [gid]: { profile: { coffeetea: 'Green tea' }, allergy: { answer: 'no' } } } }) } }) });
    P = (await profile(inv)).d.profile;
    assert.equal(P.status.draftUpdatedAt, '2026-11-01T09:00:00.000Z');
    assert.ok(P.draft && P.draft.answers.some((a) => a.value === 'Green tea'), 'the mirror\'s answers are shown as a draft');
    assert.equal(fresh._map.size, 0, 'still nothing stored in the actor');
  } finally { W.env.DRAFTS = drafts0; W.env.REG_KV.m.delete('draft:' + inv); }
});

test('FAILURES · a stored value that cannot be parsed is a failed read, never "not sent" or "none"', async () => {
  const inv = SENT[1], k = 'conf:' + inv, had = W.env.REG_KV.m.get(k);
  W.env.REG_KV.m.set(k, { v: '{not json' });
  try { const P = (await profile(inv)).d.profile; assert.equal(P.readable.confirmation, false); assert.equal(P.readable.record, true); }
  finally { if (had) W.env.REG_KV.m.set(k, had); else W.env.REG_KV.m.delete(k); }
});

test('ALLOWLIST · a guest joining the wedding with the Sangkhathan offering reads "Yes" — no amount; a confirmation note keeps no price digest', () => {
  const rec = { invitationId: 'INV-G903', guestId: 'G903', submissionId: 'S-G903', version: 1, submittedAt: '2026-10-01T10:00:00Z',
    registration: { guestRecord: { scope: { vientianeWedding: true }, guests: [{ guestId: 'G903', name: 'Cleo', profile: {} }] },
      selections: [{ id: 'sangkhathan', name: 'Sangkhathan', price: 15, qty: 1 }, { id: 'train', name: 'Special Express No. 25', meta: '25 February 2027', price: 100, qty: 1 }],
      templeCeremony: { guests: [{ guestId: 'G903', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' } }] } } };
  const P = profileModel({ who: { invitationId: 'INV-G903', guestId: 'G903' }, record: rec, stands: false,
    conf: { confirmedAt: '2026-10-02T10:00:00Z', version: 1, history: [{ action: 'confirm', at: '2026-10-02T10:00:00Z', role: 'BILLING_ADMIN', actor: 'BRIDE', note: 'confirmed · the amounts sent to the guest differ from today\'s Billing Engine (seen: 1a2b3c4d5e6f)', version: 1 }] },
    draft: { ok: true }, rooms: {}, seats: { ceremony: {}, dinner: {} }, unsent: false, docs: [] });
  assert.equal(P.sent.away, false, 'the guest joins the wedding');
  assert.equal(P.sent.sangkhathan, 'Yes');
  const s = JSON.stringify(P);
  assert.doesNotMatch(s, /USD\s?\d/, 'no amount anywhere in the profile');
  assert.doesNotMatch(s, /1a2b3c4d5e6f|seen:/, 'no price digest');
  assert.match(P.confirmation.history[0].note, /differ from today/, 'the fact itself stays');
});

/* ------------------------------------------------------------------ the view */
const tick = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function fakeRoot() {
  let html = '', cache = {};
  const parse = (attr) => {
    const out = []; const re = /<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/gi; let m;
    while ((m = re.exec(html))) {
      const attrs = {}; m[2].replace(/([a-z-]+)(?:="([^"]*)")?/gi, (x, k, v) => { attrs[k] = v === undefined ? '' : v; return x; });
      if (!(attr in attrs)) continue;
      out.push({ tag: m[1], attrs, getAttribute: (k) => (k in attrs ? attrs[k] : null), value: attrs.value || '', focus() {}, setSelectionRange() {} });
    }
    return out;
  };
  return { get innerHTML() { return html; }, set innerHTML(v) { html = String(v); cache = {}; },
    querySelectorAll(sel) { const m = /^\[([a-z-]+)\]$/.exec(sel); if (!m) return []; return cache[sel] || (cache[sel] = parse(m[1])); }, querySelector(sel) { return this.querySelectorAll(sel)[0] || null; } };
}
const HOSTILE = '<img src=x onerror=alert(1)>"><script>alert(2)</script>';
const OVERVIEW = { ok: true, asOf: '2026-11-21', audience: 'GROOM', chunk: 6, gate: { approved: true },
  holders: [{ Holder_ID: 'INV-G901', guestId: 'G901', contactId: 'C901', name: { full: 'Ada Example', first: 'Ada' }, settlement: {}, payment: null }] };
function hostileProfile() {
  const rec = { invitationId: 'INV-G901', guestId: 'G901', submissionId: 'S-G901', version: 2, submittedAt: '2026-10-01T10:00:00Z', lastSentAt: '2026-10-05T10:00:00Z',
    registration: { personal: { firstName: HOSTILE, lastName: HOSTILE, birthdate: '1990-01-01', nationality: HOSTILE, city: HOSTILE },
      guestRecord: { scopeWords: HOSTILE, guests: [{ guestId: 'G901', name: 'Ada', source: { fullName: HOSTILE }, profile: { coffeetea: HOSTILE, drink: HOSTILE, film: HOSTILE, music: HOSTILE, flavor: 'Pandan', genres: ['Jazz'] }, allergy: { answer: 'yes', details: HOSTILE } }],
        contact: { email: 'ada@example.org', phone: HOSTILE }, scope: { vientianeWedding: true } },
      selections: [{ id: 'wedstay', name: HOSTILE, meta: HOSTILE + ' · ' + HOSTILE, stay: 'souphattra', price: 145, qty: 1, note: HOSTILE }, { id: 'sangkhathan', name: 'Sangkhathan', price: 15, qty: 1 }],
      templeCeremony: { guests: [{ guestId: 'G901', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, finale: HOSTILE }] } } };
  const P = profileModel({ who: { invitationId: 'INV-G901', guestId: 'G901', partyId: 'INV-900', contactId: 'C901', hosts: false }, record: rec,
    conf: { confirmedAt: '2026-10-06T10:00:00Z', version: 2, role: 'GUEST_RELATIONS', actor: HOSTILE, history: [{ action: 'confirm', at: '2026-10-06T10:00:00Z', role: 'GUEST_RELATIONS', actor: HOSTILE, note: HOSTILE, version: 2 }] }, stands: true,
    contact: { firstName: HOSTILE, lastName: 'Example', email: HOSTILE, phone: HOSTILE, birthdate: '1990-01-01', nationality: HOSTILE, address1: HOSTILE },
    draft: { ok: true, updatedAt: '2026-10-07T00:00:00Z', guest: { allergy: { answer: 'yes', details: HOSTILE }, profile: { coffeetea: HOSTILE } } },
    rooms: { wedstay: { stage: 'wedstay', name: HOSTILE, room: HOSTILE } }, seats: { ceremony: { G901: 'C-L-01-01' }, dinner: {} }, unsent: true,
    docs: [{ guestId: 'G901', kind: 'flight', receivedAt: '2026-10-02T00:00:00Z' }], acks: { note: { acknowledged: true, at: '2026-09-27T10:00:00Z' }, rules: null } });
  P.readable = { record: true, confirmation: true, contact: true };
  return P;
}
function load(answers, hash, modules) {
  const calls = [];
  const w = page({ path: 'admin/billing', modules: modules || ['assets/admin-assign.js', 'assets/admin-profile.js', 'assets/admin-billing.js'], auth: SUTHEP,
    fetch: (url, init = {}) => {
      calls.push({ url, method: init.method || 'GET' });
      const k = url.replace(/^\/api\/billing\//, '').split('?')[0], a = answers[k];
      const out = typeof a === 'function' ? a(url, init) : a;
      return Promise.resolve(out && out.status ? out : res(200, out || { ok: true }));
    } });
  w.location.hash = hash || '#guests';
  const root = fakeRoot();
  w.SIYL_ADMIN_BILLING.boot(root);
  return { w, root, calls };
}

test('VIEW · every value a guest typed is text, never mark-up; every section and its source is on the page; the code is never shown', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/profile': { ok: true, holderId: 'INV-G901', profile: hostileProfile() } }, '#profile=INV-G901');
  await tick();
  const h = root.innerHTML;
  assert.doesNotMatch(h, /<img src=x|<script>alert|onerror=alert\(1\)>/, 'no guest value runs as mark-up');
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;&quot;&gt;&lt;script&gt;/, 'the hostile answer is shown as text');
  for (const k of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) assert.match(h, new RegExp('data-ab-pf="' + k + '"'), 'section ' + k);
  assert.match(h, /Ada Example/, 'the register name heads the profile');
  assert.match(h, /Changes not sent yet/); assert.match(h, /Draft · not sent/); assert.match(h, /as sent · version 2/);
  assert.match(h, /the invitation code is never shown/);
  assert.match(h, /Flight document/); assert.match(h, /Not received/, 'the passport is not received');
  assert.match(h, /not recorded yet · HS-035 P3 · E36/i); assert.match(h, /Not recorded yet · HS-035 P3 · E28/);
  assert.match(h, /href="\/admin\/billing#holder=INV-G901" data-ab-pf-finance/);
  assert.match(h, /<span class="t-l1">Sangkhathan<\/span> <span>Yes<\/span>/, 'the offering reads Yes');
  assert.doesNotMatch(h, /USD|145/, 'no amount in the profile');
});

test('VIEW · the Profile button in the guest list opens the profile only — never the financial view (its row click)', async () => {
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': { ok: true, rows: [] }, 'admin/profile': { ok: true, holderId: 'INV-G901', profile: hostileProfile() } }, '#guests');
  await tick();
  const btn = root.querySelectorAll('[data-ab-profile]').find((e) => e.getAttribute('data-ab-profile') === 'INV-G901');
  assert.ok(btn, 'a Profile button on the row');
  const row = root.querySelectorAll('[data-ab-open]').find((e) => e.getAttribute('data-ab-open') === 'INV-G901');
  assert.ok(row && typeof row.onclick === 'function', 'the row opens the financial view on its own click');
  const before = calls.length;
  /* the browser's dispatch: the button first, then — unless it stopped the event — the row it sits in */
  const ev = { stopped: false, stopPropagation() { this.stopped = true; }, preventDefault() {} };
  btn.onclick(ev); if (!ev.stopped) row.onclick(ev);
  await tick();
  assert.ok(ev.stopped, 'the click stops at the button');
  const after = calls.slice(before).map((c) => c.url);
  assert.ok(after.some((u) => /admin\/profile\?holder=INV-G901/.test(u)), 'the profile is read');
  assert.ok(!after.some((u) => /admin\/holder/.test(u)), 'the financial view is not read');
});

test('VIEW · the resource-limit refusal is said and never retried by itself', async () => {
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/profile': res(503, { ok: false }) }, '#profile=INV-G901');
  await tick(30);
  assert.match(root.innerHTML, /Cloudflare resource limit/);
  assert.equal(calls.filter((c) => /admin\/profile/.test(c.url)).length, 1, 'one request, no automatic retry');
  assert.match(root.innerHTML, /data-ab-profile-reload/, 'the Owner may try again');
});

test('VIEW · without the profile script the console stands and says so', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/profile': { ok: true, holderId: 'INV-G901', profile: hostileProfile() } }, '#profile=INV-G901', ['assets/admin-assign.js', 'assets/admin-billing.js']);
  await tick();
  assert.match(root.innerHTML, /The guest profile view is not loaded on this page/);
});

test('STATIC · the page loads the profile script before the console; ES5, no browser dialog, no browser storage', () => {
  const html = src('src/admin/billing.html');
  const at = (f) => html.indexOf('assets/' + f + '?v=');
  assert.ok(at('admin-profile.js') > 0 && at('admin-profile.js') < at('admin-billing.js'), 'admin-profile.js before admin-billing.js');
  const js = src('assets/admin-profile.js');
  assert.doesNotMatch(js, /window\.(confirm|alert|prompt)\(|localStorage|sessionStorage|indexedDB|fetch\(/);
  assert.doesNotMatch(js, /=>|`|\bconst\b|\blet\b/, 'ES5, like the console');
  assert.doesNotMatch(src('src/admin-profile.js'), /\.(put|delete)\(/, 'the model writes nothing');
});

test.after(() => W.done());
