'use strict';
/**
 * Notification delivery seam. The tracker DECIDES when to alert (best < threshold);
 * this layer only TRANSPORTS the alert. Delivery channels are pluggable, exactly
 * like the flight provider — swapping "log" for "email" changes nothing else.
 *
 * Default channel is "log" (writes to the function log) so the pipeline is real
 * and testable end-to-end without wiring an email account. Set NOTIFY_CHANNEL and
 * the matching env to enable a real channel later. This is a delivery seam, not
 * simulated data — the alert itself is computed from real fares.
 *
 * @typedef {{ tripId:string, tripName:string, price:number, currency:string,
 *             threshold:number, combo:{departureDate:string,returnDate:string},
 *             to?:string }} Alert
 */

class Notifier {
  /** @param {Alert} _a @returns {Promise<{delivered:boolean, channel:string, detail?:string}>} */
  async notify(_a) { throw new Error('notify not implemented'); }
}

class LogNotifier extends Notifier {
  async notify(a) {
    // Structured line so it is easy to find / forward from the function logs.
    console.log('[flight-alert]', JSON.stringify({
      tripId: a.tripId, tripName: a.tripName,
      price: a.price, currency: a.currency, threshold: a.threshold,
      combo: a.combo, at: new Date().toISOString(),
    }));
    return { delivered: true, channel: 'log' };
  }
}

/**
 * Email channel seam. Intentionally not wired to a specific ESP yet; enabling it
 * is a config decision (ESP + API key). Until configured it degrades to the log
 * channel rather than failing — no alert is ever silently lost.
 */
class EmailNotifier extends Notifier {
  constructor(env) { super(); this._from = env.NOTIFY_EMAIL_FROM; this._configured = false; }
  async notify(a) {
    if (!this._configured) return new LogNotifier().notify(a);
    // Real ESP send goes here once an email provider is chosen. (seam)
    return { delivered: true, channel: 'email' };
  }
}

/** @param {Record<string,string|undefined>} env */
function getNotifier(env = {}) {
  switch ((env.NOTIFY_CHANNEL || 'log').toLowerCase()) {
    case 'email': return new EmailNotifier(env);
    default: return new LogNotifier();
  }
}

module.exports = { Notifier, LogNotifier, EmailNotifier, getNotifier };
