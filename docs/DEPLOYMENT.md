# Deployment — See You In Laos (production, as of 8 Oct 2026)

ONE website: the Cloudflare Worker `seeyouinlaos-website` at https://seeyouinlaos-website.suthep-hrg.workers.dev
(`wrangler.jsonc → name`). The infrastructure is frozen (Owner, 18 Sep 2026). `infra/PRODUCTION.json` holds the frozen state, and
`src/infra-guard.cjs` (release gate I1) enforces it. Changing anything below needs an explicit Owner authorisation and an
`OWNER-INFRA-CHANGE: <what>` trailer in the commit.

## Release path
1. Before the commit:
   - `npm test`;
   - `node src/release-check.cjs`: every gate, including I1 (infrastructure) and F1 (pricing source of truth, read-only against Google).
1b. `node src/release-attest.mjs` after `git add`: runs both again and signs exactly the staged tree into
    `infra/release-attestation.json` (docs/RELEASE-ATTESTATION.md). Commit it with the release.
2. The approved change reaches `main` (CLAUDE.md: a task branch and a PR for substantial changes). Cloudflare **Workers Builds** builds
   and deploys `main`. There is no manual `wrangler deploy`. Workers Builds cannot run the release check (no Google key there).
   Once the Owner authorises the build step (docs/RELEASE-ATTESTATION.md · Activation), it refuses every tree without a valid
   attestation. Until then, step 1b and step 3 are the controls. Run F1 from a full clone; a shallow clone fails closed.
3. After the deploy:
   - check that the live version equals the commit (`npx wrangler deployments list --name seeyouinlaos-website`);
   - `node src/infra-guard.cjs --live` (public DNS + HTTPS, GitHub Pages still disabled);
   - `SIYL_ADMIN_INVITATION=<the Billing Admin's invitation> node src/pricing-guard.mjs --live` (GET only).

## Bindings (wrangler.jsonc)
- `ASSETS`: the static site (`.assetsignore` keeps source, tests, docs and config out of it).
- `REG_KV` (KV): submissions, confirmations, contacts, drafts fallback.
- `DOCS` (R2, private): guest documents, payment QR codes, issued statement PDFs.
- Durable Objects (SQLite classes, migrations v1–v5):
  - `INVENTORY` → Inventory;
  - `SEATING` → Seating;
  - `ROOMS` → Rooms;
  - `DRAFTS` → Drafts;
  - `BILLING_LEDGER` → BillingLedger.
- Cron `0 3 * * *`: the document retention purge only.
- Observability: on.

## Configuration
- Vars:
  - `MAIL_FROM`;
  - `SHEETS_ID` (the Operations Master: Google 002 / 006 / 008 / 009 / 010 / 011).
- Secrets (names only; values never in the repository):
  - `GOOGLE_SERVICE_ACCOUNT_JSON`: the billing source;
  - `BREVO_API_KEY`: e-mail;
  - `BILLING_SEPA_IBAN`;
  - `GR_TOKEN`: Guest Relations;
  - `DUFFEL_ACCESS_TOKEN`: still set, used by no code. Removing it is an infrastructure change for the Owner.
  - The optional e-mail fallback `RESEND_API_KEY` is not set.
- Local only (git-ignored): `.dev.vars` and `src/*.private.*` (service-account key, tokens, guest lists, the local pricing detail).

## Notes
- The Flight Tracker (Duffel integration, currency service, hotel data, market dashboard) was removed from the site.
- No custom domain, second runtime, Cloudflare Pages or GitHub Pages without the Owner's explicit authorisation (CLAUDE.md ·
  infrastructure freeze).
