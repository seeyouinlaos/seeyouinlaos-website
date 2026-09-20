# Guest list · authentication · invitation codes · personal details — GO-LIVE (Owner instruction, 20 Sep 2026)

The Owner's decision: GO LIVE — the current guest list, the authentication register and the invitation codes made ready so
Suthep and Haruthai can send the codes. This folder is the acceptance record. **No code, no name, no email, no phone, no
birth date appears in it** — the operational register lives in the private, gitignored files under `src/*.private.*`.

## 1 · The authoritative master, as read
| | |
|---|---|
| Spreadsheet | `H&S_Wedding_Operations_Master` · id `1wDqdKBZT54HR5kfsKWfWhxp9aaeEk-mELyeiuC4obME` |
| Sheet | `007_Guestlist` (columns ID · Firstname · Surname · Nickname · Couple · Letter · Birthdate · Nationality · RSVP · Role · Sending Invitation · Phone · Email · Address · Instagram · Facebook · LinkIn · Notes) |
| Read | 20 Sep 2026 · the Drive read of the file modified `2026-09-20T08:43:14.696Z` (the read immediately before the implementation) |
| Rows | 111 ids `CON001 – CON111` · **107 populated** (`CON001 – CON107`) · `CON108 – CON111` empty (not guests) |
| Roles | 60 Guest – Suthep · 43 Guest – Haruthai · 2 Guest – Suthep – Landlord · 2 Document Owner (the hosts) · 4 empty |
| Couple column | `SIGL` singles · `COUPLxxx` couples (24 couples listed; the legacy `SIGNL` no longer occurs — read as `SIGL` when it does) |
| RSVP | blank on every row — never read as declined |
| Notes | empty — no "Not Attend" |
| Profile data on the sheet | birth date 41 · nationality 104 · phone 59 · email 51 · address 6 (of the 104 invited) |

The sheet's row numbering changed between the 19 Sep read and the 20 Sep read (90 ids now carry a different person than on
19 Sep). From this release on the register remembers **CONxxx per guest** (`contactId`) and matches by it first; the earlier
row-keyed alias table was replaced by a **person-keyed** one (`src/guestlist-from-contacts.cjs`).

## 2 · The reconciliation (sheet → private register → codes)
| Count | Value |
|---|---|
| Invited (named, guest role) | **104** |
| Existing guest ids kept (same person, same id) | 88 — of which 84 keep their existing code |
| Guest ids revived (retired earlier, named again on the sheet under a corrected spelling or re-invited) | 4 (`G027`, `G031`, `G036`, `G046`) — the same id, a **new** code (a retired code is never reused) |
| New guest ids | 16 (`G095 – G110`) — new codes |
| **Codes preserved** | **84** |
| **Codes newly generated** | **20** (16 new + 4 revived) |
| Cancelled ids (kept, no code, no index entry) | 6 (`G010`, `G039`, `G043`, `G044`, `G047`, `G053`) — `G053` newly retired: no longer on the sheet |
| Active parties | **81** (57 singles · 24 couples; `COUPL108` has one named member so far) |
| Rows reported to the Owner, not invited | 3 — see below |
| Duplicate active codes · collisions · code on the wrong guest | 0 · 0 · 0 (`src/register-audit.mjs`) |

**Duplicate-person reconciliations** (one identity, one code; the first row is the person; the later row's data is kept only
where the first row lacks it): `CON062` = `CON025` (same name, same Instagram) · `CON063` = `CON029` (same name, same
Instagram). A shared email, phone or Instagram alone never merges two rows (families share a route) — only the same full name does.

**Unnamed rows** (never invented, never a code): `CON095` "No name / No name" — the partner of `CON094` in `COUPL108`; the party
is kept for the named member and the partner joins it the day the Owner names them. `CON082` has no first name on the sheet;
the nickname stands as the name the site speaks with, nothing invented.

**Couples**: every `COUPLxxx` of the Owner's list maps to one party of the named members (ids in the private report); the
hosts stay `G048` (Bride) · `G049` (Groom) in `INV-001`; singles remain singles.

## 3 · What ships
- `register/auth-index.json` — 104 one-way entries `{ i, g, p, h?, c, k }`: the invitation, the guest, the party, the host flag, the
  **person id** (`CONxxx`) and the **couple state** (`COUPLxxx` / `SIGL`). No name, no code, no profile.
- `register/invitations.enc.json` — 104 records encrypted with the guest's own code; the record now carries `contactId`,
  `couple` and `profile` (what the sheet knows: birth date · nationality · phone · email · address) — readable only with that code.
- The Worker stamps `registration.contactId` / `registration.couple` on every stored journey from the served index
  (`personOf`), never from a client body; the frozen auth authority (`src/auth.js`) is untouched (gate I1 intact).
- **Personal details** (`invitation.html` § Your personal details · `profile.html` · `assets/guest.js` · `/api/contact`):
  Date of Birth (a `date` input, validated, never altered silently) · Nationality (free text — "Thai, German" stays as written) ·
  Phone Number (international, the country code kept) · Email Address (validated) · Private Mailing Address (street and
  house number · line 2 · postal code · city · region · country) with the correspondence copy ("Please share the address
  where you can reliably receive personal mail. We may use it for wedding correspondence, invitations and occasional post
  related to your trip with us, including after the trip." — no gift promised). The sheet's data is prefilled once into
  empty fields of the signed-in person only (history `by: 'guest-list'`); the guest reviews and corrects; the fields are
  asked for, never a lock on the journey (readiness stays email + mobile). Guest Relations' email carries them; the
  guest's own email does not. `CONxxx` / `COUPLxxx` are shown as context on the profile and are not fields.
- The private distribution register (`src/invitation-distribution.private.csv` · `.txt`, `src/invitation-code-list-final.private.csv` · `.txt`)
  now leads with `contactId`, `coupleId` and the sheet's sending route per guest — one line per guest, ready to send individually.

## 4 · Proofs
| Proof | Result |
|---|---|
| Register audit (`node src/register-audit.mjs`) | 104 active · 104 invitations · 104 unique codes · 0 missing · 0 duplicate · 0 auth errors (the "deployed register differs" line is expected until the deploy and clears after it) |
| Unit suite (`npm test`) | **401 / 401** (`test/personal-details.test.mjs` 4 new · `test/release-auth.test.mjs` re-pinned to 104 / 6 · `test/auth.test.mjs` index keys `c` / `k`) |
| Release gates | RELEASE CHECK PASSED (I1 infra freeze intact) |
| Stage E2E 014 (+ §6c the personal details: fields · save · Worker · profile · a fresh device · the couple's two records · a cross-guest write refused · 320 / 834 widths) and the regression suites | **014 79 / 79 · 013 35 / 35 · 012 25 / 25 · 011 52 / 52 · P0 52 / 52 · IA 35 / 35** (`../2026-09-19-release-014/stage/`) |
| Deploy (push to `main` → Workers Build) | main `7d0a41b` → version **`a079d2e5`** (10:23:34Z, 20 Sep 2026) · parity 259 / 259 · infra freeze intact · the deployed register identical to the repository (`register-audit`: 104 unique codes · 0 missing · 0 duplicate · 0 auth errors) |
| Read-only live acceptance (`guest-register-live` added) | **24 / 24** on `a079d2e5` |
| Production zero state | the reset's dry run after the deploy, nothing executed: 0 holds · 0 waiting · 0 seats · 0 drafts · 0 KV keys (`../2026-09-19-release-014/live/zero-state-2026-09-20-a079d2e5.txt`) |
| Codex | **PENDING — EXTERNAL QUOTA LIMIT** (until 24 Sep 2026 22:19 CEST); not represented as passed; the scope is recorded in `../../review/015-codex-release-014/PLAN.md` |
