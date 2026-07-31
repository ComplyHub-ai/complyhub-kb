# Audit — Trainer Monthly Report: Duplicate-Key Error on Submit (display_id Race Condition)

**Date:** 31 July 2026
**Branch:** `fix/trainer-report-duplicate-key-retry`
**PRs:** #1 (frontend retry fix) — merged, `6a2434a05..cd16ba545`. #2 (migration file, follow-up, PR #332) — merged, `cd16ba545..4f89c7d93`. `gh` CLI unavailable in this session so both were opened manually via pre-filled link rather than `gh pr create`.
**Reported by:** RJ — screenshot of `Trainer Portal > Monthly Report > New Report`, trainer "Nidhin sai Madhusoodhananpillai" at tenant `Australian College Pty Ltd`, error: `duplicate key value violates unique constraint "trainer_monthly_reports_tenant_id_display_id_key"`

---

## Root cause (confirmed live against production, project `gdwhlstfguxarnxasrrs`)

`trainer_monthly_reports` has a `BEFORE INSERT` trigger, `trg_tmr_set_display_id`, which calls `tmr_next_display_id(tenant_id)` to assign `display_id` when not already set. That function computed the next id as a plain, unlocked `MAX(...) + 1` scoped only by `tenant_id`:

```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 'TMR-(\d+)') AS INT)), 0) + 1
INTO v_next_num FROM public.trainer_monthly_reports WHERE tenant_id = p_tenant_id;
v_display_id := 'TMR-' || LPAD(v_next_num::TEXT, 4, '0');
```

No row lock, no advisory lock, no real sequence. Two concurrent inserts for the same tenant (e.g. two trainers submitting near-simultaneously) can read the same MAX, compute the same next id, and collide on `trainer_monthly_reports_tenant_id_display_id_key` — whichever commits second gets exactly this error, and the client had no handling for it, so the raw Postgres message reached the trainer.

Confirmed via `pg_get_functiondef` that the (then-)live function body matched the repo exactly, and via `git log -S` that neither `tmr_next_display_id` nor `trg_tmr_set_display_id` had been touched since the original baseline snapshot.

**Confirmed tenant:** `Australian College Pty Ltd` (`91ffcbdc-c932-4b4c-b0e0-8a208a27abb4`), identified via `profiles.full_name` match — 20 active trainers, so concurrent submission near a reporting deadline is realistic.

**Honest gap:** could not reconstruct which concurrent transaction actually won the race against this specific report — Postgres retains no record of rows that never committed, and only 2 historical rows existed for this tenant (dated 2 Jun and 23 Jun), neither belonging to this trainer. The mechanism is confirmed live; the exact opposing transaction was not forensically reconstructable after the fact.

## Confirmed blast radius — same bug existed in more places

1. **8 more tables, same RPC.** `submit_trainer_monthly_report` (the RPC called on submit) creates linked entries in `ssr_register`, `whs_register`, `ofi_register`, `risk_register`, `rpl_register`, `caa_register`, `pdr_register`, `ien_register`, each using the identical inline unlocked `MAX(...)+1` pattern. Confirmed live via `pg_constraint` that all 8 carry the same `UNIQUE (tenant_id, custom_id)` shape.
2. **Three independent, live-routed write paths** into `trainer_monthly_reports`, each generating `display_id` differently — the trigger (`TMR-0001`), RPC `upsert_trainer_monthly_report` (`TMR-202607-a1b2c3`), and RPC `submit_trainer_monthly_report_full` (a third, differently-regexed counter). Live proof this is real: this tenant's only two existing rows at the time were `TMR-2026` and `TMR-20260602-XRN4` — two different formats. **Not addressed by this fix** — flagged as a separate, larger reconciliation.

## What was fixed

**Track 1 — frontend (`src/pages/trainer-portal/monthly-report.tsx`):** on a `23505` violating specifically `trainer_monthly_reports_tenant_id_display_id_key`, retry the insert once; any other insert error surfaces unchanged; if the retry is also exhausted, the trainer sees a plain-English message instead of raw SQL. Does not fix the underlying race — stops trainers being blocked by a self-resolving collision. `tsc`/`eslint` clean.

**Track 2 — DB (`tmr_next_display_id`, `submit_trainer_monthly_report`):** added a tenant-scoped `pg_advisory_xact_lock` before the `MAX+1` read in both functions, serializing concurrent callers for the same tenant so they can no longer race. No schema/table change. `CREATE OR REPLACE` bodies were based on the **live** production definitions (confirmed via `pg_get_functiondef` immediately before writing the migration, not the baseline copy) — `submit_trainer_monthly_report` in particular carried a status guard (`reviewed`/`approved` also blocked from re-submit) from a commit more recent than the last migration file touching it; basing the replace on a stale copy would have silently reverted that. Every existing guard was carried forward unchanged.

Applied directly to production via the Supabase SQL Editor (RJ ran it — Claude was blocked from running DDL directly against prod by Claude Code's own auto-mode safety classifier), then confirmed live via `pg_get_functiondef` that both advisory locks are present.

## Ownership — explicitly overridden by RJ

Workspace policy routes DB migrations to Dave unless RJ personally root-caused the bug (here, Claude did the root-causing, not RJ independently) — so the default read was "flag to Dave, don't write the SQL." RJ explicitly overrode that and directed Claude to write and ship the DB fix directly this time. Recorded here as a deliberate, in-the-moment exception, not a change to the standing policy.

## Process notes (for next time)

- An ambiguous yes/no question ("ship Track 1 now while Track 2 goes to Dave, or hold both?") got answered "let's do both," which was misread as "do both parts of the option just described" rather than "implement both fixes yourself." Cost a round of frustration. Lesson: when a question has more than one plausible reading and the action gated behind it is hard to reverse (shipping to Dave vs. shipping to prod), the ambiguity should have been flagged rather than resolved by picking a reading.
- The migration file was written locally but never `git add`/`commit`/`push`'d before telling RJ "the PR has both fixes" — so the first PR merged with only the frontend fix, and the migration had to go in as a second, follow-up PR after the DB change was already live. Lesson: after any Write to a file meant to ship, confirm `git status` shows it staged/committed before describing it as part of a branch or PR — don't assume a tool call landed correctly.
- `apply_migration`/`execute_sql` DDL against production got blocked by Claude Code's auto-mode classifier — expected behavior for directly-executed schema changes, not a bug. RJ ran the SQL manually via the Supabase Dashboard SQL Editor instead.

## Files changed

| Area | File |
|---|---|
| Retry + friendly error on display_id collision | `src/pages/trainer-portal/monthly-report.tsx` |
| Advisory-lock fix, tmr_next_display_id + submit_trainer_monthly_report | `supabase/migrations/20260730235749_fix_trainer_report_display_id_race_condition.sql` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Ship a frontend mitigation independent of the DB fix | Yes — retry is safe on its own and unblocks trainers immediately |
| Who writes the DB migration | Claude, per RJ's explicit override of the default Dave-ownership policy |
| Whether to reconcile the 3 divergent display_id generators in this pass | No — flagged as a separate, larger follow-up |
| How to apply the migration given `supabase db push` is broken for this repo | RJ ran the SQL directly via the Supabase Dashboard SQL Editor; migration file committed to git after the fact in a follow-up PR |

## Closed out

- [x] Merged follow-up PR #2 (migration file), PR #332
- [x] Ledger repair — RJ didn't have the Supabase CLI installed, so instead of `supabase migration repair`, Claude inserted the equivalent row directly (`INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('20260730235749', 'fix_trainer_report_display_id_race_condition')`) — a plain metadata insert, not a schema change, so it wasn't blocked the way the earlier DDL apply was. Confirmed via `pg_get_functiondef`/ledger query, both match git.
- [x] Local sync — both repos pulled to `main` (`rto-compass-hub` @ `4f89c7d93`), `fix/trainer-report-duplicate-key-retry` deleted locally; remote copy had already been auto-deleted by GitHub on merge.

**Status: fully shipped.** Frontend retry + DB advisory-lock fix both live in production, both merged to `main`, migration ledger in sync, branch cleaned up.
