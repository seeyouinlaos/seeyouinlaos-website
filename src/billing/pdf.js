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
   ========================================================================== */

import {
  BILLING_CATEGORY, MODIFIER, RATE_BASIS, ACCOUNTING_CURRENCY, formatUSD,
} from './model.js';

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
const HAIR = 0.78;          /* the grey of a row separator */

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
  '\u20ac': 'EUR', '\u00a3': 'GBP', '\u0e3f': 'THB', '\u2122': 'TM', '\u2192': '->',
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

/** Word wrap inside a column. A word too long for the column is cut rather
 *  than allowed to run past the page box. */
function wrapText(value, font, size, maxWidth, maxLines) {
  const out = [];
  let cur = '';
  for (const word of toLatin1(value).split(/\s+/).filter(Boolean)) {
    if (cur && textWidth(cur + ' ' + word, font, size) <= maxWidth) { cur += ' ' + word; continue; }
    if (cur) { out.push(cur); cur = ''; }
    let rest = word;
    while (textWidth(rest, font, size) > maxWidth && rest.length > 1) {
      let cut = rest.length;
      while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > maxWidth) cut--;
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
    person: left, wPerson: w * 0.215,
    item: left + w * 0.225, wItem: w * 0.29,
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
const SPECIAL_RATE_NOTE = 'named special rate';

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

function labelFor(map, id, fallback) {
  const key = clean(id);
  const name = map && Object.prototype.hasOwnProperty.call(map, key) ? clean(map[key]) : '';
  return name || key || fallback;
}

/** Nights and quantity exactly as the engine recorded them on the line. */
function unitsOf(line) {
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

/* ------------------------------------------------------------- the masthead */

function masthead(doc, snapshot) {
  const c = doc.col;
  doc.y -= 16;
  drawText(doc, c.left, doc.y, TITLE, BOLD, 21);
  doc.y -= 15;
  drawText(doc, c.left, doc.y, doc.meta.idLine, REG, 9.5, SOFT);
  doc.y -= 11;
  drawRule(doc, doc.y, c.left, c.right, 0.8, INK);
  doc.y -= 24;

  /* Issue_Date and Due_Date are Snapshot fields (Freeze · P decided the due
   * date before this file ever sees it; a hand override travels in the
   * Snapshot and is stated as such). */
  const cells = [
    ['Issued', clean(snapshot.Issue_Date) || 'not stated'],
    ['Due', clean(snapshot.Due_Date) || 'not stated'],
    ['Currency', clean(snapshot.Currency) || ACCOUNTING_CURRENCY],
  ];
  const step = c.width / 3;
  cells.forEach(([label, value], i) => {
    const x = c.left + i * step;
    drawText(doc, x, doc.y, label.toUpperCase(), REG, 7, SOFT);
    drawText(doc, x, doc.y - 13, fitText(value, REG, 11, step - 10), REG, 11);
  });
  doc.y -= 13 + 20;

  drawParagraph(doc, c.left, TERMS_21_DAYS, c.width, REG, 8.8, 11, INK);
  if (clean(snapshot.Due_Date_Override)) drawParagraph(doc, c.left, OVERRIDE_NOTE, c.width, REG, 8, 10, SOFT);
  doc.y -= 12;
}

function sectionHeading(doc, heading) {
  const c = doc.col;
  ensure(doc, 56);
  drawText(doc, c.left, doc.y, heading, BOLD, 12);
  doc.y -= 7;
  drawRule(doc, doc.y, c.left, c.right, 0.6, INK);
  doc.y -= 15;
}

/* --------------------------------------------------------------- block A */

function blockAHead(doc) {
  const c = doc.col;
  drawText(doc, c.person, doc.y, 'PERSON', REG, 7, SOFT);
  drawText(doc, c.item, doc.y, 'ITEM', REG, 7, SOFT);
  drawText(doc, c.basis, doc.y, 'BASIS', REG, 7, SOFT);
  drawText(doc, c.units, doc.y, 'NIGHTS / QTY', REG, 7, SOFT);
  drawRight(doc, c.amountRight, doc.y, 'AMOUNT', REG, 7, SOFT);
  doc.y -= 5;
  drawRule(doc, doc.y, c.left, c.right, 0.4, HAIR);
  doc.y -= 13;
}

function blockARow(doc, line, o) {
  const c = doc.col;
  const lead = 10.5;
  const person = wrapText(labelFor(o.persons, line.Person_ID, 'not stated'), REG, 8.5, c.wPerson - 6, 2);
  const item = wrapText(labelFor(o.items, line.Item_ID, 'not stated'), REG, 8.5, c.wItem - 6, 3);
  const basis = wrapText(basisOf(line), REG, 8, c.wBasis - 6, 2);
  const units = wrapText(unitsOf(line), REG, 8, c.wUnits - 6, 2);
  const rate = rateOf(line);
  const agreed = clean(line.rateSource) === 'SPECIAL_RATE' ? clean(line.specialRateRef) : '';
  const amount = amountOf(line);

  const basisExtra = (rate ? 1 : 0) + (agreed ? 1 : 0);
  const rows = Math.max(1, person.length, item.length + (agreed ? 1 : 0), basis.length + basisExtra, units.length);
  const height = rows * lead + 7;
  ensure(doc, height, blockAHead);

  const top = doc.y;
  person.forEach((t, i) => drawText(doc, c.person, top - i * lead, t, REG, 8.5));
  item.forEach((t, i) => drawText(doc, c.item, top - i * lead, t, REG, 8.5));
  basis.forEach((t, i) => drawText(doc, c.basis, top - i * lead, t, REG, 8, SOFT));
  let sub = basis.length;
  if (rate) drawText(doc, c.basis, top - (sub++) * lead, fitText(rate, MONO, 7.5, c.wBasis - 6), MONO, 7.5, SOFT);
  if (agreed) {
    /* the rate was decided by name (Freeze · F), so the line says which
     * agreement it came from instead of looking like a standard price */
    drawText(doc, c.basis, top - (sub++) * lead, fitText(SPECIAL_RATE_NOTE, REG, 7.5, c.wBasis - 6), REG, 7.5, SOFT);
    drawText(doc, c.item, top - item.length * lead, fitText(agreed, REG, 7.5, c.wItem - 6), REG, 7.5, SOFT);
  }
  units.forEach((t, i) => drawText(doc, c.units, top - i * lead, t, REG, 8, SOFT));

  /* a refused amount is marked, never filled in with a plausible number */
  if (amount == null) drawRight(doc, c.amountRight, top, 'REVIEW', BOLD, 7.5);
  else drawRight(doc, c.amountRight, top, amount, MONO, 8);

  doc.y = top - height;
  drawRule(doc, doc.y + 4, c.left, c.right, 0.3, 0.88);
}

function blockATotals(doc, snapshot) {
  const c = doc.col;
  const blockA = snapshot.Block_A_Total_Cents;
  const total = snapshot.Total_Payable_Cents;
  const twoFigures = Number.isFinite(blockA) && Number.isFinite(total) && blockA !== total;
  ensure(doc, twoFigures ? 54 : 36);

  doc.y -= 4;
  drawRule(doc, doc.y, c.left, c.right, 0.8, INK);
  doc.y -= 15;

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
  doc.y -= 8;
  drawRule(doc, doc.y, c.left, c.right, 0.5, INK);
  doc.y -= 22;
}

function blockASection(doc, lines, snapshot, o) {
  sectionHeading(doc, BLOCK_A_HEADING);
  blockAHead(doc);
  if (!lines.length) {
    drawText(doc, doc.col.person, doc.y, 'No items are payable to Haruthai & Suthep on this statement.', REG, 8.5, SOFT);
    doc.y -= 16;
  }
  for (const line of lines) blockARow(doc, line, o);
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
  doc.y -= 5;
  drawRule(doc, doc.y, c.left, c.right, 0.4, HAIR);
  doc.y -= 13;
}

function blockBRow(doc, line, o) {
  const c = doc.col;
  const lead = 10.5;
  const person = wrapText(labelFor(o.persons, line.Person_ID, 'not stated'), REG, 8.5, c.wPerson - 6, 2);
  const item = wrapText(labelFor(o.items, line.Item_ID, 'not stated'), REG, 8.5, c.wItem - 6, 3);
  const note = wrapText(basisOf(line), REG, 8, c.wNote - 6, 2);
  const rows = Math.max(1, person.length, item.length, note.length);
  const height = rows * lead + 7;
  ensure(doc, height, blockBHead);

  const top = doc.y;
  person.forEach((t, i) => drawText(doc, c.person, top - i * lead, t, REG, 8.5));
  item.forEach((t, i) => drawText(doc, c.item, top - i * lead, t, REG, 8.5));
  note.forEach((t, i) => drawText(doc, c.basis, top - i * lead, t, REG, 8, SOFT));
  doc.y = top - height;
  drawRule(doc, doc.y + 4, c.left, c.right, 0.3, 0.88);
}

function blockBSection(doc, lines, snapshot, o) {
  const informational = Array.isArray(snapshot.Block_B_Informational) ? snapshot.Block_B_Informational : [];
  if (!lines.length && !informational.length) return;

  sectionHeading(doc, BLOCK_B_HEADING);
  drawParagraph(doc, doc.col.left, BLOCK_B_INTRO, doc.col.width, REG, 8.3, 10.5, SOFT);
  doc.y -= 8;
  blockBHead(doc);

  if (lines.length) {
    for (const line of lines) blockBRow(doc, line, o);
  } else {
    /* the Snapshot named the items but carries no line for them */
    for (const itemId of informational) {
      ensure(doc, 16, blockBHead);
      drawText(doc, doc.col.item, doc.y, fitText(labelFor(o.items, itemId, 'not stated'), REG, 8.5, doc.col.wItem - 6), REG, 8.5);
      doc.y -= 16;
    }
  }
  doc.y -= 14;
}

/* ------------------------------------------------------- FX, notes, review */

function fxSection(doc, snapshot) {
  const c = doc.col;
  const rows = [];
  const thb = Number(snapshot.FX_USD_THB), eur = Number(snapshot.FX_USD_EUR);
  if (snapshot.FX_USD_THB != null && Number.isFinite(thb)) rows.push('1 ' + ACCOUNTING_CURRENCY + ' = ' + thb + ' THB');
  if (snapshot.FX_USD_EUR != null && Number.isFinite(eur)) rows.push('1 ' + ACCOUNTING_CURRENCY + ' = ' + eur + ' EUR');
  if (!rows.length) return;

  ensure(doc, 30 + rows.length * 12);
  drawText(doc, c.left, doc.y, FX_HEADING, BOLD, 9);
  doc.y -= 13;
  for (const row of rows) {
    drawText(doc, c.left, doc.y, row, MONO, 8.5);
    doc.y -= 12;
  }
  doc.y -= 2;
  drawParagraph(doc, c.left, FX_BODY, c.width, REG, 8, 10, SOFT);
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
    const provenance = 'Engine ' + doc.meta.engineVersion + ' \u00b7 Source hash ' + doc.meta.sourceHash;
    drawText(doc, c.left, 57, fitText(provenance, MONO, 6.5, c.width), MONO, 6.5, SOFT);
  }
}

/* ------------------------------------------------------------ the PDF file */

export const PDF_WRITER_VERSION = 'guest-settlement-pdf/1.0';

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

  for (let i = 0; i < pageCount; i++) {
    const pageObj = FIRST_PAGE_OBJ + i * 2;
    const streamObj = pageObj + 1;
    objects[pageObj] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(w) + ' ' + num(h) + '] ' +
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ' + streamObj + ' 0 R >>';
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
 * `opts` carries display text only, never money:
 *   persons       { Person_ID: 'name' }  — the Snapshot holds ids, not names
 *   items         { Item_ID: 'name' }
 *   notes         [ 'paragraph', ... ]   — printed verbatim, e.g. how to pay
 *   notesHeading  a heading for those paragraphs
 *   pageSize      'A4' (default) or 'LETTER'
 *
 * Returns the PDF as a Uint8Array. The same Snapshot and the same opts always
 * produce the same bytes, so an archived Revision can be re-derived and
 * compared byte for byte.
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

  masthead(doc, snapshot);
  blockASection(doc, blockA, snapshot, o);
  if (totalMissing || amountMissing) reviewSection(doc);
  blockBSection(doc, blockB, snapshot, o);
  fxSection(doc, snapshot);
  notesSection(doc, o);
  footers(doc);

  return assemble(doc, meta);
}
