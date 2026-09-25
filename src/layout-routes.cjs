'use strict';
/* THE GUEST-FACING ROUTE MANIFEST (Owner, 25 Sep 2026 · the site-wide layout QA agent). Every page a guest can reach, its
 * page family, and every materially different state it is audited in. The layout auditor (src/layout-qa/audit.mjs)
 * renders each route × state × language × engine × viewport; the release gate L2 fails when a served page is neither
 * here nor excluded with a reason, so a new page is audited the day it is added. Parameterised pages (a room, a
 * transport leg, an experience) are discovered from the data the page itself renders from — never listed by hand. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* families: the kinds of page the Owner reviews as one (docs/LAYOUT-QA.md) */
const ROUTES = [
  { path: '/index.html', family: 'landing' },
  { path: '/voyage.html', family: 'editorial' },
  { path: '/accommodation.html', family: 'accommodation' },
  { path: '/destination.html', family: 'editorial' },
  { path: '/experiences.html', family: 'experience' },
  { path: '/experience.html', family: 'experience', variants: { global: 'SIYL_EXP', expr: "SIYL_EXP.map(function (x) { return { q: '?id=' + x.id, label: x.name || x.title || x.id }; })" } },
  { path: '/journeys.html', family: 'journey-overview' },
  { path: '/room.html', family: 'accommodation', variants: { global: 'SIYL_ROOMS', from: '/journeys.html', expr: "Object.keys(SIYL_ROOMS).reduce(function (a, k) { return a.concat(SIYL_ROOMS[k].rooms.map(function (r) { return { q: '?stay=' + k + '&room=' + r.slug, label: r.name + ' ' + (r.property || SIYL_ROOMS[k].name) }; })); }, [])" } },
  { path: '/transport.html', family: 'product-detail', variants: { global: 'SIYL_TRANSPORT', from: '/journeys.html', expr: "Object.keys(SIYL_TRANSPORT).map(function (k) { return { q: '?id=' + k, label: SIYL_TRANSPORT[k].title || SIYL_TRANSPORT[k].name || k }; })" } },
  { path: '/tea.html', family: 'product-detail' },
  { path: '/1872.html', family: 'product-detail' },
  { path: '/marsilea.html', family: 'product-detail' },
  { path: '/dress.html', family: 'product-detail' },
  { path: '/invitation.html', family: 'registration' },
  { path: '/your-journey.html', family: 'journey-overview' },
  { path: '/wedding.html', family: 'wedding' },
  { path: '/wedding-preparation.html', family: 'wedding' },
  { path: '/about-you.html', family: 'about-you' },
  { path: '/cart.html', family: 'my-bag' },
  { path: '/review.html', family: 'review-send' },
  { path: '/tickets.html', family: 'confirmation' },
  { path: '/profile.html', family: 'profile' },
  { path: '/404.html', family: 'editorial' }
];

/* served files that are not pages of their own — each with its reason */
const EXCLUDED = [
  { file: 'you.html', why: 'a redirect stub to profile.html (kept for old links)' },
  { file: 'documents.html', why: 'a redirect stub to profile.html (the documents live on My Profile)' }
];

/* THE STATES. auth: which synthetic stage guest is signed in (null = signed out). setup: the stage recipe that brings the
 * guest into the state (src/layout-qa/states.mjs, local stage only). panel: an open layer audited on its own wall.
 * routes: '*' or the pages the state changes materially. */
const GUEST_PAGES = ['/your-journey.html', '/journeys.html', '/wedding.html', '/wedding-preparation.html', '/about-you.html', '/cart.html', '/review.html', '/tickets.html', '/profile.html', '/invitation.html', '/room.html', '/transport.html', '/experience.html'];
const STATES = [
  { id: 'signed-out', auth: null, routes: '*', why: 'the public pages, and every private page\'s signed-out face' },
  { id: 'fresh', auth: 'T001', setup: 'reset', routes: GUEST_PAGES, why: 'a guest who has just opened the invitation: empty Bag, nothing chosen' },
  { id: 'planning', auth: 'T001', setup: 'plan', routes: GUEST_PAGES, why: 'a stay held and an experience in the Bag: filled Bag, chosen products, the steps part-done' },
  { id: 'declined', auth: 'T002', setup: 'decline', routes: ['/your-journey.html', '/review.html', '/profile.html', '/cart.html'], why: 'a party member who declined: the mixed-attendance faces' },
  { id: 'mixed', auth: 'T001', setup: null, after: 'declined', routes: ['/your-journey.html', '/review.html', '/profile.html'], why: 'the attending member of a party with one declined guest' },
  { id: 'sent', auth: 'T003', setup: 'send', routes: GUEST_PAGES, why: 'a trip sent: the confirmation, the tickets, the seat plans open, My Profile after sending' },
  { id: 'menu-open', auth: null, panel: '.a-menu', action: 'menu', routes: ['/index.html', '/cart.html', '/experience.html'], why: 'the menu panel open, signed out (public and shop shells)' },
  { id: 'menu-open-guest', auth: 'T003', panel: '.a-menu', action: 'menu', after: 'sent', routes: ['/your-journey.html', '/profile.html'], why: 'the menu panel open for a signed-in guest (account block, the six steps)' },
  { id: 'steps-open', auth: 'T003', panel: '.prep-steps', action: 'steps', after: 'sent', routes: ['/your-journey.html', '/review.html'], why: 'the step index open over a step page' }
];

/* every HTML file the Worker serves: the repository root and one level of folders, less .assetsignore */
function servedPages() {
  const ignore = fs.readFileSync(path.join(ROOT, '.assetsignore'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const ignored = (rel) => ignore.some((pat) => {
    const re = new RegExp('^' + pat.replace(/^\//, '').replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '(/|$)');
    return re.test(rel);
  });
  const out = [];
  for (const f of fs.readdirSync(ROOT)) {
    const full = path.join(ROOT, f);
    if (ignored(f)) continue;
    if (/\.html$/.test(f)) out.push(f);
    else if (fs.statSync(full).isDirectory() && !f.startsWith('.') && f !== 'assets') {
      for (const g of fs.readdirSync(full)) if (/\.html$/.test(g) && !ignored(f + '/' + g)) out.push(f + '/' + g);
    }
  }
  return out.sort();
}

/* THE NEW-ROUTE GUARD: every served page is audited or excluded with a reason; nothing stale is left in the manifest */
function coverage() {
  const served = servedPages();
  const listed = new Set(ROUTES.map((r) => r.path.replace(/^\//, '')));
  const excluded = new Set(EXCLUDED.map((e) => e.file));
  const problems = [];
  for (const f of served) if (!listed.has(f) && !excluded.has(f)) problems.push(f + ' is served but not in the layout route manifest (src/layout-routes.cjs)');
  for (const f of listed) if (!served.includes(f)) problems.push(f + ' is in the manifest but not served');
  for (const e of EXCLUDED) { if (!e.why) problems.push(e.file + ' is excluded without a reason'); if (!served.includes(e.file)) problems.push(e.file + ' is excluded but not served'); }
  for (const s of STATES) { if (!s.why) problems.push('state ' + s.id + ' has no reason'); if (s.routes !== '*') for (const r of s.routes) if (!ROUTES.some((x) => x.path === r)) problems.push('state ' + s.id + ' names an unknown route ' + r); }
  return { served, problems };
}

module.exports = { ROUTES, EXCLUDED, STATES, servedPages, coverage };
