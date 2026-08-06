# Audit — PR #389

> **Date:** 7 August 2026
> **Scope:** 1 merged PR on `rto-compass-hub` — fixed the `/onboarding/assistant` route rendering a
> placeholder stub instead of the real onboarding checklist component.
> **Branch:** `fix/onboarding-assistant-wrong-component` (deleted post-merge)
> **Merge authority:** RJ

---

## Summary

RJ reported that clicking "AI Assistant Onboarding" (the header "X% complete" pill, dashboard
onboarding card, avatar menu, etc.) landed on an "This feature is being developed" placeholder,
when a real onboarding experience had worked previously.

Root cause: `src/AppRoutes.tsx`'s `onboarding/assistant` route rendered `<AIAssistantOnboarding />`
— a stub file (`src/pages/onboarding/AIAssistantOnboarding.tsx`, literally commented
`// Simple AI Assistant Onboarding stub`) — instead of `<OnboardingAssistant />`
(`src/pages/onboarding/OnboardingAssistant.tsx`), a fully-built component with a role-aware
checklist, `useOnboardingProgress()`, and a ComplyBot help link. `OnboardingAssistant` was already
imported in `AppRoutes.tsx` but never referenced in any route — dead code, apparently swapped for
the similarly-named stub by mistake.

Could not find an in-repo regression commit: `git log --follow` / `git log -S` on the route, the
stub file, and the legacy `/onboarding` redirect all trace to a single squashed commit
("Initial commit from remix", 7 Oct 2025) with no changes since. If this worked as recently as RJ
recalls (~3 months ago), that behaviour predates this repo's tracked history or came from a
different environment — not something git history here can confirm.

## Blast radius

Single route-element swap in `src/AppRoutes.tsx`. Every entry point that calls
`navigate('/onboarding/assistant')` is fixed by this one change — no other files needed edits:
- `src/components/onboarding/guided/HeaderOnboardingButton.tsx` (header pill)
- `src/components/dashboard/OnboardingWidget.tsx` (dashboard card)
- `src/components/header/UserAvatarMenu.tsx` (avatar dropdown)
- `src/lib/auth/routeAfterLogin.ts` (post-login redirect)
- `src/pages/Onboarding.tsx` (legacy `/onboarding` redirect — comment updated to reflect the
  correct component name)
- `src/pages/settings/rto/RTOInfoSettings.tsx`, `src/pages/settings/KeyDates.tsx` (deep-links)

Also deleted the now fully-orphaned stub file (`AIAssistantOnboarding.tsx`) and its unused import.

## DB/RLS impact

None — pure frontend routing change. Verified before shipping that `OnboardingAssistant`'s
dependencies hadn't rotted while it sat unrendered: `onboarding_checklist` table and
`auto_detect_onboarding_completion` / `complete_onboarding_item` RPCs all still exist in the
baseline schema, no `DROP` found for any of them.

## Verification

- `npx tsc --incremental --noEmit` — clean.
- Vite dev server boot — no unresolved-import/compile errors from the swap.
- Full authenticated click-through was **not** done by Claude — `/onboarding/assistant` is behind
  `ProtectedRoute` and the only test-user helper available (`tests/utils/auth.ts`) inserts into the
  legacy `organization_members`/`organisation_id` pattern banned in `CLAUDE.md`, and `.env` points at
  what appears to be the production Supabase project — creating live test data there wasn't judged
  safe to do unprompted. Flagged to RJ to verify on the PR's preview deploy with his own session
  before merge.

## Files changed

- `src/AppRoutes.tsx` — route now renders `OnboardingAssistant`; removed unused `AIAssistantOnboarding` import
- `src/pages/Onboarding.tsx` — comment corrected
- `src/pages/onboarding/AIAssistantOnboarding.tsx` — deleted (orphaned stub)

## Commits

- `506e0124a` — `fix(onboarding): wire /onboarding/assistant to the real OnboardingAssistant component`

## PR

#389 — merged 7 August 2026.

## Related, unmerged at time of writing

While investigating unrelated CI failures reported the same session, found and fixed a second,
independent issue: PR #382 (`fix/extract-industry-themes-invalid-md5-digest`) was blocked by a CI
allowlist gap (service-role-key check flagged pre-existing, correctly-gated code on first touch) —
fixed via `.github/workflows/ci.yml` allowlist addition, commit `b342a3047`. Also flagged to Dave: a
migration-ledger drift issue blocking PR #389's own Supabase Preview check
(`20260709084428_release_notes_may_june_july_summary_md_first_attempt.sql` duplicate-key collision),
same drift class as the `qi_annual_register` issue found earlier blocking PR #382 — not fixed here,
Dave's territory.
