/* Shared editorial footer for the shop pages.
 * The menu itself is the site-wide full-screen menu in assets/aman.js — ONE
 * menu for the whole website. The internal engine (register/) is deliberately
 * absent from every guest surface. */
(function () {
  'use strict';
  /* Shared editorial footer — same navigation truth as the drawer, one system
   * with the recon shell footer. No invented channels, no LINE ID. */
  function foot() {
    if (document.querySelector('.sfoot')) return;
    var f = document.createElement('footer');
    f.className = 'sfoot';
    f.innerHTML =
      '<div class="sfoot-in">' +
        '<div><p class="sf-brand">see you in laos<span class="dot">.</span></p></div>' +
        '<div><h4>Discover</h4>' +
          '<a href="destination.html">Destinations</a><a href="journeys.html">The Journey</a>' +
          '<a href="accommodation.html">Stays</a><a href="experiences.html">Experiences</a>' +
          '<a href="marsilea.html">Wellness</a></div>' +
        /* THE HIGHLIGHTS, in the order of the days (Window 007, TO-00021): Bangkok tables before and after the wedding — never under The Wedding */
        '<div><h4>Highlights</h4>' +
          '<a href="experience.html?id=bkk-suhring">Dinner at Sühring</a>' +
          '<a href="experience.html?id=bkk-baanphraya">Dinner at Baan Phraya</a>' +
          '<a href="1872.html">Champagne Afternoon Tea at 1872</a>' +
          '<a href="experience.html?id=bkk-cannubi">Dinner at Cannubi</a></div>' +
        '<div><h4>The Wedding</h4>' +
          '<a href="voyage.html#temple">Temple Ceremony</a>' +
          '<a href="voyage.html#coffee">Coffee &amp; Cake</a>' +
          '<a href="voyage.html#vows">Vow Ceremony</a>' +
          '<a href="voyage.html#dinner">Wedding Dinner</a></div>' +
        '<div><h4>Your invitation</h4>' +
          '<a href="your-journey.html">My Trip</a>' +
          '<a href="cart.html">My Bag</a>' +
          '<a href="tickets.html">Your tickets</a></div>' +
        '<div><h4>Guest Relations</h4>' +
          '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a></div>' +
      '</div>' +
      '<p class="sf-legal">Sunday, 28 February 2027 · Vientiane, Laos</p>';
    document.body.appendChild(f);
  }

  function init() { foot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
