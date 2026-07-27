# Handover — fix `supabase db push` so it stops failing on every migration

**Date:** 22 July 2026
**For:** a new conversation with Carl (infra lead) and Dave (DB lead)
**Raised by:** Brian, during the migration-drift reconciliation work (see `reconciliationwork.md` in the
workspace root)

---

## The problem

`supabase db push` currently fails for **every** migration, not just new ones. Tonight it blocked
applying two small, already-merged migrations (`sa_extend_trial_v2` guard restoration + an anon-execute
grant cleanup, PR #287) with:

```
Remote migration versions not found in local migrations directory.
```

**Root cause:** the CLI requires every migration version recorded in production
(`supabase_migrations.schema_migrations`) to have a matching local `.sql` file before it will push
anything. Production has roughly **3,608 pre-June-2026 Lovable-era migrations** that were applied
directly to the database with no corresponding git file — this is old, known, already-documented debt
(see `rto-compass-hub/supabase/migrations/CLAUDE.md`), not new drift. Because those 3,608 have no file,
`db push` refuses to proceed at all, for any migration, going forward.

## What we did tonight instead (workaround, not a fix)

Since `db push` was blocked and the MCP `apply_migration` tool is banned for existing files (it
mis-stamps the migration's version), we applied the two migrations by hand:
1. Ran the exact SQL from both files directly via the Supabase SQL editor.
2. Manually inserted two rows into `supabase_migrations.schema_migrations` with the same version/name as
   the git filenames, so the migration-drift CI check treats them as matched, not orphaned.

This worked, but it's tedious and easy to get wrong (wrong version stamp = future drift). Not sustainable
as the normal way to ship migrations.

## The likely real fix (needs Carl/Dave sign-off — do not run solo)

`supabase migration repair --status reverted <version> <version> ...` against the ~3,608 orphaned
versions. This is a **metadata-only** operation — it flips a status flag in the ledger table so the CLI
stops expecting a local file for those old versions. It does **not** run any DROP/undo SQL and does
**not** touch the actual tables/functions those old migrations created. This is the same tool already
used for the PR #279 incident described in `rto-compass-hub/supabase/migrations/CLAUDE.md`.

This should be a **one-time** fix — once those old orphaned versions are marked `reverted`, `db push`
should work normally for every migration afterward, no more manual SQL-editor pasting.

**Why this needs sign-off first, not just running it:** it's a repo-wide change to shared tooling
behavior that affects how Carl, Dave, RJ, and Brian all apply migrations going forward — not a
Brian-solo call, and not something to do inline while shipping an unrelated fix.

## What to do in the new conversation

1. Confirm with Carl/Dave whether they want this repair run, and get the exact list of orphaned
   versions confirmed (list_migrations vs local `supabase/migrations/*.sql`, comparable to the method
   already used in `reconciliationwork.md`).
2. If approved, run the repair as a deliberate, isolated task — not bundled with an unrelated feature or
   fix.
3. Confirm `supabase db push` works cleanly afterward on a trivial test migration before trusting it for
   real work.
4. Update `rto-compass-hub/supabase/migrations/CLAUDE.md` with the resolution so this doesn't get
   re-discovered from scratch later.
