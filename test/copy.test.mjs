/* 008 — COPY / WORDING AUDIT (Owner, 18 Sep 2026 · docs/review/008-copy-audit/WORDING-CONTRACT.md).
   Deterministic guards for the canonical wording: retired labels never return, no technical word reaches a guest string,
   no raw ISO stamp or internal seat id in guest-facing copy, no GitHub link, the Worker link is the one link, the emails
   speak of the guest's trip. Static over the source with comments stripped — never brittle prose punctuation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { composeGuestMail, composeOwnerMail, SITE } from '../src/mail-templates.js';

const PAGES = fs.readdirSync('.').filter((f) => f.endsWith('.html'));
const CLIENT = fs.readdirSync('assets').filter((f) => /\.(js|mjs)$/.test(f)).map((f) => 'assets/' + f);
const GUEST_FACING = [...PAGES, ...CLIENT, 'src/mail-templates.js'];
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const read = (f) => strip(fs.readFileSync(f, 'utf8'));
/* the string literals of a file — what can reach the DOM, the PDF or the mail */
const literals = (src) => [...src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1] || m[2] || '');

test('COPY · retired labels never return: the private plan is My Trip / your trip, the selections are My Bag, the review is Review & Send', () => {
  const RETIRED = [/Your Journey(?!\.html)/, /your journey/, /Journey Bag/i, /private journey/, /Review your journey/, /Send updated journey/, /Continue (to )?Your Journey/, /Add to Your Journey/, /Remove from Your Journey/, /Complete journey/, /Essential journey/, /suggested journey/, /journey cost/, /Just added to your journey/];
  for (const f of GUEST_FACING) { const s = read(f); for (const rx of RETIRED) assert.doesNotMatch(s, rx, f + ' still says ' + rx); }
});

test('COPY · availability and confirmation semantics: Sold out (never Fully booked), a request is not a reservation, a held seat is held (never Confirmed by the website), no Booking summary', () => {
  for (const f of GUEST_FACING) {
    const s = read(f);
    assert.doesNotMatch(s, /Fully booked/, f); assert.doesNotMatch(s, /not bookable/, f); assert.doesNotMatch(s, /not a confirmed reservation/, f);
    assert.doesNotMatch(s, /Booking summary/, f); assert.doesNotMatch(s, /Seat confirmed|seat is confirmed/, f); assert.doesNotMatch(s, /confirmed and payable/, f);
  }
  assert.match(read('assets/rooms.js'), /return 'Sold out';/); assert.match(read('assets/seatpass.js'), /'FRONT CENTRE' : 'HELD'/);
  assert.match(read('assets/travelpass.js'), /confirmed: 'Confirmed by Guest Relations'/, 'Confirmed stays a Guest Relations act');
});

test('COPY · no technical word, raw ISO stamp, internal seat id or GitHub link in a guest-facing string', () => {
  const TECH = /\b(ledger|engine|payload|fingerprint|durable object|REG_KV|409|dirty state|allocation id)\b/i;
  const ISO = /\d{4}-\d\d-\d\dT\d\d:\d\d/;
  const SEAT_ID = /\b[CD]-[LRTB]-\d\d(-\d\d)?\b/;
  const ALLOW = /seatId|ledger id|data-|\.js|\.mjs|\.json|\/api\/|^[a-z0-9._-]+$|^\s*$/;
  for (const f of [...PAGES, ...CLIENT.filter((c) => !/seating\.js|seatlabels\.js|seatpass\.js|confirm\.js|rooms\.js|stay\.js/.test(c)), 'src/mail-templates.js']) {
    for (const lit of literals(read(f))) {
      if (ALLOW.test(lit) || lit.length < 12) continue;
      assert.doesNotMatch(lit, TECH, f + ': ' + lit.slice(0, 80));
      assert.doesNotMatch(lit, ISO, f + ': ' + lit.slice(0, 80));
      assert.doesNotMatch(lit, /github\.io|github\.com/, f + ': ' + lit.slice(0, 80));
    }
  }
  /* the words that describe a seat to a guest never carry the internal id */
  for (const f of ['wedding-preparation.html', 'review.html', 'tickets.html', 'assets/seatpass.js']) for (const lit of literals(read(f))) assert.doesNotMatch(lit, SEAT_ID, f + ': ' + lit.slice(0, 80));
});

test('COPY · the emails speak of the guest\'s trip, carry the one Worker link and no journey label', () => {
  const REG = { channel: 'journey-shop', guestId: 'G777', totalUsd: 100, contact: { email: 'sam.example@example.org', phone: '+66' }, selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }],
    templeCeremony: { guests: [{ guestId: 'G777', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' } }] }, guestRecord: { partyName: 'Sam & Alex', guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }] }, documents: { guests: [] }, seats: {} };
  const rec = (extra) => ({ invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', registration: REG, recipient: { email: 'sam.example@example.org' }, rooms: {}, kind: 'initial', version: 1, submittedAt: '2026-09-16T17:52:41.404Z', lastSentAt: '2026-09-16T17:52:41.696Z', firstSentAt: '2026-09-16T17:52:41.404Z', ...(extra || {}) });
  const g = composeGuestMail(rec()), u = composeGuestMail(rec({ kind: 'update', version: 2 })), o = composeOwnerMail(rec(), SITE + '/register-landing.html');
  assert.equal(g.subject, 'Your trip has been received — SYL-G777-34DBEFD3'); assert.equal(u.subject, 'Your trip has been updated — SYL-G777-34DBEFD3'); assert.equal(o.subject, 'Trip received — Sam Example · SYL-G777-34DBEFD3');
  for (const m of [g, u]) { for (const body of [m.html, m.text]) { assert.doesNotMatch(body, /journey/i, 'no journey label in the guest email'); assert.match(body, /Open My Trip/); assert.match(body, new RegExp(SITE.replace(/[.\/]/g, '\\$&') + '\\/invitation')); } }
  assert.match(o.text, /^SEE YOU IN LAOS — GUEST RELATIONS\n\nNew trip received\n\nGuest: Sam Example\n/); assert.doesNotMatch(o.text.split('INTERNAL REFERENCE')[0], /(^|[^-A-Z0-9])G777(?![-A-Z0-9])/m, 'the guest id lives in the internal section only (the reference SYL-G777-… is not the id)');
});

test('COPY · one voice for the shell and the bar: the six step labels, the bar navigation and the header access line agree', () => {
  const shell = read('assets/prep-shell.js'), guest = read('assets/guest.js'), bar = read('assets/bag.js'), header = read('assets/invite.mjs');
  for (const label of ['Your Invitation', 'My Trip', 'The Wedding', 'Wedding Preparation', 'About You', 'Review & Send']) { assert.match(shell, new RegExp("label: '" + label.replace(/[&]/g, '&') + "'")); assert.match(guest, new RegExp("label: '" + label + "'")); }
  assert.match(bar, /data-nav="top"/); assert.doesNotMatch(bar, /data-nav="trip"/, 'the account surfaces live in the menu drawer, not on a second bar');
  /* THE ACCOUNT IN THE MENU (Owner, 18 Sep 2026 · Aman header): My Trip · My Profile · Sign out in the drawer — the bag icon is My Bag, the drawer never repeats it */
  assert.match(header, /data-access-nav="trip">My Trip<\/a><a href="' \+ hrefOf\('profile\.html'\) \+ '" data-access-nav="profile">My Profile<\/a>' \+ \(window\.SIYL_DRAFT \? '<button type="button" class="a-macct-save" data-access-save>Save my progress<\/button>' : ''\) \+ '<button type="button" class="a-macct-out" data-access-out>Sign out<\/button>/);
  assert.doesNotMatch(header, /data-access-nav="bag"/, 'no textual My Bag in the account block');
  assert.doesNotMatch(shell, /prep-eyebrow/, 'the step header carries no eyebrow: step · guest · state · Save · View all steps');
});
