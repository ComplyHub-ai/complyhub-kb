# Audit — PR #164: Staging Sync Round 2 + Migration Drift Reconciliation (09 July 2026)

**Date:** 09 July 2026
**Branch:** `feat/staging-sync-2`
**PR:** [#164](https://github.com/ComplyHub-ai/rto-compass-hub/pull/164)
**Merged by:** Brian (Khian)
**Merge commit:** `855687167`
**Purpose:** Second round of the staging catch-up cycle (continuing from PR #157/#158). Ports 53 staging-only Lovable commits into `main`, applies 3 resulting migrations to production, and resets `staging` to mirror `main`.

---

## Background

Staging kept moving while PR #158 was being worked (51 commits landed 03:17–04:55 UTC on 09 July 2026, continuing past the merge; 2 more landed by the time this round started, bringing the total to 53). This PR is Phase 1 of `/branch-catchup` for that new batch; the staging reset is Phase 2.

---

## What was merged (1 commit, `--no-verify`)

| Commit | Description |
|--------|-------------|
| `01fd1d450` | feat: sync staging-only work into main (09 Jul 2026) |

Committed with `--no-verify` (Brian's explicit approval) — the pre-commit hook (`eslint --fix --max-warnings=0`) blocks on any warning in a staged file regardless of origin, and several touched files carried pre-existing warnings from Lovable-era code predating this sync. Confirmed via `git diff main -- <file>` on every flagged file that no new warning-causing lines were introduced by this merge.

---

## Changes ported from staging

### 1 — Super-admin invite domain relaxed

- `@complyhub.ai` addresses now accepted for Super Admin invitations, alongside `@vivacity.com.au`.
- Files: `src/components/admin/people/InvitationsTab.tsx`, `src/lib/api/invitations.ts`

### 2 — CI Register duplicate detection (new feature)

- `CISimilarityWarning.tsx` — new component, warns when a new CI entry title looks similar to an existing one.
- `src/pages/registers/continuous-improvement/duplicates.tsx` — new review page for merging duplicate CI entries, wired into `AppRoutes.tsx` at `/registers/continuous-improvement/duplicates` and `/ci/duplicates`.
- 3 new RPCs: `find_similar_ci`, `find_ci_duplicate_groups` (both in migration `20260709032943`), `convert_ofis_to_ci` (migration `20260709033935`).
- Depends on the `ci_register.merged_into_id` column added in PR #158 (`20260709025118`) — confirmed already present before merging.

### 3 — SA Users Directory: plan + trial status columns

- `rpc_sa_users_directory` and `rpc_sa_users_directory_export` rewritten to add `tenant_plans` / `tenant_expiries` (migration `20260709041815`).
- `DirectoryTab.tsx` renders new Plan/Trial Status badge columns, aligned per-tenant with existing `tenant_names`.
- `useSaUsersDirectoryExport.ts` adds the same two columns to CSV/XLSX export — confirmed the PR #158 banned-cast fix (`(supabase as any)` → typed call) survived the merge intact.

### 4 — Small governance/CI wiring changes

`ci_register` queries across the app (`LiveMeetingTab.tsx`, `useTASMonitor.ts`, `continuous-improvement/index.tsx`) now filter `.is('merged_into_id', null)` to exclude merged-away duplicates from active views.

---

## Blast-radius review

- Merge (`git merge origin/staging --no-commit --no-ff`) was clean — zero conflicts across all 53 commits.
- **False-alarm pattern re-confirmed:** every file that looked "deleted" in the raw diff (5 edge functions, `config.toml`, `mailgun.ts`, `suggestion-intake`, `AssessmentToolForm.tsx` + assessment-tools dialogs, 4 migrations) was verified via `git log origin/main..origin/staging -- <file>` returning zero commits — main added these post-PR#158, staging's lineage never had them. Not a real deletion.
- **PR #158 fixes confirmed intact post-merge:** `FacilitySelector.tsx` and `MeetingStatusManager.tsx` showed **zero diff vs `main`** after the 3-way merge — the dedup regression fix and the tenant-check hardening both survived.
- `npm run type-check`: clean.
- `npm run lint` on touched files: 32 errors / 23 warnings, all traced to pre-existing Lovable-era code (mostly `@ts-nocheck` file headers) predating this sync — none introduced by the merge (verified line-by-line via `git diff main -- <file>` for each flagged file).
- Environment note: `node_modules` was not installed in the workspace and the active Node was v20 (repo needs ≥22.22.1 for `lint-staged`). Installed Node 22 via `nvm` for this session to get `npm install`/lint working — local tooling only, no repo files affected. Discarded the resulting `package-lock.json` churn before committing (staging never touched that file — the diff was purely a local-install artifact).

---

## Migration drift discovery — Lovable had already applied these directly to production

Before applying the 3 new migrations, `list_migrations` + `execute_sql` checks against production revealed that Lovable had **already pushed the identical schema change directly to production**, bypassing git — the same pattern documented in `migrationsissue.md`.

- Production already had `find_similar_ci`, `find_ci_duplicate_groups`, `convert_ofis_to_ci`, and the rewritten `rpc_sa_users_directory` / `rpc_sa_users_directory_export` (with `tenant_plans`/`tenant_expiries`) live, under **different migration version timestamps** than our git files (e.g. git file `20260709032943_...` recorded in production as version `20260709032947` — a few seconds later, the live-push timestamp vs. the file-generation timestamp).
- Confirmed via `pg_get_functiondef()` that the live function bodies were **byte-for-byte identical** to our migration files before applying anything.
- All 3 migrations were still run through `apply_migration` (idempotent `CREATE OR REPLACE` / `DROP FUNCTION IF EXISTS` + `CREATE`) so production's migration ledger has an entry tied to our git files, not just Lovable's untracked one. Functionally a no-op; administratively closes the gap between git and prod history for this batch.
- **New instance of the known drift pattern, not fully resolved:** `apply_migration` stamps the version with the actual apply time, not the filename's timestamp, so production now has 3 more ledger entries whose recorded version doesn't exactly match the git filename (same root cause as the original 3,608-orphan problem in `migrationsissue.md`, at much smaller scale). Harmless to current functionality — worth folding into any future cleanup of that ledger.

---

## Phase 2 — Staging reset

Pre-reset drift scan (`git diff origin/main..origin/staging` post-merge) found only the confirmed false-alarm files, plus two files with exactly one staging-side commit each — both investigated and confirmed **not** to be new unported work, but staging running an *older* version of code already fixed on `main`:

- `LiveMeetingTab.tsx` — staging's version was missing the automatic AI-capture-on-close call (`useAutoAnalyseMeetingOnClose`) from the PR #158 close-meeting bug fix.
- `useSaUsersDirectoryExport.ts` — staging's version still had the banned `(supabase.rpc as any)` cast and raw `console.error` that PR #158 already removed.

Both are corrected, not regressed, by resetting staging to main. Force-push executed:

```bash
git push origin main:staging --force
```

Verified via `git ls-remote origin main staging` — both branches at `855687167`.

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Skip pre-commit hook (`--no-verify`) | Brian authorised — `max-warnings=0` blocks on any warning regardless of origin; confirmed no new warnings introduced. |
| Apply migrations despite already-live schema | Applied anyway, to bring production's migration ledger in line with git history for this batch — matches established manual-apply practice from PR #157/#158. |
| Discard local `package-lock.json` diff before commit | Diff was from local `npm install` under Node 22, not from staging — unrelated to this PR's actual content. |
| Reset staging → main | Pre-reset drift scan confirmed nothing staging-only would be lost; the only real per-file differences were staging being *behind* on already-shipped fixes. |

---

## Files changed (36 files, 3 new + 3 new migrations)

| File | Change |
|---|---|
| `src/components/ci/CISimilarityWarning.tsx` | **NEW** — similar-title warning component |
| `src/pages/registers/continuous-improvement/duplicates.tsx` | **NEW** — duplicate review/merge page |
| `src/AppRoutes.tsx` | Routes for the duplicates page |
| `src/components/admin/people/DirectoryTab.tsx` | Plan/Trial Status columns |
| `src/components/admin/people/InvitationsTab.tsx`, `src/lib/api/invitations.ts` | `@complyhub.ai` invite domain |
| `src/hooks/useSaUsersDirectory.ts`, `useSaUsersDirectoryExport.ts` | New export columns |
| `src/hooks/useCeoGovernanceData.ts`, `useGovernanceAgenda.ts`, `useGovernanceRegister.ts`, `useGoverningPersonsData.ts`, `useQuarterlyReportData.ts`, `useRiskTrendAnalysis.ts`, `useTASMonitor.ts`, `useValidationCIIntegration.ts`, `useValidatorRecommender.ts`, `compliance/useQA4EvidenceSignals.ts` | Minor CI/merged-row filtering, small fixes |
| `src/components/governance/tabs/LiveMeetingTab.tsx` | `merged_into_id` filter on CI query |
| `src/integrations/supabase/types.ts` | Regenerated types for new/changed RPCs |
| `src/modules/auditpack/collectors/standard4.ts` | Minor |
| `src/pages/ci/index.tsx`, `src/pages/registers/continuous-improvement/index.tsx` | Duplicates CTA, merged-row filtering |
| `src/pages/settings/ConsolidatedRTOSettings.tsx` | Minor |
| `supabase/migrations/20260709032943_2fa8d929-338e-4582-905e-279b01f0bf2d.sql` | **NEW** — `find_similar_ci`, `find_ci_duplicate_groups` |
| `supabase/migrations/20260709033935_70550ecd-24c7-43c3-9439-d270aaf8bef1.sql` | **NEW** — `convert_ofis_to_ci` |
| `supabase/migrations/20260709041815_a6f9cc5f-df8a-4f22-b734-7600920c8ad8.sql` | **NEW** — SA Users Directory RPC rewrite |

---

## Notes

- All 3 migrations manually applied to production via MCP `apply_migration` and verified live (function bodies confirmed present post-apply).
- Vercel production deploy check was not performed this round — the Vercel MCP connector required interactive OAuth not available in this session. Recommend a manual check of `rto.complyhub.ai` or the Vercel dashboard for the `855687167` deploy.
- `staging` and `main` are now at the same commit (`855687167`). Staging will diverge again as Lovable continues working — expected, not a problem. Next `/audit-branch-drift` + `/branch-catchup` cycle handles it.
