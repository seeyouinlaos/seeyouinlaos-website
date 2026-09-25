'use strict';
/* THE CANONICAL LAYOUT CONTRACT (Owner, 25 Sep 2026 · the site-wide layout QA agent). The one machine-readable statement
 * of how every guest-facing page is laid out; src/layout-qa/rules.js measures a rendered page against it, the release
 * gate L2 (src/release-check.cjs) keeps it and the route manifest (src/layout-routes.cjs) honest. docs/LAYOUT-QA.md is
 * the human page.
 *
 * LEVELS — every block on a page is one of:
 *   page        the content wall: left = max(--a-gut, (viewport − --a-frame) / 2 + --a-gut), right symmetric.
 *               The header, every page-level photograph, gallery, rail heading and footer content close on it.
 *   editorial   text that starts on the wall's left axis and stops at its reading measure (.a-lede, .prep-head, .x-wrap …).
 *   narrow      a shorter measure on the same left axis (.measure, .measure-w, .p-read, forms).
 *   component   a card, a column of a multi-column grid or row, an overlay, a scroll rail: its own content edge is the
 *               axis of what it holds.
 *   full-bleed  a band from edge to edge — only the primitives named in `fullBleed`; its content returns to the wall.
 * An exception is never a page's own coordinate: it is one of the primitives below, with its reason. */

module.exports = {
  version: 1,
  tolerance: 1.5,
  /* text ink only (never a box or a photograph): WebKit's line box may overhang the last glyph's advance by ~2 px */
  textTolerance: 3,
  wall: { gutToken: '--a-gut', frameToken: '--a-frame' },
  header: { sel: 'header.hd', right: 'header.hd .bag' },

  /* not the page: judged on their own (the header), or not on screen (panels, visually hidden text, the QA overlay) */
  layers: ['header.hd', '.a-menu', '.a-scrim', '.vh', '.sr-only', '.pf-hide', '[hidden]', 'dialog:not([open])', '#lqa-overlay', '.prep-steps', '.p-drawer', '.p-seatbar'],

  /* fixed layers that are part of the page the guest reads (audited like a full-bleed band, not skipped as a layer) */
  fixedAudited: '.jbar',

  /* the page-level picture frames: their box, not the <img> inside, is the photograph */
  mediaFrames: '.am, .a-band, .p-media, .ph, .media',

  /* the only full-bleed bands of the site (maxWidth: the band exists only up to that width) */
  fullBleed: [
    { sel: 'footer.sfoot', why: 'the footer band — its content (.sfoot-in, .sf-legal) returns to the wall' },
    { sel: '.jbar', why: 'the Journey bar fixed at the foot of the screen — its content returns to the wall (bag.js)' },
    { sel: '.prep-bar', why: 'the sticky step bar of the booking steps — its content returns to the wall' },
    { sel: '.a-band', maxWidth: 599, why: 'the approved iPhone composition: the transition band edge to edge (framed from 600 px)' },
    { sel: '.prep-head .p-media', maxWidth: 599, why: 'the approved iPhone composition: the step page\'s opening photograph edge to edge' },
    { sel: 'section.buy, section.plane', maxWidth: 599, why: 'the approved iPhone composition: the booking panel and the plan band of a room or transport page' },
    { sel: 'main > .media', maxWidth: 599, why: 'the approved iPhone composition: the opening photograph of a venue page' },
    { sel: 'main > .gal', maxWidth: 599, why: 'Owner, 24 Sep 2026: the transport photograph edge to edge on the phone; its caption, count and arrows inside the wall' },
    { sel: '.acar .atrk, .refgal .atrk, .others .oc', maxWidth: 599, why: 'the approved iPhone composition: a rail\'s neighbour peeks to the screen\'s edge' }
  ],

  /* page-level photographs that deliberately stay narrower than the wall */
  narrowMedia: [
    { sel: '.a-duo .a-map', align: 'center', why: 'Owner, 22 Sep 2026: the venue map is shown whole at its own drawing ratio (838 × 980); where the column is taller than the screen allows it is centred on the wall' },
    { sel: '.x-clip .am', minWidth: 900, why: 'the experience film belongs to its 760 px reading column, on the wall\'s left axis' },
    { sel: '.prep-head .p-media', minWidth: 900, why: 'the private journey reads on ONE 860 px column on the wall\'s left axis (prep.css · one column); the step\'s photograph belongs to it' }
  ],

  /* components whose inner text is positioned by the component itself (labels on a map, counters on a picture) */
  axisFree: [
    { sel: '.venue-labels, .venue-stage', why: 'the venue map: labels sit on the drawing at the venue\'s coordinates' },
    { sel: '.av-ring, .av-count', why: 'the availability ring: the count is centred in its circle' }
  ],

  /* components that centre a line of text by design (maxWidth: only up to that width) */
  centered: [
    { sel: 'button, .p-act, .a-cta, .cta, .x-cta, .dcta', why: 'a button\'s label is centred in the button' },
    { sel: '.pf-num, .pf-stat, .pf-cd', why: 'the countdown and the journey in numbers: figures centred over their label' },
    { sel: '.p-ticket-mid', why: 'the ticket: the journey time centred between departure and arrival' },
    { sel: '.intro, .lede, .plane h2, .ed .body, .ok, main > h2, main > p', maxWidth: 767, why: 'the approved iPhone composition of a product page (desktop.css: "the 390 px composition is untouched"); from 768 px nothing is centred but a button\'s label' }
  ],

  /* blocks allowed to clip their text (they carry the full text elsewhere, e.g. an accessible name) */
  clipOk: '.gc, .gl',

  /* the containers whose children are the page's sections (rhythm: no overlap, no void) */
  flowRoot: 'main, main > #page, .prep-page',
  rhythm: { voidFactor: 2.2 },
  media: { distortion: 0.02 },

  /* THE VIEWPORTS: the Owner's named widths, and ±1 around every real breakpoint the stylesheets declare
     (discovered from the CSS by src/layout-qa/audit.mjs, so a new breakpoint is covered the day it is written) */
  widths: {
    named: [320, 360, 375, 390, 430, 600, 744, 768, 820, 834, 1024, 1133, 1180, 1194, 1280, 1366, 1440, 1680, 1920, 2560],
    fast: [320, 390, 744, 768, 834, 1024, 1440, 1920],   /* 744: the small-tablet band (600–767) the first full audit found faults in */
    heights: { 320: 640, 360: 740, 375: 812, 390: 844, 430: 932, 600: 960, 744: 1133, 768: 1024, 820: 1180, 834: 1194, 1024: 1366, 1133: 744, 1180: 820, 1194: 834 },
    defaultHeight: 900
  },
  /* the stylesheets whose media queries are the site's breakpoints */
  css: ['assets/aman.css', 'assets/prep.css', 'assets/desktop.css', 'assets/recon.css', 'assets/venue.css', 'assets/motion.css']
};
