# SKILLS / TOOLS AUDIT — See You In Laos · 18 Sep 2026 (local record, not committed)

ENVIRONMENT
- Claude Code version: 2.1.275 (CLI, background job session; permission mode bypassPermissions)
- active session model: Claude Fable 5.1 (claude-fable-5-1)
- runtime: node v24.18.0 · gh 2.96.0 · repo-local wrangler 3.114.17 + miniflare 3.20250718.3 · global playwright 1.61.1 (npm -g) · graphify 0.9.6 (uv tool) · codex-cli 0.154.0 (npm -g)

AVAILABLE SKILLS (installed on disk and loadable via the Skill tool; none is auto-loaded unless named)
User scope, ~/.claude/skills (29): animation-vocabulary, apple-design, banner-design, brand, brandkit, design, design-system, design-taste-frontend, design-taste-frontend-v1, emil-design-eng, full-output-enforcement, gpt-taste, graphify (trigger /graphify, wired in ~/.claude/CLAUDE.md), higgsfield, high-end-visual-design, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, impeccable (also supplies the PostToolUse "Checking UI changes" hook in user settings), improve-animations, industrial-brutalist-ui, minimalist-ui, redesign-existing-projects, review-animations, scroll-world, slides, stitch-design-taste, ui-styling, ui-ux-pro-max.
Plugin scope (user-installed plugins): superpowers 6.1.1 (14: brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills); context-mode 1.0.169 (8: context-mode, ctx-doctor, ctx-index, ctx-insight, ctx-purge, ctx-search, ctx-stats, ctx-upgrade); codex 1.0.6 (3: codex-cli-runtime, codex-result-handling, gpt-5-4-prompting); claude-mem 13.25.1 is DISABLED so its 20 skills are not available.
Bundled (Claude Code itself): workflow-authoring, artifact-design, artifact-capabilities.
Project scope: none (.claude/ holds only launch.json, settings.local.json, scheduled_tasks.lock; no skills, commands or agents).

PLUGINS (installed_plugins.json, all user scope)
- context-mode@context-mode 1.0.169 — ENABLED. Hooks: SessionStart, UserPromptSubmit, PreToolUse (Bash, WebFetch, Read, Grep, Agent, ctx_* , mcp__*), PostToolUse (all core tools + mcp__*), PreCompact, Stop. MCP server: context-mode (ctx_execute, ctx_execute_file, ctx_batch_execute, ctx_search, ctx_index, ctx_fetch_and_index, ctx_insight, ctx_stats, ctx_doctor, ctx_upgrade, ctx_purge). Plus a user-level SessionStart hook context-mode-cache-heal.mjs.
- codex@openai-codex 1.0.6 — ENABLED. Hooks: SessionStart, SessionEnd, Stop (the Stop hook is the Review Gate, currently OFF). Commands: /codex:review, adversarial-review, rescue, result, status, cancel, transfer, setup. Agent: codex-rescue.
- superpowers@superpowers-marketplace 6.1.1 — ENABLED. Hook: SessionStart (injects using-superpowers). Skills as above. No commands or agents.
- playwright@claude-plugins-official (Microsoft Playwright MCP, `npx @playwright/mcp@latest`) — installed, DISABLED (no MCP tools registered from it).
- claude-mem@thedotmack 13.25.1 — installed, DISABLED (its 7 hook events and 20 skills inactive).
- Marketplace claude-plugins-official is registered; its other plugins (feature-dev, pr-review-toolkit, security-guidance, hookify, frontend-design, plugin-dev, mcp-server-dev, playground, ralph-loop, LSP servers …) are NOT installed.

MCP / TOOLS
- No MCP servers configured in ~/.claude.json or a project .mcp.json.
- Plugin MCP: context-mode — active in this session (tools loaded, used).
- claude.ai connectors exposed as deferred MCP tools (registered to the account, callable after ToolSearch): Claude Docs, Canva, Gmail, Google Calendar, Google Drive, Higgsfield, Indeed, Spotify. Active in the session; none used during P0 (Gmail and Google Drive were used on 16 Sep for the earlier email and image tasks, not for P0).
- Built-in: Bash, Read, Write, Edit, Agent, Workflow, Artifact, ToolSearch, Cron*, Task*, Monitor, WebFetch/WebSearch (deferred), SendUserFile.

CONTEXT MODE
- version 1.0.169 · active YES · hooks active YES (PreToolUse/PostToolUse/UserPromptSubmit/PreCompact/Stop/SessionStart) · MCP tools active YES.
- Used during P0: ctx_execute ×16 (12 shell, 4 python) — network calls the PreToolUse hook blocks in Bash (curl to the stage worker and the live Worker, read-only), transcript mining for Codex findings and Owner instructions, one Playwright diagnostic; ctx_search ×2 (session memory after compaction); ctx_stats ×1 (this audit). ctx_batch_execute, ctx_execute_file, ctx_index, ctx_fetch_and_index, ctx_insight: not used.
- Contribution: 2.4 MB of tool output kept out of the context window (≈617k → 57k tokens, 90.8 %), a /compact rescue of 129 KB at 03:51, and the post-compaction recall that let P0 resume without re-reading the transcript.

GRAPHIFY
- version 0.9.6 · available YES (`graphify` on PATH, skill at ~/.claude/skills/graphify) · strict mode OFF (no graphify hook in settings) · graph at <cwd checkout>/graphify-out/ (graph.json 1.9 MB, graph.html, GRAPH_REPORT.md, 1936 nodes · 3720 edges · 126 communities, code-only extraction, no LLM key), excluded via .git/info/exclude.
- Used during P0: `graphify query` ×1 ("How do Bag removal, stay remove, room engine leave, fixed host allocation, draft push and the review total depend on each other?") and `graphify explain` on remove()/leave()/fixedFor()/sync() (the earlier build/label/report steps were setup, 17 Sep 19:20–19:50).
- Findings from Graphify: the dependency chain worker.js ↔ rooms.js (Rooms DO, fixedFor() → FIXED seed, view()) ↔ assets/draft.js ↔ mail-templates.js journeySections(), and that assets/bag.js sync() and assets/stay.js were the only writers of Bag lines — which pointed the root-cause reading at stay.js sync() and the FIXED marker. It did not find a node for "Your Journey" (page-level HTML is not a graph node).

OPENAI CODEX
- plugin 1.0.6 · CLI codex-cli 0.154.0 · authenticated YES ("Logged in using ChatGPT") · Review Gate OFF (stopReviewGate=false) · commands: review, adversarial-review, rescue, result, status, cancel, transfer, setup (+ agent codex-rescue).
- Used during P0: `codex-companion.mjs adversarial-review --wait` ×5 (17 Sep 23:15 local: usage limit → DEFERRED; 18 Sep 03:26: plan + first implementation, 3 findings; 03:55: final review of the committed branch, 2 findings; 04:11: confirming pass, F-1/F-2 resolved + 1 finding; 04:20: closing pass → usage limit, DEFERRED, cron at 08:31). `setup --json` ×3 (enable then disable the gate on the Owner's correction), `status --all --json` ×1. /codex:review, rescue, transfer: not used.
- Pre-implementation review: did NOT run before implementation (Codex was at its usage limit; per the Owner's rule the plan review was deferred and ran together with the first implementation review). Post-implementation review: YES, three passes. Findings contributed: 6, all VALID and fixed — atomic draft write (→ Drafts Durable Object), 409 handling discarding edits (→ three-way merge, serialised pushes), fixed line priced as an experience (→ registration normalisation), mid-flight edit lost on 409, failed KV seed read taken as "no draft", acknowledged Save with failed read-back. No FALSE POSITIVE, no OUT OF SCOPE.

OTHER SKILLS / AGENTS (available, mapped to the Owner's task types)
- web development: frontend-design (marketplace, not installed), impeccable, design-taste-frontend, minimalist-ui, high-end-visual-design, emil-design-eng, ui-styling, redesign-existing-projects (all user skills); Agent types claude / general-purpose / Explore / Plan.
- browser / E2E: global Playwright 1.61.1 (used directly from node scripts); Playwright MCP plugin (disabled).
- screenshots / visual QA: Playwright screenshots + PIL contact sheets (used); impeccable (audit/polish/critique modes); review-animations, improve-animations.
- accessibility: no dedicated tool installed (impeccable and ui-styling carry accessibility guidance; no axe/lighthouse in node_modules).
- security: security-guidance plugin exists in the marketplace but is not installed; no dedicated scanner.
- debugging: superpowers systematic-debugging, codex-rescue agent, Context Mode ctx_search of session errors.
- Git / GitHub: gh 2.96.0 (used for the PR), superpowers finishing-a-development-branch / using-git-worktrees, EnterWorktree.
- Cloudflare Workers: repo-local wrangler 3.114.17 + miniflare (the stage worker runs on it); no Cloudflare MCP.
- email: Gmail connector (deferred MCP), Brevo through the Worker's own code and tests.
- image / assets: Google Drive connector, Higgsfield connector (generation), Canva connector, PIL; banner-design / brandkit skills.
- source-truth / document analysis: Google Drive connector (read/export), Claude Docs connector, Context Mode ctx_execute_file / ctx_fetch_and_index, Graphify.

USED DURING P0
| TOOL / SKILL | AVAILABLE | ACTIVE | USED IN P0 | WHAT FOR | RESULT / CONTRIBUTION |
|---|---|---|---|---|---|
| Bash (git, npm test, release-check, asset-versions, rsync, stage-up) | yes | yes | yes (103 calls) | tests, gates, stage runner, commits, PR | 305/305, RELEASE CHECK PASSED, 4 commits, PR #3 |
| Context Mode ctx_execute | yes | yes | yes (16) | network calls the hook blocks in Bash, transcript mining | stage/live checks, Codex findings recovered after compaction |
| Context Mode ctx_search / ctx_stats | yes | yes | yes (2 / 1) | post-compaction recall, this audit | instructions and findings recovered |
| Graphify query / explain | yes | yes | yes (1 query + explains) | dependency map for the root cause | pointed at stay.js sync() ↔ Rooms FIXED ↔ draft.js ↔ mail |
| Codex adversarial-review | yes | yes (gate OFF) | yes (5 runs, 2 deferred) | plan/implementation, final, confirming, closing reviews | 6 VALID findings fixed and pinned |
| Playwright (global 1.61.1) | yes | yes | yes (e2e.mjs, shots.mjs, diagnostics) | 49-check E2E ×4 runs, 48 screenshots ×4 runs | E2E PASS, 0 overflow |
| Miniflare / wrangler dev-local | yes | yes | yes | isolated stage worker with the four Durable Objects | all E2E on synthetic guests |
| PIL (python) | yes | yes | yes | contact sheets, image checks | sheet-320/390/834/1440 |
| Read (images) | yes | yes | yes (9) | visual QA of the sheets | four widths reviewed |
| gh CLI | yes | yes | yes | draft PR #3 | ChatGPT review surface |
| CronCreate / CronDelete | yes | yes | yes | deferred Codex passes | one-shot at 08:31 |
| Write / Edit | yes | yes | yes | plan, tests, evidence, docs | — |
| superpowers skills | yes | loaded (using-superpowers injected) | no Skill invocation | — | no contribution |
| impeccable PostToolUse hook | yes | yes | fired on Edit/Write (passive) | UI-change check | no finding surfaced |
| Agent / Workflow / subagents | yes | yes | no | — | — |
| Artifact / SendUserFile | yes | yes | no | — | — |
| Gmail / Drive / Calendar / Docs / Canva / Higgsfield / Indeed / Spotify connectors | yes | yes (deferred) | no | — | — |
| Playwright MCP plugin | installed | disabled | no | — | — |
| claude-mem plugin | installed | disabled | no | — | — |
| WebFetch / WebSearch | yes | deferred | no | — | — |

AVAILABLE BUT NOT USED (relevant to future See You In Laos work)
- superpowers:systematic-debugging — for any reproduction hunt like the USD 255 stall, before touching code.
- superpowers:test-driven-development / verification-before-completion — for every P0/P1 fix; make the pin first.
- superpowers:requesting-code-review + pr-review-toolkit (marketplace) — a second, Claude-side review lens on the PR beside Codex.
- Context Mode ctx_batch_execute / ctx_execute_file — for the copy extraction and audits: run the extractor and grep the corpus without pulling it into context.
- Context Mode ctx_fetch_and_index — to read the live Worker pages or Cloudflare docs without context cost.
- Graphify `graphify --update` after the P0 merge — the graph predates the Drafts DO and arranged.js; refresh before the next architecture question.
- impeccable (audit / critique / polish) — a structured visual pass on My Trip, My Bag and Review before the ChatGPT product review.
- Playwright MCP plugin (disabled) — interactive browser sessions when a flow needs exploration rather than a script; enable only for that task.
- Agent (Explore / general-purpose) and Workflow — fan out the copy extraction and the source-truth classification across surfaces in Task #3.
- Google Drive connector — to re-read the Owner's source documents when a SOURCE GAP (e.g. the fixed-room payer wording) needs settling.
- Gmail connector — to verify the delivered guest / Guest Relations emails after the next email change.
- Claude Docs connector — a shareable living document for the wording contract, if the Owner wants it outside the repo.
- security-guidance plugin (marketplace, not installed) — a pattern review of the Worker's auth and registration paths; requires the Owner's decision to install.
- codex-rescue agent / /codex:rescue — a second implementation attempt when a fix stalls.

RECOMMENDED USE BY TASK TYPE
- architecture / dependencies: Graphify query/explain (refresh the graph first), Explore agent for breadth.
- coding: Bash + Edit/Write in the working checkout, superpowers TDD, node test runner pins, release-check gate.
- technical review: Codex adversarial-review (plan and post-implementation, gate OFF), pr-review-toolkit or a Claude review agent as the second lens.
- UX / visual QA: Playwright screenshots at 320/390/834/1440 + PIL sheets read with Read; impeccable audit for design critique.
- browser / E2E: scripted Playwright against the Miniflare stage with the synthetic register; Playwright MCP only for exploratory sessions.
- security / privacy: private-file check before every commit (already in the workflow), Context Mode for any live-endpoint call, security-guidance if installed.
- debugging: superpowers systematic-debugging, ctx_search over captured errors, codex-rescue for a second diagnosis.
- release verification: release-check + asset-versions, read-only live checks through ctx_execute, Gmail connector for delivered mail.
- documentation / source truth: PROJECT_MASTER_BRIEF.md (local), Google Drive connector for Owner documents, ctx_execute_file for large extractions, Claude Docs for shareable living documents.

CONFIGURATION CHANGES MADE: NONE

FINAL STATUS:
SKILLS AUDIT: COMPLETE
