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
  const amen = a.amenities || [];
  const imgs = a.images || [];
  const reserved = a.selectable === false;
  /* PRIMARY interaction: inline swipe gallery (scroll-snap). The lightbox
   * remains a secondary option via the expand control. */
  const avstat = reserved
    ? 'Reserved'
    : a.kind === 'airbnb'
      ? 'Arranged separately'
      : a.capacityTotal + ' of ' + a.capacityTotal + ' available';
  const gallery = imgs.length
    ? '<div class="rm-gal" data-name="' + esc(a.name) + '">' +
      '<div class="rm-track" tabindex="0" role="group" data-gallery="' + JSON.stringify(imgs).replace(/"/g, '&quot;') +
      '" data-name="' + esc(a.name) + '" aria-label="' + esc(a.name) + ' photos — swipe, or press Enter for a larger view">' +
      imgs.map((s, i) => '<img alt="' + esc(a.name) + ' · photo ' + (i + 1) + '" src="' + s +
        '" width="1600" height="1067" loading="lazy" decoding="async" draggable="false"/>').join('') +
      '</div>' +
      (imgs.length > 1 ? '<span class="rm-gcount">1 / ' + imgs.length + '</span>' : '') +
      '<span class="rm-avstat" role="status">' + avstat + '</span>' +
      '</div>'
    : (a.imageSlots
        ? '<div class="rm-slots">' + a.imageSlots.map((s) => '<span class="rm-slot">' + esc(s) + '</span>').join('') + '</div>'
        : '');
  return [
    '<article class="rm-card' + (reserved ? ' reserved' : '') + '">',
    gallery,
    '<div class="rm-body">',
    a.badge ? '<div class="rm-badge">' + esc(a.badge) + '</div>' : '',
    '<div class="rm-head"><h3>' + esc(a.name) + '</h3></div>',
    '<div class="rm-meta">' + esc(a.stay) + ' · ' + a.nights + ' nights</div>',
    a.kind !== 'airbnb' && !reserved ? '<div class="rm-hosted">Second night complimentary · hosted by Haruthai &amp; Suthep</div>' : '',
    '<p class="rm-blurb">' + esc(a.blurb) + '</p>',
    '<dl class="rm-specs">' + specs.concat([['Availability', reserved
        ? 'Reserved for the wedding couple\u2019s family'
        : a.kind === 'airbnb'
          ? 'Arranged separately with Guest Relations'
          : a.capacityTotal + (a.capacityTotal === 1 ? ' room' : ' rooms') + ' allocated']])
      .map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>',
    amen.length
      ? '<div class="rm-amen">' + amen.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>'
      : '',

    reserved
      ? ''
      : '<div class="rm-foot"><a class="rm-cta" href="register/">Request this room in your Guest Area</a></div>',
    '</div></article>',
  ].filter(Boolean).join('\n');
}

const LIGHTBOX = [
  '<div class="rm-lb" id="rm-lightbox" hidden role="dialog" aria-modal="true" aria-label="Room gallery">',
  '<button type="button" class="rm-lb-close">Close</button>',
  '<button type="button" class="rm-lb-nav rm-lb-prev" aria-label="Previous photo"></button>',
  '<button type="button" class="rm-lb-nav rm-lb-next" aria-label="Next photo"></button>',
  '<img class="rm-lb-img" src="" alt=""/>',
  '<div class="rm-lb-dots" role="tablist" aria-label="Photos"></div>',
  '<div class="rm-lb-count" aria-live="polite"></div>',
  '</div>',
  '<script>',
  '(function () {',
  '  var lb = document.getElementById("rm-lightbox");',
  '  var imgs = [], idx = 0, nm = "", trigger = null, touchX = null;',
  '  var dotsEl = lb.querySelector(".rm-lb-dots"), prevBtn = lb.querySelector(".rm-lb-prev"), nextBtn = lb.querySelector(".rm-lb-next");',
  '  function buildDots() {',
  '    var multi = imgs.length > 1;',
  '    if (dotsEl) dotsEl.hidden = !multi;',
  '    if (prevBtn) prevBtn.hidden = !multi;',
  '    if (nextBtn) nextBtn.hidden = !multi;',
  '    if (!dotsEl) return;',
  '    dotsEl.innerHTML = "";',
  '    if (!multi) return;',
  '    imgs.forEach(function (_, i) {',
  '      var d = document.createElement("button");',
  '      d.type = "button"; d.className = "rm-lb-dot"; d.setAttribute("aria-label", "Photo " + (i + 1));',
  '      d.addEventListener("click", function () { idx = i; render(); });',
  '      dotsEl.appendChild(d);',
  '    });',
  '  }',
  '  function render() {',
  '    lb.querySelector(".rm-lb-img").src = imgs[idx];',
  '    lb.querySelector(".rm-lb-img").alt = nm + " · photo " + (idx + 1);',
  '    lb.querySelector(".rm-lb-count").textContent = (idx + 1) + " / " + imgs.length;',
  '    if (dotsEl) [].forEach.call(dotsEl.children, function (d, i) { d.setAttribute("aria-current", i === idx ? "true" : "false"); });',
  '  }',
  '  function open(list, name, from) { if (!list || !list.length) return; imgs = list; idx = 0; nm = name; trigger = from; buildDots(); render(); lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".rm-lb-close").focus(); }',
  '  function close() { lb.hidden = true; document.body.style.overflow = ""; if (trigger) trigger.focus(); }',
  '  function step(d) { if (!imgs.length) { close(); return; } idx = (idx + d + imgs.length) % imgs.length; render(); }',

  '  document.querySelectorAll(".rm-gal").forEach(function (gal) {',
  '    var track = gal.querySelector(".rm-track");',
  '    var count = gal.querySelector(".rm-gcount");',
  '    var n = track.querySelectorAll("img").length;',
  '    function pos() { return Math.round(track.scrollLeft / track.clientWidth); }',
  '    function go(d) { track.scrollTo({ left: (pos() + d) * track.clientWidth, behavior: "smooth" }); }',
  '    track.addEventListener("scroll", function () { if (count) count.textContent = (Math.min(pos(), n - 1) + 1) + " / " + n; }, { passive: true });',
  '    track.addEventListener("keydown", function (e) {',
  '      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }',
  '      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }',
  '    });',
  '    var down = null, moved = false;',
  '    track.addEventListener("click", function () {',
  '      if (moved) { moved = false; return; }',
  '      open(JSON.parse(track.getAttribute("data-gallery")), track.getAttribute("data-name"), track);',
  '    });',
  '    track.addEventListener("keydown", function (e) {',
  '      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(JSON.parse(track.getAttribute("data-gallery")), track.getAttribute("data-name"), track); }',
  '    });',
  '    track.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse") { down = { x: e.clientX, s: track.scrollLeft }; track.classList.add("drag"); } });',
  '    addEventListener("pointermove", function (e) { if (down) { if (Math.abs(e.clientX - down.x) > 4) moved = true; track.scrollLeft = down.s - (e.clientX - down.x); } });',
  '    addEventListener("pointerup", function () { if (down) { down = null; track.classList.remove("drag"); var p = pos(); track.scrollTo({ left: p * track.clientWidth, behavior: "smooth" }); } });',
  '  });',
  '  lb.querySelector(".rm-lb-close").addEventListener("click", close);',
  '  if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });',
  '  if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });',
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
