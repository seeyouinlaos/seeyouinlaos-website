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
const P = sandbox.window.SIYL_PRICE;
const R = sandbox.window.SIYL_ROOMS;

/* a bag with the same arithmetic as assets/bag.js: sum(price × qty) */
const total = (lines, qty = 1) => lines.reduce((t, x) => t + (x.price || 0) * (x.qty || qty), 0);
const pick = (win, slug, qty = 1) => P.items(win, slug).map((x) => ({ ...x, qty }));

test('A · one guest, Sathorn Penthouse only → USD 135', () => {
  const q = P.quote('bkk-stay', 'penthouse');
  assert.equal(q.rate, 45);
  assert.equal(q.nights, 3);
  assert.equal(q.total, 135);
  assert.equal(total(pick('bkk-stay', 'penthouse')), 135);
  assert.match(q.basis, /USD 45 per person \/ night · 3 nights · USD 135 per person/);
  assert.equal(q.breakfast, 'Breakfast not included · self-pay');
});

test('B · one guest, Sathorn + Special Express No. 25 → USD 210', () => {
  const bag = [...pick('bkk-stay', 'penthouse'), { ...P.FLAT.train, price: 75, qty: 1 }];
  assert.equal(total(bag), 210);
});

test('C · two guests, Sathorn Penthouse only → USD 270', () => {
  assert.equal(total(pick('bkk-stay', 'penthouse', 2)), 270);
});

test('D · both wedding nights are hosted and add nothing to Your Costs', () => {
  const bag = pick('wedstay', 'heritage');
  assert.equal(bag.length, 2, 'two visible nightly rows');
  assert.deepEqual(bag.map((x) => x.id), ['wedstay-n1', 'wedstay-n2']);
  assert.equal(bag[0].hostedNote, 'Hosted');
  assert.equal(bag[1].hostedNote, "Wedding Night hosted by Valentine's Retreat");
  assert.ok(bag.every((x) => x.hosted === true && x.price === 0));
  assert.equal(total(bag), 0);
  assert.equal(total(bag, 2), 0);
  /* the room value stays visible */
  assert.ok(bag.every((x) => x.rate === 145));
  assert.match(P.lineBasis(bag[0]), /Room value USD 145 per person \/ night · your cost complimentary/);
});

test('E · changing the Souphattra category keeps both nights complimentary', () => {
  const before = pick('wedstay', 'heritage');
  const after = pick('wedstay', 'noble-courtyard');
  assert.equal(total(before), 0);
  assert.equal(total(after), 0);
  assert.ok(after.every((x) => x.rate === 240), 'the displayed room value follows the new category');
  assert.deepEqual(after.map((x) => x.id), before.map((x) => x.id), 'same two ids — replaced, never duplicated');
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
  const expect = { 'bkk-stay': 3, prewed: 2, kmg: 3, ljg: 2, kempinski: 2 };
  for (const [win, nights] of Object.entries(expect)) {
    const at = P.locate(win);
    const room = at.stay.rooms.find((r) => r.rate != null);
    const q = P.quote(win, room.slug);
    assert.equal(q.nights, nights, win + ' nights');
    assert.equal(q.total, q.rate * nights, win + ' total = rate × nights');
    assert.ok(q.breakfast, win + ' breakfast status');
    assert.ok(q.nightly.includes('per person / night'));
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
