# Role Audit — Trainer / Assessor (`Trainer`, `Trainer/Assessor`)

**Date:** 4 June 2026
**Branch audited:** `main` (read-only)
**Auditor:** per-role QA sweep, building on `AUDIT-REPORT.md` + Opus addendum
**Method:** Mapped the role surface from `AppRoutes.tsx`, `roleNavigation.ts` and the guards, then walked the trainer portal, credential/currency, evidence upload/verification, workforce intelligence, and TAS builder code. Findings below are evidence-based; line numbers cited were read directly. Subagent claims that did not survive verification have been dropped (noted at end).

> **Note on role mapping.** In `src/config/roleNavigation.ts:455-467` both `Trainer` and `Trainer/Assessor` resolve to the **same** `TRAINER_NAV`. There is no distinct assessor navigation — everything below applies to both. `getNavigationForRole()` also **defaults unknown/null roles to `TRAINER_NAV`** (`roleNavigation.ts:471,475`), so a user with a malformed role lands on the trainer menu.

---

## Surface map

The trainer menu (`TRAINER_NAV`, `roleNavigation.ts:216-261`) advertises these items. The "Actual route" column is what `AppRoutes.tsx` really resolves — note the systematic mismatch (Finding T-1).

| Menu label | Menu path | Guard | Actual route / component | Status |
|---|---|---|---|---|
| Trainer Dashboard | `/dashboard/trainer` | `TrainerRoute` (`AppRoutes.tsx:789-797`) | `pages/dashboard/TrainerDashboard` | reachable |
| My Schedule | `/calendar` | top-level (`:707`) | Calendar | reachable |
| Tasks | `/dashboard/tasks` | `TenantGuard` (`:813`) | `TasksPage` | reachable |
| Assigned Training Products | `/trainer-portal/products` | — | **redirects to `/dashboard/trainer-portal` → dashboard** | **broken (T-1)** |
| Assessment Validation | `/dashboard/assessment-validation` | none on route (`:953`) | `AssessmentValidationPage` | reachable, not trainer-scoped (T-2) |
| Training Matrix | `/trainer-portal/matrix` | — | **redirects to dashboard** (T-1) | **broken** |
| My PD Record | `/trainer-portal/pd` | — | **redirects to dashboard** (T-1) | **broken** |
| TAE Currency | `/dashboard/registers/tcr` | `routePermissions` allows Trainer (`:546`) | `TCR` register | reachable |
| Availability | `/trainer-portal/availability` | — | **redirects to dashboard; no `availability` route exists** (T-1) | **broken** |
| My Profile | `/trainer-portal/profile` | — | **redirects to dashboard** (T-1) | **broken** |
| Training Resources | `/document-repository` | `routePermissions` allows Trainer (`:558`) | `DocumentRepository` | reachable |
| Compliance Intelligence | `/complybot` | top-level | `ComplyBot` | reachable |

**The real trainer-portal pages** live under `/dashboard/trainer-portal/*` (`AppRoutes.tsx:1073-1108`), gated by `TrainerRoute`, and are reachable only by typing the correct URL — the menu never points at them. 30+ pages exist there (dashboard, pd, currency, vet-currency, profile, matrix, validation, select-products, tas, dap, session-plans, monthly-report, credentials, improvement-plan, assessment-decisions, industry-intel, lln-assessments, adjustment-plans, etc.).

**Guards:**
- `TrainerRoute` (`src/routes/guards/TrainerRoute.tsx`) — gates `/dashboard/trainer` and `/dashboard/trainer-portal`. Correctly waits for auth/impersonation/effective-role to resolve before deciding (`:39`). Allows `Trainer/Assessor`, `Trainer`, global super_admin, effective super_admin, or *any* impersonation session (`:27-28`). Logs access decisions to the browser console unconditionally (`:44,48`) — see T-10.
- `TrainerRouteWrapper` (`src/routes/guards/TrainerRouteWrapper.tsx`) — used only for `/dashboard/documents/trainers` (`AppRoutes.tsx:979`). Grants access to anyone with an active tenant, Administrator, or Consultant; logs to console (`:30-36`).
- `TrainerGuard` (`src/components/trainer-portal/TrainerGuard.tsx`) — a presentational guard available for embedding; not applied at the route layer.

---

## Findings

### T-1 — Entire trainer side-menu collapses to the dashboard (nav paths don't match routes)
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/trainer-portal/products`, `/trainer-portal/matrix`, `/trainer-portal/pd`, `/trainer-portal/availability`, `/trainer-portal/profile`
- File:line: `src/config/roleNavigation.ts:235-248` (menu) vs `src/AppRoutes.tsx:1228-1229` (redirect) and `:1073-1108` (real routes)
- Issue: The menu points at bare `/trainer-portal/*`. `AppRoutes.tsx:1229` declares `{ path: "/trainer-portal/*", element: <Navigate to="/dashboard/trainer-portal" replace /> }`, which **strips the sub-path** — every `/trainer-portal/x` link lands on `/dashboard/trainer-portal`, whose index redirects to `dashboard` (`:1076`). So Products, Matrix, PD, Availability and Profile menu items all dead-end on the dashboard. Worse, two of those targets don't even exist as routes: there is no `products` route (the real one is `select-products`, `:1099`) and no `availability` route at all in the trainer-portal children. The functioning pages (`/dashboard/trainer-portal/matrix`, `/pd`, `/profile`, etc.) are unreachable from the UI.
- Severity: High
- Classification: FIX
- Recommended action: Repoint the `TRAINER_NAV` items to their real routes (`/dashboard/trainer-portal/select-products`, `/matrix`, `/pd`, `/profile`) and add an `availability` route or remove that menu item. The catch-all redirect at `:1229` should preserve the sub-path or be removed once the menu is corrected.
- Relates to existing AUDIT-REPORT finding: new

### T-2 — Assessment Validation is not scoped/read-only for trainers despite the menu claiming so
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/dashboard/assessment-validation` (+ all sub-routes)
- File:line: menu declares `readOnly: true, description: 'Assigned units only'` (`roleNavigation.ts:236`); route has **no guard and no read-only enforcement** (`AppRoutes.tsx:953-973`)
- Issue: The trainer menu promises "Assigned units only" read-only access, but the route renders the full `AssessmentValidationPage` with no `TenantGuard` and no trainer scoping. `readOnly` in the nav config is advisory only — `isReadOnlyForRole()` exists (`roleNavigation.ts:501`) but the route element does not consume it. A trainer reaches the same full validation surface as an Administrator. The whole `assessment-validation` group also lacks `TenantGuard` (matches AUDIT-REPORT RBAC gap).
- Severity: Med
- Classification: FIX
- Recommended action: Wrap the group in `TenantGuard` and enforce trainer scoping/read-only (assigned units) inside the page, or gate the menu item out for trainers if scoping isn't ready.
- Relates to existing AUDIT-REPORT finding: RBAC gap "`/dashboard/assessment-validation` and all sub-routes — No `TenantGuard`"

### T-3 — Workforce Intelligence dashboard queries the wrong schema and shows placeholder statuses
- Role(s): Trainer/Assessor (workforce intelligence is part of the assessor remit)
- Page/route: `/dashboard/workforce/dashboard`
- File:line: `src/pages/workforce/WorkforceIntelligenceDashboard.tsx:71` and `:78-80`; RPCs at `:60` and `:87`
- Issue (verified directly): `supabase.from("people" as any)` resolves to `public.people`; the real table is `workforce.people` — the fetch returns nothing. Each row is then stamped with literal placeholders: `credential_status: "–", currency_status: "–", supervision_status: "–"` (`:78-80`) — so even if rows loaded, the three core columns are hardcoded dashes, never computed. The page also calls `supabase.rpc("get_risk_dashboard" as any)` (`:60`) and `rpc("generate_pd_plan" as any)` (`:87`) bare; per the Opus addendum these functions live in `workforce.`/`ai.`/`compliance.` schemas and resolve to `public.` here, failing silently.
- Severity: High
- Classification: COMING SOON
- Recommended action: Put a `<ComingSoon />` cover on `/dashboard/workforce/dashboard` (wrap the route element at `AppRoutes.tsx:936`) until the `workforce.people` fetch, the status computation, and the schema-qualified RPCs are wired. This is a large, clearly-unfinished page, not a one-line fix.
- Relates to existing AUDIT-REPORT finding: COMING SOON "WorkforceIntelligenceDashboard" + addendum §2E (`from("people" as any)` / missing-RPC schema diagnosis) — confirmed on current code.

### T-4 — `trainer-portal/validation` page is pure mock data
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/dashboard/trainer-portal/validation`
- File:line: `src/pages/trainer-portal/validation.tsx:11-29`
- Issue (verified directly): The page renders a hardcoded `validationActions` array (units `BSBWHS311`, `BSBCMM411`, fixed statuses and dates) with no Supabase query anywhere in the component. KPI counts derive from this static array. It looks like a working validation queue but is a prototype.
- Severity: High
- Classification: COMING SOON
- Recommended action: Cover `/dashboard/trainer-portal/validation` with a `<ComingSoon />` (route element at `AppRoutes.tsx:1083`). Note the *separate* real surface `/dashboard/assessment-validation` exists — confirm which is canonical before building this out.
- Relates to existing AUDIT-REPORT finding: new

### T-5 — `pages/admin/trainer-management/TrainerMatrix.tsx` is a dead shell (sets empty arrays)
- Role(s): affects Trainer matrix surface (admin-side, but part of the trainer matrix feature)
- Page/route: not routed in `AppRoutes.tsx` (the live matrix is `TrainerMatrixEngine` at `/admin/trainer-matrix-engine`, `:1198`)
- File:line: `src/pages/admin/trainer-management/TrainerMatrix.tsx:53-68`
- Issue (verified directly): `fetchData()` contains the comment `// No mock data - return empty arrays` and calls `setTrainers([])`, `setUnits([])`, `setTrainerUnits([])`. The page can never display data. It is not referenced in routing.
- Severity: Low
- Classification: REMOVE
- Recommended action: Delete the file after grepping for stray imports. Routing already uses `TrainerMatrixEngine`.
- Relates to existing AUDIT-REPORT finding: new (additional dead file beyond addendum §2E list)

### T-6 — Live trainer dashboard is `@ts-nocheck` flagged "references deprecated tables"
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/dashboard/trainer`
- File:line: `src/pages/dashboard/TrainerDashboard.tsx:1`
- Issue (verified directly): Line 1 is `// @ts-nocheck - References deprecated tables not in current schema`. The component does query real tables (`governance_meetings`, `trainer_monthly_reports`), but type-checking is globally disabled on the trainer's primary landing page, so any schema drift on the "deprecated tables" it references will fail silently at runtime rather than at build. This is the page the trainer menu actually lands on.
- Severity: Med
- Classification: FIX
- Recommended action: Remove `@ts-nocheck`, repair the deprecated-table references, and let CI type-check the page. Bounded and high-value given it's the role's home screen.
- Relates to existing AUDIT-REPORT finding: new

### T-7 — VET/industry currency hook keys on `auth.users.id` instead of the trainer profile id
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/dashboard/trainer-portal/vet-currency`
- File:line: `src/pages/trainer-portal/vet-currency.tsx:72`
- Issue (verified directly): `useVetCurrency` filters `trainer_vet_currency` with `.eq('trainer_id', user.id)` where `user` is `supabase.auth.getUser()`. The sibling currency surface and `TrainerPortalContext` resolve a distinct **trainer profile id** (`meTrainer.id`) for the same trainer; most trainer tables key on that profile id, not the auth user id. If `trainer_vet_currency.trainer_id` references the trainer profile (as the schema convention suggests), this query returns nothing for any admin-created trainer record and the currency tab shows empty. (FK not DB-verified in this read-only pass — flagged as likely-wrong by inconsistency with the rest of the portal.)
- Severity: High
- Classification: FIX
- Recommended action: Use the resolved trainer profile id from `TrainerPortalContext` (`meTrainer.id`) consistently, as the other currency views do. Confirm the `trainer_vet_currency.trainer_id` FK with Dave before changing.
- Relates to existing AUDIT-REPORT finding: new

### T-8 — Evidence-analysis edge functions reachable by the trainer flow have zero auth
- Role(s): Trainer/Assessor (evidence upload/verification)
- Page/route: trainer evidence upload components → `analyze-trainer-evidence`, `verify-evidence`
- File:line: `supabase/functions/analyze-trainer-evidence/index.ts` (no JWT verification before reading `trainerId`/`tenantId` from body); `supabase/functions/verify-evidence/index.ts` (no auth, accepts `evidence_id`/`tenant_id` from body, writes verification flags)
- Issue: Both functions create/use service-role access and trust `trainerId`/`tenantId`/`evidence_id` from the request body without verifying the caller's JWT or tenant membership. A forged or anonymous call can write evidence-analysis rows and flip `ai_verified` on another tenant's evidence. `verify-evidence` additionally drives paid OpenAI calls with no caller gate (billing-abuse vector). This is the trainer-facing entry to the platform-wide edge-function hole.
- Severity: Critical
- Classification: FIX
- Recommended action: Carl's domain — add `auth.getUser()` JWT verification, confirm caller is a member of the supplied `tenant_id` (and Admin/CM or the trainer themselves), and restrict CORS. Flag to Carl before any branch; do not edit `main`.
- Relates to existing AUDIT-REPORT finding: addendum §2A (`analyze-trainer-evidence`, `verify-evidence` listed Critical zero-auth) — confirmed reachable via the trainer evidence flow.

### T-9 — Trainer evidence credentials store split across two tables (TCR vs trainer matrix)
- Role(s): Trainer/Assessor, Compliance Manager (viewing trainer credentials)
- Page/route: `/dashboard/registers/tcr` and the trainer matrix engine
- File:line: legacy read `src/components/admin/user-management/TrainerCredentialsPanel.tsx` (queries `tcr_register`) vs canonical writes in the matrix engine hook (`trainer_matrix_credentials`); reported by subagent at `TrainerCredentialsPanel.tsx:79-87` and `useTrainerMatrixEngine.ts:361`
- Issue: Two parallel credential stores. The TCR panel reads `tcr_register` while the matrix engine writes `trainer_matrix_credentials`; they are not synchronised, so a trainer's credentials can differ between views and the "TAE Currency" register a trainer is sent to may not reflect the canonical record. (Reported by the credential-cluster subagent; table names not independently DB-verified this pass.)
- Severity: High
- Classification: FIX
- Recommended action: Pick the canonical table (`trainer_matrix_credentials`), repoint TCR reads to it, and treat `tcr_register` as read-only archive or migrate it. Confirm table topology with Dave.
- Relates to existing AUDIT-REPORT finding: new

### T-10 — Trainer route guards log to the browser console in production
- Role(s): Trainer, Trainer/Assessor
- Page/route: all `/dashboard/trainer*` and `/dashboard/trainer-portal*`
- File:line: `src/routes/guards/TrainerRoute.tsx:44,48`; `src/routes/guards/TrainerRouteWrapper.tsx:30-36,40,48`
- Issue: Both guards emit `console.log` of role/impersonation state on every access decision with no `import.meta.env.DEV` guard (`TrainerRoute.tsx:44` logs `{ profileRole, effectiveRole, isImpersonating }`). Same class as the `PlatformPermissionGuard` `[REDIRECT_TRACE]` issue in the platform audit, on the trainer surface.
- Severity: Low
- Classification: FIX
- Recommended action: Wrap these logs in `if (import.meta.env.DEV)`.
- Relates to existing AUDIT-REPORT finding: Security #8 (console logging of role/permissions) — same class, trainer-scoped instance.

### T-11 — TAS Builder route has no guard; reachable by Trainer/Assessor via URL
- Role(s): Trainer/Assessor (and any authenticated user)
- Page/route: `/dashboard/tas/builder`
- File:line: `src/AppRoutes.tsx:903` — `{ path: "tas/builder", element: <TASBuilder /> }`
- Issue: The route has no `TenantGuard` and no role guard, unlike sibling TAS routes. It is not in `TRAINER_NAV`, so it's hidden from the menu, but a trainer who navigates directly reaches the full TAS Builder. `routePermissions['/dashboard/tas/builder']` (`roleNavigation.ts:540`) lists Administrator/CM/GP/Regulator/super_admin — i.e. the *intended* audience excludes trainers — but that map is only consulted by `canAccessRoute()`, which is **not enforced on this route element**. The TAS Builder is large and the trainer bulk-assignment sub-components (`tas/builder/BulkTrainerAssignment.tsx`) issue unbounded `q1_tas_units` updates without timeout (reported `:169-176`).
- Severity: Med
- Classification: FIX
- Recommended action: Wrap the route in `TenantGuard` and add a role check (reuse the `routePermissions` list) so trainers cannot reach the builder by URL. RJ owns route architecture — flag before branching.
- Relates to existing AUDIT-REPORT finding: addendum §2D ("Missed unguarded routes: `tas/builder`") — confirmed.

### T-12 — Guided/bulk trainer evidence upload lacks timeouts and (in one path) DB persistence
- Role(s): Trainer/Assessor
- Page/route: trainer-portal evidence upload components
- File:line: reported `src/components/trainers/BulkTrainerDocumentUpload.tsx:177-183` (no timeout/AbortController on `functions.invoke`); `src/components/trainer-portal/GuidedEvidenceUpload.tsx:85-92` (uploads to the `trainer-evidence` bucket but creates no DB row); `supabase/functions/bulk-trainer-document-upload/index.ts` (JWT verified but no tenant-membership check on body `tenantId`)
- Issue: Evidence uploads can hang indefinitely if the edge function stalls (no timeout), and at least one upload path writes the file to storage without registering it in any evidence table — orphaned, unauditable evidence. The bulk upload function verifies the JWT but does not confirm the caller belongs to the `tenantId` it operates on. (Reported by the evidence-cluster subagent; line numbers not independently re-verified.)
- Severity: Med
- Classification: FIX
- Recommended action: Add an AbortController/timeout to evidence `functions.invoke` calls; persist an evidence registry row after storage upload; add the tenant-membership check in `bulk-trainer-document-upload` (Carl, edge fn).
- Relates to existing AUDIT-REPORT finding: addendum §2A (edge-fn auth class); upload timeout is new role-scoped detail.

### T-13 — `components/trainer-portal/TrainerDashboard.tsx` hardcoded KPIs (used only by an unrouted page)
- Role(s): admin trainer-management (not trainer-facing)
- Page/route: none reachable — used only by `pages/admin/trainer-management/TrainerOverview.tsx`, which is **not** in `AppRoutes.tsx`
- File:line: `src/components/trainer-portal/TrainerDashboard.tsx:16-23` (`totalTrainers: 24, complianceRate: 87, …` mock stats)
- Issue (verified): All KPIs are hardcoded mock data. **Correction to the cluster subagent**, which framed this as the trainer's live dashboard — it is not. The trainer's live dashboard is `pages/dashboard/TrainerDashboard.tsx` (see T-6). This component is only consumed by the unrouted `TrainerOverview`, so it is effectively dead code today.
- Severity: Low
- Classification: REMOVE (or COMING SOON if `TrainerOverview` is intended to be routed — then cover that route)
- Recommended action: Delete `TrainerDashboard.tsx` + `TrainerOverview.tsx` if abandoned; otherwise wire real data before routing.
- Relates to existing AUDIT-REPORT finding: new

### T-14 — `trainer-portal/profile` shows hardcoded completion/compliance percentages
- Role(s): Trainer, Trainer/Assessor
- Page/route: `/dashboard/trainer-portal/profile`
- File:line: reported `src/pages/trainer-portal/profile.tsx:263` (`const completionPercentage = 75; // Placeholder`) and `:361,369` (hardcoded `80%`, `70%` compliance bars)
- Issue: Profile completion and compliance KPIs are static placeholders presented as real metrics. (Reported by the portal-cluster subagent; not independently re-verified this pass, but consistent with the placeholder pattern seen elsewhere.) Page is otherwise functional (real profile data + edit).
- Severity: Med
- Classification: FIX
- Recommended action: Compute completion/compliance from the trainer's actual credential/PD/currency records, or hide those cards until wired. Bounded — the page itself works, only the KPI widgets are stubbed.
- Relates to existing AUDIT-REPORT finding: new

### T-15 — `useFullTrainerMatrix` emits stubbed profile/declaration/PD fields as if real
- Role(s): Trainer/Assessor (trainer matrix / governance evidence)
- Page/route: trainer matrix surfaces consuming this hook
- File:line: reported `src/hooks/useFullTrainerMatrix.ts:71-75` (`employment_status:'casual'`, `role_type:'both'`, `declaration_signed:false` hardcoded), `:115,119` (`supervisees:[]`, `tae_units_qualified:[]` never queried), `:150` (`pd_count:0`)
- Issue: The "full" trainer matrix returns hardcoded profile attributes, empty supervisee/TAE-unit lists, and a zero PD count regardless of actual data. These feed governance/credential evidence, so trainers can appear compliant (or mis-classified) on data that was never fetched. (Reported by the credential-cluster subagent; not independently re-verified.)
- Severity: High
- Classification: COMING SOON (the matrix profile section is materially unwired) — cover the dependent matrix view, or FIX field-by-field if the source tables exist
- Recommended action: Wire `employment_status`/`role_type`/declaration state, supervisees and TAE units, and PD aggregation from their real tables; until then mark the affected matrix sections as in-progress. Confirm source tables with Dave.
- Relates to existing AUDIT-REPORT finding: new

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| T-1 | Trainer side-menu collapses to dashboard (nav/route mismatch + `/trainer-portal/*` redirect) | High | FIX |
| T-2 | Assessment Validation not scoped/read-only for trainers despite menu | Med | FIX |
| T-3 | Workforce Intelligence dashboard: wrong schema (`public.people`) + hardcoded "–" statuses + bare RPCs | High | COMING SOON |
| T-4 | `trainer-portal/validation` is pure mock data | High | COMING SOON |
| T-5 | `admin/trainer-management/TrainerMatrix.tsx` dead shell (empty arrays) | Low | REMOVE |
| T-6 | Live trainer dashboard is `@ts-nocheck` "references deprecated tables" | Med | FIX |
| T-7 | VET currency hook keys on `auth.users.id`, not trainer profile id | High | FIX |
| T-8 | `analyze-trainer-evidence` / `verify-evidence` edge fns: zero auth, body-supplied tenant | Critical | FIX |
| T-9 | Trainer credentials split across `tcr_register` vs `trainer_matrix_credentials` | High | FIX |
| T-10 | Trainer route guards `console.log` role state in production | Low | FIX |
| T-11 | `/dashboard/tas/builder` unguarded; reachable by trainer via URL | Med | FIX |
| T-12 | Evidence upload: no timeout; one path skips DB persistence; missing tenant check | Med | FIX |
| T-13 | `components/trainer-portal/TrainerDashboard.tsx` hardcoded KPIs (unrouted/dead) | Low | REMOVE |
| T-14 | `trainer-portal/profile` hardcoded completion/compliance percentages | Med | FIX |
| T-15 | `useFullTrainerMatrix` stubbed profile/declaration/PD fields presented as real | High | COMING SOON |

---

## Coming Soon cover list

Routes/pages recommended for a `<ComingSoon />` cover (or menu gating) until completed:

- **`/dashboard/workforce/dashboard`** — wrap the route element at `AppRoutes.tsx:936` (`<TenantGuard><WorkforceIntelligenceDashboard/></TenantGuard>`) in a `<ComingSoon />` cover. Wrong-schema fetch + hardcoded statuses + unresolved RPCs (T-3).
- **`/dashboard/trainer-portal/validation`** — cover the route element at `AppRoutes.tsx:1083`; the page is pure mock data (T-4). Confirm canonical validation surface first.
- **Trainer matrix "full profile" sections** fed by `useFullTrainerMatrix` — gate the profile/declaration/supervisee/PD sub-sections until wired (T-15), rather than the whole matrix.
- *(Conditional)* **`pages/admin/trainer-management/TrainerOverview` route** — if it is ever wired, it renders the hardcoded-KPI `TrainerDashboard` (T-13); cover or finish before routing. Currently unrouted, so REMOVE is preferred.

## Remove list (dead files, no production purpose)

- `src/pages/admin/trainer-management/TrainerMatrix.tsx` — dead shell, not routed (T-5).
- `src/components/trainer-portal/TrainerDashboard.tsx` + `src/pages/admin/trainer-management/TrainerOverview.tsx` — hardcoded mock dashboard reachable from nowhere (T-13).

---

### Subagent claims dropped after verification
- "Dashboard button to `/dashboard/trainer-portal/credentials` is a dead-end (route doesn't exist)" — **false**; the `credentials` route exists at `AppRoutes.tsx:1098`.
- "The trainer's main dashboard is all hardcoded mock stats" — **mis-attributed**; that mock component (`components/trainer-portal/TrainerDashboard.tsx`) is not the trainer's route. The live dashboard is `pages/dashboard/TrainerDashboard.tsx` (real queries, but `@ts-nocheck` — see T-6). Recorded correctly as T-13/T-6.

*All audit work was read-only on `main`. No source, migration, config, edge-function, or database writes were made. Edge-function and database remediations (T-8, T-9, T-12, T-15 source tables) are Carl's/Dave's domain — flag before any branch.*
