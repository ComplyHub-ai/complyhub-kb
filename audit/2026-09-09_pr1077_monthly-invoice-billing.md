# Audit — PR #1077

> **Date:** 2026-09-09; **Merged:** 2026-09-09 07:01:07 UTC
> **Scope:** Allow monthly invoice billing for `send_invoice` tenants, add an upcoming-invoice reminder banner, fix a grace-period countdown inconsistency across billing banners — plus two unrelated migration-drift/collision fixes surfaced while shipping it
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `billing-grace-period-reconciliation.md` (still open — two follow-ups logged there for Dave, not resolved in this PR)

---

## Summary

PR #1077 removed the interval gate that hard-blocked `send_invoice` (invoice-billed) tenants on any cadence other than annual, added an upcoming-invoice reminder banner, and fixed a grace-period countdown that could show different numbers on different billing screens at the same moment. A `/fresh-eyes` adversarial subagent review of the branch (no memory of the work session, read the whole diff plus live production data) found 5 confirmed bugs and 8 worth-a-second-look items before merge; all mechanically-fixable ones were addressed in a follow-up commit, and two — a Stripe invoice-status tracking gap, and a pre-existing "suspended for non-payment" vs "cancelled" mislabeling in `billing.auto_apply_grace_and_suspend` — were deliberately left as open questions for Dave rather than patched blind, since both need a design/data decision outside this branch's scope.

Getting this PR to a mergeable state also surfaced two unrelated, pre-existing repo-wide problems, fixed in the same PR because they blocked the PR's own Supabase preview branch from building: (1) two migrations (`allow_authorized_tga_sync_for_demo_tenants`, `fix_authorized_tga_sync_demo_trigger`) had been applied directly to production by Angela without matching git files, causing the CI migration-drift check to hard-fail; and (2) two entirely unrelated migrations (one about SSO dashboard permissions, one about TAS QA auditor scoping) had been authored with the identical `20260908120000` version timestamp, which crashes any fresh Supabase branch build with a primary-key collision on `schema_migrations`. Both were root-caused against live production data (not guessed at) and fixed via reconciliation/renumbering, not by touching the underlying schema.

Headline numbers: 17 files changed, +941/-201 lines across 4 substantive commits, 4 migration files touched (2 genuinely new, 2 pure reconciliation of already-live production state), 1 edge function fixed and auto-deployed, 6 test files added/updated.

**Branch:** `fix/allow-monthly-invoice-billing` (merged; remote branch state not independently verified as deleted) · **Merge commit:** `3018bdffbd8aa03b7e3b863ab12dc1636462a19a` · **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/1077

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Billing access | Every `send_invoice` tenant on a monthly (non-annual) plan was permanently blocked | `sec.evaluate_billing_access` hard-rejected any send_invoice tenant whose interval wasn't `'year'`, before ever checking subscription/invoice-paid status |
| Edge function | Even after the DB fix, no new monthly invoice subscription could be created | `stripe-create-annual-invoice-subscription` independently hard-rejected any `billing_interval` other than `'year'`/`'annual'` — the DB-side fix was unreachable |
| **(fresh-eyes finding)** Banner consistency | `BillingStatusBanner` and `SubscriptionStatusBanner` could show a different "days remaining" number at the same instant | Each computed the calendar-day diff with a different function (`differenceInCalendarDays` vs `differenceInDays`) and neither was timezone-aware (browser-local, not `Australia/Sydney`) |
| **(fresh-eyes finding)** Off-by-one at grace boundary | Banner could say "0 days remaining" for hours after RLS had already locked the tenant out | Banner used a rounded calendar-day count to decide the branch; RLS (`sec.is_tenant_write_locked`) uses a real `grace_ends_at > now()` timestamp comparison |
| **(fresh-eyes finding)** Wrong lockout copy | A `past_due` tenant with a genuinely failed card was told "a payment method is required" (implying none on file) | Banner conflated `past_due` (card exists, failed) with `payment_required` (no payment method at all) into one copy branch |
| **(fresh-eyes finding)** Dead code | `v_norm_interval` computed in the migration and never read | Leftover from the interval gate this migration removes; its only inputs (`v_interval`, `v_cadence`) were also unused elsewhere |
| **(fresh-eyes finding, logged not fixed)** Invoice-status gap | `latest_invoice_status` is `NULL` for every live `send_invoice` subscription, so the "block on genuinely-bad invoice status" guard can never fire | No `invoice.paid`/`invoice.payment_failed` Stripe webhook event has ever arrived for these three subscriptions in ~8.5 months — needs a Stripe Dashboard check (webhook subscription config, or whether these customers are invoiced entirely outside Stripe) |
| **(fresh-eyes finding, logged not fixed)** Status mislabeling | 2 of 3 target tenants stayed blocked after the fix, showing `status = 'cancelled'` when Stripe itself still reports `past_due` | `billing.auto_apply_grace_and_suspend`'s Step 3b writes `status = 'cancelled'` for any tenant whose grace period expires, conflating "suspended for non-payment" with "subscription actually cancelled" — a pre-existing bug, not introduced by this branch |
| Migration drift (unrelated) | PR's CI migration-drift check hard-failed | Two migrations were applied directly to production (by Angela, ~19 seconds apart) with no matching git file — confirmed via `schema_migrations.created_by` |
| Supabase branch build (unrelated) | PR's Supabase preview branch failed with `duplicate key value violates unique constraint "schema_migrations_pkey"` | Two unrelated migration files (`fail_closed_sso_dashboard_threshold_membership`, `scope_tas_qa_auditor_units_by_build`) shared the identical `20260908120000` version timestamp; a fresh branch build hit a primary-key collision applying the second one |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `7f4ff7eca` | Removed the interval gate on `sec.evaluate_billing_access`; added `InvoicePaymentReminderBanner`; rewrote `BillingStatusBanner` to a single data source; added a structural regression test for the null-invoice-status-as-not-unpaid fix. |
| `c2ce51cfa` | Fresh-eyes follow-up: migration renumbering, Sydney-timezone day-diff helper, edge function monthly support, off-by-one fix, dead-code removal, 90-day staleness guard, new test coverage. |
| `49b744563` | Reconciled two migrations Angela applied directly to production, using their exact original version/name/SQL from `schema_migrations`. |
| `34d5b983b` | Resolved the pre-existing `20260908120000` version collision blocking every fresh Supabase branch build, by renumbering only the not-yet-applied file. |

---

## Fixes shipped

### Database

- **`supabase/migrations/20260909110000_allow_monthly_send_invoice_billing.sql`** (renumbered from `20260909014138` to sit after the last already-applied production migration) — `sec.evaluate_billing_access` no longer gates `send_invoice` tenants on interval; removed dead `v_norm_interval`/`v_interval`/`v_cadence`.
- **`supabase/migrations/20260909043517_...` and `20260909043536_...`** — pure reconciliation of Angela's direct-to-production changes; verbatim SQL pulled from `schema_migrations`, confirmed byte-identical to the live `pg_get_functiondef()` output before writing.
- **`supabase/migrations/20260908120001_scope_tas_qa_auditor_units_by_build.sql`** (renamed from colliding `20260908120000`) — no content change, version-only fix.
- Applied automatically via the `Apply Supabase Migrations` workflow on merge (run `34321766769`, success). Verified the workflow's own "Determine pending migrations" step correctly recognized the two reconciliation files as already-applied (skipped) and only applied the two genuinely-new ones — confirmed via the run log directly, not assumed.

### Edge functions

- **`supabase/functions/stripe-create-annual-invoice-subscription/index.ts`** — accepts and correctly prices `month`/`monthly` in addition to `year`/`annual`; idempotency key now includes the interval to avoid cross-cadence collisions.
- Deployed automatically via `Deploy Edge Functions` workflow on merge (run `34321766783`, success). Confirmed via `get_edge_function`: live source (version 9) matches git exactly, including the `billingInterval` logic.

### Frontend — billing banners

- **`BillingStatusBanner.tsx`** — single Sydney-tz day-diff source; branch decision now uses a real timestamp comparison (`isWithinGrace`) instead of a rounded day count; fixed `past_due`-with-failed-card copy.
- **`SubscriptionStatusBanner.tsx`** — aligned onto the same `sydneyCalendarDaysDiff` helper.
- **`InvoicePaymentReminderBanner.tsx`** (new) — 7/3/1-day advance reminder for invoice tenants; uses `formatSydneyLongDate` for the due-date display.
- **`BillingLockedScreen.tsx`** — Sydney-tz-aware overdue-day calculation; added a 90-day staleness guard so a frozen `next_billing_at` shows a generic "contact support" message instead of an implausible, ever-growing day count.
- **`src/utils/calendarDateUtils.ts`** — added `sydneyCalendarDaysDiff` and `formatSydneyLongDate`, matching this repo's existing `Intl.DateTimeFormat('en-CA', {timeZone: 'Australia/Sydney'})` convention (already used in `complianceConfidence.ts`) rather than introducing a new date library.

### Deliberately not fixed here

- `BillingOverview.tsx` / `SoftLockWarningModal.tsx` still read from separate hooks/tables (`useSubscriptionBilling`, `useSoftLock`) rather than the unified `useAccessGate()` — unifying them is the "which table is the system of record" design decision already parked in `billing-grace-period-reconciliation.md` Item 1, not a same-day fix.
- `get_access_gate`'s `past_due` vs `grace` collapse (fresh-eyes finding #6) — real fix touches a function three RLS checks depend on; zero live impact today (no production rows in that state), left as a flagged risk rather than a rushed change to shared security-critical code.

---

## Review rounds

1. **`/fresh-eyes` adversarial subagent review** (pre-merge) — genuine fresh Claude Agent subagent, no prior context, read the whole branch diff plus live production database/RLS/edge-function state. Found 5 confirmed bugs, 8 worth-a-second-look items, cleared several (no banned patterns, migration idempotency, reason-code rename safety, merge cleanliness).
2. **Root-cause investigation (this session, not the subagent)** — traced *why* `latest_invoice_status` is NULL and *why* two tenants show conflicting statuses, using live `execute_sql` queries rather than accepting the review's surface-level finding; discovered the "cancelled" mislabeling is a real automated cron job's bug (`billing.auto_apply_grace_and_suspend`), not manual data tampering as initially suspected.
3. **Mechanical checks** — `npm run lint` scoped to every touched file (clean); relevant vitest suites (`evaluate-billing-access-send-invoice`, `BillingLockedScreen`, `calendarDateUtils.sydney`, `tas-qa-auditor-units-by-build`) all passing; confirmed via live Supabase queries that monthly `billing.plans` rows with valid Stripe price IDs exist for all standard plan codes before shipping the edge function fix.
4. **PR CI** — lint, type-check, security checks, migration guards, `.single()` guard, config.toml coverage all passed. Migration drift check failed twice pre-merge (both pre-existing, unrelated issues — see below) and passed once fixed.
5. **Post-merge verification (this audit)** — confirmed via the actual `Apply Supabase Migrations` workflow log (not assumed) that the ledger reconciliation behaved exactly as designed; confirmed via `get_edge_function` that the deployed edge function source matches git; confirmed via Vercel `list_deployments` that the production deployment for this exact merge commit is `READY`.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_AP1D63x8EAxoBnNVHjyth8B3iSP2`, `target: production`, `state: READY`, `githubCommitSha` matches the merge commit exactly. Verified directly via Vercel MCP, not assumed from a passing preview check.
2. **Edge functions** — `stripe-create-annual-invoice-subscription` deployed automatically (workflow run `34321766783`, success); live source confirmed matching git via `get_edge_function`.
3. **Migrations** — Applied automatically (workflow run `34321766769`, success); `list_migrations` now shows all 51 versions in unbroken order with the two reconciliation entries in place and no gaps.
4. **Worktrees** — Worktree B (`rto-compass-hub-worktree-b`) still shows a stale claim in `active-work.md`'s registry (task text still describes the pre-merge work). **Not released as part of this session** — needs the standard teardown (`git status` clean → fetch `origin/main` → checkout/pull if `main` isn't checked out elsewhere, or standby branch otherwise) before the row is updated.

Unrelated CI noise on the merge commit, not caused by this PR: `Version bump` failed (known noise per team convention — not chased); the post-merge `CI` workflow run shows `cancelled`, consistent with the repo's concurrency-cancel behavior when a later push (PR #1078 merged shortly after) superseded it — the PR's own pre-merge CI had already passed in full before merge.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Create a real monthly `send_invoice` subscription via `stripe-create-annual-invoice-subscription` (superadmin-only, no frontend caller exists yet) and confirm access is granted per the new logic.
- [ ] Visually confirm `BillingStatusBanner` and `SubscriptionStatusBanner` agree on the same grace-days-remaining number for a test `past_due` tenant.
- [ ] Confirm `InvoicePaymentReminderBanner` renders at the 7/3/1-day thresholds for a test invoice tenant.
- [ ] Confirm `BillingLockedScreen`'s stale-overdue guard actually triggers correctly once a `next_billing_at` genuinely ages past 90 days (no live tenant currently in that state to check against).
- None of the above has been clicked through in the live app by a human yet — this PR shipped on lint/test/live-query verification only, not manual browser QA.

---

## Still open / follow-up

- **Stripe invoice-status tracking gap** and **the `auto_apply_grace_and_suspend` cancelled/suspended mislabeling** — both logged in `billing-grace-period-reconciliation.md` Item 5, need Dave's design/data call before any code change.
- **Worktree B teardown** — release the stale claim in `active-work.md`'s registry now that PR #1077 is merged.
- Angela applied two migrations directly to production during this work (confirmed via `schema_migrations.created_by`) — worth a direct, non-punitive heads-up to her about going through the branch/PR flow instead of the SQL editor/direct MCP, per the existing incident precedent in `supabase/migrations/CLAUDE.md`.
- The `20260908120000` version collision was fixed reactively because it blocked this PR — worth a quick sweep (`ls supabase/migrations | sort | uniq -c` on the version prefix) to confirm no other collision exists elsewhere in the current migration set, since this one sat undetected until a branch build happened to need it.

---

## Soak status

No feature flag. Billing-access-path change is high-consequence in principle (governs paid-tenant access), but low-blast-radius in practice today: exactly 3 live tenants use `send_invoice` collection method, and only 1 of those 3 is actually reachable by the new logic today (the other 2 are blocked by the pre-existing, unrelated status-mislabeling bug already logged for Dave). Watch: any new support ticket from a `send_invoice` tenant about access after this merge: check `sec.evaluate_billing_access`'s live behavior for that tenant first, since the invoice-status gap means the fallback to `paid_through_date` is currently the operative path for all of them.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1077
- Merge commit: `3018bdffbd8aa03b7e3b863ab12dc1636462a19a`
- Apply Supabase Migrations run: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34321766769
- Deploy Edge Functions run: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34321766783
- Production deployment: https://vercel.com/complyhub/complyhub-rto/AP1D63x8EAxoBnNVHjyth8B3iSP2
- Source living doc (open questions for Dave): `billing-grace-period-reconciliation.md`
- Active work ledger: `active-work.md`
