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
