/* ============================================================================
   HS-035 P1 · THE ADMIN GUEST PROFILE (Owners, 21 Nov 2026) — one guest, read only, for Haruthai and Suthep.

   Pure: no I/O. src/worker.js gathers the reads of ONE invitation (profileOf) and src/billing-routes.js serves the
   result to the BILLING_ADMINs only (GET admin/profile). The trip "as sent" is read exactly as the Guest Relations
   e-mail reads it (src/mail-templates.js · journeyModel), so the profile and the e-mail never disagree.

   AN ALLOWLIST, NEVER A PASS-THROUGH: every field below is named. Nothing of the stored record goes out as a whole —
     · no amount (price, rate, total): the money is the Finance view's (the Billing Engine, Google 002/009), never a
       second figure here;
     · no invitation code, no bearer, no mail-provider data, no e-mail text, no recipient object, no fingerprint;
     · no document file name, storage key, size or type — a document is its kind and the day it was received (E34).
   A read that failed is said as such ("could not be checked"), never shown as a fact.
   ========================================================================== */
import { journeyModel, recoverySections, seatLabel } from './mail-templates.js';
import { PROFILE as Q_PROFILE, profileValue, display, displayList } from './questionnaire.js';

const str = (v, max) => { const s = v == null ? '' : String(v).trim(); return max ? s.slice(0, max) : s; };
const STAGE_NAMES = {
  'bkk-stay': 'Bangkok · Before the Wedding', prewed: 'Vientiane · Pre-Wedding Stay', wedstay: 'Vientiane · Wedding Stay',
  guesthouse: 'Vientiane · Wedding Stay', kmg: 'Kunming', ljg: 'Lijiang', kempinski: 'Bangkok · Hotel Muse',
};
const STAGE_ORDER = ['bkk-stay', 'prewed', 'wedstay', 'guesthouse', 'kmg', 'ljg', 'kempinski'];

/* a seat id as the guests know it (A12, D3 …); the couple's own places by their word */
function seatOf(id) {
  const s = str(id);
  if (!s) return null;
  if (s === 'BRIDE' || s === 'GROOM') return { id: s, label: s === 'BRIDE' ? 'Bride' : 'Groom' };
  return { id: s, label: seatLabel(s) || s };
}

/* the answers of one answer set (a sent record's or a draft's), by the questionnaire's own labels and display forms */
function answersOf(profile) {
  return Q_PROFILE.map((q) => {
    const v = profileValue(profile, q);
    const value = Array.isArray(v) ? displayList(v) : display(v);
    return { key: q.key, label: q.label, wedding: !!q.wedding, value: str(value, 400) };
  });
}
function allergyOf(a) {
  const answer = a && (a.answer === 'yes' || a.answer === 'no') ? a.answer : '';
  return { answer, details: answer === 'yes' ? str(a.details, 600) : '' };
}

/* what the guest sent — journeyModel's reading, field by field, without a single amount */
function sentOf(record) {
  const M = journeyModel(record);
  const R = M.recovery || {}, P = R.personal || {};
  const rows = Object.fromEntries(recoverySections(M).map(([title, list]) => [title, list]));
  const g0 = (((record || {}).registration || {}).guestRecord || {}).guests;
  const profile0 = Array.isArray(g0) && g0[0] ? g0[0].profile : null;
  return {
    reference: str(M.reference), version: Number(M.version) || 1, firstSentAt: str(M.firstSentAt), sentAt: str(M.sentAt), updated: !!M.upd,
    notJoining: !!M.notJoining, away: !!M.away, scope: str(M.scope, 200),
    name: { invitation: str(M.fullName, 160), written: str(R.nameWritten, 160), first: str(P.firstName, 80), last: str(P.lastName, 80) },
    partyName: str(M.partyName, 160),
    contact: { email: str(M.contact.email, 200), phone: str(M.contact.phone, 60), birthdate: str(M.contact.birthdate, 60), nationality: str(M.contact.nationality, 80), address: str(M.contact.address, 400) },
    travel: M.travel.map((t) => ({ name: str(t.name, 160), meta: str(t.meta, 200) })),
    stays: M.stays.map((x) => ({ name: str(x.name, 160), dates: str(x.dates, 120), category: str(x.category, 160), room: str(x.room, 120), breakfast: str(x.breakfast, 160), note: str(x.note, 300), interest: !!x.interest })),
    waitlisted: (M.waitlisted || []).map((w) => ({ name: str(w.name, 160), position: w.position == null ? null : Number(w.position) || null, size: Number(w.size) || 1 })),
    experiences: M.experiences.map((e) => ({ name: str(e.name, 160), meta: str(e.meta, 200), status: str(e.status, 160) })),
    wedding: M.wedding.map((e) => ({ key: e.key, label: e.label, answer: str(e.answer, 60), when: e.when, place: e.place })),
    /* the offering's state without its amount ("Yes · USD 15" reads "Yes") — the money is the Finance view's */
    finale: str(M.finale, 200), sangkhathan: /^Yes\b/.test(str(M.sangkhathanState)) ? 'Yes' : str(M.sangkhathanState, 80),
    seats: { ceremony: str(M.seats.ceremony.label, 40), dinner: str(M.seats.dinner.label, 40) },
    allergy: { answer: M.allergy === 'yes' || M.allergy === 'no' ? M.allergy : '', details: M.allergy === 'yes' ? str(M.allergyDetails, 600) : '' },
    answers: profile0 ? answersOf(profile0) : [],
    acknowledgements: (M.acks || []).map(([k, v]) => ({ label: str(k, 80), value: str(v, 80) })),
    documents: (M.docs || []).map((d) => ({ label: str(d.label, 80), state: str(d.state, 60) })),
    publication: str(M.publication, 160),
    /* the participation and stage answers exactly as the e-mail's recovery copy words them (no amount: those rows carry none) */
    participation: (rows.Participation || []).map(([k, v]) => ({ label: str(k, 160), value: str(v, 160) })),
    stages: (rows['Stage answers'] || []).map(([k, v]) => ({ label: str(k, 160), value: str(v, 160) })),
  };
}

/* the rooms the engine holds for this guest now — a room, or a waiting-list place with its position */
function roomsNow(rooms) {
  if (!rooms || typeof rooms !== 'object') return [];
  const ord = (s) => { const k = STAGE_ORDER.indexOf(s); return k < 0 ? 99 : k; };
  return Object.keys(rooms).sort((a, b) => ord(a) - ord(b) || (a < b ? -1 : 1)).map((stage) => {
    const m = rooms[stage] || {};
    return m.waitlisted
      ? { stage, stageName: STAGE_NAMES[m.stage || stage] || stage, waitlisted: true, position: m.position == null ? null : Number(m.position) || null, size: Number(m.size) || 1 }
      : { stage, stageName: STAGE_NAMES[stage] || stage, waitlisted: false, hotel: str(m.name, 160), room: str(m.room, 120) };
  });
}

/* the current copy of each document: its kind and the day it arrived — never a name, a key, a size or a type */
function documentsNow(docs) {
  if (!Array.isArray(docs)) return null;
  return docs.map((d) => ({ guestId: str(d && d.guestId, 40), kind: d && (d.kind === 'passport' || d.kind === 'flight') ? d.kind : 'other', receivedAt: str(d && d.receivedAt, 40) }));
}

/* the confirmation as Guest Relations and the console know it — standing for the version sent, lapsed by a later send, or none */
function confirmationOf(conf, stands) {
  const c = conf && typeof conf === 'object' ? conf : null;
  const state = c && c.confirmedAt ? (stands ? 'CONFIRMED' : 'LAPSED') : 'NONE';
  const hist = c && Array.isArray(c.history) ? c.history.slice(-20) : [];
  return {
    state, confirmedAt: c ? str(c.confirmedAt) || null : null, version: c && c.version != null ? Number(c.version) : null,
    role: c ? str(c.role, 40) : '', actor: c ? str(c.actor, 80) : '',
    /* a confirmation note names the price-comparison digest it saw ("seen: 1a2b…"): the fact stays, the digest does not */
    history: hist.map((h) => ({ action: h && h.action === 'unconfirm' ? 'unconfirm' : 'confirm', at: str(h && h.at), role: str(h && h.role, 40), actor: str(h && h.actor, 80), note: str(h && h.note, 400).replace(/\s*\(seen: [0-9a-f]+\)/gi, ''), version: h && h.version != null ? Number(h.version) : null })),
  };
}

/**
 * The profile of one invitation.
 *   who      — { invitationId, guestId, partyId, contactId, couple, hosts } from the served index entry
 *   record   — reg:<inv> (null: never sent) · conf — conf:<inv> · stands — confirmationStands(conf, record)
 *   contact  — publicContact(contact:<inv>) (null: none stored)
 *   draft    — { ok, updatedAt, guest } (guest = the draft's own answer set for this guest; ok false: unreadable)
 *   rooms / seats — the engines' current view for this guest (null: unreadable)
 *   unsent   — true / false from the read-only comparison; null when it could not be made
 *   docs     — the current documents (null: the store could not be read)
 *   acks     — { note, rules } from the draft ({ acknowledged, at } or null)
 */
export function profileModel(inp) {
  const i = inp || {};
  const who = i.who || {};
  const record = i.record && typeof i.record === 'object' ? i.record : null;
  const draft = i.draft || { ok: false };
  /* a stored record this reading cannot take is said as such — never an empty trip */
  let sent = null, sentUnreadable = false;
  if (record) { try { sent = sentOf(record); } catch (e) { sent = null; sentUnreadable = true; } }
  const unsent = record ? (typeof i.unsent === 'boolean' ? i.unsent : null) : null;
  /* the draft's answers are shown only where they say something the sent trip does not: nothing sent yet, or changes not sent */
  const showDraft = !!(draft.ok && draft.guest && (!record || unsent === true));
  const g = showDraft ? draft.guest : null;
  const c = i.contact && typeof i.contact === 'object' ? i.contact : null;
  const seatsNow = i.seats && typeof i.seats === 'object' ? {
    ceremony: seatOf(((i.seats.ceremony || {})[who.guestId])),
    dinner: seatOf(((i.seats.dinner || {})[who.guestId])),
  } : null;
  const ack = (a) => (a && a.acknowledged ? { acknowledged: true, at: str(a.at) || null } : { acknowledged: false, at: null });
  return {
    identity: { invitationId: str(who.invitationId), guestId: str(who.guestId), partyId: str(who.partyId), contactId: str(who.contactId), couple: str(who.couple), hosts: who.hosts === true },
    /* E33: the invitation is shown by its id and its state — the code itself is never known here */
    status: {
      sent: !!record, sentUnreadable, version: sent ? sent.version : 0, firstSentAt: sent ? sent.firstSentAt : '', lastSentAt: sent ? sent.sentAt : '',
      reference: sent ? sent.reference : '', notJoining: sent ? sent.notJoining : false,
      unsent, draftReadable: !!draft.ok, draftUpdatedAt: draft.ok ? str(draft.updatedAt) || null : null,
    },
    confirmation: confirmationOf(i.conf, !!i.stands),
    contactNow: c ? { firstName: str(c.firstName, 80), lastName: str(c.lastName, 80), email: str(c.email, 200), phone: str(c.phone, 60), birthdate: str(c.birthdate, 20), nationality: str(c.nationality, 80),
      address1: str(c.address1, 160), address2: str(c.address2, 160), postal: str(c.postal, 20), city: str(c.city, 80), region: str(c.region, 80), country: str(c.country, 80) } : null,
    sent,
    draft: showDraft ? { allergy: allergyOf(g.allergy), answers: answersOf(g.profile) } : null,
    now: {
      seats: seatsNow, seatsReadable: !!seatsNow,
      rooms: i.rooms && typeof i.rooms === 'object' ? roomsNow(i.rooms) : null, roomsReadable: !!(i.rooms && typeof i.rooms === 'object'),
    },
    documents: documentsNow(i.docs),
    acknowledgements: draft.ok ? { note: ack(i.acks && i.acks.note), rules: ack(i.acks && i.acks.rules) } : null,
    /* what P1 does not record yet — said, never left blank (E28 · E35 · E36) */
    notRecorded: { flights: 'HS-035 P3 · E35', transfers: 'HS-035 P3 · E35', amenities: 'HS-035 P3 · E36', guestRelations: 'HS-035 P3 · E28' },
  };
}
