/**
 * See You In Laos — Guest Registration · flow application.
 * Presentation + state wiring only; business rules live in logic.mjs,
 * content in data.mjs. No backend: drafts persist to localStorage, the
 * demo inventory is app-managed (production dependency documented in
 * data.mjs and the handoff report).
 */
import {
  WEDDING, CONTACTS, JOURNEY_MODULES, EVENTS, ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN,
  TRANSFERS, PACKAGE_INCLUSIONS, COPY, DEMO_MODE, PUBLICATION, TRAIN_REFERENCE, BERTH_PREFS, BANGKOK_STAYS, BANGKOK_STAY, POST_WEDDING, RETURN_STAY, lookupInvitation,
} from './data.mjs?v=F2';
import {
  contributionPerGuest, partyCharges, partyTotal, money as usdMoney, displayMoney,
  trainContribution, transfersTotal, journeyTotal, postWeddingTotal,
  createInventory, remaining, availabilityLabel, requestAllocation,
  validateRegistration, buildNotification, nextInvitationState,
} from './logic.mjs?v=F2';

/* ---------------- persistent state ---------------- */
const DRAFT_KEY = 'siyl.reg.draft.v2';
const INV_KEY = 'siyl.inv.demo.v1';
const SEEN_KEY = 'siyl.invitation.seen.';
const AUTH_OUT_KEY = 'siyl.auth.out';

/* member session: the invitation code is the key that CREATES the private
 * area; it is never asked again unless the guest explicitly logs out. */
function isAuthOut() { try { return !!localStorage.getItem(AUTH_OUT_KEY); } catch (e) { return false; } }
function setAuthOut(v) { try { if (v) localStorage.setItem(AUTH_OUT_KEY, '1'); else localStorage.removeItem(AUTH_OUT_KEY); } catch (e) { /* private mode */ } }

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RATES_LIVE = PUBLICATION.rates === 'APPROVED';
const attendingCount = () => S.guests.filter((g) => g.attending !== false).length;
/* Package E travel components charge per ACTUAL selection (06 SEP order:
 * component sum, no rounded package price): MU9632 275 · C642 85 · return 200. */
const pwTotal = () => {
  if (!(S.postWedding && S.postWedding.joined)) return 0;
  const n = attendingCount();
  let t = 0;
  if (S.travel && S.travel.vteKmg === 'with') t += 275 * n;
  if (S.travel && S.travel.kmgLjg === 'with') t += 85 * n;
  if (S.postWedding.onward === 'return') t += 200 * n;
  return t;
};
function departureSelections() {
  return (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId)).filter((t) => t && t.direction === 'departure');
}
function bkkNights() {
  const b = S.bangkokStay || {};
  if (!(b.from && b.to)) return BANGKOK_STAY.defaultNights;
  const d = Math.round((new Date(b.to) - new Date(b.from)) / 86400000);
  return d > 0 ? d : BANGKOK_STAY.defaultNights;
}
/* §2 P0 rule: PARTY ELIGIBILITY IS NOT USER SELECTION. A payable Bangkok
 * stay needs eligibility + active Bangkok scope + the explicitly selected
 * arrangement. Every financial surface must use THIS single truth. */
function bangkokStayActive() {
  return !!(S.scope && S.scope.bangkok && S.bangkokStay && (S.bangkokStay.withUs || S.bangkokStay.property));
}
function bkkTravellers() {
  const n = parseInt((S.bangkokStay || {}).travellers, 10);
  return n > 0 ? n : Math.max(attendingCount(), 1);
}
/* §7/§9 unified-journey order: China stays are directly bookable at the
 * confirmed rates from the H&S Operations Master budget (Kunming 27 /
 * Lijiang 63 per person per night). Payable only with china scope + the
 * explicit Stay-with-us selection — same single-truth rule as Bangkok. */
function cnStayTotal(key) {
  if (!(S.scope && S.scope.china) || !S.china || S.china[key] !== 'with') return 0;
  const c = POST_WEDDING.find((x) => x.id === key + '-stay');
  if (!c) return 0;
  /* OWNER RESOLUTION (06 SEP, final data pass): the Lijiang room values are the
   * approved PRICE PER PERSON for the complete fixed 04-06 MAR window — never
   * multiplied by nights. Kunming stays 50 pp/night x 3. */
  if (key === 'lijiang') return ljgVariant()[1] * bkkTravellers();
  if (c.ratePerGuestNight == null) return 0;
  return c.ratePerGuestNight * bkkTravellers() * c.nightsCount;
}
/* Room-variant selection — the owner source requires the guest to CHOOSE the
 * room in both China stays, even where all variants share one rate. */
function kmgVariant() {
  const c = POST_WEDDING.find((x) => x.id === 'kunming-stay');
  const v = c.variants || [];
  const i = Number.isInteger(S.kmgRoom) ? S.kmgRoom : 0;
  return v[Math.min(i, v.length - 1)] || '';
}
function ljgVariant() {
  const c = POST_WEDDING.find((x) => x.id === 'lijiang-stay');
  const v = c.variants || [];
  const i = Number.isInteger(S.ljgRoom) ? S.ljgRoom : 0;
  return v[Math.min(i, v.length - 1)] || ['', 0];
}
function cnStaysTotal() { return cnStayTotal('kunming') + cnStayTotal('lijiang'); }
/* §12: NOT THIS TIME removes the destination and every dependent payable.
 * Laos gate feeds every total call — stay (also when own), train, transfers. */
const LAOS_CIN = { '2027-02-27': 2, '2027-02-28': 1 };
function laosCheckIn() {
  const c = S.stay && S.stay.checkIn;
  if (c && LAOS_CIN[c]) return c;
  return (S.stay && S.stay.mode === 'oneNight') ? '2027-02-28' : '2027-02-27';
}
function laosNights() { return LAOS_CIN[laosCheckIn()]; }
/* Paid nights: total nights minus the single hosted wedding night —
 * except the 1-night stay (28.02→01.03), which has no hosted night. */
function laosPaidNights() { const n = laosNights(); return n === 1 ? 1 : n - 1; }
/* Owner rate rule: same per-guest category amount per additional paid
 * night. journeyTotal charges ONE paid night; nights beyond it add here. */
function laosExtraTotal(acc, occ) {
  if (!acc || !(S.scope && S.scope.laos) || (S.stay && S.stay.own)) return 0;
  if (acc.contributionPerGuest == null) return 0;
  return partyTotal(acc, occ) * (laosPaidNights() - 1);
}
function laosGate(acc, riders, transfers) {
  const on = !!(S.scope && S.scope.laos);
  return { acc: on && !(S.stay && S.stay.own) ? acc : null, riders: on ? riders : 0, transfers: on ? (transfers || []) : [] };
}
function bkkTotal() {
  /* OWNER FINAL: provider-independent Bangkok Stay — USD 150 per person per
   * night x travellers x nights. Only when Bangkok scope + Stay with us. */
  if (!bangkokStayActive()) return 0;
  return BANGKOK_STAY.ratePerGuestNight * bkkTravellers() * bkkNights();
}
/** The definitive dated guest itinerary — derived from stored selections,
 *  ordered by date, one source (v1.2 §3). Also what Guest Relations reads. */
function itinerarySteps() {
  const acc = currentAcc();
  const riders = S.guests.filter((g) => g.journey.train);
  const anyBkk = S.guests.some((g) => g.journey.bangkok);
  const arr = (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId)).find((t) => t && t.direction === 'arrival');
  const steps = [];
  const bh0 = BANGKOK_STAYS[0];
  if (anyBkk) {
    const joinedStay = bangkokStayActive();
    steps.push({ d: bh0.arrival.date, t: 'Bangkok arrival', s: bh0.arrival.note, st: 'HOSTED' });
    steps.push(joinedStay
      ? { d: (S.bangkokStay.from && S.bangkokStay.to ? esc(S.bangkokStay.from) + ' → ' + esc(S.bangkokStay.to) : BANGKOK_STAY.window) + ' · ' + bkkNights() + ' nights', t: 'Bangkok Stay · currently ' + bh0.name,
          s: money(BANGKOK_STAY.ratePerGuestNight) + ' per guest / night · ' + bkkTravellers() + ' guests · total ' + money(bkkTotal()), st: 'BOOKED' }
      : { d: bh0.dates, t: bh0.name, s: 'Choose your Bangkok stay in My Journey', st: 'YOUR CHOICE' });
  }
  if (riders.length) {
    steps.push({ d: TRAIN.date + ' · 20:25', t: 'Bangkok → Nong Khai', st: 'BOOKED', s: 'SRT Special Express 25 · First Class Sleeper · Krung Thep Aphiwat → Nong Khai · 10h20 · ' + money(TRAIN.contributionPerGuest) + ' per guest · ' + riders.length + ' guest' + (riders.length > 1 ? 's' : '') + ' = ' + money((trainContribution(TRAIN, riders.length) || 0)) });
    steps.push({ d: '25 FEB 2027 · 06:45', t: 'Arrive Nong Khai', s: 'Nong Khai Railway Station' });
    steps.push({ d: '25 FEB 2027', t: 'Nong Khai → Vientiane', s: arr
      ? 'Coordinated ground and border transfer · ' + money(55) + ' per guest · ' + riders.length + ' guest' + (riders.length > 1 ? 's' : '') + ' = ' + money(55 * riders.length) + ' · Guest Relations confirms the exact pickup details after train arrival'
      : 'Own arrangement — Guest Relations can assist', st: arr ? 'BOOKED' : 'YOUR CHOICE' });
  } else {
    steps.push({ d: 'Before the wedding', t: 'Arriving independently in Vientiane', s: 'Fly or travel on your own schedule; we meet you there', st: 'YOUR CHOICE' });
  }
  steps.push(acc
    ? { d: (S.stay.mode === 'oneNight' ? '28 FEB – 01 MAR 2027 · 1 night' : acc.stay + ' · ' + acc.nights + ' nights'), t: acc.name + ' · Vientiane', s: (S.stay.mode === 'oneNight' ? 'One night · your costs · breakfast included' : 'First night · your costs — second night · hosted'), st: S.stay.waitlist ? 'WAITLISTED' : 'BOOKED' }
    : { d: '27 FEB – 01 MAR 2027', t: 'Your wedding stay · Vientiane', s: 'Choose under My Stay', st: 'YOUR CHOICE' });
  if (S.scope && S.scope.laos) {
    /* personal plan mirrors actual participation — no wedding rows for guests
     * who have not joined the Vientiane segment (§10). */
    steps.push({ d: '28 FEB 2027 · 09:00 AM', t: 'The Temple Ceremony', s: 'Wat Ong Teu Temple, Vientiane', st: 'COMPLIMENTARY', main: true });
    steps.push({ d: 'After the return', t: 'Coffee & Cake', s: 'Souphattra Heritage Vientiane', st: 'COMPLIMENTARY', main: true });
    steps.push({ d: '28 FEB 2027 · 16:30', t: 'The Vow Ceremony', s: 'Souphattra Heritage Vientiane', st: 'COMPLIMENTARY', main: true });
    steps.push({ d: '28 FEB 2027 · 19:30', t: 'The Wedding Dinner', s: 'Souphattra Vientiane Hotel', st: 'COMPLIMENTARY', main: true });
  }
  if (S.postWedding && S.postWedding.joined) {
    for (const c of POST_WEDDING.filter((x) => !x.onward)) {
      steps.push({ d: c.date, t: c.label, s: (c.type === 'Train' ? 'First Class Train' : c.type) + (c.sub ? ' · ' + c.sub : '') + (c.contribution != null ? '' : '') });
    }
    const ow = S.postWedding.onward;
    steps.push({ d: '06 MAR 2027', t: 'Your onward journey',
      s: ow === 'return' ? 'Return to Bangkok with us' : ow === 'own' ? 'Arranged independently' : ow === 'gr' ? 'Guest Relations support requested' : 'Choose in My Journey',
      st: ow === 'return' || ow === 'gr' ? 'BOOKED' : ow === 'own' ? 'YOUR CHOICE' : 'YOUR CHOICE' });
  } else {
    const dep = departureSelections();
    steps.push({ d: '01 MAR 2027', t: 'Your departure', s: dep.length
      ? dep.map((t) => t.name).join(' · ')
      : 'Follows your onward itinerary', st: dep.length ? 'BOOKED' : 'YOUR CHOICE' });
  }
  return steps;
}
function itineraryHtml() {
  return '<div class="itin">' + itinerarySteps().map((st) =>
    '<div class="it-row' + (st.main ? ' it-main' : '') + '"><span class="it-d">' + esc(st.d) + '</span><div class="it-b"><span class="it-t">' + esc(st.t) +
    (st.st ? '<span class="it-chip' + (st.st === 'HOSTED' ? ' hosted' : /CHOICE|FINALIZE|WAITLIST/.test(st.st) ? ' open' : '') + '">' + esc(st.st) + '</span>' : '') +
    '</span><span class="it-s">' + esc(st.s) + '</span></div></div>').join('') + '</div>';
}
/* Display currency (§18): USD is the Source of Truth. EUR/THB are indicative
 * display conversions from a live rate (frankfurter.app, ECB). The choice
 * persists across the Guest Area; without a usable rate we fall back to USD. */
const CURRENCIES = ['USD', 'EUR', 'THB'];
let DISPLAY_CUR = (() => { try { const c = localStorage.getItem('siyl.display.currency'); return CURRENCIES.includes(c) ? c : 'USD'; } catch (e) { return 'USD'; } })();
let FX = (() => { try { return JSON.parse(localStorage.getItem('siyl.fx.v1')) || null; } catch (e) { return null; } })();
function money(n) { return displayMoney(n, DISPLAY_CUR, FX); }
function fxStamp() {
  if (DISPLAY_CUR === 'USD') return '';
  if (!FX || !FX[DISPLAY_CUR]) return 'Live rate unavailable · shown in USD';
  const d = new Date(FX.ts);
  return 'Indicative exchange rate · updated ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}
async function loadRates() {
  if (FX && FX.ts && Date.now() - FX.ts < 6 * 3600 * 1000) return; // cached and fresh enough
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,THB');
    if (!r.ok) return;
    const j = await r.json();
    if (j && j.rates && j.rates.EUR && j.rates.THB) {
      FX = { EUR: j.rates.EUR, THB: j.rates.THB, ts: Date.now() };
      try { localStorage.setItem('siyl.fx.v1', JSON.stringify(FX)); } catch (e) { /* private mode */ }
      renderSummary(); if (typeof cur === 'number') renderStep(cur, false);
    }
  } catch (e) { /* offline: cached FX or USD fallback — never a fabricated rate */ }
}
function setCurrency(c) {
  if (!CURRENCIES.includes(c)) return;
  DISPLAY_CUR = c;
  try { localStorage.setItem('siyl.display.currency', c); } catch (e) { /* session only */ }
  renderStep(cur, false); renderSummary();
}
loadRates();
const showAmount = (n) => RATES_LIVE ? money(n) : 'Details to follow';
/** Guest price line shown BEFORE any request — per guest, never per night. */
function guestAvailability(res, unitPlural) {
  if (!res) return '';
  if (PUBLICATION.inventoryDisplay === 'EXACT') return availabilityLabel(res);
  const total = res.capacity_total;
  const unit = unitPlural || 'rooms';
  if (remaining(res) <= 0) return 'Waitlist · Guest Relations will confirm';
  return total + ' ' + (total === 1 ? unit.replace(/s$/, '') : unit) + ' allocated';
}
/* the availability statement printed onto the gallery photography */

let inventory = loadInventory();
let S = loadDraft() || freshState();
S.transfers ||= []; // legacy drafts predate transfer products
/* BOOKING EXPERIENCE V2 - one-time idempotent draft migration (order §31/32).
 * Scope is derived ONLY from explicit prior selections; ambiguous legacy
 * state stays inactive and can never create cost by itself. */
if (!S.v2) {
  S.scope = {
    bangkok: !!(S.guests && S.guests.some((g) => g.journey && g.journey.bangkok)),
    laos: true,
    china: !!(S.postWedding && S.postWedding.joined),
  };
  if (S.stay && S.stay.accommodationId) S.stay.mode = 'standard';
  S.experiences ||= [];
  S.v2 = 1;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}
S.scope ||= { bangkok: false, laos: true, china: false };
S.experiences ||= [];
S.china ||= { kunming: null, lijiang: null };
/* §10 v2.1 normalization: a ghost Bangkok selection (scope off, stay set)
 * loses its ACTIVE consequence exactly once; eligibility data survives. */
if (!S.v22) {
  S.guests && S.guests.forEach((g) => {
    const ev = g.events || {};
    if ('alms' in ev) { if (!('temple' in ev)) { ev.temple = !!ev.alms; ev.coffee = !!ev.alms; } delete ev.alms; g.events = ev; } /* MASTER-02: alms retired */
  });
  if (S.dressAck && ('alms' in S.dressAck) && !('temple' in S.dressAck)) { S.dressAck.temple = !!S.dressAck.alms; delete S.dressAck.alms; }
  S.v22 = 1;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}
if (!S.v21) {
  if (S.scope && !S.scope.bangkok && S.bangkokStay && S.bangkokStay.property) {
    S.bangkokStay = { property: null, from: '', to: '' };
  }
  S.v21 = 1;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
}

function freshState() {
  return {
    invitation: null,           // resolved invitation (party + guests)
    guests: [],                 // per-guest working records
    partyPlans: 'same',         // 'same' | 'different'
    stay: { accommodationId: null, occupantGuestIds: [], rooms: 1, bed: '', request: '', checkIn: '2027-02-27' },
    arrival: { shared: true, mode: 'flight', pickupRequested: false },
    arrivalByGuest: {},
    departure: { shared: true, transferRequested: false },
    departureByGuest: {},
    additionalGuestRequest: '',
    dressAck: { temple: false, ceremony: false, dinner: false }, // per-event dress code acknowledgement (§21)
    bangkokStay: { property: null, from: '', to: '' },          // optional Bangkok stay (§2-3): property + guest chosen dates
    postWedding: { joined: false, onward: '' },                 // optional Post Wedding Journey + onward choice (own | gr | return)
    transfers: [],           // [{ transferId, units, details:{date,time,ref,place,location} }]
    scope: { bangkok: false, laos: false, china: false },  // V2 journey scope — §21: every destination starts NOT THIS TIME
    experiences: [],         // V2 requested experiences
    v2: 1,
    v21: 1,
    v22: 1,
    payment: null,            // 'full' | 'installments' (P0 payment preference)
    china: { kunming: null, lijiang: null },  // China stay decisions (with|own)
    trainNote: '',
    notes: '',
    submitted: false,
    registration_submitted_at: null,
  };
}
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
  renderSubnav();
  renderDestnav();
  renderFooter();
  if (typeof updateNextState === 'function') updateNextState(); // item 8: live re-validation
}
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }
function loadInventory() {
  try {
    const raw = JSON.parse(localStorage.getItem(INV_KEY) || 'null');
    if (raw) return raw;
  } catch (e) { /* fall through */ }
  // only requestable categories carry inventory — the Presidential is display-only
  return createInventory([...SELECTABLE_ACCOMMODATIONS, TRAIN]);
}
function saveInventory() { try { localStorage.setItem(INV_KEY, JSON.stringify(inventory)); } catch (e) { /* ignore */ } }

/* ---------------- step controller ---------------- */
const stepEls = [...document.querySelectorAll('.step')];
let cur = 0;

function show(i, focusHeading = true) {
  stepEls[cur].classList.remove('active');
  cur = i;
  stepEls[cur].classList.add('active');
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  const h = stepEls[cur].querySelector('h1, h2');
  if (h && focusHeading) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  renderStep(cur);
  renderSummary();
  renderPrivnav();
}
const idx = (name) => stepEls.findIndex((s) => s.dataset.step === name);

function renderStep(i) {
  const name = stepEls[i].dataset.step;
  if (name === 'home') renderHome();
  if (name === 'party') renderParty();
  if (name === 'plan') renderPlanner();
  if (name === 'journey') renderTravelStep(document.getElementById('journey-box'));
  if (name === 'events') renderSegInto('vte', document.getElementById('events-box'));
  /* Your Stay renders every journey's accommodation natively in the Aman
   * composition — the legacy Bangkok scope-block injection is retired. */
  if (name === 'stay') { renderStay(); renderStayMode(); }
  if (name === 'spa') renderPlaces();
  if (name === 'each') renderEach();
  if (name === 'cost') renderCost();
  if (name === 'review') { renderReview(); renderReviewScope(); }
  if (name === 'send') renderSend();
  renderSubnav();
  renderDestnav();
  renderFooter();
  if (typeof updateNextState === 'function') updateNextState(); // item 8
}

/* ---------------- invitation overlay state machine (§7) ----------------
 * ONE authoritative source of truth: INV.state ('loading'|'open'|'closed'),
 * mutated ONLY by setInvitationState(). The pre-paint boot script decided the
 * initial html[data-inv]; this module adopts it. Hard invariant: after the
 * guest clicks OPEN YOUR INVITATION (INV.userOpened) no lifecycle path may
 * reopen it — only the explicit reopen link (force). Every attempted stale or
 * invalid transition is ignored (and logged with ?debug=inv). */
const overlay = document.getElementById('invitation');
const urlToken = (new URLSearchParams(location.search).get('invite') || '').trim().toLowerCase();
const urlRoom = (new URLSearchParams(location.search).get('room') || '').trim().toLowerCase();
const INV_DEBUG = new URLSearchParams(location.search).has('debug');
const INV = {
  state: document.documentElement.getAttribute('data-inv') || 'loading',
  version: 0,
  userOpened: false,
  initialized: false,
  opening: false,
};
function openedKey() { return SEEN_KEY + (urlToken || (S.invitation ? S.invitation.token : 'first')); }
function wasOpenedPersisted() { try { return !!localStorage.getItem(openedKey()); } catch (e) { return false; } }
function persistOpened() { try { localStorage.setItem(openedKey(), '1'); } catch (e) { /* private mode — INV.userOpened carries it in-session */ } }
function invLog(msg, caller) {
  if (INV_DEBUG) console.log('[INVITATION_STATE] ' + msg + ' caller=' + caller +
    ' initialized=' + INV.initialized + ' v=' + INV.version + ' userOpened=' + INV.userOpened);
}
/** The ONLY function allowed to change invitation visibility. */
function setInvitationState(to, caller, opts = {}) {
  const r = nextInvitationState(INV, {
    to, userOpened: INV.userOpened, force: !!opts.force,
    version: opts.version, currentVersion: INV.version,
  });
  if (r.blocked) { invLog(r.blocked + ' (' + INV.state + ' -x-> ' + to + ')', caller); return; }
  if (r.state === INV.state) return;
  invLog(INV.state + ' -> ' + r.state, caller);
  INV.state = r.state;
  INV.version++;
  document.documentElement.setAttribute('data-inv', r.state);
  if (r.state === 'closed') {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    document.body.classList.remove('inv-lock');
  } else {
    overlay.removeAttribute('aria-hidden');
    overlay.removeAttribute('inert');
    document.body.classList.add('inv-lock');
    if (r.state === 'open') { const c = overlay.querySelector('.inv-cta'); if (c) c.focus(); }
  }
}
// adopt the pre-paint state's a11y attributes
if (INV.state === 'closed') { overlay.setAttribute('aria-hidden', 'true'); overlay.setAttribute('inert', ''); }
else { document.body.classList.add('inv-lock'); }

function focusActiveHeading() {
  const h = document.querySelector('.step.active h1, .step.active h2');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
/** The single close path — the physical box mechanism: the guest pulls the
 *  plaque (glued to the LEFT panel, free right half is the handle), the LEFT
 *  panel swings open first carrying the plaque, the right panel follows, the
 *  box unfolds onto the Guest Area behind. The overlay's REAL leaves animate;
 *  the state machine only closes after the box has opened. userOpened/persist
 *  happen first so the no-auto-reopen invariant always holds. */
function openIntoGuestArea(caller) {
  if (INV.opening) return;             // one pull; ignore re-entrant clicks mid-swing
  INV.userOpened = true;               // invariant flag FIRST — wins over any pending init
  persistOpened();
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || INV.state !== 'open') {
    setInvitationState('closed', caller); focusActiveHeading(); return;
  }
  INV.opening = true;
  document.documentElement.classList.add('inv-anim-open');
  setTimeout(() => {
    setInvitationState('closed', caller);   // hide the overlay before resetting the leaves
    document.documentElement.classList.remove('inv-anim-open');
    INV.opening = false;
    if (urlRoom) { show(idx('stay'), false); setTimeout(scrollToRoom, 350); } // carry the room context through the opened box
    focusActiveHeading();
  }, 2600);
}
/* Dismissal (✕ / Return to my journey): an escape hatch, never a replay of the
 * opening ritual — the box animation is reserved for a VERIFIED open (§14). */
function dismissInvitation(caller) {
  if (INV.opening) return;
  INV.userOpened = true; persistOpened();
  setInvitationState('closed', caller);
  focusActiveHeading();
}
/* OPEN YOUR INVITATION — the code on the plaque is verified through the
 * existing secure lookup (client-side decryption; a wrong code resolves to
 * null, no code list ever ships). Only a verified code pulls the plaque and
 * opens the box; a returning authenticated guest (prefilled/untouched code)
 * opens without retyping. */
const codeInput = document.getElementById('inv-code-input');
const codeErr = document.getElementById('inv-code-err');
async function verifyAndOpen() {
  if (INV.opening) return;
  const raw = (codeInput ? codeInput.value : '').trim().toLowerCase();
  if (S.invitation && !isAuthOut() && (raw === '' || raw === S.invitation.token)) {
    if (codeErr) codeErr.hidden = true;
    openIntoGuestArea('cta-open'); return;
  }
  const inv = await lookupInvitation(raw);
  if (!inv) { if (codeErr) codeErr.hidden = false; return; }
  if (codeErr) codeErr.hidden = true;
  setAuthOut(false);              // the code is the key: it creates the private session
  adoptInvitation(inv);
  show(idx('home'), false);       // the Journey is what the opening box reveals
  announce('Invitation found. ' + inv.partyName + ' — welcome to your private journey.');
  openIntoGuestArea('cta-open-verified');
}
document.querySelector('.inv-cta').addEventListener('click', verifyAndOpen);
if (codeInput) {
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verifyAndOpen(); } });
  codeInput.addEventListener('input', () => { if (codeErr) codeErr.hidden = true; });
}
const invX = document.getElementById('inv-x');
if (invX) invX.addEventListener('click', () => dismissInvitation('inv-x'));
const invReturn = document.getElementById('inv-return');
if (invReturn) invReturn.addEventListener('click', () => dismissInvitation('inv-return'));
const invWeb = document.getElementById('inv-web');
if (invWeb) invWeb.addEventListener('click', () => { try { saveDraft(); } catch (e) { /* draft optional at this stage */ } });
document.getElementById('reopen-invitation').addEventListener('click', (e) => {
  e.preventDefault();
  setInvitationState('open', 'reopen-link', { force: true }); // explicit user action only
});
// lifecycle restores may only ever CLOSE, never open
addEventListener('pageshow', () => { if (INV.userOpened || wasOpenedPersisted()) setInvitationState('closed', 'pageshow'); });
addEventListener('visibilitychange', () => { if (!document.hidden && (INV.userOpened || wasOpenedPersisted())) setInvitationState('closed', 'visibilitychange'); });

/* ---------------- step 1 · find your invitation (§9) ---------------- */
const findInput = document.getElementById('find-input');
const findErr = document.getElementById('find-err');
document.getElementById('find-btn').addEventListener('click', doFind);
findInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doFind(); } });

async function doFind() {
  /* §16: an invalid code and a temporary technical failure are DIFFERENT
   * interaction states — the guest must never mistake one for the other. */
  let inv = null;
  try {
    inv = await lookupInvitation(findInput.value);
  } catch (e) {
    findErr.textContent = 'Something did not load correctly just now — this is on our side, not your code. Please try again in a moment; if it continues, Guest Relations will help right away.';
    findErr.classList.add('show');
    return;
  }
  if (!inv) {
    findErr.textContent = 'We could not find that invitation code. Please use the private code from your invitation letter — or write to Guest Relations and we will help right away.';
    findErr.classList.add('show');
    return;
  }
  findErr.classList.remove('show');
  setAuthOut(false); // the code is the key: it creates the private session
  adoptInvitation(inv);
  show(idx('home'));
  announce('Invitation found. ' + inv.partyName + ' — welcome to your private journey.');
}
function personalizeInvitation() {
  const el = document.getElementById('inv-for');
  if (!el) return;
  const codeField = document.getElementById('inv-code-input');
  if (S.invitation && !isAuthOut()) {
    /* partyName is the AUTHORITATIVE invitation display name from the guest
     * record — never reconstructed from guest first names (owner rule §2). */
    const name = S.invitation.partyName;
    el.innerHTML = '<span class="inv-for-label">A private invitation for</span>' +
      '<span class="inv-for-names">' + esc(name) + '</span>';
    /* fixed personalisation zone: only the name scales, the plaque never moves —
     * one line preferred, two lines maximum (owner rule §3) */
    el.setAttribute('data-fit', name.length <= 16 ? 'short' : name.length <= 26 ? 'mid' : name.length <= 38 ? 'long' : 'max');
    el.hidden = false;
    const back = document.getElementById('inv-return');
    if (back) back.hidden = false;
    if (codeField && !codeField.value) codeField.value = S.invitation.token; // the personal link carries the code
  } else {
    el.hidden = true;
    const back = document.getElementById('inv-return');
    if (back) back.hidden = true;
  }
}
function adoptInvitation(inv) {
  if (!S.invitation || S.invitation.invitationId !== inv.invitationId) {
    S = freshState();
    S.invitation = { invitationId: inv.invitationId, token: inv.token, partyName: inv.partyName, partyLead: inv.partyLead, guests: inv.guests, unresolvedMapping: !!inv.unresolvedMapping };
    S.guests = inv.guests.map((g) => ({
      guestId: g.guestId, fullName: g.fullName, preferredName: g.preferredName,
      status: g.status || 'ACTIVE',
      attending: g.status && g.status !== 'ACTIVE' ? false : true, // CANCELLED/NO_SHOW join nothing by default
      email: '', phone: '', dob: '',
      journey: { bangkok: false, train: false, independent: true },
      events: { temple: true, coffee: true, ceremony: true, dinner: true },
      diet: 'No restrictions', allergy: 'no', allergyDetail: '', severe: false,
      berth: '', spa: { requested: false },
      favFood: '', favDrink: '', coffeeHow: '', teaLove: '', favSnack: '',
      favColour: '', favFlower: '', bookLove: '', favFilm: '', favSong: '',
      feelAtHome: '', longDayWaiting: '',
      coffeeTea: '', sweetSavoury: '', // legacy answers: no longer asked, never destroyed
    }));
    S.stay.occupantGuestIds = inv.guests.map((g) => g.guestId);
  }
  saveDraft();
  personalizeInvitation();
}
// Deep-link resolution happens inside init() — no competing initializer.

/* ---------------- MY JOURNEY · private member area ---------------- */
const PRIVNAV = [
  ['home', '01 · Your Journey'], ['stay', '02 · Your Stay'], ['journey', '03 · Your Travel'],
  ['each', '04 · Your Details'], ['cost', '05 · Your Plan'],
];
/* ---------------- Aman drawer navigation (Phase 2) ----------------
 * The old step bar is gone. #privnav is a full-screen sliding drawer
 * (menu left in the header, wordmark centre, plan right). Hierarchy:
 * SEE YOU IN LAOS -> Thailand / Laos / China -> details / plan / utilities. */
function setDrawer(open) {
  const nav = document.getElementById('privnav');
  const scrim = document.getElementById('dw-scrim');
  const menu = document.getElementById('hd-menu');
  document.body.classList.toggle('dw-open', open);
  if (scrim) scrim.hidden = !open;
  if (menu) menu.setAttribute('aria-expanded', String(open));
  if (open && nav) { const c = nav.querySelector('.dw-close'); if (c) c.focus(); }
  else if (menu && !menu.hidden) menu.focus();
}
function renderPrivnav() {
  const nav = document.getElementById('privnav');
  if (!nav) return;
  const siteNav = document.getElementById('sitenav');
  const menuBtn = document.getElementById('hd-menu');
  const planBtn = document.getElementById('hd-plan');
  if (!S.invitation || isAuthOut()) {
    nav.hidden = true; setDrawer(false);
    if (siteNav) siteNav.hidden = false;
    if (menuBtn) menuBtn.hidden = true;
    if (planBtn) planBtn.hidden = true;
    return;
  }
  nav.hidden = false;
  if (siteNav) siteNav.hidden = true;
  if (menuBtn) menuBtn.hidden = false;
  if (planBtn) planBtn.hidden = false;
  const name = stepEls[cur].dataset.step;
  const voyLink = (k) => {
    const d = SEG_DEF()[k]; const v = VOY[k];
    const here = name === 'home' && S._voy === k;
    return '<button type="button" class="dw-sub" data-voy-nav="' + k + '"' + (here ? ' aria-current="true"' : '') + '>' +
      v.country + ' — ' + d.name + '</button>';
  };
  nav.innerHTML =
    '<div class="dw-head"><span class="dw-brand">see you in laos<span style="color:var(--cherry-photo)">.</span></span>' +
    '<button type="button" class="dw-close" aria-label="Close menu">Close</button></div>' +
    '<button type="button" data-nav="home"' + (name === 'home' && !S._voy ? ' aria-current="true"' : '') + '>Your Journey</button>' +
    '<div class="dw-group">' + voyLink('bkk') + voyLink('vte') + voyLink('china') + '</div>' +
    '<button type="button" class="dw-sub" data-destnav="1">Destinations</button>' +
    '<button type="button" data-nav="plan"' + (name === 'plan' ? ' aria-current="true"' : '') + '>Plan your journey</button>' +
    '<button type="button" data-nav="stay"' + (name === 'stay' ? ' aria-current="true"' : '') + '>Your Stay</button>' +
    '<button type="button" data-nav="journey"' + (name === 'journey' ? ' aria-current="true"' : '') + '>Your Travel</button>' +
    '<button type="button" data-nav="each"' + (name === 'each' ? ' aria-current="true"' : '') + '>Your Details</button>' +
    '<button type="button" data-nav="cost"' + (name === 'cost' ? ' aria-current="true"' : '') + '>Your Plan</button>' +
    '<span class="pn-exit"><button type="button" id="nav-invitation">Invitation</button><button type="button" id="pn-home">Website</button><button type="button" id="pn-save">Save</button><button type="button" id="log-out">Log out</button></span>';
  const mark = document.getElementById('site-mark');
  if (mark && !mark.dataset.wired) {
    mark.dataset.wired = '1';
    mark.addEventListener('click', (e) => {
      if (!S.invitation || isAuthOut()) return;   // signed out: the logo leads to the website
      e.preventDefault(); saveDraft(); S._voy = null; setDrawer(false); show(idx('home'));
    });
  }
  if (menuBtn && !menuBtn.dataset.wired) {
    menuBtn.dataset.wired = '1';
    menuBtn.addEventListener('click', () => setDrawer(true));
    document.getElementById('dw-scrim').addEventListener('click', () => setDrawer(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('dw-open')) setDrawer(false);
    });
  }
  if (planBtn && !planBtn.dataset.wired) {
    planBtn.dataset.wired = '1';
    planBtn.addEventListener('click', () => { setDrawer(false); show(idx('plan')); });
  }
  nav.querySelector('.dw-close').addEventListener('click', () => setDrawer(false));
  nav.querySelectorAll('[data-destnav]').forEach((b) => b.addEventListener('click', () => {
    setDrawer(false); setDestnav(true);
  }));
  nav.querySelectorAll('[data-voy-nav]').forEach((b) => b.addEventListener('click', () => {
    S._voy = b.getAttribute('data-voy-nav'); setDrawer(false); show(idx('home'));
  }));
  nav.querySelector('#pn-home').addEventListener('click', () => {
    saveDraft(); location.href = '../'; // progress saved; the personal link reopens the journey
  });
  nav.querySelector('#nav-invitation').addEventListener('click', () => {
    setDrawer(false); setInvitationState('open', 'privnav-invitation', { force: true });
  });
  nav.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('data-nav') === 'home') { S._voy = null; S._dest = null; }
    setDrawer(false); show(idx(b.getAttribute('data-nav')));
  }));
  nav.querySelector('#pn-save').addEventListener('click', (e) => {
    saveDraft();                       // SAVE only: stay here, stay signed in
    const b = e.currentTarget; const t = b.textContent;
    b.textContent = 'Saved'; b.disabled = true;
    setTimeout(() => { b.textContent = t; b.disabled = false; }, 1600);
    announce('Your journey has been saved. You are still signed in.');
  });
  nav.querySelector('#log-out').addEventListener('click', () => {
    saveDraft(); setAuthOut(true); // journey stays saved; code or link signs back in
    location.href = './';
  });
}


/* ============ AIDA-model view layer (owner final rebuild order) ============
 * OVERVIEW -> SUMMARY -> SELECT -> OPEN -> INTERACT -> APPLY -> CLOSE ->
 * RETURN. Business logic, pricing and persistence are the 13bee61 baseline;
 * only the presentation architecture is new. Everything below is declared as
 * hoisted functions plus a SEG_DEF getter so boot order can never race it. */
function SEG_DEF() {
  return {
    bkk: { name: 'Before the Wedding', city: 'Bangkok', when: '21 – 24 FEB 2027', scope: 'bangkok', optional: true },
    vte: { name: 'The Wedding', city: 'Vientiane', when: '27 FEB – 01 MAR 2027', scope: 'laos', optional: true },
    china: { name: 'After the Wedding', city: 'Kunming · Lijiang', when: '01 – 06 MAR 2027', scope: 'china', optional: true },
  };
}
function segJoined(k) { S.scope ||= { bangkok: false, laos: true, china: false }; return !!S.scope[SEG_DEF()[k].scope]; }
function expForCity(c) {
  const all = window.SIYL_EXP || [];
  if (c === 'bkk') return all.filter((x) => x.chapter === 'bkk');
  if (c === 'vte') return all.filter((x) => x.chapter === 'laos');
  if (c === 'kmg') return all.filter((x) => x.chapter === 'china' && /kunming/i.test(x.where || ''));
  if (c === 'ljg') return all.filter((x) => x.chapter === 'china' && /lijiang/i.test(x.where || ''));
  return [];
}
function expRailHtml(list) {
  if (!list.length) return '<p class="note">Places for this chapter follow soon.</p>';
  return '<div class="exp-rail">' + list.map((x) =>
    '<button type="button" class="exp-chip" data-exp-open="' + x.id + '">' +
    (x.img ? '<img src="../' + x.img + '" alt="' + esc(x.name) + '" loading="lazy" decoding="async"/>' : '<span class="ec-ph">' + esc(x.name) + '</span>') +
    '<span class="ec-t">' + esc(x.name) + '</span>' +
    '<span class="ec-c">' + esc(x.cats) + '</span>' +
    '<span class="ec-v">View experience</span>' +
    '</button>').join('') + '</div>';
}
function wireExpRail(box) {
  box.querySelectorAll('[data-exp-open]').forEach((b) => b.addEventListener('click', () => openExpOverlay(b.getAttribute('data-exp-open'))));
}
let expTrigger = null;
function openExpOverlay(id) {
  const x = (window.SIYL_EXP || []).find((e) => e.id === id);
  const ov = document.getElementById('exp-overlay');
  if (!x || !ov) return;
  expTrigger = document.activeElement;
  const gal = (x.gallery && x.gallery.length ? x.gallery : (x.img ? [x.img] : [])).map((g) => '../' + g);
  ov.querySelector('.pv-body').innerHTML =
    '<div class="pv-tag">' + esc(x.where) + ' · ' + esc(x.cats) + '</div>' +
    '<h3>' + esc(x.name) + '</h3>' +
    (gal.length ? '<div class="pv-gallery">' + gal.map((src, i) =>
      '<button type="button" class="pv-gimg" data-exp-lb="' + i + '"><img src="' + src + '" alt="' + esc(x.name) + ' · view ' + (i + 1) + '" width="1200" height="800" loading="lazy" decoding="async"/></button>').join('') + '</div>' +
      '<p class="note" style="margin:4px 0 0;opacity:.65">Tap a photo to view all photos</p>' : '') +
    '<p style="margin-top:14px">' + esc(x.teaser) + '</p>' +
    (x.detail ? x.detail.map((d) => '<p class="note" style="margin-top:10px">' + esc(d) + '</p>').join('') : '') +
    (x.maps ? '<p style="margin-top:16px"><a class="btn sm ghost" href="' + x.maps + '" target="_blank" rel="noopener">Open in Google Maps</a></p>' : '');
  ov.querySelectorAll('[data-exp-lb]').forEach((b) => b.addEventListener('click', () =>
    openLightbox({ name: x.name, images: gal }, parseInt(b.getAttribute('data-exp-lb'), 10) || 0)));
  ov.hidden = false; ov.removeAttribute('inert');
  document.getElementById('exp-backdrop').hidden = false;
  document.body.classList.add('pv-lock');
  ov.querySelector('.pv-close').focus();
}
function closeExpOverlay() {
  const ov = document.getElementById('exp-overlay');
  if (!ov || ov.hidden) return;
  ov.hidden = true; ov.setAttribute('inert', '');
  document.getElementById('exp-backdrop').hidden = true;
  document.body.classList.remove('pv-lock');
  if (expTrigger) expTrigger.focus();
}
function evJoinState(k) {
  const att = S.guests.filter((g) => g.attending !== false);
  return att.some((g) => (g.events || {})[k]) ? 'JOINING' : (S._evDecided && S._evDecided[k] ? 'NOT JOINING' : null);
}
function segModules(k) {
  if (k === 'bkk') return [
    { key: 'note', label: 'Bangkok Days', sum: 'Stay & travel live in steps 02 · 03', render: (w) => { w.innerHTML = '<p class="note">Bangkok is part of your journey. Choose the shared penthouse under <strong>02 · Your Stay</strong> and the overnight train under <strong>03 · Your Travel</strong>.</p>'; } },
  ];
  if (k === 'vte') return [
    { key: 'temple', label: 'Temple Ceremony', sum: '28 FEB · 09:00 · Wat Ong Teu', status: evJoinState('temple'), render: (w) => renderWeddingPresets(w, ['temple']) },
    { key: 'coffee', label: 'Coffee & Cake', sum: 'After the temple', status: evJoinState('coffee'), render: (w) => renderWeddingPresets(w, ['coffee']) },
    { key: 'vow', label: 'Vow Ceremony', sum: '28 FEB · 16:30', status: evJoinState('ceremony'), render: (w) => renderWeddingPresets(w, ['ceremony']) },
    { key: 'dinner', label: 'Wedding Dinner', sum: '28 FEB · 19:30', status: evJoinState('dinner'), render: (w) => renderWeddingPresets(w, ['dinner']) },
  ];
  return [
    { key: 'note', label: 'Kunming & Lijiang', sum: 'Stay & travel live in step 03', render: (w) => { w.innerHTML = '<p class="note">China is part of your journey. The flight, the First Class train and both stays are arranged under <strong>03 · Your Travel</strong>.</p>'; } },
  ];
}
/* ---- 03 · YOUR TRAVEL — travel choices as summary rows, scope-gated ---- */
function renderTravelStep(box) {
  if (!box) return;
  S._mod ||= {};
  const sc = S.scope || {};
  const riders = S.guests.filter((g) => g.journey.train);
  /* Travel is presented inside the journey it belongs to — route context,
   * editorial hierarchy, restrained fact lines, inline disclosure. */
  const groups = [
    { j: '01', country: 'Thailand', route: 'Bangkok → Nong Khai → Vientiane', on: !!sc.bangkok,
      off: 'Opens when Thailand is part of your journey.',
      html: (function () {
        const on = riders.length > 0;
        const cabin = S.trainCabin === 'private';
        return '<div class="ch-grid">' +
          choice('The overnight train', money(TRAIN.contributionPerGuest) + ' per guest · ' + esc(TRAIN.date) + ' · ' + esc(TRAIN.times), on, 'data-tv-train="1"') +
          (on && riders.length === 1
            ? choice('Private cabin', money(130) + ' single occupancy · ' + money(55) + ' upcharge', cabin, 'data-tv-cabin="1"')
            : '') +
          '</div>' +
          '<p class="tv-f">' + esc(TRAIN.packageNote) + '</p>' +
          (on ? '<p class="am-avail">BOOKED · ' + riders.length + ' guest' + (riders.length > 1 ? 's' : '') + ' · ' + money(trainContribution(TRAIN, riders.length) || 0) + '</p>'
              : '<p class="am-avail">YOUR CHOICE · open</p>');
      })() },
    { j: '02', country: 'Laos', route: 'Arrival · Vientiane · the wedding days', on: sc.laos !== false,
      off: 'Opens when Laos is part of your journey.',
      html: '<p class="note" style="max-width:560px">The arrival welcome and every transfer inside the wedding programme are hosted for you. Nothing to choose here.</p>' +
        '<p class="am-avail">HOSTED</p>' },
    { j: '03', country: 'China', route: 'Vientiane → Kunming → Lijiang', on: !!sc.china,
      off: 'Opens when China is part of your journey.',
      html: '<div class="ch-grid">' +
        choice('Vientiane → Kunming', 'MU9632 · Business Class · ' + money(275) + ' per guest', !!(S.travel && S.travel.vteKmg === 'with'), 'data-tv-t="vteKmg"') +
        choice('Kunming → Lijiang', 'Train C642 · Business Class · ' + money(85) + ' per guest', !!(S.travel && S.travel.kmgLjg === 'with'), 'data-tv-t="kmgLjg"') +
        choice('Kunming stay', money(50) + ' per guest, per night · 01–04 MAR', !!(S.china && S.china.kunming === 'with'), 'data-tv-c="kunming"') +
        choice('Lijiang stay', 'Room variant from ' + money(70) + ' per person, 2 nights · 04–06 MAR', !!(S.china && S.china.lijiang === 'with'), 'data-tv-c="lijiang"') +
        '</div>' +
        ((cnStaysTotal() || pwTotal()) ? '<p class="am-avail">BOOKED · ' + money(cnStaysTotal() + pwTotal()) + ' your costs</p>' : '<p class="am-avail">YOUR CHOICE · open</p>') },
  ];
  box.innerHTML = '<p class="note" style="max-width:560px;margin-bottom:6px">How you move, shown inside the journey it belongs to.</p>' +
    groups.map((g) =>
      '<section class="am-sec"><p class="cch-label">Journey ' + g.j + ' · ' + g.country + '</p>' +
      '<p class="tv-route">' + g.route + '</p>' +
      (g.on ? g.html : '<p class="note tv-off">' + g.off + '</p>') +
      '</section>').join('');
  box.querySelectorAll('[data-tv-train]').forEach((b) => b.addEventListener('click', () => {
    const on = S.guests.some((g) => g.journey.train);
    S.guests.forEach((g) => { if (g.attending !== false) g.journey.train = !on; });
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-tv-cabin]').forEach((b) => b.addEventListener('click', () => {
    S.trainCabin = S.trainCabin === 'private' ? null : 'private';
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-tv-t]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-tv-t');
    S.travel ||= { vteKmg: null, kmgLjg: null };
    S.travel[k] = S.travel[k] === 'with' ? null : 'with';
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-tv-c]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-tv-c');
    S.china ||= {};
    S.china[k] = S.china[k] === 'with' ? null : 'with';
    S.postWedding ||= {}; S.postWedding.joined = true;
    saveDraft(); renderStep(cur); renderSummary();
  }));
}
function renderSegModules(k, box) {
  if (!box) return;
  S._mod ||= {};
  box.innerHTML = '<div class="cv-mods">' + segModules(k).map((m) => {
    const open = S._mod[k] === m.key;
    return '<div class="cv-mod' + (open ? ' open' : '') + '">' +
      '<button type="button" class="cm-head" data-cvm-t="' + m.key + '">' +
      '<span class="cm-title">' + m.label + '</span>' +
      '<span class="cm-sum">' + esc(m.sum || '') + '</span>' +
      (m.status ? '<span class="cm-status' + (m.status === 'BOOKED' || m.status === 'JOINING' ? ' on' : '') + '">' + m.status + '</span>' : '') +
      '<span class="cm-chev" aria-hidden="true"></span></button>' +
      (open ? '<div class="cm-body" data-cvm-body="' + m.key + '"></div>' : '') +
      '</div>';
  }).join('') + '</div>';
  const openKey = S._mod[k];
  if (openKey) {
    const m = segModules(k).find((x) => x.key === openKey);
    const w = box.querySelector('[data-cvm-body="' + openKey + '"]');
    if (m && w) m.render(w);
  }
  box.querySelectorAll('[data-cvm-t]').forEach((b) => b.addEventListener('click', () => {
    const key = b.getAttribute('data-cvm-t');
    S._mod[k] = (S._mod[k] === key) ? null : key;
    renderStep(cur);
  }));
}
function renderSegInto(k, box) {
  if (!box) return;
  const d = SEG_DEF()[k];
  if (!segJoined(k)) {
    box.innerHTML = '<div class="cv-head"><h3>' + d.city + '</h3><div class="cv-when">' + d.when + '</div><div class="cv-tag">' + d.name + '</div></div>' +
      '<p class="note" style="margin:18px 0 14px">' + d.city + ' is an optional part of the journey. Joining sets nothing in stone and costs nothing — it only opens the right choices for you.</p>' +
      '<button type="button" class="btn sm" data-seg-join="' + k + '">Join this chapter</button>';
  } else {
    box.innerHTML = '<div class="cv-head"><h3>' + d.city + '</h3><div class="cv-when">' + d.when + '</div><div class="cv-tag">' + d.name + '</div></div><div data-seg-mods></div>' +
      '<p class="note" style="margin-top:14px"><button type="button" class="btn sm ghost" data-seg-leave="' + k + '">Not this time</button></p>';
    renderSegModules(k, box.querySelector('[data-seg-mods]'));
  }
  wireSegJoin(box);
}
function wireSegJoin(box) {
  box.querySelectorAll('[data-seg-join]').forEach((b) => b.addEventListener('click', () => {
    S.scope[SEG_DEF()[b.getAttribute('data-seg-join')].scope] = true;
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-seg-leave]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-seg-leave');
    S.scope[SEG_DEF()[k].scope] = false;
    if (k === 'vte') S.guests.forEach((g) => { g.almsOffering = false; });
    saveDraft(); renderStep(cur); renderSummary();
  }));
}
function renderPlaces() {
  const box = document.getElementById('spa-box');
  if (!box) return;
  const CITIES = [['bkk', 'Bangkok', '21 – 24 FEB 2027'], ['vte', 'Vientiane', '25 FEB – 01 MAR 2027'], ['kmg', 'Kunming', '01 – 04 MAR 2027'], ['ljg', 'Lijiang', '04 – 06 MAR 2027']];
  box.innerHTML = '<p class="note" style="margin-bottom:10px">A travel guide through the journey — tap a place to open it. Nothing here is a booking.</p>' +
    CITIES.map(([c, name, when]) =>
      '<div style="margin:26px 0 4px"><div class="cch-label">' + name + '</div>' +
      '<div class="cv-when" style="margin:1px 0 8px">' + when + '</div>' +
      expRailHtml(expForCity(c)) + '</div>').join('');
  wireExpRail(box);
}

/* ---------------- AMAN VOYAGE UX (Phase 2) ----------------
 * Platform = see you in laos. Three journeys = THAILAND / LAOS / CHINA.
 * Wedding = the peak inside the Laos journey. Real geographic maps (Leaflet/OSM),
 * Aman voyage grammar: map -> eyebrow -> serif title -> dates -> duration/stops ->
 * editorial intro -> itinerary hairline rows -> horizontal day-by-day (peeked) ->
 * contextual experiences -> selections -> accommodation composition. */
const VOY = {
  bkk: {
    country: 'Thailand', order: '01',
    stops: [[13.7563, 100.5018, 'Bangkok', 'start'], [17.8783, 102.7413, 'Nong Khai', 'end']],
    lede: 'Bangkok opens the journey: the shared penthouse days, then the overnight train north to Nong Khai and the crossing into Laos.',
    hero: '../assets/images/city/001-bangkok-wat-pho-reflection.jpg', heroAlt: 'Bangkok — Wat Pho',
  },
  vte: {
    country: 'Laos', order: '02',
    stops: [[17.8767, 102.7190, 'Friendship Bridge', 'start'], [17.9757, 102.6331, 'Vientiane', 'wedding']],
    lede: 'Vientiane carries the heart of everything: the temple morning, coffee and cake, the vows and the wedding dinner — one day that the whole journey leans toward.',
    hero: '../assets/images/city/002-vientiane-pha-that-luang.jpg', heroAlt: 'Vientiane — Pha That Luang',
  },
  china: {
    country: 'China', order: '03',
    stops: [[24.8801, 102.8329, 'Kunming', 'start'], [26.8721, 100.2299, 'Lijiang', 'end']],
    lede: 'After the wedding the journey continues: Kunming, the First Class train through the mountains, and the old town of Lijiang.',
  },
};
function voyItin(k) {
  if (k === 'bkk') return [
    ['21 – 24 FEB', 'Bangkok', 'Stay'],
    [TRAIN.date, 'Bangkok → Nong Khai', 'Overnight train'],
    ['', 'Nong Khai → Vientiane', 'Crossing to Laos'],
  ];
  if (k === 'vte') return [
    /* Editorial itinerary context (owner-approved 06 SEP): journey rows, NOT
     * additional wedding programme events — the programme stays four events. */
    ['27 FEB', 'Arrival · Vientiane', 'Hosted'],
    ['27 FEB', 'Guest Arrivals & Rehearsal', 'Itinerary'],
    ['27 FEB', 'Welcome Dinner at Lao Derm', 'Itinerary'],
    ['28 FEB', 'Bridal & Groom Party Lunch', 'Itinerary'],
    ['28 FEB', 'The Wedding Day', 'Four events'],
    ['28 FEB · late', 'After-Party · Souphattra Heritage', 'Itinerary'],
    ['01 MAR', 'Vientiane → Kunming', 'Onward'],
  ];
  return [
    ['01 MAR', 'Vientiane → Kunming', 'Flight'],
    ['01 – 04 MAR', 'Kunming', 'Stay'],
    ['04 MAR', 'Kunming → Lijiang', 'Train C642 · Business Class'],
    ['04 – 06 MAR', 'Lijiang', 'Stay'],
    ['06 MAR', 'Lijiang → Bangkok', 'Onward'],
  ];
}
function voyDays(k) {
  const exp = (c) => expForCity(c);
  if (k === 'bkk') return [
    { day: '21 – 24 FEB', title: 'Bangkok', text: 'City days together before the wedding — the penthouse stay, the river, the markets.', exp: exp('bkk'),
      img: '../assets/images/city/001-bangkok-chao-phraya-skyline.jpg' },
    { day: '24 FEB', title: 'The Overnight Train', text: TRAIN.times + ' — First Class Sleeper north to Nong Khai, van pickup and luggage service to the hotel included.', exp: [] },
  ];
  if (k === 'vte') return [
    { day: '27 FEB', title: 'Vientiane', text: 'Arrival and the first quiet evening in the city on the Mekong.', exp: exp('vte'),
      img: '../assets/images/city/002-vientiane-mekong-sunset.jpg' },
    /* Temple Ceremony: the library folder currently holds alms-giving photography
     * from the retired Sacred Morning Ritual — deliberately not assigned here. */
    { day: '28 FEB · 09:00', title: 'Temple Ceremony', text: 'The morning ceremony at Wat Ong Teu.', exp: [] },
    { day: '28 FEB · 12:00', title: 'Coffee & Cake', text: 'After the return from the temple — an easy afternoon together.', exp: [],
      img: '../assets/images/event/051-coffee-and-cake-patisserie.jpg' },
    /* Vow Ceremony: the green door at Souphattra Heritage, verified in the owner
     * library (folder 012). Green gate / green door, never a pool. */
    { day: '28 FEB · 16:30', title: 'Vow Ceremony', text: 'The vows at the green gate.', exp: [],
      img: '../assets/images/event/052-vow-ceremony-green-door.jpg' },
    /* Wedding Dinner: the courtyard garden where the dinner is served, verified
     * in the owner library (folder 012). The venue, honestly labelled as such. */
    { day: '28 FEB · 19:30', title: 'Wedding Dinner', text: 'The evening that gathers everyone at one table, in the courtyard garden.', exp: [],
      img: '../assets/images/event/053-wedding-dinner-courtyard-garden.jpg' },
  ];
  return [
    { day: '01 – 04 MAR', title: 'Kunming', text: 'The city of eternal spring — first days in Yunnan.', exp: exp('kmg') },
    { day: '04 – 06 MAR', title: 'Lijiang', text: 'The old town beneath Jade Dragon Snow Mountain.', exp: exp('ljg') },
  ];
}
function mountVoyMaps(root) {
  const els = [...root.querySelectorAll('[data-voy-map]')];
  if (!els.length) return;
  if (typeof window.L === 'undefined') { setTimeout(() => mountVoyMaps(root), 350); return; }
  els.forEach((el) => {
    if (el._map) return;
    const k = el.getAttribute('data-voy-map');
    const mini = el.hasAttribute('data-voy-mini');
    const stops = VOY[k].stops;
    const m = window.L.map(el, {
      zoomControl: !mini, scrollWheelZoom: false, dragging: !mini,
      touchZoom: !mini, doubleClickZoom: !mini, boxZoom: false, keyboard: !mini,
      tap: !mini, attributionControl: true,
    });
    el._map = m;
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    const line = stops.map((st) => [st[0], st[1]]);
    window.L.polyline(line, { color: '#74070E', weight: 2, opacity: .85, dashArray: '1 6' }).addTo(m);
    stops.forEach((st) => {
      const wedding = st[3] === 'wedding';
      const start = st[3] === 'start';
      window.L.circleMarker([st[0], st[1]], {
        radius: wedding ? 8 : 5.5,
        color: wedding ? '#74070E' : '#211F1C',
        weight: start ? 2 : 1.5,
        fillColor: wedding ? '#74070E' : (start ? '#211F1C' : '#F2ECE1'),
        fillOpacity: 1,
      }).addTo(m).bindTooltip(st[2], {
        permanent: !mini, direction: 'top', offset: [0, -8], className: 'vy-tip',
      });
    });
    m.fitBounds(window.L.latLngBounds(line), { padding: mini ? [26, 26] : [46, 46] });
  });
}
function voyMetaLine(k) {
  const d = SEG_DEF()[k];
  const nStops = VOY[k].stops.length;
  const nDays = voyDays(k).length;
  return d.when + ' · ' + nDays + (nDays === 1 ? ' chapter' : ' chapters') + ', ' + nStops + ' stops';
}
/* ---------------- JOURNEY COMMERCE: blocks, extras, journey bag ----------------
 * The guest buys curated JOURNEY BLOCKS with a per-person package price; the
 * detailed components stay inside the existing calculation engine. The Journey
 * Bag is a PROJECTION of real booking state (scope, stay, train, china) — there
 * is no second commerce state. No payment processing exists or is added. */
const EXTRAS = [
  /* Owner-supplied optional experience (this order): real product basis kept —
   * USD 180 as an experience FOR TWO, not converted to per-person. */
  { id: 'tea1872', name: 'Champagne Afternoon Tea at 1872', where: 'Aman Nai Lert Bangkok',
    unit: 'For two guests', price: 180, per: 'unit',
    text: 'An afternoon of champagne and patisserie at 1872, Aman Nai Lert Bangkok — an optional experience during the Bangkok days.' },
];
function extrasSel() { S.extras ||= {}; return S.extras; }
/* PACKAGE C · Pre-Wedding Vientiane 25–27 FEB · 2 nights FIXED (owner rule:
 * the window never collapses to one night). Same approved room matrix as the
 * wedding stay, independently selectable. Hosted guest house limited to 6. */
function preWedAcc() { return S.prewedAcc ? ACCOMMODATIONS.find((a) => a.id === S.prewedAcc) : null; }
function preWedTotal() {
  const a = preWedAcc();
  if (!a || a.contributionPerGuest == null) return 0;
  return a.contributionPerGuest * attendingCount();
}
/* PACKAGE F · Bangkok after China · Siam Kempinski 06–08 MAR · 190 pp/night × 2. */
function kempinskiTotal() {
  return (S.kempinski === 'with') ? RETURN_STAY.ratePerGuestNight * RETURN_STAY.nights * attendingCount() : 0;
}
function extrasTotal() {
  const sel = extrasSel();
  return EXTRAS.reduce((t, x) => t + (sel[x.id] ? sel[x.id] * x.price : 0), 0);
}
/* The five commercial blocks, priced from the live engine. price === null means
 * the owner has not supplied the commercial basis yet — never invented. */
function journeyBlocks() {
  const n = attendingCount();
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const riders = S.guests.filter((g) => g.journey.train).length;
  return [
    { id: 'bkk', no: '01', name: 'Bangkok', dates: '21 – 24 FEB 2027',
      on: !!(S.scope && S.scope.bangkok && bangkokStayActive()),
      variant: (BANGKOK_STAYS[0] || {}).name,
      pp: BANGKOK_STAY.ratePerGuestNight * bkkNights(), qty: bkkTravellers() || n,
      total: bkkTotal(),
      included: ['Three nights in the shared penthouse', 'The Bangkok days together'] },
    { id: 'train', no: '02', name: 'Special Train Journey', dates: '24 – 25 FEB 2027',
      on: riders > 0,
      variant: S.trainCabin === 'private' ? 'Private single cabin' : 'First Class Sleeper',
      pp: TRAIN.contributionPerGuest + (S.trainCabin === 'private' && riders === 1 ? 55 : 0),
      qty: riders || n,
      total: (trainContribution(TRAIN, riders) || 0) + trainCabinUpcharge(),
      included: ['Special Express No. 25, Bangkok → Nong Khai', 'First Class Sleeper', 'Van pickup & luggage service to the hotel', 'The crossing to Vientiane'] },
    { id: 'prewed', no: '03', name: 'Pre-Wedding Vientiane', dates: '25 – 27 FEB 2027',
      on: !!preWedAcc(),
      variant: preWedAcc() ? preWedAcc().name : null,
      pp: preWedAcc() ? (preWedAcc().contributionPerGuest == null ? 0 : preWedAcc().contributionPerGuest) : null,
      qty: n, total: preWedAcc() ? preWedTotal() : null,
      included: ['Two nights at Souphattra Heritage Vientiane · 2-night window is fixed', 'The pre-wedding Vientiane days and their programme'] },
    { id: 'wedding', no: '04', name: 'The Wedding', dates: '27 FEB – 01 MAR 2027',
      on: !!acc,
      variant: acc ? acc.name : null,
      pp: acc ? (acc.contributionPerGuest == null ? 0 : contributionPerGuest(acc) * laosPaidNights()) : null,
      qty: occ.length || n,
      total: acc ? (partyTotal(acc, occ) + laosExtraTotal(acc, occ)) : null,
      included: ['Temple Ceremony — Included', 'Coffee & Cake — Included', 'Vow Ceremony — Included', 'Wedding Dinner — Included', 'Second night hosted by Haruthai & Suthep', 'Breakfast, welcome and programme transfers'] },
    /* Package E is a COMPONENT SUM by owner rule — no rounded package price. */
    { id: 'after', no: '05', name: 'After the Wedding', dates: '01 – 06 MAR 2027',
      on: !!(S.scope && S.scope.china && (cnStaysTotal() || pwTotal())),
      variant: kmgVariant().split(' · ')[0] + ' · ' + ljgVariant()[0],
      pp: null, qty: n,
      total: cnStaysTotal() + pwTotal(),
      included: ['MU9632 Vientiane → Kunming · Business Class · USD 275 pp',
        'Three nights Wanxiang Yueju, Kunming · USD 50 pp/night',
        'Train C642 Kunming → Lijiang · Business Class · USD 85 pp',
        'Two nights Luye Baisha · Rizhao Jinshan, Lijiang · room variant from USD 70 pp',
        'MU5924 + MU741 Lijiang → Bangkok · Economy flexible · USD 200 pp'] },
    { id: 'kempinski', no: '06', name: 'Bangkok after China', dates: RETURN_STAY.dates,
      on: S.kempinski === 'with',
      variant: RETURN_STAY.name + ' · ' + RETURN_STAY.room,
      pp: RETURN_STAY.ratePerGuestNight * RETURN_STAY.nights, qty: n,
      total: kempinskiTotal(),
      included: ['Two nights, breakfast included', 'Balcony · non-smoking · complimentary minibar and Wi-Fi'] },
  ];
}
/* Just-added confirmation (Aman bag-popover grammar, our brand and wording). */
function justAdded(name, detail, priceLine) {
  let el = document.getElementById('just-added');
  if (!el) {
    el = document.createElement('div'); el.id = 'just-added';
    document.body.appendChild(el);
  }
  el.innerHTML = '<div class="ja-panel" role="status">' +
    '<p class="cch-label">Just added to your journey</p>' +
    '<p class="ja-t serif">' + esc(name) + '</p>' +
    (detail ? '<p class="ja-s">' + esc(detail) + '</p>' : '') +
    (priceLine ? '<p class="ja-p">' + priceLine + '</p>' : '') +
    '<button type="button" class="btn-full dark" data-ja-view>Review your journey</button>' +
    '<button type="button" class="t-act" data-ja-close>Continue exploring</button></div>';
  el.hidden = false;
  el.querySelector('[data-ja-close]').addEventListener('click', () => { el.hidden = true; });
  el.querySelector('[data-ja-view]').addEventListener('click', () => { el.hidden = true; show(idx('cost')); });
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 7000);
}

/* ---------------- STAGED PLANNER (Aman "Plan your voyage" grammar) ----------
 * Four stages with a top stage bar (current / completed / future), an editorial
 * introduction per stage, large square outlined choices, quiet selected and
 * disabled states, and forward/back actions. It drives the SAME engine: scope,
 * guest events, stay selection, transport, details and persistence. Fixed facts
 * (the wedding date, the itinerary) are shown as fixed, never as fake options. */
const STAGES = [
  ['journeys', 'Journey & Dates'],
  ['staytravel', 'Stay & Travel'],
  ['experiences', 'Experiences'],
  ['details', 'Your Details'],
];
function stageIndex() { const i = STAGES.findIndex((x) => x[0] === (S._stage || 'journeys')); return i < 0 ? 0 : i; }
function stageDone(key) {
  if (key === 'journeys') return !!(S.scope && (S.scope.bangkok || S.scope.laos || S.scope.china));
  if (key === 'staytravel') return !!currentAcc();
  if (key === 'experiences') return S.guests.some((g) => Object.keys(g.events || {}).some((k) => g.events[k]));
  if (key === 'details') return S.guests.filter((g) => g.attending !== false).every((g) => g.email || g.phone);
  return false;
}
/* large square outlined choice — the one selection control across the product */
function choice(label, sub, on, attr, disabled) {
  return '<button type="button" class="ch' + (on ? ' on' : '') + '" ' + attr +
    ' aria-pressed="' + (!!on) + '"' + (disabled ? ' disabled' : '') + '>' +
    '<span class="ch-t serif">' + label + '</span>' +
    (sub ? '<span class="ch-s">' + sub + '</span>' : '') + '</button>';
}
/* ---------------- Aman four-column footer ----------------
 * Only real routes and real project data. No invented legal documents, no
 * fabricated social URLs, no newsletter without a backend. Where a channel
 * exists as a concept but no approved URL exists in the project sources, the
 * position is held with an honest line instead of a false destination. */
function renderFooter() {
  const el = document.getElementById('siteFooter');
  if (!el) return;
  if (!S.invitation || isAuthOut()) { el.hidden = true; return; }
  el.hidden = false;
  const col = (title, rows) => '<div><h4>' + title + '</h4>' + rows.join('') + '</div>';
  const nav = (label, act) => '<button type="button" data-ft="' + act + '">' + label + '</button>';
  el.innerHTML = '<div class="ft">' +
    '<p class="ft-brand">see you in laos<span class="dot">.</span></p>' +
    '<div class="ft-grid">' +
    col('Explore', [nav('Destinations', 'destnav'), nav('Journeys', 'voy:none'),
      nav('Thailand', 'voy:bkk'), nav('Laos', 'voy:vte'), nav('China', 'voy:china'),
      nav('Wedding', 'voy:vte:wedding'), nav('Wellness', 'voy:vte:wellness')]) +
    col('Plan', [nav('Plan your journey', 'step:plan'), nav('Your stay', 'step:stay'),
      nav('Your travel', 'step:journey'), nav('Your plan &amp; costs', 'step:cost'),
      nav('Review &amp; send', 'step:review')]) +
    col('See You In Laos', [nav('Your invitation', 'invitation'),
      '<a href="../">The website</a>',
      '<a href="mailto:' + CONTACTS.email + '">Guest Relations</a>',
      (CONTACTS.whatsapp ? '<a href="https://wa.me/' + CONTACTS.whatsapp + '" rel="noopener" target="_blank">WhatsApp</a>' : ''),
      '<p class="ft-note">LINE · scan the owner-original code in your Guest Relations card</p>']) +
    col('Get inspired', [
      '<p class="ft-note">Sunday, 28 February 2027 · Vientiane, Laos</p>',
      '<p class="ft-note">Facebook, Instagram, LinkedIn and YouTube exist for this wedding, but no approved link is recorded in the project sources yet, so none is shown here.</p>']) +
    '</div>' +
    '<div class="ft-legal"><span>&copy; 2026 See You In Laos</span>' +
    '<span>Haruthai &amp; Suthep</span>' +
    '<span>Sunday, 28 February 2027 · Vientiane</span></div>' +
    '</div>';
  el.querySelectorAll('[data-ft]').forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute('data-ft').split(':');
    if (v[0] === 'destnav') { setDestnav(true); return; }
    if (v[0] === 'invitation') { setInvitationState('open', 'footer', { force: true }); return; }
    if (v[0] === 'step') { S._voy = null; S._dest = null; show(idx(v[1])); return; }
    if (v[0] === 'voy') {
      S._dest = null;
      S._voy = (v[1] === 'none') ? null : v[1];
      S._voySec = v[2] || null;
      show(idx('home'));
    }
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }));
}

function renderPlanner() {
  const box = document.getElementById('plan-box');
  if (!box) return;
  if (!S.invitation) { show(idx('find')); return; }
  S._stage = S._stage || 'journeys';
  const cur_ = S._stage;
  const bar = '<nav class="stage-bar" aria-label="Planning stages">' + STAGES.map(([k, label], i) => {
    const state = k === cur_ ? 'now' : (stageDone(k) ? 'done' : 'next');
    return '<button type="button" class="stage ' + state + '" data-stage="' + k + '"' +
      (k === cur_ ? ' aria-current="step"' : '') + '><span class="stage-n">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="stage-l">' + label + '</span></button>';
  }).join('') + '</nav>';
  let body = '';
  if (cur_ === 'journeys') {
    const sc = S.scope || {};
    body = '<div class="am-center"><p class="eyebrow">Stage one</p><h1 class="serif">Journey &amp; dates</h1>' +
      '<p class="note am-lede">One invitation, three journeys. Choose the ones you are travelling. The wedding date is fixed; everything around it is yours to shape.</p></div>' +
      '<section class="am-sec"><p class="cch-label">Your journeys</p><div class="ch-grid">' +
      [['bkk', 'bangkok'], ['vte', 'laos'], ['china', 'china']].map(([k, key]) => {
        const d = SEG_DEF()[k];
        return choice(VOY[k].country, d.when + ' · ' + d.name, !!sc[key], 'data-scope-t="' + key + '"');
      }).join('') + '</div></section>' +
      '<section class="am-sec"><p class="cch-label">Fixed dates</p>' +
      '<div class="pl-row"><span class="pl-d">28 FEB 2027</span><div class="pl-b"><span class="pl-t serif">The wedding day</span>' +
      '<span class="pl-s">Vientiane · Temple Ceremony, Coffee &amp; Cake, Vow Ceremony, Wedding Dinner</span></div><span class="pl-st">FIXED</span></div>' +
      '<div class="pl-row"><span class="pl-d">27 FEB – 01 MAR</span><div class="pl-b"><span class="pl-t serif">The wedding stay window</span>' +
      '<span class="pl-s">Souphattra Heritage Vientiane</span></div><span class="pl-st">FIXED</span></div>' +
      '</section>';
  } else if (cur_ === 'staytravel') {
    const sc = S.scope || {};
    const acc = currentAcc();
    const riders = S.guests.filter((g) => g.journey.train).length;
    body = '<div class="am-center"><p class="eyebrow">Stage two</p><h1 class="serif">Stay &amp; travel</h1>' +
      '<p class="note am-lede">Where you sleep on each journey, and how you move between them. Availability and eligibility come from the real allocation.</p></div>' +
      '<section class="am-sec"><p class="cch-label">Your wedding stay</p><div class="ch-grid">' +
      ACCOMMODATIONS.filter((a) => a.selectable !== false).map((a) => {
        const res = inventory[a.id];
        const full = remaining(res) <= 0;
        return choice(a.name, (a.contributionPerGuest == null ? 'Complimentary · limited' : money(contributionPerGuest(a)) + ' per guest') + (full ? ' · waitlist' : ''),
          S.stay.accommodationId === a.id, 'data-pl-acc="' + a.id + '"', false);
      }).join('') + '</div>' +
      (acc ? '<p class="am-avail">BOOKED · ' + esc(acc.name) + '</p>' : '<p class="am-avail">OPEN · no room chosen yet</p>') +
      '</section>' +
      (sc.bangkok ? '<section class="am-sec"><p class="cch-label">Bangkok</p><div class="ch-grid">' +
        choice('The Bangkok stay', money(BANGKOK_STAY.ratePerGuestNight) + ' per guest, per night · ' + bkkNights() + ' nights', bangkokStayActive(), 'data-pl-bkk="1"') +
        choice('The overnight train', money(TRAIN.contributionPerGuest) + ' per guest · ' + esc(TRAIN.date), riders > 0, 'data-pl-train="1"') +
        '</div></section>' : '') +
      '<section class="am-sec"><p class="cch-label">Pre-wedding Vientiane · 25 – 27 FEB · 2 nights fixed</p><div class="ch-grid">' +
      ACCOMMODATIONS.filter((a) => a.selectable !== false).map((a) =>
        choice(a.name, a.contributionPerGuest == null ? 'Complimentary · limited' : money(a.contributionPerGuest) + ' per person, 2-night window',
          S.prewedAcc === a.id, 'data-pl-pw="' + a.id + '"')).join('') + '</div>' +
      '<p class="note am-foot">The two-night window is fixed even if you arrive for one night. Choosing nothing simply means arriving on 27 FEB.</p></section>' +
      (sc.china ? '<section class="am-sec"><p class="cch-label">China</p><div class="ch-grid">' +
        choice('Kunming stay', money(50) + ' per guest, per night · 01–04 MAR', !!(S.china && S.china.kunming === 'with'), 'data-pl-cn="kunming"') +
        choice('Lijiang stay', 'Room variant from ' + money(70) + ' per person, 2 nights · 04–06 MAR', !!(S.china && S.china.lijiang === 'with'), 'data-pl-cn="lijiang"') +
        choice('Vientiane → Kunming', 'MU9632 · Business Class · ' + money(275) + ' per guest', !!(S.travel && S.travel.vteKmg === 'with'), 'data-pl-tv="vteKmg"') +
        choice('Kunming → Lijiang', 'Train C642 · Business Class · ' + money(85) + ' per guest', !!(S.travel && S.travel.kmgLjg === 'with'), 'data-pl-tv="kmgLjg"') +
        choice('Bangkok after China', RETURN_STAY.name + ' · ' + money(RETURN_STAY.ratePerGuestNight * RETURN_STAY.nights) + ' per person, 2 nights', S.kempinski === 'with', 'data-pl-kf="1"') +
        '</div>' +
        ((S.china && S.china.kunming === 'with') ? '<p class="cch-label" style="margin-top:26px">Your Kunming room · Wanxiang Yueju</p>' +
          '<p class="note am-foot">Please choose your room — the rate is the same for every variant, the choice records your actual accommodation.</p>' +
          '<div class="ch-grid">' + (POST_WEDDING.find((x) => x.id === 'kunming-stay').variants || []).map((v, i) =>
            choice(v.split(' · ')[0], v.split(' · ').slice(1).join(' · '), (Number.isInteger(S.kmgRoom) ? S.kmgRoom : 0) === i, 'data-pl-kmgroom="' + i + '"')).join('') + '</div>' : '') +
        ((S.china && S.china.lijiang === 'with') ? '<p class="cch-label" style="margin-top:26px">Your Lijiang room · Luye Baisha · Rizhao Jinshan</p>' +
          '<p class="note am-foot">The amount is per person for the complete 04 – 06 MAR stay.</p>' +
          '<div class="ch-grid">' + (POST_WEDDING.find((x) => x.id === 'lijiang-stay').variants || []).map((v, i) =>
            choice(v[0], money(v[1]) + ' per person, 2-night stay', (Number.isInteger(S.ljgRoom) ? S.ljgRoom : 0) === i, 'data-pl-ljgroom="' + i + '"')).join('') + '</div>' : '') +
        '</section>' : '');
  } else if (cur_ === 'experiences') {
    body = '<div class="am-center"><p class="eyebrow">Stage three</p><h1 class="serif">Experiences</h1>' +
      '<p class="note am-lede">The four wedding events, and the wellness you would like us to pass on to Marsilea Spa. Everything else on your journeys is open to you without a decision here.</p></div>' +
      '<section class="am-sec"><p class="cch-label">The wedding · 28 February 2027</p><div class="ch-grid">' +
      [['temple', 'Temple Ceremony', '09:00 · Wat Ong Teu'], ['coffee', 'Coffee & Cake', 'After the return from the temple'],
       ['ceremony', 'Vow Ceremony', '16:30 · the green gate'], ['dinner', 'Wedding Dinner', '19:30']].map(([k, label, sub]) => {
        const on = S.guests.some((g) => (g.events || {})[k]);
        return choice(label, sub, on, 'data-pl-ev="' + k + '"');
      }).join('') + '</div></section>' +
      '<section class="am-sec"><p class="cch-label">Optional experiences</p>' +
      EXTRAS.map((x) => {
        const q = extrasSel()[x.id] || 0;
        return '<article class="am-prop" style="margin-top:18px">' +
          '<p class="eyebrow">' + esc(x.where) + '</p>' +
          '<h3 class="serif am-propname" style="font-size:24px">' + esc(x.name) + '</h3>' +
          '<p class="note am-blurb">' + esc(x.text) + '</p>' +
          '<p class="am-price">' + money(x.price) + ' <span class="am-per">' + esc(x.unit) + '</span></p>' +
          (q ? '<p class="am-avail">IN YOUR JOURNEY · quantity ' + q + '</p>' : '') +
          '<button type="button" class="btn-full' + (q ? '' : ' dark') + '" data-ex-add="' + x.id + '">' + (q ? 'Add another' : 'Add to your journey') + '</button>' +
          '</article>';
      }).join('') + '</section>' +
      '<section class="am-sec"><p class="cch-label">Dress code</p>' +
      '<p class="note" style="max-width:560px;margin-bottom:10px">' +
      (['temple','ceremony','dinner'].every((k) => !S.guests.some((g) => (g.events || {})[k]) || (S.dressAck && S.dressAck[k]))
        ? 'Dress codes confirmed for every event you are joining.'
        : 'Each wedding event has its own dress code. Please open the event under the Laos journey and confirm it — your registration cannot be sent without this.') + '</p>' +
      '<button type="button" class="btn-full" data-pl-wed="1">Open the wedding events</button></section>' +
      '<section class="am-sec"><p class="cch-label">Wellness</p>' +
      '<p class="note" style="max-width:560px;margin-bottom:10px">' + ((S.wellness || []).length ? (S.wellness.length + ' treatment' + (S.wellness.length > 1 ? 's' : '') + ' noted as interest. Marsilea Spa confirms every appointment directly.') : 'Marsilea Spa, on the fifth floor of the Souphattra Hotel Vientiane.') + '</p>' +
      '<button type="button" class="btn-full" data-pl-spa="1">Open Marsilea Spa</button></section>';
  } else {
    const missing = S.guests.filter((g) => g.attending !== false && !(g.email || g.phone)).length;
    body = '<div class="am-center"><p class="eyebrow">Stage four</p><h1 class="serif">Your details</h1>' +
      '<p class="note am-lede">The few things Guest Relations needs from each of you, and then one quiet look at everything before you send it.</p></div>' +
      '<section class="am-sec"><p class="cch-label">Guests</p>' +
      S.guests.map((g) => '<div class="pl-row"><span class="pl-d">' + esc(g.preferredName) + '</span>' +
        '<div class="pl-b"><span class="pl-t serif">' + esc(g.fullName) + '</span>' +
        '<span class="pl-s">' + (g.email || g.phone ? esc([g.email, g.phone].filter(Boolean).join(' · ')) : 'Contact details still needed') + '</span></div>' +
        '<span class="pl-st">' + (g.email || g.phone ? 'COMPLETE' : 'OPEN') + '</span></div>').join('') +
      '<button type="button" class="btn-full" data-pl-step="each" style="margin-top:16px">' + (missing ? 'Complete your details' : 'Edit your details') + '</button>' +
      '</section>' +
      '<section class="am-sec"><p class="cch-label">Review</p>' +
      '<p class="note" style="max-width:560px;margin-bottom:10px">Your plan, your costs and the confirmation you send to Guest Relations.</p>' +
      '<button type="button" class="btn-full" data-pl-step="cost">Your plan &amp; costs</button>' +
      '<button type="button" class="btn-full dark" data-pl-step="review">Review &amp; send</button>' +
      '</section>';
  }
  const i = stageIndex();
  const nav = '<div class="stage-nav">' +
    (i > 0 ? '<button type="button" class="t-act" data-stage-go="' + STAGES[i - 1][0] + '">&larr; ' + STAGES[i - 1][1] + '</button>' : '<span></span>') +
    (i < STAGES.length - 1 ? '<button type="button" class="t-act" data-stage-go="' + STAGES[i + 1][0] + '">' + STAGES[i + 1][1] + ' &rarr;</button>' : '<span></span>') +
    '</div>';
  box.innerHTML = bar + body + nav;
  const go = (k) => { S._stage = k; saveDraft(); renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); };
  box.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => go(b.getAttribute('data-stage'))));
  box.querySelectorAll('[data-stage-go]').forEach((b) => b.addEventListener('click', () => go(b.getAttribute('data-stage-go'))));
  box.querySelectorAll('[data-scope-t]').forEach((b) => b.addEventListener('click', () => {
    const key = b.getAttribute('data-scope-t');
    S.scope ||= { bangkok: false, laos: true, china: false };
    S.scope[key] = !S.scope[key];
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-acc]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-pl-acc');
    S.stay.accommodationId = (S.stay.accommodationId === id) ? null : id;
    S.stay.rooms = 1; S.stay.waitlist = false;
    if (S.stay.accommodationId) { S.scope ||= { bangkok: false, laos: true, china: false }; S.scope.laos = true; }
    S.stay.occupantGuestIds = S.guests.filter((g) => g.attending !== false).map((g) => g.guestId);
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-bkk]').forEach((b) => b.addEventListener('click', () => {
    S.bangkokStay ||= {};
    S.bangkokStay.withUs = !bangkokStayActive();
    if (!S.bangkokStay.withUs) S.bangkokStay.property = null;
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-train]').forEach((b) => b.addEventListener('click', () => {
    const on = S.guests.some((g) => g.journey.train);
    S.guests.forEach((g) => { if (g.attending !== false) g.journey.train = !on; });
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-cn]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-pl-cn');
    S.china ||= {};
    S.china[k] = S.china[k] === 'with' ? null : 'with';
    S.postWedding ||= {}; S.postWedding.joined = true;
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-pw]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-pl-pw');
    S.prewedAcc = (S.prewedAcc === id) ? null : id;
    saveDraft(); renderStep(cur); renderSummary();
    if (S.prewedAcc) {
      const a = ACCOMMODATIONS.find((x) => x.id === id);
      justAdded('Pre-Wedding Vientiane · ' + a.name, '25 – 27 FEB 2027 · 2 nights fixed · ' + attendingCount() + ' guests',
        a.contributionPerGuest == null ? 'HOSTED · limited to 6 guests' : money(a.contributionPerGuest) + ' per person');
    }
  }));
  box.querySelectorAll('[data-pl-kf]').forEach((b) => b.addEventListener('click', () => {
    S.kempinski = (S.kempinski === 'with') ? null : 'with';
    saveDraft(); renderStep(cur); renderSummary();
    if (S.kempinski === 'with') justAdded('Bangkok after China · ' + RETURN_STAY.name, RETURN_STAY.dates + ' · breakfast included',
      money(RETURN_STAY.ratePerGuestNight * RETURN_STAY.nights) + ' per person');
  }));
  box.querySelectorAll('[data-pl-kmgroom]').forEach((b) => b.addEventListener('click', () => {
    S.kmgRoom = parseInt(b.getAttribute('data-pl-kmgroom'), 10);
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-ljgroom]').forEach((b) => b.addEventListener('click', () => {
    S.ljgRoom = parseInt(b.getAttribute('data-pl-ljgroom'), 10);
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-tv]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-pl-tv');
    S.travel ||= { vteKmg: null, kmgLjg: null };
    S.travel[k] = S.travel[k] === 'with' ? null : 'with';
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-pl-ev]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-pl-ev');
    const on = S.guests.some((g) => (g.events || {})[k]);
    S.guests.forEach((g) => { if (g.attending !== false) { g.events ||= {}; g.events[k] = !on; } });
    S._evDecided ||= {}; S._evDecided[k] = true;
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-ex-add]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-ex-add');
    const x = EXTRAS.find((e) => e.id === id);
    const sel = extrasSel();
    sel[id] = (sel[id] || 0) + 1;
    saveDraft(); renderStep(cur); renderSummary();
    justAdded(x.name, x.where + ' · ' + x.unit, money(x.price) + ' · quantity ' + sel[id]);
  }));
  box.querySelectorAll('[data-pl-wed]').forEach((b) => b.addEventListener('click', () => {
    S._voy = 'vte'; S._voySec = null; S._dest = null; show(idx('home'));
    setTimeout(() => { const t = document.getElementById('vy-sel'); if (t) t.scrollIntoView({ block: 'start' }); }, 400);
  }));
  box.querySelectorAll('[data-pl-spa]').forEach((b) => b.addEventListener('click', () => {
    S._voy = 'vte'; S._voySec = 'wellness'; S._dest = null; show(idx('home'));
  }));
  box.querySelectorAll('[data-pl-step]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-pl-step')))));
}

/* ---------------- DESTINATION -> PROPERTY MODEL ----------------
 * Aman architecture, populated from the live project dataset:
 *   PLATFORM -> JOURNEY (country) -> DESTINATION (city) -> STAY(S) -> detail.
 * Stays are read from ACCOMMODATIONS / BANGKOK_STAYS / RETURN_STAY /
 * POST_WEDDING, so a destination shows exactly the properties that exist —
 * two in Bangkok, two in Vientiane, one each in Kunming and Lijiang. */
function DEST() {
  return {
    bangkok: { journey: 'bkk', country: 'Thailand', city: 'Bangkok',
      img: '../assets/images/city/001-bangkok-chao-phraya-skyline.jpg',
      alt: 'Bangkok — the Chao Phraya river',
      lede: 'The journey begins on the Chao Phraya. Shared city days before the wedding: the river, the temples, the markets, and the evening the overnight train leaves for the north.' },
    vientiane: { journey: 'vte', country: 'Laos', city: 'Vientiane',
      img: '../assets/images/city/002-vientiane-pha-that-luang.jpg',
      alt: 'Vientiane — Pha That Luang',
      lede: 'The quiet capital on the Mekong, and the place the whole journey leans toward. The temple morning, coffee and cake, the vows and the wedding dinner all happen here.' },
    kunming: { journey: 'china', country: 'China', city: 'Kunming',
      img: '../assets/images/city/003-kunming-jinma-biji-archway.jpg',
      alt: 'Kunming — Jinma Biji memorial archway',
      lede: 'The city of eternal spring. First days in Yunnan after the wedding, before the First Class train climbs north into the mountains.' },
    lijiang: { journey: 'china', country: 'China', city: 'Lijiang',
      img: '../assets/images/city/004-lijiang-black-dragon-pool.jpg',
      alt: 'Lijiang — Black Dragon Pool below Jade Dragon Snow Mountain',
      lede: 'The old town beneath Jade Dragon Snow Mountain: Naxi rooftops, cobbled lanes and water running through every street.' },
  };
}
/* Every stay attached to its destination, straight from the dataset. */
function staysFor(cityKey) {
  const out = [];
  if (cityKey === 'bangkok') {
    const b = BANGKOK_STAYS[0];
    out.push({ id: 'sathorn-penthouse', name: b.name, where: 'Sathorn, Bangkok',
      text: 'The shared penthouse for the days before the wedding — one address for everyone, six bedrooms, the city below.',
      images: (b.images || []).map((x) => x.replace('../', '')), dates: b.dates, nights: b.nights,
      facts: [['Dates', b.dates], ['Nights', String(b.nights)], ['Per guest, per night', money(BANGKOK_STAY.ratePerGuestNight)]],
      state: bangkokStayActive() ? 'BOOKED · your Bangkok stay' : 'YOUR CHOICE · open',
      action: bangkokStayActive() ? 'Change this stay' : 'Select this stay', jump: 'journey' });
    out.push({ id: 'siam-kempinski', name: RETURN_STAY.name, where: 'Pathum Wan, Bangkok',
      text: 'The return address in Bangkok, ' + esc(RETURN_STAY.room) + ', for guests whose journey ends the coordinated way.',
      images: (RETURN_STAY.images || []).map((x) => x.replace('../', '')),
      facts: [['Room', RETURN_STAY.room], ['When', 'On the coordinated return']],
      state: 'OPEN · Guest Relations confirms the arrangement', action: 'Discover more', jump: 'journey' });
  }
  if (cityKey === 'vientiane') {
    ACCOMMODATIONS.filter((a) => a.selectable !== false && a.kind !== 'airbnb').slice(0, 3).forEach((a) => {
      const res = inventory[a.id];
      const selected = S.stay.accommodationId === a.id;
      out.push({ id: a.id, name: a.name, where: a.property || 'Vientiane', text: a.blurb,
        images: (a.images || []), acc: a,
        facts: [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy], ['Per guest', a.contributionPerGuest == null ? 'Complimentary' : money(contributionPerGuest(a))]],
        state: selected ? 'BOOKED · your current room' : 'YOUR CHOICE · ' + guestAvailability(res),
        action: selected ? 'View your stay' : 'Select this stay', jump: 'stay' });
    });
    const ab = ACCOMMODATIONS.find((a) => a.kind === 'airbnb');
    if (ab) out.push({ id: ab.id, name: ab.name, where: ab.property || 'Vientiane', text: ab.blurb,
      images: (ab.images || []), acc: ab,
      facts: [['Size', ab.size], ['Guests', ab.occupancy]],
      state: 'HOSTED · limited availability, coordinated by Guest Relations',
      action: 'View this stay', jump: 'stay' });
  }
  if (cityKey === 'kunming' || cityKey === 'lijiang') {
    const c = POST_WEDDING.find((x) => x.id === (cityKey === 'kunming' ? 'kunming-stay' : 'lijiang-stay'));
    if (c) {
      const on = S.china && S.china[cityKey] === 'with';
      out.push({ id: c.id, name: c.label, where: cityKey === 'kunming' ? 'Kunming, Yunnan' : 'Lijiang, Yunnan',
        text: c.sub || '', images: (c.images || []).map((x) => x.replace('../', '')),
        facts: [['Dates', c.date], ['Nights', c.nightsCount ? String(c.nightsCount) : ''],
                ['Per guest, per night', c.ratePerGuestNight ? money(c.ratePerGuestNight) : '']],
        state: on ? 'BOOKED · arranged for you' : 'YOUR CHOICE · open',
        action: on ? 'View your stay' : 'Select this stay', jump: 'journey' });
    }
  }
  return out;
}
/* Aman property composition: large image -> location eyebrow -> serif name ->
 * editorial description -> facts -> state -> outlined action -> Discover more. */
function propertyHtml(st, cityKey) {
  return '<article class="am-prop">' +
    (st.images && st.images.length
      ? '<div class="am-gal"><div class="am-track" tabindex="0" role="group" aria-label="' + esc(st.name) + ' photographs">' +
        st.images.slice(0, 4).map((im, i) => '<img src="' + roomImg(im) + '" alt="' + esc(st.name) + ' · photograph ' + (i + 1) + '" loading="lazy" decoding="async" draggable="false"/>').join('') +
        '</div>' + (st.images.length > 1 ? '<span class="am-gcount">1 / ' + Math.min(st.images.length, 4) + '</span>' : '') + '</div>'
      : '<div class="am-ph" aria-hidden="true"></div>') +
    '<p class="eyebrow">' + esc(st.where) + '</p>' +
    '<h3 class="serif am-propname">' + esc(st.name) + '</h3>' +
    (st.text ? '<p class="note am-blurb">' + esc(st.text) + '</p>' : '') +
    (st.facts && st.facts.length ? '<dl class="am-facts">' + st.facts.filter((f) => f[1]).map((f) =>
      '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' : '') +
    '<p class="am-avail">' + esc(st.state) + '</p>' +
    '<button type="button" class="btn-full" data-prop-act="' + st.jump + '">' + esc(st.action) + '</button>' +
    '<button type="button" class="t-act" data-prop-more="' + cityKey + '">Discover more</button>' +
    '</article>';
}
/* Destination page — Aman country/destination grammar. */
function renderDestination(cityKey, box) {
  const D = DEST()[cityKey];
  if (!D) { S._dest = null; renderStep(cur); return; }
  const stays = staysFor(cityKey);
  const exps = expForCity(cityKey === 'bangkok' ? 'bkk' : cityKey === 'vientiane' ? 'vte' : cityKey === 'kunming' ? 'kmg' : 'ljg');
  document.getElementById('home-title').textContent = '';
  box.innerHTML =
    '<div class="vy-secbar"><button type="button" id="dest-nav">' + D.country + ' &middot; ' + D.city + '</button></div>' +
    '<div class="am-inset" style="margin-top:0"><img src="' + D.img + '" alt="' + esc(D.alt) + '" loading="lazy" decoding="async"/></div>' +
    '<div class="am-center">' +
    '<p class="eyebrow">' + D.country + '</p>' +
    '<h1 class="serif">Discover ' + D.city + '</h1>' +
    '<p class="note am-lede">' + esc(D.lede) + '</p>' +
    '</div>' +
    '<section class="am-sec"><p class="cch-label">Where you stay</p>' +
    (stays.length ? stays.map((st) => propertyHtml(st, cityKey)).join('')
      : '<p class="note">No stay is attached to this destination in the current data.</p>') +
    '</section>' +
    (exps.length ? '<section class="am-sec" data-rail><p class="cch-label">Experiences in ' + D.city + '</p>' +
      expRailHtml(exps.slice(0, 6)) + '</section>' : '') +
    /* Discover more — contextual, never a repeated empty CTA */
    '<section class="am-sec"><p class="cch-label">Discover more</p>' +
    discoverHtml(cityKey) + '</section>' +
    '<p class="vy-back"><button type="button" class="btn sm ghost" id="dest-back">&larr; All destinations</button></p>';
  box.querySelectorAll('[data-prop-act]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-prop-act')))));
  box.querySelectorAll('[data-prop-more]').forEach((b) => b.addEventListener('click', () => {
    const t = box.querySelector('.am-sec:last-of-type'); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }));
  box.querySelectorAll('[data-disc]').forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute('data-disc').split(':');
    if (v[0] === 'dest') { S._dest = v[1]; S._voy = null; }
    else if (v[0] === 'voy') { S._dest = null; S._voy = v[1]; S._voySec = v[2] || null; }
    else if (v[0] === 'step') { S._dest = null; show(idx(v[1])); return; }
    renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }));
  wireAmGalleries(box);
  box.querySelectorAll('[data-rail]').forEach((w) => wireExpRail(w));
  box.querySelector('#dest-back').addEventListener('click', () => { S._dest = null; renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  box.querySelector('#dest-nav').addEventListener('click', () => setDestnav(true));
}
/* Contextual Discover-more relationships — each destination points only at
 * content that genuinely relates to it. */
function discoverHtml(cityKey) {
  const rows = {
    bangkok: [['voy:bkk', 'The Thailand journey', 'Route, itinerary and the overnight train'],
              ['dest:vientiane', 'Vientiane', 'Where the wedding happens'],
              ['step:stay', 'Your stay', 'Availability and selection']],
    vientiane: [['voy:vte', 'The Laos journey', 'Itinerary, day by day and the wedding'],
                ['voy:vte:wellness', 'Marsilea Spa', 'Wellness on the fifth floor of the Souphattra'],
                ['dest:kunming', 'Kunming', 'Where the journey continues']],
    kunming: [['voy:china', 'The China journey', 'Flight, First Class train and both stays'],
              ['dest:lijiang', 'Lijiang', 'The old town beneath the snow mountain'],
              ['step:journey', 'Your travel', 'How you move between them']],
    lijiang: [['voy:china', 'The China journey', 'Flight, First Class train and both stays'],
              ['dest:kunming', 'Kunming', 'The city of eternal spring'],
              ['step:cost', 'Your plan', 'Everything you have chosen so far']],
  }[cityKey] || [];
  return rows.map((r) => '<button type="button" class="pl-row disc" data-disc="' + r[0] + '">' +
    '<div class="pl-b"><span class="pl-t serif">' + r[1] + '</span><span class="pl-s">' + r[2] + '</span></div>' +
    '<span class="pl-st">Discover</span></button>').join('');
}
/* Destinations overlay — the Aman destinations interaction. */
function setDestnav(open) {
  const ov = document.getElementById('destnav');
  const sc = document.getElementById('destnav-scrim');
  if (!ov || !sc) return;
  document.body.classList.toggle('sn-open', open);
  sc.hidden = !open; ov.hidden = !open;
  if (open) { const c = ov.querySelector('.sn-close'); if (c) c.focus(); }
}
function renderDestnav() {
  const ov = document.getElementById('destnav');
  if (!ov) return;
  const D = DEST();
  const groups = [['Thailand', ['bangkok']], ['Laos', ['vientiane']], ['China', ['kunming', 'lijiang']]];
  ov.innerHTML =
    '<div class="sn-top"><button type="button" class="sn-close" aria-label="Close">&times;</button></div>' +
    '<p class="sn-ctx">Destinations</p><hr class="sn-line"/>' +
    '<button type="button" class="sn-back" data-dest-close>Back</button>' +
    groups.map(([country, cities]) =>
      '<p class="sn-group">' + country + '</p>' +
      cities.map((c) => '<button type="button" class="sn-row" data-dest="' + c + '"' +
        (S._dest === c ? ' aria-current="true"' : '') + '>' + D[c].city + '</button>').join('')).join('');
  ov.querySelector('.sn-close').addEventListener('click', () => setDestnav(false));
  ov.querySelector('[data-dest-close]').addEventListener('click', () => setDestnav(false));
  ov.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => {
    S._dest = b.getAttribute('data-dest'); S._voy = null; setDestnav(false); show(idx('home'));
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }));
  const sc = document.getElementById('destnav-scrim');
  if (sc && !sc.dataset.wired) {
    sc.dataset.wired = '1';
    sc.addEventListener('click', () => setDestnav(false));
  }
}

/* ---------------- WELLNESS · MARSILEA SPA (Journey 02 · Laos) ----------------
 * Content source of truth: Owner-supplied official Marsilea Spa & Wellness Menu
 * (5th floor, Souphattra Hotel Vientiane). Treatments, durations, prices,
 * etiquette, opening hours and contact are transcribed from that document —
 * nothing is invented. Presentation follows the Aman wellness grammar:
 * large inset image, ivory whitespace, centered serif title, centered editorial
 * description, outlined action, dark primary action; treatments disclose
 * progressively as experiences, never as a price table. */
const MARSILEA = {
  name: 'Marsilea Spa',
  where: '5th floor, Souphattra Hotel Vientiane',
  address: 'Phonxay Village, Sikhodtabong District, Vientiane, Lao PDR',
  hours: '10:00 – 20:00',
  tel: '+856 20 22 227 812 / (0)21 71 3555',
  web: 'www.souphattra.com',
  maps: 'https://maps.app.goo.gl/MGt96YnmqVNnszvf7?g_st=ic',
  lede: 'A sanctuary of luxurious tranquility, offering a harmonious blend of ancient Laotian healing traditions and modern spa therapies. It is a sanctuary for discerning individuals seeking authentic wellness experiences and a reconnection with their inner selves in a setting of refined elegance.',
  hero: '../assets/images/marsilea/marsilea-reception.jpg',
  categories: [
    { key: 'body', title: 'Body Massage', img: '../assets/images/marsilea/marsilea-body-massage.jpg', items: [
      { name: 'Marsilea Signature Massage', prices: [[70, 90], [85, 120]],
        text: 'An exclusive blend of Southeast Asian healing traditions and refined Western techniques. The signature journey combines the graceful touch of traditional Lao massage with soothing herbal compresses, flowing Hawaiian-inspired techniques and invigorating Swedish movements to stimulate circulation, completed with a deeply calming scalp massage.' },
      { name: 'Deep Tissue Massage', prices: [[65, 90], [80, 120]],
        text: 'A therapeutic escape designed to release built-up tension and restore total balance. It helps improve circulation and prevent scar tissue buildup, and promotes mental well-being by lowering heart rate, reducing blood pressure and alleviating stress.' },
      { name: 'Swedish Massage', prices: [[45, 60], [60, 90], [75, 120]],
        text: 'A classic treatment designed to ease muscle tension and restore natural vitality. Designed with the sports enthusiast in mind, it loosens tight muscles and relieves aches associated with strenuous activity. Light or medium pressure is customised to your personal needs.' },
      { name: 'Aromatherapy Oil Massage', prices: [[45, 60], [60, 90], [75, 120]],
        text: 'A sensory journey that blends premium-grade essential oils with expert massage techniques for a deeply soothing yet invigorating experience. The natural aromas harmonise emotions, relieve stress, improve circulation and nourish the skin.' },
      { name: 'Marsilea Traditional Lao Massage', prices: [[35, 60], [45, 90], [55, 120]],
        text: 'An ancient practice that blends rhythmic pressure and stretching to renew energy flow. Performed without oils, this rhythmic therapy combines acupressure, stretching and deep tissue techniques to release tension, enhance circulation and restore the body\u2019s natural energy flow.' },
    ] },
    { key: 'facial', title: 'Facial Therapy', img: '../assets/images/marsilea/marsilea-facial-products.jpg', items: [
      { name: 'Jurlique Deep Cleansing', prices: [[50, 60]],
        text: 'A botanical treatment that deeply purifies and refreshes. Using natural botanical ingredients, it refreshes and balances the skin, leaving it clear, smooth and ready to absorb other skincare products more effectively.' },
      { name: 'Jurlique Nutri-Define Luxe Contouring', prices: [[55, 60]],
        text: 'A luxurious treatment that firms, lifts and redefines. It targets signs of aging, enhances skin firmness and elasticity, and helps contour and define facial features.' },
    ] },
    { key: 'bodytreat', title: 'Body Treatments', img: '../assets/images/marsilea/marsilea-body-scrub.jpg', items: [
      { name: 'Himalayan Salt Detox Body Scrub', prices: [[40, 60]],
        text: 'A mineral-rich ritual that purifies and invigorates from head to toe. Infused with the nourishing benefits of fresh rose petals and milk, it hydrates deeply, leaving the skin soft, radiant and rejuvenated.' },
      { name: 'Cream Body Scrub', prices: [[40, 60]],
        text: 'A rich, aromatic exfoliation customised with your choice of calming or energising botanicals: Ylang Ylang (calming and balancing), Jasmine (uplifting and sensual), Sandalwood (grounding and nourishing) or Orange (refreshing and energising).' },
    ] },
    { key: 'blissful', title: 'Blissful Moments', img: '../assets/images/marsilea/marsilea-blissful-moments.jpg', items: [
      { name: 'Ayurvedic Head Massage', prices: [[30, 45]],
        text: 'A holistic therapy that restores balance to the head, neck and shoulders. It relieves tension, enhances blood circulation and harmonises energy flow by stimulating key Marma points, and nourishes the scalp and hair with a special Ayurvedic oil blend.' },
      { name: 'Relaxing Foot Massage', prices: [[30, 60], [40, 90]],
        text: 'A nurturing ritual that begins with a nourishing milk and kaffir lime soak, followed by a gentle Himalayan salt scrub, and concludes with a soothing pressure-point foot massage to improve circulation and restore balance.' },
      { name: 'Head, Neck & Shoulder Massage', prices: [[25, 30]],
        text: 'A focused treatment designed to relieve deep-seated tension in the head, neck and shoulders through precise pressure techniques and gentle stretching. Ideal for easing discomfort caused by poor posture or accumulated stress.' },
      { name: 'Traditional Foot Massage', prices: [[20, 30]],
        text: 'An age-old technique stimulating vital pressure points on the soles of the feet, promoting full-body relaxation.' },
    ] },
    { key: 'packages', title: 'Radiant Total Care Packages', img: '../assets/images/marsilea/marsilea-singing-bowl-ritual.jpg', items: [
      { name: 'Ultimate Glow Package', prices: [[60, 90], [70, 120]],
        text: 'A seamless blend of exfoliation and massage for radiant skin and deep relaxation. Your choice of body scrub to exfoliate and soften the skin, followed by a relaxing massage to relieve tension and restore balance.' },
      { name: 'Rest & Relax Package', prices: [[70, 120]],
        text: 'A soothing facial treatment and massage to rejuvenate your skin, combined with a relaxing body massage to relieve tension.' },
      { name: 'Radiance Renewal Package', prices: [[90, 180]],
        text: 'A top-to-toe ritual of exfoliation, massage and advanced facial care: an exfoliating body scrub, a full-body massage and a Nutri-Define Luxe Contouring Facial.' },
    ] },
    { key: 'health', title: 'Health & Wellness', img: '../assets/images/marsilea/marsilea-sauna.jpg', items: [
      { name: 'Steam and Sauna', prices: [[10, 60]],
        text: 'A dual ritual of soothing steam and dry heat to purify, invigorate and renew. Warm, aromatic mist softens the skin, clears the senses and releases tension; the sauna\u2019s dry, therapeutic heat stimulates circulation, promotes detoxification and energises the body.' },
    ] },
  ],
  etiquette: [
    ['Arrival', 'We recommend that you check in at the spa reception at least 15 minutes prior to your first scheduled appointment. This allows us to have a discussion with you about your treatment expectations. Please understand that late arrivals will not receive an extension of scheduled treatments.'],
    ['Advance Booking', 'We highly recommend booking your treatment in advance to ensure that your preferred time and service is available. This also applies to group classes.'],
    ['Age Requirement', 'The minimum age requirement for access to the Spa is 15 and Fitness Center is 18. Children under 18 must be accompanied by a responsible adult when in the Spa, Gym, Swimming Pool, Steam & Sauna.'],
    ['Cancellation', 'Please allow 4 hours\u2019 notice of cancellation to avoid a 50% charge, and 100% charge for no shows; for non-hotel guests, a credit card number is required at the time of booking.'],
    ['Cellular Telephone', 'Noise pollution adds to our everyday stress. In order to ensure tranquility and relaxation, we request you to kindly turn off your cell phone.'],
    ['Gratuity', 'The price includes only 10% government tax and 10% service charge. Personal gratuities are at your discretion.'],
    ['Health Conditions', 'Please advise us of any health conditions, allergies, or injuries, which could affect your treatment when making your spa reservation.'],
    ['No Smoking & Alcohol', 'To maintain a serene and healthy environment for all our guests, we kindly ask that you refrain from smoking or consuming alcohol within the spa premises.'],
    ['Pregnancy', 'We have specially designed treatments for expectant mothers. Please allow our reception to guide you in selecting which treatments are most suitable for you during this special time.'],
  ],
};
function marsileaSelected() { S.wellness ||= []; return S.wellness; }
function renderWellness(box) {
  const M = MARSILEA;
  S._spaCat = S._spaCat || null;
  S._spaItem = S._spaItem || null;
  const sel = marsileaSelected();
  const dur = (p) => p.map((x) => '<button type="button" class="opt-ctl' + (sel.indexOf(x[2]) >= 0 ? ' on' : '') + '" data-spa-pick="' + x[2] + '" aria-pressed="' + (sel.indexOf(x[2]) >= 0) + '">' +
    x[1] + ' minutes<span class="opt-p">' + money(x[0]) + '</span></button>').join('');
  box.innerHTML =
    /* Aman wellness composition: inset image -> whitespace -> centered serif
     * title -> centered editorial description -> outlined -> dark action */
    '<div class="am-inset"><img src="' + M.hero + '" alt="Marsilea Spa reception, Souphattra Hotel Vientiane" loading="lazy" decoding="async"/></div>' +
    '<div class="am-center">' +
    '<p class="eyebrow">Wellness</p>' +
    '<h1 class="serif">' + M.name + '</h1>' +
    '<p class="note am-lede">' + esc(M.lede) + '</p>' +
    '<p class="am-fact">' + esc(M.where) + ' · Open ' + esc(M.hours) + '</p>' +
    '<a class="btn-full" href="' + M.maps + '" target="_blank" rel="noopener">View location</a>' +
    '<button type="button" class="btn-full dark" data-spa-jump="treatments">Explore treatments</button>' +
    '</div>' +
    '<section class="am-sec" id="treatments"><p class="cch-label">Treatments</p>' +
    M.categories.map((c) => {
      const open = S._spaCat === c.key;
      return '<div class="tv-row' + (open ? ' open' : '') + '">' +
        '<button type="button" class="tv-head" data-spa-cat="' + c.key + '" aria-expanded="' + open + '">' +
        '<span class="tv-t serif">' + c.title + '</span>' +
        '<span class="tv-m">' + c.items.length + ' treatment' + (c.items.length > 1 ? 's' : '') + '</span>' +
        '<span class="tv-x" aria-hidden="true">' + (open ? '&minus;' : '+') + '</span></button>' +
        (open ? '<div class="tv-body">' +
          '<div class="am-inset sm"><img src="' + c.img + '" alt="' + esc(c.title) + ' at Marsilea Spa" loading="lazy" decoding="async"/></div>' +
          c.items.map((it, ix) => {
            const id = c.key + ':' + ix;
            const oi = S._spaItem === id;
            const priced = it.prices.map((pr) => [pr[0], pr[1], c.key + ':' + ix + ':' + pr[1]]);
            return '<article class="spa-item' + (oi ? ' open' : '') + '">' +
              '<button type="button" class="spa-head" data-spa-item="' + id + '" aria-expanded="' + oi + '">' +
              '<span class="spa-t serif">' + esc(it.name) + '</span>' +
              '<span class="spa-p">' + priced.map((pr) => money(pr[0]) + ' · ' + pr[1] + ' min').join('<br/>') + '</span>' +
              '</button>' +
              (oi ? '<div class="spa-body"><p class="note">' + esc(it.text) + '</p>' +
                '<p class="cch-label" style="margin-top:14px">Choose a duration</p>' +
                '<div class="opt-row">' + dur(priced) + '</div>' +
                '<p class="note am-foot">Marking a treatment records your interest only. Marsilea Spa confirms every appointment directly — nothing here is a booked time.</p></div>' : '') +
              '</article>';
          }).join('') + '</div>' : '') +
        '</div>';
    }).join('') + '</section>' +
    (sel.length ? '<section class="am-sec"><p class="cch-label">Your wellness interest</p>' +
      sel.map((id) => {
        const parts = id.split(':');
        const cat = M.categories.find((c) => c.key === parts[0]);
        const it = cat && cat.items[parseInt(parts[1], 10)];
        if (!it) return '';
        const pr = it.prices.find((x) => String(x[1]) === parts[2]);
        return '<div class="pl-row"><span class="pl-d">' + parts[2] + ' min</span>' +
          '<div class="pl-b"><span class="pl-t serif">' + esc(it.name) + '</span>' +
          '<span class="pl-s">' + esc(cat.title) + ' · ' + (pr ? money(pr[0]) : '') + ' · payable at the spa</span></div>' +
          '<span class="pl-st">YOUR CHOICE</span></div>';
      }).join('') +
      '<p class="note am-foot">Guest Relations passes your interest to Marsilea Spa. Times are confirmed by the spa, not by this page, and spa treatments are not part of your journey costs.</p>' +
      '</section>' : '') +
    '<section class="am-sec"><p class="cch-label">Spa etiquette</p>' +
    M.etiquette.map((e, i) => {
      const open = S._spaEt === i;
      return '<div class="tv-row' + (open ? ' open' : '') + '">' +
        '<button type="button" class="tv-head" data-spa-et="' + i + '" aria-expanded="' + open + '">' +
        '<span class="tv-t serif" style="font-size:19px">' + e[0] + '</span>' +
        '<span class="tv-x" aria-hidden="true">' + (open ? '&minus;' : '+') + '</span></button>' +
        (open ? '<div class="tv-body"><p class="note">' + esc(e[1]) + '</p></div>' : '') +
        '</div>';
    }).join('') +
    '<div class="am-contact"><p class="cch-label">Marsilea Spa</p>' +
    '<p class="note">' + esc(M.where) + '<br/>' + esc(M.address) + '</p>' +
    '<p class="note">Opening hours ' + esc(M.hours) + '<br/>Tel ' + esc(M.tel) + '<br/>' + esc(M.web) + '</p>' +
    '<a class="t-act" href="' + M.maps + '" target="_blank" rel="noopener">Open in maps</a></div>' +
    '</section>';
  box.querySelectorAll('[data-spa-cat]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-spa-cat');
    S._spaCat = (S._spaCat === k) ? null : k; S._spaItem = null; renderStep(cur);
  }));
  box.querySelectorAll('[data-spa-item]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-spa-item');
    S._spaItem = (S._spaItem === k) ? null : k; renderStep(cur);
  }));
  box.querySelectorAll('[data-spa-et]').forEach((b) => b.addEventListener('click', () => {
    const i = parseInt(b.getAttribute('data-spa-et'), 10);
    S._spaEt = (S._spaEt === i) ? null : i; renderStep(cur);
  }));
  box.querySelectorAll('[data-spa-pick]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-spa-pick');
    S.wellness ||= [];
    const at = S.wellness.indexOf(id);
    if (at >= 0) S.wellness.splice(at, 1); else S.wellness.push(id);
    saveDraft(); renderStep(cur);
  }));
  box.querySelectorAll('[data-spa-jump]').forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById('treatments'); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }));
}

function renderVoyage(k, box) {
  const d = SEG_DEF()[k];
  const v = VOY[k];
  const joined = segJoined(k);
  document.getElementById('home-title').textContent = '';
  const sec = S._voySec || 'overview';
  const secBar = '<div class="vy-secbar"><button type="button" id="vy-subnav-open" aria-haspopup="dialog">' +
    v.country + ' &middot; ' + (voySections(k).find((r) => r[0] === sec) || ['', 'Overview'])[1] + '</button></div>';
  if (sec === 'wellness') {
    box.innerHTML = secBar + '<div id="wellness-box"></div>' +
      '<p class="vy-back"><button type="button" class="btn sm ghost" id="vy-back">&larr; ' + v.country + '</button></p>';
    renderWellness(box.querySelector('#wellness-box'));
    box.querySelector('#vy-back').addEventListener('click', () => { S._voySec = null; renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
    box.querySelector('#vy-subnav-open').addEventListener('click', () => setSubnav(true));
    return;
  }
  if (sec === 'stay') { show(idx('stay')); return; }
  if (sec === 'travel') { show(idx('journey')); return; }
  box.innerHTML = secBar +
    (VOY[k].hero ? '<div class="am-inset" style="margin-top:0"><img src="' + VOY[k].hero + '" alt="' + esc(VOY[k].heroAlt || VOY[k].country) + '" loading="lazy" decoding="async"/></div>' : '') +
    '<div class="vy-map" data-voy-map="' + k + '" role="img" aria-label="Route map: ' + v.stops.map((st) => st[2]).join(' to ') + '"></div>' +
    '<div class="vy-intro">' +
    '<p class="eyebrow">Journey ' + v.order + ' · ' + v.country + '</p>' +
    '<h1 class="serif">' + d.name + '</h1>' +
    '<p class="vy-dates">' + d.when + '</p>' +
    '<p class="vy-meta">' + voyMetaLine(k).split(' · ').slice(1).join(' · ') + (joined ? ' · part of your journey' : '') + '</p>' +
    '<p class="note vy-lede">' + v.lede + '</p>' +
    '<button type="button" class="btn-full" data-jump="cost" style="max-width:340px;margin:0 auto">Your plan</button>' +
    '</div>' +
    '<section class="vy-sec" aria-label="Itinerary">' +
    '<p class="cch-label">Itinerary</p>' +
    voyItin(k).map((r) =>
      '<div class="it-row"><span class="it-day">' + r[0] + '</span><span class="it-dest serif">' + r[1] + '</span><span class="it-note">' + r[2] + '</span></div>').join('') +
    '</section>' +
    '<section class="vy-sec" aria-label="Day by day">' +
    '<p class="cch-label">Day by day</p>' +
    '<div class="day-rail">' + voyDays(k).map((dy) => {
      /* WHICH image: the owner's structured library decides, by folder + verified
       * subject. Never a good-looking fallback. Days without a semantically
       * correct approved asset stay image-light on purpose. */
      const img = dy.img || null;
      return '<article class="day-card">' +
        (img ? '<img src="' + img + '" alt="' + esc(dy.title) + '" loading="lazy" decoding="async"/>' : '<div class="ph-quiet" aria-hidden="true"></div>') +
        '<span class="it-day">' + dy.day + '</span>' +
        '<h3 class="serif">' + esc(dy.title) + '</h3>' +
        '<p class="note">' + esc(dy.text) + '</p>' +
        (dy.exp && dy.exp.length ? '<div class="day-exp"><p class="cch-label">Experiences here</p>' + expRailHtml(dy.exp.slice(0, 4)) + '</div>' : '') +
        '</article>';
    }).join('') + '</div>' +
    '</section>' +
    '<section class="vy-sec" aria-label="Your selections">' +
    '<p class="cch-label">Your selections</p>' +
    '<div id="vy-sel"></div>' +
    '</section>' +
    (k === 'vte' ? '<section class="vy-sec" aria-label="Wellness">' +
      '<p class="cch-label">Wellness</p>' +
      '<div class="am-inset"><img src="../assets/images/marsilea/marsilea-treatment-room.jpg" alt="Marsilea Spa treatment room" loading="lazy" decoding="async"/></div>' +
      '<h3 class="serif" style="margin:18px 0 8px;font-weight:200;font-size:25px">Marsilea Spa</h3>' +
      '<p class="note" style="max-width:560px">Ancient Laotian healing traditions and modern spa therapies, on the fifth floor of the Souphattra Hotel Vientiane.</p>' +
      '<button type="button" class="btn-full" data-voysec="wellness">Discover Marsilea Spa</button>' +
      '</section>' : '') +
    '<section class="vy-sec" aria-label="Stay and travel">' +
    '<button type="button" class="btn-full" data-jump="stay">Accommodation &amp; availability</button>' +
    '<button type="button" class="btn-full" data-jump="journey">Travel within this journey</button>' +
    '</section>' +
    '<p class="vy-back"><button type="button" class="btn sm ghost" id="vy-back">&larr; All journeys</button></p>';
  renderSegInto(k, box.querySelector('#vy-sel'));
  box.querySelectorAll('.day-exp').forEach((w) => wireExpRail(w));
  box.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-jump')))));
  box.querySelector('#vy-back').addEventListener('click', () => { S._voy = null; S._voySec = null; renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  box.querySelectorAll('[data-voysec]').forEach((b) => b.addEventListener('click', () => {
    S._voySec = b.getAttribute('data-voysec'); setSubnav(false); renderStep(cur);
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }));
  const sn = box.querySelector('#vy-subnav-open');
  if (sn) sn.addEventListener('click', () => setSubnav(true));
  mountVoyMaps(box);
}
/* ---- Aman contextual sub-navigation: close, centred context title, hairline,
 * Back, large centred rows. Only sections that genuinely exist are listed. ---- */
function voySections(k) {
  const rows = [['overview', 'Overview'], ['itinerary', 'Itinerary'], ['stay', 'Accommodation'], ['experiences', 'Experiences']];
  if (k === 'vte') { rows.push(['wellness', 'Wellness']); rows.push(['wedding', 'Wedding']); }
  rows.push(['travel', 'Travel']);
  return rows;
}
function setSubnav(open) {
  const ov = document.getElementById('subnav');
  const sc = document.getElementById('subnav-scrim');
  if (!ov || !sc) return;
  document.body.classList.toggle('sn-open', open);
  sc.hidden = !open; ov.hidden = !open;
  if (open) { const c = ov.querySelector('.sn-close'); if (c) c.focus(); }
}
function renderSubnav() {
  const ov = document.getElementById('subnav');
  if (!ov) return;
  const k = S._voy;
  if (!k || !VOY[k]) { setSubnav(false); ov.innerHTML = ''; return; }
  const d = SEG_DEF()[k];
  ov.innerHTML =
    '<div class="sn-top"><button type="button" class="sn-close" aria-label="Close">&times;</button></div>' +
    '<p class="sn-ctx">' + VOY[k].country + '</p>' +
    '<hr class="sn-line"/>' +
    '<button type="button" class="sn-back" data-voysec="overview">Back</button>' +
    voySections(k).map(([id, label]) =>
      '<button type="button" class="sn-row" data-voysec="' + id + '"' +
      ((S._voySec || 'overview') === id ? ' aria-current="true"' : '') + '>' + label + '</button>').join('');
  ov.querySelector('.sn-close').addEventListener('click', () => setSubnav(false));
  ov.querySelectorAll('[data-voysec]').forEach((b) => b.addEventListener('click', () => {
    S._voySec = b.getAttribute('data-voysec'); setSubnav(false); renderStep(cur);
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }));
  const sc = document.getElementById('subnav-scrim');
  if (sc && !sc.dataset.wired) {
    sc.dataset.wired = '1';
    sc.addEventListener('click', () => setSubnav(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('sn-open')) setSubnav(false);
    });
  }
}

function grCardHtml() {
  return '<div class="gr-card">' +
    '<div><div class="label">Guest Relations</div>' +
    '<div class="gr-name">' + esc(CONTACTS.team) + '</div>' +
    '<div class="gr-links">' +
    '<a href="mailto:' + CONTACTS.email + '">Email</a>' +
    (CONTACTS.whatsapp ? '<a href="https://wa.me/' + CONTACTS.whatsapp + '" rel="noopener" target="_blank">WhatsApp</a>' : '') +
    '</div>' +
    '</div>' +
    '<div class="gr-qr">' +
    '<img src="../assets/images/qr/line-qr-official.png" alt="Scan to add Guest Relations on LINE" width="108" height="108" loading="lazy"/>' +
    '<div class="label">Scan for LINE</div></div>' +
    '<div class="gr-qr">' +
    '<img src="../assets/images/qr/whatsapp-qr-official.png" alt="Scan to reach Guest Relations on WhatsApp" width="108" height="108" loading="lazy"/>' +
    '<div class="label">Scan for WhatsApp</div></div>' +
    '</div>';
}

function renderHome() {
  const box = document.getElementById('home-box');
  if (!S.invitation) { show(idx('find')); return; }
  if (S._dest) { renderDestination(S._dest, box); return; }
  if (S._voy && VOY[S._voy]) { renderVoyage(S._voy, box); return; }
  const lead = S.invitation.guests.find((g) => g.guestId === S.invitation.partyLead) || S.invitation.guests[0];
  document.getElementById('home-title').innerHTML =
    'Welcome' + (S._returning ? ' back' : '') + ',<br/>' + esc(lead.preferredName) + '.';
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const riders = S.guests.filter((g) => g.journey.train);
  const detailsMissing = S.guests.filter((g) => g.attending !== false && !(g.email || g.phone)).length;
  const total = (function(){ const G = laosGate(acc, riders.length, S.transfers); return journeyTotal(G.acc, occ, TRAIN, G.riders, TRANSFERS, G.transfers) + laosExtraTotal(G.acc, occ); })() + pwTotal() + bkkTotal() + cnStaysTotal() + almsTotal() + trainCabinUpcharge() + extrasTotal() + preWedTotal() + kempinskiTotal();
  /* Aman voyage index: three journey products, each MAP -> eyebrow -> title ->
   * dates -> duration/stops -> actions. */
  const prod = (k) => {
    const d = SEG_DEF()[k];
    const v = VOY[k];
    const joined = segJoined(k);
    return '<article class="vyp">' +
      '<div class="vyp-map" data-voy-map="' + k + '" data-voy-mini role="img" aria-label="Route map: ' + v.stops.map((st) => st[2]).join(' to ') + '"></div>' +
      '<p class="eyebrow">Journey ' + v.order + ' · ' + v.country + '</p>' +
      '<h2 class="serif">' + d.name + '</h2>' +
      '<p class="vy-meta">' + d.when + ' · ' + v.stops.length + ' stops' + (k === 'vte' ? ' · the wedding' : '') + '</p>' +
      '<p class="note" style="max-width:560px">' + v.lede + '</p>' +
      '<button type="button" class="btn-full' + (k === 'vte' ? ' dark' : '') + '" data-voy-open="' + k + '">View details</button>' +
      '<p class="vy-meta" style="margin:12px 0 0">' + (joined ? 'Part of your journey' : 'Not this time — open to change') + '</p>' +
      '</article>';
  };
  box.innerHTML =
    '<p class="note" style="margin:0 0 4px">' + esc(S.invitation.partyName) + '</p>' +
    '<p class="note" style="margin:0 0 30px">One invitation, three journeys. The wedding carries the middle one.</p>' +
    /* Featured journeys — Aman rail: image-led tiles, controlled peeking,
     * quiet metadata, serif titles, horizontal interaction. */
    '<section class="am-sec" style="margin-top:26px" data-rail><p class="cch-label">Featured journeys</p>' +
    '<div class="day-rail">' + ['bkk', 'vte', 'china'].map((kk) => {
      const dd = SEG_DEF()[kk]; const vv = VOY[kk];
      return '<article class="day-card feat" data-voy-open="' + kk + '" role="button" tabindex="0">' +
        (vv.hero ? '<img src="' + vv.hero + '" alt="' + esc(vv.heroAlt || vv.country) + '" loading="lazy" decoding="async"/>' : '<div class="ph-quiet" aria-hidden="true"></div>') +
        '<span class="it-day">Journey ' + vv.order + ' · ' + vv.country + '</span>' +
        '<h3 class="serif">' + dd.name + '</h3>' +
        '<p class="note">' + dd.when + ' · ' + vv.stops.length + ' stops</p>' +
        '<span class="t-act">View journey</span>' +
        '</article>';
    }).join('') + '</div></section>' +
    '<section class="am-sec"><p class="cch-label">Destinations</p>' +
    '<p class="note" style="max-width:560px;margin-bottom:10px">Bangkok, Vientiane, Kunming and Lijiang — the four places this invitation moves through.</p>' +
    '<button type="button" class="btn-full" id="open-destnav">All destinations</button></section>' +
    prod('bkk') + prod('vte') + prod('china') +
    '<div style="margin-top:26px">' +
    '<button type="button" class="jd-row" data-jump="cost"><span class="jr-l">Your Plan</span><span class="jr-v">Your personal itinerary</span></button>' +
    '<button type="button" class="jd-row" data-jump="each"><span class="jr-l">My Details</span><span class="jr-v">' + (detailsMissing ? detailsMissing + ' still needed' : 'Complete') + '</span></button>' +
    '<button type="button" class="jd-row" data-jump="review" style="border-bottom:1px solid var(--line)"><span class="jr-l">' + (S.submitted ? 'Registration' : 'Review & Send') + '</span><span class="jr-v">' + (S.submitted ? 'With Guest Relations' : 'One quiet look, then send') + '</span></button>' +
    '</div>' +
    '<div class="jd-total"><span class="jr-l">Total Costs</span><strong>' + money(total) + '</strong></div>' +
    grCardHtml();
  box.querySelectorAll('[data-voy-open]').forEach((b) => {
    const open = () => { S._voy = b.getAttribute('data-voy-open'); S._dest = null; renderStep(cur); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); };
    b.addEventListener('click', open);
    if (b.getAttribute('role') === 'button') b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  const dn = box.querySelector('#open-destnav');
  if (dn) dn.addEventListener('click', () => setDestnav(true));
  box.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-jump')))));
  mountVoyMaps(box);
}

/* ---------------- step 2 · party link (§10) ---------------- */
function renderParty() {
  const box = document.getElementById('party-box');
  if (!S.invitation) { show(idx('find')); return; }
  const lead = S.invitation.partyLead;
  box.innerHTML =
    '<div class="party-frame" role="group" aria-label="Your invitation">' +
    S.invitation.guests.map((g, i) =>
      '<div class="party-tile" style="animation-delay:' + (reduced ? 0 : i * 0.35) + 's">' +
      '<span class="party-init serif">' + esc(g.preferredName.slice(0, 1)) + '</span>' +
      '<span class="party-name">' + esc(g.fullName) + '</span>' +
      (g.guestId === lead ? '<span class="party-lead">Lead guest</span>' : '') +
      '</div>').join('<span class="party-tie" aria-hidden="true"></span>') +
    '</div>' +
    '<p class="party-line serif-it">You belong to this invitation together.</p>' +
    (S.invitation.unresolvedMapping
      ? '<p class="note">Part of your invitation is still being prepared by Guest Relations; anyone missing here will be added once confirmed.</p>' : '');
  announce(S.invitation.partyName + ': ' + S.invitation.guests.map((g) => g.fullName).join(' and ') + ' — linked to one invitation.');
}
document.getElementById('addl-btn').addEventListener('click', () => {
  document.getElementById('addl-wrap').classList.toggle('show');
});
document.getElementById('addl-input').addEventListener('input', (e) => { S.additionalGuestRequest = e.target.value.trim(); saveDraft(); });

/* ---------------- step 3 · journey (§13, §14) ---------------- */

/* §Travel-choice: ONE journey decision, TWO alternatives, ONE selection.
 * The overnight train and an independent arrival answer the same question —
 * they are never two separate yes/no questionnaires. Same stored fields
 * (journey.train / journey.independent), strictly mutually exclusive. */

/* Verified real-world coordinates for the journey cities (never by eye). */
const CITY_LL = {
  Bangkok: [13.7563, 100.5018],
  'Nong Khai': [17.8783, 102.7413],
  Vientiane: [17.9757, 102.6331],
  Kunming: [24.8801, 102.8329],
  Lijiang: [26.8550, 100.2278],
};
/** The guest's own stops, derived from the SAME stored selections MY TRAVEL
 *  uses — never a second source of truth. */
let GMAP = null;
/** Real-basemap guest map (OpenStreetMap data via CARTO light tiles). */
/* The real map when the library is available; the schematic SVG only as an
 * offline fallback (standalone build). */

/* §2-3 · the Bangkok stay: curated choice, guest chosen dates, quiet pending
 * contribution — never an invented price. */

/* §10-16 · the optional Post Wedding Journey: a real opt in whose components
 * flow into travel, contribution and review. Missing operational data renders
 * as a quiet pending state, never as an invention. */
/* Animated schematic journey ticket (v1.0 §16): the route line draws once on
 * viewport entry, a restrained vehicle glyph follows; honest schematic, no
 * fake live tracking. prefers-reduced-motion renders the completed state. */
const HSLOCK = '<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>';


/* ---------------- step 4 · events ---------------- */

/** Party-level module picker with per-guest split (“WE HAVE DIFFERENT PLANS”). */

/* ---------------- shared room presentation (one model, every surface) ------
 * The same fields render the public accommodation section (generated by
 * src/build-rooms.cjs from this very model), the selection cards here, the
 * review page and the confirmed journey. No second room description exists. */
const roomImg = (p) => '../' + p;
function roomFigure(a, avstat) {
  const imgs = a.images || [];
  if (!imgs.length) {
    return a.imageSlots
      ? '<div class="acc-slots">' + a.imageSlots.map((s) => '<span class="acc-slot">' + esc(s) + '</span>').join('') + '</div>'
      : '';
  }
  return '<div class="acc-gal"><div class="acc-track" tabindex="0" role="group" data-view="' + a.id +
    '" aria-label="' + esc(a.name) + ' photos — swipe, or press Enter for the room details">' +
    imgs.map((s, i) => '<img src="' + roomImg(s) + '" alt="' + esc(a.name) + ' · photo ' + (i + 1) + '" width="1600" height="1067" loading="lazy" decoding="async" draggable="false"/>').join('') +
    '</div>' +
    (imgs.length > 1 ? '<span class="acc-gcount">1 / ' + imgs.length + '</span>' : '') +
    (avstat ? '<span class="acc-avstat" role="status">' + esc(avstat) + '</span>' : '') +
    '</div>';
}
/** The compact first glance: availability plus the few facts that decide a
 *  room. Everything else waits behind View details. */

/* ---------------- step 5 · stay (§18–§23) ---------------- */
let openId = null;   // only the room the guest actively opens shows its detail
let CMP = [];        // rooms picked for the side by side comparison
/* ---- Aman accommodation composition: large image -> light editorial panel ->
 * serif title -> description -> facts -> availability -> selection action.
 * Inventory, eligibility, availability and pricing logic are unchanged. ---- */
function amStayHtml(o) {
  return '<article class="am-stay' + (o.selected ? ' sel' : '') + '"' + (o.accId ? ' data-acc="' + o.accId + '"' : '') + '>' +
    (o.images && o.images.length
      ? '<div class="am-gal"><div class="am-track" tabindex="0" role="group" data-view="' + (o.accId || '') + '" aria-label="' + esc(o.title) + ' photographs">' +
        o.images.map((im, i) => '<img src="' + roomImg(im) + '" alt="' + esc(o.title) + ' · photograph ' + (i + 1) + '" width="1600" height="1067" loading="lazy" decoding="async" draggable="false"/>').join('') +
        '</div>' + (o.images.length > 1 ? '<span class="am-gcount">1 / ' + o.images.length + '</span>' : '') + '</div>'
      : '<div class="am-ph" aria-hidden="true"></div>') +
    '<div class="am-panel">' +
    '<p class="eyebrow">' + esc(o.eyebrow) + '</p>' +
    '<h3 class="serif">' + esc(o.title) + '</h3>' +
    (o.blurb ? '<p class="note am-blurb">' + esc(o.blurb) + '</p>' : '') +
    (o.facts && o.facts.length ? '<dl class="am-facts">' + o.facts.filter((f) => f[1]).map((f) =>
      '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' : '') +
    (o.avail ? '<p class="am-avail">' + esc(o.avail) + '</p>' : '') +
    (o.price ? '<p class="am-price">' + o.price + '</p>' : '') +
    (o.action || '') +
    (o.foot ? '<p class="note am-foot">' + o.foot + '</p>' : '') +
    '</div></article>';
}
function renderStay() {
  const box = document.getElementById('stay-box');
  if (!box) return;
  const sc = S.scope || {};
  let html = '<p class="note" style="max-width:560px;margin-bottom:8px">Where you sleep on every journey you are part of. Everything shown here follows your real allocation.</p>';

  /* --- JOURNEY 01 · THAILAND --- */
  if (sc.bangkok) {
    const b = BANGKOK_STAY;
    const active = bangkokStayActive();
    html += '<section class="am-sec"><p class="cch-label">Journey 01 · Thailand</p><h2 class="serif">Bangkok</h2>' +
      amStayHtml({
        eyebrow: 'Before the wedding · Bangkok',
        title: (BANGKOK_STAYS[0] && BANGKOK_STAYS[0].name) || 'The Bangkok Stay',
        images: (BANGKOK_STAYS[0] && BANGKOK_STAYS[0].images) || [],
        blurb: 'The shared city days before the journey turns north — one address for everyone, walking distance to the river.',
        facts: [['Dates', (BANGKOK_STAYS[0] && BANGKOK_STAYS[0].dates) || b.window],
                ['Nights', String(bkkNights())],
                ['Guests', String(bkkTravellers())]],
        avail: active ? 'BOOKED · your Bangkok stay' : 'YOUR CHOICE · open',
        price: money(b.ratePerGuestNight) + ' <span class="am-per">per guest, per night</span>' +
               (active ? ' · <strong>' + money(bkkTotal()) + '</strong> total' : ''),
        action: '<button type="button" class="btn-full" data-stay-jump="journey">' + (active ? 'Change this stay' : 'Select this stay') + '</button>',
      }) + '</section>';
  }

  /* --- JOURNEY 02 · LAOS (the wedding stay) --- */
  {
    html += '<section class="am-sec"><p class="cch-label">Journey 02 · Laos</p><h2 class="serif">Vientiane · your wedding stay</h2>' +
      (sc.laos === false ? '<p class="note" style="max-width:560px;margin-bottom:10px">Laos is currently not part of your journey. Choosing a stay here adds it back.</p>' : '') +
      '<p class="note" style="max-width:560px">' + esc(COPY.priceNote) + ' Haruthai\u00A0&\u00A0Suthep.</p>';
    html += ACCOMMODATIONS.map((a) => {
      const bookable = a.selectable !== false;
      const res = bookable ? inventory[a.id] : null;
      const full = bookable ? remaining(res) <= 0 : false;
      const selected = S.stay.accommodationId === a.id;
      const avail = !bookable ? (a.reservedFor || 'RESERVED')
        : selected ? 'BOOKED · your current room'
        : a.kind === 'airbnb' ? 'HOSTED · limited availability, coordinated by Guest Relations'
        : full ? 'OPEN · waitlist, Guest Relations will confirm'
        : 'YOUR CHOICE · ' + guestAvailability(res);
      const price = !bookable ? '<span class="am-per">Reserved</span>'
        : a.contributionPerGuest == null ? '<span class="am-per">Complimentary · limited availability</span>'
        : showAmount(contributionPerGuest(a)) + ' <span class="am-per">per guest, your costs</span>';
      const action = !bookable ? ''
        : full ? '<button type="button" class="btn-full" data-waitlist="' + a.id + '">Join the waitlist</button>'
        : '<button type="button" class="btn-full' + (selected ? ' dark' : '') + '" data-select="' + a.id + '">' + (selected ? 'BOOKED' : 'Select this stay') + '</button>';
      return amStayHtml({
        accId: a.id, selected: selected, images: a.images || [],
        eyebrow: (a.property || 'Vientiane') + ' · ' + esc(a.stay),
        title: a.name, blurb: a.blurb,
        facts: [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy], ['Nights', String(a.nights)]],
        avail: avail, price: price, action: action,
        foot: (bookable && a.kind !== 'airbnb' && a.contributionPerGuest != null)
          ? 'First night · your costs. Second night · hosted by <span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>. Breakfast included.' : '',
      });
    }).join('');
    html += '<div class="am-req">' +
      '<div class="field"><label for="stay-bed">Bed preference</label><select id="stay-bed"><option' + (S.stay.bed === '' ? ' selected' : '') + '>No preference</option><option' + (S.stay.bed === 'One large bed' ? ' selected' : '') + '>One large bed</option><option' + (S.stay.bed === 'Two beds' ? ' selected' : '') + '>Two beds</option></select></div>' +
      '<div class="field"><label for="stay-req">Special request</label><textarea id="stay-req" rows="2">' + esc(S.stay.request) + '</textarea></div>' +
      '</div><div id="stay-selected"></div></section>';
  }

  /* --- JOURNEY 03 · CHINA --- */
  if (sc.china) {
    const cn = POST_WEDDING.filter((c) => c.type === 'Stay');
    html += '<section class="am-sec"><p class="cch-label">Journey 03 · China</p><h2 class="serif">Kunming &amp; Lijiang</h2>' +
      cn.map((c) => {
        const key = /kunming/i.test(c.label + ' ' + (c.city || '')) || /kunming/i.test(c.id) ? 'kunming' : 'lijiang';
        const on = S.china && S.china[key] === 'with';
        return amStayHtml({
          eyebrow: (key === 'kunming' ? 'Kunming' : 'Lijiang') + ' · ' + esc(c.date),
          title: c.label, images: c.images || [],
          blurb: c.sub || '',
          facts: [['Dates', c.date], ['Nights', c.nightsCount ? String(c.nightsCount) : ''], ['Guests', String(attendingCount())]],
          avail: on ? 'BOOKED · arranged for you' : 'YOUR CHOICE · open',
          price: c.ratePerGuestNight ? money(c.ratePerGuestNight) + ' <span class="am-per">per guest, per night</span>' : '',
          action: '<button type="button" class="btn-full" data-stay-jump="journey">' + (on ? 'Change this stay' : 'Select this stay') + '</button>',
        });
      }).join('') + '</section>';
  }

  box.innerHTML = html + '<p class="note am-foot" style="margin-top:28px">' + esc(COPY.requestNote) + ' ' + esc(COPY.payment) + '</p>';

  box.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => {
    S.stay.accommodationId = b.getAttribute('data-select');
    S.stay.rooms = 1;
    S.stay.waitlist = false;
    S.scope ||= { bangkok: false, laos: true, china: false };
    S.scope.laos = true; // choosing the wedding stay adds Laos back, as promised

    S.stay.occupantGuestIds = S.guests.filter((g) => g.attending !== false).map((g) => g.guestId);
    saveDraft(); renderStay(); renderSummary();
    const acc = currentAcc();
    const occ = S.stay.occupantGuestIds;
    justAdded('The Wedding · ' + acc.name, '27 FEB – 01 MAR 2027 · ' + occ.length + ' guest' + (occ.length > 1 ? 's' : ''),
      acc.contributionPerGuest == null ? 'HOSTED · limited availability' : money(contributionPerGuest(acc) * laosPaidNights()) + ' per person');
    announce('BOOKED · ' + acc.name + ' for you. ' + (acc.contributionPerGuest == null
      ? 'This stay is complimentary and limited; Guest Relations coordinates it personally. '
      : occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ', ' + money(contributionPerGuest(acc)) + ' per guest, total costs ' + money(partyTotal(acc, occ)) + '. ') + COPY.requestNote);
  }));
  box.querySelectorAll('[data-waitlist]').forEach((b) => b.addEventListener('click', () => {
    S.stay.accommodationId = b.getAttribute('data-waitlist'); S.stay.waitlist = true;
    saveDraft(); renderStay(); renderSummary();
  }));
  box.querySelectorAll('[data-stay-jump]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-stay-jump')))));
  wireAmGalleries(box);
  renderStaySelected();
  const bed = box.querySelector('#stay-bed');
  if (bed) bed.addEventListener('change', () => { S.stay.bed = bed.value === 'No preference' ? '' : bed.value; saveDraft(); });
  const req = box.querySelector('#stay-req');
  if (req) req.addEventListener('input', (e) => { S.stay.request = e.target.value; saveDraft(); });
}
/* horizontal photograph track: swipe/drag/keys, tap opens the full gallery */
function wireAmGalleries(box) {
  box.querySelectorAll('.am-gal').forEach((gal) => {
    const track = gal.querySelector('.am-track');
    const count = gal.querySelector('.am-gcount');
    const n = track.querySelectorAll('img').length;
    const pos = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = (d) => track.scrollTo({ left: (pos() + d) * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    track.addEventListener('scroll', () => { if (count) count.textContent = (Math.min(pos(), n - 1) + 1) + ' / ' + n; }, { passive: true });
    let down = null, moved = false;
    const id = track.getAttribute('data-view');
    const openDetails = () => { if (id) openAccOverlay(id); };
    track.addEventListener('click', () => { if (moved) { moved = false; return; } openDetails(); });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(); }
    });
    track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { down = { x: e.clientX, s: track.scrollLeft }; track.classList.add('drag'); } });
    addEventListener('pointermove', (e) => { if (down) { if (Math.abs(e.clientX - down.x) > 4) moved = true; track.scrollLeft = down.s - (e.clientX - down.x); } });
    addEventListener('pointerup', () => { if (down) { down = null; track.classList.remove('drag'); track.scrollTo({ left: pos() * track.clientWidth, behavior: 'smooth' }); } });
  });
}

/** Side by side comparison of the rooms the guest ticked — the deciding
 *  figures only, scrollable on a phone. */

/** Selected-room financial confirmation (one calculation path: logic.mjs). */
function renderStaySelected() {
  const el = document.getElementById('stay-selected');
  if (!el) return;
  const acc = currentAcc();
  if (!acc) { el.innerHTML = ''; return; }
  const occ = S.stay.occupantGuestIds;
  const neutral = acc.contributionPerGuest == null;
  const row = (l, r) => '<div class="am-sumrow"><span class="l">' + l + '</span><span class="r">' + r + '</span></div>';
  el.innerHTML = '<div class="am-sum" aria-live="polite">' +
    '<p class="cch-label">Your wedding stay</p>' +
    row('Room', esc(acc.name) + (S.stay.waitlist ? ' · WAITLIST' : '')) +
    (neutral
      ? row(occ.length + ' guest' + (occ.length > 1 ? 's' : ''), 'HOSTED · coordinated by Guest Relations')
      : row(occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ' · ' + money(contributionPerGuest(acc)) + ' per guest', 'YOUR COSTS') +
        row('Second night', 'HOSTED by <span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>') +
        '<div class="am-sumrow total"><span class="l">Total Costs</span><span class="r">' + money(partyTotal(acc, occ)) + '</span></div>') +
    '</div>';
}

/* ---------------- room gallery lightbox (prev/next/count/close/keys) ------ */
const lightbox = document.getElementById('lightbox');
const LB = { images: [], index: 0, name: '', trigger: null };
const lbDots = lightbox && lightbox.querySelector('.lb-dots');
const lbPrev = lightbox && lightbox.querySelector('.lb-prev');
const lbNext = lightbox && lightbox.querySelector('.lb-next');
function lbBuildDots() {
  if (!lbDots) return;
  const multi = LB.images.length > 1;
  lbDots.hidden = !multi;
  if (lbPrev) lbPrev.hidden = !multi;
  if (lbNext) lbNext.hidden = !multi;
  lbDots.innerHTML = multi ? LB.images.map((_, i) =>
    '<button type="button" class="lb-dot" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '"></button>').join('') : '';
  if (multi) lbDots.querySelectorAll('.lb-dot').forEach((d) =>
    d.addEventListener('click', () => { LB.index = parseInt(d.getAttribute('data-i'), 10) || 0; lbRender(); }));
}
function lbRender() {
  lightbox.querySelector('.lb-img').src = roomImg(LB.images[LB.index]);
  lightbox.querySelector('.lb-img').alt = LB.name + ' · photo ' + (LB.index + 1);
  lightbox.querySelector('.lb-count').textContent = (LB.index + 1) + ' / ' + LB.images.length;
  if (lbDots) lbDots.querySelectorAll('.lb-dot').forEach((d, i) =>
    d.setAttribute('aria-current', i === LB.index ? 'true' : 'false'));
}
function openLightbox(a, index) {
  if (!lightbox || !(a.images || []).length) return; // invariant: never open without images
  LB.images = a.images; LB.index = index || 0; LB.name = a.name;
  LB.trigger = document.activeElement;
  lbBuildDots();
  lbRender();
  lightbox.hidden = false; lightbox.removeAttribute('inert');
  document.body.classList.add('pv-lock');
  lightbox.querySelector('.lb-close').focus();
}
function closeLightbox() {
  lightbox.hidden = true; lightbox.setAttribute('inert', '');
  if (!accOverlay.hidden) { /* overlay still open keeps the scroll lock */ } else { document.body.classList.remove('pv-lock'); }
  if (LB.trigger) LB.trigger.focus();
}
function lbStep(d) { if (!LB.images.length) { closeLightbox(); return; } LB.index = (LB.index + d + LB.images.length) % LB.images.length; lbRender(); }
if (lightbox) {
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  if (lbPrev) lbPrev.addEventListener('click', () => lbStep(-1));
  if (lbNext) lbNext.addEventListener('click', () => lbStep(1));
  let lbTouchX = null;
  lightbox.addEventListener('touchstart', (e) => { lbTouchX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX; lbTouchX = null;
    if (Math.abs(dx) > 40) lbStep(dx < 0 ? 1 : -1);
  }, { passive: true });
  addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  }, true);
}

/* room detail overlay (§22) */
const accOverlay = document.getElementById('acc-overlay');
let accTrigger = null;
function openAccOverlay(id) {
  const a = ACCOMMODATIONS.find((x) => x.id === id);
  const res = inventory[id];
  accTrigger = document.activeElement;
  const bookable = a.selectable !== false;
  accOverlay.querySelector('.pv-body').innerHTML =
    '<div class="pv-tag">' + esc(a.property) + '</div>' +
    '<h3>' + esc(a.name) + '</h3>' +
    (a.badge ? '<p class="note" style="color:var(--cherry)">' + esc(a.badge) + '</p>' : '') +
    (!bookable ? '<p class="note" style="color:var(--cherry)">' + esc(a.reservedNote) + '</p>' : '') +
    '<p>' + esc(a.blurb) + '</p>' +
    (a.referenceUrl ? '<p class="note"><a href="' + a.referenceUrl + '" rel="noopener" target="_blank">View the residence on Airbnb</a> · reference link. Guest Relations coordinates this stay with you personally.</p>' : '') +
    '<div class="pv-gallery">' + (a.images || []).map((src, i) =>
      '<button type="button" class="pv-gimg" data-lightbox="' + a.id + '" data-index="' + i + '">' +
      '<img src="' + roomImg(src) + '" alt="' + esc(a.name) + ' · view ' + (i + 1) +
      '" width="1200" height="800" loading="lazy" decoding="async"/></button>').join('') + '</div>' +
    '<dl class="pv-facts">' +
    '<div><dt>Stay</dt><dd>' + esc(a.stay) + ' · ' + a.nights + ' nights</dd></div>' +
    (a.kind !== 'airbnb' ? '<div><dt>Breakfast</dt><dd>Included</dd></div>' : '') +
    (a.size ? '<div><dt>Size</dt><dd>' + esc(a.size) + '</dd></div>' : '') +
    (a.bed ? '<div><dt>Bed</dt><dd>' + esc(a.bed) + '</dd></div>' : '') +
    (a.occupancy ? '<div><dt>Guests</dt><dd>' + esc(a.occupancy) + '</dd></div>' : '') +
    (a.location ? '<div><dt>Where</dt><dd>' + esc(a.location) + '</dd></div>' : '') +
    (bookable
      ? '<div><dt>Your costs</dt><dd>' + (a.contributionPerGuest == null ? 'Complimentary · personally coordinated' : showAmount(contributionPerGuest(a)) + ' · your costs per guest') + '</dd></div>' +
        '<div><dt>Availability</dt><dd>' + esc(a.kind === 'airbnb' ? 'Limited availability · personally coordinated by Guest Relations' : guestAvailability(res)) + '</dd></div>' +
        '<div><dt>Selection</dt><dd>One ' + esc(a.capacityUnit === 'Party allocation' ? 'residence' : a.capacityUnit.toLowerCase()) + ' per invitation</dd></div>'
      : '') +
    '</dl>' +
    ((a.amenities || []).length
      ? '<div class="label" style="margin-top:26px">In the room</div><ul class="incl">' +
        a.amenities.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>'
      : '') +
    '<div class="label" style="margin-top:26px">Your wedding experience includes</div>' +
    '<ul class="incl">' + PACKAGE_INCLUSIONS.map((i) => '<li>' + esc(i.label) + '</li>').join('') + '</ul>' +
    '<p class="note">' + esc(COPY.requestNote) + '</p>';
  accOverlay.querySelectorAll('[data-lightbox]').forEach((b) => b.addEventListener('click', () =>
    openLightbox(a, parseInt(b.getAttribute('data-index'), 10) || 0)));
  accOverlay.hidden = false; accOverlay.removeAttribute('inert');
  document.getElementById('acc-backdrop').hidden = false;
  document.body.classList.add('pv-lock');
  accOverlay.querySelector('.pv-close').focus();
}
function closeAccOverlay() {
  accOverlay.hidden = true; accOverlay.setAttribute('inert', '');
  document.getElementById('acc-backdrop').hidden = true;
  document.body.classList.remove('pv-lock');
  if (accTrigger) accTrigger.focus();
}
accOverlay.querySelector('.pv-close').addEventListener('click', closeAccOverlay);
document.getElementById('acc-backdrop').addEventListener('click', closeAccOverlay);
(function () {
  const c = document.getElementById('exp-ov-close');
  if (c) c.addEventListener('click', closeExpOverlay);
  const bd = document.getElementById('exp-backdrop');
  if (bd) bd.addEventListener('click', closeExpOverlay);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExpOverlay(); });
})();
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !accOverlay.hidden) closeAccOverlay();
  if (!accOverlay.hidden && e.key === 'Tab') {
    const f = accOverlay.querySelectorAll('button, a[href]');
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------------- step 6 · arrival & transfers (§15) ---------------- */
/* ---------------- transfer products (Owner price master) ----------------
 * FULL SERVICE (owner §13-18): the guest sees service, route, inclusions and
 * price, then simply adds it. No operational questionnaire — Guest Relations
 * completes timing/flight details personally from the Journey context. */


/* ---------------- step 8 · each of you (§17) ---------------- */
function renderEach() {
  const box = document.getElementById('each-box');
  box.innerHTML = S.guests.map((g, i) =>
    '<details class="dt-fold"' + (i === 0 ? ' open' : '') + '><summary><span class="dt-n">' + pad(i + 1) + '</span>' +
    '<span class="dt-name">' + esc(g.fullName) + '</span><span class="dt-x" aria-hidden="true">+</span></summary>' +
    '<div class="dt-body">' +
    '<div class="gf-media"><div class="gf-photo">' +
    '<div class="label">Profile photo · optional</div>' +
    '<div class="gf-pmrow">' + (g.photo ? '<img class="gf-pimg" src="' + g.photo + '" alt="Profile photo of ' + esc(g.preferredName) + '"/>' : '<span class="gf-pimg gf-ph">' + esc(g.preferredName.slice(0, 1)) + '</span>') +
    '<span><button type="button" class="btn ghost sm" data-photo="' + g.guestId + '">' + (g.photo ? 'Replace photo' : 'Upload photo') + '</button>' +
    (g.photo ? ' <button type="button" class="btn ghost sm" data-photo-rm="' + g.guestId + '">Remove</button>' : '') + '</span></div>' +
    '<input type="file" accept="image/*" hidden data-photo-input="' + g.guestId + '"/></div>' +
    '<div class="gf-passport"><div class="label">Passport · identity page</div>' +
    (g.passport
      ? '<p class="note">' + esc(g.passport.name) + ' · selected</p><p class="note gold-note">Held on this device only — the secure transfer to Guest Relations activates with the private document vault.</p><button type="button" class="btn ghost sm" data-pass-rm="' + g.guestId + '">Remove</button>'
      : '<p class="note">One photo or scan of the passport identity page is all we need. Used only where required for travel arrangements coordinated by Guest Relations.</p><button type="button" class="btn ghost sm" data-pass="' + g.guestId + '">Select passport file</button>') +
    '<input type="file" accept="image/*,.pdf" hidden data-pass-input="' + g.guestId + '"/></div></div>' +
    '<div class="cols2">' +
    ef(g, 'email', 'Email', 'email') +
    '<div class="field"><label>Phone number \u00B7 with country code</label><input type="tel" inputmode="tel" autocomplete="tel" placeholder="+49 160 1234567" data-ef="phone" value="' + esc(g.phone || '') + '"/></div>' +
    '</div>' +
    '<div class="cols2">' +
    '<div class="field"><label>Date of birth</label><input type="date" autocomplete="bday" data-ef="dob" value="' + esc(g.dob || '') + '"/></div>' +
    '</div>' +
    '<div class="label" style="margin:26px 0 2px">Food, dietary &amp; allergies</div>' +
    '<div class="cols2">' +
    '<div class="field"><label>Dietary preference</label><select data-ef="diet">' + ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten free', 'Lactose free', 'Other'].map((o) => '<option' + (g.diet === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Any food allergies?</label><div class="join">' +
    '<label><input type="radio" name="alg-' + g.guestId + '" value="yes"' + (g.allergy === 'yes' ? ' checked' : '') + '/><span class="yes">Yes</span></label>' +
    '<label><input type="radio" name="alg-' + g.guestId + '" value="no"' + (g.allergy !== 'yes' ? ' checked' : '') + '/><span class="no">No</span></label></div></div>' +
    '</div>' +
    '<div class="cond' + (g.allergy === 'yes' ? ' show' : '') + '" data-alg><div class="field"><label>Exactly what should the kitchens know?</label><textarea data-ef="allergyDetail">' + esc(g.allergyDetail) + '</textarea></div></div>' +
    '<div class="label" style="margin:26px 0 6px">A little about you</div>' +
    '<div class="cols2">' +
    ef(g, 'favFood', 'What\u2019s your favourite food?') + ef(g, 'favDrink', 'What\u2019s your favourite drink?') +
    ef(g, 'coffeeHow', 'How do you like your coffee?') + ef(g, 'teaLove', 'What tea do you love?') +
    ef(g, 'favSnack', 'What\u2019s your favourite snack?') + ef(g, 'favColour', 'What\u2019s your favourite colour?') +
    ef(g, 'favFlower', 'What flowers do you love?') + ef(g, 'bookLove', 'What\u2019s a book you love?') +
    ef(g, 'favFilm', 'What\u2019s a film you love?') + ef(g, 'favSong', 'What\u2019s a song you never skip?') +
    '</div>' +
    '<div class="field q-deep"><label>What always makes you feel at home?</label><textarea data-ef="feelAtHome">' + esc(g.feelAtHome) + '</textarea></div>' +
    '<div class="field q-deep"><label>After a long day, what do you love to find waiting for you?</label><textarea data-ef="longDayWaiting">' + esc(g.longDayWaiting) + '</textarea></div>' +
    '<p class="note">These little preferences help Guest Relations shape quiet surprises. Nothing is ever displayed back.</p>' +
    '</div></details>').join('');
  box.querySelectorAll('.guest-fold').forEach((block, i) => {
    const g = S.guests[i];
    block.querySelectorAll('[data-ef]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      g[el.getAttribute('data-ef')] = el.value; saveDraft();
    }));
    block.querySelectorAll('input[name^="alg-"]').forEach((el) => el.addEventListener('change', () => {
      g.allergy = el.value === 'yes' && el.checked ? 'yes' : 'no';
      block.querySelector('[data-alg]').classList.toggle('show', g.allergy === 'yes');
      saveDraft();
    }));
  });
  // profile photo: downscaled, stored locally with the draft
  box.querySelectorAll('[data-photo]').forEach((b) => b.addEventListener('click', () =>
    box.querySelector('[data-photo-input="' + b.getAttribute('data-photo') + '"]').click()));
  box.querySelectorAll('[data-photo-rm]').forEach((b) => b.addEventListener('click', () => {
    const g = S.guests.find((x) => x.guestId === b.getAttribute('data-photo-rm'));
    if (g) { delete g.photo; saveDraft(); renderEach(); }
  }));
  box.querySelectorAll('[data-photo-input]').forEach((inp) => inp.addEventListener('change', () => {
    const g = S.guests.find((x) => x.guestId === inp.getAttribute('data-photo-input'));
    const f = inp.files && inp.files[0];
    if (!g || !f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const s = Math.min(1, 256 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      g.photo = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(img.src);
      saveDraft(); renderEach();
    };
    img.src = URL.createObjectURL(f);
  }));
  // passport: metadata only on this device — NEVER uploaded/bundled anywhere yet
  box.querySelectorAll('[data-pass]').forEach((b) => b.addEventListener('click', () =>
    box.querySelector('[data-pass-input="' + b.getAttribute('data-pass') + '"]').click()));
  box.querySelectorAll('[data-pass-rm]').forEach((b) => b.addEventListener('click', () => {
    const g = S.guests.find((x) => x.guestId === b.getAttribute('data-pass-rm'));
    if (g) { delete g.passport; saveDraft(); renderEach(); }
  }));
  box.querySelectorAll('[data-pass-input]').forEach((inp) => inp.addEventListener('change', () => {
    const g = S.guests.find((x) => x.guestId === inp.getAttribute('data-pass-input'));
    const f = inp.files && inp.files[0];
    if (!g || !f) return;
    g.passport = { name: f.name, size: f.size, selectedAt: new Date().toISOString() };
    saveDraft(); renderEach();
  }));
}
const ef = (g, k, label, type = 'text') =>
  '<div class="field"><label>' + esc(label) + '</label><input type="' + type + '" data-ef="' + k + '" value="' + esc(g[k] || '') + '"/></div>';

/* ---------------- step 9 · cost summary ---------------- */
function currentAcc() {
  return S.stay.accommodationId && S.stay.accommodationId !== 'none'
    ? ACCOMMODATIONS.find((a) => a.id === S.stay.accommodationId) : null;
}
function coverageModel() {
  const sc = S.scope || {};
  const stays = [], trans = [], gaps = [];
  const riders = S.guests.filter((g) => g.journey.train).length;
  const indepAll = S.guests.filter((g) => g.attending !== false).every((g) => g.journey.independent);
  if (sc.bangkok) {
    const ok = !!(S.bangkokStay && (S.bangkokStay.withUs || S.bangkokStay.property));
    stays.push({ label: 'Bangkok', ok });
    if (!ok) gaps.push({ t: 'Bangkok stay', s: 'Request the Bangkok stay in My Journey.', cta: 'journey' });
  }
  if (sc.laos) {
    const ok = !!currentAcc();
    stays.push({ label: 'Vientiane', ok, sub: 'Wedding Stay' });
    if (!ok) gaps.push({ t: 'Vientiane', s: 'Choose your Wedding Stay.', cta: 'journey' });
    const tok = riders > 0 || indepAll;
    trans.push({ label: 'Bangkok → Vientiane', ok: tok, sub: riders > 0 ? 'Special Express No. 25 package' : 'Travelling independently' });
    if (!tok) gaps.push({ t: 'Journey to Vientiane', s: 'Request the overnight package or tell us you travel independently.', cta: 'journey' });
  }
  if (sc.china) {
    for (const [key, label] of [['kunming', 'Kunming'], ['lijiang', 'Lijiang']]) {
      const ok = S.china && S.china[key] === 'with';
      stays.push({ label, ok });
      if (!ok) gaps.push({ t: label + ' stay', s: 'Request the ' + label + ' stay in My Journey.', cta: 'journey' });
    }
    const fOk = S.travel && S.travel.vteKmg === 'with';
    trans.push({ label: 'Vientiane → Kunming', ok: fOk, sub: 'Being arranged by Khun Ket & Khun Paddy' });
    if (!fOk) gaps.push({ t: 'Vientiane → Kunming', s: 'Request the flight arrangement in My Journey.', cta: 'journey' });
    const tOk = S.travel && S.travel.kmgLjg === 'with';
    trans.push({ label: 'Kunming → Lijiang', ok: tOk, sub: 'First Class Train' });
    if (!tOk) gaps.push({ t: 'Kunming → Lijiang', s: 'Request the First Class Train in My Journey.', cta: 'journey' });
    const oOk = !!(S.postWedding && S.postWedding.onward);
    trans.push({ label: 'Lijiang → Bangkok / onward', ok: oOk });
    if (!oOk) gaps.push({ t: 'Onward from Lijiang', s: 'Tell us how your journey continues after Lijiang.', cta: 'journey' });
  }
  /* §4: the two external journey edges */
  const arrOk = !sc.bangkok || !!(S.bangkokStay && (S.bangkokStay.arrivalInfo || '').trim());
  if (sc.bangkok && !arrOk) gaps.push({ t: 'Arrival to Bangkok', s: 'We still need your arrival details.', cta: 'arrival' });
  const depOk = !!(S.departureInfo || '').trim();
  if (!depOk) gaps.push({ t: 'Departure from Bangkok', s: 'We still need your final departure / flight-home details.', cta: 'departure' });
  return { stays, trans, gaps,
    staysOk: stays.length > 0 && stays.every((x) => x.ok),
    transOk: trans.length > 0 && trans.every((x) => x.ok) };
}
function wireCoverage(box) {
  box.querySelectorAll('[data-cov-cta]').forEach((b) => b.addEventListener('click', () => {
    const kind = b.getAttribute('data-cov-cta');
    show(idx('home'));
    if (kind === 'arrival') setTimeout(() => { const a = document.getElementById('bkk-arrival'); if (a) { a.scrollIntoView({ block: 'center' }); a.focus(); } }, 200);
  }));
  const a = box.querySelector('#arr-info');
  if (a) a.addEventListener('input', () => { S.bangkokStay = S.bangkokStay || {}; S.bangkokStay.arrivalInfo = a.value; saveDraft(); renderSummary(); });
  if (a) a.addEventListener('change', () => { renderStep(cur); });
  const d = box.querySelector('#dep-info');
  if (d) d.addEventListener('input', () => { S.departureInfo = d.value; saveDraft(); renderSummary(); });
  if (d) d.addEventListener('change', () => { renderStep(cur); });
}
function renderCost() {
  const box = document.getElementById('cost-box');
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const riders = S.guests.filter((g) => g.journey.train);
  const tc = trainContribution(TRAIN, riders.length) || 0;
  const total = (function(){ const G = laosGate(acc, riders.length, S.transfers); return journeyTotal(G.acc, occ, TRAIN, G.riders, TRANSFERS, G.transfers) + laosExtraTotal(G.acc, occ); })() + pwTotal() + bkkTotal() + cnStaysTotal() + almsTotal() + trainCabinUpcharge() + extrasTotal() + preWedTotal() + kempinskiTotal();
  const neutral = acc && acc.contributionPerGuest == null;
  const sc = S.scope || {};
  const oneNight = S.stay.mode === 'oneNight';
  const m = coverageModel();

  /* Your Plan — the personal chronological itinerary in the voyage grammar:
   * date · destination/item · status. Hairlines only, no cards, no dashboard. */
  const plan = (date, title, sub, status) =>
    '<div class="pl-row"><span class="pl-d">' + date + '</span>' +
    '<div class="pl-b"><span class="pl-t serif">' + title + '</span>' +
    (sub ? '<span class="pl-s">' + sub + '</span>' : '') + '</div>' +
    (status ? '<span class="pl-st">' + status + '</span>' : '') + '</div>';
  /* Your Costs — same grammar: item · quantity/unit · amount. */
  const cost = (date, item, detail, amount) =>
    '<div class="cs-row"><span class="pl-d">' + date + '</span>' +
    '<div class="pl-b"><span class="pl-t">' + item + '</span>' +
    (detail ? '<span class="pl-s">' + detail + '</span>' : '') + '</div>' +
    '<span class="cs-a">' + amount + '</span></div>';

  let html = '<p class="note" style="max-width:560px;margin-bottom:26px">Your journey in order — what you are doing, where, when, what is already hosted or booked, and what still needs a decision from you.</p>';

  /* ---------- YOUR PLAN ---------- */
  html += '<section class="am-sec"><p class="cch-label">Your plan</p>';
  let planRows = '';
  if (sc.bangkok) {
    planRows += '<p class="pl-j">Journey 01 · Thailand</p>';
    planRows += plan((BANGKOK_STAYS[0] && BANGKOK_STAYS[0].dates) || BANGKOK_STAY.window, 'Bangkok', (BANGKOK_STAYS[0] && BANGKOK_STAYS[0].name) || 'Your Bangkok stay', bangkokStayActive() ? 'BOOKED' : 'OPEN');
    planRows += plan(esc(TRAIN.date), 'Bangkok &rarr; Nong Khai', 'Overnight train · First Class Sleeper', riders.length ? 'BOOKED' : 'YOUR CHOICE');
  }
  {
    planRows += '<p class="pl-j">Journey 02 · Laos</p>';
    planRows += plan('27 FEB', 'Vientiane', 'Arrival and welcome', 'HOSTED');
    planRows += plan(acc ? esc(acc.stay) : '27 FEB – 01 MAR', 'Your wedding stay', acc ? esc(acc.name) : 'Not chosen yet · open under Your Stay', acc ? 'BOOKED' : 'OPEN');
    const evLbl = { temple: ['28 FEB · 09:00', 'Temple Ceremony', 'Wat Ong Teu'], coffee: ['28 FEB · 12:00', 'Coffee &amp; Cake', 'After the return from the temple'], ceremony: ['28 FEB · 16:30', 'Vow Ceremony', 'The green gate'], dinner: ['28 FEB · 19:30', 'Wedding Dinner', 'The evening together'] };
    Object.keys(evLbl).forEach((k) => {
      const joining = S.guests.some((g) => (g.events || {})[k]);
      const decided = S._evDecided && S._evDecided[k];
      planRows += plan(evLbl[k][0], evLbl[k][1], evLbl[k][2], joining ? 'HOSTED' : (decided ? 'NOT JOINING' : 'OPEN'));
    });
  }
  if (sc.china) {
    planRows += '<p class="pl-j">Journey 03 · China</p>';
    planRows += plan('01 MAR', 'Vientiane &rarr; Kunming', 'Flight', (S.travel && S.travel.vteKmg === 'with') ? 'BOOKED' : 'YOUR CHOICE');
    POST_WEDDING.filter((c) => c.type === 'Stay').forEach((c) => {
      const key = /kunming/i.test(c.id + ' ' + c.label) ? 'kunming' : 'lijiang';
      planRows += plan(esc(c.date), esc(c.label), esc(c.sub || ''), (S.china && S.china[key] === 'with') ? 'BOOKED' : 'YOUR CHOICE');
    });
    planRows += plan('04 MAR', 'Kunming &rarr; Lijiang', 'Train C642 · Business Class', (S.travel && S.travel.kmgLjg === 'with') ? 'BOOKED' : 'YOUR CHOICE');
    planRows += plan('06 MAR', 'Lijiang &rarr; onward', 'Your onward journey', (S.postWedding && S.postWedding.onward) ? 'BOOKED' : 'OPEN');
  }
  html += (planRows || '<p class="note">No journey is part of your plan yet.</p>') + '</section>';

  /* ---------- STILL NEEDED ---------- */
  if (m.gaps.length) {
    html += '<section class="am-sec"><p class="cch-label">Still needed from you</p>' +
      m.gaps.map((g, i) =>
        '<div class="pl-row open"><span class="pl-d">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="pl-b"><span class="pl-t serif">' + esc(g.t) + '</span><span class="pl-s">' + esc(g.s) + '</span>' +
        (g.cta === 'departure'
          ? '<div class="field" style="margin-top:8px;max-width:420px"><label for="dep-info">Your departure details (flight home, booked by you)</label><textarea id="dep-info" rows="2">' + esc(S.departureInfo || '') + '</textarea></div>'
          : g.cta === 'arrival'
          ? '<div class="field" style="margin-top:8px;max-width:420px"><label for="arr-info">Your arrival details (flight/train, booked by you)</label><textarea id="arr-info" rows="2">' + esc((S.bangkokStay || {}).arrivalInfo || '') + '</textarea></div>'
          : '<button type="button" class="t-act" data-cov-cta="' + g.cta + '">Open your journey</button>') +
        '</div><span class="pl-st">OPEN</span></div>').join('') + '</section>';
  }

  /* ---------- YOUR COSTS — the Journey Bag financial summary ---------- */
  html += '<section class="am-sec"><p class="cch-label">Your costs</p>' +
    '<p class="note" style="max-width:560px;margin-bottom:14px">Your journey, as curated blocks. Each block carries one package price per person; what it contains lives under Included.</p>';
  let rows = '';
  journeyBlocks().forEach((b) => {
    if (b.id === 'prewed') return; // no commercial basis yet — never shown as a price
    if (!b.on) return;
    const open = S._bagOpen === b.id;
    rows += '<div class="cs-row bag"><span class="pl-d">' + b.no + '</span>' +
      '<div class="pl-b"><span class="pl-t serif" style="font-family:\'PP Editorial Old\',serif;font-size:19px">' + esc(b.name) + '</span>' +
      '<span class="pl-s">' + b.dates + (b.variant ? ' · ' + esc(b.variant) : '') + ' · ' + b.qty + ' guest' + (b.qty > 1 ? 's' : '') +
      (b.pp ? ' · ' + money(b.pp) + ' per person' : (b.pp === 0 ? ' · HOSTED' : '')) + '</span>' +
      '<button type="button" class="t-act" data-bag-inc="' + b.id + '" style="margin-top:4px;min-height:34px;padding-top:2px">' + (open ? 'Hide what\u2019s included' : 'What\u2019s included') + '</button>' +
      (open ? '<div style="margin-top:8px">' + b.included.map((i) => '<span class="pl-s" style="display:block">' + i + '</span>').join('') + '</div>' : '') +
      '</div><span class="cs-a">' + (b.total != null ? money(b.total) : '') + '</span></div>';
  });
  const exSel = extrasSel();
  EXTRAS.forEach((x) => {
    const q = exSel[x.id] || 0;
    if (!q) return;
    rows += '<div class="cs-row bag"><span class="pl-d">&nbsp;</span>' +
      '<div class="pl-b"><span class="pl-t">' + esc(x.name) + '</span>' +
      '<span class="pl-s">' + esc(x.where) + ' · ' + esc(x.unit) + '</span>' +
      '<span class="bag-qty">Quantity <button type="button" data-ex-q="' + x.id + ':-1" aria-label="Fewer">&minus;</button><b>' + q + '</b><button type="button" data-ex-q="' + x.id + ':1" aria-label="More">+</button>' +
      '<button type="button" class="t-act" data-ex-rm="' + x.id + '" style="margin-left:14px;min-height:34px;padding-top:0">Remove</button></span>' +
      '</div><span class="cs-a">' + money(x.price * q) + '</span></div>';
  });
  for (const sl of S.transfers || []) {
    const t = TRANSFERS.find((x) => x.id === sl.transferId);
    if (!t || !t.pricePerUnit) continue;
    const nT = t.perGuest ? Math.max(riders.length, 1) : (sl.units || 1);
    rows += cost(esc(t.date || ''), esc(t.name), nT + ' × ' + money(t.pricePerUnit), money(t.pricePerUnit * nT));
  }
  html += (rows || '<p class="note">Nothing is in your journey yet. Add a journey block under Plan your journey.</p>') +
    '<div class="cs-total"><span class="l">Total Costs</span><span class="r js-total">' + money(total) + '</span></div>' +
    (total > 0 ? '<p class="note am-foot">After your journey has been reviewed you will receive the payment details for the costs shown here. Nothing is paid on this website.</p>' : '') +
    '</section>';

  /* ---------- HOSTED FOR YOU ---------- */
  const hosted = [
    'Personal airport welcome and arrival coordination',
    'Welcome drink on arrival',
    'Breakfast on both mornings',
    'Temple Ceremony', 'Coffee &amp; Cake', 'Vow Ceremony',
    'Sunset Drinks &amp; Wedding Dinner',
    'Two hour beverage package',
  ];
  if (acc && !neutral && !oneNight) hosted.push(esc(acc.name) + ' · night two');
  hosted.push('Departure coordination within the wedding programme');
  html += '<section class="am-sec"><p class="cch-label">Hosted for you</p>' +
    '<p class="note" style="margin-bottom:10px">The Wedding · 27 FEB – 01 MAR 2027 · with the love of <span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span></p>' +
    '<ul class="hs-list">' + hosted.map((h) => '<li>' + h + '</li>').join('') + '</ul></section>';

  /* ---------- BEFORE YOU SUBMIT ---------- */
  const wc = S.weddingConsent || {};
  html += '<section class="am-sec"><p class="cch-label">Before you submit</p>' +
    '<p class="note" style="margin:8px 0 4px"><strong>Photo &amp; video</strong> — Our wedding will be photographed and filmed. By joining us, you agree that photographs and videos in which you appear may be shared by Haruthai &amp; Suthep in connection with our wedding, including our wedding-related social media and personal wedding memories.</p>' +
    '<p class="note" style="margin:8px 0 4px"><strong>Dress code</strong> — You confirm that you have read the dress code for the parts of the wedding you are joining and will respect it.</p>' +
    '<p class="note" style="margin:8px 0 4px"><strong>Personal responsibility</strong> — Please take care of your personal belongings. You remain responsible for damage you intentionally cause or for which you are personally responsible.</p>' +
    '<p class="note" style="margin:8px 0 10px"><strong>Your information</strong> — You confirm that the travel, contact, dietary, allergy and other information you provide is correct to the best of your knowledge.</p>' +
    '<label class="confirm-row"><input type="checkbox" id="wed-consent"' + (wc.accepted ? ' checked' : '') + '/><span>I have read and agree to the wedding information above.</span></label>' +
    '<p class="note" id="consent-hint" style="margin:6px 0 0"' + (wc.accepted ? ' hidden' : '') + '>Please confirm the wedding information above before submitting.</p>' +
    '<button type="button" class="btn-full dark" id="plan-review" style="margin-top:18px">Review my plan &amp; submit</button>' +
    '</section>';

  box.innerHTML = html +
    (fxStamp() ? '<p class="note" style="margin-top:14px">' + fxStamp() + ' · Amounts are shown for orientation; the master currency remains USD.</p>' : '') +
    (S.stay.mode === 'oneNight'
      ? '<p class="note" style="margin-top:16px">Your one-night wedding stay: 28 FEB – 01 MAR 2027, breakfast included. The amount shown is the approved amount for your room category.</p>'
      : '<p class="note" style="margin-top:16px">' + esc(COPY.priceNote + ' Haruthai\u00A0&\u00A0Suthep.') + '</p>') +
    '<p class="note">' + esc(COPY.payment) + ' One person may settle the invoice for everyone travelling with them.</p>';

  box.querySelectorAll('[data-bag-inc]').forEach((b) => b.addEventListener('click', () => {
    const k = b.getAttribute('data-bag-inc');
    S._bagOpen = (S._bagOpen === k) ? null : k;
    renderStep(cur);
  }));
  box.querySelectorAll('[data-ex-q]').forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute('data-ex-q').split(':');
    const sel = extrasSel();
    sel[v[0]] = Math.max(0, (sel[v[0]] || 0) + parseInt(v[1], 10));
    if (!sel[v[0]]) delete sel[v[0]];
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-ex-rm]').forEach((b) => b.addEventListener('click', () => {
    delete extrasSel()[b.getAttribute('data-ex-rm')];
    saveDraft(); renderStep(cur); renderSummary();
  }));
  const pp = document.getElementById('pay-pref');
  if (pp) pp.querySelectorAll('input[name="pay-pref"]').forEach((el) => el.addEventListener('change', () => {
    S.payment = el.value; saveDraft(); renderStep(cur);
  }));
  const wcb = document.getElementById('wed-consent');
  if (wcb) wcb.addEventListener('change', () => {
    S.weddingConsent = wcb.checked
      ? { accepted: true, version: '2026-09-04-v1', acceptedAt: new Date().toISOString() }
      : { accepted: false, version: '2026-09-04-v1', acceptedAt: null };
    saveDraft();
    const h = document.getElementById('consent-hint'); if (h) h.hidden = wcb.checked;
  });
  const pr = document.getElementById('plan-review');
  if (pr) pr.addEventListener('click', () => {
    if (!(S.weddingConsent && S.weddingConsent.accepted)) {
      const h = document.getElementById('consent-hint');
      if (h) { h.hidden = false; h.scrollIntoView({ block: 'center' }); }
      return;
    }
    saveDraft(); show(idx('review'));
  });
  wireCoverage(box);
}

/* ---------------- step 10 · review (§28) ---------------- */
function renderReview() {
  const box = document.getElementById('review-box');
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  /* Aman editorial review: hairline section label, hairline rows, quiet edit
   * link. No legacy definition-list card. Same data, same edit targets. */
  const sec = (t, step, rows) =>
    '<section class="am-sec"><div class="rv-top"><p class="cch-label">' + t + '</p>' +
    '<button type="button" class="t-act" data-goto="' + step + '">Edit</button></div>' +
    rows.map((r) => '<div class="pl-row"><span class="pl-d">' + r[0] + '</span>' +
      '<div class="pl-b"><span class="pl-t">' + r[1] + '</span></div></div>').join('') + '</section>';
  const journeyLine = (g) => [
    g.journey.bangkok && 'Bangkok Journey', g.journey.train && 'Overnight Train · BOOKED',
    !g.journey.train && g.journey.independent && 'Independent arrival'].filter(Boolean).join(' · ') || '—';
  const eventLine = (g) => EVENTS.filter((e) => g.events[e.id]).map((e) => e.label).join(' · ') || 'None';
  let html = '';
  html += '<p class="home-hello" style="margin-bottom:20px">' + esc(S.invitation.partyName) + ' · Vientiane · February 2027</p>';
  html += '<div class="cch-label">Your journey, in order</div>' + itineraryHtml();
  html += sec('Your Guests', idx('party'), [
    ['Invitation', esc(S.invitation.partyName)],
    ['Members', S.invitation.guests.map((g) => esc(g.fullName)).join(' · ')],
    ['Lead guest', esc((S.invitation.guests.find((g) => g.guestId === S.invitation.partyLead) || {}).fullName || '—')],
  ]);
  html += '<div class="cch-label rv-cch">Pre-Wedding Journey · Optional · Before the wedding</div>';
  {
    const jRiders = S.guests.filter((g) => g.journey.train);
    const anyBkk = S.guests.some((g) => g.journey.bangkok);
    const bkkSel = bangkokStayActive() ? (BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property) || BANGKOK_STAYS[0]) : null;
    const arrSel = (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId)).filter((t) => t && t.direction === 'arrival');
    html += sec('Your Journey', idx('journey'), [
      ['Before the wedding', anyBkk ? 'Bangkok Journey' + (bkkSel ? ' · ' + esc(bkkSel.name) + ' · BOOKED' : '') : 'Straight to the wedding'],
      ['Journey to Vientiane', jRiders.length
        ? 'Overnight Train · ' + jRiders.length + ' seat' + (jRiders.length > 1 ? 's' : '') + (jRiders.length < S.guests.length ? ' · ' + jRiders.map((g) => esc(g.preferredName)).join(' & ') : '') + ' · BOOKED'
        : 'Own arrangement — Guest Relations can assist'],
      ['Arrival in Vientiane', arrSel.length ? arrSel.map((t) => esc(t.name)).join(' · ') + ' · BOOKED' : 'Own arrangement — Guest Relations can assist'],
    ]);
  }
  const riders = S.guests.filter((g) => g.journey.train);
  html += sec('Overnight Train', idx('journey'), riders.length ? [
    ['Date', esc(TRAIN.date) + ' · ' + esc(TRAIN.times) + ' · First Class Sleeper'],
    ['Joined', riders.map((g) => esc(g.preferredName) + (g.berth ? ' · ' + esc(g.berth) : '')).join('<br/>')],
    ['Seats booked', String(riders.length) + ' · BOOKED'],
    ['Arrival', '27 FEB 2027 · Nong Khai Railway Station'],
    ['Onward transfer', trainOnwardLine()],
  ].concat(S.trainNote ? [['Note', esc(S.trainNote)]] : []) : [['Joined', 'Not joined']]);
  html += '<div class="cch-label rv-cch rv-cch-main">The Wedding · Main Event · Vientiane · 28 FEB 2027</div>';
  html += sec('The wedding days', idx('events'), EVENTS.map((e) => {
    const joiners = S.guests.filter((g) => g.attending !== false && g.events[e.id]);
    if (!joiners.length) return [esc(e.label), 'Not joining'];
    const who = joiners.length === S.guests.length ? 'Joining' : 'Joining · ' + joiners.map((g) => esc(g.preferredName)).join(' & ');
    const ack = S.dressAck && S.dressAck[e.id];
    const dress = e.dress ? (ack ? ' · Dress code understood' : ' · <span class="ack-missing">Dress code not yet confirmed — please confirm under The Wedding</span>') : '';
    return [esc(e.label) + (e.time ? ' · ' + esc(e.time) : ''), who + dress];
  }));
  if (acc) html += '<div class="rv-room">' + roomFigure(acc) +
    '<div class="rv-room-b"><div class="label">Your room</div><h3>' + esc(acc.name) + '</h3>' +
    '<p class="note">' + esc([acc.size, acc.bed, acc.occupancy].filter(Boolean).join(' · ')) + '</p></div></div>';
  html += sec('Your Stay', idx('stay'), acc ? [
    ['Dates', esc(acc.stay) + ' · ' + acc.nights + ' nights'],
    ['BOOKED', esc(acc.name) + ' · Vientiane'],
    ['Status', S.stay.waitlist ? 'WAITLISTED' : 'BOOKED'],
    ...(acc.contributionPerGuest == null
      ? [['Guests', String(occ.length)], ['Your Costs', 'Complimentary']]
      : [['Guests', occ.length + ' · ' + money(contributionPerGuest(acc)) + ' per guest'],
         ['Your costs', occ.map((id) => { const g = S.guests.find((x) => x.guestId === id); return esc(g ? g.preferredName : id) + ' ' + money(contributionPerGuest(acc)); }).join(' · ')],
         ['Total', money(partyTotal(acc, occ))],
         ['Second night', 'Complimentary · hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>']]),
  ] : [['OPEN', 'No stay selected yet'], ['Action', 'Please choose your room under Your Stay before sending']]);
  const trv = S.arrival.shared !== false
    ? [['Together', esc([S.arrival.date, S.arrival.time, S.arrival.ref].filter(Boolean).join(' · ') || '—') + (S.arrival.pickupRequested ? ' · pickup BOOKED' : '')]]
    : S.guests.map((g) => { const a = S.arrivalByGuest[g.guestId] || {}; return [esc(g.preferredName), esc([a.date, a.time, a.ref].filter(Boolean).join(' · ') || '—') + (a.pickupRequested ? ' · pickup BOOKED' : '')]; });
  html += sec('Arrival & Departure', idx('journey'), trv.concat([
    ['Departure', departureSelections().length
      ? departureSelections().map((t) => esc(t.name)).join(' · ') + ' · BOOKED'
      : 'Follows your onward itinerary · OPEN'],
  ]));
  if (bangkokStayActive()) {
    const bh = BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property) || BANGKOK_STAYS[0];
    if (bh) html += sec('Your Bangkok Stay', idx('home'), [
      ['Dates', (S.bangkokStay.from && S.bangkokStay.to ? esc(S.bangkokStay.from) + ' → ' + esc(S.bangkokStay.to) : BANGKOK_STAY.window) + ' · ' + bkkNights() + ' nights'],
      ['Arrival', esc(bh.arrival.date) + ' · ' + esc(bh.arrival.note) + ' · HOSTED'],
      ['Accommodation', 'Bangkok Stay · currently ' + esc(bh.name)],
      ['Your costs', bkkTravellers() + ' × ' + bkkNights() + ' × ' + money(BANGKOK_STAY.ratePerGuestNight) + ' · total ' + money(bkkTotal())],
    ]);
  }
  if (S.postWedding && S.postWedding.joined) html += '<div class="cch-label rv-cch">Post-Wedding Journey · Optional · After the wedding</div>' +
    sec('The Post Wedding Journey', idx('journey'),
    POST_WEDDING.filter((c) => !c.onward).map((c) => [esc(c.date), esc(c.label) + ' · ' + esc(c.type) + (c.sub ? ' · ' + esc(c.sub) : '') + ' · ' +
      (c.contribution != null
        ? (c.perGuest ? money(c.contribution) + ' per guest' : money(c.contribution))
        : 'Guest Relations will confirm the arrangement')])
    .concat([['06 MAR 2027', 'Your onward journey · ' + ({
      return: 'Return to Bangkok with us · Guest Relations will confirm the arrangement',
      own: 'Arranged independently — a complete answer',
      gr: 'Guest Relations support requested',
    }[S.postWedding.onward] || 'Your choice')]]));
  html += sec('Your Transfers', idx('journey'), (S.transfers || []).length
    ? S.transfers.map((s) => {
        const t = TRANSFERS.find((x) => x.id === s.transferId) || {};
        const d = s.details || {};
        const n = t.perGuest ? Math.max(S.guests.filter((g) => g.journey.train).length, 1) : (s.units || 1);
        return [esc(t.name || s.transferId),
          n + (t.perGuest ? ' guest' + (n > 1 ? 's' : '') : ' unit' + (n > 1 ? 's' : '')) + ' × ' + money(t.pricePerUnit || 0) + ' = ' + money((t.pricePerUnit || 0) * n) +
          ' · ' + esc([d.date, d.time, d.ref].filter(Boolean).join(' · ') || 'details open') + ' · BOOKED'];
      })
    : [['Selected', 'None']]);
  const jcRiders = S.guests.filter((g) => g.journey.train).length;
  const jcRows = [];
  const lact = !!(S.scope && S.scope.laos);
  if (acc && lact && !(S.stay && S.stay.own)) jcRows.push(['Stay', esc(acc.name) + ' · ' + (acc.contributionPerGuest == null ? 'complimentary · limited' : money(partyTotal(acc, occ)))]);
  if (jcRiders && lact) jcRows.push(['Train', esc(TRAIN.date) + ' · ' + jcRiders + ' × ' + money(TRAIN.contributionPerGuest) + ' = ' + money(trainContribution(TRAIN, jcRiders) || 0)]);
  if ((S.transfers || []).length && lact) jcRows.push(['Transfers', money(transfersTotal(TRANSFERS, S.transfers, jcRiders))]);
  if (bangkokStayActive()) {
    const bh = BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property) || BANGKOK_STAYS[0];
    if (bh) jcRows.push(['Bangkok stay', esc(bh.contributionNight) + ' · ' + esc(bh.name) + ' · ' + money(bkkTotal())]);
  }
  if (S.postWedding && S.postWedding.joined) jcRows.push(['Post Wedding Journey', '04 MAR 2027 · Kunming → Lijiang · First Class Train · ' + money(pwTotal())]);
  if (cnStayTotal('kunming')) jcRows.push(['Kunming stay', '01 – 04 MAR 2027 · Wanxiang Yueju Designer Homestay · ' + money(cnStayTotal('kunming'))]);
  if (cnStayTotal('lijiang')) jcRows.push(['Lijiang stay', '04 – 06 MAR 2027 · Luye Baisha · Rizhao Jinshan · ' + money(cnStayTotal('lijiang'))]);
  jcRows.push(['Total costs', money((function(){ const G = laosGate(acc, jcRiders, S.transfers); return journeyTotal(G.acc, occ, TRAIN, G.riders, TRANSFERS, G.transfers) + laosExtraTotal(G.acc, occ); })() + pwTotal() + bkkTotal() + cnStaysTotal() + almsTotal() + trainCabinUpcharge() + extrasTotal() + preWedTotal() + kempinskiTotal())]);
  html += sec('Your Costs', idx('cost'), jcRows);
  html += sec('Each of You', idx('each'), S.guests.map((g) => {
    const detail = (g.allergyDetail || '').trim();
    const parts = ['Dietary preference · ' + esc(g.diet)];
    parts.push(g.allergy === 'yes'
      ? (detail ? 'Allergy · ' + esc(detail) : '<span class="ack-missing">Allergy · please add the detail for the kitchens under My Details</span>')
      : 'Allergy · None reported');
    if (g.phone) parts.push('Phone ' + esc(g.phone));
    if (g.dob) parts.push('Born ' + esc(g.dob));
    if (g.spa && g.spa.requested) parts.push('spa OPEN');
    return [esc(g.preferredName), parts.join(' · ')];
  }));
  if (S.additionalGuestRequest) html += sec('Additional guest request', idx('party'), [['Request', esc(S.additionalGuestRequest) + ' — subject to Guest Relations approval']]);
  html += '<label class="confirm-row"><input type="checkbox" id="confirm-accurate"/><span>We confirm this information is accurate. We understand this registration is a request and that Guest Relations confirms all arrangements separately.</span></label>';
  html += '<p class="err" id="review-err"></p>';
  box.innerHTML = html;
  box.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => show(parseInt(b.getAttribute('data-goto'), 10))));
}

/* ---------------- step 11/12 · send + received (§29, §30) ---------------- */
function trainOnwardLine() {
  // §9: derived from the transfer selection itself — never a second data store.
  const onward = (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId))
    .find((t) => t && (t.id === 'nongkhai-vte' || t.id === 'shuttle-shared'));
  if (onward) return esc(onward.name) + ' · BOOKED';
  return 'Own arrangement — Guest Relations can assist';
}
function currentRegistration() {
  // photos stay on this device; passports never leave it (document vault pending)
  const guests = S.guests.map((g) => { const { photo, ...rest } = g; return { ...rest, passport: g.passport ? { name: g.passport.name, size: g.passport.size } : undefined }; });
  return {
    guests, stay: currentAcc() ? { ...S.stay } : { accommodationId: null },
    arrival: { ...S.arrival, point: S.guests.some((g) => g.journey.train) ? 'Nong Khai Railway Station' : (S.arrival.point || WEDDING.airport) },
    departure: S.departure, transfers: S.transfers, dressAck: { ...(S.dressAck || {}) },
    bangkokStay: bangkokStayActive() ? { ...(S.bangkokStay) } : { property: null, from: '', to: '' },
    payment: S.payment || null,
    china: { ...(S.china || {}) },
    travel: { ...(S.travel || {}) },
    departureInfo: S.departureInfo || '',
    weddingConsent: { ...(S.weddingConsent || { accepted: false }) },
    dressAck: { ...(S.dressAck || {}) },
    chinaRequested: { ...(S.chinaRequested || {}) },
    scope: { ...(S.scope || {}) },
    postWedding: { ...(S.postWedding || { joined: false }) },
    additionalGuestRequest: S.additionalGuestRequest,
    trainNote: S.trainNote, notes: S.notes, registration_submitted_at: S.registration_submitted_at,
  };
}
function trySubmit() {
  const errEl = document.getElementById('review-err');
  if (!document.getElementById('confirm-accurate').checked) {
    errEl.textContent = 'Please confirm the information is accurate first.'; errEl.classList.add('show'); return false;
  }
  const errors = validateRegistration(currentRegistration(), {
    invitation: S.invitation, accommodations: ACCOMMODATIONS, trainCapacity: TRAIN.capacityTotal, transfers: TRANSFERS, events: EVENTS,
  });
  if (errors.length) { errEl.textContent = errors.join(' · '); errEl.classList.add('show'); return false; }
  errEl.classList.remove('show');
  if (!S.registration_submitted_at) S.registration_submitted_at = new Date().toISOString();
  // idempotent inventory requests at completed-registration time
  const acc = currentAcc();
  if (acc) requestAllocation(inventory, acc.id, { partyId: S.invitation.invitationId, guestIds: S.stay.occupantGuestIds, units: 1, submittedAt: S.registration_submitted_at });
  const trainGuests = S.guests.filter((g) => g.journey.train).map((g) => g.guestId);
  for (const gid of trainGuests) requestAllocation(inventory, 'train', { partyId: S.invitation.invitationId + ':' + gid, guestIds: [gid], units: 1, submittedAt: S.registration_submitted_at });
  saveInventory();
  S.submitted = true; saveDraft();
  return true;
}
function renderSend() {
  const text = buildNotification(currentRegistration(), { invitation: S.invitation, accommodations: ACCOMMODATIONS, transfers: TRANSFERS, train: TRAIN, postWedding: POST_WEDDING });
  document.getElementById('send-out').textContent = text;
}
document.getElementById('send-mail').addEventListener('click', async () => {
  const text = document.getElementById('send-out').textContent;
  if (PUBLICATION.submit === 'endpoint') {
    try {
      const r = await fetch(PUBLICATION.submitUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ registration: currentRegistration(), invitationId: S.invitation.invitationId, text }) });
      if (r.ok) { S.submitVia = 'server'; showReceived(); return; }   // durably stored server-side
    } catch (e) { /* endpoint unreachable — emergency channel below */ }
  }
  /* FER-001 §1.8/1.9: mailto is explicit EMERGENCY RECOVERY, never presented
   * as successful digital submission — the received screen says so. */
  S.submitVia = 'mail';
  location.href = 'mailto:' + CONTACTS.email + '?subject=' + encodeURIComponent('Guest Registration — ' + S.invitation.partyName) + '&body=' + encodeURIComponent(text);
  showReceived();
});
document.getElementById('copy-out').addEventListener('click', () => {
  const btn = document.getElementById('copy-out');
  navigator.clipboard.writeText(document.getElementById('send-out').textContent).then(() => {
    btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy for LINE'; }, 2200);
  }).catch(() => { /* text remains selectable */ });
  S.submitVia = S.submitVia === 'server' ? 'server' : 'mail';
  showReceived();
});
function journeyStatusLadder() {
  const steps = [
    ['Invitation', 'Complete'], ['Invitation Accepted', 'Complete'],
    ['Travel Verification', 'Complete'], ['Journey Review', 'You are here'],
    ['Journey Confirmed', ''],
  ];
  return '<ol class="jstatus">' + steps.map(([t, s], i) =>
    '<li class="' + (s === 'Complete' ? 'done' : s ? 'here' : 'next') + '">' +
    '<span class="n">' + pad(i + 1) + '</span><span class="t">' + t + '</span>' +
    (s ? '<span class="s">' + s + '</span>' : '') + '</li>').join('') + '</ol>';
}
function showReceived() {
  const via = document.getElementById('received-via');
  if (via) {
    via.innerHTML = S.submitVia === 'server'
      ? '<span class="acc-avail" style="border:none;padding:0">Received and stored — your registration is safely with us.</span>'
      : '<span class="ack-missing">Sent via the email backup channel — please make sure the email left your mail app. Guest Relations confirms receipt personally.</span>';
  }
  const rs = document.getElementById('received-summary');
  if (rs) {
    const open = [];
    if (bangkokStayActive()) open.push(BANGKOK_STAYS[0].name + ' · dates confirmed personally');
    if (S.postWedding && S.postWedding.joined) {
      POST_WEDDING.filter((c) => !c.onward && c.contribution == null).forEach((c) => open.push(c.date + ' · ' + c.label + ' · ' + c.type));
      const ow = S.postWedding.onward;
      if (ow !== 'own') open.push('06 MAR 2027 · Your onward journey' + (ow === 'return' ? ' · return to Bangkok' : ow === 'gr' ? ' · Guest Relations support' : ''));
    } else if (!departureSelections().length) {
      open.push('01 MAR 2027 · Your departure · follows your onward itinerary');
    }
    rs.innerHTML =
      '<div class="cch-label">Your journey is with Guest Relations</div>' +
      itineraryHtml() +
      '<div class="cch-label" style="margin-top:26px">We\u2019re taking care of</div>' +
      '<p class="note">Your selections are now with Guest Relations. Nothing is booked until Khun Ket and Khun Paddy confirm your arrangements with you personally.</p>' +
      (open.length ? '<div class="cch-label" style="margin-top:22px">Still needed from you</div><p class="note">' + open.map(esc).join('<br/>') + '</p>' : '');
  }
  document.getElementById('received-when').textContent =
    'Submitted ' + new Date(S.registration_submitted_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) + ' · status: UNDER REVIEW';
  const st = document.getElementById('received-status');
  if (st) st.innerHTML = journeyStatusLadder() +
    '<p class="note" style="margin-top:16px">From here, everything is in our hands. Khun Ket and Khun Paddy review your travel information, confirm your accommodation, coordinate your transfers and prepare your personal journey. Your private area stays open the whole time; no action is needed from you.</p>' +
    grCardHtml();
  show(idx('received'));
}
document.getElementById('return-journey').addEventListener('click', () => show(idx('home')));

/* ---------------- persistent YOUR JOURNEY summary (§27) ---------------- */
function renderSummary() {
  const el = document.getElementById('summary');
  if (!S.invitation) { el.hidden = true; return; }
  const acc = currentAcc();
  const trainCount = S.guests.filter((g) => g.journey.train).length;
  const sel = [];
  if (trainCount) sel.push(trainCount + ' train seat' + (trainCount > 1 ? 's' : '') + ' · BOOKED');
  if (acc) sel.push(esc(acc.name) + (S.stay.waitlist ? ' · WAITLISTED' : ' · BOOKED'));
  if ((S.transfers || []).length) sel.push(S.transfers.length + ' transfer' + (S.transfers.length > 1 ? 's' : ''));
  if (bangkokStayActive()) sel.push('Bangkok stay · BOOKED');
  if (S.postWedding && S.postWedding.joined) sel.push('Post Wedding Journey · BOOKED');
  const covGaps = coverageModel().gaps.length;
  sel.push(covGaps === 0 ? '✓ Journey complete' : covGaps === 1 ? '1 thing still needed' : covGaps + ' things still needed');
  const total = (function(){ const G = laosGate(acc, trainCount, S.transfers); return journeyTotal(G.acc, acc ? S.stay.occupantGuestIds : [], TRAIN, G.riders, TRANSFERS, G.transfers) + laosExtraTotal(G.acc, acc ? S.stay.occupantGuestIds : []); })() + pwTotal() + bkkTotal() + cnStaysTotal() + almsTotal() + trainCabinUpcharge() + extrasTotal() + preWedTotal() + kempinskiTotal();
  /* editorial quiet: no persistent monetary total while nothing guest-paid
   * is selected (MASTER-02) */
  if (!total) { el.hidden = true; return; }
  el.hidden = false;
  const open = !!S._sumOpen;
  el.classList.toggle('sum-open', open);
  el.innerHTML =
    '<div class="sum-compact" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%">' +
    '<span class="sum-label" style="white-space:nowrap">Your Costs</span>' +
    '<span class="sum-amt" style="white-space:nowrap">' + money(total) + '</span>' +
    '<button type="button" class="btn sm ghost" id="sum-toggle" style="white-space:nowrap;color:inherit;border-color:rgba(255,255,255,.4)">' + (open ? 'Close' : 'View summary') + '</button>' +
    '</div>' +
    (open
      ? '<div class="sum-detail" style="width:100%;margin-top:8px">' +
        '<div class="sum-line" style="opacity:.85">' + esc(S.invitation.partyName) + (sel.length ? ' · ' + sel.join(' · ') : '') + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '<span class="sum-label">Currency</span>' +
        '<span class="sum-cur" role="group" aria-label="Display currency">' +
        CURRENCIES.map((c) => '<button type="button" class="cur-btn' + (c === DISPLAY_CUR ? ' on' : '') + '" data-cur="' + c + '">' + c + '</button>').join('') +
        '</span>' + (fxStamp() ? '<span class="sum-fx">' + fxStamp() + '</span>' : '') + '</div></div>'
      : '');
  const st = el.querySelector('#sum-toggle');
  if (st) st.addEventListener('click', () => { S._sumOpen = !S._sumOpen; renderSummary(); });
  el.querySelectorAll('[data-cur]').forEach((b) => b.addEventListener('click', () => setCurrency(b.getAttribute('data-cur'))));
}

/* ---------------- navigation + global step validation (item 8) ------------
 * CONTINUE stays visible but functionally disabled until every required item
 * of the current step is valid. Optional fields never block; conditional
 * requirements apply only when triggered. */
function stepValid(name) {
  if (!S.invitation) return true;
  if (name === 'events') {
    for (const e of EVENTS) {
      if (!e.dress) continue;
      const joined = S.guests.some((g) => g.events && g.events[e.id]);
      if (joined && !(S.dressAck && S.dressAck[e.id])) return false; // ack required only when joining
    }
    return true;
  }
  if (name === 'stay') return !!currentAcc() || !!S.stay.waitlist; // one- and two-night both select a room
  if (name === 'each') {
    return S.guests.every((g) =>
      (g.email || '').trim().includes('@') &&
      (g.allergy !== 'yes' || (g.allergyDetail || '').trim()));
  }
  return true; // steps without hard requirements never block
}
function updateNextState() {
  const step = stepEls[cur]; if (!step) return;
  const btn = step.querySelector('[data-next]');
  if (btn) btn.disabled = !stepValid(step.dataset.step);
}
document.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
  const name = stepEls[cur].dataset.step;
  if (!stepValid(name)) return; // real gate — no bypass via focus/enter
  if (name === 'welcome' && S.invitation && !isAuthOut()) { show(idx('home')); return; }
  if (name === 'review') { if (!trySubmit()) return; renderSend(); }
  show(Math.min(cur + 1, stepEls.length - 1));
}));
document.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => show(Math.max(cur - 1, 0))));

/* live region */
function announce(msg) {
  const live = document.getElementById('live');
  live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60);
}
const pad = (n) => ('0' + n).slice(-2);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- boot: ONE authoritative initialization ----------------
 * Order: resolve the deep-link token first (await), THEN decide overlay and
 * step exactly once. No later callback reopens the invitation or reassigns
 * the current step. */
async function init() {
  if (INV.initialized) { invLog('init re-entry blocked', 'init'); return; }
  const initVersion = INV.version;
  S._returning = !!S.invitation; // a restored draft means a returning guest
  if (urlToken) {
    try {
      const inv = await lookupInvitation(urlToken);
      if (inv) { setAuthOut(false); adoptInvitation(inv); } // the personal link signs the guest back in
    } catch (e) { /* offline/failed lookup: guest can still use the code field */ }
  }
  if (S.invitation && !isAuthOut()) {
    if (urlRoom) { show(idx('stay'), false); setTimeout(scrollToRoom, 350); } // public CTA: straight to the room, no re-auth
    else
    show(idx('home'), false); // the private area is home — never a repeated code gate
    if (S.submitted) document.getElementById('received-when').textContent =
      'Submitted ' + new Date(S.registration_submitted_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) + ' · status: UNDER REVIEW';
  } else {
    show(0, false);
  }
  renderSummary();
  personalizeInvitation();
  INV.initialized = true;
  // exactly ONE final initial state; a click during loading already set
  // userOpened and the reducer blocks this open (stale/invalid).
  if (INV.userOpened || wasOpenedPersisted() || S.submitted) {
    setInvitationState('closed', 'init', { version: initVersion });
  } else {
    setInvitationState('open', 'init', { version: initVersion });
  }
}
init();

/* ================= BOOKING EXPERIENCE V2 (001 order, 02 SEP 2026) ========
 * Guided configurator layers on top of the existing steps: scope first,
 * participation second, selection third, cost as consequence only. */


/* Retired product stubs (MASTER-02):
 * the ceremony is part of the wedding programme; the USD 15 is solely the
 * contribution for the guest's personal Buddhist offering, reserved per
 * individual. The reason it is not hosted is cultural/religious, never
 * commercial — in Lao Buddhist tradition the offering must come from the
 * person who presents it. */
/* MASTER-02 (406e140): Alms Giving is NOT an active wedding event. The offering
 * product is retired; totals contribute zero and no UI renders it. */
const ALMS_OFFERING_PP = 0;
/* MASTER-02 train cost logic: 1 guest one berth USD 75 · 1 guest private cabin
 * USD 130. The upcharge flows through the single calculation layer. */
function trainCabinUpcharge() {
  const riders = S.guests.filter((g) => g.journey && g.journey.train).length;
  return (riders === 1 && S.trainCabin === 'private') ? 55 : 0;
}
function almsTotal() { return 0; }
function renderWeddingPresets(targetBox, onlyKeys) {
  const box = targetBox || document.getElementById('events-box');
  if (!box || box.querySelector('.wed-presets')) return;
  const ev0 = S.guests[0] ? (S.guests[0].events || {}) : {};
  const allSame = (v) => S.guests.every((g) => ['temple', 'coffee', 'ceremony', 'dinner'].every((k) => !!(g.events || {})[k] === !!v[k]));
  const mode = allSame({ temple: true, coffee: true, ceremony: true, dinner: true }) ? 'full'
    : allSame({ temple: false, coffee: false, ceremony: false, dinner: true }) ? 'dinner' : 'custom';
  /* ONE shared event-participation component (owner completion pass §9-§17):
   * participation JOINING / NOT JOINING per event; joining reveals the dress
   * code + ONE required acknowledgement (semantic state, локale-free). */
  S.dressAck ||= {}; S.dressAck.coffee ||= false;
  const EVJ = [
    ['temple', 'The Temple Ceremony', '28 FEB 2027 · 09:00 AM – approx. 12:00 PM · Wat Ong Teu Temple, Vientiane', 'Lao Traditional Dress',
      ['tradition-01', 'tradition-02', 'tradition-03'],
      'A Buddhist morning ceremony at Wat Ong Teu — unhurried and full of meaning.',
      'https://maps.app.goo.gl/Leuzp4wNBhb9bR9m9?g_st=ic'],
    ['coffee', 'Coffee & Cake', '28 FEB 2027 · from 12:00 · Souphattra Heritage Vientiane', 'Black Tie',
      ['../souphattra/heritage-courtyard-aerial', '../souphattra/heritage-courtyard-pool', 'dinner-04'],
      'Back at the courtyard: coffee, cake and a slow midday together.', null],
    ['ceremony', 'The Vow Ceremony', '28 FEB 2027 · 16:30 · Souphattra Heritage Vientiane', 'Black Tie',
      ['vow-01', 'vow-02', 'vow-03'],
      'Stillness, presence, and the vow made public in front of the people who matter most.', null],
    ['dinner', 'The Wedding Dinner', '28 FEB 2027 · 19:30 · Souphattra Vientiane Hotel', 'Black Tie',
      ['dinner-01', 'dinner-02', 'dinner-03'],
      'Sunset drinks, then dinner in the courtyard garden — a long, unhurried evening together.', null],
  ];
  const evState = (k) => {
    const att = S.guests.filter((g) => g.attending !== false);
    const on = att.filter((g) => (g.events || {})[k]).length;
    return on === 0 ? (S._evDecided && S._evDecided[k] ? 'no' : 'undecided') : 'yes';
  };
  /* editorial image rhythm (§05): key moment = full gallery · supporting =
   * one image · documentary = two · typographic = none. */
  const RHYTHM = { temple: 3, dinner: 3, coffee: 1, ceremony: 0 };
  const html = EVJ.filter(([k]) => !onlyKeys || onlyKeys.includes(k)).map(([k, name, meta, dress, imgs, desc, maps]) => {
    const st = evState(k);
    const ack = !!S.dressAck[k];
    const nImg = RHYTHM[k] != null ? RHYTHM[k] : 3;
    const use = imgs.slice(0, nImg);
    return '<div class="mod" data-evj="' + k + '"><div class="when">' + meta + ' · COMPLIMENTARY</div><h3>' + name + '</h3>' +
      (use.length ? '<div style="display:grid;grid-template-columns:repeat(' + use.length + ',1fr);gap:6px;margin:10px 0 8px">' +
      use.map((f, ix) => '<img src="../assets/images/dress/' + f + '.jpg" alt="' + name + ' — view ' + (ix + 1) + '" data-ev-lb="' + k + '" data-ev-ix="' + ix + '" loading="lazy" decoding="async" style="width:100%;height:' + (use.length === 1 ? '150' : '96') + 'px;object-fit:cover;display:block;cursor:zoom-in"/>').join('') + '</div>' : '') +
      '<p class="note" style="margin:0 0 8px">' + desc + '</p>' +
      (maps ? '<a class="btn sm ghost" style="display:inline-block;margin-bottom:8px" href="' + maps + '" target="_blank" rel="noopener">Open in Google Maps</a>' : '') +
      '<div style="display:flex;gap:14px;margin-top:10px;flex-wrap:wrap">' +
      '<button type="button" class="btn sm' + (st === 'yes' ? '' : ' ghost') + '" data-evj-set="' + k + ':yes">' + (st === 'yes' ? '✓ ' : '') + 'I am joining</button>' +
      '<button type="button" class="btn sm' + (st === 'no' ? '' : ' ghost') + '" data-evj-set="' + k + ':no">' + (st === 'no' ? '✓ ' : '') + 'Not joining</button></div>' +
      (st === 'yes' && dress
        ? '<p class="note" style="margin:10px 0 4px"><strong>Dress code · ' + dress + '</strong></p>' +
          '<label class="confirm-row" style="margin-top:4px"><input type="checkbox" data-evj-ack="' + k + '"' + (ack ? ' checked' : '') + '/><span>I have read and understand the dress code</span></label>' +
          (ack ? '' : '<p class="note" style="margin:4px 0 0">Dress code — action needed</p>')
        : '') +
      '</div>';
  }).join('');
  box.insertAdjacentHTML('afterbegin', '<div class="guest-block wed-presets">' + (onlyKeys ? '' : '<div class="cch-label">The wedding · are you joining?</div>') + html + '</div>');
  box.querySelectorAll('[data-ev-lb]').forEach((im) => im.addEventListener('click', () => {
    const k = im.getAttribute('data-ev-lb');
    const ev = EVJ.find((x) => x[0] === k);
    openLightbox({ name: ev[1], images: ev[4].map((f) => '../assets/images/dress/' + f + '.jpg') }, parseInt(im.getAttribute('data-ev-ix'), 10) || 0);
  }));
  box.querySelectorAll('[data-evj-set]').forEach((b) => b.addEventListener('click', () => {
    const [k, v] = b.getAttribute('data-evj-set').split(':');
    S.guests.forEach((g) => { if (g.attending === false) return; g.events = g.events || {}; g.events[k] = v === 'yes'; });
    S._evDecided = S._evDecided || {}; S._evDecided[k] = true;
    if (v === 'no') S.dressAck[k] = false;
    saveDraft(); renderStep(cur); renderSummary();
  }));
  box.querySelectorAll('[data-evj-ack]').forEach((el) => el.addEventListener('change', () => {
    S.dressAck[el.getAttribute('data-evj-ack')] = el.checked;
    saveDraft(); renderStep(cur); renderSummary();
  }));
}

function renderStayMode() {
  const box = document.getElementById('stay-box');
  if (!box || document.getElementById('stay-mode')) return;
  if (S.stay.mode === 'own') { S.stay.mode = null; saveDraft(); } // own accommodation removed (owner §8)
  const mode = S.stay.mode || 'standard';
  S.stay.mode = mode;
  const nightsN = S.stay.mode === 'oneNight' ? 1 : 2;
  /* dates disclosure in the editorial system — hairline row, no dashboard block */
  box.insertAdjacentHTML('afterbegin',
    '<div id="stay-mode" class="am-req" style="margin:0 0 8px">' +
    (S._fromJourney ? '<button type="button" class="t-act" id="back-to-journey" style="margin-bottom:10px">← Back to your journey</button>' : '') +
    '<p class="cch-label">Your wedding stay · dates</p>' +
    '<div class="cols2" style="margin-top:8px"><div class="field" style="margin-top:0"><label for="stay-cin">Check-in</label><select id="stay-cin">' +
    '<option value="standard"' + (S.stay.mode !== 'oneNight' ? ' selected' : '') + '>27.02.2027</option>' +
    '<option value="oneNight"' + (S.stay.mode === 'oneNight' ? ' selected' : '') + '>28.02.2027</option></select></div>' +
    '<div class="field" style="margin-top:0"><label for="stay-cout">Check-out · fixed</label><input id="stay-cout" type="date" value="2027-03-01" disabled/></div></div>' +
    '<p class="note" style="margin-top:8px">' + nightsN + ' ' + (nightsN === 1 ? 'night' : 'nights') + ' · calculated from your dates · Breakfast included' + (nightsN === 2 ? ' · the second night is hosted by Haruthai & Suthep' : '') + '</p></div>');
  const cs = box.querySelector('#stay-cin');
  if (cs) cs.addEventListener('change', () => {
    S.stay.mode = cs.value === 'oneNight' ? 'oneNight' : 'standard';
    S.stay.checkIn = cs.value === 'oneNight' ? '2027-02-28' : '2027-02-27';
    S.stay.oneNight = null;
    saveDraft(); renderStep(cur); renderSummary();
  });
  const bj = box.querySelector('#back-to-journey');
  if (bj) bj.addEventListener('click', () => {
    S._fromJourney = false;
    show(idx('home'));
    setTimeout(() => { const l = document.getElementById('laos-journey'); if (l) l.scrollIntoView({ block: 'start' }); }, 250);
  });
}

function renderReviewScope() {
  S.scope ||= { bangkok: false, laos: true, china: false };
  const box = document.getElementById('review-box');
  if (!box || document.getElementById('rv-scope')) return;
  const parts = ['Laos · The Wedding'];
  if (S.scope.bangkok) parts.unshift('Bangkok');
  if (S.scope.china) parts.push('China · Onward Journey');
  const exps = (S.experiences || []);
  box.insertAdjacentHTML('afterbegin',
    '<div class="guest-block" id="rv-scope"><div class="cch-label">Your journey</div>' +
    '<p class="note">' + parts.join(' · ') + '</p>' +
    (exps.length ? '<div class="cch-label" style="margin-top:10px">Experiences noted</div><p class="note">' + exps.map((e) => e.name).join('<br/>') + '</p>' : '') +
    '<button type="button" class="btn sm ghost" data-rv-edit="home">Edit</button></div>');
  box.querySelector('[data-rv-edit]').addEventListener('click', () => show(idx('home')));
}

/* My Travel honours the Journey Scope (order §6/§12): the scope decision has
 * exactly one home (My Journey); Bangkok/China products vanish entirely when
 * their destination is not part of the guest's journey. */
