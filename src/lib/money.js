'use strict';
/**
 * Currency seam — provider-independent.
 *
 * Rule (see the product spec): prefer PROVIDER-NATIVE pricing. A provider that can
 * price in the requested currency is asked to do so and its numbers are used
 * verbatim. Only when a provider CANNOT return the requested currency does the
 * application convert here, in one place, using an indicative cross-rate table.
 *
 * The rate table is intentionally the only thing that would change to wire a live
 * FX source (or a provider's own FX): swap `RATES_EUR` for a fetched/cached map.
 * No UI or provider code changes when that happens. Converted money is always
 * marked (`converted:true`) and keeps its provider-native `source`, so the UI can
 * label it honestly ("≈") and booking can fall back to the original fare currency.
 */

const SUPPORTED = ['USD', 'EUR', 'THB'];
const DEFAULT_CURRENCY = 'USD';

// Indicative cross rates, base = EUR. Replace with a live-rate source in
// production; the shape (currency -> units per 1 EUR) is the stable contract.
const RATES_EUR = { EUR: 1, USD: 1.09, THB: 39.0, GBP: 0.85 };

function isSupported(c) { return SUPPORTED.includes(String(c || '').toUpperCase()); }

/** Multiplier to go from `from` to `to`, or null if either is unknown. */
function rate(from, to) {
  from = String(from || '').toUpperCase(); to = String(to || '').toUpperCase();
  if (from === to) return 1;
  const f = RATES_EUR[from], t = RATES_EUR[to];
  if (!f || !t) return null;
  return t / f;
}

function convert(amount, from, to) {
  const r = rate(from, to);
  return r == null ? null : amount * r;
}

/**
 * Convert a `{amount, currency}` into `to`. If already in `to` (or the rate is
 * unknown) it is returned unchanged and unmarked. Otherwise the result is marked
 * `converted:true` and carries the provider-native `source`.
 * @param {{amount:number, currency:string}} money
 * @param {string} to
 */
function convertMoney(money, to) {
  if (!money || money.amount == null) return money;
  to = String(to || DEFAULT_CURRENCY).toUpperCase();
  const from = String(money.currency || 'EUR').toUpperCase();
  if (from === to) return { amount: money.amount, currency: to, converted: false };
  const v = convert(money.amount, from, to);
  if (v == null) return { amount: money.amount, currency: from, converted: false };
  return { amount: Math.round(v * 100) / 100, currency: to, converted: true, source: { amount: money.amount, currency: from } };
}

module.exports = { SUPPORTED, DEFAULT_CURRENCY, RATES_EUR, isSupported, rate, convert, convertMoney };
