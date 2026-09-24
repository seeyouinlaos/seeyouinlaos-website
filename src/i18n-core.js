/* SEE YOU IN LAOS — THE LOCALE CORE (Owner, 24 Sep 2026 · EN / TH + USD / EUR / THB)
 *
 * ONE module, used by the browser runtime (generated into assets/i18n/siyl-i18n.js by src/build-i18n.cjs) and by the Worker's
 * guest email (src/mail-templates.js). English is the semantic source of truth; Thai is an authored, native expression of the
 * same meaning, looked up by the final English string — whole strings or whole templates with {1} {2} … values, never fragments
 * glued together. There is no machine translation anywhere: a string without an authored Thai value stays as it is.
 *
 * THE CURRENCY LAYER is presentation only. The approved USD amounts stay the canonical website amounts; EUR and THB are
 * approximate equivalents from ONE rate snapshot (ECB euro foreign exchange reference rates), one rounding rule, one formatter.
 * Nothing stored, sent or calculated changes with the currency a guest chooses. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SIYL_I18N_CORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- currency ---------------- */
  /* ECB euro foreign exchange reference rates, 24 September 2026 (1 EUR = …). Changed only by a new snapshot here. */
  var RATES = { asOf: '2026-09-24', source: 'ECB euro foreign exchange reference rates', base: 'EUR', EUR: 1, USD: 1.1367, THB: 38.057 };
  var CURRENCIES = ['USD', 'EUR', 'THB'];
  /* one rounding rule: whole euros; baht to the nearest 10 (an equivalent, never a quoted price) */
  var STEP = { USD: 1, EUR: 1, THB: 10 };
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function convert(usd, code) {
    var v = Number(usd); if (!isFinite(v)) return null;
    if (code === 'USD' || !RATES[code]) return v;
    var raw = v / RATES.USD * RATES[code], step = STEP[code] || 1;
    return Math.round(raw / step) * step;
  }
  /* "USD 1,500" (canonical) · "≈ EUR 1,320" (an equivalent) — the code, one space, the grouped amount */
  function money(usd, code) {
    code = CURRENCIES.indexOf(code) > -1 ? code : 'USD';
    var v = convert(usd, code); if (v == null) return '';
    var s = code + ' ' + group(code === 'USD' && v % 1 ? v.toFixed(2) : Math.round(v));
    return code === 'USD' ? s : '≈ ' + s;
  }
  /* every "USD n" inside a rendered string, shown in the chosen currency; "USD 0" is left alone */
  var USD_RE = /(≈\s)?USD\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(?![\d,])/g;
  function moneyText(s, code) {
    if (!s || code === 'USD' || CURRENCIES.indexOf(code) < 0 || s.indexOf('USD') < 0) return s;
    return s.replace(USD_RE, function (all, approx, int, dec) {
      var v = Number(int.replace(/,/g, '') + (dec || ''));
      if (!v) return all;
      return money(v, code);
    });
  }

  /* ---------------- translation ---------------- */
  function norm(s) { return String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  /* dict = { exact: { en: th }, templates: [ { en: 'Seat {x} · held for you', th: 'ที่นั่ง {1} · กันไว้ให้แล้ว' } ], keep: [ … ] } */
  function translator(dict) {
    dict = dict || {};
    var exact = dict.exact || {}, lower = {};
    Object.keys(exact).forEach(function (k) { var n = norm(k); if (n !== k && exact[n] == null) exact[n] = exact[k]; lower[n.toLowerCase()] = exact[k]; });
    var keep = {}; (dict.keep || []).forEach(function (k) { keep[norm(k)] = true; });
    /* templates: the most specific first (more literal characters wins) */
    var tpls = (dict.templates || []).map(function (t) {
      var en = norm(t.en), parts = en.split('{x}');
      return { lit: en.replace(/\{x\}/g, '').length, n: parts.length - 1, th: t.th, re: new RegExp('^' + parts.map(esc).join('(.+?)') + '$', 'i') };
    }).filter(function (t) { return t.n > 0; }).sort(function (a, b) { return b.lit - a.lit; });
    /* English grammar that travels inside a value: a plural "s", "is"/"are", a list joined with "and", a date */
    var TH_MONTH = { January: 'มกราคม', February: 'กุมภาพันธ์', March: 'มีนาคม', April: 'เมษายน', May: 'พฤษภาคม', June: 'มิถุนายน', July: 'กรกฎาคม', August: 'สิงหาคม', September: 'กันยายน', October: 'ตุลาคม', November: 'พฤศจิกายน', December: 'ธันวาคม' };
    var TH_MON = { Jan: 'ม.ค.', Feb: 'ก.พ.', Mar: 'มี.ค.', Apr: 'เม.ย.', May: 'พ.ค.', Jun: 'มิ.ย.', Jul: 'ก.ค.', Aug: 'ส.ค.', Sep: 'ก.ย.', Oct: 'ต.ค.', Nov: 'พ.ย.', Dec: 'ธ.ค.' };
    var TH_DAY = { Monday: 'วันจันทร์', Tuesday: 'วันอังคาร', Wednesday: 'วันพุธ', Thursday: 'วันพฤหัสบดี', Friday: 'วันศุกร์', Saturday: 'วันเสาร์', Sunday: 'วันอาทิตย์' };
    var DATE_RE = /^(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+)?(\d{1,2})(?:\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?(?:\s+[–-]\s+(\d{1,2}))?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?(?:,?\s+(\d{1,2}:\d{2})(\s+UTC)?)?$/;
    function month(m) { return TH_MONTH[m] || TH_MON[m] || m; }
    function date(v) {
      var m = DATE_RE.exec(v); if (!m) return null;
      var out = (m[1] ? TH_DAY[m[1]] + 'ที่ ' : '') + m[2] + (m[3] ? ' ' + month(m[3]) : '') + (m[4] ? ' – ' + m[4] : '') + ' ' + month(m[5]) + (m[6] ? ' ' + m[6] : '');
      if (m[7]) out += ' เวลา ' + m[7] + ' น.' + (m[8] ? ' (UTC)' : '');
      return out;
    }
    function value(v, depth) {
      if (/^(s|es|is|are|’s|'s)$/.test(norm(v))) return '';
      var d = date(norm(v)); if (d != null) return d;
      var t = tr(v, depth); if (t != null) return t;
      var parts = norm(v).split(/, | and /);
      if (parts.length > 1 && / and /.test(v) && parts.every(function (p) { return tr(p, depth) != null || !/(^|\s)[a-z]/.test(p); })) {
        var tp = parts.map(function (p) { var x = tr(p, depth); return x == null ? p : x; });
        return tp.slice(0, -1).join(' ') + ' และ ' + tp[tp.length - 1];
      }
      return v;
    }
    function tr(s, depth) {
      var n = norm(s);
      if (!n) return s;
      if (exact[n] != null) return exact[n];
      if (lower[n.toLowerCase()] != null) return lower[n.toLowerCase()];
      if (keep[n]) return s;
      if ((depth || 0) > 2) return null;
      var dt = date(n); if (dt != null) return dt;
      var tailSep = / ·$/.exec(n); if (tailSep) { var tb = tr(n.slice(0, -2), (depth || 0) + 1); if (tb != null) return tb + ' ·'; }
      for (var i = 0; i < tpls.length; i++) {
        var m = tpls[i].re.exec(n); if (!m) continue;
        var out = tpls[i].th, bad = false;
        for (var j = 1; j <= tpls[i].n && !bad; j++) {
          var val = value(m[j], (depth || 0) + 1);
          /* a value left in English must be a name, a number or a code — never words of a sentence */
          if (val === m[j] && /[a-z]{2,}[\s,]+[a-z]{2,}/.test(m[j])) bad = true;
          out = out.split('{' + j + '}').join(val);
        }
        if (bad) continue;
        return out;
      }
      /* a composed label ("Bangkok · Restaurant", "· Travel · Bangkok → Vientiane", "Sühring, Bangkok — 4 photographs"):
         the pieces, each an authored string or a name kept as it is */
      var seps = / · | — |, | → /;
      if (seps.test(n)) {
        var pieces = n.split(/( · | — |, | → )/), any = false, out2 = '';
        for (var k = 0; k < pieces.length; k++) {
          var pc = pieces[k];
          if (k % 2) { out2 += pc === ', ' ? ' ' : pc; continue; }
          if (!pc) continue;
          var lead = pc.match(/^[·\s]*/)[0], body = pc.slice(lead.length);
          var tp = body ? (tr(body, (depth || 0) + 1)) : '';
          if (tp == null) { var dd = date(body); if (dd != null) tp = dd; }
          if (tp == null) tp = value(body, (depth || 0) + 1);
          if (tp !== body) any = true;
          /* an untranslated piece must be a name (every word capitalised, a number or a code) — never part of a sentence */
          else if (!keep[norm(body)] && /(^|\s)[a-z][a-z’'-]*(\s|$)/.test(body)) return null;
          out2 += lead + tp;
        }
        if (any) return out2;
      }
      return null;   /* no authored Thai: the caller keeps the English */
    }
    function has(s) { return tr(s) != null; }
    /* a line of text as the email writes it: "· Label: value" — the whole line first, then label and value apart */
    function line(s) {
      var t = tr(s); if (t != null) return t;
      var m = /^(\s*(?:[·•\-]\s+)?)(.+?)(:\s+)(.+)$/.exec(s);
      if (m) { var a = tr(m[2]), b = tr(m[4]); if (a != null || b != null) return m[1] + (a != null ? a : m[2]) + m[3] + (b != null ? b : m[4]); }
      return s;
    }
    return { tr: function (s) { var t = tr(s); return t == null ? s : t; }, lookup: tr, has: has, line: line };
  }

  return { RATES: RATES, CURRENCIES: CURRENCIES, convert: convert, money: money, moneyText: moneyText, translator: translator, norm: norm };
});
