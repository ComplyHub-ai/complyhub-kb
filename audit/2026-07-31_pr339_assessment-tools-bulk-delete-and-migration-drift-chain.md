# Audit — Assessment Tools Bulk Delete + Migration Drift Reconciliation Chain

**Date:** 31 July 2026
**Branch:** `feat/bulkdelete`
**PR:** #339 — merged, `f24d81d6e^..8e3fe3d7e`
**Source:** new feature request (bulk delete on the Assessment Tools Register), which then surfaced a live
chain of unrelated direct-to-production migration drift while pushing through CI.

---

## What was built

### Bulk delete — Assessment Tools Register
Added a row-selection checkbox (draft-status tools only, left of the tool code column) to
`src/pages/registers/assessment-tools/index.tsx`, and a Delete / Bulk Delete button (left of Bulk Upload)
that appears once one or more rows are selected. New `bulkDeleteTools` mutation in
`useAssessmentToolRegister.ts`:
- Deletes only rows still `status = 'draft'` — filtered in the DELETE itself, not just checked
  client-side first, so a tool submitted for review between selection and confirm is never removed.
- Removes any attached storage file from `evidence-private` and cleans up a stray `documents_register`
  mirror row.
- Pre-checks `assessment_validation` references (`tool_id` column and `assessment_tool_ids` array) and
  excludes blocked tools from the batch, reporting them to the user as a distinct reason.

### RLS gap found and fixed
The register's own `canEdit` gate already treated Consultant the same as Administrator/Compliance
Manager for this register, but the live DELETE policies on `assessment_tools`
(`at_delete`, `roledelete_assessment_tools`) only allowed Administrator/Compliance Manager — a
Consultant-role user (e.g. AJ, Vivacity's Consultant Assistant who operates as `Consultant` across ~24
client tenants) could see and edit a tool but any DELETE would silently fail at the RLS layer. Migration
`20260731092158_assessment_tools_delete_allow_consultant.sql` widens both the PERMISSIVE and RESTRICTIVE
DELETE policies to include `Consultant`.

## Bot review findings (all fixed, this PR)

| # | Bot | Finding | Fix |
|---|---|---|---|
| 1 | Cursor Bugbot | `AlertDialogAction` had no `preventDefault()` and the confirm handler didn't await/catch the `mutateAsync` call — dialog closed immediately regardless of pending/error state, and errors became unhandled rejections | Added `e.preventDefault()` + `await`/`catch`, matching the existing `AssessmentToolDocumentUpload.tsx` pattern |
| 2 | Cursor Bugbot | `selectedIds` was never pruned when a selected tool left draft status elsewhere, so the confirm count/copy could overstate what would actually be removed | Added a `useEffect` that prunes selection against live tool status |
| 3 | Vercel bot | `assessment_validation.tool_id → assessment_tools.id` is a `NO ACTION` FK — a single batch DELETE containing one referenced tool aborted the *entire* statement, deleting nothing | Pre-check references (both `tool_id` and the `assessment_tool_ids` array) before the delete, exclude blocked ids, report separately |
| 4 | Vercel bot | Reconciliation migration's `INSERT` referenced a demo-tenant `q1_tas_builder` row that only exists in production (created ad hoc), so it passed on production but failed branch-DB validation with an FK violation | Added an existence guard (`IF NOT EXISTS ... RETURN`) so it no-ops on branch DBs, doubling as re-run idempotency |
| 5 | Vercel bot | Same reconciliation migration also referenced 4 `q1_tas_builder` columns that were themselves never captured in any migration file (separate column-level drift, not just row-level) | New gap-fill migration `20260731131340_gap_fill_q1_tas_builder_consultation_columns.sql` |
| 6 | Vercel bot | A second direct-to-prod RLS policy (`restrictive_select_tenant_profiles`) scoped by `active_tenant_id`, inconsistent with every other grant policy on `profiles` (which scope by `tenant_id`) — silently hid legitimate tenant members from a tenant-scoped super_admin whenever `active_tenant_id` differed (NULL for 7 of 193 real users, or switched workspace) | New corrective migration `20260731133705_fix_restrictive_select_profiles_tenant_scope.sql` — rescopes to `tenant_id` **plus** an `id = auth.uid()` escape (same pattern `tenant_all` already uses), since 4 of 8 super_admin profiles have a NULL `tenant_id` and would otherwise lose their own row while acting inside a tenant |

Finding 6 was verified against live data before fixing (not just the bot's say-so): confirmed the policy's
actual live definition via `pg_policies`, checked NULL/mismatch counts across all 240 profiles, and read
`sec.superadmin_tenant_gate`/`sec.current_tenant_id` in full before concluding the naive "just swap the
column" fix would have broken super_admins' own visibility of themselves.

## Migration drift chain (unrelated to this PR, discovered via its CI)

Three separate direct-to-production changes by `angela@vivacity.com.au` surfaced one at a time as the
Migration Drift Check kept re-failing on each new commit — none touch `assessment_tools` or anything this
PR actually changed:

| Version | Name | What it does | Reconciliation |
|---|---|---|---|
| `20260731044216` | `seed_demo_industry_consultation_decisions_v3` | Demo-tenant seed data (themes, decisions, linked CI register items) | `20260731044216_seed_demo_industry_consultation_decisions_v3.sql` (with the branch-DB existence guard) |
| `20260731051812` | `restrictive_select_stage1_student_pii` | RESTRICTIVE SELECT RLS on `profiles`, `adjustment_plans`, `intervention_plans`, `wellbeing_risk_scans`, `wellbeing_support_plans` | `20260731051812_restrictive_select_stage1_student_pii.sql` |
| `20260731052208` | `restrictive_select_stage2_consultation_tables` | RESTRICTIVE SELECT RLS on `industry_consultation_decisions`/`industry_consultation_themes` | `20260731052208_restrictive_select_stage2_consultation_tables.sql` |

Stage 1 and Stage 2 landed ~6 minutes apart, indicating an active, in-progress multi-stage RLS rollout
being applied directly to production rather than through the branch/PR workflow. Both were reconciled into
this PR to unblock CI; each was verified read-only first (live SQL pulled from
`supabase_migrations.schema_migrations.statements`, no guessing) before being committed verbatim.

**Flagged to Brian, not resolved here:** this needs a direct conversation with Angela/Carl — reconciling
each stage into whatever PR happens to be open when CI runs isn't sustainable if the rollout is still
in progress.

## Decisions recorded

| Decision | Outcome |
|---|---|
| Checkbox visibility scope | Draft-status rows only (not all rows with a disabled checkbox) — matches the register's existing "draft = still removable" rule |
| Who can bulk-delete | Widened DELETE RLS to include Consultant, matching existing edit/SELECT access for this register, rather than restricting the UI to Administrator/Compliance Manager only |
| Reconciliation vs. corrective migrations | Reconciliation files (`044216`, `051812`, `052208`) were kept **verbatim** to match what's already live in production — bugs found in them (guard, gap-fill) were fixed via *separate new-dated* migrations, not by editing the reconciliation file itself, to avoid re-creating git/production drift in the opposite direction |
| `profiles` RLS fix approach | Rejected the bot's literal suggested fix (swap to `tenant_id` with no escape) after checking live data — added the `auth.uid()` self-visibility escape specifically to avoid a new regression (super_admins with NULL `tenant_id` losing their own profile row) |
| "Known gap-fill migration" list in `supabase/migrations/CLAUDE.md` | Trimmed from a manually-maintained enumerated list back to one reusable rule (grep for existing `gap_fill_*` files before writing a new one) — the enumerated list duplicated what's already discoverable from the migration files themselves and would need updating by hand forever |

## Blast radius

- `src/pages/registers/assessment-tools/index.tsx`, `src/hooks/useAssessmentToolRegister.ts` (feature)
- 6 new migration files (1 RLS widen, 3 reconciliations, 1 gap-fill, 1 corrective RLS fix)
- `AGENTS.md`, `CLAUDE.md`, `supabase/migrations/CLAUDE.md`, `.cursor/rules/migrations.mdc` — documented
  the `AlertDialogAction` async-confirm pattern, the FK `delete_rule` check before batch DELETE, and the
  INSERT-vs-UPDATE/DELETE reconciliation guard + column-drift check, so these are caught pre-review next
  time rather than only by a bot

## DB/RLS impact

Live and verified post-merge (see below) — this is a real production RLS/schema change set, not just a
git reconciliation:
- `assessment_tools` DELETE policies widened to include Consultant
- `q1_tas_builder` gained 4 columns (no-op — they already existed; this closed the git/production gap)
- `profiles` RESTRICTIVE SELECT policy corrected (tenant_id + self-visibility escape)
- 3 reconciliation files require no further action — their exact version+name already existed in
  production's ledger (Angela's direct applies), confirmed via `schema_migrations` before and after

## Post-merge actions completed

1. Applied all 3 genuinely-new migrations to production via Supabase MCP `execute_sql` (never
   `apply_migration`, per the interim procedure) — bulk-delete RLS widen, gap-fill columns, profiles RLS
   fix.
2. Verified each landed via `pg_policies`/`information_schema.columns` before considering it done.
3. Handed Brian the exact `supabase migration repair --status applied <version>` commands for the 3 new
   migrations; confirmed all 3 ledger entries afterward via `schema_migrations` (`version` + `name` match
   the files exactly).
4. No repair needed for the 3 reconciliation-only files — already present in the ledger under those exact
   versions from Angela's direct applies.

## Not yet tested

No dev server / browser available in this session — `tsc --incremental --noEmit` and `eslint` are clean
across all touched files, but the checkbox/selection/confirm-dialog UI has not been visually verified in a
running app. Role-test recommended before considering the feature fully verified: (1) Consultant-role user
selects and deletes draft tools successfully; (2) a role outside
Administrator/Compliance Manager/Consultant/Super Admin never sees the checkbox column or delete button.
