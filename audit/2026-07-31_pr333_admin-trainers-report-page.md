# Audit — New Feature: Admin "Trainer's Report" Page (VET Workforce)

**Date:** 31 July 2026
**Branch:** `feat/admin-trainers-report`
**PR:** #333 — merged, `4f89c7d93..a3d81e436`
**Requested by:** RJ, on behalf of a client — wanted visibility into which trainers have submitted their monthly report, without waiting on a per-submission email.

---

## What was built

New page at `/admin/trainers-report`, nav item added under the "VET Workforce" sidebar section, visible to Administrator, Compliance Manager, Governing Person, Consultant, and Consultant Assistant.

- **Reports tab:** year + month dropdowns, and a table listing every active trainer at the tenant with their `trainer_monthly_reports` status for that month (`not_submitted` / `draft` / `submitted` / `reviewed` / `approved` / `committed`).
- **Settings tab:** empty placeholder, per RJ's spec — likely destination for a future "email me on submission" preference, which was the original ask before this table-based approach was proposed instead.

## Key design decisions

- **Month/year dropdown, not meeting-anchored.** The obvious existing precedent (`useMeetingTrainerReportsByPeriod`, used inside the governance meeting workflow) matches reports by `meeting_id`, not calendar month — deliberately, because governance meetings don't land exactly a month apart (see `monthly-reports-trainer-bug.md` Decision 3). A plain calendar-month dropdown is a different, simpler axis and avoids that whole bug class entirely, since it's independent of meeting scheduling.
- **Timezone:** current year/month for the dropdown defaults is computed from `tenants.time_zone` (falling back to `Australia/Sydney`), matching the same pattern already used in the trainer submission wizard (`trainer-portal/monthly-report.tsx`) — not UTC, not browser-local, to avoid an off-by-one-day glitch right at midnight on month boundaries.
- **Year list isn't hardcoded.** `REPORTING_START_YEAR = 2026` is a named constant; the dropdown computes `[2026 ... currentYear]` at render time rather than a literal `['2026']`, so it grows on its own every January instead of needing a code change someone has to remember.
- **Month capping depends on which year is selected**, not a blanket "always up to now": current year → Jan..currentMonth; any fully-elapsed past year → all 12 months.
- **Trainer roster query fixes a real undercounting bug rather than copying it.** `useMeetingTrainerReportsByPeriod` counts trainers via `tenant_members.role = 'Trainer'` only — missing the canonical `'Trainer/Assessor'` value and the multi-role `roles` array. The new hook (`useTrainersReportRoster`) matches both, mirroring the more careful check already used in the reminder-email system (`process_trainer_report_reminders()`).
- **Access control needed zero new code.** Checked live before building: the `AdminRoute` guard already allows exactly Administrator/Compliance Manager/Governing Person/Consultant/Consultant Assistant, and `trainer_monthly_reports`' `tmr_manager_select` RLS policy already covers the identical five roles. Confirmed via `pg_policy` query against production, not assumed from the guard code alone.

## Blast radius

Purely additive: 2 new files (`src/pages/admin/TrainersReport.tsx`, `src/hooks/admin/useTrainersReportRoster.ts`), one new route line in `AppRoutes.tsx`, one new nav entry in `adminSidebarConfig.ts`. Nothing existing changed behaviour. Traced which of four "VET Workforce"-matching sidebar config files was actually live (`adminSidebarConfig.ts`, rendered via `AdminSidebar.tsx`) before editing, rather than guessing among the duplicates.

## DB/RLS impact

None — no migration in this PR. Confirmed live (see above) that the required RLS policy already exists and already covers the right roles.

## Files changed

| Area | File |
|---|---|
| New page | `src/pages/admin/TrainersReport.tsx` |
| New hook | `src/hooks/admin/useTrainersReportRoster.ts` |
| Route | `src/AppRoutes.tsx` |
| Nav | `src/config/adminSidebarConfig.ts` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Email-per-submission vs. a status dashboard | RJ pivoted from the original email-notification ask to this table-based view mid-conversation — better fit for a 20-trainer tenant (one glance vs. parsing N emails). Settings tab left as a placeholder for a possible future notification toggle. |
| Which roles see the nav item | Full precedent-matching list (RJ's original 4 + Consultant Assistant + super_admin), matching the closest existing sidebar entry ("CEO Governance Portal") rather than a narrower ad hoc list. |
| Status granularity | Show all 5 real statuses distinctly (draft/submitted/reviewed/approved/committed) rather than collapsing post-submission states into one badge — confirmed the real enum live rather than assuming it was just draft/submitted. |
| Month-filtering axis | Calendar month (`reporting_month`), not `meeting_id` — deliberately different from the existing meeting-scoped precedent, to sidestep the meeting-period-drift bug class. |

## Not yet tested

No dev server / browser available in this session — type-check and lint are clean, but the page has not been visually verified. RJ was asked to click through it (roster completeness, dropdown behaviour, empty-state row rendering) once live.
