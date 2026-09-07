# Audit — PR #797

> **Date:** 26 August 2026 (audit written); **Merged:** 26 August 2026 05:06 UTC
> **Scope:** `sync_billing_subscription_from_stripe` / Stripe webhook billing sync — out-of-order
> event ordering, atomicity, and error propagation
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — this was a single, contained bug
> investigation and fix worked entirely inline in one session (worktree C)

---

## Summary

Investigation started from a live incident: Erin Jobson (Administrator, Australian Institute of
Accreditation) was blocked by the "Access Restricted / billing status requires attention" screen
despite the tenant's Stripe subscription being genuinely active through 1 October 2026. Root cause:
`sync_billing_subscription_from_stripe` blindly overwrote `billing_subscriptions.status`/
`billing_state` on every Stripe webhook call, with no check that the incoming event was actually
newer than what was already stored. Stripe does not guarantee webhook delivery order, so a stale
`customer.subscription.deleted`/`updated` event arriving late clobbered a newer, correct "active"
state — confirmed live via `sec.tenant_access_state()` returning `block_login: true,
reason: 'founders_cancelled'` for a tenant whose Stripe subscription (`sub_1TqOfR7HHmD3RSL1kHrKwAnU`)
had `cancel_at_period_end: false` and `next_billing_at: 2026-10-01`.

The fix itself went through **three adversarial review rounds** before merge — first a
`pr-review-toolkit:code-reviewer` fresh-eyes pass against the live database (8 confirmed bugs in the
first draft: non-atomic guard, wrong same-second comparison, no backfill, only 1 of 3 writes guarded,
non-re-runnable migration), then two rounds of Copilot PR review on GitHub (5 more confirmed bugs:
NULL-watermark clobber on manual calls, non-atomic three-RPC-call design, swallowed watermark-query
error, bare `CREATE FUNCTION` breaking re-run safety, and a genuine billing-sync failure silently
swallowed by two handler-level `try/catch` blocks). Every finding across all three rounds was real —
zero false positives — and every one was fixed and re-verified live before the next round.

**Branch:** `fix/stripe-webhook-event-ordering` (merged; remote likely still exists) · **Merge
commit:** `32a7f622d` · **Migrations:** 1 · **Edge functions:** 1 (`stripe-webhook`)

**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/797

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| `sync_billing_subscription_from_stripe` RPC | AIA tenant locked out despite active subscription | No check that an incoming webhook event was newer than stored state — last-write-wins regardless of arrival order |
| **(fresh-eyes finding)** Ordering guard v1 | Legitimate same-second events (e.g. `invoice.paid` right after `checkout.session.completed`) silently dropped | `<=` comparison rejected same-timestamp events; Stripe's `event.created` is second-precision, not millisecond |
| **(fresh-eyes finding)** Ordering guard v1 | Guard not race-safe | Separate `SELECT` then `INSERT` — two concurrent deliveries could both pass the check before either wrote |
| **(fresh-eyes finding)** Ordering guard v1 | Same incident could recur once per tenant post-deploy | No backfill — every existing row's watermark started `NULL`, so the first event after deploy (however stale) applied unconditionally |
| **(fresh-eyes finding)** `upsertAndRecompute` v1 | Only the last of 3 writes was guarded | `upsert_provider_subscription` and `recompute_entitlement_for_tenant` ran unconditionally before the guarded `billing_subscriptions` write — a stale event could leave login correct but plan/entitlement data wrong |
| **(fresh-eyes finding)** Migration v1 | Second apply would hard-fail | `DROP FUNCTION IF EXISTS` only targeted the 9-arg signature; new 11-arg version used bare `CREATE FUNCTION` |
| **(Copilot finding, round 2)** TS pre-check v2 | Not actually race-safe | Lock/check performed in a separate PostgREST transaction from the writes it was meant to protect — three separate `admin.rpc()` calls, three separate transactions |
| **(Copilot finding, round 2)** TS pre-check v2 | Fail-open on transport error | Watermark `SELECT` discarded its `error`; a query failure was treated as "no watermark, proceed" |
| **(Copilot finding, round 3)** `sync_billing_subscription_from_stripe` v3 | Manual/legacy service-role call with no event timestamp cleared the watermark | `SET last_synced_event_created_at = EXCLUDED.last_synced_event_created_at` unconditionally wrote `NULL`, disabling ordering protection for that tenant going forward |
| **(Copilot finding, round 3)** `sync_stripe_billing_event` v3 | Second migration apply would fail | New orchestrator function used bare `CREATE FUNCTION` with nothing dropping it first |
| **(Copilot finding, round 3)** `handleInvoicePaid` / `handleInvoicePaymentFailed` | A failed billing write was recorded as a successfully processed webhook | Both handlers wrap the sync call in a broad `try/catch` intentionally non-fatal for other things (Stripe fetch errors, referral commission) — the same catch silently swallowed genuine sync failures too |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `36b300a96` | Initial fix — `last_synced_event_created_at`/`last_synced_event_id` watermark, atomic `WHERE`-guarded upsert, `event.created`/`event.id` threaded through all 5 billing-affecting webhook handlers. |
| `91d4879e3` | Round 2 (fresh-eyes findings) — collapsed 3 separate RPC calls into one atomic `sync_stripe_billing_event` RPC under a tenant-scoped `pg_advisory_xact_lock`; deleted the non-race-safe TS-side pre-check entirely. |
| `7ee5d7db7` | Round 3 (Copilot findings) — `COALESCE`/`CASE` to preserve watermark on NULL-timestamp calls; `CREATE OR REPLACE` for re-run safety; `BillingSyncFailure` error class so genuine sync failures escape handler-level `try/catch` and reach the dispatcher. |
| `0181bdc86` | Merge `main` into branch (unrelated QI campaign security hardening, PR #796 — no file overlap). |

---

## Fixes shipped

### Database

**Migration:** `supabase/migrations/20260826120000_guard_billing_subscription_sync_event_order.sql`
(269 lines, 1 file, new)

- `billing_subscriptions` gains `last_synced_event_created_at timestamptz` and
  `last_synced_event_id text`, backfilled from `updated_at` for existing rows.
- `sync_billing_subscription_from_stripe` (11-arg version) — atomic ordering guard as an `ON
  CONFLICT DO UPDATE ... WHERE` clause (not a separate check-then-write): only applies when there's
  no incoming timestamp, no existing watermark, or the incoming event is not *strictly older* than
  the stored one. `COALESCE`/`CASE` preserve the watermark pair when a caller omits the timestamp
  (manual/legacy service-role calls).
- New `sync_stripe_billing_event` (20-arg, `CREATE OR REPLACE`) — single-transaction orchestrator.
  Takes `pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0))`, checks the watermark, and
  only if not stale, performs all three writes (`upsert_provider_subscription`,
  `recompute_entitlement_for_tenant`, `sync_billing_subscription_from_stripe`) inside that lock.
  Returns `{"applied": true}` or `{"applied": false, "reason": "stale_event"}`.

**Applied to production** 26 Aug 2026 via the interim procedure (`supabase/migrations/CLAUDE.md`):
exact merged SQL run via Supabase MCP `execute_sql`, followed by
`supabase migration repair --status applied 20260826120000` (Brian, from terminal). Ledger verified
post-repair: `version=20260826120000, name=guard_billing_subscription_sync_event_order` matches the
git filename exactly.

**Live verification after apply:** both new columns present on `billing_subscriptions`;
`sync_billing_subscription_from_stripe` (11 args) and `sync_stripe_billing_event` (20 args) both
present with correct signatures; `sec.tenant_access_state()` for AIA returns
`{"access_state": "active", "block_login": false}`.

### Edge functions

**`stripe-webhook`** (`supabase/functions/stripe-webhook/index.ts`, 52+/35− lines) — `upsertAndRecompute`
rewritten to make one `sync_stripe_billing_event` RPC call instead of three separate ones; new
`BillingSyncFailure` error class thrown on a genuine sync RPC failure; `handleInvoicePaid` and
`handleInvoicePaymentFailed` re-throw `BillingSyncFailure` past their own non-fatal `try/catch`
instead of swallowing it. All 5 billing-affecting handlers (`handleCheckoutCompleted`,
`handleSubscriptionChange`, `handleSubscriptionDeleted`, `handleInvoicePaid`,
`handleInvoicePaymentFailed`) forward `event.created`/`event.id`.

Deployed automatically on merge to `main` (config.toml already had a `[functions.stripe-webhook]`
entry — no new coverage needed). Verified via Supabase MCP `get_edge_function('stripe-webhook')`:
live deployed source (v1238) matches the merged `main` source exactly, including the round-3
`BillingSyncFailure` class and re-throw guards.

### Tests

`tests/supabase/stripe-webhook-billing-sync-event-order.test.ts` (new, 261 lines, 26 assertions by
final round) — this repo has no live-DB migration test harness (confirmed precedent:
`tests/supabase/critical-security-fixes.test.ts` uses the same approach), so this follows established
convention: static regex/string assertions against the migration SQL and webhook TS source, covering
the atomic `WHERE` guard, the advisory lock ordering, the NULL-watermark preservation, `CREATE OR
REPLACE` re-run safety, and `BillingSyncFailure` propagation through both handlers.

---

## Review rounds

1. **Fresh-eyes adversarial review** (`pr-review-toolkit:code-reviewer`, mid-session, pre-PR) —
   against the live database. 8 confirmed bugs in the first draft (listed above); all fixed and
   re-verified live before the PR was opened.
2. **`ci-gate`** (pre-push, mechanical) — lint clean, migration guards clean (filename format, no
   new table/tenant_id column, `SECURITY DEFINER` has `search_path`), no hardcoded project id/exposed
   service-role key, config.toml coverage present, no role-casing/status-enum surface touched. One
   flag: 233 pre-existing orphaned production migration versions from May 2026 (documented,
   unrelated ~2,000-row Lovable-era backlog per `supabase/migrations/CLAUDE.md`) — not caused by and
   not resolved by this PR.
3. **Copilot PR review, round 2** (post-push) — 2 confirmed findings (non-atomic three-RPC design,
   fail-open watermark query error). Both fixed in `91d4879e3`.
4. **Copilot PR review, round 3** (post-push) — 3 confirmed findings (NULL-watermark clobber, bare
   `CREATE FUNCTION` re-run failure, swallowed sync failure in two handlers). All fixed in `7ee5d7db7`.
5. **CI on GitHub** — Lint, Type check, `.single()` guard, Migration guards, Security checks,
   config.toml coverage, Edge Functions type check, Migration drift check all passed. Vercel Preview
   + Vercel Agent Review passed.

**Zero false positives across all three adversarial passes** — every finding raised was real and
fixed. Full verification method throughout: the actual migration SQL was run for real against
**live production** inside `BEGIN...ROLLBACK` transactions after every round (never committed until
final apply), proving each fix's exact behavior — stale-rejected, same-second-accepted,
genuinely-newer-applied, NULL-watermark-preserved, re-run-safe — rather than relying on code review
alone.

---

## Production rollout (post-merge)

1. **Vercel production** — auto-deployed on merge to `main` (frontend has no changes in this PR;
   edge function deploy is the relevant artifact here).
2. **Edge functions** — `stripe-webhook` v1238 confirmed live and matching git source exactly via
   `get_edge_function`.
3. **Migrations** — `20260826120000` applied via `execute_sql` + `migration repair`; ledger entry
   verified (`version`/`name` match git filename exactly).
4. **Worktrees** — worktree C released to `main` @ `32a7f622d` (unclaimed) in `active-work.md`'s
   registry.
5. **Erin Jobson / AIA restoration** — held off (per Brian) until the fix was confirmed live, then
   applied: `billing_subscriptions.status` set to `active`, `last_synced_event_created_at` set to the
   restoration timestamp so any subsequent stale webhook event is now correctly rejected by the live
   guard rather than able to reclobber it. `sec.tenant_access_state()` confirmed
   `block_login: false, reason: 'founders_active'` post-restoration; `tenant_members` confirmed
   `status: active, role: Administrator`.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Confirm Erin Jobson (`erin@aia.edu.au`) can log in and load the dashboard normally (not the
  "Access Restricted" screen)
- [ ] Trigger a real Stripe test-mode webhook sequence (checkout → subscription created → invoice
  paid) against production or a Stripe test tenant and confirm `billing_subscriptions` ends up in
  the expected state
- [ ] Watch Supabase edge function logs for `stale_event_skipped` / `sync_stripe_billing_event_failed`
  entries over the next few days of real Stripe traffic to confirm the guard behaves as expected on
  live data, not just the synthetic scenarios tested here

---

## Still open / follow-up

- **233 orphaned production migration versions (May 2026)** — pre-existing, unrelated to this PR,
  part of the documented ~2,000-row Lovable-era reconciliation backlog. Flagged again here per
  `supabase/migrations/CLAUDE.md`'s "not to be resolved as a side effect of a normal PR" guidance —
  needs its own dedicated reconciliation FRAME.
- **`20260710130000_sync_billing_subscriptions_on_trial_extend.sql`** — a second, separate migration
  that also writes `billing_subscriptions` (on trial-extend RPCs). Not inspected during this
  investigation for the same event-ordering flaw — flagged, not fixed, out of this PR's scope.
- **`upsert_provider_subscription`** has 6 callers across the codebase (`stripe-webhook`,
  `cancel-subscription`, `enforce-billing-compliance`, `link-stripe-subscription`,
  `refresh-from-stripe`, `stripe-sync-customer`) writing to a separate table
  (`billing.provider_subscriptions`). Only the `stripe-webhook` call path was brought under the new
  atomic lock in this PR — the other 5 callers were out of scope and not audited for a similar
  ordering issue.
- **`last_synced_event_id` is stored but not yet consumed anywhere** (forensic/audit trail only, by
  design — flagged by fresh-eyes round 1 as a minor note, not treated as a defect).

---

## Soak status

No feature flag — this is a `SECURITY DEFINER` RPC change on the production billing pipeline, live
for all tenants as of 26 Aug 2026. Highest-risk surface: any tenant whose Stripe subscription
transitions state in the next few days (new signups, cancellations, payment retries) exercises the
new atomic path for the first time under real traffic rather than the synthetic rollback-transaction
scenarios tested here. Watch Supabase logs for `sync_stripe_billing_event_failed` (would now
correctly surface as a `'failed'` webhook event, where before it may have been silently swallowed)
and `stale_event_skipped` (expected occasionally — confirms the guard is working, not a bug).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/797
- Merge commit: `32a7f622d96e7af5d9be00308ad39202993bcea3`
- Migration: `supabase/migrations/20260826120000_guard_billing_subscription_sync_event_order.sql`
- Edge function: `supabase/functions/stripe-webhook/index.ts`
- Active work ledger: `active-work.md` (worktree C registry row)
