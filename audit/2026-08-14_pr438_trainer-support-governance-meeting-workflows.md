# Audit — PR #438

> **Date:** 14 August 2026; **Merged:** 14 August 2026 06:01 UTC
> **Scope:** Trainer Student Support requests, trainer monthly-report evidence uploads, governance live-meeting register links, return-to-meeting navigation, and auto-suggestion risk acceptance
> **Project:** `gdwhlstfguxarnxasrrs`
> **Branch:** `feat/trainer-student-support-request-button` · **Merge commit:** `b65430d17`
> **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/438

---

## Summary

PR #438 delivered the trainer and governance workflow changes requested for the live product. It added trainer-created Student Support requests, monthly-report evidence uploads, register navigation from Governance Meetings, and a reliable return path to the selected live meeting. It also fixed the governance auto-suggestion risk acceptance failure caused by missing required risk fields.

Cursor review findings and fresh-eyes findings were addressed before merge, including tenant-safe request ID generation, selected-meeting preservation, storage cleanup, typed attachment access, and role authorization.

---

## Fixes shipped

### Frontend

- Added trainer Student Support request submission with required validation and tenant-safe custom ID generation.
- Added monthly-report evidence upload controls per report segment.
- Added attachment metadata handling and cleanup when upload persistence fails.
- Added register destination buttons for supported Governance Meeting sections.
- Added Back to Live Meeting navigation with the originating meeting preserved.
- Fixed return navigation so it reopens the meeting the user was reviewing.

### Database — 6 migrations

| Version | File | What it does |
|---|---|---|
| `20260814041438` | `trainer_report_gating_advisory_and_roster_alignment.sql` | Reconciles the production trainer-report gating and roster alignment functions. |
| `20260814041453` | `archive_orphan_tp_trainers_australian_college.sql` | Reconciles two orphaned active trainer rows in the Australian College tenant. |
| `20260814090000` | `allow_trainers_to_raise_ssr_requests.sql` | Allows trainers to insert their own assigned Student Support requests. |
| `20260814100000` | `add_trainer_monthly_report_attachments.sql` | Adds the monthly-report attachment table, indexes, and RLS policies. |
| `20260814110000` | `fix_accept_governance_suggestion_risk_title.sql` | Fixes required risk fields and permits the approved governance roles. |
| `20260814120000` | `allow_trainer_monthly_report_storage.sql` | Adds trainer-scoped policies for the existing private `tenant-documents` bucket. |

The four feature migrations were applied to production through Supabase `execute_sql` after merge, followed by manual ledger repair commands. The two drift-reconciliation migrations were already present in the production ledger under their exact original version/name pairs.

---

## Verification

- Production ledger contains all four feature migration version/name pairs.
- Student Support trainer insert policy exists.
- `trainer_monthly_report_attachments` exists.
- All three trainer monthly-report storage policies exist.
- `accept_governance_suggestion` exists after replacement.
- Worktree A returned to clean `main` at merge commit `b65430d17`.
- Targeted ESLint, TypeScript, migration guards, `.single()` guard, and diff checks passed before merge.

---

## Follow-up

The broader historical Supabase migration drift remains a separate reconciliation project. The interim production procedure used for this PR is documented: apply merged migration SQL directly, verify the live objects, then repair each exact migration version in the ledger from the terminal.
