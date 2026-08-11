# Audit — PR #409

> **Date:** 11 August 2026 (audit written); **Merged:** 11 August 2026
> **Scope:** Trainer Monthly Report submission crash — traced from a single reported error through five
> compounding schema/function bugs in `ofi_register` and everything downstream of it
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked directly in conversation, no
> intermediate `.md` file created for this body of work

---

## Summary

Started from a support forward: Ruchika (trainer, Trainer/Assessor role, "Australian College Pty Ltd"
tenant) reported she couldn't submit her Monthly Report — the final "Declaration & Submit" step failed
with `record "new" has no field "created_by"`. Root-caused via Scout (live migration + DB investigation)
to `public.ofi_register` never having a `created_by` column despite a trigger unconditionally trying to
set one. Fixing that one column surfaced, in sequence, four more independent bugs in the same area — each
found by pushing a fix, then running a fresh-eyes adversarial review pass against the live database before
moving on, twice. Total: 4 commits, 5 migrations, 8 frontend files, on branch
`fix/ofi-register-created-by-column`.

**Branch:** `fix/ofi-register-created-by-column` (not yet deleted) · **Merge commit:** `f70e4db060a`
· **Merged:** 11 Aug 2026 · **Migrations:** `20260811160000`, `20260811163000`, `20260811180000`,
`20260811181000`, `20260811190000`

## Root cause chain

1. **`ofi_register` missing `created_by`/`updated_by`** — a shared audit-stamp trigger
   (`set_created_by()`, plus a duplicate copy of itself on the same table) fires `NEW.created_by =
   auth.uid()` on every insert; the column never existed. Confirmed live: `ofi_register` had **0 rows**
   in production — nothing had ever inserted successfully, by any path.
2. **Three more NOT-NULL crash sites in `submit_trainer_monthly_report()`**, unrelated to #1, each firing
   only when a report touches that section: a complaints insert that set the wrong column
   (`complaint_id` instead of `custom_id`, with a trigger silently nulling it back out), a WHS
   safety/behaviour-incident insert missing a required `position` field, and two risk-register inserts
   missing required `priority`/`quality_area` fields.
3. **The actual reason the crash persisted after fix #1** — `ofi_register.id` was `integer` while every
   other register table (ssr/whs/rpl/pdr/ien/caa/risk) uses `uuid`, and the submit function assigns its
   insert's `RETURNING id` into a `uuid` variable. Converted the column (0 rows, no data migration
   needed) plus two dependent integer columns (`ci_register.linked_ofi_id` FK, `gov_register.linked_ofi_id`
   soft link).
4. **First fresh-eyes review pass** (post-#3) found: the id-type fix hadn't touched a parameter type on
   `auto_create_governance_entry`, and a new `tp_trainers` lookup (added for the WHS fix) was missing a
   tenant filter — `tp_trainers.user_id` isn't unique across tenants for a consultant/multi-tenant user,
   so it could silently pull a job title from the wrong organisation.
5. **Second fresh-eyes review pass** (post-#4) found: fixing `auto_create_governance_entry`'s parameter
   type via plain `CREATE OR REPLACE` created a duplicate function overload instead of replacing it
   (Postgres keys functions by argument type) — this repo had already hit and fixed this exact class of
   bug once before, on this exact function. Also found 5 more live functions
   (`apply_duplicate_merge_plan`, `generate_duplicate_merge_plan`, `resolve_duplicate_merge`,
   `resolve_duplicate_close`, `rpc_dispatch_governance_action_to_register`) still casting OFI ids to
   `::integer`, and one frontend file (`CrossRegisterLinking.tsx`) still typed as `number`.

A Cursor Bugbot comment on the PR separately flagged the risk-register `quality_area: 'q1'` value as
inconsistent casing — verified against the platform's canonical dropdown tables (`dd_quality_area`) and
100% of live production data (all lowercase); the bot's underlying fact was correct (two unrelated
modals, `SendToRiskModal.tsx`/`CreateRiskFromValidationModal.tsx`, do write uppercase `'Q1'`) but the
*direction* of the fix was backwards — those two modals were the outliers, not this branch. Fixed them
to lowercase in a follow-up commit instead of "fixing" this branch to match the wrong convention.

## Fixes shipped in PR #409

### Database (5 migrations, applied in order)

- `20260811160000` — `ofi_register.created_by` column + drop duplicate trigger.
- `20260811163000` — `submit_trainer_monthly_report()`: fixed CAA/WHS/risk insert gaps (see #2 above).
- `20260811180000` — `ofi_register.id` int→uuid, `updated_by` column, dependent column types + FK.
- `20260811181000` — `auto_create_governance_entry` param type, `submit_trainer_monthly_report`
  tenant-scoped `tp_trainers` lookup.
- `20260811190000` — `auto_create_governance_entry` overload fix (`DROP FUNCTION` + exact-ACL re-grant),
  5 functions' `::integer`→`::uuid` casts.

Every `CREATE OR REPLACE` was diffed line-by-line against the live `pg_get_functiondef` before writing,
per this repo's migration discipline — no guard/branch dropped in any of the 8 functions touched.

### Frontend (8 files)

`GovernanceForm.tsx`, `useGovernanceLinks.tsx`, `CrossRegisterLinking.tsx`, `pages/registers/ofi/index.tsx`,
`types/continuousImprovement.ts` — OFI id fields `number`→`string`. Hand-patched generated `types.ts`
(couldn't run `supabase gen types typescript` in this environment). `SendToRiskModal.tsx`,
`CreateRiskFromValidationModal.tsx` — `quality_area` casing fix (bot-flagged, verified, fixed in the
opposite direction from the bot's suggestion). One pre-existing lint blocker fixed in `GovernanceForm.tsx`
(`form.watch()` → `useWatch()`, React Compiler incompatible-library error) encountered while committing —
matched an existing pattern in `ContinuousImprovementForm.tsx`.

### Review rounds

Two full fresh-eyes adversarial review passes (live-DB-verified, via the `checker` skill), each finding
real bugs the prior pass/commit missed — see root cause chain #4 and #5 above. One `verify-bot-fix`-style
check on the Cursor Bugbot casing comment (partially confirmed, fix applied in the correct direction).

**Deliberately NOT fixed** (separate, pre-existing, unrelated bugs — flagged, not guessed at):
- `submit_trainer_monthly_report_full`, `get_trainer_reports_for_meeting`, `find_duplicate_ofi` — dead
  code, no frontend caller. `submit_trainer_monthly_report_full` also references a
  `report_register_links` table that doesn't exist in production at all.
- `auto_create_ofi_from_document` (both overloads) — references columns that don't exist on
  `ofi_register`'s current schema; already broken today, live-called from
  `postUploadAutomationService.ts` (document-upload automation has been silently failing).
- `insert_ofi_from_trainer_report` — called from a **second, different** Monthly Report page
  (`pages/trainer/MonthlyReportForm.tsx`), already broken today attempting an invalid int→uuid cast.
  Needs a product decision on whether that page is still live before fixing.
- `RiskManagementDashboard.tsx`'s Quality Area filter — compares against uppercase `'Q1'`/`'Q2'`/etc.,
  already non-functional against 100% of existing (lowercase) production data; unrelated to and
  unaffected by this PR either way.

## Production rollout (post-merge)

1. **All 5 migrations applied to production** via Supabase MCP `execute_sql` (not `apply_migration`),
   one at a time, in filename order — each verified live immediately after (`information_schema.columns`,
   `pg_get_functiondef`, `pg_trigger`, `proacl`) before proceeding to the next.
2. **Caught and self-corrected one side-effect during rollout**: the `DROP FUNCTION`/`CREATE` cycle for
   `auto_create_governance_entry` triggered Postgres's schema-level default-privilege grant, adding an
   `anon` EXECUTE grant that didn't exist on the original live function. Caught by re-checking `proacl`
   after applying, corrected with an explicit `REVOKE ... FROM anon` to match the original ACL exactly
   (`postgres`/`authenticated`/`service_role` only).
3. **Migration ledger repaired** — Brian ran `supabase migration repair --status applied <version>` for
   all 5 versions from his terminal. First attempt failed (`file does not exist`) because
   `rto-compass-hub` (worktree A) hadn't pulled the merge yet; pulled it, reran successfully. Confirmed
   all 5 `version`/`name` pairs match their files exactly in `supabase_migrations.schema_migrations`.
4. No edge functions touched — nothing to deploy beyond the frontend (auto-deployed via Vercel on merge
   to `main`).

## Still open / follow-up

- **`insert_ofi_from_trainer_report`** — a second Monthly Report page (`pages/trainer/MonthlyReportForm.tsx`)
  calls this RPC and hits an unrelated, pre-existing crash (invalid int→uuid cast) independent of
  anything in this PR. Needs Brian's call on whether that page is still a live/routed flow before fixing.
- **`auto_create_ofi_from_document`** (both overloads) — document-upload automation
  (`postUploadAutomationService.ts`) has been silently failing to auto-create OFI entries; references
  columns that don't exist on the current `ofi_register` schema at all. Needs its own investigation into
  intended behaviour before a fix is written.
- **Dead code left as-is**: `submit_trainer_monthly_report_full`, `get_trainer_reports_for_meeting`,
  `find_duplicate_ofi` — no frontend caller found, left untouched per minimum-scope; flagged rather than
  removed since their origin/intent (possible in-progress groundwork for a different team member) wasn't
  investigated.
- **`RiskManagementDashboard.tsx`'s Quality Area filter** — already broken against all existing data
  (case mismatch), not touched, not part of this PR's scope.
- **Manual QA on production** — not yet performed by a human: submit a Monthly Report covering each of
  the 6 previously-crashing sections (resource concern, improvement suggestion, minor/serious assessment
  issue, WHS incident, complaint, general risk item) and confirm each succeeds; link an OFI to a
  governance entry; resolve/merge/close a duplicate OFI candidate in a governance meeting; dispatch a
  governance action to the OFI register.

## Soak status

No feature flag, no gradual rollout — all 5 schema/function changes are live for every tenant as of the
manual `execute_sql` application above. `ofi_register` had 0 rows before this PR, so there's no
existing-data migration risk; every OFI record created from this point forward uses the new `uuid` id
and the corrected insert paths. Worth watching for any report-submission errors in the next few days,
particularly from trainers whose reports touch WHS incidents, complaints, or risk items (the sections
that were crashing before this PR, per root cause #2).
