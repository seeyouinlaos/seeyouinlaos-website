# The guest's own name (Owner instruction, 21 Sep 2026) — the name lock removed

**First Name · Last Name** are editable on My Profile (the personal-details card) and on the invitation page's personal details,
prefilled from the invitation (the preferred name first, the rest of the full name last), saved through the existing contact
record (`/api/contact`, under the guest's own invitation — the Worker takes the identity from the bearer, never from the body).
Nothing is written until the guest edits. A correction reads wherever the guest's name is rendered (`SIYL_GUEST.value` /
`nameOf`): the step shell, the account block, My Trip, Review & Send ("corrected by you", the invitation's words kept as the
source in the record for Guest Relations), the tickets and passes, the seat plan (the chairs the guest holds are re-selected under
the same identity with the new first name; the roll call follows). The identity never moves: the invitation, the code, the
bearer, guestId · CONxxx · COUPLxxx, the party, the holds, the Bag, the wedding answers, the seats, the drafts, the photo, the
contact. A couple's two members correct their own and never each other's.

Files: `src/worker.js` (two contact keys), `assets/guest.js` (the fields, `nameField`, `nameParts`, `value`/`edited`, `renameHolds`,
the record export), `profile.html`, `invitation.html`, `assets/invite.mjs` (the account block reads the guest module). Email
templates, booking flow, routing, Highlights, pricing, inventory, seating logic, codes, register: untouched.

Proofs: unit **414 / 414** (`test/guest-name.test.mjs`: the model · the surfaces · the Worker with a room hold, two seats, a draft,
a photo and the partner's record before/after) · RELEASE CHECK PASSED · stage E2E `e2e.mjs` **9 / 9** (Ada edits her surname on My
Profile → saved → reload → persists → a fresh device reads it → auth/CON/COUPL/bag/holds/seats/temple identical → the shell, the
account block, Review & Send, the tickets read the correction → Ben, the same party, sees Ada by her first name, corrects his own
name, Ada's untouched → a forged identity in the body ignored, the partner's invitation refused) · regression final-pass 36/36 ·
IA 35/35 · 014 79/79 · 013 35/35 · P0 52/52 · Highlights 20/20 (`stage/regression.txt`).

Deploy: main `9aceda2` → Workers Build version **`fb08605b`** (20:03:32Z, 20 Sep 2026 UTC) · parity 257 / 257 · infra freeze intact · the deployed register identical (104 unique codes · 0 duplicate · 0 auth errors) · live-ro 25 / 25 · `/api/contact` read and write without a bearer → 401 · production dry runs before / after (aggregates only, nothing reset): 33 room occupancies · 12 seat holds · 11 drafts of 104 actors · 38 KV keys — identical.
