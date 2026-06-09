# ComplyHub — Seed QA Checklist
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**Last updated:** 2026-06-09
**Status:** In progress — QA run active (Brian/Khian)
**Findings log:** `seed-qa-findings.md`

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
- [ ] `/dashboard/students-support/dashboard` loads (Students & Support dashboard)
- [ ] `/dashboard/students-support/suitability` loads (Suitability & LLND)
- [ ] `/dashboard/students-support/support` loads (Student Support) — **this is the add record page**
- [ ] `/dashboard/students-support/adjustments` loads (Adjustments)
- [ ] `/dashboard/students-support/at-risk` loads (At-Risk)
- [ ] `/dashboard/students-support/wellbeing` loads (Wellbeing & Safety)
- [ ] `/dashboard/students-support/placement-wellbeing` loads (Placement Wellbeing)
- [ ] `/dashboard/students-support/diversity` loads (Diversity & Inclusion)
- [ ] `/dashboard/students-support/complaints-appeals` loads (Complaints & Appeals)
- [ ] `/admin/surveys` loads (Surveys)
- [ ] On `/dashboard/students-support/support` → add a new student support record → saves and appears in the list

## 2.4 VET Workforce
- [ ] `/dashboard/registers/pdr` loads — shows only Tenant 1 PD records
- [ ] `/dashboard/registers/tcr` loads
- [ ] `/dashboard/trainers` loads
- [ ] `/dashboard/registers/staff-turnover` loads
- [ ] `/dashboard/registers/trainer-availability` loads
- [ ] Add a new PDR record → saves with correct tenant_id

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
> ⚠️ Routes updated from live nav 2026-06-09
- [ ] `/documents-register` loads
- [ ] `/document-repository` loads
- [ ] `/dashboard/registers/mktg` loads (Marketing register)
- [ ] `/dashboard/suggestions-triage` loads (Suggestions Triage)
- [ ] Upload a document → appears in register

## 2.7 AI & Automation
- [ ] `/complybot` loads and responds
- [ ] `/dashboard/assessors/insights` loads

## 2.8 User Management
> ⚠️ Routes updated from live nav 2026-06-09
- [ ] `/admin/user-management` loads — all seed users for Tenant 1 visible
- [ ] `/admin/user-management/roles` loads — role editing available
- [ ] `/admin/user-portals` loads
- [ ] `/admin/credential-risk` loads
- [ ] `/admin/impersonate` loads

## 2.9 Settings
> ⚠️ Settings is NOT in the sidebar nav — access via clicking the org name or gear icon in the top bar/sidebar, or navigate directly by URL
- [ ] `/settings` loads (try navigating directly by URL)
- [ ] `/settings/rto` loads — RTO details editable
- [ ] `/settings/preferences` loads

## 2.10 Cross-tenant isolation
- ✅ PDR register shows NO Tenant 2 records — confirmed via DB check: 3 T1 records visible, 2 T2 records correctly hidden
- ✅ CT register shows NO Tenant 2 records — 0 records displayed (no CT data seeded for either tenant, correct)

---

---

# ROLE 3 — Governing Person
**Login:** `governing@complyhub-seed.com`
**Expected landing:** Same as Administrator (identical access)

## 3.1 Landing & navigation
- [ ] Lands on admin dashboard (same as Administrator)
- [ ] All 9 nav sections visible (same as Administrator)

## 3.2 Full access parity with Administrator
- [ ] `/dashboard/registers/pdr` loads with write access (can add a record)
- [ ] `/dashboard/governance/meeting-manager` loads with write access
- [ ] `/admin/user-management` loads
- [ ] `/settings/rto` loads and is editable
- [ ] `/dashboard/tas-engine` loads

## 3.3 Governance-specific
- [ ] Can create a governance meeting
- [ ] Can view validation details

---

---

# ROLE 4 — Compliance Manager
**Login:** `compliance@complyhub-seed.com`
**Expected landing:** Main dashboard (not admin dashboard)

## 4.1 Landing & navigation
- [ ] Lands on compliance dashboard after login
- [ ] Nav shows 7 sections — User Management and Settings sections are absent

## 4.2 Accessible features (should work)
- [ ] `/dashboard/tas-engine` loads
- [ ] `/dashboard/assessment-validation` loads
- [ ] `/dashboard/registers/pdr` loads with write access
- [ ] `/dashboard/registers/mcn` loads
- [ ] `/dashboard/registers/audit` loads
- [ ] `/dashboard/governance/register` loads
- [ ] `/complybot` loads

## 4.3 Blocked routes (should redirect or deny)
- [ ] `/settings/rto` → denied / redirected (cannot edit RTO settings)
- [ ] `/settings` → denied / redirected (organisation settings blocked)
- [ ] `/admin/user-management/roles` → denied (role editing blocked)

## 4.4 Limited User Management
- [ ] `/settings/users-management` loads (user list only, no role editing)
- [ ] `/admin/user-portals` loads (portal overview only)

---

---

# ROLE 5 — Trainer / Assessor
**Login:** `trainer@complyhub-seed.com`
**Expected landing:** `/dashboard/trainer`

## 5.1 Landing & navigation
- [ ] Lands on trainer portal dashboard after login
- [ ] Nav shows 4 sections: Dashboard, Training & Assessment, Professional Development, Resources
- [ ] Admin nav sections (Governance, Students, Settings) are not visible

## 5.2 Training portal
- [ ] `/trainer-portal/products` loads — assigned products visible
- [ ] `/trainer-portal/matrix` loads
- [ ] `/trainer-portal/availability` loads — can update availability
- [ ] `/trainer-portal/profile` loads — can edit own profile

## 5.3 Professional Development
- [ ] `/trainer-portal/pd` loads — own PD records only
- [ ] Add a PD record from trainer portal → saves with correct trainer_id and tenant_id
- [ ] `/trainer-portal/my-pd-recommendations` loads
- [ ] `/trainer-portal/vet-currency` loads
- [ ] `/dashboard/registers/tcr` loads in read-only mode (cannot add records)

## 5.4 Assessment (read-only enforcement)
- [ ] `/dashboard/assessment-validation` loads
- [ ] UI controls (add, edit, delete buttons) are disabled or absent
- [ ] Attempting POST via API returns 403 (RLS blocks write)

## 5.5 Resources
- [ ] `/document-repository` loads — read-only, no upload button
- [ ] `/complybot` loads and responds

## 5.6 Blocked routes (should redirect with toast)
- [ ] `/dashboard/admin` → redirected to `/dashboard` with toast
- [ ] `/dashboard/governance/meeting-manager` → redirected
- [ ] `/admin/user-management` → redirected
- [ ] `/settings/rto` → redirected

## 5.7 Advanced trainer routes
- [ ] `/trainer-portal/validation` loads
- [ ] `/trainer-portal/credentials` loads
- [ ] `/trainer-portal/fre-register` loads
- [ ] `/trainer-portal/session-plans` loads

---

---

# ROLE 6 — Student Support Officer (SSO)
**Login:** `sso@complyhub-seed.com`
**Expected landing:** `/student-support` or SSO dashboard

## 6.1 Landing & navigation
- [ ] Lands on SSO workspace after login
- [ ] Nav shows 3 sections: Workspace, Registers, Reports

## 6.2 SSO workspace
- [ ] `/dashboard/sso/work-queue` loads
- [ ] `/dashboard/sso/students` loads
- [ ] `/dashboard/sso/at-risk` loads
- [ ] `/dashboard/sso/interventions` loads

## 6.3 Registers
> ⚠️ URLs corrected to match live app routes (verified by admin user 2026-06-09)
- [ ] `/dashboard/students-support/support` loads with write access — can add a student support record
- [ ] `/dashboard/students-support/complaints-appeals` loads with write access
- [ ] `/dashboard/students-support/at-risk` loads
- [ ] `/dashboard/students-support/adjustments` loads
- [ ] `/dashboard/students-support/wellbeing` loads

## 6.4 Reports
- [ ] `/dashboard/sso/monthly-pack` loads
- [ ] `/dashboard/sso/packs-history` loads

## 6.5 Documents (read-only)
- [ ] `/document-repository` loads — read-only, no upload button

## 6.6 Blocked routes
- [ ] `/dashboard/admin` → redirected
- [ ] `/dashboard/registers/pdr` → check: SSO should not have write access here
- [ ] `/admin/user-management` → redirected
- [ ] `/settings/rto` → redirected

---

---

# ROLE 7 — Consultant (Cross-Tenant)
**Login:** `consultant@complyhub-seed.com`
**Tenant memberships:** Tenant 1 (seed-rto) + Tenant 2 (trial-rto)
**Expected landing:** `/consultant/dashboard`

## 7.1 Landing & navigation
- [ ] Lands on `/consultant/dashboard` after login
- [ ] Nav shows consultant sections: Dashboard, My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings
- [ ] Does NOT land on any tenant dashboard directly

## 7.2 Consultant portal
- [ ] `/consultant/my-tenants` loads — both Tenant 1 and Tenant 2 listed
- [ ] `/consultant/tenants-hub` loads
- [ ] `/consultant/calendar` loads
- [ ] `/consultant/account-settings` loads

## 7.3 Client tenant access
- [ ] Can navigate into Tenant 1 context from the consultant portal
- [ ] Once in Tenant 1 context: admin-level features load (AdminRoute allows consultant via impersonation)
- [ ] Tenant 1 PDR register shows ONLY Tenant 1 records
- [ ] Can navigate into Tenant 2 context
- [ ] Tenant 2 PDR register shows ONLY Tenant 2 records — ZERO records from Tenant 1 bleed across

## 7.4 Cross-tenant isolation (P0 — must pass)
- [ ] While in Tenant 1 context: no Tenant 2 records visible in any register
- [ ] While in Tenant 2 context: no Tenant 1 records visible in any register
- [ ] Staff member dropdown in PDR form shows ONLY the current tenant's staff
- [ ] This is the bug Angela reported — verify it is resolved after RJ's fix

## 7.5 Blocked routes
- [ ] `/superadmin/dashboard` → redirected to `/consultant/dashboard` (no super_admin access)
- [ ] `/superadmin/tenants` → redirected

---

---

# ROLE 8 — Regulatory Officer
**Login:** `regulatory@complyhub-seed.com`
**Expected landing:** `/dashboard/auditor`

## 8.1 Landing & navigation
- [ ] Lands on auditor dashboard after login
- [ ] Nav shows 6 read-only sections: Dashboard, Training, Workforce, Students, Governance, Documents
- [ ] All nav items labelled or indicated as read-only

## 8.2 Read-only enforcement (check on each register)
- [ ] `/dashboard/tas-engine` loads — add/edit buttons absent or disabled
- [ ] `/dashboard/assessment-validation` loads — read-only
- [ ] `/admin/trainer-matrix-engine` loads — read-only
- [ ] `/dashboard/registers/fre` loads — no add button
- [ ] `/dashboard/registers/tcr` loads — no add button
- [ ] `/dashboard/registers/ssr` loads — no add button
- [ ] `/dashboard/registers/caa` loads — no add button
- [ ] `/dashboard/governance/register` loads — no add button
- [ ] `/dashboard/governance/meeting-manager` loads — no add button
- [ ] `/dashboard/registers/audit` loads — no add button
- [ ] `/dashboard/registers/whs` loads — no add button
- [ ] `/documents-register` loads — no upload button

## 8.3 Blocked routes (should deny)
- [ ] `/settings/rto` → denied/redirected
- [ ] `/settings/*` → denied/redirected
- [ ] `/admin/user-management` → denied/redirected
- [ ] `/superadmin/*` → denied/redirected
- [ ] `/dashboard/registers/pdr` → check if visible; if so, must be read-only

## 8.4 API write block (RLS enforcement)
- [ ] Attempting to POST/PATCH a register record via Supabase (e.g. from browser console) returns 403 — RLS denies writes

---

---

# ROLE 9 — Employer (Placeholder)
**Login:** `employer@complyhub-seed.com`
**Expected landing:** `/employer/dashboard`

## 9.1 Placeholder portal
- [ ] Lands on employer dashboard
- [ ] Dashboard loads without error
- [ ] `/employer/trainees` loads (placeholder UI)
- [ ] `/employer/assessments` loads (placeholder UI)
- [ ] No write actions available

## 9.2 Blocked routes
- [ ] `/dashboard/admin` → redirected
- [ ] `/dashboard/registers/pdr` → redirected

---

---

# ROLE 10 — Third Party (Placeholder)
**Login:** `thirdparty@complyhub-seed.com`
**Expected landing:** `/third-party/dashboard`

## 10.1 Placeholder portal
- [ ] Lands on third-party dashboard
- [ ] Dashboard loads without error
- [ ] `/third-party/agreements` loads (placeholder UI)
- [ ] `/third-party/reports` loads (placeholder UI)
- [ ] No write actions available

## 10.2 Blocked routes
- [ ] `/dashboard/admin` → redirected
- [ ] `/dashboard/registers/pdr` → redirected

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
