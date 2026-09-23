/* ACCOMMODATION IMAGE QUALITY (Owner, 16 Sep 2026): one source map for the Bangkok imagery — the hero, the card and the
   gallery of each property come from SIYL_STAY_IMAGES and belong to that property alone; every rail reads the card from
   it; THE HOUSES carries the Penthouse, U Sathorn and Shama with the map's images; every referenced file exists. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, src } from './sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

test('ONE SOURCE MAP · hero, card and gallery per property, files present, no cross-property leakage, every rail reads the card from the map', () => {
  const w = page({ auth: null }), M = w.SIYL_STAY_IMAGES, R = w.SIYL_ROOMS.sathorn.rooms;
  assert.ok(M && M.sathornPenthouse && M.uSathorn && M.shamaYenAkat);
  for (const [k, folder] of [['uSathorn', 'usathorn'], ['shamaYenAkat', 'shama']]) {
    const m = M[k]; const all = [m.hero, m.card, m.houses].concat(m.gallery.map((g) => g[0]));
    for (const f of all) { assert.ok(exists(f), f + ' exists'); assert.match(f, new RegExp('^assets/images/' + folder + '/'), k + ' uses only its own folder: ' + f); }
    assert.equal(m.gallery[0][0], m.hero, k + ': the hero is the first frame of the gallery');
    assert.ok(m.gallery.length >= 5, k + ': a real gallery');
  }
  assert.match(M.sathornPenthouse.card, /^assets\/images\/penthouse\//); assert.ok(exists(M.sathornPenthouse.card)); assert.ok(exists(M.sathornPenthouse.hero));
  const u = R.find((r) => r.slug === 'u-sathorn-superior-garden'), sh = R.find((r) => r.slug === 'shama-king-studio-balcony'), pe = R.find((r) => r.slug === 'penthouse');
  assert.equal(u.cardImg, M.uSathorn.card); assert.deepEqual(u.gallery, M.uSathorn.gallery);
  assert.equal(sh.cardImg, M.shamaYenAkat.card); assert.deepEqual(sh.gallery, M.shamaYenAkat.gallery);
  assert.equal(pe.cardImg, M.sathornPenthouse.card); assert.equal(pe.gallery[0][0], M.sathornPenthouse.hero);
  for (const g of pe.gallery) assert.match(g[0], /^assets\/images\/(penthouse|journey\/penthouse)/, 'the Penthouse gallery is the Penthouse\'s');
  /* U Sathorn: the Owner's 16 Sep 2026 imagery — the pool pavilion, the driveway, the U garden, the lobby, the room */
  assert.equal(M.uSathorn.hero, 'assets/images/usathorn/pool-pavilion-dusk.jpg'); assert.equal(M.uSathorn.card, 'assets/images/usathorn/pool-pavilion-day.jpg');
  for (const f of ['driveway-sunset', 'entrance-u-garden', 'lobby', 'superior-garden-entry']) assert.ok(M.uSathorn.gallery.some((g) => g[0].endsWith(f + '.jpg')), f);
  /* every rail reads the card from the map */
  /* every rail reads the card through the one resolver (SIYL_STAY_ART, 21 Sep 2026), which reads the map */
  assert.match(src('journeys.html'), /var img=window\.SIYL_STAY_ART\?SIYL_STAY_ART\.card\(sk,r\.slug\):'';/);
  assert.match(src('your-journey.html'), /img=window\.SIYL_STAY_ART\?SIYL_STAY_ART\.card\('sathorn',r\.slug\):''/);
  assert.match(src('room.html'), /SIYL_STAY_ART\.card\(stayKey, r\.slug\)/);
  assert.match(src('assets/pricing.js'), /SIYL_STAY_ART\.bag\(at\.key, room \? room\.slug : '', at\.win\.id\)/);
});

test('THE HOUSES · the Penthouse, U Sathorn and Shama each with the map\'s image; no missing image on any card', () => {
  const w = page({ auth: null }), M = w.SIYL_STAY_IMAGES, a = src('accommodation.html');
  const cards = [...a.matchAll(/<article class="aslide">\s*<a class="am" href="([^"]+)" style="background-image:url\(([^)]+)\)"/g)].map((m) => ({ href: m[1], img: m[2] }));
  /* one card fewer since the Riverside Hotel was retired (Owner, 23 Sep 2026) */
  assert.ok(cards.length >= 7, cards.length + ' cards');
  for (const c of cards) assert.ok(exists(c.img), c.img + ' exists');
  assert.equal(cards.find((c) => /room=penthouse/.test(c.href)).img, M.sathornPenthouse.houses);
  assert.equal(cards.find((c) => /room=u-sathorn-superior-garden/.test(c.href)).img, M.uSathorn.houses);
  assert.equal(cards.find((c) => /room=shama-king-studio-balcony/.test(c.href)).img, M.shamaYenAkat.houses);
  assert.equal(new Set(cards.map((c) => c.img)).size, cards.length, 'no card inherits another\'s image');
});
