/**
 * Cloudflare Worker — See You In Laos wedding website.
 *
 * Static site only: every request is served from the ASSETS binding. The
 * Flight Tracker backend (Travel Service, provider adapters, KV price
 * tracking, Duffel integration) has been removed; this Worker exists purely
 * so the site can be deployed with `wrangler deploy` behind the same domain.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
