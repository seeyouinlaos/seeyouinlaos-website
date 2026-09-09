/* ============================================================================
   SEE YOU IN LAOS — THE PREPARATION RAIL.

   Six surfaces make up the authenticated preparation of a journey. On a phone
   they are long pages, and a guest who scrolls for a minute deserves to know
   where they are and what comes next. This is orientation, not a dashboard:
   one hairline, one line of type, no progress bar, no scores, no permanent
   toolbar. It appears only on the six preparation surfaces.
   ========================================================================== */
(function () {
  'use strict';

  /* The six steps of the registration, in the order the guest walks them.
   * The invitation itself is the way in, not a numbered step. */
  var STEPS = [
    ['You',                 'you.html',          'you'],
    ['Your journey',        'your-journey.html', 'journey'],
    ['The Wedding',         'voyage.html',       'wedding'],
    ['Documents & privacy', 'documents.html',    'documents'],
    ['About you',           'about-you.html',    'about'],
    ['Review & Send',       'review.html',       'review']
  ];

  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase().replace(/\.html$/, '');
  var i = STEPS.map(function (s) { return s[1].replace(/\.html$/, ''); }).indexOf(here || 'index');
  if (i < 0) return;

  var css = document.createElement('style');
  css.textContent =
    '.prep{border-bottom:1px solid #DAD9D7;background:#F3EEE7}' +
    '.prep-in{max-width:640px;margin:0 auto;padding:13px 24px;display:flex;align-items:center;gap:12px}' +
    '.prep-l{display:none;font-size:9px;letter-spacing:2.2px;text-transform:uppercase;color:#7C7A75;white-space:nowrap}' +
    '@media (min-width:480px){.prep-l{display:inline}}' +
    '.prep-n{font-size:9px;letter-spacing:2.2px;text-transform:uppercase;color:#313131;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.prep-a{margin-left:auto;display:flex;gap:2px;flex:none}' +
    '.prep-a a{width:44px;height:44px;margin:-13px 0;display:flex;align-items:center;justify-content:center;color:#7C7A75;text-decoration:none;font-size:15px}' +
    '.prep-a a:hover{color:#313131}' +
    '.prep-a a[aria-disabled="true"]{opacity:.28;pointer-events:none}' +
    '.prep-s{font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:#7C7A75;white-space:nowrap;border-left:1px solid #DAD9D7;padding-left:12px;display:none}' +
    '@media (min-width:600px){.prep-s{display:inline}}' +
    '@media (min-width:768px){.prep-in{max-width:var(--a-frame);padding-left:var(--a-gut);padding-right:var(--a-gut)}}';
  document.head.appendChild(css);

  function build() {
    var G = window.SIYL_GUEST;
    var state = (G && G.party() && STEPS[i][2]) ? G.stepState(STEPS[i][2]) : '';
    var el = document.createElement('nav');
    el.className = 'prep';
    el.setAttribute('aria-label', 'Registration');
    el.innerHTML = '<div class="prep-in">' +
      '<span class="prep-l">Registration</span>' +
      '<span class="prep-n">' + (i + 1) + ' of ' + STEPS.length + ' · ' + STEPS[i][0] + '</span>' +
      (state ? '<span class="prep-s">' + state + '</span>' : '') +
      '<span class="prep-a">' +
        '<a href="' + (i > 0 ? STEPS[i - 1][1] : '#') + '"' + (i > 0 ? '' : ' aria-disabled="true"') +
          ' aria-label="' + (i > 0 ? STEPS[i - 1][0] : 'No previous step') + '">&lsaquo;</a>' +
        '<a href="' + (i < STEPS.length - 1 ? STEPS[i + 1][1] : '#') + '"' + (i < STEPS.length - 1 ? '' : ' aria-disabled="true"') +
          ' aria-label="' + (i < STEPS.length - 1 ? STEPS[i + 1][0] : 'No next step') + '">&rsaquo;</a>' +
      '</span></div>';
    var hd = document.querySelector('header.hd, header');
    if (hd && hd.parentNode) hd.parentNode.insertBefore(el, hd.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
    return el;
  }

  var node = null;
  function paint() {
    if (node && node.parentNode) node.parentNode.removeChild(node);
    node = build();
  }
  document.addEventListener('siyl:guest', paint);
  document.addEventListener('siyl:temple', paint);
  document.addEventListener('siyl:docs', paint);
  document.addEventListener('siyl:bag', paint);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
})();
