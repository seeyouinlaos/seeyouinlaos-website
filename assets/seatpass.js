/* ============================================================================
   SEE YOU IN LAOS — THE SEAT CONFIRMATION (a downloadable PDF).

   A real PDF, written here byte by byte (PDF 1.4, base-14 fonts Times and
   Helvetica, WinAnsi text, no compression, no images), so it opens on an
   iPhone, prints at A4 and can be read back by a test. It says what the
   seating ledger says at the moment of download and nothing more: the guest,
   the party (never the access code), the event, the date, the venue, the
   seat's guest-facing label, a harmless seat reference, the status. No QR
   code, no barcode, no price — it is a seat confirmation, not a ticket.
   ========================================================================== */
(function (root, factory) {
  var api = factory(root && root.SIYL_SEATLABELS ? root.SIYL_SEATLABELS : (typeof require === 'function' ? require('./seatlabels.js') : null), root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SIYL_SEATPASS = api;
})(typeof window !== 'undefined' ? window : null, function (L, root) {
  'use strict';
  var INK = '0.192 0.192 0.192', MUTE = '0.42 0.412 0.392', LINE = '0.855 0.851 0.843', GROUND = '0.953 0.933 0.906', PAPER = '0.988 0.98 0.965';
  var PAGE = { w: 595.28, h: 841.89 };

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

  /* ---- one page of drawing operators ---- */
  function Page() { this.ops = []; }
  Page.prototype.rect = function (x, y, w, h, fill, stroke, sw) {
    var o = [];
    if (fill) o.push(fill + ' rg');
    if (stroke) o.push(stroke + ' RG ' + (sw || 0.6) + ' w');
    o.push(x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
    this.ops.push(o.join(' '));
  };
  Page.prototype.line = function (x1, y1, x2, y2, color, sw) { this.ops.push((color || LINE) + ' RG ' + (sw || 0.6) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S'); };
  Page.prototype.text = function (x, y, t, font, size, color, spacing, align) {
    var w = width(t, size, font) + (spacing || 0) * String(t).length;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    this.ops.push('BT ' + (color || INK) + ' rg /' + font + ' ' + size + ' Tf ' + (spacing || 0) + ' Tc ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Td ' + enc(t) + ' Tj ET');
  };
  Page.prototype.label = function (x, y, t, align) { this.text(x, y, String(t).toUpperCase(), 'F2', 7.2, MUTE, 1.6, align); };

  /* ---- the document: pages → bytes ---- */
  function build(pages, meta) {
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
    var info = add('<< /Title ' + enc(meta.title) + ' /Author (see you in laos.) /Subject ' + enc(meta.subject) + ' /Creator (see you in laos. seat confirmation) /Producer (see you in laos.) >>');
    var catalog = add('<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>');
    var out = '%PDF-1.4\n%âãÏÓ\n', offsets = [];
    objs.forEach(function (o, i) { offsets.push(byteLen(out)); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = byteLen(out);
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return out;
  }
  function byteLen(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 255 ? 1 : 1; return n; }   /* latin-1 bytes, one per char */
  function toBytes(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }

  /* the hosts' ceremony place, in words: their role when the record names it */
  function fixedWords(role) { return role === 'BRIDE' ? 'Bride' : role === 'GROOM' ? 'Groom' : 'Bride & Groom'; }

  /* ---- the confirmation itself ---------------------------------------
   * doc = { guest: { fullName, preferredName, guestId }, party: { invitationId, partyName },
   *         seats: [ { event: 'ceremony'|'dinner', seatId | fixed: 'BRIDE'|'GROOM' } ],
   *         downloadedAt: ISO string }                                          */
  function compose(doc) {
    var p = new Page(), M = 56, W = PAGE.w - M * 2, y = PAGE.h - 64;
    p.rect(0, 0, PAGE.w, PAGE.h, GROUND);
    p.rect(M - 16, 48, W + 32, PAGE.h - 96, PAPER, LINE, 0.6);
    p.text(M, y, 'see you in laos.', 'F1', 21, INK, 0.2); y -= 20;
    p.label(M, y, doc.seats.length > 1 ? 'Your wedding seats' : 'Seat confirmation'); y -= 30;
    p.line(M, y, M + W, y, INK, 0.7); y -= 34;
    /* the guest, the party */
    /* the name in the left column only: a long name is set smaller, never over the invitation */
    var nameSize = 22; while (nameSize > 11 && width(doc.guest.fullName, nameSize, 'F1') > W / 2 - 18) nameSize -= 1;
    p.label(M, y, 'Guest'); p.text(M, y - 22, doc.guest.fullName, 'F1', nameSize);
    /* the party as context only — never an id, never a code */
    if (doc.party.partyName && doc.party.members > 1) { p.label(M + W / 2, y, 'Your party'); p.text(M + W / 2, y - 20, doc.party.partyName, 'F1', 13); }
    y -= 60; p.line(M, y, M + W, y); y -= 34;
    doc.seats.forEach(function (s, i) {
      var lab = s.fixed ? fixedWords(s.fixed) + ' · Front Centre' : L.label(s.seatId);
      p.label(M, y, 'Event'); p.text(M, y - 24, L.EVENT_NAME[s.event], 'F1', 19); y -= 46;
      p.label(M, y, 'Date'); p.text(M, y - 18, L.EVENT_DATE, 'F1', 12.5);
      p.label(M + W / 2, y, 'Venue'); p.text(M + W / 2, y - 18, L.EVENT_VENUE[s.event], 'F1', 12.5); y -= 44;
      p.label(M, y, 'Seat'); p.text(M, y - 34, lab, 'F1', s.fixed ? 22 : 34);
      if (!s.fixed) p.text(M, y - 50, L.describe(s.seatId), 'F2', 8.5, MUTE, 0.6);
      p.label(M + W / 2, y, 'Status'); p.text(M + W / 2, y - 20, s.fixed ? 'FRONT CENTRE' : 'CONFIRMED', 'F2', 9.5, INK, 2.2);
      p.label(M + W / 2, y - 40, 'Held for'); p.text(M + W / 2, y - 56, doc.guest.preferredName || doc.guest.fullName, 'F2', 9.5, INK, 1.2);
      y -= 76; p.line(M, y, M + W, y); y -= 34;
    });
    /* the words at the foot */
    p.text(M, y, 'This confirmation shows your seat exactly as Guest Relations hold it in the seating ledger at the time of download.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, 'It is a seat confirmation for the wedding of Haruthai & Suthep — not a ticket, and nothing here is charged.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, 'If you change a seat, download this confirmation again; the newer one is the one that counts.', 'F3', 9.5, MUTE);
    p.label(M, 64, 'Downloaded ' + doc.downloadedAt.replace('T', ' ').slice(0, 16) + ' UTC');
    p.label(M + W, 64, 'Sunday, 28 February 2027 · Vientiane, Laos', 'right');
    var title = (doc.seats.length > 1 ? 'Your wedding seats' : L.EVENT_NAME[doc.seats[0].event] + ' seat confirmation') + ' · ' + doc.guest.preferredName;
    return build([p], { title: title, subject: 'Seat confirmation · ' + (doc.guest.preferredName || doc.guest.fullName) });
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
   * events = ['ceremony'] | ['dinner'] | ['ceremony','dinner'] (the combined pass) */
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
   * nothing — then hand over the file: never a confirmation of a seat the
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
  /* the writer, shared with the travel pass (assets/travelpass.js): one PDF grammar for every confirmation */
  var writer = { Page: Page, build: build, toBytes: toBytes, width: width, PAGE: PAGE, INK: INK, MUTE: MUTE, LINE: LINE, GROUND: GROUND, PAPER: PAPER };
  return { compose: compose, filename: filename, download: download, docFor: docFor, deliver: deliver, toBytes: toBytes, PAGE: PAGE, fixedWords: fixedWords, writer: writer };
});
