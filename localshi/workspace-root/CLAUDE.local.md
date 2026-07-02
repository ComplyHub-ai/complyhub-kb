# CLAUDE.local.md — Brian (Khian) Personal Workspace Config

> This file is personal to Brian (Khian) and is not committed to any repo.
> It covers workspace layout, session rituals, and role-specific behaviour only.


---

## My role on this team

- **Brian (Khian)** — junior developer / infrastructure assistant
- **Carl** — infrastructure lead (owns `rto-compass-hub/CLAUDE.md`, CI guardrails, config.toml, edge function structure)
- **RJ** — app engineering lead (owns frontend patterns, hooks, component architecture)
- **Dave** — database lead
- **Angela** — product and regulatory

My job is to assist Carl and RJ. When in doubt about a pattern, check `rto-compass-hub/CLAUDE.md` but khian can do any one of the roles as long as it is done thorougly and all matters are accounted for. 
---

## Workspace layout

```
c:\Users\brian\complyhubworkspace\
├── CLAUDE.local.md        ← this file (personal, not committed)
├── AGENTS.md              ← Codex entry point
├── complyhub-kb/          ← team KB (full read/write access)
│   ├── audit/             ← audit trail
│   ├── pinned/            ← shared rules — always load first
│   ├── reference/         ← fetch on demand
│   ├── codebase-state/    ← as-shipped codebase snapshots
│   └── handoffs/          ← scenario procedures
└── rto-compass-hub/       ← codebase
    ├── CLAUDE.md          ← Carl's rules — authoritative for all code decisions
    ├── src/               ← React + TypeScript frontend (Vite)
    ├── supabase/          ← Edge Functions, migrations, config.toml
    └── .github/workflows/ ← CI guardrails
```

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

New workflow (effective 22 June 2026, per Carl):
- All new work starts by creating a fresh branch off `main`
- Branch naming: `fix/description` for bug fixes, `feat/description` for features
- Changes are made on that branch, then a PR is opened against `main`
- Pushing a branch automatically creates a Vercel preview URL for QA
- Never edit `main` directly

Branch DB workflow (effective 30 June 2026 — clarified by Brian):

**Migration branch flow (sequential — do not skip or reorder):**
1. Write the `.sql` migration file on the branch
2. Commit → push → open PR against `main`
3. Supabase detects the new migration file and automatically creates a branch DB, runs all migrations against it
4. Confirm branch DB shows no `MIGRATIONS_FAILED` before doing any QA
5. QA is done against the branch DB (not production)
6. Merge the PR to `main` — this lands the `.sql` file in the repo only; it does NOT touch the production DB
7. Manually apply the migration to production via MCP `apply_migration` immediately after merge — never defer
8. Verify the DB object changed in production

**Non-migration branch flow:**
- No branch DB is created — QA runs against production DB
- No manual apply step needed after merge

**Key rules:**
- Merging to `main` never auto-applies migrations to production — always a separate manual step
- Never do production QA for migration branches — always use the branch DB
- Apply to production immediately after merge — never leave it pending

---

## PR review + fix workflow

This is the approved workflow for clearing open branches into `main`. Carl has approved edits and commits on PR branches.

**Steps per PR:**
1. Agent reviews the PR diff + dry-run merge against current `main`
2. Plain English verdict and issues presented to Brian
3. Brian decides: fix on branch / close / defer
4. If fixing: `git checkout [branch] && git pull`
5. Make edits, verify thoroughly, present full diff to Brian
6. Brian says "commit it" → commit
7. Brian says "push it" → push
8. Brian approves PR on GitHub and merges to `main`
9. Verify merge landed on `main`, branch deleted
10. Update `phase1-verdicts-partial.md` with final verdict
11. `git checkout main && git pull` before next PR

**Rules:**
- Never edit `main` directly — all changes go through PR branches
- Never commit or push without Brian's explicit words
- Brian can merge approved PRs to `main` directly
- After each merge, verify on `main` before moving to the next PR
- All verdicts saved to `localshi/merging_work/phase1-verdicts-partial.md`

---

## Session start (mandatory first action)

1. `cd complyhub-kb && git pull --ff-only && cd ..`
2. `cd rto-compass-hub && git fetch && git pull && cd ..`
3. Report latest commits in both repos after pulling

If any pull fails: **STOP and report to Brian.** Do not resolve conflicts autonomously.

Full session protocol: `complyhub-kb/pinned/session-protocol.md`

---

## Trigger phrases → actions

**"go to main and get latest repo"**
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
```

**"create a branch for [name]"** (or "start a new branch" / "new branch for this work")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
git checkout -b [branch-name]
# e.g. git checkout -b feat/suggestion-intake
```

**"go to branch [name]"** (or "switch to branch [name]")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout [branch-name]
git pull
```

**"what are the conflicts of the new repo in our branch"** (or "check conflicts" / "any issues with latest commits")
1. `git checkout main && git pull` — get latest main
2. `git checkout [active-branch]`
3. `git merge main --no-commit --no-ff` — dry-run merge
4. Report any conflicts; also inspect changed `package.json` for new/changed deps that could break local run
5. `git merge --abort` — leave branch clean after the check

**"start local dev"** (or "run locally" / "start the app")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout [active-branch]
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm install
npm run dev
# App runs at http://localhost:8080
```

**"stop local dev"** (or "stop the server" / "kill the dev server")
- If running in foreground: Ctrl+C in the terminal
- If running in background: `Get-Process -Name "node" | Stop-Process -Force`

**"build for vercel"** (or "test production build" / "run build")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
npm run preview
```

---

## Supabase

| Name | Project ID | Region | Notes |
|---|---|---|---|
| ComplyHub Production | `gdwhlstfguxarnxasrrs` | ap-southeast-2 | Used by all branches — no branch DB isolation |

MCP server configured in `.mcp.json` (PAT-authenticated; not committed to git).

**Project ID selection rule:** Always use `gdwhlstfguxarnxasrrs`. All branches — feature, fix, and main — point at production. No branch DBs are created automatically. Verified 25 June 2026.

**Default Supabase access is READ-ONLY.** For diagnosis, schema inspection, and data checks, only use read operations.

**Write operations allowed when Brian explicitly says to deploy migrations:**
- `apply_migration` — allowed when Brian says "apply the migration" or "deploy to production"
- `execute_sql` (writes) — allowed when Brian explicitly asks for a data fix or manual SQL

**Never use without explicit discussion — these are destructive:**
`create_branch`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `pause_project`, `create_project`, `deploy_edge_function`

When Brian says `check database` (or equivalent):
1. Identify target tables/views/feature area
2. Inspect relevant schema first (columns, types, relationships)
3. Run focused read-only checks to validate the issue
4. Summarise findings and likely root cause
5. Recommend the smallest safe fix path — do not execute writes unless Brian explicitly approves

Always use MCP server `supabase` for database tasks.
Default project follows the active branch rule above. Do not switch projects unless I explicitly name another.
Do not use MCP server `supabase-unicorn` unless I explicitly ask for it.

Response format for `check database`:
- What was checked
- Key findings
- Likely root cause
- Recommended next step

---

## Vercel (MCP — added 02 July 2026)

Vercel MCP is registered at **user scope** in `C:\Users\brian\.claude.json` (HTTP transport, OAuth — no token in any repo file). It persists across restarts. If tools ever stop loading, run `claude mcp get vercel` to confirm it is Connected, then restart Claude Code.

| Name | ID | Notes |
|---|---|---|
| Team | `team_oUNjuuI0xecWTumBWDTNZuEm` (slug `complyhub`) | The only team |
| Project | `prj_PWwpFRTBB4i4RAni8diFr7YaFk89` (`complyhub-rto`) | Node 22.x |

**Domains on this project:** `rto.complyhub.ai` (production), `complyhub-rto.vercel.app`, `complyhub-rto-git-main-complyhub.vercel.app`.

**Production truth (verified 02 July 2026):** Merging a PR to `main` fires a Vercel **production** deploy that serves `rto.complyhub.ai` — this happens automatically, no manual publish. This is the GitHub path and is intentional. (The Lovable/staging path is separate — Lovable publishes via the `staging` branch and requires its own publish action. `staging` and `main` were synced yesterday.)

**Branch preview URL pattern (deterministic):** `complyhub-rto-git-<branch-slug>-complyhub.vercel.app` where `<branch-slug>` is the branch name with `/` and other non-alphanumerics turned into `-` (long slugs get a hash suffix — confirm via `list_deployments` when unsure).

**Vercel access is READ-ONLY by default.** Use `list_deployments`, `get_deployment`, `get_deployment_build_logs`, `get_runtime_errors`, `get_runtime_logs`, `get_project` freely for diagnosis.

**Never use without Brian explicitly saying "deploy to Vercel":**
- `deploy_to_vercel` — triggers a real deployment. Gated exactly like Supabase `apply_migration`.

### Trigger phrases → actions

**"check the deploy"** (or "did the build pass" / "is it deployed")
1. `list_deployments` for the project, filter to the active branch (`meta.githubCommitRef`)
2. Report `state` (READY / BUILDING / ERROR / CANCELED), target, and commit message
3. If `ERROR` → pull `get_deployment_build_logs` and report the actual failing lines

**"get the preview url"** (or "what's the preview link")
- Return the Ready preview deployment URL for the active branch (or the `complyhub-rto-git-<branch>-complyhub.vercel.app` alias). Only hand over a URL once its `state` is READY.

**"check runtime errors"** (or "any production errors" / "check the logs")
- `get_runtime_errors` / `get_runtime_logs` on the production deployment. Use as a first-look tool for production bug reports, alongside the DB data-state check.

---

## Code change protocol (branch work)

> ⛔ **NEVER RUN `git commit` OR `git push` UNLESS BRIAN EXPLICITLY SAYS SO.**
> - **Commit words:** "commit it", "commit that", "go ahead and commit", "commit now"
> - **Push words:** "push it", "go ahead and push", "push now"
> "yes", "do it", "approved", "make the fix", "apply it" — NONE of these mean commit or push. They only mean make the file edit.
> If in doubt: make the edit, stop, tell Brian what was changed, and WAIT for explicit commit instruction.
> Approving an edit ≠ approving a commit. Approving a commit ≠ approving a push. These are THREE separate gates.

**New branch workflow (effective 22 June 2026):**

Every piece of work — bug fix, new feature, migration — follows this flow:

1. **Create a branch off `main`** — `git checkout main && git pull && git checkout -b feat/or/fix-description`
2. **Diagnose first** — read the relevant files, check the DB if needed, understand the root cause fully before touching anything
3. **Write the plan in plain English** — what is the problem, why it happens, what the fix is, what files change, what could break
4. **Present to Brian for review** — get explicit approval before making edits
5. **Make the change** — one focused commit per logical fix
6. **Commit, then stop** — tell Brian in plain English what was committed, then WAIT for explicit push instruction
7. **Push ONLY when Brian says so** — then open a PR against `main`
8. **Vercel creates a preview URL automatically on push** — QA is done on that preview against the production DB
9. **Brian merges the PR** once QA passes

Never push speculatively. Never fix-and-push in one motion. Approving a fix ≠ approving a commit. Approving a commit ≠ approving a push. These are THREE separate gates.

> ⛔ **ALWAYS run the plan by Brian BEFORE making any change — even to local staging files, even outside the repo.** Describe what you intend to change, which file, and why. Wait for explicit approval before touching anything.

### Branch verification — mandatory before every commit and push

> ⛔ **BEFORE running `git commit` OR `git push`, always run `git branch --show-current` first.**
> Confirm the output matches the expected feature branch (e.g. `fix/survey-public-link-routing`).
> If it shows `main` or any unexpected branch — **STOP immediately. Do not commit or push. Report to Brian and resolve the branch state first.**
> Session resets can silently revert the checkout to `main` without warning. Never assume the branch is correct — verify it every time.

---

## Session boundary branch re-confirm

At the start of any session where there is active branch work in progress (i.e. a `fix/*` or `feat/*` branch exists locally or on the remote), run `git branch --show-current` before doing anything else — before reading files, before diagnosing, before any command. Report the active branch to Brian at the top of the session so it is visible and agreed before work begins. Do not rely on memory from a previous session — the checkout may have silently reset to `main`.

---

## Plain English — always, not on request

After any technical audit, diagnosis, or fix explanation, always provide a plain English version without waiting for Brian to ask. No jargon, no file paths, no code snippets — just what happened, why, and what was done about it, as if explaining to a non-developer. Technical detail goes first for the record; plain English summary follows immediately after.

---

## Never assume — always verify

Never rely on memory, prior session context, or past observations as ground truth. Always verify against the current state:

- File content → Read the file
- DB state → Query via MCP
- Migration status → `list_migrations` against production
- Branch → `git branch --show-current`
- Config → Read `config.toml`, not memory

If something could have changed since it was last observed, treat it as unknown until verified. Memory is context, not fact.

---

## Trace the full flow — never hand off mid-chain

When diagnosing a bug or tracing a feature, follow the execution path all the way to the end before reporting findings. Do not stop at a plausible-looking file or function and hand the problem back with "this is probably where it is." That approach misses bugs and adds unnecessary work hours.

The complete trace means:
- User action → component → hook → RPC/edge function → DB function → return value → UI render
- Follow every branch of the chain that could affect the outcome
- Confirm each step is actually called in the right context (grep callers, don't assume)
- Only report findings once the full path is traced and the root cause is confirmed, not suspected

If the trace is genuinely blocked (e.g., missing source, external service), state exactly where it stops and why — not just "it might be here."

---

## Never run `npm run build`

`npm run build` hangs Brian's workstation. Do not run it for any reason — not for verification, not for pre-push checks, not to confirm a fix compiles.

To verify code correctness without a full build, use:
```powershell
npm run type-check   # TypeScript errors only — fast
npm run lint         # ESLint — fast
```

If both pass, the change is safe to commit and push. Build verification happens on Vercel automatically after push — that is the build gate, not the local machine.

**Read the Vercel build result via MCP — don't just wait.** After a push, use `list_deployments` (filter to the branch) to check the deploy `state`, and if it shows `ERROR`, pull `get_deployment_build_logs` and report the actual failing lines. This replaces "wait and check the dashboard" — I can now confirm the build gate result directly. See the `## Vercel` section for trigger phrases.

---

## DB data-state check — standard diagnosis step

For any bug report involving data not loading, links not working, or content appearing missing: query the relevant database rows early in the diagnosis — before theorising about code causes. The actual data state (status, token, expiry, flags) resolves most hypotheses in a single step and avoids chasing the wrong fix. Use the Supabase MCP server (read-only) as the first investigative tool, not the last.

---

## Post-merge checklist (mandatory after every PR merge)

After Brian merges a PR and the branch is deleted, always complete these steps before moving on:

1. `git checkout main && git pull` — confirm the fix commit is on main, report the commit hash
2. Confirm the branch is gone from remote (`git ls-remote --heads origin <branch>` returns empty)
3. Delete the local branch if it still exists (`git branch -D <branch>`)
4. **Confirm the Vercel production deploy went Ready** — `list_deployments`, find the newest `target: production` deploy matching the merge commit SHA, confirm `state: READY`. If it errored, pull `get_deployment_build_logs`. This catches a broken production build (on `rto.complyhub.ai`) immediately rather than on next visit.
Do not write KB audit entries automatically. Only write to `complyhub-kb/audit/` if Brian explicitly asks for it.

---

## My guardrails

- **Always check `rto-compass-hub/CLAUDE.md` first** before suggesting any code pattern, file structure, or database change.
- **Confirm with Brian before acting** on anything that touches `main`, CI config, `config.toml`, or `supabase/migrations/` — surface intent and wait for explicit approval.
- **Do not create new guardrail files** inside `rto-compass-hub/` without Brian explicitly asking.
- **Never commit or push** to `main` in `rto-compass-hub/`.
- **When Brian asks "what should I do next"**, check `rto-compass-hub/TODO.md` and `rto-compass-hub/.lovable/plan.md` for current task context before suggesting anything.
- **Present options, don't hand off.** If a task requires architectural judgement, surface the options and tradeoffs to Brian — do not defer to Carl, RJ, Dave, or anyone else. Brian works across all roles and makes the call.
- **Always give UI-based navigation instructions.** When telling Brian to test or navigate the platform, describe the click path (e.g. "click Registers in the left nav, then Professional Development") — not raw URLs. Include the URL only as a fallback. Always reference `complyhub-kb/reference/ui-navigation.md` for the correct sidebar structure and click paths — do not guess or describe sidebar colours. Note that this file reflects the Administrator role view only; state role caveats when relevant.

---

## Diagnosis discipline (learned from NEW-013 multi-attempt failure)

These rules apply to every bug fix, not just QA findings. Violating them is how a fix lands in the wrong file and wastes iterations.

1. **Trace the execution path from the user action, not from the plausible-looking file.** Start at the button click / route load / login event and follow the code forward to the actual decision point. Do not start at the file you expect is responsible.

2. **Grep callers before editing any function.** If you cannot see the function being called from the right place, you have not found the right fix target. (`routeAfterLogin` looked correct but was only called from `ResetPassword` — not normal login.)

3. **For switch/case blocks or arrays of roles — audit every entry.** When fixing one case, read every other case in the same block. Ask: does each entry have a corresponding config? This is how the Consultant sidebar bug was missed when fixing CM's case.

4. **For a directory of similar files — check all files for the same pattern.** When fixing one guard, grep all guards in the same folder for the same wrong value before reporting the BRC as clean.

5. **For context-switching bugs — query the DB early.** Check `profiles.active_tenant_id` and `tenant_members` for the affected user before theorising. The actual DB state resolves hypotheses in one step.

6. **Before routing any previously-unrouted component — cross-reference every DB field name used in the component against `src/types/` and the actual schema.** A feature parity check (does it have the right columns, the right form?) does NOT substitute for a field-name correctness check (are the actual property names correct?). This step is mandatory when the file has `// @ts-nocheck` on line 1 — TypeScript cannot catch mismatches, so the cross-reference must be done manually. Failure to do this was the root cause of the MCN register white screen (PR #98 route switch, July 2026): `change_title`, `description_of_change`, `submitted_to_asqa`, and `date_of_change` were used throughout `mcn/index.tsx` but none of them exist on `MCNRegister` — the correct fields are `title`, `change_description`, `date_submitted`, and `change_date`.

---

## Migration archive — never read

`supabase/migrations/_archive/` contains 3,600+ historical Lovable-era files. They do not run. Never read, grep, or reference them when diagnosing migration failures. When investigating any migration issue, only look at files directly in `supabase/migrations/` (not subdirectories). Always verify the actual file before drawing conclusions — do not rely on memory about what migrations exist.

---

## Migration discipline — preventing drift (effective 26 June 2026)

The repo and the production database are independent. Merging to `main` only updates files — it never touches the database. Applying to production is always a separate manual step.

### The only safe flow

1. Write the `.sql` file on a branch
2. Push → branch DB confirms green (no `MIGRATIONS_FAILED`)
3. Merge PR to `main`
4. **Apply to production immediately** via MCP `apply_migration` — never defer
5. Verify the DB object changed in production

### If anyone applies directly to production

Write a reconciliation migration capturing the exact change. Merge it before any new branch work touches that schema area. This is what happened with Angela's 26 June fixes — failure to do this caused branch DB failures across the whole PR.

### Branch DB + seed.sql

Branch DBs run: baseline → migrations → `seed.sql`. The `seed.sql` is live and configured in `config.toml` under `[db.seed]`. It uses hardcoded tenant UUIDs so QA accounts exist on every branch DB. If a migration adds a column that `seed.sql` references and the baseline doesn't have it, the seed step fails. Always check `seed.sql` when adding columns to seeded tables.

---

## Schema drift — Lovable legacy (context as of 25 June 2026)

Before June 2026, Lovable applied database changes directly to the production DB without creating migration files. This left 3,608 migration version records in production with no corresponding `.sql` files in the repo. Branch DBs hit `MIGRATIONS_FAILED` because they start fresh and can't find those versions.

**Status:** Lovable is no longer in use. All migrations now go through files + branch DB testing.

**Known drift fixed:** Migration `20260624000100_gap_fill_tenants_schema_drift.sql` adds 10 columns to `public.tenants` that were applied directly to production via Lovable and were missing from the baseline:
- `cricos_provider_code`, `lms_name`, `llnd_provider`, `llnd_assessment_instrument`
- `english_evidence_policy` (jsonb), `acsf_defaults` (jsonb), `delivery_sites` (jsonb)
- `funding_streams` (text[]), `trainer_pd_review_cadence`, `parent_consultant_org_id` (uuid)

**Rule going forward:** If a branch DB migration fails with `column X does not exist`, check whether that column exists in production but has no migration file. If so, add a gap-fill migration (`ADD COLUMN IF NOT EXISTS`) before the failing migration and document it in `supabase/migrations/CLAUDE.md`.

---

## Baseline-first migration rule (effective 01 July 2026)

When a DB change is needed and the situation supports it, prefer editing the baseline (`supabase/migrations/00000000000000_baseline.sql`) over creating a new migration file. Each situation differs — use judgement:

**Edit the baseline when:**
- The column or object doesn't exist anywhere yet (new feature, not yet in production)
- The change is purely additive (new column, new table, new function) with no risk of conflicting with existing migration files
- The table's `CREATE TABLE` already exists in the baseline — just add the column there
- No existing migration file creates or references the same object

**Create a new migration file when:**
- The object already exists in production — the baseline won't re-run against production, so you still need an `ALTER TABLE` applied manually after merge
- The change modifies an existing object (ALTER TABLE on a table already in the baseline)
- The baseline doesn't contain a `CREATE TABLE` for the affected table (Lovable-era drift — table was created directly in production)
- Risk of conflict with another migration in the chain is high

**Key caveat:** Editing the baseline only covers branch DBs. Production always requires a separate manual `apply_migration` step after the PR merges. Never assume baseline changes flow through to production automatically.

**Watch for redundancies:** Before adding anything to the baseline, check whether an existing migration file already handles it (`IF NOT EXISTS` guards prevent errors, but clean code avoids dead declarations).

## Pre-push verification agent (future consideration)

CI only fires when targeting `main` — it is silent when pushing to `fix/local-run`. A verification agent on the branch could catch Carl's guardrail violations (missing `config.toml` entry, `.single()` usage, hook over 150 lines, etc.) before CI ever sees the code. Not redundant with Husky or CI — fills the gap between local commit and PR. Revisit when branch work volume picks up.

---

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
| 1 | `rto-compass-hub/CLAUDE.md` | Carl's code rules — authoritative |
| 2 | `complyhub-kb/pinned/guardrails.md` | Write rules, entity routing, confidentiality |
| 3 | `complyhub-kb/pinned/session-protocol.md` | Session ritual, token efficiency |
| 4 | `complyhub-kb/pinned/conventions.md` | Tech conventions, RLS, Edge Function patterns |
| 5 | `complyhub-kb/pinned/decisions.md` | Architectural decisions log |
| 6 | `complyhub-kb/README.md` | KB orientation |
| on demand | `complyhub-kb/handoffs/` | Scenario procedures |
| on demand | `complyhub-kb/reference/` | Deep reference docs |
