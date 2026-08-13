# Audit — PR #432: Auto-select next upcoming meeting on SSO Monthly Report (14 August 2026)

**Date:** 14 August 2026
**Branch:** `fix/sso-monthly-report-default-meeting`
**PR:** [#432](https://github.com/ComplyHub-ai/rto-compass-hub/pull/432)
**Merge commit:** `6bdd95ded9b0623e04432d70217edc5722fc66e4`
**Merged:** 14 August 2026, 9:18 am AEST
**Purpose:** RJ flagged (screenshot, `/dashboard/student-support/reports/new`) that Step 1 of the SSO Monthly Report ("Select Governance Meeting") landed with the dropdown blank, forcing SSOs to manually hunt through a reverse-chronological list mixing past and future meetings. Requested behaviour: default to the next upcoming governance meeting, same idea as the trainer monthly report's auto-bind — e.g. today 14 Aug, August's report belongs at September's meeting.

---

## What was implemented

- `useSsoMeetings.ts` — query now filters to `scheduled`/`in_progress` meetings with `meeting_date >= today` only (was: `scheduled`/`in_progress`/`completed`, no date floor), sorted ascending (was descending). Confirmed single consumer of this hook, so tightening it has no other call sites to break.
- `SsoMonthlyReportForm.tsx` — the existing pre-select effect (previously only pre-selected from a `:meetingId` route param, e.g. arriving via a governance meeting's "Submit Report" link) now falls back to auto-selecting `meetings[0]` — the earliest upcoming eligible meeting — when there's no route param and nothing is selected yet. Route-param pre-selection still takes priority and is unchanged.

## Blast radius

2 files. `useSsoMeetings` has no other consumers. Historical/submitted reports are reached via direct `reportId`/`meetingId` links from `SsoDashboard.tsx` / `SsoReportStatusPanel.tsx`, not by browsing this dropdown, so removing past/completed meetings from the list doesn't strand access to past reports. No route, role config, or role guard touched.

## Dave standard / DB impact

None. No migration, no schema/RLS change — same `governance_meetings` table, same tenant-scoped read pattern already used elsewhere (mirrors `getNextScheduledGovernanceMeeting` used by the trainer report). RJ raised and directed this fix himself (not a DB bug), so no Dave handoff applies regardless.

## Test plan

- `npx tsc --incremental --noEmit` — clean.
- Pre-commit hooks (prettier + eslint --max-warnings=0) — clean on commit.
- No existing tests reference `useSsoMeetings` or `SsoMonthlyReportForm` — nothing to update.
- CI/manual verification: RJ merged PR #432 directly; not separately re-verified live in this session.

---

## Files changed

`src/hooks/sso/useSsoMeetings.ts`, `src/pages/student-support/SsoMonthlyReportForm.tsx` — both frontend-only, no migration, no production DB step required.
