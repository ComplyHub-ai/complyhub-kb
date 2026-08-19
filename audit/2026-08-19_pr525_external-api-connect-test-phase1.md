# Audit — PR #525: External API Integration Phase 1 (connect-test) (19 August 2026)

**Date:** 19 August 2026
**Branch:** `feat/external-api-connect-test-phase1`
**PR:** [#525](https://github.com/ComplyHub-ai/rto-compass-hub/pull/525)
**Merged:** 19 August 2026
**Purpose:** RJ requested Phase 1 of a per-tenant API-key system so an external system (the SMS/enrolment platform) can eventually connect to ComplyHub via API key. Phase 1 scope, confirmed with RJ before any code was written: generate/revoke a per-tenant API key, and a connect-test endpoint that validates a key — no data exchange yet. Restricted to a single beta tenant (Australian College Pty Ltd, `rto_id = '91110'`) and a single user (`rj@vivacity.com.au`) until validated.

---

## What was implemented

- **Migration** `20260819070000_add_tenant_api_keys.sql` — new `tenant_api_keys` table (`tenant_id` FK cascade, `key_hash` unique, `key_prefix`, `created_at`, `created_by`, `revoked_at`, `last_used_at`), RLS enabled, SELECT-only permissive policy (insert/update/delete forced through RPCs), standard RESTRICTIVE overlay stack (billing gate, super-admin select restriction, workspace-write-lock restriction).
- Three new functions:
  - `rpc_generate_tenant_api_key(p_tenant_id)` — Administrator-only (`sec.has_tenant_role_strict`) or super admin, plus a beta-gate check (caller email + tenant `rto_id` must match the two hardcoded constants) before generating `ch_live_<32 bytes hex>`, hashing with `extensions.digest(...,'sha256')`, and returning the raw key once.
  - `rpc_revoke_tenant_api_key(p_key_id)` — same auth + beta gate, sets `revoked_at`.
  - `rpc_validate_tenant_api_key(p_rto_id, p_key_hash)` — **service-role only** (`REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon`), looks up tenant by `rto_id`, checks hash + not-revoked, updates `last_used_at`.
- **Edge function** `external-api-connect-test` (`verify_jwt = false`, genuinely public — the caller is an external system with no Supabase session) — accepts `{ rto_id, api_key }`, rate-limits via the existing `check_email_rate_limit` RPC keyed on `external-api:${rtoId}`, hashes the key with `crypto.subtle.digest`, calls `rpc_validate_tenant_api_key`, logs failed attempts to `security_events`, returns `{ ok, tenant_name }` or `{ ok: false, error }`.
- **Frontend**: `useApiIntegrationBetaAccess` (client-side visibility check only — mirrors the same two beta-gate conditions the RPCs enforce server-side), `useTenantApiKeys` (list/generate/revoke via TanStack Query), `ApiIntegrationSection` (renders `null` outside the beta pilot; otherwise shows masked active key, reveal-once dialog on generate, revoke confirmation dialog), added to `RTOSettings.tsx` after `RTOSettingsForm`.
- **CI fix (same PR)**: `.github/workflows/ci.yml`'s "Security checks (changed files only)" job maintains an explicit allowlist of edge functions permitted to use `SUPABASE_SERVICE_ROLE_KEY`, each with a justification comment. Added `external-api-connect-test` with the same justification class as the existing `signup-precheck` entry: public/unauthenticated, service role needed to call a `service_role`-only RPC and the shared rate-limit RPC without exposing either to the client.

## Blast radius

New table, three new functions, one new edge function, one new settings-page section — all additive. `RTOSettings.tsx` gained one new child section (`ApiIntegrationSection`) with no changes to existing sections. `ApiIntegrationSection` renders `null` for every tenant/user outside the beta pilot, so this ships invisibly for the entire existing user base. No existing route, hook, or shared component was modified. `AppContext`/sidebar/tenant-switcher untouched.

## DB/RLS impact

- New table `tenant_api_keys`, tenant-scoped, RLS enabled, `tenant_id` indexed. No insert/update/delete policy defined — all writes forced through the two RPCs, which independently re-check Administrator/super-admin role plus the beta gate server-side (the frontend hook is a visibility convenience only, not the real enforcement).
- `rpc_validate_tenant_api_key` explicitly revokes `EXECUTE` from `PUBLIC`/`authenticated`/`anon` and grants only to `service_role` — the edge function's service-role key is the sole caller path, matching this repo's existing `service_role`-only RPC convention.
- No existing table, trigger, or RLS policy was altered. Zero rows affected (new table).
- No `SUPABASE_SERVICE_ROLE_KEY` exposed to the client at any point — used only inside the edge function, server-side.

## Beta gate (Phase 1 scope limiter)

Hardcoded in `src/lib/constants/apiIntegrationBeta.ts` (`API_INTEGRATION_BETA_RTO_ID = '91110'`, `API_INTEGRATION_BETA_USER_EMAIL = 'rj@vivacity.com.au'`) and duplicated server-side inside both generate/revoke RPCs. Documented in that file as a temporary Phase 1 restriction — removing it (frontend constant + RPC gate blocks, via a follow-up migration) is the explicit trigger for general availability, not yet scheduled.

## Test plan

- `npx tsc --incremental --noEmit` — clean.
- CI: Type check, Lint, Security checks (after the allowlist fix), Migration guards, Migration drift check, Edge Functions type check, config.toml coverage, Supabase Preview, Vercel — all passed.
- CI initially failed on "Security checks (changed files only)" because the new edge function's `SUPABASE_SERVICE_ROLE_KEY` usage wasn't yet in the allowlist — fixed in a follow-up commit on the same branch/PR (see CI fix above), re-ran green.
- Not yet manually tested end-to-end against a real external caller (no external system exists yet to call it) — RJ to test the connect-test flow live using the beta tenant/user once merged.

## Files changed

`supabase/migrations/20260819070000_add_tenant_api_keys.sql` (new), `supabase/functions/external-api-connect-test/index.ts` (new), `supabase/config.toml`, `src/lib/constants/apiIntegrationBeta.ts` (new), `src/hooks/useApiIntegrationBetaAccess.ts` (new), `src/hooks/useTenantApiKeys.ts` (new), `src/components/admin/settings/ApiIntegrationSection.tsx` (new), `src/pages/settings/RTOSettings.tsx`, `.github/workflows/ci.yml` (security-check allowlist entry).

## Not yet actioned (Phase 2+, out of scope here)

- No actual data exchange with the external SMS/enrolment platform — this PR is connect-test only, per RJ's explicit Phase 1 scope.
- General-availability rollout (removing the beta gate) not scheduled — needs its own migration to drop the RPC-level checks plus removal of the frontend constants file.
