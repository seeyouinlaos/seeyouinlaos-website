/* ============================================================================
   A NOTE FROM YOUR GUEST RELATIONS MANAGER (Owner, 26 Sep 2026) — the one acknowledgement
   every guest gives once, after their invitation code has opened their own
   invitation and before the journey itself.

   WHEN: on every page of the private journey (the pages that keep the guest's
   server draft, assets/draft.js), for a signed-in guest (never the hosts), once
   the server draft has been read — so a guest who acknowledged on another device
   is never asked again — and only while this guest's draft carries no
   acknowledgement of this text version. Guests who registered before this note
   existed see it once, on their next visit.

   WHERE IT IS KEPT: in the guest's own draft record (siyl.guest → note:
   { acknowledged, at, textVersion, guestId }), the same record that keeps the
   photography acknowledgement, written to the Worker (/api/draft) at once. The
   Worker reads it for Guest Relations (/api/gr/journeys · noteAck) and leaves it
   out of the trip's content, so acknowledging never marks a sent trip as
   changed. Nothing else of the guest's journey is read, changed or reset here.

   HOW: a calm full-screen sheet in the site's own voice; the checkbox is never
   pre-ticked, the button stays disabled until the guest ticks it, the sheet
   cannot be dismissed without it, and it scrolls — the checkbox and the button
   stand at its end, reachable on the smallest phone. Thai comes from the site's
   dictionary (src/i18n-th.json), like every other sentence.
   ========================================================================== */
(function () {
  'use strict';
  var VERSION = '2026-09-26';
  var KEY = 'siyl.guest';

  /* THE OWNER-APPROVED COPY (26 Sep 2026): the Guest Relations Manager speaks, Haruthai & Suthep in the third person */
  var TITLE = 'A Note from Your Guest Relations Manager';
  var SALUTE = 'Dear family and friends,';
  var INTRO = [
    'Before you continue, I would like to share something with you on behalf of Haruthai & Suthep.',
    'They are incredibly grateful that family and friends from different countries and cultures are coming together to celebrate their wedding. Some of you are travelling a very long way, others are rearranging work, family commitments or personal plans to be there. Haruthai & Suthep are very aware of this, and none of it is taken for granted.',
    'Haruthai & Suthep have put an incredible amount of thought, time and personal effort into creating this wedding experience for all of you. They have tried to consider everyone — different travel plans, cultures, expectations and individual circumstances — and they are still working very hard to make this experience as thoughtful and fair as possible for all of their guests.'
  ];
  var COUPLE = 'At the same time, I kindly ask everyone to remember that they are also the bride and groom. They want to enjoy the anticipation of their wedding and focus on preparing for one of the most important moments of their lives, rather than having to personally discuss individual arrangements or exceptions.';
  var CULTURE = 'Expectations around weddings and hospitality can be very different across cultures. There is no intention to judge one tradition against another. We simply ask everyone to recognise these differences and to show the same consideration and respect that Haruthai & Suthep have tried to give every guest throughout their planning.';
  var STAY_H = 'About the Wedding Stay';
  var STAY = 'Haruthai & Suthep have reserved the entire hotel exclusively for their wedding guests as a full hotel buyout. The Wedding Stay is therefore organised as one two-night arrangement: guests contribute towards the first night, while the second night is complimentary and hosted by Haruthai & Suthep.';
  var FAIR = [
    'Choosing another hotel or shortening the stay does not necessarily reduce the overall cost or complexity of the wedding arrangement. The hotel buyout, accommodation allocation and the wider wedding programme are planned as one coordinated system. Guests staying outside this arrangement still need to be integrated into the wedding programme, which creates separate operational and cost considerations.',
    'There is also limited accommodation capacity within the hotel. A room reserved for fewer guests may still occupy capacity that could otherwise accommodate additional guests, and rooms cannot reasonably be reassigned between different guests from one night to the next.'
  ];
  var FAIR_END = 'For these reasons, choosing another hotel or reducing the stay does not automatically make the arrangement easier or fairer. It can, in fact, have the opposite effect.';
  var STAY_ASK = 'We therefore kindly ask everyone using the Wedding Stay to respect the same two-night arrangement.';
  var HELP_H = 'I’m Here to Help';
  var HELP = [
    'As your Guest Relations Manager, this is exactly what I am here for.',
    'Please never feel uncomfortable asking me a question. Whether you have a special circumstance, need help with your stay or would like something clarified, please contact me directly rather than discussing or negotiating individual arrangements with the bride and groom.',
    'If something requires a personal decision from Haruthai & Suthep, I will speak with them on your behalf and come back to you.'
  ];
  var ALL = 'All we ask is that you respect this arrangement and allow Haruthai & Suthep the space to focus on their wedding and on creating this experience for all of you.';
  var THANKS = 'Thank you for your understanding, your consideration and, above all, for making the journey to celebrate with them. ❤️';
  var ACK = 'I understand the Wedding Stay arrangement and that choosing another hotel or shortening my stay does not automatically make the overall arrangement easier or fairer. I respect the cultural considerations explained above and will contact Guest Relations regarding individual arrangements, special circumstances or exceptions rather than discussing or negotiating them directly with the bride and groom.';
  var TEXT = { title: TITLE, salute: SALUTE, intro: INTRO, couple: COUPLE, culture: CULTURE, stayH: STAY_H, stay: STAY, fair: FAIR, fairEnd: FAIR_END, stayAsk: STAY_ASK,
    helpH: HELP_H, help: HELP, all: ALL, thanks: THANKS, grName: 'Khun Paddy · Maninthorn Kongkeow', grRole: 'Guest Relations Manager', grMail: 'guest.relation.seeyouinlaos@gmail.com', ack: ACK, go: 'I understand · Continue' };

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function acknowledged(st) { var n = st && st.note; return !!(n && n.acknowledged === true && n.textVersion === VERSION); }
  function session() { var A = window.SIYL_AUTH; try { return A && A.get ? A.get() : null; } catch (e) { return null; } }
  /* the one decision: a signed-in guest (not the hosts), the server draft read, no acknowledgement of this text yet */
  function needs(auth, st, draft) { return !!(auth && auth.guestId && !auth.hosts && draft && draft.ready && !acknowledged(st)); }

  function html() {
    var p = function (t, cls) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(t) + '</p>'; };
    var T = TEXT;
    return '<div class="siyl-note-in">' +
      '<h2 id="siyl-note-h">' + esc(T.title) + '</h2>' +
      p(T.salute, 'sn-salute') + T.intro.map(function (t) { return p(t); }).join('') + p(T.couple) + p(T.culture) +
      '<h3 class="sn-h">' + esc(T.stayH) + '</h3>' + p(T.stay) + T.fair.map(function (t) { return p(t); }).join('') +
      '<div class="sn-mark" data-note-fair>' + p(T.fairEnd, 'sn-lead') + '</div>' + p(T.stayAsk) +
      '<h3 class="sn-h">' + esc(T.helpH) + '</h3>' + T.help.map(function (t) { return p(t); }).join('') +
      '<div class="sn-mark" data-note-ask>' + p(T.all, 'sn-lead') + '</div>' + p(T.thanks) +
      '<div class="sn-sign"><p>' + esc(T.grName) + '</p><p class="sn-role">' + esc(T.grRole) + '</p>' +
      '<p><a href="mailto:' + esc(T.grMail) + '">' + esc(T.grMail) + '</a></p></div>' +
      '<label class="sn-ack"><input type="checkbox" data-note-ack><span>' + esc(T.ack) + '</span></label>' +
      '<button type="button" class="sn-go" data-note-go disabled aria-disabled="true">' + esc(T.go) + '</button>' +
      '</div>';
  }

  var CSS =
    '.siyl-note{position:fixed;inset:0;z-index:90;background:#F2ECE1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;' +
      'padding:calc(40px + env(safe-area-inset-top,0px)) var(--a-gut,24px) calc(44px + env(safe-area-inset-bottom,0px))}' +
    'body.siyl-note-open{overflow:hidden}' +
    '.siyl-note-in{max-width:620px;margin:0 auto;color:#313131;font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.75;letter-spacing:.2px}' +
    '.siyl-note h2{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:30px;line-height:1.2;margin:0 0 26px;color:#313131;text-wrap:balance}' +
    '.siyl-note h2:focus{outline:none}' +
    '.siyl-note p{margin:0 0 16px}' +
    '.siyl-note .sn-salute{margin-bottom:18px}' +
    '.siyl-note .sn-h{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:22px;line-height:1.3;margin:40px 0 14px;padding-top:26px;border-top:1px solid #DAD4C8;color:#313131}' +
    '.siyl-note .sn-role{color:#7C7A75}' +
    '.siyl-note .sn-mark{border-left:1px solid #74070E;padding:4px 0 2px 18px;margin:26px 0}' +
    '.siyl-note .sn-mark p:last-child{margin-bottom:0}' +
    '.siyl-note .sn-lead{font-family:"PP Editorial Old",Georgia,serif;font-size:19px;line-height:1.45;font-weight:200}' +
    '.siyl-note .sn-sign{border-top:1px solid #DAD4C8;margin:30px 0 26px;padding-top:22px}' +
    '.siyl-note .sn-sign p{margin:0 0 4px}.siyl-note .sn-sign a{color:#313131;word-break:break-all}' +
    '.siyl-note .sn-ack{display:grid;grid-template-columns:22px 1fr;gap:14px;align-items:start;padding:18px 0;border-top:1px solid #DAD4C8;cursor:pointer}' +
    '.siyl-note .sn-ack input{width:20px;height:20px;margin:3px 0 0;accent-color:#74070E;cursor:pointer}' +
    '.siyl-note .sn-go{display:block;width:100%;margin-top:8px;background:#313131;color:#F3EEE7;border:0;padding:19px;min-height:52px;font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;cursor:pointer}' +
    '.siyl-note .sn-go[disabled]{opacity:.45;cursor:default}' +
    '.siyl-note .sn-go:focus-visible,.siyl-note .sn-ack input:focus-visible{outline:2px solid #74070E;outline-offset:3px}' +
    '@media (min-width:768px){.siyl-note{padding-top:calc(72px + env(safe-area-inset-top,0px))}.siyl-note h2{font-size:36px}}';

  var open = false;
  function show() {
    if (open || !document.body) return; open = true;
    if (!document.getElementById('siyl-note-css')) { var s = document.createElement('style'); s.id = 'siyl-note-css'; s.textContent = CSS; document.head.appendChild(s); }
    var ov = document.createElement('div');
    ov.className = 'siyl-note'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'siyl-note-h');
    ov.setAttribute('data-guest-note', VERSION); ov.innerHTML = html();
    document.body.appendChild(ov); document.body.classList.add('siyl-note-open');
    var box = ov.querySelector('[data-note-ack]'), go = ov.querySelector('[data-note-go]');
    box.checked = false;
    box.addEventListener('change', function () { go.disabled = !box.checked; go.setAttribute('aria-disabled', box.checked ? 'false' : 'true'); });
    go.addEventListener('click', function () { if (!box.checked) return; if (acknowledge()) close(ov); });
    /* the note is the page until it is acknowledged: the focus stays inside it */
    ov.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(ov.querySelectorAll('a[href], input, button:not([disabled])')); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    try { ov.scrollTop = 0; ov.querySelector('h2').setAttribute('tabindex', '-1'); ov.querySelector('h2').focus({ preventScroll: true }); } catch (e) { /* focus is a courtesy */ }
  }
  function close(ov) { open = false; document.body.classList.remove('siyl-note-open'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); }
  /* written into the guest's own draft record and saved to the Worker at once */
  function acknowledge() {
    var a = session(); if (!a || !a.guestId) return false;
    var st = read();
    st.note = { acknowledged: true, at: new Date().toISOString(), textVersion: VERSION, guestId: a.guestId };
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { return false; }
    try { document.dispatchEvent(new CustomEvent('siyl:guest')); } catch (e) { /* nothing listens yet */ }
    var D = window.SIYL_DRAFT; try { if (D && D.touch) D.touch(); if (D && D.flush) D.flush('note'); } catch (e) { /* the autosave keeps trying */ }
    return true;
  }
  function check() {
    var D = window.SIYL_DRAFT;
    if (needs(session(), read(), D && D.state ? D.state() : null)) show();
  }

  window.SIYL_NOTE = { VERSION: VERSION, TEXT: TEXT, needs: needs, acknowledged: acknowledged, html: html, check: check };
  document.addEventListener('siyl:draft', check);
  document.addEventListener('siyl:auth', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
