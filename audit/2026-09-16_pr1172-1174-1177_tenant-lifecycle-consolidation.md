# Audit — PR #1172, #1174, #1177 (tenant trial/lifecycle sync consolidation)

> **Date:** 2026-09-16; **Merged:** #1172 2026-09-16 04:07:56 UTC · #1174 2026-09-16 06:05:34 UTC ·
> #1177 2026-09-16 06:59:57 UTC
> **Scope:** Consolidate 6+ divergent "convert tenant to paid" database pathways onto one canonical
> function, repoint every frontend caller onto it, and backfill the two production tenants already
> stale before the fix shipped.
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — the session-scoped working doc this
> audit replaces has been deleted, per the workspace's living-doc convention

---

## Summary

Brian noticed VIVID COLLEGE PTY LTD (Diamond tier, actively billing) displaying as an active free
trial in the admin panel. Investigation found the actual tier/billing state was correct, but a
separate, older label (`tenants.tenant_type`/`lifecycle_status`/`is_trial`) was never updated at
conversion time. The root cause was 6+ independent "convert this tenant to paid" pathways — 5
already-correct callers of `admin_set_tenant_tier`, plus `convert_tenant_subscription`,
`convert_trial_to_paid`, `admin_convert_trial_to_paid` (2 overloads), `convert_tenant_to_subscription`,
and `set_tenant_diamond` — each writing to a different, non-overlapping subset of tenant state, with
no shared step that kept the trial/lifecycle label in sync.

Three PRs closed this out: #1172 fixed the canonical `admin_set_tenant_tier` function itself
(after a same-day incident where the wrong, pre-review commit was merged first — see below); #1174
repointed every frontend caller onto that one function and retired the duplicates; #1177 backfilled
the two tenants (Vivid and Onfit Training College) that were already stale before #1172/#1174
shipped, and closed a review gap that let a real bug reach that PR in the first place.

**Branches:** `fix/tenant-lifecycle-trigger-stomp-and-restore-convert-trial` (#1172, merge
`d45022acbf4029b30283c138444d57e6ab134ef8`) · `fix/tenant-lifecycle-frontend-consolidation-step2`
(#1174, merge `38b60358c2135c3f71c5103dfaab59f920c5c2c7`) ·
`fix/backfill-vivid-onfit-lifecycle-labels` (#1177, merge `1f4c969eccc2117afb1c01119d242107a6638378`)

**PRs:** [#1172](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1172) ·
[#1174](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1174) ·
[#1177](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1177)

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Admin Tenants/Trials screens | Vivid College showed as an active trial despite being a paying Diamond customer. | `admin_set_tenant_tier` (and every other conversion pathway) never wrote `tenant_type`/`lifecycle_status`/`is_trial` — only the real tier/billing columns. |
| Same, Onfit Training College | Showed as a trial (later "trial expired") despite having been a real paying Founders customer for ~10 months before cancelling. | Same root cause, reached via `convert_tenant_subscription`/a manual conversion — neither ever wrote the lifecycle label either. |
| `tenants.is_diamond` | Diamond-tier tenants could show as non-Diamond in the two screens (`usePaymentMigration.ts`, `useTenantManagement.ts`) that read the raw column instead of deriving it from `tenant_plans.tier`. | Only `convert_tenant_subscription` (being retired) ever wrote this column; `admin_set_tenant_tier` didn't. |
| `tenants.config` jsonb | A second, independent "is this a trial" flag that some screens read (`adminListPaidTenants`) could disagree with the real `is_trial` column. | Only `convert_trial_to_paid`/`convert_tenant_subscription` (both retired) ever wrote it. |
| `TenantControlDrawerEnhanced.tsx` (**fresh-eyes finding**, PR #1174) | A second, competing "Convert to Paid" card in the same drawer; selecting "Professional" silently converted the tenant to Starter instead. | `adminTenants.ts`'s `planCodeMap` had no `'professional'` entry, falling through to a `'starter'` default with no error surfaced. |
| `CreateTenantDialog.tsx` (**fresh-eyes finding**, PR #1174) | Tier was never actually applied to tenants created via this dialog. | `admin_set_tenant_tier` call used parameter names (`p_notes`/`p_actor`) that don't exist on the real signature; the error was caught and only logged as a non-fatal warning. |
| `convert-trial-to-paid` edge function (**fresh-eyes finding**, PR #1174) | The RPC call would always fail its own internal authorization check once repointed. | `admin_set_tenant_tier` gates on `auth.uid()` matching a `super_admin` profile; the edge function called it via a service-role client with no user JWT, so `auth.uid()` would resolve `NULL`. |
| Migration incident (PR #1170 → #1172) | The trigger-stomp fix and `admin_convert_trial_to_paid` restoration briefly went live broken. | GitHub merged the wrong, pre-review commit of PR #1170's migration — a review-process gap, not an out-of-band production change. |
| Backfill migration statement ordering (**Copilot finding**, PR #1177) | Onfit's backfill would have landed on `lifecycle_status='subscriber_suspended'` instead of the intended `'cancelled'`. | `public.tenants`'s `tr_sync_lifecycle_status`/`trg_sync_lifecycle_status` triggers fire on any `UPDATE OF tenant_type, trial_end_date, subscription_status` and unconditionally recompute `lifecycle_status`; a follow-up `UPDATE` setting `subscription_status` *after* the explicit `'cancelled'` transition re-fired the trigger and overwrote it. |

---

## Commit history (substantive only)

| Commit | PR | Summary |
|---|---|---|
| `36224f1c1` | #1172 | Fix lifecycle trigger-stomp regression (tenant_type now set in the same statement as subscription_status inside `transition_tenant_lifecycle`'s `converted` branch); restore `admin_convert_trial_to_paid` (both overloads), which #1170 had dropped while still live. |
| `fd2f4d8fe` | #1174 | Repoint every frontend "convert to paid" caller onto `admin_set_tenant_tier`; remove the inline Bug A/B convert card and dead `TenantControlDrawer.tsx`; drop `admin_convert_trial_to_paid` (both overloads, now safe); fix `CreateTenantDialog.tsx`'s broken RPC params; add a missing tier-assignment call to `CreateTenantModal.tsx`/`adminTenants.ts`; extend `admin_set_tenant_tier` to sync `is_diamond`/clear `config` jsonb trial fields/accept an optional notes param (fresh-eyes findings, same PR). |
| `78d987049` | #1177 | Backfill Vivid (→ converted) and Onfit (→ cancelled) via `transition_tenant_lifecycle`, using a transaction-scoped `service_role` impersonation. |
| `e24e9718a` | #1177 | Fix the Copilot-caught trigger-stomp bug in Onfit's statement ordering; also clear Vivid's `config` jsonb shadow fields for consistency. |
| `43a9e977c` | #1177 | Document the trigger-stomp risk pattern generally in `supabase/migrations/CLAUDE.md`. |

---

## Fixes shipped

### Database

- `20260916030000_fix_lifecycle_trigger_stomp_and_restore_convert_trial.sql` (#1172) — fixes the trigger-stomp regression inside `transition_tenant_lifecycle`'s `converted` branch; restores `admin_convert_trial_to_paid` (both overloads) verbatim from baseline.
- `20260916130450_drop_admin_convert_trial_to_paid.sql` (#1174) — drops both overloads for good, now that PR #1174 removed their last live caller.
- `20260916133213_extend_admin_set_tenant_tier_config_diamond_notes.sql` (#1174) — extends `admin_set_tenant_tier` to sync `tenants.is_diamond`, clear the `config` jsonb trial-shadow fields, and accept an optional `p_notes` parameter folded into its existing `audit_events` insert.
- `20260916144352_backfill_vivid_onfit_lifecycle_labels.sql` (#1177) — one-off historical correction for Vivid (→ `converted`, `is_diamond=true`, backdated to 2026-09-10) and Onfit (→ `cancelled`, backdated to converted 2025-10-20 / cancelled 2026-08-26). Idempotent (guarded on each tenant's known-stale `lifecycle_status`); no-ops on any branch DB where neither tenant exists.
- All four migrations applied automatically via the `Apply Supabase Migrations` workflow and confirmed present in `list_migrations` with the exact filename versions.

### Frontend

- **`TrialManagerModal.tsx` / `TrialActionsModal.tsx`** — repointed from `convert_tenant_subscription` to `admin_set_tenant_tier`; `billing_provider` now explicitly `'manual'` for Diamond / `'stripe'` otherwise, matching the convention already used by `ConvertToDiamondButton.tsx`.
- **`convert-trial-to-paid/index.ts`** — repointed from `convert_trial_to_paid` to `admin_set_tenant_tier`; maps pricing-cohort keys (`standard`/`early_adopter`/`trial_conversion`) onto real `plan_tier` values; fixed to call via a caller-JWT-forwarding client instead of the service-role client (auth fix, see problem statement).
- **`ConvertTrialModal.tsx`** — now passes the cohort key (not a display name) to the edge function.
- **`TenantControlDrawerEnhanced.tsx`** — removed the inline "Convert to Paid" card, its handler, and its mutation; fixed a pre-existing conditional-hook lint error and a missing-dependency warning in the same file, both caught by lint on files already being touched.
- **`TenantControlDrawer.tsx`** — deleted (confirmed zero importers).
- **`CreateTenantDialog.tsx`** — fixed the broken RPC params; tier is now only assigned when the tenant is created as `active` (grace/inactive tenants no longer get silently flipped active — decision made after checking real production usage, not assumed).
- **`CreateTenantModal.tsx` / `adminTenants.ts`** — added the previously-missing tier-assignment call after tenant creation; `early_adopter` maps to `founders` (locked decision, matching existing aliasing precedent elsewhere in the codebase).
- **`adminTenants.ts`** — deleted an orphaned `convertTrialToPaid()` export that called the now-dropped RPC.

### Edge functions

- `convert-trial-to-paid` — source changes verified via `deno check` (clean) and confirmed the deployed function matches git (no drift) during the fresh-eyes review.

---

## Review rounds

1. **Investigation** — live-DB recon confirmed the 6+ pathway inventory, the Diamond billing-exemption design, and the one-time Oct 2025 bulk backfill that masked most tenants except Vivid/Onfit.
2. **fresh-eyes (PR #1174)** — adversarial subagent review with live-DB verification found 6 confirmed bugs (Bug A/B inline card, `is_diamond`/`config` jsonb sync gaps, the service-role auth bug, the `CreateTenantDialog` param bug, the demo-cohort edge case) — all resolved before merge.
3. **ci-gate (PR #1174, #1177)** — lint, `.single()` guard, migration guards, security guards, `deno check`, role-casing, status-enum checks — all clean.
4. **Copilot review (PR #1177)** — caught one High-severity trigger-stomp bug (Onfit statement ordering) and one Medium finding (Vivid config fields) before merge; both fixed and verified via a rolled-back dry-run against production before re-pushing.
5. **Live verification (all three PRs)** — `list_migrations`, `Apply Supabase Migrations` workflow runs, and direct `execute_sql` reads against production confirmed the actual database state matched what each PR claimed, both before and after merge.

---

## Production rollout (post-merge)

1. **Vercel production** — only PR #1174 had frontend changes. Deployment `dpl_39TbwP9vPLF183ifbVhx3EhbpzaY` (commit `38b60358c...`), `target: production`, `state: READY` — confirmed via Vercel MCP. PR #1172 and #1177 had no frontend-relevant files (migration/test/docs only); PR #1177's own commit-level Vercel deployment shows `CANCELED`, consistent with having nothing frontend to build, not a rollout failure.
2. **Migrations** — all four migrations across the three PRs applied via the `Apply Supabase Migrations` workflow, each run `conclusion: success`, matching the three merge commits exactly (`d45022ac`, `38b60358`, `1f4c969e`). Confirmed present in `list_migrations` with exact filename versions.
3. **Live data verification** — queried `public.tenants` directly for Vivid and Onfit post-merge: both show the exact values the PR #1177 dry-run predicted (Vivid: `subscriber`/`subscriber_active`/`is_diamond=true`; Onfit: `subscriber`/`cancelled`/`subscription_status=canceled`, dates backdated correctly).
4. **Worktrees** — Worktree A released twice (once per completed task) and reset to `standby/worktree-A` at `origin/main`, most recently `1f4c969ec`. Worktree B independently handled unrelated PR #1163/#1164 work in parallel during this session; confirmed zero file overlap before any cross-worktree action.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Convert a real trial tenant to Founders via "Manage Trial / Convert" — confirm it disappears from the Trials list and appears correctly in Paid Tenants.
- [ ] Convert a tenant to Diamond — confirm the Diamond badge/flag is now set and the tenant isn't prompted to add a payment method.
- [ ] Create a new tenant with status = Grace — confirm no tier gets attached and the tenant isn't force-flipped to Active.
- [ ] Create a new tenant with status = Active and a tier — confirm the tier attaches correctly.
- [ ] Confirm `admin_convert_trial_to_paid` is gone from the live schema (no remaining callers, no errors from any screen that used to reach it).
- [ ] Visually confirm Vivid College and Onfit Training College now display correctly (not as trials) in the admin Tenants/Trials screens.

These have not been clicked through in a browser during this audit — confirmed only via direct database reads and automated review passes.

---

## Still open / follow-up

- **~15 direct `tenant.is_diamond` read sites bypass `v_tenants_normalized`** (e.g. `BillingPage.tsx:455`, `ArchivedTab.tsx:287`, `TenantsTab.tsx:422,646`, `TenantManageDrawer.tsx:616`, `usePaymentMigration.ts:52`). Not currently producing wrong data — the column is now kept in sync by `admin_set_tenant_tier` — just an inconsistent read pattern. Tracked as `active-work.md` backlog item 28.
- **`TenantPlanBadge.tsx:17` falls back to displaying "Trial" whenever tier is null**, which can mask tier bugs in whichever screens use it. Not yet decided whether the fallback should change. Tracked as `active-work.md` backlog item 29.
- The session-scoped working doc this audit replaces has been deleted as part of this closeout, per the workspace's living-doc convention — this entry is now the durable record.

---

## Soak status

No feature flag introduced — this is core billing/tenant-lifecycle logic used on every conversion action going forward. Risk tier: high (billing surface), mitigated by the two-model-consensus-equivalent review chain (fresh-eyes + ci-gate + Copilot, three independent passes across the three PRs) and by verifying every migration's actual effect against live data both before and after merge, not just trusting each workflow's own success report. Watch: any admin-reported case of a tenant showing incorrect trial/plan status after a manual conversion action in the weeks following this merge — none of the 5 previously-correct canonical callers changed behavior, so a regression there would point specifically at one of the newly-repointed callers.

---

## References

- PRs: [#1172](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1172) ·
  [#1174](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1174) ·
  [#1177](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1177)
- Merge commits: `d45022acbf4029b30283c138444d57e6ab134ef8` ·
  `38b60358c2135c3f71c5103dfaab59f920c5c2c7` · `1f4c969eccc2117afb1c01119d242107a6638378`
- Migration workflow runs: [35054415652](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35054415652) ·
  [35062185118](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35062185118) ·
  [35066320501](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35066320501)
- Vercel production deployment (PR #1174): `dpl_39TbwP9vPLF183ifbVhx3EhbpzaY`
- Durable process fix from this project: `supabase/migrations/CLAUDE.md` § "Multi-statement migrations on trigger-guarded tables"; `ci-gate` and `fresh-eyes` skills updated to match
- Active work ledger: `active-work.md` (backlog items 28-29)
