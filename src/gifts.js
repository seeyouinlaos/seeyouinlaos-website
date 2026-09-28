/* ============================================================================
   THE BRIDE & GROOM'S HOSPITALITY (Owner, 28 Sep 2026) — a guest's own charge, never a price.

   A few stays are the Bride & Groom's gift to one guest: that guest's charge for that one room of that one stay is USD 0, shown
   as "Complimentary · from the Bride & Groom". Nothing else changes — the hotel's rate stays the rate (assets/rooms-data.js),
   the room is held and counted like any other (the room engine never reads this), another room of the same stay is priced as
   usual, and nobody else — not the guest's party — is touched.

   WHO: the register's permanent person id (CONxxx), resolved on the server from the guest's own bearer (the auth index entry of
   their invitation · personOf in src/worker.js) — never a name, never anything a client sends. The list is read by the Worker
   only: GET /api/gifts answers a signed-in guest with their own entries and nothing else; there is no public table.
   ========================================================================== */
export const GIFTS = Object.freeze([
  /* D1 · Wedding Stay · Souphattra Heritage · The Heritage · 27 February – 1 March 2027 */
  Object.freeze({ contactId: 'CON005', window: 'wedstay', room: 'heritage', by: 'bride-groom' }),
]);

/* the entries of one person, in the form the guest's own pages read */
export function giftsFor(contactId, list) {
  if (typeof contactId !== 'string' || !contactId) return [];
  return (list || GIFTS).filter((g) => g.contactId === contactId).map((g) => ({ window: g.window, room: g.room, by: g.by }));
}

/* is this Bag line (its window id and room slug) one of these gifts */
export function isGift(gifts, line) {
  return !!(line && Array.isArray(gifts) && gifts.some((g) => g.window === line.id && g.room === line.room));
}

/* a sent line keeps its gift only when the sender holds it: a line that claims one it does not hold is the hotel's rate again */
export function verifiedLines(lines, gifts) {
  if (!Array.isArray(lines)) return lines;
  return lines.map((l) => {
    if (!l || typeof l !== 'object' || !l.gift) return l;
    if (isGift(gifts, l)) return l;
    const { gift, ...rest } = l;
    const rate = Number(rest.rate), pay = Number(rest.pay) || 1;
    if (Number.isFinite(rate)) rest.price = Math.round(rate * pay * 100) / 100;
    return rest;
  });
}
