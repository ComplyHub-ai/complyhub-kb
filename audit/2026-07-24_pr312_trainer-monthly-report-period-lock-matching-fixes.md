# Audit — PR #312: Trainer Monthly Report Period/Matching Bugs and Stale Tenant Resolution (24 July 2026)

**Date:** 24 July 2026
**Branch:** `fix/monthly-reports-list-period-match`
**PR:** [#312](https://github.com/ComplyHub-ai/rto-compass-hub/pull/312)
**Merge commit:** `bf160912a61b1278851743b2eb20c9cb0a997897`
**Purpose:** Closes out every open item from the 24 Jul 2026 investigation into Kim's (Dijan Training Program) monthly-report bug report — a lock/edit bug, a reporting-period display gap, a list-page matching bug, a stale-tenant RPC bug, and a dead-code drift bug all traced back to the same 26 Jun 2026 "anchor report period to last governance meeting" feature.

---

## What was implemented

### Item 1 — Reporting period gap when a governance meeting is postponed

`src/lib/trainerReports/reportingPeriod.ts` — `computeReportingPeriod`'s `end` date now resolves to the next scheduled meeting's actual date (`upcomingMeetingDate`) instead of a fixed `start + 30 days`, falling back to the 30-day window only when no next meeting is scheduled yet. Fixes a real gap: when a meeting was postponed/cancelled, the old fixed window left a span of days covered by neither the old nor the new reporting period. No stretch cap was added — governance meetings for this tenant run close to monthly, and the one postponement observed was a one-off caused by an unrelated software issue, not a recurring cadence problem. Resolved live at read/render time, not stored/precomputed, consistent with Item 2's lock-deadline fix below.

### Item 2 — Draft report self-locks on return via Edit

Merged separately via PR #311 (`fix/monthly-reports-trainer-lock`, commits `9e991113e` + `adef50659`) ahead of this PR. Root cause: `isLocked` in `monthly-report.tsx` had no `status === 'draft'` exclusion, so a `lock_deadline` computed as "the day before the meeting" — already in the past for a same-day meeting — locked a report nobody had submitted yet. Fixed with a live meeting-status check replacing the static trigger-computed deadline, plus an explicit draft exclusion as defense-in-depth. A same-PR follow-up also fixed `computeDisplayStatus` (Compliance Manager dashboard) miscounting `reviewed`/`approved` reports as Overdue.

### Item 4 — MonthlyReportsList shows two disagreeing reporting periods

`src/pages/trainer/MonthlyReportsList.tsx` — `currentReport` now matches by `meeting_id` (added to the report select) instead of string-comparing `period_start`/`reporting_month` against a freshly computed period. The old matcher silently failed once a report's stored period drifted from a live recomputation (e.g. after a meeting was postponed), showing a false "Report needed" warning even when an open draft already existed. `meeting_id` is the canonical FK a report is linked to on creation (mirrors the form's own orphan-draft resume logic) and is DB-unique per `(tenant_id, meeting_id, trainer_id)`.

### Item 5 — submit_trainer_monthly_report RPC resolves tenant via stale profiles.tenant_id

New migration `supabase/migrations/20260724132456_fix_submit_trainer_monthly_report_active_tenant.sql` — `CREATE OR REPLACE` on `submit_trainer_monthly_report`, changing tenant resolution from `SELECT tenant_id FROM profiles` to `SELECT COALESCE(active_tenant_id, tenant_id) FROM profiles`. The RPC required an exact match between the resolved tenant and the report row's `tenant_id`; when a trainer's home tenant (`profiles.tenant_id`) diverged from their active workspace at report-creation time (`profiles.active_tenant_id`, which the report is actually created under), the RPC raised `report_not_found` and blocked submission outright. Confirmed live before the fix: 14/236 profiles had `tenant_id != active_tenant_id`, including one already-unsubmittable draft report. `COALESCE` (not a straight swap) was used because 39/236 profiles have a NULL `active_tenant_id` — a straight swap would have newly broken submission for those. Every other guard/section of the function was carried forward unchanged (confirmed byte-exact diff except that one line).

### Item 6 — reporting_month/meeting_id drift in the trainer-report governance-pack matcher

`src/hooks/governance/useMeetingTrainerReportsByPeriod.ts` + `src/components/governance/MonthlyTrainersReportSummaryPanel.tsx` — matching switched from a derived "prior calendar month" string (`getPriorReportingMonth`) to `meeting_id`, for the same reason as Item 4. The old logic was written 16 Jun 2026, before the 26 Jun "anchor to last meeting" design existed, and assumed strict monthly cadence — which Item 1's stretch fix explicitly makes unsafe to assume going forward. Dropped the now-meaningless `isBackdated` param and `usedFallbackPeriod` concept. This hook/panel combo is confirmed unrendered anywhere in the app today (see Item 7), so the fix has no live user-facing effect yet — landed anyway so it's correct if the panel is ever re-wired. `closestReportingMonth` in `meetingReportingPeriod.ts` was left untouched — still used by the unrelated `useMeetingSsoPackByPeriod` (SSO reports), out of scope here.

### Item 7 — MonthlyTrainersReportSummaryPanel unrendered anywhere in the app

Investigated in full (git history, overlap analysis against current `LiveMeetingTab.tsx`). Findings:
- Built and fully wired in 16 Jun 2026 (`f62023eeb`).
- Actually dropped 19 Jun 2026 (`ad7248a82`, a mislabeled commit whose message describes only unrelated QI/ASQA work but whose diff was a 1,847-line `LiveMeetingTab.tsx` rewrite that also swapped this panel and its SSO sibling for `TrainerReportReadinessPanel`/`SsoReportStatusPanel`) — not `fdade5096` (9 Jul 2026) as first suspected; that citation was corrected during investigation.
- What replaced it (`TrainerReportReadinessPanel` + `TrainerReportsPanel` v4) already covers the load-bearing needs — readiness gating and full per-trainer operational review, including its own per-report AI summary. The only genuine gap is a single meeting-level rollup with one synthesized AI narrative for Governing Persons, which neither current component provides.
- **Decision (Brian, 24 Jul 2026): disregard.** Treated as a nice-to-have, not worth the integration cost of adapting its AI-summary output to the newer `AIOutputReviewPanel` model that superseded the panel's original save path. No rewire planned. Revisit only if Angela specifically asks for a GP-facing rollup summary.

### Item 3 — Vague antivirus/firewall advice given to Kim's IT team

Not a code issue (client-side, Kim's own IT environment). Confirmed no support ticket captured the original advice. **Decision (Brian, 24 Jul 2026): removed from scope** — not something requiring further resolution from ComplyHub's side.

---

## Review findings

Every code item (1, 4, 5, 6) went through an independent adversarial Checker pass with live read-only DB access before commit. All four verdicts: **SHIP**, no blocking findings. Notable verified claims:
- Item 1: no other caller of `computeReportingPeriod` exists repo-wide; an already-created report being edited keeps its stored period untouched (stretch only applies to newly computed periods).
- Item 4: live DB confirmed zero NULL `meeting_id` rows on `trainer_monthly_reports` and a `(tenant_id, meeting_id, trainer_id)` unique constraint, ruling out the new match ever grabbing the wrong row.
- Item 5: full end-to-end trace confirmed the fix is monotonically safe — the 14 divergent-tenant users go from broken to working; the 39 null-`active_tenant_id` users are unaffected (fall back to prior behavior); nobody who currently works goes broken.
- Item 6: confirmed sole consumer of the changed hook, confirmed the unrelated SSO path (`useMeetingSsoPackByPeriod`) was untouched.

A separate end-to-end trace (post-Item-4) verified the full create → list → resume → lock → submit → review chain still communicates correctly across all layered changes, surfacing Items 5 and 6 as pre-existing issues worth fixing in the same PR.

---

## Post-merge deployment

`supabase db push` remains blocked by the pre-existing ~2,000-version ledger drift (see `supabase/migrations/CLAUDE.md`). Item 5's migration was applied via the interim procedure (`execute_sql` + `supabase migration repair --status applied 20260724132456`), confirmed complete by Brian. Items 1, 4, 6 are frontend-only — no separate deployment step beyond the Vercel build from the merge.

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Item 1: stretch-to-next-meeting with no cap, rather than a capped stretch with a Compliance Manager flag | This tenant's governance meetings run close to monthly in practice; the one postponement seen was a one-off software issue, not a recurring cadence problem. Revisit if cadence ever genuinely stretches periods for months at a time. |
| Item 5: `COALESCE(active_tenant_id, tenant_id)` rather than a straight swap to `active_tenant_id` | 39/236 profiles have a NULL `active_tenant_id` — a straight swap would have newly broken submission for those; COALESCE fixes the 14 divergent-tenant cases with zero regression risk. |
| Item 7: disregard, no rewire | Existing `TrainerReportReadinessPanel` + `TrainerReportsPanel` v4 already cover the load-bearing readiness/operational-review needs; the one remaining gap (GP-facing rollup narrative) wasn't worth the cost of re-integrating into the newer `AIOutputReviewPanel` model. |
| Item 3: removed from scope | Not a code issue; no further action needed from ComplyHub's side. |

---

## Files changed

**Frontend (4 files):** `src/lib/trainerReports/reportingPeriod.ts` (Item 1), `src/pages/trainer/MonthlyReportsList.tsx` (Item 4), `src/hooks/governance/useMeetingTrainerReportsByPeriod.ts` + `src/components/governance/MonthlyTrainersReportSummaryPanel.tsx` (Item 6).

**Migration (1 file):** `supabase/migrations/20260724132456_fix_submit_trainer_monthly_report_active_tenant.sql` (Item 5).

**Production (direct, via MCP, not git-tracked):** `submit_trainer_monthly_report` replaced live; ledger repaired to `applied` for `20260724132456`.

---

## Notes

- This closes out every item in `monthly-reports-trainer-bug.md` (the 24 Jul 2026 investigation doc, first raised by Kim 28 Apr 2026) — Items 1, 4, 5, 6 shipped in this PR; Item 2 shipped separately in PR #311; Items 3 and 7 resolved by decision, no code needed. `monthly-reports-trainer-bug.md` deleted after this audit entry per the living-doc workflow (disposable, session-scoped, superseded by this record).
- Immediate manual remediation applied ahead of the code fix (cancelling a stale postponed governance meeting, unlocking Kim's specific draft report via direct SQL) is documented in the deleted living doc's history only — both were superseded by the real fixes in this PR and PR #311, no ongoing relevance.
- No new deferred items were created by this PR.
