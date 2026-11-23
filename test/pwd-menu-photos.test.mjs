/* HS-058.15 (Owners, 23 Nov 2026) · the Pre-Wedding Dinner's photo-led menu selection in My Profile.
   The photographs are the restaurant's own (cut from the original menu, provenance in docs/acceptance/pwd-menu-photos.json); a dish
   the menu does not picture keeps a text card; one photograph shared by two codes is said on the card; every short line has a
   recorded source; nothing here touches a price, a code or an order. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU, idOf } from '../src/pre-wedding-dinner.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const JS = src('assets/pre-wedding-dinner.js');
const LOOK = JSON.parse(JS.match(/\/\* LOOK:BEGIN \*\/\s*var LOOK = (\{[\s\S]*?\});\s*\/\* LOOK:END \*\//)[1]);
const PROV = JSON.parse(src('docs/acceptance/pwd-menu-photos.json'));
const DIR = 'assets/images/pre-wedding-dinner/menu';
const FILES = fs.readdirSync(path.join(ROOT, DIR));
const ITEMS = MENU.flatMap((c) => c.items.map((x) => ({ ...x, id: idOf(x), cat: c.id })));

test('THE PHOTOGRAPHS · every coded dish the menu pictures has its own photograph; the rest keep a text card', () => {
  const ids = new Set(ITEMS.map((x) => x.id));
  for (const k of Object.keys(LOOK)) assert.ok(ids.has(k), k + ' is a code of the catalogue');
  for (const x of ITEMS) {
    const l = LOOK[x.id] || {};
    if (!x.code) assert.equal(l.photo, undefined, x.id + ': the menu shows no photograph for page 19, so no photograph here');
    else if (x.id === 'B5') assert.equal(l.photo, undefined, 'B5, the plain baguette, is not pictured on the menu');
    else assert.ok(l.photo, x.id + ' has its photograph from the menu');
  }
  /* one photograph serves two codes ONLY where the menu itself shows one for two, and the card says so */
  const by = {};
  for (const [k, l] of Object.entries(LOOK)) if (l.photo) (by[l.photo] = by[l.photo] || []).push(k);
  const shared = Object.entries(by).filter(([, ks]) => ks.length > 1).map(([p, ks]) => p + ':' + ks.join('+')).sort();
  assert.deepEqual(shared, ['c5:C5+C6', 'c7:C7+C8']);
  for (const k of ['C5', 'C6']) assert.equal(LOOK[k].shared, 'C5 & C6');
  for (const k of ['C7', 'C8']) assert.equal(LOOK[k].shared, 'C7 & C8');
  assert.match(JS, /Menu photo for ' \+ esc\(l\.shared\)/, 'the shared photograph is said on the card itself');
  assert.match(JS, /Not pictured on the menu/, 'an unpictured dish says so, with no stand-in picture');
});

test('THE FILES · exact names (Workers assets are case-sensitive), both widths, small WebP, no orphan', () => {
  const stems = [...new Set(Object.values(LOOK).map((l) => l.photo).filter(Boolean))];
  assert.equal(stems.length, 34);
  for (const s of stems) for (const w of [400, 800]) {
    const n = s + '-' + w + '.webp';
    assert.ok(FILES.includes(n), n + ' exists with exactly this name');
    const b = fs.readFileSync(path.join(ROOT, DIR, n));
    assert.equal(b.toString('ascii', 0, 4) + b.toString('ascii', 8, 12), 'RIFFWEBP', n + ' is a WebP');
    assert.ok(b.length < (w === 400 ? 60 : 160) * 1024, n + ' stays small (' + Math.round(b.length / 1024) + ' KB)');
  }
  assert.deepEqual(FILES.filter((f) => !stems.some((s) => f === s + '-400.webp' || f === s + '-800.webp')), [], 'no file nobody uses');
  assert.match(JS, /loading="lazy" decoding="async"/, 'lazy and async');
  assert.match(JS, /width="400" height="' \+ \(l\.tall \? 500 : 300\) \+ '"/, 'a fixed box: no shift while a photograph loads');
  assert.match(JS, /srcset="' \+ f \+ '-400\.webp 400w, ' \+ f \+ '-800\.webp 800w" sizes="/);
});

test('THE PROVENANCE · every photograph traced to its menu page and box; every short line to its source', () => {
  for (const [k, l] of Object.entries(LOOK)) {
    if (l.photo) {
      const p = PROV.items[k];
      assert.ok(p, k + ' has a provenance entry');
      const own = p.sameAs ? PROV.items[p.sameAs] : p;
      assert.ok(/^\d+(\+\d+)?$/.test(own.page) && own.box900.length === 4, k + ': menu page and crop box recorded');
      assert.deepEqual(own.files, [l.photo + '-400.webp', l.photo + '-800.webp']);
    }
    if (l.about) assert.ok(PROV.lineSources[k], k + ': the line "' + l.about + '" has its recorded source');
  }
  /* no dietary or invented wording: the lines describe, they never classify */
  for (const l of Object.values(LOOK)) if (l.about) assert.doesNotMatch(l.about, /vegetarian|vegan|halal|gluten|spicy|signature|best|popular|recommend/i);
});

test('THE MENU STAYS THE RESTAURANT\'S · the look changes no price, code, rule or API; every category is reachable', () => {
  assert.doesNotMatch(JS.replace(/\/\*[\s\S]*?\*\//g, ''), /price\s*[:=]\s*\d|"price"/, 'no price in the look');
  const tabCats = [...JS.matchAll(/cats: \[([^\]]*)\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/'/g, '')));
  for (const c of MENU) assert.ok(tabCats.includes(c.id), c.id + ' is in a tab (a category added later gets its own tab anyway)');
  assert.match(JS, /out\.push\(\{ key: c\.id, label: c\.title, cats: \[c\], pick: c\.pick \}\)/, 'an unknown category gets a tab of its own');
  /* the writes are the ones they always were */
  assert.match(JS, /send\(\{ action: 'save', rsvp: 'yes', items: toList\(m\) \}\)/);
  assert.match(JS, /send\(\{ action: 'confirm', rsvp: 'yes', items: toList\(itemsOf\(st\.data\.order\)\) \}\)/);
  assert.match(JS, /send\(\{ action: 'reopen' \}\)/);
  assert.equal((JS.match(/data-pwd-confirm/g) || []).length, 3, 'one Submit control (drawn in two states) + its wiring');
  /* the bar: one, sticky inside the order area, above My Bag's bar */
  const page = src('profile.html');
  assert.match(page, /\.pwd-dock\{position:sticky;bottom:var\(--pwd-below,0px\)/);
  assert.match(JS, /sec\.style\.setProperty\('--pwd-below'/);
  assert.match(page, /src="assets\/pre-wedding-dinner\.js\?v=[0-9a-f]{8}"/);
  assert.doesNotMatch(page, /\.pwd-cat\b|\.pwd-cards\b|\.pwd-progress\b/, 'the old text-only list is gone');
});
