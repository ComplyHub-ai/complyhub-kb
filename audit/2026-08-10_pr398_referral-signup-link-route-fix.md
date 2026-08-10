# Audit — PR #398: Referral Signup Link Route Fix (10 August 2026)

**Date:** 10 August 2026
**Branch:** `fix/referral-signup-link-route`
**PR:** [#398](https://github.com/ComplyHub-ai/rto-compass-hub/pull/398)
**Merge commit:** `1da9d22e6719e426d3316142295b0103f9923f07`
**Purpose:** RJ noticed his own affiliate referral link (`https://rto.complyhub.ai/signup?ref=VIVACITY2025`, shown on `/affiliate/dashboard`) redirects an anonymous visitor to the login page instead of the trial signup form. Phase 1 of a 4-phase referral-attribution fix (click tracking, signup→client attribution, and commission automation are separate follow-up PRs — see PR #399 and this audit's companion entry).

---

## Root cause

`/signup` is the **authenticated** post-login onboarding route (`AppRoutes.tsx`, `ProtectedRoute`-gated → `Onboarding`), not a public signup page. An anonymous visitor is bounced to `/login?redirect=...`. The correct public trial-signup page is `/trial-signup` → `DemoSignup.tsx`. Every referral-link construction in the codebase hardcoded the wrong path — 8 client-side locations plus the `invite_link` generated server-side by `rpc_send_consultant_trial_invite`.

## What was implemented

- Fixed the base URL/path in 8 client-side files: `AffiliateRefCodePanel.tsx`, `ConsultantReferrals.tsx`, `ConsultantsHubPage.tsx`, `SendReferralModal.tsx`, `AffiliateEditPanel.tsx` (2 occurrences), `AffiliateDetailSheet.tsx`, `AddConsultingOrgModal.tsx`.
- New migration `20260810012915_fix_consultant_trial_invite_link_route.sql` — `CREATE OR REPLACE` on `rpc_send_consultant_trial_invite`, re-implementing every existing guard unchanged, only the two `invite_link` URL literals corrected (`/signup` → `/trial-signup`).
- Incidental: fixed two pre-existing `react-hooks/set-state-in-effect` lint errors (`SendReferralModal.tsx`, `ConsultantsHubPage.tsx`) and one pre-existing `.single()` → `.maybeSingle()` call (`AffiliateEditPanel.tsx`) — both were blocking the pre-commit hook / CI on files this PR touched, unrelated to the link fix itself, no behavioural change.

## Blast radius

Contained to affiliate/consultant/SuperAdmin-specific files. No shared component or route change — `/signup` itself is untouched and correct as the authenticated onboarding route.

## Dave standard / DB impact

One migration, `CREATE OR REPLACE FUNCTION` only — no new table, no RLS change, no new `tenant_id` column. RJ root-caused this himself (found and reported the broken link directly), so per the workspace fix-workflow exception he shipped the migration directly rather than flagging it to Dave.

## CI note

Branch-DB check failed twice on unrelated, pre-existing issues, neither blocking merge:
1. `duplicate key value violates unique constraint "schema_migrations_pkey" ... version 20260716072500` — the same pre-existing ledger-drift class documented in `rto-compass-hub/supabase/migrations/CLAUDE.md` (has broken CI on unrelated PRs since 21 Jul 2026: #279, #287, #288, #290, #292, and previously #322). Confirmed unrelated: that version belongs to a migration merged 16 Jul 2026, long before this branch existed.
2. `.single()` call flagged in `AffiliateEditPanel.tsx` — CI scans the whole diff of any touched file, not just changed lines; fixed as an incidental change (see above).

## Production apply

Applied via Supabase MCP `execute_sql` against project `gdwhlstfguxarnxasrrs` (ComplyHub Project) post-merge, per the documented interim procedure (`supabase db push` is currently unusable for this repo). Verified via `pg_get_functiondef` that the live function matches the migration exactly.

## Files changed

`src/components/affiliate/AffiliateRefCodePanel.tsx`, `src/pages/consultant/ConsultantReferrals.tsx`, `src/pages/consultant/ConsultantsHubPage.tsx`, `src/components/consultant/SendReferralModal.tsx`, `src/components/superadmin/AffiliateEditPanel.tsx`, `src/components/SuperAdmin/AffiliateDetailSheet.tsx`, `src/components/SuperAdmin/AddConsultingOrgModal.tsx`, `supabase/migrations/20260810012915_fix_consultant_trial_invite_link_route.sql`.
