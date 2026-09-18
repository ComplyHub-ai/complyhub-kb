# Assessment Suite workflow and access-boundary correction — PR #1218

**Date:** 17 September 2026  
**Audited by:** Brian / Codex  
**Repository:** `ComplyHub-ai/rto-compass-hub`  
**Pull request:** [#1218 — Harden Assessment Suite access boundaries](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1218)  
**Branch:** `feat/assessment-suite-workflow-correction`  
**Merge commit:** `3bb4b7072a7f2a20db8173695475e87af97fd737`  
**Merged:** 17 September 2026 at 04:42:41 UTC  
**Related follow-up:** [PR #1238 — Fix pre-use review workspace loading guard](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1238)

## Executive summary

PR #1218 corrected the Assessment Suite workflow at both the user-interface and database layers. The central rule is now explicit: a normal pre-use review must start from an Assessment Suite version, not from an individual knowledge or performance document. The suite must have linked components and a human-confirmed completeness decision before the review can start.

The change also separated two actions that had been easy to confuse:

- creating a new suite from standalone assessment documents; and
- adding or linking another document to an existing suite.

That distinction directly addresses RuralMedEd's reported experience: the knowledge and performance documents were separate assessment-tool records, the mapping record was outside the suite, and the pre-use review had been started against the performance document rather than the suite.

The PR included a database migration that is now present in the live Supabase migration ledger as version `20260917025606` / `assessment_assurance_access_visibility`. The migration adds parent/type, tenant, tool/version, descendant-integrity, visibility, storage-policy, and workflow guardrails. It also exposes the authorised completeness-refresh path used by suite assembly.

This entry records what shipped, what was verified, what was corrected in the RuralMedEd tenant after the PR, and what remains outside the evidence. It does not claim that all possible legacy review rows were automatically repaired or that the hosted Supabase Preview check was healthy.

## Customer and product context

RuralMedEd reported that it could upload assessment documents but could not understand how to:

1. move an uploaded document through approval;
2. group the knowledge, performance, mapping, and assessor material into one suite;
3. attach an existing mapping document to a suite that already existed; or
4. start the correct pre-use review without ending up in a zero-component or apparently blocked review.

The intended product model is:

```text
standalone source documents
        -> assessment suite version
        -> human completeness confirmation
        -> pre-use review
        -> verification
        -> approval
        -> publication
```

The suite is the review object. The knowledge questions, practical task, assessor/benchmark material, mapping matrix, and supporting documents remain individual source records linked to the exact suite version.

## Before the correction

The application could present assessment tools generally in the pre-use start flow. That made it possible to select an individual assessment document and create a review against that tool/version even though the review process needs the complete suite context.

The earlier UI also made the following distinctions unclear:

- `Cluster` or `Create suite` versus updating an existing suite;
- a mapping document existing in the register versus being linked as a suite component;
- documents being classified versus the suite being complete; and
- a draft review existing versus the selected suite version being ready for assurance.

At the database layer, the previous direct-call paths did not consistently enforce that a component, requirement mapping, finding, or review descendant belonged to the exact tenant/tool/version tuple or that the parent was an Assessment Suite.

## What PR #1218 changed

### Pre-use review entry point

- The pre-use review list now filters to `assessment_suite` tools.
- Starting a review requires an existing exact suite version.
- The selected version must have linked components.
- The suite must have a human-confirmed completeness decision.
- The old path that materialised a new draft version during review start is no longer used for this workflow.
- The hook repeats the guard before inserting the review, so stale UI state cannot silently recreate the standalone-review path.

### Suite assembly and document linking

- Existing-suite assembly is now presented as `Add or link document`.
- New-suite creation is kept as a separate action for standalone source records.
- The existing-suite dialog filters out suite records, the target suite itself, already-linked source tools, already-linked source versions, duplicate storage paths, and duplicate imported filenames.
- Component writes are constrained to the active suite version and verify the target parent/type and source ownership.
- The suite detail flow exposes a clearer handoff from document linking to completeness confirmation and then pre-use review.

### Readiness and role behavior

- Readiness counts are scoped to actual Assessment Suite records rather than all assessment tools.
- Standalone-tool actions now communicate that they create or update a suite rather than opening a review directly.
- Consultant access to the new-suite action was tightened; the draft-creation hook also rejects an unauthorised call before attempting the insert.
- Support-mode SuperAdmin and ordinary tenant-role behavior were considered separately in the access path.
- Rejected review-start promises remain inside the dialog error path rather than becoming unhandled UI failures.

### Database enforcement

Migration `20260917025606_assessment_assurance_access_visibility.sql` added or revised:

- exact tenant/tool/version integrity checks for components and descendants;
- parent Assessment Suite type checks;
- review readiness and terminal-state guards;
- visibility rules for published versus unpublished assurance working data;
- storage visibility rules for assessment-assurance files;
- consultant and support-mode role boundaries;
- the authorised completeness-refresh RPC path; and
- protection against invalid finding/component relationships and deleted-finding history failures.

The database layer is important here because the UI alone cannot protect direct RPC, PostgREST, retry, or stale-client callers.

## Files and change surface

GitHub records 17 changed files: 10 frontend/hook/type files, one 646-line Supabase migration, and six focused test files. The principal areas were:

- Assessment Suite grouping and suite detail actions;
- Assessment Tools assurance and pre-use review tabs;
- suite creation and component hooks;
- pre-use review start behavior;
- generated Supabase types;
- assessment-tool workspace and cluster dialogs; and
- focused tests for access boundaries, bulk import, auto-build, review start, and completeness refresh.

The PR had 1,771 additions and 313 deletions across the final GitHub diff.

## Review and correction history

The branch went through several review iterations before merge. Review feedback identified and drove correction of the following classes of issue:

- legacy storage paths must not be broken by unsafe unconditional UUID casts;
- strict role helpers are required where Administrator and Consultant must remain distinct;
- support-mode SuperAdmin must be accepted consistently by the authorised completeness-refresh path;
- deleted finding history must not block the original finding deletion;
- child records must validate the exact tenant/tool/version tuple, not only the parent tool type;
- affected component IDs in findings require the same integrity treatment; and
- the review workspace had a separate initial-loading dereference defect, which was fixed in follow-up PR #1238.

The GitHub review records remained comments/recommendations rather than a formal approving review. The branch was merged after the implementation and CI gates were satisfied enough for the authorised merge path. That is recorded as a review-process limitation, not as evidence that no review findings existed.

## Verification evidence

### Repository and CI checks

The PR checks recorded successful results for:

- blocking lint;
- blocking type check;
- changed-file security checks;
- changed-file `.single()` guard;
- migration guards;
- migration drift check;
- Edge Function type check;
- risk-intelligence runtime contract;
- `config.toml` coverage; and
- CodeQL JavaScript/TypeScript and Python analysis.

The Vercel preview status was successful.

The Supabase Preview check failed on the external preview project. This was not treated as proof that the live migration was absent: the live migration ledger was checked separately and contains `20260917025606` with the expected name.

The PR body also recorded that `supabase db lint` could not initialise `pgsql_check` because no schema was selected, so that result was an environment/tooling failure before migration analysis rather than a clean database-lint result.

### Live database and migration evidence

The live Supabase project was checked through the connected project tooling. The migration ledger contains:

```text
20260917025606  assessment_assurance_access_visibility
```

The live definitions and trigger state were also inspected during the RuralMedEd investigation. The relevant controls include:

- `rpc_confirm_assessment_suite`, which checks the Assessment Suite parent type;
- the restricted unchecked completeness RPC, which is not granted to ordinary authenticated callers;
- `trg_guard_assessment_suite_parent_type`, active across the relevant component/review surfaces;
- tenant/tool/version integrity validation; and
- review-start/completeness triggers that require the exact suite version to be complete when the relevant lifecycle transition is attempted.

No Edge Function was changed by this PR. The connected Edge Function listing endpoint was unavailable during this audit, so no claim about a live Edge Function inventory is made here.

### Hosted browser evidence

The related hosted positive-path recheck used the approved Vivacity Testing Tenant and a fresh browser tab with the review URL. It confirmed:

- the review heading rendered;
- three documents rendered in the workspace;
- the loading-snag message was absent; and
- browser development errors were empty for the check.

The temporary QA records and storage files were removed afterward. The cleanup check found zero matching temporary database records, zero matching temporary storage objects, and the local temporary seed directory was removed.

This was a hosted Playwright locator check through the browser-control lane, not a new checked-in repository end-to-end spec. That distinction matters because the loader regression was identified by review and verified on the hosted path, but the repository still lacks a dedicated automated loading/error-state test for that exact component behavior.

## RuralMedEd live-state correction after the PR

The live RuralMedEd tenant is:

```text
Rural Medical Education Australia Limited
55784940-fdc4-44cd-8bf8-cc1ecc4ac8d2
```

The relevant records were verified as:

```text
AT0001  BSBMED301 Assessment Knowledge       standalone assessment tool
AT0002  BSBMED301 Assessment Performance     standalone assessment tool
AT0003  BSBMED301 Assessment Suite           assessment_suite
AT0004  BSBMED301 Assessment Mapping         standalone assessment tool
```

Before the data correction, AT0003 version 1.0 contained the knowledge and practical components, while AT0004 was still unlinked. The tenant also had three draft pre-use reviews: two pointed at the standalone AT0001/AT0002 records and one pointed at AT0003.

The approved data correction linked AT0004 to AT0003 version 1.0 as a required `mapping_matrix` component. The link preserved the existing mapping storage object and recorded source-tool, source-version, storage-path, target-version, and correction-reason provenance in component metadata.

After the correction:

- the suite has three linked components;
- mapping status is `provided_unverified`;
- the suite remains `unable_to_determine` and not declared complete;
- no assessor/benchmark component is present; and
- the mapping note explicitly says human verification remains outstanding.

This is intentional. Linking the mapping makes the record structurally clearer, but it does not invent assessor/benchmark evidence or mark the suite ready. RuralMedEd still needs to provide or identify the assessor/benchmark document, classify it, confirm the complete suite, and then use the suite-level pre-use review.

The two existing standalone draft reviews were not rewritten or deleted. An attempted status rewrite was rejected by the active parent-type trigger and rolled back. We preserved those rows rather than bypassing the guard or silently altering audit history. They should be treated as legacy draft records requiring an explicit product/data-retirement decision, not as proof that the old workflow remains valid for new reviews.

## What this proves

- New normal pre-use review starts are constrained to Assessment Suite versions by the application path.
- Suite assembly now has a discoverable existing-suite linking action distinct from new-suite creation.
- The database contains the intended access/integrity migration in its live ledger.
- The RuralMedEd mapping record is now linked to the existing suite version without copying or deleting the source file.
- The suite is deliberately not marked ready while assessor/benchmark material and human confirmation are absent.
- The hosted positive path rendered successfully after the loader fix and QA cleanup completed.

## What this does not prove

- It does not prove every historical standalone draft review has been automatically migrated, closed, or removed.
- It does not prove RuralMedEd has supplied the missing assessor/benchmark evidence.
- It does not prove mapping verification, suite confirmation, approval, or publication for AT0003.
- It does not prove every direct PostgREST/RPC caller is covered by an end-to-end browser test.
- It does not provide a clean Supabase Preview result; that external check failed.
- It does not provide a checked-in automated regression test for the workspace loading/error states.
- It does not provide an independently queried post-merge Vercel production deployment record; the PR preview status was successful, but the Vercel connector was not authenticated for a separate post-merge lookup during this audit.

## Follow-up actions

1. RuralMedEd must provide or identify the assessor guide, marking guide, benchmark, or equivalent assessor-evidence document for BSBMED301.
2. Link that document to AT0003 version 1.0, classify it, and confirm the suite only after the required material is present.
3. Start or continue the pre-use review from AT0003, not AT0001 or AT0002.
4. Decide explicitly how the two legacy standalone draft reviews should be retired or retained for history.
5. Add a repository-level automated test for the loading/error guard in `PreUseReviewWorkspace`.
6. Resolve the external Supabase Preview integration failure and independently confirm the post-merge Vercel production deployment when the connector is available.

## Related records

- Working plan: `assessment-suite-workflow-correction-plan.md` at the workspace root. It remains a historical planning record and contains earlier “database unchanged” statements that were true before implementation and live correction; it should not be read as the final state.
- Follow-up audit: `2026-09-17_pr1238_preuse-workspace-loader.md`.
- Customer guidance: the response sent to RuralMedEd explaining suite assembly, mapping linkage, assessor/benchmark evidence, confirmation, and suite-level pre-use review.
