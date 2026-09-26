'use strict';
/**
 * THE REGISTER FROM THE GUEST LIST (Owner, 19 Sep 2026 · "Guest List 007 is now authoritative").
 *
 *   node src/guestlist-from-contacts.cjs --report              # the mapping, counts only on stdout (names go to the private report)
 *   node src/guestlist-from-contacts.cjs --write               # writes src/guestlist.private.json (the old one backed up, dated)
 *
 * Input (never committed): src/contacts-<date>.private.tsv — the CONTACTS sheet of H&S_Wedding_Operations_Master, the
 * register-relevant columns only: ID · Firstname · Surname · Nickname · Couple · Letter · Role · Sending Invitation · Notes.
 * Output: src/guestlist.private.json in the party shape src/build-invitations.cjs consumes. The builder then keeps every
 * existing code (by guestId), creates codes for new guests and retires the codes of guests who are no longer invited.
 *
 * Rules (the Owner's sheet, read literally):
 *   · a row is a guest when its Role starts with "Guest" or is "Document Owner" (the hosts) and it has a name
 *     (Firstname or Nickname); "No" as a first name is the sheet's word for no partner and is never a guest;
 *     a row whose Notes say "Not Attend" is not invited;
 *   · the party is the Couple code (COUPLnnn); SIGL / SIGNL are single-person parties;
 *   · preferred name = Nickname, else the first word of Firstname (a parenthesis is not a name);
 *     full name = Firstname + Surname (or the preferred name alone when the sheet carries no name);
 *   · an existing guest keeps guestId (and so the code): matched by full name, by preferred name, by first name + surname,
 *     or by the alias table below (the spellings the 16 Sep reconciliation established); every other guest is new (G050…);
 *   · an existing guest the sheet no longer invites is kept with status CANCELLED (the code is retired, nothing forgotten);
 *   · the hosts are the Document Owner rows: G048 Haruthai (BRIDE) · G049 Suthep (GROOM) · party INV-001 — the FIXED
 *     allocation in src/inventory-seed.js names these ids;
 *   · rows that cannot be invited by name are REPORTED, never invented: a blank name, "her daughter", "No",
 *     a relationship placeholder such as "Aob's girlfriend" (19 Sep 2026) or a "." surname.
 * Nothing here prints a code, an email, a phone number or a birthdate.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const TSV = args.find((a) => a.endsWith('.tsv')) || path.join(ROOT, 'src', 'contacts-2026-09-19.private.tsv');
const LIST = path.join(ROOT, 'src', 'guestlist.private.json');
const REPORT = path.join(ROOT, 'src', 'guestlist-from-contacts.report.private.txt');

/* THE PERMANENT PERSON ID (Owner, 20 Sep 2026): CONxxx is one person for ever — never renumbered, never recycled. The register
   remembers it per guest (`contactId`) and matches by it first. The sheet was renumbered between the 19 Sep and the 20 Sep
   reads, so the earlier row-keyed alias table is gone: the aliases below are keyed by the PERSON as the sheet spells them
   (nickname + surname, or the full name) — the 16 Sep 2026 reconciliation, confirmed by the party partner. */
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ALIAS_BY_PERSON = { 'ozhan arslan': 'G004', 'paddy kongkeow': 'G007', 'arisa shimizu': 'G008', 'beauty boontawee': 'G032', 'pandharee boontawee': 'G032', 'jum sohee': 'G041', 'jum': 'G041',
  'sim ruangjirachuporn': 'G042', 'apichet ruangjirachuporn': 'G042', 'ket mccrink': 'G009', 'surangkana mccrink': 'G009', 'fio kueffner': 'G045', 'fiona kueffner': 'G045', 'lee singhaveerasamorn': 'G015', 'wanlee singhaveerasamorn': 'G015',
  'whan asadontirauyudh': 'G034', 'pimvadee asadontirauyudh': 'G034',
  /* 20 Sep 2026: guests the earlier sheet had retired and the current sheet names again under a corrected spelling — the same
     person keeps the same id (their retired code is replaced by a new one, never reused) */
  'preeyaporn chaichankarnchang': 'G027', 'ju chaichankarnchang': 'G027', 'pornpan laolerkuthai': 'G031', 'mimi laolerkuthai': 'G031', 'papitchaya yuenyao': 'G046', 'new yuenyao': 'G046' };
/* the sheet's words for "no name": never a name, never invented */
const NO_NAME = (v) => /^no( name)?$/i.test(String(v || '').trim());
/* the profile the sheet knows (prefilled for the guest to review and correct — the guest's own record, per person) */
const isoDate = (v) => { const m = String(v || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); const iso = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/); return iso ? iso[0] : ''; };
/* the sheet's placeholders for "nothing here" ("-", "\\-", "x", ".") are never a guest's data: never prefilled (26 Sep 2026 — a
   one-character phone also matched every ciphertext and stopped the builder's leak guard) */
const real = (v) => { const t = String(v || '').trim(); return t && !/^[\s\\\-–—x.]*$/i.test(t) ? t : ''; };
const profileOf = (r) => { const p = {}; const bd = isoDate(r.Birthdate); if (bd) p.birthdate = bd; if (real(r.Nationality)) p.nationality = real(r.Nationality).replace(/\s*[\/,]\s*/g, ', ').trim(); if (real(r.Phone)) p.phone = real(r.Phone); if (r.Email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.Email).trim())) p.email = String(r.Email).trim(); if (real(r.Address)) p.address = { line1: real(r.Address).replace(/\s+/g, ' ').trim() }; return p; };
const firstWord = (s) => norm(String(s || '').replace(/\(.*?\)/g, '')).split(' ')[0] || '';

function readTsv(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split('\t');
  return lines.map((l) => { const c = l.split('\t'); const r = {}; head.forEach((h, i) => { r[h] = (c[i] || '').trim(); }); return r; });
}

function main() {
  const rows = readTsv(TSV);
  const old = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const oldGuests = []; for (const p of old) for (const g of p.guests) oldGuests.push({ ...g, partyId: p.invitationId, partyName: p.partyName, hosts: !!p.hosts, giving: p.givingEligibility || '' });
  const byId = Object.fromEntries(oldGuests.map((g) => [g.guestId, g]));
  const byContact = Object.fromEntries(oldGuests.filter((g) => g.contactId).map((g) => [g.contactId, g]));
  const usedOld = new Set();
  const notes = [];   /* the private report lines */
  const skipped = [];
  const invited = [];  /* { row, guestId (existing|new), preferredName, fullName, partyKey, hostRole } */

  const isGuestRow = (r) => (/^Guest/.test(r.Role) || r.Role === 'Document Owner');
  for (const r of rows) {
    if (!r.ID) continue;
    if (!isGuestRow(r)) { if (r.Firstname || r.Nickname) skipped.push([r.ID, 'no guest role', r.Firstname || r.Nickname]); continue; }
    const first = NO_NAME(r.Firstname) ? '' : String(r.Firstname || '').trim(), nick = NO_NAME(r.Nickname) ? '' : String(r.Nickname || '').trim();
    const surname = NO_NAME(r.Surname) ? '' : String(r.Surname || '').trim();
    if (NO_NAME(r.Firstname) && nick) notes.push(r.ID + ' · the sheet carries no first name ("' + r.Firstname + '") — the nickname stands, nothing invented');
    if (/not attend/i.test(r.Notes || '')) { skipped.push([r.ID, 'Not Attend (the sheet\'s note)', nick || first]); continue; }
    if (!first && !nick) { skipped.push([r.ID, NO_NAME(r.Firstname) ? '"' + r.Firstname + '" — the sheet\'s word for a partner not yet named' + (/^COUPL/.test(r.Couple) ? ' (party ' + r.Couple + ' kept for the named member; the Owner names the guest, then the code is made)' : '') : 'no name on the row', '']); continue; }
    if (/^her daughter$/i.test(first)) { skipped.push([r.ID, 'not named ("her daughter") — the Owner names the guest, then the code is made', r.Surname]); continue; }
    /* a relationship placeholder is not a name (the 19 Sep 2026 sheet: "Aob's girlfriend" with the surname "."): no code is
       made for a guest the Owner has not named — reported, never invented, never a duplicate of the named partner */
    if (/(^|\s)(girlfriend|boyfriend|wife|husband|partner|fianc[ée]e?|daughter|son|friend|guest|plus one)$/i.test(first) && /['’]s\s|^(her|his|their)\s/i.test(first)) { skipped.push([r.ID, 'a placeholder, not a name ("' + first + '") — the Owner names the guest, then the code is made', r.Surname]); continue; }
    if (/^[.\-–—?]+$/.test(String(r.Surname || '').trim()) && !nick) { skipped.push([r.ID, 'a placeholder surname ("' + r.Surname + '") — the Owner names the guest, then the code is made', first]); continue; }
    /* the preferred name: the nickname, else the first name as written (a parenthesis is not a name; a double first name stays whole) */
    let preferredName = nick || first.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    const fullName = [(first || nick).replace(/\s+/g, ' ').trim(), surname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || preferredName;
    /* the same person twice on the sheet (the same first name and surname, or the same Instagram handle): one invitation — the
       first row is the person, the later row is REPORTED with its id for the Owner; what the later row knows and the first
       does not (a phone, an email) is kept for the same person, nothing else merged */
    /* a shared email, phone or Instagram alone never makes two rows one person (a family shares a route); the same full name does */
    const twin = surname ? invited.find((g) => norm(g.fullName) === norm(fullName)) : null;
    if (twin) { const extra = profileOf(r); const took = []; for (const k of Object.keys(extra)) if (!twin.profile[k]) { twin.profile[k] = extra[k]; took.push(k); } skipped.push([r.ID, 'the same person as ' + twin.row.ID + ' (same name' + (r.Instagram && norm(twin.row.Instagram) === norm(r.Instagram) ? ', same Instagram' : '') + ') — one identity, one code; ' + (took.length ? 'took from this row: ' + took.join(', ') : 'nothing new on this row'), fullName]); continue; }
    /* the existing guest, if any: the permanent person id first, then the person aliases, then the names */
    let match = byContact[r.ID] || null, how = match ? 'contact id' : '';
    if (!match) { const keys = [norm(nick + ' ' + surname), norm(first + ' ' + surname), norm(fullName), nick && !surname ? norm(nick) : '']; for (const k of keys) if (k && ALIAS_BY_PERSON[k] && byId[ALIAS_BY_PERSON[k]]) { match = byId[ALIAS_BY_PERSON[k]]; how = 'alias'; break; } }
    if (!match) {
      const fn = firstWord(first || nick), sn = norm(surname), pn = norm(preferredName), full = norm(fullName);
      const cands = oldGuests.filter((g) => !usedOld.has(g.guestId));
      match = cands.find((g) => norm(g.fullName) === full) || null; if (match) how = 'full name';
      if (!match && sn) { match = cands.find((g) => norm(g.fullName) === norm(first) + ' ' + sn || (firstWord(g.fullName) === fn && norm(g.fullName).endsWith(' ' + sn))) || null; if (match) how = 'first name + surname'; }
      if (!match && pn) { match = cands.find((g) => norm(g.preferredName) === pn && (!sn || !norm(g.fullName).includes(' ') || norm(g.fullName).endsWith(' ' + sn) || firstWord(g.fullName) === fn)) || null; if (match) how = 'preferred name'; }
      if (!match && fn) { const same = cands.filter((g) => firstWord(g.fullName) === fn); if (same.length === 1 && (!sn || !norm(same[0].fullName).includes(' '))) { match = same[0]; how = 'first name (the only one)'; } }
    }
    if (match && usedOld.has(match.guestId)) { notes.push(r.ID + ' · ' + preferredName + ' → ' + match.guestId + ' already taken by another row — treated as NEW'); match = null; how = ''; }
    if (match) usedOld.add(match.guestId);
    /* the hosts keep the names the website already speaks with ("hosted by Haruthai & Suthep", the FIXED allocation) */
    if (r.Role === 'Document Owner' && match) preferredName = match.preferredName;
    if (match && norm(match.preferredName) !== norm(preferredName)) notes.push(r.ID + ' · preferred name follows the sheet: ' + match.preferredName + ' → ' + preferredName + ' (' + match.guestId + ')');
    invited.push({ row: r, guestId: match ? match.guestId : null, how, preferredName, fullName, contactId: r.ID, couple: /^COUPL/.test(r.Couple) ? r.Couple : 'SIGL', profile: profileOf(r), route: String(r['Sending Invitation'] || '').trim(), partyKey: /^COUPL/.test(r.Couple) ? r.Couple : 'SINGLE:' + r.ID,
      hostRole: r.Role === 'Document Owner' ? (match && match.hostRole) || (/haruthai/i.test(first) ? 'BRIDE' : 'GROOM') : null, hosts: r.Role === 'Document Owner' });
  }
  /* new ids after the highest existing one */
  let next = Math.max(...oldGuests.map((g) => parseInt(g.guestId.replace(/^G/, ''), 10)).filter((n) => !isNaN(n))) + 1;
  for (const g of invited) if (!g.guestId) { g.guestId = 'G' + String(next++).padStart(3, '0'); g.how = 'NEW'; }
  /* the parties: an existing party id when every matched member belonged to it; otherwise the next INV-0nn */
  const oldPartyIds = old.map((p) => p.invitationId);
  let nextParty = Math.max(...oldPartyIds.map((x) => parseInt(x.replace(/^INV-/, ''), 10))) + 1;
  const parties = new Map();
  for (const g of invited) {
    if (!parties.has(g.partyKey)) parties.set(g.partyKey, { members: [] });
    parties.get(g.partyKey).members.push(g);
  }
  const outParties = [];
  const takenPartyIds = new Set();
  for (const [key, p] of parties) {
    const oldIds = [...new Set(p.members.map((m) => byId[m.guestId] && byId[m.guestId].partyId).filter(Boolean))];
    let invitationId = oldIds.length === 1 && !takenPartyIds.has(oldIds[0]) ? oldIds[0] : null;
    if (!invitationId) invitationId = 'INV-' + String(nextParty++).padStart(3, '0');
    takenPartyIds.add(invitationId);
    const hosts = p.members.some((m) => m.hosts);
    const oldParty = old.find((x) => x.invitationId === invitationId);
    const partyName = hosts ? 'Haruthai & Suthep' : p.members.map((m) => m.preferredName).join(' & ');
    const lead = hosts ? (p.members.find((m) => m.hostRole === 'BRIDE') || p.members[0]).guestId : p.members[0].guestId;
    outParties.push({ invitationId, partyName, partyLead: lead,
      guests: p.members.map((m) => ({ guestId: m.guestId, fullName: m.fullName, preferredName: m.preferredName, contactId: m.contactId, couple: m.couple, ...(m.route ? { route: m.route } : {}), ...(Object.keys(m.profile).length ? { profile: m.profile } : {}), ...(m.hostRole ? { hostRole: m.hostRole } : {}) })),
      givingEligibility: (oldParty && oldParty.givingEligibility) || 'PAIR', ...(hosts ? { hosts: true } : {}) });
  }
  /* guests no longer invited: kept, cancelled */
  const gone = oldGuests.filter((g) => !usedOld.has(g.guestId));
  for (const g of gone) {
    let p = outParties.find((x) => x.invitationId === g.partyId);
    if (!p) { p = { invitationId: g.partyId, partyName: g.partyName, partyLead: g.guestId, guests: [], givingEligibility: g.giving || 'PAIR', status: 'CANCELLED' }; outParties.push(p); }
    p.guests.push({ guestId: g.guestId, fullName: g.fullName, preferredName: g.preferredName, ...(g.contactId ? { contactId: g.contactId } : {}), ...(g.hostRole ? { hostRole: g.hostRole } : {}), status: 'CANCELLED' });
  }
  outParties.sort((a, b) => a.invitationId.localeCompare(b.invitationId));
  /* the hosts' ids are the FIXED allocation's */
  const hostParty = outParties.find((p) => p.hosts);
  const hostIds = hostParty ? hostParty.guests.map((g) => g.guestId).sort().join(',') : '';
  if (hostIds !== 'G048,G049' || (hostParty && hostParty.invitationId !== 'INV-001')) throw new Error('the hosts must stay G048/G049 in INV-001 (FIXED allocation) — got ' + hostIds + ' ' + (hostParty && hostParty.invitationId));

  const activeGuests = outParties.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE').reduce((n, p) => n + p.guests.filter((g) => (g.status || 'ACTIVE') === 'ACTIVE').length, 0);
  const counts = { sheetRows: rows.filter((r) => r.ID).length, guestRows: rows.filter(isGuestRow).length, invited: invited.length, existingKept: invited.filter((g) => g.how !== 'NEW').length, newGuests: invited.filter((g) => g.how === 'NEW').length,
    cancelled: gone.length, parties: outParties.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE').length, activeGuests, skipped: skipped.length };
  /* the private report: names, never codes */
  const rep = ['THE REGISTER FROM THE GUEST LIST · PRIVATE · ' + new Date().toISOString(), 'source: ' + path.basename(TSV), 'counts: ' + JSON.stringify(counts), '', 'INVITED (row · preferred · full · guestId · how · party)'];
  for (const g of invited) rep.push('  ' + g.row.ID + ' · ' + g.preferredName + ' · ' + g.fullName + ' · ' + g.guestId + ' · ' + g.how + ' · ' + g.partyKey);
  rep.push('', 'NO LONGER INVITED (cancelled, code retired)'); for (const g of gone) rep.push('  ' + g.guestId + ' · ' + g.preferredName + ' · ' + g.fullName + ' · party ' + g.partyId);
  rep.push('', 'NOT INVITED BY THIS RUN (the Owner decides)'); for (const s of skipped) rep.push('  ' + s.join(' · '));
  rep.push('', 'ALIASES (person as the sheet spells them → register guest)');
  for (const [k, gid] of Object.entries(ALIAS_BY_PERSON)) { const g = byId[gid]; rep.push('  ' + k + ' → ' + gid + ' ' + (g ? g.fullName + ' (' + g.preferredName + ')' : '?')); }
  rep.push('', 'PARTIES (couple id → members)'); for (const [key, p] of parties) rep.push('  ' + key + ' · ' + p.members.map((m) => m.contactId + ' ' + m.preferredName + ' (' + m.guestId + ')').join(' + '));
  rep.push('', 'PROFILE DATA ON THE SHEET (counts): birthdate ' + invited.filter((g) => g.profile.birthdate).length + ' · nationality ' + invited.filter((g) => g.profile.nationality).length + ' · phone ' + invited.filter((g) => g.profile.phone).length + ' · email ' + invited.filter((g) => g.profile.email).length + ' · address ' + invited.filter((g) => g.profile.address).length);
  rep.push(''); for (const n of notes) rep.push('  NOTE ' + n);
  fs.writeFileSync(REPORT, rep.join('\n') + '\n');
  console.log(JSON.stringify(counts));
  console.log('report: ' + path.basename(REPORT) + ' (KEEP PRIVATE)');
  if (!flag('write')) { console.log('report only — nothing written to the list'); return; }
  const stamp = new Date().toISOString().slice(0, 10);
  const backup = path.join(ROOT, 'src', 'guestlist.' + stamp + '-before-007.backup.private.json');
  /* the parties keep their ids across runs; the profile fields are the sheet's — the guest corrects them on the site */
  if (!fs.existsSync(backup)) fs.copyFileSync(LIST, backup);
  fs.writeFileSync(LIST, JSON.stringify(outParties, null, 2) + '\n');
  console.log('written: src/guestlist.private.json (backup ' + path.basename(backup) + ')');
}
main();
