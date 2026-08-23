/*
 * "Edit Images" — local-development drag-and-drop image replacement.
 *
 * Injected ONLY by src/dev-editor-server.cjs when the site is served from
 * localhost. It is never part of index.html on disk and never deployed. As a
 * second guard it refuses to run off localhost.
 *
 * It does not touch the site's markup, CSS, GSAP/ScrollTrigger, galleries or
 * panels: it only reads each editable image's current asset path, uploads a
 * replacement to the local write endpoint, and cache-busts that one element.
 */
(function () {
  'use strict';
  var host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return; // hard localhost gate

  var ACCEPT = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  var acceptAttr = 'image/jpeg,image/png,image/webp,image/avif';

  fetch('/__edit/slots').then(function (r) { return r.json(); }).catch(function () {});

  // ---- discover editable slots (no DOM restructuring) ----
  function slotForImg(img) {
    var src = (img.getAttribute('src') || '').split('?')[0];
    return src.indexOf('assets/images/') === 0 ? src : null;
  }
  function bgSlot(el) {
    if (el.classList.contains('bg') && el.closest('.hero')) return 'assets/images/hero/img-hero.jpg';
    if (el.classList.contains('bg') && el.closest('.aerial')) return 'assets/images/hero/wide-aerial.jpg';
    return null;
  }
  function editableEls() {
    var out = [];
    document.querySelectorAll('img').forEach(function (img) {
      var s = slotForImg(img); if (s) out.push({ el: img, slot: s });
    });
    document.querySelectorAll('.hero .bg, .aerial .bg').forEach(function (el) {
      var s = bgSlot(el); if (s) out.push({ el: el, slot: s });
    });
    return out;
  }

  // ---- toolbar ----
  var on = false;
  var bar = document.createElement('div');
  bar.className = 'eimg-bar';
  bar.innerHTML =
    '<button type="button" class="eimg-toggle">Edit Images</button>' +
    '<button type="button" class="eimg-rebuild" hidden>Rebuild standalone</button>' +
    '<span class="eimg-status">local dev only</span>';
  var toggleBtn = bar.querySelector('.eimg-toggle');
  var rebuildBtn = bar.querySelector('.eimg-rebuild');
  var statusEl = bar.querySelector('.eimg-status');
  document.body.appendChild(bar);

  // Single overlay used as hover/drag hint. Works over <img> AND <div> (unlike
  // ::after, which does not render on replaced <img> elements). pointer-events
  // are off so drop/click still reach the target beneath.
  var hint = document.createElement('div');
  hint.className = 'eimg-hint'; hint.hidden = true;
  hint.innerHTML = '<span>Drop image to replace</span>';
  document.body.appendChild(hint);
  var hinted = null;
  function placeHint(el) {
    var r = el.getBoundingClientRect();
    hint.style.left = r.left + 'px'; hint.style.top = r.top + 'px';
    hint.style.width = r.width + 'px'; hint.style.height = r.height + 'px';
  }
  function showHint(el) { hinted = el; placeHint(el); hint.hidden = false; }
  function hideHint(el) { if (!el || el === hinted) { hinted = null; hint.hidden = true; hint.classList.remove('hot'); } }
  window.addEventListener('scroll', function () { if (hinted) placeHint(hinted); }, { passive: true });
  window.addEventListener('resize', function () { if (hinted) placeHint(hinted); });

  function status(msg) { statusEl.textContent = msg; }
  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className = 'eimg-toast' + (bad ? ' bad' : '');
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3400);
  }

  var wired = new WeakSet();
  function markEditable() {
    editableEls().forEach(function (s) {
      s.el.classList.add('eimg-target');
      s.el.setAttribute('data-eimg-slot', s.slot);
      if (!wired.has(s.el)) { wire(s); wired.add(s.el); }
    });
  }
  function unmark() {
    hideHint();
    document.querySelectorAll('.eimg-target').forEach(function (el) { el.classList.remove('eimg-target'); });
  }

  toggleBtn.addEventListener('click', function () {
    on = !on;
    document.body.classList.toggle('eimg-on', on);
    toggleBtn.classList.toggle('active', on);
    rebuildBtn.hidden = !on;
    if (on) { markEditable(); status(editableEls().length + ' images editable'); }
    else { unmark(); status('local dev only'); }
  });

  rebuildBtn.addEventListener('click', function () {
    status('rebuilding standalone…');
    fetch('/__edit/rebuild', { method: 'POST' }).then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) { toast('standalone rebuilt'); status('standalone rebuilt'); } else { toast('rebuild failed: ' + d.error, true); status('rebuild failed'); } })
      .catch(function (e) { toast('rebuild failed: ' + e.message, true); });
  });

  // ---- per-slot interaction ----
  function extOk(name, type) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    if (m && ACCEPT.indexOf(m[1].toLowerCase()) !== -1) return true;
    return ACCEPT.indexOf((String(type).split('/')[1] || '').toLowerCase()) !== -1;
  }
  function upload(slot, el, file) {
    if (!file) return;
    if (!extOk(file.name, file.type)) { toast('unsupported file type (use JPG/PNG/WebP/AVIF)', true); return; }
    status('uploading ' + file.name + '…');
    file.arrayBuffer().then(function (buf) {
      return fetch('/__edit/replace?path=' + encodeURIComponent(slot), {
        method: 'POST',
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-orig-name': file.name },
        body: buf,
      });
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) { toast('replace failed: ' + d.error, true); status('failed'); return; }
      var bust = '?t=' + Date.now();
      if (el.tagName === 'IMG') { el.setAttribute('src', slot + bust); }
      else { el.style.backgroundImage = "url('" + slot + bust + "')"; } // instant preview; CSS image-set reloads the new file
      toast('replaced ' + slot.split('/').pop() + ' · ' + d.width + '×' + d.height + (d.webp ? ' (+webp)' : ''));
      status('replaced ' + slot.split('/').pop() + ' — Rebuild standalone to include it');
    }).catch(function (e) { toast('replace failed: ' + e.message, true); });
  }

  function wire(s) {
    var el = s.el, slot = s.slot;
    el.addEventListener('mouseenter', function () { if (on) showHint(el); });
    el.addEventListener('mouseleave', function () { if (on) hideHint(el); });
    el.addEventListener('dragenter', function (e) { if (on) { e.preventDefault(); showHint(el); hint.classList.add('hot'); } });
    el.addEventListener('dragover', function (e) {
      if (!on) return; e.preventDefault(); e.stopPropagation();
      if (hinted !== el) showHint(el);
      hint.classList.add('hot'); e.dataTransfer.dropEffect = 'copy';
    });
    el.addEventListener('dragleave', function () { if (on) hint.classList.remove('hot'); });
    el.addEventListener('drop', function (e) {
      if (!on) return; e.preventDefault(); e.stopPropagation();
      hint.classList.remove('hot'); hideHint(el);
      upload(slot, el, e.dataTransfer.files && e.dataTransfer.files[0]);
    });
    el.addEventListener('click', function (e) {
      if (!on) return; e.preventDefault(); e.stopPropagation();
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = acceptAttr;
      inp.addEventListener('change', function () { upload(slot, el, inp.files[0]); });
      inp.click();
    }, true); // capture: intercept before the card/panel click handlers
  }
})();
