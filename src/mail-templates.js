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

export const SITE = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
export const GR_EMAIL = 'guest.relation.seeyouinlaos@gmail.com';
const IVORY = '#f4eee5', PAPER = '#faf7f2', INK = '#313131', MUTE = '#6b6964', LINE = '#ddd6cb';
const SERIF = "Georgia, 'Times New Roman', Times, serif", SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ---- facts of the journey (the same words as the website) ---- */
const STAGES = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
const TRAVEL = new Set(['train', 'mu9646', 'c86', 'return']);
const STAGE_OF_STAY = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', guesthouse: 'wedstay', riverside: 'wedstay', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };
const EVENTS = [
  { key: 'temple', label: 'Temple Ceremony', when: '09:00 – approximately 12:00', place: 'Wat Ong Teu, Vientiane' },
  { key: 'coffee', label: 'Coffee & Cake', when: 'From 12:00', place: 'Souphattra Heritage' },
  { key: 'vows', label: 'Wedding Ceremony', when: '15:30', place: 'Souphattra Heritage' },
  { key: 'dinner', label: 'Wedding Dinner', when: '19:30', place: 'Souphattra Heritage · poolside' },
];
/* MY FAVORITE FLAVOR (Owner, 18 Sep 2026): one of six; an older record's snack answer counts only when it is one of the six */
const FLAVORS = ['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk'];
const PROFILE = [['coffeetea', 'Coffee or tea'], ['flavor', 'My Favorite Flavor'], ['drink', 'Favourite drink'], ['film', 'Favourite film'], ['music', 'Favourite music']];
function profileValue(profile, k) {
  const p = profile || {};
  if (k !== 'flavor') return p[k] || '';
  if (FLAVORS.includes(p.flavor)) return p.flavor;
  return FLAVORS.includes(p.treat) ? p.treat : '';
}

/* the seat label the guest knows (assets/seatlabels.js, the same pure mapping): C-L-rr-01 → A rr … D-T-nn → A nn */
export function seatLabel(seatId) {
  const c = /^C-([LR])-(0[1-9]|10)-(0[1-3])$/.exec(seatId || '');
  if (c) { const col = ({ L: ['A', 'B'], R: ['D', 'E', 'F'] })[c[1]][Number(c[3]) - 1]; return col ? col + Number(c[2]) : null; }
  const d = /^D-([TB])-(0[1-9]|1[0-9]|2[0-5])$/.exec(seatId || '');
  if (d) return ({ T: 'A', B: 'B' })[d[1]] + Number(d[2]);
  return null;
}
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
const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => 'USD ' + Number(n || 0).toLocaleString('en-US');

/* ---- what the record says, in one readable model ---- */
export function journeyModel(record) {
  const r = record && record.registration || {};
  const gr = r.guestRecord || {}, g0 = Array.isArray(gr.guests) && gr.guests[0] || {};
  const legacy = Array.isArray(r.guests) && r.guests[0] || null;   /* the older test shape */
  const guestId = record.guestId || r.guestId || (legacy && legacy.guestId) || '';
  const fullName = (g0.source && g0.source.fullName) || (legacy && (legacy.fullName || legacy.name)) || g0.name || guestId || 'Guest';
  const firstName = (g0.source && g0.source.preferredName) || g0.name || (legacy && legacy.name) || fullName.split(' ')[0];
  const partyName = gr.partyName || r.partyName || '';
  const contact = { email: (record.recipient && record.recipient.email) || (r.contact && r.contact.email) || (gr.contact && gr.contact.email) || (legacy && legacy.contact && legacy.contact.email) || '',
    phone: (record.recipient && record.recipient.phone) || (r.contact && r.contact.phone) || (gr.contact && gr.contact.phone) || (legacy && legacy.contact && legacy.contact.phone) || '' };
  const rooms0 = record.rooms || null;
  /* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): every line is the guest's own selection — but the engine is the truth of a
     stage: a line for a stage the engine has WAITLISTED for this guest (a stale device, a replayed draft) is not a stay and
     not a cost; the total is recomputed without it */
  const engineWaits = Object.entries(record.rooms || {}).filter(([, m]) => m && m.waitlisted).map(([k, m]) => m.stage || k);
  const lines0 = (Array.isArray(r.selections) ? r.selections : (Array.isArray(r.shared) ? r.shared : []));
  const lines = lines0.filter((x) => !(x && STAGE_OF_STAY[x.id] && engineWaits.includes(STAGE_OF_STAY[x.id])));
  const dropped = lines0.length !== lines.length;
  const order = (x) => { const i = STAGES.indexOf(x.id); return i < 0 ? 50 : i; };
  const sorted = lines.slice().sort((a, b) => order(a) - order(b));
  const rooms = record.rooms || null;
  const roomOf = (x) => { const st = STAGE_OF_STAY[x.id]; const m = rooms && rooms[st]; if (m && m.room && !m.waitlisted) return m.room; return x.unitName || (x.unit ? 'Room ' + x.unit : ''); };
  /* THE WAITING LIST (Owner, 19 Sep 2026): a stage no defined option could take — named with its position, never an amount */
  const STAGE_WORDS = { 'bkk-stay': 'Bangkok · Before the Wedding', prewed: 'Vientiane · Pre-Wedding Stay', wedstay: 'Vientiane · Wedding Stay', kmg: 'Kunming', ljg: 'Lijiang', kempinski: 'Bangkok · Siam Kempinski' };
  const waitlisted = Object.entries(rooms || {}).filter(([, m]) => m && m.waitlisted).map(([k, m]) => ({ stage: m.stage || k, name: STAGE_WORDS[m.stage || k] || (m.stage || k), position: m.position, size: m.size || 1 }));
  const arranged = [];
  const stays = sorted.filter((x) => (x.stay || STAGE_OF_STAY[x.id])).map((x) => ({ name: x.name, dates: (x.meta || '').split(' · ')[0], category: (x.meta || '').split(' · ').slice(1).join(' · '), room: roomOf(x), price: x.price, complimentary: !!x.complimentary, rate: x.rate, nights: x.nights, note: x.note ? x.note + (x.noteBy ? ' · ' + x.noteBy : '') : '', breakfast: x.breakfast || '', interest: !!x.interest }));
  const travel = sorted.filter((x) => TRAVEL.has(x.id) || (x.cls && !x.stay)).map((x) => ({ name: x.name, meta: x.meta || '', price: x.price }));
  const experiences = sorted.filter((x) => !stays.some((s) => s.name === x.name) && !travel.some((t) => t.name === x.name) && x.id !== 'sangkhathan').map((x) => ({ name: x.name, meta: x.meta || '', price: x.price }));
  const sang = lines.find((x) => x.id === 'sangkhathan');
  /* the wedding answers */
  const tc = r.templeCeremony && Array.isArray(r.templeCeremony.guests) && r.templeCeremony.guests[0] || null;
  const answerOf = (k) => { const v = tc && tc.events && tc.events[k]; if (!v) return legacy && legacy.events && legacy.events[k] ? String(legacy.events[k]) : ''; return String(v); };
  /* a guest not joining Vientiane is not at the wedding: every moment reads Not joining, no offering, no seat (Codex final pass, 18 Sep 2026) */
  const away = !!((gr.scope && gr.scope.at && !gr.scope.vientiane) || (gr.scope && gr.scope.none) || (tc && /^Not joining/.test(String(tc.participation || ''))) || (r.templeCeremony && /^Not joining/.test(String(r.templeCeremony.participation || ''))));
  const wedding = EVENTS.map((e) => ({ ...e, answer: away ? 'Not joining' : answerOf(e.key) }));
  const sangkhathan = away ? '' : (sang ? 'Yes · USD 15' : (tc && tc.sangkhathanState ? tc.sangkhathanState : ''));
  /* the seats: the engine's map for this guest */
  const m = r.seats && typeof r.seats === 'object' ? r.seats : null;
  const seatId = (ev) => away ? null : ((m && m[ev] && (m[ev][guestId] || (typeof m[ev] === 'string' ? m[ev] : null))) || (legacy && legacy[ev + 'Seat']) || null);
  /* the hosts are known from the record's authenticated identity (the Worker stores the register's host flag on the
     record) — never from a room, never from anything the client submitted */
  const hosts = record.hosts === true;
  const labelOf = (ev) => { if (away) return ''; const id = seatId(ev); if (id) return seatLabel(id) || (legacy && legacy[ev + 'SeatLabel']) || id; return (legacy && legacy[ev + 'SeatLabel']) || (ev === 'ceremony' && hosts ? 'Front centre' : ''); };
  const seats = { ceremony: { id: seatId('ceremony'), label: labelOf('ceremony'), when: '15:30', place: 'Souphattra Heritage' },
    dinner: { id: seatId('dinner'), label: labelOf('dinner'), when: '19:30', place: 'Souphattra Heritage · poolside' } };
  /* about you */
  const profile = PROFILE.map(([k, label]) => ({ label, value: profileValue(g0.profile, k) })).filter((p) => p.value);
  const allergy = (g0.allergy && g0.allergy.answer) || (gr.allergy && gr.allergy.answer) || (legacy && legacy.allergy && legacy.allergy.answer) || '';
  const allergyDetails = (g0.allergy && g0.allergy.details) || (gr.allergy && gr.allergy.details) || (legacy && legacy.allergy && legacy.allergy.details) || '';
  const acks = [];
  if ((g0.dress && g0.dress.acknowledged) || (gr.dress && gr.dress.all)) acks.push(['Dress code', 'Reviewed']);
  if ((g0.photo && g0.photo.acknowledged) || (gr.photo && gr.photo.acknowledged)) acks.push(['Photography & film', 'Reviewed']);
  /* documents (optional for the guest — Guest Relations sees the state) */
  const docs = r.documents && Array.isArray(r.documents.guests) && r.documents.guests[0] && Array.isArray(r.documents.guests[0].documents) ? r.documents.guests[0].documents.map((d) => ({ label: d.label || d.kind, state: d.state || '' })) : [];
  const publication = r.documents && Array.isArray(r.documents.guests) && r.documents.guests[0] ? r.documents.guests[0].publication || '' : '';
  const stated = r.totalUsd != null ? r.totalUsd : (r.total != null ? r.total : null);
  const total = stated == null ? null : (dropped ? lines.reduce((t, x) => t + (Number(x.price) || 0) * (Number(x.qty) || 1), 0) : stated);
  const upd = record.kind === 'update' && (record.version || 1) > 1;
  return { guestId, fullName, firstName, partyName, contact, stays, arranged, waitlisted, travel, experiences, wedding, sangkhathan, seats, profile, allergy, allergyDetails, acks, docs, publication, total, hosts,
    /* WHERE THEY JOIN US (Owner, 18 Sep 2026): the guest's participation scope as sent — the words the guest chose, or a decline */
    scope: typeof gr.scopeWords === 'string' && gr.scopeWords ? gr.scopeWords : (gr.scope && gr.scope.none ? 'Not joining this trip' : ''),
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
function journeySections(M, forOwner) {
  let s = '';
  if (M.travel.length) s += section('Travel', M.travel.map((t) => item(t.name, esc(t.meta), forOwner || t.price != null ? money(t.price) : '')).join(''));
  if (M.waitlisted && M.waitlisted.length) s += section('Waiting list', M.waitlisted.map((w) => item(w.name, 'No room could be confirmed yet · you are number ' + w.position + ' on the waiting list' + (w.size > 1 ? ' for ' + w.size + ' places' : '') + (forOwner ? '' : '<br>Guest Relations will find an arrangement with you'), '')).join(''));
  if (M.stays.length) s += section('Stays', M.stays.map((x) => item(x.name, esc(x.dates) + (x.category ? '<br>' + esc(x.category) : '') + (x.room ? '<br><span style="color:' + INK + ';">' + esc(x.room) + '</span>' : '') + (x.breakfast ? '<br>' + esc(x.breakfast) : '') + (x.note ? '<br>' + esc(x.note) : ''), x.complimentary ? 'Complimentary' : x.price != null ? money(x.price) : '')).join(''));
  if (M.experiences.length) s += section('Experiences', M.experiences.map((e) => item(e.name, esc(e.meta), e.price != null ? money(e.price) : '')).join(''));
  s += section('Wedding', kvTable(M.wedding.map((e) => kvRow(e.label, e.answer || '—', e.when + ' · ' + e.place)).concat(M.sangkhathan ? [kvRow('Sangkhathan', M.sangkhathan, 'A personal offering · USD 15 per participating guest')] : [])));
  const seatRows = [];
  if (M.seats.ceremony.label) seatRows.push(seat('Wedding Ceremony', M.seats.ceremony.place, M.seats.ceremony.when, /^Front/.test(M.seats.ceremony.label) ? M.seats.ceremony.label : 'Seat ' + M.seats.ceremony.label));
  if (M.seats.dinner.label) seatRows.push(seat('Wedding Dinner', M.seats.dinner.place, M.seats.dinner.when, 'Seat ' + M.seats.dinner.label));
  if (seatRows.length) s += section('Your seats', seatRows.join(''));
  const about = [];
  if (M.allergy) about.push(kvRow('Food allergies', M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None'));
  M.profile.forEach((p) => about.push(kvRow(p.label, p.value)));
  M.acks.forEach(([k, v]) => about.push(kvRow(k, v)));
  if (about.length) s += section('About you', kvTable(about));
  return s;
}

/* ---- THE GUEST EMAIL ---- */
export function composeGuestMail(record) {
  const M = journeyModel(record);
  const subject = (M.upd ? 'Your trip has been updated — ' : 'Your trip has been received — ') + M.reference;
  const intro = M.upd
    ? 'Your latest changes have been saved and sent to Guest Relations. This updated trip replaces the previous version for review.'
    : 'Thank you — your trip has reached Guest Relations. Your selections are saved, and we’ll review each arrangement personally with you.';
  let inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>' +
    h1(M.upd ? 'Your trip has been updated' : 'Your trip has been received') +
    para('Dear ' + esc(M.firstName) + ',') + para(esc(intro)) +
    '</td></tr>' + gap(10) +
    '<tr><td>' + kvTable([kvRow('Reference', M.reference), kvRow(M.upd ? 'Updated' : 'Sent', whenWords(M.sentAt)), M.scope ? kvRow('Where you join us', M.scope) : ''].filter(Boolean)) + '</td></tr>' + gap(14) + rule() +
    journeySections(M, false);
  if (M.total != null) inner += section('Your cost', '<p style="margin:4px 0 10px;font-family:' + SERIF + ';font-size:30px;line-height:1.2;color:' + INK + ';">' + esc(money(M.total)) + '</p>' +
    small('Nothing is paid on the website. Guest Relations confirms each arrangement with you personally.') +
    small('Tak Bat, the morning alms-giving, is a personal offering and not part of your trip cost. The Sangkhathan is an optional personal offering.'));
  inner += '<tr><td style="padding:30px 0 10px;">' + button(SITE + '/invitation', 'Open My Trip') + '</td></tr>' +
    '<tr><td>' + small('Use your own invitation code to sign in. For privacy, invitation codes are never sent by email.') +
    small('Guest Relations<br><a href="mailto:' + GR_EMAIL + '" style="color:' + INK + ';text-decoration:none;">' + GR_EMAIL + '</a>') + '</td></tr></table>';
  const html = shell(subject, inner);
  /* the plain-text fallback: the same facts, in order */
  const T = [];
  T.push('SEE YOU IN LAOS — MY TRIP', '', M.upd ? 'Your trip has been updated' : 'Your trip has been received', '', 'Dear ' + M.firstName + ',', '', intro, '',
    'Reference: ' + M.reference, (M.upd ? 'Updated: ' : 'Sent: ') + whenWords(M.sentAt), M.scope ? 'Where you join us: ' + M.scope : '', '');
  if (M.travel.length) { T.push('TRAVEL'); M.travel.forEach((t) => T.push('· ' + t.name + ' — ' + t.meta + (t.price != null ? ' — ' + money(t.price) : ''))); T.push(''); }
  if (M.waitlisted && M.waitlisted.length) { T.push('WAITING LIST'); M.waitlisted.forEach((w) => T.push('· ' + w.name + ' — no room could be confirmed yet · number ' + w.position + ' on the waiting list' + (w.size > 1 ? ' for ' + w.size + ' places' : ''))); T.push(''); }
  if (M.stays.length) { T.push('STAYS'); M.stays.forEach((x) => T.push('· ' + x.name + ' — ' + x.dates + (x.category ? ' — ' + x.category : '') + (x.room ? ' — ' + x.room : '') + (x.complimentary ? ' — Complimentary' : x.price != null ? ' — ' + money(x.price) : '') + (x.note ? ' (' + x.note + ')' : ''))); T.push(''); }
  if (M.experiences.length) { T.push('EXPERIENCES'); M.experiences.forEach((e) => T.push('· ' + e.name + ' — ' + e.meta + (e.price != null ? ' — ' + money(e.price) : ''))); T.push(''); }
  T.push('WEDDING'); M.wedding.forEach((e) => T.push('· ' + e.label + ' · ' + e.when + ' · ' + e.place + ': ' + (e.answer || '—'))); if (M.sangkhathan) T.push('· Sangkhathan: ' + M.sangkhathan); T.push('');
  if (M.seats.ceremony.label || M.seats.dinner.label) { T.push('YOUR SEATS'); if (M.seats.ceremony.label) T.push('· Wedding Ceremony · Souphattra Heritage · 15:30: ' + (/^Front/.test(M.seats.ceremony.label) ? M.seats.ceremony.label : 'Seat ' + M.seats.ceremony.label)); if (M.seats.dinner.label) T.push('· Wedding Dinner · Souphattra Heritage · 19:30: Seat ' + M.seats.dinner.label); T.push(''); }
  if (M.allergy || M.profile.length || M.acks.length) { T.push('ABOUT YOU'); if (M.allergy) T.push('· Food allergies: ' + (M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None')); M.profile.forEach((p) => T.push('· ' + p.label + ': ' + p.value)); M.acks.forEach(([k, v]) => T.push('· ' + k + ': ' + v)); T.push(''); }
  if (M.total != null) T.push('YOUR COST', money(M.total), 'Nothing is paid on the website. Guest Relations confirms each arrangement with you personally.', 'Tak Bat, the morning alms-giving, is a personal offering and not part of your trip cost. The Sangkhathan is an optional personal offering.', '');
  T.push('Open My Trip: ' + SITE + '/invitation', 'Use your own invitation code to sign in. For privacy, invitation codes are never sent by email.', '', 'Guest Relations · ' + GR_EMAIL, '', 'see you in laos. · Vientiane · 28 February 2027');
  return { subject, html, text: T.join('\n') };
}

/* ---- THE GUEST RELATIONS EMAIL ---- */
export function composeOwnerMail(record, statusUrl) {
  const M = journeyModel(record);
  const subject = (M.upd ? 'Trip updated — ' : 'Trip received — ') + M.fullName + ' · ' + M.reference;
  const docsRows = M.docs.map((d) => kvRow(d.label, d.state)).concat(M.publication ? [kvRow('Publication of photographs', M.publication)] : []);
  const missing = M.docs.filter((d) => /not provided/i.test(d.state)).map((d) => d.label);
  let inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>' +
    h1(M.upd ? 'Trip updated' : 'New trip received') + '</td></tr>' +
    (M.upd ? '<tr><td>' + label('Updated trip') + para('Latest version received ' + esc(whenWords(M.sentAt)) + '. It replaces the version first sent ' + esc(whenWords(M.firstSentAt)) + '.') + '</td></tr>' : '') +
    '<tr><td>' + kvTable([kvRow('Guest', M.fullName), M.partyName ? kvRow('Party', M.partyName) : '', kvRow('Email', M.contact.email || '—'), kvRow('Mobile', M.contact.phone || '—'),
      kvRow('Reference', M.reference), kvRow('Status', M.upd ? 'Updated trip' : 'Initial submission'), kvRow(M.upd ? 'Updated' : 'Sent', whenWords(M.sentAt)), M.scope ? kvRow('Where they join us', M.scope) : ''].filter(Boolean)) + '</td></tr>' + gap(14) + rule() +
    journeySections(M, true);
  if (docsRows.length) inner += section('Documents', kvTable(docsRows) + (missing.length ? '<p style="margin:10px 0 0;font-family:' + SANS + ';font-size:13px;color:' + INK + ';">Still needed: ' + esc(missing.join(', ')) + '</p>' : ''));
  if (M.total != null) inner += section('Cost', '<p style="margin:4px 0 6px;font-family:' + SERIF + ';font-size:26px;color:' + INK + ';">' + esc(money(M.total)) + '</p>' + small('The guest’s contribution as the website calculates it — nothing paid on the website.'));
  inner += section('Internal reference', kvTable([kvRow('Guest', M.guestId), kvRow('Invitation', M.invitationId), M.seats.ceremony.id ? kvRow('Ceremony seat record', M.seats.ceremony.id) : '', M.seats.dinner.id ? kvRow('Dinner seat record', M.seats.dinner.id) : '',
    kvRow('Submission', M.reference + ' · version ' + M.version), statusUrl ? kvRow('Status', statusUrl) : ''].filter(Boolean)));
  inner += '</table>';
  const html = shell(subject, inner, 'Guest Relations');
  const T = [];
  T.push('SEE YOU IN LAOS — GUEST RELATIONS', '', M.upd ? 'Trip updated' : 'New trip received', '');
  if (M.upd) T.push('Latest version received ' + whenWords(M.sentAt) + ' (replaces the version first sent ' + whenWords(M.firstSentAt) + ')', '');
  T.push('Guest: ' + M.fullName, M.partyName ? 'Party: ' + M.partyName : '', 'Email: ' + (M.contact.email || '—'), 'Mobile: ' + (M.contact.phone || '—'), 'Reference: ' + M.reference, 'Status: ' + (M.upd ? 'Updated trip' : 'Initial submission'), (M.upd ? 'Updated: ' : 'Sent: ') + whenWords(M.sentAt), M.scope ? 'Where they join us: ' + M.scope : '', '');
  if (M.travel.length) { T.push('TRAVEL'); M.travel.forEach((t) => T.push('· ' + t.name + ' — ' + t.meta + ' — ' + money(t.price))); T.push(''); }
  if (M.waitlisted && M.waitlisted.length) { T.push('WAITING LIST'); M.waitlisted.forEach((w) => T.push('· ' + w.name + ' — number ' + w.position + (w.size > 1 ? ' for ' + w.size + ' places' : '') + ' — to resolve')); T.push(''); }
  if (M.stays.length) { T.push('STAYS'); M.stays.forEach((x) => T.push('· ' + x.name + ' — ' + x.dates + (x.category ? ' — ' + x.category : '') + (x.room ? ' — ' + x.room : '') + ' — ' + money(x.price) + (x.note ? ' (' + x.note + ')' : ''))); T.push(''); }
  if (M.experiences.length) { T.push('EXPERIENCES'); M.experiences.forEach((e) => T.push('· ' + e.name + ' — ' + e.meta + ' — ' + money(e.price))); T.push(''); }
  T.push('WEDDING PARTICIPATION'); M.wedding.forEach((e) => T.push('· ' + e.label + ' (' + e.when + ' · ' + e.place + '): ' + (e.answer || '—'))); if (M.sangkhathan) T.push('· Sangkhathan: ' + M.sangkhathan); T.push('');
  T.push('SEATS', '· Wedding Ceremony: ' + (M.seats.ceremony.label ? (/^Front/.test(M.seats.ceremony.label) ? M.seats.ceremony.label : 'Seat ' + M.seats.ceremony.label) : 'no seat held'), '· Wedding Dinner: ' + (M.seats.dinner.label ? 'Seat ' + M.seats.dinner.label : 'no seat held'), '');
  T.push('ABOUT YOU', '· Food allergies: ' + (M.allergy ? (M.allergy === 'yes' ? (M.allergyDetails || 'Yes') : 'None') : '—')); M.profile.forEach((p) => T.push('· ' + p.label + ': ' + p.value)); M.acks.forEach(([k, v]) => T.push('· ' + k + ': ' + v)); T.push('');
  if (M.docs.length || M.publication) { T.push('DOCUMENTS'); M.docs.forEach((d) => T.push('· ' + d.label + ': ' + d.state)); if (M.publication) T.push('· Publication of photographs: ' + M.publication); if (missing.length) T.push('Still needed: ' + missing.join(', ')); T.push(''); }
  if (M.total != null) T.push('COST', money(M.total), '');
  T.push('INTERNAL REFERENCE', 'Guest: ' + M.guestId, 'Invitation: ' + M.invitationId); if (M.seats.ceremony.id) T.push('Ceremony seat record: ' + M.seats.ceremony.id); if (M.seats.dinner.id) T.push('Dinner seat record: ' + M.seats.dinner.id); T.push('Submission: ' + M.reference + ' · version ' + M.version); if (statusUrl) T.push('Status: ' + statusUrl);
  return { subject, html, text: T.filter((l, i) => l !== '' || (i > 0 && T[i - 1] !== '')).join('\n') };
}
