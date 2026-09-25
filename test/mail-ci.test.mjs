/* THE EMAILS IN THE SEE YOU IN LAOS CI (Owner, 16 Sep 2026 · presentation only): composed from a controlled record of the
   real journey-shop shape — HTML + plain text, ivory / charcoal, serif headings, tracked labels, one column, the Worker
   CTA, human seats and dates, no system word, no raw timestamp, no internal id for the guest; Guest Relations keeps the
   operational detail with the internal ids in one final muted section. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { composeGuestMail, composeOwnerMail, seatLabel, whenWords, journeyModel } from '../src/mail-templates.js';
import { page } from './sandbox.mjs';

const REG = { channel: 'journey-shop', guestId: 'G777', totalUsd: 292, contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' },
  selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }, { id: 'bkk-stay', name: 'U Sathorn Bangkok', meta: '21 – 24 February 2027 · Superior Room With Garden View', price: 192, stay: 'sathorn', room: 'u-sathorn-superior-garden', breakfast: 'Breakfast included', unit: 'B', unitName: 'Room B' }, { id: 'sangkhathan', name: 'Sangkhathan Temple Offering', meta: 'Sunday, 28 February 2027 · Temple Ceremony', price: 15 }],
  templeCeremony: { guests: [{ guestId: 'G777', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Not joining' } }] },
  guestRecord: { partyName: 'Peggy & Steffie', dress: { all: true }, photo: { acknowledged: true }, guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, allergy: { answer: 'yes', details: 'Peanuts' }, profile: { coffeetea: 'Oolong', drink: 'Fresh lime soda' }, dress: { acknowledged: true, at: '2026-09-16T17:52:35.999Z', textVersion: '2026-09-09' } }] },
  documents: { guests: [{ guestId: 'G777', documents: [{ kind: 'passport', label: 'Passport', state: 'Not provided' }], publication: 'Given' }] },
  seats: { ceremony: { G777: 'C-R-05-02' }, dinner: { G777: 'D-T-05' } } };
const rec = (extra) => ({ invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', registration: REG, recipient: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, rooms: { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'C', room: 'Room C', name: 'Superior Room With Garden View' } }, kind: 'initial', version: 1, submittedAt: '2026-09-16T17:52:41.404Z', lastSentAt: '2026-09-16T17:52:41.696Z', firstSentAt: '2026-09-16T17:52:41.404Z', ...(extra || {}) });
const DEBUG = /ledger|engine|persisted allocation|controlled production|fixture|payload|version 2|text version|Submitted via Review & Send|\d{4}-\d\d-\d\dT\d\d:\d\d|github\.io|guestId|invitationId|fingerprint|registration|API|\brecord\b/i;
/* the shouted system states stay banned case-sensitively — the guest email itself says “Not answered yet” (TO-01643) */
const SHOUT = /NOT PROVIDED|NOT ANSWERED/;

test('seat labels · the same pure mapping as assets/seatlabels.js (every ceremony and dinner seat)', () => {
  const L = page({ auth: null }).SIYL_SEATLABELS;
  const ids = [];
  for (const side of ['L', 'R']) for (let r = 1; r <= 10; r++) for (let c = 1; c <= 3; c++) ids.push('C-' + side + '-' + String(r).padStart(2, '0') + '-0' + c);
  for (const run of ['T', 'B']) for (let n = 1; n <= 25; n++) ids.push('D-' + run + '-' + String(n).padStart(2, '0'));
  for (const id of ids) assert.equal(seatLabel(id), L.label(id), id);
  assert.equal(seatLabel('C-R-05-02'), 'E5'); assert.equal(seatLabel('D-T-05'), 'A5'); assert.equal(seatLabel('nope'), null);
  /* the dinner is 48 seats (Owner, 24 Sep 2026 · OQ-03): no A13 / B13 in either mapping, nothing renumbered, B12 stays B12 */
  assert.equal(seatLabel('D-T-13'), null); assert.equal(seatLabel('D-B-13'), null); assert.equal(seatLabel('D-B-12'), 'B12'); assert.equal(seatLabel('D-T-14'), 'A14');
  assert.equal(ids.filter((id) => /^D-/.test(id) && seatLabel(id)).length, 48, 'forty-eight dinner labels');
  assert.equal(whenWords('2026-09-16T17:52:41.696Z'), '16 September 2026 · 19:52');
});

test('the guest email · CI, human words, the Worker CTA, no system term, no id, no raw stamp; the engine\'s room wins over the line\'s', () => {
  const m = composeGuestMail(rec());
  assert.equal(m.subject, 'Thank you — we have your trip (SYL-G777-34DBEFD3)');   /* Window 007 (B3) */
  assert.doesNotMatch(m.subject + m.text + m.html, /confirmation|booking confirmed|trip is confirmed/i, 'a copy of the trip, never called a confirmation');
  for (const body of [m.html, m.text]) {
    assert.doesNotMatch(body, DEBUG, 'no debug language'); assert.doesNotMatch(body, SHOUT); assert.doesNotMatch(body, /(?<!SYL-)G777|INV-G777|C-R-05-02|D-T-05/, 'no internal id (the reference carries the guest id by design)');
    assert.match(body, /Dear Sam,/); assert.match(body, /Your reference:?\s*(<[^>]+>\s*)*SYL-G777-34DBEFD3/); assert.match(body, /Sent on:?\s*(<[^>]+>\s*)*16 September 2026(?! ·)/, 'the date only');
    assert.match(body, /Seat E5/); assert.match(body, /Seat A5/); assert.match(body, /Room C/); assert.doesNotMatch(body, /Room B/, 'the engine\'s room, never the line\'s claim');
    assert.match(body, /USD 292/); assert.match(body, /Peanuts/); assert.match(body, /Oolong/); assert.match(body, /Dress code/); assert.match(body, /Acknowledged/); assert.doesNotMatch(body, /Reviewed/);
    assert.match(body, /https:\/\/seeyouinlaos-website\.suthep-hrg\.workers\.dev\/invitation/); assert.match(body, /we never send codes by email/); assert.match(body, /guest\.relation\.seeyouinlaos@gmail\.com/); assert.match(body, /Vientiane · 28 February 2027/);
    assert.doesNotMatch(body, /Passport/, 'an optional document not provided is omitted for the guest');
    assert.match(body, /Wat Ong Teu/); assert.match(body, /09:00 – approximately 12:00/); assert.match(body, /12:00 – 15:30/); assert.match(body, /15:30/); assert.match(body, /19:30/); assert.match(body, /poolside/); assert.match(body, /Not joining/);
  }
  assert.match(m.html, /background:#F2ECE1/, 'the canonical Warm Ivory'); assert.doesNotMatch(m.html, /#8a5a55|#f4eee5/i, 'no retired colour'); assert.match(m.html, /Georgia, 'Times New Roman'/); assert.match(m.html, /letter-spacing:2px;text-transform:uppercase/); assert.match(m.html, /max-width:640px/); assert.match(m.html, /Open My Trip/);
  assert.match(m.html, /<meta name="viewport"/); assert.doesNotMatch(m.html, /display:\s*grid|display:\s*flex|<script/);
  assert.match(m.text, /^SEE YOU IN LAOS — MY TRIP\n\nThank you — we have your trip\n\nDear Sam,/);
  assert.match(m.text, /^· Vow Ceremony · 15:30 · Souphattra Heritage: Joining$/m); assert.doesNotMatch(m.text + m.html, /Wedding Ceremony/, 'TO-01819: the Vow Ceremony');
});

test('the update email · same reference, "updated", versioning kept internal for the guest, shown to Guest Relations', () => {
  const g = composeGuestMail(rec({ kind: 'update', version: 2, lastSentAt: '2026-09-16T18:10:03.000Z' }));
  assert.equal(g.subject, 'Thank you — we have your update (SYL-G777-34DBEFD3)');
  for (const body of [g.html, g.text]) { assert.match(body, /Thank you — we have your update/); assert.match(body, /Your changes have reached us and replace what you sent before — below is your updated copy\./, 'TO-01866'); assert.match(body, /Updated on:?\s*(<[^>]+>\s*)*16 September 2026/); assert.match(body, /Your reference:?\s*(<[^>]+>\s*)*SYL-G777-34DBEFD3/, 'the same reference'); assert.doesNotMatch(body, /version 2|first sent|confirmation/i); }
  const o = composeOwnerMail(rec({ kind: 'update', version: 2, lastSentAt: '2026-09-16T18:10:03.000Z' }), 'https://x/api/status?invitation=INV-G777');
  assert.equal(o.subject, 'Trip updated — Sam Example · SYL-G777-34DBEFD3');
  assert.match(o.text, /Trip updated\n\nLatest version received 16 September 2026 · 20:10 \(replaces the version first sent 16 September 2026 · 19:52\)/);
  assert.match(o.text, /Status: Updated trip/); assert.match(o.text, /Submission: SYL-G777-34DBEFD3 · version 2/);
});

test('the Guest Relations email · operational detail retained, internal ids in the last section only, still-needed documents, no raw stamp', () => {
  const o = composeOwnerMail(rec(), 'https://x/api/status?invitation=INV-G777');
  for (const body of [o.html, o.text]) {
    assert.match(body, /New trip received/); assert.match(body, /Sam Example/); assert.match(body, /Peggy & Steffie|Peggy &amp; Steffie/); assert.match(body, /sam\.example@example\.org/); assert.match(body, /\+66 81 000 0000/);
    assert.match(body, /Initial submission/); assert.match(body, /Seat E5/); assert.match(body, /Seat A5/); assert.match(body, /Room C/); assert.match(body, /Peanuts/); assert.match(body, /Passport/); assert.match(body, /Still needed: Passport/); assert.match(body, /USD 292/);
    assert.match(body, /INV-G777/); assert.match(body, /C-R-05-02/); assert.match(body, /D-T-05/);
    assert.doesNotMatch(body, /\d{4}-\d\d-\d\dT\d\d:\d\d|ledger|engine|persisted|payload|fixture|github\.io/i); assert.doesNotMatch(body, SHOUT, 'normal case for Guest Relations');
  }
  const i = o.text.indexOf('INTERNAL REFERENCE'); assert.ok(i > 0); assert.ok(o.text.indexOf('C-R-05-02') > i && o.text.indexOf('INV-G777') > i, 'the internal ids come after everything else');
  assert.match(o.html, /Guest Relations<\/p>/, 'the eyebrow says whose email it is');
  const M = journeyModel(rec()); assert.equal(M.hosts, false, 'a record the Worker stored without the host flag is a guest');
  assert.equal(journeyModel(rec({ hosts: true, guestId: 'G048' })).seats.ceremony.label, 'Front centre', 'a host (record.hosts) without a ceremony seat sits front centre');
});

/* THE HOSTS (Owner, 19 Sep 2026): no fixed arrangement, no special guest id — host-ness is the record's `hosts`, stored by the
   Worker from the authenticated identity (the register's host flag); it decides one thing in the mail: the ceremony place. */
test('the hosts · record.hosts is the only source of Front centre; a held seat still wins; the emails read it as a place, never a seat number', () => {
  const host = rec({ hosts: true, guestId: 'G048' });   /* no seat in the ceremony map for this guest */
  const M = journeyModel(host);
  assert.equal(M.hosts, true); assert.equal(M.seats.ceremony.id, null); assert.equal(M.seats.ceremony.label, 'Front centre'); assert.equal(M.seats.dinner.label, '', 'no dinner seat is invented for a host');
  const g = composeGuestMail(host);
  /* TO-01864 / TO-01868: the hosts' own copy is “Your plan is with Guest Relations” — never a confirmation */
  assert.equal(g.subject, 'Your own plan is with Guest Relations (SYL-G777-34DBEFD3)'); assert.match(g.text, /^SEE YOU IN LAOS — MY TRIP\n\nYour plan is with Guest Relations\n/); assert.doesNotMatch(g.subject + g.text, /confirmation/i);
  for (const body of [g.html, g.text]) { assert.match(body, /Vow Ceremony/); assert.match(body, /Front centre/); assert.doesNotMatch(body, /Seat Front|Seat E5|Seat A5/, 'a place, never a seat number'); assert.doesNotMatch(body, /Arranged for you|Fixed arrangement/i); }
  assert.match(g.text, /YOUR SEATS\n· Vow Ceremony · Souphattra Heritage · 15:30: Front centre\n\n/, 'the seats section carries the ceremony place only — no dinner seat row');
  const o = composeOwnerMail(host, 'https://x/api/status?invitation=INV-G777');
  assert.match(o.text, /· Vow Ceremony: Front centre/); assert.match(o.text, /· Wedding Dinner: no seat held/);
  /* a host who holds a ceremony seat is shown that seat — the flag only fills the gap */
  const seated = journeyModel(rec({ hosts: true }));
  assert.equal(seated.hosts, true); assert.equal(seated.seats.ceremony.id, 'C-R-05-02'); assert.equal(seated.seats.ceremony.label, 'E5');
});

test('the hosts · a record WITHOUT hosts gets no Front centre — no guest id is a host any more, and a registration cannot claim it', () => {
  /* the former host ids are guests like everyone else once the record carries no host flag */
  for (const guestId of ['G048', 'G049', 'G001']) {
    const r = rec({ guestId });
    const M = journeyModel(r);
    assert.equal(M.hosts, false, guestId + ' is not a host by id'); assert.equal(M.seats.ceremony.id, null); assert.equal(M.seats.ceremony.label, '', guestId + ' has no ceremony place without a seat');
    const g = composeGuestMail(r);
    for (const body of [g.html, g.text]) { assert.doesNotMatch(body, /Front centre/i); assert.doesNotMatch(body, /Your seats|YOUR SEATS/, 'no seat section without a seat'); }
    assert.match(composeOwnerMail(r, 'https://x/api/status?invitation=INV-G777').text, /· Vow Ceremony: no seat held/);
  }
  assert.equal(journeyModel(rec({ hosts: false, guestId: 'G049' })).seats.ceremony.label, '', 'hosts: false as the Worker stores it for a guest');
  /* host-ness is the Worker's stored flag from the authenticated identity — never a field the client writes into its registration */
  const claimed = rec({ guestId: 'G049', registration: { ...REG, guestRecord: { ...REG.guestRecord, hosts: true } } });
  assert.equal(journeyModel(claimed).hosts, false, 'a registration payload cannot make a guest a host');
  assert.equal(journeyModel(claimed).seats.ceremony.label, '', 'no Front centre from a client-side claim');
});
