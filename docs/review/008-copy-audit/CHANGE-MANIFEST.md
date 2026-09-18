# 008 — change manifest (every wording replacement, from apply.py)

| # | File | Before | After |
|---|---|---|---|
| | **A · the header bag icon and the public → private CTAs (T-01, T-02)** | | |
| 1 | every page | aria-label="Your Journey" | aria-label="My Bag" |
| 2 | every page | aria-label="Your bag" | aria-label="My Bag" |
| 3 | every page | data-cta-in="Continue Your Journey" | data-cta-in="Open My Trip" |
| 4 | assets/aman.js | ['Your Journey', 'your-journey.html', null] | ['My Trip', 'your-journey.html', null] |
| 5 | invitation.html | Continue to Your Journey</button> | Continue to My Trip</button> |
| 6 | invitation.html | Open your invitation and your private journey begins — your name, your travel, the wedding day. | Open your invitation and your private trip begins — your name, your travel, the wedding day. |
| 7 | invitation.html | Everything on this website — your journey, the wedding day, your preferences — belongs to it | Everything on this website — your trip, the wedding day, your preferences — belongs to it |
| 8 | invitation.html | Your private journey: your travel, the wedding day and the details that help us take care of you along the way | Your travel, the wedding day and the details that help us take care of you along the way — all in one place. |
| | **B · adding and removing a product names the Bag (T-03)** | | |
| 9 | journeys.html | >Add to Your Journey</button> | >Add to My Bag</button> |
| 10 | journeys.html | 'Remove from Your Journey':'Add to Your Journey' | 'Remove from My Bag':'Add to My Bag' |
| 11 | journeys.html | 'Add to Your Journey') | 'Add to My Bag') |
| 12 | journeys.html | 'Selected for your journey' | 'Selected · in My Bag' |
| 13 | journeys.html | it replaces '+room+' in your journey; nothing else changes. | it replaces '+room+' in your trip; nothing else changes. |
| 14 | journeys.html | The trip, chapter by chapter. Rooms, fares, seats and tickets are chosen inside your invitation | The journey, chapter by chapter. Rooms, fares, seats and tickets are chosen inside your invitation |
| 15 | journeys.html | 'Save '+P.money(275-c.price)+' pp' | P.money(275-c.price)+' less per person' |
| 16 | your-journey.html | 'Save '+P.money(275-c.price)+' per person' | P.money(275-c.price)+' less per person' |
| 17 | room.html | >Add to Your Journey</button> | >Add to My Bag</button> |
| 18 | room.html | b.textContent = 'Remove from Your Journey'; | b.textContent = 'Remove from My Bag'; |
| 19 | room.html | b.textContent = 'Add to Your Journey'; | b.textContent = 'Add to My Bag'; |
| 20 | room.html | swap.textContent = 'Your journey currently holds ' | swap.textContent = 'Your trip currently holds ' |
| 21 | transport.html | has ? 'Remove from Your Journey' : 'Add to Your Journey' | has ? 'Remove from My Bag' : 'Add to My Bag' |
| 22 | transport.html | In your journey · <a href="your-journey.html">View</a> · <a href="cart.html">Your bag</a> | In My Bag · <a href="your-journey.html">Open My Trip</a> · <a href="cart.html">Open My Bag</a> |
| 23 | tea.html | >Add to Your Journey</button> | >Add to My Bag</button> |
| 24 | tea.html | Just added to your journey | Added to My Bag |
| 25 | tea.html | href="your-journey.html">View Your Journey</a> | href="cart.html">Open My Bag</a> |
| 26 | experience.html | <p class="a-eyebrow">Your Journey</p> | <p class="a-eyebrow">My Bag</p> |
| 27 | experience.html | places a restaurant request in your journey for the guests who take part; Guest Relations arrange the table th | places a restaurant request in your bag for the guests who take part; Guest Relations arrange the table. It is |
| 28 | experience.html | <a class="a-link" href="cart.html">View your bag</a> | <a class="a-link" href="cart.html">Open My Bag</a> |
| 29 | experience.html | Remove from your journey</button> | Remove from My Bag</button> |
| 30 | experience.html | Add to your journey · ' + money(s.price) | Add to My Bag · ' + money(s.price) |
| 31 | experiences.html | One table, Sühring, can be asked for through your journey. | One table, Sühring, can be asked for through My Bag. |
| 32 | experiences.html | you can add to your Journey Bag | you can add to My Bag |
| 33 | experiences.html | we will arrange it with the spa — it carries no journey cost. | we will arrange it with the spa — it is not part of your total. |
| 34 | wedding.html | ' · in your journey</p>' | ' · in My Bag</p>' |
| 35 | assets/travelpass.js | selected: 'Selected · in your journey' | selected: 'Selected · in My Bag' |
| 36 | assets/travelpass.js | 'Not in your journey' | 'Not in My Bag' |
| 37 | assets/travelpass.js | Guest Relations has received your journey. | Guest Relations has received your trip. |
| 38 | assets/travelpass.js | If you change your journey, download this pass again | If you change your trip, download this pass again |
| 39 | accommodation.html | See the stays in your journey</a> | See the stays along The Journey</a> |
| | **C · the private plan is "your trip" (T-05, T-07, T-08, T-09)** | | |
| 40 | cart.html | <p class="t-l1" id="cart-own">Your bag</p> | <p class="t-l1" id="cart-own">My Bag</p> |
| 41 | cart.html | Change or remove anything here; your journey and Review &amp; Send follow at once. | Change or remove anything here; your trip and Review &amp; Send follow at once. |
| 42 | cart.html | href="review.html">Review your journey</a> | href="review.html">Review &amp; Send</a> |
| 43 | cart.html | Your journey is not ready to review yet | Not ready for Review &amp; Send yet |
| 44 | cart.html | ready.ok?'Review your journey':'Complete this first' | ready.ok?'Review & Send':'Complete this first' |
| 45 | about-you.html | Two documents help us coordinate your journey. | Two documents help us coordinate your trip. |
| 46 | about-you.html | Your journey can still be sent — Guest Relations will ask you for this directly. | Your trip can still be sent — Guest Relations will ask you for this directly. |
| 47 | dress.html | <p class="dreq">In your private journey</p> | <p class="dreq">In My Trip</p> |
| 48 | dress.html | Wedding Preparation of your private journey. It is never ticked for you, and your journey cannot be sent | Wedding Preparation of My Trip. It is never ticked for you, and your trip cannot be sent |
| 49 | dress.html | Continue in your private journey</a> | Continue in My Trip</a> |
| 50 | voyage.html | hosted for every guest — part of your journey, never a charge. | hosted for every guest — part of your trip, never a charge. |
| 51 | voyage.html | you will find it in your private journey</a> | you will find it in My Trip</a> |
| 52 | voyage.html | <p class="a-eyebrow">Your private journey</p> | <p class="a-eyebrow">My Trip</p> |
| 53 | voyage.html | Those answers are made inside your own private journey, where they are kept by name. | Those answers are made inside My Trip, where they are kept by name. |
| 54 | voyage.html | href="wedding.html">Open your private journey</a> | href="wedding.html">Open My Trip</a> |
| 55 | marsilea.html | nothing here is a booked time, and spa treatments are not part of your journey costs. | nothing here is a booked time, and spa treatments are not part of your total. |
| 56 | tickets.html | Every ticket of your journey, exactly as it stands | Every ticket of your trip, exactly as it stands |
| 57 | tickets.html | 'Reading the seating ledger…' | 'Reading your seats…' |
| 58 | tickets.html | Your seat tickets appear here the moment a seat is confirmed. | Your seat tickets appear here the moment a seat is held in your name. |
| 59 | tickets.html | <p class="t-l1">Your journey · 21 February – 8 March 2027</p> | <p class="t-l1">Your trip · 21 February – 8 March 2027</p> |
| 60 | tickets.html | No transport is in your journey yet. | No transport is in your trip yet. |
| 61 | tickets.html | href="your-journey.html">Go to Your Journey</a> | href="your-journey.html">Open My Trip</a> |
| 62 | tickets.html | A seat ticket shows your seat exactly as the seating ledger holds it. | A seat ticket shows your seat exactly as it is held for you. |
| 63 | your-journey.html | aria-label="Your journey, in order" | aria-label="Your trip, in order" |
| 64 | your-journey.html | <h2 class="t-h2">Also in your journey</h2> | <h2 class="t-h2">Also in your trip</h2> |
| 65 | your-journey.html | The hosted wedding day is part of your journey without charge. A spa interest carries no journey cost — paid d | The hosted wedding day is part of your trip without charge. A spa interest is not part of your total — it is p |
| 66 | your-journey.html | id="fxb">Complete journey<span>All ten stages, selected for you</span> | id="fxb">Complete trip<span>All ten stages, selected for you</span> |
| 67 | your-journey.html | id="csb">Essential journey</button> | id="csb">Essential trip</button> |
| 68 | your-journey.html | <p class="t-l1 on">Your journey is ready</p> | <p class="t-l1 on">Your trip is ready</p> |
| 69 | your-journey.html | 'Each stage is arranged with us. Review &amp; Send shares your journey with Guest Relations.' | 'Every stage is chosen. Review &amp; Send shares your trip with Guest Relations.' |
| 70 | your-journey.html | Start with our suggested journey</h2> | Start with our suggested trip</h2> |
| 71 | your-journey.html | or let the journey complete itself, and change any stage afterwards. | or let the trip complete itself, and change any stage afterwards. |
| 72 | your-journey.html | (cost?'Essential journey':'Complete journey') | (cost?'Essential trip':'Complete trip') |
| 73 | your-journey.html | 'Complete the remaining journey.' | 'Complete the remaining trip.' |
| 74 | your-journey.html | The complete journey fills only the stages that are still open | The complete trip fills only the stages that are still open |
| 75 | your-journey.html | 'Add the complete journey' | 'Add the complete trip' |
| 76 | your-journey.html | is no longer available, so your journey has not been changed | is no longer available, so your trip has not been changed |
| 77 | assets/journey.js | return 'Your journey is ready.'; | return 'Your trip is ready.'; |
| 78 | assets/guest.js | label: 'Send your journey to Guest Relations' | label: 'Send your trip to Guest Relations' |
| 79 | assets/draft.js | 'Save failed · try again' | 'Not saved · try again' |
| | **D · Review & Send (T-05, D-02, X-02, M-01)** | | |
| 80 | review.html | <p class="t-l1" id="rv-own">Your journey · nothing is paid on this website</p> | <p class="t-l1" id="rv-own">My Trip · nothing is paid on this website</p> |
| 81 | review.html | A spa interest carries no journey cost — paid directly at the spa. | A spa interest is not part of your total — it is paid directly at the spa. |
| 82 | review.html | <i class="prep-tick" aria-hidden="true"></i> Received</p><h2 class="t-h1" id="sent-h">Your journey has been re | <i class="prep-tick" aria-hidden="true"></i> Received · under review</p><h2 class="t-h1" id="sent-h">Your trip |
| 83 | review.html | Sending shares your journey with Guest Relations so a person can look at it. | Sending shares your trip with Guest Relations so a person can look at it. |
| 84 | review.html | <b>Received</b> means your journey is safely with Guest Relations. | <b>Received</b> means your trip is safely with Guest Relations. |
| 85 | review.html | nothing in your journey is final. | nothing in your trip is final. |
| 86 | review.html | id="again">Change my journey and send again</button> | id="again">Change and send again</button> |
| 87 | review.html | '✓ Journey saved' | '✓ Trip saved' |
| 88 | review.html | '✓ Updated journey sent to Guest Relations' | '✓ Updated trip sent to Guest Relations' |
| 89 | review.html | l.textContent=upd?'Updated journey sent':'Confirmation email sent' | l.textContent=upd?'Updated trip sent':'Confirmation email sent' |
| 90 | review.html | l.textContent='Your journey is saved'; | l.textContent='Your trip is saved'; |
| 91 | review.html | 'We have your journey. Guest Relations will review your selections personally. | 'We have your trip. Guest Relations will review your selections personally. |
| 92 | review.html | btn.textContent=upd?'Send updated journey': | btn.textContent=upd?'Send Updated Trip': |
| 93 | review.html | b.textContent!=='Send updated journey' | b.textContent!=='Send Updated Trip' |
| 94 | review.html | el.innerHTML='<b>Your journey</b> · saved as draft' | el.innerHTML='<b>My Trip</b> · saved as draft' |
| 95 | review.html | 'Could not prepare — try again' | 'Could not prepare the ticket — try again' |
| 96 | wedding.html | 'Could not prepare — try again' | 'Could not prepare the ticket — try again' |
| 97 | wedding-preparation.html | 'Could not prepare — try again' | 'Could not prepare the ticket — try again' |
| 98 | review.html | Your documents are used only to help us coordinate your journey, | Your documents are used only to help us coordinate your trip, |
| 99 | review.html | <h3 class="t-h1">Your journey can be sent</h3> | <h3 class="t-h1">Your trip can be sent</h3> |
| 100 | review.html | Your journey is sent under your own invitation, so we open it first. | Your trip is sent under your own invitation, so we open it first. |
| 101 | review.html | it never delays your journey. | it never delays your trip. |
| 102 | review.html | A few steps above are still needed before your journey can be sent. | A few steps above are still needed before your trip can be sent. |
| 103 | review.html | <p class="t-l1 on">We have your journey</p><h2 class="t-h1">Guest Relations has your journey</h2> | <p class="t-l1 on">We have your trip</p><h2 class="t-h1">Guest Relations has your trip</h2> |
| 104 | review.html | Guest Relations holds the journey sent on  | Guest Relations holds the trip sent on  |
| 105 | review.html | <p class="t-l1 open">Your journey has changed</p> | <p class="t-l1 open">Your trip has changed</p> |
| 106 | review.html | <p class="t-l1 on">Your journey is confirmed</p> | <p class="t-l1 on">Your trip is confirmed</p> |
| 107 | review.html | Something in your journey has been changed on this device | Something in your trip has been changed on this device |
| 108 | review.html | 'SEE YOU IN LAOS — JOURNEY SELECTION' | 'SEE YOU IN LAOS — MY TRIP' |
| 109 | review.html | subject=Journey%20Selection%20 | subject=My%20Trip%20 |
| 110 | review.html | not a confirmed reservation) | not a reservation) |
| 111 | review.html | ' · INTEREST ONLY (no journey cost, payable at the spa)' | ' · INTEREST ONLY (not part of your total, payable at the spa)' |
| 112 | review.html | L.push('','SEATS (as the ledger holds them):'); | L.push('','SEATS:'); |
| 113 | review.html | cs?'seat '+Lx.label(cs)+' ('+cs+')':'none' | cs?'seat '+Lx.label(cs):'none' |
| 114 | review.html | ds?'seat '+Lx.label(ds)+' ('+ds+')':'none' | ds?'seat '+Lx.label(ds):'none' |
| 115 | review.html | ' ('+x.filename+', '+x.receivedAt+', sha256 '+x.sha256.slice(0,16)+'…)' | ' ('+x.filename+', received '+when(x.receivedAt)+')' |
| 116 | review.html | ' ('+g.publicationAt+', wording '+g.publicationVersion+')' | ' ('+when(g.publicationAt)+')' |
| 117 | review.html | 'acknowledged '+gr.guests[0].dress.at+' (text version '+gr.guests[0].dress.textVersion+')' | 'acknowledged '+when(gr.guests[0].dress.at) |
| 118 | review.html | 'acknowledged '+gr.photo.at+' (text version '+gr.photo.textVersion+')' | 'acknowledged '+when(gr.photo.at) |
| 119 | review.html | L.push('Submitted via Review & Send · '+new Date().toISOString()); | L.push('Sent via Review & Send · '+when(new Date().toISOString())); |
| 120 | review.html | 'HELD — places held in the guest\\'s own name in the room engine, not a confirmed booking' | 'HELD — places held in your name, not yet confirmed' |
| 121 | review.html | 'UNKNOWN — room engine not read on this device' | 'UNKNOWN — rooms not read on this device' |
| | **E · availability, reservation and confirmation words (S-01 … S-06)** | | |
| 122 | assets/rooms.js | return 'Fully booked'; | return 'Sold out'; |
| 123 | journeys.html | \|\|'Fully booked') | \|\|'Sold out') |
| 124 | room.html | \|\| 'Fully booked'; | \|\| 'Sold out'; |
| 125 | assets/stay.js | ' — not bookable through the website.' | ' — not available through the website.' |
| 126 | assets/rooms-data.js | 'Complimentary — USD 0 payable by you. Up to six guests in total, and the ledger holds the places live.' | 'Complimentary — nothing to pay. Up to six guests in total; places are held as they are taken.' |
| 127 | assets/journey.js | basis: 'Interest · confirmed and payable at the spa' | basis: 'Interest · Marsilea Spa confirms the time · payable at the spa' |
| 128 | assets/pricing.js | return 'Interest · confirmed and payable at the spa'; | return 'Interest · Marsilea Spa confirms the time · payable at the spa'; |
| 129 | assets/pricing.js | a table requested through Guest Relations · not a confirmed reservation' | a table requested through Guest Relations · a request, not a reservation' |
| 130 | wedding-preparation.html | The dress code is understood once, here, and confirmed once — in your own name. | The dress code is understood once, here, and acknowledged once — in your own name. |
| 131 | wedding-preparation.html | (fixed?'Front centre':'Confirmed') | (fixed?'Front centre':'Held in your name') |
| 132 | wedding-preparation.html | S.frozen()?'Seat allocated':'Seat confirmed' | S.frozen()?'Seat allocated':'Seat held' |
| 133 | wedding-preparation.html | (fresh?'Seat confirmed':'') | (fresh?'Seat held':'') |
| 134 | wedding-preparation.html | setAttribute('aria-label','Booking summary') | setAttribute('aria-label','Your seat') |
| 135 | wedding-preparation.html | (change?'Change of seat':'Booking summary') | (change?'Change of seat':'Your seat') |
| 136 | assets/seatpass.js | return s.fixed ? 'FRONT CENTRE' : 'CONFIRMED'; | return s.fixed ? 'FRONT CENTRE' : 'HELD'; |
| 137 | assets/seatpass.js | This ticket shows your seat exactly as Guest Relations hold it in the seating ledger at the time of download. | This ticket shows your seat exactly as Guest Relations hold it at the time of download. |
| 138 | assets/seatpass.js | e(s.fixed ? 'Front centre' : 'Confirmed') | e(s.fixed ? 'Front centre' : 'Held in your name') |
| | **F · the emails (T-06)** | | |
| 139 | src/mail-templates.js | 'Your Journey has been updated — ' : 'Your Journey has been received — ' | 'Your trip has been updated — ' : 'Your trip has been received — ' |
| 140 | src/mail-templates.js | h1(M.upd ? 'Your journey has been updated' : 'Your journey has been received') | h1(M.upd ? 'Your trip has been updated' : 'Your trip has been received') |
| 141 | src/mail-templates.js | 'Thank you — your journey has reached Guest Relations. | 'Thank you — your trip has reached Guest Relations. |
| 142 | src/mail-templates.js | This updated journey replaces the previous version for review. | This updated trip replaces the previous version for review. |
| 143 | src/mail-templates.js | is a personal offering and not part of the journey cost. | is a personal offering and not part of your trip cost. |
| 144 | src/mail-templates.js | button(SITE + '/invitation', 'Open your journey') | button(SITE + '/invitation', 'Open My Trip') |
| 145 | src/mail-templates.js | T.push('SEE YOU IN LAOS — YOUR JOURNEY', '', M.upd ? 'Your journey has been updated' : 'Your journey has been  | T.push('SEE YOU IN LAOS — MY TRIP', '', M.upd ? 'Your trip has been updated' : 'Your trip has been received' |
| 146 | src/mail-templates.js | T.push('Open your journey: ' + SITE + '/invitation' | T.push('Open My Trip: ' + SITE + '/invitation' |
| 147 | src/mail-templates.js | label('Updated journey') | label('Updated trip') |
| 148 | src/mail-templates.js | M.upd ? 'Updated journey' : 'Initial submission' | M.upd ? 'Updated trip' : 'Initial submission' |
| 149 | src/mail-templates.js | esc(eyebrow \|\| 'Your journey') | esc(eyebrow \|\| 'My Trip') |
| 150 | src/mail-templates.js | (M.upd ? 'Journey updated — ' : 'Journey received — ') + M.fullName | (M.upd ? 'Trip updated — ' : 'Trip received — ') + M.fullName |
| 151 | src/mail-templates.js | h1(M.upd ? 'Journey updated' : 'New journey received') | h1(M.upd ? 'Trip updated' : 'New trip received') |
| 152 | src/mail-templates.js | M.upd ? 'Journey updated' : 'New journey received', '' | M.upd ? 'Trip updated' : 'New trip received', '' |
| 153 | src/mail-templates.js | kvRow('Guest', M.fullName + (M.guestId ? ' · ' + M.guestId : '')) | kvRow('Guest', M.fullName) |
| 154 | src/mail-templates.js | T.push('Guest: ' + M.fullName + (M.guestId ? ' · ' + M.guestId : ''), | T.push('Guest: ' + M.fullName, |
| 155 | cart.html | <title>Your Bag · See You In Laos</title> | <title>My Bag · See You In Laos</title> |
| 156 | your-journey.html | <title>Your Journey · See You In Laos</title> | <title>My Trip · See You In Laos</title> |
| 157 | about-you.html | <title>About you · See You In Laos</title> | <title>My Profile · See You In Laos</title> |
| 158 | review.html | Your confirmed journey | Your confirmed trip |
| 159 | journeys.html | Your journey stays exactly as it is — the new room | Your trip stays exactly as it is — the new room |
| 160 | review.html | <div class="p-block-h"><h2>Your journey</h2> | <div class="p-block-h"><h2>My Trip</h2> |
| 161 | review.html | <b>Your journey</b> · saved as draft</p> | <b>My Trip</b> · saved as draft</p> |
| 162 | review.html | Your journey stays saved — try once more in a moment | Your trip stays saved — try once more in a moment |
| 163 | review.html | Your journey could not be saved just now | Your trip could not be saved just now |
