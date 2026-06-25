# Branch Merge Cleanup Plan
**Date:** 16 June 2026
**Goal:** Close all open branches safely until only `fix/local-run` and `main` remain.

---

## Branch Inventory

### Category A — Cursor critical-bug fixes (independent, all cut from main)
Each has exactly one focused fix. Do not chain — all branch independently from `main`.

| PR | Branch | Fix summary |
|---|---|---|
| #36 | `cursor/agenda-report-summaries-8c64` | Governance — read-only trainer and SSO report summaries in Live Meeting |
| #35 | `cursor/past-meeting-editing-8c64` | ✅ MERGED 17 June 2026 — enable editing of past and completed meetings |
| #34 | `cursor/governance-agenda-status-filters-ac7f` | ✅ MERGED 16 June 2026 — exclude archived/inactive records from agenda and attendee dropdown |
| #33 | `cursor/calendar-tenant-filter-ac7f` | ✅ MERGED 16 June 2026 — calendar tenant scoping, super_admin cross-tenant data leak |
| #32 | `cursor/bulk-edit-rto-division-6e6d` | RTO Division/Section in bulk edit panel |
| #25 | `cursor/critical-bug-investigation-b5c7` | Trainer product approval authorisation |
| #24 | `cursor/critical-bug-investigation-3dff` | Trainer evidence deletion recompute |
| #23 | `cursor/critical-bug-investigation-6f72` | Destructive TAS and trainer delete regressions |
| #19 | `cursor/critical-bug-investigation-7690` | Assessment tool lifecycle status on edit |
| #22 | `cursor/critical-bug-investigation-f04e` | Consultant access for tenant hub RPCs |
| #21 | `cursor/critical-bug-investigation-fef7` | Assessment tool legacy status handling |
| #20 | `cursor/critical-bug-investigation-ff3a` | Assessment tool lifecycle regressions |
| #16 | `cursor/critical-bug-investigation-29c4` | Batch TGA task save auth context |
| #18 | `cursor/critical-bug-investigation-2bd6` | DAP Edge Function authorisation gaps |

### Category F — New PRs (appeared 17 June 2026 — not in original inventory)

| PR | Branch | Notes |
|---|---|---|
| #43 | `cursor/critical-bug-investigation-00a6` | ✅ MERGED 19 June 2026 — QI register ID sequence fix, rollup lockdown, invite role ceiling |
| #41 | `cursor/critical-bug-investigation-25dd` | Fix user security summary tenant scope — likely security fix, needs review |
| #39 | `cursor/bulk-upload-evidence-wizard-63d9` | Add retrospective bulk upload entry points for AI trainer onboarding — feature work |
| #38 | `cursor/calendar-non-governance-meetings-fdb1` | feat(calendar): Restore non-governance meeting scheduling and minutes — feature work |
| #37 | `cursor/multi-training-products-assessment-tools-4f90` | ✅ MERGED 17 June 2026 — multi-select training products and TAS-scoped units |

---

### Category B — Feature/fix branches (larger, higher risk)

| PR | Branch | Notes |
|---|---|---|
| #29 | `feat/tas-consultation-overlays` | ✅ MERGED 18 June 2026 — consultation links, regulatory overlays, QI autolog, archive cols, custom_id seeds. Post-merge: regenerate types.ts |
| #27 | `fix/billing-pricing-display` | ✅ MERGED 13 June 2026 — no action needed |
| #28 | `fix/deploy-unblock` | ✅ MERGED 13 June 2026 — no action needed |
| #26 | `rescue/pending-work-20260613` | ✅ MERGED 18 June 2026 — all blockers resolved, branch merged to main by Brian |

### Category C — Backup snapshots (no PR, delete only)

| Branch | Action |
|---|---|
| `backup/main-local-20260613` | Delete — safety snapshot, not for merging |

### Category E — New branch (appeared during review, 16 June 2026)

| Branch | PR | Notes |
|---|---|---|
| `cursor/bulk-edit-rto-division-6e6d` | None yet | Just appeared on main — needs investigation before actioning |

### Category D — Old cursor branches (no PRs, 663+ commits behind main)

| Branch | Action |
|---|---|
| `cursor/multi-product-type-plan-9506` | Close — likely abandoned |
| `cursor/tas-product-scope-c66d` | Close — likely abandoned |
| `cursor/tga-scope-status-normalisation-c66d` | Close — likely abandoned |
| `cursor/trainer-role-policy-fix-c66d` | Close — likely abandoned |
| `cursor/v-tas-on-scope-products-c66d` | Close — likely abandoned |

### Excluded from review
- `fix/local-run` — active working branch, excluded from this process

---

## Phases

### Phase 1 — PR review and merge (one PR at a time)

---

## ⚠️ Per-PR procedure — follow every step in order, every time

This is the canonical checklist. Do not skip steps. Do not split the report across messages.

---

### STAGE 1 — Full review + both dry-runs (do all of this before presenting anything to Brian)

**Step 1 — Fetch latest main and pre-check divergence**
```powershell
git checkout fix/local-run
git fetch origin
```
Then cross-reference the PR's changed files against `diverged-files-raw.txt` (all files fix/local-run changed):
- Any hit = this file changed on BOTH sides → it WILL conflict (hard or soft) in Phase 5
- For each hit, check `phase5-conflict-tracker.md`:
  - Already listed → this PR adds a layer; flag as deepened/layered in the report
  - Not listed → NEW conflict file; pull up both versions, classify hard vs soft, add to tracker
- Remember soft conflicts auto-merge silently — a hit that does NOT appear as a CONFLICT marker in the dry-run is a soft conflict, not a clean file. Both-sides hits are never "clean".

**Step 2 — Get PR metadata and CI status**
```bash
gh pr view [number] --json title,body,author,baseRefName,headRefName,state,additions,deletions,changedFiles,labels
gh pr checks [number]
```

**Step 3 — Get the diff**
```bash
gh pr diff [number]
```

**Step 4 — Fetch the branch and inspect key files**
```bash
git fetch origin [branch-name]
git show origin/[branch-name]:path/to/file  # for any file not visible in diff
```

**Step 5 — Schema check** (always)
- Confirm every table/column the PR queries against production (`gdwhlstfguxarnxasrrs`)
- Flag any column that cannot be confirmed

**Step 6 — TypeScript check** (always)
```powershell
git checkout origin/[branch-name] --detach
npx tsc --noEmit
git checkout fix/local-run
```
Do not trust the PR description's self-reported build status.

**Step 7 — config.toml check** (any PR touching Edge Functions)
- Check if any new edge function is registered in `config.toml`
- Missing entry → HIGH if function is new; LOW if already deployed to production

**Step 7b — Existing data impact check** (any PR touching forms, mutations, or effects on existing records)
1. Do any `useEffect` hooks filter or clear saved form state based on external data? What happens when that data returns empty — does it silently wipe saved values?
2. Does any mutation do delete-then-insert? If the insert fails after delete, what state is left? Rate as MEDIUM minimum.
3. For edit modals — if the dedicated pre-fill hook fails, is there a fallback to data already in memory? If not, flag MEDIUM.
4. **For any mutation that begins with a lookup (`maybeSingle()` / `single()`): check what happens when the record is not found. A silent `return` (no throw) is treated as success by React Query — `onSuccess` fires and the UI shows a success toast even though nothing was changed.** Any early-exit path in a mutation `mutationFn` that does not throw must be flagged MEDIUM. (#23 miss: `if (!record) return` in the complete-delete mutation.)

**Step 7c — Blast Radius & Foresight pass** (every PR — this is where "X will break Y" gets caught)

> Principle: the diff tells you what changed; foresight comes from what the change is *connected to*. Every change connects along three axes — other code (callers), live data (existing rows), and the other branch (drift). Run all three lenses before writing the verdict. Both real misses this session (#37 live-data wipe, #24 `as any` RPC break) would have been caught here.

**Lens 1 — Caller / contract blast radius** (catches runtime breaks TSC misses under `strict: false` + `as any`)
- For every exported symbol, RPC name, query key, or column the PR changes, grep ALL callers across the repo — not just the changed file:
  ```bash
  grep -rn "functionOrSymbolName" src/ supabase/
  ```
- If a function signature, return shape, or hook output changed → confirm every caller still matches.
- **Any `as any` on a `.rpc()` or `.from()` call → manually verify the contract against the DB** (`pg_proc` for RPC args, `information_schema.columns` for columns). `as any` blinds TSC — this is the #24 failure mode. Standing rule, every time.
- For mutations: list what the mutation writes, then grep the query keys that READ that data, and confirm each is invalidated. Stale-cache bug = #24's second failure.

**Lens 2 — Live-data reality check** (catches "this can't be, because live data")
- For any code that reads, filters, or writes existing records, query production (`gdwhlstfguxarnxasrrs`) BEFORE approving:
  - Null rates on columns the code assumes are populated
  - Distinct values for any enum/status the code branches on (legacy values still present?)
  - **For any column used in a filter expression (`=== 'x'`, `.eq('col', val)`, `.filter(c => c.col === ...)`): run `SELECT DISTINCT col FROM table LIMIT 20` against production to confirm the actual values match what the code expects.** Swapping one column for another with the same type is not safe — semantics must be verified. (#23 miss: `source` swapped for `consultation_source` without checking that `source` holds provenance values, not stakeholder types.)
  - Row counts for the "degraded" case the code does not handle (e.g. #37: tools with units but no active TAS build)
- Force this question every time: **"What happens when this runs against a row created 18 months ago?"**

**Lens 3 — Drift-interaction read** (catches semantic soft-conflicts before Phase 5)
- If the PR touches any file in `both-sides-changed.txt`, read fix/local-run's version of the same region — not just main's.
- Ask: after the merge, do the two changes COMBINE into something wrong, even if git auto-merged them cleanly? Soft conflicts never show a marker.

**Standing checks (make explicit):**
- **RLS / role matrix** — does the query behave for super_admin / consultant / other roles, not just the author's tenant? Check policies on every table the PR touches.
- **Edge deploy state** — config.toml + deployed function version + code all in sync?

**Three foresight questions to answer in the report:** (1) What else calls this? (2) What does live data actually look like? (3) What is fix/local-run doing to the same spot?

**Step 8 — Dry-run 1: PR branch → main**
```powershell
git checkout main && git pull
git checkout -b dry-run/pr[number]-test
git merge origin/[branch-name] --no-commit --no-ff
# Note: clean / conflicts
git merge --abort
```

**Step 9 — Dry-run 2: simulated post-merge main → fix/local-run**
```powershell
# Still on dry-run/pr[number]-test (contains PR changes on top of main)
git merge origin/fix/local-run --no-commit --no-ff
# Compare every conflict file against phase5-conflict-tracker.md:
#   - NEW file not in tracker → new conflict, flag it
#   - File already in tracker AND this PR touches it → deepened conflict, flag it
#   - File already in tracker AND this PR does not touch it → pre-existing, note only
git merge --abort
git checkout fix/local-run
git branch -D dry-run/pr[number]-test
```

---

### STAGE 2 — Present ONE complete report to Brian

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
Build check: PASS / FAIL
CI: Vercel [pass/fail — reason if fail] / Supabase Preview [pass/skip/fail]

Foresight (Step 7c):
  - Callers/contract: [grep results — who else calls changed symbols/RPCs/keys; as-any contracts verified?]
  - Live data: [what production data actually looks like for the degraded case — or N/A]
  - Drift interaction: [if PR touches a both-sides file, how do the two changes combine — or N/A]
  - RLS/roles: [behaves for all roles? — or N/A]

Dry-run PR → main: CLEAN | [list conflicts]
Dry-run main → fix/local-run:
  - New conflicts: [list or NONE]
  - Deepened conflicts: [list or NONE]
  - Pre-existing (no change): [count] files, already tracked

Notes for Carl (Phase 5): [anything that will affect the resync]

Fixes needed before merge: [list or NONE]
```

→ **Log issues to `phase1-verdicts-partial.md` at this point** — before any fixes are made.

---

### STAGE 3 — Fix, commit, push

- Make every fix identified in the report
- Run TypeScript check again after fixes
- **Update `phase1-verdicts-partial.md`** — mark each issue as resolved, note what was changed
- Present the exact diff to Brian
- Wait for explicit "commit it" before committing
- Wait for explicit "push it" before pushing

**⚠️ If dry-run 1 found a conflict with main — merge main into the branch as part of fixing:**
```powershell
git checkout [branch-name]
git merge origin/main --no-ff
# resolve conflict markers in the conflicted files
git add [resolved files]
git commit  # merge commit
```
Do NOT just edit the conflicted file and push without doing the merge. GitHub's merge check detects divergence between the two branch tips — editing the file content on the PR branch does not resolve that divergence. The merge commit is what clears the conflict indicator on GitHub. (#23 miss: edited TrainerProfileDrawer.tsx directly, pushed, GitHub still showed conflict.)

---

### STAGE 4 — Brian approves and merges on GitHub

- Approve on GitHub:
```bash
gh pr review [number] --approve --body "[one-line summary for Carl/Angela]"
```
- Brian merges and deletes branch on GitHub

---

### STAGE 5 — Verify and close out

**Verify merge + branch deletion:**
```bash
gh pr view [number] --json state,mergedAt,mergedBy
gh api repos/ComplyHub-ai/rto-compass-hub/branches/[branch-name]  # expect 404
```

**Update all three docs** (do not skip any):
1. `phase1-verdicts-partial.md` — mark as MERGED AND DELETED with date
2. `completed-prs.md` — add full entry: what the PR did, issues found, fixes we made, conflicts with main, conflicts with fix/local-run
3. `phase5-conflict-tracker.md` — add PR section for any new or deepened conflicts; update running summary table
4. `PLAN.md` status table — mark PR as merged ✅, update "next"

---

---

### Phase 2 — Triage verdicts
Brian + Carl review `phase1-verdicts.md`.

For each PR decide:
- **APPROVE** → add to merge queue
- **REQUEST CHANGES** → decide: fix it now, or close it?
- **CLOSE** → no action needed, just close PR and delete branch

⚠️ For `rescue/pending-work-20260613` and `feat/tas-consultation-overlays`: Angela must confirm intent before any decision is made.

**Output:** annotated copy of verdicts with Brian/Carl decisions noted.

---

### Phase 3 — Merge approved PRs into main
Merge in the sequence recommended by the agent (dependency order, least-conflict-first).

Rules:
- One PR at a time — do not batch merge
- Verify CI passes after each merge before moving to the next
- Brian can merge approved PRs to `main` directly

---

### Phase 4 — Close and delete remaining branches
For all non-merged PRs:
- Close the PR on GitHub
- Delete the remote branch

For Category C and D branches (no PRs): delete remote branch directly.

---

### Phase 5 — Resync fix/local-run with main
After `main` is clean:
- Merge `main` into `fix/local-run` to resolve the 716-commit drift
- Conflicts are expected — Carl must be involved
- Do not attempt this step without Carl present

---

## Hard rules
- Brian can merge approved PRs to `main` directly
- Phase 5 does not start until Phase 3 and 4 are fully complete
- Always run both dry-runs (PR → main, then main → fix/local-run) — never skip either
- Update all three docs (verdicts, completed-prs, conflict-tracker) after every merge

---

## Status

| Phase | Status |
|---|---|
| Phase 1 — PR review + merge | IN PROGRESS — #43 #41 #39 #38 #37 #36 #35 #34 #33 #32 #31 #30 #26 #25 #24 #23 #22 #21 #20 merged ✅ — next: #19 |
| Phase 2 — Triage | MERGED INTO PHASE 1 (review + merge done together) |
| Phase 3 — Merges | MERGED INTO PHASE 1 |
| Phase 4 — Close/delete | NOT STARTED |
| Phase 5 — Resync fix/local-run | NOT STARTED |
