/* ============================================================================
   THE PRE-WEDDING DINNER (Owners, 22 Nov 2026 · HS-058) — Saturday 27 February 2027, 18:30, Cảm Ơn (Pho · Banh Mi · Coffee),
   Vientiane. A complimentary dinner: Haruthai & Suthep cover every dish and drink; the guest pays LAK 0.

   THE MENU IS THE RESTAURANT'S OWN: every item below is copied from the original "Menu Cam On.pdf" (20 pages, transcribed on
   22 Nov 2026 and checked label by label) — the original names, the original item codes and the original prices in LAK. An item
   without a code on the menu (page 19) carries no code here either, only its page reference. Nothing is invented, renamed or
   re-priced; the paid extras F1–F12 (toppings and sides) are not dishes and are not offered.

   THE RULE: each joining guest picks EXACTLY two dishes (Phở, Bánh Mì, Nibbles), one drink (coffee, street drinks & iced tea,
   page 19) and one dessert — the same dish twice counts as two. The order is complete only when the guest has SUBMITTED it with
   all four. (The guest-facing word is "submitted": "confirmed" belongs to Guest Relations and providers — brief §10/§15. The
   stored status keeps the value 'confirmed' for the Owners' "bestätigt".) A reopened order keeps its last submitted version for
   the restaurant until the guest submits again or says they are not joining — a change in progress never drops an order silently.

   THIS IS AN EVENT ORDER, NEVER A BOOKING: nothing here reaches the Bag, the trip's fingerprint, a statement, a settlement, a
   hotel bill or an e-mail. The prices are the restaurant's, shown so the Owners see the real cost; the guest's payable is always 0.
   The Owners release the restaurant order themselves (admin console); nothing is ever sent to the restaurant from here.

   Pure — no storage, no I/O; the Seating ledger keeps the records (ops pwd-* / admin-pwd-*), the Worker routes to it.
   ========================================================================== */

export const EVENT = {
  key: 'pre-wedding-dinner',
  name: 'Pre-Wedding Dinner',
  date: '2027-02-27',
  when: 'Saturday, 27 February 2027 · 18:30',
  venue: 'Cảm Ơn – Pho, Banh Mi & Coffee',
  city: 'Vientiane',
  maps: 'https://maps.app.goo.gl/J68UAQcHqq396g749',
  menuPdf: 'assets/pdf/cam-on-menu.pdf',
};

export const RULE = { dish: 2, drink: 1, dessert: 1 };
export const PICKS = ['dish', 'drink', 'dessert'];
export const PICK_WORDS = { dish: 'dishes', drink: 'drink', dessert: 'dessert' };
export const CURRENCY = 'LAK';
/* the menu's own line, pages 6–19: "All prices are subjected to 10% service charge." */
export const SERVICE_CHARGE = 0.10;
export const SERVICE_NOTE = 'All prices are subjected to 10% service charge.';

const it = (code, name, price, extra) => ({ code, name, price, ...(extra || {}) });
const p19 = (ref, group, name, price) => ({ code: null, ref: 'p19-' + ref, group, name, price });

export const MENU = [
  { id: 'pho', title: 'Phở', pick: 'dish', page: '5–9', items: [
    it('A1', 'Cam On Combo Pho', 240000, { detail: 'Brisket, well done flank, tendon, spare rib and meatballs' }),
    it('A2', 'Wagyu Beef Supreme Pho', 385000),
    it('A3', 'Beef Well Done Flank, Brisket and Meatball Pho', 130000),
    it('A4', 'Pho Striped Shank Beef', 110000),
    it('A5', 'Pho Tender Oxtail', 130000),
    it('A6', 'Rare Pho', 110000),
    it('A7', 'Beef Well Done Flank Pho', 105000),
    it('A8', 'Meatballs Pho', 80000),
    it('A9', 'Chicken Pho', 99000),
    it('A10', 'Vietnamese Chicken Tapioca Noodle Soup', 105000)] },
  { id: 'banhmi', title: 'Bánh Mì', pick: 'dish', page: '10–11', items: [
    it('B1', 'Bánh Mì Classic', 89000),
    it('B2', 'Bánh Mì Beef', 95000),
    it('B3', 'Bánh Mì Chicken', 95000),
    it('B4', 'Bánh Mì Veggies', 85000),
    it('B5', 'Bánh Mì', 35000)] },
  { id: 'nibbles', title: 'Nibbles', pick: 'dish', page: '12–13', items: [
    it('C1', 'Bánh Bèo', 55000),
    it('C2', 'Bánh Bột Lọc Nhân Tôm', 89000),
    it('C3', 'Summer Rolls', 70000),
    it('C4', 'Bánh Bột Lọc', 75000),
    it('C5', 'Pork Spring Rolls', 95000),
    it('C6', 'Veggie Spring Rolls', 85000),
    it('C7', 'Pork Rice Paper Rolls', 50000),
    it('C8', 'Veggie Rolls', 45000)] },
  { id: 'coffee', title: 'Vietnamese Coffee', pick: 'drink', page: '14–15', items: [
    it('D1', 'Vietnamese Coffee', 65000),
    it('D2', 'Ca Phe Sua Da Saigon', 85000),
    it('D3', 'Egg Coffee', 75000),
    it('D4', 'Dirty Matcha', 70000),
    it('D5', 'Coconut Coffee', 85000)] },
  { id: 'street', title: 'Street Drinks & Iced Tea', pick: 'drink', page: '16–17', items: [
    it('E1', 'Peach Ice Tea', 70000),
    it('E2', 'Chrysanthemum Iced Tea', 60000),
    it('E3', 'Fresh Longan', 70000),
    it('E4', 'Lemonade', 60000),
    it('E5', 'Lotus Seed & Longan', 85000),
    it('E6', 'Lychee Iced Tea', 70000),
    it('E7', 'Che', 85000)] },
  { id: 'drinks', title: 'Coffee, Juice, Soft Drinks & Beer', pick: 'drink', page: '19', uncoded: true, items: [
    p19('americano-hot', 'Coffee', 'Americano · hot', 55000),
    p19('americano-ice', 'Coffee', 'Americano · ice', 60000),
    p19('latte-hot', 'Coffee', 'Latte · hot', 65000),
    p19('latte-ice', 'Coffee', 'Latte · ice', 70000),
    p19('cappuccino-hot', 'Coffee', 'Cappuccino · hot', 65000),
    p19('cappuccino-ice', 'Coffee', 'Cappuccino · ice', 70000),
    p19('smoothie-mango', 'Fruit Smoothie', 'Mango', 89000),
    p19('smoothie-passion-fruit', 'Fruit Smoothie', 'Passion Fruit', 89000),
    p19('smoothie-orange', 'Fruit Smoothie', 'Orange', 89000),
    p19('juice-young-coconut', 'Freshly Squeezed Juice', 'Young Fresh Coconut', 105000),
    p19('juice-orange', 'Freshly Squeezed Juice', 'Orange', 110000),
    p19('pepsi', 'Soft Drink', 'Pepsi', 25000),
    p19('pepsi-max', 'Soft Drink', 'Pepsi Max', 25000),
    p19('soda', 'Soft Drink', 'Soda', 25000),
    p19('7up-lemon-soda', 'Soft Drink', '7UP Lemon Soda', 25000),
    p19('lipton-soda', 'Soft Drink', 'Lipton Soda', 25000),
    p19('tiger-head-water', 'Water', 'Tiger Head Water', 15000),
    p19('beerlao', 'Beers', 'Beerlao', 50000),
    p19('beerlao-ipa', 'Beers', 'Beerlao IPA', 59000),
    p19('beerlao-green', 'Beers', 'Beerlao Green', 59000),
    p19('saigon-beer', 'Beers', 'Saigon Beer', 60000),
    p19('somersby', 'Beers', 'Somersby · Apple, Blackberry, Watermalon', 59000)] },
  { id: 'desserts', title: 'Desserts', pick: 'dessert', page: '18', items: [
    it('G1', 'Caramel Custard', 70000),
    it('G2', 'Braised Banana in Coconut Milk', 55000)] },
];

/* one id per item: the original code, or the page reference of an uncoded item */
export const idOf = (x) => x.code || x.ref;
const INDEX = new Map();
for (const c of MENU) for (const x of c.items) INDEX.set(idOf(x), { ...x, id: idOf(x), category: c.id, categoryTitle: c.title, pick: c.pick, page: c.page });
export function itemOf(id) { return INDEX.get(String(id || '')) || null; }
export const ITEM_COUNT = INDEX.size;

/* a selection as sent: [{ id, qty }] — normalised, merged, priced from THIS table (a client's price is never read) */
export function normalise(raw) {
  const errors = [], qty = new Map();
  if (raw != null && !Array.isArray(raw)) return { ok: false, errors: ['NOT_A_LIST'], items: [], counts: { dish: 0, drink: 0, dessert: 0 } };
  if ((raw || []).length > 20) return { ok: false, errors: ['TOO_MANY_ITEMS'], items: [], counts: { dish: 0, drink: 0, dessert: 0 } };
  for (const r of raw || []) {
    const id = r && typeof r === 'object' ? String(r.id || '') : '';
    const n = r && Number.isInteger(r.qty) ? r.qty : 1;
    if (!itemOf(id)) { errors.push('UNKNOWN_ITEM: ' + id.slice(0, 24)); continue; }
    if (n < 1 || n > RULE.dish) { errors.push('BAD_QTY: ' + id); continue; }
    qty.set(id, (qty.get(id) || 0) + n);
  }
  const items = [...qty.entries()].map(([id, n]) => { const x = itemOf(id); return { id, code: x.code, name: x.name, category: x.category, pick: x.pick, qty: n, price: x.price, amount: x.price * n }; })
    .sort((a, b) => PICKS.indexOf(a.pick) - PICKS.indexOf(b.pick) || orderOf(a.id) - orderOf(b.id));
  const counts = { dish: 0, drink: 0, dessert: 0 };
  for (const x of items) counts[x.pick] += x.qty;
  for (const k of PICKS) if (counts[k] > RULE[k]) errors.push('TOO_MANY: ' + k);
  return { ok: !errors.length, errors, items, counts };
}
const ORDER = new Map([...INDEX.keys()].map((k, i) => [k, i]));
function orderOf(id) { return ORDER.has(id) ? ORDER.get(id) : 9999; }

/* complete = exactly the rule, nothing more, nothing less */
export function complete(counts) { return PICKS.every((k) => (counts && counts[k]) === RULE[k]); }
export function chosen(counts) { return PICKS.reduce((n, k) => n + Math.min((counts && counts[k]) || 0, RULE[k]), 0); }
export const NEEDED = PICKS.reduce((n, k) => n + RULE[k], 0);   /* 4 */

/* the money of one order: the menu's prices, the menu's service charge, the couple's cover, the guest's 0 */
export function money(items) {
  const value = (items || []).reduce((s, x) => s + x.amount, 0);
  const service = Math.round(value * SERVICE_CHARGE);
  return { currency: CURRENCY, value, service, total: value + service, covered: value + service, payable: 0 };
}

/* the restaurant's sheet: individual orders and the aggregated quantities, from confirmed orders of joining guests only */
export function aggregate(orders) {
  const per = new Map();
  let guests = 0;
  for (const o of orders || []) {
    if (!o || o.rsvp !== 'yes' || !o.complete) continue;
    guests++;
    for (const x of o.effective || []) {
      const k = x.id, cur = per.get(k) || { id: k, code: x.code, name: x.name, pick: x.pick, price: x.price, qty: 0, amount: 0 };
      cur.qty += x.qty; cur.amount += x.amount; per.set(k, cur);
    }
  }
  const lines = [...per.values()].sort((a, b) => PICKS.indexOf(a.pick) - PICKS.indexOf(b.pick) || orderOf(a.id) - orderOf(b.id));
  return { guests, lines, ...money(lines) };
}

/* one guest's record as stored: { rsvp: 'yes'|'no'|null, items, status: 'draft'|'confirmed', rev, at, confirmedAt, history[] } */
export function view(rec) {
  const r = rec || {};
  const n = normalise((r.items || []).map((x) => ({ id: x.id, qty: x.qty })));
  /* what counts for the restaurant: the submitted order — while a submitted order is being changed, its last submitted version */
  const sub = r.rsvp === 'yes' ? (r.status === 'confirmed' ? r.items : (r.submitted && r.submitted.items) || null) : null;
  const s = sub ? normalise(sub.map((x) => ({ id: x.id, qty: x.qty }))) : null;
  const done = !!(s && complete(s.counts));
  return { rsvp: r.rsvp === 'yes' || r.rsvp === 'no' ? r.rsvp : null, status: r.status === 'confirmed' ? 'confirmed' : 'draft', rev: r.rev || 0,
    at: r.at || null, confirmedAt: r.confirmedAt || null, items: n.items, counts: n.counts, chosen: chosen(n.counts), needed: NEEDED,
    complete: done, changing: r.status !== 'confirmed' && done, effective: done ? s.items : [], effectiveTotal: done ? money(s.items).total : 0, effectiveMoney: money(done ? s.items : []), submittedAt: done ? (r.status === 'confirmed' ? r.confirmedAt : r.submitted.at) : null,
    firstName: r.firstName || '', ...money(n.items) };
}

export const HISTORY_KEEP = 30;
/* the change a guest (or the Owners) asks for → the next record, or a refusal; never a silent overwrite of a confirmed order */
export function apply(rec, body, actor, at, locked) {
  const cur = rec || { rsvp: null, items: [], status: 'draft', rev: 0, history: [] };
  const action = String((body && body.action) || '');
  if (!['save', 'confirm', 'reopen'].includes(action)) return { ok: false, status: 400, reason: 'BAD_ACTION' };
  if (locked) return { ok: false, status: 423, reason: 'LOCKED' };
  /* submitting the same order again changes nothing — idempotent even for a retry with an old revision (review, 22 Nov 2026) */
  if (cur.status === 'confirmed' && action === 'confirm' && sameOrder(cur, body)) return { ok: true, rec: cur, unchanged: true };
  if (!Number.isInteger(body.expectRev) || body.expectRev !== (cur.rev || 0)) return { ok: false, status: 409, reason: 'STALE' };
  if (action === 'reopen') {
    if (cur.status !== 'confirmed') return { ok: false, status: 409, reason: 'NOT_CONFIRMED' };
    /* the submitted order stays the restaurant's until a new one is submitted (or the guest says no) */
    return next(cur, { status: 'draft', confirmedAt: null, submitted: cur.rsvp === 'yes' ? { items: cur.items, at: cur.confirmedAt } : null }, 'reopened', actor, at);
  }
  if (cur.status === 'confirmed') return { ok: false, status: 409, reason: 'CONFIRMED' };
  /* an answer is yes or no; anything else keeps the answer given (a submitted order is never dropped by a blank) */
  const rsvp = body.rsvp === 'yes' || body.rsvp === 'no' ? body.rsvp : cur.rsvp;
  const n = normalise(body.items === undefined ? (cur.items || []).map((x) => ({ id: x.id, qty: x.qty })) : body.items);
  if (!n.ok) return { ok: false, status: 400, reason: n.errors[0] };
  const items = rsvp === 'no' ? [] : n.items.map((x) => ({ id: x.id, qty: x.qty }));
  if (action === 'confirm') {
    if (rsvp === 'no') return next(cur, { rsvp, items: [], status: 'draft', submitted: null }, 'not joining', actor, at);
    if (rsvp !== 'yes') return { ok: false, status: 409, reason: 'NO_ANSWER' };
    if (!complete(n.counts)) return { ok: false, status: 409, reason: 'INCOMPLETE' };
    return next(cur, { rsvp, items, status: 'confirmed', confirmedAt: at, submitted: null }, 'submitted', actor, at);
  }
  /* "not joining" withdraws a submitted order — said by the guest, logged */
  return next(cur, { rsvp, items, status: 'draft', ...(rsvp === 'no' ? { submitted: null } : {}) }, rsvp === 'no' ? 'not joining' : 'saved', actor, at);
}
function sameOrder(cur, body) {
  if (body.items === undefined || (body.rsvp !== undefined && body.rsvp !== cur.rsvp)) return false;
  const k = (list) => JSON.stringify(normalise((list || []).map((x) => ({ id: x && x.id, qty: x && x.qty }))).items.map((x) => [x.id, x.qty]));
  return k(body.items) === k(cur.items);
}
function next(cur, patch, what, actor, at) {
  const rec = { ...cur, ...patch, rev: (cur.rev || 0) + 1, at };
  const entry = { at, what, by: actor, rsvp: rec.rsvp, items: (rec.items || []).map((x) => x.id + (x.qty > 1 ? '×' + x.qty : '')).join(' ') };
  /* a run of plain saves is one entry (the latest): submitted / reopened / not joining are never pushed out by taps (review) */
  const prev = (cur.history || []).slice();
  if (what === 'saved' && prev.length && prev[prev.length - 1].what === 'saved') prev.pop();
  rec.history = [...prev, entry].slice(-HISTORY_KEEP);
  return { ok: true, rec };
}

/* ============================================================================
   THE RECORDS — kept by ONE actor (the Seating ledger, which already answers every guest one request at a time), under keys of
   their own that no seating operation reads, lists or resets:
     pwd:<guestId>   one guest's order (apply() above)
     pwd-release     the Owners' release to the restaurant: { version, at, by, digest, active, withdrawnAt, rows }
   `storage` is the Durable Object's storage (get / put / list); the caller serialises the writes.
   ========================================================================== */
export const KEY = 'pwd:';
export const RELEASE = 'pwd-release';
const pubMenu = () => MENU.map((c) => ({ id: c.id, title: c.title, pick: c.pick, page: c.page, items: c.items.map((x) => ({ id: idOf(x), code: x.code, name: x.name, price: x.price, ...(x.detail ? { detail: x.detail } : {}), ...(x.group ? { group: x.group } : {}) })) }));

async function releaseOf(storage) { const r = await storage.get(RELEASE); return r && r.active ? r : null; }

/* the guest: GET (mine) and PUT (save | confirm | reopen) — the guest named by the Worker's verified identity, nobody else */
export async function guestOp(storage, method, identity, body, now) {
  if (!identity || !/^G\d{3,}$/.test(String(identity.guestId || ''))) return { status: 401, body: { ok: false, error: 'unauthorised' } };
  const key = KEY + identity.guestId;
  const rel = await releaseOf(storage);
  if (method === 'GET') {
    return { status: 200, body: { ok: true, event: EVENT, rule: RULE, serviceNote: SERVICE_NOTE, menu: pubMenu(), order: view(await storage.get(key)), locked: !!rel } };
  }
  const out = apply(await storage.get(key), body || {}, 'guest', now, !!rel);
  if (!out.ok) return { status: out.status, body: { ok: false, reason: out.reason, order: view(await storage.get(key)), locked: !!rel } };
  if (out.unchanged) return { status: 200, body: { ok: true, order: view(out.rec), locked: false } };
  /* whose order it is — from the verified identity only (the Owners' sheet needs a first name without a Google read, HS-032) */
  out.rec.invitationId = identity.invitationId;
  if (identity.firstName) out.rec.firstName = String(identity.firstName).slice(0, 40);
  await storage.put(key, out.rec);
  return { status: 200, body: { ok: true, order: view(out.rec), locked: false } };
}

/* every order, in one read (the console's dashboard) — names come from the register through the route, never from here */
export async function allOrders(storage) {
  const out = [];
  for (const [k, rec] of await storage.list({ prefix: KEY })) out.push({ guestId: k.slice(KEY.length), ...view(rec), history: (rec && rec.history) || [] });
  return out;
}
/* the release's fingerprint: exactly the confirmed orders of joining guests, sorted — a later change shows as a different digest */
export function digestOf(orders) {
  const rows = (orders || []).filter((o) => o.rsvp === 'yes' && o.complete).map((o) => o.guestId + ':' + o.effective.map((x) => x.id + '×' + x.qty).join(',')).sort();
  let h = 2166136261;
  for (const ch of rows.join('|')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return rows.length + '-' + h.toString(16).padStart(8, '0');
}
/* `active`: the register's active guest ids (the route passes them) — an order of a guest no longer invited never reaches the
   restaurant's sheet, the figures or the release */
const onlyActive = (orders, active) => (Array.isArray(active) ? orders.filter((o) => active.includes(o.guestId)) : orders);
export async function adminRead(storage, active, names) {
  const orders = onlyActive(await allOrders(storage), active);
  return { ok: true, event: EVENT, rule: RULE, serviceNote: SERVICE_NOTE, menu: pubMenu(), orders, restaurant: aggregate(orders), digest: digestOf(orders), release: (await storage.get(RELEASE)) || null, names: names || {} };
}
/* the Owners release (or withdraw) the restaurant order: recorded, never sent — the console hands them the sheet to send */
export async function adminRelease(storage, body, by, now) {
  const action = String((body && body.action) || '');
  const cur = (await storage.get(RELEASE)) || null;
  if (action === 'withdraw') {
    if (!cur || !cur.active) return { status: 409, body: { ok: false, reason: 'NOT_RELEASED' } };
    const rec = { ...cur, active: false, withdrawnAt: now, withdrawnBy: by };
    await storage.put(RELEASE, rec); return { status: 200, body: { ok: true, release: rec } };
  }
  if (action !== 'release') return { status: 400, body: { ok: false, reason: 'BAD_ACTION' } };
  if (cur && cur.active) return { status: 409, body: { ok: false, reason: 'ALREADY_RELEASED', release: cur } };
  const orders = onlyActive(await allOrders(storage), body && body.active), digest = digestOf(orders);
  if (String((body && body.expectDigest) || '') !== digest) return { status: 409, body: { ok: false, reason: 'CHANGED', digest } };
  const agg = aggregate(orders);
  if (!agg.guests) return { status: 409, body: { ok: false, reason: 'NOTHING_CONFIRMED' } };
  /* the sheet as released, kept with the release — what the restaurant was given can always be shown again */
  const rec = { version: ((cur && cur.version) || 0) + 1, at: now, by, digest, active: true, withdrawnAt: null, guests: agg.guests, value: agg.value, service: agg.service, total: agg.total,
    lines: agg.lines.map((l) => ({ id: l.id, code: l.code, name: l.name, qty: l.qty, price: l.price, amount: l.amount })),
    orders: orders.filter((o) => o.complete).map((o) => ({ guestId: o.guestId, firstName: o.firstName || '', items: o.effective.map((x) => ({ id: x.id, code: x.code, qty: x.qty })) })) };
  await storage.put(RELEASE, rec);
  return { status: 200, body: { ok: true, release: rec } };
}
