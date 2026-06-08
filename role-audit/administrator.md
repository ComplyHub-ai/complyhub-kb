# Role Audit — Tenant Administrator (`Administrator`)

**Date:** 4 June 2026
**Branch audited:** `main` (production) — read-only, no source/DB writes
**Scope:** The tenant Administrator journey — `/admin/*` routes, organisation settings, user management, role/permissions, billing & subscription, branding, and admin portals.
**Method:** Walked every route reachable through `<AdminRoute />` plus the Administrator-facing settings/billing routes. Read each page component (and its backing hooks/children) in full. Verified RPC schemas and table/column existence against the live Supabase project `gdwhlstfguxarnxasrrs` (read-only SELECT on `pg_catalog`/`information_schema`).

This report builds on `AUDIT-REPORT.md` + the Opus addendum (cross-cutting issues). References to those are by note; the focus here is what the **Administrator lens** reveals.

---

## Surface map

The Administrator role reaches two route clusters.

### A. `/admin/*` — guarded by `<AdminRoute />` (`src/AppRoutes.tsx:1185-1219`)

`AdminRoute` (`src/routes/guards/AdminRoute.tsx:54-70`) grants access to **any** of: tenant `Administrator`, `Governing Person`, `Consultant`, or an impersonating `super_admin`. There is **no `TenantGuard`** on this cluster.

| Route | Component | Status |
|---|---|---|
| `/admin` → `/admin/dashboard` | `AdminDashboard` → `ComplyHubAdminDashboardContent` | Solid |
| `/admin/compliance-overview` | `ComplianceOverview` | Solid |
| `/admin/documents-register` | `DocumentsRegister` | Solid (minor) |
| `/admin/document-repository` | `DocumentRepository` (wrapper) | Solid |
| `/admin/surveys` | `SurveysFeedback` | Solid (minor) |
| `/admin/complybot` | `ComplyBot` → `ai-router` edge fn | Solid |
| `/admin/compliance/:frameworkSlug` | `ComplianceFrameworkDetail` | Solid |
| `/admin/trainer-matrix-engine` | `TrainerMatrixEngine` | Solid |
| `/admin/trainers/supervision` | `SupervisionOverviewPage` | Solid (minor) |
| `/admin/audits` | `AuditQuestionsDashboard` | Solid (minor) |
| `/admin/user-management` | `UserManagement` | Solid (minor) |
| `/admin/user-management/roles` | `RolePermissionsPage` → `RoleAccessSection` | FIX |
| `/admin/credential-risk` | `CredentialRiskPage` → `CredentialRiskDashboard` | FIX |
| `/admin/impersonate` | `ImpersonatePage` | **COMING SOON (broken core action)** |
| `/admin/user-portals` | `UserPortalsHub` (nav hub) | Solid |
| `/admin/user-portals/trainer` | `TrainerPortalPage` → `TrainerDashboardContent` | FIX/Coming Soon |
| `/admin/user-portals/student-support` | `StudentSupportPortalPage` → `SsoHome` | FIX (mock KPIs) |
| `/admin/user-portals/student` | `StudentPortalPage` → `StudentDashboard` | COMING SOON |
| `/admin/user-portals/employer` | `EmployerPortalPage` | COMING SOON |
| `/admin/user-portals/third-party` | `ThirdPartyPortalPage` | COMING SOON |
| `/admin/user-portals/consultant` | `ConsultantPortalPage` | COMING SOON |
| `/admin/user-portals/regulator` | `RegulatorPortalPage` → `AuditorDashboard` | COMING SOON |
| `/admin/tas-redteam` | `TasRedTeamPage` | **COMING SOON / re-gate (Critical)** |
| `/admin/expert-engagements` | `ExpertEngagements` | Solid |
| `/admin/trainer-management/overview` | `TrainerOverview` | COMING SOON |
| `/admin/trainer-management/matrix` | `TrainerMatrix` | COMING SOON |
| `/admin/trainer-management/reports` | `TrainerReports` | COMING SOON |
| `/admin/trainer-management/evidence-review` | `EvidenceReviewQueue` | Solid |
| `/admin/trainer-management/pd-recommendations` | `PDRecommendations` | Solid |

Also: `/dashboard/admin` (`AppRoutes.tsx:771-777`) is a second AdminRoute-guarded entry rendering the same `AdminDashboard`, plus a `tenant-overview` → `/dashboard/settings/organisation` redirect.

### B. Administrator settings & billing — under `RootAppLayout`, `TenantGuard` + internal role gate

| Route | Component | Guard |
|---|---|---|
| `/dashboard/settings/organisation` | `ConsolidatedRTOSettings` | `TenantGuard` + internal `Administrator`/`super_admin` gate |
| `/dashboard/settings/subscription` | `SubscriptionManagement` | `TenantGuard` |
| `/dashboard/settings/billing` | `BillingInvoicesPage` | `TenantGuard` |
| `/settings/profile` | `ProfileSettings` | `ProtectedRoute` |
| `/settings/rto`, `/settings/rto/:tab` | `RTOSettings` | `ProtectedRoute` |
| `/settings/key-dates` | `KeyDates` | `ProtectedRoute` |
| `/dashboard/admin/fpp/failed-deletes` | `FPPFailedDeletes` | **none** (no AdminRoute) |
| `/dashboard/admin/fpp/reconciliation` | `FPPReconciliation` | **none** |
| `/dashboard/admin/governance/health` | `GovernanceHealth` | **none** |
| `/dashboard/admin/integrations/tga` | `TGAHealthCheck` | **none** |

Branding is edited inside `ConsolidatedRTOSettings` via `src/components/settings/BrandingUploader.tsx` (uploads to the `branding` storage bucket).

---

## Findings

### 1. Impersonate "View as User" does not impersonate the selected user
- Role(s): Administrator (also Governing Person/Consultant via AdminRoute)
- Page/route: `/admin/impersonate`
- File:line: `src/pages/admin/ImpersonatePage.tsx:106-115` (esp. `:111`); confirmed against `src/contexts/AppContext.tsx:290-296`
- Issue: The page builds a full user-picker UI and requires `selectedUserId` to enable the button (`:220`), but `handleImpersonate` calls `switchToTenant(profile.tenant_id)` — the admin's **own** tenant. `selectedUserId` is never passed anywhere. `switchToTenant` only re-activates a tenant workspace (`setActiveTenantRpc`); there is no per-user impersonation path. The advertised feature ("view the system as that user") is non-functional — it just shows a "Starting impersonation…" overlay and re-activates the admin's current tenant.
- Severity: High
- Classification: COMING SOON — per-user impersonation has no server-side mechanism; this is unfinished, not a small bug. (If per-user impersonation infra exists elsewhere, demote to FIX.)
- Recommended action: Put a `<ComingSoon />` cover on the `/admin/impersonate` route element (`AppRoutes.tsx:1206`), or hide the menu item, until per-user impersonation is built.
- Relates to existing AUDIT-REPORT finding: new
- Secondary: `:62` and `:75` use `(supabase as any).from('tenant_members')` / `('profiles')` casts (type-debt); `:55` ties the button's loading state to global `AppContext.ready` rather than the action, with no timeout/abort.

### 2. TAS Red-Team harness — internal tool exposed to every tenant admin, and broken against current schema
- Role(s): Administrator, Governing Person, Consultant (all reach it)
- Page/route: `/admin/tas-redteam`
- File:line: route `src/AppRoutes.tsx:1215` under `AdminRoute` (`:1185-1188`); page `src/pages/admin/TasRedTeamPage.tsx:60,119-133,161-173`
- Issue (authorisation): This is a raw adversarial test harness — it accepts free-text **Tenant ID** and **TAS Build ID** UUIDs (`:161-173`) and mutates tenant data via `rpc_apply_redteam_scenario` (`:78`). It sits under `AdminRoute` only, while sibling internal dev tools require `<PlatformPermissionGuard requiredPermission="sa_dev_tools">` (`AppRoutes.tsx:1175,1179`). So any tenant Administrator/Governing Person/Consultant can reach it and can type **another tenant's** UUID — a cross-tenant mutation surface. The QA seed marks it `is_hidden_route: true` yet it remains routed.
- Issue (broken at runtime, DB-verified):
  - `flagAsTest` upserts into `(supabase as any).from('tas_build_flags')` (`:60`). **DB-confirmed:** that table no longer exists — only `_zz_deprecated_tas_build_flags` remains. The upsert errors.
  - `loadRuns` (`:119-125`) selects `id, scenario_id, passed, run_at, run_result` and filters `.eq('tas_build_id', …)` from `tas_redteam_runs`. **DB-confirmed:** the live table has only `created_at, created_by, error_text, finished_at, id, input_fingerprint, model, provider, run_status, started_at, tas_id, tenant_id`. None of the selected/filtered columns exist — the Past Runs table is dead.
- Severity: Critical (cross-tenant exposure of an internal mutation tool) + High (broken queries)
- Classification: COMING SOON / re-gate — cover the route AND move it out of the tenant-admin guard.
- Recommended action: Wrap the `/admin/tas-redteam` route element in a `<ComingSoon />` cover and re-gate behind `PlatformPermissionGuard requiredPermission="sa_dev_tools"` (or relocate under `/superadmin`). Flag to **Carl** — touches `AppRoutes.tsx` route architecture and RPC exposure.
- Relates to existing AUDIT-REPORT finding: confirms & extends RBAC-gap row "`/admin/tas-redteam`" and Minor-bugs row of the same.

### 3. `AdminRoute` grants Governing Persons and Consultants full admin (incl. user management, role assignment, impersonate, red-team)
- Role(s): Governing Person, Consultant (over-permission)
- File:line: `src/routes/guards/AdminRoute.tsx:54-70`
- Issue: The guard treats `Governing Person` and `Consultant` as Administrator-equivalent for the **entire** `/admin/*` surface. That includes destructive/privileged pages — `user-management`, `user-management/roles` (role/capability assignment), `impersonate`, and `tas-redteam`. A Governing Person being able to reassign user roles or open the red-team harness is almost certainly broader than intended. There is also no `TenantGuard`, so resolution depends entirely on `fetchEffectiveRole()` returning a tenant role.
- Severity: Medium
- Classification: FIX — narrow the privileged sub-routes to `Administrator` (and impersonating super_admin) rather than all three roles.
- Recommended action: Split the `/admin` children — keep read/overview pages open to Governing Person/Consultant, but gate `user-management*`, `impersonate`, `tas-redteam` to Administrator only. Flag to **Carl/RJ** (route architecture).
- Relates to existing AUDIT-REPORT finding: new (adjacent to the TenantGuard-gap cluster)

### 4. `AdminRoute` logs role/permission data to the browser console on every check
- Role(s): Administrator (all)
- File:line: `src/routes/guards/AdminRoute.tsx:29-35` (also `:62,68,72`)
- Issue: Every access check emits `console.log('🔐 AdminRoute role check', { globalRole, tenantRole, … })` with no `import.meta.env.DEV` guard — visible to anyone with DevTools. Same class as addendum finding #8 (`PlatformPermissionGuard`).
- Severity: Low
- Classification: FIX — wrap all four `console.log`/`console.error` calls in `if (import.meta.env.DEV)`.
- Relates to existing AUDIT-REPORT finding: same class as CRITICAL #8

### 5. `trainer-management` sub-pages serve stub/mock/random data (abandoned duplicates)
- Role(s): Administrator (also GP/Consultant)
- Page/route: `/admin/trainer-management/overview`, `/matrix`, `/reports`
- File:line:
  - `src/pages/admin/trainer-management/TrainerOverview.tsx:39-53` — `fetchTrainersSummary` is a stub (`setTrainers([])`); KPIs always 0. `:123` passes a literal `tenantId="mock-tenant-id"` to `<TrainerDashboard>`.
  - `src/pages/admin/trainer-management/TrainerMatrix.tsx:53-69` — `fetchData` returns empty arrays; create/delete/validate handlers (`:71-149`) mutate **local React state only** (`Date.now()` IDs) — nothing persists, so the CRUD flow is a dead-end that looks functional.
  - `src/pages/admin/trainer-management/TrainerReports.tsx:117-184` — `fetchStats` returns hardcoded `mockStats`; `fetchTrendData` generates `Math.random()` values; `fetchUnitCoverage` returns hardcoded mock units. All charts render fabricated data.
- Issue: Three abandoned duplicates of the real, working `TrainerMatrixEngine` (`/admin/trainer-matrix-engine`, backed by `trainer_unit_map`). They present fake numbers and a non-persistent matrix to admins.
- Severity: High (misleading fabricated data) / Med (TrainerOverview)
- Classification: COMING SOON (TrainerOverview, TrainerReports) and COMING SOON/REMOVE (TrainerMatrix — fake CRUD, no data layer ever built).
- Recommended action: Cover the three sub-routes (`overview`, `matrix`, `reports`) inside `TrainerManagementRoutes` (`src/pages/admin/trainer-management/index.tsx:13-15`) with `<ComingSoon />`, or redirect to `/admin/trainer-matrix-engine`. Leave `evidence-review` and `pd-recommendations` (both solid) intact.
- Relates to existing AUDIT-REPORT finding: new

### 6. Admin portal pages with hardcoded KPIs / thin static wrappers
- Role(s): Administrator
- Page/route + File:line:
  - `/admin/user-portals/employer` — `EmployerPortalPage.tsx:20,28,36,44` hardcode `12 / 3 / 28 / 94%`; all 4 cards say "coming soon."
  - `/admin/user-portals/third-party` — `ThirdPartyPortalPage.tsx:21,29,37,45` hardcode `5 / 2 / 1 / 98%`.
  - `/admin/user-portals/consultant` — `ConsultantPortalPage.tsx:21,29,37,45` hardcode `3 / 2 / 15 / 8`.
  - `/admin/user-portals/student` — `StudentPortalPage.tsx:1-5` wraps `StudentDashboard.tsx:1-21`, a static 3-card stub (no data/queries).
  - `/admin/user-portals/regulator` — `RegulatorPortalPage.tsx:1-5` wraps `AuditorDashboard.tsx:1-28`, a static 3-card stub.
  - `/admin/user-portals/student-support` — `StudentSupportPortalPage.tsx` → `src/pages/student-support/SsoHome.tsx:19-27` has an explicit `// Mock KPI data` object (`at_risk_count: 12, active_adjustments: 28, …`) rendered as live KPI cards.
  - `/admin/user-portals/trainer` — `TrainerPortalPage.tsx` → `TrainerDashboardContent.tsx:33-72` renders all KPIs as `"—"` "No data available".
- Issue: Fabricated/placeholder figures presented to an Administrator as if live.
- Severity: High (Employer/ThirdParty/Consultant/StudentSupport — fake integers) / Med (Student/Regulator/Trainer — honest empty/stub)
- Classification: COMING SOON for Employer, ThirdParty, Consultant, Student, Regulator. FIX (wire to real query) for StudentSupport (`SsoHome` mock KPIs) and Trainer (`"—"` placeholders), since their surrounding shells/links are real — though COMING SOON is acceptable if deprioritised.
- Recommended action: Cover the five COMING SOON portal routes (`AppRoutes.tsx:1210-1214`). For StudentSupport, replace the `kpis` mock object in `SsoHome.tsx:19-27` with a real hook.
- Relates to existing AUDIT-REPORT finding: confirms the EmployerPortal/ConsultantPortal/ThirdPartyPortal/StudentPortal/RegulatorPortal COMING SOON rows.

### 7. Organisation Settings — dead Security toggles and hardcoded Governance KPIs
- Role(s): Administrator
- Page/route: `/dashboard/settings/organisation`
- File:line: `src/pages/settings/ConsolidatedRTOSettings.tsx`
  - Security tab: `:1700,1712,1722` — three `<Switch>` (2FA, Login Alerts, Session Timeout) with `defaultChecked`/no state and no handler; "Update Security Settings" (`:1725`) calls `saveSettings('security_mfa')` which only persists `settings`/`branding` — the toggles are never read or saved. Pure theatre presented as a security control.
  - Governance tab KPIs: `:1530` (`12` Active Registers) and `:1534` (`3` Pending Actions) are static literals in cards that look live.
  - `:1,6` — duplicated `// @ts-nocheck` with a comment that it "references deprecated tables not in current schema."
  - `:325,415` — `.single()` in `loadRawTenantData`/`loadCurrentTenant` (throws on 0/>1 rows; both in try/catch).
- Severity: High (Security tab + Governance KPIs are misleading)
- Classification: COMING SOON for the Security tab (relabel/disable until backed by real MFA enforcement); FIX for the Governance KPIs (wire to real counts) and the `.single()` → `.maybeSingle()`.
- Recommended action: Cover or hide the **Security tab/section** within `ConsolidatedRTOSettings`; wire `:1530,1534` to real queries. The Data/Info/Branding/Team tabs are genuinely real — do not cover the whole page.
- Relates to existing AUDIT-REPORT finding: new (settings detail)

### 8. Key Dates page silently discards input — "Next Audit Date" and "Renewal Due" never persist
- Role(s): Administrator
- Page/route: `/settings/key-dates`
- File:line: `src/pages/settings/KeyDates.tsx:37,41-44,67-68`
- Issue: `:41-44` loads both `registrationEndDate` and `nextAuditDate` from the **same** column (`target_audit_date`) and hardcodes `renewalDueDate = ''`. On save (`:67-68`) only `target_audit_date = registrationEndDate` is written — the "Next Audit Date" the user types is silently dropped, and "Renewal Due" is never used. `:37` uses `.single()` (throws on 0 rows, leaving the form silently empty).
- Severity: High (data loss on save)
- Classification: FIX (back the dates with distinct columns + `.maybeSingle()`) or COMING SOON/REMOVE the two non-persisting fields.
- Recommended action: Either add real columns for next-audit/renewal and persist them, or remove those two inputs so the form doesn't lose user input. Touches the `tenants` table — flag to **Dave/Carl**.
- Relates to existing AUDIT-REPORT finding: new

### 9. Hardcoded Supabase URL + anon key in Profile password-reset (raw fetch)
- Role(s): Administrator (all authenticated users)
- Page/route: `/settings/profile`
- File:line: `src/pages/settings/ProfileSettings.tsx:375` (URL `https://gdwhlstfguxarnxasrrs.supabase.co/functions/v1/password-reset-request`), `:379` (`Authorization: Bearer eyJ…` anon JWT literal)
- Issue: `handleResetPassword` bypasses `supabase.functions.invoke` and hand-builds a `fetch` with the hardcoded project URL and anon key. Confirmed at the lines the prior audit cited.
- Severity: Critical (key in source) / High (URL)
- Classification: FIX — replace with `supabase.functions.invoke('password-reset-request', { body: { email } })`.
- Recommended action: Part of the Cluster 1 credentials sweep; flag to **Carl** (key rotation).
- Relates to existing AUDIT-REPORT finding: CRITICAL #1 / #2, Cluster 1 (`ProfileSettings.tsx:379/375`).
- Secondary same-file: `:406-408` `removeAvatar` only clears local state — never deletes from storage or nulls the DB, so the avatar returns on refresh (Med, FIX); `:150-154` `from('dd_job_title' as any)` cast (Low); `:700` helper text says "6 characters" but validation requires 12 (`:441`) (Low); `:894-985` ~90 lines of commented-out Preferences JSX (Low, REMOVE).

### 10. Hardcoded Supabase URL in BrandingUploader
- Role(s): Administrator
- Page/route: `/dashboard/settings/organisation` (Branding)
- File:line: `src/components/settings/BrandingUploader.tsx:15`
- Issue: `const SUPABASE_URL = 'https://gdwhlstfguxarnxasrrs.supabase.co'` hardcoded, used as the allow-list prefix in `isSafeImageUrl` — so a logo uploaded under a different env/URL silently won't render (`:228`). The upload flow itself is real (`storage.from('branding')`, `:128-143`). `:104-109` logs the full `profile` object (PII) to console.
- Severity: High (hardcoded URL) / Low (debug log)
- Classification: FIX — derive URL from `import.meta.env.VITE_SUPABASE_URL`; strip the debug log.
- Relates to existing AUDIT-REPORT finding: CRITICAL #2 / Cluster 1 (`BrandingUploader.tsx:15`).

### 11. RTO identity has two divergent write paths
- Role(s): Administrator
- Page/route: `/settings/rto` (`RTOInfoSettings`) vs `/dashboard/settings/organisation` (`ConsolidatedRTOSettings`)
- File:line: `src/pages/settings/rto/RTOInfoSettings.tsx:61-65,182-185`
- Issue: `RTOInfoSettings` writes RTO identity fields via a **direct `tenants` table update** (`:182`), while `ConsolidatedRTOSettings` writes the same data through the `upsert_rto_settings` RPC (confirmed to exist in `public`). Two write paths to the same data → drift/race risk; the direct write relies solely on RLS. Many `(tenant as any).field` casts (`:89-100`) indicate the columns aren't in the generated types.
- Severity: Medium
- Classification: FIX — route writes through `upsert_rto_settings` to match the canonical page (CLAUDE.md names `ConsolidatedRTOSettings` as canonical).
- Relates to existing AUDIT-REPORT finding: new

### 12. Billing invoice PDF fetched by id only — verify ownership (potential IDOR)
- Role(s): Administrator
- Page/route: `/dashboard/settings/billing`
- File:line: `src/pages/billing/BillingInvoicesPage.tsx:90` (`functions.invoke('invoice-pdf', { invoice_id })`), `:59,64` (`rpc('list_billing_invoices' as any)`, `rpc('get_upcoming_billing_invoice' as any)`)
- Issue: `invoice-pdf` is invoked with only `invoice_id` and no tenant scope — authorisation depends entirely on the edge function validating caller ownership; if it doesn't, another tenant's invoice PDF is reachable by id. The two RPCs are confirmed to exist in `public` (the `as any` is type-debt, not a broken call); both are scoped by `activeTenantId` from `useTenant()` context, not URL params (good). On RPC error the page only `console.error`s — no toast, just an empty "No invoices yet" state (`:78-82`).
- Severity: Medium
- Classification: FIX — confirm `invoice-pdf` enforces invoice→tenant ownership for the caller (flag to **Carl**); add an error toast on fetch failure.
- Relates to existing AUDIT-REPORT finding: adjacent to Cluster 5 edge-function auth.

### 13. Smaller page-level defects (FIX)
- **`RolePermissionsPage` → `RoleAccessSection.tsx:325-333`** — `mergedCaps` useMemo only handles the Administrator case and otherwise returns an empty Set with a `// simplified for now` comment; the "Effective Permissions Preview" pane (`:418-434`) shows only role-name badges, not merged capabilities. Half-built sub-feature. `:103` uses native `confirm()`. Med/Low — FIX (or COMING SOON for that pane).
- **`CredentialRiskPage` → `CredentialRiskDashboard.tsx:274-277`** — "Export CSV" button has no `onClick` handler (does nothing). Med — FIX (wire up or hide). `useCredentialRiskDashboard.ts:95,101-105` overloads `status === 'supervision_required'` and falls back to a synthetic `'Trainer'` role — verify against the real `tcr_register` enum (Low).
- **`audits/AuditDashboard.tsx:151`** — `onLinkEvidence={() => {/* TODO: Evidence linking modal */}}` is a no-op stub behind a button that looks functional. Med — FIX (wire up or hide).
- **`SupervisionOverviewPage.tsx:48`** — derives `tenantId = profile?.tenant_id` directly, unlike sibling pages that use `useEffectiveRole().effectiveTenantId`; under super_admin impersonation this can scope the Gaps report to the wrong/no tenant. Low/Med — FIX.
- **`DocumentsRegister.tsx:1056`** — AI Tagging Analytics gated on `profile?.role === 'Administrator'` while the rest of the page uses `effectiveRole === 'Administrator'`; the raw `profile.role` likely never equals the display string, so the block may never render. `:247-252,282` leave `[DOC UPLOAD DEBUG]` console logs of the insert payload in production. Low — FIX.
- **`ComplianceOverview.tsx:29`** — stray `console.log` on every render. **`ComplyBot.tsx:66`** — "Loading your organization context…" persists indefinitely when `tenantId` is null (e.g. super_admin not impersonating) — reads like a stuck spinner. **`UserManagement` → `useUserManagementAdmin.ts:89-96`** — `auth_activity_log` query has no `.limit()` (unbounded). All Low — FIX.
- **`SubscriptionManagement.tsx:6`** — blanket `// @ts-nocheck` on a billing-critical (but logic-free) composition shell. Low — FIX.

### 14. Admin-operational pages sitting outside the AdminRoute guard
- Role(s): any authenticated user (under-guarded)
- Page/route: `/dashboard/admin/fpp/failed-deletes`, `/dashboard/admin/fpp/reconciliation`, `/dashboard/admin/governance/health`, `/dashboard/admin/integrations/tga`
- File:line: `src/AppRoutes.tsx:878-880,1026`
- Issue: These admin-operational pages are registered as `/dashboard` children **without** `AdminRoute` or `TenantGuard` — any logged-in user can reach them, while their `/admin/*` siblings are guarded. Inconsistent guarding.
- Severity: Medium
- Classification: FIX — move under the `<AdminRoute />` group (or wrap individually). Flag to **Carl/RJ** (route architecture).
- Relates to existing AUDIT-REPORT finding: confirms addendum §2D "missed unguarded routes."

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| 1 | Impersonate "View as User" doesn't impersonate selected user | High | COMING SOON |
| 2 | TAS Red-Team: internal tool on tenant-admin route + broken schema | Critical | COMING SOON / re-gate |
| 3 | AdminRoute over-permits Governing Person & Consultant | Med | FIX |
| 4 | AdminRoute logs role data to console | Low | FIX |
| 5 | trainer-management overview/matrix/reports serve mock/random data | High | COMING SOON (matrix: /REMOVE) |
| 6 | Admin portal pages: hardcoded KPIs / static stubs | High/Med | COMING SOON (5) / FIX (2) |
| 7 | Org Settings: dead Security toggles + hardcoded Governance KPIs | High | COMING SOON (Security) / FIX (KPIs) |
| 8 | Key Dates silently discards Next-Audit/Renewal input | High | FIX / REMOVE fields |
| 9 | Hardcoded URL + anon key in Profile password-reset | Critical | FIX |
| 10 | Hardcoded Supabase URL in BrandingUploader | High | FIX |
| 11 | RTO identity has two divergent write paths | Med | FIX |
| 12 | Billing invoice PDF by id only — verify ownership | Med | FIX |
| 13 | Smaller defects (RoleAccess preview, CSV/Evidence no-op buttons, tenant resolution, debug logs) | Med/Low | FIX |
| 14 | Admin-operational pages outside AdminRoute guard | Med | FIX |

**Verified solid (no action):** AdminDashboard, ComplianceOverview, UserPortalsHub (nav hub), DocumentsRegister, DocumentRepository, SurveysFeedback, ComplyBot (→ `ai-router`, exists), ComplianceFrameworkDetail, TrainerMatrixEngine, ExpertEngagements, EvidenceReviewQueue, PDRecommendations. All RPCs called by the user-management/billing/settings pages (`get_effective_role`, `get_user_management_audit`, `log_user_management_action`, `get_user_capabilities`, `init_tenant_rbac`, `assign_user_roles`, `list_billing_invoices`, `get_upcoming_billing_invoice`, `upsert_rto_settings`) were **DB-confirmed to exist in `public`** — the bare/`as any` RPC calls are not silent failures.

---

## Coming Soon cover list

Routes/pages recommended for a `<ComingSoon />` cover (the actionable artifact):

- `/admin/impersonate` — `AppRoutes.tsx:1206`. Cover route element (per-user impersonation not built).
- `/admin/tas-redteam` — `AppRoutes.tsx:1215`. Cover **and** re-gate behind `PlatformPermissionGuard requiredPermission="sa_dev_tools"` (or relocate under `/superadmin`). Broken against current DB + cross-tenant exposure. Flag to Carl.
- `/admin/user-portals/employer` — `AppRoutes.tsx:1211`. Hardcoded KPIs.
- `/admin/user-portals/third-party` — `AppRoutes.tsx:1212`. Hardcoded KPIs.
- `/admin/user-portals/consultant` — `AppRoutes.tsx:1213`. Hardcoded KPIs.
- `/admin/user-portals/student` — `AppRoutes.tsx:1210`. Static stub wrapper.
- `/admin/user-portals/regulator` — `AppRoutes.tsx:1214`. Static stub wrapper.
- `/admin/trainer-management/overview` — `trainer-management/index.tsx:13`. Stub, always empty + `mock-tenant-id`.
- `/admin/trainer-management/matrix` — `trainer-management/index.tsx:14`. Fake non-persistent CRUD (consider REMOVE; real engine = `/admin/trainer-matrix-engine`).
- `/admin/trainer-management/reports` — `trainer-management/index.tsx:15`. Mock + `Math.random()` data.
- **Security tab** inside `/dashboard/settings/organisation` — `ConsolidatedRTOSettings.tsx:~1690-1730`. Section-level cover (dead toggles); do **not** cover the whole settings page.

Optional (FIX preferred over cover, but acceptable to cover if deprioritised): `/admin/user-portals/student-support` and `/admin/user-portals/trainer` (mock/placeholder KPIs).
