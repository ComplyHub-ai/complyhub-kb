# Audit — PR #500

> **Date:** 19 August 2026 (audit written); **Merged:** 19 August 2026 04:47 UTC
> **Scope:** ComplyBot RAG improvement Phase 0 — honest KB-miss fallback in `ai-router`, plus
> reconciliation of 4 unrelated direct-to-prod `standalone_forms` migrations discovered blocking
> this PR's drift check
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `complybot-rag-improvement.md`
> (workspace root) — this PR closes out §4A's "PR 3" row and Phase 0

---

## Summary

ComplyBot's Compliance-mode retrieval (`ai-router/index.ts`) previously fell back to injecting 15
arbitrary, unrelated legislation clauses whenever its `ILIKE` keyword search found nothing —
under a system-prompt instruction telling the model to "answer ONLY from this content." This was
Phase 0 of the locked `complybot-rag-improvement.md` plan: stop that dishonest fallback, and start
recording real KB misses so the data exists for the "Gaps" tab planned in Phase 3.

Mid-flight, the PR's migration drift check failed on 4 production migrations
(`standalone_forms` schema, applied directly to prod ~04:01–04:12 UTC the same morning, unrelated
to ComplyBot) that had no matching git file. Rather than block the PR on someone else's drift, the
exact SQL was pulled verbatim from `supabase_migrations.schema_migrations.statements` and
committed as 4 reconciliation migration files named with their original production version+name,
clearing the drift check without applying anything new (the schema was already live).

PR #500 touched **6 files** (+382 / −15 lines): one `ai-router` edit, one genuinely new migration
(`retrieval_strategy` column), and 4 reconciliation migrations for the unrelated drift. **No new
edge functions.** A Reviewer (fresh-eyes adversarial) subagent pass, including a live DB schema
check, returned **SHIP** with no defects before merge.

**Branch:** `fix/complybot-phase0-honest-fallback` (merged) · **Merge commit:** `b899ce6e0` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/500

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| ComplyBot (`ai-router`) | Compliance-mode answers cited irrelevant clauses instead of admitting "I don't know" | `queryLegislationKnowledgeBase`'s empty-match branch ran `.limit(15)` with no `WHERE` clause and injected the result under "Answer ONLY from this content," regardless of relevance |
| ComplyBot telemetry | `kb_miss` column existed but was never set — silently `false` on every row, including real misses | The single `complybot_response_logs` insert site never referenced `kb_miss` at all |
| **(mid-PR finding)** CI / migrations | Migration drift check failed with "4 NEW production migration(s) with no matching file on main" | 4 `standalone_forms`-related migrations were applied directly to production (~04:01–04:12 UTC, 19 Aug 2026) by an unrelated, concurrent feature (PR #499), bypassing git entirely |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `24f2ca363` | Honest KB-miss fallback: `queryLegislationKnowledgeBase` returns `kbMiss: true` instead of 15 arbitrary clauses; Compliance-mode system prompt conditional on a real match; `kb_miss`/`retrieval_strategy` written on every response-log insert; new migration adding `retrieval_strategy text`. |
| `40dc05ba6` | Merge `origin/main` (routine catch-up, no conflicts). |
| `c6fa8c4a1` | Reconciliation: 4 migration files capturing the `standalone_forms` SQL already live in production, named with original production version+name per `supabase/migrations/CLAUDE.md`'s reconciliation rule. |

Merge commit: `b899ce6e0c2878e64b44b7778b7c013ec579512e` (PR #500).

---

## Fixes shipped

### Edge functions

- **`supabase/functions/ai-router/index.ts`** — `queryLegislationKnowledgeBase()` no longer falls
  back to `.limit(15)` with no `WHERE` clause; on a miss (including a DB error path) it now returns
  `{ clauses: [], relevantText: '', kbMiss: true }`. The Compliance-mode system-prompt block is now
  a ternary: real match → unchanged "answer ONLY from this content" wording; miss → new wording
  instructing the model to say so plainly and give caveated general guidance only, verified against
  the actual instrument. `kbMiss`/`retrievalStrategy` (`'ilike_v1'` for every compliance-mode call)
  are now written on the single `complybot_response_logs` insert site.

### Database

- **`20260819050000_add_complybot_response_logs_retrieval_strategy.sql`** — `ALTER TABLE
  complybot_response_logs ADD COLUMN IF NOT EXISTS retrieval_strategy text;`. Applied post-merge via
  `execute_sql` (interim procedure, `supabase db push` unusable per repo-wide drift) and confirmed
  live (`text`, nullable). Ledger repaired by Brian (`supabase migration repair --status applied
  20260819050000`) and verified: `version=20260819050000`,
  `name=add_complybot_response_logs_retrieval_strategy`, matching the file exactly.
- **4 reconciliation migrations** (`20260819040123_extend_standalone_forms_phase1.sql`,
  `20260819040550_harden_standalone_forms_public_rpcs.sql`,
  `20260819040956_prefix_standalone_form_tokens.sql`,
  `20260819041204_fix_standalone_form_token_generation.sql`) — verbatim SQL pulled from
  `supabase_migrations.schema_migrations.statements` for versions already live in production
  (confirmed their ledger rows pre-dated this PR — these files require **no** production apply step,
  only git/ledger agreement). Unrelated to ComplyBot; captures another feature's (`standalone_forms`,
  PR #499) direct-to-prod schema changes so the repo-wide drift check stops failing every PR.

---

## Review rounds

1. **Reviewer — fresh-eyes adversarial subagent** (read-only, whole-diff, incl. a live Supabase
   schema query) — verified regression/conflict/migration/bug-scan across the 4 standing
   objectives. Confirmed: Help mode untouched; `extractCitations([])` degrades safely to `[]`;
   `formatClausesForContext`'s internal empty-guard is now dead code but inert; DB-error path also
   correctly sets `kbMiss: true` (a bugfix, not a regression); `retrieval_strategy` did not already
   exist under another name; `kb_miss` confirmed live as `boolean NOT NULL`; migration is
   idempotent (`ADD COLUMN IF NOT EXISTS`). **Verdict: SHIP**, one non-blocking naming note for
   whoever builds Phase 3's Gaps tab later.
2. **ci-gate** — lint clean on changed files; `.single()` guard clean; migration guards N/A (no
   `CREATE TABLE`/new `tenant_id`/`SECURITY DEFINER` in the new files); security guards clean (no
   service-role exposure, no dropped tests/migrations, no `config.toml` change); branch merged
   `main` cleanly (0 behind after merging in 3 new commits mid-review). `deno check` unavailable
   locally (CLI not installed) — non-blocking, covered by CI itself.
3. **CI (GitHub Actions)** — Lint, Type check, `.single()` guard, Migration guards, Security
   checks, config.toml coverage all passed. **Migration drift check failed** on the first push
   (unrelated `standalone_forms` drift, see Problem Statement) — **passed** after the reconciliation
   commit was added. **"Supabase Preview"** (branch-DB build) failed on both pushes — confirmed
   pre-existing and universal (PR #496 and #494, both already merged, show the identical failure)
   and not a required check (`mergeStateStatus: MERGEABLE` throughout); logged as its own backlog
   item in `active-work.md` rather than fixed here, per the standing "don't reconcile the full
   ~2,000-version drift project inline" rule.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_5Y1vqpf51pjeLtbJ78a6Dz6SXh38`, `target: production`,
   **state: READY**, `githubCommitSha: b899ce6e0` (matches merge commit exactly). Verified via
   Vercel MCP `list_deployments`.
2. **Edge functions** — `ai-router` change ships via the standard Vercel-triggered deploy path; no
   separate edge-function redeploy step needed for this repo's setup.
3. **Migrations** — `retrieval_strategy` column applied via Supabase MCP `execute_sql`, verified
   live (`information_schema.columns`), ledger repaired by Brian and verified matching. The 4
   reconciliation migrations needed no apply step — their schema was already live; only the git/
   ledger paper trail was missing, and the ledger already had matching rows before this PR (that's
   what made them drift in the first place).
4. **Worktrees** — worktree A (`rto-compass-hub`) remains claimed for the next ComplyBot RAG step
   (PR 5, Phase 2's `ai-router` rewrite); `active-work.md` registry row updated to reflect PR 3
   fully closed rather than released to `unclaimed`, since more work in this same living doc is
   expected to continue in this worktree.

---

## Manual QA checklist (post-merge — Brian-gated)

**Not yet performed as of this audit.** Verified by Reviewer's live-DB check and ci-gate, not by an
authenticated in-browser walkthrough:

- [ ] Ask ComplyBot (Compliance mode) a question with no real KB match — confirm it says so
      honestly and gives caveated general guidance, instead of citing unrelated clauses
- [ ] Ask ComplyBot a question that *does* match a real clause — confirm behaviour is unchanged
      from before this PR (same wording, same clause text injected)
- [ ] Query `complybot_response_logs` after a few live questions and confirm `kb_miss`/
      `retrieval_strategy` populate correctly (both true-miss and real-match rows)

---

## Still open / follow-up

- **Phase 3's "Gaps" tab** (per the living doc, PR 7) — this PR only lays the data foundation
  (`kb_miss`/`retrieval_strategy` now populate correctly); nothing consumes that data yet.
- **"Supabase Preview" branch-DB build failing on every PR** — logged in `active-work.md` Backlog
  as its own item (root cause: preview-branch builder replays local migrations on top of a
  production snapshot that already has some of those versions recorded, instead of skipping
  already-applied ones — the same symptom class as the documented ~2,000-version pre-baseline
  drift). Confirmed pre-existing on PR #496/#494 too. Full fix needs the larger reconciliation
  project, not a quick patch — parked per Brian's standing rule, not attempted in this PR.
- **Next step per the living doc:** PR 5 (Phase 2's main `ai-router` rewrite, tool-use retrieval
  over a directory) or PR 4 (#9's usage cap, designed to run in the other worktree in parallel).

---

## Soak status

No feature flag. Change is live immediately for every Compliance-mode ComplyBot question on next
invocation — no client-side caching to bust. Lowest-risk rollout class: the only behavioural change
on a real KB match is none (unchanged code path); the only behavioural change on a miss is honest
disclosure replacing fabricated-context citation, which is strictly safer, not riskier. Watch for:
any downstream stat that reads `kb_miss` from `complybot_response_logs` (a route-stats view and
`complybot-monthly-report`'s KB-hit-rate stat, per Scout's recon) will start reflecting real numbers
instead of a constant `false` — expected, not a regression.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/500
- Merge commit: `b899ce6e0c2878e64b44b7778b7c013ec579512e`
- Vercel production deployment: `dpl_5Y1vqpf51pjeLtbJ78a6Dz6SXh38`
- Living doc: `complybot-rag-improvement.md` (workspace root) — §4A "PR 3" and Phase 0 marked ✅
- Active work ledger: `active-work.md` (worktree A registry updated 19 Aug 2026; new Backlog item
  for the "Supabase Preview" drift symptom)
