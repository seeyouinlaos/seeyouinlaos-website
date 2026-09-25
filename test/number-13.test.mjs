/* D-29 (Owner, 24 Sep 2026, permanent): 13 is never a guest-facing seat number. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../assets/seatlabels.js');
const S = await import('../src/seating.js');
const M = await import('../src/mail-templates.js');
const two = (n) => (n < 10 ? '0' : '') + n;

test('NUMBER 13 · the dinner has 50 seats (Owner override, 25 Sep 2026): A1–A12, A14–A26 and B1–B12, B14–B26 — nothing renumbered, no substitute', () => {
  const labs = []; for (const side of ['T', 'B']) for (let n = 1; n <= 30; n++) { const l = L.label('D-' + side + '-' + two(n)); if (l) labs.push(l); }
  assert.equal(labs.length, 50); assert.ok(labs.includes('A26') && labs.includes('B26')); assert.ok(!labs.includes('A27'));
  assert.ok(!labs.some((l) => /13$/.test(l)));
  assert.equal(L.label('D-T-12'), 'A12'); assert.equal(L.label('D-T-14'), 'A14'); assert.equal(L.label('D-B-12'), 'B12'); assert.equal(L.label('D-B-14'), 'B14');
  assert.equal(L.seatId('dinner', 'A13'), null); assert.equal(L.seatId('dinner', 'B13'), null);
  assert.equal(L.seatId('dinner', 'A12A'), null); assert.equal(L.seatId('dinner', 'B12B'), null);
  assert.equal(S.CAPACITY.dinner.guestSeats, 50); assert.equal(S.CAPACITY.dinner.top, 25); assert.equal(S.CAPACITY.dinner.bottom, 25);
});
test('NUMBER 13 · permanent: no event, no future geometry can produce a seat 13', () => {
  assert.equal(S.NEVER_SEAT_NUMBER, 13);
  assert.ok(S.isRetiredSeat('D-T-13') && S.isRetiredSeat('D-B-13') && S.isRetiredSeat('C-L-13-01') && S.isRetiredSeat('C-R-13-03'));
  assert.equal(L.label('C-L-13-01'), null); assert.equal(L.seatId('ceremony', 'A13'), null);
  const cfg = { dinner: { sides: { T: Array.from({ length: 25 }, (_, i) => ({ seatId: 'D-T-' + two(i + 1) })), B: Array.from({ length: 25 }, (_, i) => ({ seatId: 'D-B-' + two(i + 1) })) } } };
  const seats = S.seatsOf(cfg, 'dinner');
  assert.equal(seats.length, 50); assert.ok(!seats.some((s) => /-13$/.test(s.seatId)));
  /* FUTURE GENERATION: the one generator skips 13 by construction — any stored geometry (none, the 48, one naming 13s or 27s)
     reads as the same fifty, and a validated upload is normalised to them */
  for (const any of [{ dinner: { sides: { T: [], B: [] } } }, { dinner: { sides: { T: [{ seatId: 'D-T-13' }], B: [{ seatId: 'D-B-13' }] } } }]) {
    const ids = S.seatsOf(any, 'dinner').map((x) => x.seatId);
    assert.equal(ids.length, 50); assert.equal(new Set(ids).size, 50); assert.ok(!ids.some((x) => /-13$/.test(x)));
  }
  for (const side of ['T', 'B']) { const g = S.dinnerSeatIds(side); assert.equal(g.length, 25); assert.ok(!g.includes('D-' + side + '-13')); assert.equal(g[g.length - 1], 'D-' + side + '-26'); }
  const v = S.validateGeometry({ ...cfg, ceremony: undefined }); assert.ok(!(v.config.dinner.sides.T.concat(v.config.dinner.sides.B)).some((x) => /-13$/.test(x.seatId)));
  const cer = { ceremony: { rows: [{ side: 'L', row: 13, seats: [{ seatId: 'C-L-13-01' }, { seatId: 'C-L-13-02' }] }, { side: 'L', row: 12, seats: [{ seatId: 'C-L-12-01' }] }] } };
  assert.deepEqual(S.seatsOf(cer, 'ceremony').map((s) => s.seatId), ['C-L-12-01']);
});
test('NUMBER 13 · a hold on a removed 13 never reaches the guest email as a seat number', () => {
  assert.equal(typeof M.seatLabel, 'function');
  assert.equal(M.seatLabel('D-T-13') || null, null);
});
