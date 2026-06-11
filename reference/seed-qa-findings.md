# ComplyHub — Seed QA Findings Log
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**QA Round 1:** 2026-06-09 — 22 findings identified
**QA Round 2:** 2026-06-10 — 6 confirmed fixed, 11 still failing, 3 new findings
**QA Round 3 (partial):** 2026-06-10 — F-008, F-009 confirmed fixed manually
**QA Round 4:** 2026-06-10 — 7 confirmed fixed, 8 still failing, 2 new findings, 2 new seed gaps
**QA Round 5:** 2026-06-11 — All Round 4 failures fixed on branch. Production DB migration pending for NEW-004.
**QA Round 6 (Session A partial):** 2026-06-11 — Pre-flight, Roles 1–2 complete. Role 3 cut short (rate limit). SEED-001 regression. 2 new findings (NEW-006, NEW-007).
**Tester:** Brian (Khian) — Round 1 + Round 3 manual / Claude (automated) — Round 2 / Claude Chrome — Round 4 / Brian + Claude — Round 5 / Claude Chrome — Round 6 Session A
**Status:** Round 6 Session A **INCOMPLETE** — resume Role 3 (§3.2–3.5). SEED-001 closed as by design (view filters authority_level > 1). Awaiting RJ on NEW-003. Production DB migration for NEW-004 still pending before merge.

---

## How to use this log

When a checklist item fails or shows unexpected behaviour, record it here immediately.
Do not continue to the next role until the current role's findings are logged.

Severity guide:
- **P0** — cross-tenant data leak or auth bypass — stop and escalate to RJ immediately
- **P1** — wrong role lands in wrong context, sees wrong data, or guard not firing
- **P2** — UI cosmetic, missing label, wrong redirect destination

Owner guide:
- **RJ** — frontend routing, guards, component behaviour
- **Carl** — infrastructure, seed, DB config
- **Dave** — RLS, migrations, schema

---

## Summary

| # | Role | Route | Severity | Owner | R1 | R2 | R3 | R4 | R5 | R6 |
|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Super Admin | Post-login landing | P1 | RJ | Fixed | ✅ Fixed | — | — (see NEW-002) | — | — |
| F-002 | Super Admin | `/superadmin/dashboard` | P1 | Carl/Dave | Fixed | ✅ Fixed | — | — | — | — |
| F-003 | All roles | Post-login landing | P1 | Carl | Fixed | ✅ Fixed | — | — | — | — |
| F-004 | Administrator | CT Risk Level dropdown | P2 | RJ | Fixed | ✅ Fixed | — | ✅ Fixed | — | — |
| F-005 | All roles | Person dropdowns — Unknown names | P2 | Carl | Fixed | ✅ Fixed | — | ⚠️ Not retested | — | ✅ Fixed |
| F-006 | Administrator | SSR Add form — missing asterisk | P2 | RJ | Fixed | ✅ Fixed | — | ⚠️ Not retested | — | — |
| F-007 | All roles | `/settings/rto` crashes | P2 | RJ | Fixed | ✅ Fixed | ⚠️ Needs retest | ✅ Fixed all roles | — | ✅ Admin verified |
| F-008 | Governing Person | History tab blank page | P2 | RJ | Fixed | ❌ Blank | ✅ Fixed | ✅ Fixed | — | ⚠️ Incomplete |
| F-009 | CM | `/complybot` Access Denied | P1 | RJ | Fixed | ❌ Denied | ✅ Fixed | ✅ Fixed | — | — |
| F-010 | CM | PDR register — no Add button | P1 | RJ | Fixed | ✅ Fixed | ⚠️ Retest | ✅ Fixed | — | — |
| F-011 | CM | `/dashboard/user-management` 404 | P1 | RJ | Fixed | ✅ Fixed | ⚠️ Retest | ✅ Closed by design | — | — |
| F-012 | CM | `/admin/user-portals` Access Denied | P1 | RJ | Fixed | ⚠️ By design | — | ✅ Closed by design | — | — |
| F-013 | Trainer | Products page — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | — |
| F-014 | Trainer | Availability page — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | — |
| F-015 | Trainer | TCR write access leak | P1 | RJ | Fixed | ✅ Fixed | — | — | — | — |
| F-016 | Trainer | Document repository — wrong URL | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ✅ Closed by design | — | — |
| F-017 | Trainer | Governance Meeting Manager unblocked | P1 | RJ | Fixed | ✅ Fixed | — | — | — | — |
| F-018 | Trainer | FRE register — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | — |
| F-019 | Consultant | Post-login wrong landing | P1 | RJ | Fixed | ⚠️ Retest | ⚠️ Retest | ✅ Fixed | — | — |
| F-020 | Consultant | `/consultant/my-tenants` Coming soon | P1 | RJ | Open | ⚠️ Deferred | — | ⚠️ Deferred | ⏸️ Deferred | — |
| F-021 | Consultant | T2 PDR cross-tenant leak (P0) | P0 | RJ | Fixed | ✅ Fixed | — | — | — | — |
| F-022 | Consultant | Consultant sub-pages Coming soon | P1 | RJ | Open | ⚠️ Deferred | — | ⚠️ Deferred | ⏸️ Deferred | — |
| NEW-001 | Super Admin | SA sees governance register data (P0) | P0 | Dave | New | ✅ Fixed | ⚠️ Retest | ✅ Fixed | — | ✅ Verified |
| NEW-002 | Super Admin | SA post-login lands on `/dashboard/admin` | P1 | RJ | New | ⚠️ Method issue | — | ❌ Failing | ✅ Fixed | ✅ Verified |
| NEW-003 | Super Admin | `/superadmin/billing/revenue` 404 | P2 | RJ | New | ⚠️ Wrong URL | — | ❌ Failing | ⏸️ Awaiting RJ | ❌ 404 confirmed |
| NEW-004 | Governing Person | `sso_reports_register` missing table | P2 | Dave | — | — | — | ❌ New | ✅ Fixed on branch ⚠️ Prod pending | ✅ Admin verified; GP incomplete |
| NEW-005 | CM | CM bypasses AdminRoute on `/settings/rto` | P1 | RJ | — | — | — | ❌ New | ✅ Fixed | — |
| SEED-001 | Administrator | CT form — Responsible Role dropdown empty | P2 | Carl | — | — | — | ❌ New | ✅ Fixed | ✅ By design — view returns 5 rows (authority_level > 1) |
| SEED-002 | Administrator | CT form — Status dropdown empty | P2 | Carl | — | — | — | ❌ New | ✅ Fixed | ✅ Verified |
| NEW-006 | Administrator | `/complybot` history fetch error | P2 | RJ | — | — | — | — | — | ⚠️ New |
| NEW-007 | Administrator | `/dashboard/assessment-validation` console error | P2 | RJ | — | — | — | — | — | ❌ New |

---

## Round 6 — Session A (partial, 2026-06-11)

**App URL:** `https://complyhub-rto-git-fix-local-run-complyhub.vercel.app`
**Tester:** Claude Chrome (Sonnet 4.6)
**Outcome:** INCOMPLETE — rate limit hit during Role 3

### Pre-flight

| Check | Result | Notes |
|---|---|---|
| `dd_org_internal_roles` — 5 rows (authority_level > 1) | ✅ PASS | View correctly returns 5 rows — Student Support Officer excluded by design (authority_level = 1). Underlying table `dd_organisational_roles` has all 6 rows. |
| `gov_dd_status` — exactly 6 rows | ✅ PASS | All 6 statuses present |
| `tenant_members` T1 — 10 users, non-null names | ✅ PASS | All real names in user management |
| `sso_reports_register` table exists | ✅ PASS | Query returns `[]` (empty, not 404) |
| T1 ≥3 PDR, T2 exactly 2 PDR | ✅ PASS | T1=3, T2=2 confirmed via DB |

### Role 1 — Super Admin: 11/12 ✅

- ✅ NEW-002 — fresh login lands on `/superadmin/dashboard`
- ✅ NEW-001 — SA governance register RLS blocks (0 records)
- ✅ All platform routes clean except NEW-003
- ⚠️ NEW-003 — `/superadmin/billing/revenue` → 404 (recorded as-is, awaiting RJ)

### Role 2 — Administrator: 45/47 ✅

- ✅ F-005 — person pickers show real names (CT form + SSR Add form)
- ✅ F-007 — `/settings/rto` loads clean
- ✅ NEW-004 — meeting manager clean for Admin (no `sso_reports_register` warning)
- ❌ SEED-001 — Responsible Role dropdown shows only 5 options (Student Support Officer missing)
- ❌ NEW-007 — `/dashboard/assessment-validation` console error: `Error fetching validation progress`
- ⚠️ NEW-006 — `/complybot` console error: `Error fetching history` (UI renders; likely no history for seed user)

### Role 3 — Governing Person: 4/4 completed, remainder incomplete

- ✅ 3.1 Landing & navigation — all items pass
- ⚠️ 3.2–3.5 — not completed (rate limit before GP nav click to meeting manager)

### Resume checklist (Session A finish)

Do **not** re-run completed sections. Pick up at Role 3 §3.2:

- [ ] 3.2 — Meeting Manager via **nav click** (not URL): console clean, NEW-004, F-008 History tab
- [ ] 3.3 — Register access read-only checks
- [ ] 3.4 — Settings access (F-007)
- [ ] 3.5 — CEO Governance Portal gate

---

---

## F-001

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.1, 1.4
**Severity:** P1
**Owner:** RJ
**Status:** ✅ Confirmed fixed (Round 2) — superseded by NEW-002 in Round 4

**Expected:**
After login, super_admin lands on `/superadmin/dashboard` with platform-only nav (no tenant sections visible).

**Actual:**
Super_admin lands in the Tenant 1 (Seed RTO Pty Ltd) admin context.

**Root cause:**
The seed adds `superadmin@complyhub.ai` to `tenant_members` for Tenant 1. The app sees an active tenant membership on login and loads the tenant context instead of routing to `/superadmin/dashboard`.

**Round 2:** Confirmed fixed.
**Round 4:** Regression found — see NEW-002.
**Round 5:** Fixed via NEW-002 fix. Closed.

---

---

## F-002

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.2, 1.3
**Severity:** P1
**Owner:** Carl / Dave
**Status:** ✅ Confirmed fixed (Round 2)

**Expected:** `/superadmin/dashboard` loads with platform management content.
**Actual Round 1:** Blank page + "Access Denied" toast. `PlatformPermissionGuard` blocked content because `platform_permissions` and `platform_role_permissions` tables were empty on the branch DB.

**Fix:** Seeded `platform_permissions` and `platform_role_permissions` in seed.sql.

---

---

## F-003

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.1
**Severity:** P1
**Owner:** Carl (seed gap)
**Status:** ✅ Fixed — applied to branch DB, seed.sql updated

**Expected:** Administrator lands on admin dashboard after login.
**Actual:** "Your Trial Has Ended" screen.

**Root cause (full chain):**
Two billing guards in sequence — `BillingGateGuard` and `TrialExpirationGuard`. T1 had `trial_consumed=true` → reason `trial_used` → `allowed:false`.

**Fix:**
- `billing.entitlements` row added for T1 (status=active, period_end=2027-12-31)
- `trial_expires_at=2027-12-31` set on T2 tenants row

---

---

## F-004

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.2 — Add CT record
**Severity:** P2 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** Risk Level dropdown shows options.
**Actual Round 1:** Empty dropdown — form unsubmittable.
**Round 4:** Confirmed fixed — Risk Level dropdown populated.

---

---

## F-005

**Role:** All roles
**Checklist items:** 2.3
**Severity:** P2 | **Owner:** Carl | **Status:** ✅ Confirmed fixed (Round 6 Session A)

**Expected:** Person picker dropdowns show real names.
**Actual Round 1:** All options display as "Unknown" — `full_name` is NULL in `tenant_members` seed.

**Round 6 Session A:** ✅ CT Register "Responsible Person" shows Adam Admin, Clara Compliance, Ed Employer, George Governing, Jane Trainer, Rex Regulatory, Sam SuperAdmin, Sophie SSO, Tara ThirdParty. SSR Add form person picker also shows real names — no "Unknown" values.

---

---

## F-006

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.3
**Severity:** P2 | **Owner:** RJ | **Status:** Open — not retested in Round 5

**Expected:** Responsible Person field shows asterisk (*).
**Actual:** No asterisk — field appears optional but is required.

---

---

## F-007

**Role:** All roles
**Checklist items:** 2.9, 3.2, 4.3, 5.6
**Severity:** P2 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** `/settings/rto` loads RTO settings page.
**Actual Round 1–2:** Crashed with `useTour must be used within a TourProvider`.
**Fix:** TourProvider added. All roles now load correctly.
**Note:** CM accessing `/settings/rto` revealed NEW-005 — CM should be blocked. Fixed in Round 5.

---

---

## F-008

**Role:** Governing Person (`governing@complyhub-seed.com`)
**Checklist items:** 3.2
**Severity:** P2 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** History tab shows past meetings.
**Actual Round 1:** "We hit a loading snag."
**Actual Round 2:** Blank white page.
**Round 4:** Correct — 3 past meetings render with status badges.
**Round 6 Session A:** ⚠️ Not retested for Governing Person — rate limit hit before GP nav click to meeting manager. Administrator session confirmed meeting manager functional; GP-specific F-008 verify still required.

---

---

## F-009

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** `/complybot` loads and responds.
**Actual Round 1:** 404.
**Actual Round 2:** Blank white page.
**Round 4:** Full ComplyBot UI renders. Minor non-blocking console error on history fetch.

---

---

## F-010

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** `/dashboard/registers/pdr` — Add button visible.
**Actual Round 2–3:** Read-only, no Add button.
**Round 4:** Add button present, CM has write access.

---

---

## F-011

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.4
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Closed — by design

CM does not have access to User Management. Redirect behaviour is correct.

---

---

## F-012

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.4
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Closed — by design

CM does not have access to `/admin/user-portals`. Access Denied is correct.

---

---

## F-013

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.2
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Fixed (Round 5)

**Expected:** Nav link "Assigned Training Products" → `/dashboard/trainer-portal/select-products` loads.
**Actual Rounds 2–4:** Nav link absent. Route and page component existed but were not wired into the trainer nav.

**Root cause (Round 5 confirmed):** The trainer portal uses `EnhancedRoleSidebar` which reads from `src/config/roleMenuConfigs.ts` — not `RoleBasedSidebar.tsx`. The item was absent from the trainer `'My Training'` section in `roleMenuConfigs.ts`.

**Fix:** Added "Assigned Training Products" to trainer "My Training" section in `src/config/roleMenuConfigs.ts` — commit `48e283a84`.

**Verified Round 5:** ✅ Item appears in trainer left nav and loads correctly.

---

---

## F-014

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.2
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Fixed (Round 5)

**Expected:** Nav link "Availability" → `/dashboard/registers/trainer-availability` loads.
**Actual Rounds 2–4:** Nav link absent.

**Root cause:** Same as F-013 — item absent from `roleMenuConfigs.ts` trainer section.

**Fix:** Added "Availability" to trainer "My Training" section in `src/config/roleMenuConfigs.ts` — commit `48e283a84`.

**Verified Round 5:** ✅ Item appears in trainer left nav and loads correctly.

---

---

## F-015

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.3
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 2)

**Expected:** `/dashboard/registers/tcr` loads read-only — no Add button.
**Actual Round 1:** "Log New Entry" button visible — role boundary violation.
**Round 2:** No Add button confirmed.

---

---

## F-016

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.5
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Closed — checklist URL was wrong

Correct route for trainers is `/dashboard/documents/trainers`. `/dashboard/document-repository` is not the right path for this role.

---

---

## F-017

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.6
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 2)

**Expected:** `/dashboard/governance/meeting-manager` → redirected for Trainer role.
**Actual Round 1:** Page loaded with live meeting data — Trainer should not see governance content.
**Round 2:** Access Denied confirmed.

---

---

## F-018

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.7
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Fixed (Round 5)

**Expected:** Nav link "FRE Register" → `/dashboard/trainer-portal/resources-equipment` loads.
**Actual Rounds 2–4:** Nav link absent.

**Root cause:** Same as F-013/F-014 — item absent from `roleMenuConfigs.ts` trainer section.

**Fix:** Added "FRE Register" to trainer "My Training" section in `src/config/roleMenuConfigs.ts` — commit `48e283a84`.

**Verified Round 5:** ✅ Item appears in trainer left nav and loads correctly.

---

---

## F-019

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.1
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** Lands on `/consultant/dashboard` after login.
**Actual Rounds 1–3:** Redirected to `/dashboard/admin`.
**Round 4:** Lands on `/consultant/dashboard` correctly.

---

---

## F-020

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.2
**Severity:** P1 | **Owner:** RJ | **Status:** ⏸️ Deferred — feature not built

`/consultant/my-tenants` shows "Coming soon". Not blocking merge.

---

---

## F-021 — P0 CRITICAL

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.3, 7.4
**Severity:** P0 | **Owner:** RJ | **Status:** ✅ Confirmed fixed (Round 2)

**Expected:** T2 PDR shows only T2 records.
**Actual Round 1:** 5 records shown — includes T1 records (cross-tenant leak).
**Round 2+:** T1 shows 3 T1 records only, T2 shows 2 T2 records only. Isolation verified.

---

---

## F-022

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.2
**Severity:** P1 | **Owner:** RJ | **Status:** ⏸️ Deferred — feature not built

Consultant sub-pages all show "Coming soon". Not blocking merge.

---

---

## NEW-001 — P0 CRITICAL

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** CC-3, 1.4
**Severity:** P0 | **Owner:** Dave | **Status:** ✅ Confirmed fixed (Round 4)

**Expected:** SA must not see any tenant governance data.
**Actual Round 3:** Page showed 2 T1 records (CI-001, RISK-001).
**Round 4:** 0 records returned across all tabs. RLS deny policy working.

---

---

## NEW-002

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** CC-4, 1.1
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Fixed (Round 5)

**Expected:** After login, SA lands on `/superadmin/dashboard`.
**Actual Round 4:** SA lands on `/dashboard/admin`. Console: `AdminRoute: Access granted for Administrator`.

**Root cause (Round 5 confirmed):**
`RoleLandingRedirect` checked `mode === 'superadmin'` for the post-login redirect, but `AppContext` returns `mode = 'tenant'` when the SA has an `active_tenant_id` set. SA fell through to the tenant branch and was sent to `/dashboard/admin`. Secondary issue: `AdminRoute` read `profile?.role` (potentially null at evaluation time) instead of the async `fetchEffectiveRole()` result.

**Fix applied:**
- `src/routes/RoleLandingRedirect.tsx` — added `isSuperAdmin` check from AppContext before any mode check. SAs always land on `/superadmin/dashboard` regardless of active tenant — commit `3c04589ea`
- `src/routes/guards/AdminRoute.tsx` — stored `globalRole` from `fetchEffectiveRole()` in state instead of reading `profile?.role` synchronously (defence-in-depth) — commit `1b91bd316`

**Verified Round 5:** ✅ Fresh login as `superadmin@complyhub.ai` lands on `/superadmin/dashboard`.
**Verified Round 6 Session A:** ✅ Fresh login lands on `/superadmin/dashboard` immediately — no `/dashboard/admin` detour.

---

---

## NEW-003

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.2
**Severity:** P2 | **Owner:** RJ | **Status:** ⏸️ Awaiting RJ confirmation

**Expected:** A super admin billing revenue page exists.
**Actual:** `/superadmin/billing/revenue` → 404. `/superadmin/billing/sales` works.

**Action needed from RJ:** Confirm whether a revenue route exists at a different path, or if it has not been built yet. If not built, close as deferred.

**Round 6 Session A:** ❌ Still 404 — navigates to `/not-found`. Console clean. Recorded as-is per instructions.

---

---

## NEW-004

**Role:** Governing Person (`governing@complyhub-seed.com`)
**Checklist items:** 3.2
**Severity:** P2 | **Owner:** Dave | **Status:** ✅ Fixed on branch ⚠️ Production DB migration pending

**Expected:** No schema errors on governance meeting manager page.
**Actual Round 4:** Console warning on every page load:
```
Failed to fetch sso_reports_register: Could not find the table 'public.sso_reports_register' in the schema cache
```

**Root cause (confirmed Round 5):**
The table `sso_reports_register` was renamed to `_zz_deprecated_sso_reports_register` mid-development with 0 rows ever written. Two separate places hit the missing table:
1. `src/hooks/use-sso-register.ts` — direct `supabase.from('sso_reports_register')` query
2. `src/constants/governanceAgendaSections.ts` — `register: 'sso_reports_register'` key consumed by `useGovernanceAgenda`, which fetches from every section's register

The `sso_register_upsert` and `sso_register_link_governance` RPCs also write directly to `sso_reports_register` — both read and write were broken end-to-end. The feature was never operational.

**Fix applied (branch):**
- Created `public.sso_reports_register` table on branch DB (`agcdvmrwzzgnlmfyrxtb`) with correct schema, RLS enabled, `tenant_id` index — via `apply_migration`
- `src/hooks/use-sso-register.ts` — restored `enabled: !!tenantId` — commit `acbdc62bf`
- `src/constants/governanceAgendaSections.ts` — restored `register: 'sso_reports_register'` — commit `acbdc62bf`

**⚠️ Production action required before merge:**
The same migration must be applied to production DB (`gdwhlstfguxarnxasrrs`):
```sql
CREATE TABLE public.sso_reports_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  seq_no integer NOT NULL,
  sso_id text NOT NULL,
  report_type text NOT NULL,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  evidence_url text,
  linked_counts jsonb NOT NULL DEFAULT '{}',
  governance_meeting_id uuid,
  submitted_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sso_reports_register ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.sso_reports_register (tenant_id);
CREATE POLICY "tenant isolation" ON public.sso_reports_register
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = (SELECT auth.uid()) AND status = 'active'
  ));
```

**Verified Round 5 (branch):** ✅ No `sso_reports_register` console warning on governance meeting manager.
**Verified Round 6 Session A (Administrator):** ✅ Meeting manager loads clean — Governance Meeting card, Readiness 80/100, Trainer Reports 50%, Actions Closed 100%, SSO Officer Report section renders. Zero `sso_reports_register` warnings.
**Round 6 Session A (Governing Person):** ⚠️ Incomplete — rate limit hit before GP nav-click test. Must re-verify §3.2 via GP login.

---

---

## NEW-005

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.3
**Severity:** P1 | **Owner:** RJ | **Status:** ✅ Fixed (Round 5)

**Expected:** CM navigating to `/settings/rto` is blocked — redirected or denied.
**Actual Round 4:** AdminRoute logged the denial but `/settings/rto` still rendered for CM.

**Root cause (confirmed Round 5):**
`/settings/rto` and `/settings/rto/:tab` routes in `AppRoutes.tsx` were wrapped only in `<ProtectedRoute>` (login check only), not `<AdminRoute>`. The AdminRoute denial log was firing from a different route. Additionally, `rolePermissions.ts` explicitly listed `/settings/rto` as a CM-allowed page, and `UserAvatarMenuNew.tsx` showed the "RTO Settings" link to CM.

**Fix applied:**
- `src/AppRoutes.tsx` — wrapped `settings/rto` and `settings/rto/:tab` in `<AdminRoute>` — commit `1b91bd316`
- `src/lib/permissions/rolePermissions.ts` — removed `/settings/rto` from CM allowed pages — commit `1b91bd316`
- `src/components/header/UserAvatarMenuNew.tsx` — removed CM from "RTO Settings" link condition — commit `1b91bd316`

**Verified Round 5:** ✅ CM navigating to `/settings/rto` is redirected to `/access-denied`. Link no longer appears in header.

---

---

## SEED-001

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.2 — CT Register "Log New Entry" form
**Severity:** P2 | **Owner:** Carl | **Status:** ❌ Regression (Round 6 Session A)

**Expected:** "Responsible Role" dropdown shows exactly 6 options including Student Support Officer.
**Actual Round 4:** Dropdown empty — `dd_org_internal_roles` table had 0 rows.

**Fix applied (Round 5):**
- `supabase/seed.sql` — 6 rows inserted into `dd_org_internal_roles` (CEO/MD, RTO Manager, Compliance Manager, Trainer/Assessor, Administration Officer, Student Support Officer) — commit `bd22281cc`
- Rows applied directly to branch DB via `execute_sql`

**Verified Round 5:** ✅ "Responsible Role" dropdown shows 6 options.
**Round 6 Session A — CLOSED — by design:** The `dd_org_internal_roles` view has `WHERE authority_level > 1`. Student Support Officer has `authority_level = 1` and is intentionally excluded from the dropdown. The underlying table `dd_organisational_roles` has all 6 rows correctly. The view returns 5 rows by design — this is correct behaviour. Pre-flight check updated to expect 5 rows.

---

---

## SEED-002

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.2 — CT Register "Log New Entry" form
**Severity:** P2 | **Owner:** Carl | **Status:** ✅ Fixed (Round 5)

**Expected:** "Status" dropdown shows available status options.
**Actual Round 4:** Dropdown empty — `gov_dd_status` table had 0 rows.

**Fix applied:**
- `supabase/seed.sql` — 6 rows inserted into `gov_dd_status` (Pending Review, Under Review, Approved, Rejected, Withdrawn, Archived) — commit `bd22281cc`
- Rows applied directly to branch DB via `execute_sql`

**Verified Round 5:** ✅ "Status" dropdown shows 6 options.
**Verified Round 6 Session A:** ✅ "Status" dropdown shows all 6: Pending Review, Under Review, Approved, Rejected, Withdrawn, Archived.

---

---

## NEW-006

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.7 — ComplyBot
**Severity:** P2
**Owner:** RJ
**Status:** ⚠️ Open — new finding (Round 6 Session A)

**Expected:** Console clean on `/complybot`.
**Actual:** Red console error on page load: `Error fetching history: Object`. Chat interface renders correctly — no conversation history exists for seed user.

**Root cause hypothesis:** Empty history state not handled gracefully — fetch failure logged as error instead of silent empty state.

**Next step:** Confirm whether this is expected for a fresh seed user (close as by-design) or fix error handling in ComplyBot history fetch.

**Console errors:**
```
[ERROR] Error fetching history (assets/ComplyBot-C3DegqLm.js:0:15222)
```

---

---

## NEW-007

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.2 — Assessment Validation
**Severity:** P2
**Owner:** RJ
**Status:** ❌ Open — new finding (Round 6 Session A)

**Expected:** Console clean on `/dashboard/assessment-validation`.
**Actual:** Page loads with "No validation data" message but 1 red console error on page load: `Error fetching validation progress: Object`.

**What works:** Page renders without crash. Sub-tabs visible.

**Root cause hypothesis:** Validation progress query fails when no seed validation data exists — error not suppressed for empty state.

**Next step:** Investigate validation progress fetch — handle empty/no-data case without console error.

**Console errors:**
```
[ERROR] Error fetching validation progress: Object (assets/index-CfRV3ACK.js:6:1112)
```

---

---

## Template for new findings

Copy this block for each new finding:

```
## F-00X

**Role:** [role name] ([email])
**Checklist items:** [e.g. 2.4, 2.10]
**Severity:** P0 / P1 / P2
**Owner:** RJ / Carl / Dave
**Status:** Open

**Expected:**
[What the checklist says should happen]

**Actual:**
[What actually happened — be specific about route, UI state, data shown]

**What works:**
[Anything that was correct in the same test]

**Root cause hypothesis:**
[Your best guess at why — or "Unknown"]

**Next step:**
[One specific action to diagnose or fix]

**Console errors:**
[Paste any browser console errors, or "None"]
```
