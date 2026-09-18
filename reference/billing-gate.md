> **Last updated:** 18 Sep 2026 · **Reconsider by:** 18 Dec 2026 · **Confidence:** high — every function body below pulled live via `pg_get_functiondef` on 18 Sep 2026, not copied from a prior doc or an audit-entry summary.

# Tenant access gating — how "is this tenant allowed in" actually works

> Original version written 27 Aug 2026 after PR #807. Rewritten 18 Sep 2026 after confirming
> the picture had changed materially since then — PR #1077 (9 Sep) introduced the `send_invoice`
> delegation described below, and the previous version only documented one function
> (`get_access_gate`) when the real system is three, each with a distinct job.

## Three functions, not one — know which one you're looking at

| Function | Job | Called by |
|---|---|---|
| `public.get_access_gate(p_tenant_id)` | **Login gate** — can this user get into the app at all | `src/hooks/useAccessGate.ts` (direct RPC); `billing-gate` Edge Function → `src/hooks/useBillingGate.ts` |
| `sec.evaluate_billing_access(p_tenant_id)` | **Billing-state evaluator** — the richer state machine `get_access_gate` now delegates to for `send_invoice` tenants specifically | `get_access_gate` (delegation); `sec.is_tenant_write_locked` (delegation) |
| `sec.is_tenant_write_locked(p_tenant_id)` | **RLS write-lock check** — a separate concern from login: can this tenant write data, independent of whether they can log in | RLS policies directly (not the login path) |

**Do not write a second gate/evaluator function.** This is exactly how the PR #807 bug happened —
a second independent implementation (`sec.tenant_access_state`, since dropped — confirmed absent
from the live schema as of this rewrite) diverged from the canonical logic. If a new billing/access
concept needs to affect login or writes, it goes into one of the three functions above, not a new one.

## `get_access_gate` — the login-gate check order

Confirmed live, in order:

0. **No tenant context** (`p_tenant_id IS NULL`) → deny (`no_tenant_context`). This covers
   consultant/affiliate identities inspecting their own account outside any tenant.
0. **Membership guard (added since the original version of this doc)** — the caller must be an
   active `tenant_members` row for this tenant, OR `sec.is_service_role()`, OR a `super_admin`/
   internal-staff-with-`global_role` profile. Fails closed: `tenant_access_denied` if none match.
0. **`send_invoice` full delegation** — if this tenant's `billing_subscriptions.collection_method`
   is `send_invoice`, `get_access_gate` calls `sec.evaluate_billing_access` and returns its result
   **directly**, skipping every step below entirely. This is the single most important thing this
   doc got wrong before this rewrite — `send_invoice` tenants are not evaluated by this function's
   own priority order at all.
1. **`paid_through_date >= now()`** → allow (`paid_invoice`), for the remaining (non-`send_invoice`) tenants.
2. **Diamond/manual override** — `tenant_plans.tier = 'diamond' AND billing_provider = 'manual'`.
3. **Founders tier** — richer than previously documented: `lifecycle_status = 'subscriber_active'`
   with no payment method required allows; otherwise branches on `subscription_status`
   (`active`/`trialing` → allow, `payment_required` → allow but `write_locked: true`,
   `canceled`/`cancelled` → deny as `suspended`).
4. **Trial safety net** — unexpired `subscription_status = 'trialing'`.
5. **Hard block** — `billing_subscriptions.billing_state IN ('cancelled','trial_expired')` with no
   Stripe subscription attached, unless `billing_source = 'invoice'` with a `paid_through_date` set
   (→ `invoice_grace`, write-locked).
6. **`billing.entitlements` check** — `active`/`payment_required`/`past_due`/`grace`/`canceled` branches.
7. **Legacy trial fallback** on `tenants.subscription_status`/`trial_expires_at`/`trial_consumed`.

## `sec.evaluate_billing_access` — its own priority order

Not a helper — a standalone evaluator with its own `access_state` vocabulary
(`active`/`locked`/`trial_active`/`cancelled`/`unpaid_invoice`/`not_configured`/...), confirmed live:

1. No tenant → `not_configured` / `no_tenant_context`.
2. Diamond (`tier = 'diamond'` OR `tenants.is_diamond`) → always allowed, `diamond_bypass`.
3. Plan/tenant explicitly `cancelled`/`archived` → hard deny, `tenant_cancelled`/`tenant_locked`.
4. **`send_invoice` branch** — invoice coverage is the source of truth regardless of the underlying
   Stripe subscription status: a future `paid_through_date` allows even if the Stripe subscription
   row itself is cancelled (deliberate — covers Founders-tier tenants with no live Stripe
   subscription at all). Falls through to `latest_invoice_status`/effective Stripe status otherwise.
5. Generic `paid_through_date >= now()` → allow, `paid_invoice`.
6. Approved trial (`trialing` + unexpired, or `billing_state = 'trial_active'`) → allow.
7. Has a `billing_subscriptions` row → branch on effective status (`past_due`/`unpaid`/`cancelled`/
   etc. → deny; `active` → allow; anything else → deny as `unknown_billing_state`).
8. No row at all → deny, `no_billing_record`.

## `sec.is_tenant_write_locked` — separate from login, checked by RLS directly

Confirmed live. Priority order: diamond (manual) → never locked; `send_invoice` tenant → delegates
to `evaluate_billing_access`'s `allowed` flag; invoice-paid with future `paid_through_date` → never
locked; grace period open (either `billing.entitlements.status = 'grace'` or the legacy
`tenants.subscription_status = 'grace'` path) → not locked; otherwise falls back to the raw
`tenants.write_locked` flag. **This function was not documented at all in the previous version of
this doc** — it's what RLS policies actually call, independent of whether `get_access_gate` would
let the same user log in.

## Soft-block reasons — "let them log in, just read-only" (re-verified, unchanged)

`billing-gate/index.ts` still hand-maintains this allowlist against `get_access_gate`'s reason
vocabulary — confirmed live 18 Sep 2026, unchanged from the original version of this doc:

```ts
const SOFT_BLOCK_REASONS = new Set(['past_due', 'payment_required']);
const loginAllowed = state.allowed || SOFT_BLOCK_REASONS.has(state.reason);
```

Still hand-maintained, not derived from `get_access_gate` itself — check `billing-gate/index.ts`
whenever `get_access_gate`'s reason strings change.

## Client-side paths — corrected, these are not just "two paths to the same result"

- **`useAccessGate.ts`** — calls `get_access_gate` RPC directly, no wrapper logic.
- **`useBillingGate.ts`** — calls the `billing-gate` Edge Function, and layers real client-side
  behavior on top that the previous version of this doc didn't mention: **SuperAdmins bypass the
  check entirely** (never call the gate), and on a **transport/gate error the hook fails open**
  (`allowed: true`) — a deliberate choice so a `billing-gate` outage can't lock out healthy
  (diamond/founders/paid) tenants. An explicit `block_login` in a successful response still denies.

These are genuinely different behaviors, not one duplicated implementation — worth knowing if
debugging "user X can/can't log in" depends on which of the two paths the surface in question uses.

## Where the tenants really stand — checking a specific tenant

```sql
select public.get_access_gate('<tenant-uuid>'::uuid);        -- login gate
select sec.evaluate_billing_access('<tenant-uuid>'::uuid);    -- billing-state detail, esp. send_invoice
select sec.is_tenant_write_locked('<tenant-uuid>'::uuid);     -- RLS write-lock, separate question
```

Ground truth is whichever of the three actually governs the surface being diagnosed — don't infer
from `tenants.subscription_status`/`billing_subscriptions.billing_state` alone, and don't assume
the login answer and the write-lock answer are the same question.

## Recent history — see also

Extensive billing work landed between this doc's original version and this rewrite — PRs #1077,
#1078–1081, #1083, #1088, #1142, #1146, #1149, #1193. `sec.tenant_access_state` (the PR #807
duplicate) is confirmed dropped from the live schema. See `complyhub-kb/audit/` for the individual
PR write-ups if tracing a specific historical change.
