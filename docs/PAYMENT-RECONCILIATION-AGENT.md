# Payment Reconciliation Agent · manual (HS-054 phase A · Owners HS-PROMPT-054/-055, 21 Nov 2026)

**What it is:** a read-only reconciliation of the Owners' payment receipts against the ledger. It finds new and changed receipts,
matches them with 008 (guest payments), the issued statements and 007 (supplier payments), and documents every deviation. It
never confirms, books, edits, refunds or sends anything.

**Trigger:**
- The Owners say **"Reconcile payments."** in Claude Code. Nothing else starts it.
- There is no watcher, no cron, no polling, no Worker job and no Drive-triggered run.

## The Owners' rules (binding)

**What counts as evidence (21 Nov 2026):**
- Every receipt in the Drive folder "001 Financial Receipt" is checked and approved by Haruthai and Suthep. It is
  authorised evidence.
- Internal transfers between the Owners' own accounts are accepted; there is no further round of confirmations.
- Payments already recorded stay unchanged. Existing 008 rows are never edited (E42): a cut-short or swapped reference is
  noted only.

**What the agent never does:**
- double bookings: they stay excluded;
- write: recording money in the ledger stays the Owners' **Verify** in the console, or their explicit order. A receipt
  without a 008 row is reported as **New evidence**; its recording path (E43) is not part of phase A;
- estimate an exchange rate: original amount and currency are kept;
- mix guest payments and supplier payments; they are never set against each other;
- copy a receipt anywhere: receipts stay in Drive (not into the repository, the Worker, R2 or any log);
- show an account number whole: account numbers are masked to their last four digits as they are read.

## A run, step by step

1. **Drive, read only:**
   - List the folder (file id, name, size, modified time) with the Owners' Drive connector.
   - The folder id lives only in the private registry or the Owners' message, never in this repository.
   - Never change a file or its sharing.
2. **Read each new or changed file with `read_file_content`.** If it holds no text, look at the image itself. Record:
   - the statement numbers (`HS-2027-nnnn`, several per receipt possible; a mistyped prefix goes into `statementTypos`);
   - amount, currency, date and time, transaction reference, method;
   - payer and payee, masked;
   - `internal` (between the Owners' own accounts) and `thirdParty` (paid by someone other than the guest);
   - for a supplier deposit, `payerIsOwner`.

   Never take an amount from a file name. What is not reliably readable stays empty, and the engine then says
   "Needs verification". The result is written to a **private** receipts file (`~/SeeYouInLaos-PRIVATE/payment-reconciliation/receipts-<date>.private.json`).
3. **Run** `SIYL_ADMIN_INVITATION=<admin invitation> node src/payment-reconcile.mjs --receipts <that file>`. It does the following:
   - reads 008 once and 007 twice (values and formulas), read only;
   - reads the statements' state with one light `admin/overview` call — never `revenue`, `reconcile` or a holder loop;
   - writes the private report under `~/SeeYouInLaos-PRIVATE/payment-reconciliation/`, then, atomically, the private registry
     `src/payment-evidence.private.json`;
   - refuses a receipts file or report directory that is not private (under `~/SeeYouInLaos-PRIVATE` or git-ignored).

   Out of scope in phase A: the payee against the revision's frozen recipient (the light read does not carry it).
4. **Report to the Owners** in German: the counts, each receipt's status, the deviations, and the short list of what is
   theirs to do.

## The statuses (`src/billing/payment-evidence.js`)

| Status | When |
|---|---|
| Already recorded | The receipt's OWN 008 rows are VERIFIED and add up exactly to it. Each 008 row belongs to at most one receipt: by reference (equal, contained, cut short; at least 6 characters), by the mutual swap of two receipts' references, or — without a reference — only where exactly one receipt of its statement can take it. A supplier deposit: exactly one 007 payment with the same amount, currency and date |
| Matched | The receipt's own rows add up and at least one is REPORTED. The payment is reported and evidenced; the Owners record it as received (Verify) |
| New evidence | No 008 row, or no 007 payment |
| Needs verification | A contradiction: amount or currency; a currency that is not the statement's way to pay; an unknown or unissued statement; a revision mismatch on an unpaid statement; a statement already PAID without this receipt's row; a row with another reference; a reference used on another statement (other than a mutual swap); the same transaction in two files (with or without reference); a collective payment that does not add up; the receipt's rows REJECTED; an unknown 008 status; a supplier payment off by up to 3 days or without currency; no Drive version; unreadable fields |
| Rejected | Reserved for an Owner decision on a receipt (phase B). A receipt against REJECTED rows is a contradiction |

**Noted only (no action):**
- a reference cut short or swapped in 008;
- a payment recorded against an earlier revision while the statement is PAID;
- a method in 007 that differs from the receipt;
- an internal transfer;
- a third-party payer.

## Kinds

The reader states `kind`: `GUEST` (names statement numbers) or `SUPPLIER` (the Owners' own payment to someone else, never an internal transfer, never with a statement number). The engine checks it; anything else is `UNKNOWN` (Needs verification).

## Tests

`test/payment-evidence.test.mjs` uses synthetic receipts only. It covers:
- the statuses;
- collective payments;
- the noted-only cases;
- contradictions;
- suppliers vs guests;
- new, changed and removed files;
- idempotence;
- reading mistyped statement numbers;
- masking;
- the engine's purity.
