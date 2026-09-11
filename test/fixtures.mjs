/** Test fixtures — fictional invitations for business-logic tests.
 *  Production data is encrypted (register/invitations.enc.json); these
 *  fixtures never ship. Shape matches the production invitation payload. */
export const FIXTURE_INVITATIONS = [
  { invitationId: 'INV-DEMO-001', token: 'demo-amara', partyName: 'Amara & Theo', partyLead: 'g1',
    guests: [
      { guestId: 'g1', fullName: 'Amara Demo', preferredName: 'Amara' },
      { guestId: 'g2', fullName: 'Theo Demo', preferredName: 'Theo' },
    ] },
  { invitationId: 'INV-DEMO-002', token: 'demo-lin', partyName: 'Lin', partyLead: 'g3',
    guests: [{ guestId: 'g3', fullName: 'Lin Demo', preferredName: 'Lin' }] },
  { invitationId: 'INV-DEMO-003', token: 'demo-family', partyName: 'The Demo Family', partyLead: 'g4',
    guests: [
      { guestId: 'g4', fullName: 'Mali Demo', preferredName: 'Mali' },
      { guestId: 'g5', fullName: 'Anouk Demo', preferredName: 'Anouk' },
      { guestId: 'g6', fullName: 'Kip Demo', preferredName: 'Kip' },
    ] },
  { invitationId: 'INV-DEMO-004', token: 'demo-noor', partyName: 'Noor', partyLead: 'g7',
    unresolvedMapping: true,
    guests: [{ guestId: 'g7', fullName: 'Noor Demo', preferredName: 'Noor' }] },
];

/** Sync fixture lookup (token or exact full name) for tests only. */
export function lookupInvitation(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  for (const inv of FIXTURE_INVITATIONS) {
    if (inv.token === q) return inv;
    for (const g of inv.guests) if (g.fullName.toLowerCase() === q) return inv;
  }
  return null;
}


/* ==========================================================================
   SEAT FIXTURE — TEST/FIXTURE ONLY. Never production geometry, never
   uploaded, never exposed on the site. It exists so the ledger's validation,
   the atomic hold/release and the renderer can be exercised. The row
   arrangement here is deliberately arbitrary (6 · 6 · 4 · 4 per side) and
   is NOT a proposal: the authoritative floor plan comes from the Owner
   through Guest Relations and the protected configuration route.
   Frozen totals it must satisfy: ceremony 20 + 20, family 4 left + 2 right;
   dinner 20 + 20, family 6.
   ========================================================================== */
function ceremonyRows(side, sizes, familyInRow1) {
  let row = 0;
  return sizes.map((n) => {
    row += 1;
    return { side, row, seats: Array.from({ length: n }, (_, i) => ({ seatId: 'C-' + side + '-' + row + '-' + (i + 1), family: row === 1 && i < familyInRow1 })) };
  });
}
export const SEAT_FIXTURE = {
  ceremony: { rows: [...ceremonyRows('L', [6, 6, 4, 4], 4), ...ceremonyRows('R', [6, 6, 4, 4], 2)] },
  dinner: {
    sides: {
      L: Array.from({ length: 20 }, (_, i) => ({ seatId: 'D-L-' + (i + 1), family: i < 3 })),
      R: Array.from({ length: 20 }, (_, i) => ({ seatId: 'D-R-' + (i + 1), family: i < 3 })),
    },
  },
};
