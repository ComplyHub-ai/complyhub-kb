# Audit — PR #554: split TAS extraction into two AI calls to stop truncating (20 August 2026)

**Date:** 20 August 2026
**Branch:** `fix/parse-tas-document-units-split`
**PR:** [#554](https://github.com/ComplyHub-ai/rto-compass-hub/pull/554)
**Merged:** 20 August 2026
**Purpose:** Follow-up to PR #548. Raising `max_tokens` from 4096 to 8192 wasn't enough — RJ's real 17-unit/39-page TAS document still truncated, just with a clearer error this time.

---

## Root cause

A single combined AI call has to describe every unit's full detail (17 units × ~12 fields each: hours breakdown, sequencing, elective source, assessment methods) **and** all document-level content (qualification info, the market/cohort/licensing signals added for the Market Need/Learners/AOT import work, duration, entry requirements, resources) in one JSON response. For a real multi-unit qualification, that's too much for one call regardless of the token ceiling — confirmed live: still truncated at 8192.

## Fix

Split `'tas'` document extraction into two parallel AI calls, run concurrently via `Promise.all`:
1. **Document-level** — qualification info, duration, entry requirements, resources (same prompt content as before, minus the unit-level sections).
2. **Units-only** — dedicated solely to the units array.

Each call now gets the model's whole output budget to itself. If either call fails (including truncation), the document is marked `failed` with a combined error identifying which half failed — same conservative "no silent partial success" behaviour as before, just now correctly attributing which part broke.

Other document types (`delivery_plan`, `session_plan`, `trainer_matrix`, `other`) keep the original single-call behaviour unchanged — none have been reported to hit this ceiling, and touching them wasn't part of the confirmed bug.

## File-size cleanup (same PR)

The earlier truncation-detection fix (PR #548) had already pushed `index.ts` past the repo's 500-line edge-function cap. Split into:
- `aiExtraction.ts` — shared call/parse/truncation-detection logic, now reused by both the document-level and units calls
- `documentContent.ts` — DOCX/PDF/text extraction (moved verbatim, no behaviour change)
- `prompts.ts` — now also owns the three prompt+schema builder functions (`buildDocLevelPrompt`, `buildUnitsPrompt`, `buildCombinedPrompt`)

`index.ts` is now 450 lines (was 665 before this PR, having grown from PR #548's fix).

## Process note — worth recording

Mid-implementation, a commit accidentally landed on local `main` instead of a feature branch (a branch-switch that should have happened didn't). Caught before pushing anything to `origin/main` — recovered cleanly: created a branch at the mistaken commit, reset local `main` back to match `origin/main`, then continued from the correctly-named branch. No impact on `origin/main` at any point.

Also worth recording: `main` was unusually busy during this PR's review window — multiple unrelated PRs (forms campaign work, TAS PDF export fixes, migration reconciliation) merged every few minutes, which repeatedly reset this PR's "branch must be up to date with base" required-check timer (`Edge Functions type check` alone takes ~7 minutes per run). Not a defect in this PR or its CI — just contention. Confirmed along the way that `Edge Functions type check` and `Supabase Preview` are both non-required checks; only Type check / Lint / Block `.single()` usage / Migration guards / Security checks actually gate merge.

## Blast radius

Four files in `supabase/functions/parse-tas-document/`, all additive/refactor — no other function shares this code path. No frontend changes.

## DB/RLS impact

None — no schema change, no migration.

## Test plan

- `npx tsc --incremental --noEmit` clean.
- CI: all five required checks passed.
- RJ to re-upload the same 17-unit TAS document and confirm full extraction now completes (qualification code/title, all 17 units with hours, and the market/cohort/licensing signals where the document states them).

## Files changed

`supabase/functions/parse-tas-document/index.ts`, `prompts.ts`, `aiExtraction.ts` (new), `documentContent.ts` (new).
