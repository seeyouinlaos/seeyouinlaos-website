/* ============================================================================
   THE AVAILABILITY OBJECT (Owner approved 23 Sep 2026 · compact composition
   restored the same day).

   ONE compact editorial instrument on the first page, saying two different
   things and neither of them twice:

   · THE RING is the ENGINE'S COUNT — "5 / 6" on ONE horizontal line, the slash
     given room so it can never be read as one number, REMAINING small beneath.
   · THE LINE is CALENDAR TIME — 23 September 2026 to the end of 30 November
     2026, the elapsed share of real days. Never the allocation: capacity is
     already the ring's to say, and one fact is never drawn twice.
   · THE HOUSE IS THE PROJECT'S OWN: "Guest House complimentary". The invented
     "Private Residence" appears nowhere in what this object renders.
   · The bar above it carries the date alone, with the SAME calendar rule drawn
     as one hairline, so the two signals can never disagree.
   · The action follows the guest; the accent is Cherry #74070E alone; the
     entrance plays once and reduced motion arrives already finished.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { page, plain, src, PEGGY } from './sandbox.mjs';
import { PLANNING, COMPLIMENTARY, planningProgress, planningWindow } from '../src/stay-plan.js';

const MODS = ['assets/stay-plan.js', 'assets/availability.js'];
const AV = src('assets/availability.js');
const BAR = src('assets/stay-bar.js');
const CSS = src('assets/aman.css');
const INDEX = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
/* the object's own block, bounded: the Cherry grammar that follows it in the one stylesheet is a different contract */
const BLOCK = CSS.slice(CSS.indexOf('THE AVAILABILITY OBJECT (Owner approved'), CSS.indexOf('THE CHERRY GRAMMAR (Owner'));
/* what the object RENDERS — the html() the page receives, without the file's own commentary */
const RENDERED = AV.slice(AV.indexOf('function html(f)'), AV.indexOf('/* ---- the entrance'));

/* the object as the page holds it: the stay plan, and an engine that answers a count */
function object(opts = {}) {
  const w = page({ auth: opts.auth === undefined ? null : opts.auth, modules: MODS });
  w.SIYL_UNITS = {
    complimentary: () => (opts.engine === null ? null : Object.assign({ max: 4, remaining: 4, mine: false }, opts.engine)),
    guestHouse: () => (opts.engine === null ? null : { canTake: opts.canTake !== false }),
    mine: () => opts.mine || null,
  };
  return w;
}
const day = (iso) => new Date(iso + 'T12:00:00');

test('THE COUNT · the ring is the engine\'s answer, never a number written into a page', () => {
  const f = object({ engine: { remaining: 3 } }).SIYL_AVAILABILITY.facts();
  assert.equal(f.max, 4); assert.equal(f.remaining, 3); assert.equal(f.taken, 1);
  assert.equal(object({ engine: null }).SIYL_AVAILABILITY.facts(), null, 'nothing is shown until the engine has answered');
  assert.match(AV, /U\.complimentary\(\)/, 'the count comes from the engine');
  assert.match(AV, /P\.planningWindow\(new Date\(\)\)/, 'the days and the window come from the one stay plan');
});

test('THE COMPLIMENTARY STAY FIRST (Owner, 4 Oct 2026 — supersedes the Wedding Stay first of 27 Sep) · the free house is its own card before the Wedding Stay; the Wedding Stay rooms follow, from the engine', () => {
  assert.ok(RENDERED.indexOf('ghCard(f)') > 0 && RENDERED.indexOf('ghCard(f)') < RENDERED.indexOf('av-eyebrow">Wedding Stay · Vientiane'), 'the complimentary stay before the Wedding Stay');
  assert.match(RENDERED, /'<p class="t-l1 av-eyebrow">Wedding Stay · Vientiane<\/p>'/);
  /* the instrument is small: the ring never grows past 82px, whatever the screen offers — and beneath the Wedding Stay it is smaller still */
  const rings = [...BLOCK.matchAll(/--av-ring:\s*(\d+)px/g)].map((m) => +m[1]);
  assert.ok(rings.length >= 2 && Math.max(...rings) <= 82, 'the ring is an instrument, not the hero of the page — ' + rings.join(' · '));
  /* the count: the engine's rooms, a ROOM count (empty rooms), of the physical rooms it knows — the Guest House never inside it */
  const w = object(); const sum = (e, n) => ({ emptyRooms: e, sourceRooms: n, remainingRooms: e });
  w.SIYL_UNITS.view = () => ({ summary: { 'wedstay/heritage': sum(2, 5), 'wedstay/heritage-executive': sum(9, 13), 'wedstay/heritage-grand-premier': sum(0, 3), 'wedstay/noble-courtyard': sum(1, 1), 'wedstay/grand-majestic': sum(2, 2), 'wedstay/souphattra-majestic': sum(0, 1), 'wedstay/souphattra-presidential': sum(1, 1), 'guesthouse/guest-house': { sourceRooms: 1, emptyRooms: 0, sourcePlaces: 4 }, 'prewed/heritage': sum(5, 5) } });
  assert.deepEqual(plain(w.SIYL_AVAILABILITY.stayRooms()), { available: 15, total: 26 }, '15 of the 26 Souphattra rooms, nothing of the Guest House or another stage');
  w.SIYL_UNITS.view = () => ({ summary: { 'wedstay/heritage': { emptyRooms: 2 } } });
  assert.equal(w.SIYL_AVAILABILITY.stayRooms(), null, 'a category the engine did not describe: unknown, never 0');
  w.SIYL_UNITS.view = () => null;
  assert.equal(w.SIYL_AVAILABILITY.stayRooms(), null, 'no engine answer: nothing shown');
  assert.match(RENDERED, /'Rooms available' : 'Sold out'/, 'a full Wedding Stay says Sold out (the copy contract)');
});

test('THE COMPACT COMPOSITION · the ring and its status stand side by side, inside one column the page cannot inflate', () => {
  assert.match(BLOCK, /\.av-row \{ display: flex; align-items: center;[^}]*max-width: var\(--av-col\)/, 'ring left, words right, in one row');
  assert.match(BLOCK, /--av-col:\s*\d+px/, 'the object reads in a column of its own, whatever the page is');
  assert.match(BLOCK, /\.av-in \{[\s\S]{0,460}max-width: var\(--a-frame\); margin: 0 auto/, 'and it shares the page frame, so it starts where the date above it starts');
  /* a very narrow phone shrinks the instrument before it ever stacks */
  const narrow = BLOCK.slice(BLOCK.indexOf('@media (max-width: 359px)'));
  assert.match(narrow, /--av-ring: 64px/); assert.match(narrow, /\.av-row \{ gap: 12px/);
  const rowStart = BLOCK.indexOf('.av-row {'), row = BLOCK.slice(rowStart, BLOCK.indexOf('}', rowStart));
  assert.doesNotMatch(row, /flex-direction: column|text-align: center/, 'the row itself never collapses into a centred stack');
  assert.doesNotMatch(BLOCK, /@media[^{]*\{[^@]*\.av-row \{[^}]*flex-direction: column/, 'and no width turns it into one');
  assert.doesNotMatch(BLOCK, /\.av-in \{[^}]*text-align: center/, 'and the object is never centred on the page');
  /* nothing in it is sized against the viewport: no section of its own, no screenful of padding */
  assert.doesNotMatch(BLOCK, /min-height|100vh|100dvh|svh/, 'the object is embedded in the page, never a landing page');
  /* the two signals read as one sequence */
  assert.match(BLOCK, /\.a-staybar \+ \.a-avail \{ margin-top: calc\(var\(--a-rhythm\) \* \.34\)/);
});

test('THE LINE IS CALENDAR TIME · 23 September 2026 to the end of 30 November 2026, never the allocation', () => {
  assert.equal(PLANNING.start, '2026-09-23');
  assert.equal(PLANNING.end, COMPLIMENTARY.deadline, 'the window ends on the one deadline — never a second date');
  assert.equal(planningProgress(day('2026-09-22')), 0, 'before it opens');
  assert.equal(planningProgress(day('2026-09-23')), 0, 'on the day it opens');
  assert.equal(planningProgress(day('2026-12-01')), 1, 'after the deadline');
  assert.equal(planningProgress(day('2027-03-08')), 1, 'and it never runs past its end');
  /* the deadline day itself is inside the window: the end is the END of 30 November */
  const last = planningProgress(day('2026-11-30'));
  assert.ok(last > 0.98 && last < 1, 'the last day is nearly, but not quite, the end — ' + last);
  /* real days, not a guess: 23 Sep → 12 Oct is 19 days of a 69-day window */
  assert.equal(Math.round(planningProgress(day('2026-10-12')) * 1000), Math.round((19 / 69) * 1000));
  /* THE OBJECT DRAWS THAT, AND ONLY THAT: the count may change, the line does not */
  const here = planningWindow(new Date()).progress;
  for (const remaining of [4, 3, 1, 0]) {
    assert.equal(object({ engine: { remaining } }).SIYL_AVAILABILITY.facts().elapsed, here, remaining + ' places left — the line does not move');
  }
  assert.match(AV, /THE LINE IS CALENDAR TIME/);
  assert.doesNotMatch(AV, /taken \/ c\.max|position:/, 'the allocation never decides where the dot stands');
});

test('THE PLANNING BAR · the date alone, and the same calendar rule drawn as one hairline', () => {
  assert.match(BAR, /P\.planningWindow\(new Date\(\)\)/, 'the bar reads the same window the object does');
  assert.match(BAR, /data-stay-rail/); assert.match(BAR, /class="sbar-run"/); assert.match(BAR, /class="sbar-dot"/);
  assert.match(BAR, /--sb-p:' \+ p\.toFixed\(4\)/, 'the hairline is drawn at the elapsed share, never at a written position');
  assert.doesNotMatch(BAR, /places remaining|data-stay-cta/, 'the first signal still states the date alone');
  assert.match(CSS, /\.sbar-rail \{[^}]*height: 1px/, 'a rule, not a widget');
  assert.match(CSS, /\.sbar-run \{[^}]*background: #74070E/);
  assert.match(CSS, /\.sbar-dot \{[^}]*background: #74070E/);
  const railRule = CSS.slice(CSS.indexOf('.sbar-rail {'), CSS.indexOf('.sbar-run {'));
  assert.match(railRule, /height: 1px/, 'the rail is one hairline high');
  assert.doesNotMatch(railRule, /box-shadow|gradient|border-radius|padding/, 'no chrome of its own');
  assert.doesNotMatch(CSS.slice(CSS.indexOf('.sbar-rail {'), CSS.indexOf('.a-staybar[data-stay-phase="closed"] .sbar-run')), /box-shadow|gradient/, 'and none on what it carries');
});

test('THE HOUSE IS THE PROJECT\'S OWN · "Guest House complimentary", and the invented "Private Residence" nowhere in what the object renders', () => {
  assert.doesNotMatch(RENDERED, /Private Residence/i, 'the object never renders the invented label');
  assert.doesNotMatch(src('assets/i18n/siyl-i18n.js'), /Private Residence/, 'and the dictionary no longer carries it');
  assert.doesNotMatch(INDEX, /Private Residence/, 'nor the page that holds the object');
  /* the card's own words (Owner, 4 Oct 2026): the weak "Complimentary alternative" is gone */
  const A = object().SIYL_AVAILABILITY;
  assert.equal(A.ghState({ remaining: 0, max: 4, full: true }), 'All four places are taken.');
  assert.equal(A.ghState({ remaining: 2, max: 4 }), '', 'an open house says its free places, not a state');
  assert.doesNotMatch(AV, /Complimentary alternative/);
  assert.match(RENDERED, /Souphattra Heritage · 27 February – 1 March/, 'the Wedding Stay names its house and its nights');
  assert.match(AV, /'See the Guest House'/, 'the property link names the canonical house');
  /* and the booking engine's own naming is untouched */
  assert.match(src('src/stay-plan.js'), /name: 'Guest House complimentary'/);
});

test('THE WORDS · one sentence per state, and never the language of a sale', () => {
  const A = object().SIYL_AVAILABILITY;
  /* the one bedroom of Edit 7 (Owner, 24 Sep 2026): four places, the engine's maximum */
  const head = (remaining) => A.headline({ max: 4, remaining, taken: 4 - remaining, full: remaining <= 0 }).replace('\n', ' ');
  assert.equal(head(4), 'All four places are open.');
  assert.equal(head(3), 'One place has gone.');
  assert.equal(head(2), 'Two places have gone.'); /* TO-00725: numbers in words */
  assert.equal(head(1), 'Three places have gone.');
  assert.equal(A.headline({ max: 4, remaining: 2, taken: 2, full: false, mine: true }).replace('\n', ' '), 'One of the four is yours.', 'PRQ-03-06: the guest\'s own place is never counted as gone');
  assert.equal(head(0), 'Every place has gone.');
  /* TO-00735 / TO-00731: the day count lives in the stay bar alone; the foot states the rule, and after the closing what remains */
  for (const [phase, days] of [['open', 68], ['open', 1], ['last-day', 0]]) assert.equal(A.footnote({ closed: false, phase, days, max: 4, deadlineWords: '30 November 2026' }), 'Available until 30 November 2026 or until all four places are taken.');
  assert.equal(A.footnote({ closed: true, phase: 'closed', days: 0, max: 4, deadlineWords: '30 November 2026' }), 'Every other stay can still be chosen.');
  for (const w of ['Hurry', 'Almost gone', 'Book now', 'Last chance', 'Only', 'Don\'t miss', 'Act now']) {
    assert.doesNotMatch(AV, new RegExp('[\'">]\\s*' + w, 'i'), w + ' is not this site\'s language');
  }
  assert.doesNotMatch(AV, /setInterval\([^)]*,\s*(1000|100)\)/, 'nothing ticks in seconds');
});

test('THE ACTION · one call, and it follows the guest: the guest inside their journey is never sent back through the invitation', () => {
  assert.deepEqual(plain(object({ auth: null }).SIYL_AVAILABILITY.action()), { href: 'invitation.html', words: 'Open your invitation' });
  assert.deepEqual(plain(object({ auth: PEGGY }).SIYL_AVAILABILITY.action()), { href: 'your-journey.html#stays', words: 'Continue your trip' });
  assert.deepEqual(plain(object({ auth: PEGGY, mine: { key: 'guesthouse/guest-house', label: 'A' } }).SIYL_AVAILABILITY.action()),
    { href: 'profile.html#your-stay', words: 'Your stay' });
  /* one call for each stay: the complimentary card's own, and the Wedding Stay's */
  assert.equal((RENDERED.match(/data-av-gh-cta/g) || []).length + (AV.slice(AV.indexOf('function ghCard'), AV.indexOf('function html(f)')).match(/data-av-gh-cta/g) || []).length, 1, 'one call in the card');
  assert.equal((RENDERED.match(/data-av-cta>/g) || []).length, 1, 'one call for the Wedding Stay');
});

test('THE ONE ACCENT · Cherry #74070E draws the ring, the calendar line, the dot and its single ripple — and nothing else', () => {
  assert.match(BLOCK, /--cherry:\s*#74070E/i);
  const hexes = [...new Set((BLOCK.match(/#[0-9a-f]{3,8}/gi) || []).map((h) => h.toUpperCase()))].sort();
  assert.deepEqual(hexes, ['#211F1C', '#74070E'], 'the object adds Cherry alone; the rest is the page\'s own ink and ground');
  assert.match(BLOCK, /\.av-arc[^}]*stroke: var\(--cherry\)/);
  assert.match(BLOCK, /\.av-run[^}]*background: var\(--cherry\)/);
  assert.match(BLOCK, /\.av-dot[^}]*background: var\(--cherry\)/);
  for (const forbidden of ['linear-gradient', 'radial-gradient', 'animation: blink']) assert.ok(!BLOCK.includes(forbidden), forbidden);
});

test('THE MOTION · one entrance, under a second and a half, then calm — and nothing at all under reduced motion', () => {
  for (const step of ['av-draw', 'av-rise', 'av-pop', 'av-ripple']) assert.match(BLOCK, new RegExp('@keyframes ' + step));
  assert.doesNotMatch(BLOCK, /animation:[^;]*(av-draw|av-pop|av-ripple)[^;]*infinite/, 'the entrance never repeats');
  assert.doesNotMatch(BLOCK, /\.av-arc[^}]*animation:[^;]*infinite/, 'the ring never loops');
  const delays = (BLOCK.match(/(\d+)ms\s+(both|forwards)/g) || []).map((s) => parseInt(s, 10));
  assert.ok(delays.length >= 6, 'the steps are staged');
  assert.ok(Math.max(...delays) <= 1200, 'the last step begins inside the second and a half — ' + Math.max(...delays) + 'ms');
  assert.match(BLOCK, /av-breath[^;]*infinite/, 'one quiet breath on the dot afterwards');
  const reduced = BLOCK.slice(BLOCK.indexOf('prefers-reduced-motion'));
  assert.match(reduced, /animation:\s*none\s*!important/);
  assert.match(AV, /if \(calm\(\)\) \{ host\.setAttribute\('data-av-state', 'settled'\); return; \}/);
  assert.match(AV, /IntersectionObserver/); assert.match(AV, /data-av-played/);
});

test('THE TWO SIGNALS · the front page keeps both, unmerged, in the Owner\'s order, with one call to action between them', () => {
  const bar = INDEX.indexOf('data-stay-bar'), av = INDEX.indexOf('data-availability');
  assert.ok(bar > 0 && av > bar, 'planning and its closing date first, the object after it');
  assert.ok(INDEX.indexOf('assets/stay-bar.js') < INDEX.indexOf('assets/availability.js'));
  assert.equal((INDEX.match(/data-availability/g) || []).length, 1);
  assert.equal((INDEX.match(/data-stay-bar/g) || []).length, 1);
  assert.match(RENDERED, /Your invitation shows the rooms currently open to you\./); /* the Owner's sentence, 27 Sep 2026 */
});

test('THE COMPLIMENTARY CARD (Owner, 4 Oct 2026) · the house\'s own photograph, COMPLIMENTARY STAY, the engine\'s free places, the dates and nights from the stay plan, USD 0, one claim — offered only where the existing rules allow', async () => {
  const A = object().SIYL_AVAILABILITY;
  /* the count is the engine's, in words: 1 · 2 · 3 */
  assert.equal(A.freeWords(1), '1 free place left'); assert.equal(A.freeWords(2), '2 free places left'); assert.equal(A.freeWords(3), '3 free places left');
  const html = (o) => { const w = object(o); const h = { attrs: {}, innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; } }; h.attrs['data-av-played'] = '1'; w.SIYL_AVAILABILITY.render(h); return h.innerHTML; };
  const two = html({ auth: PEGGY, engine: { remaining: 2 } });
  assert.match(two, /<img class="av-gh-img" src="assets\/images\/guesthouse\/guesthouse-01\.jpg" width="1600" height="1200" alt="The living and dining room of the Guest House in downtown Vientiane"/, 'the house\'s assigned main image');
  assert.match(two, /av-gh-eyebrow">Complimentary stay<\/p><p class="av-gh-free" data-av-free="2">2 free places left<\/p>/);
  assert.match(two, /<span>Guest House<\/span> · <span>27 February – 1 March 2027<\/span>[\s\S]*>2 nights<\/p>/, 'dates and nights from the stay plan');
  assert.match(two, /data-i18n-parts><span>Hosted by Haruthai &amp; Suthep<\/span> · <strong class="av-gh-price">USD 0<\/strong>/);
  assert.match(two, /<a class="av-cta av-claim" href="journeys\.html#j-guesthouse" data-av-gh-cta>Claim your complimentary place <span aria-hidden="true">&rarr;<\/span><\/a>/, 'the existing take-a-place flow');
  assert.match(two, /Available until 30 November 2026 or until all four places are taken\./);
  /* both blocks, in the Owner's order, each with its own call — the engine answering both inventories */
  const both = (() => { const w = object({ auth: PEGGY, engine: { remaining: 2 } }); const sum = (e, n) => ({ emptyRooms: e, sourceRooms: n, remainingRooms: e });
    w.SIYL_UNITS.view = () => ({ summary: { 'wedstay/heritage': sum(2, 5), 'wedstay/heritage-executive': sum(8, 21) } });
    const h = { attrs: { 'data-av-played': '1' }, innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; } }; w.SIYL_AVAILABILITY.render(h); return h.innerHTML; })();
  assert.ok(both.indexOf('class="av-gh"') >= 0 && both.indexOf('class="av-gh"') < both.indexOf('Wedding Stay · Vientiane'), 'the free stay before the Wedding Stay');
  assert.match(both, /<p class="av-rooms" role="img" aria-label="10 \/ 26"><b>10<\/b><span class="av-of">\/ 26<\/span><\/p>/, 'the Wedding Stay count untouched');
  assert.match(both, /data-av-gh-cta>Claim your complimentary place[\s\S]*data-av-cta>Continue your trip/, 'each block its own call');
  assert.match(html({ auth: PEGGY, engine: { remaining: 1 } }), /data-av-free="1">1 free place left</);
  /* who may claim is the existing rule: signed out → the invitation first; a guest the engine says cannot take → no claim */
  assert.match(html({ auth: null, engine: { remaining: 2 } }), /href="invitation\.html\?open=1" data-av-gh-cta>Claim your complimentary place/, 'signed out: the existing sign-in first — the house\'s claim controls are private');
  const no = html({ auth: PEGGY, engine: { remaining: 2 }, canTake: false });
  assert.doesNotMatch(no, /Claim your complimentary place/); assert.match(no, /data-av-claim="0"[\s\S]*See the Guest House/);
  const mine = html({ auth: PEGGY, engine: { remaining: 1, mine: true } });
  assert.doesNotMatch(mine, /Claim your/); assert.match(mine, /One of the places is yours[\s\S]*See your place/);
  const full = html({ auth: PEGGY, engine: { remaining: 0, max: 4 } });
  assert.doesNotMatch(full, /Claim your|free places left/); assert.match(full, /All four places are taken\./);
  const six = html({ auth: PEGGY, engine: { remaining: 0, max: 6 } }); assert.match(six, /All six places are taken\./, 'the capacity is the engine\'s, never typed');
  /* the old ring and its words are gone; nothing here writes */
  assert.doesNotMatch(AV, /av-gh-count|Complimentary alternative/);
  assert.doesNotMatch(AV.replace(/\/\*[\s\S]*?\*\//g, ''), /method:\s*'(POST|PUT|DELETE)'|\.join\(|localStorage\.setItem/);
  /* the section's name says both; Thai for every new line */
  assert.match(INDEX, /aria-label="Complimentary stay and Wedding Stay · places available" data-availability/);
  const core = (await import('../src/i18n-core.js')).default, T = core.translator(JSON.parse(src('src/i18n-th.json')));
  for (const en of ['Complimentary stay', '2 free places left', '1 free place left', 'Claim your complimentary place', 'See your place', 'Available until 30 November 2026 or until all four places are taken.', 'All four places are taken.', 'The living and dining room of the Guest House in downtown Vientiane', 'Complimentary stay and Wedding Stay · places available', 'Hosted by Haruthai & Suthep', '2 nights'])
    assert.ok(/[\u0E00-\u0E7F]/.test(T.tr(en)), 'Thai for ' + en);
});

test('THE CLAIM AND THE CALENDAR · open, the last day, closed, and closed with a place already held — the date frozen, never today\'s', () => {
  const RealDate = Date;
  const at = (iso, o) => { const w = object(o); const fixed = new RealDate(iso); w.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
    const h = { attrs: { 'data-av-played': '1' }, innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; } }; w.SIYL_AVAILABILITY.render(h); return h.innerHTML; };
  const open = at('2026-10-04T12:00:00', { auth: PEGGY, engine: { remaining: 2 } });
  assert.match(open, /Claim your complimentary place/); assert.match(open, /Available until 30 November 2026/);
  const last = at('2026-11-30T12:00:00', { auth: PEGGY, engine: { remaining: 2 } });
  assert.match(last, /Claim your complimentary place/, 'the last day still claims');
  const closed = at('2026-12-01T12:00:00', { auth: PEGGY, engine: { remaining: 2 } });
  assert.doesNotMatch(closed, /Claim your/); assert.match(closed, /Closed on 30 November 2026 — new places can no longer be taken\./); assert.match(closed, /Every other stay can still be chosen\./);
  const kept = at('2026-12-01T12:00:00', { auth: PEGGY, engine: { remaining: 1, mine: true } });
  assert.doesNotMatch(kept, /Claim your/); assert.match(kept, /One of the places is yours[\s\S]*See your place/);
});
