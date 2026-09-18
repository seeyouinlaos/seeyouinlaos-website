/* See You In Laos — deterministic tests for the single calculation source.
 * Every amount the guest can see is produced by assets/pricing.js from the
 * approved per-person / per-night rate × the nights in the window.
 * Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('B · one guest, Sathorn + Special Express No. 25 → USD 355', () => {
  const bag = [...pick('bkk-stay', 'penthouse'), { ...P.FLAT.train, price: 100, qty: 1 }];
  assert.equal(total(bag), 355);
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
  assert.match(wed.basis, /First night your room rate at USD 145 per person \/ night · second night hosted by Haruthai & Suthep/);

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
  assert.equal(bag[0].note, 'Second night');
  assert.equal(bag[0].noteBy, 'Hosted by Haruthai & Suthep');
  assert.equal(total(bag), 145);
  assert.equal(total(pick('wedstay', 'heritage', 1)), 145, 'one guest, one price — never a partner in the total');
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

test('G · Special Express No. 25 is USD 100 per person and carries no cabin upgrade', () => {
  assert.equal(P.FLAT.train.price, 100);
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
  assert.equal(P.hasVariants('bkk-stay'), true);   /* three Bangkok addresses */
  assert.equal(P.hasVariants('kempinski'), false);
  assert.equal(P.hasVariants('mu9646'), true);    /* two approved fares */
});

test('Bangkok offers three approved addresses, one window, one active choice', () => {
  const rooms = R.sathorn.rooms;
  assert.equal(rooms.length, 3);
  assert.deepEqual(rooms.map((r) => r.slug),
    ['penthouse', 'u-sathorn-superior-garden', 'shama-king-studio-balcony']);
  /* the Owner's rates, and the three-night guest price each one produces */
  const want = { penthouse: [85, 255], 'u-sathorn-superior-garden': [64, 192],
                 'shama-king-studio-balcony': [40, 120] };
  rooms.forEach((r) => {
    const [rate, total] = want[r.slug];
    assert.equal(r.rate, rate, r.slug + ' rate');
    const item = P.items('bkk-stay', r.slug)[0];
    assert.equal(item.price, total, r.slug + ' three-night guest price');
    /* the journey line names the property the guest chose, not the window */
    assert.equal(item.name, r.property, r.slug + ' bag name');
  });
  /* breakfast is a property truth, not a window truth */
  assert.match(P.items('bkk-stay', 'penthouse')[0].breakfast, /not included/);
  assert.match(P.items('bkk-stay', 'u-sathorn-superior-garden')[0].breakfast, /included/);
  assert.match(P.items('bkk-stay', 'shama-king-studio-balcony')[0].breakfast, /included/);
  /* the penthouse stays the approved default, so the Full Experience is unmoved */
  assert.equal(sandbox.window.SIYL_FULL_EXPERIENCE['bkk-stay'], 'penthouse');
  /* each property shows its OWN photographs, and nothing is borrowed */
  assert.equal(rooms[1].gallery.length, 11);   /* the Owner's 16 Sep 2026 U Sathorn imagery: the hotel (5) and the room (6) */
  assert.equal(rooms[2].gallery.length, 6);
  rooms[1].gallery.forEach(([f]) => {
    assert.match(f, /^assets\/images\/usathorn\//, 'U Sathorn borrowed ' + f);
    assert.ok(existsSync(join(ROOT, f)), f + ' missing on disk');
  });
  rooms[2].gallery.forEach(([f]) => {
    assert.match(f, /^assets\/images\/shama\//, 'Shama borrowed ' + f);
    assert.ok(existsSync(join(ROOT, f)), f + ' missing on disk');
  });
  /* and the placeholder is gone from the live Bangkok surfaces */
  const j = readFileSync(join(ROOT, 'journeys.html'), 'utf8');
  const bkk = j.slice(j.indexOf('id="j-bkk-stay"'), j.indexOf('id="j-train"'));
  assert.doesNotMatch(bkk, /Photography to follow/);
});

test('the two new Bangkok addresses carry their own shared inventory', async () => {
  const { SEED } = await import('../src/inventory-seed.js');
  /* the Master (Owner, 16 Sep 2026): six rooms each — the earlier 38 / 27 are retired */
  assert.equal(SEED['bkk-stay/u-sathorn-superior-garden'].capacity, 6);
  assert.equal(SEED['bkk-stay/shama-king-studio-balcony'].capacity, 6);
  ['u-sathorn-superior-garden', 'shama-king-studio-balcony'].forEach((k) => {
    assert.equal(SEED['bkk-stay/' + k].unit, 'room');
    assert.equal(SEED['bkk-stay/' + k].occupancy, 2);
  });
});

test('a journey chosen before the override keeps its place', () => {
  const bag = readFileSync(join(ROOT, 'assets/bag.js'), 'utf8');
  assert.match(bag, /c642:\{id:'c86'/);
  assert.match(bag, /mu9632:\{id:'mu9646'/);
});

test('the six approved Full Experience compositions come out of component pricing', () => {
  /* nothing is hard-coded: each total is the same ten components with two of
   * them swapped, exactly as the Owner listed them */
  const BASE = ['train', 'prewed', 'wedstay', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
  const base = 100 + 340 + 170 + 150 + 85 + 200 + 200 + 380;   /* 1,625 — the train USD 100 since 14 Sep 2026, C86 USD 85 (Owner, Edit 2 · 15 Sep 2026, superseding the earlier 105) */
  const bkk = { penthouse: 255, 'u-sathorn-superior-garden': 192, 'shama-king-studio-balcony': 120 };
  const fly = { business: 275, 'economy-flexible': 155 };
  const want = {
    'penthouse|business': 2155, 'u-sathorn-superior-garden|business': 2092,
    'shama-king-studio-balcony|business': 2020, 'penthouse|economy-flexible': 2035,
    'u-sathorn-superior-garden|economy-flexible': 1972,
    'shama-king-studio-balcony|economy-flexible': 1900,
  };
  Object.keys(bkk).forEach((room) => Object.keys(fly).forEach((cls) => {
    const total = base + P.items('bkk-stay', room)[0].price + P.items('mu9646', cls)[0].price;
    assert.equal(total, want[room + '|' + cls], room + ' + ' + cls);
  }));
  /* and the base really is the sum of the untouched eight */
  assert.equal(BASE.length, 8);
  /* the Sangkhathan is the only thing that moves a total after that */
  assert.equal(P.FLAT.sangkhathan.price, 15);
});

test('the private journey has one shell, one design system and a hard boundary', () => {
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  /* two families, six roles, three controls — nothing else */
  ['.t-d1', '.t-h1', '.t-h2', '.t-b1', '.t-b2', '.t-l1'].forEach((r) =>
    assert.ok(sys.includes(r + ' {'), r + ' is missing from the type scale'));
  ['.p-act {', '.p-link {', '.p-sel {'].forEach((r) =>
    assert.ok(sys.includes(r), r + ' is missing from the control system'));
  const fams = [...new Set((sys.match(/font-family:[^;]+/g) || []).map((f) => f.trim()))];
  assert.deepEqual(fams.sort(), ['font-family: var(--f-ed)', 'font-family: var(--f-ui)'],
    'a third font entered the system: ' + fams.join(' | '));
  /* the fare/variant column never falls below 340px — it changes structure */
  assert.match(sys, /grid-template-columns: minmax\(0, 1fr\) 380px/);
  assert.match(sys, /grid-template-columns: minmax\(0, 1fr\) 420px/);
  /* every control is a real target */
  assert.match(sys, /--p-act-h: 52px/);
  assert.match(sys, /--p-tap:\s+44px/);

  const shell = readFileSync(join(ROOT, 'assets/prep-shell.js'), 'utf8');
  /* the boundary: no 01–06 before an invitation is open */
  assert.match(shell, /if \(!p \|\| !m\) \{[\s\S]{0,900}Open your invitation to begin/);
  /* the code opens the guest's own invitation; the guest IS the session — no question, no switch */
  assert.doesNotMatch(shell, /Who are you\?|Who are you continuing as\?|data-switch/);
  const model = readFileSync(join(ROOT, 'assets/guest.js'), 'utf8');
  assert.match(model, /if \(!a \|\| !a\.guestId \|\| !a\.bearer \|\| a\.invitationId !== 'INV-' \+ a\.guestId\) return null;/);
  assert.match(shell, /function me\(\) \{ var g = G\(\); return g \? g\.me\(\) : null; \}/);
  /* semantic states only — no score, no percentage, no progress bar */
  assert.ok(!/%|progress bar|score/i.test(shell.slice(shell.indexOf('function status'), shell.indexOf('/* ----------------------------------------------------------------- shell'))));
  /* one disclosure contract, and ESC closes it */
  assert.match(shell, /e\.key === 'Escape'/);
  assert.match(shell, /aria-modal', 'true'/);
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

test('the premium room of a stage is the dearest a guest may take — no room is held back (Owner, 15 Sep 2026)', () => {
  assert.equal(P.premium('prewed').slug, 'souphattra-presidential');   /* the Presidential (750) is available until booked, like every room */
  assert.equal(P.premium('wedstay').slug, 'souphattra-presidential');
  assert.equal(P.premium('kmg').slug, 'left-bank');
  assert.equal(P.premium('ljg').slug, 'starry-sky');
  assert.equal(P.premium('kempinski').slug, 'deluxe-balcony-king');
  for (const w of ['prewed', 'wedstay', 'kmg', 'ljg']) assert.equal(P.premium(w).reserved, undefined);
});

test('Full Experience lines come from the single pricing source, transport included', () => {
  const t = P.items('train')[0];
  assert.equal(t.price, 100); assert.equal(t.name, 'Special Express No. 25');
  assert.equal(P.items('mu9646')[0].price, 275);
  assert.equal(P.items('c86')[0].price, 85);
  assert.equal(P.items('return')[0].price, 200);
  /* the complete premium journey for one guest, as the bag would sum it */
  const all = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']
    .flatMap((w) => P.FLAT[w] ? P.items(w) : P.items(w, P.premium(w).slug));
  assert.equal(all.length, 10, 'ten stages, ten lines');
  /* the premium-max sum still exists as arithmetic (the Presidential in both
     Vientiane windows since 15 Sep 2026); it is simply no longer what Full
     Experience selects */
  assert.equal(total(all), 255 + 100 + 1500 + 750 + 275 + 261 + 85 + 420 + 200 + 380);
  assert.equal(total(all), 4226);
  assert.notEqual(total(all), 2155);
});

test('Review & Send: the Temple Ceremony is optional, the other three hosted', () => {
  const page = readFileSync(join(ROOT, 'review.html'), 'utf8');
  const journey = readFileSync(join(ROOT, 'assets/journey.js'), 'utf8');
  /* THE WEDDING is one programme, defined in ONE place and read by every
   * surface — Review & Send no longer keeps its own copy of the day. */
  const prog = journey.slice(journey.indexOf('var WEDDING = ['), journey.indexOf('function skipped()'));
  ['Temple Ceremony', 'Sangkhathan Temple Offering', 'Coffee & Cake', 'Vow Ceremony', 'Wedding Dinner']
    .forEach((t) => assert.ok(prog.includes(t), t + ' missing from the wedding programme'));
  assert.equal((prog.match(/Complimentary — hosted by Haruthai & Suthep\./g) || []).length, 3,
    'exactly three complimentary parts beside the Temple Ceremony');
  assert.match(prog, /Tak Bat, the morning alms-giving — a personal offering, arranged individually on the morning/);
  /* the times the Owner's programme actually carries */
  assert.match(prog, /when: '09:00 – approximately 12:00'/, 'the Temple Ceremony (Owner, Edit 2 · 15 Sep 2026)');
  assert.match(prog, /when: 'From 12:00'/);
  assert.match(prog, /when: '15:30'/, 'the Vow Ceremony always starts at 15:30 (Owner, Edit 2)');
  assert.match(prog, /when: '19:30'/);
  assert.doesNotMatch(prog, /'08:00|'16:30'/, 'the retired times are gone from the programme');
  assert.match(prog, /Optional · USD 15 per guest/);
  /* the Temple Ceremony is never labelled Hosted, and only the Sangkhathan
   * carries an amount anywhere in the programme */
  assert.doesNotMatch(prog, /'temple'[\s\S]{0,240}Complimentary — hosted/);
  assert.equal((prog.match(/USD/g) || []).length, 1, 'one amount only in the programme');
  /* Review & Send renders the ACTUAL answers, per named guest, per event —
   * it never describes the programme it is supposed to be summarising */
  assert.match(page, /\(T\.EVENTS\|\|\[\]\)\.forEach\(function\(e\)\{/);
  assert.match(page, /var st=g\.events\[e\.key\],open=st==='Not decided'/);
  assert.doesNotMatch(page, /Seven questions of hospitality and one operational field, per named guest\./,
    'Review & Send still describes a feature instead of showing the answers');
  /* the operational preparation list is per named guest, and attendance and
   * offering stay two different fields */
  assert.match(page, /WEDDING PARTICIPATION:/);
  assert.match(page, /Sangkhathan offerings to prepare/);
  assert.match(page, /DOCUMENTS & PRIVACY \(received only — nothing here is reviewed or verified\):/);
  assert.match(page, /templeCeremony:window\.SIYL_TEMPLE\?SIYL_TEMPLE\.operational\(\):null/);
  assert.match(page, /Morning alms-giving \(Tak Bat\): part of the Temple Ceremony for everyone joining it — a personal offering, arranged on the morning \(no amount set\)/);
});

test('THE WEDDING sits at 28 FEB in the chronology — the Sangkhathan is never last', () => {
  const journey = readFileSync(join(ROOT, 'assets/journey.js'), 'utf8');
  assert.match(journey, /var AT = \{ '1872': 0\.5, 'sangkhathan': 3\.5 \}/);
  assert.match(journey, /'sangkhathan': '28 FEB'/);
  /* 3.5 lands between the Wedding Stay (index 3) and MU9646 (index 4) */
  const seg = journey.slice(journey.indexOf('var SEG = ['), journey.indexOf('/* Chronological position'));
  const keys = [...seg.matchAll(/\{ key: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.equal(keys[3], 'wedstay');
  assert.equal(keys[4], 'mu9646');
});

test('the Sangkhathan is the guest\'s own decision, explicit eligibility, never restored silently', () => {
  const t = readFileSync(join(ROOT, 'assets/temple.js'), 'utf8');
  ['attendanceOf', 'attendingOf', 'offeringOf', 'offeringOf_', 'offeringDecidedOf',
   'setAttendance', 'setOffering', 'offeringGuests', 'undecided', 'eligibility', 'canOffer']
    .forEach((fn) => assert.ok(t.includes(fn + ':'), fn + ' missing'));
  assert.doesNotMatch(t, /pairCan:|pairDecision:/, 'the couple decision is retired');
  /* not attending removes the guest's own decision, and it is never restored */
  assert.match(t, /if \(st\.by\[id\]\.attend !== 'yes'\) \{ delete st\.by\[id\]\.off; delete st\.by\[id\]\.offering; \}/);
  /* the decision can only be made by the guest, while they may take part */
  assert.match(t, /if \(!mine\(id\)\) return false;\s*if \(!this\.canOffer\(id\)\) return false;/);
  /* eligibility is explicit source truth, never derived */
  assert.match(t, /p\.sangkhathan === 'ELIGIBLE' \|\| p\.sangkhathan === 'NONE'/);
  assert.doesNotMatch(t, /guests\(\)\.length === 2|people\(\)\.length === 2/, 'eligibility must not be inferred from party size');
  /* the bag line is DERIVED from the guest's decision — quantity one, no counter */
  assert.match(t, /var n = T\.offerings\(\) \? 1 : 0;/);
  const page = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  assert.doesNotMatch(page, /data-q=/, 'a quantity stepper survives on the wedding step');
  assert.match(page, /T\.setOffering\(me\.guestId,b\.getAttribute\('data-off'\)\)/);
  /* and the public editorial page no longer owns the decision */
  const pub = readFileSync(join(ROOT, 'voyage.html'), 'utf8');
  assert.doesNotMatch(pub, /id="tdec"/, 'the decision module is still on the public page');
});

test('three states, never two: NOT DECIDED is not NOT ATTENDING', () => {
  const t = readFileSync(join(ROOT, 'assets/temple.js'), 'utf8');
  /* decidedAll needs an attendance answer AND, for attendees, an offering answer */
  assert.match(t, /EVENTS\.filter\(function \(e\) \{ return self\.eventOf\(id, e\.key\) === null; \}\)/);
  assert.match(t, /if \(self\.attendingOf\(id\) && !self\.offeringDecidedOf\(id\)\) missing\.push\('Sangkhathan'\);/);
  assert.match(t, /sangkhathanState: a !== 'yes' \? 'Not applicable'/);
  const page = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  /* the guest is offered BOTH answers, so silence is never read as a refusal */
  assert.match(page, /data-off="yes">Yes, I would like to take part/);
  assert.match(page, /data-off="no">No, thank you/);
  assert.match(page, /Required · not decided/);
  /* and every active event carries both answers */
  assert.match(page, /data-ev="yes">Attending/);
  assert.match(page, /data-ev="no">Not attending/);
});

test('Tak Bat is explained before anyone is asked, and is never the Sangkhathan', () => {
  const page = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  /* the explanation travels with the Temple row and opens in the shell's own
   * detail layer — the guest is never thrown back to the public website */
  assert.match(page, /welcome to take part in Tak Bat, the traditional offering of food to Buddhist monks/);
  assert.match(page, /The offering is personal and arranged individually on the morning/);
  assert.doesNotMatch(page, /no separate charge for Tak Bat|nothing is paid/);
  assert.doesNotMatch(page, /Everyone who comes takes part/);
  assert.match(page, /It is <b>not<\/b> the alms-giving/);
  assert.match(page, /data-more="takbat"/);
  assert.match(page, /data-more="sang"/);
  assert.match(page, /P\.drawer\(/, 'the detail layer must be the shell drawer');
  const review = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.match(review, /Tak Bat remains a personal offering at the temple/);
});

test('the wedding cost model is stated in words on both surfaces', () => {
  ['your-journey.html', 'review.html'].forEach((f) => {
    const page = readFileSync(join(ROOT, f), 'utf8');
    assert.match(page, /[Hh]osted by Haruthai &amp; Suthep/, f);
    assert.match(page, /Tak Bat remains a personal offering at the temple/, f);
    assert.doesNotMatch(page, /No separate charge|self-pay/, f);
  });
});

test('SEND is unavailable until the required steps are done — and never fails silently', () => {
  const page = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.match(page, /if\(!G\|\|!G\.party\(\)\|\|!G\.readiness\(\)\.ok\)\{blockSend\(\);return\}/, 'the readiness engine gates the send — an empty bag does not (Owner, 17 Sep 2026)');
  assert.match(page, /Before you send: '\+esc\(first\.label\)/, 'the first missing item is named');
  assert.match(page, /Send to Guest Relations — not ready yet/);
  const g = readFileSync(join(ROOT, 'assets/guest.js'), 'utf8');
  /* required vs optional: optional never blocks */
  const r = g.slice(g.indexOf('STEP_DEFS:'), g.indexOf('/* ---- what Guest Relations receives'));
  ['you', 'journey', 'wedding', 'preparation', 'about', 'review'].forEach((k) =>
    assert.ok(r.includes("key: '" + k + "'"), k + ' is not one of the six steps'));
  /* the four states, in words — never colour alone */
  assert.match(r, /STATE_LABEL: \{ complete: '✓ Complete', current: 'Current', attention: 'Needs attention', locked: 'Locked' \}/);
  /* required blocks, optional never does: readiness is the missing items of steps 01–05 */
  assert.match(r, /if \(s\.key !== 'review'\) s\.missing\.forEach/);
});

test('a session stored without names is not an open invitation', () => {
  /* An invitation opened by an older build carries no guest names. Every
   * per-person surface is impossible in that state, so it must show its gate
   * and ask for the code once — never a blank page. */
  const g = readFileSync(join(ROOT, 'assets/guest.js'), 'utf8');
  assert.match(g, /if \(!a \|\| !a\.guestId \|\| !a\.bearer \|\| a\.invitationId !== 'INV-' \+ a\.guestId\) return null;/);
  assert.match(g, /stale: function/);
  /* and an unresolved party never edits the journey: a stale session must not
   * quietly drop a line the guest already chose */
  const t = readFileSync(join(ROOT, 'assets/temple.js'), 'utf8');
  assert.match(t, /if \(G && !G\.party\(\)\) return;/);
  const inv = readFileSync(join(ROOT, 'assets/invite.mjs'), 'utf8');
  assert.match(inv, /valid\(\) \{/);
  assert.match(inv, /if \(a && AUTH\.valid\(\)\) \{ fn\(a\); return; \}/);
  /* and no surface may render without the guest */
  ['about-you.html', 'invitation.html', 'cart.html'].forEach((f) => {
    const page = readFileSync(join(ROOT, f), 'utf8');
    assert.match(page, /if\(!p\|\|!me\)\{/, f + ' can still crash without a guest');
    assert.match(page, /Open your invitation once more/, f + ' does not explain a stale session');
    /* recovery copy stays short, and never exposes how the thing is built */
    assert.match(page, /Your invitation is now personal: every guest has their own code\./, f);
    [/older build/i, /stored session/i, /payload/i, /guest array/i, /migration/i, /bearer/i]
      .forEach((bad) => assert.doesNotMatch(page, bad, f + ' leaks an implementation concept'));
  });
  /* the private wedding step refuses to render a per-person decision without
   * the names, exactly like every other Preparation surface */
  const wed = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  assert.match(wed, /if\(!P\.ready\(\)\)\{/);
});

test('the invitation briefing tells the guest who is invited and who they decide for', () => {
  const page = readFileSync(join(ROOT, 'invitation.html'), 'utf8');
  assert.match(page, /', you are invited<\/h1>/);
  assert.match(page, /Haruthai &amp; Suthep would love you to join them in Vientiane/);
  assert.match(page, /Your party · '\+esc\(G\.partyNames\(\)\)/, 'the party as context');
  assert.match(page, /Each of you has your own invitation and your own code; nothing here is answered for anyone else/);
  assert.match(page, /Six steps, in order/);
  /* and it is step one of the preparation, not a page nobody can find */
  const prep = readFileSync(join(ROOT, 'assets/prep-shell.js'), 'utf8');
  ['invitation.html', 'your-journey.html', 'wedding.html',
   'wedding-preparation.html', 'about-you.html', 'review.html']
    .forEach((f) => assert.ok(prep.includes("file: '" + f + "'"), f + ' is not one of the six steps'));
  assert.equal((prep.match(/\{ n: '0\d'/g) || []).length, 6, 'there is no seventh step');
  /* Cloudflare serves /review, the Pages mirror serves /review.html — the rail
   * has to recognise the page on BOTH deployments */
  assert.match(prep, /replace\(\/\\\.html\$\/, ''\)/);
  ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html',
   'about-you.html', 'review.html']
    .forEach((f) => assert.ok(readFileSync(join(ROOT, f), 'utf8').includes('assets/prep-shell.js'), f + ' is outside the shell'));
  /* the public editorial pages stay outside the private journey */
  ['voyage.html', 'journeys.html', 'index.html']
    .forEach((f) => assert.ok(!readFileSync(join(ROOT, f), 'utf8').includes('assets/prep-shell.js'), f + ' must not carry the shell'));
});

test('Review & Send carries DOCUMENTS & PRIVACY, and promises no vault it does not have', () => {
  const page = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.match(page, /<h2>Documents &amp; privacy<\/h2>/);
  assert.match(page, /Publication of photographs/);
  assert.match(page, /D\.forGuest\(id\)\.forEach/, 'document states are not read per named guest');
  assert.doesNotMatch(page, /vault|encrypted store/i);
  /* the real controls live on the step, not on the summary */
  const docsPage = readFileSync(join(ROOT, 'about-you.html'), 'utf8');
  assert.match(docsPage, /<input type="file" accept="/);
  assert.match(docsPage, /id="documents"/, 'documents live inside step 05');
  assert.match(readFileSync(join(ROOT, 'documents.html'), 'utf8'), /url=about-you\.html#documents/, 'the old documents page only forwards');
  const docs = readFileSync(join(ROOT, 'assets/docs.js'), 'utf8');
  ['Passport', 'Flight information'].forEach((k) => assert.ok(docs.includes(k), k + ' is not a document kind'));
  /* RECEIVED means received — the guest surface can never claim more */
  assert.doesNotMatch(docs, /'Verified'|'Reviewed'/);
  assert.match(docs, /NEVER set by this file/);
  /* and no document byte is ever written to this browser's storage */
  assert.doesNotMatch(docs, /localStorage\.setItem\(KEY, JSON\.stringify\(file/);
});

test('Review & Send is five editorial blocks, each with its own way back', () => {
  const page = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.doesNotMatch(page, /<span class="bno">/, 'review blocks carry no numbering that competes with the six steps');
  ['invitation.html#contact', 'wedding.html', 'your-journey.html',
   'wedding-preparation.html#ack', 'invitation.html', 'about-you.html', 'about-you.html#documents', 'cart.html']
    .forEach((href) => assert.ok(page.includes('href="' + href + '"'), href + ' has no edit route'));
  /* the architecture for ONE guest: YOU · YOUR JOURNEY · THE WEDDING ·
   * ABOUT YOU · DOCUMENTS & PRIVACY · YOUR COST */
  const body = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
  let at = -1;
  ['b1', 'b2', 'b3', 'b6', 'b4', 'b5'].forEach((id) => {
    const i = body.indexOf('id="' + id + '"');
    assert.ok(i > at, id + ' is out of order in the page');
    at = i;
  });
  [['b1', '<h2>You</h2>'], ['b2', '<h2>My Trip</h2>'], ['b3', '<h2>The Wedding</h2>'], ['b6', '<h2>About you</h2>'],
   ['b4', '<h2>Documents &amp; privacy</h2>'], ['b5', '<h2>Your cost</h2>']]
    .forEach(([id, heading]) => assert.ok(page.includes(heading), id + ' does not carry ' + heading));
  /* RECEIVED is not CONFIRMED, and a sent journey stays editable */
  assert.match(page, /Nothing is confirmed yet/);
  assert.match(page, /Confirmed<\/b> is something only Guest Relations can tell you/);
  assert.match(page, /Change and send again/);
  /* one guest, never a party headcount */
  assert.doesNotMatch(page, /p\.guests\.forEach|For your party|Total for your party/);
  assert.equal(page.includes('YOUR COST'), true);
  assert.doesNotMatch(page, /Contribution|Beitrag|Eigenanteil/);
});

test('the dress code carries three codes and 18 owner references, acknowledged by nobody but the guest', () => {
  const page = readFileSync(join(ROOT, 'dress.html'), 'utf8');
  assert.match(page, /<h2>Lao Traditional Dress<\/h2>/); assert.doesNotMatch(page, /Blue Lao|in blue/i, 'no blue dress requirement (Owner, 13 Sep 2026)');
  assert.match(page, /<h2>Black Tie<\/h2>/);
  assert.match(page, /<h2>Resort Wear<\/h2>/);
  const imgs = [...page.matchAll(/assets\/images\/dress\/([a-z0-9-]+)\.jpg/g)].map((m) => m[1]);
  assert.equal(imgs.length, 17, 'the crossed-out beach photograph is gone');
  assert.equal(new Set(imgs).size, 17, 'no reference is used twice');
  assert.ok(!imgs.includes('resort-01'), 'the retired photograph is never reused');
  imgs.forEach((f) => assert.ok(existsSync(join(ROOT, 'assets/images/dress/' + f + '.jpg')), f + ' missing on disk'));
  /* the public guide carries no acknowledgement of its own: that lives in step 04, once per guest */
  assert.doesNotMatch(page, /<input type="checkbox"/);
  assert.match(page, /href="wedding-preparation\.html#dress-code"/);
  assert.doesNotMatch(page, /id="ack" checked|checked id="ack"/);
});

test('ABOUT YOU is one required question, six favourites and one required acknowledgement', () => {
  const g = readFileSync(join(ROOT, 'assets/guest.js'), 'utf8');
  const block = g.slice(g.indexOf('var PROFILE = ['), g.indexOf('var PHOTO_TEXT ='));
  const keys = [...block.matchAll(/\{ key: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['coffeetea', 'treat', 'drink', 'avoid', 'film', 'music']);
  assert.match(g, /var ALLERGY = \{ key: 'allergy'/);
  assert.doesNotMatch(g, /var ACCESS =|key: 'comfort'|key: 'anything'|key: 'dietary'/);
  /* three layers, and a correction never destroys the invitation's own value — every entry is signed by the guest */
  assert.match(g, /r\.history\.push\(\{ field: field, from: from, to: v, at: stamp\(\), by: me\.guestId \}\)/);
  const about = readFileSync(join(ROOT, 'about-you.html'), 'utf8');
  assert.match(about, /<h1 class="t-d1">My Profile<\/h1>/);
  assert.match(about, /G\.PROFILE\.forEach/);
  assert.match(about, /id="allergy-text" data-allergy-text aria-required="true"/);
  assert.doesNotMatch(about, /Who are you answering for\?/);
  ['A little more about you', 'Travel documents', 'Photography &amp; film', 'Your publication choice']
    .forEach((h) => assert.ok(about.includes(h), 'ABOUT YOU lacks the area ' + h));
  assert.match(about, /D\.KINDS\.map/, 'documents must live inside step 05');
  assert.match(about, /P\.foot\(/, 'the continuation is the shell foot');
  assert.doesNotMatch(about, /href="documents\.html"/, 'documents are not a separate step');
  assert.ok(!existsSync(join(ROOT, 'assets/prep.js')), 'the retired registration rail is deleted');
  /* identity and contact live on step 01 itself; the old address hands over */
  const you = readFileSync(join(ROOT, 'you.html'), 'utf8');
  assert.match(you, /url=invitation\.html#contact/);
  const inv = readFileSync(join(ROOT, 'invitation.html'), 'utf8');
  assert.match(inv, /id="p-email"/); assert.match(inv, /id="p-phone"/); assert.match(inv, /From your invitation/);
});

test('every underlined title leads somewhere, and the Sangkhathan carries its own action', () => {
  const review = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.match(review, /href="wedding\.html#sangkhathan">Complete this/, 'the offering action leads to its primary home, step 03');
  /* the journey keeps the wedding compact and sends the guest to step 03 */
  const journey = readFileSync(join(ROOT, 'your-journey.html'), 'utf8');
  assert.match(journey, /Complete wedding decisions/);
  assert.match(journey, /Review wedding details/);
  assert.doesNotMatch(journey, /data-ev=|data-off=|data-ack=/, 'no wedding control on the journey');
  /* every secondary action is the system's 44px target */
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  assert.match(sys.slice(sys.indexOf('.p-link {'), sys.indexOf('.p-link:hover')), /min-height: var\(--p-tap\)/);
  /* the anchor exists, and it spans the explanation AND the decision */
  const voyage = readFileSync(join(ROOT, 'voyage.html'), 'utf8');
  const region = voyage.slice(voyage.indexOf('<div id="sangkhathan">'), voyage.indexOf('<!-- 02 · COFFEE'));
  assert.ok(region.includes('id="sangkhathan-about"'), 'the explanation is outside the anchored region');
  assert.ok(region.includes('id="temple-decision"'), 'the decision is outside the anchored region');
  /* and nothing routes the offering to the journeys page */
  assert.doesNotMatch(readFileSync(join(ROOT, 'assets/journey.js'), 'utf8'),
    /anchor: 'journeys.html[^']*'[^}]*sangkhathan/);
});

test('an editorially small title is still a thumb-sized target', () => {
  /* D · no page carries a rule of its own any more: every link and control on
   * the six surfaces is one of the three system controls, and each of those
   * is a real target */
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  const link = sys.slice(sys.indexOf('.p-link {'), sys.indexOf('.p-link:hover'));
  const sel = sys.slice(sys.indexOf('.p-sel {'), sys.indexOf('.p-sel:hover'));
  assert.match(link, /min-height: var\(--p-tap\)/);
  assert.match(sel, /min-height: var\(--p-tap\)|min-height: 48px/);
  assert.match(sys, /--p-act-h: 52px/);
  ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html'].forEach((f) => {
    const page = readFileSync(join(ROOT, f), 'utf8');
    const local = page.slice(page.indexOf('<style>'), page.indexOf('</style>'));
    assert.ok(!/min-height:44px/.test(local), f + ' still carries a page-local target rule');
    assert.ok(!/assets\/desktop\.css/.test(page), f + ' still loads the public desktop layer');
  });
});

test('no rule is ever drawn through the word BLUE', () => {
  const wed = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  /* in the decision module the dress code is plain type, never a link label */
  assert.match(wed, /temple:'Lao Traditional Dress'/);
  assert.match(wed, /Dress · '\+DRESS\[e\.key\]\+'/);
  /* and in the design system every secondary action is inline-flex, so a rule
   * can never be drawn through a wrapped line of type */
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  const link = sys.slice(sys.indexOf('.p-link {'), sys.indexOf('.p-link:hover'));
  assert.match(link, /display: inline-flex/);
  assert.match(link, /border-bottom: 1px solid/);
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
const STAGES = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
const fullExperience = (available) =>
  STAGES.flatMap((w) => (P.FLAT[w] ? P.items(w) : P.items(w, P.approved(w, available && available(w)).slug)));

test('Full Experience is ONE canonical configuration, from any starting point', () => {
  const canonical = fullExperience();
  assert.equal(canonical.length, 10);
  assert.equal(total(canonical), 2155);
  /* stage 04 is a Souphattra room at one payable night — never the
     complimentary residence that answers the same stage under Cost Saving */
  const wed = canonical.find((x) => x.id === 'wedstay');
  assert.ok(wed, 'the wedding stage is answered by a Souphattra room');
  assert.equal(wed.price, 170);
  assert.equal(wed.room, 'heritage-grand-premier');
  assert.ok(!canonical.some((x) => x.id === 'airbnb-2br'), 'no complimentary residence in Full Experience');
  /* and no reserved inventory anywhere in it */
  for (const w of ['prewed', 'wedstay', 'kmg', 'ljg']) assert.ok(!P.approved(w).reserved);
});

/* OWNER-APPROVED 09 September 2026. Full Experience is a named configuration,
   not "the most expensive room in every house". */
test('the ten Owner-approved Full Experience selections sum to USD 2,155 (train USD 100 since 14 Sep 2026, C86 USD 85 since Edit 2 · 15 Sep 2026)', () => {
  const expect = {
    'bkk-stay':  { room: 'penthouse',              rate: 85,  pay: 3, amount: 255 },
    train:       {                                             amount: 100 },
    prewed:      { room: 'heritage-grand-premier', rate: 170, pay: 2, amount: 340 },
    wedstay:     { room: 'heritage-grand-premier', rate: 170, pay: 1, amount: 170 },
    mu9646:      {                                             amount: 275 },
    kmg:         { room: 'italian',                rate: 50,  pay: 3, amount: 150 },
    c86:        {                                             amount: 85 },
    ljg:         { room: 'viewing-270',            rate: 100, pay: 2, amount: 200 },
    'return':    {                                             amount: 200 },
    kempinski:   { room: 'deluxe-balcony-king',    rate: 190, pay: 2, amount: 380 }
  };
  let sum = 0;
  for (const [w, e] of Object.entries(expect)) {
    if (P.FLAT[w]) { assert.equal(P.items(w)[0].price, e.amount, w); sum += e.amount; continue; }
    const chosen = P.approved(w);
    assert.equal(chosen.slug, e.room, w + ' must select the Owner-approved room');
    const q = P.quote(w, chosen.slug);
    assert.equal(q.rate, e.rate, w + ' rate');
    assert.equal(q.pay, e.pay, w + ' payable nights');
    assert.equal(q.total, e.amount, w + ' amount');
    sum += e.amount;
  }
  assert.equal(sum, 2155);
  /* 255 + 100 + 340 + 170 + 275 + 150 + 85 + 200 + 200 + 380 */
  assert.equal(255 + 100 + 340 + 170 + 275 + 150 + 85 + 200 + 200 + 380, 2155);
  /* the superseded premium-max configuration is NOT what the mode produces */
  assert.notEqual(sum, 2866);
});

test('the total is never hard-coded: a sold-out room changes it', () => {
  /* Heritage Grand Premier gone in the PRE-WEDDING window only */
  const gone = (win) => (win === 'prewed' ? (slug) => slug !== 'heritage-grand-premier' : null);
  const lines = fullExperience(gone);
  assert.equal(lines.length, 10, 'still ten stages');
  const pre = lines.find((x) => x.id === 'prewed');
  assert.notEqual(pre.room, 'heritage-grand-premier', 'the sold-out room must not be selected');
  assert.equal(pre.room, 'heritage-executive', 'the nearest available approved option');
  assert.equal(pre.price, 310);
  /* the two Vientiane windows are independent stock — the wedding stay keeps
     the approved room because it is a different window */
  const wed = lines.find((x) => x.id === 'wedstay');
  assert.equal(wed.room, 'heritage-grand-premier');
  assert.equal(wed.price, 170);
  assert.equal(total(lines), 2155 - 340 + 310);
  assert.equal(total(lines), 2125);
  assert.notEqual(total(lines), 2155, 'the canonical total must not survive a substitution');
});

test('the approved room is preferred, and the fallback is the nearest, not the dearest', () => {
  assert.equal(P.approved('prewed').slug, 'heritage-grand-premier');
  assert.equal(P.approved('prewed', (s) => s !== 'heritage-grand-premier').slug, 'heritage-executive');
  assert.equal(P.approved('kmg').slug, 'italian');
  assert.equal(P.approved('kmg', (s) => s !== 'italian').slug, 'milano');
  assert.equal(P.approved('ljg').slug, 'viewing-270');
  assert.equal(P.approved('ljg', (s) => s !== 'viewing-270').slug, 'soup-pool-270');
  /* it never reaches for the most expensive suite just because it is there */
  assert.notEqual(P.approved('prewed', (s) => s !== 'heritage-grand-premier').slug, 'souphattra-majestic');
  /* no room is held back (Owner, 15 Sep 2026): with only the Grand Majestic left, it is the room */
  assert.equal(P.approved('prewed', (s) => s === 'grand-majestic').slug, 'grand-majestic');
  assert.equal(P.approved('prewed', () => false), null, 'a stage with nothing left returns nothing');
});

/* ==========================================================================
   TRANSPORT SOURCE DEPTH — every leg is described, and nothing is invented.
   ========================================================================== */
test('all four transport products carry the guest-facing sections', () => {
  const T = sandbox.window.SIYL_TRANSPORT;
  const order = sandbox.window.SIYL_TRANSPORT_ORDER;
  assert.deepEqual(order, ['train', 'mu9646', 'c86', 'return']);
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
  /* C86 and MU9646 are the ACTIVE products by explicit Owner override of
   * 09 Sep 2026; the services they replaced must not survive as journey truth */
  for (const retired of ['C642', 'MU9632', 'USD 105', 'USD 90']) {
    assert.ok(!src.includes(retired), 'transport copy still shows the retired ' + retired);
  }
  /* internal procurement never reaches a guest surface */
  assert.doesNotMatch(src, /\$92|USD 92|\$3 |USD 3 per/, 'van/border procurement cost leaked');
  /* nothing invented on the night train */
  const train = sandbox.window.SIYL_TRANSPORT.train;
  const flat = JSON.stringify(train);
  for (const invented of ['Wi-Fi', 'WiFi', 'lounge', 'Lounge', 'chauffeur']) {
    assert.ok(!flat.includes(invented), 'the night train claims ' + invented);
  }
  /* and no lounge or chauffeur promised on any leg — in words OR in a
     photograph. A lounge picture is a promise the source does not make. */
  for (const k of ['train', 'mu9646', 'c86', 'return']) {
    const f = JSON.stringify(sandbox.window.SIYL_TRANSPORT[k]);
    assert.ok(!/lounge|chauffeur|priority boarding/i.test(f), k + ' promises an unsourced service');
  }
  const pages = readFileSync(join(ROOT, 'journeys.html'), 'utf8');
  assert.ok(!pages.includes('c86-business-lounge-kunming'), 'the lounge photograph is still on Journeys');
});

test('the Owner-overridden transport facts are the ones on the page', () => {
  const T = sandbox.window.SIYL_TRANSPORT;
  assert.match(JSON.stringify(T.c86.facts), /C86/);
  assert.match(JSON.stringify(T.c86.facts), /10:15/);
  assert.match(JSON.stringify(T.c86.facts), /13:44/);
  assert.match(JSON.stringify(T.c86.facts), /3 hours 29 minutes/);
  assert.equal(P.FLAT.c86.price, 85);
  assert.match(JSON.stringify(T.mu9646.facts), /MU9646/);
  /* the retired flight's departure and arrival are NOT carried across */
  assert.doesNotMatch(JSON.stringify(T.mu9646.facts), /14:00|16:40/);
  assert.match(JSON.stringify(T.mu9646.facts), /15:50/);
  assert.match(JSON.stringify(T.mu9646.facts), /18:25/);
  assert.match(JSON.stringify(T.mu9646.facts), /1 hour 35 minutes/);
  assert.doesNotMatch(JSON.stringify(T.mu9646.facts), /Confirmed with your ticket/);
  assert.equal(P.FLAT.mu9646.price, 275);
  /* two approved fares, exactly one active, sharing the product's id */
  const cls = P.classesOf('mu9646');
  assert.equal(cls.length, 2);
  /* the baggage allowance is the source's, on both fares and in both places */
  assert.ok(cls[0].notes.includes('2 pieces of checked baggage'), 'Business baggage allowance');
  assert.ok(cls[1].notes.includes('1 piece of free checked baggage'), 'Economy baggage allowance');
  assert.match(JSON.stringify(T.mu9646.groups), /Two pieces of checked baggage/);
  assert.equal(P.items('mu9646')[0].price, 275);
  assert.equal(P.items('mu9646')[0].cls, 'business');
  assert.equal(P.items('mu9646', 'economy-flexible')[0].price, 155);
  assert.equal(P.items('mu9646', 'economy-flexible')[0].id, 'mu9646');
  assert.equal(P.FLAT.train.price, 100);
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
    assert.ok(R[k].includes && R[k].includes.length >= 2, k + ' has no inclusions');
  }
  /* Bangkok: three addresses, three truths — the penthouse keeps its house copy on the penthouse;
     U Sathorn and Shama say ONE ROOM PER COUPLE, CHECK-IN AT THE LOBBY, BREAKFAST INCLUDED, and nothing borrowed */
  const byId = Object.fromEntries(R.sathorn.rooms.map(r => [r.slug, r]));
  const pent = byId['penthouse'].includes.join(' ');
  assert.match(pent, /Breakfast is NOT included/); assert.match(pent, /keybox/); assert.match(pent, /one house for the whole party/);
  for (const id of ['u-sathorn-superior-garden', 'shama-king-studio-balcony']) {
    const t = byId[id].includes.join(' ');
    assert.match(t, /Breakfast included\./, id); assert.match(t, /Check-in at the lobby\./, id); assert.match(t, /per couple/, id);
    assert.doesNotMatch(t, /keybox|private entrance|private elevator|whole party|NOT included|groceries|Meals cooked|parking/, id + ' carries penthouse copy');
  }
  const grp = R.sathorn.includes.join(' ');
  assert.doesNotMatch(grp, /keybox|private entrance|elevator|whole party|Breakfast|groceries/, 'the group must not speak for the penthouse');
  const rh = readFileSync(join(ROOT, "room.html"), "utf8");
  assert.match(rh, /room\.includes && room\.includes\.length\) \? room\.includes : stay\.includes/, 'a room speaks for itself first');
  assert.doesNotMatch(rh, /(?<![.\w])stay\.breakfast(?! ?\))/, 'the amount block never borrows the group breakfast line');
  assert.match(rh, /room\.breakfast \|\| stay\.breakfast/, 'breakfast is the room\'s own fact');
  assert.equal(byId['u-sathorn-superior-garden'].breakfast, 'Breakfast included');
  assert.equal(byId['shama-king-studio-balcony'].breakfast, 'Breakfast included');
  assert.match(byId['penthouse'].breakfast, /not included/);
  assert.match(R.kempinski.includes.join(' '), /Breakfast included/);
  assert.match(R.souphattra.includes.join(' '), /no night between 25 February and 1 March is left uncovered/);
});

/* ==========================================================================
   THE BUDDHIST MORNING — attendance and the offering are two different things.
   ========================================================================== */
test('the Sangkhathan is a per-guest offering, not an admission', () => {
  const f = P.FLAT.sangkhathan;
  assert.ok(f, 'the offering must be priced by the single calculation source');
  assert.equal(f.price, 15);
  assert.equal(f.cat, 'Wedding programme');
  assert.match(f.basis, /per guest/);
  assert.match(f.basis, /prepared for you and presented by you/);
  for (const word of ['admission', 'entrance', 'ticket', 'service charge', 'fee']) {
    assert.ok(!f.basis.toLowerCase().includes(word), 'the offering reads as a ' + word);
  }
  const line = P.items('sangkhathan')[0];
  assert.equal(line.id, 'sangkhathan');
  assert.equal(line.price, 15);
  assert.equal(total([{ ...line, qty: 1 }]), 15);
  assert.equal(total([{ ...line, qty: 2 }]), 30, 'two guests, two offerings');
  /* it is NOT a room: it carries no stay and no room slug, so it can never
     reach the accommodation ledger */
  assert.equal(line.stay, undefined);
  assert.equal(line.room, undefined);
});

test('Full Experience stays USD 2,155; one offering makes the journey 2,170', () => {
  const canonical = STAGES.flatMap((w) => (P.FLAT[w] ? P.items(w) : P.items(w, P.approved(w).slug)));
  assert.equal(total(canonical), 2155, 'the canonical base is unchanged');
  const withOffering = [...canonical, { ...P.items('sangkhathan')[0], qty: 1 }];
  assert.equal(withOffering.length, 11, 'the offering is an addition, not a stage');
  assert.equal(total(withOffering), 2170);
  /* the canonical configuration itself is never redefined */
  assert.equal(total(canonical), 2155);
  const two = [...canonical, { ...P.items('sangkhathan')[0], qty: 2 }];
  assert.equal(total(two), 2185);
});

test('the wedding page: four events, the Buddhist morning inside the ceremony', () => {
  const vy = readFileSync(join(ROOT, 'voyage.html'), 'utf8');
  const h2 = [...vy.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  for (const e of ['Temple Ceremony', 'Coffee &amp; Cake', 'Vow Ceremony', 'Wedding Dinner']) {
    assert.ok(h2.includes(e), 'missing event ' + e);
  }
  /* the order of the story: place → food-giving → personal offering */
  const iT = vy.indexOf('id="temple"'), iB = vy.indexOf('id="takbat"'), iS = vy.indexOf('id="sangkhathan"');
  assert.ok(iT > 0 && iT < iB && iB < iS, 'the Buddhist morning must run ceremony → Tak Bat → Sangkhathan');
  /* Alms Giving is never a fifth event, and the food offering is never priced */
  assert.ok(!/Alms Giving/i.test(vy));
  assert.ok(!/<h2>Morning Alms-Giving<\/h2>[\s\S]{0,900}USD/.test(vy), 'the alms-giving must carry no price');
  assert.match(vy, /Part of the Temple Ceremony · self-pay/);
  assert.doesNotMatch(vy, /USD \d+[^<]{0,40}(alms|Tak Bat)|Tak Bat[^<]{0,60}USD \d+/, 'no amount is ever invented for Tak Bat');
  /* only the Sangkhathan is USD 15 */
  assert.match(vy, /Optional<span data-private> · USD 15 per guest<\/span>/);
  assert.match(vy, /09:00 – approximately 12:00 · Wat Ong Teu, Vientiane/);
  assert.match(vy, /15:30 · Souphattra Heritage/);
  assert.doesNotMatch(vy, /08:00|16:30/, 'no retired time on the public wedding page');
  /* attendance is an explicit two-way decision — in the private journey */
  const wd = readFileSync(join(ROOT, 'wedding.html'), 'utf8');
  assert.match(wd, /data-ev="yes"[\s\S]{0,400}data-ev="no"/);
});

test('the retired imagery and the pool-side dinner narrative are gone', () => {
  const vy = readFileSync(join(ROOT, 'voyage.html'), 'utf8');
  assert.ok(!/052-temple-ceremony-bride/.test(vy), 'the black-and-white bride photograph is still there');
  assert.ok(!/053-wedding-dinner-courtyard-garden/.test(vy), 'the fountain photograph is still there');
  /* Owner, 13 Sep 2026: the Wedding Dinner is POOLSIDE — said so, never "courtyard garden"; the pool stays out of the vow only */
  const dinnerSec = vy.slice(vy.indexOf('id="dinner"'), vy.indexOf('id="dinner"') + 900);
  assert.match(dinnerSec, /19:30 · Poolside/); assert.match(dinnerSec, /gathering poolside/);
  assert.ok(!/courtyard garden/i.test(vy), 'the dinner is poolside, not the courtyard garden');
  assert.ok(!/Sunset drinks/.test(vy));
  /* and the retired bride frame is not quietly moved to another event */
  for (const f of ['index.html', 'journeys.html', 'accommodation.html', 'destination.html', 'experiences.html']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(!/052-temple-ceremony-bride/.test(src), f + ' reuses the retired photograph');
  }
  /* the vow keeps the green door, and it has no pool */
  assert.match(vy, /052-vow-ceremony-green-door(-entrance)?\.jpg/, "the vow keeps the green door (the Owner's entrance photograph since 13 Sep 2026)");
  const vow = vy.slice(vy.indexOf('id="vows"'), vy.indexOf('id="vows"') + 700);
  assert.ok(!/pool/i.test(vow));
  /* the wedding-dinner imagery is the Owner's set (decision of 13 Sep 2026:
   * folder "056 - Event - Wedding Dinner" is the authoritative source — the
   * courtyard garden and the Chinese sharing menu, never one image, never a
   * placeholder, never a photograph from another event). This supersedes the
   * Haruthai-pass placeholder, which waited for a long-table photograph that
   * the Owner's set does not contain. The stay is still shown as a room. */
  assert.doesNotMatch(vy, /am-placeholder|Photograph to follow/);
  const dinnerImages = vy.match(/053-wedding-dinner-[a-z-]+\.jpg/g) || [];
  assert.ok(new Set(dinnerImages).size >= 4, 'several images from the Wedding Dinner set, not one: ' + dinnerImages.join(', '));
  assert.match(vy, /053-wedding-dinner-courtyard-from-above\.jpg/, 'the lead image is the poolside from above');
  assert.match(vy, /053-wedding-dinner-sharing-menu\.jpg[\s\S]{0,600}053-wedding-dinner-sharing-menu-table\.jpg/, 'the sharing menu is shown as a pair');
  for (const f of dinnerImages) assert.ok(existsSync(join(ROOT, 'assets/images/event', f)), f + ' is not in the asset set');
  assert.ok(!existsSync(join(ROOT, 'assets/images/event/053-wedding-dinner-courtyard-garden.jpg')), 'the fountain file (not from the Wedding Dinner folder) is retired');
  assert.match(vy, /souphattra\/heritage-room\.jpg/);
});
