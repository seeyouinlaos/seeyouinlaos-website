/* ============================================================================
   THE STATEMENT PDF LAYOUTS (Owners, 19 Nov 2026 · HS-004.7). A layout change never changes a historical original: every issued revision
   keeps the layout it was issued with — also when its PDF has never been downloaded yet. A revision issued before layouts were recorded
   carries none and is rendered by the frozen 1.2 writer (src/billing/pdf-layout-12.js, a byte copy of the writer that produced every
   original until then). No writer code lives here: the ledger and the dispatcher both read these lists.
   ========================================================================== */
export const LAYOUT_12 = 'guest-settlement-pdf/1.2';
export const LAYOUT_13 = 'guest-settlement-pdf/1.3';
/* every layout a stored revision may name (reading and dispatch) */
export const KNOWN_LAYOUTS = Object.freeze([LAYOUT_12, LAYOUT_13]);
/* the layouts a NEW issue may freeze: only those that print the recipient's and the persons' names (HS-004.6) */
export const ISSUE_LAYOUTS = Object.freeze([LAYOUT_13]);
/* a revision without a recorded layout (every revision issued before this release) */
export const LEGACY_LAYOUT = LAYOUT_12;
/* what a revision issued from now on is stamped with */
export const CURRENT_LAYOUT = LAYOUT_13;
/* THE ISSUE DATE (Owners, HS-PROMPT-013 Nr. 12): no corrected statement is dated before 21 November 2026, and no statement is backdated.
   `floor` and `today` are read at every issue (the ledger and the route); the test suites move them to issue their synthetic
   statements on the days those are set. */
/* Owners, HS-PROMPT-034 (19 Nov 2026): the 21 Nov floor is lifted — a correction is issued with the actual day of its issue; no
   statement is ever backdated (today) */
export const ISSUE_RULES = { floor: '', today: () => new Date().toISOString().slice(0, 10) };

const clean = (v) => String(v == null ? '' : v).trim();
/** The layout a stored revision record renders with: its own; none recorded → 1.2; anything else → null (refused, never the newest). */
export function layoutOfRevision(rec) {
  const l = clean(rec && rec.Pdf_Layout);
  if (!l) return LEGACY_LAYOUT;
  return KNOWN_LAYOUTS.includes(l) ? l : null;
}
