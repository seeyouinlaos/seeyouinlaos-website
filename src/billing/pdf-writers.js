/* ============================================================================
   THE STATEMENT PDF WRITERS BY LAYOUT (HS-004.7). 1.2 is the frozen writer, called exactly as every original was produced until 19 Nov
   2026 ({ payment } only — an ID-only original stays one); 1.3 is the current writer with the names frozen at issue.
   ========================================================================== */
import { renderSettlementPdf as render12 } from './pdf-layout-12.js';
import { renderSettlementPdf as render13 } from './pdf.js';
import { LAYOUT_12, LAYOUT_13 } from './pdf-layouts.js';

const WRITERS = Object.freeze({ [LAYOUT_12]: render12, [LAYOUT_13]: render13 });

/** The writer's options for a layout from the stored revision record — 1.2 gets the payment section only, as before. */
export function pdfOptionsFor(layout, rec, payment) {
  if (layout === LAYOUT_12) return { payment };
  if (layout === LAYOUT_13) {
    const r = rec || {};
    return { payment, recipient: r.Recipient || null, persons: r.Person_Names || null, items: r.Item_Words || null, correction: r.Correction || null };
  }
  return null;
}

export function renderIssuedPdf(layout, snapshot, opts) {
  const w = WRITERS[layout];
  if (!w) throw new Error('no writer for layout ' + layout);
  return w(snapshot, opts);
}
