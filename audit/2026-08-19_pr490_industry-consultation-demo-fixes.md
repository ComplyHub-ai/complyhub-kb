# Audit — PR #490

> **Date:** 19 August 2026 (audit written); **Merged:** 19 August 2026 00:56 UTC
> **Scope:** Industry Consultation & Surveys pre-demo fixes — Consultation Plans (sector picklist,
> status enum, one-click edit), survey publish link, dashboard field-name bug, survey PDF export
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked from
> `industry-consultation-demo-audit-2026-08-19.md` (workspace root, pre-existing manual audit doc)
> plus a fresh-eyes adversarial subagent review in-session; no intermediate decision-lock `.md` file

---

## Summary

Angela ran the "7.3 Industry Consultation" demo script manually against `main` and flagged issues;
a parallel 6-agent + 2 live-DB-check audit (`industry-consultation-demo-audit-2026-08-19.md`)
produced a High/Medium finding list. This branch fixed the Medium findings (sector picklist,
one-click edit, real survey PDF export) plus carried forward an earlier, unreviewed commit
(`5b452f4ee`) that fixed the High-risk enum/dashboard/publish-routing findings.

**Critical catch:** a fresh-eyes adversarial subagent review of the *whole branch* (not just the
session's own diff) against `origin/main` — the exact commit Angela had just validated — found 5
confirmed bugs, including one that defeated the entire point of the original fix: the new survey
publish flow minted a link in the wrong format, so a freshly built survey's public link was still
dead, just via a different failure mode than before. All 5 were fixed before merge.

PR #490 touched **23 files** (+2,366 / −1,196 lines across the full branch history), **no
migrations**, **no edge functions**. Also required hand-reconciling a merge conflict against a
concurrent main-line feature (training-product-picker rework, PR #441) and fixing 6 pre-existing
lint warnings in unrelated files that were blocking the merge commit's pre-commit hook.

**Branch:** `fix/industry-consultation-demo` (merged) · **Merge commit:** `b473d6306` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/490

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Consultation Plans | Selecting "Archived" status threw a DB error | Form offered a status the DB check constraint doesn't accept |
| Dashboard | "Qualifications Covered" / "High-Risk Gaps" always showed ~0 / "Unknown" | Code read `qualification_code`, a field that doesn't exist on `industry_consultation_records`; real column is `training_product_code` |
| Surveys | "Copy the public link" was a dead end from the Surveys tab | No code path ever generated a `public_token` for a survey built there |
| Consultation Plans | Industry Sector was free text, script implied a picklist | Two separate plan-creation forms, both using a raw `Input` |
| Consultation Plans | Viewing a plan required view-then-Edit, two clicks | List item click only set selection, not edit mode |
| Surveys | "Export to PDF" was `window.print()`, not a real PDF | No PDF renderer wired up despite one already existing elsewhere in the codebase |
| **(fresh-eyes finding)** Surveys | New publish flow still produced a dead link | `secureId()` minted a UUID; `SurveyDispatcher.tsx` routes `/s/:token` by shape, and a UUID gets misrouted to an unrelated legacy survey system |
| **(fresh-eyes finding)** Consultation Plans | Plan creation could show a success toast for a save that didn't happen | `PlanStage.tsx` sent `status: 'planned'` (DB rejects it) and `createPlan` used `mutate()` instead of `mutateAsync()`, so the surrounding `try/catch` could never actually catch the failure |
| **(fresh-eyes finding)** Consultation Plans | Sector displayed as a lowercase code (`construction`) instead of a label | The new picklist stores a canonical value; only record-side screens translated it back to a label — every plan-side screen (list, stats, stage summary, planning/review tabs, audit report, AI email composer) did not |
| **(fresh-eyes finding)** Surveys | Republishing a survey silently reset its expiry date and anonymous-response setting | `useConsultationSurveys.ts` never fetched `allow_anonymous`/`expires_at` in the first place, so the tab's Publish call site couldn't pass them through |
| **(fresh-eyes finding)** Surveys | New PDF export could silently clip long free-text answers off the page | `wrap={false}` copied from a single-line table-row pattern, applied to an unbounded-length text block |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `5b452f4ee` | **Pre-session, unreviewed.** Plans "Archived"→"Cancelled" enum fix; Dashboard field-name fix; ParticipantSection stale label removed; initial (broken) survey publish/token attempt. |
| `33c7eb4b0` | Medium-finding fixes: Industry Sector free-text → picklist (with fallback for non-canonical seeded values); Plans one-click edit; real survey PDF export via `@react-pdf/renderer`. |
| `b1bc15a1d` | Merge `origin/main` — hand-reconciled `ConsultationPlanFormDialog.tsx` against PR #441's training-product-picker rework; fixed 6 pre-existing `react-hooks/incompatible-library` warnings in `ConsultationRecordForm.tsx`/`MarketingRegisterForm.tsx`/`EngagementFormDialog.tsx` blocking the merge commit. |
| `a0a0c3e14` | **Fresh-eyes findings fix.** All 5 confirmed bugs above: publish-token format, plan status/async-error handling, sector-label lookup helper applied branch-wide, survey settings fetch fix, PDF layout/UX fix. |
| `e0e70810b` | Merge `origin/main` (routine catch-up, no conflicts). |

Merge commit: `b473d6306` (PR #490).

---

## Fixes shipped

### Frontend — Consultation Plans

- **`ConsultationPlanFormDialog.tsx`** — Industry Sector is a picklist (`INDUSTRY_SECTORS`) with a
  fallback option injecting the plan's raw stored value when it doesn't match a canonical value
  (existing seeded plans display correctly instead of blank); reconciled onto PR #441's
  `TrainingProductPicker`/`useConsultationPlanProducts` structure.
- **`PlanStage.tsx`** — second, independent plan-creation path: converted its own free-text sector
  Input to the same picklist; `status: 'planned'` → `'draft'`; `createPlan` awaited via
  `mutateAsync` so a failed save no longer shows a success toast.
- **`PlanFormDialog.tsx`** — fire-and-forget `createPlan()` call site given a `.catch()` guard to
  match the `mutateAsync` switch without introducing an unhandled rejection.
- **`useIndustryConsultation.ts`** — `createPlan` now returns `mutateAsync(...)`, making it
  genuinely awaitable.
- **`types/consultation.ts`** — added `getIndustrySectorLabel()` helper; applied at every plan-side
  display site: `ConsultationPlansTab.tsx`, `ConsultationPlanStats.tsx`, `PlanningTab.tsx`,
  `ReviewTab.tsx`, `EngageStage.tsx`, `AuditReportGenerator.tsx`, and the `GenerateSurveyLink` /
  AI email-composer prop chain.
- **`ConsultationPlansTab.tsx`** — clicking a plan opens it directly for edit.
- **`ParticipantSection.tsx`** — removed stale "Set in the Details tab" label pointing at nothing.

### Frontend — Dashboard

- **`ConsultationDashboardTab.tsx`** — `qualification_code` → `training_product_code` at the 3
  affected sites (2 metrics + coverage chart); dropped an unused snapshot dependency.

### Frontend — Surveys

- **`PublishSurveyDialog.tsx`** — public-link token now uses `crypto.randomUUID().replace(/-/g,
  '').substring(0,16)`, matching every other token generator in the codebase, instead of a UUID
  that `SurveyDispatcher.tsx` misroutes.
- **`useConsultationSurveys.ts`** — now selects `allow_anonymous`/`expires_at` so the Publish
  dialog's settings survive a republish.
- **`ConsultationSurveysTab.tsx`** — Publish call site passes the full survey settings object;
  gained a working Publish action (previously had none).
- **`SurveysFeedback.tsx`** — no functional change; call site already correct, used as the
  reference pattern for the fix above.
- **`SurveyResultsView.tsx`** — real PDF export via `@react-pdf/renderer` (mirrors
  `ConsultationCoverageReport.tsx`'s pattern); removed the `wrap={false}` that could clip long
  free-text answers; added an in-flight export state (`Generating…`, disabled button); PDF header
  timestamp uses `formatDisplayDateTimeFull` instead of browser-locale `toLocaleString()`.

### Merge-driven cleanup (unrelated files, required to land the merge commit)

- **`ConsultationRecordForm.tsx`**, **`MarketingRegisterForm.tsx`**, **`EngagementFormDialog.tsx`**
  — 6 pre-existing `form.watch()` calls converted to `useWatch()` (reactive reads) or
  `getValues()` (one-off reads in an event handler), clearing `react-hooks/incompatible-library`
  ESLint warnings that were blocking the pre-commit hook on the merge commit. No behaviour change
  — verified reactive subscriptions are equivalent.
- **`DeliveryAssessmentPlanPage.tsx`** — 1337-line diff in the PR; fresh-eyes review confirmed via
  Prettier-normalising both sides that it is **100% formatting noise**, zero behavioural change.

### Edge functions

**None touched, none redeployed.**

### Database

**None.** No migration files in PR. No `execute_sql` or `migration repair` post-merge step required.

---

## Review rounds

1. **Manual audit** (Angela's demo run + 6-agent/2-live-DB-check parallel audit) —
   `industry-consultation-demo-audit-2026-08-19.md`, produced the High/Medium finding list this PR
   worked from.
2. **Fresh-eyes adversarial subagent review** (`pr-review-toolkit:code-reviewer`, whole branch vs.
   `origin/main`, live DB checks against ComplyHub Demo tenant `df5c0c9d-e4be-4f67-b454-1a7128b2fc01`
   and Vivacity Testing Tenant) — found and drove the fix for all 5 bugs listed above, including the
   still-broken publish-link regression and the sector-code-leak regression introduced by this same
   session's earlier fix. Also cleared the `DeliveryAssessmentPlanPage.tsx` diff as formatting-only.
3. **ci-gate equivalent** — `npx tsc --incremental --noEmit` and `npx eslint --max-warnings=0` run
   after every substantive edit; both clean at merge.

No Cursor Bugbot pass recorded in this session's transcript.

---

## Production rollout (post-merge)

1. **Vercel production** — auto-deploy on merge to `main` at `b473d6306`. Deployment
   `dpl_6fqAd9Q4FPXJiQP2mswFnAnL42ix`, `target: production`, **state: READY**. Verified via Vercel
   MCP `list_deployments`.
2. **Edge functions** — none; nothing to deploy.
3. **Migrations** — none; ledger unchanged by this PR.
4. **Worktrees** — worktree B (`rto-compass-hub-worktree-b`) released: `main` was already checked
   out in worktree A, so worktree B moved to `standby/worktree-b` synced to `origin/main @
   b473d6306` rather than forcing onto `main`. `active-work.md` registry row marked `unclaimed`
   19 Aug 2026.

---

## Manual QA checklist (post-merge — Brian-gated)

**Not yet performed as of this audit.** Everything above was verified by type-check, lint, and the
fresh-eyes review's live-DB checks — not by an authenticated in-browser walkthrough. On **ComplyHub
Demo** or **Vivacity Testing Tenant** on production:

- [ ] Create a new Consultation Plan — Industry Sector picklist works, saves without a DB error
- [ ] Open an existing seeded plan with a non-canonical sector value — displays correctly (not
      blank), doesn't get rewritten to a lowercase code after re-saving
- [ ] Build a new survey, publish it, open the public link in an incognito window — loads the
      actual survey, not an error page
- [ ] Republish an already-published survey that has an expiry date set — expiry date survives
- [ ] Export a survey's results to PDF — downloads a real PDF with correct, uncut content
- [ ] Confirm Industry Consultation Dashboard metrics show real numbers, not "Unknown"/0
- [ ] Click a Consultation Plan in the list — opens directly into edit mode

---

## Still open / follow-up

- **Manual QA checklist above** — not signed off in this audit session; demo is same-day, high
  priority to run at least once before relying on it live.
- **Standard 1.1 header claim** — original audit also flagged that several screens advertise
  "Standards 1.1, 1.2, 4.1" as linked to Industry Consultation, but Standard 1.1 ("Training") is
  about delivery quality, not industry engagement, and doesn't actually belong on that list.
  Deliberately deferred (Brian's call) — not fixed in this PR, parked for a later, deliberate pass
  across the ~6 files that make the claim.
- **Record ID format** (`ICR-0010` vs actual `ICR0010`) — confirmed script-wording issue only, not
  a code defect; no action needed.
- **Plans vs Register method-list enums** — two disconnected enums (Title-Case plan methods vs.
  snake_case register methods); flagged as a data-model observation in the original audit, not
  addressed — needs a deliberate design decision, not a quick patch.
- **`.slice(0, 20)` in `SurveyResultsView.tsx`'s PDF export** vs. the results RPC's hard cap of 5
  text samples — currently a no-op since the RPC caps first, but noted by fresh-eyes as a latent
  desync risk if that RPC limit ever changes.

---

## Soak status

No feature flag; all changes are live immediately for every tenant on next page load. Frontend-only
change (no migrations/edge functions) — lowest-risk rollout class per this repo's own risk tiers.
Watch for: Consultation Plan save failures on `PlanStage.tsx`'s path (behaviour changed from
silently failing to properly erroring); survey publish link functionality on any survey built
fresh via the Surveys tab.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/490
- Merge commit: `b473d6306a4762e0995a86b0edeb5a1b2c26bf67`
- Vercel production deployment: `dpl_6fqAd9Q4FPXJiQP2mswFnAnL42ix`
- Source audit: `industry-consultation-demo-audit-2026-08-19.md` (workspace root)
- Active work ledger: `active-work.md` (worktree B registry updated 19 Aug 2026)
