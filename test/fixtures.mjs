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
   the atomic hold/release and the renderer can be exercised. It follows the
   Owner's binding geometry (ceremony LEFT 10 × 2 = 20, RIGHT 10 × 3 = 30;
   dinner TOP 24 + BOTTOM 24, BRIDE and GROOM fixed) — the FAMILY flags below
   are deliberately arbitrary and NOT a proposal: the exact FAMILY chair ids
   come from the Owner through Guest Relations.
   ========================================================================== */
const two = (n) => String(n).padStart(2, '0');
export const SEAT_FIXTURE = {
  ceremony: {
    rows: [
      ...Array.from({ length: 10 }, (_, r) => ({ side: 'L', row: r + 1, seats: Array.from({ length: 2 }, (_, i) => ({ seatId: 'C-L-' + two(r + 1) + '-' + two(i + 1), family: r < 2 })) })),
      ...Array.from({ length: 10 }, (_, r) => ({ side: 'R', row: r + 1, seats: Array.from({ length: 3 }, (_, i) => ({ seatId: 'C-R-' + two(r + 1) + '-' + two(i + 1), family: r === 0 && i < 2 })) })),
    ],
  },
  dinner: {
    sides: {
      T: Array.from({ length: 24 }, (_, i) => ({ seatId: 'D-T-' + two(i + 1), family: i < 3 })),
      B: Array.from({ length: 24 }, (_, i) => ({ seatId: 'D-B-' + two(i + 1), family: i < 3 })),
    },
  },
};
