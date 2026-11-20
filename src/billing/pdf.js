/* ============================================================================
   H&S WEDDING 2027 — THE IMMUTABLE GUEST SETTLEMENT PDF
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · S, R, I).

   This module turns ONE issued Settlement Snapshot (src/billing/settlement.js ·
   buildSnapshot) into the document the guest receives. It is the last station
   of the chain and the dumbest one on purpose: it reads the Snapshot and sets
   type. It does not add, multiply, round or convert, because there is exactly
   one calculation path and it is src/billing/engine.js (Freeze · U, V). Every
   figure printed here was already decided upstream and frozen.

   WHY THE BYTES ARE WRITTEN BY HAND. A Revision is immutable (Freeze · I), so
   the document has to be re-derivable: feed the stored Snapshot back in years
   later and the same bytes must come out, otherwise "compare the archived PDF
   with the recomputed one" is not a check at all. A library would bring its
   own version, its own timestamp and its own compression table into the file.
   So this writer is deterministic by construction:
     · no clock — the only date in the file is the Snapshot's own Issue_Date
     · no network, no storage, no randomness, no dependency
     · no compression (a deflate table is an implementation detail that moves)
     · no embedded fonts — the base-14 Helvetica, Helvetica-Bold and Courier
       are resolved by the reader, so no font binary enters the file. The AFM
       widths below are therefore part of the contract, not a convenience.
     · the trailer /ID is a hash of the document body, not an identifier drawn
       from anywhere outside it

   WHAT THE DOCUMENT MAY AND MAY NOT SAY (Freeze · S):
     · it is a "Guest Settlement". It is never a "tax invoice" and never a
       "Rechnung". No such word is produced anywhere in this file.
     · BLOCK A is "Payable to Haruthai & Suthep" and carries the total.
     · BLOCK B is "Your own arrangements": informational, and never added to
       the total. Block B has no amount column at all, which is the structural
       way of saying it rather than a sentence that can be misread.
     · the payment wording is "settled within 21 days after your statement is
       issued". The old "charged within 14 days after booking" is retired and
       is not in this file.
     · a null total is printed as "Manual review required". A missing figure is
       never filled in with a plausible one (Freeze · AC).

   WHAT THE READER HAS TO SUPPLY. The Snapshot carries identifiers, not names
   (Freeze · B), so `opts.persons` and `opts.items` provide the labels. They
   have to be written in Latin script: WinAnsi is a single-byte encoding and a
   base-14 font has no Thai glyphs, so a Thai name would be set as a row of
   question marks. A character this document cannot set is shown as missing
   rather than quietly dropped, which is the honest failure for a name.

   The guest-facing hosted VALUE stays out of the document on purpose: the
   Snapshot carries Hosted_Value_Cents for the Revenue Overview (Freeze · U),
   and putting a price tag on a gift is not what a hosted line is for. Hosted
   rows appear, marked as hosted and carrying their own zero.

   THE LINES (layout 1.1, Owner, 7 Oct 2026). A rule marks structure, never a
   table row: one under the masthead, one under each section heading, one above
   the total payable, one over the footer (and one under the "continued" line
   of a further page). Rows are separated by white space on a fixed baseline
   grid, so no rule can sit in a line of text — 1.0 drew a hairline 4pt over
   the next row's baseline, through its capitals, and a second one 8pt over the
   total's rule. Every label, key and agreed-rate note wraps in full inside its
   column (a product key breaks after a hyphen) instead of being cut short.
   Layout only: not one figure, word or line selection changed. A PDF already
   stored for an issued Revision is never rendered again (billing-routes.js ·
   issuedPdf reads the write-once object), so it keeps the bytes it was issued
   with; its /Producer names the writer version that made it.

   LAYOUT 1.2 (Owners, 18 Nov 2026). (1) THE UNIT OF A LINE IS ITS OWN: nights
   only where the rate is per night (accommodation, an extra bed or additional
   person priced per night); every other line — a temple offering, a train
   seat, a one-time service — shows its quantity, never "night". (2) HOW TO PAY:
   the payment section the guest's statement page shows — method, the amount in
   the payment currency at this statement's frozen rate, the due date, the
   payee, the bank account or the approved payment code (QR), the reference —
   printed VERBATIM from what the caller read from the authoritative payment
   source (src/billing-routes.js · paymentForPdf); this module still writes no
   payment detail of its own. A PDF already produced keeps its bytes.

   LAYOUT 1.3 (Owners, 19 Nov 2026 — the wedding's own branding). The first page opens on the approved "see you in laos." logo with its
   red final period: the original image itself (src/billing/pdf-brand.js, built from assets/brand/see-you-in-laos-email.png — never
   redrawn, recoloured or set in another typeface; the base-14 fonts cannot set its own), laid on a band of its own paper colour across
   the top of the page, with the couple's names and the wedding beside it. Below the band the statement is exactly 1.2's: not one
   figure, word, payment detail, code or bank datum changes; further pages keep their "continued" line. A PDF already produced keeps its
   bytes (its /Producer names its writer).
   ========================================================================== */

import {
  BILLING_CATEGORY, MODIFIER, RATE_BASIS, ACCOUNTING_CURRENCY, formatUSD,
} from './model.js';
import { BRAND_LOGO, BRAND_PAPER_RGB } from './pdf-brand.js';

const clean = (v) => String(v == null ? '' : v).trim();

/* ------------------------------------------------------------------- paper */

export const PAGE_SIZES = Object.freeze({
  A4: Object.freeze({ w: 595.28, h: 841.89 }),
  LETTER: Object.freeze({ w: 612, h: 792 }),
});

const MARGIN = 56;          /* the type area, ~2cm on A4 */
const CONTENT_BOTTOM = 96;  /* nothing but the footer lives below this line */
const INK = 0;              /* black */
const SOFT = 0.42;          /* the grey of labels and notes */
const HAIR = 0.78;          /* the grey of the footer and "continued" rules */
const LEAD = 10.5;          /* the baseline grid inside a table row */
const ROW_PITCH = 19.5;     /* a row's last baseline to the next row's first: white space, not a rule, parts the rows */
const ROW_LINES_MAX = 24;   /* a cell wraps in full; this bound only keeps one row shorter than a page */

const REG = 'F1', BOLD = 'F2', MONO = 'F3';

/* ------------------------------------------------------- base-14 metrics */
/* Adobe's AFM widths for Helvetica and Helvetica-Bold, codes 32..126, in
 * 1/1000 em. They are here because the writer has to wrap and right-align
 * text itself: with no embedded font there is nothing else to ask. Courier is
 * fixed at 600, which is why the figures are set in it. */

const W_REG = ('278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 ' +
  '556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 ' +
  '556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 ' +
  '500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 ' +
  '500 334 260 334 584').split(' ').map(Number);

const W_BOLD = ('278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 ' +
  '556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 ' +
  '611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 ' +
  '556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 ' +
  '500 389 280 389 584').split(' ').map(Number);

/* Latin-1 0xC0..0xFF reduced to the base letter, which in Helvetica carries
 * the same width as its accented form. Anything else above 126 is measured
 * generously, so an exotic character can crowd a cell but never leave the box. */
const LATIN1_BASE = 'AAAAAAACEEEEIIIIDNOOOOOxOUUUUYPsaaaaaaaceeeeiiiidnoooooxouuuuypy';
const WIDE_FALLBACK = 600;

/* ---------------------------------------------------------- text encoding */

/* WinAnsi is a single-byte encoding, so the typographic characters we write in
 * the source are folded to their plain equivalents first. The middle dot of
 * "HS-2027-0042 · Revision V1" survives because it is a Latin-1 character. */
const TRANSLIT = Object.freeze({
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-',
  '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u2032': "'", '\u2033': '"',
  '\u2026': '...', '\u2022': '\u00b7', '\u00a0': ' ', '\u00ad': '',
  '\u20ac': 'EUR', '\u00a3': 'GBP', '\u0e3f': 'THB', '\u2122': 'TM', '\u2192': 'to',
  '\t': ' ', '\r': ' ', '\n': ' ',
});

/** Fold any input to the single-byte range the base-14 fonts can actually set. */
function toLatin1(value) {
  const s = String(value == null ? '' : value);
  let out = '';
  for (const ch of s) {
    const t = TRANSLIT[ch];
    if (t !== undefined) { out += t; continue; }
    const c = ch.codePointAt(0);
    if ((c >= 32 && c <= 126) || (c >= 0xa1 && c <= 0xff)) out += ch;
    else out += '?';   /* a character this document cannot set is shown as missing, never dropped silently */
  }
  return out;
}

/** PDF string syntax. Everything outside printable ASCII becomes an octal escape,
 *  so the finished file is 7-bit clean and cannot be broken by a stray byte. */
/** Whether every character of a text can be set by this writer (base-14 fonts, WinAnsi) — the issue gate refuses a name that would
 *  print a "?" (HS-004.6). */
export function isPrintable(value) {
  const s = String(value == null ? '' : value);
  for (const ch of s) {
    if (TRANSLIT[ch] !== undefined) continue;
    const c = ch.codePointAt(0);
    if (!((c >= 32 && c <= 126) || (c >= 0xa1 && c <= 0xff))) return false;
  }
  return true;
}
function pdfText(value) {
  const s = toLatin1(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x28 || c === 0x29 || c === 0x5c) out += '\\' + s[i];
    else if (c < 32 || c > 126) out += '\\' + c.toString(8).padStart(3, '0');
    else out += s[i];
  }
  return '(' + out + ')';
}

function charWidth(code, bold) {
  if (code >= 32 && code <= 126) return (bold ? W_BOLD : W_REG)[code - 32];
  if (code === 0xb7) return 278;
  if (code >= 0xc0 && code <= 0xff) {
    const base = LATIN1_BASE.charCodeAt(code - 0xc0);
    return (bold ? W_BOLD : W_REG)[base - 32];
  }
  return WIDE_FALLBACK;
}

/** Width in points of a string set in one of the three fonts. */
function textWidth(value, font, size) {
  const s = toLatin1(value);
  if (font === MONO) return s.length * 600 * size / 1000;
  const bold = font === BOLD;
  let w = 0;
  for (let i = 0; i < s.length; i++) w += charWidth(s.charCodeAt(i), bold);
  return w * size / 1000;
}

function ellipsise(value, font, size, maxWidth) {
  let s = toLatin1(value);
  while (s.length && textWidth(s + '...', font, size) > maxWidth) s = s.slice(0, -1);
  return s + '...';
}

/** One line, cut to the column if it has to be. */
function fitText(value, font, size, maxWidth) {
  const s = toLatin1(value);
  if (!s) return '';
  return textWidth(s, font, size) <= maxWidth ? s : ellipsise(s, font, size, maxWidth);
}

/** Where a word too long for the column is broken: after its last hyphen
 *  (slash, underscore) that still fits, so a product key breaks between its
 *  parts ("D1-SOUPHATTRA-" / "PRESIDENTIAL"); a word with no such place, or
 *  only one near its start, is broken at the last letter that fits. */
function breakPoint(word, font, size, maxWidth) {
  let cut = word.length;
  while (cut > 1 && textWidth(word.slice(0, cut), font, size) > maxWidth) cut--;
  for (let i = cut; i >= Math.max(2, cut / 3); i--) if ('-/_'.includes(word[i - 1])) return i;
  return cut;
}

/** Word wrap inside a column. A word too long for the column is broken over
 *  lines rather than allowed to run past the page box. */
function wrapText(value, font, size, maxWidth, maxLines) {
  const out = [];
  let cur = '';
  /* "Haruthai & Suthep" never breaks across lines (the Owners' rule, everywhere) — one token for the wrap */
  for (const word of toLatin1(value).replace(/Haruthai & Suthep/g, 'Haruthai\x01&\x01Suthep').split(/\s+/).filter(Boolean).map((w) => w.replace(/\x01/g, ' '))) {
    if (cur && textWidth(cur + ' ' + word, font, size) <= maxWidth) { cur += ' ' + word; continue; }
    if (cur) { out.push(cur); cur = ''; }
    let rest = word;
    while (textWidth(rest, font, size) > maxWidth && rest.length > 1) {
      const cut = breakPoint(rest, font, size, maxWidth);
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    cur = rest;
  }
  if (cur) out.push(cur);
  if (maxLines && out.length > maxLines) {
    const kept = out.slice(0, maxLines);
    kept[maxLines - 1] = ellipsise(kept[maxLines - 1], font, size, maxWidth);
    return kept;
  }
  return out;
}

/* ------------------------------------------------- the drawing primitives */
/* A page is an array of content-stream operators. Numbers are printed with at
 * most two decimals so that the same layout always serialises to the same
 * bytes and no floating-point tail can leak into the file. */

function num(v) {
  const n = Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;
  return String(n === 0 ? 0 : n);
}

function put(doc, op) { doc.ops.push(op); }

function drawText(doc, x, y, value, font, size, grey) {
  const s = toLatin1(value);
  if (!s) return;
  const g = Number.isFinite(grey) ? grey : INK;
  if (g !== INK) put(doc, num(g) + ' g');
  put(doc, 'BT /' + font + ' ' + num(size) + ' Tf 1 0 0 1 ' + num(x) + ' ' + num(y) + ' Tm ' + pdfText(s) + ' Tj ET');
  if (g !== INK) put(doc, '0 g');
}

function drawRight(doc, xRight, y, value, font, size, grey) {
  drawText(doc, xRight - textWidth(value, font, size), y, value, font, size, grey);
}

/** an image XObject on the current page: registered once per document, named on the pages that show it */
function placeImage(doc, img, x, y, w, h) {
  doc.images = doc.images || [];
  if (!doc.images.includes(img)) doc.images.push(img);
  const name = 'Im' + (doc.images.indexOf(img) + 1);
  (doc.pageImages = doc.pageImages || new Map()).set(doc.ops, (doc.pageImages.get(doc.ops) || new Set()).add(name));
  put(doc, 'q ' + num(w) + ' 0 0 ' + num(h) + ' ' + num(x) + ' ' + num(y) + ' cm /' + name + ' Do Q');
}

function drawRule(doc, y, x1, x2, weight, grey) {
  put(doc, num(Number.isFinite(grey) ? grey : INK) + ' G ' + num(weight) + ' w ' +
    num(x1) + ' ' + num(y) + ' m ' + num(x2) + ' ' + num(y) + ' l S');
}

function drawBox(doc, x, y, w, h, grey) {
  put(doc, num(grey) + ' g ' + num(x) + ' ' + num(y) + ' ' + num(w) + ' ' + num(h) + ' re f 0 g');
}

/** A wrapped paragraph that breaks over a page rather than over the footer.
 *  Used for prose only; a table row measures itself first (see `ensure`). */
function drawParagraph(doc, x, value, width, font, size, leading, grey) {
  for (const line of wrapText(value, font, size, width)) {
    ensure(doc, leading);
    drawText(doc, x, doc.y, line, font, size, grey);
    doc.y -= leading;
  }
}

/* ------------------------------------------------------ pages and columns */

function columnsOf(page) {
  const left = MARGIN;
  const right = page.w - MARGIN;
  const w = right - left;
  return {
    left, right, width: w,
    /* the item column is the widest: it carries the product key and the agreed-rate note */
    person: left, wPerson: w * 0.19,
    item: left + w * 0.20, wItem: w * 0.315,
    basis: left + w * 0.525, wBasis: w * 0.20,
    units: left + w * 0.735, wUnits: w * 0.14,
    amountRight: right,
    /* Block B has no amount column, so its note runs to the right margin */
    wNote: right - (left + w * 0.525),
  };
}

function startPage(doc) {
  doc.ops = [];
  doc.pages.push(doc.ops);
  doc.y = doc.page.h - MARGIN;
  if (doc.pages.length > 1) {
    /* the continuation line sits on the same optical top as the masthead */
    doc.y -= 10;
    drawText(doc, doc.col.left, doc.y, doc.meta.documentLine + ' (continued)', REG, 8, SOFT);
    doc.y -= 6;
    drawRule(doc, doc.y, doc.col.left, doc.col.right, 0.5, HAIR);
    doc.y -= 20;
  }
  return doc;
}

/** Make room for the next `height` points, breaking the page if needed.
 *  `repeat` redraws whatever has to appear again at the top of a new page,
 *  which for a table is its column heading. */
function ensure(doc, height, repeat) {
  if (doc.y - height >= CONTENT_BOTTOM) return false;
  startPage(doc);
  if (typeof repeat === 'function') repeat(doc);
  return true;
}

/* ------------------------------------------------------------ the wording */
/* Copy, not data. Every number on the page comes from the Snapshot; these are
 * the only sentences this module owns, and the payment term is the frozen one
 * from Freeze · S. */

const TITLE = 'Guest Settlement';
const BLOCK_A_HEADING = 'Payable to Haruthai & Suthep';
const BLOCK_B_HEADING = 'Your own arrangements';
const TERMS_21_DAYS =
  'Please arrange your transfer so that this settlement is settled within 21 days after your statement is issued.';
const BLOCK_B_INTRO =
  'Shown for your information only. You arrange and pay for these yourself, and they are never added to the ' +
  'amount payable to Haruthai & Suthep above.';
const REVIEW_HEADING = 'Manual review required';
const REVIEW_BODY =
  'At least one amount on this statement could not be derived from the structured source, so no total is stated. ' +
  'Nothing is payable from this statement until a corrected statement has been issued to you.';
const FX_HEADING = 'Exchange rates frozen with this statement';
const FX_BODY =
  'These rates were frozen when this statement was issued and do not move afterwards. The settlement itself is ' +
  'kept in ' + ACCOUNTING_CURRENCY + '.';
const OVERRIDE_NOTE = 'This due date was set by hand and replaces the standard schedule.';
const SPECIAL_RATE_NOTE = 'your agreed rate';

const BASIS_LABEL = Object.freeze({
  [RATE_BASIS.PER_PERSON_PER_NIGHT]: 'per person per night',
  [RATE_BASIS.PER_PERSON]: 'per person',
  [RATE_BASIS.PER_ROOM]: 'per room',
  [RATE_BASIS.PER_HOLDER]: 'per party',
  [RATE_BASIS.FLAT]: 'flat charge',
});

const CATEGORY_NOTE = Object.freeze({
  [BILLING_CATEGORY.HOSTED_NO_GUEST_CHARGE]: 'hosted, no charge',
  [BILLING_CATEGORY.GUEST_SELF_PAYMENT]: 'you pay this yourself on site',
  [BILLING_CATEGORY.GUEST_SELF_BOOKING]: 'you book and pay this yourself',
});

/* ------------------------------------------------------------ line reading */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** 2026-11-30 → "30 November 2026" (the Snapshot's own date string, never a clock) */
function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(iso));
  return m ? Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1] : clean(iso);
}
/* LAYOUT 1.3 · the person on a line: the full name frozen at issue, the guest id under it (HS-004.6); a person the record does not
   name keeps the id alone */
function personCell(c, line, o) {
  const id = clean(line.Person_ID);
  const name = o.persons && Object.prototype.hasOwnProperty.call(o.persons, id) ? clean(o.persons[id]) : '';
  if (!name) return { name: wrapText(id || 'not stated', REG, 8.5, c.wPerson - 6, ROW_LINES_MAX), id: [] };
  return { name: wrapText(name, REG, 8.5, c.wPerson - 6, ROW_LINES_MAX), id: id ? wrapText(id, REG, 7, c.wPerson - 6, 2) : [] };
}
/* LAYOUT 1.3 · the product as the guest knows it (HS-004.9): its name and its detail (stay and dates) frozen at issue — never the
   technical key; a product the record does not name says so */
function itemCell(c, itemId, o, width) {
  const w = o.items && Object.prototype.hasOwnProperty.call(o.items, clean(itemId)) ? o.items[clean(itemId)] : null;
  const name = w && clean(w.name) ? clean(w.name) : (o.items ? 'Item ' + clean(itemId) : clean(itemId) || 'not stated');
  return { name: wrapText(name, REG, 8.5, width, ROW_LINES_MAX), detail: w && clean(w.detail) ? wrapText(clean(w.detail), REG, 7.5, width, ROW_LINES_MAX) : [] };
}
/* LAYOUT 1.3 · "1 of 2 nights" (HS-004.12): the wedding stay booked for two nights with the second night hosted — said in the
   website's own approved words, only where exactly that is the case */
const SECOND_NIGHT_WORDS = 'first night your cost \u00b7 second night complimentary, hosted by Haruthai & Suthep';
function secondNightHosted(line) {
  return clean(line.block) === 'A' && clean(line.Rate_Basis) === RATE_BASIS.PER_PERSON_PER_NIGHT && hasModifier(line, MODIFIER.SECOND_NIGHT_COMPLIMENTARY) &&
    Number(line.nights) === 2 && Number(line.payableNights) === 1;
}

function labelFor(map, id, fallback) {
  const key = clean(id);
  const name = map && Object.prototype.hasOwnProperty.call(map, key) ? clean(map[key]) : '';
  return name || key || fallback;
}

/** The line's own unit (layout 1.2): what the engine multiplied by — nights where the charge is per night (a nightly basis, or a
 *  named rate that carries payable nights), otherwise the quantity exactly as the line holds it; never "night" for a temple
 *  offering, a train seat or a one-time service. */
const PER_NIGHT = /PER_NIGHT$/;
function unitsOf(line) {
  const basis = clean(line.Rate_Basis);
  if (!PER_NIGHT.test(basis)) {
    /* a line without a basis or an amount (a review line) shows no figure; never an invented one */
    if (!basis || line.amountCents == null) return '';
    const q = line.quantity != null && Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : null;
    /* a named (009) rate on a product that is not per night is charged rate × payable nights × quantity (engine) — the figure is
       that multiplier, the word is never "night" (Owners: a temple offering is a quantity, never nights) */
    const pn = line.payableNights != null && Number.isFinite(Number(line.payableNights)) ? Number(line.payableNights) : null;
    if (clean(line.rateSource) === 'SPECIAL_RATE' && pn != null) return String(Math.round(pn * (q == null ? 1 : q) * 1000) / 1000);
    return q == null ? '' : String(q);
  }
  const bits = [];
  const payable = Number(line.payableNights);
  const nights = Number(line.nights);
  const hasPayable = line.payableNights != null && Number.isFinite(payable);
  const hasNights = line.nights != null && Number.isFinite(nights);

  if (hasPayable && hasNights && payable !== nights) bits.push(payable + ' of ' + nights + ' nights');
  else if (hasPayable) bits.push(payable + (payable === 1 ? ' night' : ' nights'));
  else if (hasNights) bits.push(nights + (nights === 1 ? ' night' : ' nights'));

  const q = Number(line.quantity);
  if (Number.isFinite(q) && q > 1) bits.push('x ' + q);
  return bits.join(' ');
}

function basisOf(line) {
  const category = clean(line.Billing_Category);
  if (CATEGORY_NOTE[category]) return CATEGORY_NOTE[category];
  const basis = BASIS_LABEL[clean(line.Rate_Basis)] || clean(line.Rate_Basis);
  if (basis) return basis;
  /* a line the engine refused carries no category and no basis: say that
   * rather than leave an empty cell the guest has to interpret */
  return line.amountCents == null || !Number.isFinite(line.amountCents) ? 'not yet determined' : '';
}

/** The rate as frozen on the line, printed, never recalculated. */
function rateOf(line) {
  if (line.rateCents == null || !Number.isFinite(line.rateCents)) return '';
  const money = formatUSD(line.rateCents);
  return money ? 'at ' + money : '';
}

function amountOf(line) {
  if (line.amountCents == null || !Number.isFinite(line.amountCents)) return null;
  return formatUSD(line.amountCents);
}

function hasModifier(line, modifier) {
  return Array.isArray(line.modifiers) && line.modifiers.map(clean).includes(modifier);
}

/**
 * Which Snapshot lines the guest sees.
 *   Block A — everything the engine put in block A, plus any line whose amount
 *             the engine refused to decide. A refused line is NOT silently
 *             dropped: the guest sees the item and the review marker.
 *   Block B — the engine's block B.
 * A zero line that only exists for bookkeeping (excluded, superseded,
 * cancelled free of charge, not selected) carries no information for the guest
 * and is left out, as is anything carrying EXCLUDE_FROM_DISPLAY while it is
 * worth nothing.
 */
function visibleLines(snapshot) {
  const lines = Array.isArray(snapshot.lines) ? snapshot.lines : [];
  const blockA = [], blockB = [];
  for (const line of lines) {
    const amount = line.amountCents;
    const unresolved = amount == null || !Number.isFinite(amount);
    if (hasModifier(line, MODIFIER.EXCLUDE_FROM_DISPLAY) && !unresolved && amount === 0) continue;
    if (line.block === 'A' || (line.block == null && unresolved)) blockA.push(line);
    else if (line.block === 'B') blockB.push(line);
  }
  return { blockA, blockB };
}

/* ------------------------------------------------------- the brand band */
/* LAYOUT 1.3: the first page only. The band runs edge to edge in the logo's own paper colour (its background pixel), so the approved
 * image sits on it as it is; the couple's names never break. Under the band image lies a plain fill of the same colour (written to four
 * decimals, which meets the 8-bit pixel exactly), so a viewer that softens the edge of a scaled one-pixel image shows no seam either. */
const BAND_H = 92, LOGO_H = 31;
const COUPLE_LINE = 'Haruthai & Suthep';
const WEDDING_LINE = 'Wedding \u00b7 Vientiane \u00b7 28 February 2027';
const BAND_GREY = 0.35;     /* a touch darker than SOFT: the wedding line stays legible on the paper colour */
/* the band itself is an image of one pixel of the logo's paper — the same rendering path as the logo, so no printer or viewer draws a
   seam between a vector fill and the image laid on it */
const BAND_PIXEL = Object.freeze({ width: 1, height: 1, colorSpace: 'DeviceRGB', filter: 'RunLengthDecode', data: new Uint8Array([2, ...BRAND_PAPER_RGB, 128]) });
function brandBand(doc) {
  const { w, h } = doc.page, c = doc.col;
  put(doc, 'q ' + BRAND_PAPER_RGB.map((v) => (v / 255).toFixed(4)).join(' ') + ' rg 0 ' + num(h - BAND_H) + ' ' + num(w) + ' ' + num(BAND_H) + ' re f Q');
  placeImage(doc, BAND_PIXEL, 0, h - BAND_H, w, BAND_H);
  const logoW = LOGO_H * BRAND_LOGO.width / BRAND_LOGO.height;
  const mid = h - BAND_H / 2;
  placeImage(doc, BRAND_LOGO, c.left, mid - LOGO_H / 2, logoW, LOGO_H);
  drawRight(doc, c.right, mid + 2, COUPLE_LINE, BOLD, 10.5);
  drawRight(doc, c.right, mid - 11, WEDDING_LINE, REG, 8, BAND_GREY);
  doc.y = h - BAND_H - 18;
}

/* ------------------------------------------------------------- the masthead */

function masthead(doc, snapshot, o) {
  const c = doc.col, opts = o || {};
  doc.y -= 16;
  drawText(doc, c.left, doc.y, TITLE, BOLD, 21);
  doc.y -= 15;
  drawText(doc, c.left, doc.y, doc.meta.idLine, REG, 9.5, SOFT);
  /* a corrected version names the version it replaces and its own date (HS-004.8) */
  /* a preview the Owners open before they issue (HS-PROMPT-032): said on the page itself */
  if (opts.preview) { doc.y -= 12; drawText(doc, c.left, doc.y, 'PREVIEW \u00b7 not issued \u00b7 the statement is issued by Haruthai & Suthep', BOLD, 8.5, SOFT); }
  const k = opts.correction && typeof opts.correction === 'object' ? opts.correction : null;
  if (k && clean(k.replaces)) {
    for (const t of wrapText('Corrected version · replaces ' + clean(k.replaces) + (clean(k.replacesIssued) ? ' issued ' + longDate(k.replacesIssued) : '') +
      (clean(k.reason) ? ' · ' + clean(k.reason) : ''), REG, 8.5, c.width, 3)) { doc.y -= 12; drawText(doc, c.left, doc.y, t, REG, 8.5, SOFT); }
  }
  doc.y -= 11;
  drawRule(doc, doc.y, c.left, c.right, 0.8, INK);
  doc.y -= 22;

  /* THE RECIPIENT AND THE HOSTS (HS-004.6): two blocks, clearly apart — the guest the statement is for, by full name, and
     Haruthai & Suthep, who host the wedding and receive the payment */
  const r = opts.recipient && typeof opts.recipient === 'object' ? opts.recipient : null;
  const split = c.left + c.width * 0.62;
  const top = doc.y;
  let yl = top, yr = top;
  drawText(doc, c.left, yl, 'STATEMENT FOR', REG, 7, SOFT); yl -= 15;
  /* the full name, never shortened: a long one takes a second line */
  for (const t of wrapText(r && clean(r.name) ? clean(r.name) : 'not stated', BOLD, 12.5, split - c.left - 12)) { drawText(doc, c.left, yl, t, BOLD, 12.5); yl -= 14; }
  yl += 2;
  if (r && clean(r.Person_ID)) { drawText(doc, c.left, yl, 'Guest ID ' + clean(r.Person_ID), REG, 7.5, SOFT); yl -= 11; }
  const others = Object.entries(opts.persons || {}).filter(([pid]) => !r || pid !== clean(r.Person_ID)).map(([pid, n]) => clean(n) + ' (' + pid + ')');
  if (others.length) for (const t of wrapText('Also on this statement: ' + others.join(', '), REG, 7.5, split - c.left - 12)) { drawText(doc, c.left, yl, t, REG, 7.5, SOFT); yl -= 10; }
  drawText(doc, split, yr, 'FROM', REG, 7, SOFT); yr -= 15;
  drawText(doc, split, yr, 'Haruthai & Suthep', BOLD, 10.5); yr -= 12;
  drawText(doc, split, yr, 'Hosts of the wedding · payee', REG, 7.5, SOFT); yr -= 11;
  doc.y = Math.min(yl, yr) - 14;

  /* Issue_Date and Due_Date are Snapshot fields (Freeze · P decided the due date before this file ever sees it) */
  const cells = [
    ['Issued', clean(snapshot.Issue_Date) ? longDate(snapshot.Issue_Date) : 'not stated'],
    ['Due', clean(snapshot.Due_Date) ? longDate(snapshot.Due_Date) : 'not stated'],
    ['Currency', clean(snapshot.Currency) || ACCOUNTING_CURRENCY],
  ];
  const step = c.width / 3;
  cells.forEach(([label, value], i) => {
    const x = c.left + i * step;
    drawText(doc, x, doc.y, label.toUpperCase(), REG, 7, SOFT);
    drawText(doc, x, doc.y - 13, fitText(value, REG, 11, step - 10), REG, 11);
  });
  doc.y -= 13 + 20;

  /* THE DUE DATE IN WORDS (HS-004.11): the date this statement is due — never a fixed number of days that the date contradicts */
  const total = Number(snapshot.Total_Payable_Cents);
  if (Number.isFinite(total)) {
    const words = total > 0 && clean(snapshot.Due_Date) ? 'Please settle this statement by the due date above (' + longDate(snapshot.Due_Date) + ').'
      : total <= 0 ? 'Nothing is payable on this statement.' : '';
    if (words) drawParagraph(doc, c.left, words, c.width, REG, 8.8, 11, INK);
  }
  if (clean(snapshot.Due_Date_Override) && !k) drawParagraph(doc, c.left, OVERRIDE_NOTE, c.width, REG, 8, 10, SOFT);
  doc.y -= 12;
}

/* A section heading carries the section's one rule; the column labels under it
 * need none of their own. `below` is what has to follow it on the same page
 * (its intro, column labels and first row), so a heading never stands alone at
 * the foot of a page. */
const HEADING_DEPTH = 24;
function sectionHeading(doc, heading, below) {
  const c = doc.col;
  ensure(doc, HEADING_DEPTH + (below || 0));
  drawText(doc, c.left, doc.y, heading, BOLD, 12);
  doc.y -= 8;
  drawRule(doc, doc.y, c.left, c.right, 0.5, INK);
  doc.y -= 16;
}

/** The height a table row takes on the grid: its lines, then the white space
 *  that parts it from the next row. */
function rowHeight(lines) {
  return (lines - 1) * LEAD + ROW_PITCH;
}

/* --------------------------------------------------------------- block A */

function blockAHead(doc) {
  const c = doc.col;
  drawText(doc, c.person, doc.y, 'PERSON', REG, 7, SOFT);
  drawText(doc, c.item, doc.y, 'ITEM', REG, 7, SOFT);
  drawText(doc, c.basis, doc.y, 'BASIS', REG, 7, SOFT);
  drawText(doc, c.units, doc.y, 'NIGHTS / QTY', REG, 7, SOFT);
  drawRight(doc, c.amountRight, doc.y, 'AMOUNT', REG, 7, SOFT);
  doc.y -= HEAD_DEPTH;
}
const HEAD_DEPTH = 16;

/** One Block A row, measured: every cell wrapped in full, and its height on the grid. */
function blockACells(c, line, o) {
  const pc = personCell(c, line, o), ic = itemCell(c, line.Item_ID, o, c.wItem - 6);
  const second = secondNightHosted(line);
  const person = pc.name, personId = pc.id, item = ic.name.concat(ic.detail, second ? wrapText(SECOND_NIGHT_WORDS, REG, 7.5, c.wItem - 6, ROW_LINES_MAX) : []), itemDetailFrom = ic.name.length;
  const basis = wrapText(basisOf(line), REG, 8, c.wBasis - 6, ROW_LINES_MAX);
  const units = wrapText(second ? '2 nights' : unitsOf(line), REG, 8, c.wUnits - 6, ROW_LINES_MAX);
  const rate = wrapText(rateOf(line), MONO, 7.5, c.wBasis - 6, ROW_LINES_MAX);
  /* the rate was decided by name (Freeze · F): the basis says "your agreed rate". A 009 row with its own billing category is a booking
     Haruthai & Suthep paid — its note is the Owners' words to the guest ("Haruthai has already paid this hotel booking for you … please
     repay …") and is printed. Every other 009 note is the Owners' working text (who, package, rule overrides): it stays in the ledger
     snapshot and is never printed on the guest's statement (HS-004.14) */
  const agreed = clean(line.rateSource) === 'SPECIAL_RATE';
  const paidRef = (clean(line.Category_Override_From) || line.categoryOverride) ? clean(line.specialRateRef) : '';
  const paidWords = paidRef && paidRef !== 'named special rate' ? paidRef : '';   /* the engine's fallback is never printed as the Owners' words */
  const agreedNote = paidWords ? wrapText(paidWords, REG, 7.5, c.wItem - 6, ROW_LINES_MAX) : [];
  const named = agreed ? wrapText(SPECIAL_RATE_NOTE, REG, 7.5, c.wBasis - 6) : [];
  const lines = Math.max(1, person.length + personId.length, item.length + agreedNote.length, basis.length + rate.length + named.length, units.length);
  return { person, personId, item, itemDetailFrom, agreedNote, basis, rate, named, units, height: rowHeight(lines) };
}

/** One Block A row. `keep` is room held below it on the same page, so the
 *  last row never leaves the total to stand alone at the top of the next. */
function blockARow(doc, line, o, keep) {
  const c = doc.col;
  const { person, personId, item, itemDetailFrom, agreedNote, basis, rate, named, units, height } = blockACells(c, line, o);
  const amount = amountOf(line);
  ensure(doc, height + (keep || 0), blockAHead);

  const top = doc.y;
  const at = (i) => top - i * LEAD;
  person.forEach((t, i) => drawText(doc, c.person, at(i), t, REG, 8.5));
  personId.forEach((t, i) => drawText(doc, c.person, at(person.length + i), t, REG, 7, SOFT));
  item.forEach((t, i) => (i < itemDetailFrom ? drawText(doc, c.item, at(i), t, REG, 8.5) : drawText(doc, c.item, at(i), t, REG, 7.5, SOFT)));
  agreedNote.forEach((t, i) => drawText(doc, c.item, at(item.length + i), t, REG, 7.5, SOFT));
  basis.forEach((t, i) => drawText(doc, c.basis, at(i), t, REG, 8, SOFT));
  rate.forEach((t, i) => drawText(doc, c.basis, at(basis.length + i), t, MONO, 7.5, SOFT));
  named.forEach((t, i) => drawText(doc, c.basis, at(basis.length + rate.length + i), t, REG, 7.5, SOFT));
  units.forEach((t, i) => drawText(doc, c.units, at(i), t, REG, 8, SOFT));

  /* a refused amount is marked, never filled in with a plausible number */
  if (amount == null) drawRight(doc, c.amountRight, top, 'REVIEW', BOLD, 7.5);
  else drawRight(doc, c.amountRight, top, amount, MONO, 8);

  doc.y = top - height;
}

/** Room the totals take under the row grid's next baseline. */
function totalsDepth(snapshot) {
  const blockA = snapshot.Block_A_Total_Cents;
  const total = snapshot.Total_Payable_Cents;
  return Number.isFinite(blockA) && Number.isFinite(total) && blockA !== total ? 30 : 15;
}

function blockATotals(doc, snapshot) {
  const c = doc.col;
  const blockA = snapshot.Block_A_Total_Cents;
  const total = snapshot.Total_Payable_Cents;
  const twoFigures = Number.isFinite(blockA) && Number.isFinite(total) && blockA !== total;

  /* the rows leave doc.y on the baseline a further row would take; the total's
   * rule sits in that white space, clear of the last row's descenders and of
   * the total's capitals. It is the one rule of the total: none under it. */
  const fresh = ensure(doc, totalsDepth(snapshot));
  const ruleY = fresh ? doc.y : doc.y + 8;
  drawRule(doc, ruleY, c.left, c.right, 0.8, INK);
  doc.y = ruleY - 17;

  if (twoFigures) {
    /* the two figures should be the same number; if the Snapshot carries two,
     * both are shown rather than one of them quietly chosen */
    drawText(doc, c.person, doc.y, 'Block A', REG, 9, SOFT);
    drawRight(doc, c.amountRight, doc.y, formatUSD(blockA), MONO, 8.5, SOFT);
    doc.y -= 15;
  }

  drawText(doc, c.person, doc.y, 'Total payable to Haruthai & Suthep', BOLD, 10.5);
  if (Number.isFinite(total)) drawRight(doc, c.amountRight, doc.y, formatUSD(total), BOLD, 10.5);
  else drawRight(doc, c.amountRight, doc.y, REVIEW_HEADING, BOLD, 10.5);
  doc.y -= 30;
}

function blockASection(doc, lines, snapshot, o) {
  const first = lines.length ? blockACells(doc.col, lines[0], o).height : rowHeight(1);
  sectionHeading(doc, BLOCK_A_HEADING, HEAD_DEPTH + first + (lines.length > 1 ? 0 : totalsDepth(snapshot)));
  blockAHead(doc);
  if (!lines.length) {
    ensure(doc, rowHeight(1) + totalsDepth(snapshot), blockAHead);
    drawText(doc, doc.col.person, doc.y, 'No items are payable to Haruthai & Suthep on this statement.', REG, 8.5, SOFT);
    doc.y -= rowHeight(1);
  }
  lines.forEach((line, i) => blockARow(doc, line, o, i === lines.length - 1 ? totalsDepth(snapshot) : 0));
  blockATotals(doc, snapshot);
}

/* --------------------------------------------------------------- block B */
/* No amount column exists here. Block B cannot be added to anything on this
 * page because this page never states a Block B figure (Freeze · S). */

function blockBHead(doc) {
  const c = doc.col;
  drawText(doc, c.person, doc.y, 'PERSON', REG, 7, SOFT);
  drawText(doc, c.item, doc.y, 'ITEM', REG, 7, SOFT);
  drawText(doc, c.basis, doc.y, 'HOW IT WORKS', REG, 7, SOFT);
  doc.y -= HEAD_DEPTH;
}

function blockBCells(c, line, o) {
  const pc = personCell(c, line, o), ic = itemCell(c, line.Item_ID, o, c.wItem - 6);
  const person = pc.name, personId = pc.id, item = ic.name.concat(ic.detail), itemDetailFrom = ic.name.length;
  const note = wrapText(basisOf(line), REG, 8, c.wNote - 6, ROW_LINES_MAX);
  return { person, personId, item, itemDetailFrom, note, height: rowHeight(Math.max(1, person.length + personId.length, item.length, note.length)) };
}

/* a Block B item the Snapshot names without a line of its own */
function namedCells(c, itemId, o) {
  const ic = itemCell(c, itemId, o, c.wItem - 6);
  const item = ic.name.concat(ic.detail);
  return { item, itemDetailFrom: ic.name.length, height: rowHeight(Math.max(1, item.length)) };
}

function blockBRow(doc, line, o) {
  const c = doc.col;
  const { person, personId, item, itemDetailFrom, note, height } = blockBCells(c, line, o);
  ensure(doc, height, blockBHead);

  const top = doc.y;
  person.forEach((t, i) => drawText(doc, c.person, top - i * LEAD, t, REG, 8.5));
  personId.forEach((t, i) => drawText(doc, c.person, top - (person.length + i) * LEAD, t, REG, 7, SOFT));
  item.forEach((t, i) => (i < itemDetailFrom ? drawText(doc, c.item, top - i * LEAD, t, REG, 8.5) : drawText(doc, c.item, top - i * LEAD, t, REG, 7.5, SOFT)));
  note.forEach((t, i) => drawText(doc, c.basis, top - i * LEAD, t, REG, 8, SOFT));
  doc.y = top - height;
}

function blockBSection(doc, lines, snapshot, o) {
  const informational = Array.isArray(snapshot.Block_B_Informational) ? snapshot.Block_B_Informational : [];
  if (!lines.length && !informational.length) return;

  const c = doc.col;
  const intro = wrapText(BLOCK_B_INTRO, REG, 8.3, c.width).length * 10.5 + 8;
  const first = lines.length ? blockBCells(c, lines[0], o).height : namedCells(c, informational[0], o).height;
  sectionHeading(doc, BLOCK_B_HEADING, intro + HEAD_DEPTH + first);
  drawParagraph(doc, c.left, BLOCK_B_INTRO, c.width, REG, 8.3, 10.5, SOFT);
  doc.y -= 8;
  blockBHead(doc);

  if (lines.length) {
    for (const line of lines) blockBRow(doc, line, o);
  } else {
    /* the Snapshot named the items but carries no line for them */
    for (const itemId of informational) {
      const { item, itemDetailFrom, height } = namedCells(c, itemId, o);
      ensure(doc, height, blockBHead);
      item.forEach((t, i) => (i < itemDetailFrom ? drawText(doc, doc.col.item, doc.y - i * LEAD, t, REG, 8.5) : drawText(doc, doc.col.item, doc.y - i * LEAD, t, REG, 7.5, SOFT)));
      doc.y -= height;
    }
  }
  doc.y -= 12;
}

/* ------------------------------------------------------- FX, notes, review */

function fxSection(doc, snapshot) {
  const c = doc.col;
  const rows = [];
  const thb = Number(snapshot.FX_USD_THB), eur = Number(snapshot.FX_USD_EUR);
  if (snapshot.FX_USD_THB != null && Number.isFinite(thb)) rows.push('1 ' + ACCOUNTING_CURRENCY + ' = ' + thb + ' THB');
  if (snapshot.FX_USD_EUR != null && Number.isFinite(eur)) rows.push('1 ' + ACCOUNTING_CURRENCY + ' = ' + eur + ' EUR');
  if (!rows.length) return;

  /* LAYOUT 1.3: the heading and its rates on one line, the sentence beneath — the same facts in less room */
  ensure(doc, 12 + wrapText(FX_BODY, REG, 7.5, c.width).length * 9.5 + 4);
  drawText(doc, c.left, doc.y, FX_HEADING + ':', BOLD, 9);
  drawText(doc, c.left + textWidth(FX_HEADING + ':  ', BOLD, 9), doc.y, rows.join('  \u00b7  '), MONO, 8.5);
  doc.y -= 12;
  drawParagraph(doc, c.left, FX_BODY, c.width, REG, 7.5, 9.5, SOFT);
  doc.y -= 12;
}

function reviewSection(doc) {
  const c = doc.col;
  const body = wrapText(REVIEW_BODY, REG, 8.5, c.width - 24);
  const height = 16 + body.length * 11 + 14;
  ensure(doc, height + 12);

  const top = doc.y + 11;
  drawBox(doc, c.left, top - height, c.width, height, 0.93);
  drawText(doc, c.left + 12, doc.y, REVIEW_HEADING, BOLD, 9);
  doc.y -= 15;
  for (const line of body) {
    drawText(doc, c.left + 12, doc.y, line, REG, 8.5);
    doc.y -= 11;
  }
  doc.y = top - height - 14;
}

/* HOW TO PAY (layout 1.2 · Owners, 18 Nov 2026): the caller's payment facts, printed as given — the guest page's own words */
const PAY_HEADING = 'How to pay';
const PAY_WORDS = Object.freeze({
  SEPA_EUR: { method: 'Bank transfer (SEPA), in euros (EUR)', how: 'Transfer the amount to pay by SEPA bank transfer, and add your reference to the transfer.', payee: 'Account holder' },
  PAYPAL_EUR: { method: 'PayPal, in euros (EUR)', how: 'Scan the code with the PayPal app and send the amount to pay. Please add your reference as a note.', payee: 'Recipient' },
  PROMPTPAY_THB: { method: 'PromptPay, in Thai baht (THB)', how: 'Scan the code with your banking app (PromptPay) and send the amount to pay.', payee: 'Recipient' },
});
const PAY_PROFILE = 'My Profile always shows this statement\'s current balance and the current way to pay; a payment counts once Guest Relations has verified it.';
function money2(cur, n) { return cur + ' ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/* LAYOUT 1.3 · HOW TO PAY (HS-004.15/.16): one look for every method. The amount due in USD and, for a payment in another currency,
   the full amount in that currency at this statement's frozen rate; then each way to pay the guest may use — on the EUR route the
   SEPA bank transfer first and PayPal as the alternative (HS-004.19), else the method frozen with the statement. Every detail is the
   caller's (src/billing-routes.js · paymentForPdf: the account, the approved code, the reference); nothing is made up here. */
const OPTION_WORDS = Object.freeze({
  SEPA_EUR: { title: 'Bank transfer (SEPA)', payee: 'Account holder', how: 'Please transfer the amount in euros and add the reference to your transfer.' },
  PAYPAL_EUR: { title: 'PayPal', payee: 'Pay to', how: 'Scan the code with the PayPal app, send the amount in euros and add the reference as a note.' },
  PROMPTPAY_THB: { title: 'PromptPay', payee: 'Recipient', how: 'Scan the code with your banking app (PromptPay) and send the amount in Thai baht.' },
});
function optionRows(o, p) {
  const rows = [];
  if (clean(o.recipient)) rows.push([OPTION_WORDS[o.method].payee, clean(o.recipient)]);
  /* the bank and its BIC only as the revision froze them (HS-PROMPT-040) — a revision issued without them prints exactly as before */
  if (o.method === 'SEPA_EUR' && clean(o.bank)) rows.push(['Bank', clean(o.bank)]);
  if (o.method === 'SEPA_EUR') rows.push(['IBAN', clean(o.iban) ? clean(o.iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim() : 'shown in My Profile, under Your statement']);
  if (o.method === 'SEPA_EUR' && clean(o.bic)) rows.push(['BIC / SWIFT', clean(o.bic)]);
  if (o.amount && Number.isFinite(Number(o.amount.amount)) && clean(o.amount.currency)) rows.push(['Amount', money2(clean(o.amount.currency), o.amount.amount)]);
  if (clean(p.reference)) rows.push([o.method === 'SEPA_EUR' ? 'Reference' : 'Reference (note)', clean(p.reference)]);
  return rows;
}
function paymentSection(doc, p) {
  if (!p || typeof p !== 'object') return;
  const c = doc.col;
  /* a version replaced by a later one, or a statement with nothing payable: no instruction to pay — said in one sentence */
  const only = p.supersededBy ? 'This version was replaced by version ' + clean(p.supersededBy) + '. My Profile shows the current statement and how to pay it.'
    : p.nothingDue ? 'Nothing is payable on this statement.' : null;
  const options = (Array.isArray(p.options) && p.options.length ? p.options : (p.method ? [p] : [])).filter((o) => o && OPTION_WORDS[clean(o.method)])
    .map((o) => ({ ...o, method: clean(o.method) }));
  if (p.nothingDue && !p.supersededBy) return;   /* said once, under the dates: "Nothing is payable on this statement." */
  if (only || !options.length) {
    ensure(doc, 40);
    drawText(doc, c.left, doc.y, PAY_HEADING, BOLD, 9); doc.y -= 13;
    drawParagraph(doc, c.left, only || 'Guest Relations will tell you how to pay this statement.', c.width, REG, 8.5, 11, INK); doc.y -= 12;
    return;
  }
  /* the amount due: USD, and every other currency the options settle in, at this statement's frozen rate */
  const extra = [...new Map(options.filter((o) => o.amount && clean(o.amount.currency) && clean(o.amount.currency) !== ACCOUNTING_CURRENCY)
    .map((o) => [clean(o.amount.currency), o.amount])).values()];
  const due = (p.totalUsd != null ? money2(ACCOUNTING_CURRENCY, p.totalUsd) : '') + extra.map((a) => ' · ' + money2(clean(a.currency), a.amount) +
    (clean(a.rate) ? ' (' + clean(a.rate) + ')' : ' at this statement\'s frozen rate')).join('');
  /* each option's height, so the heading never stands without its first option (and that option's code) */
  const sized = options.map((o) => {
    const w = OPTION_WORDS[o.method], rows = optionRows(o, p);
    const img = o.qr && o.qr.width > 0 && o.qr.height > 0 && o.qr.data ? o.qr : null;
    let qrW = o.method === 'PROMPTPAY_THB' ? 140 : 125, qrH = img ? Math.round(qrW * img.height / img.width) : 0;
    const maxH = Math.max(120, doc.page.h - 300);
    if (qrH > maxH) { qrW = Math.round(qrW * maxH / qrH); qrH = maxH; }
    const howLines = wrapText(w.how, REG, 8.3, c.width - 10);
    const height = 14 + rows.length * 12 + howLines.length * 10.5 + 6 + (img ? qrH + 10 : o.method !== 'SEPA_EUR' ? 14 : 0) + 10;
    return { o, w, rows, img, qrW, qrH, howLines, height };
  });
  let headH = 14 + (due ? 12 : 0) + (clean(p.dueDate) ? 12 : 0) + 6;
  const gap = 16, codeCol = 96;
  /* the bank transfer's column is the wider one: its IBAN is never broken */
  const colWs = [(c.width - codeCol - 2 * gap) * 0.6, (c.width - codeCol - 2 * gap) * 0.4];
  const col = sized.length === 2 ? sized.map(({ o, w, rows, img, qrW, qrH }, n) => {
    const colW = colWs[n], lab = Math.ceil(Math.max(...rows.map(([k]) => textWidth(k, REG, 8)))) + 7;
    const how = wrapText(w.how, REG, 8, colW - 4);
    const vals = rows.map(([k, v]) => [k, k === 'IBAN' ? [v] : wrapText(v, /^Reference/.test(k) ? MONO : REG, 8.3, colW - lab, 3)]);
    let ibanSize = 8.3; const iban = rows.find(([k]) => k === 'IBAN');
    while (iban && ibanSize > 6.5 && textWidth(iban[1], MONO, ibanSize) > colW - lab) ibanSize -= 0.1;
    const textH = 14 + vals.reduce((t, [, l]) => t + l.length * 11 + 1, 0) + how.length * 10 + 6;
    return { o, w, vals, how, img, qrW, qrH, lab, ibanSize, h: Math.max(textH, img ? 96 : 0) };
  }) : null;
  /* ONE way to pay: its rows and words on the left, its code on the right (HS-004.13) — the same facts in less height */
  const one = !col && sized.length === 1 ? (() => {
    const k = sized[0], box = k.o.method === 'PROMPTPAY_THB' ? 128 : 100;
    const f = k.img ? Math.min(box / k.img.width, (k.o.method === 'PROMPTPAY_THB' ? 190 : 100) / k.img.height) : 0;
    const codeW = k.img ? Math.round(k.img.width * f) : 0, codeH = k.img ? Math.round(k.img.height * f) : 0;
    const textW = c.width - (codeW ? codeW + 24 : 0);
    const how = wrapText(k.w.how, REG, 8.3, textW - 10);
    const vals = k.rows.map(([kk, v]) => [kk, wrapText(v, /^(IBAN|Reference)/.test(kk) ? MONO : REG, 8.5, textW - 120, 3)]);
    const textH = 13 + vals.reduce((t, [, l]) => t + l.length * 12, 0) + how.length * 10.5 + 4 + (!k.img && k.o.method !== 'SEPA_EUR' ? 14 : 0);
    return { ...k, codeW, codeH, textW, how, vals, textH, h: Math.max(textH, codeH) + 10 };
  })() : null;
  const firstH = col ? Math.max(col[0].h, col[1].h) + 8 + wrapText(PAY_PROFILE, REG, 8, c.width).length * 10 : one ? one.h + wrapText(PAY_PROFILE, REG, 8, c.width).length * 10 : sized[0].height;
  /* ONE way to pay: its code stands at the right beside the whole section — the heading, the amount due and the way to pay run down
     the left — so a tall payment code (the PromptPay slip) does not push the section onto a page of its own (HS-004.13) */
  const profileH = wrapText(PAY_PROFILE, REG, 8, c.width).length * 10;
  /* the amount due is never shortened: beside a code it may take a second line */
  const leftW = one ? one.textW : c.width;
  const dueLines = due ? wrapText(due, BOLD, 8.5, leftW - 110) : [];
  headH += Math.max(0, dueLines.length - 1) * 12;
  ensure(doc, one ? Math.max(headH + one.textH, one.codeH) + 10 + profileH : headH + firstH);
  const sectionTop = doc.y;
  drawText(doc, c.left, doc.y, PAY_HEADING, BOLD, 9);
  doc.y -= 14;
  if (dueLines.length) { drawText(doc, c.left, doc.y, 'Amount due', REG, 8.5, SOFT); dueLines.forEach((t) => { drawText(doc, c.left + 110, doc.y, t, BOLD, 8.5); doc.y -= 12; }); }
  if (clean(p.dueDate)) { drawText(doc, c.left, doc.y, 'Pay by', REG, 8.5, SOFT); drawText(doc, c.left + 110, doc.y, longDate(p.dueDate), REG, 8.5); doc.y -= 12; }
  doc.y -= 6;
  /* TWO WAYS TO PAY side by side (HS-004.13/.16): the bank transfer on the left, PayPal with its code on the right — one look, half the
     height; each column keeps its own rows, words and code */
  if (one) {
    const top = doc.y;
    let y = top;
    drawText(doc, c.left, y, one.w.title, BOLD, 8.8); y -= 13;
    for (const [label, lines] of one.vals) {
      const mono = /^(IBAN|Reference)/.test(label);
      drawText(doc, c.left + 10, y, label, REG, 8.3, SOFT);
      lines.forEach((t, i) => drawText(doc, c.left + 120, y - i * 12, t, mono ? MONO : REG, 8.5));
      y -= lines.length * 12;
    }
    for (const t of one.how) { drawText(doc, c.left + 10, y, t, REG, 8.3, INK); y -= 10.5; }
    if (!one.img && one.o.method !== 'SEPA_EUR') { y -= 4; drawText(doc, c.left + 10, y, 'The payment code is shown in My Profile, under Your statement.', REG, 8.3, SOFT); y -= 10; }
    if (one.img) placeImage(doc, one.img, c.right - one.codeW, sectionTop + 8 - one.codeH, one.codeW, one.codeH);
    doc.y = Math.min(y, sectionTop + 8 - one.codeH) - 10;
    drawParagraph(doc, c.left, PAY_PROFILE, c.width, REG, 8, 10, SOFT);
    doc.y -= 12;
    return;
  }
  if (col) {
    const top = doc.y;
    col.forEach((k, n) => {
      const x = c.left + (n === 0 ? 0 : colWs[0] + gap);
      let y = top;
      drawText(doc, x, y, (n === 0 ? 'Option 1 \u00b7 ' : 'Option 2 \u00b7 ') + k.w.title + (n > 0 ? ' (alternative)' : ''), BOLD, 8.8);
      y -= 14;
      for (const [label, lines] of k.vals) {
        const mono = /^(IBAN|Reference)/.test(label);
        drawText(doc, x, y, label, REG, 8, SOFT);
        lines.forEach((t, i) => drawText(doc, x + k.lab, y - i * 11, t, mono ? MONO : REG, label === 'IBAN' ? k.ibanSize : 8.3));
        y -= lines.length * 11 + 1;
      }
      for (const t of k.how) { drawText(doc, x, y, t, REG, 8, INK); y -= 10; }
      y -= 6;
      /* the code in its own column at the right edge, level with its option */
      if (k.img) { const f = Math.min(92 / k.img.height, 92 / k.img.width), h = Math.round(k.img.height * f), w2 = Math.round(k.img.width * f);
        placeImage(doc, k.img, c.right - w2, top + 4 - h, w2, h); y = Math.min(y, top + 4 - h - 6); }
      k.end = y;
    });
    doc.y = Math.min(col[0].end, col[1].end) - 6;
    drawParagraph(doc, c.left, PAY_PROFILE, c.width, REG, 8, 10, SOFT);
    doc.y -= 12;
    return;
  }
  sized.forEach(({ o, w, rows, img, qrW, qrH, howLines, height }, n) => {
    const wantsQr = o.method !== 'SEPA_EUR';
    /* an option and its code always stay on one page */
    ensure(doc, height);
    const label = (options.length > 1 ? (n === 0 ? 'Option 1 · ' : 'Option ' + (n + 1) + ' · ') : '') + w.title + (options.length > 1 && n > 0 ? ' (alternative)' : '');
    drawText(doc, c.left, doc.y, label, BOLD, 8.8);
    doc.y -= 13;
    for (const [k, v] of rows) {
      const mono = k === 'IBAN' || /^Reference/.test(k);
      drawText(doc, c.left + 10, doc.y, k, REG, 8.3, SOFT);
      drawText(doc, c.left + 120, doc.y, fitText(v, mono ? MONO : REG, 8.5, c.width - 120), mono ? MONO : REG, 8.5);
      doc.y -= 12;
    }
    for (const t of howLines) { drawText(doc, c.left + 10, doc.y, t, REG, 8.3, INK); doc.y -= 10.5; }
    doc.y -= 4;
    if (img) {
      /* the approved payment code, as the statement page shows it — the caller's image, never one made here */
      placeImage(doc, img, c.left + 10, doc.y - qrH, qrW, qrH);
      doc.y -= qrH + 10;
    } else if (wantsQr) {
      drawText(doc, c.left + 10, doc.y, 'The payment code is shown in My Profile, under Your statement.', REG, 8.3, SOFT);
      doc.y -= 14;
    }
    doc.y -= 6;
  });
  drawParagraph(doc, c.left, PAY_PROFILE, c.width, REG, 8, 10, SOFT);
  doc.y -= 12;
}

/** Caller-supplied paragraphs (payment instructions, for instance). They are
 *  printed verbatim: this module never writes a payment detail of its own. */
function notesSection(doc, o) {
  const notes = (Array.isArray(o.notes) ? o.notes : []).map(clean).filter(Boolean);
  if (!notes.length) return;
  const c = doc.col;
  const heading = clean(o.notesHeading);
  ensure(doc, 40);
  if (heading) {
    drawText(doc, c.left, doc.y, heading, BOLD, 9);
    doc.y -= 13;
  }
  for (const note of notes) {
    ensure(doc, 24);
    drawParagraph(doc, c.left, note, c.width, REG, 8.3, 10.5, INK);
    doc.y -= 5;
  }
  doc.y -= 8;
}

/* The footer is written once the page count is known, so it is the last pass
 * over the pages rather than part of the flow. */
function footers(doc) {
  const c = doc.col;
  const total = doc.pages.length;
  for (let i = 0; i < total; i++) {
    doc.ops = doc.pages[i];
    drawRule(doc, 78, c.left, c.right, 0.4, HAIR);
    drawText(doc, c.left, 68, fitText(doc.meta.documentLine, REG, 7, c.width - 60), REG, 7, SOFT);
    drawRight(doc, c.right, 68, 'page ' + (i + 1) + ' of ' + total, REG, 7, SOFT);
    /* the engine version and the source hash are audit facts, not the guest's (HS-004.14): the file's metadata carries them */
  }
}

/* ------------------------------------------------------------ the PDF file */

export const PDF_WRITER_VERSION = 'guest-settlement-pdf/1.3';

/* FNV-1a over the document body, four times from four offsets, which gives the
 * 32 hex digits the trailer /ID wants. It is a fingerprint of this document
 * and of nothing else, so two renders of one Snapshot carry the same /ID. */
function fnv1a(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function fingerprint(text) {
  return fnv1a(text, 0x811c9dc5) + fnv1a(text, 0x1b873593) +
         fnv1a(text, 0x85ebca6b) + fnv1a(text, 0xc2b2ae35);
}

function fontObject(baseFont) {
  return '<< /Type /Font /Subtype /Type1 /BaseFont /' + baseFont + ' /Encoding /WinAnsiEncoding >>';
}

/* The only date in the file is the Snapshot's own Issue_Date, read as a string
 * and never through a clock or a time zone. No Issue_Date, no CreationDate. */
function infoObject(meta) {
  const parts = [
    '/Title ' + pdfText(meta.documentLine),
    '/Subject ' + pdfText(TITLE),
    '/Creator ' + pdfText(meta.engineVersion),
    '/Producer ' + pdfText(PDF_WRITER_VERSION),
    '/Keywords ' + pdfText('engine ' + meta.engineVersion + ' \u00b7 source hash ' + meta.sourceHash),
  ];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(meta.issueDate);
  if (m) parts.push('/CreationDate ' + pdfText('D:' + m[1] + m[2] + m[3] + '000000Z'));
  return '<< ' + parts.join(' ') + ' >>';
}

function assemble(doc, meta) {
  const { w, h } = doc.page;
  const pageCount = doc.pages.length;
  const FIRST_PAGE_OBJ = 7;
  const objects = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Count ' + pageCount + ' /Kids [' +
    doc.pages.map((_, i) => (FIRST_PAGE_OBJ + i * 2) + ' 0 R').join(' ') + '] >>';
  objects[3] = fontObject('Helvetica');
  objects[4] = fontObject('Helvetica-Bold');
  objects[5] = fontObject('Courier');
  objects[6] = infoObject(meta);
  /* the images (layout 1.2: the payment code) follow the pages; binary data as single bytes, like every character of the file */
  const images = doc.images || [], FIRST_IMAGE_OBJ = FIRST_PAGE_OBJ + pageCount * 2;
  images.forEach((img, k) => {
    let data = '';
    for (let i = 0; i < img.data.length; i += 8192) data += String.fromCharCode.apply(null, img.data.subarray ? img.data.subarray(i, i + 8192) : img.data.slice(i, i + 8192));
    objects[FIRST_IMAGE_OBJ + k] = '<< /Type /XObject /Subtype /Image /Width ' + img.width + ' /Height ' + img.height + ' /ColorSpace /' + (img.colorSpace === 'DeviceGray' ? 'DeviceGray' : 'DeviceRGB') +
      ' /BitsPerComponent 8 /Filter /' + (img.filter === 'DCTDecode' ? 'DCTDecode' : img.filter === 'RunLengthDecode' ? 'RunLengthDecode' : 'FlateDecode') + ' /Length ' + data.length + ' >>\nstream\n' + data + '\nendstream';
  });

  for (let i = 0; i < pageCount; i++) {
    const pageObj = FIRST_PAGE_OBJ + i * 2;
    const streamObj = pageObj + 1;
    const used = doc.pageImages && doc.pageImages.get(doc.pages[i]);
    const xobj = used && used.size ? ' /XObject << ' + [...used].map((n) => '/' + n + ' ' + (FIRST_IMAGE_OBJ + Number(n.slice(2)) - 1) + ' 0 R').join(' ') + ' >>' : '';
    objects[pageObj] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(w) + ' ' + num(h) + '] ' +
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>' + xobj + ' >> /Contents ' + streamObj + ' 0 R >>';
    /* uncompressed, so the stream length is the operator text itself and the
     * file stays inspectable with nothing but a text editor */
    const stream = doc.pages[i].join('\n');
    objects[streamObj] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
  }

  const size = objects.length;                 /* object 0 is the free head of the xref chain */
  const id = fingerprint(objects.join('\n'));

  /* Every character written from here on is a single byte, which is what makes
   * the running string length a valid xref offset. */
  let out = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
  const offsets = [];
  for (let n = 1; n < size; n++) {
    offsets[n] = out.length;
    out += n + ' 0 obj\n' + objects[n] + '\nendobj\n';
  }
  const startxref = out.length;
  out += 'xref\n0 ' + size + '\n0000000000 65535 f \n';
  for (let n = 1; n < size; n++) out += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + size + ' /Root 1 0 R /Info 6 0 R /ID [<' + id + '> <' + id + '>] >>\n' +
    'startxref\n' + startxref + '\n%%EOF\n';

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

/* ------------------------------------------------------------- the export */

/**
 * Render ONE issued Settlement Snapshot as the guest's Guest Settlement PDF.
 *
 * `snapshot` is the object src/billing/settlement.js · buildSnapshot returns.
 * Every figure on the page is read from it; nothing is derived here.
 *
 * `opts` carries display text only — never a figure of its own making:
 *   payment       { method, amount, totalUsd, dueDate, recipient, iban, reference, qr } — the payment section (layout 1.2), read
 *                 by the caller from the authoritative payment source and the server's own conversion (settlement.js ·
 *                 inPreferredCurrency at the Snapshot's frozen rate); printed as given
 *   persons       { Person_ID: 'name' }  — the Snapshot holds ids, not names
 *   items         { Item_ID: 'name' }
 *   notes         [ 'paragraph', ... ]   — printed verbatim, e.g. how to pay
 *   notesHeading  a heading for those paragraphs
 *   pageSize      'A4' (default) or 'LETTER'
 *
 * Returns the PDF as a Uint8Array. The same Snapshot and the same opts always
 * produce the same bytes, so an archived Revision can be re-derived and
 * compared byte for byte — by the writer version its /Producer names
 * (PDF_WRITER_VERSION; a layout change is a new version).
 */
export function renderSettlementPdf(snapshot, opts) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError('renderSettlementPdf needs a Settlement Snapshot (settlement.js \u00b7 buildSnapshot)');
  }
  const o = opts || {};
  const page = PAGE_SIZES[clean(o.pageSize).toUpperCase()] || PAGE_SIZES.A4;

  const settlementId = clean(snapshot.Settlement_ID);
  const revision = Number(snapshot.Revision);
  const revisionLabel = snapshot.Revision == null || !Number.isFinite(revision)
    ? 'Revision not stated'
    : 'Revision V' + revision;
  const idLine = (settlementId || 'Settlement ID not stated') + ' \u00b7 ' + revisionLabel;

  const meta = {
    /* the exact line the Freeze asks for, and the line every page carries */
    documentLine: TITLE + ' ' + idLine,
    idLine,
    engineVersion: clean(snapshot.Engine_Version) || 'not stated',
    sourceHash: clean(snapshot.Source_Hash) || 'not stated',
    issueDate: clean(snapshot.Issue_Date),
  };

  const doc = { page, col: columnsOf(page), meta, pages: [], ops: null, y: 0 };
  startPage(doc);

  const { blockA, blockB } = visibleLines(snapshot);
  const totalMissing = !Number.isFinite(snapshot.Total_Payable_Cents);
  const amountMissing = blockA.some((l) => amountOf(l) == null);

  brandBand(doc);
  masthead(doc, snapshot, o);
  blockASection(doc, blockA, snapshot, o);
  if (totalMissing || amountMissing) reviewSection(doc);
  blockBSection(doc, blockB, snapshot, o);
  fxSection(doc, snapshot);
  paymentSection(doc, o.payment);
  notesSection(doc, o);
  footers(doc);

  return assemble(doc, meta);
}
