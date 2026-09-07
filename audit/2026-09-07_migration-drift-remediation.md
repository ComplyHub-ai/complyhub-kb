# Audit — Migration Drift Remediation (PR 4 / PR 5 / PR 6; PR 7 discarded)

**Date:** 7 September 2026
**PRs:** [#975](https://github.com/ComplyHub-ai/rto-compass-hub/pull/975) "PR 4: squash ~1,050 migration files into a single fresh baseline" (merged 4 Sep 2026, 06:37 UTC — `c5dfcc9df`), [#1012](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1012) "PR 5: atomic apply+ledger-stamp, CI idempotency guard, retire dead drift-ratchet" (merged 7 Sep 2026, 05:53 UTC — `42aa95d11`), [#1013](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1013) "PR 6: restate direct-to-prod ban in AGENTS.md" (merged 7 Sep 2026, 07:04 UTC — `35008bc00`)
**PR 7** ("auto-reconcile bot") — proposed, never branched, discarded 7 Sep 2026 (Brian)
**Living doc (now closed):** `migration-drift-remediation.md`, workspace root — full day-by-day evidence trail; this entry is the durable summary
**Purpose:** Production's migration ledger (`supabase_migrations.schema_migrations`) and the repo's `supabase/migrations/` directory had diverged in both directions since at least 21 Jul 2026. `supabase db push` refused to run at all, the automated apply workflow failed on every single merge, and the divergence grew every time anyone (mainly Angela/RJ, both with legitimate direct Supabase access) applied a change outside the merge-to-`main` path.

---

## Decisions made

- **Squash to a fresh baseline, not backfill 3,600 reconciliation files.** A backfill approach was tried once already (PR #384, 6 Aug 2026) and failed — a reconciliation file that worked in production died on a branch DB because the object it referenced only ever existed in production. A `pg_dump --schema-only` snapshot has zero replay risk by construction; it describes the destination, not a re-enactment of history. Locked 28 Aug 2026.
- **Angela and RJ keep direct production DB access.** An earlier draft proposed revoking it; overruled 28 Aug 2026. The compensating control is a documented convention (§4.3, now in `AGENTS.md`/`supabase/migrations/CLAUDE.md`/`complyhub-kb/pinned/conventions.md`/workspace `CLAUDE.md`) enforced by detection (the drift-check CI job), not by permissions.
- **PR 7 (auto-reconciliation bot) discarded, not built.** It was promoted from "rejected fallback" to "committed work" on 28 Aug 2026 as the detection mechanism's second leg, then discarded outright on 7 Sep 2026 once PR 6 shipped and the project was reviewed as complete without it. Detection today is the drift-check CI job only.
- **Reconciliation-file naming uses the original production `version`+`name`, never today's date.** Confirmed the hard way: 11 files reconciled 13 Jul 2026 under a `YYYYMMDDHHmmss_reconcile_*` pattern still show as unresolved drift today, because `migration-drift-check.yml` matches on exact `version`+`name` string identity, not SQL content.
- **`CREATE OR REPLACE` migrations must be checked with `git log -S` (content search), never a filename-pattern search.** Confirmed twice as a real defect class, not a theoretical one (PR #329, `mark_suggestion_viewed`; and a near-miss on `rpc_get_tas_build_state`, caught by `ci-gate`) — a filename search misses batch migrations named after a ticket rather than the function they touch, and silently regenerating from the stale baseline reverts every change made since.

---

## What shipped

### PR 4 — squash cutover (`feat/pr4-fresh-baseline-cutover`, #975, 100 files, +269,888/−398,042)

The actual dangerous window of the whole project, executed 4 Sep 2026 after four precondition stages (A–D) were independently verified rather than assumed:

- **Stage A (ledger reconciliation, 4 Sep 2026):** one transaction deleted 3,794 orphaned "Category B" ledger rows (ledger row, no file — self-healing by construction, captured by the dump) and inserted 172 "Category A" versions (file, no ledger row) with `statements = NULL` — deliberately marking them "never run this," matching the intent that left them unstamped in the first place. 23 name-mismatched ledger rows (blank names, Lovable-era UUIDs, or wrong-version stems) were corrected in the same transaction. Post-commit invariant (sorted ledger versions == sorted file versions, zero duplicates) passed; `supabase db push` reported the remote database up to date.
- **Stage B (branch-build root cause, 4 Sep 2026):** the assumed cause — "Supabase clones current production schema, then replays migrations, so old non-idempotent files collide" — was refuted by direct dashboard log inspection. The real cause was stale deleted Git refs (`failed to clone repo: couldn't find remote ref ...`), unrelated to the squash. Logged so the squash is never mis-claimed as having fixed branch builds.
- **Stage C (reference-data export, PR #969/#971):** `pg_dump --schema-only` captures no table rows, and 26 tables (status/lookup enums, the 8 Critical Drivers register, `ai_eval_questions`, Help Centre/Release Notes copy, `storage.buckets` rows, `feature_flags`, etc.) were only ever populated by direct `INSERT`s inside migration files being deleted. Exported into `supabase/reference_data.sql`; verified via a real `Fresh Database Verification` GitHub Actions workflow run (not assumed) that all 26 tables populate on a from-scratch build.
- **Stage D (empty-branch risk, PR #970):** verified on a disposable branch that a database built against a one-row collapsed ledger comes up with schema present, not empty — the one residual uncertainty that could have invalidated the whole cutover.
- **The cutover itself:** ~1,050 superseded `.sql` files squashed into a fresh 20-slice `pg_dump`-based baseline (`20260904035951_baseline_01.sql` … `20260904040010_baseline_20.sql` — split after a single-file apply hit `out of shared memory`). Post-cutover schema diff: 14,140 vs 14,139 objects, full parity, every discrepancy traced to dump-tool formatting noise.
- Two follow-up commits on the same branch addressed bot review findings on the baseline split.

### PR 5 — apply workflow hardening (`fix/migration-apply-workflow-hardening`, #1012, 16 files, +559/−1,168)

- **Atomic apply+ledger-stamp.** The apply workflow used to `psql`-apply a migration then separately call `supabase migration repair` to stamp the ledger — two operations, so a failure between them silently produced a fresh orphaned ledger row (the exact mechanism that caused the original ~2,000-version backlog, just automated). The ledger `INSERT` now runs inside the same `psql -1` transaction as the migration body.
- **CI idempotency guard (blocking).** New migrations must now pass a check requiring `CREATE TABLE`/`CREATE INDEX`/`CREATE UNIQUE INDEX` to use `IF NOT EXISTS`, `CREATE POLICY` to have a matching `DROP POLICY IF EXISTS`, and `CREATE TYPE` to be wrapped in a `pg_type` existence check — required now that a partial-failure retry can no longer be hand-patched the old way.
- **Retired the dead drift-ratchet** (a high-water-mark ratchet mechanism no longer serving a purpose post-squash).
- Commit history: `f5ccadeab` (initial), `5adc1adf3` (rewrite + doc pass), `6df72b6a4`/`401323ad3` (removed a stale `AUDIT-REPORT.md` and fixed dangling references to it), `bbb06c91f` (addressed 5 Copilot review findings — an `allowed-deletions.txt` entry, a transaction-control CI guard, a name-aware `CREATE POLICY` guard, removing two stale drift-check exemptions, a wording correction).
- **Not yet field-proven at merge time** — the living doc explicitly flagged that the previous non-atomic workflow's 8+ consecutive successes (6–7 Sep) only validate the ledger-state pending-detection design, not the new atomic rewrite itself; that needed the next real merge to confirm. PR #1013 (below) was that merge.

### PR 6 — migration discipline docs rewrite (`docs/migration-discipline-post-squash`, #1013, 1 file, +1/−0)

Scoped down from its original 4-file brief after recon found 3 of 4 targets already current (`supabase/migrations/CLAUDE.md` and the workspace `CLAUDE.md` had already been rewritten, apparently alongside PR 5's own doc pass):

- **`AGENTS.md`** — added the one bullet actually missing: the §4.3 convention stated explicitly (no dashboard SQL Editor, no MCP/AI-tool schema changes, no `apply_migration` for an existing file), not just implied via "apply is automatic."
- **`complyhub-kb/pinned/conventions.md`** (committed directly to `main`, `cf444b8`, then a follow-up correction — see "Still open" below) — two real stale/contradictory fixes, not just wording: the "Baseline-first migration rule" caveat was still instructing a manual `apply_migration` step after merge, the exact thing now banned; and the `CREATE OR REPLACE` guidance used a filename-search `git log` command instead of the correct `-S` content-search form. Also added the §4.3 convention verbatim, and bumped the doc's "last updated" date.
- This merge (07:04 UTC, 7 Sep) was also the first real-world confirmation that PR 5's atomic apply+stamp rewrite works end to end in production — `AGENTS.md` isn't a migration, so it doesn't test the apply path itself, but the merge landing cleanly with no CI regression on the hardened `migration-guards` job is the closest available confirmation at time of writing; no `supabase/migrations/*.sql` has yet been merged since PR 5.

### PR 7 — auto-reconcile bot — discarded, nothing built

Proposed 28 Aug 2026: a scheduled job reading ledger rows with no matching file, opening a PR with the reconciliation `.sql` from the row's stored `statements`. Discarded 7 Sep 2026 before any branch was created. Detection for direct-to-prod changes remains the drift-check CI job alone.

---

## Review rounds

- **PR 975 (PR 4):** bot review round on the baseline-split commit (`71451f193` addresses its findings); §4.4's four-stage precondition verification (A–D) functioned as an independent adversarial check on the squash approach itself, refuting one of its own premises (Stage B) along the way.
- **PR 1012 (PR 5):** Copilot review round, 5 findings, all fixed in `bbb06c91f`.
- **PR 1013 (PR 6):** recon-before-write caught that 3 of the 4 originally-scoped files needed no change, and separately caught two real stale/contradictory sections in `conventions.md` that weren't in the original brief (the `apply_migration` caveat and the filename-search command) — both are the kind of defect a plain "update the docs" pass would have missed if the file weren't actually read end to end.

---

## Production rollout (post-merge)

1. **Database (production Supabase project)** — the actual subject of this project. Verified directly, not inferred: post-cutover object-identity diff (14,140 vs 14,139, zero real discrepancies), `supabase db push` reporting up to date, and the `Fresh Database Verification` / Stage D disposable-branch workflow runs (PR #970/#971).
2. **Apply workflow** — `Apply Supabase Migrations` GitHub Actions workflow; atomic rewrite merged in PR 5. No migration has merged since to exercise it end to end (see "Still open").
3. **No Vercel/frontend deploy involved** — this project touched `supabase/migrations/`, CI workflow YAML, and documentation only; nothing in `src/`.
4. **Worktrees** — Worktree C (`rto-compass-hub-C`) was used for PR 6 (branched fresh off `origin/main` after its prior stale branch `feat/risk-treatment-suggestions` was confirmed already merged), then released back to `standby/worktree-C` after #1013 merged. `active-work.md` registry row released to unclaimed.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Confirm the freeze-lifted announcement to Angela/RJ/Carl was actually sent — the living doc flagged this as PR 4's one outstanding precondition item, still unconfirmed as of this writing.
- [ ] Watch the next real `supabase/migrations/*.sql` merge to `main` and confirm the atomic apply+stamp workflow (PR 5) completes `success` in production — this is still unproven in the field, only reasoned-through and unit-checked.
- [ ] Spot-check a few of the 172 deliberately-unstamped Category A migration versions in `list_migrations` to confirm they still read as intentionally-skipped, not accidentally re-queued.

---

## Still open / follow-up

- **`complyhub-kb/pinned/conventions.md` has one further uncommitted edit** from this same session, correcting a forward-reference this project itself introduced — PR 6's commit said "an auto-reconciliation bot is planned but not yet built," which became stale the moment PR 7 was discarded a few minutes later. Corrected locally to say "proposed then discarded" — **not yet committed or pushed**, pending explicit go-ahead (commit/push gate).
- **PR 7 stays discarded** — do not resume without a fresh FRAME per the living doc's own note. If direct-to-prod detection ever needs strengthening beyond the CI drift-check job, that's a new decision, not a revival of the old PR 7 scope.
- Living doc `migration-drift-remediation.md` (workspace root) is now fully superseded by this entry and PR 6's living-doc-workflow disposal rule — it should be deleted per that rule once Brian confirms this audit entry is sufficient.

---

## Soak status

Not a feature flag — this is infrastructure (migration tooling), not user-facing product behaviour. Risk is concentrated in the untested-in-the-field atomic apply+stamp path (PR 5); watch the next migration merge as the real soak signal, per the QA checklist above.

---

## References

- PRs: [#975](https://github.com/ComplyHub-ai/rto-compass-hub/pull/975), [#1012](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1012), [#1013](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1013)
- Merge commits: `c5dfcc9dfd8a3d405d1657b0f5108ad319e56e57`, `42aa95d11d23bf8c3d84cae34645f23367289574`, `35008bc00f162e0cc921248ce6e0dfdac90856d9`
- Source living doc: `migration-drift-remediation.md` (workspace root — pending deletion per living-doc workflow)
- Active work ledger: `active-work.md`
- Related Stage C/D verification PRs: #969, #970, #971
