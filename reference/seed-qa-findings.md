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
