# Audit — PR #434: Bring SSO sidebar in line with Admin/Trainer sidebars (14 August 2026)

**Date:** 14 August 2026
**Branch:** `feat/sso-sidebar-parity`
**PR:** [#434](https://github.com/ComplyHub-ai/rto-compass-hub/pull/434)
**Merge commit:** `941e92339aff95df6fd91efcb929b9a9b48431a6`
**Merged:** 14 August 2026, 10:16 am AEST
**Purpose:** RJ flagged (screenshot, SSO sidebar) six ways the SSO sidebar was out of step with the Admin/Trainer sidebars: shorter header, wrong logo text, over-narrow tenant-name truncation, no search bar, no "Quick Actions" label/divider, no profile footer, and collapsed mode hiding all but 2 nav items.

---

## What was implemented

Investigated first (via Explore agent) and confirmed there is no shared sidebar component — `AdminSidebar.tsx`, `SsoSidebar.tsx`, and `EnhancedRoleSidebar.tsx` (Trainer/Compliance Manager/etc.) are three independent, copy-pasted implementations. Ported patterns into `SsoSidebar.tsx` only, using Admin's structure as the primary template (closest existing match — same `SidebarMenuItem`/`SidebarSection` component shape already) and Trainer's wider truncation + tooltip as the more accessible variant:

- Header: `h-14` (56px) → `h-[72px]` (matches both Admin and Trainer, which already agreed with each other); logo box 24px → 32px
- Logo badge: "SSO" → "CH" (corrected RJ's assumption it should say "CB" — confirmed via code it's actually "CH" on both comparison sidebars)
- Tenant-name truncation: `max-w-[140px]` → `max-w-[180px]` (Trainer's width, the widest of the two) + added a `title` tooltip (Trainer has this, Admin doesn't, SSO had neither) — confirmed for RJ that this is independent of the header-height fix, not resolved by it
- Added in-sidebar search, reusing the existing `SidebarSearch` component (same one Admin uses) rather than duplicating a third copy — filters both quick-access and section items, with a "no results" message
- Added the "Quick Actions" label + `Separator` divider above the quick-access list
- Added a profile footer (avatar + email + role + sign-out, collapsed and expanded variants) — folded the pre-existing read-only-mode banner into the same bordered block rather than stacking a second border
- Collapsed sidebar: `SidebarSection` previously `return null`ed everything except the 2 curated quick-access items; now renders every section item as an icon, matching how Admin (hover flyouts) and Trainer (inline icons) both keep every item reachable when collapsed

## Blast radius

1 file (`SsoSidebar.tsx`). Confirmed Admin and Trainer sidebars are separate implementations, so none of this touches them. Sidebar contents (nav items/sections) and the gradient background untouched, per RJ's explicit ask to retain both.

## Dave standard / DB impact

None. Pure frontend/presentational change, no data layer involved.

## Test plan

- `npx tsc --incremental --noEmit` — clean.
- Pre-commit hooks (prettier + eslint) — clean on commit.
- Verified with a temporary Vitest + Testing Library render test (written, run, then deleted — not committed, since no sibling sidebar component has test coverage either): confirmed live in the rendered DOM — 72px header, "CH" logo, 180px truncation with `title` tooltip, search input present and filtering correctly (typing "monthly" showed Monthly Report and hid At-Risk Monitor), "Quick Actions" label present, profile footer (email/role/sign-out) present, and collapsed mode rendered 11 nav links instead of 2.
- CI: `.single()` guard, Edge Functions type check, migration guards, config.toml coverage all passed before merge; Lint/Type check/previews were still pending when RJ merged — not separately re-verified live in this session.
- Full logged-in browser walkthrough wasn't performed — this account doesn't hold SSO test credentials for the live app, so verification relied on the render test above rather than an authenticated click-through.

---

## Files changed

`src/components/nav/SsoSidebar.tsx` — frontend-only, no migration, no production DB step required.
