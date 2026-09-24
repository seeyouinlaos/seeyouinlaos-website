/* THE DOCUMENT RETENTION POLICY (Owner, 21 Sep 2026 · FINAL): the journey ends on 8 March 2027; passport and travel documents
   are kept thirty days after it and purged from 7 April 2027 by the one Worker's scheduled trigger. The purge reaches the
   doc/ objects of DOCS and nothing else — never a profile photo, a contact, an invitation, an identity, a booking, a room,
   a seat, a draft, a registration record. Deterministic (one UTC date), auditable (one count record per run that deleted),
   idempotent (a second run finds nothing). Before the date: nothing is deleted, ever. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { ROOT, src } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name, metadata: m.get(name).meta || null })), list_complete: true }), delete: async (k) => { m.delete(k); } }; }
function r2() { const m = new Map(); const s = { m, deletes: [], put: async (k, bytes, o) => { m.set(k, { key: k, bytes: new Uint8Array(bytes), size: bytes.byteLength, ...o }); }, get: async (k) => (m.has(k) ? { ...m.get(k), body: new Blob([m.get(k).bytes]).stream() } : null), delete: async (k) => { s.deletes.push(k); m.delete(k); }, list: async ({ prefix }) => ({ objects: [...m.values()].filter((o) => o.key.startsWith(prefix || '')).map((o) => ({ key: o.key, size: o.size, uploaded: new Date('2026-09-21T00:00:00Z'), httpMetadata: o.httpMetadata, customMetadata: o.customMetadata })), truncated: false }) }; return s; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('ret-peggy-doc'), steffie = await bearerOf('ret-steffie-doc');
  const entries = {}; entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' }; entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), DOCS: r2(), GR_TOKEN: 'gr-secret' };
  const logs = []; const realLog = console.log, realErr = console.error; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  return { w, env, peggy, steffie, logs, done: () => { console.log = realLog; console.error = realErr; } };
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, ...Array(200).fill(7), 0xff, 0xd9]);
const send = (h, bearer, inv, gid, kind) => h.w.fetch(new Request(ORIGIN + '/api/document', { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-invitation': inv, 'x-guest': gid, 'x-kind': kind || 'passport', 'x-filename': 'p.jpg', 'x-siyl-auth': bearer }, body: JPEG }), h.env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
const gr = (h, p) => h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-gr-token': 'gr-secret' } }), h.env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
const tick = (h, iso) => { let waited = null; const ctx = { waitUntil: (p) => { waited = p; } }; return h.w.scheduled({ scheduledTime: new Date(iso).getTime(), cron: '0 3 * * *' }, h.env, ctx).then((r) => ({ r, waited: !!waited })); };
const census = (h) => ({ kv: [...h.env.REG_KV.m.keys()].filter((k) => !k.startsWith('docpurge:')).sort().join(), docs: [...h.env.DOCS.m.keys()].sort().join() });

test('THE POLICY is one frozen constant in the Worker, documented in the frozen manifest and pinned by the guard: journey end 8 March 2027 · 30 days · purge from 7 April 2027 · the doc/ prefix; the one cron trigger on the one Worker; the guest is told on About You', () => {
  const worker = src('src/worker.js');
  assert.match(worker, /const DOC_RETENTION = Object\.freeze\(\{ journeyEnd: '2027-03-08', days: 30, purgeFrom: '2027-04-07', prefix: 'doc\/' \}\);/);
  assert.equal(Math.round((Date.UTC(2027, 3, 7) - Date.UTC(2027, 2, 8)) / 86400000), 30, '7 April 2027 is thirty days after 8 March 2027');
  const M = JSON.parse(readFileSync(join(ROOT, 'infra/PRODUCTION.json'), 'utf8'));
  assert.deepEqual([M.r2[0].retention.journeyEnd, M.r2[0].retention.days, M.r2[0].retention.purgeFrom], ['2027-03-08', 30, '2027-04-07']); assert.deepEqual(M.crons, ['0 3 * * *']);
  const wj = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(wj, /"triggers": \{ "crons": \["0 3 \* \* \*"\] \}/, 'the daily trigger on the existing Worker'); assert.equal((wj.match(/"crons"/g) || []).length, 1);
  assert.equal((wj.match(/"name": "seeyouinlaos-website"/g) || []).length, 1, 'still the one Worker'); assert.doesNotMatch(wj, /"services"|"tail_consumers"|"queues"/, 'no second service beside it');
  assert.match(src('src/infra-guard.cjs'), /scheduled triggers changed/); assert.match(src('src/infra-guard.cjs'), /DOC_RETENTION does not match the documented policy/);
  /* TO-02327 (Window 007): the approved sentence carries the same date and the same thirty days */
  assert.match(src('about-you.html'), /they are kept until 7 April 2027, thirty days after the journey ends, then deleted\./);
  /* the purge's reach, statically: the doc/ prefix of DOCS, an audit record, and nothing else */
  const fn = worker.slice(worker.indexOf('async function purgeDocuments'), worker.indexOf('async function handleGrRetention'));
  assert.match(fn, /env\.DOCS\.list\(\{ prefix: DOC_RETENTION\.prefix/); assert.match(fn, /if \(!obj\.key\.startsWith\(DOC_RETENTION\.prefix\)\) continue;/);
  assert.doesNotMatch(fn, /REG_KV\.delete|avatar|contact:|draft:|reg:|ROOMS|SEATING|DRAFTS|INVENTORY/, 'never a photo, a contact, a draft, a registration, a room, a seat');
  assert.match(fn, /REG_KV\.put\('docpurge:' \+ when/, 'the one write: the audit record'); assert.doesNotMatch(fn, /obj\.key\b[^\n]*JSON\.stringify|customMetadata|filename/, 'the audit carries counts, never a key, a name or a byte');
});

test('BEFORE 7 APRIL 2027 nothing is deleted — not by the clock, not by the report: three documents of two guests, a portrait, a contact and a draft stand through a run on the day before (6 April 2027 23:59 UTC), through the deploy day and through the journey; the report says what stands and that it is not due', async () => {
  const h = await harness();
  try {
    assert.equal((await send(h, h.peggy, 'INV-G001', 'G001')).status, 201); assert.equal((await send(h, h.peggy, 'INV-G001', 'G001', 'flight')).status, 201); assert.equal((await send(h, h.steffie, 'INV-G002', 'G002')).status, 201);
    h.env.REG_KV.m.set('avatar:INV-G001', { v: new Uint8Array([1, 2, 3]).buffer, meta: { type: 'image/jpeg', at: 'x' } }); h.env.REG_KV.m.set('contact:INV-G001', { v: '{"email":"p@example.org"}' }); h.env.REG_KV.m.set('draft:INV-G001', { v: '{"keys":{}}' }); h.env.REG_KV.m.set('reg:INV-G001', { v: '{"version":1}' });
    const before = census(h); assert.equal(h.env.DOCS.m.size, 3);
    for (const iso of ['2026-09-22T03:00:00Z', '2027-03-08T03:00:00Z', '2027-04-06T03:00:00Z', '2027-04-06T23:59:59Z']) {
      const { r, waited } = await tick(h, iso); assert.equal(waited, true, 'the run is handed to waitUntil'); assert.equal(r.ok, true); assert.equal(r.due, false, iso + ' is not due'); assert.equal(r.deleted, 0); assert.equal(r.objects, 3, 'it sees them, it leaves them');
      assert.deepEqual(census(h), before, 'nothing changed on ' + iso); assert.equal(h.env.DOCS.deletes.length, 0, 'no delete was even attempted');
      assert.equal([...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('docpurge:')).length, 0, 'no audit record for a run that deleted nothing');
    }
    const rep = await gr(h, '/api/gr/documents/retention'); assert.equal(rep.status, 200); assert.equal(rep.d.dryRun, true); assert.equal(rep.d.objects, 3); assert.equal(rep.d.invitations, 2); assert.equal(rep.d.deleted, 0); assert.deepEqual(rep.d.policy, { journeyEnd: '2027-03-08', days: 30, purgeFrom: '2027-04-07', prefix: 'doc/' }); assert.match(rep.d.note, /before 7 April 2027 nothing is deleted/);
    assert.deepEqual(census(h), before, 'the report deletes nothing'); assert.equal(h.env.DOCS.deletes.length, 0);
    assert.equal((await h.w.fetch(new Request(ORIGIN + '/api/gr/documents/retention', { headers: { 'x-siyl-auth': h.peggy } }), h.env)).status, 401, 'a guest cannot read the report');
    assert.equal((await h.w.fetch(new Request(ORIGIN + '/api/gr/documents/retention', { method: 'POST', headers: { 'x-gr-token': 'gr-secret' } }), h.env)).status, 405, 'the report is read only — no route deletes on request');
    assert.ok(!h.logs.some((l) => /JFIF|gr-secret/.test(l)));
  } finally { h.done(); }
});

test('FROM 7 APRIL 2027 the clock purges the doc/ objects only — every document of every guest, the audit record of counts written — and nothing else moves: the portrait, the contact, the draft, the registration, an object outside doc/; a second run is a no-op (idempotent); a document sent after the date goes on the next run', async () => {
  const h = await harness();
  try {
    assert.equal((await send(h, h.peggy, 'INV-G001', 'G001')).status, 201); assert.equal((await send(h, h.peggy, 'INV-G001', 'G001', 'flight')).status, 201); assert.equal((await send(h, h.steffie, 'INV-G002', 'G002')).status, 201);
    h.env.DOCS.m.set('other/keep-me', { key: 'other/keep-me', bytes: new Uint8Array([1]), size: 1 });   /* not a document: outside the policy's reach */
    h.env.REG_KV.m.set('avatar:INV-G001', { v: new Uint8Array([1, 2, 3]).buffer, meta: { type: 'image/jpeg', at: 'x' } }); h.env.REG_KV.m.set('avatar:INV-G002', { v: new Uint8Array([4]).buffer, meta: { type: 'image/jpeg', at: 'y' } }); h.env.REG_KV.m.set('contact:INV-G001', { v: '{"email":"p@example.org"}' }); h.env.REG_KV.m.set('draft:INV-G001', { v: '{"keys":{}}' }); h.env.REG_KV.m.set('reg:INV-G001', { v: '{"version":1}' }); h.env.REG_KV.m.set('reg:INV-G001:prev:2027-01-01T00:00:00.000Z', { v: '{"version":0}' });
    const kvBefore = census(h).kv;
    const { r } = await tick(h, '2027-04-07T03:00:00Z');
    assert.equal(r.due, true); assert.equal(r.objects, 3); assert.equal(r.deleted, 3); assert.equal(r.invitations, 2);
    assert.deepEqual(h.env.DOCS.deletes.sort(), h.env.DOCS.deletes.filter((k) => k.startsWith('doc/')).sort(), 'every delete is a doc/ key'); assert.equal(h.env.DOCS.deletes.length, 3);
    assert.deepEqual([...h.env.DOCS.m.keys()], ['other/keep-me'], 'the doc/ objects are gone; the object outside the prefix stands');
    assert.equal(census(h).kv, kvBefore, 'the portraits, the contact, the draft, the registration and its history stand — byte for byte the same keys');
    assert.ok(Buffer.compare(Buffer.from(h.env.REG_KV.m.get('avatar:INV-G001').v), Buffer.from([1, 2, 3])) === 0, 'the portrait\'s bytes');
    const audits = [...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('docpurge:')); assert.equal(audits.length, 1); const a = JSON.parse(h.env.REG_KV.m.get(audits[0]).v);
    assert.deepEqual(a, { at: '2027-04-07T03:00:00.000Z', actor: 'cron', purgeFrom: '2027-04-07', deleted: 3, invitations: 2 }, 'the audit: counts, the date, the actor — no key, no name, no byte');
    /* idempotent */
    const again = await tick(h, '2027-04-08T03:00:00Z'); assert.equal(again.r.deleted, 0); assert.equal(again.r.objects, 0); assert.equal(h.env.DOCS.deletes.length, 3, 'nothing more to delete'); assert.equal([...h.env.REG_KV.m.keys()].filter((k) => k.startsWith('docpurge:')).length, 1, 'no audit for a run that deleted nothing');
    /* the listing for Guest Relations is now empty; the report shows the audit */
    assert.equal((await gr(h, '/api/gr/documents?invitation=INV-G001')).d.count, 0);
    const rep = await gr(h, '/api/gr/documents/retention'); assert.equal(typeof rep.d.due, 'boolean', 'the report reads the real clock'); assert.equal(rep.d.objects, 0); assert.equal(rep.d.audits.length, 1); assert.equal(rep.d.audits[0].deleted, 3);
    /* a late document goes on the next run — never at upload time, never by a guest's visit */
    assert.equal((await send(h, h.peggy, 'INV-G001', 'G001')).status, 201); assert.equal(h.env.DOCS.m.size, 2);
    const late = await tick(h, '2027-04-09T03:00:00Z'); assert.equal(late.r.deleted, 1); assert.deepEqual([...h.env.DOCS.m.keys()], ['other/keep-me']);
    assert.equal(census(h).kv, kvBefore, 'still nothing else moved');
    assert.ok(!h.logs.some((l) => /JFIF|gr-secret|doc\/INV/.test(l)), 'no body, no token, no key in a log');
  } finally { h.done(); }
});

test('WITHOUT THE STORE the clock is a no-op that says so; a store that fails mid-list deletes nothing and reports it', async () => {
  const h = await harness();
  try {
    const noStore = { ...h.env }; delete noStore.DOCS;
    const r = await h.w.scheduled({ scheduledTime: Date.UTC(2027, 3, 7, 3) }, noStore, { waitUntil() {} }); assert.equal(r.ok, false); assert.equal(r.deleted, 0);
    assert.equal((await send(h, h.peggy, 'INV-G001', 'G001')).status, 201);
    h.env.DOCS.list = async () => { throw new Error('r2 down'); };
    const d = await h.w.scheduled({ scheduledTime: Date.UTC(2027, 3, 7, 3) }, h.env, { waitUntil() {} }); assert.equal(d.ok, false); assert.equal(d.deleted, 0); assert.equal(h.env.DOCS.m.size, 1); assert.equal(h.env.DOCS.deletes.length, 0);
    assert.equal((await gr(h, '/api/gr/documents/retention')).status, 503);
  } finally { h.done(); }
});
