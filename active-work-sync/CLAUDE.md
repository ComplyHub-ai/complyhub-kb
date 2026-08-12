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

- **Brian (Khian)** — developer / infrastructure lead
- **Carl** — infrastructure lead (owns `rto-compass-hub/CLAUDE.md`, CI guardrails, config.toml, edge function structure)
- **RJ** — app engineering lead (owns frontend patterns, hooks, component architecture)

- **Angela** — product 

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
├── rto-compass-hub/       ← codebase, worktree A
│   ├── CLAUDE.md          ← Carl's code rules — authoritative for all code decisions
│   ├── src/               ← React + TypeScript frontend (Vite)
│   ├── supabase/          ← Edge Functions, migrations, config.toml
│   └── .github/workflows/ ← CI guardrails
└── rto-compass-hub-worktree-b/  ← second checkout, worktree B — parallel task, separate chat
```

Both worktrees share one production Supabase project and one Vercel project — see "Two worktrees" under
AI orchestration below for the coordination rule. Full worktree workflow (parallel branches, teardown,
considerations): `complyhub-kb/reference/worktree-workflow.md`.

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
| `rto-compass-hub/` on `main` | Read-only — fetch and pull only, never edit or commit |
| `rto-compass-hub/` on any `feat/*` or `fix/*` branch | Edits and commits allowed — all new work goes through a branch + PR |
| `rto-compass-hub/` on any `cursor/*` branch | Edits and commits allowed — for PR review workflow only |

---

## Session start (mandatory first action)

1. `cd complyhub-kb && git pull --ff-only && cd ..`
2. Determine which worktree this chat owns (A: `rto-compass-hub`, B: `rto-compass-hub-worktree-b`) —
   check `active-work.md`'s worktree registry block first; if it doesn't already say and Brian hasn't
   stated it this session, ask before doing anything else. **One VS Code window with two chats is the
   normal setup — there is no environmental signal (like a different working directory) that tells one
   chat apart from the other, so this has to be asked/stated explicitly, every new chat, every time.**
   Once known, **immediately write the claim into the registry block** (worktree / branch / task /
   "since" timestamp) before any other work — this is the only channel the *other* chat has for knowing
   this worktree is in use, since sessions cannot see each other. Then pull using that worktree's
   absolute path (never a bare `cd` without it, and never assume the shell's cwd carried over from a
   prior turn): `cd <absolute path to worktree> && git fetch && git pull && cd ..`. Use that same
   absolute path for every git/file command for the rest of the session.
3. Report latest commits in both repos after pulling, and state which worktree this session is using.

If any pull fails: **STOP and report to Brian.** Do not resolve conflicts autonomously.

## Session boundary branch re-confirm

At the start of any session where there is active branch work in progress (i.e. a `fix/*` or `feat/*` branch exists locally or on the remote), run `git branch --show-current` in the worktree this session is using — before doing anything else — before reading files, before diagnosing, before any command. Report the active worktree and branch to Brian at the top of the session so it is visible and agreed before work begins. Do not rely on memory from a previous session — the checkout may have silently reset to `main`.

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

### Verify `main` is clean before AND after any dry-run merge / Reviewer dispatch
An interrupted Workflow once left `rto-compass-hub/main` genuinely dirty (staged/modified files from
a PR) because the `git merge --abort` after a Reviewer-style dry-run merge (this was the old Tinker
role, since absorbed into Reviewer) never ran — the process was killed between the merge and the abort,
with no automatic recovery. Nothing was committed/pushed, but this is a real, repeatable risk, not a
one-off. Before dispatching Reviewer's mechanical pass (or running the "check conflicts" dry-run merge
manually), confirm `git status` is clean first. After it returns — success, error, or interrupted —
check `git status` again independently; don't trust the dispatch's own self-report of "clean." If
`main` (or any branch) shows unexpected changes, treat it exactly like a branch-verification failure:
stop, report to Brian, resolve before doing anything else. Full incident detail:
`.cursor/orchestrate/roles.md` § "Known incident".

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
- **Before any `CREATE OR REPLACE FUNCTION`/`VIEW`, use `git log -S "<name>"` (content search), never `git log -- '*<name>*'` (filename search)** — confirmed 30 Jul 2026 (PR #329) that a filename search misses batch migrations named after a ticket rather than the function, and silently reverting a later fix (stale `mark_suggestion_viewed`) got past me into committed code before a Cursor bot caught it. Full incident: `rto-compass-hub/supabase/migrations/CLAUDE.md` § "check git history first".
- **Confirm with Brian before acting** on anything that touches `main`, CI config, `config.toml`, or `supabase/migrations/` — surface intent and wait for explicit approval.
- **Do not create new guardrail files** inside `rto-compass-hub/` without Brian explicitly asking.
- **Never commit or push** to `main` in `rto-compass-hub/`.
- **When Brian asks "what should I do next"**, check `rto-compass-hub/TODO.md` and `rto-compass-hub/.lovable/plan.md` for current task context before suggesting anything.
- **Present options, don't hand off.** If a task requires architectural judgement, surface the options and tradeoffs to Brian — do not defer to Carl, RJ, Dave, or anyone else. Brian works across all roles and makes the call.
- **Always give UI-based navigation instructions.** Describe the click path, not raw URLs. Reference `complyhub-kb/reference/ui-navigation.md` for the correct sidebar structure (Administrator role view — state role caveats when relevant).

---

## Living-doc workflow — multi-item, multi-session bodies of work

For any body of work with several distinct open items that need deciding across more than one sitting (bug investigations, feature planning, migration/audit work, etc.) — not just bug tracking:

1. Create a single living `.md` file **in the workspace root** as the one source of truth for that body of work.
2. Work through open items **one at a time** — investigate, discuss, reach a decision — rather than presenting a big batch task list.
3. Every locked decision gets **written into the file itself** (reasoning + concrete fix/implementation plan), not just stated in chat.
   - The decision text/wording still comes from me (Sonnet) — but the actual file write/append is delegated to a Haiku subagent via the Agent tool, since it's pure transcription with no judgment involved. Same applies to routine appends later in the session (adding another locked item, updating status). Scoped to this living-doc workflow only — doesn't apply to other doc writes (`complyhub-kb/reference/`, `complyhub-kb/pinned/`, etc.), which stay Sonnet.
4. Once every item is locked, a **brand-new chat with no prior context** should be able to read the file cold and go straight to implementation.
5. Once implementation is complete, Brian will separately ask for an audit file, and the working `.md` file gets **deleted** — it's disposable/session-scoped, never referenced by name in durable docs.

**Stale/contradictory content:** if a section in such a file is found to be stale or contradicts a later locked decision, flag it to Brian and ask permission before editing — never silently clean it up.

**Before commit/push/PR:** once a fresh chat implements the locked decisions on a `rto-compass-hub` branch, run the `ci-gate` skill (user-level skill) first — it cross-references the branch's changed files against every check the real CI workflow runs, and confirms the branch is up to date with `main`. Read-only; only proceed to the commit/push/PR hard gates above once it reports clean.

**"fresh-eyes" — a separate skill.** When Brian says "fresh-eyes" (e.g. "spawn fresh-eyes", "run fresh-eyes on this"), run the `fresh-eyes` skill (user-level skill) — a fresh-eyes adversarial reviewer with no memory of this conversation, spawned as a genuine Claude Agent subagent against the whole branch (not just diff hunks), including live-DB verification of any RPC/RLS/edge-function it touches. `ci-gate` is the mechanical CI-parity gate (lint/type-check/guards); `fresh-eyes` is the human-shaped "does this actually hang together" review. Different names, different skills — don't conflate them.

**Note:** `rto-compass-hub/.claude/skills/checker/SKILL.md` is a stale, erroneously-committed copy of the old `checker` skill, pushed directly to `main` before this rename. It has NOT been renamed or removed — that requires a proper `fix/*` branch + PR, not a direct edit to `main`. Don't treat it as current; the user-level `fresh-eyes` skill above is the real one.

---

## Trigger phrases → actions

Daily command reference (go to main, create branch, start local dev, build for vercel, check deploy,
load openrouter, etc.) lives in **`trigger-phrases.local.md`** (same folder) — not inlined here to
keep this always-loaded file smaller. Read that file directly the moment Brian uses one of those
phrases; don't pre-read it speculatively.

---

## The Loop — orchestration decision procedure (not just background)

**This section is an instruction to Claude Code, read fresh every session — not a glossary.** Every
task Brian gives, before acting, run this triage and say the plan out loud.

Collapsed 20 Jul 2026 from six named callsigns to **three agents** — too many roles to hold in his
head, and it caused inconsistency about who was allowed to fix a bug. One flow: **FRAME → RECON →
PLAN → MAKE → CHECK → SHIP.** One ledger: `active-work.md` at the workspace root — source of truth for
worktree/branch/stage plus the parked backlog. One rule: the Scope Line (below).

### The three agents

| Agent | Absorbs (retired names) | Job | Ever edits/commits? |
|---|---|---|---|
| **Scout** | Scout + Hound + Compass | Read-only recon: maps the change, traces root cause on a bug report, sketches 2-3 approaches if the task is genuinely ambiguous — all in one pass | Never |
| **Fixer** | Maker | Plans + writes the fix + commits/pushes | **Always Claude Code itself — never delegated** |
| **Reviewer** | Checker + Tinker + Sentinel | Adversarial fresh-eyes review (incl. live read-only DB) + mechanical gauntlet (type-check/lint/dry-run-merge/banned-patterns) + final SHIP/NEEDS-WORK verdict — all in one pass | Never |

**Who fixes bugs — always Fixer, i.e. Claude Code itself.** Scout and Reviewer only ever report. If a
task seems to need a fourth role, that's a sign the current Scout or Reviewer pass needs to cover more
ground in one dispatch — not a reason to bring back a retired name.

**No AskUserQuestion popups for routine flow.** State the call in prose and proceed (state-and-proceed);
Brian redirects if wrong. The commit/push hard gates above are still absolute and separate from this.

**Two engines, one switch** — both read-only, never given edit access:
- **Claude mode** (default when tokens are healthy) — Scout/Reviewer run as genuine Claude Code Agent
  tool subagents.
- **Cursor CLI mode** — a first-class token-budget handoff, kept deliberately (not removed) for when
  Brian is close to running out of tokens; dispatched via `.cursor/orchestrate/dispatch.sh`. Switchable
  mid-conversation just by Brian saying so ("go claude mode" / "cursor mode") — no config file, no
  slash command.

Exact commands, prompt templates, models, and gotchas for both engines:
**`.cursor/orchestrate/roles.md`** — read it before the first dispatch of a session. Historical
background on why this shape was chosen: `complyhub-kb/reference/ai-model-routing.md`.

### ⛔ Mandatory Scope Line — every Scout/Reviewer dispatch

The #1 cause of rabbit holes and wasted tokens is an unbounded sub-agent that keeps digging past what
it was asked. At FRAME, state what's IN and OUT. Every Scout/Reviewer prompt must end with:

```
SCOPE: <exactly what to look at — the one task>. OUT OF SCOPE: everything else.
BOUNDARY: Report findings and STOP. Do NOT investigate beyond SCOPE. Do NOT propose or write fixes.
If you notice something outside SCOPE, list it under a "PARKED (out of scope)" heading in one line
each — do not chase it.
```

Anything found outside scope goes to `active-work.md` Backlog — never chased in the current task. Scope
only expands via a new FRAME. **A finding beat (Scout/Reviewer) never fixes — it reports; Fixer edits.**
No "just have Scout fix it" shortcut. Scout/Reviewer output is **unverified suspects**, never acted on
directly — triage every finding before doing anything about it.

### Step 1 — classify every incoming task

| Size | Definition | What happens |
|---|---|---|
| **Trivial** | typo, rename, doc tweak, one-liner, no logic/DB surface | I do it directly. No delegation, no announcement needed beyond normal work. |
| **Bug report** | "did X, isn't showing in Y", "broke after Z" | Mandatory `complyhub-bug-fix` skill → **Scout** traces root cause → I plan (Brian approves) → I fix (Fixer) → **Reviewer** checks. |
| **Single** | one file, one clear logic change, no DB/RLS/auth surface | I edit directly, then run **one Reviewer pass** before calling it done. |
| **Multi/complex** | 2+ files, OR touches DB/RLS/auth/migrations/edge functions, OR ambiguous scope | **Scout** maps it and sketches approaches if genuinely ambiguous → I plan + edit → **Reviewer** checks (two-model consensus if DB/RLS/auth/migration). |
| **Pre-PR** | any change about to become a PR | **Reviewer** runs the full gauntlet (mechanical checks + merge verdict) → I propose commit/push to Brian. |
| **Reviewing existing/external PR(s)** | "review PR #X", multiple open PRs assigned, PR triage | **PR review mode** — see below. Always one PR at a time, one stage at a time, report-then-wait — never a background Workflow, never multiple PRs' agents running concurrently. |

### PR review mode (multiple assigned/external PRs)

This is the standing default whenever Brian hands over one or more existing PR numbers to review —
not a one-off instruction to ask for each time. **Never launch this as a background `Workflow` script
and never run more than one PR through the flow at once** — a background Workflow already caused two
real incidents: agents ran invisibly because nothing called the office logger, and ~28 agents fired at
once with no checkpoint for Brian to review a report before the next stage spent tokens on it.

**Sequencing — one PR fully through the flow before starting the next:**
1. **Scout** maps the PR's changed files/symbols and blast radius (out-of-diff callers) → report to
   Brian → wait for go.
2. **Reviewer** reviews (see the 4 standing objectives below, live DB where relevant) → report → wait.
3. **Reviewer** (mechanical pass) runs type-check/lint/banned-patterns, AND a dry-run merge conflict
   check against `main` **and against every other PR in the same batch** (so cross-PR collisions like
   two PRs touching the same file surface early) — subject to the mandatory before/after `git status`
   verification in the hard gates section above. → report → wait.
4. **Reviewer** gives the final SHIP/NEEDS-WORK verdict, including a post-merge checklist (migrations
   to apply, edge functions to deploy, drift to verify) → report → wait, then move to the next PR.

**Standing Reviewer objectives for any PR review** (fold into the adversarial-review prompt every time,
not just when Brian lists them out):
1. **Regression check** — does this PR reintroduce something already fixed in a prior PR or session?
   Compare against current `main`, not just the PR's own diff.
2. **Conflict check** — with `main` and with every other PR in the same batch (the mechanical dry-run
   merge covers the git-level side; also flag *logical* conflicts a textual merge can't see, e.g. two
   PRs changing the same behavior differently without a textual merge conflict).
3. **Migrations/edge functions** — does the PR include any? If so, note explicitly what must happen
   **after merge**: apply the migration to production (never auto-applied by merge), deploy the edge
   function, and check for schema drift (compare the PR's migration against what's already live —
   don't assume the PR's `.sql` file matches production state).
4. **Bug scan** — incomplete fixes, wrong fixes, and blast radius (does it break something outside the
   diff Scout already mapped).

Default to **Claude mode** for PR review batches unless Brian says otherwise. See
`.cursor/orchestrate/roles.md` § PR review mode for the exact per-stage prompts.

### Step 2 — state the plan, then wait

Before touching anything (except trivial tasks), say: the classification, what's being delegated (
Scout or Reviewer) and to which engine, and the branch this lands on. Then **wait for Brian's
go-ahead** — same rule as the existing "always run the plan by Brian before making any change" gate
above. Only proceed immediately if Brian already said go in the same message.

Example:
> "This touches filtering logic + existing tenant data — classifying as multi/complex. Plan: **Scout**
> (Claude mode, read-only) maps the current filter implementation and callers → I plan + edit on a
> `feat/*` branch → **Reviewer** (Claude mode, read-only incl. live DB) checks end-to-end before you
> commit. Want me to start with Scout?"

### Mid-loop re-entry

If Scout, Reviewer, or I hit a gap mid-task, say so and ask for the right next step rather than
guessing — cap 2 re-entries per phase, then stop and ask Brian.

### Two worktrees — parallel work, one shared backend

The workspace runs two parallel checkouts of `rto-compass-hub` so two tasks (in two separate chats) can
be in flight at once:

- **Worktree A** — `rto-compass-hub/`
- **Worktree B** — `rto-compass-hub-worktree-b/`

**No separate VS Code window per worktree is required or expected.** One window, two chat tabs is the
normal setup — each chat is its own independent session (own conversation, own tool state, own Bash
working directory) regardless of how many windows are open. Two chats cannot see each other directly —
there is no channel between sessions, and no environmental signal that tells one apart from the other.
Coordination works through two layers instead:

1. **Git is ground truth.** `git worktree list` plus `git branch --show-current` in each worktree gives
   the live, authoritative picture of what's checked out where. Git also physically refuses to check
   out the same branch in two worktrees at once — a free hard interlock. Run `git worktree prune` first
   if a check needs to trust the list (stale entries for deleted folders linger otherwise).
2. **`active-work.md`'s worktree registry block is the only channel between chats** — which chat claims
   which worktree, on what task, since when. Written immediately once a chat's worktree is known (see
   Session start above), advisory intent on top of git: where the ledger and git disagree, git wins.
   Before claiming a worktree for a new branch: check the registry block, `git status` (dirty-at-claim
   carries strays into the new branch — stop and ask Brian if it's dirty and not archived), and that
   the claim isn't stale (verify against `git status`/last-commit time before trusting a claim older
   than a day). Release the claim back to unclaimed when the task finishes or pauses for the day.

**One database job at a time — hard rule, not a preference.** Both worktrees share one production
Supabase project, one Vercel project, and one `config.toml`. Parallel is safe for frontend-only work.
It is NOT safe for two simultaneous migration or edge-function tasks — filename-version ordering and
the interim `execute_sql`-then-`migration repair` procedure both assume one mutator at a time. If one
worktree is mid migration/edge-function work, the other worktree takes frontend-only work until it
ships.

**Session start applies per-chat, not per-window:** each chat determines and declares its own worktree
per the Session start procedure above — never assume a chat is on worktree A by default just because
that's the first-listed one.

**Reviewer's conflict check must widen** when two worktrees are both active: dry-run merge against the
other worktree's branch too, not just `main`.

Full detail: `complyhub-kb/reference/worktree-workflow.md`.

### Cursor desktop (alternate surface)

When driving from Cursor desktop directly instead of Claude Code, the same three agents apply via
Cursor's native Task tool with per-agent `model` slugs instead of `dispatch.sh` — see
`.cursor/rules/ai-orchestration.mdc`. Same agents, same triage logic, different plumbing.

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
| on demand | `.cursor/orchestrate/roles.md` | **Read before first Scout/Reviewer dispatch each session** — exact commands, prompt templates, model choices, gotchas |
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
