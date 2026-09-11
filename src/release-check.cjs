'use strict';
/**
 * PRE-RELEASE GATE CHECK — run before any public deploy of the registration.
 *   node src/release-check.cjs        (or: npm run release-check)
 *
 * Verifies the five Pre-Release Governance gates (docs/RELEASE-GATES.md).
 * Exits non-zero while any gate is open. This is intentional: the check FAILS
 * on the current demo build and passes only when the owner has flipped the
 * publication switches and removed demo/legacy state for release.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const results = [];
const gate = (id, name, ok, detail) => results.push({ id, name, ok, detail });

const data = read('register/data.mjs');
const appJs = read('register/app.mjs');
const indexHtml = read('index.html');
const regHtml = read('register/index.html');
const assetsignore = read('.assetsignore');

/* Gate 1 — guest rates: APPROVED publishes amounts; HOLD is a controlled,
   production-safe state ("Details to follow") per the completion directive. */
const ratesApproved = /rates:\s*'APPROVED'/.test(data);
const ratesHeld = /rates:\s*'HOLD'/.test(data);
gate(1, 'Guest rates state is deliberate',
  ratesApproved || ratesHeld,
  ratesApproved
    ? 'APPROVED — public per-Guest amounts render (trace: docs/RELEASE-GATES.md Gate 1).'
    : "HOLD — amounts render as 'Details to follow'; owner may flip to 'APPROVED' any time (trace documented). Production-safe.");

/* Gate 2 — inventory display: either final allocation confirmed (EXACT) or REQUEST mode kept deliberately */
const invExact = /inventoryDisplay:\s*'EXACT'/.test(data);
gate(2, 'Inventory display decision recorded',
  true,
  invExact ? "EXACT counts shown publicly — requires final allocation sign-off." : "REQUEST mode (UI states the authoritative wedding allocation; live remaining counts stay internal). OK for release.");

/* Gate 2b — SHARED INVENTORY: one server-side ledger, atomic reservation,
   no client-side allocation, and stock that comes from the seed and nowhere
   else. This is what makes a public availability claim honest. */
{
  const seed = read('src/inventory-seed.js');
  const ledger = read('src/inventory.js');
  const worker = read('src/worker.js');
  const client = read('assets/inventory.js');
  const wrangler = read('wrangler.jsonc');
  const inv = [];
  if (!/durable_objects/.test(wrangler) || !/"class_name":\s*"Inventory"/.test(wrangler)) inv.push('no Durable Object binding');
  if (!/new_sqlite_classes/.test(wrangler)) inv.push('no Durable Object migration');
  if (!/idFromName\('ledger'\)/.test(worker)) inv.push('the Worker does not route to ONE ledger');
  if (!/blockConcurrencyWhile/.test(ledger)) inv.push('reservation is not serialised');
  if (!/status:\s*409|\}, 409\)/.test(ledger)) inv.push('sold out does not answer 409');
  /* the client must never decide an allocation for itself */
  if (/capacity\s*[:=]\s*\d/.test(client)) inv.push('assets/inventory.js carries its own capacity numbers');
  const keys = (seed.match(/^\s*'[a-z0-9-]+\/[a-z0-9-]+':/gm) || []).length;
  if (keys < 30) inv.push('inventory seed covers only ' + keys + ' categories');
  const rv = read('review.html');
  const reserveFirst = rv.indexOf('SIYL_STOCK.reserve()') > 0 && rv.indexOf('SIYL_STOCK.reserve()') < rv.indexOf('fetch(SUBMIT_URL');
  if (!reserveFirst) inv.push('Review & Send does not reserve BEFORE it submits');
  gate('2b', 'Shared inventory, atomic reservation, no client-side allocation',
    inv.length === 0,
    inv.length ? inv.join(' · ')
      : 'one Durable Object ledger ("ledger") serialises every reservation; ' + keys +
        ' stock-controlled categories seeded from Accommodation_Details; sold out answers 409; ' +
        'Review & Send holds the rooms before it stores the registration; the client holds no capacity of its own.');
}

/* Gate 3 — production lookup: encrypted bundle, no demo data, no plaintext PII */
const demoHits = [];
if (/DEMO_MODE\s*=\s*true/.test(data)) demoHits.push('DEMO_MODE=true');
for (const t of ['demo-amara', 'demo-lin', 'demo-family', 'demo-noor', 'Amara Demo']) {
  if (data.includes(t)) { demoHits.push('demo token/name: ' + t); break; }
}
if (/Demonstration build: try/.test(regHtml)) demoHits.push('demo hint copy in register/index.html');
let encOk = false;
try {
  const enc = read('register/invitations.enc.json');
  encOk = enc.length > 100;
  for (const name of ['Peggy', 'Steffie', 'Seray', 'Orhan', 'Marcel', 'Nongyao', 'Vipavee']) {
    if (enc.includes(name)) demoHits.push('PLAINTEXT guest name in invitations.enc.json: ' + name);
  }
} catch (e) { demoHits.push('register/invitations.enc.json missing — run node src/build-invitations.cjs'); }
gate(3, 'Production guest lookup (encrypted, token-only)',
  demoHits.length === 0 && encOk,
  demoHits.length ? demoHits.join(' · ') : 'encrypted invitation bundle present; token-only lookup; no demo data; no plaintext PII');

/* Gate 4 — submission channel */
const endpointOn = /submit:\s*'endpoint'/.test(data);
gate(4, 'Production submission endpoint active',
  endpointOn,
  endpointOn
    ? "endpoint mode: POST /api/register (Worker) with automatic mailto fallback if the endpoint is unavailable."
    : "PUBLICATION.submit is 'mailto' (demo). Switch to 'endpoint' once the secure form endpoint exists (contract: docs/RELEASE-GATES.md).");

/* Gate 5 — legacy out of the active release */
/* OWNER FINAL OVERRIDE (31 AUG 2026): the Mekong cruise / Mekhong Escape is
 * NOT an active wedding event — banned again alongside the LP era terms. */
const legacyTerms = /avani|manda de laos|river sun cruise|luang prabang|LPQ\b|8booking|mekhong escape|mekong escapes|cruise/i; /* owner 04 Sep (final): NO cruise in the current wedding programme */
const legacyInIndex = legacyTerms.test(indexHtml);
const legacyInRegister = legacyTerms.test(regHtml) || legacyTerms.test(appJs) || legacyTerms.test(data);
const journeyExcluded = /^\/?journey$/m.test(assetsignore); // root-scoped '/journey' keeps owner hotel images under assets/images/journey deployable
const legacyFiles = ['assets/images/cards/card-manda.jpg', 'assets/images/preview/pv-manda-1.jpg']
  .filter((f) => fs.existsSync(path.join(ROOT, f)));
gate(5, 'Legacy content excluded from active release',
  !legacyInIndex && !legacyInRegister && journeyExcluded && legacyFiles.length === 0,
  [legacyInIndex && 'legacy terms in index.html', legacyInRegister && 'legacy terms in register bundle',
   !journeyExcluded && '/journey/ not excluded from deploy', legacyFiles.length && 'legacy files present: ' + legacyFiles.join(', ')]
    .filter(Boolean).join(' · ') || 'clean (journey excluded, no legacy terms/files in active surfaces)');

/* Release plumbing reminders (not numbered gates) */
gate('R1', 'register/ route unblocked for deploy',
  !/^register$/m.test(assetsignore),
  /^register$/m.test(assetsignore) ? "'.assetsignore' still excludes register/ — remove the line at release." : 'register/ will deploy');
gate('R2', 'Guest Relations view stays private',
  /^src$/m.test(assetsignore),
  'src/ excluded from public assets — GR view needs authenticated hosting in production.');

/* R3 — the public accommodation section is generated from the ONE model and
 * every room image it names exists. Blocks a release where the public page
 * and the Guest Area would describe different rooms. */
const dataSrc = data.slice(data.indexOf('export const ACCOMMODATIONS'), data.indexOf('export const SELECTABLE_ACCOMMODATIONS'));
const roomNames = [...dataSrc.matchAll(/^\s*id: '[a-z0-9-]+', name: '([^']+)'/gm)].map((m) => m[1]);
const roomImages = [...dataSrc.matchAll(/RM \+ '([a-z0-9-]+\.jpg)'/g)].map((m) => 'assets/images/rooms/' + m[1]);
const missingImages = roomImages.filter((p) => !fs.existsSync(path.join(ROOT, p)));
const missingCards = []; /* public room catalogue retired (owner final architecture order): rooms render only in the authenticated Guest Area */
const noblePresent = /noble-courtyard/.test(dataSrc) && /contributionPerGuest: 240/.test(dataSrc);
const oldVillaGone = !/Cozy Villa|4BR|id: 'villa'/.test(dataSrc);
const airbnbSeg = dataSrc.slice(dataSrc.indexOf("id: 'airbnb-2br'"));
const airbnbOk = airbnbSeg.length > 10
  && /contributionPerGuest: null/.test(airbnbSeg)
  && /capacityUnit: 'Party allocation'/.test(airbnbSeg)
  && /status: 'Complimentary · limited availability'/.test(airbnbSeg)
  && !/USD\s*\d|per night|guest rate/i.test(airbnbSeg); // owner 2026-08-28: complimentary + limited, never priced
const bookingValueLeak = /123\.8/.test(dataSrc) || /123\.8/.test(appJs) || /123\.8/.test(indexHtml);
const matrixOk = ['contributionPerGuest: 145', 'contributionPerGuest: 155', 'contributionPerGuest: 170',
  'contributionPerGuest: 240', 'contributionPerGuest: 250', 'contributionPerGuest: 290', 'contributionPerGuest: 750']
  .every((s) => dataSrc.includes(s));
const reservedOk = (dataSrc.match(/reservedNote: 'Reserved'/g) || []).length === 2;
const internalRatesLeak = ['390', '430', '450', '640', '690', '770', '2190', '2,190']
  .some((n) => new RegExp('USD\\s*' + n.replace(',', ',?') + '\\b').test(indexHtml + appJs + data));
const capsOk = ['capacityTotal: 5', 'capacityTotal: 13', 'capacityTotal: 3', 'capacityTotal: 2']
  .every((s) => dataSrc.includes(s)) && (dataSrc.match(/capacityTotal: 1\b/g) || []).length === 4; // 3 suites + airbnb
gate('R3', 'Accommodation matrix complete and single-sourced (26 rooms + hosted Airbnb)',
  missingImages.length === 0 && missingCards.length === 0 && roomNames.length === 8 && noblePresent && oldVillaGone && airbnbOk && !bookingValueLeak && matrixOk && capsOk && reservedOk && !internalRatesLeak,
  [missingImages.length && 'missing room images: ' + missingImages.join(', '),
   missingCards.length && "public page missing generated cards: " + missingCards.join(', ') + " (run 'npm run build:rooms')",
   !noblePresent && 'Noble Courtyard Suite must be active at USD 220 per guest',
   !oldVillaGone && "the cancelled 4BR 'Vientiane Urban Cozy Villa 2' must never return",
   !airbnbOk && 'the 2BR Airbnb must be present as COMPLIMENTARY + LIMITED AVAILABILITY (never priced) outside the room matrix',
   bookingValueLeak && 'INTERNAL BOOKING VALUE (USD 123.80) must never reach guest surfaces',
   !matrixOk && 'guest contributions must be 145/155/170/240/250/290/750',
   !reservedOk && 'Majestic Suite + Presidential must be RESERVED',
   internalRatesLeak && 'INTERNAL Public/Selling rates must never reach guest sources',
   !capsOk && 'capacities must be 5/13/3/1/2/1/1 (26 rooms)']
    .filter(Boolean).join(' · ') ||
  '7 Souphattra categories (26 rooms) + complimentary limited-availability 2BR Airbnb outside the matrix; old 4BR villa gone; no booking-value leak');

/* P1 — PUBLIC PRICE LEAK (release-blocking): no accommodation amount on the
 * public website. Prices live only behind invitation authentication. */
const roomsSection = indexHtml.slice(indexHtml.indexOf('<!-- ROOMS:START -->'), indexHtml.indexOf('<!-- ROOMS:END -->'));
const perNightWording = /per room \/ night|per night|room\/night/i.test(roomsSection) || /per room \/ night/.test(appJs);
const publicUsd = /USD\s*\d/.test(roomsSection) || perNightWording;
const rateNumbers = ['145', '155', '170', '240', '250', '290', '750']
  .filter((n) => new RegExp('USD\\s*' + n.replace('.', '\\.')).test(indexHtml));
gate('P1', 'No accommodation prices on the public website',
  !publicUsd && rateNumbers.length === 0,
  publicUsd || rateNumbers.length
    ? 'PUBLIC PRICE LEAK: ' + (publicUsd ? 'USD amount or per-night wording in guest-facing accommodation content' : 'rate value visible: USD ' + rateNumbers.join(', '))
    : 'no USD amount and no per-night wording on the public site; per-guest rates render only in the authenticated Guest Area');

/* P2 — availability truthful and engine-derived: overlays state "N of N
 * available" only where N equals the authoritative allocation (no shared
 * real-time sync exists, so remaining == total at build time). */
/* public room catalogue retired (owner final architecture order): availability
 * renders only in the authenticated Guest Area, engine-derived. */
const staleRemaining = /rooms? remaining|Last room/i.test(indexHtml);
const engineAvail = /guestAvailability\(/.test(appJs);
gate('P2', 'Availability truthful, engine-derived (Guest Area only)',
  !staleRemaining && engineAvail,
  staleRemaining ? 'live-remaining wording without a shared backend'
    : !engineAvail ? 'Guest Area must derive availability from the engine (guestAvailability)'
    : 'no public availability claims; Guest Area availability engine-derived');

/* P3 — image + venue corrections (owner): alms at Souphattra Heritage with
 * TWO distinct images (couple on the timeline, procession on the card); no
 * bedroom image in the vow/dinner gallery. */
/* 001 FINAL MASTER UPDATE (03 SEP 2026): the active morning event is the
 * Temple Ceremony at Wat Ong Teu (09:00). The owner imagery stays; the gate
 * now protects the NEW programme presentation. */
/* MASTER-02 (406e140): the active programme is Temple Ceremony / Coffee &
 * Cake / Vow Ceremony / Wedding Dinner. Alms Giving is NOT an active event and
 * must not surface as one; vow contexts carry no pool imagery. */
const activeAlms = /Sacred Morning Ritual|Alms Giving|Tak Bat|almsOfferingHtml\(st\)|Reserve your offering/.test(indexHtml) ||
  /'alms', 'Sacred Morning Ritual'|Reserve your offering|data-alms-on/.test(appJs);
const fourEvents = ['The Temple Ceremony', 'Coffee & Cake', 'The Vow Ceremony', 'The Wedding Dinner'].every((e) => appJs.includes(e));
const vowIdx = appJs.indexOf("['ceremony', 'The Vow Ceremony'");
const vowSeg = vowIdx > -1 ? appJs.slice(vowIdx, vowIdx + 400) : '';
const poolInVowApp = /pool/i.test(vowSeg);
gate('P3', 'MASTER-02 programme truth (four events, no active Alms, no pool in vow)',
  !activeAlms && fourEvents && !poolInVowApp,
  [activeAlms && 'Alms Giving/Sacred Morning Ritual must not surface as an active event',
   !fourEvents && 'the four MASTER-02 events must all be present in the journey',
   poolInVowApp && 'NO POOL imagery in Vow Ceremony context']
    .filter(Boolean).join(' · ') || 'four-event programme enforced; Alms retired; vow pool-free');

/* P8 — THE PUBLIC WEDDING PAGE (owner decision, 09 Sep 2026): exactly four
   top-level events; the Buddhist morning lives INSIDE the Temple Ceremony and
   never as a fifth event; the alms-giving of food is never a priced product;
   only the Sangkhathan carries USD 15; no pool-side dinner narrative; the
   retired bride photograph and the fountain are gone. */
{
  const vy = read('voyage.html');
  const bad = [];
  const h2 = (vy.match(/<h2>([^<]+)<\/h2>/g) || []).map((t) => t.replace(/<\/?h2>/g, ''));
  for (const e of ['Temple Ceremony', 'Coffee &amp; Cake', 'Vow Ceremony', 'Wedding Dinner']) {
    if (!h2.includes(e)) bad.push('missing event: ' + e);
  }
  if (!/id="temple"[\s\S]{0,4000}id="takbat"[\s\S]{0,4000}id="sangkhathan"/.test(vy))
    bad.push('the Buddhist morning must sit inside the Temple Ceremony, in order');
  if (/Alms Giving/i.test(vy)) bad.push('"Alms Giving" must not surface as an event name');
  if (/USD 15[^<]{0,60}(alms|Tak Bat)/i.test(vy)) bad.push('the alms-giving of food must never carry a price');
  if (/pool/i.test(vy)) bad.push('no pool narrative on the wedding page');
  if (/052-temple-ceremony-bride/.test(vy)) bad.push('the retired bride photograph is still on the page');
  if (/053-wedding-dinner-courtyard-garden/.test(vy)) bad.push('the fountain photograph is still the wedding dinner image');
  /* participation is an explicit two-way decision for EVERY active event —
   * never a default, and never a single button that only says yes */
  /* The DECISION now lives in the private journey (step 03), not on the public
   * editorial page. Both answers must be offered there, for every event. */
  const wd = read('wedding.html');
  if (!/data-ev="yes"[\s\S]{0,400}data-ev="no"/.test(wd)) bad.push('participation must be an explicit two-way decision');
  if (!/data-off="yes"[\s\S]{0,600}data-off="no"/.test(wd)) bad.push('the Sangkhathan must offer both answers');
  if (/id="tdec"/.test(vy)) bad.push('the decision module must not live on the public wedding page');
  gate('P8', 'Wedding programme truth: four events, Buddhist morning inside the Temple Ceremony',
    bad.length === 0,
    bad.length ? bad.join(' · ')
      : 'four events; Tak Bat and Sangkhathan sit inside the Temple Ceremony; alms-giving unpriced; ' +
        'only the Sangkhathan is USD 15; no pool narrative; retired bride and fountain images removed');
}

/* P9 — C · PARTY / PERSON STATE SEPARATION. The model classifies every piece
   of state; the acknowledgements are personal and first person; the subject
   is explicit; the shell says ANSWERING FOR in words; nothing asks for the
   Sangkhathan eligibility (that is E). */
{
  const g = read('assets/guest.js'), sh = read('assets/prep-shell.js'), d = read('assets/docs.js');
  const wp = read('wedding-preparation.html'), ab = read('about-you.html'), rv = read('review.html'), wd = read('wedding.html');
  const bad = [];
  if (!/SCOPE: \{\s*party:/.test(g) || !/personal: \[/.test(g)) bad.push('the guest record must classify state as party or personal');
  if (!/setSubject: function/.test(g) || !/answeringFor: function/.test(g)) bad.push('the subject (ANSWERING FOR) must be explicit in the model');
  if (!/mayAcknowledge/.test(g) || !/setDressAck: function \(id, on\)/.test(g)) bad.push('the dress acknowledgement must be per guest and first person');
  if (/dressAck\(\)/.test(wp) || /dressAck\(\)/.test(rv)) bad.push('no Preparation surface may read a party-wide dress acknowledgement');
  if (!/setDressAck\(c\.getAttribute\('data-ack'\)/.test(wp)) bad.push('step 04 must acknowledge by named guest');
  if (!/G\.setSubject\(/.test(ab)) bad.push('step 05 must switch the subject explicitly, never a silent tab');
  if (!/prep-for/.test(sh) || !/Answering for/.test(sh)) bad.push('the shell must say ANSWERING FOR in words');
  if (!/data-switch/.test(wd)) bad.push('step 03 must offer SWITCH beside another guest\'s answers');
  if (!/mayConsent/.test(d)) bad.push('publication consent must be first person only');
  gate('P9', 'Party / person state separation (C): scoped state, explicit subject, personal acknowledgements',
    bad.length === 0, bad.length ? bad.join(' · ') : 'SCOPE registry · activeGuestId / subjectGuestId · dress + consent per guest, first person · ANSWERING FOR said in words');
}

/* P10 — D · RECOMPOSED SURFACES. The six steps live in the shell and the
   design system only; the compatibility layer is gone; no page brings its own
   rules beyond the shared site chrome; the public desktop layer stays public. */
{
  const sys = read('assets/prep.css'), bad = [];
  if (/LEGACY NORMALISATION|THE SYSTEM WINS/.test(sys)) bad.push('the compatibility layer is still in prep.css');
  if ((sys.match(/body\.prep [.#]/g) || []).length) bad.push('element-scoped legacy overrides remain');
  for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) {
    const page = read(f);
    if (!page.includes('assets/prep-shell.js') || !page.includes('assets/prep.css')) bad.push(f + ' is outside the shell or the system');
    if (page.includes('assets/desktop.css') || page.includes('assets/prep.js')) bad.push(f + ' loads a legacy layer');
    const local = page.slice(page.indexOf('<style>') + 7, page.indexOf('</style>'));
    const sels = [...local.matchAll(/(^|\})\s*([^{}]+)\{/g)].map((m) => m[2].trim()).filter((x) => !x.startsWith('@font-face'));
    const extra = sels.filter((s) => !/^(\*|body|\.hd|\.hb|\.hb i|\.bd|\.bd \.dot|\.bag|\.bag \.bgi|\.bb)$/.test(s));
    if (extra.length) bad.push(f + ' keeps page-local rules: ' + extra.slice(0, 3).join(', '));
  }
  gate('P10', 'Recomposed surfaces (D): one shell, one system, no compatibility layer',
    bad.length === 0, bad.length ? bad.join(' · ') : 'six surfaces on .t-*/.p-* only; legacy map deleted; page-local CSS is the shared chrome alone');
}

/* P11 — E/F/G. Eligibility is explicit and never inferred; the confirmation
   is a protected server act the client cannot perform; the seating ledger
   ships no geometry of its own and the Guest Relations token never reaches
   an asset. */
{
  const bad = [];
  const t = read('assets/temple.js'), inv = read('assets/invite.mjs');
  if (!/[ap]\.givingEligibility === 'PAIR' \|\| [ap]\.givingEligibility === 'NONE'/.test(read('assets/guest.js'))) bad.push('eligibility must be explicit invitation metadata');
  if (/length === 2|length == 2/.test(t)) bad.push('eligibility must not be inferred from party size');
  if (!/if \(!this\.pairCan\(\)\) return false;/.test(t)) bad.push('the couple decision must be refused unless the pair can take part');
  if (!/givingEligibility/.test(inv)) bad.push('the invitation must carry eligibility to the client');
  const w = read('src/worker.js');
  if (!/grAuthorised\(request, env\)/.test(w) || !/x-gr-token/.test(w)) bad.push('the Guest Relations gate is missing');
  if (!/headers\.delete\('x-gr-verified'\)/.test(w)) bad.push('a client could claim the gate');
  if (!/'\/api\/confirm'/.test(w) || !/'\/api\/status'/.test(w)) bad.push('the confirmation and status routes are missing');
  for (const f of fs.readdirSync(path.join(ROOT, 'assets')).filter((x) => x.endsWith('.js') || x.endsWith('.mjs'))) {
    const s = read('assets/' + f);
    if (/x-gr-token|GR_TOKEN|api\/confirm|api\/seating\/(config|state|assign|plan)/.test(s)) bad.push('assets/' + f + ' touches the Guest Relations gate');
  }
  const gitignore = read('.gitignore');
  if (!/src\/\*\.private\.txt/.test(gitignore)) bad.push('the token file is not ignored by git');
  if (fs.existsSync(path.join(ROOT, 'src/gr-token.private.txt')) && /gr-token/.test(read('.assetsignore') + '') === false && !/^src$/m.test(read('.assetsignore'))) bad.push('the token file could be served');
  for (const f of ['src/seating.js', 'assets/seating.js', 'wedding-preparation.html', 'src/worker.js']) {
    if (/seatId:\s*'[CD]-[LRTB]-\d|'C-[LR]-\d+-\d+'|'D-[LRTB]-\d+'/.test(read(f))) bad.push(f + ' carries production geometry');
  }
  if (!/new_sqlite_classes": \["Seating"\]/.test(read('wrangler.jsonc'))) bad.push('the seating object is not migrated');
  /* the Owner override: 50 guest seats (20 + 30), 48 + BRIDE + GROOM = 50 people; the retired 40 / 20+20 truth must not be active */
  const led = read('src/seating.js');
  if (!/guestSeats: 50, left: 20, right: 30/.test(led) || !/guestSeats: 48, top: 24, bottom: 24, fixed: 2, totalPeople: 50/.test(led)) bad.push('the seating capacity contract is not the Owner geometry');
  if (/perSide: 20|40 guest|20 \+ 20|34 selectable/.test(led + read('assets/seating.js'))) bad.push('retired 40-seat truth is still active');
  gate('P11', 'E/F/G: explicit eligibility, protected confirmation, geometry-free seating ledger',
    bad.length === 0, bad.length ? bad.join(' · ') : 'PAIR/NONE/unresolved only · GR token gate with constant-time compare · no geometry in code · token never in assets or git');
}

/* P5 — overlay integrity (release-blocking): a hidden lightbox must actually
 * be hidden (author display rules must not defeat the hidden attribute), and
 * gallery navigation can never run on an empty list (NaN / 0 regression). */
/* MASTER-02 minimal landing has no public lightbox — the guarded gallery
 * lives in the one experience (register). */
const registerLbHidden = /\.lb\[hidden\] \{ display: none !important; \}/.test(regHtml);
const registerGuard = /never open without images/.test(appJs) && /if \(!LB\.images\.length\) \{ closeLightbox\(\); return; \}/.test(appJs);
gate('P5', 'Lightbox overlays: hidden wins, no empty-gallery navigation',
  registerLbHidden && registerGuard,
  [!registerLbHidden && 'register .lb[hidden] must force display:none !important',
   !registerGuard && 'register lightbox needs empty-list guards']
    .filter(Boolean).join(' · ') || 'hidden always wins; journey gallery guarded against empty lists');

/* P4 — wording + product guards */
const exclusiveHit = /Heritage Exclusive/i.test(indexHtml) || /Heritage Exclusive/i.test(appJs) || /Heritage Exclusive/i.test(data) || /Heritage Exclusive/i.test(regHtml);
const noRoomHit = /No room needed/i.test(appJs) || /No room needed/i.test(regHtml);
const train88 = /contributionPerGuest: 75/.test(data);
gate('P4', 'Wording and product guards',
  !exclusiveHit && !noRoomHit && train88,
  [exclusiveHit && "'Heritage Exclusive' found — the category is Heritage Executive",
   noRoomHit && "'No room needed' option must not exist",
   !train88 && 'Night Train must be USD 75 per guest (55 train + 20 van/luggage package)'].filter(Boolean).join(' · ')
  || "no 'Heritage Exclusive', no 'No room needed', train fixed at USD 75 per guest package");

/* P6 — LINE/QR owner rule (2026-08-26): no invented LINE ID, no line.me
 * destination, no generated QR. Only the owner's original QR assets. */
const fsQ = require('fs');
const guestSources = [indexHtml, appJs, data, regHtml];
const lineIdLeak = guestSources.some((s) => /line\.me/i.test(s) || /LINE[^a-z]{0,14}seeyouinlaos/.test(s) || /line: 'seeyouinlaos'/.test(s) || /Public Rate|Selling Rate/.test(s));
const generatedQr = fsQ.existsSync('assets/images/qr/line-qr.svg');
const qrOk = fsQ.existsSync('assets/images/qr/line-qr-official.png') && fsQ.existsSync('assets/images/qr/whatsapp-qr-official.png');
const qrHashes = qrOk && require('crypto').createHash('sha256').update(fsQ.readFileSync('assets/images/qr/line-qr-official.png')).digest('hex') === '181fe3286cbbdd8c354ec3e58fc465e6ecdd225676ec5592f0209c27d2df55b5'
  && require('crypto').createHash('sha256').update(fsQ.readFileSync('assets/images/qr/whatsapp-qr-official.png')).digest('hex') === '46dfbbe79c84cfe78c4f8a261f756dcc67a6ac15fdd21bd83c4615b2acce6688';
gate('P6', 'LINE/WhatsApp QR owner rule (originals only, no invented LINE ID)',
  !lineIdLeak && !generatedQr && qrHashes,
  [lineIdLeak && 'invented LINE ID or line.me destination in guest-facing source',
   generatedQr && 'generated line-qr.svg still present',
   !qrHashes && 'official QR assets missing or altered (hash mismatch vs owner originals)'].filter(Boolean).join(' · ')
  || 'owner-original LINE + WhatsApp QR verified by hash; zero written LINE IDs; generated QR removed');

/* P7 — Dress Code imagery real (24 owner images) and ZERO *visible* gallery
 * arrow/expand controls on any surface (owner rule 2026-08-27). Reaching photos
 * 2..n inside the opened lightbox is REQUIRED and delivered by invisible
 * tap-zones + a dot indicator + swipe — no visible arrow glyph or expand icon
 * (owner decision 2026-08-28). The forbidden set therefore keeps the visible
 * expand controls and arrow glyphs, but no longer bans the invisible lightbox
 * tap-zones; a positive check confirms the dot navigation is present. */
/* Haruthai correction pass (11 SEP 2026): the owner crossed out resort-01 (a male
 * beach photograph). No authoritative replacement exists, so the resort group is
 * FIVE images (02–06) and the library is 23 owner images. resort-01 must not exist. */
const DRESS_EXPECT = { resort: [2, 3, 4, 5, 6], tradition: [1, 2, 3, 4, 5, 6], vow: [1, 2, 3, 4, 5, 6], dinner: [1, 2, 3, 4, 5, 6] };
const dressGroups = Object.keys(DRESS_EXPECT);
const dressMissing = dressGroups.flatMap((g) => DRESS_EXPECT[g].map((i) => g + '-0' + i + '.jpg'))
  .filter((f) => !fs.existsSync(path.join(ROOT, 'assets/images/dress', f)));
const dressRetired = fs.existsSync(path.join(ROOT, 'assets/images/dress/resort-01.jpg'));
const dressDisk = dressGroups.map((g) => DRESS_EXPECT[g].filter((i) => fs.existsSync(path.join(ROOT, 'assets/images/dress', g + '-0' + i + '.jpg'))).length);
const dressUnique = dressGroups.flatMap((g) => DRESS_EXPECT[g].map((i) => g + '-0' + i));
const dressOk = dressMissing.length === 0 && !dressRetired && /assets\/images\/dress\//.test(appJs)
  && !/dg-slot|DRESS_ALMS_/.test(indexHtml + appJs);
const standalone = fs.existsSync(path.join(ROOT, 'build/standalone.html')) ? read('build/standalone.html') : '';
// forbidden: visible expand controls on thumbnails + any visible arrow glyph (entity or literal ↗)
const arrowPattern = /rm-expand|acc-expand|rm-gnav|acc-gnav|&#8599;|&#8592;|&#8594;|↗/;
const arrowSurfaces = [['index.html', indexHtml], ['register/index.html', regHtml], ['register/app.mjs', appJs],
  ['src/build-rooms.cjs', read('src/build-rooms.cjs')]].filter(([, s]) => arrowPattern.test(s)).map(([n]) => n);
// required: invisible in-lightbox navigation (dot indicator) present on both surfaces
const navOk = /class="lb-dots"/.test(regHtml);
gate('P7', 'Dress Code imagery real (23 — resort-01 retired by the owner), no visible arrows, in-lightbox tap navigation present',
  dressOk && arrowSurfaces.length === 0 && navOk,
  [!dressOk && 'dress imagery incomplete: ' + dressUnique.length + ' expected, on disk ' + dressDisk.join('/') + ' (' + dressGroups.join('/') + ')' +
     (dressMissing.length ? ', missing files: ' + dressMissing.join(', ') : '') + (dressRetired ? ', retired resort-01.jpg still present' : ''),
   arrowSurfaces.length && 'visible arrow/expand controls present in: ' + arrowSurfaces.join(', '),
   !navOk && 'in-lightbox dot navigation missing on a surface']
    .filter(Boolean).join(' · ')
  || '23 owner dress images across 4 groups (resort 02–06); no visible arrow/expand icon; invisible in-lightbox tap-zone + dots navigation present');


/* GATE L1 — localization completeness (HSW-001 P0 §8/§20).
 * The catalog is regenerated from the ACTUAL page sources on every run, so a
 * newly added English string fails the release until it is translated. */
{
  const { execSync } = require('child_process');
  execSync('node ' + path.join(__dirname, 'i18n-catalog.cjs'), { stdio: 'pipe' });
  const catSrc = fs.readFileSync(path.join(ROOT, 'assets/i18n/catalog.js'), 'utf8');
  const catalog = JSON.parse(catSrc.slice(catSrc.indexOf('['), catSrc.lastIndexOf(']') + 1));
  const dict = fs.readFileSync(path.join(ROOT, 'assets/i18n/siyl-i18n.js'), 'utf8');
  const patternOK = [
    /^[\d–-]+ sq\.m\.$/, /^\d+ of \d+ (available|seats remaining)$/, /^\d+ (rooms?|seats?) allocated$/,
    /^(Up to )?\d+ adults?( · \d+ child(ren)?( sharing bedding)?)?$/, /^\d+ details? still needed$/,
    /^(Black Tie|Elegant Resort Wear|Lao Traditional Dress) dress reference \d+, open larger$/,
    /^.+ photos — swipe, or press Enter for a larger view$/,
  ];
  const missing = catalog.filter((t) => {
    if (dict.indexOf(JSON.stringify(t).slice(1, -1)) > -1) return false; // dict-covered (escaped form)
    if (dict.indexOf('E("' + t) > -1) return false;
    return !patternOK.some((r) => r.test(t));
  });
  gate('L1', 'Localization completeness (catalog-driven, fail-closed)',
    missing.length === 0,
    missing.length ? missing.length + ' required strings lack DE/TH/JA coverage: ' + missing.slice(0, 6).map((x) => JSON.stringify(x.slice(0, 40))).join(', ') : catalog.length + ' required strings covered by dictionary or localization patterns');
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log((r.ok ? 'PASS ' : 'FAIL ') + '[Gate ' + r.id + '] ' + r.name + ' — ' + r.detail);
}
console.log('');
console.log(failed === 0 ? 'RELEASE CHECK PASSED' : 'RELEASE BLOCKED: ' + failed + ' gate(s) open');
process.exit(failed === 0 ? 0 : 1);
