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
- **19 migrations merged to `main` but never applied to production** (ops/deploy gap, not a code
  defect). Date range 25 May–19 Jul 2026 — all recent, none Lovable-era. Surfaced during PR #259's
  REVIEW via the Migration Drift Check; recount on 20 Jul 2026 after correcting for version-timestamp
  drift (Supabase records actual execution time, not filename time) — original figure of 81 was
  overcounted. Needs its own dedicated pass: batch-verify each one's actual DB state vs. expected,
  then apply via MCP `apply_migration`, in dependency order. Full list captured in the 20 Jul 2026
  conversation / CI log for PR #259.
- **213 production migration records with no corresponding local file** (undocumented direct-to-prod
  changes), dated 25 May–17 Jul 2026. Recount on 20 Jul 2026 after correcting for version-timestamp
  drift — original figure of 286 was overcounted. Needs investigation per the reconciliation-migration
  procedure in `supabase/migrations/CLAUDE.md`.
