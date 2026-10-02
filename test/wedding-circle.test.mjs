/* YOUR WEDDING CIRCLE IS ALWAYS FINITE (Owner, 28 Sep 2026 · a production regression): My Profile stayed on "Looking up who is
   joining us…" for good when the circle's read stalled (no timeout) or when its module could not be fetched (the page fell back to
   the retired community block, whose data nothing asked for). Every read now ends — in the circle, or in a calm failure with a
   retry — and a seating read still under way or failed is never shown as "not assigned". Nothing here writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { page, plain, src, PEGGY, HARUTHAI } from './sandbox.mjs';
import { GENRES } from '../src/questionnaire.js';

/* the circle's read races a real timeout: the sandbox runs every timer at once, so these pages get the platform's own timers */
const timers = (w) => { w.setTimeout = (fn, ms) => setTimeout(fn, ms); w.clearTimeout = (t) => clearTimeout(t); return w; };
const PULSE = ['assets/seatlabels.js', 'assets/pulse.js'];
function seatsView() {
  const C = [];
  for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) C.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + String(r).padStart(2, '0') + '-0' + (i + 1), state: 'available' })) });
  const nums = [...Array(26).keys()].map((i) => i + 1).filter((n) => n !== 13);
  const side = (k) => nums.map((n) => ({ seatId: 'D-' + k + '-' + String(n).padStart(2, '0'), state: 'available', side: k }));
  return { ceremony: { rows: C }, dinner: { sides: { T: side('T'), B: side('B') } } };
}
function hold(v, seatId, holder, name, state) { const all = v.ceremony.rows.flatMap((r) => r.seats).concat(v.dinner.sides.T, v.dinner.sides.B); Object.assign(all.find((s) => s.seatId === seatId), { holder, name, state: state || 'taken' }); }
const DATA = (extra) => ({ ok: true, capacity: 50, joining: 4, couple: 2,
  people: [{ id: 'G048', name: 'Haruthai', photo: true, nationality: 'Thai', role: 'Bride', music: ['Pop'], after: 'pool' }, { id: 'G049', name: 'Suthep', photo: true, nationality: 'Thai, German', role: 'Groom', music: ['Latin'], after: 'party' },
    { id: 'G2', name: 'Ben', photo: false, nationality: 'German', joinedAt: '2026-09-19', music: ['Latin', 'Pop'], after: 'party' }, { id: PEGGY.guestId, name: 'Peggy', photo: false, nationality: 'Swiss', joinedAt: '2026-09-20', music: ['Latin'], after: 'pool' }],
  music: { responses: 4, leaders: ['Latin'], ranking: GENRES.map((g) => ({ genre: g, count: g === 'Latin' ? 3 : g === 'Pop' ? 2 : 0 })) }, after: { responses: 4, pool: 2, party: 2 }, ...(extra || {}) });
const seated = (w, v) => { w.SIYL_SEATS = { ready: () => true, error: () => null, view: () => v, seatOf: (ev, g) => (g === PEGGY.guestId ? (ev === 'ceremony' ? 'C-L-03-02' : 'D-T-07') : ev === 'dinner' ? 'D-B-11' : null) }; };

test('A SIGNED-IN GUEST · the whole circle: joining n / 50, the people with their nationality, the ceremony seat and who is around, the dinner seat, left · right · across, the thirteen genres, the favourite, pool and party', async () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE, v = seatsView();
  hold(v, 'C-L-03-02', PEGGY.guestId, 'Peggy', 'yours'); hold(v, 'C-L-03-01', 'G2', 'Ben'); hold(v, 'D-T-07', PEGGY.guestId, 'Peggy', 'yours'); hold(v, 'D-T-06', 'G2', 'Ben'); hold(v, 'D-B-07', 'G049', 'Suthep');
  seated(w, v); w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) });
  await P.load(true);
  const h = P.circleHtml({ guestId: PEGGY.guestId }, false);
  assert.match(h, /<b>4<\/b><span class="pl-of">\/ 50<\/span>/); assert.match(h, /Ben<\/span><span class="pl-pc">German/); assert.match(h, /Suthep<\/span><span class="pl-pc">Thai, German/);
  assert.match(h, /<span>Your seat<\/span> <b>B3<\/b>/); assert.match(h, /Around you[\s\S]*Ben/);
  assert.match(h, /<span>Your seat<\/span> <b>A7<\/b>/); assert.match(h, /Next to you[\s\S]*data-dir="l"[\s\S]*Ben/); assert.match(h, /Across from you[\s\S]*Suthep/);
  assert.equal((h.match(/class="pl-row/g) || []).length, 13, 'all thirteen genres'); assert.match(h, /Current favourite<\/span> · <b>Latin<\/b>/);
  assert.match(h, /data-pl-after="pool"[\s\S]*data-pl-after="party"/);
  assert.doesNotMatch(h, /Looking up|couldn’t load|@|\+66|birthdate|passport/);
});

test('THE HOSTS · Front centre, their own dinner seat with its neighbours, and the whole plan read-only', async () => {
  const w = timers(page({ auth: HARUTHAI, modules: PULSE })), P = w.SIYL_PULSE, v = seatsView();
  hold(v, 'D-B-11', 'G049', 'Suthep', 'yours'); hold(v, 'D-B-12', 'G048', 'Haruthai', 'party');
  v.ceremony.couple = [{ position: 'BRIDE', role: 'Bride', fixed: true, holder: 'G048', name: 'Haruthai', state: 'party' }, { position: 'GROOM', role: 'Groom', fixed: true, holder: 'G049', name: 'Suthep', state: 'yours' }];
  seated(w, v); w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) });
  await P.load(true);
  const h = P.circleHtml({ guestId: 'G049' }, true);
  /* THE COUPLE ARE IN THE PLAN (Owner, 2 Oct 2026): Suthep's own place is the Groom's, marked as his, the whole plan beside it */
  assert.match(h, /<span>Your seat<\/span> <b>Groom<\/b><span>Front centre<\/span>/); assert.match(h, /data-pl-place="GROOM"><i class="pl-c is-me">/); assert.match(h, /data-pl-place="BRIDE"><i class="pl-c is-held">/);
  assert.match(h, /<span>Your seat<\/span> <b>B11<\/b>/); assert.match(h, /Next to you[\s\S]*Haruthai/);
  assert.match(h, /data-pl-roster/); assert.doesNotMatch(h, /<form|<select|data-select|data-hold|draggable/);
});

test('A STALLED READ ENDS · no answer within the timeout is a calm failure with a retry — never an endless "Looking up…"; the retry reads again and draws the circle', async () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE, v = seatsView(); seated(w, v);
  w.SIYL_PULSE_TIMEOUT = 40;
  w.fetch = () => new Promise(() => {});   /* the connection never answers */
  assert.match(P.circleHtml({ guestId: PEGGY.guestId }, false), /data-pl-circle-state="loading"/);
  await P.load(true);
  assert.equal(P.failed(), true);
  const f = P.circleHtml({ guestId: PEGGY.guestId }, false);
  assert.match(f, /data-pl-circle-state="unavailable"/); assert.match(f, /We couldn’t load your Wedding Circle just now\./); assert.match(f, /data-pl-retry/);
  assert.doesNotMatch(f, /Looking up|\b0\b \/ 50/, 'unknown is never shown as zero');
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) });
  await P.load(true);
  assert.equal(P.failed(), false); assert.match(P.circleHtml({ guestId: PEGGY.guestId }, false), /<b>4<\/b><span class="pl-of">\/ 50<\/span>/);
});

test('A REFUSED READ ENDS · a 503 edge page (the platform\'s, not JSON) is the same calm failure; the retry button is wired to read again', async () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE; seated(w, seatsView());
  w.fetch = () => Promise.resolve({ ok: false, status: 503, json: () => Promise.reject(new Error('not json')) });
  await P.load(true);
  const f = P.circleHtml({ guestId: PEGGY.guestId }, false);
  assert.match(f, /data-pl-circle-state="unavailable"/);
  /* the circle as the page holds it: the retry button is the one control the failure carries */
  const on = {}, btn = { addEventListener: (t, fn) => { on[t] = fn; } };
  const root = { attrs: {}, getAttribute(k) { return this.attrs[k] || null; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, querySelectorAll: () => [], querySelector: (q) => (q === '[data-pl-retry]' ? btn : null) };
  let redrawn = 0, calls = 0;
  w.fetch = () => { calls++; return Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) }); };
  P.wireCircle(root, () => { redrawn++; });
  on.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(redrawn >= 1 && calls === 1, 'the retry redraws and reads once'); assert.equal(P.failed(), false); assert.ok(P.data());
});

test('THE SEATS UNKNOWN ARE UNKNOWN · a seating read still under way says so; one that failed says so — neither reads "Not assigned yet"', async () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE;
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) }); await P.load(true);
  w.SIYL_SEATS = { ready: () => false, error: () => null, view: () => null, seatOf: () => null };
  let h = P.circleHtml({ guestId: PEGGY.guestId }, false);
  assert.match(h, /data-pl-seats="loading"/); assert.doesNotMatch(h, /Not assigned yet/);
  w.SIYL_SEATS = { ready: () => false, error: () => 'unreachable', view: () => null, seatOf: () => null };
  h = P.circleHtml({ guestId: PEGGY.guestId }, false);
  assert.match(h, /data-pl-seats="unavailable"/); assert.doesNotMatch(h, /Not assigned yet/);
});

test('THE PAGE · the circle is always drawn by its own module or by its own failure (with a retry that fetches the module again) — never the retired community block; a signed-out visitor reads nothing; nothing writes', () => {
  const prof = src('profile.html'), js = src('assets/pulse.js');
  assert.match(prof, /function circle\(me,p\)\{var PL=window\.SIYL_PULSE;if\(!PL\)return circleDown\(\);try\{return PL\.circleHtml\(me,isHost\(me,p\)\)\}catch\(e\)\{return circleDown\(\)\}\}/);
  assert.doesNotMatch(prof.slice(prof.indexOf('function circle('), prof.indexOf('function circle(') + 200), /communityHtml/);
  assert.match(prof, /data-pl-reload/); assert.match(prof, /function wirePulseRetry/);
  const w = timers(page({ auth: null, modules: PULSE })); let called = 0; w.fetch = () => { called++; return Promise.resolve({ ok: true, json: () => Promise.resolve(DATA()) }); };
  return w.SIYL_PULSE.load(true).then((d) => { assert.equal(d, null); assert.equal(called, 0, 'signed out: no read at all');
    assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ''), /method:\s*'(PUT|POST|DELETE)'|sendBeacon|localStorage\.setItem/, 'viewing the circle writes nothing'); });
});
