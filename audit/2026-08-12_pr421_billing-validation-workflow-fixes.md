# Audit — PR #421

> **Date:** 12 August 2026
> **Scope:** Billing-gate identity handling and Assessment Validation workflow fixes
> **Project:** `gdwhlstfguxarnxasrrs`
> **Merge:** PR #421 merged to `main` as `de0fa4112`

## Summary

PR #421 addressed the cancelled-subscription screen shown to an internal/demo user and two
Assessment Validation usability issues found during pre-testing.

## Fixes shipped

- Corrected the billing-gate profile lookup and legacy Super Admin classification path.
- Added `Pre-testing` to the Validation type dropdown while preserving the existing `pre` value.
- Added Summary editing to the Validation Event drawer.
- Kept the open Validation drawer mounted while save-triggered list refreshes run.
- Applied the shared operational-write permission check so authorised operational roles can edit
  Validation summaries.

## Verification

- TypeScript type-check passed.
- Targeted ESLint passed.
- `git diff --check` passed.
- Edge Function auto-deploy workflow ran successfully for PR #421.

## Follow-up

Production schema verification after merge showed that the live database still uses legacy identity
columns in places where the repository baseline uses canonical columns. This was handled in PR #423.
No SQL migration or data change was included in PR #421.
