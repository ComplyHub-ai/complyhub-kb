# Role Map — Compliance Manager

> **Source files:** `src/config/roleNavigation.ts` · `src/lib/rbac.ts`  
> **DB project:** `gdwhlstfguxarnxasrrs` (ap-southeast-2)  
> **Note:** `docs/QA_PROTOCOL.md` does not exist. Edge function categories and function counts are derived from the nav sections, rbac permissions, and edge function folder names. Verify against Carl's KB if a formal QA protocol is later produced.  
> **Generated:** 2026-06-05

---

## Routes & access

Compliance Manager gets the broadest non-admin nav. The inline `COMPLIANCE_MANAGER_NAV` object in `roleNavigation.ts:192` explicitly excludes two admin sections (`USER_MANAGEMENT_SECTION` and `SETTINGS_SECTION`) and substitutes a reduced User Management block.

### Navigation-declared paths (from `COMPLIANCE_MANAGER_NAV`)

| Section | Label | Path |
|---|---|---|
| **Dashboard** | Admin Dashboard | `/dashboard/admin` |
| | Calendar | `/calendar` |
| | Tasks | `/dashboard/tasks` |
| **Training & Assessment** | TAS Quality Engine | `/dashboard/tas-engine` |
| | Assessment Validation | `/dashboard/assessment-validation` |
| | Trainers Matrix | `/admin/trainer-matrix-engine` |
| | Credit Transfer | `/dashboard/registers/ct` |
| | Recognition of Prior Learning | `/dashboard/registers/rpl` |
| | Industry Engagement | `/dashboard/registers/ien` |
| | Facilities, Resources & Equipment | `/dashboard/registers/fre` |
| **Students & Support** | Student Support Register | `/dashboard/registers/ssr` |
| | Wellbeing & Safety | `/student-support/reports/wellbeing` |
| | Reasonable Adjustments | `/student-support/reports/reasonable-adjustment` |
| | At-Risk Interventions | `/student-support/reports/at-risk` |
| | Equity & Inclusion | `/student-support/reports/edi` |
| | Complaints & Appeals | `/dashboard/registers/caa` |
| **VET Workforce** | Trainer Credentials | `/dashboard/registers/tcr` |
| | Professional Development | `/dashboard/registers/pdr` |
| | Staff Turnover | `/dashboard/registers/staff-turnover` |
| | Trainer Availability | `/dashboard/registers/trainer-availability` |
| | Profile Management | `/dashboard/trainers` |
| **Governance & Risk** | Governance Meetings | `/dashboard/governance/meeting-manager` |
| | Governance Register | `/dashboard/governance/register` |
| | Material Change Notifications | `/dashboard/registers/mcn` |
| | Fit & Proper Person | `/dashboard/registers/fpp` |
| | Prepaid Fee Protection | `/dashboard/registers/pfp` |
| | Public Liability Insurance | `/dashboard/registers/pli` |
| | Quality Indicator Reporting | `/dashboard/registers/qi` |
| | Audit & Internal Review | `/dashboard/registers/audit` |
| | WHS & Third Party | `/dashboard/registers/whs` |
| | Third Party Arrangements | `/dashboard/registers/thp` |
| | Regulatory Intelligence | `/dashboard/regulatory-intelligence` |
| **Documents & Compliance** | Documents Register | `/documents-register` |
| | Document Repository | `/document-repository` |
| | Upload Minutes | `/student-support/uploads` |
| | Marketing & Information | `/dashboard/registers/mktg` |
| **AI & Automation** | Compliance Intelligence | `/complybot` |
| | Assessor Performance | `/dashboard/assessors/insights` |
| **User Management** *(reduced)* | Users | `/settings/users-management` |
| | User Portals Hub | `/admin/user-portals` |

**Total nav paths: 38**

### Additional paths accessible via `routePermissions` (not in nav, but role is listed)

These routes are reachable if the user knows the URL or is redirected there:

| Path | Notes |
|---|---|
| `/dashboard/ceo-governance` | GP + Admin + CM only |
| `/dashboard/registers/adc` | GP + Admin + CM only |
| `/dashboard/audit-engine` | Dedicated audit engine view |
| `/dashboard/tas/builder` | Full TAS builder (deeper than `/dashboard/tas-engine`) |
| `/admin/matrix-approvals` | Trainer matrix approval queue |
| `/surveys` | Survey and feedback view |
| `/dashboard/trainer` | Trainer dashboard (read access) |
| `/dashboard/student-support`, `/dashboard/sso`, `/student-support` | SSO area |
| `/sso/monthly-reports` | SSO monthly report packs |

### What Compliance Manager cannot reach

| Path | Who has it |
|---|---|
| `/settings/rto` | Administrator, Governing Person, super_admin only |
| `/admin/user-management` (full) | Administrator, Governing Person, super_admin only |
| `/admin/impersonate` | Administrator, Governing Person, super_admin only |
| `/settings/roles` | Administrator, Governing Person, super_admin only |
| `/superadmin/*` | super_admin only |
| `/dashboard/settings/subscription` | Administrator, Governing Person, super_admin only |

---

## Read-only vs read-write

**No items in `COMPLIANCE_MANAGER_NAV` have `readOnly: true`** — unlike `REGULATOR_NAV`, which marks nearly everything read-only. Compliance Manager is read-write across all reachable routes unless a FeatureGate or page-level RLS policy applies.

### Permission set (from `rbac.ts:158`)

| Permission key | Compliance Manager | Administrator (for comparison) |
|---|---|---|
| `view.settings` | ✓ | ✓ |
| `view.dashboard` | ✓ | ✓ |
| `view.compliance.calendar` | ✓ | ✓ |
| `view.registers` | ✓ | ✓ |
| `edit.registers` | ✓ | ✓ |
| `delete.registers` | ✗ | ✓ |
| `view.actions` | ✓ | ✓ |
| `submit.actions` | ✓ | ✓ |
| `approve.actions` | ✓ | ✓ |
| `view.documents` | ✓ | ✓ |
| `edit.documents` | ✓ | ✓ |
| `delete.documents` | ✗ | ✓ |
| `view.qa1` | ✓ | ✓ |
| `view.qa2` | ✓ | ✓ |
| `view.qa3` | ✓ | ✓ |
| `view.qa4` | ✓ | ✓ |
| `view.governance` | ✓ | ✓ |
| `view.compbot` | ✓ | ✓ |
| `view.analytics` | ✗ | ✓ |
| `view.trainer.portal` | ✗ | ✓ |
| `manage.users` | ✗ | ✓ |
| `manage.roles` | ✗ | ✓ |

`canEditRegister()` returns `true` for all register paths (`rbac.ts:78`).

### Summary

- **Read-write:** All 38 nav paths, all registers, all documents, governance, actions, AI tools.
- **Read-only (effective):** Trainer dashboard (`/dashboard/trainer`), SSO area (CM can view but SSO workflows belong to Student Support Officers).
- **Blocked:** User role/permission management, RTO/org settings, impersonation, superadmin, analytics dashboard, delete operations on registers and documents.

---

## Edge function categories triggered

> `docs/QA_PROTOCOL.md` was not found in the repository. Categories below are derived from the feature areas the nav exposes and the edge function folder names under `supabase/functions/`. Function counts cover functions the role's pages directly invoke; background crons are not counted.

| # | Category | Representative functions | Count |
|---|---|---|---|
| 1 | **Compliance Registers** | `auto-capture-ci`, `register-evidence-manager`, `evidence-manager`, `fpp-evidence-manager`, `fpp-evidence-reconcile`, `verify-evidence`, `ai-register-summary`, `export-health-report`, `notify-compliance-manager`, `ingest-error-event` | ~10 |
| 2 | **CI Engine** (Continuous Improvement) | `auto-capture-ci`, `ci-overdue-check`, `complybot-trending`, `analyse-regulatory-update`, `regulatory_analyse_impact`, `regulatory_fetch_update`, `tenant-analyse-regulatory-impact`, `global-run-source-scan` | ~8 |
| 3 | **Audit Engine** | `audit-ai-processor`, `audit-reprocess`, `bulk-audit-reprocess`, `generate-audit-pack`, `run-adversarial-auditor`, `generate-executive-summary`, `self-assurance-simulation`, `self-assurance-pdf` | ~8 |
| 4 | **TAS Builder** | `tas-ai-engine`, `tas-create`, `tas-audit-simulate`, `tas-export-data`, `tas-export-pdf`, `tas-goal-prefill`, `tas-redteam-simulate`, `generate-tas-section`, `parse-tas-document`, `derive-assessment-tasks`, `derive-unit-content`, `research-tas-section`, `fetch-assessment-conditions`, `generate-lln-strategy`, `generate-section2-content`, `compute-unit-complexity` | ~16 |
| 5 | **Governance** | `generate-governance-pack`, `generate-governance-narrative`, `generate-board-report`, `governance-meeting-analyser`, `meeting-minutes-summarize`, `meeting-reports-generator`, `tmr-create-for-meeting`, `parse-meeting-notes-ai` | ~8 |
| 6 | **AI & Compliance Intelligence** | `ai-router`, `ai-register-summary`, `consultation-prompt-pack`, `predictive-analytics`, `global-perplexity-analyse`, `complybot-trending`, `dap-ai-draft` | ~7 |
| 7 | **Trainer / Workforce** | `ingest-trainer-credentials`, `trainer-register-cron`, `analyze-trainer-evidence`, `analyze-credential-certificate`, `generate-pd-recommendations`, `tp-product-integrity-scan`, `training-product-check` | ~7 |
| 8 | **Notifications & Comms** | `notify-compliance-manager`, `send-custom-email`, `monthly-report-reminders`, `wellbeing-support-reminders`, `placement-followup-reminders` | ~5 |

**Total: ~69 functions** that are within reach of the pages this role can access.

---

## Data requirements per category

### 1. Compliance Registers

**Core tables required:**

| Table | Minimum data |
|---|---|
| `tenant_members` | ≥1 row with `role = 'Compliance Manager'` and valid `tenant_id` |
| `tenant_rto_profile` | 1 row — RTO name, ASQA registration number, states of operation |
| `registers` | 1 row per register type the org uses (ct, rpl, ien, fre, ssr, caa, tcr, pdr, whs, audit, mcn, fpp, pfp, pli, qi, thp, mktg) |
| `register_entries_unified` | ≥1 entry per active register |
| `evidence_documents` / `register_evidence_links` | Links from entries to supporting documents |
| `compliance_items` | At least one item per module (training, governance, student_support) |

All individual register tables (`ct_register`, `rpl_register`, `caa_register`, etc.) must have at least one row or the register page will render empty — most pages do not error-out on empty but CI capture functions need an existing register ID to write into.

---

### 2. CI Engine

**Core tables required:**

| Table | Minimum data |
|---|---|
| `ci_register` | ≥1 row with `tenant_id`, `status` (open/in_progress), `module`, `source_type` |
| `ci_items` | ≥1 item linked to `ci_register.id` |
| `ci_actions` | ≥1 action (can be empty/open) |
| `ci_evidence` | Optional for basic run; required for `verify-evidence` |
| `compliance_items` | ≥1 item per major standard clause (1.1–4.3) |
| `compliance_events` | ≥1 event for calendar/overdue check |
| `tenant_regulatory_impacts` | Required by `tenant-analyse-regulatory-impact`; can be empty on first run |

`auto-capture-ci` writes into `ci_items` and tags by `module` and `standard` reference — the module map is hardcoded in the function (`auto-capture-ci/index.ts:10`). No pre-existing CI data is strictly required for the first capture, but `tenant_id` must resolve.

---

### 3. Audit Engine

**Core tables required:**

| Table | Minimum data |
|---|---|
| `audit_cycle` | ≥1 cycle with `tenant_id`, `cycle_name`, `start_date`, `end_date`, `status` |
| `audit_templates` | ≥1 template with associated `audit_template_questions` |
| `audit_findings` | May be empty on first run; required for `generate-audit-pack` to produce output |
| `audit_tasks` | At least 1 open task for overdue checks |
| `audit_reports` | Empty on fresh install; populated by `audit-ai-processor` |
| `tenant_clause_assessments` | ≥1 row per clause (links to `compliance_clauses`) — required by `run-adversarial-auditor` |
| `compliance_clauses` | Must be seeded with the Standards for RTOs 2025 clause set |
| `self_assurance_audits` (if the self-assurance flow is active) | ≥1 audit session record |

`generate-audit-pack` requires a `tenant_id` + `period` and queries `audit_findings`, `risk_register`, and `governance_register`. All three tables must exist and be queryable (empty is tolerable but the pack will flag zero findings).

---

### 4. TAS Builder

**Core tables required:**

| Table | Minimum data |
|---|---|
| `tenant_scope_items` | ≥1 qualification on scope with `training_product_code`, `scope_state = 'current'` |
| `training_products` | ≥1 product matching scope item code |
| `training_product_units` | All units for each scoped qualification |
| `tas_register` | ≥1 TAS record (created by `tas-create`) |
| `tas_builds` | Populated by `tas-ai-engine` on first AI run |
| `tas_draft_sections` | Populated progressively by `generate-tas-section` |
| `tas_documents` | Created when a TAS is exported |
| `tas_delivery_plans` + `tas_delivery_plan_units` | Required for delivery scheduling functions |
| `tas_goals` | Required by `tas-goal-prefill` |
| `trainer_profiles` | At least one trainer mapped to the qualification for coverage checks |
| `trainer_unit_map` / `trainer_matrix` | Trainer-to-unit assignments (TAS coverage engine reads this) |

`tas-create` (`tas-create/index.ts:80`) resolves the qualification via `tenant_scope_items` → `training_products`. If `tenant_scope_items` is empty the function returns a 400.

---

### 5. Governance

**Core tables required:**

| Table | Minimum data |
|---|---|
| `governing_persons` | ≥1 row with `tenant_id`, name, role title, `is_active = true` — required by `generate-governance-pack` for quorum/declaration checks |
| `governance_meetings` | ≥1 meeting record with `tenant_id`, `meeting_date`, `status` |
| `governance_meeting_attendance` | At least one attendance record per meeting |
| `governance_meeting_minutes` | Required by `meeting-minutes-summarize` and `generate-governance-narrative` |
| `governance_register` | ≥1 entry (CI or risk) — queried by `generate-governance-pack` for findings summary |
| `governance_actions` | At least one action item (open or closed) |
| `governance_packs` | Populated by `generate-governance-pack`; empty on first run |
| `risk_register` | ≥1 risk with `tenant_id`, `risk_level`, `status` — queried in governance pack generation |
| `tenant_governance_settings` | 1 row per tenant with quorum settings, meeting cadence |

`generate-governance-pack` (`generate-governance-pack/index.ts:61`) takes `{ period, tenant_id }` and queries `governance_register`, `risk_register`, `audit_findings`, and `governance_meetings`. Without at least one record in each it will produce an empty report — it will not error, but the AI narrative generation step has nothing to summarise.

---

### 6. AI & Compliance Intelligence

**Core tables required:**

| Table | Minimum data |
|---|---|
| `compliance_bot_logs` | Empty on first run; `ai-router` writes here |
| `compliance_clauses` | Must be seeded — the full Standards for RTOs 2025 clause set |
| `compliance_instruments` | ≥1 instrument record (Standards for RTOs 2025, National Code 2018, etc.) |
| `ci_items` | Queried by `complybot-trending` for trend analysis |
| `tenant_regulatory_impacts` | Required by `regulatory_analyse_impact`; can be empty initially |
| `compliance_event_templates` | ≥1 template for calendar event generation |

---

### 7. Trainer / Workforce

**Core tables required:**

| Table | Minimum data |
|---|---|
| `trainer_profiles` | ≥1 profile with `tenant_id`, `user_id`, active status |
| `trainer_credentials` | ≥1 credential per trainer (TAE qualification minimum) |
| `trainer_unit_map` | Trainer-to-unit assignments for the matrix engine |
| `trainer_matrix` | ≥1 row (populated by matrix engine; required for matrix read views) |
| `trainer_pd` | At least one PD record per trainer for PD register |
| `tcr_register` | ≥1 credential register entry |
| `pdr_register` | ≥1 PD register entry |
| `training_products` + `training_product_units` | Required for `tp-product-integrity-scan` |

---

## Seed user template

This is the minimum profile needed to deploy a Compliance Manager test user who can exercise all seven edge function categories above without hitting null-reference errors.

```sql
-- 1. Auth user (created via Supabase Auth invite or seed script)
-- email: cm-test@[tenant-domain].edu.au
-- password: (set via invite flow)

-- 2. Profile record
INSERT INTO profiles (id, full_name, email, role, tenant_id, created_at)
VALUES (
  '<auth_user_uuid>',
  'Sarah Chen',
  'cm-test@[tenant-domain].edu.au',
  'Compliance Manager',
  '<tenant_uuid>',
  now()
);

-- 3. Tenant membership
INSERT INTO tenant_members (user_id, tenant_id, role, status, joined_at)
VALUES (
  '<auth_user_uuid>',
  '<tenant_uuid>',
  'Compliance Manager',
  'active',
  now()
);
```

### Minimum supporting data required

| Entity | Minimum |
|---|---|
| `tenant_rto_profile` | 1 row — RTO name, ASQA number, active |
| `tenant_scope_items` | ≥1 current qualification (e.g. BSB50820) |
| `training_products` + `training_product_units` | Populated for each scope item |
| `compliance_clauses` | Full Standards for RTOs 2025 clause set (seeded by migration) |
| `governing_persons` | ≥1 active governing person |
| `governance_meetings` | ≥1 past meeting with minutes |
| `risk_register` | ≥1 risk entry |
| `ci_register` + `ci_items` | ≥1 CI item (any module, any source) |
| `audit_cycle` + `audit_templates` | ≥1 cycle + ≥1 template |
| `trainer_profiles` + `trainer_credentials` | ≥1 trainer with TAE credential |

### What this role does NOT need seeded

- `tenant_plans` / `tenant_subscriptions` — billing gate is bypassed in dev/seed environments
- `student_*` tables — this role does not have a student portal
- `employer_*` / `third_party_*` tables — not in nav
- Full `audit_findings` — the engine will generate these on first run

---

*Last updated: 2026-06-05 — derived from `roleNavigation.ts`, `rbac.ts`, edge function source, and live DB schema.*
