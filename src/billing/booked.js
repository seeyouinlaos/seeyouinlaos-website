/* ============================================================================
   H&S WEDDING 2027 — BOOKED VALUE (Owner, 7 Oct 2026 · the admin console).

   WHAT A GUEST HAS SELECTED NOW, AND WHAT IT IS WORTH NOW — for Haruthai and
   Suthep to see before anything is sent, confirmed or issued. DISPLAY ONLY:
   nothing here is a billing source (Freeze · A stays as it is — a statement is
   only ever built from the Confirmed Booking, src/billing/bookings.js). It is
   never stored, never issued, never summed into revenue, and it never makes a
   guest issuable.

   THE SELECTION, in this order:
     1. CURRENT_SELECTION — the guest's own saved trip (the Drafts actor of the
        invitation, the authoritative copy; its KV mirror only where no actor is
        bound): the lines in My Bag as the guest left them, sent or not;
     2. SENT_VERSION — the version of the trip the guest sent, when no saved
        trip exists any more;
     3. NONE — nothing selected.
   WHAT A READ TOUCHES. Nothing of this feature is written anywhere. Reading the
   saved trip asks the invitation's Drafts actor exactly as the guest's own page
   does; on an actor's very first read that actor records its own one-time seed
   marker (src/drafts.js · current) — the same idempotent step any first read
   takes, never a booking, a figure or a change to the trip.
   The amount is the Billing Engine's (src/billing/engine.js) on today's 002/009,
   through the SAME line mapping as the Confirmed Booking (bookingsOfSelections):
   no amount is taken from the browser, from a sent e-mail or from a statement.
   ========================================================================== */

import { bookingsOfSelections, unmappedProducts } from './bookings.js';
import { calculate } from './engine.js';
import { SourceDataError } from './source.js';

const clean = (v) => String(v == null ? '' : v).trim();
export const BOOKED_SOURCE = Object.freeze({ CURRENT: 'CURRENT_SELECTION', SENT: 'SENT_VERSION', NONE: 'NONE' });

/* the guest's saved trip: the invitation's own Drafts actor, else (no actor bound) its KV mirror */
async function savedTrip(env, holderId) {
  if (env.DRAFTS) {
    let r;
    try {
      const stub = env.DRAFTS.get(env.DRAFTS.idFromName(holderId));
      const res = await stub.fetch(new Request('https://drafts/get', { method: 'POST', body: JSON.stringify({ invitationId: holderId }) }));
      r = await res.json();
    } catch (e) {
      throw new SourceDataError('DRAFT_UNREADABLE', 'the saved trip of ' + holderId + ' could not be read: ' + clean(e && e.message).slice(0, 120));
    }
    if (!r || r.ok !== true) throw new SourceDataError('DRAFT_UNREADABLE', 'the saved trip of ' + holderId + ' is not readable just now');
    return r.draft || null;
  }
  if (!env.REG_KV) throw new SourceDataError('DRAFT_UNAVAILABLE', 'no trip store is bound');
  const raw = await env.REG_KV.get('draft:' + holderId);
  if (raw == null || raw === '') return null;
  try { return JSON.parse(raw); } catch (e) { throw new SourceDataError('DRAFT_UNREADABLE', 'the saved trip of ' + holderId + ' is not readable'); }
}
/* the version this invitation sent, or null */
async function sentTrip(env, holderId) {
  if (!env.REG_KV) return null;
  const raw = await env.REG_KV.get('reg:' + holderId);
  if (raw == null || raw === '') return null;
  try { return JSON.parse(raw); } catch (e) { throw new SourceDataError('REGISTRATION_UNREADABLE', 'the sent trip of ' + holderId + ' is not readable'); }
}
/* the bag lines of a saved trip: a key holds its JSON as a string */
function bagOf(draft, holderId) {
  const v = draft && draft.keys ? draft.keys['siyl.bag'] : undefined;
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v;
  try { const b = JSON.parse(v); return Array.isArray(b) ? b : []; }
  catch (e) { throw new SourceDataError('DRAFT_UNREADABLE', 'the bag of ' + holderId + ' is not readable'); }
}

/** The selection a guest's Booked value stands on — see the order above. */
export async function loadBookedSelection({ env, holderId, withSent }) {
  const holder = clean(holderId);
  const draft = await savedTrip(env, holder);
  const rec = (withSent || !draft) ? await sentTrip(env, holder) : null;
  const sent = rec && rec.submissionId && rec.registration && typeof rec.registration === 'object'
    ? { version: Number(rec.version || 1), lastSentAt: clean(rec.lastSentAt || rec.submittedAt) || null,
      selections: Array.isArray(rec.registration.selections) ? rec.registration.selections : [] } : null;
  if (draft) return { source: BOOKED_SOURCE.CURRENT, selections: bagOf(draft, holder), updatedAt: clean(draft.updatedAt) || null, sent };
  if (sent) return { source: BOOKED_SOURCE.SENT, selections: sent.selections, updatedAt: sent.lastSentAt, sent };
  return { source: BOOKED_SOURCE.NONE, selections: [], updatedAt: null, sent: null };
}

/** The engine's answer for a list of selected lines of one person, on the given pricing source, with the selected
    products that have no 002 item (`unmapped`). Never stored. */
export async function priceSelection({ holderId, personId, selections, items, specialRates, asOf, source }) {
  const bookings = await bookingsOfSelections({ holderId, personId, selections, items, source });
  return { ...calculate(bookings, { items, specialRates, asOf }), unmapped: unmappedProducts(bookings) };
}
