/* ============================================================================
   THE ACCOMMODATION DEADLINE · THE LIMITED COMPLIMENTARY STAY
   (Owner, 22 Sep 2026 · the paid extension withdrawn 23 Sep 2026).

   · The complimentary accommodation is planned by 30 NOVEMBER 2026: the front
     page counts the days from today, says "Last day" on the day itself and
     never counts below zero; afterwards the planning is closed and the engine
     refuses a NEW claim — while every paid arrangement stays open.
   · The complimentary allocation is SIX guest places, the inventory seed's own
     number, never one typed into a page: the remaining count is the engine's,
     the last place is decided inside the one actor, and a place given back
     before the deadline is free again.
   · THERE IS NO SELF-SERVICE EXTENSION: the paid extra nights that used to be
     bookable here were withdrawn by the Owner, and nothing may bring them back.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, stageOf } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { COMPLIMENTARY, deadlineState, daysUntilDeadline, complimentaryWords, mayClaimComplimentary } from '../src/stay-plan.js';
import { doState, src } from './sandbox.mjs';

const G = (n, party) => ({ invitationId: 'INV-G' + n, guestId: 'G' + n, partyId: party || null, hosts: false });
function req(op, body, identity, gr) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET',
    headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : k === 'x-gr-verified' ? (gr ? 'yes' : null) : null) },
    json: async () => body || {} };
}
async function call(rooms, op, body, identity, gr) { const r = await rooms.fetch(req(op, body, identity, gr)); return { status: r.status, d: JSON.parse(await r.text()) }; }
const join = (rooms, who, key, label, need) => call(rooms, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.guestId, need: need || 1 }, who);
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
    /* THE SELF-SERVICE EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): the engine answers nothing at all to it */
    const paid = await call(rooms, 'extend', { invitationId: late.invitationId, guestId: late.guestId, nights: 2 }, late);
    assert.equal(paid.status, 404, 'there is no extend operation any more');
    /* a paid room of the wedding window may still be taken: the deadline closes the complimentary option only
       (the Riverside was retired on 23 Sep 2026, so the paid room of that window is the Souphattra) */
    const paidRoom = await join(rooms, late, 'wedstay/heritage', 'A');
    assert.equal(paidRoom.d.ok, true, 'the deadline closes the complimentary option only');
  } finally { globalThis.Date = RealDate; }
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
  assert.match(bar, /P\.planningWindow\(new Date\(\)\)/, 'the count and the hairline are computed from today, never written into the page');
  assert.match(bar, /data-stay-rail/, 'and the date carries its own calendar hairline (Owner, 23 Sep 2026)');
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
  /* THE SELF-SERVICE EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): no control, no dropdown, no placeholder, no empty card */
  assert.doesNotMatch(prof, /Extend your stay|Select additional nights|NIGHT_OPTIONS|data-ext-|Extended stay/, 'My Profile still offers extra nights');
  assert.doesNotMatch(prof, /Riverside/, 'and it names no hotel for them');
  /* what survives is the record: every confirmed stay, in the order they happen, in one card system */
  assert.match(prof, /function stayLines\(\)/);
  assert.match(prof, /kicker:st\.complimentary\?'Complimentary stay':'Your stay'/);
  /* the engine's own words for the allocation reach every surface that shows the category */
  assert.match(rooms, /P\.complimentaryWords\(s\.remainingPlaces, s\.sourcePlaces, new Date\(\)\)\.headline/);
});

