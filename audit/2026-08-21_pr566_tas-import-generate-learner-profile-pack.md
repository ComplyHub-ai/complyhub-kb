# Audit — PR #566: TAS import generates Learner Profile Pack for AOT + VoL justification (21 August 2026)

**Date:** 21 August 2026
**Branch:** `feat/tas-import-generate-learner-profile-pack`
**PR:** [#566](https://github.com/ComplyHub-ai/rto-compass-hub/pull/566)
**Merged:** 21 August 2026
**Purpose:** RJ got a real 17-unit TAS document all the way through the Import Existing TAS wizard (Step 6/6, "Import Complete") for the first time, but hit the one gap explicitly flagged as tolerated-not-fixed in the original PR #545 scope: "AOT + VoL justification needs a Learner Profile Pack first — generate one from the Learners tab, then retry from the AOT tab." Asked to close it rather than leave it manual.

---

## Root cause

`generate-aot-vol-justification` blocks with `missing_learner_profile` unless a `tas_learner_profile_packs` row already exists. That row is produced by `rpc_generate_learner_profile_pack`, which itself needs `tas_learner_profile_inputs` + `qualification_context`. The Learners import stage (PR #545) only wrote `tas_learner_profile_inputs` inside the LLN-required branch — so for any cohort that didn't trigger LLN support, that table was never populated, and the pack could never be generated.

## Fix

- Moved the `tas_learner_profile_inputs` upsert out of the `if (llnRequired)` branch so it always runs, using the real computed `llnRequired` value for `lln_support_required` instead of hardcoding `true`.
- Added a call to `rpc_generate_learner_profile_pack({p_tenant_id, p_tas_build_id})` right after — the same RPC the manual "Generate Learner Profile Pack" button on the Learners tab already uses.
- `qualification_context` (the other prerequisite) is already built by the earlier Scope step in this same pipeline, so pipeline ordering is safe — no new dependency issues introduced.
- Surfaces a warning if pack generation still fails for some other reason, same tolerant pattern as the rest of this pipeline.

## Blast radius

Three files, all within the Market/Learners/AOT import pipeline added in PR #545 (`learnersFromParsedDoc.ts`, `useTasImportLearnersStep.ts`, `StepLearners.tsx`). No change to the manual Learners tab UI or its own "Generate Learner Profile Pack" button.

## DB/RLS impact

None — no schema change. Same RPC and same table the manual flow already uses; only the write pattern within the import pipeline changed (unconditional instead of LLN-gated).

## Test plan

- `npx tsc --incremental --noEmit` clean, both before and after a mid-review `main` merge (unrelated PDF export + forms template work landed concurrently).
- CI: all required checks passed; not CODEOWNERS-protected, auto-merged once green.
- RJ to confirm the AOT tab's "AOT + VoL Justification" now succeeds on re-import instead of warning about a missing Learner Profile Pack.

## Files changed

`src/lib/tas/learnersFromParsedDoc.ts`, `src/hooks/useTasImportLearnersStep.ts`, `src/components/tas-builder/import/StepLearners.tsx`.
