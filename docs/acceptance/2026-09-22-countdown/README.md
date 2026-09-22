# WEDDING-FIRST COUNTDOWN (Owner, 22 Sep 2026)

My Profile's countdown gave the small pre-wedding journey the stage. Now there are two counts and one hierarchy:

- **PRIMARY · THE WEDDING** — the days to Sunday, 28 February 2027 · Vientiane, Laos (the large numeral).
- **SECONDARY · THE JOURNEY BEGINS** — the days to Sunday, 21 February 2027 · Bangkok, Thailand (a smaller numeral beside it —
  below it on a phone, under a hairline; beside it from 768 px, behind a vertical hairline; 96 / 44 px on the phone, 128 / 52 on a
  tablet, 152 / 56 on the desktop).

`SIYL_COMMUNITY.countdowns(now)` (assets/community.js) computes both from the same local-day clock as before — never a written
number, never negative, never a clock. States: the wedding **before** (N days) · **today** ("Today") · **after** ("Married");
the journey **before** (N days) · **today** ("Today") · **journey** (day NN of 16 days) · **after** (16 days). The old
`countdown(now)` reading still names the section's phase (`data-countdown`), so nothing built on it moved.

**The animation.** When the section comes into view (once — a community re-render never replays it): the eyebrow, then the
numeral rising into its value (a 16 px lift with a 1.5 % scale and the count-up), then the date line; the wedding first, the
journey a beat later (the count-ups start at 120 ms and 450 ms, the reveals at 0 / .12 / .34 s and .45 / .57 / .78 s). No loop,
nothing that delays the information, no audio or video. **No layout shift**: the numeral's box is sized by an invisible copy of
the final value beneath the live digits, so the count-up never moves the page — measured (offset boxes) before, during and after
the choreography at 320 · 390 · 834×1194 · 1194×834 · 1440. **Reduced motion**: the final state at once (the CSS media query
and the script's `calm` flag), verified in WebKit with `prefers-reduced-motion: reduce`.

Everything else on My Profile stands: the account card, WHO'S JOINING US (the couple first), the journey in numbers, the Bag bar.
No guest data, booking, room, seat, upload, questionnaire answer, R2, retention or infrastructure touched.

Tests: `test/countdown.test.mjs` (2 — the model on every day of two years, the states, the markup, the styles, reduced motion);
`docs/acceptance/2026-09-22-countdown/e2e.mjs` (14 — the five viewports, once-only, reduced motion, the states rendered in place,
the profile order). Unit 462 / 462 · gates 27 / 27.
