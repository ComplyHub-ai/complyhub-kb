# Pre-use review workspace loading guard — PR #1238

**Date:** 17 September 2026  
**Audited by:** Brian / Codex  
**Repository:** `ComplyHub-ai/rto-compass-hub`  
**Pull request:** [#1238 — Fix pre-use review workspace loading guard](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1238)  
**Branch:** `fix/assessment-preuse-workspace-loader`  
**Commit:** `900008c2c07b1cae04508ed20b2b8593c0ec1497`  
**Merge commit:** `73e5e2ecdd068bd88bc53d34e87344a2255ae577`  
**Merged:** 17 September 2026 at 06:01:54 UTC  
**Parent correction:** [PR #1218 — Harden Assessment Suite access boundaries](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1218)

## Executive summary

PR #1238 fixed the remaining render-time failure in the pre-use review workspace. The component was deriving review-dependent state before it had confirmed that the workspace had loaded successfully. During a normal loading or failed-load state, that could dereference an unavailable review object and prevent the workspace from showing its intended loading or error message.

The fix is intentionally narrow: it changes the order of derived-state calculations so loading and error/empty-workspace guards run first. It does not alter review permissions, suite readiness, document linkage, approval, or database data.

This was the final code correction required for the hosted positive path used to recheck the Assessment Assurance workspace after PR #1218.

## User impact

The broader workflow correction correctly redirected users toward suite-level reviews, but the workspace itself still had a separate failure mode: a user could see a loading snag or lose the intended load failure message before the workspace had enough data to render its review-derived controls.

That was especially confusing in RuralMedEd's situation because the user was already navigating a newly constrained workflow. A loader failure could look like another assessment-data or approval problem even when the underlying review record was simply still loading or unavailable.

## Change made

The component now follows this order:

1. request/load the workspace;
2. show the loading state while the request is pending;
3. show the existing error state when loading fails or no workspace is available; and only then
4. derive review-dependent flags such as verification, approval readiness, terminal status, and editability.

The existing error message was preserved. No database migration or Edge Function was included.

The final GitHub diff was one file with 15 additions and 14 deletions.

## Verification

### Local and CI checks

The branch passed the targeted local checks used for the change:

- incremental TypeScript no-emit check;
- scoped ESLint for `PreUseReviewWorkspace.tsx`; and
- `git diff --check`.

The GitHub checks recorded successful results for:

- blocking lint;
- blocking type check;
- changed-file security checks;
- changed-file `.single()` guard;
- migration guards;
- risk-intelligence runtime contract;
- `config.toml` coverage;
- Edge Function type check; and
- CodeQL JavaScript/TypeScript and Python analysis.

The Vercel preview status was successful. The external Supabase Preview check failed again on its preview project; this PR contained no database change and the failure was not used as evidence against the component fix.

### Review feedback and response

The automated review correctly noted that the patch does not include an automated regression test for loading and error states. That remains a real limitation. The patch was nevertheless rechecked through the hosted browser path after merge, and the positive-path workspace rendered with three documents, no loading-snag message, and no browser development errors in that check.

The browser check used Playwright-style locators through the approved browser-control lane in a fresh tab and a cache-busting URL. It was not a checked-in `npm run test:e2e` spec, so it proves the hosted behavior for the tested review, not exhaustive automated coverage of every loading/error permutation.

## Hosted positive-path evidence

The post-merge check used the approved Vivacity Testing Tenant rather than RuralMedEd's live records. It verified:

- the review heading rendered;
- the workspace displayed three documents;
- the old loading-snag text was absent; and
- the browser development-error collection was empty.

The temporary QA records and files were then removed. The cleanup verification found no matching temporary database rows, no matching temporary storage objects, and no remaining local temporary seed directory.

This evidence is deliberately scoped. It proves the repaired component can render the tested hosted review after the fix. It does not prove that RuralMedEd's incomplete suite is ready for use.

## Production and data boundaries

PR #1238 did not change schema, RLS, RPCs, storage files, or Edge Functions. The live migration relevant to the broader workflow remains the PR #1218 migration `20260917025606_assessment_assurance_access_visibility`.

The RuralMedEd mapping correction was a separate, explicitly authorised data action. It linked the existing AT0004 mapping record to AT0003 version 1.0, retained the existing source storage object, left mapping verification pending, and did not create the missing assessor/benchmark component. The two legacy standalone draft reviews were preserved because the active parent-type trigger rejected an attempted rewrite; no trigger bypass was used.

The Vercel preview passed, but a separate post-merge production deployment lookup could not be completed because the Vercel connector was not authenticated during this audit. The live Supabase migration ledger was independently checked and contains the PR #1218 migration.

## What this proves

- The pre-use workspace no longer derives review state before its loading/error guards.
- The existing load-failure message remains available.
- The merged frontend artifact passed the targeted local and repository checks.
- The hosted positive path rendered successfully after merge for the tested QA review.
- Temporary QA records and storage files were removed after verification.

## What this does not prove

- It does not prove all loading, timeout, empty-workspace, and error permutations through an automated repository test.
- It does not prove the RuralMedEd suite is complete or approved.
- It does not prove the two legacy standalone review rows have been retired.
- It does not prove a post-merge Vercel production deployment through an independent deployment API lookup.
- It does not change the database-level workflow rules delivered by PR #1218.

## Follow-up actions

1. Add a focused automated component test covering loading and load-error states when the repository's test harness supports it cleanly.
2. Resolve the external Supabase Preview check failure so future PRs do not rely on a known-broken preview integration.
3. Confirm the post-merge Vercel production deployment independently when Vercel access is available.
4. Continue RuralMedEd through the suite-level path: identify the assessor/benchmark document, link and classify it, confirm the suite, then conduct the pre-use review.

## Related records

- Parent audit: `2026-09-17_pr1218_assessment-suite-access-boundaries.md`.
- Working plan: `assessment-suite-workflow-correction-plan.md` at the workspace root.
