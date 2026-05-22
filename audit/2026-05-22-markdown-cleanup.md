> **Archived:** 22 May 2026 · **Event date:** 22 May 2026 · **Type:** Codebase cleanup — dead documentation removed

# Markdown Cleanup — 89 Dead Docs Deleted

**Date:** 22 May 2026
**Developer:** Brian (with Claude Code)
**Branch:** `fix/local-run` on `ComplyHub-ai/rto-compass-hub`
**Commit:** `becd83fc9`
**Purpose:** Remove historical, completed, and one-time markdown files that have no ongoing operational value

---

## Context

As part of tidying up the codebase before the Vercel migration, a full audit of all markdown files was performed. 154 markdown files were found (excluding `node_modules`). These were categorised into three buckets: protected (GitHub/Lovable infrastructure), safe to delete (dead docs), and keep (active runbooks, guidelines, operational docs). 89 files were confirmed as dead and deleted in a single commit on `fix/local-run`. `main` was not touched.

---

## Audit Methodology

1. Listed all `.md` files recursively, excluding `node_modules`
2. Checked whether any `.md` files were imported or referenced in source code, `vite.config.ts`, or `package.json` — **none were**
3. Applied naming-pattern rules to identify dead docs: `_COMPLETE`, `_STATUS`, `_REPORT`, `_SUMMARY`, `_IMPLEMENTATION`, `README_*`, `README-*`, `PHASE_*`, `CHANGELOG-*`, `advisor_reports/**`, `src/fixes/**`
4. Peeked at ambiguous files to verify content before categorising
5. Protected `.github/**` and `.lovable/**` — never touched

---

## Files Deleted (89 total)

### Root level (24 files)
Completed implementation notes, historical phase reports, README variants, and one-time PR checklists.

`AUDIT_IMPLEMENTATION_SUMMARY.md`, `CHANGELOG-support-mode-isolation.md`, `COMPATIBILITY_IMPLEMENTATION.md`, `GOVERNANCE_AI_ENHANCEMENT_COMPLETE.md`, `GOVERNANCE_IMPLEMENTATION.md`, `GOVERNANCE_IMPLEMENTATION_COMPLETE.md`, `IMPLEMENTATION_COMPLETE.md`, `IMPLEMENTATION_STATUS.md`, `PHASE_1_AUDIT_REPORT.md`, `PHASE_3_TESTING_REPORT.md`, `PR_CHECKLIST_final_sweep.md`, `README-SA.md`, `README-TYPES-FIX.md`, `README_AUTH_IMPLEMENTATION.md`, `README_BACKFILL.md`, `README_IMPLEMENTATION.md`, `SECURITY-FIXES.md`, `SECURITY_FIXES_APPLIED.md`, `SECURITY_IMPLEMENTATION_COMPLETE.md`, `SECURITY_IMPLEMENTATION_STATUS.md`, `STYLING_AUDIT_REPORT.md`, `SUPERADMIN_DASHBOARD.md`, `TENANT_MIGRATION_STATUS.md`, `TENANT_REFACTOR_IMPLEMENTATION.md`

### `docs/` (28 files)
Historical status snapshots, audit reports, and completed-work summaries.

`ADVISOR_WARNINGS_REMEDIATION_SUMMARY.md`, `APPROVED_BILLING_COPY.md`, `BILLING_HEALTH_EMAIL.md`, `BILLING_HEALTH_PREVIEW_WORKFLOW.md`, `BILLING_TRANSITION_FAQ.md`, `DEDUPLICATION_SUMMARY.md`, `GOVERNANCE_IMPLEMENTATION_STATUS.md`, `INDEX_DUPLICATES_EXPECTED.md`, `POLICY_CONSOLIDATION_PLAN.md`, `POLICY_EXPECTED.md`, `Q2-D1-Forms-Module-Implementation.md`, `QUICK_START_UX.md`, `REFACTOR_COMPLETE.md`, `REGISTER_FORMS_DEEP_DIVE_PLAN.md`, `REGISTER_STRUCTURE_VALIDATION.md`, `RELEASE_CHECKLIST.md`, `SECURITY_FIXES_COMPLETE.md`, `SECURITY_IMPLEMENTATION_FINAL.md`, `SECURITY_IMPLEMENTATION_STATUS.md`, `Security-Implementation-Status.md`, `TENANTS_AUDIT.md`, `TENANT_TIER_VERIFICATION.md`, `TGA_INTEGRATION_HEALTHCHECK.md`, `TRAINER_COMPLIANCE_CRON_SETUP.md`, `UI_AUDIT_SYSTEM.md`, `UX_AUDIT_COMPLETE.md`, `UX_MIGRATION_STATUS.md`, `audits/UAT-AUDIT-REPORT-2025-12-15.md`, `demo-data-removal-report.md`, `evidence-signals-consistency-check.md`, `function-audit.md`, `notes/trial-migration.md`, `organization-members-migration-plan.md`, `qa/TrialsPage.md`, `reports/superadmin_systems_check.md`, `search-path-remediation-report.md`, `superadmin-dashboard-validation.md`

### `src/` (9 files)
Audit reports, historical changelogs, one-time checklists, and completed fix summaries.

`AUDIT_COMPLETION_REPORT.md`, `docs/CHANGELOG_DEC2025_JAN2026.md`, `docs/SECURITY_AUDIT_JAN2026.md`, `docs/SECURITY_RELEASE_CHECKLIST.md`, `docs/TRIAL_TENANT_TEST_CHECKLIST.md`, `fixes/tenant_autoheal_complete.md`, `fixes/tenant_autoheal_completion_status.md`, `fixes/tenant_autoheal_final_status.md`, `fixes/tenant_autoheal_summary.md`, `routes/calendar-redirects.md`

### `supabase/` (14 files)
All Supabase advisor run reports — index sweep before/after snapshots, RLS analysis, column compatibility checks. All historical; the resulting migrations are already applied.

`advisor_reports/2025-01-22/final_sweep/FINAL_AUDIT_SUMMARY.md`, `advisor_reports/2025-01-22/index_sweep/SUMMARY_AFTER_PLANNED.md`, `advisor_reports/2025-01-22/index_sweep/SUMMARY_BEFORE.md`, `advisor_reports/2025-08-22-analysis.md`, `advisor_reports/2025-08-22-column-compatibility.md`, `advisor_reports/2025-08-22-column-final.md`, `advisor_reports/2025-08-22-phase1-complete.md`, `advisor_reports/2025-08-22-rls-recursion-fix.md`, `advisor_reports/2025-08-22/FINAL_COUNTS.md`, `advisor_reports/2025-08-22/index_sweep_run/EXECUTION_SUMMARY.md`, `advisor_reports/2025-08-22/index_sweep_run/FINAL_SUMMARY.md`, `advisor_reports/2025-08-22/index_sweep_run/SUMMARY_AFTER_RUN.md`, `advisor_reports/2025-08-22/index_sweep_run/verify_before_after/EXPLAIN_samples.md`, `final_cleanup_status.md`

### `reports/`, `scripts/`, `tests/` (4 files)
`reports/tenant_sweep_PR.md`, `reports/tenant_table_mapping.md`, `scripts/tenant-alignment-status.md`, `tests/COMPLETION_SUMMARY.md`

---

## What Was Kept

44 files with active operational value were retained, including:

- Active runbooks: `docs/PRODUCTION_ROLLOUT_RUNBOOK.md`, `docs/COMPLETE_RESET_GUIDE.md`, `docs/runbooks/**`
- Developer guidelines: `docs/REGISTER_CUSTOM_ID_GUIDELINES.md`, `docs/PREVIEW_GUARDRAILS.md`, `docs/UX_CONSISTENCY_GUIDE.md`
- Setup guides: `MAILGUN_SETUP_GUIDE.md`, `docs/MAILGUN_INBOUND_SETUP.md`
- Active policies: `docs/policies/feature-flag-governance.md`, `docs/CANONICAL_BILLING_PRINCIPLE.md`
- Compliance docs: `docs/compliance-audit/**`
- Security reference: `docs/security/**`, `docs/security-hardening-implementation.md`
- Style guide: `British-English-Conventions.md`
- Standard templates: `STANDARD_FORM_TEMPLATE.md`, `docs/STANDARD_FORM_TEMPLATE.md`
- All subdirectory `README.md` files (scripts/, tests/, supabase/functions/)

---

## Impact on Build

Zero. No markdown file was imported or referenced in any TypeScript, JavaScript, or config file. Deleting them has no effect on `npm install`, `npm run dev`, or `npm run build`.

---

## Environment

| Field | Value |
|---|---|
| Branch | `fix/local-run` |
| Commit | `becd83fc9` |
| Files deleted | 89 |
| Lines removed | 13,619 |
| Build impact | None |
