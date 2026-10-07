/* THE LIVE 002_Accommodation_Details (Owner, 28 Sep 2026): the booking method of every stay from "Note for Guest", the personal
   rates of the special-rate cells (the entitled person only, resolved from the register id on the server), the three suites
   offered for the Wedding Stay only, and Hotel Muse Bangkok, Autograph Collection in place of the Siam Kempinski on every
   guest-facing surface. Synthetic guests only; entitlements are addressed by the register's opaque person ids. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { src, page, plain, PEGGY, ROOT } from './sandbox.mjs';
import { GIFTS, giftsFor, verifiedLines } from '../src/gifts.js';
import { BOOKING_WORDS } from '../src/mail-templates.js';

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
const as = (gid, contactId) => page({ auth: { ...PEGGY, guestId: gid }, seed: { 'siyl.gifts': { guestId: gid, gifts: giftsFor(contactId), at: Date.now() } } });

test('CON005 · Heritage Executive before the wedding USD 225 for the two nights; the Wedding Stay complimentary from the Bride & Groom; Hotel Muse USD 232 the whole room', () => {
  const P = as('T003', 'CON005').SIYL_PRICE;
  const pre = P.quote('prewed', 'heritage-executive'); assert.equal(pre.total, 225); assert.equal(pre.personal, 'special'); assert.match(pre.personalWords, /Your special rate/);
  const wed = P.quote('wedstay', 'heritage-executive'); assert.equal(wed.total, 0); assert.equal(wed.gift, 'bride-groom'); assert.equal(wed.giftBy, 'from the Bride & Groom');
  const muse = P.quote('kempinski', 'jatu-room'); assert.equal(muse.total, 232); assert.equal(muse.personal, 'employee'); assert.equal(muse.per, 'for the room');
  /* another room of the same stay is priced as usual */
  assert.equal(P.quote('prewed', 'heritage').total, 225); assert.equal(P.quote('prewed', 'heritage').personal, undefined);
  assert.equal(P.quote('wedstay', 'heritage').total, 145);
});

test('CON010 · the same two Souphattra rates, and nothing at Hotel Muse — the employee rate is CON005\'s alone', () => {
  const P = as('T007', 'CON010').SIYL_PRICE;
  assert.equal(P.quote('prewed', 'heritage-executive').total, 225); assert.equal(P.quote('wedstay', 'heritage-executive').total, 0);
  const muse = P.quote('kempinski', 'jatu-room'); assert.equal(muse.total, 81.71); assert.equal(muse.personal, undefined);
});

test('EVERYONE ELSE — CON005\'s party mate included — the hotel\'s rates, never a personal one; the list names no one', () => {
  for (const [gid, cid] of [['T006', 'CON006'], ['g-peggy', 'CON999']]) {
    const P = as(gid, cid).SIYL_PRICE;
    assert.equal(P.quote('prewed', 'heritage-executive').total, 260, gid); assert.equal(P.quote('wedstay', 'heritage-executive').total, 155, gid);
    assert.equal(P.quote('kempinski', 'jatu-room').total, 81.71, gid); assert.equal(P.quote('bkk-stay', 'u-sathorn-superior-garden').total, 203.42, gid);
  }
  assert.deepEqual(giftsFor('CON006'), []);
  for (const g of GIFTS) assert.match(g.contactId, /^CON\d{3}$/);
});

test('THE SERVER ENFORCES IT · a sent line keeps a personal charge only for its holder, at exactly that charge; a claim without it is the hotel rate × payable nights', () => {
  const muse = { id: 'kempinski', stay: 'muse', room: 'jatu-room', rate: 92.1, pay: 2, price: 1, personal: 'employee', qty: 1 };
  assert.deepEqual([verifiedLines([muse], giftsFor('CON005'))[0].price, verifiedLines([muse], giftsFor('CON005'))[0].personal], [232, 'employee']);
  const other = verifiedLines([muse], giftsFor('CON010'))[0]; assert.equal(other.price, 184.2); assert.equal(other.personal, undefined);
  const pre = { id: 'prewed', stay: 'souphattra', room: 'heritage-executive', rate: 130, pay: 2, price: 0, personal: 'special', qty: 1 };
  assert.equal(verifiedLines([pre], giftsFor('CON010'))[0].price, 225); assert.equal(verifiedLines([pre], giftsFor('CON006'))[0].price, 260);
  /* who pays is never a change of the guest's selection */
  assert.match(src('src/worker.js'), /const DERIVED_LINE_KEYS = new Set\(\[[^\]]*'gift', 'personal', 'paidByHS', 'prepaidUnverified'\]\)/);
  /* the list is served to its holder only */
  assert.match(src('src/worker.js'), /giftsFor\(person && person\.contactId\)/);
});

test('THE BOOKING METHOD (002 · "Note for Guest") · self-booking stays name the guest and open the hotel\'s own page in a new tab; the Souphattra stays are booked by the Bride & Groom', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE;
  /* Edit 10: a stay H&S already paid for the guest says so (only where the server marks it) */
  assert.deepEqual(plain(P.BOOKING_WORDS), { prepaid: 'Already paid for you by Haruthai · you repay Haruthai & Suthep through your statement.',
    self: 'Guest will book by themselves.', 'bride-groom': 'Will be booked by the bride & groom. It is settled within 21 days after your statement is issued.' });
  assert.deepEqual(plain(BOOKING_WORDS), plain(P.BOOKING_WORDS), 'the emails and the pages say the same');
  const b = (win) => plain(P.bookingOf(win));
  assert.equal(b('bkk-stay').method, 'self'); assert.match(b('bkk-stay').url, /^https:\/\/www\.trip\.com\/hotels\/detail\/\?.*hotelId=1530783.*checkIn=2027-02-21&checkOut=2027-02-24/);
  assert.equal(b('kmg').method, 'self'); assert.match(b('kmg').url, /^https:\/\/www\.trip\.com\/.*checkIn=2027-03-01&checkOut=2027-03-04/);
  assert.equal(b('kempinski').method, 'self'); assert.match(b('kempinski').url, /^https:\/\/www\.marriott\.com\/en-us\/hotels\/bkkhm-hotel-muse-bangkok-autograph-collection\//);
  /* LUYE BAISHA: the Owner corrected the sheet's link (28 Sep 2026) — the stay's own 4 → 6 March; the former 6 → 8 March link is gone */
  assert.equal(b('ljg').method, 'self'); assert.match(b('ljg').url, /^https:\/\/www\.trip\.com\/hotels\/detail\/\?cityEnName=Yulong&cityId=21360&hotelId=132995703&checkIn=2027-03-04&checkOut=2027-03-06&/);
  assert.doesNotMatch(src('assets/rooms-data.js'), /checkIn=2027-03-06/, 'no 6 → 8 March Luye Baisha link anywhere');
  for (const win of ['prewed', 'wedstay', 'guesthouse']) assert.equal(b(win).method, 'bride-groom', win);
  /* every CTA opens in a new tab, never an invoice of the Bride & Groom */
  for (const f of ['journeys.html', 'room.html', 'your-journey.html', 'cart.html']) {
    const t = src(f); assert.match(t, /target="_blank" rel="noopener noreferrer"|a\.target='_blank';a\.rel='noopener noreferrer'/, f); assert.match(t, /Book with the hotel/, f);
  }
  assert.equal(P.quote('kempinski', 'jatu-room').bookingWords, 'Guest will book by themselves.');
  assert.equal(P.quote('prewed', 'heritage').bookingWords, 'Will be booked by the bride & groom. It is settled within 21 days after your statement is issued.');
});

test('HOTEL MUSE BANGKOK · ONE product, the Jatu Room, 6 – 8 March 2027, two nights, breakfast not included, USD 92.10 per person per night (the room USD 184.20)', () => {
  const w = page({ auth: PEGGY }); const M = w.SIYL_ROOMS.muse, P = w.SIYL_PRICE;
  assert.equal(M.name, 'Hotel Muse Bangkok, Autograph Collection'); assert.equal(M.breakfast, 'Breakfast not included');
  assert.deepEqual(plain(M.windows.map((x) => [x.id, x.dates, x.n])), [['kempinski', '6 – 8 March 2027', 2]]);
  assert.deepEqual(plain(M.rooms.map((r) => [r.slug, r.name, r.rate, r.roomRate])), [['jatu-room', 'Jatu Room', 40.8525, 81.705]]);
  const q = P.quote('kempinski', 'jatu-room'); assert.equal(q.total, 81.71); assert.equal(q.nights, 2);
  assert.equal(w.SIYL_ROOMS.kempinski, undefined);
});

test('NO KEMPINSKI AS A HOTEL ON ANY GUEST-FACING PAGE · every page, the data it reads and the Thai catalogue — only ALATi\'s and Firefly Bar\'s real location names it', () => {
  const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  const data = ['assets/rooms-data.js', 'assets/pricing.js', 'assets/journey.js', 'assets/stay.js', 'assets/experiences.js', 'assets/transport-data.js', 'assets/aman.js', 'assets/stay-media.js', 'assets/stay-art.js', 'src/i18n-th.json'];
  for (const f of pages.concat(data)) {
    let t; try { t = src(f); } catch (e) { continue; }
    const u = strip(t).replace(/(\{ id: 'bkk-(?:alati|firefly)'[^\n]*?)where: 'Siam Kempinski Hotel Bangkok'/g, '$1where: VENUE').replace(/"Siam Kempinski Hotel Bangkok"/g, 'VENUE');
    assert.doesNotMatch(u, /Kempinski|images\/kempinski\/|kempinski-0\d\.jpg|Deluxe Balcony King/, f + ' still shows the Siam Kempinski');
  }
});

test('THE WEDDING-STAY-ONLY SUITES · Noble Courtyard, Grand Majestic and the Souphattra Majestic are not pre-wedding rooms: never a row, a line or a hold there', async () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, S = w.SIYL_ROOMS.souphattra;
  for (const slug of ['noble-courtyard', 'grand-majestic', 'souphattra-majestic']) {
    const r = S.rooms.find((x) => x.slug === slug);
    assert.equal(P.offeredIn('prewed', r), false, slug); assert.equal(P.offeredIn('wedstay', r), true, slug);
    assert.equal(P.items('prewed', slug).length, 0); assert.ok(P.items('wedstay', slug).length === 1);
  }
  const { SEED } = await import('../src/inventory-seed.js');
  for (const slug of ['noble-courtyard', 'grand-majestic', 'souphattra-majestic']) { assert.equal(SEED['prewed/' + slug], undefined); assert.ok(SEED['wedstay/' + slug]); }
  assert.match(src('room.html'), /This suite is offered for the Wedding Stay only\./);
});
