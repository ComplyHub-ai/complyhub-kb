# AGENTS.md — Brian (Khian) Personal Workspace Config (Codex)

> Personal to Brian (Khian). Auto-loaded every Codex session in this workspace. Kept lean — identity,
> hard safety gates, and the orchestration decision procedure only.
> Trigger-phrase command reference: `trigger-phrases.local.md` (read on-demand, not auto-loaded).
> `complyhub-kb/pinned/*.md` is auto-loaded every session via a SessionStart hook — see
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
├── AGENTS.md              ← this file (personal, auto-loaded every session)
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
└── rto-compass-hub-worktree-b/  ← second checkout, worktree B — parallel task, separate session
```

Both worktrees share one production Supabase project and one Vercel project — see "Two worktrees" under
orchestration below for the coordination rule. Full worktree workflow: `complyhub-kb/reference/worktree-workflow.md`.

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
2. Determine which worktree this session owns (A: `rto-compass-hub`, B: `rto-compass-hub-worktree-b`, C: `rto-compass-hub-C`) — check `active-work.md`'s worktree registry block first; if unclear and Brian hasn't stated it this session, ask before doing anything else. Multiple sessions can be running side by side — there is no environmental signal distinguishing them, so this must be asked/stated every new session. Once known, immediately write the claim into the registry block (worktree / branch / task / "since") before any other work. Then pull using that worktree's absolute path (never a bare `cd`, never assume cwd carried over): `cd <absolute path to worktree> && git fetch && git pull && cd ..`. Use that same absolute path for every git/file command for the rest of the session.
3. Report latest commits in both repos after pulling, and state which worktree this session is using.

If any pull fails: **STOP and report to Brian.** Do not resolve conflicts autonomously.

## Session boundary branch re-confirm

At the start of any session with active branch work (`fix/*`/`feat/*` exists locally or remote), run `git branch --show-current` in the worktree this session is using — before reading files, before diagnosing, before any other command. Report the active worktree and branch to Brian at the top of the session. Do not rely on memory from a previous session — the checkout may have silently reset to `main`.

---

## ⛔ Hard gates — never violate these

### Commit/push gates
> **NEVER RUN `git commit` OR `git push` UNLESS BRIAN EXPLICITLY SAYS SO.**
> - **Commit words:** "commit it", "commit that", "go ahead and commit", "commit now"
> - **Push words:** "push it", "go ahead and push", "push now"
> "yes", "do it", "approved", "make the fix", "apply it" — NONE of these mean commit or push. They only mean make the file edit.
> If in doubt: make the edit, stop, tell Brian what was changed, and WAIT for explicit commit instruction.
> Approving an edit ≠ approving a commit. Approving a commit ≠ approving a push. Three separate gates.

> **ALWAYS run the plan by Brian BEFORE making any change** — even to local staging files, even outside the repo. Describe what you intend to change, which file, and why. Wait for explicit approval before touching anything.

### Branch verification — mandatory before every commit and push
> **BEFORE running `git commit` OR `git push`, always run `git branch --show-current` first.**
> Confirm the output matches the expected feature branch. If it shows `main` or anything unexpected — **STOP immediately. Report to Brian and resolve the branch state first.**
> Session resets can silently revert the checkout to `main` without warning. Never assume the branch is correct — verify it every time.

### Never run `npm run build`
`npm run build` hangs Brian's workstation. Do not run it for any reason. To verify code correctness, use `npm run type-check` and `npm run lint` (both fast). If both pass, the change is safe to commit and push — Vercel is the real build gate. After a push, use `list_deployments` (`complyhub-kb/reference/vercel-mcp.md`) to confirm deploy `state`, and pull `get_deployment_build_logs` if it errors.

**`npm run type-check` is vacuous — do not trust a clean result from it.** `rto-compass-hub`'s root `tsconfig.json` is solution-style (`files: []` with project references), so plain `tsc --noEmit` silently checks zero files. The correct check (`npx tsc --build tsconfig.app.json --noEmit`) is a full whole-codebase compile with the same hang risk as `npm run build` — **never run it speculatively.** For a normal-sized change: rely on `npm run lint` + manual review of the diff's type surface, and let Vercel's build be the real gate. Full incident detail: `complyhub-kb/pinned/conventions.md`.

### Applying migrations to production — `supabase db push` only, never `apply_migration`
`apply_migration` does not respect a migration file's `YYYYMMDDHHmmss` filename version — it records under a freshly generated version instead, creating a git/production ledger mismatch. **Never use `apply_migration` to deploy anything that already exists as a file in `supabase/migrations/`.** It's fine only for one-off exploratory SQL with no corresponding file. Full detail + the current interim procedure (production ledger drift means `supabase db push` itself is temporarily unusable): `supabase/migrations/CLAUDE.md` and `complyhub-kb/reference/diagnosis-discipline.md`.

### Verify `main` is clean before AND after any dry-run merge / review dispatch
Before dispatching a mechanical review pass (or running a "check conflicts" dry-run merge manually), confirm `git status` is clean first — check independently again after, don't trust the dispatch's own self-report. If `main` (or any branch) shows unexpected changes, treat it like a branch-verification failure: stop, report to Brian, resolve before anything else. Incident detail: `.cursor/orchestrate/roles.md` § "Known incident".

### Pre-push / pre-PR CI parity check
Before `git push` or opening a PR, run what CI will run:
- `npm run lint` scoped to files actually touched in the branch (`git diff --name-only main...HEAD`) — not a whole-repo pass. Do **not** run `npm run type-check` or the full `tsc --build` (vacuous / hang risk, see above).
- **Migration drift check** — compare local `supabase/migrations/*.sql` against `list_migrations` on the live project.
- **Edge function drift check** — compare branch source against `list_edge_functions` / `get_edge_function`.
- **Migration idempotency** — any new migration must be safe to run twice (`IF NOT EXISTS`, guarded `DO $$` blocks). Flag to Brian explicitly if it can't be made idempotent.

If any check fails, fix it before pushing.

### Plain English — always, not on request
After any technical audit, diagnosis, or fix explanation, always follow immediately with a plain English version — no jargon, no file paths, no code — as if explaining to a non-developer, without waiting to be asked.

### Never assume — always verify
Never rely on memory, prior session context, or past observations as ground truth. Verify current state directly: file content → read it; DB state → query via MCP; migration status → `list_migrations`; branch → `git branch --show-current`; config → read `config.toml`. If something could have changed since last observed, treat it as unknown until verified.

### My guardrails
- Always check `rto-compass-hub/CLAUDE.md` first before suggesting any code pattern, file structure, or database change.
- Always check `rto-compass-hub/supabase/migrations/CLAUDE.md` first (read fresh, not from memory) before writing any migration file.
- Before any `CREATE OR REPLACE FUNCTION`/`VIEW`, use `git log -S "<name>"` (content search), never `git log -- '*<name>*'` (filename search) — a filename search can miss batch migrations named after a ticket rather than the function. Full incident: `rto-compass-hub/supabase/migrations/CLAUDE.md` § "check git history first".
- Confirm with Brian before acting on anything touching `main`, CI config, `config.toml`, or `supabase/migrations/`.
- Do not create new guardrail files inside `rto-compass-hub/` without Brian explicitly asking.
- Never commit or push to `main` in `rto-compass-hub/`.
- When Brian asks "what should I do next", check `rto-compass-hub/TODO.md` and `rto-compass-hub/.lovable/plan.md` first.
- Present options, don't hand off. Architectural judgement calls go to Brian, not Carl/RJ/Dave — Brian works across all roles.
- Always give UI-based navigation instructions (click path, not raw URLs) — reference `complyhub-kb/reference/ui-navigation.md`.

---

## Living-doc workflow — multi-item, multi-session bodies of work

For any body of work with several distinct open items needing decisions across more than one sitting:

1. Create a single living `.md` file in the workspace root as the source of truth.
2. Work through open items one at a time — investigate, discuss, decide — not a big batch task list.
3. Every locked decision gets written into the file itself (reasoning + concrete plan).
4. Once every item is locked, a brand-new session with no prior context should be able to read the file cold and go straight to implementation.
5. Once implementation is complete, Brian will separately ask for an audit file, and the working `.md` file gets deleted — disposable/session-scoped, never referenced by name in durable docs.

**Stale/contradictory content:** flag to Brian and ask permission before editing — never silently clean it up.

**Before commit/push/PR:** run the `ci-gate` skill first if available in this session's toolset (read-only) — proceed to the hard gates above only once it reports clean.

**"fresh-eyes"** is a separate review pass — a fresh, no-prior-context adversarial reviewer against the whole branch, including live-DB verification. `ci-gate` is mechanical CI-parity; `fresh-eyes` is the "does this actually hang together" review.

**Note:** `rto-compass-hub/.claude/skills/checker/SKILL.md` is a stale, erroneously-committed copy of an old skill on `main`. Not current — don't treat it as such.

---

## Trigger phrases → actions

Daily command reference lives in `trigger-phrases.local.md` (same folder) — read it directly when Brian uses one of those phrases; don't pre-read it speculatively.

---

## The Loop — orchestration decision procedure (not just background)

**This section is an instruction to Codex, read fresh every session.** Every task Brian gives, before acting, run this triage and say the plan out loud.

One flow: **FRAME → RECON → PLAN → MAKE → CHECK → SHIP.** One ledger: `active-work.md` at the workspace root. One rule: the Scope Line (below).

### The three agents

| Agent | Job | Ever edits/commits? |
|---|---|---|
| **Scout** | Read-only recon: maps the change, traces root cause on a bug report, sketches 2-3 approaches if genuinely ambiguous — all in one pass | Never |
| **Fixer** | Plans + writes the fix + commits/pushes | **Always the primary session itself — never delegated** |
| **Reviewer** | Adversarial fresh-eyes review (incl. live read-only DB) + mechanical gauntlet (type-check/lint/dry-run-merge/banned-patterns) + final SHIP/NEEDS-WORK verdict | Never |

**Who fixes bugs — always Fixer, i.e. this session itself.** Scout and Reviewer only ever report. If a task seems to need a fourth role, that's a sign the current Scout or Reviewer pass needs to cover more ground in one dispatch.

**No popup-style clarifying questions for routine flow.** State the call in prose and proceed; Brian redirects if wrong. Commit/push hard gates above still absolute.

**Two engines, one switch** — both read-only, never given edit access:
- **Codex mode** (default) — Scout/Reviewer run as read-only subagent dispatches within this session.
- **Cursor CLI mode** — token-budget handoff for when Brian is close to running out of tokens; dispatched via `.cursor/orchestrate/dispatch.sh`. Switchable mid-conversation just by Brian saying so.

Exact commands, prompt templates, models: `.cursor/orchestrate/roles.md` — read before the first dispatch of a session. Background: `complyhub-kb/reference/ai-model-routing.md`.

### AI Engineering Director layer

Before substantial work, the primary session acts as AI Engineering Director. This is a routing and risk-control layer over the existing Scout/Fixer/Reviewer loop, not a new committee and not a replacement for the hard gates.

The Director must:
- classify the task tier
- state IN SCOPE and OUT OF SCOPE
- select only relevant specialists
- decide whether Scout/Reviewer are required
- require current-state facts before design
- produce a plain-English plan first
- define acceptance criteria and verification evidence
- optimize for fewer total passes, not more discussion

Specialists challenge only their domain and do not implement. Scout remains read-only. Fixer remains the primary session. Reviewer verifies against the approved plan.

Do not activate a full council by default. Use specialists only when the task risk requires them. Detailed procedure: `complyhub-kb/reference/ai-engineering-director.md` and `complyhub-kb/handoffs/engineering-director-task-flow.md`.

### Codex weekly limit / usage control

Brian's weekly Codex limit can drain quickly even on light models because agentic work counts more than visible replies: large startup instructions, repo reads, tool output, diffs, logs, subagents, and repeated verification loops all add usage.

Default to usage-aware execution:
- Keep each task narrowly scoped; start a fresh task for a new unrelated goal.
- Do not run Scout, Reviewer, fresh-eyes, or other subagents unless the classification above actually calls for them or Brian asks for them.
- Keep terminal output bounded. Prefer summaries, targeted `rg`, small file windows, and scoped diffs over dumping full logs or broad repo scans.
- Avoid repeated full-repo searches or large context reads when a precise file/symbol search will answer the question.
- Save heavier review passes, multi-agent consensus, and live-service verification for real risk gates: DB/RLS/auth/migrations/edge functions, pre-PR, pre-merge, or explicit review requests.
- For simple questions, answer directly from already-loaded context when safe; if current verification is needed, do the smallest read that proves the point.

### ⛔ Mandatory Scope Line — every Scout/Reviewer dispatch

At FRAME, state what's IN and OUT. Every Scout/Reviewer prompt must end with:

```
SCOPE: <exactly what to look at — the one task>. OUT OF SCOPE: everything else.
BOUNDARY: Report findings and STOP. Do NOT investigate beyond SCOPE. Do NOT propose or write fixes.
If you notice something outside SCOPE, list it under a "PARKED (out of scope)" heading in one line
each — do not chase it.
```

Anything found outside scope goes to `active-work.md` Backlog. Scope only expands via a new FRAME. A finding beat (Scout/Reviewer) never fixes — it reports; Fixer edits. Scout/Reviewer output is unverified suspects — triage every finding before acting on it.

### Step 1 — classify every incoming task

| Size | Definition | What happens |
|---|---|---|
| **Trivial** | typo, rename, doc tweak, one-liner, no logic/DB surface | I do it directly. |
| **Bug report** | "did X, isn't showing in Y", "broke after Z" | Mandatory `complyhub-bug-fix` procedure → Scout traces root cause → I plan (Brian approves) → Fixer fixes → Reviewer checks. |
| **Single** | one file, one clear logic change, no DB/RLS/auth surface | I edit directly, then one Reviewer pass. |
| **Multi/complex** | 2+ files, OR touches DB/RLS/auth/migrations/edge functions, OR ambiguous scope | Scout maps it (+ sketches approaches if ambiguous) → I plan + edit → Reviewer checks (two-model consensus if DB/RLS/auth/migration). |
| **Pre-PR** | any change about to become a PR | Reviewer runs the full gauntlet → I propose commit/push to Brian. |
| **Reviewing existing/external PR(s)** | "review PR #X", multiple open PRs assigned | PR review mode (below) — always one PR at a time, one stage at a time, report-then-wait — never a background batch job, never multiple PRs' work running concurrently. |

### PR review mode (multiple assigned/external PRs)

Standing default whenever Brian hands over existing PR number(s). **Never run this as an unattended background batch; never run more than one PR through the flow at once** — an unattended batch run already caused real incidents elsewhere in this workspace (invisible progress, work firing off with no checkpoint for Brian to review a report before the next stage spent effort on it).

**Sequencing — one PR fully through the flow before starting the next:**
1. **Scout** maps changed files/symbols and blast radius → report → wait.
2. **Reviewer** reviews (4 standing objectives below, live DB where relevant) → report → wait.
3. **Reviewer** (mechanical pass) runs type-check/lint/banned-patterns + dry-run merge check against `main` and every other PR in the batch — subject to the `git status` before/after gate above → report → wait.
4. **Reviewer** gives final SHIP/NEEDS-WORK verdict + post-merge checklist (migrations, edge functions, drift) → report → wait, then next PR.

**Standing Reviewer objectives for any PR review:**
1. **Regression check** — does this reintroduce something already fixed elsewhere? Compare against current `main`.
2. **Conflict check** — with `main` and every other PR in the batch; flag logical conflicts a textual merge can't see.
3. **Migrations/edge functions** — note what must happen after merge: apply migration to production, deploy edge function, check schema drift against what's live.
4. **Bug scan** — incomplete/wrong fixes, blast radius outside the diff Scout mapped.

Exact per-stage prompts: `.cursor/orchestrate/roles.md` § PR review mode.

### Step 2 — state the plan, then wait

Before touching anything (except trivial tasks), say: classification, what's delegated (Scout/Reviewer) and to which engine, and the branch this lands on. Then wait for Brian's go-ahead — only proceed immediately if he already said go in the same message.

### Mid-loop re-entry

If Scout, Reviewer, or I hit a gap mid-task, say so and ask for the right next step rather than guessing — cap 2 re-entries per phase, then stop and ask Brian.

### Two worktrees — parallel work, one shared backend

Two parallel checkouts of `rto-compass-hub` (worktree A: `rto-compass-hub/`, worktree B: `rto-compass-hub-worktree-b/`) so two tasks can be in flight at once in separate sessions. Each session is its own independent run with no channel to the other.

Coordination works through two layers:
1. **Git is ground truth** — `git worktree list` + `git branch --show-current` gives the live picture; git also refuses to check out the same branch in two worktrees at once. Run `git worktree prune` first if trusting the list.
2. **`active-work.md`'s worktree registry block** is the only channel between sessions — which session claims which worktree, on what task, since when. Where the ledger and git disagree, git wins. Before claiming: check the registry, `git status` (stop and ask Brian if dirty and not archived), and that the claim isn't stale (verify against last-commit time if older than a day).

**Only two writes to the registry per worktree lifecycle:**
- **On claim** (branch first created): set `Claimed by` / `Branch` / `Task` / `Since`.
- **On teardown** (work merged to `main`, branch done): confirm `git status` clean → `git fetch origin main` → if `main` isn't checked out elsewhere, `git checkout main && git pull --ff-only` and release the row to unclaimed; if `main` is checked out elsewhere, go to that worktree's standby branch instead (`git checkout standby/worktree-<X>`, `git reset --hard origin/main`) and mark the row accordingly. If the fetch fails, don't force anything — mark the row `unclaimed (fetch failed, still on <branch>)` and report to Brian. Claim new work off `origin/main` fresh, never build long-term on the standby branch itself.

Nothing in between (intermediate commits, WIP pushes) touches the registry.

**One database job at a time — hard rule.** Both worktrees share one production Supabase project, one Vercel project, one `config.toml`. Parallel is safe for frontend-only work, never for two simultaneous migration/edge-function tasks. If one worktree is mid migration/edge-function work, the other takes frontend-only work until it ships.

**Session start applies per-session, not per-window** — each session determines its own worktree per the Session start procedure, never assume worktree A by default.

**Reviewer's conflict check must widen** when two worktrees are both active: dry-run merge against the other worktree's branch too, not just `main`.

Full detail: `complyhub-kb/reference/worktree-workflow.md`.

---

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
| 1 | `rto-compass-hub/CLAUDE.md` | Carl's code rules — authoritative |
| 2 | `complyhub-kb/pinned/guardrails.md` | Write rules, entity routing, confidentiality (auto-loaded via SessionStart hook) |
| 3 | `complyhub-kb/pinned/session-protocol.md` | Session ritual, token efficiency (auto-loaded) |
| 4 | `complyhub-kb/pinned/conventions.md` | Migration/DB discipline, RLS, Edge Functions, unit test expectations (summary auto-loaded, read in full for migration/RLS/storage/testing work) |
| 5 | `complyhub-kb/pinned/decisions.md` | Architectural/product decisions log (summary auto-loaded, read in full before filing a bug that might be by-design) |
| 6 | `complyhub-kb/README.md` | KB orientation |
| on demand | `trigger-phrases.local.md` | Daily command reference |
| on demand | `complyhub-kb/reference/ai-model-routing.md` | Orchestrator role matrix + cursor-agent shell-out background |
| on demand | `.cursor/orchestrate/roles.md` | Read before first Scout/Reviewer dispatch each session — exact commands, prompt templates, model choices, gotchas |
| on demand | `complyhub-kb/reference/worktree-workflow.md` | Parallel worktree workflow |
| on demand | `complyhub-kb/reference/supabase-mcp.md` | Supabase MCP usage rules |
| on demand | `complyhub-kb/reference/vercel-mcp.md` | Vercel MCP usage rules |
| on demand | `complyhub-kb/reference/diagnosis-discipline.md` | Bug-tracing discipline, incident lessons |
| on demand | `complyhub-kb/reference/db-schema-cheatsheet.md` | Live DB schema snapshot |
| on demand | `complyhub-kb/reference/edge-functions-map.md` | Edge function catalog |
| on demand | `complyhub-kb/handoffs/pr-review-fix-workflow.md` | PR review + fix workflow, post-merge checklist |
| on demand | `complyhub-kb/handoffs/context-doc-handover.md` | Context-md + handover workflow |
| on demand | `complyhub-kb/handoffs/` (other) | Scenario procedures |
| on demand | `complyhub-kb/reference/` (other) | Deep reference docs |
