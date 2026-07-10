# Supabase MCP — reference

> Moved from `CLAUDE.local.md` (10 July 2026) to shrink that file to identity + hard gates only. Content unchanged from the original.

| Name | Project ID | Region | Notes |
|---|---|---|---|
| ComplyHub Production | `gdwhlstfguxarnxasrrs` | ap-southeast-2 | Used by all branches — no branch DB isolation |

MCP server configured in `.mcp.json` (PAT-authenticated; not committed to git).

**Project ID selection rule:** Always use `gdwhlstfguxarnxasrrs`. All branches — feature, fix, and main — point at production. No branch DBs are created automatically. Verified 25 June 2026.

**Default Supabase access is READ-ONLY.** For diagnosis, schema inspection, and data checks, only use read operations.

**Write operations allowed when Brian explicitly says to deploy migrations:**
- `apply_migration` — allowed when Brian says "apply the migration" or "deploy to production"
- `execute_sql` (writes) — allowed when Brian explicitly asks for a data fix or manual SQL

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

**Trigger phrases** (kept in `CLAUDE.local.md`): none currently — Supabase MCP usage is driven by task context ("check database", "apply the migration"), not a fixed phrase list.
