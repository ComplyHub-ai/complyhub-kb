# ComplyHub — Seed QA Findings Log
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**QA Round 1:** 2026-06-09 — 22 findings identified
**QA Round 2:** Pending — fixes deployed to Vercel, re-test required
**Tester:** Brian (Khian)
**Status:** Round 1 complete — all fixable items resolved on `fix/local-run`

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

| # | Role | Route | Severity | Owner | Status |
|---|---|---|---|---|---|
| F-001 | Super Admin | Post-login landing | P1 | RJ | Fixed — active_tenant_id set to NULL in seed |
| F-002 | Super Admin | `/superadmin/dashboard` | P1 | Carl/Dave | Fixed — platform_permissions seeded from production |
| F-003 | All roles | Post-login landing | P1 | Carl (seed gap) | Fixed |
| F-004 | Administrator | `/dashboard/registers/ct` — Risk Level dropdown | P2 | RJ | Fixed — dd_risk_level seeded |
| F-005 | All roles | Person dropdowns — Unknown names | P2 | Carl (seed gap) | Fixed |
| F-006 | Administrator | SSR Add form — missing asterisk | P2 | RJ | Fixed |
| F-007 | All roles | `/settings/rto` crashes instead of redirecting | P2 | RJ | Fixed — array type guard added |
| F-008 | Governing Person | Governance Meeting History tab crash | P2 | RJ | Fixed — null guard + case-insensitive filter + seed title |
| F-009 | Compliance Manager | `/complybot` → 404 | P1 | RJ | Fixed — /complybot route added under ManagerRoute |
| F-010 | Compliance Manager | PDR register no Add button (expected write access) | P1 | RJ | Fixed — ADMIN_ROLES includes CM, context returns correct role |
| F-011 | Compliance Manager | `/settings/users-management` → 404 | P1 | RJ | Fixed — nav path corrected to /dashboard/user-management |
| F-012 | Compliance Manager | `/admin/user-management` → Access Denied for CM | P1 | RJ | Fixed — /dashboard/user-management route added under ManagerRoute |
| F-013 | Trainer | Trainer products page 404 | P1 | RJ | Fixed — nav corrected to /dashboard/trainer-portal/select-products |
| F-014 | Trainer | Trainer availability page 404 | P1 | RJ | Fixed — nav corrected to /dashboard/registers/trainer-availability |
| F-015 | Trainer | TCR register — Add button visible (write access leak) | P1 | RJ | Fixed — role guard added |
| F-016 | Trainer | Document repository 404 for Trainer | P1 | RJ | Fixed — nav corrected to /dashboard/document-repository |
| F-017 | Trainer | Governance Meeting Manager loads (should be blocked) | P1 | RJ | Fixed — AdminRoute added |
| F-018 | Trainer | Trainer FRE register 404 | P1 | RJ | Fixed — nav corrected to /dashboard/trainer-portal/resources-equipment |
| F-019 | Consultant | Post-login lands on T1 admin dashboard | P1 | RJ | Fixed — landingRoutes.ts → /consultant/dashboard |
| F-020 | Consultant | `/consultant/my-tenants` → Coming soon | P1 | RJ | Open — feature not built |
| **F-021** | **Consultant** | **T2 context — T1 PDR records visible (P0 CRITICAL)** | **P0** | **RJ** | Fixed — session dependency + tenant filter added |
| F-022 | Consultant | All consultant sub-pages → Coming soon | P1 | RJ | Open — features not built |

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

**Role:** Administrator (`admin@complyhub-seed.com`)
**Checklist items:** 2.9
**Severity:** P2
**Owner:** RJ
**Status:** Open

**Expected:**
`/settings`, `/settings/rto`, `/settings/preferences` load the RTO settings pages.

**Actual:**
All three routes return 404. Settings is also not accessible from the sidebar nav.

**Update (Role 3 testing):**
`/settings/rto` confirmed to exist on the Vercel deployment — it is NOT a 404. The page loads but crashes with "We hit a loading snag. Try refreshing the page." for both Administrator and Governing Person roles. The route is real but the page component throws an error.

**Root cause hypothesis:**
Page component crashes on load — likely a data fetch that fails (missing seed data the settings page expects, e.g. RTO profile fields, billing configuration, or an empty table causing a null dereference).

**Next step for RJ:**
1. Check browser console on `/settings/rto` for the specific JS error
2. Identify which data fetch is failing and whether it needs additional seed data

**Console errors:**
_Not yet captured — please check browser console on /settings/rto and paste here_

---

---

## F-008

**Role:** Governing Person (`governing@complyhub-seed.com`)
**Checklist items:** 3.2
**Severity:** P2
**Owner:** RJ
**Status:** Open

**Expected:**
Governance Meeting Manager → History tab loads a list of past meetings.

**Actual:**
Clicking the History tab shows "We hit a loading snag. Try refreshing the page." Page does not recover on refresh.

**Root cause hypothesis:**
The History tab query likely expects past meetings with completed status. The seed only has one future meeting (06 Jul 2026) with no history records. The component may crash on empty or null data rather than showing an empty state gracefully.

**Next step for RJ:**
1. Check browser console for the specific error when clicking History
2. If it's a null/empty data crash — fix the component to handle empty history gracefully
3. If it's a missing seed record — add a completed past meeting to seed.sql

**Console errors:**
_Not yet captured — please check browser console on the History tab and paste here_

---

---

## F-009

**Role:** Compliance Manager (`compliance@complyhub-seed.com`)
**Checklist items:** 4.2
**Severity:** P1 | **Owner:** RJ | **Status:** Open

**Expected:** `/complybot` loads and responds.
**Actual:** 404 — redirected to `/not-found`.
**Note:** ComplyBot works for Administrator (Role 2 confirmed ✅). Route may be access-controlled differently for Compliance Manager.

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
