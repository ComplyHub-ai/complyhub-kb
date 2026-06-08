# Role Audit — Super Administrator (`super_admin`) + SuperAdmin/Platform-Admin surface

**Date:** 4 June 2026
**Branch audited:** `main` (read-only)
**Scope:** the `super_admin` role and the platform-admin surface — `/superadmin/*` routes, `SuperAdminGuard`/`PlatformPermissionGuard`, the SuperAdmin pages, `SuperAdminPanel`, and tenant-management surfaces reachable by this role.
**Method:** mapped the route tree (`src/AppRoutes.tsx`), the guards, and the permission model (`usePlatformPermissions`, `useAuthRoles`), walked all ~60 SuperAdmin pages, and verified every flagged RPC/table/edge-function and the live role/permission data against the Supabase project `gdwhlstfguxarnxasrrs` (SELECT/catalogue only).

> Cross-cutting issues already in `AUDIT-REPORT.md` (hardcoded URL/anon key, edge-function auth, RLS `qual=true`) are referenced where they touch this role but not re-litigated. This report is the role-specific view.

---

## Access model (how the role is actually gated)

The `/superadmin` route group is wrapped in **`SuperAdminGuard`** (`AppRoutes.tsx:1116`), and almost every child route is *additionally* wrapped in **`PlatformPermissionGuard requiredPermission="sa_*"`**. Two access concepts are in play and they do **not** agree:

- `useAuthRoles.isSuperAdmin` = `profile.role === 'super_admin'` (the legacy role). (`src/hooks/useAuthRoles.tsx:22`)
- `usePlatformPermissions.isPlatformUser` = `!!global_role` (one of `platform_owner` / `platform_admin` / `operations` / `qa_tester` / `support` / `finance`). (`src/hooks/usePlatformPermissions.ts:181`)

`SuperAdminGuard` admits **`isSuperAdmin || isPlatformUser`** (`SuperAdminGuard.tsx:34`), but `PlatformPermissionGuard` only honours **`isPlatformUser`** (`PlatformPermissionGuard.tsx:85`) — it is blind to `profiles.role === 'super_admin'`. See Finding 1.

**Live data (verified):** all 9 `super_admin` profiles also carry a `global_role` (8 × `platform_owner`, 1 × `operations`); every `global_role` including `finance`/`support`/`qa_tester` has the `sa_dashboard` permission. So today the role works in practice — but the contract is broken (Finding 1) and several routes are mis-gated.

### Surface map (route → component → guard)

All under the `SuperAdminGuard` outlet (`AppRoutes.tsx:1114-1182`). Inner guard shown:

| Route (`/superadmin/...`) | Component | Inner guard |
|---|---|---|
| `dashboard` | `SA_Dashboard` | `sa_dashboard` |
| `analytics` | `Analytics` (+`RequireSAWithMFA` in body) | `sa_dashboard` |
| `tenants`, `tenants/:tenantId/subscription`, `tenants/dormant` | `SuperAdminTenantsHub`, `ManageSubscription`, `DormantTenants` | `sa_tenants_hub` |
| `users`, `email-domains`, `orphan-recovery` | `Users`, `EmailDomains`, `OrphanRecovery` | `sa_users_roles` |
| `suggestions` | `Suggestions` | `sa_suggestions` |
| `system/access-audit` | `AccessAuditPage` | `sa_manage_internal_users` |
| `ops/control-centre` | `ControlCentre` | `sa_control_centre` |
| `ops/support` | `SupportWorkflowPage` | `sa_support_workflow` |
| `ops/emails` | `EmailMonitoring` | `sa_dev_tools` |
| `billing`, `billing/sales`, `billing/risk-monitor` | `BillingPage`, `Sales`, `BillingRiskMonitorPage` | `sa_billing` / `sa_sales` / `sa_risk_monitor` |
| `billing/test-console`, `billing/webhook-events`, `billing/enforcement-log` | `BillingTestConsole`, `WebhookEvents`, `EnforcementLog` | `sa_dev_tools` |
| `system/logs`, `system/error-monitor` | `SystemLogsPage`, `ErrorMonitorPage` | `sa_system_logs` |
| `system/flags` | `FeatureFlags` | `sa_feature_flags` |
| `system/settings` | `SystemSettings` | `sa_system_settings` |
| `system/audit` | `AuditLogs` | `sa_audit_trail` |
| `system/jobs`, `system/tenant-health`, `system/security-events`, `system/ops-suggestions` | `FailedJobsPage`, `TenantHealthPage`, `SecurityEventsPage`, `OpsSuggestionsPage` | `sa_failed_jobs` / `sa_tenant_health` / `sa_security_events` / `sa_platform_insights` |
| `system/tenant-context` | `TenantContextMonitor` | `sa_dev_tools` |
| `preview` | `Preview` | `sa_preview_as` |
| `notifications` | `NotificationsManagement` | `sa_notifications` |
| `content/templates`, `content/email-templates`, `content/help-centre` | `Templates`, `EmailTemplates`, `HelpCentreManager` | `sa_dev_tools` / `sa_dev_tools` / `sa_help_centre` |
| `release-notes` | `ReleaseNotes` | `sa_release_notes` |
| `knowledge-base`, `dev-interface`, `ncver-upload`, `regulatory-intelligence`, `regression-monitor`, `work-packages`, `delivery-console`, `compliance-graph`, `optimisation`, `tas-portfolio`, `tas-lab`, `tas-health`, `codes` | various | `sa_dev_tools` |
| `regulatory/sources`, `regulatory/updates` | `SARegulatorySources`, `SARegulatoryUpdates` | `sa_dev_tools` |
| `qa-testing` | `QATestingTracker` | `QAAccessGuard` + `sa_qa_tracker` |
| **`feature-visibility`** | `FeatureVisibility` | **`RequireSuperAdmin`** (no specific permission) — see Finding 4 |
| **`my-memberships`** | `MyMemberships` | **none** (only `SuperAdminGuard`) — see Finding 5 |

All 24 `sa_*` permission keys referenced above exist in `platform_permissions` (verified) — there is no missing-key lockout.

---

## Findings

### 1. `PlatformPermissionGuard` ignores the legacy `super_admin` role → whole SuperAdmin area is a redirect loop for any `super_admin` without a `global_role`
- Role(s): `super_admin` (legacy, `global_role IS NULL`)
- Page/route: every `/superadmin/*` route except `my-memberships` and `feature-visibility`
- File:line: `src/guards/PlatformPermissionGuard.tsx:85-99`; `src/hooks/useAuthRoles.tsx:18-25`; `src/guards/SuperAdminGuard.tsx:34`
- Issue: `SuperAdminGuard` lets a `super_admin` in (`isSuperAdmin || isPlatformUser`), but `PlatformPermissionGuard` only checks `isPlatformUser` (derived from `global_role`). A `super_admin` with no `global_role` has `isPlatformUser === false`, so **every** child route hits Stage 2 and redirects to `/superadmin/dashboard` — which is itself wrapped in `PlatformPermissionGuard` and redirects again → infinite loop / blank screen. The `useAuthRoles` doc comment claims *"isSuperAdmin now returns true for legacy super_admin OR any global_role user"*, but the code only checks `profile.role === 'super_admin'` — the comment is stale and misleading.
- Severity: High (latent — verified that all 9 current `super_admin` users also have a `global_role`, so it is not firing today; but provisioning a `super_admin` the documented way, with no `global_role`, bricks their entire admin surface)
- Classification: **FIX**
- Recommended action: make `PlatformPermissionGuard` treat `isSuperAdmin` (legacy role) as an implicit grant — mirror `usePlatformPermissions.isPlatformOwner` handling — or set `global_role` on every `super_admin`. Fix the false comment in `useAuthRoles.tsx`.
- Relates to existing finding: extends AUDIT-REPORT Minor Bug "ping-pong redirect to `/superadmin/dashboard`" (#MINOR `PlatformPermissionGuard.tsx:98`) — same redirect target, identifies the role that actually triggers it.

### 2. Regulatory Sources page queries the wrong schema — list and create both fail at runtime
- Role(s): `super_admin` / platform users with `sa_dev_tools`
- Page/route: `/superadmin/regulatory/sources`
- File:line: `src/pages/superadmin/regulatory/SARegulatorySources.tsx:37` (`from("sources" as any)`), `:47` (`rpc("sa_upsert_source" as any)`)
- Issue: verified against the catalogue — table `sources` and function `sa_upsert_source` exist **only in the `regulatory` schema**, not `public`. The Supabase client is created with the default (`public`) schema (`src/integrations/supabase/client.ts:11`) and **no file in `src/` ever calls `.schema('regulatory')`**. So `from("sources")` and `rpc("sa_upsert_source")` resolve to `public.sources` / `public.sa_upsert_source`, which do not exist. The list query throws (caught by React Query → error state), and the "Add Source" mutation throws → error toast. The page is non-functional.
- Severity: Med
- Classification: **FIX** (bounded — qualify with `.schema('regulatory')`) — **but** see note: the working regulatory flow elsewhere goes through edge functions + a `public` RPC, suggesting the `regulatory` schema may not be exposed to the PostgREST client at all. If so the real fix is a `public` wrapper RPC/edge function, which is larger. Recommend an **interim Coming Soon cover** on the route until the data path is confirmed.
- Recommended action: confirm whether `regulatory` is an exposed API schema. If yes, add `.schema('regulatory')` to the `.from()` and `.rpc()` calls. If no, route through a `public` wrapper RPC. Until then, wrap the route element `SARegulatorySources` in a `<ComingSoon />` cover.
- Relates to existing finding: same root cause as Addendum §2E (bare RPCs resolving to `public` when the function lives in `ai.`/`compliance.`/`workforce.`) — `regulatory` is the same class.

### 3. Regulatory Updates page — same wrong-schema bug
- Role(s): `super_admin` / platform users with `sa_dev_tools`
- Page/route: `/superadmin/regulatory/updates`
- File:line: `src/pages/superadmin/regulatory/SARegulatoryUpdates.tsx:27` (`from("updates" as any)`), `:37` (`rpc("sa_publish_update" as any)`)
- Issue: `updates` table and `sa_publish_update` function exist only in the `regulatory` schema (verified). Same default-schema problem as Finding 2 — the list errors and "Publish" throws.
- Severity: Med
- Classification: **FIX** (same caveat and interim-cover recommendation as Finding 2)
- Recommended action: as Finding 2. Interim: wrap `SARegulatoryUpdates` route element in `<ComingSoon />`.
- Relates to existing finding: Addendum §2E class.

### 4. `feature-visibility` route is gated by `RequireSuperAdmin`, not a specific permission — over-permits
- Role(s): all platform users (`finance`, `support`, `qa_tester`, `operations`, …)
- Page/route: `/superadmin/feature-visibility`
- File:line: `src/AppRoutes.tsx:1149`; `src/guards/RequireSuperAdmin.tsx:23`
- Issue: every other `/superadmin` route uses `PlatformPermissionGuard requiredPermission="sa_*"`, but this one uses `RequireSuperAdmin`, which admits `isSuperAdmin || isPlatformUser` — i.e. **any** `global_role`, including low-privilege `finance` (4 perms), `support` (6), and `qa_tester` (3). A QA tester or finance user can therefore reach the platform-wide feature-visibility CRUD, which changes what features other tenants see.
- Severity: Med
- Classification: **FIX**
- Recommended action: gate the route with `PlatformPermissionGuard` on an appropriate key (e.g. `sa_feature_flags` or `sa_system_settings`) instead of `RequireSuperAdmin`.
- Relates to existing finding: new (consistent with Addendum §2D "inconsistent inner guards").

### 5. `my-memberships` route has no inner permission guard — open to all platform roles
- Role(s): all platform users + legacy `super_admin`
- Page/route: `/superadmin/my-memberships`
- File:line: `src/AppRoutes.tsx:1133` (no `PlatformPermissionGuard`); `src/pages/superadmin/MyMemberships.tsx`
- Issue: the only gate is the outer `SuperAdminGuard`. The page manages tenant memberships and tenant-context switching for the platform operator — a sensitive cross-tenant capability — yet `qa_tester`/`finance`/`support` reach it unconditionally. `MyMemberships.tsx:89` also reads `audit_logs` via a `(supabase as any)` cast to dodge a typing issue.
- Severity: Med
- Classification: **FIX**
- Recommended action: wrap the route in `PlatformPermissionGuard` on a suitable key (e.g. `sa_manage_internal_users` or a new `sa_memberships`).
- Relates to existing finding: Addendum §2D ("`my-memberships` under `/superadmin`, no inner permission guard → open to all global roles") — confirmed.

### 6. Permission/role state logged to the browser console on every render (two locations)
- Role(s): all platform users / `super_admin`
- Page/route: every `/superadmin/*` route
- File:line: `src/guards/PlatformPermissionGuard.tsx:44-60, 64-76, 86-97, 113-128, 133-143` (`[REDIRECT_TRACE]`); `src/hooks/usePlatformPermissions.ts:155-174` (`[PERM_TRACE]`)
- Issue: both emit unconditional `console.log(JSON.stringify({...}))` on every render/evaluation, dumping `userId`, `globalRole`, `isPlatformOwner`, and the full `permissions` array. No `import.meta.env.DEV` guard. Anyone with DevTools open sees the platform permission matrix and their own user id.
- Severity: Med
- Classification: **FIX**
- Recommended action: wrap all `[REDIRECT_TRACE]` and `[PERM_TRACE]` logs in `if (import.meta.env.DEV)` (or remove). `usePlatformPermissions.ts:155` is a **second** instance the original audit did not list.
- Relates to existing finding: AUDIT-REPORT Critical #8 (the guard log) — this adds the `usePlatformPermissions` log as an additional location.

### 7. `send-test-invoice` recipient is a hardcoded staff email
- Role(s): `super_admin` / `sa_billing`
- Page/route: `/superadmin/billing`
- File:line: `src/pages/superadmin/BillingPage.tsx:112, 120`
- Issue: the "send test invoice" action posts `{ to: 'rhald@vivacity.com.au' }` — a named staff member's address hardcoded in source. The test invoice always goes to that one person, and the address is committed (a real email embedded in client code; against the org de-identification rule). The `send-test-invoice` edge function itself exists (verified).
- Severity: Low–Med
- Classification: **FIX**
- Recommended action: send to the current SuperAdmin's own email (from session) or a free-text input; remove the hardcoded literal.
- Relates to existing finding: new (same class as AUDIT-REPORT Critical #6 hardcoded personal email, different file).

### 8. `SystemSettings` has dead/placeholder maintenance controls
- Role(s): `super_admin` / `sa_system_settings`
- Page/route: `/superadmin/system/settings`
- File:line: `src/pages/superadmin/SystemSettings.tsx:195` (read-only `"Daily at 2:00 AM"` backup field, not loaded from DB), `:201-204` ("Run Database Cleanup" button with no `onClick`)
- Issue: the backup-frequency field is a hardcoded read-only string and the cleanup button does nothing — they look operational but are not wired. The rest of the page (real `system_settings` reads/writes) works.
- Severity: Low
- Classification: **COMING SOON** (the maintenance sub-section only)
- Recommended action: hide/disable the "Backups & Maintenance" sub-section (the hardcoded backup field + cleanup button) behind a "Coming Soon" treatment; leave the working settings sections live.
- Relates to existing finding: new.

### 9. `AuditLogs` refresh button is a no-op
- Role(s): `super_admin` / `sa_audit_trail`
- Page/route: `/superadmin/system/audit`
- File:line: `src/pages/superadmin/AuditLogs.tsx:30`
- Issue: `handleRefresh` only `console.log`s; the visible Refresh control does not refetch.
- Severity: Low
- Classification: **FIX**
- Recommended action: invalidate/refetch the underlying queries in `handleRefresh`, or remove the button.
- Relates to existing finding: new.

### 10. `BillingTestConsole` error-stream reader has no timeout
- Role(s): `super_admin` / `sa_dev_tools`
- Page/route: `/superadmin/billing/test-console`
- File:line: `src/pages/superadmin/BillingTestConsole.tsx:160-179`
- Issue: a custom edge-function error parser uses `getReader().read()` in a loop with no timeout/abort; if an error body streams without closing, the action can hang with the button stuck loading. Dev-tools-gated, low blast radius. (All edge functions it invokes — `superadmin-billing`, `stripe-create-checkout-session`, `stripe-create-portal-session` — exist; verified.)
- Severity: Low
- Classification: **FIX**
- Recommended action: add an `AbortController` with a timeout around the stream read.
- Relates to existing finding: new (same missing-timeout class as AUDIT-REPORT `ValidateInvite.tsx`).

### 11. `SuperAdminPanel.tsx` — dead file (named in the audit scope)
- Role(s): n/a
- Page/route: none (not in `AppRoutes.tsx`)
- File:line: `src/pages/SuperAdminPanel.tsx:1` (`@ts-nocheck`), `:285` (hardcoded anon key used as `Authorization: Bearer`)
- Issue: the brief names `SuperAdminPanel` explicitly; confirmed it is **not routed** — the live SuperAdmin dashboard is `src/pages/superadmin/SA_Dashboard.tsx`. The old panel carries `@ts-nocheck` and a hardcoded anon key. No production purpose.
- Severity: Med (a leaked anon key sits in committed source)
- Classification: **REMOVE**
- Recommended action: delete the file after grepping for references (none expected).
- Relates to existing finding: AUDIT-REPORT Cluster 2 / Clean Removal Candidates — confirmed still present.

### 12. Hardcoded Supabase URL + anon key on the SuperAdmin client path (cross-cutting)
- Role(s): all
- File:line: `src/integrations/supabase/client.ts:5-6`
- Issue: the SuperAdmin surface inherits the platform-wide hardcoded URL + anon key. Noted only for completeness — already the headline of the platform audit.
- Severity: Critical (platform-wide, not role-specific)
- Classification: **FIX**
- Recommended action: as AUDIT-REPORT Cluster 1 (env vars + key rotation).
- Relates to existing finding: AUDIT-REPORT Critical #1 / #2.

---

## Pages checked and found clean (real data, real tables/RPCs, sane states)

`SA_Dashboard`, `Analytics`, `EmailDomains`, `OrphanRecovery`, `Sales`, `BillingRiskMonitorPage`, `AccessAuditPage`, `ErrorMonitorPage`, `FailedJobsPage`, `SecurityEventsPage`, `TenantHealthPage`, `SystemLogsPage`, `OpsSuggestionsPage`, `Templates`, `HelpCentreManager`, `KnowledgeBase`, `ReleaseNotes`, `NcverUpload`, `TasLab`, `TasHealth`, `TASPortfolio`, `ComplianceGraph`, `OptimisationPage`, `DeliveryConsole`, `WorkPackages`, `NotificationsManagement`, `Suggestions`, `Preview`, `QATestingTracker`, `FeatureVisibility` (page logic is fine; the *route guard* is the issue — Finding 4), `EmailMonitoring`, `DevInterface`, `TenantContextMonitor`, regulatory-intelligence tabs.

All bare RPCs in these pages were verified to resolve correctly to `public` (`get_tenant_engagement_summary`, `get_billing_entitlement`, `sa_list_plan_prices`, `recompute_next_billing_date`, `sa_list_enforcement_actions`, `sa_list_webhook_events`, `sa_webhook_health`, all `sa_*` test-console functions, `debug_tenant_context`, `rls_probe_tga_pre_import`, `sa_dev_*`, `rpc_sa_tas_health`, `rpc_get_portfolio_dashboard`, `rpc_tas_integrity_dashboard`, `publish_global_update_to_tenants`, `list_suggestions`). The `'—'`/`'N/A'` strings flagged by the page sweep on `ErrorMonitorPage`, `FailedJobsPage`, `TenantHealthPage`, `SystemLogsPage`, `ManageSubscription`, `TASPortfolio` are **loading/empty-value fallbacks**, not hardcoded fake KPIs — not classified as defects.

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| 1 | `super_admin` (no `global_role`) locked out of SuperAdmin by `PlatformPermissionGuard` loop | High | FIX |
| 2 | Regulatory Sources page queries wrong schema (`public` vs `regulatory`) | Med | FIX |
| 3 | Regulatory Updates page queries wrong schema | Med | FIX |
| 4 | `feature-visibility` gated by `RequireSuperAdmin`, not a permission — over-permits | Med | FIX |
| 5 | `my-memberships` has no inner permission guard | Med | FIX |
| 6 | Role/permission state console-logged in production (guard + hook) | Med | FIX |
| 7 | `send-test-invoice` recipient hardcoded to a staff email | Low–Med | FIX |
| 8 | `SystemSettings` dead "Run Database Cleanup" + placeholder backup field | Low | COMING SOON |
| 9 | `AuditLogs` refresh button is a no-op | Low | FIX |
| 10 | `BillingTestConsole` error-stream read without timeout | Low | FIX |
| 11 | `SuperAdminPanel.tsx` unrouted dead file (anon key, `@ts-nocheck`) | Med | REMOVE |
| 12 | Hardcoded Supabase URL + anon key (cross-cutting) | Critical | FIX |

---

## Coming Soon cover list (actionable)

- **`/superadmin/regulatory/sources`** — wrap the `SARegulatorySources` route element in `AppRoutes.tsx:1165` with a `<ComingSoon />` cover until the `regulatory`-schema data path is fixed (Finding 2). Currently 100% non-functional.
- **`/superadmin/regulatory/updates`** — wrap the `SARegulatoryUpdates` route element in `AppRoutes.tsx:1166` with a `<ComingSoon />` cover until fixed (Finding 3). Currently 100% non-functional.
- **`/superadmin/system/settings` — "Backups & Maintenance" sub-section only** — cover/hide the hardcoded backup-frequency field and the dead "Run Database Cleanup" button in `SystemSettings.tsx:195-204` (Finding 8). The rest of the page stays live.

*All work was read-only on `main` and the live DB (catalogue/SELECT only). No source, migration, config, or edge-function changes were made. Remediation on `main` remains Carl's/Dave's domain — flag before any branch.*
