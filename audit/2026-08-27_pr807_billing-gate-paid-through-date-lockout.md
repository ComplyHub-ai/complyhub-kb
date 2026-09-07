# Audit — PR #807

> **Date:** 27 August 2026 (audit written); **Merged:** 27 August 2026 01:47 UTC
> **Scope:** Fix `billing-gate` Edge Function hard-locking out paid tenants on invoice billing
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — diagnosed and fixed in a single session,
> starting from a live screenshot Brian shared of a consultant hitting the lockout screen

---

## Summary

A consultant (AJ, `aj@vivacity.com.au`) hit a genuine, live "Access Restricted" screen today trying
to open one of her 21 client tenants (Australian Institute of Accreditation Pty Ltd), despite that
tenant being paid through 1 October 2026. Root-caused by tracing the actual click path from her
browser console log (`[BillingGateGuard] Access denied: state=cancelled, reason=founders_cancelled`)
through `BillingGateGuard` → `useBillingGate` → the `billing-gate` Edge Function → the Postgres RPC
it called, `sec.tenant_access_state`.

The finding: **two separate, divergent "is this tenant allowed in" functions existed in the
database.** `get_access_gate` (checked first, correctly) has a `paid_through_date >= now()` guard
that grants access to invoice/manually-billed tenants ahead of `subscription_status`/
`billing_state`. `tenant_access_state` — the one the app actually called — had no concept of
`paid_through_date` at all, only looked at `subscription_status`/`billing_subscriptions.billing_state`,
and hard-blocked with `reason: founders_cancelled` for any `founders`-tier tenant whose
`subscription_status` wasn't `active`/`trialing`/`grace`/`payment_required` — which every
invoice-billed tenant's `subscription_status` (still `suspended`, never flipped) failed. A
blast-radius query found **5 tenants** in this exact state, not just the one Brian asked about.

Copilot's PR review caught a real regression in the first fix attempt before merge: `get_access_gate`
returns `allowed: false` for `past_due`/`payment_required` entitlement states, but the old
`tenant_access_state` allowed login (read-only) for the equivalent states — naively using
`get_access_gate`'s `allowed` field as the redirect condition would have newly locked out any tenant
in genuine payment-grace, a regression the original bug report never surfaced. Verified real (not a
false positive) against live data before fixing.

**Branch:** `fix/billing-gate-paid-through-date-blast-radius` (merged, 2 substantive commits + 1
merge-from-main) · **Merge commit:** `236de178435fedad30e55d2994b009c64aef8ef8` · **Migrations:** 1
(`DROP FUNCTION` only) · **Edge functions:** 1 (`billing-gate`) · **Frontend:** 1 file
(`src/integrations/supabase/types.ts`, generated-type cleanup only)

**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/807

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| `billing-gate` Edge Function | Paid `founders`-tier tenants on invoice billing got a live "Access Restricted" screen (`reason=founders_cancelled`) | Called `sec.tenant_access_state`, which never checked `tenants.paid_through_date`/`billing_source = 'invoice'` — only `subscription_status` (stuck on `suspended`, never updated when the invoice cover was applied) and `billing_subscriptions.billing_state` (deliberately `cancelled` as part of the same invoice-migration, since the Stripe subscription really was cancelled) |
| Blast radius (found via live query, not assumed) | 5 tenants, not 1, in the identical broken state | Australian Institute of Accreditation, Australian Ultimate Training College, Intercept Group, Precise Training, Start Training Group — all `founders` tier, all paid-through-date in the future, all hard-blocked |
| **(Copilot finding, HIGH — real, not hypothetical)** first fix attempt | `get_access_gate.allowed` used directly as the login/redirect condition | `get_access_gate`'s entitlements branch returns `allowed: false` for `past_due`/`grace` status (vs. the old function's `block_login: false` for the equivalent states) — checked live: 3 real tenants currently carry an entitlements row in that state, though none were actually exposed by the bug today (2 shielded by the `paid_through_date` guard firing first, 1 shielded by the edge function's own upstream diamond bypass) — still a genuine regression risk for the next tenant without that coincidental protection |
| **(Copilot finding, MEDIUM)** `types.ts` | Stale generated Supabase type still exposed `tenant_access_state` after the DB function was dropped | Hand-edited generated file not regenerated after the migration — confirmed via grep, single stale entry, removed |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `3b1516813` | Repointed `billing-gate/index.ts` from `tenant_access_state` to `get_access_gate`; added `DROP FUNCTION` migration for both `public.tenant_access_state(uuid)` and `sec.tenant_access_state(uuid)`, after confirming via `pg_get_functiondef`/`pg_policies`/edge-function grep that neither had any other caller. |
| (merge) | Merged `origin/main` (1 unrelated commit, PR #803 course-outline fix) — clean, no conflicts. |
| `12835574b` | Fixed both Copilot findings: added an explicit `SOFT_BLOCK_REASONS` allowlist (`past_due`, `payment_required`) so those tenants get read-only login instead of a hard redirect, matching the old function's contract; removed the stale `tenant_access_state` entry from `types.ts`. |
| `236de1784` (merge) | PR merged to `main`. |

---

## Fixes shipped

### Edge functions

**`billing-gate`** (`supabase/functions/billing-gate/index.ts`) — the RPC call driving the actual
login gate switched from `tenant_access_state` to `get_access_gate`. Response mapping preserves the
existing `{ allowed, access_state, reason, tenant_id, tier, redirect }` shape `BillingGateGuard`/
`BillingLockedScreen` already consume, so no frontend changes were needed beyond the type cleanup.
Added a `loginAllowed = state.allowed || SOFT_BLOCK_REASONS.has(state.reason)` step so `past_due`/
`payment_required` entitlement states resolve the same way the old function did (read-only login,
not a hard redirect to `/billing/subscribe`). All other logic in the function (super-admin bypass,
tenant resolution via body/header/`active_tenant_id`/`user_default_tenant` RPC, the edge function's
own diamond-tenant bypass, `user_last_tenant` upsert) is unchanged — this was a single-call swap plus
one soft-block allowlist, not a rewrite.

Auto-deployed on merge (this repo redeploys edge functions automatically, same as Vercel for the
frontend — no separate manual step). Verified via Supabase MCP `get_edge_function`: live source
matches the merged `main` file exactly, `updated_at` (2026-08-27 01:48:17 UTC) is ~30 seconds after
the merge commit's timestamp (01:47:34 UTC).

### Database

**New migration:** `20260827011219_drop_dead_tenant_access_state.sql` — `DROP FUNCTION IF EXISTS`
for both `public.tenant_access_state(uuid)` and `sec.tenant_access_state(uuid)`. No other object
depended on either (confirmed: zero other Postgres functions reference it in their body, zero RLS
policies reference it, zero other edge functions reference it — only `billing-gate` did, and that
call site is what this PR repointed).

Dry-run tested in a rolled-back transaction against production before merge (confirmed the drop
succeeds cleanly and `get_access_gate` still resolves correctly afterward). Applied for real
post-merge via `execute_sql` (per the interim procedure in `supabase/migrations/CLAUDE.md` —
`supabase db push` is not currently usable). Ledger repaired by Brian from terminal:
`supabase migration repair --status applied 20260827011219`. Post-repair ledger verified:
`version: 20260827011219, name: drop_dead_tenant_access_state` matches the git filename exactly.

**Live verification after apply:**
- `pg_proc` query confirmed zero rows for `proname = 'tenant_access_state'` in any schema.
- `get_access_gate('aca3d0ab-b1e7-4b70-9d27-f4b8efd5f46a')` re-run post-drop, still returns
  `allowed: true, reason: paid_invoice`.
- All 5 affected tenants re-queried directly against the live `get_access_gate` function: all return
  `allowed: true`.
- AJ's `tenant_members` row cross-checked for all 5 tenants: `status: active`, `role: Consultant` on
  every one — the other half of the actual login-gate condition (`isActiveMember` in the edge
  function), not just the billing side.

### Frontend

**`src/integrations/supabase/types.ts`** — removed the single stale
`tenant_access_state: { Args: { p_tenant_id: string }; Returns: Json }` entry (hand-edit, not a full
`generate_typescript_types` regen — minimum-scope for a small fix PR; confirmed via grep that this
was the only remaining reference anywhere in `types.ts` after the edit).

---

## Review rounds

1. **Manual root-cause trace** (this session, live-DB verified throughout) — started from a real
   browser console log and URL (`reason=founders_cancelled`), not a hypothesis; traced the full call
   path through 3 layers of React/hooks/edge-function/RPC before finding the actual divergent
   function. Blast radius (5 tenants, not 1) found via a direct query cross-referencing
   `paid_through_date` against `tenant_access_state`'s block result, before writing any fix.
2. **`/ci-gate`** — lint, migration guards, migration drift check (new version confirmed not already
   in the ledger), security guards (service-role-key usage confirmed pre-existing and allowlist-covered
   via the `billing-` prefix pattern), config.toml coverage, role-casing, status-enum checks — all
   clean. One pre-existing (not introduced by this PR) Deno type-check warning noted and confirmed
   identical on `origin/main` before this branch's changes.
3. **Copilot PR review** — 2 findings, both verified via `/verify-bot-fix` against live data/current
   HEAD before fixing (not just the bot's description taken at face value). Both CONFIRMED real, zero
   false positives: the `past_due`/`grace` allowed-vs-block_login contract mismatch, and the stale
   `types.ts` entry.

**Zero false positives across the Copilot review** — both findings verified real before fixing.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_Bg2sWATvedrEvw5xb4vDZnX1hD8n`, `state: READY`,
   `target: production`, commit `236de178435fedad30e55d2994b009c64aef8ef8` (exact merge commit),
   `githubCommitVerification: verified`.
2. **Edge functions** — `billing-gate` auto-deployed on merge, confirmed live source matches git,
   deployed ~30 seconds after the merge commit.
3. **Migrations** — `20260827011219` applied via `execute_sql` + `migration repair`; ledger verified
   post-repair (`version`/`name` match the git filename exactly).
4. **Worktrees** — worktree A released in `active-work.md`, reset to `standby/worktree-a` @
   `236de1784` (matches `main`; `main` itself is checked out in worktree C, so the standby-branch
   teardown path was used per the two-worktrees procedure).

---

## Manual QA checklist (post-merge — Brian-gated)

- [x] Live-queried `get_access_gate` directly for all 5 affected tenants post-deploy — all return
  `allowed: true`.
- [x] Confirmed AJ's `tenant_members` status is `active` on all 5 tenants (the other half of the
  actual login gate, not just billing).
- [ ] AJ has not yet been asked to actually click through and confirm in the live app — the DB-level
  check confirms the gate itself is fixed, but an end-to-end click-through by the actual affected
  user hasn't happened as of this audit.

---

## Still open / follow-up

- **`billing.md`-style reference doc for `complyhub-kb/reference/`** — Brian raised this as a good
  idea in the same session: document `get_access_gate` as the single source of truth for tenant
  access, its check-order (`paid_through_date` guard first, then diamond/founders overrides, then
  entitlements, then legacy trial fallback), the soft-block reason list, and an explicit note that
  `tenant_access_state` was retired specifically so nobody re-introduces a second gate function later.
  Not yet written as of this audit.
- **`useAccessGate.ts` / `useBillingGate.ts` duplication** — not addressed in this PR. Two separate
  React hooks call two different things (`useAccessGate` calls `get_access_gate` directly via
  `supabase.rpc`; `useBillingGate` goes through the `billing-gate` Edge Function, which now also
  calls `get_access_gate`). Not a bug today (both converge on the same underlying RPC now), but worth
  a FRAME at some point to check whether both hooks are still independently necessary, or whether one
  could be retired now that they share a source of truth.
- **`past_due`/`payment_required` soft-block list is a hand-maintained allowlist** in the edge
  function, not derived from `get_access_gate` itself. If `get_access_gate`'s reason vocabulary
  changes in a future migration, this allowlist won't automatically track it — worth a comment/test
  tying the two together if `get_access_gate` is touched again.

---

## Soak status

No feature flag — this is a straight bug fix to an existing, already-live gating path, not a new
rollout. Risk is low: the change only affects tenants that were previously being hard-blocked
(strictly expands access for correctly-paid tenants) or genuinely in payment arrears (unchanged
behaviour, still blocked). Watch for any support ticket reporting a *new* unexpected lockout in the
days after this merge — would indicate a `get_access_gate` reason value not covered by the
`SOFT_BLOCK_REASONS` allowlist that `tenant_access_state` used to handle differently.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/807
- Merge commit: `236de178435fedad30e55d2994b009c64aef8ef8`
- Migration: `supabase/migrations/20260827011219_drop_dead_tenant_access_state.sql`
- Edge function: `supabase/functions/billing-gate/index.ts`
- Vercel production deployment: `dpl_Bg2sWATvedrEvw5xb4vDZnX1hD8n`
- Active work ledger: `active-work.md` (worktree A row — released)
