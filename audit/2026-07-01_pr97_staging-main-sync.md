# Audit — PR #97: Staging → Main Sync (01 July 2026)

**Date:** 01 July 2026
**Branch:** `feat/staging-sync`
**PR:** #97
**Merged by:** Brian (Khian)
**Merge commit:** `27df7d6f0`
**Purpose:** One-time sync to bring `origin/staging` into alignment with `origin/main`. RJ's Lovable was connected to `staging`, which had diverged from `main` after the June workflow change to the `feat/*`/`fix/*` + PR model.

---

## Background

After 22 June 2026, all new work starts from `main` via `feat/*` or `fix/*` branches. The `staging` branch had accumulated changes that existed only on staging and were not on `main`. RJ could not resume working in Lovable until staging matched main. This PR ported all staging-only work onto `main`; staging was then to be force-reset to match main (Step 6 — scheduled for next session).

---

## What was merged (3 commits)

| Commit | Description |
|--------|-------------|
| `4e8d3b20b` | feat: sync staging-only work into main (nav, cohort banner, ASQA evidence, SA dashboard, dep upgrades) |
| `69d01b75b` | fix: stack payment bar below cohort banner via topOffset prop |
| `c4a175cc8` | fix: correct empty-state colSpan from 10 to 11 in SA Dashboard tenant table |

---

## Changes ported from staging

### 1 — Navigation: "Marketing & Information" relocated

- "Marketing & Information" moved from the **Documents & Compliance** sidebar section to **Students & Support**.
- "Support Tickets Triage" nav item removed entirely.
- Files: `src/config/adminSidebarConfig.ts`, `src/config/roleNavigation.ts`

### 2 — Cohort Announcement Banner (new component)

- Top-of-app dismissible banner announcing a cohort event.
- Expiry: 6 August 2026. Dismissal persisted to `localStorage`.
- New file: `src/components/banners/CohortAnnouncementBanner.tsx`
- Wired into: `src/layouts/RootAppLayout.tsx`
- Payment bar updated with `topOffset` prop so it stacks below the banner when both are visible.
- Files: `src/layouts/RootAppLayout.tsx`, `src/components/billing/PersistentPaymentBar.tsx`

### 3 — ASQA Evidence Upload in QI Submission Panel

- Added evidence upload capability (PDF/JPG/PNG/DOCX, 50 MB limit) to the QI Submission Panel.
- Supports view and replace of existing uploaded evidence.
- No migration required — all 4 `asqa_evidence_*` columns already exist on `qi_register` in production.
- File: `src/components/qi/QiAsqaSubmissionPanel.tsx`

### 4 — SA Dashboard enhancements

- Added TAS active/total tooltip to the SuperAdmin dashboard.
- Added "Gov 90D" column for governance activity tracking.
- Corrected empty-state `colSpan` from 10 to 11 (table column count mismatch).
- Files: `src/pages/superadmin/SA_Dashboard.tsx`, `src/hooks/useSADashboardHealth.ts`

### 5 — Type sync with production

- `src/integrations/supabase/types.ts` — added `period_start`, `period_end`, `trainer_role` fields (already exist in production DB from PR #79 migration).
- `src/types/qi-survey.ts` — synced with production schema.

### 6 — Dependency upgrades

| Package | From | To |
|---------|------|----|
| `@tailwindcss/postcss` | 4.1.14 | 4.3.1 |
| `cypress` | 15.1.0 | 15.18.0 |
| `react-router-dom` | 7.9.4 | 7.18.0 |
| `supabase` (CLI, devDep) | 2.39.2 | 2.108.0 |
| `vitest` + `@vitest/ui` | 3.2.4 | 4.1.9 |

Safe security overrides added: `picomatch`, `tmp`, `uuid`. Vitest 4 regression-tested against main under vitest 3 in isolated worktree — identical failure set, zero regressions.

---

## QA

5 items QA'd on Vercel preview before merge — all passed.

### Vercel preview env var issue (resolved)

Prior to this PR, Vercel preview branches for `feat/*`/`fix/*` had no Supabase connection (white screen) because env vars were scoped only to `cursor/critical-bug-investigation-*` branches. Resolution by Carl:
- Re-enabled Supabase branch DB creation for all PRs.
- Added Supabase + VITE_ keys scoped to `feat/staging-sync` in Vercel.

**Resolved going forward:** Supabase's Vercel integration now auto-injects connection env vars for every new PR branch. Future `feat/*`/`fix/*` branches get env vars automatically — no manual configuration needed.

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Staged with `--no-verify` | Brian authorised to bypass pre-existing `react-hooks` lint debt in `SA_Dashboard.tsx` (verbatim from main — not introduced by this PR). |
| Staging branch direction | `staging` is being deprecated as a working branch. All new work starts from `main`. This sync is a one-time operation. |
| ASQA columns — no migration | All `asqa_evidence_*` columns already exist in production; no new migration was needed. |
| vitest 4 upgrade safe | Tested in isolated worktree against vitest 3 — identical failure set, confirmed no regressions. |

---

## Step 6 — Reset staging (pending at time of merge)

After merging PR #97, one step remained: force-pushing `main` to `origin/staging` so RJ's Lovable sees the current codebase.

```powershell
git checkout main
git pull
git push origin main:staging --force
```

This is safe — all of staging's unique work was preserved via PR #97 before the reset. Scheduled for the next session.

---

## Files changed (12 files, 1 new)

| File | Change |
|---|---|
| `src/config/adminSidebarConfig.ts` | Nav restructure — Marketing & Information relocated |
| `src/config/roleNavigation.ts` | Nav restructure — Support Tickets Triage removed |
| `src/components/banners/CohortAnnouncementBanner.tsx` | **NEW** — cohort announcement banner |
| `src/layouts/RootAppLayout.tsx` | Banner + topOffset wiring |
| `src/components/billing/PersistentPaymentBar.tsx` | topOffset prop added |
| `src/components/qi/QiAsqaSubmissionPanel.tsx` | ASQA evidence upload |
| `src/pages/superadmin/SA_Dashboard.tsx` | TAS tooltip, Gov 90D column, colSpan fix |
| `src/hooks/useSADashboardHealth.ts` | Gov 90D data hook |
| `src/integrations/supabase/types.ts` | period_start, period_end, trainer_role types |
| `src/types/qi-survey.ts` | Type sync |
| `package.json` + `package-lock.json` | Dependency upgrades |

---

## Notes

- No migration was applied to production — all DB objects already existed.
- No Lovable publish — Lovable is no longer in use; Vercel handles deployments.
- `staging` branch reset (Step 6) to be completed in a separate session.
