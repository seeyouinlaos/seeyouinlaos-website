/* ============================================================================
   WHAT A NEW STATEMENT FREEZES BESIDE ITS SNAPSHOT (Owners, 19 Nov 2026 · HS-004.6/.8/.9/.16) — one module for the issue (src/billing-
   routes.js) and for the local previews, so a preview the Owners approve is exactly what the issue produces.
     · the product words: the website's own names (src/billing/product-words.js) by the product's Site_Product_Key (002);
     · the ways to pay: a German guest on the EUR route gets the SEPA bank transfer first and PayPal as the alternative; everyone else the
       method frozen with the statement; a method locked by a verified payment stays alone;
     · each way to pay as the PDF prints it: the amount in its currency at the statement's frozen rate, the payee, the account or code;
     · the correction note: the version replaced, its issue date, what changed — in words, never a product key.
   Nothing here makes up a figure: every amount is the snapshot's, every account the configured one.
   ========================================================================== */
import { PRODUCT_WORDS } from './product-words.js';
import { inPreferredCurrency } from './settlement.js';

const clean = (v) => String(v == null ? '' : v).trim();

/** The 006 nationality says German (and not Thai): the payment options' only extra input. Mixed or unrecognised → not German. */
export function isGermanNationality(value) {
  const parts = clean(value).split(/[,/;&+]| and /i).map((x) => x.trim()).filter(Boolean);
  return parts.some((x) => /^(german|germany|deutsch|deutsche|deutscher|deutschland)$/i.test(x)) && !parts.some((x) => /thai/i.test(x));
}

/** The product words of every item on the lines; an item without a name is listed (it blocks the issue). */
export function wordsForIssue(lines, items) {
  const words = {}, missing = [];
  for (const l of lines || []) {
    const id = clean(l && l.Item_ID);
    if (!id || words[id] || missing.includes(id)) continue;
    const keys = clean((items && items[id] || {}).Site_Product_Key).split(/[,|]/).map(clean).filter(Boolean);
    const w = keys.map((k) => PRODUCT_WORDS[k]).find(Boolean);
    if (w) words[id] = { name: w.name, detail: w.detail }; else missing.push(id);
  }
  return { words, missing };
}

/** The ways to pay a statement offers, in order. */
export function paymentOptionsFor({ channel, german, locked }) {
  const ch = clean(channel);
  if (!ch) return [];
  if (locked) return [ch];
  if (german && /_EUR$/.test(ch)) return ['SEPA_EUR', 'PAYPAL_EUR'];
  return [ch];
}

/** One way to pay as the 1.3 PDF prints it. `dest` is destinationOf(method, env); `qr` the approved code (or null). */
export function optionView(method, totalCents, fx, dest, qr) {
  const amount = inPreferredCurrency(totalCents, method, fx);
  const rate = method === 'PROMPTPAY_THB' ? '1 USD = ' + fx.FX_USD_THB + ' THB' : /_EUR$/.test(method) ? '1 USD = ' + fx.FX_USD_EUR + ' EUR' : '';
  return { method, amount: amount ? { ...amount, rate } : null, recipient: (dest && dest.recipient) || null, iban: method === 'SEPA_EUR' ? (dest && dest.iban) || null : null, qr: qr || null };
}

/** The correction note of a new version of an issued statement: the version replaced, its issue date, what changed. */
export function correctionOf(issued, proposal, words, opts) {
  if (!issued || !issued.Revision) return null;
  const o = opts || {};
  const usd = (c) => 'USD ' + (Number(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const changes = [];
  /* a version of the earlier layout carried no names: that is what this correction adds */
  if (o.legacy !== false) changes.push('recipient and product names added');
  if (proposal && Number.isFinite(Number(proposal.Total_Payable_Cents)) && Number.isFinite(Number(issued.Total_Payable_Cents)) &&
    Number(proposal.Total_Payable_Cents) !== Number(issued.Total_Payable_Cents)) changes.push('amount changed from ' + usd(issued.Total_Payable_Cents) + ' to ' + usd(proposal.Total_Payable_Cents));
  const wasB = new Set((issued.lines || []).filter((l) => l.block === 'B').map((l) => clean(l.Item_ID)));
  for (const l of (proposal && proposal.lines) || []) {
    if (l.block === 'B' && !wasB.has(clean(l.Item_ID)) && (issued.lines || []).some((x) => clean(x.Item_ID) === clean(l.Item_ID))) {
      const w = words && words[clean(l.Item_ID)];
      changes.push((w ? w.name.split(' · ')[0] : 'a stay') + ' now under Your own arrangements');
    }
  }
  const sig = (x) => ((x && x.lines) || []).map((l) => [clean(l.Person_ID), clean(l.Item_ID), l.block, l.amountCents].join('|')).sort().join(';');
  if (changes.length === (o.legacy !== false ? 1 : 0) && sig(issued) !== sig(proposal)) changes.push('booked items updated');
  if (!changes.length) changes.push('statement updated');
  return { replaces: 'V' + issued.Revision, replacesIssued: clean(issued.Issue_Date) || null, reason: [...new Set(changes)].join('; ') };
}
