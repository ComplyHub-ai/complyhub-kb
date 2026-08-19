# Audit — PR #530: Move API Integration section to the reachable settings page (19 August 2026)

**Date:** 19 August 2026
**Branch:** `fix/api-integration-section-consolidated-settings`
**PR:** [#530](https://github.com/ComplyHub-ai/rto-compass-hub/pull/530)
**Merged:** 19 August 2026
**Purpose:** Follow-up to PR #525 (External API Integration Phase 1). RJ couldn't find the new "API Integration" card after merge — it was placed on the wrong page.

---

## Root cause

PR #525 added `<ApiIntegrationSection />` to `src/pages/settings/RTOSettings.tsx`, served at `/settings/rto`. That page's own header comment claims it's the "Canonical Admin Settings page" — but it is **not** linked from `BrandedSidebar.tsx`, the sidebar actually rendered in production. The sidebar's "Settings" entry points to `/dashboard/settings/organisation`, which renders a completely different page, `ConsolidatedRTOSettings.tsx` — a separate ~2,370-line tabbed implementation (Info/Preferences/Branding/Team/Governance/Security/Data/Billing) that carries its **own** "this is the canonical settings page, do not add alternative pages" header comment.

Both files claim canonical status; only one is reachable through normal navigation. This is the same class of git/production drift this repo has flagged before (KB reference docs describing a state the live app has since diverged from) — noted here for awareness, not resolved as part of this fix.

## What was implemented

- Removed `<ApiIntegrationSection />` and its import from `RTOSettings.tsx`.
- Added the same component (unchanged, no prop wiring needed — it self-resolves tenant/user via `useEffectiveRole()`/`useAuth()`) into `ConsolidatedRTOSettings.tsx`'s existing `data` tab, directly below the existing "Data Overview" card.

## Blast radius

Two files touched, four lines each. No change to `ApiIntegrationSection.tsx`, its hooks, or the beta-gate logic from PR #525 — purely a relocation of which page renders it. `ConsolidatedRTOSettings.tsx`'s other seven tabs are untouched. `RTOSettings.tsx` still renders its onboarding banner, subscription section, and RTO settings form as before — only the API Integration card was removed from it.

## DB/RLS impact

None — no migration, no RPC, no RLS change. Same beta-gated component, same server-side enforcement (`rpc_generate_tenant_api_key`/`rpc_revoke_tenant_api_key` still independently check Administrator role + the `rto_id`/email beta gate).

## Test plan

- `npx tsc --incremental --noEmit` — clean.
- CI: Type check, Lint, Security checks, Migration guards, Edge Functions type check, config.toml coverage, Vercel — all passed. "Supabase Preview" (non-blocking branch-preview status check) reported a transient fail/pending flap during the run but was not part of the required gate; automerge proceeded once the required checks were green.
- RJ to confirm visually: Settings → Data tab, while active on Australian College Pty Ltd as `rj@vivacity.com.au`.

## Files changed

`src/pages/settings/RTOSettings.tsx`, `src/pages/settings/ConsolidatedRTOSettings.tsx`.

## Note for later

The dual "canonical settings page" claim between `RTOSettings.tsx` and `ConsolidatedRTOSettings.tsx` — and the fact that `RTOSettings.tsx` is unreachable via the live sidebar — is unresolved. Any future settings-page addition should go to `ConsolidatedRTOSettings.tsx` (confirmed reachable) until someone decides whether `RTOSettings.tsx` should be deleted or repointed. **Flagged, not actioned.**
