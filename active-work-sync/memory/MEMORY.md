# Memory Index

- [read CLAUDE.md] (renamed from CLAUDE.local.md 16 Jul 2026 — the old filename wasn't auto-loaded by Claude Code's native convention, which is why the orchestration workflow wasn't recognized in fresh sessions before)

## Personal (stays here — how Claude works with Brian specifically)

- [Plain English always — no jargon](feedback_plain_english_always.md) — After every technical explanation, follow immediately with a plain English summary; no file paths, no code snippets, no waiting to be asked
- [UI navigation instructions](feedback_ui_navigation_instructions.md) — When telling Brian to test the platform, give click-path instructions (menu → item), not raw URLs
- [Check migrations CLAUDE.md first](feedback_check_migrations_claude_md_first.md) — always Read rto-compass-hub/supabase/migrations/CLAUDE.md fresh before writing any migration file, don't rely on memory of naming convention
- [The Loop + no popups](feedback_the_loop_and_no_popups.md) — consolidated workflow (FRAME→SCOUT→PLAN→FIX→REVIEW→SHIP), active-work.md ledger, Scope Line anti-rabbit-hole rule, state-and-proceed instead of AskUserQuestion, cursor CLI kept as token-budget handoff
- [Three-agent model: Scout/Fixer/Reviewer](feedback_three_agent_model.md) — collapsed 6 callsigns to 3: Scout (recon+root-cause+plan), Fixer (Claude Code only, edits/commits), Reviewer (adversarial review+mechanical gauntlet+verdict)
- [Post-Push Watch beat](feedback_post_push_watch_beat.md) — added WATCH beat: ScheduleWakeup instead of eager CI polling, verify-bot-fix skill guards every Bugbot finding, mandatory living-rules line after each confirmed fix, ci.yml concurrency-cancel added
- [No autonomous CI polling](feedback_no_autonomous_ci_polling.md) — don't ScheduleWakeup to auto-check CI/PR status; don't act on a stale wakeup once the situation's moved on — only check when Brian asks. Recurred a 3rd time 20 Jul 2026 because CLAUDE.md itself told Claude to do it — CLAUDE.md's WATCH beat is now fixed to match this rule
- [Migration drift baseline](reference_migration_drift_baseline.md) — `.drift-baseline.txt` in rto-compass-hub is the authoritative CI-tracked list of already-known orphaned production migrations; check it BEFORE any drift reconciliation investigation, don't rebuild it from scratch. Also now codified in CLAUDE.md directly

## Imported 27 Jul 2026 (cross-machine sync from home PC — see complyhub-kb/handoffs/memory-export-2026-07-27.md)

- [Fable Audit Prompt](project_fable_audit.md) — full-spectrum audit prompt for Fable at complyhub-kb/reference/fable-audit-prompt.md
- [Connection Test Preference](feedback_connection_tests.md) — use minimal read calls (e.g. get_project_url) to test MCP connections, not list_tables/data pulls
- [Handover Scope](feedback_handover_scope.md) — handover text = next single step/PR only, never restate the full remaining roadmap
- [PR Audit Functional Deps](feedback_pr_audit_functional_deps.md) — check runtime/build dependencies between PRs, not just file-line conflicts
- [Multi-Item Fix Completeness](feedback_multi_item_fix_completeness.md) — before shipping a multi-part fix, re-derive the original full list, don't trust conversation memory
- [CREATE OR REPLACE: Check Git History Too](feedback_create_or_replace_check_git_history_too.md) — both the live pg_get_functiondef AND the 00000000000000_baseline.sql copy can be stale vs git; check migration history for the object before replacing it, do it while authoring not just at cichecker
- [No AskUserQuestion / No Monitor](feedback_no_askuserquestion.md) — never use AskUserQuestion, Monitor, or ScheduleWakeup; plain-text options, single direct status checks instead of watch loops or self-scheduled wakeups
- [Living Doc Decision Tracking](feedback_living_doc_decision_tracking.md) — root-level .md per body of work, one-at-a-time locked decisions written into file, cichecker before commit/PR, delete after audit
- [Cichecker: Exhaustive Service-Role Check](feedback_cichecker_exhaustive_service_role_check.md) — grep ALL changed edge functions for SUPABASE_SERVICE_ROLE_KEY in one pass, never a remembered subset
- [Role Casing: Proper Case, Not Snake_case](feedback_role_casing_proper_case.md) — tenant_members.role is Proper Case today; CLAUDE.md's snake_case table is a future-migration target, not current state
- [generate-audit-pack Role Bug](project_generate_audit_pack_role_bug.md) — casing bug (lowercase vs Proper Case) + profiles.role staleness confirms 403 for every real Admin/CM, corrected 27 Jul 2026
- [Tenant Context Race in Effects](feedback_tenant_context_race_effect_deps.md) — tenant-scoped fetch effects must depend on useEffectiveRole's ready + effectiveTenantId, not just route params
- [Status Enum vs CHECK Constraint](feedback_status_enum_vs_check_constraint.md) — grep the table's CHECK constraint for the full status enum before trusting a copied allowlist; Checker missed this on PR #311 too
- [Cichecker Skill](project_cichecker_skill.md) — location/purpose of the cichecker skill at rto-compass-hub/.claude/skills/cichecker/SKILL.md, run before commit/push/PR

Note: the source `user_role.md` reference in the original index was a dangling link (file never existed at export time) — not recreated here, consistent with how [[feedback_living_doc_decision_tracking]] already tolerates unresolved `[[name]]` links.

## Migrated to complyhub-kb (20 Jul 2026) — read these there, not here

Team-durable facts don't live in personal memory anymore — they were moved into the shared, git-tracked KB so Carl/RJ/Dave see them too. This index only points at where to look:

- **`complyhub-kb/pinned/conventions.md`** — migration discipline (drift prevention, idempotency-on-rerun check, archive-never-read, baseline-first rule), unit test expectations, pre-push adversarial self-review checklist (status enums, role column dual-storage, AEST/AEDT timezone), never-run-npm-build, existing-data impact check for PR review (auto-wipe effects, mutation atomicity, edit pre-population fallback), never-hardcode-URLs/credentials
- **`complyhub-kb/pinned/decisions.md`** — Brian's full merge authority on rto-compass-hub PRs (no Carl/Angela sign-off required), the two deploy paths (GitHub main-merge auto-deploys production via Vercel; Lovable/staging is a separate publish path)
- **`complyhub-kb/reference/diagnosis-discipline.md`** — full bug-tracing method (trace execution path end to end, DB data-state check first, audit every switch/case and every sibling file, NEW-013 lessons)
- **`complyhub-kb/reference/supabase-mcp.md`** — targeted DB queries over bulk list dumps (scoped execute_sql/grep, never list_migrations/list_* for a single-record check), list_tables timeout workaround
- **`complyhub-kb/reference/db-schema-cheatsheet.md`** — before every Supabase MCP read, check this first so AI doesn't have to list all tables; re-verify weekly/fortnightly for accuracy
- `.cursor/orchestrate/roles.md` § "Known incident" — Tinker/dry-run-merge crash-safety mitigation (now folded into the Reviewer mechanical-gauntlet docs); `CLAUDE.md`/`roles.md`/`.cursor/rules/ai-orchestration.mdc` — the current 3-agent orchestration model itself (superseded the old 6-callsign build notes)

**Why this split:** feedback about how Claude should communicate/behave toward Brian stays personal (not useful to a team-wide KB); facts about the codebase, process, or permissions are team-durable and belong where Carl/RJ/Dave can read them too. See [[feedback_the_loop_and_no_popups]] for the fuller rationale.
