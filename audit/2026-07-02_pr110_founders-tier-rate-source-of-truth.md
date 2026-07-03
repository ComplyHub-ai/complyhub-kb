# Audit — PR #110: Standard Tier Rate Reading From Wrong Table (Founders Tenant Overcharged Display)

**Date:** 02 July 2026
**Branch:** `fix/subscription-rate-source-of-truth`
**PR:** #110
**Merged by:** Brian (Khian)
**Merge commit:** `5d70cfef4`
**Reported by:** Dave (DB lead) — "Where does this price come from? It doesn't relate to the `dd_subscription_tiers` table. It needs to be that price."

---

## What was fixed

The "Standard Tier Rate" field on the SuperAdmin "Edit Subscription Details" screen (`src/pages/superadmin/ManageSubscription.tsx`) was displaying $375/month for the Founders tier instead of the correct $275/month.

- Root cause: the field was wired to `billing.plan_prices` (a Stripe-linked pricing table) via the `sa_list_plan_prices()` RPC, not to `dd_subscription_tiers` — which Dave confirmed is the correct source of truth for this screen.
- `billing.plan_prices` had a stale row for `plan_code = 'founders'`, `billing_interval = 'month'` showing `amount_total = 375.00`, created 28 Apr 2026 — the newest and only outlier among all pricing tables checked.
- Fix: added `src/hooks/useSubscriptionTierPrices.ts`, a hook that reads `monthly_price_ex_gst` / `annual_price_ex_gst` directly from `dd_subscription_tiers`. Repointed both the "Standard Tier Rate" field and the "Effective Rate" field (used when a discount is applied) in `ManageSubscription.tsx` to use it. Removed the now-unused `planPricesQ` query and its `sa_list_plan_prices()` RPC call.
- Confirmed via RLS check that `dd_subscription_tiers` is readable by any authenticated user (`SELECT` policy, `roles: {authenticated}`, `qual: true`), so the client-side fetch is safe on this SuperAdmin-only page.

## Production data fix (separate from the code change)

Corrected the stale row directly in production:

```sql
UPDATE billing.plan_prices
SET amount_total = 275.00
WHERE plan_code = 'founders' AND billing_interval = 'month';
```

Before running this, verified blast radius across the whole codebase (209 edge functions + all frontend usages):

- The actual Stripe checkout path (`stripe-create-checkout-session` → `get_billing_plan_by_code()`) resolves its price from **`billing.plans`**, a different table, which already had the correct $275 and was never affected by the bug.
- `billing.plan_prices` is read by `sa_list_plan_prices()`, which feeds two admin-driven RPCs (`change-plan`, `superadmin-billing`'s `update_plan`) that only write to `billing.entitlements` — an internal record, not a Stripe charge.
- `get_billing_plan_by_price_id()` (used by `stripe-webhook`) also reads `billing.plan_prices` to reverse-map a Stripe `price_id` to a plan for webhook record-keeping — again, does not affect what Stripe actually charges.
- All 9 active Founders subscriptions in `billing.subscriptions` are `amount_total = 0` / `provider_price_id = null` (comped, never actually billed), so the stale value had not caused any real customer to be overcharged.
- Confirmed the Stripe `stripe_price_id` on the corrected row (`price_1T1jMP7HHmD3RSL1SUXLHmpT`) was left untouched — no Stripe-side change was made. **Note:** we did not independently verify Stripe's own Price object configuration (no Stripe MCP access available) — only that our database's record of it (`billing.plans`) already agreed with the corrected value.

## Open issue — flagged to Dave, not yet resolved

While verifying $275 against other tables, found the Founders monthly rate disagrees in two further places, neither touched by this PR:

| Table | Founders monthly | Notes |
|---|---|---|
| `subscription_tier_definitions` | **$250** | Created at the *identical timestamp* as `dd_subscription_tiers` (22 Dec 2025, same seed script) — the two were seeded with different values from day one, not drift over time. Neither has been updated since (`updated_at = created_at` on both). |
| `billing_plan_limits` | **$250** | Earliest record found (12 Dec 2025), predates the above. |
| `dd_subscription_tiers` (used for this fix) | $275 | Confirmed by Dave as correct; independently corroborated by `billing.plans` ($275, the table that actually drives live checkouts). |

Additionally, `src/constants/subscriptionTiers.ts` (line 4) contains a code comment explicitly stating `subscription_tier_definitions` — not `dd_subscription_tiers` — is "the SINGLE SOURCE OF TRUTH." This directly contradicts the direction taken in this fix.

**Decision:** proceeded with Dave's instruction to treat `dd_subscription_tiers` as authoritative for this fix. The $250-vs-$275 contradiction across `subscription_tier_definitions`/`billing_plan_limits` was not resolved and needs a definitive call from Dave on which table is canonical going forward, so the other two (and the stale code comment) can be corrected or deprecated.

---

## Files changed

| Area | File |
|---|---|
| New hook — reads tier prices from `dd_subscription_tiers` | `src/hooks/useSubscriptionTierPrices.ts` |
| Edit Subscription Details — Standard Tier Rate + Effective Rate fields repointed | `src/pages/superadmin/ManageSubscription.tsx` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Which table is the rate field's source of truth | `dd_subscription_tiers`, per Dave's explicit instruction. Independently corroborated by `billing.plans` (drives real Stripe checkouts). |
| Whether to fix `billing.plan_prices` data as well as the UI | Yes — corrected the stale $375 row to $275 in production, confirmed safe (display/record-keeping only, not the live charge path). |
| Whether to resolve the wider $250-vs-$275 contradiction now | No — flagged to Dave for a definitive ruling; out of scope for this fix. |

## Notes

- No migration required — the code change is frontend-only; the data correction was a direct `UPDATE`, not a schema change.
- No Stripe-side change was made or verified independently; only our database's record of the Stripe price was corrected.
- Vercel production deploy for merge commit `5d70cfef4` confirmed via `list_deployments`.
