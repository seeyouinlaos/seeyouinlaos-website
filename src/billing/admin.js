/* ============================================================================
   H&S WEDDING 2027 — WHO IS A BILLING ADMIN (Freeze · Y, Z, AB).
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL.

   THE OWNER'S RULE: a generic `hosts === true` check is INSUFFICIENT.
   BILLING_ADMIN resolves server-side to exactly two people, Haruthai and
   Suthep, through the explicit allowlist below.

   WHY THE HOST FLAG ALONE IS NOT AUTHORISATION. `h:1` in the deployed auth
   index is a register flag that says someone stands on the hosting side of
   the wedding, and the site already uses it for content scope: who is asked
   the wedding questions, who is counted apart from the guests, who is not
   listed as RECENTLY JOINED (src/worker.js). It describes a relation to the
   day, not an authority over money. Were BILLING_ADMIN derived from it, any
   future index entry written with `h:1` for a content reason would silently
   become a billing administrator, able to see every Holder's Settlement and
   to stand behind Issue & Publish. The allowlist makes that impossible: the
   set of billing administrators changes only when this file changes, under
   the Freeze, and never as a side effect of register work.

   WHY THE ALLOWLIST IS SAFE TO KEEP IN SOURCE. It holds nothing secret. The
   invitation id, the guest id and the role letter are exactly the fields the
   deployed index (register/auth-index.json, served as a static asset) already
   publishes for all 111 entries; that index deliberately carries no code, no
   bearer and no name. Reading this file therefore tells an attacker only what
   the site already serves. It grants nothing: authorisation still requires a
   valid bearer in `x-siyl-auth` that src/auth.js · identify() resolves, by
   one-way digest, to that same identity. The allowlist narrows an already
   authenticated identity; it can never produce one. For the same reason no
   secret is compared here, so there is no timing concern in this module: the
   only secret in the chain is the bearer, and it is matched in src/auth.js.

   ALL THREE CONDITIONS, NEVER TWO OF THREE. The identity must match an entry
   on the invitation id AND on the guest id AND carry `hosts === true`. The
   two ids are checked separately because they answer different questions
   (Freeze · B: the invitation is the Holder, the guest is the Person), and
   the host flag is kept as a third, independent corroboration from the
   register: if those three ever disagree, the register and the Freeze have
   drifted apart and the honest answer is a refusal, not a guess.

   The refusal never says which condition failed. A caller learns only that
   it is not a billing administrator, so a probe cannot use the response to
   map the allowlist or to confirm a bearer.

   NO ROLE COMES FROM THE REQUEST. identify() returns
   { invitationId, guestId, partyId, hosts } and no role letter, so the role
   is read from the matched allowlist entry, never from the object handed in.
   Nothing a request carries can promote itself.

   NO NAMES. The audit trail records 'BRIDE' or 'GROOM', resolved from the
   register's own role letters B and G, exactly as the couple is resolved for
   the community page. A name is never written by this module.

   A rotated access code mints a new bearer but keeps the invitation id and
   the guest id, so credential rotation leaves this allowlist untouched.

   This module decides nothing financial. It imports no engine, holds no
   amount and computes none.
   ========================================================================== */

import { ROLE } from './model.js';

const clean = (v) => String(v == null ? '' : v).trim();

/**
 * The frozen allowlist. Both entries carry h:1 in the deployed index.
 *   INV-G048 / G048 / 'B' — Haruthai (BRIDE)
 *   INV-G049 / G049 / 'G' — Suthep  (GROOM)
 */
export const BILLING_ADMINS = Object.freeze([
  Object.freeze({ invitationId: 'INV-G048', guestId: 'G048', role: 'B' }),
  Object.freeze({ invitationId: 'INV-G049', guestId: 'G049', role: 'G' }),
]);

/** Freeze · Z — the audit label, never a name. */
const ROLE_LABEL = Object.freeze({ B: 'BRIDE', G: 'GROOM' });

/** The one place the three conditions are evaluated. Returns the matched
 *  allowlist entry or null; every export below is a reading of this. */
function matchedAdmin(identity) {
  if (!identity || typeof identity !== 'object') return null;
  if (identity.hosts !== true) return null;                 /* strictly true, never merely truthy */
  const invitationId = clean(identity.invitationId);
  const guestId = clean(identity.guestId);
  if (!invitationId || !guestId) return null;
  for (const admin of BILLING_ADMINS) {
    if (admin.invitationId === invitationId && admin.guestId === guestId) return admin;
  }
  return null;
}

/** True only for an identity that satisfies all three conditions. */
export function isBillingAdmin(identity) {
  return matchedAdmin(identity) !== null;
}

/**
 * The authorisation gate for every billing route and every billing view.
 * Returns { ok:true, admin } or { ok:false, status:403, error }.
 *
 * 403 for a missing identity too: by the time this is called src/auth.js has
 * already had its say, and a caller with no valid bearer must not be able to
 * tell itself apart, by status code, from a guest who simply is not an admin.
 */
export function requireBillingAdmin(identity) {
  const admin = matchedAdmin(identity);
  if (!admin) return { ok: false, status: 403, error: 'BILLING_ADMIN required' };
  return {
    ok: true,
    admin: Object.freeze({
      invitationId: admin.invitationId,
      guestId: admin.guestId,
      role: admin.role,
      label: ROLE_LABEL[admin.role] || null,
    }),
  };
}

/** Freeze · Y — the actor role to record on an entry this identity causes. */
export function roleOf(identity) {
  return matchedAdmin(identity) ? ROLE.BILLING_ADMIN : ROLE.GUEST;
}

/** 'BRIDE' / 'GROOM' for the audit trail; null for anyone else. */
export function adminLabel(identity) {
  const admin = matchedAdmin(identity);
  return admin ? (ROLE_LABEL[admin.role] || null) : null;
}
