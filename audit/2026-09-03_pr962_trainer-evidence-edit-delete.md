# Audit — PR #962 (+ follow-up PR #963)

> **Date:** 3 September 2026; **Merged:** PR #962 at 2026-09-03T02:31:21Z, PR #963 at 2026-09-03T02:39:50Z (both UTC)
> **Scope:** Edit/Delete for trainer evidence documents in the Trainer Matrix document dialog, plus data-integrity and RLS-authorization fixes found in fresh-eyes review before shipping
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked as a single Scout(fresh-eyes)→Fixer→ship pass in one session, tracked via `active-work.md` worktree C

---

## Summary

PR #962 added Edit and Delete actions for trainer evidence documents (`TrainerDocumentsDialog.tsx`), backed by two new dialogs, three new hooks, and three new migrations. Before shipping, a `/fresh-eyes` adversarial review (spawned as a `pr-review-toolkit:code-reviewer` subagent, live-DB verified against the production project) found 5 confirmed bugs and 4 additional issues worth a second look that turned out to be real — all fixed in the same PR before merge. The single most important behavioural change: `deleteEvidenceDocument` went from three independent, non-transactional deletes to one `SECURITY DEFINER` RPC (`delete_evidence_document`) that runs atomically and preserves audit history instead of destroying it.

PR #962: 11 files changed, +773/-27, 3 new migrations, no edge functions touched. PR #963 is a 1-file, 0-line-diff rename, opened immediately after #962 merged, to resolve a migration-timestamp collision discovered during the post-merge production-apply step against an unrelated, independently-merged PR (#961).

**Branch:** `feat/trainer-evidence-edit-delete` (merged; remote branch left as-is) · **Merge commit:** `f7939b9fa3e7a8764e9aea043f687c7127f65ab1` · **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/962

**Follow-up branch:** `fix/rename-colliding-migration-timestamp` (merged) · **Merge commit:** `b1142a14930fc8ccabcf6165a603140a8a98d933` · **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/963

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| **(fresh-eyes finding)** Delete | Deleting certain documents destroyed their audit history and left the document row dangling with a raw Postgres error | `deleteEvidenceDocument` ran 3 separate PostgREST calls (non-transactional). `evidence_reconciliation_log` FKs the document with `NO ACTION` and was never cleared — 40 live documents affected. The first two steps (deleting audit-log + link rows) had already committed by the time the final step failed. |
| **(fresh-eyes finding)** RLS / authorization | Real Administrator/Compliance Manager members could be silently blocked from editing/deleting links; a relink could double-link a document | `evidence_document_links_delete`/`_insert`/`_update` are RESTRICTIVE policies (AND against every other policy) gating on `current_user_role()`, which reads the stale `profiles.role` snapshot instead of live `tenant_members` role. 34 live memberships had a mismatch. |
| **(fresh-eyes finding)** Edit — relink | Editing a document's linked record could silently remove its link to unrelated other records | `relinkDocument` deleted *all* of a document's `evidence_document_links` rows before adding the new one, instead of only the link of the same record type being replaced. 8 live documents carry multi-type links. |
| **(fresh-eyes finding)** Delete warning | No warning shown before deleting a document that was the sole evidence behind a verified credential | `isDocumentGenuinelyResolved` only checked `evidence_document_links`; `trainer_matrix_credentials.evidence_document_id` can point directly at a document with no separate link row (45 live credentials affected). |
| **(fresh-eyes finding)** Access | Consultants could not see Edit/Delete buttons despite the database already permitting them | `canManage` in `TrainerDocumentsDialog.tsx` only checked Administrator/Compliance Manager, omitting `ROLES.CONSULTANT`. |
| **(post-merge discovery)** Migrations | Any fresh `supabase db push` or Supabase Branching build after this merge would hit a duplicate-primary-key error partway through | `20260903150000_add_delete_evidence_document_rpc.sql` (this PR) and `20260903150000_remove_duplicate_pdr_register_dual_write_rows.sql` (PR #961, merged independently ~8 minutes earlier) share an identical 14-digit version prefix; `supabase_migrations.schema_migrations.version` is a PRIMARY KEY. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `e82d0071a` | fix(trainer-evidence): atomic delete, correct RLS role check, preserve multi-links — the full fresh-eyes fix set for PR #962 |
| `4a75fe906` | fix(migrations): rename colliding 20260903150000 migration timestamp — PR #963 |

---

## Fixes shipped

### Frontend — Trainer Matrix evidence documents

- **`TrainerDocumentsDialog.tsx`** — added Edit/Delete buttons (Administrator/Compliance Manager/Consultant), wired to the two new dialogs; buttons now disable while `busyId` is set.
- **`EditEvidenceDocumentDialog.tsx`** (new) — link-to-a-different-record and disposition editor; `DISPOSITION_OPTIONS` covers all 9 values in `evidence_documents_disposition_check` (was missing `created_new_record`, `linked_to_record`, `missing_file`, `skipped_duplicate` — a document already at one of those rendered a blank status field).
- **`DeleteEvidenceDocumentDialog.tsx`** (new) — confirm dialog following the mandatory `AlertDialogAction` preventDefault + awaited-mutateAsync pattern.
- **`useEditEvidenceDocument.ts`** / **`useDeleteEvidenceDocument.ts`** (new) — mutation hooks; classification recompute now also fires on disposition-only edits and on credential-only-linked deletes; both invalidate the `trainer-classification` query key (previously stale after edit/delete).
- **`useTrainerLinkableRecords.ts`** (new) — records a document could be re-linked to (credential/PD/currency).
- **`evidenceService.ts`** — `deleteEvidenceDocument` now calls the new RPC instead of 3 sequential deletes; `relinkDocument` deletes only the link of the record type being replaced; `isDocumentGenuinelyResolved` also checks `trainer_matrix_credentials`.
- **`types.ts`** — hand-added the `delete_evidence_document` Functions entry (matching the generator's exact format/alphabetical placement) since the RPC couldn't exist in the real generated types until applied to production. Confirmed byte-for-byte identical against a real `generate_typescript_types` pull after production apply — no correction needed.

### Database

Three migrations, all applied to production via the interim `execute_sql` procedure (see Production rollout) and reconciled in the ledger via `supabase migration repair`:

- **`20260903130000_widen_evidence_audit_log_action_check.sql`** — adds `'edit'`/`'delete'` to `evidence_audit_log`'s allowed actions.
- **`20260903140000_fix_evidence_document_links_role_check.sql`** — rewrites `evidence_document_links_delete`/`_insert`/`_update` (RESTRICTIVE policies) to use `sec.has_tenant_role()` instead of `current_user_role()`.
- **`20260903150001_add_delete_evidence_document_rpc.sql`** (originally `20260903150000_add_delete_evidence_document_rpc.sql`, renamed in PR #963 before any ledger repair — see Problem statement) — new `SECURITY DEFINER` RPC `delete_evidence_document(p_tenant_id, p_document_id)`: unlinks (not deletes) `evidence_audit_log` rows, deletes blocking `evidence_reconciliation_log` rows, then deletes the document row, all in one transaction.

### Edge functions

None touched, none redeployed.

---

## Review rounds

1. **Fresh-eyes adversarial review** (pre-merge) — `pr-review-toolkit:code-reviewer` subagent, no prior session context, read `CLAUDE.md`/`AGENTS.md`, diffed working tree against `HEAD` (branch had no commits yet at review time), verified every RLS policy, FK `delete_rule`, and live data count referenced above directly against the production database. Found 5 confirmed bugs + 6 worth-a-second-look items (4 confirmed real and fixed, 3 judged not bugs and left alone: unused `storageBucket` param, file line-count, `useEffectiveRole().ready` gate — the last one already fails safe since `effectiveRole` is `null` until ready).
2. **`ci-gate`-equivalent mechanical checks** (pre-push, manually run against the true changed-file set since the branch had no commits to diff against `origin/main...HEAD`): lint clean, no `.single()`, no hardcoded project ID, migration filename/RLS/`search_path` guards clean, no dropped tests/migrations, `config.toml` untouched. Full `tsc`/`npm run type-check` was **not** run — both are vacuous on this repo's solution-style root `tsconfig.json` (checks 0 files) and the real whole-codebase compile carries a known hang risk; relied on lint + manual type-surface review instead, per standing workspace guidance, with Vercel's build as the real gate.
3. **Post-merge production verification** — every schema object (check constraint, all 3 RLS policies, RPC existence, RPC grant scope) queried directly against the live database after `execute_sql` apply, before considering it done.
4. **Post-merge collision discovery** — caught while checking production migration-ledger state before the first `migration repair` call, not by any automated CI (see Problem statement).

---

## Production rollout (post-merge)

1. **Vercel production** — current production deployment `dpl_GQAjucibJzf4sqWvN4qRSotWp1XJ` (commit `b1142a149`, PR #963's merge, which is a descendant of PR #962's merge commit) is `READY`/`target: production`, confirmed via `list_deployments`. Note: the deployment triggered directly by PR #962's own merge commit (`dpl_58XLBQJXBTQGw8FvvRNgwaa9Ad2u`) shows `CANCELED` — this is Vercel superseding an in-flight build when PR #963 merged 8 minutes later, not a failed deploy; the current `READY` production deployment includes all of PR #962's changes.
2. **Edge functions** — none, not applicable.
3. **Migrations** — applied to production via the documented interim procedure (`execute_sql`, not `supabase db push`, per `supabase/migrations/CLAUDE.md`) immediately after PR #962 merged. All three schema objects reverified live post-apply. Ledger repaired via `supabase migration repair --status applied` for `20260903130000` and `20260903140000` immediately; `20260903150001` repaired after PR #963 merged (renaming first to avoid a primary-key collision with PR #961's same-timestamp migration — neither had been repaired yet, so the rename was safe). Final ledger check confirms exactly the three correct `(version, name)` rows, no stray `20260903150000` entry.
4. **Worktrees** — worktree C (`rto-compass-hub-C`) released in `active-work.md`'s registry: back on `main` at `b1142a149`, claim cleared to `unclaimed`.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] As Administrator/Compliance Manager/Consultant: edit a document's link and disposition in the live app, confirm both save and other links on the same document survive
- [ ] Delete a document that has `evidence_reconciliation_log` rows — confirm it deletes cleanly with no FK error and that its prior audit-log rows still exist (unlinked, not gone)
- [ ] Delete a document that's the sole evidence behind a `trainer_matrix_credentials` row with no separate link row — confirm the warning fires
- [ ] Confirm a user whose `profiles.role` and `tenant_members.role` diverge (one of the 34 identified in review) can now edit/delete links without a silent no-op

None of the above has been clicked through in the live app by a human yet — only verified via direct SQL/API-level checks and code review.

---

## Still open / follow-up

- `evidence_reconciliation_log` rows for a deleted document are deleted outright (the FK column is `NOT NULL`, so there's no unlink option like `evidence_audit_log` got) — acceptable given the constraint, but worth knowing this is a real, if narrow, loss of reconciliation history on delete.
- The dead `storageBucket` parameter in `useDeleteEvidenceDocument.ts` (accepted but never used for routing) was left as-is — harmless today (all 520 live rows use `tenant-documents`), flagged in case bucket routing ever diverges.
- `src/integrations/supabase/types.ts` should be regenerated for real (not the hand-authored stub) the next time anyone runs a full type-sync — confirmed it already matches exactly, so this is a formality, not a correctness risk.

---

## Soak status

No feature flag — Edit/Delete buttons are live immediately for Administrator/Compliance Manager/Consultant. Watch for: any support ticket about a document losing its link unexpectedly (would indicate a gap the review missed), or a raw RLS/permission error surfacing in the UI for a Compliance Manager/Administrator (would indicate the role-check fix has an edge case). Risk tier: medium — touches delete/authorization on a compliance-evidence table, but changes are narrowly scoped and independently DB-verified.

---

## References

- PR #962: https://github.com/ComplyHub-ai/rto-compass-hub/pull/962
- PR #963: https://github.com/ComplyHub-ai/rto-compass-hub/pull/963
- Merge commits: `f7939b9fa3e7a8764e9aea043f687c7127f65ab1`, `b1142a14930fc8ccabcf6165a603140a8a98d933`
- Production deployment: `dpl_GQAjucibJzf4sqWvN4qRSotWp1XJ` (https://vercel.com/complyhub/complyhub-rto/GQAjucibJzf4sqWvN4qRSotWp1XJ)
- Active work ledger: `active-work.md`
