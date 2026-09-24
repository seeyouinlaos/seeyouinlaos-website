/* ============================================================================
   THE STAY PLAN — the ONE rule for the complimentary stay and its extension
   (Owner, 22 Sep 2026).

   ONE COMPONENT (Owner, 23 Sep 2026):

     BASE STAY   the Guest House complimentary of the wedding window
                 (`guesthouse/guest-house`) — FOUR guest places (one bedroom, Edit 7), the only
                 complimentary accommodation, USD 0, the included nights and
                 nothing more. It cannot be extended: the house is the house.

   THERE IS NO SELF-SERVICE EXTENSION. The paid extra nights that used to be
   bookable here (the Riverside Hotel Vientiane, one to four nights after the
   included stay) were withdrawn by the Owner on 23 September 2026: a guest must
   not be offered a cheap alternative beside the stay that was chosen for them.
   Extra nights are arranged by Guest Relations, outside this engine, and the
   website does not name a hotel for them.

   THE DEADLINE. A limited free allocation needs a fair cut-off: a place in the
   Guest House may be claimed until the end of 30 NOVEMBER 2026, or until the
   four places are gone — whichever comes first. After that the complimentary
   option is closed even if a place is technically free again (a release after
   the deadline is an administrative decision, never a silent reopening).

   This file is pure — no DOM, no storage, no network, no clock of its own (the
   caller passes `now`). The browser copy assets/stay-plan.js is GENERATED from
   it by src/build-stay-plan.cjs (gate S1 keeps it current) — never edited by
   hand. The capacity itself is never written here: it is the inventory seed's,
   read from the engine, so one number can never disagree with another.
   ========================================================================== */

/* ---- the complimentary stay ---------------------------------------------- */
export const COMPLIMENTARY = {
  key: 'guesthouse/guest-house',
  stage: 'wedstay',
  name: 'Guest House complimentary',
  where: 'Vientiane',
  dates: '27 February – 01 March 2027',
  nights: 2,
  price: 0,
  /* the last day a place may be claimed — the end of this day, the guest's own day */
  deadline: '2026-11-30',
  deadlineWords: '30 November 2026'
};

/* ---- the planning window ---------------------------------------------------
   The deadline above says WHEN the planning ends; this says how long the whole
   window is, so a surface can draw where today stands between its two ends.
   It is CALENDAR TIME and nothing else: how many places are left is the ring's
   business (the engine's count), and one fact is never drawn twice. */
export const PLANNING = {
  start: '2026-09-23',            /* the day the window was opened to the guests */
  startWords: '23 September 2026',
  end: COMPLIMENTARY.deadline,    /* the end of 30 November 2026 — the same date, never a second one */
  endWords: COMPLIMENTARY.deadlineWords
};

/* ---- dates, in the site's own words --------------------------------------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function parseDay(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; }
function toUTC(p) { return Date.UTC(p.y, p.mo - 1, p.d); }
function fromUTC(ms) { const d = new Date(ms); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
function iso(p) { return p.y + '-' + String(p.mo).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); }
function dayWords(p, withYear) { return String(p.d).padStart(2, '0') + ' ' + MONTHS[p.mo - 1] + (withYear ? ' ' + p.y : ''); }

/* ---- the deadline --------------------------------------------------------- */
/* the guest's own day: a date is compared as a day, never as a timestamp, so a
 * guest in Vientiane and a guest in Berlin read the same state on the same date */
function dayOf(now) {
  const d = now instanceof Date ? now : new Date(now || Date.now());
  return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() };
}
export function daysUntilDeadline(now) {
  const today = toUTC(dayOf(now)), end = toUTC(parseDay(COMPLIMENTARY.deadline));
  return Math.round((end - today) / 86400000);
}
/* 'open' (days > 0) · 'last-day' (the 30th itself) · 'closed' (after it) */
export function deadlineState(now) {
  const days = daysUntilDeadline(now);
  const phase = days > 0 ? 'open' : days === 0 ? 'last-day' : 'closed';
  return {
    phase, days: Math.max(0, days), deadline: COMPLIMENTARY.deadline, deadlineWords: COMPLIMENTARY.deadlineWords,
    open: phase !== 'closed',
    words: phase === 'closed' ? 'Accommodation planning closed'
      : phase === 'last-day' ? 'Last day'
      : days === 1 ? '1 day remaining' : days + ' days remaining'
  };
}
/* WHERE TODAY STANDS IN THE PLANNING WINDOW (Owner, 23 Sep 2026): 0 before it
 * opens, 1 at the end of the deadline day, and the elapsed share of real days
 * in between — the deadline day itself counts, so the window ends at the end of
 * 30 November. Never the allocation: capacity is the ring's to say. */
export function planningProgress(now) {
  const today = toUTC(dayOf(now));
  const start = toUTC(parseDay(PLANNING.start));
  /* the window closes at the END of the deadline day: one more day than the difference */
  const end = toUTC(parseDay(PLANNING.end)) + 86400000;
  if (today <= start) return 0;
  if (today >= end) return 1;
  return (today - start) / (end - start);
}
/* the whole window, as a surface needs it: the two ends in words and where today stands */
export function planningWindow(now) {
  const d = deadlineState(now);
  return {
    start: PLANNING.start, startWords: PLANNING.startWords,
    end: PLANNING.end, endWords: PLANNING.endWords,
    progress: planningProgress(now), phase: d.phase, days: d.days, open: d.open, words: d.words
  };
}
/* may a NEW complimentary place be claimed at this moment? A guest who already
 * holds one keeps it whatever the date says. */
export function mayClaimComplimentary(now, remaining) {
  const d = deadlineState(now);
  if (!d.open) return { ok: false, reason: 'closed', state: d };
  if (typeof remaining === 'number' && remaining <= 0) return { ok: false, reason: 'full', state: d };
  return { ok: true, reason: null, state: d };
}
/* the words a surface shows for the complimentary allocation — one sentence,
 * factual, never scarcity marketing */
export function complimentaryWords(remaining, max, now) {
  const d = deadlineState(now);
  if (!d.open) return { state: 'closed', headline: 'Complimentary accommodation planning closed', detail: 'Planning closed on ' + COMPLIMENTARY.deadlineWords + '.' };
  if (!(remaining > 0)) return { state: 'full', headline: 'Complimentary stay fully allocated', detail: 'All ' + max + ' places are taken.' };
  return {
    state: remaining === 1 ? 'one-left' : 'available',
    headline: remaining + ' of ' + max + ' places remaining',
    detail: 'Available until ' + COMPLIMENTARY.deadlineWords + ' or until fully allocated.'
  };
}
