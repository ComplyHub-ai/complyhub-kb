# PR 4 cutover — fresh ledger archive, 4 Sep 2026 (§6.3 step 1)

This is the **cutover** archive (distinct from Stage A's 4 Sep archive, `schema_migrations_backup_20260904`,
which was for the earlier orphan-reconciliation transaction — see `migration-drift-remediation.md` §4.4.8).

## Production backup table (the real undo button)

`supabase_migrations.schema_migrations_backup_20260904_032220_cutover` — a full `CREATE TABLE AS SELECT *`
copy of `supabase_migrations.schema_migrations`, taken at `2026-09-04 03:22:20 UTC`.

Verified immediately after creation:
- Row count: 1,050 both sides.
- Zero-row diff in both directions (`EXCEPT` on `version, name, statements`).
- Matching checksum: `md5(string_agg(version || name, '' ORDER BY version))` = `5011743edfa84c37bdfe6958846a0e18` on both tables.

Restore procedure (before §6.3 step 7 / PR 4 merge only — see §6.4 rollback):
```sql
BEGIN;
TRUNCATE supabase_migrations.schema_migrations;
INSERT INTO supabase_migrations.schema_migrations
  SELECT * FROM supabase_migrations.schema_migrations_backup_20260904_032220_cutover;
COMMIT;
```

## This folder's manifest (companion, not the full archive)

`ledger-archive-version-name-manifest.json` — `version`, `name`, and whether `statements` is populated,
for all 1,050 rows. This is a lightweight audit trail, **not** a substitute for the production backup table.

**Deviation, logged not blocking (same class as Stage A's 4 Sep note):** the full `statements` SQL text
(~12MB across 820 rows) was not copied into this file. This machine has no Docker, no native `pg_dump`,
no `psql` — the only way to move that much text through this session would be many chat round-trips,
which risks silent truncation in what is supposed to be a reliable rollback artifact. The production
backup table above is transactionally consistent, already verified, and is the copy the rollback
procedure actually reads from — same reasoning Stage A used for its own file-copy gap (§4.4.8).

## Non-schema items (§4.4.6 / §6.2 hard gate) — resolved 4 Sep 2026

A `pg_dump --schema-only` captures none of these. Checked against live production before the dump:

- **Database roles (17):** all standard Supabase-platform roles (`anon`, `authenticated`, `postgres`,
  `service_role`, etc.) — zero custom application roles. Any fresh Supabase project provisions these
  automatically. **Accepted — no gap.**
- **Event triggers (8):** 7 are Supabase platform internals present on every project
  (`pgrst_ddl_watch`, `issue_pg_cron_access`, etc.). One custom trigger, `trg_sec_ddl_audit` (DDL audit
  logging, tied to `sec.ddl_audit_id_seq`), is not preserved by §2.2's sanitisation recipe. Production
  is unaffected (only the ledger table changes during cutover); this only affects a hypothetical
  from-scratch rebuild, and it is an audit trigger, not an enforcement one. **Accepted, logged.**
- **`storage.buckets` rows (24 live, 8 load-bearing per §4.4.3):** already solved by Stage C —
  `supabase/reference_data.sql` explicitly `INSERT`s the required buckets and this was verified
  non-empty on a from-scratch build by the Fresh Database Verification workflow. **Not a new gap.**
- **Sequence current values:** not preserved by a schema-only dump (fresh builds restart at 1). These
  are internal auto-increment surrogate keys, isolated per environment; nothing in the app hardcodes
  IDs against them. **Accepted as low-risk.**
- **`cron.job` rows (48):** genuine gap — data in an extension-managed table the dump excludes
  entirely. Production's 48 scheduled jobs are untouched by the cutover (only the ledger changes), so
  nothing breaks today; but they would be silently absent from any future from-scratch rebuild.
  **Captured in `cron-jobs-snapshot.json`** (this folder) so the definitions aren't lost — not yet
  wired into a rebuild path (that would be new tooling beyond this cutover's scope).

**Parked finding, out of scope for this cutover:** while capturing `cron.job`, found 8 pairs of
duplicate *active* jobs (e.g. `ingest-tga-unit-parents-nightly` and `...-nightly-fixed`, both `active:
true`, same target function) — looks like an in-progress migration to vault-based secrets where the
old job was never disabled after its `-fixed` replacement shipped. Several jobs also hardcode the
Supabase **anon** (publishable, not secret) key directly in the command rather than pulling
`app_service_role_key` from `vault.decrypted_secrets`. Logged in `active-work.md` Backlog — not
touched here.

## Pre-archive measurement (also feeds §6.2 preconditions 1–2)

At archive time, a direct version-only set diff between `git ls-tree origin/main -- supabase/migrations/`
(1,050 files) and the live ledger (1,050 rows) was run — not eyeballed, an exact sorted-set comparison.
Result: **zero** versions in git with no ledger row, **zero** ledger rows with no git version. Category A
(the A1+A2 superset) is empty, so A2 = 0 by construction. Prefix invariant holds exactly (identical sets,
not just matching counts).
