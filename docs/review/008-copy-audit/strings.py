#!/usr/bin/env python3
"""008 — COPY AUDIT · the string register. Reads text.txt (the rendered corpus) and emails.txt and writes
strings.tsv: one row per distinct guest-facing string with route/surface · state · source file · audience ·
factual-claim flag · source-truth dependency · the surfaces it appears on · occurrence count.
Also writes unique.txt (every distinct string once, for reading) and summary.json.
  python3 docs/review/008-copy-audit/strings.py
"""
import re, json, collections, os
D = os.path.dirname(os.path.abspath(__file__))
text = open(os.path.join(D, 'text.txt'), encoding='utf8').read().split('\n')
emails = open(os.path.join(D, 'emails.txt'), encoding='utf8').read().split('\n')

FACT = re.compile(r'\bUSD\s?\d|\b\d{1,2}[:.]\d\d\b|\b(19|20)\d\d\b|\b\d{1,2} ?(–|-|—) ?\d{1,2} (Feb|Mar|February|March)|\b(Feb|Mar|February|March)\b|\b\d+ nights?\b|\bper (guest|person|night|room)\b|Souphattra|Sathorn|Shama|Kempinski|Wanxiang|Luye|Wat Ong Teu|Vientiane|Bangkok|Kunming|Lijiang|Nong Khai|Room [A-F]\b|Seat [A-Z]?\d|MU\d{3,4}|C86|C642|No\. 25|Sühring|1872|Marsilea|Sangkhathan|Tak Bat|hosted|complimentary|Business|Economy|First Class', re.I)
DEP = [(re.compile(r'\bUSD\s?\d|per (guest|person|night)', re.I), 'pricing (brief §13 · Operations Master Budget/Room Rate)'),
       (re.compile(r'\b\d{1,2}[:.]\d\d\b|From \d{2}:\d{2}', re.I), 'programme times (brief §2 · Master_Timeline · Owner decisions)'),
       (re.compile(r'\b\d{1,2} ?(–|-|—) ?\d{1,2} (Feb|Mar)|(19|20)\d\d\b|\b(Feb|Mar|February|March)\b', re.I), 'dates (brief §2 · Overview_Hotel_Restaurant)'),
       (re.compile(r'Room [A-F]\b|\d+ (rooms?|places?) available|Fully booked|Sold out', re.I), 'room inventory (brief §11 · live engine)'),
       (re.compile(r'Seat [A-Z]?\d|Front centre|run [AB]|poolside', re.I), 'seating geometry (brief §12)'),
       (re.compile(r'hosted|complimentary|self-pay|on request|contribution', re.I), 'payer status (brief §10 · §13)'),
       (re.compile(r'Souphattra|Sathorn|Shama|Kempinski|Wanxiang|Luye|Wat Ong Teu|Sühring|1872|Marsilea', re.I), 'venue / property names (Operations Master Overview)')]

rows = collections.OrderedDict()   # string -> record
def rec(s, route, state, source, ctx, kind):
    if s in rows: r = rows[s]
    else:
        r = rows[s] = {'text': s, 'audience': set(), 'surfaces': set(), 'sources': set(), 'states': set(), 'count': 0, 'kind': kind,
                       'factual': bool(FACT.search(s)), 'dependency': '; '.join(d for rx, d in DEP if rx.search(s))}
    r['count'] += 1; r['surfaces'].add(route); r['sources'].add(source); r['states'].add(state)
    if kind == 'a11y': r['audience'].add('ACCESSIBILITY')
    elif kind == 'gr-email': r['audience'].add('GUEST RELATIONS')
    elif state.startswith('SIGNED-OUT') or state.startswith('TEMPLATE') and 'public' in ctx.lower(): r['audience'].add('PUBLIC')
    else: r['audience'].add('GUEST')

route = state = source = ctx = ''; globals_ = {}; gname = None
for line in text:
    m = re.match(r'^GLOBAL TEXT BLOCK (G-\d+) \((.*)\)$', line)
    if m: gname = m.group(1); globals_[gname] = {'label': m.group(2), 'lines': []}; continue
    if gname is not None:
        if line.startswith('=====') or line.startswith('ROUTE: '): gname = None
        elif line.strip(): globals_[gname]['lines'].append(line); continue
        else: continue
    if line.startswith('ROUTE: '): route = line[7:].strip(); continue
    if line.startswith('STATE: '): state = line[7:].strip(); continue
    if line.startswith('SOURCE: '): source = line[8:].strip(); continue
    if line.startswith('CONTEXT: '): ctx = line[9:].strip(); continue
    if not route or not line.strip() or line.startswith('=====') or line.startswith('---'): continue
    ref = re.match(r'^\s*→ (G-\d+)', line) or re.match(r'^\[global (G-\d+)\]', line)
    if ref:
        g = globals_.get(ref.group(1))
        if g:
            for gl in g['lines']:
                s = gl.strip(); kind = 'a11y' if s.startswith('[') else 'text'
                rec(s, route + ' (' + g['label'] + ')', state, source, ctx, kind)
        continue
    s = line.strip()
    kind = 'a11y' if re.match(r'^\((hidden|sr-only)\) \[|^\[(aria|alt|title|placeholder|page title)', s) else 'text'
    rec(s, route, state, source, ctx, kind)

title = ''; kind = 'guest-email'
for line in emails:
    if line.startswith('=====') or not line.strip() or line.startswith('---'): continue
    if re.match(r'^(GUEST EMAIL|GUEST RELATIONS EMAIL)', line): title = line.strip(); kind = 'gr-email' if line.startswith('GUEST RELATIONS') else 'guest-email'; continue
    rec(line.strip(), 'email · ' + title, 'GENERATED · email', 'src/mail-templates.js', 'email', kind)

out = ['text\taudience\tfactual\tdependency\tcount\tsurfaces\tsources\tstates']
for r in rows.values():
    out.append('\t'.join([r['text'], '/'.join(sorted(r['audience'])), 'yes' if r['factual'] else 'no', r['dependency'], str(r['count']), ' | '.join(sorted(r['surfaces']))[:400], ' | '.join(sorted(r['sources']))[:200], ' | '.join(sorted(s[:60] for s in r['states']))[:300]]))
open(os.path.join(D, 'strings.tsv'), 'w', encoding='utf8').write('\n'.join(out) + '\n')
uniq = [r['text'] for r in rows.values()]
open(os.path.join(D, 'unique.txt'), 'w', encoding='utf8').write('\n'.join(uniq) + '\n')
summary = {'strings': len(rows), 'occurrences': sum(r['count'] for r in rows.values()), 'factual': sum(1 for r in rows.values() if r['factual']),
           'accessibility': sum(1 for r in rows.values() if 'ACCESSIBILITY' in r['audience']), 'email': sum(1 for r in rows.values() if r['kind'] in ('guest-email', 'gr-email')),
           'public': sum(1 for r in rows.values() if 'PUBLIC' in r['audience']), 'guest': sum(1 for r in rows.values() if 'GUEST' in r['audience']),
           'routes': sorted({s.split(' (')[0] for r in rows.values() for s in r['surfaces']})}
json.dump(summary, open(os.path.join(D, 'summary.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in summary.items() if k != 'routes'})); print('routes:', len(summary['routes']))
