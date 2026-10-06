/* ============================================================================
   GUEST RELATIONS' CONFIRMATION OF A SENT TRIP — the one rule.

   Guest Relations confirms a SENT VERSION (OQ-27 · PRQ-04-04): the stored
   confirmation names the version it confirmed, so a later send lapses it until
   Guest Relations confirms again. The Worker's status views and the Guest
   Settlement's Confirmed Booking (src/billing/bookings.js · Freeze · A) read
   the same rule from here, so the two can never disagree on what is confirmed.
   ========================================================================== */

export function confirmationStands(conf, record) {
  if (!conf || !conf.confirmedAt) return false;
  if (!record || !record.submissionId) return true;   /* nothing sent to compare with: the confirmation as stored */
  if (conf.version != null) return Number(conf.version) === Number(record.version || 1);
  const last = record.lastSentAt || record.submittedAt || '';
  return !last || String(conf.confirmedAt) >= String(last);
}
