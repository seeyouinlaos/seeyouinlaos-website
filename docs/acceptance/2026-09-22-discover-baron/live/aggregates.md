# Read-only production aggregates (the GR dry-run + the KV key census; nothing written)

| | before (01:58:39Z) | after the deploy (03:28:24Z) |
|---|---|---|
| Worker version | 83d554e5 | **e179e25b** (Workers Build of 4340f30, 03:24:59Z) |
| room occupancies | 36 (bkk 4 · guesthouse 1 · kempinski 3 · kmg 6 · ljg 5 · prewed 8 · wedstay 9) | 36 — identical |
| waitlisted · seat holds | 0 · 12 | 0 · 12 |
| drafts / actors | 15 / 104 | 15 / 104 |
| KV keys | 52 (avatar 7 · contact 15 · draft 15 · reg 15) | 52 — identical |
| avatar keys (key · bytes · stamp) | 7 | 7 — identical set; the Owner's `avatar:INV-G049` 42 223 bytes · 2026-09-21T16:22:21Z |
| documents in `siyl-docs` | 0 objects | 0 objects |

No concurrent guest activity in this window (every aggregate identical). No reset, no synthetic production registration, booking,
photo or document; the register untouched. Live: parity 274 / 274 (the twelve new files included), live read-only 25 / 25 (three
pins re-pinned to the new Discover), the infra guard live intact, the three BARON films served as video/mp4.
