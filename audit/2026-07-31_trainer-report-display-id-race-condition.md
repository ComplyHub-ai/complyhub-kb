# Audit — Trainer Monthly Report: Duplicate-Key Error on Submit (display_id Race Condition)

**Date:** 31 July 2026
**Branch:** `fix/trainer-report-duplicate-key-retry`
**PR:** open, pending creation via pre-filled link (see below) — `gh` CLI unavailable in this session, so the PR itself has not been opened yet, only pushed
**Reported by:** RJ — screenshot of `Trainer Portal > Monthly Report > New Report`, trainer "Nidhin sai Madhusoodhananpillai" at tenant `Australian College Pty Ltd`, error: `duplicate key value violates unique constraint "trainer_monthly_reports_tenant_id_display_id_key"`

---

## Root cause (confirmed live against production, project `gdwhlstfguxarnxasrrs`)

`trainer_monthly_reports` has a `BEFORE INSERT` trigger, `trg_tmr_set_display_id`, which calls `tmr_next_display_id(tenant_id)` to assign `display_id` when not already set. That function computes the next id as a plain, unlocked `MAX(...) + 1` scoped only by `tenant_id`:

```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 'TMR-(\d+)') AS INT)), 0) + 1
INTO v_next_num FROM public.trainer_monthly_reports WHERE tenant_id = p_tenant_id;
v_display_id := 'TMR-' || LPAD(v_next_num::TEXT, 4, '0');
```

No row lock, no advisory lock, no real sequence. Two concurrent inserts for the same tenant (e.g. two trainers submitting near-simultaneously) can read the same MAX, compute the same next id, and collide on `trainer_monthly_reports_tenant_id_display_id_key` — whichever commits second gets exactly this error, and the client had no handling for it, so the raw Postgres message reached the trainer.

Confirmed via `pg_get_functiondef` that the live function body matches the repo exactly, and via `git log -S` that neither `tmr_next_display_id` nor `trg_tmr_set_display_id` has been touched since the original baseline snapshot — this is definitely the current, active logic, not something already superseded.

**Confirmed tenant:** `Australian College Pty Ltd` (`91ffcbdc-c932-4b4c-b0e0-8a208a27abb4`), identified via `profiles.full_name` match — 20 active trainers, so concurrent submission near a reporting deadline is realistic.

**Honest gap:** could not reconstruct which concurrent transaction actually won the race against this specific report — Postgres retains no record of rows that never committed, and only 2 historical rows exist for this tenant (dated 2 Jun and 23 Jun), neither belonging to this trainer. The mechanism is confirmed live; the exact opposing transaction is not forensically reconstructable after the fact.

## Confirmed blast radius — same bug exists in more places

1. **8 more tables, same RPC.** `submit_trainer_monthly_report` (the RPC called on submit) creates linked entries in `ssr_register`, `whs_register`, `ofi_register`, `risk_register`, `rpl_register`, `caa_register`, `pdr_register`, `ien_register`, each using the identical inline unlocked `MAX(...)+1` pattern. Confirmed live via `pg_constraint` that all 8 carry the same `UNIQUE (tenant_id, custom_id)` shape — any of these can hit the identical failure mode under the same conditions.
2. **Three independent, live-routed write paths** into `trainer_monthly_reports`, each generating `display_id` differently:
   - `src/pages/trainer-portal/monthly-report.tsx` (routed at `monthly-report`) — relies on the trigger, `TMR-0001` format.
   - `src/pages/trainer/MonthlyReportForm.tsx` (routed at `trainer/monthly-reports` and `trainer/monthly-reports/:meetingId`) — RPC `upsert_trainer_monthly_report`, sets its own `TMR-202607-a1b2c3` format directly, bypassing the trigger.
   - RPC `submit_trainer_monthly_report_full` — a third counter using a different regex (strips all non-digits rather than capturing the digit run after `TMR-`), which can disagree with the trigger's own count.
   Live proof this is real, not theoretical: this tenant's only two existing rows are `TMR-2026` and `TMR-20260602-XRN4` — two different formats, meaning more than one path has already written here.

## What was fixed (Track 1 — frontend, this PR)

`src/pages/trainer-portal/monthly-report.tsx`, `submitMutation`'s insert branch: on a `23505` violating specifically `trainer_monthly_reports_tenant_id_display_id_key`, retry the insert once (a fresh retry re-reads the max and succeeds once the winning transaction has committed). Any other insert error (including the legitimate `trainer_monthly_reports_tenant_meeting_trainer_key` "already have a report for this meeting" case) surfaces unchanged. If the retry is also exhausted, the trainer sees a plain-English message instead of raw SQL.

This does not fix the underlying race — it stops trainers being blocked by an ugly, confusing error on what is very likely a self-resolving collision.

- `npx tsc --incremental --noEmit` — clean
- `npx eslint src/pages/trainer-portal/monthly-report.tsx` — clean
- PR not yet opened (`gh` unavailable this session) — pre-filled creation link given to RJ directly

## Open issue — flagged to Dave, not actioned by Claude (Track 2)

Per workspace policy, DB migrations are Dave's to write — this was root-caused by Claude at RJ's request, not by RJ personally, so it does not qualify for the self-ship exception. Proposed shape of the fix, for Dave's review and adaptation (**not applied, not written as a migration file**):

- Serialize `tmr_next_display_id` (or its calling trigger) with a tenant-scoped advisory lock — `pg_advisory_xact_lock(hashtext(tenant_id::text))` — before the `MAX+1` read, so concurrent inserts for the same tenant queue instead of racing. No new table, no schema change, function-body-only.
- Apply the identical fix to the 8 inline `MAX+1` blocks inside `submit_trainer_monthly_report` (one migration, since they're all one function body).
- Separately flagged, not proposed as part of this fix: the 3 divergent `display_id` generators (`trg_tmr_set_display_id`, `upsert_trainer_monthly_report`, `submit_trainer_monthly_report_full`) should eventually converge on one canonical generator — bigger reconciliation than this bug needs, called out as a follow-up rather than bundled in.

## Files changed

| Area | File |
|---|---|
| Retry + friendly error on display_id collision | `src/pages/trainer-portal/monthly-report.tsx` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Ship a frontend mitigation now vs. wait for the DB fix | Ship now — retry is safe, independent of the DB-side fix, and unblocks trainers immediately |
| Who writes the DB migration | Dave — flagged, not actioned, per migration-ownership policy (Claude root-caused this, not RJ personally) |
| Whether to reconcile the 3 divergent display_id generators in this pass | No — flagged as a separate, larger follow-up |
