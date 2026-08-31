# Audit — PR #903: Security: enforce TAS authoring role contract (1 September 2026)

**Date:** 1 September 2026
**Branch:** `chatgpt/tas-authoring-role-contract-v2`
**PR:** [#903](https://github.com/ComplyHub-ai/rto-compass-hub/pull/903)
**Merged:** 31 August 2026, 23:40 UTC — commit `838180844f534c9c0e5cc4afbe8b630160e5f9bd`
**Purpose:** implements the role-contract closure from #643 — narrows `/dashboard/tas/builder` and the TAS Engine build tab to canonical author roles only, and mirrors that at the RLS layer.

## Change

- `TenantGuard.tsx`: removes `Consultant Assistant` from `TAS_AUTHOR_ROLES` (no longer canonical; loses both authoring and read access to the TAS Builder route/tab), adds `Trainer/Assessor` to `TAS_READ_ROLES` (new read-only grant on TAS Engine non-build tabs; their day-to-day TAS access remains the separate `/dashboard/trainer-portal/tas` surface, unaffected).
- New migration `20260831135305_tas_authoring_role_contract_rls.sql`: 20 RESTRICTIVE RLS policies (SELECT/INSERT/UPDATE/DELETE) across `q1_tas_builder`, `q1_tas_units`, `q1_tas_builder_settings`, `tas_draft_sections`, `tas_governance`, matching the same role list as the frontend guard.

## Blast radius

Contained. `TAS_AUTHOR_ROLES`/`TAS_READ_ROLES` are private to `TenantGuard.tsx` — not imported anywhere else, so the change cannot leak into other route guards. `roleMenuConfigs.ts` has no menu entry for `/dashboard/tas/builder` at all, so no stale nav link is left pointing Consultant Assistant at a now-blocked route.

## DB/RLS impact

Verified against existing migrations before merge: all 5 tables already carry a permissive `billing_gate` policy (tenant-active check, all commands) plus existing RESTRICTIVE `tenant_isolate_*`/`write_lock_*` policies. The new `tas_role_*` policies slot in as additional RESTRICTIVE narrowing (AND-composed) — failure mode is "denies too much," not a cross-tenant leak. `tenant_id` scoping and the `sec.is_super_admin()` bypass are present and consistent with the existing pattern. Migration was reconciliation-only (already applied to production under this exact version/name) — ledger row verified, not reapplied.

## Outstanding (from PR body, not blocking this record)

Authenticated tenant-seat UAT (Administrator, Compliance Manager, Trainer/Assessor) is still flagged by the author as required before parent issue #643 fully closes.

## Known unrelated CI noise

`Supabase Preview` failed on this PR (and on #904/#905, byte-for-byte identical output) with `ERROR: Consultant Assistant still present after rewrite for set_document_version(...)`. Root-caused during review: pre-existing migration `20260828082738_remove_consultant_assistant_from_register_document_functions_v2.sql` (already on `main`, unrelated to this PR) hard-fails on any from-scratch migration replay because a plain-English SQL comment in `20260804140000_widen_set_document_version_roles.sql` line 54 (`-- Consultant Assistant -- matches ...`) still contains the substring after the migration's regex strip. Flagged for Dave — not actioned here.

## Files changed

`src/components/tenant/TenantGuard.tsx`, `supabase/migrations/20260831135305_tas_authoring_role_contract_rls.sql`.
