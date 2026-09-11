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
 *   SIYL_INVITE.require(fn)    -> runs fn immediately when authenticated,
 *                                 otherwise opens the invitation overlay and
 *                                 runs fn after a valid code (the interrupted
 *                                 action completes; the guest stays on page).
 */
import { lookupByToken } from '../register/crypto.mjs';

const KEY = 'siyl.auth';

let records = null;
async function loadRecords() {
  if (!records) {
    const r = await fetch(new URL('../register/invitations.enc.json', import.meta.url));
    records = await r.json();
  }
  return records;
}

const AUTH = {
  get() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && v.invitationId ? v : null;
    } catch (e) { return null; }
  },
  /* A session opened before the named party travelled with it carries an
   * invitation but no names. Every per-person surface — the wedding, the
   * documents, the profile — is impossible in that state, so it counts as
   * NOT authenticated and the guest is asked for the code once more. */
  hasNames() {
    const v = this.get();
    return !!(v && Array.isArray(v.guests) && v.guests.length);
  },
  set(inv) {
    /* The named party travels with the session. Wave 1 needs per-person state
     * — attendance, the Sangkhathan, seats, the profile — and per-person state
     * is impossible without the names the invitation already resolved.
     * SOURCE ONLY: exactly what the encrypted bundle carries today
     * (guestId, fullName, preferredName). No new personal data is shipped. */
    localStorage.setItem(KEY, JSON.stringify({
      invitationId: inv.invitationId,
      partyName: inv.partyName || '',
      partyLead: inv.partyLead || '',
      guests: (inv.guests || [])
        .filter((g) => (g.status || 'ACTIVE') === 'ACTIVE')
        .map((g) => ({ guestId: g.guestId, fullName: g.fullName, preferredName: g.preferredName || g.fullName })),
      at: new Date().toISOString(),
    }));
  },
  clear() { localStorage.removeItem(KEY); },
};

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

function build() {
  if (built) return;
  built = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
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
      if (inv) {
        AUTH.set(inv);
        /* the PARTY is open — the shell now asks who is continuing */
        try { document.dispatchEvent(new CustomEvent('siyl:auth')); } catch (e) {}
        err.textContent = '';
        input.value = '';
        close();
        const fn = pending; pending = null;
        if (fn) fn(AUTH.get());
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
    if (a && AUTH.hasNames()) { fn(a); return; }
    pending = fn;
    open();
  },
  /* true when a stored session predates the named party */
  stale() { return !!AUTH.get() && !AUTH.hasNames(); },
  open,
  close,
};
document.dispatchEvent(new CustomEvent('siyl:invite-ready'));
