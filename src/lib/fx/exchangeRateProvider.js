'use strict';
/**
 * ExchangeRateProvider — where exchange rates come from.
 *
 * The Flight Tracker (and any future flight/hotel provider) NEVER knows where FX
 * rates originate. It asks the CurrencyService, which asks ONE ExchangeRateProvider
 * selected from the environment. Adding ECB / exchangerate.host / Open Exchange
 * Rates / Fixer / CurrencyLayer is a new class + one registry line; no other code
 * changes, and rates are never hardcoded into the app or the money layer.
 *
 * A provider returns rates relative to its own `base` currency:
 *   { base:'EUR', rates:{ EUR:1, USD:1.09, THB:39.0, … }, indicative?:bool }
 * The CurrencyService cross-computes any pair from that and caches it (TTL below).
 */

class ExchangeRateProvider {
  /** @returns {string} stable id, e.g. "ecb" */
  get name() { throw new Error('ExchangeRateProvider.name not implemented'); }
  /** Currency the returned `rates` are relative to. */
  get base() { return 'EUR'; }
  /** How long a fetched rate set may be cached before refetching. */
  get ttlMs() { return 12 * 3600 * 1000; }
  /** @returns {Promise<{base:string, rates:Object<string,number>}>} */
  async getRates() { throw new Error('getRates not implemented'); }
}

/**
 * Indicative offline rates (base EUR). This is the ONLY place a static table
 * lives, and it is one provider among many — the documented offline fallback used
 * when no live FX provider is configured or when a live fetch fails. Marked
 * `indicative` so the app can label conversions honestly.
 */
const STATIC_RATES = { EUR: 1, USD: 1.09, THB: 39.0, GBP: 0.85 };

class StaticExchangeRateProvider extends ExchangeRateProvider {
  get name() { return 'static'; }
  get base() { return 'EUR'; }
  get ttlMs() { return 24 * 3600 * 1000; }
  async getRates() { return { base: 'EUR', rates: { ...STATIC_RATES }, indicative: true }; }
}

/** European Central Bank daily reference rates (base EUR, free, no key). */
class EcbExchangeRateProvider extends ExchangeRateProvider {
  get name() { return 'ecb'; }
  get base() { return 'EUR'; }
  async getRates() {
    const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    if (!res.ok) throw new Error(`ECB HTTP ${res.status}`);
    const text = await res.text();
    const rates = { EUR: 1 };
    const re = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
    let m; while ((m = re.exec(text))) rates[m[1]] = Number(m[2]);
    if (Object.keys(rates).length < 2) throw new Error('ECB parse: no rates');
    return { base: 'EUR', rates };
  }
}

/** exchangerate.host latest (base EUR, free, no key). */
class ExchangeHostProvider extends ExchangeRateProvider {
  get name() { return 'exchangerate.host'; }
  get base() { return 'EUR'; }
  async getRates() {
    const res = await fetch('https://api.exchangerate.host/latest?base=EUR');
    if (!res.ok) throw new Error(`exchangerate.host HTTP ${res.status}`);
    const j = await res.json();
    if (!j || !j.rates) throw new Error('exchangerate.host: no rates');
    return { base: j.base || 'EUR', rates: { EUR: 1, ...j.rates } };
  }
}

/** Open Exchange Rates (base USD on the free plan; needs OXR_APP_ID). */
class OpenExchangeRatesProvider extends ExchangeRateProvider {
  constructor(env = {}) { super(); this._id = env.OXR_APP_ID; }
  get name() { return 'openexchangerates'; }
  get base() { return 'USD'; }
  async getRates() {
    if (!this._id) throw new Error('OXR_APP_ID missing');
    const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${this._id}`);
    if (!res.ok) throw new Error(`OXR HTTP ${res.status}`);
    const j = await res.json();
    const base = j.base || 'USD';
    return { base, rates: { [base]: 1, ...j.rates } };
  }
}

/** Fixer (base EUR by default; needs FIXER_API_KEY). */
class FixerProvider extends ExchangeRateProvider {
  constructor(env = {}) { super(); this._k = env.FIXER_API_KEY; }
  get name() { return 'fixer'; }
  async getRates() {
    if (!this._k) throw new Error('FIXER_API_KEY missing');
    const res = await fetch(`https://data.fixer.io/api/latest?access_key=${this._k}`);
    const j = await res.json();
    if (!j || !j.success) throw new Error('fixer error');
    return { base: j.base, rates: { [j.base]: 1, ...j.rates } };
  }
}

/** CurrencyLayer (quotes like USDEUR, base USD; needs CURRENCYLAYER_KEY). */
class CurrencyLayerProvider extends ExchangeRateProvider {
  constructor(env = {}) { super(); this._k = env.CURRENCYLAYER_KEY; }
  get name() { return 'currencylayer'; }
  get base() { return 'USD'; }
  async getRates() {
    if (!this._k) throw new Error('CURRENCYLAYER_KEY missing');
    const res = await fetch(`https://api.currencylayer.com/live?access_key=${this._k}`);
    const j = await res.json();
    if (!j || !j.success) throw new Error('currencylayer error');
    const rates = { USD: 1 };
    Object.entries(j.quotes || {}).forEach(([k, v]) => { rates[k.slice(3)] = Number(v); });
    return { base: 'USD', rates };
  }
}

/**
 * Select the configured FX provider. `FX_PROVIDER` chooses (default "static", the
 * offline fallback). Production sets e.g. FX_PROVIDER=ecb.
 * @param {Record<string,string|undefined>} env
 * @returns {ExchangeRateProvider}
 */
function getExchangeRateProvider(env = {}) {
  switch (String(env.FX_PROVIDER || 'static').toLowerCase()) {
    case 'ecb': return new EcbExchangeRateProvider();
    case 'exchangerate.host': case 'exchangeratehost': case 'exchangehost': return new ExchangeHostProvider();
    case 'openexchangerates': case 'oxr': return new OpenExchangeRatesProvider(env);
    case 'fixer': return new FixerProvider(env);
    case 'currencylayer': return new CurrencyLayerProvider(env);
    case 'static': default: return new StaticExchangeRateProvider();
  }
}

module.exports = {
  ExchangeRateProvider, StaticExchangeRateProvider, EcbExchangeRateProvider,
  ExchangeHostProvider, OpenExchangeRatesProvider, FixerProvider, CurrencyLayerProvider,
  getExchangeRateProvider, STATIC_RATES,
};
