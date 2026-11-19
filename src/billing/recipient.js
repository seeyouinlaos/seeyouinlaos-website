/* ============================================================================
   THE RECIPIENT OF A STATEMENT (Owners, 19 Nov 2026 · HS-004.6 — critical). No statement is issued without the full name of the guest
   it is addressed to and of every person on its lines. The names come from the served index (invitation → guest id → 006 id) and the
   006 register (Firstname, Surname), read at the issue and FROZEN with the revision — the PDF prints exactly those, whatever the
   register says later. Anything missing, contradictory or unprintable blocks the issue, named; never a guess, never an id instead of a
   name.
   ========================================================================== */
const clean = (v) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
const MAX = 120;

/** The register row of a 006 id as the gate reads it: one row, both names. */
function rowOf(register, contactId) {
  const id = clean(contactId);
  if (!id) return { why: 'NOT_RESOLVED' };
  const r = register ? register[id] : undefined;
  if (r === undefined) return { why: 'NOT_RESOLVED' };
  if (!r || r.ambiguous) return { why: 'AMBIGUOUS' };
  const first = clean(r.first), last = clean(r.last);
  if (!first || !last) return { why: 'NAME_INCOMPLETE' };
  return { name: (first + ' ' + last).slice(0, MAX) };
}

/**
 * entries   the served index (values with i = invitation, g = guest id, c = 006 id)
 * register  the 006 register (loadGuestRegister)
 * holderId  the invitation the statement is for
 * lines     every engine line the statement will carry (Block A and Block B)
 * printable (text) → boolean — the writer's own test (pdf.js · isPrintable)
 * → { ok, recipient: { Holder_ID, Person_ID, name } | null, personNames: { G0xx: 'Full Name' }, reasons: [] }
 */
export function recipientOfIssue({ entries, register, holderId, lines, printable }) {
  const reasons = [];
  const list = Object.values(entries || {}).filter((e) => e && typeof e === 'object');
  const reg = register && typeof register === 'object' ? register : null;
  if (!list.length || !reg || !Object.keys(reg).length) return { ok: false, recipient: null, personNames: {}, reasons: ['NAMES_UNREADABLE: the guest index or the 006 register cannot be read just now'] };
  const canPrint = typeof printable === 'function' ? printable : () => true;
  /* the holder: exactly one guest and one 006 id behind the invitation */
  const mine = list.filter((e) => clean(e.i) === clean(holderId));
  const pairs = [...new Set(mine.map((e) => clean(e.g) + '|' + clean(e.c)))];
  let recipient = null;
  if (pairs.length !== 1 || !clean(mine[0].g)) reasons.push('RECIPIENT_NOT_RESOLVED: the invitation ' + holderId + ' is not exactly one guest of the index');
  else {
    const [guestId, contactId] = pairs[0].split('|');
    const r = rowOf(reg, contactId);
    if (r.why) reasons.push('RECIPIENT_' + r.why + ': the recipient (' + guestId + ') has no single 006 row with first name and surname');
    else if (!canPrint(r.name)) reasons.push('NAME_NOT_PRINTABLE:' + guestId + ' — the recipient\'s name has a character the statement cannot print');
    else recipient = { Holder_ID: clean(holderId), Person_ID: guestId, name: r.name };
  }
  /* every person on the lines */
  const personNames = {};
  const persons = [...new Set((lines || []).map((l) => clean(l && l.Person_ID)).filter(Boolean))].sort();
  for (const pid of persons) {
    const cs = [...new Set(list.filter((e) => clean(e.g) === pid).map((e) => clean(e.c)).filter(Boolean))];
    if (!cs.length) { reasons.push('PERSON_NAME_MISSING:' + pid + ' — no 006 row behind this guest id'); continue; }
    if (cs.length > 1) { reasons.push('PERSON_AMBIGUOUS:' + pid + ' — the index names two 006 rows for this guest id'); continue; }
    const r = rowOf(reg, cs[0]);
    if (r.why === 'AMBIGUOUS') { reasons.push('PERSON_AMBIGUOUS:' + pid + ' — the 006 id is on two rows'); continue; }
    if (r.why) { reasons.push('PERSON_NAME_MISSING:' + pid + ' — no single 006 row with first name and surname'); continue; }
    if (!canPrint(r.name)) { reasons.push('NAME_NOT_PRINTABLE:' + pid + ' — a character of the name cannot be printed'); continue; }
    personNames[pid] = r.name;
  }
  return { ok: reasons.length === 0, recipient, personNames, reasons };
}
