# Audit — PR #412

> **Date:** 12 August 2026
> **Scope:** ComplyHub Intelligence — GOV_OVERDUE_ACTION_V1 + ASS_VALIDATION_OVERDUE_V1 rules, superadmin Intelligence viewer
> **Project:** `gdwhlstfguxarnxasrrs`
> **Branch:** `cursor/gov-overdue-action-v1-5f7c` (deleted post-merge) · **Merge commit:** `4f240a0f0`
> **Merged:** 12 August 2026, 07:34 UTC

## Summary

PR #412 was titled and described as delivering a single Intelligence rule (`GOV_OVERDUE_ACTION_V1`)
with UI explicitly out of scope. Review found the actual diff (39 files, +6455/−11) shipped a second
full rule (`ASS_VALIDATION_OVERDUE_V1`) and an entire new superadmin frontend viewer (10 components, 5
hooks, new route/nav entry) — the PR description undersold the change by roughly 85%. Corrected the
description on GitHub before merge so the record matches what actually shipped.

## Review findings and fixes

### HIGH-1 — Tenant search crash (fixed)
`useIntelligenceViewerTenants.ts` compared `tenant_id` (a `uuid` column) with `.ilike` directly,
producing `operator does not exist: uuid ~~* unknown` — confirmed live against production. Fixed by
casting to `tenant_id::text` before the `ilike`.

### HIGH-2 — Silent cross-tenant blank page (fixed via new migration)
A RESTRICTIVE RLS policy (`restrict_sa_select_intelligence_insights`, from
`20260616032602_add_sec_superadmin_tenant_gate_helper.sql`) only allows a super admin to read the
tenant they are currently "inside" — but the new viewer lets them pick any tenant. Selecting any other
tenant returned zero rows with no error, indistinguishable from "nothing to report." Fixed by adding
migration `20260812020000_intelligence_viewer_superadmin_rpcs.sql`: four `SECURITY DEFINER` RPCs
(`rpc_sa_get_intelligence_insights/events/runs/insight_counts`), each independently gated on
`sec.is_super_admin()`, and rewired all four viewer hooks to call them instead of direct table selects.

### Lint blocker (fixed)
`react-refresh/only-export-components` on `IntelligenceRunErrors.tsx` (non-component export mixed into
a component file). Moved `intelligenceRunErrorCount` to `src/lib/intelligence/runErrorCount.ts`.

### `.drift-baseline.txt` — investigated, corrected (not a code fix)
The branch carried a `copilot-swe-agent[bot]` commit adding 6 help-centre migration versions to the
drift-baseline ignore-list. Traced this to a stale-branch artifact, not real drift: this branch's last
merge from `main` predated PR #418, which landed those exact 6 files on `main` with matching production
ledger versions. Reverted the 6 false baseline lines and merged current `main` into the branch to
restore parity.

While investigating, found and fixed two genuinely separate, pre-existing drift items (unrelated to
this PR's own migrations, bundled in per Brian's direction rather than split into a separate PR):
- `add_help_centre_content_category` — git file was versioned `20260713101200`; production had it
  applied under `20260713024137`. Renamed the file to the correct version (safe: `20260713101200` was
  never recorded as applied under that number anywhere).
- `gap_fill_help_centre_session3_workbook_content` (`20260812060000`) — initially misdiagnosed as
  orphaned (checked a stale branch tree by mistake); confirmed on `main` directly that the file already
  exists and matches production exactly. No fix needed there beyond adding the file to this branch,
  which had been missing it.

### Copilot PR-thread findings (verify-bot-fix pass, then fixed)
| Finding | Verdict | Action |
|---|---|---|
| Scope-mismatch header comment | ALREADY_FIXED | Covered by the PR description correction above |
| ASS dismissed/superseded insights not blocked from re-creation | ALREADY_FIXED | `20260812015112` already had the fix |
| Finding-severity lookup exception silently scores as no-significance | CONFIRMED | Now records `finding_lookup_failed` and preserves the insight, mirroring every other error path in the file |
| Concurrent-run race — resolve-UPDATE doesn't check `FOUND` before firing event/incrementing counter | CONFIRMED (6 sites: 3 in GOV, 3 in ASS) | Added `IF NOT FOUND THEN CONTINUE` after every guarded resolve-UPDATE |
| `p_run_type` stored but never controls dispatch | CONFIRMED | `rpc_run_intelligence_tenant` now `RAISE EXCEPTION unsupported_run_type` for any value other than the one implemented (`governance_rules`) |
| Doc says `rules_processed = 1` | CONFIRMED | Corrected to document that a successful run returns `2` (both rules) |

## Post-merge production apply

Applied via `execute_sql` (interim procedure — `apply_migration` not used, `supabase db push` remains
broken repo-wide pending the separate ~2,000-version drift reconciliation). All 5 new migrations applied
in filename order, each verified live afterward:

1. `20260812011150_intelligence_gov_overdue_action_v1.sql`
2. `20260812012831_fix_gov_overdue_dismissed_recreate.sql`
3. `20260812013640_intelligence_ass_validation_overdue_v1.sql`
4. `20260812015112_fix_ass_validation_overdue_dismissed_and_errors.sql` (final state includes all
   Copilot-finding fixes above)
5. `20260812020000_intelligence_viewer_superadmin_rpcs.sql`

Verified post-apply: all 10 functions present (`pg_proc`), the partial unique index present
(`pg_indexes`), and spot-checked `pg_get_functiondef` for the `unsupported_run_type` guard,
`finding_lookup_failed` handling, and the `IF NOT FOUND THEN` race guards — confirming the live
database matches the merged git state exactly, not a superseded intermediate version.

Ledger repaired by Brian (`supabase migration repair --status applied <version>` × 5) and verified
against `supabase_migrations.schema_migrations` — all 5 rows match `version` and `name` exactly.

## CI/branch-DB note

PR #412's Supabase branch-DB build showed `MIGRATIONS_FAILED` — confirmed via `list_branches` that
`main`'s own persistent branch carries the identical status, so this is the pre-existing, repo-wide
~2,000-orphaned-version drift issue (documented in `supabase/migrations/CLAUDE.md`), not something this
PR introduced. No action taken; not this PR's problem to fix.

## Still open / follow-up

None. PR merged, branch deleted, all fixes verified live, ledger confirmed in sync with git.

## Soak status

N/A — feature is inert on production today: zero rows in `governance_actions` or
`assessment_validation_actions` currently meet the overdue+open condition, and no tenant has
`intelligence_enabled`/`intelligence_pilot` set. First real run against live data has not yet occurred.
