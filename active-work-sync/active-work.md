# Active Work — THE LEDGER (source of truth)

> Parked findings and follow-ups for a **later session** — not current in-progress work.
> Promote to a real task only via a new FRAME. See `CLAUDE.md` § "The Loop."

Last updated: 07 August 2026

---

## Backlog — PARKED findings (NOT scheduled work)

_Adjacent issues surfaced during work but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

- **PR #385 post-merge — manual QA + 14-day soak** — prod migrations, object copy (110 files), edge
  deploy, and DML backfills all applied 06 Aug 2026 (detail in `last.md` and audit index
  `complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`; soak schedule in
  `document-repository-consolidation.md`). **Still Brian-gated:** manual QA as
  **non-SuperAdmin** tenant user (admin logo, GP org logo, onboarding logo, avatar upload; confirm
  Trainer/Student cannot write branding); **soak until ~20 Aug 2026** on source buckets
  (`branding`, `organisation-assets`, `avatars`, `dap-documents`, `industry-evidence`) before
  decommission; `organization-logos` (4 orphan objects) decommission after soak + explicit approval.
- **`TrainerCredentialForm.tsx` has a cross-tenant-shaped storage scoping bug** — found 05 Aug 2026 while
  auditing the `compliance-evidence` bucket for the remaining-18-bucket migration
  (`fix/storage-migration-remaining-buckets` branch). `fetchUploadedFiles()` calls
  `.storage.from('compliance-evidence').list('validation-evidence/')` with NO tenant or record scoping at
  all — every tenant using this form lists and signs URLs against the same shared flat folder. Live RLS
  check: `compliance_evidence_select` requires the path's first segment to cast to a valid tenant `uuid`,
  but `validation-evidence` isn't a UUID, so the cast would error for any non-super-admin — meaning these
  files may already be functionally broken (inaccessible) rather than actively leaking, but this was NOT
  confirmed via a live multi-tenant test. Also calls `getPublicUrl()` against this bucket, which is
  private — same dead-URL pattern already fixed elsewhere in this project. Deliberately NOT migrated as
  part of the bucket consolidation — the real per-tenant `{tenant}/{record}/...` files in this bucket were
  migrated normally; the flat `validation-evidence/` files were left in place rather than moving
  genuinely-unscoped, ownerless data into the new shared bucket. Needs a real redesign of how this form
  fetches/scopes its uploaded files (add tenant_id + record scoping to both the upload path and the list
  call) — not a quick fix, not part of the storage migration.
- **ComplyBot chat file attachments are not wired to the AI at all** — found 05 Aug 2026 while auditing
  the `evidence-complybot` storage bucket for the remaining-18-bucket migration
  (`fix/storage-migration-remaining-buckets` branch). `EnhancedComplyBotWidget.tsx` uploads the file and
  displays it as a link in the chat, but its `sendMessage()` never passes the file (or its URL) into the
  `callAI()` request — only chat text goes through. `ai-router/index.ts` does have attachment-handling
  code, but it expects a completely different shape (inline base64 `content`, not a storage URL) and even
  then only tells the AI a document with this name/size was attached — it explicitly does not analyze
  content ("Full document content analysis requires the document parsing service... not built yet"). The
  only persistence anywhere is an `admin_audit` log entry recording document names/count/size, not content.
  Pre-existing gap, not a regression from the storage migration — attaching a file to ComplyBot today does
  not help the AI answer anything about that file. Needs its own product/engineering scoping (whether and
  how to actually wire attached-file content into the AI request) — not a quick fix, not part of the
  storage migration.
- **Two governance write functions are anon-executable SECURITY DEFINER** —
  `gov_set_trainer_report_exemptions` and `gov_update_meeting_time` allow an unauthenticated caller to
  invoke a security-definer write. Surfaced 22 Jul 2026 during Group 8 of the migration-drift
  reconciliation (see `reconciliationwork.md`), but these functions sit outside the 138-item baseline
  itself — a genuinely new finding, not baseline drift. Needs a dedicated follow-up: read both
  functions' full bodies, confirm what an anonymous caller can actually do (caller-supplied tenant_id/
  meeting_id with no ownership check?), then revoke anon execute if unwarranted — same pattern as
  `revoke_anon_execute_billing_rpcs`. Lower-severity companions also anon-executable but read-only:
  `get_clause_heatmap_data`, `get_clause_heat_timeline`, `get_clause_heatmap_trend`,
  `get_clause_signals`, `notify_meeting_scheduled`.
- **19 migrations merged to `main` but never applied to production** (ops/deploy gap, not a code
  defect). Date range 25 May–19 Jul 2026 — all recent, none Lovable-era. Surfaced during PR #259's
  REVIEW via the Migration Drift Check; recount on 20 Jul 2026 after correcting for version-timestamp
  drift (Supabase records actual execution time, not filename time) — original figure of 81 was
  overcounted. Needs its own dedicated pass: batch-verify each one's actual DB state vs. expected,
  then apply via MCP `apply_migration`, in dependency order. Full list captured in the 20 Jul 2026
  conversation / CI log for PR #259.
- **213 production migration records with no corresponding local file** (undocumented direct-to-prod
  changes), dated 25 May–17 Jul 2026. Recount on 20 Jul 2026 after correcting for version-timestamp
  drift — original figure of 286 was overcounted. Needs investigation per the reconciliation-migration
  procedure in `supabase/migrations/CLAUDE.md`.
- **`qi_annual_register` missing from git — branch DB fails at QI phase-0 remap** — found 06 Aug 2026
  while validating branch DB after PR #385 merge. `20260805081059_qi_phase0_remap_register_ids.sql` (on
  `main`, pre-dates storage work) runs `UPDATE ... FROM public.qi_annual_register` but the table was
  created in production only (ledger `20260617223949` / `20260619050843` in `.drift-baseline.txt`) with
  no matching migration files in git. Fresh branch DBs error `relation "public.qi_annual_register" does
  not exist`; production likely already has the table and applied the remap. **Fix (later session,
  separate `fix/*` PR):** backdated reconciliation migrations per `supabase/migrations/CLAUDE.md` —
  `20260617223949_create_qi_annual_register_table.sql` (`CREATE TABLE IF NOT EXISTS`, DDL from prod or
  `types.ts`) and `20260619050843_add_asqa_report_columns_to_qi_annual_register.sql` (`ADD COLUMN IF NOT
  EXISTS`); post-merge `migration repair` for those versions; reset/recreate any branch DB that failed at
  `81059`. Not part of PR #385 scope.
- **Reconciliation follow-up queue** — 7 items in `reconciliationwork.md` § "Remaining work queue";
  item 1 (`sa_extend_trial_v2` guards) investigation complete, migration plan ready, awaiting sign-off
  (parked since 22 Jul 2026).
- **`training_product_units` reference data is 96% empty across production** — root cause of a data-loss-shaped bug in `rpc_bulk_upsert_trainer_units` that was fixed 07 Aug 2026 (see commit `f7fbcc79b` + migration `20260807124853_fix_rpc_bulk_upsert_trainer_units_missing_reference_data.sql`, on branch `fix/document-register-storage-and-attachments-batch`). 3,428 of 3,567 `training_products` rows have zero linked `training_product_units` rows; one real tenant (`a6a60268…`) has literally none for any of its 97 qualifications. The RPC fix means missing reference data no longer silently discards trainer unit assignments — units for a qualification with no data loaded now save anyway and are reported as "unverified" rather than blocked. But the underlying gap remains: ComplyHub has no unit-of-competency mapping loaded for the vast majority of qualifications, so the relevance guard can't actually do its intended job (flag genuinely wrong units) for those qualifications — it can only pass everything through. Needs a dedicated data-population effort (bulk import `training_product_units` from TGA / training.gov.au per qualification) — not a code fix, out of scope for a bug-fix PR. Scope/owner/priority not yet decided.

## Diagnosis + Implementation Plans — LOCKED, ready for implementation in a new chat (07 Aug 2026)

> Diagnosis-only pass per Brian's request — no code edited, no migrations applied, no commits made.
> Items 1-4 are LOCKED (Brian has reviewed and approved each plan below) — a new chat with no prior
> context can pick this file up cold and implement items 1-4 directly, one FRAME each, without needing
> to re-diagnose. Item 5 is CLOSED (no action needed). Item 6 is PARKED for a separate dedicated batch.

### 1. TrainerCredentialForm.tsx cross-tenant storage scoping bug — LOCKED

Root cause confirmed real via code + live RLS read. `src/components/forms/TrainerCredentialForm.tsx` uploads to `compliance-evidence/validation-evidence/<file>` (lines 262-270) with no tenant/record scoping, lists that same flat shared folder in `fetchUploadedFiles()` (lines 207-214), and calls `getPublicUrl()` on a *private* bucket (lines 275-277, dead-URL pattern). Live RLS policy `compliance_evidence_select` requires the first path segment to cast to a `uuid` tenant_id — `validation-evidence` fails that cast, meaning the 9 existing flat objects are likely already inaccessible (broken, not just shared) rather than actively leaking.

This exact bug is **already documented** in migration `20260805060601_add_validation_reports_path_role_grant.sql`'s header comment (05 Aug 2026), which deliberately deferred it as a separate fix and logged it to this same ledger.

**Confirmed 07 Aug 2026: NOT caused by the document-repository-consolidation migration (PR #385).** This bug has existed in the form's own upload code since it was written — the 05 Aug 2026 migration that documents it was unrelated work that happened to notice a pre-existing bug in a different bucket while passing through, not something that migration introduced.

**LOCKED plan — Option B (remove duplicate, not patch), approved by Brian 07 Aug 2026:** The form already renders a second, correctly-scoped upload widget (`RegisterEvidenceUpload`, lines 640-647) using the canonical tenant/record-scoped hook pattern. Delete the broken legacy path entirely: `handleFileUpload`, `fetchUploadedFiles`, the manual "Supporting Evidence" file list UI (lines 579-627), `uploadedFiles` state, and `evidence_upload_url` field wiring — rely solely on `RegisterEvidenceUpload`. ~120 lines removed, no new migration needed (existing RLS already accepts `{tenant_id}/{recordId}/...` shape).

**Fallback — Option A (in-file fix, if Option B is rejected):** Rewrite path to `${effectiveTenantId}/${initialData?.id ?? 'new'}/${fileName}`, scope `.list()` the same way, replace `getPublicUrl()` with `createSignedUrl()` (pattern already used elsewhere in the same file at lines 220-222).

**Open risk requiring a human decision (Dave/Angela):** the 9 pre-existing flat objects in `compliance-evidence/validation-evidence/` are "genuinely unscoped, ownerless" per the 05 Aug migration's own conclusion — before any deletion/migration of those objects, need to determine per-object tenant ownership (e.g. cross-reference `trainer_credentials.evidence_upload_url` values against filenames) — out of scope for the component-level code fix.

**Scope:** single file, no DB changes for the code fix itself. Blast radius: any in-progress edit on a `trainer_credentials` record using the legacy uploader will lose its file-list view (files were arguably already unreadable via RLS anyway).

---

### 2. ComplyBot chat attachments not wired to AI — LOCKED

`EnhancedComplyBotWidget.tsx`'s `sendMessage()` (lines 466-470) never includes attachment data in the `callAI()` context — only `tenantId`/`pageContext` are sent, despite `attachedFiles` being fully uploaded/signed/displayed in the UI. `supabase/functions/ai-router/index.ts` (lines 630-748) has attachment-handling code, but expects inline base64 `content` (not a storage URL), and its own comment at line 745 admits "Full document content analysis requires the document parsing service... not built yet." Currently 100% dead code since the widget sends nothing.

**No new parsing service needed** — the codebase already has a proven pattern for Claude-native document/image analysis: `supabase/functions/analyze-credential-certificate/index.ts` (lines 43-74, 201-220) downloads from Storage, base64-encodes via `_shared/base64.ts`, and sends as a Claude `document`/`image` content block. Same pattern reused in 8+ other edge functions (analyze-resume, ai-matrix-extract, extract-assessment-tool-fields, etc.).

**LOCKED plan — two PRs in sequence, approved by Brian 07 Aug 2026:**
- **PR 1 (small, near-zero risk):** Wire the currently-dead metadata pass-through. In `EnhancedComplyBotWidget.tsx` `sendMessage()` (~line 466-470), add `attachments: currentAttachments.map(f => ({name, url, type, size}))` to the `context` object. In `ai-router/index.ts` (lines 630-748), change expected shape from base64 `content` to `url`, drop the misleading "not built yet" wording, keep it as metadata-only guidance (matches today's actual behavior, just no longer silently dropped).
- **PR 2 (medium, real content analysis):** Extend `ai-router/index.ts` to `fetch()` each attachment's signed URL, base64-encode, and build a Claude `document`/`image` content block attached to the user's actual message (not just system prompt) — reusing `_shared/base64.ts` and the `analyze-credential-certificate` pattern. PDF/image only (Claude's document block doesn't support DOCX — exclude DOCX from real analysis or add a conversion step later). **Must extract this into a new `supabase/functions/ai-router/attachments.ts` helper module** rather than adding more inline code — `ai-router/index.ts` is already ~1116 lines, over the repo's ~500-line/function guidance, and this must not make that worse. Preserve the existing role-gate (lines 644-693) faithfully inside the new module.

**Scope:** 2 files for PR 1 (small), same 2 files + 1 new helper module for PR 2 (medium). No DB/migration changes.

---

### 3. Document Register bulk-delete orphaned-files bug — LOCKED

**Toast timing confirmed:** the success toast (`src/pages/admin/DocumentsRegister.tsx:1036-1050`) fires only *after* the full sequential 374-call file-cleanup loop resolves — the await chain is unbroken from `handleBulkDelete` → `mutateAsync` → `bulkDeleteDocuments()` → `deleteBulkDocumentFilesAfterRows()` → `deleteFiles()`. There is no `toast.loading(...)` progress indicator during the ~4-5 minute loop (unlike the upload flow, which does use one), so a user watching an apparently-idle UI for minutes has good reason to close the tab, which is the most likely explanation for the 257/374 partial completion (each per-file call is already individually try/caught, so a single failure shouldn't have silently stopped the loop — an interruption from outside the loop, e.g. tab close/nav-away/session drop, is more likely than an unhandled error).

**LOCKED fix — batch the storage delete instead of one-file-per-HTTP-call, approved by Brian 07 Aug 2026 (parallel work with other items is fine):** Supabase Storage's `remove()` already accepts up to 1000 paths in a single call; the current code calls it with an array of length 1, 374 times, for no structural reason.
- `supabase/functions/document-file-manager/index.ts` (new action alongside existing `'delete'` block at lines 282-292): add `'delete_batch'` accepting `paths: string[]` (capped at 1000, same `canWriteDocumentFile` role gate reused), call `adminClient.storage.from(BUCKET).remove(paths)` once, diff `paths` against the returned `data` array to report which specific paths failed (not all-or-nothing).
- `src/lib/documentFiles.ts`: add `deleteDocumentFilesBatch({tenantId, paths})` near existing `deleteDocumentFiles` (lines 147-164); keep the sequential version for other callers (e.g. `downloadDocumentFiles`) untouched.
- `src/hooks/useBulkDeleteDocuments.ts:65`: minimal-surface change — swap the injected `deleteFiles` callback from `deleteDocumentFiles` to `deleteDocumentFilesBatch`. No change needed to `documentsRegisterLogic.ts`'s DB-first ordering/contract (that reasoning is untouched by batching the storage side).
- This collapses ~4-5 minutes / 374 round-trips down to ~1 round-trip (~1s), nearly eliminating the interruption window.

**Residual risks to carry into implementation:** batch `remove()` is not transactional (partial failure still possible — must still surface a `failed: string[]` via the existing `resolveBulkDeleteToast` warning path, unchanged); a single batch call can still be interrupted mid-flight (much smaller window, not literally zero); new edge function action must sit inside the existing auth-gate chain (JWT → tenant_members → `canWriteDocumentFile`), reusing already-resolved `profileRole`/`membership`, not re-deriving it.

**Scope:** 3 files (1 edge function, 1 lib, 1 hook), no migration. This is the highest-value fix of the six — directly closes a data-loss-shaped bug that already caused an incident.

---

### 4. `qi_annual_register` missing from git — LOCKED, confirmed NOT already resolved by past PRs

`.drift-baseline.txt` confirms both versions (`20260617223949`, `20260619050843`) as known production-only orphans. **Important: the first diagnosis pass drafted DDL/RLS policies from `types.ts` alone and got the policies wrong — a live `information_schema`/`pg_policies`/`pg_constraint` query was run afterward and is the corrected, authoritative version below.**

**Checked 07 Aug 2026 against git history per Brian's request** ("I think I already resolved that, check past PRs"): two relevant reconciliation commits exist — `aea28da14` ("storage bucket repoints... + QI migration drift reconciliation", 06 Aug 2026) reconciled the 9 QI **phase0/1/2 campaign** migrations (`qi_phase0_*`, `qi_phase1_*`, `qi_phase2_*`, dated 05 Aug 2026), and `ea589f22d` ("reconcile 7 orphaned production migrations") reconciled Help Centre + billing-gate batches. **Neither touched `20260617223949` or `20260619050843`** — confirmed via `git log --all -p` on `.drift-baseline.txt`, which still lists both versions as unresolved. This item is a genuinely separate, still-open gap from the ones already fixed that week — not a duplicate of already-completed work.

Verified live schema facts (NOT matching the types.ts-only draft):
- `status` column default is `'in_progress'` (not `'draft'`), with a CHECK constraint: `status = ANY(ARRAY['in_progress','ready_for_review','submitted'])`
- Two UNIQUE constraints: `(tenant_id, custom_id)` and `(tenant_id, survey_year)`
- FKs: `tenant_id → tenants(tenant_id) ON DELETE CASCADE`; `created_by`/`updated_by`/`asqa_submitted_by` → `auth.users(id)`
- RLS (row security enabled) uses real live policies, NOT generic tenant_members-role checks: `qi_annual_register_select` (`sec.is_super_admin() OR sec.is_tenant_member(tenant_id)`), `qi_annual_register_insert`/`_update` (`sec.has_tenant_role(tenant_id, ARRAY['Administrator','Compliance Manager'])`), `qi_annual_register_delete` (`sec.is_super_admin() OR sec.has_tenant_role(tenant_id, ARRAY['Administrator'])`), plus a `billing_gate` ALL-command policy (`sec.user_in_tenant(tenant_id) AND sec.tenant_is_active(tenant_id)`), a RESTRICTIVE `restrict_sa_select_qi_annual_register` (`sec.superadmin_tenant_gate(tenant_id)`), and RESTRICTIVE write-lock policies on insert/update/delete (`NOT sec.is_tenant_write_locked(tenant_id)`).

**LOCKED plan, approved by Brian 07 Aug 2026:** write two backdated migration files matching this verified live DDL exactly (not the types.ts-only draft):
- `supabase/migrations/20260617223949_create_qi_annual_register_table.sql` — full `CREATE TABLE IF NOT EXISTS` with all columns/defaults/constraints/FKs above, `ENABLE ROW LEVEL SECURITY`, and every policy listed above recreated with `DROP POLICY IF EXISTS` guards.
- `supabase/migrations/20260619050843_add_asqa_report_columns_to_qi_annual_register.sql` — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for the 5 `asqa_*` columns only.
- Post-merge: do **not** re-run this DDL against production (it already exists there) — only repair the ledger: `supabase migration repair --status applied 20260617223949` then `...20260619050843`, then verify via `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version IN (...)`.
- Also reset/recreate any branch DB that failed at migration `20260805081059` once these two land (that migration self-guards with `IF to_regclass(...) IS NULL THEN RETURN`, so it currently no-ops safely rather than hard-failing — worth confirming this against the original "fails at phase-0 remap" report before treating it as urgent).
- Prune both versions (`20260617223949`, `20260619050843`) out of `.drift-baseline.txt` once reconciled — same cleanup pattern `ea589f22d` used for its 6 resolved rows.

**Scope:** 2 new migration files (DDL matches existing prod state, no functional change), plus 2 `migration repair` commands run by Brian from his terminal post-merge, per the interim procedure. No new tables/data actually created in production — purely ledger reconciliation.

---

### 5. Anon-executable governance functions — CLOSED, no action needed

Read both full function bodies (`gov_set_trainer_report_exemptions`, `gov_update_meeting_time`) via live `pg_get_functiondef` — both are `SECURITY DEFINER` but **both explicitly check `auth.uid() IS NULL` and raise `unauthenticated`** as their first action, so even if anon-executable at the GRANT level, an anonymous (no-JWT) caller could not get past that check.

More importantly: a direct live query of `has_function_privilege()` for `anon` against all 7 functions named in this ledger item (`gov_set_trainer_report_exemptions`, `gov_update_meeting_time`, `get_clause_heatmap_data`, `get_clause_heat_timeline`, `get_clause_heatmap_trend`, `get_clause_signals`, `notify_meeting_scheduled`) shows **`anon` currently has NO execute privilege on any of them** — all 7 return `can_exec: false` for `anon`, `true` for `authenticated` only.

**Conclusion: this ledger item's premise no longer matches live production state.** Either the anon grants were already revoked at some point after 22 Jul 2026 (e.g. as part of a later migration cleanup) without the ledger being updated, or the original finding was already incorrect. Either way, **no anon-execute revocation work is needed right now** — recommend closing this ledger item rather than scheduling a fix, but leave a note to spot-check `revoke_anon_execute_billing_rpcs`-style migrations to confirm which migration (if any) already fixed this, for the team's own record.

**Scope:** none — investigation-only outcome, no code/migration change needed.

---

### 6. Migration drift recount (19 unapplied / 213 orphaned) — PARKED for a separate dedicated batch (per Brian, 07 Aug 2026)

Full recount against live `list_migrations` + local `supabase/migrations/*.sql` + `.drift-baseline.txt`:
- **"Merged but never applied to production"**: **214** (was 19) — 208 of these are still the original 25 May–19 Jul 2026 backlog, untouched by the 06 Aug 2026 PR #385 production-apply run (which only cleared the newest batch through `20260806121200`); 6 more have accumulated since 22 Jul 2026. This is NOT a shrinking problem — the backlog is essentially unchanged and 6 new items have piled on top.
- **"Production records with no local file"** (restricted to the original 25 May–19 Jul 2026 window): **218** (was 213) — roughly stable, normal drift growth. A separate, much larger pre-25-May-2026 Lovable-era population (3,046 more) is the already-known ~2,000+ item reconciliation project documented in `supabase/migrations/CLAUDE.md` — explicitly NOT part of this count.
- Full list of all 214 pending-apply migration files (in dependency order) saved to `complyhub-kb/audit/2026-08-07_migration-drift-recount-pending-apply-list.txt` (copied out of session scratchpad so it survives past this session).
- **Cross-referenced against `.drift-baseline.txt` directly (07 Aug 2026):** zero version overlap between the 214 pending-apply list and the baseline's 517 entries, as expected since they track opposite directions of drift (git-has-file-prod-doesn't vs. prod-has-version-git-doesn't). More importantly, `.drift-baseline.txt` itself is now stale — it stops at version `20260713222509` (~13 Jul 2026), while 174 of the 214 pending-apply files are dated after that (14 Jul–05 Aug 2026). Refreshing the baseline file is its own small sub-task to fold into the dedicated session below.

**PARKED plan (Brian confirmed 07 Aug 2026 this will be a separate batch, not part of this implementation round):** this needs its own dedicated session per the existing rule in `supabase/migrations/CLAUDE.md` — batch-verify each of the 214 files' actual DB state, then apply via MCP in dependency order (only for genuinely-new schema; be alert for any that, like item 4, may already exist in production under a different reconciliation path), AND refresh `.drift-baseline.txt` itself. Not something to fold into a normal PR. Schedule as its own FRAME when ready.

**Scope:** dedicated session, not a quick fix — do not attempt inline.

---

## Context
Tenant: Australian Institute of Accreditation Pty Ltd (`tenant_id = aca3d0ab-b1e7-4b70-9d27-f4b8efd5f46a`), project `gdwhlstfguxarnxasrrs` (ComplyHub Project).

Triggered by: AJ (consultant, aj@vivacity.com.au) noticed all this tenant's Document Register entries were gone. Investigated as a possible regression from PR #384 — **ruled out** (PR #384 merged 2026-08-06 01:13 UTC; the incident happened 2026-08-05 02:43:07 UTC, a full day earlier, and PR #384 never touched `documents_register`, `TenantDocuments.tsx`, or `useTenantDocumentsRegister`).

## What actually happened
- `erin@aia.edu.au` (Administrator on this tenant) ran a bulk-delete in the Document Register UI.
- `document_audit_log` shows 374 rows deleted from `documents_register`, all stamped `metadata: {"bulk_delete": true}`, all at the same insert timestamp `2026-08-05 02:43:07.114268+00`.
- All 374 database rows are confirmed gone (`select count(*) from documents_register where tenant_id = 'aca3d0ab-...'` → 0).
- But storage still had 124 orphaned objects under `tenant-documents/aca3d0ab-.../` with no matching register row. 117 of those were flat-path Document Register uploads (`{tenantId}/{timestamp}-{uuid}-{filename}`); the other 7 are under `trainers/.../evidence/` — a different, unrelated feature (trainer credential uploads) that is **also separately orphaned** against `trainer_document_items`, cause not yet investigated, out of scope for this ticket.
- I hard-deleted the 117 Document Register orphans from storage on 2026-08-06 via the Storage API (`DELETE /storage/v1/object/tenant-documents` with a `prefixes` list) after confirming via `supabase.com/docs/guides/storage/management/delete-objects` that raw SQL delete against `storage.objects` does NOT free the underlying object — only the Storage API does. Confirmed clean afterward (0 flat-path files remaining, 7 trainer files untouched).

## Root cause (confirmed via Supabase logs, not just code reading)
Code path: `src/hooks/useBulkDeleteDocuments.ts` → `bulkDeleteDocuments()`:
1. Inserts audit-log entries for all documents being deleted.
2. Calls `deleteBulkDocumentFilesAfterRows()` (`src/pages/admin/documentsRegisterLogic.ts:107`), which:
   a. `await deleteRows()` — a single fast `DELETE ... WHERE id IN (...)` against `documents_register`. **This step is fast, atomic, and irreversible.**
   b. Then `await deleteFiles({ tenantId, paths })` → `deleteDocumentFiles()` (`src/lib/documentFiles.ts:147`), which loops `for (const p of args.paths) { await deleteDocumentFile(...) }` — **one HTTP round-trip per file, sequential, not parallel/batched.** Each call hits the `document-file-manager` edge function (action: delete), which does the actual `storage.remove([path])` server-side.

Checked `get_logs(service: 'edge-function')` for the 20-minute window around 2026-08-05T02:43:07Z: only **one** `document-file-manager` invocation appears in that whole window (at 02:45:09Z, ~2 min after the DB delete), when **374** were needed for the cleanup loop to fully run. Sampled execution time for that one call was ~753ms — at that rate, 374 sequential calls would take roughly 4-5 minutes to complete.

374 rows were deleted but only 117 of the corresponding files were left orphaned (374 − 117 = 257 file-delete calls apparently succeeded before something stopped the loop). This pattern — partial completion, no error surfaced, nothing resumed — is consistent with the browser tab being closed, navigated away from, refreshed, or losing network partway through the multi-minute serial cleanup loop. There is no persistence/resume mechanism for step 2 if it's interrupted: the DB half is already committed and irreversible by the time file cleanup even starts, and whatever files haven't been reached yet when the tab dies are stranded forever with **no error shown to the user and no retry**.

## Not yet confirmed / next steps
1. **Whether the UI shows a "success" toast before or after the file-cleanup loop finishes.** If the toast fires as soon as `bulkDeleteDocuments()` resolves (i.e., after cleanup), the user wouldn't be able to close the tab "too early" under normal UI feedback — meaning the interruption was more likely an actual crash/nav-away/refresh mid-loop, not a race with the success message. If the toast is optimistic and fires early (e.g., driven by the DB delete alone or a different code path), that's a separate contributing bug worth flagging. Check the component that calls `useBulkDeleteDocuments()` (likely in or near `src/pages/Documents.tsx`) for the `onSuccess`/toast wiring.
2. **No fix has been designed or applied yet** — this handover is diagnosis only. Candidate directions (not decided, for discussion):
   - Make storage cleanup resumable/idempotent from a durable list (e.g., a small "pending deletion" table) instead of an in-memory JS loop, so a page refresh doesn't strand files.
   - Batch the storage delete calls (the Storage API's `remove()` accepts up to 1000 paths in one call) instead of one HTTP round-trip per file — this alone would cut a 4-5 minute operation down to near-instant and drastically shrink the interruption window.
   - Reverse the order: clean up storage first, delete DB rows only after storage cleanup confirms success (matches the pattern already used in `TenantDocuments.tsx`'s admin-panel delete handlers, which do storage-then-DB) — though note the code comment in `documentsRegisterLogic.ts` explains DB-first was a deliberate choice to avoid leaving register rows pointing at already-deleted files; any fix needs to reconcile with that reasoning rather than just flipping the order back.
   - Add a background reconciliation job that periodically finds storage objects with no matching register row (per tenant, via the same path-prefix / `documents_register.file_path` join used in this investigation) and either alerts someone or auto-cleans after a grace period.
3. **The 7 trainer-evidence orphans are a separate, unrelated bug** (different table, different upload path) — worth its own investigation, not folded into this one.

## Key files
- `src/hooks/useBulkDeleteDocuments.ts`
- `src/pages/admin/documentsRegisterLogic.ts` (`deleteBulkDocumentFilesAfterRows`, `assertBulkDeleteRowCount`)
- `src/lib/documentFiles.ts` (`deleteDocumentFile`, `deleteDocumentFiles`)
- `supabase/functions/document-file-manager/index.ts` (server-side delete action, line ~282-292)
- Whatever page/component in `src/pages/` actually invokes `useBulkDeleteDocuments()` — not yet located, needed to check toast timing (see next step 1 above)