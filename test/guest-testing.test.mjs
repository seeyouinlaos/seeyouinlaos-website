/* OWNER CORRECTIONS FROM GUEST TESTING · 13 Sep 2026 · rewritten for THE CANONICAL BOOKING MODEL (Owner, 19 Sep 2026)
   Deterministic coverage for the corrected behaviours: a package is a package — for the stages it covers it replaces a
   conflicting choice, keeps a matching one, lifts a "not joining" on confirm and puts a stage on the waiting list when no
   defined option can take the party; the plan is pure; capacity decides, never price; the Bag carries only actual
   selections, one line per stage; the hosts start at zero like every guest; the journey's selected state is the bag's
   truth; the ceremony carries the couple's front-centre positions; the dinner does not; the wording corrections cannot
   silently return. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { page, roomsFetch, doState, session, PEGGY, STEFFIE, HARUTHAI, LIN } from './sandbox.mjs';
import { Rooms, unitsOf, allUnits, mayJoin } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { journeyModel, composeGuestMail, seatLabel } from '../src/mail-templates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

/* a browser-shaped sandbox with a real, in-memory localStorage and the shop's own modules — no room engine: a plan computed
   here names the package's default and decides again on confirm (assets/journey.js) */
const shop = () => {
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const document = { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [], getElementById: () => null, body: { classList: { add() {}, remove() {} } } };
  const window = { document, localStorage, addEventListener() {}, CustomEvent: class {} };
  /* the modules address each other as bare globals: bind what exists so far */
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/bag.js', 'assets/stage-graph.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', 'CustomEvent', 'SIYL_BAG', 'SIYL_PRICE', 'SIYL_ROOMS', 'SIYL_STOCK', src(f))(window, document, localStorage, window.CustomEvent, window.SIYL_BAG, window.SIYL_PRICE, window.SIYL_ROOMS, undefined);
  }
  window.SIYL_BAG.badge = () => {};
  return window;
};
const stageOf = (w, key) => w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === key);
const linesOf = (w, key) => w.SIYL_BAG.get().filter((x) => stageOf(w, key).ids.includes(x.id));
const lineOf = (w, key) => linesOf(w, key)[0];
const rowOf = (plan, key) => plan.rows.find((r) => r.seg.key === key);
/* confirming a package without the engine, in the page's own order (your-journey.html fxConfirm): the "not joining" of a
   covered stage is lifted, the replaced lines go, the package's products are put — a room line is held through the engine
   on the page; here the Bag is written directly */
const confirm = (w, plan) => { const J = w.SIYL_JOURNEY, B = w.SIYL_BAG; plan.unskip.forEach((k) => J.skip(k, false)); plan.remove.forEach((id) => B.remove(id)); plan.add.forEach((it) => B.put(it)); };
/* THE CANONICAL COUNTS hold their invariants in every state */
const invariants = (w) => { const c = w.SIYL_JOURNEY.counts(); assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open, 'relevant = confirmed + waitlisted + declined + open'); assert.equal(c.resolved, c.confirmed + c.waitlisted + c.declined); assert.equal(c.excluded + c.relevant, w.SIYL_JOURNEY.SEGMENTS.length, 'excluded is outside relevant'); assert.equal(c.bagItems, w.SIYL_BAG.get().length, 'bagItems = the Bag\'s actual lines'); assert.equal(c.bagTotal, w.SIYL_BAG.total(), 'bagTotal = the Bag\'s one total'); return c; };
/* the engine as one identity calls it, and the identity of a fixture session */
const idOf = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, name: s.preferredName || '' });
const call = async (rooms, id, op, body) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(id) }, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const hold = (rooms, id, key, label, need) => call(rooms, id, 'join', { invitationId: id.invitationId, guestId: id.guestId, key, label, name: id.name || 'Guest', need: need || 1 });
/* the Owner's preferred rooms per stage (SIYL_FULL_EXPERIENCE) — a reference for these tests, no package */
const DEFAULTS = { 'bkk-stay': ['bkk-stay', 'u-sathorn-superior-garden'], train: ['train'], prewed: ['prewed', 'heritage-grand-premier'], wedstay: ['wedstay', 'heritage-grand-premier'], mu9646: ['mu9646'], kmg: ['kmg', 'italian'], c86: ['c86'], ljg: ['ljg', 'viewing-270'], 'return': ['return'], kempinski: ['kempinski', 'deluxe-balcony-king'] };

test('THE HOSTS START AT ZERO · no room is anyone\'s before booking: no fixed arrangement anywhere, twelve free U Sathorn places to Haruthai (the Sathorn Penthouse is deleted, Edit 6), her complete trip is any guest\'s, she books like every guest and is seen by first name; the emails take host-ness from the record, never from a room', async () => {
  /* the seed and the engine */
  assert.deepEqual(FIXED, []);
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.equal('heldFor' in s, false, key + ' is held for nobody'); }
  for (const u of allUnits()) assert.equal(u.reservedFor, null, u.key + ' ' + u.label + ' is reserved for nobody');
  assert.deepEqual(plain(unitsOf('guesthouse/guest-house')), [{ key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null }]);
  assert.equal('bkk-stay/penthouse' in SEED, false, 'the Sathorn Penthouse is deleted (Owner, 24 Sep 2026 · Edit 6)'); assert.equal(unitsOf('bkk-stay/penthouse').length, 0);
  assert.equal(unitsOf('bkk-stay/u-sathorn-superior-garden').length, 6); assert.equal(unitsOf('wedstay/souphattra-presidential')[0].places, 2, 'the Presidential is one room of two places');
  assert.deepEqual(mayJoin(unitsOf('bkk-stay/u-sathorn-superior-garden')[0], null), { ok: false, error: 'unauthorised' }); assert.deepEqual(mayJoin(unitsOf('bkk-stay/u-sathorn-superior-garden')[0], idOf(LIN)), { ok: true }); assert.deepEqual(mayJoin(unitsOf('bkk-stay/u-sathorn-superior-garden')[0], idOf(HARUTHAI)), { ok: true }, 'the hosts are asked for nothing but an identity');
  assert.equal(existsSync(join(ROOT, 'assets/arranged.js')), false, 'assets/arranged.js is deleted');
  for (const f of ['your-journey.html', 'cart.html', 'profile.html', 'review.html', 'journeys.html', 'accommodation.html', 'room.html', 'assets/journey.js', 'assets/stage-graph.js', 'assets/rooms.js', 'assets/stay.js', 'assets/guest.js', 'src/worker.js', 'src/drafts.js', 'src/mail-templates.js', 'src/rooms.js'])
    assert.doesNotMatch(src(f), /arranged\.js|SIYL_ARRANGED|Arranged for you|Fixed arrangement|fixedStagesOf|withoutFixed|Private Residence|private-residence|airbnb-2br|up to 4/, f + ' carries nothing of the deleted concept');
  assert.doesNotMatch(src('src/inventory-seed.js'), /heldFor:|private-residence|airbnb-2br|up to 4/, 'the seed holds nothing for anyone (its comment alone says never "Private Residence")');
  assert.match(src('src/worker.js'), /hosts: !!who\.hosts/, 'the Worker stores host-ness on every record');
  /* the hosts' own view: nothing held, nothing fixed, every place free */
  const rooms = new Rooms(doState()); const hh = idOf(HARUTHAI); assert.equal(hh.hosts, true);
  const w = page({ auth: HARUTHAI, fetch: await roomsFetch(rooms, hh) }); await w.SIYL_UNITS.load(true);
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, G = w.SIYL_GUEST;
  assert.equal(w.SIYL_ARRANGED, undefined); assert.equal(G.party().hosts, true);
  assert.deepEqual(plain(U.view().mine), {}, 'nothing held for the hosts before they book'); assert.deepEqual(plain(U.view().waitlist), {});
  assert.equal(U.fixed(), false); assert.equal(U.fixedUnit(), null); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.reserved(), false); assert.equal(ST.fixed(), false); assert.equal(ST.fixedSlug(), '');
  const s = U.summary('bkk-stay', 'u-sathorn-superior-garden'); assert.deepEqual(plain({ rooms: s.sourceRooms, places: s.sourcePlaces, free: s.remainingPlaces, reserved: s.ownerReservedRooms, soldOut: s.soldOut }), { rooms: 6, places: 12, free: 12, reserved: 0, soldOut: false });
  for (const u of U.units('bkk-stay', 'u-sathorn-superior-garden')) { assert.equal(u.reservedFor, null); assert.equal(u.eligible, true); assert.equal(u.free, 2); }
  for (const seg of J.SEGMENTS) assert.equal(J.state(seg), 'open', seg.key + ' is open — never arranged');
  assert.equal(B.get().length, 0); assert.equal(B.total(), 0, 'the Bag stands at USD 0 with nothing chosen'); assert.deepEqual(plain(invariants(w)), { relevant: 10, confirmed: 0, waitlisted: 0, declined: 0, open: 10, excluded: 0, resolved: 0, bagItems: 0, bagTotal: 0 });
  /* the hosts' trip is any guest's: the same stages, the same units, the same amounts as Peggy's (a party of two, an empty Bag) — no special-casing */
  const wp = page({ auth: PEGGY, fetch: await roomsFetch(rooms, idOf(PEGGY)) }); await wp.SIYL_UNITS.load(true); wp.SIYL_GUEST.setScope({ all: true });
  assert.deepEqual(plain(J.relevantSegments().map((x) => x.key)), plain(wp.SIYL_JOURNEY.relevantSegments().map((x) => x.key)), 'the same ten stages');
  assert.equal(U.unitForParty('bkk-stay', 'u-sathorn-superior-garden', 2).label, wp.SIYL_UNITS.unitForParty('bkk-stay', 'u-sathorn-superior-garden', 2).label, 'the same first room with two places');
  /* she books like every guest — and is seen by first name by the next guest */
  assert.deepEqual(plain(await ST.select('bkk-stay', 'u-sathorn-superior-garden', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(U.view().mine), { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'A' } }); assert.equal(B.get().length, 1); assert.equal(B.get()[0].unit, 'A');
  await wp.SIYL_UNITS.load(true); assert.deepEqual(plain(wp.SIYL_UNITS.units('bkk-stay', 'u-sathorn-superior-garden')[0].occupants), [{ name: 'Haruthai', mine: false, party: false }, { name: 'Reserved', mine: false, party: false, placeholder: true }], 'her place and the place kept for her party member'); assert.equal(wp.SIYL_UNITS.summary('bkk-stay', 'u-sathorn-superior-garden').remainingPlaces, 10);
  /* the emails: "Front centre" for a host without a seat comes from the record's host flag — a U Sathorn room proves nothing */
  const rec = (hosts, extra) => ({ invitationId: 'INV-G001', guestId: 'G001', submissionId: 'SYL-G001-0000AAAA', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', firstSentAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z', hosts,
    recipient: { email: 'guest@example.org', phone: '+66 81 000 0000' }, rooms: { 'bkk-stay': { stage: 'bkk-stay', key: 'bkk-stay/u-sathorn-superior-garden', label: 'A', name: 'Superior Room With Garden View', stay: 'U Sathorn Bangkok', room: 'Room A' } },
    registration: { channel: 'journey-shop', guestId: 'G001', totalUsd: 192, contact: { email: 'guest@example.org', phone: '+66 81 000 0000' }, selections: [Object.assign(wp.SIYL_PRICE.items('bkk-stay', 'u-sathorn-superior-garden')[0], { qty: 1, unit: 'A' })], templeCeremony: { guests: [{ guestId: 'G001', events: { ceremony: 'Attending', dinner: 'Attending' } }] }, guestRecord: { guests: [{ guestId: 'G001', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] }, ...(extra || {}) } });
  const host = journeyModel(rec(true)), guest = journeyModel(rec(false));
  assert.equal(host.hosts, true); assert.equal(host.seats.ceremony.label, 'Front centre'); assert.equal(host.seats.dinner.label, '', 'the dinner fixes nothing');
  assert.equal(guest.hosts, false); assert.equal(guest.seats.ceremony.label, '', 'a guest in U Sathorn Room A is not a host'); assert.deepEqual(plain(guest.arranged), []); assert.deepEqual(plain(host.arranged), []);
  const chosen = journeyModel(rec(true, { seats: { ceremony: { G001: 'C-L-01-01' } } })).seats.ceremony; assert.equal(chosen.id, 'C-L-01-01'); assert.equal(chosen.label, seatLabel('C-L-01-01')); assert.ok(chosen.label && chosen.label !== 'Front centre', 'a chosen seat is its own label, host or not');
  for (const m of [composeGuestMail(rec(true)), composeGuestMail(rec(false))]) { assert.doesNotMatch(m.html, /Arranged for you|Fixed arrangement/); assert.doesNotMatch(m.text, /Arranged for you|Fixed arrangement/); assert.match(m.text, /Room A/); }
});

test('the journey page derives SELECTED from the bag and offers no second selection for it; the participation sheets replace the package drawer', () => {
  const yj = src('your-journey.html');
  assert.match(yj, /var line=lineOf\(\{ids:\[win\]\}\),pick=line\?line\.room:null;/, 'the Bangkok rail reads the bag');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:\(U&&U\.ready\(\)&&U\.ctaWords\(win,r\.slug\)\)\?'<span class="p-act quiet is-current" aria-disabled="true">'\+esc\(U\.ctaWords\(win,r\.slug\)\)\+'<\/span>'\s*:'<button type="button" class="p-act" data-choose="'\+r\.slug\+'">Select this stay<\/button>'/, 'chosen card: inert current control · sold out: the engine\'s word · otherwise: the action');
  /* the flat travel is a ticket (Owner, 15 Sep 2026): selected → the pass, View details, Remove · otherwise → Select this travel */
  assert.match(yj, /actions:\(sel\?\[TP\.button\(seg\.key,true\),'<a class="p-link mute" href="transport\.html\?id='\+seg\.key\+'">View details<\/a>','<button type="button" class="p-link mute" data-rm="'\+seg\.key\+'">Remove<\/button>'\]\s*:\['<button type="button" class="p-act" data-choose-flat="'\+seg\.key\+'">Select this travel<\/button>'/, 'Special Express and every flat travel: the same rule');
  assert.match(yj, /\.concat\(mandatory\(seg\)\?\[\]:\['<button type="button" class="p-link mute" data-skip="'\+seg\.key\+'">Not joining this stage<\/button>'\]\)/, 'a stage that may be declined offers it — the mandatory Kunming → Lijiang train never');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:'<button type="button" class="p-act" data-cls="'\+c\.slug\+'">/, 'fares too — one selection language');
  assert.doesNotMatch(yj, /Change this day|Current fare|Current stay|Selected for your journey/, 'no second vocabulary');
  /* THE PARTICIPATION CHECKBOXES (Owner, 24 Sep 2026 · replacing the sheets of 21 Sep): four independent checkbox rows and the decline
     as a row of the same component, the We'll-miss-you block, a release preview before a scope leaves; no "I'll join all", no
     "I'd like to reconsider"; no package card, no package drawer; the counts derived, never invented */
  assert.match(yj, /class="p-opt'\+\(exclusive\?' p-opt-x':''\)\+\(on\?' is-on':''\)\+'" '\+attr\+' role="checkbox" aria-checked="'\+\(on\?'true':'false'\)\+'"/, 'one checkbox component');
  assert.match(yj, /optHtml\('data-scope="'\+d\.key\+'"'/); assert.match(yj, /optHtml\('data-scope-none',none,'I won’t be joining this trip'/); assert.match(yj, /class="p-opt-or"/);
  assert.doesNotMatch(yj, /data-scope-all|I’ll join all|I'll join all|p-sel p-sheet|>I’d like to reconsider</, 'the join-all control, the sheets and the reconsider button are gone');
  assert.match(yj, /We’ll miss you\./); assert.match(yj, /data-decline-send>Send my response</);
  assert.match(yj, /data-release-preview/); assert.match(yj, /data-release-confirm/); assert.doesNotMatch(yj, /p-pack|data-package|packagePlan|fxConfirm|FX_PLAN|Complete trip|Essential trip/, 'the packages are gone');
  assert.match(yj, /data-counts>'\+esc\(J\.countsWords\(\)\)/); assert.match(yj, /'Not joining this stage'|Not joining this stage<\/p>/);
  assert.doesNotMatch(yj, /Every stage you have already chosen stays exactly as you chose it|Cost Saving|self-arranged|id="fxb"|id="csb"|fullExperience|costSaving|selfArranged|soldOutStages|Full Experience/, 'the retired planner and its words are gone');
  const css = src('assets/prep.css');
  assert.match(css, /\.p-act\.is-current \{[^}]*pointer-events: none/);
  assert.match(css, /\.p-stay\.p-chosen \{[^}]*box-shadow: inset 0 0 0 1px var\(--p-ink\)/, 'the chosen card is framed');
  assert.match(css, /\.atrk\.p-rail > \.p-card \+ \.p-card, \.p-rail-car \.p-stay \+ \.p-stay \{ margin-top: 0; \}/, 'rail cards share one top line');
  const jn = src('journeys.html');
  assert.match(jn, /on\?'<span class="pcgo on" aria-current="true">/, 'the choosing page too');
});

test('ABOUT YOU: step 05 is required — the allergy answer and the photography acknowledgement; favourites and documents stay optional', () => {
  const g = src('assets/guest.js'), q = src('src/questionnaire.js');   /* the one schema (22 Sep 2026); guest.js reads its generated copy */
  assert.match(g, /key: 'about', n: '05', label: 'About You', href: 'about-you\.html', required: true/);
  assert.match(q, /export const ALLERGY = \{ key: 'allergy', n: '01', q: 'Do you have any food allergies\?', required: true/);
  assert.match(q, /key: 'drink', n: '04', q: 'Favourite drink'/);
  assert.match(q, /key: 'film', n: '05', q: 'Favourite film'/); assert.match(q, /key: 'genres', n: '06', q: 'Thai favorite'[^}]*required: true, type: 'multi'/); assert.match(q, /key: 'music', n: '07', q: 'A song, an album, an artist you never skip'[^}]*required: false/);   /* Question 5 ("rather avoid") retired 19 Sep 2026; the genres required, the song line optional (22 Sep 2026) */
  assert.match(g, /aboutMissing: function \(\) \{[\s\S]*?if \(!this\.photoAck\(\)\) out\.push/, 'the acknowledgement holds the step');
  assert.match(g, /if \(key === 'about'\) return this\.applicable\('about'\) \? this\.aboutMissing\(\) : \[\];/, 'documents and consent never hold the step; a guest not joining the trip owes no hospitality answer');
  const inv = src('invitation.html');
  assert.match(inv, /about:'Food allergies, a few favourites, photography\.'/);
  const ab = src('about-you.html');
  assert.match(ab, /Optional · can be added later<\/p><h2 class="t-h2">Travel documents/, 'documents remain optional');
  assert.match(ab, /data-allergy="yes">Yes</); assert.match(ab, /data-allergy="no">No</);
  assert.doesNotMatch(ab, /Required — for example: None|tick &ldquo;/, 'nobody types "None"');
  assert.match(ab, /data-photo-ack/); assert.match(ab, /data-consent=/, 'the publication consent stays a separate choice');
});

test('SEATING: ceremony front-centre positions for the couple; dinner nothing fixed; the route is on The Wedding', async () => {
  const m = await import(join(ROOT, 'src/seating.js'));
  assert.deepEqual(m.RULES.ceremony.fixed, ['BRIDE', 'GROOM']); assert.equal(m.RULES.dinner.fixed, undefined);
  assert.equal(m.CAPACITY.ceremony.fixed, 2); assert.equal(m.CAPACITY.dinner.guestSeats, 50);
  const wd = src('wedding.html');
  assert.match(wd, /id="seats-route"/); assert.match(wd, /Choose your '\+ev\+' seat/); assert.match(wd, /data-state="booked">'\+\(frozen\?'View seat':'Change seat'\)/);
  assert.match(wd, /if\(ev==='ceremony'&&p\.hosts\)/, 'the hosts have no ceremony chair to choose');
  const wp = src('wedding-preparation.html');
  assert.match(wp, /data-hosts="true"/); assert.match(wp, /'Choose your '\+ev\+' seat'/);
  assert.match(wp, /function needs\(ev\)/, 'a seat is required for the events the guest attends');
  assert.match(wp, /Your wedding seats/, 'the one confirmation card');
  assert.match(src('assets/guest.js'), /hosts: a\.hosts === true/); assert.match(src('assets/invite.mjs'), /hosts: inv\.hosts === true/);
  assert.match(src('src/build-invitations.cjs'), /p\.hosts === true \? \{ hosts: true \}/);
});

test('AUTH: leaving keeps the guest\'s draft aside, clears the session, and never hands it to the next guest', () => {
  const inv = src('assets/invite.mjs');
  assert.match(inv, /const GUEST_KEYS = \['siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\];/);
  assert.match(inv, /leave\(\) \{[\s\S]*?localStorage\.setItem\('siyl\.party\.' \+ a\.invitationId[\s\S]*?GUEST_KEYS\.concat\(RETIRED_KEYS\)\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);\s*localStorage\.removeItem\('siyl\.draft\.owner'\);\s*AUTH\.clear\(\);/);
  assert.match(inv, /if \(owner && owner !== invitationId\) GUEST_KEYS\.concat\(RETIRED_KEYS\)\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);/, 'another guest\'s draft is never inherited; the same guest re-entering keeps their own');
  const sh = src('assets/prep-shell.js');
  assert.match(sh, /data-leave="another">Open another invitation<\/button>/); assert.match(sh, /data-leave="out">Sign out<\/button>/);
  assert.match(sh, /if \(e\.persisted && window\.SIYL_AUTH && !SIYL_AUTH\.get\(\)\) location\.reload\(\);/, 'back after leaving shows no guest');
  assert.match(sh, /location\.replace\(hrefOf\('invitation\.html'\) \+ \(how === 'another' \? '\?open=1' : ''\)\)/);
});

test('WORDING: no 1 + 1 seating, no blue dress, dinner poolside, China card is the Lijiang file', () => {
  for (const f of ['assets/transport-data.js', 'your-journey.html', 'journeys.html', 'assets/pricing.js']) assert.doesNotMatch(src(f), /1 \+ 1 seating|1\+1 seating|single seat on each side|nobody sits beside/i, f);
  assert.match(src('assets/transport-data.js'), /\['Class', 'Business Class'\]/);
  for (const f of ['wedding.html', 'review.html', 'voyage.html', 'wedding-preparation.html', 'dress.html']) assert.doesNotMatch(src(f), /Blue Lao Traditional Dress|in blue\b/i, f);
  assert.match(src('wedding.html'), /temple:'Lao Traditional Dress'/);
  for (const f of ['assets/journey.js', 'assets/temple.js', 'voyage.html', 'index.html', 'review.html', 'wedding.html']) assert.doesNotMatch(src(f), /courtyard garden/i, f);
  assert.match(src('assets/journey.js'), /Souphattra Heritage Vientiane · poolside/); assert.match(src('voyage.html'), /19:30 · Poolside/);
  /* 21 Sep 2026: the Owner's clip of Impression Lijiang on the China card, its own poster frame beneath (gate V1) */
  assert.match(src('index.html'), /destination\.html#china" data-video="assets\/video\/china-card\.mp4" style="background-image:url\(assets\/images\/city\/004-lijiang-card-poster\.jpg\)/);
  assert.match(src('assets/images/ASSET-MAP.md'), /1XBVp6qIwUSWfHpw4w3S0CH-apvsej154/, 'the Drive source is traceable');
  /* the "After the Wedding" card is the Owner's whole Lijiang 02 folder, one card gallery of nine (22 Sep 2026) */
  assert.match(src('index.html'), /<div class="cg am" data-cardgal /);
  assert.equal((src('index.html').match(/assets\/images\/city\/004-lijiang-aw-\d\d\.jpg/g) || []).length, 9, 'nine frames in the card');
  assert.match(src('index.html'), /journeys\.html#j-mu9646" tabindex="0"><img src="assets\/images\/city\/004-lijiang-aw-01\.jpg"/, 'each frame keeps the journey link; the first is fetched at once');
  assert.match(src('assets/images/ASSET-MAP.md'), /1k9cliGiXWyHIp8tHsppcCb-bFw523LD6/, 'the Drive folder is traceable');
  /* the first three tradition references, in the Owner's order */
  for (const f of ['wedding-preparation.html', 'dress.html']) {
    const order = [...src(f).matchAll(/images\/dress\/tradition-0(\d)\.jpg/g)].map((m) => m[1]).join('');
    assert.equal(order, '123456', f + ' tradition order');
  }
});
