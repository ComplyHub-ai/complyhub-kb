# Active Work — THE LEDGER (source of truth)

> Parked findings and follow-ups for a **later session** — not current in-progress work.
> Promote to a real task only via a new FRAME. See `CLAUDE.md` § "The Loop."

Last updated: 3 September 2026 (Worktree C released to standby after #954 merged)

---

## Worktree registry (advisory — git is ground truth)

> Which chat is using which worktree, on what task, since when. Check this before claiming a worktree
> to branch in; a claim older than a day should be re-verified against `git status`/last-commit time
> before trusting it. Where this disagrees with `git worktree list` / `git branch --show-current`, git
> wins. One DB/migration/edge-function job across both worktrees at a time — see `CLAUDE.md`
> § "Two worktrees".

| Worktree | Path | Branch | Claimed by | Task | Since |
|---|---|---|---|---|---|
| A | `rto-compass-hub` | `fix/ic-survey-write-lock-and-backfill` (merged as PR #1011, checkout stale) | unclaimed | — | 7 Sep 2026 |
| B | `rto-compass-hub-worktree-b` | `main` (`42aa95d11`, PR #1012 merged) | unclaimed | — | 7 Sep 2026 |
| C | `rto-compass-hub-C` | `standby/worktree-C` (reset to `origin/main` @ `35008bc00`) | unclaimed | — | 7 Sep 2026 |

**Worktree C teardown/reclaim — 7 Sep 2026:** `feat/risk-treatment-suggestions` was confirmed merged into `origin/main` (PR #941/#954 work concluded per the entries below). Since `main` is already checked out in worktree B, worktree C was moved to `standby/worktree-C` (reset to `origin/main`) rather than checking out `main` directly, then `docs/migration-discipline-post-squash` was branched fresh off `origin/main` for PR 6 (`migration-drift-remediation.md` §5). Pre-existing generated `html/` build artifacts were stashed and reapplied onto the new branch rather than discarded.

**Worktree C released — 7 Sep 2026:** PR #1013 (docs, migration discipline post-squash — see PR 6 above) merged (`35008bc00`). `main` was already checked out in worktree B, so worktree C was moved to `standby/worktree-C` and reset to fresh `origin/main` rather than checking out `main` directly; the preserved `html/` artifacts were stashed and reapplied on the standby branch. Row released to unclaimed.

**PR #941 review evidence — 3 Sep 2026:** current detached HEAD is `449a6f569` and `origin/main` is `ebb7a2639`. Exact reconciliation history was found in merged PR #959 for `20260902051032_intelligence_ass_review_queue_helper_execute_hardening` and `20260902215932_remove_duplicate_generic_qi_templates_dml`; PR #945 contains the Help Centre Session 8 DML corresponding to the remaining production-only row. These files are absent from current `origin/main`, so the migration-drift failure is pre-existing and outside #941. Review verdict is **NEEDS-WORK**: #941's new Risk Profile Setup navigation depends on the route/page supplied only by open PR #954, and the event-driven migration omits DELETE triggers for four primary source tables plus `tp_trainers`, leaving stale open suggestions until a later sweep. Direct changed-file ESLint, focused 7-file/43-test rerun, `git diff --check`, and `npm run type-check` completed cleanly. Generated `html/` modifications and untracked `test-results/` were preserved.

**PR #954 review evidence — 3 Sep 2026:** Worktree C is detached at `2bcc73809` from `origin/feat/assessment-review-queue`; current `origin/main` is `ebb7a2639`, and the PR is 301 commits behind with GitHub reporting `CONFLICTING`. Review verdict is **NEEDS-WORK**. Verified blockers are an unresolvable `secureId` import, risk-profile state surviving tenant switches, stale tenant schema field names and fail-open count handling, non-atomic/non-idempotent risk saves, unrelated validation deep-link fallback, and stale assessment-tool detail state across tenant switches. Additional risks are retired tools remaining queue-eligible, required answers not affecting generation, and arbitrary product/FRE query caps. Scoped ESLint passed for 30 changed source files; five focused test files passed 49 tests; `git diff --check`, repository type-check, `.single()` guard, and security guard passed. Supabase Preview is failing. Generated `html/` modifications and untracked `test-results/` remain preserved; no code changes, commit, or push was made.

**PR #954 fix/re-review evidence — 3 Sep 2026:** Fixed the reported build, tenant-isolation, schema/data-quality, save atomicity/idempotency, validation deep-link, stale detail-state, queue lifecycle, role-gate, risk-appetite, and laboratory-question issues in Worktree C. Added regression coverage. Final scoped ESLint passed; six focused test files passed 52 tests; repository type-check exited 0; and `git diff --check` passed. Second review found no remaining instance of the reported defects. The branch was then rebased onto current `origin/main`, committed as `94b3c29c5`, and force-pushed with lease to the existing PR branch. Post-push GitHub state is `MERGEABLE` with checks in progress. Existing generated `html/` changes and untracked `test-results/` remain preserved.

**PR #1007 review/fix/re-review evidence — 7 Sep 2026 (Worktree A):** `/pr-review` on `cursor/temporal-intelligence-f2-epic-07c9` (Phase F2.1 Temporal Intelligence Engine — compute-only, no persistence claimed) found a stale merge conflict against `main` (PR #997 Predictions had landed the same registry pattern) plus five metric-math bugs (uneven-interval acceleration bias, unfloored confidence scores, inverted direction for severity/priority series, sparse-segment "unknown" over-triggering, chart ignoring requested `seriesKey`) and nine worth-a-second-look items (UTC-vs-Sydney bucketing, zero-mean seasonality false positives, missing plateau data-gate, velocity sign loss at zero, future-dated snapshot inclusion, etc.) — all fixed. A subsequent `/fresh-eyes` pass caught a confidence-aggregation bug conflating "insufficient data" with a legitimate zero score, a UTC/Sydney mismatch between seasonality and the calendar timeline, `seriesKey` still dropped in the history timeline, a third severity-rank copy missing case normalisation, and a dead metric-provider registry — all fixed, with a regression test catching a wrong reuse of an unrelated inverted-sort helper before it shipped. 24 regression tests added; scoped ESLint and full suite clean. Confirmed no migrations or edge functions anywhere in the PR. One item flagged but not fixed (needs Brian's go-ahead, DB change): the live `intelligence_get_insight_memory` RPC caps `p_limit` at 200 and returns the *oldest* 200 rows, silently starving long-history insights of any recent data — worth a FRAME. PR merged `2026-09-07T02:17:40Z` (`14d75b900`); Worktree A returned to `main`, registry row released.

## Pending — awaiting reply

### Playwright QA automation reference

For future feature QA, use the Playwright test suite under `rto-compass-hub/tests/e2e/` and add a
focused spec for the user journey being protected. The baseline sample is
`tests/e2e/tas-pdf-pagination.spec.ts`, the TAS PDF QA checker. It demonstrates authenticated
setup, stable UI test IDs, generation/download verification, PDF text/layout inspection with
`pdfjs-dist`, footer-overlap assertions, and attaching the generated PDF to the Playwright report.

Useful references:

- Run a focused check: `npx playwright test tests/e2e/<feature>.spec.ts --project=chromium`
- Force a clean local Vite server: prefix the command with `CI=1`
- View attached artifacts: `npx playwright show-report`
- Add new feature specs beside the TAS checker in `rto-compass-hub/tests/e2e/`; reuse its setup,
  diagnostics, download handling, and artifact attachment patterns where applicable.

---

## Backlog — PARKED findings (NOT scheduled work)

- **8 pairs of duplicate active `cron.job` rows, plus hardcoded anon-key auth on several jobs** —
  surfaced 4 Sep 2026 while capturing `cron.job` for the PR 4 cutover's non-schema-items gate (migration
  drift remediation). Pairs confirmed both `active: true` targeting the same function: `ingest-tga-unit-parents-nightly`/`-nightly-fixed`,
  `ingest-tga-companion-files-nightly`/`-nightly-fixed`, `ingest-ncver-nominal-hours-daily`/`-daily-fixed`,
  `trial-email-reminders`/`-fixed`, `enforce-billing-lockout-nightly`/`-fixed`, `snapshot-usage-nightly`/`-fixed`,
  `nightly-tas-monitor`/`-fixed`, `ops-run-diagnostics-15m`/`-fixed` (offset schedule, so this pair fires
  more often than intended rather than colliding). Looks like an in-progress migration from hardcoded-Authorization-header
  jobs to a `vault.decrypted_secrets`-based pattern where the old job was never disabled once its `-fixed`
  replacement shipped — net effect is several ingest/reminder functions firing twice. Separately, several
  jobs (both old and some `-fixed` ones, e.g. `ingest-tga-unit-parents-nightly-fixed`) still hardcode the
  Supabase **anon** key directly in the `Authorization` header instead of using the vault secret — not a
  credential leak (anon keys are publishable by design) but an inconsistent, weaker auth pattern than the
  jobs already migrated. Full snapshot: `complyhub-kb/audit/pr4-cutover-2026-09-04/cron-jobs-snapshot.json`.
  Needs a FRAME: disable the 8 superseded old jobs (confirm each `-fixed` pair truly duplicates before
  disabling, don't assume from name alone) and finish migrating the remaining hardcoded-anon-key jobs to
  the vault pattern.

- **`sa-delete-tenant-complete` edge function is not actually complete** — surfaced 3 Sep 2026 while scoping removal of the legacy `vivacity-ian-troubleshooting` test tenant (0 members, subscription canceled, no billing). Function's own comment claims "the database has 158 CASCADE rules" and relies on CASCADE to clean up everything after it explicitly deletes only 4 tables (`user_invitations`, `tenant_settings`, `tenant_plans`, `tenant_documents`) and the `tenants` row itself. Verified live via `information_schema`: the vast majority of ~400 tenant-scoped tables — including `tar_register`, `tp_trainers`, `trainer_unit_map`, and effectively all governance/compliance/TAS content tables — have **no FK constraint back to `tenants(id)` at all**, so none of that data is actually removed. The function still reports `"Tenant has been completely deleted from the system"` regardless. Not a live security/data-leak risk (orphaned rows become unreachable once the tenant record is gone — every read path requires an active `tenant_members` row), just silently incomplete — wasted storage, and a misleading success message for anyone relying on it for genuine data purge. Needs a FRAME: correctly enumerate every tenant-scoped table and either add real CASCADE FKs or delete explicitly in dependency order, in its own dedicated session (not a rushed inline fix, per the same caution already applied to the 214/218-item migration drift reconciliation project above).
- **`TrainerDocumentsDialog.tsx`/`OnboardingSummaryCard.tsx` fetch data in the component body** — surfaced 3 Sep 2026 during `/fresh-eyes` on `feat/trainer-uploaded-documents-view`, confirmed bugs fixed same session (orphaned tile/dialog mismatch, broken preview for legacy trainer-path files, swallowed query error). This item is the one AGENTS.md convention violation ("no `supabase.from()` in components — hooks only") left untouched, since fixing it means extracting several new hooks — a bigger reshape than a bug fix. `TrainerDocumentsDialog.tsx` is also 361 lines (repo cap ~300). Needs a FRAME if Brian wants it done.
- **`TrainerDocumentsDialog.tsx` only shows the first link per document** — surfaced same session. A document linked to both a credential and a PD record displays one badge; the tooltip promises "see which file is linked to which record" and under-delivers for multi-link documents (8 in production as of 3 Sep 2026). Not wrong, just incomplete — needs its own FRAME if worth fixing.
- ~~Consultants can't see PD record titles in the Linked documents dialog~~ — **FALSE POSITIVE, closed 3 Sep 2026.** Original `/fresh-eyes` finding assumed `trainer_pd`'s RESTRICTIVE `restrict_select_trainer_pd` policy (`sec.has_tenant_role(tenant_id, ARRAY['Administrator','Compliance Manager'])`) excludes Consultant. Verified live: `sec.has_tenant_role`'s own body auto-appends `'Consultant'` to the effective role set whenever `'Administrator'` is requested (`WHEN 'Administrator' = ANY(p_roles) THEN p_roles || ARRAY['Consultant']`), and confirmed real active Consultant `tenant_members` rows (Proper Case) exist in tenants with `trainer_pd` data. Consultants already pass this policy — no RLS change made, no migration written.

- **`get_my_app_context` still returns JSON-null `is_superadmin`** — parked 1 Sep 2026 after PR #922. Client coerce ships on production; SQL `COALESCE` / `false OR NULL` → false is a follow-up when worktree A is free of DB work. Do not start while A is mid Phase B apply.
- **Draft-based `rpc_compile_tas` with live access check** — parked 2 Sep 2026 during PR 3. Skipped leftover `20260822045800` because it would drop `is_tenant_authorized` on build-state v2 and final compile. No later leftover carries the draft assembler plus that gate. Promote only via a new FRAME.
- **SSO accept/start membership + revoke unused 1-arg submit** — parked 2 Sep 2026 during PR 3. Skipped leftover `20260822060000` because the same file would overlay Wave 0g governance suggestion RPCs (`assert_core_governance_access`, already stamped `20260822103643`) and would add Consultant Assistant on SSO accept. Live accept/start still use `profiles.role`. Promote only via a new FRAME.
- **TAS trainer-matrix membership without dropping later tenant gate** — parked 3 Sep 2026 during PR 3. Skipped `20260822120000` because live already has `is_tenant_authorized` and calls `build_trainer_matrix_internal`. Promote only via a new FRAME.

_Adjacent issues surfaced during work but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

0. **Industry Consultation plan/engage/outcomes/review wizard is unreachable dead code** — surfaced
  21 Aug 2026 while fixing IC bug 5 (`fix/ic-av-findings-batch1`, worktree A). `src/pages/registers/industry-consultation/index.tsx`
  (which renders `EngageStage`/`OutcomesStage`/`ReviewStage`/`PlanStage`) is imported in `AppRoutes.tsx:359`
  but never used as a route element anywhere in the file — confirmed via `grep -n "IndustryConsultation"`
  returning only the lazy-import line. The only live route at a related path, `/industry-engagement`,
  renders a completely different component (`IENRegisterPage`) with unrelated tabs
  (`plans|register|surveys|coverage|dashboard|legacy`, not `plan|engagement|currency|outcomes`).
  Practical effect: none of the createPlan/createEngagement/createOutcome flows fixed in this branch are
  reachable through the UI today — engagement data only surfaces read-only via the `legacy` tab
  (`LegacyEngagementsTab`). `useICEnforcement`'s "fix now" links were repointed to the closest real tabs
  on `/industry-engagement` as a stopgap (no longer 404 to `/login`-via-catchall), but this doesn't restore
  the actual wizard. **Needs a FRAME:** either mount `registers/industry-consultation` as a real route (and
  reconcile it with `/industry-engagement`), or confirm it's superseded/retire it and repoint any surviving
  callers. Until decided, the entire plan/engage/outcomes/review UI is inert.
2. **"Supabase Preview" branch-DB build fails on every PR, not just drift-affected ones** — confirmed 19 Aug 2026 during PR #500 (ComplyBot Phase 0). Error: `duplicate key value violates unique constraint "schema_migrations_pkey" — Key (version)=(20260814061750) already exists`. Verified live: production's ledger already has this exact version/name (`reschedule_fixed_tga_ingest_crons_avoid_race`) matching the git file — not a naming collision. Root cause: the preview-branch builder clones a production snapshot (which already has this version recorded) then replays all local migration files on top, including ones the snapshot already has, instead of skipping already-applied versions. This is the branch-DB-fails symptom `supabase/migrations/CLAUDE.md`'s "supabase db push is currently unusable" section already documents. **Confirmed pre-existing and universal**: PR #496 and #494 (both already merged last week, unrelated changes) show the identical "Supabase Preview: fail." Does not block merge (`mergeStateStatus: MERGEABLE`, not a required check) but means no PR gets a working preview branch DB right now. Full fix is the same ~2,000-version reconciliation project below — not a quick patch.
  - **Update 4 Sep 2026 — the flakiness has multiple, unrelated root causes, not just the one above.** Cross-checked three recent PRs' Supabase bot comments and found three distinct failure signatures on three distinct PRs: (a) PR #970 (`feat/fresh-database-verification-harness`, today) — `failed to read project config: unexpected status 404: Failed to retrieve project's storage config`, dying at the **Configurations** step before Migrations/Seeding/Edge Functions even start; (b) PR #968 (3 Sep) — `FATAL: terminating connection due to administrator command (SQLSTATE 57P01)`, a connection killed mid-replay on a `user_avatars` storage RLS policy statement; (c) PR #779/#778 (25 Aug) — `failed to clone repo: couldn't find remote ref`, already diagnosed in `migration-drift-remediation.md` §4.4.4 Stage B as stale/deleted git refs. Confirmed PR #970's own diff touches no `config.toml` and adds only new files (a workflow + 3 scripts + 33 lines in `reference_data.sql`), so its failure is not caused by anything in that PR — it's ambient platform-side preview-branch instability, same category as the original 19 Aug finding, just proof the mechanism isn't singular. Not investigated further — parked, since none of the three block a merge (none is a required check).
3. **types.ts hand-patching practice gap** — surfaced 18 Aug 2026 during PR #472 (post-457/467
  cleanup). `types.ts` hadn't had a full `generate_typescript_types` regen since 5 Aug 2026 — every
  PR since (including #457 itself) only hand-added the specific column(s) it needed, so tables added
  purely via migration (no matching hand-edit) never appeared: the whole `intelligence_*` subsystem
  (added 12 Aug), `qi_campaigns`/`qi_campaign_recipients` (added 5 Aug, same day as the last regen but
  after it), `governance_thresholds`, `meeting_duplicate_candidates`, `driver_register_map`, and more.
  PR #472 did a full regen to catch up. No process fix yet decided (e.g. a CI check that flags
  types.ts drift against `list_migrations`, or a habit of always running the full regen instead of
  hand-patching) — needs a FRAME if Brian wants one.
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

10. **`permissions.ts` confirmed largely (not fully) dead code** — surfaced 21 Aug 2026 while
  investigating (now closed) backlog #6; further diagnosed 21 Aug 2026. Full grep of every export in
  `src/config/permissions.ts` (487 lines) against all of `src/`: **live** — `canAccess` (used by
  `useSidebarPermissions.ts` → `SidebarV3.tsx`, rendered from `SharedShell.tsx`) and
  `setDynamicPermissions` (used by `useLoadDynamicPermissions.ts` → `RbacProvider.tsx`, mounted from
  `App.tsx`). **Dead** — `canAccessPath`, `hasFullAccess`, `getMergedPermissions`,
  `PATH_TO_PERMISSION`, `AVAILABLE_PERMISSIONS`, `PERMISSION_KEYS`: zero callers anywhere. **Dead
  chain** — `DEFAULT_ROLE_CONFIGS` has one caller, `useRoleConfigManagement`/`useMultiRolePermissions`,
  which itself has zero callers anywhere in `src/` (dead code calling into a dead hook). No single
  "superseded by RBAC" commit found via `git log --follow` — this looks like an older permission layer
  left alongside the newer `get_my_app_context` RPC → `useEffectiveRole()` path rather than a clean
  replacement. **Recommendation:** a trim (not delete-the-file) cleanup PR is worth it — remove
  `canAccessPath`, `hasFullAccess`, `getMergedPermissions`, `PATH_TO_PERMISSION`, and the
  `useRoleConfigManagement`/`useMultiRolePermissions`/`DEFAULT_ROLE_CONFIGS` dead chain together. Double
  check `AVAILABLE_PERMISSIONS`/`PERMISSION_KEYS` aren't consumed as a literal shape (not just by
  identifier) by a role-editor UI before deleting those two. Needs a FRAME to execute as a real PR.
11. **45 `profiles.role` NULL rows — mostly harmless, but a narrow latent bug for 4 staff `qa_tester`
  accounts** — surfaced 21 Aug 2026 during backlog #6 investigation; further diagnosed 21 Aug 2026 via
  live DB query on project `gdwhlstfguxarnxasrrs`. Breakdown of the 45: **18 real external tenant
  users** — all harmless, gated correctly by a live `tenant_members.role` row regardless of
  `profiles.role` (one has a `deactivated` membership, unrelated to the NULL). **~22 abandoned
  signups** — personal/gmail addresses with no `active_tenant_id` and no tenant membership; harmless,
  nothing depends on their role. **5 staff/test accounts**
  (`hambert`/`bonnie`/`ceo`/`test2@vivacity.com.au`, `angela+phase7test@complyhub.ai`) — confirmed via
  `pg_get_functiondef` that `get_my_app_context`'s superadmin check is
  `role = 'super_admin' OR global_role = 'platform_owner'` (no separate allowlist table exists); these
  4 vivacity accounts have `global_role = 'qa_tester'` and `is_internal_staff = true`, which satisfies
  **neither** branch — so the NULL `profiles.role` isn't actually what blocks them from this RPC, a
  `qa_tester` global_role was never going to pass either way. However, `RootLanding.tsx:34` and
  `LandingRedirect.tsx:25` still gate superadmin dashboard routing on the legacy
  `profile.role === 'super_admin'` anti-pattern (the one `CLAUDE.md` already documents as banned) — for
  these 4 accounts that evaluates false, so a login attempt would silently fall through to a
  `tenants.owner_id` lookup (no row → error → `catch` defaults to `/dashboard`) instead of routing to
  `/superadmin/dashboard`. No crash, no error surfaced — just silently wrong destination. These look
  like dormant test accounts, not ones anyone is actively logging into today, so this is a **latent**
  bug, not an active one. **Recommendation:** not urgent, but worth keeping — either backfill
  `role='super_admin'` for the genuinely-staff accounts that should route as superadmin, or migrate
  `RootLanding.tsx`/`LandingRedirect.tsx` off the legacy `profile.role` check onto
  `is_internal_staff`/`global_role` (or `useEffectiveRole()`) so this bug class can't recur. Needs a
  FRAME if Brian wants it actually fixed.

---

12. **`index.ts` still over the 500-line edge-function cap after PR #789** — surfaced 26 Aug 2026
  reviewing PR #789 (merged 25 Aug 2026, `parse-tas-document` Mammoth DOCX fix). The PR's stated
  reason for extracting `failDocument.ts` was to bring `supabase/functions/parse-tas-document/index.ts`
  under the repo's 500-line cap — verified independently (`wc -l`) it's still 527 lines. Only 1 of 6
  duplicate DB-write+Response failure blocks (lines ~218, 228, 309, 365, 381, 451) was migrated to the
  new `failDocument.ts` helper; the other 5 still inline the same pattern. Not a functional bug — the
  fix itself (mammoth `{buffer: bytes}` instead of `{arrayBuffer}`) is correct and already shipped to
  production via auto-deploy. Needs a FRAME: migrate the remaining 5 call sites to `failDocument.ts` to
  actually satisfy the line-count goal.

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
