# ayohonatoni.md — Full Feature Audit Log

> **Audit log — read-only scan, no changes made, nothing committed/pushed.**
> **Date:** 20 August 2026 · **Repo state:** `rto-compass-hub` `main` @ `44b47c63a` (worktree C, clean)
> **Scope:** TAS Builder · Trainers Matrix · Industry Consultation · Assessment Validation — endpoint-to-endpoint traces (UI → hook → PostgREST/RPC → edge function → DB table/RLS → back)
> **Method:** 4 read-only Scout passes + primary-session verification of every high-severity finding against actual files (hooks, migrations, config.toml, edge functions). Live-DB items that cannot be proven statically are marked **[live-check]**.
> **Excluded:** Worktree A's uncommitted WIP on `fix/tas-consultation-sync-link-types` (audit covers merged `main` only).

---

## 0. Director Frame (as classified at audit start)

```
Classification:  Full scan + audit of 4 features (frontend + edge functions + DB/RLS surface)
Tier:            3/4 (multi-system, production behavior, read-only)
Worktree:        C (rto-compass-hub-C, main @ 44b47c63a) — worktree A left untouched (dirty WIP)
IN SCOPE:        TAS Builder, Trainers Matrix, Industry Consultation, Assessment Validation
                 — full endpoint-to-endpoint trace, nothing assumed
OUT OF SCOPE:    editing/fixing anything, other features, worktree A WIP branch
Delegation:      4 read-only Scout agents (one per feature) + own verification reads
Approval needed before edits:  n/a — audit only; any future fix requires a new FRAME + approval
```

---

# 1. TAS BUILDER

## Feature surface

| Surface | Path |
|---|---|
| Entry pages | `src/pages/tas/engine/index.tsx` (TAS Quality Engine, 2881 ln), `src/pages/tas/builder/index.tsx` (legacy builder), `src/pages/tas/builder-sandbox/index.tsx` (AI sandbox builder) |
| Register pages | `src/pages/tas/TasRegistryPage.tsx`, `TasLibraryPage.tsx`, `TasFinalPacksPage.tsx`, `TASPortfolioIntelligence.tsx`, `EvidenceLibraryPage.tsx`, `TrainingProductsPage.tsx`, `TrainingProductTransitionsPage.tsx` |
| Routes | `/dashboard/tas/builder`, `/dashboard/tas-engine`, `/dashboard/registers/tas`, `/dashboard/tas/transitions` |
| Hooks | `useTasRegistry`, `useCreateTasBuild`, `useTASBuilderState`, `useTasBuilderRecord`, `useTasAutosave`, `useTASExport`, `useTASApproval` (+`useTASApprovalGate`), `useUnifiedApprovalGate` (dead), `useApprovalPack` (dead), `useTasConsultationLinks`, `useIndustryConsultationActions`, `useTrainerHealthCheck`, `useTASVersioning`, `useTASVersions` (legacy), `useAutoBuildPipeline`, `useMicroTASGenerator`, trainer-matrix hooks |
| Edge functions | `tas-create`, `generate-tas-section`, `tga-sync-products`, `tas-export-pdf`, `tas-export-data`, `tas-ai-engine`, `tas-goal-prefill`, `tas-market-justification-narrative`, `tas-cohort-profile-narrative`, `tas-audit-simulate`, `tas-redteam-simulate`, `tas-fetch-labour-market` |
| Key DB objects | `q1_tas_builder` (baseline:143797), `q1_tas` view (baseline:143934, `security_invoker=true`), `q1_tas_units` (baseline:144084), `tp_trainers`, `trainer_unit_map`, `trainer_pd`, `trainer_validation_actions`, `ien_register`, `avr_register`, `industry_consultation_*`, `tas_consultation_links` (20260618000600), `tas_compile_snapshots`, `tas_approval_audit` (baseline:147340), `q1_tas_versions`, `tas_status` enum (draft/in_review/approved/published/final/archived/deleted) |

## Endpoint map (key journeys)

- **Registry list** → `useTasRegistry` → `rpc_tas_list_builds_for_current_tenant` (baseline:89048, tenant-claim gated)
- **Create** → `useCreateTasBuild` → `rpc_tas_create_draft` (baseline:88698, SECURITY DEFINER, `auth.uid()` + `sec.claim_tenant_id()`, generates `custom_id`; 15 post-baseline fixes incl. `20260721025955`, `20260814063131` revoke anon, `20260814063203` grant authenticated) — the ONLY working create path
- **Autosave** → `useTasAutosave` → `updateDbBuilderState` (q1_tas_builder upsert) + `q1_tas_builder_settings` upsert (sandbox:1456) — RLS-permitted tenant member write, no role gate
- **Readiness** → `rpc_tas_calculate_readiness` (baseline:88395) / v2 (baseline:88675), tenant-claim gated
- **Compile** → `CompilePanel.tsx` → `rpc_compile_tas` (baseline:69888; gates exec-summary/section2/units/learners/AOT/QA/auditor blockers; writes only `tas_compile_snapshots`, never touches `q1_tas_builder.status`), `rpc_create_tas_version` (baseline:70956), `rpc_create_final_pack` (baseline:70719), `rpc_compile_tas_export` (baseline:70239) — all via `(supabase.rpc as any)`
- **Publish final** → `usePublishTasFinal` → `rpc_tas_publish_final` (20260716233700: SECURITY DEFINER; gates = authenticated + `sec.claim_tenant_id` + `status='draft'` only) — **no UI calls it** (`PublishFinalDialog` defined, never rendered)
- **Approval gates** → `useTASApprovalGate` = `useIndustryConsultationBlocking` (tenant-wide plans/outcomes, empty `affected_tas_ids` counts as linked) + `useTrainerHealthCheck` (`rpc('run_trainer_health_checks')` → broken RPC → error → **fail-open**). Mutation writes `status='approved'` + `tas_approval_audit` directly (frontend-only, no role/tenant re-check). `UnifiedTASApprovalGate` (only renderer) never rendered
- **Legacy approval UI** → `ApprovalGatePanel`/`useUnifiedApprovalGate` → deprecated `tas_approval_checks`/`tas_approvals` + `run_approval_check` → dead
- **Consultation links** → `useTasConsultationLinks` → `tas_consultation_links` (upsert/insert/update/delete, tenant-filtered, RLS mirrors q1_tas_builder) + `suggest_consultations_for_tas` RPC; used by `MarketJustificationPhasePanel.tsx:75/77/757`
- **Exports** → `QuickExportCard.tsx`: raw `invoke('tas-export-data')` :28, `.from('q1_tas_units')` :57, `rpc('get_my_tenant_pdf_data')` :113; `useTASExport`: client-side PDF, `fetchTASData` reads `qual_code`/`qual_title` (**renamed columns** → undefined); `TASExportButton` (modules/tas/ui) → ExportTASButton
- **TGA sync** → engine:741 raw `invoke('tga-sync-products', {mode:'scope_only', force:true})` (verify_jwt=false) + `tenant_rto_scope` upsert :1004; `log_tas_product_override` RPC (baseline) :1106 with approval-note flow :1324-1375 (role-string check only: Administrator/Compliance Manager, no status check)
- **Document register (status advance)** → `DocumentGenerationSection.tsx:1028-1032` — the ONLY status-advance in the whole UI: direct `.from('q1_tas_builder' as any).update({ status: 'in_review' })`, no gates
- **AI section gen** → sandbox:321 raw `invoke('generate-tas-section')` (verify_jwt=false); autoInit `rpc_build_qualification_context` :1380-1397
- **Delete** → engine:2340 direct `.from('q1_tas_builder').delete().eq('id', buildId)` — no tenant filter (mitigated by RESTRICTIVE `tenant_isolate_delete` RLS); only RLS `billing_gate` PERMISSIVE on row writes

## Good and working (verified)

1. **Create/list/publish RPCs are SECURITY DEFINER with `sec.claim_tenant_id()`; anon revoked from create_draft** (`20260814063131`); latest create_draft fixes in place. Registry/readiness paths correct.
2. **Column-rename consistency** — `qual_code`/`qual_title` → `training_product_code`/`training_product_title` (`20260711035600`) applied consistently across `useTasBuilderRecord`, `useTasRegistry`, compatibility view `q1_tas` (recreated post-baseline with `security_invoker=true`, `20260711035600` + `20260715130000`), and generated types — no `(as any)` needed.
3. **`tas_consultation_links` RLS mirrors q1_tas_builder** (tenant + billing + write-lock pattern), `UNIQUE(tas_id, consultation_record_id)`, CHECKs on link_type/status/match_source.
4. **`rpc_get_tas_build_state` exists** (baseline:79031) — sandbox/engine state loads OK.
5. **`tas_approval_audit` insert path works** (used by useTASApproval mutation + rpc_tas_publish_final).
6. **Engine read-only gating** for compiled/final/approved at `TasEngineContext.tsx:107`.
7. **Schema facts verified for export/auto-build queries** — `ien_register` has `industry_partner`/`engagement_outcome`/`title`; `avr_register` columns OK; `industry_consultation_plans` has `valid_until` + `tas_id`.

## Bugs (severity order, verified)

1. **[CRITICAL] No approval gate at the database level — release-notes claim is FALSE.** `src/data/releaseNotes.ts` (~559/589/633) claims "TAS approval gated by Industry Consultation compliance and Trainer coverage compliance" and "Approval gates enforced at database level". Grep for `trg_approval|fn_approval_gate|check_approval_gate|approval_gate` across all 733 active migrations: **zero hits**. `q1_tas_builder` triggers are only tenant-id, product-validity, null-tenant, scope-item, webhook (baseline:184215-186884). `rpc_tas_publish_final` gates only draft-status + tenant claim. `rpc_compile_tas` gates on artefacts, not approval. The only gates are frontend (`useTASApproval`) + RLS billing/tenant/write-lock.
2. **[CRITICAL] `run_trainer_health_checks` is broken and the UI fails OPEN.** Baseline:92426 references `tu.trainer_id` (no such column on `q1_tas_units` — it has `trainers jsonb`) and `t.compliance_status`/`t.requires_supervision`/`sup.compliance_status` (no such columns on `tp_trainers` — it has `status` CHECK + `trainer_name`/`full_name`; verified no migration adds them). Never redefined post-baseline → RPC errors whenever called → `useTrainerHealthCheck.ts:41` throws → `useTASApprovalGate` (`useTASApproval.ts:90-101`) computes `canApprove = status !== 'blocked'` with zero blocking issues → **trainer gate always passes, even on error**.
3. **[HIGH] `tas-create` edge function is dead-on-arrival.** `supabase/config.toml:54-55` `verify_jwt = false`; function (`supabase/functions/tas-create/index.ts`) uses `supabase.auth.getClaims(token)` (forgeable, no signature verification — banned pattern); insert payload omits `custom_id`/`training_product_code` (both NOT NULL on `q1_tas_builder`) and uses `reason_for_variation` (column does not exist; only `variation_reason`/`variation_reason_other`) → insert ALWAYS fails → 500 "Failed to create TAS". Callers (`builder/index.tsx:420`, `builder-sandbox/index.tsx:1846`, `TGAImportSection.tsx:439/469`) are no-op handlers; real create goes through `rpc_tas_create_draft`.
4. **[HIGH] No reachable approval/publish UI.** `PublishFinalDialog` never rendered; `UnifiedTASApprovalGate` never rendered; `ApprovalGatePanel`/`useUnifiedApprovalGate` hit deprecated tables. Only status advance = `DocumentGenerationSection.tsx:1028-1032` `.update({status:'in_review'})` with `(as any)` and zero gates → TAS can never reach approved/final/published through the UI.
5. **[HIGH] `generate_approval_pack` migration (20260716234100) broken** — references `v_tas.title` (view has no `title`), `tas_exec_summary_snapshots`/`tas_integrity_snapshots`/`tas_regulatory_flags` (deprecated or never existed), `tas_approval_pack_snapshots` (deprecated) → approval-pack (Phase 13/14) feature dead; `useApprovalPack.ts:28/49` + `ApprovalPackPanel` hit deprecated tables.
6. **[HIGH] IC blocking is tenant-wide + false-positive linked.** `useIndustryConsultationBlocking.ts`: plans/engagements NOT filtered by TAS (comment "use all active/completed plans for the tenant"); `industry_consultation_outcomes.affected_tas_ids uuid[] DEFAULT '{}'` (baseline:140944) → outcomes never explicitly linked match every TAS → IC-05.1 always warns/locks for tenants with any consultation.
7. **[MED] `useTASExport` produces undefined PDF data** — `fetchTASData` reads `tasRecord.qual_code`/`qual_title` (renamed post-baseline) → undefined fields + filename `TAS_undefined_…`.
8. **[MED] `useTASVersioning.restoreVersion` always fails** — spreads snapshot into `q1_tas_builder` update including `version_number` (column does not exist; table has `version`) → restore rolls back status but never writes.
9. **[MED] verify_jwt=false edge functions called raw from client** — `tga-sync-products` (engine:741) and `generate-tas-section` (sandbox:321); config lines 338-339, 659-660. Also `tas-audit-simulate`/`tas-redteam-simulate`/`tas-fetch-labour-market` false (341-351). JWT-claim forgeable, no server-side role verification (only tenant-claim where present).
10. **[MED] Autosave indicator lies** — sandbox `useTasAutosave` onSave → `updateDbBuilderState({savedAt})` which is a LOCAL-ONLY special case (no DB write) → "saved" shown without persistence.
11. **[MED] Pervasive banned patterns** — `(supabase as any)` on `from/rpc` across `useTasConsultationLinks`, `useApprovalPack`, `useUnifiedApprovalGate`, `CompilePanel` (~215/240/267/312), `DocumentGenerationSection` (999/1028); `console.error`/`console.warn` in `useTasAutosave`, `useTASVersioning`, engine handleFetchProducts, `QuickExportCard`; raw `functions.invoke`; magic role strings `TAS_IMPORT_ROLES` (engine:2483-2490) and `profile?.role === 'super_admin'` (engine:2526-2529).
12. **[MED] Engine delete with no tenant_id filter** (engine:2340, RESTRICTIVE RLS only mitigation); `log_tas_product_override` invoked without checking RPC errors (engine:1106); override approval is role-string only (Administrator/Compliance Manager), no `membership.status='active'` check (engine:1324-1375).
13. **[MED] Deprecation mismatch** — engine:2309 comment "q1_tas is now deprecated" + :2450 commented-out sections tab, yet `rpc_compile_tas` and `generate_approval_pack` still depend on `q1_tas` view; :2531 comment documents prior cross-tenant leak ("TasIntegrityDashboard REMOVED").

## Verification notes (TAS Builder)

- Method: read-only static audit of worktree C (branch `main`, HEAD `44b47c63a`); schema facts from `baseline.sql` (pg_dump snapshot) + 733 active migration files; `_archive/` ignored.
- **Unverified (would need live check):** live edge-function deploy state vs config.toml; RLS policies on `tas_register`/`tas_builds`/`ien_register` (only q1_tas_builder/tas_consultation_links confirmed); `rpc_get_tas_build_state` body (exists baseline:79031, unread); `tas_precheck_duplicate` RPC; `tas-export-pdf`/`tas-export-data`/`tas-ai-engine` function bodies (verify_jwt=true); `useTasBuildState`/`TasRunsPanel` internals; live `suggest_consultations_for_tas` behaviour.
- Confirmed table/column existence for every query target flagged: `trainer_pd`, `trainer_validation_actions`, `trainer_supervision_requirements`, `unit_intelligence`, `tas_executive_summaries`, `tas_compliance_scans`, `tas_auditor_simulations`, `industry_consultation_records`, `tas_compile_snapshots`, `tas_approval_audit`, `q1_tas_versions`, `log_tas_product_override`, `rpc_get_tas_build_state`.

## PARKED (TAS Builder, out of scope, one line each)

- `useTasBuildState`/`rpc_get_tas_build_state` body not read.
- `TasRunsPanel` (engine runs tab) internals not audited.
- `useTASVersions` legacy writes to `q1_tas_versions` not audited.
- Trainer-matrix engine hooks (`useTrainerMatrixEngine`, `useAlignedTrainerMatrixSync`) not audited.
- `tas-export-pdf`/`tas-export-data`/`tas-ai-engine` edge fn bodies not read (verify_jwt=true, low risk).
- Full `types.ts` drift check not performed (spot-checked via compile-consistency of renamed columns).
- Live-data checks (rows, RLS behaviour, deployed functions) need Supabase MCP.

---

# 2. TRAINERS MATRIX

## Feature surface

| Surface | Path |
|---|---|
| Admin Matrix Engine | `src/components/trainers/TrainerMatrixEngine.tsx` (1098 ln) — `/admin/trainer-matrix-engine`, Admin/CM (permissions.ts:36). Tabs: matrix / by-classification / risks / full-matrix / compliance-scan |
| Trainer portal matrix | `src/pages/trainer-portal/matrix.tsx` (689 ln) — Trainer, Trainer/Assessor (RoleGuard.tsx:32). `@ts-nocheck`, direct supabase |
| Legacy pages | `src/pages/trainers/TrainersMatrix.tsx`, `TrainerMatrixDetail.tsx` — placeholders only |
| Evidence sub-system | `SmartDocumentVault`, `TrainerDocumentsTab`, `MyCredentialsTab`, `TrainerDocumentApprovalQueue`, `AddMatrixUnitDialog`, `ApproveUnitsDialog`, `MatrixTemplatesDialog` |
| Hooks | `useTrainerMatrixEngine`, `useVerifyCredential`, `useFullTrainerMatrix`, `useAddUnitClaim`, `useTrainerHealthCheck`, `useTASApprovalBlocking`, `useValidationCompletionBlocking`, `useAlignedTrainerMatrix`, `useTrainerMatrixSync`, `useAssessorsByUnit`, `useTrainingAssessmentComplianceStatus` |
| Edge functions | `register-evidence-manager` (verify_jwt=true) |
| DB surface | `tp_trainers`, `trainer_unit_map`, `trainer_matrix_credentials`, `trainer_vocational_competency`, `trainer_industry_currency`, `trainer_validation_actions`, `trainer_credential_classification`, `trainer_document_items`, `trainer_pd` + legacy `trainers`/`trainer_credentials`/`trainer_quals`/`tcr_register`/`trainer_unit_permissions` |

## Endpoint map (key journeys)

1. **Trainer claims unit** (trainer portal → AddMatrixUnitDialog → `useAddUnitClaim`): evidence upload FIRST → insert trainer_unit_map (`.single()` :140) → insert trainer_validation_actions; rollback-delete claim on action failure (:163) ✓ but no compensating file delete on map-insert failure.
2. **Trainer approves claims**: `ApproveUnitsDialog` (matrix.tsx button :463-465) → direct `trainer_unit_map` update status→'compliant' by id only — no role check, no tenant filter.
3. **Admin verify credential**: `useTrainerMatrixEngine` `useVerifyCredential` → trainer_matrix_credentials update by id, sets evidence_verified_by/at — RLS `tenant_all` allows any member.
4. **Health checks**: `useTrainerHealthCheck` → RPC `run_trainer_health_checks` (reads tp_trainers.compliance_status / requires_supervision / supervisor_id) → `useTASApprovalGate` fails OPEN on error.
5. **TAS approval**: `useTASApprovalMutation` → q1_tas_builder status='approved' + tas_approval_audit insert — no re-verification, no transaction; audit insert Admin/CM-only (fails AFTER TAS committed for others).
6. **Export**: matrixExport.ts → legacy `tcr_register` + `trainer_quals` (NOT trainer_matrix_credentials); CSV no escaping.
7. **Evidence download**: trainerDocumentSignedUrl → bucket candidates tenant-documents→trainer-credentials→trainer-evidence, HEAD-verifies ✓.
8. **Uploads**: register-evidence-manager → bucket `tenant-documents`, path `{tenant}/{recordId}/{ts}_{name}` (≠ canonical `{tenant}/trainers/{trainerId}/{cat}/...`).

## Good and working (verified)

1. `useFullTrainerMatrix` — canonical tp_trainers, tenant-pinned everywhere, maybeSingle ✓.
2. `useAddUnitClaim` compensating rollback-delete of claim when validation-action insert fails (:163).
3. `recompute_trainer_compliance_status` properly gated (`sec.is_super_admin() OR sec.is_trainer_matrix_admin()` baseline:61961 + tenant match :61973).
4. tp_trainers RLS: SELECT any tenant member, INSERT/UPDATE Admin/CM only (WITH CHECK :231309) — solid metadata perimeter.
5. trainerDocumentSignedUrl HEAD-verify + bucket fallback ✓.
6. Edge fn input validation (exts, 20MB, sanitizeFilename/Subpath), verify_jwt=true, legacy trainer_document_items fallback for delete/download ✓.
7. TrainerPortalContext `meTrainer` from canonical tp_trainers (:290-368) — id consistent with unit_map FK ✓.
8. `build_trainer_matrix` uses tp_trainers correctly.

## Bugs (severity order, verified)

1. **[CRITICAL] Trainer self-approval end-to-end.** `ApproveUnitsDialog` (`src/components/trainer-portal/ApproveUnitsDialog.tsx`) has no role/permission check and fetches ALL tenant `evidence_pending` claims including own; handleApprove (:121-167) flips status→'compliant' by id, no tenant filter (matrix.tsx button :463-465 sits in Trainer-role portal). RLS allows it: trainer_unit_map policies = any tenant member (`trainer_unit_map_tenant_access` baseline:231933; `tum_trainer_own_*` compare `trainer_id = auth.uid()` — dead, trainer_id is tp_trainers.id); trainer_matrix_credentials (:225530) / trainer_industry_currency (:225523) `tenant_all` → any member can also set status='verified'. Verification is cosmetic.
2. **[CRITICAL] tp_trainers schema drift.** `compliance_status`, `requires_supervision`, `supervisor_id`, `risk_flags` are read/written by `run_trainer_health_checks` (baseline:92549/92585/92586) and written by `recompute_trainer_compliance_status` (:62059-62064), and rendered in UI (risk_flags badges :707, deriveTrainerStatus :673-681) — but absent from tp_trainers CREATE (baseline:150957), types.ts (:81523), legacy trainers (:152452), and NO migration adds them. Production either has untracked drift columns or these RPCs fail on any branch DB. (Types.ts shows `compliance_status` at 9537/9567/9597 and `risk_flags` at 12449+ — need to confirm which tables those belong to; the tp_trainers Row at types.ts:9648 was not fully enumerated.)
3. **[CRITICAL] TAS approval gate fail-open + not DB-enforced.** `useTrainerHealthCheck` queryFn throws on RPC error (:41) → data undefined → `canApprove = status !== 'blocked'` → 'allowed'. Release-notes v1-8 claim "approval gates enforced at database level" is FALSE: no trigger on q1_tas_builder (only guard_tenant_id + autopopulate_single_unit; trg_check_tas_approved is on assessment_validation_events). q1_tas_builder UPDATE RLS has no role restriction → any tenant member can approve via API. Mutation (`useTASApproval.ts:117-188`): two statements, no transaction; tas_approval_audit INSERT is Admin/CM-only (no status='active' filter) so non-admins hit partial-failure (TAS committed, audit missing).
4. **[CRITICAL] trainer_validation_actions RLS keyed to legacy `trainers`.** FK → tp_trainers (baseline:194882) but all four policies join `public.trainers t JOIN tenant_members` on `t.id = trainer_validation_actions.trainer_id` (baseline:231958-231993). Legacy trainers.id ≠ tp_trainers.id in production (seed.sql uses the SAME id for both :608/:695 — QA overlap only; no src writes legacy `trainers`). Policies dead in production → selects return nothing (validation queue silently empty), inserts/updates denied except super-admin. Also: no tenant_id column on the table.
5. **[CRITICAL] Legacy evidence buckets unrestricted.** No storage policy for `trainer-credentials`/`trainer-evidence` exists in ANY migration; migration 20260804072745 header states the source bucket "has zero access restriction at all" (:10-11). If true live, any authenticated user can read/delete any tenant's trainer evidence. `tenant-documents` itself: `trainers/` segment = any active tenant member for SELECT/INSERT/UPDATE/DELETE (20260804072745) — a Trainer can delete another trainer's evidence files directly via storage API.
6. **[HIGH] `compute_trainer_classification` (20260810120000) no membership check.** SECURITY DEFINER, search_path 'public','pg_catalog', no tenant_members verification — any authenticated user can classify any trainer in any tenant (cross-tenant upsert into trainer_credential_classification). Contrast: recompute_trainer_compliance_status (:61961) gates properly.
7. **[MED-HIGH] register-evidence-manager: no record-level authz.** delete/download/list only check `pathInTenant` (segments[0] or [1] == tenant) — any tenant member can delete/download any in-tenant file (service-role path); `record_id` client-supplied; role-action gate hard-codes `trainer_document_upload` for ALL registers (register-agnostic); console.log of user_id/tenant_id/roles (:260).
8. **[MED-HIGH] Orphaned evidence objects everywhere** (matches active-work.md item 9 "7 trainer-evidence orphans — separate bug"): upload-then-insert with no compensating delete (matrix-queries.createUnitClaim; useTrainerMatrixEngine useAddCredential/useAddVocationalCompetency/useAddIndustryCurrency); delete paths that never remove files (useDeleteVocationalCompetency, useDeleteIndustryCurrency); delete-file-first order (TrainerDocumentsTab :365-387 — DB-delete failure leaves broken link); SmartDocumentVault direct-upload-then-insert (:187-202 catch shows toast, no cleanup).
9. **[MED] useAssessorsByUnit column mismatch (:95-96):** selects `validation_id`, filters `.in('validation_event_id', ...)` — at least one wrong; error not destructured → silent empty fallback.
10. **[MED] useAlignedTrainerMatrix:** fetchValidationActions selects whole table (no tenant column exists — relies on the dead policy above); linkPDToUnits/updateValidationAction swallow errors (console.error only); N+1 update loop.
11. **[MED] Export/templates read legacy tables:** matrixExport.ts exports `tcr_register` + `trainer_quals`; MatrixTemplatesDialog reads `trainer_quals` (:66-70) — engine truth (trainer_matrix_credentials) and exported/displayed truth diverge.
12. **[MED] useTrainerMatrixSync:** `custom_id: PD-${Date.now()}`/`IC-${Date.now()}` collision risk; localStorage + browser-tab interval — parallel non-canonical pipeline fragmenting data across register/trainer_matrix_credentials/legacy tables.
13. **[MED] Health-check UI dead rules:** RPC emits only TM-06.x, TM-01.1, TM-02.x, TM-03.2, TM-05.x, TM-00.1 (baseline:92461-92703); HEALTH_CHECK_RULES keys `TM-04.1`, `missing_industry_currency`, `industry_currency_pending_verification` never emitted — advertised "Missing Industry Currency" blocking rule is not enforced anywhere.
14. **[LOW] Banned patterns:** `.single()` (useTrainerUnitMap :140), `@ts-nocheck` + `(supabase as any)` (matrix.tsx, matrixExport :49), direct supabase in pages/components (matrix.tsx audit insert :117-120; MatrixTemplatesDialog; ApproveUnitsDialog), console.error/log throughout, N+1 per-claim queries (:215-235), ApproveUnitsDialog fetches all tga_cache rows per open.
15. **[LOW] Compliance module status:** 'trainers-matrix' can never be 'compliant' (useTrainingAssessmentComplianceStatus :141 — `hasTrainers ? 'in_progress' : 'not_started'`).
16. **[LOW] Status mismatch:** SmartDocumentVault inserts approval_status `'pending'`; TrainerDocumentApprovalQueue filters `'pending_review'` → documents may never appear in the queue.
17. **[LOW] Layout divergence:** edge-fn path `{tenant}/{recordId}/{ts}_{name}` vs canonical `{tenant}/trainers/{trainerId}/{category}/...`; trainerDocumentSignedUrl bucket-hopping + HEAD fallback masks it; pathInTenant's segments[0] OR [1] tolerance is the glue.

## Verification notes (Trainers Matrix — live DB, cannot resolve statically)

- tp_trainers live columns vs git (does production carry compliance_status/supervisor_id/risk_flags? If yes → untracked drift to gap-fill; if no → both RPCs broken on production).
- Live storage policies on trainer-credentials/trainer-evidence buckets + `public` flag.
- trainer_validation_actions live behavior (does the legacy-trainers join match anything?).
- The 7 orphaned trainer-evidence objects (confirm + delete via Storage API).
- Deployed register-evidence-manager == git; verify_jwt true.
- q1_tas_builder: any production triggers/constraints beyond git.

## PARKED (Trainers Matrix, out of scope, one line each)

- EvidencePackDialog / AuditorViewDialog / TrainerTimelineDrawer / ArchiveStaffModal / FullMatrixView / CredentialComplianceScanPanel internals.
- TrainerOnboardingWizard (AI bulk-evidence onboarding flow).
- trainer_supervision table + supervision UX (separate sub-surface); TM-06.2/06.3 depend on it.
- useTrainerValidationActions + validation schedule pages.
- trainer_matrix_audit insert breadth across pages (permissions on that table unverified).

---

# 3. INDUSTRY CONSULTATION

## Feature surface

| Surface | Path |
|---|---|
| Public legacy IC survey | `/survey/ic-…` → `SurveyDispatcher` → `IndustrySurvey.tsx` → anon INSERT `industry_consultation_survey_responses` |
| Public standard survey | `/s/:token` → `SurveyResponse.tsx` (anon), `/survey/:id` → dispatcher |
| Internal legacy flow | `/surveys/industry-training-needs` → `IndustryTrainingNeedsSurvey.tsx` (direct `supabase.rpc('surveys_itn_insert')`, `idc_register`/`gov_register` writes) |
| Consultation register (ICR) | `/registers/industry-consultation` → 4 stages (Plan/Engage/Outcomes/Review) + 3 dialogs + audit/test/report components |
| IEN register | `/registers/ien` → 5 tabs (plans/register/surveys/coverage/dashboard + legacy) |
| TAS approval gate | `UnifiedTASApprovalGate` → `useTASApproval` (plain q1_tas_builder update) |
| Edge functions | `generate-survey-email`, `extract-industry-themes`, `generate-industry-intelligence`, `consultation-prompt-pack` |
| DB surface | `industry_consultation_plans`, `industry_engagements`, `industry_consultation_records`, `industry_consultation_outcomes`, `industry_consultation_survey_responses`, `industry_consultation_surveys`, `industry_representatives`, 2 link tables (`industry_consultation_records_tas_link`, `tas_consultation_links`), ~15 migrations |

## Endpoint map — public path (security priority)

```
anon → POST /industry_consultation_survey_responses
  RLS: anon_insert_ic_survey_responses WITH CHECK (true)          ← no gates at all
       authenticated_insert_ic_survey_responses WITH CHECK (true)
  if prod has trigger attached: SECURITY DEFINER trg_survey_response_to_icr
    → industry_consultation_records (source='survey', created_by=tenant's FIRST admin)
    → tas_consultation_links ('linked','auto') | training_product junction rows
```

Standard path (contrast — well-secured): anon read gated `published AND public_token NOT NULL AND not expired` (baseline:217141), token = `crypto.randomUUID()` hex (PublishSurveyDialog.tsx:70), routing by token shape with `ic-` redirect (SurveyResponse.tsx:47-49).

## Good and working (verified)

1. Standard-surveys RLS stack: `billing_gate` + `tenant_access_surveys` + 3 `write_lock_*` restrictive policies + anon read (baseline:209263/224688/235562-244932/217141).
2. Standalone-form RPCs `public_get_form_by_token`/`public_submit_form` (20260819040550): SECURITY DEFINER + tenant_is_active + write-lock + allow_anonymous — hardened contrast to legacy.
3. `tas_consultation_links` (20260618000600): restrictive RLS (billing_gate + tenant_isolate + write_lock), UNIQUE(tas_id, consultation_record_id), CHECKs on link_type/status/match_source.
4. Cross-tenant trigger `trg_icr_tas_link_tenant_consistency` (20260610113000); restrictive SELECT policies on decisions/themes (20260731052208).
5. `rpc_create_ci_item_from_consultation_decision` (20260715000200): role gate + write-lock + tenant-active + atomic — the pattern the rest should follow.
6. Backfill migration (20260819060500): guarded, idempotent, no-op on branch DBs — good hygiene.
7. `PublishSurveyDialog` token generation is crypto-random (L70).

## Bugs (severity order, verified)

1. **[CRITICAL] Anon public insert is ungated.** `anon_insert_ic_survey_responses … WITH CHECK (true)` (20260628000001:30-33) and the authenticated twin (20260629113624). No server-side is_active/expiry/dedup/rate-limit; checks are JS-only in IndustrySurvey.tsx. Anyone can fabricate unlimited responses for any slug.
2. **[CRITICAL] Evidence-fabrication chain (if triggers attached in prod).** Anon response → SECURITY DEFINER `trg_survey_response_to_icr` (20260819120000) mints Register rows attributed to tenant's **first admin**; dedup key = name+org+plan_id (`IS NOT DISTINCT FROM`, spoofable by varying name); resubmission COALESCE-**overwrites** evidence fields; `custom_id` MAX+1 race, no UNIQUE on custom_id (only `uq_icr_tenant_tas_consultation`); silently `RETURN NEW` on unresolvable survey (ITN twin RAISEs — inconsistent).
3. **[CRITICAL] Trigger attachment exists nowhere in git.** No `CREATE TRIGGER` for `trg_survey_response_to_icr` or `trg_ic_survey_response_to_itn` in any migration (table referenced only by baseline/20260628000001/20260629113624/20260819060500). Attachment is production-only drift → branch DBs diverge from prod. **[live-check: pg_trigger on industry_consultation_survey_responses — if attached, C2 is live; if not, survey responses silently never reach the Register (feature half-dead)]**
4. **[HIGH] Standard surveys: token is read-capability, not submit-capability.** `public_token_insert_survey_responses` (baseline:217116) only requires *some* published+token+not-expired survey to exist; response's `survey_id` needn't match the token's survey → anon response-stuffing into any published survey of any tenant (attacker needs survey UUID).
5. **[HIGH] TAS approval IC enforcement is frontend-only.** `useTASApprovalMutation` is a plain `q1_tas_builder` status update + audit insert — no server-side IC/trainer checks; `blocked_rules` always empty. No trigger on q1_tas_builder enforces consultation state (only tenant/product guards exist, baseline:184215-186884). Any tenant member with write access can approve a TAS; the IC gate (ICApprovalGate via UnifiedTASApprovalGate.tsx:98) is advisory UI.
6. **[HIGH] IC blocking logic is dead/masked.** `hasCompletedEngagement` checks `status==='completed'` which DB never stores (CHECK 141282 = pending_outcome|outcome_recorded|archived) → IC-03.1 always false (useIndustryConsultationBlocking.ts). Outcomes with empty `affected_tas_ids` count for every TAS → IC-05.1 masked. Plans not TAS-scoped (comment admits tenant-wide).
7. **[HIGH] Status vocabulary mismatch → feature broken.** `EngageStage.tsx:74,108` hardcodes `'completed'` → every engagement insert violates CHECK; `EngagementFormDialog.tsx:60,89,103` default/options `scheduled|completed|cancelled` all invalid; `OutcomeFormDialog.tsx` `updateEngagement({status:'completed'})` silently fails → engagements stuck `pending_outcome` forever; `PLAN_STATUSES` includes `'expired'` (useIndustryConsultation.ts:58-65, DB 141010 has no `expired`).
8. **[MED] Fire-and-forget mutations.** `createEngagement`/`createOutcome`/`updatePlan` are `mutate` (void, useIndustryConsultation.ts:382-386); stages/dialogs `await` then toast success + close even on failure (EngageStage, OutcomeFormDialog:112, ReviewStage `handleUpdateCurrency`, PlanFormDialog).
9. **[MED] Broken Fix-now navigation.** `useICEnforcement` routes to `?tab=plan|engagement|currency|outcomes`; IEN tab keys are `plans|register|surveys|coverage|dashboard|legacy` (ien/index.tsx) → lands on default tab.
10. **[MED] Dead external link.** `SendIndustrySurveyModal.tsx:52` sends `${origin}/dashboard/surveys/industry-training-needs` — an authenticated route (AppRoutes:1664) → external contacts get a login wall.
11. **[MED] Legacy internal survey hygiene.** `'itn-' + Date.now()` client ID (IndustryTrainingNeedsSurvey.tsx), direct `supabase.rpc`/`from` in component, auto-writes compliance evidence into idc_register/gov_register.
12. **[MED] `generate-survey-email`:** client-side JWT claims decode (no `auth.getUser()`), hardcoded prod URLs, `increment_survey_email_copy_count` RPC not defined in any migration (silent no-op); `PlanSurveyEmailDialog.tsx:37` raw `functions.invoke`.
13. **[MED] AuditReportGenerator reports on the wrong plan.** `currentPlan = plans[0]` (L36) — silently the most-recent plan, not the plan under review; Section 8/10 claims "TAS approval gated / Clause mapping enforced / Audit events logged" and Section 12 "No manual editing has occurred" — not backed by server enforcement; `runHealthChecks` is a **third divergent copy** of the rule logic (L554).
14. **[MED] ReviewStage IC-02.2 logic bug** — `&&` between two arrays instead of per-engagement OR → rule wrongly passes (ReviewStage.tsx).
15. **[MED] Plan creation blocked by any existing plan** incl. cancelled/draft; no edit path (PlanStage.tsx `existingPlan` find).
16. **[MED] EvidenceUploader direct `supabase.storage` + `supabase.from('industry_evidence')` in component (EvidenceUploader.tsx:132,205,210)** — AGENTS violation; evidence rows orphaned if upload path/delete diverges.
17. **[LOW] `generate_consultation_record_id` (baseline:37066): MAX+1 race; ICR missing from the 20260813104831 custom_id sweep (all other registers got `trg_register_set_custom_id`; ICR still uses the legacy racy function).**
18. **[LOW] `suggest_consultations_for_tas` RPC lacks `sec.tenant_is_active` (20260618000600).**
19. **[LOW] Rule-ID collisions across implementations (IC-02.1 different meaning in ReviewStage vs blocking hook; IC-02.2 differs).**
20. **[LOW] Two link tables coexist (`industry_consultation_records_tas_link` w/ tas_build_id vs `tas_consultation_links` w/ tas_id) — drift risk.**

## Verification notes (Industry Consultation)

- **Live check required:** trigger attachment in prod (settles C2/C3 — the highest-risk unknown), `pg_proc` for `increment_survey_email_copy_count`, storage policies (`survey-uploads`/`forms-uploads`/evidence buckets: anon INSERT? public read?), `survey_response_sessions` RLS (used by SurveyResponse.tsx:161), deployed `generate-survey-email` vs git source.
- Not read (lower risk, internal authenticated surfaces): `ConsultationRecordFormEnhanced.tsx`; hooks `useConsultationRiskScoring`, `useCrossModuleCompliance`, `useTasConsultationLinks`, `useConsultationCoverageReport`, `useConsultationValidationRecords`, `useConsultationPlanProducts`, `useIndustryConsultationDecisions`.
- Live RLS on `industry_consultation_records`/`industry_engagements` (billing_gate + write_lock assumed, unverified here).

## PARKED (Industry Consultation, out of scope, one line each)

- Qi survey RPCs (`public_get_qi_survey_by_slug` etc.) — separate register, not IC.
- `useTASApproval` trainer-side block rules (useTASApprovalBlocking) — trainer domain.
- Worktree A branch `fix/tas-consultation-sync-link-types` — different branch.

---

# 4. ASSESSMENT VALIDATION

## Feature surface

| Layer | Artefact |
|---|---|
| Pages (9) | `src/pages/assessment-validation/`: `index`, `dashboard`, `detail`, `schedule`, `validator-dashboard`, `mapping-insights`, `risk-trends`, `risk-trends-drilldown`, `tool-insights` |
| Hooks | `useAssessmentValidation.ts` (8 hooks — flagged in CLAUDE.md as don't-copy), `useValidationAnalytics`, `useRiskTrendAnalysis`, `useUnitValidationSchedule`, `useValidationSessions`, `useAssessmentToolRegister` |
| Components | `ValidationWizard` + 6 wizard steps, `ValidationEventDrawer`, `ValidationEventsTab`, `ValidationActionsTab`, `ScheduleTableTab`/`UnifiedUnitScheduleTab`, unit-schedule/*, editors/*, dashboard/*, `ValidationReportViewer`, SendToCI/SendToRisk modals, `NewValidationSessionDialog`, `QualificationValidationWizard`, `AIToolReviewInsights` |
| Edge functions | AV-specific: **none**. Only indirect consumers (`ai-router`, `generate-audit-pack`). Only component→edge call: `AIToolReviewInsights.tsx:39` → `ai-tool-review-insights` (verify_jwt=true, config.toml:28). `ai-unit-risk-scorer` exists + registered (hook's "not deployed" TODO at useUnitValidationSchedule.ts:221 is stale) |
| DB | `assessment_validation` (+`_events`, `_panel_members`, `_clause_links`, `_units`, `_findings`, `_actions`, `_sample`, `_tool_review`), `avr_register`, `assessment_tools` |
| Permissions | permissions.ts:88-93 key `assessment-validation`; granted to Administrator (`*`), Compliance Manager (:318), Trainer (:360), Assessor (:371); PATH_TO_PERMISSION:440 maps `/dashboard/assessment-validation`. capabilityMapping.ts:102-103 maps `/assessment-validation` (route that doesn't exist) |

## Endpoint map (key journeys)

- **Create validation**: `NewValidationSessionDialog`/`ValidationWizard` → `useValidationEvent.createEvent` → INSERT `assessment_validation` (custom_id filled by trigger `trg_register_set_custom_id('AV')`, sweep 20260813104831:71) ✔ column shape
- **Panel**: wizard `PanelSetupStep` → `addPanelMember` → RPC `add_panel_member_validated` (baseline:11140, SECURITY DEFINER, credential checks vs `trainer_matrix_credentials`/`tcr_register`, sets `is_independent`); direct `ValidationPanelEditor`/`TrainerAssignmentsTab` inserts (Administrator/CM RLS only)
- **Samples**: wizard `SampleSelectionStep`/`SampleSelector` → INSERT/DELETE `assessment_validation_sample` (FK `validation_id`, no tenant_id) ✔
- **Tool review**: `updateToolReview` upsert on `assessment_validation_tool_review` ✔
- **Findings/Actions**: wizard steps → `useValidationEvent.addFinding/addAction` → INSERT — **both broken** (below). `ValidationFindingEditor`/`ValidationActionEditor` are dead code (imported nowhere). Drawer/tab UIs are read-only
- **Finalise**: `finaliseValidation` → UPDATE parent `status=completed` + mirror to `avr_register` (payload includes `custom_id` at :564, upsert onConflict :580) ✔
- **Schedule**: `UnifiedUnitScheduleTab` → `useUnitValidationSchedule` (tga_cache-derived) → `updateUnit` → upsert `avr_register` — **new-row insert broken** (below)
- **Delete tools**: `bulkDeleteToolsMutation` (useAssessmentToolRegister.ts:674-734) pre-checks `assessment_validation.tool_id` + `assessment_tool_ids` FK refs, excludes blocked ids, deletes only `status='draft'` ✔ matches CLAUDE.md rule
- **Alert drill-through**: `GlobalAlertBanner.tsx:46,49` / `AlertsCenter.tsx:88,91` → `/dashboard/assessment-validation?findingId=` / `?actionId=` — **params never consumed**

## Good and working (verified)

1. Bulk DELETE pre-check for `assessment_tools` FK to `assessment_validation` — exactly per CLAUDE.md migration rule (useAssessmentToolRegister.ts:680-721).
2. Parent RLS sound: `av_select` any member; `av_insert/update/delete` Administrator/CM only (baseline:205xxx); findings/actions/panel insert-update-delete = Administrator/CM via `tenant_members` (baseline:205336-205540).
3. `fn_av_child_set_tenant_id` BEFORE-INSERT trigger resolves child tenant from parent before RLS WITH CHECK (baseline:33640) — child inserts without explicit `tenant_id` work.
4. `add_panel_member_validated` RPC: SECURITY DEFINER with `SET search_path` and duplicate-member guard (baseline:11140-11205); credential/independence logic aligned with `verify_validator_eligibility`.
5. Sample/tool_review writes + fetches that use `validation_id` (no tenant filter) work; sample SELECT is role-restricted via parent join (batch-3 closure policy) — Trainers can read.
6. Finalise path (`status=completed`, `overall_outcome` CHECK values, avr_register mirror with custom_id) is column-correct.
7. `ai-tool-review-insights` keeps `verify_jwt = true` and validates input at boundary; no DB access.
8. `AssessmentValidationEvent`/`ValidationPanelMember` types match DB columns (status/outcome enums correct).

## Bugs (severity order, verified)

1. **[CRITICAL] Every finding insert fails.** Wizard `JudgementReviewStep.tsx:36-40` sends `{category: tool|judgement|evidence|system, description, severity: low|medium|high|critical}` → hook `addFinding` (`useAssessmentValidation.ts:388-395`) inserts into `assessment_validation_findings`, which requires NOT NULL `clause_id`, NOT NULL `finding_type` (CHECK compliant/non_compliant/improvement), NOT NULL `description`, and `severity` CHECK minor/major/critical (baseline:132276-132293). `category` is not even a column (the DB's `category` CHECK is tool|judgement|evidence|system|other — wait, see note); `severity` values violate CHECK; `clause_id`/`finding_type` missing. Every insert → 400, surfaced only as toast "Failed to add finding" + `console.error` (:403).
   - *Verification note:* DB `category` column EXISTS with CHECK tool|judgement|evidence|system|other (baseline:132290) — so `category` is fine; the blockers are missing `clause_id` + `finding_type` (both NOT NULL) and invalid `severity` values (low/medium/high/critical ∉ minor/major/critical). Insert still fails 100%.
2. **[CRITICAL] Every action insert fails.** `ActionsStep.tsx:71-78` sends `{finding_id (may be undefined), description, responsible_user_id, due_date, status:'pending', notes:''}` → `addAction` (`useAssessmentValidation.ts:418-423`) into `assessment_validation_actions`, which requires NOT NULL `finding_id`, NOT NULL `action_required`, NOT NULL `owner_role` (CHECK Administrator/Compliance Manager/Trainer), `status` CHECK open/in_progress/closed (baseline:132203-132221). Wrong column (`description` vs `action_required`), missing `owner_role`, invalid `status 'pending'`, optional `finding_id` → every insert fails.
3. **[CRITICAL] Action status updates fail.** `useValidationEvent.updateActionStatus` (`useAssessmentValidation.ts:439-458`) sets `status:'completed'` (also `ValidationActionsTab.tsx:25-28`), but DB CHECK only allows open/in_progress/closed. Same for `completed_at` write. Wizard "Complete" button always fails.
4. **[CRITICAL] Full type/DB drift.** `src/types/assessmentValidationEvent.ts`: `FINDING_SEVERITIES` low/medium/high/critical (:151-156), `FINDING_CATEGORIES` tool/judgement/evidence/system (:144-149), `ACTION_STATUSES` pending/in_progress/completed/overdue (:158-163), `ValidationAction.description` required + `action_required?` optional (:100-101), `status` union includes pending/overdue (:105). DB has none of these values for the corresponding columns. Used by `ValidationReportViewer`, `ValidationReportPreview`, `ValidationEventDrawer`, `CreateRiskFromValidationModal`, `CreateCIFromValidationModal`, `SendToRiskModal`, `SendToCIModal` — every severity/category label render silently degrades.
5. **[CRITICAL] Samples/tool-review never load in wizard.** `useValidationEvent` fetch (`useAssessmentValidation.ts:98,106`) applies `.eq('tenant_id', effectiveTenantId)` to `assessment_validation_sample`/`_tool_review`, which have NO tenant_id column (types.ts:27284, 27340; baseline:11314, 132321) → PostgREST 400, error ignored (`const { data } =`), state stays empty. `SampleSelector`'s own fetch (:59-63) is correct, so the wizard's shared-state chain is the broken one.
6. **[CRITICAL] `updateUnit` new-row insert fails.** `useUnitValidationSchedule.ts:334-343` inserts into `avr_register` without `custom_id` (NOT NULL, no default — baseline:132782; no trigger; sweep migration only covers `assessment_validation`/`_events`). Saving a proposed date/lead-validator for a unit with no existing AVR row fails every time.
7. **[HIGH] Mock/random analytics pages.** `tool-insights.tsx:37-38` hardcoded `mockToolData` with "Mock data... in production would come from database" comment; `validator-dashboard.tsx` and `mapping-insights.tsx` fabricate scores/counts via `secureRandomUnit()` (imports :29/:26). Data integrity surface — nothing real behind these pages.
8. **[HIGH] Broken navigation from risk-trends pages.** `risk-trends.tsx:109` → `/assessment-validation` and `risk-trends-drilldown.tsx:96` → `/assessment-validation/risk-trends`; no top-level `/assessment-validation*` routes exist (only `/dashboard/assessment-validation*`, AppRoutes.tsx:1447-1476) → catch-all `*` → `/login` (AppRoutes.tsx:2346). Users get bounced to login. (Verified: catch-all `{ path: '*', element: <Navigate to="/login" replace /> }`.)
9. **[MED] Alert drill-through is dead.** `?findingId=`/`?actionId=` never read: `index.tsx` has no `useSearchParams`; no auto-open/highlight.
10. **[MED] `schedule.tsx` is unreachable dead code.** AppRoutes.tsx:1452-1453 redirects `/assessment-validation/schedule` → `/dashboard/assessment-validation`; page's own `navigate('/dashboard/assessment-validation?product=&unit=')` (:45) goes to a page that ignores those params.
11. **[MED] `detail.tsx` filter mismatch.** Filters on `f.validation_id` (detail.tsx) while `ValidationFinding` uses `validation_event_id` (types:80); rows never match → always "no findings".
12. **[MED] `useValidationAnalytics` severity bug.** `severityOrder` includes `moderate` (`useValidationAnalytics.ts:103`) which never occurs (DB: minor/major/critical); plus `(supabase as any)` (:96,:114) and `console.error` (:125) — banned patterns.
13. **[MED] `useRiskTrendAnalysis` overcounts.** CI/risk items attributed to EVERY product via `productMap.forEach` (:303-316) inflating per-product counts; CI/risk fetches not tenant-pinned (:521-533) (defense-in-depth gap, RLS covers); `(supabase as any)` :83; `console.error` :162,:535.
14. **[MED] "Send to Governance" is fake.** `risk-trends-drilldown.tsx:49-68` only `console.log` + toast; nothing written to governance; `console.log` banned.
15. **[MED] Legacy AVR form broken + dead.** `AssessmentValidationForm.tsx:278` insert omits `custom_id` (NOT NULL) → would fail; but the form (and `AssessmentValidationReportForm`) are imported by nothing — dead code carrying the failure.
16. **[MED] RLS vs permission mismatch for Trainers/Assessors.** permissions.ts grants `assessment-validation` to Trainer (:360) and Assessor (:371), but findings/actions/panel inserts/updates require Administrator/Compliance Manager in `tenant_members` (baseline:205336-205540). Trainer/Assessor can open the wizard, add samples/reviews, but every findings/actions write silently fails on RLS (wrapped in the same "Failed to..." toasts). Also RLS role checks don't filter `tenant_members.status = 'active'` (minor).
17. **[LOW] `add_panel_member_validated` lacks membership check.** SECURITY DEFINER RPC (baseline:11140) verifies only that the validation exists; any authenticated user knowing a validation UUID can add panel members to another tenant's event (RLS bypassed inside the function). Write surface is small (a panel row), but it violates the tenant-ownership norm.
18. **[LOW] `useUnitValidationSchedule` dead query.** Findings fetch (:92-98) `(supabase as any)`, no tenant filter, result never used.
19. **[LOW] `ai-tool-review-insights` auth is header-presence-only** (:28-34) — platform `verify_jwt` gates signature, but any authenticated user of any tenant can spend Anthropic credits; no `auth.getUser`/membership check (letter-of-rule violation per AGENTS.md; practical risk: AI spend only, no data access).
20. **[LOW] Hook-invokes-edge raw.** `useUnitValidationSchedule.ts:230` uses `supabase.functions.invoke` directly (must be `callEdge` per hooks CLAUDE.md).

## Verification notes (Assessment Validation)

- All DB shapes verified against `types.ts` (live) + baseline DDL; column/CHECK claims cited above.
- RLS policy bodies read from baseline (lines 205327-205540); sample restrictive policy read from batch-3 migration.
- `assessment_validation_events` live-DB columns `lead_validator_id`, `panel_members`, `validation_eligible_confirmed`, `ci_register_action_id` exist in types.ts:26723 but have zero occurrences in `supabase/migrations/**` — untracked drift (no static answer on how they were created; production state unverifiable without MCP).
- Static audit cannot confirm whether custom_id triggers are live in production (sweep migration 20260813104831 assumed applied).

## PARKED (Assessment Validation, out of scope, one line each)

- `useValidationSessions` Gen2 (events table + drift columns) create-path not traced to a rendered UI.
- `QualificationValidationWizard` (avr_register write at :191) not traced.
- `assessment_validation_events` drift columns' origin unknown (needs live-DB inspection).
- `ai-unit-risk-scorer` edge function internals not reviewed (not AV-specific).
- `AssessmentValidationReportForm` write targets not enumerated (dead code).

---

# 5. PLAIN ENGLISH — what this means for the business

**TAS Builder:** The engine that builds Training and Assessment Strategies mostly works for creating, saving, and compiling documents. But the big compliance promise — "a TAS can't be approved until industry consultation and trainer checks pass" — is not actually enforced by the system. The check that's supposed to stop approval when trainers aren't covered is broken in a dangerous way: when it fails, it lets everything through. The final "approve" and "publish" buttons for a completed TAS don't actually exist anywhere a user can click them, and the export/restore functions read fields that were renamed months ago, so exported documents come out with blank data.

**Trainers Matrix:** The core works — trainers upload evidence, admins see a matrix, files download with proper checks. But the approval process is wide open: a trainer can open the approval screen in their own portal and approve their own unit claims and mark their own credentials as "verified" — the buttons are right there and the database allows it. The database rules meant to restrict this either point at an old, unused table or are missing entirely. Old trainer evidence files also sit in storage buckets with no access rules at all, and several upload flows leave orphaned files behind when the database step fails (the 7 orphaned files already in the backlog are the visible symptom).

**Industry Consultation:** The consultation register itself is functional, and the "standard" survey system is properly locked down. But the legacy survey link anyone can use has no restrictions whatsoever — anyone on the internet can submit unlimited fake consultation responses for any RTO, and behind the scenes those responses can be converted into official-looking consultation register entries credited to the RTO's first administrator. Meanwhile the status values the screen uses ("completed") don't match what the database accepts ("pending outcome"), so recording an engagement and its outcome fails — and because the app reports success even when the save fails, staff think it worked. The audit report generator also reports on the wrong plan and makes enforcement claims the system doesn't actually back.

**Assessment Validation:** Creating a validation, adding panel members, choosing samples, and finalising a completed validation all work. But the two core activities — recording findings and creating/updating the follow-up actions — fail 100% of the time, because the screen sends values the database rejects (wrong field names, wrong severity/status words, missing mandatory fields). Several dashboards (tool insights, validator dashboard, mapping insights) show made-up numbers instead of real data, and some buttons navigate to screens that don't exist, bouncing users to the login page. The one genuinely solid piece is the tool-deletion safety check, which correctly refuses to delete tools still referenced by validations.

---

# 6. Cross-feature summary (the "nothing assumed" headline)

| # | Finding | Features | Severity | Verified? |
|---|---|---|---|---|
| 1 | TAS approval gates (IC + trainer coverage) are frontend-only, and the trainer gate fails OPEN on RPC error; release notes' "enforced at database level" claim is false | TAS Builder, Trainers Matrix, Industry Consultation | CRITICAL | ✅ static |
| 2 | `run_trainer_health_checks` references columns that don't exist in git (q1_tas_units.trainer_id, tp_trainers.compliance_status/requires_supervision/supervisor_id) | TAS Builder, Trainers Matrix | CRITICAL | ✅ static (live column state unverified) |
| 3 | Trainer self-approval of unit claims + credential verification (no role gate, dead "own" RLS, tenant-wide approve dialog in trainer portal) | Trainers Matrix | CRITICAL | ✅ static |
| 4 | Anon survey insert ungated (`WITH CHECK (true)`), evidence-fabrication trigger chain, trigger never attached in git | Industry Consultation | CRITICAL | ✅ policy static; trigger attachment = live-check |
| 5 | Assessment-validation findings/actions insert + status updates fail 100% (schema/type drift) | Assessment Validation | CRITICAL | ✅ static |
| 6 | Engagement status vocabulary mismatch → IC engagements can't be created/closed | Industry Consultation | HIGH | ✅ static |
| 7 | Legacy evidence buckets unrestricted / no storage policies in git | Trainers Matrix | CRITICAL | ⚠️ policy absence static; bucket live state = live-check |
| 8 | Mock/random data on 3 AV dashboards; broken nav to /login on risk-trends pages | Assessment Validation | HIGH | ✅ static |
| 9 | tas-create edge fn broken + verify_jwt=false cluster; approval-pack migration broken; no reachable publish UI | TAS Builder | HIGH | ✅ static |

**Things only a live-DB check can settle (flagged, NOT assumed):**
1. Is `trg_survey_response_to_icr` attached to `industry_consultation_survey_responses` in production? (Determines whether the IC evidence-fabrication chain is live or the survey→register sync is dead.)
2. Does production `tp_trainers` carry `compliance_status`/`supervisor_id`/`risk_flags` as untracked drift (gap-fill needed) — or is `run_trainer_health_checks` broken on production too?
3. Actual storage policies on `trainer-credentials`/`trainer-evidence` buckets (+ `public` flag).
4. `assessment_validation_events` drift columns (`lead_validator_id`, `panel_members`, `validation_eligible_confirmed`, `ci_register_action_id`) — exist live, never in git.
5. Deployed edge-function state vs `config.toml` (esp. the verify_jwt=false TAS cluster).
6. The 7 orphaned trainer-evidence objects (active-work.md item 9) — confirm and clean via Storage API.
7. Whether the `20260813104831` custom_id trigger sweep is applied in production.

---

*Nothing was edited, committed, or pushed during this audit. Any fix arising from these findings requires a new FRAME, a fresh branch off `main`, Brian's approval of the plan, and the standard commit/push gates. Per workspace protocol, Scout findings were triaged by the primary session before inclusion — every finding above was re-verified against actual files (hooks, migrations, config.toml, edge functions) where it was high/critical severity.*