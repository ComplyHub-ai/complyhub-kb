# Audit — PR #423

> **Date:** 12 August 2026
> **Scope:** Billing-gate compatibility with the live production identity schema
> **Project:** `gdwhlstfguxarnxasrrs`
> **Merge:** PR #423 merged to `main` as `bd789d05f`

## Finding

Live read-only verification identified the internal Vivacity Super Admin account associated with
Angela as having no tenant billing record and therefore eligible to bypass customer billing. The
production database schema differed from the repository baseline: production uses `profiles.user_id`
and `users.user_uuid`, while the canonical baseline uses `profiles.id` and `users.user_id`.

Without compatibility handling, the billing gate could fail to identify the internal account and let
it fall through to tenant subscription evaluation, producing the cancelled-subscription screen.

## Fix shipped

`billing-gate` now:

- Tries the live `profiles.user_id` lookup and falls back to canonical `profiles.id`.
- Tries the live `users.user_uuid` plus internal-role fields and falls back to canonical
  `users.user_id`.
- Preserves the internal Super Admin bypass when either supported schema identifies the account.

## Deployment and verification

- Targeted Prettier and ESLint checks passed.
- Initial post-merge Edge Function workflow failed during Supabase CLI setup with a transient
  `fetch failed` error before deployment.
- The failed workflow was rerun successfully.
- Workflow logs confirmed `billing-gate` was deployed to project `gdwhlstfguxarnxasrrs`.
- No SQL migration or data modification was required.
