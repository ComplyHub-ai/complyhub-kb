# ComplyHub — Seed Data Plan

**Goal:** A working `supabase/seed.sql` on `fix/local-run` that creates one test user per role, test tenants, and enough realistic data so every role's key features can be QA'd against the branch DB.

**Status:** Steps 1–4 complete. **RJ picks up at Step 5.**

---

## Confirmed facts (do not re-investigate)

**Canonical role values to use in all seed data** — these are what the live `tenant_members` table stores right now and what RLS policies evaluate against:

| Role | Stored value |
|---|---|
| Super Administrator | `super_admin` |
| Administrator | `Administrator` |
| Governing Person | `Governing Person` |
| Compliance Manager | `Compliance Manager` |
| Trainer / Assessor | `Trainer/Assessor` |
| Student Support Officer | `Student Support Officer` |
| Consultant | `Consultant` |

**Note on the enum migration:** A `app_role` enum exists in the DB but is incomplete — it is missing `Governing Person`, `Trainer/Assessor`, `Student Support Officer`, and `Consultant`. Do not seed against the enum. Use the Title Case strings above. When Dave completes the enum migration, seed.sql will need updating.

**Branch DB project ID:** `agcdvmrwzzgnlmfyrxtb` (QA environment)
**Production DB project ID:** `gdwhlstfguxarnxasrrs` (read-only reference)

---

## Step 1 — DONE ✅

Confirmed canonical role names from live production DB. See above.

---

## Step 2 — DONE ✅

7 parallel agents mapped every role's routes, edge function categories, and data requirements.
Output: `docs/role-maps/` (in this repo) — one file per role.

---

## Step 3 — DONE ✅

Cross-checked all 7 role maps against Carl's 17 QA categories.
Output: `docs/role-maps/qa-protocol-crosscheck.md`
Key finding: Carl's minimal seed spec is missing 5 users and 13 tables. Full gap list is in the crosscheck file.

---

## Step 4 — DONE ✅

Read-only queries against production DB confirmed exact column names, types, NOT NULL constraints, enum values, and FK-safe insert order for all 23 seed entities.
Output: `docs/role-maps/data-shapes.md`
**Critical corrections vs role-map templates** — read data-shapes.md before writing any SQL:
- `tenant_scope_items.scope_state` = `'registered'` (not `'current'`)
- `trainer_unit_map.capability` = enum `'S'`/`'K'`/`'BOTH'` (not booleans)
- `trainer_credentials` requires `credential_category` NOT NULL
- `trainer_vet_currency` requires `activity_name` + `vet_or_industry` NOT NULL
- `governing_persons.person_id` = UUID FK to user (not a text name)
- `feature_visibility` has NO `tenant_id` — global table
- `compliance_clauses` (71 rows) and `training_products` (2,110 rows) already seeded by migration — do NOT re-seed

---

## Step 2 — Role Feature Mapping (multi-agent)

**What this step is:** 7 parallel agents — one per role — each doing a deep dive to map what that role can do, what edge functions it triggers, and what data those functions need to run. This is NOT a bug hunt (that was the role-audit). This is a positive blueprint: "what does this role need to exist in the DB for its features to work end-to-end?"

**Output folder:** `c:\Users\brian\complyhubworkspace\role-maps\`
**One file per role** — these become the direct input to the seed template in Step 5.

**How to run:** Open `claude agents` in the terminal, paste each prompt below, press Enter after each. Fire all 7 back-to-back.

---

### Agent 1 — Super Administrator

```
Your job is to map what the SUPER ADMINISTRATOR role (super_admin) needs in order to work end-to-end in ComplyHub. This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then answer these questions for the super_admin role:
1. What routes and nav sections can this role reach? List every path.
2. What is read-only vs read-write for this role?
3. Which QA Protocol edge function categories (from QA_PROTOCOL.md) does this role trigger? List category name and function count.
4. For each category this role triggers, what DB tables and minimum data must exist for those functions to run without errors?
5. What does a realistic seed user look like for this role? (email format, profile fields needed, tenant assignment if any)

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\super-admin.md using this structure:
# Role Map — Super Administrator
## Routes & access
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user template
```

---

### Agent 2 — Administrator

```
Your job is to map what the ADMINISTRATOR role (stored value: 'Administrator') needs in order to work end-to-end in ComplyHub. This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then answer these questions for the Administrator role:
1. What routes and nav sections can this role reach? List every path.
2. What is read-only vs read-write for this role?
3. Which QA Protocol edge function categories (from QA_PROTOCOL.md) does this role trigger? List category name and function count.
4. For each category this role triggers, what DB tables and minimum data must exist for those functions to run without errors?
5. What does a realistic seed user look like for this role? (email format, profile fields, tenant membership row, billing/subscription state needed)

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\administrator.md using this structure:
# Role Map — Administrator
## Routes & access
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user template
```

---

### Agent 3 — Compliance Manager

```
Your job is to map what the COMPLIANCE MANAGER role (stored value: 'Compliance Manager') needs in order to work end-to-end in ComplyHub. This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then answer these questions for the Compliance Manager role:
1. What routes and nav sections can this role reach? List every path.
2. What is read-only vs read-write for this role?
3. Which QA Protocol edge function categories does this role trigger? List category name and function count.
4. For each category this role triggers, what DB tables and minimum data must exist for those functions to run without errors? Focus especially on: compliance registers, CI engine, audit engine, TAS builder, governance.
5. What does a realistic seed user look like for this role?

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\compliance-manager.md using this structure:
# Role Map — Compliance Manager
## Routes & access
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user template
```

---

### Agent 4 — Trainer / Assessor

```
Your job is to map what the TRAINER/ASSESSOR role (stored value: 'Trainer/Assessor') needs in order to work end-to-end in ComplyHub. This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then answer these questions for the Trainer/Assessor role:
1. What routes and nav sections can this role reach? List every path.
2. What is read-only vs read-write for this role?
3. Which QA Protocol edge function categories does this role trigger? Focus on: TAS Builder, Storage/Documents, TGA Integration, AI Generation (trainer-specific).
4. For each category this role triggers, what DB tables and minimum data must exist? Focus on: trainer profile, credentials, currency records, assigned training products, evidence documents.
5. What does a realistic seed user look like for this role?

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\trainer-assessor.md using this structure:
# Role Map — Trainer / Assessor
## Routes & access
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user template
```

---

### Agent 5 — Student & Student Support Officer

```
Your job is to map what the STUDENT and STUDENT SUPPORT OFFICER roles (stored values: 'Student Support Officer' — note Student has no live users yet) need in order to work end-to-end in ComplyHub. This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then answer these questions for both roles:
1. What routes and nav sections can each role reach? List every path per role.
2. What is read-only vs read-write for each?
3. Which QA Protocol edge function categories do these roles trigger?
4. For each category, what DB tables and minimum data must exist? Focus on: student enrolment records, support cases, at-risk interventions, SSO work queue, monthly packs.
5. What does a realistic seed user look like for each role?

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\student-support.md using this structure:
# Role Map — Student & Student Support Officer
## Routes & access (per role)
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user templates
```

---

### Agent 6 — External Roles

```
Your job is to map what the EXTERNAL roles need in order to work end-to-end in ComplyHub. The roles are: Governing Person (stored: 'Governing Person'), Consultant (stored: 'Consultant'), Regulatory Officer (note: no live users in DB — this role may be unfinished). This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then for each role answer:
1. What routes and nav sections can this role reach? List every path.
2. What is read-only vs read-write?
3. Which QA Protocol edge function categories does this role trigger?
4. What DB tables and minimum data must exist for those functions? Note any roles that appear to have no real functionality (portals with hardcoded KPIs, thin wrappers) — mark those as "seed placeholder only, no live functions."
5. What does a realistic seed user look like for each role?

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\external-roles.md using this structure:
# Role Map — External Roles (Governing Person, Consultant, Regulatory Officer)
## Per-role routes & access
## Read-only vs read-write
## Edge function categories triggered
## Data requirements per category
## Seed user templates
## Roles flagged as placeholder only
```

---

### Agent 7 — Employer & Third Party

```
Your job is to map what the EMPLOYER and THIRD PARTY roles need in order to work end-to-end in ComplyHub (stored values: 'Employer' and 'Third Party' — note: neither has live users in the DB yet). This is NOT a bug hunt — it is a feature and data mapping exercise. Read the following files first:
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\config\roleNavigation.ts
- c:\Users\brian\complyhubworkspace\rto-compass-hub\docs\QA_PROTOCOL.md
- c:\Users\brian\complyhubworkspace\rto-compass-hub\src\lib\rbac.ts

Then for each role answer:
1. What routes and nav sections can this role reach?
2. Are these portal pages live (real DB queries) or placeholder (hardcoded data)? Check the actual page components under src/pages/admin/portals/ and src/pages/ for employer/third-party paths.
3. Which QA Protocol edge function categories do these roles trigger, if any?
4. What DB tables and minimum data would these roles need IF their features were live?
5. What does a seed user look like for each role — even if the features are placeholder?

Write your findings to c:\Users\brian\complyhubworkspace\role-maps\employer-third-party.md using this structure:
# Role Map — Employer & Third Party
## Routes & access (per role)
## Live vs placeholder assessment
## Edge function categories triggered
## Data requirements (if live) or placeholder note
## Seed user templates
```

---

## Step 3 — Cross-check QA Protocol (after Step 2 agents complete)

Once all 7 role-map files are written, come back to this chat and say:
> "Role maps are done — cross-check with QA protocol."

Claude will read all 7 role-map files and lay them over `docs/QA_PROTOCOL.md` to produce a single gap table:
- Which QA categories are covered by the seed data the role maps describe
- Which categories are blocked by missing secrets (Stripe, Mailgun, Anthropic) vs missing data
- Which roles have no live edge functions (seed placeholder only)

**Output:** A gap analysis fed back into this chat — no new files at this stage.

---

## Step 4 — Production data shapes (read-only DB, after Step 3)

Claude queries the production DB (`gdwhlstfguxarnxasrrs`, read-only) to see what real records look like for each entity the seed needs — TAS, tenant, trainer credentials, governance meetings, invitations, etc.

No data is copied. We are reading the shape (columns, required fields, relationships) so the seed data looks realistic and satisfies RLS policies.

**Output:** Data shape notes fed into Step 5 — no separate files.

---

## Step 5 — Write seed.sql draft ← RJ STARTS HERE

**All research is done. Read these three files before writing a single line of SQL:**
1. `docs/role-maps/README.md` — orientation and confirmed role name values
2. `docs/role-maps/qa-protocol-crosscheck.md` — what the seed must cover and why
3. `docs/role-maps/data-shapes.md` — exact column names, types, constraints, insert order

Claude writes `supabase/seed.sql` on `fix/local-run` covering:

- 2 test tenants (one active subscription, one trial)
- One seed user per confirmed role with the correct Title Case role value
- Minimum data per role journey as identified in Steps 2–4
- Comments marking which sections need updating post-enum migration

**Output:** `rto-compass-hub/supabase/seed.sql` committed to `fix/local-run`.

---

## Step 6 — Review (Carl + Dave)

Before any execution:
- **Dave** reviews seed.sql for RLS compliance, correct tenant_id references, and migration compatibility
- **Carl** confirms branch DB vault secrets (Stripe test, Mailgun sandbox, Anthropic dev key) are seeded
- Any changes come back to `fix/local-run` as a follow-up commit

---

## Step 7 — Execution (Carl or Dave)

`supabase db reset` run against the branch DB (`agcdvmrwzzgnlmfyrxtb`).
This is NOT Khian's job to execute — flag for Carl or Dave to run.
After execution, QA Protocol categories 1–6 (the critical path) can begin.

---

## Who owns what

| Step | Owner | Gate before next step |
|---|---|---|
| 1 — Role names confirmed | ~~Khian~~ **Done** | ✅ |
| 2 — Role feature maps | ~~Khian~~ **Done** | ✅ |
| 3 — QA protocol cross-check | ~~Khian~~ **Done** | ✅ |
| 4 — Production data shapes | ~~Khian~~ **Done** | ✅ |
| 5 — seed.sql draft | **RJ** | Read data-shapes.md first |
| 6 — Review | Carl + Dave | Step 5 committed |
| 7 — Execution | Carl or Dave | Step 6 approved |

---

## Output files summary

| Step | File | Location | Status |
|---|---|---|---|
| 2 | `README.md` | `docs/role-maps/` | ✅ Done |
| 2 | `super-admin.md` | `docs/role-maps/` | ✅ Done |
| 2 | `administrator.md` | `docs/role-maps/` | ✅ Done |
| 2 | `compliance-manager.md` | `docs/role-maps/` | ✅ Done |
| 2 | `trainer-assessor.md` | `docs/role-maps/` | ✅ Done |
| 2 | `student-support.md` | `docs/role-maps/` | ✅ Done |
| 2 | `external-roles.md` | `docs/role-maps/` | ✅ Done |
| 2 | `employer-third-party.md` | `docs/role-maps/` | ✅ Done |
| 3 | `qa-protocol-crosscheck.md` | `docs/role-maps/` | ✅ Done |
| 4 | `data-shapes.md` | `docs/role-maps/` | ✅ Done |
| 5 | `seed.sql` | `supabase/` | ⏳ RJ's task |
