/* ============================================================================
   SEE YOU IN LAOS — SEAT LABELS AND THE SEAT REFERENCE (Owner, 13 Sep 2026).

   The ledger keeps its immutable internal ids (C-L-04-02, D-T-17). The guest
   sees airline-style labels and nothing else:

     CEREMONY   left block  A B  · centre aisle (column C is the aisle, so it
                does not exist) · right block  D E F  · rows 1–10
                C-L-rr-01 → A rr    C-L-rr-02 → B rr
                C-R-rr-01 → D rr    C-R-rr-02 → E rr    C-R-rr-03 → F rr
                BRIDE and GROOM are front-centre positions with no seat label.
     DINNER     the two 25-place runs of the one long table
                D-T-nn → A nn (top run)      D-B-nn → B nn (bottom run)

   The mapping is a pure function both ways, identical in the browser and in
   Node (the tests pin every one of the 100 pairs), so a displayed label can
   never point at a different ledger seat.

   THE SEAT REFERENCE is a harmless, deterministic display code derived from
   the confirmed booking (invitation id · guest id · event · internal seat id)
   through SHA-256 — never the access code, never a token, never a key. It
   changes when the seat changes, which is exactly what a confirmation wants.
   ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SIYL_SEATLABELS = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var COLS = { L: ['A', 'B'], R: ['D', 'E', 'F'] };
  var RUNS = { T: 'A', B: 'B' };
  var EVENT_CODE = { ceremony: 'WC', dinner: 'WD' };   /* WC = Wedding (Vow) Ceremony · WD = Wedding Dinner */
  var EVENT_NAME = { ceremony: 'Vow Ceremony', dinner: 'Wedding Dinner' };
  var EVENT_VENUE = { ceremony: 'Souphattra Heritage, Vientiane', dinner: 'Souphattra Heritage, Vientiane · poolside' };
  var EVENT_DATE = 'Sunday, 28 February 2027';

  /* internal id → guest-facing label; null for anything that is not a seat */
  function label(seatId) {
    var c = /^C-([LR])-(0[1-9]|10)-(0[1-3])$/.exec(seatId || '');
    if (c) { var col = COLS[c[1]][Number(c[3]) - 1]; return col ? col + Number(c[2]) : null; }
    var d = /^D-([TB])-(0[1-9]|1[0-9]|2[0-5])$/.exec(seatId || '');
    if (d) return RUNS[d[1]] + Number(d[2]);
    return null;
  }
  /* guest-facing label → internal id, per event; null when no such seat */
  function seatId(event, lab) {
    var m = /^([A-F])(\d{1,2})$/.exec(String(lab || '').toUpperCase().replace(/\s+/g, ''));
    if (!m) return null;
    var n = Number(m[2]);
    if (event === 'ceremony') {
      if (n < 1 || n > 10) return null;
      var pad2 = (n < 10 ? '0' : '') + n;
      if (m[1] === 'A' || m[1] === 'B') return 'C-L-' + pad2 + '-0' + (m[1] === 'A' ? 1 : 2);
      if (m[1] === 'D' || m[1] === 'E' || m[1] === 'F') return 'C-R-' + pad2 + '-0' + ({ D: 1, E: 2, F: 3 })[m[1]];
      return null;   /* C is the aisle */
    }
    if (event === 'dinner') {
      if (n < 1 || n > 25 || (m[1] !== 'A' && m[1] !== 'B')) return null;
      return 'D-' + (m[1] === 'A' ? 'T' : 'B') + '-' + (n < 10 ? '0' : '') + n;
    }
    return null;
  }
  /* the words around a label — for the map, the cards, the pass */
  function describe(seatId0) {
    var c = /^C-([LR])-(\d+)-(\d+)$/.exec(seatId0 || '');
    if (c) return (c[1] === 'L' ? 'Left block' : 'Right block') + ' · row ' + Number(c[2]);
    var d = /^D-([TB])-(\d+)$/.exec(seatId0 || '');
    if (d) return 'Long table · ' + (d[1] === 'T' ? 'run A · Poolside' : 'run B') + ' · place ' + Number(d[2]);
    return '';
  }

  /* ---- SHA-256, compact and dependency-free (FIPS 180-4) ---- */
  function sha256(str) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = [];
    for (var i = 0; i < str.length; i++) { var cp = str.charCodeAt(i);
      if (cp >= 0xD800 && cp <= 0xDBFF && i + 1 < str.length) { cp = 0x10000 + ((cp - 0xD800) << 10) + (str.charCodeAt(i + 1) - 0xDC00); i++; }
      if (cp < 128) bytes.push(cp); else if (cp < 2048) bytes.push(192 | cp >> 6, 128 | cp & 63); else if (cp < 65536) bytes.push(224 | cp >> 12, 128 | cp >> 6 & 63, 128 | cp & 63); else bytes.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63); }
    var bitLen = bytes.length * 8; bytes.push(128); while (bytes.length % 64 !== 56) bytes.push(0);
    for (var j = 7; j >= 0; j--) bytes.push(j >= 4 ? 0 : (bitLen >>> (j * 8)) & 255);
    var w = new Array(64), rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var off = 0; off < bytes.length; off += 64) {
      for (var t = 0; t < 16; t++) w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      for (t = 16; t < 64; t++) { var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) { var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[t] + w[t]) | 0, S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = '';
    for (i = 0; i < 8; i++) out += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return out;
  }
  /* four characters from an alphabet without vowels or look-alikes */
  var ALPHA = '23456789BCDFGHJKMNPQRSTVWXZ';
  function ref(invitationId, guestId, event, seatId0) {
    if (!invitationId || !guestId || !EVENT_CODE[event] || !seatId0 || !label(seatId0)) return null;
    var hex = sha256(invitationId + '|' + guestId + '|' + event + '|' + seatId0), tail = '';
    for (var i = 0; i < 4; i++) tail += ALPHA[parseInt(hex.substr(i * 4, 4), 16) % ALPHA.length];
    return 'SYL-' + EVENT_CODE[event] + '-' + label(seatId0) + '-' + tail;
  }

  return { COLS: COLS, RUNS: RUNS, EVENT_CODE: EVENT_CODE, EVENT_NAME: EVENT_NAME, EVENT_VENUE: EVENT_VENUE, EVENT_DATE: EVENT_DATE,
           label: label, seatId: seatId, describe: describe, ref: ref, sha256: sha256 };
});
