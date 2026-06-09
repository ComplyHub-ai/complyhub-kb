# ComplyHub — Seed QA Findings Log
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**QA Run started:** 2026-06-09
**Tester:** Brian (Khian)
**Status:** In progress

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
| F-001 | Super Admin | Post-login landing | P1 | RJ | Open |
| F-002 | Super Admin | `/superadmin/dashboard` | P1 | Carl/Dave | Open |
| F-003 | All roles | Post-login landing | P1 | Carl (seed gap) | Fixed — applied to branch + seed.sql updated |

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
