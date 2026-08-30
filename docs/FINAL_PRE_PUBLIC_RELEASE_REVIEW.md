# FINAL PRE PUBLIC RELEASE — MASTER REVIEW
## See You In Laos · Complete Website, Guest Area, Booking System & Invitation Architecture

| Document control | |
|---|---|
| **FROM** | Claude Code · Digital / Technical Implementation Review |
| **TO** | H&S Wedding 001 · All Project Review Workstreams |
| **REVIEW DATE** | 30 August 2026 |
| **DOCUMENT VERSION** | v1.0 |
| **DOCUMENT TYPE** | Final Pre Public Release Review (authoritative handoff) |
| **REVIEWED PRODUCTION BASELINE** | commit `cfdc4e7` (`cfdc4e73b39146858a29d1f259a35dd00ecde7c8`), branch `main` |
| **DOCUMENT COMMIT** | see Version History (§31) — the commit that introduces this file |
| **CLOUDFLARE VERSION** | `462c248e-6c84-4c1f-8627-135f8ef6c741` (live, verified serving baseline) |
| **GITHUB PAGES** | build "pages build and deployment" — success (verified serving baseline) |
| **PRODUCTION URL 1** | https://seeyouinlaos-website.suthep-hrg.workers.dev |
| **PRODUCTION URL 2** | https://seeyouinlaos.github.io/seeyouinlaos-website/ |
| **REPOSITORY** | github.com/seeyouinlaos/seeyouinlaos-website · branch `main` only |

**Mandate honored:** review + documentation only. No fixes, no translations, no redesign, no guest/code generation were performed in this pass. Findings are recorded in the Issue Register (§28), never silently corrected.

---

## 1 · EXECUTIVE SUMMARY

| System | Factual status |
|---|---|
| Public website | One self-contained `index.html` (markup+CSS+JS). Sections live and final: hero, Journey teaser, THE MOMENTS (4 stops incl. Pre Wedding Journey/Night Train + schematic route card), THE JOURNEY MAP (real Leaflet/OSM-data Esri basemap, six-stop loop), THE PLACES, ACCOMMODATION (generated from canonical data), DRESS GUIDE (24 owner images), THE WEEKEND IN ORDER, GOOD TO KNOW + flights block, NEXT STEPS, GUEST AREA teaser, footer. English only. |
| Individual invitation | Client-side gatefold box animation; the 8×8 plaque IS the opener; personalised via encrypted bundle; code = decryption key. "Open your invitation", "Visit the wedding website", ✕ close. No "Return to my journey" link (removed by owner order). |
| Guest Area | Authenticated single-page wizard in `register/`. Private nav: MY JOURNEY · MY TRAVEL · MY STAY · MY WEDDING · MY PROFILE · MY CONTRIBUTION + utility (INVITATION · WEBSITE · SAVE · LOG OUT). Public site nav hidden while authenticated; logo returns to MY JOURNEY. |
| Booking / registration flow | Three-level model (PRE-WEDDING / THE WEDDING / POST-WEDDING) per HSW-001-ED-FBSD-001 v1.3 + v1.5. One travel decision (train vs independent), dated itinerary, chaptered contribution, review, submission → REQUESTED → UNDER REVIEW → CONFIRMED. |
| Contribution system | USD master; EUR/THB display-only via frankfurter.dev with 6h cache and honest fallback; canonical values only in `register/data.mjs`; three verified scenario totals: Full Journey USD 1,056 · Regional USD 596 · Independent USD 310. |
| Travel architecture | Canonical: train USD 88/guest (26 FEB 2027, 20:25→06:45 (+1)); Nong Khai→Vientiane USD 55/guest (27 FEB); VTE→Kunming = FLIGHT China Eastern (no guest price); Kunming→Lijiang = TRAIN First Class only USD 145/guest (04 MAR); onward journey = guest choice. v1.5: train guests never see the shared shuttle; arrival and departure are separate decisions. |
| Accommodation architecture | 8 canonical Souphattra entries (7 hotel + Private Residence) — single source `ACCOMMODATIONS`, generator writes the public section; Pre-Wedding Bangkok = Elegant 6BR Sathorn Penthouse (GR-confirmed dates; known 21/22 FEB conflict); Post-Wedding stays Kunming/Lijiang = GR-confirmed arrangements (project costs never shown); Siam Kempinski = coordinated-return context only. |
| Wedding Programme | Alms Giving · Vow Ceremony · Wedding Dinner (final naming), 28 FEB 2027, Souphattra Heritage Vientiane; Vow mandatory (locked); per-event dress acknowledgement EN/DE/TH, never preselected; one shared programme per invitation. |
| Profile architecture | Per guest: email (required), phone + date of birth (optional), dietary preference, allergy yes/no + conditional kitchen detail (required on YES), 12 "A little about you" questions, profile photo (local), passport identity page (metadata only, on-device). Severe-handling + dislikes removed from UI (stored history preserved). |
| Invitation access architecture | Zero plaintext PII ships. `register/invitations.enc.json` = AES-256-GCM records keyed per invitation token (PBKDF2-SHA-256, 150k iterations). Token = 16-char base32 code from the letter or `/register/?invite=TOKEN`. Wrong/empty token → null, no oracle. |
| Deployment | Two targets from one `main`: Cloudflare Worker (static assets + POST `/api/register`) and GitHub Pages (static only, mailto submission path). Identical content by design except the API route (Pages has none — client falls back to mailto). |
| Public Release readiness | **CONDITIONALLY READY.** No functional blocker in the guest flow. P0 = submission durability hardening (§28-P0-1). Remaining: cross-window copy sign-off, final guest list + code generation (tooling ready), EN/DE/TH/JA implementation (not started, by mandate), open authoritative data (§30). |

---

## 2 · BOTH COMPLETE USER JOURNEYS

### FLOW A — PUBLIC WEBSITE (top-to-bottom production order, `index.html`)

| # | Section (id) | Exact heading / core line | Purpose | CTA → destination | Status |
|---|---|---|---|---|---|
| 1 | Hero | "see you in laos." wordmark · "Haruthai & Suthep" · "Sunday, 28 February 2027 · Vientiane, Laos" | Brand + date anchor | scroll | FINAL |
| 2 | Menu overlay | items: Journey · Stay · Wedding · Travel · Guest Area | Site navigation | anchors + `register/` | FINAL |
| 3 | Journey intro (`#journey` links) | "The rhythm of the Mekong." (Moments head) | Editorial opening | — | FINAL |
| 4 | THE MOMENTS (`#weekend`) — Stop 1 | "The Pre Wedding Journey" · "Friday, 26 Feb · 20:25 → 06:45" · body: "Special Express No. 25, First Class Sleeper. Bangkok slips away at 20:25; the night runs north for 10 hours and 20 minutes, and the Mekong arrives with the morning at Nong Khai, the last quiet stretch before Vientiane." · meta "Bangkok → Nong Khai · First Class Sleeper · Dress · Elegant Resort Wear" + schematic route card (SVG: BANGKOK–NONG KHAI rail, dashed cherry "across the Mekong" → VIENTIANE) | Night Train as public journey moment | — | FINAL |
| 5 | THE MOMENTS — Stops 2-4 | "The Alms Giving" / "The Vow Ceremony" / "The Wedding Dinner" with owner imagery | The wedding day | — | FINAL |
| 6 | THE JOURNEY MAP (`#journeymap`) | "Six stops, one journey." + real basemap; caption "Connections are drawn as schematic journey lines over the real map · Bangkok → Nong Khai by overnight train · Vientiane → Kunming and Lijiang → Bangkok by flight" | Geographic orientation (H&S master loop, dates 23 FEB–06 MAR) | pan/zoom only | FINAL |
| 7 | THE PLACES (`#places`) | "Where the celebration unfolds." — 4 dialog cards (stay/alms/vow/dinner) | Venue storytelling | opens `pv-*` dialogs | FINAL |
| 8 | ACCOMMODATION (`#rooms`) | "Where you wake up." — 8 room categories, galleries, availability overlays, REQUEST AVAILABILITY routing | Stay selection teaser (no public prices) | `register/?room=<id>` | FINAL (generated) |
| 9 | DRESS GUIDE (`#dresscode`) | 4 categories (Elegant Resort Wear / Lao Traditional Dress / vow / dinner Black Tie), 24 owner images, tap-to-open lightbox | Dress preparation | lightbox | FINAL |
| 10 | THE WEEKEND, IN ORDER (`#journey`) | "How the days unfold." — dated rows Fri 26 (train 20:25) → Sat 27 (arrival) → Sun 28 (Alms dawn / Vow Ceremony / Sunset Drinks & Wedding Dinner) | Chronology | `#portal` | FINAL (times "to be confirmed" pending owner) |
| 11 | GOOD TO KNOW (`#travel`) | "Good to know." — Your stay / Getting there / Weather / Visa & currency / Your contacts / Extend your journey + "The journey to Vientiane, and onward" flights block | Practical | mailto GR, SRT reference link | FINAL |
| 12 | AERIAL + NEXT STEPS (`#steps`) | "How to say yes." 4 steps | Conversion path | `register/` | FINAL |
| 13 | GUEST AREA teaser (`#portal`) | "The details find you." + 01–05 list + "This site answers 'what can I expect?' Your Guest Area answers 'what happens next?'" | Bridge to Guest Area | `register/` | FINAL |
| 14 | Footer (`#rsvp`) | "See you in Laos?" · CTA "join the journey" · GR contact | Final CTA | `register/`, mailto | FINAL |

Post-Wedding on the public site: present as dated onward block in Good to Know flights ("1 March Vientiane to Kunming · 4 March Kunming to Lijiang · 6 March Lijiang to Bangkok") and "Extend your journey" copy — intentionally no public pricing. Status: FINAL.

### FLOW B — INVITATION / GUEST AREA (`register/`)

| Step | Guest sees | Can select / must complete | Blocks Continue | Stored | Contribution / status effect |
|---|---|---|---|---|---|
| Personalised link `/register/?invite=TOKEN` | Box opens pre-personalised; plaque shows party name + code prefilled | — | — | token in memory; seen-flag `siyl.invitation.seen.<token>` | none |
| Manual entry | Plaque with code field on the box | valid 16-char code | invalid code → quiet error, no unlock | as above | none |
| Invitation plaque overlay | "Open your invitation" (plaque IS the opener), gatefold animation ≈2.5 s; controls: ✕ (top right) + "Visit the wedding website" | open or leave | — | `INV.userOpened` state machine (`data-inv`), reopen only via nav INVITATION (force) | none |
| Auth/session | private nav appears; public site nav hidden | — | — | draft `siyl.reg.draft.v2` (localStorage, this device) | — |
| Returning guest | same device: draft restored, LOG OUT keeps draft (auth-out flag); new device: fresh state after code | — | — | — | — |
| MY JOURNEY (`home`) | "Your journey, in order" dated itinerary + executive cards (stay/travel/wedding/profile/contribution/review) + GR card + next-step line | jump-in | never | — | reads all state |
| MY TRAVEL (`journey`) | Bangkok Journey module → ONE decision "How would you like to travel to Vientiane?" (Option A Overnight Train card w/ date/times/price/availability/gallery/animated ticket + berth prefs + train note inside; Option B "Arriving independently") → Bangkok stay (Sathorn Penthouse, GR dates) → arrival block ("27 FEB 2027 · 06:45 · Arrival Nong Khai" for train guests; transfer cards; "Need something different?") → "Your departure" (separate) → Post Wedding opt-in (5 components, tickets, onward choice) | one travel mode; optional transfers; optional PW join + onward | never (choices have valid defaults) | `g.journey.{bangkok,train,independent}`, `g.berth`, `S.trainNote`, `S.transfers[]`, `S.bangkokStay`, `S.postWedding{joined,onward}` | train 88×riders; transfer 55×riders; China train 145×guests when joined |
| MY STAY (`stay`) | chapter headers PRE-WEDDING / THE WEDDING (dominant, dated 27 FEB–01 MAR) / POST-WEDDING; compact room cards (image, name, contribution, availability, size/bed/guests) + VIEW DETAILS / HIDE DETAILS (one open at a time) + COMPARE (up to 3) + bed preference + special request | exactly one room request or waitlist | **yes** — no selection → Continue disabled | `S.stay{accommodationId,occupantGuestIds,waitlist,bed,request}` | per-guest room contribution (night one) |
| (Spa, flow-only step) | "A slower hour, if you like." — optional spa/massage request per guest | optional | never | `g.spa{requested,type,day}` | none (request only) |
| MY WEDDING (`events`) | participation line + three events (Vow locked mandatory) + per-event dress block (name, 3 images, note, EN/DE/TH acknowledgement checkbox) | acks for joined events | **yes** — missing ack for a joined event | `g.events{alms,ceremony,dinner}`, `S.dressAck{...}` | none |
| MY PROFILE (`each`) | per guest: names (fixed), email, phone, DOB, FOOD DIETARY & ALLERGIES (pref, allergy Y/N, conditional kitchen detail), A LITTLE ABOUT YOU (12), photo, passport | email; allergy detail when YES | **yes** — missing email or missing detail on YES | guest fields (photo/passport on-device only) | none |
| MY CONTRIBUTION (`cost`) | chapters 01 PRE-WEDDING / 02 THE WEDDING (dominant) / 03 POST-WEDDING with dated lines → TOTAL CONTRIBUTION → HOSTED FOR YOU → TO FINALIZE WITH GUEST RELATIONS; FX note when EUR/THB | currency via sticky bar | never | display currency `siyl.display.currency`, FX cache `siyl.fx.v1` | shows the one derived total |
| REVIEW | chaptered, dated, chronological summary of everything with Edit jump links; accuracy checkbox | confirm accuracy | **yes** — full `validateRegistration` on submit | — | same totals, same sources |
| Submission (`send`) | generated Guest Relations text; SEND (POST `/api/register`, fallback mailto) or Copy for LINE | one action | — | `S.submitted`, `registration_submitted_at` | status → REQUESTED / UNDER REVIEW |
| Received | "Thank you." + **Your journey is with Guest Relations** dated itinerary + WE'RE TAKING CARE OF + TO FINALIZE WITH GUEST RELATIONS | return to journey | — | — | UNDER REVIEW shown; CONFIRMED is a Guest Relations action, never implied by submission |

---

## 3 · COMPLETE LINK INVENTORY

| URL / route / anchor | Purpose | Access | Source | Behavior | Status |
|---|---|---|---|---|---|
| `https://seeyouinlaos-website.suthep-hrg.workers.dev/` | Production 1 (Worker) | public | `wrangler.jsonc` assets binding | serves repo root | FINAL |
| `https://seeyouinlaos.github.io/seeyouinlaos-website/` | Production 2 (Pages) | public | Pages auto-build from `main` | serves repo root | FINAL |
| `/register/` | Guest Area entry | public shell, private content | `register/index.html` | plaque + code | FINAL |
| `/register/?invite=TOKEN` | Personalised invitation link | private-by-token | `register/app.mjs` (URL param) | prefills + unlocks | FINAL |
| `/register/?room=<accId>` | Room-context deep link from public rooms | public→auth | `src/build-rooms.cjs` CTAs | scroll+highlight card after auth | FINAL |
| `/api/register` (Worker only) | Submission endpoint | POST, public | `src/worker.js` | KV store (when bound) + MailChannels forward; 503 → client mailto fallback | REVIEW (P0-1) |
| Anchors `#weekend #journeymap #places #rooms #dresscode #journey #travel #steps #portal #rsvp` | Section navigation | public | `index.html` | scroll | FINAL |
| `../` + `../#weekend/#places/#dresscode/#travel` | Guest Area → website returns | auth | `register/index.html` header | leave area (draft saved) | FINAL |
| `mailto:guest.relation.seeyouinlaos@gmail.com` | GR contact + mailto submission fallback | public | both surfaces | native mail | FINAL |
| `https://dticket.railway.co.th/...` | SRT route reference ("for reading only") | public/auth | data + index | external, `rel=noopener` | FINAL |
| `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,THB` | FX display rates | client fetch (auth area) | `register/app.mjs` loadRates | 6h cache; failure → USD | FINAL |
| `https://tile.openstreetmap.org/...` (fallback in code path history: none active) + `https://server.arcgisonline.com/.../World_Light_Gray_{Base,Reference}/...` | Journey-map tiles | public | `index.html` map init | attribution kept; map absent if unreachable | FINAL |
| `assets/images/{dress,train,journey,rooms,souphattra,alms,qr,timeline,hero,airbnb}/…` | Production imagery | public | asset dirs | see §20 | FINAL/REVIEW per §20 |
| `assets/vendor/leaflet/*`, `assets/vendor/{gsap,ScrollTrigger,SplitText}.min.js` | Vendored libraries | public | assets | no CDN dependency | FINAL |
| `build/standalone.html` | Offline single-file public site | repo only (not served — `.assetsignore: build`) | `src/build-standalone.cjs` | review artifact | FINAL |
| `journey/` (legacy PWA experiment) | not part of release | excluded from Worker (`/journey` in `.assetsignore`); still served by Pages | legacy dir | see §28-P2-4 | REVIEW |

No secret-bearing URL exists; invitation tokens appear only in guests' personal links and are never listed anywhere public.

---

## 4 · EXACT CURRENT WORDING INVENTORY — CRITICAL

Status legend: FINAL (owner-approved, do not touch) · REVIEW (windows 04/07 sign-off wanted) · NEEDS DECISION.
Nothing below was rewritten during this review.

### 4.1 Brand / hero (`index.html`)
- "see you in laos." (wordmark, lowercase + cherry dot) — FINAL
- "Haruthai & Suthep" — unbreakable lockup everywhere (owner hard rule) — FINAL
- "Sunday, 28 February 2027 · Vientiane, Laos" — FINAL
- Marquee: "to live — to love — to travel — to pray" — FINAL

### 4.2 The Moments / Pre Wedding Journey / route card (`index.html`)
- Eyebrow "The Moments" · H2 "The rhythm of the Mekong." — FINAL
- Stop 1 as quoted in §2 Flow A row 4 (heading, when-line, body, meta) — FINAL
- Route card labels: "SPECIAL EXPRESS NO. 25" / "10 HOURS 20 MINUTES · FIRST CLASS SLEEPER" / "across the Mekong" (serif italic) / "BANGKOK 20:25 · Krung Thep Aphiwat" / "NONG KHAI 06:45 · at the river" / "VIENTIANE the wedding" — FINAL

### 4.3 Journey Map (`index.html`)
- "The Journey Map" / "Six stops, one journey." — FINAL
- Popups: "Bangkok · 23 February 2027 · The journey begins" · "Nong Khai · 24 February 2027 · Overnight Train from Bangkok" · "Vientiane · 25 February 2027 · Across the border · the wedding" · "Kunming · 1 March 2027 · Flight from Vientiane" · "Lijiang · 4 March 2027 · Onward from Kunming" — FINAL (H&S master dates; guests' own dates live in the Guest Area — see §30 note)
- Caption as quoted in §2 — FINAL

### 4.4 Stay / rooms (public, generated)
- "Where you wake up." · intro paragraphs incl. "Souphattra Heritage Vientiane sits at the heart of our wedding stay…" — FINAL
- Hospitality stack: "First night · guest contribution" / "Second night · hosted by" / "Haruthai & Suthep" / "Breakfast included" — FINAL
- Availability overlays: "<n> of <n> available" / "Fully allocated" / "Reserved for Haruthai & Suthep" / "Reserved for the wedding family" — FINAL
- Noble Courtyard blurb (exact): "A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool." — FINAL
- Private Residence: "Alternative stay" badge · "Complimentary · limited availability" · CTA "Request this stay" — FINAL

### 4.5 Weekend / Good to Know (public)
- "How the days unfold." rows incl. "Overnight Sleeper Train · Special Express No. 25 · Bangkok → Nong Khai" (Fri 26, 20:25) — FINAL
- "the key moments are arranged for you · full timings follow in your Guest Area" — FINAL
- "Good to know." blocks as live; "Please wait for our green light before booking." — FINAL
- Event times "to be confirmed" — NEEDS AUTHORITATIVE DATA (owner timing)

### 4.6 Invitation / plaque (`register/index.html`, `register/app.mjs`)
- Plaque: party name + code field; button "Open your invitation" — FINAL
- Controls: ✕ close · "Visit the wedding website" — FINAL ("Return to my journey" removed by order)
- Invalid code: quiet non-oracle error state — FINAL

### 4.7 Private navigation
- "My Journey · My Travel · My Stay · My Wedding · My Profile · My Contribution" + utility "Invitation · Website · Save · Log out" — FINAL

### 4.8 MY TRAVEL (exact key strings)
- Intro: "The road to the wedding: Bangkok · the overnight train · Nong Khai · Vientiane · the wedding days." — FINAL
- Decision head: "Journey to Vientiane · one decision, two ways" / "How would you like to travel to Vientiane?" / "Choose the way that suits you — selecting one quietly sets the other aside." — FINAL
- Option A when-line: "26 FEB 2027 · 20:25 → 06:45 (+1) · Bangkok → Nong Khai → Vientiane · USD 88 per guest · <live seats>" · title "The Overnight Train" · body "Special Express No. 25 · departs Krung Thep Aphiwat Central Terminal 20:25, arrives Nong Khai 06:45 · 10 hours 20 minutes · First Class Sleeper. Guest Relations coordinates the journey and ticket arrangements; only guests who join are charged." · buttons "I'm joining" / "Joining the train" / full: "Join the waitlist" — FINAL
- Inside Option A (selected): "The night train, arranged around you" summary "<n> guests × USD 88 = USD <n>" · "<name> · sleeper preference" (Lower berth / Upper berth / No preference) · "We will do our best to arrange your preferred berth. Final allocation depends on railway availability." · "Anything that matters for the train journey (mobility, luggage, comfort)" · "You arrive at Nong Khai Railway Station; your onward journey to Vientiane is chosen below under your arrival. Route reference: State Railway of Thailand — for reading only, no booking needed." — FINAL
- Option B: "Your own way" / "Arriving independently in Vientiane" / "Fly or travel on your own schedule; we meet you there." / button "I'll arrive independently" — FINAL
- Arrival block (train guests): "27 FEB 2027 · 06:45 · Arrival Nong Khai" · "How would you like us to arrange your arrival?" · card "Nong Khai Station to Souphattra Heritage · USD 55 per guest · total USD <n>" · "Coordinated transfer after your train arrival — Guest Relations confirms the exact pickup details personally." · "Need something different?" — FINAL (v1.5)
- Shuttle (independent guests only): "Complimentary Shared Shuttle … Between Wattay International Airport / Vientiane railway station and Souphattra Heritage on arrival day. Guest Relations confirms your pickup time personally." — FINAL (v1.5; clock window removed)
- Departure block: "Your departure" / "Departure follows your actual onward itinerary — until then it stays with Guest Relations." / "To finalize with Guest Relations" / summary "Departure services" — FINAL (v1.5)
- Bangkok stay: chapter label "Pre-Wedding Journey · Optional · Before the wedding" · "Your Bangkok stay" · "Until 24 FEB 2027 · check-in confirmed personally by Guest Relations" · "Elegant 6BR Sathorn Penthouse" · "The shared Pre-Wedding home in Bangkok. Guest Relations confirms the dates and your arrangement personally." · "Guest Relations will confirm the arrangement" · CTA "Request this stay" — FINAL wording · date NEEDS AUTHORITATIVE DATA (21 vs 22 FEB, §30)
- Post Wedding: "Post-Wedding Journey · Optional · After the wedding" · "The Post Wedding Journey" · "Vientiane → Kunming → Lijiang → your onward journey · 1 – 6 March 2027" · "Haruthai & Suthep continue to Kunming and Lijiang after the wedding. If you would like to join the onward journey, we will prepare it with you." · join "We would love to join" / "Not this time" · component cards with dates; "USD 145 per guest" only on Kunming → Lijiang; stays/flights: "Guest Relations will confirm the arrangement" · onward: "Your onward journey" / "You may return to Bangkok, continue elsewhere, or arrange your own onward travel — every answer is a complete answer." / options "Return to Bangkok with us" · "I'll arrange my own onward travel" · "Request Guest Relations support" — FINAL
- Transfers footer: "Pickup and transfers are requests — statuses move from REQUESTED to UNDER REVIEW to CONFIRMED as Guest Relations coordinates them." — FINAL

### 4.9 MY STAY (auth)
- Chapter labels: "Pre-Wedding Journey · Optional · Before the wedding" / "The Wedding · Main Event · Vientiane · 27 FEB – 01 MAR 2027" / "Post-Wedding Journey · Optional · After the wedding" — FINAL
- Price note (exact): "For rooms at Souphattra Heritage Vientiane, the amount shown is your total contribution per guest for the confirmed two-night stay: the first night is your guest contribution; the second night is hosted by Haruthai & Suthep." + "Breakfast is included on both mornings. A limited number of complimentary alternative stays are also available." — FINAL
- Card CTAs: "View details / Hide details" · "Compare" · "Request this room" (hotel) · "Request this stay" (Private Residence) · "Join the waitlist" · selected "Requested · Guest Relations will confirm" — FINAL
- Request note: "This is a registration request. Guest Relations will confirm your arrangements separately." — FINAL

### 4.10 MY WEDDING
- Intro: "Join the moments that feel right for you. We simply want you there in the way that works best for you." — FINAL
- Events: "Alms Giving" (Lao Traditional Dress) · "Vow Ceremony" (Black Tie, locked "I'm joining") · "Wedding Dinner" (Black Tie) — FINAL
- Dress warning (exact): "The dress code is part of this moment and applies to all guests attending. Please make sure you are comfortable following it before confirming your attendance. Guests who are not dressed in accordance with the required attire may not be able to take part in this moment." — FINAL
- Acknowledgement (exact, trilingual block): "I have read and understand the dress code" + "Ich habe den Dresscode gelesen und verstanden · ฉันได้อ่านและเข้าใจข้อกำหนดการแต่งกายแล้ว" — FINAL
- Missing-ack line (review): "Dress code not yet confirmed — please confirm under My Wedding" — FINAL

### 4.11 MY PROFILE
- Section labels: "Food, dietary & allergies" → "A little about you" — FINAL
- Fields: "Email" · "Phone number · with country code" · "Date of birth" · "Dietary preference" (No restrictions / Vegetarian / Vegan / Pescatarian / Gluten free / Lactose free / Other) · "Any food allergies?" Yes/No · "Exactly what should the kitchens know?" — FINAL
- A little about you (all 12, exact): "What's your favourite food?" · "What's your favourite drink?" · "How do you like your coffee?" · "What tea do you love?" · "What's your favourite snack?" · "What's your favourite colour?" · "What flowers do you love?" · "What's a book you love?" · "What's a film you love?" · "What's a song you never skip?" · "What always makes you feel at home?" · "After a long day, what do you love to find waiting for you?" — FINAL
- Closing note: "These little preferences help Guest Relations shape quiet surprises. Nothing is ever displayed back." — FINAL
- Passport: "Passport · identity page" · "One photo or scan of the passport identity page is all we need. Used only where required for travel arrangements coordinated by Guest Relations." · selected: "<file> · selected" + "Held on this device only — the secure transfer to Guest Relations activates with the private document vault." — FINAL

### 4.12 MY CONTRIBUTION
- Intro: "Your contribution reads as your journey: what you pay, when it happens. Everything else is hosted for you." — FINAL
- Chapters: "01 Pre-Wedding Journey · OPTIONAL · BEFORE THE WEDDING" / "02 The Wedding · MAIN EVENT · VIENTIANE" (dominant) / "03 Post-Wedding Journey · OPTIONAL · AFTER THE WEDDING" — FINAL
- Line patterns (live examples): "26 FEB 2027 · Bangkok → Nong Khai · Overnight Sleeper Train · 2 × USD 88 · USD 176" · "27 FEB 2027 · Nong Khai Station to Souphattra Heritage · Coordinated Transfer · 2 × USD 55 · USD 110" · "27 February – 1 March 2027 · 2 nights · Noble Courtyard Suite · Vientiane · Peggy USD 240 · Steffie USD 240" · "04 MAR 2027 · Kunming → Lijiang · First Class Train · 2 × USD 145 · USD 290" — FINAL
- "Total contribution" — FINAL · "Hosted for you" header sub "The Wedding · 27 FEB – 01 MAR 2027 · with the love of Haruthai & Suthep" — FINAL
- Hosted list: Personal airport welcome and arrival coordination · Welcome drink on arrival · Breakfast on both mornings · Alms Giving · Vow Ceremony · Sunset Drinks & Wedding Dinner · Two hour beverage package · <room> night two · hosted · Departure coordination within the wedding programme — FINAL
- "To finalize with Guest Relations · Genuinely open arrangements · nothing here is charged" + per-line "Guest Relations will confirm the arrangement" — FINAL
- FX note: "Indicative exchange rate · updated <date, time> · Amounts are shown for orientation; the master currency remains USD." / offline: "Live rate unavailable · shown in USD" — FINAL
- Payment (exact): "No deposit is required. Once your arrangements are confirmed, you will receive an invoice with bank transfer or PayPal instructions. Payment is due within seven days. One person may settle the invoice for everyone travelling with them." — FINAL

### 4.13 Review / validation / submission
- Accuracy row: "We confirm this information is accurate. We understand this registration is a request and that Guest Relations confirms all arrangements separately." — FINAL
- Validation messages (exact, from `logic.mjs`): "please confirm the dress code for the <Event>" · "please tell the kitchens about <name>'s allergy under My Profile" · "contact details missing for <name>" · invitation-scope errors ("not in invitation", "one invitation requests exactly one room") — FINAL
- Received: "Thank you." · "Your registration has been received. Guest Relations will review your selections, availability and personal requirements…" · "Your journey is with Guest Relations" · "We're taking care of" body incl. "Statuses move from REQUESTED to UNDER REVIEW to CONFIRMED; nothing is booked until Guest Relations confirms it with you." · "To finalize with Guest Relations" — FINAL
- GR review promise (home): "Khun Ket and Khun Paddy personally review every detail, usually within 4–8 hours." — FINAL

### CURRENT PRODUCTION WORDING — EDITORIAL REVIEW (continuous, for windows 04 + 07)

> **Public spine.** see you in laos. — Haruthai & Suthep — Sunday, 28 February 2027 · Vientiane, Laos. The rhythm of the Mekong. The Pre Wedding Journey: Special Express No. 25, First Class Sleeper. Bangkok slips away at 20:25; the night runs north for 10 hours and 20 minutes, and the Mekong arrives with the morning at Nong Khai, the last quiet stretch before Vientiane. The Alms Giving — monks in saffron robes at first light, a quiet Buddhist ritual to open the wedding day with meaning. The Vow Ceremony — as the day softens: stillness, presence, and the vow made public in front of the people who matter most. The Wedding Dinner — sunset drinks beside the pool, then dinner in the courtyard garden. Lao food, music and celebration, together late into the night. Six stops, one journey. Where the celebration unfolds. Where you wake up. How the days unfold. Good to know. How to say yes. The details find you. See you in Laos?
>
> **Guest Area spine.** Which roads bring you to us? — How would you like to travel to Vientiane? The Overnight Train / Arriving independently in Vientiane: fly or travel on your own schedule; we meet you there. 27 FEB 2027 · 06:45 · Arrival Nong Khai. How would you like us to arrange your arrival? Need something different? Your departure follows your actual onward itinerary — until then it stays with Guest Relations. Your Bangkok stay: the shared Pre-Wedding home in Bangkok; Guest Relations confirms the dates and your arrangement personally. The Post Wedding Journey: Haruthai & Suthep continue to Kunming and Lijiang after the wedding — every answer is a complete answer. Where you wake up: the first night is your guest contribution; the second night is hosted by Haruthai & Suthep; breakfast on both mornings. Join the moments that feel right for you. We simply want you there in the way that works best for you. I have read and understand the dress code. Your contribution reads as your journey: what you pay, when it happens. Everything else is hosted for you. Hosted for you — with the love of Haruthai & Suthep. No deposit is required… Payment is due within seven days. One person may settle the invoice for everyone travelling with them. We confirm this information is accurate… Thank you. Your journey is with Guest Relations.

---

## 5 · INFORMATION ARCHITECTURE

- **Public top nav** (`index.html` menu overlay): Journey · Stay · Wedding · Travel · Guest Area. Mobile uses the same overlay (MENU button); no hamburger inside the Guest Area.
- **Guest Area header while signed out**: wordmark → `../`; public anchor nav visible; "Guest Area" marked current.
- **Guest Area while authenticated**: public nav hidden (`#sitenav[hidden]`); wordmark = home → MY JOURNEY; private nav exactly: MY JOURNEY · MY TRAVEL · MY STAY · MY WEDDING · MY PROFILE · MY CONTRIBUTION; utility group: INVITATION · WEBSITE · SAVE · LOG OUT (wraps on narrow widths).
- **Section ownership**: transports + transfers + Bangkok stay + Post-Wedding = MY TRAVEL. Wedding-room selection = MY STAY (with pre/post read-only chapter summaries). Events + dress = MY WEDDING. Personal data = MY PROFILE. Money = MY CONTRIBUTION.
- **Intentionally removed/consolidated**: separate MY TRANSFERS destination (folded into MY TRAVEL, HSW-001 v1.0 §10 — a one-day 7-item variant existed and was superseded); duplicate "Guest Area" tab; decorative red progress line; "Return to my journey" invitation link; per-event "One plan for all of us / different plans" chooser in MY WEDDING; Guest-Area geographic map (main website only); separate "night train, arranged around you" section (folded into Option A).
- **Flow-only step**: Spa & wellness sits between MY STAY and MY PROFILE in the linear Continue flow (no nav item). Deliberate low-key placement; see §28-P2-2.

---

## 6 · COMPLETE BOOKING WORKFLOW (stage table)

Invitation → Guest session → MY JOURNEY → MY TRAVEL → MY STAY → (Spa) → MY WEDDING → MY PROFILE → MY CONTRIBUTION → REVIEW → REQUESTED → UNDER REVIEW → CONFIRMED

| Stage | INPUT | LOGIC | VALIDATION | STORED | VISIBLE OUTPUT | NEXT | CONTRIBUTION EFFECT | STATUS EFFECT |
|---|---|---|---|---|---|---|---|---|
| Invitation | token (link/typed) | `lookupInvitation` → PBKDF2/AES-GCM decrypt | wrong token → null (no oracle) | seen-flag; in-memory invitation | personalised plaque, box opens | session | — | — |
| Guest session | — | `adoptInvitation` builds guests from bundle; draft restore | — | `siyl.reg.draft.v2` | private nav | MY JOURNEY | — | — |
| MY JOURNEY | none | `itinerarySteps()` from state | never blocks | — | dated itinerary + cards | any | reads totals | reads statuses |
| MY TRAVEL | one travel mode; berths; transfers; Bangkok stay; PW join + onward | mutual exclusivity; v1.5 shuttle rule; per-guest split (`S.partyPlans`) | none hard | journey/berth/trainNote/transfers/bangkokStay/postWedding | choice cards, tickets, arrival/departure blocks | MY STAY | 88·55·145 lines | REQUESTED chips |
| MY STAY | room request/waitlist; bed; request | inventory + `requestAllocation`; one room per invitation | Continue needs selection | `S.stay` | compact cards, compare, summary | Spa | night-one per guest | REQUESTED/WAITLISTED |
| Spa | optional wishes | — | never | `g.spa` | per-guest toggle | MY WEDDING | none | request only |
| MY WEDDING | attendance (shared) + acks | Vow locked true; acks per event | Continue needs acks of joined events | `g.events`, `S.dressAck` | trilingual ack rows | MY PROFILE | none | — |
| MY PROFILE | contact + dietary + about-you + docs | conditional allergy detail | Continue needs email + detail-on-YES | guest fields | two clean sections | MY CONTRIBUTION | none | — |
| MY CONTRIBUTION | currency only | one derivation (§11) | never | display prefs | 3 chapters + total + hosted + open | REVIEW | THE total | — |
| REVIEW | accuracy checkbox | full `validateRegistration` | submit blocked until clean | — | chaptered dated summary + Edit links | send | same total | — |
| Submission | send/copy | POST `/api/register` → fallback mailto | endpoint 503 → mailto | `S.submitted`, timestamp | GR text | received | frozen view | REQUESTED → UNDER REVIEW |
| UNDER REVIEW → CONFIRMED | Guest Relations (human) | outside the website | — | — | status copy everywhere | — | invoice per payment copy | CONFIRMED only by GR |

---

## 7 · TRAVEL SYSTEM

**Pre-Wedding chain (canonical, verified in `register/data.mjs` at baseline):**
Bangkok → Special Express No. 25 → Nong Khai → Vientiane.

- `TRAIN` (data.mjs:232): `date: '26 FEB 2027'`, `times: '20:25 → 06:45 (+1)'`, `capacityTotal: 8` guest seats, `contributionPerGuest: 88` ✓ USD 88 per guest.
- `nongkhai-vte` (data.mjs:268): `date: '27 FEB 2027'`, `pricePerUnit: 55`, `perGuest: true`, `direction: 'arrival'`, `fieldsFor: 'train'` ✓ USD 55 per guest.

**The single effective travel choice** — "HOW WOULD YOU LIKE TO TRAVEL TO VIENTIANE?" with exactly OPTION A — THE OVERNIGHT TRAIN and OPTION B — YOUR OWN WAY (`travelChoiceBlock`/`wireTravelChoice`, register/app.mjs):

- State keys: per guest `journey.train` and `journey.independent` (booleans) + `journey.trainWaitlist` when the 8 seats are full.
- Mutual exclusivity (two layers): the chooser writes `train = toTrain; independent = !toTrain` atomically, and the module-picker guard also clears the opposite flag — never both, never neither.
- Legacy-state normalization: `journeyLine`/review suppress "Independent arrival" whenever `train` is true, so old drafts can never display a contradictory pair.
- v1.5 rule: leaving the train also strips `fieldsFor:'train'` transfers from `S.transfers`, so Independent Arrival never silently charges the Nong Khai transfer; and `renderTransfers(trainy)` removes the shared shuttle from a train guest's world entirely.
- Derivations (all from the same keys): MY TRAVEL renders the chooser; MY JOURNEY builds `itinerarySteps()`; Review builds "Before the wedding / Journey to Vientiane / Arrival in Vientiane"; Contribution charges `riders × 88` and per-guest transfers `× riders`; the sticky bar reads the same totals. No parallel truth exists.

**Post-Wedding chain (canonical `POST_WEDDING`, data.mjs:316-333):** Vientiane → Kunming → Lijiang → onward.

| Leg | Type | Date | Detail | Guest contribution |
|---|---|---|---|---|
| vte-kmg | **Flight** | 01 MAR 2027 | China Eastern Airlines | none — "Guest Relations will confirm the arrangement" (project Actual USD 138.40 is internal, never shown) |
| kunming-stay | Stay | 01 – 04 MAR 2027 | MixC Branch · Solarium Bath Suite or Smart Family Room | none — GR confirms (project cost internal) |
| kmg-ljg | **Train** | 04 MAR 2027 | First Class Train · **First Class only** | **USD 145 per guest** ✓ (Owner-final; supersedes older 85/84.22) |
| lijiang-stay | Stay | 04 – 06 MAR 2027 | Snow Mountain Viewing Room | none — GR confirms |
| ljg-bkk | Flight (onward option) | 06 MAR 2027 | China Eastern · where applicable | none — onward journey is a choice |

Onward journey (`S.postWedding.onward`): `return` (with us, GR confirms; Siam Kempinski return-stay context shown) · `own` (complete answer) · `gr` (support requested) · unset → "To finalize with Guest Relations". Nothing invented; unconfirmed flight numbers/times are omitted.

---

## 8 · ACCOMMODATION SYSTEM

| Property | Role | Destination / dates | Contribution source | Guest Area output |
|---|---|---|---|---|
| Elegant 6BR Sathorn Penthouse | Pre-Wedding stay | Bangkok · "Until 24 FEB 2027 · check-in confirmed personally by Guest Relations" (21/22 FEB Master conflict — §30) | none (GR confirms) | request card in MY TRAVEL; summary rows in MY STAY/Review; TO FINALIZE in Contribution |
| Mandarin Oriental Bangkok / The Salil Riverside | **OBSOLETE** — removed placeholder options (no authoritative data/imagery ever existed); superseded by the real journey properties | — | — | none (documented for reviewers who saw earlier states) |
| Siam Kempinski Hotel Bangkok | Final/return Bangkok context only | shown inside onward-"return" option; Deluxe Balcony Room with King Bed; 3 owner images | none (GR confirms) | onward option detail |
| Souphattra Heritage Vientiane | THE WEDDING stay | 27 February – 1 March 2027 · 2 nights (STAY_WINDOW) | `ACCOMMODATIONS[].contributionPerGuest` | full selection system (below) |
| Private Residence (`airbnb-2br`) | Alternative stay | Downtown Vientiane · same window | `null` → "Complimentary · limited availability" | request card, CTA "Request this stay", GR-coordinated |
| Wanxiang Yueju Designer Homestay | Post-Wedding stay | Kunming · 01–04 MAR | none (GR confirms) | PW card + 3 owner images |
| Luye Baisha · Rizhao Jinshan | Post-Wedding stay | Lijiang · 04–06 MAR | none (GR confirms) | PW card + 3 owner images |

**Souphattra canonical room table** (single source `ACCOMMODATIONS`, register/data.mjs:100-205; the public section is GENERATED from this by `src/build-rooms.cjs` — no second description exists):

| id | Name | Size | Bed / occupancy | Inventory | Guest contribution (per guest, night one) | State |
|---|---|---|---|---|---|---|
| heritage | The Heritage | 31 sq.m. | 1 King · 2A+1C | 5 rooms | USD 145 | requestable |
| the-heritage | Heritage Executive | 37–44 sq.m. | King/twin · ≤2A+1C | 13 rooms | USD 155 | requestable |
| heritage-grand-premier | Heritage Grand Premier | 49 sq.m. | 1 King · 2A+1C | 3 rooms | USD 170 | requestable |
| noble-courtyard | Noble Courtyard Suite | 63 sq.m. | 1 King · 2A+1C | 1 room | USD 240 | requestable |
| grand-majestic-suite | Grand Majestic Suite | 66–75 sq.m. | 1 King · 2A+1C | 2 rooms | USD 250 | requestable |
| souphattra-majestic-suite | Souphattra Majestic Suite | 84 sq.m. | 1 King · 2A+2C | 1 | USD 290 (never charged) | **Reserved for Haruthai & Suthep** |
| souphattra-presidential | Souphattra Presidential | 118 sq.m. | 2 bedrooms · 4A+2C | 1 | USD 750 (never charged) | **Reserved for the wedding family** |
| airbnb-2br | Private Residence | sleeps 4 | up to 4 adults | 1 party allocation | null → Complimentary · limited availability | requestable |

Internal `contractRow`/selling values exist in the same records for Guest Relations reconciliation and are never rendered to guests (rates gate: `PUBLICATION.rates: 'APPROVED'`).

Model (exact): first night = guest contribution per guest × occupants; second night complimentary — hosted by Haruthai & Suthep; breakfast both mornings; TOTAL CONTRIBUTION PER GUEST = the shown amount for the confirmed two-night stay. One room per invitation (validated). Full inventory → "Join the waitlist" (`S.stay.waitlist`). Reserved suites render their reserved line and never enter selection. Carousel position ("1 / 3", top-right) and availability ("n of n available", bottom-left) are separate values in separate corners on both surfaces.

---

## 9 · WEDDING SYSTEM

| Event | id | Date / venue | Attendance rule | Dress code | Acknowledgement |
|---|---|---|---|---|---|
| Alms Giving | `alms` | Sunday, 28 February 2027 · Souphattra Heritage Vientiane (time with itinerary; temple announced later) | optional, one shared answer per invitation | Lao Traditional Dress (`dressGroup: tradition`) | required when joined |
| Vow Ceremony | `ceremony` | same day/venue | **mandatory** — radio locked "I'm joining", disabled semantics, handler guard, render normalization (`g.events.ceremony = true`) | Black Tie (`vow`) | **always required** |
| Wedding Dinner | `dinner` | same day/venue | optional, shared answer | Black Tie (`dinner`) | required when joined |

Keys: `g.events.{alms,ceremony,dinner}` (booleans, shared writes via party-level apply), `S.dressAck.{alms,ceremony,dinner}`. Validation: `validateRegistration` pushes "please confirm the dress code for the <label>" per joined-but-unacknowledged event (`ctx.events = EVENTS`); step gate mirrors it (Continue disabled). Review wording: "Joining · Dress code understood" / warning "Dress code not yet confirmed — please confirm under My Wedding" / "Not joining". Acknowledgement + warning copy: exact strings in §4.10 (EN main line, DE + TH compact second line). Never preselected.

---

## 10 · PROFILE SYSTEM

| Field | Key | Type | State | Validation | Review output | Persistence |
|---|---|---|---|---|---|---|
| Full/preferred name | `fullName`/`preferredName` | fixed from invitation | system | — | names everywhere | bundle + draft |
| Email | `email` | email input | REQUIRED per guest | step gate `includes('@')`; submit "contact details missing for <name>" | — (used by GR) | draft |
| Phone | `phone` | tel, intl placeholder | OPTIONAL | none | "Phone <value>" | draft |
| Date of birth | `dob` | date input | OPTIONAL | none | "Born <value>" | draft |
| Dietary preference | `diet` | select (7 options) | required-with-default | — | "Dietary preference · <value>" | draft |
| Any food allergies? | `allergy` | yes/no radios | required-with-default (no) | — | with detail below | draft |
| Kitchen detail | `allergyDetail` | textarea | CONDITIONAL (required when allergy=yes) | step gate + submit "please tell the kitchens about <name>'s allergy under My Profile" | "Allergy · <stored detail>" or "Allergy · None reported" — never a bare "allergy: yes" | draft |
| A little about you (12) | `favFood favDrink coffeeHow teaLove favSnack favColour favFlower bookLove favFilm favSong feelAtHome longDayWaiting` | text/textarea | OPTIONAL | none | not displayed back (by promise) | draft |
| Profile photo | `photo` | file → 256px JPEG dataURL | OPTIONAL | none | avatar only | device-local draft |
| Passport identity page | `passport {name,size,selectedAt}` | file select, METADATA ONLY | OPTIONAL | none | "<file> · selected" | device-local; never uploaded (vault pending) |
| Spa wish | `spa {requested,type,day}` | flow-step | OPTIONAL | none | "spa REQUESTED" | draft |

**Removed guest-facing fields** (HSW final 12-point pass): "Severe / needs special handling?" (`severe`) and "Foods you dislike" (`dislikes`) — UI, wiring and review suffix removed; historical stored values REMAIN in existing drafts and in `buildNotification`'s internal text (not guest-visible), by the do-not-destroy rule. Legacy answers `coffeeTea`/`sweetSavoury` are kept-but-never-asked by design comment.

---

## 11 · CONTRIBUTION + PAYMENT

- **USD master.** `money()` (logic.mjs) renders "USD n"; `displayMoney(usd, currency, rates)` converts for display only: EUR two decimals, THB rounded with thousands separator; without a usable rate it falls back to USD — never a fabricated value. Invoice/GR channel always USD.
- **FX**: `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,THB` (the `.app` host 301s its CORS away — documented). Cache `siyl.fx.v1` {EUR,THB,ts}, 6-hour refresh; preference `siyl.display.currency`; stamp "Indicative exchange rate · updated <d>, <hh:mm>"; offline → "Live rate unavailable · shown in USD".
- **Canonical transports verified at baseline**: Night Train **USD 88** p.p. · Nong Khai → Vientiane **USD 55** p.p. (perGuest) · China Train (Kunming → Lijiang) **USD 145** p.p., First Class only. Room contributions per §8 table. No other guest-payable travel amounts exist.
- **Derivations (one path each, logic.mjs)**: `trainContribution(TRAIN, riders)` = 88 × riders · `transfersTotal(catalog, selected, riders)` = perGuest ? unit × max(riders,1) : unit × units · `partyTotal(acc, occupants)` = per-guest × occupants (night one) · `postWeddingTotal(components, joined, guests)` = Σ perGuest·×guests else room-total (currently only 145 is payable) · grand total = `journeyTotal(...) + postWeddingTotal(...)` (+ `bkkTotal()` which is fixed 0 — Penthouse has no guest price). Independent Arrival: riders = 0 → no train line, and train-context transfers are removed from state (v1.5), so nothing charges.
- **Verified live scenario totals**: Full Journey 176 + 110 + 480 + 290 = **USD 1,056** · Regional **USD 596** · Independent **USD 310**.
- Surfaces: chaptered MY CONTRIBUTION (§4.12), sticky bar (two lines: YOUR JOURNEY · name + selections / TOTAL CONTRIBUTION + USD·EUR·THB switch + FX stamp), Review "Your Contribution" rows + "Total contribution", HOSTED FOR YOU list (no USD-0 rows), TO FINALIZE (never charged).
- **Payment wording** exact in §4.12: no deposit; invoice after confirmation; bank transfer or PayPal; seven days; group settlement by one person. Not a checkout — Guest Relations remains the human confirmation layer.
- Duplicated hardcoded financial values: none found in renderers (all amounts flow from `data.mjs`); display-only date strings ("27 FEB – 01 MAR 2027" chapter label) duplicate STAY_WINDOW phrasing — noted §28-P2-5.

---

## 12 · STATUS SYSTEM

- States: **REQUESTED → UNDER REVIEW → CONFIRMED** (plus WAITLISTED for full rooms, OPEN/COMPLETE as home-card hints — display-only).
- Source: statuses are *derived*, not a stored enum: any selection renders REQUESTED; submission (`S.submitted` + `registration_submitted_at`) renders "REQUESTED · UNDER REVIEW"; CONFIRMED is communicated by Guest Relations outside the site (endpoint response uses status `UNDER_REVIEW`).
- Display locations: option cards, transfer cards, stay summary/cards, sticky bar, itinerary, Review rows, received screen. Consumers: renderers only — no divergent state machines.
- Exact GR wording: "REQUESTED · Guest Relations confirms every detail with you personally" · "Requested · Guest Relations will confirm" · "Pickup and transfers are requests — statuses move from REQUESTED to UNDER REVIEW to CONFIRMED as Guest Relations coordinates them." · received-screen sentence in §4.13. Submission never implies supplier confirmation.

---

## 13 · VALIDATION SYSTEM

Two cooperating layers, one rule set:

**Step gate** (`stepValid(name)` + `updateNextState()`, register/app.mjs — Continue visible but truly disabled; re-evaluated on every render and every input via `saveDraft()` hook; click-handler guard prevents keyboard/enter bypass; `.btn[disabled]{pointer-events:none}`):
```js
function stepValid(name) {
  if (!S.invitation) return true;
  if (name === 'events') {           // dress ack required only when joining
    for (const e of EVENTS) { if (!e.dress) continue;
      const joined = e.id === 'ceremony' || S.guests.some((g) => g.events && g.events[e.id]);
      if (joined && !(S.dressAck && S.dressAck[e.id])) return false; }
    return true; }
  if (name === 'stay') return !!currentAcc() || !!S.stay.waitlist;
  if (name === 'each') return S.guests.every((g) =>
      (g.email || '').trim().includes('@') &&
      (g.allergy !== 'yes' || (g.allergyDetail || '').trim()));
  return true;                        // steps without hard requirements never block
}
```
Optional fields never block; conditional rules (allergy detail) trigger only when set to YES; returning to a step never wipes entries (state lives in the draft, renders read it).

**Submission** (`validateRegistration(reg, ctx)`, register/logic.mjs — same canon): invitation-scope checks (guests belong to invitation; exactly one room per invitation), contact ("contact details missing for <name>"), allergy gate (excerpt):
```js
for (const g of reg.guests || []) {
  if (g.attending !== false && g.allergy === 'yes' && !(g.allergyDetail && g.allergyDetail.trim())) {
    errors.push('please tell the kitchens about ' + (g.preferredName || 'each guest') + '\u2019s allergy under My Profile'); } }
// dress: per joined event with dress → 'please confirm the dress code for the ' + ev.label
```
plus the accuracy checkbox before `trySubmit()` passes. Travel needs no hard validation (defaults are valid; §12 v1.0: independent onward is a complete answer).

---

## 14 · GUEST DATA MODEL (actual implementation names; values redacted)

```js
// decrypted invitation payload (per token, from invitations.enc.json)
{ invitationId, partyName, partyLead /* guestId */, unresolvedMapping?,
  guests: [{ guestId, fullName, preferredName }] }

// client draft — localStorage 'siyl.reg.draft.v2' (device-local single source)
S = {
  invitation: { invitationId, token, partyName, partyLead, guests[] },
  guests: [{ guestId, fullName, preferredName, attending,
    email, phone, dob,
    journey: { bangkok, train, independent, trainWaitlist? },
    events: { alms, ceremony, dinner }, berth, spa: { requested, type, day },
    diet, allergy, allergyDetail, severe /*legacy*/, dislikes /*legacy*/,
    favFood…longDayWaiting (12), photo /*device*/, passport { name, size, selectedAt } }],
  stay: { accommodationId, occupantGuestIds[], rooms, waitlist, bed, request },
  transfers: [{ transferId, units, details{} }],
  bangkokStay: { property, from, to },            // dates GR-confirmed in v1.5 model
  postWedding: { joined, onward /* ''|own|gr|return */ },
  dressAck: { alms, ceremony, dinner },
  partyPlans, trainNote, additionalGuestRequest, notes,
  submitted?, registration_submitted_at }
```
`currentRegistration()` snapshots this (minus photos; passport → name/size only) as the submission payload; `buildNotification()` renders the GR text. Invitation-code relationship: `invitationId` is derived (`tokenId(token)` = SHA-256 of the lowercase token, salted label) — the code itself is never stored server-side.

---

## 15 · INVITATION CODE ARCHITECTURE

- **Where codes live**: nowhere in the repo. Guests hold them (letter / personal link). The deployed `register/invitations.enc.json` holds only `{ id, salt, iv, ct }` records.
- **Crypto** (`register/crypto.mjs`): `tokenId(token)` = SHA-256("siyl.id:" + lowercased token) → record lookup id; key = PBKDF2-SHA-256, 150,000 iterations, per-record salt → AES-256-GCM(iv) over the JSON payload. Wrong token: no matching id, or GCM auth failure → `null`. No plaintext PII ships; no error oracle; codes never appear in DOM/console/URLs beyond the guest's own `?invite=` link.
- **Sessions**: decrypt result lives in memory + draft; `siyl.invitation.seen.<token>` drives open-once behavior; LOG OUT sets an auth-out flag but preserves the draft; re-entry needs the code or personal link.
- **Bulk preparation utility — EXISTS**: `src/build-invitations.cjs` (`node src/build-invitations.cjs`). Inputs (gitignored-by-convention, verified NOT tracked): `src/guestlist.private.json` (parties/guests from the rooming sheet) + `src/invitation-tokens.private.csv` (token register; created on first run, reused thereafter so links stay stable). Output: `register/invitations.enc.json`. Tokens: 16-char base32, ≈80-bit random; personalised link `/register/?invite=TOKEN`.
- **Future final-code process (exact)**: (1) finalize `guestlist.private.json` from the approved list (§16 schema); (2) run the builder — existing tokens reused, new parties get fresh tokens appended to the CSV; (3) commit ONLY the regenerated `invitations.enc.json`; (4) deploy both targets; (5) Guest Relations mail-merges codes/links from the private CSV. No real production codes are reproduced in this document.

---

## 16 · FINAL GUEST LIST READINESS

Import schema = the actual `guestlist.private.json` party shape consumed by the builder:

| Field (actual name) | Maps to requested field | State |
|---|---|---|
| `invitationId` | invitation_id | SYSTEM GENERATED (derived from token via `tokenId`; do not hand-author) |
| `partyName` | partyName | REQUIRED (exact display string, e.g. "Peggy & Steffie") |
| `partyLead` | — (lead guest) | REQUIRED (guestId of lead) |
| `guests[].guestId` | guest_id | REQUIRED (stable slug per person) |
| `guests[].fullName` | first_name + last_name | REQUIRED (single display field by design) |
| `guests[].preferredName` | — | REQUIRED (used in every personal sentence) |
| email / phone / date_of_birth | — | DO NOT PREPOPULATE — guests enter these themselves in MY PROFILE |
| guest_count | — | SYSTEM (length of `guests[]`) |
| travel_default / stay_default / wedding_default | — | DO NOT PREPOPULATE — defaults are code-level (independent=true; alms/ceremony/dinner=true; no room) |
| `invitation_code` | invitation_code | SYSTEM GENERATED (token CSV; never in the JSON) |
| personalized_link | personalized_link | SYSTEM GENERATED (`/register/?invite=<token>`) |
| status | status | SYSTEM (derived lifecycle; nothing to import) |
| `unresolvedMapping` | — | OPTIONAL (true = "part of your invitation is still being prepared" note) |

Sequence approved list → production access: finalize JSON → run builder → review CSV diff (new tokens only) → commit `invitations.enc.json` → deploy → distribute letters/links. **Readiness: READY (tooling + schema proven by the current production bundle); waiting only on the final approved list.** No guests or codes were generated in this review.

---

## 17 · TECHNICAL ARCHITECTURE / CODE MAP

| Path | Responsibility | Consumers | Key exports/objects | Truth/generated | Change risk |
|---|---|---|---|---|---|
| `index.html` | Entire public site (markup, CSS, JS incl. journey map, lightboxes, dialogs) | browsers | ROOMS:START/END generated block | source + one generated region | HIGH (hand-edited monolith) |
| `register/index.html` | Guest Area shell: steps, plaque/box, all Guest-Area CSS | browsers | step sections, `#privnav`, `#summary` | source | HIGH |
| `register/app.mjs` (~1,900 lines) | All Guest-Area behavior: state, renderers, choice logic, tickets, validation gates, currency, submission | browser | `S`, renderers per step, `stepValid`, `travelChoiceBlock`, `itinerarySteps`, `renderSummary` | source of behavior | HIGH |
| `register/data.mjs` | **Canonical data**: WEDDING, EVENTS, ACCOMMODATIONS, TRAIN, TRANSFERS, BANGKOK_STAYS, RETURN_STAY, POST_WEDDING, COPY, PUBLICATION, CONTACTS | app, logic, build-rooms, tests, gates | all constants | **single source of truth** | CRITICAL |
| `register/logic.mjs` | Pure business logic: pricing, totals, money/displayMoney, validation, notification, inventory, invitation state machine | app, worker (notification format), tests | `journeyTotal`, `postWeddingTotal`, `validateRegistration`, `buildNotification`, `nextInvitationState` | source of truth | CRITICAL |
| `register/crypto.mjs` + `register/invitations.enc.json` | Token crypto + encrypted guest bundle | app, build-invitations | `tokenId`, `encrypt/decryptInvitation` | bundle GENERATED by builder | CRITICAL (security) |
| `src/worker.js` | Cloudflare Worker: assets + POST `/api/register` (KV when bound + MailChannels forward) | Cloudflare | `handleRegister` | source | HIGH (P0-1) |
| `src/build-rooms.cjs` | Generates public ACCOMMODATION section from data.mjs | index.html region | `npm run build:rooms` | generator | MEDIUM |
| `src/build-invitations.cjs` | Guest list → encrypted bundle + token register | release ops | — | generator | CRITICAL (ops) |
| `src/build-standalone.cjs` → `build/standalone.html` | Offline single-file public site | reviewers | `npm run build:standalone` | generated | LOW |
| `src/release-check.cjs` | 15 owner release gates (QR/LINE, imagery, availability, wording, pricing, legacy exclusion) | CI-by-hand | `node src/release-check.cjs` | guard | MEDIUM |
| `test/registration.test.mjs` + `test/fixtures.mjs` | 72 unit tests over logic/data/crypto | `npm test` | — | guard | MEDIUM |
| `assets/…` | fonts, vendor libs (gsap/ScrollTrigger/SplitText, Leaflet), all imagery | both surfaces | — | owner assets | see §20 |
| `wrangler.jsonc`, `.assetsignore` | Worker config; deploy exclusions (`build`, `src`, `test`, `.claude`, `/journey`, `*.md`, privates) | wrangler | — | config | HIGH |
| `_config.yml` | GitHub Pages (no Jekyll processing surprises) | Pages | — | config | LOW |
| `src/guest-relations-view.html`, `src/dev-editor-server.cjs`, `src/editor/*` | Internal GR/dev tooling, never deployed (src excluded) | owner | — | tooling | LOW |
| `journey/`, `dist/`, `docs/…` | Legacy PWA experiment; built worker artifacts; project docs | — | — | legacy/artifacts | see §28 |

## 18 · CRITICAL CODE EXCERPTS

**Travel selection + mutual exclusivity** — `register/app.mjs`, `wireTravelChoice` (in: click A/B + who; out: normalized journey flags; deps: S, TRANSFERS, inventory):
```js
const apply = (g) => {
  g.journey.train = toTrain;               // one effective choice —
  g.journey.independent = !toTrain;        // never both, never neither
  if (toTrain && trainFull) g.journey.trainWaitlist = true; };
…
if (!S.guests.some((g) => g.journey.train)) {          // v1.5: leaving the train
  S.transfers = (S.transfers || []).filter((x) => {    // drops its Nong Khai transfer
    const t = TRANSFERS.find((y) => y.id === x.transferId);
    return !(t && t.fieldsFor === 'train'); }); }
```

**Transfers / v1.5 shuttle rule** — `renderTransfers(trainy)`:
```js
const pool = TRANSFERS.filter((t) => !(trainy && t.id === 'shuttle-shared'));
const arrivals   = pool.filter((t) => t.direction === 'arrival');
const departures = pool.filter((t) => t.direction === 'departure');
const primaryIds = trainy ? ['nongkhai-vte'] : ['shuttle-shared'];
```

**Canonical transport pricing** — `register/data.mjs` (values quoted in §7; single definitions, no renderer duplicates).

**Contribution calculation** — `register/logic.mjs`:
```js
export function transfersTotal(catalog, selected, riderCount) { … sum += t.perGuest
  ? t.pricePerUnit * Math.max(riderCount || 0, 1) : t.pricePerUnit * (s.units || 1); }
export function journeyTotal(acc, occ, train, riders, cat, sel) {
  return partyTotal(acc, occ) + (trainContribution(train, riders) || 0)
       + transfersTotal(cat, sel, riders); }
export function postWeddingTotal(components, joined, guestCount) {
  if (!joined) return 0; const g = Math.max(guestCount || 0, 1);
  return components.reduce((a, c) => a + (c.contribution || 0) * (c.perGuest ? g : 1), 0); }
```

**Currency conversion** — `register/logic.mjs::displayMoney` + `app.mjs::loadRates/fxStamp` (frankfurter.dev, 6h cache, USD fallback; excerpted logic in §11).

**Validation** — `stepValid` + allergy/dress excerpts in §13.

**Wedding attendance (mandatory Vow)** — module def `locked: e.id === 'ceremony'` + `wireModulePicker` guard `if (f === 'events' && modId === 'ceremony') return;` + render normalization `S.guests.forEach((g) => { g.events.ceremony = true; })`.

**Dress acknowledgements** — `[data-ack]` change handler: `S.dressAck[id] = el.checked` ("never preselected; the guest confirms actively").

**Guest schema** — §14 (from `adoptInvitation` + `freshState`).

**Invitation validation / session** — `register/crypto.mjs::decryptInvitation` (returns null on any failure) + `lookupInvitation(token)` over the enc bundle + `nextInvitationState` machine (userOpened invariant: a user-closed invitation never auto-reopens; reopen only via explicit force).

**Status + final submission** — `trySubmit()` (accuracy checkbox → `validateRegistration` → error list) and `src/worker.js::handleRegister`:
```js
if (env.REG_KV) { await env.REG_KV.put(key, JSON.stringify(record)); stored = true; }
const r = await fetch('https://api.mailchannels.net/tx/v1/send', { … to GR_EMAIL … });
mailed = r.ok;
if (!stored && !mailed) return json({ ok:false, error:'submission channels unavailable' }, 503);
return json({ ok:true, status:'UNDER_REVIEW', stored, mailed, submittedAt }, 202);
```

## 19 · SOURCE OF TRUTH MAP

| DATA / DECISION | CANONICAL SOURCE | READ BY | WRITTEN BY | FALLBACK | DUPLICATION RISK |
|---|---|---|---|---|---|
| Guest identity / partyName | `invitations.enc.json` (from private guest list) | app via token | `build-invitations.cjs` | — | none |
| Invitation code | guest's letter/link only | crypto lookup | token CSV (private) | — | none (never stored in repo) |
| Session/draft | `siyl.reg.draft.v2` | all renderers | all inputs | fresh state | device-local by design |
| Train / Independent | `g.journey.train/independent` | travel, itinerary, review, totals | `wireTravelChoice` | defaults independent | none (normalized) |
| Nong Khai transfer + USD 55 | `TRANSFERS[nongkhai-vte]` | all surfaces | — | — | none |
| China train + USD 145 | `POST_WEDDING[kmg-ljg]` | all surfaces | — | — | none |
| Train USD 88 / seats | `TRAIN` | all surfaces + gate P4 | — | — | none |
| Stay / room contributions | `ACCOMMODATIONS` | public generator + Guest Area + tests | — | — | none (public generated) |
| Wedding attendance / dress ack | `g.events` / `S.dressAck` | events, review, validation | module picker / ack rows | — | none |
| Profile / allergy / passport | guest object | profile, review, notification | profile inputs | — | none |
| Display currency + FX | `siyl.display.currency` + `siyl.fx.v1` | money() wrapper | switcher + loadRates | USD | none |
| Total contribution | `journeyTotal + postWeddingTotal (+bkkTotal=0)` | cost, sticky, review | — | — | **low** — three call sites compose the same sum (flagged §28-P2-5) |
| Registration status | derived + `S.submitted` | all status chips | trySubmit/showReceived | — | none |
| Wedding dates/window | `STAY_WINDOW`, `EVENTS.when`, TRAIN.date | everywhere | — | — | **low** — chapter-label date strings restate the window (§28-P2-5) |

Competing truths found: none functional. Two cosmetic restatements flagged above.

---

## 20 · IMAGE / ASSET INVENTORY (major visible production assets)

| Path | Usage | Subject / source | Dimensions / state | Rights | Status |
|---|---|---|---|---|---|
| `assets/images/train/train-01.jpg` | Public Moments stop + Option A gallery | Mekong crossing at sunset — owner Drive | 1440×1200 (sky-cropped this release) | owner | FINAL |
| `assets/images/train/train-03.jpg` | Option A gallery | Friendship Bridge — owner print, white polaroid frame REMOVED | 2093×2776 | owner | FINAL |
| `assets/images/train/train-04.jpg` | Option A gallery | train through green cutting — owner Drive | 1440×1920 | owner | FINAL |
| `assets/images/train/srt-sleeper-cabin.jpg` | legacy (no longer rendered) | SRT cabin | 600×399 low-res | unclear | OBSOLETE (P2) |
| `assets/images/dress/{resort,tradition,vow,dinner}-01..06.jpg` | Dress Guide + acks | 24 owner-approved references; `resort-04` locally 2× enhanced (1762×2200) | mixed ~1100px | owner-approved | FINAL |
| `assets/images/journey/kempinski-01..03.jpg` | onward-return context | Siam Kempinski — owner Drive folder | 1600×916 / 1439×1779 / 3181×2000 | owner | FINAL |
| `assets/images/journey/kunming-01..03.jpg` | PW Kunming stay | Wanxiang Yueju — owner Drive | ~1415×1040 | owner-saved listing photos | FINAL |
| `assets/images/journey/lijiang-01..03.jpg` | PW Lijiang stay | Luye Baisha — owner Drive | ~1416×945; **small Trip.com watermark top-right** | owner-saved listing photos | REVIEW (P1-3) |
| `assets/images/souphattra/…`, `assets/images/rooms/…` (24), `assets/images/alms/…`, `assets/images/timeline/tl-alms.jpg`, `assets/images/hero/img-hero.*` | venue, room galleries, moments, hero | owner/official hotel sets | production-cropped | owner/official | FINAL |
| `assets/images/qr/line-qr-official.png`, `whatsapp-qr-official.png` | GR contact codes | OWNER ORIGINALS, hash-verified by gate P6 | as supplied | owner | FINAL — NEVER touch |
| `assets/images/airbnb/airbnb-01..03.jpg` | Private Residence | owner-supplied | production | owner | FINAL |
| Sathorn Penthouse | Pre-Wedding stay card | **no imagery exists in repo/Drive-ingest** | — | — | NEEDS CONTENT (P1-4) |
| `assets/images/hero/wide-aerial.*` | unreferenced | legacy aerial | 2560×1440 | official | OBSOLETE (unused, P2) |

No new imagery was downloaded for this review.

## 21 · EXTERNAL SERVICES / DEPENDENCIES

| Service | Purpose | Config | Failure behavior | Release risk |
|---|---|---|---|---|
| frankfurter.dev (ECB) | EUR/THB display rates | URL in `app.mjs` | cache → USD fallback + honest note | LOW |
| Esri World Light Gray tiles | public journey-map basemap | `index.html` | map tiles absent; page unaffected | LOW (keyless; attribution kept) |
| MailChannels (`api.mailchannels.net`) | Worker → GR forwarding | `src/worker.js` | `mailed=false` → 503 → client mailto | **HIGH — P0-1** (service now generally requires account/DKIM; likely failing silently to fallback) |
| Cloudflare Workers + (optional) KV | hosting + `/api/register` + durable store | `wrangler.jsonc` (REG_KV **not bound**) | without KV: no durable server record | HIGH — same P0-1 |
| GitHub Pages | second production target | repo settings (`_config.yml`) | static only; endpoint 404 → mailto path | LOW |
| Google Fonts (Hanken Grotesk) | public+register typography | `<link>` both HTMLs | system fallback | LOW (multilingual note §26) |
| Self-hosted: PP Editorial Old, Cormorant Garamond?, gsap/ScrollTrigger/SplitText, Leaflet | brand serif + animation + map | `assets/fonts`, `assets/vendor` | none (local) | LOW |
| Google Drive | asset SOURCE only (owner folders) | not a runtime dependency | — | NONE at runtime |

## 22 · BOTH DEPLOYMENT FLOWS

**Cloudflare Worker** — URL 1. `npx wrangler deploy` from `main` working tree; `wrangler.jsonc` binds the repo root as static ASSETS with `.assetsignore` exclusions (`build`, `src`, `test`, `dist`, `.claude`, `/journey`, `*.md`, privates); `src/worker.js` serves assets and handles POST `/api/register`. Current deployed version at review: `462c248e…`. Only target with the submission endpoint.

**GitHub Pages** — URL 2. Automatic "pages build and deployment" on every push to `main` (no custom workflow; `_config.yml` present). Serves the raw repo (including `/journey` legacy dir and `docs/` — Pages has no `.assetsignore`). Latest build at review: success.

**Identity**: both serve identical guest-facing content by design; divergences: (a) `/api/register` exists only on the Worker — Pages guests submit via the mailto path (by design); (b) Pages additionally exposes repo extras the Worker hides (`/journey`, markdown docs) — see §28-P2-4. Deploys are manual (wrangler) + automatic (Pages) from the same commit; keep pushes and wrangler deploys paired.

## 23 · MOBILE REVIEW (rendered, 375×812 unless noted; targeted re-checks at baseline)

| Screen / component | Evidence | Severity | File | Correction |
|---|---|---|---|---|
| Private nav utility row | previously "Log out" clipped at 375px — FIXED this cycle (`flex-wrap`), re-verified inside viewport | resolved | register/index.html | — |
| Sticky TOTAL CONTRIBUTION bar | two-line, 104px, never covers actions (wrap padding ≥140px); currency buttons tappable | OK | register/index.html | — |
| Journey map (public) | 5 labels, zero overlaps, all inside canvas at 375px; nothing cropped; page never scrolls horizontally (marquee is the only by-design wide track, body overflow hidden) | OK | index.html | — |
| Haruthai & Suthep lockup | `.hs` block + NBSP inline exception — verified single-line at 375px across surfaces | OK | both | — |
| Contribution rows | date/amount wrap as units; long GR date-note wrap fix verified (was 511px overflow, now clean) | resolved | register/index.html | — |
| Compare-rooms table | scrolls inside `.cmp-scroll`, page clean at 375px | OK | register | — |
| Forms (date/tel/checkbox/ack) | native inputs, 32px+ hit areas, trilingual ack wraps cleanly | OK | register | — |
| 320px width | not exhaustively re-run this cycle; spot checks fine | P2 note | — | include in final device pass (§28-P2-6) |

## 24 · COPY + HUMAN QUALITY (search performed; nothing silently edited)

| Occurrence | Location | Severity | Correction (proposed only) |
|---|---|---|---|
| "party" | zero guest-facing occurrences (internal `partyName`/`partyLead`/`.party-*` identifiers exempt by rule) | — | — |
| Hyphenated guest copy | policy-clean; owner-set exceptions live: "confirmed two-night stay", "Pre-Wedding/Post-Wedding" chapter labels (ED-mandated), brand "Mercedes-Benz" | OK | none |
| "Sunset Drinks & Wedding Dinner" vs "Sunset drinks, cake reception…" | timeline & hosted list use approved editorial combination | OK | — |
| Placeholder/debug text | none found in rendered surfaces (grep: lorem/TODO/TBD/console leftovers) | — | — |
| "to be confirmed" | event times (public weekend + events data) — sanctioned pending owner timing | NEEDS DATA | fill when owner confirms times |
| Legacy internal comments naming superseded §-numbers | code comments only, not guest-facing | P2 | optional cleanup |
| Duplicate wording | "Guest Relations will confirm the arrangement" intentionally repeated as the canonical open-state line | OK (by design) | — |

## 25 · CURRENT GUEST WORKFLOW — NONTECHNICAL REVIEW

An invited household receives a letter with a personal code (or a personal link). Opening the link shows their invitation box; the paper plaque carries their names and the code, and the plaque itself opens the invitation. From there they can visit the wedding website or enter their private Guest Area.

Inside, everything is written to them personally. **My Journey** shows their whole trip in date order — one glance tells them where they will be on each day. **My Travel** asks one real question: how would you like to travel to Vientiane — the overnight train with us, or your own way? Choosing one quietly sets the other aside. Train guests see their night on Special Express No. 25 (26 February, 20:25 to 06:45 the next morning), can note a sleeper preference, and see that on arrival in Nong Khai a car to the hotel is arranged for USD 55 per person — Guest Relations confirms the exact pickup after the train arrives. Guests arriving on their own simply tell us so; we meet them in Vientiane. The Bangkok days before, and the journey on to Kunming and Lijiang after, are open invitations — joining is one tap, and anything without a fixed price says plainly that Guest Relations will confirm the arrangement.

**My Stay** shows the rooms at Souphattra Heritage with honest availability. The first night is the guest's contribution; the second night is hosted by Haruthai & Suthep, with breakfast on both mornings. One room per invitation; if a room is full, there is a waitlist. **My Wedding** lists the three moments of 28 February — Alms Giving, Vow Ceremony, Wedding Dinner. The Vow Ceremony is the one moment everyone attends. Each moment shows its dress code with photographs, and guests tick that they have read and understood it (the line is also there in German and Thai). **My Profile** collects what the kitchens and hosts need: contact details, dietary preference, allergies (with detail whenever the answer is yes), and twelve small personal questions that shape quiet surprises — never displayed back.

**My Contribution** reads like the trip itself: before the wedding, the wedding, after the wedding — each line with its date and amount, then one total, then everything hosted for you, then the few things still being finalized with Guest Relations. Prices can be viewed in EUR or THB for orientation; the real currency is USD. Nothing is paid on the website: no deposit; an invoice follows once arrangements are confirmed, payable within seven days, and one person may settle for the whole household.

**Review** shows the entire journey on one page with edit links; the guest confirms the information is accurate and sends. The registration is a request: it goes to Guest Relations (Khun Ket and Khun Paddy), statuses move from REQUESTED to UNDER REVIEW to CONFIRMED, and nothing is booked until they confirm personally. The confirmation page repeats the whole dated journey, what we are taking care of, and what still needs a short conversation. Everything stays saved on the guest's device; returning with the same code shows their journey exactly as they left it.

---

## 26 · MULTILINGUAL READINESS — REVIEW ONLY (no translation performed)

**Current state**: English-only product. The single deliberate multilingual element is the trilingual dress acknowledgement (EN + DE + TH) in `register/app.mjs`. All other guest-facing strings are hardcoded in four places:

| Source file | Hardcoded string classes |
|---|---|
| `index.html` | every public heading/body/CTA/alt text/map labels/captions |
| `register/index.html` | step eyebrows/H2s, stepnav buttons (Back/Continue), plaque copy, section chrome |
| `register/app.mjs` | ALL dynamic guest copy: nav labels, choice cards, transfer/PW cards, itinerary lines, chapter labels, contribution lines, statuses, announcements (aria-live), confirmation |
| `register/logic.mjs` | validation error sentences, notification labels |

**Proposed key architecture** (assessment only): centralize into a `STRINGS`/`t(key, vars)` layer with namespaces `nav.*, invitation.*, journey.*, travel.*, stay.*, wedding.*, profile.*, contribution.*, review.*, validation.*, status.*, payment.*, common.*` — data-driven labels (EVENTS, TRANSFERS names, COPY) should localize inside `data.mjs` records (`label: {en, de, th, ja}`) to keep the single-source rule.

**Format risks to plan for**: dates are hand-formatted English strings ("26 FEB 2027", "Sunday, 28 February 2027") — need per-locale formatting or locale-frozen editorial dates (recommend the latter for stationery consistency); `money()` prefixes "USD " — acceptable across locales; THB/EUR conversions already locale-safe.

**Typography / script support**: body font Hanken Grotesk has no Thai or Japanese glyphs; TH/JA will fall back to system fonts — acceptable on iOS, must be reviewed on Android; serif lockups (PP Editorial Old / Cormorant) are Latin-only → keep names/wordmark Latin in all locales (owner lockup rule already implies this). Thai line-breaking (no spaces) needs `word-break: normal` + tested wrapping on the ack line (already wraps cleanly); Japanese adds ~10–30% width on buttons ("I'll arrive independently") — audit `btn sm` widths; German expands ~20–35% ("Ich habe den Dresscode …" already proves the layout tolerates it). Status vocabulary (REQUESTED/UNDER REVIEW/CONFIRMED) must be translated ONCE and mapped, not per-surface. Accessibility labels (aria-labels on radiogroups, map regions, galleries) are English-only and must join the key layer.

**Readiness verdict: NEEDS TRANSLATION** — architecture is centralizable with moderate effort (one extraction pass over the four files above); no blocking technical obstacle identified.

## 27 · PUBLIC RELEASE READINESS MATRIX

| Area | Status |
|---|---|
| Public Website | READY |
| Invitation (plaque/box/access) | READY |
| Guest Area Navigation | READY |
| MY JOURNEY | READY |
| MY TRAVEL | READY |
| MY STAY | READY |
| MY WEDDING | READY (event times NEEDS AUTHORITATIVE DATA — display-only) |
| MY PROFILE | READY |
| MY CONTRIBUTION | READY |
| Booking Workflow (submit channel) | **NEEDS FINAL CORRECTION** (P0-1 durability) |
| Guest List | NEEDS CONTENT (final approved list; tooling READY) |
| Invitation Codes | READY (generator + register proven; run against final list) |
| Multilingual | NEEDS TRANSLATION |
| Mobile | READY (320px device pass = P2 polish) |
| Images | NEEDS FINAL CORRECTION (Lijiang watermark P1-3) / NEEDS CONTENT (Penthouse P1-4) |
| Deployment | READY (with P0-1 caveat on the Worker endpoint) |

## 28 · FINAL ISSUE REGISTER

### P0 — MUST FIX BEFORE PUBLIC RELEASE
| ID | Screen/Component | Problem · Evidence · Why | Correction | File | Risk | Owner lens | Status |
|---|---|---|---|---|---|---|---|
| P0-1 | Submission channel (`/api/register`) | No durable server-side record is guaranteed: `REG_KV` is NOT bound in `wrangler.jsonc` (code path exists, `stored=false`), and the MailChannels free relay used for forwarding has been generally discontinued/DKIM-gated — `mailed` likely false in production, so the endpoint returns 503 and every registration depends on the guest completing the mailto fallback. Evidence: `src/worker.js` lines 49–85; wrangler.jsonc has no KV binding; client fallback verified. A missed mail = silently lost registration. | Bind a `REG_KV` namespace (owner step already documented in code comment / docs/RELEASE-GATES.md) AND either verify MailChannels with domain lockdown/DKIM or swap the forward to a supported channel (e.g. Resend with a secret). Re-test POST returns `stored:true`. | `wrangler.jsonc`, `src/worker.js` | LOW (config + one fetch swap) | MASTER + DIGITAL | OPEN |

### P1 — SHOULD FIX BEFORE PUBLIC RELEASE
| ID | Screen/Component | Problem | Correction | File | Risk | Lens | Status |
|---|---|---|---|---|---|---|---|
| P1-1 | GR notification text | `buildNotification` predates the journey extension: the human-readable GR summary omits Bangkok stay, Post-Wedding join/onward choice, phone and DOB (the JSON payload contains them; the text GR actually reads does not). Evidence: no `postWedding/bangkokStay/dob` references in logic.mjs notification section. | Append PRE/POST journey + contact lines to the notification builder; extend tests | `register/logic.mjs` | LOW | INVITATION/GUEST EXPERIENCE | OPEN |
| P1-2 | Sathorn Penthouse dates | Known 21 vs 22 FEB 2027 Master conflict — correctly routed to GR, but must be resolved before letters print | Owner decision → update `dateNote` | `register/data.mjs` | NONE | MASTER | OPEN (authoritative data) |
| P1-3 | Lijiang stay gallery | All three owner-saved photos carry a small "Trip.com" watermark (top-right) — rights/polish concern on a premium surface | Owner supplies clean originals, or approve as-is | `assets/images/journey/lijiang-0*.jpg` | NONE | STATIONERY/VISUAL + MASTER | OPEN |
| P1-4 | Sathorn Penthouse card | No imagery exists for the Pre-Wedding home (text-only card amid photographed properties) | Owner/Drive supplies approved photos → 3-image gallery like siblings | data + assets | LOW | VISUAL | OPEN |
| P1-5 | Event times | "to be confirmed" on Vow/Dinner/arrival rows public + Guest Area | Owner timing decision → data update | `register/data.mjs`, `index.html` | NONE | WEDDING OPS | OPEN |

### P2 — POLISH ONLY
| ID | Item | Note |
|---|---|---|
| P2-1 | Dead code | `travelFields()`, legacy `S.arrival/arrivalByGuest` questionnaire remnants, unused `journeyRouteCard` SVG fallback path, `srt-sleeper-cabin.jpg`, `hero/wide-aerial.*` — harmless, removable in a cleanup pass |
| P2-2 | Spa step | Flow-only (not in nav); consider folding into MY PROFILE or naming it in nav — owner taste decision, currently functional |
| P2-3 | Public map dates vs guest dates | Public map shows H&S master dates (23 FEB train 24 FEB); guest surfaces use guest dates (26 FEB). Both correct per their owner sources; add a one-word caption ("our journey") if reviewers find it ambiguous |
| P2-4 | GitHub Pages extras | Pages serves `/journey` legacy PWA + repo markdown (Worker hides them). Either prune the legacy dir from `main` or accept as harmless unlinked paths |
| P2-5 | Cosmetic duplication | Chapter-label date strings restate STAY_WINDOW phrasing; total is composed at three call sites from the same functions — consider a single `grandTotal()` helper during the i18n pass |
| P2-6 | 320px pass | Full smallest-iPhone sweep scheduled with the final device QA |
| P2-7 | Kunming interior duplicate angle | kunming-01 vs skipped _004 noted by ingest agent — fine; revisit only if owner wants variety |

## 29 · CROSS WINDOW HANDOFF

Verified addressable workstreams (per this mandate's minimum set; numbered names used only where the mandate itself verifies 04/07):

- **MASTER / EXECUTIVE** — read §1, §27–§30. Decisions required: P0-1 channel choice, P1-2 penthouse date, P1-3 watermark acceptance, P1-5 event times, release green-light sequence (§37 NEXT STEP). Must not change: frozen prices, event naming, invitation architecture.
- **WEDDING PLANNING / OPERATIONS** — read §2 Flow B, §6, §7, §8, §12, §25. Review: transfer operations vs promised wording ("Guest Relations confirms the exact pickup details"), waitlist handling, 4–8h review promise. Must not change: status vocabulary.
- **INVITATION / GUEST EXPERIENCE (window 04 per mandate)** — read §2, §4 (full), §15, §16, §25. Questions: Is every sentence in §4.8–§4.13 the voice you want guests to receive? Is the mailto fallback acceptable until P0-1 lands? Approve the letter flow (code + personal link) against §15's process.
- **EDITORIAL / COPY (window 07 per mandate)** — read §4 incl. the continuous EDITORIAL REVIEW block, §24. Task: line-by-line sign-off; mark any REVIEW → FINAL or propose exact replacements (no silent edits will be made). Must not change without owner: lockup rule, hyphen policy exceptions, event names.
- **STATIONERY / VISUAL BRAND** — read §4.6, §20, P1-3/P1-4. Confirm plaque wording matches printed plaques; supply penthouse imagery; rule on watermark.
- **DIGITAL / UX / TECHNICAL** — owns §13–§19, §21–§23, P0-1, P2 register, then §26 i18n implementation after copy freeze.

## 30 · AUTHORITATIVE DATA / OPEN DECISIONS

**CURRENT AUTHORITATIVE DATA** — wedding 28 FEB 2027, Souphattra Heritage Vientiane; STAY_WINDOW 27 FEB–01 MAR (2 nights); train 26 FEB 20:25→06:45(+1), No. 25, First Class Sleeper, 8 seats, USD 88/guest; Nong Khai transfer 27 FEB, USD 55/guest; room table §8; Private Residence complimentary·limited; VTE→KMG flight China Eastern 01 MAR; Kunming stay 01–04 MAR (Wanxiang, listed rooms); KMG→LJG train First Class only USD 145/guest 04 MAR; Lijiang stay 04–06 MAR (Snow Mountain Viewing Room); onward 06 MAR as choice; event naming; dress codes; reserved-suite lines; payment terms; H&S master map dates (23 FEB–06 MAR loop).

**OPEN DECISIONS** — P0-1 submission channel; P1-3 watermark; P2-2 spa placement; P2-3 caption; P2-4 Pages extras; i18n scope/order (EN/DE/TH/JA per mandate).

**MISSING AUTHORITATIVE DATA** — Sathorn Penthouse check-in (21 vs 22 FEB) + imagery; event clock times; VTE→KMG and LJG→BKK flight numbers/times (deliberately omitted); Kunming/Lijiang/Penthouse/Kempinski guest-payable amounts IF the owner ever wants them charged (currently correctly GR-confirmed); final guest list.

## 31 · VERSION HISTORY

| VERSION | DATE | PREPARED BY | REVIEWED CODEBASE | DOCUMENT COMMIT | RECIPIENTS | CHANGE SUMMARY |
|---|---|---|---|---|---|---|
| v1.0 | 2026-08-30 | Claude Code | `cfdc4e7` (main; Cloudflare `462c248e…`; Pages build success) | commit introducing this file (see git log for `docs/FINAL_PRE_PUBLIC_RELEASE_REVIEW.md`) | H&S Wedding 001 review workstreams | Initial authoritative Final Pre Public Release Master Review |

Every future revision MUST increment the version, state issuer and what changed, and keep this table complete.

## 32 · SECURITY / PRIVACY STATEMENT

This document contains architecture and schemas only. It contains **no** passwords, tokens, secrets, real invitation codes, passport data or private guest personal data. The demo fixture token used in automated tests lives only in the test fixtures; production tokens exist solely in the owner-held private CSV and guests' letters. Excerpts above are redacted to structure. The encrypted bundle design means even full repo disclosure reveals no guest identity.

## 33 · REVIEW METHOD

Authorized broad review. Performed: full read of canonical data/logic/app sources at `cfdc4e7`; targeted greps for every wording/price claim; live checks against both production URLs (content hashes/markers for map, data values, journey assets); rendered inspection of the Guest Area across the three scenario states during the immediately preceding v1.3/v1.5 passes (results incorporated, not re-run as loops); verification that private guest files are untracked; deployment config inspection. No repetitive automated test loops beyond the standing 72-test suite + 15 release gates (both green at baseline).

## 34 · IMPLEMENTATION FREEZE COMPLIANCE

No fixes, translations, redesigns, guest/code generation, QR/LINE changes or price changes were made in this pass. The only repository change is this document.

---

*End of FINAL_PRE_PUBLIC_RELEASE_REVIEW.md v1.0*
