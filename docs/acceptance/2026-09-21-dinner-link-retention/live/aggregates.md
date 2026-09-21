# Read-only production aggregates (the GR dry-run + the KV key census; nothing written)

| | before (21:45:52Z) | after the deploy (23:00:04Z) |
|---|---|---|
| Worker version | 2ca324b6 | **0a685545** (Workers Build of eba93a9, 22:54:48Z; handlers fetch + scheduled; cron `0 3 * * *` attached 22:54:50Z) |
| room occupancies | 36 (bkk 4 · guesthouse 1 · kempinski 3 · kmg 6 · ljg 5 · prewed 8 · wedstay 9) | 36 — identical |
| waitlisted · seat holds | 0 · 12 | 0 · 12 |
| drafts / actors | 15 / 104 | 15 / 104 |
| KV keys | 52 (avatar 7 · contact 15 · draft 15 · reg 15) | 52 — identical |
| avatar keys (key · bytes · type · stamp) | 7 | 7 — identical set; the Owner's `avatar:INV-G049` 42 223 bytes · 2026-09-21T16:22:21Z |
| documents in `siyl-docs` | 0 objects, 0 B | 0 objects, 0 B — nothing deleted, nothing uploaded |
| `docpurge:` audit records | 0 | 0 (the clock is not due before 7 April 2027) |
| the live retention report | — | `due: false · objects 0 · deleted 0 · audits []` — "before 7 April 2027 nothing is deleted" |

No concurrent guest activity in this window (every aggregate identical). No reset, no synthetic production data, no migration.
