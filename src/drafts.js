/* ============================================================================
   THE JOURNEY DRAFT STORE (Owner, 17 Sep 2026 · P0 · Codex finding P1-1).

   One Durable Object per invitation: every read and every write of a guest's
   draft runs through one actor, one at a time — the revision comparison and
   the write are one serialised step, so two devices (or two overlapping
   autosaves) can never both pass the same base revision and overwrite each
   other. KV keeps a mirror of the current draft for Guest Relations' listing
   and as a read-through seed for drafts stored before this actor existed.

   ops (POST /op, body JSON):
     get                       → { ok, draft|null }
     put { keys, baseUpdatedAt, clientUpdatedAt, reason, guestId, fixedStages }
                               → { ok, draft }                 (written)
                               → 409 { ok:false, error:'stale', draft }   (an older revision was named)
   ========================================================================== */
const DRAFT_KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export class Drafts {
  constructor(state, env) { this.state = state; this.storage = state.storage; this.env = env; }

  /* the stored draft — seeded once from the KV mirror for a guest whose draft predates this actor. A seed read that FAILS is
     not "no draft" (Codex final review): until the mirror has answered once, every read and write is refused as retryable,
     so a legacy draft can never be replaced by a write that passed the precondition against a false absence. */
  async current(invitationId) {
    let d = await this.storage.get('draft');
    if (d) return d;
    if (await this.storage.get('seeded')) return null;
    if (this.env && this.env.REG_KV) {
      let raw = null;
      try { raw = await this.env.REG_KV.get('draft:' + invitationId); } catch (e) { const err = new Error('draft store unavailable'); err.seed = true; throw err; }
      try { d = JSON.parse(raw || 'null'); } catch (e) { d = null; }
      /* the KV read awaited outside the actor's own storage: a write may have seeded and saved meanwhile (Codex release
         review) — the actor's copy, if one exists now, is the truth and the stale mirror never overwrites it */
      const now = await this.storage.get('draft');
      if (now) return now;
      if (await this.storage.get('seeded')) return null;
      if (d) await this.storage.put('draft', d);
    }
    await this.storage.put('seeded', true);
    return d || null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\//, '');
    let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
    const invitationId = String(body.invitationId || '');
    if (!invitationId) return json({ ok: false, error: 'invitation required' }, 400);

    /* reads are serialised with writes too: a seed can never interleave with a save */
    if (op === 'get') { return await this.state.blockConcurrencyWhile(async () => { try { return json({ ok: true, draft: await this.current(invitationId), epoch: (await this.storage.get('epoch')) || null }); } catch (e) { return json({ ok: false, error: e && e.seed ? 'draft store unavailable' : 'draft could not be read', retry: true }, 503); } }); }

    /* THE CLEAN RESET (Owner, 19 Sep 2026): the actor forgets the draft and is marked seeded, so the (deleted) KV mirror can
       never bring an older copy back; the Worker calls this for every invitation the register knows, after the GR check */
    if (op === 'reset') {
      return await this.state.blockConcurrencyWhile(async () => {
        const d = await this.storage.get('draft'), had = !!d;
        if (!(body && body.dryRun === false)) return json({ ok: true, dryRun: true, invitationId, had, draft: body && body.snapshot ? (d || null) : undefined });
        /* THE EPOCH IS THE ACTOR'S OWN (Codex pre-deploy review, 19 Sep 2026): a write that does not carry it is refused here, in
           the same serialised step as every other write — even while the sweep is still running, even when KV cannot be read */
        const epoch = String(body.epoch || '');
        if (!epoch) return json({ ok: false, error: 'epoch required' }, 400);
        await this.storage.delete('draft'); await this.storage.put('seeded', true); await this.storage.put('epoch', epoch);
        return json({ ok: true, dryRun: false, invitationId, had, cleared: had, draft: d || null, epoch });
      });
    }

    if (op === 'put') {
      return await this.state.blockConcurrencyWhile(async () => {
        const epoch = (await this.storage.get('epoch')) || null;
        if (epoch && body.seenReset !== epoch) return json({ ok: false, error: 'reset', resetAt: epoch }, 409);
        let prev; try { prev = await this.current(invitationId); } catch (e) { return json({ ok: false, error: e && e.seed ? 'draft store unavailable' : 'draft could not be read', retry: true }, 503); }
        const incoming = {};
        for (const k of DRAFT_KEYS) if (body.keys && typeof body.keys[k] === 'string') incoming[k] = body.keys[k];
        if (!Object.keys(incoming).length) return json({ ok: false, error: 'nothing to save' }, 400);
        /* THE REVISION PRECONDITION: the device names the revision it last read; an older one is refused with the current draft */
        const base = typeof body.baseUpdatedAt === 'string' ? body.baseUpdatedAt : null;
        if (prev && prev.updatedAt && base !== prev.updatedAt) return json({ ok: false, error: 'stale', draft: prev }, 409);
        /* a guest with a FIXED room never carries that unit as a Bag line — another hotel chosen in the same stage is theirs to keep
           (the keys are `<window>/<slug>`; a line of the window with the fixed room, or with no room yet, is the fixed unit) */
        const fixedKeys = Array.isArray(body.fixedStages) ? body.fixedStages.map(String) : [];
        if (fixedKeys.length && typeof incoming['siyl.bag'] === 'string') {
          const isFixed = (x) => fixedKeys.some((k) => { const win = k.split('/')[0], slug = k.split('/').slice(1).join('/'); return x && String(x.id) === win && (!slug || !x.room || String(x.room) === slug); });
          try { const bag = JSON.parse(incoming['siyl.bag']); if (Array.isArray(bag)) { const kept = bag.filter((x) => !isFixed(x)); if (kept.length !== bag.length) incoming['siyl.bag'] = JSON.stringify(kept); } } catch (e) { /* stored as sent */ }
        }
        const keys = Object.assign({}, prev && prev.keys || {}, incoming);
        /* strictly increasing revisions, even within one millisecond */
        let now = new Date().toISOString();
        if (prev && prev.updatedAt && now <= prev.updatedAt) now = new Date(Date.parse(prev.updatedAt) + 1).toISOString();
        const d = { invitationId, guestId: String(body.guestId || (prev && prev.guestId) || ''), keys, updatedAt: now, savedAt: now, clientUpdatedAt: body.clientUpdatedAt || null, reason: body.reason || null };
        await this.storage.put('draft', d);
        /* the KV mirror: Guest Relations' listing and the read-through seed — best effort, never the arbiter */
        if (this.env && this.env.REG_KV) { try { await this.env.REG_KV.put('draft:' + invitationId, JSON.stringify(d), { metadata: { invitationId, guestId: d.guestId, updatedAt: now } }); } catch (e) { /* the actor's copy stands */ } }
        return json({ ok: true, draft: d });
      });
    }
    return json({ ok: false, error: 'unknown draft operation' }, 404);
  }
}
