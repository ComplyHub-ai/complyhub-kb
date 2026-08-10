# Audit — PR #401: Referral Signup Attribution + Auto-Grant (10 August 2026)

**Date:** 10 August 2026
**Branch:** `feat/referral-signup-attribution`
**PR:** [#401](https://github.com/ComplyHub-ai/rto-compass-hub/pull/401)
**Merge commit:** `0d7bdd259f5659b954aad9e4175e4d6808ee2ecb`
**Purpose:** Phase 3 of the referral-attribution fix (Phase 1: PR #398, Phase 2: PR #399). A trial signup completed via a valid `?ref=` link should attribute the new tenant to the referring consulting org and auto-grant that org's active team access, so it shows up in "My Clients" immediately — no manual "Request Client Access" step.

---

## What was implemented

- `admin_create_trial_tenant_for_user` gained an optional trailing `p_ref_code` param. When it resolves to an active `affiliate_ref_codes` row: sets `tenants.parent_consultant_org_id` (existing column, previously never written), increments `affiliate_ref_codes.signup_count`, and auto-grants every active Administrator/Consultant member of the consulting org `'Consultant'` access to the new tenant (same non-downgrading `ON CONFLICT` shape as `superadmin_decide_portfolio_request`'s approval path). The referral block is wrapped in its own `BEGIN/EXCEPTION` so a failure there can never roll back or fail the trial signup itself.
- `demo_signup_admin` edge function accepts and forwards `ref_code`.
- `DemoSignup.tsx` sends the ref code captured in Phase 2 (`sessionStorage`) on both submission paths — the RTO-verified signup and the no-RTO fallback (`no_rto_trial` gained a `ref_code` column too, informational only — no tenant is created on that path).

## Blast radius

Same signup-path files as Phase 2 (`DemoSignup.tsx`, `demo_signup_admin`), plus one existing, high-traffic RPC (`admin_create_trial_tenant_for_user` — every trial signup calls this). Every existing insert/column/guard from the live definition was preserved verbatim; only the referral additions are new, and they're isolated in their own exception guard specifically so this initiative can never break the core "create my trial" path.

## Dave standard / DB impact

Two migrations. `ALTER TABLE no_rto_trial ADD COLUMN ref_code text` — trivial, nullable, no RLS/index implication. The `admin_create_trial_tenant_for_user` change is higher-sensitivity given it's on the critical signup path — see the bug caught below. RJ owned both migrations directly, consistent with owning this initiative end-to-end.

## Bug caught before it ever reached production: function-signature ambiguity

The first version of this migration used `CREATE OR REPLACE FUNCTION admin_create_trial_tenant_for_user(...8 params...)` on the assumption that Postgres would extend the live 7-arg function in place, since the 8th param had a `DEFAULT`. **That assumption was wrong and would have broken every trial signup on merge.** Postgres identifies a function by name + argument list (count and types); adding an 8th declared parameter does not replace a 7-parameter function, it creates a second, distinct overload alongside it. Since `demo_signup_admin` calls this RPC with named parameters, having two same-named overloads live simultaneously would make every call — including the majority with no `ref_code` — hit PostgREST's `PGRST203` "Could not choose the best candidate function" ambiguity error.

**Caught by an automated review pass** (a bot-created branch, `cursor/trial-tenant-function-ambiguity-dac8`, appeared against this PR's branch with a one-line diagnosis and fix) before this migration was ever applied anywhere. Verified independently against Postgres's actual function-identity semantics rather than trusting the bot output blindly, then applied the equivalent fix directly to this PR's own migration file rather than merging the bot's branch: `DROP FUNCTION IF EXISTS public.admin_create_trial_tenant_for_user(uuid, text, text, text, text, text, text);` immediately before the `CREATE OR REPLACE`, so only the corrected 8-arg version remains and existing callers omitting `ref_code` resolve to it unambiguously via the `DEFAULT`.

**Root cause of the original mistake:** an earlier research pass (before this PR was written) asserted "Postgres allows extending a function's signature with new DEFAULT-valued trailing params via CREATE OR REPLACE" — that claim was taken at face value into the implementation plan without independently verifying it against real Postgres semantics or testing it. Worth remembering for any future `CREATE OR REPLACE FUNCTION` that changes an existing function's parameter count, even when every new parameter has a default.

## CI note

Separately, CI's service-role-key guard (`.github/workflows/ci.yml`'s `ALLOWED` allowlist) flagged `demo_signup_admin/index.ts` — a real gap (this was the first PR to touch that file since the guard existed), not a false alarm about the PR's own logic. `demo_signup_admin` is a pre-existing, legitimate service-role user (needs it for `supabase.auth.admin.createUser()`), intentionally public/unauthenticated by design since its whole job is creating a brand-new account — same class as `placement-supervisor-submit`. Added to the allowlist with a justification comment matching the existing documentation style; this PR made no auth change.

## Production apply

Both migrations applied via Supabase MCP `execute_sql` against project `gdwhlstfguxarnxasrrs` post-merge. Verified: `no_rto_trial.ref_code` column exists; `admin_create_trial_tenant_for_user` has exactly one 7/8-arg-family version live (`pg_get_function_identity_arguments` confirms no lingering ambiguity), and its body matches the merged migration byte-for-byte. A separate, unrelated 3-arg legacy overload of the same function name exists (different parameter names entirely — `p_tenant_name`/`p_trial_days`) and does not conflict with named-argument calls to the 7/8-arg version.

**Open item:** RJ still needs to run two `supabase migration repair --status applied` commands (`20260810024119`, `20260810024133`) — not yet confirmed done as of this entry.

**Live end-to-end signup test:** deliberately skipped, not overlooked. RJ decided (10 Aug 2026) that the byte-for-byte schema/function verification above is sufficient confidence — a live test would have meant either a real signup granting real access to RJ's affiliate team on a throwaway test tenant, or an agent-triggered edge-function call with the same side effect, neither of which was worth the cleanup for the confidence gained. If referral attribution is ever suspected of misbehaving, that live check is the first thing to run.

## Files changed

`src/pages/DemoSignup.tsx`, `supabase/functions/demo_signup_admin/index.ts`, `.github/workflows/ci.yml`, `supabase/migrations/20260810024119_add_ref_code_to_no_rto_trial.sql` (new), `supabase/migrations/20260810024133_add_referral_attribution_to_trial_tenant_creation.sql` (new).
