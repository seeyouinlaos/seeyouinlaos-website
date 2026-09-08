/* See You In Laos — deterministic tests for the single calculation source.
 * Every amount the guest can see is produced by assets/pricing.js from the
 * approved per-person / per-night rate × the nights in the window.
 * Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {}, document: { addEventListener() {} }, localStorage: null };
sandbox.window.document = sandbox.document;
new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
new Function('window', 'document', readFileSync(join(ROOT, 'assets/pricing.js'), 'utf8'))(sandbox.window, sandbox.document);
new Function('window', 'document', readFileSync(join(ROOT, 'assets/transport-data.js'), 'utf8'))(sandbox.window, sandbox.document);
const P = sandbox.window.SIYL_PRICE;
const R = sandbox.window.SIYL_ROOMS;

/* a bag with the same arithmetic as assets/bag.js: sum(price × qty) */
const total = (lines, qty = 1) => lines.reduce((t, x) => t + (x.price || 0) * (x.qty || qty), 0);
const pick = (win, slug, qty = 1) => P.items(win, slug).map((x) => ({ ...x, qty }));

/* SOURCE 08 September 2026 — Accommodation_Details, Package A · Penthouse:
 *   "Price per Person" 85.00 · "Price Per Room per NIght" 340.00 · 3 nights
 *   (21 – 24 February 2027). 85 = 340 ÷ 4 pax, per person PER NIGHT. */
test('A · one guest, Sathorn Penthouse only → USD 255', () => {
  const q = P.quote('bkk-stay', 'penthouse');
  assert.equal(q.rate, 85);
  assert.equal(q.nights, 3);
  assert.equal(q.pay, 3);
  assert.equal(q.total, 255);
  assert.equal(total(pick('bkk-stay', 'penthouse')), 255);
  assert.match(q.basis, /USD 255 total per person · 3 nights · USD 85 per person \/ night × 3 nights/);
  assert.equal(q.breakfast, 'Breakfast not included · self-pay');
});

test('B · one guest, Sathorn + Special Express No. 25 → USD 330', () => {
  const bag = [...pick('bkk-stay', 'penthouse'), { ...P.FLAT.train, price: 75, qty: 1 }];
  assert.equal(total(bag), 330);
});

test('C · two guests, Sathorn Penthouse only → USD 510', () => {
  assert.equal(total(pick('bkk-stay', 'penthouse', 2)), 510);
});

/* SOURCE-VERIFIED 08 September 2026 — H&S_Wedding_Operations_Master:
 *   Accommodation_Details  "Price per Person" 145 · "Price Per Room per NIght" 290
 *                          "Number of Night"  "2+2 (25.02.-27.02. + 27.02.-01.03.)"
 *   Budget_Room - Rate     E "Our Selling Rate / Room / Night" 290 · H 145
 *   Budget_Finance         rows 25-30 guest revenue for 27-28.02 only;
 *                          row 32 28.02-01.03 carried by the host
 * → 145 is per person PER NIGHT. Pre-Wedding pays both nights (290 for The
 *   Heritage); the Wedding Stay pays the first night only (145). */
test('Vientiane · the matrix is a per-person / per-night rate, not a window total', () => {
  const rate = { heritage: 145, 'heritage-executive': 155, 'heritage-grand-premier': 170,
                 'noble-courtyard': 240, 'grand-majestic': 250, 'souphattra-majestic': 290,
                 'souphattra-presidential': 750 };
  for (const [slug, r] of Object.entries(rate)) {
    const pre = P.quote('prewed', slug);
    assert.equal(pre.rate, r, `${slug} rate`);
    assert.equal(pre.nights, 2);
    assert.equal(pre.pay, 2, 'the pre-wedding window has no hosted night');
    assert.equal(pre.total, r * 2, `prewed/${slug} = rate × 2 nights`);
    assert.equal(total(pick('prewed', slug)), r * 2);

    const wed = P.quote('wedstay', slug);
    assert.equal(wed.nights, 2);
    assert.equal(wed.pay, 1, 'the second wedding night is hosted');
    assert.equal(wed.hosted, 1);
    assert.equal(wed.total, r, `wedstay/${slug} = one payable night`);
    assert.equal(total(pick('wedstay', slug)), r);
  }
  assert.equal(P.quote('prewed', 'heritage').total, 290);
  assert.equal(P.quote('prewed', 'souphattra-majestic').total, 580);
  assert.equal(P.quote('wedstay', 'souphattra-majestic').total, 290);
});

test('Vientiane · the guest is told exactly which nights an amount buys', () => {
  const pre = P.quote('prewed', 'heritage');
  assert.equal(pre.amount, 'USD 290');
  assert.equal(pre.totalLine, 'Total per person · 2 nights');
  assert.equal(pre.nightsCovered, 'Includes both nights: 25 → 26 February + 26 → 27 February');
  assert.match(pre.basis, /USD 290 total per person/);
  assert.doesNotMatch(pre.basis, /complimentary/, 'the hosted night is the wedding stay only');

  const wed = P.quote('wedstay', 'heritage');
  assert.equal(wed.amount, 'USD 145');
  assert.equal(wed.nightsCovered, 'Both nights: 27 → 28 February + 28 February → 01 March');
  assert.match(wed.basis, /First night your contribution at USD 145 per person \/ night · second night complimentary/);

  /* no night between 25 February and 1 March is uncovered, and 27 February is
   * the transition day shared by the two windows */
  assert.equal(P.locate('prewed').win.nightsList.length + P.locate('wedstay').win.nightsList.length, 4);
  assert.match(P.locate('prewed').win.nightsList[1], /26 → 27 February/);
  assert.match(P.locate('wedstay').win.nightsList[0], /27 → 28 February/);
});

test('every stay multiplies its rate by its payable nights — one rule, no exception', () => {
  assert.equal(P.quote('bkk-stay', 'penthouse').total, 85 * 3);
  assert.equal(P.quote('prewed', 'heritage').total, 145 * 2);
  assert.equal(P.quote('wedstay', 'heritage').total, 145 * 1);
  assert.equal(P.quote('kmg', 'left-bank').total, 87 * 3);
  assert.equal(P.quote('ljg', 'starry-sky').total, 210 * 2);
  assert.equal(P.quote('kempinski', 'deluxe-balcony-king').total, 190 * 2);
});

test('the words "fixed two-night stay" are gone from every guest surface', () => {
  for (const f of ['assets/pricing.js', 'assets/rooms-data.js', 'journeys.html',
                   'your-journey.html', 'review.html', 'room.html', 'accommodation.html']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /fixed two-night stay/, f + ' still uses the ambiguous wording');
  }
});

test('Cost Saving Experience is the hosted Vientiane core, composed of existing products', () => {
  const line = P.items('airbnb-2br', 'private-residence')[0];
  assert.equal(line.price, 0);
  assert.equal(line.complimentary, true);
  assert.equal(line.interest, false, 'a hosted booking, not a spa interest');
  assert.equal(total([{ ...line, qty: 2 }]), 0, 'never adds to Your Costs');
  /* a hosted line never also reads "Amount on request" — the price IS known */
  assert.equal(P.lineBasis(line), '');
});

test('D · the Wedding Stay is ONE payable item, never two complimentary rows', () => {
  const bag = pick('wedstay', 'heritage');
  assert.equal(bag.length, 1, 'exactly one Wedding Stay line');
  assert.deepEqual(bag.map((x) => x.id), ['wedstay']);
  assert.equal(bag[0].price, 145, 'one payable night of the two-night window');
  assert.equal(bag[0].nights, 2);
  assert.equal(bag[0].pay, 1);
  assert.equal(bag[0].note, 'Second night complimentary');
  assert.equal(bag[0].noteBy, 'Hosted by Bride & Groom');
  assert.equal(total(bag), 145);
  assert.equal(total(pick('wedstay', 'heritage', 2)), 290, 'two guests at 145 each');
  assert.match(P.lineBasis(bag[0]), /USD 145 total per person · 2 nights · Both nights: 27 → 28 February \+ 28 February → 01 March/);
  const q = P.quote('wedstay', 'heritage');
  assert.doesNotMatch(q.basis, /^Complimentary/);
  assert.equal(q.breakfast, 'Breakfast included');
});

test('E · changing the Souphattra category replaces the one Wedding Stay item', () => {
  const before = pick('wedstay', 'heritage');
  const after = pick('wedstay', 'noble-courtyard');
  assert.equal(before.length, 1);
  assert.equal(after.length, 1);
  assert.equal(total(before), 145);
  assert.equal(total(after), 240, 'the payable amount follows the new category');
  assert.deepEqual(after.map((x) => x.id), before.map((x) => x.id), 'same id — replaced, never duplicated');
});

test('the retired two-row wedding model is gone from the data and the code', () => {
  for (const f of ['assets/rooms-data.js', 'assets/journey.js', 'your-journey.html',
                   'review.html', 'room.html', 'journeys.html']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /Valentine/i, f + ' still names the retired host');
  }
  /* Remove still clears anything an old bag saved under the two-row model */
  assert.deepEqual(P.ids('wedstay'), ['wedstay', 'wedstay-n1', 'wedstay-n2']);
});

test('F · changing a paid Kunming / Lijiang variant replaces, never duplicates', () => {
  const bag = [];
  const put = (line) => { const i = bag.findIndex((x) => x.id === line.id); if (i >= 0) bag[i] = line; else bag.push(line); };
  pick('kmg', 'milano').forEach(put);
  assert.equal(total(bag), 150);              /* USD 50 × 3 nights */
  pick('kmg', 'left-bank').forEach(put);
  assert.equal(bag.length, 1, 'one Kunming line, not two');
  assert.equal(total(bag), 261);              /* USD 87 × 3 nights */
  pick('ljg', 'snow-mountain-viewing').forEach(put);
  assert.equal(total(bag), 261 + 150);        /* USD 75 × 2 nights */
  pick('ljg', 'starry-sky').forEach(put);
  assert.equal(bag.length, 2);
  assert.equal(total(bag), 261 + 420);        /* USD 210 × 2 nights */
});

test('G · Special Express No. 25 is USD 75 per person and carries no cabin upgrade', () => {
  assert.equal(P.FLAT.train.price, 75);
  assert.doesNotMatch(P.FLAT.train.basis, /130|private single cabin/i);
  for (const f of ['journeys.html', 'your-journey.html', 'review.html', 'room.html',
                   'assets/pricing.js', 'assets/journey.js', 'assets/rooms-data.js']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /private single cabin/i, f + ' still offers the retired cabin');
  }
});

test('every accommodation window states rate, nights, total and breakfast', () => {
  const expect = { 'bkk-stay': 3, prewed: 2, wedstay: 2, kmg: 3, ljg: 2, kempinski: 2 };
  for (const [win, nights] of Object.entries(expect)) {
    const at = P.locate(win);
    const room = at.stay.rooms.find((r) => r.rate != null);
    const q = P.quote(win, room.slug);
    assert.equal(q.nights, nights, win + ' nights');
    assert.equal(q.total, q.rate * q.pay, win + ' total = rate × payable nights');
    assert.ok(q.nightly.includes('per person / night'), win + ' states its nightly rate');
    assert.match(q.basis, /total per person · \d+ nights?/, win + ' basis');
    assert.ok(q.breakfast, win + ' breakfast status');
  }
});

test('CHANGE is offered only where a genuine alternative exists', () => {
  assert.equal(P.hasVariants('prewed'), true);
  assert.equal(P.hasVariants('kmg'), true);
  assert.equal(P.hasVariants('ljg'), true);
  assert.equal(P.hasVariants('wedstay'), true);
  assert.equal(P.hasVariants('train'), false);
  assert.equal(P.hasVariants('bkk-stay'), false);
  assert.equal(P.hasVariants('kempinski'), false);
  assert.equal(P.hasVariants('mu9632'), false);
});

test('rooms are merchandised highest rate first', () => {
  for (const k of Object.keys(R)) {
    const rates = R[k].rooms.map((r) => (r.rate == null ? -1 : r.rate));
    assert.deepEqual(rates, [...rates].sort((a, b) => b - a), k + ' is not premium-first');
  }
});

test('Sathorn gallery holds eleven distinct photographs, none repeated', () => {
  const g = R.sathorn.rooms[0].gallery.map((x) => x[0]);
  assert.equal(g.length, 11);
  assert.equal(new Set(g).size, 11);
  assert.ok(!g.includes('assets/images/penthouse/living-double-height.jpg'), 'the duplicate frame is gone');
  assert.ok(g.includes('assets/images/penthouse/exterior-elevated.jpg'), 'the missing Drive 001 exterior is in');
});

test('Full Experience picks the premium ELIGIBLE room — never reserved inventory', () => {
  assert.equal(P.premium('prewed').slug, 'souphattra-majestic');   /* Presidential (750) is Bride & Groom, Grand Majestic (250) is family */
  assert.equal(P.premium('wedstay').slug, 'souphattra-majestic');
  assert.equal(P.premium('kmg').slug, 'left-bank');
  assert.equal(P.premium('ljg').slug, 'starry-sky');
  assert.equal(P.premium('kempinski').slug, 'deluxe-balcony-king');
  for (const w of ['prewed', 'wedstay', 'kmg', 'ljg']) assert.ok(!P.premium(w).reserved);
});

test('Full Experience lines come from the single pricing source, transport included', () => {
  const t = P.items('train')[0];
  assert.equal(t.price, 75); assert.equal(t.name, 'Special Express No. 25');
  assert.equal(P.items('mu9632')[0].price, 275);
  assert.equal(P.items('c642')[0].price, 85);
  assert.equal(P.items('return')[0].price, 200);
  /* the complete premium journey for one guest, as the bag would sum it */
  const all = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9632', 'kmg', 'c642', 'ljg', 'return', 'kempinski']
    .flatMap((w) => P.FLAT[w] ? P.items(w) : P.items(w, P.premium(w).slug));
  assert.equal(all.length, 10, 'ten stages, ten lines');
  /* Full Experience from empty, at the current canonical rates */
  assert.equal(total(all), 255 + 75 + 580 + 290 + 275 + 261 + 85 + 420 + 200 + 380);
  assert.equal(total(all), 2821);
});

test('Temple Ceremony is self-pay on Review & Send, the other three hosted, never a USD line', () => {
  const page = readFileSync(join(ROOT, 'review.html'), 'utf8');
  const src = page.slice(page.indexOf('<h2>The Wedding Programme</h2>'), page.indexOf('<h2>Your selections</h2>'));
  assert.match(src, /Temple Ceremony[\s\S]{0,400}Self-pay/);
  assert.doesNotMatch(src, /Temple Ceremony<\/p>[\s\S]{0,300}<span class="eh">Hosted/);
  assert.equal((src.match(/<span class="eh">Hosted<\/span>/g) || []).length, 3);
  assert.doesNotMatch(src, /USD/, 'no amount anywhere in the programme block');
});

test('Snow Mountain Viewing Room carries its own canonical photograph, used nowhere else', () => {
  const room = R.lijiang.rooms.find((r) => r.slug === 'snow-mountain-viewing');
  assert.equal(room.gallery.length, 1);
  assert.equal(room.gallery[0][0], 'assets/images/lijiang/snow-mountain-viewing-1.jpg');
  const everyOther = Object.values(R).flatMap((s) => s.rooms).filter((r) => r !== room).flatMap((r) => r.gallery.map((g) => g[0]));
  assert.ok(!everyOther.includes(room.gallery[0][0]), 'not borrowed by another room');
  for (const f of ['index.html', 'destination.html', 'accommodation.html', 'experiences.html', 'voyage.html']) {
    assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /snow-mountain-viewing-1|snow-mountain-rooftops/, f + ' uses the room photograph as scenery');
  }
  assert.equal(P.items('ljg', 'snow-mountain-viewing')[0].img, room.gallery[0][0], 'the bag line carries the same image');
});


/* ==========================================================================
   FULL EXPERIENCE IS ONE MODE — the same canonical configuration whatever the
   guest arrived from, and the Cost Saving residence never survives it.
   ========================================================================== */
test('Full Experience is ONE canonical configuration, from any starting point', () => {
  const canonical = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9632', 'kmg', 'c642', 'ljg', 'return', 'kempinski']
    .flatMap((w) => (P.FLAT[w] ? P.items(w) : P.items(w, P.premium(w).slug)));
  assert.equal(canonical.length, 10);
  assert.equal(total(canonical), 2821);
  /* stage 04 is the Souphattra Majestic Suite at one payable night — never the
     complimentary residence that answers the same stage under Cost Saving */
  const wed = canonical.find((x) => x.id === 'wedstay');
  assert.ok(wed, 'the wedding stage is answered by a Souphattra room');
  assert.equal(wed.price, 290);
  assert.equal(wed.room, 'souphattra-majestic');
  assert.ok(!canonical.some((x) => x.id === 'airbnb-2br'), 'no complimentary residence in Full Experience');
  /* and no reserved inventory anywhere in it */
  for (const w of ['prewed', 'wedstay', 'kmg', 'ljg']) assert.ok(!P.premium(w).reserved);
});

test('the ten canonical Full Experience amounts', () => {
  const expect = { 'bkk-stay': 255, train: 75, prewed: 580, wedstay: 290, mu9632: 275,
                   kmg: 261, c642: 85, ljg: 420, 'return': 200, kempinski: 380 };
  let sum = 0;
  for (const [w, amount] of Object.entries(expect)) {
    const line = P.FLAT[w] ? P.items(w)[0] : P.items(w, P.premium(w).slug)[0];
    assert.equal(line.price, amount, w);
    sum += amount;
  }
  assert.equal(sum, 2821);
});

/* ==========================================================================
   TRANSPORT SOURCE DEPTH — every leg is described, and nothing is invented.
   ========================================================================== */
test('all four transport products carry the guest-facing sections', () => {
  const T = sandbox.window.SIYL_TRANSPORT;
  const order = sandbox.window.SIYL_TRANSPORT_ORDER;
  assert.deepEqual(order, ['train', 'mu9632', 'c642', 'return']);
  for (const k of order) {
    const t = T[k];
    assert.ok(t.story && t.story.length > 80, k + ' has its own paragraph');
    assert.ok(t.facts.length >= 6, k + ' states the journey');
    assert.ok(t.groups.length >= 4, k + ' describes cabin/seat, comfort and service');
    assert.ok(t.included.length >= 3, k + ' says what is included');
    assert.ok(t.excluded.length >= 1, k + ' says what the guest arranges');
    assert.ok(t.transfer.length >= 2, k + ' says how the guest arrives and moves on');
    assert.ok(t.good.length >= 1, k + ' has a good-to-know');
    assert.ok(t.gallery.length >= 3, k + ' has verified photography');
    assert.ok(P.FLAT[k], k + ' is priced by the single calculation source');
  }
});

test('transport copy never invents, and never resurrects a superseded service', () => {
  const src = readFileSync(join(ROOT, 'assets/transport-data.js'), 'utf8');
  /* Owner overrides are production authority: the stale sheet values are gone */
  for (const stale of ['C86', 'MU9646', 'USD 105', 'USD 90']) {
    assert.ok(!src.includes(stale), 'transport copy still shows ' + stale);
  }
  /* internal procurement never reaches a guest surface */
  assert.doesNotMatch(src, /\$92|USD 92|\$3 |USD 3 per/, 'van/border procurement cost leaked');
  /* nothing invented on the night train */
  const train = sandbox.window.SIYL_TRANSPORT.train;
  const flat = JSON.stringify(train);
  for (const invented of ['Wi-Fi', 'WiFi', 'lounge', 'Lounge', 'chauffeur']) {
    assert.ok(!flat.includes(invented), 'the night train claims ' + invented);
  }
  /* and no lounge or chauffeur promised on either flight */
  for (const k of ['mu9632', 'return']) {
    const f = JSON.stringify(sandbox.window.SIYL_TRANSPORT[k]);
    assert.ok(!/lounge|chauffeur|priority boarding/i.test(f), k + ' promises an unsourced service');
  }
});

test('the Owner-overridden transport facts are the ones on the page', () => {
  const T = sandbox.window.SIYL_TRANSPORT;
  assert.match(JSON.stringify(T.c642.facts), /C642/);
  assert.match(JSON.stringify(T.c642.facts), /16:39/);
  assert.match(JSON.stringify(T.c642.facts), /21:06/);
  assert.match(JSON.stringify(T.c642.facts), /4 hours 27 minutes/);
  assert.equal(P.FLAT.c642.price, 85);
  assert.match(JSON.stringify(T.mu9632.facts), /MU9632/);
  assert.match(JSON.stringify(T.mu9632.facts), /14:00/);
  assert.match(JSON.stringify(T.mu9632.facts), /16:40/);
  assert.equal(P.FLAT.mu9632.price, 275);
  assert.equal(P.FLAT.train.price, 75);
  assert.equal(P.FLAT['return'].price, 200);
});

/* ==========================================================================
   ACCOMMODATION SOURCE DEPTH
   ========================================================================== */
test('every room carries its own paragraph — no two rooms read the same', () => {
  const stories = [];
  for (const k of Object.keys(R)) {
    for (const room of R[k].rooms) {
      assert.ok(room.story && room.story.length > 60, k + '/' + room.slug + ' has no story');
      stories.push(room.story);
    }
  }
  assert.equal(new Set(stories).size, stories.length, 'a room paragraph is repeated');
});

test('Sathorn, Souphattra and Kempinski carry grouped, source-backed amenities', () => {
  const sath = R.sathorn.rooms[0];
  assert.equal(sath.rate, 85);
  assert.ok(sath.groups.length >= 6, 'the penthouse is grouped, not a wall of text');
  const flat = JSON.stringify(sath.groups);
  for (const fact of ['710 Mbps', 'Nespresso', 'Harman Kardon', 'Casiotone', 'Washing machine',
                      'High chair', 'Travel crib', 'keybox', 'Free parking', 'Smart TVs']) {
    assert.ok(flat.includes(fact), 'the penthouse is missing ' + fact);
  }
  assert.match(JSON.stringify(sath.facts), /162 sq\.m\./);

  for (const room of R.souphattra.rooms) {
    assert.ok(room.groups.length === 5, room.slug + ' is not grouped');
    assert.ok(room.facts.length >= 5, room.slug + ' has too few facts');
  }
  /* the categories must not read identically */
  assert.match(JSON.stringify(R.souphattra.rooms.find((r) => r.slug === 'noble-courtyard').groups), /Two bathrooms/);
  assert.match(JSON.stringify(R.souphattra.rooms.find((r) => r.slug === 'heritage-grand-premier').groups), /Afternoon tea/);
  assert.match(JSON.stringify(R.souphattra.rooms.find((r) => r.slug === 'heritage-executive').groups), /Connecting door/);

  const kem = R.kempinski.rooms[0];
  assert.match(JSON.stringify(kem.facts), /45 sq\.m\./);
  assert.ok(!JSON.stringify(kem.facts).includes('37'), 'the Deluxe Twin size is not this room');
  assert.match(JSON.stringify(kem.groups), /Royal Wing/);
  assert.match(JSON.stringify(kem.groups), /marble bathroom/i);
});

test('every stay says what is included and what the guest arranges', () => {
  for (const k of Object.keys(R)) {
    assert.ok(R[k].includes && R[k].includes.length >= 4, k + ' has no inclusions');
  }
  assert.match(R.sathorn.includes.join(' '), /Breakfast is NOT included/);
  assert.match(R.kempinski.includes.join(' '), /Breakfast included/);
  assert.match(R.souphattra.includes.join(' '), /no night between 25 February and 1 March is left uncovered/);
});
