/* A SYNTHETIC REGISTER AT LEAST AS LARGE AS THE LIVE ONE (28 Sep 2026 · the Guest Relations overview hotfix): 120 invitations —
   the couple, guests who only opened their invitation, guests with a draft, guests who sent their trip (current and legacy
   fingerprints), a trip changed after it was sent, room holds, a waiting-list place, seats — every operation on the store and the
   engines counted. Synthetic identities only (INV-S###, CONS###); nothing here is a real guest. */
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { doState } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';
import { complete } from './complete.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
export const N = 120;
const pad = (n) => String(n).padStart(3, '0');
const req = (path, headers = {}, body, method) => new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };

/* the counted store: reads, lists, writes */
function countedKv(c) {
  const m = new Map();
  return { m,
    get: async (k) => { c.kvGet++; return m.has(k) ? m.get(k).v : null; },
    getWithMetadata: async (k) => { c.kvGet++; return m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }; },
    put: async (k, v, o) => { c.kvPut++; m.set(k, { v, meta: o && o.metadata }); },
    delete: async (k) => { c.kvDelete++; m.delete(k); },
    list: async ({ prefix }) => { c.kvList++; return { keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name, metadata: m.get(name).meta || null })), list_complete: true }; } };
}

export async function world(workerPath) {
  const w = (await import(workerPath || process.env.GR_SCALE_WORKER || '../src/worker.js')).default;   /* GR_SCALE_WORKER: run the same test against another build (the former route, to prove the test catches it) */
  const c = { kvGet: 0, kvPut: 0, kvDelete: 0, kvList: 0, rooms: 0, seating: 0, drafts: 0, named: 0 };
  const entries = {}, people = [];
  for (let n = 1; n <= N; n++) {
    const bearer = await bearerOf('scale-guest-' + n);
    const hosts = n <= 2;
    const party = 'INV-P' + pad(Math.ceil(n / 2));
    entries[await authIdOf(bearer)] = { i: 'INV-S' + pad(n), g: 'S' + pad(n), p: party, c: 'CONS' + pad(n), k: n % 2 ? 'COUPLS' + pad(n) : 'SIGL', ...(hosts ? { h: 1, r: n === 1 ? 'B' : 'G' } : {}) };
    people.push({ n, bearer, inv: 'INV-S' + pad(n), gid: 'S' + pad(n) });
  }
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState());
  const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) },
    REG_KV: countedKv(c), GR_TOKEN: 'gr-secret', MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x' };
  const counted = (kind, obj) => ({ fetch: (r) => { c[kind]++; if (r.headers.get('x-siyl-identity')) { try { const id = JSON.parse(r.headers.get('x-siyl-identity')); if (id && id.firstName) c.named++; } catch (e) { /* not an identity */ } } return obj.fetch(r); } });
  env.ROOMS = { idFromName: () => 'rooms', get: () => counted('rooms', rooms) };
  env.SEATING = { idFromName: () => 'seating', get: () => counted('seating', seating) };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = counted('drafts', a); } return actors[n]; } };
  const call = (path, bearer, body, method) => w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  const gr = (path, body, method) => w.fetch(req(path, { 'x-gr-token': 'gr-secret' }, body, method), env);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (/api\.brevo\.com/.test(String(url)) ? new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }) : realFetch(url, init));

  /* the configuration Guest Relations sets once */
  await gr('/api/seating/config', { ...SEAT_FIXTURE, actor: 'test' }); await gr('/api/seating/state', { open: true, actor: 'test' });
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'dinner').filter((s) => !s.family).map((s) => s.seatId);
  const contact = (p) => ({ invitationId: p.inv, email: 'scale' + p.n + '@example.org', phone: '+66 81 000 ' + pad(p.n), firstName: 'Scale' + p.n, lastName: 'Example', birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' });
  const guest = (p, extra) => JSON.stringify({ contact: { email: 'scale' + p.n + '@example.org', phone: '+66 81 000 ' + pad(p.n) }, guests: { [p.gid]: { submitted: {}, profile: { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Amélie' } } }, ...(extra || {}) });
  const bag = (n) => [{ id: 'train', price: 100, qty: 1 }, { id: 'sangkhathan', price: 15, qty: 1 }, ...(n % 3 ? [{ id: 'wedstay', name: 'Souphattra Heritage', meta: '27 February – 1 March 2027 · The Heritage', price: 145, stay: 'souphattra', room: 'heritage', rate: 145, nights: 2, pay: 1, qty: 1 }] : [])];
  const putDraft = async (p, keys) => { const cur = (await call('/api/draft', p.bearer)).d; return call('/api/draft', p.bearer, { invitationId: p.inv, keys, baseUpdatedAt: cur && cur.draft ? cur.draft.updatedAt : null }, 'PUT'); };
  const state = { opened: [], draft: [], sent: [], changed: [], legacy: [], held: [], waiting: [], seated: [] };
  let epoch = null; try { epoch = (await call('/api/contact', people[0].bearer)).d.resetAt || null; } catch (e) { epoch = null; }
  for (const p of people) {
    const kind = p.n <= 2 ? 'draft' : p.n % 5 === 0 ? 'opened' : p.n % 4 === 0 ? 'sent' : 'draft';
    if (kind === 'opened') { state.opened.push(p.inv); continue; }
    await call('/api/contact', p.bearer, { ...contact(p), seenReset: epoch }, 'PUT');
    const note = p.n % 2 ? { note: { acknowledged: true, at: '2026-09-27T10:00:00.000Z', textVersion: 'v1' } } : {};
    const rules = p.n % 3 === 0 ? { rules: { acknowledged: true, at: '2026-09-27T11:00:00.000Z', textVersion: 'r1' } } : {};
    await putDraft(p, { 'siyl.guest': guest(p, { ...note, ...rules }), 'siyl.bag': JSON.stringify(bag(p.n)) });
    if (kind !== 'sent' && p.n % 7 === 0 && state.held.length < 8) { const r = await call('/api/rooms/join', p.bearer, { invitationId: p.inv, guestId: p.gid, key: 'wedstay/heritage-executive', label: String.fromCharCode(65 + state.held.length % 4), name: 'Scale' + p.n }); if (r.status === 200) state.held.push(p.gid); }
    if (kind !== 'sent' && p.n % 11 === 0 && state.seated.length < 5) { const r = await call('/api/seating/select', p.bearer, { invitationId: p.inv, guestId: p.gid, event: 'dinner', seatId: free[state.seated.length], name: 'Scale' + p.n }); if (r.d && r.d.ok) state.seated.push(p.inv); }
    if (kind === 'sent') {
      const reg = complete({ channel: 'journey-shop', guestId: p.gid, partyId: 'INV-P' + pad(Math.ceil(p.n / 2)), selections: bag(p.n), totalUsd: bag(p.n).reduce((t, x) => t + x.price, 0), contact: { email: 'scale' + p.n + '@example.org', phone: '+66 81 000 ' + pad(p.n) },
        guestRecord: { guests: [{ guestId: p.gid, name: 'Scale' + p.n, source: { fullName: 'Scale Example', preferredName: 'Scale' + p.n } }], contact: { email: 'scale' + p.n + '@example.org', phone: '+66 81 000 ' + pad(p.n) } }, seats: null, rooms: null, registration_submitted_at: '2026-09-26T10:00:00.000Z' });
      const r = await w.fetch(req('/api/register', { 'x-siyl-auth': p.bearer }, { invitationId: p.inv, registration: reg, text: 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: ' + p.inv }), env);
      if (r.status !== 202) throw new Error('fixture send failed ' + p.inv + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
      state.sent.push(p.inv);
      if (p.n % 8 === 0) { await putDraft(p, { 'siyl.guest': guest(p, { ...note, ...rules }), 'siyl.bag': JSON.stringify(bag(p.n).concat([{ id: 'c86', price: 105, qty: 1 }])) }); state.changed.push(p.inv); }
      else if (p.n % 12 === 0) { const rec = JSON.parse(env.REG_KV.m.get('reg:' + p.inv).v); delete rec.selectionFingerprint; rec.fingerprintVersion = 2; env.REG_KV.m.set('reg:' + p.inv, { v: JSON.stringify(rec) }); state.legacy.push(p.inv); }
    } else state.draft.push(p.inv);
  }
  const reset = () => { for (const k of Object.keys(c)) c[k] = 0; };
  return { w, env, c, reset, people, state, entries, done: () => { globalThis.fetch = realFetch; },
    journeys: async () => { const r = await gr('/api/gr/journeys'); return { status: r.status, d: await r.json() }; },
    unauthorised: async (token) => (await w.fetch(req('/api/gr/journeys', token ? { 'x-gr-token': token } : {}), env)).status };
}
