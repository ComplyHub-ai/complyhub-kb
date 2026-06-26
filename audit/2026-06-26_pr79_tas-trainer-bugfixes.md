# Audit — PR #79: TAS scope + Phase 3 options + trainer report period

**Date:** 26 June 2026
**Branch:** `bugfixes-tas-and-trainer`
**PR:** #79
**Merged by:** Brian (Khian)
**Merge commit:** `873d28914`
**Migration applied to production:** Yes — `add_trainer_report_period_columns` (repo `20260626010000`), verified.

---

## What was fixed / delivered

Four Angela-reported items on one branch, plus two Cursor Bugbot follow-ups.

### 1. Trainer report period — anchored to last governance meeting (not calendar month)
- **Issue:** Reports were keyed to a calendar month (a `type="month"` picker). Angela: "from the date of the last Governance Meeting … the last 30 day period."
- **Root cause:** The whole feature was calendar-month based (`reporting_month`); the governance side guessed the report by "meeting month − 1" while the trainer side stamped a meeting — two different match keys. A dead/broken period RPC (`submit_trainer_monthly_report_full`) referenced columns that never existed.
- **Fix:** `period_start` = last governance meeting (on/before today), `period_end` = +30 days, shown read-only. New `period_start`/`period_end` columns + backfill (migration). Governance readiness + agenda now match by `meeting_id`. Cron reminder + metadata now reference the period.

### 2. Phase 1 Scope Authority — wrong "Qualification" label + false "Superseded"
- **Issue:** A current, on-scope **unit** (`HLTAID014`) showed as "Qualification" + "Superseded".
- **Root cause:** Panel trusted a stale `productType` prop instead of the DB-backed `scopeStatus.productType`, so it queried TGA *qualifications* (unit not found → false Superseded). Separately, the release lookup in `useTasScopeStatus` filtered only by `(code,type)` with **no `tenant_id`** — a cross-tenant read leak that also returned multiple rows and jammed the lookup.
- **Fix:** Derive product type from `scopeStatus`; release status from the authoritative synced status for all product types; `canComplete` uses `effectiveOnScope`; release lookup scoped by `tenant_id` and read tolerantly.

### 3 & 4. Phase 3 cohort + delivery options
- Added **"Under 18"** cohort, wired like `school_leavers` (skills bullet, LLN trigger, minors duty-of-care risk). Added **"Offshore"** delivery location (locations are count-only → no extra wiring).

### Connection-integrity fix (admin ↔ trainer)
- `trainer_monthly_reports.trainer_id` had two identities: the form wrote the **trainer-profile id** while the governance read RPC + live data use the **login/user id**. Symptom: form-submitted reports could show as "missing / Unknown" on the governance panel. Standardised on the user id (form save + trainer-side list reads).

### Cursor Bugbot follow-ups
- **Agenda unscoped query:** monthly_trainers loaded all meetings' reports when no meeting (Overview). Now falls back to the next upcoming meeting, or no rows.
- **Saved risk vs displayed risk:** `handleSave` now applies the same `effectiveOnScope` override so saved score/level matches the panel.

## Files changed

| Area | Files |
|---|---|
| Phase 3 options | `src/constants/tasLabels.ts`, `src/components/tas/builder-sandbox/CohortIntegrityPhasePanel.tsx` |
| Scope panel | `src/components/tas/builder-sandbox/GovernancePhasePanel.tsx`, `src/hooks/useTasScopeStatus.ts` |
| Trainer period | `src/pages/trainer-portal/monthly-report.tsx`, `src/pages/trainer/MonthlyReportsList.tsx`, `src/hooks/useGovernanceReportReadiness.ts`, `src/hooks/useGovernanceAgenda.ts`, `src/lib/trainerReports/reportingPeriod.ts` (new) |
| Migration | `supabase/migrations/20260626010000_add_trainer_report_period_columns.sql` (new) |

## Migration result (production, verified)

- `trainer_monthly_reports.period_start` + `period_end` (date) added.
- 7/7 existing rows backfilled from `reporting_month`.
- `cron_trainer_report_prompts()` replaced — period wording confirmed.

## Notes / follow-up

- **Lovable publish required** — merging to `main` does not update `rto.complyhub.ai`; publish via Lovable so the frontend changes go live (must land with/after the migration, since the list page reads `period_start`/`period_end`).
- Two commits used `--no-verify` (Brian-authorised): `monthly-report.tsx` + `useGovernanceAgenda.ts` are pre-existing `@ts-nocheck` Lovable files; removing `@ts-nocheck` would break type-check (agenda hook references deprecated tables). Pre-push hook also runs `npm run build` (hangs the workstation) so push used `--no-verify` per the standing rule.
- Deferred: `send-trainer-report-reminder` edge function still uses month wording (gated manual test tool; automated cron is the live reminder). One orphan report row (`3b9c2e91…`) matches no trainer — stray test data, not code-fixable.
- Optional: regenerate `src/integrations/supabase/types.ts` to include the new columns (frontend uses loose access so not blocking).
