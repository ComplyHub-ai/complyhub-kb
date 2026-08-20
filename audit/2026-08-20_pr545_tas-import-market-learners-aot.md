# Audit — PR #545: TAS Import extended to Market Need, Learners, and AOT (20 August 2026)

**Date:** 20 August 2026
**Branch:** `feat/tas-import-market-learners-aot`
**PR:** [#545](https://github.com/ComplyHub-ai/rto-compass-hub/pull/545)
**Merged:** 20 August 2026
**Purpose:** RJ asked to extend the "Import Existing TAS" wizard (`/dashboard/tas-engine?tab=overview`) beyond its existing Setup/Units auto-population to also cover Market Need, Learners, and Amount of Training (AOT) — three of the six remaining Build TAS subtabs (Delivery, Resources, Evidence deliberately out of scope for now; see the investigation below for why).

---

## Investigation preceding the build

A comprehensive investigation (readiness RPC trace + six parallel per-subtab deep-dives) was run first, covering all six remaining subtabs, before any plan was drafted. Key findings that shaped scope:

- Several `rpc_get_tas_build_state` readiness fields are dead code with no backing table at all (`industry_themes_ready`, `admissions_ready`, `licensing_ready` at the top level, `market_integrity_ready`, `market_alignment_ready`, and others) — cannot be satisfied by any means, import included.
- **Evidence** subtab's `tas_evidence_packs.evidence_ready` is orphaned — nothing in the entire codebase writes that table. Not a sensible import target until that's fixed as its own issue.
- **Resources** subtab is NOT the placeholder its own file comment claims — it's a real, already-weighted (15%) part of readiness, but its `parse-tas-document` extraction is an unstructured text bucket with no downstream consumer.
- **Delivery**'s readiness is a pure trainer-coverage gate (100% of units need a real, current trainer) — not achievable from document import alone regardless of extraction quality.
- Of the six, **Market Need** and **AOT** were clean import targets; **Learners** was importable but with one hard compliance gate (see below). RJ chose to scope this PR to those three and defer Delivery/Resources/Evidence.

## What was implemented

Three new wizard steps after the existing Setup/Units stages (wizard is now 6 steps): **Market Need → Learners → AOT**.

- **Market Need** (`src/lib/tas/marketNeedFromParsedDoc.ts`) — syncs existing consultation records against the build's units via `suggest_consultations_for_tas` (the same RPC the manual "Sync TAS Details" button uses — never fabricates a consultation, only links ones that already exist in the tenant), pre-fills labour-market/industry-support data the document explicitly stated, saves `tas_market_justification` with the identical `phase_completed` rule (`viability !== 'unknown' && consultations >= 1`) the manual Save button uses. `strategic_alignment_confirmed` defaults to the same value (`true`, all-checklist-true) a brand-new manual build starts with — confirmed with RJ this should not be treated differently by import.
- **Learners** (`src/lib/tas/learnersFromParsedDoc.ts`) — derives `tas_cohort_integrity` fields from the document's new `cohortProfile` extraction. Licensing impact is derived from the Units step's *already-completed* licensing scan (`tas_licensing_registry`) rather than re-scanning — confirmed with RJ: if the scan found mandatory licensing, `licensing_acknowledged` stays `false` and surfaces as an outstanding human action; if not, nothing blocks. **`licensing_acknowledged` is never set `true` by import, full stop** — it's a compliance attestation about real enrolment/screening practice ("entry screening includes verification of licensing requirements...") that only a human can make, same category as `workplace_pathway_confirmed` from the earlier Setup/Units plan. LLN strategy and risk mitigation statement are both AI-drafted and written directly for human review on the Build tab (confirmed with RJ, per his explicit direction) — LLN reuses the existing `generate-lln-strategy` function (after seeding `tas_learner_profile_inputs` so it has real cohort context instead of an empty one), risk mitigation uses a new small edge function (`generate-cohort-risk-mitigation`) since no existing generator covers that field.
- **AOT** (`src/lib/tas/aotFromImport.ts`) — triggers the existing `rpc_calculate_aot_engine` → `rpc_generate_aot_determination` → `generate-aot-vol-justification` chain in sequence, no new extraction needed (derives from `qualification_context`/unit intelligence the earlier Setup/Units stages already populate). `unit_weights_ready`/`unit_rationale_ready` (two of AOT's five readiness tables) are already satisfied by the existing Units step — confirmed via investigation, not assumed.

### New edge function
`generate-cohort-risk-mitigation` — same auth pattern as `generate-lln-strategy` (JWT verify → `auth.getUser()` → `tenant_members` membership/super_admin check, before the service-role client reads `q1_tas_builder` for prompt context). Added to the CI "Security checks" allowlist with a matching justification comment.

### Extraction contract extended
`parse-tas-document`'s `qualification_info` section gains three new optional keys (`labourMarketContext`, `industrySupportSummary`, `cohortProfile`) — same "only extract what's explicit, never invent" rule as the five keys already there from the Setup/Units work.

## Known cross-stage ordering quirk (not introduced by this PR, faithfully replicated)

The Learners tab's own readiness table (`tas_cohort_profiles`, existence-only) is — in the existing manually-built flow too — only ever populated as a side effect of the AOT tab's "Generate AOT Determination" button, not by anything in the Learners tab itself. So Learners will show "complete" only once the AOT step runs after it in this pipeline. This mirrors real app behaviour rather than working around it.

## Tolerated, non-blocking gap

`generate-aot-vol-justification` can refuse with `blocker_key: 'missing_learner_profile'` — it needs a `tas_learner_profile_packs` row that nothing in this three-tab scope produces (a different, unbuilt dependency discovered while verifying the exact edge-function signature). Handled the same way Units step already tolerates partial unit-intelligence coverage: surfaced as a warning ("generate one from the Learners tab, then retry from the AOT tab"), not a hard failure.

## Blast radius

New files only in `src/lib/tas/`, `src/hooks/`, `src/components/tas-builder/import/`, plus one new edge function and a `parse-tas-document` prompt extension. `TasImportWizard.tsx` extended from 3 steps to 6 — no existing step's behaviour changed. No RLS/table changes — every table this PR writes to already existed.

## DB/RLS impact

No migration in this PR — every table involved (`tas_market_justification`, `tas_consultation_links`, `tas_cohort_integrity`, `tas_learner_profile_inputs`, `tas_lln_ai_output`, `tas_aot_packs`, `tas_aot_determinations`, `tas_cohort_profiles` (side-effect), `tas_licensing_registry` (read-only)) already existed with RLS already in place from prior work. The new edge function performs no direct table writes of its own — it returns drafted text for the caller to persist client-side under the caller's own RLS-scoped session.

## Test plan

- `npx tsc --incremental --noEmit` clean, both before and after two mid-review `main` merges (unrelated QI campaign / standalone form campaign work landed concurrently).
- CI: Type check, Lint, Security checks (confirmed the new edge function's allowlist entry works), Migration guards, Edge Functions type check — all passed.
- Required CODEOWNERS review (RJ) for touching `/supabase/functions/` — approved, then merged.
- Manual end-to-end verification pending as of this entry (RJ began testing immediately after merge and surfaced a separate, pre-existing upload bug — see PR #547's audit entry).

## Files changed

`src/lib/tas/marketNeedFromParsedDoc.ts`, `src/lib/tas/learnersFromParsedDoc.ts`, `src/lib/tas/aotFromImport.ts` (all new), `src/hooks/useTasImportMarketStep.ts`, `src/hooks/useTasImportLearnersStep.ts`, `src/hooks/useTasImportAotStep.ts` (all new), `src/components/tas-builder/import/StepMarketNeed.tsx`, `StepLearners.tsx`, `StepAot.tsx` (all new), `src/components/tas-builder/import/TasImportWizard.tsx`, `src/types/tas-import.ts`, `supabase/functions/generate-cohort-risk-mitigation/index.ts` (new), `supabase/config.toml`, `supabase/functions/parse-tas-document/prompts.ts`, `.github/workflows/ci.yml`.

## Not yet actioned (deliberately out of scope)

Delivery, Resources, and Evidence subtabs remain manual-only for now. Evidence specifically needs its own fix (the orphaned `evidence_ready` write path) before it could ever be an import target. Flagged, not actioned.
