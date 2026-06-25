# Step 4 — Production Data Shapes

**Generated:** 5 June 2026
**Source:** Live read-only queries against production DB (`gdwhlstfguxarnxasrrs`)
**Purpose:** Exact column names, types, NOT NULL constraints, and defaults for every table needed in `seed.sql`. Use this to write Step 5. Do not re-query the DB — all confirmed shapes are here.

---

## Critical corrections vs role-map SQL templates

The role-map files contain SQL templates written from code inspection. Several column names and values were wrong. **Use the values in THIS file, not the role-map templates:**

| Table | Role-map said | Actual DB column |
|---|---|---|
| `tenant_scope_items.scope_state` | `'current'` | `'registered'` (enum: `registered`, `proposed`, `retired`) |
| `trainer_unit_map.capability` | `can_train / can_assess booleans` | Single enum column: `'S'` (train only), `'K'` (assess only), `'BOTH'` |
| `trainer_profiles` | `full_name` as primary name | `trainer_name` is NOT NULL; `full_name` also exists but nullable |
| `trainer_credentials` | Missing `credential_category` | `credential_category` is NOT NULL — must be included |
| `trainer_industry_currency` | `evidence_description` | `activity_title` is NOT NULL (not `evidence_description`) |
| `trainer_vet_currency` | `activity_date` + `evidence_description` | `activity_name` NOT NULL, `vet_or_industry` NOT NULL, no `evidence_description` column |
| `governing_persons` | name as text field | `person_id uuid NOT NULL` — FK to a profile/user |
| `feature_visibility` | Has `tenant_id` | **No `tenant_id` column** — global table, not tenant-scoped |
| `ssr_register.custom_id` | Optional | NOT NULL with default `''` — always include |
| `tenant_rto_profile.id` | uuid | `bigint` (sequence-generated, not UUID) |

---

## Pre-seeded by migration — do NOT re-seed these

| Table | Row count in production | Action |
|---|---|---|
| `compliance_clauses` | **71 rows** — full Standards for RTOs 2025 clause set | Already seeded by migration. Branch DB inherits this. No seed.sql entry needed. |
| `training_products` | **2,110 rows** — full TGA product catalogue | Seeded by TGA sync. Branch DB inherits. No seed.sql entry needed. |
| `feature_visibility` | **0 rows** | Empty — must be seeded manually. |
| `audit_templates` | **0 rows** | Empty — must be seeded manually. |

---

## Table schemas (required columns only for seed)

### `tenants`

| Column | Type | NOT NULL | Default | Seed value |
|---|---|---|---|---|
| `tenant_id` | uuid | YES | `gen_random_uuid()` | fixed UUID |
| `tenant_name` | text | YES | — | `'Seed RTO Pty Ltd'` |
| `name` | text | YES | — | `'Seed RTO Pty Ltd'` |
| `slug` | text | YES | — | `'seed-rto'` |
| `status` | text | YES | `'active'` | `'active'` |
| `subscription_status` | text | YES | `'inactive'` | `'active'` (tenant-1) / `'trialing'` (tenant-2) |
| `organisation_type` | text | YES | `'RTO'` | `'RTO'` |
| `setup_completed` | boolean | YES | `false` | `true` |
| `config` | jsonb | YES | `{"onboarding_enabled":true}` | use default |
| `time_zone` | text | YES | `'Australia/Sydney'` | use default |
| `rto_id` | text | NO | — | `'99999'` |
| `is_rto` | boolean | NO | `true` | `true` |
| `account_type` | USER-DEFINED | NO | `'trial'` | `'standard'` (tenant-1) / `'trial'` (tenant-2) |
| `write_locked` | boolean | YES | `false` | `false` |
| `trial_consumed` | boolean | YES | `false` | `true` (tenant-1) |
| `payment_migration_status` | text | YES | `'not_required'` | use default |

---

### `profiles`

| Column | Type | NOT NULL | Default | Seed value |
|---|---|---|---|---|
| `id` | uuid | YES | — | must match `auth.users.id` |
| `email` | text | YES | — | role-specific email |
| `role` | text | NO | `'trial_user'` | role string (e.g. `'Administrator'`) |
| `full_name` | text | NO | — | full name |
| `first_name` | text | NO | — | first name |
| `last_name` | text | NO | — | last name |
| `tenant_id` | uuid | NO | — | target tenant UUID |
| `active_tenant_id` | uuid | NO | — | same as `tenant_id` |
| `user_status` | text | YES | `'ACTIVE'` | `'ACTIVE'` |
| `is_internal_staff` | boolean | YES | `false` | `false` (true for super_admin) |
| `email_verified` | boolean | NO | `false` | `true` |
| `global_role` | text | NO | — | `'super_admin'` for SA only; NULL for all others |

---

### `tenant_members`

| Column | Type | NOT NULL | Default | Seed value |
|---|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` | auto |
| `user_id` | uuid | YES | — | must match `auth.users.id` |
| `tenant_id` | uuid | YES | — | target tenant UUID |
| `role` | text | YES | `'Trainer'` | exact role string (e.g. `'Compliance Manager'`) |
| `email` | text | YES | — | user email |
| `status` | text | YES | `'active'` | `'active'` |
| `roles` | jsonb | YES | `[]` | `[]` |
| `is_internal_staff` | boolean | YES | `false` | `false` |

---

### `user_roles`

| Column | Type | NOT NULL | Default | Seed value |
|---|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` | auto |
| `user_id` | uuid | YES | — | must match `auth.users.id` |
| `tenant_id` | uuid | YES | — | target tenant UUID |
| `role` | text | YES | — | exact role string |

---

### `tenant_rto_profile`

| Column | Type | NOT NULL | Default | Notes |
|---|---|---|---|---|
| `id` | **bigint** | YES | sequence | Do NOT set — let DB auto-assign |
| `tenant_id` | uuid | YES | — | target tenant UUID |
| `rto_id` | text | YES | — | `'99999'` (matches `tenants.rto_id`) |
| `legal_name` | text | NO | — | `'Seed RTO Pty Ltd'` |
| `trading_name` | text | NO | — | `'Seed RTO'` |
| `abn` | text | NO | — | `'12 345 678 901'` |
| `status` | text | NO | — | `'Active'` |
| `regulator` | text | NO | — | `'ASQA'` |
| `registration_start` | date | NO | — | `'2020-01-01'` |
| `registration_end` | date | NO | — | `'2027-12-31'` |

---

### `tenant_scope_items`

| Column | Type | NOT NULL | Default | Seed value |
|---|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` | auto |
| `tenant_id` | uuid | YES | — | target tenant UUID |
| `training_product_code` | text | YES | — | `'BSB50420'` (exists in `training_products`) |
| `scope_state` | USER-DEFINED | YES | `'registered'` | `'registered'` ← **not 'current'** |

---

### `trainer_profiles`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | fixed UUID (`<trainer_profile_id>`) |
| `user_id` | uuid | YES | must match `auth.users.id` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_name` | text | YES | `'Jane Trainer'` ← **primary name field** |
| `full_name` | text | NO | `'Jane Trainer'` |
| `email` | text | NO | trainer email |
| `role_type` | text | NO | `'Trainer'` (default) |
| `status` | text | NO | `'active'` (default) |
| `tae_credential_code` | text | NO | `'TAE40122'` |
| `tae_credential_status` | text | NO | `'current'` |
| `tae_credential_expiry` | date | NO | `'2027-12-31'` |
| `qualifications` | jsonb | NO | `[]` (default) |
| `industry_experience` | jsonb | NO | `[]` (default) |
| `current_scope` | jsonb | NO | `[]` (default) |

---

### `trainer_credentials`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_id` | uuid | YES | `<trainer_profile_id>` |
| `credential_type` | text | YES | `'TAE'` |
| `credential_category` | text | YES | `'VET'` ← **required, role maps missed this** |
| `issue_date` | date | NO | `'2022-06-15'` |
| `expiry_date` | date | NO | `'2027-12-31'` |
| `status` | text | NO | `'verified'` |

---

### `trainer_vet_currency`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_id` | uuid | YES | `<trainer_profile_id>` |
| `activity_type` | text | YES | `'Professional Development'` |
| `activity_name` | text | YES | `'TAE Currency Workshop'` ← **not activity_description** |
| `activity_date` | date | YES | `'2024-09-01'` |
| `vet_or_industry` | text | YES | `'vet'` ← **required, no default** |
| `hours` | numeric | NO | `8` |

---

### `trainer_industry_currency`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_id` | uuid | YES | `<trainer_profile_id>` |
| `activity_type` | text | YES | `'Workplace visit'` |
| `activity_title` | text | YES | `'Industry site visit'` ← **not evidence_description** |
| `start_date` | date | YES | `'2024-11-15'` |
| `status` | text | NO | `'pending'` (default) |
| `evidence_files` | jsonb | YES | `[]` (default) |

---

### `trainer_unit_map`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_id` | uuid | NO | `<trainer_profile_id>` |
| `unit_code` | text | YES | `'BSBLDR523'` |
| `capability` | USER-DEFINED | YES | `'BOTH'` ← enum: `S`, `K`, `BOTH` |
| `status` | text | YES | `'evidence_pending'` (default) |
| `evidence_links` | jsonb | YES | `[]` (default) |

---

### `trainer_product_coverage`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `trainer_id` | uuid | YES | `<trainer_profile_id>` |
| `training_product_code` | text | YES | `'BSB50420'` |
| `coverage_type` | text | YES | `'full'` (default) |

---

### `governing_persons`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `person_id` | uuid | YES | `<governing_person_auth_uuid>` ← FK to user |
| `role_title` | text | YES | `'Board Chair'` |
| `start_date` | date | YES | `'2023-01-01'` |
| `fit_proper_status` | text | YES | `'current'` |
| `evidence_links` | jsonb | YES | `[]` (default) |

---

### `governance_meetings`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `meeting_date` | date | YES | `'2026-05-15'` |
| `status` | text | YES | `'Completed'` |
| `created_by` | uuid | YES | `<admin_user_uuid>` ← defaults to `auth.uid()`, override in seed |
| `agenda_json` | jsonb | YES | `{}` (default) |
| `outcomes_json` | jsonb | YES | `{}` (default) |
| `evidence_links` | jsonb | YES | `[]` (default) |
| `dispatch_state` | jsonb | YES | `{}` (default) |
| `tzid` | text | NO | `'Australia/Sydney'` (default) |

---

### `ci_register`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `custom_id` | text | YES | `'CI-001'` |
| `lifecycle_state` | text | YES | `'identified'` (default) |
| `escalation_count` | integer | YES | `0` (default) |
| `requires_governing_person_attention` | boolean | YES | `false` (default) |

All other columns nullable — use defaults.

---

### `ci_items`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `source_type` | text | YES | `'manual'` |
| `title` | text | YES | `'Seed CI Item — trainer currency review'` |
| `priority` | text | YES | `'medium'` (default) |
| `status` | text | YES | `'open'` (default) |
| `responsible_role` | text | YES | `'Compliance Manager'` (default) |

---

### `audit_cycle`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `year` | integer | YES | `2026` |
| `period` | text | YES | `'2026-H1'` |
| `audit_type` | text | YES | `'internal'` |
| `planned_date` | date | YES | `'2026-06-30'` |
| `status` | text | YES | `'planned'` (default) |

---

### `audit_templates`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `title` | text | YES | `'Standards for RTOs 2025 — Internal Audit'` |
| `is_global` | boolean | YES | `true` ← global template, no `tenant_id` needed |
| `created_by` | uuid | YES | `<admin_user_uuid>` |
| `tenant_id` | uuid | NO | NULL (global template) |

---

### `risk_register`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `risk_title` | text | YES | `'Trainer currency non-compliance risk'` |
| `priority` | text | YES | `'medium'` |
| `quality_area` | text | YES | `'Training & Assessment'` |
| `custom_id` | text | YES | `'RISK-001'` |
| `demo_seed` | boolean | YES | `true` ← mark seed data clearly |
| `requires_governing_person_attention` | boolean | YES | `false` (default) |
| `tenant_id` | uuid | NO | target tenant UUID |

---

### `sso_alert_thresholds`

All columns have defaults — only `tenant_id` needs to be supplied:

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `tenant_id` | uuid | YES | target tenant UUID (PK — one row per tenant) |

All other columns use DB defaults (`complaint_spike_delta=1`, `at_risk_spike_pct=15`, etc.)

---

### `ssr_register`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `custom_id` | text | YES | `'SSR-001'` ← NOT NULL, default `''` but use a real value |
| `tenant_id` | uuid | NO | target tenant UUID |
| `student_name` | text | YES | `'Alex Student'` |
| `date_of_support` | date | YES | `'2026-06-01'` |
| `support_type` | text | YES | `'Wellbeing check-in'` |
| `status` | text | YES | `'Pending'` (default) |
| `risk_flag` | boolean | NO | `true` |

---

### `sso_monthly_packs`

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `id` | uuid | YES | `gen_random_uuid()` |
| `tenant_id` | uuid | YES | target tenant UUID |
| `period_month` | date | YES | `'2026-06-01'` |
| `status` | text | YES | `'draft'` (default) |
| `generated_by` | uuid | YES | `<sso_user_uuid>` ← defaults to `auth.uid()`, must override in seed |
| `snapshot` | jsonb | YES | `{}` (default) |
| `commentary` | jsonb | YES | `{}` (default) |
| `period_year` | smallint | NO | `2026` |

---

### `feature_visibility`

**0 rows in production — must be seeded.** Global table, no `tenant_id`.

| Column | Type | NOT NULL | Seed value |
|---|---|---|---|
| `feature_key` | text | YES | `'feature_governance_portal'` |
| `display_name` | text | YES | `'CEO Governance Portal'` |
| `status` | text | YES | `'live'` ← `'coming_soon'` hides it; `'live'` shows it |

---

## Summary — what seed.sql must insert (in FK-safe order)

1. `tenants` (2 rows — active + trial)
2. `tenant_rto_profile` (1 row for active tenant)
3. `tenant_scope_items` (1 row — `BSB50420`, scope_state `'registered'`)
4. `profiles` (1 per seed user — 7 users)
5. `tenant_members` (1 per tenant user — matches profiles)
6. `user_roles` (1 per tenant user)
7. `governing_persons` (1 row — links to Governing Person user's UUID)
8. `trainer_profiles` (1 row — links to Trainer user's UUID)
9. `trainer_credentials` (1 row — TAE, credential_category `'VET'`)
10. `trainer_vet_currency` (1 row — activity_name + vet_or_industry required)
11. `trainer_industry_currency` (1 row — activity_title required)
12. `trainer_unit_map` (1 row — capability enum `'BOTH'`)
13. `trainer_product_coverage` (1 row)
14. `governance_meetings` (1 row — created_by must be a real UUID)
15. `ci_register` (1 row — custom_id required)
16. `ci_items` (1 row — source_type + title required)
17. `audit_cycle` (1 row)
18. `audit_templates` (1 row — global, is_global=true)
19. `risk_register` (1 row — demo_seed=true, custom_id required)
20. `sso_alert_thresholds` (1 row per tenant — only tenant_id needed)
21. `ssr_register` (1 row — custom_id + student_name + date_of_support + support_type required)
22. `sso_monthly_packs` (1 row — generated_by must be real UUID)
23. `feature_visibility` (1 row — feature_governance_portal = live)
