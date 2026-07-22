> Companion to `dispatch.sh`. Read this before dispatching a Scout or Reviewer call.
> Proven end-to-end 15 Jul 2026 — see `complyhub-kb/reference/ai-model-routing.md` for the full writeup.
> **Collapsed from 6 named callsigns to 3 agents on 20 Jul 2026** (Scout/Fixer/Reviewer) — too many
> roles to hold in your head, and it caused inconsistency about who was allowed to fix a bug. See
> `CLAUDE.md` § "The Loop" for the full rationale.

# Roles for the cheap-model shell-out orchestration

Claude Code is the **orchestrator + Fixer** — it triages, plans, edits code, and holds the commit/push
gates. It never delegates edits. There are exactly three agents in this workflow:

| Agent | Absorbs (old callsigns) | Ever edits/commits? |
|---|---|---|
| **Scout** | Scout + Hound + Compass | Never |
| **Fixer** | Maker | Always Claude Code, always gated |
| **Reviewer** | Checker + Tinker + Sentinel | Never |

**Who fixes bugs — always Fixer, i.e. Claude Code itself.** Scout and Reviewer only ever report. If a
task seems to need a fourth role, that's a sign the current Scout or Reviewer pass needs to cover more
ground in one dispatch — not a reason to add a new named agent.

## ⛔ Mandatory Scope Line boundary — every Scout/Reviewer dispatch (both engines)

The #1 cause of rabbit holes and wasted cursor-CLI tokens is an unbounded sub-agent that keeps digging
past what it was asked. **Every Scout/Reviewer prompt — Claude mode or cursor CLI — must end with this
boundary block** (adapt the scope line to the task):

```
SCOPE: <exactly what to look at — the one task>. OUT OF SCOPE: everything else.
BOUNDARY: Report findings and STOP. Do NOT investigate beyond SCOPE. Do NOT propose or write fixes.
If you notice something outside SCOPE, list it under a "PARKED (out of scope)" heading in one line
each — do not chase it. Output: compact structured bullets / file:line list, not prose.
```

Findings that come back under "PARKED" go to `active-work.md` Backlog — Claude does not act on them in
the current task. Scout and Reviewer NEVER fix; Claude (Fixer) edits. This block is what makes a
token-budget handoff to cursor CLI safe: the beat arrives pre-fenced.

## Two engines — added 16 Jul 2026, simplified 20 Jul 2026

Brian can switch between two ways Scout/Reviewer actually run, just by saying so in plain language
("go claude mode" / "back to default" / "use the cursor CLI") — no config file, no slash command. The
mode applies for the rest of the session until Brian says otherwise; state which mode is active as
part of the intake-voice plan statement whenever it's ambiguous. Fixer never runs through either engine
— it's always Claude Code directly.

### Default mode

Claude shells out to **`.cursor/orchestrate/dispatch.sh`**, which runs **`cursor-agent`** (Cursor CLI,
via WSL) as a headless subprocess pinned to a per-agent model (Kimi/Codex — the cheap/quality-optimized
mix). This is the **token-budget handoff** — reach for it when running low on tokens, not just as a
fallback. Proven end-to-end incl. live DB via Scout/Checker on 15 Jul 2026.

### Claude mode

**No `cursor-agent`/WSL/Cursor plan involved at all.** Claude dispatches Scout or Reviewer as a genuine
Claude Code **Agent tool** subagent — the same mechanism used for Explore/general-purpose subagents
elsewhere in a session — using Anthropic models directly, not Cursor's bundled Claude models.

| Agent | Model | Effort | Why |
|---|---|---|---|
| **Scout** | Haiku | mid | Cheap recon/trace, escalate only if a root-cause trail goes cold twice |
| **Reviewer** — DB/mechanical checks | Haiku | mid | Cheap, mechanical schema/data/lint verification |
| **Reviewer** — final verdict | Opus | mid | Judging correctness end-to-end is the hard part |

**Logging so the Agent Office UI still works:** since Agent-tool subagents don't go through
`dispatch.sh`, call **`.cursor/orchestrate/log-agent-event.py`** directly around each Agent dispatch
so the same `agents.jsonl` the office UI reads still gets the right events:

```bash
# before dispatching the subagent — capture both printed values
python3 .cursor/orchestrate/log-agent-event.py start <role> <claude-model-id> "<task>"
#   -> prints AGENT_ID=... and STARTED_MS=...

# after the subagent returns
python3 .cursor/orchestrate/log-agent-event.py complete <role> <claude-model-id> "<task>" <agent_id> <started_ms> "<result preview>"
# or on failure:
python3 .cursor/orchestrate/log-agent-event.py error    <role> <claude-model-id> "<task>" <agent_id> <started_ms> "<error text>"
```

`<role>` is `scout` or `reviewer`. Same JSONL format as `dispatch.sh` (proven via smoke test
16 Jul 2026) — the office UI can't tell the difference except the `model` field and a `-claude` suffix
on the agent_id. Prompts/triggers are otherwise identical to default mode (same templates below) — only
the engine underneath changes.

**Never skip the logger calls in Claude mode.** A background `Workflow` script that calls `agent()`
directly, with no logger instrumentation, produces work the Agent Office UI can't see at all — this
happened for real on 16 Jul 2026 (a 5-PR review Workflow ran ~28 agents with zero office visibility).
If a task is being run as a `Workflow` script rather than direct `agent()` calls from this conversation,
each stage must call `log-agent-event.py` itself (or the office simply won't reflect it) — see PR
review mode below for why Workflows are discouraged for this use case specifically, independent of the
logging question.

## PR review mode — added 16 Jul 2026, simplified 20 Jul 2026

Standing procedure whenever Brian hands over one or more existing PR numbers to review. Full trigger
and standing objectives: `CLAUDE.md` § "PR review mode." Mechanics:

**Never use a background `Workflow` script for this.** Two real incidents on 16 Jul 2026 from doing
exactly that: (1) the office UI showed nothing despite ~28 agents actually running, because the
Workflow's `agent()` calls had no logger instrumentation; (2) all 5 PRs ran through all stages
concurrently with no checkpoint — Brian never got to see Scout's report before Reviewer already spent
tokens on it, which is the opposite of the control he wanted. Run this as direct `agent()` dispatches
from the live conversation instead — slower, but every dispatch is individually visible in the office
and Brian reviews each stage's report before the next one starts.

**Per PR, in order, reporting after each stage (state-and-proceed — no popup, no idle "waiting"):**

1. **Scout** — map the PR:
   > "Scout recon for PR #<N> \"<title>\". Diff: <fetch via `gh pr diff <N>`>. Map every changed
   > file/symbol, and for each changed exported symbol/hook/component/edge-function, grep the repo
   > for out-of-diff callers (blast radius). List every migration file and edge function in the diff
   > by name. SCOPE: this PR's diff only. BOUNDARY: report and stop, do not propose fixes. Compact
   > structured output, not prose."
2. **Reviewer** — one pass covering all standing objectives, the mechanical gauntlet, AND the final
   verdict:
   > "Reviewer pass for PR #<N>. Diff + Scout's map: <paste>. Objectives: (1) REGRESSION — does this
   > reintroduce anything already fixed on current `main` or in a prior session/PR (compare against
   > main's actual current state, not assumptions)? (2) CONFLICT — logical conflicts with main or
   > with these other PRs in the same batch: <list other PR numbers/titles>, beyond what a git merge
   > would catch. (3) MIGRATIONS/EDGE FUNCTIONS — does the PR include any? If so, what needs to happen
   > POST-MERGE: apply migration to production (never auto-applied), deploy edge function, and check
   > for schema drift (does the PR's migration match what's actually live — use Supabase MCP
   > list_migrations/execute_sql, not assumption). (4) BUGS — incomplete fixes, wrong fixes, blast
   > radius damage to code outside the diff. THEN run the mechanical gauntlet: git status, git diff
   > --stat against origin/main, npm run type-check, npm run lint, a dry-run merge check (git merge
   > origin/main --no-commit --no-ff then abort) against main AND every other PR in this batch, and
   > grep for banned patterns (.single() on Supabase queries, console.log/console.error instead of
   > shared log.ts, hardcoded credentials/URLs). THEN give a final SHIP/NEEDS-WORK verdict weighing all
   > of the above, plus a post-merge checklist (migrations to apply, edge functions to deploy, drift to
   > verify, merge-order advice if this PR conflicts with another in the batch). Tag findings
   > [PASS]/[RISK]/[BUG]. SCOPE: this PR + its batch-mates listed above. BOUNDARY: report and stop, do
   > not fix anything. Do not edit, commit, or push."

Then, and only then, move to the next PR. Default to Claude mode for this unless Brian says otherwise.

**Mandatory `git status` check around the dry-run merge inside the Reviewer pass** — see the known
incident below. Before dispatching Reviewer, confirm `git status` on `rto-compass-hub` is clean and on
the expected branch. After Reviewer returns (success, error, or interrupted), check `git status` again
independently before doing anything else — don't trust the Reviewer prompt's self-report of "clean."

## Agent Office — visual status board (multi-instance, added 16 Jul 2026)

Localhost-only pixel-art office at `complyhub-kb/agent-office/` — `npm start` from that folder, view
at `http://localhost:4173`. Purely observational: reads `complyhub-kb/agent-office/logs/agents.jsonl`
(written by `dispatch.sh` and `log-agent-event.py`) over SSE, never affects dispatch behavior. Now
renders two roles (Scout, Reviewer) instead of six.

**Supports concurrent instances of the same role.** State is keyed by `agent_id`, not role — this
matters because Brian can (and does) run multiple Claude Code conversations in parallel, e.g. one
chat's Scout reviewing PR #163 while another chat's Scout reviews PR #173 at the same time. Both
write to the same shared log file; the office renders each as its own character (extra desk position
auto-assigned) and its own dashboard card, auto-tagged with a short label pulled from the task text
(e.g. "PR #163" if the task mentions a PR number, else a truncated snippet) so they're distinguishable
at a glance. A role with zero active instances falls back to a single idle-wandering representative,
same as before this was added.

**Nothing extra to do when dispatching** — this works automatically as long as each dispatch has its
own unique `agent_id`, which both `dispatch.sh` and `log-agent-event.py` already generate by
construction (`<role>-<timestamp>-<pid>` or `-claude` suffix). Don't hand-craft or reuse an `agent_id`
across dispatches, or instances will collide and overwrite each other in the office, same as the
single-instance bug this replaced.

Completed instances stay visible for ~8s (so the result is visible before it disappears) then prune
automatically; blocked/error instances auto-clear after 2 minutes; a "running" instance with no update
for 10 minutes self-heals back to idle (covers a forgotten Claude-mode completion log call). None of
this requires action from Claude — it's handled client-side in
`complyhub-kb/agent-office/public/client.js`.

## Scout — recon, root-cause trace, and approach sketch, in one pass

```bash
.cursor/orchestrate/dispatch.sh scout kimi-k2.7-code "$(cat <<'EOF'
Map where <X> is written and where <Y> reads it. If this is a bug report, also trace the EXECUTION
PATH from the user action forward: find the entry point, grep every caller, check ALL branches/
switch-cases (not just the obvious one), check any guard/permission/RLS condition that could silently
no-op the action, and use the Supabase MCP (read-only) to check actual DB state instead of assuming.
If the task is genuinely ambiguous (2-3 valid approaches), sketch them with tradeoffs (blast radius,
files touched, risk, effort) and recommend one — otherwise skip this part.
Return a compact file:line list / structured bullets, not prose.
SCOPE: <the one task>. OUT OF SCOPE: everything else.
BOUNDARY: Report findings and STOP. Do NOT propose or write fixes. List anything outside SCOPE under
a "PARKED (out of scope)" heading, one line each — do not chase it.
EOF
)"
```

- Default model: **kimi-k2.7-code** — proven strong on real ComplyHub code, coding-specialist quality.
  For a bug's root-cause trace specifically, `gpt-5.3-codex` is a stronger alternative if the trail
  goes cold twice on kimi.
- Job: cheap read-only mapping/tracing/planning before Claude edits. Covers what used to be three
  separate dispatches (Scout + Hound + Compass) — pick the relevant parts of the prompt template for
  the task at hand (a trivial map doesn't need the root-cause or approach-sketch sections).
- Always ask for a **compact structured answer** (file:line list / JSON), not prose — the ~15-60k
  fixed context overhead per call means verbose back-and-forth is the biggest token waster, not the
  model price itself.
- If a Scout result looks suspiciously thin on a tricky area, re-run that one call on a stronger model
  rather than trusting it blind (don't blanket-upgrade Scout by default).
- Scout's report feeds directly into Claude's plan — Claude does not act on a root-cause or approach
  claim without being able to point at the same file:line itself.
- Read-only: recon + Supabase MCP reads only. **Never proposes or writes a fix.**

## Reviewer — adversarial review, mechanical gauntlet, and merge verdict, in one pass

```bash
.cursor/orchestrate/dispatch.sh reviewer kimi-k2.7-code "$(cat <<'EOF'
You are an adversarial fresh-eyes reviewer. Assume something is broken and prove correctness end to
end, not just surface reading. Read <file(s)> and anything they import/call.
Check: (1) does it do what its name/callers expect, (2) auth/authorization gating, (3) every DB query —
do tables/columns plausibly exist, is RLS/service-role usage correct (use the supabase MCP tools
list_tables/execute_sql/get_advisors/list_migrations to verify against the LIVE schema, not just guess
from code), (4) error handling and edge cases, (5) blast radius — who else calls this, could a change
break them.
If this is a pre-PR/pre-merge check, ALSO run the mechanical gauntlet: git status, git diff --stat
against origin/main, npm run type-check, npm run lint, a dry-run merge check (git merge origin/main
--no-commit --no-ff then abort), and grep for banned patterns (.single() on Supabase queries,
console.log/console.error instead of shared log.ts, hardcoded credentials/URLs). THEN give a final
SHIP/NEEDS-WORK verdict weighing correctness + mechanical results together.
Return ONLY concise bullets tagged [PASS]/[RISK]/[BUG] with file:line, plus the verdict if applicable.
SCOPE: <the one task/PR>. OUT OF SCOPE: everything else.
BOUNDARY: Report and STOP. Do NOT edit, commit, or push anything. List anything outside SCOPE under a
"PARKED (out of scope)" heading, one line each.
EOF
)"
```

- Default model: **kimi-k2.7-code** for the review/mechanical parts; **claude-opus-4-8-thinking-high**
  (or `gpt-5.5-medium` if cost-bound) for the final verdict specifically when it's a genuine
  merge-critical judgment call — merge-critical judgment earns the premium tier, the mechanical checks
  don't need it.
- **Two-model consensus for high-risk changes** (DB/RLS/migration/edge-function/auth surface): run the
  same reviewer prompt on kimi-k2.7-code AND `gpt-5.3-codex` independently for the correctness portion.
  Both must come back [PASS]-only (no [BUG]) to clear. Different model families catch different blind
  spots.
- Covers what used to be three separate dispatches (Checker + Tinker + Sentinel) — for a mid-task
  single-file check, just the correctness-review part of the prompt is needed; for a pre-PR check,
  include the mechanical gauntlet and verdict sections too.
- The reviewer has live, read-only Supabase MCP access (see `.cursor/mcp.json` — scoped to
  `--project-ref gdwhlstfguxarnxasrrs --features database,docs,debugging --read-only`). It can
  confirm/refute DB-shape suspicions against the real schema instead of guessing from code alone —
  this is the whole point of the role, use it explicitly in the prompt.
- Reviewer output is **unverified suspects**, not confirmed defects. Claude (orchestrator) triages:
  discard false positives, act on clear real ones, spawn one more cheap call to settle anything
  ambiguous. Nothing the reviewer says gets committed on its word alone. The three commit/push gates
  in `CLAUDE.md` still apply regardless of the verdict.
- Read-only from a git-state perspective for the mechanical portion: type-check/lint/dry-run-merge
  only, no commits — the dry-run merge is *intended* to always be followed by `git merge --abort`.

### ⚠️ Known incident — dry-run merge is NOT crash-safe (16 Jul 2026)

A multi-PR review Workflow was interrupted mid-run (paused, then per Brian actually crashed) while
several dry-run-merge steps were in flight. The `git merge --abort` never ran for at least one of them,
and it left **`main` genuinely dirty** — PR #161's files sitting staged/modified directly on `main`
(confirmed via `git status`, cleaned up manually with `git restore --staged .` + `git checkout -- .` +
removing the untracked new files). Nothing was committed or pushed, so no remote/CI impact, but this is
a real gap: **an interrupted process between the merge and the abort has no automatic recovery.**

**Mandatory mitigation until this is hardened further:**
- **Before** any Reviewer dispatch that includes the mechanical gauntlet (or a manual "check
  conflicts" dry-run), run `git status` on `rto-compass-hub` and confirm it's clean and on the expected
  branch. If it's already dirty, STOP — don't layer a new dry-run merge on top of unknown existing
  state.
- **After** the dispatch returns (success, error, or if it was interrupted), run `git status` again
  before doing anything else. If `main` (or any branch) shows unexpected staged/unstaged/untracked
  changes, treat it as the same severity as the branch-verification hard gate — stop, report to Brian,
  do not commit/push/edit until it's resolved.
- Don't trust a Reviewer prompt's self-report of "clean at the end" — verify independently, the same
  "never assume — always verify" principle applies here as everywhere else.

## What NOT to delegate here

- Any file edit — Claude Code does all edits directly, gated by `feat/*`/`fix/*`/`cursor/*` branch
  rules and the three commit/push gates in `CLAUDE.md`.
- Anything requiring a database **write** — the MCP is read-only by server config, and even if a
  prompt asked for a write it would be structurally rejected (empirically confirmed: `apply_migration`
  returns `"Cannot apply migration in read-only mode."`).

## Known gotchas (hit during setup, keep in mind)

- **Run from the workspace root.** `cursor-agent` resolves `.cursor/mcp.json` relative to its cwd. If
  invoked from inside `rto-compass-hub/` (which has its own leftover `.cursor/mcp.json.example`), the
  Supabase MCP silently reports "not found." `dispatch.sh` always `cd`s to the real root first — don't
  bypass it by calling `cursor-agent` directly from a subrepo.
- **`list_tables` (verbose, no filter) times out** on this project — 800+ live tables. Use targeted
  `execute_sql` against `information_schema.columns`/`pg_catalog` instead, as the Reviewer itself will
  usually figure out on its own once told to verify against live schema.
- **`--approve-mcps` alone is not enough.** It approves the MCP *server*; each individual tool call
  still needs `--force` or it's silently rejected (`User rejected MCP: <tool>`). `dispatch.sh` already
  includes both.
