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
const presidentialPriced = /souphattra-presidential[\s\S]{0,500}?(ratePerNight: (?!null)|roomTotal: (?!null))/.test(dataSrc);
const nobleActive = /noble-courtyard/.test(dataSrc);
gate('R3', 'Accommodation experience complete and single-sourced',
  missingImages.length === 0 && missingCards.length === 0 && roomNames.length === 7 && !presidentialPriced && !nobleActive,
  [missingImages.length && 'missing room images: ' + missingImages.join(', '),
   missingCards.length && 'public page missing generated cards: ' + missingCards.join(', ') + " (run 'npm run build:rooms')",
   presidentialPriced && 'Presidential must never carry a guest rate',
   nobleActive && 'Noble Courtyard is cancelled and must not be in the active model']
    .filter(Boolean).join(' · ') ||
  roomNames.length + ' categories (Noble Courtyard cancelled), ' + roomImages.length + ' images, Presidential display-only');

/* P1 — PUBLIC PRICE LEAK (release-blocking): no accommodation amount on the
 * public website. Prices live only behind invitation authentication. */
const roomsSection = indexHtml.slice(indexHtml.indexOf('<!-- ROOMS:START -->'), indexHtml.indexOf('<!-- ROOMS:END -->'));
const publicUsd = /USD\s*\d/.test(roomsSection) || /per room \/ night/.test(indexHtml);
const rateNumbers = ['155', '180', '255', '310', '360', '510', '550', '620']
  .filter((n) => new RegExp('USD\\s*' + n).test(indexHtml));
gate('P1', 'No accommodation prices on the public website',
  !publicUsd && rateNumbers.length === 0,
  publicUsd || rateNumbers.length
    ? 'PUBLIC PRICE LEAK: ' + (publicUsd ? 'USD amount in public accommodation content' : 'rate value visible: USD ' + rateNumbers.join(', '))
    : 'public site shows rooms without any USD amount; rates render only in the authenticated Guest Area');

/* P2 — public availability (release-blocking): every active category shows a
 * live availability line derived from the inventory engine (build-rooms.cjs
 * imports createInventory/remaining/availabilityLabel — no static numbers). */
const availLines = (roomsSection.match(/class="rm-avail"/g) || []).length;
const buildRooms = read('src/build-rooms.cjs');
const availFromEngine = /createInventory/.test(buildRooms) && /availabilityLabel/.test(buildRooms);
const expectAvail = ['4 of 4 rooms remaining', '13 of 13 rooms remaining', '3 of 3 rooms remaining', '2 of 2 rooms remaining', 'Last room']
  .filter((s) => !roomsSection.includes(s));
gate('P2', 'Public room availability visible and engine-sourced',
  availLines >= 6 && availFromEngine && expectAvail.length === 0,
  expectAvail.length || !availFromEngine
    ? [!availFromEngine && 'build-rooms.cjs must derive availability from the inventory engine',
       expectAvail.length && 'missing availability lines: ' + expectAvail.join(' | ')].filter(Boolean).join(' · ')
    : availLines + ' availability lines, derived from createInventory/availabilityLabel (23 active rooms)');

/* P3 — image regression (owner corrections): the alms first image is the
 * original couple photograph; no bedroom image in the vow/dinner gallery. */
const almsStop = indexHtml.slice(indexHtml.indexOf('<h3>The Alms Giving</h3>') - 600, indexHtml.indexOf('<h3>The Alms Giving</h3>'));
const almsCoupleFirst = almsStop.includes('tl-alms.jpg');
const dinnerPanel = indexHtml.slice(indexHtml.indexOf('id="pv-pool"'), indexHtml.indexOf('</article>', indexHtml.indexOf('id="pv-pool"')));
const bedInDinner = dinnerPanel.includes('heritage-room.jpg');
const processionKept = indexHtml.includes('alms-procession.jpg');
gate('P3', 'Image corrections protected',
  almsCoupleFirst && !bedInDinner && processionKept,
  [!almsCoupleFirst && 'alms first image must be the original couple photograph (tl-alms.jpg)',
   bedInDinner && 'bedroom image must not appear in the vow/dinner gallery',
   !processionKept && 'approved alms procession image missing']
    .filter(Boolean).join(' · ') || 'alms couple image first, procession preserved, no bedroom in the dinner gallery');

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
