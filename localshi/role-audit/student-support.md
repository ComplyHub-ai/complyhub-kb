# Role Audit — Student & Student Support Officer (SSO)

**Date:** 5 June 2026
**Branch audited:** `main` (production) — READ-ONLY (no source, config, migration, or edge-function edits)
**DB checks:** live project `gdwhlstfguxarnxasrrs` via read-only MCP (SELECT / catalogue only)
**Scope:** Student role dashboard; the SSO "command centre" (`/dashboard/student-support`, `/dashboard/sso/*`); the Students & Support suite (`/dashboard/students-support/*`); placement/wellbeing; SSO reports.

Builds on `AUDIT-REPORT.md` + Opus addendum — references existing finding IDs where they touch this role; the focus here is what the per-role walk reveals.

---

## Surface map

### Student role (DB role = `"Student"`)
| Route | Component | Guard |
|---|---|---|
| `/dashboard/student` | `StudentDashboard` (`src/pages/dashboard/StudentDashboard.tsx`) | `StudentRoute` — requires `membership.role === "Student"` or global `super_admin` ✓ |
| `/dashboard/admin/user-portals/student` | `StudentPortalPage` → re-exports `StudentDashboard` | under admin route group |

The Student role's **only** dedicated, correctly-gated page is `StudentDashboard` — and it is a static stub (see F1).

### Student Support Officer (DB role = `"Student Support Officer"`; legacy alias `StudentSupportOfficer`)
SSO sidebar (`src/config/ssoSidebarConfig.ts`) exposes: SSO Dashboard, Students, At-Risk Monitor, Interventions, Reports, Insights, Support Register, Reports Register.

| Route | Component | Guard |
|---|---|---|
| `/dashboard/student-support`, `/dashboard/sso/dashboard`, `/dashboard/sso/work-queue` | `SsoDashboard` | **none** (auth only) |
| `/dashboard/sso/students`, `/dashboard/sso/students/:studentName` | `SsoStudents` | **none** |
| `/dashboard/sso/at-risk` | `SsoAtRisk` | **none** |
| `/dashboard/sso/interventions` | `SsoInterventions` | **none** |
| `/dashboard/sso/monthly-pack` | `SsoMonthlyPack` | **none** |
| `/dashboard/sso/packs-history`, `/dashboard/sso/reports`, `/dashboard/registers/sso-reports`, `/dashboard/students-support/placement-wellbeing`, `/dashboard/student-support/uploads` | `SsoReportsHub` | **none** |
| `/dashboard/sso/reports/:reportId` | `SsoReportDetail` | **none** |
| `/dashboard/sso/insights` | `SsoInsights` | **none** |
| `/dashboard/sso/ci-feed`, `/dashboard/student-support/ci-feed` | `SsoCiFeed` | **none** |
| `/dashboard/student-support/reports/monthly` | `SsoMonthlyPack` | **none** |
| `/dashboard/admin/user-portals/student-support` | `StudentSupportPortalPage` → `SsoHome` | admin route group |

### Students & Support suite (sidebar; mixed role audience)
| Route | Component | Guard |
|---|---|---|
| `/dashboard/students-support/dashboard` | `StudentsSupportDashboard` (`src/pages/students-support/Dashboard.tsx`) | **none** |
| `/dashboard/students-support/suitability` | `SuitabilityLLNDPage` (`src/pages/registers/suitability/index.tsx`) | **none** |
| `/dashboard/students-support/support`, `/dashboard/registers/ssr` | `SSRRegister` (`src/pages/registers/ssr/index.tsx`) | **none** |
| `/dashboard/students-support/adjustments` | `AdjustmentsPage` (`src/pages/registers/adjustments/index.tsx`) | **none** |
| `/dashboard/students-support/at-risk`, `/dashboard/registers/interventions` | `InterventionsPage` | **none** |
| `/dashboard/students-support/wellbeing`, `/dashboard/wellbeing` | `WellbeingSafetyPage` (`src/pages/wellbeing/index.tsx`) | **none** |
| `/dashboard/students-support/diversity`, `/dashboard/diversity-inclusion` | `DiversityInclusionPage` | **none** |
| `/dashboard/students-support/complaints-appeals` | `CAA` | **none** |
| `/dashboard/students-support/feedback`, `/dashboard/surveys` | redirect → `students-support` | n/a |

All `students-support/*`, `student-support`, and `sso/*` routes sit directly in the `children` array of the single `ProtectedRoute → OrphanRecoveryGate → RootAppLayout` block (`src/AppRoutes.tsx:693-701`). Only `student` (`:798-802`) and `auditor` (`:803-807`) carry a child guard; **everything SSO/students-support has auth-only protection and no role guard and no `TenantGuard`.**

---

## Findings

### F1 — Student role landing page is a static stub
- Role(s): Student
- Page/route: `/dashboard/student`
- File:line: `src/pages/dashboard/StudentDashboard.tsx:1-21`
- Issue: The entire component is three hardcoded marketing cards ("My Training Plan", "Assessments", "Support") with descriptive `<p>` text. No Supabase calls, no state, no links, no actions — the cards are not clickable and lead nowhere. This is the production landing page for the Student role (and is re-exported by `StudentPortalPage`).
- Severity: Med
- Classification: COMING SOON
- Recommended action: Put a `<ComingSoon />` cover on `/dashboard/student` (wrap the `StudentDashboard` element, or the `StudentRoute` child at `AppRoutes.tsx:801`). The Student role currently has no working functionality at all.
- Relates to existing finding: relates to `StudentPortalPage` COMING SOON candidate in AUDIT-REPORT.

### F2 — SSO and students-support routes have no role guard (route-level RBAC is dead code)
- Role(s): SSO (and any authenticated user)
- Page/route: all `/dashboard/sso/*`, `/dashboard/student-support`, `/dashboard/students-support/*`
- File:line: `src/AppRoutes.tsx:693-701` (parent block), routes `:991-1020`; `src/config/roleNavigation.ts:564-620` (`routePermissions` / `canAccessRoute`); `src/components/guards/RoleRouteGuard.tsx`
- Issue: There is **no `SsoRoute` guard** (`src/routes/guards/` has Admin, Auditor, Manager, RegulatoryOfficer, Student, Trainer — none for SSO). A full permission map exists (`routePermissions` correctly lists the SSO routes for `Student Support Officer`/`Administrator`/`Compliance Manager`/`Regulatory Officer`/`super_admin`) and a `RoleRouteGuard` component consumes it — **but `RoleRouteGuard` is never imported in `AppRoutes.tsx` or anywhere outside its own file.** So the permission map only drives sidebar rendering, not actual access. Any authenticated user of any role (e.g. a Trainer or Student) can navigate directly to `/dashboard/sso/dashboard`, `/dashboard/students-support/wellbeing`, etc. and read another role's surface. Note also `routePermissions` has `/dashboard/student-support` (singular) but **no entry for `/dashboard/students-support` (plural)**.
- Severity: High
- Classification: FIX
- Recommended action: Wrap the SSO and students-support route groups in `RoleRouteGuard` (or add an `SsoRoute` mirroring `StudentRoute`), and add the missing plural `/dashboard/students-support` entry to `routePermissions`. **Flag to RJ (route architecture) and Carl before any branch change.**
- Relates to existing finding: AUDIT-REPORT RBAC GAPS — "`/dashboard/students-support/*`, `/dashboard/sso/*`, `/dashboard/student-support/*` — No TenantGuard". This extends it: the gap is **role** guard, not only tenant guard. Both are missing.

### F3 — SSO/students-support routes also lack `TenantGuard`
- Role(s): SSO
- Page/route: all `/dashboard/sso/*`, `/dashboard/student-support`, `/dashboard/students-support/*`
- File:line: `src/AppRoutes.tsx:991-1020`
- Issue: None of these routes is wrapped in `<TenantGuard>` (compare the governance/compliance routes which are). An orphan/new user with no active tenant can reach pages that immediately query tenant-scoped tables; results are silent-empty rather than a clean "select a workspace" gate.
- Severity: Med
- Classification: FIX
- Recommended action: Wrap the route group(s) in `<TenantGuard>` (the live one at `src/components/tenant/TenantGuard.tsx`). Pairs with F2. RJ owns; flag first.
- Relates to existing finding: AUDIT-REPORT Cluster 4 explicitly lists `students-support`/`sso` among the TenantGuard gaps — confirmed.

### F4 — `SsoReportDetail` queries a table that does not exist
- Role(s): SSO
- Page/route: `/dashboard/sso/reports/:reportId`
- File:line: `src/pages/student-support/SsoReportDetail.tsx:1` (`// @ts-nocheck`), `:233-237` (`.from("sso_monthly_reports"…).eq("id", …).single()`)
- Issue: The page's primary load does a `.single()` SELECT on `sso_monthly_reports`. **DB check confirms `sso_monthly_reports` exists in no schema** (public or otherwise). The query therefore always errors and the page renders "Report not found" (`:377`). The detail RPCs it also calls (`generate_sso_report_snapshot`, `generate_sso_report_suggestions`, `save_sso_report_commentary`, `accept_/dismiss_sso_report_suggestion`, `submit_sso_monthly_report`) **do all exist in `public`** (verified) — so the page is half-built: working RPCs against a missing base table. `@ts-nocheck` (`:1`) hid the broken reference. The page is reached from `SsoDashboard.tsx:156/210` and `SsoReportStatusPanel.tsx:103`. Also note the Hub reads `sso_monthly_packs` while this reads `sso_monthly_reports` — two different data lineages for "monthly report".
- Severity: High
- Classification: COMING SOON (table absent → not a small fix; needs the schema decided/built or the page repointed to `sso_monthly_packs`)
- Recommended action: Cover `/dashboard/sso/reports/:reportId` with `<ComingSoon />` and remove the inbound links from `SsoDashboard.tsx:156/210`, until the `sso_monthly_reports` lineage is built or the page is repointed to packs. Flag the table/RPC lineage split to Dave/Carl.
- Relates to existing finding: new (same *class* as PolicyDriftPage wrong-table, but here the table is genuinely absent).

### F5 — Student-detail navigation dead-ends back to the list (no detail page)
- Role(s): SSO
- Page/route: `/dashboard/sso/students/:studentName`
- File:line: `src/AppRoutes.tsx:1008` (`:studentName` → `<SsoStudents />`); `src/pages/student-support/SsoStudents.tsx:254` and `src/pages/student-support/SsoAtRisk.tsx:277` (row click `navigate('/dashboard/sso/students/${name}')`)
- Issue: Clicking a student row in both the Students list and the At-Risk monitor navigates to `sso/students/:studentName`, which is wired to render `SsoStudents` **again** — the same list. The component never reads `useParams`/`studentName`, so there is no detail view; the click just re-renders the full list. A core SSO workflow (open a student → act) dead-ends.
- Severity: High
- Classification: COMING SOON (a `SsoStudentDetail` page does not exist — net-new build, not a small fix)
- Recommended action: Either build/route a `SsoStudentDetail` component, or remove the row-click navigation and the `:studentName` route until built. Until then, optionally cover `sso/students/:studentName`. Flag to RJ.
- Relates to existing finding: new.

### F6 — `SsoInterventions` is a stub with hardcoded zero KPIs
- Role(s): SSO
- Page/route: `/dashboard/sso/interventions`
- File:line: `src/pages/student-support/SsoInterventions.tsx:13` (`// Placeholder — interventions workflow will pull from ssr_register + future interventions table`), `:32-35` (`{ label: 'Active', count: 0 }`, `'Overdue', count: 0`, `'Completed This Month', count: 0`)
- Issue: No Supabase query anywhere in the file. The three stat cards always render literal zeros and an empty "No interventions yet" state regardless of real data. It is the navigation target of the dashboard's "Active Interventions" card (`SsoDashboard.tsx:297`), the At-Risk "Start Intervention" bulk button (`SsoAtRisk.tsx:130`, which passes `?bulk=1` that is never read), and `?action=new` — all of which dead-end here.
- Severity: High
- Classification: COMING SOON
- Recommended action: Cover `/dashboard/sso/interventions` with `<ComingSoon />` (wrap the element at `AppRoutes.tsx:1010`) and hide/disable the "Interventions" sidebar item in `ssoSidebarConfig.ts` plus the inbound buttons, until the interventions table + workflow exist.
- Relates to existing finding: new.

### F7 — `SsoInsights` presents fabricated metrics as real KPIs
- Role(s): SSO
- Page/route: `/dashboard/sso/insights`
- File:line: `src/pages/student-support/SsoInsights.tsx:66` (`avgResponseDays: 3` hardcoded, rendered `:153`), `:70` (`prevAtRiskPct: Math.max(0, atRiskPct - 8)` — invented prior period), `:68` + `:178` (spike banner fires off the manufactured delta), `:76-92`/`:193-196` ("AI-Suggested Actions" are hardcoded `if`-rules, not AI)
- Issue: The page does load real `ssr_register` data (themes, SLA breaches are genuine), but two headline numbers are fabricated: average response time is the constant "3d", and the "previous period" at-risk % is the current value minus a constant 8, which then drives a real-looking "at-risk increased from X% to Y%" spike alert and the `atRiskSpike` trigger. The "AI-Suggested" card is rule-based, not AI. These mislead — they look like trend data and an AI feature.
- Severity: High
- Classification: COMING SOON (the comparison/AI machinery isn't built) — or FIX the two metrics + relabel if kept live
- Recommended action: Simplest safe action — cover `/dashboard/sso/insights` with `<ComingSoon />` (wrap element at `AppRoutes.tsx:1016`). If the team prefers to keep it, remove `avgResponseDays`/`prevAtRiskPct` fabrications and the spike banner, and relabel "AI-Suggested" to "Suggested".
- Relates to existing finding: new (same hardcoded-KPI class as the portal pages in AUDIT-REPORT COMING SOON list).

### F8 — `SsoHome` (admin "Student Support" portal preview) shows mock KPIs
- Role(s): SSO (via admin portal preview)
- Page/route: `/dashboard/admin/user-portals/student-support` → `StudentSupportPortalPage` → `SsoHome`
- File:line: `src/pages/student-support/SsoHome.tsx:19-27` (`// Mock KPI data - will be fetched from database`, then `{ at_risk_count: 12, active_adjustments: 28, wellbeing_cases: 7, complaints_open: 3, ci_items_opened: 15, ci_items_closed: 11 }`); link prefixes `:39-53,65-77` point at `/student-support/...`
- Issue: Six KPI cards render fixed integers for every tenant; no Supabase query in the file. `SsoHome` is not routed in the dashboard — its only consumer is the admin portal preview wrapper. The live SSO landing page is `SsoDashboard`, not `SsoHome`.
- Severity: Med
- Classification: COMING SOON
- Recommended action: Cover the `StudentSupportPortalPage` route (`AppRoutes.tsx:1209`) with `<ComingSoon />`, consistent with the other admin portal pages already flagged. (Do not delete `SsoHome` outright — it is referenced by `StudentSupportPortalPage`.)
- Relates to existing finding: matches the `EmployerPortalPage`/`ConsultantPortalPage`/`StudentPortalPage` COMING SOON cluster in AUDIT-REPORT.

### F9 — `SsoCiFeed` is a routed but non-functional page
- Role(s): SSO
- Page/route: `/dashboard/sso/ci-feed`, `/dashboard/student-support/ci-feed`
- File:line: `src/pages/student-support/SsoCiFeed.tsx:22-25`
- Issue: The file input and "Import & Map to OFI" button have no handler, no state, no Supabase/edge call; the subtitle promises "Import survey data and map to CI register". A user can reach the page and nothing works.
- Severity: Med
- Classification: COMING SOON
- Recommended action: Cover both `ci-feed` routes (`AppRoutes.tsx:1020`) with `<ComingSoon />`.
- Relates to existing finding: new.

### F10 — `SsoReportsHub` buttons ignore pack id; silent error state
- Role(s): SSO
- Page/route: `/dashboard/sso/reports`, `/dashboard/sso/packs-history`, `/dashboard/registers/sso-reports`
- File:line: `src/pages/student-support/SsoReportsHub.tsx:40-47` (load from `sso_monthly_packs`, scoped by `tenant_id`), `:47` (error path never calls `setPacks`), `:119` (every View/Continue button navigates to `/dashboard/sso/monthly-pack`, ignoring `pack.id`)
- Issue: The list loads real data correctly, but (a) on query error the loading flag flips false and the "No packs yet" empty state is shown — indistinguishable from genuinely empty (masks failures); (b) every row's button routes to the single `monthly-pack` editor regardless of which pack was clicked, so per-pack detail (`sso/reports/:reportId`) is unreachable from the Hub.
- Severity: Low
- Classification: FIX
- Recommended action: Surface the fetch error (toast/error card); route the row buttons to the specific pack/report. Small, bounded.
- Relates to existing finding: new.

### F11 — `SsoDashboard` dead filter links and no-op action params
- Role(s): SSO
- Page/route: `/dashboard/student-support`
- File:line: `src/pages/student-support/SsoDashboard.tsx:286,307` (links to `sso/students?filter=sla` and `?filter=complaints`), `:194,202` (`?action=log-note`, `?action=new`); target `src/pages/student-support/SsoStudents.tsx:47` only reads `filter === 'overdue'`
- Issue: `SsoStudents` only honours `filter=overdue`; `sla` and `complaints` fall through to the unfiltered list. The SLA-Breaches and New-Complaints cards therefore land on an unfiltered student list (looks broken). The `action=` params are never read by their targets, so those buttons navigate but the intended action never triggers. The dashboard itself is otherwise well-wired (`get_sso_dashboard` RPC verified to exist in `public`).
- Severity: Med
- Classification: FIX
- Recommended action: Implement the `sla`/`complaints` filter branches in `SsoStudents.tsx:47` and the `action` handlers, or remove the query params from the dashboard links. Small, bounded.
- Relates to existing finding: new.

### F12 — `SsoAtRisk` "Create Follow-up Tasks" button is inert; bulk selection not passed
- Role(s): SSO
- Page/route: `/dashboard/sso/at-risk`
- File:line: `src/pages/student-support/SsoAtRisk.tsx:133-135` (`<Button …>Create Follow-up Tasks</Button>` with no `onClick`), `:130` (bulk "Start Intervention" → `interventions?bulk=1`, never read)
- Issue: The "Create Follow-up Tasks" button has no handler. The bulk "Start Intervention" passes `?bulk=1` and selected IDs that the (stub) `SsoInterventions` page never consumes. Otherwise the page loads real model scores (`useStudentRiskScores` → `risk_snapshots`) and the recalculate action calls `compute_all_student_risk_scores` (verified in `public`).
- Severity: Med
- Classification: FIX (button handler) — depends on F6 for the bulk flow
- Recommended action: Wire the "Create Follow-up Tasks" handler or remove the button; resolve the bulk flow alongside F6.
- Relates to existing finding: new.

### F13 — `SsoStudents` joins register cases to risk scores by display name
- Role(s): SSO
- Page/route: `/dashboard/sso/students`
- File:line: `src/pages/student-support/SsoStudents.tsx:52-54,82` (`snapshotByName = new Map(snapshots.map(s => [s.student_name, s]))`), `:315` (`format(new Date(student.lastContact), …)` unguarded)
- Issue: Cases from `ssr_register` are merged to model scores from `risk_snapshots` keyed on `student_name`. Identical/duplicate names collide (last-write-wins) and any name mismatch silently drops the score. The date format at `:315` is unguarded (would throw "Invalid time value" on a null/invalid `created_at`, though that column is normally populated). Real data otherwise (both tables + columns verified to exist).
- Severity: Med
- Classification: FIX
- Recommended action: Join on a stable id (e.g. student/enrolment id) rather than display name; guard the date format. Bounded.
- Relates to existing finding: new.

### F14 — `StudentsSupportDashboard`: `@ts-nocheck` + one hardcoded placeholder tile
- Role(s): SSO / Compliance (Students & Support hub)
- Page/route: `/dashboard/students-support/dashboard`
- File:line: `src/pages/students-support/Dashboard.tsx:1` (`// @ts-nocheck - References deprecated tables not in current schema`), `:180-181` (`diSelfReviewStatus = { completed: 0, pending: 0, total: 0 } // placeholder - would need actual table`, feeds the "Inclusive Practice Checklist Progress" card `:511-538`), `:184-188` (feedback counts via fragile `data_source.includes('student'|'learner'|'employer')`)
- Issue: The page loads real data from 8 parallel queries (`ssr_register`, `adjustment_plans`, `whs_register`, `caa_register`, `appeals`, `qi_register` — **all verified to exist in `public`**, and `ssr_register.source` exists, so `placementAlerts` is sound). But: (a) `@ts-nocheck` disables type safety despite the "deprecated tables" comment — masks schema drift; (b) the D&I checklist tile is hardcoded `0/0/0` and always renders a 0% bar, even though a real `diversity_inclusion_records` table exists and is used by the standalone D&I page; (c) the student/employer feedback split is heuristic string-matching, prone to silent under/over-count.
- Severity: Med
- Classification: FIX
- Recommended action: Wire the D&I tile to `diversity_inclusion_records`; remove `@ts-nocheck` after confirming all referenced tables/columns (they exist); replace the `data_source.includes(...)` heuristic with a real column. Bounded.
- Relates to existing finding: new (same hardcoded-tile class as `WorkforceIntelligenceDashboard` in AUDIT-REPORT).

### F15 — `WellbeingSafetyPage` uses `(supabase as any).from(...)` throughout
- Role(s): SSO / Compliance
- Page/route: `/dashboard/students-support/wellbeing`, `/dashboard/wellbeing`
- File:line: `src/pages/wellbeing/index.tsx:87-90` (`(supabase as any).from('wellbeing_risk_scans'|'wellbeing_support_plans'|'whs_incidents'|'independent_reviews')`), `:113` (`(supabase.from as any)(table)` with a runtime-string table name in `handleDelete`)
- Issue: All four loads and the delete cast away type checking. The tables are real and distinct (**all four verified to exist in `public`** — not the wrong-table bug), so this works today, but the casts hide typos/schema drift and the runtime-string delete fails only at runtime if `table` is wrong. KPIs are computed from real arrays; empty/loading states are sound.
- Severity: Med
- Classification: FIX
- Recommended action: Replace the `as any` casts with typed table accessors; constrain the `handleDelete` table arg to a literal union. Bounded, low blast radius.
- Relates to existing finding: new.

### F16 — `DiversityInclusionPage`: duplicate `toast` import hidden by `@ts-nocheck`
- Role(s): SSO / Compliance
- Page/route: `/dashboard/students-support/diversity`, `/dashboard/diversity-inclusion`
- File:line: `src/pages/diversity-inclusion/index.tsx:1` (`// @ts-nocheck`), `:5` and `:8` (both `import { toast } from 'sonner'`), `:65-69` (`diversity_inclusion_records`)
- Issue: `toast` is imported twice — a redeclaration error that the TypeScript compiler would normally reject; it survives only because of `@ts-nocheck`. Latent build break if `@ts-nocheck` is ever removed (which it should be). Real data otherwise (`diversity_inclusion_records` verified to exist); real CRUD and KPIs.
- Severity: Med (latent build break)
- Classification: FIX
- Recommended action: Remove the duplicate import (`:8`) and then drop `@ts-nocheck` after verifying the table/columns. Trivial.
- Relates to existing finding: new.

### F17 — `AdjustmentsPage`: `@ts-nocheck` + inert filter controls
- Role(s): SSO / Compliance
- Page/route: `/dashboard/students-support/adjustments`
- File:line: `src/pages/registers/adjustments/index.tsx:1` (`// @ts-nocheck - References deprecated tables not in current schema`), `:71-75`/`:187-199` (`adjustment_plans` read/write), `:254-256` (`onSelect1Change/onFromDateChange/onToDateChange` passed as no-op `() => {}`)
- Issue: Real data and CRUD against `adjustment_plans` (**verified to exist in `public`**), but `@ts-nocheck` is on despite the table being current, and three filter controls are wired to no-op handlers — the date/support filters do nothing.
- Severity: Low
- Classification: FIX
- Recommended action: Remove `@ts-nocheck`; either implement or remove the dead filter controls. Bounded.
- Relates to existing finding: new.

### F18 — `SsoMonthlyReport` — unrouted stub, no persistence
- Role(s): SSO
- Page/route: none (imported at `AppRoutes.tsx:308` but never bound to a route `element`)
- File:line: `src/pages/student-support/SsoMonthlyReport.tsx:35-53` (`handleSubmit` with `// TODO: Save to database via Supabase` at `:37`, only fires a toast), `:168` ("Export PDF" no handler), form fields uncontrolled (`:219-235`)
- Issue: Pure stub; nothing persists; not reachable. Superseded by `SsoMonthlyPack`.
- Severity: High (dead weight; no live impact)
- Classification: REMOVE
- Recommended action: Delete the file and its unused import at `AppRoutes.tsx:308`. Flag to RJ/Carl (touches AppRoutes import list).
- Relates to existing finding: new (clean-removal class).

### F19 — `SsoMonthlyReportForm` — unrouted, writes to non-existent `sso_monthly_reports`
- Role(s): SSO
- Page/route: none (imported at `AppRoutes.tsx:309`, never bound)
- File:line: `src/pages/student-support/SsoMonthlyReportForm.tsx:1` (`// @ts-nocheck` "References deprecated tables not in current schema"), `:221`/`:263` (`from("sso_monthly_reports" as any)` read + upsert), `:242` (`.single()` on `governance_meetings`), RPC `submit_sso_monthly_report_full` (`:253`)
- Issue: Reads/writes `sso_monthly_reports` which **does not exist in any schema** (verified) — broken even if it were routed. The author flagged it deprecated.
- Severity: High (dead weight; no live impact)
- Classification: REMOVE
- Recommended action: Delete the file and its import at `AppRoutes.tsx:309`. Flag to RJ/Carl.
- Relates to existing finding: new.

### F20 — Unrouted SSO stub pages (8 forms + register + uploads + enhanced report)
- Role(s): SSO
- Page/route: none (not bound to any route element)
- File:line:
  - `src/pages/student-support/SsoReportsRegister.tsx:21-29` — hardcoded `mockReports` with **real-looking person names** ("Sarah Johnson", "Mike Chen"); buttons inert
  - `src/pages/student-support/SsoUploads.tsx:22-25` — "Upload & Extract Actions" button does nothing (its route points at `SsoReportsHub` instead)
  - `src/pages/student-support/EnhancedSsoMonthlyReport.tsx` — not imported anywhere; logic real but unreachable
  - 8 presentational stubs, all uncontrolled inputs and handler-less buttons: `SsoPlacementWellbeing.tsx` (`:20-28`), `SsoWellbeingSafeguarding.tsx`, `SsoAnnualSupportReview.tsx` (`:19-31`), `SsoQuarterlyExperience.tsx`, `SsoEquityInclusion.tsx`, `SsoReasonableAdjustmentSummary.tsx`, `SsoTrainingSupportUtilisation.tsx`, `SsoAtRiskInterventions.tsx`
- Issue: None are imported or routed. No queries/RPCs/edge functions. `SsoReportsRegister` additionally embeds non-de-identified names (should never ship as-is per confidentiality rules).
- Severity: Med (dead weight; `SsoReportsRegister` PII if ever wired)
- Classification: REMOVE (or COMING SOON if any are on the near-term roadmap — confirm with Angela/RJ)
- Recommended action: Delete the 11 files after a final grep for references. Flag to RJ/Carl.
- Relates to existing finding: new (clean-removal class; extends the dead-file list).

### F21 — `use-sso-reports` hook returns hardcoded zero KPIs
- Role(s): SSO
- Page/route: any consumer of `useSsoKpiData`
- File:line: `src/hooks/use-sso-reports.ts:130-149` (`useSsoKpiData` returns hardcoded zeros, `// For now, return mock data structure` at `:137`), `:76-107` (`useUpsertSsoReport` uses `.from(tableName as any)` with a caller-supplied table name), `:151-167` (`usePushToGovernance` → `sso_push_to_governance` RPC — verified to exist in `public`)
- Issue: Any component using `useSsoKpiData` shows fake all-zero KPIs. The dynamic-table-name upsert is a wrong-table risk if a caller passes a bad name.
- Severity: Med
- Classification: FIX
- Recommended action: Wire `useSsoKpiData` to a real query (or remove it if unused); constrain `useUpsertSsoReport`'s table arg. Identify consumers first.
- Relates to existing finding: new.

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| F1 | Student dashboard is a static stub | Med | COMING SOON |
| F2 | SSO/students-support routes have no role guard (RBAC dead code) | High | FIX |
| F3 | SSO/students-support routes lack TenantGuard | Med | FIX |
| F4 | `SsoReportDetail` queries non-existent `sso_monthly_reports` | High | COMING SOON |
| F5 | Student-detail nav dead-ends back to the list | High | COMING SOON |
| F6 | `SsoInterventions` stub, hardcoded zero KPIs | High | COMING SOON |
| F7 | `SsoInsights` fabricated metrics + fake "AI" suggestions | High | COMING SOON |
| F8 | `SsoHome` admin portal preview shows mock KPIs | Med | COMING SOON |
| F9 | `SsoCiFeed` routed but non-functional | Med | COMING SOON |
| F10 | `SsoReportsHub` ignores pack id; silent error state | Low | FIX |
| F11 | `SsoDashboard` dead filter links + no-op action params | Med | FIX |
| F12 | `SsoAtRisk` inert "Create Follow-up Tasks" button | Med | FIX |
| F13 | `SsoStudents` joins by display name; unguarded date | Med | FIX |
| F14 | `StudentsSupportDashboard` `@ts-nocheck` + hardcoded D&I tile | Med | FIX |
| F15 | `WellbeingSafetyPage` `(supabase as any).from(...)` throughout | Med | FIX |
| F16 | `DiversityInclusionPage` duplicate import hidden by `@ts-nocheck` | Med | FIX |
| F17 | `AdjustmentsPage` `@ts-nocheck` + inert filter controls | Low | FIX |
| F18 | `SsoMonthlyReport` unrouted stub, no persistence | High | REMOVE |
| F19 | `SsoMonthlyReportForm` unrouted, writes non-existent table | High | REMOVE |
| F20 | 11 unrouted SSO stub/dead files (incl. PII mock names) | Med | REMOVE |
| F21 | `use-sso-reports` `useSsoKpiData` hardcoded zero KPIs | Med | FIX |

**Note on RPCs:** every SSO RPC the pages call (`get_sso_dashboard`, `generate_sso_report_snapshot`, `generate_sso_report_suggestions`, `save_sso_report_commentary`, `accept_/dismiss_sso_report_suggestion`, `submit_sso_monthly_report`, `submit_sso_monthly_report_full`, `get_sso_monthly_pack_seed`, `save_sso_monthly_pack_draft`, `submit_sso_monthly_pack`, `compute_all_student_risk_scores`, `compute_student_risk_score`, `sso_push_to_governance`) was confirmed to exist in the **`public`** schema. The pervasive `rpc(... as any)` casts in these pages are type-hygiene, **not** the non-public-schema silent-failure bug — they resolve and work. The genuinely live SSO surface is `SsoDashboard` + `SsoStudents` + `SsoAtRisk` + `SsoMonthlyPack` + `SsoReportsHub`.

---

## Coming Soon cover list (actionable)

Routes to put a `<ComingSoon />` cover over (wrap the route element in `AppRoutes.tsx`, and disable/hide the matching sidebar item in `ssoSidebarConfig.ts`):

1. **`/dashboard/student`** — Student role landing (static stub, F1). Wrap `StudentDashboard` element at `AppRoutes.tsx:801`.
2. **`/dashboard/sso/interventions`** — stub, zero KPIs (F6). Element at `:1010`; also hide the "Interventions" sidebar item and the inbound dashboard/at-risk buttons.
3. **`/dashboard/sso/insights`** — fabricated metrics/fake AI (F7). Element at `:1016`; hide "Insights" sidebar item.
4. **`/dashboard/sso/reports/:reportId`** (`SsoReportDetail`) — base table absent (F4). Element at `:1015`; remove inbound links from `SsoDashboard.tsx:156/210`.
5. **`/dashboard/sso/students/:studentName`** — no detail page; loops to the list (F5). Element at `:1008`; or remove the row-click navigation in `SsoStudents.tsx:254` and `SsoAtRisk.tsx:277`.
6. **`/dashboard/sso/ci-feed`** and **`/dashboard/student-support/ci-feed`** (`SsoCiFeed`) — non-functional (F9). Element at `:1020`.
7. **`/dashboard/admin/user-portals/student-support`** (`StudentSupportPortalPage` → `SsoHome`) — mock KPIs (F8). Element at `:1209`. (Consistent with the other admin portal pages already on the AUDIT-REPORT Coming Soon list.)
8. **`/dashboard/admin/user-portals/student`** (`StudentPortalPage`) — re-exports the F1 stub. Cover alongside #1.

Files to **REMOVE** (dead/unrouted; flag to RJ/Carl first as they touch the `AppRoutes.tsx` import list):
`SsoMonthlyReport.tsx`, `SsoMonthlyReportForm.tsx`, `EnhancedSsoMonthlyReport.tsx`, `SsoReportsRegister.tsx` (also strip the mock person names), `SsoUploads.tsx`, and the 8 unrouted forms (`SsoPlacementWellbeing`, `SsoWellbeingSafeguarding`, `SsoAnnualSupportReview`, `SsoQuarterlyExperience`, `SsoEquityInclusion`, `SsoReasonableAdjustmentSummary`, `SsoTrainingSupportUtilisation`, `SsoAtRiskInterventions`).

**Highest-priority FIX (not a cover):** F2 — wire route-level role gating (`RoleRouteGuard`/new `SsoRoute`) + F3 `TenantGuard` for the SSO and students-support route groups. Today any authenticated user can reach the entire SSO surface. Owners: RJ (route architecture), Carl (guardrails) — flag before any branch change per workspace rules.
