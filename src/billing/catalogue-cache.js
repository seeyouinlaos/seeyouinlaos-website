/* ============================================================================
   H&S WEDDING 2027 — THE CATALOGUE'S PRICING SOURCE, HELD FOR A MINUTE
   (Owner, 6 Oct 2026 · the Sheets read quota).

   Every guest page asks the server for its amounts (/api/billing/catalogue).
   Reading Google for each of those would exhaust the 60-reads-per-minute quota
   of the service account within a few page views, so the catalogue's pricing
   source is held here for about a minute.

   WHAT IS HELD — AND WHAT NEVER IS. One entry per (spreadsheet, evaluation day)
   holding exactly the Owner's pricing source: 002's structured item metadata and
   the 009 Named Special Rate table, the same object for every caller. Never a
   computed quote, never an identity, a booking, a payment (008) or evidence
   (010): each guest's quotes are computed per request from this shared source,
   so nothing of one guest can reach another. The entry is deep-frozen; a caller
   cannot change what the next one reads.

   WHAT IT IS NOT FOR. Issue & Publish, the guest statement, payments and the
   pre-send validation of a trip read Google fresh (`fresh`), never from here.

   A MOMENT OF QUOTA PRESSURE IS NOT AN OUTAGE. When Google is temporarily
   unavailable (the transport has already retried a 429 with backoff), an entry
   up to STALE_MAX_MS old is served as `stale` instead of failing — display only;
   a data error in the source itself is never hidden behind an old entry.

   The store is the isolate's own memory: nothing is written to KV, a cache or
   a log. It is lost when the isolate goes, which costs one read.
   ========================================================================== */

import { GoogleSheetsUnavailable } from '../google-sheets.js';

export const CATALOGUE_TTL_MS = 60 * 1000;
export const STALE_MAX_MS = 10 * 60 * 1000;
/* at most this many (spreadsheet, day) entries per isolate — a caller-chosen day can never grow memory without bound */
export const MAX_ENTRIES = 16;

const entries = new Map();   /* key -> { at, data } */
const loading = new Map();   /* key -> Promise of a fresh entry */

const clean = (v) => String(v == null ? '' : v).trim();

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** Only the pricing source survives into the entry — anything else is dropped. */
function pricingOnly(src) {
  return deepFreeze({
    items: structuredClone(src && src.items ? src.items : {}),
    specialRates: structuredClone(Array.isArray(src && src.specialRates) ? src.specialRates : []),
  });
}

export const catalogueKey = (spreadsheetId, asOf) => clean(spreadsheetId) + '|' + clean(asOf);

/**
 * The pricing source for one (spreadsheet, day): { items, specialRates, at, cached, stale }.
 *   load()  — reads Google (one batch request) and returns at least { items, specialRates }
 *   fresh   — bypass the held entry (the read refreshes it)
 *   now     — the clock (tests)
 */
export async function pricingSource(key, load, { fresh = false, now = Date.now } = {}) {
  const t = now();
  const held = entries.get(key);
  if (!fresh && held && t - held.at < CATALOGUE_TTL_MS) return { ...held.data, at: held.at, cached: true, stale: false };

  const read = async () => {
    const data = pricingOnly(await load());
    const entry = { at: now(), data };
    entries.delete(key); entries.set(key, entry);
    while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
    return entry;
  };
  /* a fresh read is always its own read — it never joins a load that began before it was asked */
  let p = fresh ? null : loading.get(key);
  if (!p) {
    p = read();
    if (!fresh) {
      loading.set(key, p);
      p.then(() => { if (loading.get(key) === p) loading.delete(key); }, () => { if (loading.get(key) === p) loading.delete(key); });
    }
  }
  try {
    const entry = await p;
    return { ...entry.data, at: entry.at, cached: false, stale: false };
  } catch (e) {
    /* transient unavailability only — and never for a fresh read */
    const last = entries.get(key);
    if (!fresh && e instanceof GoogleSheetsUnavailable && last && now() - last.at <= STALE_MAX_MS) {
      return { ...last.data, at: last.at, cached: true, stale: true };
    }
    throw e;
  }
}

/** Tests only: forget everything held. */
export function clearCatalogueCache() { entries.clear(); loading.clear(); }
