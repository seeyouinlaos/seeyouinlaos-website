/* ============================================================================
   THE EXTENDED STAY AS A LINE THE GUEST CAN SEE (Owner, 23 Sep 2026).

   The paid nights live in the room engine, never on the device. They were
   therefore counted in the total but never shown: the guest read an amount with
   no line behind it. They are now a LINE OF THE BAG — under ACCOMMODATION,
   chronologically after the Guest House complimentary, with the hotel, the
   dates, the nights, breakfast and the amount, and the same CHANGE · REMOVE ·
   VIEW DETAILS the other booking components offer.

   DERIVED, NEVER STORED, NEVER COUNTED TWICE:
   · `get()` is what the device holds and what Review & Send submits — untouched,
     so the server's email (which adds the engine's own figure) cannot double it;
   · `lines()` is what the guest is shown, and the total is the sum of `lines()`,
     so there is no second place that could add the extension again;
   · removing or changing it is the engine's business, and every surface follows
     the same `siyl:units` answer.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { page, plain, src, PEGGY } from './sandbox.mjs';
import { extensionQuote, EXTENSION } from '../src/stay-plan.js';

const MODS = ['assets/journey.js', 'assets/bag.js'];
const BAG = src('assets/bag.js');
const JRN = src('assets/journey.js');
const CART = fs.readFileSync(new URL('../cart.html', import.meta.url), 'utf8');
const REVIEW = fs.readFileSync(new URL('../review.html', import.meta.url), 'utf8');
const PROFILE = fs.readFileSync(new URL('../profile.html', import.meta.url), 'utf8');

/* the guest's bag as the page holds it, and an engine that holds nights for them */
function bagOf(opts = {}) {
  const w = page({ auth: PEGGY, modules: MODS, seed: { 'siyl.bag': opts.bag || [] } });
  const q = opts.nights ? extensionQuote(opts.nights) : null;
  w.SIYL_UNITS = { extension: () => (q ? Object.assign({}, q, { confirmed: opts.confirmed !== false }) : null) };
  return w;
}
const HOUSE = { id: 'guesthouse', name: 'Guest House complimentary', meta: '27 February – 01 March 2027 · Complimentary', price: 0, qty: 1, complimentary: true, stay: 'guesthouse', room: 'guest-house' };
const TRAIN = { id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027', price: 100, qty: 1 };

test('THE LINE · the engine\'s record read as a bag line: the hotel, the dates, the nights, breakfast and the amount', () => {
  const B = bagOf({ bag: [HOUSE], nights: 1 }).SIYL_BAG;
  const e = plain(B.extensionLine());
  assert.equal(e.id, 'stayext');
  assert.equal(e.name, 'Riverside Hotel Vientiane');
  assert.equal(e.meta, '01 March – 02 March 2027 · 1 additional night · Breakfast included');
  assert.equal(e.price, 30);
  assert.equal(e.qty, 1);
  assert.equal(e.cat, 'Accommodation');
  assert.equal(e.when, '01 – 02 MAR');
  assert.equal(e.basis, 'USD 30 a night · your cost');
  assert.equal(e.extension, true);
  /* VIEW DETAILS opens the house the site already shows */
  assert.equal(e.stay, 'riverside'); assert.equal(e.room, 'superior-window');
  /* nothing in the line is written here: every word is the engine's quote */
  const q = extensionQuote(1);
  assert.equal(e.name, q.hotel); assert.equal(e.price, q.total);
  assert.ok(e.meta.includes(q.dates) && e.meta.includes(q.nightsWords) && e.meta.includes(q.breakfast));
});

test('THE AMOUNTS · one night USD 30, and two, three and four nights follow the engine — 60 · 90 · 120', () => {
  for (const [n, total, dates] of [[1, 30, '01 March – 02 March 2027'], [2, 60, '01 March – 03 March 2027'], [3, 90, '01 March – 04 March 2027'], [4, 120, '01 March – 05 March 2027']]) {
    const B = bagOf({ bag: [HOUSE], nights: n }).SIYL_BAG;
    const e = plain(B.extensionLine());
    assert.equal(e.price, total, n + ' nights');
    assert.ok(e.meta.startsWith(dates), n + ' nights → ' + e.meta);
    assert.equal(e.meta.includes(n === 1 ? '1 additional night' : n + ' additional nights'), true);
    assert.equal(B.total(), 0 + total, 'the complimentary house is USD 0, so the total is the extension alone');
    assert.equal(e.when, '01 – 0' + (n + 1) + ' MAR');
  }
  assert.equal(EXTENSION.rate, 30); assert.equal(EXTENSION.maxNights, 4);
});

test('NEVER COUNTED TWICE · the total is the sum of the lines the guest sees, and the submitted record is still the device\'s own', () => {
  const w = bagOf({ bag: [HOUSE, TRAIN], nights: 2 }), B = w.SIYL_BAG;
  const shown = plain(B.lines());
  assert.equal(shown.length, 3, 'the house, the train and the extended stay');
  /* the total is that list, summed once */
  assert.equal(B.total(), shown.reduce((t, x) => t + (x.price || 0) * x.qty, 0));
  assert.equal(B.total(), 0 + 100 + 60);
  /* and it is exactly the old arithmetic: the device's lines plus the engine's figure */
  assert.equal(B.total(), plain(B.get()).reduce((t, x) => t + (x.price || 0) * x.qty, 0) + B.extensionCost());
  /* THE SUBMISSION IS UNTOUCHED: the server adds the engine's own figure, so the line must never be sent as a selection */
  assert.deepEqual(plain(B.get()).map((x) => x.id), ['guesthouse', 'train'], 'stayext is never stored and never submitted');
  assert.match(REVIEW, /selections:SIYL_BAG\.get\(\),totalUsd:SIYL_BAG\.total\(\)/, 'Review & Send submits the device\'s own lines');
  assert.match(src('src/mail-templates.js'), /const total = ext \? linesTotal \+ \(Number\(ext\.total\) \|\| 0\) : total0;/, 'and the email recomputes from those lines plus the engine\'s figure');
});

test('NO EXTENSION, NO LINE · a guest without nights sees exactly their own lines, and a preview is never a cost', () => {
  const none = bagOf({ bag: [HOUSE, TRAIN] }).SIYL_BAG;
  assert.equal(none.extensionLine(), null);
  assert.deepEqual(plain(none.lines()).map((x) => x.id), ['guesthouse', 'train']);
  assert.equal(none.total(), 100);
  /* a quote the guest is only looking at is not confirmed — no line, no amount */
  const preview = bagOf({ bag: [HOUSE], nights: 3, confirmed: false }).SIYL_BAG;
  assert.equal(preview.extensionLine(), null);
  assert.equal(preview.extensionCost(), 0);
  assert.equal(preview.total(), 0);
});

test('THE PLACE IN THE JOURNEY · under Accommodation, directly after the Guest House complimentary and before the flight on', () => {
  const w = bagOf({ bag: [TRAIN, HOUSE, { id: 'kmg', name: 'Wanxiang Yueju', price: 200, qty: 1, stay: 'kunming', room: 'deluxe' }], nights: 1 });
  const J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  const order = plain(J.sorted(B.lines())).map((x) => x.id);
  assert.deepEqual(order, ['train', 'guesthouse', 'stayext', 'kmg'], 'the nights begin the day the wedding stay ends');
  const e = B.extensionLine();
  assert.equal(J.meta(e).cat, 'Accommodation', 'it is accommodation, so My Bag files it under ACCOMMODATION');
  assert.equal(J.meta(e).basis, 'USD 30 a night · your cost');
  assert.equal(J.when(e), '01 – 02 MAR', 'the line carries its own dates');
  assert.equal(J.isWedding(e), false);
  assert.equal(J.quantityLine(e), '', 'the nights are in its meta; the basis says the rate — never both');
  /* the rule itself, so a later journey edit cannot silently move it */
  assert.match(JRN, /stayext: 3\.6/);
  assert.match(JRN, /if \(x\.when\) return x\.when;/);
  assert.match(JRN, /if \(x\.cat\) return \{ cat: x\.cat, basis: x\.basis \|\| '', unit: x\.unit \|\| 'guest' \};/);
});

test('MY BAG · the line is shown, changed where it is chosen, removed through the engine, and opens the house', () => {
  assert.match(CART, /var b=J\.sorted\(B\.lines\(\)\)/, 'the bag shows the one list');
  assert.match(CART, /if\(x\.extension\)return 'profile\.html#your-stay';/, 'CHANGE goes to the one dropdown');
  assert.match(CART, /if\(x\.extension\)return 'Confirmed · added to your stay';/);
  /* REMOVE asks the engine that owns the nights — SIYL_UNITS, never the stay helper, and never a line deleted from the device */
  assert.match(CART, /if\(id==='stayext'\)\{var UN=window\.SIYL_UNITS;/);
  assert.match(CART, /UN\.unextend\(\)\.then\(function\(r\)\{if\(r&&r\.ok===false\)failed\(r\);else after\(\)\}\)/);
  assert.match(src('assets/rooms.js'), /window\.SIYL_UNITS = \{/);
  assert.match(src('assets/rooms.js'), /unextend: function \(\) \{/, 'and that is where unextend lives');
  /* VIEW DETAILS comes from the line's own stay and room, through the same helper every line uses */
  assert.match(CART, /if\(x\.stay&&x\.room\)return 'room\.html\?stay='\+x\.stay\+'&room='\+x\.room;/);
  /* the three actions the Owner asked for, in the words the other components use */
  assert.match(CART, /data-change="/); assert.match(CART, /data-remove="/); assert.match(CART, />View details<\/a>/);
});

test('REVIEW & SEND · the same line, the same amount, and the same list in the summary the guest reads', () => {
  assert.match(REVIEW, /function render\(\)\{var b=SIYL_BAG\.lines\(\)/, 'the cost overview lists it');
  assert.match(REVIEW, /var b=SIYL_BAG\.lines\(\),shared=/, 'and the journey as it was sent from this device shows it');
  assert.match(REVIEW, /function buildText\(auth\)\{var b=SIYL_BAG\.lines\(\)/, 'as does the written summary');
  assert.match(REVIEW, /!x\.interest&&!x\.extension\?ST\.unitWords\(x\):''/, 'it has no room to name — the nights are the selection');
  assert.match(REVIEW, /document\.getElementById\('tt'\)\.textContent='USD '\+SIYL_BAG\.total\(\)/, 'one amount, the same everywhere');
});

test('MY PROFILE · one home for the nights, the same wording as the line, and the same three actions', () => {
  assert.match(PROFILE, /meta:\[ext\.dates,ext\.nightsWords,ext\.breakfast\]\.filter\(Boolean\)\.join\(' · '\)/, 'the card reads exactly as the bag line');
  assert.match(PROFILE, /rows:\[\['Your cost',ext\.currency\+' '\+ext\.total\]\]/);
  assert.match(PROFILE, /data-ext-change>Change<\/button>/);
  assert.match(PROFILE, /data-ext-remove>Remove<\/button>/);
  assert.match(PROFILE, /href="room\.html\?stay=riverside&room=superior-window">View details<\/a>/);
  assert.doesNotMatch(PROFILE, /data-ext-remove>Remove extension</, 'one vocabulary — the action is Remove, as everywhere else');
  /* and the nights are never announced twice on one page: the arrangements rail keeps the device's own lines */
  assert.match(PROFILE, /function arrangements\(me\)\{\s*var id=me\.guestId,lines=J\.sorted\(B\.get\(\)\)/);
  /* every surface follows the engine's answer, so a change or a removal is everywhere at once */
  for (const [name, s] of [['My Bag', CART], ['Review & Send', REVIEW], ['My Profile', PROFILE]]) {
    assert.match(s, /siyl:units/, name + ' follows the engine');
  }
  assert.match(BAG, /document\.addEventListener\('siyl:units',sync\)/, 'and so does the one total in the sticky bar');
});
