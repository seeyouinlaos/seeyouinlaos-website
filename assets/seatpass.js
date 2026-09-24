/* ============================================================================
   SEE YOU IN LAOS — THE SEAT TICKET, and the ticket writer every ticket shares.

   A TICKET LOOKS LIKE A TICKET (Owner, 15 Sep 2026). The wedding seat is a
   premium event ticket: a framed ticket body with a header, the event, the
   guest, the seat, the status, "held for", and a stub — torn off along a
   perforation — that carries the ticket reference and a code to scan. The
   same composition stands on screen (the card) and on paper (a real PDF,
   PDF 1.4, base-14 fonts, WinAnsi text, no images, no scripts, no links),
   so it opens on an iPhone, prints at A4 and can be read back by a test.
   Nothing is ever clipped: every ticket is placed inside the page's safe
   area, and the test measures that.

   THE CODE BELONGS ON THE TICKET. The reference (SYL-WC-E4-XXXX) is a
   harmless digest of the seat as the ledger holds it; the QR carries the
   reference, the guest's first name, the event, the date, the seat words
   and the state — never an access code, never an invitation id, never a
   bearer. It says what the seating ledger says at the moment of download and
   nothing more. It is a seat ticket for a private wedding: nothing here is
   charged.

   THE WRITER (`writer`) is shared with the travel pass (assets/travelpass.js):
   one PDF grammar, one ticket frame, one QR routine for every ticket.
   ========================================================================== */
(function (root, factory) {
  var api = factory(root && root.SIYL_SEATLABELS ? root.SIYL_SEATLABELS : (typeof require === 'function' ? require('./seatlabels.js') : null), root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SIYL_SEATPASS = api;
})(typeof window !== 'undefined' ? window : null, function (L, root) {
  'use strict';
  var INK = '0.192 0.192 0.192', MUTE = '0.42 0.412 0.392', LINE = '0.855 0.851 0.843', GROUND = '0.953 0.933 0.906', PAPER = '0.988 0.98 0.965', SHADE = '0.898 0.878 0.851', ACCENT = '0.541 0.353 0.333';
  var PAGE = { w: 595.28, h: 841.89 };
  /* the safe area: nothing is drawn nearer the edge than this — the test measures it */
  var SAFE = { x: 40, y: 40 };

  /* ---- text encoding: WinAnsi (Latin-1 plus the usual typographic marks) */
  var WIN = { '’': 146, '‘': 145, '“': 147, '”': 148, '–': 150, '—': 151, '·': 183, '•': 149, '…': 133, '€': 128 };
  function enc(t) {
    var out = '', str = String(t == null ? '' : t);
    for (var i = 0; i < str.length; i++) {
      var ch = str[i], c = ch.charCodeAt(0);
      if (WIN[ch] != null) c = WIN[ch];
      if (c >= 0xD800 && c <= 0xDBFF) i++;                 /* a surrogate pair is one character outside WinAnsi */
      if (c > 255) c = 63;                                   /* outside WinAnsi: a question mark, never a raw code unit */
      if (c === 40 || c === 41 || c === 92) out += '\\' + String.fromCharCode(c);
      else if (c < 32 || c > 126) out += '\\' + ('000' + c.toString(8)).slice(-3);
      else out += String.fromCharCode(c);
    }
    return '(' + out + ')';
  }
  /* rough Times / Helvetica advance widths for centring and right alignment */
  function width(t, size, font) {
    var s = String(t == null ? '' : t), w = 0;
    for (var i = 0; i < s.length; i++) { var ch = s[i]; w += /[ijl.,'!|:;]/.test(ch) ? 0.28 : /[mwMW]/.test(ch) ? 0.83 : /[A-Z]/.test(ch) ? 0.66 : /[0-9]/.test(ch) ? 0.5 : ch === ' ' ? 0.25 : 0.5; }
    return w * size * (font === 'F2' ? 1.02 : 1);
  }
  /* words broken into lines that fit the width */
  function wrap(t, size, font, maxW) {
    var words = String(t == null ? '' : t).split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) { var next = cur ? cur + ' ' + wd : wd; if (width(next, size, font) > maxW * 0.9 && cur) { lines.push(cur); cur = wd; } else cur = next; });
    if (cur) lines.push(cur);
    return lines;
  }
  /* a size that fits: shrink until the words fit the width, never below the floor */
  function fit(t, size, font, maxW, floor) { while (size > (floor || 9) && width(t, size, font) > maxW * 0.9) size -= 0.5; return size; }   /* the estimate is rough: keep a tenth in hand */

  /* ---- one page of drawing operators ---- */
  function Page() { this.ops = []; this.marks = []; this.draw = []; }   /* draw: the same page as a list, for the Thai raster (buildRaster) */
  /* every drawn thing is remembered as a box, so a test can prove nothing leaves the safe area */
  Page.prototype.mark = function (x, y, w, h, what) { this.marks.push({ x: x, y: y, w: w, h: h, what: what || '' }); };
  Page.prototype.rect = function (x, y, w, h, fill, stroke, sw) {
    this.draw.push(['rect', x, y, w, h, fill, stroke, sw]);
    var o = [];
    if (fill) o.push(fill + ' rg');
    if (stroke) o.push(stroke + ' RG ' + (sw || 0.6) + ' w');
    o.push(x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
    this.ops.push(o.join(' '));
    this.mark(x, y, w, h, 'rect');
  };
  Page.prototype.line = function (x1, y1, x2, y2, color, sw) { this.draw.push(['line', x1, y1, x2, y2, color, sw, false]); this.ops.push((color || LINE) + ' RG ' + (sw || 0.6) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S'); this.mark(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), 'line'); };
  /* a perforation: a dashed line, the dash pattern set and reset in the same operator */
  Page.prototype.dashes = function (x1, y1, x2, y2, color, sw) { this.draw.push(['line', x1, y1, x2, y2, color, sw, true]); this.ops.push('[3 3] 0 d ' + (color || LINE) + ' RG ' + (sw || 0.7) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S [] 0 d'); this.mark(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), 'dashes'); };
  var K = 0.5523;
  Page.prototype.roundRect = function (x, y, w, h, r, fill, stroke, sw) {
    this.draw.push(['roundRect', x, y, w, h, r, fill, stroke, sw]);
    var o = [], f = function (n) { return n.toFixed(2); };
    if (fill) o.push(fill + ' rg');
    if (stroke) o.push(stroke + ' RG ' + (sw || 0.6) + ' w');
    o.push(f(x + r) + ' ' + f(y) + ' m ' + f(x + w - r) + ' ' + f(y) + ' l ' +
      f(x + w - r + r * K) + ' ' + f(y) + ' ' + f(x + w) + ' ' + f(y + r - r * K) + ' ' + f(x + w) + ' ' + f(y + r) + ' c ' +
      f(x + w) + ' ' + f(y + h - r) + ' l ' +
      f(x + w) + ' ' + f(y + h - r + r * K) + ' ' + f(x + w - r + r * K) + ' ' + f(y + h) + ' ' + f(x + w - r) + ' ' + f(y + h) + ' c ' +
      f(x + r) + ' ' + f(y + h) + ' l ' +
      f(x + r - r * K) + ' ' + f(y + h) + ' ' + f(x) + ' ' + f(y + h - r + r * K) + ' ' + f(x) + ' ' + f(y + h - r) + ' c ' +
      f(x) + ' ' + f(y + r) + ' l ' +
      f(x) + ' ' + f(y + r - r * K) + ' ' + f(x + r - r * K) + ' ' + f(y) + ' ' + f(x + r) + ' ' + f(y) + ' c h ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
    this.ops.push(o.join(' '));
    this.mark(x, y, w, h, 'roundRect');
  };
  Page.prototype.circle = function (cx, cy, r, fill, stroke, sw) {
    this.draw.push(['circle', cx, cy, r, fill, stroke, sw]);
    var o = [], f = function (n) { return n.toFixed(2); }, k = r * K;
    if (fill) o.push(fill + ' rg');
    if (stroke) o.push(stroke + ' RG ' + (sw || 0.6) + ' w');
    o.push(f(cx + r) + ' ' + f(cy) + ' m ' +
      f(cx + r) + ' ' + f(cy + k) + ' ' + f(cx + k) + ' ' + f(cy + r) + ' ' + f(cx) + ' ' + f(cy + r) + ' c ' +
      f(cx - k) + ' ' + f(cy + r) + ' ' + f(cx - r) + ' ' + f(cy + k) + ' ' + f(cx - r) + ' ' + f(cy) + ' c ' +
      f(cx - r) + ' ' + f(cy - k) + ' ' + f(cx - k) + ' ' + f(cy - r) + ' ' + f(cx) + ' ' + f(cy - r) + ' c ' +
      f(cx + k) + ' ' + f(cy - r) + ' ' + f(cx + r) + ' ' + f(cy - k) + ' ' + f(cx + r) + ' ' + f(cy) + ' c h ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
    this.ops.push(o.join(' '));
  };
  Page.prototype.text = function (x, y, t, font, size, color, spacing, align) {
    this.draw.push(['text', x, y, t, font, size, color, spacing, align]);
    var w = width(t, size, font) + (spacing || 0) * String(t).length;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    this.ops.push('BT ' + (color || INK) + ' rg /' + font + ' ' + size + ' Tf ' + (spacing || 0) + ' Tc ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Td ' + enc(t) + ' Tj ET');
    this.mark(x, y - size * 0.22, w, size, 'text:' + String(t).slice(0, 24));
  };
  Page.prototype.label = function (x, y, t, align, color) { this.text(x, y, String(t).toUpperCase(), 'F2', 7.2, color || MUTE, 1.6, align); this.draw[this.draw.length - 1].push(String(t)); };
  /* the QR code, module by module, quiet zone kept */
  Page.prototype.qr = function (modules, x, y, size, ink) {
    if (!modules) return;
    var n = modules.length, cell = size / n;
    this.rect(x - 6, y - 6, size + 12, size + 12, '1 1 1');
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (modules[r][c]) this.rect(x + c * cell, y + (n - 1 - r) * cell, cell + 0.15, cell + 0.15, ink || INK);
  };

  /* ---- the ticket frame: paper on the ground, a stub torn off along a perforation ----
   * box = { x, y (bottom), w, h, stub (width of the stub on the right) }
   * returns the geometry of the body and the stub for the words           */
  Page.prototype.ticket = function (box) {
    var r = 10, pad = 22;
    this.roundRect(box.x + 2, box.y - 3, box.w, box.h, r, SHADE);                       /* a soft shadow: the ticket lies on the page */
    this.roundRect(box.x, box.y, box.w, box.h, r, PAPER, LINE, 0.7);
    var px = box.x + box.w - box.stub;
    this.dashes(px, box.y + 8, px, box.y + box.h - 8, LINE, 0.7);                         /* the perforation */
    this.circle(px, box.y + box.h, 6, GROUND, LINE, 0.7);                                 /* the two notches, cut out of the frame */
    this.circle(px, box.y, 6, GROUND, LINE, 0.7);
    this.mark(box.x, box.y, box.w, box.h, 'ticket');
    return { x: box.x + pad, y: box.y + box.h - pad, w: px - box.x - pad * 2, bottom: box.y + pad, stub: { x: px + 18, w: box.stub - 36, cx: px + box.stub / 2 } };
  };


  /* ---- THE THAI TICKET (Owner, 24 Sep 2026): the PDF's own fonts carry Latin only, so a ticket in Thai is the same page drawn
   * in the browser — the same frame, the same positions, the words in Thai from assets/i18n/siyl-i18n.js — and embedded as one
   * image per page. English tickets are unchanged (text PDF). ---- */
  function thai() { return typeof document !== 'undefined' && root && root.SIYL_I18N && root.SIYL_I18N.lang === 'th'; }
  function rgb(c) { var p = String(c || INK).split(/\s+/).map(Number); return 'rgb(' + Math.round(p[0] * 255) + ',' + Math.round(p[1] * 255) + ',' + Math.round(p[2] * 255) + ')'; }
  var FACE = { F1: "'PP Editorial Old','Noto Serif Thai','Thonburi','Leelawadee UI',Georgia,serif", F2: "'Hanken Grotesk','Noto Sans Thai','Thonburi','Leelawadee UI',Tahoma,sans-serif", F3: "italic 'PP Editorial Old','Noto Serif Thai','Thonburi',Georgia,serif" };
  function paint(page, S) {
    var cv = document.createElement('canvas'); cv.width = Math.round(PAGE.w * S); cv.height = Math.round(PAGE.h * S);
    var g = cv.getContext('2d'), Y = function (y) { return (PAGE.h - y) * S; };
    g.fillStyle = rgb(GROUND); g.fillRect(0, 0, cv.width, cv.height);
    var tr = function (t) { return root.SIYL_I18N.tr(String(t)); };
    function shape(fill, stroke, sw) { if (fill) { g.fillStyle = rgb(fill); g.fill(); } if (stroke) { g.strokeStyle = rgb(stroke); g.lineWidth = (sw || 0.6) * S; g.stroke(); } }
    page.draw.forEach(function (d) {
      var k = d[0];
      if (k === 'rect') { g.beginPath(); g.rect(d[1] * S, Y(d[2] + d[4]), d[3] * S, d[4] * S); shape(d[5], d[6], d[7]); }
      else if (k === 'roundRect') { var x = d[1] * S, y = Y(d[2] + d[4]), w = d[3] * S, h = d[4] * S, r = d[5] * S; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); shape(d[6], d[7], d[8]); }
      else if (k === 'circle') { g.beginPath(); g.arc(d[1] * S, Y(d[2]), d[3] * S, 0, Math.PI * 2); shape(d[4], d[5], d[6]); }
      else if (k === 'line') { g.beginPath(); g.setLineDash(d[7] ? [3 * S, 3 * S] : []); g.moveTo(d[1] * S, Y(d[2])); g.lineTo(d[3] * S, Y(d[4])); g.strokeStyle = rgb(d[5] || LINE); g.lineWidth = (d[6] || 0.6) * S; g.stroke(); g.setLineDash([]); }
      else if (k === 'text') {
        var words = tr(d[9] != null ? d[9] : d[3]), size = d[5] * S, font = d[4];
        if (d[9] != null && !/[\u0E00-\u0E7F]/.test(words)) words = String(words).toUpperCase();
        g.font = (font === 'F3' ? FACE.F3.replace('italic ', 'italic ' + size + 'px ') : size + 'px ' + (FACE[font] || FACE.F2));
        g.fillStyle = rgb(d[6]); g.textBaseline = 'alphabetic';
        var x = d[1] * S, w = g.measureText(words).width, room = (PAGE.w - SAFE.x) * S - x;
        if (d[8] === 'center') { x -= w / 2; room = Math.min(x, (PAGE.w - SAFE.x) * S - x) * 2 + w; } else if (d[8] === 'right') { x -= w; room = w; }
        g.fillText(words, x, Y(d[2]), Math.max(room, 40));
      }
    });
    return cv;
  }
  function buildRaster(pages, meta) {
    var objs = [], S = 3;
    function add(s) { objs.push(s); return objs.length; }
    var pagesIdx = pages.length * 3 + 1, kids = [];
    pages.forEach(function (p) {
      var cv = paint(p, S), bin = atob(cv.toDataURL('image/jpeg', 0.9).split(',')[1]);
      var im = add('<< /Type /XObject /Subtype /Image /Width ' + cv.width + ' /Height ' + cv.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bin.length + ' >>\nstream\n' + bin + '\nendstream');
      var content = 'q ' + PAGE.w + ' 0 0 ' + PAGE.h + ' 0 0 cm /Im' + im + ' Do Q';
      var c = add('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      var pg = add('<< /Type /Page /Parent ' + pagesIdx + ' 0 R /MediaBox [0 0 ' + PAGE.w + ' ' + PAGE.h + '] /Resources << /XObject << /Im' + im + ' ' + im + ' 0 R >> >> /Contents ' + c + ' 0 R >>');
      kids.push(pg + ' 0 R');
    });
    var pagesObj = add('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>');
    var info = add('<< /Title ' + enc(meta.title) + ' /Author (see you in laos.) /Producer (see you in laos.) >>');
    var catalog = add('<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>');
    var out = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n', offsets = [];
    objs.forEach(function (o, i) { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  }
  /* ---- the document: pages → bytes ---- */
  function build(pages, meta) {
    if (thai()) return buildRaster(pages, meta);
    var objs = [];
    function add(s) { objs.push(s); return objs.length; }
    var fonts = add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');
    var helv = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    var italic = add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>');
    var pagesIdx = objs.length + 1 + pages.length * 2;   /* pages object comes after page+content pairs */
    var kids = [];
    pages.forEach(function (p) {
      var content = p.ops.join('\n');
      var c = add('<< /Length ' + byteLen(content) + ' >>\nstream\n' + content + '\nendstream');
      var pg = add('<< /Type /Page /Parent ' + pagesIdx + ' 0 R /MediaBox [0 0 ' + PAGE.w + ' ' + PAGE.h + '] /Resources << /Font << /F1 ' + fonts + ' 0 R /F2 ' + helv + ' 0 R /F3 ' + italic + ' 0 R >> >> /Contents ' + c + ' 0 R >>');
      kids.push(pg + ' 0 R');
    });
    var pagesObj = add('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>');
    if (pagesObj !== pagesIdx) throw new Error('pdf: object order');
    var info = add('<< /Title ' + enc(meta.title) + ' /Author (see you in laos.) /Subject ' + enc(meta.subject) + ' /Creator (see you in laos. tickets) /Producer (see you in laos.) >>');
    var catalog = add('<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>');
    var out = '%PDF-1.4\n%âãÏÓ\n', offsets = [];
    objs.forEach(function (o, i) { offsets.push(byteLen(out)); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = byteLen(out);
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  }
  /* "Downloaded on 24 September 2026, 08:07 UTC" (TO-01531) — the stamp every ticket prints at its foot */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function downloadedWords(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return 'Downloaded';
    var hh = ('0' + d.getUTCHours()).slice(-2), mm = ('0' + d.getUTCMinutes()).slice(-2);
    return 'Downloaded on ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + hh + ':' + mm + ' UTC';
  }
  function byteLen(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 255 ? 1 : 1; return n; }   /* latin-1 bytes, one per char */
  function toBytes(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }
  /* does everything drawn on a page lie inside the safe area — the release requirement, measured */
  function within(page) {
    var bad = [];
    page.marks.forEach(function (m) { if (m.x < SAFE.x - 0.5 || m.y < SAFE.y - 0.5 || m.x + m.w > PAGE.w - SAFE.x + 0.5 || m.y + m.h > PAGE.h - SAFE.y + 0.5) bad.push(m); });
    return { ok: bad.length === 0, outside: bad };
  }

  /* ---- the QR code (the vendored encoder — MIT, Kazuhiko Arase), shared by every ticket ---- */
  function modules(text) {
    var q = (root && root.qrcode) || (typeof require === 'function' ? require('./vendor/qrcode.js') : null);
    if (!q) return null;
    if (q.stringToBytesFuncs && q.stringToBytesFuncs['UTF-8']) q.stringToBytes = q.stringToBytesFuncs['UTF-8'];   /* names and arrows survive the scan */
    var c = q(0, 'M'); c.addData(text, 'Byte'); c.make();
    var n = c.getModuleCount(), out = [];
    for (var r = 0; r < n; r++) { var row = []; for (var col = 0; col < n; col++) row.push(c.isDark(r, col)); out.push(row); }
    return out;
  }
  function escH(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function qrSvg(text, size, label) {
    var m = modules(text); if (!m) return '';
    var n = m.length, quiet = 2, N = n + quiet * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    return '<svg class="p-qr" viewBox="0 0 ' + N + ' ' + N + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" role="img" aria-label="' + escH(label || 'Ticket code') + '"><rect width="' + N + '" height="' + N + '" fill="#FCFAF6"/><path d="' + d + '" fill="#313131"/></svg>';
  }

  /* ---- the seat ticket ---------------------------------------------------- */
  /* Owner, Edit 2 (15 Sep 2026): the Wedding (Vow) Ceremony at Souphattra Heritage, 15:30; the dinner poolside, 19:30 */
  var EVENT_TIME = { ceremony: '15:30', dinner: '19:30' };
  var EVENT_HEAD = { ceremony: 'Vow Ceremony · Souphattra Heritage', dinner: 'Wedding Dinner · poolside' };
  var ALPHA = '23456789BCDFGHJKMNPQRSTVWXZ';
  /* the hosts' ceremony place, in words: their role when the record names it */
  function fixedWords(role) { return role === 'BRIDE' ? 'Bride' : role === 'GROOM' ? 'Groom' : 'Bride & Groom'; }
  /* the hosts' place (TO-01736): who, then where — “{Groom} · at the front, between the two blocks”; the status says “Front centre” */
  function seatWords(s) { return s.fixed ? fixedWords(s.fixed) : L.label(s.seatId); }
  function seatDetail(s) { return s.fixed ? 'At the front, between the two blocks' : L.describe(s.seatId); }
  /* the ticket reference: the ledger's own for a held chair; for a fixed position a digest of the position — never a code, never an id */
  function refOf(doc, s) {
    if (!s.fixed) return L.ref(doc.party.invitationId, doc.guest.guestId, s.event, s.seatId);
    var hex = L.sha256(doc.party.invitationId + '|' + doc.guest.guestId + '|' + s.event + '|FIXED:' + s.fixed), tail = '';
    for (var i = 0; i < 4; i++) tail += ALPHA[parseInt(hex.substr(i * 4, 4), 16) % ALPHA.length];
    return 'SYL-' + L.EVENT_CODE[s.event] + '-FC-' + tail;
  }
  function stateOf(s) { return s.fixed ? 'FRONT CENTRE' : 'HELD'; }
  /* the words inside the code: the ticket, readable by any scanner, secret to nobody */
  function payload(doc, s) {
    return ['SEE YOU IN LAOS', 'SEAT TICKET ' + refOf(doc, s), doc.guest.preferredName, L.EVENT_NAME[s.event], L.EVENT_DATE + ' · ' + EVENT_TIME[s.event], (s.fixed ? fixedWords(s.fixed) + ' · Front centre' : 'Seat ' + L.label(s.seatId) + ' · ' + L.describe(s.seatId)), stateOf(s)].join('\n');
  }

  /* one seat ticket drawn on a page: box = { x, y (bottom), w, h } — h is TICKET_H */
  var TICKET_H = 278;
  function drawSeatTicket(p, doc, s, box) {
    var g = p.ticket({ x: box.x, y: box.y, w: box.w, h: box.h, stub: 156 });
    var x = g.x, top = g.y, w = g.w;
    /* the header: the wordmark and what this is */
    p.text(x, top - 14, 'see you in laos.', 'F1', 15, INK, 0.2);
    p.label(x + w, top - 12, 'Seat ticket', 'right');
    p.line(x, top - 24, x + w, top - 24, INK, 0.7);
    /* the event */
    p.label(x, top - 48, 'Event'); p.text(x, top - 68, L.EVENT_NAME[s.event], 'F1', fit(L.EVENT_NAME[s.event], 21, 'F1', w, 14));
    p.text(x, top - 84, L.EVENT_DATE + ' · ' + EVENT_TIME[s.event], 'F2', 9.5, INK);
    p.text(x, top - 98, L.EVENT_VENUE[s.event], 'F2', 9.5, MUTE);
    p.line(x, top - 114, x + w, top - 114);
    /* the guest, the seat, the status — three columns */
    var c1 = x, c2 = x + w * 0.40, c3 = x + w * 0.75, fy = top - 134;
    p.label(c1, fy, 'Guest'); p.text(c1, fy - 20, doc.guest.fullName, 'F1', fit(doc.guest.fullName, 15, 'F1', c2 - c1 - 14, 10));
    p.label(c2, fy, 'Seat'); p.text(c2, fy - 27, seatWords(s), 'F1', s.fixed ? fit(seatWords(s), 15, 'F1', c3 - c2 - 12, 10) : 28);
    var detail = seatDetail(s); p.text(c2, fy - 42, detail, 'F2', fit(detail, 8, 'F2', c3 - c2 - 12, 6.5), MUTE, 0);
    p.label(c3, fy, 'Status'); p.text(c3, fy - 20, stateOf(s), 'F2', 8.5, INK, 1.8);
    p.label(c3, fy - 42, 'Date'); p.text(c3, fy - 56, '28 February 2027 · ' + EVENT_TIME[s.event], 'F2', fit('28 February 2027 · ' + EVENT_TIME[s.event], 9, 'F2', x + w - c3, 6.5), INK, 0.2);
    /* the foot of the body */
    var by = g.bottom;
    p.line(x, by + 14, x + w, by + 14);
    p.label(x, by, 'Wedding of Haruthai & Suthep');
    p.label(x + w, by, 'Vientiane, Laos', 'right');
    /* the stub: the code, the reference, the state, the event */
    var st = g.stub, size = 96, qx = st.cx - size / 2, qy = top - 14 - size;
    p.qr(modules(payload(doc, s)), qx, qy, size);
    p.text(st.cx, qy - 18, refOf(doc, s), 'F2', 8.6, INK, 1.4, 'center');
    p.label(st.cx, qy - 32, stateOf(s), 'center', ACCENT);
    p.label(st.cx, qy - 50, L.EVENT_NAME[s.event], 'center');
    p.label(st.cx, qy - 62, '28 February 2027 · ' + EVENT_TIME[s.event], 'center');
  }

  /* ---- the confirmation itself ---------------------------------------
   * doc = { guest: { fullName, preferredName, guestId }, party: { invitationId, partyName },
   *         seats: [ { event: 'ceremony'|'dinner', seatId | fixed: 'BRIDE'|'GROOM' } ],
   *         downloadedAt: ISO string }                                          */
  function compose(doc) {
    var p = new Page(), M = 48, W = PAGE.w - M * 2, y = PAGE.h - 72;
    p.ops.push(GROUND + ' rg 0 0 ' + PAGE.w + ' ' + PAGE.h + ' re f');   /* the ground — the page itself, not a drawn thing */
    /* the page title, well inside the safe area */
    p.text(M, y, 'see you in laos.', 'F1', 19, INK, 0.2);
    p.label(M + W, y + 2, doc.seats.length > 1 ? 'Your wedding seats' : 'Your wedding seat', 'right');
    y -= 18;
    p.text(M, y, doc.guest.fullName + (doc.party.partyName && doc.party.members > 1 ? ' · ' + doc.party.partyName : ''), 'F2', 9.5, MUTE);
    y -= 28;
    /* one ticket per seat, in the order of the day */
    var H = TICKET_H, GAP = 22;
    doc.seats.forEach(function (s) { drawSeatTicket(p, doc, s, { x: M, y: y - H, w: W, h: H }); y -= H + GAP; });
    /* the words at the foot */
    y -= 6;
    p.text(M, y, 'This ticket shows the seat held for you when you downloaded it.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, 'There is nothing to pay for your seat at the wedding of Haruthai & Suthep.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, 'If you change a seat, download a new ticket \u2014 the latest one is the one that counts.', 'F3', 9.5, MUTE);
    p.label(M, SAFE.y + 14, downloadedWords(doc.downloadedAt));
    p.label(M + W, SAFE.y + 14, 'Sunday, 28 February 2027 · Vientiane, Laos', 'right');
    var title = (doc.seats.length > 1 ? 'Your wedding seats' : L.EVENT_NAME[doc.seats[0].event] + ' seat ticket') + ' · ' + doc.guest.preferredName;
    var out = build([p], { title: title, subject: 'Seat ticket · ' + (doc.guest.preferredName || doc.guest.fullName) });
    compose.lastPage = p;   /* for the geometry test */
    return out;
  }
  function filename(doc) {
    var who = String(doc.guest.preferredName || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
    return 'see-you-in-laos-' + (doc.seats.length > 1 ? 'wedding-seats' : L.EVENT_CODE[doc.seats[0].event].toLowerCase() + '-seat') + '-' + who + '.pdf';
  }
  /* in the browser: build and hand the file to the guest */
  function download(doc) {
    var bytes = toBytes(compose(doc)), blob = new Blob([bytes], { type: 'application/pdf' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename(doc); a.rel = 'noopener'; document.body.appendChild(a); a.click();
    /* iOS Safari asks before it saves and reads the blob only then: the URL lives long enough for a slow answer */
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 90000);
    return a.download;
  }
  /* the document for one named guest, from the party as the invitation
   * carries it and the ledger view as it stands: only seats that exist.
   * events = ['ceremony'] | ['dinner'] | ['ceremony','dinner'] (the combined ticket) */
  function docFor(party, guestId, mine, events, at, names) {
    var g = null; (party && party.guests || []).forEach(function (x) { if (x.guestId === guestId) g = x; });
    if (!g) return null;
    /* the names as the guest has them on the page (a correction made in the profile counts), else the invitation's */
    names = names || {};
    var seats = [];
    (events || ['ceremony', 'dinner']).forEach(function (ev) {
      if (ev === 'ceremony' && party.hosts) { seats.push({ event: 'ceremony', fixed: g.hostRole === 'BRIDE' || g.hostRole === 'GROOM' ? g.hostRole : 'HOSTS' }); return; }
      var sid = mine && mine[ev] ? mine[ev][guestId] : null;
      if (sid && L.label(sid)) seats.push({ event: ev, seatId: sid });
    });
    if (!seats.length) return null;
    return { guest: { fullName: names.fullName || g.fullName || g.preferredName || '', preferredName: names.preferredName || g.preferredName || g.fullName || '', guestId: guestId },
             party: { invitationId: party.invitationId || '', partyName: party.partyName || '', members: (party.members || party.guests || []).length }, seats: seats, downloadedAt: at || new Date().toISOString() };
  }
  /* in the browser: read the ledger fresh — a private read that repaints
   * nothing — then hand over the file: never a ticket for a seat the
   * ledger no longer holds */
  function deliver(events, guestId) {
    var S = root && root.SIYL_SEATS, G = root && root.SIYL_GUEST, party = G && G.party();
    if (!S || !party) return Promise.resolve({ ok: false, error: 'not signed in' });
    return fetch(S.API + '?invitation=' + encodeURIComponent(party.invitationId), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (v) {
        if (!v || !v.ok || !v.mine) return { ok: false, error: 'seating unavailable' };
        var names = { fullName: G.value ? G.value(guestId, 'fullName') : '', preferredName: G.nameOf ? G.nameOf(guestId) : '' };
        var doc = docFor(party, guestId, v.mine, events, null, names);
        if (!doc) return { ok: false, error: 'no seat' };
        return { ok: true, file: download(doc), doc: doc };
      });
  }

  /* ---- the seat ticket on screen: the same composition as a card ----
   * doc as above with exactly one seat; opts: { actions: html, compact } */
  function card(doc, opts) {
    opts = opts || {};
    if (!doc || !doc.seats || !doc.seats.length) return '';
    var s = doc.seats[0], ref = refOf(doc, s), e = escH;
    return '<div class="p-ticket on p-ticket-seat" data-ticket="seat:' + e(s.event) + '" data-ticket-ref="' + e(ref) + '">' +
      '<div class="p-ticket-head"><p class="t-l1">' + e(EVENT_HEAD[s.event]) + '</p><p class="t-l1 on" data-ticket-state><i class="prep-tick" aria-hidden="true"></i>' + e('Held for you') + '</p></div>' +   /* TO-00352: the hosts’ tickets too; “Front centre” is said once, in Status */
      '<h3 class="t-h1">' + e(L.EVENT_NAME[s.event]) + '</h3>' +
      '<div class="p-ticket-route p-ticket-event">' +
        '<div class="p-ticket-end"><b class="p-ticket-code' + (s.fixed ? ' small' : '') + '">' + e(seatWords(s)) + '</b><span class="t-b2">' + e(seatDetail(s)) + '</span></div>' +
        '<div class="p-ticket-end to"><span class="p-ticket-time">' + e(EVENT_TIME[s.event]) + '</span><span class="t-b2">' + e(L.EVENT_DATE) + '<br>' + e(L.EVENT_VENUE[s.event]) + '</span></div>' +
      '</div>' +
      '<div class="p-ticket-tear" aria-hidden="true"></div>' +
      '<div class="p-ticket-body"><div class="p-ticket-facts">' +
        '<div><p class="t-l1">Guest</p><p class="t-b1">' + e(doc.guest.fullName) + '</p></div>' +
        '<div><p class="t-l1">Status</p><p class="t-b1">' + e(s.fixed ? 'Front centre' : 'Held for you') + '</p></div>' +
        '<div><p class="t-l1">Ticket reference</p><p class="t-b1"><span class="ref">' + e(ref) + '</span></p></div></div>' +
        '<div class="p-ticket-code-box">' + qrSvg(payload(doc, s), 96, 'Seat ticket code ' + ref) + '<p class="t-l1">' + e('Held for you') + '</p></div></div>' +
      (opts.actions ? '<div class="p-actions">' + opts.actions + '</div>' : '') + '</div>';
  }

  /* the writer, shared with the travel pass (assets/travelpass.js): one PDF grammar, one ticket frame, one code for every ticket */
  var writer = { Page: Page, build: build, downloadedWords: downloadedWords, toBytes: toBytes, width: width, fit: fit, wrap: wrap, within: within, modules: modules, qrSvg: qrSvg, PAGE: PAGE, SAFE: SAFE, INK: INK, MUTE: MUTE, LINE: LINE, GROUND: GROUND, PAPER: PAPER, SHADE: SHADE, ACCENT: ACCENT };
  return { compose: compose, filename: filename, download: download, docFor: docFor, deliver: deliver, toBytes: toBytes, PAGE: PAGE, fixedWords: fixedWords,
           refOf: refOf, payload: payload, card: card, seatWords: seatWords, EVENT_TIME: EVENT_TIME, writer: writer };
});
