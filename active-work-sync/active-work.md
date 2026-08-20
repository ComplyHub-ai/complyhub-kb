# Active Work — THE LEDGER (source of truth)

> Parked findings and follow-ups for a **later session** — not current in-progress work.
> Promote to a real task only via a new FRAME. See `CLAUDE.md` § "The Loop."

Last updated: 19 August 2026 (worktree C ledger cleanup — removed stale/completed items)

---

## Worktree registry (advisory — git is ground truth)

> Which chat is using which worktree, on what task, since when. Check this before claiming a worktree
> to branch in; a claim older than a day should be re-verified against `git status`/last-commit time
> before trusting it. Where this disagrees with `git worktree list` / `git branch --show-current`, git
> wins. One DB/migration/edge-function job across both worktrees at a time — see `CLAUDE.md`
> § "Two worktrees".

| Worktree | Path | Branch | Claimed by | Task | Since |
|---|---|---|---|---|---|
| A | `rto-compass-hub` | `fix/tas-pdf-generation-remaining-paths` | Codex | TAS PDF generation remaining stale paths | 20 Aug 2026 |
| B | `rto-compass-hub-worktree-b` | `fix/tas-pdf-metadata-pagination-cleanup` | Codex | Fix remaining TAS PDF metadata, placeholders, website/release normalisation, and pagination issues | 20 Aug 2026 |
| C | `rto-compass-hub-C` | `main (synced to main @ 2b366b176)` | unclaimed | — (PR #541 merged: Sales Dashboard Created date column, Dave's request) | 20 Aug 2026 |

## Pending — awaiting reply

---

## Backlog — PARKED findings (NOT scheduled work)

_Adjacent issues surfaced during work but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

1. **PR #385 post-merge — manual QA + 14-day soak** — prod migrations, object copy (110 files), edge
  deploy, and DML backfills all applied 06 Aug 2026 (detail in `last.md` and audit index
  `complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`; soak schedule in
  `document-repository-consolidation.md`). **Still Brian-gated:** manual QA as
  **non-SuperAdmin** tenant user (admin logo, GP org logo, onboarding logo, avatar upload; confirm
  Trainer/Student cannot write branding); **soak until ~20 Aug 2026** on source buckets
  (`branding`, `organisation-assets`, `avatars`, `dap-documents`, `industry-evidence`) before
  decommission; `organization-logos` (4 orphan objects) decommission after soak + explicit approval.
2. **"Supabase Preview" branch-DB build fails on every PR, not just drift-affected ones** — confirmed 19 Aug 2026 during PR #500 (ComplyBot Phase 0). Error: `duplicate key value violates unique constraint "schema_migrations_pkey" — Key (version)=(20260814061750) already exists`. Verified live: production's ledger already has this exact version/name (`reschedule_fixed_tga_ingest_crons_avoid_race`) matching the git file — not a naming collision. Root cause: the preview-branch builder clones a production snapshot (which already has this version recorded) then replays all local migration files on top, including ones the snapshot already has, instead of skipping already-applied versions. This is the branch-DB-fails symptom `supabase/migrations/CLAUDE.md`'s "supabase db push is currently unusable" section already documents. **Confirmed pre-existing and universal**: PR #496 and #494 (both already merged last week, unrelated changes) show the identical "Supabase Preview: fail." Does not block merge (`mergeStateStatus: MERGEABLE`, not a required check) but means no PR gets a working preview branch DB right now. Full fix is the same ~2,000-version reconciliation project below — not a quick patch.
3. **types.ts hand-patching practice gap** — surfaced 18 Aug 2026 during PR #472 (post-457/467
  cleanup). `types.ts` hadn't had a full `generate_typescript_types` regen since 5 Aug 2026 — every
  PR since (including #457 itself) only hand-added the specific column(s) it needed, so tables added
  purely via migration (no matching hand-edit) never appeared: the whole `intelligence_*` subsystem
  (added 12 Aug), `qi_campaigns`/`qi_campaign_recipients` (added 5 Aug, same day as the last regen but
  after it), `governance_thresholds`, `meeting_duplicate_candidates`, `driver_register_map`, and more.
  PR #472 did a full regen to catch up. No process fix yet decided (e.g. a CI check that flags
  types.ts drift against `list_migrations`, or a habit of always running the full regen instead of
  hand-patching) — needs a FRAME if Brian wants one.
4. **Retire `fix-user-deletion-recursion` edge function** — surfaced 17 Aug 2026 during PR #454 review.
  This function's only job is to `CREATE OR REPLACE` `sa_delete_user` from a hardcoded, out-of-date SQL
  string (deletes only from `organization_members`/`user_invitations`/`profiles`). The **live**
  `sa_delete_user` has since been substantially rewritten (also cleans up `tp_trainers`, evidence
  documents/links, and a dozen deprecated tables) — confirmed via `pg_get_functiondef` on 17 Aug 2026.
  If this endpoint is ever invoked, it would silently regress `sa_delete_user` back to the old, far less
  thorough version. Confirmed via `main` (post PR #462) that someone already patched the one column-name
  bug in this file's embedded SQL (`organization_id` → `tenant_id`) but did **not** address the deeper
  staleness — the embedded fix is still years behind the live function. Nothing calls this endpoint today
  (`fixUserDeletionRecursion()` in `src/utils/` is exported but never imported anywhere in `src/`), so it's
  not click-reachable, but it's still a live, deployed endpoint (`verify_jwt = true` in `config.toml`)
  reachable directly with a super-admin token.
  **Plan (not yet executed — do this on a fresh branch off current `main`, not stacked onto PR #454):**
  delete `supabase/functions/fix-user-deletion-recursion/index.ts`, delete
  `src/utils/fixUserDeletionRecursion.ts`, and remove the `[functions.fix-user-deletion-recursion]` entry
  from `supabase/config.toml`. Small, single-purpose PR — re-verify against current `main` first in case
  it's been touched again since 17 Aug 2026.
5. **Dead `GovernancePrioritySection` imports pre-existing on `main`** — surfaced 18 Aug 2026 during PR
  #443 review. `src/components/pli/PLIForm.tsx` and `src/pages/registers/audit/AIRRegisterForm.tsx`
  both import `GovernancePrioritySection` but never render it anywhere in the file — confirmed via
  `git show main:<file> | grep -c GovernancePrioritySection` returning exactly 1 (the import line) on
  both, i.e. this predates PR #443 and isn't introduced by it. Harmless (unused import, not a runtime
  bug) but worth a trivial cleanup PR at some point — remove the unused import line from both files.
6. **Possible `super_admin` role-casing bug in `canAccessPath` (`src/config/permissions.ts`)** — surfaced
  19 Aug 2026 during ci-gate on PR #498's frontend-only rebuild (`feat/standalone-forms-frontend-only`,
  worktree C). `canAccessPath` checks `userRoles?.includes('super_admin')` alongside Proper-Case
  literals (`'Administrator'`, `'Consultant'`, `'Consultant Assistant'`) — but `ROLES.SUPER_ADMIN` is
  defined as lowercase `'super_admin'` in `src/lib/constants/roles.ts`, while this codebase's other
  role storage is Proper Case (per [[feedback_role_casing_proper_case]] precedent — same bug class as
  PR #310/`generate-audit-pack`). Confirmed this line is **pre-existing, unchanged** by PR #498 (only
  whitespace-reformatted in the diff) — not this branch's fix to make. Needs its own check: what value
  is actually stored for super-admin users on `tenant_members.role`/`profiles.role` — if it's not
  literally `'super_admin'`, every super-admin bypass check in `canAccessPath` silently fails.
7. **Missing role gate at DB/RPC layer on `training_product_transition_cases`/`_tasks`** — surfaced 18 Aug 2026 during PR #446 review (Training Product Transitions page). The RLS write policies and `rpc_close_transition_case` only check tenant membership + active billing + write-lock status — never caller role. UI correctly disables writes for Regulatory Officer (`useCanWriteTenantContent`/`OPERATIONAL_WRITE_ROLES` excludes that role), but nothing server-side backs that up — any authenticated tenant member could call the RPC or table update directly via devtools and bypass the read-only restriction. Confirmed via live `pg_policies`/`pg_get_functiondef` on 18 Aug 2026 — not unique to this PR, the same "role-gated read, ungated write" shape exists across ~69 tables using the same `write_lock_*` pattern already in production (e.g. `governance_actions`). Brian confirmed 18 Aug 2026 this is fine to ship as-is and fix later. Needs its own dedicated FRAME: likely a new migration adding a role check to the RESTRICTIVE write-lock policies (or the RPC itself), possibly scoped as a wider audit across all 69 affected tables rather than a one-table patch.

### 8. Migration drift recount (214 unapplied / 218 orphaned) — PARKED for a separate dedicated batch (per Brian, 07 Aug 2026)

Full recount against live `list_migrations` + local `supabase/migrations/*.sql` + `.drift-baseline.txt`:
- **"Merged but never applied to production"**: **214** (was 19) — 208 of these are still the original 25 May–19 Jul 2026 backlog, untouched by the 06 Aug 2026 PR #385 production-apply run (which only cleared the newest batch through `20260806121200`); 6 more have accumulated since 22 Jul 2026. This is NOT a shrinking problem — the backlog is essentially unchanged and 6 new items have piled on top.
- **"Production records with no local file"** (restricted to the original 25 May–19 Jul 2026 window): **218** (was 213) — roughly stable, normal drift growth. A separate, much larger pre-25-May-2026 Lovable-era population (3,046 more) is the already-known ~2,000+ item reconciliation project documented in `supabase/migrations/CLAUDE.md` — explicitly NOT part of this count.
- Full list of all 214 pending-apply migration files (in dependency order) saved to `complyhub-kb/audit/2026-08-07_migration-drift-recount-pending-apply-list.txt` (copied out of session scratchpad so it survives past this session).
- **Cross-referenced against `.drift-baseline.txt` directly (07 Aug 2026):** zero version overlap between the 214 pending-apply list and the baseline's 517 entries, as expected since they track opposite directions of drift (git-has-file-prod-doesn't vs. prod-has-version-git-doesn't). More importantly, `.drift-baseline.txt` itself is now stale — it stops at version `20260713222509` (~13 Jul 2026), while 174 of the 214 pending-apply files are dated after that (14 Jul–05 Aug 2026). Refreshing the baseline file is its own small sub-task to fold into the dedicated session below.

**PARKED plan (Brian confirmed 07 Aug 2026 this will be a separate batch, not part of this implementation round):** this needs its own dedicated session per the existing rule in `supabase/migrations/CLAUDE.md` — batch-verify each of the 214 files' actual DB state, then apply via MCP in dependency order (only for genuinely-new schema; be alert for any that, like item 4, may already exist in production under a different reconciliation path), AND refresh `.drift-baseline.txt` itself. Not something to fold into a normal PR. Schedule as its own FRAME when ready.

**Scope:** dedicated session, not a quick fix — do not attempt inline.

---

### 9. Document Register bulk-delete storage-orphan bug — root cause diagnosed, fix not yet designed

Tenant: Australian Institute of Accreditation Pty Ltd (`tenant_id = aca3d0ab-b1e7-4b70-9d27-f4b8efd5f46a`), project `gdwhlstfguxarnxasrrs` (ComplyHub Project).

Triggered by: AJ (consultant, aj@vivacity.com.au) noticed all this tenant's Document Register entries were gone. Investigated as a possible regression from PR #384 — **ruled out** (PR #384 merged 2026-08-06 01:13 UTC; the incident happened 2026-08-05 02:43:07 UTC, a full day earlier, and PR #384 never touched `documents_register`, `TenantDocuments.tsx`, or `useTenantDocumentsRegister`).

#### What actually happened
- `erin@aia.edu.au` (Administrator on this tenant) ran a bulk-delete in the Document Register UI.
- `document_audit_log` shows 374 rows deleted from `documents_register`, all stamped `metadata: {"bulk_delete": true}`, all at the same insert timestamp `2026-08-05 02:43:07.114268+00`.
- All 374 database rows are confirmed gone (`select count(*) from documents_register where tenant_id = 'aca3d0ab-...'` → 0).
- But storage still had 124 orphaned objects under `tenant-documents/aca3d0ab-.../` with no matching register row. 117 of those were flat-path Document Register uploads (`{tenantId}/{timestamp}-{uuid}-{filename}`); the other 7 are under `trainers/.../evidence/` — a different, unrelated feature (trainer credential uploads) that is **also separately orphaned** against `trainer_document_items`, cause not yet investigated, out of scope for this ticket.
- I hard-deleted the 117 Document Register orphans from storage on 2026-08-06 via the Storage API (`DELETE /storage/v1/object/tenant-documents` with a `prefixes` list) after confirming via `supabase.com/docs/guides/storage/management/delete-objects` that raw SQL delete against `storage.objects` does NOT free the underlying object — only the Storage API does. Confirmed clean afterward (0 flat-path files remaining, 7 trainer files untouched).

#### Root cause (confirmed via Supabase logs, not just code reading)
Code path: `src/hooks/useBulkDeleteDocuments.ts` → `bulkDeleteDocuments()`:
1. Inserts audit-log entries for all documents being deleted.
2. Calls `deleteBulkDocumentFilesAfterRows()` (`src/pages/admin/documentsRegisterLogic.ts:107`), which:
   a. `await deleteRows()` — a single fast `DELETE ... WHERE id IN (...)` against `documents_register`. **This step is fast, atomic, and irreversible.**
   b. Then `await deleteFiles({ tenantId, paths })` → `deleteDocumentFiles()` (`src/lib/documentFiles.ts:147`), which loops `for (const p of args.paths) { await deleteDocumentFile(...) }` — **one HTTP round-trip per file, sequential, not parallel/batched.** Each call hits the `document-file-manager` edge function (action: delete), which does the actual `storage.remove([path])` server-side.

Checked `get_logs(service: 'edge-function')` for the 20-minute window around 2026-08-05T02:43:07Z: only **one** `document-file-manager` invocation appears in that whole window (at 02:45:09Z, ~2 min after the DB delete), when **374** were needed for the cleanup loop to fully run. Sampled execution time for that one call was ~753ms — at that rate, 374 sequential calls would take roughly 4-5 minutes to complete.

374 rows were deleted but only 117 of the corresponding files were left orphaned (374 − 117 = 257 file-delete calls apparently succeeded before something stopped the loop). This pattern — partial completion, no error surfaced, nothing resumed — is consistent with the browser tab being closed, navigated away from, refreshed, or losing network partway through the multi-minute serial cleanup loop. There is no persistence/resume mechanism for step 2 if it's interrupted: the DB half is already committed and irreversible by the time file cleanup even starts, and whatever files haven't been reached yet when the tab dies are stranded forever with **no error shown to the user and no retry**.

#### Not yet confirmed / next steps
1. **Whether the UI shows a "success" toast before or after the file-cleanup loop finishes.** If the toast fires as soon as `bulkDeleteDocuments()` resolves (i.e., after cleanup), the user wouldn't be able to close the tab "too early" under normal UI feedback — meaning the interruption was more likely an actual crash/nav-away/refresh mid-loop, not a race with the success message. If the toast is optimistic and fires early (e.g., driven by the DB delete alone or a different code path), that's a separate contributing bug worth flagging. Check the component that calls `useBulkDeleteDocuments()` (likely in or near `src/pages/Documents.tsx`) for the `onSuccess`/toast wiring.
2. **No fix has been designed or applied yet** — this handover is diagnosis only. Candidate directions (not decided, for discussion):
   - Make storage cleanup resumable/idempotent from a durable list (e.g., a small "pending deletion" table) instead of an in-memory JS loop, so a page refresh doesn't strand files.
   - Batch the storage delete calls (the Storage API's `remove()` accepts up to 1000 paths in one call) instead of one HTTP round-trip per file — this alone would cut a 4-5 minute operation down to near-instant and drastically shrink the interruption window.
   - Reverse the order: clean up storage first, delete DB rows only after storage cleanup confirms success (matches the pattern already used in `TenantDocuments.tsx`'s admin-panel delete handlers, which do storage-then-DB) — though note the code comment in `documentsRegisterLogic.ts` explains DB-first was a deliberate choice to avoid leaving register rows pointing at already-deleted files; any fix needs to reconcile with that reasoning rather than just flipping the order back.
   - Add a background reconciliation job that periodically finds storage objects with no matching register row (per tenant, via the same path-prefix / `documents_register.file_path` join used in this investigation) and either alerts someone or auto-cleans after a grace period.
3. **The 7 trainer-evidence orphans are a separate, unrelated bug** (different table, different upload path) — worth its own investigation, not folded into this one.

#### Key files
- `src/hooks/useBulkDeleteDocuments.ts`
- `src/pages/admin/documentsRegisterLogic.ts` (`deleteBulkDocumentFilesAfterRows`, `assertBulkDeleteRowCount`)
- `src/lib/documentFiles.ts` (`deleteDocumentFile`, `deleteDocumentFiles`)
- `supabase/functions/document-file-manager/index.ts` (server-side delete action, line ~282-292)
- Whatever page/component in `src/pages/` actually invokes `useBulkDeleteDocuments()` — not yet located, needed to check toast timing (see next step 1 above)
