/* ACCESS, before the first paint (Owner, 16 Sep 2026): the document says whether a guest is signed in —
   <html data-session="in|out"> — so a public page can keep its private fragments (prices, inventory,
   actions) out of the first paint and show the way in instead. assets/invite.mjs keeps the attribute
   current after that; the rule of a valid session is the same one: one guest, its own invitation, a bearer. */
(function () {
  var ok = false;
  try { var v = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); ok = !!(v && v.guestId && v.bearer && v.invitationId === 'INV-' + v.guestId); } catch (e) {}
  document.documentElement.setAttribute('data-session', ok ? 'in' : 'out');
})();
