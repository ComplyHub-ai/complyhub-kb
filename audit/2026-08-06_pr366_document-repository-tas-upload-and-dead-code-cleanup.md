# Audit — PR #366

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — `tenant-documents` upload fallout + dead-code cleanup
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Follow-up to PR #365's PERMISSIVE grant: fixed remaining private-bucket upload bugs (`TASUploadDialog`, `EditDocumentModal`, `useTASExport`). Separately confirmed and removed dead credential-ingestion and bulk-trainer-document-upload code paths — reducing bucket #3/#4 repoint scope.

## PR #366 — Fix tenant-documents upload bugs + remove dead credential-ingestion/settings code

**Branch:** `fix/tas-upload-and-branding-cleanup` (deleted post-merge) · **Merge commit:** `904da2cc6` · **Merged:** 4 Aug 2026 · **Files:** 22

### Bug fixes

- **`TASUploadDialog`** (builder + sandbox): removed broken `getPublicUrl()` against private bucket; stores storage path instead
- **`EditDocumentModal`**: cleans up uploaded file if save fails mid-flow
- **`useTASExport`**: returns `success:false` on real storage error; callers show distinct toast
- **`analyse-trainer-evidence`**: added missing `.eq('status', 'active')` on `tenant_members` lookup
- **Branding save**: `TenantSettingsDrawer` → `BrandingTab` routed through `tenants.branding` jsonb (was 400'ing on non-existent flat columns)

### Dead code removed

- `CredentialIngestionUpload.tsx` + `ingest-trainer-credentials` edge function (wrote to deprecated tables, zero successful rows)
- `BulkTrainerDocumentUpload.tsx` + `bulk-trainer-document-upload` edge function (tab removed from UI, component orphaned)
- Unreachable `AdminSettings.tsx` / `useOrgSettings.ts` settings stack (not routed in `AppRoutes.tsx`)
- Restored orphaned "AI Suggestions" tab in `TrainerProfileDrawer`

### Production apply

Migration `20260804140000_widen_set_document_version_roles` applied. Ledger verified.

### Soak status

N/A.
