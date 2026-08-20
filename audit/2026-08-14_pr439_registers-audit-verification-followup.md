# Audit - PR #439: Registers audit verification follow-up

> **Date:** 14 August 2026
> **Scope:** Registers audit verification follow-up after PR #436, governance classification, custom-ID ownership, governance meeting AI output handling, security grants, and production migration reconciliation
> **Project:** `gdwhlstfguxarnxasrrs`
> **Branch:** `fix/registers-audit-verification-followup`
> **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/439
> **Merge commit:** `9657c0e5f`
> **Merged:** 14 August 2026

---

## Summary

PR #439 completed the remaining implementation work identified in `registers-audit-verification.md` after PR #436. The work covered the approved Plans A, B, D, E, and F items. Plan C was intentionally discarded per the product decision and was not changed.

The branch was reviewed twice by fresh-eyes and then by Cursor Bugbot. Findings from those reviews were investigated against the live Supabase schema and resolved before merge where they affected this work.

The production migrations were applied after merge using the documented interim procedure: execute the SQL directly through Supabase MCP, verify the live state, then repair the exact migration versions in the migration ledger from worktree B.

---

## Decisions recorded

- **Plan A:** Use Claude for governance classification and base classification guidance on the Standards for Registered Training Organisations (RTOs) 2025.
- **Plan B:** Revoke unauthenticated access to `switch_to_consultant_home` while retaining authenticated and service-role access.
- **Plan C:** No implementation. The existing Plan C issue was investigated and discarded as directed.
- **Plan D:** Remove client-side custom-ID ownership and use server-side, collision-safe register triggers.
- **Plan E:** Remove duplicate client-generated IDs, enable Register Insights, and align it with the live governance register table.
- **Plan F:** Implement the safe register-insight and reliability fixes, but do not perform destructive drops of deprecated objects.

---

## Implementation shipped

### Governance classification

- Replaced the old OpenAI/2015 classifier path with Claude.
- Updated the prompt to reference the 2025 RTO standards.
- Aligned classifier register values with the live `dd_governance_type` slugs, including `complaints_appeals`, `audit_internal_review`, and `continuous_improvement`.
- Added register labels for user-facing display.
- Added validation for register type, risk level, confidence, and standards.
- Rejected superseded 2015 standard references and retained valid 2025 or numbered standard references.
- Added a local fallback when Claude returns invalid JSON or incomplete classification data.
- Changed provider and parsing failures to return explicit unsuccessful responses rather than false success responses.

### Governance action form and modal

- Added Critical severity support to the shared governance action type and selector.
- Prevented the UI from showing "AI Classification Complete" when the edge function reports failure.
- Replaced raw console error calls with the application logger.
- Removed client-side `custom_id` generation from governance inserts.
- Kept governance inserts on the live `gov_register` table and removed the invalid client-side custom-ID column usage.

### Register Insights

- Enabled the Register Insights feature.
- Corrected the data source from the legacy `governance_register` table to the live `gov_register` table used by the governance modal.
- Added protection against stale tenant responses during tenant switching.
- Added visible error handling so query failures do not appear as legitimate zero counts.

### Governance meeting AI outputs

- Removed the file-level `@ts-nocheck` suppression from `useApplyMeetingAIOutputs`.
- Replaced unsafe single-row meeting reads with optional reads and explicit error handling.
- Recorded failures when minutes, tasks, calendar events, action links, CI entries, or meeting completion updates fail.
- Prevented meetings from being marked completed when any requested write fails.
- Distinguished an expected duplicate CI record from a real CI insert failure.
- Ensured a failed CI insert contributes to the returned error state.

### Security

- Revoked `anon` execution on `public.switch_to_consultant_home()`.
- Revoked `PUBLIC` execution as well, closing the broader grant path.
- Retained execution for `authenticated` and `service_role`.

---

## Database migrations

### PR migrations

| Version | File | Purpose | Production status |
|---|---|---|---|
| `20260814043000` | `revoke_anon_switch_to_consultant_home.sql` | Removes `anon` and `PUBLIC` execution while retaining authenticated and service-role access. | Executed and ledger repaired. |
| `20260814050000` | `register_custom_id_cleanup.sql` | Removes obsolete bespoke ID behavior and preserves server-side register ID ownership and AVR audit behavior. | Executed through a conflict-safe equivalent and ledger repaired. |

The second migration encountered existing production trigger names created by later production work. The conflicting GOV, AVR, and ICR generic triggers were already present, so the production execution retained those triggers, removed the obsolete bespoke paths, and updated the AVR audit function without attempting duplicate trigger creation.

### Migration drift reconciliation

CI identified six unrelated production migrations that had been applied directly to production without matching files on `main`. Their exact version/name pairs and recorded SQL were retrieved from the production migration ledger and added as reconciliation files:

| Version | Reconciliation |
|---|---|
| `20260814061438` | Governance meeting date autofill trigger. |
| `20260814061454` | Wave-two generic custom-ID triggers for GOV, THP, AVR, and ICR. |
| `20260814061511` | Backfill of missing GOV and THP custom IDs. |
| `20260814061547` | Service-role handling for bulk trainer-status recomputation. |
| `20260814061700` | Disablement of the deprecated annual cleanup cron. |
| `20260814061750` | Rescheduling of fixed TGA ingest crons. |

The cron reconciliation files were made branch-safe with existence checks because preview branches do not necessarily contain the production cron jobs.

---

## Production execution and verification

- Target project confirmed as `gdwhlstfguxarnxasrrs` (ComplyHub Project).
- Both PR migration versions were confirmed absent before execution.
- SQL was executed with Supabase MCP `execute_sql`, not `apply_migration` and not `supabase db push`.
- `20260814043000` was applied successfully.
- `20260814050000` was applied using the conflict-safe equivalent described above.
- Worktree B was returned to the merged `origin/main` state at `9657c0e5f` before ledger repair.
- Brian ran:

  ```text
  supabase migration repair --status applied 20260814043000
  supabase migration repair --status applied 20260814050000
  ```

- Ledger verification confirmed:

  ```text
  20260814043000 | revoke_anon_switch_to_consultant_home
  20260814050000 | register_custom_id_cleanup
  ```

- Permission verification confirmed:

  ```text
  anon          = false
  authenticated = true
  service_role  = true
  ```

- Live trigger verification confirmed generic server-side custom-ID triggers for:
  - `gov_register`
  - `avr_register`
  - `industry_consultation_records`
  - `tas_register`

---

## Verification performed

- `git diff --check`
- Scoped ESLint with `--max-warnings=0`
- `npx tsc --incremental --noEmit`
- Changed-source `.single()` scan
- Changed edge-function service-role-key scan
- Migration guards
- Migration drift check, including reconciliation of six newly detected production entries
- Supabase production ledger verification
- Supabase permission verification
- Supabase trigger-state verification
- Cursor Bugbot findings reviewed and resolved
- Fresh-eyes review performed twice before merge

---

## Follow-up

- The broader historical Supabase migration drift remains a separate reconciliation project; it was not silently repaired as part of this PR.
- The `classify-governance-action` edge function must be deployed separately if it has not already been deployed by the edge-function deployment workflow.
- The deployed function must have `ANTHROPIC_API_KEY` configured before users rely on Claude classification.
- The migration ledger and live database are now aligned for the two PR migrations.
