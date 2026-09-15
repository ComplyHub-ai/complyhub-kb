# Audit — PR #1083

> **Date:** 2026-09-10; **Merged:** 2026-09-10 05:28:30 UTC
> **Scope:** Billing RPC authorization, Stripe reactivation unlock rules, and production migration-drift reconciliation
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked on the PR branch and active-work ledger

---

## Summary

PR #1083 hardened the follow-up fixes from PRs #1080 and #1081. It restored access for users with the existing `sa_tenants_hub` platform permission, restricted legacy billing writer RPCs to the service role, and prevented a `send_invoice` tenant from being unlocked by an active subscription alone without paid-invoice evidence.

The PR also reconciled three production migration records that were missing from Git, using their original production version/name pairs. The PR changed 5 files, adding 347 lines and no deletions: 4 migrations and 1 regression-test file.

**Branch:** `fix/billing-rpc-platform-auth-webhook-gates` · **Merge commit:** `1c0000bb4d7fdb64850b1a552a3b3913c2f53d32` · **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/1083

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Billing authorization | Platform users could see the subscription-management surface but the billing-date RPC rejected them. | The RPC only accepted super-admin/service-role callers and did not honor the existing `sa_tenants_hub` platform permission. |
| Billing reactivation | An active Stripe subscription could clear tenant locks without considering invoice collection state. | The webhook unlock condition treated all active subscriptions alike, including `send_invoice` subscriptions. |
| Legacy billing RPCs | Several public-schema security-definer writers remained executable by authenticated callers. | Earlier hardening covered some overloads but left four legacy writer signatures open. |
| Migration drift | The PR's drift check initially failed. | Production contained three migration ledger rows with no matching migration files on `main` or the branch. |

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `23529e21c` | Harden billing reactivation authorization, invoice-aware webhook unlocks, and legacy writer grants; add regression tests. |
| `54e4b7caa` | Add the three backdated production migration reconciliations that closed the migration drift. |

## Fixes shipped

### Database

- `20260910045909_harden_billing_reactivation_authorization.sql` — authorizes `sa_tenants_hub`, revokes authenticated execution from legacy billing writers, and requires paid invoice evidence for `send_invoice` reactivation unlocks.
- `20260910022255_activate_intelligence_pilot_demo_tenant.sql` — reconciles the production feature-flag migration.
- `20260910041218_cleanup_orphaned_governance_schedules_and_add_fk.sql` — reconciles orphan cleanup and adds the tenant foreign key idempotently.
- `20260910041230_revoke_public_anon_add_suggestion_comment_and_expire_old_invites.sql` — reconciles the RPC grant cleanup.

The automatic `Apply Supabase Migrations` workflow succeeded for merge commit `1c0000bb4d7fdb64850b1a552a3b3913c2f53d32`. The live Supabase migration ledger was rechecked and contains all four PR migration versions.

### Edge functions

None touched; none redeployed.

### Tests

The focused billing migration tests passed: 14 tests across 3 files. TypeScript, lint, migration guards, security checks, and the pre-merge migration drift check passed.

## Review rounds

1. Manual review of merged PRs #1080 and #1081 identified the platform-permission mismatch, remaining authenticated billing writers, and the incomplete `send_invoice` unlock gate.
2. Live Supabase inspection verified function definitions, grants, migration records, billing subscription rows, and the canonical access functions.
3. Focused regression tests passed with 14/14 tests green.
4. CI passed type check, lint, migration guards, security checks, and migration drift check.
5. Local database lint could not run because local Postgres was unavailable. Supabase Preview reported `unexpected update function status 403: Forbidden resource`; this was a preview-service permission/integration failure, while the production migration apply succeeded.

## Production rollout (post-merge)

1. **Vercel production** — GitHub's Vercel status for the merge commit is `success` with deployment URL https://vercel.com/complyhub/complyhub-rto/AFZn1CUj4rbFRRQetg5W1y8HvHRr. Independent Vercel MCP verification was unavailable because the connector was not connected.
2. **Edge functions** — none.
3. **Migrations** — automatic apply workflow succeeded: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34441210242. Live ledger verification confirms the four PR versions are present.
4. **Worktrees** — Worktree A remains on the merged feature branch pending explicit standby/release handling.

## Live tenant status after migration

Checked directly against `sec.evaluate_billing_access()` and `sec.is_tenant_write_locked()` after migration `20260910045909` was live:

| Requested tenant | Canonical access | Effective lock | Current reason |
|---|---:|---:|---|
| Access Community Enterprises | Blocked | Locked | Subscription cancelled |
| Australian Academy | Blocked | Locked | Subscription cancelled |
| All States Training | Blocked | Locked | Subscription cancelled |
| Intercept Group | Blocked | Locked | Subscription cancelled |
| Precise Training | Blocked | Function says locked; tenant flag is false | Subscription cancelled |
| Australian Institute of Accreditation | Allowed | Unlocked | Paid through 2026-10-01; `paid_invoice` |
| Australian Ultimate Training College | Blocked | Locked | Subscription row cancelled; `send_invoice` with no latest invoice status |
| Start Training Group | Blocked | Locked | Subscription row cancelled; `send_invoice` with no latest invoice status |

The migration is live but is event-driven; it does not backfill old cancelled subscription rows. A future Stripe webhook with an active subscription can correct a tenant, but `send_invoice` tenants now require explicit paid-invoice evidence in that event. The two tenants whose billing view displays active while the canonical access function blocks them need a separate billing-state reconciliation or confirmed Stripe webhook; no hosted write was performed during this audit.

### Explicit production override — 2026-09-10 06:00 UTC

Brian explicitly authorized overriding the current `past_due` Stripe projections for Australian Ultimate Training College and Start Training Group. The scoped production transaction:

- changed each matching live Stripe projection from `past_due` to `active`;
- changed each public billing subscription projection to `active`;
- set each tenant to `status = active`, `subscription_status = active`, `write_locked = false`, and cleared `locked_reason`/`grace_ends_at`;
- preserved `latest_invoice_status` as `NULL` and did not fabricate a payment event;
- recorded billing audit events `manual_override_pr1083_autc` and `manual_override_pr1083_start_training`.

Post-write verification: both tenants return `allowed = true`, `block_login = false`, `write_locked = false`, and `access_state = active` from the canonical billing-access functions. This is a business-authorized override of Stripe's prior `past_due` state; a future Stripe webhook may change the state again.

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Confirm a platform user with `sa_tenants_hub` can open Manage Subscription and successfully call the billing-date RPC.
- [ ] Confirm a card-billed tenant reactivates only after the expected Stripe active-subscription event.
- [ ] Confirm `send_invoice` tenants remain blocked until paid-invoice evidence is recorded.
- [ ] Confirm the eight named tenants' expected commercial status with the billing owner before any manual reconciliation.

## Still open / follow-up

- Investigate the Supabase Preview `403 Forbidden resource` failure with the Supabase/GitHub integration owner.
- Reconcile the five blocked named tenants against Stripe and the business-approved billing state. Do not manually unlock based only on future `paid_through_date` while the subscription row remains cancelled.
- Specifically investigate the view/function disagreement for Australian Ultimate Training College and Start Training Group: `v_tenant_billing_state` reports active, while `billing_subscriptions.status = 'cancelled'` causes `sec.evaluate_billing_access()` to block them.
- Resolve the unrelated version-bump automation race on `chore/version-bump`.

## Soak status

No feature flag. Risk tier: high for billing access and tenant locking. Watch Stripe webhook processing, invoice-status transitions, and the two `send_invoice` tenants for the next billing event.

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1083
- Merge commit: `1c0000bb4d7fdb64850b1a552a3b3913c2f53d32`
- Migration workflow: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34441210242
- Active work ledger: `active-work.md`
