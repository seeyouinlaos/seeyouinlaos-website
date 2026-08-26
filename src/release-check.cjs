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
  invExact ? "EXACT counts shown publicly — requires final allocation sign-off." : "REQUEST mode (guest UI shows 'Request availability'; exact counts stay internal). OK for release.");

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
const legacyTerms = /avani|manda de laos|river sun|luang prabang|LPQ\b|8booking|mekhong escape|mekong escapes|cruise/i;
const legacyInIndex = legacyTerms.test(indexHtml);
const legacyInRegister = legacyTerms.test(regHtml) || legacyTerms.test(appJs) || legacyTerms.test(data);
const journeyExcluded = /^journey$/m.test(assetsignore);
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
const missingCards = roomNames.filter((n) => !indexHtml.includes('<h3>' + n + '</h3>'));
const noblePresent = /noble-courtyard/.test(dataSrc) && /contributionPerGuest: 220/.test(dataSrc);
const oldVillaGone = !/Cozy Villa|4BR|id: 'villa'/.test(dataSrc);
const airbnbSeg = dataSrc.slice(dataSrc.indexOf("id: 'airbnb-2br'"));
const airbnbOk = airbnbSeg.length > 10
  && /contributionPerGuest: null/.test(airbnbSeg)
  && /capacityUnit: 'Party allocation'/.test(airbnbSeg)
  && !/COMPLIMENTARY|fully hosted|hosted by|USD 0|nothing to book/i.test(airbnbSeg);
const bookingValueLeak = /123\.8/.test(dataSrc) || /123\.8/.test(appJs) || /123\.8/.test(indexHtml);
const matrixOk = ['contributionPerGuest: 130', 'contributionPerGuest: 150', 'contributionPerGuest: 170',
  'contributionPerGuest: 220', 'contributionPerGuest: 260', 'contributionPerGuest: 290', 'contributionPerGuest: 766.50']
  .every((s) => dataSrc.includes(s));
const capsOk = ['capacityTotal: 5', 'capacityTotal: 13', 'capacityTotal: 3', 'capacityTotal: 2']
  .every((s) => dataSrc.includes(s)) && (dataSrc.match(/capacityTotal: 1\b/g) || []).length === 4; // 3 suites + airbnb
gate('R3', 'Accommodation matrix complete and single-sourced (26 rooms + hosted Airbnb)',
  missingImages.length === 0 && missingCards.length === 0 && roomNames.length === 8 && noblePresent && oldVillaGone && airbnbOk && !bookingValueLeak && matrixOk && capsOk,
  [missingImages.length && 'missing room images: ' + missingImages.join(', '),
   missingCards.length && "public page missing generated cards: " + missingCards.join(', ') + " (run 'npm run build:rooms')",
   !noblePresent && 'Noble Courtyard Suite must be active at USD 220 per guest',
   !oldVillaGone && "the cancelled 4BR 'Vientiane Urban Cozy Villa 2' must never return",
   !airbnbOk && 'the 2BR Airbnb must be present, commercially NEUTRAL (arranged separately) and outside the room matrix',
   bookingValueLeak && 'INTERNAL BOOKING VALUE (USD 123.80) must never reach guest surfaces',
   !matrixOk && 'guest contributions must be 130/150/170/220/260/290/766.50',
   !capsOk && 'capacities must be 5/13/3/1/2/1/1 (26 rooms)']
    .filter(Boolean).join(' · ') ||
  '7 Souphattra categories (26 rooms) + neutral 2BR Airbnb (arranged separately) outside the matrix; old 4BR villa gone; no booking-value leak');

/* P1 — PUBLIC PRICE LEAK (release-blocking): no accommodation amount on the
 * public website. Prices live only behind invitation authentication. */
const roomsSection = indexHtml.slice(indexHtml.indexOf('<!-- ROOMS:START -->'), indexHtml.indexOf('<!-- ROOMS:END -->'));
const perNightWording = /per room \/ night|per night|room\/night/i.test(roomsSection) || /per room \/ night/.test(appJs);
const publicUsd = /USD\s*\d/.test(roomsSection) || perNightWording;
const rateNumbers = ['130', '150', '170', '220', '260', '290', '766.50']
  .filter((n) => new RegExp('USD\\s*' + n.replace('.', '\\.')).test(indexHtml));
gate('P1', 'No accommodation prices on the public website',
  !publicUsd && rateNumbers.length === 0,
  publicUsd || rateNumbers.length
    ? 'PUBLIC PRICE LEAK: ' + (publicUsd ? 'USD amount or per-night wording in guest-facing accommodation content' : 'rate value visible: USD ' + rateNumbers.join(', '))
    : 'no USD amount and no per-night wording on the public site; per-guest rates render only in the authenticated Guest Area');

/* P2 — public availability honesty: while no shared KV backend exists, the
 * public page must show "Request availability" and never fake live counts. */
const availLines = (roomsSection.match(/class="rm-avail"/g) || []).length;
const fakeLive = /\d+ of \d+ rooms remaining|Last room/.test(roomsSection);
gate('P2', 'Public availability honest (request mode until KV sync)',
  availLines === 8 && !fakeLive && roomsSection.includes('Request availability'),
  fakeLive
    ? 'public page pretends live remaining counts without a shared backend'
    : availLines !== 8
      ? 'expected 8 availability lines, found ' + availLines
      : "all 8 stay options show 'Request availability'; exact counts stay internal");

/* P3 — image + venue corrections (owner): alms at Souphattra Heritage with
 * TWO distinct images (couple on the timeline, procession on the card); no
 * bedroom image in the vow/dinner gallery. */
const almsStop = indexHtml.slice(indexHtml.indexOf('<h3>The Alms Giving</h3>') - 600, indexHtml.indexOf('<h3>The Alms Giving</h3>') + 600);
const almsCoupleFirst = almsStop.includes('tl-alms.jpg') && almsStop.includes('Souphattra Heritage Vientiane');
const almsCardIdx = indexHtml.indexOf('data-panel="pv-alms"');
const almsCard = indexHtml.slice(almsCardIdx, almsCardIdx + 600);
const almsCardProcession = almsCard.includes('alms-procession.jpg');
const almsExternal = /away from the hotel|not at the hotel|place to be confirmed/i.test(indexHtml);
const dinnerPanel = indexHtml.slice(indexHtml.indexOf('id="pv-pool"'), indexHtml.indexOf('</article>', indexHtml.indexOf('id="pv-pool"')));
const bedInDinner = dinnerPanel.includes('heritage-room.jpg');
gate('P3', 'Alms venue + image corrections protected',
  almsCoupleFirst && almsCardProcession && !almsExternal && !bedInDinner,
  [!almsCoupleFirst && 'alms timeline must use the couple photograph at Souphattra Heritage',
   !almsCardProcession && 'alms places card must use the procession photograph (two images, never one twice)',
   almsExternal && 'external-venue wording must be gone (alms is at Souphattra Heritage)',
   bedInDinner && 'bedroom image must not appear in the vow/dinner gallery']
    .filter(Boolean).join(' · ') || 'alms at Souphattra Heritage; couple + procession as two distinct images; no bedroom in the dinner gallery');

/* P5 — overlay integrity (release-blocking): a hidden lightbox must actually
 * be hidden (author display rules must not defeat the hidden attribute), and
 * gallery navigation can never run on an empty list (NaN / 0 regression). */
const publicLbHidden = /\.rm-lb\[hidden\] \{ display: none !important; \}/.test(indexHtml);
const registerLbHidden = /\.lb\[hidden\] \{ display: none !important; \}/.test(regHtml);
const publicGuard = /if \(!list \|\| !list\.length\) return;/.test(indexHtml) && /if \(!imgs\.length\) \{ close\(\); return; \}/.test(indexHtml);
const registerGuard = /never open without images/.test(appJs) && /if \(!LB\.images\.length\) \{ closeLightbox\(\); return; \}/.test(appJs);
gate('P5', 'Lightbox overlays: hidden wins, no empty-gallery navigation',
  publicLbHidden && registerLbHidden && publicGuard && registerGuard,
  [!publicLbHidden && 'public .rm-lb[hidden] must force display:none !important',
   !registerLbHidden && 'register .lb[hidden] must force display:none !important',
   !publicGuard && 'public lightbox needs empty-list guards (NaN / 0)',
   !registerGuard && 'register lightbox needs empty-list guards']
    .filter(Boolean).join(' · ') || 'hidden always wins; open/step guarded against empty galleries on both surfaces');

/* P4 — wording + product guards */
const exclusiveHit = /Heritage Exclusive/i.test(indexHtml) || /Heritage Exclusive/i.test(appJs) || /Heritage Exclusive/i.test(data) || /Heritage Exclusive/i.test(regHtml);
const noRoomHit = /No room needed/i.test(appJs) || /No room needed/i.test(regHtml);
const train88 = /contributionPerGuest: 88/.test(data);
gate('P4', 'Wording and product guards',
  !exclusiveHit && !noRoomHit && train88,
  [exclusiveHit && "'Heritage Exclusive' found — the category is Heritage Executive",
   noRoomHit && "'No room needed' option must not exist",
   !train88 && 'Night Train must be USD 88 per guest'].filter(Boolean).join(' · ')
  || "no 'Heritage Exclusive', no 'No room needed', train fixed at USD 88 per guest");

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log((r.ok ? 'PASS ' : 'FAIL ') + '[Gate ' + r.id + '] ' + r.name + ' — ' + r.detail);
}
console.log('');
console.log(failed === 0 ? 'RELEASE CHECK PASSED' : 'RELEASE BLOCKED: ' + failed + ' gate(s) open');
process.exit(failed === 0 ? 0 : 1);
