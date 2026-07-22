# Audit — PR #196 + #197: Migration Drift Reconciliation, Ratchet Redesign, Ledger Repair (14 July 2026)

**Date:** 14 July 2026
**Branches:** `fix/reconcile-migration-filenames` (#196), `fix/drift-check-bugbot-findings` (#197)
**PRs:** [#196](https://github.com/ComplyHub-ai/rto-compass-hub/pull/196), [#197](https://github.com/ComplyHub-ai/rto-compass-hub/pull/197)
**Merged by:** Brian (Khian)
**Merge commits:** `6843d86a` (#196), `f09280d7` (#197)
**Purpose:** Investigated why `migration-drift-check.yml` was red on PR #153; found and fixed the root cause (a reconciliation-file naming bug that permanently defeats the check's matching logic); redesigned the check from a fixed-zero gate into a baseline ratchet; applied PR #153's pending migrations; repaired a duplicate-execution incident discovered along the way; fixed two Bugbot findings on the redesign itself.

---

## Background

PR #153 (`feat/auto-mark-sso-reports-before-close`) merged with `Migration Drift Check` red. Handover doc assumed this was long-standing Lovable-era drift and asked whether #153 needed to wait on it. Investigation found the check's failure was pre-existing and unrelated to #153 — but tracing *why* it was pre-existing, and how large, surfaced a chain of real issues worth recording in full.

---

## What was found

### 1 — The drift backlog is recent, not Lovable-era history

Reproduced the CI drift-check's own matching logic against live `schema_migrations` data. The 544 flagged rows span **27 March – 13 July 2026**, not pre-2026 Lovable history as `supabase/migrations/CLAUDE.md` assumed. Names are descriptive, batch-labeled (`h1a_`, `c4a_`, `batch01-04b`), matching Angela's security-remediation work — confirmed via a prior commit (`c8c1a901`, "Reconcile Angela's 12 Jul security remediation batches into migration files") that this is Angela applying SQL directly to production, outside the PR/migration-file workflow, on an ongoing basis.

### 2 — A second CI workflow has been silently broken since it was added

`.github/workflows/supabase-migrations.yml` ("Apply Supabase Migrations", added 19 Jun 2026) auto-applies pending migrations on every push to `main` that touches `supabase/migrations/**.sql`. Checked its last 10+ runs — **all failed**, every time, at the first `supabase db push` step, before applying anything — because `db push` refuses to run at all when it finds any production migration version with no exact-matching local file (thousands, due to the backlog above). Not a required PR check, so nobody had been watching its failures. Confirms migrations have never been auto-applied by this path; the "manual apply after merge" discipline (`[[project_migrations_not_auto_applied]]`) is the only path that has ever worked.

### 3 — The 13 Jul reconciliation was correct in substance, wrong in filename

The prior reconciliation commit (`c8c1a901`) wrote 11 files capturing SQL Angela had applied directly to production, verbatim from `schema_migrations.statements`. But it named them with the reconciliation date and a `reconcile_` prefix (e.g. `20260713100500_reconcile_h1a_revoke_anon_execute_trigger_fn.sql`) instead of the original production `version`/`name` (`20260712014730`/`h1a_revoke_anon_execute_trigger_fn`). `migration-drift-check.yml` matches production rows to git files by **exact** version+name identity, not SQL content — so all 11 still showed as unresolved drift a day later, despite being correctly captured. `supabase/migrations/CLAUDE.md` was independently found to be *prescribing* this exact wrong pattern (`YYYYMMDDHHmmss_reconcile_description.sql`) — the prior author followed the doc correctly; the doc itself was wrong.

### 4 — The 13 Jul reconciliation was also double-applied to production

While computing an accurate current baseline, found that when the 13 Jul reconciliation PR was applied to production per the normal "apply immediately after merge" step, `apply_migration` re-ran the already-live SQL and stamped **11 new duplicate ledger rows** (`reconcile_batch01_...` etc., version ~`20260713024013`–`24136`) on top of the originals (12 Jul). Harmless — the SQL was defensive enough to rerun without erroring — but left 22 ledger entries for 11 real changes.

---

## What was fixed

### PR #196 — `fix/reconcile-migration-filenames`

- **Applied PR #153's 7 pending migrations to production** (email-outbox enum fix, `notify_meeting_scheduled`, trainer report email reminders, governance meeting time-persistence fix, two Bugbot-finding fixes, `email_outbox.claimed_at`). Verified live via `list_migrations`.
- **Renamed the 11 mislabeled reconciliation files** to their true production `version_name` (content unchanged — verified `git diff --numstat` shows 0/0 per file, and each new filename verified to exactly match its production row's `version`+`name`).
- **Fixed `supabase/migrations/CLAUDE.md`** — replaced the wrong naming instruction with the correct one (use the original production version+name; backdating is safe because `supabase db push` treats a matching version as already-applied and skips it, and correctly runs it once on a fresh branch DB where that version doesn't exist).
- **Redesigned `migration-drift-check.yml` from a fixed-zero gate into a baseline ratchet:**
  - Fixed a permanent false-positive: the `00000000000000` baseline pseudo-row was excluded from the git-side stem comparison but not the production-side check, so it could never match regardless of any real fix. Now excluded on both sides.
  - Added `supabase/migrations/.drift-baseline.txt` — a checked-in snapshot (543 rows at the time, computed against the post-rename git state) of currently known/accepted orphaned production rows. The check now hard-fails only on drift **not** in the baseline (new/regressed); baseline rows are informational only.
  - Downgraded "main has migrations not applied to production" from a hard fail to a warning — it depends only on `origin/main` vs. production, not the PR's diff, so no code review can fix it.
- Verified end-to-end against live production data before pushing (11/11 renamed files exact-match production rows; simulated new check logic returns PASS with 0 new-drift entries).
- Merged. Real CI confirmed: `Migration drift check` **passed**; `Apply Supabase Migrations` still failed the same known way (unchanged root cause, no regression introduced).

### Ledger repair (between PR #196 and #197)

Removed the 11 duplicate rows created by the double-apply incident (item 4 above) directly from `supabase_migrations.schema_migrations` via `execute_sql` (equivalent to `supabase migration repair --status reverted`). Verified before (11 present) and after (0 remaining; original 11 real rows confirmed still intact).

### PR #197 — `fix/drift-check-bugbot-findings`

Ran the `verify-bot-fix` process against two Cursor Bugbot findings on PR #196 (commit `5a836ad`) before touching anything — both confirmed still present in current HEAD, not stale/already-fixed:

| # | Finding | Verdict | Fix |
|---|---|---|---|
| 1 | False "in sync" success message | CONFIRMED | The all-clear print condition didn't check `main_not_applied` (downgraded to warning-only in #196). With the real 59-migration pending-apply backlog, it would have printed "Main and production are in sync" beside its own contradicting warning. Added the missing condition; verified against real data that it now correctly prints "clean, but not fully in sync." |
| 2 | Baseline edits skip the check | CONFIRMED | `paths: ['supabase/migrations/**.sql']` doesn't match `.drift-baseline.txt` or the workflow file itself, so a baseline-only edit would silently skip the check even though pass/fail now depends on that file. Added both paths to the trigger. |

Also pruned the 11 now-stale baseline entries (543 → 532 lines) corresponding to the duplicate rows removed in the repair step above.

Merged. Real CI confirmed the path-filter fix directly: this PR touches no `.sql` files, and the drift check still triggered and passed, printing the corrected "No NEW drift detected" message (not the false all-clear) alongside the real 60-migration pending-apply warning.

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Fix the check's design (ratchet + baseline) rather than exclude/ignore the backlog | A blanket exclusion would permanently blind the check to a whole class of real drift; the ratchet keeps catching new drift while not punishing unrelated PRs for pre-existing debt. |
| Rename reconciliation files to backdated original version+name, not "now" | Matches how the CLI's own version-matching already works — no CI code change needed for this half of the fix, just a naming discipline documented in both `complyhub-kb/pinned/conventions.md` and `supabase/migrations/CLAUDE.md`. |
| Repair the 11 duplicate ledger rows via direct `DELETE` rather than leave them in the baseline forever | They were pure bookkeeping noise from an accidental double-apply, not a real schema change needing a git record — cleanup is more correct than permanently tolerating them. |
| Apply the 7 PR #153 migrations now; defer the 59 older pending migrations and the ~521-row backlog | The 7 were fresh, well-understood, just-reviewed changes. The 59 and the historical backlog are a separate, larger, higher-risk body of work (discussed at length: migration-ordering hazards, non-replayable statement patterns, secrets/PII scan, shared branch-DB blast radius) that needs its own deliberate, batched, Carl/Dave-involved pass — not folded into this cleanup. |
| Loop Carl in before any CI-config change | Per team ownership split (`CLAUDE.local.md`) — CI guardrails are Carl's domain. Both workflow changes were surfaced conceptually before drafting, and are visible in the PRs for his review. |

---

## Files changed

**PR #196** (14 files): 11 renamed migration files (content unchanged), `supabase/migrations/CLAUDE.md`, `.github/workflows/migration-drift-check.yml`, new `supabase/migrations/.drift-baseline.txt`.

**PR #197** (2 files): `.github/workflows/migration-drift-check.yml`, `supabase/migrations/.drift-baseline.txt`.

**Production (direct, via MCP, not git-tracked):** 7 migrations applied (see PR #196 list above); 11 duplicate `schema_migrations` rows deleted.

---

## Notes

- Also updated `complyhub-kb/pinned/conventions.md` with the same reconciliation-naming rule as the `supabase/migrations/CLAUDE.md` fix, and a personal memory entry (`feedback_reconciliation_migration_naming.md`) — so the naming discipline is visible both in the codebase doc and in cross-session AI memory.
- **Not done this round, flagged for follow-up:** the 59 older pending migrations (25 May–13 Jul) still need production apply; the ~521-row remaining backlog needs the full batched reconciliation project (extraction script, month-sized batches, branch-DB verification per batch, secrets/PII scan, Carl/Dave sign-off before starting — see conversation for full risk analysis); a minor cosmetic bug where `main_not_applied`'s count includes the baseline file itself (`get_migration_stems()`'s exclusion checks `stem != "00000000000000"`, but the real file's stem is `"00000000000000_baseline"`, so the filter never matches it) — inflates the warning count by 1, does not affect pass/fail.
- `Apply Supabase Migrations` (the auto-apply Action) remains broken and will stay broken until the full backlog is reconciled — every push touching a migration file will keep failing it. This is expected and unchanged by this work; not a regression.
