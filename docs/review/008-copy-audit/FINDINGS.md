# 008 — copy audit · systemic findings (source scan + rendered corpus)

Baseline: branch `p0-empty-bag` at d5c5567 · corpus `text.txt` + `emails.txt` · contract `WORDING-CONTRACT.md`.
Each finding: ID · surfaces · current words · problem class · proposed words · classification against source truth (WORDING ONLY unless marked).

## A. Terminology collisions

| ID | Where | Current | Problem | Canonical |
|---|---|---|---|---|
| T-01 | header bag icon on 13 static pages (1872, about-you, dress, invitation, journeys, marsilea, review, tea, tickets, transport, voyage, wedding, wedding-preparation, …) `aria-label="Your Journey"`; cart.html / tickets.html `aria-label="Your bag"` | three names for one icon | screen-reader name of the Bag icon contradicts the bar and the menu | `aria-label="My Bag"` (recon.js already says so) |
| T-02 | public CTAs `data-cta-in="Continue Your Journey"` (index, destination, accommodation, experiences) · invitation.html "Continue to Your Journey" | Your Journey survives as the private name | retired label | "Open My Trip" (signed-in CTA on public pages) · "Continue to My Trip" (after sign-in) |
| T-03 | product pages: "Add to Your Journey" / "Remove from Your Journey" (journeys, room, tea, transport, experience "Add to your journey · USD n", "Remove from your journey"), "In your journey · View · Your bag", "Selected for your journey" | the add action names the retired surface; a product goes into the Bag | "Add to My Bag · USD n" · "Remove from My Bag" · "In My Bag · View My Bag" · "Selected · in My Bag"; rooms keep "Choose this room" |
| T-04 | cart.html "Review your journey" (button + readiness word) | Review & Send is the surface name | "Review & Send" · when not ready: "Complete this first" stays |
| T-05 | review.html send button "Send updated journey" · "Change my journey and send again" · srvstate "Your journey · saved as draft" · sent card "Your journey has been received by Guest Relations" · "We have your journey" · "Guest Relations has your journey" · "Your journey has changed" · "Your journey is confirmed" | the guest's own plan is called journey | "Send Updated Trip" · "Change my trip and send again" · "My Trip · saved as draft" · "Your trip has been received by Guest Relations" · "We have your trip" · "Guest Relations has your trip" · "Your trip has changed" · "Your trip is confirmed" |
| T-06 | emails (subject, heading, wordmark line, CTA): "Your Journey has been received — SYL-…", "Your journey", "Open your journey", "SEE YOU IN LAOS — YOUR JOURNEY", "journey cost"; Guest Relations "New journey received" / "Journey received — …" / "Journey updated" | same collision in mail | "Your trip has been received — SYL-…" · "My Trip" wordmark line · "Open My Trip" · "SEE YOU IN LAOS — MY TRIP" · "trip cost"; GR: "New trip received" / "Trip received — …" / "Trip updated — …" |
| T-07 | private prose "your journey" in about-you (documents), cart intro, dress, experience (Sühring), experiences, invitation, journeys (stay picker), marsilea, review, tickets, your-journey | second-person prose for the private plan | "your trip" everywhere private; public editorial keeps "the journey" (the shared trip) |
| T-08 | your-journey.html "Start with our suggested journey" · "Complete journey" / "Essential journey" · journey.js "Full Experience" | three names for the two suggested plans | "Start with our suggested trip" · "Complete trip" · "Essential trip" (the labels stay the Owner's pair; "Full Experience" is internal only) |
| T-09 | "journey cost(s)" (experiences, review, your-journey, emails) | | "trip cost" — or, better, "not part of your total" |
| T-10 | menus: shop-menu / recon footer "The Journey · My Trip · My Bag" fine; aman.js nav "The Journey" fine | — | keep |
| T-11 | draft.js word line "My Trip · saved as draft" vs review.html srvstate "Your journey · saved as draft" | two spellings of the same state | one: "My Trip · saved as draft" (both from `SIYL_DRAFT.words()`) |

## B. Duplication
| ID | Where | Current | Proposed |
|---|---|---|---|
| D-01 | cost sentence "Nothing is paid on this website — Guest Relations confirms every arrangement with you." | source-scan suspicion; the rendered corpus shows it once per page (product foot, room foot, My Bag total, Review total) | VERIFIED · no change |
| D-02 | review.html "Guest Relations will review your selections personally. Nothing is confirmed yet; …" in the sent card AND the "What happens now" box on the same screen after sending | two copies in view | the box now says "Nothing more is needed from you now."; the received box (a different state) keeps its sentence — IMPLEMENTED |
| D-03 | cart.html empty state: "No selections yet · USD 0" + the bar's USD 0 | the state, said where it belongs | KEEP |
| D-04 | header access line "Signed in · Ada · My Trip · Sign out" + bar nav "My Trip · My Bag · My Profile · Sign out" | two Sign out controls in view on mobile | KEEP — the P0 decision (header: Signed in · name · My Trip · Sign out; bar: the four surfaces) stands |

## C. Technical / debug language reaching the guest
| ID | Where | Current | Proposed |
|---|---|---|---|
| X-01 | tickets.html "Reading the seating ledger…" · "shows your seat exactly as the seating ledger holds it" | ledger | "Reading your seats…" · "shows your seat exactly as it is held for you" |
| X-02 | review.html sent text "SEATS (as the ledger holds them):" · "places held in the guest's own name in the room engine, not a confirmed booking" · "UNKNOWN — room engine not read on this device" · "Submitted via Review & Send · <ISO>" | engine, ledger, ISO stamp in the mailto/backup text a guest can open | "SEATS:" · "held in your name — not yet confirmed" · "not read on this device" · "Sent via Review & Send · <date in words>" |
| X-03 | review.html confirmed-elsewhere note "this device cannot tell which version it was" | technical flavour | "which copy it was" — IMPLEMENTED |
| X-04 | Guest Relations email "Sam Example · G777" at the top, ids in the muted final block | audience Guest Relations — allowed, ids belong in the final block only | first line "Sam Example" — IMPLEMENTED |

## D. Tone / false confirmation / availability
| ID | Where | Current | Proposed |
|---|---|---|---|
| S-01 | rooms.js / journeys / room: "Fully booked" | booking word for a live-store state; Owner canonical "Sold out" | "Sold out" |
| S-02 | rooms.js / stay.js "Reserved · Bride & Groom" / "Reserved · Family" | a documented ROOM RESERVATION CONFLICT (brief §21), not a wording matter | KEEP the reservation words; only "not bookable" → "not available" |
| S-03 | review.html donebox "Received" tracked label + "Your journey has been received" | fine (brief §15 UNDER_REVIEW = received) — keep "Received", add "Under review" as the status word | "Received · under review" |
| S-04 | seatpass / wedding-preparation "Confirmed" / "CONFIRMED" for a held chair | brief §10: confirmed is a Guest Relations / provider act; the site itself says "held in your name" elsewhere | "Held in your name" on screen, "HELD" on the ticket (fixed positions stay "Front centre") — IMPLEMENTED, flagged for the ChatGPT review as the one change to an Owner-approved ticket word |
| S-05 | assets/docs.js hint "Your ticket or booking confirmation, as a photo or a PDF." | fine (the guest's own external booking) | keep |
| S-06 | experience "It is a request — not a confirmed reservation, and availability is not guaranteed by this page" | double negative around "confirmed" | "It is a request, not a reservation — availability is not guaranteed by this page." — IMPLEMENTED |

## E. Unclear actions
| ID | Where | Current | Proposed |
|---|---|---|---|
| A-01 | transport page in-state "In your journey · View · Your bag" | vague | "In My Bag · Open My Trip · Open My Bag" — IMPLEMENTED |
| A-02 | My Bag readiness link "Complete this" | vague | "Complete this step" (Review & Send keeps "Complete this" beside the named item) — IMPLEMENTED |
| A-03 | review "Retry confirmation email" | fine | keep |

## F. Empty / error / recovery — reviewed strings (source scan)
All recovery strings say what happened and what to do next; wording fixes: none technical except X-01/X-02. "Save failed · try again" (draft.js) → "Not saved · try again". "Could not prepare — try again" (seat ticket) → "Could not prepare the ticket — try again".

## G. Mobile length
| ID | Where | Current | Proposed |
|---|---|---|---|
| M-01 | review.html "Change my journey and send again" (button, 320 px) | wraps to two lines | "Change and send again" — IMPLEMENTED |
| M-02 | draft.js stale words "This device was out of date — showing your latest saved trip" | a body-size status line, wraps cleanly at 320 | KEEP |
| M-03 | room card meta "USD 192 total per person · 3 nights · USD 64 per person / night × 3 nights" | total and rate, both facts the brief requires on every surface (§13) | KEEP |


## H. Findings from the rendered corpus (text.txt · 306 surfaces · 4,310 distinct strings) — all implemented in apply.py unless marked KEEP

| ID | Surface (state) | Current | Class | Change |
|---|---|---|---|---|
| C-01 | menu (every page) · header icon | "Your Journey" (menu entry, `assets/aman.js`) · icon "Your Journey" / "Your bag" | terminology | "My Trip" · icon "My Bag" |
| C-02 | The Journey (public) · intro | "The trip, chapter by chapter." | public editorial uses the shared word | "The journey, chapter by chapter." |
| C-03 | The Journey (signed in) · stay/fare cards | "Add to Your Journey" · "Remove from Your Journey" · "Selected for your journey" · "Save USD 120 pp" · "Fully booked" | retired label · abbreviation · booking word | "Add to My Bag" · "Remove from My Bag" · "Selected · in My Bag" · "USD 120 less per person" · "Sold out" |
| C-04 | room page · category CTA and swap note | "Add to Your Journey" · "Your journey currently holds …" | retired label | "Add to My Bag" · "Your trip currently holds …" |
| C-05 | transport page · in-state line | "In your journey · View · Your bag" | vague "View", retired label | "In My Bag · Open My Trip · Open My Bag" |
| C-06 | 1872 · after adding | "Just added to your journey" · "View Your Journey" | retired label | "Added to My Bag" · "Open My Bag" |
| C-07 | Sühring · selection box | eyebrow "Your Journey" · "Add to your journey · USD 180" · "Remove from your journey" · "View your bag" · "It is a request — not a confirmed reservation, and availability is not guaranteed by this page." | retired label · double negative confirmation | "My Bag" · "Add to My Bag · USD 180" · "Remove from My Bag" · "Open My Bag" · "It is a request, not a reservation — availability is not guaranteed by this page." |
| C-08 | Experiences (public) | "add to your Journey Bag" (×2) · "asked for through your journey" · "carries no journey cost" | retired label | "add to My Bag" · "asked for through My Bag" · "is not part of your total" |
| C-09 | Marsilea · footer sentence | "not part of your journey costs" | terminology | "not part of your total" |
| C-10 | Private Residence · room facts | "Complimentary — USD 0 payable by you. Up to six guests in total, and the ledger holds the places live." | technical word | "Complimentary — nothing to pay. Up to six guests in total; places are held as they are taken." |
| C-11 | reserved categories | "Reserved · Family — not bookable through the website." | booking word (the reservation itself is a documented SOURCE CONFLICT, kept) | "… — not available through the website." |
| C-12 | public wedding page and dress code · private pointers | "Your private journey" · "Open your private journey" · "In your private journey" · "Continue in your private journey" · "part of step 04 … of your private journey" | retired label | "My Trip" · "Open My Trip" · "In My Trip" · "Continue in My Trip" · "… of My Trip" |
| C-13 | invitation · after the code | "Continue to Your Journey" · "Your private journey: your travel, …" · "your private journey begins" | retired label | "Continue to My Trip" · "Your travel, the wedding day and the details … — all in one place." · "your private trip begins" |
| C-14 | shell eyebrow (every private step) | "Your private journey" | retired label, competes with step 02 "My Trip" | "Private" |
| C-15 | My Trip · suggestions | "Start with our suggested journey" · "Complete journey" · "Essential journey" · "let the journey complete itself" · "Complete the remaining journey." · "Add the complete journey" · "Your journey is ready" · "Each stage is arranged with us." | terminology · "arranged" used for guest choices | "… suggested trip" · "Complete trip" · "Essential trip" · "let the trip complete itself" · "Complete the remaining trip." · "Add the complete trip" · "Your trip is ready" · "Every stage is chosen." |
| C-16 | My Trip · headings and aria | "Your journey, in order" · "Also in your journey" · "The hosted wedding day is part of your journey without charge. A spa interest carries no journey cost" · "USD 255total per person" (no space in the DOM text) | terminology · a11y concatenation | "Your trip, in order" · "Also in your trip" · "… part of your trip without charge. A spa interest is not part of your total …" · a space before the label |
| C-17 | My Trip · fare comparison | "Save USD 120 per person" | sales wording | "USD 120 less per person" |
| C-18 | My Bag | title "Your Bag · See You In Laos" · default label "Your bag" · "your journey and Review & Send follow at once" · "Review your journey" (button and readiness word) · "Your journey is not ready to review yet" · "Complete this" | retired labels · vague action | "My Bag · See You In Laos" · "My Bag" · "your trip and Review & Send follow at once" · "Review & Send" · "Not ready for Review & Send yet" · "Complete this step" |
| C-19 | Your tickets | "Every ticket of your journey" · "Reading the seating ledger…" · "the moment a seat is confirmed" · "Your journey · 21 February – 8 March 2027" · "No transport is in your journey yet" · "Go to Your Journey" · "exactly as the seating ledger holds it" | technical word · false confirmation · retired label | "Every ticket of your trip" · "Reading your seats…" · "the moment a seat is held in your name" · "Your trip · …" · "No transport is in your trip yet" · "Open My Trip" · "exactly as it is held for you" |
| C-20 | Wedding Preparation · seats | "Booking summary" (seat bar and its aria-label) · "Seat confirmed" · "Your ceremony seat is confirmed" · Status "Confirmed" · "understood once, here, and confirmed once" | booking / confirmation words for a held chair | "Your seat" · "Seat held" · "Your ceremony seat is held in your name" · Status "Held in your name" · "acknowledged once" |
| C-21 | seat ticket PDF and QR | STATUS "CONFIRMED" · "as Guest Relations hold it in the seating ledger" | confirmation word for a held chair · technical word | STATUS "HELD" · "as Guest Relations hold it" (S-04 — a reviewable decision, flagged for ChatGPT) |
| C-22 | Review & Send | eyebrow "Your journey · nothing is paid on this website" · block h2 "Your journey" · "Your journey · saved as draft" · "Your journey can be sent" · "Received" + "Your journey has been received by Guest Relations" · "We have your journey" / "Guest Relations has your journey" · "Your journey has changed" · "Your journey is confirmed" · "Your confirmed journey" · "Change my journey and send again" · "Send updated journey" · "✓ Journey saved" · "Updated journey sent" · "Your journey is saved" · "A spa interest carries no journey cost" · "Could not prepare — try again" | terminology · mobile length · vague error | "My Trip · …" · "My Trip" · "My Trip · saved as draft" · "Your trip can be sent" · "Received · under review" + "Your trip has been received by Guest Relations" · "We have your trip" / "Guest Relations has your trip" · "Your trip has changed" · "Your trip is confirmed" · "Your confirmed trip" · "Change and send again" · "Send Updated Trip" · "✓ Trip saved" · "Updated trip sent" · "Your trip is saved" · "A spa interest is not part of your total" · "Could not prepare the ticket — try again" |
| C-23 | the sent text (stored, mailto backup) | "SEE YOU IN LAOS — JOURNEY SELECTION" · "SEATS (as the ledger holds them):" · "seat E4 (C-R-04-02)" · "acknowledged 2026-09-18T02:39:56.907Z (text version 2026-09-09)" · "GIVEN (2026-09-18T02:40:24.260Z, wording …)" · "(file, 2026-…, sha256 …)" · "HELD — places held in the guest's own name in the room engine, not a confirmed booking" · "UNKNOWN — room engine not read on this device" · "Submitted via Review & Send · 2026-09-18T02:41:15.860Z" · "not a confirmed reservation" · "INTEREST ONLY (no journey cost …)" | technical words, internal ids, ISO stamps, digests | "SEE YOU IN LAOS — MY TRIP" · "SEATS:" · "seat E4" · "acknowledged 18 Sept 2026" · "GIVEN (18 Sept 2026)" · "(file, received 18 Sept 2026)" · "HELD — places held in your name, not yet confirmed" · "UNKNOWN — rooms not read on this device" · "Sent via Review & Send · 18 Sept 2026" · "not a reservation" · "INTEREST ONLY (not part of your total …)" |
| C-24 | My Bag / My Trip lines · spa and Sühring | "Interest · confirmed and payable at the spa" · "not a confirmed reservation" | confirmation words | "Interest · Marsilea Spa confirms the time · payable at the spa" · "a request, not a reservation" |
| C-25 | Save My Progress control | "Save failed · try again" | tone | "Not saved · try again" |
| C-26 | steps index · still needed | "Send your journey to Guest Relations" | terminology | "Send your trip to Guest Relations" |
| C-27 | My Profile · documents | "coordinate your journey" · "Your journey can still be sent" · title "About you · See You In Laos" | terminology | "coordinate your trip" · "Your trip can still be sent" · "My Profile · See You In Laos" |
| C-28 | travel passes | "Selected · in your journey" · "Not in your journey" · "Guest Relations has received your journey." · "If you change your journey, download this pass again" | terminology | "Selected · in My Bag" · "Not in My Bag" · "… received your trip." · "If you change your trip, …" |
| C-29 | guest email | subject "Your Journey has been received — …" · wordmark line "Your journey" · h1 "Your journey has been received / updated" · "your journey has reached Guest Relations" · "This updated journey replaces …" · "not part of the journey cost" · button "Open your journey" · text "SEE YOU IN LAOS — YOUR JOURNEY" | terminology | "Your trip has been received — …" · "My Trip" · "Your trip has been received / updated" · "your trip has reached …" · "This updated trip replaces …" · "not part of your trip cost" · "Open My Trip" · "SEE YOU IN LAOS — MY TRIP" |
| C-30 | Guest Relations email | subject "Journey received — Sam Example · SYL-…" / "Journey updated — …" · h1 "New journey received" / "Journey updated" · first line "Sam Example · G777" · status "Updated journey" | terminology · id in the first line | "Trip received — …" / "Trip updated — …" · "New trip received" / "Trip updated" · "Sam Example" (id stays in Internal reference) · "Updated trip" |
| C-31 | The Journey (public, signed out) · stays page link | "See the stays in your journey" | a public link into the public Journey named the private plan | "See the stays along The Journey" |
| C-32 | public CTAs (index, destinations, stays, experiences, wedding) | signed-in label "Continue Your Journey" | retired label | "Open My Trip" |
| C-33 KEEP | public editorial "the journey", "Featured journeys", "Journeys calling here", "One invitation · one journey" | the shared, editorial trip | public sense — kept |
| C-34 KEEP | "Confirm seat" (the guest's action), "Confirmed by Guest Relations" (travel pass state), "Guest Relations confirmed your arrangements" | true confirmations by a person, or the guest confirming their own choice | kept |
| C-35 KEEP | "Reserved · Bride & Groom" / "Reserved · Family" | ROOM RESERVATION CONFLICT (brief §21) — not a wording matter | kept, flagged |
| C-36 KEEP | email section "About you" and Review block "About you" | second-person sections inside a page/mail, not the surface name | kept |
| C-37 KEEP | "Wedding journey of Haruthai & Suthep" on the travel pass foot | the shared journey | kept |

## I. Classification of every change

WORDING ONLY — no factual value, price, time, inventory rule, route or logic changed. Two changes touch generated documents (the seat ticket PDF status word and the sent text's stamps/ids); both keep the same data and only change how it is written. All 163 replacements are listed in CHANGE-MANIFEST.md and reproducible with apply.py; every pin moved is listed in pins.py.
