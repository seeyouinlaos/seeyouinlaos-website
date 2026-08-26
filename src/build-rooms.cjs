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


function card(a) {
  const specs = [['Size', a.size], ['Bed', a.bed], ['Guests', a.occupancy], ['Where', a.location]]
    .filter((r) => r[1]);
  const gallery = JSON.stringify(a.images || []).replace(/"/g, '&quot;');
  const amen = a.amenities || [];
  return [
    '<article class="rm-card">',
    '<figure class="rm-figure"><button type="button" class="rm-fig-btn" data-gallery="' + gallery +
      '" data-name="' + esc(a.name) + '" aria-label="Open ' + esc(a.name) + ' photo gallery">' +
      '<img alt="' + esc(a.name) + ' at ' + esc(a.property) + '" src="' + a.images[0] +
      '" width="1600" height="1067" loading="lazy" decoding="async"/>' +
      '<span class="rm-figcount">' + (a.images || []).length + ' photos</span></button></figure>',
    '<div class="rm-body">',
    a.badge ? '<div class="rm-badge">' + esc(a.badge) + '</div>' : '',
    '<div class="rm-head"><h3>' + esc(a.name) + '</h3></div>',
    '<div class="rm-meta">' + esc(a.stay) + ' · ' + a.nights + ' nights</div>',
    '<div class="rm-hosted">Second night complimentary · hosted by Haruthai &amp; Suthep</div>',
    '<p class="rm-blurb">' + esc(a.blurb) + '</p>',
    '<dl class="rm-specs">' + specs.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>',
    amen.length
      ? '<div class="rm-amen">' + amen.map((x, i) => '<span' + (i >= 5 ? ' class="rm-amen-x" hidden' : '') + '>' + esc(x) + '</span>').join('') +
        (amen.length > 5 ? '<button type="button" class="more rm-more" aria-expanded="false">+' + (amen.length - 5) + ' more</button>' : '') + '</div>'
      : '',
    '<div class="rm-avail" role="status">Request availability</div>',
    '<div class="rm-foot"><a class="rm-cta" href="register/">Request this room in your Guest Area</a></div>',
    '</div></article>',
  ].filter(Boolean).join('\n');
}

const LIGHTBOX = [
  '<div class="rm-lb" id="rm-lightbox" hidden role="dialog" aria-modal="true" aria-label="Room gallery">',
  '<button type="button" class="rm-lb-close">Close</button>',
  '<button type="button" class="rm-lb-prev" aria-label="Previous photo">&#8592;</button>',
  '<img class="rm-lb-img" src="" alt=""/>',
  '<button type="button" class="rm-lb-next" aria-label="Next photo">&#8594;</button>',
  '<div class="rm-lb-count" aria-live="polite"></div>',
  '</div>',
  '<script>',
  '(function () {',
  '  var lb = document.getElementById("rm-lightbox");',
  '  var imgs = [], idx = 0, nm = "", trigger = null, touchX = null;',
  '  function render() {',
  '    lb.querySelector(".rm-lb-img").src = imgs[idx];',
  '    lb.querySelector(".rm-lb-img").alt = nm + " · photo " + (idx + 1);',
  '    lb.querySelector(".rm-lb-count").textContent = (idx + 1) + " / " + imgs.length;',
  '  }',
  '  function open(list, name, from) { imgs = list; idx = 0; nm = name; trigger = from; render(); lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".rm-lb-close").focus(); }',
  '  function close() { lb.hidden = true; document.body.style.overflow = ""; if (trigger) trigger.focus(); }',
  '  function step(d) { idx = (idx + d + imgs.length) % imgs.length; render(); }',
  '  document.querySelectorAll(".rm-fig-btn").forEach(function (b) {',
  '    b.addEventListener("click", function () { open(JSON.parse(b.getAttribute("data-gallery")), b.getAttribute("data-name"), b); });',
  '  });',
  '  document.querySelectorAll(".rm-more").forEach(function (b) {',
  '    b.addEventListener("click", function () {',
  '      var expanded = b.getAttribute("aria-expanded") === "true";',
  '      b.parentElement.querySelectorAll(".rm-amen-x").forEach(function (s) { s.hidden = expanded; });',
  '      b.setAttribute("aria-expanded", String(!expanded));',
  '      b.textContent = expanded ? "+" + b.parentElement.querySelectorAll(".rm-amen-x").length + " more" : "show less";',
  '    });',
  '  });',
  '  lb.querySelector(".rm-lb-close").addEventListener("click", close);',
  '  lb.querySelector(".rm-lb-prev").addEventListener("click", function () { step(-1); });',
  '  lb.querySelector(".rm-lb-next").addEventListener("click", function () { step(1); });',
  '  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });',
  '  lb.addEventListener("touchstart", function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });',
  '  lb.addEventListener("touchend", function (e) {',
  '    if (touchX === null) return;',
  '    var dx = e.changedTouches[0].clientX - touchX; touchX = null;',
  '    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);',
  '  }, { passive: true });',
  '  addEventListener("keydown", function (e) {',
  '    if (lb.hidden) return;',
  '    if (e.key === "Escape") close();',
  '    if (e.key === "ArrowLeft") step(-1);',
  '    if (e.key === "ArrowRight") step(1);',
  '  });',
  '})();',
  '<\/script>',
].join('\n');

async function main() {
  const { ACCOMMODATIONS, COPY } = await import('../register/data.mjs');
  /* PUBLIC RULE: room information is public; every commercial amount is
   * private (authenticated Guest Area only). While cross-user inventory
   * synchronisation (KV backend) is not yet active, the public page must
   * NOT pretend counts are live — every category shows "Request
   * availability". Exact counts stay inside the engine / Guest Relations. */
  const html = [
    '<p class="rm-intro rv">' + esc(COPY.sharedHome) + '</p>',
    '<div class="rm-grid">',
    ACCOMMODATIONS.map((a) => card(a)).join('\n'),
    '</div>',
    '<p class="rm-note rv">' + esc(COPY.hostedNight) + ' Room rates and requests live in your private Guest Area. ' + esc(COPY.requestNote) + '</p>',
    LIGHTBOX,
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
    ACCOMMODATIONS.flatMap((a) => a.images || []).length + ' images, NO public prices, request-availability mode, functional galleries');
}
main().catch((e) => { console.error(e); process.exit(1); });
