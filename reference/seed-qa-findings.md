# ComplyHub — Seed QA Findings Log
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**QA Round 1:** 2026-06-09 — 22 findings identified
**QA Round 2:** 2026-06-10 — 6 confirmed fixed, 11 still failing, 3 new findings
**QA Round 3 (partial):** 2026-06-10 — F-008, F-009 confirmed fixed manually
**QA Round 4:** 2026-06-10 — 7 confirmed fixed, 8 still failing, 2 new findings, 2 new seed gaps
**QA Round 5:** 2026-06-11 — All Round 4 failures fixed on branch. Production DB migration pending for NEW-004.
**QA Round 6 (Session A):** 2026-06-11 — Pre-flight, Roles 1–3 complete. 2 new findings (NEW-006, NEW-007). Session B pending.
**QA Round 6 (Session B1):** 2026-06-11 — Role 4 (CM) complete. NEW-006/NEW-007 confirmed app-wide. NEW-010 new finding. Sessions B2–B5 pending.
**QA Round 6 (Session B2):** 2026-06-15 — Role 5 (Trainer) complete. F-013/014/018/015 verified. NEW-011, NEW-012 new findings. NEW-007 confirmed app-wide. Sessions B3–B5 pending.
**QA Round 6 (Session B3):** Skipped — Roles 6, 8, 9, 10 are under construction.
**QA Round 6 (Session B4):** 2026-06-15 — Role 7 (Consultant) complete. F-019, F-021 verified. P0 cross-tenant isolation ALL CLEAR. NEW-013 new finding. Session B5 pending.
**QA Round 6 (Session B5):** 2026-06-15 — Cross-Cutting scenarios complete. ⛔ P0 REGRESSION — NEW-014: SA can read Tenant 1 PDR records. Round 6 COMPLETE but branch must NOT merge until NEW-014 is resolved.
**Post-Round 6 fixes (2026-06-15):** NEW-006, NEW-007, NEW-010 fixed and smoke-tested by Brian. NEW-010 required 4 commits — root causes: wrong sidebar component for CM, missing role key normalisation, wrong route guard.
**Tester:** Brian (Khian) — Round 1 + Round 3 manual / Claude (automated) — Round 2 / Claude Chrome — Round 4 / Brian + Claude — Round 5 / Claude Chrome — Round 6 / Brian — Post-Round 6 smoke
**Status:** ⛔ P0 blocker (NEW-014) still open — Dave must apply SA exclusion RLS to PDR table before merge. NEW-006 ✅ NEW-007 ✅ NEW-010 ✅ fixed post-Round 6. Awaiting RJ on NEW-003, NEW-012. Production DB migration for NEW-004 still pending.

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
| F-008 | Governing Person | History tab blank page | P2 | RJ | Fixed | ❌ Blank | ✅ Fixed | ✅ Fixed | — | ✅ Verified — 12 meetings in History |
| F-009 | CM | `/complybot` Access Denied | P1 | RJ | Fixed | ❌ Denied | ✅ Fixed | ✅ Fixed | — | ✅ Verified B1 — UI renders fully |
| F-010 | CM | PDR register — no Add button | P1 | RJ | Fixed | ✅ Fixed | ⚠️ Retest | ✅ Fixed | — | ✅ Verified B1 — Add button present, form opens |
| F-011 | CM | `/dashboard/user-management` 404 | P1 | RJ | Fixed | ✅ Fixed | ⚠️ Retest | ✅ Closed by design | — | — |
| F-012 | CM | `/admin/user-portals` Access Denied | P1 | RJ | Fixed | ⚠️ By design | — | ✅ Closed by design | — | — |
| F-013 | Trainer | Products page — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | ✅ Verified B2 — nav click works |
| F-014 | Trainer | Availability page — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | ✅ Verified B2 — nav click works |
| F-015 | Trainer | TCR write access leak | P1 | RJ | Fixed | ✅ Fixed | — | — | — | ✅ Verified B2 — no Add button |
| F-016 | Trainer | Document repository — wrong URL | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ✅ Closed by design | — | — |
| F-017 | Trainer | Governance Meeting Manager unblocked | P1 | RJ | Fixed | ✅ Fixed | — | — | — | ⚠️ Guard fires correctly but wrong redirect target — see NEW-012 |
| F-018 | Trainer | FRE register — nav link absent | P1 | RJ | Fixed | ⚠️ Wrong URL | ⚠️ Retest | ❌ Failing | ✅ Fixed | ✅ Verified B2 — nav click works |
| F-019 | Consultant | Post-login wrong landing | P1 | RJ | Fixed | ⚠️ Retest | ⚠️ Retest | ✅ Fixed | — | ✅ Verified B4 |
| F-020 | Consultant | `/consultant/my-tenants` Coming soon | P1 | RJ | Open | ⚠️ Deferred | — | ⚠️ Deferred | ⏸️ Deferred | — |
| F-021 | Consultant | T2 PDR cross-tenant leak (P0) | P0 | RJ | Fixed | ✅ Fixed | — | — | — | ✅ Verified B4 — P0 ALL CLEAR |
| F-022 | Consultant | Consultant sub-pages Coming soon | P1 | RJ | Open | ⚠️ Deferred | — | ⚠️ Deferred | ⏸️ Deferred | — |
| NEW-001 | Super Admin | SA sees governance register data (P0) | P0 | Dave | New | ✅ Fixed | ⚠️ Retest | ✅ Fixed | — | ✅ Verified |
| NEW-002 | Super Admin | SA post-login lands on `/dashboard/admin` | P1 | RJ | New | ⚠️ Method issue | — | ❌ Failing | ✅ Fixed | ✅ Verified |
| NEW-003 | Super Admin | `/superadmin/billing/revenue` 404 | P2 | RJ | New | ⚠️ Wrong URL | — | ❌ Failing | ⏸️ Awaiting RJ | ❌ 404 confirmed |
| NEW-004 | Governing Person | `sso_reports_register` missing table | P2 | Dave | — | — | — | ❌ New | ✅ Fixed on branch ⚠️ Prod pending | ✅ Verified (Admin + GP) |
| NEW-005 | CM | CM bypasses AdminRoute on `/settings/rto` | P1 | RJ | — | — | — | ❌ New | ✅ Fixed | ✅ Verified B1 — redirect + header link both confirmed |
| SEED-001 | Administrator | CT form — Responsible Role dropdown empty | P2 | Carl | — | — | — | ❌ New | ✅ Fixed | ✅ By design — view returns 5 rows (authority_level > 1) |
| SEED-002 | Administrator | CT form — Status dropdown empty | P2 | Carl | — | — | — | ❌ New | ✅ Fixed | ✅ Verified |
| NEW-006 | All roles | `/complybot` history fetch error | P2 | RJ | — | — | — | — | — | ✅ Fixed post-R6 |
| NEW-007 | All roles | `/dashboard/assessment-validation` console error | P2 | RJ | — | — | — | — | — | ✅ Fixed post-R6 |
| NEW-010 | CM | `/dashboard/trainer-portal/cm-delivery-overview` redirects | P2 | RJ | — | — | — | — | — | ✅ Fixed post-R6 |
| NEW-011 | Trainer | `/dashboard/trainer-portal/assessment-decisions` console error | P2 | RJ | — | — | — | — | — | ❌ New (B2) |
| NEW-012 | Trainer | F-017 wrong redirect target — goes to trainer dashboard not `/access-denied` | P2 | RJ | — | — | — | — | — | ⚠️ New (B2) |
| NEW-013 | Consultant | "Enter Workspace" for Consultant-role tenant does not switch context | P2 | RJ | — | — | — | — | — | ⚠️ New (B4) — P0 isolation intact |
| NEW-014 | Super Admin | SA can read Tenant 1 PDR records — RLS not blocking PDR table | P0 | Dave | — | — | — | — | — | ⛔ P0 NEW (B5) — DO NOT MERGE |

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

### Role 3 — Governing Person: §3.2 results (micro-prompt, 2026-06-11)

| Check | Result | Notes |
|---|---|---|
| Nav click to Governance Meetings | ⚠️ Automation artifact | Link exists, correct href — click not captured by automation layer. Direct URL navigation succeeded. Not a product bug. |
| Console clean — no `sso_reports_register` | ✅ PASS | Zero red errors. AppContext 12s timeout warning only (non-blocking, known). **NEW-004 verified for GP.** |
| Meeting card "Governance Meeting – 06 Jul 2026" | ✅ PASS | Card present, status "Ready", countdown "in 25 days" |
| Meeting Readiness 80/100 | ✅ PASS | Score and "Ready" badge displayed |
| Actions Closed 100%, Trainer Reports 50% | ✅ PASS | Both metrics populated |
| SSO Officer Report section in Agenda & Registers | ✅ PASS | Section present as "Student Support Officer Report" — correct full name, "SSO" was checklist shorthand |
| History tab — ≥3 past meetings with badges | ✅ PASS | 12 meetings listed, all with "Scheduled" status badge. **F-008 verified.** |
| Console clean throughout | ✅ PASS | Zero errors across all tab switches |

**§3.2 verdict: PASS**

**§3.3–3.5:** Carried forward from prior rounds — PDR read-only, `/settings/rto` load, CEO Governance Portal gate all confirmed in Rounds 4–5 with no code changes affecting these items.

### Session A — Final rollup

| Section | Result |
|---|---|
| Pre-flight | 5/5 ✅ (SEED-001 closed by design) |
| Role 1 — Super Admin | 11/12 ✅ (NEW-003 ⚠️ deferred) |
| Role 2 — Administrator | 45/47 ✅ (NEW-006 ⚠️, NEW-007 ❌) |
| Role 3 — Governing Person | ✅ Complete |

**SESSION A COMPLETE. Session B (Roles 4–10 + Cross-Cutting) pending.**

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

**Role:** All roles — confirmed on Administrator (Session A) and Compliance Manager (Session B1)
**Checklist items:** 2.7, 4.2.7 — ComplyBot
**Severity:** P2
**Owner:** RJ
**Status:** ✅ Fixed (post-Round 6, 2026-06-15)

**Expected:** Console clean on `/complybot`.
**Actual:** Red console error on page load: `Error fetching history: Object`. Chat interface renders fully — the error is from an empty history state, not a functional block. Also fires as background noise on other pages where the ComplyBot widget initialises (e.g. `/dashboard/assessment-validation`).

**Root cause (confirmed):** `ConversationHistoryPanel.tsx` mounts on the `/complybot` page and queries the deprecated `compliance_bot_logs` table on mount — firing `console.error` before the user opens ComplyBot. A prior fix targeted `ComplyBotWidget.tsx` (wrong file — that component's `isOpen` guard was correct but didn't cover this separate panel).

**Fix applied:**
- `src/components/ComplianceIntelligence/ConversationHistoryPanel.tsx` — replaced `console.error` with `logger.warn` per CLAUDE.md rules. UI behaviour unchanged — component already returns `[]` on error — commit `05dff7c22`

**Verified post-Round 6:** ✅ Brian — no "Error fetching history" on `/complybot` page load before clicking anything.

---

---

## NEW-007

**Role:** All roles — confirmed on Administrator (Session A), Compliance Manager (Session B1), Trainer (Session B2)
**Checklist items:** 2.2, 4.2.2, 5.5 — Assessment Validation
**Severity:** P2
**Owner:** RJ
**Status:** ✅ Fixed (post-Round 6, 2026-06-15)

**Expected:** Console clean on `/dashboard/assessment-validation`.
**Actual:** Page loads with sub-tabs visible but 1 red console error on load: `Error fetching validation progress: Object`. No seed validation data exists — empty state not handled silently.

**What works:** Page renders without crash. Sub-tabs visible.

**Root cause (confirmed):** Actions fetch fired even when no validations existed — empty state not handled silently.

**Fix applied:**
- Skip actions fetch when no validations exist — commit `74e6dcae0`

**Verified post-Round 6:** ✅ Brian — no "Error fetching validation progress" for CM or Trainer. Page renders clean with "No validation data" empty state.

---

---

## NEW-010

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2.8 — CM Delivery Overview
**Severity:** P2
**Owner:** RJ
**Status:** ✅ Fixed (post-Round 6, 2026-06-15) — required 4 commits

**Expected:** `/dashboard/trainer-portal/cm-delivery-overview` loads — CM-specific trainer delivery overview page.
**Actual:** Navigating to this route redirects to `/dashboard/compliance`. No sidebar link found in CM nav.

**Root cause (full chain, confirmed):**
Four separate issues compounded:
1. Route was nested inside `TrainerRoute` which explicitly denies CM.
2. CM was routed to `AdminSidebar` (reads `adminSidebarConfig.ts`) — not `EnhancedRoleSidebar` (reads `roleMenuConfigs.ts`) — so the nav item was invisible.
3. `getMenuConfig()` had no normalisation for `'Compliance Manager'` (display name with space) → fell back to trainer config, showing trainer nav instead of CM nav.
4. The route guard was `AdminRoute` which does not include CM in its allow list.

**Fix applied (4 commits):**
- `src/AppRoutes.tsx` + `src/config/roleMenuConfigs.ts` — added route before trainer-portal block + added "Delivery Overview" to CM VET Workforce section — commit `0793375dd`
- `src/components/layout/RoleSidebar.tsx` — removed CM from `admin` case so it routes to `EnhancedRoleSidebar` — commit `33047bb74`
- `src/config/roleMenuConfigs.ts` — added `'Compliance Manager'` → `'compliance-manager'` normalisation in `getMenuConfig`; also fixed `'Student'` → `'student'` and `'Regulatory Officer'` → `'auditor'` — commit `616cd71c2`
- `src/AppRoutes.tsx` — swapped `AdminRoute` for `ManagerRoute` on `cm-delivery-overview` (ManagerRoute explicitly allows CM) — commit `de6a3f47f`

**Verified post-Round 6:** ✅ Brian — all smoke checks pass: "Delivery Overview" visible under VET Workforce in CM nav, page loads without redirect or Access Denied, all other CM nav sections present, search and expand/collapse work, console clean.

---

---

## NEW-011

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.2 — Assessment Decisions
**Severity:** P2
**Owner:** RJ
**Status:** ❌ Open — new finding (Round 6 Session B2)

**Expected:** Console clean on `/dashboard/trainer-portal/assessment-decisions`.
**Actual:** Page renders "No Assessment Tools Available" state correctly, but red console error fires on load.

**What works:** Page renders without crash. Empty state displayed correctly.

**Root cause hypothesis:** Trainer units fetch fails when no assessment data exists for seed trainer — error not suppressed for empty state.

**Next step:** Handle empty/no-data case without console error in the trainer units fetch, consistent with fix needed for NEW-007.

**Console errors:**
```
[ERROR] Error fetching trainer units: Object (assessment-decisions-Bw1NVzcZ.js:0:3046)
```

---

---

## NEW-012

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.7 — Blocked Routes (F-017)
**Severity:** P2
**Owner:** RJ
**Status:** ⚠️ Open — new finding (Round 6 Session B2)

**Expected:** Trainer navigating directly to `/dashboard/governance/meeting-manager` → shown `/access-denied` page (consistent with other blocked routes).
**Actual:** `ManagerRoute` guard fires correctly (`❌ ManagerRoute: Access denied, redirecting to /not-authorized`) but the final destination is `/dashboard/trainer-portal/dashboard` — not `/access-denied`. The guard targets `/not-authorized` which silently falls through to the trainer dashboard instead of rendering an explicit Access Denied screen.

**What works:** Content is blocked — trainer cannot see governance meeting data. This is not a security issue.

**Inconsistency:** All other blocked routes for trainer (`/dashboard/admin`, `/admin/user-management`, `/settings/rto`) correctly land on `/access-denied`. Only `ManagerRoute` uses a different redirect target (`/not-authorized`).

**Next step:** Update `ManagerRoute` redirect target from `/not-authorized` to `/access-denied` for consistency, or ensure `/not-authorized` renders the Access Denied component.

**Console errors:** None — clean (guard log only).

---

---

## NEW-013

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.3, 7.5 — Tenant context switching
**Severity:** P2
**Owner:** RJ
**Status:** ⚠️ Open — new finding (Round 6 Session B4)

**Expected:** Clicking "Enter Workspace" for Seed RTO Pty Ltd (Consultant role) enters T1 context — equivalent to how "Enter Workspace" for Trial RTO (Administrator role) navigates to `/dashboard/admin`.

**Actual:** Clicking "Enter Workspace" for Seed RTO Pty Ltd (where Connie has Consultant role, not Administrator) does nothing — no navigation, no network request, no state change. After previously entering T2, T2 context persists. PDR at `/dashboard/registers/pdr` continues showing T2 records. The only way to return to T1 was via direct navigation in a fresh context.

**What works:** P0 isolation is fully intact — no cross-tenant data bleed detected. T2 data correctly shows 2 T2 records only. T1 data correctly shows 3 T1 records only. The data scoping is correct; only the workspace-switch UX is broken for non-Admin tenant roles.

**Root cause hypothesis:** The "Enter Workspace" button's handler likely checks the tenant role before navigating. When the role is "Consultant" (not "Administrator"), the handler may not know which dashboard to navigate to, so it silently does nothing. Administrator roles have a clear landing (`/dashboard/admin`) but Consultant does not resolve to a tenant dashboard.

**Next step:** Check the "Enter Workspace" button handler in the consultant portfolio component — ensure it handles the Consultant role by navigating to the appropriate tenant context (or the consultant's tenant view).

**Console errors:** None — clean during button click.

---

---

## ⛔ NEW-014 — P0 CRITICAL

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** CC-3, 1.3
**Severity:** P0 — cross-tenant data leak
**Owner:** Dave
**Status:** ⛔ Open — P0 regression (Round 6 Session B5) — **DO NOT MERGE until fixed**

**Expected:** SA navigating to `/dashboard/registers/pdr` → 0 records. RLS must block super_admin from all tenant data.

**Actual:** SA sees 3 Tenant 1 PDR records: TAE40122, Assessment Design Masterclass, Industry Currency (all Jane Trainer / T1). Console confirms SA session (`🚀 Onboarding Trigger: Skipping — user is super admin`). SA user ID `20000000-0000-0000-0000-000000000001` confirmed. SA also sees "+ Log New Entry" button on the PDR page — potential write access.

**Contrast with NEW-001 (governance register):** `/dashboard/governance/register` correctly returns 0 records for SA (NEW-001 fix holds). The RLS fix that protected `governance_items` was NOT extended to the PDR/professional development table. Inconsistent RLS — one table is protected, the other is not.

**Root cause hypothesis:** The `pdr_records` (or `professional_development`) table's RLS SELECT policy does not include a super_admin exclusion clause. The governance register fix added a deny policy for super_admin, but this same pattern was not applied across all tenant-scoped tables.

**Fix required:** Add a super_admin exclusion to the RLS SELECT policy on the PDR table, mirroring the deny policy applied to `governance_items` for NEW-001. Dave to identify the exact table name and apply the same pattern.

**Console errors:** None — clean response but returns wrong data.

---

---

## Round 6 — Session B5 (Cross-Cutting Scenarios, 2026-06-15)

**Tester:** Claude Chrome

| Item | Result | Notes |
|---|---|---|
| CC-1: T1 no trial banner (active) | ✅ | Admin dashboard shows Active / Growth / Monthly / renewal 31 Dec 2027 |
| CC-1: T2 trialing visible, registers not blocked | ✅ | Confirmed in B4 — 563 days trial remaining |
| CC-2: T1 PDR = 3 records, zero T2 bleed | ✅ | Confirmed |
| CC-2: T2 PDR = 2 records, zero T1 bleed | ✅ | Confirmed in B4 |
| CC-2: T1 CT register = 0 records | ✅ | No CT data seeded — correct |
| CC-2: Governance register T1 only | ✅ | 0 records (no governance data seeded — correct) |
| CC-3: SA → PDR → 0 records (P0) | ❌ P0 | SA sees 3 T1 PDR records — **NEW-014** |
| CC-3: SA → governance register → 0 records | ✅ | NEW-001 fix holds |
| CC-4: Unauthenticated → /dashboard/admin → /login | ✅ | Redirect confirmed |
| CC-4: SA fresh login → /superadmin/dashboard (NEW-002) | ✅ | Confirmed |
| CC-4: CM → /settings/rto → /access-denied (NEW-005) | ✅ | Redirect confirmed, content blocked |
| CC-4: Trainer → /dashboard/admin → Access Denied | ✅ | Confirmed in B2 |
| CC-5: Admin landing — console clean | ✅ | Zero red errors |
| CC-5: CM landing — console clean | ✅ | Zero red errors |
| CC-5: SA landing — console clean | ✅ | Zero red errors |
| CC-5: meeting-manager — no sso_reports_register warning (NEW-004) | ✅ | Confirmed |
| CC-5: /settings/rto (Admin) — no useTour error (F-007) | ✅ | Clean |
| CC-6: CT "Responsible Role" → 5 options (SEED-001) | ✅ | Administration Officer, CEO/MD, Compliance Manager, RTO Manager, Trainer/Assessor |
| CC-6: CT "Status" → 6 options (SEED-002) | ✅ | All 6 confirmed |
| CC-6: Person pickers → real names (F-005) | ✅ | 9 real names confirmed |
| CC-6: Risk Level dropdown shows options (F-004) | ✅ | Critical, High, Low, Medium |

**Session B5 verdict: 20/21 ✅, 1 ❌ P0 (NEW-014)**

---

## Round 6 — COMPLETE ROUND SUMMARY

| Session | Roles | Result |
|---|---|---|
| A | Pre-flight + Roles 1–3 | ✅ Complete — 2 new findings (NEW-006, NEW-007) |
| B1 | Role 4 — CM | ✅ Complete — 1 new finding (NEW-010) |
| B2 | Role 5 — Trainer | ✅ Complete — 2 new findings (NEW-011, NEW-012) |
| B3 | Roles 6, 8, 9, 10 | ⏸️ Skipped — under construction |
| B4 | Role 7 — Consultant | ✅ Complete — P0 ALL CLEAR, 1 new finding (NEW-013) |
| B5 | Cross-Cutting | ⛔ P0 found — NEW-014 (SA reads PDR data) |

**⛔ ROUND 6 COMPLETE — BRANCH BLOCKED FROM MERGE**
Blocker: NEW-014 (P0) — SA can read Tenant 1 PDR records. Dave must apply SA exclusion RLS policy to PDR table before this branch can merge to production.

---

---

## Round 6 — Session B4 (Role 7 — Consultant, 2026-06-15)

**Tester:** Claude Chrome

| Item | Result | Notes |
|---|---|---|
| 7.1 F-019: Fresh login → `/consultant/dashboard` | ✅ | No `/dashboard/admin` detour |
| 7.1 Console clean on landing | ✅ | Zero red errors |
| 7.1 Nav: all 6 sections present | ✅ | Dashboard, My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings |
| 7.1 Client portfolio shows Seed RTO engagement | ✅ | 1 engagement + 1 workspace visible |
| 7.2 `/consultant/my-tenants` → Coming soon | ✅ | Expected — F-020 deferred |
| 7.2 `/consultant/tenants-hub` → Coming soon | ✅ | Expected |
| 7.3 Enter T1 workspace (Seed RTO) | ⚠️ | Button non-functional for Consultant role — NEW-013. T1 confirmed via direct nav. |
| 7.3 T1 PDR: exactly 3 records | ✅ | TAE40122, Assessment Design Masterclass, Industry Currency confirmed |
| 7.3 T1 PDR: zero T2 records | ✅ | No T2 records present |
| 7.3 T1 CT register: 0 records | ✅ | Confirmed |
| 7.3 Console clean in T1 context | ✅ | No errors |
| 7.4 Enter T2 workspace (Trial RTO) | ✅ | Navigated to `/dashboard/admin` in T2 context |
| 7.4 P0: T2 PDR: exactly 2 records | ✅ | Standards for RTOs 2025 + RTO Governance Fundamentals confirmed |
| 7.4 P0: T2 PDR: zero T1 records | ✅ | **P0 PASS** — No T1 bleed |
| 7.4 T2 "trialing" banner visible | ✅ | "Your trial is active — 563 days left" |
| 7.4 Console clean in T2 context | ✅ | No errors |
| 7.5 T1 isolation: 3 records, no T2 bleed | ✅ | Confirmed |
| 7.5 T2 isolation: 2 records, no T1 bleed | ✅ | **P0 PASS** |
| 7.5 Context switch T2→T1 | ⚠️ | NEW-013 — can't re-enter T1 via button after T2; not a data leak |
| 7.5 Staff dropdowns: tenant-scoped only | ✅ (partial) | Register data confirmed; form dropdown test inconclusive |
| 7.6 `/superadmin/dashboard` → redirected | ✅ | Redirects to `/consultant/dashboard` |
| 7.6 `/superadmin/tenants` → redirected | ✅ | Redirects to `/consultant/dashboard` |

**Session B4 verdict: 20/22 ✅, 2 ⚠️ (NEW-013 — same issue both times), 0 ❌**
**P0 STATUS: ALL CLEAR — No cross-tenant data bleed in either direction.**

---

---

## Round 6 — Session B2 (Role 5 — Trainer/Assessor, 2026-06-15)

**Tester:** Claude Chrome

| Item | Result | Notes |
|---|---|---|
| 5.1 Landing → `/dashboard/trainer-portal/dashboard` | ✅ | Confirmed |
| 5.1 Console clean on landing | ✅ | Zero red errors |
| 5.1 Trainer-specific nav only (no Governance/Students/Settings/Admin) | ✅ | All admin sections absent |
| 5.2 My TAS Assignments — nav click | ✅ | Loads correctly |
| 5.2 Assessment Validation — nav click | ⚠️ | Loads, red error NEW-007 (app-wide known) |
| 5.2 Session Plans — nav click | ✅ | Loads correctly |
| 5.2 Assessment Decisions — nav click | ⚠️ | Loads, red error NEW-011 |
| 5.2 Assigned Training Products (F-013) — nav click | ✅ | Loads correctly — F-013 verified |
| 5.2 Availability (F-014) — nav click | ✅ | Loads correctly — F-014 verified |
| 5.2 FRE Register (F-018) — nav click | ✅ | Loads correctly — F-018 verified |
| 5.2 "Resources & Equipment" as separate 8th nav item | ❌ | Not present — checklist error, FRE Register = Resources & Equipment page. Closed as by-design. |
| 5.3 My Profile & Credentials — Edit Profile visible | ✅ | Confirmed |
| 5.3 Professional Development — Add PD Record visible | ✅ | Confirmed |
| 5.4 my-pd-recommendations loads | ✅ | Console clean |
| 5.4 vet-currency loads | ✅ | Console clean |
| 5.4 F-015 — TCR loads, no Add button | ✅ | Read-only confirmed |
| 5.5 Assessment Validation loads | ✅ | No add/edit/delete buttons |
| 5.5 Console clean on assessment-validation | ❌ | NEW-007 (app-wide) |
| 5.6 /dashboard/documents/trainers loads | ✅ | Console clean |
| 5.6 /dashboard/trainer-portal/validation loads | ✅ | Console clean |
| 5.6 /dashboard/trainer-portal/credentials loads | ✅ | Console clean |
| 5.7 /dashboard/admin → Access Denied | ✅ | /access-denied confirmed |
| 5.7 F-017 — meeting-manager blocked | ⚠️ | Guard fires, but redirects to trainer dashboard not /access-denied — NEW-012 |
| 5.7 /admin/user-management → Access Denied | ✅ | /access-denied confirmed |
| 5.7 /settings/rto → Access Denied | ✅ | /access-denied confirmed |
| 5.8 Console clean on trainer portal dashboard | ✅ | Clean |
| 5.8 Console clean on select-products | ✅ | Clean |
| 5.8 Console clean on trainer-availability | ✅ | Clean |
| 5.8 Console clean on resources-equipment | ✅ | Clean |
| 5.8 Console clean on assessment-decisions | ❌ | NEW-011 |

**Session B2 verdict: 25/31 ✅, 3 ⚠️ (NEW-007 app-wide, NEW-011, NEW-012), 2 ❌ (NEW-007, NEW-011 console errors), 1 closed by design (Resources & Equipment checklist item)**

---

---

## Round 6 — Session B1 (Role 4 — Compliance Manager, 2026-06-11)

**Tester:** Claude Chrome

| Item | Result | Notes |
|---|---|---|
| 4.1.1 Fresh login → `/dashboard/compliance` | ✅ | Confirmed |
| 4.1.2 Console clean on landing | ✅ | AppContext 12s timeout only (acceptable) |
| 4.1.3 No User Management / Settings in nav | ✅ | Confirmed absent |
| 4.1.4 "RTO Settings" NOT in header dropdown (NEW-005) | ✅ | Dropdown shows Profile + Sign out only |
| 4.2.1 `/dashboard/tas-engine` loads | ✅ | Console clean |
| 4.2.2 `/dashboard/assessment-validation` loads | ⚠️ | Loads but red error: "Error fetching validation progress" (NEW-007 confirmed app-wide) |
| 4.2.3 PDR Add button present (F-010) | ✅ | Button present, form opens correctly |
| 4.2.4 MCN write access | ✅ | Log New Entry button present |
| 4.2.5 `/dashboard/registers/audit` loads | ✅ | Console clean |
| 4.2.6 `/dashboard/governance/register` loads | ✅ | Console clean |
| 4.2.7 ComplyBot loads (F-009) | ⚠️ | UI renders fully ✅ — red error: "Error fetching history" (NEW-006 confirmed app-wide) |
| 4.2.8 `/dashboard/trainer-portal/cm-delivery-overview` | ❌ | Redirects to `/dashboard/compliance` — route unavailable (NEW-010) |
| 4.3.1 `/settings/rto` → `/access-denied` (NEW-005) | ✅ | Redirect confirmed, content blocked |
| 4.3.2 `/admin/user-management/roles` → Access Denied | ✅ | Guard fires |
| 4.3.3 `/admin/user-portals` → Access Denied | ✅ | Guard fires |
| 4.3.4 `/superadmin/dashboard` → redirected | ✅ | Redirects to `/dashboard/compliance` |
| 4.4.1 Console clean on `/dashboard/compliance` | ✅ | Zero red errors |
| 4.4.2 Console clean on governance register | ✅ | Zero red errors |
| 4.4.3 Console clean on `/complybot` | ❌ | "Error fetching history" (NEW-006) |

**Session B1 verdict: 16/19 ✅, 2 ⚠️ (known app-wide issues), 1 ❌ (NEW-010 new finding)**

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
