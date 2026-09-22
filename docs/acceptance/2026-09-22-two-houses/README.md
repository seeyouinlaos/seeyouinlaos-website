# TWO HOUSES · SEVEN PHOTOGRAPHS · ONE LABEL (Owner, 22 Sep 2026)

One consolidated changeset against the live state. Nothing else of the journey moved: the booking logic, the rooms and seats
engine, the stage graph, the document durability and retention, the countdown, the Discover taxonomy and order, the BARON
implementation, the questionnaire validation and persistence, the emails, the infrastructure and the guests' own records are
exactly as they were.

## 1 · DIOR AND LV — two locations, never one card

The combined record `bkk-diorlv` ("Dior · Café LV") is **deleted** from the canonical dataset. In its place two canonical
places, each with its own id, name, teaser, lead frame and gallery, each rendering exactly once:

| id | name | where | media | the visit it keeps |
|---|---|---|---|---|
| `bkk-dior` | Dior Café | Bangkok · the maison on Sukhumvit | 3 frames, Drive folder **122 – Cafe – Dior Bangkok** | Day 02 · 22.02.2027 · 12:45 · Coffee |
| `bkk-lvcafe` | LV Café | Bangkok · Le Café Louis Vuitton, Gaysorn Amarin | 4 frames, Drive folder **124 – Cafe – LV Cafe Bangkok** | Day 02 · 22.02.2027 · 12:45 · Coffee |

Both keep the Operations Master's single visit (`{ day: 2, date: '2027-02-22', seq: 1245, what: 'Coffee' }`), so the Cafés rail
opens with the two of them on 22 February and the rest of the day order is untouched. The frames were split by **what they
show**, not by which folder they sat in: folder 122 was found to hold Louis Vuitton frames too, so the gold cannage salon, the
carved DIOR wall and the garden parasol stayed with Dior, and the library-wall banquettes, the round dining room, the sculpted
façade and the monogram trunks moved to LV (`bkk-dior-06/07/09/10` → `bkk-lvcafe-01/02/03/04`, `git mv`, no re-encode).

Derived numbers are **recomputed from the canonical records**, never carried over: the journey in numbers on My Profile now
reads **14 restaurants · 11 cafés · 6 bars & nightlife · 4 museums · 2 temples & stupas** (cafés 10 → 11, the split).

## 2 · THE SEVEN VENUES — each with its own photographs

Every frame comes from that venue's own approved Drive folder; no destination fallback, no other house's photography, and no
dish or glass (the media taxonomy forbids `food` / `drink` for a place).

| venue | folder | frames (lead first) | source files |
|---|---|---|---|
| Café Craft by CHANINTR | 131 | bkk-cafecraft-01 (lead) · -02 | IMG_4301 · IMG_4302 |
| Firefly Bar, Siam Kempinski | 154 | bkk-firefly-01 (lead) · -02 · -03 · -04 | IMG_4307 · IMG_4306 · IMG_4308 · IMG_4309 |
| Siam Paragon | 226 | bkk-siamparagon-01 … -04 | IMG_4310 · IMG_4311 · IMG_4312 · IMG_4314 |
| Cam On Restaurant | 097 | vte-camon-01 · -02 | IMG_4251 · IMG_4255 |
| Le Café at Souphattra Heritage | 130 | vte-lecafe-01 · -02 | IMG_4260 · IMG_4262 |
| Selene Sky Bar | 153 | vte-selene-01 … -04 | IMG_4273 · IMG_4275 · IMG_4265 · IMG_4266 |
| Wat Ong Teu | 050 | vte-ongteu-01 (the Temple Ceremony's own frame) · -02 | DSC07779 · DSC07777 |

Wat Ong Teu keeps everything it had: one EXPERIENCE record, the Alms Giving Ceremony of Sunday 28.02.2027 09:00, its place in
the Laos Experiences rail. No temple record was recreated — That Dam, Wat Si Saket and Wat Si Muang stay gone (the tests pin it).

The plated dishes, the tea stand, the cocktails and the drinks of those folders were read and **left out**: a café is not its
menu. Every candidate frame was decoded and looked at before it was placed. Nothing was substituted.

The experience record is now **47 places · 199 photographs** (was 45 · 179).

## 3 · ABOUT YOU — question 06

The visible label of question **06** now reads **Thai favorite** (the Owner's wording, exactly as given). Everything else of
that question is untouched: the key (`genres`), the required structured multi-select of the Owner's thirteen genres (no
free-form, guest-created categories), the count line, the persistence, the Worker's 422 on an unanswered required question, and
the words both emails print (`Your music (genres): …`). The final required wedding question (A wish from the Bride & Groom —
the pool jump or BARON) is unchanged.

## 4 · THE WEDDING DINNER SEATS — 13A / 13B

**Not implemented — one question for the Owner.** The ledger has no label `13A` or `13B`: the guest-facing dinner labels are
`A13` and `B13` (run · place). Live, read-only, at the time of this pass:

- run A: place 12 **free**, place 13 **free** — nothing to move to A12;
- run B: place 12 **held by Haruthai (the Bride)**, place 13 held by Suthee, 14 Mum, 15 Steffie, 11 Suthep (the Groom), 8 Peggy.

So "13B → 12B" would put the guest at place 13 on the seat the Bride holds, and the only way to free it would be to move the
Bride or renumber the places 11–15 — both of which this pass is forbidden to do ("preserve all other seat assignments, do NOT
renumber unrelated seats"). Nothing was changed. The Owner's decision is needed: whether the two seats are A13/B13 or another
pair, and where their holders are to go.

## Checks

Unit 462 / 462 · gates 27 / 27 (C1 asset fingerprints, G1 stage graph, Q1 questionnaire, M1 media, I1 infrastructure freeze).
Stage E2E: discover-baron 19 / 19 (taxonomy, dates, rail order, the genres by real taps, the numbers), release-012, highlights,
profile-return, countdown, four-point, close-out, account-ia, wedding-dinner. Live: parity, the release-014 read-only walk, the
infrastructure guard, and the read-only aggregates before and after the deploy (no guest record, booking, seat, upload or
answer touched by this pass).

## The proof (live)

Implementation commit `1f74a93` · Worker version **90a139ec-ea44-47db-98ca-33da28af2eff** (Workers Build on push to `main`,
2026-09-22 16:51 UTC).

- **Served dataset**: 51 canonical places, `bkk-diorlv` gone, `bkk-dior` and `bkk-lvcafe` present; the journey in numbers on the
  live Worker reads `{restaurants: 14, cafes: 11, nightlife: 6, museums: 4, temples: 2}`.
- **Question 06 live**: `key: 'genres', n: '06', q: 'Thai favorite', … required: true, type: 'multi'` — the structure, the
  choices and the emails unchanged.
- **media-proof.mjs** on the stage 19 / 19 and on production 19 / 19: each of the nine venues' pages loads only frames of its own
  slug, every frame answers 200, no foreign or fallback image (screenshots at 390 and 1440 in `stage/` and `live/`).
- **Parity** 294 / 294 · **release-014 live read-only walk** 25 / 25 · **infrastructure guard (live)** intact
  (one Worker, workers.dev, GitHub Pages 404).
- **Production data untouched**: the read-only aggregate before and after the deploy is byte-identical —
  rooms 36 → 36, seating 12 → 12, drafts 15 → 15, KV registration keys 53 → 53, digest `73acb186d926…` → `73acb186d926…`,
  profile photos 7 → 7. Nothing was written, reset or deleted.
- **Codex review**: PENDING — EXTERNAL QUOTA LIMIT (the CLI answers "You've hit your usage limit … try again at Sep 24th,
  2026 10:19 PM").
