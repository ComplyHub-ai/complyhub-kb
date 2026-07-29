# Audit — PR #321: TAS Library "Last Updated" Fix + Silent-Catch Logging (29 July 2026)

**Date:** 29 July 2026
**Branch:** `fix/tas-last-updated-and-silent-catches` (deleted post-merge)
**PR:** [#321](https://github.com/ComplyHub-ai/rto-compass-hub/pull/321)
**Merge commit:** `d68f3ffb9`
**Living doc retired:** `tas-last-updated-fix.md` (workspace root) — deleted after this audit per living-doc workflow
**Origin:** `support-tickets-triage.md` § "Last Updated TAS is not correct" (ticket `1b715384-91ad-43e1-a530-60953ba75ff9`, reported by Angela, 8 May 2026). Items 2 and 3 surfaced as adjacent findings while investigating Item 1 (28 Jul 2026).

---

## Purpose

Close out a 3-item body of work: fix the TAS Library dashboard's "Last Updated" column showing a stale date after section edits (Item 1), add visibility logging to a silent-failure pattern in `rpc_get_tas_build_state` discovered while diagnosing Item 1 (Item 2), and resolve a third adjacent finding about two unused RPCs (Item 3, closed with no action).

---

## What was implemented

### Item 1 — `v_tas_progress.updated_at` now reflects all section edits

**Root cause:** the view's `updated_at` column only read `tas_documents.updated_at`. Nothing in the real editing flow (`useTasBuildState.ts`) writes to `tas_documents`, and `tas_builds.updated_at`/`last_activity_at` only move on Compile — not on ordinary section edits (setup, units, market, learners, AOT, delivery, evidence). Editing a section never moved the dashboard date.

**Fix (Option B, locked 28 Jul 2026):** `v_tas_progress.updated_at` rebuilt as a `GREATEST()` across `tas_documents`, `tas_builds`, and per-section `max(updated_at)` subqueries against all seven section tables, mirroring the join logic `rpc_get_tas_build_state` already uses. Migration: `20260729003727_tas_progress_updated_at_from_all_sections.sql`.

**Known, deliberate scope limit:** the units subquery matches only via `tas_build_id`, not the `tas_id`/fuzzy `source_product_code` fallback `rpc_get_tas_build_state` also supports — called out explicitly in the locked plan as a separate, unconfirmed risk kept out of this fix's scope. Both Cursor Bugbot and Vercel's review bot independently flagged this on the PR; confirmed as intentional (not an oversight) and replied on both threads referencing the locked plan. No code change made in response.

### Item 2 — `rpc_get_tas_build_state` silent-catch logging

**Root cause:** ~17 section-readiness checks each wrap `EXCEPTION WHEN OTHERS` and silently fall back to `false` with zero visibility — a real error (permissions failure, dropped column, type mismatch) looks identical to "section genuinely not started."

**Fix (Option A, locked 29 Jul 2026 — minimal, zero behavior change):** added `RAISE WARNING` logging `SQLERRM`/`SQLSTATE` as the first statement in every `EXCEPTION WHEN OTHERS` block, before the existing fallback assignment. No logic, field, or return-value change. Migration: `20260729003820_tas_build_state_log_silent_catches.sql`.

**Process incident caught mid-flight:** the first draft of this migration copied `rpc_get_tas_build_state`'s body from `00000000000000_baseline.sql`. That copy was stale — two migrations already merged to `main` (`20260717061109`, adding `resources_ready`/`resources_checks`; `20260723143058`, fixing a production outage where `jsonb_build_object` exceeded Postgres's 100-argument limit, adding a `sec.claim_tenant_id()` tenant-access guard, and renaming `qual_code`→`training_product_code`) had changed the function since the baseline was generated. Shipping the baseline-based version would have silently reverted all three, re-breaking TAS Builder for every tenant and dropping a security check, while looking like a clean diff. Caught by the `cichecker` skill's `CREATE OR REPLACE` git-history check before merge (after one commit/push had already gone out); fixed in a follow-up commit rebuilding the migration on the current (`20260723143058`) body, adding `RAISE WARNING` to all 17 EXCEPTION blocks (not the 14 the stale copy had).

**Living-rules update from this incident:** added to `rto-compass-hub/supabase/migrations/CLAUDE.md` and `complyhub-kb/pinned/conventions.md` (§ "CREATE OR REPLACE on an existing object — check git history first") — before any `CREATE OR REPLACE FUNCTION`/`VIEW`, run `git log --oneline -- 'supabase/migrations/*<object_name>*'` and base the new migration on the most recent matching file, never the baseline alone. Personal Claude memory (`feedback_create_or_replace_check_git_history_too.md`) merged/broadened to cover both failure modes (live-DB-behind-git from a prior incident, and baseline-behind-git from this one).

### Item 3 — unused RPCs (`rpc_set_build_readiness`, `rpc_update_tas_build`) — closed, no action

Investigated 29 Jul 2026: both functions confirmed unused (only referenced in generated `types.ts`, zero real call sites in `src/` or `supabase/functions/`), created 21 Feb 2026 as part of the original TAS Registry build-out, superseded by `useTasDerivedReadiness`'s live-readiness calculation. Brian's decision: leave both in place on `main` as-is — not causing any issues, no deletion or wiring-up work needed.

---

## Review and verification

- **cichecker:** run twice — first pass caught the Item 2 stale-baseline issue (see above); second pass after the fix reported fully clean (no lint/type-check impact — migrations only; no dropped files; no security-guard hits; `CREATE OR REPLACE` history confirmed current on both objects; branch 0 behind `main`).
- **PR review bots:** Cursor Bugbot + Vercel both flagged the units fuzzy-match scope limitation on Item 1 — triaged against the locked living-doc plan, confirmed intentional, replied on both threads, no fix applied (correctly, per the locked scope).
- **Staging cross-reference:** checked `staging` (Lovable) for conflicts before merge — no overlap with `v_tas_progress`, `rpc_get_tas_build_state`, or any table this PR touches. Two staging-only migration files that looked like open drift on `q1_tas_builder` turned out to already be reconciled on `main` under renamed files; one unrelated staging-only migration (`sa_extend_trial_v2`, billing) and one unrelated genuine drift item (an RLS policy fix on `industry_consultation_survey_responses`, live in production with no git file at all) were surfaced as separate, out-of-scope findings for a future `/audit-branch-drift` pass.
- **Branch DB:** confirmed no `MIGRATIONS_FAILED` on push (Supabase preview branch check, both migrations, seeding, edge functions all green).

---

## Post-merge deployment

| Surface | Action | Status |
|---|---|---|
| Vercel frontend | No frontend changes in this PR (view/function only; `TasLibraryPage.tsx` already read the right column) | N/A |
| Production DB — `v_tas_progress` | Applied via `execute_sql` (interim procedure) | ✅ Confirmed live via `pg_get_viewdef` showing `GREATEST()` |
| Production DB — `rpc_get_tas_build_state` | Applied via `execute_sql` (interim procedure) | ✅ Confirmed live via `pg_get_functiondef` showing `RAISE WARNING` |
| Migration ledger | `supabase migration repair --status applied` for both versions | ✅ Verified `version`/`name` match both files exactly |
| Edge functions | No changes in this PR | N/A |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Item 1 — Option B (full `GREATEST()` across all sections) over the narrower compile-only interim fix | ✅ Shipped |
| Item 1 — units fuzzy-match fallback (`tas_id`/`source_product_code`) explicitly out of scope | Confirmed twice: once at planning (28 Jul), once when two review bots independently flagged it post-PR (29 Jul) — kept as originally locked both times |
| Item 2 — Option A (minimal `RAISE WARNING` logging, zero behavior change) over narrowing `WHEN OTHERS` to specific exceptions | ✅ Shipped — chosen because no way existed to retroactively prove/disprove whether the silent-catch pattern had already hidden a real error; logging creates a forward-looking audit trail at zero user-facing risk |
| Item 2 — migration basis: rebuild on current (`20260723143058`) function, not baseline | ✅ Applied after `cichecker` catch; codified as a permanent rule for future migrations |
| Item 3 — leave unused RPCs in place, no deletion/wiring | ✅ Confirmed, no action |

---

## Files changed (summary)

- **Migrations (2):** `20260729003727_tas_progress_updated_at_from_all_sections.sql`, `20260729003820_tas_build_state_log_silent_catches.sql`
- **Docs:** `rto-compass-hub/supabase/migrations/CLAUDE.md`, `complyhub-kb/pinned/conventions.md` (both: new "CREATE OR REPLACE — check git history first" rule)
- **Personal memory:** `feedback_create_or_replace_check_git_history_too.md` (broadened to cover both live-DB-stale and baseline-stale failure modes)

---

## Notes

- This audit closes the full 3-item body of work. `tas-last-updated-fix.md` deleted per living-doc workflow.
- The `cichecker`-caught stale-baseline incident on Item 2 is the most notable finding from this PR — it's now a permanent, documented check rather than a one-off catch, since the same failure mode (a `CREATE OR REPLACE` drafted from a stale source) had already happened once before with a live-DB fetch instead of the baseline file.
- `support-tickets-triage.md` § "Last Updated TAS is not correct" marked ✅ DONE to close the loop back to the originating ticket.
- The `industry_consultation_survey_responses` RLS drift finding (live in production, no git file) surfaced during the staging cross-reference is **not** part of this closure — flagged separately for a future `/audit-branch-drift` pass.
