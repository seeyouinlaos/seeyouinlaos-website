/* ============================================================================
   H&S WEDDING 2027 — PAYMENT ROUTING AND THE PAYMENT PREFERENCE
   (Owner, 5 Oct 2026 · corrected the same day) · Freeze · L, M.

   THE APPROVED ROUTING (final Owner decision, 5 Oct 2026)
     Thai               default PROMPTPAY_THB
     every non-Thai     default PAYPAL_EUR   · SEPA_EUR also available
     Suthep himself     PAYPAL_EUR           · SEPA_EUR also available
     Haruthai           PROMPTPAY_THB
   Destinations: PAYPAL_EUR → Suthep · SEPA_EUR → Suthep · PROMPTPAY_THB → Haruthai.
   Settlement currency: PayPal EUR · SEPA EUR · PromptPay THB. There is no
   PayPal-USD method: SEPA is an ADDITIONAL option beside PayPal, never its
   replacement, and the accounting currency of every statement stays USD.

   WHERE THE ROUTE COMES FROM, in this order
     1. the couple themselves — the two BILLING_ADMIN invitations (admin.js);
     2. an explicit Owner decision for a named invitation (OWNER_HOLDER_ROUTE),
        given where the register cannot answer;
     3. the guest register: Google 006_Guestlist, column "Nationality", for the
        person the invitation names (auth index · c = the 006 ID). No
        billing-specific nationality field exists or is created.
     4. THE GUEST'S OWN WORD (Owners, 18 Nov 2026 — "Registrierung nutzen"):
        where the person's 006 row holds NO nationality, the nationality the
        guest stated in their own SENT registration routes — read in the order
        Guest Relations' e-mail reads it (registration.personal, then
        guestRecord.contact, then registration.contact) and with a stricter
        rule than the register's (registrationNationalityKind: free text).
        006 always wins where it holds one; a person 006 does not hold is not
        routed by it; Thai beside any other word, a word not recognised, the
        guest's current contact naming another nationality, or a store that
        cannot be read, stay undetermined.

   WHAT IS NEVER GUESSED. A blank nationality (in 006 and in the guest's own sent
   registration), a person the register does not hold, and a mixed entry that
   includes Thai leave the route UNDETERMINED unless an explicit person-level
   decision covers it (the couple; INV-G023):
   nothing is chosen for the guest and the statement cannot be issued until a
   BILLING_ADMIN states the method. A mixed entry WITHOUT Thai is non-Thai.

   CHANGE AND LOCK. The Holder may switch between the methods their route
   offers until the first VERIFIED payment of the settlement; from then on the
   method is locked. An issued revision carries the method, its currency and
   its recipient in its own snapshot, and is converted only with its own
   frozen FX.

   This module decides nothing about money. It names a method, its currency
   and where the money goes.
   ========================================================================== */

import { PAYMENT_CHANNEL, CHANNEL_CURRENCY, ENTRY_TYPE, RECORD_STATUS } from './model.js';
import { BILLING_ADMINS } from './admin.js';

const clean = (v) => String(v == null ? '' : v).trim();
const { PROMPTPAY_THB, PAYPAL_EUR, SEPA_EUR } = PAYMENT_CHANNEL;

/** The two approved routes: a default method and the methods a Holder may pick. */
export const PAYMENT_ROUTE = Object.freeze({
  EUR: Object.freeze({ route: 'EUR', default: PAYPAL_EUR, options: Object.freeze([PAYPAL_EUR, SEPA_EUR]) }),
  THB: Object.freeze({ route: 'THB', default: PROMPTPAY_THB, options: Object.freeze([PROMPTPAY_THB]) }),
});

/**
 * Where each method's money goes. The SEPA account itself is configuration,
 * not source: it is read from the Worker secret BILLING_SEPA_IBAN, so no bank
 * account number is ever part of this public repository. At release the value
 * is piped from the gitignored src/billing-payment-destinations.private.json
 * into `wrangler secret put BILLING_SEPA_IBAN` — never typed, echoed, logged or
 * passed as an argument. An issued snapshot never holds it.
 */
export const CHANNEL_DESTINATION = Object.freeze({
  PAYPAL_EUR: Object.freeze({ recipient: 'Suthep', currency: 'EUR' }),
  /* the account holder's full name (Owner, 7 Oct 2026 · closeout) — the SEPA beneficiary as the bank knows it */
  SEPA_EUR: Object.freeze({ recipient: 'Suthep Thongantang', currency: 'EUR', accountFrom: 'BILLING_SEPA_IBAN' }),
  PROMPTPAY_THB: Object.freeze({ recipient: 'Haruthai', currency: 'THB' }),
});

/* the couple themselves, by their BILLING_ADMIN role: G = Suthep, B = Haruthai */
const ROLE_ROUTE = Object.freeze({ G: 'EUR', B: 'THB' });

/* Explicit Owner decisions (5 Oct 2026) for invitations the register cannot
 * route on its own: a mixed nationality including Thai (INV-G023) and a blank one
 * (INV-G071). Never extended by inference to anyone else. */
export const OWNER_HOLDER_ROUTE = Object.freeze({
  'INV-G023': 'THB',
  'INV-G071': 'EUR',
});

/* the register's spellings of Thai, as entered; every other nationality is non-Thai */
const THAI = /^(thai|thailand|thailändisch|thailaendisch|thailänder|thailaender)$/i;

export const PREFERENCE_SOURCE = Object.freeze({
  DEFAULT_ROUTING: 'DEFAULT_ROUTING',
  HOLDER: 'HOLDER',
  BILLING_ADMIN: 'BILLING_ADMIN',
});

export const isChannel = (v) => Object.prototype.hasOwnProperty.call(PAYMENT_CHANNEL, clean(v));
export const currencyOf = (channel) => (isChannel(channel) ? CHANNEL_CURRENCY[clean(channel)] : null);

/** What the register's Nationality says about the route: THAI, NON_THAI, or why neither. */
export function nationalityKind(nationality) {
  if (!nationality || !nationality.found) {
    return { kind: null, reason: (nationality && nationality.reason) || 'PERSON_NOT_IN_REGISTER' };
  }
  const raw = clean(nationality.value);
  if (!raw) return { kind: null, reason: 'NATIONALITY_MISSING' };
  const parts = raw.split(/\s*(?:,|\/|;|&|\+|\band\b|\bund\b)\s*/i).map(clean).filter(Boolean);
  if (!parts.length) return { kind: null, reason: 'NATIONALITY_MISSING' };
  const thai = parts.filter((p) => THAI.test(p)).length;
  if (thai === parts.length) return { kind: 'THAI', reason: null };
  /* Thai together with another nationality is decided per person, never by rule */
  if (thai > 0) return { kind: null, reason: 'NATIONALITY_MIXED_WITH_THAI' };
  return { kind: 'NON_THAI', reason: null };
}

/**
 * The approved route of one Holder: { route, default, options, basis } or
 * { route: null, reason } when it cannot be determined without a guess.
 */
export function routeFor({ holderId, nationality, stated }) {
  const id = clean(holderId);
  const admin = BILLING_ADMINS.find((a) => a.invitationId === id);
  if (admin && ROLE_ROUTE[admin.role]) return { ...PAYMENT_ROUTE[ROLE_ROUTE[admin.role]], basis: 'OWNER_ROLE' };
  if (OWNER_HOLDER_ROUTE[id]) return { ...PAYMENT_ROUTE[OWNER_HOLDER_ROUTE[id]], basis: 'OWNER_DECISION' };
  const nat = nationalityKind(nationality);
  if (nat.kind === 'THAI') return { ...PAYMENT_ROUTE.THB, basis: 'NATIONALITY_THAI' };
  if (nat.kind === 'NON_THAI') return { ...PAYMENT_ROUTE.EUR, basis: 'NATIONALITY_NON_THAI' };
  /* 4 · the person's 006 row is there but holds no nationality: the guest's own sent registration (Owners, 18 Nov 2026) */
  if (nat.reason === 'NATIONALITY_MISSING' && stated) {
    if (!stated.found) {
      const why = clean(stated.reason);
      return { route: null, default: null, options: [], basis: null, reason: /^REGISTRATION_/.test(why) ? why : nat.reason };
    }
    const own = registrationNationalityKind(stated.value);
    if (own.kind === 'THAI') return { ...PAYMENT_ROUTE.THB, basis: 'REGISTRATION_THAI' };
    if (own.kind === 'NON_THAI') return { ...PAYMENT_ROUTE.EUR, basis: 'REGISTRATION_NON_THAI' };
    return { route: null, default: null, options: [], basis: null, reason: own.reason };
  }
  return { route: null, default: null, options: [], basis: null, reason: nat.reason };
}

/* THE GUEST'S FREE TEXT (Owners, 18 Nov 2026): stricter than the register's spellings — THB only for a word that IS "Thai"
   (English, German or Thai script); undetermined when a Thai word stands beside anything else; EUR only for a plain
   Latin-script nationality that names no Thai and is no placeholder; anything else (another script, a code, "-", "n/a") is
   not routed: Guest Relations states the method. */
const THAI_WORDS = new Set(['thai', 'thailand', 'thailändisch', 'thailaendisch', 'thailänder', 'thailaender', '\u0e44\u0e17\u0e22', '\u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34\u0e44\u0e17\u0e22']);
const PLACEHOLDER = /^(n\/?a|na|none|nil|null|unknown|unbekannt|tbd|tba|kein|keine|no|-+|\?+|\.+)$/i;
export function registrationNationalityKind(value) {
  const raw = clean(value);
  if (!raw || PLACEHOLDER.test(raw)) return { kind: null, reason: 'NATIONALITY_MISSING' };
  const parts = raw.toLowerCase().split(/[\s,\/;&+\-()\[\]]+|\band\b|\bund\b|\u0e41\u0e25\u0e30/).map(clean).filter(Boolean);
  if (!parts.length) return { kind: null, reason: 'NATIONALITY_MISSING' };
  const thai = parts.filter((p) => THAI_WORDS.has(p)).length;
  if (thai === parts.length) return { kind: 'THAI', reason: null };
  if (thai > 0 || /thai|\u0e44\u0e17\u0e22/i.test(raw)) return { kind: null, reason: 'NATIONALITY_MIXED_WITH_THAI' };
  /* Thai in another language or as a code (Thaï, Tailandés, Tailandese, THA, Siamese) is never read as non-Thai */
  if (/thai|tailand|\btha\b|siam/i.test(raw.normalize('NFD').replace(/\p{M}/gu, ''))) return { kind: null, reason: 'REGISTRATION_NATIONALITY_UNRECOGNISED' };
  if (!/^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff'.\s,\/;&+\-()]+$/.test(raw) || parts.some((p) => PLACEHOLDER.test(p) || /\d/.test(p))
      || !parts.some((p) => /[a-z\u00e0-\u00ff]{3,}/.test(p))) {
    return { kind: null, reason: 'REGISTRATION_NATIONALITY_UNRECOGNISED' };
  }
  return { kind: 'NON_THAI', reason: null };
}

/**
 * THE GUEST'S OWN WORD, read from what the guest SENT (Owners, 18 Nov 2026): the sent registration record (`reg:<invitation>`)
 * and the contact under the same invitation (`contact:<invitation>`), both as stored — for the person this invitation names
 * only. Answers { found, value } or { found: false, reason } — never a guess:
 *   a store that cannot be read → REGISTRATION_UNREADABLE · no sent registration → NOT_SENT · a record of another person →
 *   REGISTRATION_OTHER_PERSON · the current contact naming another nationality → REGISTRATION_NATIONALITY_CONFLICT ·
 *   nothing stated → NATIONALITY_MISSING. The contact is a check only; the value is always the one SENT.
 */
export function statedNationality({ record, contact, guestId, contactId, unreadable }) {
  if (unreadable) return { found: false, value: null, reason: 'REGISTRATION_UNREADABLE' };
  const reg = record && record.registration && typeof record.registration === 'object' ? record.registration : null;
  if (!reg || !clean(record.submissionId)) return { found: false, value: null, reason: 'NOT_SENT' };
  const g = clean(guestId), cid = clean(contactId);
  const personal = reg.personal && typeof reg.personal === 'object' ? reg.personal : {};
  const ids = [record.guestId, reg.guestId, personal.guestId].map(clean).filter(Boolean);
  if (!g || !ids.length || ids.some((x) => x !== g) || (clean(reg.contactId) && cid && clean(reg.contactId) !== cid)) {
    return { found: false, value: null, reason: 'REGISTRATION_OTHER_PERSON' };
  }
  /* what was SENT, in the order Guest Relations' e-mail reads it (src/mail-templates.js) */
  const gr = reg.guestRecord && typeof reg.guestRecord === 'object' ? reg.guestRecord : {};
  const gc = gr.contact && typeof gr.contact === 'object' ? gr.contact : {};
  const rc = reg.contact && typeof reg.contact === 'object' ? reg.contact : {};
  const sent = clean(personal.nationality) || clean(gc.nationality) || clean(rc.nationality);
  if (!sent) return { found: false, value: null, reason: 'NATIONALITY_MISSING' };
  /* the guest's current contact is a check, never a source: naming another nationality now, it leaves the route to Guest Relations */
  const now = contact && typeof contact === 'object' && (!clean(contact.guestId) || clean(contact.guestId) === g) ? clean(contact.nationality) : '';
  if (now) {
    const a = registrationNationalityKind(sent), b = registrationNationalityKind(now);
    if (a.kind !== b.kind || a.reason !== b.reason) return { found: false, value: null, reason: 'REGISTRATION_NATIONALITY_CONFLICT' };
  }
  return { found: true, value: sent, reason: null };
}

/**
 * The method in force for one Holder.
 *   record — the ledger's stored preference ({ Payment_Preference, source, lockedAt … }) or null
 *   route  — routeFor(...)
 * A stored approved method always wins: once chosen or frozen at issue, a later
 * change in the register can never switch it silently.
 */
export function effectivePreference({ record, route }) {
  const r = route || { route: null, options: [], reason: 'NOT_ROUTED' };
  const stored = record && isChannel(record.Payment_Preference) ? clean(record.Payment_Preference) : null;
  const locked = !!(record && clean(record.lockedAt));
  const options = r.route ? [...r.options] : (stored ? [stored] : []);
  if (stored) {
    return { channel: stored, currency: CHANNEL_CURRENCY[stored], source: clean(record.source) || null,
      stored: true, locked, determined: true, reason: null, route: r.route, basis: r.basis || null, options };
  }
  if (r.route) {
    return { channel: r.default, currency: CHANNEL_CURRENCY[r.default], source: PREFERENCE_SOURCE.DEFAULT_ROUTING,
      stored: false, locked, determined: true, reason: null, route: r.route, basis: r.basis, options };
  }
  return { channel: null, currency: null, source: null, stored: false, locked, determined: false,
    reason: r.reason || 'NOT_ROUTED', route: null, basis: null, options };
}

/** Where a method's money goes, with the SEPA account taken from the Worker's configuration. */
export function destinationOf(channel, env) {
  const d = isChannel(channel) ? CHANNEL_DESTINATION[clean(channel)] : null;
  if (!d) return null;
  const out = { method: clean(channel), recipient: d.recipient, currency: d.currency };
  if (d.accountFrom) {
    const iban = clean(env && env[d.accountFrom]).replace(/\s+/g, '');
    out.iban = iban || null;
    out.complete = !!iban;
  } else out.complete = true;
  return out;
}

/**
 * The first VERIFIED payment of a settlement in 008, or null. Only a VERIFIED
 * PAYMENT counts (Freeze · K); a REPORTED or REJECTED row, a REFUND or an
 * ADJUSTMENT never locks the method.
 */
export function firstVerifiedPayment(journalRows, settlementId) {
  const sid = clean(settlementId);
  if (!sid) return null;
  for (const r of Array.isArray(journalRows) ? journalRows : []) {
    if (clean(r && r.Settlement_ID) !== sid) continue;
    if (clean(r.Record_Status) !== RECORD_STATUS.VERIFIED) continue;
    if ((clean(r.Entry_Type) || ENTRY_TYPE.PAYMENT) !== ENTRY_TYPE.PAYMENT) continue;
    return r;
  }
  return null;
}
