# Audit — External API Integration Phase 2: TAS document data endpoint (7 September 2026)

**Date:** 7 September 2026
**Branches:** `fix/api-integration-remove-phase1-copy`, `feat/external-api-tas-data-endpoint`
**PRs:** [#1006](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1006) (merged 6 Sep 2026, 22:20 UTC — `1b6b4b9dc0ca93590efbf29c045cb861d76757da`), [#1005](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1005) (merged 6 Sep 2026, 23:22 UTC — `37ca4ca37be13d39f1ce8f25a6711136283a3c55`)
**Purpose:** RJ wanted to pull TAS document data (training product details + AOT unit hour allocations) out of ComplyHub into a separate SMS project. Decided to reuse the existing Phase 1 "API Integration" connection-test key rather than build a new outbound push mechanism.

## Decisions made

- **Pull, not push.** The SMS project calls a new ComplyHub endpoint on its own schedule, authenticated with the same `rto_id` + `api_key` pair issued for Phase 1's connection test. ComplyHub only ever stores the key's SHA-256 hash, never the raw value, so it has nothing to present outbound anyway — push was never actually viable with this key.
- **Reused the existing key as-is**, rather than generating a second, purpose-scoped key. Accepted tradeoff: revoking it now kills every integration riding on it, not just this one — no per-purpose granularity yet.
- **Beta gate stays** (`rj@vivacity.com.au` only, both the frontend `useApiIntegrationBetaAccess` check and the `rpc_generate_tenant_api_key`/`rpc_revoke_tenant_api_key` server-side check). RJ explicitly chose to keep this a personal pilot rather than lift it to general availability this round.
- **Card copy** ("...Phase 1 — connection test only, no data is shared yet.") shortened to generic wording describing the mechanism, not the payload — avoids needing a copy update every time the data shared through this key grows.

## What shipped

**PR #1006** — `ApiIntegrationSection.tsx`: dropped the "Phase 1 — connection test only, no data is shared yet" sentence from the card description.

**PR #1005** — new edge function `external-api-tas-data`:
- Validates `rto_id` + `api_key` via the existing `rpc_validate_tenant_api_key` (same mechanism as `external-api-connect-test`).
- Resolves `tenant_id` via a direct `tenants` lookup on `rto_id`, since that RPC only returns `tenant_name`, not the id.
- Returns each tenant's current (`is_current = true`), non-archived `q1_tas_builder` rows — `id`, `custom_id`, `training_product_code`, `training_product_title`, `product_type`, `specialisation` — each joined with its latest `tas_aot_packs.unit_hour_allocations` (by `generated_at`/`created_at` descending).
- Rate-limited the same way as `external-api-connect-test`: 30 requests/hour per `rto_id`, via `check_email_rate_limit`.
- Assumptions flagged to RJ in the PR body rather than assumed silently: all current/non-archived builds returned (not one specific build); `product_type = 'unit'` builds included with `unit_hour_allocation: null` (they never get an AOT pack); `id`/`custom_id` added as correlation keys though not explicitly requested.

## CI fix mid-flight

First push failed "Security checks (changed files only)" — the new function's `SUPABASE_SERVICE_ROLE_KEY` usage (needed to bypass RLS for an unauthenticated external caller, same justification as `external-api-connect-test`) wasn't yet on the allowlist. Added `external-api-tas-data` to `.github/allowed-service-role-functions.txt` alongside the existing entry; re-ran clean.

## Correction during investigation

Earlier in this same session, `q1_tas_builder` was reported to RJ as having no real `training_product_code`/`training_product_title` columns (only `qual_code`/`qual_title`, aliased in views/RPCs). That read came from a stale branch (`fix/support-mode-billing-enabled-boolean`, ~6 days old) that predated a migration squash on `main` (~1,050 files consolidated into a fresh baseline, `20260904035951`–`20260904040010_baseline_*.sql`). On current `main`, `training_product_code`/`training_product_title` are real, first-class columns — the former is NOT NULL and non-empty via a CHECK constraint. `qual_code`/`qual_title` still exist but are now nullable/legacy. RJ's original field names were correct from the start; re-verified against the current schema before writing the new endpoint.

## Blast radius

Contained. `ApiIntegrationSection.tsx` only renders behind the existing beta gate (visible to `rj@vivacity.com.au` only). The new edge function is net-new — nothing existing calls it or is affected by its addition.

## DB/RLS impact

No schema or migration changes in either PR. The new function reads `tenants`, `tenant_api_keys`, `q1_tas_builder`, `tas_aot_packs`, `security_events` via the service-role client (RLS intentionally bypassed, same justification as `external-api-connect-test`), scoped to the single `tenant_id` resolved from the validated `rto_id` — no cross-tenant exposure path. No new RPCs, triggers, or RLS policies.

## Migration ownership

N/A this round — no migration required for what shipped. Lifting the beta gate (frontend gate + backend RPC email check) was discussed and explicitly deferred by RJ. When it does happen, the backend piece goes to Dave per the standing DB-ownership rule, and must bundle in re-tightening `rpc_generate_tenant_api_key`/`rpc_revoke_tenant_api_key` back to Administrator-only — currently loosened to any active tenant member as an intentional Phase-1 stopgap (see that migration's own note to re-tighten "in the same follow-up migration that removes the beta gate").

## Files changed

`src/components/admin/settings/ApiIntegrationSection.tsx` (#1006); `supabase/functions/external-api-tas-data/index.ts`, `supabase/config.toml`, `.github/allowed-service-role-functions.txt` (#1005).
