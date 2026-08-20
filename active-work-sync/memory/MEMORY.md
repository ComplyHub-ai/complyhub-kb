# Task Group: rto-compass-hub / ComplyBot RAG Phase 2 agentic retrieval

scope: Plan, implement, review, deploy, and ring-roll out Compliance-mode agentic tool retrieval in `ai-router`; use for follow-on Phase 3/PR 6 or tenant rollout/flag investigations.
applies_to: cwd=C:\Users\brian\complyhubworkspace\rto-compass-hub; reuse_rule=repo- and deployment-specific facts apply to this checkout/Supabase project; retain the production-gating and CI lessons for similar edge-function work.

## Task 1: Replace Compliance-mode ILIKE retrieval with agentic directory/tool retrieval; merged, deployed, and enabled for Vivacity testing

### rollout_summary_files

- rollout_summaries/2026-08-20T03-07-18-KCbH-complybot_phase2_agentic_retrieval_shipped.md (cwd=C:\Users\brian\complyhubworkspace\rto-compass-hub, rollout_path=C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26f5-7fd2-b98a-d184e3030e0d.jsonl, updated_at=2026-08-19T06:45:17+00:00, thread_id=01a01d23-26f5-7fd2-b98a-d184e3030e0d, shipped PR #523; manual tenant QA remains)

### keywords

- ai-router, complybot_tool_retrieval, feature_flags, claude-sonnet-4-6, toolLoop.ts, tool_choice, deno test supabase/functions/ai-router, PR-523, Vivacity, gdwhlstfguxarnxasrrs, fresh-eyes

## User preferences

- When production work begins, the user asked: “Scout first, then plan” and “plain english first on the plan” -> inspect the current implementation and live schema first, then explain architecture and rollout impact simply before technical detail. [Task 1]
- For substantial production changes, the user requested three rounds of “fresh eyes” review before proceeding -> use independent adversarial reviews at meaningful gates (before commit and before rollout). [Task 1]
- For new production behavior, the user chose enablement only for the “Vivacity testing tenant” before widening -> default to a dark launch/ring rollout with live validation before global enablement. [Task 1]

## Reusable knowledge

- Phase 2 shipped in PR #523 (`8b617cbb9`; merge `e59a7bea33350df506ec0fd780f7831d6624a629`). The new sibling modules under `supabase/functions/ai-router/` are `featureFlags.ts`, `retrieval.ts`, `toolDefinitions.ts`, `toolDispatch.ts`, and `toolLoop.ts`, with four co-located `_test.ts` files; this repo had no existing edge-function flag reader or Anthropic prompt-cache pattern to reuse from `_shared/`. [Task 1]
- Compliance mode uses `claude-sonnet-4-6` only when tenant flag `complybot_tool_retrieval` is `status = 'active'` and `is_enabled = true`; missing/read-error fails safe to legacy ILIKE. Help mode and legacy ILIKE remain available. [Task 1]
- Preserve the agentic safeguards: clause-directory retrieval/tool dispatch, six-iteration cap, forced final answer with `tool_choice: { type: 'none' }`, typed 429/402 handling, tool failures returned as tool results, prompt caching, deduplication, structured logging, and separate retrieval-error versus KB-miss telemetry. [Task 1]
- Validate this edge-function suite with `deno test supabase/functions/ai-router`; the real merge-commit run reported `28 passed | 0 failed`. Merging changed edge functions to `main` auto-deploys them; `ai-router` was confirmed deployed to Supabase project `gdwhlstfguxarnxasrrs`. [Task 1]
- `feature_flags` is tenant-scoped (`flag_key`, `tenant_id`, `is_enabled`, `status`). Vivacity Testing Tenant is `bc515b64-d24f-4e9d-811b-1f5c0f62a3f7` and was enabled as the test ring. The living plan is `C:\Users\brian\complyhubworkspace\complybot-rag-improvement.md`; the audit record is `C:\Users\brian\complyhubworkspace\complyhub-kb\audit\2026-08-19_pr523_complybot-phase2-agentic-retrieval.md` (written but not committed/pushed to the KB). [Task 1]

## Failures and how to do differently

- Symptom: a tenant-scoped feature flag cannot be provisioned through the admin UI, or raw SQL fails with `feature_flag_audit_events.actor_id` NOT NULL. Cause: the UI does not scope creation correctly and the audit trigger requires an authenticated actor. Fix: use a workaround only after confirming the actor identity and verify the resulting audit event; do not use unauthenticated insertion. [Task 1]
- Symptom: CI appears green after a cancelled or no-op run. Cause: the edge-function tests did not execute. Fix: rerun/inspect the actual merge-commit workflow and the test-step output before claiming CI success. [Task 1]
- Symptom: `deno test supabase/functions` discovers unrelated integration tests. Cause: test discovery is too broad. Fix: keep the CI scope at `deno test supabase/functions/ai-router`. [Task 1]
- Fresh-eyes uncovered invalid final-turn API shape, dropped attachment/page context, duplicate citations, unknown-tool classification, raw console logging, stale branch state, and outage-vs-miss telemetry confusion. Treat these as a focused review checklist for future agentic retrieval changes. [Task 1]

# Task Group: rto-compass-hub / dependency PR triage

scope: Review Copilot/dependency PR batches for real risk and safely close stale, superseded, or empty items; use before deciding whether to merge vulnerability automation.
applies_to: cwd=C:\Users\brian\complyhubworkspace; reuse_rule=the PR numbers and resolved versions are historical to this repository state; reuse the lockfile-path verification workflow for future dependency batches.

## Task 1: Triage Copilot dependency PRs #505–#519; closed stale and empty candidates

### rollout_summary_files

- rollout_summaries/2026-08-20T03-07-18-89pv-pr_triage_and_standalone_forms_frontend_rebuild.md (cwd=C:\Users\brian\complyhubworkspace, rollout_path=C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26fb-7011-bff1-a52e46932a11.jsonl, updated_at=2026-08-19T06:12:27+00:00, thread_id=01a01d23-26fb-7011-bff1-a52e46932a11, closed #505/#507/#509/#510/#511/#512)

### keywords

- gh pr view, gh pr diff, Copilot, brace-expansion, lockfile, minimatch, eslint, archiver-utils, PR-505, PR-519, dependency-risk

## User preferences

- When assessing Copilot PRs, the user asked what they are “about and whether risky dependency changes are worth merging” -> prioritize security impact, redundancy, actual lockfile state, and diff paths over PR titles. [Task 1]
- The user approved “closing dead items first” and reviewing real candidates “one at a time” -> clear stale/empty work before deeper review and do not launch concurrent dependency-review runs. [Task 1]

## Reusable knowledge

- Use `gh pr view <n> --repo ComplyHub-ai/rto-compass-hub --json ...` and `gh pr diff <n> --repo ComplyHub-ai/rto-compass-hub`, then compare each affected dependency path with current `main`. Copilot vulnerability automation can open competing PRs for different transitive paths or repeated alerts. [Task 1]
- At this historical check, `main` already had patched brace-expansion versions: top-level `2.1.4`, `5.0.9` beneath `minimatch`, and `1.1.18` beneath `eslint`/`archiver-utils`; #506 and #508 were already merged, #505/#507/#509/#511 were superseded, and #510/#512 had zero changed files. [Task 1]

## Failures and how to do differently

- Symptom: several PR titles look like duplicate brace-expansion fixes. Cause: titles hide which direct/transitive lockfile path each patch targets. Fix: inspect the diff and current lockfile paths before labeling anything redundant or closing it. [Task 1]

# Task Group: rto-compass-hub / standalone Forms frontend-only replacement and migration safety

scope: Safely separate a standalone Forms frontend change from already-shipped database work, including worktree selection, live-contract verification, CI limits, and post-merge QA.
applies_to: cwd=C:\Users\brian\complyhubworkspace; reuse_rule=the Forms database/RPC/storage contracts and PR history are checkout-specific; reuse the no-duplicate-migrations and claimed-worktree safeguards for related work.

## Task 1: Replace urgent PR #498 with frontend-only PR #521; merged without duplicate migrations

### rollout_summary_files

- rollout_summaries/2026-08-20T03-07-18-89pv-pr_triage_and_standalone_forms_frontend_rebuild.md (cwd=C:\Users\brian\complyhubworkspace, rollout_path=C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26fb-7011-bff1-a52e46932a11.jsonl, updated_at=2026-08-19T06:12:27+00:00, thread_id=01a01d23-26fb-7011-bff1-a52e46932a11, replacement PR #521 merged)

### keywords

- standalone-forms, PR-498, PR-521, frontend-only, migrations, public_get_form_by_token, public_submit_form, can_upload_standalone_form_file, active-work.md, git worktree list, ci-gate, userRoles?.includes('super_admin')

## User preferences

- When priorities change, the user said “do first 498 as it is needed urgently” -> urgent stated work preempts the prior batch sequence. [Task 1]
- The user asked to “park the superadmin casing in @active-work.md then commit and push and pr” -> record confirmed out-of-scope findings in the active-work registry, then complete the requested commit/push/PR handoff. [Task 1]

## Reusable knowledge

- `main` already contained the standalone Forms database, storage, and token-generation layer through reconciled migrations; PR #498 mixed the missing frontend with competing migration filenames. Create a frontend-only replacement when live database objects already exist, rather than merging duplicate migrations. [Task 1]
- PR #521 (`feat/standalone-forms-frontend-only`, commit `6ff09df78`, merge `4ff3d2ddc`) added the frontend pages `src/pages/forms/StandaloneFormsPage.tsx` and `src/pages/public/StandaloneFormResponse.tsx`, plus routes, sidebar/permissions, types, docs, and tests, without migrations or edge functions. Thus post-merge required no migration apply, drift reconciliation, or edge deployment. [Task 1]
- Live contract verified: storage paths use `token/uploadSession/fieldId/filename` and call `can_upload_standalone_form_file(token, field_id)`; `public_get_form_by_token` and `public_submit_form` enforce published/active forms, active tenants, write-lock status, and anonymous access. Token generation uses `gen_random_bytes(16)`. [Task 1]
- Consult `active-work.md` and `git worktree list` before editing. Worktree A was already claimed, so clean unclaimed worktree `rto-compass-hub-C` was used and released after merge. Record the known pre-existing `userRoles?.includes('super_admin')` casing concern as not introduced by #521. [Task 1]
- Applicable `ci-gate` checks passed: lint, `.single()` guard, hardcoded-project-ID, deletion, and status-enum coverage. The standard type-check was vacuous and full `tsc --build` hung, so its omission was explicitly recorded. Follow-up manual QA: create/publish/submit a form, test uploads, and verify tenant isolation. [Task 1]

## Failures and how to do differently

- Symptom: migration-bearing PR looks ready but overlaps reconciled live work. Cause: already-shipped database objects use different migration filenames. Fix: verify live schema and `main` first, then exclude duplicate migrations; duplicate objects can fail deployment or create version drift. [Task 1]
- Symptom: entering a worktree fails with a relative-path error. Cause: path guessed from the wrong location. Fix: start from workspace root or locate it with `git worktree list`. [Task 1]
- Do not modify a claimed worktree for unrelated work; use an unclaimed clean worktree and update the `active-work.md` registry. [Task 1]
