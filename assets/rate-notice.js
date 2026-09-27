/* ============================================================================
   THE SOUPHATTRA RATE CORRECTION NOTICE (Owner, 27 Sep 2026) — informational, once per browser.

   WHY: the website showed the Wedding Stay's rates inside the pre-wedding stay (25 – 27 February 2027). The rates are corrected
   (assets/rooms-data.js · rates.prewed / rates.wedstay, the live Operations Master); a guest who planned earlier is told so, once.

   WHO: a signed-in guest who can meet the Souphattra — not a visitor, not a guest whose answer rules out Vientiane — after the
   note from Guest Relations and the Unwritten Rules (those come first and are never covered).

   KEPT: in this browser only — localStorage under a versioned key (a later correction takes a new version). Nothing is written to
   the Worker: no request of any kind leaves this module. Another browser shows it once too; that is intended.

   HOW: the site's own editorial sheet (the Guest Relations note's language: Ivory, the Cherry mark, Editorial Old); no checkbox.
   The one button closes it and opens the Souphattra's pre-wedding rates on The Journey. Thai comes from the site's dictionary.
   ========================================================================== */
(function () {
  'use strict';
  var VERSION = 'souphattra-rate-correction-2026-09-27';
  var KEY = 'siyl.notice.' + VERSION;
  var TARGET = 'journeys.html#j-prewed';
  var TEXT = {
    eyebrow: 'Rate correction',
    title: 'An important update about Souphattra Heritage',
    body: [
      'We recently identified incorrect rates in our system for Souphattra Heritage stays from 25–27 February 2027.',
      'The rates have now been corrected, and the prices currently shown on the website are the correct rates.',
      'If you reviewed or planned your stay earlier, please take a moment to check the updated prices before continuing.'
    ],
    kept: 'Your existing room selection has not been changed.',
    sorry: 'We apologise for the confusion and thank you for your understanding.',
    go: 'View corrected rates'
  };
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return true; } }   /* no storage: never nag */
  function remember() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* this view only */ } }
  function auth() { var A = window.SIYL_AUTH; try { return A && A.get ? A.get() : null; } catch (e) { return null; } }
  function guest() { try { return JSON.parse(localStorage.getItem('siyl.guest') || 'null') || {}; } catch (e) { return {}; } }
  /* a guest whose own answer rules the Vientiane stays out never meets the Souphattra */
  function concerned(st) {
    var s = st && st.scope; if (!s || typeof s !== 'object') return true;
    if (s.none === true) return false;
    if (s.all === true) return true;
    var keys = ['vientiane', 'vientianePreWedding', 'vientianeWedding'].filter(function (k) { return k in s; });
    return !keys.length || keys.some(function (k) { return s[k] === true; });
  }
  /* the two gates come first: the note and the Unwritten Rules are never covered */
  function gatesClear(a, st) {
    if (document.querySelector('[data-guest-note]') || /unwritten-rules|invitation/.test(location.pathname)) return false;
    var N = window.SIYL_NOTE, R = window.SIYL_RULES;
    if (!a.hosts && N && N.acknowledged && !N.acknowledged(st)) return false;
    if (!a.hosts && R && R.acknowledged && !R.acknowledged(st)) return false;
    return true;
  }
  function needs() {
    var a = auth(); if (!a || !a.guestId || seen()) return false;
    var D = window.SIYL_DRAFT, ds = D && D.state ? D.state() : null; if (!ds || !ds.ready) return false;
    var st = guest(); return concerned(st) && gatesClear(a, st);
  }
  function html() {
    var T = TEXT;
    return '<div class="siyl-rate-in">' +
      '<p class="sr-eyebrow">' + esc(T.eyebrow) + '</p>' +
      '<h2 id="siyl-rate-h">' + esc(T.title) + '</h2>' +
      T.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
      '<div class="sr-mark"><p class="sr-lead">' + esc(T.kept) + '</p></div>' +
      '<p>' + esc(T.sorry) + '</p>' +
      '<button type="button" class="sr-go" data-rate-go>' + esc(T.go) + '</button>' +
      '</div>';
  }
  var CSS =
    '.siyl-rate{position:fixed;inset:0;z-index:89;background:#F2ECE1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;' +
      'padding:calc(48px + env(safe-area-inset-top,0px)) var(--a-gut,24px) calc(44px + env(safe-area-inset-bottom,0px))}' +
    'body.siyl-rate-open{overflow:hidden}' +
    '.siyl-rate-in{max-width:560px;margin:0 auto;color:#313131;font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.75;letter-spacing:.2px}' +
    '.siyl-rate .sr-eyebrow{font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:#74070E;margin:0 0 18px}' +
    'html[lang="th"] .siyl-rate .sr-eyebrow{letter-spacing:0;text-transform:none;font-size:13px}' +
    '.siyl-rate h2{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:30px;line-height:1.2;margin:0 0 26px;color:#313131;text-wrap:balance}' +
    '.siyl-rate h2:focus{outline:none}' +
    '.siyl-rate p{margin:0 0 16px}' +
    '.siyl-rate .sr-mark{border-left:1px solid #74070E;padding:4px 0 2px 18px;margin:26px 0}' +
    '.siyl-rate .sr-mark p{margin:0}' +
    '.siyl-rate .sr-lead{font-family:"PP Editorial Old",Georgia,serif;font-size:19px;line-height:1.45;font-weight:200}' +
    '.siyl-rate .sr-go{display:block;width:100%;margin-top:26px;background:#313131;color:#F3EEE7;border:0;padding:19px;min-height:52px;font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;cursor:pointer}' +
    'html[lang="th"] .siyl-rate .sr-go{letter-spacing:0;font-size:13px}' +
    '.siyl-rate .sr-go:focus-visible{outline:2px solid #74070E;outline-offset:3px}' +
    '@media (min-width:768px){.siyl-rate{padding-top:calc(88px + env(safe-area-inset-top,0px))}.siyl-rate h2{font-size:36px}}';
  var open = false;
  function close(ov) { open = false; document.body.classList.remove('siyl-rate-open'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); }
  function show() {
    if (open || !document.body) return; open = true;
    if (!document.getElementById('siyl-rate-css')) { var s = document.createElement('style'); s.id = 'siyl-rate-css'; s.textContent = CSS; document.head.appendChild(s); }
    var ov = document.createElement('div');
    ov.className = 'siyl-rate'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'siyl-rate-h');
    ov.setAttribute('data-rate-notice', VERSION); ov.innerHTML = html();
    document.body.appendChild(ov); document.body.classList.add('siyl-rate-open');
    ov.querySelector('[data-rate-go]').addEventListener('click', function () {
      remember(); close(ov);
      if (/journeys(\.html)?$/.test(location.pathname)) { location.hash = 'j-prewed'; var t = document.getElementById('j-prewed'); if (t && t.scrollIntoView) t.scrollIntoView(); }
      else location.href = TARGET;
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { remember(); close(ov); } if (e.key === 'Tab') { e.preventDefault(); ov.querySelector('[data-rate-go]').focus(); } });
    try { ov.querySelector('h2').setAttribute('tabindex', '-1'); ov.querySelector('h2').focus({ preventScroll: true }); } catch (e) { /* a courtesy */ }
  }
  var timer = null;
  function check() { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = null; if (!open && needs()) show(); }, 700); }
  window.SIYL_RATE_NOTICE = { VERSION: VERSION, KEY: KEY, TARGET: TARGET, TEXT: TEXT, concerned: concerned, needs: needs, html: html, check: check };
  document.addEventListener('siyl:draft', check);
  document.addEventListener('siyl:auth', check);
  document.addEventListener('siyl:guest', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
