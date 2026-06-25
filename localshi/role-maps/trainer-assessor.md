# Role Map — Trainer / Assessor

**Stored role value:** `Trainer/Assessor`  
**Nav config:** Maps to `TRAINER_NAV` in `roleNavigation.ts` — identical to the `Trainer` role. No separate nav config exists.  
**Sources:** `src/config/roleNavigation.ts`, `src/lib/rbac.ts`, live Supabase edge functions list, live table list.  
**Note:** `docs/QA_PROTOCOL.md` does not exist in the repo. Edge function categories below are derived from the edge function list and trainer-facing nav paths.

---

## Routes & access

The role reaches these paths via `TRAINER_NAV`. Paths are also confirmed against `routePermissions` and `canAccessRoute()` in `roleNavigation.ts`.

### Section: Dashboard
| Path | Label | Notes |
|---|---|---|
| `/dashboard/trainer` | Trainer Dashboard | Full access — explicitly in `routePermissions` for `Trainer/Assessor` |
| `/calendar` | My Schedule | Full access — no route permission restriction |
| `/dashboard/tasks` | Tasks | Full access — `submit.actions` permission granted |

### Section: Training & Assessment
| Path | Label | Notes |
|---|---|---|
| `/trainer-portal/products` | Assigned Training Products | Full access — under `/trainer-portal` which includes `Trainer/Assessor` in `routePermissions` |
| `/dashboard/assessment-validation` | Assessment Validation | ⚠️ Nav shows this as `readOnly: true` but `routePermissions` does **not** include `Trainer/Assessor` — `canAccessRoute()` will return `false`. This is a nav/permission gap. |
| `/trainer-portal/matrix` | Training Matrix | Full access — under `/trainer-portal` |

### Section: Professional Development
| Path | Label | Notes |
|---|---|---|
| `/trainer-portal/pd` | My PD Record | Full access |
| `/dashboard/registers/tcr` | TAE Currency | `readOnly: true` — explicitly in `routePermissions` for `Trainer/Assessor` |
| `/trainer-portal/availability` | Availability | Full access |
| `/trainer-portal/profile` | My Profile | Full access |

### Section: Resources
| Path | Label | Notes |
|---|---|---|
| `/document-repository` | Training Resources | `readOnly: true` — explicitly in `routePermissions` for `Trainer/Assessor` |
| `/complybot` | Compliance Intelligence | Full access — not in `routePermissions`, falls through to nav check (allowed) |

### Routes explicitly NOT accessible
The following paths appear in the admin nav but are **not** granted to this role:

| Path | Why blocked |
|---|---|
| `/dashboard/admin` | `routePermissions` excludes `Trainer/Assessor` |
| `/dashboard/tas-engine` | Not in `routePermissions` for this role; not in `TRAINER_NAV` |
| `/dashboard/tas/builder` | `routePermissions` excludes `Trainer/Assessor` |
| `/admin/trainer-matrix-engine` | `routePermissions` excludes `Trainer/Assessor` |
| `/dashboard/trainers` | `routePermissions` excludes `Trainer/Assessor` |
| All `/dashboard/governance/*` | `routePermissions` restricts to admin roles and Governing Person |
| All `/settings/*` | Not in nav; `writeProtectedRoutes` blocks `/settings` |
| `/admin/user-management/*` | Not granted |
| `/dashboard/registers/ssr`, `/caa`, `/whs`, `/audit`, `/ien`, `/fre` | Not in `routePermissions` for `Trainer/Assessor` |

---

## Read-only vs read-write

### RBAC permissions granted (`getRoleBasedPermissions` in `rbac.ts`)

| Permission key | Meaning |
|---|---|
| `view.dashboard` | Can see the trainer dashboard |
| `view.compliance.calendar` | Can see the calendar |
| `view.registers` | Can view registers (read-only) |
| `view.actions` | Can see tasks/actions |
| `submit.actions` | Can create/submit tasks — this is the one write permission granted |
| `view.documents` | Can view documents |
| `view.trainer.portal` | Can access trainer portal paths |
| `view.qa3` | Can see QA category 3 content |

**Not granted:** `edit.registers`, `edit.documents`, `delete.*`, `approve.actions`, `manage.users`, `manage.roles`, `view.governance`, `view.analytics`.

### Breakdown by path

| Path | Access level |
|---|---|
| `/dashboard/trainer` | Read-write (dashboard widgets, submit tasks) |
| `/calendar` | Read-write (view and interact with schedule) |
| `/dashboard/tasks` | Read-write (can `submit.actions`) |
| `/trainer-portal/products` | Read-write (request product coverage, view assigned products) |
| `/trainer-portal/pd` | Read-write (log PD events, upload evidence) |
| `/trainer-portal/availability` | Read-write (set own availability) |
| `/trainer-portal/profile` | Read-write (update own profile, upload credentials) |
| `/trainer-portal/matrix` | Read (own matrix view only) |
| `/complybot` | Read-write (query the bot) |
| `/dashboard/registers/tcr` | **Read-only** (`readOnly: true` flag in nav) |
| `/document-repository` | **Read-only** (`readOnly: true` flag in nav) |
| `/dashboard/assessment-validation` | **Blocked** (nav shows it, `routePermissions` denies it — see gap note above) |

---

## Edge function categories triggered

`QA_PROTOCOL.md` does not exist in the repo. The following categories and functions are inferred from the trainer portal nav paths and the live edge function list.

### 1. Trainer Profile & Credential Management
Triggered from `/trainer-portal/profile`, `/trainer-portal/pd`, credential upload flows.

| Edge function | Trigger action |
|---|---|
| `ingest-trainer-credentials` | Submitting a new credential (TAE, VET qualification) |
| `analyze-credential-certificate` | Uploading a credential PDF for AI extraction |
| `analyze-trainer-evidence` | Submitting currency evidence for analysis |
| `update_profile` | Saving profile changes |
| `ai-resume-parser` | Uploading a CV/resume for credential extraction |
| `trainer-register-cron` | Nightly recompute of compliance status (system-triggered, affects this role's register) |

### 2. Storage / Documents
Triggered from `/trainer-portal/profile` (upload evidence), `/document-repository` (view only).

| Edge function | Trigger action |
|---|---|
| `bulk-trainer-document-upload` | Batch upload of trainer documents |
| `document-file-manager` | Managing uploaded files |
| `documents-upload` | Single document upload |
| `analyze-document` | AI analysis of an uploaded document |
| `analyze-documents-batch` | Batch AI document analysis |
| `send-document-notification` | Notification on document submission |

### 3. TGA Integration
The Trainer/Assessor does **not** directly trigger TGA sync jobs (those are admin/system-level). However, they interact with TGA-sourced data for unit lookups and product details.

| Edge function | Trigger action |
|---|---|
| `tga-unit-lookup` | Looking up unit details from TGA data for assigned training products |
| `fetch-qualification-units` | Fetching units for a qualification in assigned products |
| `fetch-assessment-conditions` | Viewing assessment conditions for a unit |
| `tga-resolve-product` | Resolving product details when viewing assigned products |

TGA sync functions (`tga-sync-products`, `tga-batch-sync`, `tga-rto-sync`, `tga-check-updates`, etc.) are **not** triggered by this role — they require admin-level access.

### 4. AI Generation (trainer-specific)
Triggered from `/trainer-portal/pd`, `/trainer-portal/profile`, `/trainer-portal/products`, `/complybot`.

| Edge function | Trigger action |
|---|---|
| `generate-pd-recommendations` | AI-generated PD suggestions for the trainer |
| `generate-session-plan` | Generating a session/delivery plan |
| `generate-lln-strategy` | LLN strategy generation for a unit |
| `calendar-ai-suggestions` | AI schedule/calendar suggestions |
| `generate-task-suggestions` | Task suggestions on dashboard |
| `complybot-*` (all complybot functions) | Querying Compliance Intelligence (`/complybot`) |
| `trainer-report-reminders` | Automated reminder emails for trainer reports |
| `assessor_pd_suggestions` (table-driven) | Populated by nightly compute, surfaced on PD page |

### 5. Product Requests
Triggered from `/trainer-portal/products`.

| Edge function | Trigger action |
|---|---|
| `approve-trainer-product-request` | Submitting a request to be added to a training product |
| `training-product-check` | Checking product eligibility/currency for a trainer |
| `tp-product-integrity-scan` | Product integrity validation |

---

## Data requirements per category

### Category 1 — Trainer Profile & Credentials

**Tables:** `trainer_profiles`, `trainer_credentials`, `trainer_currency_evidence`, `trainer_vet_currency`, `trainer_industry_currency`

**Minimum data required:**

| Table | Minimum row | Key columns |
|---|---|---|
| `profiles` | 1 row per user | `id` (matches auth.users.id), `email`, `full_name` |
| `tenant_members` | 1 row | `tenant_id`, `user_id`, `role = 'Trainer/Assessor'` |
| `user_roles` | 1 row | `user_id`, `tenant_id`, `role = 'Trainer/Assessor'` |
| `trainer_profiles` | 1 row | `user_id`, `tenant_id`, `full_name`, TAE qualification code, TAE expiry date |
| `trainer_credentials` | ≥ 1 row (TAE) | `trainer_id` (FK to `trainer_profiles`), `tenant_id`, `credential_type = 'TAE'`, `credential_name`, `issue_date`, `expiry_date` |
| `trainer_vet_currency` | ≥ 1 row | `trainer_id`, `tenant_id`, `activity_type`, `activity_date`, `evidence_description` |
| `trainer_industry_currency` | ≥ 1 row | `trainer_id`, `tenant_id`, `activity_type`, `activity_date`, `evidence_description` |

**Blocked if missing:** Without `trainer_profiles`, the trainer dashboard, profile page, and compliance register all fail. Without at least one `trainer_credentials` row, the nightly cron (`trainer-register-cron`) will flag the trainer as non-compliant.

### Category 2 — Storage / Documents

**Tables:** `evidence_documents`, `trainer_document_items`, `trainer_document_uploads`, `trainer_document_audit`, `documents_register`

**Minimum data required:**

| Table | Minimum row | Key columns |
|---|---|---|
| `evidence_documents` | 0 rows to start (created on upload) | `tenant_id`, `trainer_id`, `document_type`, `file_name` |
| `trainer_document_items` | 0 rows to start | Populated on upload |
| `documents_register` | 0 rows (view is empty until docs exist) | Used for the register view at `/documents-register` |

**Storage bucket:** A Supabase storage bucket must exist and RLS must allow this role to upload to its own trainer folder. See `docs/STORAGE_RLS_FIX.md`.

### Category 3 — TGA Integration

**Tables:** `tga_packages`, `tga_cache`, `tga_companion_cache`, `training_products`, `training_product_units`, `trainer_product_coverage`, `trainer_unit_map`

**Minimum data required:**

| Table | Minimum row | Key columns |
|---|---|---|
| `training_products` | ≥ 1 row | `tenant_id`, `code` (e.g. `BSB50420`), `title`, `status = 'Current'` |
| `training_product_units` | ≥ 1 row | `training_product_id`, `unit_code` (e.g. `BSBLDR501`) |
| `trainer_product_coverage` | ≥ 1 row | `trainer_id`, `training_product_id`, `tenant_id` |
| `trainer_unit_map` | ≥ 1 row per assigned unit | `trainer_id`, `unit_code`, `tenant_id`, `can_train`, `can_assess` |
| `tga_cache` | ≥ 1 row for each unit code | Populated by `tga-unit-lookup`; can be seeded manually or triggered on first lookup |

**Blocked if missing:** Without `trainer_product_coverage`, `/trainer-portal/products` renders empty. Without `trainer_unit_map`, the training matrix and unit-level compliance checks cannot run.

### Category 4 — AI Generation (trainer-specific)

**Tables:** `trainer_session_plans`, `trainer_session_plan_ai_logs`, `trainer_pd`, `trainer_pd_plan`, `pd_recommendations`, `assessor_pd_suggestions`, `ai_usage_tracking`, `ai_suggestions`

**Minimum data required:**

| Table | Minimum row | Key columns |
|---|---|---|
| `trainer_pd` | 0 rows to start (created on first PD log) | `trainer_id`, `tenant_id`, `activity_type`, `activity_date` |
| `trainer_pd_plan` | 0 rows to start | `trainer_id`, `tenant_id` |
| `ai_usage_tracking` | Auto-populated on AI call | `tenant_id`, `user_id`, `function_name`, `tokens_used` |

**Prerequisites for AI functions:** The tenant must have a valid active subscription (enforced by `billing-gate` edge function). AI calls fail if the tenant is on a trial with AI features gated.

### Category 5 — Product Requests

**Tables:** `trainer_product_requests`, `training_products`, `trainer_profiles`

**Minimum data required:**

| Table | Minimum row | Key columns |
|---|---|---|
| `training_products` | ≥ 1 row | Qualifying product must exist to request coverage of it |
| `trainer_profiles` | 1 row | Must exist before a request can be submitted |
| `trainer_product_requests` | 0 rows to start | Created on first request submission |

---

## Seed user template

This is the minimum SQL to create a working Trainer/Assessor user for testing or demo. Run in this order to respect FK constraints. Replace all `<uuid>` placeholders with `gen_random_uuid()` or fixed UUIDs for repeatability.

```sql
-- ============================================================
-- Seed: Trainer/Assessor — minimum viable user
-- Tenant must already exist. Replace <tenant_id> throughout.
-- ============================================================

-- Step 1: Auth user — create via Supabase Admin API or Dashboard
-- email: trainer.assessor@example.com
-- role: authenticated
-- Store the returned auth UUID as <user_id>

-- Step 2: Profile (linked to auth.users)
INSERT INTO profiles (id, email, full_name, role, created_at)
VALUES (
  '<user_id>',
  'trainer.assessor@example.com',
  'Jane Smith',
  'Trainer/Assessor',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Tenant membership
INSERT INTO tenant_members (tenant_id, user_id, role, created_at)
VALUES ('<tenant_id>', '<user_id>', 'Trainer/Assessor', now())
ON CONFLICT DO NOTHING;

-- Step 4: User role
INSERT INTO user_roles (user_id, tenant_id, role, created_at)
VALUES ('<user_id>', '<tenant_id>', 'Trainer/Assessor', now())
ON CONFLICT DO NOTHING;

-- Step 5: Trainer profile (core record — everything else FK's to this)
INSERT INTO trainer_profiles (
  id, user_id, tenant_id, full_name,
  tae_qualification, tae_expiry,
  created_at
)
VALUES (
  '<trainer_profile_id>',
  '<user_id>',
  '<tenant_id>',
  'Jane Smith',
  'TAE40122',
  '2027-12-31',
  now()
)
ON CONFLICT DO NOTHING;

-- Step 6: TAE credential
INSERT INTO trainer_credentials (
  id, trainer_id, tenant_id,
  credential_type, credential_name,
  issue_date, expiry_date,
  created_at
)
VALUES (
  gen_random_uuid(), '<trainer_profile_id>', '<tenant_id>',
  'TAE', 'TAE40122 Certificate IV in Training and Assessment',
  '2022-06-15', '2027-12-31',
  now()
);

-- Step 7: VET currency record
INSERT INTO trainer_vet_currency (
  id, trainer_id, tenant_id,
  activity_type, activity_date, evidence_description,
  created_at
)
VALUES (
  gen_random_uuid(), '<trainer_profile_id>', '<tenant_id>',
  'Professional Development', '2024-09-01',
  'Attended TAE Currency Workshop — 8 hours CPD',
  now()
);

-- Step 8: Industry currency record
INSERT INTO trainer_industry_currency (
  id, trainer_id, tenant_id,
  activity_type, activity_date, evidence_description,
  created_at
)
VALUES (
  gen_random_uuid(), '<trainer_profile_id>', '<tenant_id>',
  'Workplace visit', '2024-11-15',
  'Site visit to industry partner — observed current workplace practices',
  now()
);

-- Step 9: Training product to assign trainer to
-- Skip if a suitable product already exists in the tenant
INSERT INTO training_products (
  id, tenant_id,
  code, title, status,
  created_at
)
VALUES (
  '<training_product_id>', '<tenant_id>',
  'BSB50420', 'Diploma of Leadership and Management', 'Current',
  now()
)
ON CONFLICT DO NOTHING;

-- Step 10: At least one unit for that product
INSERT INTO training_product_units (
  id, training_product_id, unit_code,
  created_at
)
VALUES (
  gen_random_uuid(), '<training_product_id>', 'BSBLDR523',
  now()
)
ON CONFLICT DO NOTHING;

-- Step 11: Assign trainer to the product
INSERT INTO trainer_product_coverage (
  id, trainer_id, training_product_id, tenant_id,
  created_at
)
VALUES (
  gen_random_uuid(), '<trainer_profile_id>', '<training_product_id>', '<tenant_id>',
  now()
)
ON CONFLICT DO NOTHING;

-- Step 12: Unit-level trainer/assessor mapping
INSERT INTO trainer_unit_map (
  id, trainer_id, unit_code, tenant_id,
  can_train, can_assess,
  created_at
)
VALUES (
  gen_random_uuid(), '<trainer_profile_id>', 'BSBLDR523', '<tenant_id>',
  true, true,
  now()
)
ON CONFLICT DO NOTHING;

-- Step 13: Seed one evidence document record (optional — can be uploaded via UI)
INSERT INTO evidence_documents (
  id, tenant_id, trainer_id,
  document_type, file_name, uploaded_at
)
VALUES (
  gen_random_uuid(), '<tenant_id>', '<trainer_profile_id>',
  'TAE certificate', 'TAE40122_Jane_Smith.pdf', now()
)
ON CONFLICT DO NOTHING;
```

### Seed validation checklist
After running the above, verify the user can:
- [ ] Log in and land on `/dashboard/trainer`
- [ ] See their name and TAE qualification on `/trainer-portal/profile`
- [ ] See `BSB50420` listed on `/trainer-portal/products`
- [ ] See `BSBLDR523` in `/trainer-portal/matrix`
- [ ] View (not edit) the TCR register at `/dashboard/registers/tcr`
- [ ] Access `/document-repository` in read-only mode
- [ ] Send a query to `/complybot`
- [ ] Confirm `/dashboard/assessment-validation` is blocked (expected — see nav/permission gap noted above)

### Known gaps / issues flagged

1. **Assessment Validation access gap:** `TRAINER_NAV` includes `/dashboard/assessment-validation` with `readOnly: true`, but `routePermissions` in `roleNavigation.ts` (line ~543) does not list `Trainer/Assessor` in the allowed roles for that route. `canAccessRoute()` will return `false` and the page will be inaccessible despite appearing in the nav. Fix: add `'Trainer/Assessor'` to the `routePermissions` entry for `/dashboard/assessment-validation`, or remove the item from `TRAINER_NAV`.

2. **No separate nav config:** `'Trainer/Assessor'` is aliased to `TRAINER_NAV` — the two roles are functionally identical. If assessor-specific permissions are needed in future (e.g., write access to assessment records), a dedicated `TRAINER_ASSESSOR_NAV` will be required.

3. **`view.qa3` only:** The role grants `view.qa3` but not `view.qa1`, `view.qa2`, or `view.qa4`. Verify whether QA page rendering at the route level enforces these permission keys, and whether the trainer-facing pages are correctly gated to qa3.
```

---
*Generated: 2026-06-05. Sources: roleNavigation.ts, rbac.ts, live Supabase project gdwhlstfguxarnxasrrs.*
