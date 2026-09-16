# EMERGENCY LIVE HOTFIX — seating reset · own-seat rights · email (Owner, 16 Sep 2026) · evidence

No access code, bearer or hash appears in this folder. Every mutating script was stopped before the reset; the
controlled test ran as Peggy (G001) and released everything it held; the Owner's own live records
(`reg:INV-G048`, `reg:INV-G049`, Haruthai's room places) were never touched.

**Order followed.** 1 forensic snapshot (`forensic-before-reset.json`: 6 stale holds — ceremony G001/G002, dinner
G001/G002/G049/G048) · 2 freeze · 3 reset through the Guest Relations unassign route · 4 `A-B-seating-after-reset.json`:
0 guest holds at the ceremony and the dinner, 0 names, seating open · 5 the root fix deployed (de8ecdc) · 6–13 the
controlled proof (`proof.mjs`, `proof.json`): seating open for the guest, D-T-05 + C-R-05-02 held atomically, another
guest refused (403 "not your guest"), the same chair for another guest "taken" (409), hard refresh → the seats remain,
sign out → sign in → the seats remain, the seat tickets render, both seats given back → `E-F-empty-after-test.json`
0 holds · 14 the controlled Review & Send: stored with reference SYL-G001-…, the provider's answer recorded
(`G-H-email-provider-result.json`), the retry answers the same reference · 15 the test record removed from KV ·
16 final: 0 holds, 0 names, KV as in the forensic snapshot.

**The root fix (de8ecdc).** The "NOT OPEN YET" the Groom saw was the page's static placeholder, painted only while
the plan had not been read (a failed read left it standing — the engine said open for every guest); the placeholder now
reads "Loading your seats…", a plan that cannot be read says "Your seats could not be loaded" with "Try again", and
"Not open yet" is written only when the server says not open (Wedding Preparation, Review & Send, The Wedding). The
hosts' rule is the party flag `hosts` (never a guest id): the ceremony place is the fixed front centre for both, the
dinner chooser is the same for both — read-only checked live for Suthep and Haruthai: identical capability. The refusal
reads "This seat was just taken. Please choose another." The engine was already one actor per plan: a seat is decided
once (`blockConcurrencyWhile`), a foreign bearer answers 403, a held chair answers 409 taken.

**Email (de8ecdc).** `/api/register`: the journey is stored first (KV `reg:<invitation>`, with a submission reference
`SYL-<guest>-<8 hex>` in the record and its metadata), then Guest Relations and the guest are emailed through the
configured provider (Brevo or Resend — the key is a Worker secret, the sender `MAIL_FROM`); the provider's acceptance,
status and message ids are written to the record and returned. `/api/register/mail-retry` (the guest's own bearer)
sends the stored journey's emails again and never creates a submission. Review & Send shows "Your journey is saved ·
Confirmation email could not be sent — please retry" with "Retry confirmation email" when the provider refuses.
The retired MailChannels call (answering 401 since 2024) is gone.

**Email live result.** The production Worker has no email provider secret (the secrets are the Guest Relations token
and the flights token): both emails answer `provider: none · accepted: false · "no email provider configured"`. The
booking was saved regardless (reference issued, retry answered). ACCEPTED BY PROVIDER: not yet — one step remains and it
is the Owner's: a Brevo (or Resend) account with `guest.relation.seeyouinlaos@gmail.com` validated as sender, then
`npx wrangler secret put BREVO_API_KEY` — no code change; the same proof then records the two message ids.
