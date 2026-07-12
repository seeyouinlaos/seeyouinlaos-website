'use strict';
/**
 * CurrencyService — the app's single point for turning provider-native money into
 * a display currency. It is provider-independent: it asks the configured
 * ExchangeRateProvider for rates, caches them, cross-computes any pair, converts
 * once, and always preserves the provider-native source. It NEVER mutates the
 * caller's money object.
 *
 * Caching: an in-process memo (per Worker isolate) plus an optional KV cache
 * (via the store) keyed by provider+base and honoured for the provider's TTL — so
 * a search or a market refresh does not hit the FX source on every request.
 *
 * The same service is used for flights today and hotels/anything tomorrow.
 */
const { getExchangeRateProvider, STATIC_RATES } = require('./exchangeRateProvider');

const _memo = new Map(); // cacheKey -> { base, rates, fetchedAt }

/**
 * @param {Record<string,string|undefined>} env
 * @param {{getKV?:Function,setKV?:Function}|null} store  optional KV cache
 */
function createCurrencyService(env = {}, store = null) {
  const provider = getExchangeRateProvider(env);
  const cacheKey = `fxrates:${provider.name}:${provider.base}`;

  async function ratesDoc() {
    const now = Date.now();
    const fresh = (d) => d && (now - (d.fetchedAt || 0) < provider.ttlMs);

    const mem = _memo.get(cacheKey);
    if (fresh(mem)) return mem;

    if (store && store.getKV) {
      try { const kv = await store.getKV(cacheKey); if (fresh(kv)) { _memo.set(cacheKey, kv); return kv; } } catch { /* ignore */ }
    }

    let doc;
    try {
      doc = await provider.getRates();
    } catch (e) {
      // Live source unavailable → indicative offline fallback (still real conversion,
      // just labelled). Never throw out of pricing for an FX hiccup.
      doc = { base: 'EUR', rates: { ...STATIC_RATES }, indicative: true, fallback: true };
    }
    doc.fetchedAt = now;
    doc.provider = doc.fallback ? `${provider.name}→static` : provider.name;
    _memo.set(cacheKey, doc);
    if (store && store.setKV) { try { await store.setKV(cacheKey, doc, Math.floor(provider.ttlMs / 1000)); } catch { /* ignore */ } }
    return doc;
  }

  function crossRate(doc, from, to) {
    from = String(from).toUpperCase(); to = String(to).toUpperCase();
    if (from === to) return 1;
    const per = (c) => (c === doc.base ? 1 : (doc.rates[c] != null ? doc.rates[c] : null));
    const pf = per(from), pt = per(to);
    if (pf == null || pt == null || !pf) return null; // unknown pair → no fabrication
    return pt / pf;
  }

  return {
    providerName: provider.name,

    /** Multiplier from `from` to `to`, or null if the pair is unknown. */
    async getRate(from, to) { return crossRate(await ratesDoc(), from, to); },

    /**
     * Convert `{amount,currency}` into `to`. Returns unchanged+unmarked when already
     * in `to` or when the pair is unknown; otherwise `converted:true` with the
     * native `source`, the applied `rate`, and which `rateProvider` supplied it.
     */
    async convertMoney(money, to) {
      if (!money || money.amount == null) return money;
      to = String(to || '').toUpperCase();
      const from = String(money.currency || 'EUR').toUpperCase();
      if (from === to) return { amount: money.amount, currency: to, converted: false };
      const doc = await ratesDoc();
      const r = crossRate(doc, from, to);
      if (r == null) return { amount: money.amount, currency: from, converted: false };
      return {
        amount: Math.round(money.amount * r * 100) / 100, currency: to, converted: true,
        rate: r, rateProvider: doc.provider, source: { amount: money.amount, currency: from },
      };
    },
  };
}

/** Test/ops helper: drop the in-process rate memo. */
function _clearFxMemo() { _memo.clear(); }

module.exports = { createCurrencyService, _clearFxMemo };
