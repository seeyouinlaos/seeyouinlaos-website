/**
 * See You In Laos — Guest Registration · pure business logic.
 * No DOM, no storage: everything here is unit-testable (node:test) and shared
 * by the guest flow, the Guest Relations view and the test suite.
 */

/* ============ journey cost (Final Owner room matrix) ============
 * ONE calculation path. Rooms are priced PER GUEST (contributionPerGuest ×
 * occupying guests, for the complete two-night stay); the train per
 * participating guest (USD 88); transfers per unit. Every surface (cards,
 * selection state, live Journey Cost, review, submission, dashboard, Guest
 * Relations record) reads these functions — never its own arithmetic. No
 * per-room or per-night amount exists anywhere in guest-facing logic. */

/** Approved guest contribution for a category (per guest, complete stay). */
export function contributionPerGuest(accommodation) {
  if (!accommodation) return 0;
  return typeof accommodation.contributionPerGuest === 'number' ? accommodation.contributionPerGuest : 0;
}

/** Individual charge records: one per occupying Guest, never multiplied by
 *  room count (a Party requests exactly one room). */
export function partyCharges(accommodation, guestIds) {
  const per = contributionPerGuest(accommodation);
  return (guestIds || []).map((guestId) => ({ guestId, amount: per }));
}

/** A Party's stay charge: per-guest contribution × occupying guests. */
export function partyTotal(accommodation, guestIds) {
  return partyCharges(accommodation, guestIds).reduce((s, c) => s + c.amount, 0);
}

/** Train contribution: confirmed per-guest price × actual participants. */
export function trainContribution(train, riderCount) {
  const per = train && typeof train.contributionPerGuest === 'number' ? train.contributionPerGuest : null;
  return per === null ? null : per * riderCount;
}

/** Transfer total: Σ pricePerUnit × selected units (never guest-multiplied).
 *  `selected` is [{ transferId, units }]; `catalog` is data.TRANSFERS. */
export function transfersTotal(catalog, selected) {
  let sum = 0;
  for (const s of selected || []) {
    const t = (catalog || []).find((x) => x.id === s.transferId);
    if (t) sum += t.pricePerUnit * (s.units || 1);
  }
  return sum;
}

/** The live Journey Cost: stay + train + transfers. */
export function journeyTotal(accommodation, occupantGuestIds, train, riderCount, transferCatalog, selectedTransfers) {
  return partyTotal(accommodation, occupantGuestIds)
    + (trainContribution(train, riderCount) || 0)
    + transfersTotal(transferCatalog, selectedTransfers);
}

export function money(n) {
  return 'USD ' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

/* ============ inventory + allocation (§25) ============ */

export const ALLOC = {
  AVAILABLE: 'AVAILABLE', REQUESTED: 'REQUESTED', HELD: 'HELD',
  CONFIRMED: 'CONFIRMED', RELEASED: 'RELEASED', WAITLISTED: 'WAITLISTED',
};

/** Build the app-managed inventory state from resource definitions. */
export function createInventory(resources) {
  const inv = {};
  for (const r of resources) {
    inv[r.id] = {
      resource_id: r.id,
      resource_type: r.kind || (r.capacityUnit === 'Guest seat' ? 'transport' : 'accommodation'),
      display_name: r.name,
      capacity_total: r.capacityTotal,
      capacity_unit: r.capacityUnit,
      selection_scope: r.selectionScope,
      capacity_held: 0,
      capacity_confirmed: 0,
      allocations: [],   // { allocId, partyId, guestIds, units, status, requested_at, held_at, confirmed_at, released_at, waitlist_position }
      waitlist: [],
    };
  }
  return inv;
}

export function remaining(res) {
  return res.capacity_total - res.capacity_held - res.capacity_confirmed;
}

/**
 * The full inventory position of one resource — the structure Guest Relations
 * and the release check read. `available` is what a further Party could still
 * be given: total minus held, confirmed AND still-pending requests, so two
 * Parties can never both be told an option is free. `locked` is capacity that
 * confirmation has fixed and that only an explicit Guest Relations release
 * (force) can free again.
 */
export function inventorySnapshot(res) {
  const count = (status) => res.allocations
    .filter((a) => a.status === status).reduce((s, a) => s + a.units, 0);
  const requested = count(ALLOC.REQUESTED);
  return {
    resource_id: res.resource_id,
    display_name: res.display_name,
    total: res.capacity_total,
    requested,
    held: res.capacity_held,
    confirmed: res.capacity_confirmed,
    locked: res.capacity_confirmed,
    waitlisted: count(ALLOC.WAITLISTED),
    remaining: remaining(res),
    available: Math.max(0, remaining(res) - requested),
  };
}

/** The live allocation of one Party on one resource (ignores releases). */
export function partyAllocation(inv, resourceId, partyId) {
  const res = inv[resourceId];
  if (!res) return null;
  return res.allocations.find((a) => a.partyId === partyId && a.status !== ALLOC.RELEASED) || null;
}

/** A confirmed allocation is locked: it may not be changed in the guest flow. */
export function isLocked(inv, resourceId, partyId) {
  const a = partyAllocation(inv, resourceId, partyId);
  return !!a && a.status === ALLOC.CONFIRMED;
}

/** Exact availability copy (§22, §14). */
export function availabilityLabel(res) {
  const rem = remaining(res);
  const unitPlural = res.capacity_unit === 'Room' ? 'rooms'
    : res.capacity_unit === 'Guest seat' ? 'seats' : 'Party allocations';
  if (rem <= 0) return 'Fully allocated';
  if (rem === 1) return res.capacity_unit === 'Room' ? 'Last room' : (res.capacity_unit === 'Guest seat' ? 'Last seat' : 'Last allocation');
  return rem + ' of ' + res.capacity_total + ' ' + unitPlural + ' remaining';
}

/**
 * Register a request against a resource at completed-registration time.
 * Order is determined by `submittedAt` (registration_submitted_at) — never by
 * page-open/click/draft time. Idempotent per (partyId, resourceId): a
 * duplicate submission returns the existing allocation and does not
 * double-count capacity.
 * A request is visible to Guest Relations; it does NOT reduce the public
 * remaining figure (remaining = total − held − confirmed) and is never shown
 * to guests as confirmed inventory. When nothing remains, the request joins
 * the waitlist.
 */
export function requestAllocation(inv, resourceId, { partyId, guestIds = [], units = 1, submittedAt }) {
  const res = inv[resourceId];
  if (!res) throw new Error('unknown resource: ' + resourceId);
  const existing = res.allocations.find((a) => a.partyId === partyId && a.status !== ALLOC.RELEASED);
  if (existing) return existing; // idempotent
  const alloc = {
    allocId: resourceId + ':' + partyId,
    partyId, guestIds: guestIds.slice(), units,
    status: remaining(res) - unitsPending(res) >= units ? ALLOC.REQUESTED : ALLOC.WAITLISTED,
    requested_at: submittedAt, held_at: null, confirmed_at: null, released_at: null,
    waitlist_position: null,
  };
  if (alloc.status === ALLOC.WAITLISTED) {
    alloc.waitlist_position = res.waitlist.length + 1;
    res.waitlist.push(alloc.allocId);
  }
  res.allocations.push(alloc);
  // keep request order deterministic by submission time
  res.allocations.sort((a, b) => String(a.requested_at).localeCompare(String(b.requested_at)));
  return alloc;
}

/** Units currently pending (REQUESTED) — protects against double allocation
 *  when simultaneous requests land before Guest Relations holds them. */
export function unitsPending(res) {
  return res.allocations
    .filter((a) => a.status === ALLOC.REQUESTED)
    .reduce((s, a) => s + a.units, 0);
}

/* --- Guest Relations transitions --- */

export function holdAllocation(inv, allocId, at) {
  const { res, alloc } = find(inv, allocId);
  if (alloc.status !== ALLOC.REQUESTED && alloc.status !== ALLOC.WAITLISTED) throw new Error('cannot hold from ' + alloc.status);
  if (remaining(res) < alloc.units) throw new Error('insufficient capacity to hold');
  alloc.status = ALLOC.HELD; alloc.held_at = at;
  res.capacity_held += alloc.units;
  res.waitlist = res.waitlist.filter((id) => id !== allocId);
  return alloc;
}

export function confirmAllocation(inv, allocId, at) {
  const { res, alloc } = find(inv, allocId);
  if (alloc.status !== ALLOC.HELD) throw new Error('confirm requires HELD');
  alloc.status = ALLOC.CONFIRMED; alloc.confirmed_at = at;
  res.capacity_held -= alloc.units;
  res.capacity_confirmed += alloc.units;
  return alloc;
}

export function releaseAllocation(inv, allocId, at, opts = {}) {
  const { res, alloc } = find(inv, allocId);
  // confirmed capacity is locked — freeing it is a deliberate Guest Relations act
  if (alloc.status === ALLOC.CONFIRMED && !opts.force) {
    throw new Error('confirmed allocation is locked: release requires { force: true }');
  }
  if (alloc.status === ALLOC.HELD) res.capacity_held -= alloc.units;
  if (alloc.status === ALLOC.CONFIRMED) res.capacity_confirmed -= alloc.units;
  res.waitlist = res.waitlist.filter((id) => id !== allocId);
  alloc.status = ALLOC.RELEASED; alloc.released_at = at;
  return alloc;
}

function find(inv, allocId) {
  for (const res of Object.values(inv)) {
    const alloc = res.allocations.find((a) => a.allocId === allocId);
    if (alloc) return { res, alloc };
  }
  throw new Error('unknown allocation: ' + allocId);
}

/* ============ registration validation (§31) ============ */

export function validateRegistration(reg, ctx) {
  const errors = [];
  const { invitation, accommodations, trainCapacity } = ctx;
  const guestIds = new Set(invitation.guests.map((g) => g.guestId));

  // recognised guests only; no free additional members
  for (const g of reg.guests || []) {
    if (!guestIds.has(g.guestId)) errors.push('unrecognised guest: ' + g.guestId);
  }
  if ((reg.guests || []).length !== invitation.guests.length) {
    errors.push('registration must cover every invited Guest of the invitation');
  }
  // per-guest contact for active guests
  for (const g of reg.guests || []) {
    if (g.attending !== false && !(g.email || g.phone)) {
      errors.push('contact details missing for ' + (g.preferredName || g.guestId));
    }
  }
  // at least one journey/event selection somewhere
  const anyJoin = (reg.guests || []).some((g) =>
    Object.values(g.journey || {}).some(Boolean) || Object.values(g.events || {}).some(Boolean));
  if (!anyJoin) errors.push('no journey or event selected');

  // train counted per participating guest, capped by capacity
  const trainGuests = (reg.guests || []).filter((g) => g.journey && g.journey.train).length;
  if (trainGuests > trainCapacity) errors.push('train selection exceeds seat capacity');

  // stay: required (a Party without a stay is handled personally by Guest
  // Relations, never as a digital flow); party-scope, one room
  if (!(reg.stay && reg.stay.accommodationId)) {
    errors.push('please select a stay — Guest Relations will help personally if you need something different');
  }
  if (reg.stay && reg.stay.accommodationId) {
    const acc = accommodations.find((a) => a.id === reg.stay.accommodationId);
    if (!acc) errors.push('unknown accommodation: ' + reg.stay.accommodationId);
    else if (acc.selectable === false) {
      errors.push(acc.name + ' is not available for guest requests');
    } else {
      const occ = reg.stay.occupantGuestIds || [];
      if (!occ.length) errors.push('stay request needs at least one occupying Guest');
      for (const id of occ) if (!guestIds.has(id)) errors.push('stay occupant not in invitation: ' + id);
      const charges = partyCharges(acc, occ);
      const total = charges.reduce((s, c) => s + c.amount, 0);
      if (total !== contributionPerGuest(acc) * occ.length) errors.push('party total must equal sum of individual contributions');
      if (reg.stay.rooms && reg.stay.rooms !== 1) errors.push('one invitation requests exactly one room / allocation');
    }
  }
  // transfers: known service and sane units — details stay with Guest Relations
  for (const s of reg.transfers || []) {
    const t = (ctx.transfers || []).find((x) => x.id === s.transferId);
    if (!t) { errors.push('unknown transfer service: ' + s.transferId); continue; }
    if (s.units !== undefined && (!Number.isInteger(s.units) || s.units < 1)) {
      errors.push(t.name + ': units must be a positive whole number');
    }
    // full service: no travel-date questionnaire — Guest Relations completes
    // the operational details personally from the Journey context (owner §13).
  }
  // pickup needs sufficient arrival data
  const arr = reg.arrival || {};
  if (arr.pickupRequested && !(arr.date && (arr.ref || arr.mode === 'train' || arr.detail))) {
    errors.push('pickup requires arrival details');
  }
  const dep = reg.departure || {};
  if (dep.transferRequested && !dep.date) {
    errors.push('departure transfer requires departure details');
  }
  return errors;
}

/* ============ Guest Relations notification (§30) ============ */

export function buildNotification(reg, ctx) {
  const { invitation, accommodations } = ctx;
  const L = (k, v) => k + ' ' + (v === 0 ? '0' : (v || '-'));
  const out = [];
  out.push('SEE YOU IN LAOS — NEW GUEST REGISTRATION');
  out.push('');
  out.push('INVITATION');
  out.push(L('Name:', invitation.partyName));
  out.push(L('Invitation:', invitation.invitationId));
  out.push(L('Lead Guest:', (invitation.guests.find((g) => g.guestId === invitation.partyLead) || {}).fullName));
  out.push('');
  const acc = reg.stay && reg.stay.accommodationId
    ? accommodations.find((a) => a.id === reg.stay.accommodationId) : null;
  const occ = acc ? (reg.stay.occupantGuestIds || []) : [];
  const transferCatalog = ctx.transfers || [];
  const selectedTransfers = reg.transfers || [];

  for (const g of reg.guests || []) {
    const meta = invitation.guests.find((x) => x.guestId === g.guestId) || {};
    out.push('GUEST — ' + (meta.fullName || g.guestId));
    out.push(L('  Attendance:', g.attending === false ? 'NOT ATTENDING' : 'ATTENDING'));
    const j = g.journey || {}, e = g.events || {};
    out.push(L('  Journey:', [j.bangkok && 'Bangkok Journey', j.train && 'Overnight Train (seat requested)', j.independent && 'Independent arrival'].filter(Boolean).join('; ')));
    out.push(L('  Events:', ['alms', 'ceremony', 'dinner'].filter((k) => e[k]).join('; ')));
    out.push(L('  Dietary:', g.diet));
    out.push(L('  Allergies:', g.allergy === 'yes' ? (g.allergyDetail || 'YES') + (g.severe ? ' — SEVERE' : '') : 'None declared'));
    out.push(L('  Spa:', g.spa && g.spa.requested ? [g.spa.type, g.spa.day, g.spa.time].filter(Boolean).join(' · ') : 'Not requested'));
    out.push(L('  Preferences:', [g.favFood && 'food ' + g.favFood, g.favDrink && 'drink ' + g.favDrink,
      g.coffeeHow && 'coffee ' + g.coffeeHow, g.teaLove && 'tea ' + g.teaLove,
      g.favSnack && 'snack ' + g.favSnack, g.bookLove && 'book ' + g.bookLove,
      g.feelAtHome && 'feels at home with ' + g.feelAtHome, g.longDayWaiting && 'after a long day ' + g.longDayWaiting,
      g.coffeeTea && 'coffee/tea ' + g.coffeeTea, g.sweetSavoury && 'sweet/savoury ' + g.sweetSavoury,
      g.favColour && 'colour ' + g.favColour, g.favFlower && 'flowers ' + g.favFlower,
      g.favFilm && 'book/film ' + g.favFilm, g.favSong && 'song ' + g.favSong].filter(Boolean).join('; ')));
    out.push(L('  Passport:', g.passport ? 'file selected on device — secure transfer pending document vault' : 'not yet provided'));
    out.push('');
  }
  out.push('ACCOMMODATION');
  if (!acc) {
    out.push('Room Requested: NONE ON RECORD — to be handled personally by Guest Relations');
  } else {
    out.push(L('Property:', acc.property || acc.name));
    out.push(L('Room Category:', acc.name));
    if (acc.contractRow) out.push(L('Buy-out Row:', acc.contractRow));
    out.push(L('Inventory Requested:', '1 ' + acc.capacityUnit));
    out.push(L('Guests:', occ.map((id) => {
      const meta = invitation.guests.find((x) => x.guestId === id) || {};
      return meta.fullName || id;
    }).join('; ')));
    if (acc.contributionPerGuest == null) {
      out.push('Guest Contribution: ARRANGED SEPARATELY');
    } else {
      out.push(L('Guest Contribution:', money(contributionPerGuest(acc)) + ' each'));
      out.push(L('Stay Total:', money(partyTotal(acc, occ)) + ' (' + occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ')'));
    }
    out.push(L('Stay:', acc.stay));
    if (acc.kind !== 'airbnb') out.push('Second Night: Complimentary / Hosted by Haruthai & Suthep');
    out.push('Status: REQUESTED / UNDER REVIEW');
  }
  out.push('');
  out.push('OVERNIGHT TRAIN');
  const trainGuests = (reg.guests || []).filter((g) => g.journey && g.journey.train);
  out.push(L('Train Requested:', trainGuests.length ? 'YES — ' + trainGuests.length + ' seat(s)' : 'NO'));
  if (trainGuests.length) {
    out.push(L('Participants:', trainGuests.map((g) => {
      const meta = invitation.guests.find((x) => x.guestId === g.guestId) || {};
      return (meta.fullName || g.guestId) + (g.berth ? ' (' + g.berth + ')' : '');
    }).join('; ')));
    out.push(L('Special Requirement:', reg.trainNote));
    out.push('Nong Khai Arrival: Nong Khai Railway Station');
    out.push(L('Onward Transfer Requested:', (reg.arrival || {}).mode === 'Overnight train' && (reg.arrival || {}).pickup !== undefined
      ? ((reg.arrival || {}).pickup ? 'YES' : 'NO')
      : ((reg.arrival || {}).pickupRequested ? 'YES' : 'NO')));
  }
  out.push('');
  out.push('TRANSFERS');
  if (!selectedTransfers.length) {
    out.push('Transfers Requested: NONE');
  } else {
    for (const s of selectedTransfers) {
      const t = transferCatalog.find((x) => x.id === s.transferId) || {};
      out.push(L('Service:', t.name || s.transferId));
      out.push(L('  Units:', (s.units || 1) + ' × ' + money(t.pricePerUnit || 0)));
      const d = s.details || {};
      out.push(L('  Date / Time:', [d.date, d.time].filter(Boolean).join(' ')));
      out.push(L('  ' + (t.fieldsFor === 'train' ? 'Train Number:' : 'Flight Number:'), d.ref));
      out.push(L('  ' + (t.direction === 'arrival' ? 'From:' : 'To:'), d.place));
      out.push(L('  ' + (t.direction === 'arrival' ? 'Pick-up Location:' : 'Drop-off Location:'), d.location));
      out.push('  Status: REQUESTED / UNDER REVIEW');
    }
    out.push(L('Transfers Total:', money(transfersTotal(transferCatalog, selectedTransfers))));
  }
  out.push('');
  out.push('JOURNEY COST');
  const train = ctx.train || null;
  const trainRiders = (reg.guests || []).filter((g) => g.journey && g.journey.train).length;
  const trainSum = trainRiders ? (trainContribution(train, trainRiders) || 0) : 0;
  if (acc) out.push(L('Stay:', acc.contributionPerGuest == null ? 'Arranged separately' : money(partyTotal(acc, occ))));
  if (trainRiders) out.push(L('Train:', trainRiders + ' × ' + money((train || {}).contributionPerGuest || 0) + ' = ' + money(trainSum)));
  if (selectedTransfers.length) out.push(L('Transfers:', money(transfersTotal(transferCatalog, selectedTransfers))));
  out.push(L('TOTAL:', money(journeyTotal(acc, occ, train, trainRiders, transferCatalog, selectedTransfers))));
  out.push('');
  out.push('ARRIVAL');
  const a = reg.arrival || {};
  out.push(L('Mode:', a.mode));
  out.push(L('Date / Time:', [a.date, a.time].filter(Boolean).join(' ')));
  out.push(L('Point:', a.point));
  out.push(L('Reference:', a.ref || a.detail));
  out.push(L('Origin:', a.origin));
  out.push(L('Pickup:', a.pickupRequested ? 'REQUESTED' : 'not needed'));
  out.push('');
  out.push('DEPARTURE');
  const d = reg.departure || {};
  out.push(L('Date / Time:', [d.date, d.time].filter(Boolean).join(' ')));
  out.push(L('Point:', d.point));
  out.push(L('Reference:', d.ref));
  out.push(L('Transfer:', d.transferRequested ? 'REQUESTED' : 'not needed'));
  out.push('');
  out.push(L('ADDITIONAL GUEST REQUEST:', reg.additionalGuestRequest ? reg.additionalGuestRequest : 'none'));
  out.push(L('NOTES:', reg.notes));
  out.push(L('SUBMITTED:', reg.registration_submitted_at));
  return out.join('\n');
}

/* ============ invitation overlay state machine (pure, testable) ============
 * States: 'loading' | 'open' | 'closed'. ONE reducer decides every
 * transition. Hard invariant: once the user has opened the invitation
 * (userOpened), 'open' is forbidden unless the transition is an explicit
 * user action (force), e.g. the "Reopen your invitation" link.
 */
export function nextInvitationState(current, action) {
  const { to, userOpened = false, force = false, version, currentVersion } = action;
  if (version !== undefined && currentVersion !== undefined && version < currentVersion) {
    return { state: current.state, blocked: 'STALE_ASYNC_CALLBACK' };
  }
  if (to === 'open' && userOpened && !force) {
    return { state: current.state, blocked: 'BLOCKED_INVALID_TRANSITION' };
  }
  if (to === current.state) return { state: current.state, blocked: null };
  return { state: to, blocked: null };
}
