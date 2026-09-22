/* ============================================================================
   THE PAGE SANDBOX — the browser modules loaded as a page loads them.

   assets/*.js are plain IIFEs on window. They run here in a vm context with a
   Map-backed localStorage, a minimal document and a fetch the test controls,
   so what is tested is the shipped code and not a re-implementation of it.

   ONE CODE = ONE GUEST (Owner, 14 Sep 2026): a session is one guest. The
   fixtures below are fictional guest sessions in exactly the shape
   assets/invite.mjs stores after a real code — never production data.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const HEX = (s) => Array.from({ length: 64 }, (_, i) => 'abcdef0123456789'[(s.charCodeAt(i % s.length) + i) % 16]).join('');
export function session(o) {
  return {
    invitationId: 'INV-' + o.guestId, guestId: o.guestId, partyId: o.partyId, partyName: o.partyName,
    fullName: o.fullName, preferredName: o.preferredName,
    ...(o.hostRole ? { hostRole: o.hostRole } : {}),
    hosts: !!o.hosts,
    members: o.members,
    sangkhathan: o.sangkhathan || 'ELIGIBLE',
    bearer: HEX('bearer:' + o.guestId),
    at: '2026-09-14T00:00:00.000Z',
  };
}
const PS = [{ guestId: 'g-peggy', preferredName: 'Peggy' }, { guestId: 'g-steffie', preferredName: 'Steffie' }];
const HS = [{ guestId: 'g-haruthai', preferredName: 'Haruthai' }, { guestId: 'g-suthep', preferredName: 'Suthep' }];
export const PEGGY = session({ guestId: 'g-peggy', partyId: 'INV-DEMO-002', partyName: 'Peggy & Steffie', fullName: 'Peggy Demo', preferredName: 'Peggy', members: PS });
export const STEFFIE = session({ guestId: 'g-steffie', partyId: 'INV-DEMO-002', partyName: 'Peggy & Steffie', fullName: 'Steffie Demo', preferredName: 'Steffie', members: PS });
export const HARUTHAI = session({ guestId: 'g-haruthai', partyId: 'INV-DEMO-001', partyName: 'Haruthai & Suthep', fullName: 'Haruthai Demo', preferredName: 'Haruthai', members: HS, hosts: true, hostRole: 'BRIDE' });
export const SUTHEP = session({ guestId: 'g-suthep', partyId: 'INV-DEMO-001', partyName: 'Haruthai & Suthep', fullName: 'Suthep Demo', preferredName: 'Suthep', members: HS, hosts: true, hostRole: 'GROOM' });
export const LIN = session({ guestId: 'g-lin', partyId: 'INV-DEMO-003', partyName: 'Lin', fullName: 'Lin Demo', preferredName: 'Lin', members: [{ guestId: 'g-lin', preferredName: 'Lin' }] });

export const CORE = ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/questionnaire.js', 'assets/guest.js', 'assets/temple.js', 'assets/docs.js', 'assets/confirm.js', 'assets/seatlabels.js', 'assets/seating.js', 'assets/rooms.js', 'assets/stay.js', 'assets/transport-data.js', 'assets/stage-graph.js', 'assets/journey.js'];

export function page(opts = {}) {
  const store = new Map(), listeners = {};
  const sb = {
    console,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), _store: store },
    document: {
      readyState: 'complete',
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
      querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, setAttribute() {}, querySelector: () => null }),
      body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {} },
      head: { appendChild() {} },
    },
    location: { pathname: '/' + (opts.path || 'your-journey.html'), hostname: 'localhost', search: opts.search || '', hash: '' },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(),
    requestAnimationFrame: (fn) => fn(),
    fetch: opts.fetch || (() => Promise.reject(new Error('no network in tests'))),
  };
  sb.window = sb; sb.globalThis = sb;
  /* the invitation gate as the page sees it: an authenticated guest passes at once */
  sb.SIYL_INVITE = { require: (fn) => { const a = JSON.parse(sb.localStorage.getItem('siyl.auth') || 'null'); if (a && a.guestId && a.bearer) fn(a); else sb.__gateOpened = (sb.__gateOpened || 0) + 1; }, stale: () => false, leave: () => {}, open: () => {}, close: () => {}, bearer: () => { const a = JSON.parse(sb.localStorage.getItem('siyl.auth') || 'null'); return (a && a.bearer) || ''; } };
  vm.createContext(sb);
  if (opts.auth !== null) sb.localStorage.setItem('siyl.auth', JSON.stringify(opts.auth === undefined ? PEGGY : opts.auth));
  if (opts.seed) Object.entries(opts.seed).forEach(([k, v]) => sb.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
  /* THE QUESTIONNAIRE (22 Sep 2026): guest.js reads its schema from the generated copy — loaded first wherever guest.js is asked for */
  const mods = (opts.modules || CORE).slice(); if (mods.includes('assets/guest.js') && !mods.includes('assets/questionnaire.js')) mods.splice(mods.indexOf('assets/guest.js'), 0, 'assets/questionnaire.js');
  for (const f of mods) vm.runInContext(src(f), sb, { filename: f });
  sb.events = listeners;
  return sb;
}
export const json = (w, k) => JSON.parse(w.localStorage.getItem(k) || 'null');
export const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

/* ---- a fake room engine for the page: the engine's read view, as the
 * server would answer it for one identity, built from src/rooms.js ---- */
export async function roomsFetch(rooms, identity) {
  const { Rooms } = await import('../src/rooms.js');
  return async (url, init) => {
    const u = String(url);
    const op = (u.match(/\/api\/rooms\/?([a-z]*)/) || [])[1] || 'read';
    const headers = new Map(Object.entries((init && init.headers) || {}));
    const req = { url: 'https://x/api/rooms/' + (op === 'read' ? '' : op), method: (init && init.method) || 'GET',
      headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : headers.get(k) || null) },
      json: async () => JSON.parse(init && init.body || '{}') };
    const res = await rooms.fetch(req);
    const text = await res.text();
    return { ok: res.status < 400, status: res.status, json: async () => JSON.parse(text) };
  };
}
/* an in-memory Durable Object state */
export function doState() {
  const map = new Map();
  return {
    storage: {
      get: async (k) => map.get(k), put: async (k, v) => { map.set(k, JSON.parse(JSON.stringify(v))); }, delete: async (k) => map.delete(k),
      list: async ({ prefix }) => new Map([...map].filter(([k]) => k.startsWith(prefix))),
    },
    blockConcurrencyWhile: async (fn) => fn(),
    _map: map,
  };
}
