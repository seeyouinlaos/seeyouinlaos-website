/* THE CLOSING HOTEL IS HOTEL MUSE BANGKOK (Owner decision, 28 Sep 2026 · ABSOLUTE · src/legacy-keys.js · gate K1). Secondary tabs
   of the Operations Master still name the Siam Kempinski for 6 – 8 March (001_Overview_Hotel_Restaurant Day 14 – 16,
   000_Master_Timeline, 003 contextual copy). Those values are stale: they can never make the Siam Kempinski the guests' hotel.
   ALATi and Firefly Bar are real venues inside the Siam Kempinski — they keep their names and their real location. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { src, page, plain, PEGGY, ROOT } from './sandbox.mjs';
import { CLOSING_HOTEL, KEMPINSKI_VENUES, closingHotel, closingTransfer } from '../src/legacy-keys.js';

const MUSE = 'Hotel Muse Bangkok, Autograph Collection';

test('STALE SHEET VALUES · every Kempinski HOTEL value of the secondary tabs reads as Hotel Muse Bangkok (verbatim cells, 28 Sep 2026)', () => {
  assert.deepEqual(plain(CLOSING_HOTEL), { name: MUSE, room: 'Jatu Room', dates: '6 – 8 March 2027', stage: 'kempinski', key: 'kempinski/jatu-room' });
  /* 001_Overview_Hotel_Restaurant E33 / E34 / Q34 / Q36 · 000_Master_Timeline I293 / I300 – I311 */
  for (const v of ['Siam Kempinski Bangkok, Deluxe Balcony King Room, Fix ', 'Hotel Siam Kempinski', 'Kempinski', 'Siam Kempinski', '']) assert.equal(closingHotel(v), MUSE, JSON.stringify(v));
  assert.equal(closingHotel(MUSE), MUSE);
  /* 000_Master_Timeline D300 / D311: the transfers into and out of the hotel end at Hotel Muse */
  assert.equal(closingTransfer('Sathon Penthouse - Siam Kempinski'), 'Sathon Penthouse - ' + MUSE);
  assert.equal(closingTransfer('Siam Kempinski - Bangkok-Suvarnabhumi (BKK)'), MUSE + ' - Bangkok-Suvarnabhumi (BKK)');
  /* 000_Master_Timeline D302 · 001 R34 / W34: a venue is a venue — its real location is kept */
  assert.equal(closingTransfer('ALATi'), 'ALATi');
  assert.equal(closingTransfer('Firefly Bar, Siam Kempinski Bangkok'), 'Firefly Bar, Siam Kempinski Bangkok');
});

test('THE VENUES · ALATi and Firefly Bar are still scheduled (Day 15 · 7 March 2027), keep their real names and name their real location — a place the guests visit, never their hotel', () => {
  const w = page({ auth: PEGGY }); const X = w.SIYL_EXPERIENCES || w.SIYL_EXPERIENCE || null;
  const js = src('assets/experiences.js');
  for (const [id, name] of [['bkk-alati', 'ALATi'], ['bkk-firefly', 'Firefly Bar']]) {
    const line = js.split('\n').find((l) => l.includes("{ id: '" + id + "'"));
    assert.ok(line, id + ' is scheduled');
    assert.match(line, new RegExp("name: '" + name + "'"), id + ' keeps its real name');
    assert.match(line, /where: 'Siam Kempinski Hotel Bangkok'/, id + ' names its real location');
    assert.equal(KEMPINSKI_VENUES[id], 'Siam Kempinski Hotel Bangkok');
    assert.match(line, /date: '2027-03-07'/);
    const teaser = (line.match(/teaser: '([^']*)'/) || [])[1] || '';
    assert.doesNotMatch(teaser, /Kempinski|\bstay|check.?in|our hotel|your hotel|hotel/i, id + ': the words never make it the guests\' hotel');
  }
  assert.doesNotMatch(js, /name: '[^']*Muse[^']*', where: 'Siam Kempinski/, 'a venue is never renamed to the guests\' hotel');
  const inv = JSON.parse(src('src/experience-inventory.json'));
  const list = Array.isArray(inv) ? inv : (inv.places || inv.items || Object.values(inv).find(Array.isArray) || []);
  for (const id of ['bkk-alati', 'bkk-firefly']) { const r = list.find((x) => x.id === id); assert.ok(r, id); assert.equal(r.city, 'Siam Kempinski Hotel Bangkok'); }
  void X;
});

test('THE STAY OF 6 – 8 MARCH · Hotel Muse Bangkok\'s Jatu Room on every guest surface; the arrival, the stays list and the Bangkok chapter name it', () => {
  const w = page({ auth: PEGGY });
  const stay = Object.values(w.SIYL_ROOMS).find((s) => s.windows.some((x) => x.id === 'kempinski'));
  assert.equal(stay.name, MUSE); assert.deepEqual(plain(stay.rooms.map((r) => r.slug)), ['jatu-room']);
  assert.equal(w.SIYL_ROOMS.kempinski, undefined);
  assert.match(src('assets/transport-data.js'), /in time to check in at Hotel Muse Bangkok the same afternoon/);
  assert.match(src('experiences.html'), /the last two days at Hotel Muse Bangkok before the flight home/);
  assert.match(src('accommodation.html'), /<span class="sn">Hotel Muse Bangkok<\/span><span class="sw">6 – 8 Mar<\/span>/);
});

test('GATE K1 · the release fails closed when a served source makes the Siam Kempinski a hotel again, serves a Kempinski room or the former Luye Baisha link', () => {
  const rc = src('src/release-check.cjs');
  assert.match(rc, /gate\('K1', 'The closing hotel is Hotel Muse Bangkok/);
  for (const needle of ["if (/Kempinski/.test(t)) bad.push(", 'Deluxe Balcony King|deluxe-balcony-king', 'checkIn=2027-03-06&checkOut=2027-03-08', 'if (venues !== 2)', "at.name !== 'Hotel Muse Bangkok, Autograph Collection'", 'checkIn=2027-03-04&checkOut=2027-03-06']) assert.ok(rc.includes(needle), needle);
});

test('GATE K1 PASSES ON THIS TREE (the served sources, as they are)', () => {
  let out = '';
  try { out = execFileSync('node', ['-e', `
    const fs=require('fs'),path=require('path');const s=fs.readFileSync('src/release-check.cjs','utf8');
    const i=s.indexOf('/* GATE K1'),j=s.indexOf('/* GATE L1');const body=s.slice(s.indexOf('{',i),j);
    const ROOT=process.cwd();let res=null;const gate=(id,t,ok,d)=>{res={id,ok,d}};
    eval(body);console.log(JSON.stringify(res));`], { cwd: ROOT }).toString(); } catch (e) { out = String(e.stdout || e.message); }
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.id, 'K1'); assert.equal(r.ok, true, r.d);
});
