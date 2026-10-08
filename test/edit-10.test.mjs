/* ============================================================================
   EDIT 10 (Owner, 7 October 2026) — two corrections. Synthetic guests only.

   · A STAY H&S ALREADY PAID: where the server marks a guest's stay as booked
     and paid by Haruthai & Suthep (a 009 row with Billing_Category, engine
     2.3), the guest's trip says so — "already paid for you by Haruthai · you
     repay Haruthai & Suthep through your statement" — in English and in Thai.
     Its amount is the one the guest repays: never "your special rate" set
     against a listed rate. The line stays payable (Block A); nothing here
     makes it the guest's own arrangement.
   · THE USD 150 WEDDING STAY: a person-scoped 009 named rate of USD 150 for
     the one payable night prices exactly the named guest's Heritage Executive
     Wedding Stay at USD 150.00 — in the engine, so a statement carries it —
     and leaves every other guest at the 002 rate.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, PEGGY } from './sandbox.mjs';
import core from '../src/i18n-core.js';
import { calculate } from '../src/billing/engine.js';

const PREPAID = 'already paid for you by Haruthai · you repay Haruthai & Suthep through your statement';
const marked = { total: 109, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 36.33, paidByHS: 'GUEST_SELF_PAYMENT' };

test('PREPAID · the trip says the stay is already paid by Haruthai and repaid through the statement — no "special rate", no listed rate beside it', () => {
  const w = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': marked } });
  const P = w.SIYL_PRICE;
  const q = P.quote('kmg', 'jinri-terrace-double');
  assert.equal(q.total, 109, 'the amount the server states: what the guest repays');
  assert.equal(q.personal, 'prepaid');
  assert.equal(q.personalWords, 'A' + PREPAID.slice(1)); assert.equal(P.PREPAID_WORDS, q.personalWords);
  assert.doesNotMatch(q.contribution + ' ' + q.basis + ' ' + q.hostedBasis, /listed rate|special rate/);
  assert.match(q.basis, new RegExp('^USD 109 per person · ' + PREPAID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' · 3 nights'));
  const line = P.items('kmg', 'jinri-terrace-double')[0];
  assert.equal(line.personal, 'prepaid'); assert.equal(line.price, 109);
  assert.equal(w.SIYL_JOURNEY.quantityLine(line), 'USD 109 per person · ' + PREPAID);

  /* a named rate the guest simply pays stays "your special rate"; a stay the server does not mark stays the guest's own */
  const plain = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': { ...marked, paidByHS: null } } }).SIYL_PRICE;
  assert.equal(plain.quote('kmg', 'jinri-terrace-double').personal, 'special');
  assert.equal(P.quote('ljg', 'private-soup-view').personal, undefined, 'the Lijiang stay of this synthetic guest carries no mark');
});

test('PREPAID · the Thai reads the same sentence for every form the trip shows', () => {
  const T = core.translator(JSON.parse(src('src/i18n-th.json')));
  const th = 'Haruthai ชำระค่าที่พักนี้ให้คุณแล้ว · คุณชำระคืนให้ Haruthai & Suthep ผ่านใบแจ้งยอดของคุณ';
  assert.equal(T.tr('A' + PREPAID.slice(1)), th);
  assert.equal(T.tr('USD 109 per person · ' + PREPAID), 'USD 109 ต่อท่าน · ' + th);
  assert.equal(T.tr('A' + PREPAID.slice(1) + ' · 3 nights'), th + ' · 3 คืน');
  assert.equal(T.tr('per person · ' + PREPAID + ' · 2 nights'), 'ต่อท่าน · ' + th + ' · 2 คืน');
  assert.equal(T.tr('USD 232.62 per person · ' + PREPAID + ' · 2 nights: 4 → 5 March and 5 → 6 March'),
    'USD 232.62 ต่อท่าน · ' + th + ' · 2 คืน: ' + T.tr('4 → 5 March and 5 → 6 March'));
});

test('USD 150 WEDDING STAY · a named rate of USD 150 for the one payable night prices the named guest at USD 150.00 — every other guest keeps the 002 rate', () => {
  const items = { 'D1-HERITAGE-EXECUTIVE': { Item_ID: 'D1-HERITAGE-EXECUTIVE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 155, Currency: 'USD', Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] } };
  const stay = (p) => ({ Booking_ID: 'B-' + p, Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'D1-HERITAGE-EXECUTIVE', State: 'CONFIRMED', Quantity: 1, Nights: 2 });
  const rows = ['GT1', 'GT2'].map((p) => ({ Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'D1-HERITAGE-EXECUTIVE', Rate_Per_Person_Night: 150, Nights_Rule: '1',
    Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep', Note: 'Wedding Stay · USD 150 per person' }));
  for (const p of ['GT1', 'GT2']) {
    const r = calculate([stay(p)], { items, specialRates: rows, asOf: '2026-10-07' });
    const l = r.lines[0];
    assert.deepEqual([l.rateCents, l.payableNights, l.amountCents, l.block, l.rateSource, r.totalPayableCents], [15000, 1, 15000, 'A', 'SPECIAL_RATE', 15000], p);
  }
  const other = calculate([stay('GT3')], { items, specialRates: rows, asOf: '2026-10-07' }).lines[0];
  assert.deepEqual([other.rateCents, other.payableNights, other.amountCents, other.rateSource], [15500, 1, 15500, 'STANDARD_RATE'], 'everyone else: USD 155, second night hosted');
});

test('PREPAID · the bag never offers to book a stay H&S already paid ("Book with the hotel" stays for every other stay)', () => {
  const cart = src('cart.html');
  assert.match(cart, /function bookingHtml\(x\)\{[^}]*if\(x&&x\.personal==='prepaid'&&x\.price!=null\)return '';/);
  assert.match(cart, /data-booking-link>Book with the hotel</);
});

/* ---- every surface (Edit 10 resume): one helper says who books a stay; the e-mails read the server's own mark ---- */
import { composeGuestMail, composeOwnerMail, BOOKING_WORDS } from '../src/mail-templates.js';

test('PREPAID · one helper for every page: the room shown, else the bag\'s room, else the window — "already paid", never a hotel link; every other stay unchanged', () => {
  const w = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': marked } });
  const P = w.SIYL_PRICE;
  const words = 'A' + PREPAID.slice(1) + '.';
  assert.deepEqual(JSON.parse(JSON.stringify(P.bookingOf('kmg', 'jinri-terrace-double'))), { method: 'prepaid', url: '', words });
  assert.equal(P.bookingOf('kmg', 'elegant-residence').method, 'self', 'another room of the house: the guest\'s own to book');
  assert.equal(P.bookingOf('kmg').method, 'prepaid', 'no room named: a room of this window is paid for this guest');
  assert.equal(P.bookingOf('ljg').method, 'self', 'a stay the server does not mark');
  const q = P.quote('kmg', 'jinri-terrace-double');
  assert.deepEqual([q.booking, q.bookingUrl, q.bookingWords, q.roomNightly], ['prepaid', '', words, '']);
  assert.equal(P.BOOKING_WORDS.prepaid, words);
  /* the bag holds the paid room: the window answers for that room, not another */
  for (const it of P.items('kmg', 'elegant-residence')) w.SIYL_BAG.put(it);
  assert.equal(P.bookingOf('kmg').method, 'self', 'the bag holds another room of the house');
  /* while the price paid is still asked for, the stay already says who paid */
  const asked = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': { ...marked, total: null, manualReview: 'PRICE REQUIRED — …' } } }).SIYL_PRICE;
  assert.equal(asked.bookingOf('kmg', 'jinri-terrace-double').method, 'prepaid');
  /* before the server answers, nothing is known: the 002 words */
  assert.equal(page({ auth: PEGGY, billing: 'pending', quotes: { 'kmg/jinri-terrace-double': marked } }).SIYL_PRICE.bookingOf('kmg', 'jinri-terrace-double').method, 'self');
});

test('PREPAID · every page asks the helper for the room it shows, and none prints "the listed rate" or "Book with the hotel" for such a stay', () => {
  assert.match(src('room.html'), /var bk = q && q\.personal === 'prepaid' && q\.total != null \? null : \(P\.bookingOf \? P\.bookingOf\(w\.id, room\.slug\) : null\);/);
  assert.match(src('cart.html'), /P\.bookingOf\(x\.id,x\.room\)/);
  assert.match(src('review.html'), /SIYL_PRICE\.bookingOf\(x\.id,x\.room\)/);
  assert.match(src('review.html'), /b\.method==='prepaid'\?' · ALREADY PAID BY HARUTHAI FOR THE GUEST \(repaid to Haruthai & Suthep through the settlement\)'/);
  assert.doesNotMatch(src('review.html'), /x\.personal==='prepaid'\?/, 'the review copy says it once, in its booking text');
  assert.match(src('journeys.html'), /paintBooking\(\);\['siyl:prices','siyl:billing-ready','siyl:bag'\]\.forEach\(function\(t\)\{document\.addEventListener\(t,paintBooking\)\}\);/, 'drawn again when the prices arrive');
  assert.match(src('your-journey.html'), /var bk=x\.personal==='prepaid'&&x\.price!=null\?null:\(P\.bookingOf\?P\.bookingOf\(win,x\.room\):null\);/);
  assert.match(src('your-journey.html'), /var bkb=line\.personal==='prepaid'&&line\.price!=null\?null:\(P\.bookingOf\?P\.bookingOf\(win,line\.room\):null\);/);
  assert.match(src('journeys.html'), /q\.personal==='prepaid' \? '' : \(q\.nightly \? 'The listed rate: '/);
  /* the pages render the link only from the helper's url, which is empty for a paid stay */
  for (const f of ['your-journey.html', 'room.html', 'journeys.html', 'cart.html']) assert.doesNotMatch(src(f), /Book with the hotel<\/a>'?\s*:\s*''\)?[^;]*bookingUrl/, f);
});

const stayRec = (line) => ({ invitationId: 'INV-GT1', guestId: 'GT1', submissionId: 'SYL-GT1-TEST0001', version: 1, kind: 'initial',
  submittedAt: '2026-10-07T09:00:00.000Z', lastSentAt: '2026-10-07T09:00:00.000Z', recipient: { email: 'sam.example@example.org' },
  registration: { lang: 'en', contact: { email: 'sam.example@example.org' }, personal: { firstName: 'Sam', lastName: 'Example' },
    selections: [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', name: 'Yifangju Designer Courtyard · Kunming',
      meta: '1 – 4 March 2027 · 002 · Jinri Building Scenic Terrace Tub Double', price: 109, rate: 18.16666667, nights: 3, pay: 3, qty: 1, ...line }],
    totalUsd: 109, guestRecord: { partyName: 'Sam', scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: true, none: false },
      guests: [{ guestId: 'GT1', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } });

test('TRIP E-MAIL · a sent stay the server marked paidByHS reads "already paid for you by Haruthai" — never "Guest will book by themselves"; unverified: neither', () => {
  assert.equal(BOOKING_WORDS.prepaid, 'A' + PREPAID.slice(1) + '.');
  const g = composeGuestMail(stayRec({ paidByHS: true })), o = composeOwnerMail(stayRec({ paidByHS: true }));
  for (const m of [g, o]) {
    assert.match(m.text + m.html, /already paid for you by Haruthai · you repay Haruthai &(amp;)? Suthep through your statement/i);
    assert.doesNotMatch(m.text + m.html, /Guest will book by themselves|Book with the hotel|pay this yourself on site/);
  }
  assert.match(g.text, /USD 109 per person — Already paid for you by Haruthai/);   /* the amount H&S paid, per person (Owner, 8 Oct 2026) */
  assert.equal((g.text.match(/lready paid for you by Haruthai/g) || []).length, 1, 'the sentence once, not twice');
  const toFollow = composeGuestMail(stayRec({ paidByHS: true, price: null })), gr = composeOwnerMail(stayRec({ paidByHS: true, price: null }));
  assert.match(toFollow.text, /Price to follow/); assert.doesNotMatch(toFollow.text + gr.text, /USD 0\b/, 'a price still asked for is never "USD 0"');
  const plain = composeGuestMail(stayRec({}));
  assert.match(plain.text, /Guest will book by themselves\./, 'a stay nobody paid: the guest\'s own to book, as before');
  const unverified = composeGuestMail(stayRec({ prepaidUnverified: true }));
  assert.doesNotMatch(unverified.text + unverified.html, /Guest will book by themselves|already paid for you/, 'the server could not tell: it says neither');
  /* Thai: the same sentence */
  const th = composeGuestMail({ ...stayRec({ paidByHS: true }), registration: { ...stayRec({ paidByHS: true }).registration, lang: 'th' } });
  assert.match(th.html, /Haruthai ชำระค่าที่พักนี้ให้คุณแล้ว/);
  assert.match(th.text, /USD 109 ต่อท่าน — Haruthai ชำระค่าที่พักนี้ให้คุณแล้ว · คุณชำระคืนให้ Haruthai & Suthep ผ่านใบแจ้งยอดของคุณ/, 'the plain text too');
});

test('PREPAID · while 009 still asks for the price paid, the bag line already carries the mark (no amount), so the sending is checked and the e-mail says who paid — "Price to follow", never the hotel\'s rate', () => {
  const P = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': { ...marked, total: null, rateSource: null, block: null, manualReview: 'PRICE REQUIRED — …' } } }).SIYL_PRICE;
  const q = P.quote('kmg', 'jinri-terrace-double');
  assert.deepEqual([q.personal, q.total, q.booking], ['prepaid', null, 'prepaid']);
  const line = P.items('kmg', 'jinri-terrace-double')[0];
  assert.deepEqual([line.personal, line.price], ['prepaid', null], 'the device claims it — the server then checks it at sending');
  /* the server's answer: marked, no amount yet */
  const g = composeGuestMail(stayRec({ paidByHS: true, price: null }));
  /* the summary's stay line (Guest Relations' raw record below it lists the device's line as sent) */
  const stayLine = (m) => m.text.split('\n').filter((l) => /^· Yifangju/.test(l) && !/: code /.test(l)).join('\n');
  assert.match(stayLine(g), /Price to follow — Already paid for you by Haruthai/); assert.doesNotMatch(stayLine(g) + g.html, /Guest will book by themselves/);
  assert.doesNotMatch(stayLine(g), /USD 54\.50/, 'the stay line states no amount yet (the fixture\'s trip total is the device\'s)');
  /* the server could not tell in time: neither sentence, and never the hotel's rate */
  const u = composeGuestMail(stayRec({ prepaidUnverified: true })), uo = composeOwnerMail(stayRec({ prepaidUnverified: true }));
  assert.match(stayLine(u), /Price to follow/); assert.doesNotMatch(stayLine(u) + stayLine(uo), /USD 54\.50|Guest will book by themselves|already paid for you/i);
  assert.doesNotMatch(u.html + uo.html, /Guest will book by themselves|already paid for you/i);
});
