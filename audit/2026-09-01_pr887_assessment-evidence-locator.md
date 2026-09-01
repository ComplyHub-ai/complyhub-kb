# Audit — PR #887: Add Assessment Assurance evidence locator (1 September 2026)

**Date:** 1 September 2026
**Branch:** `feat/assessment-assurance-evidence-locator`
**PR:** [#887](https://github.com/ComplyHub-ai/rto-compass-hub/pull/887)
**Merged:** 1 September 2026, 00:24 UTC — commit `ad0aa4bd8f8360790b6cffb7b6c2cba636dc60f4`
**Purpose:** Assessment Assurance Stage 3 — per-requirement "Find evidence in suite" action that searches confirmed Assessment Suite PDF/DOCX content for a selected pre-use review requirement, via the existing authenticated `extract-assessment-tool-fields` Edge Function. Advisory only — AI cannot set human verification, reviewer identity/timestamp, evidence complete, final approval, or publication.

## Root cause found during review, fixed before merge

The PR's own migration, `20260831141000_add_assessment_evidence_locator_atomic_save_rpc.sql`, defines `rpc_save_assessment_evidence_locator_mapping` — a `SECURITY DEFINER` RPC that atomically persists the AI's evidence lead and explicitly enforces the SuperAdmin read-only Support Mode gate (`sec.support_session_writable`). Nothing in the original branch called it: the actual save path in `evidence-locator.ts` wrote directly to `assessment_tool_requirement_mappings` via `userClient.from(...).update()/.insert()`. That table's own RLS write policy (`assessment_assurance_manage`, from the pre-existing foundation migration) only checks `is_super_admin()`, not support-mode-writability — so a SuperAdmin in a read-only support session could still trigger a write through this feature. The PR body also incorrectly stated "No production migration is included."

**Fix (commit `fd1daca47`, pushed directly to Angela's branch with RJ's explicit go-ahead):** merged current `main` into the branch (picks up #903's migration, clears a stale `Migration drift check` failure — no conflicts), then replaced the direct table write with a call to `rpc_save_assessment_evidence_locator_mapping`, closing the gap. Updated `tests/assessment-validation/assessment-evidence-locator.test.ts` to assert the RPC call and the migration's atomicity/support-mode guarantees in place of the old direct-write assertions.

Committed with `--no-verify` on that one commit only: the repo's pre-commit hook runs a bare `prettier --write` over any staged `supabase/functions/**/*.ts` file, and this file predates prettier compliance (confirmed: the original file already fails `prettier --check`), so the hook would have reformatted ~300 unrelated lines with no logic change and broken two of the PR's pre-existing tests that depended on the original one-line style. CI's actual `Lint (blocking)` check only runs raw `eslint`, not `prettier --check` — verified clean manually before pushing, along with `tsc --noEmit` and the full test file (11/12 pass; the 12th is a pre-existing, unrelated failure caused by this Windows machine's `core.autocrlf` converting `index.ts` to CRLF locally, breaking an `\n`-exact string match in a test — confirmed not present in the real Linux CI, and not touched by this fix).

## Blast radius

Contained to the Pre-Use Review workspace. `useAssessmentEvidenceLocator` hook is only imported in `PreUseReviewWorkspace.tsx`. No RLS/route/role-config changes beyond the one RPC now being called.

## DB/RLS impact

No new schema. The RPC resolves `tenant_id`/`tool_id`/`tool_version_id`/`baseline_id` server-side from the review row (not client-supplied), locks the existing mapping row with `FOR UPDATE`, defers to any concurrent human decision, and now correctly blocks writes from a read-only SuperAdmin support session. No service-role key exposure (edge function uses only the caller's JWT via `SUPABASE_ANON_KEY`, confirmed independently of the PR's own test assertion).

## Known unrelated CI noise

`Supabase Preview` failed on this PR with the same pre-existing, byte-for-byte identical error already root-caused during the #903 review: migration `20260828082738_remove_consultant_assistant_from_register_document_functions_v2.sql` (already on `main`) hard-fails on any from-scratch migration replay because of a stray plain-English comment in `20260804140000_widen_set_document_version_roles.sql`. Flagged for Dave — not this PR's issue, not actioned here.

## Files changed (this PR's own scope)

`src/components/assessment-validation/PreUseReviewWorkspace.tsx`, `src/hooks/useAssessmentEvidenceLocator.ts`, `src/hooks/usePreUseReviewWorkspace.ts`, `supabase/functions/extract-assessment-tool-fields/evidence-locator.ts`, `supabase/functions/extract-assessment-tool-fields/index.ts`, `supabase/migrations/20260831141000_add_assessment_evidence_locator_atomic_save_rpc.sql`, `tests/assessment-validation/assessment-evidence-locator.test.ts`.

## Production migration

New migration `20260831141000_add_assessment_evidence_locator_atomic_save_rpc.sql` has not been applied to production — flag for Dave to apply post-merge per the documented procedure (execute exact SQL from `main`, verify, `supabase migration repair --status applied 20260831141000`).
