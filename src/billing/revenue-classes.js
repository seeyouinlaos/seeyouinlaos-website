/* ============================================================================
   GUEST BILLING BY CLASS (revenue-classes/1.0.0 · the Owners' consolidated order, 19 Nov 2026)

   Pure: it reads only the lines the Revenue Report has already settled — the booked lines behind "booked revenue", the lines of each
   current issued statement, and each statement's payment position — and says which part of the guests' billing is what:

     1. SOUPHATTRA_ACCOMMODATION — a room line of a Souphattra Heritage stay window (every stay period the hotel is sold in): the
        primary, economically available accommodation revenue of the wedding project, at the booked selling prices exactly as the
        engine priced them (never a purchase rate);
     2. OTHER_ACCOMMODATION      — a room or house of any other property (U Sathorn, the Guest House, Kunming, Lijiang, Hotel Muse):
        billed and collected, visible to everyone as before, never part of the Souphattra figure;
     3. PASS_THROUGH             — a guest service H&S collects for and pays the provider for, named one by one (budget-map
        PASS_THROUGH: the Temple Offering, the trains) — gross billing, no contribution to the wedding budget. Any other guest-billed
        service is NOT_CLASSIFIED and named, never assumed to be a pass-through.
   A line's class comes from its product (002 Site_Product_Key and Item_ID) — never from an amount, a person or a colour.

   CHINA: the stages of the China trip and its return (budget-map CHINA_STAGES) are reported as their own part — tracked, billed and
   paid as before, outside the wedding budget, never Souphattra revenue — and are NOT in the other parts, so the parts add up to the
   total guest billing without counting anything twice.

   RECEIVED / OUTSTANDING per class follow each statement's own position: a statement paid in full (PAID, OVERPAID) has received
   every issued line; an unpaid one (UNPAID) owes every issued line; a statement with nothing due owes nothing. A PARTIALLY paid
   statement is NOT split across classes — its received and outstanding amounts are listed as "not allocated" with the statement,
   never allocated by an invented key. A holder whose booked figure has a gap (double booking, review) stays out of "booked" exactly
   as in the booked KPI, named. Every sum is reconciled with the overview's own KPI; a difference is shown, never hidden.
   ========================================================================== */
import { STAGES, CHINA_STAGES, PASS_THROUGH } from './budget-map.js';
import { SOUPHATTRA_WINDOWS, windowOf, SOUPHATTRA } from '../hotel-rooms.js';
import { siteKeyOf } from './owner-bookings.js';

export const CLASSES_VERSION = 'revenue-classes/1.0.0';
export const CLASS = Object.freeze({ SOUPHATTRA: 'SOUPHATTRA_ACCOMMODATION', OTHER: 'OTHER_ACCOMMODATION', PASS: 'PASS_THROUGH', NONE: 'NOT_CLASSIFIED' });
export const CLASS_LABELS = Object.freeze({
  SOUPHATTRA_ACCOMMODATION: 'Souphattra Heritage – Accommodation Revenue',
  OTHER_ACCOMMODATION: 'Other accommodation collections',
  PASS_THROUGH: 'Pass-through collections',
  NOT_CLASSIFIED: 'Guest services not classified yet',
});
/* the Souphattra's stay periods, by the window it is sold in (src/inventory-seed.js); any other Souphattra window is an extended stay */
export const SOUPHATTRA_PERIODS = Object.freeze({
  prewed: { stage: 'C', label: 'Early arrival (before the wedding)' },
  wedstay: { stage: 'D1', label: 'Wedding stay' },
});

const clean = (v) => String(v == null ? '' : v).trim();
/* the room engine's stay windows of the China trip and its return (src/inventory-seed.js) — a second reading beside the Item_ID's stage */
const CHINA_WINDOWS = Object.freeze(['kmg', 'ljg', 'kempinski']);
const asArray = (v) => (Array.isArray(v) ? v : []);
const money = (cents) => (cents == null || !Number.isFinite(cents) ? null : { currency: 'USD', cents: Math.round(cents), amount: Math.round(cents) / 100 });
const sum = (xs) => xs.reduce((t, x) => t + (Number.isFinite(x) ? x : 0), 0);
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The stage of a 002 product by its Item_ID ("D1-HERITAGE" → "D1") — only a stage budget-map knows, else null. */
export function stageOfItem(itemId) {
  const m = /^([A-Z][0-9]?)-/.exec(clean(itemId));
  return m && Object.prototype.hasOwnProperty.call(STAGES, m[1]) ? m[1] : null;
}

/** What a booked line of this product is: { cls, room, key, window, stage, property, china } — cls null when the product has no key. */
export function classOfItem(items, itemId) {
  const key = siteKeyOf(items, clean(itemId));
  const stage = stageOfItem(itemId);
  /* the China trip: by the product's stage, or — where the Item_ID carries none — by the stay window the room engine sells it in */
  const china = (!!stage && CHINA_STAGES.includes(stage)) || (!stage && CHINA_WINDOWS.includes(windowOf(key)));
  if (!key) return { cls: null, room: false, key: '', window: '', stage, property: null, china };
  const room = key.includes('/');
  /* every room of a Souphattra stay window is the Souphattra's — a category the official list does not hold yet is still its room */
  const souphattra = room && SOUPHATTRA_WINDOWS.includes(windowOf(key));
  const pass = room ? null : PASS_THROUGH.find((x) => x.itemId === clean(itemId)) || null;
  const cls = room ? (souphattra ? CLASS.SOUPHATTRA : CLASS.OTHER) : pass ? CLASS.PASS : CLASS.NONE;
  const property = souphattra ? SOUPHATTRA : room ? ((stage && STAGES[stage] && STAGES[stage].place) || windowOf(key)) : null;
  return { cls, room, key, window: windowOf(key), stage, property, china, pass };
}

const zero = () => ({ booked: 0, invoiced: 0, received: 0, outstanding: 0, lines: 0, persons: new Set(), units: new Map() });
function out(a) {
  return { booked: money(a.booked), invoiced: money(a.invoiced), received: money(a.received), outstanding: money(a.outstanding),
    lines: a.lines, guests: a.persons.size, rooms: a.units.size, roomNights: sum([...a.units.values()]) };
}

/**
 * @param {object} p
 * @param {Array<{Holder_ID, lines, gapReason}>} p.booked     the lines behind the booked KPI, per holder (revenue.js bookedPicture)
 * @param {Map<string,{lines, cents}>} p.issued              each holder's current issued statement: its payable lines and total
 * @param {Array<{Holder_ID, Settlement_ID, paymentStatus, cashCollected, outstanding, refundDue}>} p.positions  the overview's rows
 * @param {object} p.items                                    002 by Item_ID
 * @param {object} p.kpis                                     { booked, issued, cash, outstanding, refund } — the overview's own KPIs
 */
export function revenueClassesOf({ booked, issued, positions, items, kpis }) {
  /* the parts: three classes without China, China apart, and what is not classified — together the whole guest billing */
  const acc = { [CLASS.SOUPHATTRA]: zero(), [CLASS.OTHER]: zero(), [CLASS.PASS]: zero(), [CLASS.NONE]: zero() };
  const china = { ...zero(), byClass: { [CLASS.SOUPHATTRA]: zero(), [CLASS.OTHER]: zero(), [CLASS.PASS]: zero(), [CLASS.NONE]: zero() } };
  const period = new Map(), category = new Map(), property = new Map(), pass = new Map(), none = new Map();
  const bookings = new Map();   /* Souphattra booking lines: Booking_ID → row */
  const noKey = new Map(), excluded = [];
  const unallocated = { received: 0, outstanding: 0, invoiced: 0, statements: [] };
  const at = (mp, k, init) => { if (!mp.has(k)) mp.set(k, { ...zero(), ...init() }); return mp.get(k); };

  /* every bucket a line belongs to: its part (a class, or China), and its Souphattra period / category, property or service */
  const bucketsOf = (l) => {
    const id = clean(l.Item_ID), c = classOfItem(items, id);
    if (!c.cls) return { c, list: [] };
    const list = c.china ? [china, china.byClass[c.cls]] : [acc[c.cls]];
    if (c.cls === CLASS.SOUPHATTRA) {
      const p = SOUPHATTRA_PERIODS[c.window] || { stage: c.stage, label: 'Extended stay' };
      list.push(at(period, c.window, () => ({ window: c.window, stage: p.stage, label: p.label })));
      list.push(at(category, id, () => ({ Item_ID: id, key: c.key, stage: c.stage })));
    } else if (c.cls === CLASS.OTHER) {
      list.push(at(property, c.stage || c.window, () => ({ stage: c.stage, property: c.property, china: c.china, window: c.window })));
    } else if (c.cls === CLASS.PASS) {
      list.push(at(pass, id, () => ({ Item_ID: id, key: c.key, stage: c.stage, china: c.china, basis: c.pass.basis, confirmed: c.pass.confirmed || null })));
    } else {
      list.push(at(none, id, () => ({ Item_ID: id, key: c.key, stage: c.stage, china: c.china })));
    }
    return { c, list };
  };
  const take = (l, field) => {
    const { c, list } = bucketsOf(l);
    const cents = Number.isFinite(l.amountCents) ? l.amountCents : 0;
    if (!c.cls) { const id = clean(l.Item_ID) || '(no item)'; const u = noKey.get(id) || { Item_ID: id, booked: 0, invoiced: 0, received: 0, outstanding: 0 }; u[field] += cents; noKey.set(id, u); return c; }
    for (const b of list) {
      b[field] += cents;
      if (field === 'booked') {
        b.lines += 1;
        const person = clean(l.Person_ID); if (person) b.persons.add(person);
        if (c.room) { const u = clean(l.Room_Unit_ID) || ('(no unit) ' + clean(l.Booking_ID)); const n = Number(l.nights) > 0 ? Number(l.nights) : 0; b.units.set(u, Math.max(b.units.get(u) || 0, n)); }
      }
    }
    return c;
  };

  /* BOOKED — exactly the lines the booked KPI counts */
  for (const h of asArray(booked)) {
    if (h.gapReason) { excluded.push({ Holder_ID: h.Holder_ID, reason: h.gapReason }); continue; }
    for (const l of asArray(h.lines)) {
      const c = take(l, 'booked');
      if (c && c.cls === CLASS.SOUPHATTRA) {
        const k = clean(l.Booking_ID) || (h.Holder_ID + '|' + clean(l.Item_ID) + '|' + clean(l.Person_ID));
        bookings.set(k, { Booking_ID: clean(l.Booking_ID) || null, Holder_ID: h.Holder_ID, Item_ID: clean(l.Item_ID), Person_ID: clean(l.Person_ID) || null,
          Room_Unit_ID: clean(l.Room_Unit_ID) || null, window: c.window, period: (SOUPHATTRA_PERIODS[c.window] || {}).label || 'Extended stay',
          nights: Number(l.nights) > 0 ? Number(l.nights) : null, payableNights: l.payableNights == null || !Number.isFinite(Number(l.payableNights)) ? null : Number(l.payableNights),
          rateSource: clean(l.rateSource) || null, hosted: l.hosted === true, booked: l.amountCents, invoiced: null, status: null });
      }
    }
  }

  /* INVOICED, RECEIVED, OUTSTANDING — the current issued statement of each holder, by its payment position (PAYMENT_STATUS only) */
  const posBy = new Map(asArray(positions).map((r) => [clean(r.Holder_ID), r]));
  const cents = (m) => (m && Number.isFinite(m.cents) ? m.cents : 0);
  for (const [holderId, s] of (issued instanceof Map ? issued : new Map())) {
    const lines = asArray(s && s.lines);
    const pos = posBy.get(holderId) || {};
    const status = clean(pos.paymentStatus) || null;
    const total = sum(lines.map((l) => l.amountCents));
    const notSplit = (why, invoicedToo) => {
      if (invoicedToo) unallocated.invoiced += Number.isFinite(s && s.cents) ? s.cents : 0;
      unallocated.received += cents(pos.cashCollected) - cents(pos.refundDue);
      unallocated.outstanding += cents(pos.outstanding);
      /* whether the statement carries a line of the China trip (its receipt then cannot be called the wedding's alone) */
      const hasChina = lines.some((l) => classOfItem(items, clean(l.Item_ID)).china);
      unallocated.statements.push({ Holder_ID: holderId, Settlement_ID: pos.Settlement_ID || null, status, why, china: hasChina,
        invoiced: money(s && s.cents), received: pos.cashCollected || null, outstanding: pos.outstanding || null });
    };
    if (!Number.isFinite(s && s.cents) || total !== s.cents) { notSplit('the statement\'s lines do not add up to its total — not split by class', true); continue; }
    /* a partly paid statement: its lines are invoiced by class (exact); what was received and what is open are not allocated */
    if (status === 'PARTIAL') notSplit('partially paid — what was received and what is open are not allocated to a class', false);
    for (const l of lines) take(l, 'invoiced');
    if (status === 'PAID' || status === 'OVERPAID') for (const l of lines) take(l, 'received');
    else if (status === 'UNPAID') for (const l of lines) take(l, 'outstanding');
    for (const l of lines) {
      const b = bookings.get(clean(l.Booking_ID));
      if (b) { b.invoiced = (b.invoiced || 0) + (l.amountCents || 0); b.status = status; }
    }
  }

  /* THE PARTS ADD UP: classes (without China) + China + not classified + lines without a product + statements not split = the KPI.
     What remains is named (an overpayment is the refund due; a receipt the journal holds for no statement; a holder whose booked
     figure has a gap keeps its issued statement in "invoiced") — never hidden, never forced to zero. */
  const parts = (f) => sum(Object.values(acc).map((a) => a[f])) + china[f] + sum([...noKey.values()].map((u) => u[f]));
  const K = kpis || {};
  const kc = (x) => (x && x.complete !== false && Number.isFinite(x.cents) ? x.cents : null);
  const refund = kc(K.refund) || 0;
  const rec = (what, classes, notSplit, also, kpi) => {
    const residual = kpi == null ? null : kpi - classes - notSplit - also.cents;
    return { what, parts: money(classes), notSplit: money(notSplit), [also.name]: also.cents ? money(also.cents) : undefined, kpi: money(kpi), residual: money(residual), equal: kpi == null ? null : residual === 0 };
  };
  const reconciliation = {
    booked: rec('booked', parts('booked'), 0, { name: 'none', cents: 0 }, kc(K.booked)),
    invoiced: rec('invoiced', parts('invoiced'), unallocated.invoiced, { name: 'none', cents: 0 }, kc(K.issued)),
    received: rec('received', parts('received'), unallocated.received, { name: 'refundDue', cents: refund }, kc(K.cash)),
    outstanding: rec('outstanding', parts('outstanding'), unallocated.outstanding, { name: 'none', cents: 0 }, kc(K.outstanding)),
  };
  for (const r of Object.values(reconciliation)) { delete r.none; if (r.refundDue === undefined) delete r.refundDue; }
  const totalOf = (f) => money(parts(f) + (f === 'booked' ? 0 : unallocated[f] || 0));
  return {
    version: CLASSES_VERSION,
    definition: 'every booked guest-billing line in exactly one part, by its product: Souphattra Heritage accommodation, other accommodation, pass-through services (each without China), the China trip apart',
    /* complete only when every part is classified and every sum meets its KPI — an incomplete KPI (equal null) is not complete */
    complete: excluded.length === 0 && unallocated.statements.length === 0 && noKey.size === 0 && none.size === 0 &&
      Object.values(reconciliation).every((r) => r.equal === true),
    classes: Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { label: CLASS_LABELS[k], ...out(a) }])),
    china: { label: 'China trip and its return — outside the wedding budget', stages: CHINA_STAGES.map((s) => ({ stage: s, place: (STAGES[s] || {}).place || s })), ...out(china),
      byClass: Object.fromEntries(Object.entries(china.byClass).map(([k, a]) => [k, { label: CLASS_LABELS[k], ...out(a) }])) },
    totalGuestBilling: { label: 'Total guest billing', booked: totalOf('booked'), invoiced: totalOf('invoiced'), received: totalOf('received'), outstanding: totalOf('outstanding') },
    souphattra: {
      label: CLASS_LABELS[CLASS.SOUPHATTRA], hotel: SOUPHATTRA, guestsAcrossPeriods: acc[CLASS.SOUPHATTRA].persons.size,
      byPeriod: [...period.values()].sort((a, b) => byText(a.stage || '', b.stage || '')).map((p) => ({ window: p.window, stage: p.stage, label: p.label, ...out(p) })),
      byCategory: [...category.values()].sort((a, b) => byText(a.Item_ID, b.Item_ID)).map((c) => ({ Item_ID: c.Item_ID, key: c.key, stage: c.stage, ...out(c) })),
      byBooking: [...bookings.values()].sort((a, b) => byText(a.Holder_ID, b.Holder_ID) || byText(a.Item_ID, b.Item_ID) || byText(a.Person_ID || '', b.Person_ID || ''))
        .map((b) => ({ ...b, booked: money(b.booked), invoiced: money(b.invoiced) })),
    },
    otherAccommodation: [...property.values()].sort((a, b) => byText(a.stage || a.window, b.stage || b.window)).map((p) => ({ stage: p.stage, property: p.property, china: p.china, ...out(p) })),
    passThrough: [...pass.values()].sort((a, b) => byText(a.Item_ID, b.Item_ID)).map((p) => ({ Item_ID: p.Item_ID, key: p.key, stage: p.stage, china: p.china, basis: p.basis, confirmed: p.confirmed, ...out(p) })),
    notClassified: [...none.values()].sort((a, b) => byText(a.Item_ID, b.Item_ID)).map((p) => ({ Item_ID: p.Item_ID, key: p.key, stage: p.stage, china: p.china, ...out(p) })),
    withoutProduct: [...noKey.values()].map((u) => ({ Item_ID: u.Item_ID, booked: money(u.booked), invoiced: money(u.invoiced) })),
    unallocated: { received: money(unallocated.received), outstanding: money(unallocated.outstanding), invoiced: money(unallocated.invoiced), statements: unallocated.statements },
    excluded,
    reconciliation,
  };
}
