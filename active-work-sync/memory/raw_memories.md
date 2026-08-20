# Raw Memories

Merged stage-1 raw memories (stable ascending thread-id order):

## Thread `01a01d23-26f5-7fd2-b98a-d184e3030e0d`
updated_at: 2026-08-19T06:45:17+00:00
cwd: \\?\C:\Users\brian\complyhubworkspace
rollout_path: C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26f5-7fd2-b98a-d184e3030e0d.jsonl
rollout_summary_file: 2026-08-20T03-07-18-KCbH-complybot_phase2_agentic_retrieval_shipped.md

---
description: Shipped ComplyBot RAG Phase 2 agentic tool-use retrieval behind a per-tenant kill switch; PR merged, deployed, CI verified 28/28 tests, Vivacity testing tenant enabled, living docs and audit updated.
task: complybot-rag-phase2-agentic-tool-retrieval
 task_group: rto-compass-hub / complybot-rag
 task_outcome: success
cwd: C:\Users\brian\complyhubworkspace\rto-compass-hub
keywords: ai-router, tool-use, feature_flags, claude-sonnet-4-6, deno-test, PR-523, Vivacity, fresh-eyes, Supabase
---

### Task 1: Phase 2 implementation and rollout

task: Replace Compliance-mode ILIKE retrieval with agentic directory/tool retrieval.
task_group: rto-compass-hub / complybot-rag
task_outcome: success

Preference signals:
- The user asked to “Scout first, then plan” and repeatedly requested “plain english first” explanations -> explain production architecture and rollout impact simply before technical detail.
- The user requested three rounds of fresh-eyes review before proceeding -> use independent adversarial review for substantial production changes.
- The user chose staged enablement for the Vivacity testing tenant before wider rollout -> prefer dark launch/ring rollout and verify live behavior before global enablement.

Reusable knowledge:
- Phase 2 shipped in PR #523, merge commit `e59a7bea33350df506ec0fd780f7831d6624a629`, implementation commit `8b617cbb9`.
- New modules live under `supabase/functions/ai-router/`: `featureFlags.ts`, `retrieval.ts`, `toolDefinitions.ts`, `toolDispatch.ts`, `toolLoop.ts`, with four `_test.ts` files.
- Compliance-mode agentic path uses `claude-sonnet-4-6`; Help mode and legacy ILIKE path remain available.
- `feature_flags` is tenant-scoped. New retrieval runs only when `flag_key = 'complybot_tool_retrieval'`, tenant row is `status = 'active'` and `is_enabled = true`; missing/read-error fails safe to ILIKE.
- Important production safeguards include six-iteration cap, final-turn `tool_choice: { type: 'none'}`, typed 429/402 handling, tool failures as tool results, prompt caching, deduplication, structured logging, and separate retrieval-error telemetry.
- CI’s scoped command is `deno test supabase/functions/ai-router`; the real merge-commit run passed `28 passed | 0 failed`.
- Merging to `main` automatically deploys changed edge functions; `ai-router` deployment was confirmed successful in Supabase project `gdwhlstfguxarnxasrrs`.
- Vivacity test tenant: `bc515b64-d24f-4e9d-811b-1f5c0f62a3f7`. Its flag row is active/enabled and the audit event is attributed to the user’s confirmed super-admin account.

Failures and how to do differently:
- The feature-flag admin UI currently does not provide tenant scoping correctly; raw unauthenticated SQL triggers `feature_flag_audit_events.actor_id` NOT NULL failure. Preserve authenticated actor attribution when provisioning flags.
- Do not claim CI passed based on a cancelled run or a later no-op run; verify the actual edge-function test step executed and inspect its output.
- Keep CI test discovery narrowly scoped. Recursive `deno test supabase/functions` picked up unrelated integration tests and would have failed; the final scope is only `supabase/functions/ai-router`.

References:
- PR: `https://github.com/ComplyHub-ai/rto-compass-hub/pull/523`
- CI evidence: `28 passed | 0 failed`
- Audit file: `C:\Users\brian\complyhubworkspace\complyhub-kb\audit\2026-08-19_pr523_complybot-phase2-agentic-retrieval.md`
- Living doc: `C:\Users\brian\complyhubworkspace\complybot-rag-improvement.md`
- Remaining follow-up: manual QA of real compliance questions on Vivacity tenant; feature-flag UI bug should be tracked separately.

## Thread `01a01d23-26fb-7011-bff1-a52e46932a11`
updated_at: 2026-08-19T06:12:27+00:00
cwd: \\?\C:\Users\brian\complyhubworkspace
rollout_path: C:\Users\brian\.codex\sessions\2026\08\20\rollout-2026-08-20T11-07-18-01a01d23-26fb-7011-bff1-a52e46932a11.jsonl
rollout_summary_file: 2026-08-20T03-07-18-89pv-pr_triage_and_standalone_forms_frontend_rebuild.md

---
description: Triaged Copilot dependency PRs, rebuilt urgent standalone Forms PR #498 without duplicate migrations, and merged replacement PR #521
 task: PR triage and frontend-only standalone Forms rebuild
task_group: complyhub PR review and git workflow
task_outcome: success
cwd: C:\Users\brian\complyhubworkspace
keywords: gh pr, Copilot, brace-expansion, dependency-risk, Supabase, standalone-forms, migrations, worktree, ci-gate, active-work.md, PR-521
---

### Task 1: Triage dependency PRs #505–#519

task: Identify worthwhile Copilot dependency PRs and safely close redundant/dead ones
task_group: dependency PR review
task_outcome: success

Preference signals:
- The user asked to know what Copilot PRs are about and whether risky dependency changes are worth merging -> prioritize security impact, redundancy, and actual lockfile state over PR titles.
- The user approved closing dead items first and reviewing real candidates one at a time -> sequence cleanup before deeper review and avoid concurrent review runs.

Reusable knowledge:
- Verify competing dependency PRs against current `main` before closing. In this case `main` already contained brace-expansion 2.1.4 top-level, 5.0.9 under minimatch, and 1.1.18 under eslint/archiver-utils.
- Closed #505, #507, #509, #511 as superseded and #510/#512 as empty 0-file WIP stubs. #506 and #508 were already merged.

Failures and how to do differently:
- Initial title-based assumption that all brace-expansion PRs were duplicates was corrected by inspecting actual lockfile diffs and nested dependency paths. Always perform this verification first.

References:
- Commands: `gh pr view <n> --repo ComplyHub-ai/rto-compass-hub --json ...`; `gh pr diff <n> --repo ComplyHub-ai/rto-compass-hub`.
- Closed PRs: `505, 507, 509, 510, 511, 512`.

### Task 2: Urgent PR #498 replacement

task: Separate already-shipped standalone Forms database work from missing frontend and deliver a safe replacement PR
task_group: standalone Forms feature and migration safety
task_outcome: success

Preference signals:
- The user said “do first 498 as it is needed urgently” -> urgent user priorities should override the prior batch sequence.
- The user requested the superadmin casing issue be parked in `active-work.md`, then asked to commit, push, and open a PR -> record out-of-scope findings before delivery and complete the full git handoff when explicitly requested.

Reusable knowledge:
- `main` already had standalone Forms database/storage/token migrations via reconciled files, while PR #498 attempted competing migration filenames. Do not merge #498 migrations as-is.
- Production storage policy requires path segments `token/uploadSession/fieldId/filename`; frontend code in #498 matched the live two-argument authorization function.
- The live RPCs `public_get_form_by_token` and `public_submit_form` enforce published/active standalone forms, active tenants, write-lock status, and anonymous-access rules.
- Worktree discipline matters: worktree A was claimed for unrelated work; use an unclaimed clean worktree and update `active-work.md` registry.
- Applicable `ci-gate` checks passed. Type-check was intentionally skipped because this workspace’s standard command checks zero files and full build hangs; record that limitation explicitly.
- Replacement PR #521 merged as `4ff3d2ddc`; #498 was closed as superseded. Worktree C returned to clean `main`.

Failures and how to do differently:
- A wrong relative path initially failed when entering worktree C; locate worktrees from the workspace root or use `git worktree list`.
- Keep migration changes out of a frontend-only replacement when the live database layer already exists; duplicate objects can fail deployment or create version drift.

References:
- Branch: `feat/standalone-forms-frontend-only`.
- Commit: `6ff09df78 feat: standalone Forms platform (Phase 1 frontend)`.
- PR: `https://github.com/ComplyHub-ai/rto-compass-hub/pull/521`.
- Files: `src/pages/forms/StandaloneFormsPage.tsx`, `src/pages/public/StandaloneFormResponse.tsx`, `src/AppRoutes.tsx`, `src/config/permissions.ts`, `src/config/sidebarConfig.ts`, `src/types/standalone-forms.ts`, `tests/pages/forms/standalone-forms.test.ts`.
- Parked finding: pre-existing `userRoles?.includes('super_admin')` casing concern in `src/config/permissions.ts`; not introduced by #521.

