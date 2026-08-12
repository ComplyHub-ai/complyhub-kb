# Active Work — THE LEDGER (source of truth)

> Parked findings and follow-ups for a **later session** — not current in-progress work.
> Promote to a real task only via a new FRAME. See `CLAUDE.md` § "The Loop."

Last updated: 11 August 2026

---

## Worktree registry (advisory — git is ground truth)

> Which chat is using which worktree, on what task, since when. Check this before claiming a worktree
> to branch in; a claim older than a day should be re-verified against `git status`/last-commit time
> before trusting it. Where this disagrees with `git worktree list` / `git branch --show-current`, git
> wins. One DB/migration/edge-function job across both worktrees at a time — see `CLAUDE.md`
> § "Two worktrees".

| Worktree | Path | Branch | Claimed by | Task | Since |
|---|---|---|---|---|---|
| A | `rto-compass-hub` | `fix/post-demo-backlog-cleanup` | this chat | Post-demo backlog: CI dual-column, SSR seed-path, Risk status table | 12 Aug 2026 |
| B | `rto-compass-hub-worktree-b` | `main` 

## Pending — awaiting reply

- **Naduni (naduni@australiancollege.edu.au) — Monthly Trainer Report email claim, 11 Aug 2026.** Reported Natasha Green, Aimee Walters, Lauren Roennfeldt not receiving the report email for the 14 Aug 2026 governance meeting. Verified: Natasha + Lauren were sent the reminder 7 Aug 2026, confirmed delivered via Mailgun logs. Aimee submitted her report 23 Jul 2026 for this meeting, so no reminder was due — not a bug. Resent Natasha's and Lauren's emails 11 Aug 2026, confirmed delivered again via Mailgun. Reply sent to Naduni asking her to confirm with Aimee that her submission is on file. **Awaiting her response.**

---

## Backlog — PARKED findings (NOT scheduled work)

_Adjacent issues surfaced during work but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

- **PR #385 post-merge — manual QA + 14-day soak** — prod migrations, object copy (110 files), edge
  deploy, and DML backfills all applied 06 Aug 2026 (detail in `last.md` and audit index
  `complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`; soak schedule in
  `document-repository-consolidation.md`). **Still Brian-gated:** manual QA as
  **non-SuperAdmin** tenant user (admin logo, GP org logo, onboarding logo, avatar upload; confirm
  Trainer/Student cannot write branding); **soak until ~20 Aug 2026** on source buckets
  (`branding`, `organisation-assets`, `avatars`, `dap-documents`, `industry-evidence`) before
  decommission; `organization-logos` (4 orphan objects) decommission after soak + explicit approval.
- **19 migrations merged to `main` but never applied to production** (ops/deploy gap, not a code
  defect). Date range 25 May–19 Jul 2026 — all recent, none Lovable-era. Surfaced during PR #259's
  REVIEW via the Migration Drift Check; recount on 20 Jul 2026 after correcting for version-timestamp
  drift (Supabase records actual execution time, not filename time) — original figure of 81 was
  overcounted. Needs its own dedicated pass: batch-verify each one's actual DB state vs. expected,
  then apply via MCP `apply_migration`, in dependency order. Full list captured in the 20 Jul 2026
  conversation / CI log for PR #259.
- **213 production migration records with no corresponding local file** (undocumented direct-to-prod
  changes), dated 25 May–17 Jul 2026. Recount on 20 Jul 2026 after correcting for version-timestamp
  drift — original figure of 286 was overcounted. Needs investigation per the reconciliation-migration
  procedure in `supabase/migrations/CLAUDE.md`.
- **`.drift-baseline.txt` still lists `20260617223949`/`20260619050843` as unresolved** — the
  `qi_annual_register` migration files themselves are done (both merged to `main`, confirmed 11 Aug
  2026), but the LOCKED plan's last step — pruning those two versions out of
  `supabase/migrations/.drift-baseline.txt` — never happened. Small cleanup: remove both lines (363,
  381) from the baseline file, same pattern `ea589f22d` used for its 6 resolved rows. Confirm Brian has
  also run the two `migration repair` commands before touching the baseline file.
- **Reconciliation follow-up queue** — 7 items in `reconciliationwork.md` § "Remaining work queue";
  item 1 (`sa_extend_trial_v2` guards) investigation complete, migration plan ready, awaiting sign-off
  (parked since 22 Jul 2026).
- **Risk Register should get its own dedicated status lookup table, not share `dd_status`** — parked for **after demo**, logged 11 Aug 2026. Context: A-4 (Part 3 QA sweep, `feat/part3-onboarding-qa-sweep`) wired the Risk Register + Risk Dashboard status dropdown/filter to the shared `dd_status` table (previously a hardcoded Open/In Progress/Mitigated list). `dd_status` is also used by AVR and STR — it's a generic, shared vocabulary, not risk-specific. Immediate gap (risk had no "being worked on" state, only open/mitigated) fixed short-term same day by adding an `in_progress` row directly to the shared table (migration `20260811200200_part3_add_in_progress_dd_status.sql`) — cheap, but it also becomes selectable in AVR/STR's dropdowns since the table is shared, which is a mild pollution smell rather than a real bug. The correct long-term shape: give Risk its own dedicated status table, following the precedent already set by `ci_dd_status` and the `ofi_dd_*` family (each register owns its own vocabulary rather than falling back to a shared generic table) — new table + migration + RLS + re-wire `RiskRegister.tsx`/`RiskManagementDashboard.tsx` off `dd_status` onto the new table. Not attempted now — real scope, and not worth touching mid-demo-prep. Schedule as its own FRAME after the demo.
- **`ci_register` dual columns (`priority` vs `priority_level`) have no single source of truth** — parked for **after demo**, logged 12 Aug 2026. Context: Part 3 QA sweep's A-6 fixed the live casing bug (backfilled both columns to lowercase, fixed writers/readers, fixed the main CI form's hardcoded Title Case options) — confirmed live 12 Aug 2026 that all non-null values in both columns are now lowercase and consistent. What's still open: two columns exist for the same concept with no sync guarantee going forward — decide which is canonical and migrate/deprecate the other. Full detail: `complyhub-kb/audit/2026-08-12_part3-onboarding-qa-sweep-risk-ci-ofi-complaints-ssr.md` § A-6.
- **SSR seed-path permanent fix for `responsible_person`** — parked for **after demo**, logged 12 Aug 2026. Context: B-1's immediate fix (backfilling the 10 seeded Demo-tenant SSR rows to Angela Connell-Richards) was applied and verified 12 Aug 2026 — zero nulls remain on that tenant. Still open: (1) the demo/seed-data creation path must set `responsible_person` whenever SSR rows are seeded, so this doesn't recur for future demo tenants; (2) decide whether `ssr_register.responsible_person` should become DB `NOT NULL` (would need a full null backfill across all tenants first); (3) decide the fate of Direct Response's one remaining null row (excluded from the Demo-tenant backfill, not yet investigated). Full detail: `complyhub-kb/audit/2026-08-12_part3-onboarding-qa-sweep-risk-ci-ofi-complaints-ssr.md` § B-1.
- **`training_product_units` reference data is 96% empty across production** — root cause of a data-loss-shaped bug in `rpc_bulk_upsert_trainer_units` that was fixed 07 Aug 2026 (see commit `f7fbcc79b` + migration `20260807124853_fix_rpc_bulk_upsert_trainer_units_missing_reference_data.sql`, on branch `fix/document-register-storage-and-attachments-batch`). 3,428 of 3,567 `training_products` rows have zero linked `training_product_units` rows; one real tenant (`a6a60268…`) has literally none for any of its 97 qualifications. The RPC fix means missing reference data no longer silently discards trainer unit assignments — units for a qualification with no data loaded now save anyway and are reported as "unverified" rather than blocked. But the underlying gap remains: ComplyHub has no unit-of-competency mapping loaded for the vast majority of qualifications, so the relevance guard can't actually do its intended job (flag genuinely wrong units) for those qualifications — it can only pass everything through. Needs a dedicated data-population effort (bulk import `training_product_units` from TGA / training.gov.au per qualification) — not a code fix, out of scope for a bug-fix PR. Scope/owner/priority not yet decided.

## Diagnosis + Implementation Plans — items 1-5 DONE (confirmed 11 Aug 2026, all merged to main)

> Items 1-4 (TrainerCredentialForm scoping, ComplyBot attachments, bulk-delete batching,
> `qi_annual_register` migrations) confirmed merged to `main` via `89f00a31a` + follow-on hardening
> commits. Item 5 (anon governance functions) was already CLOSED with no action needed. Removed from
> this ledger 11 Aug 2026 — see git history / `f7fbcc79b` and `89f00a31a` for detail if needed. Item 4's
> drift-baseline cleanup leftover moved back into the Backlog section above. Item 6 remains below.

### 6. Migration drift recount (19 unapplied / 213 orphaned) — PARKED for a separate dedicated batch (per Brian, 07 Aug 2026)

Full recount against live `list_migrations` + local `supabase/migrations/*.sql` + `.drift-baseline.txt`:
- **"Merged but never applied to production"**: **214** (was 19) — 208 of these are still the original 25 May–19 Jul 2026 backlog, untouched by the 06 Aug 2026 PR #385 production-apply run (which only cleared the newest batch through `20260806121200`); 6 more have accumulated since 22 Jul 2026. This is NOT a shrinking problem — the backlog is essentially unchanged and 6 new items have piled on top.
- **"Production records with no local file"** (restricted to the original 25 May–19 Jul 2026 window): **218** (was 213) — roughly stable, normal drift growth. A separate, much larger pre-25-May-2026 Lovable-era population (3,046 more) is the already-known ~2,000+ item reconciliation project documented in `supabase/migrations/CLAUDE.md` — explicitly NOT part of this count.
- Full list of all 214 pending-apply migration files (in dependency order) saved to `complyhub-kb/audit/2026-08-07_migration-drift-recount-pending-apply-list.txt` (copied out of session scratchpad so it survives past this session).
- **Cross-referenced against `.drift-baseline.txt` directly (07 Aug 2026):** zero version overlap between the 214 pending-apply list and the baseline's 517 entries, as expected since they track opposite directions of drift (git-has-file-prod-doesn't vs. prod-has-version-git-doesn't). More importantly, `.drift-baseline.txt` itself is now stale — it stops at version `20260713222509` (~13 Jul 2026), while 174 of the 214 pending-apply files are dated after that (14 Jul–05 Aug 2026). Refreshing the baseline file is its own small sub-task to fold into the dedicated session below.

**PARKED plan (Brian confirmed 07 Aug 2026 this will be a separate batch, not part of this implementation round):** this needs its own dedicated session per the existing rule in `supabase/migrations/CLAUDE.md` — batch-verify each of the 214 files' actual DB state, then apply via MCP in dependency order (only for genuinely-new schema; be alert for any that, like item 4, may already exist in production under a different reconciliation path), AND refresh `.drift-baseline.txt` itself. Not something to fold into a normal PR. Schedule as its own FRAME when ready.

**Scope:** dedicated session, not a quick fix — do not attempt inline.

---

## Context
Tenant: Australian Institute of Accreditation Pty Ltd (`tenant_id = aca3d0ab-b1e7-4b70-9d27-f4b8efd5f46a`), project `gdwhlstfguxarnxasrrs` (ComplyHub Project).

Triggered by: AJ (consultant, aj@vivacity.com.au) noticed all this tenant's Document Register entries were gone. Investigated as a possible regression from PR #384 — **ruled out** (PR #384 merged 2026-08-06 01:13 UTC; the incident happened 2026-08-05 02:43:07 UTC, a full day earlier, and PR #384 never touched `documents_register`, `TenantDocuments.tsx`, or `useTenantDocumentsRegister`).

## What actually happened
- `erin@aia.edu.au` (Administrator on this tenant) ran a bulk-delete in the Document Register UI.
- `document_audit_log` shows 374 rows deleted from `documents_register`, all stamped `metadata: {"bulk_delete": true}`, all at the same insert timestamp `2026-08-05 02:43:07.114268+00`.
- All 374 database rows are confirmed gone (`select count(*) from documents_register where tenant_id = 'aca3d0ab-...'` → 0).
- But storage still had 124 orphaned objects under `tenant-documents/aca3d0ab-.../` with no matching register row. 117 of those were flat-path Document Register uploads (`{tenantId}/{timestamp}-{uuid}-{filename}`); the other 7 are under `trainers/.../evidence/` — a different, unrelated feature (trainer credential uploads) that is **also separately orphaned** against `trainer_document_items`, cause not yet investigated, out of scope for this ticket.
- I hard-deleted the 117 Document Register orphans from storage on 2026-08-06 via the Storage API (`DELETE /storage/v1/object/tenant-documents` with a `prefixes` list) after confirming via `supabase.com/docs/guides/storage/management/delete-objects` that raw SQL delete against `storage.objects` does NOT free the underlying object — only the Storage API does. Confirmed clean afterward (0 flat-path files remaining, 7 trainer files untouched).

## Root cause (confirmed via Supabase logs, not just code reading)
Code path: `src/hooks/useBulkDeleteDocuments.ts` → `bulkDeleteDocuments()`:
1. Inserts audit-log entries for all documents being deleted.
2. Calls `deleteBulkDocumentFilesAfterRows()` (`src/pages/admin/documentsRegisterLogic.ts:107`), which:
   a. `await deleteRows()` — a single fast `DELETE ... WHERE id IN (...)` against `documents_register`. **This step is fast, atomic, and irreversible.**
   b. Then `await deleteFiles({ tenantId, paths })` → `deleteDocumentFiles()` (`src/lib/documentFiles.ts:147`), which loops `for (const p of args.paths) { await deleteDocumentFile(...) }` — **one HTTP round-trip per file, sequential, not parallel/batched.** Each call hits the `document-file-manager` edge function (action: delete), which does the actual `storage.remove([path])` server-side.

Checked `get_logs(service: 'edge-function')` for the 20-minute window around 2026-08-05T02:43:07Z: only **one** `document-file-manager` invocation appears in that whole window (at 02:45:09Z, ~2 min after the DB delete), when **374** were needed for the cleanup loop to fully run. Sampled execution time for that one call was ~753ms — at that rate, 374 sequential calls would take roughly 4-5 minutes to complete.

374 rows were deleted but only 117 of the corresponding files were left orphaned (374 − 117 = 257 file-delete calls apparently succeeded before something stopped the loop). This pattern — partial completion, no error surfaced, nothing resumed — is consistent with the browser tab being closed, navigated away from, refreshed, or losing network partway through the multi-minute serial cleanup loop. There is no persistence/resume mechanism for step 2 if it's interrupted: the DB half is already committed and irreversible by the time file cleanup even starts, and whatever files haven't been reached yet when the tab dies are stranded forever with **no error shown to the user and no retry**.

## Not yet confirmed / next steps
1. **Whether the UI shows a "success" toast before or after the file-cleanup loop finishes.** If the toast fires as soon as `bulkDeleteDocuments()` resolves (i.e., after cleanup), the user wouldn't be able to close the tab "too early" under normal UI feedback — meaning the interruption was more likely an actual crash/nav-away/refresh mid-loop, not a race with the success message. If the toast is optimistic and fires early (e.g., driven by the DB delete alone or a different code path), that's a separate contributing bug worth flagging. Check the component that calls `useBulkDeleteDocuments()` (likely in or near `src/pages/Documents.tsx`) for the `onSuccess`/toast wiring.
2. **No fix has been designed or applied yet** — this handover is diagnosis only. Candidate directions (not decided, for discussion):
   - Make storage cleanup resumable/idempotent from a durable list (e.g., a small "pending deletion" table) instead of an in-memory JS loop, so a page refresh doesn't strand files.
   - Batch the storage delete calls (the Storage API's `remove()` accepts up to 1000 paths in one call) instead of one HTTP round-trip per file — this alone would cut a 4-5 minute operation down to near-instant and drastically shrink the interruption window.
   - Reverse the order: clean up storage first, delete DB rows only after storage cleanup confirms success (matches the pattern already used in `TenantDocuments.tsx`'s admin-panel delete handlers, which do storage-then-DB) — though note the code comment in `documentsRegisterLogic.ts` explains DB-first was a deliberate choice to avoid leaving register rows pointing at already-deleted files; any fix needs to reconcile with that reasoning rather than just flipping the order back.
   - Add a background reconciliation job that periodically finds storage objects with no matching register row (per tenant, via the same path-prefix / `documents_register.file_path` join used in this investigation) and either alerts someone or auto-cleans after a grace period.
3. **The 7 trainer-evidence orphans are a separate, unrelated bug** (different table, different upload path) — worth its own investigation, not folded into this one.

## Key files
- `src/hooks/useBulkDeleteDocuments.ts`
- `src/pages/admin/documentsRegisterLogic.ts` (`deleteBulkDocumentFilesAfterRows`, `assertBulkDeleteRowCount`)
- `src/lib/documentFiles.ts` (`deleteDocumentFile`, `deleteDocumentFiles`)
- `supabase/functions/document-file-manager/index.ts` (server-side delete action, line ~282-292)
- Whatever page/component in `src/pages/` actually invokes `useBulkDeleteDocuments()` — not yet located, needed to check toast timing (see next step 1 above)

## IN PROGRESS — PR review session (started 10 Aug 2026, resume here)

**Context:** Working through the open rto-compass-hub PRs per `pr-review-open-prs.md` (workspace root) using the `/pr-review` skill and the Scout → Reviewer flow. Open PRs: #397 (see `pr-review-open-prs.md` for the full table — do not duplicate that tracking here, this section is just the resume pointer).

**Next steps on resume:**
1. Proceed to PR #397 (not yet started).
