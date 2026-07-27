# Active Work — THE LEDGER (source of truth)

> The one place that answers: which worktree am I in, on what branch, doing what task, at what stage,
> and what did I decide to ignore. Read this at session start. Update it at every beat of The Loop
> (FRAME → RECON → PLAN → MAKE → CHECK → SHIP). See `CLAUDE.md` § "The Loop."
>
> **Scope Line rule:** anything found outside a task's IN scope gets parked in the Backlog below —
> never chased in the current task. Scope only expands via a new FRAME.

Last updated: 22 July 2026

---

## Worktrees in play

### Worktree: rto-compass-hub main worktree (branch: main)

- Task: reconciliation follow-up queue — 7 items in `reconciliationwork.md` § "Remaining work queue"
- Scope IN: item 1 first — restore missing `sa_extend_trial_v2` guards (production + billing)
- Scope OUT: items 2–7 until item 1 is signed off and done
- Stage: PLAN (item 1 — investigation complete, migration plan ready, awaiting sign-off)
- Updated: 22 Jul 2026
- Note: the "all 214 investigated" claim in this doc was **false** — see corrected status in
  `reconciliationwork.md`. Working through the 7-item follow-up queue one at a time.
- Notes: a second worktree (`rto-compass-hub-worktree-b`, branch `fix/migration-reconciliation-b`)
  existed with no ledger record of its task — verified clean/fully-merged and removed 20 Jul 2026.
  Only one worktree going forward; use the template below when starting new branch work.

Local branch cleanup (20 Jul 2026): 41 local branches confirmed fully merged into `main` (via
`git branch --merged main`, plus one — `fix/migration-drift-baseline-prune-and-aot-crlf` — confirmed
zero content diff despite one extra local merge-commit) were deleted. Kept, not confirmed merged:
`cursor/calendar-tenant-filter-ac7f`, `cursor/trainer-unit-mapping-suggestions`,
`fix/reconcile-sa-dashboard-health-migration`, `pr-123-review`, `pr161-recheck`. **Never delete
`staging`** — separate long-lived Lovable/staging deploy branch, not feature work.

<!-- Template — copy per active worktree:

### Worktree: <path or "rto-compass-hub main worktree">  (branch: <branch>)
- Task: <one line>
- Scope IN:  <what this task will change>
- Scope OUT (parked → Backlog): <what was deliberately excluded>
- Stage: FRAME | SCOUT | PLAN | FIX | REVIEW | SHIP | WATCH (CI/Bugbot pending — see next ScheduleWakeup)
- Engine: Claude mode | cursor CLI
- Updated: <DD Mon YYYY>
- Notes: <blockers, PR #, merge-order dependencies>

-->

---

## Open PRs awaiting review (not yet started through the loop)

Detail + per-PR notes live in `pr-review-open-prs.md`. Snapshot:

| # | Title | Branch | Stage |
|---|---|---|---|
---


---

## New task — CI migration pipeline chronically failing (surfaced 22 Jul 2026)

- Task: fix/triage the "Apply Supabase Migrations" GitHub Action, which fails on every push to `main`
- Trigger: Brian forwarded a Supabase "Branch Error" notification, Wed 22 Jul 2026 03:00:15 UTC —
  `unexpected update function status 403: {"message":"Forbidden resource"}` plus a warning that
  `20260722060000_sa_extend_trial_v2_restore_billing_guards.sql` and
  `20260722060100_revoke_anon_execute_governance_functions.sql` were "Applied out-of-order"
- Stage: SCOUT complete — root cause traced, not yet fixed
- Findings (verified 22 Jul 2026):
  - `gh run view` on run `29887285654` ("Apply Supabase Migrations", failed 03:00:11 UTC, right after
    PR #287 merged) confirms the real failure: `supabase db push` aborts with "Remote migration
    versions not found in local migrations directory" against several thousand pre-existing orphan
    version numbers (the same Lovable-era backlog already in this doc's Backlog section, items
    "19 migrations..." / "213 production migration records..."). This is chronic, not caused by
    PR #287's own files.
  - Because that step never completes, the CLI never applies the two named files through its normal
    ordered path — hence "Applied out-of-order migrations". Per `reconciliationwork.md`, they were in
    fact applied manually via the Supabase SQL editor and are confirmed live in production (verified
    via `list_migrations` + `pg_get_functiondef` on 22 Jul 2026) — so no data risk from this specific
    run, but the CI gate itself is broken on every push to `main` until the orphan backlog is
    resolved.
  - `list_branches` (Supabase MCP) independently shows the `main` branch's own status as
    `MIGRATIONS_FAILED`, consistent with a standing condition rather than a one-off.
  - The 403 "unexpected update function status: Forbidden resource" could NOT be traced to a GitHub
    Actions run — `deploy-edge-functions.yml` last ran 21 Jul 07:36 UTC and succeeded, no run around
    03:00 22 Jul. The message format matches Supabase's own GitHub-integration branch webhook (not a
    workflow in this repo), most likely from Supabase's integration trying to sync an Edge Function's
    config as part of the same failed branch-update cycle and hitting a permissions/token-scope issue
    on the management API. **Unconfirmed** — needs a look at the Supabase GitHub integration's PAT
    scope/settings, which isn't visible from repo-side tools.
- Scope IN: diagnose + fix the CI migration-apply gate; confirm the 403's real source
- Scope OUT: re-solving the orphan-migration backlog itself (that's the existing Backlog items below —
  this task depends on that backlog being cleared, doesn't duplicate it)
- Updated: 22 Jul 2026

---

## Backlog — PARKED findings (NOT scheduled work)

_Adjacent issues surfaced by a RECON/CHECK beat but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

- **Two governance write functions are anon-executable SECURITY DEFINER** —
  `gov_set_trainer_report_exemptions` and `gov_update_meeting_time` allow an unauthenticated caller to
  invoke a security-definer write. Surfaced 22 Jul 2026 during Group 8 of the migration-drift
  reconciliation (see `reconciliationwork.md`), but these functions sit outside the 138-item baseline
  itself — a genuinely new finding, not baseline drift. Needs a dedicated follow-up: read both
  functions' full bodies, confirm what an anonymous caller can actually do (caller-supplied tenant_id/
  meeting_id with no ownership check?), then revoke anon execute if unwarranted — same pattern as
  `revoke_anon_execute_billing_rpcs`. Lower-severity companions also anon-executable but read-only:
  `get_clause_heatmap_data`, `get_clause_heat_timeline`, `get_clause_heatmap_trend`,
  `get_clause_signals`, `notify_meeting_scheduled`.
- ~~**19 migrations merged to `main` but never applied to production**~~ **[x] RESOLVED (no functional
  gap) — verified 22 Jul 2026.** The claimed "19, dated 25 May–19 Jul" figure didn't hold up on
  re-derivation: a raw local-vs-prod version diff produced 211 candidates, not 19, and the actual date
  range of genuine candidates ran 9 Jun–22 Jul (nothing 25 May–8 Jun survived the correction below) —
  so the old count/range was stale and should not be reused.
  - Correction method: 75 of 211 resolved by matching migration **name** (not version) against
    production — same file, applied under a drifted timestamp. Another 78 resolved via ±120s
    timestamp-proximity to a real prod apply (same method already used for the 213-item backlog).
    Left 58 genuine candidates with no name or close-timestamp match.
  - **Direct DB verification on all 58** (per Brian's request, not just ledger-matching): extracted
    every table/column/function each of the 58 files creates or alters (6 tables, 20 columns, 76
    functions) and queried production directly. **Every single object already exists.** Spot-checked
    the two highest-risk chains (multiple migrations rewriting the same function, the exact pattern
    that caused the real `sa_extend_trial_v2` regression): live `sa_extend_trial_v2` already has all
    guards (via the separately-verified PR #287 fix); live `suggest_consultations_for_tas` already
    contains today's Tier 5 logic from `20260722103245_suggest_consultations_for_tas_unit_tier.sql`,
    despite the CI apply pipeline being broken (see task above) — confirms these changes reach
    production through some path other than the failing GitHub Action.
  - **Conclusion: no missing functionality.** The apparent "unapplied" status is a ledger/bookkeeping
    mismatch (git commit timestamp ≠ Supabase's real apply timestamp), the same root cause already
    diagnosed for the 213-item backlog — not an ops/deploy gap causing anything to actually be
    missing in production. Not chased further (adding these 58 versions to `.drift-baseline.txt` for
    tidiness is optional, low-priority follow-up, not required).

- ~~**213 production migration records with no corresponding local file**~~ **[x] RESOLVED — verified
  22 Jul 2026.** Cross-referenced against `rto-compass-hub/supabase/migrations/.drift-baseline.txt`
  (the CI-tracked accepted-debt file): 199 of 213 were already documented there. Of the remaining 14
  genuinely-new items, verified 13 now have matching committed migration files on `main` (commit
  `d63fbaad9` "Reconcile 13 undocumented production migrations", `<production version>_<name>.sql`
  convention) — checked each of the 14 version numbers directly against
  `supabase/migrations/` on `main`. The 14th (`20260716012333`) needed no file — corrected finding in
  `reconciliationwork.md` shows it created a safe function, not the vulnerable one originally blamed;
  the actual regression (prod version `20260716051346`) was fixed via the `sa_extend_trial_v2` guard
  restoration (PR #287, independently verified live 22 Jul 2026). One minor gap: none of the 14
  versions have been added to `.drift-baseline.txt` itself yet (recommended in `reconciliationwork.md`
  but not yet done) — cosmetic/tracking only, since real git files now cover 13 of them; not a drift
  risk. Not chased further — outside this pass's scope.
