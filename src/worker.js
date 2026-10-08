/**
 * Cloudflare Worker — See You In Laos wedding website.
 *
 * Static guest site served from the ASSETS binding, plus ONE operational
 * route: POST /api/register — the Guest Registration submission endpoint.
 *
 * The endpoint degrades safely: it accepts the structured registration,
 * stores it in KV when a REG_KV binding exists, and forwards a copy to
 * Guest Relations and the guest through the configured email provider (Brevo or Resend, a Worker secret). If neither
 * storage nor forwarding succeeds it returns 503 and the client falls back
 * to the mailto channel — a registration is never silently lost.
 *
 * Plus the ROOM OCCUPANCY routes — /api/rooms[/join|/leave|/mine] — proxied
 * to ONE Durable Object instance ("rooms"): every guest, in every browser and
 * on either deployment, reads and writes the same allocation units, and a
 * place is decided by a single-threaded actor rather than by whoever happens
 * to tap first. The retired category ledger (/api/inventory) answers 410.
 *
 * ONE CODE = ONE GUEST (Owner, 14 Sep 2026): every write — a seat, a room, a
 * journey — is tied to the guest the bearer resolves to (src/auth.js). The
 * identity is passed to the objects in a header the Worker sets itself and
 * strips from every incoming request, so a client can never claim one.
 *
 * No payment collection, no railway/hotel booking APIs, no guest directory.
 */

const GR_EMAIL = 'guest.relation.seeyouinlaos@gmail.com';
const MAX_BODY = 64 * 1024; // 64 KB — structured registrations are small

/* ONE LIVE SITE (Owner, 18 Sep 2026): the Worker is the only runtime; the GitHub Pages mirror is retired and no longer an allowed origin */
const ALLOWED_ORIGINS = [
  'https://seeyouinlaos-website.suthep-hrg.workers.dev',
];
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    /* the document endpoint authenticates with the invitation the client
     * already holds, so those headers must survive the preflight */
    'access-control-allow-headers': 'content-type, x-invitation, x-guest, x-kind, x-filename, x-siyl-auth',
    'access-control-max-age': '7200',
  };
}

/* The Worker is the one runtime: pages and API share this origin, so there is ONE ledger. */
export { Inventory } from './inventory.js';
export { Seating } from './seating.js';
export { Rooms } from './rooms.js';
export { Drafts } from './drafts.js';
/* THE BILLING LEDGER (Owner, 4 Oct 2026 · OWNER-INFRA-CHANGE: H&S Guest Settlement v2.2 FINAL):
   the website side of the Guest Settlement. Guest payments stay canonical in Google
   008_Payment_Journal; this actor holds settlements, revisions and the immutable snapshots. */
export { BillingLedger } from './billing-ledger.js';
import { handleBilling, paidByHSOf } from './billing-routes.js';
import { siteKeyOfSelection } from './billing/bookings.js';
/* THE H&S ADMIN CONSOLE (Owner, 7 Oct 2026): the page, generated from src/admin/billing.html (src/build-admin-page.cjs) */
import ADMIN_PAGE from './admin-page.js';
import { confirmationStands, writeConfirmation, CONFIRMATION_ROLE } from './confirmation.js';
import { identify, owns, loadIndex } from './auth.js';
import { authIdOf } from '../register/crypto.mjs';   /* the one-way derivation the register's index is keyed by (the guest's own document read) */
import { MEDIA_SIZES } from './media-sizes.js';
import { giftsFor, verifiedLines } from './gifts.js';   /* the Bride & Groom's hospitality: one guest's own charge (Owner, 28 Sep 2026) */   /* every film's size, written at build time (src/build-media-sizes.cjs) */
import { SEED } from './inventory-seed.js';
import { canonicalKey, canonicalLines, lineAs, viewAs } from './legacy-keys.js';   /* the replaced Kempinski room read as Hotel Muse Bangkok's Jatu Room (28 Sep 2026) */
import { stageOf, dedicatedStages } from './rooms.js';
import { WEDDING_PEOPLE } from './seating.js';
import { composeGuestMail, composeOwnerMail } from './mail-templates.js';
import { completion as graphCompletion, normalizeScope as graphScope, isRelevant as graphRelevant, STAGES as GRAPH_STAGES, STAGE_IDS as GRAPH_IDS, participationOf as graphParticipation, partyNeed as graphPartyNeed, travelsIn as graphTravels } from './stage-graph.js';
import { profileMissing as questionnaireMissing, finaleOf, PHOTO_LABEL, GENRES } from './questionnaire.js';   /* the one questionnaire: what About You and the wedding night require (Owner, 22 Sep 2026) */

/* ---- the Guest Relations gate (F + G) ------------------------------------
 * A secret set with `wrangler secret put GR_TOKEN`, compared in constant
 * time. It never appears in client code; the guest cannot confirm a journey,
 * open seating or allocate a chair. */
function grAuthorised(request, env) {
  const given = request.headers.get('x-gr-token') || '';
  const secret = env.GR_TOKEN || '';
  if (!secret || !given || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
const GR_SEATING_OPS = ['config', 'state', 'assign', 'unassign', 'plan', 'rekey', 'reset'];
/* the writes a signed-in guest may make on their own accommodation — the paid extension is one of them (Owner, 22 Sep 2026) */
const GUEST_ROOMS_WRITES = ['join', 'leave', 'wait', 'unwait'];
const GR_ROOMS_OPS = ['plan', 'migrate', 'assign', 'unassign', 'reset'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    lastOrigin = url.origin;

    /* THE GUEST SETTLEMENT (Freeze v2.2 FINAL). Everything under /api/billing/ is
     * authenticated: a guest reaches only their own Holder, the administration routes
     * resolve server-side to Haruthai and Suthep. The Owner's canonical payment write
     * path, POST /api/payments/report, is the same handler under its documented name. */
    /* THE H&S ADMIN CONSOLE (Owner, 7 Oct 2026) — /admin/billing. The page carries no data and no secret: everything it
     * shows comes from /api/billing/… with the BILLING_ADMIN's own bearer, refused (403) for anyone else. Served here, not
     * as a static file, so it is never cached, never indexed and never framed. */
    if (url.pathname === '/admin/billing' || url.pathname === '/admin/billing/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json({ ok: false, error: 'method not allowed' }, 405);
      return new Response(request.method === 'HEAD' ? null : ADMIN_PAGE, { headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',
        'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' } });
    }
    if (url.pathname === '/api/billing' || url.pathname.startsWith('/api/billing/')) {
      return handleBilling(request, env, url, corsHeaders(request), BILLING_DEPS);
    }
    if (url.pathname === '/api/payments/report') {
      const u = new URL(request.url); u.pathname = '/api/billing/payment/report';
      return handleBilling(request, env, u, corsHeaders(request), BILLING_DEPS);
    }

    /* THE RETIRED CATEGORY LEDGER: replaced by the room occupancy engine */
    if (url.pathname === '/api/inventory' || url.pathname.startsWith('/api/inventory/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return json({ ok: false, error: 'retired — use /api/rooms' }, 410, corsHeaders(request));
    }

    /* THE ROOM OCCUPANCY ENGINE: guests read, join and leave allocation units
     * in their own name; Guest Relations reads the plan and migrates */
    if (url.pathname === '/api/rooms' || url.pathname.startsWith('/api/rooms/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (!env.ROOMS) return json({ ok: false, error: 'rooms unavailable' }, 503, corsHeaders(request));
      const op = url.pathname.replace(/^\/api\/rooms\/?/, '') || 'read';
      const headers = new Headers(request.headers);
      headers.delete('x-gr-verified'); headers.delete('x-siyl-identity');   /* a client can never claim either */
      if (GR_ROOMS_OPS.includes(op)) {
        if (!env.GR_TOKEN) return json({ ok: false, error: 'rooms operations are not enabled' }, 503);
        if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
        headers.set('x-gr-verified', 'yes');
      } else {
        const who = await identify(request, env);
        if (who) {
          const id = await withFirstName(env, who, url.origin, request);
          /* THE REGISTER ID (Owner, 29 Sep 2026 · a dedicated room, 002 · W): the engine shows a guest the room that is theirs alone —
             resolved here from the bearer's own index entry, never from anything a client sends */
          try { const person = await personOf(env, url.origin, who); if (person && person.contactId) id.contactId = person.contactId; } catch (e) { /* the standard pool */ }
          /* the engine books only the members who travel in a stage (never a member who is not joining) */
          try { const tr = await partyTravel(env, who, url.origin); if (tr) { id.partyNeed = tr.need; id.partyTravels = tr.travels; } } catch (e) { /* unknown: the engine keeps its own rule */ }
          headers.set('x-siyl-identity', JSON.stringify(id));
        }
        else if (GUEST_ROOMS_WRITES.includes(op)) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
        if (GUEST_ROOMS_WRITES.includes(op) && await resetLocked(env)) return json({ ok: false, error: 'the room engine is being reset — try again in a moment', retry: true }, 503, corsHeaders(request));
      }
      const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
      const res = await stub.fetch(new Request(request, { headers }));
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(corsHeaders(request))) out.headers.set(k, v);
      return out;
    }

    /* GUEST DOCUMENTS. Write-only, authenticated by the invitation the client
     * already holds. Bytes never touch the repository, the browser's storage or
     * any public URL: they go straight to the private object store bound as
     * DOCS. When that binding is absent the endpoint says so honestly (503) and
     * the guest surface keeps the document as NOT PROVIDED — it never claims a
     * receipt that did not happen. There is deliberately NO public read route:
     * Guest Relations reads through /api/gr/documents · /api/gr/document (the
     * GR token). The bucket is bound (siyl-docs, private, 21 Sep 2026); the
     * retention is the Owner's decision of 21 Sep 2026: kept until 7 April
     * 2027 (thirty days after the journey ends on 8 March), then purged by
     * the Worker's one scheduled trigger — see DOC_RETENTION. */
    /* THE GUEST'S OWN DOCUMENT (Owner, 3 Oct 2026): the signed-in guest opens the passport or flight document they sent — their
       own, the current copy, nothing else. Who they are comes from their bearer against the register read fresh; no key, no
       invitation and no guest id is ever taken from the request. Read only. */
    if (url.pathname === '/api/document/mine') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'GET') return docJson({ ok: false, error: 'method not allowed' }, 405, request);
      return handleOwnDocument(request, env, url);
    }
    if (url.pathname === '/api/document') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      }
      return handleDocument(request, env);
    }

    /* THE GUEST'S CONTACT (Owner, 16 Sep 2026 · EMAIL FIRST): the email and mobile number persisted on the server under
       the authenticated guest's own invitation — the one recipient of the confirmation email, the same on every device */
    if (url.pathname === '/api/contact') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return afterWrite(request, env, handleContact(request, env));
    }
    /* THE PROFILE PHOTO (Owner, 18 Sep 2026 · MY PROFILE): one small image per authenticated guest, stored under the
       guest's own invitation in the register store — read, replaced and removed only with that guest's bearer; there is
       no public URL, no listing, and the bytes never enter the repository. */
    if (url.pathname === '/api/profile/photo') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return afterWrite(request, env, handleProfilePhoto(request, env));
    }
    /* THE JOURNEY DRAFT (Owner, 16 Sep 2026 · FINAL QUICKFIX): ONE server-side draft per authenticated guest — the complete
       journey (contact, answers, bag, wedding, documents state, sent stamp) keyed by the invitation; the browser is a cache.
       GET reads it with the submission state (draft / sent / changes not yet sent); PUT stores it. */
    if (url.pathname === '/api/draft') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      /* a page-hide beacon cannot set headers: the bearer travels in the body and becomes the header here */
      if (url.searchParams.get('beacon') === '1' && request.method === 'POST' && !request.headers.get('x-siyl-auth')) {
        try { const raw = await request.text(); const b = JSON.parse(raw); const h = new Headers(request.headers); if (b && typeof b.bearer === 'string') h.set('x-siyl-auth', b.bearer); delete b.bearer; return handleDraft(new Request(request.url, { method: 'PUT', headers: h, body: JSON.stringify(b) }), env); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400); }
      }
      return handleDraft(request, env);
    }
    /* THE CLEAN RESET (Owner, 19 Sep 2026): every guest-generated transactional state, in one Guest-Relations-protected
       operation — dry run by default, execution only with the exact confirmation words */
    if (url.pathname === '/api/gr/reset') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
      return afterWrite(request, env, handleGrReset(request, env));
    }
    /* GUEST RELATIONS: one guest's stored submission record as it was sent (the source of both emails) — the GR token only */
    if (url.pathname === '/api/gr/record') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
      const inv = String(url.searchParams.get('invitation') || '').trim();
      if (!/^INV-[A-Z0-9-]+$/.test(inv)) return json({ ok: false, error: 'invitation required' }, 400);
      let rec = null; try { rec = JSON.parse(await env.REG_KV.get('reg:' + inv) || 'null'); } catch (e) { rec = null; }
      if (!rec) return json({ ok: true, invitationId: inv, record: null });
      const { mail, ...record } = rec;   /* the provider answers stay in the summary the listing gives */
      return json({ ok: true, invitationId: inv, record, guestMail: composeGuestMail(rec), ownerMail: composeOwnerMail(rec, url.origin + '/api/status?invitation=' + encodeURIComponent(inv)) });
    }
    /* GUEST RELATIONS · THE DOCUMENTS (Owner, 21 Sep 2026): one guest's stored documents — the metadata of one invitation
       (never a listing of everyone), and one object streamed through the Worker by its exact key. The GR token only; the
       same boundary as the record. A guest has no read route at all. Nothing of the body or the token is logged. */
    if (url.pathname === '/api/gr/documents' || url.pathname === '/api/gr/document' || url.pathname === '/api/gr/documents/retention') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      if (request.method !== 'GET') return json({ ok: false, error: 'method not allowed' }, 405);
      if (!env.DOCS) return json({ ok: false, error: 'document storage is not enabled yet', enabled: false }, 503);
      if (url.pathname === '/api/gr/documents/retention') return handleGrRetention(env);   /* the policy and what stands under it — read only, never a deletion */
      return url.pathname === '/api/gr/documents' ? handleGrDocuments(url, env) : handleGrDocument(url, env);
    }
    /* GUEST RELATIONS: every guest's canonical current data (draft, submission, rooms, seats, mail) — the GR token only */
    if (url.pathname === '/api/gr/journeys') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      return handleGrJourneys(request, env);
    }
    /* THE JOURNEY'S STATUS (F): received / confirmed, read by the guest site */
    if (url.pathname === '/api/status') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return handleStatus(request, env);
    }
    /* WHO'S JOINING US (Owner, 21 Sep 2026 · My Profile): the wedding community as the server knows it — every guest whose
       trip has been SENT and who is joining (a declined response is a response, not a joining guest). For an authenticated
       guest only. Identity information alone: the opaque guest id, the first name as the guest currently spells it, whether a
       portrait exists (read through GET /api/profile/photo?of=… with the guest's own bearer), the day the trip was first sent.
       Nothing else — no contact, no code, no booking, no document. Nothing is written. */
    if (url.pathname === '/api/community') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'GET') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      return handleCommunity(request, env);
    }
    /* THE WEDDING PULSE (Owner, 27 Sep 2026): what is happening right now — who is joining, what everyone dances to, where the night
       ends — for an authenticated guest only, in the narrowest form the pages need; nothing is written */
    if (url.pathname === '/api/pulse') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'GET') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      return handlePulse(request, env);
    }
    /* THE BRIDE & GROOM'S HOSPITALITY (Owner, 28 Sep 2026 · src/gifts.js): the signed-in guest's own complimentary stays, from
       the register's person id of their own bearer — never anyone else's, no public table, nothing read from a store or written */
    if (url.pathname === '/api/gifts') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'GET') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      const who = await identify(request, env);
      if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
      const person = await personOf(env, url.origin, who);
      return json({ ok: true, guestId: who.guestId, gifts: giftsFor(person && person.contactId) }, 200, { ...corsHeaders(request), 'cache-control': 'no-store' });
    }
    /* THE CONFIRMATION (F): Guest Relations only, idempotent, never self-service */
    if (url.pathname === '/api/confirm') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
      if (!env.GR_TOKEN) return json({ ok: false, error: 'confirmation is not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      return handleConfirm(request, env);
    }
    /* THE SEATING LEDGER (G): guests read and hold; Guest Relations configures */
    if (url.pathname === '/api/seating' || url.pathname.startsWith('/api/seating/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (!env.SEATING) return json({ ok: false, error: 'seating unavailable' }, 503, corsHeaders(request));
      const op = url.pathname.replace(/^\/api\/seating\/?/, '') || 'read';
      const headers = new Headers(request.headers);
      headers.delete('x-gr-verified'); headers.delete('x-siyl-identity'); headers.delete('x-siyl-couple');   /* a client can never claim any */
      /* THE COUPLE'S PLACES (Owner, 2 Oct 2026): the two ceremony places belong to the register's Bride and Groom — named for the ledger
         here, from the index's roles, never from a name or anything a client sent */
      try { const cp = await coupleOfIndex(env, url.origin); if (cp) headers.set('x-siyl-couple', JSON.stringify(cp)); } catch (e) { /* the places stay unnamed */ }
      if (GR_SEATING_OPS.includes(op)) {
        if (!env.GR_TOKEN) return json({ ok: false, error: 'seating operations are not enabled' }, 503);
        if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
        headers.set('x-gr-verified', 'yes');
      } else {
        const who = await identify(request, env);
        if (who) headers.set('x-siyl-identity', JSON.stringify(await withFirstName(env, who, url.origin, request)));
        else if (op === 'select' || op === 'release') return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
        if ((op === 'select' || op === 'release') && await resetLocked(env)) return json({ ok: false, error: 'the seating ledger is being reset — try again in a moment', retry: true }, 503, corsHeaders(request));
      }
      const forwarded = new Request(request, { headers });
      const stub = env.SEATING.get(env.SEATING.idFromName('seating'));
      const res = await stub.fetch(forwarded);
      /* a seat held or given back changes who is joined (the canonical union): this isolate reads the circle again at once */
      if (request.method === 'POST' && res.status < 300 && env.REG_KV) cohortStale(env);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(corsHeaders(request))) out.headers.set(k, v);
      return out;
    }

    if (url.pathname === '/api/register') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      }
      return afterWrite(request, env, handleRegister(request, env));
    }
    /* the confirmation emails, sent again for a journey already stored — never a new submission (Owner, 16 Sep 2026) */
    if (url.pathname === '/api/register/mail-retry') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      return handleMailRetry(request, env);
    }

    /* HISTORICAL FIREWALL (final pre-release run, 11 SEP 2026): the invitation
     * letters link to /register/?invite=…, the entry of the superseded
     * registration engine. That engine (register/index.html, app.mjs, data.mjs,
     * logic.mjs) carries retired truth and is no longer served (.assetsignore);
     * its entry redirects into the accepted product. The two files the accepted
     * product loads from that directory — crypto.mjs and the encrypted
     * invitation bundle — pass through untouched. */
    if (url.pathname === '/register' || url.pathname.startsWith('/register/')) {
      const keep = /^\/register\/(crypto\.mjs|invitations\.enc\.json|auth-index\.json)$/.test(url.pathname);
      if (!keep) return Response.redirect(url.origin + '/invitation.html', 302);
    }

    /* THE HERO FILMS WITH BYTE RANGES (Owner, 26 Sep 2026): Safari plays a video only from a server that answers Range
       requests, and the static asset layer answers every request with the whole file. /media/<name>.mp4 is not a file, so it
       reaches the Worker, which reads the same file from assets/video/ through the existing ASSETS binding and answers
       206 slices — application code only: no binding, route or asset configuration changes. */
    const media = /^\/media\/([a-z0-9-]+\.mp4)$/.exec(url.pathname);
    if (media && (request.method === 'GET' || request.method === 'HEAD')) return mediaRange(request, env, url, media[1]);

    const res = await env.ASSETS.fetch(request);
    /* THE PAGE FOR AN UNKNOWN ADDRESS (OQ-39 · PRQ-00-06 / PRQ-07B-03): when the assets answer 404 for a page address, the site's
       own 404.html is served with status 404 — no configuration change (not_found_handling stays untouched); an asset that is
       not a page (an image, a script) keeps its plain 404 */
    if (res.status === 404 && (request.method === 'GET' || request.method === 'HEAD') && (!/\.[a-z0-9]{1,8}$/i.test(url.pathname) || /\.html?$/i.test(url.pathname))) {
      const nf = await notFoundPage(env, url, request);
      if (nf) return nf;
    }
    return res;
  },
  /* THE DOCUMENT RETENTION CLOCK (Owner, 21 Sep 2026): the one scheduled trigger of the one Worker. Before the approved
     date it does nothing at all; from that date it purges the private passport / travel documents — the doc/ objects of
     the DOCS bucket and nothing else — and writes one audit record of counts. Idempotent: a second run finds nothing. */
  async scheduled(event, env, ctx) {
    const at = new Date(event && event.scheduledTime ? event.scheduledTime : Date.now());
    const run = purgeDocuments(env, at, { dryRun: false, actor: 'cron' });
    if (ctx && ctx.waitUntil) ctx.waitUntil(run);
    return run;
  },
};

/* one film from assets/video/, whole (200) or the byte range asked for (206 · 416 when it cannot be satisfied). The range is
   streamed out of the asset's own body — the file is never held in memory, and the read stops once the range is sent. */
function sliceBody(body, start, end) {
  let pos = 0;
  return body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      const from = pos, to = pos + chunk.byteLength; pos = to;
      if (to <= start) return;
      if (from > end) { ctl.terminate(); return; }
      ctl.enqueue(chunk.subarray(Math.max(0, start - from), Math.min(chunk.byteLength, end + 1 - from)));
      if (to > end) ctl.terminate();
    }
  }));
}
async function mediaRange(request, env, url, name) {
  const src = await env.ASSETS.fetch(new Request(url.origin + '/assets/video/' + name, { method: 'GET' }));
  if (!src.ok || !src.body) return new Response('Not found', { status: 404 });
  const head = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=86400' };
  /* the size from the response, else from the build-time list (a large film not yet in the edge cache can come without a
     content-length, and reading it whole to count it exceeded the Worker's limits); a film missing from both is read, as before */
  let size = Number(src.headers.get('content-length')) || Number(MEDIA_SIZES[name]) || 0;
  let body = src.body;
  if (!size) { const buf = await src.arrayBuffer(); size = buf.byteLength; body = new Response(buf).body; }
  const m = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get('range') || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    if (request.method === 'HEAD') { try { await body.cancel(); } catch (e) { /* nothing to cancel */ } return new Response(null, { status: 200, headers: { ...head, 'content-length': String(size) } }); }
    return new Response(body, { status: 200, headers: { ...head, 'content-length': String(size) } });
  }
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (!(start <= end) || start >= size) { try { await body.cancel(); } catch (e) { /* nothing to cancel */ } return new Response(null, { status: 416, headers: { ...head, 'content-range': 'bytes */' + size } }); }
  const range = { ...head, 'content-range': 'bytes ' + start + '-' + end + '/' + size, 'content-length': String(end - start + 1) };
  if (request.method === 'HEAD') { try { await body.cancel(); } catch (e) { /* nothing to cancel */ } return new Response(null, { status: 206, headers: range }); }
  return new Response(sliceBody(body, start, end), { status: 206, headers: range });
}

/* the register's Bride and Groom for the seating ledger: { BRIDE: { g, p, n }, GROOM: { g, p, n } } by role (h = 1 · r = B / G) */
const COUPLE_NAMES = { B: 'Haruthai', G: 'Suthep' };
async function coupleOfIndex(env, origin) {
  const entries = await loadIndex(env, origin || lastOrigin), out = {};
  for (const e of Object.values(entries || {})) {
    if (!e || e.h !== 1 || (e.r !== 'B' && e.r !== 'G') || !e.g) continue;
    out[e.r === 'B' ? 'BRIDE' : 'GROOM'] = { g: String(e.g), p: e.p ? String(e.p) : null, n: COUPLE_NAMES[e.r] };
  }
  return Object.keys(out).length ? out : null;
}
/* THE HOLDER'S FIRST NAME (PRQ-GAP-02): the engines name a room or seat holder only from the verified identity, never from a
   request body — the Worker adds `firstName`: the couple by the register's role (Bride → Haruthai, Groom → Suthep), otherwise the
   guest's own first name as the server knows it (the contact → the sent record's preferred name → its source name). Computed
   once per identity object; nothing is written. */
let lastOrigin = '';
async function withFirstName(env, who, origin, request) {
  if (!who || typeof who !== 'object' || who.firstName) return who;
  let name = '';
  try {
    const entries = await loadIndex(env, origin || lastOrigin);
    for (const e of Object.values(entries || {})) { if (e && e.i === who.invitationId && e.h === 1 && (e.r === 'B' || e.r === 'G')) { name = e.r === 'B' ? 'Haruthai' : 'Suthep'; break; } }
  } catch (e) { name = ''; }
  if (!name && env.REG_KV) {
    let c = null, rec = null;
    try { c = await storedContact(env, who.invitationId); } catch (e) { c = null; }
    try { rec = JSON.parse(await env.REG_KV.get('reg:' + who.invitationId) || 'null'); } catch (e) { rec = null; }
    const gr = (rec && rec.registration && rec.registration.guestRecord) || {};
    const g0 = Array.isArray(gr.guests) && gr.guests[0] ? gr.guests[0] : {};
    name = firstWord(c && c.firstName) || firstWord(g0.submitted && g0.submitted.preferredName) || firstWord(g0.source && g0.source.preferredName) || firstWord(g0.name);
  }
  /* a guest the server knows no name for yet (nothing corrected, nothing sent): the first name their own invitation gave the page,
     as sent with their own write — it names only themselves (their identity is the bearer's) */
  if (!name && request && request.method === 'POST') { try { const body = await request.clone().json(); name = firstWord(body && body.name); } catch (e) { /* no body name */ } }
  name = String(name || '').replace(/[^\p{L}\p{M}' \-.]/gu, '').replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 24);   /* auth.js displayName's rule, one word */
  if (name) who.firstName = name;
  return who;
}

/* the 404 page itself: /404 (the assets' own clean address for 404.html), else /404.html — followed only when it answers 200 */
async function notFoundPage(env, url, request) {
  for (const p of ['/404', '/404.html']) {
    try {
      const r = await env.ASSETS.fetch(new Request(url.origin + p, { method: 'GET', headers: request.headers }));
      if (r && r.status === 200) {
        const h = new Headers(r.headers); h.set('cache-control', 'no-store');
        return new Response(request.method === 'HEAD' ? null : r.body, { status: 404, headers: h });
      }
    } catch (e) { /* the plain 404 stands */ }
  }
  return null;
}

/* ---- THE DOCUMENT RETENTION POLICY (Owner, 21 Sep 2026 · FINAL) ------------------------------------------------------
 * The journey ends on 8 March 2027. Passport and travel documents are kept for thirty days after it and deleted from
 * 7 April 2027. The policy reaches ONLY the private document objects (the doc/ prefix of the DOCS bucket) and the audit
 * of their purge; it never touches a profile photo, a contact, an invitation, an identity, a booking, a room, a seat, a
 * draft, a registration record, the community, or any other object. Deterministic (one date, UTC), auditable (one
 * record per run that deleted something, counts only), idempotent (a purge of nothing writes nothing). */
const DOC_RETENTION = Object.freeze({ journeyEnd: '2027-03-08', days: 30, purgeFrom: '2027-04-07', prefix: 'doc/' });
const docPurgeDue = (at) => new Date(at).toISOString().slice(0, 10) >= DOC_RETENTION.purgeFrom;
async function purgeDocuments(env, at, opts) {
  const o = opts || {}, when = new Date(at || Date.now()).toISOString();
  const out = { ok: true, policy: DOC_RETENTION, at: when, due: docPurgeDue(when), dryRun: o.dryRun !== false, objects: 0, byInvitation: {}, deleted: 0, invitations: 0 };
  if (!env.DOCS) return { ...out, ok: false, error: 'document storage is not enabled yet' };
  let cursor;
  try {
    do {
      const l = await env.DOCS.list({ prefix: DOC_RETENTION.prefix, cursor });
      for (const obj of l.objects || []) {
        if (!obj.key.startsWith(DOC_RETENTION.prefix)) continue;   /* the prefix, and nothing beside it */
        out.objects++; const inv = obj.key.split('/')[1] || '?'; out.byInvitation[inv] = (out.byInvitation[inv] || 0) + 1;
        if (out.due && !out.dryRun) { await env.DOCS.delete(obj.key); out.deleted++; }
      }
      cursor = l.truncated ? l.cursor : null;
    } while (cursor);
  } catch (e) { return { ...out, ok: false, error: 'document store unavailable' }; }
  out.invitations = Object.keys(out.byInvitation).length;
  /* the audit: one record when something was deleted — counts, the date, the actor; no key, no name, no byte */
  if (out.deleted && env.REG_KV) { try { await env.REG_KV.put('docpurge:' + when, JSON.stringify({ at: when, actor: String(o.actor || 'cron'), purgeFrom: DOC_RETENTION.purgeFrom, deleted: out.deleted, invitations: out.invitations }), { metadata: { at: when, deleted: out.deleted } }); } catch (e) { /* the purge stands; the record is the next run's */ } }
  return out;
}
async function handleGrRetention(env) {
  const r = await purgeDocuments(env, new Date(), { dryRun: true });
  let audits = []; try { if (env.REG_KV) { const l = await env.REG_KV.list({ prefix: 'docpurge:' }); audits = l.keys.map((k) => ({ at: k.name.slice('docpurge:'.length), ...(k.metadata || {}) })); } } catch (e) { audits = []; }
  return json({ ...r, dryRun: true, audits, note: r.due ? 'the purge date has passed: the scheduled run deletes what is listed here' : 'before 7 April 2027 nothing is deleted; the documents stand under the authenticated rules' }, r.ok ? 200 : 503, { 'cache-control': 'private, no-store' });
}

const MAX_DOC = 12 * 1024 * 1024; // 12 MB — a passport photograph, not a film
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];

async function handleDocument(request, env) {
  const invitationId = request.headers.get('x-invitation') || '';
  const guestId = request.headers.get('x-guest') || '';
  const kind = request.headers.get('x-kind') || '';
  const filename = (request.headers.get('x-filename') || 'document').slice(0, 120);
  const type = request.headers.get('content-type') || '';

  if (!/^INV-[A-Za-z0-9_-]{1,32}$/.test(invitationId) || !/^[A-Za-z0-9_-]{1,32}$/.test(guestId)) {
    return json({ ok: false, error: 'invalid invitation or guest' }, 400, corsHeaders(request));
  }
  /* a document is sent by the guest it belongs to, and by nobody else */
  if (!owns(await identify(request, env), invitationId, guestId)) {
    return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  }
  if (kind !== 'passport' && kind !== 'flight') {
    return json({ ok: false, error: 'unknown document kind' }, 400, corsHeaders(request));
  }
  if (!DOC_TYPES.includes(type.split(';')[0].trim())) {
    return json({ ok: false, error: 'unsupported file type' }, 415, corsHeaders(request));
  }
  if (!env.DOCS) {
    // No store, no receipt. The guest is told the truth by the client.
    return json({ ok: false, error: 'document storage is not enabled yet', enabled: false }, 503, corsHeaders(request));
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ ok: false, error: 'empty file' }, 400, corsHeaders(request));
  if (bytes.byteLength > MAX_DOC) return json({ ok: false, error: 'file too large' }, 413, corsHeaders(request));

  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const receivedAt = new Date().toISOString();
  const key = `doc/${invitationId}/${guestId}/${kind}/${receivedAt}-${digest.slice(0, 12)}`;

  try {
    await env.DOCS.put(key, bytes, {
      httpMetadata: { contentType: type },
      customMetadata: { invitationId, guestId, kind, filename, receivedAt, sha256: digest },
    });
  } catch (e) {
    return json({ ok: false, error: 'document could not be stored' }, 503, corsHeaders(request));
  }
  /* A REPLACEMENT SUPERSEDES THE EARLIER COPY (W7-175 · PRQ-06-12): the new object is the guest's document; every earlier object of
     the same guest and kind is hidden from every Guest Relations read (handleGrDocuments / handleGrDocument) and removed by the
     retention clock — no guest request ever deletes or reads the store */
  // RECEIVED means received. Never reviewed, verified or approved.
  return json({ ok: true, status: 'RECEIVED', key, sha256: digest, receivedAt, bytes: bytes.byteLength },
    201, corsHeaders(request));
}

/* THE CURRENT COPY (3 Oct 2026 · one rule for the guest and for Guest Relations): of one guest's documents of one kind, the
   newest key — every listing page walked; keys sort by their ISO receipt time, then by their digest, so the choice is
   deterministic. A listing that fails throws: the caller fails closed, it never serves a copy it could not prove current. */
async function currentDocKey(env, prefix) {
  let newest = null, cursor;
  do {
    const l = await env.DOCS.list({ prefix, cursor });
    for (const o of l.objects || []) if (DOC_KEY.test(o.key) && o.key.startsWith(prefix) && (!newest || o.key > newest)) newest = o.key;
    cursor = l.truncated ? l.cursor : null;
  } while (cursor);
  return newest;
}
/* every answer of the guest's own document route is private and never cached — the errors too */
function docJson(obj, status, request) { const r = json(obj, status, corsHeaders(request)); r.headers.set('cache-control', 'private, no-store'); r.headers.set('x-content-type-options', 'nosniff'); return r; }
/* THE STRICT IDENTITY (Owner, 3 Oct 2026 · a guest reading their own passport or flight document): the register is read fresh for
   this request — never a cached copy — so a code withdrawn from the register stops at once. The same derivation src/auth.js uses
   (bearer → auth id → the index entry); an unreadable register → { unavailable } (the caller fails closed); unknown → null. */
async function identifyStrict(request, env) {
  const bearer = (request.headers.get('x-siyl-auth') || '').trim();
  if (!/^[0-9a-f]{64}$/.test(bearer)) return null;
  let entries = null;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL(request.url).origin + '/register/auth-index.json'));
    if (!res.ok) return { unavailable: true };
    const j = await res.json(); entries = j && j.entries && typeof j.entries === 'object' ? j.entries : null;
  } catch (e) { return { unavailable: true }; }
  if (!entries) return { unavailable: true };
  const e = entries[await authIdOf(bearer)];
  return e && e.i && e.g ? { invitationId: e.i, guestId: e.g, partyId: e.p || null } : null;
}
async function handleOwnDocument(request, env, url) {
  const who = await identifyStrict(request, env);
  if (who && who.unavailable) return docJson({ ok: false, error: 'try again in a moment', retry: true }, 503, request);
  if (!who) return docJson({ ok: false, error: 'unauthorised' }, 401, request);
  const kind = url.searchParams.get('kind') || '';
  if (kind !== 'passport' && kind !== 'flight') return docJson({ ok: false, error: 'unknown document kind' }, 400, request);
  if (!env.DOCS) return docJson({ ok: false, error: 'document storage is not enabled yet', enabled: false }, 503, request);
  if (!/^INV-[A-Za-z0-9_-]{1,32}$/.test(who.invitationId) || !/^[A-Za-z0-9_-]{1,32}$/.test(who.guestId)) return docJson({ ok: false, error: 'unauthorised' }, 401, request);
  /* the guest's own prefix, built here from the verified identity — a party mate's documents live under their own guest id */
  const prefix = 'doc/' + who.invitationId + '/' + who.guestId + '/' + kind + '/';
  let key = null, obj = null;
  try { key = await currentDocKey(env, prefix); if (key) obj = await env.DOCS.get(key); } catch (e) { return docJson({ ok: false, error: 'document store unavailable', retry: true }, 503, request); }
  if (!key || !obj) return docJson({ ok: false, error: 'no document' }, 404, request);
  const cm = obj.customMetadata || {}, type = (obj.httpMetadata && obj.httpMetadata.contentType) || '';
  const safe = DOC_TYPES.includes(type) ? type : 'application/octet-stream';
  const name = String(cm.filename || kind).replace(/[^\w.-]+/g, '_').slice(0, 120) || kind;
  const headers = { 'content-type': safe, 'content-length': String(obj.size), 'content-disposition': 'inline; filename="' + name + '"', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', ...corsHeaders(request) };
  return new Response(obj.body, { status: 200, headers });
}

/* the metadata of one invitation's documents: key · kind · guest · filename · type · bytes · received — never the bytes */
const DOC_KEY = /^doc\/(INV-[A-Za-z0-9_-]{1,32})\/([A-Za-z0-9_-]{1,32})\/(passport|flight)\/[0-9TZ:.-]+-[0-9a-f]{12}$/;
async function handleGrDocuments(url, env) {
  const inv = String(url.searchParams.get('invitation') || '').trim();
  if (!/^INV-[A-Za-z0-9_-]{1,32}$/.test(inv)) return json({ ok: false, error: 'invitation required' }, 400);
  const documents = []; let cursor;
  try {
    do {
      const l = await env.DOCS.list({ prefix: 'doc/' + inv + '/', cursor, include: ['httpMetadata', 'customMetadata'] });
      for (const o of l.objects || []) {
        const cm = o.customMetadata || {}, hm = o.httpMetadata || {};
        documents.push({ key: o.key, guestId: cm.guestId || o.key.split('/')[2] || '', kind: cm.kind || o.key.split('/')[3] || '', filename: cm.filename || '', type: hm.contentType || '', bytes: o.size, receivedAt: cm.receivedAt || (o.uploaded ? new Date(o.uploaded).toISOString() : ''), sha256: cm.sha256 || '' });
      }
      cursor = l.truncated ? l.cursor : null;
    } while (cursor);
  } catch (e) { return json({ ok: false, error: 'document store unavailable' }, 503); }
  /* newest first — the receipt time, then the key (the same order the current-copy rule uses), so the copy listed as current is
     always the one Guest Relations can open, equal timestamps included */
  documents.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  /* only the newest object of each guest and kind is the guest's document; an earlier copy a replacement superseded is never
     shown (PRQ-06-12) — ?all=1 lists every stored object for an audit */
  if (url.searchParams.get('all') !== '1') { const seen = new Set();   /* the list is newest first: the first of each guest and kind is kept */
    const kept = documents.filter((d) => { const k = d.guestId + '/' + d.kind; if (seen.has(k)) return false; seen.add(k); return true; });
    documents.length = 0; kept.forEach((d) => documents.push(d)); }
  return json({ ok: true, invitationId: inv, count: documents.length, documents }, 200, { 'cache-control': 'private, no-store' });
}
/* one object, streamed through the Worker: the exact key only (its shape is pinned — no prefix, no wildcard, no listing) */
async function handleGrDocument(url, env) {
  const key = String(url.searchParams.get('key') || '');
  if (!DOC_KEY.test(key)) return json({ ok: false, error: 'a document key is required' }, 400);
  let obj = null; try { obj = await env.DOCS.get(key); } catch (e) { return json({ ok: false, error: 'document store unavailable' }, 503); }
  if (!obj) return json({ ok: false, error: 'no such document' }, 404);
  /* a copy a later replacement superseded is not the guest's document any more (PRQ-06-12) — ?all=1 for an audit */
  if (url.searchParams.get('all') !== '1') {
    /* the same current-copy rule as the guest's own read: every page walked; unprovable is refused, never served */
    let current = null; try { current = await currentDocKey(env, key.split('/').slice(0, 4).join('/') + '/'); } catch (e) { return json({ ok: false, error: 'document store unavailable' }, 503); }
    if (current !== key) return json({ ok: false, error: 'superseded by a newer copy' }, 404);
  }
  const cm = obj.customMetadata || {}, type = (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream';
  const name = String(cm.filename || key.split('/').pop() || 'document').replace(/[^\w.-]+/g, '_').slice(0, 120);
  return new Response(obj.body, { status: 200, headers: { 'content-type': DOC_TYPES.includes(type) ? type : 'application/octet-stream', 'content-length': String(obj.size), 'content-disposition': 'attachment; filename="' + name + '"', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'x-document-received': cm.receivedAt || '', 'x-document-sha256': cm.sha256 || '' } });
}

async function handleRegister(request, env) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, error: 'payload too large' }, 413);
    body = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: 'invalid JSON' }, 400);
  }
  const { invitationId, registration, text } = body || {};
  if (!invitationId || typeof text !== 'string' || !text.startsWith('SEE YOU IN LAOS')) {
    return json({ ok: false, error: 'invalid registration payload' }, 400);
  }
  /* a journey is sent by the guest it belongs to, under their own invitation */
  const who = await identify(request, env);
  if (!who || who.invitationId !== String(invitationId).trim() || (registration && registration.guestId && registration.guestId !== who.guestId)) {
    return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  }

  const submittedAt = (registration && registration.registration_submitted_at) || new Date().toISOString();
  // ONE LOGICAL JOURNEY per invitation (Owner, 16 Sep 2026): the first submission sets the reference; every later send is an
  // UPDATE of the same journey — same submissionId, version + 1, the previous state kept alongside as a bounded history.
  const regKey = 'reg:' + invitationId;
  let existing = null; if (env.REG_KV) { try { existing = JSON.parse(await env.REG_KV.get(regKey) || 'null'); } catch (e) { existing = null; } }
  const isUpdate = !!(existing && existing.submissionId);
  const submissionId = isUpdate ? existing.submissionId : await submissionIdOf(invitationId, submittedAt);
  const version = isUpdate ? (existing.version || 1) + 1 : 1;
  let stored = false;

  // 1) DURABLE PERSISTENCE FIRST. Without a stored record the endpoint reports
  //    failure and the client falls back to the clearly-labelled emergency
  //    channel — success is never simulated. The record carries the submission
  //    id; the provider's answer is written to it after the emails (step 2).
  /* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): nothing is stripped from a submission — every line is the guest's own selection */
  /* THE RECIPIENT (Owner, 16 Sep 2026 · EMAIL FIRST): the authenticated guest → the contact persisted on the server under
     their invitation → the confirmation email. A journey without a valid email is not accepted: the guest is sent back to
     the email field; the email they add is persisted server-side and Review & Send is open again. */
  const recipient = await resolveRecipient(env, who, registration);
  if (!recipient.email) {
    return json({ ok: false, error: 'email required', message: 'Please add your email address, so we can send you a copy of your trip.', field: 'email' }, 422, corsHeaders(request));
  }
  /* THE PERSISTED ROOMS (Owner, 16 Sep 2026): the rooms this guest holds are read from the room engine on the server —
     the emails name the room the engine persists, never a room the client claims */
  const rooms = await engineRooms(env, who);
  /* THE BRIDE & GROOM'S GIFT (28 Sep 2026 · src/gifts.js): a sent line is complimentary only when the sender's register identity
     holds that gift — the emails and Guest Relations never read a gift a device merely claims */
  if (registration && Array.isArray(registration.selections)) {
    const person = await personOf(env, new URL(request.url).origin, who);
    /* a line of the former Kempinski room is written as its successor (only the canonical key is ever written) */
    const canon = canonicalLines(registration.selections);
    const claimedPrepaid = new Set((canon || []).filter((l) => l && l.personal === 'prepaid').map((l) => siteKeyOfSelection(l)));
    registration.selections = verifiedLines(canon, giftsFor(person && person.contactId));
    registration.selections = await markPaidByHS(env, who, registration.selections, claimedPrepaid);
  }
  /* THE ONE VALIDATOR (Owner, 21 Sep 2026 · the global My Trip rebuild): the same graph the pages read decides here whether the
     trip is complete — every relevant stage answered (a hold or a waiting-list place the engine persists, a chosen transport,
     an explicit "not joining this stage" where the stage allows it), the wedding's answers, the seats while seating is open,
     About You. A guest not joining the trip sends a complete response with nothing else. An incomplete trip is refused. */
  const done = await completionOf(env, who, registration, rooms);
  if (!done.canSend) {
    return json({ ok: false, error: 'incomplete', message: 'Something is still needed before you send.', missing: done.missing, unresolved: done.unresolved }, 422, corsHeaders(request));
  }
  let record = null;
  if (env.REG_KV) {
    try {
      /* two fingerprints of what was sent: the historical one (kept, so every earlier record keeps comparing as before) and the
         CONTENT one (PRQ-01-06) — stamps (at · by · history) left out, so a save that changes nothing, or a change undone, never
         reads as a change */
      const fps = await journeyFingerprints(env, who);
      const draftFingerprint = fps.v1, contentFingerprint = fps.v2, selectionFingerprint = await canonicalV3(fps, fps.rooms, fps.seats);
      const now = new Date().toISOString();
      record = { invitationId, submittedAt: isUpdate ? existing.submittedAt : submittedAt, submissionId, version, kind: isUpdate ? 'update' : 'initial',
        firstSentAt: isUpdate ? (existing.firstSentAt || existing.submittedAt) : submittedAt, lastSentAt: now, updatedAt: now,
        guestId: who.guestId, hosts: !!who.hosts, registration, text, rooms, recipient, draftFingerprint, contentFingerprint, selectionFingerprint, fingerprintVersion: 3, mail: null };
      /* THE PERMANENT PERSON ID (Owner, 20 Sep 2026): CONxxx and COUPLxxx are the register's — stamped from the auth index, never taken from the body */
      if (registration && typeof registration === 'object') { const person = await personOf(env, new URL(request.url).origin, who); if (person.contactId) registration.contactId = person.contactId; else delete registration.contactId; if (person.couple) registration.couple = person.couple; else delete registration.couple; }
      /* THE RECOVERY SNAPSHOT (Owner, 25 Sep 2026): the personal details as the server stores them for THIS person (the page's
         copy fills only what the store lacks), and each other party member's participation at this moment — stamped on the
         record so Guest Relations' email can rebuild the submitted record after a reset. Never a code, never a bearer. */
      if (registration && typeof registration === 'object') {
        const sc = await storedContact(env, who.invitationId), gcx = registration.guestRecord && registration.guestRecord.contact && typeof registration.guestRecord.contact === 'object' ? registration.guestRecord.contact : {};
        const ga = gcx.address && typeof gcx.address === 'object' ? gcx.address : {}, fromPage = { firstName: gcx.firstName, lastName: gcx.lastName, birthdate: gcx.birthdate, nationality: gcx.nationality, address1: ga.line1, address2: ga.line2, postal: ga.postal, city: ga.city, region: ga.region, country: ga.country };
        const personal = { guestId: who.guestId };
        for (const k of PERSONAL_KEYS) { const v = (sc && typeof sc[k] === 'string' && sc[k].trim()) || (typeof fromPage[k] === 'string' ? fromPage[k].trim().slice(0, PERSONAL_MAX[k] || 120) : ''); personal[k] = k === 'birthdate' && v && !validBirthdate(v) ? '' : v; }
        registration.personal = personal;
        try { const tr = await partyTravel(env, who, new URL(request.url).origin); if (tr) { const names = {}; try { const entries = await loadIndex(env, new URL(request.url).origin); for (const e of Object.values(entries || {})) if (e && e.p === who.partyId && e.g !== who.guestId) { const mate = { invitationId: e.i, guestId: e.g }; try { await withFirstName(env, mate, new URL(request.url).origin); } catch (x) { /* no name */ } names[e.g] = mate.firstName || ''; } } catch (x) { /* names are a courtesy */ }
          const people = registration.guestRecord && registration.guestRecord.party && Array.isArray(registration.guestRecord.party.people) ? registration.guestRecord.party.people : [];
          const inviteName = (g) => { const x = people.find((m) => m && m.guestId === g); return x && typeof x.name === 'string' ? x.name.slice(0, 80) : ''; };
          registration.partyParticipation = Object.entries(tr.members).map(([g, state]) => ({ guestId: g, name: names[g] || inviteName(g), state })); } } catch (e) { /* unknown: the email says nothing about the party's answers */ }
      }
      const prev = await env.REG_KV.get(regKey);
      await env.REG_KV.put(regKey, JSON.stringify(record), { metadata: { invitationId, submittedAt: record.submittedAt, submissionId, version, lastSentAt: now } });
      if (prev) {
        let prevObj = null; try { prevObj = JSON.parse(prev); } catch (e) {}
        if (!prevObj || (prevObj.lastSentAt || prevObj.submittedAt) !== now) {
          await env.REG_KV.put(regKey + ':prev:' + now, prev, {
            metadata: { invitationId, supersededBy: now },
            expirationTtl: 60 * 60 * 24 * 90,
          });
        }
      }
      stored = true;
    } catch (e) { /* persistence failed — reported honestly below */ }
  }
  if (!stored) {
    return json({ ok: false, error: 'registration could not be stored', mailed: false }, 503, corsHeaders(request));
  }

  // 2) THE TWO EMAILS — Guest Relations and the guest — through the configured
  //    provider; the provider's acceptance and message ids are recorded on the
  //    stored record. An email failure never loses the booking: the journey is
  //    saved, the client says so and offers the retry.
  const mail = await sendJourneyMail(env, record, request);
  /* THE GUEST RELATIONS NOTIFICATION IS THE SERVER'S TO RETRY (PRQ-04-07): a failed notification is tried once more at once and
     again with the guest's next copy request — the guest is never asked to resend for it */
  if (mail.owner && !mail.owner.accepted && mail.owner.provider !== 'none') { const again = await sendJourneyMail(env, record, request, { guest: false }); if (again.owner && again.owner.accepted) mail.owner = again.owner; }
  try { await env.REG_KV.put(regKey, JSON.stringify({ ...record, mail, mailSummary: mailSummary(mail) }), { metadata: { invitationId, submittedAt: record.submittedAt, submissionId, version, lastSentAt: record.lastSentAt } }); } catch (e) { /* the record stands; the mail result is in the response */ }
  return json({ ok: true, status: 'UNDER_REVIEW', stored, mailed: !!(mail.owner && mail.owner.accepted), submittedAt: record.submittedAt, lastSentAt: record.lastSentAt, submissionId, version, kind: record.kind, mail: publicMail(mail), mailSummary: mailSummary(mail), submission: submissionStateOf(record, false) }, 202, corsHeaders(request));
}
/* ---- THE JOURNEY DRAFT ------------------------------------------------------------------------------------------
   draft:<invitationId> = { invitationId, guestId, keys: { 'siyl.guest': <json string>, 'siyl.bag': …, 'siyl.temple': …,
   'siyl.docs': … (states only, never a document byte), 'siyl.sent': …, 'siyl.skip': …, 'siyl.skip.by': … }, updatedAt,
   savedAt, fingerprint }. The fingerprint covers what the guest chose and answered (histories and stamps left out) plus
   the rooms and seats the engines hold for them — the submission stores the fingerprint it was sent with, so
   "changes not yet sent" is a comparison, never a guess. */
const DRAFT_KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
const draftKey = (invitationId) => 'draft:' + invitationId;
/* the draft lives in the per-invitation actor (src/drafts.js); the KV mirror answers only where the actor is not bound */
function draftActor(env, invitationId) { return env.DRAFTS ? env.DRAFTS.get(env.DRAFTS.idFromName(invitationId)) : null; }
async function draftOp(env, invitationId, op, body) { const stub = draftActor(env, invitationId); const r = await stub.fetch(new Request('https://drafts/' + op, { method: 'POST', body: JSON.stringify({ invitationId, ...(body || {}) }) })); return { status: r.status, ...(await r.json()) }; }
/* strict: a failed read is thrown (the draft endpoint answers 503 instead of pretending an empty draft); otherwise null */
async function storedDraft(env, invitationId, strict) {
  if (env.DRAFTS) { try { const r = await draftOp(env, invitationId, 'get'); if (!r.ok) throw new Error(r.error || 'draft could not be read'); return r.draft || null; } catch (e) { if (strict) throw e; return null; } }
  if (!env.REG_KV) return null; try { return JSON.parse(await env.REG_KV.get(draftKey(invitationId)) || 'null'); } catch (e) { return null; }
}
/* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): nothing is stripped from a draft — every Bag line is the guest's own selection */
const totalOf = (list) => (Array.isArray(list) ? list : []).reduce((t, x) => t + (Number(x && x.price) || 0) * (Number(x && x.qty) || 1), 0);
/* ONE PARSE PER DRAFT (incident, 4 Oct 2026 · /api/gr/journeys over the 10 ms CPU limit): a draft's `keys` object is an immutable
   snapshot — a fresh object for every read of the store, replaced (never edited) by every write, and every derived form
   (replacedAs · beforeCorrection · withoutGifts) builds new keys. So its parsed content is kept beside it, by identity, in the
   isolate: the same snapshot is never parsed twice, a different snapshot is never confused with it, nothing outlives the snapshot
   (a WeakMap), and the content is read only by every caller (contentOf / selectionOf copy before they change anything). */
const DRAFT_CONTENT = new WeakMap(), RAW_GUEST = new WeakMap();
function draftContent(keys) {
  if (keys && typeof keys === 'object') { const hit = DRAFT_CONTENT.get(keys); if (hit) return hit; const out = parseDraftContent(keys); DRAFT_CONTENT.set(keys, out); return out; }
  return parseDraftContent(keys);
}
function parseDraftContent(keys) {
  const out = {};
  for (const k of ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.skip', 'siyl.skip.by']) {
    let v = null; try { v = JSON.parse(keys && keys[k] || 'null'); } catch (e) { v = keys && keys[k] || null; }
    /* the guest's acknowledgements — the note from the Guest Relations Manager (assets/guest-note.js, 26 Sep 2026) and the Unwritten
       Rules (assets/rules-gate.js, 27 Sep 2026) — are kept in the draft for Guest Relations but are not part of the trip:
       acknowledging never marks a sent trip as changed */
    if (v && typeof v === 'object' && !Array.isArray(v)) { delete v.history; delete v.contactSyncedAt; if (k === 'siyl.guest') { delete v.note; delete v.rules; } if (v.guests) for (const g of Object.values(v.guests)) if (g && typeof g === 'object') delete g.history; }
    out[k] = v;
  }
  return out;
}
async function sha256Hex(text) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
/* the trip as the server can prove it, in the graph's words (see src/stage-graph.js · completion) */
async function completionOf(env, who, registration, rooms) {
  const reg = registration && typeof registration === 'object' ? registration : {};
  const gr = reg.guestRecord && typeof reg.guestRecord === 'object' ? reg.guestRecord : {};
  const claimed = reg.stages && typeof reg.stages === 'object' ? reg.stages : {};
  const lines = Array.isArray(reg.selections) ? reg.selections : [];
  const lineOf = (ids) => lines.find((x) => x && ids.includes(String(x.id)));
  const scope = graphScope(gr.scope, { prewed: claimed.prewed || 'open' });
  const stages = {};
  GRAPH_STAGES.forEach((st) => {
    const ids = GRAPH_IDS[st.key] || [st.key];
    const said = String(claimed[st.key] || 'open');
    const line = lineOf(ids);
    if (st.kind === 'stay' && rooms) {
      /* a stay is answered by the engine's own record: a room held or a waiting-list place in this guest's name */
      const held = ids.map((id) => rooms[id]).find(Boolean);
      if (held) stages[st.key] = held.waitlisted ? 'waitlisted' : 'selected';
      else if (line && line.interest) stages[st.key] = 'selected';
      else stages[st.key] = said === 'declined' ? 'declined' : 'open';
    } else if (st.kind === 'stay') {
      stages[st.key] = ['selected', 'waitlisted', 'declined'].includes(said) ? said : 'open';   /* the engine could not be read: the sent state stands */
    } else {
      stages[st.key] = line ? 'selected' : (said === 'declined' ? 'declined' : 'open');
    }
  });
  /* the wedding, in the record's words */
  const tc = reg.templeCeremony && Array.isArray(reg.templeCeremony.guests) ? (reg.templeCeremony.guests.find((g) => g && g.guestId === who.guestId) || reg.templeCeremony.guests[0]) : null;
  const word = (v) => v === 'Joining' ? 'yes' : v === 'Not joining' ? 'no' : null;
  const events = {}; ['temple', 'coffee', 'vows', 'dinner'].forEach((k) => { events[k] = tc && tc.events ? word(String(tc.events[k] || '')) : null; });
  const sangkhathan = !tc ? null : (tc.sangkhathanState === 'Decision required' ? null : !!tc.sangkhathan);
  const finale = tc ? finaleOf(tc.finaleKey || tc.finale) : null;   /* the final act, from the record's key or its words */
  const seatView = await engineSeatView(env, who);
  const seats = seatView && seatView.mine ? { ceremony: (seatView.mine.ceremony || {})[who.guestId] || null, dinner: (seatView.mine.dinner || {})[who.guestId] || null } : {};
  const about = [];
  const allergy = gr.allergy || {};
  if (allergy.answer === 'yes' && !String(allergy.details || '').trim()) about.push({ key: 'allergy', label: 'Food allergies — which ones', href: 'about-you.html#allergy-details' });
  else if (allergy.answer !== 'no' && allergy.answer !== 'yes') about.push({ key: 'allergy', label: 'Food allergies', href: 'about-you.html#allergy' });
  /* WEDDING SCOPE AND THE HOST FLAG (OQ-32 · PRQ-06-02): the photography acknowledgement is asked of wedding guests who are not
     the hosts; questions 06 and 07 of wedding guests only — read from the stored scope and the register's host flag */
  const atWedding = !!who.hosts || !!(scope && scope.vientianeWedding);
  if (atWedding && !who.hosts && !gr.photo) about.push({ key: 'photo', label: PHOTO_LABEL, href: 'about-you.html#photo' });
  /* the questionnaire's required answers — the sender's own guest record (src/questionnaire.js is the one schema) */
  const g0 = Array.isArray(gr.guests) ? (gr.guests.find((g) => g && g.guestId === who.guestId) || gr.guests[0] || {}) : {};
  questionnaireMissing(g0.profile, { wedding: atWedding }).forEach((m) => about.push(m));
  /* a room or a waiting-list place the engine still holds for a stage outside the trip must have been released first */
  const stale = scope ? Object.keys(rooms || {}).filter((stage) => GRAPH_IDS[stage] && !graphRelevant(stage, scope)).map((stage) => ({ key: 'release:' + stage, label: 'A place is still held for a part of the trip you are not joining', href: 'your-journey.html#scope' })) : [];
  /* STEP 01 IS REQUIRED ON THE SERVER TOO (Owner, 24 Sep 2026): the contact and the personal details the form does not mark
     optional, read from what the Worker itself stores for this invitation — never from the client's claim. The name stays the
     invitation's unless the guest corrected it, so it is not asked here. */
  const sc = await storedContact(env, who.invitationId) || {};
  const contactMissing = [];
  const blank = (v) => !String(v || '').trim();
  if (!validEmail(sc.email || '')) contactMissing.push({ key: 'email', label: blank(sc.email) ? 'Email address' : 'Email address — please check it', href: 'invitation.html#p-email' });
  if (String(sc.phone || '').replace(/\D/g, '').length < 6) contactMissing.push({ key: 'phone', label: blank(sc.phone) ? 'Mobile number' : 'Mobile number — please check it', href: 'invitation.html#p-phone' });
  if (!validBirthdate(sc.birthdate)) contactMissing.push({ key: 'birthdate', label: blank(sc.birthdate) ? 'Date of birth' : 'Date of birth — please check it', href: 'invitation.html#p-birthdate' });
  [['nationality', 'Nationality'], ['address1', 'Street and house number'], ['postal', 'Postcode or ZIP code'], ['city', 'City'], ['country', 'Country']]
    .forEach(([k, label]) => { if (blank(sc[k])) contactMissing.push({ key: k, label, href: 'invitation.html#p-' + k }); });
  return graphCompletion({
    scope, stages, stale,
    contact: { missing: contactMissing },
    wedding: { events, sangkhathan, finale, dress: !!(gr.dress && gr.dress.all), hosts: !!who.hosts,
      seating: seatView ? { open: !!seatView.open, frozen: !!seatView.frozen, configured: seatView.configured || {}, seats } : { open: false } },
    about: { missing: scope && scope.none ? [] : about },
  });
}
async function engineSeatView(env, who) {
  if (!env.SEATING || !who) return null;
  try { const stub = env.SEATING.get(env.SEATING.idFromName('seating')); const r = await stub.fetch(new Request('https://seating/api/seating/mine?invitation=' + encodeURIComponent(who.invitationId), { headers: { 'x-siyl-identity': JSON.stringify(await withFirstName(env, who)) } })); const v = await r.json(); return v && v.ok ? v : null; } catch (e) { return null; }
}
async function engineSeats(env, who) {
  if (!env.SEATING || !who) return null;
  try { const stub = env.SEATING.get(env.SEATING.idFromName('seating')); const r = await stub.fetch(new Request('https://seating/api/seating/mine?invitation=' + encodeURIComponent(who.invitationId), { headers: { 'x-siyl-identity': JSON.stringify(await withFirstName(env, who)) } })); const v = await r.json(); return v && v.mine ? v.mine : null; } catch (e) { return null; }
}
async function journeyFingerprint(env, who, draft) { return (await journeyFingerprints(env, who, draft)).v1; }
/* THE CONTENT OF A TRIP (PRQ-01-06): what the guest chose and answered, without the stamps that record WHEN or BY WHOM an answer
   was given — re-giving the same answer, or undoing a change, leaves the content as it was */
const STAMP_KEYS = new Set(['at', 'by', 'offAt', 'history', 'contactSyncedAt', 'updatedAt', 'savedAt']);
function contentOf(v) {
  if (Array.isArray(v)) return v.map(contentOf);
  if (v && typeof v === 'object') { const out = {}; for (const k of Object.keys(v).sort()) { if (STAMP_KEYS.has(k)) continue; out[k] = contentOf(v[k]); } return out; }
  return v;
}
/* v3 · THE SELECTION FINGERPRINT (Owner, 27 Sep 2026 · the Souphattra correction): what the guest chose — every line by its product,
   room, class, menu, quantity and unit — never what the website charges for it. An amount the website corrects (a rate, a line's
   price, its wording and frame) is derived from the selection, so a host-side correction never reads as a change of the guest's. */
/* `gift` (Owner, 28 Sep 2026 · src/gifts.js): who pays is the Bride & Groom's decision, never a change of the guest's selection */
const DERIVED_LINE_KEYS = new Set(['price', 'rate', 'roomRate', 'pay', 'nightsList', 'windowFixed', 'note', 'noteBy', 'breakfast', 'img', 'name', 'meta', 'basis', 'unitName', 'gift', 'personal', 'paidByHS', 'prepaidUnverified']);   /* `personal` (28 Sep 2026): a personal rate is who pays, not what was chosen */
function selectionOf(content) {
  const c = contentOf(content);
  const bag = c && c.draft && Array.isArray(c.draft['siyl.bag']) ? c.draft['siyl.bag'] : null;
  if (bag) c.draft['siyl.bag'] = bag.map((l) => (l && typeof l === 'object' ? Object.fromEntries(Object.entries(l).filter(([k]) => !DERIVED_LINE_KEYS.has(k))) : l));
  return c;
}
/* THE SOUPHATTRA RATES BEFORE THE CORRECTION (27 Sep 2026) — only to recognise a trip sent before it: its Bag lines carried these
   amounts, the corrected lines carry the Operations Master's two periods. Never an amount the website shows or charges. */
const SOUPHATTRA_BEFORE = { heritage: 145, 'heritage-executive': 155, 'heritage-grand-premier': 170, 'noble-courtyard': 240, 'grand-majestic': 250, 'souphattra-majestic': 290, 'souphattra-presidential': 750 };
const SOUPHATTRA_NOW = {
  prewed: { heritage: 112.5, 'heritage-executive': 130, 'heritage-grand-premier': 162.5, 'noble-courtyard': 247.5, 'grand-majestic': 345, 'souphattra-majestic': 385, 'souphattra-presidential': 1095 },
  wedstay: { heritage: 145, 'heritage-executive': 155, 'heritage-grand-premier': 170, 'noble-courtyard': 195, 'grand-majestic': 250, 'souphattra-majestic': 200, 'souphattra-presidential': 750 }
};
/* THE LIVE 002 CORRECTION (28 Sep 2026) — only to recognise a trip sent before it without a selection fingerprint: [now, before]
   per person per night of every room whose rate the Operations Master corrected. Never an amount the website shows or charges. */
const RATES_0928 = { 'bkk-stay': { 'u-sathorn-superior-garden': [67.805, 64] },
  /* the live 002 of 7 Oct 2026 first (closeout: per person = half the room), then every former rate */
  kmg: { 'elegant-residence': [39.12, 42], 'jinri-terrace-double': [18.16666667, 36.33333333], 'jinri-family-suite': [21.445, 42.89, 43] },
  ljg: { 'private-soup-view': [58.155, 116.31, 116.37, 125],   /* 7 Oct · T25 USD 116.31 (Owner, 1 Oct 2026) · 116.37 (28 Sep) · 125 */
   'view-suite-270': [54.2175, 108.435, 120], 'snow-mountain-viewing': [134.14, 75] },   /* R27 USD 268.28 (Owner, 1 Oct 2026) */
  kempinski: { 'jatu-room': [40.8525, 92.1] } };
/* the draft as it read before the correction: a corrected Souphattra line back at its former rate — nothing else is touched */
/* `k` picks the former rate of a room that has had more than one ([now, former 1, former 2 …]): each is tried in turn */
function beforeCorrection(d, k = 1) {
  if (!d || !d.keys || typeof d.keys['siyl.bag'] !== 'string') return null;
  let bag; try { bag = JSON.parse(d.keys['siyl.bag']); } catch (e) { return null; }
  if (!Array.isArray(bag)) return null;
  let changed = false;
  const back = bag.map((l) => {
    const r28 = l && RATES_0928[l.id] && RATES_0928[l.id][l.room];
    /* a rate the server states at the sheet's own precision (18.166666666666668) is the same rate as 18.16666667 */
    const at = r28 ? r28.findIndex((v) => Math.abs(v - Number(l.rate)) < 1e-6) : -1;
    if (at >= 0) { const to = r28[Math.min(k, r28.length - 1)]; if (Math.abs(to - Number(l.rate)) < 1e-6) return l; changed = true; const pay = Number(l.pay) || 1; return { ...l, rate: to, price: Math.round(to * pay * 100) / 100 }; }
    const now = l && SOUPHATTRA_NOW[l.id] && SOUPHATTRA_NOW[l.id][l.room], was = l && SOUPHATTRA_BEFORE[l.room];
    if (now == null || was == null || l.rate !== now || now === was) return l;
    changed = true; const pay = Number(l.pay) || (l.id === 'prewed' ? 2 : 1);
    return { ...l, rate: was, price: was * pay };
  });
  return changed ? { ...d, keys: { ...d.keys, 'siyl.bag': JSON.stringify(back) } } : null;
}
/* THE BRIDE & GROOM'S GIFT (28 Sep 2026) — only to recognise a trip sent before it (a record without the selection fingerprint): a
   gifted line back at the hotel's rate, as it was sent; nothing else is touched */
function withoutGifts(d) {
  if (!d || !d.keys || typeof d.keys['siyl.bag'] !== 'string') return null;
  let bag; try { bag = JSON.parse(d.keys['siyl.bag']); } catch (e) { return null; }
  if (!Array.isArray(bag) || !bag.some((l) => l && (l.gift || l.personal))) return null;
  const back = bag.map((l) => { if (!l || !(l.gift || l.personal)) return l; const { gift, personal, ...rest } = l; const rate = Number(rest.rate), pay = Number(rest.pay) || 1; if (Number.isFinite(rate)) rest.price = Math.round(rate * pay * 100) / 100; return rest; });
  return { ...d, keys: { ...d.keys, 'siyl.bag': JSON.stringify(back) } };
}
/* the draft and the guest's engine view with the replaced room in one form ('legacy' · 'canonical'), or null when nothing
   of it is there — only for comparing fingerprints, never written */
function replacedAs(d, rooms, dir) {
  let changed = false, keys = d && d.keys;
  if (keys && typeof keys['siyl.bag'] === 'string') {
    let bag = null; try { bag = JSON.parse(keys['siyl.bag']); } catch (e) { bag = null; }
    if (Array.isArray(bag)) { const alt = bag.map((l) => lineAs(l, dir)); if (alt.some((l, i) => l !== bag[i])) { changed = true; keys = { ...keys, 'siyl.bag': JSON.stringify(alt) }; } }
  }
  let r = rooms;
  if (rooms && typeof rooms === 'object') { const alt = Object.fromEntries(Object.entries(rooms).map(([k, v]) => [k, viewAs(v, dir, SEED)])); if (Object.keys(alt).some((k) => alt[k] !== rooms[k])) { changed = true; r = alt; } }
  return changed ? { d: { ...d, keys }, rooms: r } : null;
}
/* the selection fingerprint of the CANONICAL form (the one a record keeps): a draft or engine view that still names the replaced
   room is fingerprinted as its successor, so a record never keeps a half-migrated form */
async function canonicalV3(fps, rooms, seats) {
  const alt = replacedAs(fps.d, rooms, 'canonical');
  if (alt) return (await fingerprintsOf(alt.d, alt.rooms, seats, ['v3'])).v3;
  return fps.v3 !== undefined ? fps.v3 : (await fingerprintsOf(fps.d, rooms, seats, ['v3'])).v3;   /* a legacy comparison did not need v3 */
}
/* v1: the historical fingerprint (every stored record carries it) · v2: the content fingerprint · v3: the selection fingerprint */
async function journeyFingerprints(env, who, draft) {
  const d = draft === undefined ? await storedDraft(env, who.invitationId) : draft;
  const [rooms, seats] = await Promise.all([engineRooms(env, who), engineSeats(env, who)]);
  return { ...(await fingerprintsOf(d, rooms, seats)), rooms, seats };
}
/* the same three fingerprints from a draft and the guest's engine views already in hand (Guest Relations' overview reads the
   engines once for everyone — 28 Sep 2026) */
/* `which` (incident, 4 Oct 2026): only the fingerprints a caller compares are computed — the same inputs, the same hashes; the default
   is all three (registration and every other caller unchanged) */
async function fingerprintsOf(d, rooms, seats, which) {
  const want = which || ['v1', 'v2', 'v3'];
  /* the fingerprint is the guest's OWN journey: a waiting-list position moves when others leave the line — not a change of theirs */
  const own = rooms ? Object.fromEntries(Object.entries(rooms).map(([k, v]) => [k, v && v.waitlisted ? { stage: v.stage, waitlisted: true, size: v.size } : v])) : rooms;
  const content = draftContent(d && d.keys);
  const out = { d };
  await Promise.all([
    want.includes('v1') ? sha256Hex(JSON.stringify({ draft: content, rooms: own, seats })).then((h) => { out.v1 = h; }) : null,
    want.includes('v2') ? sha256Hex(JSON.stringify(contentOf({ draft: content, rooms: own, seats }))).then((h) => { out.v2 = h; }) : null,
    want.includes('v3') ? sha256Hex(JSON.stringify(selectionOf({ draft: content, rooms: own, seats }))).then((h) => { out.v3 = h; }) : null,
  ]);
  return out;
}
/* A CONFIRMATION STANDS for the version Guest Relations confirmed (OQ-27 · PRQ-01-05 / 02-04 / 04-04): a confirmation that names
   its version stands while that version is the latest sent; an older confirmation (no version recorded) stands while nothing was
   sent after it */
/* confirmationStands — the one rule, shared with the Guest Settlement (src/confirmation.js) */
function submissionStateOf(record, hasUnsentChanges, conf) {
  if (!record || !record.submissionId) return { submissionStatus: 'draft', submissionId: null, submittedAt: null, lastSentAt: null, version: 0, hasUnsentChanges: false, declined: false, sentSelections: null, confirmed: false, confirmedAt: null, confirmedVersion: null, lapsed: false };
  const reg = record.registration && typeof record.registration === 'object' ? record.registration : {};
  const gr = reg.guestRecord && typeof reg.guestRecord === 'object' ? reg.guestRecord : {};
  const stands = confirmationStands(conf, record), confirmed = stands && !hasUnsentChanges;
  return { submissionStatus: hasUnsentChanges ? 'changes-not-sent' : 'sent', submissionId: record.submissionId, submittedAt: record.submittedAt, lastSentAt: record.lastSentAt || record.submittedAt, version: record.version || 1, hasUnsentChanges: !!hasUnsentChanges, mail: record.mailSummary || null,
    /* the last send as the guest's own pages read it: a "not joining" reply or a trip, and the Bag lines it carried */
    declined: !!(gr.scope && gr.scope.none), sentSelections: Array.isArray(reg.selections) ? canonicalLines(reg.selections) : [],
    confirmed, confirmedAt: confirmed ? conf.confirmedAt : null, confirmedVersion: conf && conf.confirmedAt ? (conf.version != null ? conf.version : null) : null, lapsed: !!(conf && conf.confirmedAt) && !confirmed };
}
/* `pre` (Guest Relations' overview, 28 Sep 2026): the record, the confirmation and the engine views already read for everyone —
   nothing is read again, and the overview never writes (the one-time keeping of the selection fingerprint is the guest's own read's) */
async function submissionFor(env, who, draft, pre) {
  let record = null;
  if (pre) record = pre.record || null; else { try { record = JSON.parse(await env.REG_KV.get('reg:' + who.invitationId) || 'null'); } catch (e) { record = null; } }
  if (!record) return submissionStateOf(null, false);
  let conf = null;
  if (pre) conf = pre.conf || null; else { try { conf = JSON.parse(await env.REG_KV.get('conf:' + who.invitationId) || 'null'); } catch (e) { conf = null; } }
  let R0, S0;
  if (pre) { R0 = pre.rooms; S0 = pre.seats; } else { [R0, S0] = await Promise.all([engineRooms(env, who), engineSeats(env, who)]); }
  /* the one fingerprint this record is compared by (incident, 4 Oct 2026): the selection, else the content, else the historical one */
  const need = [record.selectionFingerprint ? 'v3' : record.contentFingerprint ? 'v2' : 'v1'];
  const fpsOf = (dd, rr) => fingerprintsOf(dd, rr === undefined ? R0 : rr, S0, need);
  const fps = await fpsOf(pre ? draft : (draft === undefined ? await storedDraft(env, who.invitationId) : draft));
  /* THE HOTEL MUSE REPLACEMENT (28 Sep 2026) is the website's, not the guest's: a trip sent naming the Siam Kempinski's room
     (or sent since, while this device still named it) is the same trip — the draft and the engine view in the other form */
  const otherForms = async () => { const out = []; for (const dir of ['canonical', 'legacy']) { const alt = replacedAs(fps.d, R0, dir); if (alt) out.push(await fpsOf(alt.d, alt.rooms)); } return out; };
  /* a record sent with the selection fingerprint compares selections; an older one its content, the oldest its historical form */
  const legacy = (f) => (record.contentFingerprint ? record.contentFingerprint !== f.v2 : (!!record.draftFingerprint && record.draftFingerprint !== f.v1));
  let unsent;
  if (record.selectionFingerprint) {
    unsent = record.selectionFingerprint !== fps.v3;
    if (unsent) for (const f2 of await otherForms()) if (record.selectionFingerprint === f2.v3) { unsent = false; break; }
  } else {
    unsent = legacy(fps);
    if (unsent) for (const f2 of await otherForms()) if (!legacy(f2)) { unsent = false; break; }
    /* THE SOUPHATTRA CORRECTION (27 Sep 2026) is the website's, not the guest's: a trip sent before it still reads as sent when
       the only difference is the corrected rate */
    for (let k = 1; unsent && k <= 3; k++) { const back = beforeCorrection(fps.d, k); if (back) { const f2 = await fpsOf(back); if (!legacy(f2)) unsent = false; } }
    /* THE BRIDE & GROOM'S GIFT (28 Sep 2026) is theirs, not the guest's: the same trip with the gift taken back reads as sent */
    if (unsent) { const back = withoutGifts(fps.d); if (back) { const f2 = await fpsOf(back); if (!legacy(f2)) unsent = false; } }
    /* the first time a sent trip is read unchanged, its selection fingerprint is kept with it — from then on only a selection counts */
    if (!unsent && env.REG_KV && !pre) { try { record.selectionFingerprint = await canonicalV3(fps, R0, S0); await env.REG_KV.put('reg:' + who.invitationId, JSON.stringify(record), { metadata: { invitationId: who.invitationId, submittedAt: record.submittedAt, submissionId: record.submissionId, version: record.version, lastSentAt: record.lastSentAt } }); } catch (e) { /* compared again next time */ } }
  }
  return submissionStateOf(record, unsent, conf);
}
/* ONE TABLE FOR TWO (PRQ-07a-06, Window 007): the 1872 afternoon tea is one table for a party of two — when another member of the
   guest's own party already has it in their trip, the draft read says so (their first name only), and the page offers no second
   table. Read-only; nothing of the other guest's trip is returned but that one fact. */
const TABLE_PRODUCTS = { '1872': ['1872', 'tea1872'] };
async function partyTables(env, who, origin) {
  if (!who || !who.partyId || !env.REG_KV) return null;
  let entries = null; try { entries = await loadIndex(env, origin || lastOrigin); } catch (e) { return null; }
  const mates = Object.values(entries || {}).filter((e) => e && e.p === who.partyId && e.i && e.i !== who.invitationId);
  if (!mates.length) return null;
  const out = {};
  for (const m of mates) {
    let d = null; try { d = await storedDraft(env, m.i); } catch (e) { d = null; }
    let bag = []; try { bag = JSON.parse((d && d.keys && d.keys['siyl.bag']) || '[]'); } catch (e) { bag = []; }
    if (!Array.isArray(bag)) continue;
    for (const [id, ids] of Object.entries(TABLE_PRODUCTS)) {
      if (out[id] || !bag.some((l) => l && ids.includes(String(l.id)))) continue;
      const mate = { invitationId: m.i, guestId: m.g };
      try { await withFirstName(env, mate, origin); } catch (e) { /* no name */ }
      /* the page names the party member from its own invitation when the server knows no name yet */
      out[id] = { guestId: m.g, name: mate.firstName || '' };
    }
  }
  return Object.keys(out).length ? out : null;
}
/* WHO OF THE PARTY TRAVELS (Owner, 25 Sep 2026 · mixed attendance — a guest reported that a booking counted her husband,
   who is not coming): the other members of the guest's own party and their CURRENT answer — their draft first (their latest
   word), else what they sent, else unanswered. Returned per member as a participation word and, per stay stage, the places
   a booking of the guest needs (src/stage-graph.js · partyNeed). The couple stays a couple; only the count of those
   travelling follows the answers. Read-only; nothing of another guest's trip is returned but their participation. */
const TRAVEL_STAGES = GRAPH_STAGES.filter((s) => s.kind === 'stay').map((s) => s.key);
async function mateScope(env, invitationId) {
  let d = null; try { d = await storedDraft(env, invitationId); } catch (e) { d = null; }
  let g = null; try { g = JSON.parse((d && d.keys && d.keys['siyl.guest']) || 'null'); } catch (e) { g = null; }
  const fromDraft = g && g.scope ? graphScope(g.scope) : null;
  if (fromDraft) return fromDraft;
  let rec = null; try { rec = JSON.parse(await env.REG_KV.get('reg:' + invitationId) || 'null'); } catch (e) { rec = null; }
  /* the sent record keeps the page's guest record under its registration */
  const gr = rec && ((rec.registration && rec.registration.guestRecord) || rec.guestRecord);
  return gr && gr.scope ? graphScope(gr.scope) : null;
}
async function partyTravel(env, who, origin) {
  if (!who || !who.partyId || !env.REG_KV) return null;
  let entries = null; try { entries = await loadIndex(env, origin || lastOrigin); } catch (e) { return null; }
  const mates = Object.values(entries || {}).filter((e) => e && e.p === who.partyId && e.i && e.i !== who.invitationId);
  const scopes = [], members = {};
  for (const m of mates) { const sc = await mateScope(env, m.i); scopes.push(sc); members[m.g] = graphParticipation(sc); }
  const own = await mateScope(env, who.invitationId);
  /* need: the places a booking by this guest takes (the guest and the others who travel) · travels: per member of the party
     (the guest by their own answer), the stay stages they travel in — what the engine may keep places for */
  const need = {}, travels = {};
  /* A ROOM OF ONE'S OWN (Owner, 29 Sep 2026 · 002 · W): in a stage where a member has a dedicated room, that member is not part
     of the party's booking — nobody books or keeps a place for them, and they book their own room alone (never a split) */
  const selfEntry = Object.values(entries || {}).find((e) => e && e.i === who.invitationId && e.g === who.guestId);
  const ownDed = dedicatedStages(selfEntry && selfEntry.c), mateDed = mates.map((m) => dedicatedStages(m.c));
  for (const k of TRAVEL_STAGES) need[k] = ownDed.includes(k) ? graphPartyNeed(k, []) : graphPartyNeed(k, scopes.filter((sc, i) => !mateDed[i].includes(k)));
  const everyone = [[who.guestId, own, ownDed]].concat(mates.map((m, i) => [m.g, scopes[i], mateDed[i]]));
  for (const [g, sc, ded] of everyone) { travels[g] = {}; for (const k of TRAVEL_STAGES) travels[g][k] = graphTravels(k, sc) && !(g !== who.guestId && ded.includes(k)); }
  return { members, need, travels };
}
async function handleDraft(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  if (request.method === 'GET') {
    let d, actorEpoch = null; try { const r = env.DRAFTS ? await draftOp(env, who.invitationId, 'get') : null; if (r) { if (!r.ok) throw new Error(r.error || 'draft could not be read'); d = r.draft || null; actorEpoch = r.epoch || null; } else d = await storedDraft(env, who.invitationId, true); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); }
    const submission = await submissionFor(env, who, d);
    let resetAt = actorEpoch; if (!resetAt) { try { resetAt = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); } }
    const party = await partyTables(env, who, new URL(request.url).origin);
    let travel = null; try { travel = await partyTravel(env, who, new URL(request.url).origin); } catch (e) { travel = null; }
    return json({ ok: true, invitationId: who.invitationId, guestId: who.guestId, ...(travel ? { travel } : {}), draft: d ? { keys: d.keys, updatedAt: d.updatedAt, savedAt: d.savedAt, clientUpdatedAt: d.clientUpdatedAt || null } : null, submission, ...(party ? { party } : {}), ...(resetAt ? { resetAt } : {}) }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  let body; try { const raw = await request.text(); if (raw.length > MAX_BODY) return json({ ok: false, error: 'payload too large' }, 413, corsHeaders(request)); body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  if (body && body.invitationId && String(body.invitationId) !== who.invitationId) return json({ ok: false, error: 'not your invitation' }, 403, corsHeaders(request));
  const incoming = {};
  for (const k of DRAFT_KEYS) if (body && body.keys && typeof body.keys[k] === 'string') incoming[k] = body.keys[k];
  if (!Object.keys(incoming).length) return json({ ok: false, error: 'nothing to save' }, 400, corsHeaders(request));
  /* THE WRITE IS THE ACTOR'S (Codex P1-1): the revision comparison, the merge over the stored keys and
     the write happen inside one serialised step per invitation — two devices, or two overlapping autosaves, can never both
     pass the same base revision. A stale device (an older `baseUpdatedAt`, or none against a stored draft) is refused with the
     current draft; its independent edits are merged on the device against the base it last read (assets/draft.js). */
  const base = body && typeof body.baseUpdatedAt === 'string' ? body.baseUpdatedAt : null;
  /* THE CLEAN RESET (Owner, 19 Sep 2026): a device that has not read the server since the reset cannot write — its cached
     journey would come back as the draft. It learns the epoch from the read, clears, and reads again (assets/draft.js). */
  let epoch; try { epoch = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); }   /* fail closed: a store that cannot be read is not "no reset" */
  if (epoch && (!body || body.seenReset !== epoch)) return json({ ok: false, error: 'reset', resetAt: epoch }, 409, corsHeaders(request));
  let d = null;
  if (env.DRAFTS) {
    const r = await draftOp(env, who.invitationId, 'put', { keys: incoming, baseUpdatedAt: base, clientUpdatedAt: body && body.clientUpdatedAt || null, reason: body && body.reason || null, guestId: who.guestId, seenReset: body && body.seenReset || null });
    if (r.status === 409 && r.error === 'reset') return json({ ok: false, error: 'reset', resetAt: r.resetAt }, 409, corsHeaders(request));
    if (r.status === 409) { const submission = await submissionFor(env, who, r.draft); return json({ ok: false, error: 'stale', invitationId: who.invitationId, draft: { keys: r.draft.keys, updatedAt: r.draft.updatedAt, savedAt: r.draft.savedAt }, submission }, 409, corsHeaders(request)); }
    if (!r.ok) return json({ ok: false, error: r.error || 'draft could not be stored', ...(r.retry ? { retry: true } : {}) }, r.status === 400 ? 400 : 503, corsHeaders(request));
    d = r.draft;
  } else {
    /* no actor bound (a reduced test environment): the same rules, one request at a time */
    const prevDraft = await storedDraft(env, who.invitationId);
    if (prevDraft && prevDraft.updatedAt && base !== prevDraft.updatedAt) { const submission = await submissionFor(env, who, prevDraft); return json({ ok: false, error: 'stale', invitationId: who.invitationId, draft: { keys: prevDraft.keys, updatedAt: prevDraft.updatedAt, savedAt: prevDraft.savedAt }, submission }, 409, corsHeaders(request)); }
    const keys = Object.assign({}, prevDraft && prevDraft.keys || {}, incoming);
    let now = new Date().toISOString(); if (prevDraft && prevDraft.updatedAt && now <= prevDraft.updatedAt) now = new Date(Date.parse(prevDraft.updatedAt) + 1).toISOString();
    d = { invitationId: who.invitationId, guestId: who.guestId, keys, updatedAt: now, savedAt: now, clientUpdatedAt: body && body.clientUpdatedAt || null, reason: body && body.reason || null };
    try { await env.REG_KV.put(draftKey(who.invitationId), JSON.stringify(d), { metadata: { invitationId: who.invitationId, guestId: who.guestId, updatedAt: now } }); } catch (e) { return json({ ok: false, error: 'draft could not be stored' }, 503, corsHeaders(request)); }
  }
  const keys = d.keys, now = d.updatedAt;
  /* the contact inside the draft is the server contact too (the recipient of the confirmation) */
  try { const g = JSON.parse(keys['siyl.guest'] || 'null'); const c = g && g.contact; if (c && (validEmail(c.email) || c.phone)) { const prev = await storedContact(env, who.invitationId) || {}; const email = validEmail(c.email) || prev.email || '', phone = (c.phone || '').trim().slice(0, 40) || prev.phone || ''; if (email !== (prev.email || '') || phone !== (prev.phone || '')) await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify({ ...prev, invitationId: who.invitationId, guestId: who.guestId, email, phone, at: now, from: 'draft' })); } } catch (e) { /* the draft stands */ }
  const submission = await submissionFor(env, who, d);
  return json({ ok: true, invitationId: who.invitationId, savedAt: now, updatedAt: now, submission }, 200, corsHeaders(request));
}
/* ---- THE CLEAN RESET (Owner, 19 Sep 2026 · hardened after the Codex pre-deploy review) ------------------------------
   Every guest starts as though they had never used the private planning system: every room occupancy the engine stores
   (the FIXED allocation is configuration, never stored), every seat hold, every draft actor, and the KV records a guest
   generated — draft mirrors, contacts, profile photos, submissions and their history. Invitations, codes, the register,
   the seating geometry and its open / frozen state and the inventory definitions are never touched.
   Three modes, all Guest-Relations-only:
     · dry run (default)  what would go — counts and ids — nothing written;
     · snapshot            the same, with every stored value (KV values with their metadata, binary as base64; the engine's
                           occupancy records; the seat holds; the drafts) — the caller writes and verifies its private
                           backup from this, BEFORE anything is deleted; the answer carries a digest of the key set;
     · execute             `dryRun: false`, the exact words `confirm: "RESET ALL GUEST STATE"` and the snapshot's `digest`:
                           refused when the key set changed since the snapshot (snapshot again). The order fences writes
                           in flight: every draft actor takes the epoch first (a write without it is refused inside the
                           actor, KV or no KV), then the epoch is published in KV, then the engine, the ledger and the KV
                           records are cleared. Nothing is read from the answer to recover — the backup already exists. */
const RESET_WORDS = 'RESET ALL GUEST STATE';
const RESET_PREFIXES = ['draft:', 'contact:', 'avatar:', 'reg:'];
/* the epoch: a failed read is a failed read, never "no reset" (fail closed) */
async function resetEpoch(env) { if (!env.REG_KV) return null; return (await env.REG_KV.get('reset:epoch')) || null; }
async function digestOf(keys) { const data = new TextEncoder().encode(keys.slice().sort().join('\n')); const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function b64(buf) { const bytes = new Uint8Array(buf); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
async function handleGrReset(request, env) {
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
  let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
  const execute = body && body.dryRun === false;
  if (execute && body.confirm !== RESET_WORDS) return json({ ok: false, error: 'the confirmation words are missing' }, 400);
  if (execute && !(body.digest && /^[a-f0-9]{64}$/.test(String(body.digest)))) return json({ ok: false, error: 'the snapshot digest is missing — snapshot first, keep the backup, then execute' }, 400);
  const snapshot = !execute && body && body.snapshot === true;
  const origin = new URL(request.url).origin;
  const at = new Date().toISOString();
  const out = { ok: true, mode: execute ? 'execute' : snapshot ? 'snapshot' : 'dry-run', dryRun: !execute, at, rooms: null, seating: null, drafts: { actors: 0, had: 0, cleared: 0, ids: [] }, kv: { keys: [], deleted: 0 }, backup: snapshot ? {} : undefined, digest: null };
  const grHeaders = { 'content-type': 'application/json', 'x-gr-verified': 'yes' };
  /* the key set: every invitation the register knows, plus every mirror or record key in KV */
  const invs = new Set();
  const entries = await loadIndex(env, origin, true);
  for (const e of Object.values(entries || {})) if (e && e.i) invs.add(e.i);
  const keys = [];
  for (const prefix of RESET_PREFIXES) {
    let cursor; do { const l = await env.REG_KV.list({ prefix, cursor }); for (const k of l.keys) { keys.push(k.name); const inv = k.name.slice(prefix.length).split(':')[0]; if (inv) invs.add(inv); } cursor = l.list_complete ? null : l.cursor; } while (cursor);
  }
  keys.sort(); out.kv.keys = keys;
  const roomsStub = env.ROOMS ? env.ROOMS.get(env.ROOMS.idFromName('rooms')) : null;
  const seatStub = env.SEATING ? env.SEATING.get(env.SEATING.idFromName('seating')) : null;
  const readRooms = async () => roomsStub ? (await roomsStub.fetch(new Request('https://rooms/api/rooms/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: true, snapshot: true }) }))).json() : null;
  const readSeats = async () => seatStub ? (await seatStub.fetch(new Request('https://seating/api/seating/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: true, snapshot: true }) }))).json() : null;
  /* the digest binds an execution to the state that was snapshotted — the VALUES, not only the keys: every KV value's bytes,
     every occupancy and hold record, every draft's revision (Codex final review) */
  const rooms0 = await readRooms(), seats0 = await readSeats();
  const draftIds = [], signature = [];
  if (env.DRAFTS) for (const inv of [...invs].sort()) { const r = await draftOp(env, inv, 'reset', { dryRun: true, snapshot: true }); out.drafts.actors++; if (r && r.had) { out.drafts.had++; draftIds.push(inv); signature.push('draft-actor:' + inv + '@' + (r.draft && r.draft.updatedAt || '')); if (snapshot && r.draft) out.backup['do:draft:' + inv] = r.draft; } }
  out.drafts.ids = draftIds;
  for (const r of (rooms0 && rooms0.rows || [])) signature.push('occ:' + r.key + '|' + r.label + '|' + r.guestId + '@' + JSON.stringify(r.value || null));
  for (const w of (rooms0 && rooms0.waits || [])) signature.push('wl:' + w.stage + '|' + w.guestId + '@' + JSON.stringify(w.value || null));
  for (const r of (seats0 && seats0.rows || [])) signature.push('hold:' + r.event + ':' + r.seatId + ':' + r.guestId + '@' + JSON.stringify(r.value || null));
  const kvValues = {};
  for (const k of keys) {
    /* lossless: the bytes as base64 with the metadata; a value that cannot be read is a failed snapshot, never a silent gap */
    const got = await env.REG_KV.getWithMetadata(k, { type: 'arrayBuffer' });
    if (got === null || got.value === null) { signature.push('kv:' + k + '@missing'); kvValues[k] = null; continue; }
    const v = { base64: b64(got.value), metadata: got.metadata || null, bytes: got.value.byteLength };
    kvValues[k] = v; signature.push('kv:' + k + '@' + await digestOf([v.base64]));
  }
  out.digest = await digestOf(signature);
  out.rooms = rooms0 ? { occupancies: rooms0.occupancies, fixed: 0, waitlisted: rooms0.waitlisted || 0, rows: (rooms0.rows || []).map((r) => ({ key: r.key, label: r.label, guestId: r.guestId })), waits: (rooms0.waits || []).map((w) => ({ stage: w.stage, guestId: w.guestId })) } : null;
  out.seating = seats0 ? { holds: seats0.holds, rows: (seats0.rows || []).map((r) => ({ event: r.event, seatId: r.seatId, guestId: r.guestId, invitationId: r.invitationId })) } : null;
  if (snapshot) {
    for (const r of (rooms0 && rooms0.rows || [])) out.backup[r.storageKey] = r.value;
    for (const w of (rooms0 && rooms0.waits || [])) out.backup[w.storageKey] = w.value;
    for (const r of (seats0 && seats0.rows || [])) out.backup[r.storageKey] = r.value;
    for (const k of keys) out.backup[k] = kvValues[k];
    return json(out);
  }
  if (!execute) return json(out);
  if (body.digest !== out.digest) return json({ ok: false, error: 'the state changed since the snapshot — snapshot again', digest: out.digest, snapshotDigest: body.digest }, 409);
  /* 0 · the gate: while the sweep runs, no guest write reaches the engine or the ledger (the Worker refuses join / leave /
       select / release with 503 retry); a lock older than five minutes is stale (a sweep that never finished) and ignored */
  await env.REG_KV.put('reset:lock', at, { metadata: { at } });
  try {
    /* 1 · every draft actor takes the epoch and forgets its draft — one serialised step each; a write in flight without the epoch is refused there */
    if (env.DRAFTS) for (const inv of [...invs].sort()) { const r = await draftOp(env, inv, 'reset', { dryRun: false, epoch: at }); if (r && r.cleared) out.drafts.cleared++; }
    /* 2 · the epoch every device honours, published before anything else goes */
    await env.REG_KV.put('reset:epoch', at, { metadata: { at, actor: String(body.actor || 'guest-relations').slice(0, 64), digest: out.digest } });
    out.epoch = at;
    /* 3 · the engine and the ledger */
    if (roomsStub) out.rooms = await (await roomsStub.fetch(new Request('https://rooms/api/rooms/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: false }) }))).json();
    if (seatStub) out.seating = await (await seatStub.fetch(new Request('https://seating/api/seating/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: false }) }))).json();
    /* 4 · the KV records */
    for (const k of keys) { await env.REG_KV.delete(k); out.kv.deleted++; }
  } finally {
    await env.REG_KV.delete('reset:lock');
  }
  /* 5 · what is left, read again */
  const rooms1 = await readRooms(), seats1 = await readSeats();
  let kvLeft = 0; for (const prefix of RESET_PREFIXES) { const l = await env.REG_KV.list({ prefix }); kvLeft += l.keys.length; }
  out.remaining = { occupancies: rooms1 ? rooms1.occupancies : null, waitlisted: rooms1 ? rooms1.waitlisted : null, holds: seats1 ? seats1.holds : null, kvKeys: kvLeft };
  return json(out);
}
/* the sweep's gate on guest writes to the engine and the ledger (never on reads, never on Guest Relations) */
async function resetLocked(env) {
  if (!env.REG_KV) return false;
  let at = null; try { at = await env.REG_KV.get('reset:lock'); } catch (e) { return true; }   /* a store that cannot be read: hold the write, it is retried */
  if (!at) return false;
  return Date.now() - Date.parse(at) < 5 * 60 * 1000;
}
/* ---- GUEST RELATIONS: the canonical current data of every guest with a draft or a submission ---- */
/* THE OVERVIEW WITHIN THE WORKER'S LIMITS (hotfix, 28 Sep 2026): the overview had become "Worker exceeded resource limits" (Cloudflare
   measured 327 ms of Worker CPU for 89 guests — the Free plan allows 10 ms). The cause was the shape of the reads, not the data (192 KB):
   for every guest the two engines were asked once for the trip state, once for the fingerprint and again for each correction check,
   every engine call first re-read and re-parsed the guest's record and contact to learn a first name a read never needs, the record
   and confirmation were read twice, the joining cohort read every record a third time — about eight round trips per guest, each
   costing Worker CPU — and a first read wrote the selection fingerprint back into the record. Now ONE bounded traversal: the keys
   listed once, every record, confirmation and contact read once (KV's multi-key read where the runtime has it), the two engines
   read ONCE for everyone (their Guest Relations-only `gr-mine`), each guest's draft once (the actor is the truth), a bounded number
   in flight at a time; the fingerprints from what is already in hand; the cohort from the records already read. Nothing is written. */
async function kvMany(kv, keys) {
  const out = new Map();
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    let got = null;
    try { got = chunk.length ? await kv.get(chunk) : new Map(); } catch (e) { got = null; }
    if (got instanceof Map) { for (const k of chunk) out.set(k, got.has(k) ? got.get(k) : null); continue; }
    await pool(chunk, 10, async (k) => { let v = null; try { v = await kv.get(k); } catch (e) { v = null; } out.set(k, v); });
  }
  return out;
}
async function pool(items, width, fn) {
  let next = 0;
  const run = async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, run));
}
const parsed = (raw) => { if (raw == null) return null; try { return JSON.parse(raw); } catch (e) { return null; } };
async function grEngine(env, binding, name, path) {
  const ns = env[binding]; if (!ns) return null;
  try { const r = await ns.get(ns.idFromName(name)).fetch(new Request('https://' + name + path, { headers: { 'x-gr-verified': 'yes' } })); const v = await r.json(); return v && v.ok ? v : null; } catch (e) { return null; }
}
/* the ledger's plan as every invitation's own seats { inv: { ceremony: { guestId: seatId }, dinner: { … } } } — the gr-mine projection */
function seatsByInvitation(plan) {
  const out = {};
  for (const event of ['ceremony', 'dinner']) for (const s of ((plan.events && plan.events[event] && plan.events[event].seats) || [])) {
    if (!s || !s.guestId || !s.invitationId || s.state === 'family' || s.state === 'available') continue;
    const m = out[s.invitationId] || (out[s.invitationId] = { ceremony: {}, dinner: {} });
    m[event][s.guestId] = s.seatId;
  }
  return out;
}
async function handleGrJourneys(request, env) {
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
  const origin = new URL(request.url).origin;
  const entries = await loadIndex(env, origin, false);
  const byInv = {}; for (const e of Object.values(entries || {})) byInv[e.i] = e;
  /* 1 · the keys, once */
  const [draftKeys, regKeys, avatarKeys] = await Promise.all([listAll(env.REG_KV, 'draft:'), listAll(env.REG_KV, 'reg:'), listAll(env.REG_KV, 'avatar:')]);
  const invs = new Set(), sent = new Set();
  for (const k of draftKeys) { const inv = k.slice(6); if (!inv.includes(':')) invs.add(inv); }
  for (const k of regKeys) { const inv = k.slice(4); if (!inv.includes(':')) { invs.add(inv); sent.add(inv); } }
  const list = [...invs].sort();
  /* 2 · every record, confirmation and contact, once; the couple's contacts with them (the cohort names the couple) */
  const couple = Object.values(entries || {}).filter((e) => e && e.h === 1 && e.i).map((e) => e.i);
  const contactInvs = [...new Set(list.concat(couple))];
  const kv = await kvMany(env.REG_KV, [...sent].map((i) => 'reg:' + i).concat([...sent].map((i) => 'conf:' + i), contactInvs.map((i) => contactKey(i))));
  const recs = {}, confs = {}, contacts = {};
  for (const i of sent) { recs[i] = parsed(kv.get('reg:' + i)); confs[i] = parsed(kv.get('conf:' + i)); }
  for (const i of contactInvs) contacts[i] = parsed(kv.get(contactKey(i)));
  /* 3 · the two engines, once for everyone */
  /* the seat ledger ONCE: its plan gives every invitation's own seats (exactly the `gr-mine` projection — a chair of the plan, held,
     never a family chair) and the seat holders the joined union (readCohort) needs */
  const [roomsAll, seatPlan] = await Promise.all([grEngine(env, 'ROOMS', 'rooms', '/api/rooms/gr-mine'), grEngine(env, 'SEATING', 'seating', '/api/seating/plan')]);
  const seatsAll = seatPlan ? { ok: true, byInvitation: seatsByInvitation(seatPlan) } : null;
  /* 4 · each guest: the draft (its own actor), then what is already in hand */
  const out = new Array(list.length);
  await pool(list, 8, async (inv, n) => {
    const e = byInv[inv] || null, who = e ? { invitationId: inv, guestId: e.g, partyId: e.p, hosts: e.h === 1, contactId: e.c || null, couple: e.k || null } : { invitationId: inv, guestId: inv.replace(/^INV-/, ''), partyId: null, hosts: false };
    const d = await storedDraft(env, inv), rec = recs[inv] || null;
    const rooms = roomsAll ? roomsViewOf({ ok: true, ...((roomsAll.byGuest || {})[who.guestId] || { mine: {}, waitlist: {} }) }) : null;
    const seats = seatsAll ? ((seatsAll.byInvitation || {})[inv] || { ceremony: {}, dinner: {} }) : null;
    const content = draftContent(d && d.keys), g = content['siyl.guest'] || {};
    const sub = await submissionFor(env, who, d, { record: rec, conf: confs[inv] || null, rooms, seats });
    const contact = contacts[inv] || null;
    out[n] = { invitationId: inv, guestId: who.guestId, partyId: who.partyId, hosts: who.hosts, contactId: who.contactId || null, couple: who.couple || null, name: rec ? guestNameOf(rec) : null,
      status: sub.submissionStatus, submissionId: sub.submissionId, version: sub.version, submittedAt: sub.submittedAt, lastSentAt: sub.lastSentAt, hasUnsentChanges: sub.hasUnsentChanges,
      draftUpdatedAt: d ? d.updatedAt : null, contact: contact ? publicContact(contact) : (g.contact || null),
      bag: Array.isArray(content['siyl.bag']) ? canonicalLines(content['siyl.bag']) : (content['siyl.bag'] || null), wedding: content['siyl.temple'] || null, aboutYou: g.guests ? Object.values(g.guests).map((x) => ({ submitted: x.submitted, profile: x.profile })) : null, documents: content['siyl.docs'] || null,
      rooms, seats, mail: rec ? (rec.mailSummary || null) : null, text: rec ? rec.text : null, noteAck: noteAckOf(d), rulesAck: rulesAckOf(d) };
  });
  /* THE TWO LIVE ANSWERS FOR THE PLANNER (Owner, 27 Sep 2026): the music of question 06 and the end of the wedding night — the counts,
     the respondents and who chose each option, over the joining cohort — beside, never inside, the journeys; read fresh, from the
     records already in hand */
  let answers = null;
  try {
    const P = pulseOf(await readCohort(env, origin, { regKeys, avatarKeys, recs, contacts, plan: seatPlan }));
    const named = (list) => list.map((p) => ({ guestId: p.guestId, invitationId: p.invitationId, name: p.name }));
    answers = { joining: P.people.length, capacity: WEDDING_CAPACITY,
      music: { responses: P.musicResponses, leaders: P.leaders, ranking: P.ranking.map((r) => ({ ...r, guests: named(P.people.filter((p) => p.music.includes(r.genre))) })) },
      afterDinner: { responses: P.afterResponses, pool: { count: P.pool, guests: named(P.people.filter((p) => p.after === 'pool')) }, party: { count: P.party, guests: named(P.people.filter((p) => p.after === 'party')) } } };
  } catch (e) { answers = null; }
  return json({ ok: true, at: new Date().toISOString(), acknowledgements: acknowledgementSummary(entries, out), answers, journeys: out });
}
/* the guest's two acknowledgements, each on its own — read from the guest's own draft record (never the trip content) */
function rawGuest(keys) {
  if (!keys || typeof keys !== 'object') return null;
  if (RAW_GUEST.has(keys)) return RAW_GUEST.get(keys);
  let g = null; try { g = JSON.parse(keys['siyl.guest'] || 'null'); } catch (e) { g = null; }
  RAW_GUEST.set(keys, g); return g;
}
function ackOf(d, field) {
  const g = rawGuest(d && d.keys);   /* the raw guest record (draftContent drops note / rules) — parsed once for both acknowledgements */
  const n = g && g[field]; return n && n.acknowledged === true ? { acknowledged: true, at: n.at || null, textVersion: n.textVersion || null } : null;
}
/* whether this guest acknowledged the note from the Guest Relations Manager */
function noteAckOf(d) { return ackOf(d, 'note'); }
/* whether this guest read and acknowledged the Unwritten Rules (Owner, 27 Sep 2026) */
function rulesAckOf(d) { return ackOf(d, 'rules'); }
/* WHO HAS NOT YET ACKNOWLEDGED (Owner, 27 Sep 2026): for each acknowledgement, every invited guest of the register (never the hosts)
   who has not given it — a guest who has never signed in has not given either. Ids only, the name where the guest's own record has one. */
function acknowledgementSummary(entries, journeys) {
  const byInv = {}; for (const j of journeys) byInv[j.invitationId] = j;
  const guests = []; const seen = new Set();
  for (const e of Object.values(entries || {})) { if (!e || !e.i || e.h === 1 || seen.has(e.i)) continue; seen.add(e.i); guests.push({ invitationId: e.i, guestId: e.g }); }
  guests.sort((a, b) => a.invitationId < b.invitationId ? -1 : a.invitationId > b.invitationId ? 1 : 0);
  const one = (field) => {
    const pending = [], done = [];
    for (const g of guests) { const j = byInv[g.invitationId], ack = j ? j[field] : null; (ack ? done : pending).push({ guestId: g.guestId, invitationId: g.invitationId, name: j ? j.name : null, signedIn: !!(j && j.draftUpdatedAt), at: ack ? ack.at : null }); }
    return { guests: guests.length, acknowledged: done.length, pending: pending.length, pendingGuests: pending };
  };
  return { guestRelationsNote: one('noteAck'), unwrittenRules: one('rulesAck') };
}
/* the flat mail record the Owner asked for, beside the provider answers */
function mailSummary(mail) {
  const o = mail && mail.owner || {}, g = mail && mail.guest || {};
  return { ownerMailStatus: o.accepted ? 'accepted' : 'failed', ownerMessageId: o.id || null, guestMailStatus: g.accepted ? 'accepted' : 'failed', guestMessageId: g.id || null, guestTo: g.to || null, mailLastError: g.error || o.error || null, at: mail && mail.at || null };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (e) => typeof e === 'string' && EMAIL_RE.test(e.trim()) ? e.trim() : '';
const contactKey = (invitationId) => 'contact:' + invitationId;
async function storedContact(env, invitationId) {
  if (!env.REG_KV) return null;
  try { const raw = await env.REG_KV.get(contactKey(invitationId)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
/* the authenticated guest's contact: GET reads it, PUT/POST stores it — the guest's own invitation only */
/* the register's person id (CONxxx) and couple state (COUPLxxx · SIGL) of an authenticated guest — read from the served index entry
   of their own invitation (the auth authority itself is frozen: this reads beside it, never through a client body) */
async function personOf(env, origin, who) {
  try { const entries = await loadIndex(env, origin, false); const e = Object.values(entries || {}).find((x) => x && x.i === who.invitationId && x.g === who.guestId); return { contactId: e && typeof e.c === 'string' ? e.c : null, couple: e && typeof e.k === 'string' ? e.k : null }; } catch (e) { return { contactId: null, couple: null }; }
}
/* THE GUEST'S OWN NAME (Owner, 21 Sep 2026): First Name · Last Name are the guest's to correct — profile data under the same
   invitation, never the identity (guestId · CONxxx · COUPLxxx stay the register's; no code, no auth changes) */
const PERSONAL_KEYS = ['firstName', 'lastName', 'birthdate', 'nationality', 'address1', 'address2', 'postal', 'city', 'region', 'country'];
const PERSONAL_MAX = { firstName: 80, lastName: 80, birthdate: 10, nationality: 80, address1: 160, address2: 160, postal: 20, city: 80, region: 80, country: 80 };
const validBirthdate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return false; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return +m[1] >= 1900 && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && d.getTime() < Date.now(); };
const publicContact = (c) => { const out = { email: c.email || '', phone: c.phone || '' }; for (const k of PERSONAL_KEYS) out[k] = c[k] || ''; return out; };
async function handleContact(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  /* THE CLEAN RESET (Owner, 19 Sep 2026): the contact channel honours the epoch as the draft does — the read names it, a
     write without it is refused, a store that cannot be read fails closed */
  let epoch; try { epoch = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'contact store unavailable', retry: true }, 503, corsHeaders(request)); }
  if (request.method === 'GET') {
    const c = await storedContact(env, who.invitationId);
    return json({ ok: true, invitationId: who.invitationId, contact: c ? { ...publicContact(c), at: c.at } : null, ...(epoch ? { resetAt: epoch } : {}) }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  let body; try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  if (body && body.invitationId && String(body.invitationId) !== who.invitationId) return json({ ok: false, error: 'not your invitation' }, 403, corsHeaders(request));
  if (epoch && body.seenReset !== epoch) return json({ ok: false, error: 'reset', resetAt: epoch }, 409, corsHeaders(request));
  const prev = await storedContact(env, who.invitationId) || {};
  const email = body && typeof body.email === 'string' ? body.email.trim().slice(0, 254) : prev.email || '';
  const phone = body && typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : prev.phone || '';
  if (email && !validEmail(email)) return json({ ok: false, error: 'invalid email', field: 'email' }, 422, corsHeaders(request));
  /* THE PERSONAL DETAILS (Owner, 20 Sep 2026): the guest's own — stored with the contact under the guest's own invitation;
     the identity (guestId · CONxxx · COUPLxxx) is never taken from the body */
  const personal = {};
  for (const k of PERSONAL_KEYS) personal[k] = body && typeof body[k] === 'string' ? body[k].trim().slice(0, PERSONAL_MAX[k] || 120) : (prev[k] || '');
  if (personal.birthdate && !validBirthdate(personal.birthdate)) return json({ ok: false, error: 'invalid date of birth', field: 'birthdate' }, 422, corsHeaders(request));
  /* THE KV WRITE BUDGET (hotfix, 27 Sep 2026): a save that changes nothing writes nothing — the stored contact is the answer */
  if (prev.at && prev.guestId === who.guestId && email === (prev.email || '') && phone === (prev.phone || '') && PERSONAL_KEYS.every((k) => personal[k] === (prev[k] || ''))) return json({ ok: true, invitationId: who.invitationId, contact: { ...publicContact(prev), at: prev.at } }, 200, corsHeaders(request));
  const contact = { invitationId: who.invitationId, guestId: who.guestId, email, phone, ...personal, at: new Date().toISOString() };
  try { await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify(contact), { metadata: { invitationId: who.invitationId, at: contact.at } }); } catch (e) { return json({ ok: false, error: 'contact could not be stored' }, 503, corsHeaders(request)); }
  return json({ ok: true, invitationId: who.invitationId, contact: { ...publicContact(contact), at: contact.at } }, 200, corsHeaders(request));
}
/* the profile photo: GET returns the bytes to the owner (or 404), PUT/POST stores a JPEG · PNG · WebP of at most
   MAX_PHOTO bytes (the client already reduces the picture to a small square), DELETE removes it — the guest's own only */
const MAX_PHOTO = 1024 * 1024; // 1 MB — a reduced square portrait, never an original
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const photoKey = (invitationId) => 'avatar:' + invitationId;
async function handleProfilePhoto(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'photo storage is not enabled yet', enabled: false }, 503, corsHeaders(request));
  /* WHO SITS WHERE (Owner, 20 Sep 2026): an authenticated guest may read ANOTHER guest's portrait by its opaque guest id (the
     seat plan shows it beside the name) — read only, never a write, never without a session */
  const of = request.method === 'GET' ? String(new URL(request.url).searchParams.get('of') || '').trim() : '';
  if (of && !/^[A-Z]\d{3}$/.test(of)) return json({ ok: false, error: 'unknown guest' }, 404, corsHeaders(request));
  const key = photoKey(of ? 'INV-' + of : who.invitationId);
  if (request.method === 'GET') {
    let got = null; try { got = await env.REG_KV.getWithMetadata(key, { type: 'arrayBuffer' }); } catch (e) { got = null; }
    if (!got || !got.value || !got.value.byteLength) return json({ ok: false, error: 'no photo' }, 404, corsHeaders(request));
    const meta = got.metadata || {};
    return new Response(got.value, { status: 200, headers: Object.assign({ 'content-type': PHOTO_TYPES.includes(meta.type) ? meta.type : 'image/jpeg',
      'cache-control': 'private, no-store', 'x-photo-at': meta.at || '' }, corsHeaders(request)) });
  }
  if (request.method === 'DELETE') {
    try { await env.REG_KV.delete(key); } catch (e) { return json({ ok: false, error: 'photo could not be removed' }, 503, corsHeaders(request)); }
    return json({ ok: true, removed: true }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!PHOTO_TYPES.includes(type)) return json({ ok: false, error: 'unsupported file type' }, 415, corsHeaders(request));
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ ok: false, error: 'empty file' }, 400, corsHeaders(request));
  if (bytes.byteLength > MAX_PHOTO) return json({ ok: false, error: 'file too large' }, 413, corsHeaders(request));
  const at = new Date().toISOString();
  try { await env.REG_KV.put(key, bytes, { metadata: { type, at, guestId: who.guestId, bytes: bytes.byteLength } }); } catch (e) { return json({ ok: false, error: 'photo could not be stored' }, 503, corsHeaders(request)); }
  return json({ ok: true, at, bytes: bytes.byteLength, type }, 200, corsHeaders(request));
}
/* THE IDENTITY CHAIN: authenticated guest → canonical guestId → the contact email persisted on the server → the recipient.
   The server-side contact wins; a valid email carried by the journey itself is accepted once and persisted (so the next
   device and the retry read the same one); a fixture shape (guests[0].contact) is read last. */
async function resolveRecipient(env, who, registration) {
  const stored = await storedContact(env, who.invitationId);
  if (stored && validEmail(stored.email)) return { email: validEmail(stored.email), phone: stored.phone || '', source: 'server contact' };
  const r = registration || {};
  const candidates = [[r.contact && r.contact.email, 'journey contact'], [r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.email, 'journey guest record'],
    [Array.isArray(r.guests) && r.guests[0] && r.guests[0].contact && r.guests[0].contact.email, 'journey guests[0]']];
  for (const [e, source] of candidates) {
    const email = validEmail(e);
    if (!email) continue;
    const phone = (r.contact && r.contact.phone) || (r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.phone) || '';
    /* merged, never replaced: the personal details already stored stay with the contact (Owner, 24 Sep 2026 · step 01 is required) */
    if (env.REG_KV) { try { const prev = await storedContact(env, who.invitationId) || {}; await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify({ ...prev, invitationId: who.invitationId, guestId: who.guestId, email, phone: phone || prev.phone || '', at: new Date().toISOString(), from: source })); } catch (e) { /* the send still goes to it */ } }
    return { email, phone, source };
  }
  return { email: '', phone: '', source: 'none' };
}

/* the submission reference: SYL-<guest>-<8 hex of the stored record's time and invitation> — no code, no bearer */
async function submissionIdOf(invitationId, submittedAt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('siyl.submission:' + invitationId + ':' + submittedAt));
  return 'SYL-' + String(invitationId).replace(/^INV-/, '') + '-' + [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const MAIL_FROM_NAME = 'See You In Laos — Guest Relations';
/* what the billing routes borrow from this Worker: the one mail transport (the admin console's statement email) */
const BILLING_DEPS = Object.freeze({ sendMail: (...a) => sendMail(...a) });
/* the email provider — the API key is a Worker secret, never in the repository:
 *   BREVO_API_KEY   → https://api.brevo.com/v3/smtp/email (sender = MAIL_FROM, a sender validated in Brevo)
 *   RESEND_API_KEY  → https://api.resend.com/emails       (sender = MAIL_FROM, a domain verified in Resend)
 * Without a key nothing is sent and the answer says so: { provider: 'none', accepted: false }. */
async function sendMail(env, to, toName, subject, text, html, attachments) {
  const from = (env.MAIL_FROM || GR_EMAIL).trim();
  /* `outcome` (Owner, 7 Oct 2026 · the statement email): SENT — the provider accepted it; REJECTED — the provider answered
     with a refusal (4xx), so nothing went out; UNCERTAIN — the request may have reached the provider without an answer
     (a 5xx, a lost response, a thrown fetch): the guest may have it, so nobody sends it again without being told so;
     NOT_SENT — no provider is configured. `accepted` keeps its meaning for every existing caller. */
  const out = { provider: 'none', accepted: false, id: null, status: 0, error: null, at: new Date().toISOString(), outcome: 'NOT_SENT' };
  /* attachments [{ name, content: base64 }] — only the statement email carries one */
  const files = Array.isArray(attachments) ? attachments.filter((a) => a && a.name && a.content) : [];
  const decide = (r) => { out.outcome = r.ok ? 'SENT' : (r.status >= 400 && r.status < 500 ? 'REJECTED' : 'UNCERTAIN'); };
  try {
    if (env.BREVO_API_KEY) {
      out.provider = 'brevo'; out.outcome = 'UNCERTAIN';
      const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: from, name: MAIL_FROM_NAME }, to: [{ email: to, name: toName || to }], replyTo: { email: GR_EMAIL, name: 'Guest Relations' }, subject, textContent: text, ...(html ? { htmlContent: html } : {}), ...(files.length ? { attachment: files.map((a) => ({ name: a.name, content: a.content })) } : {}) }) });
      out.status = r.status; decide(r); let d = null; try { d = await r.json(); } catch (e) {}
      out.accepted = r.ok; out.id = d && (d.messageId || null); if (!r.ok) out.error = (d && (d.message || d.code)) || ('HTTP ' + r.status);
    } else if (env.RESEND_API_KEY) {
      out.provider = 'resend'; out.outcome = 'UNCERTAIN';
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM_NAME + ' <' + from + '>', to: [to], reply_to: GR_EMAIL, subject, text, ...(html ? { html } : {}), ...(files.length ? { attachments: files.map((a) => ({ filename: a.name, content: a.content })) } : {}) }) });
      out.status = r.status; decide(r); let d = null; try { d = await r.json(); } catch (e) {}
      out.accepted = r.ok; out.id = d && (d.id || null); if (!r.ok) out.error = (d && (d.message || d.name)) || ('HTTP ' + r.status);
    } else {
      out.error = 'no email provider configured (set the Worker secret BREVO_API_KEY or RESEND_API_KEY and the variable MAIL_FROM)';
    }
  } catch (e) { out.error = String(e && e.message || e).slice(0, 160); }
  return out;
}
function guestEmailOf(record) {
  if (record && record.recipient && validEmail(record.recipient.email)) return validEmail(record.recipient.email);
  const r = record && record.registration || {};
  for (const e of [r.contact && r.contact.email, r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.email, Array.isArray(r.guests) && r.guests[0] && r.guests[0].contact && r.guests[0].contact.email]) { const v = validEmail(e); if (v) return v; }
  return '';
}
function guestNameOf(record) {
  const r = record && record.registration || {};
  const gr = r.guestRecord && Array.isArray(r.guestRecord.guests) && r.guestRecord.guests[0] || null;
  const g = Array.isArray(r.guests) && r.guests[0] || null;
  return (gr && gr.source && gr.source.fullName) || (gr && gr.name) || (g && (g.fullName || g.name)) || record && record.guestId || r.guestId || 'Guest';
}
/* the guest's rooms as the engine persists them: { stage: { key, label, name } } — read server-side under the guest's own identity */
/* A STAY H&S ALREADY PAID FOR THE GUEST (Edit 10, Owner, 7 Oct 2026): the server marks a sent stay line `paidByHS` from the
   Billing Engine (009) and gives it the engine's amount (null while 009 still asks for the price) — the e-mails and Guest
   Relations then say "already paid by Haruthai", never "book it yourself". A device's own mark is dropped and never trusted.
   Only a trip whose device names such a stay is asked about (every other sending reads nothing more), and the answer is waited
   for at most PAID_CHECK_MS: if the source cannot be read in time, the line the device called prepaid carries
   `prepaidUnverified` and the e-mails say neither — the sending itself never fails or waits longer on Google. */
const PAID_CHECK_MS = 1500;
export async function markPaidByHS(env, who, lines, claimed, waitMs) {   /* exported for its test */
  if (!Array.isArray(lines)) return lines;
  const bare = lines.map((l) => { if (!l || typeof l !== 'object') return l; const { paidByHS, prepaidUnverified, ...rest } = l; return rest; });
  if (!claimed || !claimed.size) return bare;
  let paid, timer;
  try {
    const limit = new Promise((_, no) => { timer = setTimeout(() => no(new Error('paid check timed out')), waitMs || PAID_CHECK_MS); });
    paid = await Promise.race([paidByHSOf(env, who && who.invitationId, who && who.guestId, bare.filter((l) => l && l.stay)), limit]);
  } catch (e) {
    /* no amount of its own (Owner, 8 Oct 2026 · pricing source of truth): the hotel's rate × nights verifiedLines left on it is
       never stored as what the guest owes — the e-mails say "Price to follow" and the Billing Engine decides */
    return bare.map((l) => (l && l.stay && claimed.has(siteKeyOfSelection(l)) ? { ...l, prepaidUnverified: true, price: null } : l));
  } finally { clearTimeout(timer); }
  return bare.map((l) => {
    const p = l && l.stay ? paid.get(siteKeyOfSelection(l)) : null;
    return p ? { ...l, paidByHS: true, price: p.total != null ? p.total : null } : l;
  });
}

async function engineRooms(env, who) {
  if (!env.ROOMS || !who) return null;
  try {
    const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
    const r = await stub.fetch(new Request('https://rooms/api/rooms/mine', { headers: { 'x-siyl-identity': JSON.stringify(await withFirstName(env, who)) } }));
    return roomsViewOf(await r.json());
  } catch (e) { return null; }
}
/* one guest's stays from the engine's answer (`mine` · `waitlist`) — the per-guest read and Guest Relations' single read alike */
function roomsViewOf(v) {
  {
    if (!v || !v.ok || !v.mine) return null;
    const out = {};
    /* a dedicated room (002 · W) is named as the guest's own room, the whole room */
    const entry = (m, stage) => { m = { ...m, key: canonicalKey(m.key) }; const s = SEED[m.key]; const own = !!(s && (s.dedicated || []).some((d) => d.label === m.label)); return { stage, key: m.key, label: m.label, name: s ? s.name : m.key, stay: s && s.stay ? s.stay : null, room: s && s.unit === 'guest' ? s.name : own ? 'Own room · Room ' + m.label : 'Room ' + m.label }; };
    for (const [stage, m] of Object.entries(v.mine)) out[stage] = entry(m, stage);
    /* THE WAITING LIST (Owner, 19 Sep 2026): a stage the guest waits for, with the position — no product, no amount */
    for (const [stage, w] of Object.entries(v.waitlist || {})) if (!out[stage]) out[stage] = { stage, waitlisted: true, position: w.position, since: w.at, size: w.size || 1 };
    /* THE PAID EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): the record carried a `stayext` component beside the stays. The
       self-service extension is gone, so nothing of the kind is written any more and no confirmation can name a hotel for
       extra nights; Guest Relations arranges those outside this engine. */
    return out;
  }
}
/* both emails for one stored record — the content is the journey as sent, never an access code */
async function sendJourneyMail(env, record, request, only) {
  const origin = new URL(request.url).origin;
  const name = guestNameOf(record);
  const o = only || {}, sendOwner = o.owner !== false, sendGuest = o.guest !== false;
  const skipped = { provider: 'none', accepted: false, id: null, status: 0, error: 'not sent in this attempt', skipped: true, at: new Date().toISOString() };
  /* the words and the look come from src/mail-templates.js (See You In Laos CI); the facts are the stored record's */
  const ownerMail = sendOwner ? composeOwnerMail(record, origin + '/api/status?invitation=' + encodeURIComponent(record.invitationId)) : null;
  const owner = sendOwner ? await sendMail(env, GR_EMAIL, 'Guest Relations', ownerMail.subject, ownerMail.text, ownerMail.html) : skipped;
  const guestTo = guestEmailOf(record);
  const guestMail = sendGuest ? composeGuestMail(record) : null;
  const guest = !sendGuest ? skipped : guestTo ? await sendMail(env, guestTo, name, guestMail.subject, guestMail.text, guestMail.html) : { provider: 'none', accepted: false, id: null, status: 0, error: 'no valid guest email address in the journey', at: new Date().toISOString() };
  return { owner, guest: { ...guest, to: guestTo ? guestTo.replace(/^(.).*(@.*)$/, '$1…$2') : null }, at: new Date().toISOString() };
}
function publicMail(mail) { const pick = (m) => m ? { provider: m.provider, accepted: !!m.accepted, id: m.id || null, error: m.error || null, to: m.to || undefined } : null; return { owner: pick(mail.owner), guest: pick(mail.guest), at: mail.at }; }
/* the retry: the stored record's emails once more — the guest's own record only, no new submission */
async function handleMailRetry(request, env) {
  let body; try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  const invitationId = String(body && body.invitationId || '').trim();
  const who = await identify(request, env);
  if (!who || !invitationId || who.invitationId !== invitationId) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  const raw = await env.REG_KV.get('reg:' + invitationId);
  if (!raw) return json({ ok: false, error: 'no stored journey to confirm' }, 404, corsHeaders(request));
  let record; try { record = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'stored journey unreadable' }, 500, corsHeaders(request)); }
  if (!record.submissionId) record.submissionId = await submissionIdOf(invitationId, record.submittedAt || '');
  if (!record.guestId) record.guestId = who.guestId;
  /* the recipient is resolved again — the contact the guest has since added on the server is the one used */
  const recipient = await resolveRecipient(env, who, record.registration);
  if (!recipient.email) return json({ ok: false, error: 'email required', message: 'Please add your email address, so we can send you a copy of your trip.', field: 'email', submissionId: record.submissionId }, 422, corsHeaders(request));
  record.recipient = recipient;
  /* RETRY ONLY THE FAILED EMAIL (PRQ-04-07): "Send the copy again" sends the guest's copy only; the Guest Relations notification is
     sent again by the server only when it had failed (the guest never resends for it). `which: "both"` keeps the old behaviour. */
  const which = body && body.which === 'both' ? 'both' : 'guest';
  const ownerFailed = !(record.mail && record.mail.owner && record.mail.owner.accepted);
  const sent = await sendJourneyMail(env, record, request, { guest: true, owner: which === 'both' || ownerFailed });
  const mail = { owner: sent.owner && !sent.owner.skipped ? sent.owner : (record.mail && record.mail.owner) || sent.owner, guest: sent.guest, at: sent.at };
  try { await env.REG_KV.put('reg:' + invitationId, JSON.stringify({ ...record, mail, mailSummary: mailSummary(mail), mailRetries: (record.mailRetries || 0) + 1 }), { metadata: { invitationId, submittedAt: record.submittedAt, submissionId: record.submissionId, version: record.version || 1, lastSentAt: record.lastSentAt || record.submittedAt } }); } catch (e) {}
  return json({ ok: true, submissionId: record.submissionId, submittedAt: record.submittedAt, mailed: !!(mail.owner && mail.owner.accepted), mail: publicMail(mail), mailSummary: mailSummary(mail) }, 200, corsHeaders(request));
}

/* ---- F · status and confirmation --------------------------------------- */
const INV_RE = /^INV-[A-Za-z0-9_-]{1,32}$/;

async function listAll(kv, prefix) {
  const out = []; let cursor = undefined;
  for (let i = 0; i < 20; i++) {
    const page = await kv.list(cursor ? { prefix, cursor } : { prefix });
    (page && page.keys || []).forEach((k) => out.push(k.name));
    if (!page || page.list_complete !== false || !page.cursor) break;
    cursor = page.cursor;
  }
  return out;
}
const firstWord = (v) => String(v || '').trim().split(/\s+/)[0] || '';
/* THE JOINING COHORT (Owner, 21 Sep 2026 · shared since 27 Sep 2026): every guest whose trip has been sent and who is joining, and
   the couple, who are always there — ONE reading for "Who's joining us" and the Wedding Pulse, so the two can never disagree.
   A guest who responded "not joining" is not in it; a guest no longer in the register (a cancelled invitation) is not in it; an
   invitation alone is never joining. Nothing is written. */
/* THE KV BUDGET (27 Sep 2026 · the account's daily KV lists and reads are limited): every signed-in homepage and My Profile asks
   for the cohort, so it is read from the store at most once per COHORT_TTL in an isolate — and forgotten at once when this isolate
   stores something it shows (a sent trip, a portrait, the contact details, a reset). Guest Relations always reads it fresh. */
const COHORT_TTL = 2 * 60 * 1000;
const cohortCache = new WeakMap();
function joiningCohort(env, origin, fresh) {
  const kv = env.REG_KV, hit = kv && cohortCache.get(kv);
  if (!fresh && hit && Date.now() - hit.at < COHORT_TTL) return hit.p;
  const p = readCohort(env, origin);
  if (kv) { cohortCache.set(kv, { at: Date.now(), p }); p.catch(() => { if (cohortCache.get(kv) && cohortCache.get(kv).p === p) cohortCache.delete(kv); }); }
  return p;
}
async function afterWrite(request, env, pending) {
  const res = await pending;
  if (request.method !== 'GET' && res.status < 300 && env.REG_KV) cohortStale(env);
  return res;
}
function cohortStale(env) { cohortCache.delete(env.REG_KV); }
/* `pre` (Guest Relations' overview): the keys, the records and the contacts it already read — the same reading, nothing read twice */
async function readCohort(env, origin, pre) {
  const [regKeys, avatarKeys] = pre ? [pre.regKeys, pre.avatarKeys] : await Promise.all([listAll(env.REG_KV, 'reg:'), listAll(env.REG_KV, 'avatar:')]);
  const photos = new Set(avatarKeys.map((k) => k.slice('avatar:'.length)));
  const readRec = pre ? async (key) => (Object.prototype.hasOwnProperty.call(pre.recs, key.slice(4)) ? pre.recs[key.slice(4)] : null)
    : async (key) => { try { return JSON.parse(await env.REG_KV.get(key) || 'null'); } catch (e) { return null; } };
  const contactOf = async (invitationId) => {
    if (pre && Object.prototype.hasOwnProperty.call(pre.contacts, invitationId)) return pre.contacts[invitationId];
    try { return JSON.parse(await env.REG_KV.get(contactKey(invitationId)) || 'null'); } catch (e) { return null; } };
  const nameOf = (rec, contact, fallback) => {
    const gr = (rec && rec.registration && rec.registration.guestRecord) || {};
    const g0 = Array.isArray(gr.guests) && gr.guests[0] ? gr.guests[0] : {};
    return (firstWord(contact && contact.firstName) || firstWord(g0.submitted && g0.submitted.preferredName) || firstWord(g0.source && g0.source.preferredName) || firstWord(g0.name) || fallback).slice(0, 24);
  };
  let entries = null; try { entries = await loadIndex(env, origin); } catch (err) { entries = null; }
  const invited = entries ? new Set(Object.values(entries).filter(Boolean).map((e) => e.i)) : null;
  const guests = [], records = {}, contacts = {};
  for (const key of regKeys) {
    if (key.indexOf(':prev:') >= 0) continue;                       /* the bounded history of earlier versions — the current record alone counts */
    const rec = await readRec(key);
    if (!rec || !rec.registration || !rec.guestId) continue;
    const invitationId = rec.invitationId || key.slice('reg:'.length);
    records[invitationId] = rec;
    const gr = rec.registration.guestRecord || {};
    if (gr.scope && gr.scope.none) continue;                       /* responded, not joining */
    if (rec.hosts) continue;                                      /* the couple stands apart, below — never counted as a guest */
    if (invited && !invited.has(invitationId)) continue;          /* an invitation no longer in the register (cancelled) */
    const contact = contacts[invitationId] = await contactOf(invitationId);
    const at = rec.firstSentAt || rec.submittedAt || null;
    guests.push({ guestId: String(rec.guestId), invitationId, name: nameOf(rec, contact, 'Guest'), photo: photos.has(invitationId), joinedAt: at ? String(at).slice(0, 10) : null, _t: at ? Date.parse(at) || 0 : 0 });
  }
  guests.sort((a, b) => (b._t - a._t) || a.name.localeCompare(b.name));
  /* THE BRIDE AND THE GROOM (Owner, 21 Sep 2026): the couple is the anchor of the community and is always visible — resolved from
     the register's own roles (the auth index: h = the hosts, r = B / G), never from a name, never from a submission of their own.
     Their day is the day their trip was first sent, when it was — otherwise none: nothing is invented for RECENTLY JOINED. */
  /* THE COUPLE (21 Sep 2026): chosen by the register's role (h + r), never by a name; named as they spell themselves, else by the two first names printed on every page */
  const COUPLE_FIRST_NAMES = { B: 'Haruthai', G: 'Suthep' };
  const couple = [];
  for (const e of Object.values(entries || {})) {
    if (!e || e.h !== 1 || (e.r !== 'B' && e.r !== 'G')) continue;
    if (couple.some((c) => c.guestId === String(e.g))) continue;   /* one entry per person, however many index entries (a rotated code) name them */
    const role = e.r === 'B' ? 'Bride' : 'Groom', rec = records[e.i] || null, at = rec ? (rec.firstSentAt || rec.submittedAt || null) : null;
    const contact = contacts[e.i] = await contactOf(e.i);
    couple.push({ guestId: String(e.g), invitationId: e.i, name: nameOf(rec, contact, COUPLE_FIRST_NAMES[e.r]), photo: photos.has(e.i), joinedAt: at ? String(at).slice(0, 10) : null, role });
  }
  couple.sort((a, b) => (a.role === 'Bride' ? 0 : 1) - (b.role === 'Bride' ? 0 : 1));   /* Haruthai (Bride) first, then Suthep (Groom) — PRQ-01-10 */
  /* THE CANONICAL JOINED UNION (Owner, 2 Oct 2026): a person is JOINED when they are in the joining cohort above (a sent trip that is
     joining, or the couple) OR hold at least one active wedding seat — a Vow Ceremony chair or a Wedding Dinner chair. A UNION by the
     register's guest id: never a sum of counters, never a name match; a person with both seats, or in the cohort and seated, counts
     once. An active seat is a hold in the seating ledger on a chair of the plan, by an invitation still in the register. Derived on
     every read from the ledger as it stands — no flag is stored, nothing is written: a guest of the cohort who gives a seat back
     stays joined; a guest who is joined only by a seat follows the seat. */
  const known = new Set(couple.map((c) => c.guestId).concat(guests.map((g) => g.guestId)));
  const plan = pre && 'plan' in pre ? pre.plan : await grEngine(env, 'SEATING', 'seating', '/api/seating/plan');
  /* UNKNOWN IS NEVER A SMALLER NUMBER: a ledger that cannot be read fails the reading (the page says so and offers a retry) — it never
     publishes the cohort alone as the joined count. A failed reading is never cached (joiningCohort). */
  if (env.SEATING && !plan) throw new Error('the seating ledger could not be read');
  const seated = new Map();
  for (const event of ['ceremony', 'dinner']) {
    for (const s of ((plan && plan.events && plan.events[event] && plan.events[event].seats) || [])) {
      if (!s || !s.guestId || !s.invitationId || s.state === 'available' || s.state === 'family') continue;
      if (invited && !invited.has(s.invitationId)) continue;      /* a hold of a cancelled invitation is not an active seat */
      const g = String(s.guestId), t = s.at ? Date.parse(s.at) || 0 : 0, cur = seated.get(g);
      /* the ledger's label is a first name only when it looks like one — one word of letters; anything else is never shown */
      const nm = String(s.name || '').replace(/[^\p{L}\p{M}' \-.]/gu, ' ').trim().split(/\s+/)[0] || '';
      const safe = /@|\d/.test(String(s.name || '')) ? '' : nm.slice(0, 24);
      if (!cur) seated.set(g, { invitationId: s.invitationId, name: safe, t, events: [event] });
      else { cur.events.push(event); if (t && (!cur.t || t < cur.t)) cur.t = t; if (!cur.name && safe) cur.name = safe; }
    }
  }
  const bySeat = [];
  for (const [g, x] of seated) {
    if (known.has(g)) continue;
    const rec = records[x.invitationId] || null;
    const contact = contacts[x.invitationId] = await contactOf(x.invitationId);
    bySeat.push({ guestId: g, invitationId: x.invitationId, name: nameOf(rec, contact, x.name || 'Guest'), photo: photos.has(x.invitationId), joinedAt: x.t ? new Date(x.t).toISOString().slice(0, 10) : null, _t: x.t });
  }
  /* ONE PERSON, ONE ENTRY: the three sources merged by guest id — the couple first (their role wins), then the cohort, then the seats */
  const one = new Map(); for (const p of couple.map((c) => ({ ...c, _t: Infinity })).concat(guests, bySeat)) if (!one.has(p.guestId)) one.set(p.guestId, p);
  const joined = [...one.values()].filter((p) => !p.role).sort((a, b) => (b._t - a._t) || a.name.localeCompare(b.name));
  /* the register's guest id → invitation (identity is always the guest id, never a name) and the portraits, for Who stays where */
  const invOf = {}; for (const e of Object.values(entries || {})) if (e && e.g && e.i) invOf[String(e.g)] = e.i;
  return { list: couple.concat(joined.map(({ _t, ...g }) => g)), couple: couple.length, records, contacts, invOf, photos, seatsKnown: !!plan, seated: new Set(seated.keys()) };
}
async function handleCommunity(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'not enabled', enabled: false }, 503, corsHeaders(request));
  let c; try { c = await joiningCohort(env, new URL(request.url).origin); } catch (e) { return json({ ok: false, error: 'unavailable', retry: true }, 503, corsHeaders(request)); }
  const out = c.list.map(({ invitationId, ...g }) => g);
  return json({ ok: true, count: out.length, guests: out, couple: c.couple, at: new Date().toISOString() }, 200, Object.assign({ 'cache-control': 'private, max-age=60' }, corsHeaders(request)));
}

/* THE TWO ANSWERS APPROVED FOR SOCIAL DISPLAY (Owner, 27 Sep 2026): question 06 "What makes you dance?" (the genres, multi-select)
   and the final act of the wedding night (the pool jump · the party at BARON). Read from the guest's SENT record — the answers the
   guest has sent — through the one questionnaire (src/questionnaire.js); asked of wedding guests only, so counted only for a guest
   who joins the wedding (the couple always). No other answer is ever read here. */
/* THE WHOLE WEDDING (Owner, 2 Oct 2026 — supersedes the 52 of 27 Sep): FIFTY PEOPLE IN ALL, Haruthai and Suthep included — the same
   fifty the ceremony (the couple's two places + 48 chairs) and the dinner (fifty chairs) hold; one constant, src/seating.js */
const WEDDING_CAPACITY = WEDDING_PEOPLE;
function socialAnswers(rec, hosts) {
  const reg = rec && rec.registration; if (!reg) return { music: [], after: null };
  const gr = reg.guestRecord || {};
  if (!hosts && !(gr.scope && gr.scope.vientianeWedding)) return { music: [], after: null };
  const g0 = Array.isArray(gr.guests) ? (gr.guests.find((g) => g && g.guestId === rec.guestId) || gr.guests[0] || {}) : {};
  const raw = g0.profile && Array.isArray(g0.profile.genres) ? g0.profile.genres : [];
  const music = GENRES.filter((x) => raw.includes(x));                                  /* the questionnaire's own order and values */
  const tc = reg.templeCeremony && Array.isArray(reg.templeCeremony.guests) ? (reg.templeCeremony.guests.find((g) => g && g.guestId === rec.guestId) || reg.templeCeremony.guests[0]) : null;
  const f = tc ? finaleOf(tc.finaleKey || tc.finale) : null;
  return { music, after: f === 'pool' ? 'pool' : f === 'baron' ? 'party' : null };
}
/* the ranking: by the number of guests who chose a genre, ties in the questionnaire's own order — every genre, a zero included */
function musicRanking(people) {
  const counts = GENRES.map((g, i) => ({ genre: g, count: people.filter((p) => p.music.includes(g)).length, i }));
  counts.sort((a, b) => (b.count - a.count) || (a.i - b.i));
  return counts.map(({ i, ...x }) => x);
}
function pulseOf(cohort) {
  const people = cohort.list.map((g) => ({ ...g, ...socialAnswers(cohort.records[g.invitationId], !!g.role) }));
  const ranking = musicRanking(people), top = ranking[0] && ranking[0].count > 0 ? ranking.filter((r) => r.count === ranking[0].count).map((r) => r.genre) : [];
  const pool = people.filter((p) => p.after === 'pool').length, party = people.filter((p) => p.after === 'party').length;
  return { people, ranking, leaders: top, musicResponses: people.filter((p) => p.music.length).length, pool, party, afterResponses: pool + party };
}
/* WHO STAYS WHERE (Owner, 2 Oct 2026): every real place the room engine holds, joined to people BY GUEST ID — never by a name, so
   two guests who share a first name stay two people. Per place: the stage, the stay (its canonical key — the page names it from
   the current product data), who shares the unit (guest ids; the unit's allocation label never leaves the server), and the state:
   'sent' only when the holder's last sent trip (not a "not joining" reply) carries exactly this stay, room and unit; otherwise
   'held' — chosen on the website, not yet sent. Nothing is confirmed here; nothing is written. Null when the engine is unreadable. */
/* the stays a sent trip carried, as key | unit: the room snapshot the record kept at the send (record.rooms — the engine's own view
   of the guest's places then), else the Bag lines that name their unit. A line without its unit is unverifiable and proves nothing. */
function sentStays(rec) {
  const out = new Set();
  if (!rec || !rec.submissionId || !rec.registration) return out;
  const gr = rec.registration.guestRecord || {};
  if (gr.scope && gr.scope.none) return out;
  const snap = rec.rooms && typeof rec.rooms === 'object' ? Object.values(rec.rooms).filter((m) => m && m.key && m.label && !m.waitlisted) : [];
  if (snap.length) { for (const m of snap) out.add(canonicalKey(m.key) + '|' + String(m.label)); return out; }
  for (const l of canonicalLines(Array.isArray(rec.registration.selections) ? rec.registration.selections : [])) {
    if (!l || typeof l !== 'object' || !l.id || !l.room || !l.unit) continue;
    out.add(canonicalKey(l.id + '/' + l.room) + '|' + String(l.unit));
  }
  return out;
}
async function staysOf(env, cohort) {
  const v = await grEngine(env, 'ROOMS', 'rooms', '/api/rooms/gr-occupants');
  if (!v || !Array.isArray(v.occupants)) return null;
  const occ = v.occupants.map((o) => ({ ...o, key: canonicalKey(o.key) })).filter((o) => o.guestId && SEED[o.key]);
  const unit = {}; for (const o of occ) (unit[o.key + '|' + o.label] = unit[o.key + '|' + o.label] || []).push(String(o.guestId));
  const byGuest = {}, names = {}, sent = {};
  for (const o of occ) {
    const g = String(o.guestId), inv = cohort.invOf[g];
    if (!(g in sent)) sent[g] = sentStays(inv ? cohort.records[inv] : null);
    const state = sent[g].has(o.key + '|' + o.label) ? 'sent' : 'held';
    (byGuest[g] = byGuest[g] || []).push({ stage: stageOf(o.key), key: o.key, with: unit[o.key + '|' + o.label].filter((x) => x !== g), state });
    if (o.name && !names[g]) names[g] = String(o.name).slice(0, 24);
  }
  return { byGuest, names };
}
async function handlePulse(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'not enabled', enabled: false }, 503, corsHeaders(request));
  let cohort; try { cohort = await joiningCohort(env, new URL(request.url).origin); } catch (e) { return json({ ok: false, error: 'unavailable', retry: true }, 503, corsHeaders(request)); }
  const P = pulseOf(cohort);
  let stays = null; try { stays = await staysOf(env, cohort); } catch (e) { stays = null; }
  /* THE NARROWEST FORM (Owner, 27 Sep 2026 · data minimisation): per joining person the opaque guest id (the key of the portrait
     read), the first name, a portrait flag, the nationality as the guest gave it, the day they joined, the couple's role, and the two
     approved answers — never an email, a phone number, an address, a birthdate, a code, a travel detail or any other answer */
  const people = P.people.map((g) => {
    const nat = String((cohort.contacts[g.invitationId] || {}).nationality || '').trim().slice(0, 40);
    return { id: g.guestId, name: g.name, photo: !!g.photo, nationality: nat || null, joinedAt: g.joinedAt, ...(g.role ? { role: g.role } : {}), music: g.music, after: g.after,
      ...(stays ? { stays: stays.byGuest[g.guestId] || [] } : {}) };
  });
  /* the people who hold a stay but are not (yet) in the joining cohort — a trip not sent yet: their first name, a portrait flag and
     their stays, so the rooms they hold are never anonymous; nothing else */
  const known = new Set(people.map((p) => p.id));
  const others = stays ? Object.keys(stays.byGuest).filter((g) => !known.has(g)).map((g) => ({ id: g, name: stays.names[g] || '', photo: !!(cohort.invOf[g] && cohort.photos.has(cohort.invOf[g])), stays: stays.byGuest[g] })) : [];
  return json({ ok: true, at: new Date().toISOString(), capacity: WEDDING_CAPACITY, joining: people.length, couple: cohort.couple, people, staysKnown: !!stays, others,
    music: { responses: P.musicResponses, ranking: P.ranking, leaders: P.leaders },
    after: { responses: P.afterResponses, pool: P.pool, party: P.party } }, 200, Object.assign({ 'cache-control': 'private, max-age=30' }, corsHeaders(request)));
}
async function handleStatus(request, env) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitation') || '';
  if (!INV_RE.test(invitationId)) return json({ ok: false, error: 'invalid invitation' }, 400, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: true, received: false, confirmed: false, store: false }, 200, corsHeaders(request));
  const reg = await env.REG_KV.getWithMetadata('reg:' + invitationId);
  const conf = await env.REG_KV.get('conf:' + invitationId, 'json');
  const received = !!(reg && reg.value);
  const receivedAt = received ? ((reg.metadata && reg.metadata.submittedAt) || null) : null;
  let record = null; if (received) { try { record = JSON.parse(reg.value); } catch (e) { record = null; } }
  /* the confirmation stands only for the version it confirmed (OQ-27): a later send lapses it until Guest Relations confirms again */
  const stands = confirmationStands(conf, record);
  return json({
    ok: true,
    received, receivedAt,
    lastSentAt: record ? (record.lastSentAt || record.submittedAt || null) : null,
    version: record ? (record.version || 1) : 0,
    confirmed: stands,
    confirmedAt: conf && conf.confirmedAt || null,
    confirmedVersion: conf && conf.confirmedAt && conf.version != null ? conf.version : null,
    lapsed: !!(conf && conf.confirmedAt) && !stands,
  }, 200, corsHeaders(request));
}

async function handleConfirm(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400); }
  const invitationId = String(body && body.invitationId || '').trim();
  const action = body && body.action === 'unconfirm' ? 'unconfirm' : 'confirm';
  const actor = String(body && body.actor || 'guest-relations').slice(0, 80);
  const note = String(body && body.note || '').slice(0, 400);
  if (!INV_RE.test(invitationId)) return json({ ok: false, error: 'invalid invitation' }, 400);
  if (!env.REG_KV) return json({ ok: false, error: 'store unavailable' }, 503);
  const current = await env.REG_KV.get('conf:' + invitationId, 'json');
  /* GUEST RELATIONS CONFIRMS A SENT VERSION (OQ-27 · PRQ-04-04): the confirmation records which version of the trip it confirms,
     so a later send lapses it; confirming again after an update confirms the new version. The one write (src/confirmation.js)
     is shared with Haruthai and Suthep's Confirm booking in the admin console: one record, one history. */
  let record = null; try { record = JSON.parse(await env.REG_KV.get('reg:' + invitationId) || 'null'); } catch (e) { record = null; }
  const version = record && record.submissionId ? (record.version || 1) : null;
  /* idempotent: confirming the version already confirmed (or withdrawing nothing) changes nothing */
  const w = await writeConfirmation(env.REG_KV, { invitationId, action, actor, role: CONFIRMATION_ROLE.GUEST_RELATIONS, source: 'gr-endpoint', note, record, current });
  if (w.unchanged) {
    return action === 'confirm'
      ? json({ ok: true, invitationId, confirmedAt: w.conf.confirmedAt, version: w.conf.version != null ? w.conf.version : version, unchanged: true }, 200)
      : json({ ok: true, invitationId, confirmedAt: null, unchanged: true }, 200);
  }
  return json({ ok: true, invitationId, confirmedAt: w.conf.confirmedAt, version: w.conf.version, actor, at: w.at }, 200);
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', ...(extra || {}) },
  });
}
