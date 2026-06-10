# ComplyHub — Seed QA Checklist
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**Last updated:** 2026-06-10
**Status:** Round 2 complete — 6 confirmed fixed, 11 still failing, 3 new findings
**Findings log:** `seed-qa-findings.md`
**Branch Vercel URL:** `https://complyhub-rto-git-fix-local-run-complyhub.vercel.app`

---

## Current State Summary

Round 1 manual QA (2026-06-09) found 22 findings (F-001 to F-022).
All fixable bugs and seed gaps have been resolved on `fix/local-run` and deployed to Vercel.

**Fixed (20):** F-001 to F-019, F-021
**Open — features not yet built (2):** F-020, F-022 (consultant sub-pages)

---

## Round 2 Results Summary (2026-06-10)

**Confirmed fixed:** F-001, F-002, F-004, F-015, F-017, F-021 (6 items)
**Still failing:** F-007, F-008, F-009, F-010, F-011, F-012, F-013, F-014, F-016, F-018, F-019 (11 items)
**New findings:** NEW-001 (P0), NEW-002 (P1), NEW-003 (P2)

---

## Next Actions — Round 3

Fix the remaining open findings, then re-test.

### P0 — Fix immediately
- **NEW-001**: SA sees governance register data — RLS deny policy missing. Dave to check.

### Still failing — investigate why fix didn't take
These were fixed in code but didn't work in the deployed app. Likely the fix is in `fix/local-run` but the deployment used a different build, OR the fix logic is wrong:
- **F-007**: `useTour` outside `TourProvider` — wrap RTOSettings in TourProvider or make hook safe
- **F-008**: History tab blank page — empty state missing after null guard fix
- **F-009**: ComplyBot blank for CM — route resolves but component renders nothing
- **F-010**: CM PDR still read-only — context role string mismatch suspected
- **F-011/F-012**: CM user management — route or access still broken
- **F-013/F-014/F-016/F-018**: Trainer 404s — route corrections didn't match actual AppRoutes paths
- **F-019**: Consultant landing — `landingRoutes.ts` change didn't apply

### Not in scope for Round 3
- Roles 6, 8, 9, 10 — under construction
- F-020, F-022 — consultant sub-pages not built yet

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
- ✅ Lands on `/superadmin/dashboard` after login — **F-001 confirmed fixed**
- ✅ Left nav shows SuperAdmin sections only (25 SA-only nav items)
- ❌ SA accessing `/dashboard/governance/register` sees Tenant 1 data — **NEW-001 P0**

## 1.2 Platform management
- ✅ `/superadmin/tenants` loads — F-002 confirmed fixed
- ✅ `/superadmin/users` loads
- ✅ `/superadmin/system/audit` loads
- ✅ `/superadmin/system/flags` loads
- ❌ `/superadmin/billing/revenue` → 404 — **NEW-003** (route may not exist)
- ✅ `/superadmin/billing/sales` loads
- ✅ `/superadmin/regulatory-intelligence` loads

## 1.3 Permission guard
- ✅ SA correctly blocked from tenant registers (PDR shows 0 records via RLS)
- ❌ SA NOT blocked from governance register — sees 2 T1 records — **NEW-001 P0**

## 1.4 Tenant isolation enforcement
- ⚠️ Partial — PDR blocked correctly, governance register NOT blocked

## 1.5 QA tracker
- ✅ `/superadmin/qa-testing` loads

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
- ❌ `/settings/rto` → crashes "We hit a loading snag" — **F-007** root cause confirmed: `useTour` hook used outside `TourProvider`

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
- ❌ Governance Meeting → History tab → blank white page (null guard fixed crash but empty state missing) — **F-008**
- ✅ `/admin/user-management` loads
- ❌ `/settings/rto` → crashes — **F-007** (`useTour` outside `TourProvider`)
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
- ❌ `/dashboard/registers/pdr` — no Add button, still read-only for CM — **F-010** not fixed
- ✅ `/dashboard/registers/mcn` loads with write access
- ✅ `/dashboard/registers/audit` loads
- ✅ `/dashboard/governance/register` loads
- ❌ `/complybot` → blank white page (route resolves but component empty) — **F-009** not fixed

## 4.3 Blocked routes (should redirect or deny)
- ❌ `/settings/rto` → crashes — **F-007** not fixed
- ✅ `/admin/user-management/roles` → Access Denied correctly

## 4.4 Limited User Management
- ❌ `/dashboard/user-management` → `/not-found` — **F-011** not fixed (nav corrected but route missing or wrong)
- ❌ `/admin/user-portals` → `/access-denied` — **F-012** not fixed

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
- ❌ `/dashboard/trainer-portal/select-products` → 404 — **F-013** not fixed (nav corrected but route still missing)
- ✅ `/dashboard/trainer-portal/matrix` loads
- ❌ `/dashboard/registers/trainer-availability` → 404 — **F-014** not fixed
- ✅ `/dashboard/trainer-portal/profile` loads, Edit Profile available

## 5.3 Professional Development
- ✅ `/dashboard/trainer-portal/pd` loads with Add PD button
- ✅ `/dashboard/trainer-portal/my-pd-recommendations` loads
- ✅ `/dashboard/trainer-portal/vet-currency` loads
- ✅ `/dashboard/registers/tcr` → No "Log New Entry" button — **F-015 confirmed fixed**

## 5.4 Assessment (read-only enforcement)
- ✅ `/dashboard/assessment-validation` loads
- ✅ No Add/Edit/Delete buttons visible

## 5.5 Resources
- ❌ `/dashboard/document-repository` → 404 — **F-016** not fixed
- ⚠️ `/complybot` not tested for Trainer (removed from nav)

## 5.6 Blocked routes
- ✅ `/dashboard/admin` → Access Denied
- ✅ `/dashboard/governance/meeting-manager` → Access Denied — **F-017 confirmed fixed**
- ✅ `/admin/user-management` → Access Denied
- ❌ `/settings/rto` → crashes — **F-007** not fixed

## 5.7 Advanced trainer routes
- ✅ `/dashboard/trainer-portal/validation` loads
- ✅ `/dashboard/trainer-portal/credentials` loads
- ❌ `/dashboard/trainer-portal/resources-equipment` → 404 — **F-018** not fixed
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
- ❌ Post-login lands on `/dashboard/admin` (Trial RTO context) — **F-019** not fixed
- ✅ `/consultant/dashboard` loads correctly when navigated directly
- ✅ Nav shows correct sections: Dashboard, My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings

## 7.2 Consultant portal
- ⚠️ `/consultant/my-tenants` → Coming soon — **F-020** (not built)
- ✅ `/consultant/tenants-hub`, `/consultant/calendar`, `/consultant/account-settings` load (Coming soon — expected)
- ⚠️ Sub-pages Coming soon — **F-022** (not built)

## 7.3 Client tenant access
- ✅ Can navigate into Tenant 1 context via "Enter Workspace"
- ✅ Can navigate into Tenant 2 context via "Enter Workspace"
- ✅ T1 PDR: 3 records (TAE40122, Assessment Design Masterclass, Industry Currency) — no T2 bleed
- ✅ T2 PDR: 2 records (Standards for RTOs 2025, RTO Governance Fundamentals) — no T1 bleed

## 7.4 Cross-tenant isolation (P0 — must pass)
- ✅ T1 context: only T1 records visible — **F-021 CONFIRMED FIXED**
- ✅ T2 context: only T2 records visible — **Angela's bug resolved**
- ⚠️ Staff member dropdown isolation — not tested this round

## 7.5 Blocked routes
- ✅ `/superadmin/dashboard` → redirected correctly
- ✅ `/superadmin/tenants` → redirected correctly

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
- ⚠️ Not fully tested — Tenant 2 "trialing" banner visible but registers not blocked. Expired subscription test deferred.

## CC-2 — Cross-tenant isolation sweep (P0)
- ✅ PDR register: T1 shows 3 T1 records only, T2 shows 2 T2 records only — no cross-contamination
- ⚠️ CT register and Governance register not tested in consultant context

## CC-3 — SuperAdmin cannot access tenant content
- ✅ `/dashboard/registers/pdr` → loads but 0 records (RLS blocks data correctly)
- ❌ `/dashboard/governance/register` → loads and shows 2 T1 records — **NEW-001 P0**

## CC-4 — Redirect flows
- ✅ Unauthenticated → `/dashboard/*` → redirected to `/login`
- ❌ SA authenticated → `/login` → redirected to `/dashboard/admin` (should go to `/superadmin/dashboard`) — **NEW-002**

## CC-5 — Console error sweep
- ❌ `useTour must be used within a TourProvider` fires on every `/settings/rto` navigation — all roles — **F-007**
- ⚠️ `[AppContext] Safety timeout (12s) — forcing ready state` on login — slow identity resolution, not a red error

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
