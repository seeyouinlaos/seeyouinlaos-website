/**
 * See You In Laos — Guest Registration · flow application.
 * Presentation + state wiring only; business rules live in logic.mjs,
 * content in data.mjs. No backend: drafts persist to localStorage, the
 * demo inventory is app-managed (production dependency documented in
 * data.mjs and the handoff report).
 */
import {
  WEDDING, CONTACTS, JOURNEY_MODULES, EVENTS, ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN,
  TRANSFERS, PACKAGE_INCLUSIONS, COPY, DEMO_MODE, PUBLICATION, TRAIN_REFERENCE, BERTH_PREFS, BANGKOK_STAYS, POST_WEDDING, lookupInvitation,
} from './data.mjs';
import {
  contributionPerGuest, partyCharges, partyTotal, money as usdMoney, displayMoney,
  trainContribution, transfersTotal, journeyTotal, postWeddingTotal,
  createInventory, remaining, availabilityLabel, requestAllocation,
  validateRegistration, buildNotification, nextInvitationState,
} from './logic.mjs';

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
const pwTotal = () => postWeddingTotal(POST_WEDDING, S.postWedding && S.postWedding.joined, attendingCount());
function bkkNights() {
  const b = S.bangkokStay || {};
  if (!(b.from && b.to)) return 0;
  const d = Math.round((new Date(b.to) - new Date(b.from)) / 86400000);
  return d > 0 ? d : 0;
}
function bkkTotal() {
  const b = S.bangkokStay || {};
  if (!b.property) return 0;
  const h = BANGKOK_STAYS.find((x) => x.id === b.property);
  if (!h || !h.nightly) return 0;
  const n = bkkNights();
  return n ? h.nightly * n : 0;
}
const gal3 = (imgs, alt) => imgs && imgs.length
  ? '<div class="train-gal">' + imgs.slice(0, 3).map((src, i) => '<img src="' + src + '" alt="' + esc(alt) + ' · view ' + (i + 1) + '" loading="lazy" decoding="async"/>').join('') + '</div>'
  : '';
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
function roomPriceHtml(a) {
  if (a.contributionPerGuest == null) {
    return '<div class="acc-price"><span class="per">Complimentary · limited availability</span></div>';
  }
  const per = contributionPerGuest(a);
  return '<div class="acc-price"><span class="amt">' + showAmount(per) + '</span>' +
    '<span class="per">total contribution · per guest</span></div>';
}
function guestAvailability(res, unitPlural) {
  if (!res) return '';
  if (PUBLICATION.inventoryDisplay === 'EXACT') return availabilityLabel(res);
  const total = res.capacity_total;
  const unit = unitPlural || 'rooms';
  if (remaining(res) <= 0) return 'Waitlist · Guest Relations will confirm';
  return total + ' ' + (total === 1 ? unit.replace(/s$/, '') : unit) + ' allocated';
}
/* the availability statement printed onto the gallery photography */
function availOverlay(a, res, selected) {
  if (a.selectable === false) return 'Reserved';
  if (a.kind === 'airbnb') return 'Complimentary · limited';
  if (selected) return 'Requested';
  if (!res) return '';
  const total = res.capacity_total, rem = remaining(res);
  if (rem <= 0) return 'Waitlist';
  if (rem === 1 && total > 1) return 'Last room';
  return rem + ' of ' + total + ' available';
}

let inventory = loadInventory();
let S = loadDraft() || freshState();
S.transfers ||= []; // legacy drafts predate transfer products

function freshState() {
  return {
    invitation: null,           // resolved invitation (party + guests)
    guests: [],                 // per-guest working records
    partyPlans: 'same',         // 'same' | 'different'
    stay: { accommodationId: null, occupantGuestIds: [], rooms: 1, bed: '', request: '' },
    arrival: { shared: true, mode: 'flight', pickupRequested: false },
    arrivalByGuest: {},
    departure: { shared: true, transferRequested: false },
    departureByGuest: {},
    additionalGuestRequest: '',
    dressAck: { alms: false, ceremony: false, dinner: false }, // per-event dress code acknowledgement (§21)
    bangkokStay: { property: null, from: '', to: '' },          // optional Bangkok stay (§2-3): property + guest chosen dates
    postWedding: { joined: false },                             // optional Post Wedding Journey opt in (§16)
    transfers: [],           // [{ transferId, units, details:{date,time,ref,place,location} }]
    trainNote: '',
    notes: '',
    submitted: false,
    registration_submitted_at: null,
  };
}
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ }
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
  if (name === 'journey') renderJourney();
  if (name === 'events') renderEvents();
  if (name === 'stay') renderStay();
  if (name === 'spa') renderSpa();
  if (name === 'each') renderEach();
  if (name === 'cost') renderCost();
  if (name === 'review') renderReview();
  if (name === 'send') renderSend();
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
  const inv = await lookupInvitation(findInput.value);
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
      attending: true, email: '', phone: '', dob: '',
      journey: { bangkok: false, train: false, independent: true },
      events: { alms: true, ceremony: true, dinner: true },
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
  ['home', 'My Journey'], ['journey', 'My Travel'], ['stay', 'My Stay'],
  ['events', 'My Wedding'], ['each', 'My Profile'], ['cost', 'My Contribution'],
];
function renderPrivnav() {
  const nav = document.getElementById('privnav');
  if (!nav) return;
  const siteNav = document.getElementById('sitenav');
  if (!S.invitation || isAuthOut()) {
    nav.hidden = true;
    if (siteNav) siteNav.hidden = false;
    return;
  }
  nav.hidden = false;
  // inside the Guest Area the personal navigation is the only navigation —
  // the logo carries the way home to MY JOURNEY.
  if (siteNav) siteNav.hidden = true;
  const name = stepEls[cur].dataset.step;
  /* level-2 rule (owner): exactly ONE active subsection. "Guest Area" stays
   * available as the dashboard/home link but NEVER carries an active state —
   * the active marker belongs to the one current subsection button. */
  /* item 11: the guest is already inside the Guest Area — the personal
   * navigation starts directly with MY JOURNEY; INVITATION lives with the
   * utilities (Website · Save · Log out), never inside the booking steps. */
  nav.innerHTML = PRIVNAV.map(([st, label]) =>
    '<button type="button" data-nav="' + st + '"' + (name === st ? ' aria-current="true"' : '') + '>' + label + '</button>').join('') +
    '<span class="pn-exit"><button type="button" id="nav-invitation">Invitation</button><button type="button" id="pn-home">Website</button><button type="button" id="pn-save">Save</button><button type="button" id="log-out">Log out</button></span>';
  const mark = document.getElementById('site-mark');
  if (mark && !mark.dataset.wired) {
    mark.dataset.wired = '1';
    mark.addEventListener('click', (e) => {
      if (!S.invitation || isAuthOut()) return;   // signed out: the logo leads to the website
      e.preventDefault(); saveDraft(); show(idx('home'));
    });
  }
  nav.querySelector('#pn-home').addEventListener('click', () => {
    saveDraft(); location.href = '../'; // progress saved; the personal link reopens the journey
  });
  nav.querySelector('#nav-invitation').addEventListener('click', () => {
    setInvitationState('open', 'privnav-invitation', { force: true });
  });
  nav.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-nav')))));
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
  const lead = S.invitation.guests.find((g) => g.guestId === S.invitation.partyLead) || S.invitation.guests[0];
  document.getElementById('home-title').innerHTML =
    'Welcome' + (S._returning ? ' back' : '') + ',<br/>' + esc(lead.preferredName) + '.';
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const riders = S.guests.filter((g) => g.journey.train);
  const anyEvents = S.guests.some((g) => Object.values(g.events || {}).some(Boolean));
  const detailsMissing = S.guests.filter((g) => g.attending !== false && !(g.email || g.phone)).length;
  const tc = trainContribution(TRAIN, riders.length) || 0;
  const trf = transfersTotal(TRANSFERS, S.transfers, riders.length);
  const total = journeyTotal(acc, occ, TRAIN, riders.length, TRANSFERS, S.transfers) + pwTotal() + bkkTotal();
  const card = (step, label, main, sub, status, image) =>
    '<button type="button" class="home-card" data-jump="' + step + '">' +
    (image ? '<span class="hc-img"><img src="' + roomImg(image) + '" alt="" width="1200" height="800" loading="lazy" decoding="async"/></span>' : '') +
    '<div class="hc-label">' + label + '</div>' +
    '<div class="hc-main">' + main + '</div>' +
    (sub ? '<div class="hc-sub">' + sub + '</div>' : '') +
    (status ? '<span class="hc-status">' + status + '</span>' : '') +
    '</button>';
  box.innerHTML =
    '<p class="home-hello">' + esc(S.invitation.partyName) + ' · Vientiane · February 2027</p>' +
    '<p class="note">' + esc(COPY.sharedHome) + '</p>' +
    '<div class="home-grid">' +
    card('stay', 'My Stay', acc ? esc(acc.name) : 'Choose your room',
      acc ? (acc.contributionPerGuest == null ? 'Complimentary · coordinated by Guest Relations' : showAmount(contributionPerGuest(acc)) + ' per guest · total ' + money(partyTotal(acc, occ))) : 'Souphattra Heritage Vientiane, our shared home',
      acc ? (S.stay.waitlist ? 'WAITLISTED' : 'REQUESTED') : 'OPEN',
      acc ? (acc.images || [])[0] : null) +
    card('journey', 'My Travel', riders.length ? 'Overnight Sleeper Train' : 'Your way to Laos',
      (riders.length ? riders.length + ' seat' + (riders.length > 1 ? 's' : '') + ' · ' + money(tc) : 'Train, transfers and your own way, each with its price') +
      ((S.transfers || []).length ? ' · ' + S.transfers.length + ' transfer' + (S.transfers.length > 1 ? 's' : '') + ' · ' + money(trf) : ''),
      (riders.length || (S.transfers || []).length) ? 'REQUESTED' : null) +
    card('events', 'My Wedding', 'The wedding days',
      'Sunday, 28 February 2027 · Souphattra Heritage Vientiane',
      anyEvents ? 'REGISTERED' : 'OPEN') +
    card('each', 'My Profile', detailsMissing ? detailsMissing + ' detail' + (detailsMissing > 1 ? 's' : '') + ' still needed' : 'Personal details',
      'Contact, dietary needs and the small preferences that shape your stay',
      detailsMissing ? 'OPEN' : 'COMPLETE') +
    card('cost', 'My Contribution', money(total),
      (acc ? (acc.contributionPerGuest == null ? 'Stay complimentary · limited' : 'Stay ' + money(partyTotal(acc, occ))) : 'No stay selected yet') +
      (riders.length ? ' · train ' + money(tc) : '') +
      ((S.transfers || []).length ? ' · transfers ' + money(trf) : ''),
      S.submitted ? 'UNDER REVIEW' : null) +
    card('review', 'Your Journey, at a glance', S.submitted ? 'Registration received' : 'Review & send',
      S.submitted ? 'Guest Relations is preparing your journey' : 'One quiet look over everything before it reaches Guest Relations',
      S.submitted ? 'UNDER REVIEW' : null) +
    '</div>' +
    '<div class="home-next"><div class="label">' + (S.submitted ? 'Status' : 'Next step') + '</div>' +
    (S.submitted
      ? 'Your registration is with Guest Relations. Khun Ket and Khun Paddy personally review every detail, usually within 4–8 hours. Your private area stays open; no action needed.'
      : (!acc ? 'Choose where you wake up: your room at Souphattra Heritage Vientiane.'
        : detailsMissing ? 'A few personal details are still open so the table can be set around you.'
        : 'Everything is in place. Review your journey and send it to Guest Relations.')) +
    '</div>' +
    grCardHtml() +
    '<div class="stepnav"><span></span><button class="btn" id="home-cta">' +
    (S.submitted ? 'View your journey' : 'Continue your journey') + '</button></div>';
  box.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => show(idx(b.getAttribute('data-jump')))));
  box.querySelector('#home-cta').addEventListener('click', () => {
    if (S.submitted) { show(idx('review')); return; }
    if (!acc) { show(idx('stay')); return; }
    if (detailsMissing) { show(idx('each')); return; }
    show(idx('review'));
  });
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
function renderJourney() {
  const box = document.getElementById('journey-box');
  const trainRes = inventory.train;
  const trainLabel = guestAvailability(trainRes, 'seats');
  const trainFull = remaining(trainRes) <= 0;
  const anyTrain = S.guests.some((g) => g.journey.train);
  box.innerHTML = '<p class="note" style="margin-bottom:22px">The road to the wedding: Bangkok · the overnight train · Nong Khai · Vientiane · the wedding days.</p>' + modulePicker({
    title: null,
    modules: [
      { id: 'bangkok', label: 'The Bangkok Journey', when: 'Before the wedding', blurb: 'The shared days in Bangkok before travelling on to Laos.' },
    ],
    field: 'journey',
  }) + travelChoiceBlock(trainLabel, trainFull) +
    bangkokStayBlock() +
    renderTravel() +
    postWeddingBlock();
  wireModulePicker(box, 'journey');
  wireTravelChoice(box);
  wireTrainDetails(box);
  wireBangkokStay(box);
  wirePostWedding(box);
  wireTransfers(box);
}

/* §Travel-choice: ONE journey decision, TWO alternatives, ONE selection.
 * The overnight train and an independent arrival answer the same question —
 * they are never two separate yes/no questionnaires. Same stored fields
 * (journey.train / journey.independent), strictly mutually exclusive. */
function travelChoiceBlock(trainLabel, trainFull) {
  const many = S.guests.length > 1;
  const differs = S.partyPlans === 'different' && many;
  const optionCard = (opt, g) => {
    const onTrain = g ? !!g.journey.train : S.guests.every((x) => x.journey.train);
    const sel = opt === 'train' ? onTrain : !onTrain;
    const who = g ? '\u00A0· for ' + esc(g.preferredName) : '';
    if (opt === 'train') {
      return '<article class="tj-opt' + (sel ? ' sel' : '') + '" data-opt="train">' +
        '<div class="when">Bangkok → Nong Khai → Vientiane · ' + money(TRAIN.contributionPerGuest) + ' per guest · ' + esc(trainLabel) + '</div>' +
        '<h4>The Overnight Train</h4>' +
        '<p class="note">Special Express No. 25 · departs Krung Thep Aphiwat Central Terminal 20:25, arrives Nong Khai 06:45 · 10 hours 20 minutes · First Class Sleeper. Guest Relations coordinates the journey and ticket arrangements; only guests who join are charged.</p>' +
        '<div class="train-gal">' + ['train-01', 'train-04', 'train-03'].map((f, ti) => '<img src="../assets/images/train/' + f + '.jpg" alt="First Class Sleeper aboard Special Express No. 25 · view ' + (ti + 1) + '" loading="lazy" decoding="async"/>').join('') + '</div>' +
        '<div class="acc-actions"><button type="button" class="btn sm' + (sel ? '' : ' ghost') + '" data-choice="train" data-who="' + (g ? g.guestId : 'party') + '" aria-pressed="' + sel + '">' +
        (sel ? 'Joining the train' + who : (trainFull ? 'Join the waitlist' + who : 'I\u2019m joining' + who)) + '</button></div>' +
        (sel ? '<div class="acc-avail" style="border-top:none;padding-top:8px">REQUESTED · Guest Relations confirms your seats personally</div>' + (g ? '' : trainDetailBlock()) : '') +
        '</article>';
    }
    return '<article class="tj-opt' + (sel ? ' sel' : '') + '" data-opt="own">' +
      '<div class="when">Your own way</div>' +
      '<h4>Arriving independently in Vientiane</h4>' +
      '<p class="note">Fly or travel on your own schedule; we meet you there.</p>' +
      '<div class="acc-actions"><button type="button" class="btn sm' + (sel ? '' : ' ghost') + '" data-choice="own" data-who="' + (g ? g.guestId : 'party') + '" aria-pressed="' + sel + '">' +
      (sel ? 'Arriving independently' + who : 'I\u2019ll arrive independently' + who) + '</button></div>' +
      '</article>';
  };
  const pair = (g) => '<div class="tj-pair" role="radiogroup" aria-label="How would you like to travel to Vientiane' + (g ? ' — ' + esc(g.preferredName) : '') + '?">' + optionCard('train', g) + optionCard('own', g) + '</div>';
  return '<div class="mod tj-choice"><div class="mod-head"><div>' +
    '<div class="when">Journey to Vientiane · one decision, two ways</div>' +
    '<h3>How would you like to travel to Vientiane?</h3>' +
    '<p>Choose the way that suits you — selecting one quietly sets the other aside.</p>' +
    '</div></div>' +
    (differs ? S.guests.map((g) => pair(g)).join('') : pair(null)) +
    '</div>';
}
function wireTravelChoice(box) {
  box.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => {
    const toTrain = b.getAttribute('data-choice') === 'train';
    const who = b.getAttribute('data-who');
    const trainFull = remaining(inventory.train) <= 0;
    const apply = (g) => {
      g.journey.train = toTrain;               // one effective choice —
      g.journey.independent = !toTrain;        // never both, never neither
      if (toTrain && trainFull) g.journey.trainWaitlist = true;
    };
    if (who === 'party') S.guests.forEach(apply);
    else { const g = S.guests.find((x) => x.guestId === who); if (g) apply(g); }
    // §6: without the train there is no Nong Khai arrival — its coordinated
    // transfer leaves the journey with it, so nothing charges silently.
    if (!S.guests.some((g) => g.journey.train)) {
      S.transfers = (S.transfers || []).filter((x) => {
        const t = TRANSFERS.find((y) => y.id === x.transferId);
        return !(t && t.fieldsFor === 'train');
      });
    }
    saveDraft(); renderStep(cur); renderSummary();
    announce(toTrain
      ? 'The Overnight Train is part of your journey — ' + money(TRAIN.contributionPerGuest) + ' per participating guest, REQUESTED.'
      : 'You are arriving independently in Vientiane; Guest Relations meets you there.');
  }));
}

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
function guestStops() {
  const anyBkk = S.guests.some((g) => g.journey.bangkok);
  const anyTrain = S.guests.some((g) => g.journey.train);
  const stops = [];
  if (anyBkk || anyTrain) stops.push({ n: 'Bangkok', s: anyTrain ? 'Krung Thep Aphiwat · 20:25' : 'before the wedding' });
  if (anyTrain) stops.push({ n: 'Nong Khai', s: 'by night train · 06:45', mid: true, seg: 'train' });
  stops.push({ n: 'Vientiane', s: 'the wedding · 28 February 2027', seg: anyTrain ? 'ground' : 'journey' });
  if (S.postWedding && S.postWedding.joined) {
    stops.push({ n: 'Kunming', s: '1 March 2027', mid: true, seg: 'flight' });
    stops.push({ n: 'Lijiang', s: '4 – 6 March 2027', mid: true, seg: 'journey' });
    stops.push({ n: 'Bangkok', s: 'return · 6 March 2027', seg: 'flight' });
  }
  return stops;
}
let GMAP = null;
/** Real-basemap guest map (OpenStreetMap data via CARTO light tiles). */
function mountGuestMap() {
  const el = document.getElementById('gmap');
  if (!el || !window.L) return;
  if (GMAP) { try { GMAP.remove(); } catch (e) { /* already detached */ } GMAP = null; }
  const stops = guestStops();
  if (stops.length < 2) return;
  const SEG_STYLE = {
    train: { color: '#2B2823', weight: 2.2, opacity: .85 },
    ground: { color: '#805A52', weight: 2, opacity: .85 },
    flight: { color: '#74070E', weight: 1.6, opacity: .8, dashArray: '3 8' },
    journey: { color: '#2B2823', weight: 1.8, opacity: .7, dashArray: '1 6' },
  };
  GMAP = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25, zoomDelta: 0.5 });
  /* English/Latin-only real basemap (Esri World Light Gray + English reference). */
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA', maxZoom: 12,
  }).addTo(GMAP);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 12, opacity: .5,
  }).addTo(GMAP);
  for (let i = 1; i < stops.length; i++) {
    L.polyline([CITY_LL[stops[i - 1].n], CITY_LL[stops[i].n]], SEG_STYLE[stops[i].seg || 'journey']).addTo(GMAP);
  }
  const LBL = {
    Bangkok: { dir: 'right', off: [13, 4] },
    'Nong Khai': { dir: 'bottom', off: [0, 11] },
    Vientiane: { dir: 'left', off: [-13, -7] },
    Kunming: { dir: 'right', off: [13, 0] },
    Lijiang: { dir: 'left', off: [-13, 0] },
  };
  stops.forEach((st, i) => {
    const pl = LBL[st.n];
    const m = L.marker(CITY_LL[st.n], { icon: L.divIcon({ className: 'jm-dot' + (st.mid ? ' mid' : ''), iconSize: [11, 11] }) }).addTo(GMAP);
    if (!(i === stops.length - 1 && st.n === 'Bangkok')) m.bindTooltip(st.n, { permanent: true, direction: pl.dir, offset: pl.off, className: 'jm-label' });
    m.bindPopup('<span class="jm-city">' + esc(st.n) + '</span><span class="jm-meta">' + esc(st.s) + '</span>');
  });
  GMAP.fitBounds(L.latLngBounds(stops.map((st) => CITY_LL[st.n])),
    { padding: window.innerWidth < 640 ? [26, 22] : [44, 44] });
}
/* The real map when the library is available; the schematic SVG only as an
 * offline fallback (standalone build). */
function journeyRouteCard() {
  if (window.L) {
    if (guestStops().length < 2) return '';
    return '<div class="journey-route"><div class="label">Your route</div><div class="jr-map" id="gmap" role="region" aria-label="Your journey on the map"></div></div>';
  }
  const anyBkk = S.guests.some((g) => g.journey.bangkok);
  const anyTrain = S.guests.some((g) => g.journey.train);
  const arr = (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId)).find((t) => t && t.direction === 'arrival');
  const stops = [];
  if (anyBkk) stops.push({ t: 'Bangkok', s: 'before the wedding' });
  if (anyTrain) {
    if (!anyBkk) stops.push({ t: 'Bangkok', s: 'Krung Thep Aphiwat · 20:25' });
    stops.push({ t: 'Nong Khai', s: 'by night train · 06:45' });
  }
  stops.push({ t: 'Vientiane', s: arr ? 'met on arrival' : 'the wedding', end: true });
  if (stops.length < 2) return '';
  const W = 600, pad = 78, span = (W - pad * 2) / (stops.length - 1);
  const seg = stops.map((st, i) => {
    if (i === 0) return '';
    const x1 = pad + span * (i - 1), x2 = pad + span * i;
    const dashed = st.end && anyTrain; // the border crossing reads as a soft transition
    return '<line x1="' + x1 + '" y1="46" x2="' + x2 + '" y2="46" stroke="var(--' + (dashed ? 'cherry' : 'ink') + ')" stroke-width="' + (dashed ? 1.1 : 1.3) + '"' + (dashed ? ' stroke-dasharray="2 6"' : '') + '/>';
  }).join('');
  const dots = stops.map((st, i) => {
    const x = pad + span * i;
    return '<circle cx="' + x + '" cy="46" r="' + (st.end ? 4.5 : 3.5) + '" fill="var(--' + (st.end ? 'cherry' : 'ink') + ')"/>' +
      (st.end ? '<circle cx="' + x + '" cy="46" r="9" stroke="var(--cherry)" stroke-width="1" opacity=".45" fill="none"/>' : '') +
      '<text x="' + x + '" y="72" text-anchor="middle" fill="var(--' + (st.end ? 'cherry' : 'ink') + ')" style="font-size:11px;letter-spacing:.2em;text-transform:uppercase">' + esc(st.t) + '</text>' +
      '<text x="' + x + '" y="88" text-anchor="middle" fill="var(--ink)" opacity=".58" style="font-size:9px;letter-spacing:.08em">' + esc(st.s) + '</text>';
  }).join('');
  return '<div class="journey-route" role="img" aria-label="Your route: ' + stops.map((x) => x.t).join(' to ') + '">' +
    '<div class="label">Your route</div>' +
    '<svg viewBox="0 0 ' + W + ' 100" fill="none" aria-hidden="true">' + seg + dots + '</svg></div>';
}

/* §2-3 · the Bangkok stay: curated choice, guest chosen dates, quiet pending
 * contribution — never an invented price. */
function bangkokStayBlock() {
  if (!S.guests.some((g) => g.journey.bangkok)) return '';
  S.bangkokStay ||= { property: null, from: '', to: '' };
  const b = S.bangkokStay;
  return '<div class="guest-block" id="bkk-stay"><h3>Your Bangkok stay</h3>' +
    '<p class="note">The journey stays at the Siam Kempinski; choose the dates that suit you and Guest Relations confirms your room personally.</p>' +
    BANGKOK_STAYS.map((h) => {
      const sel = b.property === h.id;
      const n = sel ? bkkNights() : 0;
      return '<article class="trf-card' + (sel ? ' sel' : '') + '">' +
      '<div class="label">' + esc(h.role) + ' · Bangkok</div><h4>' + esc(h.name) + '</h4>' +
      gal3(h.images, h.name) +
      '<p class="note">' + esc(h.room) + '</p>' +
      '<div class="trf-price">' + money(h.nightly) + ' per night' +
        (n ? ' · ' + n + ' night' + (n > 1 ? 's' : '') + ' · ' + money(h.nightly * n)
           : ' · the journey stay: ' + h.nights + ' nights · ' + money(h.total)) + '</div>' +
      '<div class="acc-actions">' + (sel
        ? '<button type="button" class="btn sm" data-bkk-rm="' + h.id + '">Remove from journey</button>'
        : '<button type="button" class="btn sm" data-bkk="' + h.id + '">Request this stay</button>') + '</div>' +
      (sel ? '<div class="cols2" style="margin-top:12px">' +
        '<div class="field"><label>Arrival in Bangkok</label><input type="date" data-bkk-date="from" value="' + esc(b.from) + '"/></div>' +
        '<div class="field"><label>Onward to the wedding</label><input type="date" data-bkk-date="to" value="' + esc(b.to) + '"/></div></div>' +
        '<div class="acc-avail" style="border-top:none;padding-top:8px">REQUESTED · Guest Relations confirms your room personally</div>' : '') +
      '</article>'; }).join('') + '</div>';
}
function wireBangkokStay(box) {
  box.querySelectorAll('[data-bkk]').forEach((btn) => btn.addEventListener('click', () => {
    S.bangkokStay = { ...(S.bangkokStay || {}), property: btn.getAttribute('data-bkk') };
    saveDraft(); renderStep(cur, false); renderSummary();
  }));
  box.querySelectorAll('[data-bkk-rm]').forEach((btn) => btn.addEventListener('click', () => {
    S.bangkokStay = { property: null, from: '', to: '' };
    saveDraft(); renderStep(cur, false); renderSummary();
  }));
  box.querySelectorAll('[data-bkk-date]').forEach((el) => el.addEventListener('change', () => {
    S.bangkokStay[el.getAttribute('data-bkk-date')] = el.value;
    saveDraft(); renderStep(cur, false); renderSummary();
  }));
}

/* §10-16 · the optional Post Wedding Journey: a real opt in whose components
 * flow into travel, contribution and review. Missing operational data renders
 * as a quiet pending state, never as an invention. */
function postWeddingBlock() {
  S.postWedding ||= { joined: false };
  const joined = !!S.postWedding.joined;
  return '<div class="guest-block" id="post-wedding"><h3>The Post Wedding Journey</h3>' +
    '<div class="label" style="margin:4px 0 8px">Vientiane → Kunming → Lijiang → Bangkok · 1 – 6 March 2027</div>' +
    '<p class="note">' + HSLOCK + 'continue to Kunming and Lijiang after the wedding. If you would like to join the onward journey, we will prepare it with you.</p>' +
    '<div class="join" role="radiogroup" aria-label="Post Wedding Journey">' +
    '<label><input type="radio" name="pw-join" value="yes"' + (joined ? ' checked' : '') + '/><span class="yes">We would love to join</span></label>' +
    '<label><input type="radio" name="pw-join" value="no"' + (!joined ? ' checked' : '') + '/><span class="no">Not this time</span></label></div>' +
    (joined ? POST_WEDDING.map((c) => '<article class="trf-card sel">' +
      '<div class="label">' + esc(c.type) + ' · ' + esc(c.when) + '</div>' +
      '<h4>' + esc(c.label) + '</h4>' +
      gal3(c.images, c.label) +
      (c.sub ? '<p class="note">' + esc(c.sub) + '</p>' : '') +
      '<div class="trf-price">' + (c.contribution != null
        ? (c.perGuest ? money(c.contribution) + ' per guest'
           : money(c.nightly) + ' per night · ' + c.nights + ' nights · ' + money(c.contribution))
        : (c.priceNote ? esc(c.priceNote) : 'Contribution follows with Guest Relations')) + '</div>' +
      '<div class="acc-avail" style="border-top:none;padding-top:6px">REQUESTED · Guest Relations confirms every detail personally</div>' +
      '</article>').join('') : '') +
    '</div>';
}
function wirePostWedding(box) {
  box.querySelectorAll('input[name="pw-join"]').forEach((el) => el.addEventListener('change', () => {
    S.postWedding = { joined: el.value === 'yes' && el.checked };
    saveDraft(); renderStep(cur, false); renderSummary();
  }));
}
const HSLOCK = '<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>';

function trainDetailBlock() {
  const riders = S.guests.filter((g) => g.journey.train);
  if (!riders.length) return '';
  return '<div class="train-inner" id="train-details">' +
    '<div class="stay-sum" style="margin:14px 0 18px"><div class="row"><span class="l">' + riders.length + ' guest' + (riders.length > 1 ? 's' : '') + ' × ' + money(TRAIN.contributionPerGuest) + '</span><span class="r">' + money(trainContribution(TRAIN, riders.length) || 0) + '</span></div></div>' +
    '<p class="note">' + riders.length + ' seat' + (riders.length > 1 ? 's' : '') + ' will be requested — one per travelling Guest. Guest Relations coordinates the booking personally; nothing is booked here.</p>' +
    riders.map((g) => '<div class="field"><label>' + esc(g.preferredName) + ' · sleeper preference</label><select data-berth="' + g.guestId + '">' +
      BERTH_PREFS.map((o) => '<option' + ((g.berth || 'No preference') === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>').join('') +
    '<p class="note">We will do our best to arrange your preferred berth. Final allocation depends on railway availability.</p>' +
    '<div class="field"><label>Anything that matters for the train journey (mobility, luggage, comfort)</label><textarea id="train-note">' + esc(S.trainNote || '') + '</textarea></div>' +
    '<p class="note">You arrive at <strong>Nong Khai Railway Station</strong>; your onward journey to Vientiane is chosen below under your arrival. Route reference: <a href="' + TRAIN_REFERENCE + '" rel="noopener" target="_blank">State Railway of Thailand</a> — for reading only, no booking needed.</p>' +
    '</div>';
}
function wireTrainDetails(box) {
  box.querySelectorAll('[data-berth]').forEach((el) => el.addEventListener('change', () => {
    const g = S.guests.find((x) => x.guestId === el.getAttribute('data-berth'));
    if (g) g.berth = el.value === 'No preference' ? '' : el.value;
    saveDraft();
  }));
  const tn = box.querySelector('#train-note');
  if (tn) tn.addEventListener('input', () => { S.trainNote = tn.value; saveDraft(); });
}

/* ---------------- step 4 · events ---------------- */
function renderEvents() {
  const box = document.getElementById('events-box');
  S.dressAck ||= { alms: false, ceremony: false, dinner: false }; // older drafts predate the acknowledgement
  S.guests.forEach((g) => { g.events.ceremony = true; }); // mandatory programme moment — normalise older drafts
  box.innerHTML = modulePicker({
    modules: EVENTS.map((e) => ({ id: e.id, label: e.label, when: e.when + ' · ' + e.venue, blurb: e.blurb, locked: e.id === 'ceremony', dress: e.dress, dressGroup: e.dressGroup })),
    field: 'events',
    sharedOnly: true, // one shared Wedding Programme per invitation (item 6)
  });
  wireModulePicker(box, 'events');
}

/** Party-level module picker with per-guest split (“WE HAVE DIFFERENT PLANS”). */
function modulePicker({ modules, field, sharedOnly }) {
  const differs = !sharedOnly && S.partyPlans === 'different';
  const many = S.guests.length > 1;
  let html = '';
  if (many && !sharedOnly) {
    html += '<div class="plans-toggle" role="radiogroup" aria-label="Shared or individual plans">' +
      '<label><input type="radio" name="plans-' + field + '" value="same"' + (!differs ? ' checked' : '') + '/><span>One plan for all of us</span></label>' +
      '<label><input type="radio" name="plans-' + field + '" value="different"' + (differs ? ' checked' : '') + '/><span>We have different plans</span></label>' +
      '</div>';
  }
  const cols = differs && many ? S.guests : [S.guests[0]];
  html += modules.map((m) => {
    const rows = (differs && many ? S.guests : [null]).map((g) => {
      const joined = g ? !!g[field][m.id] : S.guests.every((x) => x[field][m.id]) || S.guests[0][field][m.id];
      const nm = 'mod-' + field + '-' + m.id + '-' + (g ? g.guestId : 'party');
      return '<div class="join-row">' +
        (g ? '<span class="join-who">' + esc(g.preferredName) + '</span>' : '') +
        '<div class="join" role="radiogroup" aria-label="' + esc(m.label) + (g ? ' for ' + esc(g.preferredName) : '') + '">' +
        '<label><input type="radio" name="' + nm + '" value="yes"' + ((m.locked || (joined && !m.disabled)) ? ' checked' : '') + ((m.disabled || m.locked) ? ' disabled' : '') + (m.locked ? ' aria-disabled="true"' : '') + '/><span class="yes' + (m.locked ? ' locked-yes' : '') + '">I’m joining</span></label>' +
        '<label><input type="radio" name="' + nm + '" value="no"' + ((!m.locked && (!joined || m.disabled)) ? ' checked' : '') + (m.locked ? ' disabled aria-disabled="true"' : '') + '/><span class="no">Not joining</span></label>' +
        (m.waitlist ? '<label><input type="radio" name="' + nm + '" value="waitlist"/><span class="no">Join the waitlist</span></label>' : '') +
        '</div></div>';
    }).join('');
    return '<div class="mod" data-mod="' + m.id + '">' +
      '<div class="mod-head"><div><div class="when">' + esc(m.when) + '</div><h3>' + esc(m.label) + '</h3><p>' + esc(m.blurb) + '</p>' + (m.id === 'train' ? '<div class="train-gal">' + ['train-01','train-04','train-03'].map((f, ti) => '<img src="../assets/images/train/' + f + '.jpg" alt="First Class Sleeper aboard Special Express No. 25 · view ' + (ti + 1) + '" loading="lazy" decoding="async"/>').join('') + '</div>' : '') +
      (m.dress ? (function () {
        const anyJoin = m.locked || S.guests.some((x) => x[field][m.id]);
        const ok = !!(S.dressAck && S.dressAck[m.id]);
        return '<div class="dress-req">' +
          '<div class="label">Dress code</div>' +
          '<div class="dress-name serif">' + esc(m.dress) + '</div>' +
          '<div class="dress-gal">' + [1, 2, 3].map((i) => '<img src="../assets/images/dress/' + m.dressGroup + '-0' + i + '.jpg" alt="' + esc(m.dress) + ' dress reference ' + i + '" loading="lazy" decoding="async"/>').join('') + '</div>' +
          '<p class="note">The dress code is part of this moment and applies to all guests attending. Please make sure you are comfortable following it before confirming your attendance. Guests who are not dressed in accordance with the required attire may not be able to join the event.</p>' +
          (anyJoin ? '<label class="ack-row' + (ok ? ' ok' : '') + '"><input type="checkbox" data-ack="' + m.id + '"' + (ok ? ' checked' : '') + '/><span>I have read and understand the dress code<small class="ack-i18n">Ich habe den Dresscode gelesen und verstanden \u00B7 \u0E09\u0E31\u0E19\u0E44\u0E14\u0E49\u0E2D\u0E48\u0E32\u0E19\u0E41\u0E25\u0E30\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E01\u0E32\u0E23\u0E41\u0E15\u0E48\u0E07\u0E01\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27</small></span></label>' : '') +
          '</div>';
      })() : '') +
      (m.disabled ? '<p class="cap-full">Fully allocated</p>' : '') + '</div>' +
      '<div class="join-col">' + rows + '</div></div></div>';
  }).join('');
  return html;
}
function wireModulePicker(box, field) {
  box.querySelectorAll('[data-ack]').forEach((el) => el.addEventListener('change', () => {
    S.dressAck ||= {};
    S.dressAck[el.getAttribute('data-ack')] = el.checked;   // never preselected; the guest confirms actively
    el.closest('.ack-row').classList.toggle('ok', el.checked);
    saveDraft(); renderSummary();
  }));
  box.querySelectorAll('input[name^="plans-"]').forEach((el) => el.addEventListener('change', () => {
    S.partyPlans = el.value; saveDraft(); renderStep(cur);
  }));
  box.querySelectorAll('input[name^="mod-"]').forEach((el) => el.addEventListener('change', () => {
    const [, f, modId, who] = el.name.match(/^mod-([a-z]+)-([a-z-]+)-(.+)$/);
    if (f === 'events' && modId === 'ceremony') return; // mandatory — locked in the UI and here
    const join = el.value === 'yes';
    const wl = el.value === 'waitlist';
    const apply = (g) => {
      g[f][modId] = join || wl; if (wl) g[f][modId + 'Waitlist'] = true;
      // §3 one journey truth: the overnight train and an independent arrival
      // describe the same segment — selecting one clears the other.
      if (f === 'journey' && modId === 'train' && (join || wl)) g.journey.independent = false;
      if (f === 'journey' && modId === 'independent' && join) g.journey.train = false;
    };
    if (who === 'party') S.guests.forEach(apply);
    else { const g = S.guests.find((x) => x.guestId === who); if (g) apply(g); }
    saveDraft(); renderSummary();
    if (f === 'journey' || f === 'events') renderStep(cur);
  }));
}

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
function wireCardGalleries(box) {
  box.querySelectorAll('.acc-gal').forEach((gal) => {
    const track = gal.querySelector('.acc-track');
    const count = gal.querySelector('.acc-gcount');
    const n = track.querySelectorAll('img').length;
    const pos = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = (d) => track.scrollTo({ left: (pos() + d) * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    track.addEventListener('scroll', () => { if (count) count.textContent = (Math.min(pos(), n - 1) + 1) + ' / ' + n; }, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });
    let down = null, moved = false;
    const openDetails = () => openAccOverlay(track.getAttribute('data-view'));
    track.addEventListener('click', () => { if (moved) { moved = false; return; } openDetails(); });
    track.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(); } });
    track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { down = { x: e.clientX, s: track.scrollLeft }; track.classList.add('drag'); } });
    addEventListener('pointermove', (e) => { if (down) { if (Math.abs(e.clientX - down.x) > 4) moved = true; track.scrollLeft = down.s - (e.clientX - down.x); } });
    addEventListener('pointerup', () => { if (down) { down = null; track.classList.remove('drag'); track.scrollTo({ left: pos() * track.clientWidth, behavior: 'smooth' }); } });
  });
}
/** The compact first glance: availability plus the few facts that decide a
 *  room. Everything else waits behind View details. */
function roomEssentials(a, availRow) {
  const rows = [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy]].filter((r) => r[1]);
  return '<dl class="acc-specs acc-essentials">' +
    rows.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') +
    (availRow ? '<div class="spec-wide"><dt>Availability</dt><dd>' + esc(availRow) + '</dd></div>' : '') +
    '</dl>';
}
function roomSpecs(a, availRow) {
  const rows = [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy], ['Where', a.location]]
    .filter((r) => r[1]);
  if (availRow) rows.push(['Availability', availRow]);
  if (!rows.length) return '';
  return '<dl class="acc-specs">' + rows.map((r) =>
    '<div' + (r[0] === 'Availability' ? ' class="spec-wide"' : '') + '><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>' +
    ((a.amenities || []).length
      ? '<div class="acc-amen">' + a.amenities.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>'
      : '');
}

/* ---------------- step 5 · stay (§18–§23) ---------------- */
let openId = null;   // only the room the guest actively opens shows its detail
let CMP = [];        // rooms picked for the side by side comparison
function renderStay() {
  const box = document.getElementById('stay-box');
  const cards = ACCOMMODATIONS.map((a) => {
    const bookable = a.selectable !== false;
    const res = bookable ? inventory[a.id] : null;
    const full = bookable ? remaining(res) <= 0 : false;
    const selected = S.stay.accommodationId === a.id;
    return '<article class="acc-card' + (selected ? ' sel' : '') + (full ? ' full' : '') +
      (bookable ? '' : ' reserved') + '" data-acc="' + a.id + '">' +
      roomFigure(a, availOverlay(a, res, selected)) +
      (a.badge ? '<div class="acc-badge">' + esc(a.badge) + '</div>' : '') +
      '<div class="acc-head"><h3>' + esc(a.name) + '</h3>' +
      (bookable ? roomPriceHtml(a) : '<div class="acc-price"><span class="per">Reserved</span></div>') + '</div>' +
      '<div class="acc-meta">' + esc(a.stay) + ' · ' + a.nights + ' nights</div>' +
      (a.kind === 'airbnb'
        ? '<div class="acc-hosted"><span>Complimentary stay</span><span>Limited availability</span><span class="rh-b">Personally coordinated by Guest Relations</span></div>'
        : bookable
          ? '<div class="acc-hosted"><span>First night · guest contribution</span><span class="rh-b">Second night · hosted by</span><span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span><span>Breakfast included</span></div>'
          : '') +
      roomEssentials(a, bookable
        ? (selected ? 'Requested · Guest Relations will confirm'
           : a.kind === 'airbnb' ? 'Limited availability · personally coordinated by Guest Relations'
           : guestAvailability(res))
        : (a.reservedFor || 'Reserved')) +
      '<div class="acc-detail"' + (openId === a.id ? '' : ' hidden') + '>' +
        '<p class="acc-blurb">' + esc(a.blurb) + '</p>' +
        roomSpecs(a, null) +
      '</div>' +
      '<div class="acc-actions">' +
      '<button type="button" class="btn ghost sm" data-toggle="' + a.id + '">' + (openId === a.id ? 'Hide details' : 'View details') + '</button>' +
      '<label class="acc-cmp"><input type="checkbox" data-cmp="' + a.id + '"' + (CMP.includes(a.id) ? ' checked' : '') + '/><span>Compare</span></label>' +
      (!bookable ? ''
        : full
          ? '<button type="button" class="btn sm" data-waitlist="' + a.id + '">Join the waitlist</button>'
          : '<button type="button" class="btn sm" data-select="' + a.id + '">' + (selected ? 'Selected' : (a.contributionPerGuest == null ? 'Request this stay' : 'Request this room')) + '</button>') +
      '</div></article>';
  }).join('');
  box.innerHTML =
    '<p class="note" style="margin-bottom:22px">' + esc(COPY.sharedHome) + '</p>' +
    '<div class="price-note"><div class="label">' + esc(COPY.priceLabel) + '</div><p class="note">' + esc(COPY.priceNote + ' Haruthai\u00A0&\u00A0Suthep.') + '</p><p class="note">' + esc(COPY.priceNote2) + '</p></div>' +
    compareBlock() +
    '<div class="acc-grid">' + cards + '</div>' +
    '<div class="field" style="margin-top:30px"><label>Bed preference</label><select id="stay-bed"><option' + sel('') + '>No preference</option><option' + sel('One large bed') + '>One large bed</option><option' + sel('Two beds') + '>Two beds</option></select></div>' +
    '<div class="field"><label for="stay-req">Special request</label><textarea id="stay-req">' + esc(S.stay.request) + '</textarea></div>' +
    '<div id="stay-selected"></div>' +
    '<p class="note" style="margin-top:18px">' + esc(COPY.requestNote) + ' ' + esc(COPY.payment) + ' If you need something different, Guest Relations will arrange it personally.</p>';
  function sel(v) { return S.stay.bed === v ? ' selected' : ''; }
  box.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => {
    S.stay.accommodationId = b.getAttribute('data-select');
    S.stay.rooms = 1;
    S.stay.waitlist = false;
    S.stay.occupantGuestIds = S.guests.filter((g) => g.attending !== false).map((g) => g.guestId);
    saveDraft(); renderStay(); renderSummary();
    const acc = currentAcc();
    const occ = S.stay.occupantGuestIds;
    announce('Requested ' + acc.name + ' for you. ' + (acc.contributionPerGuest == null
      ? 'This stay is complimentary and limited; Guest Relations coordinates it personally. '
      : occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ', ' + money(contributionPerGuest(acc)) + ' per guest, total contribution ' + money(partyTotal(acc, occ)) + '. ') + COPY.requestNote);
  }));
  renderStaySelected();
  box.querySelectorAll('[data-waitlist]').forEach((b) => b.addEventListener('click', () => {
    S.stay.accommodationId = b.getAttribute('data-waitlist'); S.stay.waitlist = true;
    saveDraft(); renderStay(); renderSummary();
  }));
  box.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-toggle');
    openId = openId === id ? null : id;   // never more than one room open at a time
    renderStay();
    const card = box.querySelector('[data-acc="' + id + '"]');
    if (card && openId === id) card.scrollIntoView({ block: 'nearest' });
  }));
  box.querySelectorAll('[data-cmp]').forEach((el) => el.addEventListener('change', () => {
    const id = el.getAttribute('data-cmp');
    CMP = el.checked ? [...CMP.filter((x) => x !== id), id].slice(-3) : CMP.filter((x) => x !== id);
    renderStay();
  }));
  wireCardGalleries(box);
  const bed = box.querySelector('#stay-bed'); bed.addEventListener('change', () => { S.stay.bed = bed.value === 'No preference' ? '' : bed.value; saveDraft(); });
  box.querySelector('#stay-req').addEventListener('input', (e) => { S.stay.request = e.target.value; saveDraft(); });
}

/** Side by side comparison of the rooms the guest ticked — the deciding
 *  figures only, scrollable on a phone. */
function compareBlock() {
  const rooms = CMP.map((id) => ACCOMMODATIONS.find((a) => a.id === id)).filter(Boolean);
  if (rooms.length < 2) return '';
  const rows = [
    ['Contribution', (a) => (a.contributionPerGuest == null ? 'Complimentary · limited' : money(a.contributionPerGuest) + ' per guest')],
    ['Size', (a) => a.size || '—'],
    ['Bed', (a) => a.bed || '—'],
    ['Guests', (a) => a.occupancy || '—'],
    ['Where', (a) => a.location || a.property || '—'],
    ['Availability', (a) => (a.selectable === false ? (a.reservedFor || 'Reserved')
      : a.kind === 'airbnb' ? 'Limited availability'
      : guestAvailability(inventory[a.id]))],
  ];
  return '<div class="acc-compare"><div class="label">Compare rooms</div>' +
    '<div class="cmp-scroll"><table><thead><tr><th></th>' +
    rooms.map((a) => '<th>' + esc(a.name) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(([l, f]) => '<tr><th scope="row">' + l + '</th>' +
      rooms.map((a) => '<td>' + esc(f(a)) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div></div>';
}

/** Selected-room financial confirmation (one calculation path: logic.mjs). */
function renderStaySelected() {
  const el = document.getElementById('stay-selected');
  if (!el) return;
  const acc = currentAcc();
  if (!acc) { el.innerHTML = ''; return; }
  const occ = S.stay.occupantGuestIds;
  const neutral = acc.contributionPerGuest == null;
  el.innerHTML =
    '<div class="stay-sum" style="margin-top:30px" aria-live="polite">' +
    '<div class="row"><span class="l serif-it">Requested for you</span><span class="r">' + esc(acc.name) + (S.stay.waitlist ? ' · WAITLISTED' : '') + '</span></div>' +
    (neutral
      ? '<div class="row"><span class="l">' + occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ' · one ' + esc(acc.capacityUnit.toLowerCase()) + '</span><span class="r">Complimentary · coordinated by Guest Relations</span></div>'
      : '<div class="row"><span class="l">' + occ.length + ' guest' + (occ.length > 1 ? 's' : '') + ' · one ' + esc(acc.capacityUnit.toLowerCase()) + '</span><span class="r">' + money(contributionPerGuest(acc)) + ' · total contribution per guest</span></div>' +
        '<div class="row total"><span class="l serif-it">Total contribution</span><span class="r">' + money(partyTotal(acc, occ)) + '</span></div>' +
        '<div class="row"><span class="l">Second night</span><span class="r">Complimentary · hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span></span></div>') +
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
      ? '<div><dt>Contribution</dt><dd>' + (a.contributionPerGuest == null ? 'Complimentary · personally coordinated' : showAmount(contributionPerGuest(a)) + ' · total contribution per guest') + '</dd></div>' +
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
function renderTravel() {
  const many = S.guests.length > 1;
  const trainFlags = S.guests.map((g) => !!g.journey.train);
  const mixedTrain = many && trainFlags.some(Boolean) && !trainFlags.every(Boolean);
  if (mixedTrain) { S.arrival.shared = false; S.departure.shared = false; }
  const trainy = S.guests.some((g) => g.journey.train);
  /* FULL SERVICE (owner §8-12): no operational questionnaire. The guest sees
   * the journey and chooses services; Guest Relations coordinates every
   * arrival, departure and pickup detail personally. The underlying travel
   * data structures remain for Guest Relations — they are simply never a
   * guest-facing form. */
  return '<div class="guest-block" id="arrival-transfers">' +
    '<h3>How would you like us to arrange your arrival?</h3>' +
    '<p class="note" style="margin-bottom:6px">Your arrival and departure are coordinated personally by Guest Relations — nothing to organise here. If a detail is ever needed, they will simply ask you.</p>' +
    (trainy ? '<p class="note" style="margin-bottom:6px">You arrive with the Night Train at Nong Khai Railway Station — the onward journey to Souphattra Heritage is shown first.</p>' : '') +
    renderTransfers(trainy) +
    '<p class="note" style="margin-top:18px">Pickup and transfers are requests — statuses move from REQUESTED to UNDER REVIEW to CONFIRMED as Guest Relations coordinates them.</p></div>';
}
/* ---------------- transfer products (Owner price master) ----------------
 * FULL SERVICE (owner §13-18): the guest sees service, route, inclusions and
 * price, then simply adds it. No operational questionnaire — Guest Relations
 * completes timing/flight details personally from the Journey context. */
function scrollToRoom() {
  if (!urlRoom) return;
  const card = document.querySelector('[data-acc="' + urlRoom + '"]');
  if (!card) return;
  card.scrollIntoView({ block: 'center' });
  card.classList.add('acc-hilite');
  setTimeout(() => card.classList.remove('acc-hilite'), 2600);
}
function selectedTransfer(id) { return (S.transfers || []).find((s) => s.transferId === id); }
function renderTransfers(trainy) {
  const primaryIds = trainy ? ['nongkhai-vte', 'shuttle-shared'] : ['shuttle-shared'];
  const isPrimary = (t) => primaryIds.includes(t.id) || (!trainy && t.group === 'Airport');
  const card = (t) => {
    const sel = selectedTransfer(t.id);
    const free = !t.pricePerUnit;
    return '<article class="trf-card' + (sel ? ' sel' : '') + '" data-trf="' + t.id + '">' +
      '<div class="label">' + esc(t.group) + '</div>' +
      '<h4>' + esc(t.name) + '</h4>' +
      (free ? '' : '<div class="trf-price">' + money(t.pricePerUnit) + (t.perGuest ? ' · per guest' : ' · per vehicle') + '</div>') +
      '<p class="note">' + esc(t.blurb) + '</p>' +
      (t.included ? '<p class="note trf-incl">' + esc(t.included) + '</p>' : '') +
      '<div class="acc-actions">' +
      (sel
        ? '<button type="button" class="btn sm" data-trf-remove="' + t.id + '">Remove from journey</button>'
        : '<button type="button" class="btn sm" data-trf-add="' + t.id + '">Add to journey</button>') +
      '</div>' +
      (sel ? '<div class="acc-avail" style="border-top:none;padding-top:8px">REQUESTED · Guest Relations confirms every detail with you personally</div>' : '') +
      '</article>';
  };
  // contextual order (§8): the train guest sees the Nong Khai arrival first
  const primary = primaryIds.map((id) => TRANSFERS.find((t) => t.id === id)).filter(Boolean)
    .concat(TRANSFERS.filter((t) => isPrimary(t) && !primaryIds.includes(t.id)));
  const secondary = TRANSFERS.filter((t) => !isPrimary(t));
  const moreOpen = secondary.some((t) => selectedTransfer(t.id));
  return '<div class="trf" id="trf">' +
    '<p class="note" style="margin-bottom:6px">Choose your service — everything else is arranged for you. Guest Relations confirms every journey personally; private cars are charged per vehicle, never per guest.</p>' +
    primary.map(card).join('') +
    (secondary.length ? '<details class="trf-more"' + (moreOpen ? ' open' : '') + '><summary>Need something different?</summary>' + secondary.map(card).join('') + '</details>' : '') +
    '</div>';
}
function wireTransfers(box) {
  box.querySelectorAll('[data-trf-add]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-trf-add');
    if (!selectedTransfer(id)) S.transfers.push({ transferId: id, units: 1, details: {} });
    saveDraft(); renderStep(cur); renderSummary();
    const t = TRANSFERS.find((x) => x.id === id);
    announce(t.name + ' added to your journey' + (t.pricePerUnit ? ': ' + money(t.pricePerUnit) + (t.perGuest ? ' per guest' : ' per vehicle') : ' — complimentary') + ', REQUESTED. Guest Relations arranges the details with you personally.');
  }));
  box.querySelectorAll('[data-trf-remove]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-trf-remove');
    S.transfers = (S.transfers || []).filter((s) => s.transferId !== id);
    saveDraft(); renderStep(cur); renderSummary();
  }));
}

function travelFields(scope, a, d, hasTrain) {
  const point = hasTrain ? 'Nong Khai Railway Station' : (a.point || WEDDING.airport);
  return '<fieldset><legend>Arrival</legend>' +
    (hasTrain ? '<p class="note">Arrival point for the overnight train: <strong>Nong Khai Railway Station</strong>.</p>' : '') +
    '<div class="cols2">' +
    fld(scope, 'a', 'date', 'Arrival date', a.date, 'date') +
    fld(scope, 'a', 'time', 'Arrival time', a.time, 'time') +
    (hasTrain ? '' : selFld(scope, 'a', 'mode', 'Arrival mode', a.mode || 'flight', ['flight', 'train', 'car', 'other'])) +
    (hasTrain ? '' : fld(scope, 'a', 'origin', 'Arriving from', a.origin)) +
    fld(scope, 'a', 'ref', hasTrain ? 'Train number (if known)' : 'Flight / train number', a.ref) +
    (hasTrain ? '' : fld(scope, 'a', 'point', 'Airport / station', a.point || WEDDING.airport)) +
    fld(scope, 'a', 'baggage', 'Baggage notes', a.baggage) +
    '</div>' +
    ynFld(scope, 'a', 'pickupRequested', hasTrain ? 'Arrival pickup / onward transfer coordination?' : 'Airport or station pickup?', a.pickupRequested) +
    '</fieldset>' +
    '<fieldset><legend>Departure</legend><div class="cols2">' +
    fld(scope, 'd', 'date', 'Departure date', d.date, 'date') +
    fld(scope, 'd', 'time', 'Departure time', d.time, 'time') +
    selFld(scope, 'd', 'mode', 'Departure mode', d.mode || 'flight', ['flight', 'train', 'car', 'other']) +
    fld(scope, 'd', 'ref', 'Flight / train number', d.ref) +
    fld(scope, 'd', 'point', 'Airport / station', d.point || WEDDING.airport) +
    fld(scope, 'd', 'baggage', 'Timing or baggage notes', d.baggage) +
    '</div>' +
    ynFld(scope, 'd', 'transferRequested', 'Departure transfer coordination?', d.transferRequested) +
    '</fieldset>';
}
const fld = (s, sec, k, label, v, type = 'text') =>
  '<div class="field"><label>' + esc(label) + '</label><input type="' + type + '" data-trv="' + s + '|' + sec + '|' + k + '" value="' + esc(v || '') + '"/></div>';
const selFld = (s, sec, k, label, v, opts) =>
  '<div class="field"><label>' + esc(label) + '</label><select data-trv="' + s + '|' + sec + '|' + k + '">' +
  opts.map((o) => '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
const ynFld = (s, sec, k, label, v) =>
  '<div class="field"><label>' + esc(label) + '</label><div class="join">' +
  '<label><input type="radio" name="yn-' + s + sec + k + '" value="yes" data-trv="' + s + '|' + sec + '|' + k + '"' + (v ? ' checked' : '') + '/><span class="yes">Yes, please</span></label>' +
  '<label><input type="radio" name="yn-' + s + sec + k + '" value="no" data-trv="' + s + '|' + sec + '|' + k + '"' + (!v ? ' checked' : '') + '/><span class="no">No, thank you</span></label></div></div>';

/* ---------------- step 7 · spa (§16) ---------------- */
function renderSpa() {
  const box = document.getElementById('spa-box');
  box.innerHTML = S.guests.map((g) => {
    const w = g.spa || {};
    return '<div class="guest-block"><h3>' + esc(g.preferredName) + '</h3>' +
      '<div class="field"><label>Arrange a spa or massage experience?</label><div class="join">' +
      '<label><input type="radio" name="spa-' + g.guestId + '" value="yes"' + (w.requested ? ' checked' : '') + '/><span class="yes">Yes, please</span></label>' +
      '<label><input type="radio" name="spa-' + g.guestId + '" value="no"' + (!w.requested ? ' checked' : '') + '/><span class="no">Not this time</span></label></div></div>' +
      '<div class="cond' + (w.requested ? ' show' : '') + '" data-spa="' + g.guestId + '"><div class="cols2">' +
      '<div class="field"><label>Treatment</label><select data-sf="type">' + ['Massage', 'Spa treatment', 'No preference · please recommend'].map((o) => '<option' + (w.type === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Preferred day</label><input type="date" data-sf="day" value="' + esc(w.day || '') + '"/></div>' +
      '<div class="field"><label>Time range</label><select data-sf="time">' + ['Morning', 'Afternoon', 'Evening', 'Flexible'].map((o) => '<option' + ((w.time || 'Flexible') === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Appointment</label><select data-sf="mode">' + ['Individual', 'Together'].map((o) => '<option' + (w.mode === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
      '</div><div class="field"><label>Wellness notes</label><textarea data-sf="notes">' + esc(w.notes || '') + '</textarea></div></div></div>';
  }).join('') + '<p class="note">Spa and massage selections are coordination requests, confirmed by Guest Relations.</p>';
  box.querySelectorAll('.guest-block').forEach((block, i) => {
    const g = S.guests[i];
    block.querySelectorAll('input[name^="spa-"]').forEach((el) => el.addEventListener('change', () => {
      g.spa = g.spa || {}; g.spa.requested = el.value === 'yes' && el.checked;
      block.querySelector('[data-spa]').classList.toggle('show', g.spa.requested);
      saveDraft(); renderSummary();
    }));
    block.querySelectorAll('[data-sf]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      g.spa[el.getAttribute('data-sf')] = el.value; saveDraft();
    }));
  });
}

/* ---------------- step 8 · each of you (§17) ---------------- */
function renderEach() {
  const box = document.getElementById('each-box');
  box.innerHTML = S.guests.map((g, i) =>
    '<details class="guest-fold"' + (i === 0 ? ' open' : '') + '><summary><span class="n">' + pad(i + 1) + '</span>' +
    '<span class="gf-ava">' + (g.photo ? '<img src="' + g.photo + '" alt=""/>' : '<span class="gf-ph">' + esc(g.preferredName.slice(0, 1)) + '</span>') + '</span>' +
    esc(g.fullName) + '</summary>' +
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
    '</details>').join('');
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
const selEf = (g, k, label, opts) =>
  '<div class="field"><label>' + esc(label) + '</label><select data-ef="' + k + '">' +
  opts.map((o) => '<option value="' + o + '"' + ((g[k] || '') === o ? ' selected' : '') + '>' + (o || '—') + '</option>').join('') + '</select></div>';
const ef = (g, k, label, type = 'text') =>
  '<div class="field"><label>' + esc(label) + '</label><input type="' + type + '" data-ef="' + k + '" value="' + esc(g[k] || '') + '"/></div>';

/* ---------------- step 9 · cost summary ---------------- */
function currentAcc() {
  return S.stay.accommodationId && S.stay.accommodationId !== 'none'
    ? ACCOMMODATIONS.find((a) => a.id === S.stay.accommodationId) : null;
}
function renderCost() {
  const box = document.getElementById('cost-box');
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const riders = S.guests.filter((g) => g.journey.train);
  const tc = trainContribution(TRAIN, riders.length) || 0;
  const total = journeyTotal(acc, occ, TRAIN, riders.length, TRANSFERS, S.transfers) + pwTotal() + bkkTotal();
  const neutral = acc && acc.contributionPerGuest == null;
  const row = (l, r, cls) => '<div class="row' + (cls ? ' ' + cls : '') + '"><span class="l">' + l + '</span><span class="r">' + r + '</span></div>';
  const head = (t) => '<div class="row fol-day"><span class="l serif-it">' + t + '</span><span class="r"></span></div>';
  /* §19: the contribution summary lists only what carries an amount or is a
   * pending request. Everything hosted appears in its own list — without
   * amounts, never as a USD 0 line. */
  let rows = '';
  rows += head('Your contribution');
  if (riders.length) rows += row('Overnight Sleeper Train · Bangkok → Nong Khai · ' + riders.length + ' × ' + money(TRAIN.contributionPerGuest), money(tc));
  if (!acc) {
    rows += row('<span class="serif-it">Accommodation</span>', 'Not selected yet · choose under My Stay');
  } else if (neutral) {
    rows += row('<span class="serif-it">' + esc(acc.name) + '</span>', 'Complimentary · limited availability');
  } else {
    rows += row('<span class="serif-it">' + esc(acc.name) + '</span> · night one',
      partyCharges(acc, occ).map((c) => { const g = S.guests.find((x) => x.guestId === c.guestId); return esc(g ? g.preferredName : c.guestId) + ' ' + money(c.amount); }).join(' · '));
  }
  for (const sl of S.transfers || []) {
    const t = TRANSFERS.find((x) => x.id === sl.transferId);
    if (!t || !t.pricePerUnit) continue;
    if (t.perGuest) {
      const n = Math.max(riders.length, 1);
      rows += row(esc(t.name) + ' · ' + n + ' × ' + money(t.pricePerUnit), money(t.pricePerUnit * n));
    } else {
      rows += row(esc(t.name) + ' · ' + (sl.units || 1) + ' vehicle' + ((sl.units || 1) > 1 ? 's' : ''), money(t.pricePerUnit * (sl.units || 1)));
    }
  }
  if (S.bangkokStay && S.bangkokStay.property) {
    const h = BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property);
    const n = bkkNights();
    if (h) rows += row('Bangkok stay · <span class="serif-it">' + esc(h.name) + '</span> · ' + esc(h.room),
      n ? n + ' × ' + money(h.nightly) + ' · ' + money(h.nightly * n) : money(h.nightly) + ' per night · choose your dates under My Travel');
  }
  if (S.postWedding && S.postWedding.joined) {
    const n = attendingCount();
    for (const c of POST_WEDDING) {
      if (c.contribution == null) continue;
      rows += c.perGuest
        ? row('Post Wedding Journey · ' + esc(c.label) + ' · ' + esc(c.sub), n + ' × ' + money(c.contribution) + ' · ' + money(c.contribution * n))
        : row('Post Wedding Journey · ' + esc(c.label), c.nights + ' × ' + money(c.nightly) + ' · ' + money(c.contribution));
    }
    rows += row('Post Wedding Journey · Lijiang → Bangkok flight', 'Contribution follows with Guest Relations');
  }
  rows += '<div class="row total"><span class="l serif-it">Total contribution</span><span class="r js-total">' + money(total) + '</span></div>';
  rows += head('Hosted for you');
  const hosted = [];
  hosted.push('Personal airport welcome and arrival coordination');
  hosted.push('Welcome drink on arrival');
  hosted.push('Breakfast on both mornings');
  hosted.push('Alms Giving');
  hosted.push('Vow Ceremony');
  hosted.push('Sunset Drinks &amp; Wedding Dinner');
  hosted.push('Two hour beverage package');
  if (acc && !neutral) hosted.push('<span class="serif-it">' + esc(acc.name) + '</span> · night two · hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>');
  hosted.push('Departure coordination within the wedding programme');
  rows += hosted.map((h) => row(h, '')).join('');
  box.innerHTML =
    '<p class="note" style="margin-bottom:18px">Your contribution covers only the lines that carry an amount. Everything else on the wedding days is hosted for you.</p>' +
    '<div class="stay-sum fol" aria-live="polite">' + rows + '</div>' +
    (fxStamp() ? '<p class="note" style="margin-top:12px">' + fxStamp() + ' · Amounts are shown for orientation; the master currency remains USD.</p>' : '') +
    '<p class="note" style="margin-top:16px">' + esc(COPY.priceNote + ' Haruthai\u00A0&\u00A0Suthep.') + '</p>' +
    '<p class="note">' + esc(COPY.payment) + ' One person may settle the invoice for everyone travelling with them.</p>';
}

/* ---------------- step 10 · review (§28) ---------------- */
function renderReview() {
  const box = document.getElementById('review-box');
  const acc = currentAcc();
  const occ = acc ? S.stay.occupantGuestIds : [];
  const sec = (t, step, rows) =>
    '<div class="rv-sec"><div class="rv-head"><span class="t">' + t + '</span><button type="button" class="edit" data-goto="' + step + '">Edit</button></div><dl>' +
    rows.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl></div>';
  const journeyLine = (g) => [
    g.journey.bangkok && 'Bangkok Journey', g.journey.train && 'Overnight Train · seat REQUESTED',
    !g.journey.train && g.journey.independent && 'Independent arrival'].filter(Boolean).join(' · ') || '—';
  const eventLine = (g) => EVENTS.filter((e) => g.events[e.id]).map((e) => e.label).join(' · ') || 'None';
  let html = '';
  html += '<p class="home-hello" style="margin-bottom:20px">' + esc(S.invitation.partyName) + ' · Vientiane · February 2027</p>';
  html += sec('Your Guests', idx('party'), [
    ['Invitation', esc(S.invitation.partyName)],
    ['Members', S.invitation.guests.map((g) => esc(g.fullName)).join(' · ')],
    ['Lead guest', esc((S.invitation.guests.find((g) => g.guestId === S.invitation.partyLead) || {}).fullName || '—')],
  ]);
  {
    const jRiders = S.guests.filter((g) => g.journey.train);
    const anyBkk = S.guests.some((g) => g.journey.bangkok);
    const bkkSel = S.bangkokStay && S.bangkokStay.property ? BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property) : null;
    const arrSel = (S.transfers || []).map((x) => TRANSFERS.find((t) => t.id === x.transferId)).filter((t) => t && t.direction === 'arrival');
    html += sec('Your Journey', idx('journey'), [
      ['Before the wedding', anyBkk ? 'Bangkok Journey' + (bkkSel ? ' · ' + esc(bkkSel.name) + ' · REQUESTED' : '') : 'Straight to the wedding'],
      ['Journey to Vientiane', jRiders.length
        ? 'Overnight Train · ' + jRiders.length + ' seat' + (jRiders.length > 1 ? 's' : '') + (jRiders.length < S.guests.length ? ' · ' + jRiders.map((g) => esc(g.preferredName)).join(' & ') : '') + ' · REQUESTED'
        : 'Own arrangement — Guest Relations can assist'],
      ['Arrival in Vientiane', arrSel.length ? arrSel.map((t) => esc(t.name)).join(' · ') + ' · REQUESTED' : 'Own arrangement — Guest Relations can assist'],
    ]);
  }
  const riders = S.guests.filter((g) => g.journey.train);
  html += sec('Overnight Train', idx('journey'), riders.length ? [
    ['Joined', riders.map((g) => esc(g.preferredName) + (g.berth ? ' · ' + esc(g.berth) : '')).join('<br/>')],
    ['Seats requested', String(riders.length) + ' · REQUESTED'],
    ['Arrival', 'Nong Khai Railway Station'],
    ['Onward transfer', trainOnwardLine()],
  ].concat(S.trainNote ? [['Note', esc(S.trainNote)]] : []) : [['Joined', 'Not joined']]);
  html += sec('The wedding days', idx('events'), EVENTS.map((e) => {
    const joiners = S.guests.filter((g) => g.attending !== false && g.events[e.id]);
    if (!joiners.length) return [esc(e.label), 'Not joining'];
    const who = joiners.length === S.guests.length ? 'Joining' : 'Joining · ' + joiners.map((g) => esc(g.preferredName)).join(' & ');
    const ack = S.dressAck && S.dressAck[e.id];
    const dress = e.dress ? (ack ? ' · Dress code understood' : ' · <span class="ack-missing">Dress code not yet confirmed — please confirm under My Wedding</span>') : '';
    return [esc(e.label), who + dress];
  }));
  if (acc) html += '<div class="rv-room">' + roomFigure(acc) +
    '<div class="rv-room-b"><div class="label">Your room</div><h3>' + esc(acc.name) + '</h3>' +
    '<p class="note">' + esc([acc.size, acc.bed, acc.occupancy].filter(Boolean).join(' · ')) + '</p></div></div>';
  html += sec('Your Stay', idx('stay'), acc ? [
    ['Requested', esc(acc.name) + ' · ' + esc(acc.stay)],
    ['Status', S.stay.waitlist ? 'WAITLISTED' : 'REQUESTED · UNDER REVIEW'],
    ...(acc.contributionPerGuest == null
      ? [['Guests', String(occ.length)], ['Contribution', 'Complimentary · coordinated by Guest Relations']]
      : [['Guests', occ.length + ' · ' + money(contributionPerGuest(acc)) + ' per guest'],
         ['Contribution', occ.map((id) => { const g = S.guests.find((x) => x.guestId === id); return esc(g ? g.preferredName : id) + ' ' + money(contributionPerGuest(acc)); }).join(' · ')],
         ['Total', money(partyTotal(acc, occ))],
         ['Second night', 'Complimentary · hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>']]),
  ] : [['Requested', 'No stay selected yet'], ['Action', 'Please choose your room under My Stay before sending']]);
  const trv = S.arrival.shared !== false
    ? [['Together', esc([S.arrival.date, S.arrival.time, S.arrival.ref].filter(Boolean).join(' · ') || '—') + (S.arrival.pickupRequested ? ' · pickup REQUESTED' : '')]]
    : S.guests.map((g) => { const a = S.arrivalByGuest[g.guestId] || {}; return [esc(g.preferredName), esc([a.date, a.time, a.ref].filter(Boolean).join(' · ') || '—') + (a.pickupRequested ? ' · pickup REQUESTED' : '')]; });
  html += sec('Arrival & Departure', idx('journey'), trv.concat([
    ['Departure', esc([S.departure.date, S.departure.time].filter(Boolean).join(' · ') || '—') + (S.departure.transferRequested ? ' · transfer REQUESTED' : '')],
  ]));
  if (S.bangkokStay && S.bangkokStay.property) {
    const bh = BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property);
    if (bh) html += sec('Your Bangkok Stay', idx('journey'), [
      ['Requested', esc(bh.name) + ' · ' + esc(bh.room)],
      ['Dates', esc([S.bangkokStay.from, S.bangkokStay.to].filter(Boolean).join(' → ') || 'To be chosen under My Travel')],
      ['Contribution', bkkNights() ? bkkNights() + ' night' + (bkkNights() > 1 ? 's' : '') + ' × ' + money(bh.nightly) + ' = ' + money(bkkTotal()) : money(bh.nightly) + ' per night · dates to be chosen'],
    ]);
  }
  if (S.postWedding && S.postWedding.joined) html += sec('The Post Wedding Journey', idx('journey'),
    POST_WEDDING.map((c) => [esc(c.type), esc(c.label) + ' · ' + esc(c.when) + ' · ' +
      (c.contribution != null
        ? (c.perGuest ? money(c.contribution) + ' per guest' : c.nights + ' nights · ' + money(c.contribution))
        : (c.priceNote ? esc(c.priceNote) : 'contribution follows with Guest Relations'))]));
  html += sec('Your Transfers', idx('journey'), (S.transfers || []).length
    ? S.transfers.map((s) => {
        const t = TRANSFERS.find((x) => x.id === s.transferId) || {};
        const d = s.details || {};
        const n = t.perGuest ? Math.max(S.guests.filter((g) => g.journey.train).length, 1) : (s.units || 1);
        return [esc(t.name || s.transferId),
          n + (t.perGuest ? ' guest' + (n > 1 ? 's' : '') : ' unit' + (n > 1 ? 's' : '')) + ' × ' + money(t.pricePerUnit || 0) + ' = ' + money((t.pricePerUnit || 0) * n) +
          ' · ' + esc([d.date, d.time, d.ref].filter(Boolean).join(' · ') || 'details open') + ' · REQUESTED'];
      })
    : [['Requested', 'None']]);
  const jcRiders = S.guests.filter((g) => g.journey.train).length;
  const jcRows = [];
  if (acc) jcRows.push(['Stay', esc(acc.name) + ' · ' + (acc.contributionPerGuest == null ? 'complimentary · limited' : money(partyTotal(acc, occ)))]);
  if (jcRiders) jcRows.push(['Train', jcRiders + ' × ' + money(TRAIN.contributionPerGuest) + ' = ' + money(trainContribution(TRAIN, jcRiders) || 0)]);
  if ((S.transfers || []).length) jcRows.push(['Transfers', money(transfersTotal(TRANSFERS, S.transfers, jcRiders))]);
  if (S.bangkokStay && S.bangkokStay.property) {
    const bh = BANGKOK_STAYS.find((x) => x.id === S.bangkokStay.property);
    if (bh) jcRows.push(['Bangkok stay', esc(bh.name) + (bkkNights() ? ' · ' + money(bkkTotal()) : ' · dates to be chosen')]);
  }
  if (S.postWedding && S.postWedding.joined) jcRows.push(['Post Wedding Journey', 'China train · First Class only, Kunming and Lijiang stays · ' + money(pwTotal()) + ' · flight follows with Guest Relations']);
  jcRows.push(['Total contribution', money(journeyTotal(acc, occ, TRAIN, jcRiders, TRANSFERS, S.transfers) + pwTotal() + bkkTotal())]);
  html += sec('Your Contribution', idx('cost'), jcRows);
  html += sec('Each of You', idx('each'), S.guests.map((g) => {
    const detail = (g.allergyDetail || '').trim();
    const parts = ['Dietary preference · ' + esc(g.diet)];
    parts.push(g.allergy === 'yes'
      ? (detail ? 'Allergy · ' + esc(detail) : '<span class="ack-missing">Allergy · please add the detail for the kitchens under My Profile</span>')
      : 'Allergy · None reported');
    if (g.phone) parts.push('Phone ' + esc(g.phone));
    if (g.dob) parts.push('Born ' + esc(g.dob));
    if (g.spa && g.spa.requested) parts.push('spa REQUESTED');
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
  if (onward) return esc(onward.name) + ' · REQUESTED';
  return 'Own arrangement — Guest Relations can assist under My Travel';
}
function currentRegistration() {
  // photos stay on this device; passports never leave it (document vault pending)
  const guests = S.guests.map((g) => { const { photo, ...rest } = g; return { ...rest, passport: g.passport ? { name: g.passport.name, size: g.passport.size } : undefined }; });
  return {
    guests, stay: currentAcc() ? { ...S.stay } : { accommodationId: null },
    arrival: { ...S.arrival, point: S.guests.some((g) => g.journey.train) ? 'Nong Khai Railway Station' : (S.arrival.point || WEDDING.airport) },
    departure: S.departure, transfers: S.transfers, dressAck: { ...(S.dressAck || {}) },
    bangkokStay: { ...(S.bangkokStay || { property: null, from: '', to: '' }) },
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
  const text = buildNotification(currentRegistration(), { invitation: S.invitation, accommodations: ACCOMMODATIONS, transfers: TRANSFERS, train: TRAIN });
  document.getElementById('send-out').textContent = text;
}
document.getElementById('send-mail').addEventListener('click', async () => {
  const text = document.getElementById('send-out').textContent;
  if (PUBLICATION.submit === 'endpoint') {
    try {
      const r = await fetch(PUBLICATION.submitUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ registration: currentRegistration(), invitationId: S.invitation.invitationId, text }) });
      if (r.ok) { showReceived(); return; }
    } catch (e) { /* fall through to mailto */ }
  }
  location.href = 'mailto:' + CONTACTS.email + '?subject=' + encodeURIComponent('Guest Registration — ' + S.invitation.partyName) + '&body=' + encodeURIComponent(text);
  showReceived();
});
document.getElementById('copy-out').addEventListener('click', () => {
  const btn = document.getElementById('copy-out');
  navigator.clipboard.writeText(document.getElementById('send-out').textContent).then(() => {
    btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy for LINE'; }, 2200);
  }).catch(() => { /* text remains selectable */ });
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
  document.getElementById('received-when').textContent =
    'Submitted ' + new Date(S.registration_submitted_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) + ' · status: UNDER REVIEW';
  const st = document.getElementById('received-status');
  if (st) st.innerHTML = journeyStatusLadder() +
    '<p class="note" style="margin-top:16px">From here, everything is in our hands. Khun Ket and Khun Paddy review your travel information, confirm your accommodation, coordinate your transfers and prepare your personal journey — usually within <strong>4–8 hours</strong>. Your private area stays open the whole time.</p>' +
    grCardHtml();
  show(idx('received'));
}
document.getElementById('return-journey').addEventListener('click', () => show(idx('home')));

/* ---------------- persistent YOUR JOURNEY summary (§27) ---------------- */
function renderSummary() {
  const el = document.getElementById('summary');
  if (!S.invitation) { el.hidden = true; return; }
  el.hidden = false;
  const acc = currentAcc();
  const trainCount = S.guests.filter((g) => g.journey.train).length;
  const sel = [];
  if (trainCount) sel.push(trainCount + ' train seat' + (trainCount > 1 ? 's' : '') + ' · REQUESTED');
  if (acc) sel.push(esc(acc.name) + (S.stay.waitlist ? ' · WAITLISTED' : ' · REQUESTED'));
  if ((S.transfers || []).length) sel.push(S.transfers.length + ' transfer' + (S.transfers.length > 1 ? 's' : ''));
  if (S.bangkokStay && S.bangkokStay.property) sel.push('Bangkok stay · REQUESTED');
  if (S.postWedding && S.postWedding.joined) sel.push('Post Wedding Journey · REQUESTED');
  const total = journeyTotal(acc, acc ? S.stay.occupantGuestIds : [], TRAIN, trainCount, TRANSFERS, S.transfers) + pwTotal() + bkkTotal();
  el.innerHTML =
    '<div class="sum-a"><span class="sum-label">Your journey</span>' +
    '<span class="sum-line"><strong>' + esc(S.invitation.partyName) + '</strong>' + (sel.length ? ' · ' + sel.join(' · ') : '') + '</span></div>' +
    '<div class="sum-b"><span class="sum-label">Total contribution</span><span class="sum-amt">' + money(total) + '</span>' +
    '<span class="sum-cur" role="group" aria-label="Display currency">' +
    CURRENCIES.map((c) => '<button type="button" class="cur-btn' + (c === DISPLAY_CUR ? ' on' : '') + '" data-cur="' + c + '">' + c + '</button>').join('') +
    '</span>' + (fxStamp() ? '<span class="sum-fx">' + fxStamp() + '</span>' : '') + '</div>';
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
      const joined = e.id === 'ceremony' || S.guests.some((g) => g.events && g.events[e.id]);
      if (joined && !(S.dressAck && S.dressAck[e.id])) return false; // ack required only when joining
    }
    return true;
  }
  if (name === 'stay') return !!currentAcc() || !!S.stay.waitlist;
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
