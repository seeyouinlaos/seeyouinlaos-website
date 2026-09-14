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
- Seats: first names on held chairs; the pool as a landmark on the recorded side (until Guest Relations
  records the side, the words say so — nothing invented); one **YOUR WEDDING SEATS** card with one download;
  no booking reference, no invitation id on the card or the PDF.

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
| your-journey.html (02) | "Choose what feels right at each stage …" · labels "For you · <Name>" · CURRENT SELECTION everywhere (no "Selected for your journey", "Current fare", "Change this day") · VIEW DETAILS / CHANGE / CHANGE ROOM / REMOVE · the room chooser under a chosen stay · presets "Complete journey" / "Essential journey" · "Start with our suggested journey" · status "Your journey is ready." / "One detail left to choose." / "N details to choose." · costs block "Your cost" |
| wedding.html (03) | lede "One day, four moments. …" · one answer row ("<Name> · you") · Sangkhathan "Would you like a Sangkhathan prepared in your name?" YES "Yes, I would like to take part · USD 15" / "No, thank you" · Tak Bat wording ("welcome to take part in Tak Bat … The offering is personal and arranged individually on the morning.") · seats: "Where you will sit", "Required" |
| wedding-preparation.html (04) | one acknowledgement ("Your acknowledgement", ✓ Complete) · seats "required for the events you attend" · "Not attending" / "Answer step 03 first" cards · YOUR WEDDING SEATS card · "Download seat confirmation" / "Download this seat" · seat facts without invitation / reference · booking summary punctuated for speech ("Peggy. Temple Ceremony." / "Seat E4. Right block · row 4. Not yet held.") |
| about-you.html (05) | rebuilt: 01 "Do you have any food allergies?" YES / NO (+ "Which allergies?") · "A little more about you — The little things you love are often the ones that matter most. Share as much or as little as you like." · 02 Coffee or tea · 03 My favourite · 04 Favourite drink · 05 Anything you would rather avoid? · 06 Favourite film · 07 Favourite music (all optional, no "why" lines) · Travel documents "Optional · can be added later" / "Optional · not added" · "Photography & film — Photography and filming take place during the wedding day. [ ] I understand and acknowledge this." (required) · "Your publication choice" (optional, separate) · DELETED: Hospitality profile heading, Travel comfort, Anything else we should know?, Accessibility & comfort, "Nothing here needs a tick." |
| review.html (06) | one guest: You (name / email / mobile with "Complete this"), Your journey (unit words), The Wedding (own answers, Sangkhathan USD 15, seats, dress), About you, Documents & privacy, Your cost · "A few things still need your answer" + COMPLETE THIS · received card "Your journey has been received by Guest Relations · Sent · <stamp>" · "We have your journey …", "Your journey has changed …", "Your journey is confirmed …" · sent text: "GUEST:", "SEATS (as the ledger holds them)", "YOUR COST" |
| cart.html (new) | "Your bag · <Name>" · groups Accommodation / Transport / Wedding / Experiences & additions · CHANGE · REMOVE · VIEW DETAILS · "Your total" · "Review your journey" / "Your journey is not ready to review yet" + COMPLETE THIS · "Your bag is empty — Your Journey choices will appear here as you add them. — Go to Your Journey" |
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

**Not changed — source-truth items for 001/Owner:** C86 USD 85 (Master 105) · Sathorn per-night rates ·
dinner venue "Souphattra Heritage" vs the invitation brief's "Souphattra Vientiane Hotel" · the pool side of
the long table (not on record; set with `node src/gr.cjs seating-state --pool T|B` once known).
