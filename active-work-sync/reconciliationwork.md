# Migration Ledger Reconciliation — Working Doc

> Supersedes the "Migration Repair — Orphaned Version Cleanup" doc (previous version of this file,
> last updated 22 July 2026). That version's Tier 1/2/3 plan was found to be based on two factual
> errors and would not have achieved its stated goal — see "Why the previous plan was replaced"
> below. Nothing has been executed against production or the repo from either version of this doc.
> This version reflects live verification performed 13 August 2026.

Last updated: 13 August 2026

---

## The problem

`supabase db push` fails for every migration, not just new ones, with:

```
Remote migration versions not found in local migrations directory.
```

**Root cause:** production's `supabase_migrations.schema_migrations` ledger contains thousands of
pre-June-2026 Lovable-era migration versions that were applied directly to the database with no
matching `.sql` file in git. The CLI requires every ledger version to have a matching local file
before it will push anything — so it refuses to push, for any migration, until this is resolved.

**Workaround in active use (working, not sustainable long-term):** the interim `execute_sql`-then-
`migration repair --status applied <version>` procedure documented in `CLAUDE.md` and
`rto-compass-hub/supabase/migrations/CLAUDE.md`. Has shipped PRs #279 through #425 successfully.
Costs a few extra minutes per PR with a migration. No urgency to replace it — see "Recommended
timing" below.

---

## Why the previous plan was replaced

Live verification against production on 13 August 2026 found two factual errors in the prior
Tier 1/2/3 plan, both of which invalidated it:

1. **`supabase migration repair --status reverted` does not "flip a status flag."** The
   `supabase_migrations.schema_migrations` table has no `status` column at all (confirmed via
   `information_schema.columns`: the columns are `version, statements, name, created_by,
   idempotency_key, rollback`). The repair command **deletes the row**. This matters because 3,114
   of the 3,115 blank-name rows carry live SQL in `statements` — the only surviving record of what
   Lovable applied directly to the database, with no `.sql` file anywhere. Deleting without a backup
   is a **permanent, unrecoverable loss of that history**. The previous plan's risk list never
   mentioned taking a backup.

2. **Running Tier 1 (deleting the 3,105 blank-name rows) would not have unblocked `db push`.**
   `db push` requires *every* ledger row to match a local file. Verified counts, 13 Aug 2026:

   | Category | Count |
   |---|---|
   | Ledger rows total | 4,093 |
   | Orphans (ledger row, no local file) | 3,785 |
   | — blank-name orphans | 3,105 |
   | — Lovable-UUID-named orphans | 3 |
   | — descriptively-named orphans | 677 |
   | Local `.sql` files total (excl. baseline, excl. `_archive/`) | 526 |
   | **Local files with no ledger row at all** | **219** |

   After deleting the 3,105 blank-name rows, **680 named/UUID orphans would still remain**, so
   `db push` would still fail on the very next attempt. Worse: the 219 local-only files are the
   dangerous direction — once the remote→local mismatch is "fixed," `db push` would treat those 219
   as pending and **execute them against production**, including real DDL/data changes. The previous
   plan only ever looked at one direction of the mismatch.

3. **The doc's stated blocker on the flagged item (`20250717071103`) does not hold.** The concern
   was that reverting it would leave "zero git history" for its governance schema
   (`gov_register` table + `entry_type`/`evidence_type`/`review_cycle`/`gov_status` enums). Verified:
   this schema is already fully present in `supabase/migrations/00000000000000_baseline.sql`
   (157 references to `gov_register` alone). **No reconciliation migration needed; no Carl sign-off
   needed on this item.**

4. **By the same logic, Dave's sign-off on the "June 42" is unnecessary, not just skippable.** Every
   one of the 3,105 blank-name orphans is dated on or before `20260625034441` (25 Jun 2026, 03:44).
   The baseline file was dumped from production on 25 Jun 2026 09:47 — roughly six hours later. A
   `pg_dump` snapshot captures the cumulative effect of everything applied before it, by
   construction. Spot-verified: the very last orphan by timestamp (`20260625034441`, a
   `risk_register.governance_link` column type change) is present in the baseline as
   `governance_link uuid`. This is a stronger, whole-set safety argument than the original 10-row
   spot check, and it means **the June 42 doesn't need individual review at all** — they're already
   captured in the baseline exactly like the other 3,063.

Everything from the original Round 1/Round 2 audit numbers (3,105 blank-name safe set, 663→677 named
orphans, 16→3 UUID orphans, the 0-overlap baseline diff, the 10-sample spot-check) was independently
reproduced live and is not in dispute — the audit's counting work was accurate. What was wrong was
the mechanics of the fix (point 1) and its completeness (point 2).

---

## Current verified state (13 August 2026, live production)

| Fact | Value | How verified |
|---|---|---|
| `schema_migrations` columns | `version, statements, name, created_by, idempotency_key, rollback` — **no `status` column** | `information_schema.columns` query |
| Ledger rows total | 4,093 | `SELECT count(*) FROM supabase_migrations.schema_migrations` |
| Blank-name rows | 3,115 | same table, `name IS NULL OR name=''` |
| Blank-name rows with SQL in `statements` | 3,114 of 3,115 | same table |
| Blank-name orphans (no local file) | 3,105 | exact-version match against local filenames |
| Blank-name rows that DO have a local file (must never be deleted) | **10** — see list below | exact-version match |
| Lovable-UUID-named orphans | 3 (down from 16 in the original audit — 13 have since been resolved) | regex match on `name` |
| Descriptively-named orphans | 677 (up from 663 in the original audit — 14 more have landed since) | remainder |
| Local `.sql` files (excl. baseline, excl. `_archive/`) | 526 | `ls *.sql` in `supabase/migrations/` |
| Local files with no ledger row | 219 | reverse-direction match |
| Newest blank-name orphan | `20260716112016` | `max(version)` where name blank |
| Any blank-name rows created since the original audit (22 Jul 2026)? | **No** — the leak has stopped; latest is 16 Jul 2026 | `count(*) WHERE version > '20260722'` = 0 |
| `gov_register`/enum schema (the flagged item) present in baseline? | Yes — 157 references | `grep -c gov_register 00000000000000_baseline.sql` |
| `.drift-baseline.txt` current size | 515 lines | file read |

### The 10 blank-name rows that must NEVER be included in any delete/revert operation

These are blank-name (so they'd match a naive "delete all blank-name rows" filter) but they DO have
a real local `.sql` file — deleting the ledger row would make `db push` re-execute real DDL/data
changes against production:

```
20260630075042  20260702021758  20260702025048  20260702031010  20260702031615
20260702031846  20260702032411  20260703022530  20260703073434  20260716112016
```

Corresponding files include `gap_fill_qi_response_columns_and_rpcs`, `gap_fill_drop_smoke_log`,
and `clear_stale_packaging_rules_tas_builder_cea84fa3` — real DDL and a data mutation, not no-ops.

---

## Recommended approach — re-baseline, not row-by-row triage

Given that the mismatch runs in both directions (3,785 orphaned ledger rows AND 219 orphaned local
files), triaging rows individually is the wrong shape for this job — it only ever addresses one
direction. Take a fresh, complete schema snapshot as a new baseline and reset both the ledger and
the migrations directory to agree with it. This repeats the same pattern already used successfully
on 25 June 2026 to produce the current `00000000000000_baseline.sql`.

**Load-bearing safety property: no phase of this plan executes any DDL against the production
schema.** The only writes to production are to the ledger table itself (Phase 5). Schema, data,
RLS, and functions are never touched by this plan — only by whatever migrations get pushed
afterward, under the normal PR process.

### Phase 0 — Authorise and clear the field
1. Loop Carl in — this changes shared tooling behaviour for the whole team, not a solo call.
2. Confirm worktree B is idle on DB/edge-function work (one-DB-job rule) and Carl isn't mid-migration.
3. Pick a quiet window — no PRs merging, no preview branches being provisioned.
4. Create the working branch: `fix/migration-ledger-rebaseline`.

**Gate:** Carl's ack + Brian's go. Do not proceed on assumption.

### Phase 1 — Backup (previously missing; everything below depends on this)
5. In-database copy, including `statements`:
   ```sql
   CREATE TABLE supabase_migrations.schema_migrations_backup_20260813
     AS SELECT * FROM supabase_migrations.schema_migrations;
   ```
6. Verify it holds exactly 4,093 rows.
7. Export the same table to CSV, stored outside the database and outside both repos.
8. Tag the current repo state: `git tag pre-rebaseline-20260813`.

**Gate:** All three backups verified present before anything is deleted.

### Phase 2 — Freeze the evidence
9. Write a timestamped file to `complyhub-kb/audit/` recording the counts above, the SQL predicates
   used to derive them, and the intended end state. The predicate is the artifact — never a
   copy-pasted version list (avoids truncation/copy-paste error at this scale).

**Gate:** Committed to the KB before any destructive step.

### Phase 3 — Produce the new baseline
10. Do NOT use `supabase db pull` — it reads the same broken ledger and will fail the same way.
    Use `pg_dump --schema-only` directly against production.
11. Save as `supabase/migrations/20260813000000_baseline_v2.sql` (version later than every existing
    row and file).
12. Verify the dump reproduces production: restore into a scratch/local database, dump that, diff
    the two dumps. Must be empty.

**Gate:** Empty diff. If not empty, stop — the dump is incomplete and the plan's safety argument
collapses.

### Phase 4 — Archive the old files (repo-side only, no prod involvement)
13. Move all 526 existing top-level `.sql` files into `supabase/migrations/_archive/`. They remain
    in git history and in `_archive/`; their cumulative effect is captured in the new baseline.
14. Active migrations directory now contains exactly one file: `20260813000000_baseline_v2.sql`.
15. Run the `ci-gate` skill on the branch, open a PR, get it reviewed and merged.

**Gate:** PR merged before Phase 5.

### Phase 5 — Ledger surgery (the only phase that writes to production)
16. Single transaction, with assertions:
    ```sql
    BEGIN;
    -- assert backup table exists and holds 4093 rows
    DELETE FROM supabase_migrations.schema_migrations;
    INSERT INTO supabase_migrations.schema_migrations (version, name)
      VALUES ('20260813000000', 'baseline_v2');
    -- verify exactly 1 row
    COMMIT;
    ```
17. Verify: ledger holds exactly 1 row, matching the one local file.

**Abort criterion:** any assertion mismatch → `ROLLBACK`, stop, report to Brian.

### Phase 6 — Prove it worked
18. Author a genuinely trivial, idempotent test migration (e.g. a comment on a table).
19. Run `supabase db push`. Should apply cleanly — first successful push since ~21 July 2026.
20. Confirm the ledger now holds 2 rows and the schema change landed.

**Gate:** If `db push` still fails, stop and diagnose — do not start hand-patching.

### Phase 7 — Update the surrounding machinery
21. Reset `supabase/migrations/.drift-baseline.txt` — its 515 entries become meaningless once zero
    orphans exist.
22. Verify the `Apply Supabase Migrations` and drift-check GitHub Actions workflows pass on the next
    merge to `main`.
23. Remove the interim `execute_sql` + `migration repair` procedure from `CLAUDE.md` and
    `supabase/migrations/CLAUDE.md`, replacing it with plain `db push`.
24. Provision one Supabase preview branch and confirm it builds correctly from the new baseline.

### Phase 8 — Soak and close out
25. Keep the backup table and CSV for at least 30 days (through ~13 Sep 2026).
26. Ship 2–3 normal PRs with migrations through plain `db push` to confirm the fix holds under real
    use.
27. Write the audit record in `complyhub-kb/audit/`, then delete this file.

---

## Rollback

Fully recoverable at any point up to Phase 5 committing, and recoverable after Phase 5 as long as
the backup exists:
```sql
DELETE FROM supabase_migrations.schema_migrations;
INSERT INTO supabase_migrations.schema_migrations
  SELECT * FROM supabase_migrations.schema_migrations_backup_20260813;
```
Plus `git revert` the Phase 4 PR. This only works if Phase 1 completed — which is why Phase 1 is
gated before any destructive step.

---

## Implications if executed with a small gap or error (for reference when timing this)

Ranked by real damage:

1. **Missing one of the 10 must-exclude rows** (if a row-by-row approach were used instead of
   re-baselining) — the only scenario that touches live data. `db push` re-applies a real migration;
   if not idempotent, either a hard failure mid-push or silent data corruption.
2. **No backup + wrong deletion** — permanently unrecoverable. Once `statements` is gone, the only
   record of a year of direct-to-prod changes is gone, with no way to restore it.
3. **Over-deleting into the 677 named orphans** — permanent blind spots. Those rows are exactly what
   the drift check uses to surface undocumented work; deleted, they stop being flagged forever.
4. **Preview/branch database divergence** — Supabase replays migrations when provisioning a branch
   DB. A ledger that doesn't match the file set can produce branch environments that silently differ
   from production.
5. **Under-deleting** — harmless. `db push` stays broken, effort wasted, nothing damaged. Bias
   toward this failure mode over the others.

---

## Recommended timing

The interim `execute_sql` + `migration repair` procedure is working — PRs #279 through #425 have all
shipped through it successfully. The cost of `db push` staying broken is a few extra minutes per PR.
The cost of getting ledger surgery wrong is potential data corruption plus permanent loss of
history. **Do not schedule this opportunistically.** Good trigger: Carl has a clear week, no demo
pending, worktree B is free, and this doc's Phase 0 gate is satisfied. Bad trigger: doing it because
a spare afternoon appeared.

---

## Open items

- [ ] Carl: review this plan and the Phase 0 authorisation gate.
- [ ] Confirm a quiet window per Phase 0 (both worktrees, no in-flight migration/edge-function work).
- [ ] Execute Phases 1–8 in order, per the gates above. No phase skips its gate.
- [ ] Post-execution: correct `CLAUDE.md` and `supabase/migrations/CLAUDE.md` to remove the interim
      procedure (Phase 7, step 23).
- [ ] Delete this file once Phase 8 (audit record written) is complete.
