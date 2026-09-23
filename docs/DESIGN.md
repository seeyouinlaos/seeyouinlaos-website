# SEE YOU IN LAOS — VISUAL INTERACTION SYSTEM

Owner, 23 September 2026. One page. Everything a future change needs in order to stay in the
identity without being told again.

---

## 1 · Three colours

| token | value | what it is |
|---|---|---|
| `--ivory` | `#F2ECE1` | Warm Ivory. The ground of the whole site. |
| `--ink` | `#211F1C` | Ink. Everything that is read. |
| `--cherry` | `#74070E` | The full stop of the wordmark. The only accent. |

There is no fourth colour and **no second red**. A near-Cherry is a broken Cherry. The retired
`#8A5A55` is gone; `--a-red` and `--p-accent` are now Cherry.

Semantic aliases (use these, never a raw hex):

```
--surface  --text-primary  --text-secondary  --rule
--accent   --accent-active --accent-progress --focus
--ease     --t-state       --t-reveal
```

## 2 · Two typefaces

| face | role |
|---|---|
| **PP Editorial Old** (`--f-ed`) | editorial and emotional: headlines, amounts, the count in a ring |
| **PP Neue Montreal / Hanken Grotesk** (`--f-ui`) | information and navigation: labels, actions, meta, numbers in lists |

Never a third family. Emphasis inside a headline is italic or weight of the same face.

## 3 · The canonical wordmark

`SEE_YOU_IN_LAOS_LOGO_ORIGINAL.svg`. Never redrawn, retyped, stretched or substituted. Its Cherry
full stop is the origin of the whole interaction language below — and in the header and footer that
full stop is now rendered in the canonical Cherry, so the logo and every state marker are literally
the same colour.

## 4 · Cherry semantics — the six permitted meanings

| | meaning | where it appears today |
|---|---|---|
| **A** | **CURRENT** — where the guest is now | hero pagination, card-gallery point, navigation `aria-current`, the open step |
| **B** | **SELECTED** — what the guest chose | selected option, held room, confirmed line, active Discover category |
| **C** | **PROGRESS** — how far something has really run | availability ring, planning hairline, the calendar dot |
| **D** | **PUNCTUATION** — the end of one action | the primary action's full stop on hover and focus |
| **E** | **FOCUS** — where the keyboard is | one branded 2 px ring, site-wide |
| **F** | **LOCATION** — the point that is theirs | a current map or destination point, where one exists |

### Cherry is never used for

Decoration · headlines · paragraphs · every divider · every icon · whole cards · large backgrounds ·
generic borders · arbitrary circles · all buttons · an error merely because it wants attention.

The page stays Ivory and Ink. Cherry keeps its value by being rare and by always meaning the same
thing.

## 5 · Rule hierarchy

| rule | colour | meaning |
|---|---|---|
| structural hairline | `--rule` (Ink's line) | this separates two things |
| current / progress rule | `--cherry` | this has run, or this is now |

Never recolour an existing structural divider. A Cherry rule is a statement, not a style.

## 6 · Buttons, links, micro-CTA

The primary action stays Ink on Ivory, as it always was. It gains one thing: a Cherry full stop that
appears on hover and focus. Secondary actions are quiet links with an Ink hairline; the property and
detail links stay muted with a transparent underline that only becomes a line on hover. No pills, no
fills, no large Cherry buttons.

## 7 · Carousels

| state | treatment |
|---|---|
| inactive point | quiet neutral (white at 50 % on photography) |
| active point | canonical Cherry, 4–5 px, one hairline ring on photography for legibility |

The hero and the After-the-Wedding gallery use the **same** motif at the **same** size. Controls are
never enlarged; the count stays for the screen reader and for the exact position.

## 8 · Focus

```css
:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
```

Site-wide, on both stylesheets. Visible focus is never removed. The browser's blue is replaced, not
suppressed. Touch targets and ARIA are untouched.

## 9 · Motion

One grammar: `--ease: cubic-bezier(.19,1,.22,1)`, `--t-state: 180ms` (a state settling),
`--t-reveal: 420ms` (something arriving).

Permitted: a point settling into its state, a rule revealing progress, the existing image
crossfades, a refined hover and focus response. Not permitted: bounce, spring, decorative loops,
constant movement.

**Reduced motion always receives the immediate final state.** Every transition and animation in the
grammar is disabled under `prefers-reduced-motion: reduce`.

## 10 · Responsive principles

Validated at 390 · 834×1194 · 1194×834 · 1440.

- A CI refinement must **never** add vertical space or grow a section. The Cherry marks are 4–5 px
  at every breakpoint; they do not scale up with the screen.
- Components keep their proportional weight across breakpoints. More width is not a reason to grow.
- The availability object is the reference for this: compact, ~37 % of a phone screen, never more.

## 11 · Where the system lives

| layer | file |
|---|---|
| tokens + public grammar | `assets/aman.css` (`:root`, "THE CHERRY GRAMMAR") |
| guest surfaces | `assets/prep.css` (`:root`, "THE CHERRY GRAMMAR ON THE GUEST'S OWN SURFACES") |
| availability reference component | `assets/availability.js` + its block in `aman.css` |
| carousels | `assets/hero-show.js`, `assets/cardgal.js` |

A new component inherits the system by using the tokens and one of the six meanings. If a change
needs a colour that is not Ivory, Ink or Cherry, the change is wrong.
