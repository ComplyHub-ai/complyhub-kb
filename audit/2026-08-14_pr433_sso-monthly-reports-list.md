# Audit — PR #433: Add SSO Monthly Reports history page (14 August 2026)

**Date:** 14 August 2026
**Branch:** `feat/sso-monthly-reports-list`
**PR:** [#433](https://github.com/ComplyHub-ai/rto-compass-hub/pull/433)
**Merge commit:** `c9a76d7bee59a6e2c72386cd8ed54de2f3602d77`
**Merged:** 14 August 2026, 9:50 am AEST
**Purpose:** Follow-on from PR #432 (SSO Monthly Report default meeting auto-select). While reviewing that fix, RJ pointed out the sidebar "Monthly Report" link goes straight to the create form (`/dashboard/student-support/reports/new`) with no dedicated page to view past reports — unlike the trainer role, which has a `MonthlyReportsList.tsx` index/history page. RJ specified the desired shape directly: a page at `/dashboard/student-support/reports` dedicated to viewing past reports, with a button through to `/reports/new`.

---

## What was implemented

- `SsoMonthlyReportsList.tsx` (new) — page at `/dashboard/student-support/reports`: current-reporting-cycle status card (next governance meeting + report status, reusing the auto-select query from PR #432) plus a submission history table of past `sso_monthly_reports`, each row linking to the existing `SsoMonthlyReportViewPage`.
- `useSsoMonthlyReportsList.ts` (new) — tenant-scoped read of `sso_monthly_reports`, newest-first, capped at 12, mirroring the trainer list's query shape.
- `ssoSidebarConfig.ts` — "Monthly Report" now points to the new list page instead of straight to `/reports/new`.
- `SsoMonthlyReportViewPage.tsx` — back button now returns to the new list instead of the create form (previously the only "back" destination was the form itself).

Before building, confirmed the two other SSO "reports" nav items (`Reports` → `SsoReportsHub.tsx`, `Reports Register` → `SSOReportsRegister.tsx`) are unrelated features against different tables (`sso_monthly_packs`, `sso_reports_register`) — neither could serve as this history view, so a new page was the only option, not a re-wire of an existing one.

## Blast radius

2 new files (additive). 3 files touched: one new static route (`student-support/reports`, confirmed unclaimed — doesn't collide with the existing `.../reports/new` or `.../reports/:reportId`), one sidebar link, one back-button target in a page already in scope from PR #432. No other role's config or route touches any of these.

## Dave standard / DB impact

None. No migration — reuses `sso_monthly_reports` (the same table `SsoMonthlyReportViewPage`/`useSsoMonthlyReport` already read from) with the same tenant-scoped RLS pattern already in production use. RJ raised and directed this himself, so no Dave handoff applies regardless.

## Test plan

- `npx tsc --incremental --noEmit` — clean.
- `npx eslint --max-warnings=0` on all changed/new files — clean.
- Pre-commit hooks (prettier + eslint) — clean on commit.
- No existing tests reference any of the touched files — nothing to update.
- CI: blocking checks (Lint, Type check, Edge Functions type check) and preview deploys were still pending when RJ merged; not separately re-verified live in this session.

---

## Files changed

`src/hooks/sso/useSsoMonthlyReportsList.ts` (new), `src/pages/student-support/SsoMonthlyReportsList.tsx` (new), `src/pages/student-support/SsoMonthlyReportViewPage.tsx`, `src/config/ssoSidebarConfig.ts`, `src/AppRoutes.tsx` — all frontend-only, no migration, no production DB step required.
