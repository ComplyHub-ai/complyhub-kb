# Phase 1 — PR Review Verdicts (Partial)
**Date:** 16 June 2026
**Status:** In progress — reviewing one by one.
**Note:** CLAUDE.md was not found in rto-compass-hub/ — review agents used guardrails.md and conventions.md only.

---

### PR #33 — Fix calendar tenant scoping for super_admin cross-tenant data leak
**Branch:** `cursor/calendar-tenant-filter-ac7f`
**Verdict:** MERGED AND DELETED
**Merged:** 16 June 2026
**Severity:** MEDIUM (security — resolved)

**Summary:** All five calendar hooks (`useCalendarEvents`, `useCalendarSnapshot`, `useCalendarTasks`, `useComplianceActionEvents`, `useGovernanceMeetings`) were sourcing tenant ID from `profile.tenant_id` instead of `activeTenantId` from context. For super admins, this meant calendar data was not scoped to the currently selected tenant. Fix switches all hooks to read from `useAppContext()` with null guards and correct query cache keying on `activeTenantId`.

**Issues found:**
- [MEDIUM — security] All 5 hooks unscoped for super_admin — fixed by this PR
- [LOW] `useCalendarEvents.ts:111,153` — pre-existing `.single()` calls on create/update mutations (not introduced by this PR, not fixed — cleanup deferred)
- [LOW] `useGovernanceMeetings.ts:32` — `tenantId` param accepted but unused after context switch. Renamed to `_tenantId` in our local commit but not pushed before branch was deleted. Deferred cleanup.

**Conflicts with fix/local-run:** Yes — `useGovernanceMeetings.ts` has diverged. Will need manual resolution when `fix/local-run` is synced to main.

**Merge order note:** Standalone — no dependency on other PRs.

**Note on our commit:** Local fixes for `.single()` → `.maybeSingle()` and `_tenantId` rename were committed but not pushed before branch was deleted. Security fix is fully on main; cleanup items are deferred.

---

### PR #31 — Fix broken billing subscription route targets
**Branch:** `cursor/critical-bug-investigation-0409`
**Verdict:** MERGED AND DELETED
**Merged:** 16 June 2026
**Severity:** MEDIUM (resolved)

**Summary:** Fixes broken billing/upgrade CTAs that still pointed at unregistered legacy routes after canonical billing pages moved, and adds compatibility redirects for those legacy paths.

**Issues found:**
- [MEDIUM] `src/AppRoutes.tsx` — `LegacyTenantSettingsRedirect` has an inverted default. `/settings/tenant` with no query string defaults to subscription settings, not organisation settings. Users following old deep-linked bookmarks with non-subscription tabs (e.g. `?tab=general`) land on the wrong settings page with no feedback.
- [MEDIUM] `src/components/SubscriptionManagement.tsx:50` — Uses `window.location.href` (hard navigation) instead of React Router `navigate()`. Busts SPA state, triggers full page reload, loses React Query cache.
- [MEDIUM] `tests/routes/billing-legacy-redirects.test.tsx:100-105` — Test encodes the inverted-default behaviour rather than documenting intent. If the default is corrected, this test breaks.
- [LOW] `src/AppRoutes.tsx` — Redirect helpers defined as named components inside the route config file instead of inline `<Navigate>` or a dedicated `redirects.tsx`. No functional impact, adds noise to a ~1250 line file.
- [LOW] `src/components/auth/RoleGuard.tsx` — New route entries added to `ROUTE_PERMISSIONS` but the `canAccess()` default-allow fallback means the security model is unclear for non-admin roles.
- [LOW] `src/pages/Auth.tsx` — `console.debug('[trace]')` ships to production (pre-existing, not introduced here, but PR modifies the line).

**Conflicts with fix/local-run:** Yes — `fix/local-run` still has old `/pricing` routes in `src/pages/Signup.tsx` (lines 54–55, 127) and `src/pages/Auth.tsx` (lines 95–96). Straightforward to resolve but must not be skipped after merge.

**Merge order note:** Standalone — no upstream PR dependency. After merging, `fix/local-run` must update `Signup.tsx` and `Auth.tsx` to the canonical `/billing/subscribe` route.

**Recommendation:** Clarify and document the intended default for `LegacyTenantSettingsRedirect` when no `tab` param is present. Add a test for non-subscription tab. Swap `window.location.href` for `navigate()`. Core routing fix is correct and Vercel check is green. If Angela confirms subscription-as-default is intended, the two MEDIUMs can be waived and this PR is approvable.

---

### PR #30 — Fix consultant portfolio approval role safety
**Branch:** `cursor/critical-bug-investigation-b5a0`
**Verdict:** MERGED AND DELETED
**Merged:** 16 June 2026
**Severity:** HIGH (resolved)

**Summary:** Replaces `admin_add_membership` with a safe upsert that preserves active privileged roles on portfolio approval; fixes `get_my_portfolio_requests` to join on canonical `tenant_id`; forces `sa_list_tenants_v3` visibility filtering for consultant callers.

**Issues found:**
- [HIGH] `20260613110108_fix_portfolio_request_membership.sql` — Supabase Preview CI check is FAILING. A broken migration merging to main will cause a deploy-time failure on the production database. Blocking.
- [HIGH] Migration timestamp `20260613110108` predates two already-merged migrations on main dated 14 June (`20260614210903`, `20260614230313`). Applied in strict timestamp order, this migration inserts before them — if either 14 June migration redefines the same three functions, this fix is silently superseded on fresh databases. PR author must verify and re-timestamp to `20260616xxxxxx` if needed.
- [MEDIUM] `sql:63–79` — `'Consultant'` included in the "privileged role" CASE block alongside Administrator-tier roles. Not a bug but misleading — a revoked consultant gets re-activated to `'Consultant'` either way. Needs a SQL comment explaining the intent.
- [MEDIUM] `tests/portfolio-migrations.test.ts` — Test is a static string-match against the `.sql` file, not a database integration test. Passes even if SQL is syntactically invalid. Provides false confidence — the failing Supabase CI check is the only real execution gate.
- [LOW] `sa_list_tenants_v3` — Visibility fix restricts non-super-admins to active tenants but still returns ALL active tenants, not just ones the consultant is a member of. Consultant can enumerate every active RTO on the platform. Needs Angela/product to confirm whether this is intentional.

**Conflicts with fix/local-run:** No — migration file does not overlap any file on `fix/local-run`.

**Merge order note:** No dependency on other open PRs. Must verify the two 14 June migrations on main don't redefine the same three functions before merging.

**Recommendation:** Do not merge. Two blockers: (1) Supabase Preview CI is failing — investigate on preview project before merging any migration; (2) migration timestamp is older than two already-merged migrations, creating sequencing risk. Re-timestamp to `20260616xxxxxx` and get CI green first.

---

### PR #29 — feat(tas): consultation links, regulatory overlays, qi-register autolog, trainer archive cols, custom_id seed helpers
**Branch:** `feat/tas-consultation-overlays`
**Author:** rjvivacity
**Verdict:** MERGED ✅
**Severity:** HIGH → resolved
**Reviewed:** 18 June 2026 — full Stage 1 review (diff, dry-runs, TSC, DB schema, callers, production edge function audit)
**Fixed:** 18 June 2026 — Brian resolved all blockers on branch `feat/tas-consultation-overlays`
**Merged:** 18 June 2026 — `9f5d7ba8a` on `main`. Branch deleted.
**Post-merge action (Brian):** Regenerate `src/integrations/supabase/types.ts` — `20260618000800` adds `has_new_consultation_evidence` to `rpc_tas_list_builds_v3` return type.

**Summary:** Large feature PR (1,826 additions, 0 deletions, 16 files — 5 frontend, 1 edge function, 10 migrations). Adds TAS ↔ Industry Consultation Register linking, AI-ranked suggestion panel, regulatory overlay detection panel, QI register auto-population from survey completions, trainer industry currency archive column parity, email outbox worker edge function, and custom-id sequence seeding. Code quality and RLS are clean. Blocked by migration timestamp ordering, an unversioned production edge function, and dead UI components that need a parent wiring PR before the feature is usable.

**Issues found:**
- [HIGH] ~~All 10 migration files timestamped 29 May – 6 June 2026 — behind main's 17 June ceiling.~~ **FIXED by Brian** — all 10 renamed to `20260618000100`–`20260618001000`. Committed to branch.
- [HIGH] ~~`detect-regulatory-overlays` edge function deployed to production but not in repo.~~ **FIXED by Brian** — source recovered from production (v1.2, version 5) and committed to `supabase/functions/detect-regulatory-overlays/index.ts`.
- [HIGH] ~~Companion migration `20260606002000` referenced by seed helper but absent.~~ **FIXED by Brian** — root cause identified: `qi_register` had no BEFORE INSERT trigger for `custom_id`, causing autolog trigger to crash. Written as `20260618000050_add_custom_id_trigger_to_qi_register.sql` (trigger + sequence pre-seed). Committed to branch.
- [MEDIUM] ~~New UI components (`LinkedConsultationRow`, `RegulatoryOverlaysPanel`, `SuggestedConsultationsPanel`) not wired into any page.~~ **FIXED by Brian** — all three panels + `useTasConsultationLinks` hook wired into the market tab of `src/pages/tas/builder-sandbox/index.tsx`. TSC clean.
- [MEDIUM] ~~Archive functions use `SET search_path = public, sec` — potential conflict with Carl's 16 June search_path sweep.~~ **RESOLVED (no action needed)** — Carl's sweep (`20260616064246`) was already applied before PR #29's migrations will run, and all function bodies use fully-qualified `sec.` and `public.` references. No conflict.
- [MEDIUM] `20260618000800` appends `has_new_consultation_evidence` to `rpc_tas_list_builds_v3`. `src/integrations/supabase/types.ts` needs regeneration after merge (post-merge action — cannot be done until migration applies to production).
- [LOW] CI — Vercel: FAIL — "Git author rjvivacity must have access to the project on Vercel." Permissions issue with PR author, not a code problem. Normal for RJ's PRs.
- [LOW] `useTasConsultationLinks.ts:687` — `dismissMutation` defaults `link_type` to `'stakeholder'` for dismissed rows. No functional impact (dismissed rows are filtered from all counts) but semantically odd data in the table.
- [LOW] `useRegulatoryOverlays.ts` — `isDetecting` included in `useCallback` dependency array for `detect`. Function reference changes on every detection state change. Not a blocker.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `q1_tas_builder.regulatory_overlays` — EXISTS (jsonb, nullable) ✅
- `q1_tas_builder`: `qual_code`, `training_product_id`, `tenant_id`, `readiness_*`, `tenant_scope_item_id` — all confirmed ✅
- `industry_consultation_records`: all 11 columns referenced by hooks — confirmed ✅. Note: `consultation_date` is NOT NULL; code's null-defensive handling is consistent.
- `tas_consultation_links`, `suggest_consultations_for_tas`, `trainer_industry_currency.archived_at`, `qi_register.survey_id` — all correctly absent (new, created by this PR's migrations) ✅
- `detect-regulatory-overlays` — **DEPLOYED to production** (confirmed via edge function list) but NOT in git repo. Unversioned.

**Build check:** PASS — TSC clean on PR branch.

**`as any` contracts verified:**
- `(supabase.rpc as any)('suggest_consultations_for_tas', { p_tas_id: tasId })` — parameter name/type matches migration ✅
- `(supabase as any).from('tas_consultation_links')` — columns match migration definition ✅
- `(supabase as any).from('q1_tas_builder').select('regulatory_overlays')` — column confirmed in production ✅
- `rpc_tas_list_builds_v3` caller (`useTasRegistry.ts:138`) — new column appended; existing consumer unaffected ✅

**config.toml:** `email-outbox-worker` registered at line 771 ✅.

**Foresight:**
- Callers: `rpc_tas_list_builds_v3` one caller, append-only change, safe. Archive RPCs whitelist extended correctly. No broken callers.
- Live data: Backfill migrations are idempotent (`ON CONFLICT DO NOTHING`). Companion migration dependency `20260606002000` must be confirmed live.
- Drift: PR touches no files in the 24-file conflict set. Zero Phase 5 impact.
- RLS/roles: `tas_consultation_links` RLS mirrors `q1_tas_builder` pattern exactly (billing_gate PERMISSIVE + tenant_isolate_* RESTRICTIVE + write_lock_* RESTRICTIVE). `suggest_consultations_for_tas` is SECURITY DEFINER with explicit tenant auth check in body. Correct.

**Dry-run PR → main:** CLEAN ✅

**Dry-run main → fix/local-run:**
- New conflicts from this PR: NONE
- Pre-existing hard conflicts (all in tracker): 11 files — `useUnitValidationProgress.ts`, `routeAfterLogin.ts`, `industryconsultation/index.tsx`, `pdr/index.tsx`, `_shared/tga-parsers.ts`, `dap-ai-draft/index.ts`, `derive-unit-content/index.ts`, `derive-unit-tga-data/index.ts`, `generate-dap-docx/index.ts`, `generate-session-plan/index.ts`, `tga-extract-packaging-rules/index.ts`
- Pre-existing soft conflicts (in tracker): `ConsultantSidebar.tsx`, `setActiveTenant.ts`, `fpp/index.tsx`, `config.toml`
- ⚠️ NEW soft conflicts NOT in tracker (from main moving since 17 June 2026 rebuild): `src/lib/permissions/rolePermissions.ts`, `src/pages/settings/UsersManagement.tsx`, `src/routes/guards/AdminRoute.tsx` — not from this PR; tracker now stale by 3 files.

**Notes for Phase 5:** Conflict tracker needs 3 new soft-conflict entries: `rolePermissions.ts`, `UsersManagement.tsx`, `AdminRoute.tsx`. PR #29 itself adds zero conflict risk.

**Fixes status — ALL DONE (Brian, 18 June 2026):**
1. ✅ Re-timestamped all 10 migrations to `20260618000100`–`20260618001000`
2. ✅ `detect-regulatory-overlays` source recovered and committed to repo
3. ✅ Missing trigger migration written as `20260618000050_add_custom_id_trigger_to_qi_register.sql`
4. ✅ `SuggestedConsultationsPanel`, `LinkedConsultationRow`, `RegulatoryOverlaysPanel` wired into TAS builder market tab

**Post-merge action (Brian):** Regenerate `src/integrations/supabase/types.ts` after `20260618000800` applies to production.

**Angela prerequisite (still open):** Confirm intent before approval. PR mixes: (a) consultation linking UI, (b) regulatory overlay detection, (c) QI register auto-logging, (d) trainer archive column parity, (e) custom-id sequence seeding.

---

### PR #23 — Fix destructive TAS and trainer delete regressions
**Branch:** `cursor/critical-bug-investigation-6f72`
**Verdict:** APPROVE
**Severity:** HIGH → resolved
**Status:** MERGED AND DELETED — 18 June 2026
**Reviewed:** 18 June 2026
**Fixed:** 18 June 2026 — all three issues resolved by Brian on branch `cursor/critical-bug-investigation-6f72`
**Merged:** 18 June 2026 — merged by KhianBrian at 06:28 UTC. Branch deleted.
**Fix commits:** `98de7f2db`, `bce846bfd` (merge resolution)

**Summary:** Addresses real production-severity data integrity bugs — cross-TAS consultation scalar ownership overwrite, shared-record hard delete, stale trainer delete dialog, trainer-scoped delete mutations, and PD register sync. Core logic is sound and tests are well written. Three issues found and fixed before merge.

**Issues found and status:**

- [HIGH — FIXED] `src/hooks/usePhaseValidation.ts:63-64` — `consultation_source` column doesn't exist in production; production table has `source`. PostgREST returns 400 on unknown column — broke TAS builder phase validation for all tenants. **Fixed:** changed `consultation_source` → `source` in both select strings and in the employer-count filter lines (92-93).
- [HIGH — FIXED] `src/components/trainer-matrix/TrainerProfileDrawer.tsx` — hard conflict with main's newer `handleConfirmDelete`. Main had added `compute_trainer_classification` RPC call and `canonical-trainer-compliance` cache invalidation after this branch was cut. **Fixed:** added `logger` import, added RPC call for currency/pd deletes (unit deletes already trigger recompute inside the hook), added `canonical-trainer-compliance` invalidation.
- [MEDIUM — FIXED] `supabase/migrations/20260610113000_fix_consultation_and_pd_delete_integrity.sql` — `fn_sync_trainer_pd_delete()` was created but no trigger attached it to any table — PD register sync on delete silently never fired. **Fixed:** appended `CREATE TRIGGER trg_sync_trainer_pd_delete AFTER DELETE ON public.trainer_industry_currency` to the migration.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `industry_consultation_records` — confirmed (`id`, `tenant_id`, `tas_id`, `consultation_method`, `source`) — `consultation_source` NOT present (fix confirmed correct) ✅
- `industry_consultation_records_tas_link` — confirmed (all columns) ✅
- `trainer_industry_currency` — confirmed (`id`, `tenant_id`, `trainer_id`) ✅
- `trainer_vocational_competency` — confirmed (`id`, `tenant_id`, `trainer_id`) ✅
- `compute_trainer_classification(p_tenant_id uuid, p_trainer_id uuid)` — confirmed ✅

**Build check:** TSC PASS (both before and after fixes). Vercel was failing due to TrainerProfileDrawer conflict — resolved by fix.
**CI:** Vercel was FAIL (conflict) → fixed. Supabase Preview FAIL — systemic hyphen-migration-filename issue, pre-existing, not caused by this PR.

**Foresight:**
- Callers/contract: `useDeleteTrainerPD` and `useDeleteTrainerCurrency` still in place and used by trainer portal pages — unaffected. New exports `planConsultationPullOperations` / `hasExternalTasLinks` have no existing callers broken.
- Live data: `consultation_source` confirmed absent from production — fix verified against live schema.
- Drift: PR's 7 files have zero overlap with the 24-file conflict set. Zero Phase 5 impact.
- RLS/roles: New `icr_tas_link_insert_own_tenant` policy gates on `sec.current_tenant_id()` and cross-validates tenant on both consultation record and TAS build. Correct.

**Dry-run PR → main:** CONFLICT in `TrainerProfileDrawer.tsx` (resolved by fix commit `98de7f2db`)
**Dry-run main → fix/local-run:**
- New conflicts: NONE
- Deepened conflicts: NONE
- Pre-existing (no change): 8 files, all tracked (edge functions)

**Notes for Carl (Phase 5):** Zero Phase 5 impact — none of PR #23's 7 files appear in the 24-file conflict set.

**Changes made on branch (fix commit `98de7f2db`):**
| File | Change |
|---|---|
| `src/hooks/usePhaseValidation.ts` | `consultation_source` → `source` in both select strings and both filter lines |
| `src/components/trainer-matrix/TrainerProfileDrawer.tsx` | Added `logger` import; added `compute_trainer_classification` RPC call for currency/pd deletes; added `canonical-trainer-compliance` cache invalidation |
| `supabase/migrations/20260610113000_...sql` | Appended `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER trg_sync_trainer_pd_delete AFTER DELETE ON trainer_industry_currency` |

---

### PR #34 — Exclude archived/inactive records from governance agenda and attendee dropdown
**Branch:** `cursor/governance-agenda-status-filters-ac7f`
**Verdict:** MERGED AND DELETED
**Merged:** 16 June 2026
**Severity:** MEDIUM (resolved)

**Summary:** Adds status filters to hide archived/closed/inactive records across six register tables in governance meeting agenda views and the Live Meeting attendee dropdown.

**Issues found:**
- [MEDIUM] `src/components/governance/tabs/LiveMeetingTab.tsx` — `ci_register` live-pull filter uses `.not('status', 'in', '("archived")')` — missing `closed`. The constants file and `useGovernanceAgenda.ts` both exclude `closed` and `archived`. Closed CI items will appear in the live session panel but not the agenda view. Fix: change to `'("closed","archived")'`.
- [LOW] `src/components/governance/tabs/LiveMeetingTab.tsx` — Four live-pull queries (ci, risk, caa, whs) inline their own filter strings instead of using the `AGENDA_REGISTER_STATUS_FILTERS` constants introduced in this same PR. Maintenance drift risk.
- [LOW] `src/hooks/useGovernanceAgenda.ts` — `@ts-nocheck` at top of file suppresses TypeScript for all new logic. Pre-existing, not introduced by this PR.

**Conflicts with fix/local-run:** Yes — 13 files conflict (AppRoutes.tsx, useGovernanceMeetings.ts, routeAfterLogin.ts, ×10 Edge Functions). All unrelated divergence — PR's own 4 files have no overlap. Carl handles the merge into main.

**Merge order note:** Standalone — no dependency on other open PRs.

**Recommendation:** One-line fix required in `LiveMeetingTab.tsx` — change `ci_register` filter from `'("archived")'` to `'("closed","archived")'`. Either fix on the branch or ask Cursor to patch it. Once confirmed, PR is safe to approve. Brian merges to main.

---

### PR #35 — Enable editing of past and completed meetings
**Branch:** `cursor/past-meeting-editing-8c64`
**Verdict:** APPROVE
**Severity:** LOW (clean)

**Summary:** Frontend-only fix that removes the read-only lock on past and completed meetings. Expands the Live Meeting selector from future-only to 12 months of history, adds an informational `PastMeetingBanner`, wires a silent backdated audit trail through `markMeetingBackdatedIfNeeded()`, and adds an "Edit Meeting" button on History cards to navigate directly to the Live tab for full editing.

**Issues found:**
- [LOW] `src/lib/governance/meetingManagerUtils.ts:markMeetingBackdatedIfNeeded` — Supabase update call swallows errors silently (no `console.error`). For a compliance audit trail, silent failure means `is_backdated` never sets with no indication anything went wrong. Not blocking but worth a note.
- [LOW] `src/components/governance/tabs/HistoryTab.tsx:~204` — `meetingRecord?.meeting_date ?? meetingRecord?.starts_at` fallback is odd since `meeting_date` is `NOT NULL` on the schema. `starts_at` is a timestamp, not a date — `isMeetingDatePast()` handles it correctly, but the fallback is unnecessary.
- [LOW] `src/components/governance/tabs/LiveMeetingTab.tsx:fetchMeetings` — Selector now loads up to 50 meetings (was 10, future-only). No pagination. Fine now, worth monitoring as meeting volume grows.

**Schema check:** `is_backdated` (boolean, nullable) and `backdated_by` (uuid, nullable) confirmed present in `governance_meetings` on branch DB. ✓

**Dry-run merge result:** Clean — `AttendancePanel.tsx` and `LiveMeetingTab.tsx` auto-merged with current main. No conflicts. ✓

**Conflicts with fix/local-run:** `LiveMeetingTab.tsx` and `UnifiedGovernanceMeetingManager.tsx` will likely conflict in Phase 5 — already tracked as high-complexity files in `phase5-conflict-tracker.md`.

**Merge order note:** Standalone — no dependency on other open PRs.

**Recommendation:** Approve and merge. Clean frontend-only PR, no migrations, no RLS changes. Tenant scoping in `markMeetingBackdatedIfNeeded` is correct (`.eq('tenant_id', tenantId)` applied). Three LOW findings, none blocking. Carl to merge to main.

---

---

### PR #36 — feat(governance): Read-only trainer and SSO report summaries in Live Meeting
**Branch:** `cursor/agenda-report-summaries-8c64`
**Verdict:** MERGED AND DELETED
**Merged:** 17 June 2026
**Severity:** HIGH (resolved)

**Summary:** Replaces free-text Discussion Notes for Monthly Trainers and SSO Report agenda sections in Live Meeting with read-only structured summaries pulled from submitted reports, plus an optional AI-generated narrative via a new `governance-section-ai-summary` edge function.

**Issues found:**
- [HIGH] `supabase/config.toml` — `governance-section-ai-summary` not registered. Added `[functions.governance-section-ai-summary]` with `verify_jwt = true` (matches pattern of all other governance/AI functions; `false` is only for cron jobs). Fixed on branch before merge.
- [MEDIUM] `useMeetingTrainerReportsByPeriod.ts` — `wellbeing_incidents` is `jsonb` in the DB, not `text`. Code checked `typeof === 'string'`, which always evaluated to `undefined`. Wellbeing incident detail text would never render in the governance panel. Fixed on branch before merge.
- [LOW] Edge function has no caller-tenant auth guard — consistent with other AI edge functions in this codebase; real protection is at RLS level.

**Schema verified:** All queried columns confirmed on branch DB (`agcdvmrwzzgnlmfyrxtb`):
- `trainer_monthly_reports` — all columns exist ✅ (`wellbeing_incidents` is `jsonb` — type mismatch caught and fixed)
- `sso_monthly_packs` — all columns exist ✅
- `governance_meeting_minutes` — `section_notes` (`jsonb`), `tenant_id`, `meeting_id` all exist ✅

**Build check:** PASS — `tsc --noEmit` clean.

**Conflicts with fix/local-run:** No file-level conflicts. `LiveMeetingTab.tsx` and `supabase/config.toml` flagged as likely conflict candidates in Phase 5 — tracked in `phase5-conflict-tracker.md`.

**Merge order note:** Standalone — no dependency on other open PRs.

**Changes we made on branch:**
| File | Change |
|---|---|
| `src/hooks/governance/useMeetingTrainerReportsByPeriod.ts` | Fixed `wellbeing_incidents` to handle JSONB array, string, and unknown shapes |
| `supabase/config.toml` | Added `[functions.governance-section-ai-summary]` with `verify_jwt = true` |

**Commit:** `34bfa4340`

**Post-merge:** `governance-section-ai-summary` deployed to production (`gdwhlstfguxarnxasrrs`) — confirmed via `list_edge_functions`. ✅

---

### PR #41 — Fix user security summary tenant scope
**Branch:** `cursor/critical-bug-investigation-25dd`
**Verdict:** APPROVE
**Severity:** HIGH (security — resolved)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** `get_user_security_summary()` was missing a role filter in the admin branch WHERE clause. An Administrator or Compliance Manager who was any kind of member of a second tenant could see all users' security summaries for that tenant — a cross-tenant data leak. Fix adds `AND om.role IN ('Administrator', 'Compliance Manager')` to the tenant scope subquery and adds an explicit `is_super_admin()` OR clause so super admins retain full visibility.

**Issues found:**
- [MEDIUM] Consultant silently removed from admin gate. Current production includes `'Consultant'` in the role check — PR removes it. After merge, Consultants will only see their own security summary (not their tenants'). Almost certainly correct, but undocumented. Angela to confirm before Brian merges.
- [HIGH] Supabase Preview CI failing — systemic hyphen-migration-filename issue (pre-existing, not introduced by this PR). Carl to fix project-wide.
- [LOW] `user_sessions` and `failed_login_attempts` not visible via `information_schema.tables` on either DB — tables are present in current live production function definition so they must exist. Not blocking.
- [LOW] `profiles.tenant_id` nullable — users with null tenant_id excluded from admin queries. Pre-existing behaviour.

**Schema verified (branch DB `agcdvmrwzzgnlmfyrxtb`):**
- `profiles.tenant_id` (uuid, nullable) ✅
- `profiles.email`, `profiles.id`, `profiles.created_at` ✅
- `organization_members.organisation_id` ✅ — matches `organization_id` 1:1
- `organization_members.role` ✅
- `user_sessions` / `failed_login_attempts` — not confirmed via schema query, present in live production function ⚠️

**Migration timestamp:** `20260616113000` — after all known merged migrations. ✓

**Build check:** Vercel ✅ PASS. Supabase Preview ❌ FAIL — systemic issue, not this PR.

**Conflicts with fix/local-run:** Migration-only PR — no conflicts expected.

**Merge order note:** Standalone. Angela to confirm Consultant access change before Brian merges.

---

### PR #32 — fix: add RTO Division/Section to bulk edit panel and make it optional
**Branch:** `cursor/bulk-edit-rto-division-6e6d`
**Verdict:** APPROVE
**Severity:** LOW (clean)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** Bulk document upload Step 3 blocked finalisation with "RTO Division/Section is required" but the Bulk Edit Panel had no field to set it. Fix adds the dropdown using `getAllDivisionCodes()` and removes the required validation — correct since `documents_register.rto_division_section` is nullable.

**Issues found:**
- [LOW] Dropdown shows codes only (e.g. `Q1.D1`), not labels. Labels available via `findDivisionByCode()`. Angela authored so choice is deliberate. Not blocking.
- [LOW] No clear/blank option in the Select. Not blocking.

**Schema verified (production):** `documents_register.rto_division_section` — text, nullable ✅. `getAllDivisionCodes()` confirmed on `main` at line 118 ✅.

**Build / CI:** Vercel ✅ PASS. Supabase Preview skipped (no migrations) ✅.

**Conflicts with fix/local-run:** Single frontend file, no migrations — no conflicts.

---

### PR #38 — feat(calendar): Restore non-governance meeting scheduling and minutes
**Branch:** `cursor/calendar-non-governance-meetings-fdb1`
**Verdict:** APPROVE (after fix)
**Severity:** MEDIUM (resolved)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** Adds non-governance meeting scheduling (6 types + free-text Other), Cyan calendar display, a Meetings filter tab, and PDF/notes minutes upload via `meeting_minutes`. Required a production schema migration and one frontend fix before merge.

**Issues found:**
- [MEDIUM — fixed via migration] `event_date` column was `date` type — time input silently discarded on save. Resolved by `ALTER TABLE calendar_events ALTER COLUMN event_date TYPE timestamptz USING event_date::timestamptz;` run on production before merge.
- [MEDIUM — fixed on branch] `src/components/trainer-portal/CalendarIntegration.tsx:297` — `ev.event_date + 'T00:00:00'` concatenation produces invalid date string once event_date returns as a full timestamptz. Fixed to `parseEventDate(ev.event_date)`.
- [LOW] `upsertMeetingAttendees` non-atomic read-then-write. Negligible risk in practice.

**Schema verified (production):** `calendar_events` all columns ✅. `meeting_minutes` all columns ✅. `meeting-documents` bucket exists with correct tenant-scoped policies ✅. No config.toml changes needed ✅.

**Build / CI:** TypeScript PASS ✅. Vercel ✅ PASS. Supabase Preview skipped ✅.

**Conflicts with fix/local-run:** Zero new conflicts. None of PR #38's files appear in the 24-file conflict-risk set. Zero Phase 5 impact.

---

### PR #24 — Fix trainer evidence deletion recompute
**Branch:** `cursor/critical-bug-investigation-3dff`
**Verdict:** APPROVE
**Severity:** LOW (resolved)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** The post-delete handler for trainer PD and currency evidence was calling `compute_trainer_classification` with only `p_trainer_id`, missing the required `p_tenant_id` param. Supabase returned an RPC error that was silently swallowed. The compliance badge query was also never invalidated, leaving the trainer's compliance status stale until an unrelated recompute. Fix passes both params, checks the error, and invalidates `canonical-trainer-compliance`.

**Issues found:**
- [LOW — fixed] `TrainerProfileDrawer.tsx:236` — `console.warn` introduced by this PR violates CLAUDE.md ban on raw console calls in `src/`. Fixed to `logger.warn` with structured args.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `compute_trainer_classification(p_tenant_id uuid, p_trainer_id uuid)` — confirmed ✅
- `canonical-trainer-compliance` query key — confirmed in `useCanonicalTrainerCompliance.ts` and `useTrainerMatrixEngine.ts` ✅
- `tenantId` prop in scope, guarded before RPC call ✅
- Removed `Upload`/`FolderUp` import — not referenced anywhere in file ✅

**Build check:** tsc ✅ PASS. Vercel ❌ pre-existing base issue (11 June, same as PR #25) — not a blocker. Supabase Preview: skipping ✅.

**Dry-run PR → main:** CLEAN — no conflicts.
**Dry-run main → fix/local-run:** 17 conflicts — all pre-existing. `TrainerProfileDrawer.tsx` has no overlap with `fix/local-run`. Zero new conflicts.

---

### PR #21 — Fix assessment tool legacy status handling
**Branch:** `cursor/critical-bug-investigation-fef7`
**Verdict:** APPROVE
**Severity:** MEDIUM (resolved)
**Status:** MERGED AND DELETED — 19 June 2026
**Reviewed:** 19 June 2026
**Fixed:** 19 June 2026 — conflict with main resolved on branch
**Merged:** 19 June 2026 — merged by KhianBrian. Branch deleted.

**Summary:** Adds `normalizeToolStatus()` to map the legacy `active` DB value to `published`, and fixes `handleSave` to preserve status when editing a non-draft tool (preventing accidental status demotion of approved/published tools on edit). TSC clean, no schema changes, no migrations. Hard conflict with main on `index.tsx` caused by PR #37 landing first.

**Issues found and status:**

- [MEDIUM — FIXED] `src/pages/registers/assessment-tools/index.tsx` — hard conflict with main. PR #37 had added `TrainingProductBadges`, `AssessmentToolSavePayload`, and `getToolTrainingProductCodes` to `index.tsx`; PR #21 cut from a pre-#37 base and replaced them. Fixed: merged `origin/main` into branch, kept `AssessmentToolSavePayload` type (correct — matches `AssessmentToolForm.onSave` contract), applied PR #21's `isSubmittingExistingDraft` logic to `handleSave` body. Committed and pushed 19 June 2026.

**Schema verified:** `assessment_tools.status` — text, nullable ✅. No new columns or RPCs.

**Build check:** TSC ✅ PASS (both on PR branch and after merge commit). Vercel — was FAIL (conflict); resolved after push.

**Foresight:**
- Callers: `normalizeToolStatus`, `getToolStatusBadge`, `TOOL_STATUS_OPTIONS` consumed only within the 3 PR files. No external callers broken.
- Live data: Zero `active` records in production (369 published, 65 under_review, 35 approved, 2 draft). Fix is defensive and correct; the dashboard breakage described in the PR body is not currently occurring.
- Drift: None of PR #21's 4 files appear in `both-sides-changed.txt`. Zero Phase 5 impact.
- RLS/roles: Display and filter logic only. No queries, RPCs, or RLS changes.

**Dry-run PR → main:** CONFLICT in `index.tsx` (resolved by merge commit `57d76687e`)
**Dry-run main → fix/local-run:**
- New conflicts: NONE (PR #21's files have no overlap with the 24-file conflict set)
- Pre-existing (no change): 19 files — all tracked (17 in formal table + `package-lock.json` and `email-outbox-worker` from PR #26 per note 8)

**Notes for Carl (Phase 5):** Zero Phase 5 impact.

---

### PR #43 — Fix QI register IDs and invite role ceilings
**Branch:** `cursor/critical-bug-investigation-00a6`
**Verdict:** MERGED AND DELETED
**Merged:** 19 June 2026 — KhianBrian
**Severity:** CRITICAL (resolved)

**Summary:** Three security/correctness fixes in one migration: QI register custom_id sequence ownership handed back to the BEFORE INSERT trigger, `recompute_qi_register_rollup` locked to service_role only, and invite role ceiling added to both `invite_user` and `rpc_invites_create` so Consultants/Consultant Assistants cannot mint Administrator or Compliance Manager memberships.

**Issues found and status:**
- [CRITICAL — FIXED] `supabase/migrations/20260618110500_…sql:4` — Migration called `SELECT public.seed_tenant_custom_id_sequence('qi_register', 'QI')` but this function does not exist in production (confirmed via `pg_proc` on `gdwhlstfguxarnxasrrs`). Migration would abort immediately, leaving all three fixes un-applied. Fixed: replaced with inline DO block that advances each tenant's `custom_id_seq_<tenant>_QI` sequence past the current max. Committed `6ea0188cd` and pushed.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `qi_register`, `trg_qi_annual_register_set_custom_id`, `start_qi_year` (both overloads) — confirmed ✅
- `recompute_qi_register_rollup` — confirmed ✅
- `invite_user`, `rpc_invites_create`, `user_invitations`, `audit_logs`, `tenant_members` — confirmed ✅
- `useInviteUser.ts` role type already constrained to `'Administrator' | 'Compliance Manager' | 'Trainer'` — matches new DB ceiling exactly ✅

**Build check:** No TypeScript changes (migration + test only). Vercel ✅ PASS. Supabase Preview ❌ FAIL before fix — caused by missing function call.

**Dry-run PR → main:** CLEAN
**Dry-run main → fix/local-run:**
- New conflicts: NONE (both PR files are new, not in the 24-file conflict set)
- Pre-existing (no change): 19 files — all tracked

**Notes for Carl (Phase 5):** Zero Phase 5 impact. Both files added by this PR are new — not in the both-sides intersection.

---

### PR #37 — feat(assessment-tools): multi-select training products and TAS-scoped units
**Branch:** `cursor/multi-training-products-assessment-tools-4f90`
**Verdict:** APPROVE
**Severity:** CLEAN
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** Replaces the single qualification code text input in AssessmentToolForm with a searchable multi-select training products picker (loaded from `tenant_rto_scope`). Replaces the TGA Edge Function unit fetch with a direct DB query via `q1_tas_builder` + `q1_tas_units`. Adds a `Training Products` column to the list view with badge display. Writes linked products to the `assessment_tool_training_products` junction table on save.

**Issues found:**
- None blocking.
- [LOW] `syncToolTrainingProducts` does a delete-then-insert (non-atomic). If the insert fails after delete, junction rows are lost. Common pattern in this codebase — flag for Carl if hardening is desired.
- [INFO] Units picker only surfaces units from active TAS builds. If a tenant has no TAS for a product, units show empty — intentional per the PR description.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `assessment_tool_training_products` — EXISTS, all columns confirmed: `id`, `tenant_id`, `tool_id`, `scope_code`, `scope_type`, `title`, `created_by` ✅
- `assessment_tools.qualification_codes` — ARRAY, nullable ✅
- `assessment_tools.qualification_code` — text, nullable (legacy compat) ✅
- `tenant_rto_scope.code/title/scope_type/status/is_superseded` — all confirmed ✅
- `q1_tas_builder.id/qual_code/status` — confirmed ✅
- `q1_tas_units.id/tas_id/unit_code/unit_title` — confirmed ✅
- RLS on `assessment_tool_training_products` — ENABLED, `billing_gate` + `write_lock_attp` + `restrict_sa_select_attp` ✅

**Build check:** tsc ✅ PASS (zero errors). Vercel ✅ PASS. Supabase Preview: skipping (no migrations) ✅.

**Dry-run PR → main:** CLEAN — no conflicts.

**Conflicts with fix/local-run:** Zero new conflicts. All 17 conflicts reported are pre-existing from PR #34 and earlier. PR #37's own 3 files (`useAssessmentToolRegister.ts`, `AssessmentToolForm.tsx`, `assessment-tools/index.tsx`) have no overlap with `fix/local-run`.

---

### PR #25 — Fix trainer product approval authorization
**Branch:** `cursor/critical-bug-investigation-b5c7`
**Verdict:** APPROVE
**Severity:** HIGH (security — resolved)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** Edge function `approve-trainer-product-request` had no server-side role check — any authenticated user could approve trainer product requests. Fix adds Administrator/CM/super_admin gate, resolves trainer `tp_trainers` profile ID before writing TAS unit assignments, and wraps `/dashboard/executive` with `RoleRouteGuard`.

**Issues found:**
- [HIGH] Vercel CI failing — pre-existing Windows case-sensitivity artifact on 2026-06-12 base commit, NOT caused by this PR. tsc clean, dry-run merge into main clean, not a real blocker.
- [MEDIUM] Auth failure returns HTTP 200 with `ok: false` — consistent with existing codebase pattern.
- [LOW] Double `status` check — DB query already filters active, auth.ts check is dead code in production but correct for unit tests.
- [LOW] `.or()` with UUID string interpolation — no injection risk.
- [LOW] Supabase Preview CI — systemic issue, not this PR.

**Schema verified (production):** `tenant_members` ✅, `tp_trainers` ✅, `q1_tas_builder` / `q1_tas_units` ✅. `approve-trainer-product-request` already deployed ACTIVE (v113) ✅. No config.toml entry needed.

**Build check:** tsc ✅ PASS. Vercel ❌ pre-existing base issue — not caused by this PR. Dry-run merge into main: clean ✅.

**Conflicts with fix/local-run:** `AppRoutes.tsx` auto-merged cleanly in dry-run — no manual resolution needed.

---

### PR #39 — Add retrospective bulk upload entry points for AI trainer onboarding
**Branch:** `cursor/bulk-upload-evidence-wizard-63d9`
**Verdict:** APPROVE
**Severity:** LOW (clean)
**Status:** MERGED AND DELETED — 17 June 2026

**Summary:** Adds three new entry points into the existing 7-step onboarding wizard: "Bulk Upload Evidence" button in the trainer profile drawer header, "Bulk Upload PD" button in the PD tab, and "Bulk Upload Evidence" in the matrix toolbar (alongside renamed "Onboard New Trainer"). Adds `OnboardingWizardMode` type and `pdOnly` flag which filters the wizard to PD records only. Adds `PreviousUploadSessions` component in the PD tab showing confirmed past upload sessions. No schema changes, no new Edge Functions.

**Issues found:**
- [LOW] `MissingFilePanel.tsx` now orphaned (import replaced by `PreviousUploadSessions`). Dead code, not a broken import.
- [LOW] 5 new packages added to `package.json` (`canvas-confetti`, `exceljs`, `jspdf`, `jszip`, `react-markdown`) — none imported in this PR's files. Likely from same Lovable session for upcoming work. No runtime impact.
- [LOW] `PreviousUploadSessions` shows 12 production sessions with `records_created` all-empty arrays as "0 records created". Accurate display, slightly odd for test data.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `tp_trainers.status` — text, NOT NULL ✅ (used by `activeOnly` filter)
- `trainer_onboarding_sessions`: `id`, `tenant_id`, `trainer_id`, `status`, `confirmed_at`, `records_created` (jsonb), `final_decisions` (jsonb) — all confirmed ✅
- Live `records_created` shape: `{ credentials: [], pd: [], currency: [], supervision: [] }` — matches component ✅

**Build / CI:** tsc ✅ PASS. Vercel ✅ PASS. Supabase Preview: skipping ✅.

**Dry-run PR → main:** CLEAN — no conflicts.
**Dry-run main → fix/local-run:** Zero new conflicts. All 15 conflicts pre-existing and already tracked. None of PR #39's 11 source files appear in the 24-file conflict-risk set.

---

---

### PR #26 — Rescue/pending work 20260613
**Branch:** `rescue/pending-work-20260613`
**Author:** angela-connell
**Verdict:** MERGED AND DELETED
**Severity:** CRITICAL → resolved
**Merged:** 18 June 2026
**Reviewed:** 18 June 2026

**Summary:** Large rescue branch by Angela (6,044 additions, 48 files, 18 migrations). Contains TAS AOT Quality Engine polymorphism, billing plan eligibility switch to `get_eligible_plans`, TAS consultation links UI, regulatory overlays panel, assessment tool naming + custom_id, email outbox worker pg_cron schedule, QI register autolog, and trainer industry currency archive columns. Has 5 add/add conflicts with PR #29's already-merged work, 18 out-of-order migration timestamps, a hard-coded production JWT in SQL, two unregistered edge functions, and CI failing on both checks.

**Issues found:**
- [CRITICAL] `supabase/migrations/20260529130000_schedule_email_outbox_worker.sql` — Hard-coded production anon JWT (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) embedded in a `SELECT cron.schedule(...)` SQL migration. This JWT is now permanently in git history, referencing the production project `gdwhlstfguxarnxasrrs`. The correct pattern is to store the anon key in `vault.secrets` or Supabase project settings and read it at runtime — not bake it into a migration.
- [CRITICAL] Migration timestamp ordering — all 18 migration files are dated 28 May – 9 June 2026. Main's current migration ceiling is `20260618021722` (18 June 2026, from today's pull). Applied in strict timestamp order, all 18 migrations insert **before** the 18 June migrations already on main. If any 18 June migration redefines a table or function this branch also touches, the branch migration is silently superseded. All 18 must be re-timestamped to `202606180210xx`+ before merging.
- [CRITICAL] Dry-run 1 (PR → main): 6 conflicts — because PR #29 (merged 18 June) already landed versions of these files on main. Cannot auto-merge: `src/components/settings/SubscriptionTab.tsx` (content conflict), `src/hooks/useRegulatoryOverlays.ts` (add/add), `src/hooks/useTasConsultationLinks.ts` (add/add), `src/pages/registers/assessment-tools/components/AssessmentToolNamingPanel.tsx` (add/add), `src/pages/registers/assessment-tools/components/statusBadges.tsx` (add/add), `supabase/functions/email-outbox-worker/index.ts` (add/add). These files exist on main from PR #29; both versions must be reconciled by hand with Carl and Angela.
- [HIGH] `supabase/functions/suggest-assessment-tool-name/` and `supabase/functions/tga-sync-components/` — two new edge functions present in the PR but **not registered in `config.toml`**. Functions will not deploy. Both must have `[functions.suggest-assessment-tool-name]` and `[functions.tga-sync-components]` entries added with `verify_jwt = true`.
- [HIGH] CI — Vercel FAIL + Supabase Preview FAIL. Both checks failing before any fix is applied. Cannot merge until CI is green.
- [HIGH] `src/components/settings/StripeSubscriptionTab.tsx` and `SubscriptionTab.tsx` — both switch from `rpc('list_active_plans')` to `rpc('get_eligible_plans' as any, { p_tenant_id: tenantId })`. `get_eligible_plans` is an `as any` RPC call and has not been verified against the production DB schema. If the RPC does not exist or its args differ, billing plan loading silently returns empty — tenants see no subscription options.
- [MEDIUM] `supabase/migrations/20260529130000_schedule_email_outbox_worker.sql` — `cron.schedule` runs every minute (`* * * * *`). No backoff, no error handling, no dead-letter mechanism. If `email-outbox-worker` is not deployed or throws, the cron job silently fails every minute with no alerting.
- [INFO] Angela's rescue branch — all conflicts with PR #29 resolved, all migrations verified safe. Brian merges.

**Schema verified:** INCOMPLETE — 18 migrations untouched. Given the 6 merge conflicts with PR #29, schema verification for all new tables/columns (`tas_consultation_links`, `suggest_consultations_for_tas`, `ncver_nominal_hours`, `tas_aot_packs.aot_mode/product_type`, `assessment_tools.custom_id`, QI register trigger, etc.) must be done after conflicts are resolved, not before. `get_eligible_plans` RPC — **NOT CONFIRMED** in production DB.

**Build check:** FAIL — Vercel CI failing. TSC not run (blocked by CI failures and merge conflicts; running TSC against a branch with 6 unresolved merge conflicts would give misleading results).

**CI:** Vercel ❌ FAIL. Supabase Preview ❌ FAIL. Cursor Bugbot skipping.

**Foresight (Step 7c):**
- Callers/contract: `get_eligible_plans` called via `as any` in 2 billing components — RPC contract unverified against production. If function does not exist, both billing screens silently return empty. Must verify before merge.
- Live data: `rpc_calculate_aot_engine` now branches by `product_type`. Production has existing `tas_aot_packs` rows from the old `aqf_vol`-only version — none have `aot_mode` or `product_type` columns yet (those come from migration `20260528120000`). If migration runs after any existing AOT calculation, the SECURITY DEFINER function references the new columns. Migration ordering is critical.
- Drift interaction: 6 of PR #26's files are add/add conflicts with PR #29's already-merged versions. `email-outbox-worker/index.ts` is a three-way conflict: main (PR #29), PR #26, and fix/local-run all have diverged versions. This cannot be auto-resolved — Carl must diff all three and produce a single correct version.
- RLS/roles: Not verified. Blocked by merge conflicts.

**Dry-run PR → main:** FAILED — 6 conflicts. Cannot merge without resolution.
  - `src/components/settings/SubscriptionTab.tsx` — content conflict
  - `src/hooks/useRegulatoryOverlays.ts` — add/add conflict with PR #29
  - `src/hooks/useTasConsultationLinks.ts` — add/add conflict with PR #29
  - `src/pages/registers/assessment-tools/components/AssessmentToolNamingPanel.tsx` — add/add conflict with PR #29
  - `src/pages/registers/assessment-tools/components/statusBadges.tsx` — add/add conflict with PR #29
  - `supabase/functions/email-outbox-worker/index.ts` — add/add conflict

**Dry-run main → fix/local-run:**
  - New conflicts from PR #26: `package-lock.json` (new deps), `supabase/functions/email-outbox-worker/index.ts` (three-way conflict)
  - Deepened conflicts: NONE (PR #26's other files don't overlap the 24-file conflict set)
  - Pre-existing (no change): 17 hard conflicts already tracked

**Notes for Carl (Phase 5):** `email-outbox-worker/index.ts` is now a three-way conflict (main/PR26/fix/local-run). Must be reconciled manually. `package-lock.json` will add a new conflict in Phase 5 once PR #26's new npm packages are on main. Two new Phase 5 soft-conflict candidates to track once PR #26 is resolved: `StripeSubscriptionTab.tsx`, `SubscriptionTab.tsx` (may auto-merge or conflict depending on how content conflict is resolved).

**Fixes needed before merge:**
1. ~~Remove hard-coded JWT from `20260529130000_schedule_email_outbox_worker.sql`~~ — **WAIVED (18 June 2026).** 12 existing cron migrations in this repo use the same hardcoded production URL + anon JWT pattern (earliest: August 2025). Angela's migration is consistent with the established codebase standard. The anon JWT is the public-facing least-privileged key — not a service role key. A vault-based cleanup of ALL cron jobs is the correct fix and is Carl's domain. Flagged here for Carl to address platform-wide, not piecemeal.
2. ~~Re-timestamp all 18 migrations to `20260618021800`+~~ — **DONE (18 June 2026).** 10 duplicates deleted, 13 unique migrations renamed to `20260618021800`–`20260618023000`. Committed on branch.
3. ~~Resolve 6 merge conflicts with PR #29's already-merged work~~ — **DONE (18 June 2026).** All 6 files pre-resolved to RJ's (main's) versions. Committed on branch. See Problem 1 Decision Log above.
4. ~~Add `config.toml` entries for `suggest-assessment-tool-name` and `tga-sync-components`~~ — **DONE (18 June 2026).** Both entries added with `verify_jwt = true`. Committed.
7. ~~Migration 1 (`rpc_calculate_aot_engine`) regression risk~~ — **RESOLVED (18 June 2026).** Fixed in Problem 2 commit: unit filter corrected to `u.tas_build_id = p_tas_build_id` (matches production); fallback allocation block added. Verified against live production function — aqf_vol logic matches, skill set/unit branches are net-new capability, no regression.
8. ~~Migration 7 (3 missing RESTRICTIVE SELECT policies)~~ — **RESOLVED (18 June 2026).** All 3 policies added back in Problem 2 commit (lines 197–211 of migration file). Verified against production.

5. Verify `get_eligible_plans` RPC exists in production with correct signature — **DONE (18 June 2026).** Function confirmed in production (`gdwhlstfguxarnxasrrs`): `get_eligible_plans(p_tenant_id uuid)` returns TABLE(plan_code, plan_name, billing_interval, amount_total, currency, stripe_price_id, is_legacy). All 4 call sites pass `{ p_tenant_id: tenantId }` — exact match. SECURITY DEFINER ✅. types.ts declaration matches ✅.
6. Fix CI (Vercel + Supabase Preview) — **DONE (18 June 2026).** Vercel was failing for two reasons: (1) `eslint@^10.0.2` conflicts with `eslint-plugin-react-hooks@7` — resolved by merge from main which brought `eslint@^9.34.0`. (2) Branch was cut between a deletion commit and a 670-file revert commit (`b0d70af3b`) on main — branch was missing files like `SecurityPage.tsx`. Resolved by merging `origin/main` into branch (only 1 conflict: `config.toml` — kept all entries from both sides). Pushed 18 June 2026. Vercel ✅ PASS. Supabase Preview ❌ FAIL — systemic hyphen-migration-filename issue, Carl's domain, same as PRs #41/#25/#23. Not caused by this branch.
9. Cursor Bugbot findings (HIGH/MEDIUM) — **DONE (18 June 2026).** Three real bugs fixed and pushed:
   - [HIGH] `20260618021800_aot_polymorphism_p2a_engine.sql` — ON CONFLICT DO UPDATE added to `sum_of_units` and `single_unit_nominal` INSERT branches. Unique index `(tenant_id, tas_build_id, pack_version)` confirmed in production.
   - [MEDIUM] `src/hooks/useAotPackFreshness.ts` — freshness check now skips empty-allocations stale flag for non-`aqf_vol` modes; skillset/unit packs intentionally store `[]`.
   - [MEDIUM] `src/hooks/useTasDraftSections.ts:117` — ISO timestamp string `>=` compare replaced with `getTime()` comparison to handle `+00:00` vs `Z` suffix ordering mismatch.
   - [STALE] alignment_status constraint finding — values already present in production constraint. No action.
   - [STALE] email-outbox-worker duplicate-send finding — RJ's two-step claim version already on branch. No action.
   Commit: `2ce16483b`. Pushed and merged.

**All technical blockers resolved. MERGED AND DELETED 18 June 2026 by KhianBrian.**

---

### PR #26 — Problem 1 File-by-File Decision Log ✅ RESOLVED
**Date analysed:** 18 June 2026
**Purpose:** For each of the 6 add/add / content conflicts between PR #26 (Angela) and PR #29 (RJ, already on main), determine which version to keep.

**Context:** Angela's rescue branch was cut ~13 June from the state of main at that time. RJ's PR #29 was developed concurrently, reviewed, fixed, and merged to main 18 June. Angela came first chronologically; RJ was merged first.

---

#### File 1 — `src/components/settings/SubscriptionTab.tsx`
**Conflict type:** Content conflict (both modified an existing file)

**What Angela's version does:** Switches from `list_active_plans` to `get_eligible_plans`. `useEffect` guard: `if (tenantId) loadPlans()` — nothing else when tenant is null.

**What RJ's version does:** Same switch. `useEffect` guard: `if (tenantId) { loadPlans(); } else { setAllPlans([]); setPlansError(null); setPlansLoading(false); }` — when no tenant is selected it actively clears plans and resets the loading state rather than leaving the previous tenant's plans on screen.

**Verdict: RJ's version.** Angela's leaves stale plans on screen and the loading spinner active when a user deselects a tenant. RJ's is a strict safety improvement on the same intent. No Angela-specific logic lost.

---

#### File 2 — `src/hooks/useRegulatoryOverlays.ts`
**Conflict type:** Add/add (both branches independently created this file)

**What Angela's version does:** Detects regulatory overlays from `q1_tas_builder.regulatory_overlays` and invokes `detect-regulatory-overlays` edge function. `isDetecting` is included in the `useCallback` dependency array for `detect`.

**What RJ's version does:** Identical purpose and logic. One difference: `isDetecting` is **removed** from the `useCallback` dependency array. This was flagged as a LOW finding during our PR #29 review — with `isDetecting` in deps, the `detect` function reference regenerates on every detection state change, causing unnecessary re-renders.

**Verdict: RJ's version.** RJ's fix is correct. The removal of `isDetecting` from deps stabilises the callback. Angela's version has the dependency array bug.

---

#### File 3 — `src/hooks/useTasConsultationLinks.ts`
**Conflict type:** Add/add (both branches independently created this file)

**What Angela's version does:** Manages TAS ↔ Consultation Register linking.

**What RJ's version does:** **Byte-for-byte identical** — exact same file, same logic, same comments, same exports. The add/add conflict exists only because both branches created it independently; git can't auto-resolve even when content matches.

**Verdict: RJ's version (either works — they are identical).** Keep main's version. No Angela-specific logic exists.

---

#### File 4 — `src/pages/registers/assessment-tools/components/AssessmentToolNamingPanel.tsx`
**Conflict type:** Add/add (both branches independently created this file)

**What Angela's version does:** Pure client-side convention validator. Takes a single `unitCode` (string), `toolTypeLabel`, `version`, `currentName`. Shows pattern chips, validates the name starts with `${unitCode}_`, shows a static suggestion. No API calls.

**What RJ's version does:** Takes `unitCodes` (string **array**, not single), `toolType`, `toolName`. Supports multiple unit codes (uses `unitCodes[0]` as prefix). Also has an **"Suggest name (AI)"** button that calls the `suggest-assessment-tool-name` edge function for AI-generated names.

**Verdict: RJ's version — required, not optional.** PR #37 (already on main) migrated assessment tools to a multi-unit-code data model — `assessment_tools.qualification_codes` is now an array. Angela's version takes a single `unitCode: string` prop, which is incompatible with the live data model. Her version would break on any tool with more than one linked unit. RJ's `unitCodes: string[]` prop matches the current DB schema. Additionally, RJ's AI suggestion integrates the `suggest-assessment-tool-name` edge function that Angela added in this same PR — so that edge function's value is preserved via RJ's component, not lost.

---

#### File 5 — `src/pages/registers/assessment-tools/components/statusBadges.tsx`
**Conflict type:** Add/add (both branches independently created this file)

**What Angela's version does:** Exports `TOOL_STATUS_OPTIONS` as a `const` array, `getToolStatusBadge()` function with hardcoded label strings. Does not handle `null | undefined` status — defaults to `Draft` only for explicit `null`. Label: `"Under Review"` (capital R).

**What RJ's version does:** Adds a `ToolStatus` TypeScript type. Builds a `LABEL_MAP` from `TOOL_STATUS_OPTIONS` so labels are never duplicated. `getToolStatusBadge()` handles `null | undefined` defensively (coerces to `'draft'`). Uses `text-primary` for `approved` state (theme-consistent) instead of hardcoded `text-blue-600`. Label: `"Under review"` (lowercase r, consistent with other badge labels in the codebase).

**Verdict: RJ's version.** Strictly more defensive, properly typed, uses theme colours, handles undefined. Angela's is an earlier draft of the same component. No logic in Angela's version is absent from RJ's.

---

#### File 6 — `supabase/functions/email-outbox-worker/index.ts`
**Conflict type:** Add/add (both branches independently created this file). Also conflicts with `fix/local-run`.

**What Angela's version does (143 lines):** Single-query approach — selects up to 25 queued rows from `email_outbox`, processes them. If two cron invocations fire simultaneously, both queries return the same rows → both try to send the same emails → **double-send race condition**.

**What RJ's version does (164 lines):** Two-step "claim" approach — Step 1: select just the IDs of queued rows. Step 2: `UPDATE status = 'processing' WHERE id IN (...) AND status = 'queued'` and return the claimed rows. If two workers fire simultaneously, only one wins the UPDATE for each row (the other gets zero rows back for that ID). **Concurrency-safe — no double-send.**

**Verdict: RJ's version — this is a correctness fix, not style.** Angela's version has a real double-send bug that would appear under pg_cron's every-minute schedule. RJ's two-step claim pattern is the correct way to implement a worker queue. Angela's version must not be used.

---

### Problem 1 Summary — Decision for All 6 Files

| File | Keep | Reason |
|---|---|---|
| `SubscriptionTab.tsx` | RJ's (main) | Clears state on tenant deselect; Angela's leaves stale UI |
| `useRegulatoryOverlays.ts` | RJ's (main) | Removes unstable `isDetecting` from useCallback deps |
| `useTasConsultationLinks.ts` | RJ's (main) | Identical content — keep main's, nothing lost |
| `AssessmentToolNamingPanel.tsx` | RJ's (main) | **Required** — multi-unit-code props match live DB schema from PR #37 |
| `statusBadges.tsx` | RJ's (main) | More defensive, properly typed, theme-consistent |
| `email-outbox-worker/index.ts` | RJ's (main) | **Correctness** — two-step claim prevents double-send race condition |

**Resolution path for Angela's branch:** All 6 files should be deleted from `rescue/pending-work-20260613` and replaced with the versions currently on `main`. The functional intent of Angela's work is already preserved — RJ's versions are either identical or strictly better. The only unique Angela contribution in this set is the `AssessmentToolNamingPanel` static validator logic, but RJ's version already does the same thing plus more.

**Status: RESOLVED — use RJ's versions (already on main) for all 6 files. No Angela logic is lost.**

---

### PR #26 — Problem 2 Analysis: Migration Timestamp Ordering
**Date analysed:** 18 June 2026

**Finding:** Angela's branch has 23 migrations (not 18 as initially stated). Main's current ceiling is `20260618021722`. All 23 are dated May–June 2026, meaning all 23 would be inserted before the 18 June migrations already on main.

However the situation is more nuanced than "re-timestamp all 23." Cross-referencing Angela's migration names against PR #29's merged work reveals:

#### 10 DUPLICATE migrations — must be DELETED, not re-timestamped

These are the SAME migrations PR #29 already landed on main (same name, same content, re-timestamped by Brian during that review). If merged, they would attempt to create tables/functions/triggers that already exist — they will fail.

| Angela's filename | Already on main as |
|---|---|
| `20260529000000_add_archive_columns_to_trainer_industry_currency.sql` | `20260618000100_...` |
| `20260529000100_extend_archive_whitelist_to_trainer_industry_currency.sql` | `20260618000200_...` |
| `20260529120000_add_survey_link_and_custom_id_trigger_to_qi_register.sql` | `20260618000300_...` |
| `20260529120100_create_trigger_qi_register_autolog_from_session.sql` | `20260618000400_...` |
| `20260529120200_backfill_qi_register_from_existing_qi_surveys.sql` | `20260618000500_...` |
| `20260605000000_tas_consultation_links_and_suggest_rpc.sql` | `20260618000600_...` |
| `20260605000100_backfill_tas_consultation_links.sql` | `20260618000700_...` |
| `20260605000200_extend_tas_list_v3_consultation_evidence.sql` | `20260618000800_...` |
| `20260606002100_seed_custom_id_sequence_helper.sql` | `20260618000900_...` |
| `20260606002200_seed_custom_id_sequences_run.sql` | `20260618001000_...` |

#### 13 UNIQUE migrations — must be re-timestamped to after `20260618021722`

These are genuinely new work not present on main. Proposed new names (starting at `20260618021800`, incrementing by 100):

| Old filename | Proposed new filename | Notes |
|---|---|---|
| `20260528120000_aot_polymorphism_p2a_engine.sql` | `20260618021800_aot_polymorphism_p2a_engine.sql` | AOT engine polymorphism (qualification/skillset/unit modes) |
| `20260529130000_schedule_email_outbox_worker.sql` | `20260618021900_schedule_email_outbox_worker.sql` | ⚠️ Also needs Problem 3 fix (hard-coded JWT) before merge |
| `20260606000000_assessment_tools_naming_and_custom_id_columns.sql` | `20260618022000_assessment_tools_naming_and_custom_id_columns.sql` | Adds naming_prefix, custom_id columns + triggers |
| `20260606000100_assessment_tools_status_constraint_expand.sql` | `20260618022100_assessment_tools_status_constraint_expand.sql` | Expands status enum |
| `20260606000200_assessment_tools_documents_link.sql` | `20260618022200_assessment_tools_documents_link.sql` | Links documents to assessment tools |
| `20260606000300_assessment_tools_validation_propagation.sql` | `20260618022300_assessment_tools_validation_propagation.sql` | Validation propagation |
| `20260606000400_assessment_tools_rls_standardise.sql` | `20260618022400_assessment_tools_rls_standardise.sql` | RLS standardisation |
| `20260606001000_assessment_tools_backfill_custom_id.sql` | `20260618022500_assessment_tools_backfill_custom_id.sql` | Backfill — uses self-contained MAX-scan, NOT the shared helper |
| `20260606001100_assessment_tools_remap_active_to_published.sql` | `20260618022600_assessment_tools_remap_active_to_published.sql` | Status remap |
| `20260606001200_assessment_tools_status_constraint_finalise.sql` | `20260618022700_assessment_tools_status_constraint_finalise.sql` | Final status constraint |
| `20260606002000_fix_generate_tenant_custom_id_2arg.sql` | `20260618022800_fix_generate_tenant_custom_id_2arg.sql` | Platform fix — repairs broken 2-arg custom_id generator. Independent of assessment tool migrations (they use their own MAX-scan). |
| `20260606003000_fix_extract_industry_themes_from_evidence.sql` | `20260618022900_fix_extract_industry_themes_from_evidence.sql` | Extract themes fix |
| `20260609120000_training_products_for_tenant_scope.sql` | `20260618023000_training_products_for_tenant_scope.sql` | Training products tenant scope |

**Ordering note:** Relative order of the 13 unique migrations is preserved and correct. The backfill migration (`022500`) explicitly documents it does NOT use the broken `generate_tenant_custom_id` shared helper — it uses its own self-contained MAX-scan. So `fix_generate_tenant_custom_id_2arg` (`022800`) is independent and can go anywhere in the sequence without breaking the other migrations.

**Status: ANALYSIS COMPLETE — awaiting Brian approval to execute renames on branch.**

---

### PR #26 — Problem 2 Safety Verification: Each of the 13 Unique Migrations Against Production
**Date analysed:** 18 June 2026
**Production DB queried:** `gdwhlstfguxarnxasrrs`

**Overall result: 10 SAFE ✅ / 1 CONDITIONAL 🟡 / 2 BLOCKED 🔴**

The 2 blocked migrations must be fixed by Carl and Angela before this branch can merge. The rest are safe to apply once Problems 2 and 3 are resolved.

---

#### Migration 1 — `20260618021800_aot_polymorphism_p2a_engine.sql`
**Status: 🔴 DO NOT APPLY AS-IS — WOULD REGRESS PRODUCTION FUNCTION**

- **Column additions (`aot_mode`, `product_type` on `tas_aot_packs`):** Both columns already exist on production with identical types. `ADD COLUMN IF NOT EXISTS` = no-ops. ✅ SAFE.
- **`rpc_calculate_aot_engine` CROR:** **WILL OVERWRITE** production's more recent function with an older version. Two critical differences found by comparing Angela's migration body against the live production function:
  1. **Unit query filter (breaking):** Angela's `aqf_vol` path queries `WHERE ... AND upper(trim(u.source_product_code)) = upper(trim(v_qual_code))`. Production queries `WHERE ... AND u.tas_build_id = p_tas_build_id`. Units are linked to TAS builds via `tas_build_id` in all current DB data — filtering by `source_product_code` will return a different (wrong) unit count and nominal hours, causing incorrect AOT calculations for existing builds.
  2. **Missing fallback allocation (breaking):** Production has a full fallback allocation block for when no weight pack exists but the TAS has units. Angela's version does not include this block — if weight pack is absent, unit allocations silently return empty.
  3. **search_path:** `SET search_path TO ''` vs production's `SET search_path TO 'public', 'pg_catalog'`. Angela's stricter version will work with fully-qualified references.
- **What Angela adds that is NOT in production:** `sum_of_units` and `single_unit_nominal` branches for skill sets and units. Production returns early for non-qualification product types. Angela's version handles them with proper calculation logic. This is genuine new capability.
- **Decision for Carl:** Cannot simply apply. Options:
  - **Option A (Skip):** Delete Migration 1. Production's `rpc_calculate_aot_engine` stays as-is. Skill set / unit AOT calculation remains unsupported (returns early).
  - **Option B (Merge bodies):** Manually combine: use Angela's product_type branching structure but replace her `aqf_vol` inner body with production's (correct `tas_build_id` filter + fallback allocation block). Apply as a new migration. This preserves Angela's skill set/unit work without regressing qualification AOT.

---

#### Migration 2 — `20260618021900_schedule_email_outbox_worker.sql`
**Status: 🟡 CONDITIONAL — fix Problem 3 (JWT) first, then SAFE**

- `email-outbox-worker-every-minute` pg_cron job does NOT exist on production → will CREATE. Mechanically safe.
- **Blocked by Problem 3:** Migration contains a hard-coded production anon JWT in the `cron.schedule()` SQL. Must be replaced with runtime secret lookup (e.g. `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'`) before this migration can go anywhere near main.
- Once JWT is removed, this migration is safe to apply.

---

#### Migration 3 — `20260618022000_assessment_tools_naming_and_custom_id_columns.sql`
**Status: ✅ SAFE**

All three target columns already exist on production:
- `naming_prefix` (text, nullable) ✅
- `naming_validated` (boolean, nullable) ✅
- `custom_id` (text, nullable) ✅

`ADD COLUMN IF NOT EXISTS` guards on all three = no-ops. Any triggers in this migration that use `CREATE TRIGGER IF NOT EXISTS` will also be no-ops (triggers confirmed present). Safe to apply as-is.

---

#### Migration 4 — `20260618022100_assessment_tools_status_constraint_expand.sql`
**Status: ✅ SAFE (must run in sequence with Migrations 9 and 10)**

- Drops existing `assessment_tools_status_check` (currently: `draft, under_review, approved, published, superseded, archived` — no 'active')
- Recreates constraint WITH 'active' included — transitional state
- **Must be followed by Migration 9** (which remaps 'active' → 'published', 0 rows = no-op) **and Migration 10** (which finalises by dropping 'active' again)
- Net result after all three: identical to current production constraint
- If run alone without 9 and 10, 'active' would be re-added to the constraint (wrong intermediate state). Safe as part of the full sequence.

---

#### Migration 5 — `20260618022200_assessment_tools_documents_link.sql`
**Status: ✅ SAFE**

Index `documents_register_linked_register_uniq` does NOT exist on production. `CREATE UNIQUE INDEX IF NOT EXISTS` will create it cleanly. No collision risk.

---

#### Migration 6 — `20260618022300_assessment_tools_validation_propagation.sql`
**Status: ✅ SAFE**

- `CREATE OR REPLACE FUNCTION propagate_assessment_tool_validation()`: function already exists on production. Angela's version has **identical logic** to production (both handle `tool_id` + `assessment_tool_ids` array, GREATEST() for `last_validated_at`, same trigger condition). Minor `SET search_path = ''` vs `'public', 'pg_catalog'` difference — both work.
- `DROP TRIGGER IF EXISTS trg_propagate_assessment_tool_validation ON public.assessment_validation; CREATE TRIGGER ...`: trigger already exists on production (confirmed). DROP IF EXISTS is safe; new trigger is functionally identical. No data risk.
- REVOKE EXECUTE from anon — safe DDL.

---

#### Migration 7 — `20260618022400_assessment_tools_rls_standardise.sql`
**Status: 🔴 DO NOT APPLY AS-IS — SECURITY REGRESSION**

This migration dynamically drops ALL existing policies on `assessment_tools` and `assessment_tool_versions`, then recreates a standard set. The problem: it does NOT recreate three **RESTRICTIVE SELECT** policies that currently exist on production.

**Policies dropped but NOT recreated:**

| Policy | Table | Type | What it does | Impact if removed |
|---|---|---|---|---|
| `restrict_sa_select_assessment_tools` | `assessment_tools` | RESTRICTIVE SELECT | `sec.superadmin_tenant_gate(tenant_id)` — gates which tenants a super_admin can view | Superadmins can see ALL tenants' assessment tools without gate restriction |
| `tenant_isolate_select_assessment_tools` | `assessment_tools` | RESTRICTIVE SELECT | `sec.is_super_admin() OR sec.is_current_tenant(tenant_id)` — enforces active-tenant isolation | Multi-tenant users can see all their joined tenants' tools, not just the active tenant |
| `tenant_isolate_select_atv` | `assessment_tool_versions` | RESTRICTIVE SELECT | Same isolation logic for versions table | Same as above for assessment_tool_versions |

All three are **RESTRICTIVE** (confirmed via `pg_policy.polpermissive = false`). Removing a RESTRICTIVE SELECT policy EXPANDS access — the AND-AND combination of restrictions becomes weaker.

**Other changes (non-breaking):**
- `billing_gate` renamed to `billing_gate_assessment_tools` / `billing_gate_assessment_tool_versions` — same logic, different name. Functionally equivalent.
- `role_visibility_atv` version adds `t.tenant_id = public.assessment_tool_versions.tenant_id` to the EXISTS subquery — Angela's is actually slightly stricter than production's. This improvement is fine.
- Policy naming on `assessment_tool_versions` side gets `_assessment_tool_versions` suffix (was `_atv`) — just renaming.

**Fix:** Before applying, add these three RESTRICTIVE SELECT policies back to the migration:
```sql
CREATE POLICY restrict_sa_select_assessment_tools ON public.assessment_tools
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (sec.superadmin_tenant_gate(tenant_id));

CREATE POLICY tenant_isolate_select_assessment_tools ON public.assessment_tools
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (sec.is_super_admin() OR sec.is_current_tenant(tenant_id));

CREATE POLICY tenant_isolate_select_assessment_tool_versions ON public.assessment_tool_versions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (sec.is_super_admin() OR sec.is_current_tenant(tenant_id));
```
Carl must confirm exact `sec.superadmin_tenant_gate` signature before adding.

---

#### Migration 8 — `20260618022500_assessment_tools_backfill_custom_id.sql`
**Status: ✅ SAFE**

DML-only DO block. Fills `custom_id = NULL` rows with `AT####` format using a self-contained MAX-scan (does NOT depend on `generate_tenant_custom_id`). Existing `custom_id` values are untouched (`WHERE at.custom_id IS NULL`). Any `AT####` values already present are respected. Safe to apply.

---

#### Migration 9 — `20260618022600_assessment_tools_remap_active_to_published.sql`
**Status: ✅ SAFE**

`UPDATE assessment_tools SET status = 'published' WHERE status = 'active'`

Production has **0 rows** with `status = 'active'` (confirmed: 471 rows total — approved=35, draft=2, published=369, under_review=65). This UPDATE is a complete no-op.

---

#### Migration 10 — `20260618022700_assessment_tools_status_constraint_finalise.sql`
**Status: ✅ SAFE (in sequence)**

Drops `assessment_tools_status_check` and recreates without 'active'. After Migration 4 re-adds 'active' to the constraint and Migration 9 remaps all 'active' rows (0 rows), this finalisation is safe. Net result: identical to the current production constraint. No rows with `status = 'active'` remain, so no constraint violation.

---

#### Migration 11 — `20260618022800_fix_generate_tenant_custom_id_2arg.sql`
**Status: ✅ SAFE and BENEFICIAL**

This migration is a **bug fix** for a production defect. Production's current 2-arg `generate_tenant_custom_id(uuid, text)` was created with `SET search_path = ''` but uses an **unqualified `CREATE SEQUENCE`** — under an empty search_path this statement has no schema to create into, so the function has never successfully run. No per-tenant sequences exist anywhere on production.

Angela's fix:
- `DROP FUNCTION IF EXISTS public.generate_tenant_custom_id(uuid, text)` — safe (DROP+CREATE is correct here because parameter names are unknown; CROR would fail)
- Recreates with `CREATE SEQUENCE IF NOT EXISTS public.%I` (schema-qualified) and improved sequence naming (`cid_seq_<prefix>_<tenant_uuid_nodashes>` vs old unqualified `custom_id_seq_...`)
- Since the old function NEVER created any sequences, there is no existing state to conflict with the new naming format
- RESIDUAL RISK (documented in migration): registers seeded via another path may see a sequence collision on first generated value — these should use the 3-arg `(regclass, text, uuid)` overload instead

---

#### Migration 12 — `20260618022900_fix_extract_industry_themes_from_evidence.sql`
**Status: ✅ SAFE**

`CREATE OR REPLACE FUNCTION rpc_extract_industry_themes` — function already exists on production. Angela's migration body is functionally identical to the production version (same tenant check logic, same jsonb parse-and-extract approach, same COALESCE on `consultation_theme_summary`). Minor `SET search_path = ''` vs production's `'public', 'pg_catalog'` difference — both work. CROR is idempotent here.

---

#### Migration 13 — `20260618023000_training_products_for_tenant_scope.sql`
**Status: ✅ SAFE**

Both functions (`get_training_products_for_tenant_scope`, `get_tga_qualifications_for_tenant_scope`) already exist on production with **identical logic** to what Angela's migration defines. Production's `get_tga_qualifications_for_tenant_scope` already delegates to `get_training_products_for_tenant_scope` — the delegation pattern Angela introduced is already live. Angela's migration is the likely source of the production versions. Applying it is idempotent. GRANT/REVOKE same as current production grants.

---

### Problem 2 Verification — Summary Table

| # | New filename | Status | Reason |
|---|---|---|---|
| 1 | `20260618021800_aot_polymorphism_p2a_engine.sql` | 🔴 DO NOT APPLY AS-IS | `rpc_calculate_aot_engine` CROR would regress production: wrong unit filter (`source_product_code` vs `tas_build_id`) + missing fallback allocation. Angela's skill set/unit branches are unique value — Carl to manually merge or skip |
| 2 | `20260618021900_schedule_email_outbox_worker.sql` | 🟡 CONDITIONAL | Fix Problem 3 (JWT) first. Then safe |
| 3 | `20260618022000_assessment_tools_naming_and_custom_id_columns.sql` | ✅ SAFE | All columns exist; IF NOT EXISTS = no-ops |
| 4 | `20260618022100_assessment_tools_status_constraint_expand.sql` | ✅ SAFE (in-sequence) | Intermediate state; Migrations 9+10 restore net-same constraint |
| 5 | `20260618022200_assessment_tools_documents_link.sql` | ✅ SAFE | Index absent from production; will create cleanly |
| 6 | `20260618022300_assessment_tools_validation_propagation.sql` | ✅ SAFE | Function + trigger identical to production; CROR + DROP/CREATE trigger = no-ops |
| 7 | `20260618022400_assessment_tools_rls_standardise.sql` | 🔴 DO NOT APPLY AS-IS | Drops 3 RESTRICTIVE SELECT policies (`restrict_sa_select`, `tenant_isolate_select_at`, `tenant_isolate_select_atv`) without recreating them — security regression |
| 8 | `20260618022500_assessment_tools_backfill_custom_id.sql` | ✅ SAFE | DML only; NULL-targeting; self-contained MAX-scan |
| 9 | `20260618022600_assessment_tools_remap_active_to_published.sql` | ✅ SAFE | 0 `active` rows on production; UPDATE is a no-op |
| 10 | `20260618022700_assessment_tools_status_constraint_finalise.sql` | ✅ SAFE (in-sequence) | Net result matches current production constraint |
| 11 | `20260618022800_fix_generate_tenant_custom_id_2arg.sql` | ✅ SAFE + BENEFICIAL | Fixes broken function; no existing sequences at risk |
| 12 | `20260618022900_fix_extract_industry_themes_from_evidence.sql` | ✅ SAFE | Identical to production; CROR is idempotent |
| 13 | `20260618023000_training_products_for_tenant_scope.sql` | ✅ SAFE | Identical to production; delegation already live; idempotent |

**Status: VERIFICATION COMPLETE — 10 SAFE, 1 CONDITIONAL, 2 BLOCKED. Escalate Migrations 1 and 7 to Carl before proceeding.**

---

### PR #22 — Fix consultant access for tenant hub RPCs
**Branch:** `cursor/critical-bug-investigation-f04e`
**Verdict:** APPROVE
**Severity:** LOW (clean)
**Status:** MERGED AND DELETED — 18 June 2026

**Summary:** Adds `is_active_consultant()` helper (active `tenant_members` membership check) and recreates 9 `sa_*` RPCs to widen auth gate from super_admin-only to super_admin OR active consultant — aligning DB access with the existing ConsultantGuard UI route guard.

**Issues found:**
- [LOW] `sa_tenant_lifecycle_stats` uses JWT-based super_admin check (`auth.jwt() -> 'app_metadata' ->> 'is_super_admin'`) inconsistently vs the other 8 functions which use `public.is_super_admin()`. Functionally equivalent. Pre-existing pattern preserved, not introduced by this PR.

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `tenant_members.role = 'Consultant'` — confirmed exact capitalisation ✅
- `tenant_members.status = 'active'` — confirmed value exists ✅
- All other table/column refs pre-existing in already-deployed RPCs ✅

**Build check:** N/A — no TypeScript files changed. No type regen needed (function signatures unchanged).

**CI:** Vercel ❌ FAIL — branch ~9 days old, 13 commits behind main at review time (QI work, new hooks). Build failure from branch staleness, not this PR's code. Supabase Preview ❌ FAIL — same root cause; migration itself is idempotent (`CREATE OR REPLACE`).

**Foresight:**
- Callers confirmed for all 9 RPCs (5 hooks + 3 tab components)
- 3 callers use `as any` cast — pre-existing, no new risk from this PR (signatures unchanged)
- `Consultant` role + `active` status confirmed in production — `is_active_consultant()` will match real members
- No drift interaction — neither file appears in 24-file conflict set. Zero Phase 5 impact.
- RLS: all functions SECURITY DEFINER with `SET search_path TO ''` ✅. GRANT scoped to `authenticated` ✅.

**Dry-run PR → main:** CLEAN — 2 new files only, no conflicts.
**Dry-run main → fix/local-run:** Zero new conflicts. Zero deepened conflicts. All 17 hard conflicts pre-existing and already tracked.

---

### PR #20 — Fix assessment tool lifecycle regressions
**Branch:** `cursor/critical-bug-investigation-ff3a`
**Verdict:** APPROVE (after conflict resolution)
**Severity:** MEDIUM (resolved)
**Status:** MERGED AND DELETED — 19 June 2026

**Summary:** Fixes three real assessment tool lifecycle bugs: (1) editing approved/published/superseded tools silently reset status to draft/under_review; (2) detail view held a stale snapshot after mutations, blocking the approve→publish flow without navigating away; (3) `assessment_validation_tool_review` query filtered on a non-existent `tenant_id` column, silently wiping all Principles/Rules review data. Also adds "Sync repository" retry action for published tools with failed Document Repository syncs.

**Issues found:**
- [MEDIUM — resolved] `src/pages/registers/assessment-tools/components/AssessmentToolDetail.tsx` — conflict with main (post-PR #21): main had `toolStatus = normalizeToolStatus(tool.status)`, PR has `canPublishOrSync`. Auto-merge also left `toolStatus === 'draft'` and `toolStatus === 'under_review'` on lines 160/170 (soft conflict — would compile as undefined reference). Resolved: removed `normalizeToolStatus` from import and from all Detail usages; replaced with `tool.status` direct comparisons and `canPublishOrSync`.
- [LOW — resolved] `src/pages/registers/assessment-tools/index.tsx` — two conflict regions with main: import line and `handleSave`. Resolution: kept `normalizeToolStatus` in import (still needed for KPI/filter usages added by PR #21); added PR #20's new imports; used PR #20's `buildAssessmentToolSaveData` for `handleSave` (supersedes PR #21's guard — more comprehensive lifecycle lock covering approved/published/superseded).

**Schema verified (production `gdwhlstfguxarnxasrrs`):**
- `assessment_validation_tool_review` — no `tenant_id` column (confirmed). Old `.eq('tenant_id', tenantId)` filter was querying a phantom column. Fix correct.
- RLS on `assessment_validation_tool_review` — enabled. Tenant scope enforced via JOIN to `assessment_validation.tenant_id`. Removing bad filter safe.
- `assessment_tools.status` distinct values — `published: 374, under_review: 65, approved: 35, draft: 2`. Zero `active` (legacy) values. Removing `normalizeToolStatus` from Detail button conditions affects no existing records.

**Build check:** PASS — `tsc --noEmit` clean on PR branch AND after conflict resolution.
**CI:** Vercel ❌ FAIL — build from 6 June (13 days old, pre-review). TSC clean; failure is pre-existing branch staleness. Supabase Preview SKIPPED.

**Foresight:**
- Callers: `updateCachedTool` private to hook. `buildAssessmentToolSaveData` / `resolveLiveDetailTool` called from index.tsx only. `publishTool` return shape confirmed — `res.tool` is `publishedTool` at hook line 452.
- Live data: No `active` status in production — `normalizeToolStatus` removal from Detail is safe for all 476 existing tools.
- Drift: None of PR #20's 5 files in fix/local-run diverged set. Zero Phase 5 conflict impact.
- RLS/roles: `canPublishOrSync` correctly gates on `canApproveOrPublish` (admin/CM/super_admin). Trainer/Assessor cannot publish. No regression.

**Dry-run PR → main:** CONFLICT — 2 files (AssessmentToolDetail.tsx, index.tsx). Resolved via merge commit.
**Dry-run main → fix/local-run:** Zero new conflicts. Zero deepened conflicts. All pre-existing conflicts unaffected.

**Changes made on branch:**
| File | Change |
|---|---|
| `src/pages/registers/assessment-tools/components/AssessmentToolDetail.tsx` | Removed `normalizeToolStatus` import/usage; replaced `toolStatus` refs with `tool.status` and `canPublishOrSync`; added "Sync repository" label for published status |
| `src/pages/registers/assessment-tools/index.tsx` | Kept `normalizeToolStatus` import; added `buildAssessmentToolSaveData` + `resolveLiveDetailTool` imports; replaced `handleSave` guard; added `liveDetailTool` live resolution; updated JSX |
| `src/hooks/useAssessmentToolRegister.ts` | `updateCachedTool` helper; removed phantom `tenant_id` filter; cache updates on update/submit/approve/publish/newVersion mutations |
| `src/pages/registers/assessment-tools/assessmentToolPageLogic.ts` (new) | `buildAssessmentToolSaveData` (lifecycle lock) + `resolveLiveDetailTool` |
| `tests/assessment-tools/assessmentToolPageLogic.test.ts` (new) | 5 unit tests |

**Merge commit:** `3240501d1` (merge of origin/main into PR branch — conflict resolution)

---

## Remaining PRs (not reviewed — workflow interrupted)

| PR | Branch | Status |
|---|---|---|
| #41 | cursor/critical-bug-investigation-25dd | MERGED AND DELETED ✓ — 17 June 2026 |
| #36 | cursor/agenda-report-summaries-8c64 | MERGED AND DELETED ✓ — 17 June 2026 |
| #35 | cursor/past-meeting-editing-8c64 | MERGED AND DELETED ✓ — 17 June 2026 |
| #34 | cursor/governance-agenda-status-filters-ac7f | MERGED ✓ |
| #33 | cursor/calendar-tenant-filter-ac7f | MERGED ✓ |
| #32 | cursor/bulk-edit-rto-division-6e6d | MERGED AND DELETED ✓ — 17 June 2026 |
| #31 | cursor/critical-bug-investigation-0409 | MERGED ✓ |
| #30 | cursor/critical-bug-investigation-b5a0 | MERGED ✓ |
| #29 | feat/tas-consultation-overlays | REQUEST CHANGES — escalate to Carl (migration re-timestamp) |
| #28 | fix/deploy-unblock | MERGED ✓ (13 June 2026, pre-session) |
| #27 | fix/billing-pricing-display | MERGED ✓ (13 June 2026, pre-session) |
| #26 | rescue/pending-work-20260613 | Not reviewed — needs Carl + Angela sign-off |
| #25 | cursor/critical-bug-investigation-b5c7 | MERGED AND DELETED ✓ — 17 June 2026 |
| #24 | cursor/critical-bug-investigation-3dff | Not reviewed |
| #22 | cursor/critical-bug-investigation-f04e | MERGED AND DELETED ✓ — 18 June 2026 |
| #21 | cursor/critical-bug-investigation-fef7 | Not reviewed |
| #20 | cursor/critical-bug-investigation-ff3a | MERGED AND DELETED ✓ — 19 June 2026 |
| #19 | cursor/critical-bug-investigation-7690 | Not reviewed |
| #18 | cursor/critical-bug-investigation-2bd6 | Not reviewed |
| #16 | cursor/critical-bug-investigation-29c4 | Not reviewed |

## Key finding from this run
`rto-compass-hub/CLAUDE.md` does not exist on disk. This file is referenced throughout workspace config as Carl's authoritative code rules. It is either missing, not yet created, or named differently. Needs investigation before the next run.
