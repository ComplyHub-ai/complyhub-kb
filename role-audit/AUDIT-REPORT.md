# ComplyHub — Platform Audit Report

**Date:** 1 June 2026
**Branch audited:** `main`
**Purpose:** Pre-Vercel migration stability audit — identify bugs, security issues, and incomplete features. Classify each as FIX or COMING SOON.

---

## Diagnosis Notes (from deep-read, 1 June 2026)

All 8 critical security issues confirmed. Key clarifications versus the original audit:

- **AdminRoute.tsx `.single()` issue** — the `.single()` call is NOT in `AdminRoute.tsx` itself; it lives inside the imported `fetchEffectiveRole()` utility. Still real, location differs.
- **ValidateInvite.tsx timeout** — has session-storage rate-limit logic that reduces the infinite-spinner risk. No hard network timeout is still a gap, but lower severity than stated.
- **ai-router auth** — service-role client is created before auth, but tenant operational data only flows through the authenticated code path. The risk is that unauthenticated callers can trigger code paths that skip tenant isolation, not that they can query arbitrary data freely.
- **documents-upload JWT (`atob`)** — code comments assert `verify_jwt = true` handles this at the gateway. Before fixing, confirm `verify_jwt = true` is set for each affected function in `supabase/config.toml`. The `auth.getUser()` pattern is still correct regardless.
- **ConsultantGuard.tsx session check** — session check is delegated to the `useConsultantClients()` hook; the guard itself is thin but not unguarded.
- **InboundEmailStatusPanel.tsx** — hardcoded URL is in a `||` fallback pattern (`VITE_SUPABASE_URL || 'https://...'`), confirmed at line 26.
- **useCanonicalPricing.ts** — both URL (line 44) and anon key (line 53) are hardcoded in the fetch call body.
- **sslDiagnostics.ts** — anon key hardcoded in THREE separate local variable declarations (lines ~62, ~83–84, ~153–154).

---

## Fix Clusters & Sequencing

Issues are grouped into six independently executable clusters. Clusters 1, 2, and 6 can start immediately and run in parallel. Clusters 3, 4, and 5 require specific owners and should not be mixed across people in the same PR.

### Priority order

| Priority | Cluster | Owner | Rationale |
|---|---|---|---|
| 1 | Cluster 1 — Credentials sweep | Anyone | Leaked anon key is already in git history; rotating it is the single highest-leverage action |
| 1 | Cluster 2 — Dead file removal | Anyone | `AuthRepair.tsx` has a hardcoded personal email on a live (guarded) route |
| 2 | Cluster 5 — Edge function auth | Carl | Tenant impersonation risk; architectural, touches deployed functions |
| 2 | Cluster 4 — AppRoutes TenantGuard gaps | RJ | Single-file change but large scope; RJ owns route architecture |
| 3 | Cluster 3 — Frontend auth & guard hardening | RJ | Lower exploitation difficulty but touches PKCE/session flow |
| 3 | Cluster 6 — Standalone minor fixes | Anyone | Isolated, low blast radius |

---

### Cluster 1 — Credentials Sweep
**Replace all hardcoded URL and anon key instances with `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. Each file is independent — parallelisable.**

After all replacements: **rotate the Supabase anon key** — the existing one is already leaked in git history.

| File | Lines | What to fix |
|---|---|---|
| `src/integrations/supabase/client.ts` | 5–6 | Both URL and key constants |
| `src/lib/callEdge.ts` | 27 | Hardcoded fetch URL |
| `src/lib/environmentCheck.ts` | 28–29 | Local URL + key variables |
| `src/lib/sslDiagnostics.ts` | ~62, 83–84, 153–154 | Three separate local declarations |
| `src/hooks/useCanonicalPricing.ts` | 44, 53 | URL + key in fetch call body |
| `src/components/SuperAdmin/dashboard/InboundEmailStatusPanel.tsx` | 26 | Remove `\|\|` hardcoded fallback |
| `src/lib/documentFiles.ts` | 7, 9 | URL + key |
| `src/lib/registerEvidence.ts` | 8, 10 | URL + key |
| `src/lib/supabaseClient.ts` | 7 | Key |
| `src/pages/settings/UsersManagement.tsx` | 379 | Key |
| `src/pages/settings/ProfileSettings.tsx` | 379 | Key |
| `src/components/settings/BrandingUploader.tsx` | 15 | URL |
| `src/lib/cspConfig.ts` | 8 | URL |
| `src/components/admin/InviteSenderHealthCheck.tsx` | 29 | Key used as `Authorization: Bearer` header — fix or delete (see Cluster 2) |

---

### Cluster 2 — Dead File Removal
**Unrouted files or files with critical issues and no live purpose. Each deletion is independent — parallelisable. Grep each filename across `src/` before deleting to confirm zero references.**

| File | Route | Reason |
|---|---|---|
| `src/pages/debug/AuthRepair.tsx` | `/debug/auth-repair` | Hardcoded personal email (`angela.tk.connell@gmail.com`) at line 12; one-time repair tool with no production value |
| `src/pages/SuperAdminPanel.tsx` | None (unrouted) | `@ts-nocheck` at line 1; hardcoded anon key at line 285; dead file |
| `src/pages/TestMFAPage.tsx` | None (unrouted) | Test utility; not in `AppRoutes.tsx` |
| `src/pages/AuthTestingPage.tsx` | None (unrouted) | Auth testing utility; not in `AppRoutes.tsx` |
| `src/pages/QAValidationSummary.tsx` | None (unrouted) | Not in `AppRoutes.tsx` |
| `src/routes/guards/RegulatoryOfficerRoute.tsx` | N/A | Guard exists but is never imported or applied anywhere |

---

### Cluster 3 — Frontend Auth & Guard Hardening
**Different files, share no state — parallelisable within the cluster. RJ owns.**

| File | Lines | Fix |
|---|---|---|
| `src/pages/auth/Callback.tsx` | 22–32, 67–76 | Replace manual hash parsing with `supabase.auth.exchangeCodeForSession()` or `onAuthStateChange`; if profile upsert fails, invalidate the session rather than leaving it live with an incomplete profile |
| `src/guards/PlatformPermissionGuard.tsx` | 43–60, 85–99 | Wrap all `[REDIRECT_TRACE]` `console.log` calls with `if (import.meta.env.DEV)`; fix redirect to `/superadmin/dashboard` for non-platform users (line 85–99) that causes a ping-pong loop |
| `src/guards/SuperAdminGuard.tsx` | 34 | Narrow `isPlatformUser` — enumerate the specific roles that need SA access rather than granting all platform users the same gate |
| `fetchEffectiveRole()` utility (location TBD — imported by `AdminRoute.tsx`) | — | Replace `.single()` with `.maybeSingle()` or `.limit(1)` to prevent false access-denied for multi-membership users |

---

### Cluster 4 — AppRoutes.tsx TenantGuard Gaps
**All changes are in `src/AppRoutes.tsx` — single file, do in one pass. RJ owns.**

- Wrap the following route groups in `<TenantGuard>`: `risk`, `ci`, `caa`, `compliance`, `executive`, `emails`, `suggestions`, `audit-engine`, `assessment-validation`, `students-support`/`sso`, `ci-engine`, `compliance-digest`, `heatmap`, `self-assurance`
- Add superadmin-specific guard to `/admin/tas-redteam` (currently reachable by all tenant Administrators via `AdminRoute`)
- Add role guard or remove `/dashboard/developers-page` from unauthenticated-user access
- Import and apply `RequireSAWithMFA` to superadmin routes — the component exists and works but is used on zero routes

---

### Cluster 5 — Edge Function Auth Hardening
**Each function is a separate deployed unit — parallelisable. Carl owns.**

Before touching JWT issues: confirm `verify_jwt = true` is set for each affected function in `supabase/config.toml`.

| Function | Lines | Fix |
|---|---|---|
| `supabase/functions/ai-router/index.ts` | 553–556, 777–807 | Move auth check before any data access; gate all tenant-data queries behind verified JWT; restrict `Access-Control-Allow-Origin` from `*` to the production domain |
| `supabase/functions/cancel-subscription/index.ts` | 41–47 | After JWT verify, query `tenant_members` to confirm `user.id` is Administrator of `tenant_id` before any billing write |
| `supabase/functions/change-plan/index.ts` | 41–47 | Same fix as `cancel-subscription` |
| `supabase/functions/documents-upload/index.ts` | 25, 62–94 | Replace `atob()` decode with `supabaseClient.auth.getUser()`; move membership check before quota check |
| `supabase/functions/documents-delete/index.ts` | 25 | Replace `atob()` decode with `supabaseClient.auth.getUser()` |
| `supabase/functions/api-v1-router/index.ts` | 52 | Replace `atob()` decode with `supabaseClient.auth.getUser()` |
| `supabase/functions/fix-storage-policies/index.ts` | 25 | Replace `atob()` decode with `supabaseClient.auth.getUser()` |

---

### Cluster 6 — Standalone Minor Fixes
**Isolated, low blast radius — parallelisable.**

| File | Lines | Fix |
|---|---|---|
| `supabase/functions/bulk-tenant-actions/index.ts` | 102–107 | Fix `add_to_watchlist`: replace invalid `supabase.rpc()` inside `.update()` with a proper `array_append` SQL RPC or raw PostgreSQL update |
| Database — `platform_permissions` + `platform_role_permissions` | RLS policies | Restrict SELECT from `qual: true` (all authenticated) to `sec.is_super_admin()` — requires a migration; flag for Dave |
| Database — `vivacity_staff` | RLS policy | Confirm `is_superadmin()` in the policy resolves correctly to `sec.is_super_admin()` — flag for Dave |

---

## CRITICAL — Security (fix before Vercel deploy)

**1. Hardcoded Supabase anon key in 11+ source files**
- **Location:** `src/integrations/supabase/client.ts:6`, `src/lib/documentFiles.ts:9`, `src/lib/registerEvidence.ts:10`, `src/lib/supabaseClient.ts:7`, `src/lib/environmentCheck.ts:29`, `src/lib/sslDiagnostics.ts:84,154`, `src/pages/SuperAdminPanel.tsx:285`, `src/pages/settings/UsersManagement.tsx:379`, `src/pages/settings/ProfileSettings.tsx:379`, `src/hooks/useCanonicalPricing.ts:53`, `src/components/admin/InviteSenderHealthCheck.tsx:29`
- **Issue:** The Supabase anon key (`eyJhbGciOiJIUzI1NiIsIn…`) is hardcoded as a string literal in committed source. In `SuperAdminPanel.tsx:285` and `InviteSenderHealthCheck.tsx:29` it is used as a hand-constructed `Authorization: Bearer` header, bypassing user session auth entirely.
- **Recommended fix:** Replace all instances with `import.meta.env.VITE_SUPABASE_ANON_KEY`. Rotate the key after removal from git history.

---

**2. Hardcoded Supabase project URL across ~30 source files**
- **Location:** `src/integrations/supabase/client.ts:5`, `src/lib/callEdge.ts:27`, `src/lib/cspConfig.ts:8`, `src/lib/documentFiles.ts:7`, `src/lib/registerEvidence.ts:8`, `src/components/settings/BrandingUploader.tsx:15`, `src/hooks/useCanonicalPricing.ts:44`, and ~20 more files. Explicit forbidden fallback at `src/components/SuperAdmin/dashboard/InboundEmailStatusPanel.tsx:26`.
- **Issue:** The production URL `https://gdwhlstfguxarnxasrrs.supabase.co` is hardcoded throughout. Breaks any staging/preview Vercel deployment and leaks the project ID in client bundles.
- **Recommended fix:** Centralise all edge function calls through the existing `src/lib/callEdge.ts` and replace its hardcoded URL with `import.meta.env.VITE_SUPABASE_URL`.

---

**3. `ai-router` edge function: service-role client used WITHOUT hard auth gate**
- **Location:** `supabase/functions/ai-router/index.ts:553-556`
- **Issue:** Creates a service-role Supabase client before any auth check. The auth header is only inspected optionally at line 781 — it is not a gate. An unauthenticated caller can query any tenant's live operational data (documents, credentials, risks, governance actions) by omitting the Authorization header.
- **Recommended fix:** Return 401 if no valid JWT, before any data access. The service-role client must only be used after the caller's JWT is verified.

---

**4. `cancel-subscription` and `change-plan`: no tenant membership check**
- **Location:** `supabase/functions/cancel-subscription/index.ts:41-47`, `supabase/functions/change-plan/index.ts:41-47`
- **Issue:** Both functions verify the caller is authenticated but operate on any `tenant_id` supplied in the request body. No check that the authenticated user is an administrator of that tenant. Any authenticated user can cancel or change the plan of any tenant by supplying an arbitrary UUID.
- **Recommended fix:** Verify `user.id` is an Administrator of `tenant_id` (query `tenant_members`) or is `super_admin` before any billing write.

---

**5. `documents-upload`, `documents-delete`, `api-v1-router`: JWT decoded without signature verification**
- **Location:** `supabase/functions/documents-upload/index.ts:25`, `supabase/functions/documents-delete/index.ts:25`, `supabase/functions/api-v1-router/index.ts:52`, `supabase/functions/fix-storage-policies/index.ts:25`
- **Issue:** Functions extract `userId` via `atob(token.split('.')[1])` — signature is never verified. A forged JWT with an arbitrary `sub` claim would be accepted, allowing impersonation of any user ID.
- **Recommended fix:** Replace with `const { data: { user } } = await supabaseClient.auth.getUser()` on the user-context client.

---

**6. Personal email address hardcoded in production source**
- **Location:** `src/pages/debug/AuthRepair.tsx:12`
- **Issue:** `const [email, setEmail] = useState('angela.tk.connell@gmail.com')` — a named person's private email is committed in source code at a live (super-admin-guarded) route `/debug/auth-repair`.
- **Recommended fix:** Remove immediately. This file is also a clean removal candidate (see below).

---

**7. `platform_permissions` and `platform_role_permissions`: SELECT open to all authenticated users**
- **Location:** Database — policies `platform_permissions_read` and `platform_role_permissions_read`
- **Issue:** Both SELECT policies have `qual: true` with role `authenticated` — every logged-in user can enumerate the full internal permission matrix.
- **Recommended fix:** Restrict SELECT to `sec.is_super_admin()` or `sec.is_platform_user()`.

---

**8. `PlatformPermissionGuard` logs full user role/permissions to browser console in production**
- **Location:** `src/guards/PlatformPermissionGuard.tsx:44-60`
- **Issue:** Every render emits `console.log('[REDIRECT_TRACE]', JSON.stringify({...}))` with the user's role, permissions set, `isPlatformOwner`, `globalRole`, and current pathname — visible to anyone who opens DevTools. No `import.meta.env.DEV` guard.
- **Recommended fix:** Wrap all `[REDIRECT_TRACE]` logs with `if (import.meta.env.DEV)`.

---

## BREAKING BUGS (crashes or auth failures)

| Location | Bug | Verdict |
|---|---|---|
| `supabase/functions/cancel-subscription`, `change-plan` | `tenant_id` from body used without membership check — writes can target wrong tenant | FIX |
| `supabase/functions/documents-upload:62-94` | Upload limit check runs before membership check — another tenant's quota is enumerable | FIX |
| `src/routes/guards/AdminRoute.tsx` | Role fetch uses `.single()` — fails for multi-membership users; causes false access-denied | FIX |
| `src/pages/ValidateInvite.tsx:48` | No timeout on invite validation `useEffect` — indefinite spinner if edge function is unreachable | FIX |
| `src/pages/auth/Callback.tsx:27-41` | Manual URL hash parsing bypasses PKCE — token injection possible via crafted redirect | FIX |
| `src/pages/compliance/PolicyDriftPage.tsx:52` | Queries `from("documents" as any)` — correct table is `documents_register`; silently returns empty at runtime | FIX or COMING SOON |

---

## RBAC GAPS

| Route(s) | Missing or incorrect guard | Risk level |
|---|---|---|
| `/dashboard/risk`, `/dashboard/ci`, `/dashboard/caa`, and ~15 other register routes inside `RootAppLayout` | No `TenantGuard` — orphan/new users with no tenant can reach live data pages | High |
| `/dashboard/compliance`, `/dashboard/executive`, `/dashboard/emails`, `/dashboard/suggestions` | No role guard and no `TenantGuard` — any authenticated user can reach executive dashboards | Med |
| `/dashboard/audit-engine`, `/dashboard/audit-engine/manual/:auditId` | No `TenantGuard` | Med |
| `/dashboard/assessment-validation` and all sub-routes | No `TenantGuard` | Med |
| `/dashboard/students-support/*`, `/dashboard/sso/*`, `/dashboard/student-support/*` | No `TenantGuard` | Med |
| `/dashboard/ci-engine`, `/dashboard/compliance-digest`, `/dashboard/heatmap`, `/dashboard/self-assurance` | No `TenantGuard` | Med |
| `/admin/tas-redteam` | Protected by `AdminRoute` only — intended as superadmin tool but reachable by all tenant Administrators | Med |
| `RequireSAWithMFA` component | Exists and works but is used on **zero** routes in `AppRoutes.tsx` — MFA not enforced on any live production route | High |
| `/dashboard/developers-page` | Inside authenticated `RootAppLayout` with no guard — any logged-in user can read developer tooling | Low |
| `RegulatoryOfficerRoute` guard | Exists in `src/routes/guards/` but never imported or used in `AppRoutes.tsx` | Low |

---

## RLS FINDINGS

| Table | RLS enabled? | Policy count | Issue |
|---|---|---|---|
| `platform_permissions` | Yes | 1 | SELECT `qual: true` — all authenticated users can read full permission catalogue |
| `platform_role_permissions` | Yes | 2 | SELECT `qual: true` — same issue |
| `tenants` | Yes | 6 | Two overlapping SELECT policies — redundant, increases attack surface |
| `user_invitations` | Yes | 8 | SELECT by token allows enumeration of valid uncancelled invitations — token entropy should be verified |
| `vivacity_staff` | Yes | 1 | Policy uses `is_superadmin()` (old function name) — confirm it resolves to `sec.is_super_admin()` |
| All other active tables | Yes | 1+ each | No tables found with RLS enabled and zero policies. No tables found with RLS disabled. |
| Public-schema views | Safe | N/A | No `SECURITY DEFINER` views found — all views inherit caller RLS correctly |

**Note:** `organization_members` is a VIEW over `tenant_members`, not a table. It has no independent RLS and inherits `tenant_members` RLS correctly — safe.

---

## COMING SOON CANDIDATES

| Page file | Route(s) | Reason | Completion effort |
|---|---|---|---|
| `src/pages/admin/portals/EmployerPortalPage.tsx` | `/admin/user-portals/employer` | All KPIs hardcoded integers (12, 3, 28, 94%) — no database queries | Low |
| `src/pages/admin/portals/ConsultantPortalPage.tsx` | `/admin/user-portals/consultant` | All KPIs hardcoded integers (3, 2, 15, 8) — no database queries | Low |
| `src/pages/admin/portals/ThirdPartyPortalPage.tsx` | `/admin/user-portals/third-party` | All KPIs hardcoded integers — no database queries | Low |
| `src/pages/admin/portals/StudentPortalPage.tsx` | `/admin/user-portals/student` | Thin wrapper over `StudentDashboard` — no portal-specific functionality | Low |
| `src/pages/admin/portals/RegulatorPortalPage.tsx` | `/admin/user-portals/regulator` | Thin wrapper over `AuditorDashboard` — no regulator-specific functionality | Low |
| `src/pages/compliance/ExecutiveSnapshotPage.tsx` | `/dashboard/compliance/executive-snapshot` | Phase 6 — RPCs called with `as any` cast, may not exist in DB. Partially wired. | High |
| `src/pages/compliance/PolicyDriftPage.tsx` | `/dashboard/compliance/policies/drift` | `run_policy_drift_check` RPC not found in any migration; queries wrong table (`documents` vs `documents_register`) | High |
| `src/pages/compliance/RiskSimulatorPage.tsx` | `/dashboard/compliance/simulator` | `simulate_risk` RPC not found in migrations; Phase 6 incomplete | High |
| `src/pages/workforce/WorkforceIntelligenceDashboard.tsx` | `/dashboard/workforce/dashboard` | `credential_status`, `currency_status`, `supervision_status` all hardcoded `"–"` strings, never populated from DB | High |
| `src/pages/self-assurance/simulation.tsx` | `/dashboard/self-assurance/simulation` | Calls `self-assurance-pdf` edge function which does not exist in the functions directory | Med |
| `src/pages/go-live/index.tsx` | `/dashboard/go-live` | Only one module defined; `go_live_checklists` queried as `any` | Med |
| `src/pages/dashboard/AuditReadinessPage.tsx` | `/dashboard/governance/audit-readiness` | Renders `ComplianceValidationSection` with `currentTAS={null}` — placeholder state throughout | Low |

---

## CLEAN REMOVAL CANDIDATES

| File | Route | Reason |
|---|---|---|
| `src/pages/debug/AuthRepair.tsx` | `/debug/auth-repair` | One-time repair tool with hardcoded private email address. No place in production. |
| `src/pages/SuperAdminPanel.tsx` | None (unrouted) | Has `// @ts-nocheck` at line 1, hardcoded anon key at line 285. Dead file. |
| `src/pages/TestMFAPage.tsx` | None (unrouted) | Test utility — not in `AppRoutes.tsx`. Dead file. |
| `src/pages/AuthTestingPage.tsx` | None (unrouted) | Auth testing utility — not in `AppRoutes.tsx`. Dead file. |
| `src/pages/QAValidationSummary.tsx` | None (unrouted) | Not in `AppRoutes.tsx`. Dead file. |
| `src/routes/guards/RegulatoryOfficerRoute.tsx` | N/A | Guard never imported or used anywhere. Dead file. |
| `src/components/admin/InviteSenderHealthCheck.tsx` | Used inside admin area | Contains hardcoded anon key at line 29 used as direct `Authorization` header. Remove or fix. |

---

## MINOR BUGS

| Location (file:line) | Issue | Severity |
|---|---|---|
| `src/guards/PlatformPermissionGuard.tsx:98` | Non-platform user redirected to `/superadmin/dashboard`, which then redirects them away — ping-pong redirect loop | Med |
| `supabase/functions/bulk-tenant-actions/index.ts:105` | `add_to_watchlist` case calls invalid Supabase JS syntax — runtime error for that action | Med |
| `src/pages/compliance/PolicyDriftPage.tsx:52` | `from("documents" as any)` — table is `documents_register`; silently returns empty at runtime | High |
| `src/guards/ConsultantGuard.tsx:13` | No session check before `isConsultant` evaluation — possible bad redirect for unauthenticated users | Low |
| `src/pages/auth/Callback.tsx:67-76` | On profile upsert failure, session stays live but profile is incomplete — causes downstream RLS failures | Med |
| `src/components/SuperAdmin/dashboard/InboundEmailStatusPanel.tsx:26` | Uses forbidden hardcoded URL fallback pattern: `VITE_SUPABASE_URL \|\| 'https://gdwhlstfguxarnxasrrs.supabase.co'` | Med |
| `src/pages/workforce/WorkforceIntelligenceDashboard.tsx:76-80` | `credential_status`, `currency_status`, `supervision_status` all hardcoded `"–"` — described in interface as real data but never populated | High |
| `supabase/functions/ai-router/index.ts` (throughout) | `Access-Control-Allow-Origin: "*"` on an AI function that queries tenant operational data — domain restriction preferable | Low |
| `/admin/tas-redteam` | TAS red-team testing tool accessible to all tenant Administrators — should be superadmin-only or removed from non-SA routes | Med |
| `src/guards/SuperAdminGuard.tsx:34` | `isPlatformUser` grants access to all SA routes regardless of specific permissions — overly broad for operations/support staff | Low |

---

## Key files referenced in this audit

- `src/AppRoutes.tsx`
- `src/guards/PlatformPermissionGuard.tsx`
- `src/guards/SuperAdminGuard.tsx`
- `src/guards/ConsultantGuard.tsx`
- `src/routes/guards/AdminRoute.tsx`
- `src/routes/guards/TrainerRoute.tsx`
- `src/integrations/supabase/client.ts`
- `src/lib/callEdge.ts`
- `src/pages/debug/AuthRepair.tsx`
- `src/pages/SuperAdminPanel.tsx`
- `src/components/admin/InviteSenderHealthCheck.tsx`
- `supabase/functions/ai-router/index.ts`
- `supabase/functions/cancel-subscription/index.ts`
- `supabase/functions/change-plan/index.ts`
- `supabase/functions/documents-upload/index.ts`
- `supabase/functions/documents-delete/index.ts`
- `supabase/functions/bulk-tenant-actions/index.ts`

---
---

# ADDENDUM — Opus 4.8 Diagnosis & Re-Audit

**Date:** 4 June 2026
**Branch re-audited:** `main` (commit `7ec9fdfa0`)
**Method:** Five parallel read-only verification agents over the source tree and the live Supabase project (`gdwhlstfguxarnxasrrs`, read-only MCP). Each agent verified the original claims against current code/catalogue AND hunted for what the first pass missed.
**Purpose:** Diagnose every finding above (confirm / refine / refute) and surface what the original audit did not catch.

## Headline verdict

The original report is directionally sound but **materially incomplete**. All 8 "critical" security findings are real. But it under-counted nearly every category, misattributed the single most-cited bug (the `.single()` issue), and missed an entire second tier of edge-function holes — several of which are *worse* than items it flagged. Net effect: roughly **40% more attack surface** than the original shows.

---

## Part 1 — Corrections to the original (wrong or imprecise)

| # | Original claim | Diagnosis | Correct position |
|---|---|---|---|
| C1 | `.single()` bug in `AdminRoute.tsx` (note "corrected" it to `fetchEffectiveRole()`) | **MISATTRIBUTED — both wrong.** No `.single()` in either. | Real offender: `src/lib/getUserRoleAndRoute.ts:74` — `from('tenant_members')…eq('user_id', user.id).single()` throws PGRST116 for multi-membership users → false "no access". 2nd: `src/lib/ensureOrgMembershipAndDefault.ts:43`. NB `getUserRoleAndRoute` is marked deprecated — confirm a live caller. |
| C2 | `Callback.tsx:67-76` — session stays live after profile upsert failure | **HALF REFUTED.** PKCE-bypass via manual hash parse (`:22-41`) is real. | Current code (`:72-77`) sets error and `return`s on upsert failure. The "live session + incomplete profile" half no longer holds on `main`. |
| C3 | Diagnosis note: ValidateInvite session-storage logic "reduces infinite-spinner risk" | **WRONG.** That code is a `console.warn` debug aid — no throttle/abort. | Indefinite-spinner risk is **unmitigated**. Real line `ValidateInvite.tsx:47`. |
| C4 | `self-assurance/simulation.tsx` calls non-existent `self-assurance-pdf` edge fn | **REFUTED.** Function exists and is registered in `config.toml`. | Not a bug. |
| C5 | `AuthRepair.tsx` is an unrouted dead file | **REFUTED as "dead".** It *is* routed at `/debug/auth-repair` behind `RequireSuperAdmin`. | Hardcoded personal Gmail is real; "unrouted" framing is wrong. |
| C6 | `vivacity_staff` uses old `is_superadmin()` — possibly broken | **REFINED.** `public.is_superadmin()` exists, functionally identical to `sec.is_super_admin()`. | Cosmetic legacy-alias inconsistency, not a hole. |
| C7 | Counts: `tenants` 6 policies; `sslDiagnostics.ts` "three key decls" | **REFINED.** | `tenants` has **8** policies; `sslDiagnostics.ts` has 3 URL decls + 2 key decls. |
| C8 | `documents-upload` — "no membership check" | **REFINED.** A membership check exists at `:99-104`. | Real bugs there: unverified `atob` decode + quota-check-before-membership ordering. |

---

## Part 2 — What the original MISSED

### 2A. Edge functions — 8 additional vulnerable functions (highest-impact gap)

The original flagged 7. There are at least **8 more** with the same or worse bug classes, all with `Access-Control-Allow-Origin: "*"`:

| Function | Problem | Severity |
|---|---|---|
| `analyze-documents-batch` | 5th `atob()` unverified-JWT decoder; trusts unsigned `tenant_id`; service-role read/write to `documents` | **Critical** — cross-tenant R/W via forged token |
| `predictive-analytics` | **Zero auth**, service-role, `tenant_id` from body | Critical |
| `generate-digest` | **Zero auth**, service-role, reads any tenant's `audit_findings` | Critical |
| `clause-matcher` | **Zero auth**, service-role, no tenant scoping at all | Critical |
| `verify-evidence` | **Zero auth**; requires `tenant_id` but query ignores it, looks up by `evidence_id` only | Critical |
| `analyze-trainer-evidence` | **Zero auth**, service-role, writes `evidence_documents` | Critical |
| `self-assurance-simulation` | Cosmetic auth (checks header *presence*, never validates); writes any tenant's runs | High |
| `consultation-prompt-pack` | Service-role client with caller's JWT forwarded (false-RLS; service_role bypasses RLS); no membership check | High |

**Bug-class tallies (verified):** manual unverified JWT decode = **5 functions** (the 4 originally flagged + `analyze-documents-batch`); service-role + body `tenant_id`/record-id with no membership check = **≥10 functions**; CORS `*` while touching tenant data = **every function reviewed**.

**Follow-up watchlist** (same no-auth/service-role shape, not yet fully traced): `dap-ai-draft`, `compute-unit-complexity`, `analyze-credential-certificate`, `governance-meeting-analyser`, `ai-unit-risk-scorer`, `tas-fetch-labour-market`, `analyze-document-fields`, `analyze-resume`, `meeting-minutes-summarize`. → **Carl** to trace before fix scoping.

### 2B. Credentials — 32 URL files (not ~7 listed), corrupted key, false "fixed" comments

- Actual count: **32 files** with hardcoded URL/project-ref; **10 files** with the anon key (original listed ~7 URL / 11 key).
- Missed URL files: `FunctionsHealthTab.tsx` (six URLs), `useFunctionRegistry.ts`, `MagicLinkPage.tsx`, `useEmailHealth.ts`, `useTGAUnitLookup.ts`, `DeployDoctor.tsx`, `AnalyticsDashboard.tsx`, `trainer-portal/dashboard.tsx`, `AssessmentConditionsFetcher.tsx`, `Callback.tsx:132`, plus URL siblings at `UsersManagement.tsx:375` / `ProfileSettings.tsx:375` / `SuperAdminPanel.tsx:281` / `InviteSenderHealthCheck.tsx:24`.
- Missed project-ref/hostname literals: `securityUtils.ts:75`, `securityEnhancement.ts:77`, `cspConfig.ts:17`, plus env+literal-fallback in `FPPFileUploadSection.tsx:157,217` and `registers/fpp/index.tsx:184`.
- **`UsersManagement.tsx:379` holds a CORRUPTED copy of the anon key** (typo `InRlZiI6` vs `InJlZiI6`).
- **`supabaseClient.ts` and `cspConfig.ts` carry comments falsely claiming the hardcoding was removed.**
- PII: only `AuthRepair.tsx:12` (`angela.tk.connell@gmail.com`) is a genuine personal-Gmail leak. The `angela@vivacity.com.au` occurrences (`seoUtils.ts`, `SEOHead.tsx`, legal pages, `AppFooter.tsx`) are legitimate public business contact, not credentials.

### 2C. Database — 2 missed CRITICAL items + far broader `qual=true`

- **`user_invitations` anon enumeration is a real data leak.** Both "validate by token" SELECT policies (anon + authenticated) have **no predicate matching the caller's token** — any anonymous user can `SELECT *` and receive every valid uncancelled invitation (emails, `tenant_id`, tokens). The original framed this as token-entropy; tokens are 256-bit `gen_random_bytes(32)` (strong). The leak is the **policy logic**, not guessability. **Higher severity than written.**
- **2 SECURITY DEFINER views the original declared absent:** `public.q1_tas` and `public.tas_industry_theme_packs` — both ERROR-level in the security advisor, both bypass caller RLS, may expose tenant TAS data. Original said "No SECURITY DEFINER views found." **Refuted.**
- **`qual=true` SELECT spans 378 policies, not 2.** Most are benign reference data, but sensitive ones missed: **`ai_provider_config`** (`public` readable), **`survey_tokens`** (same enumeration pattern as invitations), plus `subscribers`, `billing_plan_limits`, `subscription_tier_definitions`, and ~30 `_zz_deprecated_*` tables still carrying live read policies.
- **`tenants` SELECT overlap is worse than stated:** 4 permissive policies grant SELECT (`read_tenant`, `Tenant members can view their tenant`, plus the ALL `billing_gate`/`write_admin`). Performance advisor: 4,152 multiple-permissive-policy warnings, 439 auth-RLS-init warnings, 18 tables with no primary key.

### 2D. Routes / guards — missed gaps + structural rot

- **`/developers-page`** is a top-level route (not `/dashboard/developers-page` as written) and is **genuinely unguarded** — no TenantGuard, no role guard.
- **Missed unguarded routes:** `tas/builder`; `admin/fpp/failed-deletes`, `admin/fpp/reconciliation`, `admin/governance/health` (admin-operational pages sitting in the *non*-admin route group — worse than most TenantGuard gaps); `admin/integrations/tga`; `registers/sso-reports`; `my-memberships` (under `/superadmin`, no inner permission guard → open to all global roles).
- **Three competing `TenantGuard` implementations** (`components/tenant/TenantGuard.tsx` [the live one], `components/TenantGuard.tsx` [orphaned], `guards/RequireTenant.tsx` [unwired]) — same name, different behaviour, a live import footgun.
- **Deprecation is backwards:** the `@deprecated` `AuditorRoute` is the one wired into routing; its intended replacement `RegulatoryOfficerRoute` is the dead/unused one.
- `RequireSAWithMFA` is wired into exactly one reachable surface (`Analytics` page body), zero routes — so "MFA enforced nowhere meaningful" stands.

### 2E. More schema-mismatch bugs (same root cause as PolicyDriftPage)

- `WorkforceIntelligenceDashboard.tsx:71` queries `from("people" as any)` — real table is `workforce.people`, not `public.people`. The hardcoded `"–"` statuses flagged above are likely **masking** this broken fetch.
- The "missing RPC" coming-soon items are **misdiagnosed**: `run_policy_drift_check`, `simulate_risk`, `get_risk_dashboard`, `generate_pd_plan` **all exist** — in `ai.` / `compliance.` / `workforce.` schemas — while the pages call them bare (resolving to `public.`). Broken for a **schema-exposure reason**, not missing functions. Different fix (expose schema or add public wrappers).
- **Additional dead files** beyond the original list: `Dashboard_OLD.tsx`, `Tasks_OLD.tsx`, `SuperAdminDemo.tsx`, `TestingDashboard.tsx`.

---

## Part 3 — Impact on the original sequencing

- **Cluster 5 (Edge function auth) roughly doubles in size.** Add the 8 functions in §2A plus the watchlist. The five **zero-auth** functions (`predictive-analytics`, `generate-digest`, `clause-matcher`, `verify-evidence`, `analyze-trainer-evidence`) are arguably the single highest cross-tenant risk on the platform and should be triaged first within Carl's cluster.
- **Cluster 6 / DB (Dave):** add (1) `user_invitations` token-match fix — make the validate policies compare the supplied token; (2) convert `q1_tas` and `tas_industry_theme_packs` to `security_invoker=true`; (3) review `{public}` `qual=true` on `ai_provider_config` and `survey_tokens`.
- **Cluster 1 (Credentials):** widen the sweep to the full 32-file URL list and 10-file key list; treat `UsersManagement.tsx:379` (corrupted key) and the two false "removed" comments as part of the sweep.
- **Cluster 3 (Frontend):** retarget the `.single()` fix to `getUserRoleAndRoute.ts:74` and `ensureOrgMembershipAndDefault.ts:43`; drop the Callback profile-upsert item (already fixed).

*All re-audit work was read-only on `main` and the live DB (SELECT / advisors only). No source or database writes were made. Remediation on `main`, `config.toml`, `supabase/migrations/`, and edge functions remains Carl's/Dave's domain — flag before any branch.*
