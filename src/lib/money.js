'use strict';
/**
 * Money constants — provider-independent.
 *
 * Exchange RATES do not live here anymore. They come through the
 * ExchangeRateProvider abstraction (src/lib/fx/*) via the CurrencyService, so the
 * app never hardcodes rates and never knows where they originate. This module is
 * just the small set of currency facts the UI and services agree on.
 */

const SUPPORTED = ['USD', 'EUR', 'THB'];
const DEFAULT_CURRENCY = 'USD';

function isSupported(c) { return SUPPORTED.includes(String(c || '').toUpperCase()); }

module.exports = { SUPPORTED, DEFAULT_CURRENCY, isSupported };
