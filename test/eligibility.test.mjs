/* BRIDE & GROOM INVENTORY (Owner, 14 Sep 2026). A room "Reserved for bride &
   groom" is held for the hosts themselves and nobody else; a room reserved
   for family is out of reach of everyone on the website. The rule lives in two
   places that must agree: the calculation source in the browser (the guest's
   explicit `hosts` flag from the encrypted bundle) and the room engine on the
   server (the verified identity's `hosts`). No access code appears here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SEED, sellable, heldForParty, HOSTS_INVITATION, HELD_FOR_HOSTS } from '../src/inventory-seed.js';
import { Rooms, unitsOf, mayJoin } from '../src/rooms.js';
import { HARUTHAI, SUTHEP, PEGGY, LIN } from './sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* the browser calculation source with a given session */
function priceWith(auth) {
  const store = new Map(); if (auth) store.set('siyl.auth', JSON.stringify(auth));
  const sb = { window: {}, document: { addEventListener() {} }, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null) } };
  sb.window = sb; vm.createContext(sb);
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js']) vm.runInContext(src(f), sb, { filename: f });
  return { P: sb.window.SIYL_PRICE, ROOMS: sb.window.SIYL_ROOMS };
}
const HOSTS = HARUTHAI;
const NORMAL = PEGGY;
const FAMILY = { ...LIN, hosts: undefined };

/* every room the catalogue holds for the couple, and every one held for family */
function reservedRooms(ROOMS) {
  const out = { hosts: [], family: [] };
  for (const [stay, s] of Object.entries(ROOMS)) for (const r of s.rooms || []) if (r.reserved) out[/bride/i.test(r.reserved) ? 'hosts' : 'family'].push(stay + '/' + r.slug + ' · ' + r.name);
  return out;
}

test('the catalogue: exactly which rooms are held for the couple and which for family', () => {
  const { ROOMS } = priceWith(null);
  const rr = reservedRooms(ROOMS);
  assert.deepEqual(rr.hosts.sort(), ['kunming/solarium · Solarium Bath Suite', 'lijiang/view-suite-270 · 270° Snow Mountain View Suite', 'souphattra/souphattra-presidential · Souphattra Presidential'].sort());
  assert.deepEqual(rr.family, ['souphattra/grand-majestic · Grand Majestic Suite']);
  /* the ledger holds the same categories, per window (the Presidential in both Souphattra windows) */
  const held = Object.entries(SEED).filter(([, s]) => s.held > 0).map(([k, s]) => k + ' · ' + s.heldFor).sort();
  assert.deepEqual(held, ['kmg/solarium · Bride & Groom', 'ljg/view-suite-270 · Bride & Groom', 'prewed/grand-majestic · Family', 'prewed/souphattra-presidential · Bride & Groom', 'wedstay/grand-majestic · Family', 'wedstay/souphattra-presidential · Bride & Groom']);
  assert.equal(HELD_FOR_HOSTS, 'Bride & Groom'); assert.equal(HOSTS_INVITATION, 'INV-001');
});

test('HOST PARTY · every Bride & Groom room is selectable; family stays out of reach', () => {
  const { P, ROOMS } = priceWith(HOSTS);
  assert.equal(P.hosts(), true);
  for (const [, s] of Object.entries(ROOMS)) for (const r of s.rooms || []) {
    if (!r.reserved) { assert.equal(P.eligible(r), true, r.name); continue; }
    assert.equal(P.eligible(r), /bride/i.test(r.reserved), r.name + ' · ' + r.reserved);
  }
  assert.equal(P.reservedFor({ reserved: 'Reserved for bride & groom' }), 'hosts');
  assert.equal(P.reservedFor({ reserved: 'Reserved for family' }), 'family');
});

test('NORMAL PARTY · Bride & Groom and family rooms unavailable, ordinary rooms selectable', () => {
  const { P, ROOMS } = priceWith(NORMAL);
  assert.equal(P.hosts(), false);
  for (const [, s] of Object.entries(ROOMS)) for (const r of s.rooms || []) assert.equal(P.eligible(r), !r.reserved, r.name);
});

test('FAMILY PARTY (no hosts flag) · Bride & Groom inventory unavailable; the hosts flag is explicit, never inferred from names or ids', () => {
  const { P } = priceWith(FAMILY);
  assert.equal(P.hosts(), false);
  assert.equal(P.eligible({ reserved: 'Reserved for bride & groom' }), false);
  assert.equal(P.eligible({ reserved: 'Reserved for family' }), false);
  const named = priceWith({ invitationId: 'INV-001', partyName: 'Haruthai & Suthep', guests: [{ guestId: 'G048', fullName: 'Haruthai Amphai', preferredName: 'Haruthai' }] });
  assert.equal(named.P.hosts(), false, 'the couple’s names or reference alone do not make a hosts party in the browser — only the bundle’s explicit flag');
  const flagOnly = priceWith({ invitationId: 'INV-001', hosts: true, guests: [] });
  assert.equal(flagOnly.P.hosts(), false, 'a session without names is not open');
});

test('presets never hand out reserved inventory — even to the hosts (Full Experience / Cost Saving choose from open rooms)', () => {
  const { P } = priceWith(HOSTS);
  assert.notEqual(P.premium('prewed').slug, 'souphattra-presidential');
  assert.notEqual(P.premium('kmg').slug, 'solarium');
  assert.notEqual(P.premium('ljg').slug, 'view-suite-270');
});

/* ---- the ledger ---- */
test('LEDGER · the held units are sellable to the hosts’ invitation only; family never', () => {
  for (const key of ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'kmg/solarium', 'ljg/view-suite-270']) {
    assert.equal(sellable(key), 0, key + ' for nobody');
    assert.equal(sellable(key, 'INV-002'), 0, key + ' for a normal party');
    assert.equal(sellable(key, HOSTS_INVITATION), SEED[key].capacity, key + ' for the hosts');
    assert.equal(heldForParty(key, HOSTS_INVITATION), true); assert.equal(heldForParty(key, 'INV-002'), false);
  }
  for (const key of ['prewed/grand-majestic', 'wedstay/grand-majestic']) {
    assert.equal(sellable(key, HOSTS_INVITATION), 0, key + ' family: not even for the hosts');
    assert.equal(sellable(key, 'INV-003'), 0);
  }
  /* ordinary stock is unchanged for everyone */
  assert.equal(sellable('wedstay/heritage-grand-premier', 'INV-002'), sellable('wedstay/heritage-grand-premier', HOSTS_INVITATION));
});

/* the engine: a Durable Object stand-in, the identity as the Worker verified it */
function engine() {
  const m = new Map();
  const state = { storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))) }, blockConcurrencyWhile: (fn) => fn() };
  const R = new Rooms(state);
  const call = async (op, body, as) => { const r = await R.fetch(new Request('https://x/api/rooms/' + op, { method: body ? 'POST' : 'GET', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, ...(await r.json()) }; };
  return { call };
}
const asId = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });

test('ENGINE · Haruthai and Suthep take the Presidential (both windows), the Solarium and the 270° suite; Peggy is refused with the reason; family is refused for everyone', async () => {
  const E = engine();
  for (const key of ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'kmg/solarium', 'ljg/view-suite-270']) {
    const ok = await E.call('join', { invitationId: HARUTHAI.invitationId, guestId: HARUTHAI.guestId, key, label: 'A', name: 'Haruthai' }, asId(HARUTHAI));
    assert.equal(ok.status, 200, key);
    const two = await E.call('join', { invitationId: SUTHEP.invitationId, guestId: SUTHEP.guestId, key, label: 'A', name: 'Suthep' }, asId(SUTHEP));
    assert.equal(two.status, 200, key + ' · the second place is his');
    assert.equal(two.units[key][0].full, true, key + ' · ROOM A is full at 2/2');
    const no = await E.call('join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key, label: 'A', name: 'Peggy' }, asId(PEGGY));
    assert.equal(no.status, 403); assert.match(no.error, /reserved for Bride & Groom/);
  }
  for (const key of ['prewed/grand-majestic', 'wedstay/grand-majestic']) {
    const fam1 = await E.call('join', { invitationId: HARUTHAI.invitationId, guestId: HARUTHAI.guestId, key, label: 'A', name: 'Haruthai' }, asId(HARUTHAI));
    const fam2 = await E.call('join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key, label: 'A', name: 'Peggy' }, asId(PEGGY));
    assert.equal(fam1.status, 403); assert.equal(fam2.status, 403); assert.match(fam1.error, /Family/);
  }
  /* the read, as each guest sees it */
  const asHost = await E.call('read', null, asId(HARUTHAI)), asGuest = await E.call('read', null, asId(PEGGY)), plain = await E.call('read');
  assert.equal(asHost.units['kmg/solarium'][0].eligible, true); assert.equal(asGuest.units['kmg/solarium'][0].eligible, false); assert.equal(plain.units['kmg/solarium'][0].eligible, false);
  assert.equal(asGuest.summary['kmg/solarium'].free, 0); assert.equal(asGuest.summary['wedstay/heritage'].free, 10);
  /* no name decides anything: a guest named like a host is a guest */
  const pretender = await E.call('join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'kmg/solarium', label: 'A', name: 'Haruthai' }, asId(PEGGY));
  assert.equal(pretender.status, 403);
  assert.equal(mayJoin(unitsOf('kmg/solarium')[0], { hosts: true }).ok, true); assert.equal(mayJoin(unitsOf('kmg/solarium')[0], { hosts: false }).ok, false);
});

test('SURFACES · the room page and the journeys rows decide by eligibility, the label stays, the engine read carries the bearer', () => {
  const room = src('room.html'), journeys = src('journeys.html'), inv = src('assets/rooms.js');
  assert.match(room, /room\.reserved && !P\.eligible\(room\)/); assert.match(room, /held for you — yours to choose/);
  assert.match(room, /r\.reserved && !P\.eligible\(r\)/);
  assert.match(journeys, /r\.reserved&&!P\.eligible\(r\)\?' rsvd':''/); assert.match(journeys, /P\.eligible\(r\)\?' · yours to choose':''/);
  assert.match(inv, /h\['x-siyl-auth'\] = a\.bearer/);
  /* the stay-level state model: one action per stay, never a second ADD for a chosen room */
  assert.match(journeys, /data-stay-add=/); assert.match(journeys, /data-stay-change=/); assert.match(journeys, /data-stay-remove=/); assert.match(journeys, /Current selection/);
  const hostsFn = src('assets/pricing.js').match(/hosts: function \(\) \{[^}]*\}/)[0];
  assert.doesNotMatch(hostsFn, /Haruthai|Suthep|preferredName|fullName/, 'no name decides anything in the calculation source');
  assert.match(hostsFn, /a\.hosts === true && a\.guestId && a\.bearer/);
});
