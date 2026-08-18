# Audit — PR #480 & #482: Rebuild Import Existing TAS as a 3-step dialog (18 August 2026)

**Date:** 18 August 2026
**Branch:** `fix/tas-import-3-step-dialog`
**PRs:** [#480](https://github.com/ComplyHub-ai/rto-compass-hub/pull/480), [#482](https://github.com/ComplyHub-ai/rto-compass-hub/pull/482)
**Merge commits:** `54b5efe1c945e74c78df9ff3d1846d27caebb02e` (#480), `d2f77ccaf94b59dac38dec38c3ea7660dfc35d07` (#482)
**Merged:** #480 — 18 August 2026, ~4:05 pm AEST (auto-merged). #482 — 18 August 2026, ~5:10 pm AEST.
**Purpose:** RJ specced a full reconstruction of the "Import Existing TAS" dialog around a literal 3-step structure — Step 1 (upload), Step 2 (TGA scope validation + funding/apprenticeship/third-party detection), Step 3 (units, intelligence, rationale, licensing) — with the explicit acceptance criterion that opening the resulting TAS shows the Setup and Units tabs already marked complete, same as a fully hand-built TAS.

---

## What was implemented

Research traced the actual SQL/RPC logic behind both tab-completion badges (not just apparent UI behaviour):

- Setup tab (`rpc_get_build_readiness`) requires a `qualification_context` row with `aqf_level` + volume-of-learning.
- Units tab (`rpc_get_units_step_state`) requires `tas_unit_benchmarks` coverage for every selected unit, non-stale `tas_unit_weight_packs`/`tas_unit_rationales`, and a licensing signal — and a DB trigger (`trg_q1_tas_units_invalidate_downstream`) invalidates weights/rationale/licensing on any later write to `q1_tas_units`, so unit save must be the last write to that table in the pipeline.

Final shape (after a correction — see "What went wrong" below):

- **Step 1 (Upload):** upload the TAS document; AI parsing (`parse-tas-document`) detects the qualification code/title directly from the document; the `q1_tas_builder` row is created immediately after parsing, and the uploaded file is deleted from storage once read.
- **Step 2 (Validate Scope & Governance):** auto-runs the TGA scope-validation chain (shared with `GovernancePhasePanel`) and `rpc_build_qualification_context` (what actually satisfies the Setup tab), then shows the AI-scanned funding model / apprenticeship / third-party findings as live, editable toggles and fields — not a hidden background step.
- **Step 3 (Units & Compliance):** matches extracted units against `q1_tas_builder.packaging_rules` and saves them via `rpc_save_unit_selections` (same RPC the manual "Save Unit Selection" button uses), then runs unit intelligence → weights → rationale → licensing in that strict order, showing the results (unit list, rationale/licensing source tags) before a final "Confirm & Create TAS" action.

All automation calls the same RPCs/edge functions the manual TAS Builder buttons already use — no shadow write paths.

## What went wrong (first pass) and was corrected

1. The first implementation kept the old 6-step wizard shape and ran the new automation invisibly behind a 7th "Finalising" step after a final Confirm click — not what was specced. Corrected into the literal 3-step structure above after RJ's pushback.
2. Step 1 initially still required manually typing the qualification code before upload, even though `parse-tas-document` already extracts it from the document and writes it onto the import session (pre-existing, unused capability). Fixed by adding a post-parse "Confirm Qualification" screen instead of a pre-upload form.
3. This repo has automerge enabled. It fired on PR #480 as soon as its first commit passed CI — before the qualification-detection fix (point 2) was ready — closing the PR. The fix had to ship as a separate PR (#482), deliberately opened as a **draft** so automerge couldn't repeat the same surprise before RJ could look.
4. Between the two PRs, `main` moved forward (unrelated PRs merging concurrently), leaving the branch stale. Re-synced with current `main` before opening #482; resolved merge conflicts in `useTasImport.ts`/`TasImportWizard.tsx` by confirming (byte-for-byte diff) that main's copies were untouched since PR #480, then keeping the branch's fixed versions — avoided a false revert of unrelated work.

## Blast radius

Import TAS wizard only: `src/hooks/useTasImport.ts` (rewritten), two new step hooks (`useTasImportScopeStep.ts`, `useTasImportUnitsStep.ts`, replacing the old `useTasImportPipeline.ts`), `src/components/tas-builder/import/*` (several old step components removed — `StepSelectQualification`, `StepTagDocuments`, `StepConfirmUnits`, `StepReview`, `StepFinalizing`, `ExistingTASWarning`, and their unit editors — replaced by `StepConfirmQualification`, `StepValidateScope`, `StepUnitsCompliance`, `PipelineStageChecklist`), and new `src/lib/tas/createTasBuildFromImport.ts`. One small addition to `src/lib/tas/governanceFieldsFromParsedDoc.ts` (`updateWorkplacePathwayConfirmed`). Confirmed via grep that none of the removed components were referenced outside this wizard. No route or role-guard changes.

## Dave standard / DB impact

None. No migrations in either PR. No schema changes — all writes go through existing RPCs/tables (`tas_governance`, `q1_tas_units`, `tas_unit_rationales`, `tas_licensing_registry`, `qualification_context`) via functions that already existed.

## Test plan

- `npx tsc --incremental --noEmit` — clean on every push.
- Full-repo `eslint` — clean.
- CI on both PRs: Type check, Lint, Security checks, Migration guards, Edge Functions type check, config.toml coverage, Vercel deploy — all passed.
- `Supabase Preview` failed on both PRs — confirmed pre-existing branch-provisioning infra issue, unrelated to this change (neither PR touches `supabase/migrations/`).
- Live end-to-end click-through (upload → detect qualification → Setup/Units tab completion) was not performed in this session — flagged for RJ to verify on production.

---

## Files changed

**PR #480:** `src/types/tas-import.ts`, `src/hooks/useTasImport.ts`, `src/hooks/useTasImportPipeline.ts` (deleted), `src/hooks/useTasImportScopeStep.ts` (new), `src/hooks/useTasImportUnitsStep.ts` (new), `src/lib/tas/createTasBuildFromImport.ts` (new), `src/lib/tas/governanceFieldsFromParsedDoc.ts`, `src/components/tas-builder/import/TasImportWizard.tsx`, `StepValidateScope.tsx` (new), `StepUnitsCompliance.tsx` (new), `PipelineStageChecklist.tsx` (new), and removal of `StepConfirmUnits.tsx`, `StepTagDocuments.tsx`, `StepReview.tsx`, `StepFinalizing.tsx`, `UnitSequenceEditor.tsx`, `DeliveryHoursEditor.tsx`, `AssessmentMethodEditor.tsx`.

**PR #482:** `src/hooks/useTasImport.ts` (further split into `readDocument`/`finalizeUpload`), `src/components/tas-builder/import/TasImportWizard.tsx`, `StepConfirmQualification.tsx` (new), removal of `StepSelectQualification.tsx` and `ExistingTASWarning.tsx`.
