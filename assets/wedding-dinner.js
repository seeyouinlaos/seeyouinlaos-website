/* ============================================================================
   THE WEDDING DINNER — ONE record (Owner, 21 Sep 2026 · the consolidation).
   Every surface that names the dinner reads its facts and its photographs
   from here: the detail on The Wedding (voyage.html#dinner), the venue map's
   index entry, My Profile's card, the home teaser. No second array anywhere.
   The media is EVENT media — the Owner's Drive folders 056 (every frame) and
   the two frames of 053 / the venue set that show no other photograph — and
   never the hotel's accommodation record (assets/stay-media.js), which stays
   its own domain.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = 'assets/images/event/';
  var WD = {
    id: 'dinner',
    name: 'Wedding Dinner',
    date: 'Sunday, 28 February 2027',
    time: '19:30',
    place: 'poolside',
    venue: 'Souphattra Heritage Vientiane',
    dress: 'Black Tie',
    dressHref: 'wedding-preparation.html#dress-code',
    copy: 'An evening poolside, bringing the wedding day to its final and longest chapter — a Chinese sharing menu at the table, and the night to follow.',
    /* the seating of the one long table — the plan's words, never a second dinner */
    seating: 'The long table beside the water — side A along the pool, side B facing it.',
    href: 'voyage.html#dinner',
    media: [
      { src: E + '056-wedding-dinner-01-poolside-from-above.jpg', alt: 'Poolside at Souphattra Heritage, seen from above', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-02-villa-wide.jpg', alt: 'The heritage villa across the pool', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-03-poolside-loungers.jpg', alt: 'The loungers along the pool', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-04-villa-across-the-water.jpg', alt: 'The villa across the water', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-05-pool-and-villa.jpg', alt: 'The pool and the villa', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-06-pool-terrace.jpg', alt: 'The pool terrace', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-07-pool-aerial.jpg', alt: 'The poolside from the air', source: 'Drive 056' },
      { src: 'assets/images/venue/pool-terrace-oblique-1600.jpg', alt: 'The pool terrace from the upper floor: umbrellas, loungers, the fountain and the balconies', source: 'Drive 13o95npqGfPMooOpwRqd2kcpB_l83nYJO (the venue set)' },
      { src: E + '056-wedding-dinner-08-long-table-candlelight.jpg', alt: 'The long table by candlelight', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-09-lilies.jpg', alt: 'White lilies on the table', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-10-lilies-at-night.jpg', alt: 'Lilies against the night', source: 'Drive 056' },
      { src: E + '056-wedding-dinner-11-sharing-menu.jpg', alt: 'The Chinese sharing menu', source: 'Drive 056' },
      { src: E + '053-wedding-dinner-sharing-menu.jpg', alt: 'Bamboo steamers of dim sum — the Chinese sharing menu', source: 'Drive 1fkK2P-Hi4Lhw5CygcQS6rlxA3XkF2K5n (053)' }
    ]
  };
  WD.lead = WD.media[0].src;
  WD.when = WD.date + ' · ' + WD.time;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* the frames of the one gallery, for the site's editorial carousel (assets/refgal.js upgrades a .dgal) */
  WD.galleryHtml = function () { return WD.media.map(function (m, i) { return '<img src="' + esc(m.src) + '" alt="' + esc(m.alt) + '"' + (i ? ' loading="lazy" decoding="async"' : ' decoding="async"') + '>'; }).join(''); };
  WD.fill = function (rootEl) { (rootEl || document).querySelectorAll('[data-wedding-dinner-gallery]').forEach(function (el) { if (!el.getAttribute('data-filled')) { el.setAttribute('data-filled', '1'); el.innerHTML = WD.galleryHtml(); } }); };
  root.SIYL_WEDDING_DINNER = WD;
  if (typeof document !== 'undefined') WD.fill(document);
})(typeof window !== 'undefined' ? window : globalThis);
