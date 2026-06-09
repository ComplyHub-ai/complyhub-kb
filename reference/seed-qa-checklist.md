# ComplyHub — Seed QA Checklist
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**Last updated:** 2026-06-10
**Status:** Round 1 complete — fixes deployed, Round 2 re-test required
**Findings log:** `seed-qa-findings.md`
**Branch Vercel URL:** `https://complyhub-rto-git-fix-local-run-complyhub.vercel.app`

---

## Current State Summary

Round 1 manual QA (2026-06-09) found 22 findings (F-001 to F-022).
All fixable bugs and seed gaps have been resolved on `fix/local-run` and deployed to Vercel.

**Fixed (20):** F-001 to F-019, F-021
**Open — features not yet built (2):** F-020, F-022 (consultant sub-pages)

---

## Next Actions — Round 2 Re-test

Now that fixes are deployed, the following need to be re-tested against the live Vercel branch URL. Use the same seed credentials (password: `Seed1234!`).

### Priority 1 — Re-test previously blocked roles
These were fully blocked in Round 1 and can now be properly tested:
- **Role 1 (Super Admin)** — F-001 and F-002 fixed. Re-run all of Section 1.
- **Role 4 (CM)** — F-009/F-010/F-011/F-012 fixed. Re-run all of Section 4.
- **Role 5 (Trainer)** — F-013/F-014/F-015/F-016/F-017/F-018 fixed. Re-run all of Section 5.
- **Role 7 (Consultant)** — F-019/F-021 fixed. Re-run all of Section 7, especially 7.4 (P0 isolation check).

### Priority 2 — Run Cross-Cutting Scenarios (not yet tested)
CC-1 through CC-5 were never run. Run these after roles above pass.

### Priority 3 — Re-verify previously passing roles
Roles 2 and 3 had some items fixed (F-004, F-006, F-007, F-008). Spot-check:
- Role 2: Re-test CT register Add (F-004 fixed), Settings page (F-007 fixed)
- Role 3: Re-test Governance Meeting History tab (F-008 fixed), /settings/rto (F-007 fixed)

### Not in scope for Round 2
- Roles 6, 8, 9, 10 — still under construction, deferred
- F-020, F-022 — consultant portal sub-pages not built yet

---

## How to use this document

Run Layer 1 (SQL verification) first. Only proceed to this checklist once it passes.

Each section below is one role. Work top to bottom. Use the seed credentials listed under each role. Mark each item ✅ pass / ❌ fail / ⚠️ partial. Record failures with the route and what you observed.

This checklist is written for a human tester. Playwright specs will be generated from this once the checklist has been validated manually at least once.

---

## Seed credentials (all passwords: `Seed1234!`)

| Role | Email | Tenant |
|---|---|---|
| Super Admin | `superadmin@complyhub.ai` | Platform (no tenant) |
| Administrator | `admin@complyhub-seed.com` | Tenant 1 (seed-rto, active) |
| Governing Person | `governing@complyhub-seed.com` | Tenant 1 |
| Compliance Manager | `compliance@complyhub-seed.com` | Tenant 1 |
| Trainer/Assessor | `trainer@complyhub-seed.com` | Tenant 1 |
| Student Support Officer | `sso@complyhub-seed.com` | Tenant 1 |
| Consultant | `consultant@complyhub-seed.com` | Tenant 1 + Tenant 2 |
| Regulatory Officer | `regulatory@complyhub-seed.com` | Tenant 1 |
| Employer | `employer@complyhub-seed.com` | Tenant 1 (placeholder) |
| Third Party | `thirdparty@complyhub-seed.com` | Tenant 1 (placeholder) |

**Tenant 1:** seed-rto — subscription active
**Tenant 2:** trial-rto — subscription trialing

---

## Cross-cutting rules (apply to every role)

Before testing each role, confirm:
- [ ] Login lands on the correct dashboard for that role (no wrong redirect)
- [ ] Browser console has no uncaught errors on page load
- [ ] No data from Tenant 2 appears anywhere while logged into Tenant 1 context (cross-tenant isolation)

---

---

# ROLE 1 — Super Admin
**Login:** `superadmin@complyhub.ai`
**Expected landing:** `/superadmin/dashboard`

## 1.1 Landing & navigation
- ❌ Lands on `/superadmin/dashboard` after login — NOT `/dashboard` → **F-001** lands in Tenant 1 admin context
- ❌ Left nav shows SuperAdmin sections only → shows tenant nav instead
- ⚠️ Tenant register links not accessible via URL → not tested (blocked by F-001)

## 1.2 Platform management
- ❌ `/superadmin/tenants` → Access Denied toast, blank page — **F-002** (platform_permissions tables empty)
- ❌ `/superadmin/users` → blocked by F-002
- ❌ `/superadmin/system/audit` → blocked by F-002
- ❌ `/superadmin/system/flags` → blocked by F-002
- ❌ `/superadmin/billing/revenue` → blocked by F-002
- ❌ `/superadmin/billing/sales` → blocked by F-002
- ❌ `/superadmin/regulatory-intelligence` → blocked by F-002

## 1.3 Permission guard
- ⚠️ Not tested — blocked by F-002

## 1.4 Tenant isolation enforcement
- ⚠️ Not tested — blocked by F-001/F-002

## 1.5 QA tracker
- ⚠️ Not tested — blocked by F-002

> **Role 1 blocked** — F-001 (RJ) and F-002 (Carl) must be resolved before retesting.

---

---

# ROLE 2 — Administrator
**Login:** `admin@complyhub-seed.com`
**Expected landing:** `/dashboard/admin` or main dashboard

## 2.1 Landing & navigation
- ✅ Lands on Admin Dashboard after login (Seed RTO Pty Ltd / Administrator)
- ✅ All 9 nav sections visible: Dashboard, Training & Assessment, Students & Support, VET Workforce, Governance & Risk, Documents & Compliance, AI & Automation, User Management, Settings

## 2.2 Training & Assessment
- ✅ `/dashboard/tas-engine` loads with Tenant 1 data
- ✅ `/dashboard/assessment-validation` loads
- ✅ `/admin/trainer-matrix-engine` loads
- ✅ `/dashboard/registers/ct` loads — CT register shows Tenant 1 records only
- ✅ `/dashboard/registers/rpl` loads
- ✅ `/dashboard/registers/fre` loads
- ❌ Add a new record in CT register → **F-004** Risk Level dropdown empty, form cannot save
- ❌ Edit an existing CT record → blocked by F-004 (no record to edit)

## 2.3 Students & Support
> ⚠️ URLs corrected from role map — verified against live app 2026-06-09
- ✅ `/dashboard/students-support/dashboard` loads (Students & Support dashboard)
- ✅ `/dashboard/students-support/suitability` loads (Suitability & LLND)
- ✅ `/dashboard/students-support/support` loads (Student Support)
- ✅ `/dashboard/students-support/adjustments` loads (Adjustments)
- ✅ `/dashboard/students-support/at-risk` loads (At-Risk)
- ✅ `/dashboard/students-support/wellbeing` loads (Wellbeing & Safety)
- ✅ `/dashboard/students-support/placement-wellbeing` loads (Placement Wellbeing)
- ✅ `/dashboard/students-support/diversity` loads (Diversity & Inclusion)
- ✅ `/dashboard/students-support/complaints-appeals` loads (Complaints & Appeals)
- ✅ `/admin/surveys` loads (Surveys)
- ✅ Add a new student support record → saves and appears in list (note: F-006 missing asterisk on Responsible Person)

## 2.4 VET Workforce
- ✅ `/dashboard/registers/pdr` loads — 3 Tenant 1 records shown, 2 Tenant 2 records correctly hidden (DB-verified)
- ✅ `/dashboard/registers/tcr` loads
- ✅ `/dashboard/trainers` loads
- ✅ `/dashboard/registers/staff-turnover` loads
- ✅ `/dashboard/registers/trainer-availability` loads
- ✅ Add a new PDR record → saves with correct tenant_id

## 2.5 Governance & Risk
> ⚠️ URLs and items updated from live nav 2026-06-09. CEO Governance Portal shows "rolling out progressively" for Admin — expected, it is Governing Person only.
- ✅ `/dashboard/governance/meeting-manager` loads (Governance Meetings)
- ✅ `/dashboard/governance/register` loads (Governance Register)
- ✅ `/dashboard/registers/adc` loads (Annual Declaration)
- ✅ `/dashboard/registers/mcn` loads (Material Change Notification)
- ✅ `/dashboard/registers/fpp` loads (Fit & Proper Person)
- ✅ `/dashboard/registers/pfp` loads (Prepaid Fee Protection)
- ✅ `/dashboard/registers/pli` loads (Public Liability Insurance)
- ✅ `/dashboard/registers/qi` loads (Quality Indicator Reporting)
- ✅ `/dashboard/registers/audit` loads (Audit & Internal Review)
- ✅ `/dashboard/regulatory-intelligence` loads (Regulatory Intelligence)
- ✅ `/dashboard/registers/whs` loads (Work Health & Safety)
- ✅ `/dashboard/registers/thp` loads (Third Party Arrangements)
- ✅ Add a governance meeting → saves correctly
- ✅ CEO Governance Portal → shows "rolling out progressively" gate for Admin — expected (Governing Person only)

## 2.6 Documents & Compliance
> ⚠️ Routes updated from live nav 2026-06-09 — mktg and suggestions-triage added
- ✅ `/documents-register` loads
- ✅ `/document-repository` loads
- ✅ `/dashboard/registers/mktg` loads (Marketing register)
- ✅ `/dashboard/suggestions-triage` loads (Suggestions Triage)
- ✅ Upload a document → appears in register

## 2.7 AI & Automation
- ✅ `/complybot` loads and responds
- ✅ `/dashboard/assessors/insights` loads

## 2.8 User Management
> ⚠️ Routes updated from live nav 2026-06-09 — credential-risk and impersonate added
- ✅ `/admin/user-management` loads — all seed users for Tenant 1 visible
- ✅ `/admin/user-management/roles` loads — role editing available
- ✅ `/admin/user-portals` loads
- ✅ `/admin/credential-risk` loads
- ✅ `/admin/impersonate` loads

## 2.9 Settings
> ⚠️ Settings is NOT in the sidebar nav. `/settings`, `/settings/rto`, `/settings/preferences` all return 404. Correct URL unknown — needs investigation. Logged as **F-007**.
- ❌ `/settings` → 404 not found
- ❌ `/settings/rto` → 404 not found
- ❌ `/settings/preferences` → 404 not found

## 2.10 Cross-tenant isolation
- ✅ PDR register shows NO Tenant 2 records — confirmed via DB check: 3 T1 records visible, 2 T2 records correctly hidden
- ✅ CT register shows NO Tenant 2 records — 0 records displayed (no CT data seeded for either tenant, correct)

---

---

# ROLE 3 — Governing Person
**Login:** `governing@complyhub-seed.com`
**Expected landing:** `/dashboard/executive` (NOT admin dashboard — checklist was wrong)

## 3.1 Landing & navigation
- ✅ Lands on `/dashboard/executive` after login (Governing Person dashboard)
- ✅ All 9 nav sections visible

## 3.2 Access check
> ⚠️ Checklist incorrectly said "write access" — Governing Person has oversight/read access on most registers, not data entry. This is by design.
- ✅ `/dashboard/registers/pdr` loads — 3 Tenant 1 records visible, no Add button (read-only by design)
- ✅ `/dashboard/governance/meeting-manager` loads — meeting visible, no Add button visible (read-only for Governing Person)
- ❌ Governance Meeting → History tab → "We hit a loading snag. Try refreshing." — **F-008**
- ✅ `/admin/user-management` loads
- ❌ `/settings/rto` → "We hit a loading snag. Try refreshing." — **F-007** (route exists but page crashes)
- ✅ `/dashboard/tas-engine` loads

## 3.3 Governance-specific
- ✅ CEO Governance Portal → same "rolling out progressively" gate as Admin — expected, feature not yet released for any role
- ✅ Can view Assessment Validation (`/dashboard/assessment-validation`) — all sub-tabs render, no data (expected, not seeded)

---

---

# ROLE 4 — Compliance Manager
**Login:** `compliance@complyhub-seed.com`
**Expected landing:** `/dashboard/compliance`

## 4.1 Landing & navigation
- ✅ Lands on `/dashboard/compliance` after login
- ✅ User Management and Settings sections absent from nav
- ⚠️ Nav shows 8 sections — checklist expected 7, likely a checklist discrepancy (not a bug, verify with RJ)

## 4.2 Accessible features (should work)
- ✅ `/dashboard/tas-engine` loads
- ✅ `/dashboard/assessment-validation` loads
- ❌ `/dashboard/registers/pdr` — no Add button visible, read-only — **F-010** (expected write access for CM)
- ✅ `/dashboard/registers/mcn` loads with write access
- ✅ `/dashboard/registers/audit` loads
- ✅ `/dashboard/governance/register` loads
- ❌ `/complybot` → 404 — **F-009**

## 4.3 Blocked routes (should redirect or deny)
- ❌ `/settings/rto` → crashes "We hit a loading snag" — **F-007** (repro)
- ❌ `/settings` → blank white page, no redirect — **F-007** (repro)
- ✅ `/admin/user-management/roles` → Access Denied correctly

## 4.4 Limited User Management
- ❌ `/settings/users-management` → 404 — **F-011**
- ❌ `/admin/user-portals` → Access Denied (blocked when it should load) — **F-012**

---

---

# ROLE 5 — Trainer / Assessor
**Login:** `trainer@complyhub-seed.com`
**Expected landing:** `/dashboard/trainer-portal/dashboard`
> ⚠️ Trainer portal URLs use `/dashboard/trainer-portal/` prefix — checklist URLs corrected from live app

## 5.1 Landing & navigation
- ✅ Lands on trainer portal dashboard after login
- ✅ Trainer-specific nav visible, no Governance/Students/Settings sections
- ✅ Admin nav sections not visible

## 5.2 Training portal
- ❌ `/dashboard/trainer-portal/products` → 404 — **F-013**
- ✅ `/dashboard/trainer-portal/matrix` loads
- ❌ `/dashboard/trainer-portal/availability` → 404 — **F-014**
- ✅ `/dashboard/trainer-portal/profile` loads, Edit Profile available

## 5.3 Professional Development
- ✅ `/dashboard/trainer-portal/pd` loads with Add PD button
- ⚠️ Add a PD record → not tested (assumed pass given Add button visible)
- ✅ `/dashboard/trainer-portal/my-pd-recommendations` loads
- ✅ `/dashboard/trainer-portal/vet-currency` loads
- ❌ `/dashboard/registers/tcr` → "Log New Entry" button visible — **F-015** (write access leak)

## 5.4 Assessment (read-only enforcement)
- ✅ `/dashboard/assessment-validation` loads
- ✅ No Add/Edit/Delete buttons visible (no data seeded)
- ⚠️ API write block not tested

## 5.5 Resources
- ❌ `/document-repository` → 404 — **F-016**
- ⚠️ `/complybot` not tested

## 5.6 Blocked routes
- ✅ `/dashboard/admin` → Access Denied (correctly blocked)
- ❌ `/dashboard/governance/meeting-manager` → loads with live meeting data — **F-017** (role boundary violation)
- ✅ `/admin/user-management` → Access Denied
- ❌ `/settings/rto` → crashes "We hit a loading snag" — **F-007** (repro)

## 5.7 Advanced trainer routes
- ✅ `/dashboard/trainer-portal/validation` loads
- ✅ `/dashboard/trainer-portal/credentials` loads
- ❌ `/dashboard/trainer-portal/fre-register` → 404 — **F-018**
- ✅ `/dashboard/trainer-portal/session-plans` loads

---

---

# ROLE 6 — Student Support Officer (SSO)
**Login:** `sso@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — portal not fully built. Skip detailed testing for this QA run. Revisit when RJ confirms the SSO portal is production-ready.**

## 6.1–6.6 — Deferred
- ⚠️ SSO portal is under construction — all items deferred pending portal completion

---

---

# ROLE 7 — Consultant (Cross-Tenant)
**Login:** `consultant@complyhub-seed.com`
**Tenant memberships:** Tenant 1 (seed-rto) + Tenant 2 (trial-rto)
**Expected landing:** `/consultant/dashboard`

## 7.1 Landing & navigation
- ❌ Post-login briefly redirects to `/dashboard/admin` (T1) before reaching `/consultant/dashboard` — **F-019**
- ✅ `/consultant/dashboard` loads with "My Client Portfolio"
- ✅ Nav shows correct sections: Dashboard, My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings
- ✅ Does NOT stay on tenant dashboard

## 7.2 Consultant portal
- ❌ `/consultant/my-tenants` → "Coming soon" placeholder — **F-020**
- ✅ `/consultant/tenants-hub` loads (Coming soon placeholder — pages exist)
- ✅ `/consultant/calendar` loads (Coming soon placeholder)
- ✅ `/consultant/account-settings` loads (Coming soon placeholder)
- ❌ All sub-pages show "Coming soon" — **F-022**

## 7.3 Client tenant access
- ✅ Can navigate into Tenant 1 context via "Enter Workspace"
- ✅ Can navigate into Tenant 2 context via "Enter Workspace"
- ⚠️ Tenant 1 PDR records in T1 context — not separately verified (assumed pass)
- ❌ **Tenant 2 PDR register shows 5 records including Tenant 1 data (Jane Trainer) — F-021 P0 CRITICAL**

## 7.4 Cross-tenant isolation (P0 — must pass)
- ⚠️ T1 context isolation — not fully tested
- ❌ **T2 context: T1 records visible in PDR register — F-021 P0 CRITICAL — RJ's fix did not fully resolve Angela's bug**
- ⚠️ Staff member dropdown — not tested
- ❌ Angela's bug NOT resolved — cross-tenant leak confirmed in consultant T2 context

## 7.5 Blocked routes
- ✅ `/superadmin/dashboard` → redirected to `/consultant/dashboard`
- ✅ `/superadmin/tenants` → redirected

---

---

# ROLE 8 — Regulatory Officer
**Login:** `regulatory@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — portal not fully built. Skip detailed testing for this QA run. Revisit when RJ confirms the Regulatory Officer portal is production-ready.**

## 8.1–8.4 — Deferred
- ⚠️ Regulatory Officer portal is under construction — all items deferred pending portal completion

---

---

# ROLE 9 — Employer
**Login:** `employer@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — portal not built. Skip testing for this QA run. Revisit when RJ confirms the Employer portal is production-ready.**

## 9.1–9.2 — Deferred
- ⚠️ Employer portal is under construction — all items deferred

---

---

# ROLE 10 — Third Party
**Login:** `thirdparty@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — portal not built. Skip testing for this QA run. Revisit when RJ confirms the Third Party portal is production-ready.**

## 10.1–10.2 — Deferred
- ⚠️ Third Party portal is under construction — all items deferred

---

---

# Cross-Cutting Scenarios (run after all roles)

## CC-1 — Billing gate
- [ ] Downgrade Tenant 1 to expired subscription (or use Tenant 2 trial)
- [ ] Log in as Tenant 2 administrator — registers should be gated/blocked
- [ ] Confirm the billing gate message appears (not a generic error)

## CC-2 — Cross-tenant isolation sweep (P0)
- [ ] Log in as consultant, switch between Tenant 1 and Tenant 2 contexts
- [ ] In each context, open PDR register, CT register, and Governance register
- [ ] Confirm zero records from the other tenant appear in any view
- [ ] Confirm staff member dropdowns only show current tenant's staff

## CC-3 — SuperAdmin cannot access tenant content
- [ ] Log in as superadmin
- [ ] Navigate directly to `/dashboard/registers/pdr` → must redirect
- [ ] Navigate directly to `/dashboard/governance/register` → must redirect
- [ ] Confirm super_admin sees zero tenant register records (RLS deny policy)

## CC-4 — Redirect flows
- [ ] Unauthenticated user → navigating to any `/dashboard/*` route → redirected to login
- [ ] After login, redirected back to the originally requested URL (if applicable)

## CC-5 — Console error sweep
- [ ] After completing each role's tests, check browser console for uncaught errors, 401s, or 500s
- [ ] Any `console.log` or `console.error` in production build (not in DEV mode) → flag as a CLAUDE.md violation

---

---

## How to log failures

When an item fails, record:
```
Role: [role name]
Route: [exact URL]
Expected: [what should happen]
Actual: [what did happen]
Console error (if any): [paste]
Severity: P0 / P1 / P2
```

P0 = cross-tenant data leak or auth bypass
P1 = wrong role sees wrong data or blocked from correct data
P2 = UI cosmetic / redirect missing

---

## Playwright conversion notes (for future)

Each `- [ ]` item with a route maps to one Playwright `test()` block. Structure:
- `beforeEach`: log in as the role, navigate to route
- `expect`: page loads / element exists / redirect occurred / button disabled
- `afterEach`: log out

Priority order for automation: CC-2 (cross-tenant isolation) → CC-3 (super_admin isolation) → Role 7 (consultant) → Role 2 (administrator write paths) → all other read/redirect checks.
