# Audit — PR #394

> **Date:** 7 August 2026
> **Scope:** 1 merged PR on `rto-compass-hub` — bundles two pieces of work on one branch (explicit
> scope decision, not a mistake): document register/attachments/storage fixes, and trainer-matrix
> onboarding/bulk-unit-assign guard fixes.
> **Branch:** `fix/document-register-storage-and-attachments-batch` (merged, deleted post-merge)
> **Merge authority:** Brian

---

## Summary

**1. Document register / attachments / storage**
- Fixed a cross-tenant-shaped storage scoping bug in `TrainerCredentialForm.tsx`.
- Wired ComplyBot chat attachments (name, URL, type, size) into the AI request — previously silently
  dropped; `ai-router` now authorizes the upload, audit-logs it, fetches the file from its signed URL,
  and attaches a real Claude content block instead of a metadata-only prompt.
- Batched Document Register bulk-delete storage cleanup — was one HTTP round-trip per file
  (~4-5 minutes for 374 files), now one round-trip via a new `delete_batch` path
  (`deleteDocumentFilesBatch` + `document-file-manager`).
- Reconciled `qi_annual_register` migration drift (captures production DDL for fresh branch databases).

**2. Trainer-matrix onboarding / bulk-unit-assign guard** (bundled in on purpose, not split onto its
own branch)
- Fixed `rpc_bulk_upsert_trainer_units`'s relevance guard: it classified units against
  `training_product_units` (96% empty in production) and silently discarded valid assignments for
  over half of all trainers while reporting success. Now classifies per-unit by its own
  `source_qualification` into standalone/malformed/unrelated/unverified/valid buckets, so missing
  reference data is distinguished from a genuinely unrelated unit.
- Fixed a fresh-eyes-reviewed regression introduced in the same work: `QualificationSearchDropdown`
  portaling to `document.body` broke out of Radix's dismiss-layer tracking, so clicking inside it
  closed the whole Trainer Profile drawer. Now portals into the nearest dialog ancestor instead.
- Fixed 5 further confirmed bugs in onboarding duplicate-detection: swallowed query errors,
  false-positive duplicate flags on archived credentials, a double-insert on re-normalisation, a
  permanently-poisoned-file bug on Skip, and a race letting a fast-clicking user bypass the duplicate
  warning.
- Split `useFullTrainerMatrix.ts` (3 hooks bundled in one 402-line file) into one hook per file, per
  repo convention — `useAddUnitsFromTGA`, `useExportFullMatrix`, plus `buildFullTrainerMatrixSections`
  for section assembly.

## Migrations included

- `20260807121130_guard_rpc_bulk_upsert_trainer_units_against_unrelated_units.sql`
- `20260807124853_fix_rpc_bulk_upsert_trainer_units_missing_reference_data.sql`
- `20260807133201_add_skipped_duplicate_evidence_disposition.sql`
- `20260617223949_create_qi_annual_register_table.sql`, `20260618022350_backfill_sec_superadmin_tenant_gate.sql`,
  `20260619050843_add_asqa_report_columns_to_qi_annual_register.sql` (qi_annual_register drift reconciliation)

Not applied to production at merge time — per the current interim migration-apply procedure
(`supabase db push` unusable until the larger drift reconciliation lands), each needs `execute_sql` +
`migration repair` post-merge.

## Blast radius

Compliance-critical trainer data paths (bulk unit assignment RPC, onboarding record creation, evidence
disposition semantics) plus the AI chat attachment path and document bulk-delete path. High risk per
Cursor Bugbot's own PR summary — touches vocational-unit assignment logic used across all trainers.

## DB/RLS impact

Yes — new RPC guard logic and a new evidence disposition value (`skipped_duplicate`); qi_annual_register
DDL drift reconciliation. Migrations not yet applied to production (see above) — must be applied per
the documented interim procedure before this PR's DB-side behaviour is live.

## Verification (per PR test plan)

- `npx tsc --incremental --noEmit` / `npm run lint` — clean on touched files (scoped checks; full
  project-wide `tsc -b` OOMs on the author's machine, a known local limitation).
- Manual QA items listed in the PR were checkboxes, not confirmed complete at merge time:
  bulk-assign units to a trainer with no `training_product_units` data (expect "unverified", not
  silently dropped); TGA picker inside Trainer Profile drawer (dropdown click should not close drawer);
  onboarding duplicate Skip → re-upload same file (should re-process, not be ignored).
- Post-merge: apply the three new (non-qi_annual_register) migrations to production per the
  documented interim procedure.

## Files changed

- `src/components/ComplyBot/EnhancedComplyBotWidget.tsx`
- `src/components/forms/TrainerCredentialForm.tsx`
- `src/components/trainer-matrix/FullMatrixView.tsx`
- `src/components/trainer-matrix/TGAUnitSelector.tsx`
- `src/components/trainer-matrix/export/TrainerMatrixExportView.tsx`
- `src/components/trainer-matrix/onboarding/TrainerOnboardingWizard.tsx`
- `src/components/trainer-matrix/onboarding/steps/ConfirmStep.tsx`
- `src/components/trainer-matrix/tga-picker/QualificationSearchDropdown.tsx`
- `src/components/trainer-matrix/tga-picker/TgaQualificationUnitPicker.tsx`
- `src/hooks/useAddUnitsFromTGA.ts` (new)
- `src/hooks/useBulkDeleteDocuments.ts`
- `src/hooks/useExportFullMatrix.ts` (new)
- `src/hooks/useFullTrainerMatrix.ts` (split down)
- `src/hooks/useTrainerOnboarding.ts`
- `src/lib/documentFiles.ts`
- `src/lib/evidence/evidenceNormalisation.ts`
- `src/lib/evidence/evidenceService.ts`
- `src/lib/trainerMatrix/buildFullTrainerMatrixSections.ts` (new)
- `src/types/trainer-onboarding.ts`
- `supabase/functions/ai-router/attachments.ts`
- `supabase/functions/ai-router/index.ts`
- `supabase/functions/document-file-manager/index.ts`
- `supabase/migrations/20260617223949_create_qi_annual_register_table.sql`
- `supabase/migrations/20260618022350_backfill_sec_superadmin_tenant_gate.sql`
- `supabase/migrations/20260619050843_add_asqa_report_columns_to_qi_annual_register.sql`
- `supabase/migrations/20260807121130_guard_rpc_bulk_upsert_trainer_units_against_unrelated_units.sql`
- `supabase/migrations/20260807124853_fix_rpc_bulk_upsert_trainer_units_missing_reference_data.sql`
- `supabase/migrations/20260807133201_add_skipped_duplicate_evidence_disposition.sql`

## Merge commit

`531e3858a` — merge of `fix/document-register-storage-and-attachments-batch` into `main`.

## PR

#394 — merged 7 August 2026 (06:42 UTC).
