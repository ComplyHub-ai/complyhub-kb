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

```
/audit-branch-drift
```

---

## Step-by-step process

### Step 1 — Fetch latest from both branches

```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git fetch
```

Report any fetch errors immediately and stop.

### Step 2 — Show commits on staging not on main

```powershell
git log origin/main..origin/staging --oneline
```

This shows what Lovable (RJ) has added to staging that hasn't been ported to main yet.

### Step 3 — Show commits on main not on staging

```powershell
git log origin/staging..origin/main --oneline
```

This shows what engineering work has landed on main that staging doesn't have yet.

### Step 4 — Check if branches are identical

```powershell
git ls-remote origin main staging
```

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

```powershell
gh run list --workflow=deploy-edge-functions.yml --repo ComplyHub-ai/rto-compass-hub --limit 20 --json createdAt,conclusion,headSha
```

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
