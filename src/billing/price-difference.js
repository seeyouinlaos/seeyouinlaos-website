/* ============================================================================
   AS SENT, AND TODAY (Owner, 8 Oct 2026 · production safety) — the amounts a guest was sent, beside the Billing Engine's
   amounts today, line by line, before Guest Relations confirms a trip and before a statement is issued.

   DISPLAY ONLY. A sent amount is never an input to any figure: the engine stays the only derivation, and nothing historical —
   a sent record, an e-mail, a confirmation, an issued statement — is ever changed here.

     · the lines: the sent selection through the engine's own filter (bookings.js · selectionLinesOf), paired by position
       with the engine's result for exactly those lines (calculate keeps the order)
     · compared: every line H&S charges or reviews — all but a stay the guest pays the provider (block B), which carries the
       hotel's informational price and is not compared unless the sent trip said Haruthai & Suthep paid it (paidByHS).
     · outcomes: MATCH · DIFFERENT (in cents) · PAYER_CHANGED (sent as paid by H&S and now the guest's own, or the reverse) ·
       NOT_COMPARABLE (no amount on one side: a price to follow, a line under review — never read as zero)
     · material: any DIFFERENT or PAYER_CHANGED line, or lines the engine did not price one for one. The digest binds an
       acknowledgement to exactly this comparison.
   ========================================================================== */
import { selectionLinesOf, siteKeyOfSelection } from './bookings.js';

export const OUTCOME = Object.freeze({ MATCH: 'MATCH', DIFFERENT: 'DIFFERENT', PAYER_CHANGED: 'PAYER_CHANGED', NOT_COMPARABLE: 'NOT_COMPARABLE' });

const centsOfStated = (price, qty) => {
  if (price == null || String(price).trim() === '') return null;
  const n = Number(price);
  return Number.isFinite(n) ? Math.round(n * (Number(qty) > 0 ? Number(qty) : 1) * 100) : null;
};

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** { material, lines[], statedCents, engineCents, digest } — `result` is the engine's calculate() for these same selections. */
export async function priceDifference({ selections, result }) {
  const sent = selectionLinesOf(selections);
  const engine = (result && Array.isArray(result.lines)) ? result.lines : [];
  const lines = [];
  let statedCents = 0, engineCents = 0, material = false;
  if (sent.length !== engine.length) {
    material = true;
    lines.push({ key: null, outcome: OUTCOME.NOT_COMPARABLE, why: 'the engine priced ' + engine.length + ' line(s) for ' + sent.length + ' sent line(s)' });
  } else {
    sent.forEach((s, i) => {
      const e = engine[i];
      const paidSent = !!s.paidByHS;
      const paidNow = !!(e.categoryOverride || e.Category_Override_From);
      const guestsOwn = e.block === 'B';
      if (guestsOwn && !paidSent) return;   /* the guest's own, with the provider: not an H&S amount */
      const stated = centsOfStated(s.price, s.qty);
      const now = e.review || e.amountCents == null ? null : e.amountCents;
      const line = { key: siteKeyOfSelection(s), Item_ID: e.Item_ID || null, stated, engine: now,
        sentPaidByHS: paidSent, enginePaidByHS: paidNow, engineBlock: e.block || null };
      /* the payer changed only where the engine says so: paid by H&S now (and not as sent), or the guest's own now */
      if (paidSent !== paidNow || (paidSent && guestsOwn)) { line.outcome = OUTCOME.PAYER_CHANGED; material = true; }
      else if (stated == null || now == null) line.outcome = OUTCOME.NOT_COMPARABLE;
      else if (stated !== now) { line.outcome = OUTCOME.DIFFERENT; material = true; }
      else line.outcome = OUTCOME.MATCH;
      if (stated != null && now != null) { statedCents += stated; engineCents += now; }
      lines.push(line);
    });
  }
  const digest = await sha256(JSON.stringify(lines.map((l) => [l.key, l.Item_ID, l.outcome, l.stated, l.engine, l.sentPaidByHS, l.enginePaidByHS])));
  return { material, lines, statedCents, engineCents, digest };
}
