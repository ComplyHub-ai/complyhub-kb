---
name: ci-gate
description: Read-only pre-commit/push/PR gauntlet for rto-compass-hub branches. Cross-references every changed file against every check the real CI workflow (.github/workflows/ci.yml) runs — lint, type-check, .single() guard, migration guards, security guards (incl. exhaustive service-role-key scan), config.toml coverage, edge-function type-check — plus role-casing and status-enum checks CI doesn't cover, and confirms the branch is up to date with main. No edits, no commits, no pushes. Trigger when Brian says "/ci-gate", "run ci-gate", "check CI before I push", or "is this branch ready to ship".
---

# ci-gate

Mechanical pre-ship gauntlet for any `rto-compass-hub` feature/fix branch. Entirely read-only — it
never edits a file, commits, or pushes. Run it right before the commit/push/PR gates in
`complyhubworkspace/CLAUDE.md`, on any branch about to ship. Mandatory step in the living-doc workflow
(one-off multi-item bodies of work) and standard practice for any PR.

It exists because CI (`.github/workflows/ci.yml`) only reports failures *after* a push. This skill runs
the same checks locally first, plus a couple of DB-adjacent checks CI structurally can't do (role
casing, status-enum completeness) that have caused real bot-caught bugs on past PRs.

---

## How to trigger

```
/ci-gate
```

---

## Step 0 — Branch state

```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git branch --show-current
git status --short
```

- Confirm the branch is NOT `main` — if it is, stop and report to Brian (this skill checks a feature
  branch's diff against `main`, not `main` itself).
- If the working tree is dirty, report what's uncommitted and ask whether to proceed (uncommitted
  changes won't be covered by the CI-equivalent checks below, which diff against `HEAD`).

## Step 0.5 — Confirm branch is up to date with main

```powershell
git fetch origin main -q
git rev-list --left-right --count origin/main...HEAD
```

The first number is how many commits the branch is behind `main`. If it's anything other than `0`:

- If the tree is clean, merge it in: `git merge origin/main --no-ff`, resolve any conflicts, confirm
  `git status` is clean afterward (no conflict markers left in this branch's own files).
- If a conflict can't be resolved mechanically, stop and report to Brian — do not guess at intent.

This mirrors the "branch freshness" hard gate in `complyhubworkspace/CLAUDE.md` — better to catch it
here than after `gh pr create` flags "out of date with base branch."

## Step 1 — Compute the changed-file set

```powershell
$BASE = "origin/main"
git diff $BASE...HEAD --name-only --diff-filter=ACMR
```

Keep this list — every check below scopes to it, exactly like CI does. Save subsets as needed
(`*.ts`/`*.tsx`, `supabase/migrations/*.sql`, `supabase/functions/**`).

## Step 2 — Lint (changed .ts/.tsx only)

```powershell
npx eslint <changed .ts/.tsx files, excluding src/lib/database.types.ts>
```

## Step 3 — Type check

```powershell
npm run type-check
```

(Or `npx tsc --incremental --noEmit` per the pre-push hook / `AGENTS.md`.) Must exit cleanly — this is
blocking in CI and also enforced by the local pre-push hook.

## Step 4 — Block `.single()` usage (changed src files only)

```powershell
grep -n '\.single()' <changed src/*.ts, src/*.tsx files> | grep -v 'maybeSingle' | grep -v '// single-ok' | grep -v '_deprecated'
```

Any hit is a failure — `rto-compass-hub/CLAUDE.md` bans `.single()` (throws on 0 rows); use
`.maybeSingle()`.

## Step 5 — Migration guards (new migration files only)

For every **newly added** file under `supabase/migrations/*.sql` (diff-filter `A`, excluding
`_archive/` and the `00000000000000` baseline):

1. **Filename format** — must match `^[0-9]{14}_[a-z][a-z0-9_]+\.sql$`
   (`YYYYMMDDHHmmss_snake_case_description.sql`). Read
   `rto-compass-hub/supabase/migrations/CLAUDE.md` fresh (don't rely on memory) — naming/discipline
   notes there change.
2. **`CREATE TABLE` → RLS** — if the file has `CREATE TABLE` and no `-- rls-skip` marker, it must also
   have `ENABLE ROW LEVEL SECURITY`.
3. **New `tenant_id` column → index** — if the file adds a `tenant_id` column (`CREATE TABLE` or
   `ADD COLUMN`), it must also have a `CREATE INDEX` on `tenant_id`.
4. **`SECURITY DEFINER` → `search_path`** — any `SECURITY DEFINER` function in the file must also set
   `SET search_path`.
5. **`CREATE OR REPLACE` on an existing function** — before trusting a live `pg_get_functiondef` fetch
   as ground truth, also check git history for that function name
   (`git log --oneline -- 'supabase/migrations/*<function_name>*'`) — the live DB can itself be behind
   what's merged in git (a migration merged to `main` but never applied to production). A version gap
   in `list_migrations` / `schema_migrations` is the tell.

## Step 6 — Security guards (changed files only)

Mirror `.github/workflows/ci.yml`'s `security-guards` job exactly:

1. **`SECURITY DEFINER` without `SET search_path`** in changed (not just new) migrations.
2. **Hardcoded Supabase project ID** (`gdwhlstfguxarnxasrrs`) in changed `src/**/*.ts(x)` — must use
   `import.meta.env.VITE_SUPABASE_URL` instead.
3. **Exposed service-role key — exhaustive, one pass, never a hand-picked subset:**
   ```bash
   CHANGED_FN=$(git diff "$BASE"...HEAD --name-only --diff-filter=ACMR -- 'supabase/functions/**')
   ALLOWED=$(grep -o 'ALLOWED="[^"]*"' .github/workflows/ci.yml | sed 's/ALLOWED="//;s/"$//')
   grep -Hn "SUPABASE_SERVICE_ROLE_KEY" $CHANGED_FN 2>/dev/null | grep -v "README" | grep -vE "$ALLOWED"
   ```
   Run this against the **full** `$CHANGED_FN` list — do not substitute a subset recalled from memory
   of "which files I added new service-role code to." A file can be in the changed-file set (e.g. an
   auth gate added in front of pre-existing service-role code) without the service-role usage itself
   being new — CI greps every changed file regardless of *why* it changed, so this check must too.
4. **Dropped tests/migrations** — any changed-file set with diff-filter `D` under `tests/**` or
   `supabase/migrations/**` not listed in `.github/allowed-deletions.txt` is a failure. This is the
   single biggest recurring regression class in this repo (stale-branch merges silently reverting
   main-only content) — see `AGENTS.md` agent behavior #10.
5. **`verify_jwt` downgrade** — if `supabase/config.toml` changed, diff it against the base version and
   confirm no existing function flips `verify_jwt` from `true` to `false`.

## Step 7 — config.toml coverage

Every directory under `supabase/functions/*/` with an `index.ts` (excluding `_`-prefixed dirs) must
have a matching `[functions.<name>]` entry in `supabase/config.toml`.

## Step 8 — Edge function type-check

```powershell
deno check supabase/functions/<changed function>/index.ts
```

(Non-blocking in CI, but worth surfacing.)

## Step 9 — Role-casing check (not in CI — caught only by bots so far)

For **any new or changed role-name comparison** in a migration or edge function (e.g.
`['administrator', 'compliance_manager'].includes(...)`):

- Grep `src/lib/constants/roles.ts` for the actual `ROLES.*` values in use **today**.
- `rto-compass-hub/CLAUDE.md`'s role table is explicitly labeled "as they will exist post-migration" —
  today, `tenant_members.role` / `tenant_members.roles[]` and `profiles.role` are stored **Proper
  Case** (`'Administrator'`, `'Compliance Manager'`, etc.), not the snake_case shown there. A
  case-sensitive comparison against the wrong casing 403s every real user in that role — confirmed bugs
  on PR #310 and in `generate-audit-pack`/`generate-board-report` (still unfixed as of 27 Jul 2026).
- Flag any lowercase/snake_case role literal in a diff as a likely bug unless it's reading from a real
  enum column already migrated.

## Step 10 — Status-enum completeness check (not in CI)

For any new or changed conditional branching on a `status`-like string column
(e.g. `['submitted', 'committed'].includes(report.status)`):

- Grep the table's actual `CHECK` constraint in `supabase/migrations/00000000000000_baseline.sql`
  (`<table>_status_check`) or the generated TS enum type.
- List every value in that constraint and confirm the new code classifies each one correctly — don't
  assume an existing literal array already covers every valid value. (Caught a real dashboard-status
  miscount on PR #311 that a prior review pass also missed.)

## Step 11 — Report

Produce a plain-English pass/fail table, one row per step above (0.5–10), e.g.:

| Step | Check | Result |
|---|---|---|
| 0.5 | Up to date with main | ✅ / merged N commits |
| 2 | Lint | ✅ / ❌ (file:line) |
| 3 | Type check | ✅ / ❌ |
| 4 | `.single()` guard | ✅ / ❌ (file:line) |
| 5 | Migration guards | ✅ / ❌ (file: which rule) |
| 6 | Security guards | ✅ / ❌ (file: which rule) |
| 7 | config.toml coverage | ✅ / ❌ (missing dirs) |
| 8 | Edge function type-check | ✅ / ⚠️ non-blocking |
| 9 | Role casing | ✅ / ⚠️ flag (file:line) |
| 10 | Status enum completeness | ✅ / ⚠️ flag (file:line) |

**Stop here.** This skill only reports. Brian decides what to fix and when; only proceed to the
commit/push/PR hard gates once ci-gate reports clean (or Brian explicitly accepts a flagged item).

---

## Rules

- Read-only. Never edit a file, commit, or push during this skill — the one exception is the
  merge-from-main in Step 0.5, and only when the tree is clean and the merge resolves without manual
  conflict intervention; otherwise stop and report.
- Never hand-pick which changed files to check (Step 6.3 in particular) — always run against the full
  computed changed-file set for that step.
- Steps 9 and 10 are not part of the real CI workflow — they exist because bots (Cursor Bugbot, Vercel)
  have caught real bugs in this exact shape that CI structurally can't (CI has no live-DB knowledge of
  actual stored casing or actual enum values). Treat a flag here as seriously as a CI failure.
- If Step 0.5's merge hits a conflict that isn't mechanical, or if `git fetch`/`git status` fail, stop
  and report to Brian rather than guessing.
