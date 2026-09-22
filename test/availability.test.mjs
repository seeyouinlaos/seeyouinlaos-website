/* ============================================================================
   THE AVAILABILITY OBJECT (Owner approved, 23 Sep 2026 · the first page).

   ONE object, two live facts: how many complimentary places of the Private
   Residence are still free, and how far the planning window has run. Everything
   it says is derived — the count and the ring from the room engine, the days and
   the date from the one stay plan. Nothing is typed into a page.

   · the words follow the count: all six open → one gone → n gone → every place
     gone, and never the language of a sale;
   · the foot follows the date: the days, "Last day", then closed;
   · the action follows the guest: a visitor is offered the invitation, a guest
     already inside their journey is never sent back through it;
   · the one accent is Cherry #74070E — the wordmark's own full stop — and it is
     the only colour the object adds;
   · the two decision signals stand in the Owner's order on the front page and
     are never merged: planning → closing date → the object → the property → the
     invitation, with exactly one call to action.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { page, plain, src, PEGGY } from './sandbox.mjs';

const MODS = ['assets/stay-plan.js', 'assets/availability.js'];
const AV = src('assets/availability.js');
const CSS = src('assets/aman.css');
const INDEX = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/* the object as the page holds it: the stay plan, and an engine that answers a count */
function object(opts = {}) {
  const w = page({ auth: opts.auth === undefined ? null : opts.auth, modules: MODS });
  w.SIYL_UNITS = {
    complimentary: () => (opts.engine === null ? null : Object.assign({ max: 6, remaining: 6, mine: false }, opts.engine)),
    mine: () => opts.mine || null,
  };
  return w;
}
const at = (iso) => new Date(iso + 'T12:00:00');

test('THE COUNT · the ring, the numerals and the sentence are the engine\'s answer, never a number written into a page', () => {
  const A = object({ engine: { remaining: 5 } }).SIYL_AVAILABILITY;
  const f = A.facts();
  assert.equal(f.max, 6); assert.equal(f.remaining, 5); assert.equal(f.taken, 1);
  /* the object shows nothing at all until the engine has answered — it never invents a number */
  assert.equal(object({ engine: null }).SIYL_AVAILABILITY.facts(), null);
  /* no count, no maximum and no "six" is typed into the component: the only literals are the words */
  assert.doesNotMatch(AV.replace(/f\.max === 6 \? 'six' : f\.max/, ''), /remaining\s*[:=]\s*[0-9]/);
  assert.match(AV, /U\.complimentary\(\)/, 'the count comes from the engine');
  assert.match(AV, /P\.deadlineState\(new Date\(\)\)/, 'the days come from the one stay plan');
});

test('THE WORDS · one sentence per state, and never the language of a sale', () => {
  const A = object().SIYL_AVAILABILITY;
  const head = (remaining) => A.headline({ max: 6, remaining, taken: 6 - remaining, full: remaining <= 0 }).replace('\n', ' ');
  assert.equal(head(6), 'All six places are open.');
  assert.equal(head(5), 'One place has gone.');
  assert.equal(head(4), '2 places have gone.');
  assert.equal(head(1), '5 places have gone.');
  assert.equal(head(0), 'Every place has gone.');
  for (const w of ['Hurry', 'Almost gone', 'Book now', 'Last chance', 'Only', 'Don\'t miss', 'Act now']) {
    assert.doesNotMatch(AV, new RegExp('[\'">]\\s*' + w, 'i'), w + ' is not this site\'s language');
  }
});

test('THE DATE · the foot counts the days, says "Last day", then says the planning is closed — and never a clock', () => {
  const A = object().SIYL_AVAILABILITY;
  assert.equal(A.footnote({ closed: false, phase: 'open', days: 69 }), '69 days remaining · availability may close earlier');
  assert.equal(A.footnote({ closed: false, phase: 'open', days: 1 }), '1 day remaining · availability may close earlier');
  assert.equal(A.footnote({ closed: false, phase: 'last-day', days: 0 }), 'Last day · availability may close earlier');
  assert.equal(A.footnote({ closed: true, phase: 'closed', days: 0 }), 'Accommodation planning closed');
  /* the days are the plan's own count, taken today and recomputed when the day turns — never a ticking second */
  const f = object().SIYL_AVAILABILITY.facts();
  const plan = object().SIYL_STAY_PLAN.deadlineState(new Date());
  assert.equal(f.days, plan.days); assert.equal(f.phase, plan.phase);
  assert.equal(f.deadlineWords, '30 November 2026');
  assert.doesNotMatch(AV, /setInterval\([^)]*,\s*(1000|100)\)/, 'nothing ticks in seconds');
  assert.match(AV, /getDate\(\)/, 'the count is recomputed when the day turns');
});

test('THE LINE · the dot stands where the allocation stands, and never leaves the line', () => {
  for (const [remaining, low, high] of [[6, 0.08, 0.08], [5, 0.16, 0.17], [3, 0.5, 0.5], [0, 0.92, 0.92]]) {
    const p = object({ engine: { remaining } }).SIYL_AVAILABILITY.facts().position;
    assert.ok(p >= low - 0.001 && p <= high + 0.001, remaining + ' places → ' + p);
    assert.ok(p >= 0.08 && p <= 0.92, 'the dot is always on the line');
  }
});

test('THE ACTION · one call, and it follows the guest: the visitor is offered the invitation, the guest inside their journey is never sent back through it', () => {
  assert.deepEqual(plain(object({ auth: null }).SIYL_AVAILABILITY.action()), { href: 'invitation.html', words: 'Open your invitation' });
  assert.deepEqual(plain(object({ auth: PEGGY }).SIYL_AVAILABILITY.action()), { href: 'your-journey.html#stays', words: 'Continue your trip' });
  assert.deepEqual(plain(object({ auth: PEGGY, mine: { key: 'guesthouse/guest-house', label: 'A' } }).SIYL_AVAILABILITY.action()),
    { href: 'profile.html#your-stay', words: 'Your stay' });
  /* the property link is a link, never a second button — and it opens the public editorial page */
  assert.match(AV, /href="accommodation\.html#residence" data-av-explore/);
  assert.equal((AV.match(/class="av-cta"/g) || []).length, 1, 'exactly one call to action');
});

test('THE ONE ACCENT · Cherry #74070E draws the ring, the line, the dot and its single ripple — and nothing else is coloured', () => {
  const block = CSS.slice(CSS.indexOf('THE AVAILABILITY OBJECT (Owner approved'));
  assert.ok(block.length > 400, 'the object has its own block in the one stylesheet');
  assert.match(block, /--cherry:\s*#74070E/i);
  const hexes = [...new Set((block.match(/#[0-9a-f]{3,8}/gi) || []).map((h) => h.toUpperCase()))].sort();
  assert.deepEqual(hexes, ['#211F1C', '#74070E'], 'the object adds Cherry alone; the rest is the page\'s own ink and ground');
  assert.match(block, /\.av-arc[^}]*stroke:\s*var\(--cherry\)/);
  assert.match(block, /\.av-run[^}]*background:\s*var\(--cherry\)/);
  assert.match(block, /\.av-dot[^}]*background:\s*var\(--cherry\)/);
  /* nothing that belongs to a hotel booking page */
  for (const forbidden of ['linear-gradient', 'radial-gradient', 'animation: blink', 'background: var(--cherry); inset: 0']) assert.ok(!block.includes(forbidden), forbidden);
  assert.doesNotMatch(block, /\.a-avail[^{]*\{[^}]*background:\s*(#|rgb|var\(--cherry)/, 'the object never sits on a coloured ground');
});

test('THE MOTION · one entrance on the first sight, about a second and a half, then calm — and nothing at all under reduced motion', () => {
  const block = CSS.slice(CSS.indexOf('THE AVAILABILITY OBJECT (Owner approved'));
  /* the entrance is a sequence, not a loop: every step is played once */
  for (const step of ['av-draw', 'av-rise', 'av-pop', 'av-ripple']) assert.match(block, new RegExp('@keyframes ' + step));
  assert.doesNotMatch(block, /animation:[^;]*(av-draw|av-pop|av-ripple)[^;]*infinite/, 'the entrance never repeats');
  const delays = (block.match(/(\d+)ms\s+(both|forwards)/g) || []).map((s) => parseInt(s, 10));
  assert.ok(delays.length >= 6, 'the six steps are staged');
  assert.ok(Math.max(...delays) <= 1400, 'the last step begins inside the second and a half');
  /* the object is calm afterwards: one extremely quiet breath, and never a blink */
  assert.match(block, /av-breath[^;]*infinite/);
  /* reduced motion: the object simply is, already finished */
  const calm = block.slice(block.indexOf('prefers-reduced-motion'));
  assert.match(calm, /animation:\s*none\s*!important/);
  assert.match(AV, /prefers-reduced-motion: reduce/);
  assert.match(AV, /if \(calm\(\)\) \{ host\.setAttribute\('data-av-state', 'settled'\); return; \}/);
  /* the entrance waits for the object to be seen, and plays once */
  assert.match(AV, /IntersectionObserver/);
  assert.match(AV, /data-av-played/);
});

test('THE TWO SIGNALS · the front page keeps both, unmerged, in the Owner\'s order, with one call to action between them', () => {
  const bar = INDEX.indexOf('data-stay-bar'), av = INDEX.indexOf('data-availability');
  assert.ok(bar > 0 && av > bar, 'accommodation planning and its closing date come first, the object after it');
  assert.ok(INDEX.indexOf('assets/stay-bar.js') < INDEX.indexOf('assets/availability.js'));
  /* the bar carries the DATE alone: no count, no action of its own */
  const barjs = src('assets/stay-bar.js');
  assert.doesNotMatch(barjs, /places remaining|data-stay-cta|Open your invitation/i);
  assert.match(barjs, /deadlineWords/);
  /* and the object carries the count, the property and the one action */
  assert.match(AV, /Complimentary Wedding Stay<br>Private Residence · Vientiane/);
  assert.match(AV, /Your invitation shows what is still available for you\./);
  /* no second concept of the same idea anywhere on the page: one object, one bar */
  assert.equal((INDEX.match(/data-availability/g) || []).length, 1);
  assert.equal((INDEX.match(/data-stay-bar/g) || []).length, 1);
});
