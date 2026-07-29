# Audit — PR #322: Affiliate Portal Stale Tenant Branding (29 July 2026)

**Date:** 29 July 2026
**Branch:** `fix/affiliate-stale-tenant-branding`
**PR:** [#322](https://github.com/ComplyHub-ai/rto-compass-hub/pull/322)
**Merge commit:** `6efb3b1cb`
**Purpose:** RJ reported (screenshot, `/affiliate/dashboard`) that the Affiliate portal's sidebar and topbar kept showing a previously-entered client's name and logo instead of resetting to the affiliate's own identity — reproduced by clicking "Enter Workspace" on a client, then pressing the browser Back button.

---

## Root cause

`switchToTenant()` (`src/contexts/AppContext.tsx`) sets `profiles.active_tenant_id` server-side via the `switch_to_tenant` RPC when entering a client workspace, then hard-navigates (`window.location.href`) into that tenant's dashboard. Nothing on the `/affiliate/*` path ever cleared `active_tenant_id` back — the Consultant portal received a fix for this exact class of bug on 15 Jul 2026 (`switch_to_consultant_home()` RPC, `20260715014530_add_switch_to_consultant_home.sql`), but it was never ported to the Affiliate portal. `AffiliateSidebar.tsx` also independently compounded it by preferring the mutable `contextData.tenant_name` over the affiliate's own `profile.organization_name`, and `GlobalTopbar.tsx`'s tenant-logo guard excluded `/consultant` paths but not `/affiliate`.

A second contributing factor specific to the reported repro path: "Enter Workspace" navigates via `window.location.href` (a hard, full-document navigation) rather than client-side routing. Pressing Back from that can be served by the browser's back-forward cache (bfcache) rather than a fresh reload — confirmed nothing in this codebase registers a `beforeunload`/`pagehide` handler that would disqualify a page from bfcache — and a bfcache restore does not re-run React mount effects, so a naive "reset on mount" fix would silently miss the exact back-button case reported.

---

## What was implemented

- `src/layouts/AffiliateSidebar.tsx` — stopped reading `contextData?.tenant_name`; always renders `profile?.organization_name` (mirrors `ConsultantSidebar.tsx`'s existing, unaffected pattern).
- `src/components/layout/GlobalTopbar.tsx` — extended the tenant-logo guard (previously excluding only `/consultant` paths) to also exclude `/affiliate` paths.
- `src/contexts/AppContext.tsx` — added `clearActiveTenantContext()`: same `switch_to_consultant_home` RPC call and state update as the existing `exitToConsultantHome()`, minus the forced navigate, for callers already on the correct page that just need the stale workspace context cleared in place.
- `src/layouts/AffiliatePortalLayout.tsx` — calls `clearActiveTenantContext()` when `mode === 'tenant'`, on mount (covers a fresh load/reload) **and** on a `pageshow` listener checking `event.persisted` (covers the bfcache-restore case a mount-only fix would miss).

The sidebar/topbar changes (first two items) make the render itself a pure function of route + the affiliate's own profile, independent of any async state timing — this is what guarantees the stale name/logo can never paint, regardless of which navigation path (fresh load, bfcache restore, hard refresh, deep link) got the user there. The `AppContext`/`AffiliatePortalLayout` changes additionally clear the underlying DB flag so the account itself isn't left thinking the user is still "in" a client workspace.

---

## Blast radius

4 files: `AffiliateSidebar.tsx`, `GlobalTopbar.tsx`, `AppContext.tsx`, `AffiliatePortalLayout.tsx`. `GlobalTopbar` is shared across all roles, but the change only adds one more path-prefix exclusion — scoped strictly to `/affiliate/*`, no effect on Consultant/Administrator/tenant views. `AppContext`'s new function is additive (new export on the context value); no existing caller's behavior changed. Confirmed "Affiliate" is not wired into `roleMenuConfigs.ts`/`permissions.ts`/`roleNavigation.ts` at all (zero grep hits) — no shared role-config risk.

## Dave standard / DB impact

No new migration. Reused the existing `switch_to_consultant_home()` RPC (added 15 Jul 2026) — its role gate (`tenant_members.role IN ('Consultant','Consultant Assistant')`, `status = 'active'`) already covers affiliates, who hold real `tenant_members` rows with `role = 'Consultant'` per the affiliate-program model. The RPC clears only the calling user's own `active_tenant_id`, scoped to `auth.uid()` — no cross-tenant read/write, no RLS change, no new table.

---

## CI note

The branch/PR's Supabase branch-DB check failed with a `schema_migrations` ledger error (`duplicate key … version 20260616024757`). Confirmed unrelated to this PR: `git diff main...fix/affiliate-stale-tenant-branding -- supabase/migrations/` is empty (this PR touches zero migration files), and the referenced version has no corresponding file in the live `supabase/migrations/` directory. This is the same pre-existing ledger drift documented in `rto-compass-hub/supabase/migrations/CLAUDE.md` (a separate reconciliation project, not something to fix inside a normal PR) — it has previously failed on unrelated PRs (#279, #287, #288, #290, #292) too. Did not block merge.

---

## Files changed

`src/layouts/AffiliateSidebar.tsx`, `src/components/layout/GlobalTopbar.tsx`, `src/contexts/AppContext.tsx`, `src/layouts/AffiliatePortalLayout.tsx` — all frontend-only, no migration, no production DB step required.
