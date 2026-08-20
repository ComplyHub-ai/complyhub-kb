v1

## User Profile

Brian works on ComplyHub / `rto-compass-hub`, often coordinating production PRs, Supabase-backed features, edge functions, and rollout safety. He uses Codex for scoped investigation, implementation, independent review, and complete git handoff. He values plain-English explanations before deep technical detail, real evidence over titles or assumptions, and controlled tenant-first rollout for consequential production behavior.

## User preferences

- Start substantial work with “Scout first, then plan”; give “plain english first on the plan” before technical architecture or rollout detail.
- For production changes, use independent “fresh eyes” reviews at meaningful gates and show evidence that the real CI/deployment step ran.
- Prefer a dark launch/ring rollout (for example a testing tenant) and validate live behavior before enabling globally.
- For dependency PRs, assess actual lockfile/diff paths, security impact, and current `main`, not PR titles; close dead items first and review real candidates one at a time.
- If the user reprioritizes something as urgent, preempt the batch sequence. Park verified out-of-scope findings in `active-work.md`; when asked to “commit and push and pr,” complete that handoff.

## General Tips

- In `rto-compass-hub`, inspect `active-work.md` and `git worktree list` before editing; do not use a worktree claimed for unrelated work.
- For migration-bearing changes, verify current `main` and the live schema/RPC/storage contracts before merging; a frontend-only replacement may be correct when database work already shipped.
- Edge-function CI must prove the intended test command executed on the real merge commit. For ComplyBot Phase 2, scope is `deno test supabase/functions/ai-router`, not recursive `deno test supabase/functions`.
- Tenant flag insertion must preserve authenticated audit attribution; unauthenticated SQL can fail `feature_flag_audit_events.actor_id` NOT NULL.

## What's in Memory

### C:\Users\brian\complyhubworkspace\rto-compass-hub

#### 2026-08-19

- ComplyBot RAG Phase 2 agentic retrieval: ai-router, complybot_tool_retrieval, claude-sonnet-4-6, toolLoop.ts, PR-523, Vivacity
  - desc: Search first for follow-up work on Compliance-mode tool retrieval, tenant feature flags, the deployed `ai-router`, or Phase 3 planning.
  - learnings: Fail-safe flag fallback keeps legacy ILIKE; use the scoped Deno suite and verify the actual merge-commit CI run before reporting success.

### C:\Users\brian\complyhubworkspace

#### 2026-08-19

- Copilot dependency PR triage: gh pr view, gh pr diff, brace-expansion, minimatch, lockfile, PR-505
  - desc: Use for reviewing vulnerable/dependency PR batches and deciding whether stale candidates are truly redundant on current `main`.
  - learnings: Compare nested lockfile paths rather than titles; automation can produce competing fixes for separate transitive paths.
- Standalone Forms frontend-only replacement: standalone-forms, PR-498, PR-521, migrations, public_submit_form, active-work.md
  - desc: Use for Forms changes, reconciling migrations with live Supabase contracts, and safe worktree/CI handoff.
  - learnings: `main` already had the database layer, so #521 delivered only frontend; preserve that boundary and manually QA publish/submit/upload/tenant isolation.

### Older Memory Topics

