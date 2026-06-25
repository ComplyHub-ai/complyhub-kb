# Role Map — External Roles (Governing Person, Consultant, Regulatory Officer)

**Generated:** 05 June 2026  
**Source files:** `src/config/roleNavigation.ts`, `src/lib/rbac.ts`, `src/pages/dashboard/AuditorDashboard.tsx`, `src/pages/dashboard/CeoGovernancePortal.tsx`, `src/pages/consultant/*`, `src/hooks/useCeoGovernanceData.ts`, `src/hooks/useConsultantClients.ts`, `src/guards/ConsultantGuard.tsx`, `src/AppRoutes.tsx`  
**Note:** `docs/QA_PROTOCOL.md` does not exist. Edge function categories are derived from the `supabase/functions/` directory listing and function source inspection.

---

## Per-role routes & access

### Governing Person

Nav config (`GOVERNING_PERSON_NAV`) is **identical to `ADMIN_NAV`** — all 9 sections are shared verbatim.

**Section: Dashboard**
| Route | Label |
|---|---|
| `/dashboard/admin` | Admin Dashboard |
| `/calendar` | Calendar |
| `/dashboard/tasks` | Tasks |

**Section: Training & Assessment**
| Route | Label |
|---|---|
| `/dashboard/tas-engine` | TAS Quality Engine |
| `/dashboard/assessment-validation` | Assessment Validation |
| `/admin/trainer-matrix-engine` | Trainers Matrix |
| `/dashboard/registers/ct` | Credit Transfer |
| `/dashboard/registers/rpl` | Recognition of Prior Learning |
| `/dashboard/registers/ien` | Industry Engagement |
| `/dashboard/registers/fre` | Facilities, Resources & Equipment |

**Section: Students & Support**
| Route | Label |
|---|---|
| `/dashboard/registers/ssr` | Student Support Register |
| `/student-support/reports/wellbeing` | Wellbeing & Safety |
| `/student-support/reports/reasonable-adjustment` | Reasonable Adjustments |
| `/student-support/reports/at-risk` | At-Risk Interventions |
| `/student-support/reports/edi` | Equity & Inclusion |
| `/student-support/reports/placement` | Placement Wellbeing |
| `/dashboard/registers/caa` | Complaints & Appeals |

**Section: VET Workforce**
| Route | Label |
|---|---|
| `/dashboard/registers/tcr` | Trainer Credentials |
| `/dashboard/registers/pdr` | Professional Development |
| `/dashboard/registers/staff-turnover` | Staff Turnover |
| `/dashboard/registers/trainer-availability` | Trainer Availability |
| `/dashboard/trainers` | Profile Management |

**Section: Governance & Risk**
| Route | Label |
|---|---|
| `/dashboard/governance/meeting-manager` | Governance Meetings |
| `/dashboard/governance/register` | Governance Register (Unified CI + Risk) |
| `/dashboard/registers/mcn` | Material Change Notifications |
| `/dashboard/registers/fpp` | Fit & Proper Person |
| `/dashboard/registers/pfp` | Prepaid Fee Protection |
| `/dashboard/registers/pli` | Public Liability Insurance |
| `/dashboard/registers/qi` | Quality Indicator Reporting |
| `/dashboard/registers/audit` | Audit & Internal Review |
| `/dashboard/registers/whs` | WHS & Third Party |
| `/dashboard/registers/thp` | Third Party Arrangements |
| `/dashboard/regulatory-intelligence` | Regulatory Intelligence |

**Section: Documents & Compliance**
| Route | Label |
|---|---|
| `/documents-register` | Documents Register |
| `/document-repository` | Document Repository |
| `/student-support/uploads` | Upload Minutes |
| `/dashboard/registers/mktg` | Marketing & Information |

**Section: AI & Automation**
| Route | Label |
|---|---|
| `/complybot` | Compliance Intelligence |
| `/dashboard/assessors/insights` | Assessor Performance |

**Section: User Management**
| Route | Label |
|---|---|
| `/admin/user-management` | Users |
| `/admin/user-management/roles` | Roles & Permissions |
| `/admin/impersonate` | View as User |
| `/admin/user-portals` | User Portals Hub |

**Section: Settings**
| Route | Label |
|---|---|
| `/settings` | Organisation Settings |
| `/settings/rto` | RTO Settings |
| `/settings/preferences` | Preferences |

**Additionally in `routePermissions`** (not surfaced in nav but explicitly allowed):
- `/dashboard/ceo-governance` — CEO Governance Portal (feature-flagged; requires `feature_governance_portal` to be `live` or user must be `super_admin`)
- `/dashboard/settings/subscription`
- `/settings/roles`
- `/settings/impersonate`
- `/dashboard/registers/adc`
- `/dashboard/audit-engine`
- `/dashboard/tas/builder`

---

### Consultant

The `Consultant` role is **not in the `AppRole` type** in `roleNavigation.ts`. It is a value in the `tenant_members.role` column and is a completely separate portal at `/consultant/*`, guarded by `ConsultantGuard` (checks `tenant_members.role = 'Consultant'` with `status = 'active'`).

| Route | Label | Status |
|---|---|---|
| `/consultant/dashboard` | My Client Portfolio | **Live** |
| `/consultant/my-tenants` | My Tenants | Coming soon placeholder |
| `/consultant/tenants-hub` | Tenants Hub | Coming soon placeholder |
| `/consultant/calendar` | Calendar | Coming soon placeholder |
| `/consultant/suggestions` | Suggestions | Coming soon placeholder |
| `/consultant/account-settings` | Account Settings | Coming soon placeholder |

The consultant portal is **entirely separate** from the main app nav. A Consultant who also holds an Administrator or other role in a tenant sees those workspaces on the dashboard under "My Workspaces" (from `useConsultantClients`).

---

### Regulatory Officer

Nav config: `REGULATOR_NAV` — all items carry `readOnly: true`.

**Section: Dashboard**
| Route | Label |
|---|---|
| `/dashboard/auditor` | Auditor Dashboard |

**Section: Training & Assessment** (all read-only)
| Route |
|---|
| `/dashboard/tas-engine` |
| `/dashboard/assessment-validation` |
| `/admin/trainer-matrix-engine` |
| `/dashboard/registers/ien` |
| `/dashboard/registers/fre` |

**Section: VET Workforce** (all read-only)
| Route |
|---|
| `/dashboard/registers/tcr` |
| `/dashboard/registers/trainer-availability` |
| `/dashboard/trainers` |

**Section: Students & Support** (all read-only)
| Route |
|---|
| `/dashboard/registers/ssr` |
| `/student-support/reports/wellbeing` |
| `/student-support/reports/reasonable-adjustment` |
| `/student-support/reports/at-risk` |
| `/dashboard/registers/caa` |

**Section: Governance & Risk** (all read-only)
| Route |
|---|
| `/dashboard/governance/register` |
| `/dashboard/governance/meeting-manager` |
| `/dashboard/registers/audit` |
| `/dashboard/registers/whs` |

**Section: Documents** (all read-only)
| Route |
|---|
| `/documents-register` |
| `/document-repository` |

**Explicitly blocked** by `writeProtectedRoutes`: `/settings`, `/admin/user-portals`, `/superadmin`.

**Dead routes on the Auditor Dashboard**: The dashboard navigates to `/auditor/standards`, `/auditor/evidence`, `/auditor/registers`, and `/auditor/downloads` — none of these routes exist in `AppRoutes.tsx`. These buttons will 404 at runtime.

---

## Read-only vs read-write

### Governing Person

The nav has no `readOnly` flags — all items inherited from `ADMIN_NAV` are implicitly read-write in terms of navigation.

**Routing layer**: `canAccessRoute` returns `true` immediately for `'Governing Person'` without consulting `routePermissions` — effectively a super-user at the route level.

**RBAC layer (critical inconsistency)**: `hasAdminAccess()` returns `false` for Governing Person (only recognises `'Administrator'` and `'super_admin'`). `getRoleBasedPermissions('Governing Person')` falls through all cases and returns an **empty permissions Set**. The legacy `useRegisterAccess().canEditRegister()` will return `false` for Governing Person.

In practice: GPs can navigate to every page, but any component that checks `hasAdminAccess` or `getRoleBasedPermissions` before rendering write controls will silently suppress them.

**`generate-board-report` edge function** has an explicit role gate: only `'administrator'` or `'compliance_manager'` are allowed. Governing Person is locked out of this function — which is almost certainly a bug given the intent of the role.

| Area | GP access |
|---|---|
| All nav routes | Read + write (routing layer) |
| Register write controls (RBAC-checked components) | Read-only (RBAC layer mismatch) |
| `generate-board-report` edge function | **Blocked** (explicit role gate excludes GP) |
| CEO Governance Portal | Read-only if flag `feature_governance_portal` is disabled; full access if enabled |

### Consultant

| Area | Consultant access |
|---|---|
| `/consultant/dashboard` | Read-only (queries `tenant_members` + `tenants`) |
| All other `/consultant/*` routes | Placeholder — no data reads or writes |
| Main app routes | Blocked by `ConsultantGuard` redirect to `/dashboard` unless they also hold another tenant role |

### Regulatory Officer

All nav items are `readOnly: true`. `isRegulatorRole()` is `true`, which triggers the write-protected route block. No write access anywhere.

| Area | Regulatory Officer access |
|---|---|
| All nav register routes | Read-only |
| `/settings`, `/admin/user-portals`, `/superadmin` | Blocked |
| Auditor Dashboard `/dashboard/auditor` | Accessible but contains no live data |
| `/auditor/*` sub-routes | 404 (routes not defined) |

---

## Edge function categories triggered

### Governing Person

Assuming the CEO Governance Portal flag is enabled, a Governing Person will trigger:

| Category | Functions |
|---|---|
| **Governance reporting** | `generate-governance-pack`, `generate-governance-narrative`, `generate-board-report` (currently blocked — needs role gate fix) |
| **Meeting analysis** | `governance-meeting-analyser`, `meeting-minutes-summarize`, `parse-meeting-notes-ai` |
| **Self-assurance** | `self-assurance-simulation`, `self-assurance-pdf` |
| **Audit** | `generate-audit-pack`, `audit-ai-processor` |
| **Compliance intelligence** | `ai-register-summary`, `complybot-trending` (via `/complybot`) |
| **Regulatory** | `analyse-regulatory-update`, `tenant-analyse-regulatory-impact` (via Regulatory Intelligence page) |
| **FPP** | `fpp-evidence-manager`, `fpp-evidence-reconcile` |
| **Document management** | `documents-upload`, `document-file-manager`, `bulk-ai-document-tagging` |
| **TAS** | `tas-ai-engine`, `tas-create`, `tas-export-pdf` (if navigating to TAS Quality Engine) |

GP has full nav access, so the full catalogue of internal functions is reachable — subject to the RBAC mismatch noted above.

### Consultant

| Category | Functions |
|---|---|
| **None triggered by current implementation** | The only live page (`/consultant/dashboard`) is a pure DB read with no edge function calls. |

### Regulatory Officer

| Category | Functions |
|---|---|
| **Audit pack** | `generate-audit-pack` (if the export control is not write-gated) |
| **Adversarial audit** | `run-adversarial-auditor` (uncertain — role gate unknown without source inspection) |
| **No write functions** | All write-capable functions are blocked by the readOnly nav flag and `writeProtectedRoutes` |

In practice the Regulatory Officer's dashboard triggers zero edge functions because it contains no live data and no action buttons.

---

## Data requirements per category

### Governing Person — CEO Governance Portal

These tables must be seeded for the portal to render meaningful data (not empty states):

| Table | Minimum data needed | Purpose |
|---|---|---|
| `tenants` | 1 row (the RTO's tenant record with `name`, `plan`) | Core tenant |
| `profiles` | 1 GP user row with `tenant_id`, `role = 'Governing Person'` | Auth identity |
| `governing_persons` | ≥1 row with `tenant_id`, `is_active = true`, `renewal_status` | Governing Persons tab, stat card |
| `ci_register` | ≥1 row with `tenant_id`; at least one with `requires_governing_person_attention = true` | Actions Required tab, CI activity |
| `risk_register` | ≥1 row with `tenant_id`, `priority`, `status`, `due_date` | Risk summary card |
| `compliance_calendar_tasks` | Populated by `ensure_asqa_calendar_tasks` RPC; or pre-seed rows with `linked_register` in `('adc_register','quality_indicators','avetmiss','financial')` | Regulatory calendar, days-to-obligation |
| `documents_register` | ≥1 row with `tenant_id`, `quality_area` | Quality area posture chart |
| `feature_visibility` | Row for `feature_governance_portal` with `status = 'live'` | Unlocks CEO Governance Portal (otherwise shows "Coming Soon") |

For `generate-board-report` to work once the role gate is fixed: additionally needs `risk_register`, `ci_register`, `governing_persons`, `documents_register` populated.

### Governing Person — Governance & Risk registers

| Table | Minimum data |
|---|---|
| `governance_meetings` (or equivalent) | ≥1 row for Meeting Manager |
| `fit_proper_persons` | ≥1 row for FPP register |
| `prepaid_fee_protection` | ≥1 row for PFP register |
| `public_liability_insurance` | ≥1 row for PLI register |
| `quality_indicators` | ≥1 row for QI reporting |
| `audit_register` | ≥1 row for Audit & Internal Review |

### Consultant — Dashboard only

| Table | Minimum data needed |
|---|---|
| `tenant_members` | ≥1 row: `user_id` = consultant's auth UID, `role = 'Consultant'`, `status = 'active'`, valid `tenant_id` |
| `tenants` | 1 row per `tenant_id` referenced above with `name` and `plan` |

All other consultant pages are placeholders and have no data requirements.

### Regulatory Officer — No live functions

The Auditor Dashboard at `/dashboard/auditor` makes **zero database queries**. All displayed numbers are hardcoded literals in the TSX. No tables need seeding for this role to "work" — though working means only rendering a static stub.

---

## Seed user templates

### Governing Person

```json
{
  "auth": {
    "email": "gp-seed@example-rto.com.au",
    "password": "<generate>",
    "email_confirmed": true
  },
  "profiles": {
    "role": "Governing Person",
    "first_name": "Patricia",
    "last_name": "Whitmore",
    "tenant_id": "<target-tenant-id>"
  },
  "governing_persons": {
    "tenant_id": "<target-tenant-id>",
    "full_name": "Patricia Whitmore",
    "position": "Board Chair",
    "is_active": true,
    "renewal_status": "current"
  },
  "feature_visibility": {
    "key": "feature_governance_portal",
    "status": "live",
    "tenant_id": "<target-tenant-id>"
  },
  "notes": [
    "Requires ci_register, risk_register, compliance_calendar_tasks rows in tenant to see non-empty portal.",
    "generate-board-report will fail until role gate is updated to include 'Governing Person'.",
    "RBAC mismatch: write controls on register pages will be suppressed by hasAdminAccess() returning false."
  ]
}
```

### Consultant

```json
{
  "auth": {
    "email": "consultant-seed@vivacity.com.au",
    "password": "<generate>",
    "email_confirmed": true
  },
  "profiles": {
    "role": "Consultant",
    "first_name": "Marcus",
    "last_name": "Delray",
    "tenant_id": null
  },
  "tenant_members": [
    {
      "user_id": "<auth-uid>",
      "tenant_id": "<client-rto-tenant-id>",
      "role": "Consultant",
      "status": "active"
    }
  ],
  "notes": [
    "profiles.role can be 'Consultant' or any value — ConsultantGuard checks tenant_members.role, not profiles.role.",
    "Assign to at least one tenant_members row (role='Consultant', status='active') or dashboard shows 0 engagements.",
    "Sandbox env: assign one tenant_members row where tenant_id = 'df5c0c9d-e4be-4f67-b454-1a7128b2fc01'."
  ]
}
```

### Regulatory Officer

```json
{
  "auth": {
    "email": "regulator-seed@asqa.gov.au",
    "password": "<generate>",
    "email_confirmed": true
  },
  "profiles": {
    "role": "Regulatory Officer",
    "first_name": "Sandra",
    "last_name": "Nguyen",
    "tenant_id": "<target-tenant-id>"
  },
  "notes": [
    "No additional table rows required — dashboard is entirely hardcoded.",
    "Dead-end routes: /auditor/standards, /auditor/evidence, /auditor/registers, /auditor/downloads are not defined in AppRoutes and will 404.",
    "Role exists in AppRole type and REGULATOR_NAV — structurally complete but functionally empty.",
    "isRegulatorRole() check works correctly for write-protection."
  ]
}
```

---

## Roles flagged as placeholder only

### Regulatory Officer — **seed placeholder only, no live functions**

Every KPI on the Auditor Dashboard (`/dashboard/auditor`) is a hardcoded literal: `"92%"`, `"247"`, `"156"`, `"Yes"`, standards names with fixed percentages, document titles with fixed timestamps. No database queries are made. The four "Quick Access" buttons navigate to `/auditor/standards`, `/auditor/evidence`, `/auditor/registers`, `/auditor/downloads` — none of which are registered routes in `AppRoutes.tsx`.

There is a second `AuditorDashboard` at `/pages/auditor/Dashboard.tsx` with live-looking UI components and navigation, but it is also hardcoded and not wired to live data.

The role is structurally present (type definition, nav config, route guard, `isRegulatorRole()` check) but has **no live database reads, no edge function calls, and broken sub-navigation**. Safe to seed a user, but the experience will be a static mockup only.

### Consultant — **dashboard live, all other pages placeholder**

`/consultant/dashboard` is live (reads `tenant_members` and `tenants`). The remaining five routes — My Tenants, Tenants Hub, Calendar, Suggestions, Account Settings — all render a single "Coming soon" card with no data or interactivity.

### Governing Person — **partially live, with critical RBAC gap**

The CEO Governance Portal is live once `feature_governance_portal` is enabled, and reads real data from several tables. The broader admin-equivalent nav is technically accessible. However:

1. `hasAdminAccess()` excludes Governing Person, causing write controls in many components to silently suppress.
2. `generate-board-report` explicitly gates to Administrator/Compliance Manager only — Governing Person cannot call it.
3. `getRoleBasedPermissions('Governing Person')` returns an empty Set (no matching case in the switch).

These are **inconsistencies between nav intent and implementation** that must be resolved before a Governing Person seed user can be considered end-to-end functional.
