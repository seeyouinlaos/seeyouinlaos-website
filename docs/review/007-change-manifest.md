# 007 — change manifest after the 14 Sep 2026 rebuild

`docs/review/007-full-website-text.txt` is the baseline 007 is reviewing and was **not** modified. The
rebuild "002 — individual guest invitations · cart" changed the surfaces below; 007 reconciles its wording
against this list when its current review returns (regenerate with `node docs/review/007-extract.mjs` then).

## Model (everything downstream of it changed)
- One guest = one invitation = one code = one journey = one total = one set of answers. The party is context
  only ("Your party · Peggy & Steffie"). No WHO ARE YOU, no SWITCH, no ANSWERING FOR, no "Continuing as".
- Sangkhathan: an individual YES / NO, USD 15 for the guest alone (never USD 30, never a couple decision).
- Rooms: allocation units (ROOM A, B, C …) with two guest places each, held in the guest's own name; first
  names of the guests already in a room are shown; JOIN THIS ROOM / CHOOSE THIS ROOM; Bride & Groom units
  open to the hosts only; Family never.
- Seats: first names on held chairs; the pool as a landmark — **run A is the poolside run** (Owner source
  of truth, 15 Sep 2026, from the venue plan): the water is drawn along run A and named, run B is named as
  opposite the pool; one **YOUR WEDDING SEATS** card with one download; no booking reference, no invitation
  id on the card or the PDF.
- Transport (15 Sep 2026): every leg is a **travel pass** — a ticket with both ends, times, date, class, the
  guest, a reference (SYL-<leg>-XXXX) and a code to scan; states Selected · in your journey / Sent to Guest
  Relations / Confirmed by Guest Relations; downloadable as a PDF. It is the guest's selection, not the
  carrier's ticket, and says so. Seats keep no code.
- C86 · Kunming → Lijiang: **USD 105 per person** (Owner, 15 Sep 2026) on every active surface.

## Surfaces and wording (public + private)
| Surface | What changed |
|---|---|
| index.html | hero "One invitation. Three countries. One journey." · lede "Thailand, Laos and China — prepared around you." · "21 February – 8 March 2027 … then two final nights back in Bangkok." · eyebrow "One invitation · one journey" |
| destination.html | "21 February – 8 March 2027" · "Three countries, one continuous journey." · new lede |
| 1872.html | "Details to follow." gone: "Aman Nai Lert Bangkok." / "Served daily from 14:00 – 17:00." |
| marsilea.html | new lede (Lao treatment traditions … not yet an appointment) |
| tea.html | no quantity: "One experience · your cost" |
| experience.html (Sühring) | no participants stepper: "USD 180 per person · your cost", "Current selection · USD 180", "View your bag" |
| journeys.html | rows: "Current selection · Room A", "N places left / Fully booked / Reserved for …", "second night hosted by Haruthai & Suthep"; stay actions Change / Change room / Remove |
| room.html | "held for you — yours to choose"; "Holding your place…"; "Current selection · Room A · You · 1 place available"; "Fully booked" / "Reserved" |
| invitation.html (01) | rebuilt: "<Name>, you are invited" · "Haruthai & Suthep would love you to join them …" · "Your private journey: your travel, the wedding day and the details that help us take care of you along the way — all in one place. No payment is taken here. Guest Relations will confirm each arrangement with you personally." · YOUR NAME (read-only) · YOUR CONTACT DETAILS (Email, Mobile number — required, validated, "Looks right") · "Six steps, in order" roadmap with ✓ Complete / Current / Needs attention / Locked · "Helping someone with theirs?" with OPEN ANOTHER INVITATION / SIGN OUT · CONTINUE TO YOUR JOURNEY (strict) |
| you.html | retired; hands over to invitation.html#contact |
| your-journey.html (02) | "Choose what feels right at each stage …" · labels "For you · <Name>" · CURRENT SELECTION everywhere (no "Selected for your journey", "Current fare", "Change this day") · VIEW DETAILS / CHANGE / CHANGE ROOM / REMOVE · the room chooser under a chosen stay · presets "Complete journey" / "Essential journey" · "Start with our suggested journey" · status "Your journey is ready." / "One detail left to choose." / "N details to choose." · costs block "Your cost" · **15 Sep**: every transport stage carries the ticket ("Train · State Railway of Thailand" / "Flight · China Eastern Airlines", BKK 20:25 → NKI 06:25 …, "Class", "Guest", "Travel pass SYL-…", "Your cost", "Selected · in your journey", "Download travel pass", "Not selected" / "Issued with your selection" before the choice); the flight product line "01 March 2027 · non-stop · 1h 35m · Boeing 738" |
| wedding.html (03) | lede "One day, four moments. …" · one answer row ("<Name> · you") · Sangkhathan "Would you like a Sangkhathan prepared in your name?" YES "Yes, I would like to take part · USD 15" / "No, thank you" · Tak Bat wording ("welcome to take part in Tak Bat … The offering is personal and arranged individually on the morning.") · seats: "Where you will sit", "Required" |
| wedding-preparation.html (04) | one acknowledgement ("Your acknowledgement", ✓ Complete) · seats "required for the events you attend" · "Not attending" / "Answer step 03 first" cards · YOUR WEDDING SEATS card · "Download seat confirmation" / "Download this seat" · seat facts without invitation / reference · booking summary punctuated for speech ("Peggy. Temple Ceremony." / "Seat E4. Right block · row 4. Not yet held.") |
| about-you.html (05) | rebuilt: 01 "Do you have any food allergies?" YES / NO (+ "Which allergies?") · "A little more about you — The little things you love are often the ones that matter most. Share as much or as little as you like." · 02 Coffee or tea · 03 My favourite · 04 Favourite drink · 05 Anything you would rather avoid? · 06 Favourite film · 07 Favourite music (all optional, no "why" lines) · Travel documents "Optional · can be added later" / "Optional · not added" · "Photography & film — Photography and filming take place during the wedding day. [ ] I understand and acknowledge this." (required) · "Your publication choice" (optional, separate) · DELETED: Hospitality profile heading, Travel comfort, Anything else we should know?, Accessibility & comfort, "Nothing here needs a tick." |
| review.html (06) | one guest: You (name / email / mobile with "Complete this"), Your journey (unit words), The Wedding (own answers, Sangkhathan USD 15, seats, dress), About you, Documents & privacy, Your cost · "A few things still need your answer" + COMPLETE THIS · received card "Your journey has been received by Guest Relations · Sent · <stamp>" · "We have your journey …", "Your journey has changed …", "Your journey is confirmed …" · sent text: "GUEST:", "SEATS (as the ledger holds them)", "YOUR COST" |
| cart.html (new) | "Your bag · <Name>" · groups Accommodation / Transport / Wedding / Experiences & additions · CHANGE · REMOVE · VIEW DETAILS · "Your total" · "Review your journey" / "Your journey is not ready to review yet" + COMPLETE THIS · "Your bag is empty — Your Journey choices will appear here as you add them. — Go to Your Journey" · **15 Sep**: each transport line carries its pass strip (code · "BKK 20:25 → NKI 06:25" · date · class · "Travel pass SYL-… · Selected · in your journey / Sent to Guest Relations" · "Download travel pass") |
| transport.html | **15 Sep**: the ticket beside the one decision; "In your journey · View · Your bag" |
| review.html (06) | **15 Sep**: the pass strip under each transport line; the sent text names "TRAVEL PASS SYL-…" per leg |
| wedding-preparation.html (04) | **15 Sep**: "Long table · run A · Poolside · place N"; the plan "WEDDING DINNER · POOLSIDE", "RUN A · 25 PLACES · POOLSIDE", "RUN B · 25 PLACES · OPPOSITE THE POOL", "SWIMMING POOL"; "Run A sits beside the swimming pool; run B faces it across the table." (the "to be confirmed" line is gone) |
| journeys.html | **15 Sep**: C86 "USD 105 per person" |
| The travel pass PDF (new) | "TRAVEL PASS" · leg · both ends · times · date · route · guest · class · "Your cost" · reference · the code · "The code carries this pass: the reference, your first name, the leg, the date and the class. Guest Relations reads it at a glance. It is not the carrier's ticket." · "Nothing is paid on this website. Guest Relations confirms the arrangement with you personally; the carrier's ticket follows from Guest Relations." / the Sent and Confirmed variants · "If you change your journey, download this pass again; the newer one is the one that counts." |
| shell (all steps) | bar "<Name> · Your party · …" · View All Steps rows ✓ COMPLETE / CURRENT / NEEDS ATTENTION / LOCKED with the missing items as links · "06 · Review & Send opens once this is complete." gate note · Continue: "Before you continue: …" / "<Step> complete." |
| assets/rooms-data.js | "Second night · Hosted by Haruthai & Suthep"; "Both nights at your room rate"; "The first night at your room rate; the second night hosted by Haruthai & Suthep." |
| assets/pricing.js | "First night your room rate at … · second night hosted by Haruthai & Suthep" |
| assets/journey.js | Tak Bat note; Essential journey service lines ("First night: your room rate · second night: hosted by Haruthai & Suthep", "Complimentary · up to 6 guests") |
| Experiences | PVO Vietnamese Food, Khop Chai Deu, Le Padaek, Parkson Supermarket Laos removed; Lacuna VTE café only |
| Localisation | four-language entries for the new homepage / destinations lines (assets/i18n/siyl-i18n.js) |

## 007 items applied / not applied
Applied (no conflict with the Owner's instruction): homepage and destinations dates and lines · private-journey
intro · "Named guest" and the prominent invitation id removed · party wording ("Your party · …") ·
Your Journey status lines · preset names · hosts by name · "One day, four moments." · Tak Bat · Marsilea ·
1872 · post-submission wording · seat live-region punctuation · legend "Taken".

**Owner decision needed (applied the Owner's spec, 007's proposal recorded):**
- About You: the Owner's spec (allergy YES/NO required first; keep Coffee or tea, My favourite, Favourite
  drink; add Favourite film, Favourite music; delete Travel comfort, Anything else, Accessibility & comfort;
  photography acknowledgement required) is live. 007's eleven-question favourites list and its separate CARE
  section (allergies with "Nothing to note", Comfort & accessibility) differ from the Owner's spec and were
  not applied.
- Special Express No. 25 intro ("Bangkok after dark. Nong Khai at first light. …") applied on Your Journey;
  the Owner's USD 100 stands (007 notes USD 90 in the Operations Master).

**Resolved by the Owner (15 Sep 2026):** C86 = USD 105 per person everywhere active (source data, journey,
transport page, cart, sticky total, Review & Send, sent text, tests — no mixed legacy amount) · the pool side
of the long table: RUN A = POOLSIDE, from the uploaded venue plan, the server default; `node src/gr.cjs
seating-state --pool B` remains for Guest Relations should the venue ever change the layout.

**Not changed — source-truth items for 001/Owner:** Sathorn per-night rates · dinner venue "Souphattra
Heritage" vs the invitation brief's "Souphattra Vientiane Hotel".
