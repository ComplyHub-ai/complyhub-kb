# Audit — PR #403: Referral Commission Automation (10 August 2026)

**Date:** 10 August 2026
**Branch:** `feat/referral-commission-automation`
**PR:** [#403](https://github.com/ComplyHub-ai/rto-compass-hub/pull/403)
**Merge commit:** `66c53aee0568f57c5e83c305bed2f2ee56a76b3b`
**Purpose:** Phase 4 — the final phase — of the referral-attribution fix (Phase 1: PR #398, Phase 2: PR #399, Phase 3: PR #401). Commission must stay at zero for a referred tenant on trial and only start accruing once they actually subscribe and pay.

---

## What was implemented

- New RPC `record_referral_commission_for_invoice(p_tenant_id, p_gross_revenue_aud, p_billing_period_start, p_billing_period_end, p_stripe_invoice_ref)`: resolves the referring consulting org via `tenants.parent_consultant_org_id` (set at signup in Phase 3) joined to `consultant_affiliates` for the active commission rate; no-ops (`attributed: false`) if the tenant was never referred or the affiliate isn't active. Inserts a `'pending'` `consultant_commission_ledger` row — a human still confirms/marks paid, no auto-payment. Idempotent against webhook retries via the table's pre-existing `uq_ledger_period` unique constraint (`affiliate_id, client_tenant_id, billing_period_start`) via `ON CONFLICT DO NOTHING`, on top of `stripe-webhook`'s own event-level dedup (`check_webhook_event_exists`). Wrapped in its own exception handler.
- `stripe-webhook`'s `handleInvoicePaid` calls this RPC immediately after the existing `create_paid_invoice` call, in its own isolated `try/catch` — a failure here can never affect real billing/invoice processing, matching the same defensive pattern used for the Phase 3 signup-attribution logic.
- Reused `exGst` — a figure `handleInvoicePaid` already computes (10% GST division, falling back to `invoice.tax` when Stripe supplies it) for ComplyHub's own `billing_charges` ledger — as the commission base, matching the affiliate dashboard's existing "Commission amounts are in AUD ex-GST" convention. No new GST logic invented. Reused `mapped.currentPeriodStart`/`currentPeriodEnd` (already resolved for the subscription by `mapSubscription`) as the ledger's billing period.

## Blast radius

One new RPC (net new, no existing callers to break) + a small, purely additive block inside `stripe-webhook`'s `handleInvoicePaid`, appended after all existing logic in that branch, with its own exception isolation. No change to any existing statement, no change to `insert_billing_charge`/`create_paid_invoice`/`upsertAndRecompute` logic.

## Dave standard / DB impact

New RPC only, no schema change — `consultant_commission_ledger` and its `uq_ledger_period` unique constraint already existed from the original affiliate-portal build (8 Jul 2026). RJ owned the migration directly, consistent with owning this initiative end-to-end.

## Research findings worth keeping

- `consultant_commission_ledger` columns: `affiliate_id`, `client_tenant_id` (not `tenant_id`), `billing_period_start`/`billing_period_end` (`date`), `gross_revenue_aud`, `commission_pct`, `commission_aud`, `status` (`pending`/`confirmed`/`paid`/`void`), `stripe_invoice_ref`. Unique constraint `uq_ledger_period (affiliate_id, client_tenant_id, billing_period_start)` already existed — no new migration needed for idempotency.
- `consultant_affiliates.commission_rate_pct` is the live commission-rate column (not `commission_rate` — that name only exists in a summary RPC's return shape).
- `stripe-webhook/index.ts` (660 lines) is this repo's stated gold-standard billing edge function. `handleInvoicePaid` (line ~515) already computes `exGst` for ComplyHub's own revenue ledger and resolves `tenantId` via `resolveTenantId()` (Stripe customer/subscription metadata → `tenants.stripe_customer_id` fallback) — both were reused as-is rather than re-derived.

## CI note

None — no new failures this phase. `stripe-webhook` was already on the service-role-key allowlist from a prior PR (#225 backport), so the guard fixed in PR #401 didn't need to be touched again here.

## Production apply

Applied via Supabase MCP `execute_sql` against project `gdwhlstfguxarnxasrrs` post-merge. Verified via `pg_get_functiondef` that the live function matches the merged migration byte-for-byte.

**Open item:** RJ still needs to run `supabase migration repair --status applied 20260810031239` — not yet confirmed done as of this entry.

**Live end-to-end payment test:** deliberately skipped, not overlooked. RJ decided (10 Aug 2026) that the byte-for-byte function verification above is sufficient confidence. There was no real referred tenant yet to test against (Phase 3's live signup check was also skipped), and no Stripe CLI/webhook-trigger access was available to simulate one safely — the only live-adjacent option would have been calling the RPC directly with synthetic parameters, inserting a fake ledger row with no corresponding real payment. If commission accrual is ever suspected of misbehaving, a real `invoice.paid` event against a referred, paying tenant is the first thing to check.

## Referral-attribution initiative — overall status

All four phases now shipped and verified in production:
- **Phase 1** (#398): referral links point at `/trial-signup`, not `/signup`.
- **Phase 2** (#399): visiting a valid `?ref=` link always increments the click KPI.
- **Phase 3** (#401): a completed referred signup attributes the tenant and auto-grants the whole consulting org access.
- **Phase 4** (#403): commission accrues only on actual paid invoices, ex-GST, pending human confirmation.

Two real end-to-end checks (a live trial signup through a `?ref=` link, and a live paid invoice from a referred tenant) were considered and deliberately skipped by RJ on 10 Aug 2026 — schema/function-level verification was judged sufficient given the side effects either check would have caused. Initiative considered closed as of this decision.

## Files changed

`supabase/functions/stripe-webhook/index.ts`, `supabase/migrations/20260810031239_add_record_referral_commission_for_invoice_rpc.sql` (new).
