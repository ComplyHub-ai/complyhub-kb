# Migrations Issue — rto-compass-hub

**Documented:** 25 June 2026  
**Investigated by:** Khian (via Claude Code)

---

## Summary

44 migration files exist in the `main` branch of `rto-compass-hub` that have never been applied to the production Supabase project (`gdwhlstfguxarnxasrrs`). Additionally, the production database contains 3,608 orphaned migration version IDs from the Lovable era that have no corresponding `.sql` files in the repo — these orphans are actively blocking `supabase db push` from working.

---

## Root Cause History

### Phase 1 — Lovable Era (project start → early June 2026)

The app was built entirely in Lovable, which applied every schema change **directly to the production Supabase database** without creating migration files. This left 3,608 version IDs in the production `supabase_migrations.schema_migrations` table that have no matching `.sql` files anywhere in the repo. These are the "Lovable orphans."

### Phase 2 — Cutover to Cursor + Supabase Branching

Commit `fac99a2f3` ("Vercel + Supabase Branching cutover") moved the team off Lovable onto a proper workflow. As part of this:
- A `00000000000000_baseline.sql` was taken from the production schema snapshot
- All Lovable-era migration files were moved to `supabase/migrations/_archive/`
- A GitHub Actions CI job was added to **auto-apply migrations on merge to main**

### Phase 3 — CI Auto-Apply Broke

The auto-apply CI immediately hit the Lovable orphan problem — Supabase's migration runner saw the 3,608 Remote-only IDs and refused to push because the local history didn't match. Attempts were made to patch it:
- `d46f1c7d2` — "mark Lovable UUID migrations as applied before db push"
- `9317fd337` — "simplify migration workflow — use db-url, remove personal access token"

The CI was eventually scaled back and the auto-deploy was quietly dropped (PR #67 removed more CI jobs). **No manual deployment process replaced it.**

### Phase 4 — PRs Merged, Migrations Stranded

Every PR after the cutover added migration files to the repo but nothing applied them to production. The team has been unknowingly shipping DB-dependent features with unapplied schema changes.

---

## The Blocker: 3,608 Lovable Orphan IDs

Running `supabase db push --linked` fails with:

```
Remote migration versions not found in local migrations directory.
```

The fix requires running:

```bash
npx supabase migration repair --status reverted $(npx supabase migration list 2>&1 \
  | awk -F'|' 'NF==3 && $1 !~ /[0-9]/ && $2 ~ /[0-9]/ {gsub(/ /,"",$2); print $2}' \
  | grep -v "^$" | tr '\n' ' ')
```

**What this does:** Removes the 3,608 Lovable-generated version IDs from the migration history tracking table (`supabase_migrations.schema_migrations`) in production. It does NOT rollback or touch any actual schema, tables, or data. The schema those IDs represent is already captured in `baseline.sql`. It only cleans the version ledger.

Then follow with:

```bash
npx supabase db push --linked
```

**This must be run by Dave or someone with Supabase project admin access from inside `rto-compass-hub/`.**

---

## The 44 Unapplied Migrations

Once the orphan repair is done, `db push` will apply these in order. Grouped by origin PR:

### PR #29 — `feat/tas-consultation-overlays` + PR #42 fixes (June 18, 23 files)

Assessment tools, custom IDs, TAS consultation links, QI register rework. Mostly `CREATE OR REPLACE` and `IF NOT EXISTS` — designed to be idempotent. Two exceptions:

- `20260618021800_aot_polymorphism_p2a_engine.sql` (33KB) — large engine migration, apply in a maintenance window
- `20260618022400_assessment_tools_rls_standardise.sql` (11KB) — drops and recreates RLS policies; run in a maintenance window

| File | What it does |
|---|---|
| `20260618000800_extend_tas_list_v3_consultation_evidence.sql` | Extends TAS list RPC with consultation evidence |
| `20260618000900_seed_custom_id_sequence_helper.sql` | Custom ID sequence helper function |
| `20260618001000_seed_custom_id_sequences_run.sql` | Seeds custom ID sequences |
| `20260618021800_aot_polymorphism_p2a_engine.sql` | Assessment tools polymorphism engine (33KB) |
| `20260618022000_assessment_tools_naming_and_custom_id_columns.sql` | Naming and custom ID columns |
| `20260618022100_assessment_tools_status_constraint_expand.sql` | Expands status constraint |
| `20260618022200_assessment_tools_documents_link.sql` | Document link columns |
| `20260618022300_assessment_tools_validation_propagation.sql` | Validation propagation |
| `20260618022400_assessment_tools_rls_standardise.sql` | Standardises RLS policies (11KB) |
| `20260618022500_assessment_tools_backfill_custom_id.sql` | Backfills custom IDs |
| `20260618022600_assessment_tools_remap_active_to_published.sql` | Remaps active → published status |
| `20260618022700_assessment_tools_status_constraint_finalise.sql` | Finalises status constraint |
| `20260618022800_fix_generate_tenant_custom_id_2arg.sql` | Fixes custom ID generator function |
| `20260618022900_fix_extract_industry_themes_from_evidence.sql` | Fixes industry themes extraction |
| `20260618023000_training_products_for_tenant_scope.sql` | Training products tenant scoping |
| `20260618025652_becf20de-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618030715_5c1c1424-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618034005_423ad643-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618054727_89375505-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618061520_f4a4e0d6-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618062447_3474e1d4-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618065339_d6728f1d-...sql` | (UUID-named) — part of assessment tools batch |
| `20260618110500_fix_qi_ids_rollup_and_invite_role_ceiling.sql` | Fixes QI IDs rollup and invite role ceilings |

### PR #62 — `feat/suggestion-intake` (June 23–24, 8 files)

Suggestion system, support chat unification. All `CREATE OR REPLACE` — safe to apply any time.

| File | What it does |
|---|---|
| `20260623000250_2782a2dd-...sql` | Suggestion system (UUID-named) |
| `20260623000836_8f98bf1c-...sql` | Suggestion system (UUID-named) |
| `20260623001143_7aa609e5-...sql` | Suggestion system (UUID-named) |
| `20260623003958_e405c70b-...sql` | Suggestion system (UUID-named) |
| `20260623004634_12734271-...sql` | Suggestion system (UUID-named) |
| `20260623075940_suggestion_intake_trigger.sql` | Auto-trigger on suggestion submission |
| `20260623084301_3bea0e11-...sql` | Suggestion system (UUID-named) |
| `20260623093000_fix_get_suggestion_comments_table.sql` | Fixes suggestion comments RPC (DROP+CREATE) |

### PR #65 — `feat/branch-db-seed-config` (June 24–25, 9 files)

Gap-fill for Lovable schema drift, support chat fixes, consultant RPCs. All safe — `IF NOT EXISTS` or `CREATE OR REPLACE`.

| File | What it does |
|---|---|
| `20260624000100_gap_fill_tenants_schema_drift.sql` | Adds 10 columns to `public.tenants` missing from baseline (`IF NOT EXISTS`) |
| `20260624011731_aaa40794-...sql` | (UUID-named) — post-suggestion-intake fix |
| `20260624101230_get_my_suggestion_detail_structured_fields.sql` | New suggestion detail RPC |
| `20260624101231_expose_platform_schema_to_postgrest.sql` | Exposes platform schema to PostgREST |
| `20260624120000_update_public_suggestion_status_rpc.sql` | Updates public suggestion status RPC |
| `20260624150000_unify_chat_and_status.sql` | Unifies support chat + status tables |
| `20260624160000_fix_support_chat_marks_unread.sql` | Fixes unread marking in support chat |
| `20260624170000_fix_add_suggestion_comment_role_and_transition.sql` | Adds role + transition to comments |
| `20260624171000_fix_update_suggestion_status_unread.sql` | Fixes suggestion status unread flag |
| `20260625002556_5562ffad-...sql` | `add_consultant_to_consulting_org` RPC v1 |
| `20260625004101_09f3dc4e-...sql` | `add_consultant_to_consulting_org` RPC v2 |
| `20260625004358_6ea0781e-...sql` | `add_consultant_to_consulting_org` RPC v3 (final) |
| `20260625034447_1b038aa7-...sql` | `risk_register.governance_link` column type → `text` ⚠️ |

---

## Deployment Order

1. **Run orphan repair first** (Dave, one-time) — see command above
2. **Run `npx supabase db push --linked`** — applies all 44 in timestamp order automatically
3. **Verify** with `npx supabase migration list` — all local IDs should now appear in Remote column

### One migration to watch

`20260625034447` changes `risk_register.governance_link` from its current type to `text` using `USING governance_link::text`. Verify no FK constraint exists on that column before applying. If `db push` applies it automatically as part of the batch, confirm the cast succeeded in the Supabase logs.

---

## Post-Merge Ritual (TO BE SET UP)

**Current state:** No automated notification or process exists after a PR with migrations is merged to main. Migrations pile up silently.

**Planned:** A hook/automation that detects migrations in a merged PR and flags the team to deploy them. See separate setup task.

---

## Status

- [ ] Dave runs orphan repair command
- [ ] Dave runs `supabase db push --linked`
- [ ] Verify all 44 appear as applied in `supabase migration list`
- [ ] Set up post-merge migration notification ritual
