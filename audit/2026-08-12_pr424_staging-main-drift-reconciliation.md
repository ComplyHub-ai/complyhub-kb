# Audit — PR #424

> **Date:** 12 August 2026 (audit written); **Merged:** 12 August 2026
> **Scope:** Full `staging` vs `main` drift audit (`/audit-branch-drift` + `/branch-catchup`) on
> `rto-compass-hub`, plus reconciling two edge functions found live in production with no git source
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `staging-to-main-port-2026-08-12.md`
> (workspace root — deleted after this audit, per the living-doc workflow)

---

## Summary

Ran `/audit-branch-drift` on worktree B: staging (Lovable) had 52 commits main didn't, main had ~250+
commits staging didn't. Worked through every staging-only file change individually rather than porting
in bulk — most of it turned out to be noise (stale generated types, Lovable build artifacts) or actively
incompatible with fixes main had already shipped independently. Only a small surviving subset actually
landed in `main`. Separately, the same audit surfaced two edge functions (`bulk-trainer-document-upload`,
`ingest-trainer-credentials`) running live in production with zero git source — reconciled those too,
then determined both were dead code and deleted them entirely rather than patch them to match a
deprecated schema.

**Branch:** `feat/staging-sync` (not yet deleted) · **Merge commit:** `8d3030c3e`
· **Merged:** 12 Aug 2026 · **Migrations:** `20260812060000`

## What was decided, item by item

1. **Build artifacts (`bun.lock`, `html/**`, `.lovable/plan.md`)** — skip. Lovable build output, never
   belongs in git.
2. **`src/integrations/supabase/types.ts`** — skip porting the diff; regenerate fresh instead. Staging's
   copy was stale and was the root cause of most of the "small tweaks" below.
3. **Two migrations already reconciled differently on `main`** — skip, redundant.
4. **`user_last_tenant` table recreation** — skip. Main deliberately deprecated this table
   (`_zz_deprecated_user_last_tenant`); verified staging's own code never actually queries it. Locked as
   a deliberate skip, not a regression risk.
5. **Session 3 workbook Help Centre entry** — turned out to already be live in production (Brian had
   uploaded the PDF directly), just never captured in git. Wrote a gap-fill migration instead of a
   "new feature" migration. Bot review caught that the join used a hardcoded production-only category
   UUID; fixed to join by the portable `session-3` slug so it actually fires on branch/fresh DBs.
6. **White-page workspace-redirect-cycle fix** — skip entirely. Scout found `main` had already fixed this
   exact bug independently (commit `81dec2179`, 29 Jul 2026) via a serialization queue; staging's version
   predates that fix and takes the opposite approach (removes the queue instead of race-proofing it).
   Porting it would have reintroduced the race condition and broken 5 other files.
7. **~36 scattered small UI tweaks** — reviewed individually; ported exactly one (a duplicate `toast`
   import fix in `diversity-inclusion/index.tsx`, confirmed still present on `main`). Everything else was
   either already fixed differently on `main`, incompatible with a component `main` had rebuilt
   (`EmptyRegisterPrompt`), or just `as any` casts papering over item 2's stale types.
8. **`TrainingRecordings.tsx`** — retired entirely rather than ported into. Confirmed with Brian: Angela's
   content updates were meant for the real rebuilt Help Centre (`/help-centre`) but Lovable applied them
   to this leftover secondary page instead. Deleted the page, its route, and repointed the one fallback
   redirect that used it.
9. **Two orphaned edge functions** — see below.

## Edge function reconciliation and deletion

- `bulk-trainer-document-upload` and `ingest-trainer-credentials` were both `ACTIVE` in production
  (confirmed via `list_edge_functions`) with no corresponding file anywhere in git — the exact drift class
  `/audit-branch-drift`'s edge-function check exists to catch.
- Initially captured both verbatim into git (to stop the next full redeploy from silently wiping them),
  plus their `config.toml` entries.
- Cursor Bugbot + Vercel bot review then flagged 6 real issues across the two functions (null-date bug,
  cross-tenant job-hijack risk, wrong-actor bug, and — most significantly — `ingest-trainer-credentials`
  writing to `credential_ingestion_jobs`/`items`/`audit`, tables that only exist in the live schema as
  `_zz_deprecated_credential_ingestion_*`).
- Investigated whether either function was still in active use before deciding how to fix: zero frontend
  callers (the one component that used to call `bulk-trainer-document-upload`,
  `BulkTrainerDocumentUpload.tsx`, was removed from the codebase back in June per a stale audit doc), zero
  other edge-function callers, zero DB triggers/cron jobs referencing either by name, zero recent
  invocations in the logs. The feature was superseded by a simpler per-credential flow
  (`AddCredentialDialog.tsx` → `analyze-credential-certificate`, which is what trainers actually use
  today).
- **Deleted both — from git and from live Supabase** (no `delete_edge_function` MCP tool available in
  this environment, so the production side was deleted manually via the dashboard/CLI) — rather than
  patch dead code to reference a deprecated schema. This resolved all 6 bot findings as moot.

## Review rounds

`/audit-branch-drift` (branch + edge-function drift), Scout dispatch on the white-page redirect fix,
manual per-file review of the ~36-file UI batch, then two rounds of bot review (Vercel + Cursor Bugbot)
on the pushed PR — each verified against current `HEAD` via the `verify-bot-fix` skill before any fix was
applied (2 of the 6 findings from the second bot pass were already resolved by the time they were
reported, since bots reviewed a slightly earlier commit).

## Production rollout (post-merge)

1. **Gap-fill migration `20260812060000` applied to production** via Supabase MCP `execute_sql` — ran
   cleanly, 0 rows affected (correctly a no-op; the workbook row was already live before this PR).
2. **Migration ledger repaired** — Brian ran `supabase migration repair --status applied 20260812060000`
   from his terminal. First attempt failed (`file does not exist`) because he was in worktree A
   (`rto-compass-hub`), which was checked out on an unrelated branch that didn't have this migration file;
   reran from worktree B (`rto-compass-hub-B`, on `main`) successfully. Confirmed `version`/`name` match
   the file exactly in `supabase_migrations.schema_migrations`.
3. **Two edge functions deleted from production directly** (see above) — no deploy needed for anything
   else; nothing else in this PR touched `supabase/functions/**`.

## Still open / follow-up

- **Manual QA on production** — not yet performed by a human: confirm `/help-centre` still renders
  correctly and the Session 3 workbook download still works end-to-end.
- Staging is still behind `main` by everything not explicitly ported here — this PR did not run
  `/branch-catchup` Phase 2 (resetting `staging` to mirror `main`). That remains a separate, explicit
  step for whenever Brian wants to do it.
- The stale audit docs that referenced the now-deleted `BulkTrainerDocumentUpload.tsx` component and the
  live-but-orphaned edge functions (`docs/audit-report/role-audit/trainer-assessor.md`,
  `docs/role-maps/trainer-assessor.md`, `docs/role-maps/administrator.md`,
  `docs/role-maps/compliance-manager.md`) were not updated — they're historical audit records, not live
  documentation, and updating them was out of scope for this PR.

## Soak status

No feature flag, no gradual rollout. The two deleted edge functions had zero live traffic (confirmed via
logs) before deletion, so there's no user-facing regression risk from removing them. The workbook
migration is a documentation-only no-op against current production data. Worth a quick manual check of
the Help Centre page once, otherwise nothing to actively monitor from this PR.
