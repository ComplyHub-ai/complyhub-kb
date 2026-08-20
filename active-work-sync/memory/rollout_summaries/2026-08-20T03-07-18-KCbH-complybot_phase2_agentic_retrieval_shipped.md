thread_id: 01a01d23-26f5-7fd2-b98a-d184e3030e0d
updated_at: 2026-08-19T06:45:17+00:00
rollout_path: C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26f5-7fd2-b98a-d184e3030e0d.jsonl
cwd: \\?\C:\Users\brian\complyhubworkspace

# ComplyBot RAG Phase 2 shipped, enabled for Vivacity testing, and audited

Rollout context: In `C:\Users\brian\complyhubworkspace`, worktree A (`rto-compass-hub`) implemented PR 5 / Phase 2 of `complybot-rag-improvement.md`, replacing Compliance-mode ILIKE retrieval with agentic tool-use retrieval. The work followed Scout → plan → implementation → three fresh-eyes review rounds → commit/push/PR/merge/deploy → controlled tenant rollout.

## Task 1: Re-verify and plan Phase 2

Outcome: success

Preference signals:
- The user explicitly asked to “Scout first, then plan” and later requested “plain english first on the plan” and multiple plain-English explanations of the new files and rollout behavior. Future work should explain architecture and impact in simple language before technical detail.
- The user approved repeated adversarial “fresh eyes” reviews before commit and before rollout, indicating they prefer independent verification and incremental gates for production changes.
- The user wanted the feature enabled first only for the Vivacity testing tenant, then widened after validation, indicating a preference for ring-based rollout rather than immediate global enablement.

Key steps:
- Confirmed worktree A on `main` at `b899ce6e0`; read the living decision doc and current `ai-router/index.ts` before editing.
- Scout verified Phase 0 was present, retrieval remained ILIKE, and the doc’s proposed `claude-sonnet-5` did not match repository convention. The user selected and locked `claude-sonnet-4-6`.
- Confirmed live `feature_flags` schema and live knowledge-article schema via read-only Supabase SQL before writing helpers.

Reusable knowledge:
- Current live flag schema is per-tenant: `flag_key`, `tenant_id`, `is_enabled`, `status`, with audit events requiring a non-null authenticated actor.
- The repo has no existing edge-function feature-flag reader or Anthropic prompt-cache pattern; new local sibling modules were appropriate under `supabase/functions/ai-router/`, not `_shared/`.

## Task 2: Implement Phase 2 agentic retrieval

Outcome: success

Key steps:
- Added `featureFlags.ts`, `retrieval.ts`, `toolDefinitions.ts`, `toolDispatch.ts`, `toolLoop.ts` and four co-located test files.
- Reworked Compliance-mode `ai-router` behind the fail-safe `complybot_tool_retrieval` flag; Help mode and legacy ILIKE behavior remain available.
- Added clause-directory retrieval, tool dispatch, six-iteration cap, forced final answer via `tool_choice: { type: 'none' }`, typed Anthropic API errors, prompt caching, deduplication, structured logging, and error-vs-KB-miss telemetry.
- Added scoped CI execution for only `supabase/functions/ai-router` tests.

Failures and how to do differently:
- Three fresh-eyes passes found and fixed 13 issues, including invalid final-turn API shape, missing 429/402 handling, dropped attachment/page context, array formatting, duplicated formatting logic, duplicate citations, outage-vs-miss telemetry confusion, unknown-tool error classification, raw console logging, stale branch state, and overly broad CI test discovery.
- The first CI run was cancelled by version-bump automation before tests ran; a later no-op CI run skipped edge-function tests. The original run was rerun explicitly against the real merge commit before claiming success.

References:
- Branch: `feat/complybot-tool-retrieval`
- Commit: `8b617cbb9`
- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/523
- Merge commit: `e59a7bea33350df506ec0fd780f7831d6624a629`
- Real CI result: `28 passed | 0 failed`; edge-function deployment succeeded and deployed `ai-router`.

## Task 3: Deploy and controlled rollout

Outcome: success

Key steps:
- Branch was repeatedly fast-forwarded to the moving `origin/main` before commit; final HEAD matched `origin/main` at commit time.
- PR #523 merged; automatic edge-function deployment confirmed `ai-router` live in Supabase project `gdwhlstfguxarnxasrrs`.
- Vercel production deployment matching the merge was confirmed.
- Enabled `complybot_tool_retrieval` only for `Vivacity Testing Tenant` (`bc515b64-d24f-4e9d-811b-1f5c0f62a3f7`), active and enabled.
- The feature-flag creation UI lacked tenant scoping and raw SQL initially failed because the audit trigger required `actor_id`; after confirming the user’s account, the row was created with the user’s authenticated identity and the audit event was verified.

Failures and how to do differently:
- Do not assume merging requires manual edge-function deployment; this repository auto-deploys changed edge functions on merge.
- Do not insert feature flags through unauthenticated SQL without accounting for the audit trigger. The UI currently appears defective for tenant-scoped creation; any workaround must preserve correct actor attribution.

## Task 4: Update living docs and create audit record

Outcome: success

Key steps:
- Updated `complybot-rag-improvement.md` to mark PR #523 / Phase 2 complete and point sequencing toward PR 6 or Phase 3.
- Created `complyhub-kb/audit/2026-08-19_pr523_complybot-phase2-agentic-retrieval.md` documenting implementation, review findings, deployment, CI evidence, rollout, and remaining manual QA/open UI issue.
- The audit file was written but not committed or pushed to `complyhub-kb`.

Reusable knowledge:
- Audit entries follow the existing `complyhub-kb/audit/` format and should include PR facts, files, validation evidence, deployment status, rollout state, and outstanding follow-up work.
