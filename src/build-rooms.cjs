'use strict';
/**
 * Render the public accommodation section from the ONE authoritative model
 * (register/data.mjs · ACCOMMODATIONS) into index.html.
 *
 *   node src/build-rooms.cjs
 *
 * The public site is static: instead of a second room description living in
 * index.html, this generator writes the same cards the Guest Area renders at
 * runtime between the ROOMS:START / ROOMS:END markers. Room text, specs,
 * amenities, images and contributions therefore have a single source.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'index.html');
const START = '<!-- ROOMS:START -->';
const END = '<!-- ROOMS:END -->';

const esc = (s) => String(s == null ? '' : s)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


function card(a, availLine) {
  const bookable = a.selectable !== false;
  const specs = [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy], ['Where', a.location]]
    .filter((r) => r[1]);
  return [
    '<article class="rm-card' + (bookable ? '' : ' reserved') + '">',
    '<figure class="rm-figure"><img alt="' + esc(a.name) + ' at ' + esc(a.property) + '" src="' + a.images[0] +
      '" width="1600" height="1067" loading="lazy" decoding="async"/></figure>',
    '<div class="rm-body">',
    a.badge ? '<div class="rm-badge">' + esc(a.badge) + '</div>' : '',
    '<div class="rm-head"><h3>' + esc(a.name) + '</h3></div>',
    '<div class="rm-meta">' + esc(a.stay) + ' · ' + a.nights + ' nights</div>',
    bookable && a.kind !== 'villa' ? '<div class="rm-hosted">Second night complimentary · hosted by Haruthai &amp; Suthep</div>' : '',
    '<p class="rm-blurb">' + esc(a.blurb) + '</p>',
    '<dl class="rm-specs">' + specs.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>',
    (a.amenities || []).length
      ? '<div class="rm-amen">' + a.amenities.slice(0, 5).map((x) => '<span>' + esc(x) + '</span>').join('') +
        (a.amenities.length > 5 ? '<span class="more">+' + (a.amenities.length - 5) + ' more</span>' : '') + '</div>'
      : '',
    bookable
      ? '<div class="rm-avail" role="status">' + esc(availLine) + '</div>' +
        '<div class="rm-foot"><a class="rm-cta" href="register/">Request this room in your Guest Area</a></div>'
      : '<div class="rm-foot reserved">' + esc(a.reservedNote || 'Not available for guest requests') + '</div>',
    '</div></article>',
  ].filter(Boolean).join('\n');
}

async function main() {
  const { ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN, COPY } = await import('../register/data.mjs');
  const { createInventory, remaining, availabilityLabel } = await import('../register/logic.mjs');
  /* PUBLIC RULE: room information + LIVE availability are public; every
   * commercial amount is private (authenticated Guest Area only). The
   * availability line derives from the SAME inventory engine the booking
   * flow uses — never a decorative static number. */
  const inv = createInventory([...SELECTABLE_ACCOMMODATIONS, TRAIN]);
  const availFor = (a) => {
    const res = inv[a.id];
    if (!res) return 'Not available for guest requests';
    if (remaining(res) <= 0) return 'Fully allocated · waitlist available';
    return availabilityLabel(res);
  };
  const html = [
    '<p class="rm-intro rv">' + esc(COPY.sharedHome) + '</p>',
    '<div class="rm-grid">',
    ACCOMMODATIONS.map((a) => card(a, availFor(a))).join('\n'),
    '</div>',
    '<p class="rm-note rv">' + esc(COPY.hostedNight) + ' Room rates and requests live in your private Guest Area. ' + esc(COPY.requestNote) + '</p>',
  ].join('\n');

  const page = fs.readFileSync(PAGE, 'utf8');
  const s = page.indexOf(START);
  const e = page.indexOf(END);
  if (s === -1 || e === -1) throw new Error('ROOMS markers not found in index.html');
  const out = page.slice(0, s + START.length) + '\n' + html + '\n' + page.slice(e);
  fs.writeFileSync(PAGE, out);

  const missing = ACCOMMODATIONS.flatMap((a) => a.images || [])
    .filter((p) => !fs.existsSync(path.join(ROOT, p)));
  if (missing.length) throw new Error('missing room images: ' + missing.join(', '));
  const leaked = /USD\s*\d/.test(html);
  if (leaked) throw new Error('PUBLIC PRICE LEAK: generated rooms section contains a USD amount');
  console.log('index.html rooms section: ' + ACCOMMODATIONS.length + ' categories, ' +
    ACCOMMODATIONS.flatMap((a) => a.images || []).length + ' images, NO public prices, live availability');
}
main().catch((e) => { console.error(e); process.exit(1); });
