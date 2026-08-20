# SSO Monthly Report — support ticket investigation (living doc)

> Source of truth for this body of work. Work through open items one at a time. Once every item is
> locked, a brand-new chat with no prior context should be able to read this file cold and go straight
> to implementation. Delete this file once implementation is complete and Brian has a separate audit
> file (per CLAUDE.md § Living-doc workflow).

**Started:** 14 Aug 2026
**Status:** Fix written on branch `fix/user-role-checkbox-not-activating` (17 Aug 2026).
Migration `20260817043644_fix_sso_monthly_report_rls_and_submitted_status.sql` addresses both root
causes. Not yet committed, pushed, or applied to production.

## Locked decisions (17 Aug 2026)

1. **Fix both root causes together** in one migration on the same branch as the role-checkbox fix.
2. **Target `sso_monthly_reports`** (not `sso_monthly_packs` or `_zz_deprecated_sso_monthly_reports`) —
   confirmed as the active submission table; `sso_monthly_packs` is a parallel flow, out of scope.
3. **RLS fix:** idempotent `DROP POLICY IF EXISTS` + recreate `gov_meetings_select_tenant_read`
   with `Student Support Officer` (mirrors never-applied `20260711110300` policy tail).
4. **RPC fix:** reinstall `submit_sso_monthly_report_full` from live body (`20260811201000`) with
   `status = 'submitted'` and `submitted_at = now()` on INSERT. No role-gate widening from
   `20260805023000` (not live, separate PR if needed).
5. **Governance status wiring:** extend `get_sso_report_status` to also recognise submitted
   `sso_monthly_packs` for the meeting's reporting month (fixes Australian College "Pending" badge).
6. **No backfill** of the 3 QA draft/pending rows — forward fix only.

## Not yet decided / next steps

Support ticket from `hasitha@australiancollege.edu.au` (Administrator, worktree A tenant "Australian
College", `tenant_id = 91ffcbdc-c932-4b4c-b0e0-8a208a27abb4`):

> "This is to inform you that our student support team is yet to receive the Monthly report. Can you
> please let me know once this is sent."

## What was ruled out first

ComplyHub has two unrelated features both called "Monthly Report":

1. **Trainer Monthly Report** (`trainer_monthly_reports` table) — submitted by trainers, reviewed by
   Admin/Compliance Manager. Working normally for this tenant: 16 submitted, most recent 14 Aug 2026.
   Not the cause of this ticket.
2. **SSO Monthly Report** (`sso_monthly_reports` table) — submitted by the tenant's own Student Support
   Officer(s), tied to a governance meeting. **This is the one that's broken** — see below.

Brian's steer (14 Aug 2026): check both, but suspected SSO given it "isn't even fully working or even
created" — confirmed correct.

## Root cause #1 — RLS gap blocks SSO from ever seeing a meeting to report against (CONFIRMED)

- Migration `20260711110300_harden_sso_monthly_report_submission.sql` (11 Jul 2026) was written to add
  `'Student Support Officer'` to the RESTRICTIVE RLS policy `gov_meetings_select_tenant_read` on
  `governance_meetings`. It is in git, merged to `main`.
- **Confirmed via live query against `supabase_migrations.schema_migrations`: this migration was never
  applied to production.** (`select version, name from supabase_migrations.schema_migrations where
  version = '20260711110300'` → zero rows.)
- **Confirmed via live `pg_policies` query:** the actual production policy on `governance_meetings`
  (`gov_meetings_select_tenant_read`, RESTRICTIVE, SELECT) only allows `Administrator`, `Compliance
  Manager`, `Governing Person`, `Regulatory Officer`, `Trainer/Assessor` — **`Student Support Officer`
  is missing.** This matches `00000000000000_baseline.sql` exactly, confirming nothing later ever
  patched it either.
- RLS silently returns zero rows rather than erroring. The SSO Monthly Report form's Step 1 ("Select
  Meeting Period") sources its dropdown from exactly this table via `useSsoMeetings` hook
  (`src/hooks/sso/useSsoMeetings.ts`) — so for any Student Support Officer, that dropdown is always
  empty. They cannot get past step 1 of the submission wizard.
- **Confirmed platform-wide, not tenant-specific:** only 3 rows exist in `sso_monthly_reports` across
  the entire platform (all tenants), all created 13 Aug 2026 as `pending`/`draft` — clearly QA/test data
  from that day's fresh-eyes review, not real submissions. Zero real Student Support Officers, at any
  tenant, have ever gotten a report to `submitted` status.
- Confirmed the system did try to prompt Australian College's 4 SSO staff (Panchani, Darcey, Videesha,
  Jesica) — all four received 7-day/3-day/1-day reminder emails ahead of the 8 Jul 2026 governance
  meeting (`sso_report_reminders` table, all `delivered_at` populated). They never got anywhere with it
  because of this RLS gap — not because they ignored the reminders.

## Root cause #2 — the submit RPC never marks its own row as submitted (CONFIRMED)

- Even after Root cause #1 is fixed, submission would silently look broken to the SSO user themselves.
- Live production function `submit_sso_monthly_report_full(p_meeting_id uuid, p_reporting_period_start
  date, p_reporting_period_end date, p_payload jsonb)` was pulled directly from `pg_proc` via
  `pg_get_functiondef` (not inferred from a migration file/comment) and confirmed to:
  - Correctly insert into `public.sso_monthly_reports` (the active table, not the deprecated one).
  - Correctly route `ci_items` to `public._zz_deprecated_continuous_improvement` (the one real fix from
    `20260811201000_fix_submit_sso_monthly_report_ofi_uuid.sql`, confirmed applied).
  - **Never set `status = 'submitted'` or `submitted_at = now()` on the INSERT.** The table's `status`
    column defaults to `'draft'`. So a completed submission leaves the row sitting at `status='draft'`,
    `submitted_at=NULL` forever.
- Effect is asymmetric depending on who's looking:
  - **Admin / Compliance Manager / Governing Person** (Live Meeting tab → `SsoReportStatusPanel` →
    `get_sso_report_status` RPC) — looks fine. That RPC's primary path (confirmed live via
    `pg_get_functiondef`) treats *any* matching row in `sso_monthly_reports` as `submitted: true`
    regardless of the row's own `status` column, so this view is accidentally immune to the bug.
  - **The Student Support Officer themselves** (`/dashboard/student-support/reports` →
    `SsoMonthlyReportsList.tsx`, "Submission History" table) — reads `r.status` and `r.submitted_at`
    directly off the row. They would see their own just-submitted report badged `Draft` with a blank
    submitted date, even though they just completed the 3-step wizard including the declaration step.
    This is exactly the kind of thing that makes a user think it failed and either give up or resubmit.

## Also noted, not yet actioned

- `submit_sso_monthly_report_full` has no role check restricting it to Student Support Officer — any
  tenant member could call it for their own tenant's meeting. Looser than intended but not what's
  blocking anyone; not in scope for the immediate fix unless Brian wants it folded in.
- Separately, the "Monthly Report Monitoring" tab (`ReportMonitoringTab.tsx`, tracks Trainer Monthly
  Reports only) is restricted to Administrator/Governing Person/Compliance Manager — Student Support
  Officer has no visibility into it. This is by design (that tab explicitly says SSO reports are tracked
  elsewhere) — not a bug, just noting it was checked.
- There is a separate, newer "SSO Monthly Pack" concept (`sso_monthly_packs` table,
  `save_sso_monthly_pack_draft` / `submit_sso_monthly_pack` RPCs, both added/hardened in
  `20260813120000_harden_sso_and_trainer_rpc_authorization.sql`, confirmed applied) that appears to be a
  parallel/successor flow to the "SSO Monthly Report" (`sso_monthly_reports`) flow described above. Not
  investigated in depth — flagging so the next session doesn't assume `sso_monthly_reports` is the only
  active table for this feature area before checking which flow the product actually wants live.

## Not yet decided / next steps

1. Commit + push branch, open PR, apply migration to production post-merge (interim `execute_sql` +
   `migration repair` procedure).
2. QA as SSO user on Australian College tenant: meeting dropdown populates, submit shows Submitted in
   history.
3. Delete this living doc after merge + audit file (per CLAUDE.md workflow).

## Key files / objects referenced

- `supabase/migrations/20260817043644_fix_sso_monthly_report_rls_and_submitted_status.sql` (new — both fixes)
- `supabase/migrations/20260711110300_harden_sso_monthly_report_submission.sql` (never applied)
- `supabase/migrations/20260811201000_fix_submit_sso_monthly_report_ofi_uuid.sql` (applied)
- `supabase/migrations/20260813120000_harden_sso_and_trainer_rpc_authorization.sql` (applied)
- `supabase/migrations/20260710075046_create_sso_monthly_reports_table.sql` (applied)
- `src/hooks/sso/useSsoMeetings.ts`
- `src/pages/student-support/SsoMonthlyReportForm.tsx`
- `src/hooks/sso/useSubmitSsoMonthlyReport.ts`
- `src/pages/student-support/SsoMonthlyReportsList.tsx`
- `src/components/governance/SsoReportStatusPanel.tsx`
- DB functions: `submit_sso_monthly_report_full(uuid,date,date,jsonb)`, `get_sso_report_status(uuid,date)`
- DB policy: `gov_meetings_select_tenant_read` on `public.governance_meetings`
