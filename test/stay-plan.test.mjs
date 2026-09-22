/* ============================================================================
   THE ACCOMMODATION DEADLINE · THE LIMITED COMPLIMENTARY STAY · THE PAID
   EXTENSION (Owner, 22 Sep 2026).

   · The complimentary accommodation is planned by 30 NOVEMBER 2026: the front
     page counts the days from today, says "Last day" on the day itself and
     never counts below zero; afterwards the planning is closed and the engine
     refuses a NEW claim — while every paid arrangement stays open.
   · The complimentary allocation is SIX guest places, the inventory seed's own
     number, never one typed into a page: the remaining count is the engine's,
     the last place is decided inside the one actor, and a place given back
     before the deadline is free again.
   · The extension is a SEPARATE booking component: one to four nights at the
     designated hotel, USD 30 a night with breakfast, the dates derived from the
     end of the included stay. Changing the number of nights updates the one
     extension; removing it leaves the stay underneath exactly as it was.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, stageOf } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { COMPLIMENTARY, EXTENSION, NIGHT_OPTIONS, deadlineState, daysUntilDeadline, extensionQuote, extensionDates, validNights, complimentaryWords, mayClaimComplimentary } from '../src/stay-plan.js';
import { doState, src } from './sandbox.mjs';

const G = (n, party) => ({ invitationId: 'INV-G' + n, guestId: 'G' + n, partyId: party || null, hosts: false });
function req(op, body, identity, gr) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET',
    headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : k === 'x-gr-verified' ? (gr ? 'yes' : null) : null) },
    json: async () => body || {} };
}
async function call(rooms, op, body, identity, gr) { const r = await rooms.fetch(req(op, body, identity, gr)); return { status: r.status, d: JSON.parse(await r.text()) }; }
const join = (rooms, who, key, label, need) => call(rooms, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.guestId, need: need || 1 }, who);
const extend = (rooms, who, nights, expect) => call(rooms, 'extend', { invitationId: who.invitationId, guestId: who.guestId, nights, expect, name: who.guestId }, who);
const unextend = (rooms, who) => call(rooms, 'unextend', { invitationId: who.invitationId, guestId: who.guestId }, who);
const leave = (rooms, who, stage) => call(rooms, 'leave', { invitationId: who.invitationId, guestId: who.guestId, stage }, who);
const day = (iso) => new Date(iso + 'T12:00:00');

test('THE DEADLINE · counted from today, never hard-coded and never negative: days before, "Last day" on 30 November 2026, closed after it', () => {
  assert.equal(COMPLIMENTARY.deadline, '2026-11-30');
  assert.equal(daysUntilDeadline(day('2026-11-20')), 10);
  assert.equal(deadlineState(day('2026-09-22')).phase, 'open');
  assert.match(deadlineState(day('2026-11-29')).words, /^1 day remaining$/);
  const last = deadlineState(day('2026-11-30'));
  assert.equal(last.phase, 'last-day'); assert.equal(last.days, 0); assert.equal(last.words, 'Last day'); assert.equal(last.open, true);
  for (const d of ['2026-12-01', '2027-01-15', '2027-03-08']) {
    const s = deadlineState(day(d));
    assert.equal(s.phase, 'closed'); assert.equal(s.open, false);
    assert.equal(s.days, 0, 'a day count is never negative');
    assert.equal(s.words, 'Accommodation planning closed');
  }
  /* the words the guest reads about the allocation — factual, never scarcity marketing */
  assert.deepEqual(complimentaryWords(5, 6, day('2026-10-01')), { state: 'available', headline: '5 of 6 places remaining', detail: 'Available until 30 November 2026 or until fully allocated.' });
  assert.equal(complimentaryWords(1, 6, day('2026-10-01')).state, 'one-left');
  assert.equal(complimentaryWords(1, 6, day('2026-10-01')).headline, '1 of 6 places remaining');
  assert.equal(complimentaryWords(0, 6, day('2026-10-01')).headline, 'Complimentary stay fully allocated');
  assert.equal(complimentaryWords(4, 6, day('2026-12-02')).headline, 'Complimentary accommodation planning closed');
  for (const w of ['Hurry', 'Almost gone', 'Book now', 'Last chance', 'Only']) {
    for (const r of [5, 1, 0]) assert.doesNotMatch(JSON.stringify(complimentaryWords(r, 6, day('2026-10-01'))), new RegExp(w, 'i'), w + ' is not this site\'s language');
  }
  /* a claim is possible only while the date allows it and a place is free */
  assert.equal(mayClaimComplimentary(day('2026-10-01'), 3).ok, true);
  assert.equal(mayClaimComplimentary(day('2026-10-01'), 0).reason, 'full');
  assert.equal(mayClaimComplimentary(day('2026-12-01'), 3).reason, 'closed');
});

test('THE EXTENSION RULE · one to four nights at the designated hotel, USD 30 a night with breakfast, the dates derived from the end of the included stay', () => {
  assert.deepEqual(NIGHT_OPTIONS, [1, 2, 3, 4]);
  assert.equal(EXTENSION.rate, 30); assert.equal(EXTENSION.maxNights, 4); assert.equal(EXTENSION.hotel, 'Riverside Hotel Vientiane');
  assert.equal(EXTENSION.from, '2027-03-01', 'the extension begins the day the included stay ends');
  for (const [n, total] of [[1, 30], [2, 60], [3, 90], [4, 120]]) {
    const q = extensionQuote(n);
    assert.equal(q.nights, n); assert.equal(q.total, total); assert.equal(q.rate, 30); assert.equal(q.currency, 'USD');
    assert.equal(q.breakfast, 'Breakfast included'); assert.equal(q.hotel, 'Riverside Hotel Vientiane');
    assert.equal(q.nightsList.length, n, 'one line per night');
  }
  assert.equal(extensionQuote(1).nightsWords, '1 additional night');
  assert.equal(extensionQuote(3).nightsWords, '3 additional nights');
  assert.deepEqual([extensionDates(1).to, extensionDates(2).to, extensionDates(3).to, extensionDates(4).to], ['2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05']);
  assert.equal(extensionDates(2).words, '01 March – 03 March 2027');
  for (const bad of [0, 5, -1, 2.5, null, undefined, 'two']) assert.equal(validNights(bad), false, String(bad) + ' is not a number of nights');
  for (const ok of [1, 2, 3, 4]) assert.equal(validNights(ok), true);
  /* the extension is its own stock and its own stage — never the wedding window's */
  assert.ok(SEED[EXTENSION.key], 'the extension has stock of its own');
  assert.equal(SEED[EXTENSION.key].stay, 'Riverside Hotel Vientiane · extension');
  assert.equal(stageOf(EXTENSION.key), 'stayext');
  assert.notEqual(stageOf(EXTENSION.key), stageOf(COMPLIMENTARY.key));
});

test('CAPACITY · six complimentary places, the seed\'s own number; the count is the engine\'s; the sixth guest takes the last place and the seventh is refused; a place given back before the deadline is free again', async () => {
  assert.equal(SEED[COMPLIMENTARY.key].capacity, 6);
  assert.equal(SEED[COMPLIMENTARY.key].unit, 'guest');
  const rooms = new Rooms(doState());
  const who = (n) => G(String(900 + n));
  for (let i = 1; i <= 6; i++) {
    const r = await join(rooms, who(i), COMPLIMENTARY.key, 'A');
    assert.equal(r.d.ok, true, 'guest ' + i + ' takes a place');
    assert.equal(r.d.complimentary.remaining, 6 - i, 'the remaining count is the engine\'s');
    assert.equal(r.d.complimentary.max, 6);
  }
  const seventh = await join(rooms, who(7), COMPLIMENTARY.key, 'A');
  assert.equal(seventh.status, 409); assert.equal(seventh.d.ok, false); assert.equal(seventh.d.error, 'full', 'never a seventh complimentary guest');
  assert.equal(seventh.d.complimentary.remaining, 0);
  assert.equal(seventh.d.complimentary.full, true);
  /* a guest cancels: the place is back in the allocation at once */
  await leave(rooms, who(3), 'wedstay');
  const after = await call(rooms, 'read', null, who(7));
  assert.equal(after.d.complimentary.remaining, 1, 'a released place is free again');
  const now = await join(rooms, who(7), COMPLIMENTARY.key, 'A');
  assert.equal(now.d.ok, true, 'and may be taken while the planning is open');
});

test('CONCURRENCY · the last complimentary place is decided inside the one actor: two guests asking together, one is allocated and the other is told', async () => {
  const rooms = new Rooms(doState());
  for (let i = 1; i <= 5; i++) await join(rooms, G(String(910 + i)), COMPLIMENTARY.key, 'A');
  const a = join(rooms, G('921'), COMPLIMENTARY.key, 'A'), b = join(rooms, G('922'), COMPLIMENTARY.key, 'A');
  const [ra, rb] = await Promise.all([a, b]);
  const wins = [ra, rb].filter((r) => r.d.ok).length, loses = [ra, rb].filter((r) => !r.d.ok && r.status === 409).length;
  assert.equal(wins, 1, 'exactly one of the two holds the last place');
  assert.equal(loses, 1, 'the other is told, and nothing is oversold');
  const read = await call(rooms, 'read', null, G('923'));
  assert.equal(read.d.complimentary.remaining, 0);
  assert.equal(read.d.summary[COMPLIMENTARY.key].guestOccupiedPlaces, 6, 'six places, never seven');
});

test('THE DEADLINE ON THE SERVER · after 30 November 2026 a NEW complimentary claim is refused, a guest who already holds a place keeps it, and the paid extension stays open', async () => {
  const rooms = new Rooms(doState());
  const early = G('930'), late = G('931');
  /* the engine reads the day from `new Date()`; the test moves the calendar, nothing else */
  const RealDate = Date; let fake = RealDate.parse('2026-10-01T09:00:00Z');
  const travel = (iso) => { fake = RealDate.parse(iso); };
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [fake])); }
    static now() { return fake; }
    static parse(...a) { return RealDate.parse(...a); }
    static UTC(...a) { return RealDate.UTC(...a); }
  };
  try {
    travel('2026-10-01T09:00:00Z');
    const ok = await join(rooms, early, COMPLIMENTARY.key, 'A');
    assert.equal(ok.d.ok, true, 'before the deadline a place may be claimed');
    /* the day after */
    travel('2026-12-01T09:00:00Z');
    const refused = await join(rooms, late, COMPLIMENTARY.key, 'A');
    assert.equal(refused.status, 409);
    assert.equal(refused.d.error, 'complimentary closed', 'no new claim after the deadline, even with places free');
    assert.equal(refused.d.complimentary.phase, 'closed');
    /* the guest who already holds a place may confirm it again */
    const again = await join(rooms, early, COMPLIMENTARY.key, 'A');
    assert.equal(again.d.ok, true, 'an existing complimentary guest keeps their place');
    /* a place released after the deadline does not reopen the public option */
    await leave(rooms, early, 'wedstay');
    const stillClosed = await join(rooms, late, COMPLIMENTARY.key, 'A');
    assert.equal(stillClosed.d.error, 'complimentary closed', 'a release after the deadline is an administrative decision, never a silent reopening');
    /* the paid extension is not bound by that date */
    const paid = await extend(rooms, late, 2);
    assert.equal(paid.d.ok, true, 'paid nights may still be arranged after the deadline');
    assert.equal(paid.d.extension.total, 60);
    /* a paid room of the wedding window may also still be taken */
    const riverside = await join(rooms, late, 'riverside/superior-window', 'A');
    assert.equal(riverside.d.ok, true, 'the deadline closes the complimentary option only');
  } finally { globalThis.Date = RealDate; }
});

test('THE EXTENSION · 1 → USD 30 … 4 → USD 120, the hotel assigned automatically, the dates derived, the server authoritative; changing the nights updates the one extension and never duplicates it; removing it leaves the complimentary stay untouched', async () => {
  const rooms = new Rooms(doState());
  const g = G('940');
  /* the guest's complimentary stay first */
  const base = await join(rooms, g, COMPLIMENTARY.key, 'A');
  assert.equal(base.d.ok, true);
  assert.equal(base.d.extension, null, 'no extension until one is asked for');

  for (const [n, total] of [[1, 30], [2, 60], [3, 90], [4, 120]]) {
    const r = await extend(rooms, g, n);
    assert.equal(r.d.ok, true);
    assert.equal(r.d.extension.nights, n);
    assert.equal(r.d.extension.total, total, n + ' nights = USD ' + total);
    assert.equal(r.d.extension.hotel, 'Riverside Hotel Vientiane', 'the hotel is assigned, never chosen');
    assert.equal(r.d.extension.breakfast, 'Breakfast included');
    assert.equal(r.d.extension.from, '2027-03-01');
    assert.equal(r.d.mine.wedstay.key, COMPLIMENTARY.key, 'the complimentary stay stands through every change');
    /* one extension, never a second booking */
    const places = r.d.summary[EXTENSION.key].guestOccupiedPlaces;
    assert.equal(places, 1, 'one place held for this guest, whatever the number of nights');
  }
  /* an impossible number of nights is refused before anything is held */
  for (const bad of [0, 5, 'two', null]) {
    const r = await extend(rooms, g, bad);
    assert.equal(r.status, 400); assert.equal(r.d.error, 'invalid nights');
  }
  /* the price the guest reviewed is the price that is confirmed */
  const stale = await extend(rooms, g, 2, 45);
  assert.equal(stale.status, 409); assert.equal(stale.d.error, 'price changed');
  assert.equal(stale.d.quote.total, 60, 'the authoritative amount comes back for a new review');
  assert.equal(stale.d.extension.nights, 4, 'and nothing was changed');
  const honoured = await extend(rooms, g, 2, 60);
  assert.equal(honoured.d.ok, true); assert.equal(honoured.d.extension.nights, 2);

  /* removing the extension is only the extension */
  const gone = await unextend(rooms, g);
  assert.equal(gone.d.ok, true);
  assert.equal(gone.d.extension, null);
  assert.equal(gone.d.mine.wedstay.key, COMPLIMENTARY.key, 'the complimentary stay is untouched');
  assert.equal(gone.d.complimentary.mine, true);
  assert.equal(gone.d.summary[EXTENSION.key].guestOccupiedPlaces, 0, 'the room is given back');
  /* removing it twice is not an error and still changes nothing else */
  const again = await unextend(rooms, g);
  assert.equal(again.d.ok, true); assert.equal(again.d.mine.wedstay.key, COMPLIMENTARY.key);
});

test('THE EXTENSION FAILS SAFELY · when the hotel has no room left the guest is told and their stay is unchanged; a party keeps its own bookings', async () => {
  const rooms = new Rooms(doState());
  const cap = SEED[EXTENSION.key].capacity * 2;   /* six rooms, two places each */
  for (let i = 0; i < cap; i++) { const r = await extend(rooms, G(String(950 + i)), 1); assert.equal(r.d.ok, true, 'place ' + (i + 1)); }
  const late = G('999');
  await join(rooms, late, COMPLIMENTARY.key, 'A');
  const full = await extend(rooms, late, 2);
  assert.equal(full.status, 409);
  assert.equal(full.d.error, 'extension unavailable');
  assert.equal(full.d.extension, null, 'nothing half-booked');
  assert.equal(full.d.mine.wedstay.key, COMPLIMENTARY.key, 'the base accommodation is preserved');
  /* one guest of a party changes their own nights: the other keeps theirs */
  const a = G('960', 'INV-P'), b = G('961', 'INV-P');
  const r2 = new Rooms(doState());
  await extend(r2, a, 2); await extend(r2, b, 3);
  const changed = await extend(r2, a, 4);
  assert.equal(changed.d.extension.nights, 4);
  const bView = await call(r2, 'read', null, b);
  assert.equal(bView.d.extension.nights, 3, 'the partner\'s own extension is untouched');
  assert.equal(bView.d.summary[EXTENSION.key].guestOccupiedPlaces, 2, 'two people, two places');
});

test('THE SURFACES · the front page counts the days and follows the guest; My Profile shows the confirmed stay first and offers exactly 1 · 2 · 3 · 4 nights, with a review, a change and a discreet removal', () => {
  const bar = src('assets/stay-bar.js'), prof = src('profile.html'), idx = src('index.html'), rooms = src('assets/rooms.js'), av = src('assets/availability.js');
  /* TWO DECISION SIGNALS, NEVER MERGED (Owner approved, 23 Sep 2026): the bar carries the DATE alone, the object beneath it
     carries the live count, the property and the one action — in that order, with one call to action between them. */
  assert.match(idx, /<section class="a-sec a-staybar" aria-label="Accommodation planning" data-stay-bar><\/section>/);
  assert.match(idx, /<section class="a-sec a-avail" aria-label="Complimentary Wedding Stay · availability" data-availability><\/section>/);
  assert.ok(idx.indexOf('data-stay-bar') < idx.indexOf('data-availability'), 'planning and its closing date first, the object after it');
  assert.match(idx, /<script src="assets\/stay-plan\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  assert.match(idx, /<script src="assets\/stay-bar\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  assert.match(idx, /<script src="assets\/availability\.js(\?v=[0-9a-f]{8})?"><\/script>/);
  assert.match(bar, /P\.deadlineState\(new Date\(\)\)/, 'the count is computed from today, never written into the page');
  assert.match(bar, /closed \? 'Accommodation planning closed'/, 'after the deadline the state replaces the count');
  assert.doesNotMatch(bar, /Hurry|Book now|Almost gone|Last chance/i);
  assert.doesNotMatch(bar, /places remaining|data-stay-cta/, 'the first signal states the date alone — the count and the action belong to the object');
  /* the object: the engine's count, and one action that follows the guest */
  assert.match(av, /U\.complimentary\(\)/, 'the count is the engine\'s');
  assert.match(av, /if \(mine\) return \{ href: 'profile\.html#your-stay'/, 'a guest with a stay is taken to My Profile');
  assert.match(av, /if \(signedIn\(\)\) return \{ href: 'your-journey\.html#stays'/, 'a signed-in guest is never sent back through the invitation');
  assert.match(av, /return \{ href: 'invitation\.html', words: 'Open your invitation' \}/, 'and a visitor is offered the invitation');
  /* My Profile */
  assert.match(prof, /<section class="prep-sec" id="your-stay">/);
  assert.match(prof, /Extend your stay/);
  assert.match(prof, /P\.NIGHT_OPTIONS\.map/, 'the dropdown is the one rule\'s list — 1, 2, 3, 4');
  assert.match(prof, /Select additional nights/, 'a neutral placeholder when nothing is booked');
  assert.match(prof, /cur===n\?' selected':''/, 'an existing extension shows its own duration');
  assert.match(prof, /data-ext-confirm/); assert.match(prof, /data-ext-remove/); assert.match(prof, /data-ext-review/);
  assert.match(prof, /U\.extend\(n,q\.total\)/, 'the confirmation names the amount the guest read');
  assert.match(prof, /U\.unextend\(\)/);
  assert.doesNotMatch(prof, /\+1 night|\+2 nights/, 'no plus-one buttons — one dropdown');
  /* the engine's own words for the allocation reach every surface that shows the category */
  assert.match(rooms, /P\.complimentaryWords\(s\.remainingPlaces, s\.sourcePlaces, new Date\(\)\)\.headline/);
});

test('THE ONE TOTAL AND THE CONFIRMATION · a confirmed extension is a cost of the journey, counted once: the Bag adds the engine\'s figure, the emails name the extended stay beside the complimentary one and recompute the amount from the lines plus that figure', () => {
  const bag = src('assets/bag.js'), mail = src('src/mail-templates.js'), worker = src('src/worker.js');
  assert.match(bag, /extensionCost:function\(\)\{var U=window\.SIYL_UNITS,e=U&&U\.extension\?U\.extension\(\):null;return e&&e\.confirmed\?\(Number\(e\.total\)\|\|0\):0\}/, 'only a confirmed extension is a cost — never a preview');
  assert.match(bag, /this\.get\(\)\.reduce\(function\(t,x\)\{return t\+\(x\.price\|\|0\)\*x\.qty\},0\)\+this\.extensionCost\(\)/);
  /* the emails: its own stay line, and the amount recomputed so it can never be counted twice */
  assert.match(mail, /const ext = rooms && rooms\.stayext && !rooms\.stayext\.waitlisted \? rooms\.stayext : null;/);
  assert.match(mail, /category: 'Extended stay'/);
  assert.match(mail, /const total = ext \? linesTotal \+ \(Number\(ext\.total\) \|\| 0\) : total0;/);
  /* the record the Worker stores carries the engine's own extension, so Guest Relations and every confirmation read one truth */
  assert.match(worker, /out\.stayext = \{ stage: 'stayext', extension: true, key: e\.key, label: e\.label, name: e\.room, room: e\.room, stay: e\.hotel,/);
  assert.match(worker, /const GUEST_ROOMS_WRITES = \['join', 'leave', 'wait', 'unwait', 'extend', 'unextend'\];/, 'the extension is a guest write, verified by the bearer like every other');
});
