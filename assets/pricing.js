/* ============================================================================
   SEE YOU IN LAOS — THE CATALOGUE AND ITS WORDS.

   THIS FILE NO LONGER CALCULATES AN AUTHORITATIVE AMOUNT (Owner, 4 Oct 2026).
   Every payable figure now comes from the one server-side Billing Engine, which
   reads the approved Google source, applies the Named Special Rates and the
   hosted-night rules, and hands the finished amount to the browser through
   assets/billing-client.js (window.SIYL_BILLING). What stays here is the
   catalogue — names, rooms, windows, images, notes — and the formatting.

   `quote()` therefore asks SIYL_BILLING for the amount and returns null when
   the server has not answered. Nothing in this file multiplies a rate by a
   number of nights any more; a surface that finds no amount shows none, rather
   than a number the browser invented.

   The historical note below records what the rule WAS, because the wording on
   the pages still has to match it. It is documentation, not arithmetic.
   ---------------------------------------------------------------------------
   PREVIOUSLY — THE SINGLE CALCULATION SOURCE.

   Every amount on every surface is produced here and nowhere else:
   the product page, Add to Your Journey, the Journey Bag, Your Journey,
   Your Costs, the sticky total and Review & Send all read these functions.
   Nothing downstream multiplies, rounds or re-derives an amount.

   Accommodation is priced from the Owner's approved Accommodation_Details:
   a per-person / per-night RATE and the number of PAYABLE nights in the window.
       total per person = rate × payable nights
   `n` is how many nights the window covers; `pay` is how many of them the guest
   contributes. They differ in exactly one place — the Wedding Stay.
   Transport is priced per person for the leg (a package, not a nightly rate).

   VIENTIANE, verified against the source on 08 September 2026:
     PRE-WEDDING STAY  25 – 27 FEB      n 2 · pay 2 → rate × 2   (both nights)
     WEDDING STAY      27 FEB – 01 MAR  n 2 · pay 1 → rate × 1   (second night
                                        complimentary, hosted by Bride & Groom)
   The two windows run back to back: 27 February is the transition day and no
   night is uncovered. The Wedding Stay stays ONE selection — the complimentary
   night is a note inside that item, never a second line and never a USD 0 row.
   ========================================================================== */
(function () {
  'use strict';

  /* per-person amounts for the legs that are not priced by night */
  /* ---------------------------------------------------------------- CLASSES
   * One flight, ONE approved fare (Owner, 4 Oct 2026): Business Class is withdrawn and Economy Flexible is USD 167.50 per
   * person, as the Google sheet states. A Bag line saved with the withdrawn fare is re-derived on load (repriceFlat below) as
   * Economy Flexible at USD 167.50 — the guest's flight stays in their journey, never dropped. The fare stays a class (cls on
   * the line), so a travel pass and the fare card keep reading the chosen fare. */
  var CLASSES = {
    'mu9646': [
      { slug: 'economy-flexible', name: 'MU9646 · Vientiane → Kunming', short: 'Economy Flexible',
        meta: '1 March 2027 · Economy Flexible', price: 167.5, preferred: true,
        img: 'assets/images/transport/mu9632-business-1.jpg',
        basis: 'USD 167.50 per person · 1 seat · Economy Flexible',
        notes: ['1 piece of checked baggage', 'No meal on board', 'Free rescheduling before departure',
                'Refund possible before departure, under conditions'] }
    ]
  };

  var FLAT = {
    'train':  { price: 100, cat: 'Transportation', name: 'Special Express No. 25',
                meta: '24 – 25 February 2027 · First Class Sleeper', img: 'assets/images/transport/train-no25-srt-train.jpg',
                basis: 'USD 100 per person · a First Class Sleeper berth and the van across the border to Vientiane' },
    'mu9646': { price: 167.5, cat: 'Transportation', name: 'MU9646 · Vientiane → Kunming',
                meta: '1 March 2027 · Economy Flexible', img: 'assets/images/transport/mu9632-business-1.jpg',
                basis: 'USD 167.50 per person · 1 seat · Economy Flexible' },
    /* C86 · USD 105 per person — the CURRENT Operations Master (Overview, Accommodation and Rooming, Budget "Approve by
     * Suthep, 18.09.2026") wins over the earlier website override of 85 (Owner instruction, 19 Sep 2026: the current master
     * is the source of truth for every price) */
    'c86':    { price: 105, cat: 'Transportation', name: 'C86 · Kunming → Lijiang',
                meta: '4 March 2027 · Business Class', img: 'assets/images/transport/c642-train-snow-mountain.jpg',
                basis: 'USD 105 per person · 1 seat · Business Class' },
    'return': { price: 200, cat: 'Transportation', name: 'MU5922 + MU741 · Lijiang → Bangkok',
                meta: '6 March 2027 · Economy Flexible', img: 'assets/images/transport/mu5924-economy-cabin-1.jpg',
                basis: 'USD 200 per person · 1 seat · Economy Flexible · via Kunming' },
    /* THE HIGHLIGHTS (Owner, 20 Sep 2026): the premium tables are optional restaurant REQUESTS — one line per guest, the
     * chosen menu's own price, in the journey total like every other per-person line. The request is arranged through the
     * Journey workflow — never a confirmed reservation, no availability promised. The USD amounts are the Owner's rounded
     * website prices of the houses' menu prices; beverages, pairings and supplements are not products here, and the houses'
     * service charge and tax are theirs (the basis says so). The basis carries the price only (PRQ-04-12): the request state
     * ("Guest Relations will confirm your table") is said by the surfaces, once. */
    'suhring': { price: 294, cat: 'Restaurant', name: 'Sühring',
                meta: 'Dinner · Sunday, 21 February 2027 · Bangkok', img: 'assets/images/experiences/bkk-suhring-01.jpg',
                basis: 'USD 294 per person · the Erlebnis menu (THB 9,800) · beverages not included',
                /* the two menu prices of the house's own menu card (the Owner's upload): the complete Erlebnis and the shorter sequence */
                menus: [
                  { slug: 'erlebnis', name: 'Erlebnis · the complete menu', thb: 'THB 9,800', price: 294, preferred: true, basis: 'USD 294 per person · Erlebnis, the complete menu (THB 9,800) · beverages not included' },
                  { slug: 'erlebnis-short', name: 'Erlebnis · the shorter sequence', thb: 'THB 7,800', price: 234, basis: 'USD 234 per person · Erlebnis, the shorter sequence (THB 7,800) · beverages not included' }
                ] },
    'baanphraya': { price: 114, cat: 'Restaurant', name: 'Baan Phraya',
                meta: 'Dinner · Tuesday, 23 February 2027 · Bangkok', img: 'assets/images/experiences/bkk-baanphraya-01.jpg',
                basis: 'USD 114 per person · plus 10% service charge and government tax · the eight-course Thai set menu (THB 3,800)' },
    'cannubi': { price: 165, cat: 'Restaurant', name: 'Cannubi by Umberto Bombana',
                meta: 'Dinner · Sunday, 7 March 2027 · Dusit Thani Bangkok', img: 'assets/images/experiences/bkk-cannubi-01.jpg',
                basis: 'USD 165 per person · plus 10% service charge and government tax · the set menu (THB 5,500)' },
    /* THE 1872 TEA (PRQ-07a-06): one canonical product — priced per TABLE, never per person; one line covers two guests.
       name / meta / img make SIYL_PRICE.items('1872') a real line (tea.html wrote a hard-coded 'tea1872' before) */
    '1872':   { price: 180, cat: 'Experience', unit: 'experience', name: 'Champagne Afternoon Tea at 1872',
                meta: 'One table for two guests', img: 'assets/images/1872/tea-1.jpg',
                basis: 'USD 180 for the table · two guests' },
    /* The Sangkhathan is NOT an admission, a ticket or a hosted wedding cost.
     * It is the guest's own offering, prepared by the hosts and presented by
     * the guest personally. It is priced per guest and it never touches the
     * room inventory ledger — no bed, no capacity, no allocation. */
    'sangkhathan': { price: 15, cat: 'Wedding programme',
                name: 'Sangkhathan Temple Offering',
                meta: 'Sunday, 28 February 2027 · Temple Ceremony',
                img: 'assets/images/temple/sangkhathan-prepared-offerings.jpg',
                basis: 'USD 15 per guest · a personal offering, prepared for you and presented by you' }
  };

  /* a rate with cents is written to the cent (the Yifangju 002: USD 36.33 per person per night) — never three decimals */
  /* an amount with cents is written with both digits (USD 112.50 · USD 36.33) — never three, never one */
  function cents(n) { return Math.round(Number(n) * 100 + 1e-7) / 100; }   /* a half cent rounds up (67.805 → 67.81), never a float artefact down */
  /* AN UNKNOWN AMOUNT IS NEVER "USD 0" (Codex final review, 5 Oct 2026): null, an empty value or a non-number formats as
     nothing — the surface says why there is no amount (pendingWords) instead of printing a zero the guest would read as free */
  function money(n) { if (n == null || n === '' || !isFinite(Number(n))) return ''; n = cents(n); return 'USD ' + n.toLocaleString('en-US', n % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}); }
  /* THE BRIDE & GROOM'S HOSPITALITY (Owner, 28 Sep 2026 · src/gifts.js): a stay may be the couple's gift to one guest — that
   * guest's charge for that one room of that one stay is USD 0, said as "Complimentary · from the Bride & Groom". The hotel's
   * rate never changes; another room of the same stay is priced as usual. The Worker says which (GET /api/gifts, the guest's own
   * bearer); this browser keeps the answer for that guest only, and nothing here is a table of anyone's gifts. */
  var GIFT_KEY = 'siyl.gifts', GIFT_TTL = 10 * 60 * 1000;
  var GIFT_WORDS = { title: 'Complimentary', by: 'from the Bride & Groom', line: 'Complimentary · from the Bride & Groom' };
  function authNow() { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return a && a.guestId && a.bearer ? a : null; } catch (e) { return null; } }
  function giftCache() { try { return JSON.parse(localStorage.getItem(GIFT_KEY) || 'null'); } catch (e) { return null; } }
  function giftsNow() { var a = authNow(), c = a ? giftCache() : null; return c && c.guestId === a.guestId && Array.isArray(c.gifts) ? c.gifts : []; }
  /* the guest's own entry for this room of this window: a gift (nothing to pay), a special rate (the stated total for the window,
   * per person) or an employee rate (the whole room, paid by this guest alone) — src/gifts.js */
  function giftFor(windowId, slug) { var g = giftsNow(); for (var i = 0; i < g.length; i++) if (g[i] && g[i].window === windowId && g[i].room === slug) return g[i]; return null; }
  /* A STAY H&S ALREADY PAID FOR THE GUEST (Owner, Edit 10 · 7 Oct 2026): the server marks it (paidByHS, from a 009 row);
     its amount is what the guest repays through the statement — never "your special rate" beside a listed one */
  var PREPAID_WORDS = 'Already paid for you by Haruthai · you repay Haruthai & Suthep through your statement';
  var BOOKING_WORDS = { prepaid: PREPAID_WORDS + '.', self: 'Guest will book by themselves.', 'bride-groom': 'Will be booked by the bride & groom. It is settled within 21 days after your statement is issued.' };
  /* no leading zero in a date: "06 – 08 March 2027" → "6 – 8 March 2027" */
  function unpad(t) { return String(t == null ? '' : t).replace(/(^|[^\d])0(\d)(?!\d)/g, '$1$2'); }
  var MONTH_RE = /\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/;

  /* "25 → 26 and 26 → 27 February" · "27 → 28 and 28 February → 1 March" — the exact nights an amount buys, so a
   * two-night stay can never be read as one night; a month said by the next night is not said twice (TO-01463/1464) */
  /* the nights a window covers, from its own dates when the data lists none ("1 – 4 March 2027" → 1 → 2, 2 → 3 and 3 → 4 March) */
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function nightsFromDates(dates, n) {
    var m = /^(\d{1,2})(?: (\w+))? – (\d{1,2}) (\w+) (\d{4})$/.exec(String(dates || '').trim());
    if (!m || !n) return null;
    var mi = MONTHS.indexOf(m[2] || m[4]); if (mi < 0) return null;
    var start = new Date(Date.UTC(+m[5], mi, +m[1])), out = [];
    for (var i = 0; i < n; i++) {
      var a = new Date(start.getTime() + i * 864e5), b = new Date(start.getTime() + (i + 1) * 864e5);
      out.push(a.getUTCMonth() === b.getUTCMonth() ? a.getUTCDate() + ' → ' + b.getUTCDate() + ' ' + MONTHS[b.getUTCMonth()] : a.getUTCDate() + ' ' + MONTHS[a.getUTCMonth()] + ' → ' + b.getUTCDate() + ' ' + MONTHS[b.getUTCMonth()]);
    }
    return out;
  }
  function nightsCovered(q) {
    if ((!q.nightsList || !q.nightsList.length) && q.dates) q.nightsList = nightsFromDates(q.dates, q.nights);
    if (!q.nightsList || !q.nightsList.length) return '';
    var list = q.nightsList.map(unpad);
    return list.map(function (n, i) {
      var next = list[i + 1], m = MONTH_RE.exec(n);
      return next && m && next.indexOf(m[1]) >= 0 ? n.replace(MONTH_RE, '') : n;
    }).join(' and ');
  }
  /* the display word of a category — the `cat` value itself stays the key every surface compares (TO-00405 … TO-00412) */
  var CAT_WORDS = { Transportation: 'Travel' };
  /* legacy ids of products that still exist under their canonical id */
  var ALIAS = { tea1872: '1872' };

  /* which stay and which window an id belongs to. LEGACY holds the two ids the
   * retired two-row wedding model wrote, so an old bag can still be migrated. */
  var LEGACY = { 'wedstay-n1': 'wedstay', 'wedstay-n2': 'wedstay' };
  /* A REPLACED ROOM IS READ AS ITS SUCCESSOR (Owner, 28 Sep 2026 · the same map as src/legacy-keys.js): a Bag line of the Siam
     Kempinski's Deluxe Balcony King is the stage's Hotel Muse Bangkok line — the Jatu Room — never dropped, never chosen again */
  var LEGACY_ROOMS = { kempinski: { 'deluxe-balcony-king': 'jatu-room' } };
  function canonicalRoom(windowId, room) { var m = LEGACY_ROOMS[windowId]; return (m && room && m[room]) || room; }
  function locate(windowId) {
    var id = LEGACY[windowId] || windowId;
    var R = window.SIYL_ROOMS || {};
    for (var k in R) {
      var s = R[k];
      for (var i = 0; i < s.windows.length; i++) {
        if (s.windows[i].id === id) return { key: k, stay: s, win: s.windows[i] };
      }
    }
    return null;
  }

  /* THE RATE OF A WINDOW (Owner, 27 Sep 2026 · the Souphattra correction): a room priced per period carries rates[window]; the
   * pre-wedding stay (Package C) and the Wedding Stay (D1) are two periods of the same rooms and never share a rate. A room with
   * one rate has it in every window. */
  /* GOOGLE → ENGINE → WEBSITE (closeout, 7 Oct 2026): once the server has answered, a stay's listed rate is 002's own
     (listRate, at 002's precision) — the catalogue's figure below is only what the page shows before that answer */
  var asking = false;   /* a catalogue that prices by asking this module back is answered from the catalogue, never in a loop */
  function serverRate(windowId, room) {
    if (!room || asking || !billingReady()) return null;
    asking = true;
    try {
      var q = authoritative(windowId, room.slug), v = q && q.listRate != null ? Number(q.listRate) : NaN;
      return isFinite(v) && v > 0 ? v : null;
    } finally { asking = false; }
  }
  function catalogueRate(windowId, room) {
    if (room.rates && room.rates[windowId] != null) return room.rates[windowId];
    return room.rate != null ? room.rate : null;
  }
  function rateOf(windowId, room) {
    if (!room) return null;
    var s = serverRate(windowId, room);
    return s != null ? s : catalogueRate(windowId, room);
  }
  function roomRateOf(windowId, room) {
    if (!room) return null;
    /* only a room priced per period states its room rate (the Souphattra); no other page changes */
    var local = room.roomRates && room.roomRates[windowId] != null ? room.roomRates[windowId] : null;
    if (local == null) return null;
    /* the room the catalogue sleeps, at 002's own per-person rate */
    var s = serverRate(windowId, room), c = catalogueRate(windowId, room);
    return s != null && c ? Math.round(local / c * s * 1e8) / 1e8 : local;
  }
  /* THE ORDER OF ROOMS (closeout, 7 Oct 2026): rooms are ranked by what the ROOM costs a night — the per-person rate × the
     persons the catalogue says it sleeps — so a single room and a double are compared as rooms, never one person's share
     against a whole room. The order is the one the site has always shown; only the figures follow 002. */
  function rankRate(windowId, room) {
    var per = rateOf(windowId, room), c = catalogueRate(windowId, room);
    var whole = room.roomRates && room.roomRates[windowId] != null ? room.roomRates[windowId] : (room.roomRate != null ? room.roomRate : null);
    return per == null || whole == null || !c ? per : whole / c * per;
  }
  function roomOf(stay, slug) {
    var found = null;
    stay.rooms.forEach(function (r) { if (r.slug === slug) found = r; });
    return found;
  }

  /* THE ONE AUTHORITATIVE SOURCE OF AN AMOUNT (Owner, 4 Oct 2026): the server
   * Billing Engine, delivered by assets/billing-client.js. No fallback, no
   * local arithmetic: when it has not answered, there is no amount. */
  function authoritative(windowId, slug) {
    var B = window.SIYL_BILLING;
    if (!B || !B.ready()) return null;
    return (slug ? B.quoteOf(windowId, slug) : B.quoteFor(windowId)) || null;
  }
  function billingReady() { var B = window.SIYL_BILLING; return !!(B && B.ready && B.ready()); }
  function billingFailed() { var B = window.SIYL_BILLING; return !billingReady() && (!B || !!(B.failed && B.failed())); }
  /* WHAT THE SERVER SAYS ABOUT ONE PRODUCT (Codex final review, 5 Oct 2026). The server catalogue answers per website
   * product key (002 · Site_Product_Key), for this guest:
   *   'amount'  — an H&S amount: the standard rate, this guest's Named Special Rate, a hosted 0, or no amount (review)
   *   'self'    — block B: the guest books / pays this themselves; H&S charges nothing and the server states no figure, so
   *               the catalogue's own figure stays the informational amount the guest pays the provider
   *   'none'    — the server catalogue does not contain this product: it is not part of the Guest Settlement, and the
   *               catalogue's own figure is its price
   *   'pending' — the server has not answered yet · 'failed' — it could not answer (or nobody is signed in)
   * Until the server has answered nothing can be known — not even whether a product is in its catalogue — so every
   * amount is pending: never a local number standing in for the server's. */
  function serverAnswer(windowId, slug) {
    if (!billingReady()) return { state: billingFailed() ? 'failed' : 'pending', quote: null };
    var q = authoritative(windowId, slug);
    if (!q) return { state: 'none', quote: null };
    if (q.block === 'B') return { state: 'self', quote: q };
    return { state: 'amount', quote: q };
  }
  /* A STAY H&S ALREADY PAID FOR THIS GUEST (Edit 10): the server's mark on the room shown, else on the room of this window in the
     bag, else on any room of the window. Nothing is known before the server has answered. */
  function prepaidIn(at, slug) {
    if (!billingReady() || !at) return false;
    var s = slug;
    if (!s) { var B = window.SIYL_BAG, line = B && B.get ? B.get().filter(function (x) { return x && x.id === at.win.id; })[0] : null; if (line && line.room) s = line.room; }
    var slugs = s ? [s] : (at.stay.rooms || []).map(function (r) { return r.slug; });
    return slugs.some(function (x) { var q = authoritative(at.win.id, x); return !!(q && q.paidByHS); });
  }
  /* the words where there is no amount yet (never "USD 0") */
  function pendingWords() { return billingFailed() ? 'Price unavailable' : 'Price pending'; }
  /* a flat product's amount (the train, a flight class, a menu, the Sangkhathan …): the server's for a key it prices, the
     catalogue's for a key it does not price, nothing while it has not answered */
  function flatAmount(id, localPrice) {
    var a = serverAnswer(id, null);
    if (a.state === 'amount') {
      var t = a.quote.total == null || !isFinite(Number(a.quote.total)) ? null : cents(a.quote.total);
      return { price: t, pending: false, onRequest: t == null, quote: a.quote, state: a.state };
    }
    if (a.state === 'self' || a.state === 'none') return { price: localPrice == null ? null : localPrice, pending: false, onRequest: localPrice == null, quote: a.quote, state: a.state };
    return { price: null, pending: true, onRequest: false, quote: null, state: a.state };
  }
  /* a flat product's basis words with the amount that is really charged ("USD 100 per person · …" → the server's amount,
     or "Price pending · …" while there is none) */
  function amountTerms(basis) { return String(basis || '').replace(/^USD [\d,]+(?:\.\d+)? (per person|for the table)( · )?/, ''); }
  function flatBasis(id, basis, localPrice) {
    var a = flatAmount(id, localPrice), rest = amountTerms(basis), per = (/^USD [\d,]+(?:\.\d+)? (per person|for the table)/.exec(String(basis || '')) || [])[1] || '';
    if (a.price == null) return (a.pending ? pendingWords() : 'Amount on request') + (rest ? ' · ' + rest : '');
    if (localPrice != null && a.price === cents(localPrice)) return basis;
    return money(a.price) + (per ? ' ' + per : '') + (rest ? ' · ' + rest : '');
  }

  window.SIYL_PRICE = {
    FLAT: FLAT,
    money: money,
    locate: locate,
    rateOf: function (windowId, room) { return rateOf(windowId, room); },
    GIFT_WORDS: GIFT_WORDS,
    giftFor: function (windowId, slug) { return giftFor(windowId, slug); },
    /* the words of a line's amount wherever a line is shown: the gift, else the ordinary amount */
    lineGift: function (x) { return !!(x && x.gift); },
    roomRateOf: function (windowId, room) { return roomRateOf(windowId, room); },

    /* THE quote for one selectable line — the only place rate × nights happens */
    quote: function (windowId, slug) {
      var f = FLAT[windowId];
      if (f) {
        var fa = flatAmount(windowId, f.price);
        return { flat: true, cat: f.cat, unit: f.unit || 'guest', basis: flatBasis(windowId, f.basis, f.price),
                 total: fa.price, rateSource: fa.quote ? fa.quote.rateSource : null,
                 hosted: !!(fa.quote && fa.quote.hosted), pending: fa.pending, onRequest: fa.onRequest, priceState: fa.state };
      }
      var at = locate(windowId);
      if (!at) return null;
      var room = roomOf(at.stay, slug) || at.stay.rooms[0];
      var nights = at.win.n || 1;
      /* `pay` is how many of the window's nights the guest contributes. It is
       * only ever smaller than `nights` where a night is hosted. */
      var pay = at.win.pay || nights;
      var rate = rateOf(at.win.id, room), roomRate = roomRateOf(at.win.id, room);
      /* THE AMOUNT (Owner, 4 Oct 2026 · Codex final review, 5 Oct 2026): the server's for a stay it prices — the standard
       * rate, this guest's Named Special Rate, a hosted 0 — and nothing while it has not answered. The catalogue's own
       * figure (rate × the nights the guest pays) is used only where the server states none: a stay the guest books and
       * pays themselves (block B), or one the server catalogue does not contain. */
      var sa = serverAnswer(at.win.id, room && room.slug);
      var listed = rate == null ? null : cents(rate * pay);
      var sq = sa.quote, serverTotal = sq && sq.total != null && isFinite(Number(sq.total)) ? cents(sq.total) : null;
      var total = sa.state === 'amount' ? serverTotal : (sa.state === 'self' || sa.state === 'none') ? listed : null;
      var q = {
        cat: 'Accommodation',
        unit: 'guest',
        stayKey: at.key,
        stayName: at.stay.name,
        roomName: room ? room.name : '',
        roomSlug: room ? room.slug : '',
        dates: at.win.dates,
        nights: nights,
        pay: pay,
        hosted: nights - pay,
        rate: rate,
        roomRate: roomRate,
        windowFixed: at.win.window === 'fixed',
        nightsList: at.win.nightsList || null,
        breakfast: (room && room.breakfast) || at.stay.breakfast || '',
        note: at.win.note || '',
        noteBy: at.win.noteBy || '',
        /* null means "no amount": not answered yet (pending), could not be answered (unavailable), or no rate (on request) */
        total: total,
        rateSource: sq ? sq.rateSource || null : null,
        priceState: sa.state,
        pending: sa.state === 'pending' || sa.state === 'failed',
        onRequest: (sa.state === 'amount' && serverTotal == null) || ((sa.state === 'self' || sa.state === 'none') && listed == null)
      };
      q.nightly = rate == null ? '' : money(rate) + ' per person per night';
      q.roomNightly = roomRate == null ? '' : money(roomRate) + ' per room per night';
      q.nightsLine = nights + (nights === 1 ? ' night' : ' nights');
      /* the unmistakable presentation: the amount, what it covers, and the
       * exact nights it covers — never the bare words "two-night stay" */
      q.amount = q.total == null ? '' : money(q.total);
      /* under the amount line ("USD 380" + "per person"): "2 nights · 6 – 8 March 2027" (TO-01466) */
      q.totalLine = q.nightsLine + (q.dates ? ' · ' + unpad(q.dates) : '');
      q.nightsCovered = nightsCovered(q);
      /* THE HOSTED NIGHT (PRQ-03-08 · TO-01467): the first night is the guest's, the second the couple's */
      q.contribution = q.hosted > 0
        ? 'First night your cost, ' + money(rate) + ' per person · second night complimentary, hosted by Haruthai & Suthep'
        : (rate == null ? '' : q.nightly + ' × ' + q.nightsLine);
      q.hostedBasis = q.hosted > 0 ? 'per person · first night your cost · second night complimentary, hosted by Haruthai & Suthep' : '';
      /* TO-01311–01313: the amount, what it covers, the exact nights, and the rate per night */
      q.basis = rate == null ? 'Amount on request'
        : q.total == null ? (q.pending ? pendingWords() : 'Amount on request') + ' · ' + q.nightsLine + (q.nightsCovered ? ': ' + q.nightsCovered : '') + (q.nightly ? ' · ' + q.nightly : '')
        : q.amount + ' per person · ' + q.nightsLine + (q.nightsCovered ? ': ' + q.nightsCovered : '') + (q.nightly ? ' · ' + q.nightly : '');
      /* THE GUEST'S OWN ARRANGEMENT. Where the server prices the stay, it alone says whether this guest has one: a Named
       * Special Rate (rateSource SPECIAL_RATE) of USD 0 is the Bride & Groom's gift, any other is the guest's own rate — its
       * amount is the server's, and the browser's gift list (/api/gifts) only names its kind (an employee rate is the whole
       * room). A local gift never changes a server amount (Codex final review, 5 Oct 2026). Where the server states no figure
       * (block B, or a stay outside its catalogue) the catalogue's figure and the guest's own entry stand, as before. */
      var local = rate == null ? null : giftFor(at.win.id, room && room.slug);
      var gift = null;
      if (sa.state === 'amount') {
        if (sq.rateSource === 'SPECIAL_RATE' && q.total != null) {
          gift = sq.paidByHS ? { kind: 'prepaid', charge: q.total }
            : q.total === 0 ? { kind: 'gift', by: (local && local.by) || 'bride-groom' }
            : { kind: local && local.kind && local.kind !== 'gift' ? local.kind : 'special', per: local && local.per, charge: q.total };
        }
      } else if (sa.state === 'self' || sa.state === 'none') gift = local;
      /* a stay H&S already paid whose price 009 still asks for: no amount yet, but the line already says who paid (Edit 10) */
      if (!gift && sa.state === 'amount' && sq && sq.paidByHS) q.personal = 'prepaid';
      if (gift && (gift.kind || 'gift') === 'gift') {
        q.gift = gift.by || 'bride-groom'; q.hotelTotal = listed; q.total = 0;
        q.amount = GIFT_WORDS.title; q.giftBy = GIFT_WORDS.by; q.giftWords = GIFT_WORDS.line;
        q.contribution = q.nightly + ' · the hotel rate, not charged to you';
        q.hostedBasis = GIFT_WORDS.by;
        q.basis = GIFT_WORDS.line + ' · ' + q.nightsLine + (q.nightsCovered ? ': ' + q.nightsCovered : '');
      } else if (gift && typeof gift.charge === 'number') {
        /* A PERSONAL RATE (Owner, 28 Sep 2026 · 002 "Special Rate and Special Payment Terms"): this guest's own charge for the whole
           window — the stated total, never a rate per night; an employee rate is the whole room, paid by this guest alone */
        var room2 = gift.per === 'room';
        q.personal = gift.kind; q.hotelTotal = listed; q.total = cents(gift.charge);
        q.amount = money(q.total); q.per = room2 ? 'for the room' : 'per person';
        q.personalWords = gift.kind === 'employee' ? 'Your employee rate · the whole room, paid by you'
          : gift.kind === 'prepaid' ? PREPAID_WORDS : 'Your special rate';
        /* AN EMPLOYEE RATE IS ITS OWN POOL (002 · W, Owner 29 Sep 2026): the room's own rate per night — never the standard pool's
           per-person rate (column V) beside it, no "listed rate"; the room is the guest's alone */
        if (room2) { q.nightly = money(cents(gift.charge / (pay || nights || 1))) + ' per room per night'; q.roomNightly = ''; }
        /* a stay H&S already paid is no discount on a listed rate: no listed rate beside it, no room rate under it */
        if (gift.kind === 'prepaid') q.roomNightly = '';
        q.contribution = q.personalWords + ' · ' + q.nightsLine + (q.nightly && gift.kind !== 'prepaid' ? (room2 ? ' · ' : ' · the listed rate: ') + q.nightly : '');
        q.hostedBasis = q.per + ' · ' + q.personalWords.charAt(0).toLowerCase() + q.personalWords.slice(1) + ' · ' + q.nightsLine;
        q.basis = q.amount + ' ' + q.per + ' · ' + q.personalWords.charAt(0).toLowerCase() + q.personalWords.slice(1) + ' · ' + q.nightsLine + (q.nightsCovered ? ': ' + q.nightsCovered : '');
      }
      /* THE BOOKING METHOD (002 · "Note for Guest"): who books this stay */
      q.booking = at.win.booking || ''; q.bookingUrl = at.win.bookingUrl || ''; q.bookingWords = BOOKING_WORDS[q.booking] || '';
      /* a stay H&S already paid for this guest is not the guest's to book: no hotel link, the words say who paid */
      if (sq && sq.paidByHS) { q.booking = 'prepaid'; q.bookingUrl = ''; q.bookingWords = BOOKING_WORDS.prepaid; }
      return q;
    },

    /* the ONE bag line a selection produces. `put` replaces in place, so a
     * change never duplicates and a stay is never split across two rows. */
    /* A flat product may be sold in more than one class. Exactly one class is
     * ever active, so the classes share the product's id: choosing the second
     * replaces the first in the journey, the way a room category does. */
    CLASSES: CLASSES,
    classesOf: function (id) { return CLASSES[id] || []; },
    /* the menus of a house (the Highlights): the chosen one, else the preferred, else the first */
    menusOf: function (id) { var f = FLAT[id]; return f && f.menus ? f.menus : []; },
    menuOf: function (id, slug) { var list = this.menusOf(id); return list.filter(function (m) { return m.slug === slug; })[0] || list.filter(function (m) { return m.preferred; })[0] || list[0] || null; },
    classOf: function (id, slug) {
      var list = CLASSES[id] || [];
      return list.filter(function (c) { return c.slug === slug; })[0] ||
             list.filter(function (c) { return c.preferred; })[0] || list[0] || null;
    },

    items: function (windowId, slug) {
      /* THE AMOUNT ON A LINE (Codex final review, 5 Oct 2026): the server's for a product it prices, the catalogue's only
         where the server states none, and — while it has not answered — no amount at all: `price: null` with
         `pricePending`. A pending amount never changes what the line IS: a priced selection stays a selection. */
      function priced(line, a) { line.price = a.price; if (a.pending) line.pricePending = true; else if (a.onRequest) line.priceOnRequest = true; return line; }
      var c = CLASSES[windowId] ? this.classOf(windowId, slug) : null;
      if (c) return [priced({ id: windowId, name: c.name, meta: c.meta, price: null,
                       img: c.img, cls: c.slug }, flatAmount(windowId, c.price))];
      var f = FLAT[windowId];
      /* a house with several menus (Sühring): the chosen menu's own price and name travel on the line — one line per house */
      /* the menu is named in the line as "Erlebnis, the shorter sequence" (TO-01447; the menu's own name stays as it is) */
      if (f && f.name && f.menus) { var m = this.menuOf(windowId, slug); return [priced({ id: windowId, name: f.name, meta: f.meta + ' · ' + String(m.name).replace(' · ', ', '), price: null, img: f.img, menu: m.slug }, flatAmount(windowId, m.price))]; }
      if (f && f.name) return [priced({ id: windowId, name: f.name, meta: f.meta, price: null, img: f.img }, flatAmount(windowId, f.price))];
      var at = locate(windowId);
      if (!at) return [];
      /* a room asked for by name that the website no longer offers yields no line — never another room's (Owner, 24 Sep 2026) */
      var room = roomOf(at.stay, slug) || (slug ? null : at.stay.rooms[0]);
      if (!room) return [];
      if (room.notIn && room.notIn.indexOf(at.win.id) >= 0) return [];   /* not offered in this window (002 · G21 / H21 / I21) */
      /* THE ACCOMMODATION MEDIA RULE (Owner, 21 Sep 2026): the line's frame comes from the one resolver — the property's own approved set or nothing */
      var img = window.SIYL_STAY_ART ? window.SIYL_STAY_ART.bag(at.key, room ? room.slug : '', at.win.id) : '';
      /* where a window offers whole properties rather than room categories,
       * the journey line carries the property the guest actually chose */
      var bagName = (room && room.property) || at.win.bagName;
      var q = this.quote(at.win.id, room.slug);
      /* an interest, or a room the catalogue lists without any rate (the Guest House complimentary) — exactly as before; a
         room WITH a rate whose amount the server has not given yet is a priced selection below, its price pending */
      if (room.interest || q.rate == null) {
        var complimentary = at.key === 'guesthouse';
        return [{ id: at.win.id, name: bagName, meta: at.win.dates + ' · ' + (room.status || room.name),
                  interest: !complimentary, complimentary: complimentary,
                  price: complimentary ? 0 : undefined,
                  breakfast: q.breakfast || undefined,   /* EDIT 8: the Guest House says its breakfast is not included (the guest's own cost) on every summary */
                  stay: at.key, room: room.slug, img: img }];
      }
      return [{
        id: at.win.id, name: bagName, meta: at.win.dates + ' · ' + room.name,
        price: q.total, stay: at.key, room: room.slug,
        pricePending: q.total == null && q.pending ? true : undefined,
        priceOnRequest: q.total == null && !q.pending ? true : undefined,
        gift: q.gift || undefined, personal: q.personal || undefined,
        rate: q.rate, nights: q.nights, pay: q.pay,
        nightsList: q.nightsList, windowFixed: q.windowFixed,
        note: q.note, noteBy: q.noteBy,
        breakfast: q.breakfast, img: img
      }];
    },

    /* every id a selection of this window writes (used by add / remove / state).
     * The window id itself is always included so a line saved before the hosted
     * split is cleared by the same Remove. */
    ids: function (windowId) {
      var at = locate(windowId);
      if (!at) return [windowId];
      if (at.win.id !== 'wedstay') return [at.win.id];
      return ['wedstay', 'wedstay-n1', 'wedstay-n2'];   /* legacy rows go too */
    },

    /* NO PRE-RESERVED ROOMS (Owner override, 15 Sep 2026). No room belongs
     * to anyone in advance — not to the hosts, not to the family: every
     * room is available until a guest books a place in it through the room
     * engine, and the couple book their own two places like everyone else.
     * `hosts()` still says who the hosts are (their ceremony positions);
     * it no longer opens or closes any room. */
    hosts: function () {
      try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.hosts === true && a.guestId && a.bearer); } catch (e) { return false; }
    },
    reservedFor: function () { return null; },
    eligible: function (room) { return !!room; },

    /* the most expensive room a guest may actually select. `available` is an
     * optional predicate (slug) → boolean: when the room engine says a
     * category is full, the choice falls to the next best one that is still
     * there rather than to a room nobody can have. */
    premium: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var open = at.stay.rooms.filter(function (r) { return r.rate != null && !r.interest && !(r.notIn && r.notIn.indexOf(at.win.id) >= 0); });
      if (!open.length) return null;
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;      /* the whole stage is sold out */
      return free.reduce(function (m, r) { return rankRate(windowId, r) > rankRate(windowId, m) ? r : m; }, free[0]);
    },

    /* THE FULL EXPERIENCE CHOICE for one accommodation stage.
     * The Owner's approved room comes first. If the shared ledger says it is
     * gone, the choice falls to the nearest ELIGIBLE and AVAILABLE category by
     * rate — the closest to what was approved, and the gentler of two equals —
     * never to whatever happens to be most expensive. `available` is the
     * engine's predicate; without it every room counts as available and the
     * approved room always wins. */
    approved: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var wish = (window.SIYL_FULL_EXPERIENCE || {})[windowId];
      var open = at.stay.rooms.filter(function (r) { return r.rate != null && !r.interest && !(r.notIn && r.notIn.indexOf(at.win.id) >= 0); });
      if (!open.length) return null;
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;                 /* the stage is sold out */
      var first = null;
      open.forEach(function (r) { if (r.slug === wish) first = r; });
      if (!first) return this.premium(windowId, available);   /* no approved room here */
      for (var i = 0; i < free.length; i++) if (free[i].slug === wish) return free[i];
      /* the approved room is gone — the nearest rate, cheaper side first */
      return free.reduce(function (best, r) {
        var fr = rankRate(windowId, first), br = rankRate(windowId, best), rr = rankRate(windowId, r);
        var db = Math.abs(br - fr), dr = Math.abs(rr - fr);
        if (dr < db) return r;
        if (dr === db) return rr < br ? r : best;
        return best;
      }, free[0]);
    },

    /* THE LOWEST-COST ROOM a guest may actually take — the mirror of
     * approved(): same engine predicate, opposite end of the price list. A
     * full category is simply skipped. */
    cheapest: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var open = at.stay.rooms.filter(function (r) { return r.rate != null && !r.interest && !(r.notIn && r.notIn.indexOf(at.win.id) >= 0); });
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;
      return free.reduce(function (m, r) { return rankRate(windowId, r) < rankRate(windowId, m) ? r : m; }, free[0]);
    },

    /* does this product have a genuine alternative to change to? */
    hasVariants: function (windowId) {
      if ((CLASSES[windowId] || []).length > 1) return true;
      var at = locate(windowId);
      if (!at) return false;
      return at.stay.rooms.length > 1;
    },

    /* the window a bag line belongs to (a hosted night points at its window) */
    windowOf: function (id) {
      var at = locate(id);
      return at ? at.win.id : id;
    },

    /* display for one bag line — reads the line, never recalculates it */
    lineBasis: function (x) {
      /* a classed product (MU9646) reads the CHOSEN fare's basis, never the default class's — with the amount really charged */
      if (CLASSES[x.id]) { var c = this.classOf(x.id, x.cls); if (c) return flatBasis(x.id, c.basis, c.price); }
      var mn = FLAT[x.id] && FLAT[x.id].menus && x.menu ? this.menuOf(x.id, x.menu) : null;
      if (mn) return flatBasis(x.id, mn.basis, mn.price);
      var fid = ALIAS[x.id] || x.id, f = FLAT[fid];
      if (f) return flatBasis(fid, f.basis, f.price);
      if (x.interest) return 'Interest · Guest Relations confirms your time · paid at the spa';
      /* a hosted line carries its own COMPLIMENTARY note — it must never also
       * read "Amount on request", which would suggest the price is unknown */
      if (x.complimentary) return '';
      var at = locate(x.id);
      if (at && x.room) {
        var q = this.quote(at.win.id, x.room);
        if (q && q.basis) return q.basis;
      }
      if (x.rate != null && x.nights) {
        return money(x.rate) + ' per person per night · ' + x.nights + (x.nights === 1 ? ' night' : ' nights') +
               ' · ' + (x.price != null ? money(x.price) : this.lineAmount(x)) + ' per person';
      }
      return x.price != null ? money(x.price) + ' per person' : (x.pricePending || x.priceOnRequest ? this.lineAmount(x) : '');
    },
    /* THE AMOUNT OF ONE BAG LINE, as every surface prints it (Codex final review, 5 Oct 2026): the line's own amount; a
       line without one says why — "Price pending" while the server has not answered, "Price unavailable" when it could not,
       "Amount on request" when there is no rate — and never "USD 0". `perQty` multiplies by the line's quantity. */
    lineAmount: function (x, perQty) {
      if (!x) return '';
      if (x.price == null || !isFinite(Number(x.price))) return x.priceOnRequest && !x.pricePending ? 'Amount on request' : pendingWords();
      return money(perQty ? Number(x.price) * (x.qty || 1) : x.price);
    },
    /* is this line's amount still to come from the server */
    linePending: function (x) { return !!(x && !x.interest && !x.complimentary && (x.pricePending || x.price == null) && !x.priceOnRequest); },
    pendingWords: function () { return pendingWords(); },
    /* the amount of a flat product (and of one class or menu of it) as it is charged now, or null while there is none */
    flatPrice: function (id, slug) {
      var c = CLASSES[id] ? this.classOf(id, slug) : null, f = FLAT[id], m = f && f.menus ? this.menuOf(id, slug) : null;
      var local = c ? c.price : m ? m.price : f ? f.price : null;
      return flatAmount(id, local).price;
    },
    /* the basis words of a flat product with the amount really charged */
    flatBasis: function (id, slug) {
      var c = CLASSES[id] ? this.classOf(id, slug) : null, f = FLAT[id], m = f && f.menus ? this.menuOf(id, slug) : null;
      var src = c || m || f; if (!src) return '';
      return flatBasis(id, src.basis, src.price);
    },
    /* the amount of a flat product as words: "USD 100" · "Price pending" · "Price unavailable" */
    flatMoney: function (id, slug) { var p = this.flatPrice(id, slug); return p == null ? pendingWords() : money(p); },
    /* has this page's server answer arrived — Review & Send waits for it whenever the Bag holds a line it prices */
    billingReady: function () { return billingReady(); },
    awaitingQuotes: function (lines) {
      if (billingReady()) return false;
      return (Array.isArray(lines) ? lines : []).some(function (x) { return x && !x.interest && !x.complimentary; });
    },

    /* ---- the catalogue (PRQ-LEAD-01 · W7-026) -------------------------------------------------------------------
     * Does a product exist? `x` is an id or a Bag line. true — the catalogue has it (a stay line also needs its room);
     * false — withdrawn or unknown (My Bag drops it); null — this page cannot tell (the room data SIYL_ROOMS is not
     * loaded): never drop a line on a null. */
    known: function (x) {
      var id = x && typeof x === 'object' ? x.id : x, room = x && typeof x === 'object' ? canonicalRoom(x.id, x.room) : null;
      if (!id) return false;
      id = ALIAS[id] || id;
      if (FLAT[id] || CLASSES[id]) return true;
      if (!window.SIYL_ROOMS) return null;
      var at = locate(id);
      if (!at) return false;
      if (!room) return true;
      var r = roomOf(at.stay, room);
      return !!r && !(r.notIn && r.notIn.indexOf(at.win.id) >= 0);
    },
    /* THE BOOKING METHOD of a window (002 · "Note for Guest", 28 Sep 2026): 'self' — the guest books the hotel themselves (the
       sheet's link, when it gives one); 'bride-groom' — booked by the Bride & Groom, settled within 21 days after the statement is issued */
    /* `slug`: the room the caller shows. Without it, the room of this window in the guest's bag — else any room of the window.
       A stay the server marks as already paid by H&S for this guest (paidByHS · Edit 10) answers 'prepaid': no hotel link. */
    bookingOf: function (windowId, slug) {
      var at = locate(windowId); var w = at && at.win; if (!w || !w.booking) return null;
      if (prepaidIn(at, slug)) return { method: 'prepaid', url: '', words: BOOKING_WORDS.prepaid };
      return { method: w.booking, url: w.bookingUrl || '', words: BOOKING_WORDS[w.booking] || '' };
    },
    BOOKING_WORDS: BOOKING_WORDS,
    PREPAID_WORDS: PREPAID_WORDS,
    offeredIn: function (windowId, room) { return !(room && room.notIn && room.notIn.indexOf(windowId) >= 0); },
    canonical: function (id) { return ALIAS[id] || id; },
    canonicalRoom: canonicalRoom,
    LEGACY_ROOMS: LEGACY_ROOMS,
    /* the amount column of a line (OQ-21 · TO-01616): a spa interest is not a cost of the trip — "Not in your total" */
    amountWords: function (x) {
      if (!x) return '';
      if (x.interest) return 'Not in your total';
      if (x.complimentary && x.price == null) return '';
      return this.lineAmount(x);
    },
    /* the display word of a line's category ("Travel" for the key 'Transportation') */
    catWords: function (cat) { return CAT_WORDS[cat] || cat || ''; },
    /* the lowest fare of a classed product (MU9646 → 167.50): "From USD 167.50 per person" before a fare is chosen */
    fromPrice: function (id) {
      var list = CLASSES[id] || []; if (!list.length) return FLAT[id] ? flatAmount(id, FLAT[id].price).price : null;
      var low = list.reduce(function (m, c) { return c.price < m ? c.price : m; }, list[0].price);
      return flatAmount(id, low).price;
    },
    /* the basis WITHOUT its leading amount — the Highlight sheet prints the amount once (PRQ-07a-05) */
    terms: function (basis) { return String(basis || '').replace(/^USD [\d,]+ (per person|for the table)( · )?/, ''); },
    /* THE "FROM" LINE under a paid stay (TO-01317) — the nights are already in the stay line:
     *   several room types  "From USD 290 per person · from USD 145 per person per night"
     *   the Wedding Stay    "From USD 145 per person"   (the hosted night is said once, in its own sentence)
     *   one room type       "USD 192 per person · USD 64 per person per night" */
    fromLine: function (windowId) {
      var at = locate(windowId); if (!at) return '';
      var self = this, open = at.stay.rooms.filter(function (r) { return r.rate != null && !r.interest && !(r.notIn && r.notIn.indexOf(at.win.id) >= 0); });
      if (!open.length) return '';
      var low = open.reduce(function (m, r) { return rateOf(at.win.id, r) < rateOf(at.win.id, m) ? r : m; }, open[0]);
      var q = self.quote(at.win.id, low.slug); if (!q) return '';
      if (q.total == null) return q.pending ? pendingWords() : '';
      /* an employee rate (002 · W) is the guest's own room: its own amount and its own rate per room — never the standard pool's */
      if (q.personal === 'employee') return money(q.total) + ' ' + q.per + ' · ' + q.nightly;
      /* any other personal charge or gift is the guest's alone: the stay's own line stays the hotel's listing */
      if ((q.personal || q.gift) && q.hotelTotal != null) q = { total: q.hotelTotal, rate: q.rate, hosted: q.hosted };
      if (q.hosted > 0) return 'From ' + money(q.total) + ' per person';
      if (open.length === 1) return money(q.total) + ' per person · ' + money(q.rate) + ' per person per night';
      return 'From ' + money(q.total) + ' per person · from ' + money(q.rate) + ' per person per night';
    }
  };

  /* ---- repricing -------------------------------------------------------
   * ONE PRICE SOURCE (Owner, 15 Sep 2026). A bag line is the guest's choice,
   * never the guest's price: the amount, the name, the words and the picture
   * of every flat product — the train, the flights, C86, the Sangkhathan, the
   * Sühring table — are re-derived from the data above on every load, so a
   * line saved before a price changed can never show one amount
   * on the line and another beneath it, and the total the sticky bar, Your
   * Journey, the bag, Review & Send and the sent journey read is the sum of
   * authoritative amounts. The guest's own flags (qty, request, exp, by) and
   * the chosen class are kept. Runs before the accommodation repricing, with
   * or without the room data on the page. */
  function repriceFlat() {
    var B = window.SIYL_BAG;
    if (!B) return;
    var bag = B.get(), changed = false;
    var next = bag.map(function (x) {
      if (!x || !x.id || x.stay || x.room || x.interest || x.complimentary) return x;
      if (!FLAT[x.id] && !CLASSES[x.id]) return x;
      /* a house with several menus (the Highlights, 20 Sep 2026): the menu the guest chose is re-priced as that menu */
      var fresh = window.SIYL_PRICE.items(x.id, x.menu || x.cls)[0];
      if (!fresh) return x;
      /* THE SERVER ANSWERED "NO AMOUNT" (Codex round 2): an earlier amount never survives it — the line says "Amount on
         request". While the server has NOT answered (pending / unavailable) the line keeps what it has and the send waits. */
      if (fresh.price == null) {
        if (!fresh.priceOnRequest || (x.price == null && x.priceOnRequest && !x.pricePending)) return x;
        changed = true;
        var r0 = {}; Object.keys(x).forEach(function (k) { r0[k] = x[k]; });
        r0.price = null; r0.priceOnRequest = true; delete r0.pricePending;
        return r0;
      }
      var same = x.price === fresh.price && !x.pricePending && !x.priceOnRequest && x.name === fresh.name && x.meta === fresh.meta && (x.cls || null) === (fresh.cls || null) && (x.menu || null) === (fresh.menu || null);
      if (same) return x;
      changed = true;
      var out = {}; Object.keys(x).forEach(function (k) { out[k] = x[k]; });
      out.name = fresh.name; out.meta = fresh.meta; out.price = fresh.price; out.img = fresh.img || x.img;
      delete out.pricePending; delete out.priceOnRequest;
      if (fresh.cls) out.cls = fresh.cls; else delete out.cls;
      if (fresh.menu) out.menu = fresh.menu; else delete out.menu;
      return out;
    });
    if (changed) B.set(next);
  }
  repriceFlat();
  /* A bag saved before the Vientiane price basis was verified against the
   * source holds the pre-wedding window at one night instead of two. Every
   * accommodation line is re-quoted from the data above, so a returning guest
   * never carries a stale amount into Review & Send. */
  function repriceAccommodation() {
    var B = window.SIYL_BAG;
    if (!B || !window.SIYL_ROOMS) return;
    var bag = B.get(), changed = false;
    var next = bag.map(function (x) {
      /* EDIT 8 (Aui, 25 Sep 2026): a saved Guest House line takes the stay's CURRENT breakfast fact (not included, the guest's own cost)
         from the one source — nothing else on the line is re-derived, the place itself belongs to the room engine */
      if (x && x.complimentary && x.id === 'guesthouse') {
        var gh = window.SIYL_PRICE.items(x.id, x.room)[0];
        if (gh && gh.breakfast && x.breakfast !== gh.breakfast) { changed = true; var y = {}; for (var k in x) y[k] = x[k]; y.breakfast = gh.breakfast; return y; }
        return x;
      }
      if (!x.stay || !x.room || x.interest || x.complimentary) return x;
      /* the former Kempinski room: the same line of the same stage, now the Jatu Room — the guest's unit is kept for the room
         engine's own (read-normalised) hold, and the line is re-quoted below by today's rules, a personal rate included */
      var cr = canonicalRoom(x.id, x.room);
      if (cr !== x.room) { var z = {}; for (var zk in x) z[zk] = x[zk]; z.room = cr; x = z; changed = true; }
      /* a line of a room the website no longer offers (the Sathorn Penthouse, deleted — Owner, 24 Sep 2026 · Edit 6) is
         never re-quoted into another room: it leaves the Bag, and the stage asks for a choice again */
      var at = locate(x.id);
      if (at && !roomOf(at.stay, x.room)) { changed = true; return null; }
      var fresh = window.SIYL_PRICE.items(x.id, x.room)[0];
      if (!fresh) return x;
      /* the server answered "no amount" for this stay: the earlier amount goes, the line says so (Codex round 2) */
      if (fresh.price == null) {
        if (!fresh.priceOnRequest || (x.price == null && x.priceOnRequest && !x.pricePending && (x.personal || null) === (fresh.personal || null))) return x;
        changed = true;
        var r1 = {}; for (var rk in x) r1[rk] = x[rk];
        r1.price = null; r1.priceOnRequest = true; delete r1.pricePending;
        if (fresh.personal) r1.personal = fresh.personal; else delete r1.personal;   /* who paid, even without an amount (Edit 10) */
        return r1;
      }
      /* the rate too (closeout): a line keeps no per-night figure the server no longer states */
      if (x.price === fresh.price && x.rate === fresh.rate && x.pay === fresh.pay && x.name === fresh.name && (x.gift || null) === (fresh.gift || null) && (x.personal || null) === (fresh.personal || null) && !('fixed' in x)) return x;
      changed = true;
      fresh.qty = x.qty || 1;           /* the guest's own choice is preserved */
      if (x.unit) { fresh.unit = x.unit; if (x.unitName) fresh.unitName = x.unitName; }   /* …and the unit the engine holds for them */
      if (!fresh.gift) delete fresh.gift; if (!fresh.personal) delete fresh.personal;
      return fresh;                     /* name, meta, amount, basis and who pays are re-derived */
    }).filter(Boolean);
    if (changed) B.set(next);
  }
  repriceAccommodation();
  /* THE SERVER'S ANSWER ARRIVES — OR CANNOT (Codex final review, 5 Oct 2026). Every Bag line it prices takes its amount
     through the Bag's own write path (a real change is saved like any other), and every surface redraws: a pending line
     gets its amount, a price card its figure, an unanswered one its "Price unavailable". The redraw-only event carries
     `repaintOnly`, so nothing is saved when no line changed. */
  function onPrices() {
    repriceFlat(); repriceAccommodation();
    try { document.dispatchEvent(new CustomEvent('siyl:prices')); document.dispatchEvent(new CustomEvent('siyl:bag', { detail: { repaintOnly: true } })); } catch (e) { /* nothing listens */ }
  }
  document.addEventListener('siyl:billing-ready', onPrices);
  document.addEventListener('siyl:billing-failed', onPrices);
  document.addEventListener('siyl:billing-cleared', onPrices);
  /* THE GIFTS OF THIS GUEST, from the Worker (at most every ten minutes, and at once for another guest on this browser); a change
     re-prices the Bag and every surface redraws from it. A failed read keeps what this browser last knew. */
  (function refreshGifts() {
    var a = authNow(); if (!a || typeof fetch !== 'function') return;
    var c = giftCache(); if (c && c.guestId === a.guestId && Date.now() - (c.at || 0) < GIFT_TTL) return;
    var before = JSON.stringify(giftsNow());
    try {
      fetch('/api/gifts', { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) {
          var now = authNow(); if (!j || !j.ok || !now || j.guestId !== now.guestId || j.guestId !== a.guestId) return;
          var gifts = Array.isArray(j.gifts) ? j.gifts : [];
          try { localStorage.setItem(GIFT_KEY, JSON.stringify({ guestId: a.guestId, gifts: gifts, at: Date.now() })); } catch (e) { /* this view only */ }
          if (JSON.stringify(gifts) !== before) { repriceAccommodation(); try { document.dispatchEvent(new CustomEvent('siyl:bag')); document.dispatchEvent(new CustomEvent('siyl:gifts')); } catch (e) { /* nothing listens */ } }
        }, function () { /* offline: what this browser last knew */ });
    } catch (e) { /* no network */ }
  })();

  /* ---- migration -------------------------------------------------------
   * A bag saved while the retired two-row wedding model was live holds
   * wedstay-n1 / wedstay-n2. Collapse it to the ONE Wedding Stay line for the
   * same room, so nobody is left with two complimentary rows. */
  /* the retired complimentary residence line of release 013: a Bag saved before release 014 loses it on load — the only
     complimentary line that exists now is the Guest House; the guest chooses it anew through the engine */
  (function retireResidence() {
    var B = window.SIYL_BAG; if (!B) return;
    var bag = B.get(), kept = bag.filter(function (x) { return !(x && x.complimentary && x.id !== 'guesthouse'); });
    if (kept.length !== bag.length) B.set(kept);
  })();
  (function collapseLegacyWeddingStay() {
    var B = window.SIYL_BAG;
    if (!B || !window.SIYL_ROOMS) return;
    var bag = B.get();
    var legacy = bag.filter(function (x) { return x.id === 'wedstay-n1' || x.id === 'wedstay-n2'; });
    if (!legacy.length) return;
    var slug = legacy[0].room, qty = legacy[0].qty || 1;
    var kept = bag.filter(function (x) { return x.id !== 'wedstay-n1' && x.id !== 'wedstay-n2' && x.id !== 'wedstay'; });
    window.SIYL_PRICE.items('wedstay', slug).forEach(function (it) { it.qty = qty; kept.push(it); });
    B.set(kept);
  })();
})();
