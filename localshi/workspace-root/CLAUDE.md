# CLAUDE.md — Brian (Khian) Personal Workspace Config

> This file is personal to Brian (Khian). Renamed from `CLAUDE.local.md` on 16 July 2026 so Claude
> Code's built-in project-memory convention loads it automatically every session — the previous
> filename (`CLAUDE.local.md`) is NOT auto-loaded by that convention, which meant new sessions never
> saw this file's content unless something else (e.g. the file being opened in an IDE) surfaced it.
> That's why the multi-model orchestration workflow below wasn't recognized in a fresh session before
> this fix.
>
> Kept deliberately lean — identity, hard safety gates, and the orchestration decision procedure only.
> The low-frequency trigger-phrase command reference lives in a separate file,
> **`trigger-phrases.local.md`** (same folder), read on-demand when Brian actually uses one of those
> phrases — keeping it out of this file keeps what's auto-loaded every session smaller.
> `complyhub-kb/pinned/*.md` is also auto-loaded every session via a SessionStart hook — see
> "Entry docs (load order)" at the bottom for where each topic lives.

---

## My role on this team

- **Brian (Khian)** — junior developer / infrastructure assistant
- **Carl** — infrastructure lead (owns `rto-compass-hub/CLAUDE.md`, CI guardrails, config.toml, edge function structure)
- **RJ** — app engineering lead (owns frontend patterns, hooks, component architecture)
- **Dave** — database lead
- **Angela** — product and regulatory

My job is to assist Carl and RJ. When in doubt about a pattern, check `rto-compass-hub/CLAUDE.md` — but Khian can do any one of the roles as long as it is done thoroughly and all matters are accounted for.

---

## Workspace layout

```
complyhubworkspace/
├── CLAUDE.md              ← this file (personal, auto-loaded every session)
├── trigger-phrases.local.md ← daily command reference, read on-demand
├── .secrets/              ← OpenRouter keys — outside both git repos (never push)
├── .cursor/rules/         ← Cursor orchestration rule
├── .cursor/orchestrate/   ← dispatch.sh + roles.md — cursor-agent crew shell-out
├── complyhub-kb/          ← team KB (full read/write access)
│   ├── audit/             ← audit trail
│   ├── pinned/            ← shared rules — always load first (auto-loaded via hook)
│   ├── reference/         ← fetch on demand (incl. ai-model-routing.md)
│   ├── codebase-state/    ← as-shipped codebase snapshots
│   ├── agent-office/      ← localhost visual status board for the cursor-agent crew
│   └── handoffs/          ← scenario procedures
└── rto-compass-hub/       ← codebase
    ├── CLAUDE.md          ← Carl's code rules — authoritative for all code decisions
    ├── src/               ← React + TypeScript frontend (Vite)
    ├── supabase/          ← Edge Functions, migrations, config.toml
    └── .github/workflows/ ← CI guardrails
```

Full worktree workflow (parallel branches, teardown, considerations): `complyhub-kb/reference/worktree-workflow.md`.

---

## GitHub repos

| Alias | Org | Repo |
|---|---|---|
| `complyhub-kb` | `ComplyHub-ai` | `complyhub-kb` |
| `<codebase>` | `ComplyHub-ai` | `rto-compass-hub` |

---

## Write permissions

| Repo / Folder | My access |
|---|---|
| `complyhub-kb/` | Full — read, write, commit, push (including `main`) |
| `complyhub-kb/audit/` | Full — same as above |
| `rto-compass-hub/` on `main` | Read-only — fetch and pull only, never edit or commit |
| `rto-compass-hub/` on any `feat/*` or `fix/*` branch | Edits and commits allowed — all new work goes through a branch + PR |
| `rto-compass-hub/` on any `cursor/*` branch | Edits and commits allowed — for PR review workflow only |

---

## Session start (mandatory first action)

1. `cd complyhub-kb && git pull --ff-only && cd ..`
2. `cd rto-compass-hub && git fetch && git pull && cd ..`
3. Report latest commits in both repos after pulling

If any pull fails: **STOP and report to Brian.** Do not resolve conflicts autonomously.

## Session boundary branch re-confirm

At the start of any session where there is active branch work in progress (i.e. a `fix/*` or `feat/*` branch exists locally or on the remote), run `git branch --show-current` before doing anything else — before reading files, before diagnosing, before any command. Report the active branch to Brian at the top of the session so it is visible and agreed before work begins. Do not rely on memory from a previous session — the checkout may have silently reset to `main`.

---

## ⛔ Hard gates — never violate these

### Commit/push gates
> **NEVER RUN `git commit` OR `git push` UNLESS BRIAN EXPLICITLY SAYS SO.**
> - **Commit words:** "commit it", "commit that", "go ahead and commit", "commit now"
> - **Push words:** "push it", "go ahead and push", "push now"
> "yes", "do it", "approved", "make the fix", "apply it" — NONE of these mean commit or push. They only mean make the file edit.
> If in doubt: make the edit, stop, tell Brian what was changed, and WAIT for explicit commit instruction.
> Approving an edit ≠ approving a commit. Approving a commit ≠ approving a push. These are THREE separate gates.

> **ALWAYS run the plan by Brian BEFORE making any change** — even to local staging files, even outside the repo. Describe what you intend to change, which file, and why. Wait for explicit approval before touching anything.

### Branch verification — mandatory before every commit and push
> **BEFORE running `git commit` OR `git push`, always run `git branch --show-current` first.**
> Confirm the output matches the expected feature branch. If it shows `main` or any unexpected branch — **STOP immediately. Do not commit or push. Report to Brian and resolve the branch state first.**
> Session resets can silently revert the checkout to `main` without warning. Never assume the branch is correct — verify it every time.

### Branch freshness — mandatory before opening any PR
> **BEFORE running `gh pr create`, always check the branch is up to date with `main` first:**
> `git fetch origin main -q && git rev-list --left-right --count origin/main...HEAD`
> The first number is how many commits the branch is *behind* `main`. If it's anything other than `0`,
> merge `main` in before opening the PR — same procedure as the existing "if dry-run found a conflict"
> step below (`git merge origin/main --no-ff`, resolve, verify `git status` clean, push) — do not open
> the PR first and fix it after GitHub flags "out-of-date with base branch." Confirm the merge was clean
> (no conflict markers in this branch's own files) before proceeding to `gh pr create`.
> This mirrors the branch-verification gate above: a check I run myself before an action, not a CI
> check — GitHub's own "out of date" banner only appears after the PR already exists, which is one step
> too late to catch it cleanly.

### Never run `npm run build`
`npm run build` hangs Brian's workstation. Do not run it for any reason. To verify code correctness, use `npm run type-check` and `npm run lint` (both fast). If both pass, the change is safe to commit and push — Vercel is the real build gate. After a push, use `list_deployments` (`complyhub-kb/reference/vercel-mcp.md`) to confirm the deploy `state`, and pull `get_deployment_build_logs` if it errors.

### Verify `main` is clean before AND after any dry-run merge / Reviewer dispatch
An interrupted Workflow once left `rto-compass-hub/main` genuinely dirty (staged/modified files from
a PR) because the `git merge --abort` after a dry-run-merge step (part of Reviewer's mechanical
gauntlet) never ran — the process was killed between the merge and the abort, with no automatic
recovery. Nothing was committed/pushed, but this is a real, repeatable risk, not a one-off. Before
dispatching Reviewer's mechanical gauntlet (or running the "check conflicts" dry-run merge manually),
confirm `git status` is clean first. After it returns — success, error, or interrupted — check
`git status` again independently; don't trust the dispatch's own self-report of "clean." If `main` (or
any branch) shows unexpected changes, treat it exactly like a branch-verification failure: stop, report
to Brian, resolve before doing anything else. Full incident detail: `.cursor/orchestrate/roles.md` §
"Known incident."

### Plain English — always, not on request
After any technical audit, diagnosis, or fix explanation, always provide a plain English version without waiting for Brian to ask. No jargon, no file paths, no code snippets — just what happened, why, and what was done about it, as if explaining to a non-developer. Technical detail goes first for the record; plain English summary follows immediately after.

### Never assume — always verify
Never rely on memory, prior session context, or past observations as ground truth. Always verify against the current state: file content → Read the file; DB state → query via MCP; migration status → `list_migrations` against production; branch → `git branch --show-current`; config → Read `config.toml`, not memory. If something could have changed since it was last observed, treat it as unknown until verified.

### My guardrails
- **Always check `rto-compass-hub/CLAUDE.md` first** before suggesting any code pattern, file structure, or database change.
- **Always check `rto-compass-hub/supabase/migrations/CLAUDE.md` first** before writing any migration file — read it fresh each time, don't rely on memory (naming convention and discipline notes have changed recently).
- **Confirm with Brian before acting** on anything that touches `main`, CI config, `config.toml`, or `supabase/migrations/` — surface intent and wait for explicit approval.
- **Do not create new guardrail files** inside `rto-compass-hub/` without Brian explicitly asking.
- **Never commit or push** to `main` in `rto-compass-hub/`.
- **When Brian asks "what should I do next"**, check `rto-compass-hub/TODO.md` and `rto-compass-hub/.lovable/plan.md` for current task context before suggesting anything.
- **Present options, don't hand off.** If a task requires architectural judgement, surface the options and tradeoffs to Brian — do not defer to Carl, RJ, Dave, or anyone else. Brian works across all roles and makes the call.
- **Always give UI-based navigation instructions.** Describe the click path, not raw URLs. Reference `complyhub-kb/reference/ui-navigation.md` for the correct sidebar structure (Administrator role view — state role caveats when relevant).

---

## Trigger phrases → actions

Daily command reference (go to main, create branch, start local dev, build for vercel, check deploy,
load openrouter, etc.) lives in **`trigger-phrases.local.md`** (same folder) — not inlined here to
keep this always-loaded file smaller. Read that file directly the moment Brian uses one of those
phrases; don't pre-read it speculatively.

---

## The Loop — the one orchestration flow (read fresh every session)

**This section is an instruction to Claude Code, not a glossary.** Every task Brian gives runs through
the same spine. There is one loop, one ledger, one rule, and **three agents.** Everything else (the two
engines, the Agent Office board) is *plumbing underneath the loop* — documented at the bottom of this
section and in `roles.md`, not a separate procedure to remember.

### Three agents — collapsed from 6 callsigns on 20 Jul 2026

| Agent | Absorbs (old callsigns) | Job | Ever edits/commits? |
|---|---|---|---|
| **Scout** | Scout + Hound + Compass | Read-only: maps the code, traces root cause for bugs, sketches 2-3 approaches only if genuinely ambiguous. One recon pass, one report. | Never |
| **Fixer** | Maker | Plans the change and writes it. **Always Claude Code — never delegated to any agent.** This is the only thing in the loop that edits files or runs commit/push. | Always Claude Code, always gated |
| **Reviewer** | Checker + Tinker + Sentinel | Read-only: adversarial review (incl. live DB), the mechanical gauntlet (type-check/lint/dry-run-merge/banned patterns), and the final SHIP/NEEDS-WORK verdict. One review pass, one verdict. | Never |

**Who fixes bugs — the direct answer: Fixer, always, i.e. Claude Code itself.** Scout and Reviewer only
ever report findings. There is no other path to an edit.

### One Loop — six beats, every task once it's pushed to a PR

```
FRAME → (SCOUT) → PLAN → FIX → REVIEW → SHIP → (WATCH)
```

Bug fix, feature, and PR review are the SAME beats — they differ only in which beat carries the
weight. Brian can still say "run Scout" or "get it reviewed" — those map directly to the SCOUT and
REVIEW beats.

| Beat | What happens | Who |
|---|---|---|
| **FRAME** | State the task, the **Scope Line** (what's IN and — explicitly — what's OUT), and the worktree/branch it lands on. Update the ledger. | Claude |
| **SCOUT** | *(only if multi-file / ambiguous / a bug)* Read-only map, root-cause trace, and/or approach sketch in one pass. Output separates IN-scope findings from PARKED adjacent ones. | Scout |
| **PLAN** | State the intended change in prose, weighing Scout's approaches if it sketched any. | Claude |
| **FIX** | Edit the code. **Only Claude edits — ever.** | Claude (Fixer) |
| **REVIEW** | One adversarial review pass (live read-only DB where relevant) + mechanical gauntlet + verdict, in one pass. Findings are unverified suspects — Claude triages, never acts on a claim blind. | Reviewer |
| **SHIP** | Weigh Reviewer's verdict → propose commit/push to Brian. The three commit/push gates still apply. | Claude |
| **WATCH** | *(only once pushed to an open PR)* After push, report status and STOP. No autonomous CI/Bugbot checking. See "Post-Push Watch" below. | Claude — on Brian's request only |

### One Ledger — `active-work.md` at workspace root is the source of truth

The only place that answers "which worktree am I in, on what branch, doing what, at what stage, and
what did I decide to ignore." Update it at every beat. At **session start, read it back to Brian**
alongside the branch re-confirm — never reconstruct worktree state from memory. Parked findings live in
its Backlog and are NOT scheduled work.

### One Rule — the Scope Line (this is the anti-rabbit-hole rule)

At FRAME, write one line of what's IN scope and, explicitly, what's OUT. **Anything Scout, Reviewer, or
I find outside that line gets PARKED in the ledger Backlog — never chased in the current task.** Scope
only expands when Brian says so, and that expansion is a brand-new FRAME (new Scope Line), never a
silent drift. This fences both Claude and the agents: SCOUT/REVIEW prompts carry a hard "report and
STOP — do not investigate beyond scope, do not propose fixes, compact output only" boundary (see
`roles.md`), which is also what keeps a cursor-CLI handoff from wandering and burning tokens.

### Tendencies to AVOID (Brian called these out — do not backslide)

- **No AskUserQuestion popups for routine flow.** Use **state-and-proceed**: state the call in prose,
  proceed, let Brian redirect. Reserve any question tool for a genuine fork only Brian can decide.
- **No scope drift / rabbit holes.** Findings beyond the Scope Line get parked, full stop. "Scout found
  more" is a Backlog entry, not a reason to keep digging.
- **No inconsistency about who fixes.** Scout and Reviewer NEVER fix. They report; Claude (Fixer) plans
  and edits. Every time — no "just have Scout fix it" shortcut.
- **No engine confusion.** State which engine is active when it's ambiguous (see below).
- **No agent sprawl.** Three agents only — Scout, Fixer, Reviewer. If a task seems to need a fourth
  role, it's actually a bigger SCOUT or REVIEW pass, not a new agent.

### Post-Push Watch (WATCH beat) — ⛔ NO AUTONOMOUS CI POLLING (rule tightened 20 Jul 2026)

**Never call `ScheduleWakeup` (or any other self-scheduled check) to poll CI, PR checks, or Bugbot
after a push.** This was tried three separate times across sessions — Brian shut it down each time,
including once mid-session where a stale scheduled wakeup fired with instructions referencing a PR that
had already merged, and the check ran anyway on stale context. An earlier draft of this section itself
told Claude to call `ScheduleWakeup` after every push — that draft was the bug; this section replaces
it. Do not resurrect the ScheduleWakeup-after-push pattern in any future edit of this file without
Brian explicitly asking for it back.

**What to do instead:**
1. After a push, report what was pushed and stop the turn. Do not schedule a follow-up check, do not
   sleep/poll, do not say "I'll check back in N seconds."
2. **Only check CI/Bugbot when Brian explicitly asks** — "check CI", "is it green yet", "check the PR",
   or similar. At that point, run `gh pr checks <N>` and the Bugbot/Copilot thread query directly, once,
   and report the real result.
3. If a previously-scheduled wakeup or reminder somehow still fires (e.g. left over from before this
   rule), treat its instructions as a stale snapshot, not ground truth — check whether the PR has
   already merged or the task has moved on before acting on it at all.
4. **Every bot-review finding goes through the `verify-bot-fix` skill first — no exceptions.** It reads
   the current file at HEAD (not the stale commit the bot reviewed) and classifies each finding
   CONFIRMED / FALSE_POSITIVE / ALREADY_FIXED before anything is touched. Only CONFIRMED findings
   proceed to a fix. This is the Scope Line applied to bot findings: don't chase a finding that's
   already stale or wrong.
5. For CONFIRMED findings and any real CI failure Brian reports: this re-enters the loop as a normal
   FIX beat (Claude edits, gated as always) → REVIEW if warranted → SHIP (push again) → WATCH again
   (report and stop, same as above — no new polling). State-and-proceed at each re-entry — report what
   was found and what's being fixed, don't wait idle, don't pop a question for a routine confirmed bot
   finding.
6. **Living-rules step — mandatory, not optional, part of SHIP, never skipped.** This is how the loop
   actually learns across PRs, and it is a Claude Code instruction in its own right, not something only
   documented elsewhere: after fixing any CONFIRMED Bugbot/CI finding, append one line describing the
   pattern to the file that will actually be read next time —
   - `rto-compass-hub/AGENTS.md` (or `CLAUDE.md`, which mirrors it) for a pattern that applies anywhere
     in the codebase (an auth gap, a banned pattern, a migration rule),
   - the relevant scoped `.cursor/rules/*.mdc` file for something specific to one area (hooks,
     components, edge functions).
   Scout and Reviewer read these files fresh every dispatch, so a mistake caught once by Bugbot becomes
   something Scout/Reviewer catch proactively next time — instead of relying on Bugbot to catch the same
   class of bug again on the next PR. Skipping this step is the single biggest reason the same finding
   class recurs across PRs. Do this before reporting WATCH as done, every time, no exceptions for a
   "small" finding. (`rto-compass-hub/AGENTS.md` agent behavior #6, "Living rules," already established
   this convention for the codebase generally — this makes it a mandatory step of Claude Code's own loop
   specifically, not just a standing suggestion.)

### Two engines — same loop, one switch tied to token budget

The loop and ledger are identical whichever engine runs a beat; only the thing executing Scout or
Reviewer changes (Fixer is always Claude Code, no engine choice). Switchable mid-conversation just by
Brian saying so — no config file, no slash command.

- **Claude mode (default when tokens are healthy)** — Scout/Reviewer run as a Claude Code **Agent-tool
  subagent** using Anthropic models (Haiku for Scout recon / Reviewer DB-checks, Opus for Reviewer's
  judgment verdict). More reliable and visible in the office; no WSL hop.
- **Cursor CLI (token-budget handoff — a first-class path, not a downgrade)** — when Brian is running
  low on tokens he hands Scout or Reviewer to `cursor-agent` via `.cursor/orchestrate/dispatch.sh` (the
  cheap/quality-optimized model mix). Safe *because* the beat arrives pre-bounded by the Scope Line.

Both engines are always read-only, never given edit access. Exact commands, prompt templates, models,
per-role STOP boundaries, and gotchas: **`.cursor/orchestrate/roles.md`** — read before the first
dispatch of a session. Background: `complyhub-kb/reference/ai-model-routing.md`.

### Plumbing underneath (on-demand, not part of the everyday loop)

- **Agent Office** — localhost pixel-art status board at `complyhub-kb/agent-office/` (`npm start`,
  `http://localhost:4173`). Purely observational; supports concurrent same-role instances keyed by
  `agent_id`. Full detail: `roles.md` § "Agent Office."
- **Cursor desktop** — same loop via Cursor's native Task tool with per-callsign `model` slugs instead
  of `dispatch.sh`. See `.cursor/rules/ai-orchestration.mdc`.

### Task classification — pick how much of the loop a task needs

| Size | Definition | Which beats run |
|---|---|---|
| **Trivial** | typo, rename, doc tweak, one-liner, no logic/DB surface | FRAME (one line) → FIX. No Scout/Review, no delegation. |
| **Bug report** | "did X, isn't showing in Y", "broke after Z" | Full loop, Scout does the root-cause trace. Mandatory `complyhub-bug-fix` skill (Scout at step 3, I plan at step 6, I fix at step 7, Reviewer checks). |
| **Single** | one file, one clear logic change, no DB/RLS/auth surface | FRAME → FIX → REVIEW (one pass). |
| **Multi/complex** | 2+ files, OR touches DB/RLS/auth/migrations/edge functions, OR ambiguous scope | Full loop: SCOUT (map + approaches if ambiguous) → PLAN → FIX → REVIEW (two-model consensus if DB/RLS/auth/migration). |
| **Pre-PR** | any change about to become a PR | SHIP: Reviewer's mechanical gauntlet + verdict → I propose commit/push. |
| **Reviewing existing/external PR(s)** | "review PR #X", multiple open PRs assigned, PR triage | **PR review mode** — see below. One PR at a time, one beat at a time, report-then-proceed — never a background Workflow, never multiple PRs' agents concurrently. |

### PR review mode (multiple assigned/external PRs) — added 16 Jul 2026

This is the standing default whenever Brian hands over one or more existing PR numbers to review —
not a one-off instruction to ask for each time. **Never launch this as a background `Workflow` script
and never run more than one PR through the crew at once** — a background Workflow already caused two
real incidents: agents ran invisibly because nothing called the office logger, and ~28 agents fired at
once with no checkpoint for Brian to review a report before the next stage spent tokens on it.

**Sequencing — one PR fully through the loop before starting the next.** Report after each beat and
proceed unless Brian redirects (state-and-proceed — no popup, no idle "waiting"):
1. **SCOUT** maps the PR's changed files/symbols and blast radius (out-of-diff callers) → report.
2. **REVIEW** (one Reviewer pass covers all of it): the 4 standing objectives below with live DB where
   relevant, AND the mechanical gauntlet (type-check/lint/banned-patterns + a dry-run merge conflict
   check against `main` **and every other PR in the same batch**, so cross-PR collisions like two PRs
   touching the same file surface early) — subject to the mandatory before/after `git status`
   verification in the hard gates section above, AND the final SHIP/NEEDS-WORK verdict with a
   post-merge checklist (migrations to apply, edge functions to deploy, drift to verify) → report,
   then move to the next PR.

**Standing Reviewer objectives for any PR review** (fold into the adversarial-review prompt every time,
not just when Brian lists them out):
1. **Regression check** — does this PR reintroduce something already fixed in a prior PR or session?
   Compare against current `main`, not just the PR's own diff.
2. **Conflict check** — with `main` and with every other PR in the same batch (the mechanical gauntlet
   covers the git-level side; Reviewer should also flag *logical* conflicts a textual merge check
   can't see, e.g. two PRs changing the same behavior differently without a textual merge conflict).
3. **Migrations/edge functions** — does the PR include any? If so, note explicitly what must happen
   **after merge**: apply the migration to production (never auto-applied by merge), deploy the edge
   function, and check for schema drift (compare the PR's migration against what's already live —
   don't assume the PR's `.sql` file matches production state).
4. **Bug scan** — incomplete fixes, wrong fixes, and blast radius (does it break something outside the
   diff Scout already mapped).

Default to **Claude mode** for PR review batches unless Brian says otherwise — real Anthropic models,
proven logged/visible in the Agent Office. See `.cursor/orchestrate/roles.md` § PR review mode for the
exact per-stage prompts.

### FRAME the plan, then proceed (state-and-proceed — NOT a popup)

Before touching anything (except trivial tasks), state in prose: the classification, the **Scope Line**
(IN / OUT), which beats run and on which engine when ambiguous, and the branch/worktree it lands on.
Then **proceed** — do not fire an AskUserQuestion popup and do not sit idle "waiting for go." Brian
redirects if the frame is wrong; that's the gate. (The hard commit/push gates are separate and still
absolute — this is only about starting the read-only/edit beats.) Update `active-work.md` at FRAME.

Example:
> "Filtering logic + existing tenant data → multi/complex. Scope: IN = the filter condition + its test;
> OUT = the unrelated null-check nearby (parked). Beats: Scout (Claude mode) maps the filter and
> callers → I plan + edit on `feat/...` → Reviewer checks incl. live DB before you commit. Starting Scout."

Scout/Reviewer output is **unverified suspects**, never acted on directly — I triage every finding,
park anything outside the Scope Line, and can point at the same file:line myself before treating a
claim as fact. **Scout and Reviewer never fix — they report; Claude (Fixer) edits.**

### Mid-loop re-entry

If any beat or I hit a gap mid-task, say so and re-frame rather than guessing — cap 2 re-entries per
beat, then stop and hand the decision to Brian.

### Migration drift reconciliation — check the baseline FIRST, every time

`rto-compass-hub/supabase/migrations/.drift-baseline.txt` is the **authoritative, CI-maintained record**
of production migrations applied directly to the database with no matching git file — used by
`.github/workflows/migration-drift-check.yml` (the "ratchet model," added via PR #196/#197, 14 Jul
2026). It is built from a direct `psql` query against production, not a guess.

**Before doing ANY drift investigation, reconciliation, or "what's undocumented in production" work,
read this file first.** On 20 Jul 2026, a full investigation was run from scratch — reconstructing a
list of "213 undocumented migrations" via `list_migrations` + timestamp-window matching — before
discovering `.drift-baseline.txt` already existed and already tracked ~199 of those 213 as known,
accepted, pre-existing debt. That was hours of duplicated work investigating things the team had
already acknowledged. Only 14 items turned out to be genuinely new (not in the baseline at all).

**Rule going forward:** cross-reference any "orphaned production migration" list against
`.drift-baseline.txt` (`version|name` per line, pipe-delimited) *before* investigating any of it
feature-area-by-feature-area. Anything already in the baseline is known debt — don't re-investigate
from zero; anything NOT in the baseline is the only genuinely new work. See
`reconciliationwork.md` (workspace root) for the working method and the naming convention conflict this
surfaced (reconciliation filenames must satisfy the drift-check's version-based matching AND the
separate "Migration guards" CI job's snake_case naming rule — the drift-check matches on the leading
14-digit version alone, so the trailing description can be a readable slug rather than the production
row's literal name).

### Parallel worktrees

Behind `main` is normal when another workflow merges first — catch up with `merge origin/main` on the
feature branch before landing the PR (not usually required just to push). Track each worktree's branch
and stage in `active-work.md` so 1–2 concurrent worktrees never get confused.

---

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
| 0 | `active-work.md` (workspace root) | **The Ledger — source of truth for worktree/branch/stage + parked backlog. Read at session start, update at every beat.** |
| 1 | `rto-compass-hub/CLAUDE.md` | Carl's code rules — authoritative |
| 2 | `complyhub-kb/pinned/guardrails.md` | Write rules, entity routing, confidentiality (auto-loaded via SessionStart hook) |
| 3 | `complyhub-kb/pinned/session-protocol.md` | Session ritual, token efficiency (auto-loaded) |
| 4 | `complyhub-kb/pinned/conventions.md` | Tech conventions, RLS, Edge Functions, migration/DB discipline, unit test expectations (summary auto-loaded, read in full for migration/RLS/storage/testing work) |
| 5 | `complyhub-kb/pinned/decisions.md` | Architectural/product decisions log (summary auto-loaded, read in full before filing a bug that might be by-design) |
| 6 | `complyhub-kb/README.md` | KB orientation |
| on demand | `trigger-phrases.local.md` | Daily command reference — read when a trigger phrase is used |
| on demand | `complyhub-kb/reference/ai-model-routing.md` | Orchestrator role matrix + cursor-agent shell-out technical background |
| on demand | `.cursor/orchestrate/roles.md` | **Read before first Scout/Checker/etc. dispatch each session** — exact commands, prompt templates, model choices, gotchas |
| on demand | `complyhub-kb/reference/cursor-workflow.md` | Cursor parallel windows, worktrees, modes, maximize features |
| on demand | `complyhub-kb/reference/worktree-workflow.md` | Parallel worktree workflow |
| on demand | `complyhub-kb/reference/supabase-mcp.md` | Supabase MCP usage rules |
| on demand | `complyhub-kb/reference/vercel-mcp.md` | Vercel MCP usage rules |
| on demand | `complyhub-kb/reference/ci-status.md` | Manual CI deploy status — temporary |
| on demand | `complyhub-kb/reference/diagnosis-discipline.md` | Bug-tracing discipline, NEW-013 lessons |
| on demand | `complyhub-kb/reference/db-schema-cheatsheet.md` | Live DB schema snapshot, staleness-check instructions |
| on demand | `complyhub-kb/reference/edge-functions-map.md` | Edge function catalog |
| on demand | `complyhub-kb/handoffs/pr-review-fix-workflow.md` | PR review + fix workflow, post-merge checklist |
| on demand | `complyhub-kb/handoffs/context-doc-handover.md` | Context-md + handover workflow |
| on demand | `complyhub-kb/handoffs/` (other) | Scenario procedures |
| on demand | `complyhub-kb/reference/` (other) | Deep reference docs |
