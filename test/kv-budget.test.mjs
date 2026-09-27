/* THE KV WRITE BUDGET (hotfix, 27 Sep 2026). The account's KV accepts a limited number of writes per UTC day; on 27 Sep the
   draft autosave mirror and unchanged contact saves spent it before 08:00 UTC, and from then on every KV write was refused —
   a guest's portrait ("We cannot save photos just now"), the contact details, a sent journey — until midnight. The mirror is
   metered (the first draft, Save and Send at once; an autosave at most once per ten minutes, the actor's alarm writes the last
   revision), and a contact save that changes nothing writes nothing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { Drafts } from '../src/drafts.js';
import { doState } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
/* a KV that counts its writes and can refuse them, as the platform does once the day's budget is spent */
function kv() { const m = new Map(); const o = { m, writes: 0, refuse: false, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, x) => { if (o.refuse) throw new Error('KV put() limit exceeded for the day.'); o.writes++; m.set(k, { v, meta: x && x.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) }; return o; }
/* the platform's actor: storage with an alarm */
function alarmState() { const s = doState(); let alarm = null; s.storage.getAlarm = async () => alarm; s.storage.setAlarm = async (t) => { alarm = t; }; s.storage.deleteAlarm = async () => { alarm = null; }; s.alarmAt = () => alarm; return s; }
const INV = 'INV-G777';
const op = (a, name, body) => a.fetch(new Request('https://drafts/' + name, { method: 'POST', body: JSON.stringify({ invitationId: INV, guestId: 'G777', ...body }) })).then(async (r) => ({ status: r.status, d: await r.json() }));
const mirrored = (k) => { const x = k.m.get('draft:' + INV); return x ? JSON.parse(x.v).updatedAt : null; };

test('THE MIRROR IS METERED · the first draft at once, autosaves within ten minutes not at all, the alarm writes the last revision, Save and Send at once', async () => {
  const k = kv(), s = alarmState(), a = new Drafts(s, { REG_KV: k });
  const one = await op(a, 'put', { keys: { 'siyl.bag': '[1]' }, reason: 'auto' });
  assert.equal(one.status, 200); assert.equal(k.writes, 1, 'the first draft is mirrored at once — Guest Relations lists the guest'); assert.equal(mirrored(k), one.d.draft.updatedAt);
  let base = one.d.draft.updatedAt;
  for (let i = 2; i <= 6; i++) { const r = await op(a, 'put', { keys: { 'siyl.bag': '[' + i + ']' }, reason: i % 2 ? 'continue' : 'auto', baseUpdatedAt: base }); assert.equal(r.status, 200, 'the draft itself is always saved'); base = r.d.draft.updatedAt; }
  assert.equal(k.writes, 1, 'five autosaves inside the window: no KV write');
  const m = await s.storage.get('mirror'); assert.ok(s.alarmAt() && Math.abs(s.alarmAt() - (m.at + 10 * 60 * 1000)) < 5, 'the alarm closes the window ten minutes after the last mirror');
  const got = await op(a, 'get', {}); assert.equal(got.d.draft.keys['siyl.bag'], '[6]', 'the guest reads the latest revision from the actor');
  await a.alarm();
  assert.equal(k.writes, 2); assert.equal(mirrored(k), base, 'the alarm mirrors the last revision');
  await a.alarm(); assert.equal(k.writes, 2, 'an alarm with nothing new writes nothing');
  const saved = await op(a, 'put', { keys: { 'siyl.bag': '[7]' }, reason: 'save', baseUpdatedAt: base });
  assert.equal(k.writes, 3); assert.equal(mirrored(k), saved.d.draft.updatedAt, 'Save my progress is mirrored at once');
  const sent = await op(a, 'put', { keys: { 'siyl.bag': '[8]' }, reason: 'send', baseUpdatedAt: saved.d.draft.updatedAt });
  assert.equal(k.writes, 4); assert.equal(mirrored(k), sent.d.draft.updatedAt, 'Send is mirrored at once');
});

test('A REFUSED KV WRITE (the day\'s budget spent) never refuses the guest\'s save — the alarm writes the mirror once KV accepts again; nothing comes back after a reset', async () => {
  const k = kv(), s = alarmState(), a = new Drafts(s, { REG_KV: k });
  k.refuse = true;
  const one = await op(a, 'put', { keys: { 'siyl.bag': '[1]' }, reason: 'auto' });
  assert.equal(one.status, 200, 'the draft is the actor\'s: saved'); assert.equal(mirrored(k), null);
  assert.ok(s.alarmAt() > Date.now() + 50 * 60 * 1000, 'tried again in an hour, not in a loop');
  await a.alarm(); assert.equal(mirrored(k), null); assert.ok(s.alarmAt() > Date.now() + 50 * 60 * 1000, 'still refused: the next hour');
  k.refuse = false; await a.alarm();
  assert.equal(mirrored(k), one.d.draft.updatedAt, 'KV accepts again: the mirror catches up');
  /* the clean reset: the actor forgets the draft; a pending alarm then writes nothing */
  const r2 = await op(a, 'put', { keys: { 'siyl.bag': '[2]' }, reason: 'auto', baseUpdatedAt: one.d.draft.updatedAt }); assert.equal(r2.status, 200);
  const before = k.writes; k.m.delete('draft:' + INV);
  assert.equal((await op(a, 'reset', { dryRun: false, epoch: '2026-09-27T10:00:00.000Z' })).status, 200);
  await a.alarm(); assert.equal(k.writes, before); assert.equal(mirrored(k), null, 'the reset stays a reset');
});

test('AN ACTOR WITHOUT AN ALARM mirrors every revision, as before', async () => {
  const k = kv(), a = new Drafts(doState(), { REG_KV: k });
  let base = null;
  for (let i = 1; i <= 3; i++) { const r = await op(a, 'put', { keys: { 'siyl.bag': '[' + i + ']' }, reason: 'auto', ...(base ? { baseUpdatedAt: base } : {}) }); base = r.d.draft.updatedAt; }
  assert.equal(k.writes, 3); assert.equal(mirrored(k), base);
});

test('A CONTACT SAVE THAT CHANGES NOTHING WRITES NOTHING — and is answered even while KV refuses writes; a change is written', async () => {
  const w = (await import('../src/worker.js')).default;
  const bearer = await bearerOf('demo-kv-budget-g777'), entries = {}; entries[await authIdOf(bearer)] = { i: INV, g: 'G777', p: 'INV-777' };
  const index = JSON.stringify({ v: 2, entries });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }, REG_KV: kv() };
  const put = (body) => w.fetch(new Request(ORIGIN + '/api/contact', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-siyl-auth': bearer }, body: JSON.stringify({ invitationId: INV, ...body }) }), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  const details = { email: 'kv.budget@example.org', phone: '+66 80 000 0000', nationality: 'Thai', city: 'Vientiane' };
  const first = await put(details); assert.equal(first.status, 200); assert.equal(env.REG_KV.writes, 1);
  env.REG_KV.refuse = true;
  const same = await put(details);
  assert.equal(same.status, 200, 'unchanged: answered from the stored contact'); assert.equal(env.REG_KV.writes, 1, 'nothing written');
  assert.equal(same.d.contact.at, first.d.contact.at); assert.equal(same.d.contact.email, 'kv.budget@example.org');
  const changed = await put({ ...details, phone: '+66 80 000 0001' });
  assert.equal(changed.status, 503, 'a real change while KV refuses is reported honestly — nothing pretends to be saved'); assert.equal(changed.d.error, 'contact could not be stored');
  env.REG_KV.refuse = false;
  const ok = await put({ ...details, phone: '+66 80 000 0001' }); assert.equal(ok.status, 200); assert.equal(env.REG_KV.writes, 2); assert.equal(ok.d.contact.phone, '+66 80 000 0001');
});

test('THE PORTRAIT · a KV that refuses the write is answered 503 "photo could not be stored" and nothing is stored — the refusal the guest saw on 27 Sep', async () => {
  const w = (await import('../src/worker.js')).default;
  const bearer = await bearerOf('demo-kv-budget-photo'), entries = {}; entries[await authIdOf(bearer)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' };
  const index = JSON.stringify({ v: 2, entries });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }, REG_KV: kv() };
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const up = () => w.fetch(new Request(ORIGIN + '/api/profile/photo', { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-siyl-auth': bearer }, body: jpeg }), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  env.REG_KV.refuse = true;
  const r = await up(); assert.equal(r.status, 503); assert.equal(r.d.error, 'photo could not be stored'); assert.equal(env.REG_KV.m.size, 0);
  env.REG_KV.refuse = false;
  const ok = await up(); assert.equal(ok.status, 200); assert.equal(ok.d.type, 'image/jpeg'); assert.equal(ok.d.bytes, jpeg.byteLength);
});
