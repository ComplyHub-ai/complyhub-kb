# Audit — PR #102: CM Delivery Overview Route, Broken Nav Paths, and Registers Overview

**Date:** 02 July 2026
**Branch:** `fix/cm-delivery-overview-route`
**PR:** #102
**Merged by:** Brian (Khian)
**Merge commit:** `344a5fbf9`
**Source register:** `CM-NAV-FIX-2026-07-01.md` (workspace root)
**Migration applied to production:** N/A — no database changes

---

## What was fixed

### Issue 1 — Delivery Overview redirect loop for Compliance Manager (NEW-010)

- Reported via QA: clicking Delivery Overview in the CM sidebar always redirected back to the Compliance Dashboard.
- Root cause: the `cm-delivery-overview` route was placed inside the `<TrainerRoute />` guard, which explicitly blocks Compliance Manager role with a redirect to `/dashboard`. The route path was correct but the parent guard rejected it before the page could load.
- Fix: moved the route outside `<TrainerRoute />` as a sibling route directly under `/dashboard`, keeping the identical path `/dashboard/trainer-portal/cm-delivery-overview`.
- File: `src/AppRoutes.tsx`

### Issue 2 — 16 broken paths in roleNavigation.ts across 5 roles

- Found during investigation of CM redirect loops. `roleNavigation.ts` (sidebar search config) had paths from the Lovable era that were never updated when routes moved under `/dashboard`.
- Broken sections:
  - `STUDENTS_SUPPORT_SECTION`: 5 paths missing `/dashboard/` prefix
  - `DOCUMENTS_COMPLIANCE_SECTION`: 3 paths incorrect (Document Repository, Documents Register, Evidence Library)
  - `AI_AUTOMATION_SECTION`: `/complybot` → `/admin/complybot`
  - `SSO_NAV` Registers section: 4 paths missing `/dashboard/` prefix
  - `REGULATOR_NAV` Students & Support: 3 paths missing `/dashboard/` prefix
- Fix: corrected all 16 paths to their current AppRoutes destinations.
- File: `src/config/roleNavigation.ts`

### Issue 3 — Registers Overview double-highlight and redirect loop

- Reported via QA screenshot: clicking Registers Overview highlighted both itself and Compliance Dashboard simultaneously, and navigated back to the Compliance Dashboard instead of a registers page.
- Investigation finding: `RegistersDashboard.tsx` exists as a proper registers hub page (status grid, AI summary panel, quick-add, tabbed registers) but was never wired up with a route in `AppRoutes.tsx`. It was an orphaned page.
- Root cause confirmed via git history: both Admin and CM configs originally pointed their Registers overview item to `/registers`, which was always intended to render `RegistersDashboard`. The route was just never implemented.
- PR #101 (previous) incorrectly set CM Registers Overview to `/dashboard/compliance` (Compliance Dashboard path) — causing the dual-highlight. A subsequent bad commit then removed the item entirely.
- Fix:
  1. Added `RegistersDashboard` lazy import and route `{ path: 'registers', element: <RegistersDashboard /> }` under `/dashboard` children in `AppRoutes.tsx`
  2. Restored CM Registers Overview in `roleMenuConfigs.ts` pointing to `/dashboard/registers`
- Files: `src/AppRoutes.tsx`, `src/config/roleMenuConfigs.ts`

### Issue 4 — SSO and Regulator document paths still broken after Issue 2 fix (Vercel bot finding)

- Vercel bot flagged after PR push: SSO nav `Document Repository` and Regulator nav `Documents Register` / `Document Repository` still pointed to bare top-level paths (`/document-repository`, `/documents-register`) that have no route in AppRoutes.
- Issue 2 fixed `DOCUMENTS_COMPLIANCE_SECTION` (shared across Admin, CM, SSO) but the SSO_NAV and REGULATOR_NAV each had their own hardcoded document sections that were missed.
- Fix: corrected all three remaining broken document paths:
  - SSO: `/document-repository` → `/dashboard/document-repository`
  - Regulator: `/documents-register` → `/admin/documents-register`
  - Regulator: `/document-repository` → `/dashboard/document-repository`
- File: `src/config/roleNavigation.ts`

### Issue 5 — CMDeliveryOverview had no role guard (Cursor Bugbot finding)

- Cursor Bugbot flagged: moving `cm-delivery-overview` out of `TrainerRoute` left the route with no role check, allowing any authenticated tenant user to access trainer delivery data.
- Fix: created `AdminCMRoute` guard component (mirrors `TrainerRoute` pattern) restricting the route to Administrator, Compliance Manager, super_admin, and impersonating users. Wrapped the CMDeliveryOverview route with the new guard in AppRoutes.
- File created: `src/routes/guards/AdminCMRoute.tsx`
- File updated: `src/AppRoutes.tsx`

---

## Additional investigation findings (no fix required this PR)

- **CM Students section missing since November 2025:** The CM sidebar (`roleMenuConfigs.ts`) has never included a Students & Support section. This section was present in the old Lovable-era `roleNavigation.ts` config but was not carried over when `EnhancedRoleSidebar` was introduced on 11 November 2025. Compliance Managers lost navigation access to Wellbeing & Safety, Reasonable Adjustments, At-Risk Interventions, etc. at that point. Raised as a follow-up item — not in scope for this PR.
- **Admin Registers Dashboard path:** Admin config still has `path: '/registers'` (bare) for its Registers Dashboard item — same pre-existing issue as the CM item, same root cause. The new `/dashboard/registers` route added in this PR gives the admin the correct destination but the admin config item still needs updating. Separate fix required.
- **TAS Quality Engine "loading snag" for admin:** Pre-existing issue, unrelated to this branch. Confirmed our changes made no modifications to TAS routes or configs.

---

## Chamudi Perera — Adjustment Referral investigation

Chamudi Perera (Compliance Manager, Australian College Pty Ltd) reported the "Adjustment Referral section" was not working. Investigation:
- "Adjustment Referral" maps to the Referral section inside `WellbeingSupportPlanForm.tsx` — fields: Referral Pathway, Referral Date, Referral Outcome.
- The Wellbeing page (`/dashboard/wellbeing`) is not in the CM sidebar and does not appear in CM sidebar search (search reads from `roleMenuConfigs.ts` which has no Wellbeing entry for CM).
- Chamudi likely accessed via the old Lovable-era sidebar, which included Wellbeing & Safety for CM via `roleNavigation.ts`.
- QA of the referral fields (PR #100 fix) is pending — requires accessing `/dashboard/wellbeing` directly as CM.

---

## Files changed

| Area | File |
|---|---|
| Route — CM Delivery Overview guard | `src/AppRoutes.tsx` |
| Route — RegistersDashboard wired up | `src/AppRoutes.tsx` |
| CM sidebar — Registers Overview restored | `src/config/roleMenuConfigs.ts` |
| Nav paths — 16 + 3 broken paths corrected | `src/config/roleNavigation.ts` |
| New guard component | `src/routes/guards/AdminCMRoute.tsx` |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| RegistersDashboard destination | Confirmed via git history — original intent was always `/registers` → `RegistersDashboard`. Route now at `/dashboard/registers`. |
| CM Students section | Not added in this PR — requires Angela sign-off on whether CM should have nav access to the full Students & Support section. Raised as follow-up. |
| Admin Registers Dashboard path | Left as-is — pre-existing issue, separate PR. |
