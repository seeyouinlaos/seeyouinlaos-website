/* THE ONE VALIDATOR IN THE TESTS (Owner, 21 Sep 2026 · the global My Trip rebuild): /api/register refuses an incomplete trip.
   A test that is about something else (the emails, persistence, the status flow) sends a COMPLETE answer through this helper:
   the scope (Bangkok alone unless told otherwise), every stage of it answered — a stay the engine holds counts as chosen on
   the server; anything else here is "not joining this stage" — About You answered, the wedding answered when the wedding is
   joined. Nothing of the test's own payload is overwritten unless it is missing. */
export const SCOPE_KEYS = ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china'];
export const STAGE_KEYS = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
export function complete(reg, o = {}) {
  const r = Object.assign({}, reg || {});
  const gr0 = r.guestRecord && typeof r.guestRecord === 'object' ? r.guestRecord : {};
  const scope = Object.assign({ bangkok: true, vientianePreWedding: false, vientianeWedding: false, china: false, none: false, at: '2026-09-21T00:00:00.000Z', by: r.guestId || 'guest' }, gr0.scope || {}, o.scope || {});
  const stages = {}; STAGE_KEYS.forEach((k) => { stages[k] = k === 'c86' ? 'selected' : 'declined'; });
  Object.assign(stages, r.stages || {}, o.stages || {});
  const selections = Array.isArray(r.selections) ? r.selections.slice() : [];
  /* a transport counts only as a line of the Bag: the mandatory Kunming → Lijiang train travels as one when China is joined */
  if (scope.china && !selections.some((x) => x && x.id === 'c86')) selections.push({ id: 'c86', name: 'C86', price: 105, cat: 'Transportation' });
  /* THE QUESTIONNAIRE (22 Sep 2026): the required About You answers, filled where a test does not care about them */
  const ANSWERS = { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'In the Mood for Love', genres: ['Pop'] };
  const base = Array.isArray(gr0.guests) ? gr0.guests : (Array.isArray(r.guests) && r.guests.length ? r.guests.map((g) => ({ guestId: g.guestId, name: g.name, fullName: g.fullName })) : [{ guestId: r.guestId || 'guest', name: 'Guest' }]);
  const guests = base.map((g) => Object.assign({}, g, { profile: Object.assign({}, ANSWERS, g && g.profile || {}) }));
  const gr = Object.assign({}, gr0, {
    guests,
    scope,
    dress: gr0.dress || { all: true, acknowledged: [r.guestId], missing: [] },
    allergy: gr0.allergy || { answer: 'no', details: '' },
    photo: gr0.photo || { at: '2026-09-21T00:00:00.000Z', by: r.guestId || 'guest' },
  });
  const tc = r.templeCeremony || (scope.vientianeWedding ? { guests: [{ guestId: r.guestId, events: { temple: 'Not joining', coffee: 'Not joining', vows: 'Joining', dinner: 'Joining' }, finale: 'The pool jump', finaleKey: 'pool', temple: 'Not attending', attending: false, sangkhathan: false, sangkhathanState: 'Not applicable', participation: 'Joining Vientiane' }], participation: 'Joining Vientiane' } : null);
  return Object.assign(r, { guestRecord: gr, stages, selections, templeCeremony: tc });
}
