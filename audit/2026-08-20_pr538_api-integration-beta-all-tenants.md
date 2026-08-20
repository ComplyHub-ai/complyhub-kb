# Audit — PR #538: widen API Integration beta from one tenant to all tenants (20 August 2026)

**Date:** 20 August 2026
**Branch:** `feat/api-integration-beta-all-tenants`
**PR:** [#538](https://github.com/ComplyHub-ai/rto-compass-hub/pull/538)
**Merged:** 20 August 2026
**Purpose:** After confirming the Phase 1 External API Integration feature worked end-to-end (PR #525/#530/#535), RJ asked to widen the beta from "one tenant + one user" to "any tenant, restricted to one user" — so he can test against any client workspace he has access to, not just Australian College Pty Ltd.

---

## What was implemented

Dropped the `rto_id = '91110'` clause from the beta gate in all three places it was enforced, keeping only the `rj@vivacity.com.au` email check:

- `src/hooks/useApiIntegrationBetaAccess.ts` — simplified to a pure email check; no longer queries `tenants.rto_id` at all (removed a network round-trip along with the restriction).
- `src/lib/constants/apiIntegrationBeta.ts` — removed `API_INTEGRATION_BETA_RTO_ID`, kept `API_INTEGRATION_BETA_USER_EMAIL`.
- Migration `20260820100000_widen_tenant_api_key_beta_to_all_tenants.sql` — `CREATE OR REPLACE` on `rpc_generate_tenant_api_key`/`rpc_revoke_tenant_api_key`, dropping the `NOT EXISTS (... rto_id = '91110')` clause from each beta gate block.

## Blast radius

Three files (one hook, one constants file, one component call-site update), one migration touching only the same two RPCs already modified in PR #535. No RLS, no new table, no other function touched.

## DB/RLS impact

Function-body change only. `sec.is_tenant_member(p_tenant_id)` — checked earlier in both RPCs, unchanged by this PR — still bounds the practical scope: this does not open key generation to arbitrary tenants, only to every tenant `rj@vivacity.com.au` already has an active `tenant_members` row in (his own org plus every client workspace he consults into). Verified live post-apply: both function bodies no longer reference `91110`, and the ledger version is recorded.

## Notable CI/process items (not specific to this PR, recorded for continuity)

- Branch went `BEHIND` mid-review after unrelated PRs merged to `main` (dependency bumps, a new QI campaigns feature, the standalone form campaign work) — resolved with a plain `git merge origin/main`, no conflicts.
- `.github/CODEOWNERS` requires a code-owner review (RJ or Khian) for any PR touching `/supabase/migrations/` — auto-merge sat `BLOCKED` until RJ approved the PR himself in the GitHub UI, which is correct behaviour and not something to route around.
- "Migration drift check" continued to fail on this PR too, same unrelated "standalone form campaign" drift already flagged in the PR #535 audit entry — still not required for merge, still unreconciled, still needs an owner.

## Test plan

- `npx tsc --incremental --noEmit` clean, both before and after merging `main` in mid-review.
- Production apply + ledger repair verified live via direct query (function bodies confirmed to no longer reference `91110`).
- Not yet re-confirmed by RJ in the browser against a second (non-pilot) tenant as of this entry — first real-world test pending.

## Files changed

`src/hooks/useApiIntegrationBetaAccess.ts`, `src/lib/constants/apiIntegrationBeta.ts`, `src/components/admin/settings/ApiIntegrationSection.tsx`, `supabase/migrations/20260820100000_widen_tenant_api_key_beta_to_all_tenants.sql`.
