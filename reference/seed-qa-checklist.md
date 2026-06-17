# ComplyHub — Seed QA Checklist
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**Last updated:** 2026-06-11
**Status:** Round 6 ready — all P1/P2 items fixed on branch. This is the final sweep.
**Findings log:** `seed-qa-findings.md`
**Branch Vercel URL:** `https://complyhub-rto-git-fix-local-run-complyhub.vercel.app`

---

## Current State Summary

**Round 1 (2026-06-09):** Manual QA found 22 findings (F-001 to F-022)
**Round 2 (2026-06-10):** Automated retest — 6 confirmed fixed, 11 still failing, 3 new findings
**Round 3 (2026-06-10):** Partial manual retest — F-008, F-009 confirmed fixed
**Round 4 (2026-06-10):** Claude Chrome full sweep — 7 more fixed, 8 still failing, 2 new findings, 2 seed gaps
**Round 5 (2026-06-11):** All P1/P2 failures fixed on branch
**Round 6 (pending):** Final comprehensive sweep — functional checks, not just page loads

### Status going into Round 6

| Category | Count | Items |
|---|---|---|
| ✅ **Confirmed fixed** | 25 | F-001–F-010, F-013, F-014, F-015, F-017, F-018, F-019, F-021, NEW-001, NEW-002, NEW-004, NEW-005, SEED-001, SEED-002 |
| ✅ **Closed — by design** | 3 | F-011, F-012, F-016 |
| ⏸️ **Deferred** | 5 | F-020, F-022, Roles 6/8/9/10 |
| ⏸️ **Awaiting RJ** | 1 | NEW-003 — SA billing revenue route |
| ⚠️ **Prod migration pending** | 1 | NEW-004 — `sso_reports_register` must be applied to prod before merge |

---

## Round 5 Fix Summary

> Full root causes and commits: `seed-qa-findings.md`

| Item | Fix |
|---|---|
| NEW-002 | `RoleLandingRedirect` checks `isSuperAdmin` before tenant mode — `3c04589ea`, `1b91bd316` |
| NEW-005 | `/settings/rto` wrapped in `<AdminRoute>`; removed from CM nav and permissions — `1b91bd316` |
| F-013 | "Assigned Training Products" added to `roleMenuConfigs.ts` — `48e283a84` |
| F-014 | "Availability" added to `roleMenuConfigs.ts` — `48e283a84` |
| F-018 | "FRE Register" added to `roleMenuConfigs.ts` — `48e283a84` |
| NEW-004 | `sso_reports_register` table created on branch DB; query restored — `acbdc62bf` |
| SEED-001 | `dd_org_internal_roles` seeded (6 rows) — `bd22281cc` |
| SEED-002 | `gov_dd_status` seeded (6 rows) — `bd22281cc` |

---

## How to use this document

Each section is one role. Work top to bottom. Log in fresh for each role — do not carry session state between roles.

Mark each item: ✅ pass / ❌ fail / ⚠️ partial

For every failure record:
```
Role: [role name]
Route: [exact URL]
Expected: [what should happen]
Actual: [what happened]
Console: [paste any errors]
Severity: P0 / P1 / P2
```

**P0** = cross-tenant data leak or auth bypass — stop immediately, escalate to RJ
**P1** = wrong role sees wrong data, guard not firing, feature broken
**P2** = cosmetic, wrong label, missing element

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

**Tenant 1:** seed-rto — subscription active (paid_invoice)
**Tenant 2:** trial-rto — subscription trialing (trial_active)

---

## PRE-FLIGHT — Run before any role testing

These confirm the seed data is in place. If any fail, stop and report before testing roles.

- [ ] `dd_org_internal_roles` view returns exactly 5 rows: CEO/MD, RTO Manager, Compliance Manager, Trainer/Assessor, Administration Officer (Student Support Officer is intentionally excluded — view filters `authority_level > 1`)
- [ ] `gov_dd_status` has exactly 6 rows: Pending Review, Under Review, Approved, Rejected, Withdrawn, Archived
- [ ] `tenant_members` for Tenant 1 has 10 users, all with non-null `full_name` values
- [ ] `sso_reports_register` table exists in the schema
- [ ] Tenant 1 has at least 3 PDR records, Tenant 2 has exactly 2 PDR records

---

## Cross-cutting rules (apply to EVERY role, EVERY page)

Before marking any item ✅:
- [ ] **Console clean** — no red errors on page load. Yellow warnings are acceptable. `sso_reports_register` warning must NOT appear.
- [ ] **No cross-tenant data** — while in Tenant 1, no Tenant 2 records appear anywhere
- [ ] **Correct landing** — fresh login must land on the correct dashboard for that role without manual navigation
- [ ] **Page content loads** — no spinner stuck, no "We hit a loading snag", no blank white page

---

---

# ROLE 1 — Super Admin
**Login:** `superadmin@complyhub.ai`
**Expected landing:** `/superadmin/dashboard`

## 1.1 Landing & navigation
- [ ] Fresh login → address bar shows `/superadmin/dashboard` immediately. No `/dashboard/admin` at any point — **NEW-002 fix verify**
- [ ] Console clean on landing page
- [ ] Left nav shows SuperAdmin sections only — no tenant registers or governance sections visible
- [ ] Top-right shows "Sam SuperAdmin / super_admin"

## 1.2 Platform management — page loads + basic content
- [ ] `/superadmin/tenants` loads — list shows at least 2 tenants: "Seed RTO Pty Ltd" and "Trial RTO Pty Ltd"
- [ ] `/superadmin/users` loads — seed users visible
- [ ] `/superadmin/system/audit` loads
- [ ] `/superadmin/system/flags` loads
- [ ] `/superadmin/billing/sales` loads — console clean
- [ ] `/superadmin/billing/revenue` — **NEW-003**: report actual result (404, loads, or different path). Do not guess — record exactly what happens
- [ ] `/superadmin/regulatory-intelligence` loads

## 1.3 Tenant isolation — SA must see zero tenant data
- [ ] Navigate to `/dashboard/registers/pdr` — page must show 0 records (RLS blocks SA from tenant data)
- [ ] Navigate to `/dashboard/governance/register` — 0 records returned (NEW-001 verify)
- [ ] Console clean on both — no unexpected query errors

## 1.4 QA tracker
- [ ] `/superadmin/qa-testing` loads

---

---

# ROLE 2 — Administrator
**Login:** `admin@complyhub-seed.com`
**Expected landing:** `/dashboard/admin`

## 2.1 Landing & navigation
- [ ] Fresh login → lands on Admin Dashboard (Seed RTO Pty Ltd / Administrator)
- [ ] Console clean on landing page
- [ ] All 9 nav sections visible: Dashboard, Training & Assessment, Students & Support, VET Workforce, Governance & Risk, Documents & Compliance, AI & Automation, User Management, Settings

## 2.2 Training & Assessment
- [ ] `/dashboard/tas-engine` loads — console clean
- [ ] `/dashboard/assessment-validation` loads
- [ ] `/admin/trainer-matrix-engine` loads
- [ ] `/dashboard/registers/ct` loads — console clean, records visible (Tenant 1 only)
- [ ] `/dashboard/registers/rpl` loads
- [ ] `/dashboard/registers/fre` loads

### CT register — "+ Log New Entry" form (SEED-001, SEED-002, F-004 final verify)
- [ ] Click "+ Log New Entry" → form opens
- [ ] "Risk Level" dropdown shows options (F-004 fix verify)
- [ ] "Responsible Role" dropdown shows exactly 5 options: CEO / Managing Director, RTO Manager, Compliance Manager, Trainer/Assessor, Administration Officer — **SEED-001 verify** (Student Support Officer excluded by view design — authority_level > 1 filter)
- [ ] "Status" dropdown shows exactly 6 options: Pending Review, Under Review, Approved, Rejected, Withdrawn, Archived — **SEED-002 verify**
- [ ] "Responsible Person" dropdown shows real names, not "Unknown" — e.g. "Adam Admin", "Terry Trainer" — **F-005 verify**
- [ ] Fill all required fields → click Save → record appears in list with correct data

## 2.3 Students & Support
- [ ] `/dashboard/students-support/dashboard` loads
- [ ] `/dashboard/students-support/suitability` loads
- [ ] `/dashboard/students-support/support` loads
- [ ] `/dashboard/students-support/adjustments` loads
- [ ] `/dashboard/students-support/at-risk` loads
- [ ] `/dashboard/students-support/wellbeing` loads
- [ ] `/dashboard/students-support/placement-wellbeing` loads
- [ ] `/dashboard/students-support/diversity` loads
- [ ] `/dashboard/students-support/complaints-appeals` loads
- [ ] `/admin/surveys` loads

### SSR Add form — person picker verify
- [ ] Click "+ Add Record" (or equivalent) → form opens
- [ ] "Responsible Person" dropdown shows real names (e.g. "Adam Admin"), not "Unknown" — **F-005 verify**
- [ ] Form saves → record appears in list

## 2.4 VET Workforce
- [ ] `/dashboard/registers/pdr` loads — shows exactly 3 records (Tenant 1 only): TAE40122, Assessment Design Masterclass, Industry Currency — no Tenant 2 records
- [ ] `/dashboard/registers/tcr` loads
- [ ] `/dashboard/trainers` loads
- [ ] `/dashboard/registers/staff-turnover` loads
- [ ] `/dashboard/registers/trainer-availability` loads
- [ ] Add a new PDR record → saves with correct tenant_id, appears in list

## 2.5 Governance & Risk
- [ ] `/dashboard/governance/meeting-manager` loads — console clean, **no** `sso_reports_register` warning — **NEW-004 verify**
- [ ] Governance Meeting card visible — "Governance Meeting – 06 Jul 2026"
- [ ] Meeting Readiness score visible — not blank
- [ ] "Trainer Reports" metric is visible in Meeting Readiness section
- [ ] SSO Officer Report section renders in the meeting (not blank/errored)
- [ ] `/dashboard/governance/register` loads
- [ ] `/dashboard/registers/adc` loads
- [ ] `/dashboard/registers/mcn` loads
- [ ] `/dashboard/registers/fpp` loads
- [ ] `/dashboard/registers/pfp` loads
- [ ] `/dashboard/registers/pli` loads
- [ ] `/dashboard/registers/qi` loads
- [ ] `/dashboard/registers/audit` loads
- [ ] `/dashboard/regulatory-intelligence` loads
- [ ] `/dashboard/registers/whs` loads
- [ ] `/dashboard/registers/thp` loads

## 2.6 Documents & Compliance
- [ ] `/documents-register` loads
- [ ] `/document-repository` loads
- [ ] `/dashboard/registers/mktg` loads
- [ ] `/dashboard/suggestions-triage` loads

## 2.7 AI & Automation
- [ ] `/complybot` loads — chat interface visible, not blank
- [ ] `/dashboard/assessors/insights` loads

## 2.8 User Management
- [ ] `/admin/user-management` loads — all 10 seed users for Tenant 1 visible with real names
- [ ] `/admin/user-management/roles` loads
- [ ] `/admin/user-portals` loads
- [ ] `/admin/credential-risk` loads
- [ ] `/admin/impersonate` loads

## 2.9 Settings
- [ ] `/settings/rto` loads — console clean, no crash — **F-007 final verify**
- [ ] Settings tabs visible: Organisation Info, Branding, Team Management, etc.

## 2.10 Cross-tenant isolation (P0)
- [ ] PDR register — exactly 3 records shown, zero Tenant 2 records
- [ ] CT register — zero records (no CT data seeded — this is correct)
- [ ] Governance register — records shown are Tenant 1 only

---

---

# ROLE 3 — Governing Person
**Login:** `governing@complyhub-seed.com`
**Expected landing:** `/dashboard/executive`

## 3.1 Landing & navigation
- [ ] Fresh login → lands on `/dashboard/executive` (Governing Person dashboard)
- [ ] Console clean on landing page
- [ ] Top-left shows "Seed RTO Pty Ltd / Governing Person"
- [ ] All expected nav sections visible (Governance & Risk section present)
- [ ] No Add/Edit/Delete buttons for registers — read-only role

## 3.2 Governance Meeting Manager — full functional check
- [ ] `/dashboard/governance/meeting-manager` loads — console clean
- [ ] **No** `sso_reports_register` warning in console — **NEW-004 verify**
- [ ] Governance Meeting card visible — "Governance Meeting – 06 Jul 2026"
- [ ] Meeting Readiness score visible (e.g. 80/100)
- [ ] "Actions Closed" and "Trainer Reports" metrics both show values (not blank)
- [ ] SSO Officer Report section renders in Agenda & Registers tab (not blank/error)
- [ ] History tab → at least 3 past meetings visible with status badges — **F-008 verify**
- [ ] Console clean throughout all tabs

## 3.3 Register access (read-only)
- [ ] `/dashboard/registers/pdr` loads — 3 records visible, **no Add button** (read-only by design)
- [ ] `/dashboard/governance/register` loads — records visible, no write access
- [ ] `/admin/user-management` loads
- [ ] `/dashboard/tas-engine` loads
- [ ] `/dashboard/assessment-validation` loads — sub-tabs render, no data expected

## 3.4 Settings access
- [ ] `/settings/rto` loads — console clean — **F-007 verify**

## 3.5 CEO Governance Portal
- [ ] CEO Governance Portal nav item → shows "rolling out progressively" gate — expected, feature not yet released

---

---

# ROLE 4 — Compliance Manager
**Login:** `compliance@complyhub-seed.com`
**Expected landing:** `/dashboard/compliance`

## 4.1 Landing & navigation
- [ ] Fresh login → lands on `/dashboard/compliance`
- [ ] Console clean on landing page
- [ ] User Management and Settings sections absent from left nav
- [ ] "RTO Settings" link does NOT appear in header dropdown menu — **NEW-005 verify**

## 4.2 Accessible features
- [ ] `/dashboard/tas-engine` loads — console clean
- [ ] `/dashboard/assessment-validation` loads
- [ ] `/dashboard/registers/pdr` loads — **Add button IS present** (F-010 verify) — click it, confirm form opens
- [ ] `/dashboard/registers/mcn` loads — write access confirmed (Add button present)
- [ ] `/dashboard/registers/audit` loads
- [ ] `/dashboard/governance/register` loads — console clean
- [ ] `/complybot` loads — chat interface visible — **F-009 verify**
- [ ] `/dashboard/trainer-portal/cm-delivery-overview` loads (CM-specific trainer view)

## 4.3 Blocked routes — must redirect or deny
- [ ] Navigate directly to `/settings/rto` → redirected to `/access-denied`, page content does NOT render — **NEW-005 verify**
- [ ] `/admin/user-management/roles` → Access Denied
- [ ] `/admin/user-portals` → Access Denied
- [ ] `/superadmin/dashboard` → redirected (not 404)

## 4.4 Console clean sweep
- [ ] No console errors on `/dashboard/compliance` landing
- [ ] No console errors on `/dashboard/governance/register`
- [ ] No console errors on `/complybot`

---

---

# ROLE 5 — Trainer / Assessor
**Login:** `trainer@complyhub-seed.com`
**Expected landing:** `/dashboard/trainer-portal/dashboard`

## 5.1 Landing & navigation
- [ ] Fresh login → lands on `/dashboard/trainer-portal/dashboard`
- [ ] Console clean on landing page
- [ ] Trainer-specific nav visible (Quick Actions, My Profile, My Training, Industry Currency, Support)
- [ ] No Governance, Students & Support, or Settings sections in nav
- [ ] No Admin Dashboard nav items visible

## 5.2 My Training section — nav item verification
> All 7 items below must be present in the "My Training" nav section. Click each one.
> Note: "FRE Register" and "Resources & Equipment" are the same page — only one nav item exists.
- [ ] "My TAS Assignments" → `/dashboard/trainer-portal/tas` loads
- [ ] "Assessment Validation" → loads
- [ ] "Session Plans" → `/dashboard/trainer-portal/session-plans` loads
- [ ] "Assessment Decisions" → `/dashboard/trainer-portal/assessment-decisions` loads
- [ ] "Assigned Training Products" → `/dashboard/trainer-portal/select-products` loads — **F-013 verify**
- [ ] "Availability" → `/dashboard/registers/trainer-availability` loads — **F-014 verify**
- [ ] "FRE Register" → `/dashboard/trainer-portal/resources-equipment` loads (page heading: "Resources & Equipment") — **F-018 verify**

## 5.3 My Profile section
- [ ] "My Profile & Credentials" → `/dashboard/trainer-portal/profile` loads, Edit Profile available
- [ ] "Professional Development" → `/dashboard/trainer-portal/pd` loads with Add PD button

## 5.4 Professional Development
- [ ] `/dashboard/trainer-portal/my-pd-recommendations` loads
- [ ] `/dashboard/trainer-portal/vet-currency` loads
- [ ] `/dashboard/registers/tcr` loads — **no** "Log New Entry" button visible (read-only for trainer) — **F-015 verify**

## 5.5 Assessment (read-only enforcement)
- [ ] `/dashboard/assessment-validation` loads
- [ ] No Add/Edit/Delete buttons visible on this page

## 5.6 Resources
- [ ] `/dashboard/documents/trainers` loads — documents list visible
- [ ] `/dashboard/trainer-portal/validation` loads
- [ ] `/dashboard/trainer-portal/credentials` loads

## 5.7 Blocked routes — must deny or redirect
- [ ] `/dashboard/admin` → Access Denied
- [ ] `/dashboard/governance/meeting-manager` → Access Denied — **F-017 verify**
- [ ] `/admin/user-management` → Access Denied
- [ ] `/settings/rto` → Access Denied or redirect

## 5.8 Console clean sweep
- [ ] Console clean on trainer portal dashboard
- [ ] Console clean on `/dashboard/trainer-portal/select-products`
- [ ] Console clean on `/dashboard/registers/trainer-availability`
- [ ] Console clean on `/dashboard/trainer-portal/resources-equipment`

---

---

# ROLE 6 — Student Support Officer (SSO)
**Login:** `sso@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — skip detailed testing. Verify the landing doesn't crash and console is clean, then defer.**

## 6.1 Basic smoke test only
- [ ] Fresh login → page loads (does not crash or show error screen)
- [ ] Console clean on landing page
- [ ] Record result — what landing page does SSO land on?

---

---

# ROLE 7 — Consultant (Cross-Tenant)
**Login:** `consultant@complyhub-seed.com`
**Expected landing:** `/consultant/dashboard`
**Tenant memberships:** Tenant 1 (seed-rto) + Tenant 2 (trial-rto)

## 7.1 Landing & navigation
- [ ] Fresh login → lands on `/consultant/dashboard` — **F-019 verify** (no `/dashboard/admin` detour)
- [ ] Console clean on landing
- [ ] Nav shows: Dashboard, My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings
- [ ] Client portfolio shows at least 1 engagement (Seed RTO Pty Ltd)

## 7.2 Consultant portal
- [ ] `/consultant/my-tenants` → Coming soon (expected — F-020 deferred)
- [ ] `/consultant/tenants-hub` → Coming soon (expected)

## 7.3 Tenant 1 context — enter and verify
- [ ] Click "Enter Workspace" for Seed RTO Pty Ltd → enters Tenant 1 context
- [ ] `/dashboard/registers/pdr` in T1 context → exactly 3 records: TAE40122, Assessment Design Masterclass, Industry Currency
- [ ] `/dashboard/registers/ct` in T1 context → 0 records (correct — no CT data seeded for T1)
- [ ] Console clean in T1 context

## 7.4 Tenant 2 context — enter and verify (P0)
- [ ] Navigate back to consultant dashboard → click "Enter Workspace" for Trial RTO Pty Ltd
- [ ] `/dashboard/registers/pdr` in T2 context → exactly 2 records: Standards for RTOs 2025, RTO Governance Fundamentals — **zero T1 records**
- [ ] PDR record details show T2 tenant_id only — no T1 data bleed
- [ ] Console clean in T2 context

## 7.5 Cross-tenant isolation (P0 — must pass)
- [ ] In T1 context: PDR shows 3 records, zero T2 records
- [ ] In T2 context: PDR shows 2 records, zero T1 records
- [ ] Switch back to T1 — T2 records do not appear
- [ ] Staff/person dropdowns in either context show only that tenant's members

## 7.6 Blocked routes
- [ ] `/superadmin/dashboard` → redirected (not shown)
- [ ] `/superadmin/tenants` → redirected

---

---

# ROLE 8 — Regulatory Officer
**Login:** `regulatory@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — smoke test only.**

## 8.1 Basic smoke test
- [ ] Fresh login → page loads without crash
- [ ] Console clean on landing
- [ ] Record landing page URL

---

---

# ROLE 9 — Employer
**Login:** `employer@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — smoke test only.**

## 9.1 Basic smoke test
- [ ] Fresh login → page loads without crash
- [ ] Console clean on landing
- [ ] Record landing page URL

---

---

# ROLE 10 — Third Party
**Login:** `thirdparty@complyhub-seed.com`
> ⚠️ **UNDER CONSTRUCTION — smoke test only.**

## 10.1 Basic smoke test
- [ ] Fresh login → page loads without crash
- [ ] Console clean on landing
- [ ] Record landing page URL

---

---

# Cross-Cutting Scenarios (run after all roles)

## CC-1 — Billing gate
- [ ] Tenant 1 (admin login) — no "Trial expired" banner — subscription is active
- [ ] Tenant 2 (consultant in T2 context) — "trialing" state visible but registers not blocked
- [ ] Expired subscription behaviour — deferred

## CC-2 — Cross-tenant isolation sweep (P0)
- [ ] PDR: T1 = 3 records, T2 = 2 records — no bleed either direction (tested in Role 2 and Role 7)
- [ ] CT register: T1 admin sees 0 records (correct), T2 consultant sees 0 records (correct)
- [ ] Governance register: T1 admin sees T1 records only

## CC-3 — SuperAdmin can only access tenant content they are a member of
- [ ] SA → `/dashboard/registers/pdr` → shows only records for tenants SA is a member of. In seed: 3 T1 records (TAE40122, Assessment Design Masterclass, Industry Currency) — **NEW-014 verify**. Zero T2 records (SA has no T2 membership).
- [ ] SA → `/dashboard/governance/register` → 0 records (no governance data seeded — correct) — **NEW-001 verify**
- [ ] Console clean on both — no RLS error messages

## CC-4 — Redirect flows
- [ ] Unauthenticated → `/dashboard/admin` → redirected to `/login`
- [ ] SA fresh login → `/superadmin/dashboard` (no tenant landing) — **NEW-002 verify**
- [ ] CM direct nav to `/settings/rto` → `/access-denied` — **NEW-005 verify**
- [ ] Trainer direct nav to `/dashboard/admin` → Access Denied — **F-017 verify**

## CC-5 — Console error sweep
- [ ] Landing page of every role tested → console shows no red errors
- [ ] `/dashboard/governance/meeting-manager` (Governing Person) → no `sso_reports_register` warning — **NEW-004 verify**
- [ ] `/settings/rto` (Admin) → no `useTour` error — **F-007 verify**
- [ ] `[AppContext] Safety timeout (12s)` — if it appears, note it but it is not a blocking error

## CC-6 — Person picker and dropdown integrity
- [ ] CT register "Responsible Role" dropdown (Admin) → 5 options with correct labels (Student Support Officer excluded by design — authority_level > 1) — **SEED-001 verify**
- [ ] CT register "Status" dropdown (Admin) → 6 options with correct labels — **SEED-002 verify**
- [ ] Any form with "Responsible Person" picker → shows real names (e.g. "Adam Admin"), not "Unknown" — **F-005 verify**

---

---

## How to log failures

```
Role: [role name]
Route: [exact URL]
Expected: [what should happen]
Actual: [what happened]
Console: [paste any errors]
Severity: P0 / P1 / P2
```

---

## Playwright conversion notes (for future)

Each item with a route maps to one Playwright `test()` block:
- `beforeEach`: log in as the role, navigate to route
- `expect`: page loads / element visible / redirect occurred / button absent
- `afterEach`: log out

### Priority order for automation
1. **P0 checks** — CC-2 (cross-tenant isolation), CC-3 (SA isolation)
2. **Auth and redirect flows** — CC-4 (all redirect checks)
3. **Console clean** — CC-5 (no errors on role landings)
4. **Seed data integrity** — CC-6 (dropdowns, person pickers)
5. **Role-specific write access** — Role 2 CT form, Role 4 PDR Add
6. **Nav completeness** — Role 5 trainer nav items (all 8 present)

### Deferred from automation
- Roles 6, 8, 9, 10 — skip until portals are built
- F-020, F-022 — skip until consultant features are built
