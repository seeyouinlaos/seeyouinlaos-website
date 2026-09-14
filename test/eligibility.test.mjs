/* BRIDE & GROOM INVENTORY (Owner, 14 Sep 2026). A room "Reserved for bride &
   groom" is held for the couple's own party and nobody else; a room reserved
   for family is out of reach of everyone on the website. The rule lives in two
   places that must agree: the calculation source in the browser (the party's
   explicit `hosts` flag from the encrypted bundle) and the shared ledger on the
   server (the hosts' invitation reference). No access code appears here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SEED, sellable, heldForParty, HOSTS_INVITATION, HELD_FOR_HOSTS } from '../src/inventory-seed.js';
import { Inventory } from '../src/inventory.js';

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
const HOSTS = { invitationId: 'INV-001', partyName: 'Haruthai & Suthep', hosts: true, guests: [{ guestId: 'G048', fullName: 'Haruthai Amphai', preferredName: 'Haruthai', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Thongantang', preferredName: 'Suthep', hostRole: 'GROOM' }] };
const NORMAL = { invitationId: 'INV-002', partyName: 'Peggy & Steffie', hosts: false, guests: [{ guestId: 'G001', fullName: 'Peggy Berger', preferredName: 'Peggy' }, { guestId: 'G002', fullName: 'Steffie Miedel', preferredName: 'Steffie' }] };
const FAMILY = { invitationId: 'INV-003', partyName: 'A family party', guests: [{ guestId: 'G003', fullName: 'A Guest', preferredName: 'A' }] };

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

/* a Durable Object stand-in: storage as a Map, blockConcurrencyWhile runs at once */
function ledger() {
  const m = new Map();
  const state = { storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))) }, blockConcurrencyWhile: (fn) => fn() };
  const I = new Inventory(state);
  const call = async (op, body, query) => { const r = await I.fetch(new Request('https://x/api/inventory/' + op + (query || ''), body ? { method: 'POST', body: JSON.stringify(body) } : {})); return { status: r.status, ...(await r.json()) }; };
  return { call };
}

test('LEDGER · INV-001 reserves the Presidential (both windows), the Solarium and the 270° suite; INV-002 is refused with the reason; family is refused for both', async () => {
  const L = ledger();
  const lines = [{ win: 'prewed', slug: 'souphattra-presidential', qty: 2 }, { win: 'wedstay', slug: 'souphattra-presidential', qty: 2 }, { win: 'kmg', slug: 'solarium', qty: 2 }, { win: 'ljg', slug: 'view-suite-270', qty: 2 }];
  const ok = await L.call('reserve', { invitationId: 'INV-001', lines });
  assert.equal(ok.status, 200); assert.equal(ok.ok, true); assert.equal(ok.reserved.length, 4);
  assert.equal(ok.items['wedstay/souphattra-presidential'].remaining, 0, 'the one Presidential is now the couple’s');
  const no = await L.call('reserve', { invitationId: 'INV-002', lines: [{ win: 'wedstay', slug: 'souphattra-presidential', qty: 2 }] });
  assert.equal(no.status, 409); assert.equal(no.ok, false); assert.equal(no.conflicts[0].heldFor, 'Bride & Groom');
  const fam1 = await L.call('reserve', { invitationId: 'INV-001', lines: [{ win: 'wedstay', slug: 'grand-majestic', qty: 2 }] });
  const fam2 = await L.call('reserve', { invitationId: 'INV-002', lines: [{ win: 'wedstay', slug: 'grand-majestic', qty: 2 }] });
  assert.equal(fam1.status, 409); assert.equal(fam2.status, 409); assert.equal(fam1.conflicts[0].heldFor, 'Family');
  /* the read, as each party sees it */
  const asHosts = await L.call('read', null, '?invitation=INV-001'), asGuest = await L.call('read', null, '?invitation=INV-002'), plain = await L.call('read');
  assert.equal(asHosts.items['kmg/solarium'].heldForYou, true); assert.equal(asHosts.items['kmg/solarium'].held, 0);
  assert.equal(asGuest.items['kmg/solarium'].heldForYou, false); assert.equal(asGuest.items['kmg/solarium'].held, 1); assert.equal(asGuest.items['kmg/solarium'].remaining, 0);
  assert.equal(plain.items['kmg/solarium'].remaining, 0);
  /* a re-send by the hosts replaces their own allocation, never counts it twice */
  const again = await L.call('reserve', { invitationId: 'INV-001', lines: [{ win: 'wedstay', slug: 'souphattra-presidential', qty: 2 }] });
  assert.equal(again.status, 200); assert.equal(again.items['wedstay/souphattra-presidential'].remaining, 0);
  const rel = await L.call('release', { invitationId: 'INV-001' });
  assert.equal(rel.ok, true); assert.equal(rel.items['wedstay/souphattra-presidential'].remaining, 1, 'released: the couple sees it open again');
});

test('SURFACES · the room page and the journeys rows decide by eligibility, the label stays, the ledger read carries the party', () => {
  const room = src('room.html'), journeys = src('journeys.html'), inv = src('assets/inventory.js');
  assert.match(room, /room\.reserved && !P\.eligible\(room\)/); assert.match(room, /held for your party — yours to choose/);
  assert.match(room, /r\.reserved && !P\.eligible\(r\)/);
  assert.match(journeys, /r\.reserved&&!P\.eligible\(r\)\?' rsvd':''/); assert.match(journeys, /P\.eligible\(r\)\?' · yours to choose':''/);
  assert.match(inv, /'\?invitation=' \+ encodeURIComponent\(inv\)/);
  /* the stay-level state model: one action per stay, never a second ADD for a chosen room */
  assert.match(journeys, /data-stay-add=/); assert.match(journeys, /data-stay-change=/); assert.match(journeys, /data-stay-remove=/); assert.match(journeys, /Selected · in your journey/);
  assert.doesNotMatch(src('assets/pricing.js'), /Haruthai|Suthep/, 'no name decides anything in the calculation source');
});
