# Supabase MCP — reference

> Moved from `CLAUDE.local.md` (10 July 2026) to shrink that file to identity + hard gates only. Content unchanged from the original.

| Name | Project ID | Region | Notes |
|---|---|---|---|
| ComplyHub Production | `gdwhlstfguxarnxasrrs` | ap-southeast-2 | Used by all branches — no branch DB isolation |

MCP server configured in `.mcp.json` (PAT-authenticated; not committed to git).

**Project ID selection rule:** Always use `gdwhlstfguxarnxasrrs`. All branches — feature, fix, and main — point at production. No branch DBs are created automatically. Verified 25 June 2026.

**Default Supabase access is READ-ONLY.** For diagnosis, schema inspection, and data checks, only use read operations.

**Write operations allowed when Brian explicitly says to deploy migrations:**
- `execute_sql` (writes) — allowed when Brian explicitly asks for a data fix or manual SQL

**Never use `apply_migration` to deploy an existing `supabase/migrations/*.sql` file — it does not respect
the filename's version.** Confirmed 21 Jul 2026 (PR #279 post-merge): calling `apply_migration` with a file's
SQL content records it under a freshly-generated version (based on the moment the tool ran), not the
file's own `YYYYMMDDHHmmss` prefix — even when `name` is set to match the file. This creates exactly the
kind of git/production ledger mismatch the migration-discipline rules exist to prevent, and it required
`supabase migration repair --status reverted <wrong-version>` + `--status applied <correct-version>` for
every affected file to fix. `apply_migration` is fine for one-off SQL Claude authors on the fly with no
corresponding file — never for a file that already exists in `supabase/migrations/`.

**The only correct way to deploy an existing migration file to production is `supabase db push`, run by
Brian from his terminal inside `rto-compass-hub/`.** It reads the actual files, compares versions against
what production has recorded, and applies + records them correctly under their true filename version.
Claude cannot run this — no local Supabase CLI in this environment — so give Brian the exact command and
wait for him to run it and report back the output.

If a `supabase db push` reveals a migration whose SQL was already applied out-of-band (e.g. via the
Supabase dashboard SQL editor, or drift from a Lovable-era direct change) — confirmed by checking whether
the object already exists before applying — do not re-run it. Instead use
`supabase migration repair --status applied <version>` to fix the ledger only. See
`complyhub-kb/reference/diagnosis-discipline.md` § "Learned from PR #279" for the full incident.

**Never use without explicit discussion — these are destructive:**
`create_branch`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `pause_project`, `create_project`, `deploy_edge_function`

When Brian says `check database` (or equivalent):
1. Identify target tables/views/feature area
2. Inspect relevant schema first (columns, types, relationships)
3. Run focused read-only checks to validate the issue
4. Summarise findings and likely root cause
5. Recommend the smallest safe fix path — do not execute writes unless Brian explicitly approves

Always use MCP server `supabase` for database tasks.
Default project follows the active branch rule above. Do not switch projects unless Brian explicitly names another.
Do not use MCP server `supabase-unicorn` unless Brian explicitly asks for it.

Response format for `check database`:
- What was checked
- Key findings
- Likely root cause
- Recommended next step

## Discovery without timeouts (added 10 July 2026)

`list_tables` (verbose) times out on this project — ~800+ active tables. Use targeted `execute_sql` queries against `information_schema`/`pg_catalog` instead — see `complyhub-kb/reference/db-schema-cheatsheet.md` for the live snapshot and the query patterns used to build it (table names, columns in batches, FKs, RLS status). Check the cheat sheet's `last_migration` stamp against `select version, name from supabase_migrations.schema_migrations order by version desc limit 1;` before trusting it; only re-derive tables touched by migrations newer than the stamp.

**Never call a bulk-dump tool to check one specific record** (e.g. `list_migrations`, which dumps the entire `schema_migrations` table — ~180K+ characters on this project, exceeds tool output limits and gets saved to a side file requiring extra reads). If the actual question is "does version X exist / is Y applied," use a scoped `execute_sql` query with a `WHERE version = '...'` clause instead, or `grep` on local files. Same principle applies to any "list everything" tool (`list_edge_functions`, `list_tables` without filters, etc.) when a filtered equivalent exists — default to targeted.

**Trigger phrases** (kept in `CLAUDE.local.md`): none currently — Supabase MCP usage is driven by task context ("check database", "apply the migration"), not a fixed phrase list.
