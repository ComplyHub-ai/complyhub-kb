# Audit — onboarding-assistant layout follow-ups

> **Date:** 7 August 2026
> **Scope:** 2 merged PRs on `rto-compass-hub`, same session, direct follow-ups to PR #389
> (`2026-08-07_pr389_onboarding-assistant-route-fix.md`).
> **Merge authority:** RJ
> **Note:** PR numbers not captured — `gh` CLI unavailable in this session; branches and commits
> are exact and traceable below.

---

## Fix 1 — Move onboarding/assistant into the authenticated shell

**Branch:** `fix/onboarding-assistant-layout-and-complybot-button` (deleted post-merge) ·
**Commit:** `70f26357c`

### Root cause

Once PR #389 fixed the route to render the real `OnboardingAssistant` component, RJ reported two
things on the live page: no inner margins/padding at all, and the "Need help? Ask ComplyBot"
button redirecting to the admin dashboard instead of opening ComplyBot.

Both traced to the same misplacement: `onboarding/assistant` was nested under `PublicLayout`
(`src/layouts/PublicLayout.tsx` — a bare `<div><main><Outlet/></main></div>`, used for login/auth
screens) instead of `RootAppLayout`, the shell every other in-app page uses. `RootAppLayout`
supplies the sidebar, the page padding (`<main className="px-4 sm:px-6 py-4 sm:py-6">` +
`max-w-screen-2xl mx-auto`), and mounts the global ComplyBot FAB (`<ComplyBotWrapper />`). None of
that reaches a page under `PublicLayout`.

Separately, the ComplyBot button itself was also broken on its own terms: it navigated to
`/complybot`, but the real route is `/admin/complybot` (missing prefix) — and that route sits
under `<AdminRoute>`, which would not have granted access to the Trainer/SSO/Compliance Manager
roles this same button was shown to, even with the path fixed.

### Fix

- Moved the `onboarding/assistant` route from `PublicLayout`'s children into the authenticated
  shell's children (same tree as `/calendar`, `/admin`, etc., wrapped by `ProtectedRoute` →
  `OrphanRecoveryGate` → `BillingGateGuard` → `AppShellWrapper`/`RootAppLayout`).
- Removed the broken "Need help? Ask ComplyBot" card from `OnboardingAssistant.tsx` (and its
  now-unused imports: `useNavigate`, `Button`, `MessageCircle`, `ArrowRight`) — the global FAB now
  covers this page instead.
- Added `/onboarding` to `BillingGateGuard`'s `BYPASS_ROUTES`. **Judgment call, flagged to RJ in
  the PR and not separately overridden:** onboarding was fully outside the billing gate before
  this move (outside the whole guarded tree), so a locked/expired-trial tenant could still see
  their checklist. This bypass preserves that. Moving the route without it would have newly gated
  onboarding behind billing status — a real behaviour change nobody explicitly asked for.

### Blast radius

`src/AppRoutes.tsx` (route moved, not duplicated — confirmed only one `onboarding/assistant`
registration remains), `src/pages/onboarding/OnboardingAssistant.tsx`,
`src/guards/BillingGateGuard.tsx`. No other files needed changes — every entry point that
navigates to `/onboarding/assistant` (header pill, dashboard card, avatar menu, post-login
redirect, settings deep-links — see PR #389's audit entry) is fixed by the route relocation alone.

### DB/RLS impact

None — pure frontend routing/layout change.

### Verification

`npx tsc --incremental --noEmit` clean, `npx eslint` on the three changed files clean, Vite dev
server boot clean. Full authenticated click-through was left to RJ on the preview deploy (same
constraint as PR #389 — no safe way to simulate an authenticated session against what appears to
be the production Supabase project).

---

## Fix 2 — Stop reserving an empty sidebar column for admins

**Branch:** `fix/onboarding-assistant-sidebar-gap` (deleted post-merge) · **Commit:** `0e93c8ac6`

### Root cause

Immediate follow-up, found by RJ within minutes of Fix 1 landing: the checklist page's content
didn't reach the same width as the header banner above it. Root cause was the risk already flagged
in Fix 1's own PR body — the grid (`grid lg:grid-cols-[1fr_300px]`) always reserved a 300px right
column, but that column's only content (a role-specific tip card) only renders for Compliance
Manager/Trainer/Student Support Officer. The ComplyBot card that used to fill this column for
every other role (Administrator included) was the thing removed in Fix 1, exposing a blank 300px
gap for anyone else.

### Fix

`OnboardingAssistant.tsx` now computes `hasSidebarTip = isCM || isTrainer || isSSO` and only
applies the two-column grid split when it's true; otherwise the checklist card takes the full row.

### Blast radius

Single file, `src/pages/onboarding/OnboardingAssistant.tsx` — no route or guard changes.

### DB/RLS impact

None.

### Verification

`npx tsc --incremental --noEmit` clean, `npx eslint` clean.

---

## Local sync

Both branches deleted locally post-merge (`main` fast-forwarded to `773282f94`). Remote branch
deletion was blocked by the session's permission classifier both times — remote branches left for
RJ/GitHub's own cleanup (or auto-delete-on-merge, if enabled).
