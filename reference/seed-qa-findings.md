# ComplyHub — Seed QA Findings Log
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**QA Round 1:** 2026-06-09 — 22 findings identified
**QA Round 2:** 2026-06-10 — 6 confirmed fixed, 11 still failing, 3 new findings
**Tester:** Brian (Khian) — Round 1 / Claude (automated) — Round 2
**Status:** Round 2 complete — fixes needed for F-007 to F-019 (excl. fixed), plus NEW-001 P0

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

| # | Role | Route | Severity | Owner | R1 Status | R2 Status |
|---|---|---|---|---|---|---|
| F-001 | Super Admin | Post-login landing | P1 | RJ | Fixed | ✅ Confirmed fixed |
| F-002 | Super Admin | `/superadmin/dashboard` | P1 | Carl/Dave | Fixed | ✅ Confirmed fixed |
| F-003 | All roles | Post-login landing | P1 | Carl | Fixed | ✅ Not retested (billing) |
| F-004 | Administrator | CT Risk Level dropdown | P2 | RJ | Fixed | ✅ Confirmed fixed |
| F-005 | All roles | Person dropdowns — Unknown names | P2 | Carl | Fixed | ✅ Not retested |
| F-006 | Administrator | SSR Add form — missing asterisk | P2 | RJ | Fixed | ✅ Not retested |
| F-007 | All roles | `/settings/rto` crashes | P2 | RJ | Fixed (attempt) | ✅ Fixed — TourProvider added to App.tsx |
| **F-008** | **Governing Person** | **History tab blank page** | **P2** | **RJ** | Fixed (attempt) | ❌ Needs retest — blank (no crash, no empty state visible) |
| **F-009** | **CM** | **`/complybot` blank page** | **P1** | **RJ** | Fixed (attempt) | ❌ Needs retest — route resolves but all panels render empty |
| F-010 | CM | PDR register — no Add button | P1 | RJ | Fixed (attempt) | ✅ Fixed — ctx.tenant_role used instead of ctx.role |
| F-011 | CM | `/dashboard/user-management` 404 | P1 | RJ | Fixed (attempt) | ✅ Fixed — route moved inside /dashboard children tree |
| F-012 | CM | `/admin/user-portals` Access Denied | P1 | RJ | Fixed (attempt) | ⚠️ By design — RJ confirmed CM should not have user-portals |
| **F-013** | **Trainer** | **Products page 404** | **P1** | **RJ** | Fixed (attempt) | ⚠️ Needs retest via nav link — Round 2 tested wrong URL |
| **F-014** | **Trainer** | **Availability page 404** | **P1** | **RJ** | Fixed (attempt) | ⚠️ Needs retest via nav link — Round 2 tested wrong URL |
| F-015 | Trainer | TCR write access leak | P1 | RJ | Fixed | ✅ Confirmed fixed |
| **F-016** | **Trainer** | **Document repository 404** | **P1** | **RJ** | Fixed (attempt) | ⚠️ Needs retest via nav link — Round 2 tested wrong URL |
| F-017 | Trainer | Governance Meeting Manager unblocked | P1 | RJ | Fixed | ✅ Confirmed fixed — Access Denied correctly |
| **F-018** | **Trainer** | **FRE register 404** | **P1** | **RJ** | Fixed (attempt) | ⚠️ Needs retest via nav link — Round 2 tested wrong URL |
| **F-019** | **Consultant** | **Post-login wrong landing** | **P1** | **RJ** | Fixed (attempt) | ⚠️ Needs retest — log out and log back in fresh |
| F-020 | Consultant | `/consultant/my-tenants` Coming soon | P1 | RJ | Open | ⚠️ Deferred — not built |
| F-021 | Consultant | T2 PDR cross-tenant leak (P0) | P0 | RJ | Fixed | ✅ Confirmed fixed — 2 T2 records only, no T1 bleed |
| F-022 | Consultant | Consultant sub-pages Coming soon | P1 | RJ | Open | ⚠️ Deferred — not built |
| NEW-001 | Super Admin | SA sees Tenant 1 governance register data | P0 | RJ | New | ✅ Fixed — useGovernanceRegister now uses active_tenant_id |
| NEW-002 | Super Admin | SA authenticated redirect → `/dashboard/admin` | P1 | RJ | New | ⚠️ Test methodology — agent tested `/login` which doesn't exist. Landing page correctly redirects SA. |
| NEW-003 | Super Admin | `/superadmin/billing/revenue` → 404 | P2 | RJ | New | ⚠️ Checklist URL wrong — correct path is `/superadmin/billing` |

---

---

## F-001

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.1, 1.4
**Severity:** P1
**Owner:** RJ
**Status:** Open

**Expected:**
After login, super_admin lands on `/superadmin/dashboard` with platform-only nav (no tenant sections visible).

**Actual:**
Super_admin lands in the Tenant 1 (Seed RTO Pty Ltd) admin context. Left nav shows tenant sections: Admin Dashboard, Training & Assessment, Students & Support, VET Workforce, Governance & Risk, Documents & Compliance, AI & Automation, User Management, Role Portals. Sidebar shows "Seed RTO Pty Ltd / Administrator".

**What works:**
- Top-right correctly identifies user as "Sam SuperAdmin / super_admin"
- "Full Access" badge is displayed

**Root cause hypothesis:**
The seed adds `superadmin@complyhub.ai` to `tenant_members` for Tenant 1 with role `super_admin`. The app sees an active tenant membership on login and loads the tenant context instead of routing to `/superadmin/dashboard`. The SuperAdminGuard may not be firing before the tenant context is set.

**Next step for RJ:**
1. Check whether navigating directly to `/superadmin/dashboard` works from the tenant context (if yes, it is a landing redirect bug only)
2. Check `SuperAdminGuard` — does it check `profiles.role = 'super_admin'` before the tenant context loads, or after?
3. Consider whether the super_admin should have a `tenant_members` row at all — may need to be removed from seed

**Console errors (paste here):**
_Not yet captured_

---

---

## F-002

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.2, 1.3
**Severity:** P1
**Owner:** Carl / Dave
**Status:** Open

**Expected:**
`/superadmin/dashboard` loads with platform management content (tenant list, user list, analytics).

**Actual:**
Page is blank. Toast fires: "Access Denied — You do not have permission to access this area." The sidebar correctly switches to "Super Admin Panel" (SuperAdminGuard passes), but a `PlatformPermissionGuard` checking for the `sa_dashboard` permission then blocks the page content.

**What works:**
- SuperAdminGuard correctly identifies the user as super_admin (sidebar switches to platform nav)
- "Full Access" badge and "super_admin" label display correctly

**Root cause hypothesis:**
The seed does not populate the platform permissions table for the super_admin user. `PlatformPermissionGuard` requires a resolved permission set (auth → identity → role → permissions stages). The `sa_dashboard` permission record is missing for `superadmin@complyhub.ai` in whatever table stores platform-level permissions.

**Confirmed root cause:**
Both `platform_permissions` and `platform_role_permissions` tables are completely empty on the branch DB — not just missing for the seed user, but entirely unpopulated. `PlatformPermissionGuard` queries these tables and finds nothing, so it denies access to every super_admin route.

**Next step for Carl:**
1. Check `platform_permissions` and `platform_role_permissions` in production to get the correct row shape
2. Add the required rows to `seed.sql` as a new section (Section 24 or similar)
3. Re-apply to branch DB (`execute_sql` or `db reset`) and retest

**Console errors:**
_Not yet captured — please check browser console and paste here_

---

---

## F-003

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.1
**Severity:** P1
**Owner:** Carl (seed gap)
**Status:** Fixed — applied to branch DB, seed.sql updated

**Expected:**
Administrator lands on admin dashboard after login.

**Actual:**
"Your Trial Has Ended" screen shown immediately after login. No access to any tenant features.

**Root cause (full chain):**
There are TWO billing guards in sequence: `BillingGateGuard` (calls `billing-gate` edge fn) and `TrialExpirationGuard` (calls `get_access_gate` RPC). Both must pass.

1. `BillingGateGuard` — calls `billing-gate` edge fn → calls `sec.user_default_tenant()` → crashes on missing `user_last_tenant` table (deprecated) → returns `allowed:true, no_tenant` → passes through
2. `TrialExpirationGuard` — calls `get_access_gate(tenant_id)` directly → step 3 legacy fallback: T1 had `trial_consumed=true` → `reason='trial_used'` → `allowed:false` → redirects to `/billing/subscribe?reason=trial_used` → "Your Trial Has Ended" screen

**Fix applied (two parts):**

Part A — `billing_subscriptions` (Section 23, already committed):
- Adds rows per tenant so `sec.tenant_is_active()` passes. Rows existed (auto-created by trigger) but this makes it explicit.

Part B — `billing.entitlements` + `trial_expires_at` (Section 24, this commit):
- T1: `billing.entitlements` row with `status='active'`, `period_end='2027-12-31'`, `provider='manual'` — caught at `get_access_gate` step 2 → `allowed:true, reason='paid_invoice'`
- T2: `trial_expires_at='2027-12-31'` on tenants row — caught at step 1c trial safety net → `allowed:true, reason='trial_active'`

**Verified:**
```
Seed RTO Pty Ltd  | get_access_gate: allowed=true, reason=paid_invoice
Trial RTO Pty Ltd | get_access_gate: allowed=true, reason=trial_active
```

---

---

## F-004

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.2 — Add a new record in CT register
**Severity:** P2
**Owner:** RJ
**Status:** Open

**Expected:**
Clicking the "Risk Level*" dropdown in the Credit Transfer Add form opens a list of risk level options to select from.

**Actual:**
Clicking "Select risk..." produces no dropdown. The field stays empty and validation fires immediately: "Risk level is required." The form cannot be saved — the Save button is blocked by this required field.

**What works:**
- "+ Log New Entry" button opens the form correctly
- All other fields (Title, Student Name, Student ID, Course Code, Evidence Type, Date Received, Responsible Person) are functional
- Form validation is working correctly (required field flagged)

**Root cause hypothesis:**
The Risk Level dropdown likely reads from a lookup table or enum that is either empty on the branch DB or using a different value source than expected. Possible causes:
1. A `risk_levels` or similar lookup table is not seeded
2. The dropdown reads from a hardcoded list in the component that has a rendering bug
3. A `dd_` dropdown table (part of the enum-to-DD migration) is empty on the branch

**Next step for RJ:**
1. Check what table/source the Risk Level dropdown reads from in the CT register form component
2. Verify if it is a seeded lookup table — if yes, add it to `seed.sql`
3. If it is a component bug, fix the dropdown render

**Console errors:**
_Not yet captured — please check browser console and paste here_

---

---

## F-005

**Role:** All roles (first seen: Administrator)
**Checklist items:** 2.3 — Add SSR record; likely affects any form with a person picker
**Severity:** P2
**Owner:** Carl (seed gap)
**Status:** Open

**Expected:**
Person picker dropdowns (e.g. "Responsible Person") show the real name of each seed user — e.g. "Adam Admin", "Trainer User", etc.

**Actual:**
All options in the Responsible Person dropdown display as "Unknown". Selecting one still allows the form to save, so functionality is not blocked — but data quality is poor and the field is meaningless for testing purposes.

**Root cause:**
The seed's `tenant_members` INSERT does not include the `full_name` column. All 10 seed users have `full_name = NULL`. Person picker dropdowns that join to `tenant_members.full_name` or `profiles.full_name` fall back to "Unknown".

**Fix required in seed.sql:**
Add `full_name` to the `tenant_members` INSERT column list and populate realistic names for each seed user. Example:
- `admin@complyhub-seed.com` → "Adam Admin"
- `trainer@complyhub-seed.com` → "Terry Trainer"
- `compliance@complyhub-seed.com` → "Claire Compliance"
- etc.

Also check `profiles` table — if `full_name` or `display_name` is also blank there, update Section 5 of seed.sql accordingly.

**Console errors:**
_None expected — this is a data gap, not a code error_

---

---

## F-006

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.3 — Add SSR record
**Severity:** P2
**Owner:** RJ
**Status:** Open

**Expected:**
"Responsible Person" field shows an asterisk (*) like other required fields (Title*, Status*, Support Area*) to indicate it is required.

**Actual:**
"Responsible Person" label has no asterisk. The field appears to be required (cannot save without a selection) but nothing in the UI signals this to the user.

**Root cause hypothesis:**
The `required` prop or asterisk indicator is missing from the Responsible Person form field component in the Student Support Register Add form.

**Console errors:**
_None_

---

---

## F-007

**Role:** All roles
**Checklist items:** 2.9, 3.2, 4.3, 5.6
**Severity:** P2
**Owner:** RJ
**Status:** ❌ Still failing — root cause now confirmed

**Expected:** `/settings/rto` loads RTO settings page.
**Actual:** Page crashes with "We hit a loading snag. Try refreshing the page." for all roles.

**Root cause confirmed (Round 2):**
```
Error: useTour must be used within a TourProvider
  at ze (RTOSettings-B6PGvPVB.js:1:27070)
ErrorBoundary caught: Error: useTour must be used within a TourProvider
```
`RTOSettings` calls `useRtoSettingsTour()` which internally calls `useTour()`. The `useTour` hook requires a `TourProvider` ancestor in the component tree. RTOSettings is not wrapped in `TourProvider`, so the hook throws on mount, the error boundary catches it, and renders "We hit a loading snag."

**Fix needed:**
Wrap `RTOSettings` in `TourProvider`, or make `useRtoSettingsTour` safe when called outside a provider (add a try/catch or context check in the hook).

---

---

## F-008

**Role:** Governing Person (`governing@complyhub-seed.com`)
**Checklist items:** 3.2
**Severity:** P2
**Owner:** RJ
**Status:** ❌ Still failing — symptom changed

**Expected:** History tab loads past meetings list.
**Actual Round 1:** "We hit a loading snag. Try refreshing the page."
**Actual Round 2:** Completely blank white content area — no error message, no empty state, no console errors captured. The null guard fix changed the crash to a silent blank render.

**Fix needed:**
The null guard prevented the crash but the component now renders nothing. Need to add an explicit empty state (e.g. "No meeting history yet") when `filteredMeetings.length === 0`, and verify the completed past meeting seeded (15 May 2026) is returned by the hook query.

---

---

## F-009

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2
**Severity:** P1 | **Owner:** RJ | **Status:** ❌ Still failing — symptom changed

**Expected:** `/complybot` loads and responds.
**Actual Round 1:** 404 → `/not-found`
**Actual Round 2:** Blank white page — route resolves (no 404) but component renders nothing. No console errors.
**Note:** The `/complybot` route was added under ManagerRoute (which allows CM). The route is reached but the ComplyBot component renders blank. Likely a component-level issue — ComplyBot may require an admin context or a tenant setup that CM's session doesn't provide.

---

## F-010

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/registers/pdr` loads with write access — Add button visible.
**Actual:** Register loads but no Add button — read-only view only. Matches Governing Person behaviour.
**Note:** Compliance Manager is listed as having write access to PDR in the role spec. Either the spec is wrong or the guard is wrong. RJ to confirm intended behaviour.

---

## F-011

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.4
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/settings/users-management` loads — user list, no role editing.
**Actual:** 404. Route may have moved or been renamed.

---

## F-012

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.4
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/admin/user-portals` loads — portal overview, read-only.
**Actual:** Access Denied. Compliance Manager is blocked when the role spec says this should be accessible.

---

## F-013

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/trainer-portal/products` loads — assigned training products visible.
**Actual:** 404. Route may not exist or trainer has no assigned products seeded.

---

## F-014

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/trainer-portal/availability` loads — trainer can update their availability.
**Actual:** 404.

---

## F-015

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.3
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/registers/tcr` loads read-only — no Add button for Trainer role.
**Actual:** "Log New Entry" button is visible. Trainer can attempt to write TCR records — role boundary violation.

---

## F-016

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.5
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/document-repository` loads — read-only, no upload button.
**Actual:** 404.

---

## F-017

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.6
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/governance/meeting-manager` → redirected away for Trainer role.
**Actual:** Page loads fully with live meeting data (seeded meeting "Governance Meeting - 06 Jul 2026", 80% readiness score, Trainer Compliance Status). Trainer should not see governance content.

---

## F-018

**Role:** Trainer/Assessor (`trainer@complyhub-seed.com`)
**Checklist items:** 5.7
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/dashboard/trainer-portal/fre-register` loads.
**Actual:** 404.

---

## F-019

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.1
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** After login, lands directly on `/consultant/dashboard`.
**Actual:** Post-auth flow briefly redirects to `/dashboard/admin` (Tenant 1 admin context) before reaching `/consultant/dashboard`. Same pattern as F-001 for super_admin — the app loads a tenant context before the role-specific guard redirects.

---

## F-020

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/consultant/my-tenants` shows both Tenant 1 and Tenant 2 listed.
**Actual:** "Coming soon" placeholder. Cannot verify tenant list or switch between tenants via this page.

---

## F-021 — P0 CRITICAL

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.3, 7.4
**Severity:** P0 | **Owner:** RJ | **Status:** Open — escalate immediately

**Expected:**
While in Tenant 2 (Trial RTO) context, `/dashboard/registers/pdr` shows only Tenant 2 records (2 seeded: PDR-SEED-T2-001, PDR-SEED-T2-002).

**Actual:**
5 records visible in Tenant 2 context — includes Jane Trainer (Trainer/Assessor) records which belong to Tenant 1. All 5 PDR records from both tenants are displayed.

**Impact:**
This is the original Angela-reported cross-tenant data leak. RJ's fix (adding `.eq('tenant_id', ctx.active_tenant_id)` to the PDR query) resolves it for single-tenant users (Admin confirmed ✅) but NOT for multi-tenant users like the Consultant. When the consultant switches to Tenant 2 context, `ctx.active_tenant_id` is likely still returning Tenant 1's ID, so the filter passes T1 records through.

**Root cause hypothesis:**
`get_my_app_context` RPC does not update `active_tenant_id` when the consultant switches workspace context. The RPC may cache or default to the user's primary tenant regardless of which workspace the consultant entered.

**Next step for RJ — urgent:**
1. Check what `get_my_app_context` returns for the consultant when in Tenant 2 context
2. Verify whether the workspace-switch flow updates `active_tenant_id` in the database or session
3. The fix must ensure `ctx.active_tenant_id` reflects the currently active workspace, not the default tenant

---

## F-022

**Role:** Consultant (`consultant@complyhub-seed.com`)
**Checklist items:** 7.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/consultant/my-tenants`, `/consultant/tenants-hub`, `/consultant/calendar`, `/consultant/account-settings` show functional content.
**Actual:** All show "Coming soon" placeholder. Portal sub-pages are not yet built.

---

---

## NEW-001 — P0 CRITICAL

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** CC-3, 1.4
**Severity:** P0 | **Owner:** RJ/Dave | **Status:** Open — escalate

**Expected:** SA navigating to `/dashboard/governance/register` is redirected away. SA must never see tenant content.
**Actual:** Page loads and displays 2 Tenant 1 governance records (CI-001 "Untitled", RISK-001 "Risk Item"). RLS is not blocking SA from reading tenant governance data.

**Root cause hypothesis:**
The `governance_register` (or underlying table) RLS SELECT policy either allows `super_admin` reads OR uses `sec.is_tenant_member()` which SA passes because they have a `tenant_members` row. Compare with `pdr_register` which correctly returns 0 records for SA — check what's different about the governance register RLS.

**Next step:** Dave to check RLS policies on the governance register table. Must have an explicit deny for super_admin matching the pattern on other registers.

---

## NEW-002

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** CC-4
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** SA who is already logged in and navigates to `/login` is redirected to `/superadmin/dashboard`.
**Actual:** Redirected to `/dashboard/admin` (Tenant 1 admin context).
**Note:** Related to F-001 pattern — the authenticated redirect falls through to tenant context instead of platform context.

---

## NEW-003

**Role:** Super Admin (`superadmin@complyhub.ai`)
**Checklist items:** 1.2
**Severity:** P2 | **Owner:** RJ | **Status:** Open

**Expected:** `/superadmin/billing/revenue` loads Revenue dashboard.
**Actual:** `/not-found` — route does not exist. `/superadmin/billing/sales` works correctly.
**Note:** Checklist route may be wrong or the revenue route was renamed. RJ to confirm correct path.

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
