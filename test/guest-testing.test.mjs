/* OWNER CORRECTIONS FROM GUEST TESTING · 13 Sep 2026
   Deterministic coverage for the corrected behaviours: Full Experience never
   overrides a manual choice; the journey's selected state is the bag's truth;
   the ceremony carries the couple's front-centre positions; the dinner does
   not; the wording corrections cannot silently return. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');

/* a browser-shaped sandbox with a real, in-memory localStorage and the shop's own modules */
const shop = () => {
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const document = { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [], getElementById: () => null, body: { classList: { add() {}, remove() {} } } };
  const window = { document, localStorage, addEventListener() {}, CustomEvent: class {} };
  /* the modules address each other as bare globals: bind what exists so far */
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/bag.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', 'CustomEvent', 'SIYL_BAG', 'SIYL_PRICE', 'SIYL_ROOMS', 'SIYL_STOCK', src(f))(window, document, localStorage, window.CustomEvent, window.SIYL_BAG, window.SIYL_PRICE, window.SIYL_ROOMS, undefined);
  }
  window.SIYL_BAG.badge = () => {};
  return window;
};
const stageOf = (w, key) => w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === key);
const lineOf = (w, key) => w.SIYL_BAG.get().find((x) => stageOf(w, key).ids.includes(x.id));

test('FULL EXPERIENCE keeps a manual choice: U Sathorn stays U Sathorn', () => {
  const w = shop(); const P = w.SIYL_PRICE, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  /* the guest chooses U Sathorn by hand */
  P.items('bkk-stay', 'u-sathorn-superior-garden').forEach((it) => B.put(it));
  assert.equal(lineOf(w, 'bkk-stay').room, 'u-sathorn-superior-garden');
  assert.equal(J.manual(stageOf(w, 'bkk-stay')), true, 'a hand-picked line carries no preset mark');
  const plan = J.fullExperience();
  plan.remove.forEach((id) => B.remove(id)); plan.add.forEach((it) => B.put(it));
  assert.equal(lineOf(w, 'bkk-stay').room, 'u-sathorn-superior-garden', 'Full Experience did not overwrite the manual Bangkok choice');
  assert.ok(plan.kept.includes('bkk-stay'), 'the stage is reported as kept');
  assert.ok(!plan.remove.includes('bkk-stay'), 'its ids were never on the remove list');
  /* every other stage was open and is now filled with the approved default */
  for (const s of J.SEGMENTS) assert.ok(lineOf(w, s.key), s.key + ' filled');
  assert.equal(J.open().length, 0);
  /* the total is what the retained choices come to — not the canonical 2,130 */
  const total = B.get().reduce((t, x) => t + (x.price || 0) * (x.qty || 1), 0);
  const canonical = 2130, penthouse = P.quote('bkk-stay', 'penthouse').total, usathorn = P.quote('bkk-stay', 'u-sathorn-superior-garden').total;
  assert.equal(total, canonical - penthouse + usathorn, 'total follows the retained real selections');
});

test('FULL EXPERIENCE fills only what is open; a manual "not joining" stays', () => {
  const w = shop(); const J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  J.skip('train', true);                                  /* the guest's own word */
  const plan = J.fullExperience();
  plan.remove.forEach((id) => B.remove(id)); plan.add.forEach((it) => B.put(it));
  assert.equal(J.isSkipped('train'), true, 'a manual decline is not lifted');
  assert.equal(lineOf(w, 'train'), undefined);
  assert.ok(plan.kept.includes('train'));
  assert.ok(plan.add.every((it) => it.by === 'full'), 'preset lines say who filled them');
});

test('COST SAVING → FULL EXPERIENCE: a preset is revised by a preset, a manual choice never is', () => {
  const w = shop(); const J = w.SIYL_JOURNEY, B = w.SIYL_BAG, P = w.SIYL_PRICE;
  P.items('kmg', P.approved('kmg').slug).forEach((it) => B.put(it));       /* by hand, before anything else */
  const opt = J.costSavingOptions(2).find((o) => o.key === 'residence');
  const cs = J.costSavingPlan(opt);
  cs.remove.forEach((id) => B.remove(id)); cs.add.forEach((it) => B.put(it));
  J.SEGMENTS.forEach((s) => J.skip(s.key, cs.selfArranged.includes(s.key), 'cost'));
  assert.equal(lineOf(w, 'wedstay').id, 'airbnb-2br'); assert.equal(J.skippedBy('train'), 'cost');
  const plan = J.fullExperience();
  plan.remove.forEach((id) => B.remove(id)); plan.add.forEach((it) => B.put(it));
  assert.equal(lineOf(w, 'wedstay').id, 'wedstay', 'the Cost Saving residence gave way to the approved wedding stay');
  assert.equal(J.isSkipped('train'), false, 'a preset decline was lifted');
  assert.ok(lineOf(w, 'train'));
  assert.equal(B.get().filter((x) => x.id === 'kmg').length, 1);
});

test('the journey page derives SELECTED from the bag and offers no second selection for it', () => {
  const yj = src('your-journey.html');
  assert.match(yj, /var line=lineOf\(\{ids:\[win\]\}\),pick=line\?line\.room:null;/, 'the Bangkok rail reads the bag');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:'<button type="button" class="p-act" data-choose="'\+r\.slug\+'">Select this stay<\/button>'/, 'chosen card: inert current control · alternatives: the action');
  assert.match(yj, /sel\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:'<button type="button" class="p-act" data-choose-flat="'\+seg\.key\+'">Select this travel<\/button>'/, 'Special Express and every flat travel: the same rule');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current fare<\/span>'/, 'fares too');
  assert.match(yj, /Every stage you have already chosen stays exactly as you chose it/, 'Full Experience says what it does');
  const css = src('assets/prep.css');
  assert.match(css, /\.p-act\.is-current \{[^}]*pointer-events: none/);
  assert.match(css, /\.p-stay\.p-chosen \{[^}]*box-shadow: inset 0 0 0 1px var\(--p-ink\)/, 'the chosen card is framed');
  assert.match(css, /\.atrk\.p-rail > \.p-card \+ \.p-card, \.p-rail-car \.p-stay \+ \.p-stay \{ margin-top: 0; \}/, 'rail cards share one top line');
  const jn = src('journeys.html');
  assert.match(jn, /on\?'<span class="pcgo on" aria-current="true">/, 'the choosing page too');
});

test('ABOUT YOU: step 05 is required, Accessibility & comfort by each guest, documents still optional', () => {
  const g = src('assets/guest.js');
  assert.match(g, /key: 'about', n: '05', label: 'About You', href: 'about-you\.html', required: true/);
  assert.match(g, /requiredMissingFor: function \(id\) \{[\s\S]*?v\.trim\(\)\.length > 0/);
  assert.match(g, /key: 'dietary', n: '01', q: 'Food allergies or dietary requirements', required: true/, 'dietary is required (Owner, 13 Sep 2026)');
  assert.match(g, /key: 'drink', n: '04', q: 'Your favourite drink'/, 'the favourite drink sits in the middle of the seven');
  assert.equal((g.match(/required: true/g) || []).length >= 2, true);
  assert.match(g, /var aboutDone = accessMissing\.length === 0;/, 'documents and consent never hold the step');
  assert.match(g, /var ready = contact && chosen && weddingDecided && dress && aboutDone;/, 'Review & Send cannot bypass it');
  const inv = src('invitation.html');
  assert.match(inv, /\['05','About You','[^']*answered by each named guest[^']*','Required'\]/);
  assert.doesNotMatch(inv, /Every answer optional/);
  const ab = src('about-you.html');
  assert.match(ab, /03 · Optional · can be added later<\/p><h2 class="t-h2">Travel documents/, 'documents remain optional');
  assert.match(ab, /placeholder="'\+\(req\?\(q\.none\?'Required — or tick &ldquo;'\+esc\(q\.none\)\+'&rdquo;':'Required — for example: None'\):'Optional'\)\+'"/);
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
  assert.match(src('assets/guest.js'), /hosts: a\.hosts === true/); assert.match(src('assets/invite.mjs'), /hosts: inv\.hosts === true/);
  assert.match(src('src/build-invitations.cjs'), /inv\.hosts === true \? \{ hosts: true \}/);
});

test('AUTH: leaving a party keeps its draft aside, clears the session, and never hands it to the next party', () => {
  const inv = src('assets/invite.mjs');
  assert.match(inv, /const PARTY_KEYS = \['siyl\.who', 'siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\];/);
  assert.match(inv, /leave\(\) \{[\s\S]*?localStorage\.setItem\('siyl\.party\.' \+ a\.invitationId[\s\S]*?PARTY_KEYS\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);\s*localStorage\.removeItem\('siyl\.draft\.owner'\);\s*AUTH\.clear\(\);/);
  assert.match(inv, /if \(owner && owner !== invitationId\) PARTY_KEYS\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);/, 'another party\'s draft is never inherited; the same party re-entering keeps its own');
  const sh = src('assets/prep-shell.js');
  assert.match(sh, /data-leave="another">Open another invitation<\/button>/); assert.match(sh, /data-leave="out">Sign out<\/button>/);
  assert.match(sh, /if \(e\.persisted && window\.SIYL_AUTH && !SIYL_AUTH\.get\(\)\) location\.reload\(\);/, 'back after leaving shows no party');
  assert.match(sh, /location\.replace\(hrefOf\('invitation\.html'\) \+ \(how === 'another' \? '\?open=1' : ''\)\)/);
});

test('WORDING: no 1 + 1 seating, no blue dress, dinner poolside, China card is the Lijiang file', () => {
  for (const f of ['assets/transport-data.js', 'your-journey.html', 'journeys.html', 'assets/pricing.js']) assert.doesNotMatch(src(f), /1 \+ 1 seating|1\+1 seating|single seat on each side|nobody sits beside/i, f);
  assert.match(src('assets/transport-data.js'), /\['Class', 'Business Class'\]/);
  for (const f of ['wedding.html', 'review.html', 'voyage.html', 'wedding-preparation.html', 'dress.html']) assert.doesNotMatch(src(f), /Blue Lao Traditional Dress|in blue\b/i, f);
  assert.match(src('wedding.html'), /temple:'Lao Traditional Dress'/);
  for (const f of ['assets/journey.js', 'assets/temple.js', 'voyage.html', 'index.html', 'review.html', 'wedding.html']) assert.doesNotMatch(src(f), /courtyard garden/i, f);
  assert.match(src('assets/journey.js'), /Souphattra Heritage Vientiane · poolside/); assert.match(src('voyage.html'), /19:30 · Poolside/);
  assert.match(src('index.html'), /destination\.html#china" style="background-image:url\(assets\/images\/city\/004-lijiang-black-dragon-pool\.jpg\)/);
  assert.match(src('assets/images/ASSET-MAP.md'), /1XBVp6qIwUSWfHpw4w3S0CH-apvsej154/, 'the Drive source is traceable');
  /* the "After the Wedding" card carries the Owner's Lijiang old-town file (13 Sep 2026) */
  assert.match(src('index.html'), /journeys\.html#j-mu9646" style="background-image:url\(assets\/images\/city\/004-lijiang-old-town-roofs-jade-dragon\.jpg\)/);
  assert.match(src('assets/images/ASSET-MAP.md'), /1lI07I8yTBcCtiEevBdduf1Pf7eGkbRS4/);
  /* the first three tradition references, in the Owner's order */
  for (const f of ['wedding-preparation.html', 'dress.html']) {
    const order = [...src(f).matchAll(/images\/dress\/tradition-0(\d)\.jpg/g)].map((m) => m[1]).join('');
    assert.equal(order, '123456', f + ' tradition order');
  }
});
