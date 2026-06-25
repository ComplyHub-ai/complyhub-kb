# Completed PRs
Tracks every PR reviewed, fixed, and merged as part of the branch cleanup plan.

---

## PR #21 — Fix assessment tool legacy status handling
**Branch:** `cursor/critical-bug-investigation-fef7`
**Status:** MERGED AND DELETED
**Merged:** 19 June 2026 — KhianBrian

### What the PR did
Added `normalizeToolStatus()` to `statusBadges.tsx` to map the legacy `active` DB value to `published` (and fall back unknown values to `draft`). Applied normalisation throughout `index.tsx` — KPI counts, overdue count, status filter — and in `AssessmentToolDetail.tsx` action-button gating. Fixed `handleSave` in `index.tsx` to preserve a tool's existing status when editing a non-draft tool, preventing accidental demotion of approved/published tools. Added Vitest coverage for the normalisation function and badge rendering.

### Issues found in review
- [MEDIUM — FIXED] `index.tsx` — hard conflict with main caused by PR #37 (merged 17 June) having independently added `TrainingProductBadges`, `AssessmentToolSavePayload`, and `getToolTrainingProductCodes` to the same file. PR #21 cut from a pre-#37 base and removed those additions. Fixed: merged `origin/main` into branch, kept `AssessmentToolSavePayload` type (correct — matches `AssessmentToolForm.onSave` contract), applied `isSubmittingExistingDraft` logic from PR #21 to `handleSave` body.

### Changes we made
| File | Change |
|---|---|
| `src/pages/registers/assessment-tools/index.tsx` | Merged `origin/main`; resolved `handleSave` conflict keeping `AssessmentToolSavePayload` type and PR #21's `isSubmittingExistingDraft` logic |

### Conflicts with fix/local-run
Zero — none of PR #21's 4 files appear in the 24-file both-sides conflict set. No Phase 5 impact.

---

## PR #23 — Fix destructive TAS and trainer delete regressions
**Branch:** `cursor/critical-bug-investigation-6f72`
**Status:** MERGED AND DELETED
**Merged:** 18 June 2026 — KhianBrian at 06:28 UTC

### What the PR did
Fixed four production data integrity bugs: (1) TAS consultation "Pull Records" could overwrite another TAS build's scalar `tas_id` link on `industry_consultation_records`; (2) TAS "Delete completely" could hard-delete a shared consultation register row, cascading away junction links from other builds; (3) trainer matrix delete dialogs stored only record id/kind with no trainer binding — a stale dialog could delete a different trainer's record; (4) PD register delete sync did not remove mirrored rows from `pdr_register`. Also included junction-linked consultations in phase validation and legacy PDF export, and scoped all trainer matrix mutations by `trainer_id` + `tenant_id`.

### Issues found in review
- [HIGH — FIXED] `usePhaseValidation.ts` — queried non-existent `consultation_source` column; production has `source`. PostgREST returns 400 on unknown column, breaking TAS builder phase validation for all tenants. Fixed: changed to `consultation_method` (with `source` fallback) — `consultation_method` is the field that actually holds 'employer'/'industry_body' values.
- [HIGH — FIXED] `TrainerProfileDrawer.tsx` — hard conflict with main's newer `handleConfirmDelete`. Main had added `compute_trainer_classification` RPC call and `canonical-trainer-compliance` cache invalidation after this branch was cut. Fixed: merged main into branch, resolved conflict keeping PR's trainer-scoped invalidation plus main's additions. Also removed duplicate `logger` import.
- [MEDIUM — FIXED] Migration `20260610113000` — `fn_sync_trainer_pd_delete()` function created but no trigger attached. PD register sync on delete silently never fired. Fixed: appended `CREATE TRIGGER trg_sync_trainer_pd_delete AFTER DELETE ON trainer_industry_currency`.
- [MEDIUM — FIXED (Bugbot)] `usePhaseValidation.ts` — initial fix used `source` column which holds provenance values ('register'/'builder'), not stakeholder type. Employer counts would always return 0. Fixed: `consultation_method ?? source` fallback pattern, matching `ConsultationBuilderPanel`.
- [MEDIUM — FIXED (Bugbot)] `useConsultationRecordsForTas.ts` — delete mutation's `if (!record) return` silent early exit triggered `onSuccess`, showing "Consultation deleted" toast when nothing was deleted. Fixed: changed to `throw new Error(...)`.

### Changes we made
| File | Change |
|---|---|
| `src/hooks/usePhaseValidation.ts` | `consultation_source` → `consultation_method ?? source` in select strings and filter lines |
| `src/components/trainer-matrix/TrainerProfileDrawer.tsx` | Merged main; resolved conflict; removed duplicate `logger` import; added RPC call for currency/pd deletes; added `canonical-trainer-compliance` invalidation |
| `supabase/migrations/20260610113000_...sql` | Appended `CREATE TRIGGER trg_sync_trainer_pd_delete AFTER DELETE ON trainer_industry_currency` |
| `src/hooks/useConsultationRecordsForTas.ts` | `if (!record) return` → `throw new Error(...)` in delete mutation |

### Conflicts with fix/local-run
Zero — none of PR #23's 7 files appear in the 24-file both-sides conflict set. No Phase 5 impact.

### Plan gaps caught and patched
Three new rules added to PLAN.md as a result of misses on this PR:
1. Lens 2: `SELECT DISTINCT` required for any column used in a filter expression — confirming existence is not enough
2. Step 7b item 4: mutations with a lookup must throw on not-found, not silently return
3. Stage 3: conflicts with main require a real `git merge origin/main` on the branch — editing the file directly does not clear GitHub's conflict detection

---

## PR #26 — Rescue/pending work 20260613 (Angela's rescue branch)
**Branch:** `rescue/pending-work-20260613`
**Status:** MERGED AND DELETED
**Merged:** 18 June 2026

### What the PR did
Large rescue branch by Angela containing: TAS AOT Quality Engine polymorphism (3-branch engine: qualification/skillset/unit), billing plan eligibility switch to `get_eligible_plans` RPC, TAS consultation links UI, regulatory overlays panel, assessment tool naming + custom_id columns, email outbox worker pg_cron schedule, QI register autolog trigger, trainer industry currency archive columns, and 2 new edge functions (`suggest-assessment-tool-name`, `tga-sync-components`). 6,044 additions across 48 files, 18 migrations.

### Issues found in review
- [CRITICAL] Hard-coded production anon JWT in cron migration — waived (consistent with 12 existing cron migrations in repo; Carl to clean up platform-wide)
- [CRITICAL] All 18 migration timestamps pre-dated main's ceiling (`20260618021722`) — re-timestamped to `20260618021800`–`20260618023000`
- [CRITICAL] 6 add/add merge conflicts with PR #29 (already on main) — resolved by keeping RJ's (main's) versions for all 6 files
- [HIGH] `suggest-assessment-tool-name` and `tga-sync-components` not in `config.toml` — added with `verify_jwt = true`
- [HIGH] CI Vercel FAIL — fixed by merging main (eslint@9, 670 missing files from branch cut)
- [HIGH] `rpc_calculate_aot_engine` migration — ON CONFLICT missing on `sum_of_units` and `single_unit_nominal` INSERT branches — fixed
- [MEDIUM] `useAotPackFreshness` always-stale for skillset/unit packs — fixed by adding `aot_mode` check
- [MEDIUM] `useTasDraftSections:117` ISO timestamp string compare bug (`+00:00` vs `Z`) — fixed with `getTime()` comparison
- [STALE] alignment_status constraint finding (Bugbot) — values already in production, no action
- [STALE] email-outbox-worker duplicate-send finding (Bugbot) — RJ's two-step claim version already on branch, no action
- [MEDIUM] `get_eligible_plans` RPC unverified — confirmed in production with correct signature

### Changes we made
1. Deleted 10 duplicate/superseded migrations; renamed 13 unique migrations to `20260618021800`–`20260618023000` sequential order
2. Pre-resolved 6 add/add conflicts with main — kept RJ's versions for all 6 files
3. Added `config.toml` entries for both new edge functions (`verify_jwt = true`)
4. Merged `origin/main` into branch — brought eslint@9 and 670 missing files; resolved 1 `config.toml` conflict
5. Added ON CONFLICT DO UPDATE to `sum_of_units` and `single_unit_nominal` branches in `rpc_calculate_aot_engine`
6. Fixed `useAotPackFreshness` to skip empty-allocations stale check for non-`aqf_vol` modes
7. Fixed `useTasDraftSections:117` ISO string compare to use `getTime()`

### Conflicts with main
Dry-run clean after pre-resolution of 6 add/add conflicts (done on branch before merge).

### Conflicts with fix/local-run
- New: `package-lock.json` (new deps from branch)
- New: `supabase/functions/email-outbox-worker/index.ts` (three-way conflict — main/PR26/fix/local-run all diverged; Carl must reconcile manually in Phase 5)
- Pre-existing: 17 hard conflicts already tracked

---

## PR #39 — Add retrospective bulk upload entry points for AI trainer onboarding
**Branch:** `cursor/bulk-upload-evidence-wizard-63d9`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Added three new entry points into the existing 7-step AI trainer onboarding wizard so admins can retrospectively bulk upload evidence for existing trainers without creating a new trainer row:
1. **Trainer profile drawer header** — "Bulk Upload Evidence" button opens wizard with trainer pre-selected and locked, starting at Step 2.
2. **Matrix toolbar** — "AI Onboard" renamed to "Onboard New Trainer"; new "Bulk Upload Evidence" button opens Step 1 with "Select Existing Trainer" mode pre-selected (active trainers only).
3. **PD tab** — "Bulk Upload PD" button opens wizard in PD-only mode (trainer locked, only PD records created on confirm).

Added `OnboardingWizardMode` type (`new-trainer | select-existing | bulk-evidence | bulk-pd`) and `pdOnly` flag in `useTrainerOnboarding`. Added `PreviousUploadSessions` component in the PD tab listing confirmed sessions with date, record count, and a View dialog. All 7-step wizard flow and Edge Functions unchanged.

### Issues found in review
- [LOW] `MissingFilePanel.tsx` now orphaned — import replaced by `PreviousUploadSessions`. Dead code, not broken.
- [LOW] 5 new packages added to `package.json` (`canvas-confetti`, `exceljs`, `jspdf`, `jszip`, `react-markdown`) not used in this PR's files — likely added in same Lovable session for upcoming work.
- [LOW] `PreviousUploadSessions` shows 12 production sessions with empty `records_created` as "0 records created" — accurate.

### Changes we made
None — PR was clean, no fixes required before merge.

### Conflicts with main
Dry-run clean — no conflicts.

### Conflicts with fix/local-run
Zero new conflicts. All 15 conflicts in dry-run 2 were pre-existing and already tracked. None of PR #39's 11 source files appear in the 24-file conflict-risk set.

---

## PR #24 — Fix trainer evidence deletion recompute
**Branch:** `cursor/critical-bug-investigation-3dff`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Fixed a stale compliance badge bug after deleting trainer PD or currency evidence. The delete handler was calling `compute_trainer_classification` with only `p_trainer_id` — missing the required `p_tenant_id` param — so Supabase returned an RPC error that was silently swallowed. The compliance badge query was also never invalidated, meaning the trainer could still show as compliant after losing their last piece of evidence. Fix adds `p_tenant_id`, checks the returned error, and invalidates `canonical-trainer-compliance` so the badge refreshes immediately. Also removed a duplicate `Upload`/`FolderUp` lucide-react import that was breaking the production build.

### Issues found in review
- `console.warn` introduced by the PR violated CLAUDE.md ban on raw console calls in `src/`. Fixed before merge.

### Changes we made
| File | Change |
|---|---|
| `src/components/trainer-matrix/TrainerProfileDrawer.tsx` | Added `import { logger } from '@/lib/logger'`; replaced `console.warn(...)` with `logger.warn('compute_trainer_classification failed', { error: (e as Error).message })` |

### Conflicts with main
Clean — dry-run merge into main had no conflicts. ✅

### Conflicts with fix/local-run
Zero new conflicts. All 17 conflicts in the dry-run were pre-existing (tracked under PR #34 and earlier). `TrainerProfileDrawer.tsx` has no overlap with `fix/local-run`.

---

## PR #33 — Fix calendar tenant scoping for super_admin cross-tenant data leak
**Branch:** `cursor/calendar-tenant-filter-ac7f`
**Status:** MERGED AND DELETED
**Merged:** 16 June 2026

### What the PR did
Fixed a cross-tenant data leak affecting super admins on the calendar. All five calendar hooks were filtering by `profile.tenant_id` (the super admin's home tenant) instead of `activeTenantId` from context (the tenant they are currently viewing). The fix switches every hook to read from `useAppContext()`, adds null guards so queries don't fire without a valid tenant, and keys query caches on `activeTenantId` so switching tenants correctly invalidates and re-fetches.

### Issues found in review
1. **Pre-existing `.single()` calls** — `useCalendarEvents.ts` create and update mutations still use `.single()`. Not introduced by this PR. Deferred cleanup.
2. **`useGovernanceMeetings` unused param** — signature still accepted `tenantId` but ignored it after the context switch. We renamed it to `_tenantId` in a local commit but did not push before branch was deleted.

### Changes we made
No changes made by us made it to main — branch was merged before we pushed. Our local commit with `.single()` → `.maybeSingle()` and `_tenantId` rename was lost when the branch was deleted. The security fix itself came from the original PR.

### Conflicts with fix/local-run
`useGovernanceMeetings.ts` has diverged — will need manual resolution when `fix/local-run` is synced to main.

---

## PR #30 — Fix consultant portfolio approval role safety
**Branch:** `cursor/critical-bug-investigation-b5a0`
**Status:** MERGED AND DELETED
**Merged:** 16 June 2026

### What the PR did
Fixed a role safety bug where approving a consultant's portfolio request would overwrite the consultant's existing role at that RTO. If they were already an Administrator, the approval would silently downgrade them to Consultant. The fix replaces the destructive `admin_add_membership` call with a safe upsert — existing active privileged roles are preserved, new members get the Consultant role.

Also fixed `get_my_portfolio_requests` which was joining on the wrong column (causing portfolio requests to go missing from the consultant's view), and updated `sa_list_tenants_v3` to allow consultant callers with visibility filtering applied.

### Key finding during review
The Supabase Preview CI `MIGRATIONS_FAILED` status was not caused by this PR. It is a **project-wide systemic issue**: hundreds of migration files from mid-2025 were named with a hyphen after the timestamp (`20250730-uuid.sql`) instead of the required underscore (`20250730_name.sql`). Supabase skips them all on preview branch replay, causing every branch including `main` to show `MIGRATIONS_FAILED`. This has been silently broken since at least February 2026. **Carl needs to rename those files and repair the migration tracking table.**

### Changes we made
| File | Change |
|---|---|
| `supabase/migrations/20260616110000_fix_portfolio_request_membership.sql` | Renamed from `20260613110108_...` — re-dated to run after the two 14 June migrations on main |

### Commit
`5a105b129` — `fix: re-timestamp portfolio membership migration to run after 14 June migrations`

### Dry-run merge result
No conflicts — migration file had no overlap with any file on `fix/local-run` or the 14 June migrations.

---

## PR #31 — Fix broken billing subscription route targets
**Branch:** `cursor/critical-bug-investigation-0409`
**Status:** MERGED AND DELETED
**Merged:** 16 June 2026
**Merge commit:** `fd34b1683`

### What the PR did
Fixed broken billing/upgrade CTAs that were still pointing at old routes (`/pricing`, `/settings/tenant?tab=subscription`) after the canonical billing pages moved to `/billing/subscribe` and `/dashboard/settings/subscription`. Added legacy redirect components to handle old URLs gracefully.

### Issues found in review
1. **CASE logic inverted** — bare `/settings/tenant` (no tab) was defaulting to subscription settings instead of organisation settings. Every other billing CTA in the codebase explicitly passes `?tab=subscription` when it wants the subscription page — meaning the only thing that ever used bare `/settings/tenant` was the sidebar Settings link, which should land on organisation settings.
2. **`window.location.href` instead of `navigate()`** — `SubscriptionManagement.tsx` was using a hard page reload for an internal navigation, busting SPA state and losing React Query cache.
3. **`console.debug` trace logs shipping to production** — 4 `[trace]` debug statements left in `Auth.tsx`.
4. **Test asserting wrong behaviour** — the test for bare `/settings/tenant` was asserting the inverted default (subscription settings) rather than the correct one.

### Changes we made
| File | Change |
|---|---|
| `src/AppRoutes.tsx` | Flipped CASE logic — `requestedTab === "subscription"` → subscription settings, everything else → organisation settings |
| `src/components/SubscriptionManagement.tsx` | Added `useNavigate` import, replaced `window.location.href` with `navigate()` |
| `src/pages/Auth.tsx` | Removed all 4 `console.debug('[trace]')` statements |
| `tests/routes/billing-legacy-redirects.test.tsx` | Updated test 3 to assert bare `/settings/tenant` → organisation settings (not subscription) |

### Commit
`07de7d4e1` — `fix(billing): correct legacy settings redirect default and cleanup`

### Dry-run merge result
Clean — no conflicts with current `main` at time of merge.

---

## PR #35 — Enable editing of past and completed meetings
**Branch:** `cursor/past-meeting-editing-8c64`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Removed the frontend read-only lock (`disabled={!!meetingEndedAt}`) on the `AttendancePanel` for past/completed meetings, giving RTOs the ability to upload minutes, edit discussion notes, manage action items, and update attendees for meetings that occurred before they started using ComplyHub. Expanded the Live Meeting selector from future-only to the past 12 months (limit 50, sorted upcoming-first). Added an informational `PastMeetingBanner` component shown in the Live tab and Meeting Detail Drawer when a meeting date is past or status is completed. Added case-insensitive status normalisation helpers (`normalizeMeetingStatus`, `isMeetingCompleted`, etc.) in a new `meetingManagerUtils.ts` and applied them across `MeetingStatusManager`, `ActionFollowupTab`, and `MeetingDetailDrawer`. Added an "Edit Meeting" button on History cards and the detail drawer that navigates to `?tab=live&meetingId=...` for full editing via a new `handleEditMeetingInLive` flow. Wired a silent backdated audit trail via `markMeetingBackdatedIfNeeded()` — on first save of a past meeting, sets `is_backdated = true` and `backdated_by = auth.uid()` in `governance_meetings`.

### Issues found in review
1. **Silent error swallow in `markMeetingBackdatedIfNeeded`** — Supabase update call has no error handler. If the update fails, `is_backdated` never sets with no feedback. Not blocking; best-effort audit trail is intentional.
2. **`starts_at` fallback in `HistoryTab`** — `meetingRecord?.meeting_date ?? meetingRecord?.starts_at` is unnecessary since `meeting_date` is `NOT NULL` in the schema. No functional impact.
3. **Selector limit increase** — Up to 50 meetings now loaded (was 10). No pagination. Fine for current data volume.

### Changes we made
No changes — PR was clean and approved as-is.

### Conflicts with fix/local-run
`LiveMeetingTab.tsx` and `UnifiedGovernanceMeetingManager.tsx` are both heavily modified and will conflict in Phase 5 when `fix/local-run` is synced to main. Already tracked in `phase5-conflict-tracker.md`.

---

## PR #36 — feat(governance): Read-only trainer and SSO report summaries in Live Meeting
**Branch:** `cursor/agenda-report-summaries-8c64`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026
**Commit:** `34bfa4340` (our fixes) → merge commit `9addda15b`

### What the PR did
Replaced free-text Discussion Notes in the Live Meeting tab for the Monthly Trainers Report and SSO Report agenda sections with read-only structured summary panels. Each panel pulls submitted reports for the prior reporting month, displays key stats (LLN concerns, wellbeing incidents, delivery exceptions, PD activity, improvement items for trainers; snapshot, delta highlights, and commentary for SSO), and offers a "Generate AI Summary" button that calls a new `governance-section-ai-summary` edge function to produce a plain-English narrative for governing persons. The AI summary is persisted to `governance_meeting_minutes.section_notes` via a new `useMeetingSectionNotes` hook and survives page reload. Discussion Notes textarea is hidden for these two sections only — Actions and Sync to Tasks remain editable. Backdated meeting fallback logic picks the closest available reporting period when an exact prior-month match doesn't exist.

### Issues found and fixed
1. **`config.toml` missing entry** — `governance-section-ai-summary` not registered. Added with `verify_jwt = true`. Confirmed correct by cross-checking all other governance/AI functions (all use `true`; `false` is cron-only).
2. **`wellbeing_incidents` JSONB type mismatch** — DB column is `jsonb`, code checked `typeof === 'string'` — always `undefined`. Fixed to handle array of strings (primary shape), plain string, and unknown gracefully.

### Schema verified
All queried columns confirmed present on branch DB before merge. `wellbeing_incidents` type mismatch caught via schema check — would have been invisible to TypeScript since the column is typed as `Json` which is broadly compatible.

### Changes we made
| File | Change |
|---|---|
| `src/hooks/governance/useMeetingTrainerReportsByPeriod.ts` | Fixed `wellbeing_incidents` JSONB handling |
| `supabase/config.toml` | Added `[functions.governance-section-ai-summary]` with `verify_jwt = true` |

### Post-merge deployment
`governance-section-ai-summary` deployed to production (`gdwhlstfguxarnxasrrs`) via Lovable. Confirmed live via `list_edge_functions` ✅. No prior invocations in logs (expected — first deploy).

### Conflicts with fix/local-run
No file-level conflicts. Two files flagged as likely Phase 5 candidates: `LiveMeetingTab.tsx` (heavily modified) and `supabase/config.toml` (both branches likely modified). Tracked in `phase5-conflict-tracker.md`.

---

## PR #34 — Exclude archived/inactive records from governance agenda and attendee dropdown
**Branch:** `cursor/governance-agenda-status-filters-ac7f`
**Status:** MERGED AND DELETED
**Merged:** 16 June 2026
**Merge commit:** `c85e42e37b`

### What the PR did
Added status filters to governance meeting agenda views and the Live Meeting attendee dropdown to hide archived, closed, or inactive records across six register tables (CI, risk, CAA, WHS, and others) and trainer/member queries.

### Issues found in review
1. **`ci_register` live-pull filter missing `closed`** — `LiveMeetingTab.tsx` only excluded `archived` while the constants file and agenda hook excluded both `closed` and `archived`. Closed CI items were appearing in the live session panel but not the agenda view.
2. **Live-pull queries not using constants** — Four register queries inlined their own filter strings instead of consuming `AGENDA_REGISTER_STATUS_FILTERS`. Maintenance drift risk, not a blocker.
3. **`@ts-nocheck` in `useGovernanceAgenda.ts`** — Pre-existing, not introduced by this PR.

### Changes we made
| File | Change |
|---|---|
| `src/components/governance/tabs/LiveMeetingTab.tsx` | Changed `ci_register` filter from `'("archived")'` to `'("closed","archived")'` |

### Commit
`2346a7574` — `fix(governance): include closed status in ci_register live meeting filter`

### Conflicts with fix/local-run
17 files conflict — all unrelated divergence, none overlap the PR's own 4 files. Full list in `phase5-conflict-tracker.md`. Notable: 4 add/add conflicts on Edge Functions (`tga-parsers.ts`, `derive-unit-content`, `derive-unit-tga-data`, `generate-dap-docx`) — higher complexity for Carl in Phase 5.

---

## PR #32 — fix: add RTO Division/Section to bulk edit panel and make it optional
**Branch:** `cursor/bulk-edit-rto-division-6e6d`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Bulk document upload Step 3 was blocking finalisation with "RTO Division/Section is required" but the Bulk Edit Panel had no field to satisfy it. Fix adds an RTO Division/Section dropdown to the Bulk Edit Panel using `getAllDivisionCodes()` from the existing constants file, and removes the required validation — correct since `documents_register.rto_division_section` is nullable text. Angela authored this PR.

### Issues found in review
1. **Codes-only display** — dropdown shows bare codes (e.g. `Q1.D1`) rather than labels (e.g. `Q1.D1-Training`). Labels are available via `findDivisionByCode()`. Angela's deliberate choice, not blocking.
2. **No clear option** — once a bulk division is set in the panel, there's no way to reset it to blank in the same session. Not blocking.

### Changes we made
No changes — PR was clean and approved as-is.

### Conflicts with fix/local-run
Single frontend file (`BulkDocumentUploadStep3.tsx`), no migrations — no conflicts expected.

---

## PR #25 — Fix trainer product approval authorization
**Branch:** `cursor/critical-bug-investigation-b5c7`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Edge function `approve-trainer-product-request` had no server-side role check — any authenticated user could approve trainer product requests. Fix adds a proper Administrator/CM/super_admin gate by fetching the caller's `profiles.role` and `tenant_members` membership before allowing approval. Also switches trainer assignment writes from raw user IDs to resolved `tp_trainers` profile IDs (TAS-compatible shape), and wraps `/dashboard/executive` with the existing `RoleRouteGuard`. Includes a new `auth.ts` helper module with Deno unit tests.

### Issues found in review
1. **Vercel CI failure** — pre-existing Windows case-sensitivity artifact on the 2026-06-12 base commit (`src/pages/index.ts` self-references on case-insensitive filesystems). Not caused by this PR. tsc clean, dry-run merge into main confirmed clean. Vercel on Linux unaffected.
2. **Auth failure returns HTTP 200** — consistent with existing codebase patterns.
3. **Double `status` check** — DB query filters active membership, auth.ts also checks — dead code in production but correct for unit tests.

### Changes we made
No changes — PR was clean and approved as-is.

### Conflicts with main
Clean — `AppRoutes.tsx` auto-merged with no conflicts on merge into main. ✅

### Conflicts with fix/local-run
`src/AppRoutes.tsx` and `src/config/roleNavigation.ts` both conflict — layered on top of pre-existing PR #34 divergence. All other 15 conflicts in the current dry-run were already tracked under PR #34. Full details in `phase5-conflict-tracker.md`.

---

## PR #37 — feat(assessment-tools): multi-select training products and TAS-scoped units
**Branch:** `cursor/multi-training-products-assessment-tools-4f90`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Upgraded the Assessment Tools register to support multiple training products per tool. Replaced the free-text "Qualification Code" input with a searchable multi-select picker loaded from `tenant_rto_scope` (status = current, not superseded, qualification or skillset). On save, linked products are written to the `assessment_tool_training_products` junction table and mirrored to `qualification_codes` / `qualification_code` for backwards compatibility. The unit picker is now scoped to active TAS builds for the selected products (via `q1_tas_builder` + `q1_tas_units`) rather than fetching from training.gov.au via Edge Function. A "Training Products" column was added to the list view showing linked product codes as badges with overflow handling.

### Issues found
- None blocking. One LOW: `syncToolTrainingProducts` does a non-atomic delete-then-insert on the junction table. If the insert fails, rows are lost. Common pattern in this codebase but worth hardening.

### Changes we made
No changes — PR was clean and approved as-is.

### Conflicts with main
Clean — dry-run merge into main had no conflicts. ✅

### Conflicts with fix/local-run
Zero new conflicts. All 17 conflicts in the dry-run were pre-existing (tracked under PR #34 and earlier). PR #37's own 3 files have no overlap with `fix/local-run`.

---

## PR #38 — feat(calendar): Restore non-governance meeting scheduling and minutes
**Branch:** `cursor/calendar-non-governance-meetings-fdb1`
**Status:** MERGED AND DELETED
**Merged:** 17 June 2026

### What the PR did
Added non-governance meeting scheduling to the ComplyHub calendar. Users can now create meetings of 6 types (Assessment Validation, Strategic Planning, Internal Audit, Industry Consultation, WHS Committee, Other) or free-text custom types. Meetings display in Cyan on the calendar with a new Meetings filter tab. A Meeting Detail side panel supports PDF/DOCX/TXT minutes upload (stored in `meeting-documents` bucket at `{tenant_id}/meetings/{event_id}/`) and free-text notes, both persisted via the `meeting_minutes` table. Edit and soft-delete (status = 'cancelled') also included. New files: `AddMeetingModal.tsx`, `MeetingDetailPanel.tsx`, `useCalendarMeetings.ts`, `calendarMeetingTypes.ts`.

### Issues found in review
- [MEDIUM] `event_date` column was `date` type — time input would be silently discarded. Required a schema migration before merge.
- [MEDIUM] `CalendarIntegration.tsx:297` — trainer portal calendar date display would break post-migration (invalid date from appending `T00:00:00` to a full timestamptz string).
- [LOW] `upsertMeetingAttendees` non-atomic read-then-write. Negligible risk in practice.

### Changes we made
| File | Change |
|---|---|
| `src/components/trainer-portal/CalendarIntegration.tsx` | Added `import { parseEventDate }` from calendarDateUtils; replaced `new Date(ev.event_date + 'T00:00:00')` with `parseEventDate(ev.event_date)` on line 297 |

### Schema migration run on production
```sql
ALTER TABLE calendar_events
ALTER COLUMN event_date TYPE timestamptz
USING event_date::timestamptz;
```
Verified: column now `timestamp with time zone`, all 343 existing rows migrated cleanly to midnight UTC. ✅

### Conflicts with main
Clean — dry-run merge into main had no conflicts. ✅

### Conflicts with fix/local-run
Zero new conflicts. None of PR #38's 6 changed files appear in the 24-file conflict-risk set. Zero Phase 5 impact.

---

## PR #22 — Fix consultant access for tenant hub RPCs
**Branch:** `cursor/critical-bug-investigation-f04e`
**Status:** MERGED AND DELETED
**Merged:** 18 June 2026

### What the PR did
Fixed an auth mismatch between the UI (which grants Consultant portal access via active `tenant_members.role = 'Consultant'`) and 9 `sa_*` tenant-hub RPCs (which were checking `profiles.role = 'Consultant'` instead). Valid portal consultants were hitting access-denied errors when loading Subscribers/Trials tenant hub data.

Fix: added a new `public.is_active_consultant()` SECURITY DEFINER helper that checks active tenant membership, then recreated all 9 affected RPCs (`sa_list_tenants_v3`, `sa_tenant_lifecycle_stats`, `sa_get_subscriber_tier_stats`, `sa_get_tenant_engagement_summary`, `sa_get_renewal_summary`, `sa_get_at_risk_tenants`, `sa_tenants_hub_analytics`, `sa_get_platform_config`, `sa_data_health_check`) with `public.is_super_admin() OR public.is_active_consultant()` gates. Includes a vitest regression test that asserts the migration does not use the broken profile-role predicate.

### Issues found in review
- [LOW] `sa_tenant_lifecycle_stats` uses JWT-based super_admin check (`auth.jwt() -> 'app_metadata' ->> 'is_super_admin'`) rather than `public.is_super_admin()` like the other 8 functions. Functionally equivalent — not a bug, just preserves the original implementation style for that function.

### Changes we made
None — PR was clean and approved as-is.

### Conflicts with main
Dry-run clean — 2 new files only, no conflicts.

### Conflicts with fix/local-run
Zero new conflicts. Zero deepened conflicts. All 17 pre-existing hard conflicts already tracked. Neither PR file appears in the 24-file conflict-risk set. Zero Phase 5 impact.

---

## PR #43 — Fix QI register IDs and invite role ceilings
**Branch:** `cursor/critical-bug-investigation-00a6`
**Status:** MERGED AND DELETED
**Merged:** 19 June 2026 — KhianBrian

### What the PR did
Three security/correctness fixes delivered in a single migration (`20260618110500_fix_qi_ids_rollup_and_invite_role_ceiling.sql`):

1. **QI register custom_id ownership**: The previous `start_qi_year` (both overloads) hand-allocated custom IDs directly in the INSERT statement, side-stepping the `trg_qi_annual_register_set_custom_id` BEFORE INSERT trigger. The PR removes the explicit `custom_id` from all INSERTs and lets the trigger call `generate_tenant_custom_id()` instead. A sequence pre-seed step advances each tenant's sequence past the current max before handing over to the trigger.

2. **`recompute_qi_register_rollup` lockdown**: Revoked direct `authenticated` execution (previously any tenant user could call it with arbitrary `register_id`, bypassing tenant scope). Now restricted to `service_role` only.

3. **Invite role ceiling**: Both `invite_user` and `rpc_invites_create` now validate that the target role is within `('Administrator', 'Compliance Manager', 'Trainer')` and that Consultants/Consultant Assistants cannot invite Administrators or Compliance Managers.

Also adds a static migration regression test (`tests/supabase/qi-annual-and-invite-security.test.ts`) that parses the migration file to verify the safeguards are present.

### Issues found in review
- [CRITICAL — FIXED] Migration called `SELECT public.seed_tenant_custom_id_sequence('qi_register', 'QI')` but this function does not exist in production (confirmed via `pg_proc`). Migration would abort at line 4, leaving all three fixes un-applied. Supabase Preview CI failure was caused by this. Fixed: replaced with inline DO block that iterates all tenants with QI records and advances their `custom_id_seq_<tenant>_QI` sequence past the current max using `setval`. Commit `6ea0188cd`.

### Changes we made
| File | Change |
|---|---|
| `supabase/migrations/20260618110500_fix_qi_ids_rollup_and_invite_role_ceiling.sql` | Replaced `SELECT public.seed_tenant_custom_id_sequence(...)` (line 7) with self-contained DO block — no dependency on missing function |

### Conflicts with main
Dry-run clean — 2 new files only, no conflicts.

### Conflicts with fix/local-run
Zero new conflicts. Zero deepened conflicts. Both PR files are new additions not in the 24-file conflict-risk set. Zero Phase 5 impact.

---

## PR #20 — Fix assessment tool lifecycle regressions
**Branch:** `cursor/critical-bug-investigation-ff3a`
**Merged:** 19 June 2026
**Merged by:** KhianBrian

### What the PR did
Fixed three assessment tool lifecycle bugs that had been silently corrupting data:

1. **Lifecycle state corruption on metadata edits** — the form save was writing `status: 'draft'` or `status: 'under_review'` on every save, even for approved/published/superseded tools. The new `buildAssessmentToolSaveData()` function preserves locked lifecycle states (approved, published, superseded) and only sets status for draft/under_review tools.

2. **Stale detail view after mutations** — the detail panel held a local snapshot that didn't update when approve/publish mutations completed. The new `resolveLiveDetailTool()` resolves the displayed tool from the live React Query cache so the approve → publish flow works without navigating away.

3. **Phantom `tenant_id` filter on validation review** — `assessment_validation_tool_review` has no `tenant_id` column. The `.eq('tenant_id', tenantId)` filter was silently returning empty results, causing all Principles/Rules review data to disappear. Removed. Tenant isolation is correctly enforced by RLS via JOIN to `assessment_validation.tenant_id`.

Also adds "Sync repository" retry button for published tools (previously showed "Publish" on already-published tools, which re-triggered the publish flow rather than retrying a failed sync).

### Issues found in review
- [MEDIUM — resolved] `AssessmentToolDetail.tsx` conflict with main: PR #21 had added `normalizeToolStatus` and `toolStatus` variable; PR #20 removes both. Auto-merge left dangling `toolStatus` references on button conditions — would have been a runtime undefined reference. Fixed: removed `normalizeToolStatus` from import, replaced all `toolStatus` refs with `tool.status` directly and `canPublishOrSync`.
- [LOW — resolved] `index.tsx` conflict with main: import line and `handleSave` both conflicted. Kept `normalizeToolStatus` in import (still needed for KPI/filter usages added by PR #21); added PR #20's new imports; replaced `handleSave` with `buildAssessmentToolSaveData` (supersedes PR #21's guard).

### Changes we made
| File | Change |
|---|---|
| `AssessmentToolDetail.tsx` | Resolved conflict — removed `normalizeToolStatus`, replaced `toolStatus` refs with `tool.status` and `canPublishOrSync` |
| `index.tsx` | Resolved conflict — kept `normalizeToolStatus` for KPI/filter, added new imports, replaced `handleSave` |

Merge commit: `3240501d1` (main merge into PR branch for conflict resolution)

### Conflicts with main
Two files conflicted: `AssessmentToolDetail.tsx` and `index.tsx`. Both resolved — see issues above.

### Conflicts with fix/local-run
Zero new conflicts. Zero deepened conflicts. None of PR #20's 5 files appear in the 24-file conflict-risk set. Zero Phase 5 impact.
