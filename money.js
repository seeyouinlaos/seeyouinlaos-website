/**
 * Money — the ONE money library for the whole project.
 *
 * Single source of truth for: rounding, currency symbol, locale, formatting,
 * conversion (given rates), and the native-vs-converted marking. Every price the
 * project shows — Flight Market, flight cards, comparison, journey, hotel cards,
 * hotel overview, and any future OEM surface (e.g. a wedding budget) — formats
 * through here so there is exactly one place to change any of it.
 *
 * Rates are NOT stored here. Exchange rates arrive as a `ratesDoc`
 * ({ base, rates }) produced by the ExchangeRateProvider / CurrencyService; this
 * module only does the pure math and formatting on top of them. That keeps the
 * currency layer provider-independent and reusable across flights and hotels.
 *
 * UMD: usable as a CommonJS module on the Worker (require) AND as a browser global
 * `Money` via <script src="money.js">, so backend and frontend share one file.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Money = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUPPORTED = ['USD', 'EUR', 'THB'];
  var DEFAULT_CURRENCY = 'USD';
  var LOCALES = { USD: 'en-US', EUR: 'de-DE', THB: 'th-TH', GBP: 'en-GB' };

  function isSupported(c) { return SUPPORTED.indexOf(String(c || '').toUpperCase()) >= 0; }
  function localeFor(c) { return LOCALES[String(c || '').toUpperCase()] || 'en-US'; }
  function round(amount, dp) { var f = Math.pow(10, dp == null ? 2 : dp); return Math.round(amount * f) / f; }

  /** Localized currency string. amount may be a number or a {amount,currency} object. */
  function format(amount, currency, opts) {
    opts = opts || {};
    var n = (amount && typeof amount === 'object') ? (amount.amount != null ? amount.amount : amount.price) : amount;
    var cur = (amount && typeof amount === 'object' && amount.currency) || currency || DEFAULT_CURRENCY;
    if (n == null || isNaN(n)) return '—';
    try {
      return new Intl.NumberFormat(localeFor(cur), {
        style: 'currency', currency: cur,
        maximumFractionDigits: opts.maximumFractionDigits == null ? 0 : opts.maximumFractionDigits,
      }).format(n);
    } catch (e) { return Math.round(n) + ' ' + cur; }
  }
  function formatMoney(money, opts) { return money ? format(money.amount, money.currency, opts) : '—'; }

  /** Multiplier from `from` to `to` using a provider ratesDoc ({base, rates}). */
  function crossRate(ratesDoc, from, to) {
    from = String(from).toUpperCase(); to = String(to).toUpperCase();
    if (from === to) return 1;
    if (!ratesDoc || !ratesDoc.rates) return null;
    var base = String(ratesDoc.base || 'EUR').toUpperCase();
    var per = function (c) { return c === base ? 1 : (ratesDoc.rates[c] != null ? ratesDoc.rates[c] : null); };
    var pf = per(from), pt = per(to);
    if (pf == null || pt == null || !pf) return null;
    return pt / pf;
  }
  function convert(amount, from, to, ratesDoc) {
    var r = crossRate(ratesDoc, from, to);
    return r == null ? null : amount * r;
  }
  /**
   * Convert `{amount,currency}` into `to` using ratesDoc. Returns unchanged+unmarked
   * when already in `to` or when the pair is unknown (no fabrication); otherwise
   * `converted:true` with the native `source` and applied `rate`.
   */
  function convertMoney(money, to, ratesDoc) {
    if (!money || money.amount == null) return money;
    to = String(to || DEFAULT_CURRENCY).toUpperCase();
    var from = String(money.currency || 'EUR').toUpperCase();
    if (from === to) return { amount: money.amount, currency: to, converted: false };
    var r = crossRate(ratesDoc, from, to);
    if (r == null) return { amount: money.amount, currency: from, converted: false };
    return { amount: round(money.amount * r, 2), currency: to, converted: true, rate: r, source: { amount: money.amount, currency: from } };
  }

  /** Subtle indicator for a converted price. */
  function convertedLabel(fromCurrency) { return '≈ Converted from ' + String(fromCurrency || 'EUR').toUpperCase(); }

  return {
    SUPPORTED: SUPPORTED, DEFAULT_CURRENCY: DEFAULT_CURRENCY,
    isSupported: isSupported, localeFor: localeFor, round: round,
    format: format, formatMoney: formatMoney,
    crossRate: crossRate, convert: convert, convertMoney: convertMoney,
    convertedLabel: convertedLabel,
  };
}));
