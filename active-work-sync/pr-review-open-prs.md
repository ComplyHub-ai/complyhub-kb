# Open PR Review — rto-compass-hub

> Scope so far: functional-dependency + migration-collision check across the original batch of 5 PRs,
> plus a content review and CI-guard fix on #1003. Re-checked live PR state 7 Sep 2026 and found
> #1002, #1004, #1005 already merged (outside this doc's tracked flow) alongside #1003 — only #997
> remains open. Full Reviewer mechanical gauntlet (dry-run merge against main, live-DB checks) per
> CLAUDE.md PR review mode still applies to #997 before it merges.

## Status as of 7 Sep 2026

| PR | Title | State |
|---|---|---|
| #997 | Harden Consultant Assistant removal after merge | **OPEN** — not yet reviewed |
| #1002 | feat(intelligence): Phase F1 — Predictive Intelligence Foundation | MERGED |
| #1003 | fix(security): fail-closed duplicate merge plan membership | MERGED |
| #1004 | fix(assessment): use current version for assurance and auto-build | MERGED |
| #1005 | Add external-api-tas-data endpoint for Phase 2 TAS document sync | MERGED |

## #1003 — MERGED 7 Sep 2026

`fix(security): fail-closed duplicate merge plan membership` — merged as `d114ffdbe`. The CI guard
false positive (`SET "search_path"` quoted-identifier form not matched by the guard script's literal
grep) was fixed on-branch (`f1bc6bfae`, unquoted to `SET search_path`, test regex updated to match),
pushed, CI went green, Brian merged. Post-merge, live `pg_get_functiondef` on all 4 functions
(`apply_duplicate_merge_plan`, `bulk_apply_merge_plans`, `generate_duplicate_merge_plan`,
`precompute_meeting_merge_plans`) confirmed the fail-closed check and `sec.is_super_admin()` bypass are
actually deployed to production — not just a green checkmark.

## #1002 — timestamp collision, resolved, then merged

#1002 originally shipped a migration versioned `20260906180000`, colliding with #1003's
`20260906180000_fail_closed_duplicate_merge_plan_membership.sql`. Since #1003 merged first and kept
that timestamp, #1002 was renamed to `20260906190000_intelligence_predictions_foundation.sql` on
`cursor/predictive-intelligence-f1-07c9` (test file's hardcoded path updated to match), committed
(`381cfddc1`) and pushed. #1002 has since been merged with that timestamp intact — this is the same
`20260906190000_intelligence_predictions_foundation.sql` visible on `main` today.

## #997 — still open, not yet reviewed

Only PR left in this batch. Prior note: follow-up hardening to the already-merged consultant-
assistant-role removal (`20260906150000`/`20260906150100`, both live on `main`). Its own migration
(`20260906153000_harden_consultant_assistant_removal.sql`) didn't collide with anything at last check
— re-verify against current `main` (several PRs have merged since), and run the full Reviewer gauntlet
(regression check vs current `main`, dry-run merge, migration drift check, edge-function drift check)
before merging, per CLAUDE.md PR review mode. This hasn't been started yet.

## Still to do

- Full `/pr-review` pass on #997 — nothing done on it yet beyond the original functional-dependency
  scan (confirmed disjoint file set vs the other 4, all now moot since those merged).
