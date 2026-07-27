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

### Never run `npm run build`
`npm run build` hangs Brian's workstation. Do not run it for any reason. To verify code correctness, use `npm run type-check` and `npm run lint` (both fast). If both pass, the change is safe to commit and push — Vercel is the real build gate. After a push, use `list_deployments` (`complyhub-kb/reference/vercel-mcp.md`) to confirm the deploy `state`, and pull `get_deployment_build_logs` if it errors.

### Applying migrations to production — `supabase db push` only, never `apply_migration`
Confirmed 21 Jul 2026 (PR #279 post-merge): the Supabase MCP `apply_migration` tool does NOT respect a
migration file's `YYYYMMDDHHmmss` filename version — it records whatever it applies under a freshly
generated version (the moment the tool ran), even when `name` is set to match the file. This creates a
git/production ledger mismatch identical to the drift this workspace's migration discipline exists to
prevent, and required `supabase migration repair` (revert wrong version, apply correct version) for every
affected file to fix. **Never use `apply_migration` to deploy anything that already exists as a file in
`supabase/migrations/`.** `apply_migration` remains fine for one-off SQL Claude authors on the fly that
has no corresponding file (e.g. exploratory schema checks), never for an existing migration file. Full
detail: `complyhub-kb/reference/supabase-mcp.md` and `complyhub-kb/reference/diagnosis-discipline.md`
§ "Learned from PR #279".

**⚠️ Interim procedure (in effect since 22 Jul 2026, until the Lovable-era drift is reconciled):**
`supabase db push` is currently **not usable at all** — production's migration ledger carries ~2,000
pre-baseline versions with no corresponding local file (confirmed via the `Apply Supabase Migrations`
GitHub Actions workflow failing on every merge to `main` since at least 21 Jul 2026, PRs #279 through
#292). Running `db push` — from CI or from Brian's terminal — fails immediately with "Remote migration
versions not found in local migrations directory" before it ever reaches the new migration. This is a
much bigger, separate reconciliation project (see `supabase/migrations/CLAUDE.md` for what's known about
it) — do not attempt to resolve it as a side effect of shipping a normal PR.

Until that's resolved, apply each merged PR's migration(s) this way instead:
1. Read the exact SQL from the migration file(s) on `main` (post-merge).
2. Run that SQL directly via the Supabase MCP `execute_sql` tool (not `apply_migration`) — this applies
   the schema change but does **not** touch the migration ledger.
3. Verify the change actually landed (re-query the function/table/policy that changed).
4. Hand Brian the exact ledger commands to run from his terminal, one per migration file:
   ```bash
   cd rto-compass-hub
   supabase migration repair --status applied <version>
   ```
   `migration repair` only writes to `supabase_migrations.schema_migrations` — it doesn't try to run or
   reconcile anything else, so it succeeds even with the broader drift untouched.
5. After Brian confirms he's run it, verify the ledger entry with
   `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '<version>';` —
   confirm both `version` and `name` match the file exactly.

This keeps git and production in sync for every new migration going forward, without requiring the full
drift reconciliation first. Revert to plain `supabase db push` once that reconciliation happens — do not
carry this interim procedure forward as a permanent pattern.

### Verify `main` is clean before AND after any dry-run merge / Tinker dispatch
An interrupted Workflow once left `rto-compass-hub/main` genuinely dirty (staged/modified files from
a PR) because the `git merge --abort` after a Tinker-style dry-run merge never ran — the process was
killed between the merge and the abort, with no automatic recovery. Nothing was committed/pushed, but
this is a real, repeatable risk, not a one-off. Before dispatching Tinker (or running the "check
conflicts" dry-run merge manually), confirm `git status` is clean first. After it returns — success,
error, or interrupted — check `git status` again independently; don't trust the dispatch's own
self-report of "clean." If `main` (or any branch) shows unexpected changes, treat it exactly like a
branch-verification failure: stop, report to Brian, resolve before doing anything else. Full incident
detail: `.cursor/orchestrate/roles.md` § Tinker.

### Pre-push / pre-PR CI parity check
Before running `git push` or opening a PR, run the same checks CI will run — don't let CI be the
first place a failure surfaces, which just means re-pushing to fix what could've been caught locally.
- `npm run type-check` and `npm run lint` — scope these to the files actually touched in the branch/PR
  (e.g. `git diff --name-only main...HEAD` fed into the lint command), not a whole-repo pass. A
  whole-repo run can surface pre-existing issues in files this branch never touched, which isn't this
  PR's problem to fix and just creates noise.
- **Migration drift check** — compare local `supabase/migrations/*.sql` against `list_migrations` on
  the live project. Flag anything local that isn't reflected upstream, or anything upstream the branch
  doesn't have, before it goes into a PR.
- **Edge function drift check** — compare the function source in the branch against what's actually
  deployed (`list_edge_functions` / `get_edge_function`). Don't let a PR silently assume a deployed
  function still matches git.
- **Migration idempotency (Carl's rule)** — any new migration must be safe to run twice without
  erroring or corrupting state (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded
  `DO $$ ... $$` blocks, etc.). This isn't just about current prod state — a non-idempotent migration
  is a direct conflict risk against Carl's own migration work landing around the same time. If a
  migration can't be made idempotent, flag it to Brian explicitly before pushing rather than shipping
  it silently.

If any check fails, fix it before pushing — don't push speculatively and let CI catch it.

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

## Living-doc workflow — multi-item, multi-session bodies of work

For any body of work with several distinct open items that need deciding across more than one sitting (bug investigations, feature planning, migration/audit work, etc.) — not just bug tracking:

1. Create a single living `.md` file **in the workspace root** (`/Users/khiansismundo/complyhubworkspace/`) as the one source of truth for that body of work.
2. Work through open items **one at a time** — investigate, discuss, reach a decision — rather than presenting a big batch task list.
3. Every locked decision gets **written into the file itself** (reasoning + concrete fix/implementation plan), not just stated in chat.
   - The decision text/wording still comes from me (Sonnet) — but the actual file write/append is delegated to a Haiku subagent via the Agent tool, since it's pure transcription with no judgment involved. Same applies to routine appends later in the session (adding another locked item, updating status). Scoped to this living-doc workflow only — doesn't apply to other doc writes (`complyhub-kb/reference/`, `complyhub-kb/pinned/`, etc.), which stay Sonnet.
4. Once every item is locked, a **brand-new chat with no prior context** should be able to read the file cold and go straight to implementation.
5. Once implementation is complete, Brian will separately ask for an audit file, and the working `.md` file gets **deleted** — it's disposable/session-scoped, never referenced by name in durable docs.

**Stale/contradictory content:** if a section in such a file is found to be stale or contradicts a later locked decision, flag it to Brian and ask permission before editing — never silently clean it up.

**Before commit/push/PR:** once a fresh chat implements the locked decisions on a `rto-compass-hub` branch, run the `cichecker` skill (`rto-compass-hub/.claude/skills/cichecker/SKILL.md`) first — it cross-references the branch's changed files against every check the real CI workflow runs, and confirms the branch is up to date with `main`. Read-only; only proceed to the commit/push/PR hard gates above once it reports clean.

---

## Trigger phrases → actions

Daily command reference (go to main, create branch, start local dev, build for vercel, check deploy,
load openrouter, etc.) lives in **`trigger-phrases.local.md`** (same folder) — not inlined here to
keep this always-loaded file smaller. Read that file directly the moment Brian uses one of those
phrases; don't pre-read it speculatively.

---

## AI orchestration — decision procedure (not just background)

**This section is an instruction to Claude Code, read fresh every session — not a glossary.** Every
task Brian gives, before acting, run this triage and say the plan out loud.

### The crew — all six callsigns are real from Claude Code

| Callsign | Job | Dispatched when |
|---|---|---|
| **Scout** | Read-only recon, maps a change before it's planned | Multi-file/ambiguous task, before planning |
| **Hound** | Root-cause tracer, never proposes a fix | Any bug report — mandatory, via `complyhub-bug-fix` skill step 3 |
| **Compass** | Planner, proposes 2-3 approaches with tradeoffs | Ambiguous/architectural task, after Scout maps it |
| **Maker** | Writes code, commits, pushes | Always Claude Code itself — **never delegated** |
| **Tinker** | Mechanical PR gauntlet (type-check/lint/dry-run-merge/banned-patterns) | Right before proposing a PR |
| **Sentinel** | Merge-gate verdict from diff + Tinker + Checker output | Final step before proposing commit/push |
| **Checker** | Adversarial fresh-eyes review, incl. live read-only DB | After any single/multi-complex edit, before calling it done |

**Two modes, switchable mid-conversation just by Brian saying so** (e.g. "go claude mode" / "back to
default") — no config file, no slash command:
- **Default mode** (current default) — all six run via `cursor-agent` (Cursor CLI, via WSL) subprocesses
  dispatched through `.cursor/orchestrate/dispatch.sh`, the cheap/quality-optimized model mix.
- **Claude mode** — no `cursor-agent`/WSL involved at all; each role runs as a genuine Claude Code Agent
  tool subagent (Haiku for Scout/Checker-DB-queries, Sonnet for Hound/Tinker, Opus for Compass/
  Sentinel/Checker-verdict), logged via `.cursor/orchestrate/log-agent-event.py` so the Agent Office UI
  still shows them as real, live characters.

Both modes are always read-only, never given edit access. Exact commands, prompt
templates, models, and gotchas: **`.cursor/orchestrate/roles.md`** — read it before the first dispatch
of a session. Full technical background: `complyhub-kb/reference/ai-model-routing.md`.

A localhost-only visual status board for this crew ("Agent Office" — pixel-art office, each callsign
as a character, live status dashboard) lives at `complyhub-kb/agent-office/` — start with `npm start`
from that folder, view at `http://localhost:4173`. Purely observational, doesn't affect dispatch.

**Supports multiple concurrent instances of the same role** (added 16 Jul 2026) — state is keyed by
`agent_id`, not role, so if Brian runs two chats in parallel (e.g. two Scouts, one per PR), both show
up as distinct characters/cards instead of one overwriting the other. Each instance is auto-labeled
with a short tag pulled from its task text (e.g. "PR #163" if present). No special handling needed on
dispatch — just make sure every dispatch (via `dispatch.sh` or `log-agent-event.py`) uses its own
unique `agent_id`, which both already do by construction. Full detail: `.cursor/orchestrate/roles.md`
§ "Agent Office" and `complyhub-kb/agent-office/server.js`/`public/client.js` comments.

### Step 1 — classify every incoming task

| Size | Definition | What happens |
|---|---|---|
| **Trivial** | typo, rename, doc tweak, one-liner, no logic/DB surface | I do it directly. No delegation, no announcement needed beyond normal work. |
| **Bug report** | "did X, isn't showing in Y", "broke after Z" | Mandatory `complyhub-bug-fix` skill → **Hound** traces root cause (step 3) → I plan (step 6, Brian approves) → I fix (step 7) → **Checker** reviews. |
| **Single** | one file, one clear logic change, no DB/RLS/auth surface | I edit directly, then run **one Checker pass** before calling it done. |
| **Multi/complex** | 2+ files, OR touches DB/RLS/auth/migrations/edge functions, OR ambiguous scope | **Scout** maps it → **Compass** proposes approaches (if genuinely ambiguous) → I plan + edit → **Checker** reviews (two-model consensus if DB/RLS/auth/migration). |
| **Pre-PR** | any change about to become a PR | **Tinker** (mechanical gauntlet) → **Sentinel** (merge verdict, weighs Tinker + Checker) → I propose commit/push to Brian. |
| **Reviewing existing/external PR(s)** | "review PR #X", multiple open PRs assigned, PR triage | **PR review mode** — see below. Always one PR at a time, one stage at a time, report-then-wait — never a background Workflow, never multiple PRs' agents running concurrently. |

### PR review mode (multiple assigned/external PRs) — added 16 Jul 2026

This is the standing default whenever Brian hands over one or more existing PR numbers to review —
not a one-off instruction to ask for each time. **Never launch this as a background `Workflow` script
and never run more than one PR through the crew at once** — a background Workflow already caused two
real incidents: agents ran invisibly because nothing called the office logger, and ~28 agents fired at
once with no checkpoint for Brian to review a report before the next stage spent tokens on it.

**Sequencing — one PR fully through the crew before starting the next:**
1. **Scout** maps the PR's changed files/symbols and blast radius (out-of-diff callers) → report to
   Brian → wait for go.
2. **Checker** reviews (see the 4 standing objectives below, live DB where relevant) → report → wait.
3. **Tinker** runs the mechanical gauntlet: type-check/lint/banned-patterns, AND a dry-run merge
   conflict check against `main` **and against every other PR in the same batch** (so cross-PR
   collisions like two PRs touching the same file surface early) — subject to the mandatory
   before/after `git status` verification in the hard gates section above. → report → wait.
4. **Sentinel** gives the final SHIP/NEEDS-WORK verdict, including a post-merge checklist (migrations
   to apply, edge functions to deploy, drift to verify) → report → wait, then move to the next PR.

**Standing Checker objectives for any PR review** (fold into the adversarial-review prompt every time,
not just when Brian lists them out):
1. **Regression check** — does this PR reintroduce something already fixed in a prior PR or session?
   Compare against current `main`, not just the PR's own diff.
2. **Conflict check** — with `main` and with every other PR in the same batch (Tinker's dry-run merge
   covers the mechanical side; Checker should also flag *logical* conflicts Tinker's git-level check
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

### Step 2 — state the plan, then wait

Before touching anything (except trivial tasks), say: the classification, what's being delegated (
which callsign(s)) and to which model, and the branch this lands on. Then **wait for Brian's
go-ahead** — same rule as the existing "always run the plan by Brian before making any change" gate
above. Only proceed immediately if Brian already said go in the same message.

Example:
> "This touches filtering logic + existing tenant data — classifying as multi/complex. Plan: **Scout**
> (`kimi-k2.7-code`, read-only) maps the current filter implementation and callers → I plan + edit on
> a `feat/*` branch → **Checker** (`kimi-k2.7-code`, read-only incl. live DB) reviews end-to-end before
> you commit. Want me to start with Scout?"

Checker/Hound output is **unverified suspects**, never acted on directly — I triage every finding
before doing anything about it, and I can point at the same file:line myself before treating a claim
as fact.

### Mid-loop re-entry

If any callsign or I hit a gap mid-task, say so and ask for the right next step rather than guessing —
cap 2 re-entries per phase, then stop and ask Brian.

### Parallel worktrees

Behind `main` is normal when another workflow merges first — catch up with `merge origin/main` on the
feature branch before landing the PR (not usually required just to push).

### Cursor desktop (alternate surface)

When driving from Cursor desktop directly instead of Claude Code, the same six callsigns apply via
Cursor's native Task tool with per-callsign `model` slugs instead of `dispatch.sh` — see
`.cursor/rules/ai-orchestration.mdc`. Same crew, same triage logic, different plumbing.

---

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
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
