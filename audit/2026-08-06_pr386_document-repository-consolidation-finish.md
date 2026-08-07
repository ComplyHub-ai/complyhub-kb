# Audit — PR #386

> **Date:** 6 August 2026 (audit written); **Merged:** 6 August 2026
> **Scope:** Document Repository Consolidation — finish line (Wave 1 repoint, decommission, soak monitor, TAS fixes)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Final consolidation PR. Repointed remaining legacy bucket literals across frontend and edge functions (Wave 1), decommissioned `organization-logos`, built and deployed the storage soak monitor (nightly cron + SQL RPCs), fixed TAS Builder issues found during the same branch, and addressed fresh-eyes/CI findings before merge.

## PR #386 — Finish consolidation — legacy bucket repoint, soak monitor, TAS fixes

**Branch:** `feat/storage-consolidation-finish` (deleted post-merge) · **Merge commit:** `6365a4e16` · **Merged:** 6 Aug 2026 · **Files:** 57

### Wave 1 — legacy literal repoint

Repointed callers off legacy bucket names (`tenant_docs`, `evidence`, `evidence-trainers`, `evidence-files`, `register-evidence`, etc.) to canonical `tenant-documents` paths and existing helpers (`document-file-manager`, `uploadRegisterEvidence`, `storageDownload`).

### Upload path RLS fixes

ADC/CAA/register uploads now use `{tenantId}/...` prefix: `useADCSubmission.ts`, `useCAASubmission.ts`, `ADCSubmittedReport.tsx`, `register-service.ts`, `AlignedRegisterService.ts`. WHS stores durable `bucket` + `path` instead of 1-hour signed URL.

### Wave 2 — `organization-logos` decommission

Migration `20260806120700` — 4 orphan objects, zero code refs. Bucket deleted from production.

### Wave 3 — soak monitor

- `20260806120800` — `storage_soak_buckets` table + `run_storage_soak_monitor()` RPC
- `20260806120900` — seed 21 source buckets
- `20260806121000` — pg_cron `storage-soak-monitor-daily` at `0 3 * * *`
- Edge function `storage-soak-monitor` deployed (optional HTTP trigger)
- **Cron fix:** migration's `app.settings.env = 'production'` guard fails on hosted Supabase (`ALTER DATABASE SET` permission denied). Brian rescheduled cron directly: `SELECT public.run_storage_soak_monitor();` (job id 50).

### TAS Builder fixes

- Clause-risk mapping toasts read live RPC keys
- Market research pack resilient JSON parse + retry
- `20260806121100` — reactivated 50 OS/CR/CP compliance clauses (was 0)
- TAS PDF footers on all section pages (`TASExportPDF.tsx`, `LegacyTASExportPDF.tsx`)

### CI / security

`@ts-nocheck` removals, `.maybeSingle()` guards, edge functions allowlisted in `.github/workflows/ci.yml`.

### Production apply (post-merge)

All 5 migrations applied via `execute_sql`. Ledger synced via `migration repair`. Edge functions deployed: `storage-soak-monitor`, `generate-market-research-pack`, `documents-upload`, `documents-delete`, `analyze-documents-batch`, `generate-session-presentation`.

Smoke test: 10 buckets checked, 1 pre-migration violation in legacy `documents` (expected), 0 new alerts.

### Soak status

All 21 watched buckets now have active soak timers (11 started this session for PR #384 buckets). Earliest completions ~17–18 Aug; latest ~20 Aug 2026.

### Still open (Wave 2)

Full raw-`tenant-documents` helper rewrite. Source bucket object deletion after soak + explicit approval. Non-SuperAdmin branding QA.
