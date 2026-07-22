# PR process automation audit — 11 July 2026

> Read-only audit of Angela's new PR process. No GitHub workflows, rulesets,
> PRs, or Angela's live automation config were changed.
>
> **PR queue status (single source of truth):** `pr-review-open-prs.md` in this
> same directory. This file is background on the automation only — not a second
> queue log.
>
> **Update — 13 July 2026: nearly all "Recommended actions" below are now DONE.**
> See "Remediation log (13 July 2026)" section near the end for what changed,
> what's still outstanding, and the two PRs that did it. This audit's findings
> are kept as-is below for the historical record of what was wrong; don't treat
> the "High severity" / gaps sections as current state — check the remediation
> log first.

## Scope

Multi-agent review of:

- `rto-compass-hub/.github/CODEOWNERS`
- `rto-compass-hub/.github/labeler.yml`
- `.github/workflows/auto-merge.yml`
- `.github/workflows/label-pr.yml`
- `.github/workflows/stale-sweep.yml`
- `.github/workflow/dependabot-auto-merge.yml`
- live GitHub PR queue and `main` ruleset (read-only `gh` queries)
- `.claude/commands/pr-review.md`

Angela's announced policy:

- **Tier A** — content/UI/copy/docs; no second reviewer; auto-merge on green
- **Tier B** — DB migrations, RLS, Edge Functions, auth/tenant/billing; one RJ or
  Khian approval
- CODEOWNERS auto-requests reviewers
- auto-merge when approved + green
- daily stale flag after ~2 days idle
- review targets + ~5 PR WIP limit (human discipline, not automated)

## What each agent did

| Agent | Task |
|---|---|
| **Scout** | Read workflow files + handoff; searched `rto-compass-hub/docs` for a written PR policy |
| **Tinker (queue)** | Listed open PRs, labels, reviewers, checks, merge state, dry-run merges, `tsc` |
| **Tinker (mechanical)** | Compared changed file paths vs tier labels; flagged missing labels/reviewers |
| **Compass** | Designed safer mixed-scope classification on top of Tier A/B (recommendations only) |
| **Sentinel** | Verified live ruleset, CODEOWNERS enforcement, CI gap, Dependabot workflow, safety |

## Scout — policy cross-check

- Tier A/B split, CODEOWNERS, and Tier A auto-merge are implemented in repo config.
- No dedicated PR policy doc in `rto-compass-hub/docs` — rules live in `.github/` only.
- Stale sweep: weekdays 23:00 UTC, **2 calendar days** (not 2 business days).
- Review targets and WIP limit: **not automated**.
- Dependabot auto-merge file is under `.github/workflow/` (singular) — GitHub ignores it.

## Tinker — queue and mechanical findings

**Snapshot (11 July 2026):**

- **28 open PRs** (>> Angela's ~5 WIP target)
- **5 new since 10 July doc:** #178, #179, #180, #181, #183
- **7 merge conflicts:** #111, #122, #144, #152, #153, #159, #161
- Newest five: all dry-run **clean** vs `main`; all pass `npx tsc --noEmit`
- **#181, #179:** banned-pattern hits need human triage (`as any`, `console.*`)

**Label / reviewer gaps:**

| PR | Policy tier | GitHub label | Reviewers | Issue |
|---|---|---|---|---|
| #183 | Tier B | `tier-b` | none | draft — OK blocked |
| #181 | Tier A | — | Khian | label never ran |
| #180 | Tier B | — | Khian + RJ | label never ran; auto-merge ON, still blocked |
| #179 | Tier B | — | **none** | billing + AppContext; **no CODEOWNERS request** |
| #178 | Tier B | `tier-b` | Khian + RJ | `types.ts` triggers Tier B on UI-heavy PR |
| #173 | Tier B | — | Khian only | legacy; prior REQUEST CHANGES verdict unchanged |

**Automation behaviour:**

- Label workflow ran on some newer PRs only; legacy queue not backfilled.
- Manual auto-merge on #178/#179/#180 did **not** bypass ruleset — still BLOCKED.
- Draft gate works (#181, #183).

**Merged since 10 July tracking doc (no longer open):** #165, #167, #170–#177, #182;
#177 SSO monthly report form on `main`. Details in `pr-review-open-prs.md`.

## Compass — future classification (not implemented)

Keep Angela's **Tier A / Tier B** as official policy. Add optional scope labels later:

- `scope:mixed`, `classification:uncertain`, `automerge:eligible`
- Rule: **highest risk wins** — one sensitive path → Tier B
- Mixed or uncertain → no unattended auto-merge

## Sentinel — live safety review

**Confirmed working:**

- Tier B CODEOWNERS: #180 had all required checks green but stayed **BLOCKED**
  until code-owner approval.
- Ruleset `require_code_owner_review: true` backstops label races.
- Force-push blocked; squash merge enabled.

**High severity:**

- **CI workflow is `disabled_manually`.**
- Ruleset required checks: **Vercel**, **Vercel Preview Comments**, **Cursor Bugbot**
  only — not lint, type-check, tests, migration guards, or security scans.
- `vite build` does not run `tsc` — **unattended Tier A auto-merge is not safe**
  until CI is re-enabled and added to required checks.

**Other gaps:**

- Dependabot auto-merge dormant (wrong folder); deps may fall through as Tier A.
- `auto-merge.yml` does not honour `blocked` / `wip` / `do-not-merge`.
- Ruleset not version-controlled in repo — drift risk.
- `strict_required_status_checks_policy: false` — stale branches can merge.
- `delete_branch_on_merge: false`.
- Legacy ~28 PRs outside automation backfill.

## Consolidated conclusion

| Path | Safe to use now? |
|---|---|
| Tier B + RJ/Khian approval | Yes — with manual `tsc`/lint/migration checks |
| Unattended Tier A auto-merge | **No** — until CI required |
| Legacy open queue | Manual triage only |

Angela's two-tier design is sound; gaps are CI gate, legacy queue state, dependency
handling, and override labels. **No repo or GitHub config was changed in this audit.**

## Recommendations for Angela (11 July 2026)

Draft for Khian → Angela. Respectful summary of implications, tradeoffs, and
what to change — derived from this audit. **Nothing below has been applied to
GitHub unless Angela approves.**

### What's working well

- **Tier B is enforced.** Sensitive PRs stay blocked until RJ or Khian approves —
  confirmed on live PRs with green checks but no merge.
- **Path-based classification is conservative** — any sensitive path → Tier B.
  Right default for multi-tenant / data-safety discipline.
- **Tier A auto-merge wiring is correct in principle** — arms only for `tier-a`,
  non-draft PRs.
- **Stale sweep** flags idle PRs without auto-closing; `wip` / `blocked` exempt.

The direction (faster low-risk merges, human gate on high-risk) is right.

### Where it's not reliable yet

1. **CI isn't in the merge gate.** Main CI is disabled. Ruleset requires Vercel +
   Vercel Preview Comments + Cursor Bugbot only. `vite build` ≠ type-check, lint,
   tests, migration/security guards. Tier A could auto-merge with issues CI would
   catch.
2. **Legacy queue not backfilled.** ~28 open PRs; labels/reviewer requests only on
   some newer PRs (e.g. billing PR with no backend reviewer requested).
3. **Edge cases:** Dependabot workflow in wrong folder (dormant); `blocked` /
   `do-not-merge` don't stop auto-merge from arming; ruleset not in git (drift risk).

**Mixed-scope PRs (future, not urgent):** keep Tier A/B; later add `scope:mixed` /
`classification:uncertain` so humans see non-simple PRs even when path rules apply.

### Recommended actions (priority order)

**Do now — before leaning on Tier A auto-merge for new PRs**

| # | Action | Why |
|---|---|---|
| 1 | Re-enable CI; add blocking jobs to `main` ruleset (type-check, lint, tests, migration guards, security checks) | "Green" must mean what the team expects |
| 2 | Clear legacy queue deliberately (~28 PRs) — push/reopen or label manually | Automation won't backfill old PRs by itself |
| 3 | Park backlog risk — drafts or `do-not-merge` on PRs not yet re-triaged | Avoid surprise merges while draining queue |

**Quick config fixes (low effort, high safety)**

| # | Action | Why |
|---|---|---|
| 4 | Honour `do-not-merge` / `blocked` / `wip` in `auto-merge.yml` | Human stop labels actually work |
| 5 | Fix or remove Dependabot workflow (move to `.github/workflows/` or Tier B deps) | Close dependency bypass |
| 6 | `strict_required_status_checks_policy: true` once CI is back | Re-validate against latest `main` |
| 7 | `delete_branch_on_merge: true` | Less branch clutter |

**Document / process**

| # | Action |
|---|---|
| 8 | Export live ruleset into repo or KB — not version-controlled today |
| 9 | Queue source of truth: `pr-review-open-prs.md` (workspace root) while backlog clears |
| 10 | Optional later: mixed-scope labels + single classifier — after above is stable |

### What not to change

- Tier A / Tier B policy — keep it.
- RJ + Khian as Tier B owners — working.
- Auto-merge goal for Tier A — keep; don't lean on it until CI is required.

### Khian / team commitments

- Triage open queue in `pr-review-open-prs.md`.
- Tier B: review + manual technical checks until CI is back.
- Flag sensitive PRs that are unlabelled or missing reviewers.
- No GitHub config changes without Angela's go-ahead.

### One-line summary for Angela

Red light works (risky PRs need approval). Green light isn't fully safe yet (full
tests aren't required; old PRs weren't re-tagged). Re-enable CI, drain the backlog,
then auto-merge will deliver the speed you intended without cutting data-safety corners.

## Plain English

Five agents checked Angela's new merge rules against real GitHub behaviour. The
important part works: risky changes cannot merge without RJ or Khian approving.
The weak part is that simple changes could still auto-merge without full tests
running, and older pull requests were never given the new labels or reviewer
requests. Nothing was changed in GitHub — only documented. **For which PRs are
open, merged, or blocked, use `pr-review-open-prs.md` only.**

---

## Remediation log (13 July 2026)

Unlike this audit, everything below **was actually applied to live GitHub config**
— tracked here so the fix history isn't only in PR diffs. Two PRs did this work:
[#188](https://github.com/ComplyHub-ai/rto-compass-hub/pull/188) (CI cost/scoping)
and [#192](https://github.com/ComplyHub-ai/rto-compass-hub/pull/192) (automation
gaps), both merged to `main` same day. Cross-reference against the "Recommended
actions (priority order)" table above — item numbers below match that table.

**Done:**

- **#1 — CI re-enabled and required.** All 5 previously `disabled_manually`
  workflows (`CI`, `Deploy Edge Functions`, `Deploy MCP Function`, `Apply
  Supabase Migrations`, `Migration Drift Check`) are back on. `ci.yml`'s
  `lint`, `single-guard`, `security-guards`, and `edge-functions` jobs are now
  scoped to only the files a PR actually changes (not the whole repo), so
  legacy/pre-existing issues can't fail a new, unrelated PR. `main`'s required
  status checks now include `Type check (blocking)`, `Lint (blocking)`,
  `Block .single() usage (changed files only)`, `Migration guards (new files
  only)`, and `Security checks (changed files only)`, alongside the existing
  `Vercel` / `Vercel Preview Comments` / `Cursor Bugbot`. The `unit-tests` job
  was **removed entirely** (Carl's call) rather than left unrequired — it had
  8 pre-existing failures unrelated to any given PR, confirmed by running the
  suite directly against `main` before deciding.
- **#4 — `blocked` / `wip` / `do-not-merge` now honoured.** Both `auto-merge.yml`
  (Tier A) and the newly-activated `dependabot-auto-merge.yml` skip arming
  auto-merge if a PR carries any of these labels. Took 2 follow-up rounds after
  Cursor Bugbot review caught real gaps in the first pass: (a) the Dependabot
  workflow's label check read `github.event.pull_request.labels`, which doesn't
  exist at all for its `check_suite`/`workflow_run` triggers — fixed by
  re-fetching the PR live via the API instead of trusting the event payload;
  (b) `auto-merge.yml`'s trigger list was missing `unlabeled`, so removing a
  stop label from a `tier-a` PR never re-triggered the workflow to re-arm
  auto-merge — fixed by adding `unlabeled` to the trigger types.
- **#5 — Dependabot workflow fixed and activated.** Moved from
  `.github/workflow/` (singular — GitHub silently ignores this folder) to
  `.github/workflows/`. It had correct logic (only patch/minor/security-advisory
  updates, only after checks pass) the whole time, just never ran.
- **#6 — `strict_required_status_checks_policy: true`.**
- **#7 — `delete_branch_on_merge: true`.** Confirmed working — both PR #188's
  and #192's branches were auto-deleted on merge.
- **Labeler case-sensitivity bug found and fixed** (not in the original audit —
  found while doing this remediation): `labeler.yml`'s `auth`/`role`/
  `permission`/`billing`/`tenant` keyword patterns were lowercase-only, so
  PascalCase files (`AuthGate.tsx`, `useBillingState.ts`, `TenantCard.tsx`, most
  of the actual sensitive frontend code in this repo) were silently
  misclassified `tier-a`. Verified with `minimatch` directly against real
  repo filenames before and after the fix. Now case-insensitive via character
  classes (`*[Aa]uth*` etc.).

**Partially done / interim measure, not the real fix:**

- **#2 — Legacy queue not backfilled.** Rather than reopening/pushing all ~30
  open PRs to trigger the labeler (risk of side effects mid-triage), all 19
  previously-unlabelled open PRs were manually labeled `tier-b` as a blanket
  safety default — this guarantees human review, it is **not** the same as
  each PR having been through actual mechanical/tier classification. Re-tier
  individual PRs to `tier-a` as they're actually reviewed, if warranted.
- **#3 — Park backlog risk.** All 5 open Dependabot PRs (#68–#72) and the 19
  PRs above now carry `do-not-merge` (Dependabot) or `tier-b` (the rest) —
  nothing in the current open queue can auto-merge unattended.

**Not done:**

- **#8 — Export live ruleset into repo/KB.** Still only visible via
  `gh api repos/ComplyHub-ai/rto-compass-hub/rules/branches/main` — no
  version-controlled copy exists yet.
- **#9/#10** — unchanged from this audit; still applicable.

**Access note:** applying #1/#6/#7 required repo **admin** permissions —
Khian initially had `maintain` only and the API call 404'd (GitHub obscures
permission errors on this endpoint). Carl granted admin access mid-session to
unblock it.

### Plain English (remediation)

Almost everything this audit flagged as broken has now been fixed and turned
on for real, not just written down. The full safety-check pipeline is back on
and required before anything can merge, and it only checks the parts of a
pull request that actually changed — so old, unrelated problems elsewhere in
the codebase can't block someone's new work anymore. The "stop merging this"
label now actually works in both directions (adding it blocks, removing it
un-blocks), the robot that auto-merges small dependency updates is switched on
properly for the first time, and a hidden bug that caused the risk-labeling
system to miss most capitalised file names (which is most of the real
security-sensitive code) has been fixed too. The one thing genuinely not done
yet is going through the ~30 already-open pull requests one by one — for now
they've all been marked "needs a human to look at this" so nothing slips
through by accident while that happens.
