# Audit — PR #801

> **Date:** 27 August 2026 (audit written); **Merged:** 26 August 2026 23:40 UTC
> **Scope:** Roll out ComplyBot's agentic tool-use retrieval path (`complybot_tool_retrieval` flag)
> from the Vivacity Testing Tenant only to all tenants, globally and durably
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `complybot-rag-improvement.md` (workspace
> root — the source of this PR and the whole preceding ComplyBot RAG body of work; not yet deleted)

---

## Summary

What began as a single-purpose feature-flag rollout (extend `complybot_tool_retrieval` from one
test tenant to a `tenant_id IS NULL` global default row) grew through three review rounds into a
four-commit PR that also fixed a live production bug, closed a real database-level idempotency gap,
and reconciled 10 unrelated pre-existing migrations that CI's drift check surfaced along the way.

The original draft's migration would not have run at all: a live audit trigger on `feature_flags`
enforced `NOT NULL` on both `tenant_id` and `actor_id` in its audit-log table, and a global
(tenant-less) row inserted with no authenticated session violates both. This was caught for real —
the branch's first CI run failed with the exact `23502` not-null violation — not hypothetically.
Copilot's PR review then caught three further issues before merge: a genuine migration-version
collision with an unrelated already-merged migration, a real idempotency gap (the original
existence-check guard didn't actually stop a second global row under Postgres's NULL-distinctness
rule), and a misleading code comment. All four were verified against live schema/triggers/indexes
via `/verify-bot-fix` before fixing — none were false positives.

**Branch:** `feat/complybot-global-rollout` (merged) · **Merge commit:** `cd8c439a6` ·
**Migrations:** 11 new (1 substantive + 10 reconciliation, see below) · **Edge functions:** 1
(`ai-router`, one file changed) · **Frontend:** 1 file (`useFeatureFlagsAdmin.ts`)

**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/801

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| `complybot_tool_retrieval` flag | Only the Vivacity Testing Tenant ever got ComplyBot's newer, more accurate retrieval mode | The feature-flag lookup only ever checked an exact `tenant_id` match — no concept of a global default existed in the code or schema |
| **(CI finding — real, not hypothetical)** original migration | Branch-DB build failed with `ERROR: null value in column "tenant_id" of relation "feature_flag_audit_events" violates not-null constraint (SQLSTATE 23502)` | Live trigger `trg_feature_flag_audit` → `log_feature_flag_change()` writes `tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)` and `actor_id = auth.uid()` into `feature_flag_audit_events`, both `NOT NULL`. A global row has no tenant, and a migration has no authenticated session — both legitimately `NULL`, which the schema didn't allow |
| **(Copilot finding, HIGH)** migration filename | Two files shared version `20260826120000` (this PR's and an unrelated already-merged migration) | Both authored/merged around the same timestamp with no coordination — Supabase migration versions must be unique |
| **(Copilot finding, MEDIUM)** idempotency guard | The `IF NOT EXISTS` existence-check guard did not actually prevent a second global row | Postgres treats `NULL` as distinct from `NULL` under the table's `(tenant_id, flag_key)` unique constraint, so a concurrent insert or a future admin "Create Flag" action could still create a duplicate global row — which would make `ai-router`'s `.maybeSingle()` lookup error and silently fall back to legacy retrieval for every tenant |
| **(Copilot finding, LOW)** code comment | A comment in `useFeatureFlagsAdmin.ts` claimed `'draft'`/`'active'` were the only real status values | `FeatureFlags.tsx` also actively reads/writes a `'retired'` status — the comment could have misled a future edit into treating retirement as unreal |
| **(pre-existing, in-scope only because this PR touched the file)** `useFeatureFlagsAdmin.ts` | CI's "Block .single() usage" check failed | Two pre-existing `.single()` calls (`toggleFlag`, `updateFlag`) — CI scopes to the whole content of any changed file, not just new lines |
| **(surfaced by CI, unrelated to ComplyBot)** Migration drift check | 10 production migrations flagged with no matching git file | TAS evidence-index and labour-market workforce-mapping changes applied directly to production outside the normal PR flow by other, unrelated work — reconciled here per Brian's explicit instruction rather than deferred |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `40ddf546e` | Initial rollout — global-default lookup added to `featureFlags.ts`, migration inserting the global row, tests rewritten for the two-lookup flow, `useFeatureFlagsAdmin.ts` toggle-status bug fixed (from an earlier fresh-eyes pass in the same session). |
| `cf4cb123f` | Copilot round 1 fixes — migration renamed off the colliding version; `feature_flag_audit_events.tenant_id`/`actor_id` relaxed to nullable; partial unique index added + insert switched to `ON CONFLICT DO NOTHING`; misleading comment corrected. All 4 findings verified via `/verify-bot-fix` before fixing. |
| `db4d8e51f` | Fixed the "Block .single() usage" CI failure — swapped both pre-existing `.single()` calls to `.maybeSingle()` + explicit not-found error. |
| `afe7085cb` | Reconciled 10 unrelated production migrations (TAS evidence index, labour market workforce mapping) that the migration-drift check surfaced — each filed under its exact original production version+name, SQL captured verbatim from `supabase_migrations.schema_migrations`. |
| `cd8c439a6` (merge) | PR merged to `main`. |

---

## Fixes shipped

### Edge functions

**`ai-router`** (`supabase/functions/ai-router/featureFlags.ts`) — `isToolRetrievalEnabled()` now
does two sequential lookups instead of one: an exact `tenant_id` match first (unchanged — a
tenant-specific row still wins, so a tenant can be force-enabled/disabled as an override), then a
`tenant_id IS NULL` global-default row if no tenant-specific row exists. Fail-safe behaviour
preserved through both branches — any error, missing row, or non-active status still resolves to
`false` (legacy ILIKE retrieval), never `true`. `featureFlags_test.ts` rewritten with a
response-queue mock that tracks which query method (`.eq()` vs `.is()`) built each call, so the
suite genuinely fails if the global lookup regresses to `.eq('tenant_id', null)` (which silently
never matches a SQL NULL in PostgREST) — the original draft's tests could not have caught this.

Deployed automatically on merge to `main`. Verified via Supabase MCP `get_edge_function`: live
version 575, updated within seconds of the merge commit, source confirmed to contain the new
global-lookup code (`tenant_id IS NULL`, `globalRow`) matching git exactly.

### Frontend

**`src/hooks/useFeatureFlagsAdmin.ts`** —
- Fixed the toggle mutation writing `status: 'enabled'/'disabled'`, values `ai-router`'s reader
  never checks for (only `'active'` is read as "on"). Low-impact while scoped to one test tenant;
  fixed here because this rollout makes the toggle the global switch for every tenant.
- Swapped both `.single()` calls (`toggleFlag`, `updateFlag`) to `.maybeSingle()` + an explicit
  not-found error, to clear the "Block .single() usage" CI check. Neither call site actually
  consumed the returned row (`onSuccess` uses `variables`, not `data`), so this was a safe,
  behaviour-preserving swap.
- Corrected a comment that incorrectly implied `'retired'` wasn't a real status value.

### Database

**New migration:** `20260827063000_complybot_tool_retrieval_global_default.sql` —
- Relaxes `feature_flag_audit_events.tenant_id`/`.actor_id` to nullable (both legitimately absent
  for a system/global-scope change with no owning tenant or acting human).
- Adds a partial unique index (`feature_flags_one_global_row_per_flag_key`, on
  `flag_key WHERE tenant_id IS NULL`) enforcing at most one global row per flag — a real database
  invariant, not just an application-level existence check.
- Inserts the single global row for `complybot_tool_retrieval`, idempotent via
  `ON CONFLICT (flag_key) WHERE tenant_id IS NULL DO NOTHING` against the new index.

**Reconciliation migrations (10, unrelated to ComplyBot):**
`20260826063255_add_legacy_consultation_scope_to_evidence_index.sql`,
`20260826065507_cleanup_tas_evidence_cached_derivatives_followup.sql`,
`20260826072225_restore_legacy_consultation_evidence_cache_followup.sql`,
`20260826073834_narrow_consultation_score_invalidation_followup.sql`,
`20260826074942_cleanup_remaining_invalid_tas_consultation_evidence_v2.sql`,
`20260826075012_repair_labour_market_workforce_mapping_prod_drift.sql`,
`20260826075119_seed_hltaid011_labour_market_resolution_profile.sql`,
`20260826075127_cleanup_orphaned_tas_consultation_evidence.sql`,
`20260826075536_cleanup_stale_unbacked_tas_external_market_evidence.sql`,
`20260826082205_repair_labour_market_snapshot_cache_jsonb_count_preserve_defaults.sql` — each filed
under its exact original production version+name per `supabase/migrations/CLAUDE.md`'s
reconciliation naming rule, body captured verbatim from
`supabase_migrations.schema_migrations.statements`. No schema/behaviour change from these files —
production already had them applied; this only makes git match what's live. TAS/labour-market
domain, not reviewed for correctness beyond faithful verbatim capture (out of scope for this PR).

**Applied to production** 27 Aug 2026 via the interim procedure — only the new substantive migration
needed an `execute_sql` step (the 10 reconciliation files were already live, that's what made them
reconcilable rather than needing application). Ledger repair run by Brian from terminal:
`supabase migration repair --status applied 20260827063000`. Post-repair ledger verified:
`version`/`name` match the git filename exactly.

**Live verification after apply:**
- `feature_flag_audit_events.tenant_id`/`.actor_id` both confirmed `is_nullable = YES`.
- `feature_flags_one_global_row_per_flag_key` confirmed present via `pg_indexes`.
- `feature_flags` confirmed to have exactly two rows for `complybot_tool_retrieval`: the global
  default (`tenant_id: null, is_enabled: true, status: active`) and the untouched Vivacity Testing
  Tenant override row.
- `supabase migration list --linked` confirmed all 10 reconciliation versions show matched
  `Local | Remote`, and `20260827063000` shows matched after the repair.

---

## Review rounds

1. **`/checker` fresh-eyes review** (pre-first-commit, live-DB verified) — 1 confirmed bug (the
   `useFeatureFlagsAdmin.ts` toggle-status mismatch, pre-existing but amplified in blast radius by
   this rollout), 2 test-quality issues (mock couldn't distinguish `.eq()`/`.is()`; one test's
   response queue too short to catch a regression), rest cleared against live schema/RLS/constraints
   before the first commit was made.
2. **Branch-DB CI (real failure, not review commentary)** — the original migration failed on push
   with the exact `23502` not-null violation later diagnosed and fixed.
3. **Copilot PR review** — 4 findings, all verified via `/verify-bot-fix` against live
   triggers/indexes/schema before fixing (migration collision, audit-trigger NOT NULL violation,
   missing partial unique index, misleading comment). Zero false positives.
4. **Migration drift check (CI)** — surfaced 10 production migrations unrelated to this PR's
   original scope; reconciled in the same PR per Brian's explicit direction.
5. **"Block .single() usage" CI check** — failed on two pre-existing calls in a file this PR already
   touched; fixed directly.

**Zero false positives across the fresh-eyes pass and Copilot review** — every finding raised was
verified real against either the live database or the actual call-site code before being treated as
confirmed.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_FmsjeweBoSKMyLfFcGtcqYHX9Br6`, `state: READY`,
   `target: production`, commit `cd8c439a6a6a571bcc2ae013a147de9c9b745b9e` (exact merge commit),
   `githubCommitVerification: verified`.
2. **Edge functions** — `ai-router` v575 confirmed live and containing the new global-lookup code,
   updated within seconds of the merge commit (via `get_edge_function`).
3. **Migrations** — `20260827063000` applied via `execute_sql` + `migration repair`; ledger verified
   post-repair. The 10 reconciliation files needed no execute step (already live) and were already
   correctly recorded in the ledger before this PR — reconciling them only closed the git-vs-prod
   gap, not a ledger gap.
4. **Worktrees** — worktree A released in `active-work.md`, reset to `standby/worktree-a` @
   `cd8c439a6` (matches `main`; `main` itself is checked out in worktree C, so the standby-branch
   teardown path was used per the two-worktrees procedure).

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Spot-check ComplyBot compliance-mode answers for a non-Vivacity tenant to confirm the new
  retrieval path is actually serving them now (this was explicitly still open in the PR's own test
  plan at merge time — not yet performed as of this audit)
- [ ] Toggle a feature flag off then back on via the Feature Flags admin screen and confirm it reads
  as genuinely active afterward (regression check for the toggle-status bug fixed in this PR)
- [ ] Confirm a tenant-specific override row (e.g. re-testing the Vivacity Testing Tenant path)
  still works correctly now that a global row also exists

---

## Still open / follow-up

- **Manual QA above** — not yet performed as of this audit.
- **ComplyBot Phase 4 eval baseline (separate work, same session)** — 89.6% selection accuracy
  (43/48), 5 misses. 3 of the 5 (zero citations despite closely-matching clause titles) still need a
  Scout investigation into root cause — not a title-authoring issue as first assumed, actual cause
  undiagnosed. Not part of this PR; tracked in `active-work.md` and `complybot-rag-improvement.md`.
- **`complybot-rag-improvement.md`** — the living doc this PR (and the broader ComplyBot RAG body of
  work) implemented; not yet deleted as of this audit.
- **#9 trial usage cap** — explicitly reversed by Brian during this session (decided not to build a
  usage cap for trial tenants at all). Recorded in the living doc; not part of this PR's scope.
- **10 reconciliation migrations' domain correctness** — captured verbatim from production, not
  independently reviewed for TAS/labour-market correctness (out of scope for a ComplyBot PR); if a
  bug in that domain surfaces later, these files are a faithful record of what was already live, not
  a place to look for a new defect introduced by this PR.

---

## Soak status

Feature flag: `complybot_tool_retrieval`, now live globally via a `tenant_id IS NULL` default row
(fail-safe to legacy ILIKE retrieval on any error). Any individual tenant can still be force-disabled
by inserting its own `tenant_id`-scoped row with `is_enabled = false` — no code change needed for a
rollback of a single tenant. A full rollback (disable for everyone) is a single `UPDATE
feature_flags SET is_enabled = false WHERE flag_key = 'complybot_tool_retrieval' AND tenant_id IS
NULL` — no redeploy required. Watch `complybot_response_logs.retrieval_strategy` for an unexpected
share of `ilike_v1` rows post-rollout, which would indicate the global row isn't being read for some
tenants (e.g. a JWT/tenant-context edge case not covered by this PR's tests).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/801
- Merge commit: `cd8c439a6a6a571bcc2ae013a147de9c9b745b9e`
- Migration (substantive): `supabase/migrations/20260827063000_complybot_tool_retrieval_global_default.sql`
- Migrations (reconciliation, 10): `supabase/migrations/20260826063255_*.sql` through `20260826082205_*.sql`
- Edge function: `supabase/functions/ai-router/featureFlags.ts` (+ `featureFlags_test.ts`)
- Source living doc: `complybot-rag-improvement.md` (workspace root)
- Reference guide: `complyhub-kb/reference/complybot-guide.md`
- Active work ledger: `active-work.md` (worktree A row — released)
