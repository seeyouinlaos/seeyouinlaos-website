/* 003 · OWNER PATCH (Edit 2, 15 Sep 2026) — pinned for good.
   C86 = USD 105 at the one price source and on every transactional surface (the current Operations Master, 19 Sep 2026,
   supersedes the Edit 2 override of 85); a persisted 85 reprices
   itself; the Temple Ceremony is a separate morning event at Wat Ong Teu, 09:00 – approximately 12:00;
   the Wedding (Vow) Ceremony is at Souphattra Heritage, 15:30, and the ceremony seating — the Bride and
   the Groom front centre, everybody else their chosen chair — belongs to it and to nothing else; the
   Sathorn Penthouse (once USD 85 per person / night, 3 nights, USD 255) is deleted (Owner, 24 Sep 2026 · Edit 6). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { page, src, PEGGY, HARUTHAI, CORE } from './sandbox.mjs';

const require = createRequire(import.meta.url);
const L = require('../assets/seatlabels.js');
const PASS = require('../assets/seatpass.js');
const TP = require('../assets/travelpass.js');
const WITH_PASS = [...CORE, 'assets/seatpass.js', 'assets/vendor/qrcode.js', 'assets/travelpass.js'];
const ACTIVE = ['assets/pricing.js', 'assets/journey.js', 'assets/temple.js', 'assets/transport-data.js', 'assets/travelpass.js', 'assets/seatpass.js', 'assets/seatlabels.js', 'assets/guest.js', 'journeys.html', 'your-journey.html', 'transport.html', 'cart.html', 'review.html', 'tickets.html', 'wedding.html', 'wedding-preparation.html', 'voyage.html', 'dress.html', 'about-you.html', 'index.html', 'accommodation.html', 'room.html'];
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('C86 · USD 105 is the one price (the current Operations Master, 19 Sep 2026): source, journey, transport detail, travel pass, ticket, cart, sticky total, review, sent journey, the stage graph — and a persisted 85 becomes 105 on load', () => {
  const w = page({ modules: WITH_PASS, seed: { 'siyl.bag': [{ id: 'c86', name: 'C86 · Kunming → Lijiang', meta: '04 March 2027 · Business Class', price: 85, qty: 1 }] } });
  const P = w.SIYL_PRICE, B = w.SIYL_BAG, J = w.SIYL_JOURNEY;
  assert.equal(P.FLAT.c86.price, 105, 'the source'); assert.match(P.FLAT.c86.basis, /^USD 105 per person · 1 seat · Business Class$/);
  assert.equal(P.items('c86')[0].price, 105, 'the selectable item');
  const line = B.get().find((x) => x.id === 'c86');
  assert.equal(line.price, 105, 'a stale 85 saved in the bag is re-derived to 105 on load');
  assert.match(J.meta(line).basis, /USD 105 per person/, 'the journey line words');
  assert.equal(B.total(), 105, 'the sticky total / cart total');
  assert.equal(w.SIYL_TRAVELPASS.docFromPage('c86').price, 105, 'the travel pass carries the same amount');
  const doc = TP.docFor('c86', { guest: { guestId: 'g-peggy', fullName: 'Peggy Demo', preferredName: 'Peggy' }, price: 105, state: 'selected' });
  assert.equal(doc.price, 105); assert.doesNotMatch(TP.payload(doc), /105|\b85\b|USD/, 'the code carries no amount');
  const pdf = TP.compose(doc); assert.ok(pdf.includes('USD 105') || pdf.includes('105'), 'the ticket PDF shows the cost where a cost is shown'); assert.doesNotMatch(pdf, /USD 85\b/);
  /* the stage graph: C86 is the mandatory stage of China at 105 (no package, 21 Sep 2026) */
  assert.ok(w.SIYL_GRAPH && w.SIYL_GRAPH.MANDATORY.includes('c86'), 'the Kunming → Lijiang train is mandatory inside China'); assert.equal(P.items('c86')[0].price, 105);
  /* no active surface carries 85 for C86 any more */
  for (const f of ['assets/pricing.js', 'assets/transport-data.js', 'journeys.html', 'transport.html', 'tickets.html', 'your-journey.html', 'cart.html', 'review.html']) {
    const s = src(f);
    assert.doesNotMatch(s, /c86[^\n]{0,120}\b85\b/i, f + ' carries C86 at 85');
  }
  assert.match(src('journeys.html'), /USD 105 per person<\/p><button class="add" data-private data-add='\{"id":"c86"/);
});

test('TEMPLE CEREMONY · a separate morning event: Sunday, 28 February 2027 · 09:00 – approximately 12:00 · Wat Ong Teu — no active 08:00', () => {
  const w = page({ auth: PEGGY });
  const T = w.SIYL_TEMPLE, ev = T.EVENTS.find((e) => e.key === 'temple');
  assert.equal(ev.label, 'Temple Ceremony'); assert.equal(ev.when, '09:00 – approximately 12:00'); assert.equal(ev.place, 'Wat Ong Teu, Vientiane');
  const prog = src('assets/journey.js');
  assert.match(prog, /key: 'temple', title: 'Temple Ceremony', when: '09:00 – approximately 12:00'/);
  for (const f of ['voyage.html', 'dress.html', 'wedding-preparation.html']) assert.match(src(f), /Temple Ceremony · 09:00 – approximately 12:00 · Wat Ong Teu, Vientiane|09:00 – approximately 12:00 · Wat Ong Teu, Vientiane/, f);
  for (const f of ACTIVE) assert.doesNotMatch(stripComments(src(f)), /\b08:00\b/, f + ' still carries the retired 08:00');
  assert.match(src('index.html') + src('voyage.html'), /Sunday, 28 February 2027/i);
  /* the temple has no seats of its own: attendance only */
  assert.equal(typeof T.attendingOf, 'function');
  assert.doesNotMatch(stripComments(src('assets/seatlabels.js') + src('assets/seatpass.js') + src('assets/seating.js')), /Temple|Wat Ong Teu/, 'no seat surface names the temple');
});

test('WEDDING (VOW) CEREMONY · Souphattra Heritage · Sunday, 28 February 2027 · 15:30 — distinct from the Temple Ceremony; the seats, the front centre, the tickets, the QR and the PDF belong to it', async () => {
  const ledger = { ok: true, open: true, frozen: false, configured: { ceremony: true, dinner: true }, mine: { ceremony: {}, dinner: {} }, ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
  const w = page({ auth: PEGGY, fetch: () => Promise.resolve({ json: () => Promise.resolve(ledger) }) });
  const T = w.SIYL_TEMPLE, vows = T.EVENTS.find((e) => e.key === 'vows'), temple = T.EVENTS.find((e) => e.key === 'temple');
  assert.equal(vows.label, 'Vow Ceremony'); assert.equal(vows.when, '15:30'); assert.match(vows.place, /^Souphattra Heritage/);
  assert.notEqual(vows.place, temple.place); assert.notEqual(vows.when, temple.when);
  assert.match(src('assets/journey.js'), /key: 'vows', title: 'Vow Ceremony', when: '15:30'/);
  assert.match(src('voyage.html'), /15:30 · Souphattra Heritage/);
  for (const f of ACTIVE) assert.doesNotMatch(stripComments(src(f)), /\b16:30\b/, f + ' still carries the retired 16:30');
  /* the seat vocabulary */
  assert.equal(L.EVENT_NAME.ceremony, 'Vow Ceremony'); assert.equal(L.EVENT_VENUE.ceremony, 'Souphattra Heritage, Vientiane'); assert.equal(L.EVENT_CODE.ceremony, 'WC'); assert.equal(L.EVENT_DATE, 'Sunday, 28 February 2027');
  assert.equal(PASS.EVENT_TIME.ceremony, '15:30'); assert.equal(PASS.EVENT_TIME.dinner, '19:30');
  assert.match(L.ref('INV-G001', 'G001', 'ceremony', 'C-R-04-02'), /^SYL-WC-E4-/, 'the reference names the Wedding Ceremony');
  /* a guest's chosen chair */
  const party = { invitationId: 'INV-G001', partyName: 'Peggy & Steffie', hosts: false, guests: [{ guestId: 'G001', fullName: 'Peggy Demo', preferredName: 'Peggy' }] };
  const doc = PASS.docFor(party, 'G001', { ceremony: { G001: 'C-R-04-02' }, dinner: {} }, ['ceremony'], '2026-09-15T10:00:00.000Z');
  const pay = PASS.payload(doc, doc.seats[0]);
  assert.match(pay, /^SEE YOU IN LAOS\nSEAT TICKET SYL-WC-E4-[A-Z0-9]{4}\nPeggy\nVow Ceremony\nSunday, 28 February 2027 · 15:30\nSeat E4 · Right block · row 4\nHELD$/, 'the QR payload maps to the Wedding Ceremony');
  const pdf = PASS.compose(doc);
  for (const t of ['Vow Ceremony', 'Sunday, 28 February 2027 \\267 15:30', 'Souphattra Heritage, Vientiane', 'SYL-WC-E4-']) assert.ok(pdf.includes(t), 'PDF: ' + t);
  assert.doesNotMatch(pdf, /Temple|Wat Ong Teu|08:00|09:00/, 'no wedding seat ticket says Wat Ong Teu or a morning time');
  const card = PASS.card(doc);
  assert.match(card, /Wedding Ceremony · Souphattra Heritage/); assert.match(card, /<h3 class="t-h1">Vow Ceremony<\/h3>/); assert.match(card, /15:30/); assert.doesNotMatch(card, /Temple|Wat Ong Teu|08:00|09:00/);
  /* the hosts: Bride and Groom front centre — at the Wedding Ceremony */
  const hosts = { invitationId: 'INV-G048', partyName: 'Haruthai & Suthep', hosts: true, guests: [{ guestId: 'G048', fullName: 'Haruthai Amphai', preferredName: 'Haruthai', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Thongantang', preferredName: 'Suthep', hostRole: 'GROOM' }] };
  for (const [g, role] of [['G048', 'Bride'], ['G049', 'Groom']]) {
    const d = PASS.docFor(hosts, g, { ceremony: {}, dinner: {} }, ['ceremony'], '2026-09-15T10:00:00.000Z');
    assert.deepEqual(d.seats, [{ event: 'ceremony', fixed: role.toUpperCase() }]);
    const p = PASS.compose(d), c = PASS.card(d);
    assert.ok(p.includes(role + ' \\267 Front Centre') && p.includes('Souphattra Heritage, Vientiane') && p.includes('15:30'), role + ' front centre at the Wedding Ceremony');
    assert.match(PASS.refOf(d, d.seats[0]), /^SYL-WC-FC-/); assert.doesNotMatch(p + c, /Temple|Wat Ong Teu|08:00|09:00/);
    assert.match(PASS.payload(d, d.seats[0]), /\nVow Ceremony\nSunday, 28 February 2027 · 15:30\n/);
  }
  /* the seat is needed for the Vow Ceremony, never for the temple: the readiness engine and every page gate on 'vows' */
  for (const f of ['wedding.html', 'wedding-preparation.html', 'review.html', 'assets/guest.js']) {
    const s = stripComments(src(f));
    assert.doesNotMatch(s, /attendingOf\([^)]*\)\s*(&&|\?)[^\n]{0,80}(seat|ceremony)/i, f + ' gates a ceremony seat on temple attendance');
  }
  assert.match(src('assets/guest.js'), /T\.joining\(me\.guestId, 'vows'\) && !p\.hosts && S\.configured\('ceremony'\)/, 'readiness: the ceremony seat follows the Vow Ceremony answer');
  assert.match(src('wedding-preparation.html'), /if\(ev==='ceremony'\)return !p\.hosts&&T\.joining\(id,'vows'\)/);
  assert.match(src('wedding.html'), /attends=ev==='ceremony'\?T\.joining\(id,'vows'\)/);
  assert.match(src('review.html'), /needC=!p\.hosts&&T\.joining\(me\.guestId,'vows'\)/);
  assert.match(src('review.html'), /Vow Ceremony \(Souphattra Heritage, 15:30\)/, 'the sent journey names the ceremony seat correctly');
  for (const f of ['wedding.html', 'wedding-preparation.html']) assert.match(src(f), /'Ceremony seat','Souphattra Heritage · 28 February · 15:30'/, f);
  assert.doesNotMatch(src('wedding.html') + src('wedding-preparation.html') + src('tickets.html'), /Wat Ong Teu · 28 February/);
  /* the readiness engine in motion: Peggy joining the vows without a chair is told so; not joining, nothing is asked */
  const S = w.SIYL_SEATS; await S.load(true); assert.equal(S.configured('ceremony'), true, 'the ledger is read');
  T.setEvent('g-peggy', 'vows', 'yes'); T.setAttendance('g-peggy', 'no');
  assert.ok(w.SIYL_GUEST.missingFor('preparation').map((m) => m.key).includes('seat:ceremony'), 'joining the vows (not the temple): a ceremony seat is asked for');
  T.setEvent('g-peggy', 'vows', 'no'); T.setAttendance('g-peggy', 'yes');
  assert.ok(!w.SIYL_GUEST.missingFor('preparation').map((m) => m.key).includes('seat:ceremony'), 'attending the temple but not the vows: no ceremony seat is asked for');
});

test('SATHORN PENTHOUSE · DELETED (Owner, 24 Sep 2026 · Edit 6): no room record, no USD 85 / USD 255 price, no quote that names it — and no active USD 90', () => {
  const w = page({ auth: PEGGY });
  const R = w.SIYL_ROOMS; assert.equal(Object.values(R).flatMap((s) => s.rooms || []).find((r) => r.slug === 'penthouse'), undefined, 'the room record is gone');
  assert.deepEqual([...R.sathorn.rooms.map((r) => r.slug)], ['u-sathorn-superior-garden'], 'Bangkok has exactly the one approved address (Shama Yen-Akat deleted, 24 Sep 2026)');
  const q = w.SIYL_PRICE.quote('bkk-stay', 'penthouse'); assert.notEqual(q && q.roomSlug, 'penthouse'); assert.doesNotMatch(JSON.stringify(q || {}), /Penthouse/, 'no quote names the deleted product');
  for (const f of ACTIVE) { const t = stripComments(src(f)); assert.doesNotMatch(t, /USD 90 per person|rate: 90\b/, f + ' carries the retired USD 90 rate'); assert.doesNotMatch(t, /Sathorn Penthouse|slug: 'penthouse'/, f + ' names the deleted Sathorn Penthouse'); }
});

test('EDIT 4 (Owner, 16 Sep 2026) · Luye Baisha and Siam Kempinski say self-pay everywhere the stay summary appears; Harudot sits in the existing Bangkok Cafés rail, never in a rail of its own; the stage never stays invisible', () => {
  assert.match(src('accommodation.html'), /<span class="sn">Luye Baisha<\/span><span class="sw">4 – 6 Mar<\/span><span class="sc">Lijiang · 2 nights · breakfast included · self-pay<\/span>/);
  assert.match(src('accommodation.html'), /<span class="sn">Siam Kempinski<\/span><span class="sw">6 – 8 Mar<\/span><span class="sc">Bangkok · 2 nights · breakfast included · self-pay<\/span>/);
  assert.match(src('journeys.html'), /<p class="pm">04 – 06 March · 2 nights · breakfast included · self-pay<\/p>/);
  assert.match(src('journeys.html'), /<p class="pm">06 – 08 March · 2 nights · breakfast included · self-pay<\/p>/);
  for (const f of ['accommodation.html', 'journeys.html']) assert.doesNotMatch(src(f), /2 nights · breakfast included(?! · self-pay)/, f + ': no summary of the two stays without self-pay');
  /* the taxonomy (22 Sep 2026): Bangkok is one chapter with one Cafés rail in the order of the days — Harudot once, in it */
  const x = src('experiences.html');
  assert.match(x, /box\.innerHTML = D\.rails\(key\)\.map\(function \(r\) \{ return rail\(r, key\); \}\)\.join\(''\);/, 'one rail per category of the chapter, from the one taxonomy');
  assert.doesNotMatch(x, /data-rails="bkk-return"/, 'no rail of the return on its own');
  assert.match(src('assets/venue.js'), /root\.setTimeout\(begin, 3000\);/, 'the stage enters by itself after three seconds at the latest');
});
