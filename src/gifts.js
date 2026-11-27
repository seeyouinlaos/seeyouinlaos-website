/* ============================================================================
   PERSONAL RATES · THE BRIDE & GROOM'S HOSPITALITY (Owner, 28 Sep 2026) — a guest's own charge, never a price.

   The Operations Master (002_Accommodation_Details, rows "Special Rate and Special Payment Terms") gives a few guests their own
   charge for one room of one stay. Each entry is that guest's charge for that room of that window, per person, for the whole
   window — or, for an employee rate, for the whole room:
     · gift      — complimentary, "from the Bride & Groom" (the guest's charge is nothing)
     · special   — a personal rate, the stated total for the window
     · employee  — a personal employee rate for the whole room, paid in full by that guest alone (never split with a partner)
     · statement — no charge of its own (the server's amount stands): this guest's stay is settled through their statement to
                   Haruthai & Suthep, so the page and the trip e-mail say so and show no hotel link (Owners, 19 Nov 2026 · HS-031.8)
   Nothing else changes: the hotel's rate stays the rate for everyone else (assets/rooms-data.js), the room is held and counted like
   any other (the room engine never reads this), another room of the same stay is priced as usual, and nobody else — not the guest's
   party — is touched.

   WHO: the register's permanent person id (CONxxx), resolved on the server from the guest's own bearer (the auth index entry of
   their invitation · personOf in src/worker.js) — never a name, never anything a client sends. The list is read by the Worker
   only: GET /api/gifts answers a signed-in guest with their own entries and nothing else; there is no public table.
   ========================================================================== */
const E = (contactId, window, room, kind, charge, extra) => Object.freeze({ contactId, window, room, kind, charge, ...(kind === 'gift' ? { by: 'bride-groom' } : {}), ...(extra || {}) });
export const GIFTS = Object.freeze([
  /* E21 · pre-wedding, Heritage Executive: USD 225 for the two nights, each — for these two register ids only */
  E('CON005', 'prewed', 'heritage-executive', 'special', 225),
  E('CON010', 'prewed', 'heritage-executive', 'special', 225),
  /* E30 · Wedding Stay, Heritage Executive: complimentary from the Bride & Groom, for the same two register ids */
  E('CON005', 'wedstay', 'heritage-executive', 'gift', 0),
  E('CON010', 'wedstay', 'heritage-executive', 'gift', 0),
  /* W · Hotel Muse Bangkok, the Jatu Room: an employee rate for this one register id — USD 116 the room per night, W27 = USD 232
     the two nights; W30: this guest pays 100 % of the room cost, never split with their party mate (who holds no entry) */
  E('CON005', 'kempinski', 'jatu-room', 'employee', 232, { per: 'room' }),
  /* J30 · the Souphattra Presidential for the Bride & Groom: USD 150 the room per night, all four nights, USD 600 in all —
     USD 75 per person per night: USD 150 each for the two pre-wedding nights and USD 150 each for the two wedding nights */
  E('CON001', 'prewed', 'souphattra-presidential', 'special', 150),
  E('CON002', 'prewed', 'souphattra-presidential', 'special', 150),
  E('CON001', 'wedstay', 'souphattra-presidential', 'special', 150, { nights: 'both' }),
  E('CON002', 'wedstay', 'souphattra-presidential', 'special', 150, { nights: 'both' }),
  /* E21 · pre-wedding (25 – 27 February 2027), Heritage Executive · Peggy & Steffie (Owner, 3 Oct 2026): "260 USD for 2 Nights not
     per Person · both pay total 260" — one room, both guests, both nights: USD 130 each for the two nights (USD 65 per person per
     night). Their personal rate only: the public pre-wedding Heritage Executive rate is unchanged (assets/rooms-data.js). */
  E('CON003', 'prewed', 'heritage-executive', 'special', 130),
  E('CON004', 'prewed', 'heritage-executive', 'special', 130),
  /* A2 · U Sathorn Bangkok (21 – 24 February 2027) · this one register id (Owners, 19 Nov 2026 · HS-031.8): the stay is settled through
     the guest's statement to Haruthai & Suthep (USD 203.42 open on it) — the page and the trip e-mail must not send the guest to pay the
     hotel a second time. Her booking, her price and her open amount are the engine's and are not touched here. */
  E('CON010', 'bkk-stay', 'u-sathorn-superior-garden', 'statement', null),
  /* HS-060 · THE OWNERS' REBOOKING (Owners, 27 Nov 2026): a complimentary upgrade to the Noble Courtyard Suite for the pre-wedding and
     the wedding nights for these two register ids — each keeps their own charge (009 rows on the new rooms): USD 325 for the two
     pre-wedding nights (162.50 per night), USD 170 for the wedding stay (the second night hosted). A later send keeps these amounts. */
  E('CON083', 'prewed', 'noble-courtyard', 'special', 325),
  E('CON084', 'prewed', 'noble-courtyard', 'special', 325),
  E('CON083', 'wedstay', 'noble-courtyard', 'special', 170),
  E('CON084', 'wedstay', 'noble-courtyard', 'special', 170),
]);

/* the entries of one person, in the form the guest's own pages read (never the person id) */
export function giftsFor(contactId, list) {
  if (typeof contactId !== 'string' || !contactId) return [];
  return (list || GIFTS).filter((g) => g.contactId === contactId).map((g) => {
    const out = { window: g.window, room: g.room, kind: g.kind, charge: g.charge };
    if (g.by) out.by = g.by; if (g.per) out.per = g.per; if (g.nights) out.nights = g.nights;
    return out;
  });
}

/* the entry that covers this Bag line (its window id and room slug), if any */
export function entryFor(gifts, line) {
  return (line && Array.isArray(gifts) && gifts.find((g) => g.window === line.id && g.room === line.room)) || null;
}
export function isGift(gifts, line) { const e = entryFor(gifts, line); return !!(e && (e.kind || 'gift') === 'gift'); }

/* a sent stay the sender's own entry says is settled through the statement carries viaStatement (for the trip e-mail's words); a line
   that claims it without the entry loses it — never a price, only the words */
export function statementLines(lines, gifts) {
  if (!Array.isArray(lines)) return lines;
  return lines.map((l) => {
    if (!l || typeof l !== 'object') return l;
    const e = entryFor(gifts, l);
    if (e && e.kind === 'statement') return { ...l, viaStatement: true };
    if (!l.viaStatement) return l;
    const { viaStatement, ...rest } = l;
    return rest;
  });
}

/* a sent line keeps a personal charge only when the sender holds it — at exactly the entry's charge; a line that claims one it
   does not hold is the hotel's rate again (rate × payable nights) */
export function verifiedLines(lines, gifts) {
  if (!Array.isArray(lines)) return lines;
  return lines.map((l) => {
    if (!l || typeof l !== 'object' || !(l.gift || l.personal)) return l;
    const e = entryFor(gifts, l);
    /* a statement entry carries no charge (HS-031.8): it never touches a sent line's amount */
    if (e && e.kind !== 'statement') {
      const out = { ...l, price: e.charge };
      if ((e.kind || 'gift') === 'gift') { out.gift = e.by || 'bride-groom'; delete out.personal; } else { out.personal = e.kind; delete out.gift; }
      return out;
    }
    const { gift, personal, ...rest } = l;
    const rate = Number(rest.rate), pay = Number(rest.pay) || 1;
    if (Number.isFinite(rate)) rest.price = Math.round(rate * pay * 100) / 100;
    return rest;
  });
}
