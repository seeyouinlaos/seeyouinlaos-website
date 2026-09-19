# Release 014 · the plan Codex was asked to review (pre-implementation, 19 Sep 2026 15:15 — refused by quota)

## The Owner's instruction, reduced to decisions
1. **Delete the fixed-arrangement concept** everywhere (engine, Worker, drafts, mail, client, pages, tests). The hosts start at zero; nothing is held for anyone in advance; no "Arranged for you".
2. **Canonical model**: participation (scope) → the ten stages A–J → package mode (Complete / Essential / Individual) → per stage confirmed · waitlisted · declined · open → readiness → Bag → cost → Review → Profile → confirmation.
3. **Packages are configuration** (`assets/packages-data.js`): per covered stage the default product and the ordered fallback chain (default → the same house's neighbours from the more affordable side of the default outwards → the alternative houses). Capacity decides, never price. Complete = all ten stages; Essential = the wedding stay only (heritage → heritage-executive → heritage-grand-premier → Riverside → Guest House), presented on the same card as Complete.
4. **Party capacity**: a unit must take the whole party (`need` = the party's members; a party member already in the unit counts). No partial booking of a couple. Client (`fitsParty`, `unitForParty`, `canTake`) and engine (`join … need`, 409 `full for your party`) agree.
5. **Waiting list LAST**: when no option of a chain can take the party, the stage is waitlisted in the engine (`wl:<stage>|<guestId>`, deterministic positions by time, renumbered on every read, cleared by a hold, a leave, an assignment and the clean reset); USD 0 until resolved; an answered stage for readiness; shown on My Trip, Profile, Review and in both emails; the package is never called "fully confirmed".
6. **A package REPLACES a conflicting manual selection on confirmation**, previewed first, bound to the preview by a plan signature (the confirm re-reads the engine; a changed plan is redrawn, nothing applied). A held room is never released before its replacement is held (the engine holds first, then lets the old place go).
7. **D2 = Guest House complimentary**: engine key `guesthouse/guest-house`, ONE unit of SIX places, complimentary, occupants' first names visible to signed-in guests (never to the public), never "Private Residence", never "up to 4"; the room page shows the live places.
8. **Canonical counts**: relevant = confirmed + waitlisted + declined + open; excluded = outside the scope; bagItems = actual lines; bagTotal = chargeable confirmed lines.
9. **The current master wins**: C86 USD 105; Lijiang and Kempinski six rooms per category; the dated venues (21.02 Sühring dinner; the Aman tea 24.02; 23.02 Baan Phraya; 07.03 Cannubi + Harudot; 08.03 Petits Plats; Thong Smith undated; The Commons the mall); Baan Phraya / Cannubi / Riverside media from the Owner's Drive folders with provenance; no dish close-ups.
10. **Register**: the current 007 rows; placeholder rule ("Aob's girlfriend", "." surname); stable codes; nothing printed.
11. **Final clean reset LAST**, three-mode flow; test data never on live; READY TO SEND gated by Codex.

## Questions for the reviewer (pre)
- Is `need` handled identically by the planner (`unitForParty`) and the engine (`join`), including a party member already in the unit? Any path where a couple is split?
- Can a waitlisted guest hold a place in the same stage (409)? Does a hold from any path (join, package confirm, GR assign) clear the entry? Does the reset clear `wl:`?
- Is the preview signature complete (stage · why · product · unit · amount)? Can a plan change between preview and apply escape it?
- Does the package confirm ever release a room before its replacement is held?
- Do counts hold their invariant for every scope × state combination, with complimentary and waitlisted stages at 0?
- Is host-ness only ever the authenticated flag (record.hosts), never a client field?

## Final review (post-deploy, owed)
Scope: `git diff f88b9f6..main` (release 014) on the deployed build; the questions above; the read-only live acceptance results; the reset execution record. Classify every finding, fix P0/P1, confirming pass until no [high] remains, then prove parity.
