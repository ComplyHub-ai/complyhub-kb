# Audit - PR #464: Sprint 0 security batch drift reconciliation

> **Date:** 17 August 2026
> **Scope:** Reconciliation of production migration drift from Angela/Cursor's "Sprint 0 — change log" security report (16-17 Aug 2026), plus a separate driver-register-map drift batch surfaced by the same CI check
> **Project:** `gdwhlstfguxarnxasrrs`
> **Branch:** `fix/migration-drift-reconciliation-aug16-17`
> **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/464
> **Merge commit:** `7cbd08f87`
> **Merged:** 17 August 2026

---

## Summary

Angela/Cursor's Sprint 0 security report listed 12 fixes already applied directly to production on 16-17 Aug 2026 (trainer-credential storage closure, domain-based super_admin auto-grant removal, public `subscribers` table closure, billing-lockout root-cause fix, governance-dashboard repoint, meeting-scheduler fix, address-sync fix, platform-wide RPC closures, anon storage-write closure, and an impersonation-authorization fix). Cross-referencing the report against `main` found 9 of the 12 apparently missing their git migration file; on closer inspection 6 of those 9 were false alarms from a stale prior check — only 3 were genuinely missing. This PR wrote those 3.

Opening the PR against `main` triggered CI's migration-drift-check on an unrelated pre-existing gap: 4 production migrations from 17 Aug 2026 (driver-register-map cleanup) also had no matching git file. These were reconciled in the same PR rather than deferred, since the check was already blocking.

Cursor Bugbot and Vercel's bot both independently flagged a real bug in the impersonation fix before merge, verified against live code (`impersonate-user`, `AuthContext.tsx`, `cleanup-impersonation-metadata`) before fixing, not taken on the bots' word alone.

Post-merge, production was found to still be running the *original, buggy* version of the impersonation fix — the corrected git file had never been re-applied, since the version was already recorded as "applied" in production's ledger from before this PR existed. Applied directly via Supabase MCP `execute_sql` and verified live.

---

## Migration files reconciled

**Sprint 0 report (3 genuinely missing; report's other 9 confirmed already on `main`):**
- `20260817031039` — `revoke_anon_write_grants_on_storage_objects` — first attempt at closing anon write access to `storage.objects`; recorded verbatim as a documented no-op (see Findings below).
- `20260817031140` — `deny_anon_storage_writes_via_restrictive_policy` — the actual fix: three RESTRICTIVE policies requiring `auth.uid() IS NOT NULL` on INSERT/UPDATE/DELETE.
- `20260817032314` — `get_effective_role_verify_impersonation_server_side` — switches impersonation authorization from a user-writable JWT claim to server-verified `public.impersonations` state.

**Driver-register-map drift (unrelated, surfaced by CI on this same PR):**
- `20260817034346` — `revoke_anon_grants_on_driver_register_map` — revokes default `anon` DML grants on a newly-created reference table.
- `20260817034410` — `restrict_driver_register_map_to_read_only` — same closure for `authenticated` (kept SELECT only).
- `20260817034817` — `correct_driver_6_register_mapping` — repoints Driver 6's evidencing register from `tas_register` to `q1_tas_builder`.
- `20260817034820` — `drop_tenant_grain_driver_code_from_clause_map` — drops an incorrectly per-tenant `driver_code` column from `governance_clause_map` (0 rows at the time, no data migration needed).

All 7 files' SQL was taken verbatim from `supabase_migrations.schema_migrations.statements` (live production), not reconstructed from the report's prose, except the impersonation file — see Findings below.

---

## Findings (Cursor Bugbot / Vercel bot, verified before fixing)

**Impersonation lookup used the wrong column — CONFIRMED, fixed before merge.**
`get_effective_role()`'s first draft filtered the active-impersonation-session lookup on `impersonated_user_id = auth.uid()`. Impersonation never swaps the session JWT — `auth.uid()` stays the impersonator for the session's duration (confirmed against `impersonate-user/index.ts`'s insert, `AuthContext.tsx:368`, and `cleanup-impersonation-metadata/index.ts`, all of which key the active-session lookup on `impersonator_id`). As written, the impersonation branch would never fire for the actual impersonator. Fixed to key on `impersonator_id`, with the target's role read via `impersonated_user_id`.

**Migration drift check failure — not caused by this PR's own commits.**
CI's `migration-drift-check.yml` failed on 4 pre-existing production migrations (driver-register-map, dated 17 Aug 2026) that had no matching git file — unrelated to the Sprint 0 report, surfaced only because this PR's diff touched `supabase/migrations/**.sql` and tripped the workflow's path filter. Reconciled in the same PR (see above) rather than deferred, since it was already blocking merge.

---

## Production execution and verification (post-merge)

| Fix | Pre-apply live state | Post-apply verification |
|---|---|---|
| `revoke_anon_write_grants_on_storage_objects` | Already applied (a no-op — `storage.objects` owned by `supabase_storage_admin`, `postgres` holds no grant option) | Confirmed still a no-op as expected; documented, not re-run |
| `deny_anon_storage_writes_via_restrictive_policy` | Already applied — 3 RESTRICTIVE policies present | Confirmed present, no change needed |
| `get_effective_role` (impersonation fix) | **Still running the pre-Bugbot-fix buggy version** (`impersonated_user_id` lookup) — the corrected file only ever landed in git via the PR, never re-applied | Applied corrected function via `execute_sql`; confirmed via `pg_get_functiondef` that `impersonator_id` lookup is live and the old buggy column reference is gone |
| Driver-register-map (4 migrations) | Already applied verbatim | Confirmed unchanged, no re-apply needed |

No `migration repair` commands were needed — all 7 migration versions were already recorded in `supabase_migrations.schema_migrations` under their correct version+name (they were applied directly to production with these exact identifiers originally), so git and the ledger already agreed once the files existed. Only the impersonation function's *content* needed re-applying, since its git-file correction happened after the version was already marked applied.

---

## Verification performed

- `ci-gate` skill (filename format, RLS/tenant-index/search_path guards, no hardcoded secrets/project ID, no dropped tests/migrations) — clean, no `.ts`/`.tsx` changes in this PR
- Each of the 7 files' SQL cross-checked against live production definitions via Supabase MCP `execute_sql` before writing, not reconstructed from report prose
- `get_effective_role` replacement checked against git history (`git log -S`) — no prior git-tracked version existed to silently revert
- Cursor Bugbot / Vercel bot findings independently verified against live code before fixing (impersonation column bug — confirmed real)
- Post-merge production verification of the corrected impersonation function (see table above)

---

## Follow-up (parked, not addressed in this PR)

- Three released tenants (from the original Sprint 0 report) still read as "suspended" in dashboards despite being unlocked — needs a data reconciliation pass against Xero.
- 31 users carry a stale `impersonating: true` metadata flag against zero active sessions — needs a cleanup pass; whatever ends an impersonation session should also clear this flag going forward.
- `TRUNCATE` on `storage.objects` remains open to `anon` (cannot be governed by RLS) — needs someone with `supabase_storage_admin` to revoke it properly. Not currently exploitable (storage schema absent from `pgrst.db_schemas`).
- 8 orphaned storage objects (super-admin-only now) need triage — re-home or delete.
- Public survey file upload (`SurveyResponse.tsx` → bucket `survey-uploads`) has never worked — the bucket doesn't exist. Product decision needed (create bucket + policy, or remove the control).
- Six governance-meeting schedules point at tenants that no longer exist (FK violations) — needs a decision (disable schedules vs. restore tenant rows).
