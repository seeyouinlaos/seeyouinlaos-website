/* ============================================================================
   GUEST RELATIONS' CONFIRMATION OF A SENT TRIP — the one rule, the one record.

   Guest Relations confirms a SENT VERSION (OQ-27 · PRQ-04-04): the stored
   confirmation names the version it confirmed, so a later send lapses it until
   Guest Relations confirms again. The Worker's status views and the Guest
   Settlement's Confirmed Booking (src/billing/bookings.js · Freeze · A) read
   the same rule from here, so the two can never disagree on what is confirmed.

   ONE RECORD, TWO HANDS (Owner, 7 Oct 2026). `conf:<inv>` is written only by
   `writeConfirmation` below: by Guest Relations' endpoint (worker.js ·
   /api/confirm) and by Haruthai or Suthep from the admin console
   (billing-routes.js · admin/confirm). Both write the same record with the same
   history, so a confirmation counts the same for billing whoever made it; the
   record names who (actor), in which capacity (role) and from where (source).
   ========================================================================== */

export function confirmationStands(conf, record) {
  if (!conf || !conf.confirmedAt) return false;
  if (!record || !record.submissionId) return true;   /* nothing sent to compare with: the confirmation as stored */
  /* a confirmation that names its journey stands only for that journey: after a reset the guest's new first send is
     version 1 again, and a confirmation of the journey before it never confirms that one (review, 7 Oct 2026) */
  if (conf.submissionId && String(conf.submissionId) !== String(record.submissionId)) return false;
  if (conf.version != null) return Number(conf.version) === Number(record.version || 1);
  const last = record.lastSentAt || record.submittedAt || '';
  return !last || String(conf.confirmedAt) >= String(last);
}

/** Who may confirm, as the record names it. */
export const CONFIRMATION_ROLE = Object.freeze({ GUEST_RELATIONS: 'GUEST_RELATIONS', BILLING_ADMIN: 'BILLING_ADMIN' });

/**
 * THE ONE WRITE of a confirmation (or its withdrawal) for one invitation.
 *   record  — the stored `reg:<inv>` as read just before (null: nothing sent)
 *   current — the stored `conf:<inv>` as read just before (null: none)
 *   extra   — fields kept on the record beside the standard ones (the admin console's submission reference)
 * Idempotent: confirming the version already confirmed, or withdrawing nothing, writes nothing.
 * Returns { unchanged, conf, at }.
 */
export async function writeConfirmation(kv, { invitationId, action, actor, role, source, note, record, current, extra }) {
  const was = current && typeof current === 'object' ? current : { invitationId, confirmedAt: null, history: [] };
  const confirm = action !== 'unconfirm';
  if (confirm && was.confirmedAt && confirmationStands(was, record)) return { unchanged: true, conf: was, at: null };
  if (!confirm && !was.confirmedAt) return { unchanged: true, conf: was, at: null };
  const now = new Date().toISOString();
  const version = record && record.submissionId ? (record.version || 1) : null;
  const sentAt = record ? (record.lastSentAt || record.submittedAt || null) : null;
  const next = {
    /* the caller's fields first: they can never stand in for the ones below */
    ...(confirm && extra && typeof extra === 'object' ? extra : {}),
    invitationId,
    confirmedAt: confirm ? now : null,
    version: confirm ? version : null, sentAt: confirm ? sentAt : null,
    submissionId: confirm && record && record.submissionId ? String(record.submissionId) : null,
    actor, role, source, note,
    history: (Array.isArray(was.history) ? was.history : [])
      .concat([{ action: confirm ? 'confirm' : 'unconfirm', at: now, actor, role, source, note, version: confirm ? version : null }]).slice(-20),
  };
  await kv.put('conf:' + invitationId, JSON.stringify(next), { metadata: { invitationId, confirmedAt: next.confirmedAt, version: next.version } });
  return { unchanged: false, conf: next, at: now };
}
