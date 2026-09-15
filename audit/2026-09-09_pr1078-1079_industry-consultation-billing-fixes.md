# Audit — PR #1078 + PR #1079

> **Date:** 2026-09-09; **Merged:** 2026-09-09 07:12:10 UTC (#1078), 2026-09-09 07:24:49 UTC (#1079)
> **Scope:** Fix four issues from the Industry Consultation survey investigation (auto-link
> misclassification, silent Consultation Register failures, stale billing reactivation flags,
> a misleading response-count UI field) — plus a critical post-merge correction after PR #1078's
> billing fix turned out to target a dead-code duplicate function instead of the real one
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `industry-consultation-survey-issues.md`
> (original investigation) and `issue-8-5-1-6-implementation-plans.md` (implementation planning
> doc) — both deleted per Brian's instruction once this audit entry was raised, per the standard
> living-doc workflow

---

## Summary

PR #1078 shipped four independent fixes surfaced by an earlier read-only investigation into a
reported "lost survey responses" incident: (1) Consultation Register auto-linking always
misclassified survey respondents as "employer" because an older, platform-wide trigger won a race
against the trigger that computes the correct classification; (2) `trg_survey_response_to_icr()`
silently dropped Consultation Register entries (no trace anywhere) when a tenant had no active
staff member to attribute the entry to; (3) every billing reactivation path reset
`write_locked`/`subscription_status` but never `tenants.status`/`grace_ends_at`, leaving reactivated
tenants permanently showing a stale "suspended" badge internally; (4) a Consultation Register UI
field labeled "Response Count" implied a survey-level total but the underlying value is
per-respondent. A `/fresh-eyes` adversarial subagent review of the branch before merge found 2
confirmed bugs (the auto-link fix could silently overwrite a Compliance Manager's manual
correction; the grace-period reset missed tenants who pay *during* grace, before ever being
suspended) and 2 worth-a-second-look items (both reconciliation functions were `SECURITY DEFINER`
with no authorization check, one of them REST-reachable by any authenticated user) — all four fixed
in the same branch before merge.

**Post-merge verification found PR #1078's billing fix had targeted the wrong function.** Two
functions named `reconcile_stripe_checkout` exist in different schemas (`billing.*`, 12 args;
`public.*`, 13 args, has an extra `p_billing_interval` param) — both pre-existing since the
original 4 Sep 2026 baseline squash, missed by both the original investigation and the fresh-eyes
review because neither checked for a schema duplicate. The real caller
(`stripe-reconcile-session/index.ts:189`, `admin.rpc(...)` with a Supabase client that has no
schema override) hits the `public` copy by default — not the one #1078 patched. Confirmed live via
`pg_proc`: the billing reactivation bug (Issue 1) was still live in production, and the `public`
copy had an explicit `GRANT TO authenticated` with no authorization check — exploitable by any
logged-in user to grant themselves free paid access. PR #1079 applied the identical fixes to the
real function and additionally revoked the `authenticated` grant entirely (matching the sibling
`sync_stripe_billing_event`'s actual grant pattern, not just relying on the internal check).

Headline numbers: PR #1078 — 8 files changed, +1101/-16 lines across 6 substantive commits, 5
migration files (all new), no edge functions touched. PR #1079 — 1 file changed, +116 lines, 1
commit, 1 migration file (new), no edge functions touched.

**PR #1078 — Branch:** `fix/ic-survey-tas-link-type-conflict-overwrite` · **Merge commit:**
`503ac3243333e27f27129101e1542d7577e57f92` · **PR:**
https://github.com/ComplyHub-ai/rto-compass-hub/pull/1078

**PR #1079 — Branch:** `fix/reconcile-stripe-checkout-public-schema-duplicate` · **Merge commit:**
`164280ac46e3b7f3f3d2ced0687e9848bd1241db` · **PR:**
https://github.com/ComplyHub-ai/rto-compass-hub/pull/1079

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Consultation Register auto-linking | Every survey-sourced link showed generic "employer" with no respondent name, even for clearly stakeholder-type respondents | `trg_survey_response_to_icr()` already computed the correct `link_type`/`match_reason`, but the older `trg_sync_icr_tas_id_to_links` trigger fires first on the same INSERT and always won the unique-constraint race via `ON CONFLICT DO NOTHING` |
| **(fresh-eyes finding)** Auto-link overwrite | The `DO UPDATE` fix for the row above had no guard, so it would silently overwrite a Compliance Manager's own manual reclassification the next time the same respondent resubmitted | New conflict clause matched on `(tas_id, consultation_record_id)` alone, with no check for `match_source` |
| Consultation Register silent failure | Survey responses could "succeed" for the respondent while never appearing in the client's register | `trg_survey_response_to_icr()` bailed with a bare `RETURN NEW` (no trace) when no active `tenant_members` row existed to attribute the entry to |
| Billing reactivation | Reactivated tenants permanently showed a stale "suspended" badge/expired grace date internally | No reactivation path (Stripe webhook, `reconcile_stripe_checkout`, `reconcile_tenant_subscription_states`, `unlock_paid_tenants`) ever reset `tenants.status`/`grace_ends_at`, both set by `billing.auto_apply_grace_and_suspend()`'s suspend step |
| **(fresh-eyes finding)** Grace-period reset gap | The fix above still left `grace_ends_at` stale for a tenant who paid *during* grace, before ever reaching `suspended` | Reset was gated on `status = 'suspended'`, but `auto_apply_grace_and_suspend()` sets `grace_ends_at` a step earlier while `status` is still `'active'` |
| **(fresh-eyes finding)** Missing authorization | Any authenticated user could call `reconcile_stripe_checkout`/`reconcile_tenant_subscription_states` directly | Both `SECURITY DEFINER` with no internal authorization check; the former additionally had an explicit `GRANT TO authenticated` |
| Consultation Register UI | "Response Count" field read as a survey-level total | Auto-populated value is actually per-respondent (1 per distinct name+org, incrementing only on exact resubmit); label/placeholder gave no indication |
| **(post-merge finding, PR #1079)** Wrong function patched | PR #1078's billing fix and authorization guard never took effect in production | Two functions named `reconcile_stripe_checkout` exist in different schemas (`billing.*` fixed by #1078, `public.*` actually invoked); the real caller's Supabase client has no schema override and defaults to `public` |

---

## Commit history (substantive only)

### PR #1078

| Commit | Summary |
|---|---|
| `623463715` | `trg_survey_response_to_icr`'s own conflict clause changed `DO NOTHING` → `DO UPDATE` so the correct classification wins over the older trigger, scoped to `source = 'survey'`. |
| `1d9b6320c` | ICR entry now created with `NULL` attribution instead of silently dropped when no active tenant member exists; two auxiliary auto-link inserts skipped in that case (genuine `NOT NULL` on their own `created_by`); `RAISE WARNING` added for traceability. |
| `3ae579755` | Added `status`/`grace_ends_at` reset to `sec.reconcile_tenant_subscription_states()`/`billing.reconcile_stripe_checkout()`, gated on `status = 'suspended'` specifically after checking live data for `cancelled`/`archived` tenants that must not be touched. |
| `81a7ca6f1` | UI helper text added clarifying `survey_response_count`'s per-respondent semantics. |
| `dc437162c` | Fresh-eyes follow-up: `WHERE match_source = 'auto'` guard on the auto-link overwrite; `grace_ends_at` reset made unconditional wherever `subscription_status` is set active; `sec.is_service_role()` authorization guard added to both reconciliation functions; missing `updated_at` bump added. |
| `3199ac3d3` | Unrelated docs housekeeping done in the same session: synced root `AGENTS.md` with `CLAUDE.md` (3 missing rules), added `supabase/migrations/AGENTS.md` (didn't exist, though `migrations/CLAUDE.md` already referenced it). |

### PR #1079

| Commit | Summary |
|---|---|
| `e15e69c8a` | Applied the identical fixes (authorization guard, `status`/`grace_ends_at` reset, `updated_at` bump) to `public.reconcile_stripe_checkout` — the function actually invoked in production — and revoked its `GRANT TO authenticated` entirely, replacing it with `service_role` only. |

---

## Fixes shipped

### Database

- **`20260909100001_fix_ic_survey_tas_link_type_overwrite.sql`** — `trg_survey_response_to_icr()`'s `tas_consultation_links` insert changed to `ON CONFLICT ... DO UPDATE`.
- **`20260909100002_fix_ic_survey_icr_no_active_member_fallback.sql`** — same function, adds the `NULL`-attribution fallback + `RAISE WARNING`.
- **`20260909100003_fix_billing_reactivation_stale_status_reset.sql`** — `status`/`grace_ends_at` reset added to `sec.reconcile_tenant_subscription_states()`/`billing.reconcile_stripe_checkout()` (later confirmed to be the wrong-schema function — see below).
- **`20260909100004_fix_ic_survey_tas_link_protect_manual_override.sql`** — adds `WHERE tas_consultation_links.match_source = 'auto'` to the conflict clause from migration 1.
- **`20260909100005_fix_billing_reconcile_grace_clear_and_authz.sql`** — unconditional `grace_ends_at` clear, `sec.is_service_role()` guard, `updated_at` bump — all applied to `billing.reconcile_stripe_checkout()`/`sec.reconcile_tenant_subscription_states()`.
- **`20260909120000_fix_reconcile_stripe_checkout_public_schema_duplicate.sql`** (PR #1079) — identical fixes applied to `public.reconcile_stripe_checkout`, the function actually invoked in production; also revokes `GRANT TO authenticated`, replaces with `service_role` only.
- Applied automatically via the `Apply Supabase Migrations` workflow on each merge — PR #1078's run succeeded (the first real production exercise of the newly-hardened atomic apply+stamp path, previously only unit-verified); PR #1079's run also succeeded. `list_migrations` confirms all 6 versions present in the production ledger in order.

### Edge functions

None touched, none redeployed in either PR.

### Frontend

- **`src/components/consultation/MethodSpecificFields.tsx`** — added helper text under the Response Count input clarifying per-respondent semantics. No logic change.

### Docs (PR #1078, unrelated housekeeping done in the same session)

- **`AGENTS.md`** (root) — added three rules that existed only in `CLAUDE.md`'s detailed examples: `profiles.role` authorization ban, Naming Conventions section, TanStack-Query-for-server-state rule.
- **`supabase/migrations/AGENTS.md`** (new) — condensed, tool-agnostic mirror of `supabase/migrations/CLAUDE.md`, matching the same relationship as the root pair.

### Deliberately not fixed here

- The bigger structural fix for Issue 5 (adding `tenant_id` + a real FK to `industry_consultation_survey_responses`) — bigger schema change, needs to account for 3 legacy mixed slug/UUID rows, parked for its own FRAME.
- The older, platform-wide `trg_icr_tas_id_to_links`/`trg_sync_icr_tas_id_to_links` trigger itself (Issue 8's root cause for non-survey sources) — not touched; only the survey-sourced overwrite race was fixed.
- No retroactive fix for already-misclassified historical links (Australian College's 11 backfilled rows, or any other tenant's).

---

## Review rounds

1. **Manual investigation (prior session)** — read-only recon that produced `industry-consultation-survey-issues.md`, identifying all four issues below plus Issue 7 (fixed separately) and Issue 2 (investigated, confirmed benign).
2. **Scout recon (this session)** — live schema/trigger/RLS/code-path verification for all four issues before drafting any fix, including a live query confirming the codebase's existing "system user" sentinel UUID doesn't actually exist in `auth.users` (ruling out one candidate fix for Issue 5) and a live query of `tenants.status`/`subscription_status` value combinations (finding real `cancelled`/`archived` tenants, which shaped Issue 1's fix to be conditionally gated rather than unconditional).
3. **`/fresh-eyes` adversarial subagent review** (pre-merge, PR #1078) — genuine fresh Claude Agent subagent, no prior context, read the whole branch diff plus live production database state via `pg_get_functiondef`/`pg_policy`. Found 2 confirmed bugs (manual-link overwrite, grace-period reset gap) and 2 worth-a-second-look items (missing authorization checks); also confirmed transcription accuracy of all reproduced function bodies against live/git definitions and cleared several other checks (idempotency, `link_type` CHECK constraint compatibility, no accidental privilege widening via the RLS access gate).
4. **Mechanical checks (`ci-gate`-equivalent, both PRs)** — migration filename/guard checks, `SECURITY DEFINER`/`search_path` presence, no hardcoded project ID/service-role key, no dropped tests/migrations, scoped ESLint on the one changed `.tsx` file — all clean on both PRs.
5. **Post-merge verification (this session, led to PR #1079)** — watched the `Apply Supabase Migrations` workflow run to completion for PR #1078 (success), then spot-checked the live function bodies via `pg_proc`/`get_advisors`. The advisor scan surfaced `public.reconcile_stripe_checkout` — a function neither the original investigation nor the fresh-eyes review had noticed — with the exact same live bugs #1078 believed it had fixed. Traced the real caller's Supabase client configuration to confirm it resolves to `public`, not `billing`, before writing PR #1079's fix.
6. **Post-merge verification (PR #1079)** — watched the `Apply Supabase Migrations` workflow run to completion (success); confirmed live via `pg_proc` + `has_function_privilege()` that the authorization guard is present, the status/grace_ends_at reset is present, `authenticated` can no longer execute the function at all, and `service_role` still can.

---

## Production rollout (post-merge)

1. **Vercel production** —
   - PR #1078: deployment `dpl_DMKbaFSrfp7GE8UnsDqN65eKvPAR`, `target: production`, `state: READY`, commit SHA matches the merge commit exactly.
   - PR #1079: deployment `dpl_GEJwAoAm24oCigKiciq1wp9w4VtY`, `target: production`, `state: READY`, commit SHA matches the merge commit exactly.
   - Both verified directly via Vercel MCP `list_deployments`, not assumed from a passing preview check.
2. **Edge functions** — none touched in either PR, none redeployed.
3. **Migrations** — all 6 versions (`20260909100001`–`20260909100005`, `20260909120000`) applied automatically via the `Apply Supabase Migrations` workflow (both runs `success`); confirmed present and in order via `list_migrations`. Live function bodies spot-checked directly via `pg_get_functiondef`/`pg_proc`/`has_function_privilege()` after each apply — not just the ledger.
4. **Worktrees** — Worktree A (`rto-compass-hub`) returned to `main`, fast-forwarded to the PR #1079 merge commit, registry row in `active-work.md` released to unclaimed.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Submit a test industry consultation survey response as a Trainer/Assessor-type respondent; confirm the resulting `tas_consultation_links` row shows `link_type = 'stakeholder'`, not `'employer'`.
- [ ] Manually reclassify a survey-sourced link in the TAS Market Justification panel, resubmit the same respondent's survey again, confirm the manual classification survives.
- [ ] Confirm a tenant reactivated via a real Stripe checkout has `tenants.status`/`grace_ends_at` cleared, not just `subscription_status`/`write_locked` (no live tenant currently mid-reactivation to check against — needs a real or staged Stripe event).
- [ ] Visual check: Consultation Register manual entry form shows the new Response Count helper text.
- [ ] Confirm a real Stripe checkout reconciliation still succeeds end-to-end via `stripe-reconcile-session` (uses the service-role client, should be unaffected by the tightened grant).
- None of the above has been clicked through in the live app by a human yet — verification to date is live-database/live-function-body confirmation only, not manual browser QA.

---

## Still open / follow-up

- **Issue 5's bigger structural fix** (real `tenant_id` + FK on `industry_consultation_survey_responses`) — parked, needs its own FRAME, has to account for 3 legacy mixed slug/UUID rows.
- **Issue 8's root-cause trigger** (`trg_icr_tas_id_to_links`/`trg_sync_icr_tas_id_to_links` itself, for non-survey sources) — not touched; needs the respondent's role, not currently available on `industry_consultation_records` for non-survey sources.
- **No retroactive fix** for already-misclassified historical Consultation Register links.
- **Worth a repo-wide sweep for other same-name, different-schema function duplicates** — the `reconcile_stripe_checkout` incident (PR #1079) was found only by chance, via an advisor-scan grep. Nothing currently checks for this systematically; a `SELECT proname, count(*) FROM pg_proc WHERE pronamespace IN (...) GROUP BY proname HAVING count(*) > 1` sweep across all non-system schemas would surface any others before they cause the same silent-wrong-function-patched problem again.

---

## Soak status

No feature flag. The billing-authorization fix (PR #1079) closed a real, live, exploitable
security gap (any authenticated user could grant themselves free paid access) — treat this as
having been open in production from the original 4 Sep 2026 baseline squash until 2026-09-09
07:24 UTC. No evidence of exploitation was checked (out of scope for this audit) — worth a
`billing_audit_log`/`stripe_reconciliation` event sweep for any `reconcile_stripe_checkout` call
with a `p_tenant_id` not matching a legitimate Stripe webhook/session, if that's judged worth doing.

---

## References

- PR #1078: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1078
- PR #1079: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1079
- Merge commits: `503ac3243333e27f27129101e1542d7577e57f92` (#1078), `164280ac46e3b7f3f3d2ced0687e9848bd1241db` (#1079)
- Production deployments: https://vercel.com/complyhub/complyhub-rto/DMKbaFSrfp7GE8UnsDqN65eKvPAR (#1078), https://vercel.com/complyhub/complyhub-rto/GEJwAoAm24oCigKiciq1wp9w4VtY (#1079)
- Source living doc: `industry-consultation-survey-issues.md` (workspace root, deleted per Brian's instruction once this audit entry was raised)
- Active work ledger: `active-work.md`
