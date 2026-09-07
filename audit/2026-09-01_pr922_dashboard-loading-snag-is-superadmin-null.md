# Audit — PR #922

> **Date:** 2026-09-01; **Merged:** 2026-09-01 04:42:29 UTC  
> **Scope:** Stop the production-wide dashboard “We hit a loading snag” crash after PR #893 mounted Support Mode billing on every authenticated shell.  
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked in `active-work.md` worktree C then parked SQL follow-up

---

## Summary

PR #922 is a client-only crash fix. PR #893 (merged 2026-09-01 ~01:37 UTC) added Support Mode Stripe diagnostics on the shared dashboard layout. That hook passed React Query `enabled: isInSupportMode && !!activeTenantId`. Live `get_my_app_context` computes `is_superadmin` as `(profiles.role = 'super_admin' OR profiles.global_role = 'platform_owner')`. For typical tenant users `global_role` is NULL, so Postgres `false OR NULL` is NULL, JSONB emits JSON `null`, AppContext stored a non-boolean, and `isInSupportMode` stayed `null`. React Query v5 throws `Expected enabled to be a boolean or a callback that returns a boolean`. The AppRoutes error boundary rendered the loading-snag screen on every dashboard route (admin home, Credit Transfer, and any other shell page).

Live count at diagnosis: **241 of 254** profiles had a NULL `is_superadmin` expression; affected reports included `chamudi@australiancollege.edu.au`, `rachael@aia.edu.au`, and `rjdbadua.works@outlook.com` (three tenants). RJ’s PR #920 wrapped the same `enabled` line in `Boolean(...)` but was incomplete for the stored/null context path and was **closed unmerged** as superseded by #922.

This PR changed 5 files (+79 / −12). No migrations. No edge functions. Highest-risk behavioural change: Support Mode billing now runs only when Support Mode is strictly `true` and a tenant id is present; JSON null is treated as not-superadmin.

**Branch:** `fix/null-is-superadmin-dashboard-crash` (merged; remote deleted) · **Merge commit:** `f994e99f2598b8fbe424ecd4b5d0043a3246d2fd`  
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/922

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| All authenticated dashboard routes | White page: “We hit a loading snag. Try refreshing the page.” | Shared `SupportModeBanner` → `useSupportModeBilling` → React Query `enabled` received JavaScript `null`. |
| `get_my_app_context.is_superadmin` | JSON null for ordinary tenant users | SQL three-valued logic: `false OR NULL` is NULL when `global_role` is unset. |
| **(fresh-eyes)** stored `contextData` | Coerced `isSuperAdmin` / `isInSupportMode` but raw RPC payload still had JSON-null `is_superadmin` | A later consumer of `contextData.is_superadmin` could reintroduce the `enabled` throw. Fixed in the second commit. |
| **(fresh-eyes)** `billing-diagnostics` vs RPC | Platform-owner-only could theoretically enable the query then 403 | Edge git source gates `profiles.role === 'super_admin'`. Live: all 8 true superadmin rows have `role = super_admin`. No code change. |
| PR #920 | Same crash, Support Mode–only narrative | `Boolean(...)` on one call site; did not coerce AppContext ingest or landing. Closed as superseded. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `82e80f67dd8910a1a28120f74b4c807d20e19761` | Coerce RPC true-flags; Support Mode billing `enabled` only when Support Mode is strictly true. |
| `fde1702005ccf054e2471fb1dbcb2d18a0a6a37b` | Persist coerced `is_superadmin` on all AppContext ingest paths; landing uses the same coerce. |
| `f994e99f2598b8fbe424ecd4b5d0043a3246d2fd` | Merge PR #922 into `main`. |

OrgSwitcher `enabled: isSuperAdmin && !!profile?.id` was attempted then **dropped** from the first commit: lint-staged failed on pre-existing `react-hooks/rules-of-hooks` (hooks after an early return). Fresh-eyes confirmed tenant users already get `isSuperAdmin: false` from `useEffectiveRole` in tenant mode, so dropping it did not leave the dashboard crash open.

---

## Fixes shipped

### Frontend

- **`src/lib/rpcBoolean.ts`** — `coerceRpcTrue`, `supportModeBillingQueryEnabled`, `withCoercedSuperadminFlag`.
- **`src/hooks/useSupportModeBilling.ts`** — `enabled` uses the strict helper (never `null && uuid`).
- **`src/contexts/AppContext.tsx`** — coerce on apply + every ingest (`get_my_app_context`, `switch_to_tenant` snapshot, `switch_to_superadmin`, consultant exit/clear, refetch).
- **`src/lib/auth/landing.ts`** — `coerceRpcTrue` on raw RPC `is_superadmin` branches.
- **`tests/hooks/supportModeBillingQueryEnabled.test.ts`** — null → boolean false; Support Mode enablement; stored-flag coerce.

### Database

None. Live `get_my_app_context` still emits JSON-null `is_superadmin`. Follow-up parked (see Still open).

### Edge functions

None touched, none redeployed. `billing-diagnostics` still invoked only when Support Mode is strictly true; git source requires JWT + `profiles.role === 'super_admin'`. Live deploy vs git was not compared (MCP had no `get_edge_function` at review time).

---

## Review rounds

1. **Root-cause** — Live SQL on `gdwhlstfguxarnxasrrs`: 241/254 profiles NULL `is_superadmin`; three reported emails confirmed. Vercel runtime-error table empty (SPA throw, not serverless).
2. **Fresh-eyes** (`code-reviewer` on the first commit) — no confirmed bugs ≥80%; second-look items triaged; coerce-on-store and landing coerce applied in commit 2; 403 mismatch not live; OrgSwitcher drop cleared.
3. **lint-staged / CI** — pre-commit eslint passed on the four-file second commit; merge SHA GitHub: Lint (blocking) success, Type check (blocking) success. Supabase Preview failed (pre-existing branch-DB drift, not this PR). Vercel GitHub status: Deployment has completed.
4. **PR #920** — closed 2026-09-01 with comment pointing at #922.

---

## Production rollout (post-merge)

1. **Vercel production** — `dpl_CDAaSED3q3ZhBymFpnNkNgj6fn8t`; `state`/`readyState` **READY**; `target: production`; SHA `f994e99f2598b8fbe424ecd4b5d0043a3246d2fd`; aliases include `rto.complyhub.ai`. Inspector: https://vercel.com/complyhub/complyhub-rto/CDAaSED3q3ZhBymFpnNkNgj6fn8t
2. **Edge functions** — none.
3. **Migrations** — none.
4. **Worktrees** — worktree C (`rto-compass-hub-C`) checked out `main` at `f994e99f2`, local/remote feature branch deleted, registry row unclaimed. SQL follow-up must wait until worktree A finishes Phase B apply.

---

## Manual QA checklist (post-merge — Brian-gated)

Not done in-session (no authenticated browser pass after deploy).

- [ ] Hard-refresh `rto.complyhub.ai` as a normal tenant Administrator / Compliance Manager — admin home loads (not loading snag).
- [ ] Same user: Credit Transfer register loads.
- [ ] SuperAdmin Support Mode on a subscriber tenant — banner still shows; billing strip loads for `role = super_admin` staff.

---

## Still open / follow-up

- **`get_my_app_context` JSON-null `is_superadmin`** — parked in `active-work.md` Backlog (1 Sep 2026). Client coerce is live; SQL should return `false` not NULL (`COALESCE` / rewrite the OR). Do not start while worktree A is mid Phase B migration apply. High-risk `CREATE OR REPLACE` — copy live `pg_get_functiondef`, not an old migration file.
- **`billing-diagnostics` live vs git** — not confirmed.
- **platform_owner-only staff** — none live today; edge still requires `role = super_admin`.

---

## Soak status

No feature flag. Risk: medium until human QA confirms; after that low (client coerce only, who-is-superadmin unchanged). Watch: any remaining loading-snag reports after hard refresh (stale bundle) or new `enabled: <rpcFlag> &&` call sites on raw RPC nulls.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/922
- Merge commit: `f994e99f2598b8fbe424ecd4b5d0043a3246d2fd`
- Superseded: https://github.com/ComplyHub-ai/rto-compass-hub/pull/920
- Cause PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/893
- Production deploy: https://vercel.com/complyhub/complyhub-rto/CDAaSED3q3ZhBymFpnNkNgj6fn8t
- Active work ledger: `active-work.md`
