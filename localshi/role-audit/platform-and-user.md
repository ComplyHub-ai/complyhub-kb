# Role Audit — Platform global_role tier (platform_owner / platform_admin / operations / qa_tester / support / finance) and the generic `user` fallback

**Auditor scope:** the PLATFORM tier (`profiles.global_role`) and the bare/`null` "user" fallback.
**Branch:** `main` (production). **Method:** read-only source review + read-only Supabase MCP (`gdwhlstfguxarnxasrrs`), SELECT only. No writes.
**Date:** 4 June 2026.

> Scope note on terminology. The dispatch named the platform roles as *platform_owner, operations, sales, support*. The code's actual platform tier (`PlatformGlobalRole` in `src/types/authz.ts:16` and `src/hooks/usePlatformPermissions.ts:6`) is **`platform_owner`, `platform_admin`, `operations`, `qa_tester`, `support`, `finance`**. There is **no `sales` global_role** — "sales" exists only as a *permission* (`sa_sales`) and a page (`/superadmin/billing/sales`), granted to `finance`, `platform_admin`, and `platform_owner`. This report audits the real role set.

---

## How global_role gating works (as built)

The platform tier uses a **two-layer guard** on the `/superadmin/*` route group (`src/AppRoutes.tsx:1114-1182`):

1. **Outer — `SuperAdminGuard`** (`src/guards/SuperAdminGuard.tsx`) wraps the whole group via `<SuperAdminGuard><Outlet/></SuperAdminGuard>`. It admits if `hasAccess = isSuperAdmin || isPlatformUser`, where `isSuperAdmin` comes from `profiles.role === 'super_admin'` (`useAuthRoles`) and `isPlatformUser = !!global_role` (`usePlatformPermissions:181`). So **any non-null `global_role` passes the outer gate.**
2. **Inner — `PlatformPermissionGuard requiredPermission="sa_*"`** (`src/guards/PlatformPermissionGuard.tsx`) on each child route. It resolves the user's permission set: `platform_owner` ⇒ all permissions implicitly (`usePlatformPermissions:124`); every other role ⇒ defaults from `platform_role_permissions` plus per-user rows in `platform_user_permission_overrides`.

Permission→route mapping is sound and consistent with the sidebar (`src/config/superAdminNav.ts`, filtered by `hasPermission` in `src/components/SuperAdminSidebarNav.tsx:75-102`). I verified the live permission matrix:

| global_role | sa_dashboard? | notable grants | profiles in DB |
|---|---|---|---|
| platform_owner | ✓ (implicit all) | everything | 9 (8 also `role=super_admin`, 1 `Compliance Manager`) |
| platform_admin | ✓ | 21 perms incl. tenants/users/billing | 0 live |
| operations | ✓ | control-centre, support, tenant-health, QA, suggestions | 1 (also `role=super_admin`) |
| support | ✓ | support-workflow, tenant-health, help-centre, suggestions | 0 live |
| finance | ✓ | billing, sales, risk-monitor | 0 live |
| qa_tester | ✓ | control-centre, qa-tracker | 4 (`role` null) |

**Every platform role carries `sa_dashboard`**, and there are currently **zero** rows in `platform_user_permission_overrides`. This matters for the loop findings below: the bugs are real but currently *latent* because no live data triggers them.

The bare `user` fallback: 23 profiles have **both `role = null` and `global_role = null`**. These users are not platform users (`isPlatformUser=false`) and not super_admin, so `SuperAdminGuard` redirects them out of `/superadmin/*` (to `/consultant/dashboard` if a Consultant, else `/dashboard`). Post-login they resolve to `/tenant/select` ("No active tenant context", `src/lib/auth/landing.ts:85`).

---

## Surface map

### Platform tier — `/superadmin/*` (outer `SuperAdminGuard`, inner per-route permission)
Route → component → inner guard permission (`src/AppRoutes.tsx:1118-1180`):

- `dashboard` → `SA_Dashboard` → `sa_dashboard`
- `tenants`, `tenants/:id/subscription`, `tenants/dormant` → Tenants Hub / ManageSubscription / DormantTenants → `sa_tenants_hub`
- `users`, `email-domains`, `orphan-recovery` → `sa_users_roles`
- `suggestions` → `sa_suggestions`; `analytics` → `sa_dashboard`
- `my-memberships` → `SuperAdminMyMemberships` → **no inner guard** (see F3)
- `system/access-audit` → `sa_manage_internal_users`
- `ops/control-centre` → `sa_control_centre`; `ops/support` → `sa_support_workflow`
- `system/logs` & `system/error-monitor` → `sa_system_logs`; `system/jobs` → `sa_failed_jobs`; `system/tenant-health` → `sa_tenant_health`; `system/security-events` → `sa_security_events`; `system/ops-suggestions` → `sa_platform_insights`; `system/audit` → `sa_audit_trail`; `system/settings` → `sa_system_settings`
- `billing` → `sa_billing`; `billing/sales` → `sa_sales`; `billing/risk-monitor` → `sa_risk_monitor`
- `system/flags` → `sa_feature_flags`; `feature-visibility` → **`RequireSuperAdmin`** (stricter: true super_admin only)
- `preview` → `sa_preview_as`; `notifications` → `sa_notifications`; `release-notes` → `sa_release_notes`; `content/help-centre` → `sa_help_centre`
- `qa-testing` → `QAAccessGuard` + `sa_qa_tracker`
- ~20 dev-tools routes (`work-packages`, `delivery-console`, `compliance-graph`, `optimisation`, `tas-lab`, `tas-portfolio`, `tas-health`, `knowledge-base`, `dev-interface`, `codes`, `content/templates`, `content/email-templates`, `ncver-upload`, `regulatory*`, `regression-monitor`, `tenant-context`, `billing/test-console`, `billing/webhook-events`, `billing/enforcement-log`, `ops/emails`) → all `sa_dev_tools` (only `platform_owner`/legacy `super_admin` have it)

### Bare `user` (null role, no tenant) — reachable surface
- `/login`, `/welcome`, `/tenant/select`, public/auth pages.
- `/dashboard/*` register pages that the platform audit flagged as **missing `TenantGuard`** (AUDIT RBAC GAPS) — a tenantless user can technically route there; RLS then returns empty. Out of my scope (covered cross-cutting); noted as the real exposure for this role.
- **Can read the entire platform RBAC matrix** via RLS (see F4).

---

## Findings

### F1 — Legacy `super_admin` with no `global_role` is locked out of all `/superadmin/*` by an infinite redirect
- Role(s): platform tier (legacy super_admin path)
- Page/route: every `/superadmin/*` route
- File:line: `src/guards/SuperAdminGuard.tsx:34` (admits on `isSuperAdmin`) vs `src/guards/PlatformPermissionGuard.tsx:85-99` (denies on `!isPlatformUser`, redirect target `/superadmin/dashboard`)
- Issue: The outer guard admits a user whose `profiles.role='super_admin'` **even if `global_role` is null** (`isSuperAdmin || isPlatformUser`). But every child route's `PlatformPermissionGuard` evaluates `isPlatformUser = !!global_role`, which is `false` for that user, so it redirects to `/superadmin/dashboard`. That target is itself a `PlatformPermissionGuard` route → same denial → **infinite client-side redirect loop**. The two guards use two different definitions of "platform user".
- Severity: Med (latent)
- Classification: **FIX**
- Recommended action: Align the definitions. Either (a) treat legacy `super_admin` as a platform user inside `usePlatformPermissions` (`isPlatformUser = !!globalRole || profileRole==='super_admin'`, and grant implicit-all like `platform_owner`), or (b) make `PlatformPermissionGuard`'s fallback redirect to a route that is **not** permission-gated (e.g. `/dashboard`) to break the loop. Live data is currently safe — all 9 super_admins also have a `global_role` — but the path is created the moment anyone is promoted to `super_admin` without setting `global_role`.
- Relates to existing AUDIT finding: refines MINOR BUGS #1 (the `/superadmin/dashboard` ping-pong) — this is the precise mechanism and trigger.

### F2 — `PlatformPermissionGuard` denial redirect is itself permission-gated → loop if any platform user lacks `sa_dashboard`
- Role(s): any platform role (operations, support, finance, qa_tester, platform_admin)
- Page/route: any `/superadmin/*` route the user lacks permission for
- File:line: `src/guards/PlatformPermissionGuard.tsx:102-130` (Stage 3 redirect → `/superadmin/dashboard`); target route `src/AppRoutes.tsx:1119` requires `sa_dashboard`
- Issue: When a platform user hits a route they lack permission for, they are bounced to `/superadmin/dashboard`. If that user also lacks `sa_dashboard`, the dashboard route denies and re-redirects to itself → infinite loop + repeated "Access Denied" toast. Today every role's default set includes `sa_dashboard`, so it doesn't fire — but a single `platform_user_permission_overrides` row with `permission_key='sa_dashboard', granted=false` would instantly lock that user out of the whole console with a redirect loop (the override-subtract path is live at `usePlatformPermissions:111-117`).
- Severity: Med (latent)
- Classification: **FIX**
- Recommended action: Redirect denied users to a guaranteed-renderable, permission-free landing (e.g. a static "no access to this area" page, or `/dashboard`) instead of a permission-gated route. Combine with F1 — both stem from "redirect target is itself guarded".
- Relates to existing AUDIT finding: extends MINOR BUGS #1 to the whole platform tier (original only described the non-platform case).

### F3 — `/superadmin/my-memberships` has no inner permission guard — reachable by every platform role
- Role(s): operations, support, finance, qa_tester (any non-owner platform role)
- Page/route: `/superadmin/my-memberships`
- File:line: `src/AppRoutes.tsx:1133` — `{ path: "my-memberships", element: <SuperAdminMyMemberships /> }` (no `PlatformPermissionGuard`, unlike every sibling)
- Issue: Every other `/superadmin/*` child is wrapped in a `PlatformPermissionGuard`; this one is bare. It is gated only by the outer `SuperAdminGuard`, so **any** authenticated platform user reaches it regardless of their permission set. It shows the signed-in user's own memberships (low data sensitivity), but it is an inconsistency in the otherwise uniform per-route permission model and there is no nav entry pointing to it (so it is "hidden but open").
- Severity: Low
- Classification: **FIX**
- Recommended action: Wrap in a `PlatformPermissionGuard` with an appropriate key (it is self-scoped, so `sa_dashboard` — which all platform roles hold — is sufficient and keeps it open to all platform staff while restoring the consistent guard wrapper). If it is not intended for platform staff at all, gate behind `sa_manage_internal_users`.
- Relates to existing AUDIT finding: confirms ADDENDUM §2D ("`my-memberships` … no inner permission guard → open to all global roles").

### F4 — Bare `user` (and every authenticated user) can read the full platform RBAC matrix
- Role(s): generic `user` fallback (and all authenticated roles)
- Page/route: N/A (database RLS, reachable from any client session)
- File:line: DB policies `platform_permissions_read` and `platform_role_permissions_read` — both `SELECT`, role `authenticated`, `qual = true` (verified live via `pg_policies`)
- Issue: A user with **no tenant, no global_role, null `profiles.role`** — i.e. the bare fallback user who can see no operational data — can still `SELECT *` from `platform_permissions` and `platform_role_permissions` and enumerate the complete internal permission catalogue and the exact permission set behind every platform role (`operations`, `support`, `finance`, etc.). This is the clearest *role-scoped* manifestation of the cross-cutting finding: the lowest-privilege account on the platform leaks the platform's own access-control design. (`platform_user_permission_overrides` is correctly scoped — `user_id = auth.uid() OR is_platform_admin_or_owner(...)`.)
- Severity: High
- Classification: **FIX** (DB migration — Dave's domain; flag, do not action)
- Recommended action: Restrict both SELECT policies from `qual: true` to `sec.is_super_admin()` / `is_platform_admin_or_owner(auth.uid())` (the same predicate already used on the overrides table). The frontend reads these tables only via authenticated platform users, so tightening does not break the platform console.
- Relates to existing AUDIT finding: confirms CRITICAL #7 / RLS FINDINGS — adds the bare-user lens (it is not just "all authenticated"; it is reachable by accounts with zero other access).

### F5 — `src/utils/roleHygiene.ts` is dead code and out of sync with the platform-role model
- Role(s): platform tier (role-hygiene utility named in brief)
- Page/route: N/A (utility module)
- File:line: `src/utils/roleHygiene.ts:9` (`GlobalRole = 'super_admin'` only)
- Issue: The brief calls this out as the role-hygiene module. Two problems: (1) **It is never imported anywhere** — `grep` for `@/utils/roleHygiene` / `utils/roleHygiene` returns zero hits across `src/`; the only matches for its function names are local re-definitions in `useAccessContext.ts`. It is dead. (2) Its `GlobalRole` type models only `'super_admin'` and is unaware of the entire `global_role` platform tier (`platform_owner`, `operations`, `support`, `finance`, `qa_tester`, `platform_admin`) that the live system in `types/authz.ts` and `usePlatformPermissions.ts` actually uses. If anyone wired this module back in believing it to be the canonical role model, it would silently mis-classify every platform user (none of them are `isAdminEquivalent`, none `canViewTenantData`, etc.).
- Severity: Low
- Classification: **REMOVE**
- Recommended action: Delete `src/utils/roleHygiene.ts` (confirm zero references first — already verified). If any helper is genuinely wanted later, rebuild it against the real `PlatformGlobalRole`/`TenantRole` types in `src/types/authz.ts`.
- Relates to existing AUDIT finding: new.

### F6 — Platform identity & full permission set logged to the browser console on every render
- Role(s): all platform roles
- Page/route: every `/superadmin/*` route (and anywhere `usePlatformPermissions` runs)
- File:line: `src/hooks/usePlatformPermissions.ts:155-174` (`console.log('[PERM_TRACE]', … userId, globalRole, permissionsContents …)`) and `src/guards/PlatformPermissionGuard.tsx:44-60, 64-76, 86-128` (`[REDIRECT_TRACE]` with `globalRole`, `isPlatformOwner`, full `permissions` array)
- Issue: Both the hook and the guard emit unconditional `console.log` (no `import.meta.env.DEV` gate) containing the user's `userId`, `globalRole`, `isPlatformOwner`, and the entire resolved permission set, on **every render**. Anyone opening DevTools on a platform-staff session sees the full internal authorisation state. The hook (`PERM_TRACE`) was not in the original report; the guard (`REDIRECT_TRACE`) was.
- Severity: Med
- Classification: **FIX**
- Recommended action: Wrap all `[PERM_TRACE]` and `[REDIRECT_TRACE]` logs in `if (import.meta.env.DEV)`, or route through `devLog` (already imported in `SuperAdminGuard`). These are also a performance smell — `JSON.stringify` of the permission set on every render.
- Relates to existing AUDIT finding: extends CRITICAL #8 (which only named `PlatformPermissionGuard`) to include `usePlatformPermissions.ts:155`.

### F7 — Preview / "Demo Mode" role is cosmetic only and gives a false impression of role-scoped access
- Role(s): platform_owner / super_admin (Demo Mode users)
- Page/route: any (global `PreviewRoleProvider`); trigger in `src/components/layout/PreviewRoleDropdown.tsx`
- File:line: `src/contexts/PreviewRoleContext.tsx:37-53` (state is plain `useState`); `PreviewRoleDropdown.tsx:31-37` (`startPreview` then `navigate`)
- Issue: Selecting a preview role only (a) sets a React `useState` value and (b) navigates to that role's home path. It does **not** change the session, JWT, `global_role`, active tenant, or any RLS context — the platform_owner retains full database access throughout. So "Preview as Student" shows that role's *landing page* while the user still has owner-level read/write underneath. It is also **not persisted** (lost on refresh, lost on hard navigation), and it is a *separate mechanism* from the server-side `/superadmin/preview` route (`sa_preview_as`), which can confuse operators about which "preview" is authoritative. No security boundary is crossed (only owners/super_admins see the dropdown, `PreviewRoleDropdown.tsx:20-25`), but the feature misrepresents what it does.
- Severity: Low
- Classification: **COMING SOON**
- Recommended action: Put a "Coming Soon" cover on the **Demo Mode dropdown** (hide/disable `PreviewRoleDropdown` where it is mounted in the layout header) until it is wired to a real impersonation/preview context, OR relabel it explicitly as "Navigation preview only — access is unchanged". Keep the server-backed `/superadmin/preview` route as the real preview. Do not cover `/superadmin/preview`.
- Relates to existing AUDIT finding: new.

### F8 — Dead/unused `super_admin` row in `platform_role_permissions` (config drift)
- Role(s): platform tier (config)
- Page/route: N/A (DB seed/config)
- File:line: DB table `platform_role_permissions` — a `global_role = 'super_admin'` set of 25 permission rows exists, but no profile uses `global_role='super_admin'` (super_admins carry `platform_owner`/`operations`), and `isPlatformOwner` keys on `'platform_owner'` only (`usePlatformPermissions:72`). Type `PlatformGlobalRole` does not even include `'super_admin'`.
- Issue: A row-set that nothing reads. If a user were ever given literal `global_role='super_admin'`, they would be `isPlatformUser=true` but **not** `isPlatformOwner`, receiving only those 25 explicit perms (missing `sa_dev_tools`, `sa_system_logs`, `sa_system_settings`) — a silently-degraded "super admin". Pure config drift today.
- Severity: Low
- Classification: **FIX** (DB cleanup — flag for Dave; do not action)
- Recommended action: Remove the orphaned `super_admin` rows from `platform_role_permissions`, or formally make `'super_admin'` an alias of `platform_owner` in `usePlatformPermissions` if it is meant to exist.
- Relates to existing AUDIT finding: new.

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| F1 | Legacy super_admin w/o global_role → infinite redirect into `/superadmin/*` | Med (latent) | FIX |
| F2 | Permission-denied redirect target is itself permission-gated → loop | Med (latent) | FIX |
| F3 | `/superadmin/my-memberships` missing inner permission guard | Low | FIX |
| F4 | Bare `user` can read full platform RBAC matrix (RLS `qual=true`) | High | FIX (DB/Dave) |
| F5 | `roleHygiene.ts` dead + out of sync with platform-role model | Low | REMOVE |
| F6 | `[PERM_TRACE]`/`[REDIRECT_TRACE]` leak identity + permission set to console | Med | FIX |
| F7 | Demo-Mode preview role is cosmetic; misrepresents access | Low | COMING SOON |
| F8 | Dead `super_admin` row in `platform_role_permissions` | Low | FIX (DB/Dave) |

---

## Coming Soon cover list

- **Demo Mode role-preview dropdown** (`src/components/layout/PreviewRoleDropdown.tsx`, mounted in the app header/layout): cover/hide the dropdown until it is backed by a real preview context. It is client-only `useState` navigation that does not change access (F7). **Do not** cover the server-backed `/superadmin/preview` route — that one is the real, permission-gated (`sa_preview_as`) preview tool.

*(No other platform-tier page warrants a Coming Soon cover — the `/superadmin/*` pages themselves load real data and are individually permission-gated. The remaining issues are FIX/REMOVE, not unfinished features.)*

---

## Notes for the team

- All eight findings were verified against the live DB (read-only). The two redirect-loop bugs (F1, F2) are **latent, not active**: every current platform role holds `sa_dashboard` and there are zero permission-override rows. They become live the instant someone (a) is made `super_admin` without a `global_role`, or (b) gets an override removing `sa_dashboard`. Worth fixing before either becomes routine.
- The role-resolution RPCs `get_effective_role`, `get_my_app_context`, `get_user_access_context` all resolve in the `public` schema — **no** schema-exposure (`ai.`/`compliance.`) bug for role resolution, unlike the page-level RPC bugs in the platform addendum.
- `fetchEffectiveRole.ts` carries `// @ts-nocheck` (line 1) and is a parallel role-resolution path to `usePlatformPermissions`/`get_my_app_context`; it is not in my finding list as a bug, but the platform has **three** overlapping role-resolution paths (`fetchEffectiveRole`, `useAccessContext`/`get_user_access_context`, `usePlatformPermissions`) — a consolidation candidate for Carl/RJ.
