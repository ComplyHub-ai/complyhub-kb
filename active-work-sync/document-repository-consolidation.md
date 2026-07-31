
# Document Repository Consolidation — Living Doc

**Source material:** Angela's team-instructions chat (`support-tickets-triage.md` context),
`ComplyHub_Document_Repository_Consolidation_Plan_3912.md` (updated plan + team instructions),
`ComplyHub Document Repository Consolidation Plan_9994.pdf` (earlier audit-only draft — superseded
by the .md version; kept only for cross-check, not authoritative).

**Project:** `gdwhlstfguxarnxasrrs` ("ComplyHub Project" in Supabase — confirmed via `list_projects`).

**Purpose of this file:** reconcile the two source documents against live database state
(verified 31 Jul 2026 via Supabase MCP `execute_sql`/`list_migrations`/`get_advisors` and a
codebase grep of `rto-compass-hub`) before any team member starts Step 1. This is the
audit/reconciliation pass — no implementation decisions have been locked yet. Work through the
"Open items to decide" section one at a time with Brian; lock decisions into this file as they're
made. Once every item is locked, this file should be readable cold by a fresh session and taken
straight to implementation. Delete after the audit file is produced post-implementation.

---

## 1. What's CONFIRMED accurate (verified live, matches the plan)

- **Project ID** `gdwhlstfguxarnxasrrs` is correct.
- **`documents_register`**: 3,789 rows — exact match.
- **Feature table row counts** — all exact matches:
  `evidence_documents` 290, `trainer_document_uploads` 49, `tas_import_documents` 76,
  `register_evidence_documents` 28, `fpp_declaration_documents` 16, `meeting_documents` 14.
- **Top bucket sizes/object counts** are close (object counts identical; byte totals drifted
  slightly upward since the audit was written, consistent with normal usage — not a red flag):
  `documents` 3,880 objects, `evidence-private` 1,189 (was 1,177 — 12 new since audit),
  `trainer-credentials` 645, `trainer-evidence` 275, `suggestion-attachments` 110, `tas-imports` 77.
- **The 6 `_zz_deprecated_*` tables Angela's status section claims were dropped** —
  `_zz_deprecated_ci_document_links`, `_zz_deprecated_complybot_documents`,
  `_zz_deprecated_tas_document_events`, `_zz_deprecated_fpp_document_reconciliation_issues`,
  `_zz_deprecated_document_revision_events`, `_zz_deprecated_tenant_documents` — confirmed genuinely
  gone; none appear in the live `_zz_deprecated_*` table list. (Note: ~280 *other*
  `_zz_deprecated_*` tables still exist in the DB — a much larger, pre-existing, unrelated
  deprecation graveyard. Out of scope for this project; don't touch.)
- **The 30-bucket empty list in Step 1 of the team-instructions doc is still exactly accurate
  today** — re-ran the same `LEFT JOIN`/`IS NULL` query live and got the identical 30 bucket IDs,
  same list, zero drift since the audit. Safe to proceed with Step 1 as written, no new re-check
  needed beyond what's already in the doc.
- **`sec.has_tenant_role()` and `sec.superadmin_tenant_gate()`** both exist live (confirmed via
  `pg_proc`) — the RLS pattern the plan wants to model Phase 2 on is real and usable, not aspirational.
- **`trainer_evidence_tenant_scope_*` policies** are confirmed live as RESTRICTIVE on
  `storage.objects` for `trainer-evidence` — genuinely the one bucket with the target pattern
  already in place, as claimed.
- **Documents FK graph**: `documents_register.id` is already referenced by 6 other tables
  (`complybot_prompts`, `doc_review_actions`, `document_standards_mapping`, `document_versions`,
  `document_register_links`, and itself via `parent_document_id`) — confirms `documents_register`
  is already a real FK target, consistent with the plan's "canonical table" framing. **None of the
  6 named feature tables** (`evidence_documents`, `trainer_document_uploads`,
  `tas_import_documents`, `register_evidence_documents`, `fpp_declaration_documents`,
  `meeting_documents`) have an FK to `documents_register.id` yet — Phase 1's "add missing FK" work
  is real and still fully outstanding, not partially done.

---

## 2. What's WRONG or STALE in the source docs — corrections needed before anyone starts

### 2.1 Bucket count is off — 55 total, not 54, and post-deletion will be 25, not 24
Live count: **55 buckets today**, not 54. 30 are empty (list matches Step 1 exactly), so there are
**25 active buckets**, not 26. After the 30 empty ones are dropped, the total will be **25, not
24** as Step 2 of the team doc predicts. Minor, but update the verification query's expected
number before anyone runs it and gets confused by a mismatch.

### 2.2 `branding_logos` does NOT have a working RESTRICTIVE policy — the audit's claim is wrong
Both source docs claim `trainer-evidence` and `branding_logos` "do have a proper RESTRICTIVE
policy closing them off... that pattern works and should be the template." Live RLS check confirms
this is **only true for `trainer-evidence`**. `branding_logos` has no RESTRICTIVE policy at all —
it's only reachable via the legacy `storage_objects_select` PERMISSIVE mega-policy, which grants
public unauthenticated read to `branding_logos` (bundled with `branding`, `avatars`,
`organisation-assets`, `organization-assets`, `organization-logos`, `public-assets` in one PERMISSIVE
public-read OR-branch). That's arguably fine for a logos bucket (public read is often intentional
for branding assets) but it is **not** the tenant-scoped RESTRICTIVE template the plan claims exists
for it — don't cite `branding_logos` as a second working example when modelling Phase 2's policy;
`trainer-evidence` is the only proven template.

### 2.3 One dead RLS policy branch references a bucket that no longer exists
The legacy `storage_objects_select`/`storage_objects_insert`/`storage_objects_update`/
`storage_objects_delete` mega-policies still contain an OR-branch for bucket_id =
`'evidence-attachments'`. That bucket **does not exist** in `storage.buckets` at all (confirmed —
not in the 25 active or 30 empty lists, and a direct `SELECT` for it returns nothing). This is
harmless dead code today (an OR-branch that can never match), but it's a concrete example of the
exact drift problem the project is trying to fix, and it's a freebie to strip out whenection2 4 (mega-policy
drop) happens.

### 2.4 `document_type` and `linked_register_type` are plain `text` columns with NO enum or CHECK
constraint — Phase 1's "confirm enum values cover every use case" step, as worded, doesn't apply
Both source docs describe `document_type` + `linked_register_type` as if they're governed by an
enum or CHECK constraint whose values need confirming before folding tables in. Live schema check:
neither is a Postgres enum (`pg_enum` returns nothing for either name), and the only CHECK
constraint on `documents_register` governs `quality_area` (`Q1`/`Q2`/`Q3`/`Q4`/`CR`/`CP`), not
`document_type`. **`document_type` is free text today, and it's messy**: 31 distinct values in
production data, with clear casing duplicates — `Form`/`form` (779 vs 10), `Policy`/`policy` (501
vs 8), `Checklist`/`checklist` (18 vs 395, lowercase dominant here unlike the others), `Plan`/`plan`
(250 vs 3), `Agreement`/`agreement` (208 vs 1), `Guide`/`guide` (129 vs 4), `Procedure`/`procedure`
(15 vs 4), `Template`/`template` (3 vs 2), plus one row with a combined value
`"policy, procedure"`. `other` is the single largest value at 1,129 rows (30% of the table).

**`linked_register_type` is 100% NULL across all 3,789 rows** — it has never actually been used.
The plan's framing ("columns that already exist for exactly this purpose") is technically true
(the column exists) but misleading — there's no existing convention to follow, no enum to confirm,
and no live usage pattern to preserve. Phase 1 needs to **design and add** a real constraint (a
CHECK constraint or a proper Postgres enum) for both columns, including a decision on how to
canonicalize the 31 free-text `document_type` values (case-fold + merge duplicates would take it to
~23 values), not merely "confirm" something that already governs the data — because nothing does.

### 2.5 The `documents_register` double-nested path bug affects 36 rows, live-verified
Both docs describe the bug qualitatively but give no count. Live query
(`file_path LIKE tenant_id || '/' || tenant_id || '/%'`) confirms **36 rows** currently have the
`{tenant_id}/{tenant_id}/{filename}` double-nesting bug out of 3,789 total (~1%). Small, contained,
consistent with "a bug to fix in the same pass," not a systemic issue.

### 2.6 Biggest gap in both source docs: the frontend already talks to storage directly in
at least 23 places — "mostly a rename" undersells Phase 3/4 significantly
Both docs' target architecture states "Frontend never talks to storage directly... it only ever
gets a row from its own tenant's `documents_register` rows." **This is not the current state.** A
grep of `rto-compass-hub/src` for `.storage.from(` found direct Supabase Storage calls in
**23 frontend files**, including `Documents.tsx`, `ClientDocumentRepository.tsx`,
`TenantDocuments.tsx`, `TrainerDocumentsTab.tsx`, `BrandingUploader.tsx`,
`AssessmentToolForm.tsx`/`AssessmentToolDetail.tsx`, `useTasImport.ts`, `useQiEvidenceUpload.ts`,
`useRegisterEvidence.ts`, `useComplyBotDocuments.ts`, `useTrainerOnboarding.ts`,
`useOrgSettings.ts`, `useWHSSubmission.ts`, `storageDownload.ts`, `HistoryTab.tsx`,
`EnhancedComplyBotWidget.tsx`, `OrgIdentityCard.tsx`, `SuggestionDrawer.tsx`, `SuggestionsForm.tsx`,
`session-plans.tsx`, `AdminSettings.tsx`. Separately, **6 edge functions**
(`document-file-manager`, `fpp-evidence-manager`, `register-evidence-manager`,
`branding-logo-manager`, `mailgun-inbound`, `analyze-documents-batch`) already do server-side
storage access, which *is* consistent with the target model — those are fine as-is or as a
template.

**Practical effect:** "repoint frontend reads" in Phase 3 is not a trivial follow-on step — it's a
real, scoped frontend refactor across ~23 files to route them through `documents_register` +
signed URLs instead of calling `.storage.from()` directly, for every bucket being consolidated.
This should be its own explicitly-scoped and estimated piece of work, not an afterthought bullet
in the data-migration phase. Recommend surfacing this to Angela as a scope/timeline correction
before Phase 3 starts.

---

## 3. Not independently verified this pass (flag, don't assume)

- **`get_advisors` (security)** output was too large to pull inline this pass (2.2MB) — wasn't
  fetched/read. Before Phase 4 ("Update `get_advisors` baseline"), someone should actually pull and
  read it filtered to storage/RLS-related findings, not assume it's clean.
- **Migration history** (`list_migrations`) wasn't fully read this pass (190KB, saved to a
  tool-results file but not walked line by line) — the facts above come from live `information_schema`/
  `pg_catalog`/`pg_policies` state, which is more authoritative than migration history for "what's
  true right now" anyway, so this doesn't block proceeding — just noting it wasn't exhaustively
  cross-checked against git-tracked migration files in `rto-compass-hub/supabase/migrations/`.

---

## 4. Open items to decide (work one at a time, lock into this file as each is settled)

- [x] **Step 1 — delete 30 empty buckets.** LOCKED 31 Jul 2026 — confirmed accurate, no changes
  needed (§1). Ready to hand to anyone with dashboard access. Only requirement: re-run Step 1's own
  empty-bucket query immediately before deleting, per its own instruction, as a final safety check.
- [x] **Step 2 — verify count.** LOCKED 31 Jul 2026 — live count is 55 total buckets (not 54), 30
  empty, 25 active. Update the verification query's expected post-deletion count to **25**, not 24,
  before anyone runs it (§2.1).
- [ ] **Step 3 / Phase 1 — schema hardening.** Scope needs updating per §2.4/§2.5. Three sub-items:

  - [x] **(a) Fix 36 double-nested rows — LOCKED 31 Jul 2026.** Live-verified via a join against
    `storage.objects`: for all 36 affected `documents_register` rows, the actual storage object
    physically exists at the doubled path (`{tenant_id}/{tenant_id}/{filename}`) — NOT at the clean
    single-nested path. Confirmed zero objects exist at the single-nested path for any of these
    rows. All 36 rows belong to a single tenant (`cdacfec1-b04c-404e-aebc-418300f7879f`), consistent
    with one bad import/migration event for that org rather than a scattered recurring bug.

    **Locked fix procedure (do NOT deviate — a plain SQL UPDATE will break these documents):**
    1. For each of the 36 rows, call the Supabase Storage API's move/rename operation to relocate
       the object from `{tenant_id}/{tenant_id}/{filename}` to `{tenant_id}/{filename}` in its
       bucket. Plain `UPDATE storage.objects SET name = ...` must NOT be used — that only rewrites
       the database record and does not move the underlying object in the storage backend, which
       would desync the DB from the real object and break every download for these 36 documents.
    2. Only after each move succeeds, update that row's `documents_register.file_path` to the new
       single-nested path so it matches where the file now actually lives.
    3. Verify each of the 36 documents downloads correctly post-fix, as a real tenant user (not
       SuperAdmin), per the standing rule in §5.
    4. Re-run the original detection query (`file_path LIKE tenant_id || '/' || tenant_id || '/%'`)
       afterward to confirm zero rows remain.

  - [x] **(b1) `document_type` constraint — LOCKED 31 Jul 2026.** Decision: use a **CHECK
    constraint, not a Postgres enum**. Reasoning: an enum requires a code deploy every time a new
    document type is needed; a CHECK constraint can be altered directly via SQL/migration without a
    frontend/backend release. Given this is an RTO compliance platform where new document
    categories can emerge from regulatory changes, the CHECK constraint's easier extensibility was
    judged more valuable than the enum's stricter type-safety.

    Live full value breakdown at time of decision (`select document_type, count(*) from
    documents_register group by document_type order by count(*) desc`), 31 distinct values, 3,789
    rows total:
    other 1129, Form 779, Policy 501, checklist 395, Plan 250, Agreement 208, Register 154,
    Guide 129, Report 79, certificate 48, Checklist 18, TAS Document 16, Procedure 15, Handbook 13,
    form 10, policy 8, Log 5, Presentation 5, procedure 4, guide 4, Template 3, plan 3, Schedule 2,
    Tracker 2, template 2, Matrix 2, agreement 1, "policy, procedure" 1, schedule 1, tool 1,
    Workforce Plan 1.

    **Canonical value set — locked, Title Case, casing duplicates merged (31 raw values → 20
    canonical values):** Other, Form, Policy, Checklist, Plan, Agreement, Register, Guide, Report,
    Certificate, TAS Document, Procedure, Handbook, Log, Presentation, Template, Schedule, Tracker,
    Matrix, Assessment.

    **CORRECTION added 31 Jul 2026, after the above was first locked:** a code grep (not just the
    live-data audit) turned up `document_type: 'Assessment'` already wired into
    `src/hooks/useAssessmentToolRegister.ts:441` — written automatically whenever a tenant publishes
    a tool via the Assessment Tool Register feature. Zero production rows currently hold this value,
    which is exactly why it was missing from the original live-data-only audit (§2.4) and the first
    version of this canonical list — the feature exists and is wired, it just hasn't been used yet
    in any tenant. Grepped the rest of `src/` and `supabase/functions/` for every other
    `document_type: '...'` literal to check for further gaps: `EnhancedDocumentUploadForm.tsx` and
    `DocumentUploadStep2.tsx` only set empty-string placeholders, `DocumentGenerationSection.tsx`
    writes `'TAS Document'` (already on the list), and `seed-demo-data/index.ts` writes `'policy'`
    (already maps to `Policy`) — no other gaps found. **Anyone implementing the CHECK constraint
    must use the 20-value list above (with Assessment), not the original 19-value list** — the
    19-value version would break the Assessment Tool Register feature the first time any tenant
    uses it.

    **Exact migration mapping for every raw value (case-sensitive, apply as a data backfill UPDATE
    before adding the CHECK constraint):**
    - other → Other (kept as genuine fallback category — 1,129 rows / 30% is real content, not a
      data error, do not eliminate this category)
    - Form → Form, form → Form
    - Policy → Policy, policy → Policy
    - checklist → Checklist, Checklist → Checklist
    - Plan → Plan, plan → Plan
    - Agreement → Agreement, agreement → Agreement
    - Register → Register
    - Guide → Guide, guide → Guide
    - Report → Report
    - certificate → Certificate
    - TAS Document → TAS Document
    - Procedure → Procedure, procedure → Procedure
    - Handbook → Handbook
    - Log → Log
    - Presentation → Presentation
    - Template → Template, template → Template
    - Schedule → Schedule, schedule → Schedule
    - Tracker → Tracker
    - Matrix → Matrix
    - "policy, procedure" (the one combined-value row) → Policy
    - tool (one-off, no clear matching category) → Other
    - Workforce Plan (one-off) → Plan

    **Implementation order for whoever picks this up:** (1) run the backfill UPDATE per the mapping
    above so every row holds a canonical Title Case value, (2) verify `select document_type,
    count(*) from documents_register group by document_type order by count(*) desc` returns exactly
    the 19 canonical values with no others, (3) only then add the CHECK constraint
    (`document_type IN ('Other','Form','Policy','Checklist','Plan','Agreement','Register','Guide',
    'Report','Certificate','TAS Document','Procedure','Handbook','Log','Presentation','Template',
    'Schedule','Tracker','Matrix')`), (4) update any frontend dropdown/select that writes
    `document_type` to only offer these 19 values going forward.

  - [x] **(b2) `linked_register_type` constraint — LOCKED 31 Jul 2026.** Checked
    `rto-compass-hub/TODO.md` and `.lovable/plan.md` for any planned-but-not-yet-coded register
    types — both are stale and reference nothing relevant to this decision, so no additional values
    to plan around from those sources.

    **Decision: CHECK constraint allowing exactly the 3 known values — `assessment_tool`,
    `adc_register`, `third_parties`.** Do not invent room for hypothetical future values; only add a
    new one when a real feature is actually built for it (same easy-to-extend CHECK-constraint
    reasoning as (b1)).

    Values and their source (found by code grep, not live data — all 3 currently have zero
    production rows, since none of these features have been used by a real tenant yet):
    - `assessment_tool` — written by `src/hooks/useAssessmentToolRegister.ts:471` when a tenant
      publishes an assessment tool (same underlying feature as the 'Assessment' `document_type`
      correction in (b1)). A partial unique index already exists for this value specifically:
      `supabase/migrations/20260618022200_assessment_tools_documents_link.sql` (unique on
      `tenant_id, linked_register_type, linked_register_id` where both are not null).
    - `adc_register` — read via a `.or(...)` filter in
      `src/hooks/compliance/useComplianceRequirementsEvidenceSignals.ts:622`.
    - `third_parties` — read via a `.or(...)` filter in the same file, line 728.

    **Mandatory pre-deploy step (not yet done — do this before writing the CHECK constraint
    migration):** re-grep the codebase specifically for `.eq('linked_register_type'` and
    `.filter('linked_register_type'` patterns, in addition to the literal-string-assignment grep
    already done — a different code pattern could reference this column in a way the original grep
    didn't match. Two real gaps were already found and corrected during this audit (the 'Assessment'
    `document_type` value in (b1), and these 3 `linked_register_type` values here) purely because a
    live-data-only audit missed features that are wired in code but not yet used by any tenant — so
    treat the current 3-value list as the best answer found so far, not a guaranteed-complete one.

    **Mandatory post-deploy step: burn-in monitoring.** After the CHECK constraint is live, check
    Supabase logs (`get_logs` / `get_advisors`) for constraint-violation errors on
    `documents_register` for a short burn-in period (at least one to two weeks of real tenant
    activity) rather than assuming the grep-derived list is complete. If a genuinely missed value
    surfaces as a blocked insert, extend the CHECK constraint immediately — this is a deliberately
    cheap, low-risk fix specifically because a CHECK constraint (not an enum) was chosen in (b1)/
    (b2). A blocked insert with a clear database error is the intended fallback if this audit missed
    a fourth value, and is a far better failure mode than a feature silently breaking unnoticed.

  - [x] **(c) Add FKs from the feature tables to `documents_register.id` — LOCKED 31 Jul 2026.**

    **CORRECTION found during this lock — the plan's table list was wrong for the trainer-documents
    case:** `trainer_document_uploads` (one of the original 6 named tables) is NOT a per-document
    table — checked its schema and its only reader (`src/components/trainers/
    TrainerDocumentApprovalQueue.tsx`) and confirmed it's a batch/session tracker (`file_count`,
    `processed_count`, `approved_count`, `rejected_count` — no `file_path` at all). The real
    per-document table for this feature is a separate table, `trainer_document_items` (100 rows,
    parented to `trainer_document_uploads` via `upload_job_id`), which the original plan never
    named at all.

    **Bigger find:** `trainer_document_items` already has a column `published_to_register_id`
    (uuid) — clearly intended by its name to link to `documents_register.id` — but it has NO
    foreign key constraint today (confirmed via `pg_constraint`), and it is never read or written
    anywhere in the frontend (only appears in the generated `types.ts`, not in any hook/component).
    0 of its 100 rows are populated. This looks like an abandoned partial implementation, not a
    fresh greenfield need.

    **Checked the other 5 originally-named tables for the same trap — none found.**
    `evidence_documents`, `fpp_declaration_documents`, `meeting_documents`,
    `register_evidence_documents`, `tas_import_documents` were all confirmed via schema + code-usage
    check to be genuine per-document tables (each has its own `file_path`/`storage_path` +
    `file_name`, each is queried directly by its feature's hooks/components, none hides behind a
    separate batch/session table). Safe to proceed with these 5 as originally scoped.

    **Locked decision:**
    1. For the 5 confirmed-correct tables (`evidence_documents`, `fpp_declaration_documents`,
       `meeting_documents`, `register_evidence_documents`, `tas_import_documents`): add a new
       nullable column `documents_register_id uuid REFERENCES documents_register(id)` to each,
       plus an index on it, in a DDL-only migration per the standing DDL/DML-split rule (§5).
    2. For the trainer-documents feature: do NOT add a 6th/new column and do NOT touch
       `trainer_document_uploads` (it's the wrong table, leave it alone) — instead **finish wiring
       up the existing `trainer_document_items.published_to_register_id` column**: (a) add the
       missing `REFERENCES documents_register(id)` foreign key constraint to it in the same
       DDL migration as the other 5, (b) as a separate follow-up implementation task (not schema
       work), wire the actual application code — likely in
       `src/components/trainers/TrainerDocumentApprovalQueue.tsx` or
       `src/hooks/useTrainerOnboarding.ts` — to populate `published_to_register_id` when a trainer
       document is approved/published, since this never happens today. Rationale for reusing the
       existing column rather than adding a new one alongside it: the column is already correctly
       named and clearly intended for exactly this purpose; adding a second, similar column next to
       a dead one would recreate the exact kind of confusion this whole consolidation project
       exists to remove.
    3. None of the 5 confirmed tables have an existing FK to `documents_register.id` today
       (confirmed live) — this work is fully new for all of them, not partially done.
- [ ] **Step 4 / Phase 2 — new buckets + RLS pattern.** `trainer-evidence`'s
  `trainer_evidence_tenant_scope_*` policies remain the one confirmed-working template — don't
  also cite `branding_logos` (§2.2). Also strip the dead `evidence-attachments` OR-branch (§2.3)
  when rewriting the mega-policies, since it'll be touched in this phase anyway.
  Build as a Cursor Plan Mode prompt, Angela sign-off before Implement Mode, per standing workflow.
- [x] **Step 5 / Phase 3 — data migration — frontend-refactor scope LOCKED 31 Jul 2026.** Object
  migration order (largest/most-correct first) is unchanged and still makes sense:
  1. `documents` (3,880 objects) → `tenant-documents`
  2. `evidence-private` (1,189 objects, was 1,177 at audit time) → `tenant-documents`
  3. `trainer-credentials` (645) → `tenant-documents`
  4. `trainer-evidence` (275) → `tenant-documents`
  5. Remaining active buckets, smallest first

  **CORRECTION found while scoping the frontend refactor (§2.6 undersold this):** the 23 files
  that call `.storage.from(...)` directly touch **17 distinct buckets**, not just the 4 explicitly
  sequenced above. The other 13 — `evidence`, `tenant_docs`, `complybot-uploads`,
  `organisation-assets`, `evidence-complybot`, `organization-logos`, `user-avatars`,
  `branding_logos`, `branding`, `meeting-documents`, `suggestion-attachments`,
  `tenant-evidence-private`, `qi-evidence` — were never mapped to specific files anywhere in the
  original plan. Full per-file bucket mapping (grepped live 31 Jul 2026, `.storage.from(` +
  operation type):

  | File | Bucket(s) | Operation(s) |
  |---|---|---|
  | `src/pages/Documents.tsx` | `documents` | remove |
  | `src/components/admin/tenants/TenantDocuments.tsx` | `documents` | remove |
  | `src/lib/utils/storageDownload.ts` | `documents` (special-cased) + all others (fallback) | download |
  | `src/hooks/useAssessmentToolRegister.ts` | `evidence-private` | remove |
  | `src/pages/registers/assessment-tools/components/AssessmentToolForm.tsx` | `evidence-private` | upload |
  | `src/pages/registers/assessment-tools/components/AssessmentToolDetail.tsx` | `evidence-private` | createSignedUrl |
  | `src/components/trainers/TrainerDocumentsTab.tsx` | `trainer-credentials`, `trainer-evidence` | list |
  | `src/hooks/useTrainerOnboarding.ts` | `trainer-evidence` | remove |
  | `src/hooks/useTasImport.ts` | `tas-imports` | remove |
  | `src/pages/trainer-portal/session-plans.tsx` | `evidence` | createSignedUrl |
  | `src/hooks/useWHSSubmission.ts` | `evidence` | upload, getPublicUrl |
  | `src/components/documents/ClientDocumentRepository.tsx` | `tenant_docs` | remove |
  | `src/hooks/useComplyBotDocuments.ts` | `complybot-uploads` | remove |
  | `src/components/ComplyBot/EnhancedComplyBotWidget.tsx` | `evidence-complybot` | getPublicUrl |
  | `src/components/consultant/OrgIdentityCard.tsx` | `organisation-assets` | getPublicUrl |
  | `src/pages/settings/AdminSettings.tsx` | `organization-logos`, `user-avatars` | getPublicUrl |
  | `src/hooks/useOrgSettings.ts` | `branding_logos` | remove |
  | `src/components/settings/BrandingUploader.tsx` | `branding` | getPublicUrl, remove |
  | `src/components/governance/tabs/HistoryTab.tsx` | `meeting-documents` | remove |
  | `src/components/SuggestionsForm.tsx` | `suggestion-attachments` | upload |
  | `src/components/SuperAdmin/SuggestionDrawer.tsx` | `suggestion-attachments` | createSignedUrl, upload |
  | `src/hooks/useRegisterEvidence.ts` | `tenant-evidence-private` (via `const BUCKET`) | remove |
  | `src/hooks/useQiEvidenceUpload.ts` | `qi-evidence` (via `const BUCKET`) | remove |

  **Grouped by operation type for effort/priority — lock this grouping as the sub-step
  breakdown:**
  1. **Delete-only (12 files)** — lowest risk/effort: `Documents.tsx`, `TenantDocuments.tsx`,
     `useAssessmentToolRegister.ts`, `useTrainerOnboarding.ts`, `useTasImport.ts`,
     `ClientDocumentRepository.tsx`, `useComplyBotDocuments.ts`, `useOrgSettings.ts`,
     `BrandingUploader.tsx` (also has a read op, counted below too), `HistoryTab.tsx`,
     `useRegisterEvidence.ts`, `useQiEvidenceUpload.ts`.
  2. **Read/link-only — getPublicUrl or createSignedUrl (7 files)** — medium effort:
     `AssessmentToolDetail.tsx`, `session-plans.tsx`, `useWHSSubmission.ts` (also uploads),
     `EnhancedComplyBotWidget.tsx`, `OrgIdentityCard.tsx`, `AdminSettings.tsx`,
     `BrandingUploader.tsx`. **`storageDownload.ts` already implements the target pattern for the
     `documents` bucket specifically (routes through `document-file-manager` edge function instead
     of raw SDK) — extending that same routing to cover other consolidated buckets is a genuine
     shortcut that could fix the read/download side for several of these files at once, cheaply,
     rather than fixing each file individually.**
  3. **Upload (4 files)** — highest genuine effort, since this is where a file is first created and
     linked: `AssessmentToolForm.tsx`, `useWHSSubmission.ts`, `SuggestionsForm.tsx`,
     `SuggestionDrawer.tsx`.
  4. **List/browse (1 file)** — most invasive of all: `TrainerDocumentsTab.tsx` — enumerates a
     bucket folder directly, which is precisely the pattern this whole consolidation project exists
     to remove; needs replacing with a query against `documents_register` rows instead of a live
     storage listing.

  **Lower-priority / possibly-reduced-scope group:** `OrgIdentityCard.tsx`, `AdminSettings.tsx`
  (organization-logos/user-avatars), `useOrgSettings.ts`, `BrandingUploader.tsx` touch
  branding/logo/avatar buckets already confirmed public-read-by-design (§2.2) — not a security gap,
  so these four may not need the same tenant-scoping rework as the rest; treat as lower priority
  pending a scope call, not automatically in-scope for the security-driven part of this work.

  **Standing constraint for whoever implements this (Brian's explicit instruction, 31 Jul 2026): the
  plan above must be followed exactly as scoped — do not change or break anything else in the
  codebase, and do not change or break anything user-facing.** Any deviation from this file-by-file
  scope, or any behavior change beyond routing storage access through `documents_register` +
  signed URLs, must be flagged and confirmed before implementing — not decided unilaterally
  mid-implementation.
- [ ] **Step 6 / Phase 4 — decommission — TO BE CONTINUED, NEXT ACTION.** As written, plus
  actually pull and read `get_advisors` (security) filtered to storage findings before declaring it
  clean (§3), rather than assuming. **This is the only remaining open item in this document — every
  other step (1 through 5) is locked.** Whenever this file is opened or mentioned in a future
  session, pulling and reading `get_advisors` filtered to storage/RLS findings is the first thing to
  do, before anything else in this document.

---

## 5. Standing rules carried forward unchanged from both source docs

- Audit-before-author on every step — don't trust this file's numbers either, once time has passed;
  re-verify live before writing any migration.
- DDL and DML in separate migrations, ~50-object batches per migration.
- Test every RLS change as a tenant-scoped Trainer/Assessor or Administrator user, never SuperAdmin
  only.
- Announce each `apply_migration` in the team channel before running; wait for ack if someone else
  is mid-migration on related tables.
- `NOTIFY pgrst, 'reload schema'` after every bucket/table change.
- Nothing gets dropped until the replacement is verified working end-to-end from a real tenant
  login, not a SuperAdmin session.
- Per this workspace's interim migration procedure (`CLAUDE.md`): `supabase db push` is currently
  unusable due to unrelated pre-baseline ledger drift — apply each migration's SQL via
  `execute_sql`, then hand Brian the `supabase migration repair` command per file. Don't use
  `apply_migration` for anything that has a corresponding file in `supabase/migrations/`.
