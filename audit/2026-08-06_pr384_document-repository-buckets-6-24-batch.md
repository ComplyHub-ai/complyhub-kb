# Audit — PR #384

> **Date:** 6 August 2026 (audit written); **Merged:** 6 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 buckets #6–#24 batch repoint
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Largest single migration PR in the consolidation project. Repointed 11 remaining evidence/document buckets to `tenant-documents`, with per-bucket RLS carve-outs, code repoint, and DML backfills. Also shipped tenant-facing `Templates.tsx` page (closing a long-standing UI gap for `document-templates`), fixed cross-tenant audit-report leak and cross-user suggestion-attachment leak, and reconciled 9 orphaned QI migration files applied to production without matching git.

## PR #384 — Storage bucket repoints, evidence upload consolidation + QI migration drift reconciliation

**Branch:** `fix/storage-migration-remaining-buckets` (deleted post-merge) · **Merge commit:** `0eb9279cc` · **Merged:** 6 Aug 2026 · **Files:** 69

### Buckets repointed (#6–#24)

`TAS-attachments`, `evidence-complybot`, `audit-reports`, `rpl-attachments`, `pli-evidence`, `tas-exports` (RPC fix), `fpp-evidence`, `meeting-documents`, `tenant-evidence-private`, `compliance-evidence`, `suggestion-attachments`, `tas-imports`

Object COPY for each bucket was already done directly (predating this PR per migration comments). This PR closed RLS/code/DML gaps only.

### Also in PR

- New tenant read-only `Templates.tsx` + SuperAdmin CRUD fixes for `document-templates`
- `ensure_qi_register_for_year` grant fix
- Consolidated duplicate QI/suggestion evidence-upload into shared `useDocumentTemplates`
- Removed redundant `QIEvidenceUpload` / `useQiEvidenceUpload`
- 16 migrations applied to production 6 Aug 2026 via `execute_sql` + ledger repair

### Production apply

All 16 migrations applied. Ledger repair handed to Brian.

### Soak status

✅ Soak timers started 6 Aug 2026 for all 11 source buckets — complete ~20 Aug 2026 (`storage_soak_buckets`).

### Still open at audit time

Manual testing as real tenant user for these 11 buckets was not completed before soak start — Brian explicitly started all remaining timers 6 Aug 2026 with consolidation declared code-complete.
