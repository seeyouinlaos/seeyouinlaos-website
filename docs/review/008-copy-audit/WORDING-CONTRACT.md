# See You In Laos — canonical wording contract (008 · 18 Sep 2026)

Authority: PROJECT_MASTER_BRIEF.md §9 (information architecture), §10 (Bag and state rules), §15 (Review & Send), §16 (email), §17 (tone) and the Owner's list of canonical labels for this audit. Facts, prices and programme times are not changed by this contract.

## The one rule

**Surface names are proper names; prose is second person.** The private surfaces and the one public surface are always written with their capitalised name (My Trip, My Bag, My Profile, About You, Review & Send, Arranged for you, The Journey). In sentences a guest reads about themselves the same things are "your trip", "your bag", "your profile". "Journey" (lower case) is reserved for the shared, editorial trip that everyone travels — the thing The Journey tells; the guest's own plan is a **trip**.

## Names

| Concept | Canonical | Where | Retired forms (never again) |
|---|---|---|---|
| The editorial story of the whole trip (public) | **The Journey** · in prose "the journey" | journeys.html, menus, footers, "Back to The Journey" | Your Journey (public), itinerary (as a label), Journey planner |
| The guest's private workspace | **My Trip** · in prose "your trip" | your-journey.html h1, step 02, bar, menu, header access link | Your Journey, your journey (private prose), Journey planner, journey (for the guest's own plan) |
| The account row under the sticky header (Owner, 18 Sep 2026) | **MY TRIP · MY PROFILE · SIGN OUT** — the bag icon IS My Bag (badge, always opens My Bag) | every page, inside header.hd | a textual My Bag on the account row |
| Fixed / prearranged items | **Arranged for you** (tracked label) · card line "Fixed arrangement · not part of your bag" | My Trip, My Bag, Review & Send, both emails | Reserved for…, hosted (unless the payer fact is hosted), USD 0 for a fixed item |
| The guest's removable selections | **My Bag** · in prose "your bag" | cart.html h1, bar label, menu, footer, header icon aria-label | Your Journey (bag icon), Your bag (label), Journey bag, cart, basket |
| The final review and transmission | **Review & Send** | step 06, cart link, menus | Review your journey, Review your journey → opens…, Submit |
| The guest's answers (step 05) | **About You** · canonical "05 / 06 · About You" | about-you.html h1, step 05, bar, menu, the profile's "Edit About You" | My Profile (as the step name — retired 18 Sep 2026), Account |
| The guest's account dashboard | **My Profile** · in prose "your profile" | profile.html h1, the menu drawer's account block (Signed in · name · MY TRIP · MY PROFILE · SIGN OUT — release 011: the header is menu · wordmark · bag and nothing beneath) | About You (for the account), Account, Dashboard |
| The participation question (step 02, first) | **Where will you join us?** · answered: **Where you join us · Bangkok · Vientiane · China** (the destinations chosen, in journey order) · **I’ll join all** · **I won’t be joining this trip** → **Not joining this trip** | your-journey.html #scope, the steps panel, My Profile, Review & Send ("Where you join us"), the emails ("Where you join us" / "Where they join us") | Attendance, RSVP, Participation (as a label), Scope |
| A stage outside the guest's destinations | **Not part of your trip** (card) · "Nothing is asked, held or charged for these stages." · **Change where you join us** | the excluded card under the stages | Hidden, Skipped, N/A |
| A step outside the guest's destinations | state **Not joining** · note **Not joining Vientiane** (the wedding steps) / **Not joining this trip** | the steps panel, My Profile | Locked, Complete, Not applicable, N/A |
| The flavour question (About You · 03) | **My Favorite Flavor** · hint **Choose one.** · exactly **Coffee · Milk · Butter · Pandan · Matcha Green Tea · Strawberry Milk** | about-you.html (one radiogroup), Review & Send, the emails, the record | My Favorite Snack (retired 18 Sep 2026), Favourite flavour (British spelling on this label), free text |
| The people who receive the trip | **Guest Relations** | everywhere | the team, the Owner, the hosts (for operational contact), support |
| The guest's cost line | **Your cost** (per item) · **Your total** (the Bag) · **USD 0** when empty | product pages, My Bag, Review & Send, emails | Journey cost, journey costs, Your Costs (plural label), price (as a label for the guest's share) |

## Status words (never collapsed into one another — brief §10)

| State | Canonical words | Meaning | Not to be used for it |
|---|---|---|---|
| Draft saved | **Saved · HH:MM** (the Save My Progress control) · step line **Saved as draft** | the server copy matches what this device sent | Stored, Persisted, Synced |
| Changed after a send | **Changes saved · not yet sent to Guest Relations** · CTA **Send Updated Trip** | the draft differs from the last sent version | Unsaved, Pending, Dirty |
| Sent | **Sent to Guest Relations · Reference SYL-…** · after the send: **Guest Relations has your trip** | the Worker stored the trip and the emails were accepted | Booked, Reserved, Confirmed, Complete, Submitted, Received (as a heading) |
| Being reviewed | **Under review** | Guest Relations is reviewing the sent trip | Processing, In progress |
| Fixed / prearranged | **Arranged for you** · **Fixed arrangement** | a change authority, not a payer statement | Hosted (unless the source says hosted), Complimentary, USD 0 |
| Confirmed by a person | **Confirmed by Guest Relations** | Guest Relations or the provider has confirmed | Confirmed (for a selection, a send or a hold) |
| Request-only product | **Request** · after send **Request sent** · not a reservation | Sühring: USD 180 per participating guest, not guaranteed | Reserved, Booked, Table held |
| No place left | **Sold out** | no remaining place in the live store | Fully booked, Full, Unavailable |
| Not for this guest | **Not available for you** | eligibility, not inventory | Full, Sold out, Locked |
| Hosted | **Hosted by Haruthai & Suthep** (the exact night named) | an approved payer fact | Free, Complimentary (unless the source says complimentary), Included |
| Self-pay | **Your cost** · "Nothing is paid on this website" | the guest's own contribution | Price, Fee, Charge |
| Unknown price | **Amount on request** | not zero, not complimentary | USD 0, Free, TBC |
| Held place | **Your place is held · Room B** | a live hold in the guest's name, not a booking | Booked, Reserved, Confirmed |
| Stage declined by the guest | **Not joining · arranged by you** · "You are arranging this stage yourself. Nothing is held or charged for it." | one direct action from any stage state; whatever was held or chosen leaves first | Skipped, Removed, Cancelled |
| Another address beside a fixed arrangement (the hosts) | **Arranged for you** (the fixed room, never in the Bag) · **Another address, if you prefer** (the open rail) | Edit 5: the fixed unit is never selectable, never removable; a chosen address is a normal hold | Change room (for the fixed room), Remove (for the fixed room) |

## Actions (a guest knows what happens before pressing)

| Action | Canonical | Notes |
|---|---|---|
| Add a product | **Add to My Bag · USD n** | travel, experiences, the Sangkhathan; never "Add to Your Journey" |
| Remove a product | **Remove** (in My Bag) · **Remove from My Bag** (on a product page) | never rendered for a fixed arrangement |
| Decline a stage | **Not joining this stage** → **Reconsider this stage** | offered on every stage that is the guest's to decide (untouched, chosen or held); never on a fixed arrangement |
| Answer the participation question | **Bangkok** · **Vientiane** · **China** (multi-select) · **I’ll join all** · **I won’t be joining this trip** (exclusive) | any combination is valid; the answer comes before every stage |
| Choose a room | **Choose this room** · a held room: **Change room** / **Remove** | rooms are chosen, not added; "Join this room" only where the guest joins a party member's room |
| Save the draft | **Save My Progress** → **Saved · HH:MM** | |
| Go to the final review | **Review & Send** | replaces "Review your journey" |
| Send | **Send to Guest Relations** · after a change **Send Updated Trip** · a retry **Send again** | |
| Open the workspace | **Open My Trip** (a link) · after signing in **Continue to My Trip** | replaces "Continue to Your Journey" / "Continue Your Journey" |
| Open the bag | **Open My Bag** | the bar; the header icon is My Bag |
| Leave | **Sign out** | the tracked-label styling shows it in capitals |
| Return | **Back to The Journey** · **Top ↑** | |
| Open the invitation | **Open your invitation** | signed-out entry point; "Enter your private invitation code." |
| Look at a card's page | **View details** | replaces bare "View" |

## Tone rules applied

- Warm, calm, precise, second person, present tense. No decorative adjectives; premium comes from precision and restraint.
- Uppercase tracked labels carry at most a few words; instructions and errors are sentence-case body copy.
- Error and recovery copy says what happened, what stayed safe, what to do next. Nothing technical: no "engine", "ledger", "payload", "registration", "fingerprint", "version", "409", "KV", ids, ISO stamps.
- One explanation per screen: the cost sentence ("Nothing is paid on this website — Guest Relations confirms every arrangement with you.") appears once per page, in the cost area, never repeated per card.
- Dates read "21 – 24 February 2027"; times "15:30"; money "USD 192"; nights "3 nights"; per-person "per person".
