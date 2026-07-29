# PR Review

Full per-PR review, fix, and merge workflow for the ComplyHub branch cleanup plan.

Invoke as: `/pr-review [PR number]`

---

## What this skill does

Runs the complete five-stage workflow for a single PR. Do not skip any stage. Do not split the Stage 2 report across messages. Do not commit or push without Brian's explicit words ("commit it" / "push it").

---

## STAGE 1 — Full review + dry-run

Complete all steps below before presenting anything to Brian.

### Step 1 — Fetch latest main

```powershell
git checkout main
git fetch origin
git pull
```

### Step 2 — PR metadata and CI status

```bash
gh pr view $ARGUMENTS --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,labels
gh pr checks $ARGUMENTS
```

### Step 3 — Get the diff

```bash
gh pr diff $ARGUMENTS
```

### Step 4 — Fetch branch and inspect key files

```bash
git fetch origin [branch-name]
git show origin/[branch-name]:path/to/file
```

### Step 5 — Schema check

Confirm every table/column the PR queries against production (`gdwhlstfguxarnxasrrs`). Flag any column that cannot be confirmed.

### Step 6 — TypeScript check

```powershell
git checkout origin/[branch-name] --detach
npx tsc --noEmit
git checkout main
```

Do not trust the PR description's self-reported build status.

### Step 7 — config.toml check (Edge Function PRs only)

Check if any new edge function is registered in `config.toml`. Missing entry → HIGH if new; LOW if already deployed to production.

### Step 7b — Existing data impact check

For any PR touching forms, mutations, or effects on existing records:
1. Do any `useEffect` hooks filter or clear saved form state based on external data? What happens when that data returns empty?
2. Does any mutation do delete-then-insert? If the insert fails after delete, what state is left? Rate MEDIUM minimum.
3. For edit modals — if the pre-fill hook fails, is there a fallback to data already in memory?
4. For any mutation that begins with `maybeSingle()` / `single()`: check what happens when the record is not found. A silent `return` (no throw) is treated as success by React Query — `onSuccess` fires and the UI shows a success toast even though nothing changed. Any early-exit path that does not throw must be flagged MEDIUM.

### Step 7d — Migration check

Check whether the PR includes any files under `supabase/migrations/`.

- If **no migration files** → note "No migrations" and continue.
- If **migration files are present**:
  1. List every migration file name and its purpose (inferred from filename + SQL content).
  2. Flag in the Stage 2 report: **"MIGRATIONS PRESENT — manual deployment required."**
  3. Note that merging this PR to `main` does NOT apply the migration to production. The pipeline (`supabase-migrations.yml`) has historically failed silently. Someone must manually apply each migration via the Supabase dashboard or CLI and then verify the DB object actually changed (e.g. column exists, RPC is callable, index is present).
  4. In the Stage 2 report, list the exact verification query for each migration (e.g. `SELECT column_name FROM information_schema.columns WHERE table_name = 'x'` or `SELECT proname FROM pg_proc WHERE proname = 'rpc_name'`).
  5. Rate the migration risk: LOW (additive only — new column nullable, new index, new RPC), MEDIUM (alters existing column type or default), HIGH (drops column/table, changes RPC signature callers depend on).

### Step 7e — Deletion / stripping pass (mandatory)

This step compensates for a confirmed review gap: scanning only for *additions* misses dangerous *removals*.

For every file in the diff that touches routing, layout, guards, or wrappers:
1. **Routing tree** — did any existing auth wrapper, billing gate, or access guard get removed? Look at what was around `<AppShellWrapper />`, `<Outlet />`, or the top-level protected route in `AppRoutes.tsx` on `main`, then confirm it is still present on the branch. A removed `BillingGate`, `TenantAccessGuard`, or `ProtectedRoute` wrapper is a CRITICAL blocker.
2. **Nav / sidebar config** — for every route removed from `AppRoutes.tsx`, grep the sidebar nav config files (`roleMenuConfigs`, `SidebarNav`, `navigation.ts`, or equivalent) for that path. If the path still appears in the nav but the route is gone, users will 404. Flag as HIGH.
3. **Public pages / layout** — if any page moves from protected to unprotected (or vice versa), confirm the intent is explicit and deliberate.

### Step 7f — Component implementation check (mandatory)

For every new route added in `AppRoutes.tsx`, open the target component file and confirm:
1. The file is not empty (SHA `e69de29bb` = zero-byte file — any new file diff showing this is a crash waiting to happen)
2. The file has a valid default export
3. The file is not a stub with no-op returns

Do not trust that a registered route means the component is implemented. Check the file.

### Step 7g — Repo-wide migration hygiene check (mandatory)

"No new migrations in this PR" is not a clean check — it is a trigger to ask the harder question.

For every new table name or RPC name referenced in the diff:
1. Grep `supabase/migrations/` across the entire repo for a `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS`, or `CREATE OR REPLACE FUNCTION` covering that object.
2. If none exists anywhere in the repo, flag as HIGH: the object was likely created directly in Supabase Studio and has no version-controlled migration. A staging reset or rollback would lose it.
3. List any missing migrations in the Stage 2 report under a "Migration hygiene" section with the exact object names.

### Step 7c — Blast Radius & Foresight pass

Run all three lenses before writing the verdict:

**Lens 1 — Caller / contract blast radius**
- For every exported symbol, RPC name, query key, or column the PR changes, grep ALL callers across the repo:
  ```bash
  grep -rn "functionOrSymbolName" src/ supabase/
  ```
- Any `as any` on `.rpc()` or `.from()` → manually verify the contract against the DB. `as any` blinds TSC.
- For mutations: list what is written, grep the query keys that READ that data, confirm each is invalidated.

**Lens 2 — Live-data reality check**
- For any code that reads, filters, or writes existing records, query production before approving:
  - Null rates on columns the code assumes are populated
  - `SELECT DISTINCT col FROM table LIMIT 20` for any column used in a filter expression
  - Row counts for the "degraded" case the code does not handle
- Ask every time: **"What happens when this runs against a row created 18 months ago?"**

**Standing checks:**
- RLS / role matrix — does the query behave for super_admin / consultant / other roles?
- Edge deploy state — config.toml + deployed function version + code all in sync?

### Step 8 — Dry-run: PR branch → main

```powershell
git checkout main && git pull
git checkout -b dry-run/pr$ARGUMENTS-test
git merge origin/[branch-name] --no-commit --no-ff
# Note: clean / conflicts
git merge --abort
git checkout main
git branch -D dry-run/pr$ARGUMENTS-test
```

---

## STAGE 2 — Present ONE complete report to Brian

All of the following in a single message — nothing split across turns:

```
### PR #[number] — [title]
Branch: [branch-name]
Verdict: APPROVE | REQUEST CHANGES | CLOSE
Severity: CRITICAL | HIGH | MEDIUM | LOW | CLEAN

Summary: one sentence.

Issues found:
- [SEVERITY] file.ts:line — exact failure mode

Schema verified: [columns confirmed / not confirmed]
Migrations: NONE | [list files — each with risk rating LOW/MEDIUM/HIGH and verification query]
Build check: PASS / FAIL
CI: Vercel [pass/fail — reason if fail] / Supabase Preview [pass/skip/fail]

Foresight (Step 7c):
  - Callers/contract: [grep results — who else calls changed symbols/RPCs/keys; as-any contracts verified?]
  - Live data: [what production data actually looks like for the degraded case — or N/A]
  - RLS/roles: [behaves for all roles? — or N/A]

Dry-run PR → main: CLEAN | [list conflicts]

Fixes needed before merge: [list or NONE]
```

→ Report the full findings above directly in chat at this point — before any fixes are made. Do not write it to a file.

---

## STAGE 3 — Fix, commit, push

- Make every fix identified in the report
- Run TypeScript check again after fixes
- Report in chat which issues are now resolved and what changed — do not write this to a file
- Present the exact diff to Brian
- Wait for explicit "commit it" before committing
- Wait for explicit "push it" before pushing

**If dry-run found a conflict with main — merge main into the branch as part of fixing:**
```powershell
git checkout [branch-name]
git merge origin/main --no-ff
# resolve conflict markers
git add [resolved files]
git commit
```

Do NOT edit the conflicted file and push without doing the merge. GitHub's merge check detects divergence between branch tips — editing the file does not resolve that. The merge commit is what clears the conflict indicator on GitHub.

---

## STAGE 4 — Brian approves and merges on GitHub

Approve on GitHub:
```bash
gh pr review $ARGUMENTS --approve --body "[one-line summary for Carl/Angela]"
```

Brian merges and deletes branch on GitHub.

---

## STAGE 5 — Verify and close out

**Verify merge + branch deletion:**
```bash
gh pr view $ARGUMENTS --json state,mergedAt,mergedBy
gh api repos/ComplyHub-ai/rto-compass-hub/branches/[branch-name]  # expect 404
```

**Report in chat:** the PR is MERGED ✅ with the merge date and commit hash, and that the branch is deleted. Do not write this to a file.

**Then return to main:**
```powershell
git checkout main && git pull
```
