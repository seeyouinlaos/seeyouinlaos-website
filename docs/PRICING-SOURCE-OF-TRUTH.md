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
| `node src/pricing-guard.mjs --accept "<the Owner's order>" --expect <n>` | only on an explicit Owner order | records today's Google figures as the acknowledged baseline; `<n>` must equal the number of differences found, so an order never covers more than it names |

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
3. **Nothing changed unseen.** The financial cells of 002 and 009 must equal the acknowledged baseline, `src/pricing-baseline.private.json`.
   That file is local and git-ignored because it holds holder and person ids. A difference is named by product and 009 row, never by person.

**On a baseline difference:** ask the Owner. Record it with `--accept` only when the Owner's order covers every listed difference.
Never write Google to make a figure match the baseline. The baseline is not a source of truth: Google is.

**INFO lines do not block.** One example: 002's display row "Total per Person, all Nights" differs from Standard_Rate × nights. The
engine never reads that display row (Freeze · D), so it is an Owner question, not a release blocker.
