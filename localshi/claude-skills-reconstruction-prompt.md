# Claude Code skills — reconstruction prompt (home PC setup)

> Purpose: this file is a self-contained prompt. Paste the whole thing into a Claude Code
> session on the home PC and say **"set up these skills"**. It will recreate the five
> ComplyHub skills exactly as they exist on the work PC, in the correct locations, so
> continuous work (bug fixes, PR review, branch drift/catchup) behaves identically on
> both machines.
>
> Source machine: `c:\Users\brian\complyhubworkspace` — captured 08 July 2026.
> If any of these skills are edited on either machine going forward, re-copy the
> updated file back into this document so the two machines don't drift apart from
> each other.

---

## Instructions for the Claude Code session doing the setup

1. Four of these are **user-level skills** — they live under `~/.claude/skills/<name>/SKILL.md`
   (i.e. `C:\Users\<home-username>\.claude\skills\<name>\SKILL.md`) and are available from
   any project on this machine, not just `complyhubworkspace`.
2. One (`pr-review`) is currently a **project-scoped command** — it lives inside the
   `complyhubworkspace` folder at `.claude\commands\pr-review.md` and only fires when
   Claude Code is opened rooted at that folder. Create the `complyhubworkspace` folder
   structure first if it doesn't exist yet on this machine (see Workspace layout note below).
3. For each skill below: create the exact file path shown, with the exact content in the
   fenced code block — verbatim, including the YAML frontmatter where present. Do not
   paraphrase or "improve" the wording — these have been tuned through real incidents.
4. After creating all five, confirm each one loads (list available skills / commands) and
   report back which paths were created.

**Workspace layout note (for context, not required to replicate every folder):**
```
c:\Users\brian\complyhubworkspace\
├── CLAUDE.local.md        ← personal config, NOT included in this doc (see complyhub-kb/localshi/workspace-root/CLAUDE.local.md for a snapshot)
├── AGENTS.md              ← Codex entry point, NOT included in this doc
├── complyhub-kb\          ← this KB repo — clone from GitHub (ComplyHub-ai/complyhub-kb)
├── rto-compass-hub\       ← codebase repo — clone from GitHub (ComplyHub-ai/rto-compass-hub)
└── .claude\commands\pr-review.md   ← project-scoped skill, see Skill 1 below
```

---

## Skill 1 of 5 — `pr-review` (project-scoped command)

**Target path:** `c:\Users\brian\complyhubworkspace\.claude\commands\pr-review.md`

**Trigger:** `/pr-review [PR number]`

```markdown
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

\`\`\`powershell
git checkout main
git fetch origin
git pull
\`\`\`

### Step 2 — PR metadata and CI status

\`\`\`bash
gh pr view $ARGUMENTS --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,labels
gh pr checks $ARGUMENTS
\`\`\`

### Step 3 — Get the diff

\`\`\`bash
gh pr diff $ARGUMENTS
\`\`\`

### Step 4 — Fetch branch and inspect key files

\`\`\`bash
git fetch origin [branch-name]
git show origin/[branch-name]:path/to/file
\`\`\`

### Step 5 — Schema check

Confirm every table/column the PR queries against production (`gdwhlstfguxarnxasrrs`). Flag any column that cannot be confirmed.

### Step 6 — TypeScript check

\`\`\`powershell
git checkout origin/[branch-name] --detach
npx tsc --noEmit
git checkout main
\`\`\`

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
  \`\`\`bash
  grep -rn "functionOrSymbolName" src/ supabase/
  \`\`\`
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

\`\`\`powershell
git checkout main && git pull
git checkout -b dry-run/pr$ARGUMENTS-test
git merge origin/[branch-name] --no-commit --no-ff
# Note: clean / conflicts
git merge --abort
git checkout main
git branch -D dry-run/pr$ARGUMENTS-test
\`\`\`

---

## STAGE 2 — Present ONE complete report to Brian

All of the following in a single message — nothing split across turns:

\`\`\`
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
\`\`\`

→ Log issues to `localshi/merging_work/phase1-verdicts-partial.md` at this point — before any fixes are made.

---

## STAGE 3 — Fix, commit, push

- Make every fix identified in the report
- Run TypeScript check again after fixes
- Update `localshi/merging_work/phase1-verdicts-partial.md` — mark each issue resolved, note what was changed
- Present the exact diff to Brian
- Wait for explicit "commit it" before committing
- Wait for explicit "push it" before pushing

**If dry-run found a conflict with main — merge main into the branch as part of fixing:**
\`\`\`powershell
git checkout [branch-name]
git merge origin/main --no-ff
# resolve conflict markers
git add [resolved files]
git commit
\`\`\`

Do NOT edit the conflicted file and push without doing the merge. GitHub's merge check detects divergence between branch tips — editing the file does not resolve that. The merge commit is what clears the conflict indicator on GitHub.

---

## STAGE 4 — Brian approves and merges on GitHub

Approve on GitHub:
\`\`\`bash
gh pr review $ARGUMENTS --approve --body "[one-line summary for Carl/Angela]"
\`\`\`

Brian merges and deletes branch on GitHub.

---

## STAGE 5 — Verify and close out

**Verify merge + branch deletion:**
\`\`\`bash
gh pr view $ARGUMENTS --json state,mergedAt,mergedBy
gh api repos/ComplyHub-ai/rto-compass-hub/branches/[branch-name]  # expect 404
\`\`\`

**Update openPR.md:**
- Mark the PR as MERGED ✅ with the merge date and commit hash
- Note the branch as deleted

**Then return to main:**
\`\`\`powershell
git checkout main && git pull
\`\`\`
```

---

## Skill 2 of 5 — `audit-branch-drift` (user-level skill)

**Target path:** `~/.claude/skills/audit-branch-drift/SKILL.md`

**Trigger:** `/audit-branch-drift`, "check branch drift", "how far apart are staging and main", "what's different between staging and main", "do we need a catchup", "check edge function drift", "are the edge functions in sync with git"

```markdown
---
name: audit-branch-drift
description: Audit divergence in rto-compass-hub — (a) between staging and main branches, and (b) between deployed edge functions and their git source. Produces a plain English summary of what has drifted. Read-only — no changes made. Trigger when Brian says "/audit-branch-drift", "check branch drift", "how far apart are staging and main", "what's different between staging and main", "do we need a catchup", "check edge function drift", or "are the edge functions in sync with git".
---

# audit-branch-drift

Diagnose two kinds of drift in `rto-compass-hub`, both read-only — no files changed, no commits made:

1. **Branch drift** — divergence between `origin/staging` and `origin/main` (Steps 1–5).
2. **Edge-function drift** — deployed edge functions that no longer match their git source, i.e. code running in production that was pushed directly (Lovable / direct MCP `deploy_edge_function`) and bypassed the repo (Step 6).

Output is a plain English summary with a recommendation on whether a `/branch-catchup` is needed and whether any edge function needs reconciling into git.

> **Why edge-function drift matters:** migrations have a CI drift check; edge functions do not. A function deployed directly to production has no git record, so the next merge that touches `supabase/functions/**` triggers `deploy-edge-functions.yml`, which redeploys *all* functions from git — silently overwriting the direct deploy. This is exactly how the `ai-router` classifier + confidentiality fixes were reverted on 6 Jul 2026 (PR #129 restored them). This step is the smoke detector that catches such drift before a merge clobbers it.

---

## How to trigger

\`\`\`
/audit-branch-drift
\`\`\`

---

## Step-by-step process

### Step 1 — Fetch latest from both branches

\`\`\`powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git fetch
\`\`\`

Report any fetch errors immediately and stop.

### Step 2 — Show commits on staging not on main

\`\`\`powershell
git log origin/main..origin/staging --oneline
\`\`\`

This shows what Lovable (RJ) has added to staging that hasn't been ported to main yet.

### Step 3 — Show commits on main not on staging

\`\`\`powershell
git log origin/staging..origin/main --oneline
\`\`\`

This shows what engineering work has landed on main that staging doesn't have yet.

### Step 4 — Check if branches are identical

\`\`\`powershell
git ls-remote origin main staging
\`\`\`

If both HEADs are the same commit hash, the branches are already in sync. Report this and stop — no catchup needed.

### Step 5 — Summarise in plain English

Report the following, no jargon:

- **Staging-only commits:** how many, what they appear to be (from commit messages)
- **Main-only commits:** how many, what they appear to be
- **Overall drift:** light (1-5 commits) / moderate (6-15) / heavy (16+)
- **Recommendation:** is a `/branch-catchup` needed now, or can it wait?

Do not make any judgement about which changes are "better" — just describe what exists where.

---

### Step 6 — Edge-function drift check (deployed vs git source)

Read-only throughout. Uses the `supabase` MCP server (project `gdwhlstfguxarnxasrrs`) and `gh`. Do **not** call `deploy_edge_function` or any write tool.

**6a. List what's live vs what's in the repo.**

- Live functions: call `list_edge_functions` (MCP). Capture each function's `slug`, `version`, `updated_at`, and `ezbr_sha256`. (The output is large — save to a file / grep it rather than reading it all into context.)
- Repo functions: list the immediate subdirectories of `supabase/functions/` that contain an `index.ts`. **Exclude** `_shared`, `_sdk`, `functions-disabled`, and `_archive` — these are not deployable functions.

Compare the two sets:
- **Live but NOT in git** → ⚠️ high concern: a function running in production with no source in the repo. It will not survive the next full redeploy. Recommend capturing its source into git.
- **In git but NOT live** → note it (a function committed but never deployed) — lower concern, but flag it.

**6b. Spot likely direct deploys by timing.**

The only sanctioned deploy path is `deploy-edge-functions.yml`, which fires on merges to `main` touching `supabase/functions/**`. So every legitimate deploy timestamp should cluster around a workflow-run time.

\`\`\`powershell
gh run list --workflow=deploy-edge-functions.yml --repo ComplyHub-ai/rto-compass-hub --limit 20 --json createdAt,conclusion,headSha
\`\`\`

For each live function, compare its `updated_at` against those run times. A function whose `updated_at` does **not** fall within a few minutes of any git-deploy workflow run was almost certainly deployed directly (MCP/Lovable), bypassing git → ⚠️ flag it as likely drift.

- Note: `deploy-edge-functions.yml` deploys the whole set but skips unchanged functions ("No change found in Function: X"), so a function's `updated_at` only advances when its content genuinely changed. A run reporting `failure` can still have deployed the functions alphabetically before the one that failed (e.g. the 25 MB `mcp` function 413s near the end) — so treat "failure" runs as partial deploys, not no-ops.

**6c. Confirm a suspected function (targeted, on demand).**

Only for functions flagged in 6a/6b — do NOT do this for all ~209 (too heavy; `mcp` alone is 25 MB):

- Call `get_edge_function` for the flagged slug, save to a file, and diff the deployed source against `supabase/functions/<slug>/index.ts` (normalise whitespace/line-endings; minor formatting differences are not real drift — look for genuine logic/content differences).

**6d. Report in plain English.**

- Functions live-but-not-in-git, and in-git-but-not-live.
- Functions whose deploy timing suggests a direct (off-git) deploy.
- For any confirmed content difference: a one-line plain-English description of what differs.
- **Recommendation:** for each drifted function, reconcile it into git (capture the live source into `supabase/functions/<slug>/index.ts` on a branch + PR) *before* any merge that touches `supabase/functions/**`, so the next redeploy doesn't overwrite it.

**Limitations (state these in the report):** this is a smoke detector, not a full audit. It relies on the live-vs-repo set comparison and deploy-timing heuristic as the cheap everyday signals, plus a targeted content-diff for suspects — it does not text-compare every deployed function body each run. Timing is a heuristic: a direct deploy that happens to coincide with a workflow run could be missed, and a legitimately slow/queued workflow deploy could look late. When timing is ambiguous, use 6c to confirm.

---

## Rules

- Read-only. Never commit, push, or modify any file during this skill.
- Never checkout a branch — use `origin/main` and `origin/staging` refs directly via `git log`.
- If fetch fails, stop and report to Brian — do not proceed with stale local refs.
- Edge-function drift check (Step 6) is READ-ONLY: `list_edge_functions` / `get_edge_function` / `gh run list` only. Never call `deploy_edge_function`, `apply_migration`, or any write tool.
- This skill ends with a recommendation only. Brian decides whether to proceed to `/branch-catchup` or to open a reconciliation PR for a drifted edge function.
```

---

## Skill 3 of 5 — `branch-catchup` (user-level skill)

**Target path:** `~/.claude/skills/branch-catchup/SKILL.md`

**Trigger:** `/branch-catchup`, "sync staging and main", "do the catchup", "bring staging up to date", "port lovable changes to main"

```markdown
---
name: branch-catchup
description: Bring staging and main into sync after a drift audit. Ports staging-only (Lovable) changes into main via a PR, then resets staging to mirror main. Trigger when Brian says "/branch-catchup", "sync staging and main", "do the catchup", "bring staging up to date", or "port lovable changes to main".
---

# branch-catchup

Executes the full branch catch-up cycle after `/audit-branch-drift` has confirmed drift exists. Two phases, each gated by Brian's explicit approval:

1. **Phase 1** — Port staging-only (Lovable) changes into main via a branch and PR
2. **Phase 2** — Reset staging to mirror main (force-push)

At the end, both branches are at the same commit. Staging will diverge again as Lovable adds new work — that is expected and normal.

---

## How to trigger

\`\`\`
/branch-catchup
\`\`\`

Run `/audit-branch-drift` first if you haven't already — this skill assumes you know what's drifted.

---

## Phase 1 — Port staging-only work into main

### Step 1.1 — Confirm main is current

\`\`\`powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
\`\`\`

Report the latest commit hash and message on main. If pull fails, stop.

### Step 1.2 — Create a sync branch off main

\`\`\`powershell
git checkout -b feat/staging-sync
\`\`\`

Branch name is always `feat/staging-sync` unless Brian specifies otherwise.

### Step 1.3 — Identify staging-only changes to port

Run:
\`\`\`powershell
git log origin/main..origin/staging --oneline
\`\`\`

List the commits to Brian in plain English. Ask: "Which of these do you want ported to main?" Wait for explicit answer before proceeding.

Do not assume all staging commits should be ported — some may be superseded, experimental, or already handled differently on main.

### Step 1.4 — Apply approved changes

For each approved commit, cherry-pick or manually apply the change. Present the diff to Brian before committing anything.

Follow all rules in `rto-compass-hub/CLAUDE.md` — no `.single()`, no raw `console.error`, no direct `supabase.from()` in component bodies.

**Gate: Brian must say "commit it" before any commit is made.**

### Step 1.5 — Push and open PR

**Gate: Brian must say "push it" before pushing.**

\`\`\`powershell
git push -u origin feat/staging-sync
\`\`\`

Open a PR against `main` on GitHub. Title: `feat: sync staging-only work into main (DD Mon YYYY)`.

Provide Brian with the PR link. Wait for Brian to review and merge — do not merge autonomously.

### Step 1.6 — Confirm merge landed on main

After Brian merges:

\`\`\`powershell
git checkout main
git pull
git log --oneline -5
\`\`\`

Confirm the merge commit is present. Report the commit hash.

---

## Phase 2 — Reset staging to mirror main

**Gate: Brian must explicitly say "reset staging" before this step runs.**

### Step 2.1 — Confirm main HEAD

\`\`\`powershell
git log --oneline -1
\`\`\`

Report the commit hash that staging will be reset to.

### Step 2.2 — Thorough pre-reset drift scan (mandatory, do not skip)

A force-push is irreversible for anything not already captured elsewhere. Before asking Brian for the "reset staging" go-ahead, verify nothing on staging would actually be lost — do not rely on the Phase 1 PR description alone.

\`\`\`powershell
git fetch origin
git log origin/main..origin/staging --format="%h %ai %an %s" | cat
git diff origin/main..origin/staging --stat | cat
\`\`\`

For every file that still shows a diff, check which branch touched it more recently — this tells you the direction of drift:

\`\`\`powershell
git log origin/staging -1 --format="%h %ai %s" -- <file>
git log origin/main -1 --format="%h %ai %s" -- <file>
\`\`\`

- If `main`'s last-touch commit postdates `staging`'s for every divergent file, main is a strict superset — safe to reset.
- If any file's last touch is more recent on `staging` than on `main`, stop — that content is not yet ported. Go back to Phase 1 and port it before proceeding.

For any staging-only commit whose intent isn't obviously covered by the Phase 1 PR (e.g. titles that don't match the PR's stated scope), inspect its actual diff:

\`\`\`powershell
git show --stat --format="%H %s" <commit>
\`\`\`

Confirm each one is either a no-op (e.g. only touches `.lovable/plan.md`), already reconciled into a differently-named file on main (e.g. a hand-named gap-fill migration matching a Lovable auto-named one — diff the content, not just the filename), or genuinely superseded by a later main commit.

Report the scan result to Brian in plain English before asking for the reset go-ahead: what was checked, what was found, and why it's safe (or not) to proceed. Only after this report, ask for "reset staging".

### Step 2.3 — Force-push main to staging

\`\`\`powershell
git push origin main:staging --force
\`\`\`

### Step 2.4 — Verify both branches match

\`\`\`powershell
git ls-remote origin main staging
\`\`\`

Both HEADs must show the same commit hash. Report the result in plain English:

> "Done. Both main and staging are now at [hash]. Staging mirrors main. RJ's Lovable will see the updated codebase on next sync."

---

## Rules

- Never touch main directly — all porting work goes through `feat/staging-sync` branch + PR.
- Never commit without Brian saying "commit it".
- Never push without Brian saying "push it".
- Never force-push staging without Brian saying "reset staging".
- Never ask for "reset staging" go-ahead without first running the Step 2.2 drift scan and reporting the result — no assuming the Phase 1 PR covered everything.
- These are THREE separate gates — approving one does not approve the next.
- Branch verify before every commit: run `git branch --show-current` and confirm it is NOT `main`.
- If Phase 1 takes more than one session, note the PR number and branch state so Phase 2 can be picked up fresh.
- Staging diverging again after this is expected — do not treat it as a problem.
```

---

## Skill 4 of 5 — `complyhub-bug-fix` (user-level skill)

**Target path:** `~/.claude/skills/complyhub-bug-fix/skill.md`

**Trigger:** mentions a bug, "fix this bug", "there's a problem", asks how to start fixing something in ComplyHub

```markdown
---
name: complyhub-bug-fix
description: >
  Guides Khian (Brian) through the safe ComplyHub bug-fixing flow —
  one step at a time — to diagnose issues, check blast radius, verify
  database and security state, and deliver a branch + PR ready to ship.
  Trigger when Khian mentions a bug, says "fix this bug", "there's a problem", or
  asks how to start fixing something in ComplyHub. This skill is
  step-by-step and gates each stage before moving on.
---

# ComplyHub Bug Fix — Step-by-Step Guide for Khian

This skill walks Khian through diagnosing and fixing a bug safely on ComplyHub.
It is gated — each step must be confirmed complete before the next begins.
Never skip steps. Never combine steps.

ComplyHub is a multi-tenant SaaS platform for Australian RTOs. Data isolation,
billing gates, and role-based access are P0 concerns. The live database is always
the source of truth.

---

## The 9-Step Flow

\`\`\`
1. Understand the bug
2. Check known decisions — is this a bug or by design?
3. Diagnose the issue
4. Blast radius check
5. DB & security safety checks
6. Write the fix plan in plain English
7. Apply the fix on a branch
8. Commit, push, and open a PR
9. Cross-check fix on Vivacity Testing Tenant
\`\`\`

---

## How to run this skill

When this skill is triggered, ask Khian for the bug description first.
Then walk through each step below — one at a time. At the end of each step,
explicitly ask: "Done? Ready for Step N+1?" and wait for confirmation before
continuing.

Do not present all steps at once. Surface one step, help him complete it,
then move on.

---

## Step 1 — Understand the bug

Ask Khian to describe the bug in his own words. If Angela, Carl, or RJ reported
it, ask for the exact wording. Include any error messages or screenshots.

Extract and confirm:
- What is the expected behaviour?
- What is the actual behaviour?
- When does it occur? (specific page, route, or user action)
- Which user role sees it? (SuperAdmin, Tenant Administrator, Trainer, Consultant,
  Platform Operations — or all roles?)
- Which tenant type? (single RTO, multi-campus, consultant with multiple clients?)
- Is data being corrupted, or is this a display or access issue?
- Is there a browser console error? Any Supabase Edge Function logs?
- Has the bug appeared since a recent code change? Which branch?

Do not move to Step 2 until these are clear.

**Gate:** Summarise your understanding back to Khian in 2–3 sentences.
Ask him to confirm it is right before proceeding.

---

## Step 2 — Check known decisions (is this a bug or by design?)

**What we're doing:** Before diagnosing a fix, confirm the behaviour is actually
a bug and not an intentional product decision. This saves time and prevents us
from "fixing" something that is working as designed.

Check each of the following against the reported behaviour:

| Decision | Check |
|---|---|
| **PD-001 — AU RTOs only** | Is this AU-specific terminology, DD/MM/YYYY dates, or an ASQA/TGA reference? If so, it is intentional. |
| **PD-002 — Multi-tenant isolation (P0)** | Could this be data leaking between tenants? If yes, escalate immediately to RJ — do not attempt to fix autonomously. |
| **PD-003 — Role hierarchy** | Does the feature work for SuperAdmin but not Tenant/Trainer/Consultant? Test from each role before concluding it is broken. |
| **PD-004 — AI response variation** | Is the issue that the AI returns different text each time? That is normal. Only file a bug for crashes, empty responses, timeouts, or consistently wrong/harmful output. |
| **PD-005 — TGA data accuracy** | Does the data mismatch look like a TGA record discrepancy? Verify on training.gov.au before filing a bug. |
| **PD-006 — Billing gate** | Is the feature blocked for an account with an expired subscription? That is the billing gate working correctly. Only file a bug if an active subscriber is incorrectly blocked. |

Also check the open audit clusters in `AUDIT-REPORT.md` — if the bug is already
listed in Clusters 1–6, note which cluster it belongs to. That may affect who
owns the fix and whether it is already scheduled.

**Gate:** Confirm with Khian that the behaviour is a genuine bug, not a known
product decision. If it matches a known decision, close the investigation here
and explain why.

---

## Step 3 — Diagnose the issue

**What we're doing:** Finding where in the code or database the bug is actually
happening. We check the code files AND the live database state, because sometimes
they tell different stories.

**CODEBASE DIAGNOSIS:**

1. Which route shows the bug? Find the route in `src/AppRoutes.tsx` and trace
   back to the page component.
2. Which guard wraps that route? (TenantGuard, AdminRoute, SuperAdminGuard, etc.)
   Could the bug be a guard misbehaving rather than the page itself?
3. Where does that page get its data? (Supabase query, Edge Function call via
   `src/lib/callEdge.ts`, direct hook)
4. If an Edge Function is involved, find it in `supabase/functions/` — check
   whether auth is properly gated before any data access.
5. If Storage is involved, confirm the operation goes through the correct gateway
   (`src/lib/documentFiles.ts` for `documents` bucket,
   `src/lib/storage/trainerEvidenceDownload.ts` for `trainer-evidence` bucket).
   Never use direct `supabase.storage.from()` calls in frontend code — that is a
   known failure pattern.
6. Are there any recent commits to the affected files? (`git log -- [file]`)

**LIVE DATABASE STATE (Supabase MCP — read-only):**

7. Check the affected table structure:
   \`\`\`sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = '[table]'
   ORDER BY ordinal_position;
   \`\`\`

8. Count affected rows:
   \`\`\`sql
   SELECT COUNT(*) FROM [table];
   \`\`\`

9. Sample buggy data if applicable:
   \`\`\`sql
   SELECT * FROM [table] LIMIT 5;
   \`\`\`

10. Check RLS policies on the affected table:
    \`\`\`sql
    SELECT policyname, cmd, qual, with_check FROM pg_policies
    WHERE tablename = '[table]';
    \`\`\`
    — Missing or misconfigured RLS is the most common cause of data access bugs
      on this platform.

11. Check tenant isolation — confirm the query is scoped by `tenant_id`:
    \`\`\`sql
    SELECT policyname, qual FROM pg_policies
    WHERE tablename = '[table]' AND qual LIKE '%tenant_id%';
    \`\`\`
    — If no policy scopes by `tenant_id`, this is a P0 isolation gap.
      Flag immediately to RJ.

**ROOT CAUSE HYPOTHESIS:**

Now identify where the bug originates:
- Frontend: wrong guard, missing TenantGuard, component rendering wrong state?
- Query: wrong table name, missing `.eq('tenant_id', ...)`, `.single()` on a
  multi-row result (known failure — use `.maybeSingle()` instead)?
- Edge Function: auth not gated before data access, `tenant_id` taken from
  request body without membership check?
- RLS: policy missing, wrong `qual`, or `is_superadmin()` vs `sec.is_super_admin()`
  function name mismatch?
- Credentials: hardcoded URL or key instead of `import.meta.env.VITE_SUPABASE_URL`
  / `import.meta.env.VITE_SUPABASE_ANON_KEY`?
- Storage: direct `supabase.storage.from()` call instead of gateway function?

**Gate:** Root cause must be clear. If it is unclear, run a second pass or check
Edge Function logs via Supabase MCP. Do not proceed to Step 4 until the root
cause is identified.

---

## Step 4 — Blast radius check

**What we're doing:** Before we fix the bug, we need to understand what else might
break if we change it. On a multi-tenant platform, a change that seems isolated
can affect every tenant silently.

Ask these questions:
- Does the bug appear on one page or many routes?
- Does anything else depend on the current (buggy) behaviour?
- Will fixing this change what data is shown — for all tenants or just one?
- Are there stat cards, counters, or summary numbers elsewhere that read from
  the same table?
- Are there realtime subscriptions that listen to this table?
- Does the fix touch an RLS policy? If so, it affects every row in that table
  for every tenant.
- Does the fix touch an Edge Function? Could changing auth logic break other
  callers of that function?
- Does the fix involve `cancel-subscription`, `change-plan`, or any billing
  function? Flag to Carl — billing bugs need extra care.
- Is the affected route one of the routes currently missing TenantGuard
  (documented in Cluster 4 of `AUDIT-REPORT.md`)? If so, the fix needs to
  coordinate with the TenantGuard sweep.
- Does the fix require a DB migration? If yes, identify whether the migration
  adds columns referenced by `seed.sql` — seed failures block all branch DBs.

List every place that could be affected. Flag anything that looks risky.

**Gate:** Present the blast radius to Khian. Ask him to review. If the blast
radius touches RLS, billing, or multi-tenant isolation, suggest looping in
Carl or RJ before proceeding.

---

## Step 5 — DB & security safety checks

**What we're doing:** Making sure the fix does not introduce a new security or
data integrity problem while solving the original bug.

Run these checks using the Supabase MCP (read-only):

**DB SAFETY CHECKS:**

1. Full table description:
   \`\`\`sql
   \\d [table]
   \`\`\`

2. Constraints:
   \`\`\`sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = '[table]';
   \`\`\`

3. RLS policies — both SELECT and write:
   \`\`\`sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   \`\`\`

4. Triggers:
   \`\`\`sql
   SELECT trigger_name, event_object_table, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   \`\`\`

5. Sample the affected rows — how many are in the broken state?

6. Will old data still work after the fix? (backward compatibility)

**COMPLYHUB SECURITY CHECKLIST:**

Go through each item for this specific fix:

- [ ] Does the fix add or change an RLS policy? If yes — confirm it scopes by
      `tenant_id` and has both SELECT and write variants where needed.
- [ ] Does the fix touch an Edge Function? If yes — confirm auth is gated with
      a real JWT check before any data access, not just an optional header read.
- [ ] Does the fix pass `tenant_id` from a request body into a billing or
      admin function? If yes — confirm the authenticated `user.id` is verified
      as an Administrator of that `tenant_id` in `tenant_members`.
- [ ] Does the fix use JWT decoding? If yes — use `supabaseClient.auth.getUser()`
      not `atob(token.split('.')[1])`. Signature is never verified with `atob`.
- [ ] Does the fix use a hardcoded Supabase URL or anon key? If yes — replace
      with `import.meta.env.VITE_SUPABASE_URL` / `import.meta.env.VITE_SUPABASE_ANON_KEY`.
      Hardcoded credentials are Cluster 1 of the audit and are blocked.
- [ ] Does the fix call `.single()` on a query that could return multiple rows?
      If yes — use `.maybeSingle()` or `.limit(1)` instead.
- [ ] Does the fix add a new Storage call from the browser? If yes — route through
      the correct Edge Function gateway instead. Direct Storage calls are unreliable.
- [ ] Does the fix log user role, permissions, or session data to `console.log`
      without a `if (import.meta.env.DEV)` guard? If yes — add the guard.

**SUMMARY — Answer these:**
- Is the fix backward-compatible?
- Does it break any constraint?
- Does it touch or risk breaking any trigger?
- Could it cause data to leak between tenants?
- Does it introduce any of the patterns explicitly flagged as forbidden in the
  conventions (`pinned/conventions.md`) or the audit clusters?

**Gate:** All safety checks must pass. If any fails, stop and loop in Carl
(infrastructure/DB) or RJ (frontend/auth) before proceeding.

---

## Step 6 — Write the fix plan in plain English

**What we're doing:** Before touching any file, write out exactly what will change
and why. Khian must approve this plan before any edits are made.

**Structure the plan as:**

\`\`\`
Branch name: fix/[short-description]  (e.g. fix/survey-public-link-routing)

Files to change:
- [path/to/file.ts] — lines [N–M] — what changes and why
- [repeat for each file]

DB migration required: Yes / No
  If yes:
  - Migration filename: [YYYYMMDDHHMMSS_description.sql]
  - What it does: [exact SQL change]
  - seed.sql impact: [does it add a column seed.sql references? Check and state.]

Test after applying:
- [Specific user action to confirm the fix]
- [Specific check to confirm nothing regressed]
- [Roles to test from]

Risk: [Low / Medium / High — and why]
\`\`\`

**Gate:** Show Khian the full plan. Ask him to read every line and confirm it
matches the diagnosis and safety findings from Steps 3–5.
**Do not touch any file until Khian explicitly approves the plan.**

---

## Step 7 — Apply the fix on a branch

**What we're doing:** Creating a branch off `main`, applying the approved changes,
and verifying correctness — without committing yet.

**Branch setup:**
\`\`\`powershell
cd c:\Users\brian\complyhubworkspace\rto-compass-hub
git checkout main
git pull
git checkout -b fix/[description]
\`\`\`

**Apply changes:**
- Edit only the files approved in the Step 6 plan
- No extra cleanup, no refactoring beyond what the plan says
- If a DB migration is needed: write the `.sql` file in `supabase/migrations/`
  using the correct timestamp prefix

**Verify before committing:**
\`\`\`powershell
npm run type-check   # TypeScript errors only
npm run lint         # ESLint
\`\`\`

Both must pass. Do not run `npm run build` — it hangs the workstation.

**Present the diff to Khian:** Show what changed, file by file. Confirm it
matches the approved plan exactly. Ask Khian to review.

**Gate:** Khian must say "commit it" or equivalent explicit commit words before
any `git commit` runs. "yes", "looks good", "do it", "apply it" do NOT mean commit.

---

## Step 8 — Commit, push, and open a PR

**THREE SEPARATE GATES — never combine:**

### Gate 1 — Commit

Before running `git commit`:
1. Run `git branch --show-current` — confirm it shows the feature branch, NOT `main`
2. If it shows `main` or anything unexpected — **STOP. Report to Khian.**

Only proceed after Khian says "commit it" (or equivalent explicit commit instruction):
\`\`\`powershell
git add [specific files — never git add -A or git add .]
git commit -m "fix: [short description]"
\`\`\`

Report the commit hash to Khian. Then STOP and WAIT.

### Gate 2 — Push

Only proceed after Khian says "push it" (or equivalent explicit push instruction):
\`\`\`powershell
git push -u origin fix/[branch-name]
\`\`\`

Vercel will automatically create a preview URL. Report the PR link and the
Vercel preview URL to Khian. Then STOP and WAIT.

### Gate 3 — Merge

Khian opens the PR on GitHub and merges when QA on the Vercel preview passes.
Never push to `main` directly. Never merge without Khian's explicit instruction.

**If the fix includes a DB migration — QA flow before merging:**

Two independent systems must both go green before QA can start. Check them
separately — one being ready does NOT mean the other is.

1. Push the branch and open the PR
2. **Gate A — Vercel preview build:**
   - Use `list_deployments`, filter to the branch, check `state`
   - Must show `READY` before QA. If `ERROR` → pull `get_deployment_build_logs`
     and report the failing lines. If stuck `BUILDING` for an unusually long
     time, check `get_deployment_build_logs` anyway — a hang often shows a
     silent install/build step.
3. **Gate B — Supabase branch DB:**
   - Use `list_branches`, find the branch DB for this PR
   - Must show healthy status with no `MIGRATIONS_FAILED`. If stuck in
     `CREATING`/`MIGRATIONS_RUNNING` for an unusually long time, check
     `get_logs` for the branch DB to see what's actually hanging (often a
     `seed.sql` failure if a new column isn't in baseline yet — see the
     Baseline-first migration rule).
4. **Do not start QA until both Gate A and Gate B are green.** If only one is
   ready, say so explicitly — e.g. "Vercel preview is Ready, but the branch DB
   is still running migrations" — rather than assuming QA can proceed.
5. QA against the branch DB (not production) once both gates pass
6. Only merge once QA passes on the branch DB

**After Khian merges:**
1. `git checkout main && git pull` — confirm the fix commit is on main
2. Confirm the branch is gone from remote:
   \`\`\`powershell
   git ls-remote --heads origin fix/[branch-name]
   \`\`\`
   (empty = deleted)
3. Delete the local branch:
   \`\`\`powershell
   git branch -D fix/[branch-name]
   \`\`\`
4. **If the fix included a DB migration:** apply it to production immediately via
   MCP `apply_migration` — do NOT defer. Merging to main does NOT apply migrations
   to the production DB automatically. This is always a manual step.
5. Verify the DB object changed in production after applying.

**Gate:** Report the merge commit hash to Khian and confirm production is healthy.

---

## Step 9 — Cross-check fix on Vivacity Testing Tenant

**What we're doing:** After the merge is confirmed on `main` and the branch is
deleted, reproduce the exact bug scenario on production using the Vivacity Testing
Tenant. This is the final gate before closing the bug report.

**Vivacity Testing Tenant — test accounts (production DB):**

| Email | Role in tenant | Use for |
|---|---|---|
| briansismundo@gmail.com | Administrator | Primary QA — can create/edit any record |
| rjdbadua.works@outlook.com | Administrator | Secondary Admin QA |
| rjdb.prsnl@gmail.com | Trainer/Assessor | QA trainer-scoped features |
| khianbsismundo@gmail.com | Trainer/Assessor | QA trainer-scoped features |
| brian@vivacity.com.au | super_admin (platform only) | ⛔ Not for feature QA — RLS blocks tenant register access |

**Rules:**
- Always test from at least one Administrator account AND one Trainer/Assessor account
  when the fix touches a feature both roles can access
- `brian@vivacity.com.au` cannot see tenant registers — do not use it to verify
  tenant-scoped features
- If QA fails on the testing tenant, do not close the bug — open a follow-up fix
  branch immediately

**QA steps (adapt to the specific bug):**
1. Log in to rto.complyhub.ai with `briansismundo@gmail.com` (Administrator)
2. Reproduce the exact action that triggered the original bug
3. Confirm the bug is gone — the feature works as expected
4. Check that no regression is visible in adjacent features on the same page
5. Log out, log in as `rjdb.prsnl@gmail.com` (Trainer/Assessor), repeat the
   relevant steps from the Trainer perspective
6. Report outcome to Khian — pass or fail

**Gate:** Bug must be confirmed fixed from at least Administrator role before
closing. Trainer/Assessor check is required if that role could also trigger the bug.

---

## After the fix ships

Verify using both code inspection and database checks:

**CODE CHECKS:**
1. Does the change match what was planned?
2. If a DB structure change was made, did it apply correctly to production?
3. Test the bug manually — is it fixed?
4. Test the same feature from at least two different user roles.

**DATABASE CHECKS (if DB was touched):**
5. If data was corrupted, sample rows to confirm they are fixed:
   \`\`\`sql
   SELECT * FROM [table] LIMIT 5;
   \`\`\`
6. If RLS was changed, confirm the policy is correct:
   \`\`\`sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   \`\`\`
7. If a trigger was added or changed, confirm it is active:
   \`\`\`sql
   SELECT trigger_name, action_statement FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   \`\`\`
8. If the bug was in an audit cluster, confirm it can be marked resolved in
   `AUDIT-REPORT.md`.

If anything does not match what was designed → flag to Carl immediately.

---

## Key rules to reinforce at every step

- **Multi-tenant isolation is P0.** Any data leakage between tenants is a
  critical incident — escalate to RJ before attempting any fix.
- **Never hardcode credentials.** No Supabase URL, anon key, or service-role
  key as string literals — even as a fallback. Use `import.meta.env` variables.
  This is Cluster 1 of the active audit.
- **Never use `.single()` on queries that could return multiple rows.** Use
  `.maybeSingle()` or `.limit(1)`. The `fetchEffectiveRole()` pattern is a
  known example of this failure.
- **Never add direct Storage calls from the browser.** Always use the gateway
  functions (`documentFiles.ts`, `trainerEvidenceDownload.ts`).
- **All Edge Function auth must be a gate, not optional.** JWT must be verified
  before any data access. `atob()` decoding is not verification.
- **RLS policy changes affect every tenant.** Never touch an RLS policy without
  blast-radius analysis and Carl's sign-off.
- **Never commit or push without Khian's explicit words.** Edit → commit → push
  are THREE separate gates. "yes" or "looks good" do not trigger any of them.
- **Always verify the branch before committing.** Run `git branch --show-current`
  immediately before `git commit`. If it shows `main` — STOP.
- **Migrations are NOT auto-applied on merge.** After every PR that includes a
  migration merges to `main`, apply it to production via MCP immediately.
  Never defer.
- **Never read `supabase/migrations/_archive/`.** That folder contains 3,600+
  dead Lovable-era files. They do not run. Only read files directly in
  `supabase/migrations/` (not subdirectories).
- **Vercel preview and Supabase branch DB are two independent readiness
  gates.** Never assume one being ready means the other is. Check both via
  MCP before telling Khian QA can start.
- **The live database is the source of truth.** If the code and the database
  disagree, trust what is actually in the database right now.
- **Check `AUDIT-REPORT.md` clusters first.** If the bug is already documented
  in Clusters 1–6, the fix path and ownership are already decided. Do not
  duplicate or conflict with that work.
- **Do not run `npm run build`.** It hangs the workstation. Use
  `npm run type-check` and `npm run lint` instead. Vercel is the build gate.
```

---

## Skill 5 of 5 — `cursor-flag-review` (user-level skill — NEWLY DESIGNED 08 July 2026)

> This skill did not exist as a file before today. It was designed during a
> session on the work PC based on Brian's description: "the skill where when a
> PR is opened and I say something cursor flagged this, you call this skill."
> There is no prior "battle-tested" version of this one — treat it as v1 and
> refine it after the first few real uses, the same way the others accumulated
> their rules from real incidents.

**Target path:** `~/.claude/skills/cursor-flag-review/SKILL.md`

**Trigger:** "cursor flagged this", "cursor bot flagged", "bugbot flagged this", "address the cursor comment on PR #[N]", "check what cursor found"

```markdown
---
name: cursor-flag-review
description: >
  Handles a specific finding that Cursor's bot (Bugbot / PR review comment) raised
  on an open ComplyHub PR. Verifies the flagged claim against the actual code and
  live database before treating it as real — Cursor's bot can false-positive — then
  either fixes it on the existing PR branch following the standard commit/push gates,
  or explains why it's a false positive and replies on the PR thread. Trigger when
  Brian says "cursor flagged this", "cursor bot flagged", "bugbot flagged this",
  "address the cursor comment on PR #[N]", or "check what cursor found".
---

# cursor-flag-review

Cursor's automated PR review bot sometimes leaves a comment flagging a possible
issue on an open `rto-compass-hub` PR. This skill handles exactly one flagged
comment at a time — it does not replace the full `/pr-review` workflow, and it
does not run automatically just because a PR exists. It only runs when Brian
explicitly points at a specific Cursor comment.

**Core principle: verify before trusting.** Cursor's bot can be wrong — flag a
non-issue, misread the diff, or miss context that makes the "bug" intentional.
Treat every flag as a claim to investigate, not a fact to act on.

---

## How to trigger

Brian says something like: "cursor flagged this on PR #145" or pastes the bot's
comment text directly.

If Brian doesn't paste the comment text, fetch it:
\`\`\`bash
gh pr view [PR number] --json comments --jq '.comments[] | select(.author.login | test("cursor"; "i"))'
\`\`\`

---

## Step 1 — Understand the claim

Read the flagged comment carefully. Extract:
- Which file(s) and line(s) does it point at?
- What is the claimed problem, in one sentence?
- What does Cursor say the consequence is (crash, data leak, wrong behaviour, etc.)?

Do not proceed until the claim itself is unambiguous. If the comment is vague,
open the PR diff at that file/line to get the actual surrounding code.

---

## Step 2 — Verify the claim against real code and real data

This is the step that separates this skill from "just do what the bot says."

1. Open the actual file at the actual line on the PR branch (not `main`) — read
   enough surrounding context to understand intent, not just the flagged line.
2. **Grep callers** of any function/symbol Cursor flagged — is the claimed failure
   mode actually reachable from how it's called in this codebase?
3. If the claim involves data (null values, missing rows, a specific column
   assumption) — check it against the live database via Supabase MCP (read-only),
   don't take the bot's assumption at face value:
   \`\`\`sql
   SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_name = '[table]' AND column_name = '[column]';
   \`\`\`
4. If the claim involves RLS or tenant isolation — check the actual policy:
   \`\`\`sql
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '[table]';
   \`\`\`
5. Check `rto-compass-hub/CLAUDE.md` and `AUDIT-REPORT.md` — is this a known,
   already-decided pattern (see PD-001–PD-006 in the `complyhub-bug-fix` skill)?
   If so, the flag may be a false positive by design.

**Gate:** Reach one of three verdicts before moving on:
- **CONFIRMED** — the claim is real, reproduce the exact failure scenario in one sentence
- **FALSE POSITIVE** — explain specifically why the flagged code is actually safe/intentional
- **NEEDS BRIAN'S JUDGEMENT** — ambiguous, present both sides and ask

Report the verdict to Brian in plain English before doing anything else. Do not
skip straight to a fix "just in case."

---

## Step 3 — If FALSE POSITIVE

- Do not change any code.
- Draft a reply comment for the PR thread explaining specifically why the flagged
  code is safe (cite the line, the actual behaviour, and — if relevant — the
  known decision or the DB/RLS check that disproves the claim).
- Only post the reply after Brian confirms: `gh pr comment [PR number] --body "[reply]"`

## Step 4 — If CONFIRMED

Follow the exact same gated fix flow as the rest of the branch work protocol —
this is not a shortcut path:

1. Check out the PR's branch (not a new branch — this fix belongs on the existing PR):
   \`\`\`powershell
   git checkout [pr-branch-name]
   git pull
   \`\`\`
2. Run `git branch --show-current` — confirm it matches the PR branch, not `main`.
3. Write the fix plan in plain English (what changes, which files, why) — same
   structure as Step 6 of `complyhub-bug-fix`. Present it to Brian.
4. **Gate:** wait for Brian's explicit approval before touching any file.
5. Apply only the fix needed to resolve the flagged issue — no unrelated cleanup.
6. Verify:
   \`\`\`powershell
   npm run type-check
   npm run lint
   \`\`\`
   If the fix touches real logic (not just wording), add or update a unit test
   that would fail without the fix — same standard as any other logic change.
7. Present the diff to Brian.
8. **Gate 1 — Commit:** only after Brian says "commit it".
9. **Gate 2 — Push:** only after Brian says "push it".
10. Once pushed, reply on the PR thread confirming the fix:
    \`\`\`bash
    gh pr comment [PR number] --body "Fixed in [commit hash] — [one-line summary]"
    \`\`\`
11. Do not approve or merge the PR as part of this skill — that still goes through
    the normal `/pr-review` Stage 4/5 flow or Brian's direct merge decision.

---

## Rules

- Never trust a Cursor flag at face value — Step 2 verification is mandatory,
  not optional, even when the flag "looks obviously right."
- Never commit or push without Brian's explicit words — same three-gate rule
  as every other branch workflow (edit ≠ commit ≠ push).
- Never open a *new* branch for this — the fix belongs on the PR's existing branch.
- Never merge or approve the PR from within this skill.
- If verification surfaces a DIFFERENT, unrelated issue than what Cursor flagged,
  report it separately — do not silently fix things outside the scope of the
  flagged comment without telling Brian first.
- If the claim touches multi-tenant isolation, RLS, or billing — treat a CONFIRMED
  verdict as P0 and say so explicitly, same severity language as `complyhub-bug-fix`.
```

---

## After running this on the home PC

Report back:
1. Which of the 5 files were created (all should be new on a fresh home PC setup)
2. Confirm `/audit-branch-drift`, `/branch-catchup` show up when skills are listed
3. Confirm `complyhub-bug-fix` and `cursor-flag-review` trigger on their described phrasing
4. Confirm `/pr-review` works when Claude Code is opened rooted at `complyhubworkspace`

If `rto-compass-hub` and `complyhub-kb` aren't cloned yet on the home PC, clone them
from GitHub (`ComplyHub-ai/rto-compass-hub`, `ComplyHub-ai/complyhub-kb`) before
testing any skill that touches the codebase or KB.
