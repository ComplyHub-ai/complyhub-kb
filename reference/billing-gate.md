# Tenant access gating — how "is this tenant allowed in" actually works

> Written 27 Aug 2026, after PR #807 fixed a live lockout bug caused by two divergent
> implementations of this check existing at once. Full incident detail:
> `complyhub-kb/audit/2026-08-27_pr807_billing-gate-paid-through-date-lockout.md`.

## Single source of truth: `public.get_access_gate(p_tenant_id uuid)`

This is the **only** function that should ever decide whether a tenant can log in. It's called two
ways in the app:

- Directly via `supabase.rpc('get_access_gate', ...)` from `src/hooks/useAccessGate.ts`.
- Indirectly via the `billing-gate` Edge Function (`supabase/functions/billing-gate/index.ts`),
  which `src/hooks/useBillingGate.ts` → `src/guards/BillingGateGuard.tsx` call to decide whether to
  redirect to `/billing/locked`.

**Do not write a second gate function.** That's exactly how the PR #807 bug happened —
`sec.tenant_access_state` was a second, independent implementation that the `billing-gate` Edge
Function called instead of `get_access_gate`, and it never learned about the `paid_through_date`
guard added to the canonical function. It was retired (dropped) in PR #807 for this reason. If a new
billing/access concept needs to affect login, add it to `get_access_gate`, not a new function.

## Check order inside `get_access_gate`

Roughly in priority order (see the live function via `pg_get_functiondef` for the exact current
SQL — this is a summary, not a copy):

1. **`paid_through_date >= now()` guard** — if the tenant has a future `paid_through_date` on
   `public.tenants`, access is granted immediately (`reason: paid_invoice`), regardless of what
   `subscription_status` or `billing_subscriptions.billing_state` say. This is how invoice/manual
   billing tenants are covered — their Stripe subscription may show `cancelled` (because it
   genuinely was, as part of migrating them to invoice billing), but `paid_through_date` is the
   real signal for those tenants.
2. **Diamond/manual override** — `tenant_plans.tier = 'diamond' AND billing_provider = 'manual'`.
3. **Founders tier bypass** — only when `requires_payment_method = false`; otherwise falls through
   to entitlements so payment can actually be enforced for founders tenants that need it.
4. **Trial safety net** — unexpired `subscription_status = 'trialing'` always grants access.
5. **Hard block for `billing_subscriptions.billing_state IN ('cancelled', 'trial_expired')` with no
   Stripe subscription attached** — unless `billing_source = 'invoice'` with a `paid_through_date`
   set, in which case it's an `invoice_grace` allow (write-locked).
6. **`billing.entitlements` table check** — `active`, `payment_required`, `past_due`/`grace`,
   `canceled`/`cancelled` branches.
7. **Legacy trial fallback** on `tenants.subscription_status`/`trial_expires_at`/`trial_consumed`.

## Soft-block reasons — "let them log in, just read-only"

`get_access_gate` returns `allowed: false` for `past_due` and `payment_required` entitlement
states — but the intent (matching the old `tenant_access_state` contract) is that these tenants
should still be able to log in and see their data read-only, not get bounced to the paywall screen
entirely. The `billing-gate` Edge Function handles this with an explicit allowlist:

```ts
const SOFT_BLOCK_REASONS = new Set(['past_due', 'payment_required']);
const loginAllowed = state.allowed || SOFT_BLOCK_REASONS.has(state.reason);
```

**This allowlist is hand-maintained, not derived from `get_access_gate` itself.** If
`get_access_gate`'s reason vocabulary changes (a new entitlement state, a renamed reason string),
this list won't automatically track it. Check `billing-gate/index.ts` when touching
`get_access_gate`'s reason strings.

## Known duplication not yet resolved

`useAccessGate.ts` (direct RPC call) and `useBillingGate.ts` (via the Edge Function, which now also
calls `get_access_gate`) are two separate React hooks that both ultimately resolve to the same
underlying function today, but through different paths. Not a bug — both converge on the same
source of truth — but worth a FRAME at some point to check whether both are still independently
necessary, or one could be retired now that they agree.

## Where the tenants really stand — checking a specific tenant

```sql
select public.get_access_gate('<tenant-uuid>'::uuid);
```

This is the ground truth. Don't infer access from `tenants.subscription_status` or
`billing_subscriptions.billing_state` alone — either can be stale/misleading on its own (that's
exactly what caused the PR #807 incident). Always check what the function itself returns.
