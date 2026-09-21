/* THE ACCOMMODATION MEDIA RULE (Owner, 21 Sep 2026 · the close-out pass) — a hotel is a hotel. A recommendation, a card,
   a Bag line, THE HOUSES may show only media explicitly approved for that exact property: propertyId → its approved set
   (assets/rooms-data.js · SIYL_STAY_ART). No destination, city, mountain, monument, Highlights, other-hotel, keyword,
   filename or nearest-available fallback — a missing mapping is the intentional no-photo state. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { page, ROOT, plain, src, PEGGY } from './sandbox.mjs';

const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/rooms-data.js', 'assets/stay-media.js', 'assets/pricing.js'] });
const R = w.SIYL_ROOMS, A = w.SIYL_STAY_ART, M = w.SIYL_STAY_MEDIA, P = w.SIYL_PRICE;
const STAYS = Object.keys(R);
const imgsOf = (f) => [...new Set(readFileSync(join(ROOT, f), 'utf8').match(/assets\/images\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)/g) || [])];
const DESTINATION = imgsOf('destination.html');
const HIGHLIGHTS = ['assets/experiences.js', 'assets/experience-galleries.js', 'experiences.html', 'experience.html'].filter((f) => existsSync(join(ROOT, f))).flatMap(imgsOf);

test('every active accommodation resolves its frames from its own approved set — and only from there', () => {
  assert.deepEqual(plain(STAYS).sort(), ['guesthouse', 'kempinski', 'kunming', 'lijiang', 'riverside', 'sathorn', 'souphattra']);
  for (const k of STAYS) {
    const ok = A.approved(k); assert.ok(ok.length > 0, k + ' has an approved set');
    for (const p of ok) { assert.ok(A.FOLDERS[k].some((f) => p.startsWith(f)), k + ': ' + p + ' is inside the property\'s own folders'); assert.ok(existsSync(join(ROOT, p)), p + ' is on disk'); }
    assert.ok(A.house(k) && ok.includes(A.house(k)), k + ': the house frame is its own');
    for (const r of R[k].rooms) { const c = A.card(k, r.slug); assert.ok(c === '' || ok.includes(c), k + '/' + r.slug + ': the card is its own or nothing'); assert.ok(c !== '' , k + '/' + r.slug + ' has a card of its own'); }
    for (const win of R[k].windows) for (const r of R[k].rooms) { const it = P.items(win.id, r.slug)[0]; if (it) assert.ok(!it.img || ok.includes(it.img), k + '/' + win.id + '/' + r.slug + ': the Bag line\'s frame is the property\'s'); }
  }
});

test('no destination, city, mountain, Highlights, other-hotel, keyword or filename fallback; a missing mapping is nothing', () => {
  assert.ok(DESTINATION.length >= 20 && HIGHLIGHTS.length >= 50, 'the forbidden sets are real');
  for (const k of STAYS) {
    for (const d of DESTINATION) assert.equal(A.ok(k, d), false, k + ' may not show the destination frame ' + d);
    for (const h of HIGHLIGHTS) assert.equal(A.ok(k, h), false, k + ' may not show the Highlights frame ' + h);
    for (const other of STAYS) if (other !== k) assert.equal(A.ok(k, A.house(other)), false, k + ' may not show ' + other + '\'s house');
    assert.equal(A.ok(k, 'assets/images/lijiang/snow-mountain-viewing-1.jpg'), false, k + ': the peak over Baisha is never a hotel frame');
    assert.equal(A.ok(k, 'assets/images/city/lijiang-jade-dragon-snow-mountain.jpg'), false, 'a keyword match is no approval');
    assert.equal(A.ok(k, 'assets/images/lijiang/baisha-village.jpg'), false, 'a file inside the folder that is not in the approved set is no approval');
  }
  assert.deepEqual(plain(A.approved('nowhere')), []); assert.equal(A.house('nowhere'), ''); assert.equal(A.card('lijiang', 'no-such-room'), ''); assert.equal(A.bag('nowhere', 'x'), '', 'a missing mapping resolves to the no-photo state');
  assert.match(A.NEVER.source, /city|experiences|hero|venue|temple/, 'the never-list names the destination and Highlights folders');
});

test('LUYE BAISHA · LIJIANG: the recommendation shows the hotel\'s own rooms — never Jade Dragon Snow Mountain or the Baisha village', () => {
  const lb = JSON.parse(readFileSync(join(ROOT, 'src/stay-media.json'), 'utf8')).luyeBaisha; assert.equal(lb.lead, 'room'); assert.match(lb.leadWhy, /never stands for the hotel/); assert.ok(lb.images.length >= 3); assert.deepEqual(plain(M.luyeBaisha.images.map((i) => i.src)), lb.images.map((i) => i.src));
  for (const im of lb.images) { assert.ok(['room', 'suite'].includes(im.kind), im.src + ' is a room of the hotel'); assert.doesNotMatch(im.src, /snow-mountain-viewing-1|city\//); assert.doesNotMatch(im.caption, /over the Baisha rooftops|village/i); }
  assert.equal(A.house('lijiang'), 'assets/images/lijiang/view270-1.jpg'); assert.equal(R.lijiang.windows[0].bagImg, 'assets/images/lijiang/view270-1.jpg');
  assert.equal(P.items('ljg', 'snow-mountain-viewing')[0].img, 'assets/images/journey/lijiang-01.jpg', 'the Snow Mountain Viewing Room line carries its bedroom');
  assert.equal(existsSync(join(ROOT, 'assets/images/lijiang/snow-mountain-viewing-1.jpg')), false, 'the mountain frame is retired from the hotel folder');
  for (const f of ['accommodation.html', 'journeys.html', 'your-journey.html', 'room.html', 'cart.html', 'review.html', 'profile.html', 'assets/rooms-data.js', 'assets/stay-media.js', 'assets/pricing.js']) assert.doesNotMatch(src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/var NEVER = \/[^\n]*/, ''), /snow-mountain-viewing-1/, f + ' no longer names the peak (except on the never-list)');
  assert.match(src('accommodation.html'), /href="journeys\.html#j-ljg" style="background-image:url\(assets\/images\/lijiang\/view270-1\.jpg\)"/, 'THE HOUSES: the room at dusk');
});

test('every surface reads the one resolver; THE HOUSES\' static cards are each their property\'s own frame', () => {
  assert.match(src('journeys.html'), /SIYL_STAY_ART\.card\(sk,r\.slug\)/); assert.match(src('your-journey.html'), /SIYL_STAY_ART\.card\('sathorn',r\.slug\)/);
  assert.match(src('room.html'), /SIYL_STAY_ART\.card\(stayKey, r\.slug\)/); assert.match(src('profile.html'), /SIYL_STAY_ART\.card\(stayKey,slug\)/); assert.match(src('assets/pricing.js'), /SIYL_STAY_ART\.bag\(at\.key/);
  for (const f of ['journeys.html', 'your-journey.html', 'room.html', 'profile.html', 'assets/pricing.js']) assert.doesNotMatch(src(f), /r\.cardImg\|\|\(r\.gallery|room\.cardImg \|\| \(room\.gallery/, f + ' has no resolver of its own');
  const HOUSES = { 'j-bkk-stay': 'sathorn', 'j-prewed': 'souphattra', 'j-wedstay': 'souphattra', 'j-guesthouse': 'guesthouse', 'j-riverside': 'riverside', 'j-kmg': 'kunming', 'j-ljg': 'lijiang', 'j-kempinski': 'kempinski' };
  const cards = [...src('accommodation.html').matchAll(/href="journeys\.html#(j-[a-z-]+)" style="background-image:url\(([^)]+)\)"/g)];
  assert.ok(cards.length >= 4, 'THE HOUSES carry static cards (the Bangkok three are drawn from the one source map)');
  for (const [, anchor, img] of cards) { const k = HOUSES[anchor]; assert.ok(k, anchor); assert.ok(A.approved(k).includes(img), anchor + ' → ' + img + ' is ' + k + '\'s own approved frame'); }
  /* the Journey's stay galleries are the property's own record */
  for (const [, key] of src('journeys.html').matchAll(/data-stay-gal="([A-Za-z]+)"/g)) { const stay = Object.keys(A.MEDIA_KEYS).find((s) => A.MEDIA_KEYS[s].includes(key)); assert.ok(stay, key + ' belongs to a property'); for (const im of M[key].images) assert.ok(A.approved(stay).includes(im.src), key + ': ' + im.src); }
});
