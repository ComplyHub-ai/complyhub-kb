# Audit — PR #153 → #203: Governance Meeting Fixes, Live Reminder Outage Found AND Fixed, Schema-Cache Incident, Migration Drift Reconciliation, Mailgun Link/Branding Fix (14–15 July 2026)

**Date:** 14–15 July 2026
**Branches:** `feat/auto-mark-sso-reports-before-close` (#153), `fix/gov-update-meeting-time-role-check` (#198), `fix/trainer-reminder-role-check-outage` (#199), `fix/email-outbox-worker-schema-cache-bypass` (#200), `fix/reconcile-migration-drift-11-files` (#201), `fix/mailgun-broken-links-and-branding` (#203)
**PRs:** [#153](https://github.com/ComplyHub-ai/rto-compass-hub/pull/153), [#198](https://github.com/ComplyHub-ai/rto-compass-hub/pull/198), [#199](https://github.com/ComplyHub-ai/rto-compass-hub/pull/199), [#200](https://github.com/ComplyHub-ai/rto-compass-hub/pull/200), [#201](https://github.com/ComplyHub-ai/rto-compass-hub/pull/201), [#203](https://github.com/ComplyHub-ai/rto-compass-hub/pull/203)
**Merged by:** Brian (Khian)
**Merge commits:** `3a27a8b8` (#153), `e673c024` (#198), `99242d3b9` (#199), `2926a42b5` (#200), `4a0fea546` (#201), `f55b8997a` (#203)
**Purpose:** Full record of the governance-meeting/trainer-reminder work across this session — what shipped in PR #153, every Bugbot round fixed on it, the post-merge QA pass against Vivacity Testing Tenant, two more bugs found and shipped in PR #198, then a live ~3-week production email outage discovered while testing real delivery — **found, root-caused, fixed, and verified end-to-end in PR #199 through #203**, including two further incidents uncovered only because that verification was pushed all the way to a real inbox instead of stopping at "the query returns rows."

---

## PR #153 — what shipped

Grew across the session from a narrow SSO auto-mark fix into a broad governance-meeting/trainer-reminder cleanup. Final scope:

### 1. SSO auto-mark + real close errors
`executeEndMeeting` (`LiveMeetingTab.tsx`) and `MeetingStatusManager.tsx` both call `auto_mark_trainer_reports_reviewed` and `auto_mark_sso_reports_reviewed` before `governance_meeting_end`. `MeetingStatusManager.tsx` now surfaces the real close-blocking reason (`trainer_reports_not_reviewed`, `sso_reports_not_reviewed`, etc.) instead of a generic error.

### 2. Retired dead duplicate reminder system
- Deleted `meeting-reports-generator` and `monthly-report-reminders` edge functions — confirmed dead (role-string mismatch: filtered for literal `'Trainer'`, no real member is ever stored that way; real trainers are `'Trainer/Assessor'`. Also called `create_notification()` with wrong parameter names).
- Repointed `useTrainerComplianceInbox.ts` and `useMonthlyReportOverview.ts` off the dead, never-populated `monthly_reporting_records` table onto the real `trainer_monthly_reports` / `sso_monthly_reports` tables.
- Added `notify_meeting_scheduled()` — replaces the one useful behaviour from the dead system (notify trainers/SSOs the moment a meeting is scheduled).
- Deleted 5 additional unreachable files found via blast-radius check.

### 3. Fixed `email-outbox-worker` 500s
`email_status` enum was missing `'processing'`, the value the claim logic already tried to use — every batch-claim attempt threw an enum-violation error.

### 4. Real email delivery for trainer report reminders
`process_trainer_report_reminders()` now also queues a real Mailgun email (via `email_outbox`) alongside the in-app notification it already sent, guarded by the same idempotency slot plus its own `idempotency_key`. New `trainer_report_reminder_v1` branch in `send-mailgun-email`, copy varying by 7/3/1 days remaining.

### 5. Governance meeting time persistence + gated edit + audit trail
- Neither `gov_schedule_meeting()` nor `generate_governance_meetings_12()` ever persisted the time a user picked — only the bare date — so every meeting displayed as a JS UTC-midnight artefact (10/11am Sydney time) regardless of what time was chosen. Both fixed to persist `starts_at`/`ends_at`/`scheduled_at`.
- New `gov_update_meeting_time()` RPC to correct an existing meeting's time — restricted server-side to Consultant/Governing Person only, mandatory reason.
- Reason + before/after time written to `governance_meeting_audit_log`, surfaced via `MeetingAuditLog.tsx`.
- New `EditMeetingTimeDialog.tsx` component, edit-time pencil wired into `NextMeetingHeader.tsx`.

### 6. CI fixes required to get #153 green
- Removed stale `@ts-nocheck` from 5 files this PR touched (all 5 type-checked clean underneath it — no real errors were hiding).
- Fixed a `let`-never-reassigned lint error, a React Compiler memoization mismatch.
- Fixed a real bug in `.github/workflows/ci.yml`'s service-role-key check: `grep -n` only adds the filename prefix when scanning 2+ files, so the `ALLOWED` regex exclusion silently failed to match whenever a PR touched exactly one edge function. Added `-H`.
- Allow-listed `send-mailgun-email` and `email-outbox-worker` for legitimate service-role use (both explained in the workflow file's own comments, including an honestly-flagged **separate, pre-existing gap**: `send-mailgun-email`'s admin auth-link branches accept an arbitrary email/userId with no check that the caller owns that account — not fixed, flagged for a dedicated security look).

---

## PR #153 — Bugbot rounds (all fixed)

| # | Finding | Fix |
|---|---|---|
| 1 | Wrong meeting id passed to `notify_meeting_scheduled` | `gov_schedule_meeting` returns the full row, not a uuid — `p_meeting_id: data` → `data?.id`. |
| 2 | Broken notification deep links | `/trainer/monthly-reports` → `/dashboard/trainer/monthly-reports`; SSO link → `/dashboard/student-support/reports/monthly` (confirmed via self-referential `navigate()` calls in the real pages). |
| 3 | Edit dialog stale form values on reopen | `react-hook-form` only applies `defaultValues` on first mount — added a `useEffect` resetting on `open`/`currentStartsAt`/`currentEndsAt` change. |
| 4 | SSO notify link ignores roles | `notify_meeting_scheduled`'s action_url picked from `tm.role` only, missing SSOs whose role lives only in the `roles` array. |
| 5 | Overview counts only report rows | `trainerTotal`/`ssoTotal` counted only existing report rows, undercounting anyone who hadn't started. Fixed to count active `Trainer/Assessor`/SSO `tenant_members` as the true total. |
| 6 | Overview/inbox ignored committed reports | `status === 'submitted'` missed `reviewed`/`approved`/`committed` (trainer) and `tabled`/`archived` (SSO) — confirmed via the real `CHECK` constraints. First pass used a `!== 'draft'` deny-list. |
| 7 | **Pending reports counted as submitted (High)** | The deny-list from #6 also caught the hook's own synthetic `'not_started'` placeholder (assigned to members with no report row), counting them as done. Fixed by switching to an explicit `DONE_STATUSES` allow-list. |
| 8 | Reminders skip draft reports | `process_trainer_report_reminders()` skipped anyone with *any* `trainer_monthly_reports` row, including an unsubmitted draft. Added `AND tmr.status <> 'draft'`. |
| 9 | Meeting edit uses local timezone | `EditMeetingTimeDialog` built times via bare `new Date(...)`, using the browser's local zone. Switched to `luxon`, explicit `Australia/Sydney` both reading and writing. |
| 10 | Trainer auto-mark blocks meeting close | Both `MeetingStatusManager.tsx` and `LiveMeetingTab.tsx` re-threw on `auto_mark_trainer_reports_reviewed` failure, aborting the whole close before `governance_meeting_end()` ran — while the SSO auto-mark right next to it was already non-blocking. Made both consistent (log + continue). |
| 11 | Queued emails can stay `processing` forever | Fixing the enum unblocked the claim step, but the worker's candidate query only ever looked for `status = 'queued'` — a crashed claim orphaned a row forever. Added `claimed_at` + a 10-minute stale-reclaim window. |

**Self-review habit established mid-session:** three of these (5/6/7, 4, 9) shared the same root pattern — a narrow assumption checked instead of the real domain model (status vocab, `role` vs `roles` array, implicit browser timezone). Saved as a standing memory (`feedback_pre_push_self_review.md`) to check all three before every future push on this repo.

---

## Post-merge QA (Vivacity Testing Tenant) — 2 bugs found, fixed in PR #198

Set up test roles first: `vivacity.manager@gmail.com` → Consultant, `rjdb.prsnl@gmail.com` → Student Support Officer (direct `tenant_members` update, verified byte-exact string match, no stale JWT/session issue).

### Bug 1 — `gov_update_meeting_time` role check only looked at the single `role` column
`rjdbadua.works@outlook.com` has Governing Person **only in the `roles` array**, not the primary `role` column. The frontend pencil correctly checks both and showed it; the RPC used `_assert_tenant_access(v_tenant_id, ARRAY['Consultant','Governing Person'])`, which only checks `tm.role` — so the save failed with "Access denied" every time. Fixed: base auth check via `_assert_tenant_access(v_tenant_id)` (no role arg), then an explicit check considering both `role` and `roles`, matching the pattern already correct elsewhere in this same feature.

### Bug 2 — SSO login landed on admin dashboard, then got blocked
Not caused by anything in #153/#198 — a pre-existing gap. `getLandingPath()` (`src/config/landingRoutes.ts`) had no case for `'Student Support Officer'`, falling through to the `default` branch (`/dashboard/admin`, chosen only to avoid a redirect loop). Landing there as a non-Administrator got correctly rejected by the admin-only guard, bouncing to `/access-denied`. Added the missing case → `/dashboard/student-support`.

### Bug 3 (found blocking the PR itself, unrelated to either bug above) — migration ordering broke every branch DB build
Supabase Preview failed with `relation "public.sso_monthly_reports" does not exist`. Root cause: `20260713100000_gap_fill_sso_monthly_reports_and_tas_assessment_mapping_schema_drift.sql` (13 July) creates the table, but three 12 July migrations (`20260712011734`, `20260712012414`, `20260712014730`) alter/reference it and its trigger function — one already had a comment documenting the dependency. Replaying migrations in strict filename order hit the 12 July files before the table existed.

Verified safe to retimestamp: production's `schema_migrations` has **zero record** of version `20260713100000` — this file was never applied as a tracked migration (it only gap-fills schema that already existed in production from untracked Lovable-era drift; its statements are idempotent no-ops against live prod either way). The three dependent 12 July files ARE tied to real production ledger rows by exact version+name and were **not touched**. Renamed only the gap-fill file → `20260711000000` (the one open slot before all three dependents, confirmed via full migration listing).

Merged PR #198. Post-merge: applied both new migrations (`gov_update_meeting_time` fix, retimestamped gap-fill) to production via MCP `apply_migration`; verified live (function body confirmed updated, both tables confirmed to exist). Ledger recorded them under auto-generated version numbers rather than the filenames' embedded timestamps (a cosmetic quirk of the MCP tool vs. `supabase db push`) — confirmed this doesn't create new drift, since the drift-check matches by `name` too and the names match exactly.

---

## PR #199 — the ~3-week reminder outage: root-caused AND fixed

Attempting to manually trigger `process_trainer_report_reminders()` to test real Mailgun delivery (moved a test meeting's date temporarily to 7 days out, then invoked the function directly) returned **0 reminders sent**, unexpectedly.

**Root cause confirmed:** the function's query joined `tenant_members` with an additional condition, `sec.has_tenant_role(gm.tenant_id, ARRAY['Trainer/Assessor'])`. That helper checks whether **the current calling session's own user** (`auth.uid()`) holds the given role in the tenant — not the per-row trainer being iterated in the loop. In any non-interactive invocation (cron, service-role edge function call, or direct SQL) there is no "current user," so `auth.uid()` is null and this condition was always false — silently zeroing the entire query, every time, regardless of the separate, correct `tm.role`/`tm.roles` check already present in the same `WHERE` clause.

**Confirmed via data, not just code reading:** `trainer_report_reminders` had exactly **10 rows total, all dated 23–25 June 2026, zero since** — a complete, silent outage of the real trainer-reminder feature for roughly **3 weeks up to 14 July**.

**Fix shipped:** removed the broken `sec.has_tenant_role(...)` JOIN condition; the direct `tm.role`/`tm.roles` check in the same query already does the correct job on its own. Migration `20260714040602` region — actually recorded as `20260714063038` (see PR #201 below for why). Applied to production, then verified by literally running the function against real production data: it correctly matched real rows, including a genuine, currently-due reminder for a real customer (**HPA Training Pty Ltd**, trainer `kaiden@hpatraining.com.au`) — which then actually queued and (once PR #200 also landed) sent for real. This is expected, correct behaviour, not a side effect: that reminder had been silently owed to a real customer for weeks.

---

## PR #200 — a second, independent incident found only because verification didn't stop at "the query returns rows"

After PR #199's fix, `email_outbox` rows were created correctly, but manually re-checking whether they actually *sent* (rather than assuming success) turned up a second, unrelated, pre-existing bug: **the entire platform's outgoing email had been silently broken on every single one-minute cron tick** — not just trainer reminders, every email type. `email-outbox-worker` was returning HTTP 500 on every invocation.

**Root cause:** `claimed_at` (a column added earlier this session, PR #153, to support stale-claim reclaim) was never picked up by PostgREST's schema cache. Every claim attempt failed with `column email_outbox.claimed_at does not exist`, even though the column genuinely existed (confirmed directly against `information_schema`). Two manual `NOTIFY pgrst, 'reload schema'` attempts and several minutes of waiting did not clear it; a diagnostic (create a brand-new throwaway function, confirm PostgREST picks it up instantly) proved the cache wasn't stuck wholesale — it had specifically missed this one column update and stayed stuck on it indefinitely.

**Fix shipped:** moved the "claim a batch of queued emails" step into a new `SECURITY DEFINER` SQL function, `claim_email_outbox_batch()`. Its body runs as plain SQL directly against the live table, so it's never validated against PostgREST's cached column list — immune to this class of staleness regardless of cache state. Also upgraded the claim to real row locking (`FOR UPDATE SKIP LOCKED`) instead of the previous app-level re-match-filter approach. `email-outbox-worker/index.ts` now calls this via `supabase.rpc(...)` instead of a raw table update.

**Verified end-to-end:** confirmed via the real, CI-deployed edge function (not just a direct SQL call) that previously-stuck queued emails — including the trainer-reminder test email — actually reached `sent` status with real Mailgun send timestamps. One real side effect caught and cleaned up: an early direct-SQL test of the new claim function claimed 21 real production rows (various real customer trainers) without sending them; all 21 were reverted back to `queued` before the actual fix deployed, so nothing was lost or double-processed.

**Follow-up not yet done:** the root mechanical cause of the *next* incident (PR #201) is that the `apply_migration` MCP tool used to apply this and other migrations mis-stamps its own invocation timestamp as the migration version, ignoring the filename's embedded version. This should be addressed separately — likely by switching to the Supabase CLI (`supabase db push`) for production applies — so future migrations don't create the same drift on first application.

---

## PR #201 — migration drift reconciliation (11 files)

Discovered while doing the routine "did production actually record what we think it recorded" check after PR #200 merged: **every single migration applied via `apply_migration` this session** (11 files, spanning PR #153 through #200) was recorded in production's `schema_migrations` ledger under a different version than its git filename — exactly the drift class `supabase/migrations/CLAUDE.md` already documents a reconciliation procedure for.

**Fix shipped:** queried each affected migration's real `(version, name)` directly from `supabase_migrations.schema_migrations`, then renamed all 11 git files to `<production version>_<production name>.sql` to match exactly. Every change was a pure rename — content byte-for-byte unchanged (confirmed via `git diff --stat`: 0 insertions, 0 deletions across all 11). Includes reconciling the SSO/TAS gap-fill migration a *second* time: it had been renamed once earlier this session based on production showing no ledger record at that time, but had since actually been applied (via the same mis-stamping tool) and by the time of this check had a real, differently-versioned record.

**Process note:** this rename was initially attempted directly on `main` — caught by the session's own safety tooling before any damage, since edits to `rto-compass-hub` on `main` are supposed to go through a branch. Corrected before proceeding.

---

## PR #203 — Mailgun broken links + bland branding, found during the final real-inbox check

The actual final step of verifying #199/#200 — checking the real inbox the reminder email landed in — surfaced two more, smaller, real bugs that no amount of database-side testing would have caught:

**Bug 1 — broken CTA link.** The "Submit now" button in the reminder email led to `DNS_PROBE_FINISHED_NXDOMAIN` on click. Root cause: Mailgun's click-tracking feature rewrites every link in an email through its own tracking subdomain (`email.rto.complyhub.ai`) before redirecting to the real destination — and that subdomain was never set up in DNS. One branch in `send-mailgun-email/index.ts` already had the correct guard (`o:tracking-clicks: 'no'`) to disable this; the two newer branches (`trainer_report_reminder_v1`, added this session, and the pre-existing `portfolio_request_v1`) were both missing it. Fixed by adding the same guard to both, so links go straight to `rto.complyhub.ai` instead of through the broken tracking redirect.

**Bug 2 — bland formatting, not on-brand.** The reminder email used plain Arial and a single flat purple heading — no gradient, no brand accent colours, no tagline. Touched up both templates (`trainer_report_reminder_v1` and `portfolio_request_v1` for consistency) with a Purple→Fuchsia gradient header band (with a solid-colour fallback for clients like Outlook that ignore CSS gradients), the Calibri body-font stack, Light Purple accent panel for the meeting-date callout, and the "We make Compliance Simple!" tagline in the footer.

**Verified:** sent a real, direct test email post-merge; confirmed by eye — gradient header renders, button links correctly to the real dashboard page.

---

## Test-data cleanup — done

Governance meeting `058a2517-e182-4a56-b9ad-4c55ceec85cd` ("Governance Meeting - 05 Oct 2026") in Vivacity Testing Tenant was moved twice during this session's manual email-trigger tests (once for the PR #199 test, again for the PR #200 test) and was found still sitting at the second test date (`2026-07-15`) when writing this update. Reverted to its real date, `2026-10-05`, as part of closing this out.

---

## Outstanding / not yet done

1. **`TrainerPortalMain.tsx` / Compliance Inbox widget** — confirmed orphaned (built 17 Dec 2025, accidentally dropped from routing during a 19 Feb 2026 refactor that left behind a comment promising to relocate it, never followed through). Not fixed — flagged as a product question (revive vs. delete), not touched this session.
2. **`send-mailgun-email`'s admin auth-link branches** (reset_password_v1, magic_link_login_v1, accept_invite_v1, etc.) — flagged during CI allow-list work as a likely account-takeover-adjacent gap (no check that the calling user owns the target email/userId, only that they're logged in as *someone*). Not fixed, not this PR's scope — worth a dedicated security look, possibly overlapping Carl's audit work.
3. **`apply_migration` MCP tool mis-stamps migration versions** — root mechanical cause of the PR #201 drift. Not fixed at the tooling level; every future migration applied this way will create the same drift on first application unless the team switches to `supabase db push` (or another version-preserving apply method) for production applies.
4. **Migration drift check — broader backlog** — separate, larger, pre-existing backlog (59 migrations pending production apply as of this session's start, 541 orphaned production records) already being worked in PR #196/#197 by a parallel session; unrelated to and not blocking this session's work beyond the specific 11-file drift found and fixed in PR #201.

---

## Files changed

**PR #153** (large — see PR description for full list): `MeetingStatusManager.tsx`, `LiveMeetingTab.tsx`, edge functions deleted (`meeting-reports-generator`, `monthly-report-reminders`) + 5 more dead files, `useTrainerComplianceInbox.ts`, `useMonthlyReportOverview.ts`, `useGovernanceMeetings.ts`, `useGovernanceMeetingAudit.ts`, `useTenantMembership.ts`, `EditMeetingTimeDialog.tsx` (new), `NextMeetingHeader.tsx`, `MeetingAuditLog.tsx`, `send-mailgun-email/index.ts`, `email-outbox-worker/index.ts`, `.github/workflows/ci.yml`, 7 new migrations (`20260714120000`–`20260714170000`).

**PR #198** (3 files): `src/config/landingRoutes.ts`, `src/hooks/useGovernanceMeetings.ts`, 1 new migration (`20260714180000`) + 1 renamed migration (`20260713100000` → `20260711000000`).

**PR #199** (1 file): 1 new migration fixing `process_trainer_report_reminders()`'s broken JOIN condition.

**PR #200** (2 files): new `claim_email_outbox_batch()` migration, `email-outbox-worker/index.ts` updated to call it via RPC.

**PR #201** (11 files, pure renames): all 11 drifted migration filenames reconciled to match production's real ledger `(version, name)`.

**PR #203** (1 file): `send-mailgun-email/index.ts` — `o:tracking-clicks: 'no'` added to `portfolio_request_v1` and `trainer_report_reminder_v1`; both branches' HTML templates restyled to match brand guide (gradient header, brand colours, Calibri stack, tagline).

**Production (direct, via MCP, in addition to normal PR merges):** all migrations from PR #198 through #201 applied and verified live; `claim_email_outbox_batch()` additionally verified by direct invocation against real production rows (21 real rows claimed then correctly reverted to `queued` before the real fix deployed — see PR #200 section above). Test governance meeting `058a2517-e182-4a56-b9ad-4c55ceec85cd` reverted to its real date (`2026-10-05`) after being used twice for manual email-trigger tests.
