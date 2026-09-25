/* ============================================================================
   THE EMAILS — SEE YOU IN LAOS CI (Owner, 16 Sep 2026 · email presentation only).

   Two emails, composed from the stored record exactly as the Worker already
   holds it: the guest's confirmation (received / updated) and the Guest
   Relations notification. HTML in the website's language — warm ivory,
   charcoal, serif headings, tracked labels, thin rules, one column, email-safe
   tables and inline styles — and a plain-text fallback that reads the same.
   Nothing here decides anything: no booking, no recipient, no persistence.
   Guest-facing words never carry an internal id, a raw timestamp or a system
   term; the internal references Guest Relations may need sit in one muted
   section at the end of their email.
   ========================================================================== */

/* THE ONE QUESTIONNAIRE (PRQ-06-01 · 06-06 · 06-07 · 06-14): the short labels, the display forms and the after-dinner words
   come from the schema every page reads — this file keeps no copy of its own */
import { PROFILE as Q_PROFILE, display, displayList, FINALE } from './questionnaire.js';
import { isRelevant as stageRelevant, normalizeScope as scopeOf } from './stage-graph.js';
/* THE GUEST'S LANGUAGE (Owner, 24 Sep 2026 · EN / TH): a guest who chose Thai receives their copy in Thai — the same authored
   dictionary as the pages (src/i18n-th.json → src/i18n-th.dict.js), the same locale core. The Guest Relations email stays English. */
import I18N_CORE from './i18n-core.js';
import TH_DICT from './i18n-th.dict.js';
const TH = I18N_CORE.translator(TH_DICT);
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const escT = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function localiseGuestMail(mail, record) {
  const lang = record && ((record.registration && record.registration.lang) || record.lang);
  if (lang !== 'th' || !mail) return mail;
  const html = mail.html.replace(/<html lang="en"/, '<html lang="th"').replace(/>([^<>]+)</g, (m, t) => {
    if (!/[A-Za-z]{2,}/.test(t)) return m;
    const lead = t.match(/^\s*/)[0], tail = t.match(/\s*$/)[0];
    return '>' + lead + escT(TH.tr(unesc(t.trim()))) + tail + '<';
  });
  const text = mail.text.split('\n').map((l) => (/[A-Za-z]{2,}/.test(l) ? TH.line(l) : l)).join('\n');
  return { subject: TH.line(mail.subject), html, text };
}

export const SITE = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
export const GR_EMAIL = 'guest.relation.seeyouinlaos@gmail.com';
const IVORY = '#f4eee5', PAPER = '#faf7f2', INK = '#313131', MUTE = '#6b6964', LINE = '#ddd6cb';
const SERIF = "Georgia, 'Times New Roman', Times, serif", SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ---- facts of the journey (the same words as the website) ---- */
const STAGES = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
const TRAVEL = new Set(['train', 'mu9646', 'c86', 'return']);
const STAGE_OF_STAY = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', guesthouse: 'wedstay', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };
/* DATE ORDER (PRQ-04-11): the Guest House (27 February – 1 March) stands between the Pre-Wedding Stay and the Wedding Stay */
const ORDER_OF = Object.assign({}, ...STAGES.map((id, i) => ({ [id]: i })), { guesthouse: STAGES.indexOf('wedstay') - 0.5 });
const EVENTS = [
  { key: 'temple', label: 'Temple Ceremony', when: '09:00 – approximately 12:00', place: 'Wat Ong Teu, Vientiane' },
  { key: 'coffee', label: 'Coffee & Cake', when: '12:00 – 15:30', place: 'Souphattra Heritage' },
  { key: 'vows', label: 'Vow Ceremony', when: '15:30', place: 'Souphattra Heritage' },
  { key: 'dinner', label: 'Wedding Dinner', when: '19:30', place: 'Souphattra Heritage · poolside' },
];
/* MY FAVOURITE FLAVOUR (Owner, 18 Sep 2026): one of six; an older record's snack answer counts only when it is one of the six.
   The stored values are matched exactly as they are stored; only the printed form is display()'s (PRQ-06-07) */
const FLAVORS = ['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk'];
function profileValue(profile, k) {
  const p = profile || {};
  if (k === 'genres') return Array.isArray(p.genres) ? displayList(p.genres) : '';   /* the structured answer, listed with ", " — the record keeps the array (PRQ-06-06) */
  if (k !== 'flavor') return display((typeof p[k] === 'string' ? p[k] : '') || '');
  if (FLAVORS.includes(p.flavor)) return display(p.flavor);
  return FLAVORS.includes(p.treat) ? display(p.treat) : '';
}
/* a document's state (PRQ-06-11): a key from now on ('none' / 'received'), the older words in records sent before — one reading */
const docWords = (st) => { const v = String(st || '').trim(); if (/^(received|provided|replaced|reviewed)$/i.test(v)) return 'Received'; if (/^(none|not provided|not added yet|)$/i.test(v)) return 'Not added yet'; return v; };
/* the amount with its basis (PRQ-04-11): per person, the 1872 tea for the table */
const perOf = (x) => (x && (x.id === '1872' || x.id === 'tea1872')) ? ' for the table' : ' per person';
const INTEREST_WORDS = 'Interest · Guest Relations confirms your time · paid at the spa';
const REQUEST_WORDS = 'Request · Guest Relations will confirm your table';
const NOT_AT_WEDDING = 'You are not joining us for the wedding in Vientiane.';

/* the seat label the guest knows (assets/seatlabels.js, the same pure mapping): C-L-rr-01 → A rr … D-T-nn → A nn */
export function seatLabel(seatId) {
  const c = /^C-([LR])-(0[1-9]|10)-(0[1-3])$/.exec(seatId || '');
  if (c) { const col = ({ L: ['A', 'B'], R: ['D', 'E', 'F'] })[c[1]][Number(c[3]) - 1]; return col ? col + Number(c[2]) : null; }
  const d = /^D-([TB])-(0[1-9]|1[0-9]|2[0-5])$/.exec(seatId || '');
  if (d) return Number(d[2]) === 13 ? null : ({ T: 'A', B: 'B' })[d[1]] + Number(d[2]);   /* A13 / B13 are not on the plan (OQ-03) */
  return null;
}
/* a hold kept on a retired dinner seat (D-T-13 / D-B-13) is read by its old label, never by its id (API-A2) */
function retiredLabel(seatId) { const d = /^D-([TB])-13$/.exec(seatId || ''); return d ? ({ T: 'A', B: 'B' })[d[1]] + '13' : null; }
/* an ISO stamp → "16 September 2026 · 19:52" (Berlin time — where the invitations are read; the website shows "your time") */
export function whenWords(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  try {
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return day + ' · ' + time;
  } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' · '); }
}
/* an ISO stamp → "16 September 2026" — the day alone, as the guest reads it (TO-01680 · TO-01884) */
export function dayWords(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
  catch (e) { return d.toISOString().slice(0, 10); }
}
const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => 'USD ' + Number(n || 0).toLocaleString('en-US');

const PART_WORDS = [['bangkok', 'Bangkok'], ['vientianePreWedding', 'Vientiane · Before the Wedding'], ['vientianeWedding', 'Vientiane · The Wedding'], ['china', 'China']];
/* a date of birth as nobody can misread it: "4 September 1984 (1984-09-04)" — the stored value itself stays untouched */
function birthWords(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim()); if (!m) return String(v || '').trim();
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1] + ' (' + m[0] + ')';
}
/* ---- what the record says, in one readable model ---- */
export function journeyModel(record) {
  const r = record && record.registration || {};
  const gr = r.guestRecord || {}, g0 = Array.isArray(gr.guests) && gr.guests[0] || {};
  const legacy = Array.isArray(r.guests) && r.guests[0] || null;   /* the older test shape */
  const guestId = record.guestId || r.guestId || (legacy && legacy.guestId) || '';
  const fullName = (g0.source && g0.source.fullName) || (legacy && (legacy.fullName || legacy.name)) || g0.name || guestId || 'Guest';
  const firstName = (g0.source && g0.source.preferredName) || g0.name || (legacy && legacy.name) || fullName.split(' ')[0];
  const partyName = gr.partyName || r.partyName || '';
  /* THE PERSONAL DETAILS (Owner, 20 Sep 2026) — Guest Relations' email only, never the guest's. THE RECOVERY SNAPSHOT (Owner,
     25 Sep 2026): the page sends them inside the guest record (guestRecord.contact), and the Worker stamps the server's own
     stored copy on the record at the moment of sending (registration.personal) — read from there, never from
     registration.contact (email and mobile only), which is why the date of birth never reached Guest Relations before */
  const pers = r.personal && typeof r.personal === 'object' ? r.personal : {}, gc = gr.contact && typeof gr.contact === 'object' ? gr.contact : {}, rc = r.contact || {};
  const ga = gc.address && typeof gc.address === 'object' ? gc.address : {};
  const pv = (k, alt) => String(pers[k] || alt || '').trim();
  const personal = { firstName: pv('firstName', gc.firstName), lastName: pv('lastName', gc.lastName), birthdate: pv('birthdate', gc.birthdate || rc.birthdate), nationality: pv('nationality', gc.nationality || rc.nationality),
    address1: pv('address1', ga.line1), address2: pv('address2', ga.line2), postal: pv('postal', ga.postal), city: pv('city', ga.city), region: pv('region', ga.region), country: pv('country', ga.country) };
  const addressLine = [personal.address1, personal.address2, [personal.postal, personal.city].filter(Boolean).join(' '), personal.region, personal.country].filter(Boolean).join(', ') || (ga.words || (rc.address && rc.address.words) || '');
  const contact = { email: (record.recipient && record.recipient.email) || (r.contact && r.contact.email) || (gr.contact && gr.contact.email) || (legacy && legacy.contact && legacy.contact.email) || '',
    phone: (record.recipient && record.recipient.phone) || (r.contact && r.contact.phone) || (gr.contact && gr.contact.phone) || (legacy && legacy.contact && legacy.contact.phone) || '',
    birthdate: birthWords(personal.birthdate), nationality: personal.nationality, address: addressLine };
  const personId = [r.contactId, r.couple].filter(Boolean).join(' · ');
  const rooms0 = record.rooms || null;
  /* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): every line is the guest's own selection — but the engine is the truth of a
     stage: a line for a stage the engine has WAITLISTED for this guest (a stale device, a replayed draft) is not a stay and
     not a cost; the total is recomputed without it */
  const engineWaits = Object.entries(record.rooms || {}).filter(([, m]) => m && m.waitlisted).map(([k, m]) => m.stage || k);
  const lines0 = (Array.isArray(r.selections) ? r.selections : (Array.isArray(r.shared) ? r.shared : []));
  /* A DELETED PRODUCT IS NOT CHARGED (Owner, 24 Sep 2026 · Edit 6): the Sathorn Penthouse Bangkok is not a website product any
     more. A record sent before the deletion still carries its line; the line is not a stay and not a cost, and the total is
     recomputed from the lines that remain — the submission itself is history and is never rewritten. */
  const deleted = (x) => !!(x && x.stay === 'sathorn' && (x.room === 'penthouse' || x.room === 'shama-king-studio-balcony'));   /* Shama Yen-Akat Bangkok, deleted 24 Sep 2026, likewise */
  const lines = lines0.filter((x) => !(x && STAGE_OF_STAY[x.id] && engineWaits.includes(STAGE_OF_STAY[x.id])) && !deleted(x));
  const dropped = lines0.length !== lines.length;
  const order = (x) => (x && Object.prototype.hasOwnProperty.call(ORDER_OF, x.id) ? ORDER_OF[x.id] : 50);
  const sorted = lines.slice().sort((a, b) => order(a) - order(b));
  const rooms = record.rooms || null;
  const roomOf = (x) => { const st = STAGE_OF_STAY[x.id]; const m = rooms && rooms[st]; if (m && m.room && !m.waitlisted) return m.room; return x.unitName || (x.unit ? 'Room ' + x.unit : ''); };
  /* THE WAITING LIST (Owner, 19 Sep 2026): a stage no defined option could take — named with its position, never an amount */
  const STAGE_WORDS = { 'bkk-stay': 'Bangkok · Before the Wedding', prewed: 'Vientiane · Pre-Wedding Stay', wedstay: 'Vientiane · Wedding Stay', kmg: 'Kunming', ljg: 'Lijiang', kempinski: 'Bangkok · Siam Kempinski' };
  const waitlisted = Object.entries(rooms || {}).filter(([, m]) => m && m.waitlisted).map(([k, m]) => ({ stage: m.stage || k, name: STAGE_WORDS[m.stage || k] || (m.stage || k), position: m.position, size: m.size || 1 }));
  const arranged = [];
  const stays = sorted.filter((x) => (x.stay || STAGE_OF_STAY[x.id])).map((x) => ({ id: x.id, name: x.name, dates: (x.meta || '').split(' · ')[0], category: (x.meta || '').split(' · ').slice(1).join(' · '), room: roomOf(x), price: x.price, per: perOf(x), complimentary: !!x.complimentary, rate: x.rate, nights: x.nights, note: x.note ? x.note + (x.noteBy ? ' · ' + x.noteBy : '') : '', breakfast: x.breakfast || '', interest: !!x.interest }));
  const travel = sorted.filter((x) => TRAVEL.has(x.id) || (x.cls && !x.stay)).map((x) => ({ id: x.id, name: x.name, meta: x.meta || '', price: x.price, per: perOf(x) }));
  /* a spa interest and a restaurant request carry their state (PRQ-04-12): an interest is never part of the total */
  const experiences = sorted.filter((x) => !stays.some((s) => s.name === x.name) && !travel.some((t) => t.name === x.name) && x.id !== 'sangkhathan').map((x) => ({ id: x.id, name: x.name, meta: x.meta || '', price: x.price, per: perOf(x), interest: !!x.interest, request: !!x.request, status: x.interest ? INTEREST_WORDS : x.request ? REQUEST_WORDS : '' }));
  /* THE PAID EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): the emails used to carry an "Extended stay" beside the stays,
     built from the engine's `rooms.stayext`. The self-service extension is gone, so no email names a hotel for extra
     nights and the amount is the guest's own lines, nothing added. */
  const sang = lines.find((x) => x.id === 'sangkhathan');
  /* the wedding answers */
  const tc = r.templeCeremony && Array.isArray(r.templeCeremony.guests) && r.templeCeremony.guests[0] || null;
  const answerOf = (k) => { const v = tc && tc.events && tc.events[k]; if (!v) return legacy && legacy.events && legacy.events[k] ? String(legacy.events[k]) : ''; return String(v); };
  /* a guest not joining the wedding (the wedding sheet; a legacy record's Vientiane answer) is not at the wedding: every moment reads Not joining, no offering, no seat (Codex final pass, 18 Sep 2026) */
  const away = !!((gr.scope && gr.scope.at && !(gr.scope.vientianeWedding != null ? gr.scope.vientianeWedding : gr.scope.vientiane)) || (gr.scope && gr.scope.none) || (tc && /^Not joining/.test(String(tc.participation || ''))) || (r.templeCeremony && /^Not joining/.test(String(r.templeCeremony.participation || ''))));
  const wedding = EVENTS.map((e) => ({ ...e, answer: away ? 'Not joining' : answerOf(e.key) }));
  /* A WISH FROM THE BRIDE & GROOM (Owner, 22 Sep 2026): the final act, in the record's words */
  const finale0 = away ? '' : String((tc && (tc.finale || (tc.finaleKey === 'pool' ? FINALE.words.pool : tc.finaleKey === 'baron' ? FINALE.words.baron : ''))) || '');
  const finale = (FINALE.oldWords && FINALE.oldWords.baron || []).includes(finale0) ? FINALE.words.baron : finale0;   /* an answer stored in the older words reads as today's (PRQ-06-14) */
  /* THE SANGKHATHAN ROW (PRQ-GAP-01): the guest reads only their own answer — yes, with its amount, or no; Guest Relations
     keeps the operational state (Not eligible, Not available yet …) in its own field */
  const sangkhathanState = away ? '' : (sang ? 'Yes · USD 15' : (tc && tc.sangkhathanState ? tc.sangkhathanState : ''));
  const sangkhathan = away ? '' : (sang ? 'Yes · USD 15' : (tc && tc.sangkhathanState === 'Not selected' ? 'No' : ''));
  /* Tak Bat is part of the Temple Ceremony — the note is for the guests who join it (PRQ-04-19) */
  const templeJoining = !away && answerOf('temple') === 'Joining';
  /* the seats: the engine's map for this guest */
  const m = r.seats && typeof r.seats === 'object' ? r.seats : null;
  const seatId = (ev) => away ? null : ((m && m[ev] && (m[ev][guestId] || (typeof m[ev] === 'string' ? m[ev] : null))) || (legacy && legacy[ev + 'Seat']) || null);
  /* the hosts are known from the record's authenticated identity (the Worker stores the register's host flag on the
     record) — never from a room, never from anything the client submitted */
  const hosts = record.hosts === true;
  const labelOf = (ev) => { if (away) return ''; const id = seatId(ev); if (id) { if (retiredLabel(id)) return '';   /* D-29: a hold on a removed 13 is never shown as a seat number — Guest Relations reassigns it */
      return seatLabel(id) || (legacy && !/13$/.test(String(legacy[ev + 'SeatLabel'] || '')) && legacy[ev + 'SeatLabel']) || (/13$/.test(id) ? '' : id); } return (legacy && legacy[ev + 'SeatLabel']) || (ev === 'ceremony' && hosts ? 'Front centre' : ''); };
  const seats = { ceremony: { id: seatId('ceremony'), label: labelOf('ceremony'), when: '15:30', place: 'Souphattra Heritage' },
    dinner: { id: seatId('dinner'), label: labelOf('dinner'), when: '19:30', place: 'Souphattra Heritage · poolside' } };
  /* about you */
  const profile = Q_PROFILE.filter((q) => !(away && q.wedding)).map((q) => ({ label: q.label, value: profileValue(g0.profile, q.key) })).filter((p) => p.value);
  const allergy = (g0.allergy && g0.allergy.answer) || (gr.allergy && gr.allergy.answer) || (legacy && legacy.allergy && legacy.allergy.answer) || '';
  const allergyDetails = (g0.allergy && g0.allergy.details) || (gr.allergy && gr.allergy.details) || (legacy && legacy.allergy && legacy.allergy.details) || '';
  const acks = [];
  if ((g0.dress && g0.dress.acknowledged) || (gr.dress && gr.dress.all)) acks.push(['Dress code', 'Acknowledged']);
  if ((g0.photo && g0.photo.acknowledged) || (gr.photo && gr.photo.acknowledged)) acks.push(['Photography & film', 'Acknowledged']);
  /* documents (optional for the guest — Guest Relations sees the state) */
  const docs = r.documents && Array.isArray(r.documents.guests) && r.documents.guests[0] && Array.isArray(r.documents.guests[0].documents) ? r.documents.guests[0].documents.map((d) => ({ label: d.label || d.kind, state: docWords(d.state) })) : [];
  const publication = r.documents && Array.isArray(r.documents.guests) && r.documents.guests[0] ? r.documents.guests[0].publication || '' : '';
  const stated = r.totalUsd != null ? r.totalUsd : (r.total != null ? r.total : null);
  const linesTotal = lines.reduce((t, x) => t + (Number(x.price) || 0) * (Number(x.qty) || 1), 0);
  /* A WITHDRAWN COMPONENT IS NOT CHARGED (Owner, 23 Sep 2026): a record sent before the paid extension was withdrawn still
     names it under `rooms.stayext` and its stated figure still includes it. Such a record is recomputed from the lines it
     carries — exactly as a record whose stage went to the waiting list is — so no guest is billed for something the website
     no longer offers. Every other stated amount is the device's own one calculation and is left alone. */
  const withdrawn = !!(record.rooms && record.rooms.stayext);
  const total0 = stated == null ? null : ((dropped || withdrawn) ? linesTotal : stated);
  const total = total0;
  const upd = record.kind === 'update' && (record.version || 1) > 1;
  /* THE RECOVERY SNAPSHOT (Owner, 25 Sep 2026): everything else the guest submitted that Guest Relations needs to rebuild the
     record after a reset — the identities, the name as the guest wrote it, the answer per journey part and per stage, the
     party's own participation at the moment of sending, and every selection with its product code */
  const scopeParts = gr.scope && typeof gr.scope === 'object' ? gr.scope : null;
  const stageStates = r.stages && typeof r.stages === 'object' ? r.stages : null;
  const partyMembers = Array.isArray(r.partyParticipation) ? r.partyParticipation : null;
  const selections = lines0.map((x) => ({ id: x.id, name: x.name || x.id, variant: x.cls || x.variant || x.room || '', stay: x.stay || '', unit: x.unit || '', qty: Number(x.qty) || 1, price: x.price, date: x.date || '', party: x.party || '', request: !!x.request, interest: !!x.interest, complimentary: !!x.complimentary, deleted: deleted(x) || (STAGE_OF_STAY[x.id] && engineWaits.includes(STAGE_OF_STAY[x.id])) }));
  const profileAll = Q_PROFILE.map((q) => ({ label: q.label, value: profileValue(g0.profile, q.key) })).filter((p) => p.value);
  const recovery = { profileAll, personal, partyId: gr.partyId || r.partyId || '', contactId: r.contactId || '', couple: r.couple || '', lang: r.lang || '', scopeParts, stageStates, partyMembers, selections,
    nameWritten: [personal.firstName, personal.lastName].filter(Boolean).join(' ') || (g0.submitted && g0.submitted.fullName) || '' };
  return { recovery, guestId, fullName, firstName, partyName, contact, personId, stays, arranged, waitlisted, travel, experiences, wedding, finale, sangkhathan, sangkhathanState, templeJoining, away, seats, profile, allergy, allergyDetails, acks, docs, publication, total, hosts,
    /* WHERE THEY JOIN US (Owner, 18 Sep 2026): the guest's participation scope as sent — the words the guest chose, or a decline */
    scope: typeof gr.scopeWords === 'string' && gr.scopeWords ? gr.scopeWords : (gr.scope && gr.scope.none ? 'Not joining this trip' : gr.scope ? PART_WORDS.filter(([k]) => gr.scope[k]).map(([, w]) => w).join(' · ') : ''),
    notJoining: !!(gr.scope && gr.scope.none),
    reference: record.submissionId || '', sentAt: record.lastSentAt || record.submittedAt || '', firstSentAt: record.firstSentAt || record.submittedAt || '', version: record.version || 1, upd, invitationId: record.invitationId || '' };
}

/* ---- HTML building blocks (tables, inline styles, one column) ---- */
const label = (t) => '<p style="margin:0 0 6px;font-family:' + SANS + ';font-size:10px;letter-spacing:2px;text-transform:uppercase;color:' + MUTE + ';">' + esc(t) + '</p>';
const rule = () => '<tr><td style="padding:0;height:1px;line-height:1px;font-size:1px;border-top:1px solid ' + LINE + ';">&nbsp;</td></tr>';
const gap = (h) => '<tr><td style="height:' + h + 'px;line-height:' + h + 'px;font-size:1px;">&nbsp;</td></tr>';
const h1 = (t) => '<h1 style="margin:0 0 18px;font-family:' + SERIF + ';font-weight:400;font-size:30px;line-height:1.2;color:' + INK + ';">' + esc(t) + '</h1>';
const para = (t) => '<p style="margin:0 0 14px;font-family:' + SANS + ';font-size:15px;line-height:1.65;color:' + INK + ';font-weight:300;">' + t + '</p>';
const small = (t) => '<p style="margin:0 0 8px;font-family:' + SANS + ';font-size:12px;line-height:1.6;color:' + MUTE + ';">' + t + '</p>';
const section = (title, inner) => '<tr><td style="padding:26px 0 8px;">' + label(title) + inner + '</td></tr>' + rule();
const item = (name, meta, right) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
  '<td style="padding:10px 0;vertical-align:top;"><p style="margin:0;font-family:' + SERIF + ';font-size:18px;line-height:1.35;color:' + INK + ';">' + esc(name) + '</p>' + (meta ? '<p style="margin:3px 0 0;font-family:' + SANS + ';font-size:13px;line-height:1.55;color:' + MUTE + ';">' + meta + '</p>' : '') + '</td>' +
  (right ? '<td style="padding:10px 0 10px 16px;vertical-align:top;text-align:right;white-space:nowrap;font-family:' + SANS + ';font-size:13px;color:' + INK + ';">' + esc(right) + '</td>' : '') + '</tr></table>';
const kvRow = (k, v, sub) => '<tr><td style="padding:6px 0;font-family:' + SANS + ';font-size:13px;color:' + INK + ';width:48%;vertical-align:top;">' + esc(k) + (sub ? '<br><span style="font-size:12px;color:' + MUTE + ';">' + esc(sub) + '</span>' : '') + '</td><td style="padding:6px 0 6px 12px;font-family:' + SANS + ';font-size:14px;color:' + INK + ';vertical-align:top;">' + esc(v) + '</td></tr>';
/* a seat: the event as a tracked label, the venue and time muted, the seat in serif */
const seat = (event, place, when, value) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0;">' + label(event) + '<p style="margin:0 0 2px;font-family:' + SANS + ';font-size:12px;color:' + MUTE + ';">' + esc(place + ' · ' + when) + '</p><p style="margin:0;font-family:' + SERIF + ';font-size:19px;line-height:1.3;color:' + INK + ';">' + esc(value) + '</p></td></tr></table>';
const kvTable = (rows) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rows.join('') + '</table>';
const button = (href, text) => '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:' + INK + ';"><a href="' + esc(href) + '" style="display:inline-block;padding:15px 26px;font-family:' + SANS + ';font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:' + IVORY + ';text-decoration:none;">' + esc(text) + '</a></td></tr></table>';

function shell(title, inner, eyebrow) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>' + esc(title) + '</title>' +
    '<style>body{margin:0;padding:0;background:' + IVORY + ';-webkit-text-size-adjust:100%;} table{border-collapse:collapse;} img{border:0;} @media only screen and (max-width:640px){.wrap{width:100% !important;} .pad{padding:24px 18px !important;} h1{font-size:26px !important;}}</style></head>' +
    '<body style="margin:0;padding:0;background:' + IVORY + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + IVORY + ';"><tr><td align="center" style="padding:28px 12px;">' +
    '<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;background:' + PAPER + ';">' +
    '<tr><td class="pad" style="padding:36px 40px 32px;">' +
    /* the header: the wordmark, YOUR JOURNEY, a thin rule */
    '<p style="margin:0 0 4px;font-family:' + SERIF + ';font-size:22px;line-height:1.2;color:' + INK + ';">see you in laos<span style="color:#8a5a55;">.</span></p>' +
    '<p style="margin:0 0 22px;font-family:' + SANS + ';font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:' + MUTE + ';">' + esc(eyebrow || 'My Trip') + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rule() + gap(22) + '</table>' +
    inner +
    '</td></tr></table>' +
    /* the footer */
    '<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;"><tr><td style="padding:22px 40px 8px;text-align:center;">' +
    '<p style="margin:0 0 4px;font-family:' + SERIF + ';font-size:16px;color:' + INK + ';">see you in laos<span style="color:#8a5a55;">.</span></p>' +
    '<p style="margin:0;font-family:' + SANS + ';font-size:10px;letter-spacing:2px;text-transform:uppercase;color:' + MUTE + ';">Vientiane · 28 February 2027</p>' +
    '</td></tr></table>' +
    '</td></tr></table></body></html>';
}

/* the shared journey sections (guest and Guest Relations read the same facts) */
const waitWords = (w) => (w.position ? 'Number ' + w.position + ' on the waiting list' : 'On the waiting list') + (w.size > 1 ? ', for ' + w.size + ' places together' : '');
const amountOf = (x) => x.complimentary ? 'Complimentary' : x.interest ? 'Not in your total' : x.price != null ? money(x.price) + (x.per || ' per person') : '';
const seatValue = (label, hosts) => /^Front/.test(label) ? label : 'Seat ' + label + ' · held for you';
function journeySections(M, forOwner) {
  let s = '';
  if (M.travel.length) s += section('Travel', M.travel.map((t) => item(t.name, esc(t.meta), t.price != null ? amountOf(t) : '')).join(''));
  if (M.waitlisted && M.waitlisted.length) s += section('On the waiting list', M.waitlisted.map((w) => item(w.name, esc(waitWords(w)) + '. No room yet, and no cost.' + (forOwner ? '' : '<br>We will tell you as soon as a place frees up, and Guest Relations will find an arrangement with you.'), '')).join(''));
  if (M.stays.length) s += section('Stays', M.stays.map((x) => item(x.name, esc(x.dates) + (x.category ? '<br>' + esc(x.category) : '') + (x.room ? '<br><span style="color:' + INK + ';">' + esc(x.room + (forOwner ? '' : ', held for you')) + '</span>' : '') + (x.breakfast ? '<br>' + esc(x.breakfast) : '') + (x.note ? '<br>' + esc(x.note) : '') + (x.interest ? '<br>' + esc(INTEREST_WORDS) : ''), amountOf(x))).join(''));
  if (M.experiences.length) s += section('Experiences', M.experiences.map((e) => item(e.name, esc(e.meta) + (e.status ? '<br>' + esc(e.status) : ''), amountOf(e))).join(''));
  /* THE WEDDING FOLLOWS PARTICIPATION (PRQ-04-19): a guest not at the wedding reads one line, never four "Not joining" moments */
  if (!forOwner && M.away) s += section('The wedding · Sunday, 28 February 2027', para(esc(NOT_AT_WEDDING)));
  else s += section(forOwner ? 'Wedding' : 'The wedding · Sunday, 28 February 2027', kvTable(M.wedding.map((e) => kvRow(e.label, e.answer || 'Not answered yet', e.when + ' · ' + e.place)).concat(M.finale ? [kvRow('After the dinner', M.finale, 'A wish from Haruthai & Suthep')] : []).concat((forOwner ? M.sangkhathanState : M.sangkhathan) ? [kvRow('Sangkhathan', forOwner ? M.sangkhathanState : M.sangkhathan, 'A personal offering')] : [])));
  const seatRows = [];
  if (M.seats.ceremony.label) seatRows.push(seat('Vow Ceremony', M.seats.ceremony.place, M.seats.ceremony.when, seatValue(M.seats.ceremony.label)));
  if (M.seats.dinner.label) seatRows.push(seat('Wedding Dinner', M.seats.dinner.place, M.seats.dinner.when, seatValue(M.seats.dinner.label)));
  if (seatRows.length) s += section('Your seats', seatRows.join(''));
  const about = [];
  if (M.allergy) about.push(kvRow('Food allergies', M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None'));
  M.profile.forEach((p) => about.push(kvRow(p.label, p.value)));
  M.acks.forEach(([k, v]) => about.push(kvRow(k, v)));
  /* one heading per reader (PRQ-06-10): the guest's own "About You", Guest Relations' "About the guest" */
  if (about.length) s += section(forOwner ? 'About the guest' : 'About You', kvTable(about));
  return s;
}

/* ---- THE GUEST EMAIL ----
   A COPY OF WHAT WAS SENT, never a confirmation (glossary): three voices — a guest's trip (first send or an update), a guest
   who is not joining (the reply, PRQ-04-09) and the hosts' own plan (PRQ-04-10). */
const PAYMENT = 'Nothing is paid on the website. No deposit is required. Once your arrangements are confirmed, Guest Relations sends you an invoice with bank transfer or PayPal details; payment is due within seven days.';
const TAK_BAT = 'Tak Bat, the morning alms-giving, is your own personal offering and is not part of your total.';
const PRIVACY = 'Sign in with your own invitation code — for your privacy, we never send codes by email.';
function guestVoice(M) {
  if (M.notJoining) return { kind: 'reply', subject: 'Thank you for letting us know', heading: 'Thank you for letting us know',
    intro: 'We will miss you, and we are grateful you let us know. If your plans change, simply tick the parts you can join in My Trip and send us the update.' };
  if (M.hosts) return { kind: 'hosts', subject: 'Your own plan is with Guest Relations (' + M.reference + ')', heading: 'Your plan is with Guest Relations',
    intro: 'Your own arrangements are with Khun Ket and Khun Paddy, exactly as you sent them. Below is your copy.' };
  if (M.upd) return { kind: 'update', subject: 'Thank you — we have your update (' + M.reference + ')', heading: 'Thank you — we have your update',
    intro: 'Your changes have reached us and replace what you sent before — below is your updated copy. Guest Relations will look through them and confirm each arrangement with you personally.' };
  return { kind: 'trip', subject: 'Thank you — we have your trip (' + M.reference + ')', heading: 'Thank you — we have your trip',
    intro: 'Your trip has reached us, exactly as you sent it — below is your copy. Khun Ket and Khun Paddy of Guest Relations will look through it and confirm each arrangement with you personally; until they do, nothing is booked. If anything changes, simply change it in My Trip and send us the update.' };
}
export function composeGuestMail(record) { return localiseGuestMail(composeGuestMailEn(record), record); }
function composeGuestMailEn(record) {
  const M = journeyModel(record);
  const V = guestVoice(M), reply = V.kind === 'reply', hostsMail = V.kind === 'hosts';
  const subject = V.subject, intro = V.intro;
  const sentLabel = M.upd ? 'Updated on' : 'Sent on';
  const takBat = !reply && !hostsMail && M.templeJoining;
  let inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>' +
    h1(V.heading) +
    para('Dear ' + esc(M.firstName) + ',') + para(esc(intro)) +
    '</td></tr>' + gap(10) +
    '<tr><td>' + kvTable([kvRow('Your reference', M.reference), kvRow(sentLabel, dayWords(M.sentAt)), M.scope ? kvRow('Where you join us', M.scope) : ''].filter(Boolean)) + '</td></tr>' + gap(14) + rule() +
    (reply ? '' : journeySections(M, false));
  if (!reply && M.total != null) inner += section('Your total', '<p style="margin:4px 0 10px;font-family:' + SERIF + ';font-size:30px;line-height:1.2;color:' + INK + ';">' + esc(money(M.total)) + '</p>' +
    small(esc(PAYMENT)) + (takBat ? small(esc(TAK_BAT)) : ''));
  inner += '<tr><td style="padding:30px 0 10px;">' + button(SITE + '/invitation', 'Open My Trip') + '</td></tr>' +
    '<tr><td>' + (hostsMail ? '' : small(esc(PRIVACY))) +
    small('With love,<br>Haruthai &amp; Suthep') +
    small('Guest Relations — Khun Ket &amp; Khun Paddy · <a href="mailto:' + GR_EMAIL + '" style="color:' + INK + ';text-decoration:none;">' + GR_EMAIL + '</a>') + '</td></tr></table>';
  const html = shell(subject, inner);
  /* the plain-text fallback: the same facts, in order */
  const T = [];
  T.push('SEE YOU IN LAOS — MY TRIP', '', V.heading, '', 'Dear ' + M.firstName + ',', '', intro, '',
    'Your reference: ' + M.reference, sentLabel + ' ' + dayWords(M.sentAt), M.scope ? 'Where you join us: ' + M.scope : '', '');
  if (!reply) {
    if (M.travel.length) { T.push('TRAVEL'); M.travel.forEach((t) => T.push('· ' + t.name + ' — ' + t.meta + (t.price != null ? ' — ' + amountOf(t) : ''))); T.push(''); }
    if (M.waitlisted && M.waitlisted.length) { T.push('ON THE WAITING LIST'); M.waitlisted.forEach((w) => T.push('· ' + w.name + ' — ' + waitWords(w).replace(/^N/, 'n').replace(/^On/, 'on') + ' · no room yet, and no cost')); T.push('We will tell you as soon as a place frees up, and Guest Relations will find an arrangement with you.', ''); }
    if (M.stays.length) { T.push('STAYS'); M.stays.forEach((x) => T.push('· ' + x.name + ' — ' + x.dates + (x.category ? ' — ' + x.category : '') + (x.room ? ' — ' + x.room + ', held for you' : '') + (amountOf(x) ? ' — ' + amountOf(x) : '') + (x.note ? ' (' + x.note + ')' : ''))); T.push(''); }
    if (M.experiences.length) { T.push('EXPERIENCES'); M.experiences.forEach((e) => T.push('· ' + e.name + ' — ' + e.meta + (e.status ? ' — ' + e.status : '') + (amountOf(e) ? ' — ' + amountOf(e) : ''))); T.push(''); }
    T.push('THE WEDDING · SUNDAY, 28 FEBRUARY 2027');
    if (M.away) T.push(NOT_AT_WEDDING);
    else { M.wedding.forEach((e) => T.push('· ' + e.label + ' · ' + e.when + ' · ' + e.place + ': ' + (e.answer || 'Not answered yet'))); if (M.finale) T.push('· After the dinner: ' + M.finale); if (M.sangkhathan) T.push('· Sangkhathan: ' + M.sangkhathan); }
    T.push('');
    if (M.seats.ceremony.label || M.seats.dinner.label) { T.push('YOUR SEATS'); if (M.seats.ceremony.label) T.push('· Vow Ceremony · Souphattra Heritage · 15:30: ' + seatValue(M.seats.ceremony.label)); if (M.seats.dinner.label) T.push('· Wedding Dinner · Souphattra Heritage · 19:30: ' + seatValue(M.seats.dinner.label)); T.push(''); }
    if (M.allergy || M.profile.length || M.acks.length) { T.push('ABOUT YOU'); if (M.allergy) T.push('· Food allergies: ' + (M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None')); M.profile.forEach((p) => T.push('· ' + p.label + ': ' + p.value)); M.acks.forEach(([k, v]) => T.push('· ' + k + ': ' + v)); T.push(''); }
    if (M.total != null) T.push('YOUR TOTAL', money(M.total), PAYMENT, ...(takBat ? [TAK_BAT] : []), '');
  }
  T.push('Open My Trip: ' + SITE + '/invitation', ...(hostsMail ? [] : [PRIVACY]), '', 'With love,', 'Haruthai & Suthep', '', 'Guest Relations — Khun Ket & Khun Paddy · ' + GR_EMAIL, '', 'see you in laos. · Vientiane · 28 February 2027');
  return { subject, html, text: T.join('\n') };
}

/* ---- THE GUEST RELATIONS EMAIL ---- */
/* THE RECOVERY SNAPSHOT (Owner, 25 Sep 2026): Guest Relations' email is also the human-readable copy from which a guest's
   submitted record can be rebuilt after a reset — every field the guest submitted, attributed to the person who submitted it,
   in sections an operator reads top to bottom. Never a code, a bearer or a secret: none of them is ever part of a record. */
const STAGE_NAMES = { 'bkk-stay': 'Bangkok · Before the Wedding (stay)', train: 'Special Express No. 25', prewed: 'Vientiane · Pre-Wedding Stay', wedstay: 'Vientiane · Wedding Stay', mu9646: 'MU9646 · Vientiane → Kunming', kmg: 'Kunming (stay)', c86: 'C86 · Kunming → Lijiang', ljg: 'Lijiang (stay)', return: 'Lijiang → Bangkok (return flights)', kempinski: 'Bangkok · Siam Kempinski (stay)' };
const STATE_WORDS = { selected: 'Chosen', waitlisted: 'On the waiting list', declined: 'Not needed (the guest said so)', open: 'Not answered', excluded: 'Not part of the trip' };
const PARTICIPATION_WORDS = { joining: 'Joining', 'not-joining': 'Not joining', unanswered: 'Not answered yet' };
export function recoverySections(M) {
  const R = M.recovery || {}, P = R.personal || {};
  const row = (k, v) => [k, v == null || v === '' ? '—' : String(v)];
  const identity = [row('Guest (invitation)', M.fullName), row('Name as the guest wrote it', R.nameWritten || '—'), row('First name', P.firstName), row('Last name', P.lastName),
    row('Date of birth', M.contact.birthdate), row('Nationality', P.nationality), row('Person ID', M.guestId), row('Contact ID', R.contactId), row('Couple', R.couple),
    row('Party', M.partyName), row('Party ID', R.partyId), row('Invitation', M.invitationId), row('Language', R.lang === 'th' ? 'Thai' : R.lang === 'en' ? 'English' : R.lang)];
  const contact = [row('Email', M.contact.email), row('Mobile', M.contact.phone), row('Postal address', M.contact.address), row('Street and house number', P.address1), row('Address line 2', P.address2),
    row('Postcode', P.postal), row('City', P.city), row('State, province or region', P.region), row('Country', P.country)];
  const sc = R.scopeParts;
  const participation = [row('Where they join us', M.scope || (sc ? '' : 'Not answered'))].concat(sc ? [row('Not joining this trip', sc.none ? 'Yes' : 'No')].concat(PART_WORDS.map(([k, w]) => row(w, sc.none ? 'No' : sc[k] ? 'Yes' : 'No'))) : [])
    .concat((R.partyMembers || []).map((m) => row('Party member ' + (m.name ? m.name + ' ' : '') + '(' + m.guestId + ')', PARTICIPATION_WORDS[m.state] || m.state)));
  /* a stage outside the parts the guest joins is not part of the trip — never "not answered" */
  const nsc = sc ? scopeOf(sc) : null;
  const stages = R.stageStates ? Object.keys(STAGE_NAMES).filter((k) => R.stageStates[k]).map((k) => row(STAGE_NAMES[k], nsc && !stageRelevant(k, nsc) ? STATE_WORDS.excluded : (STATE_WORDS[R.stageStates[k]] || R.stageStates[k]))) : [];
  const selections = (R.selections || []).map((x) => row(x.name, ['code ' + x.id + (x.variant ? ' · ' + x.variant : '') + (x.unit ? ' · unit ' + x.unit : ''), 'quantity ' + x.qty, x.price != null ? money(x.price) + ' each' : 'no amount',
    x.date ? 'date ' + x.date : '', x.party ? 'party ' + x.party : '', x.request ? 'request' : '', x.interest ? 'interest' : '', x.complimentary ? 'complimentary' : '', x.deleted ? 'not counted (withdrawn or on the waiting list)' : ''].filter(Boolean).join(' · ')));
  /* every About You answer the record carries, whether or not the guest is at the wedding (the guest's email shows only those
     that apply; the recovery copy keeps what was submitted) */
  const about = [row('Food allergies', M.allergy ? (M.allergy === 'yes' ? 'Yes · ' + (M.allergyDetails || 'no details') : 'None') : 'Not answered')]
    .concat((R.profileAll || []).map((p) => row(p.label, p.value))).concat((M.acks || []).map(([k, v]) => row(k, v)))
    .concat((M.docs || []).map((d) => row('Document · ' + d.label, d.state))).concat(M.publication ? [row('Publication of photographs', M.publication)] : []);
  const submission = [row('Reference', M.reference), row('Status', M.upd ? 'Updated trip' : M.notJoining ? 'Reply · not joining' : 'Initial submission'), row('Version', M.version),
    row(M.upd ? 'Latest version sent' : 'Sent', whenWords(M.sentAt)), row('First sent', whenWords(M.firstSentAt))];
  return [['Identity', identity], ['Contact', contact], ['Participation', participation], ['Stage answers', stages], ['Selections as submitted', selections], ['About You as submitted', about], ['Submission', submission]].filter(([, rows]) => rows.length);
}
export function composeOwnerMail(record, statusUrl) {
  const M = journeyModel(record);
  const subject = (M.upd ? 'Trip updated — ' : 'Trip received — ') + M.fullName + ' · ' + M.reference;
  const docsRows = M.docs.map((d) => kvRow(d.label, d.state)).concat(M.publication ? [kvRow('Publication of photographs', M.publication)] : []);
  const missing = M.docs.filter((d) => d.state === 'Not added yet').map((d) => d.label);
  let inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>' +
    h1(M.upd ? 'Trip updated' : 'New trip received') + '</td></tr>' +
    (M.upd ? '<tr><td>' + label('Updated trip') + para('Latest version received ' + esc(whenWords(M.sentAt)) + '. It replaces the version first sent ' + esc(whenWords(M.firstSentAt)) + '.') + '</td></tr>' : '') +
    '<tr><td>' + kvTable([kvRow('Guest', M.fullName), M.partyName ? kvRow('Party', M.partyName) : '', M.personId ? kvRow('Person', M.personId) : '', kvRow('Email', M.contact.email || '—'), kvRow('Mobile', M.contact.phone || '—'),
      kvRow('Date of birth', M.contact.birthdate || '—'), M.contact.nationality ? kvRow('Nationality', M.contact.nationality) : '', M.contact.address ? kvRow('Mailing address', M.contact.address) : '',
      kvRow('Reference', M.reference), kvRow('Status', M.upd ? 'Updated trip' : M.notJoining ? 'Reply · not joining' : 'Initial submission'), kvRow(M.upd ? 'Updated' : 'Sent', whenWords(M.sentAt)), M.scope ? kvRow('Where they join us', M.scope) : ''].filter(Boolean)) + '</td></tr>' + gap(14) + rule() +
    journeySections(M, true);
  const REC = recoverySections(M);
  if (docsRows.length) inner += section('Documents', kvTable(docsRows) + (missing.length ? '<p style="margin:10px 0 0;font-family:' + SANS + ';font-size:13px;color:' + INK + ';">Still needed: ' + esc(missing.join(', ')) + '</p>' : ''));
  if (M.total != null) inner += section('Cost', '<p style="margin:4px 0 6px;font-family:' + SERIF + ';font-size:26px;color:' + INK + ';">' + esc(money(M.total)) + '</p>' + small('The guest’s contribution as the website calculates it — nothing paid on the website.'));
  inner += section('Internal reference', kvTable([kvRow('Guest', M.guestId), kvRow('Invitation', M.invitationId), M.seats.ceremony.id ? kvRow('Ceremony seat record', M.seats.ceremony.id) : '', M.seats.dinner.id ? kvRow('Dinner seat record', M.seats.dinner.id) : '',
    kvRow('Submission', M.reference + ' · version ' + M.version), statusUrl ? kvRow('Status', statusUrl) : ''].filter(Boolean)));
  /* the complete submitted record, section by section — the copy Guest Relations rebuilds from after a reset (last: it names the ids) */
  inner += section('Recovery snapshot · the complete submitted record', REC.map(([title, rows]) => label(title) + kvTable(rows.map(([k, v]) => kvRow(k, v)))).join(gap(10)));
  inner += '</table>';
  const html = shell(subject, inner, 'Guest Relations');
  const T = [];
  T.push('SEE YOU IN LAOS — GUEST RELATIONS', '', M.upd ? 'Trip updated' : 'New trip received', '');
  if (M.upd) T.push('Latest version received ' + whenWords(M.sentAt) + ' (replaces the version first sent ' + whenWords(M.firstSentAt) + ')', '');
  T.push('Guest: ' + M.fullName, M.partyName ? 'Party: ' + M.partyName : '', M.personId ? 'Person: ' + M.personId : '', 'Email: ' + (M.contact.email || '—'), 'Mobile: ' + (M.contact.phone || '—'), 'Date of birth: ' + (M.contact.birthdate || '—'), M.contact.nationality ? 'Nationality: ' + M.contact.nationality : '', M.contact.address ? 'Mailing address: ' + M.contact.address : '', 'Reference: ' + M.reference, 'Status: ' + (M.upd ? 'Updated trip' : M.notJoining ? 'Reply · not joining' : 'Initial submission'), (M.upd ? 'Updated: ' : 'Sent: ') + whenWords(M.sentAt), M.scope ? 'Where they join us: ' + M.scope : '', '');
  if (M.travel.length) { T.push('TRAVEL'); M.travel.forEach((t) => T.push('· ' + t.name + ' — ' + t.meta + ' — ' + money(t.price))); T.push(''); }
  if (M.waitlisted && M.waitlisted.length) { T.push('WAITING LIST'); M.waitlisted.forEach((w) => T.push('· ' + w.name + ' — ' + (w.position ? 'number ' + w.position : 'position not known yet') + (w.size > 1 ? ', for ' + w.size + ' places together' : '') + ' — to resolve')); T.push(''); }
  if (M.stays.length) { T.push('STAYS'); M.stays.forEach((x) => T.push('· ' + x.name + ' — ' + x.dates + (x.category ? ' — ' + x.category : '') + (x.room ? ' — ' + x.room : '') + ' — ' + money(x.price) + (x.note ? ' (' + x.note + ')' : ''))); T.push(''); }
  if (M.experiences.length) { T.push('EXPERIENCES'); M.experiences.forEach((e) => T.push('· ' + e.name + ' — ' + e.meta + ' — ' + money(e.price))); T.push(''); }
  T.push('WEDDING PARTICIPATION'); M.wedding.forEach((e) => T.push('· ' + e.label + ' (' + e.when + ' · ' + e.place + '): ' + (e.answer || 'Not answered yet'))); if (M.finale) T.push('· After the dinner: ' + M.finale); if (M.sangkhathanState) T.push('· Sangkhathan: ' + M.sangkhathanState); T.push('');
  T.push('SEATS', '· Vow Ceremony: ' + (M.seats.ceremony.label ? (/^Front/.test(M.seats.ceremony.label) ? M.seats.ceremony.label : 'Seat ' + M.seats.ceremony.label) : 'no seat held'), '· Wedding Dinner: ' + (M.seats.dinner.label ? 'Seat ' + M.seats.dinner.label : 'no seat held'), '');
  T.push('ABOUT THE GUEST', '· Food allergies: ' + (M.allergy ? (M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None') : 'Not answered yet')); M.profile.forEach((p) => T.push('· ' + p.label + ': ' + p.value)); M.acks.forEach(([k, v]) => T.push('· ' + k + ': ' + v)); T.push('');
  if (M.docs.length || M.publication) { T.push('DOCUMENTS'); M.docs.forEach((d) => T.push('· ' + d.label + ': ' + d.state)); if (M.publication) T.push('· Publication of photographs: ' + M.publication); if (missing.length) T.push('Still needed: ' + missing.join(', ')); T.push(''); }
  if (M.total != null) T.push('COST', money(M.total), '');
  T.push('INTERNAL REFERENCE', 'Guest: ' + M.guestId, 'Invitation: ' + M.invitationId); if (M.seats.ceremony.id) T.push('Ceremony seat record: ' + M.seats.ceremony.id); if (M.seats.dinner.id) T.push('Dinner seat record: ' + M.seats.dinner.id); T.push('Submission: ' + M.reference + ' · version ' + M.version); if (statusUrl) T.push('Status: ' + statusUrl);
  T.push('', 'RECOVERY SNAPSHOT · THE COMPLETE SUBMITTED RECORD', '');
  REC.forEach(([title, rows]) => { T.push(title.toUpperCase()); rows.forEach(([k, v]) => T.push('· ' + k + ': ' + v)); T.push(''); });
  return { subject, html, text: T.filter((l, i) => l !== '' || (i > 0 && T[i - 1] !== '')).join('\n') };
}
