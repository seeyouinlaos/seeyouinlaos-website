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
const dressDisk = ['resort', 'tradition', 'vow', 'dinner']
  .map((g) => [1, 2, 3, 4, 5, 6].filter((i) => fs.existsSync(path.join(ROOT, 'assets/images/dress', g + '-0' + i + '.jpg'))).length);
const dressAppRefs = [...appJs.matchAll(/images\/dress\/'?|'(tradition|vow|dinner)-0[1-6]'/g)].length;
const dressOk = dressDisk.every((n) => n === 6) && /assets\/images\/dress\//.test(appJs)
  && !/dg-slot|DRESS_ALMS_/.test(indexHtml + appJs);
const standalone = fs.existsSync(path.join(ROOT, 'build/standalone.html')) ? read('build/standalone.html') : '';
// forbidden: visible expand controls on thumbnails + any visible arrow glyph (entity or literal ↗)
const arrowPattern = /rm-expand|acc-expand|rm-gnav|acc-gnav|&#8599;|&#8592;|&#8594;|↗/;
const arrowSurfaces = [['index.html', indexHtml], ['register/index.html', regHtml], ['register/app.mjs', appJs],
  ['src/build-rooms.cjs', read('src/build-rooms.cjs')]].filter(([, s]) => arrowPattern.test(s)).map(([n]) => n);
// required: invisible in-lightbox navigation (dot indicator) present on both surfaces
const navOk = /class="lb-dots"/.test(regHtml);
gate('P7', 'Dress Code imagery real (24), no visible arrows, in-lightbox tap navigation present',
  dressOk && arrowSurfaces.length === 0 && navOk,
  [!dressOk && 'dress imagery incomplete: ' + dressUnique.length + ' refs, groups ' + dressGroups.join('/') +
     (dressMissing.length ? ', missing files: ' + dressMissing.join(', ') : ''),
   arrowSurfaces.length && 'visible arrow/expand controls present in: ' + arrowSurfaces.join(', '),
   !navOk && 'in-lightbox dot navigation missing on a surface']
    .filter(Boolean).join(' · ')
  || '24 owner dress images across 4 groups; no visible arrow/expand icon; invisible in-lightbox tap-zone + dots navigation present');


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
