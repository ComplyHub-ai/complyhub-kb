# Audit — Tenant API Key feature: missing production apply + RPC role-gate fix (20 August 2026)

**Date:** 20 August 2026
**Branch:** `fix/tenant-api-key-rpc-membership-check`
**PR:** [#535](https://github.com/ComplyHub-ai/rto-compass-hub/pull/535)
**Merged:** 20 August 2026
**Purpose:** Two follow-on incidents discovered only once RJ actually tried to use the Phase 1 External API Integration feature (PR #525, #530) end-to-end in the browser. Both are now resolved; the feature works.

---

## Incident 1 — migration `20260819070000_add_tenant_api_keys.sql` was merged but never applied to production

**Symptom:** `GET .../rest/v1/tenant_api_keys?...` returned `404` in the browser as soon as the relocated API Integration card (PR #530) rendered.

**Root cause:** confirmed via a direct diagnostic query (`to_regclass`, `to_regprocedure`, and `supabase_migrations.schema_migrations` all returned `null` for the table/functions/ledger version) — the migration file was merged to `main` on 19 Aug but, per this repo's documented process (`supabase/migrations/CLAUDE.md`), merging never auto-applies to production; a manual apply step was required and got missed.

**Fix:** ran the migration's exact SQL directly against production via `supabase db query --linked -f <file>` (the Supabase CLI, available locally in this repo via `node_modules/.bin`, already linked + authenticated to the `gdwhlstfguxarnxasrrs` project), then repaired the ledger with `supabase migration repair --status applied 20260819070000`. Verified both the objects and the ledger entry afterward.

## Incident 2 — `rpc_generate_tenant_api_key` / `rpc_revoke_tenant_api_key` rejected the pilot user himself (403)

**Symptom:** once Incident 1 was fixed, clicking "Generate API Key" returned `403 Forbidden` from `rest/v1/rpc/rpc_generate_tenant_api_key`.

**Root cause:** both RPCs gated on `sec.is_super_admin() OR sec.has_tenant_role_strict(tenant_id, ['Administrator'])` *before* reaching the Phase 1 beta gate (exact email + exact `rto_id`). Confirmed live: the pilot user (`rj@vivacity.com.au`) holds `profiles.role = 'Consultant'` platform-wide, and a `tenant_members` row for the pilot tenant (Australian College Pty Ltd) with `role = 'Consultant'` — the normal way staff enter client tenants (see root `CLAUDE.md`'s Consultant/affiliate access model). Neither condition of the OR matched, so the pilot user — the only person this feature was ever meant to work for — was rejected before the beta gate ever ran.

**Fix (PR #535):** `CREATE OR REPLACE` on both functions, swapping the Administrator/super_admin requirement for a plain active-membership check (`sec.is_tenant_member`), matching the membership check this table's own SELECT RLS policy (`tenant_api_keys_select`) already uses. Every other guard (null-auth check, the beta gate block itself, key generation/hash logic, revoke logic) carried forward unchanged. Safe because the beta gate immediately below is the real security boundary during Phase 1 — nobody outside the pilot can succeed regardless of which membership check gates entry.

## Blast radius

Both incidents touch only the two RPCs and the one new table from PR #525 — no other function, table, RLS policy, or frontend file. `rpc_validate_tenant_api_key` (service-role-only, called by the edge function) was unaffected by either issue.

## DB/RLS impact

- Incident 1: no schema change beyond what was already reviewed in PR #525 — purely a deployment-process gap.
- Incident 2: function-body change only, confirmed post-apply via `pg_get_functiondef` that both functions now reference `sec.is_tenant_member`. No RLS policy changed. No privilege widened beyond what the beta gate already permitted in practice (only `rj@vivacity.com.au` on `rto_id = '91110'` can ever get past the beta gate regardless of the membership check).

## Test plan

- Both migrations verified live post-apply (table/function existence, ledger version, and function-body content all directly queried, not assumed).
- RJ confirmed end-to-end in the browser: Generate API Key succeeded and returned a key.

## Related, separately-flagged issue found during this work — NOT fixed here

**Unrelated production migration drift, 8 versions, "standalone form campaign" feature** — CI's "Migration drift check" on PR #535 surfaced 8 production migration versions (`20260819073724` through `20260819082909`, all named `*standalone_form_campaign*`) with no matching file on `main`. This is the same direct-to-prod-without-a-migration-file problem `supabase/migrations/CLAUDE.md` dedicates a whole section to. Not part of this PR's scope, not investigated further — active branches (`feat/forms-campaign-foundation`, `copilot/phase-2-forms-distribution-management`) suggest this may be in-progress work by someone else. This check is **not** a required merge gate (confirmed via the repo's ruleset — only Type check, Lint, Block `.single()` usage, Migration guards, and Security checks are required), so it did not block PR #535, but it will keep failing every PR's drift check until reconciled. **Flagged — needs an owner**, not yet actioned.

## Files changed

`supabase/migrations/20260820090000_fix_tenant_api_key_rpc_membership_check.sql` (new). No frontend changes in this PR.
