/* ============================================================================
   SEE YOU IN LAOS — HS-035 P1 · THE ADMIN GUEST PROFILE (Owners, 21 Nov 2026).

   One guest's information in the H&S admin console (/admin/billing · assets/admin-billing.js), for Haruthai and Suthep
   only, without signing in as the guest. READ ONLY: nothing here writes, nothing is stored in the browser. The data is
   the server's (GET /api/billing/admin/profile — src/admin-profile.js, an allowlist); this file only draws it.

   EVERY VALUE A GUEST TYPED IS TEXT, NEVER MARK-UP: each one goes through the console's own esc() — the console keeps the
   admin's sign-in in this browser, so a guest's answer must never be able to run in this page.

   Every line names where it comes from: "now" (what is stored today), "as sent" (the version the guest sent, read as the
   Guest Relations e-mail reads it), "draft · not sent". A read that failed says so — never an empty answer. What P1 does
   not record yet (own flights, transfers, gifts, Guest Relations tasks) says so too (HS-035 P3 · E28 · E35 · E36).
   ========================================================================== */
(function () {
  'use strict';
  var WHO = { BRIDE: 'Haruthai', GROOM: 'Suthep' };
  var KIND = { passport: 'Passport', flight: 'Flight document', other: 'Document' };

  function render(P, h) {
    /* day() and when() answer HTML-safe text already (a date, or the console's own escaped fallback) — never escaped twice */
    var esc = h.esc, day = h.day, when = h.when;
    var I = P.identity || {}, St = P.status || {}, C = P.confirmation || {}, N = P.contactNow, Sx = P.sent, D = P.draft, Now = P.now || {}, R = P.readable || {};
    function row(k, v) { return '<p class="t-b2 ab-kv"><span class="t-l1">' + esc(k) + '</span> <span>' + v + '</span></p>'; }
    function txt(v) { return v ? esc(v) : '<span class="ab-mute">—</span>'; }
    function chip(t, cls) { return '<span class="ab-chip ' + (cls || '') + '">' + esc(t) + '</span>'; }
    function src(t) { return '<span class="ab-pf-src">' + esc(t) + '</span>'; }
    function none(t) { return '<p class="t-b2 ab-mute">' + esc(t) + '</p>'; }
    function section(key, title, inner) {
      return '<details class="p-card ab-pf" open data-ab-pf="' + key + '"><summary class="ab-pf-sum"><span class="t-l1">' + key + '</span> ' + esc(title) + '</summary><div class="ab-pf-body">' + inner + '</div></details>';
    }
    function by(role, actor) {
      if (role === 'BILLING_ADMIN') return WHO[actor] || 'Haruthai or Suthep';
      return 'Guest Relations' + (actor && actor !== 'guest-relations' ? ' (' + actor + ')' : '');
    }
    var sentShort = Sx ? 'version ' + Sx.version + (Sx.sentAt ? ' · ' + day(Sx.sentAt) : '') : '', sentLabel = Sx ? 'as sent · ' + sentShort : '';

    /* ---- the head: who, the invitation by its id (never its code · E33), the states ---- */
    var name = h.registerName || (Sx && Sx.name.invitation) || I.guestId || I.invitationId;
    var written = N && (N.firstName || N.lastName) ? [N.firstName, N.lastName].filter(Boolean).join(' ') : '';
    var sentState = R.record === false ? chip('Trip could not be read just now', 'open')
      : !St.sent ? chip('Not sent yet', '')
      : St.sentUnreadable ? chip('Sent · the stored trip could not be read', 'open')
      : chip((St.notJoining ? 'Reply · not joining' : 'Sent') + ' · version ' + St.version, 'on') + ' <span class="ab-mute">' + when(St.lastSentAt) + (St.firstSentAt && St.firstSentAt !== St.lastSentAt ? ' · first sent ' + day(St.firstSentAt) : '') + '</span>';
    var unsent = !St.sent ? '' : St.unsent === true ? chip('Changes not sent yet', 'open') : St.unsent === false ? chip('No unsent changes', 'on') : chip('Unsent changes could not be checked', 'open');
    var conf = R.confirmation === false ? chip('Confirmation could not be read', 'open')
      : C.state === 'CONFIRMED' ? chip('Confirmed', 'on') + ' <span class="ab-mute">' + (C.version ? 'version ' + esc(C.version) + ' · ' : '') + day(C.confirmedAt) + ' · by ' + esc(by(C.role, C.actor)) + '</span>'
      : C.state === 'LAPSED' ? chip('Sent again · waiting for confirmation', 'open')
      : St.sent ? chip('Waiting for confirmation', 'open') : '<span class="ab-mute">—</span>';
    var head = '<div class="p-card ab-guest ab-pf-head"><p class="t-l1"><a href="/admin/billing#guests" class="ab-back" data-ab-back>← All guests</a></p>' +
      '<h2 class="t-d1 ab-h">' + esc(name) + '</h2>' +
      (written && written !== name ? '<p class="t-b2 ab-mute">Name as the guest writes it: ' + esc(written) + '</p>' : '') +
      '<div class="ab-grid2">' +
      row('Invitation', '<span data-i18n-skip>' + esc(I.invitationId) + '</span> · ' + esc(I.guestId) + (I.hosts ? ' · host' : '') + ' <span class="ab-mute">· the invitation code is never shown</span>') +
      row('Party · person', txt([I.partyId, I.contactId, I.couple].filter(Boolean).join(' · '))) +
      row('Trip', sentState) +
      (unsent ? row('Since sending', unsent) : '') +
      row('Guest Relations', conf) +
      row('Last change in the draft', St.draftReadable ? (St.draftUpdatedAt ? when(St.draftUpdatedAt) : '<span class="ab-mute">no draft</span>') : chip('The draft could not be read', 'open')) +
      '</div><div class="ab-actions"><a class="p-act" href="/admin/billing#holder=' + encodeURIComponent(I.invitationId) + '" data-ab-pf-finance>Finance &amp; statements</a>' +
      '<span class="ab-mute ab-pf-note">Booked value, statement, payments and e-mail log — the heavier financial view, opened only from here.</span></div></div>';

    /* ---- A · personal & contact: now beside as sent ---- */
    var a = '';
    var pairs = [['First name', N && N.firstName, Sx && Sx.name.first], ['Last name', N && N.lastName, Sx && Sx.name.last], ['E-mail', N && N.email, Sx && Sx.contact.email], ['Mobile', N && N.phone, Sx && Sx.contact.phone],
      ['Date of birth', N && N.birthdate, Sx && Sx.contact.birthdate], ['Nationality', N && N.nationality, Sx && Sx.contact.nationality],
      ['Address', N ? [N.address1, N.address2, [N.postal, N.city].filter(Boolean).join(' '), N.region, N.country].filter(Boolean).join(', ') : '', Sx && Sx.contact.address]];
    a += '<table class="ab-pf-tbl"><thead><tr><th></th><th>Now ' + src('contact on file') + '</th><th>' + (Sx ? 'As sent ' + src(sentShort) : 'As sent') + '</th></tr></thead><tbody>' +
      pairs.map(function (p) { return '<tr><th scope="row">' + esc(p[0]) + '</th><td data-l="Now">' + (R.contact === false ? '<span class="ab-chip open">could not be read</span>' : txt(p[1])) + '</td><td data-l="As sent">' + (Sx ? txt(p[2]) : '<span class="ab-mute">not sent</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
    if (Sx && Sx.partyName) a += row('Party', esc(Sx.partyName));
    if (!N && R.contact !== false) a += none('No contact details on file yet.');

    /* ---- B · travel & stays ---- */
    var b = '<h3 class="t-l1 ab-pf-h">Rooms now ' + src('room assignments') + '</h3>';
    if (!Now.roomsReadable) b += '<p class="t-b2"><span class="ab-chip open">The rooms could not be read just now</span></p>';
    else if (!Now.rooms.length) b += none('No room and no waiting-list place held.');
    else b += Now.rooms.map(function (r) { return row(r.stageName, r.waitlisted ? chip('Waiting list' + (r.position ? ' · number ' + r.position : ''), 'open') + (r.size > 1 ? ' <span class="ab-mute">for ' + esc(r.size) + ' places</span>' : '') : esc(r.hotel) + ' · ' + esc(r.room)); }).join('');
    if (Sx) {
      b += '<h3 class="t-l1 ab-pf-h">The trip ' + src(sentLabel) + '</h3>';
      if (Sx.scope) b += row('Where they join us', esc(Sx.scope));
      Sx.travel.forEach(function (t) { b += row(t.name, txt(t.meta)); });
      Sx.stays.forEach(function (x) { b += row(x.name, esc([x.dates, x.category, x.room, x.breakfast, x.note].filter(Boolean).join(' · ')) + (x.interest ? ' <span class="ab-mute">· interest</span>' : '')); });
      Sx.waitlisted.forEach(function (w) { b += row(w.name, chip('Waiting list' + (w.position ? ' · number ' + w.position : ''), 'open')); });
      Sx.experiences.forEach(function (e) { b += row(e.name, esc([e.meta, e.status].filter(Boolean).join(' · '))); });
      if (Sx.stages.length) b += '<details class="ab-pf-more"><summary class="t-b2">Every stage answer as sent</summary>' + Sx.stages.map(function (s) { return row(s.label, esc(s.value)); }).join('') + '</details>';
      if (!Sx.travel.length && !Sx.stays.length && !Sx.experiences.length) b += none('Nothing selected in the trip as sent.');
    } else b += none('The guest has not sent a trip yet.');
    b += '<h3 class="t-l1 ab-pf-h">Documents ' + src('now · kind and day received only') + '</h3>';
    if (!P.documents) b += '<p class="t-b2"><span class="ab-chip open">The documents could not be checked just now</span></p>';
    else {
      ['passport', 'flight'].forEach(function (k) {
        var d = P.documents.filter(function (x) { return x.kind === k && (!x.guestId || x.guestId === I.guestId); })[0];
        b += row(KIND[k], d ? chip('Received', 'on') + (d.receivedAt ? ' <span class="ab-mute">' + day(d.receivedAt) + '</span>' : '') : chip('Not received', ''));
      });
    }
    b += row('Own flights', '<span class="ab-mute">Not recorded yet · ' + esc(P.notRecorded && P.notRecorded.flights || '') + '</span>');
    b += row('Transfers', '<span class="ab-mute">Not recorded yet · ' + esc(P.notRecorded && P.notRecorded.transfers || '') + '</span>');

    /* ---- C · the wedding programme & seats ---- */
    var c = '<h3 class="t-l1 ab-pf-h">Seats now ' + src('seating plan') + '</h3>';
    if (!Now.seatsReadable) c += '<p class="t-b2"><span class="ab-chip open">The seats could not be read just now</span></p>';
    else {
      c += row('Vow Ceremony', Now.seats.ceremony ? esc(Now.seats.ceremony.label) : '<span class="ab-mute">no seat held</span>');
      c += row('Wedding Dinner', Now.seats.dinner ? esc(Now.seats.dinner.label) : '<span class="ab-mute">no seat held</span>');
    }
    if (Sx) {
      c += '<h3 class="t-l1 ab-pf-h">The answers ' + src(sentLabel) + '</h3>';
      Sx.wedding.forEach(function (e) { c += row(e.label, (e.answer ? esc(e.answer) : '<span class="ab-mute">Not answered yet</span>') + ' <span class="ab-mute">· ' + esc(e.when + ' · ' + e.place) + '</span>'); });
      if (Sx.finale) c += row('After the dinner', esc(Sx.finale));
      if (Sx.sangkhathan) c += row('Sangkhathan', esc(Sx.sangkhathan));
      if (Sx.seats.ceremony || Sx.seats.dinner) c += row('Seats as sent', esc(['Vow ' + (Sx.seats.ceremony || '—'), 'Dinner ' + (Sx.seats.dinner || '—')].join(' · ')));
      if (Sx.participation.length) c += '<details class="ab-pf-more"><summary class="t-b2">Participation as sent</summary>' + Sx.participation.map(function (s) { return row(s.label, esc(s.value)); }).join('') + '</details>';
    } else c += none('The guest has not sent their answers yet.');

    /* ---- D · preferences (About the guest) ---- */
    function answers(allergy, list, label) {
      var out = row('Food allergies', allergy.answer === 'yes' ? '<b>' + (allergy.details ? esc(allergy.details) : 'Yes · no details given') + '</b>' : allergy.answer === 'no' ? 'None' : '<span class="ab-chip open">Not answered</span>');
      list.forEach(function (q) { out += row(q.label, q.value ? esc(q.value) : '<span class="ab-mute">—</span>'); });
      return '<h3 class="t-l1 ab-pf-h">' + esc(label) + '</h3>' + out;
    }
    var d = '';
    if (Sx) d += answers(Sx.allergy, Sx.answers, 'As sent · ' + sentShort);
    if (D) d += '<div class="ab-pf-draft">' + answers(D.allergy, D.answers, 'Draft · not sent') + '</div>';
    if (!Sx && !D) d += none(St.draftReadable ? 'No answers yet — nothing sent and no draft answers.' : 'No answers sent; the draft could not be read just now.');
    var acks = (Sx ? Sx.acknowledgements : []).map(function (k) { return row(k.label, esc(k.value) + ' ' + src('as sent')); });
    if (P.acknowledgements) {
      acks.push(row('Note from Guest Relations', P.acknowledgements.note.acknowledged ? 'Acknowledged <span class="ab-mute">' + day(P.acknowledgements.note.at) + '</span>' : '<span class="ab-mute">Not acknowledged</span>'));
      acks.push(row('Unwritten Rules', P.acknowledgements.rules.acknowledged ? 'Acknowledged <span class="ab-mute">' + day(P.acknowledgements.rules.at) + '</span>' : '<span class="ab-mute">Not acknowledged</span>'));
    }
    if (acks.length) d += '<h3 class="t-l1 ab-pf-h">Acknowledgements</h3>' + acks.join('');

    /* ---- E · finance (the money stays in its own view) ---- */
    var e = '<p class="t-b2">Booked value, the statement, payments and the e-mail log are in the financial view. It reads Google and recalculates the amounts, so it opens only when you ask for it.</p>' +
      '<div class="p-actions"><a class="p-act" href="/admin/billing#holder=' + encodeURIComponent(I.invitationId) + '" data-ab-pf-finance>Open finance &amp; statements</a></div>';

    /* ---- F · amenities (E36) and G · Guest Relations (E28) — not recorded yet, said as such ---- */
    var f = row('Invitation Gift', '<span class="ab-mute">per invitation · not recorded yet · ' + esc(P.notRecorded && P.notRecorded.amenities || '') + '</span>') +
      row('Welcome Gift', '<span class="ab-mute">per arriving guest · not recorded yet · ' + esc(P.notRecorded && P.notRecorded.amenities || '') + '</span>');
    var g = row('Confirmation', conf) +
      row('Requests, tasks, notes', '<span class="ab-mute">Not recorded yet · ' + esc(P.notRecorded && P.notRecorded.guestRelations || '') + '</span>');

    /* ---- H · history ---- */
    var hh = '';
    if (Sx) hh += row('Trip', 'version ' + esc(Sx.version) + (Sx.firstSentAt ? ' · first sent ' + when(Sx.firstSentAt) : '') + (Sx.sentAt && Sx.sentAt !== Sx.firstSentAt ? ' · latest ' + when(Sx.sentAt) : '') + (Sx.reference ? ' <span class="ab-mute" data-i18n-skip>· ' + esc(Sx.reference) + '</span>' : ''));
    (C.history || []).slice().reverse().forEach(function (x) {
      hh += row(x.action === 'unconfirm' ? 'Confirmation withdrawn' : 'Confirmed', when(x.at) + ' · by ' + esc(by(x.role, x.actor)) + (x.version ? ' · version ' + esc(x.version) : '') + (x.note ? ' <span class="ab-mute">· ' + esc(x.note) + '</span>' : ''));
    });
    if (!hh) hh = none('Nothing recorded yet.');
    hh += '<p class="t-b2 ab-mute">Seat and room moves are in Seating and Room assignments; statements and payments in the financial view.</p>';

    return head +
      section('A', 'Personal & contact', a) +
      section('B', 'Travel, stays & documents', b) +
      section('C', 'Wedding programme & seats', c) +
      section('D', 'Preferences · about the guest', d) +
      section('E', 'Finance', e) +
      section('F', 'Amenities', f) +
      section('G', 'Guest Relations', g) +
      section('H', 'History', hh);
  }

  window.SIYL_ADMIN_PROFILE = { render: render };
})();
