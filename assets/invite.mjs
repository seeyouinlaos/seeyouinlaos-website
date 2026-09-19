/* See You In Laos — shared invitation gate for the open shop.
 *
 * REAL authentication against the production engine: the entered code is
 * validated with register/crypto.mjs (AES-256-GCM lookup) against the shipped
 * encrypted bundle register/invitations.enc.json. No codes, names or guest
 * data live in this file; nothing is enumerable without a valid token.
 *
 * API (window):
 *   SIYL_AUTH.get()            -> { invitationId, partyName } | null
 *   SIYL_AUTH.clear()
 *   SIYL_INVITE.require(fn)    -> runs fn immediately when authenticated;
 *                                 otherwise (Owner, Edit 3 · 16 Sep 2026) the
 *                                 guest is taken to the invitation page, where
 *                                 the code is entered, and returns to where
 *                                 they were (?next=). On the invitation page
 *                                 itself the code prompt opens in place.
 *   SIYL_INVITE.private(href)  -> true for a private surface (the journey, the
 *                                 bag, the tickets, the steps): never reachable
 *                                 without a session — every such link on a
 *                                 public page leads to the invitation page.
 *   SIYL_INVITE.gateUrl(next)  -> invitation.html?open=1&next=<page>
 *   The header of every page says whether a guest is signed in or not.
 */
import { lookupByToken, bearerOf } from '../register/crypto.mjs';

const KEY = 'siyl.auth';

let records = null;
async function loadRecords() {
  if (!records) {
    const r = await fetch(new URL('../register/invitations.enc.json', import.meta.url));
    records = await r.json();
  }
  return records;
}

/* ONE CODE = ONE GUEST (Owner decision, 14 Sep 2026). The code opens ONE
 * guest's invitation: the session is that guest and nobody else. There is no
 * "who are you", no switch, no answering for another person — a sister who
 * helps four guests opens four invitations, one code at a time. */
const AUTH = {
  get() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && v.invitationId ? v : null;
    } catch (e) { return null; }
  },
  /* a session is valid only in the guest-scoped form: one guest, one bearer */
  valid() {
    const v = this.get();
    return !!(v && v.guestId && v.bearer && v.invitationId === 'INV-' + v.guestId);
  },
  hasNames() { return this.valid(); },
  async set(inv) {
    const bearer = await bearerOf(inv.token);
    localStorage.setItem(KEY, JSON.stringify({
      invitationId: inv.invitationId,
      guestId: inv.guestId,
      partyId: inv.partyId || '',
      partyName: inv.partyName || '',
      fullName: inv.fullName || '',
      preferredName: inv.preferredName || inv.fullName || '',
      /* the hosts' roles at the ceremony (Bride, Groom) — explicit in the private list, never inferred */
      ...(inv.hostRole === 'BRIDE' || inv.hostRole === 'GROOM' ? { hostRole: inv.hostRole } : {}),
      hosts: inv.hosts === true,
      /* who belongs together — first names, for context only, never authority */
      members: (inv.members || []).map((m) => ({ guestId: m.guestId, preferredName: m.preferredName })),
      /* the Sangkhathan is offered to this guest, or not — explicit source truth */
      sangkhathan: inv.sangkhathan === 'ELIGIBLE' || inv.sangkhathan === 'NONE' ? inv.sangkhathan : 'UNRESOLVED',
      /* what the Worker checks on every write — never the code itself */
      bearer,
      at: new Date().toISOString(),
    }));
    /* this guest's own local draft, set aside when they left, comes back */
    GUEST.restore(inv.invitationId, inv.partyId || '', inv.guestId);
  },
  clear() { localStorage.removeItem(KEY); },
};

/* LEAVING (Owner, 13/14 Sep 2026). "Open another invitation" and "Sign out"
 * both end the session of the guest that is open. What Guest Relations
 * already received stays received on the server; the guest's local draft is
 * set aside on this device under their own invitation id — never shown to
 * another guest, restored when that same guest opens their code again — and
 * the session itself is cleared, so nothing of one guest can reach the next.
 * No second code is ever kept: there is nothing to switch to. */
const GUEST_KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
const RETIRED_KEYS = ['siyl.who'];
const GUEST = {
  leave() {
    const a = AUTH.get();
    if (a && a.invitationId && a.guestId) {
      const draft = {};
      GUEST_KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v !== null) draft[k] = v; });
      try { localStorage.setItem('siyl.party.' + a.invitationId, JSON.stringify(draft)); } catch (e) {}
    }
    GUEST_KEYS.concat(RETIRED_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('siyl.draft.owner');
    AUTH.clear();
    try { document.dispatchEvent(new CustomEvent('siyl:signout')); } catch (e) {}
  },
  restore(invitationId, partyId, guestId) {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem('siyl.party.' + invitationId) || 'null'); } catch (e) { draft = null; }
    const owner = localStorage.getItem('siyl.draft.owner');
    /* a draft from the retired party model on this device (the party open
     * when the code was last used, or set aside under the party id) becomes
     * this guest's own initial state — only where the mapping is unambiguous */
    let legacy = null;
    if (partyId && owner === partyId) { legacy = {}; GUEST_KEYS.concat(RETIRED_KEYS).forEach((k) => { const v = localStorage.getItem(k); if (v !== null) legacy[k] = v; }); }
    else if (partyId) { try { legacy = JSON.parse(localStorage.getItem('siyl.party.' + partyId) || 'null'); } catch (e) { legacy = null; } }
    /* the draft on this device belongs to one guest: another guest's is never
     * inherited; the same guest re-entering keeps everything they had */
    if (owner && owner !== invitationId) GUEST_KEYS.concat(RETIRED_KEYS).forEach((k) => localStorage.removeItem(k));
    if (draft) Object.keys(draft).forEach((k) => { if (GUEST_KEYS.indexOf(k) >= 0 && localStorage.getItem(k) === null) localStorage.setItem(k, draft[k]); });
    else if (legacy) migrateLegacy(legacy, partyId, guestId);
    localStorage.removeItem('siyl.party.' + invitationId);
    localStorage.setItem('siyl.draft.owner', invitationId);
  },
};

/* the retired party draft → this guest's own draft. Per-guest data follows
 * the guestId; party choices become an individual initial selection only
 * where the mapping is unambiguous; nothing ambiguous is invented; a party
 * send is never counted as this guest's send. The result is noted on this
 * device only. */
function migrateLegacy(legacy, partyId, guestId) {
  const parse = (k) => { try { return JSON.parse(legacy[k] || 'null'); } catch (e) { return null; } };
  const note = { from: partyId, guestId, at: new Date().toISOString(), moved: [] };
  const g = parse('siyl.guest');
  if (g) {
    const mine = (g.guests || {})[guestId];
    const out = { guests: {} };
    if (mine) { out.guests[guestId] = { submitted: mine.submitted || {}, profile: {}, history: (mine.history || []).filter((h) => !h.by || h.by === guestId), dress: mine.dress && mine.dress.by === guestId ? mine.dress : null }; note.moved.push('names'); if (mine.dress && mine.dress.by === guestId) note.moved.push('dress'); }
    /* the profile: only what this guest wrote in their own name; the retired
     * questions (comfort, anything, access) are not carried */
    if (mine && mine.profile) {
      const keep = ['coffeetea', 'flavor', 'drink'];   /* `avoid` (Question 5) retired 19 Sep 2026 */
      const wroteSelf = !(mine.history || []).some((h) => /^profile\./.test(h.field) && h.by && h.by !== guestId);
      if (wroteSelf) { keep.forEach((k) => { if (mine.profile[k]) out.guests[guestId].profile[k] = mine.profile[k]; }); note.moved.push('profile'); }
      else note.moved.push('profile:skipped-written-by-another');
    }
    /* one party contact → an initial value for this guest, to confirm in step 01 */
    if (g.party && (g.party.email || g.party.phone)) { out.contact = { email: g.party.email || '', phone: g.party.phone || '' }; note.moved.push('contact'); }
    localStorage.setItem('siyl.guest', JSON.stringify(out));
  }
  const t = parse('siyl.temple');
  if (t) {
    const by = (t.by || {})[guestId];
    const out = { by: {} };
    if (by) {
      out.by[guestId] = { attend: by.attend || null, events: by.events || {}, at: by.at, by: guestId };
      /* the pair decision was one explicit choice for both: it becomes this guest's own, if they attend */
      if (t.pair && by.attend === 'yes' && (t.pair.off === 'yes' || t.pair.off === 'no')) { out.by[guestId].off = t.pair.off; note.moved.push('sangkhathan'); }
      note.moved.push('attendance');
    }
    localStorage.setItem('siyl.temple', JSON.stringify(out));
  }
  const bag = parse('siyl.bag');
  if (Array.isArray(bag)) {
    /* per-person lines become one line for this guest; a stay keeps its room
     * choice and is held in a unit only once the guest chooses their place */
    const out = bag.filter((x) => x && x.id).map((x) => { const c = Object.assign({}, x); c.qty = 1; delete c.by; return c; });
    localStorage.setItem('siyl.bag', JSON.stringify(out));
    if (out.length) note.moved.push('journey:' + out.length);
  }
  ['siyl.skip', 'siyl.skip.by'].forEach((k) => { if (legacy[k]) localStorage.setItem(k, legacy[k]); });
  const d = parse('siyl.docs');
  if (d) {
    const out = { guests: {}, consent: {} };
    if (d.guests && d.guests[guestId]) out.guests[guestId] = d.guests[guestId];
    if (d.consent && d.consent[guestId] && d.consent[guestId].by === guestId) out.consent[guestId] = d.consent[guestId];
    localStorage.setItem('siyl.docs', JSON.stringify(out));
  }
  localStorage.removeItem('siyl.sent');
  RETIRED_KEYS.forEach((k) => localStorage.removeItem(k));
  if (partyId) localStorage.removeItem('siyl.party.' + partyId);
  try { localStorage.setItem('siyl.migrated', JSON.stringify(note)); } catch (e) {}
}

/* ---------------- overlay (tea.html visual grammar, shared) ---------------- */
const CSS = `
.siyl-inv-scrim{position:fixed;inset:0;background:rgba(30,30,30,.45);display:none;z-index:80}
.siyl-inv{position:fixed;left:0;right:0;bottom:0;background:#FCFAF6;padding:34px 26px calc(38px + env(safe-area-inset-bottom));display:none;z-index:81}
body.siyl-inv-open .siyl-inv-scrim,body.siyl-inv-open .siyl-inv{display:block}
.siyl-inv .ie{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#7C7A75;margin-bottom:10px;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif}
.siyl-inv h2{font-family:'PP Editorial Old',serif;font-weight:200;font-size:23px;margin-bottom:14px;color:#313131}
.siyl-inv input{width:100%;border:1px solid #DAD9D7;background:#fff;padding:15px 14px;font:inherit;letter-spacing:2px;margin-bottom:6px;color:#313131}
.siyl-inv .ierr{font-size:11.5px;color:#8A5A44;min-height:18px;margin:0 0 10px;line-height:1.5}
.siyl-inv .igo{display:block;width:100%;background:#313131;color:#F3EEE7;border:0;padding:19px;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;cursor:pointer;min-height:52px;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif}
.siyl-inv .igo[disabled]{opacity:.55}
.siyl-inv .ilost{font-size:11.5px;color:#7C7A75;margin-top:16px}
.siyl-inv .ilost a{color:#313131}
`;

let built = false;
let pending = null;

let styled = false;
function ensureStyle() { if (styled || !document.head || !document.createElement) return; styled = true; const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style); }
function build() {
  if (built) return;
  built = true;
  ensureStyle();
  const scrim = document.createElement('div');
  scrim.className = 'siyl-inv-scrim';
  const ov = document.createElement('div');
  ov.className = 'siyl-inv';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Your Invitation');
  ov.innerHTML =
    '<p class="ie">Your Invitation</p>' +
    '<h2>Enter your private invitation code.</h2>' +
    '<input type="text" autocomplete="one-time-code" autocapitalize="none" spellcheck="false" aria-label="Invitation code">' +
    '<p class="ierr" role="alert" aria-live="polite"></p>' +
    '<button type="button" class="igo">Continue</button>' +
    '<p class="ilost">Lost your code? <a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a></p>';
  document.body.append(scrim, ov);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('siyl-inv-open')) close();
  });
  const input = ov.querySelector('input');
  const err = ov.querySelector('.ierr');
  const go = ov.querySelector('.igo');
  async function attempt() {
    const code = input.value;
    if (!code.trim()) { err.textContent = 'Please enter the private code from your invitation letter.'; return; }
    go.disabled = true;
    try {
      const inv = await lookupByToken(code, await loadRecords());
      if (inv && inv.guestId) {
        await AUTH.set(inv);
        /* the guest's own invitation is open — the guest IS the session */
        try { document.dispatchEvent(new CustomEvent('siyl:auth')); } catch (e) {}
        err.textContent = '';
        input.value = '';
        close();
        const fn = pending; pending = null;
        if (fn) fn(AUTH.get());
        /* back to where the guest was going (a page of this site only) */
        const nx = safeNext(decodeURIComponent((LOC.search.match(/[?&]next=([^&]+)/) || [, ''])[1]));
        if (nx) { LOC.replace(hrefOf(nx)); return; }
      } else {
        err.textContent = 'We could not find that invitation code. Please use the private code from your invitation letter — or write to Guest Relations and we will help right away.';
      }
    } catch (e) {
      err.textContent = 'The invitation check is unavailable right now. Please try again in a moment.';
    }
    go.disabled = false;
  }
  go.addEventListener('click', attempt);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
}

/* ---- ACCESS (Owner, Edit 3 · 16 Sep 2026): nobody sees the journey, the bag, the
 * tickets or any step before they are signed in; every page says which it is ---- */
/* the private surfaces: the personal planner and its steps, the bag, the tickets, the room and transport
   planning pages (rates, live inventory, fares, adds). The Journey (journeys.html) is public editorial —
   its private fragments are marked data-private and stay out of a signed-out page (assets/invite-early.js). */
const PRIVATE = /^(?:\.\/)?(your-journey|cart|tickets|room|transport|wedding|wedding-preparation|about-you|profile|review)(?:\.html)?(?=$|[?#])/;
const LOC = typeof location !== 'undefined' ? location : { pathname: '/', search: '', hash: '', replace() {} };
const cleanUrls = !/\.html$/i.test(LOC.pathname) && LOC.pathname.split('/').pop() !== '';
const hrefOf = (file) => (cleanUrls ? file.replace(/\.html(?=[?#]|$)/, '') : file);
const here = () => LOC.pathname.split('/').pop() + LOC.search + LOC.hash;
function isPrivate(href) { if (!href) return false; const h = String(href).trim(); if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(h)) return false; return PRIVATE.test(h.replace(/^\//, '')); }
function safeNext(v) { return /^[a-z0-9-]+(?:\.html)?(?:\?[\w=&%.-]*)?(?:#[\w-]*)?$/i.test(v || '') ? v : ''; }
function gateUrl(next) { return hrefOf('invitation.html') + '?open=1' + (safeNext(next) ? '&next=' + encodeURIComponent(next) : ''); }
function toGate(next) { LOC.replace(gateUrl(next)); }
/* ACCOUNT ROW (Owner, 18 Sep 2026): MY TRIP · MY PROFILE · SIGN OUT under the sticky header — the bag icon IS My Bag (badge, always opens
   My Bag), so the row never repeats it; My Profile is the account dashboard (profile.html), never a step of the gated flow.
   the status line under every header: signed in · name · Your Journey | not signed in · Open your invitation.
   Its space is reserved before this module runs: the line sits in the markup of every page (assets/recon.js
   places it with the header it builds), styled by assets/aman.css — this only fills it, so nothing shifts. */
function renderAccess() {
  if (!document.querySelector) return;
  ensureStyle();
  const header = document.querySelector('header.hd'); if (!header) return;
  /* THE ACCOUNT LIVES IN THE MENU (Owner, 18 Sep 2026 · Aman): the header is menu · wordmark · bag and nothing beneath. The
     drawer's account block (assets/aman.js) says who is signed in and carries My Trip · My Profile · Sign out; signed out it
     carries the way in. The bag icon is My Bag on every page. */
  /* the drawer's own block wins; a block this module placed before the drawer existed (the module runs before aman.js has
     built the menu) is dropped as soon as the drawer carries one */
  const inMenu = document.querySelector('.a-menu [data-account]');
  if (inMenu && document.querySelectorAll) document.querySelectorAll('[data-account]').forEach((x) => { if (x !== inMenu && x.parentElement !== inMenu && typeof x.remove === 'function') x.remove(); });
  let el = inMenu || document.querySelector('[data-account]');
  if (!el) { el = document.createElement('div'); el.className = 'a-macct'; el.setAttribute('data-account', ''); const menu = document.querySelector('.a-menu'); if (menu && typeof menu.insertBefore === 'function') menu.insertBefore(el, menu.firstChild); else if (document.body && typeof document.body.appendChild === 'function') { el.hidden = true; document.body.appendChild(el); } }
  if (el.hidden && el.parentElement && el.parentElement.classList && el.parentElement.classList.contains('a-menu')) el.hidden = false;
  const a = AUTH.get(), ok = !!(a && AUTH.valid());
  el.setAttribute('data-state', ok ? 'in' : 'out');
  el.innerHTML = ok
    ? '<span class="a-macct-who">Signed in · ' + esc(a.preferredName || a.fullName || 'you') + '</span><nav class="a-macct-nav" aria-label="Your account"><a href="' + hrefOf('your-journey.html') + '" data-access-nav="trip">My Trip</a><a href="' + hrefOf('profile.html') + '" data-access-nav="profile">My Profile</a><button type="button" class="a-macct-out" data-access-out>Sign out</button></nav>'
    : '<span class="a-macct-who">Not signed in</span><nav class="a-macct-nav" aria-label="Your account"><a href="' + gateUrl('') + '" data-access-nav="in">Open your invitation</a></nav>';
  const out = el.querySelector('[data-access-out]'); if (out) out.addEventListener('click', () => { GUEST.leave(); LOC.replace(hrefOf('invitation.html')); });
  /* a stale access row of the older shell, if a cached page still carries one */
  const old = document.querySelector('header.hd [data-access]'); if (old && old.parentElement && typeof old.parentElement.removeChild === 'function') old.parentElement.removeChild(old);
  publishShellHeight(header);
}
/* the shell's real height, for everything that sticks below it (the step bar) and for anchor scrolling */
function publishShellHeight(header) {
  try { const h = header || document.querySelector('header.hd'); if (!h || !document.documentElement.style) return; document.documentElement.style.setProperty('--hd-h', h.offsetHeight + 'px'); if (!publishShellHeight.wired && typeof window.addEventListener === 'function') { publishShellHeight.wired = true; window.addEventListener('resize', () => publishShellHeight()); } } catch (e) {}
}
function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* every link to a private surface leads to the invitation page while nobody is signed in */
function gateLinks() {
  if (!document.querySelectorAll) return;
  const a = AUTH.get(), ok = !!(a && AUTH.valid());
  if (document.documentElement && document.documentElement.setAttribute) document.documentElement.setAttribute('data-session', ok ? 'in' : 'out');
  document.querySelectorAll('a[href]').forEach((l) => {
    const orig = l.getAttribute('data-private-href') || l.getAttribute('href');
    if (!isPrivate(orig)) return;
    if (!l.hasAttribute('data-private-href')) l.setAttribute('data-private-href', orig);
    l.setAttribute('href', ok ? orig : gateUrl(orig.replace(/^\.?\//, '')));
  });
  /* the way in, where private planning would be (data-private-cta: exists only while nobody is signed in — the
     stylesheet hides it for a guest): it leads to the invitation page with the way back to this page */
  document.querySelectorAll('a[data-private-cta]').forEach((l) => { const h = ok ? hrefOf('your-journey.html') : gateUrl(here()); if (l.getAttribute('href') !== h) l.setAttribute('href', h); });
  /* the public close call to action (data-cta-in): Open your invitation → the invitation page while nobody is signed in;
     Continue Your Journey → the planner for a guest */
  document.querySelectorAll('a[data-cta-in]').forEach((l) => {
    if (!l.hasAttribute('data-cta-out')) { l.setAttribute('data-cta-out', l.textContent); l.setAttribute('data-href-out', l.getAttribute('href')); }
    const text = ok ? l.getAttribute('data-cta-in') : l.getAttribute('data-cta-out'), href = ok ? hrefOf(l.getAttribute('data-href-in')) : l.getAttribute('data-href-out');
    if (l.textContent !== text) l.textContent = text;
    if (l.getAttribute('href') !== href) l.setAttribute('href', href);
  });
  /* a public call to action that leads into private planning (data-cta-swap): signed out it reads Open your
     invitation and leads to the invitation page with the way back; signed in it is the relevant private action */
  document.querySelectorAll('a[data-cta-swap]').forEach((l) => {
    if (!l.hasAttribute('data-cta-text')) { l.setAttribute('data-cta-text', l.textContent); l.setAttribute('data-cta-href', l.getAttribute('data-private-href') || l.getAttribute('href')); }
    const text = ok ? l.getAttribute('data-cta-text') : 'Open your invitation', href = ok ? l.getAttribute('data-cta-href') : gateUrl(here());
    /* assign only what changes: a text node replaced on every pass would wake the observer below without end */
    if (l.textContent !== text) l.textContent = text;
    if (l.getAttribute('href') !== href) l.setAttribute('href', href);
  });
}
document.addEventListener('click', (e) => {
  const l = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!l) return;
  const orig = l.getAttribute('data-private-href') || l.getAttribute('href');
  if (!isPrivate(orig)) return;
  const a = AUTH.get(); if (a && AUTH.valid()) return;
  e.preventDefault(); toGate(orig.replace(/^\.?\//, ''));
}, true);
/* a private fragment of a public page (a price of the journey, live inventory, an add, a fare — data-private) leaves the
   document while nobody is signed in: hidden from the first paint by the stylesheet, removed here (a sign-in always
   arrives by the invitation page, so the page is rebuilt with them) */
function dropPrivate() { const a = AUTH.get(); if (a && AUTH.valid()) return; if (!document.querySelectorAll) return; document.querySelectorAll('[data-private]').forEach((el) => { if (el.parentNode) el.parentNode.removeChild(el); }); }
function accessReady() { dropPrivate(); renderAccess(); gateLinks(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', accessReady); else accessReady();
document.addEventListener('siyl:auth', accessReady); document.addEventListener('siyl:signout', accessReady);
/* the drawer is built by assets/aman.js after this module ran: fill its account block the moment it exists */
document.addEventListener('siyl:menu', renderAccess);
/* menus and footers are built by scripts after this one: one more pass once everything is in place */
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('load', () => { gateLinks(); renderAccess(); });
if (typeof MutationObserver !== 'undefined' && document.documentElement) new MutationObserver(() => { if (document.querySelector('a[href]:not([data-private-href])')) gateLinks(); }).observe(document.documentElement, { childList: true, subtree: true });

function open() {
  build();
  document.body.classList.add('siyl-inv-open');
  const input = document.querySelector('.siyl-inv input');
  if (input) setTimeout(() => input.focus(), 60);
}
function close() {
  document.body.classList.remove('siyl-inv-open');
}

window.SIYL_AUTH = AUTH;
window.SIYL_INVITE = {
  require(fn) {
    const a = AUTH.get();
    if (a && AUTH.valid()) { fn(a); return; }
    if (!/^invitation(\.html)?$/.test(LOC.pathname.split('/').pop())) { toGate(here()); return; }
    pending = fn;
    open();
  },
  private: isPrivate,
  gateUrl,
  authed() { const a = AUTH.get(); return !!(a && AUTH.valid()); },
  /* true when a stored session predates the guest-scoped invitations */
  stale() { return !!AUTH.get() && !AUTH.valid(); },
  /* leave: the code screen, clean; this guest's draft kept aside */
  leave() { GUEST.leave(); },
  /* the bearer for an authenticated write — never the code */
  bearer() { const a = AUTH.get(); return a && a.bearer ? a.bearer : ''; },
  open,
  close,
};
document.dispatchEvent(new CustomEvent('siyl:invite-ready'));
