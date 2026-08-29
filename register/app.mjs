/**
 * See You In Laos — Guest Registration · flow application.
 * Presentation + state wiring only; business rules live in logic.mjs,
 * content in data.mjs. No backend: drafts persist to localStorage, the
 * demo inventory is app-managed (production dependency documented in
 * data.mjs and the handoff report).
 */
import {
  WEDDING, CONTACTS, JOURNEY_MODULES, EVENTS, ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN,
  TRANSFERS, PACKAGE_INCLUSIONS, COPY, DEMO_MODE, PUBLICATION, TRAIN_REFERENCE, BERTH_PREFS, lookupInvitation,
} from './data.mjs';
import {
  contributionPerGuest, partyCharges, partyTotal, money,
  trainContribution, transfersTotal, journeyTotal,
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
    transfers: [],           // [{ transferId, units, details:{date,time,ref,place,location} }]
    trainNote: '',
    notes: '',
    submitted: false,
    registration_submitted_at: null,
  };
}
function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }
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
const progress = document.getElementById('progress');
stepEls.forEach(() => progress.appendChild(document.createElement('span')));
let cur = 0;

function show(i, focusHeading = true) {
  stepEls[cur].classList.remove('active');
  cur = i;
  stepEls[cur].classList.add('active');
  [...progress.children].forEach((el, k) => el.classList.toggle('on', k <= cur));
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
  if (name === 'travel') renderTravel();
  if (name === 'spa') renderSpa();
  if (name === 'each') renderEach();
  if (name === 'cost') renderCost();
  if (name === 'review') renderReview();
  if (name === 'send') renderSend();
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
      attending: true, email: '', phone: '',
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
  ['home', 'My Journey'], ['journey', 'My Travel'], ['travel', 'My Transfers'], ['stay', 'My Stay'],
  ['events', 'My Wedding'], ['each', 'My Profile'], ['cost', 'My Contribution'],
];
function renderPrivnav() {
  const nav = document.getElementById('privnav');
  if (!nav) return;
  if (!S.invitation || isAuthOut()) { nav.hidden = true; return; }
  nav.hidden = false;
  const name = stepEls[cur].dataset.step;
  /* level-2 rule (owner): exactly ONE active subsection. "Guest Area" stays
   * available as the dashboard/home link but NEVER carries an active state —
   * the active marker belongs to the one current subsection button. */
  nav.innerHTML = '<button type="button" class="pn-area" data-nav-home="home">Guest Area</button>' +
    '<button type="button" id="nav-invitation">Invitation</button>' +
    PRIVNAV.map(([st, label]) =>
    '<button type="button" data-nav="' + st + '"' + (name === st ? ' aria-current="true"' : '') + '>' + label + '</button>').join('') +
    '<span class="pn-exit"><button type="button" id="pn-home">Website</button><button type="button" id="pn-save">Save</button><button type="button" id="log-out">Log out</button></span>';
  nav.querySelector('.pn-area').addEventListener('click', () => show(idx('home')));
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
  const trf = transfersTotal(TRANSFERS, S.transfers);
  const total = journeyTotal(acc, occ, TRAIN, riders.length, TRANSFERS, S.transfers);
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
      'Sunday, 28 February 2027 · Souphattra Heritage · dress code to be confirmed',
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
      { id: 'train', label: 'The Overnight Train', when: 'Bangkok → Nong Khai · ' + money(TRAIN.contributionPerGuest) + ' per guest · ' + trainLabel, blurb: 'The sleeper train north through the night — one of the defining transitions of the Bangkok Journey. ' + money(TRAIN.contributionPerGuest) + ' per participating guest; only guests who join are charged. Eight seats, allocated per Guest in registration order.', disabled: trainFull, waitlist: trainFull },
      { id: 'independent', label: 'Arriving independently in Vientiane', when: 'Your own way', blurb: 'Fly or travel on your own schedule; we meet you there.' },
    ],
    field: 'journey',
  }) + (anyTrain ? trainDetailBlock() : '');
  wireModulePicker(box, 'journey');
  wireTrainDetails(box);
}

function trainDetailBlock() {
  const riders = S.guests.filter((g) => g.journey.train);
  return '<div class="guest-block" id="train-details">' +
    '<img src="../assets/images/train/srt-sleeper-cabin.jpg" alt="A private sleeper cabin on the night train" width="600" height="399" loading="lazy" decoding="async" style="width:100%;height:auto;margin-bottom:18px"/>' +
    '<h3>The night train, arranged around you</h3>' +
    '<div class="stay-sum" style="margin:14px 0 18px"><div class="row"><span class="l">' + riders.length + ' guest' + (riders.length > 1 ? 's' : '') + ' × ' + money(TRAIN.contributionPerGuest) + '</span><span class="r">' + money(trainContribution(TRAIN, riders.length) || 0) + '</span></div></div>' +
    '<p class="note">' + riders.length + ' seat' + (riders.length > 1 ? 's' : '') + ' will be requested — one per travelling Guest. Guest Relations coordinates the booking personally; nothing is booked here.</p>' +
    riders.map((g) => '<div class="field"><label>' + esc(g.preferredName) + ' · sleeper preference</label><select data-berth="' + g.guestId + '">' +
      BERTH_PREFS.map((o) => '<option' + ((g.berth || 'No preference') === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>').join('') +
    '<p class="note">We will do our best to arrange your preferred berth. Final allocation depends on railway availability.</p>' +
    '<div class="field"><label>Anything that matters for the train journey (mobility, luggage, comfort)</label><textarea id="train-note">' + esc(S.trainNote || '') + '</textarea></div>' +
    '<p class="note">You arrive at <strong>Nong Khai Railway Station</strong>; onward coordination to Vientiane is asked under Arrival &amp; Transfers. Route reference: <a href="' + TRAIN_REFERENCE + '" rel="noopener" target="_blank">State Railway of Thailand</a> — for reading only, no booking needed.</p>' +
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
  box.innerHTML = modulePicker({
    modules: EVENTS.map((e) => ({ id: e.id, label: e.label, when: e.when + ' · ' + e.venue, blurb: e.blurb })),
    field: 'events',
  });
  wireModulePicker(box, 'events');
}

/** Party-level module picker with per-guest split (“WE HAVE DIFFERENT PLANS”). */
function modulePicker({ modules, field }) {
  const differs = S.partyPlans === 'different';
  const many = S.guests.length > 1;
  let html = '';
  if (many) {
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
        '<label><input type="radio" name="' + nm + '" value="yes"' + (joined && !m.disabled ? ' checked' : '') + (m.disabled ? ' disabled' : '') + '/><span class="yes">I’m joining</span></label>' +
        '<label><input type="radio" name="' + nm + '" value="no"' + (!joined || m.disabled ? ' checked' : '') + '/><span class="no">Not joining</span></label>' +
        (m.waitlist ? '<label><input type="radio" name="' + nm + '" value="waitlist"/><span class="no">Join the waitlist</span></label>' : '') +
        '</div></div>';
    }).join('');
    return '<div class="mod" data-mod="' + m.id + '">' +
      '<div class="mod-head"><div><div class="when">' + esc(m.when) + '</div><h3>' + esc(m.label) + '</h3><p>' + esc(m.blurb) + '</p>' +
      (m.disabled ? '<p class="cap-full">Fully allocated</p>' : '') + '</div>' +
      '<div class="join-col">' + rows + '</div></div></div>';
  }).join('');
  return html;
}
function wireModulePicker(box, field) {
  box.querySelectorAll('input[name^="plans-"]').forEach((el) => el.addEventListener('change', () => {
    S.partyPlans = el.value; saveDraft(); renderStep(cur);
  }));
  box.querySelectorAll('input[name^="mod-"]').forEach((el) => el.addEventListener('change', () => {
    const [, f, modId, who] = el.name.match(/^mod-([a-z]+)-([a-z-]+)-(.+)$/);
    const join = el.value === 'yes';
    const wl = el.value === 'waitlist';
    const apply = (g) => { g[f][modId] = join || wl; if (wl) g[f][modId + 'Waitlist'] = true; };
    if (who === 'party') S.guests.forEach(apply);
    else { const g = S.guests.find((x) => x.guestId === who); if (g) apply(g); }
    saveDraft(); renderSummary();
    if (f === 'journey' && modId === 'train') renderStep(cur);
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
      '<p class="acc-blurb">' + esc(a.blurb) + '</p>' +
      roomSpecs(a, bookable
        ? (selected ? 'Requested · Guest Relations will confirm'
           : a.kind === 'airbnb' ? 'Limited availability · personally coordinated by Guest Relations'
           : guestAvailability(res))
        : (a.reservedFor || 'Reserved')) +
      '<div class="acc-actions">' +
      '<button type="button" class="btn ghost sm" data-view="' + a.id + '">View details</button>' +
      (!bookable ? ''
        : full
          ? '<button type="button" class="btn sm" data-waitlist="' + a.id + '">Join the waitlist</button>'
          : '<button type="button" class="btn sm" data-select="' + a.id + '">' + (selected ? 'Selected' : 'Request this room') + '</button>') +
      '</div></article>';
  }).join('');
  box.innerHTML =
    '<p class="note" style="margin-bottom:22px">' + esc(COPY.sharedHome) + '</p>' +
    '<div class="price-note"><div class="label">' + esc(COPY.priceLabel) + '</div><p class="note">' + esc(COPY.priceNote) + '<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span></p><p class="note">' + esc(COPY.priceNote2) + '</p></div>' +
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
  box.querySelectorAll('button[data-view]').forEach((b) => b.addEventListener('click', () => openAccOverlay(b.getAttribute('data-view'))));
  wireCardGalleries(box);
  const bed = box.querySelector('#stay-bed'); bed.addEventListener('change', () => { S.stay.bed = bed.value === 'No preference' ? '' : bed.value; saveDraft(); });
  box.querySelector('#stay-req').addEventListener('input', (e) => { S.stay.request = e.target.value; saveDraft(); });
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
        '<div class="row"><span class="l">Second night</span><span class="r">Hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span></span></div>') +
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
  const box = document.getElementById('travel-box');
  const many = S.guests.length > 1;
  const trainFlags = S.guests.map((g) => !!g.journey.train);
  const mixedTrain = many && trainFlags.some(Boolean) && !trainFlags.every(Boolean);
  if (mixedTrain) { S.arrival.shared = false; S.departure.shared = false; }
  const shared = S.arrival.shared !== false;
  const trainy = S.guests.some((g) => g.journey.train);
  /* FULL SERVICE (owner §8-12): no operational questionnaire. The guest sees
   * the journey and chooses services; Guest Relations coordinates every
   * arrival, departure and pickup detail personally. The underlying travel
   * data structures remain for Guest Relations — they are simply never a
   * guest-facing form. */
  box.innerHTML =
    (trainy ? '<p class="note" style="margin-bottom:14px">The Overnight Sleeper Train from Bangkok to Nong Khai is part of your journey — a central experience on the way to the wedding. Guest Relations coordinates your timings personally.</p>' : '') +
    '<p class="note" style="margin-bottom:6px">Your arrival and departure are coordinated personally by Guest Relations — nothing to organise here. If a detail is ever needed, they will simply ask you.</p>' +
    renderTransfers() +
    '<p class="note" style="margin-top:18px">Pickup and transfers are requests — statuses move from REQUESTED to UNDER REVIEW to CONFIRMED as Guest Relations coordinates them.</p>';
  wireTransfers(box);
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
function renderTransfers() {
  const groups = [...new Set(TRANSFERS.map((t) => t.group))];
  return '<div class="trf" id="trf">' +
    '<h3 class="trv-name" style="margin-top:40px">Transfers</h3>' +
    '<p class="note" style="margin-bottom:6px">Choose your service — everything else is arranged for you. Guest Relations confirms every journey personally; private cars are charged per vehicle, never per guest.</p>' +
    groups.map((grp) =>
      '<div class="label" style="margin:24px 0 4px">' + esc(grp) + '</div>' +
      TRANSFERS.filter((t) => t.group === grp).map((t) => {
        const sel = selectedTransfer(t.id);
        const free = !t.pricePerUnit;
        return '<article class="trf-card' + (sel ? ' sel' : '') + '" data-trf="' + t.id + '">' +
          '<h4>' + esc(t.name) + '</h4>' +
          (free ? '' : '<div class="trf-price">' + money(t.pricePerUnit) + ' · per vehicle</div>') +
          '<p class="note">' + esc(t.blurb) + '</p>' +
          (t.included ? '<p class="note trf-incl">' + esc(t.included) + '</p>' : '') +
          '<div class="acc-actions">' +
          (sel
            ? '<button type="button" class="btn sm" data-trf-remove="' + t.id + '">Remove from journey</button>'
            : '<button type="button" class="btn sm" data-trf-add="' + t.id + '">Add to journey</button>') +
          '</div>' +
          (sel ? '<div class="acc-avail" style="border-top:none;padding-top:8px">REQUESTED · Guest Relations confirms every detail with you personally</div>' : '') +
          '</article>';
      }).join('')).join('') +
    '</div>';
}
function wireTransfers(box) {
  box.querySelectorAll('[data-trf-add]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-trf-add');
    if (!selectedTransfer(id)) S.transfers.push({ transferId: id, units: 1, details: {} });
    saveDraft(); renderTravel(); renderSummary();
    const t = TRANSFERS.find((x) => x.id === id);
    announce(t.name + ' added to your journey' + (t.pricePerUnit ? ': ' + money(t.pricePerUnit) + ' per vehicle' : ' — complimentary') + ', REQUESTED. Guest Relations arranges the details with you personally.');
  }));
  box.querySelectorAll('[data-trf-remove]').forEach((b) => b.addEventListener('click', () => {
    const id = b.getAttribute('data-trf-remove');
    S.transfers = (S.transfers || []).filter((s) => s.transferId !== id);
    saveDraft(); renderTravel(); renderSummary();
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
      : '<p class="note">One photo or scan of the passport identity page is all we need.</p><button type="button" class="btn ghost sm" data-pass="' + g.guestId + '">Select passport file</button>') +
    '<input type="file" accept="image/*,.pdf" hidden data-pass-input="' + g.guestId + '"/></div></div>' +
    '<div class="cols2">' +
    ef(g, 'email', 'Email', 'email') + /* Telephone removed from the guest-facing profile (master data keeps it) */
    '<div class="field"><label>Dietary preference</label><select data-ef="diet">' + ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten free', 'Lactose free', 'Other'].map((o) => '<option' + (g.diet === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
    '<div class="field"><label>Any food allergies?</label><div class="join">' +
    '<label><input type="radio" name="alg-' + g.guestId + '" value="yes"' + (g.allergy === 'yes' ? ' checked' : '') + '/><span class="yes">Yes</span></label>' +
    '<label><input type="radio" name="alg-' + g.guestId + '" value="no"' + (g.allergy !== 'yes' ? ' checked' : '') + '/><span class="no">No</span></label></div></div>' +
    '</div>' +
    '<div class="cond' + (g.allergy === 'yes' ? ' show' : '') + '" data-alg><div class="field"><label>Exactly what should the kitchens know?</label><textarea data-ef="allergyDetail">' + esc(g.allergyDetail) + '</textarea></div>' +
    '<div class="field"><label>Severe / needs special handling?</label><div class="join">' +
    '<label><input type="radio" name="sev-' + g.guestId + '" value="yes"' + (g.severe ? ' checked' : '') + '/><span class="yes">Yes, severe</span></label>' +
    '<label><input type="radio" name="sev-' + g.guestId + '" value="no"' + (!g.severe ? ' checked' : '') + '/><span class="no">Standard care</span></label></div></div></div>' +
    '<div class="cols2">' + ef(g, 'dislikes', 'Foods you dislike') + '</div>' +
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
    block.querySelectorAll('input[name^="sev-"]').forEach((el) => el.addEventListener('change', () => { g.severe = el.value === 'yes' && el.checked; saveDraft(); }));
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
  const trf = transfersTotal(TRANSFERS, S.transfers);
  const total = journeyTotal(acc, occ, TRAIN, riders.length, TRANSFERS, S.transfers);
  const neutral = acc && acc.contributionPerGuest == null;
  const row = (l, r, cls) => '<div class="row' + (cls ? ' ' + cls : '') + '"><span class="l">' + l + '</span><span class="r">' + r + '</span></div>';
  const day = (t) => '<div class="row fol-day"><span class="l serif-it">' + t + '</span><span class="r"></span></div>';
  let rows = '';
  // 27 FEBRUARY — arrival
  rows += day('Saturday · 27 February');
  rows += row('Personal airport welcome &amp; arrival coordination', 'USD 0 · included');
  for (const s of S.transfers || []) {
    const t = TRANSFERS.find((x) => x.id === s.transferId);
    if (t && t.direction === 'arrival') rows += row(esc(t.name) + ' · ' + (s.units || 1) + ' unit' + ((s.units || 1) > 1 ? 's' : ''), money(t.pricePerUnit * (s.units || 1)));
  }
  if (riders.length) rows += row('Overnight Sleeper Train · Bangkok → Nong Khai · ' + riders.length + ' × ' + money(TRAIN.contributionPerGuest), money(tc));
  if (!acc) {
    rows += row('<span class="serif-it">Accommodation</span>', 'Not selected yet · choose under My Stay');
  } else {
    rows += row('<span class="serif-it">' + esc(acc.name) + '</span> · ' + esc(acc.size || '') + ' · night one',
      neutral ? 'Complimentary' : partyCharges(acc, occ).map((c) => { const g = S.guests.find((x) => x.guestId === c.guestId); return esc(g ? g.preferredName : c.guestId) + ' ' + money(c.amount); }).join(' · '));
    rows += row('Welcome drink', 'USD 0 · included');
  }
  // 28 FEBRUARY — the wedding day
  rows += day('Sunday · 28 February');
  rows += row('Hosted breakfast', 'USD 0 · included');
  rows += row('Alms Giving Ceremony', 'USD 0 · included');
  rows += row('Wedding Ceremony', 'USD 0 · included');
  rows += row('Sunset drinks, cake reception &amp; Wedding Dinner', 'USD 0 · included');
  rows += row('Two hour beverage package', 'USD 0 · included');
  if (acc && !neutral) rows += row('<span class="serif-it">' + esc(acc.name) + '</span> · night two', 'USD 0 · hosted by<span class="hs">Haruthai&nbsp;&amp;&nbsp;Suthep</span>');
  // 1 MARCH — departure
  rows += day('Monday · 1 March');
  rows += row('Hosted breakfast', 'USD 0 · included');
  rows += row('Departure coordination within the wedding programme', 'USD 0 · included');
  for (const s of S.transfers || []) {
    const t = TRANSFERS.find((x) => x.id === s.transferId);
    if (t && t.direction === 'departure') rows += row(esc(t.name) + ' · ' + (s.units || 1) + ' unit' + ((s.units || 1) > 1 ? 's' : ''), money(t.pricePerUnit * (s.units || 1)));
  }
  rows += '<div class="row total"><span class="l serif-it">Total guest contribution</span><span class="r js-total">' + money(total) + '</span></div>';
  box.innerHTML =
    '<p class="note" style="margin-bottom:18px">Everything below is part of your journey. Lines at USD 0 are included or hosted; your contribution is only what carries an amount.</p>' +
    '<div class="stay-sum fol" aria-live="polite">' + rows + '</div>' +
    '<p class="note" style="margin-top:16px">' + esc(COPY.priceNote) + '</p>' +
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
    g.journey.bangkok && 'Bangkok Journey', g.journey.train && 'Overnight Train — seat REQUESTED',
    g.journey.independent && 'Independent arrival'].filter(Boolean).join(' · ') || '—';
  const eventLine = (g) => EVENTS.filter((e) => g.events[e.id]).map((e) => e.label).join(' · ') || 'None';
  let html = '';
  html += '<p class="home-hello" style="margin-bottom:20px">' + esc(S.invitation.partyName) + ' · Vientiane · February 2027</p>';
  html += sec('Your Guests', idx('party'), [
    ['Party', esc(S.invitation.partyName)],
    ['Members', S.invitation.guests.map((g) => esc(g.fullName)).join(' · ')],
    ['Party lead', esc((S.invitation.guests.find((g) => g.guestId === S.invitation.partyLead) || {}).fullName || '—')],
  ]);
  html += sec('Your Journey', idx('journey'), S.guests.map((g) => [esc(g.preferredName), esc(journeyLine(g))]));
  const riders = S.guests.filter((g) => g.journey.train);
  html += sec('Overnight Train', idx('journey'), riders.length ? [
    ['Joined', riders.map((g) => esc(g.preferredName) + (g.berth ? ' · ' + esc(g.berth) : '')).join('<br/>')],
    ['Seats requested', String(riders.length) + ' · REQUESTED'],
    ['Arrival', 'Nong Khai Railway Station'],
    ['Onward transfer', trainOnwardLine()],
  ].concat(S.trainNote ? [['Note', esc(S.trainNote)]] : []) : [['Joined', 'Not joined']]);
  html += sec('Your Events', idx('events'), S.guests.map((g) => [esc(g.preferredName), esc(eventLine(g))]));
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
  html += sec('Arrival & Departure', idx('travel'), trv.concat([
    ['Departure', esc([S.departure.date, S.departure.time].filter(Boolean).join(' · ') || '—') + (S.departure.transferRequested ? ' · transfer REQUESTED' : '')],
  ]));
  html += sec('Your Transfers', idx('travel'), (S.transfers || []).length
    ? S.transfers.map((s) => {
        const t = TRANSFERS.find((x) => x.id === s.transferId) || {};
        const d = s.details || {};
        return [esc(t.name || s.transferId),
          (s.units || 1) + ' unit' + ((s.units || 1) > 1 ? 's' : '') + ' × ' + money(t.pricePerUnit || 0) + ' = ' + money((t.pricePerUnit || 0) * (s.units || 1)) +
          ' · ' + esc([d.date, d.time, d.ref].filter(Boolean).join(' · ') || 'details open') + ' · REQUESTED'];
      })
    : [['Requested', 'None']]);
  const jcRiders = S.guests.filter((g) => g.journey.train).length;
  const jcRows = [];
  if (acc) jcRows.push(['Stay', esc(acc.name) + ' · ' + (acc.contributionPerGuest == null ? 'complimentary · limited' : money(partyTotal(acc, occ)))]);
  if (jcRiders) jcRows.push(['Train', jcRiders + ' × ' + money(TRAIN.contributionPerGuest) + ' = ' + money(trainContribution(TRAIN, jcRiders) || 0)]);
  if ((S.transfers || []).length) jcRows.push(['Transfers', money(transfersTotal(TRANSFERS, S.transfers))]);
  jcRows.push(['Total journey cost', money(journeyTotal(acc, occ, TRAIN, jcRiders, TRANSFERS, S.transfers))]);
  html += sec('Your Journey Cost', idx('cost'), jcRows);
  html += sec('Each of You', idx('each'), S.guests.map((g) => [esc(g.preferredName),
    esc(g.diet) + (g.allergy === 'yes' ? ' · allergy: ' + esc(g.allergyDetail || 'yes') + (g.severe ? ' (severe)' : '') : '') +
    (g.spa && g.spa.requested ? ' · spa REQUESTED' : '')]));
  if (S.additionalGuestRequest) html += sec('Additional guest request', idx('party'), [['Request', esc(S.additionalGuestRequest) + ' — subject to Guest Relations approval']]);
  html += '<label class="confirm-row"><input type="checkbox" id="confirm-accurate"/><span>We confirm this information is accurate. We understand this registration is a request and that Guest Relations confirms all arrangements separately.</span></label>';
  html += '<p class="err" id="review-err"></p>';
  box.innerHTML = html;
  box.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => show(parseInt(b.getAttribute('data-goto'), 10))));
}

/* ---------------- step 11/12 · send + received (§29, §30) ---------------- */
function trainOnwardLine() {
  if (S.arrival.shared !== false) return S.arrival.pickupRequested ? 'Requested · Guest Relations confirms' : 'Not requested';
  const anyReq = S.guests.filter((g) => g.journey.train).some((g) => (S.arrivalByGuest[g.guestId] || {}).pickupRequested);
  return anyReq ? 'Requested · Guest Relations confirms' : 'Not requested';
}
function currentRegistration() {
  // photos stay on this device; passports never leave it (document vault pending)
  const guests = S.guests.map((g) => { const { photo, ...rest } = g; return { ...rest, passport: g.passport ? { name: g.passport.name, size: g.passport.size } : undefined }; });
  return {
    guests, stay: currentAcc() ? { ...S.stay } : { accommodationId: null },
    arrival: { ...S.arrival, point: S.guests.some((g) => g.journey.train) ? 'Nong Khai Railway Station' : (S.arrival.point || WEDDING.airport) },
    departure: S.departure, transfers: S.transfers, additionalGuestRequest: S.additionalGuestRequest,
    trainNote: S.trainNote, notes: S.notes, registration_submitted_at: S.registration_submitted_at,
  };
}
function trySubmit() {
  const errEl = document.getElementById('review-err');
  if (!document.getElementById('confirm-accurate').checked) {
    errEl.textContent = 'Please confirm the information is accurate first.'; errEl.classList.add('show'); return false;
  }
  const errors = validateRegistration(currentRegistration(), {
    invitation: S.invitation, accommodations: ACCOMMODATIONS, trainCapacity: TRAIN.capacityTotal, transfers: TRANSFERS,
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
  const bits = [];
  bits.push('<strong>' + esc(S.invitation.partyName) + '</strong>');
  const trainCount = S.guests.filter((g) => g.journey.train).length;
  if (trainCount) bits.push(trainCount + ' train seat' + (trainCount > 1 ? 's' : '') + ' · REQUESTED');
  if (acc) bits.push(esc(acc.name) + (RATES_LIVE && acc.contributionPerGuest != null ? ' · ' + money(partyTotal(acc, S.stay.occupantGuestIds)) : '') + (S.stay.waitlist ? ' · WAITLISTED' : ' · REQUESTED'));
  if ((S.transfers || []).length) bits.push(S.transfers.length + ' transfer' + (S.transfers.length > 1 ? 's' : '') + ' · ' + money(transfersTotal(TRANSFERS, S.transfers)) + ' · REQUESTED');
  if (S.arrival.pickupRequested) bits.push('pickup REQUESTED');
  el.querySelector('.sum-line').innerHTML = bits.join(' &nbsp;·&nbsp; ');
}

/* ---------------- navigation ---------------- */
document.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
  const name = stepEls[cur].dataset.step;
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
