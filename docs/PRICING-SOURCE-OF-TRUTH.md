# Pricing Source of Truth — the agent and gate F1 (Owner, 8 October 2026)

**The chain, one way only:** Google `002_Accommodation_Details` / `009_Special_Rates` → Billing Engine (`src/billing/engine.js`) →
Booked Value / Settlement / Statement → Website. Never the reverse: no website or local figure overrides a readable Google rate,
no code divides a rate Google states per person, and no Owner-approved amount is "corrected" by inference.

**Precedence:** a 009 Named Special Rate that names the person → otherwise the 002 Standard_Rate. A 009 row with
`Billing_Category = GUEST_SETTLEMENT_REQUIRED` makes a stay H&S already paid for that person payable to H&S, at exactly
`Rate_Per_Person_Night × Nights_Rule`. A per-person amount is charged in full to every person it names, whoever shares the room.
A `PER_ROOM` / `PER_HOLDER` / `FLAT` charge is charged once and never split by inference.

**Why this exists.** On 8 October 2026 two guests were shown USD 54.50 + USD 116.31 for two hotels Haruthai had paid for them. The
Owner's amount is USD 109.00 + USD 232.62 each. No code had halved anything: the four 009 cells held half-room rates from an earlier
instruction. A rule alone did not catch it, so the rule is now enforced twice: by a read-only agent before the work starts, and by
gate F1 before every release.

## 1. The agent — `pricing-source-of-truth-agent` (read only)

Defined in `.claude/agents/pricing-source-of-truth-agent.md`. That file is local and git-ignored, like `.claude/` as a whole.
**Run it BEFORE any task that changes or touches:**
- room rates and accommodation pricing;
- special rates;
- Booked Value pricing, settlement amounts and statement pricing;
- catalogue rates and pricing fallbacks;
- rate migration or normalisation.

What it does:
1. Reads the relevant 002 / 009 values from Google (read only, the local service account).
2. Names the exact tab, row, column and cell of each value.
3. Compares them with the engine (`quoteOfItem` / `calculate`) and with the website's own figures (`assets/rooms-data.js` through `assets/pricing.js`).
4. Answers **AGREES** or **BLOCK** for the proposed change. BLOCK means the change would override, divide, re-derive or replace an existing
   Owner-approved Google amount, or it rests on a figure Google does not state.
5. Never writes Google, the Worker or the repository, and never invents or infers a replacement rate.

A BLOCK stops the implementation until the Owner decides. A Google rate is changed only on an explicit Owner order that names the
product, the person (for a 009 row) and the amount. The before-values are kept for rollback, and the write touches exactly the named cells.

## 2. Gate F1 — `src/pricing-guard.mjs` (the enforcement)

| Command | When | What it compares |
|---|---|---|
| `node src/pricing-guard.mjs` | every release (`node src/release-check.cjs` runs it as gate F1) | THIS checkout's code against the live Google source |
| `node src/pricing-guard.mjs --live` | after every deploy | the deployed Worker against the live Google source (GET `/api/billing/catalogue` and `/api/billing/admin/holder` only, one at a time; `SIYL_ADMIN_INVITATION` names the Billing Admin's invitation in the local token file) |
| `node src/pricing-guard.mjs --accept "<the Owner's order>" --expect <n>` | only on an explicit Owner order | records today's Google figures as the acknowledged baseline; `<n>` must equal the number of differences found, so an order never covers more than it names. Needs the local detail of the current baseline. Prints the commit trailer to use. |
| `node src/pricing-guard.mjs --rebuild-detail` | a fresh checkout | writes the local detail again, only while Google still equals the committed baseline (it acknowledges nothing) |
| `--bootstrap` (with `--accept`) | never again | started the committed baseline once (8 Oct 2026). A deleted `infra/pricing-baseline.json` is restored with `git checkout`, never started again: `--accept` refuses while git knows the file |
| `PRICING_GUARD_TEST=1` | the guard's own scenario runs | honours the path overrides (`PRICING_GUARD_KEY`, `PRICING_BASELINE_DETAIL`, `PRICING_BASELINE_COMMITTED`). A test-mode run always fails as a release result, and the release check strips these variables |

Exit codes: 0 PASS · 1 FAIL · 2 UNAVAILABLE. UNAVAILABLE means Google or the Worker could not be read. It is not a pass: run the gate again.

F1 proves:
1. **The rules, on synthetic data:**
   - a per-person rate is never divided by the room's occupancy;
   - a person-scoped 009 amount is charged in full to each person it names;
   - a PER_ROOM charge is charged once;
   - a named rate beats 002;
   - the website shows the server's amount once the server has answered;
   - the stay card beside "already paid" shows the guest's own amount.
2. **This code against Google:**
   - for every 002 product, the server reads Standard_Rate unchanged, lists it unchanged and charges rate × payable nights;
   - the website's own catalogue figure for every stay is the same number;
   - for every approved 009 row, the engine charges exactly Rate_Per_Person_Night × Nights_Rule to the person it names;
   - a named rate on a hotel the guest pays directly stays with the hotel, never an H&S charge.
3. **Nothing changed unseen.** The financial cells of 002 and 009 must equal your last acknowledged order. Every checkout carries that baseline in
   `infra/pricing-baseline.json` (committed): one SHA-256 digest over the whole canonical 002 snapshot and one over the whole 009 snapshot, their
   reference and the dates of the acknowledgements. It holds no id, no amount and no guest. No per-row or per-field digest is ever committed,
   because those could be reversed. The full snapshot (holder and person ids) lives only in the local, git-ignored
   `src/pricing-baseline.private.json`, so that differences can be named where it exists. In a fresh checkout without it, F1 still compares
   the digests and fails on any change. It just cannot name the change there.
4. **Who may change the baseline.**
   - The commit that sets the baseline carries `OWNER-PRICING-CHANGE: <the Owner's order, no guest names> [ref <ref>]` in its trailer block,
     naming the reference it set. An older unmarked commit is superseded by it. Free text (Note, Approved_By) is
     named as changed, never printed.
   - Before that commit, `OWNER_PRICING_CHANGE` in the environment must name the new reference. It is honoured only while the file differs
     from HEAD.
   - If git cannot be read, F1 fails.
   - The trailer guards against accidents. It is not consent: consent is the Owner's order, recorded with `--accept`.
5. **Fail closed.** F1 fails in each of these cases:
   - Google unreadable: UNAVAILABLE (exit 2). The committed digests never stand in for Google.
   - no committed baseline, or a malformed or tampered one;
   - an unacknowledged change;
   - an unmarked change of the baseline.
   Workers Builds deploys any push to `main` without running F1, so `node src/pricing-guard.mjs --live` after every deploy is the backstop.
   Running F1 inside the build pipeline would be an infrastructure change, which only the Owner can authorise.

**On a difference:** ask the Owner. Record it with `--accept` only when the Owner's order covers every listed difference. Never write Google
to make a figure match the baseline. The baseline is not a source of truth: Google is.

**INFO lines do not block.** One example: 002's display row "Total per Person, all Nights" differs from Standard_Rate × nights. The
engine never reads that display row (Freeze · D), so it is an Owner question, not a release blocker.

## Open Owner question — the unit of 002 row 27 for five products (recorded 8 Oct 2026, no correction made)

All five products have Rate_Basis PER_PERSON_PER_NIGHT, Billing_Category GUEST_SELF_PAYMENT (the guest pays the hotel) and Max_Pax 2.
In each, the sheet's own formulas take **row 27 as the input** and derive the rest from it: row 26 (per room, per night) = row 27 ÷
nights, and row 25 (per person, per night) = row 26 ÷ 2. Row 47 (Standard_Rate, the engine's input) is a typed copy of row 25.

| 002 column · product | Pax | Nights | Row 27 "Total per Person, all Nights" | Row 26 (formula) | Row 25 (formula) | Row 47 Standard_Rate |
|---|---|---|---|---|---|---|
| S · F-JINRI-TERRACE-DOUBLE | 2 | 3 | 109 | `=S27/3` → 36.33 | `=S26/2` → 18.1667 | 18.16666667 |
| T · F-JINRI-FAMILY-SUITE | 2 | 3 | 128.67 | `=T27/3` → 42.89 | `=T26/2` → 21.445 | 21.445 |
| W · H-VIEW-SUITE-270 | 2 | 2 | `=433.74/2` → 216.87 | `=W27/2` → 108.435 | `=W26/2` → 54.2175 | 54.2175 |
| X · H-PRIVATE-SOUP-VIEW | 2 | 2 | 232.62 | `=X27/2` → 116.31 | `=X26/2` → 58.155 | 58.155 |
| Z · J-JATU-ROOM | 2 | 2 | 163.41 | `=Z27/2` → 81.705 | `=Z26/Z23` → 40.8525 | 40.8525 |

**Two readings. The sheet does not decide between them:**
1. **Row 27 is the room total for all nights.** Only the label "per Person" is wrong in these five columns. Every figure stands: the
   website shows a guest the per-person half of the room. This matches the formulas, and the 7 Oct closeout rule "per person = half
   the room".
2. **Row 27 is per person.** The label is right. Then rows 26 and 25 halve twice, and Standard_Rate is half the true per-person rate
   for these five rooms.

**Points the sheet leaves unexplained:**
- What 433.74 is in W27.
- Z25 divides by nights rather than by persons. The result is the same only because nights = Pax = 2.
- The U Sathorn column treats row 27 as genuinely per person.

**Impact:**
- **H&S charges: none.** All five products are paid by the guest to the hotel (block B, USD 0). The only H&S charges on them are
  person-scoped 009 rows (009 rows 27–30: USD 109.00 / 232.62 per person, Owner order 8 Oct 2026), and 009 does not depend on row 27.
- **Other guests:** reading 2 would double the informational per-person price the website shows for these five rooms.

Gate F1 lists the five products as INFO and never reads row 27 (Freeze · D). Neither the pricing agent nor Claude may settle the
question by inference. Only an Owner order can, together with what 433.74 is.
