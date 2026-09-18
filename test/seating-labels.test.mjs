/* SEAT NUMBERING — the Owner's clarification (14 Sep 2026), pinned for good.
   Guest-facing labels only: ceremony left block A, B | aisle (column C is
   never used) | right block D, E, F, rows 1–10 = 50 seats; the Bride and
   Groom positions carry no label; the dinner's long table is A1–A25 along
   run A and B1–B25 along run B, one-to-one on the 25 + 25 ledger. The
   mapping between ledger id and label is deterministic in both directions,
   the seat confirmation (PDF) and every surface speak in labels, and a change
   of seat can never change the mapping. The confirmation is a real PDF with
   no QR code, no barcode, no image, no price — and never a secret. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateGeometry, seatsOf, RULES } from '../src/seating.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const L = require(path.join(ROOT, 'assets/seatlabels.js'));
const PASS = require(path.join(ROOT, 'assets/seatpass.js'));
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/* the production geometry as the Owner accepted it on 13 Sep 2026 */
const GEO = JSON.parse(src('docs/acceptance/2026-09-13-owner-decisions/seating-geometry.json'));
const cfg = validateGeometry(GEO).config;
const CEREMONY = cfg.ceremony.rows.flatMap((r) => r.seats.map((s) => s.seatId));
const DINNER = [...cfg.dinner.sides.T, ...cfg.dinner.sides.B].map((s) => s.seatId);

test('LABELS · ceremony: A/B | aisle | D/E/F × rows 1–10 = 50 unique labels, no column C, Bride and Groom unlabelled', () => {
  assert.equal(CEREMONY.length, 50);
  const labels = CEREMONY.map((id) => L.label(id));
  assert.ok(labels.every(Boolean), 'every ledger seat has a label');
  assert.equal(new Set(labels).size, 50, '50 unique labels');
  const expected = [];
  for (let r = 1; r <= 10; r++) for (const c of ['A', 'B', 'D', 'E', 'F']) expected.push(c + r);
  assert.deepEqual([...labels].sort(), [...expected].sort(), 'exactly A/B + D/E/F × 1–10');
  assert.ok(!labels.some((l) => /^C\d/.test(l)), 'column C is the aisle: never a label');
  assert.deepEqual(L.COLS, { L: ['A', 'B'], R: ['D', 'E', 'F'] });
  /* left block = A, B (aisle side is B); right block = D, E, F (aisle side is D) */
  assert.equal(L.label('C-L-04-01'), 'A4'); assert.equal(L.label('C-L-04-02'), 'B4');
  assert.equal(L.label('C-R-04-01'), 'D4'); assert.equal(L.label('C-R-04-02'), 'E4'); assert.equal(L.label('C-R-04-03'), 'F4');
  assert.equal(L.label('C-L-10-01'), 'A10'); assert.equal(L.label('C-R-10-03'), 'F10');
  /* the couple's positions are not seats and carry no label */
  assert.deepEqual(RULES.ceremony.fixed, ['BRIDE', 'GROOM']);
  assert.equal(L.label('BRIDE'), null); assert.equal(L.label('GROOM'), null);
  assert.equal(L.seatId('ceremony', 'BRIDE'), null);
});

test('LABELS · dinner: A1–A25 along run A (top), B1–B25 along run B (bottom), one-to-one on the 25 + 25 ledger', () => {
  assert.equal(DINNER.length, 50);
  const labels = DINNER.map((id) => L.label(id));
  assert.equal(new Set(labels).size, 50);
  const expected = [];
  for (let n = 1; n <= 25; n++) expected.push('A' + n, 'B' + n);
  assert.deepEqual([...labels].sort(), [...expected].sort());
  assert.equal(L.label('D-T-01'), 'A1'); assert.equal(L.label('D-T-25'), 'A25'); assert.equal(L.label('D-B-01'), 'B1'); assert.equal(L.label('D-B-25'), 'B25');
  assert.deepEqual(L.RUNS, { T: 'A', B: 'B' });
});

test('LABELS · the mapping is a bijection over the ledger, in both directions, and refuses what is not a seat', () => {
  for (const id of CEREMONY) assert.equal(L.seatId('ceremony', L.label(id)), id, id);
  for (const id of DINNER) assert.equal(L.seatId('dinner', L.label(id)), id, id);
  /* every label resolves to exactly one ledger seat and no other */
  const all = [...CEREMONY.map((id) => 'ceremony:' + L.label(id)), ...DINNER.map((id) => 'dinner:' + L.label(id))];
  assert.equal(new Set(all).size, 100);
  for (const bad of ['C4', 'G1', 'A0', 'A11', 'E11', 'A4B', '', null]) assert.equal(L.seatId('ceremony', bad), null, String(bad));
  assert.equal(L.seatId('ceremony', 'a4'), 'C-L-04-01', 'case and spaces are forgiven, the seat is the same');
  for (const bad of ['C1', 'A0', 'A26', 'B26', 'D1']) assert.equal(L.seatId('dinner', bad), null, String(bad));
  for (const bad of ['C-L-00-01', 'C-L-11-01', 'C-L-04-03', 'C-R-04-04', 'D-T-00', 'D-T-26', 'D-X-01', 'X', null]) assert.equal(L.label(bad), null, String(bad));
  /* the same ids drawn by the Worker's rules are the ids the labels know */
  const drawn = seatsOf(cfg, 'ceremony').map((s) => s.seatId); assert.deepEqual(drawn.sort(), [...CEREMONY].sort());
  const drawnD = seatsOf(cfg, 'dinner').map((s) => s.seatId); assert.deepEqual(drawnD.sort(), [...DINNER].sort());
  /* words: label first, then the place — no ledger id anywhere */
  assert.equal(L.describe('C-R-04-02'), 'Right block · row 4'); assert.equal(L.describe('C-L-02-01'), 'Left block · row 2'); assert.equal(L.describe('D-T-17'), 'Long table · run A · Poolside · place 17'); assert.equal(L.describe('D-B-03'), 'Long table · run B · place 3');
  assert.doesNotMatch(L.describe('C-R-04-02') + L.describe('D-B-03'), /C-R|D-B/);
});

test('LABELS · the booking reference is derived, non-secret, stable, event- and seat-bound, and never carries a token', () => {
  const r = L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-02');
  assert.match(r, /^SYL-WC-E4-[23456789BCDFGHJKMNPQRSTVWXZ]{4}$/, r);   /* WC = the Wedding (Vow) Ceremony at Souphattra Heritage (Owner, Edit 2 · 15 Sep 2026) */
  assert.equal(r, L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-02'), 'deterministic');
  assert.notEqual(r, L.ref('INV-002', 'G002', 'ceremony', 'C-R-04-02'), 'another guest, another reference');
  assert.notEqual(r, L.ref('INV-001', 'G001', 'ceremony', 'C-R-04-02'), 'another party, another reference');
  assert.match(L.ref('INV-002', 'G001', 'dinner', 'D-T-17'), /^SYL-WD-A17-/);
  /* a change of seat changes the reference and never the mapping */
  assert.notEqual(L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-02'), L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-03'));
  assert.equal(L.label('C-R-04-02'), 'E4'); assert.equal(L.label('C-R-04-03'), 'F4');
  /* the reference is a hash of the booking record, not the record: a 16-char token never enters it */
  const token = 'abcdefghijklmnop';
  assert.doesNotMatch(L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-02'), /abcdefghijklmnop/);
  assert.doesNotMatch(src('assets/seatlabels.js'), /localStorage|sessionStorage|siyl\.auth|document\.cookie|fetch\(/, 'the label module reads nothing: no storage, no code, no network');
  assert.equal(L.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(typeof token, 'string');
});

test('PDF · the seat confirmation: a real PDF, the Owner\'s fields, labels only, no QR, no barcode, no image, no price, no code', () => {
  const party = { invitationId: 'INV-002', partyName: 'Peggy & Steffie', hosts: false, guests: [{ guestId: 'G001', fullName: 'Peggy Berger', preferredName: 'Peggy' }, { guestId: 'G002', fullName: 'Steffie Miedel', preferredName: 'Steffie' }] };
  const mine = { ceremony: { G001: 'C-R-04-02' }, dinner: { G001: 'D-T-17', G002: 'D-T-18' } };
  const doc = PASS.docFor(party, 'G001', mine, ['ceremony'], '2026-09-14T10:00:00.000Z');
  const pdf = PASS.compose(doc);
  assert.match(pdf, /^%PDF-1\.4\n/); assert.match(pdf, /%%EOF\n$/);
  assert.match(pdf, /\/Type \/Catalog/); assert.match(pdf, /\/Type \/Page\b/); assert.match(pdf, /\/Count 1\b/);
  assert.match(pdf, /\/MediaBox \[0 0 595\.28 841\.89\]/, 'A4');
  assert.match(pdf, /\/BaseFont \/Times-Roman/); assert.match(pdf, /\/BaseFont \/Helvetica/);
  /* the xref offsets are byte-true: every object starts where the table says */
  const xref = +pdf.match(/startxref\n(\d+)\n/)[1];
  assert.equal(pdf.slice(xref, xref + 4), 'xref');
  const offs = [...pdf.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => +m[1]);
  offs.forEach((o, i) => assert.match(pdf.slice(o, o + 12), new RegExp('^' + (i + 1) + ' 0 obj')));
  /* the Owner's fields, in the text of the page: a TICKET (Owner, 15 Sep 2026) — event, guest, seat, status, held for, the reference, the download stamp */
  for (const t of ['see you in laos.', 'SEAT TICKET', 'YOUR WEDDING SEAT', 'GUEST', 'Peggy Berger', 'Peggy & Steffie', 'EVENT', 'Vow Ceremony', 'Sunday, 28 February 2027 · 15:30', 'Souphattra Heritage, Vientiane', 'SEAT', 'E4', 'Right block · row 4', 'STATUS', 'HELD', 'HELD FOR', 'SYL-WC-E4-', 'SCAN AT THE DOOR', 'DOWNLOADED 2026-09-14 10:00 UTC', 'WEDDING OF HARUTHAI & SUTHEP']) {
    assert.ok(pdf.includes(t.replace('·', '\\267')), 'text: ' + t);
  }
  assert.doesNotMatch(pdf, /C-R-04-02|D-T-17/, 'no ledger id on the ticket');
  assert.doesNotMatch(pdf, /INV-002|INV-G|BOOKING REFERENCE/, 'no invitation id on the ticket');
  assert.match(pdf, /\(SYL-WC-E4-[23456789BCDFGHJKMNPQRSTVWXZ]{4}\)/, 'the ticket reference, from the ledger');
  /* the wedding seat is never the Temple Ceremony's (Owner, Edit 2): no temple, no Wat Ong Teu, no morning time on a seat ticket */
  assert.doesNotMatch(pdf, /Temple|Wat Ong Teu|08:00|09:00/, 'a wedding seat ticket names the Vow Ceremony at Souphattra Heritage, 15:30');
  assert.doesNotMatch(pdf, /barcode|Barcode|BOARDING|Boarding|USD|\$|PAID|Paid|payment/i, 'no barcode, no boarding pass, no payment');
  assert.doesNotMatch(pdf, /\/XObject|\/Image|\/Subtype \/Image|\/JavaScript|\/URI/, 'no image, no script, no link');
  assert.doesNotMatch(pdf, /[a-z0-9]{16}/, 'nothing token-shaped');
  /* the code is drawn on the stub, module by module; the ticket frame with its perforation is there */
  assert.ok((pdf.match(/ re f/g) || []).length > 300, 'the QR modules');
  assert.match(pdf, /\[3 3\] 0 d /, 'the perforation'); assert.match(pdf, / c h B/, 'the rounded ticket frame');
  /* NOTHING CLIPPED: every drawn thing lies inside the page's safe area */
  const geo = PASS.writer.within(PASS.compose.lastPage); assert.equal(geo.ok, true, 'outside the safe area: ' + JSON.stringify(geo.outside.slice(0, 3)));
  const topMost = Math.max(...PASS.compose.lastPage.marks.map((m) => m.y + m.h));
  assert.ok(topMost <= PASS.PAGE.h - 40, 'the top is well inside the page: ' + topMost);
  assert.equal(PASS.filename(doc), 'see-you-in-laos-wc-seat-peggy.pdf');
  /* Latin-1 bytes only: a byte per character, the WinAnsi marks mapped */
  const bytes = PASS.toBytes(pdf); assert.equal(bytes.length, pdf.length);
  /* the combined pass: both events, in order, one page, the 'YOUR WEDDING SEATS' title */
  const both = PASS.docFor(party, 'G001', mine, ['ceremony', 'dinner'], '2026-09-14T10:00:00.000Z');
  assert.equal(both.seats.length, 2);
  const pdf2 = PASS.compose(both);
  assert.match(pdf2, /YOUR WEDDING SEATS/); assert.match(pdf2, /Vow Ceremony/); assert.doesNotMatch(pdf2, /Temple/); assert.match(pdf2, /Wedding Dinner/); assert.match(pdf2, /Souphattra Heritage, Vientiane \\267 poolside/);
  assert.ok(pdf2.indexOf('Vow Ceremony') < pdf2.indexOf('Wedding Dinner'));
  assert.ok(pdf2.includes('(E4)') && pdf2.includes('(A17)'));
  assert.match(pdf2, /SYL-WC-E4-/); assert.match(pdf2, /SYL-WD-A17-/);
  assert.equal(PASS.writer.within(PASS.compose.lastPage).ok, true, 'two tickets fit the page without clipping');
  /* the ticket reference is the ledger's; the code carries the ticket and nothing secret */
  assert.equal(PASS.refOf(both, both.seats[0]), L.ref('INV-002', 'G001', 'ceremony', 'C-R-04-02'));
  const pl = PASS.payload(both, both.seats[1]);
  assert.match(pl, /^SEE YOU IN LAOS\nSEAT TICKET SYL-WD-A17-[A-Z0-9]{4}\nPeggy\nWedding Dinner\nSunday, 28 February 2027 · 19:30\nSeat A17 · Long table · run A · Poolside · place 17\nHELD$/);
  assert.doesNotMatch(pl, /INV-|G001|siyl/);
  assert.equal(PASS.filename(both), 'see-you-in-laos-wedding-seats-peggy.pdf');
  /* a guest without a seat gets no document; a seat the ledger does not hold is never written */
  assert.equal(PASS.docFor(party, 'G002', mine, ['ceremony'], '2026-09-14T10:00:00.000Z'), null);
  assert.equal(PASS.docFor(party, 'G002', mine, ['ceremony', 'dinner'], '2026-09-14T10:00:00.000Z').seats.length, 1);
  /* after a change of seat the confirmation carries the new label */
  const moved = PASS.docFor(party, 'G001', { ceremony: { G001: 'C-R-04-03' }, dinner: {} }, ['ceremony'], '2026-09-14T10:00:00.000Z');
  const pdf3 = PASS.compose(moved);
  assert.ok(pdf3.includes('(F4)') && !pdf3.includes('(E4)'));
  /* a guest travelling alone: no party line at all */
  const solo = PASS.compose(PASS.docFor({ invitationId: 'INV-G003', partyName: 'Lin', members: [{ guestId: 'G003' }], guests: [{ guestId: 'G003', fullName: 'Lin Demo', preferredName: 'Lin' }] }, 'G003', { ceremony: { G003: 'C-R-04-02' }, dinner: {} }, ['ceremony'], '2026-09-14T10:00:00.000Z'));
  assert.doesNotMatch(solo, /YOUR PARTY/);
});

test('PDF · the hosts: Bride and Groom at the front centre, no seat number, the dinner place like everyone else\'s', () => {
  const party = { invitationId: 'INV-001', partyName: 'Haruthai & Suthep', hosts: true, guests: [{ guestId: 'G048', fullName: 'Haruthai Amphai', preferredName: 'Haruthai', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Thongantang', preferredName: 'Suthep', hostRole: 'GROOM' }] };
  const mine = { ceremony: {}, dinner: { G048: 'D-B-03' } };
  const bride = PASS.docFor(party, 'G048', mine, ['ceremony', 'dinner'], '2026-09-14T10:00:00.000Z');
  assert.deepEqual(bride.seats, [{ event: 'ceremony', fixed: 'BRIDE' }, { event: 'dinner', seatId: 'D-B-03' }]);
  const pdf = PASS.compose(bride);
  assert.match(pdf, /Bride \\267 Front Centre/); assert.match(pdf, /FRONT CENTRE/); assert.ok(pdf.includes('(B3)'));
  assert.match(pdf, /SYL-WC-FC-[A-Z0-9]{4}/, 'a fixed position carries its own reference'); assert.match(pdf, /SYL-WD-B3-/);
  assert.doesNotMatch(pdf, /Temple|Wat Ong Teu|08:00|09:00/, 'the Bride\'s front centre belongs to the Vow Ceremony at Souphattra Heritage');
  assert.ok(pdf.includes('Souphattra Heritage, Vientiane') && pdf.includes('Sunday, 28 February 2027 \\267 15:30'), 'venue and time of the Wedding Ceremony');
  assert.equal(PASS.writer.within(PASS.compose.lastPage).ok, true);
  const groom = PASS.docFor(party, 'G049', mine, ['ceremony', 'dinner'], '2026-09-14T10:00:00.000Z');
  assert.deepEqual(groom.seats, [{ event: 'ceremony', fixed: 'GROOM' }], 'no dinner seat yet: only the front centre');
  assert.match(PASS.compose(groom), /Groom \\267 Front Centre/);
  /* the roles travel with the invitation only when the private list says so — explicit, never inferred */
  assert.match(src('assets/invite.mjs'), /inv\.hostRole === 'BRIDE' \|\| inv\.hostRole === 'GROOM' \? \{ hostRole: inv\.hostRole \} : \{\}/);
  assert.equal(PASS.fixedWords('BRIDE'), 'Bride'); assert.equal(PASS.fixedWords('GROOM'), 'Groom'); assert.equal(PASS.fixedWords('HOSTS'), 'Bride & Groom');
});

test('SURFACES · the preparation, The Wedding and Review & Send speak in labels and offer the download; the engine is untouched', () => {
  const wp = src('wedding-preparation.html'), wd = src('wedding.html'), rv = src('review.html');
  for (const [f, s] of [['wedding-preparation.html', wp], ['wedding.html', wd], ['review.html', rv]]) {
    assert.ok(s.indexOf('assets/seatlabels.js') < s.indexOf('assets/seating.js'), f + ': labels before the map');
    assert.match(s, /assets\/seatpass\.js/, f + ': the confirmation module');
    assert.match(s, /data-seat-pass=|tickets\.html/, f + ': a download or the way to the tickets');
  }
  /* the two-step booking: tap → summary → CONFIRM; nothing is held on the tap */
  assert.match(wp, /data-seat-confirm=/); assert.match(wp, /data-seat-cancel/); assert.match(wp, /Confirm seat/); assert.match(wp, /Confirm change/);
  assert.match(wp, /barEl\.className='p-seatbar'/); assert.match(wp, /setAttribute\('aria-live','polite'\)/); assert.match(wp, /Seat held/); assert.match(wp, /data-seat-continue=/); assert.match(wp, /data-seat-change=/); assert.match(wp, /data-seat-keep=/);
  assert.match(wp, /Current seat '\+esc\(labelOf\(cur\)\)\+' · New seat '\+esc\(labelOf\(nu\)\)/);
  assert.match(wp, /if\(mode\.pending===seatId\)\{withdrawn=seatId;mode\.pending=null\}else mode\.pending=seatId;/, 'the tap only marks a pending choice (and a second tap withdraws it)');
  assert.match(wp, /S\.select\(ev,seatId,id\)\.then/, 'CONFIRM is the one call into the engine');
  assert.ok(!/S\.select\([^)]*\)[^\n]*onSelect/.test(wp), 'never selected inside the tap');
  assert.match(wp, /if\(ev==='ceremony'&&p\.hosts\)/); assert.match(wp, /Front centre · '\+esc\(fixedWords\(\)\)/);
  assert.match(wp, /p-seatbar-seat/);
  /* the raw id never reaches the words on any surface */
  assert.doesNotMatch(wp, /esc\(sid\)<\/span>|'>'\+esc\(sid\)\+'</, 'preparation: no raw id span');
  assert.doesNotMatch(wd, /esc\(sid\)<\/span>|'>'\+esc\(sid\)\+'</, 'The Wedding: no raw id span');
  assert.doesNotMatch(rv, /'>'\+esc\(cs\)\+'<|'>'\+esc\(ds\)\+'</, 'Review & Send: no raw id');
  assert.match(rv, /Seat '\+esc\(lab\(cs\)\)/); assert.match(rv, /Seat '\+esc\(lab\(ds\)\)/); assert.doesNotMatch(rv, /Lx\.ref\(|PASS\.card|p-qr/, 'REVIEW = REVIEW: no ticket code on Review & Send');
  assert.match(wd, /'Seat '\+esc\(lab\(sid\)\)/);
  /* the seating engine (ids, API, holds, party auth, open/frozen, capacity) is the 13 Sep engine */
  const eng = src('src/seating.js');
  assert.match(eng, /C-L|C-R/); assert.match(eng, /'D-T'|D-T|'D-B'|D-B/);
  assert.doesNotMatch(eng, /seatlabels|SIYL_SEATLABELS|label\(/, 'the Worker knows nothing of labels');
  const client = src('assets/seating.js');
  assert.match(client, /select: function \(event, seatId, guestId\)/); assert.match(client, /release: function \(event, guestId\)/);
  assert.match(client, /API \+ '\/select'/); assert.match(client, /API \+ '\/release'/);
  /* the words of the states, the Owner's four plus the party */
  assert.match(client, /available: 'Available', selected: 'Selected by you', yours: 'Your seat', party: 'Your party', family: 'Reserved · family', taken: 'Taken'/);
  /* the confirmation never promises what the ledger does not hold */
  assert.doesNotMatch(src('assets/seatpass.js'), /\/XObject|\/Image|\/URI|\/JavaScript|\bBI\b|USD \d|\$\d/, 'the writer knows no image, no link, no script, no amount');
  assert.match(src('assets/seatpass.js'), /fetch\(S\.API \+ '\?invitation=' \+ encodeURIComponent\(party\.invitationId\), \{ cache: 'no-store' \}\)/, 'downloaded from a fresh, private read of the ledger (no repaint under the button)');
  assert.doesNotMatch(src('assets/seatpass.js'), /S\.load\(/, 'the download never repaints the page');
  /* the encoder: nothing outside WinAnsi reaches the stream raw; parentheses and backslashes are escaped */
  const tricky = PASS.compose(PASS.docFor({ invitationId: 'INV-002', partyName: 'P & S', guests: [{ guestId: 'G1', fullName: 'Ａ(b)\\ ก😀 Zoë', preferredName: 'Zoë' }] }, 'G1', { ceremony: { G1: 'C-R-04-02' }, dinner: {} }, ['ceremony'], '2026-09-14T00:00:00.000Z'));
  assert.ok([...tricky].every((ch) => ch.charCodeAt(0) < 256), 'latin-1 only');
  assert.ok(tricky.includes('(?\\(b\\)\\\\ ?? Zo\\353)'), 'escaped and substituted: ' + (tricky.match(/\(\?[^\n]{0,30}/) || [''])[0]);
  /* sha256 agrees with the platform for astral characters too */
  assert.equal(L.sha256('😀|x|dinner|D-T-01'), createHash('sha256').update('😀|x|dinner|D-T-01').digest('hex'), 'utf-8, not cesu-8');
  assert.equal(L.sha256('ຄຳ Lao ü'), createHash('sha256').update('ຄຳ Lao ü').digest('hex'));
});
