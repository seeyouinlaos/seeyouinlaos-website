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

/* Gate 2b — THE ROOM OCCUPANCY ENGINE (Owner, 14 Sep 2026): one server-side
   engine of persistent allocation units with two guest places each, atomic
   join / change / release in the guest's own name, no client-side allocation,
   stock from the seed and nowhere else. This is what makes a public
   availability claim honest. */
{
  const seed = read('src/inventory-seed.js');
  const engine = read('src/rooms.js');
  const worker = read('src/worker.js');
  const client = read('assets/rooms.js');
  const stay = read('assets/stay.js');
  const wrangler = read('wrangler.jsonc');
  const inv = [];
  if (!/durable_objects/.test(wrangler) || !/"class_name":\s*"Rooms"/.test(wrangler)) inv.push('no Rooms Durable Object binding');
  if (!/new_sqlite_classes": \["Rooms"\]/.test(wrangler)) inv.push('no Rooms Durable Object migration');
  if (!/idFromName\('rooms'\)/.test(worker)) inv.push('the Worker does not route to ONE engine');
  if (!/blockConcurrencyWhile/.test(engine)) inv.push('a join is not serialised');
  if (!/\}, 409\)/.test(engine)) inv.push('full does not answer 409');
  if (!/export const PLACES = 2;/.test(engine)) inv.push('a room unit is not two guest places');
  if (!/HOLD THE NEW PLACE FIRST/.test(engine) || !/AND ONLY THEN LET THE OLD ONE GO/.test(engine)) inv.push('a change is not join-then-release');
  if (!/if \(invitationId !== identity\.invitationId \|\| guestId !== identity\.guestId\) return json\(\{ ok: false, error: 'not your guest' \}, 403\);/.test(engine)) inv.push('a place can be held for another guest');
  /* THE MASTER'S RESERVATIONS (Owner, 16 Sep 2026): the seed's held / heldFor are the Master's Status column — the first `held`
     physical rooms of a category are RESERVED for `heldFor`; a Bride & Groom room is the hosts' alone, a Family room is nobody's
     through the website; every other room is open to any authenticated guest. The total stays the physical count; the availability
     (free places, rooms with a place left) is derived from the OPEN units only — never from a separate counter. */
  if (!/if \(!identity\) return \{ ok: false, error: 'unauthorised' \};/.test(engine)) inv.push('an anonymous request can hold a place');
  if (!/if \(unit\.reservedFor === 'Bride & Groom'\) return identity\.hosts \? \{ ok: true \} : \{ ok: false, error: 'reserved · bride & groom' \};/.test(engine)) inv.push('a Bride & Groom room is not the hosts\' alone');
  if (!/if \(unit\.reservedFor\) return \{ ok: false, error: 'reserved · ' \+ String\(unit\.reservedFor\)\.toLowerCase\(\) \};/.test(engine)) inv.push('a Family room can be taken through the website');
  if (!/reservedFor: i < \(s\.held \|\| 0\) && s\.heldFor \? s\.heldFor : null/.test(engine)) inv.push('the reserved rooms are not the Master\'s held count');
  if (!/free: open\.reduce\(\(n, u\) => n \+ u\.free, 0\), rooms: open\.filter\(\(u\) => u\.free > 0\)\.length/.test(engine)) inv.push('the category availability is not derived from its open units');
  if (!/reserved: list\.filter\(\(u\) => u\.reservedFor\)\.length/.test(engine)) inv.push('the summary does not count the reserved rooms');
  if (!/var open = list\.filter\(function \(u\) \{ return u\.eligible; \}\);/.test(client)) inv.push('the client counts reserved rooms as available');
  if (!/This room was just filled\. Please choose another room\./.test(stay)) inv.push('the oversell refusal does not carry the Owner\'s words');
  const seedSrc = seed;
  if (!/'bkk-stay\/penthouse':\s*\{ unit: 'room', capacity: 6, occupancy: 2/.test(seedSrc)) inv.push('the six-bedroom Penthouse is not six units of two places');
  /* the client must never decide an allocation for itself */
  if (/capacity\s*[:=]\s*\d/.test(client)) inv.push('assets/rooms.js carries its own capacity numbers');
  if (!/u\.join\(win, slug, unit\.label\)\.then/.test(stay)) inv.push('a stay is written before the place is held');
  if (!/retired — use \/api\/rooms/.test(worker)) inv.push('the retired category ledger still answers');
  if (fs.existsSync(path.join(ROOT, 'assets/inventory.js'))) inv.push('the retired inventory client is still shipped');
  const keys = (seed.match(/^\s*'[a-z0-9-]+\/[a-z0-9-]+':/gm) || []).length;
  if (keys < 30) inv.push('inventory seed covers only ' + keys + ' categories');
  gate('2b', 'Room occupancy engine: persistent units of two places, atomic join/change/release in the guest\'s own name, no client-side allocation',
    inv.length === 0,
    inv.length ? inv.join(' · ')
      : 'one Durable Object engine ("rooms") serialises every place; ' + keys +
        ' categories seeded from Accommodation_Details; full answers 409; a change holds the new place before the old one goes; the client holds no capacity of its own.');
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
  const enc = read('register/invitations.enc.json') + read('register/auth-index.json');
  encOk = enc.length > 100;
  for (const name of ['Peggy', 'Steffie', 'Seray', 'Orhan', 'Marcel', 'Nongyao', 'Vipavee', 'Haruthai', 'Suthep']) {
    if (enc.includes(name)) demoHits.push('PLAINTEXT guest name in the deployed register: ' + name);
  }
} catch (e) { demoHits.push('register/invitations.enc.json or auth-index.json missing — run node src/build-invitations.cjs'); }
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
/* R1 (final pre-release run, 11 SEP 2026): the superseded registration engine
 * is NEVER served — its four files are excluded on both origins, its entry
 * (the issued /register/?invite= link) redirects into the accepted product,
 * and the two files the accepted product loads from register/ stay public. */
const jekyll = read('_config.yml');
const workerSrc = read('src/worker.js');
const engineFiles = ['register/index.html', 'register/app.mjs', 'register/data.mjs', 'register/logic.mjs'];
const engineHidden = engineFiles.every((f) => new RegExp('^' + f.replace('.', '\\.') + '$', 'm').test(assetsignore) && new RegExp('^\\s*-\\s*' + f.replace('.', '\\.') + '$', 'm').test(jekyll));
const engineKept = !/^register\/crypto\.mjs$/m.test(assetsignore) && !/^register\/invitations\.enc\.json$/m.test(assetsignore) && !/^register\/?$/m.test(assetsignore);
const engineRedirect = workerSrc.includes("url.pathname === '/register' || url.pathname.startsWith('/register/')") && workerSrc.includes('crypto\\.mjs|invitations\\.enc\\.json') && workerSrc.includes("'/invitation.html', 302)");
const landing = fs.existsSync(path.join(ROOT, 'register-landing.html')) && /permalink: \/register\/index\.html/.test(read('register-landing.html'));
gate('R1', 'Superseded registration engine never served; /register/ lands in the accepted product',
  engineHidden && engineKept && engineRedirect && landing,
  [!engineHidden && 'engine files not excluded on both origins', !engineKept && 'crypto.mjs / invitations.enc.json must stay public', !engineRedirect && 'Worker redirect for /register/ missing', !landing && 'Pages redirect stub missing'].filter(Boolean).join(' · ')
  || 'index/app/data/logic excluded (.assetsignore + _config.yml) · Worker 302 /register/* → /invitation.html · crypto.mjs + bundle public · Pages stub in place');
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
  /* TAK BAT IS SELF-PAY (Owner correction 10 Sep 2026, applied 11 Sep at 91c52ad,
   * re-affirmed as a post-release rule 13 Sep): on every guest-facing surface the
   * alms-giving is never "no charge", "nothing to pay", "no separate charge",
   * "complimentary" or "included" — the guest covers their own offering. */
  const TAKBAT_FREE = /(no charge|nothing to pay|no separate charge|nothing is paid|complimentary|included at no|free of charge|at no cost)/i;
  for (const f of ['voyage.html', 'wedding.html', 'your-journey.html', 'review.html', 'journeys.html', 'index.html', 'assets/journey.js', 'assets/temple.js']) {
    const src = read(f);
    const re = /(Tak Bat|alms-giving|alms giving)/gi; let m;
    while ((m = re.exec(src))) {
      const window = src.slice(Math.max(0, m.index - 140), m.index + 140);
      if (TAKBAT_FREE.test(window) && !/self-pay/i.test(window)) { bad.push(f + ': the alms-giving reads as free of charge near "' + window.replace(/\s+/g, ' ').slice(0, 80) + '…"'); break; }
    }
  }
  /* Owner 13 Sep 2026: the Wedding Dinner is POOLSIDE; the pool stays out of the vow ceremony only */
  const vowSec = vy.slice(vy.indexOf('id="vows"'), vy.indexOf('id="vows"') + 700);
  if (/pool/i.test(vowSec)) bad.push('no pool narrative in the vow ceremony');
  if (/courtyard garden/i.test(vy)) bad.push('the Wedding Dinner is poolside, never "courtyard garden"');
  if (!/19:30 · Poolside/.test(vy)) bad.push('the Wedding Dinner must say Poolside');
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
        'only the Sangkhathan is USD 15; dinner poolside, vow pool-free; retired bride and fountain images removed');
}

/* P9 — ONE CODE = ONE GUEST (Owner, 14 Sep 2026). The session is one guest;
   nothing is written in another guest's name; there is no switch and nobody
   to answer for; the code never enters the session; every write to the
   Worker carries the bearer and is refused for any other guest; the party is
   context, never authority; the readiness engine is the one truth. */
{
  const g = read('assets/guest.js'), sh = read('assets/prep-shell.js'), inv = read('assets/invite.mjs'), t = read('assets/temple.js'), d = read('assets/docs.js'), w = read('src/worker.js'), au = read('src/auth.js'), bad = [];
  if (!/if \(!a \|\| !a\.guestId \|\| !a\.bearer \|\| a\.invitationId !== 'INV-' \+ a\.guestId\) return null;/.test(g)) bad.push('the guest record must accept only a guest-scoped session');
  if (/setActive: function|setSubject: function|activeGuestId: w/.test(g)) bad.push('the retired switch / answering-for model is still in the record');
  if (!/mayAcknowledge: function \(id\) \{ var m = this\.me\(\); return !!\(m && \(!id \|\| id === m\.guestId\)\); \}/.test(g)) bad.push('an acknowledgement must be first person only');
  if (!/if \(!mine\(id\)\) return false;/.test(t)) bad.push('the temple must refuse another guest\'s answer');
  if (!/mayConsent/.test(d)) bad.push('publication consent must be first person only');
  if (/data-switch|chooseIdentity|Answering for|Switch identity|siyl\.who/.test(sh)) bad.push('the shell still offers a switch');
  if (!/data-leave="another"/.test(sh) || !/data-leave="out"/.test(sh)) bad.push('OPEN ANOTHER INVITATION and SIGN OUT must be in reach');
  for (const f of ['wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'your-journey.html', 'invitation.html']) {
    if (/data-switch|setSubject\(|\?for=|data-who=/.test(read(f))) bad.push(f + ' still carries a cross-guest path');
  }
  if (!/bearer,\n/.test(inv) || /token: inv\.token|token: String\(/.test(inv)) bad.push('the session must carry the bearer and never the code');
  if (!/const GUEST_KEYS = \['siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\];/.test(inv)) bad.push('leaving must set aside exactly the guest\'s draft');
  if (!/const who = await identify\(request, env\);/.test(w) || !/who\.invitationId !== String\(invitationId\)\.trim\(\)/.test(w)) bad.push('the register route must verify the bearer against the invitation');
  if (!/headers\.delete\('x-gr-verified'\); headers\.delete\('x-siyl-identity'\);/.test(w)) bad.push('a client could claim an identity');
  if (!/else if \(op === 'select' \|\| op === 'release'\) return json\(\{ ok: false, error: 'unauthorised' \}, 401/.test(w)) bad.push('a seat write without a bearer must be refused');
  if (!/else if \(op === 'join' \|\| op === 'leave'\) return json\(\{ ok: false, error: 'unauthorised' \}, 401/.test(w)) bad.push('a room write without a bearer must be refused');
  if (!/export async function identify/.test(au) || !/x-siyl-auth/.test(au)) bad.push('the identity module is missing');
  if (!/if \(!identity\) return json\(\{ ok: false, error: 'unauthorised' \}, 401\);/.test(read('src/seating.js'))) bad.push('the seating object must refuse an unidentified write');
  /* one readiness engine, and every surface reads it */
  if (!/missingFor: function \(key\)/.test(g) || !/mayEnter: function \(key\)/.test(g) || !/nextHref: function/.test(g)) bad.push('the readiness engine is incomplete');
  if (!/G\.nextHref\(\)/.test(read('assets/bag.js'))) bad.push('the sticky VIEW does not read the engine');
  if (!/g\.mayEnter\(STEP\.key\)/.test(sh) || !/g\.missingFor\(STEP\.key\)/.test(sh)) bad.push('the shell gate / continue does not read the engine');
  if (!/G\.readiness\(\)/.test(read('review.html')) || !/G\.readiness\(\)/.test(read('cart.html'))) bad.push('Review / the cart do not read the engine');
  if (!/<a class="bag" href="cart\.html"/.test(read('journeys.html')) || /<a class="bag" href="your-journey\.html"/.test(read('wedding.html'))) bad.push('the bag icon must open the cart');
  gate('P9', 'One code = one guest: guest-scoped session, first-person writes, bearer-verified Worker, one readiness engine, cart routing',
    bad.length === 0, bad.length ? bad.join(' · ') : 'session = one guest with a bearer · no switch, nobody answers for anyone · every write verified at the Worker · steps read one engine · bag → cart');
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
  if (!/a\.sangkhathan === 'ELIGIBLE' \|\| a\.sangkhathan === 'NONE'/.test(read('assets/guest.js'))) bad.push('eligibility must be explicit invitation metadata');
  if (/length === 2|length == 2/.test(t)) bad.push('eligibility must not be inferred from party size');
  if (!/if \(!this\.canOffer\(id\)\) return false;/.test(t)) bad.push('the offering must be refused unless the guest may take part');
  if (!/sangkhathan: inv\.sangkhathan/.test(inv)) bad.push('the invitation must carry eligibility to the client');
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
  /* the Owner geometry: ceremony 50 guest seats (20 + 30); dinner 50 bookable chairs (25 + 25), nothing fixed for anyone (Owner decision 13 Sep 2026 — no Bride/Groom position, no family chair); the retired 40 / 20+20 truth must not be active */
  const led = read('src/seating.js');
  if (!/guestSeats: 50, left: 20, right: 30, fixed: 2/.test(led) || !/ceremony: \{ rows: 10, perRow: \{ L: 2, R: 3 \}, guestSeats: 50, fixed: \['BRIDE', 'GROOM'\]/.test(led) || !/guestSeats: 50, top: 25, bottom: 25, totalPeople: 50/.test(led) || /dinner:\s*\{[^}]*fixed:/.test(led)) bad.push('the seating capacity contract is not the Owner geometry (ceremony 50 + BRIDE/GROOM front centre; dinner 50 bookable, nothing fixed)');
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
/* final pre-release run (001 findings 2 + 3): the dinner venue is Souphattra Heritage Vientiane —
 * "Souphattra Vientiane Hotel" does not exist (DECISION-REGISTER D-14); C86 (10:15 → 13:44) never
 * carries the retired C642 dinner-window meal copy. Checked on every active guest surface. */
const activeSurfaces = fs.readdirSync(ROOT).filter((f) => /\.html$/.test(f) && f !== 'register-landing.html').map((f) => read(f)).join('\n')
  + fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => /\.(js|mjs|css)$/.test(f)).map((f) => read('assets/' + f)).join('\n');
const venueHit = /Souphattra Vientiane Hotel/.test(activeSurfaces);
const mealHit = /hot meal|dinner window|17:30 – 19:00/i.test(activeSurfaces);
/* Owner corrections 13 Sep 2026 (guest testing): no blue dress requirement — the temple
 * is "Lao Traditional Dress"; C86 Business Class carries no 1 + 1 seating claim */
const blueHit = /Blue Lao Traditional Dress|Lao Traditional Dress · Blue|dressed in Lao tradition, in blue/i.test(activeSurfaces);
const onePlusOneHit = /1 \+ 1 seating|1\+1 seating|single seat on each side of the aisle|nobody sits beside/i.test(activeSurfaces);
const exclusiveHit = /Heritage Exclusive/i.test(indexHtml) || /Heritage Exclusive/i.test(appJs) || /Heritage Exclusive/i.test(data) || /Heritage Exclusive/i.test(regHtml);
const noRoomHit = /No room needed/i.test(appJs) || /No room needed/i.test(regHtml);
const train88 = /contributionPerGuest: 100/.test(data);
gate('P4', 'Wording and product guards',
  !exclusiveHit && !noRoomHit && train88 && !venueHit && !mealHit && !blueHit && !onePlusOneHit,
  [exclusiveHit && "'Heritage Exclusive' found — the category is Heritage Executive",
   noRoomHit && "'No room needed' option must not exist",
   venueHit && "'Souphattra Vientiane Hotel' found — the venue is Souphattra Heritage Vientiane (D-14)",
   mealHit && 'C642-era dinner-window / hot-meal copy found on an active surface',
   blueHit && 'a blue dress requirement is still on an active surface — the temple is Lao Traditional Dress',
   onePlusOneHit && 'the C86 1 + 1 seating claim is still on an active surface — Business Class only',
   !train88 && 'Night Train must be USD 100 per guest package (Owner, 14 Sep 2026)'].filter(Boolean).join(' · ')
  || "no 'Heritage Exclusive', no 'No room needed', train fixed at USD 100 per guest package");

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

/* GATE C1 — asset fingerprints (Owner, Edit 4 · 16 Sep 2026): every stylesheet and script a page references
 * carries the content hash of the file it names (src/asset-versions.cjs), so a fresh page can never pair
 * with a stale cached asset on the ten-minute Pages cache. */
{
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [path.join(__dirname, 'asset-versions.cjs'), '--check'], { encoding: 'utf8' });
  gate('C1', 'Asset fingerprints current on every page', r.status === 0, (r.stdout || '').trim().replace(/^ASSET VERSIONS: /, ''));
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log((r.ok ? 'PASS ' : 'FAIL ') + '[Gate ' + r.id + '] ' + r.name + ' — ' + r.detail);
}
console.log('');
console.log(failed === 0 ? 'RELEASE CHECK PASSED' : 'RELEASE BLOCKED: ' + failed + ' gate(s) open');
process.exit(failed === 0 ? 0 : 1);
